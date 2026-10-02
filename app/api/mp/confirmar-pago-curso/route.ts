import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { enrollmentId, paymentId } = await req.json()
    if (!enrollmentId || !paymentId) {
      return NextResponse.json({ ok: false, motivo: 'faltan_datos' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: insc } = await supabase
      .from('enrollments').select('id, estado, course_id, terapeuta_id, fecha_vencimiento')
      .eq('id', enrollmentId).maybeSingle()
    if (!insc) return NextResponse.json({ ok: false, motivo: 'inscripcion_no_existe' }, { status: 404 })
    if (insc.estado === 'activa') return NextResponse.json({ ok: true })

    const { data: curso } = await supabase
      .from('courses').select('precio, modalidad, user_id')
      .eq('id', insc.course_id).maybeSingle()
    if (!curso || curso.user_id !== insc.terapeuta_id) {
      return NextResponse.json({ ok: false, motivo: 'curso_invalido' }, { status: 400 })
    }

    const { data: perfil } = await supabase
      .from('therapist_profiles').select('mp_access_token')
      .eq('user_id', curso.user_id).maybeSingle()
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
    const esDeEstaInscripcion = String(pago.external_reference) === String(insc.id)
    const montoOk = Number(pago.transaction_amount) >= Number(curso.precio)

    if (!aprobado || !esDeEstaInscripcion || !montoOk) {
      console.warn('Pago de curso rechazado:', { enrollmentId, paymentId, aprobado, esDeEstaInscripcion, montoOk })
      return NextResponse.json({ ok: false, motivo: 'pago_no_valido' }, { status: 400 })
    }

    const datos: any = { estado: 'activa' }
    if (curso.modalidad === 'suscripcion') {
      const vence = new Date()
      vence.setDate(vence.getDate() + 30)
      datos.fecha_vencimiento = vence.toISOString()
    }

    const { error } = await supabase.from('enrollments').update(datos).eq('id', insc.id)
    if (error) {
      console.error('Error activando inscripción:', error)
      return NextResponse.json({ ok: false, motivo: 'error_guardando' }, { status: 500 })
    }

    // anotar el pago en Finanzas. Si esto falla, el acceso ya quedó dado: solo se registra el error
    const { error: errPago } = await supabase.from('course_payments').insert({
      terapeuta_id: curso.user_id,
      enrollment_id: insc.id,
      course_id: insc.course_id,
      monto: Number(pago.transaction_amount),
      metodo: 'mercadopago',
      tipo: insc.fecha_vencimiento ? 'renovacion' : 'compra',
      mp_payment_id: String(pago.id),
      fecha: pago.date_approved || new Date().toISOString(),
    })
    if (errPago && errPago.code !== '23505') console.error('Error registrando pago de curso:', errPago)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error confirmando pago de curso:', err)
    return NextResponse.json({ ok: false, motivo: 'error_interno' }, { status: 500 })
  }
}