import { NextRequest, NextResponse } from 'next/server'
import { db, mpLuma, aplicarPreapproval, vincularPlanesLuma, duenaDePreapproval } from '@/lib/planLuma'

// Le pregunta a Mercado Pago cómo está el plan de una terapeuta y lo guarda.
// Solo copia lo que dice Mercado Pago: aunque alguien la llame con otro userId, no puede regalarse nada.
// La usan el panel (por si el aviso de Mercado Pago no llegó) y la pantalla "Confirmando tu pago".
export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json().catch(() => ({}))
    if (!userId || typeof userId !== 'string' || !/^[0-9a-f-]{36}$/i.test(userId)) {
      return NextResponse.json({ vigente: false, motivo: 'sin_usuario' }, { status: 400 })
    }
    const s = db()

    // 1) la suscripción que ya tiene guardada (si tiene)
    const { data: sub } = await s.from('subscriptions').select('mp_subscription_id').eq('user_id', userId).maybeSingle()
    if (sub?.mp_subscription_id) {
      const r = await mpLuma(`/preapproval/${encodeURIComponent(sub.mp_subscription_id)}`)
      if (r.ok && r.data?.id) {
        const duena = await duenaDePreapproval(r.data)
        if (duena && duena.userId === userId) await aplicarPreapproval(userId, duena.plan, r.data)
      } else {
        console.error('verificar-suscripcion: no se pudo leer el preapproval', sub.mp_subscription_id, r.status)
      }
    }

    // 2) los planes que preparó para pagar (por si pagó y todavía no está guardado)
    await vincularPlanesLuma(userId).catch(e => console.error('verificar-suscripcion: vincular', e))

    // 3) cómo quedó
    const { data: fin } = await s.from('subscriptions').select('status, plan, current_period_ends_at').eq('user_id', userId).maybeSingle()
    const vigente = fin?.status === 'active' && !!fin?.current_period_ends_at && new Date(fin.current_period_ends_at) > new Date()
    return NextResponse.json({ vigente, plan: fin?.plan || null, motivo: fin?.status || 'sin_plan' })
  } catch (err) {
    console.error('Error verificar-suscripcion:', err)
    return NextResponse.json({ vigente: false, motivo: 'error' }, { status: 500 })
  }
}
