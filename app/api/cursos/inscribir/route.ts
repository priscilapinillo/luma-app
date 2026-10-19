import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { tieneAccesoCurso, calcularAcceso, pareceDesactualizado } from '@/lib/acceso'
import { enviarAviso } from '@/lib/push'

// Crea o actualiza la inscripción de la alumna, siempre como "pendiente de pago".
// Antes se creaba desde el navegador, eligiendo el estado (alguien podía inscribirse como "activa" sin pagar).
// El acceso lo dan solo: la confirmación del pago de Mercado Pago, la terapeuta a mano, o la inscripción gratis.
export async function POST(req: NextRequest) {
  try {
    const { courseId, accessToken } = await req.json().catch(() => ({}))
    if (!courseId || !accessToken) return NextResponse.json({ ok: false }, { status: 400 })
    const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: { user } } = await s.auth.getUser(String(accessToken))
    if (!user) return NextResponse.json({ ok: false, mensaje: 'Tu sesión venció. Volvé a entrar.' }, { status: 401 })

    const [{ data: persona }, { data: curso }] = await Promise.all([
      s.from('persons').select('id, nombre, apellido').eq('auth_user_id', user.id).maybeSingle(),
      s.from('courses').select('id, titulo, user_id, modalidad, estado, precio').eq('id', courseId).maybeSingle(),
    ])
    if (!persona) return NextResponse.json({ ok: false, mensaje: 'No encontramos tus datos. Recargá la página.' }, { status: 404 })
    if (!curso || curso.estado !== 'publicado') return NextResponse.json({ ok: false, mensaje: 'Este curso no está disponible.' }, { status: 404 })

    const { data: previa } = await s.from('enrollments').select('*')
      .eq('course_id', courseId).eq('person_id', persona.id).maybeSingle()
    // si ya tiene el curso, no tocamos nada (si no, le sacaríamos el acceso)
    if (previa && tieneAccesoCurso({ estado: previa.estado, modalidad: previa.modalidad, fecha_vencimiento: previa.fecha_vencimiento })) {
      return NextResponse.json({ ok: true, tieneAcceso: true, inscripcion: previa })
    }
    // alumna nueva y a la terapeuta se le venció su plan de Luma: no entran alumnas nuevas (las que ya están siguen)
    if (!previa) {
      const { data: subT } = await s.from('subscriptions').select('status, trial_ends_at, current_period_ends_at, plan, mp_subscription_id').eq('user_id', curso.user_id).maybeSingle()
      if (subT && calcularAcceso(subT) === 'sin_acceso' && !pareceDesactualizado(subT)) {
        return NextResponse.json({ ok: false, mensaje: 'Las inscripciones a este curso están pausadas por el momento.' }, { status: 400 })
      }
    }
    const { data, error } = await s.from('enrollments').upsert({
      course_id: curso.id,
      person_id: persona.id,
      terapeuta_id: curso.user_id,
      modalidad: curso.modalidad,
      estado: 'pendiente_pago',
    }, { onConflict: 'course_id,person_id' }).select().single()
    if (error || !data) {
      console.error('inscribir:', error)
      return NextResponse.json({ ok: false, mensaje: 'Hubo un error al registrar tu inscripción. Intentá de nuevo.' }, { status: 500 })
    }

    // aviso a la terapeuta (solo la primera vez, no en cada reintento)
    if (!previa || previa.estado !== 'pendiente_pago') {
      const nombre = `${persona.nombre || ''} ${persona.apellido || ''}`.trim() || 'Alguien'
      await enviarAviso(curso.user_id,
        previa ? '✦ Renovación de curso en Luma' : '✦ Nueva compra en Luma',
        `${nombre} ${previa ? 'quiere renovar' : 'se inscribió a'} ${curso.titulo}`).catch(() => {})
    }
    return NextResponse.json({ ok: true, tieneAcceso: false, inscripcion: data })
  } catch (err) {
    console.error('inscribir:', err)
    return NextResponse.json({ ok: false, mensaje: 'Hubo un error. Intentá de nuevo.' }, { status: 500 })
  }
}