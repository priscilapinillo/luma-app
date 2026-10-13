import { NextRequest, NextResponse } from 'next/server'
import { crearOReutilizar, usuarioDeToken } from '@/lib/suscripciones'

// La alumna toca "Suscribirme": crea la suscripción en Mercado Pago (o devuelve la que ya tiene).
export async function POST(req: NextRequest) {
  try {
    const { enrollmentId, accessToken } = await req.json().catch(() => ({}))
    const user = await usuarioDeToken(accessToken)
    if (!user) return NextResponse.json({ estado: 'no_autorizado', mensaje: 'Tu sesión venció. Volvé a entrar e intentá de nuevo.' }, { status: 401 })
    if (!enrollmentId) return NextResponse.json({ estado: 'error', mensaje: 'Faltan datos.' }, { status: 400 })
    const origen = req.headers.get('origin') || new URL(req.url).origin
    const r = await crearOReutilizar(String(enrollmentId), user.id, origen)
    return NextResponse.json(r)
  } catch (err) {
    console.error('suscripcion/crear:', err)
    return NextResponse.json({ estado: 'error', mensaje: 'Hubo un error. Probá de nuevo en unos minutos.' }, { status: 500 })
  }
}