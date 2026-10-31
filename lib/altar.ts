// Altar de ideas: tipos, colores, límites y ayudas (pantalla). Los límites los vuelve a revisar la base (luma_candado_pizarras).
export type Plantilla = 'libre' | 'planner' | 'banco'
export type TipoPieza = 'nota' | 'carta' | 'lista' | 'titulo' | 'link' | 'columna' | 'sticker'
export type ItemLista = { id: string; t: string; ok: boolean }
export type Pieza = {
  id: string; tipo: TipoPieza; x: number; y: number; w: number; h?: number; z?: number
  color?: string; texto?: string; titulo?: string; items?: ItemLista[]
  url?: string; img?: string | null; sitio?: string; sticker?: string
  padre?: string // si está adentro de una columna, nota o carta: el id de esa pieza (se ordenan una debajo de la otra)
}
export type Extremo = { pieza?: string; x: number; y: number }
export type TipoFlecha = 'recta' | 'curva-izq' | 'curva-der' | 'rulo' | 'ondulada' | 'punteada'
export type Punta = 'triangulo' | 'estrella' | 'luna' | 'ninguna'
export type Flecha = { id: string; desde: Extremo; hasta: Extremo; tipo: TipoFlecha; punta: Punta; grosor: 'normal' | 'gruesa'; color: string; curva?: number }
export type DatosLibre = { piezas: Pieza[]; flechas: Flecha[] }

// Qué puede ir adentro de qué. Una columna recibe casi todo; una nota o una carta reciben cosas chicas.
export const ACEPTA: Partial<Record<TipoPieza, TipoPieza[]>> = {
  columna: ['nota', 'carta', 'lista', 'titulo', 'link', 'sticker'],
  nota: ['titulo', 'link', 'lista', 'sticker'],
  carta: ['titulo', 'link', 'sticker'],
}
export const acepta = (contenedor: TipoPieza, pieza: TipoPieza) => !!ACEPTA[contenedor]?.includes(pieza)

export type Formato = 'reel' | 'carrusel' | 'historia' | 'otro'
export type EstadoPieza = 'idea' | 'guion' | 'grabado' | 'listo' | 'publicado'
export type ItemPlanner = { id: string; titulo: string; fecha: string | null; hora?: string; formato: Formato; estado: EstadoPieza; color?: string; nota?: string; doc?: string }
export type DatosPlanner = { items: ItemPlanner[]; ocultarPublicadas?: boolean; bancoImportado?: boolean }
export type ColumnaBanco = 'idea' | 'guion' | 'grabado' | 'publicado'
export type ItemBanco = { id: string; titulo: string; columna: ColumnaBanco; formato: Formato; nota?: string; color?: string }
export type DatosBanco = { items: ItemBanco[] }

export type PizarraFila = { id: string; user_id: string; nombre: string; plantilla: Plantilla; fondo: string; datos: any; version: number; borrada_en: string | null; created_at: string; updated_at: string }

// ── límites por plan (iguales a los de la base)
export const LIMITES = {
  basico: { pizarras: 1, piezas: 40, stickers: 6 },
  premium: { pizarras: Infinity, piezas: 1500, stickers: 10 },
}
export const piezasDe = (d: any) => (Array.isArray(d?.piezas) ? d.piezas.length : 0) + (Array.isArray(d?.items) ? d.items.length : 0)

// ── colores Blue Hour + "cristales" de las notas
export const CRISTALES: { id: string; nombre: string; fondo: string; borde: string; texto: string }[] = [
  { id: 'amatista', nombre: 'Amatista', fondo: '#E7DEF0', borde: '#A99BB8', texto: '#3B3352' },
  { id: 'cuarzo', nombre: 'Cuarzo rosa', fondo: '#F6E4E2', borde: '#D6A6A5', texto: '#5E3533' },
  { id: 'citrino', nombre: 'Citrino', fondo: '#F7ECD3', borde: '#D9B96E', texto: '#5A4416' },
  { id: 'aventurina', nombre: 'Aventurina', fondo: '#E2EDE4', borde: '#8FB39A', texto: '#284633' },
  { id: 'lapislazuli', nombre: 'Lapislázuli', fondo: '#DFE5F2', borde: '#626B91', texto: '#27344A' },
  { id: 'piedraluna', nombre: 'Piedra luna', fondo: '#FFFCF7', borde: '#E6DCCE', texto: '#27344A' },
]
export const cristal = (id?: string) => CRISTALES.find(c => c.id === id) || CRISTALES[5]
export const TINTAS = ['#27344A', '#626B91', '#A99BB8', '#D6A6A5', '#C9A55C', '#8FB39A', '#A24B47']

export const FORMATOS: { id: Formato; nombre: string; fondo: string; texto: string }[] = [
  { id: 'reel', nombre: 'Reel', fondo: '#F6E4E2', texto: '#6E3433' },
  { id: 'carrusel', nombre: 'Carrusel', fondo: '#DFE5F2', texto: '#27344A' },
  { id: 'historia', nombre: 'Historia', fondo: '#F7ECD3', texto: '#5A4416' },
  { id: 'otro', nombre: 'Otro', fondo: '#ECE7F2', texto: '#4C5580' },
]
export const ESTADOS: { id: EstadoPieza; nombre: string; color: string }[] = [
  { id: 'idea', nombre: 'Idea', color: '#A99BB8' },
  { id: 'guion', nombre: 'Guion', color: '#D6A6A5' },
  { id: 'grabado', nombre: 'Grabado', color: '#626B91' },
  { id: 'listo', nombre: 'Listo', color: '#C9A55C' },
  { id: 'publicado', nombre: 'Publicado', color: '#8FB39A' },
]
export const COLOR_VENCIDA = '#A24B47'
export const COLUMNAS_BANCO: { id: ColumnaBanco; nombre: string }[] = [
  { id: 'idea', nombre: 'Idea' }, { id: 'guion', nombre: 'Guion' }, { id: 'grabado', nombre: 'Grabado' }, { id: 'publicado', nombre: 'Publicado' },
]

export const nuevoId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36))

// ── fechas (siempre la fecha de la compu de la terapeuta, que está en Argentina)
export const fechaLocal = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export function lunesDe(d: Date) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const dia = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dia); return x }
export function sumarDias(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x }
// del Banco de ideas viejo a la lista de Contenido (misma pieza, sin fecha)
export function itemsDeBanco(items: any[]): ItemPlanner[] {
  const ok: EstadoPieza[] = ['idea', 'guion', 'grabado', 'publicado']
  return (Array.isArray(items) ? items : []).filter(i => i && i.id).map(i => ({
    id: String(i.id), titulo: String(i.titulo || '').slice(0, 140), fecha: null,
    formato: (['reel', 'carrusel', 'historia', 'otro'].includes(i.formato) ? i.formato : 'reel') as Formato,
    estado: (ok.includes(i.columna) ? i.columna : 'idea') as EstadoPieza,
    ...(i.nota ? { nota: String(i.nota).slice(0, 1200) } : {}),
  }))
}
export const vencida = (i: ItemPlanner, hoy = fechaLocal()) => !!i.fecha && i.fecha < hoy && i.estado !== 'publicado'

// ── datos vacíos de cada plantilla
export function datosIniciales(p: Plantilla): any {
  if (p === 'planner') return { items: [] } as DatosPlanner
  if (p === 'banco') return { items: [] } as DatosBanco
  return {
    piezas: [
      { id: nuevoId(), tipo: 'titulo', x: 40, y: 40, w: 320, texto: 'Mi altar de ideas', color: '#27344A' },
      { id: nuevoId(), tipo: 'nota', x: 40, y: 120, w: 220, color: 'amatista', texto: 'Tocá esta nota para escribir. Mantenela apretada para moverla.' },
    ],
    flechas: [],
  } as DatosLibre
}
export const NOMBRES_PLANTILLA: Record<Plantilla, string> = { libre: 'Pizarra libre', planner: 'Contenido', banco: 'Banco de ideas' }

// ── errores de la base → mensaje claro
export function mensajeAltar(e: any): { texto: string; tipo: 'limite' | 'lectura' | 'plan' | 'grande' | 'red' | 'otro' } {
  const m = String(e?.message || e || '')
  if (m.includes('limite_piezas')) return { texto: 'Llegaste al límite de piezas de tu plan.', tipo: 'limite' }
  if (m.includes('basico_una_pizarra')) return { texto: 'Con Básico tenés 1 pizarra. Pasate a Premium para tener todas las que quieras.', tipo: 'limite' }
  if (m.includes('solo_lectura_basico')) return { texto: 'Con Básico editás solo tu última pizarra. Esta queda para mirar.', tipo: 'lectura' }
  if (m.includes('plan_vencido')) return { texto: 'Tu plan venció: renovalo para seguir editando. Tus ideas están guardadas.', tipo: 'plan' }
  if (m.includes('pizarra_muy_grande')) return { texto: 'Esta pizarra llegó al tamaño máximo. Empezá una nueva para seguir.', tipo: 'grande' }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { texto: 'Sin conexión. Se guarda cuando vuelva.', tipo: 'red' }
  return { texto: 'No se pudo guardar. Probá de nuevo.', tipo: 'otro' }
}
