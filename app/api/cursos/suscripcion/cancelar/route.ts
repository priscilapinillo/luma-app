import { NextRequest, NextResponse } from 'next/server'
import { cargarContexto, cancelarSuscripcion, esAlumna, esTerapeuta, usuarioDeToken, resumenParaPantalla } from '@/lib/suscripciones'

// Cancela la suscripción (la alumna desde su panel, o la terapeuta dueña del curso).
// La alumna conserva el acceso hasta la fecha que ya pagó.
export async function POST(req: NextRequest) {
  try {
    const { enrollmentId, accessToken } = await req.json().catch(() => ({}))
    const user = await usuarioDeToken(accessToken)
    if (!user || !enrollmentId) return NextResponse.json({ ok: false, mensaje: 'Tu sesión venció. Volvé a entrar.' }, { status: 401 })
    const ctx = await cargarContexto(String(enrollmentId))
    if (!ctx) return NextResponse.json({ ok: false, mensaje: 'No encontramos la inscripción.' }, { status: 404 })
    const quien = esAlumna(ctx, user.id) ? 'alumna' : esTerapeuta(ctx, user.id) ? 'terapeuta' : null
    if (!quien) return NextResponse.json({ ok: false, mensaje: 'No autorizado.' }, { status: 403 })
    const r = await cancelarSuscripcion(ctx, quien)
    if (!r.ok) return NextResponse.json(r, { status: 502 })
    const despues = await cargarContexto(String(enrollmentId))
    return NextResponse.json({ ok: true, ...(despues ? resumenParaPantalla(despues) : {}) })
  } catch (err) {
    console.error('suscripcion/cancelar:', err)
    return NextResponse.json({ ok: false, mensaje: 'Hubo un error. Probá de nuevo en unos minutos.' }, { status: 500 })
  }
}