import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'Falta userId' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('mp_subscription_id, plan')
      .eq('user_id', userId)
      .maybeSingle()

    if (!sub?.mp_subscription_id) {
      return NextResponse.json({ vigente: false, motivo: 'sin_suscripcion_mp' })
    }

    const res = await fetch(`https://api.mercadopago.com/preapproval/${sub.mp_subscription_id}`, {
      headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    })
    const preapproval = await res.json()

    if (!res.ok) {
      console.error('Error consultando MP en verificar-suscripcion:', preapproval)
      return NextResponse.json({ vigente: false, motivo: 'error_mp' })
    }

    if (preapproval.status === 'authorized') {
      // MP confirma que sigue vigente — autocuramos la base, así no hace falta tocar Supabase a mano
      const nuevaFecha = preapproval.next_payment_date
        ? new Date(preapproval.next_payment_date)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      await supabase.from('subscriptions').update({
        status: 'active',
        current_period_ends_at: nuevaFecha.toISOString(),
      }).eq('user_id', userId)

      return NextResponse.json({
        vigente: true,
        plan: sub.plan,
        current_period_ends_at: nuevaFecha.toISOString(),
      })
    }

    // MP confirma que NO está vigente (cancelada, pausada, etc.) — reflejamos eso también
    await supabase.from('subscriptions').update({
      status: preapproval.status === 'paused' ? 'past_due' : 'cancelled',
    }).eq('user_id', userId)

    return NextResponse.json({ vigente: false, motivo: preapproval.status })
  } catch (err) {
    console.error('Error en verificar-suscripcion:', err)
    return NextResponse.json({ vigente: false, motivo: 'error_interno' }, { status: 500 })
  }
}