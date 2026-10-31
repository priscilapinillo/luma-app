import { NextRequest, NextResponse } from 'next/server'
import { revisarCupon, reservarUso, precioConDescuento, normalizarCodigo } from '@/lib/cupones'
import { createClient } from '@supabase/supabase-js'
import { calcularAcceso, pareceDesactualizado } from '@/lib/acceso'
import { enviarAviso } from '@/lib/push'

// Reserva desde la página pública. Antes el navegador escribía directo en la base (pacientes y turnos),
// y para eso la base dejaba que CUALQUIERA leyera todos los pacientes y turnos de todas las terapeutas.
// Ahora todo pasa por acá: el servidor valida, toma precio y duración de la base (nunca del navegador)
// y la base ya no necesita abrirle nada al público.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const recientes = new Map<string, number[]>() // freno simple contra bots: máx 8 reservas por hora desde el mismo lugar

// máximo de sesiones por día de la terapeuta (0 = sin límite, o si la columna todavía no existe)
async function leerMaxDia(s: any, therapistId: string): Promise<number> {
  const { data, error } = await s.from('therapist_profiles').select('max_sesiones_dia').eq('user_id', therapistId).maybeSingle()
  if (error) return 0
  const n = Math.floor(Number(data?.max_sesiones_dia) || 0)
  return n > 0 ? n : 0
}

// sesiones EN VIVO y NO canceladas de ese día, de la más vieja a la más nueva (null = no se pudo leer)
async function sesionesEnVivoDelDia(s: any, therapistId: string, fecha: string): Promise<{ id: string }[] | null> {
  const { data, error } = await s.from('sessions').select('id, fecha, estado_sesion, tipo_servicio, created_at')
    .eq('user_id', therapistId).gte('fecha', fecha + 'T00:00:00').lte('fecha', fecha + 'T23:59:59')
  if (error) return null
  return (data || [])
    .filter((x: any) => String(x.fecha || '').slice(0, 10) === fecha && x.estado_sesion !== 'cancelada' && x.tipo_servicio !== 'entrega')
    .sort((a: any, b: any) => String(a.created_at || '').localeCompare(String(b.created_at || '')) || String(a.id).localeCompare(String(b.id)))
}

function horaAMin(h: string) { const [a, b] = h.split(':').map(Number); return (a || 0) * 60 + (b || 0) }

export async function POST(req: NextRequest) {
  try {
    const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-nf-client-connection-ip') || 'sin-ip').split(',')[0].trim()
    const ahora = Date.now()
    const lista = (recientes.get(ip) || []).filter(t => ahora - t < 3600000)
    if (lista.length >= 8) return NextResponse.json({ ok: false, motivo: 'demasiadas' }, { status: 429 })

    const b = await req.json().catch(() => ({}))
    const therapistId = String(b.therapistId || '')
    const serviceId = String(b.serviceId || '')
    const fecha = String(b.fecha || '')
    const hora = String(b.hora || '')
    const nombre = String(b.nombre || '').trim().slice(0, 80)
    const whatsapp = String(b.whatsapp || '').replace(/[^\d+]/g, '').slice(0, 20)
    const mensaje = String(b.mensaje || '').slice(0, 1000)
    const metodoPago = ['libre', 'transferencia', 'mercadopago', 'usd'].includes(b.metodoPago) ? b.metodoPago : null
    const id = b.id ? String(b.id) : null
    const codigoCupon = normalizarCodigo(b.cupon)

    if (!UUID.test(therapistId) || !UUID.test(serviceId) || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}$/.test(hora)
      || nombre.length < 2 || whatsapp.replace(/\D/g, '').length < 6 || !metodoPago || (id && !UUID.test(id)) || (metodoPago === 'mercadopago' && !id)) {
      return NextResponse.json({ ok: false, motivo: 'datos_invalidos' }, { status: 400 })
    }

    const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // reintento del mismo turno de Mercado Pago: se devuelve el que ya existe (nunca se duplica)
    if (id) {
      const { data: existente } = await s.from('sessions').select('id, user_id').eq('id', id).maybeSingle()
      if (existente) {
        if (existente.user_id !== therapistId) return NextResponse.json({ ok: false, motivo: 'datos_invalidos' }, { status: 400 })
        return NextResponse.json({ ok: true, sesion: { id: existente.id }, existia: true })
      }
    }

    const [{ data: perfil }, { data: servicio }, { data: sub }] = await Promise.all([
      s.from('therapist_profiles').select('user_id, pagina_activa, acepta_transferencia, alias_pago').eq('user_id', therapistId).maybeSingle(),
      s.from('services').select('id, user_id, nombre, precio_base, duracion_estimada, tipo_servicio, activo, precio_usd').eq('id', serviceId).maybeSingle(),
      s.from('subscriptions').select('status, trial_ends_at, current_period_ends_at, plan, mp_subscription_id').eq('user_id', therapistId).maybeSingle(),
    ])
    if (!perfil || !perfil.pagina_activa) return NextResponse.json({ ok: false, motivo: 'no_disponible' }, { status: 400 })
    if (!servicio || servicio.user_id !== therapistId || !servicio.activo) return NextResponse.json({ ok: false, motivo: 'servicio_invalido' }, { status: 400 })
    if (sub && calcularAcceso(sub) === 'sin_acceso' && !pareceDesactualizado(sub)) return NextResponse.json({ ok: false, motivo: 'no_disponible' }, { status: 400 })
    if (metodoPago === 'transferencia' && !(perfil.acepta_transferencia && perfil.alias_pago)) return NextResponse.json({ ok: false, motivo: 'datos_invalidos' }, { status: 400 })
    // en dólares: el servicio tiene que tener precio en USD y la terapeuta, alguna forma de cobrar en dólares
    // (el precio sale de la base, nunca del navegador). El precio en pesos queda en 0: así nunca se suma a los pesos.
    let precioUSD = 0
    if (metodoPago === 'usd') {
      precioUSD = Number((servicio as any).precio_usd) || 0
      const { data: usd } = await s.from('therapist_profiles').select('usd_link, usd_cuenta, usd_usdt').eq('user_id', therapistId).maybeSingle()
      if (!(precioUSD > 0) || !(usd && ((usd as any).usd_link || (usd as any).usd_cuenta || (usd as any).usd_usdt))) {
        return NextResponse.json({ ok: false, motivo: 'servicio_invalido' }, { status: 400 })
      }
    }

    // no se puede reservar en el pasado (con un día de margen por las zonas horarias)
    if (new Date(fecha + 'T23:59:59').getTime() < ahora - 86400000) return NextResponse.json({ ok: false, motivo: 'fecha_pasada' }, { status: 400 })

    // turno en vivo: el horario no puede estar ocupado (mismo criterio que la página pública)
    const esEntrega = servicio.tipo_servicio === 'entrega'
    let maxDia = 0
    const duracion = Number(servicio.duracion_estimada) || 60
    if (!esEntrega && hora !== '00:00') {
      const { data: ocupados } = await s.rpc('horarios_ocupados', { p_terapeuta: therapistId })
      const ini = horaAMin(hora), fin = ini + duracion
      const choca = (ocupados || []).some((o: any) => String(o.fecha || '').slice(0, 10) === fecha &&
        horaAMin(String(o.hora || '00:00')) < fin && horaAMin(String(o.hora || '00:00')) + (Number(o.duracion) || 60) > ini)
      if (choca) return NextResponse.json({ ok: false, motivo: 'ocupado' }, { status: 409 })

      // máximo de sesiones por día (opcional). Se lee aparte: si la columna no existiera, la reserva sigue igual.
      maxDia = await leerMaxDia(s, therapistId)
      if (maxDia > 0) {
        const delDia = await sesionesEnVivoDelDia(s, therapistId, fecha)
        // si hay límite y no se pudo contar, NO se arriesga: se frena la reserva (mejor un reintento que un día lleno de más)
        if (!delDia) return NextResponse.json({ ok: false, motivo: 'error' }, { status: 503 })
        if (delDia.length >= maxDia) return NextResponse.json({ ok: false, motivo: 'dia_completo' }, { status: 409 })
      }
    }

    // cupón: se revisa ANTES de crear nada. El descuento es sobre el total (los servicios no tienen seña).
    const quien = 'w:' + whatsapp.replace(/\D/g, '')
    let cupon: Awaited<ReturnType<typeof revisarCupon>> | null = null
    const precioBase = metodoPago === 'usd' ? precioUSD : Number(servicio.precio_base) || 0
    let precioFinal = precioBase
    if (codigoCupon && precioBase > 0) {
      cupon = await revisarCupon(codigoCupon, { tipo: 'sesion', id: servicio.id, terapeutaId: therapistId }, quien)
      if (!cupon.ok) return NextResponse.json({ ok: false, motivo: 'cupon', mensaje: cupon.mensaje }, { status: 400 })
      precioFinal = precioConDescuento(precioBase, cupon.porcentaje, metodoPago === 'usd' ? 'USD' : 'ARS')
    }

    // paciente: lo busca por WhatsApp o lo crea (función de la base que solo puede usar el servidor)
    const partes = nombre.split(/\s+/)
    const { data: pacienteId, error: errPac } = await s.rpc('buscar_o_crear_paciente', {
      p_terapeuta: therapistId, p_nombre: partes[0], p_apellido: partes.slice(1).join(' ') || '', p_celular: whatsapp,
    })
    if (errPac || !pacienteId) { console.error('reservas/crear paciente:', errPac); return NextResponse.json({ ok: false, motivo: 'error' }, { status: 500 }) }

    const { data: sesion, error } = await s.from('sessions').insert({
      ...(id ? { id } : {}),
      user_id: therapistId,
      patient_id: pacienteId,
      service_id: servicio.id,
      fecha: fecha + 'T' + hora + ':00',
      hora,
      duracion,
      servicio_nombre: servicio.nombre,
      precio: metodoPago === 'usd' ? 0 : precioFinal,
      estado_pago: 'pendiente',
      realizado: false,
      contexto_sesion: mensaje,
      metodo_pago: metodoPago,
      tipo_servicio: servicio.tipo_servicio || 'vivo',
      ...(metodoPago === 'usd' ? { moneda: 'USD', precio_usd: precioFinal } : {}),
      ...(cupon?.ok ? { cupon_codigo: cupon.cupon.codigo, precio_original: precioBase } : {}),
    }).select('id').single()
    if (error || !sesion) { console.error('reservas/crear sesión:', error); return NextResponse.json({ ok: false, motivo: 'error' }, { status: 500 }) }

    // reserva el uso del cupón (con candado en la base). Si justo se agotó, el turno se deshace: nunca se cobra distinto de lo que vio.
    if (cupon?.ok) {
      const horas = metodoPago === 'mercadopago' ? 2
        : metodoPago === 'libre' ? Math.max(24, (new Date(fecha + 'T23:59:59-03:00').getTime() - ahora) / 3600000 + 24)
        : 72
      const u = await reservarUso(cupon.cupon, 'sesion', sesion.id, quien, precioBase, precioFinal, metodoPago === 'usd' ? 'USD' : 'ARS', horas)
      if (!u.ok) {
        await s.from('sessions').delete().eq('id', sesion.id)
        return NextResponse.json({ ok: false, motivo: 'cupon', mensaje: u.mensaje }, { status: 409 })
      }
      await s.from('sessions').update({ cupon_uso_id: u.uso }).eq('id', sesion.id)
    }

    // dos personas reservando a la vez el último lugar del día: se vuelve a contar después de guardar.
    // Si esta reserva quedó por encima del máximo, se deshace (gana la que llegó primero).
    if (maxDia > 0) {
      const despues = await sesionesEnVivoDelDia(s, therapistId, fecha)
      const lugar = despues ? despues.findIndex(x => x.id === sesion.id) : -1
      if (despues && lugar >= maxDia) {
        await s.from('sessions').delete().eq('id', sesion.id)
        return NextResponse.json({ ok: false, motivo: 'dia_completo' }, { status: 409 })
      }
    }

    await s.from('public_bookings').insert({
      therapist_id: therapistId,
      patient_name: nombre,
      patient_whatsapp: whatsapp,
      patient_message: mensaje,
      service_id: servicio.id,
      service_name: servicio.nombre,
      fecha,
      hora,
      duracion,
      precio: metodoPago === 'usd' ? 0 : precioFinal,
      estado: 'pendiente_pago',
      session_id: sesion.id,
    })

    lista.push(ahora); recientes.set(ip, lista)
    await enviarAviso(therapistId, metodoPago === 'usd' ? '✦ Nueva reserva en dólares' : '✦ Nueva reserva en Luma',
      `${nombre} agendó ${servicio.nombre}${hora !== '00:00' ? ` para el ${fecha} a las ${hora}hs` : ''}${metodoPago === 'usd' ? ` · avisó que pagó USD ${precioFinal}: confirmalo cuando te llegue` : ''}${cupon?.ok ? ` · con cupón ${cupon.cupon.codigo} (−${cupon.porcentaje}%)` : ''}`).catch(() => {})
    return NextResponse.json({ ok: true, sesion: { id: sesion.id }, precio: precioFinal, ...(cupon?.ok ? { cupon: { codigo: cupon.cupon.codigo, porcentaje: cupon.porcentaje, precioOriginal: precioBase } } : {}) })
  } catch (err) {
    console.error('reservas/crear:', err)
    return NextResponse.json({ ok: false, motivo: 'error' }, { status: 500 })
  }
}