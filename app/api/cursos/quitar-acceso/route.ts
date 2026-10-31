import { NextRequest, NextResponse } from 'next/server'
import { cargarContexto, cancelarSuscripcion, esTerapeuta, usuarioDeToken, registrarEvento, db, ESTADOS_VIVOS } from '@/lib/suscripciones'

// "Quitar acceso ahora" (última opción): solo la terapeuta dueña del curso.
// 1) Si tiene cobro automático, primero se cancela (si Mercado Pago no responde, NO se corta el acceso:
//    nunca queda alguien cobrada y sin acceso).
// 2) Después la inscripción pasa a 'baja': el aula, las lecciones y el examen dejan de verse
//    (todas las reglas de acceso ya piden estado 'activa').
// No se manda ningún mail y no se borra nada (pagos, certificado, cuaderno). La terapeuta la puede reactivar.
export async function POST(req: NextRequest) {
  try {
    const { enrollmentId, accessToken } = await req.json().catch(() => ({}))
    const user = await usuarioDeToken(accessToken)
    if (!user || !enrollmentId) return NextResponse.json({ ok: false, mensaje: 'Tu sesión venció. Volvé a entrar.' }, { status: 401 })
    const ctx = await cargarContexto(String(enrollmentId))
    if (!ctx) return NextResponse.json({ ok: false, mensaje: 'No encontramos la inscripción.' }, { status: 404 })
    if (!esTerapeuta(ctx, user.id)) return NextResponse.json({ ok: false, mensaje: 'No autorizado.' }, { status: 403 })
    if (ctx.e.estado === 'baja') return NextResponse.json({ ok: true, yaEstaba: true })

    const tieneCobroVivo = !!ctx.e.suscripcion_estado && ESTADOS_VIVOS.includes(ctx.e.suscripcion_estado)
    if (tieneCobroVivo) {
      const r = await cancelarSuscripcion(ctx, 'terapeuta')
      if (!r.ok) {
        return NextResponse.json({ ok: false, mensaje: (r.mensaje || 'No se pudo cancelar el cobro automático.') + ' No le quitamos el acceso, así no queda cobrada sin poder entrar.' }, { status: 502 })
      }
    }

    const { error } = await db().from('enrollments').update({ estado: 'baja' }).eq('id', ctx.e.id)
    if (error) {
      console.error('quitar-acceso:', error)
      await registrarEvento(ctx.e.id, 'quitar_acceso_error', { error: error.message })
      return NextResponse.json({ ok: false, mensaje: tieneCobroVivo
        ? 'Cancelamos el cobro automático, pero no pudimos quitarle el acceso. Probá de nuevo en unos minutos.'
        : 'No pudimos quitarle el acceso. Probá de nuevo en unos minutos.' }, { status: 500 })
    }
    await registrarEvento(ctx.e.id, 'acceso_quitado', { quien: 'terapeuta', estado_anterior: ctx.e.estado })
    return NextResponse.json({ ok: true, cobroCancelado: tieneCobroVivo })
  } catch (err) {
    console.error('quitar-acceso:', err)
    return NextResponse.json({ ok: false, mensaje: 'Hubo un error. Probá de nuevo en unos minutos.' }, { status: 500 })
  }
}
