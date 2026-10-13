import { NextRequest, NextResponse } from 'next/server'
import { enviarAviso, supabaseServidor } from '@/lib/push'

// Avisos que disparan las páginas públicas (reservas y compras de cursos).
// El navegador solo dice "pasó esto con tal reserva o tal curso": el texto del aviso y a quién
// le llega se arman acá, con los datos reales de la base. Así nadie puede mandar avisos falsos.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VENTANA_MS = 15 * 60 * 1000

// freno contra repetidos (si el mismo aviso llega dos veces en 10 minutos, se manda una sola vez)
const recientes = new Map<string, number>()
function yaAvisado(clave: string) {
  const ahora = Date.now()
  for (const [k, t] of recientes) if (ahora - t > 10 * 60 * 1000) recientes.delete(k)
  if (recientes.has(clave)) return true
  recientes.set(clave, ahora)
  return false
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const supabase = supabaseServidor()

    // ── reserva desde la página pública
    if (body?.tipo === 'reserva') {
      const sessionId = String(body.sessionId || '')
      if (!UUID.test(sessionId)) return NextResponse.json({ ok: false }, { status: 400 })
      const { data: b } = await supabase
        .from('public_bookings').select('*').eq('session_id', sessionId).maybeSingle()
      if (!b || !b.therapist_id) return NextResponse.json({ ok: false }, { status: 404 })
      // solo reservas recién hechas (un aviso viejo no se puede volver a disparar)
      if (b.created_at && Date.now() - new Date(b.created_at).getTime() > VENTANA_MS) {
        return NextResponse.json({ ok: false, motivo: 'vieja' })
      }
      if (yaAvisado('reserva:' + sessionId)) return NextResponse.json({ ok: true, repetido: true })
      const hora = String(b.hora || '').slice(0, 5)
      const cuerpo = `${b.patient_name || 'Alguien'} agendó ${b.service_name || 'una sesión'}${hora && hora !== '00:00' ? ` para el ${b.fecha} a las ${hora}hs` : ''}`
      const enviados = await enviarAviso(b.therapist_id, '✦ Nueva reserva en Luma', cuerpo)
      return NextResponse.json({ ok: enviados > 0 })
    }

    // ── compra, renovación o inscripción gratis a un curso (la alumna está logueada)
    if (body?.tipo === 'curso') {
      const courseId = String(body.courseId || '')
      const evento = ['compra', 'renovacion', 'gratis'].includes(body.evento) ? body.evento : 'compra'
      if (!UUID.test(courseId) || !body.accessToken) return NextResponse.json({ ok: false }, { status: 400 })
      const { data: { user } } = await supabase.auth.getUser(String(body.accessToken))
      if (!user) return NextResponse.json({ ok: false }, { status: 401 })
      const [{ data: persona }, { data: curso }] = await Promise.all([
        supabase.from('persons').select('*').eq('auth_user_id', user.id).maybeSingle(),
        supabase.from('courses').select('id, titulo, user_id').eq('id', courseId).maybeSingle(),
      ])
      if (!persona || !curso) return NextResponse.json({ ok: false }, { status: 404 })
      // tiene que existir la inscripción de esa alumna a ese curso
      const { data: insc } = await supabase
        .from('enrollments').select('id').eq('course_id', courseId).eq('person_id', persona.id).maybeSingle()
      if (!insc) return NextResponse.json({ ok: false }, { status: 404 })
      if (yaAvisado(`curso:${courseId}:${persona.id}:${evento}`)) return NextResponse.json({ ok: true, repetido: true })
      const nombre = String(persona.nombre || persona.nombre_completo || persona.name || '').trim() || 'Alguien'
      const titulo = evento === 'renovacion' ? '✦ Renovación de curso en Luma' : evento === 'gratis' ? '✦ Nueva alumna en Luma' : '✦ Nueva compra en Luma'
      const cuerpo = evento === 'renovacion' ? `${nombre} quiere renovar ${curso.titulo}`
        : evento === 'gratis' ? `${nombre} se inscribió gratis a ${curso.titulo}`
        : `${nombre} se inscribió a ${curso.titulo}`
      const enviados = await enviarAviso(curso.user_id, titulo, cuerpo)
      return NextResponse.json({ ok: enviados > 0 })
    }

    return NextResponse.json({ ok: false }, { status: 400 })
  } catch (err) {
    console.error('Error en aviso:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}