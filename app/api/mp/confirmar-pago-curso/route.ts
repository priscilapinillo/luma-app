import { NextRequest, NextResponse } from 'next/server'
import { supabaseServicio, tokenMPDeTerapeuta } from '@/lib/mpReservas'

export async function POST(req: NextRequest) {
  try {
    const { enrollmentId, paymentId } = await req.json()
    if (!enrollmentId || !paymentId) {
      return NextResponse.json({ ok: false, motivo: 'faltan_datos' }, { status: 400 })
    }

    const supabase = supabaseServicio()

    const { data: insc } = await supabase
      .from('enrollments').select('id, estado, course_id, terapeuta_id, fecha_vencimiento')
      .eq('id', enrollmentId).maybeSingle()
    if (!insc) return NextResponse.json({ ok: false, motivo: 'inscripcion_no_existe' }, { status: 404 })
    if (insc.estado === 'activa') return NextResponse.json({ ok: true })

    // Un pago de Mercado Pago habilita UNA sola vez: si ese pago ya se usó, no vuelve a dar acceso
    const { data: yaUsado } = await supabase
      .from('course_payments').select('id, enrollment_id, created_at')
      .eq('mp_payment_id', String(paymentId)).limit(1).maybeSingle()
    // solo se acepta repetir un pago si es de esta misma inscripción y se anotó hace menos de 2 horas
    // (un reintento porque falló dar el acceso); un pago viejo nunca vuelve a habilitar un mes nuevo
    const reintentoReciente = !!yaUsado && yaUsado.enrollment_id === insc.id &&
      Date.now() - new Date(yaUsado.created_at).getTime() < 2 * 3600000
    if (yaUsado && !reintentoReciente) {
      console.warn('Pago de curso ya usado antes:', { enrollmentId, paymentId })
      return NextResponse.json({ ok: false, motivo: 'pago_ya_usado' }, { status: 400 })
    }

    const { data: curso } = await supabase
      .from('courses').select('precio, modalidad, user_id')
      .eq('id', insc.course_id).maybeSingle()
    if (!curso || curso.user_id !== insc.terapeuta_id) {
      return NextResponse.json({ ok: false, motivo: 'curso_invalido' }, { status: 400 })
    }

    const token = await tokenMPDeTerapeuta(curso.user_id)
    if (!token) {
      return NextResponse.json({ ok: false, motivo: 'mp_no_configurado' }, { status: 400 })
    }

    const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(paymentId))}`, {
      headers: { Authorization: `Bearer ${token}` },
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
      // si todavía le quedaban días, el mes nuevo se suma desde el vencimiento (no se pierden días)
      const actual = insc.fecha_vencimiento ? new Date(insc.fecha_vencimiento) : null
      const base = actual && actual > new Date() ? actual : new Date()
      const vence = new Date(base)
      vence.setDate(vence.getDate() + 30)
      datos.fecha_vencimiento = vence.toISOString()
    }

    // primero se anota el pago: si otro pedido igual llega al mismo tiempo, la base frena el duplicado
    // (si ya estaba anotado para esta misma inscripción, es un reintento: solo falta dar el acceso)
    const { error: errPago } = yaUsado ? { error: null } : await supabase.from('course_payments').insert({
      terapeuta_id: curso.user_id,
      enrollment_id: insc.id,
      course_id: insc.course_id,
      monto: Number(pago.transaction_amount),
      metodo: 'mercadopago',
      tipo: insc.fecha_vencimiento ? 'renovacion' : 'compra',
      mp_payment_id: String(pago.id),
      fecha: pago.date_approved || new Date().toISOString(),
    })
    if (errPago) {
      if (errPago.code === '23505') {
        // ese pago ya se registró en otro pedido simultáneo: no se vuelve a dar acceso
        const { data: otra } = await supabase.from('enrollments').select('estado').eq('id', insc.id).maybeSingle()
        return otra?.estado === 'activa'
          ? NextResponse.json({ ok: true })
          : NextResponse.json({ ok: false, motivo: 'pago_ya_usado' }, { status: 400 })
      }
      // si falla anotarlo por otro motivo, el acceso igual se da (la alumna pagó): solo se registra el error
      console.error('Error registrando pago de curso:', errPago)
    }

    const { error } = await supabase.from('enrollments').update(datos).eq('id', insc.id)
    if (error) {
      console.error('Error activando inscripción:', error)
      return NextResponse.json({ ok: false, motivo: 'error_guardando' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error confirmando pago de curso:', err)
    return NextResponse.json({ ok: false, motivo: 'error_interno' }, { status: 500 })
  }
}