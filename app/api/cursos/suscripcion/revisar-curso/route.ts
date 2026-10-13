import { NextRequest, NextResponse } from 'next/server'
import { db, revisarSuscripcion, usuarioDeToken } from '@/lib/suscripciones'

// "Tus alumnas" de la terapeuta: antes de mostrar la lista, se revisan en Mercado Pago las suscripciones del curso.
export const maxDuration = 26
export async function POST(req: NextRequest) {
  try {
    const { courseId, accessToken } = await req.json().catch(() => ({}))
    const user = await usuarioDeToken(accessToken)
    if (!user || !courseId) return NextResponse.json({ ok: false }, { status: 401 })
    const s = db()
    const { data: curso } = await s.from('courses').select('id, user_id').eq('id', courseId).maybeSingle()
    if (!curso || curso.user_id !== user.id) return NextResponse.json({ ok: false }, { status: 403 })
    // las que más tiempo llevan sin revisarse primero; como mucho 6 por vez para no hacer esperar
    const hace10min = new Date(Date.now() - 10 * 60000).toISOString()
    const { data: filas } = await s.from('enrollments').select('id, suscripcion_revisada_at')
      .eq('course_id', courseId).not('mp_preapproval_id', 'is', null)
      .in('suscripcion_estado', ['pendiente', 'esperando_cobro', 'activa', 'con_problemas', 'rechazada'])
      .or(`suscripcion_revisada_at.is.null,suscripcion_revisada_at.lt."${hace10min}"`)
      .order('suscripcion_revisada_at', { ascending: true, nullsFirst: true }).limit(6)
    for (const f of filas || []) await revisarSuscripcion(f.id)
    return NextResponse.json({ ok: true, revisadas: (filas || []).length })
  } catch (err) {
    console.error('revisar-curso:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}