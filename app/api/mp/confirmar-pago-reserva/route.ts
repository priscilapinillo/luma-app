import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { sessionId, paymentId } = await req.json()
    if (!sessionId || !paymentId) {
      return NextResponse.json({ ok: false, motivo: 'faltan_datos' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: sesion } = await supabase
      .from('sessions').select('id, user_id, precio, estado_pago')
      .eq('id', sessionId).maybeSingle()
    if (!sesion) return NextResponse.json({ ok: false, motivo: 'sesion_no_existe' }, { status: 404 })
    if (sesion.estado_pago === 'pagado') return NextResponse.json({ ok: true })

    const { data: perfil } = await supabase
      .from('therapist_profiles').select('mp_access_token')
      .eq('user_id', sesion.user_id).maybeSingle()
    if (!perfil?.mp_access_token) {
      return NextResponse.json({ ok: false, motivo: 'mp_no_configurado' }, { status: 400 })
    }

    const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(paymentId))}`, {
      headers: { Authorization: `Bearer ${perfil.mp_access_token}` },
      cache: 'no-store',
    })
    if (!res.ok) return NextResponse.json({ ok: false, motivo: 'pago_no_encontrado' }, { status: 400 })
    const pago = await res.json()

    const aprobado = pago.status === 'approved'
    const esDeEstaSesion = String(pago.external_reference) === String(sesion.id)
    const montoOk = Number(pago.transaction_amount) >= Number(sesion.precio || 0)

    if (!aprobado || !esDeEstaSesion || !montoOk) {
      console.warn('Pago de reserva rechazado:', { sessionId, paymentId, aprobado, esDeEstaSesion, montoOk })
      return NextResponse.json({ ok: false, motivo: 'pago_no_valido' }, { status: 400 })
    }

    await supabase.from('sessions').update({ estado_pago: 'pagado' }).eq('id', sesion.id)
    await supabase.from('public_bookings').update({ estado: 'confirmada' }).eq('session_id', sesion.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error confirmando pago de reserva:', err)
    return NextResponse.json({ ok: false, motivo: 'error_interno' }, { status: 500 })
  }
}