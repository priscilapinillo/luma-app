import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estadoPlan } from '@/lib/acceso'
import { revisarPlanLuma, marcarAviso } from '@/lib/planLuma'
import { enviarAviso } from '@/lib/push'
import { eventoLoops, sincronizarLoops } from '@/lib/loops'
import { fechaLarga, diasCalendario, nombrePlan } from '@/lib/textoPlan'

// Tareas de cada hora (las dispara Netlify con la clave secreta del servidor):
// 1) revisa con Mercado Pago unos pocos planes de Luma (primero los que están por renovarse)
// 2) avisa a las terapeutas que les vence el plan (5 días y 1 día antes, días de gracia, vencido): una sola vez cada aviso
// 3) sincroniza con Loops las cuentas que cambiaron
// 4) borra las estadísticas de Luma Links de más de 90 días
// Cada parte va por separado: si una falla, las otras siguen. Todo entra en menos de 10 segundos
// (el tiempo máximo de Netlify); lo que no llega se hace en la vuelta de la hora siguiente.
export const maxDuration = 26

export async function POST(req: NextRequest) {
  const clave = (req.headers.get('authorization') || '').replace('Bearer ', '')
  if (!clave || clave !== process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const inicio = Date.now()
  const quedaTiempo = (ms: number) => Date.now() - inicio < ms
  const resultado: Record<string, unknown> = {}

  // ── 1) revisión de planes con cobro automático
  try {
    const ahora = Date.now()
    const iso = (d: number) => new Date(ahora + d * 86400000).toISOString()
    // primero: los que se renuevan entre ayer-6 días y mañana (ahí pasan los cobros y los rechazos)
    const [{ data: urgentes }, { data: resto }] = await Promise.all([
      s.from('subscriptions').select('user_id, mp_revisada_at').not('mp_subscription_id', 'is', null)
        .or(`and(current_period_ends_at.gte.${iso(-6)},current_period_ends_at.lte.${iso(1)}),and(status.eq.trial,trial_ends_at.gte.${iso(-4)},trial_ends_at.lte.${iso(1)})`)
        .order('mp_revisada_at', { ascending: true, nullsFirst: true }).limit(4),
      s.from('subscriptions').select('user_id, mp_revisada_at').not('mp_subscription_id', 'is', null).neq('status', 'cancelled')
        .or(`mp_revisada_at.is.null,mp_revisada_at.lt.${iso(-1)}`)
        .order('mp_revisada_at', { ascending: true, nullsFirst: true }).limit(2),
    ])
    // y las que prepararon un pago en los últimos 3 días pero todavía no quedaron vinculadas
    // (pagaron, el aviso de Mercado Pago no llegó y no volvieron a la pantalla "Confirmando")
    const { data: planesRecientes } = await s.from('luma_planes_mp').select('user_id, created_at')
      .gte('created_at', iso(-3)).order('created_at', { ascending: false }).limit(30)
    const sinVincular: string[] = []
    for (const id of [...new Set((planesRecientes || []).map((x: any) => x.user_id))]) {
      const { data: su } = await s.from('subscriptions').select('mp_subscription_id, status, mp_revisada_at').eq('user_id', id).maybeSingle()
      const revisadaHacePoco = su?.mp_revisada_at && Date.parse(su.mp_revisada_at) > ahora - 3 * 3600000
      if ((!su || !su.mp_subscription_id || su.status === 'cancelled') && !revisadaHacePoco) sinVincular.push(id)
      if (sinVincular.length >= 3) break
    }
    const ids = [...new Set([...(urgentes || []).map((x: any) => x.user_id), ...sinVincular, ...(resto || []).map((x: any) => x.user_id)])]
    let revisadas = 0
    for (const id of ids) {
      if (!quedaTiempo(5500)) break
      try { await revisarPlanLuma(id); revisadas++ } catch (e) { console.error('tareas-hora: revisar', id, e) }
    }
    resultado.planesRevisados = revisadas
  } catch (e) { console.error('tareas-hora: revisión de planes', e) }

  // ── 2) avisos de vencimiento (solo de 9 a 21 hs de Argentina, para no despertar a nadie)
  try {
    const horaAR = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Argentina/Buenos_Aires', hour: 'numeric', hour12: false }).format(new Date()))
    if (horaAR >= 9 && horaAR < 21) {
      const desde = new Date(Date.now() - 10 * 86400000).toISOString()
      const hasta = new Date(Date.now() + 6 * 86400000).toISOString()
      const { data: subs } = await s.from('subscriptions')
        .select('user_id, status, plan, trial_ends_at, current_period_ends_at, mp_subscription_id')
        .in('status', ['active', 'past_due', 'cancelled'])
        .gte('current_period_ends_at', desde).lte('current_period_ends_at', hasta)
      let enviados = 0
      for (const sub of subs || []) {
        if (!quedaTiempo(7500)) break
        const e = estadoPlan(sub)
        const dia = e.venceEl ? e.venceEl.toISOString().slice(0, 10) : ''
        const dias = diasCalendario(e.venceEl)
        let aviso: null | { clave: string; titulo: string; cuerpo: string; evento: string } = null

        if ((e.tipo === 'pago' && !e.automatico) || e.tipo === 'cancelado_vigente') {
          if (dias !== null && dias <= 1) aviso = { clave: `1d:${dia}`, evento: 'plan_por_vencer',
            titulo: '⏳ Mañana vence tu plan de Luma',
            cuerpo: `Renová antes del ${fechaLarga(e.venceEl)} para que tu página siga tomando reservas.` }
          else if (dias !== null && dias <= 5) aviso = { clave: `5d:${dia}`, evento: 'plan_por_vencer',
            titulo: `⏳ Tu plan de Luma vence el ${fechaLarga(e.venceEl)}`,
            cuerpo: 'Activá el cobro automático y no te preocupás más: el primer cobro es ese día, nunca dos veces el mismo mes.' }
        } else if (e.tipo === 'gracia' && !e.automatico) {
          aviso = { clave: `gracia:${dia}`, evento: 'plan_en_gracia',
            titulo: '⚠️ Venció tu plan de Luma',
            cuerpo: `Todo sigue funcionando hasta el ${fechaLarga(e.graciaHasta)}. Renovalo para que no se pause tu página.` }
        } else if (e.tipo === 'vencido') {
          aviso = { clave: `vencido:${dia}`, evento: 'plan_vencido',
            titulo: 'Tu página de Luma está en pausa',
            cuerpo: 'Tus consultantes y datos siguen guardados. Renová tu plan y vuelve a tomar reservas al instante.' }
        }
        if (!aviso) continue
        if (!(await marcarAviso(sub.user_id, aviso.clave))) continue // ya se le mandó
        await enviarAviso(sub.user_id, aviso.titulo, aviso.cuerpo).catch(() => 0)
        await eventoLoops(sub.user_id, aviso.evento, {
          dias: dias ?? 0, fecha: fechaLarga(e.venceEl), plan: nombrePlan(e), automatico: e.automatico,
        }, aviso.clave).catch(() => false)
        enviados++
      }
      resultado.avisosEnviados = enviados
    }
  } catch (e) { console.error('tareas-hora: avisos', e) }

  // ── 3) Loops
  try {
    if (quedaTiempo(7500)) resultado.loops = await sincronizarLoops(15, inicio + 8500)
  } catch (e) { console.error('tareas-hora: loops', e) }

  // ── 4) estadísticas de Luma Links: se guardan 90 días
  try {
    if (quedaTiempo(9000)) {
      const { error } = await s.from('links_eventos').delete().lt('created_at', new Date(Date.now() - 90 * 86400000).toISOString())
      if (error) console.error('tareas-hora: limpiar estadísticas', error)
    }
  } catch (e) { console.error('tareas-hora: limpieza', e) }

  return NextResponse.json({ ok: true, ...resultado, ms: Date.now() - inicio })
}
