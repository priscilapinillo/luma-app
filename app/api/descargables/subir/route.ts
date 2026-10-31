import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/planLuma'
import { usuarioDelPedido, muyPronto } from '@/lib/sesionServidor'
import { nivelServidor } from '@/lib/planServidor'
import { BALDE, MB, MAX_ARCHIVO, MAX_ARCHIVOS, LUMA_TOPE, PERMITIDOS, extension, nombreLimpio, espacioDe, espacioLuma } from '@/lib/descargables'
import { alerta } from '@/lib/pagosLuma'

// La terapeuta pide permiso para subir un archivo a su descargable.
// El servidor revisa TODO antes de dar el link de subida (vale una sola vez, para esa carpeta):
// que el descargable sea suyo, que tenga Premium, el tipo de archivo, el tamaño, la cantidad y el espacio.
const UUID = /^[0-9a-f-]{36}$/i
const mb = (n: number) => Math.round(n / MB * 10) / 10

export async function POST(req: NextRequest) {
  try {
    const user = await usuarioDelPedido(req)
    if (!user) return NextResponse.json({ ok: false, mensaje: 'Tu sesión venció. Volvé a entrar.' }, { status: 401 })
    const b = await req.json().catch(() => ({}))
    const courseId = String(b.courseId || '')
    const nombre = nombreLimpio(b.nombre)
    const tamano = Math.floor(Number(b.tamano) || 0)
    const reemplaza = b.reemplaza && UUID.test(String(b.reemplaza)) ? String(b.reemplaza) : null
    if (!UUID.test(courseId) || !(tamano > 0)) return NextResponse.json({ ok: false, mensaje: 'Faltan datos del archivo.' }, { status: 400 })
    if (muyPronto(`subir:${user.id}:${nombre}:${tamano}`, 1500)) return NextResponse.json({ ok: false, mensaje: 'Ya lo estamos subiendo.' }, { status: 429 })

    const s = db()
    const { data: curso } = await s.from('courses').select('id, user_id, tipo').eq('id', courseId).maybeSingle()
    if (!curso || curso.user_id !== user.id || curso.tipo !== 'descargable') return NextResponse.json({ ok: false, mensaje: 'No encontramos este descargable.' }, { status: 403 })
    if ((await nivelServidor(user.id)) !== 'premium') {
      return NextResponse.json({ ok: false, premium: true, mensaje: 'Subir archivos es parte de Luma Premium.' }, { status: 403 })
    }
    const ext = extension(nombre)
    if (!PERMITIDOS[ext]) {
      return NextResponse.json({ ok: false, mensaje: ext === 'mp4' || ext === 'mov'
        ? 'Los videos no se suben como archivo: pegá el link de YouTube en «Video de presentación».'
        : 'Este tipo de archivo no se puede vender por seguridad. Probá con PDF, EPUB, audio, imagen, Word, Excel, PowerPoint o ZIP.' }, { status: 400 })
    }
    if (tamano > MAX_ARCHIVO) return NextResponse.json({ ok: false, mensaje: `Este archivo pesa ${mb(tamano)} MB. El máximo es ${mb(MAX_ARCHIVO)} MB.` }, { status: 400 })

    // cantidad (el que se reemplaza no cuenta)
    const { data: actuales } = await s.from('descargable_archivos').select('id, tamano, estado, created_at').eq('course_id', courseId)
    const hace2h = new Date(Date.now() - 2 * 3600000).toISOString()
    const vivos = (actuales || []).filter((a: any) => (a.estado === 'listo' || a.created_at > hace2h) && a.id !== reemplaza)
    if (reemplaza && !(actuales || []).some((a: any) => a.id === reemplaza && a.estado === 'listo')) {
      return NextResponse.json({ ok: false, mensaje: 'El archivo que querés reemplazar ya no está. Recargá la página.' }, { status: 400 })
    }
    if (vivos.length >= MAX_ARCHIVOS) return NextResponse.json({ ok: false, mensaje: `Cada descargable puede tener hasta ${MAX_ARCHIVOS} archivos.` }, { status: 400 })

    // espacio de la terapeuta (si reemplaza, el viejo se libera al confirmar: se descuenta ya)
    const esp = await espacioDe(user.id)
    const viejo = reemplaza ? Number((actuales || []).find((a: any) => a.id === reemplaza)?.tamano) || 0 : 0
    if (tamano > esp.libre + viejo) {
      return NextResponse.json({ ok: false, mensaje: `Te quedan ${mb(esp.libre + viejo)} MB de ${mb(esp.total)} MB. Borrá algún archivo o subí uno más liviano.` }, { status: 400 })
    }
    // espacio de todo Luma (giga gratis de Supabase)
    const totalLuma = await espacioLuma()
    if (totalLuma + tamano > LUMA_TOPE) {
      await alerta('espacio_lleno', 'El espacio de archivos de Luma está casi lleno', { usado_mb: mb(totalLuma), intento_mb: mb(tamano), terapeuta: user.id }, user.id).catch(() => {})
      return NextResponse.json({ ok: false, mensaje: 'Las subidas están pausadas por un ratito mientras ampliamos el espacio. Probá más tarde.' }, { status: 503 })
    }

    const path = `${user.id}/${courseId}/${crypto.randomUUID()}.${ext}`
    const { data: fila, error } = await s.from('descargable_archivos').insert({
      course_id: courseId, terapeuta_id: user.id, path, nombre, tamano, mime: PERMITIDOS[ext], estado: 'subiendo',
      orden: vivos.length,
    }).select('id').single()
    if (error || !fila) { console.error('descargables/subir:', error); return NextResponse.json({ ok: false, mensaje: 'No se pudo preparar la subida. Probá de nuevo.' }, { status: 500 }) }
    const { data: firmado, error: errF } = await s.storage.from(BALDE).createSignedUploadUrl(path)
    if (errF || !firmado) {
      await s.from('descargable_archivos').delete().eq('id', fila.id)
      console.error('descargables/subir firma:', errF)
      return NextResponse.json({ ok: false, mensaje: 'No se pudo preparar la subida. Probá de nuevo.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, archivoId: fila.id, signedUrl: firmado.signedUrl, token: firmado.token, path, reemplaza })
  } catch (e) {
    console.error('descargables/subir:', e)
    return NextResponse.json({ ok: false, mensaje: 'No se pudo preparar la subida. Probá de nuevo.' }, { status: 500 })
  }
}
