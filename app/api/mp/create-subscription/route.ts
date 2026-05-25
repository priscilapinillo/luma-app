import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const origin = req.headers.get('origin') || 'https://luma-app-terapeutas-holisticos.netlify.app'

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [{
          title: 'Luma — Suscripción mensual',
          quantity: 1,
          currency_id: 'ARS',
          unit_price: 7000,
        }],
        payer: { email },
        back_urls: {
          success: `${origin}/api/mp/subscription-success?user_id=${userId}`,
          failure: `${origin}/suscripcion?error=true`,
          pending: `${origin}/suscripcion?pending=true`,
        },
        auto_return: 'approved',
        metadata: { user_id: userId },
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ error: data.message || 'Error MP' }, { status: 400 })
    }

    return NextResponse.json({ init_point: data.init_point, id: data.id })
  } catch (err) {
    console.error('Error subscription MP:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}