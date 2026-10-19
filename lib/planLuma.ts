// Planes de Luma (lo que pagan las terapeutas). Solo se usa en el servidor.
// Cómo funciona:
// - Cuando una terapeuta va a pagar, se crea un "plan" de Mercado Pago solo para ella (sin pedir email),
//   así puede pagar con la cuenta de Mercado Pago que quiera.
// - Ese plan queda anotado en luma_planes_mp → cuando Mercado Pago avisa, sabemos de quién es.
// - El plan se activa SOLO con lo que dice Mercado Pago (nunca con lo que mande el navegador).
// - El mes pagado se extiende SOLO con un cobro APROBADO, y cada cobro se anota una sola vez
//   en luma_pagos (si Mercado Pago avisa dos veces, no suma dos meses).
// - Nunca se cobra dos veces el mismo mes: si le quedan días pagos (o de prueba), el primer cobro
//   automático se hace el día que se terminan.
import { createClient } from '@supabase/supabase-js'
import { estadoPlan } from '@/lib/acceso'

export const PRECIOS: Record<string, number> = { basico: 9900, premium: 28000 }
export const NOMBRES: Record<string, string> = { basico: 'Luma Básico', premium: 'Luma Premium' }
const VUELTA = 'https://lumaapp.lat/suscripcion/confirmando'
const DIA = 86400000

export function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}

export async function mpLuma(path: string, opciones: { method?: string; body?: unknown; idem?: string } = {}) {
  try {
    const res = await fetch('https://api.mercadopago.com' + path, {
      method: opciones.method || 'GET',
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
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

export function sumarMeses(fecha: Date, meses: number) {
  const d = new Date(fecha)
  const dia = d.getDate()
  d.setMonth(d.getMonth() + meses)
  if (d.getDate() < dia) d.setDate(0) // 31 de enero + 1 mes = 28/29 de febrero, no 3 de marzo
  return d
}

const planValido = (p: unknown) => (p === 'premium' ? 'premium' : 'basico')
const t = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : 0)

async function cancelarEnMP(preapprovalId: string) {
  const r = await mpLuma(`/preapproval/${encodeURIComponent(preapprovalId)}`, { method: 'PUT', body: { status: 'cancelled' } })
  if (!r.ok) console.error('planLuma: no se pudo cancelar', preapprovalId, r.status, r.data)
  return r.ok
}

// Anota un aviso una sola vez. Devuelve true solo la PRIMERA vez (así nada se manda repetido).
export async function marcarAviso(userId: string, clave: string): Promise<boolean> {
  const { error } = await db().from('luma_avisos').insert({ user_id: userId, clave })
  if (!error) return true
  if (error.code !== '23505') console.error('planLuma: no se pudo anotar el aviso', clave, error)
  return false
}

// Aviso al celular sin romper nada si falla (se importa recién acá para no cargar web-push donde no hace falta)
async function avisar(userId: string, titulo: string, cuerpo: string) {
  try { const { enviarAviso } = await import('@/lib/push'); await enviarAviso(userId, titulo, cuerpo) } catch (e) { console.error('planLuma: aviso', e) }
}
async function evento(userId: string, nombre: string, props?: Record<string, unknown>) {
  try { const { eventoLoops } = await import('@/lib/loops'); await eventoLoops(userId, nombre, props) } catch (e) { console.error('planLuma: loops', e) }
}
async function avisarAdmin(titulo: string, cuerpo: string) {
  try {
    const s = db()
    for (let pagina = 1; pagina <= 10; pagina++) {
      const { data } = await s.auth.admin.listUsers({ page: pagina, perPage: 200 })
      const u = (data?.users || []).find(x => (x.email || '').toLowerCase() === 'priscilapinillo78@gmail.com')
      if (u) { await avisar(u.id, titulo, cuerpo); return }
      if (!data?.users || data.users.length < 200) return
    }
  } catch (e) { console.error('planLuma: aviso admin', e) }
}

// ¿De quién es esta suscripción y de qué plan? Primero por la referencia ("userId:plan"), después por el plan anotado.
export async function duenaDePreapproval(pre: any): Promise<{ userId: string; plan: string } | null> {
  const [userId, plan] = String(pre?.external_reference || '').split(':')
  if (userId && /^[0-9a-f-]{36}$/i.test(userId)) return { userId, plan: planValido(plan) }
  if (pre?.preapproval_plan_id) {
    const { data } = await db().from('luma_planes_mp').select('user_id, plan').eq('mp_plan_id', String(pre.preapproval_plan_id)).maybeSingle()
    if (data) return { userId: data.user_id, plan: planValido(data.plan) }
  }
  return null
}

// Guarda en la cuenta lo que dice Mercado Pago de una suscripción (autorizada, cancelada o pausada).
// NO extiende el mes pagado: eso lo hace solo un cobro aprobado (anotarCobros).
export async function aplicarPreapproval(userId: string, plan: string, pre: any) {
  const s = db()
  const preId = String(pre?.id || '')
  if (!preId) return
  const { data: actual } = await s.from('subscriptions')
    .select('id, mp_subscription_id, status, plan, trial_ends_at, current_period_ends_at').eq('user_id', userId).maybeSingle()
  const idActual = actual?.mp_subscription_id || null
  const planNuevo = planValido(plan)

  if (pre.status === 'authorized') {
    // otra suscripción viva (por ejemplo, pasó de Básico a Premium): recién ahora se cancela la anterior
    if (idActual && idActual !== preId && actual?.status !== 'cancelled') await cancelarEnMP(idActual)

    if (!actual) {
      // venía de Luma Links (o la fila no existe): se crea. El acceso llega con el primer cobro aprobado.
      const { error } = await s.from('subscriptions').insert({
        user_id: userId, status: 'active', plan: planNuevo, mp_subscription_id: preId, current_period_ends_at: null,
      })
      if (error && error.code !== '23505') console.error('planLuma: error creando el plan', userId, error)
      return
    }

    const est = estadoPlan(actual)
    const cambios: Record<string, unknown> = { mp_subscription_id: preId }
    if (actual.status === 'trial') {
      // viene de la prueba (vigente o recién vencida): sigue como prueba hasta que se acredite el primer cobro.
      // Si la prueba sigue vigente, tiene todo hasta que termina y el primer cobro sale ese día.
      cambios.plan = planNuevo
    } else {
      cambios.status = 'active'
      const tieneDiasPagos = est.tipo === 'pago' || est.tipo === 'cancelado_vigente' || est.tipo === 'gracia'
      if (!tieneDiasPagos) cambios.plan = planNuevo
      else if (planNuevo === 'premium') cambios.plan = 'premium' // sube a Premium: desde ya
      // baja a Básico: sigue Premium hasta el fin de lo pagado; el primer cobro Básico lo cambia
    }
    const { error } = await s.from('subscriptions').update(cambios).eq('user_id', userId)
    if (error) console.error('planLuma: error actualizando el plan', userId, error)
    return
  }

  // cancelada o pausada: solo cuenta si es la suscripción vigente de la cuenta
  if (!actual || idActual !== preId) return
  if (pre.status === 'cancelled') {
    // en prueba (todavía no pagó nada): sigue su prueba hasta el final, sin cobro automático
    if (actual.status === 'trial') {
      const { error } = await s.from('subscriptions').update({ mp_subscription_id: null }).eq('user_id', userId)
      if (error) console.error('planLuma: error quitando el cobro de la prueba', userId, error)
      return
    }
    if (actual.status === 'cancelled') return
    // conserva todo hasta el último día pagado (calcularAcceso lo respeta)
    const { error } = await s.from('subscriptions').update({ status: 'cancelled' }).eq('user_id', userId)
    if (error) console.error('planLuma: error marcando cancelada', userId, error)
    else await evento(userId, 'plan_cancelado', { hasta: actual.current_period_ends_at })
    return
  }
  if (pre.status === 'paused' && actual.status === 'active') {
    const { error } = await s.from('subscriptions').update({ status: 'past_due' }).eq('user_id', userId)
    if (error) console.error('planLuma: error marcando pausada', userId, error)
  }
}

// Lee los cobros de una suscripción en Mercado Pago y anota los APROBADOS (una sola vez cada uno).
// Cada cobro aprobado suma un mes desde lo que ya tenía pago (no pierde días, nunca suma dos veces).
async function anotarCobros(userId: string, preId: string, plan: string) {
  const s = db()
  const busqueda = await mpLuma(`/authorized_payments/search?preapproval_id=${encodeURIComponent(preId)}&limit=12`)
  if (!busqueda.ok) { console.error('planLuma: no se pudieron leer los cobros', preId, busqueda.status); return { rechazado: null as string | null } }
  const lista: any[] = (busqueda.data?.results || busqueda.data?.elements || [])
  lista.sort((a, b) => t(a?.date_created || a?.debit_date) - t(b?.date_created || b?.debit_date))

  const { data: previos } = await s.from('luma_pagos').select('mp_payment_id, estado').eq('user_id', userId).not('mp_payment_id', 'is', null)
  const anotados = new Map<string, string>()
  for (const p of previos || []) anotados.set(String(p.mp_payment_id), p.estado)

  let rechazado: string | null = null
  for (const ap of lista.slice(-12)) {
    const pagoId = ap?.payment?.id || ap?.payment_id
    if (!pagoId) continue
    const clave = String(pagoId)
    const yaEstaba = anotados.get(clave)
    if (yaEstaba && yaEstaba !== 'aprobado') continue // devuelto o contracargo: ya se resolvió
    // el estado real se le pregunta a Mercado Pago (nunca se confía en otro dato)
    const pago = await mpLuma(`/v1/payments/${encodeURIComponent(clave)}`)
    if (!pago.ok) continue
    const st = String(pago.data?.status || '')

    if (st === 'approved' && !yaEstaba) {
      const { data: sub } = await s.from('subscriptions').select('status, plan, trial_ends_at, current_period_ends_at').eq('user_id', userId).maybeSingle()
      const fechaPago = new Date(pago.data?.date_approved || pago.data?.date_created || Date.now())
      // un mes más desde lo que ya tenía pago (o desde el fin de la prueba); si venció hace mucho, desde el día del cobro
      // - venía de la prueba: el mes empieza cuando termina la prueba o el día del cobro, lo que sea más tarde
      // - ya pagaba: un mes más desde su vencimiento (aunque se haya cobrado unos días tarde, no pierde ni regala)
      // - venció hace mucho: desde el día del cobro
      let base: Date
      if (sub?.status === 'trial') base = new Date(Math.max(t(sub?.trial_ends_at), fechaPago.getTime()))
      else {
        const finPagado = t(sub?.current_period_ends_at)
        base = finPagado && finPagado > fechaPago.getTime() - 20 * DIA ? new Date(finPagado) : fechaPago
      }
      // Cobro que YA está contado en el mes vigente (por ejemplo, cobros de antes de este sistema, cuando el plan
      // se extendía al autorizar): se anota para el historial pero NO suma otro mes (así no se regalan meses).
      const finActual = t(sub?.current_period_ends_at)
      const yaContado = sub?.status !== 'trial' && finActual >= fechaPago.getTime() + 25 * DIA
      const hasta = yaContado ? new Date(finActual) : sumarMeses(base, 1)
      // anotar el cobro y extender el plan van JUNTOS (una sola operación en la base): si algo se corta a la mitad,
      // no puede quedar un cobro anotado sin su mes, ni un mes sumado dos veces
      const { data: anotado, error } = await s.rpc('luma_anotar_cobro', {
        p_user: userId, p_pago: clave, p_pre: preId, p_plan: planValido(plan),
        p_monto: Number(pago.data?.transaction_amount) || 0, p_fecha: fechaPago.toISOString(),
        p_hasta: hasta.toISOString(), p_extender: !yaContado,
      })
      if (error) { console.error('planLuma: no se pudo anotar el cobro', clave, error); continue }
      anotados.set(clave, 'aprobado')
      if (!anotado || yaContado) continue // ya estaba anotado (otra revisión al mismo tiempo) o era un cobro viejo
      rechazado = null
      await evento(userId, 'pago_aprobado', { plan: planValido(plan), monto: Number(pago.data?.transaction_amount) || 0, hasta: hasta.toISOString() })
    } else if ((st === 'refunded' || st === 'charged_back') && yaEstaba === 'aprobado') {
      // devolución o contracargo: se quita ese mes de acceso y se le avisa a Priscila
      // marcar el cobro y descontar el mes van juntos (una sola operación en la base), y una sola vez
      const { data: quitado, error } = await s.rpc('luma_quitar_cobro', { p_pago: clave, p_estado: st === 'refunded' ? 'devuelto' : 'contracargo' })
      if (error) { console.error('planLuma: no se pudo descontar el cobro', clave, error); continue }
      anotados.set(clave, st)
      if (!quitado) continue
      await avisarAdmin(st === 'refunded' ? '↩️ Devolución de un plan de Luma' : '⚠️ Contracargo en un plan de Luma',
        `Cobro ${clave}: se le quitó ese mes de acceso a la cuenta.`)
    } else if (st === 'rejected' || st === 'cancelled') {
      rechazado = clave
    } else if (st === 'approved') {
      rechazado = null
    }
  }
  return { rechazado }
}

// Busca en Mercado Pago las suscripciones de los planes de esta terapeuta.
// Si encuentra más de una viva (tocó pagar dos veces), se queda con la más nueva y cancela las otras.
// Devuelve la suscripción autorizada más nueva (si hay) y todas las que encontró.
async function buscarEnPlanes(userId: string) {
  const s = db()
  const { data: planes } = await s.from('luma_planes_mp').select('mp_plan_id, plan, created_at')
    .eq('user_id', userId).order('created_at', { ascending: false }).limit(10)
  const todas: { pre: any; plan: string }[] = []
  for (const p of planes || []) {
    const r = await mpLuma(`/preapproval/search?preapproval_plan_id=${encodeURIComponent(p.mp_plan_id)}&limit=20`)
    if (!r.ok) { console.error('planLuma: no se pudo buscar en el plan', p.mp_plan_id, r.status); continue }
    for (const x of (r.data?.results || [])) if (x?.id) todas.push({ pre: x, plan: planValido(p.plan) })
  }
  const vivas = todas.filter(x => x.pre.status === 'authorized')
    .sort((a, b) => t(b.pre.date_created) - t(a.pre.date_created))
  for (const otra of vivas.slice(1)) {
    await cancelarEnMP(String(otra.pre.id)) // pagó dos veces: así no se le cobra doble
    otra.pre.status = 'cancelled'
  }
  return { principal: vivas[0] || null, todas }
}

// Compatibilidad con el código anterior: true si encontró una suscripción viva.
export async function vincularPlanesLuma(userId: string): Promise<boolean> {
  const r = await revisarPlanLuma(userId)
  return r.vinculada
}

/**
 * Revisión completa del plan de una terapeuta contra Mercado Pago. Se puede llamar todas las veces
 * que haga falta (aviso de Mercado Pago, pantalla "Confirmando", panel, revisión de cada hora):
 * nunca suma dos veces el mismo cobro ni regala nada.
 */
export async function revisarPlanLuma(userId: string): Promise<{ vinculada: boolean }> {
  const s = db()
  const { data: sub } = await s.from('subscriptions').select('mp_subscription_id, status, current_period_ends_at').eq('user_id', userId).maybeSingle()

  // 1) suscripciones hechas desde los planes que preparó Luma (con cualquier cuenta de Mercado Pago)
  const { principal, todas } = await buscarEnPlanes(userId)
  if (principal) await aplicarPreapproval(userId, principal.plan, principal.pre)

  // 2) la suscripción guardada (puede ser vieja, de antes de los planes por cuenta)
  const idGuardado = sub?.mp_subscription_id || null
  let planGuardado = 'basico'
  if (idGuardado && idGuardado !== principal?.pre?.id) {
    const r = await mpLuma(`/preapproval/${encodeURIComponent(idGuardado)}`)
    if (r.ok && r.data?.id) {
      const duena = await duenaDePreapproval(r.data)
      if (duena && duena.userId === userId) {
        planGuardado = duena.plan
        // si ya hay otra más nueva autorizada, la vieja no se vuelve a activar
        if (!(principal && r.data.status === 'authorized')) await aplicarPreapproval(userId, duena.plan, r.data)
      }
    } else if (r.status !== 404) {
      console.error('planLuma: no se pudo leer la suscripción guardada', idGuardado, r.status)
    }
  }

  // 3) cobros: de la suscripción vigente y de las que se cancelaron hace poco (por si un cobro quedó sin anotar)
  const revisar = new Map<string, string>()
  if (principal) revisar.set(String(principal.pre.id), principal.plan)
  if (idGuardado) revisar.set(idGuardado, revisar.get(idGuardado) || planGuardado)
  for (const x of todas) {
    if (t(x.pre.date_created) > Date.now() - 70 * DIA) revisar.set(String(x.pre.id), x.plan)
  }
  let rechazo: string | null = null
  for (const [preId, plan] of revisar) {
    const r = await anotarCobros(userId, preId, plan)
    if (preId === (principal?.pre?.id || idGuardado)) rechazo = r.rechazado
  }

  // 4) cobro rechazado de la suscripción vigente: se le avisa UNA vez por cobro
  if (rechazo && await marcarAviso(userId, `rechazo:${rechazo}`)) {
    await avisar(userId, '⚠️ No pudimos cobrar tu plan de Luma',
      'Mercado Pago rechazó el cobro. Revisá tu tarjeta en Mercado Pago: tenés 3 días de gracia y todo sigue funcionando.')
    await evento(userId, 'cobro_rechazado', {})
  }

  await s.from('subscriptions').update({ mp_revisada_at: new Date().toISOString() }).eq('user_id', userId)
  return { vinculada: !!principal }
}

// Cancela el cobro automático desde Ajustes. Conserva todo hasta el último día pagado.
export async function cancelarCobroAutomatico(userId: string): Promise<{ ok: boolean; error?: string; hasta?: string | null }> {
  const s = db()
  // primero se trae lo último de Mercado Pago (por si justo se acreditó un cobro)
  await revisarPlanLuma(userId).catch(e => console.error('planLuma: revisar antes de cancelar', e))
  const { data: sub } = await s.from('subscriptions').select('mp_subscription_id, status, trial_ends_at, current_period_ends_at').eq('user_id', userId).maybeSingle()
  if (!sub?.mp_subscription_id || sub.status === 'cancelled') return { ok: false, error: 'No tenés un cobro automático activo.' }
  const ok = await cancelarEnMP(sub.mp_subscription_id)
  if (!ok) return { ok: false, error: 'Mercado Pago no respondió. Probá de nuevo en unos minutos.' }
  // también se cancelan las otras vivas de sus planes (si tocó pagar dos veces)
  const { todas } = await buscarEnPlanes(userId)
  for (const x of todas) if (x.pre.status === 'authorized') await cancelarEnMP(String(x.pre.id))
  if (sub.status === 'trial') {
    await s.from('subscriptions').update({ mp_subscription_id: null }).eq('user_id', userId)
    return { ok: true, hasta: sub.trial_ends_at }
  }
  await s.from('subscriptions').update({ status: 'cancelled' }).eq('user_id', userId)
  await evento(userId, 'plan_cancelado', { hasta: sub.current_period_ends_at })
  return { ok: true, hasta: sub.current_period_ends_at }
}

// Crea (o reutiliza) el plan de Mercado Pago de esta terapeuta y devuelve el link para pagar.
export async function crearPlanLuma(userId: string, plan: string): Promise<{ link?: string; error?: string }> {
  if (!PRECIOS[plan]) return { error: 'Plan inválido' }
  const s = db()
  const monto = PRECIOS[plan]

  // primero se fija si ya pagó y Mercado Pago todavía no avisó (así no se le cobra dos veces)
  await revisarPlanLuma(userId).catch(() => null)

  const { data: sub } = await s.from('subscriptions').select('status, plan, trial_ends_at, current_period_ends_at, mp_subscription_id').eq('user_id', userId).maybeSingle()
  const est = estadoPlan(sub)
  // ya tiene este mismo plan con cobro automático andando: no se le cobra de nuevo
  // (en días de gracia sí puede: por ejemplo, para pagar con otra tarjeta; la suscripción vieja se cancela sola)
  if (est.automatico && sub?.plan === plan && (est.tipo === 'pago' || est.tipo === 'prueba')) {
    return { error: `Ya tenés el plan ${NOMBRES[plan].replace('Luma ', '')} con cobro automático. No hace falta que pagues de nuevo.` }
  }

  // ¿hasta cuándo tiene días (prueba o pagos)? El primer cobro se hace ese día: nunca dos veces el mismo mes.
  // En días de gracia (ya venció) se cobra en el momento, y ese cobro suma el mes desde que venció.
  let hastaISO: string | null = null
  if (est.tipo === 'prueba') hastaISO = sub?.trial_ends_at || null
  else if (est.tipo === 'pago' || est.tipo === 'cancelado_vigente') hastaISO = sub?.current_period_ends_at || null
  let diasGratis = 0
  // Tope de 30 días (Mercado Pago no acepta más). Si le quedaban 31, el cobro sale un día antes,
  // pero ese cobro suma el mes desde su vencimiento: no pierde días ni paga dos veces el mismo mes.
  if (hastaISO) diasGratis = Math.min(30, Math.max(0, Math.ceil((new Date(hastaISO).getTime() - Date.now()) / DIA)))

  // si tocó pagar hace poco con el mismo plan, precio y días, se reutiliza el mismo link (así no se duplica)
  const hace12h = new Date(Date.now() - 12 * 3600 * 1000).toISOString()
  const { data: recientes } = await s.from('luma_planes_mp').select('mp_plan_id, created_at').eq('user_id', userId)
    .eq('plan', plan).eq('monto', monto).gt('created_at', hace12h).order('created_at', { ascending: false }).limit(1)
  const reciente = recientes?.[0]
  if (reciente?.mp_plan_id) {
    // solo si los días gratis siguen siendo los mismos (si no, el primer cobro caería en otra fecha)
    const diasEntonces = hastaISO ? Math.min(30, Math.max(0, Math.ceil((new Date(hastaISO).getTime() - new Date(reciente.created_at).getTime()) / DIA))) : 0
    if (diasEntonces === diasGratis) {
      return { link: `https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=${reciente.mp_plan_id}` }
    }
  }

  const cuerpo = {
    reason: NOMBRES[plan],
    external_reference: `${userId}:${plan}`,
    back_url: VUELTA,
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: monto,
      currency_id: 'ARS',
      ...(diasGratis >= 1 ? { free_trial: { frequency: diasGratis, frequency_type: 'days' } } : {}),
    },
  }
  const r = await mpLuma('/preapproval_plan', { method: 'POST', body: cuerpo, idem: `luma-propio-${userId}-${plan}-${Date.now()}` })
  const id = r.data?.id ? String(r.data.id) : ''
  const link = r.data?.init_point || (id ? `https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=${id}` : '')
  if (!r.ok || !id || !link) {
    console.error('planLuma: Mercado Pago no creó el plan', r.status, r.data)
    return { error: 'Mercado Pago no pudo preparar el pago. Probá de nuevo en unos minutos o pagá por transferencia.' }
  }
  const { error } = await s.from('luma_planes_mp').insert({ mp_plan_id: id, user_id: userId, plan, monto, created_at: new Date().toISOString() })
  if (error) {
    // sin esta anotación no sabríamos de quién es el pago: mejor no mandarla a pagar
    console.error('planLuma: no se pudo anotar el plan', error)
    return { error: 'No pudimos preparar el pago. Probá de nuevo en unos minutos.' }
  }
  return { link }
}
