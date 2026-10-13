import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const PRECIOS: Record<string, number> = {
  basico: 9900,
  premium: 28000,
}
const NOMBRES: Record<string, string> = {
  basico: 'Luma Básico',
  premium: 'Luma Premium',
}

export async function POST(req: NextRequest) {
  try {
    const { plan, backUrl } = await req.json()

    if (plan !== 'basico' && plan !== 'premium') {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
    }

    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: { user }, error: errorUser } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (errorUser || !user) {
      console.error('Fallo de autenticación en create-subscription:', errorUser)
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // El plan anterior YA NO se cancela acá: se cancela recién cuando Mercado Pago avisa que el plan
    // nuevo quedó autorizado (ver /api/mp/webhook). Así, si abandona el pago, no se queda sin plan.

    // el link de vuelta siempre es de Luma (nunca una dirección que venga de afuera)
    const origen = req.headers.get('origin') || new URL(req.url).origin
    const vuelta = typeof backUrl === 'string' && backUrl.startsWith('https://lumaapp.lat/')
      ? backUrl
      : origen.startsWith('https://') ? `${origen}/dashboard?pago=ok` : 'https://lumaapp.lat/dashboard?pago=ok'

    const response = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: NOMBRES[plan],
        external_reference: `${user.id}:${plan}`,
        payer_email: user.email,
        back_url: vuelta,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: PRECIOS[plan],
          currency_id: 'ARS',
        },
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Error MP preapproval:', data)
      return NextResponse.json({ error: data.message || 'Error al crear la suscripción en Mercado Pago' }, { status: 400 })
    }

    return NextResponse.json({ init_point: data.init_point, id: data.id })
  } catch (err) {
    console.error('Error create-subscription:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}