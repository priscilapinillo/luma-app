// Suscripciones automáticas de cursos con Mercado Pago (solo servidor).
// Se cobran con el token de cada terapeuta (el mismo que ya usa para cobrar reservas y cursos).
// No depende de los avisos de Mercado Pago: Luma le pregunta el estado a Mercado Pago cuando hace falta
// (al volver del pago, al abrir el panel o el curso, y en la revisión diaria).
import { createClient } from '@supabase/supabase-js'
import { tokenMPDeTerapeuta } from '@/lib/mpReservas'
import { tieneAccesoCurso, calcularAcceso, pareceDesactualizado } from '@/lib/acceso'
import { enviarAviso } from '@/lib/push'

// Estados de la suscripción (columna enrollments.suscripcion_estado):
//   creando          → Luma la está creando (dura segundos; frena dobles toques)
//   pendiente        → creada, la alumna todavía no terminó en Mercado Pago
//   esperando_cobro  → la alumna la autorizó, falta que se acredite el primer cobro
//   activa           → al día
//   con_problemas    → ya pagó antes, pero la última cuota fue rechazada (días de gracia)
//   rechazada        → el primer cobro fue rechazado (puede probar con otra tarjeta)
//   cancelada        → cancelada (conserva el acceso hasta la fecha pagada)
export const ESTADOS_VIVOS = ['creando', 'pendiente', 'esperando_cobro', 'activa', 'con_problemas', 'rechazada']

const MONEDAS_MP = ['ARS', 'MXN', 'COP', 'CLP', 'PEN', 'UYU', 'BRL']
const DIAS_GRACIA = 5
const HORAS_PENDIENTE = 24

export function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function usuarioDeToken(accessToken: unknown) {
  if (!accessToken || typeof accessToken !== 'string') return null
  const { data: { user } } = await db().auth.getUser(accessToken)
  return user || null
}

export async function registrarEvento(enrollmentId: string, evento: string, detalle?: unknown) {
  try { await db().from('suscripcion_eventos').insert({ enrollment_id: String(enrollmentId), evento, detalle: detalle ?? null }) }
  catch (e) { console.error('No se pudo registrar el evento de suscripción', e) }
}

async function mp(token: string, path: string, opciones: { method?: string; body?: unknown; idem?: string } = {}) {
  try {
    const res = await fetch('https://api.mercadopago.com' + path, {
      method: opciones.method || 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(opciones.idem ? { 'X-Idempotency-Key': opciones.idem } : {}),
      },
      body: opciones.body ? JSON.stringify(opciones.body) : undefined,
      cache: 'no-store',
    })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, data }
  } catch (e: any) {
    return { ok: false, status: 0, data: { message: e?.message || 'sin conexión' } }
  }
}

function sumarMeses(fecha: Date, meses: number) {
  const d = new Date(fecha)
  const dia = d.getDate()
  d.setMonth(d.getMonth() + meses)
  if (d.getDate() < dia) d.setDate(0) // 31 de enero + 1 mes = 28/29 de febrero, no 3 de marzo
  return d
}

export type Contexto = { e: any; curso: any; persona: any; perfil: any; token: string | null }

export async function cargarContexto(enrollmentId: string): Promise<Contexto | null> {
  const s = db()
  const { data: e } = await s.from('enrollments').select('*').eq('id', enrollmentId).maybeSingle()
  if (!e) return null
  const [{ data: curso }, { data: persona }] = await Promise.all([
    s.from('courses').select('id, titulo, slug, precio, modalidad, estado, user_id, cobro_automatico').eq('id', e.course_id).maybeSingle(),
    s.from('persons').select('*').eq('id', e.person_id).maybeSingle(),
  ])
  if (!curso || !persona) return null
  const { data: perfil } = await s.from('therapist_profiles')
    .select('user_id, nombre_profesional, slug, moneda, mp_activo').eq('user_id', curso.user_id).maybeSingle()
  const token = await tokenMPDeTerapeuta(curso.user_id)
  return { e, curso, persona, perfil, token }
}

export const esAlumna = (ctx: Contexto, userId: string) => !!userId && ctx.persona.auth_user_id === userId
export const esTerapeuta = (ctx: Contexto, userId: string) => !!userId && ctx.curso.user_id === userId

export function accesoDe(e: any) {
  return tieneAccesoCurso({ estado: e.estado, modalidad: e.modalidad, fecha_vencimiento: e.fecha_vencimiento })
}

// Le pregunta a Mercado Pago cómo está la suscripción, anota los cobros nuevos (una sola vez cada uno)
// y actualiza el acceso. Se puede llamar todas las veces que haga falta: nunca suma dos veces el mismo cobro.
export async function revisarSuscripcion(enrollmentId: string): Promise<Contexto | null> {
  const ctx = await cargarContexto(enrollmentId)
  if (!ctx || !ctx.e.mp_preapproval_id || !ctx.token) return ctx
  const s = db()
  const { e, token, curso } = ctx
  const ahora = Date.now()

  const pre = await mp(token, `/preapproval/${encodeURIComponent(e.mp_preapproval_id)}`)
  if (!pre.ok) {
    await registrarEvento(e.id, 'revisar_error', { status: pre.status, respuesta: pre.data })
    if (pre.status === 401 || pre.status === 403) {
      await enviarAviso(curso.user_id, '⚠️ Mercado Pago no está funcionando',
        'No pudimos revisar las suscripciones de tus cursos: Mercado Pago rechazó tu token. Revisalo en Ajustes → Página de reservas → Cobros.').catch(() => {})
    }
    return ctx
  }
  const p = pre.data || {}

  // cobros de esta suscripción
  const busqueda = await mp(token, `/authorized_payments/search?preapproval_id=${encodeURIComponent(e.mp_preapproval_id)}&limit=12`)
  if (!busqueda.ok) await registrarEvento(e.id, 'cobros_error', { status: busqueda.status, respuesta: busqueda.data })
  const lista: any[] = busqueda.ok ? (busqueda.data?.results || busqueda.data?.elements || []) : []
  lista.sort((a, b) => new Date(a?.date_created || a?.debit_date || 0).getTime() - new Date(b?.date_created || b?.debit_date || 0).getTime())

  const { data: pagosPrevios } = await s.from('course_payments').select('id, mp_payment_id').eq('enrollment_id', e.id)
  const registrados = new Map<string, string>()
  for (const x of pagosPrevios || []) if (x.mp_payment_id) registrados.set(String(x.mp_payment_id), x.id)

  let venc: Date | null = e.fecha_vencimiento ? new Date(e.fecha_vencimiento) : null
  const vencOriginal = venc ? venc.getTime() : null
  let aprobadosNuevos = 0
  let ultimoEstado: string | null = null

  for (const ap of lista.slice(-12)) {
    const pagoId = ap?.payment?.id || ap?.payment_id
    if (!pagoId) continue
    // el estado real del cobro se le pregunta a Mercado Pago (nunca se confía en otro dato)
    const pago = await mp(token, `/v1/payments/${encodeURIComponent(String(pagoId))}`)
    if (!pago.ok) continue
    const st = String(pago.data?.status || '')
    ultimoEstado = st
    if (st === 'approved' && !registrados.has(String(pagoId))) {
      const { data: fila, error } = await s.from('course_payments').insert({
        terapeuta_id: curso.user_id,
        enrollment_id: e.id,
        course_id: curso.id,
        monto: Number(pago.data?.transaction_amount) || 0,
        metodo: 'mercadopago',
        tipo: registrados.size === 0 && aprobadosNuevos === 0 ? 'compra' : 'renovacion',
        mp_payment_id: String(pagoId),
        fecha: pago.data?.date_approved || new Date().toISOString(),
      }).select('id').single()
      if (!error && fila) {
        registrados.set(String(pagoId), fila.id)
        aprobadosNuevos++
        // un mes más, desde el vencimiento si todavía no venció (no pierde los días que le quedaban)
        const base = venc && venc.getTime() > ahora ? venc : new Date()
        venc = sumarMeses(base, 1)
        await registrarEvento(e.id, 'cobro_acreditado', { pago: String(pagoId), monto: pago.data?.transaction_amount, vence: venc.toISOString() })
      } else if (error && error.code === '23505') {
        registrados.set(String(pagoId), 'ya-anotado') // otra revisión lo anotó al mismo tiempo: cuenta como pagado
      } else if (error) {
        await registrarEvento(e.id, 'cobro_no_anotado', { pago: String(pagoId), error: error.message })
      }
    } else if ((st === 'refunded' || st === 'charged_back') && registrados.has(String(pagoId))) {
      // devolución o contracargo: se descuenta de Finanzas y se quita ese mes de acceso
      await s.from('course_payments').delete().eq('mp_payment_id', String(pagoId)).eq('enrollment_id', e.id)
      registrados.delete(String(pagoId))
      if (venc) venc = sumarMeses(venc, -1)
      await registrarEvento(e.id, st === 'refunded' ? 'cobro_devuelto' : 'contracargo', { pago: String(pagoId) })
      if (st === 'charged_back') {
        await enviarAviso(curso.user_id, '⚠️ Contracargo en un curso',
          `Una alumna desconoció en su banco un cobro de ${curso.titulo}. Se descontó de tus Finanzas y se le quitó ese mes de acceso.`).catch(() => {})
      }
    }
  }

  // estado de la suscripción según Mercado Pago
  const huboAprobados = registrados.size > 0
  let estadoSus: string = e.suscripcion_estado
  if (p.status === 'cancelled') estadoSus = 'cancelada'
  else if (p.status === 'pending') estadoSus = 'pendiente'
  else if (p.status === 'paused') estadoSus = 'con_problemas'
  else if (p.status === 'authorized') {
    if (ultimoEstado === 'rejected') estadoSus = huboAprobados ? 'con_problemas' : 'rechazada'
    else estadoSus = huboAprobados ? 'activa' : 'esperando_cobro'
  }

  const cambios: Record<string, unknown> = {
    suscripcion_estado: estadoSus,
    proximo_cobro: p.next_payment_date || null,
    suscripcion_revisada_at: new Date().toISOString(),
  }

  // pendiente hace más de 24 horas: se cancela en Mercado Pago para que no quede colgada
  if (estadoSus === 'pendiente' && e.suscripcion_creada_at && ahora - new Date(e.suscripcion_creada_at).getTime() > HORAS_PENDIENTE * 3600000) {
    const c = await mp(token, `/preapproval/${encodeURIComponent(e.mp_preapproval_id)}`, { method: 'PUT', body: { status: 'cancelled' } })
    if (c.ok) { estadoSus = 'cancelada'; cambios.suscripcion_estado = 'cancelada'; await registrarEvento(e.id, 'pendiente_vencida_cancelada') }
  }

  // cuota rechazada: sigue con acceso durante los días de gracia (una sola vez por cuota)
  if (estadoSus === 'con_problemas' && venc && venc.getTime() < ahora) {
    const yaTuvoGracia = e.gracia_usada_para && new Date(e.gracia_usada_para).getTime() >= venc.getTime()
    if (!yaTuvoGracia) {
      venc = new Date(venc.getTime() + DIAS_GRACIA * 86400000)
      cambios.gracia_usada_para = venc.toISOString()
      await registrarEvento(e.id, 'dias_de_gracia', { hasta: venc.toISOString() })
    }
  }

  if (venc && venc.getTime() !== vencOriginal) cambios.fecha_vencimiento = venc.toISOString()
  if (aprobadosNuevos > 0) { cambios.estado = 'activa'; cambios.suscripcion_aviso = null } // el aviso de cambio de precio ya cumplió
  if (estadoSus !== e.suscripcion_estado) await registrarEvento(e.id, 'estado', { antes: e.suscripcion_estado, ahora: estadoSus, mp: p.status })

  await s.from('enrollments').update(cambios).eq('id', e.id)
  return { ...ctx, e: { ...e, ...cambios } }
}

export type ResultadoCrear = { estado: string; link?: string; mensaje?: string }

// Crea la suscripción, o devuelve la que ya hay. Nunca deja dos suscripciones vivas para la misma inscripción:
// 1) el botón se desactiva al tocarlo, 2) acá se reutiliza la que existe, 3) la base deja crear de a una,
// 4) Mercado Pago recibe una clave única por intento (si el mismo pedido llega dos veces, devuelve la misma).
export async function crearOReutilizar(enrollmentId: string, userId: string, origen: string): Promise<ResultadoCrear> {
  const ctx = await revisarSuscripcion(enrollmentId)
  if (!ctx) return { estado: 'no_encontrada', mensaje: 'No encontramos tu inscripción. Recargá la página e intentá de nuevo.' }
  if (!esAlumna(ctx, userId)) return { estado: 'no_autorizado', mensaje: 'Entrá con la cuenta con la que te inscribiste.' }
  const { curso, perfil, token, persona } = ctx
  const e = ctx.e
  const s = db()

  if (curso.modalidad !== 'suscripcion' || !curso.cobro_automatico || curso.estado !== 'publicado' || !(Number(curso.precio) > 0)) {
    return { estado: 'no_disponible', mensaje: 'Este curso no tiene cobro automático. Elegí otra forma de pago.' }
  }
  if (!token || !perfil?.mp_activo) {
    return { estado: 'no_disponible', mensaje: 'El cobro automático no está disponible en este momento. Elegí otra forma de pago o escribile a la terapeuta.' }
  }
  const moneda = MONEDAS_MP.includes(String(perfil?.moneda || 'ARS')) ? String(perfil?.moneda || 'ARS') : null
  if (!moneda) return { estado: 'no_disponible', mensaje: 'El cobro automático no está disponible para la moneda de este curso.' }

  // si a la terapeuta se le venció su plan de Luma, no entran alumnas nuevas (las que ya están siguen)
  const { data: subT } = await s.from('subscriptions').select('status, trial_ends_at, current_period_ends_at, plan').eq('user_id', curso.user_id).maybeSingle()
  if (subT && calcularAcceso(subT) === 'sin_acceso' && !pareceDesactualizado(subT)) {
    return { estado: 'no_disponible', mensaje: 'Las inscripciones a este curso están pausadas por el momento.' }
  }

  // ya hay una en marcha: se reutiliza
  if (e.suscripcion_estado === 'activa' || e.suscripcion_estado === 'esperando_cobro') return { estado: e.suscripcion_estado }
  if (e.suscripcion_estado === 'con_problemas') return { estado: 'con_problemas' } // se arregla cambiando la tarjeta en Mercado Pago, no creando otra
  if (e.suscripcion_estado === 'pendiente' && e.suscripcion_link) {
    const mismoPrecio = Number(e.suscripcion_monto) === Number(curso.precio)
    if (mismoPrecio) return { estado: 'pendiente', link: e.suscripcion_link }
    // la terapeuta cambió el precio mientras estaba sin completar: se cancela la vieja y se crea con el precio de hoy
    const c = await mp(token, `/preapproval/${encodeURIComponent(e.mp_preapproval_id)}`, { method: 'PUT', body: { status: 'cancelled' } })
    if (!c.ok) {
      const g = await mp(token, `/preapproval/${encodeURIComponent(e.mp_preapproval_id)}`)
      if (!(g.ok && g.data?.status === 'cancelled')) return { estado: 'error', mensaje: 'No pudimos actualizar tu suscripción. Probá de nuevo en unos minutos.' }
    }
    await s.from('enrollments').update({ suscripcion_estado: 'cancelada' }).eq('id', e.id)
    await registrarEvento(e.id, 'pendiente_cancelada_por_cambio_de_precio', { antes: e.suscripcion_monto, ahora: curso.precio })
  }
  if (e.suscripcion_estado === 'creando' && e.suscripcion_creada_at && Date.now() - new Date(e.suscripcion_creada_at).getTime() < 120000) {
    return { estado: 'en_proceso' }
  }
  // primer cobro rechazado: se cancela la vieja ANTES de crear la nueva (así nunca se cobran dos)
  if (e.suscripcion_estado === 'rechazada' && e.mp_preapproval_id) {
    const c = await mp(token, `/preapproval/${encodeURIComponent(e.mp_preapproval_id)}`, { method: 'PUT', body: { status: 'cancelled' } })
    if (!c.ok) {
      const g = await mp(token, `/preapproval/${encodeURIComponent(e.mp_preapproval_id)}`)
      if (!(g.ok && g.data?.status === 'cancelled')) {
        await registrarEvento(e.id, 'no_se_pudo_cancelar_rechazada', { status: c.status, respuesta: c.data })
        return { estado: 'error', mensaje: 'No pudimos preparar el nuevo intento. Probá de nuevo en unos minutos.' }
      }
    }
    await s.from('enrollments').update({ suscripcion_estado: 'cancelada' }).eq('id', e.id)
    await registrarEvento(e.id, 'rechazada_cancelada_para_reintentar')
  }

  // la base deja reclamar la creación a un solo pedido a la vez
  const hace2min = new Date(Date.now() - 120000).toISOString()
  const { data: reclamo } = await s.from('enrollments')
    .update({ suscripcion_estado: 'creando', suscripcion_creada_at: new Date().toISOString(), suscripcion_intento: (Number(e.suscripcion_intento) || 0) + 1 })
    .eq('id', e.id)
    .or(`suscripcion_estado.is.null,suscripcion_estado.eq.cancelada,suscripcion_estado.eq.rechazada,and(suscripcion_estado.eq.creando,suscripcion_creada_at.lt."${hace2min}")`)
    .select('suscripcion_intento')
  if (!reclamo || reclamo.length === 0) return { estado: 'en_proceso' }
  const intento = reclamo[0].suscripcion_intento

  // si ya tiene acceso pago (pagaba a mano, o canceló y vuelve), el primer cobro es el día que vence
  const acceso = accesoDe(e)
  const vence = e.fecha_vencimiento ? new Date(e.fecha_vencimiento) : null
  const empiezaDespues = acceso && vence && vence.getTime() > Date.now() + 3600000
  const base = origen.startsWith('https://') ? origen : 'https://lumaapp.lat'
  const email = String(persona.email || '').trim()
  if (!email) {
    await s.from('enrollments').update({ suscripcion_estado: null }).eq('id', e.id).eq('suscripcion_estado', 'creando')
    return { estado: 'error', mensaje: 'Tu cuenta no tiene un email cargado. Escribile a la terapeuta.' }
  }

  const cuerpo = {
    reason: `${curso.titulo}${perfil?.nombre_profesional ? ` · ${perfil.nombre_profesional}` : ''}`.slice(0, 120),
    external_reference: String(e.id),
    payer_email: email,
    back_url: `${base}/p/${perfil?.slug}/cursos/${curso.slug}/checkout?suscripcion=volver`,
    status: 'pending',
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: Number(curso.precio),
      currency_id: moneda,
      ...(empiezaDespues ? { start_date: vence!.toISOString() } : {}),
    },
  }
  const r = await mp(token, '/preapproval', { method: 'POST', body: cuerpo, idem: `luma-sus-${e.id}-${intento}` })
  if (!r.ok || !r.data?.id || !r.data?.init_point) {
    await s.from('enrollments').update({ suscripcion_estado: null }).eq('id', e.id).eq('suscripcion_estado', 'creando')
    await registrarEvento(e.id, 'crear_error', { status: r.status, respuesta: r.data })
    if (r.status === 401 || r.status === 403) {
      await enviarAviso(curso.user_id, '⚠️ Mercado Pago no está funcionando',
        `Una alumna quiso suscribirse a ${curso.titulo} y Mercado Pago rechazó tu token. Revisalo en Ajustes → Página de reservas → Cobros.`).catch(() => {})
      return { estado: 'error', mensaje: 'El cobro automático no está disponible en este momento. Elegí otra forma de pago o escribile a la terapeuta.' }
    }
    return { estado: 'error', mensaje: 'Mercado Pago no pudo crear la suscripción. Probá de nuevo en unos minutos o elegí otra forma de pago.' }
  }

  await s.from('enrollments').update({
    mp_preapproval_id: String(r.data.id),
    suscripcion_estado: 'pendiente',
    suscripcion_link: String(r.data.init_point),
    suscripcion_monto: Number(curso.precio),
    modalidad: 'suscripcion',
  }).eq('id', e.id)
  await registrarEvento(e.id, 'creada', { preapproval: r.data.id, monto: curso.precio, empieza: empiezaDespues ? vence!.toISOString() : 'hoy' })
  return { estado: 'pendiente', link: String(r.data.init_point) }
}

// Cancela en Mercado Pago. La alumna conserva el acceso hasta la fecha que ya pagó.
export async function cancelarSuscripcion(ctx: Contexto, quien: 'alumna' | 'terapeuta' | 'sistema'): Promise<{ ok: boolean; mensaje?: string }> {
  const { e, token } = ctx
  const s = db()
  if (!e.mp_preapproval_id || !ESTADOS_VIVOS.includes(e.suscripcion_estado)) {
    if (e.suscripcion_estado !== 'cancelada' && e.suscripcion_estado) await s.from('enrollments').update({ suscripcion_estado: 'cancelada' }).eq('id', e.id)
    return { ok: true }
  }
  if (!token) return { ok: false, mensaje: 'No pudimos conectar con Mercado Pago. Probá de nuevo en unos minutos.' }
  const r = await mp(token, `/preapproval/${encodeURIComponent(e.mp_preapproval_id)}`, { method: 'PUT', body: { status: 'cancelled' } })
  if (!r.ok) {
    const g = await mp(token, `/preapproval/${encodeURIComponent(e.mp_preapproval_id)}`)
    if (!(g.ok && g.data?.status === 'cancelled')) {
      await registrarEvento(e.id, 'cancelar_error', { quien, status: r.status, respuesta: r.data })
      return { ok: false, mensaje: 'Mercado Pago no respondió. Probá de nuevo en unos minutos.' }
    }
  }
  await s.from('enrollments').update({ suscripcion_estado: 'cancelada' }).eq('id', e.id)
  await registrarEvento(e.id, 'cancelada', { quien })
  return { ok: true }
}

export function resumenParaPantalla(ctx: Contexto) {
  const e = ctx.e
  return {
    suscripcion_estado: e.suscripcion_estado || null,
    acceso: accesoDe(e),
    fecha_vencimiento: e.fecha_vencimiento || null,
    proximo_cobro: e.proximo_cobro || null,
    link: e.suscripcion_estado === 'pendiente' ? e.suscripcion_link || null : null,
  }
}


// La terapeuta cambió el precio y eligió aplicarlo a las suscriptas: cambia el monto en Mercado Pago
// (rige desde la próxima cuota, nunca la del mes en curso) y le deja un aviso en el panel a cada alumna.
export async function cambiarMontoDeSuscriptas(courseId: string, nuevoMonto: number): Promise<{ cambiadas: number; fallidas: number }> {
  const s = db()
  const { data: filas } = await s.from('enrollments').select('id')
    .eq('course_id', courseId).in('suscripcion_estado', ['activa', 'esperando_cobro', 'con_problemas'])
  let cambiadas = 0, fallidas = 0
  for (const f of filas || []) {
    const ctx = await cargarContexto(f.id)
    if (!ctx?.token || !ctx.e.mp_preapproval_id) { fallidas++; continue }
    if (Number(ctx.e.suscripcion_monto) === nuevoMonto) continue
    const r = await mp(ctx.token, `/preapproval/${encodeURIComponent(ctx.e.mp_preapproval_id)}`, {
      method: 'PUT', body: { auto_recurring: { transaction_amount: nuevoMonto } },
    })
    if (!r.ok) { fallidas++; await registrarEvento(f.id, 'cambiar_monto_error', { status: r.status, respuesta: r.data }); continue }
    const aviso = `El precio de tu suscripción cambia a $${nuevoMonto.toLocaleString('es-AR')} por mes desde tu próximo cobro${ctx.e.proximo_cobro ? ` (${new Date(ctx.e.proximo_cobro).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })})` : ''}. Si no querés seguir, podés cancelar antes de esa fecha.`
    await s.from('enrollments').update({ suscripcion_monto: nuevoMonto, suscripcion_aviso: aviso }).eq('id', f.id)
    await registrarEvento(f.id, 'monto_cambiado', { antes: ctx.e.suscripcion_monto, ahora: nuevoMonto })
    cambiadas++
  }
  return { cambiadas, fallidas }
}

// La terapeuta pasó el curso a pago único y eligió cancelar todas: cada alumna conserva lo que ya pagó.
export async function cancelarTodasDelCurso(courseId: string): Promise<{ canceladas: number; fallidas: number }> {
  const { data: filas } = await db().from('enrollments').select('id').eq('course_id', courseId).in('suscripcion_estado', ESTADOS_VIVOS)
  let canceladas = 0, fallidas = 0
  for (const f of filas || []) {
    const ctx = await cargarContexto(f.id)
    if (!ctx) { fallidas++; continue }
    const r = await cancelarSuscripcion(ctx, 'terapeuta')
    if (r.ok) canceladas++; else fallidas++
  }
  return { canceladas, fallidas }
}

export async function contarSuscriptas(courseId: string) {
  const { count } = await db().from('enrollments').select('id', { count: 'exact', head: true })
    .eq('course_id', courseId).in('suscripcion_estado', ['activa', 'esperando_cobro', 'con_problemas'])
  return count || 0
}