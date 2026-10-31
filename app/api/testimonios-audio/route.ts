import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/planLuma'
import { usuarioDelPedido, muyPronto } from '@/lib/sesionServidor'
import { nivelServidor } from '@/lib/planServidor'
import { LIMITE_AUDIOS, MAX_SEGUNDOS } from '@/lib/audioTestimonio'

// Testimonios en audio de la página de reservas (etapa 8).
// Solo el servidor guarda: revisa la sesión, el plan, el límite, el permiso y que el archivo sea de verdad un MP3 chico.
export const dynamic = 'force-dynamic'
const BALDE = 'testimonios-audio'
const MAX_BYTES = 400 * 1024
const UUID = /^[0-9a-f-]{36}$/i

function esMp3(b: Uint8Array) {
  if (b.length < 4) return false
  if (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) return true // ID3
  return b[0] === 0xff && (b[1] & 0xe0) === 0xe0 // inicio de cuadro MPEG
}
const limpiar = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max)

export async function POST(req: NextRequest) {
  const s = db()
  let path = ''
  try {
    const user = await usuarioDelPedido(req)
    if (!user) return NextResponse.json({ ok: false, mensaje: 'Tu sesión venció. Volvé a entrar.' }, { status: 401 })
    const form = await req.formData().catch(() => null)
    if (!form) return NextResponse.json({ ok: false, mensaje: 'Faltan datos.' }, { status: 400 })
    const archivo = form.get('audio')
    const nombre = limpiar(form.get('nombre'), 60)
    const frase = limpiar(form.get('frase'), 200)
    const servicio = limpiar(form.get('servicio'), 60)
    const duracion = Number(form.get('duracion'))
    const permiso = form.get('permiso') === 'si'
    if (!permiso) return NextResponse.json({ ok: false, mensaje: 'Para publicarlo necesitás el permiso de esa persona.' }, { status: 400 })
    if (!nombre) return NextResponse.json({ ok: false, mensaje: 'Escribí el nombre (por ejemplo «Camila · Rosario»).' }, { status: 400 })
    if (!(archivo instanceof Blob) || archivo.size === 0) return NextResponse.json({ ok: false, mensaje: 'Falta el audio.' }, { status: 400 })
    if (archivo.size > MAX_BYTES) return NextResponse.json({ ok: false, mensaje: 'El audio quedó muy pesado. Recortalo un poco más.' }, { status: 400 })
    if (!(duracion > 0 && duracion <= MAX_SEGUNDOS + 0.5)) return NextResponse.json({ ok: false, mensaje: `El audio puede durar hasta ${MAX_SEGUNDOS} segundos.` }, { status: 400 })
    const bytes = new Uint8Array(await archivo.arrayBuffer())
    if (!esMp3(bytes)) return NextResponse.json({ ok: false, mensaje: 'Ese archivo no parece un audio. Probá de nuevo.' }, { status: 400 })

    const nivel = await nivelServidor(user.id)
    const limite = nivel === 'premium' ? LIMITE_AUDIOS.premium : nivel === 'basico' ? LIMITE_AUDIOS.basico : 0
    if (!limite) return NextResponse.json({ ok: false, mensaje: 'Tu plan venció. Renovalo para sumar testimonios.' }, { status: 403 })
    const { count } = await s.from('testimonios_audio').select('id', { count: 'exact', head: true }).eq('terapeuta_id', user.id)
    if ((count || 0) >= limite) {
      return NextResponse.json({ ok: false, mensaje: nivel === 'premium' ? `Llegaste a los ${limite} audios. Borrá uno para sumar otro.` : `Con el plan Básico tenés hasta ${limite} audios. Con Premium, hasta ${LIMITE_AUDIOS.premium}.` }, { status: 403 })
    }

    // freno contra el doble toque: recién acá, así un error de datos no hace esperar
    if (muyPronto(`testi-audio:${user.id}`, 2500)) return NextResponse.json({ ok: false, mensaje: 'Esperá un segundito y probá de nuevo.' }, { status: 429 })
    path = `${user.id}/${crypto.randomUUID()}.mp3`
    const { error: errSubir } = await s.storage.from(BALDE).upload(path, bytes, { contentType: 'audio/mpeg', upsert: false, cacheControl: '31536000' })
    if (errSubir) { console.error('testimonios-audio (subir):', errSubir); path = ''; return NextResponse.json({ ok: false, mensaje: 'No se pudo guardar el audio. Probá de nuevo.' }, { status: 500 }) }

    const { data: fila, error } = await s.from('testimonios_audio')
      .insert({ terapeuta_id: user.id, path, duracion: Math.round(duracion * 10) / 10, nombre, frase, servicio, permiso: true, orden: Math.floor(Date.now() / 1000) })
      .select('id, path, duracion, nombre, frase, servicio, orden').single()
    if (error || !fila) {
      console.error('testimonios-audio (fila):', error)
      await s.storage.from(BALDE).remove([path]).catch(() => {})
      const tope = /limite|límite/i.test(error?.message || '')
      return NextResponse.json({ ok: false, mensaje: tope ? 'Llegaste al máximo de audios de tu plan.' : 'No se pudo guardar el testimonio. Probá de nuevo.' }, { status: tope ? 403 : 500 })
    }
    return NextResponse.json({ ok: true, testimonio: fila })
  } catch (e) {
    console.error('testimonios-audio:', e)
    if (path) await s.storage.from(BALDE).remove([path]).catch(() => {})
    return NextResponse.json({ ok: false, mensaje: 'No se pudo guardar. Probá de nuevo.' }, { status: 500 })
  }
}

// Borrar (siempre se puede, con cualquier plan: borrar nunca cuesta nada)
export async function DELETE(req: NextRequest) {
  try {
    const user = await usuarioDelPedido(req)
    if (!user) return NextResponse.json({ ok: false, mensaje: 'Tu sesión venció. Volvé a entrar.' }, { status: 401 })
    const id = req.nextUrl.searchParams.get('id') || ''
    if (!UUID.test(id)) return NextResponse.json({ ok: false, mensaje: 'Faltan datos.' }, { status: 400 })
    const s = db()
    const { data: fila } = await s.from('testimonios_audio').select('id, terapeuta_id, path').eq('id', id).maybeSingle()
    if (!fila) return NextResponse.json({ ok: true, yaNoEstaba: true })
    if (fila.terapeuta_id !== user.id) return NextResponse.json({ ok: false, mensaje: 'No encontramos ese testimonio.' }, { status: 403 })
    await s.from('testimonios_audio').delete().eq('id', id)
    const { error } = await s.storage.from(BALDE).remove([fila.path])
    if (error) console.error('testimonios-audio (borrar archivo):', error)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('testimonios-audio (borrar):', e)
    return NextResponse.json({ ok: false, mensaje: 'No se pudo borrar. Probá de nuevo.' }, { status: 500 })
  }
}

// Editar la frase, el nombre o el servicio (sin tocar el audio)
export async function PATCH(req: NextRequest) {
  try {
    const user = await usuarioDelPedido(req)
    if (!user) return NextResponse.json({ ok: false, mensaje: 'Tu sesión venció. Volvé a entrar.' }, { status: 401 })
    const b = await req.json().catch(() => ({}))
    const id = String(b.id || '')
    if (!UUID.test(id)) return NextResponse.json({ ok: false, mensaje: 'Faltan datos.' }, { status: 400 })
    const cambios: Record<string, string> = {}
    if ('nombre' in b) { const n = limpiar(b.nombre, 60); if (!n) return NextResponse.json({ ok: false, mensaje: 'El nombre no puede quedar vacío.' }, { status: 400 }); cambios.nombre = n }
    if ('frase' in b) cambios.frase = limpiar(b.frase, 200)
    if ('servicio' in b) cambios.servicio = limpiar(b.servicio, 60)
    const { data, error } = await db().from('testimonios_audio').update(cambios).eq('id', id).eq('terapeuta_id', user.id).select('id')
    if (error || !data?.length) return NextResponse.json({ ok: false, mensaje: 'No se pudo guardar el cambio.' }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('testimonios-audio (editar):', e)
    return NextResponse.json({ ok: false, mensaje: 'No se pudo guardar el cambio.' }, { status: 500 })
  }
}
