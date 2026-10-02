// Reconoce de dónde viene un link (Drive, Dropbox, YouTube, Spotify, etc.)
// y devuelve cómo mostrarlo dentro de Luma. Si no lo reconoce, devuelve 'link'
// para que igual se pueda abrir en otra pestaña: nunca queda nada deshabilitado.

export type TipoVisor =
  | 'youtube' | 'vimeo' | 'loom' | 'drive' | 'documento' | 'carpeta'
  | 'reproductor' | 'audio' | 'video' | 'pdf' | 'imagen' | 'link' | 'local'

export type Contenido = {
  visor: TipoVisor
  embedUrl: string    // lo que va adentro del reproductor / visor
  abrirUrl: string    // para "Abrir en pestaña nueva"
  plataforma: string  // nombre para mostrar
  alto?: number       // alto fijo (reproductores de audio)
}

const EXT_AUDIO = /\.(mp3|m4a|wav|ogg|oga|aac|opus|flac|weba)$/i
const EXT_VIDEO = /\.(mp4|webm|mov|m4v|ogv)$/i
const EXT_PDF = /\.pdf$/i
const EXT_IMG = /\.(jpe?g|png|gif|webp|avif)$/i

// un archivo de la compu de la terapeuta (file:///C:/..., C:\Users\..., /Users/...):
// solo se abre en SU computadora, nadie más lo puede ver
export function esRutaLocal(raw: string | null | undefined): boolean {
  const url = (raw || '').trim()
  return /^file:/i.test(url) || /^[a-zA-Z]:[\\/]/.test(url) || /^\\\\/.test(url) || /^\/(Users|home)\//.test(url)
}

// agrega https:// si falta (si no, el navegador lo toma como una ruta interna y no abre nada)
export function normalizarUrl(raw: string | null | undefined): string {
  let url = (raw || '').trim()
  if (!url) return ''
  if (url.startsWith('//')) url = 'https:' + url
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) url = 'https://' + url.replace(/^\/+/, '')
  return url
}

function porExtension(nombre: string, embedUrl: string, abrirUrl: string, plataforma: string, tipoLeccion?: string): Contenido | null {
  let archivo = nombre
  try { archivo = decodeURIComponent(nombre) } catch { /* nombre con caracteres raros: lo dejamos como está */ }
  if (EXT_AUDIO.test(archivo)) return { visor: 'audio', embedUrl, abrirUrl, plataforma }
  if (EXT_VIDEO.test(archivo)) return { visor: 'video', embedUrl, abrirUrl, plataforma }
  if (EXT_PDF.test(archivo)) return { visor: 'pdf', embedUrl, abrirUrl, plataforma }
  if (EXT_IMG.test(archivo)) return { visor: 'imagen', embedUrl, abrirUrl, plataforma }
  // sin extensión: usamos el tipo de la lección como pista (solo para servicios de archivos)
  if (tipoLeccion === 'audio') return { visor: 'audio', embedUrl, abrirUrl, plataforma }
  if (tipoLeccion === 'video') return { visor: 'video', embedUrl, abrirUrl, plataforma }
  if (tipoLeccion === 'pdf') return { visor: 'pdf', embedUrl, abrirUrl, plataforma }
  return null
}

export function detectarContenido(raw: string | null | undefined, tipoLeccion?: string): Contenido | null {
  if (esRutaLocal(raw)) {
    const r = (raw || '').trim()
    return { visor: 'local', embedUrl: r, abrirUrl: r, plataforma: 'Archivo de una computadora' }
  }
  const url = normalizarUrl(raw)
  if (!url) return null
  let u: URL
  try { u = new URL(url) } catch { return { visor: 'link', embedUrl: url, abrirUrl: url, plataforma: 'Link' } }
  const host = u.hostname.replace(/^www\./, '').toLowerCase()
  const path = u.pathname
  const link: Contenido = { visor: 'link', embedUrl: url, abrirUrl: url, plataforma: host }

  // ── YouTube (también ocultos, shorts, lives y YouTube Music)
  const yt = url.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/)
  if (yt) {
    const si = u.searchParams.get('si')
    return { visor: 'youtube', embedUrl: `https://www.youtube.com/embed/${yt[1]}${si ? `?si=${si}` : ''}`, abrirUrl: url, plataforma: 'YouTube' }
  }

  // ── Vimeo (incluye videos no listados con hash)
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([a-f0-9]{6,}))?/)
  if (vimeo) {
    const h = vimeo[2] || u.searchParams.get('h')
    return { visor: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeo[1]}${h ? `?h=${h}` : ''}`, abrirUrl: url, plataforma: 'Vimeo' }
  }

  // ── Loom
  const loom = path.match(/\/(?:share|embed)\/([a-f0-9]+)/)
  if (host.endsWith('loom.com') && loom) {
    return { visor: 'loom', embedUrl: `https://www.loom.com/embed/${loom[1]}`, abrirUrl: url, plataforma: 'Loom' }
  }

  // ── Google Drive / Docs / Slides / Sheets / Forms
  if (host === 'drive.google.com' || host === 'docs.google.com') {
    const carpeta = path.match(/\/folders\/([\w-]+)/)
    if (carpeta) return { visor: 'carpeta', embedUrl: `https://drive.google.com/embeddedfolderview?id=${carpeta[1]}#list`, abrirUrl: url, plataforma: 'Carpeta de Google Drive' }

    if (path.includes('/forms/')) {
      const f = new URL(url); f.searchParams.set('embedded', 'true')
      return { visor: 'documento', embedUrl: f.toString(), abrirUrl: url, plataforma: 'Formulario de Google' }
    }
    const doc = path.match(/\/(document|presentation|spreadsheets)\/d\/([\w-]+)/)
    if (doc) {
      const [, clase, id] = doc
      const embed = clase === 'presentation'
        ? `https://docs.google.com/presentation/d/${id}/embed`
        : `https://docs.google.com/${clase}/d/${id}/preview`
      const nombre = clase === 'document' ? 'Google Docs' : clase === 'presentation' ? 'Google Slides' : 'Google Sheets'
      return { visor: 'documento', embedUrl: embed, abrirUrl: url, plataforma: nombre }
    }
    const archivo = path.match(/\/file\/d\/([\w-]+)/)
    const id = archivo?.[1] || u.searchParams.get('id')
    if (id) {
      return {
        visor: 'drive',
        embedUrl: `https://drive.google.com/file/d/${id}/preview`,
        abrirUrl: `https://drive.google.com/file/d/${id}/view`,
        plataforma: 'Google Drive',
        alto: tipoLeccion === 'audio' ? 200 : undefined,
      }
    }
    return link
  }

  // ── Dropbox (cambiamos dl=0 por raw=1 para que se reproduzca o se vea directo)
  if (host === 'dropbox.com' || host.endsWith('.dropbox.com') || host === 'dl.dropboxusercontent.com') {
    if (/\/(sh|scl\/fo)\//.test(path)) return { ...link, plataforma: 'Carpeta de Dropbox' }
    const d = new URL(url)
    if (host !== 'dl.dropboxusercontent.com') { d.searchParams.delete('dl'); d.searchParams.set('raw', '1') }
    const nombre = path.split('/').pop() || ''
    return porExtension(nombre, d.toString(), url, 'Dropbox', tipoLeccion) || { ...link, plataforma: 'Dropbox' }
  }

  // ── Spotify (episodios, canciones, podcasts, playlists)
  if (host === 'open.spotify.com') {
    const sp = path.match(/\/(?:intl-[a-z-]+\/)?(episode|track|show|playlist|album|artist)\/([A-Za-z0-9]+)/)
    if (sp) return { visor: 'reproductor', embedUrl: `https://open.spotify.com/embed/${sp[1]}/${sp[2]}`, abrirUrl: url, plataforma: 'Spotify', alto: sp[1] === 'episode' || sp[1] === 'track' ? 152 : 352 }
    return { ...link, plataforma: 'Spotify' }
  }

  // ── Spotify for Creators / Anchor (episodios de podcast)
  if (host === 'podcasters.spotify.com' || host === 'creators.spotify.com') {
    const ep = path.match(/\/pod\/show\/([^/]+)\/episodes\/([^/?#]+)/)
    if (ep) return { visor: 'reproductor', embedUrl: `https://${host}/pod/show/${ep[1]}/embed/episodes/${ep[2]}`, abrirUrl: url, plataforma: 'Spotify for Creators', alto: 161 }
  }
  if (host === 'anchor.fm') {
    const ep = path.match(/^\/([^/]+)\/episodes\/([^/?#]+)/)
    if (ep) return { visor: 'reproductor', embedUrl: `https://anchor.fm/${ep[1]}/embed/episodes/${ep[2]}`, abrirUrl: url, plataforma: 'Anchor', alto: 161 }
  }

  // ── SoundCloud (también links privados con código secreto)
  if (host === 'soundcloud.com' || host === 'm.soundcloud.com' || host === 'on.soundcloud.com') {
    const limpio = url.replace('://m.soundcloud.com', '://soundcloud.com')
    return { visor: 'reproductor', embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(limpio)}&color=%238b5cf6&auto_play=false&visual=false&show_comments=false`, abrirUrl: url, plataforma: 'SoundCloud', alto: 166 }
  }

  // ── iVoox
  const ivoox = url.match(/ivoox\.com\/.*_rf_(\d+)_1\.html/)
  if (ivoox) return { visor: 'reproductor', embedUrl: `https://www.ivoox.com/player_ej_${ivoox[1]}_6_1.html?c1=8b5cf6`, abrirUrl: url, plataforma: 'iVoox', alto: 200 }

  // ── Apple Podcasts
  if (host === 'podcasts.apple.com') {
    return { visor: 'reproductor', embedUrl: `https://embed.podcasts.apple.com${path}${u.search}`, abrirUrl: url, plataforma: 'Apple Podcasts', alto: u.searchParams.get('i') ? 175 : 450 }
  }

  // ── Canva (diseños compartidos con "ver")
  if (host === 'canva.com' && /\/design\/[^/]+\/[^/]+\/view/.test(path)) {
    return { visor: 'documento', embedUrl: `https://www.canva.com${path}?embed`, abrirUrl: url, plataforma: 'Canva' }
  }

  // ── Archivos directos (incluye los subidos a Luma/Supabase)
  const nombre = path.split('/').pop() || ''
  const directo = EXT_AUDIO.test(nombre) || EXT_VIDEO.test(nombre) || EXT_PDF.test(nombre) || EXT_IMG.test(nombre)
  if (directo) return porExtension(nombre, url, url, 'Archivo', undefined)

  return link
}