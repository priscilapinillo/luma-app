// Mercado Pago avisa acá cuando se aprueba el pago de una reserva,
// aunque la clienta haya cerrado la página antes de volver.
// No confía en lo que llega: consulta el pago directo a Mercado Pago antes de marcarlo pagado.
import { NextRequest, NextResponse } from 'next/server'
import { confirmarPagoReserva } from '@/lib/mpReservas'

export async function POST(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams
    const sessionId = params.get('session_id')
    const body = await req.json().catch(() => ({} as any))
    const tipo = body?.type || body?.topic || params.get('type') || params.get('topic')
    const paymentId = body?.data?.id || params.get('data.id') || params.get('id')

    if (sessionId && paymentId && (!tipo || tipo === 'payment')) {
      const r = await confirmarPagoReserva(sessionId, String(paymentId))
      if (!r.ok) console.warn('webhook-reserva: no se confirmó', { sessionId, paymentId, motivo: r.motivo })
    }
  } catch (err) {
    console.error('webhook-reserva: error inesperado', err)
  }
  // Siempre 200: si no, Mercado Pago reintenta sin parar.
  return NextResponse.json({ recibido: true })
}

export async function GET() {
  return NextResponse.json({ ok: true })
}