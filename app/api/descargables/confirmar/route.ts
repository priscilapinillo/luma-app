import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/planLuma'
import { usuarioDelPedido } from '@/lib/sesionServidor'
import { BALDE, MB, MAX_ARCHIVO, extension, firmaValida, espacioDe } from '@/lib/descargables'

// Terminó la subida: el servidor mira el archivo DE VERDAD (tamaño real y primeros bytes) antes de dejarlo a la venta.
// Si algo no cierra, el archivo se borra y no cuenta.
const UUID = /^[0-9a-f-]{36}$/i

export async function POST(req: NextRequest) {
  const s = db()
  let fila: any = null
  try {
    const user = await usuarioDelPedido(req)
    if (!user) return NextResponse.json({ ok: false, mensaje: 'Tu sesión venció. Volvé a entrar.' }, { status: 401 })
    const b = await req.json().catch(() => ({}))
    const archivoId = String(b.archivoId || '')
    const reemplaza = b.reemplaza && UUID.test(String(b.reemplaza)) ? String(b.reemplaza) : null
    if (!UUID.test(archivoId)) return NextResponse.json({ ok: false, mensaje: 'Faltan datos.' }, { status: 400 })
    const { data } = await s.from('descargable_archivos').select('*').eq('id', archivoId).maybeSingle()
    fila = data
    if (!fila || fila.terapeuta_id !== user.id) { fila = null; return NextResponse.json({ ok: false, mensaje: 'No encontramos este archivo.' }, { status: 403 }) }
    if (fila.estado === 'listo') return NextResponse.json({ ok: true, archivo: limpio(fila) })

    const info: any = await s.storage.from(BALDE).info(fila.path).then(r => r.data).catch(() => null)
    const real = Number(info?.size ?? info?.metadata?.size ?? 0)
    if (!(real > 0)) return rechazar(s, fila, 'La subida no terminó. Probá de nuevo.')
    if (real > MAX_ARCHIVO) return rechazar(s, fila, `Este archivo pesa ${Math.round(real / MB)} MB. El máximo es ${MAX_ARCHIVO / MB} MB.`)

    // primeros bytes: que sea lo que dice ser (un programa con la extensión cambiada no pasa)
    const { data: link } = await s.storage.from(BALDE).createSignedUrl(fila.path, 60)
    let cabecera = new Uint8Array()
    if (link?.signedUrl) {
      const r = await fetch(link.signedUrl, { headers: { Range: 'bytes=0-31' }, cache: 'no-store' }).catch(() => null)
      if (r && (r.ok || r.status === 206)) cabecera = new Uint8Array(await r.arrayBuffer()).slice(0, 32)
    }
    if (!firmaValida(extension(fila.nombre), cabecera)) return rechazar(s, fila, 'Este archivo no parece ser lo que dice su nombre. Por seguridad no se puede subir.')

    // espacio real (por si dos subidas a la vez se pasaron, o el navegador dijo otro tamaño)
    await s.from('descargable_archivos').update({ tamano: real }).eq('id', fila.id)
    const esp = await espacioDe(user.id)
    let viejo: any = null
    if (reemplaza) {
      const { data: v } = await s.from('descargable_archivos').select('*').eq('id', reemplaza).eq('course_id', fila.course_id).maybeSingle()
      viejo = v
    }
    if (esp.usado - (viejo ? Number(viejo.tamano) || 0 : 0) > esp.total) {
      return rechazar(s, fila, `No te alcanza el espacio: tenés ${Math.round(esp.total / MB)} MB en total. Borrá algún archivo o subí uno más liviano.`)
    }

    const cambios: any = { estado: 'listo', tamano: real }
    if (viejo) { cambios.es_bonus = viejo.es_bonus; cambios.bonus_valor = viejo.bonus_valor; cambios.orden = viejo.orden }
    await s.from('descargable_archivos').update(cambios).eq('id', fila.id)
    if (viejo) {
      // reemplazo: quienes compraron bajan la versión nueva; el archivo viejo se borra y libera su espacio
      await s.storage.from(BALDE).remove([viejo.path]).catch(() => null)
      await s.from('descargable_archivos').delete().eq('id', viejo.id)
    }
    return NextResponse.json({ ok: true, archivo: limpio({ ...fila, ...cambios }) })
  } catch (e) {
    console.error('descargables/confirmar:', e)
    return NextResponse.json({ ok: false, mensaje: 'No pudimos revisar el archivo. Probá de nuevo.' }, { status: 500 })
  }
}

function limpio(f: any) {
  return { id: f.id, course_id: f.course_id, nombre: f.nombre, tamano: Number(f.tamano) || 0, mime: f.mime, es_bonus: !!f.es_bonus, bonus_valor: f.bonus_valor, orden: f.orden, estado: f.estado }
}

async function rechazar(s: any, fila: any, mensaje: string) {
  await s.storage.from(BALDE).remove([fila.path]).catch(() => null)
  await s.from('descargable_archivos').delete().eq('id', fila.id)
  return NextResponse.json({ ok: false, mensaje }, { status: 400 })
}
