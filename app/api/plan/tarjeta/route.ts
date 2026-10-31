import { NextRequest, NextResponse } from 'next/server'
import { usuarioDelPedido, muyPronto } from '@/lib/sesionServidor'
import { suscribirConTarjeta } from '@/lib/pagosLuma'

// Cobro automático con la tarjeta escrita dentro de Luma (llega solo el "token" de Mercado Pago, nunca el número).
export const maxDuration = 26
export async function POST(req: NextRequest) {
  try {
    const user = await usuarioDelPedido(req)
    if (!user) return NextResponse.json({ ok: false, error: 'Iniciá sesión de nuevo.' }, { status: 401 })
    const { plan, token, email } = await req.json().catch(() => ({}))
    if ((plan !== 'basico' && plan !== 'premium') || typeof token !== 'string' || token.length < 10 || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ ok: false, error: 'Faltan datos de la tarjeta. Revisalos y probá de nuevo.' }, { status: 400 })
    }
    if (muyPronto(`tarjeta:${user.id}`, 8000)) return NextResponse.json({ ok: false, error: 'Ya lo estamos procesando, esperá unos segundos.' }, { status: 429 })
    const r = await suscribirConTarjeta(user.id, plan, token, email.trim())
    return NextResponse.json(r, { status: r.ok ? 200 : 400 })
  } catch (e) {
    console.error('plan/tarjeta:', e)
    return NextResponse.json({ ok: false, error: 'Hubo un error. Probá de nuevo en unos minutos.' }, { status: 500 })
  }
}
