import { NextRequest, NextResponse } from 'next/server'
import { db, revisarSuscripcion } from '@/lib/suscripciones'

// Revisión automática (la llama la tarea programada de Netlify cada hora, con la clave secreta del servidor).
// Por si los avisos se pierden: anota cobros, aplica rechazos y días de gracia, cancela pendientes viejas.
// Revisa de a pocas por vez (las que más tiempo llevan sin revisarse), así nunca se pasa del tiempo límite.
export const maxDuration = 26
export async function POST(req: NextRequest) {
  const clave = (req.headers.get('authorization') || '').replace('Bearer ', '')
  if (!clave || clave !== process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  try {
    const hace6h = new Date(Date.now() - 6 * 3600000).toISOString()
    const { data: filas } = await db().from('enrollments').select('id')
      .in('suscripcion_estado', ['pendiente', 'esperando_cobro', 'activa', 'con_problemas', 'rechazada'])
      .or(`suscripcion_revisada_at.is.null,suscripcion_revisada_at.lt."${hace6h}"`)
      .order('suscripcion_revisada_at', { ascending: true, nullsFirst: true }).limit(6)
    let ok = 0
    for (const f of filas || []) { try { await revisarSuscripcion(f.id); ok++ } catch (e) { console.error('revisión de', f.id, e) } }
    return NextResponse.json({ ok: true, revisadas: ok })
  } catch (err) {
    console.error('revision-diaria:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}