// Descargables (solo servidor): archivos privados que se venden como un "curso" de tipo descargable.
// · Los archivos viven en el balde PRIVADO 'descargables' (nadie lo lee ni lista desde el navegador).
// · Solo el servidor da links: para subir (a Premium, revisando el espacio) y para descargar (a quien compró, por 5 minutos).
// · Espacio: hasta 30 MB por archivo, hasta 5 archivos por descargable y 100 MB en total por terapeuta
//   (más el espacio extra que Priscila le dé desde Admin). Si el giga gratis de Luma se llena, se frenan las subidas.
import { db } from '@/lib/planLuma'
import { tieneAccesoCurso } from '@/lib/acceso'

export const BALDE = 'descargables'
export const MB = 1024 * 1024
export const MAX_ARCHIVO = 30 * MB
export const MAX_ARCHIVOS = 5
export const ESPACIO_BASE = 100 * MB
export const LUMA_TOPE = 850 * MB          // a partir de acá se frenan las subidas nuevas y salta la alerta en Admin
export const LINK_DESCARGA_SEG = 300       // 5 minutos

// tipos permitidos: extensión → tipo de archivo. Programas, páginas web, SVG y videos: NO.
export const PERMITIDOS: Record<string, string> = {
  pdf: 'application/pdf',
  epub: 'application/epub+zip',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  zip: 'application/zip',
}
export const extension = (nombre: string) => (String(nombre).toLowerCase().match(/\.([a-z0-9]{1,5})$/)?.[1]) || ''

// Primeros bytes de cada tipo: así un programa con la extensión cambiada (virus.exe → virus.pdf) no pasa.
export function firmaValida(ext: string, b: Uint8Array): boolean {
  const empieza = (...x: number[]) => x.every((v, i) => b[i] === v)
  const texto = (t: string, desde = 0) => [...t].every((ch, i) => b[desde + i] === ch.charCodeAt(0))
  // nunca un ejecutable de Windows (MZ) ni de Linux/Mac (ELF / Mach-O)
  if (empieza(0x4d, 0x5a) || empieza(0x7f, 0x45, 0x4c, 0x46) || empieza(0xcf, 0xfa, 0xed, 0xfe) || empieza(0xfe, 0xed, 0xfa, 0xce)) return false
  switch (ext) {
    case 'pdf': return texto('%PDF')
    case 'png': return empieza(0x89, 0x50, 0x4e, 0x47)
    case 'jpg': case 'jpeg': return empieza(0xff, 0xd8, 0xff)
    case 'mp3': return texto('ID3') || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)
    case 'm4a': return texto('ftyp', 4)
    case 'wav': return texto('RIFF') && texto('WAVE', 8)
    case 'epub': case 'docx': case 'xlsx': case 'pptx': case 'zip': return empieza(0x50, 0x4b, 0x03, 0x04) || empieza(0x50, 0x4b, 0x05, 0x06)
    case 'doc': case 'xls': case 'ppt': return empieza(0xd0, 0xcf, 0x11, 0xe0)
    default: return false
  }
}

// nombre que se muestra: sin rutas ni caracteres raros, con su extensión
export function nombreLimpio(nombre: string): string {
  const base = String(nombre || '').split(/[\\/]/).pop() || 'archivo'
  return base.replace(/[\u0000-\u001f<>:"|?*]/g, '').trim().slice(0, 120) || 'archivo'
}

export async function espacioDe(terapeutaId: string) {
  const s = db()
  const hace2h = new Date(Date.now() - 2 * 3600000).toISOString()
  const [{ data: filas }, { data: extra }] = await Promise.all([
    s.from('descargable_archivos').select('tamano, estado, created_at').eq('terapeuta_id', terapeutaId),
    s.from('luma_espacio_extra').select('mb').eq('user_id', terapeutaId).maybeSingle(),
  ])
  // cuenta lo subido y lo que se está subiendo ahora (las subidas abandonadas de hace más de 2 horas no cuentan)
  const usado = (filas || []).filter((f: any) => f.estado === 'listo' || f.created_at > hace2h).reduce((a: number, f: any) => a + (Number(f.tamano) || 0), 0)
  const total = ESPACIO_BASE + (Number((extra as any)?.mb) || 0) * MB
  return { usado, total, libre: Math.max(0, total - usado) }
}

export async function espacioLuma(): Promise<number> {
  const { data, error } = await db().rpc('luma_espacio_total')
  if (error) { console.error('espacioLuma:', error); return 0 }
  return Number(data) || 0
}

// ¿Puede esta cuenta descargar este descargable? Dueña: siempre. Compradora: con la compra activa.
export async function puedeDescargar(userId: string, courseId: string): Promise<{ ok: true; esDuena: boolean } | { ok: false; motivo: string; mensaje: string }> {
  const s = db()
  const { data: curso } = await s.from('courses').select('id, user_id, tipo').eq('id', courseId).maybeSingle()
  if (!curso || curso.tipo !== 'descargable') return { ok: false, motivo: 'no_existe', mensaje: 'Este archivo ya no está disponible. Escribile a la terapeuta.' }
  if (curso.user_id === userId) return { ok: true, esDuena: true }
  const { data: persona } = await s.from('persons').select('id').eq('auth_user_id', userId).maybeSingle()
  if (!persona) return { ok: false, motivo: 'no_compro', mensaje: 'No encontramos tu compra con esta cuenta.' }
  const { data: e } = await s.from('enrollments').select('estado, modalidad, fecha_vencimiento').eq('course_id', courseId).eq('person_id', persona.id).maybeSingle()
  if (!e) return { ok: false, motivo: 'no_compro', mensaje: 'No encontramos tu compra con esta cuenta.' }
  if (e.estado === 'baja') return { ok: false, motivo: 'baja', mensaje: 'Tu acceso terminó. Escribile a la terapeuta.' }
  if (!tieneAccesoCurso(e as any)) return { ok: false, motivo: 'pendiente', mensaje: 'Se habilita cuando se confirme tu pago.' }
  return { ok: true, esDuena: false }
}
