import { NextRequest, NextResponse } from 'next/server'
import { db, revisarPlanLuma } from '@/lib/planLuma'
import { estadoPlan } from '@/lib/acceso'

// Le pregunta a Mercado Pago cómo está el plan de una terapeuta y lo guarda.
// Solo copia lo que dice Mercado Pago: aunque alguien la llame con otro userId, no puede regalarse nada.
// La usan el panel (por si el aviso de Mercado Pago no llegó) y la pantalla "Confirmando tu pago".
export const maxDuration = 26

// freno: la misma cuenta no se revisa más de una vez cada 5 segundos (cuida el límite de Mercado Pago)
const ultimas = new Map<string, number>()
function muyPronto(userId: string) {
  const ahora = Date.now()
  for (const [k, v] of ultimas) if (ahora - v > 60000) ultimas.delete(k)
  const antes = ultimas.get(userId)
  ultimas.set(userId, ahora)
  return !!antes && ahora - antes < 5000
}

export async function POST(req: NextRequest) {
  try {
    const s = db()
    // con sesión: se revisa la cuenta de la sesión. Sin sesión (páginas viejas en caché): la del pedido.
    let userId: string | null = null
    const auth = req.headers.get('authorization') || ''
    if (auth.startsWith('Bearer ')) {
      const { data } = await s.auth.getUser(auth.slice(7))
      userId = data?.user?.id || null
    }
    if (!userId) {
      const body = await req.json().catch(() => ({}))
      if (typeof body?.userId === 'string' && /^[0-9a-f-]{36}$/i.test(body.userId)) userId = body.userId
    }
    if (!userId) return NextResponse.json({ vigente: false, motivo: 'sin_usuario' }, { status: 400 })

    if (!muyPronto(userId)) await revisarPlanLuma(userId)

    const { data: fin } = await s.from('subscriptions')
      .select('status, plan, trial_ends_at, current_period_ends_at, mp_subscription_id').eq('user_id', userId).maybeSingle()
    const est = estadoPlan(fin)
    // "vigente" = ya quedó con cobro automático y con acceso, o con un mes pago al día
    const vigente = est.nivel !== 'sin_acceso' && (est.automatico || est.tipo === 'pago')
    return NextResponse.json({ vigente, plan: est.nivel === 'premium' ? 'premium' : est.plan, motivo: fin?.status || 'sin_plan', tipo: est.tipo })
  } catch (err) {
    console.error('Error verificar-suscripcion:', err)
    return NextResponse.json({ vigente: false, motivo: 'error' }, { status: 500 })
  }
}
