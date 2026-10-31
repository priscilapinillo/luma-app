// Pagos del plan de Luma que NO son el cobro automático mensual: un mes por Mercado Pago, el plan anual,
// la diferencia para pasar a Premium y las transferencias que confirma Priscila. Solo servidor.
//
// Reglas de plata (no se negocian):
// - El monto lo calcula SIEMPRE el servidor (calcularCompra). El navegador solo elige qué quiere comprar.
// - Un pago se aplica UNA sola vez: la base anota cada pago con una clave única y suma el período en la
//   misma operación (función luma_aplicar_pago). Si el aviso llega dos o diez veces, suma una.
// - El período nuevo empieza cuando termina lo que ya tiene: nunca se paga dos veces el mismo mes.
// - Con cobro automático andando no se ofrece pagar un mes a mano (sería pagar dos veces).
// - Si compra el anual teniendo cobro automático, después de aprobado se cancela el automático.
// - Si algo de plata no se puede completar, queda una alerta en el panel de Admin y te llega un aviso.
import { db, mpLuma, revisarPlanLuma, cancelarEnMP, buscarEnPlanes, evento, avisarAdmin, marcarAviso, PRECIOS } from '@/lib/planLuma'
import { estadoPlan, type SubscriptionRow } from '@/lib/acceso'
import { fechaLarga } from '@/lib/textoPlan'

export const PRECIOS_ANUAL: Record<string, number> = { basico: 99000, premium: 280000 }
export type Concepto = 'mes' | 'anual' | 'diferencia'
export type Plan = 'basico' | 'premium'
const DIA = 86400000
const NOMBRE: Record<Plan, string> = { basico: 'Básico', premium: 'Premium' }
const SITIO = 'https://lumaapp.lat'

export type Cotizacion = { monto?: number; detalle?: string; error?: string; cancelaAutomatico?: boolean }

// Diferencia por los días que le quedan para pasar de Básico a Premium.
// Si lo que tiene pago es un anual, se calcula con los precios anuales; si no, con los mensuales.
export function diferenciaPremium(msRestantes: number, cicloAnual: boolean): { monto: number; dias: number } {
  const diasTope = cicloAnual ? 366 : 31
  const dias = Math.min(diasTope, Math.max(0, Math.ceil(msRestantes / DIA)))
  const porDia = cicloAnual ? (PRECIOS_ANUAL.premium - PRECIOS_ANUAL.basico) / 365 : (PRECIOS.premium - PRECIOS.basico) / 30
  return { monto: Math.round(porDia * dias), dias }
}

/**
 * Cuánto paga y si puede comprar esto ahora. Pura: no toca la red, así se prueba fácil.
 * ultimoConcepto = con qué pagó lo que tiene hoy ('anual' cambia la cuenta de la diferencia).
 */
export function calcularCompra(sub: SubscriptionRow | null, ultimoConcepto: string | null, concepto: Concepto, plan: Plan, ahora = Date.now()): Cotizacion {
  if (plan !== 'basico' && plan !== 'premium') return { error: 'Plan inválido.' }
  if (concepto !== 'mes' && concepto !== 'anual' && concepto !== 'diferencia') return { error: 'Opción inválida.' }
  const est = estadoPlan(sub, ahora)
  const tieneDiasPagos = (est.tipo === 'pago' || est.tipo === 'cancelado_vigente') && !!est.venceEl && est.venceEl.getTime() > ahora
  const restante = tieneDiasPagos ? est.venceEl!.getTime() - ahora : 0
  const cicloAnual = ultimoConcepto === 'anual'

  if (concepto === 'diferencia') {
    if (plan !== 'premium') return { error: 'La diferencia es para pasar a Premium.' }
    if (est.automatico) return { error: 'Tenés cobro automático: pasá a Premium desde «Elegir plan» y se ajusta solo.' }
    if (!tieneDiasPagos || sub?.plan === 'premium') return { error: 'Esta opción es para quien tiene Básico pago y quiere Premium desde ya.' }
    const d = diferenciaPremium(restante, cicloAnual)
    if (d.dias < 1 || d.monto <= 0) return { error: 'Te queda menos de un día de Básico: elegí Premium directamente.' }
    return { monto: d.monto, detalle: `Premium desde hoy hasta el ${fechaLarga(est.venceEl)} (${d.dias} día${d.dias === 1 ? '' : 's'}).` }
  }

  // un mes a mano con cobro automático andando = pagar dos veces el mismo mes
  if (concepto === 'mes' && est.automatico) {
    return { error: 'Ya tenés el cobro automático con tarjeta: no hace falta pagar a mano. Si querés cambiar de tarjeta, usá «Elegir plan».' }
  }
  // tiene Premium pagado y quiere Básico: perdería Premium que ya pagó
  if (plan === 'basico' && tieneDiasPagos && sub?.plan === 'premium') {
    return { error: `Tenés Premium pago hasta el ${fechaLarga(est.venceEl)}. Cuando venza, podés pasar a Básico.` }
  }

  const base = concepto === 'anual' ? PRECIOS_ANUAL[plan] : PRECIOS[plan]
  let monto = base
  const partes: string[] = []
  // tiene Básico pago y compra Premium: Premium arranca hoy, así que se suma la diferencia de los días que le quedan
  if (plan === 'premium' && tieneDiasPagos && sub?.plan !== 'premium') {
    const d = diferenciaPremium(restante, cicloAnual)
    if (d.monto > 0) { monto += d.monto; partes.push(`Incluye $${d.monto.toLocaleString('es-AR')} para tener Premium ya los ${d.dias} días que te quedan de Básico.`) }
  }
  const empieza = est.tipo === 'prueba' ? est.venceEl : tieneDiasPagos ? est.venceEl : null
  partes.unshift(`${concepto === 'anual' ? '12 meses' : '1 mes'} de ${NOMBRE[plan]}${empieza ? ` a partir del ${fechaLarga(empieza)}, cuando termina lo que ya tenés` : ' desde que se confirma el pago'}.`)
  return { monto, detalle: partes.join(' '), cancelaAutomatico: concepto === 'anual' && est.automatico }
}

async function datosDeCompra(userId: string) {
  const s = db()
  const [{ data: sub }, { data: ultimo }] = await Promise.all([
    s.from('subscriptions').select('status, plan, trial_ends_at, current_period_ends_at, mp_subscription_id').eq('user_id', userId).maybeSingle(),
    s.from('luma_pagos').select('concepto').eq('user_id', userId).eq('estado', 'aprobado').order('fecha', { ascending: false }).limit(1).maybeSingle(),
  ])
  return { sub: sub as SubscriptionRow | null, ultimoConcepto: (ultimo as any)?.concepto || null }
}

export async function cotizar(userId: string, concepto: Concepto, plan: Plan): Promise<Cotizacion> {
  const { sub, ultimoConcepto } = await datosDeCompra(userId)
  return calcularCompra(sub, ultimoConcepto, concepto, plan)
}

export async function alerta(tipo: string, titulo: string, detalle: Record<string, unknown>, userId?: string) {
  try { await db().from('luma_alertas').insert({ tipo, titulo, detalle, user_id: userId || null }) } catch (e) { console.error('pagosLuma: alerta', e) }
  await avisarAdmin(`⚠️ ${titulo}`, String(detalle?.mensaje || '').slice(0, 180) || 'Mirá el panel de Admin.')
}

// ── Mercado Pago, un solo pago (un mes, anual o diferencia)
export async function prepararPagoMP(userId: string, concepto: Concepto, plan: Plan): Promise<{ link?: string; error?: string }> {
  await revisarPlanLuma(userId).catch(() => null) // por si justo se acreditó algo
  const c = await cotizar(userId, concepto, plan)
  if (c.error || !c.monto) return { error: c.error || 'No se pudo calcular el monto.' }
  const s = db()
  // si preparó lo mismo hace poco y no pagó, se reutiliza (no se apilan intentos iguales)
  const hace2h = new Date(Date.now() - 2 * 3600000).toISOString()
  const { data: previo } = await s.from('luma_intentos').select('id, monto').eq('user_id', userId).eq('concepto', concepto).eq('plan', plan)
    .eq('metodo', 'mercadopago').eq('estado', 'creado').gt('created_at', hace2h).order('created_at', { ascending: false }).limit(1).maybeSingle()
  let intentoId = previo && Number(previo.monto) === c.monto ? String(previo.id) : ''
  if (!intentoId) {
    const { data: nuevo, error } = await s.from('luma_intentos').insert({ user_id: userId, concepto, plan, monto: c.monto, metodo: 'mercadopago', estado: 'creado', detalle: c.detalle || null }).select('id').single()
    if (error || !nuevo) { console.error('pagosLuma: intento', error); return { error: 'No pudimos preparar el pago. Probá de nuevo en unos minutos.' } }
    intentoId = String(nuevo.id)
  }
  const titulo = `Luma ${NOMBRE[plan]} · ${concepto === 'anual' ? '12 meses' : concepto === 'mes' ? '1 mes' : 'pasar a Premium'}`
  const vence = new Date(Date.now() + 48 * 3600000).toISOString().replace('Z', '+00:00')
  const r = await mpLuma('/checkout/preferences', {
    method: 'POST', idem: `luma-unico-${intentoId}`,
    body: {
      items: [{ id: `luma-${concepto}-${plan}`, title: titulo, quantity: 1, unit_price: c.monto, currency_id: 'ARS' }],
      external_reference: `luma1:${intentoId}`,
      notification_url: `${SITIO}/api/mp/webhook`,
      back_urls: {
        success: `${SITIO}/suscripcion/confirmando?intento=${intentoId}`,
        pending: `${SITIO}/suscripcion/confirmando?intento=${intentoId}`,
        failure: `${SITIO}/suscripcion?pago=no`,
      },
      auto_return: 'approved',
      expires: true, expiration_date_to: vence,
      statement_descriptor: 'LUMA',
    },
  })
  const link = r.data?.init_point
  if (!r.ok || !link) { console.error('pagosLuma: preferencia', r.status, r.data); return { error: 'Mercado Pago no pudo preparar el pago. Probá de nuevo en unos minutos o pagá por transferencia.' } }
  return { link }
}

// Después de un anual pagado: se cancela el cobro automático mensual (si lo tenía) para que no le cobren de más.
async function cancelarAutomaticoTrasAnual(userId: string) {
  const s = db()
  const { data: sub } = await s.from('subscriptions').select('mp_subscription_id, status').eq('user_id', userId).maybeSingle()
  const ids = new Set<string>()
  if (sub?.mp_subscription_id) ids.add(String(sub.mp_subscription_id))
  try { const { todas } = await buscarEnPlanes(userId); for (const x of todas) if (x.pre?.status === 'authorized') ids.add(String(x.pre.id)) } catch {}
  if (ids.size === 0) return
  let todoOk = true
  for (const id of ids) todoOk = (await cancelarEnMP(id)) && todoOk
  if (todoOk) await s.from('subscriptions').update({ mp_subscription_id: null }).eq('user_id', userId)
  else await alerta('cancelar_automatico', 'No se pudo cancelar un cobro automático después de un anual',
    { mensaje: 'Pagó el plan anual pero Mercado Pago no canceló su cobro mensual. Cancelalo desde el panel de Admin para que no se le cobre de más.', suscripciones: [...ids] }, userId)
}

// Lo que se hace después de aplicar un pago nuevo (avisos y, si fue anual, cancelar el automático)
async function despuesDeAplicar(intento: any, hasta: string | null, metodo: string) {
  if (intento.concepto === 'anual') await cancelarAutomaticoTrasAnual(intento.user_id)
  await evento(intento.user_id, metodo === 'transferencia' ? 'transferencia_confirmada' : 'pago_aprobado',
    { concepto: intento.concepto, plan: intento.plan, monto: Number(intento.monto), ...(hasta ? { hasta } : {}) })
}

/**
 * Revisa un pago único de Mercado Pago y, si está aprobado y es de un intento de Luma, lo aplica (una sola vez).
 * La llaman: el aviso de Mercado Pago, la pantalla "Confirmando" y la revisión de cada hora. Se puede llamar mil veces.
 */
export async function revisarPagoUnico(paymentId: string, soloDe?: string): Promise<{ aplicado: boolean; estado: string; motivo?: string }> {
  const pago = await mpLuma(`/v1/payments/${encodeURIComponent(paymentId)}`)
  if (!pago.ok || !pago.data?.id) return { aplicado: false, estado: 'desconocido', motivo: 'no_se_pudo_leer' }
  const p = pago.data
  const ref = String(p.external_reference || '')
  if (!ref.startsWith('luma1:')) return { aplicado: false, estado: String(p.status), motivo: 'no_es_de_luma' }
  const intentoId = ref.slice(6)
  if (!/^[0-9a-f-]{36}$/i.test(intentoId)) return { aplicado: false, estado: String(p.status), motivo: 'referencia_rara' }
  const s = db()
  const { data: intento } = await s.from('luma_intentos').select('*').eq('id', intentoId).maybeSingle()
  if (!intento) return { aplicado: false, estado: String(p.status), motivo: 'sin_intento' }
  if (soloDe && intento.user_id !== soloDe) return { aplicado: false, estado: String(p.status), motivo: 'no_es_tuyo' }
  const clave = String(p.id)
  const st = String(p.status || '')

  if (st === 'refunded' || st === 'charged_back') {
    const { data: quitado } = await s.rpc('luma_quitar_pago_unico', { p_clave: clave, p_estado: st === 'refunded' ? 'devuelto' : 'contracargo' })
    if (quitado) await alerta(st === 'refunded' ? 'devolucion' : 'contracargo', st === 'refunded' ? 'Devolución de un pago de Luma' : 'Contracargo en un pago de Luma',
      { mensaje: `Pago ${clave} (${intento.concepto} ${intento.plan}): se le descontó lo que había sumado.`, pago: clave }, intento.user_id)
    return { aplicado: false, estado: st }
  }
  if (st !== 'approved') return { aplicado: false, estado: st }
  if (String(p.currency_id || 'ARS') !== 'ARS' || Number(p.transaction_amount) + 0.5 < Number(intento.monto)) {
    if (intento.estado !== 'aprobado' && await marcarAviso(intento.user_id, `monto:${clave}`)) await alerta('monto_distinto', 'Llegó un pago con un monto distinto al esperado',
      { mensaje: `Pago ${clave}: pagó ${p.currency_id} ${p.transaction_amount} y se esperaba $${intento.monto}. No se aplicó: revisalo.`, pago: clave, intento: intentoId }, intento.user_id)
    return { aplicado: false, estado: st, motivo: 'monto_distinto' }
  }
  const { data: r, error } = await s.rpc('luma_aplicar_pago', {
    p_intento: intentoId, p_clave: clave, p_monto: Number(p.transaction_amount) || Number(intento.monto),
    p_fecha: p.date_approved || new Date().toISOString(), p_metodo: 'mercadopago',
  })
  if (error || !(r as any)?.ok) {
    if (await marcarAviso(intento.user_id, `sinaplicar:${clave}`)) await alerta('pago_sin_aplicar', 'Un pago aprobado no se pudo aplicar', { mensaje: `Pago ${clave} aprobado, pero no se pudo sumar al plan. Se reintenta solo cada hora.`, pago: clave, error: error?.message || (r as any)?.motivo }, intento.user_id)
    return { aplicado: false, estado: st, motivo: 'error' }
  }
  if ((r as any).nuevo) await despuesDeAplicar(intento, (r as any).hasta || null, 'mercadopago')
  return { aplicado: !!(r as any).nuevo, estado: st }
}

// La revisión de cada hora: intentos de Mercado Pago de los últimos 3 días que todavía no se aplicaron
// (por si el aviso de Mercado Pago no llegó y no volvió a la pantalla "Confirmando").
export async function revisarIntentosPendientes(hastaMs: number) {
  const s = db()
  const desde = new Date(Date.now() - 3 * DIA).toISOString()
  const { data } = await s.from('luma_intentos').select('id, user_id').eq('metodo', 'mercadopago').eq('estado', 'creado')
    .gt('created_at', desde).order('created_at', { ascending: false }).limit(8)
  let aplicados = 0
  for (const it of data || []) {
    if (Date.now() > hastaMs) break
    const r = await mpLuma(`/v1/payments/search?external_reference=${encodeURIComponent('luma1:' + it.id)}&sort=date_created&criteria=desc&limit=5`)
    for (const p of (r.ok ? r.data?.results || [] : [])) {
      if (p?.id && p.status === 'approved') { const x = await revisarPagoUnico(String(p.id)); if (x.aplicado) aplicados++ }
    }
  }
  // los que quedaron sin pagar más de 7 días se marcan vencidos (solo es orden: nunca se borra nada)
  await s.from('luma_intentos').update({ estado: 'vencido' }).eq('estado', 'creado').lt('created_at', new Date(Date.now() - 7 * DIA).toISOString())
  return aplicados
}

// ── Transferencias
export async function avisarTransferencia(userId: string, concepto: Concepto, plan: Plan): Promise<{ ok: boolean; error?: string; yaAvisada?: boolean; monto?: number }> {
  const c = await cotizar(userId, concepto, plan)
  if (c.error || !c.monto) return { ok: false, error: c.error || 'No se pudo calcular el monto.' }
  const s = db()
  const { data: pendiente } = await s.from('luma_intentos').select('id, monto, avisado_at').eq('user_id', userId).eq('estado', 'pendiente').maybeSingle()
  if (pendiente) return { ok: true, yaAvisada: true, monto: Number(pendiente.monto) }
  const { error } = await s.from('luma_intentos').insert({
    user_id: userId, concepto, plan, monto: c.monto, metodo: 'transferencia', estado: 'pendiente', detalle: c.detalle || null, avisado_at: new Date().toISOString(),
  })
  if (error) {
    if (error.code === '23505') return { ok: true, yaAvisada: true } // doble toque: ya quedó una
    console.error('pagosLuma: transferencia', error)
    return { ok: false, error: 'No pudimos registrar tu aviso. Probá de nuevo en unos minutos.' }
  }
  await avisarAdmin('🏦 Transferencia para confirmar', `${NOMBRE[plan]} · ${concepto === 'anual' ? 'anual' : concepto === 'mes' ? '1 mes' : 'diferencia'} · $${c.monto.toLocaleString('es-AR')}. Revisá el panel de Admin.`)
  await evento(userId, 'transferencia_avisada', { concepto, plan, monto: c.monto })
  return { ok: true, monto: c.monto }
}

export async function resolverTransferencia(intentoId: string, accion: 'confirmar' | 'rechazar', admin: string): Promise<{ ok: boolean; error?: string; hasta?: string | null }> {
  const s = db()
  const { data: it } = await s.from('luma_intentos').select('*').eq('id', intentoId).maybeSingle()
  if (!it || it.metodo !== 'transferencia') return { ok: false, error: 'No encontramos esa transferencia.' }
  if (it.estado === 'aprobado') return { ok: true } // ya confirmada (doble toque)
  if (it.estado !== 'pendiente') return { ok: false, error: 'Esa transferencia ya fue resuelta.' }
  if (accion === 'rechazar') {
    const { data: fila } = await s.from('luma_intentos').update({ estado: 'rechazado', resuelto_at: new Date().toISOString(), resuelto_por: admin })
      .eq('id', intentoId).eq('estado', 'pendiente').select('id').maybeSingle()
    if (fila) await evento(it.user_id, 'transferencia_no_llego', { concepto: it.concepto, plan: it.plan, monto: Number(it.monto) })
    return { ok: true }
  }
  const { data: r, error } = await s.rpc('luma_aplicar_pago', { p_intento: intentoId, p_clave: `transf:${intentoId}`, p_monto: Number(it.monto), p_fecha: new Date().toISOString(), p_metodo: 'transferencia' })
  if (error || !(r as any)?.ok) { console.error('pagosLuma: confirmar transferencia', error, r); return { ok: false, error: 'No se pudo confirmar. Probá de nuevo.' } }
  await s.from('luma_intentos').update({ resuelto_por: admin }).eq('id', intentoId)
  if ((r as any).nuevo) await despuesDeAplicar(it, (r as any).hasta || null, 'transferencia')
  return { ok: true, hasta: (r as any).hasta || null }
}

// ── Tarjeta dentro de Luma (cobro automático mensual)
// El formulario de Mercado Pago convierte la tarjeta en un "token" (Luma nunca ve el número).
// Con ese token se crea la suscripción dentro del plan de Mercado Pago de la terapeuta, así todo lo demás
// (activación, cobros, avisos) sigue funcionando exactamente igual que con el link.
export async function suscribirConTarjeta(userId: string, plan: Plan, token: string, email: string): Promise<{ ok: boolean; error?: string; link?: string }> {
  const { crearPlanLuma } = await import('@/lib/planLuma')
  const r = await crearPlanLuma(userId, plan)
  if (!r.planId) return { ok: false, error: r.error || 'No pudimos preparar el cobro. Probá de nuevo.' }
  const pre = await mpLuma('/preapproval', {
    method: 'POST', idem: `luma-tarjeta-${token}`,
    body: { preapproval_plan_id: r.planId, card_token_id: token, payer_email: email, external_reference: `${userId}:${plan}`, status: 'authorized' },
  })
  if (!pre.ok || !pre.data?.id) {
    console.error('pagosLuma: tarjeta', pre.status, pre.data)
    const msg = String(pre.data?.message || '').toLowerCase()
    const motivo = msg.includes('card') && msg.includes('invalid') ? 'Mercado Pago no aceptó esa tarjeta. Revisá los datos o probá con otra.'
      : msg.includes('email') ? 'Mercado Pago no aceptó ese email. Probá con el email de tu cuenta de Mercado Pago.'
      : 'Mercado Pago no pudo activar el cobro con esa tarjeta.'
    return { ok: false, error: `${motivo} También podés pagar desde Mercado Pago con el botón de abajo.`, link: r.link }
  }
  await revisarPlanLuma(userId).catch(e => console.error('pagosLuma: revisar tras tarjeta', e))
  return { ok: true }
}
