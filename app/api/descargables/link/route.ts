import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/planLuma'
import { usuarioDelPedido, muyPronto } from '@/lib/sesionServidor'
import { BALDE, LINK_DESCARGA_SEG, puedeDescargar } from '@/lib/descargables'

// "Descargar": arma en ese instante un link nuevo que vence en 5 minutos (la descarga arranca enseguida y termina igual).
// Solo para quien compró (con la compra activa) o la dueña. El acceso es para siempre: cada toque arma un link nuevo.
const UUID = /^[0-9a-f-]{36}$/i

export async function POST(req: NextRequest) {
  try {
    const user = await usuarioDelPedido(req)
    if (!user) return NextResponse.json({ ok: false, sinSesion: true, mensaje: 'Entrá a tu cuenta para descargarlo.' }, { status: 401 })
    const b = await req.json().catch(() => ({}))
    const archivoId = String(b.archivoId || '')
    if (!UUID.test(archivoId)) return NextResponse.json({ ok: false, mensaje: 'Faltan datos.' }, { status: 400 })
    if (muyPronto(`descarga:${user.id}:${archivoId}`, 800)) return NextResponse.json({ ok: false, mensaje: 'Ya se está preparando tu descarga.' }, { status: 429 })
    const s = db()
    const { data: fila } = await s.from('descargable_archivos').select('id, course_id, terapeuta_id, path, nombre, estado').eq('id', archivoId).maybeSingle()
    if (!fila || fila.estado !== 'listo') return NextResponse.json({ ok: false, mensaje: 'Este archivo ya no está disponible. Escribile a la terapeuta.' }, { status: 404 })
    const permiso = await puedeDescargar(user.id, fila.course_id)
    if (!permiso.ok) return NextResponse.json({ ok: false, motivo: permiso.motivo, mensaje: permiso.mensaje }, { status: 403 })

    const { data: link, error } = await s.storage.from(BALDE).createSignedUrl(fila.path, LINK_DESCARGA_SEG, { download: fila.nombre })
    if (error || !link?.signedUrl) {
      console.error('descargables/link:', error)
      return NextResponse.json({ ok: false, mensaje: 'No pudimos preparar tu descarga. Probá en un minuto.' }, { status: 503 })
    }
    if (!permiso.esDuena) {
      try { await s.from('descargas').insert({ archivo_id: fila.id, course_id: fila.course_id, terapeuta_id: fila.terapeuta_id, user_id: user.id }) } catch {}
    }
    return NextResponse.json({ ok: true, url: link.signedUrl, nombre: fila.nombre })
  } catch (e) {
    console.error('descargables/link:', e)
    return NextResponse.json({ ok: false, mensaje: 'No pudimos preparar tu descarga. Probá en un minuto.' }, { status: 500 })
  }
}
