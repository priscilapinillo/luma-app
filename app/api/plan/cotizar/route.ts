import { NextRequest, NextResponse } from 'next/server'
import { usuarioDelPedido } from '@/lib/sesionServidor'
import { cotizar, type Concepto, type Plan } from '@/lib/pagosLuma'

// Cuánto pagaría por lo que eligió (lo calcula el servidor; la pantalla solo lo muestra).
export async function POST(req: NextRequest) {
  try {
    const user = await usuarioDelPedido(req)
    if (!user) return NextResponse.json({ error: 'Iniciá sesión de nuevo.' }, { status: 401 })
    const { concepto, plan } = await req.json().catch(() => ({}))
    const c = await cotizar(user.id, concepto as Concepto, plan as Plan)
    return NextResponse.json(c, { status: c.error ? 400 : 200 })
  } catch (e) {
    console.error('plan/cotizar:', e)
    return NextResponse.json({ error: 'No pudimos calcular el monto. Probá de nuevo.' }, { status: 500 })
  }
}
