import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { tieneAccesoCurso } from '@/lib/acceso'
import { enviarAviso } from '@/lib/push'
import { ventasAbiertas } from '@/lib/planServidor'
import { revisarCupon, reservarUso, liberarUso, precioConDescuento, normalizarCodigo } from '@/lib/cupones'

// Crea o actualiza la inscripción de la alumna, siempre como "pendiente de pago".
// Antes se creaba desde el navegador, eligiendo el estado (alguien podía inscribirse como "activa" sin pagar).
// El acceso lo dan solo: la confirmación del pago de Mercado Pago, la terapeuta a mano, o la inscripción gratis.
export async function POST(req: NextRequest) {
  try {
    const { courseId, accessToken, metodo, cupon } = await req.json().catch(() => ({}))
    if (!courseId || !accessToken) return NextResponse.json({ ok: false }, { status: 400 })
    const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: { user } } = await s.auth.getUser(String(accessToken))
    if (!user) return NextResponse.json({ ok: false, mensaje: 'Tu sesión venció. Volvé a entrar.' }, { status: 401 })

    const [{ data: persona }, { data: curso }] = await Promise.all([
      s.from('persons').select('id, nombre, apellido').eq('auth_user_id', user.id).maybeSingle(),
      s.from('courses').select('id, titulo, user_id, modalidad, estado, precio, tipo').eq('id', courseId).maybeSingle(),
    ])
    if (!persona) return NextResponse.json({ ok: false, mensaje: 'No encontramos tus datos. Recargá la página.' }, { status: 404 })
    if (!curso || curso.estado !== 'publicado') return NextResponse.json({ ok: false, mensaje: 'Este curso no está disponible.' }, { status: 404 })

    const { data: previa } = await s.from('enrollments').select('*')
      .eq('course_id', courseId).eq('person_id', persona.id).maybeSingle()
    // la terapeuta le quitó el acceso: no puede volver a inscribirse sola (solo la terapeuta la reactiva)
    if (previa && previa.estado === 'baja') {
      return NextResponse.json({ ok: false, accesoQuitado: true, mensaje: 'Tu acceso a este curso terminó. Si querés volver, escribile a la terapeuta.' }, { status: 403 })
    }
    // si ya tiene el curso, no tocamos nada (si no, le sacaríamos el acceso)
    if (previa && tieneAccesoCurso({ estado: previa.estado, modalidad: previa.modalidad, fecha_vencimiento: previa.fecha_vencimiento })) {
      return NextResponse.json({ ok: true, tieneAcceso: true, inscripcion: previa })
    }
    // alumna nueva y la terapeuta no tiene Premium (bajó a Básico o se le venció): sus cursos y descargables están en pausa.
    // Las alumnas que ya estaban siguen (renovaciones incluidas).
    const yaEraAlumna = !!previa && (previa.estado === 'activa' || !!previa.fecha_vencimiento)
    if (!yaEraAlumna && !(await ventasAbiertas(curso.user_id))) {
      return NextResponse.json({ ok: false, pausado: true, mensaje: 'No disponible por ahora.' }, { status: 400 })
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

    // cómo eligió pagar: 'usd' (solo si el curso tiene precio en dólares). Va aparte: si la columna no existiera, la inscripción ya quedó.
    let precioUSD = 0
    if (metodo === 'usd') {
      const { data: c } = await s.from('courses').select('precio_usd').eq('id', curso.id).maybeSingle()
      precioUSD = Number((c as any)?.precio_usd) || 0
      if (precioUSD > 0) await s.from('enrollments').update({ metodo_pago: 'usd' }).eq('id', data.id)
    } else {
      try { await s.from('enrollments').update({ metodo_pago: null }).eq('id', data.id).eq('metodo_pago', 'usd') } catch {}
    }

    // ── cupón ── el descuento lo calcula el servidor y queda guardado en la inscripción (Mercado Pago cobra ese número)
    const codigo = normalizarCodigo(cupon)
    const usoPrevio = (previa as any)?.cupon_uso_id as string | null
    let cuponAplicado: any = null
    if (yaEraAlumna) {
      // renovación: "todos los meses" mantiene el descuento sobre el precio de hoy; "solo el primer mes", precio normal
      const sigue = (previa as any)?.cupon_meses === 'todos' && curso.modalidad === 'suscripcion' && (previa as any)?.cupon_porcentaje
      const acordado = sigue ? precioConDescuento(Number(curso.precio), Number((previa as any).cupon_porcentaje)) : null
      await s.from('enrollments').update({ precio_acordado: acordado }).eq('id', data.id)
      if (codigo && !sigue) {
        return NextResponse.json({ ok: true, tieneAcceso: false, inscripcion: { ...data, precio_acordado: acordado }, cuponError: 'Los cupones son para la primera compra.' })
      }
    } else if (codigo) {
      const precioUsdCurso = metodo === 'usd' ? precioUSD : 0
      const r = await revisarCupon(codigo, { tipo: 'curso', id: curso.id, terapeutaId: curso.user_id }, 'p:' + persona.id, data.id)
      if (!r.ok) {
        await limpiarCupon(s, data.id, usoPrevio)
        return NextResponse.json({ ok: false, cuponError: r.mensaje, mensaje: r.mensaje }, { status: 400 })
      }
      const enUSD = precioUsdCurso > 0
      const original = enUSD ? precioUsdCurso : Number(curso.precio)
      const final = precioConDescuento(original, r.porcentaje, enUSD ? 'USD' : 'ARS')
      // Mercado Pago: la reserva dura 2 horas. Transferencia o dólares: 3 días (la terapeuta confirma).
      const horas = metodo === 'mercadopago' || !metodo ? 2 : 72
      const u = await reservarUso(r.cupon, 'curso', data.id, 'p:' + persona.id, original, final, enUSD ? 'USD' : 'ARS', horas)
      if (!u.ok) {
        await limpiarCupon(s, data.id, usoPrevio)
        return NextResponse.json({ ok: false, cuponError: u.mensaje, mensaje: u.mensaje }, { status: 400 })
      }
      const cambios: any = {
        cupon_uso_id: u.uso, cupon_codigo: r.cupon.codigo, cupon_porcentaje: r.porcentaje,
        cupon_meses: curso.modalidad === 'suscripcion' ? r.cupon.meses : null,
        precio_acordado: enUSD ? null : final, precio_acordado_usd: enUSD ? final : null,
      }
      await s.from('enrollments').update(cambios).eq('id', data.id)
      cuponAplicado = { codigo: r.cupon.codigo, porcentaje: r.porcentaje, precio: original, precioFinal: final, moneda: enUSD ? 'USD' : 'ARS' }
    } else if (usoPrevio) {
      // sacó el cupón: precio normal y se libera el uso
      await limpiarCupon(s, data.id, usoPrevio)
    }

    // aviso a la terapeuta (solo la primera vez, no en cada reintento)
    if (!previa || previa.estado !== 'pendiente_pago') {
      const nombre = `${persona.nombre || ''} ${persona.apellido || ''}`.trim() || 'Alguien'
      await enviarAviso(curso.user_id,
        previa ? '✦ Renovación de curso en Luma' : '✦ Nueva compra en Luma',
        `${nombre} ${previa ? 'quiere renovar' : 'se inscribió a'} ${curso.titulo}${precioUSD > 0 ? ` · avisó que pagó USD ${cuponAplicado?.moneda === 'USD' ? cuponAplicado.precioFinal : precioUSD}: confirmalo en Alumnas` : ''}${cuponAplicado ? ` · con cupón ${cuponAplicado.codigo}` : ''}`).catch(() => {})
    }
    return NextResponse.json({ ok: true, tieneAcceso: false, inscripcion: data, cupon: cuponAplicado })
  } catch (err) {
    console.error('inscribir:', err)
    return NextResponse.json({ ok: false, mensaje: 'Hubo un error. Intentá de nuevo.' }, { status: 500 })
  }
}

async function limpiarCupon(s: any, enrollmentId: string, usoPrevio: string | null) {
  if (!usoPrevio) return
  await liberarUso(usoPrevio)
  await s.from('enrollments').update({ cupon_uso_id: null, cupon_codigo: null, cupon_porcentaje: null, cupon_meses: null, precio_acordado: null, precio_acordado_usd: null })
    .eq('id', enrollmentId).eq('cupon_uso_id', usoPrevio)
}
