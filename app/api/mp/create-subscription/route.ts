import { NextRequest, NextResponse } from 'next/server'
import { db, crearPlanLuma } from '@/lib/planLuma'

// La terapeuta elige un plan → se prepara el pago en Mercado Pago.
// Ya no se manda su email a Mercado Pago: puede pagar con cualquier cuenta de Mercado Pago.
// El plan se activa recién cuando Mercado Pago confirma (webhook o verificación en vivo), nunca acá.
export async function POST(req: NextRequest) {
  try {
    const { plan } = await req.json().catch(() => ({}))
    if (plan !== 'basico' && plan !== 'premium') {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
    }

    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    const { data: { user }, error: errorUser } = await db().auth.getUser(authHeader.replace('Bearer ', ''))
    if (errorUser || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const r = await crearPlanLuma(user.id, plan)
    if (!r.link) return NextResponse.json({ error: r.error || 'No se pudo iniciar el pago.' }, { status: 400 })
    return NextResponse.json({ init_point: r.link })
  } catch (err) {
    console.error('Error create-subscription:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
