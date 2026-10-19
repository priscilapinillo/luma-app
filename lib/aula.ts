// Herramientas del aula de las alumnas: cuaderno, favoritos, progreso y preferencias.
// Todo va directo a Supabase con la sesión de la alumna (no pasa por Netlify).
// La seguridad la pone la base: cada alumna solo puede leer y escribir lo suyo.

import { createClient } from '@/lib/supabase'

export type TipoApunte = 'nota' | 'momento' | 'frase' | 'captura'

export type Apunte = {
  id: string
  course_id: string
  lesson_id: string | null
  tipo: TipoApunte
  contenido: string
  segundo: number | null
  imagen_path: string | null
  leccion_titulo: string
  leccion_orden: number
  modulo_titulo: string
  modulo_orden: number
  created_at: string
  updated_at: string
}

export type ContextoLeccion = {
  personId: string
  courseId: string
  lessonId: string
  leccionTitulo: string
  leccionOrden: number
  moduloTitulo: string
  moduloOrden: number
}

export const TOPE_CAPTURAS = 40
export const DIAS_AVISO_VENCE = 5

// ── minutos ──────────────────────────────────────────────────────────────
export function formatoMinuto(seg: number | null | undefined): string {
  const s = Math.max(0, Math.floor(Number(seg) || 0))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`
}

// ── días que faltan para que venza el acceso (para "Próximo a vencer") ──────
export function diasParaVencer(fecha: string | null | undefined, ahora = Date.now()): number | null {
  if (!fecha) return null
  const t = new Date(fecha).getTime()
  if (isNaN(t)) return null
  return Math.ceil((t - ahora) / 86400000)
}

// ── HTML seguro del cuaderno ────────────────────────────────────────────────
// Solo dejamos texto, saltos de línea, negrita/cursiva y los 3 resaltadores.
// Cualquier otra cosa (scripts, links, estilos, imágenes pegadas) se descarta.
const MARCAS_OK = new Set(['m1', 'm2', 'm3'])
export function limpiarHtml(html: string): string {
  if (typeof window === 'undefined' || !html) return ''
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const raiz = doc.body.firstElementChild
  if (!raiz) return ''
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const recorrer = (n: Node): string => {
    if (n.nodeType === Node.TEXT_NODE) return esc((n.textContent || '').replace(/\u200B/g, ''))
    if (n.nodeType !== Node.ELEMENT_NODE) return ''
    const el = n as Element
    const tag = el.tagName.toLowerCase()
    const hijos = Array.from(el.childNodes).map(recorrer).join('')
    if (tag === 'br') return '<br>'
    if (tag === 'script' || tag === 'style' || tag === 'iframe' || tag === 'object') return ''
    if (tag === 'mark') {
      const c = (el.getAttribute('class') || '').split(/\s+/).find(x => MARCAS_OK.has(x))
      return c ? `<mark class="${c}">${hijos}</mark>` : hijos
    }
    if (tag === 'b' || tag === 'strong') return hijos ? `<b>${hijos}</b>` : ''
    if (tag === 'i' || tag === 'em') return hijos ? `<i>${hijos}</i>` : ''
    if (tag === 'div' || tag === 'p' || tag === 'li') return `<div>${hijos || '<br>'}</div>`
    return hijos
  }
  return Array.from(raiz.childNodes).map(recorrer).join('').slice(0, 20000)
}

export function textoPlano(html: string): string {
  if (typeof window === 'undefined' || !html) return ''
  const doc = new DOMParser().parseFromString(`<div>${html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/div>/gi, '\n</div>')}</div>`, 'text/html')
  return (doc.body.textContent || '').replace(/\u200B/g, '').replace(/\n{3,}/g, '\n\n').trim()
}

// ── guardado sin conexión ────────────────────────────────────────────────
// Si se corta internet, la nota queda guardada en el celular y se sube cuando vuelve.
const CLAVE_PENDIENTES = 'luma-aula-pendientes'
type Pendiente = { ctx: ContextoLeccion; html: string; at: number }

function leerPendientes(): Record<string, Pendiente> {
  try { return JSON.parse(localStorage.getItem(CLAVE_PENDIENTES) || '{}') || {} } catch { return {} }
}
function escribirPendientes(p: Record<string, Pendiente>) {
  try { localStorage.setItem(CLAVE_PENDIENTES, JSON.stringify(p)) } catch { /* sin espacio o modo privado */ }
}
export function guardarNotaLocal(ctx: ContextoLeccion, html: string) {
  const p = leerPendientes(); p[ctx.lessonId] = { ctx, html, at: Date.now() }; escribirPendientes(p)
}
export function notaLocal(lessonId: string): Pendiente | null { return leerPendientes()[lessonId] || null }
export function borrarNotaLocal(lessonId: string, hasta?: number) {
  const p = leerPendientes()
  if (p[lessonId] && (!hasta || p[lessonId].at <= hasta)) { delete p[lessonId]; escribirPendientes(p) }
}

// ── apuntes ──────────────────────────────────────────────────────────────
const COLUMNAS = 'id, course_id, lesson_id, tipo, contenido, segundo, imagen_path, leccion_titulo, leccion_orden, modulo_titulo, modulo_orden, created_at, updated_at'

export async function apuntesDeLeccion(personId: string, lessonId: string): Promise<Apunte[]> {
  const { data, error } = await createClient().from('alumna_apuntes').select(COLUMNAS)
    .eq('person_id', personId).eq('lesson_id', lessonId).order('created_at')
  if (error) throw error
  return (data || []) as Apunte[]
}

export async function apuntesDeCurso(personId: string, courseId: string): Promise<Apunte[]> {
  const { data, error } = await createClient().from('alumna_apuntes').select(COLUMNAS)
    .eq('person_id', personId).eq('course_id', courseId).order('created_at').limit(2000)
  if (error) throw error
  return (data || []) as Apunte[]
}

const snapshot = (ctx: ContextoLeccion) => ({
  person_id: ctx.personId, course_id: ctx.courseId, lesson_id: ctx.lessonId,
  leccion_titulo: (ctx.leccionTitulo || '').slice(0, 300), leccion_orden: ctx.leccionOrden || 0,
  modulo_titulo: (ctx.moduloTitulo || '').slice(0, 300), modulo_orden: ctx.moduloOrden || 0,
})

// Guarda la "pizarra" de la lección (una sola por lección). Devuelve si otro dispositivo la había cambiado.
export async function guardarNota(ctx: ContextoLeccion, html: string, notaId: string | null, base: string | null):
  Promise<{ id: string; updated_at: string; otroDispositivo: boolean }> {
  const s = createClient()
  const contenido = limpiarHtml(html)
  const ahora = new Date().toISOString()
  let id = notaId
  let otroDispositivo = false
  if (!id) {
    const { data, error } = await s.from('alumna_apuntes').insert({ ...snapshot(ctx), tipo: 'nota', contenido, updated_at: ahora })
      .select('id, updated_at').single()
    if (!error && data) return { id: data.id, updated_at: data.updated_at, otroDispositivo: false }
    // ya existía (la creó en otro dispositivo): la buscamos y la actualizamos
    const { data: ex } = await s.from('alumna_apuntes').select('id, updated_at')
      .eq('person_id', ctx.personId).eq('lesson_id', ctx.lessonId).eq('tipo', 'nota').maybeSingle()
    if (!ex) throw error || new Error('No se pudo guardar')
    id = ex.id; otroDispositivo = true
  } else if (base) {
    const { data: ex } = await s.from('alumna_apuntes').select('updated_at').eq('id', id).maybeSingle()
    if (ex && new Date(ex.updated_at).getTime() > new Date(base).getTime() + 1000) otroDispositivo = true
  }
  const { data, error } = await s.from('alumna_apuntes').update({ ...snapshot(ctx), contenido, updated_at: ahora })
    .eq('id', id).select('id, updated_at').single()
  if (error || !data) throw error || new Error('No se pudo guardar')
  return { id: data.id, updated_at: data.updated_at, otroDispositivo }
}

export async function crearApunte(ctx: ContextoLeccion, tipo: Exclude<TipoApunte, 'nota'>, datos: { contenido?: string; segundo?: number | null; imagen_path?: string | null }): Promise<Apunte> {
  const { data, error } = await createClient().from('alumna_apuntes').insert({
    ...snapshot(ctx), tipo,
    contenido: (datos.contenido || '').slice(0, 5000),
    segundo: datos.segundo == null ? null : Math.max(0, Math.min(86400, Math.floor(datos.segundo))),
    imagen_path: datos.imagen_path || null,
  }).select(COLUMNAS).single()
  if (error || !data) throw error || new Error('No se pudo guardar')
  return data as Apunte
}

export async function borrarApunte(a: Apunte) {
  const s = createClient()
  const { error } = await s.from('alumna_apuntes').delete().eq('id', a.id)
  if (error) throw error
  if (a.imagen_path) await s.storage.from('apuntes').remove([a.imagen_path]).catch(() => null)
}

export async function contarCapturas(personId: string, courseId: string): Promise<number> {
  const { count } = await createClient().from('alumna_apuntes').select('id', { count: 'exact', head: true })
    .eq('person_id', personId).eq('course_id', courseId).eq('tipo', 'captura')
  return count || 0
}

// Las capturas están en una carpeta privada: se ven con un link temporal (1 hora)
export async function linksDeCapturas(paths: string[]): Promise<Record<string, string>> {
  const unicos = [...new Set(paths.filter(Boolean))]
  if (unicos.length === 0) return {}
  const salida: Record<string, string> = {}
  for (let i = 0; i < unicos.length; i += 50) {
    const { data } = await createClient().storage.from('apuntes').createSignedUrls(unicos.slice(i, i + 50), 3600)
    for (const d of data || []) if (d.path && d.signedUrl) salida[d.path] = d.signedUrl
  }
  return salida
}

export async function subirCaptura(ctx: ContextoLeccion, archivo: Blob, segundo: number | null, nota: string): Promise<Apunte> {
  const s = createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) throw new Error('Tu sesión se cerró. Volvé a entrar.')
  const ext = archivo.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${user.id}/${ctx.courseId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await s.storage.from('apuntes').upload(path, archivo, { contentType: archivo.type, upsert: false })
  if (error) throw new Error('No se pudo subir la captura. Revisá tu conexión.')
  try {
    return await crearApunte(ctx, 'captura', { contenido: nota, segundo, imagen_path: path })
  } catch {
    await s.storage.from('apuntes').remove([path]).catch(() => null)
    throw new Error(`Llegaste al tope de ${TOPE_CAPTURAS} capturas en este curso. Borrá alguna para subir otra.`)
  }
}

// ── favoritos ────────────────────────────────────────────────────────────
export type Favorito = { lesson_id: string; course_id: string; leccion_titulo: string; modulo_titulo: string; tipo_leccion: string; created_at: string }

export async function favoritosDe(personId: string, courseId?: string): Promise<Favorito[]> {
  let q = createClient().from('alumna_favoritos').select('lesson_id, course_id, leccion_titulo, modulo_titulo, tipo_leccion, created_at')
    .eq('person_id', personId).order('created_at', { ascending: false })
  if (courseId) q = q.eq('course_id', courseId)
  const { data } = await q
  return (data || []) as Favorito[]
}

export async function marcarFavorito(ctx: ContextoLeccion, tipoLeccion: string, si: boolean) {
  const s = createClient()
  if (si) {
    const { error } = await s.from('alumna_favoritos').upsert({
      person_id: ctx.personId, lesson_id: ctx.lessonId, course_id: ctx.courseId,
      leccion_titulo: ctx.leccionTitulo.slice(0, 300), modulo_titulo: ctx.moduloTitulo.slice(0, 300), tipo_leccion: tipoLeccion || '',
    }, { onConflict: 'person_id,lesson_id', ignoreDuplicates: true })
    if (error) throw error
  } else {
    const { error } = await s.from('alumna_favoritos').delete().eq('person_id', ctx.personId).eq('lesson_id', ctx.lessonId)
    if (error) throw error
  }
}

// ── progreso (Retomá donde dejaste + la luna) ───────────────────────────────
export type Progreso = { course_id: string; lesson_id: string | null; leccion_titulo: string; segundo: number; total_lecciones: number; completadas: number; updated_at: string }

export async function guardarProgreso(p: { personId: string; courseId: string; lessonId: string; leccionTitulo: string; segundo: number; total: number; completadas: number }) {
  await createClient().from('alumna_progreso').upsert({
    person_id: p.personId, course_id: p.courseId, lesson_id: p.lessonId, leccion_titulo: p.leccionTitulo.slice(0, 300),
    segundo: Math.max(0, Math.min(86400, Math.floor(p.segundo || 0))),
    total_lecciones: Math.max(0, p.total), completadas: Math.max(0, Math.min(p.completadas, p.total || p.completadas)),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'person_id,course_id' })
}

export async function progresosDe(personId: string): Promise<Progreso[]> {
  const { data } = await createClient().from('alumna_progreso')
    .select('course_id, lesson_id, leccion_titulo, segundo, total_lecciones, completadas, updated_at')
    .eq('person_id', personId).order('updated_at', { ascending: false })
  return (data || []) as Progreso[]
}

// ── preferencias ─────────────────────────────────────────────────────────
export type Preferencias = { novedades_vistas_at: string | null; pausar_al_escribir: boolean }

export async function preferenciasDe(personId: string): Promise<Preferencias> {
  const { data, error } = await createClient().from('alumna_preferencias').select('novedades_vistas_at, pausar_al_escribir')
    .eq('person_id', personId).maybeSingle()
  if (error) throw error // (por ejemplo, si todavía no se corrió el SQL: así no aparece el aviso a cada rato)
  return { novedades_vistas_at: data?.novedades_vistas_at || null, pausar_al_escribir: !!data?.pausar_al_escribir }
}

export async function guardarPreferencias(personId: string, cambios: Partial<Preferencias>) {
  await createClient().from('alumna_preferencias').upsert({ person_id: personId, ...cambios, updated_at: new Date().toISOString() }, { onConflict: 'person_id' })
}

// ── celebraciones que ya se mostraron (para no repetirlas) ───────────────────
export function yaCelebrado(clave: string): boolean {
  try { return (JSON.parse(localStorage.getItem('luma-celebradas') || '[]') as string[]).includes(clave) } catch { return false }
}
export function anotarCelebrado(clave: string) {
  try {
    const l = JSON.parse(localStorage.getItem('luma-celebradas') || '[]') as string[]
    if (!l.includes(clave)) { l.push(clave); localStorage.setItem('luma-celebradas', JSON.stringify(l.slice(-500))) }
  } catch { /* nada */ }
}

// Sube las notas que quedaron guardadas en el celular sin internet (de cualquier lección)
export async function sincronizarPendientes(personId: string, salvoLeccion?: string) {
  const p = leerPendientes()
  for (const [lessonId, pend] of Object.entries(p)) {
    if (lessonId === salvoLeccion || pend.ctx.personId !== personId) continue
    try {
      const { data: ex, error } = await createClient().from('alumna_apuntes').select('id, updated_at')
        .eq('person_id', personId).eq('lesson_id', lessonId).eq('tipo', 'nota').maybeSingle()
      if (error) continue
      // si en otro dispositivo se escribió algo más nuevo, gana lo más nuevo
      if (!ex || new Date(ex.updated_at).getTime() < pend.at) await guardarNota(pend.ctx, pend.html, ex?.id || null, null)
      borrarNotaLocal(lessonId, pend.at)
    } catch { /* sigue sin internet: queda para la próxima */ }
  }
}
