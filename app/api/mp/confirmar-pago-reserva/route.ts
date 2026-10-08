import { NextRequest, NextResponse } from 'next/server'
import { confirmarPagoReserva } from '@/lib/mpReservas'

export async function POST(req: NextRequest) {
  try {
    const { sessionId, paymentId } = await req.json()
    const r = await confirmarPagoReserva(String(sessionId || ''), String(paymentId || ''))
    return NextResponse.json({ ok: r.ok, motivo: r.motivo }, { status: r.status })
  } catch (err) {
    console.error('Error confirmando pago de reserva:', err)
    return NextResponse.json({ ok: false, motivo: 'error_interno' }, { status: 500 })
  }
}