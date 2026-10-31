import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/planLuma'
import { usuarioDelPedido } from '@/lib/sesionServidor'
import { BALDE } from '@/lib/descargables'

// La dueña borra un archivo de su descargable (con o sin Premium: borrar libera espacio).
// Si era el último archivo de un descargable publicado, se pasa a borrador para que nadie compre algo vacío.
const UUID = /^[0-9a-f-]{36}$/i

export async function POST(req: NextRequest) {
  try {
    const user = await usuarioDelPedido(req)
    if (!user) return NextResponse.json({ ok: false, mensaje: 'Tu sesión venció. Volvé a entrar.' }, { status: 401 })
    const b = await req.json().catch(() => ({}))
    const archivoId = String(b.archivoId || '')
    if (!UUID.test(archivoId)) return NextResponse.json({ ok: false, mensaje: 'Faltan datos.' }, { status: 400 })
    const s = db()
    const { data: fila } = await s.from('descargable_archivos').select('*').eq('id', archivoId).maybeSingle()
    if (!fila) return NextResponse.json({ ok: true, yaNoEstaba: true })
    if (fila.terapeuta_id !== user.id) return NextResponse.json({ ok: false, mensaje: 'No encontramos este archivo.' }, { status: 403 })

    const { error: errSt } = await s.storage.from(BALDE).remove([fila.path])
    if (errSt) console.error('descargables/borrar (archivo):', errSt) // igual se quita de la lista: si quedó, la limpieza lo borra
    await s.from('descargable_archivos').delete().eq('id', fila.id)

    const { count } = await s.from('descargable_archivos').select('id', { count: 'exact', head: true }).eq('course_id', fila.course_id).eq('estado', 'listo')
    let pasoABorrador = false
    if (!count) {
      const { data: c } = await s.from('courses').update({ estado: 'borrador' }).eq('id', fila.course_id).eq('estado', 'publicado').select('id')
      pasoABorrador = !!c?.length
    }
    return NextResponse.json({ ok: true, pasoABorrador })
  } catch (e) {
    console.error('descargables/borrar:', e)
    return NextResponse.json({ ok: false, mensaje: 'No se pudo borrar. Probá de nuevo.' }, { status: 500 })
  }
}
