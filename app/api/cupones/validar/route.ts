import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/planLuma'
import { revisarCupon, precioConDescuento, huellaDe, demasiadosIntentos, mensajeCupon, normalizarCodigo } from '@/lib/cupones'

// La compradora escribe un código (o llega con ?cupon=): se muestra el precio con descuento. NO reserva nada.
// La terapeuta sale SIEMPRE del curso o del servicio (nunca de lo que mande el navegador).
const UUID = /^[0-9a-f-]{36}$/i

export async function POST(req: NextRequest) {
  try {
    const b = await req.json().catch(() => ({}))
    const tipo = b.tipo === 'sesion' ? 'sesion' : 'curso'
    const id = String(b.id || '')
    const codigo = normalizarCodigo(b.codigo)
    if (!UUID.test(id) || codigo.length < 3) return NextResponse.json({ ok: false, mensaje: mensajeCupon('no_es_aca', tipo) }, { status: 400 })
    if (await demasiadosIntentos(huellaDe(req.headers))) {
      return NextResponse.json({ ok: false, mensaje: mensajeCupon('muchos_intentos', tipo) }, { status: 429 })
    }
    const s = db()
    let terapeutaId = '', precio = 0, precioUsd = 0, mensual = false
    if (tipo === 'curso') {
      const { data: c } = await s.from('courses').select('id, user_id, precio, estado, modalidad').eq('id', id).maybeSingle()
      if (!c || c.estado !== 'publicado') return NextResponse.json({ ok: false, mensaje: 'Este curso no está disponible.' }, { status: 404 })
      terapeutaId = c.user_id; precio = Number(c.precio) || 0; mensual = c.modalidad === 'suscripcion'
      try { const { data: u } = await s.from('courses').select('precio_usd').eq('id', id).maybeSingle(); precioUsd = Number((u as any)?.precio_usd) || 0 } catch {}
    } else {
      const { data: sv } = await s.from('services').select('id, user_id, precio_base, activo, precio_usd').eq('id', id).maybeSingle()
      if (!sv || !sv.activo) return NextResponse.json({ ok: false, mensaje: 'Este servicio no está disponible.' }, { status: 404 })
      terapeutaId = sv.user_id; precio = Number(sv.precio_base) || 0; precioUsd = Number((sv as any).precio_usd) || 0
    }
    if (!(precio > 0) && !(precioUsd > 0)) return NextResponse.json({ ok: false, mensaje: 'Esto es gratis: no hace falta cupón.' }, { status: 400 })

    // ¿quién es? (para "una vez por persona"): cuenta en cursos, WhatsApp en sesiones
    let quien: string | null = null
    if (tipo === 'curso' && typeof b.accessToken === 'string' && b.accessToken) {
      const { data: { user } } = await s.auth.getUser(b.accessToken)
      if (user) {
        const { data: p } = await s.from('persons').select('id').eq('auth_user_id', user.id).maybeSingle()
        if (p) quien = 'p:' + p.id
      }
    } else if (tipo === 'sesion') {
      const w = String(b.whatsapp || '').replace(/\D/g, '')
      if (w.length >= 6) quien = 'w:' + w
    }
    const r = await revisarCupon(codigo, { tipo, id, terapeutaId }, quien)
    if (!r.ok) return NextResponse.json({ ok: false, mensaje: r.mensaje })
    return NextResponse.json({
      ok: true,
      codigo: r.cupon.codigo,
      porcentaje: r.porcentaje,
      precio, precioFinal: precio > 0 ? precioConDescuento(precio, r.porcentaje) : 0,
      precioUsd, precioFinalUsd: precioUsd > 0 ? precioConDescuento(precioUsd, r.porcentaje, 'USD') : 0,
      meses: mensual ? r.cupon.meses : null,
    })
  } catch (e) {
    console.error('cupones/validar:', e)
    return NextResponse.json({ ok: false, mensaje: 'No pudimos revisar el cupón. Probá de nuevo.' }, { status: 500 })
  }
}
