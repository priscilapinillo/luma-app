import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/planLuma'
import { usuarioDelPedido, muyPronto } from '@/lib/sesionServidor'
import { nivelServidor } from '@/lib/planServidor'
import { vistaPrevia } from '@/lib/vistaPrevia'

// Vista previa de un link pegado en el Altar: título e imagen, una sola vez. Tope: 60 por hora por cuenta.
const TOPE_HORA = 60

export async function POST(req: NextRequest) {
  try {
    const user = await usuarioDelPedido(req)
    if (!user) return NextResponse.json({ ok: false, mensaje: 'Entrá a tu cuenta de nuevo.' }, { status: 401 })
    const b = await req.json().catch(() => ({}))
    const url = String(b.url || '').trim().slice(0, 2000)
    if (!/^https?:\/\//i.test(url)) return NextResponse.json({ ok: false, mensaje: 'Ese link no parece válido.' }, { status: 400 })
    if (muyPronto(`altar-link:${user.id}`, 700)) return NextResponse.json({ ok: false, url, mensaje: 'Un segundito…' }, { status: 429 })
    if ((await nivelServidor(user.id, { verificar: false })) === 'sin_acceso') return NextResponse.json({ ok: false, url, mensaje: 'Tu plan venció: renovalo para seguir sumando ideas.' }, { status: 403 })

    const s = db()
    const desde = new Date(Date.now() - 3600000).toISOString()
    const { count } = await s.from('altar_links_log').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', desde)
    if ((count || 0) >= TOPE_HORA) return NextResponse.json({ ok: false, url, mensaje: 'Pegaste muchos links seguidos: el link queda, la vista previa vuelve en un rato.' }, { status: 429 })
    await s.from('altar_links_log').insert({ user_id: user.id })

    const v = await vistaPrevia(url)
    if (!v.ok) {
      const mensaje = v.motivo === 'interna' || v.motivo === 'protocolo' || v.motivo === 'puerto' || v.motivo === 'credenciales'
        ? 'Ese link no se puede abrir desde Luma.' : 'No pudimos leer la vista previa: el link queda igual.'
      return NextResponse.json({ ok: false, url: v.url, sitio: v.sitio, titulo: '', img: null, mensaje })
    }
    return NextResponse.json({ ok: true, url: v.url, titulo: v.titulo, img: v.img, sitio: v.sitio })
  } catch (e) {
    console.error('altar/link:', e)
    return NextResponse.json({ ok: false, mensaje: 'No pudimos leer la vista previa: el link queda igual.' }, { status: 500 })
  }
}
