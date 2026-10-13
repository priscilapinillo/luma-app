import { NextRequest, NextResponse } from 'next/server'
import { db, usuarioDeToken, cambiarMontoDeSuscriptas, cancelarTodasDelCurso, contarSuscriptas } from '@/lib/suscripciones'

// Decisiones de la terapeuta sobre las alumnas suscriptas cuando cambia su curso:
//   accion 'contar'          → cuántas suscriptas hay (para saber si hay que preguntarle)
//   accion 'aplicar_precio'  → el precio nuevo rige también para las suscriptas, desde su próxima cuota
//   accion 'cancelar_todas'  → pasó el curso a pago único y quiere dejar de cobrarles
export const maxDuration = 26
export async function POST(req: NextRequest) {
  try {
    const { courseId, accion, accessToken } = await req.json().catch(() => ({}))
    const user = await usuarioDeToken(accessToken)
    if (!user || !courseId) return NextResponse.json({ ok: false, mensaje: 'Tu sesión venció.' }, { status: 401 })
    const { data: curso } = await db().from('courses').select('id, user_id, precio').eq('id', courseId).maybeSingle()
    if (!curso || curso.user_id !== user.id) return NextResponse.json({ ok: false }, { status: 403 })

    if (accion === 'contar') return NextResponse.json({ ok: true, suscriptas: await contarSuscriptas(courseId) })
    if (accion === 'aplicar_precio') {
      // el precio sale siempre de la base (el que quedó guardado), nunca de lo que manda el navegador
      const monto = Number(curso.precio)
      if (!(monto > 0)) return NextResponse.json({ ok: false, mensaje: 'El precio tiene que ser mayor a 0.' }, { status: 400 })
      return NextResponse.json({ ok: true, ...(await cambiarMontoDeSuscriptas(courseId, monto)) })
    }
    if (accion === 'cancelar_todas') return NextResponse.json({ ok: true, ...(await cancelarTodasDelCurso(courseId)) })
    return NextResponse.json({ ok: false }, { status: 400 })
  } catch (err) {
    console.error('cambio-curso:', err)
    return NextResponse.json({ ok: false, mensaje: 'Hubo un error. Probá de nuevo.' }, { status: 500 })
  }
}