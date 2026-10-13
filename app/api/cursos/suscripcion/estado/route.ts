import { NextRequest, NextResponse } from 'next/server'
import { revisarSuscripcion, cargarContexto, esAlumna, esTerapeuta, usuarioDeToken, resumenParaPantalla } from '@/lib/suscripciones'

// Le pregunta a Mercado Pago cómo está la suscripción y actualiza el acceso.
// La usan el checkout (al volver de Mercado Pago), el panel de la alumna y el aula.
export async function POST(req: NextRequest) {
  try {
    const { enrollmentId, accessToken } = await req.json().catch(() => ({}))
    const user = await usuarioDeToken(accessToken)
    if (!user || !enrollmentId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const previo = await cargarContexto(String(enrollmentId))
    if (!previo || !(esAlumna(previo, user.id) || esTerapeuta(previo, user.id))) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    const ctx = await revisarSuscripcion(String(enrollmentId))
    return NextResponse.json(resumenParaPantalla(ctx || previo))
  } catch (err) {
    console.error('suscripcion/estado:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}