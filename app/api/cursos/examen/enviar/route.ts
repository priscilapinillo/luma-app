import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { tieneAccesoCurso } from '@/lib/acceso'

// La alumna envía su examen. La nota la calcula el servidor y el certificado lo crea el servidor.
// Antes las dos cosas se hacían en el navegador: alguien podía sacarse un certificado sin aprobar.
export async function POST(req: NextRequest) {
  try {
    const { examId, enrollmentId, respuestas, accessToken } = await req.json().catch(() => ({}))
    if (!examId || !enrollmentId || !accessToken || typeof respuestas !== 'object' || !respuestas) {
      return NextResponse.json({ ok: false, mensaje: 'Faltan datos.' }, { status: 400 })
    }
    const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: { user } } = await s.auth.getUser(String(accessToken))
    if (!user) return NextResponse.json({ ok: false, mensaje: 'Tu sesión venció. Volvé a entrar.' }, { status: 401 })

    // la inscripción tiene que ser de quien está logueada, con acceso vigente, y del curso de ese examen
    const [{ data: insc }, { data: examen }, { data: persona }] = await Promise.all([
      s.from('enrollments').select('id, course_id, person_id, terapeuta_id, estado, modalidad, fecha_vencimiento').eq('id', enrollmentId).maybeSingle(),
      s.from('exams').select('id, course_id, puntaje_minimo, max_intentos').eq('id', examId).maybeSingle(),
      s.from('persons').select('id').eq('auth_user_id', user.id).maybeSingle(),
    ])
    if (!insc || !examen || !persona || insc.person_id !== persona.id || insc.course_id !== examen.course_id) {
      return NextResponse.json({ ok: false, mensaje: 'No autorizado.' }, { status: 403 })
    }
    if (!tieneAccesoCurso(insc)) return NextResponse.json({ ok: false, mensaje: 'Tu acceso al curso no está activo.' }, { status: 403 })

    // intentos
    const { count: usados } = await s.from('exam_attempts').select('id', { count: 'exact', head: true }).eq('exam_id', examId).eq('enrollment_id', enrollmentId)
    if (examen.max_intentos && (usados || 0) >= Number(examen.max_intentos)) {
      return NextResponse.json({ ok: false, mensaje: 'Ya usaste todos tus intentos.' }, { status: 400 })
    }

    // nota: solo cuentan las preguntas de este examen
    const { data: preguntas } = await s.from('exam_questions').select('id').eq('exam_id', examId)
    const ids = (preguntas || []).map((p: any) => p.id)
    const { data: correctas } = ids.length
      ? await s.from('exam_options').select('id, question_id').in('question_id', ids).eq('es_correcta', true)
      : { data: [] as any[] }
    let bien = 0
    for (const pid of ids) {
      const elegida = String((respuestas as Record<string, unknown>)[pid] || '')
      if (elegida && (correctas || []).some((o: any) => o.question_id === pid && o.id === elegida)) bien++
    }
    const puntaje = ids.length ? Math.round((bien / ids.length) * 100) : 0
    const aprobado = puntaje >= Number(examen.puntaje_minimo || 0)

    const respuestasLimpias: Record<string, string> = {}
    for (const pid of ids) if ((respuestas as any)[pid]) respuestasLimpias[pid] = String((respuestas as any)[pid])
    const { error: errIntento } = await s.from('exam_attempts').insert({
      exam_id: examId, enrollment_id: enrollmentId, respuestas: respuestasLimpias, puntaje_obtenido: puntaje, aprobado,
    })
    if (errIntento) { console.error('examen intento:', errIntento); return NextResponse.json({ ok: false, mensaje: 'No se pudo guardar tu examen. Probá de nuevo.' }, { status: 500 }) }

    // certificado: uno solo por inscripción, solo si aprobó
    let codigo: string | null = null
    if (aprobado) {
      const { data: previo } = await s.from('certificates').select('codigo_unico').eq('enrollment_id', enrollmentId).maybeSingle()
      if (previo) codigo = previo.codigo_unico
      else {
        for (let i = 0; i < 3 && !codigo; i++) {
          const nuevo = 'LUMA-' + Array.from(crypto.getRandomValues(new Uint8Array(5))).map(b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('')
          const { data: cert, error } = await s.from('certificates').insert({
            enrollment_id: enrollmentId, course_id: insc.course_id, person_id: persona.id, terapeuta_id: insc.terapeuta_id, codigo_unico: nuevo,
          }).select('codigo_unico').single()
          if (!error && cert) codigo = cert.codigo_unico
          else if (error && error.code !== '23505') { console.error('certificado:', error); break }
        }
      }
    }
    return NextResponse.json({ ok: true, puntaje, aprobado, certificado: codigo })
  } catch (err) {
    console.error('examen/enviar:', err)
    return NextResponse.json({ ok: false, mensaje: 'Hubo un error. Probá de nuevo.' }, { status: 500 })
  }
}