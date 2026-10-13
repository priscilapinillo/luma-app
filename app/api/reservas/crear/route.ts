import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calcularAcceso, pareceDesactualizado } from '@/lib/acceso'
import { enviarAviso } from '@/lib/push'

// Reserva desde la página pública. Antes el navegador escribía directo en la base (pacientes y turnos),
// y para eso la base dejaba que CUALQUIERA leyera todos los pacientes y turnos de todas las terapeutas.
// Ahora todo pasa por acá: el servidor valida, toma precio y duración de la base (nunca del navegador)
// y la base ya no necesita abrirle nada al público.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const recientes = new Map<string, number[]>() // freno simple contra bots: máx 8 reservas por hora desde el mismo lugar

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
    const metodoPago = ['libre', 'transferencia', 'mercadopago'].includes(b.metodoPago) ? b.metodoPago : null
    const id = b.id ? String(b.id) : null

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
      s.from('services').select('id, user_id, nombre, precio_base, duracion_estimada, tipo_servicio, activo').eq('id', serviceId).maybeSingle(),
      s.from('subscriptions').select('status, trial_ends_at, current_period_ends_at, plan').eq('user_id', therapistId).maybeSingle(),
    ])
    if (!perfil || !perfil.pagina_activa) return NextResponse.json({ ok: false, motivo: 'no_disponible' }, { status: 400 })
    if (!servicio || servicio.user_id !== therapistId || !servicio.activo) return NextResponse.json({ ok: false, motivo: 'servicio_invalido' }, { status: 400 })
    if (sub && calcularAcceso(sub) === 'sin_acceso' && !pareceDesactualizado(sub)) return NextResponse.json({ ok: false, motivo: 'no_disponible' }, { status: 400 })
    if (metodoPago === 'transferencia' && !(perfil.acepta_transferencia && perfil.alias_pago)) return NextResponse.json({ ok: false, motivo: 'datos_invalidos' }, { status: 400 })

    // no se puede reservar en el pasado (con un día de margen por las zonas horarias)
    if (new Date(fecha + 'T23:59:59').getTime() < ahora - 86400000) return NextResponse.json({ ok: false, motivo: 'fecha_pasada' }, { status: 400 })

    // turno en vivo: el horario no puede estar ocupado (mismo criterio que la página pública)
    const esEntrega = servicio.tipo_servicio === 'entrega'
    const duracion = Number(servicio.duracion_estimada) || 60
    if (!esEntrega && hora !== '00:00') {
      const { data: ocupados } = await s.rpc('horarios_ocupados', { p_terapeuta: therapistId })
      const ini = horaAMin(hora), fin = ini + duracion
      const choca = (ocupados || []).some((o: any) => String(o.fecha || '').slice(0, 10) === fecha &&
        horaAMin(String(o.hora || '00:00')) < fin && horaAMin(String(o.hora || '00:00')) + (Number(o.duracion) || 60) > ini)
      if (choca) return NextResponse.json({ ok: false, motivo: 'ocupado' }, { status: 409 })
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
      precio: servicio.precio_base,
      estado_pago: 'pendiente',
      realizado: false,
      contexto_sesion: mensaje,
      metodo_pago: metodoPago,
      tipo_servicio: servicio.tipo_servicio || 'vivo',
    }).select('id').single()
    if (error || !sesion) { console.error('reservas/crear sesión:', error); return NextResponse.json({ ok: false, motivo: 'error' }, { status: 500 }) }

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
      precio: servicio.precio_base,
      estado: 'pendiente_pago',
      session_id: sesion.id,
    })

    lista.push(ahora); recientes.set(ip, lista)
    await enviarAviso(therapistId, '✦ Nueva reserva en Luma',
      `${nombre} agendó ${servicio.nombre}${hora !== '00:00' ? ` para el ${fecha} a las ${hora}hs` : ''}`).catch(() => {})
    return NextResponse.json({ ok: true, sesion: { id: sesion.id } })
  } catch (err) {
    console.error('reservas/crear:', err)
    return NextResponse.json({ ok: false, motivo: 'error' }, { status: 500 })
  }
}