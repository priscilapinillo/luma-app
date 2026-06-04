import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { servicioNombre, precio, monto, therapistId, successUrl, failureUrl } = await req.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: perfil } = await supabase
      .from('therapist_profiles')
      .select('mp_access_token, mp_activo')
      .eq('user_id', therapistId)
      .single()

    if (!perfil?.mp_activo || !perfil?.mp_access_token) {
      return NextResponse.json({ error: 'MP no configurado' }, { status: 400 })
    }

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perfil.mp_access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [{
          title: servicioNombre,
          quantity: 1,
          currency_id: 'ARS',
          unit_price: monto,
        }],
        back_urls: {
          success: successUrl,
          failure: failureUrl,
          pending: failureUrl,
        },
        payment_methods: {
          excluded_payment_types: [],
        },
        auto_return: 'approved',
binary_mode: true,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ error: data.message || 'Error MP' }, { status: 400 })
    }

    return NextResponse.json({ init_point: data.init_point, id: data.id })
  } catch (err) {
    console.error('Error MP:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}