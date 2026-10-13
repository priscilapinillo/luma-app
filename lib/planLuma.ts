// Planes de Luma (lo que pagan las terapeutas). Solo se usa en el servidor.
// Cómo funciona:
// - Cuando una terapeuta va a pagar, se crea un "plan" de Mercado Pago solo para ella (sin pedir email),
//   así puede pagar con la cuenta de Mercado Pago que quiera.
// - Ese plan queda anotado en luma_planes_mp → cuando Mercado Pago avisa, sabemos de quién es.
// - El plan se activa SOLO con lo que dice Mercado Pago (nunca con lo que mande el navegador).
import { createClient } from '@supabase/supabase-js'

export const PRECIOS: Record<string, number> = { basico: 9900, premium: 28000 }
export const NOMBRES: Record<string, string> = { basico: 'Luma Básico', premium: 'Luma Premium' }
const VUELTA = 'https://lumaapp.lat/suscripcion/confirmando'

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

function sumarUnMes(fecha: Date) {
  const nueva = new Date(fecha)
  nueva.setMonth(nueva.getMonth() + 1)
  return nueva
}

async function cancelarEnMP(preapprovalId: string) {
  const r = await mpLuma(`/preapproval/${encodeURIComponent(preapprovalId)}`, { method: 'PUT', body: { status: 'cancelled' } })
  if (!r.ok) console.error('planLuma: no se pudo cancelar', preapprovalId, r.status, r.data)
  return r.ok
}

// Guarda en la cuenta lo que dice Mercado Pago de una suscripción.
// Si la cuenta todavía no tiene fila de plan (por ejemplo, venía de Luma Links), la crea.
export async function aplicarPreapproval(userId: string, plan: string, pre: any) {
  const s = db()
  const preId = String(pre?.id || '')
  if (!preId) return
  const { data: actual } = await s.from('subscriptions').select('id, mp_subscription_id, status').eq('user_id', userId).maybeSingle()
  const idActual = actual?.mp_subscription_id || null

  if (pre.status === 'authorized') {
    // plan nuevo autorizado (por ejemplo, pasó de Básico a Premium): recién ahora se cancela el anterior
    if (idActual && idActual !== preId) await cancelarEnMP(idActual)
    const vence = pre.next_payment_date ? new Date(pre.next_payment_date) : sumarUnMes(new Date())
    const cambios = {
      status: 'active',
      plan: PRECIOS[plan] ? plan : 'basico',
      mp_subscription_id: preId,
      current_period_ends_at: vence.toISOString(),
    }
    if (actual) {
      const { error } = await s.from('subscriptions').update(cambios).eq('user_id', userId)
      if (error) console.error('planLuma: error actualizando el plan', userId, error)
    } else {
      const { error } = await s.from('subscriptions').insert({ user_id: userId, ...cambios })
      if (error) console.error('planLuma: error creando el plan', userId, error)
    }
    return
  }

  // cancelada o pausada: solo cuenta si es la suscripción vigente de la cuenta
  if (!actual || idActual !== preId) return
  if (pre.status === 'cancelled' || pre.status === 'paused') {
    const { error } = await s.from('subscriptions').update({
      status: pre.status === 'cancelled' ? 'cancelled' : 'past_due',
    }).eq('user_id', userId)
    if (error) console.error('planLuma: error marcando cancelada/pausada', userId, error)
  }
}

// Busca en Mercado Pago las suscripciones de los planes de esta terapeuta y aplica la que corresponde.
// Si encuentra más de una viva (tocó pagar dos veces), se queda con la más nueva y cancela las otras.
export async function vincularPlanesLuma(userId: string): Promise<boolean> {
  const s = db()
  const { data: planes } = await s.from('luma_planes_mp').select('mp_plan_id, plan, created_at')
    .eq('user_id', userId).order('created_at', { ascending: false }).limit(10)
  if (!planes || planes.length === 0) return false

  const vivas: { pre: any; plan: string }[] = []
  for (const p of planes) {
    const r = await mpLuma(`/preapproval/search?preapproval_plan_id=${encodeURIComponent(p.mp_plan_id)}&limit=20`)
    if (!r.ok) { console.error('planLuma: no se pudo buscar en el plan', p.mp_plan_id, r.status); continue }
    for (const x of (r.data?.results || [])) {
      if (x?.id && x.status === 'authorized') vivas.push({ pre: x, plan: p.plan })
    }
  }
  if (vivas.length === 0) return false

  vivas.sort((a, b) => new Date(b.pre.date_created || 0).getTime() - new Date(a.pre.date_created || 0).getTime())
  const principal = vivas[0]
  // pagó dos veces: se queda la más nueva y las otras se cancelan (así no se le cobra doble)
  for (const otra of vivas.slice(1)) await cancelarEnMP(String(otra.pre.id))
  await aplicarPreapproval(userId, principal.plan, principal.pre)
  return true
}

// ¿De quién es esta suscripción? Primero por la referencia vieja ("userId:plan"), después por el plan.
export async function duenaDePreapproval(pre: any): Promise<{ userId: string; plan: string } | null> {
  const [userId, plan] = String(pre?.external_reference || '').split(':')
  if (userId && /^[0-9a-f-]{36}$/i.test(userId)) return { userId, plan: plan || 'basico' }
  if (pre?.preapproval_plan_id) {
    const { data } = await db().from('luma_planes_mp').select('user_id, plan').eq('mp_plan_id', String(pre.preapproval_plan_id)).maybeSingle()
    if (data) return { userId: data.user_id, plan: data.plan }
  }
  return null
}

// Crea (o reutiliza) el plan de Mercado Pago de esta terapeuta y devuelve el link para pagar.
export async function crearPlanLuma(userId: string, plan: string): Promise<{ link?: string; error?: string }> {
  if (!PRECIOS[plan]) return { error: 'Plan inválido' }
  const s = db()
  const monto = PRECIOS[plan]

  // primero se fija si ya pagó y Mercado Pago todavía no avisó (así no se le cobra dos veces)
  await vincularPlanesLuma(userId).catch(() => false)

  // si ya tiene este mismo plan pago y vigente, no se le cobra de nuevo
  const { data: sub } = await s.from('subscriptions').select('status, plan, trial_ends_at, current_period_ends_at, mp_subscription_id').eq('user_id', userId).maybeSingle()
  const vigente = sub?.status === 'active' && sub?.current_period_ends_at && new Date(sub.current_period_ends_at) > new Date()
  if (vigente && sub?.plan === plan && sub?.mp_subscription_id) {
    return { error: `Ya tenés el plan ${NOMBRES[plan].replace('Luma ', '')} activo. No hace falta que pagues de nuevo.` }
  }

  // si tocó pagar hace poco con el mismo plan y precio, se reutiliza el mismo link (así no se duplica)
  const hace12h = new Date(Date.now() - 12 * 3600 * 1000).toISOString()
  const { data: reciente } = await s.from('luma_planes_mp').select('mp_plan_id').eq('user_id', userId)
    .eq('plan', plan).eq('monto', monto).gt('created_at', hace12h).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (reciente?.mp_plan_id) {
    return { link: `https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=${reciente.mp_plan_id}` }
  }

  // si todavía está en su prueba gratis, el primer cobro se hace cuando termina la prueba
  let diasGratis = 0
  if (sub?.status === 'trial' && sub?.trial_ends_at) {
    diasGratis = Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / 86400000)
    if (diasGratis < 1) diasGratis = 0
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
      ...(diasGratis >= 1 ? { free_trial: { frequency: Math.min(diasGratis, 30), frequency_type: 'days' } } : {}),
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
