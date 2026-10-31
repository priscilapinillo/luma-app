import { NextRequest, NextResponse } from 'next/server'
import { usuarioDelPedido, muyPronto } from '@/lib/sesionServidor'
import { prepararPagoMP, avisarTransferencia, type Concepto, type Plan } from '@/lib/pagosLuma'

// Un mes, el anual o la diferencia: por Mercado Pago (devuelve el link) o "Ya transferí" (queda pendiente para Priscila).
export const maxDuration = 26
export async function POST(req: NextRequest) {
  try {
    const user = await usuarioDelPedido(req)
    if (!user) return NextResponse.json({ error: 'Iniciá sesión de nuevo.' }, { status: 401 })
    const { concepto, plan, metodo } = await req.json().catch(() => ({}))
    if (muyPronto(`pagar:${user.id}`, 3000)) return NextResponse.json({ error: 'Ya lo estamos preparando, esperá unos segundos.' }, { status: 429 })
    if (metodo === 'transferencia') {
      const r = await avisarTransferencia(user.id, concepto as Concepto, plan as Plan)
      return NextResponse.json(r, { status: r.ok ? 200 : 400 })
    }
    if (metodo === 'mercadopago') {
      const r = await prepararPagoMP(user.id, concepto as Concepto, plan as Plan)
      return NextResponse.json(r, { status: r.link ? 200 : 400 })
    }
    return NextResponse.json({ error: 'Forma de pago inválida.' }, { status: 400 })
  } catch (e) {
    console.error('plan/pagar:', e)
    return NextResponse.json({ error: 'Hubo un error. Probá de nuevo en unos minutos.' }, { status: 500 })
  }
}
