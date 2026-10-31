// Plantillas de las páginas públicas (reservas, curso, descargable y checkout) · etapa 7
// Cada plantilla tiene una versión clara y una oscura sobre la misma estructura.
// Los nombres son los mismos de antes (luna, violeta, aura, tierra, rosa, verde), así nadie se queda sin plantilla.

export type IdPlantilla = 'tierra' | 'luna' | 'verde' | 'violeta' | 'aura' | 'rosa'
export type ModoPlantilla = 'claro' | 'oscuro'

type Colores = {
  fondo: string; superficie: string; banda: string; texto: string; suave: string; label: string
  acento: string; sobreAcento: string; chip: string; chipTxt: string; foto: string; fotoTxt: string
  linea: string; icono: string; ondaOff: string; final: string; finalTxt: string; finalSuave: string
  ctaFinalFondo: string; ctaFinalTxt: string
}

export const PLANTILLAS: { id: IdPlantilla; nombre: string; desc: string; deco: string; muestra: string[] }[] = [
  { id: 'luna', nombre: 'Luna', desc: 'Profunda · Mística', deco: '✦', muestra: ['#D8E2E8', '#493A54', '#191020', '#722548', '#9882B9'] },
  { id: 'violeta', nombre: 'Violeta', desc: 'Mágica · Serena', deco: '✧', muestra: ['#4C5B76', '#6282B3', '#7A6FD9', '#C57FFA', '#CBC3F8'] },
  { id: 'tierra', nombre: 'Tierra', desc: 'Cálida · Natural', deco: '❧', muestra: ['#371E13', '#5E2A25', '#C0AA8A', '#E1D3A9', '#A85530'] },
  { id: 'verde', nombre: 'Verde', desc: 'Fresca · Sanadora', deco: '❧', muestra: ['#F5ECBF', '#C2DE9B', '#B07B7B', '#82735C', '#4B3B40'] },
  { id: 'aura', nombre: 'Aura', desc: 'Luminosa · Alegre', deco: '◈', muestra: ['#D57530', '#FFBC92', '#FBF8E0', '#EEE47D', '#9FB768'] },
  { id: 'rosa', nombre: 'Rosa', desc: 'Suave · Romántica', deco: '✿', muestra: ['#F7DAA3', '#FF9FC2', '#FD8B7C', '#A26952'] },
]

// Modo que tenía cada una antes de la renovación (las viejas Luna y Violeta eran oscuras)
export const MODO_ANTERIOR: Record<IdPlantilla, ModoPlantilla> = {
  luna: 'oscuro', violeta: 'oscuro', aura: 'claro', tierra: 'claro', rosa: 'claro', verde: 'claro',
}

const COLORES: Record<IdPlantilla, Record<ModoPlantilla, Colores>> = {
  tierra: {
    claro: { fondo: '#F3EBD6', superficie: '#FFFAF0', banda: '#E1D3A9', texto: '#371E13', suave: '#5E4636', label: '#8E4424', acento: '#A85530', sobreAcento: '#FFF6E8', chip: '#EADFC4', chipTxt: '#5E2A25', foto: 'linear-gradient(170deg, #C0AA8A, #734F31)', fotoTxt: '#FFF6E8', linea: '#E4D6B8', icono: '#A85530', ondaOff: '#CDBB98', final: '#371E13', finalTxt: '#E1D3A9', finalSuave: '#C0AA8A', ctaFinalFondo: '#A85530', ctaFinalTxt: '#FFF6E8' },
    oscuro: { fondo: '#2A170F', superficie: '#3A2219', banda: '#3F2A1D', texto: '#F1E6C9', suave: '#C9B795', label: '#E08A5E', acento: '#D8794A', sobreAcento: '#2A170F', chip: '#4A2D20', chipTxt: '#E1D3A9', foto: 'linear-gradient(170deg, #8F7C3A, #5E2A25)', fotoTxt: '#F1E6C9', linea: '#4E3326', icono: '#D8794A', ondaOff: '#6B4A35', final: '#E1D3A9', finalTxt: '#371E13', finalSuave: '#5E4636', ctaFinalFondo: '#371E13', ctaFinalTxt: '#E1D3A9' },
  },
  luna: {
    claro: { fondo: '#D8E2E8', superficie: '#EEF2F5', banda: '#CFC8D6', texto: '#191020', suave: '#493A54', label: '#5D4E6A', acento: '#33263C', sobreAcento: '#D8E2E8', chip: '#C4BCCD', chipTxt: '#33263C', foto: 'linear-gradient(170deg, #A88E9F, #493A54)', fotoTxt: '#EEF2F5', linea: '#C4CDD4', icono: '#493A54', ondaOff: '#B7B0C0', final: '#191020', finalTxt: '#D8E2E8', finalSuave: '#A88E9F', ctaFinalFondo: '#A88E9F', ctaFinalTxt: '#191020' },
    oscuro: { fondo: '#110B14', superficie: '#221932', banda: '#2B0F22', texto: '#EDE6F4', suave: '#B9A9CC', label: '#C88AB0', acento: '#9882B9', sobreAcento: '#060407', chip: '#2E2340', chipTxt: '#D9CCEA', foto: 'linear-gradient(170deg, #722548, #221932)', fotoTxt: '#EDE6F4', linea: '#2E2340', icono: '#B79AD6', ondaOff: '#4A3A5C', final: '#541533', finalTxt: '#F3E6EE', finalSuave: '#D9A9C2', ctaFinalFondo: '#9882B9', ctaFinalTxt: '#060407' },
  },
  verde: {
    claro: { fondo: '#FBF6DF', superficie: '#FFFFFF', banda: '#E3EFCF', texto: '#4B3B40', suave: '#6B5C5F', label: '#8A5555', acento: '#4B3B40', sobreAcento: '#C2DE9B', chip: '#EAF2D9', chipTxt: '#4B3B40', foto: 'linear-gradient(170deg, #C2DE9B, #82735C)', fotoTxt: '#4B3B40', linea: '#EAE3C8', icono: '#82735C', ondaOff: '#D9D2B5', final: '#4B3B40', finalTxt: '#F5ECBF', finalSuave: '#C2DE9B', ctaFinalFondo: '#C2DE9B', ctaFinalTxt: '#4B3B40' },
    oscuro: { fondo: '#2F2528', superficie: '#4B3B40', banda: '#3A3A2C', texto: '#F5ECBF', suave: '#D8CFB0', label: '#C2DE9B', acento: '#C2DE9B', sobreAcento: '#2F2528', chip: '#5A4A4E', chipTxt: '#F5ECBF', foto: 'linear-gradient(170deg, #B07B7B, #82735C)', fotoTxt: '#F5ECBF', linea: '#5A4A4E', icono: '#C2DE9B', ondaOff: '#6E5E62', final: '#C2DE9B', finalTxt: '#2F2528', finalSuave: '#4B3B40', ctaFinalFondo: '#4B3B40', ctaFinalTxt: '#F5ECBF' },
  },
  violeta: {
    claro: { fondo: '#F3F1FD', superficie: '#FFFFFF', banda: '#E4DFFB', texto: '#2E3550', suave: '#5A6080', label: '#5D52C0', acento: '#6A5FD0', sobreAcento: '#FFFFFF', chip: '#E4DFFB', chipTxt: '#3E3590', foto: 'linear-gradient(170deg, #CBC3F8, #7A6FD9)', fotoTxt: '#2E3550', linea: '#E4E0F5', icono: '#7A6FD9', ondaOff: '#D3CCF5', final: '#4C5B76', finalTxt: '#F3F1FD', finalSuave: '#CBC3F8', ctaFinalFondo: '#CBC3F8', ctaFinalTxt: '#2E3550' },
    oscuro: { fondo: '#2B3245', superficie: '#3A4560', banda: '#353F58', texto: '#F1EEFF', suave: '#C7C3E2', label: '#D9A6FF', acento: '#C57FFA', sobreAcento: '#2B3245', chip: '#46527A', chipTxt: '#E4DFFB', foto: 'linear-gradient(170deg, #7A6FD9, #6282B3)', fotoTxt: '#F1EEFF', linea: '#46527A', icono: '#D9A6FF', ondaOff: '#5A6890', final: '#C57FFA', finalTxt: '#2B3245', finalSuave: '#3E3560', ctaFinalFondo: '#2B3245', ctaFinalTxt: '#F1EEFF' },
  },
  aura: {
    claro: { fondo: '#FBF8E0', superficie: '#FFFFFF', banda: '#FFE3CE', texto: '#4A3020', suave: '#6E5440', label: '#A8521A', acento: '#B0561A', sobreAcento: '#FFFFFF', chip: '#F6F0B8', chipTxt: '#5E4A10', foto: 'linear-gradient(170deg, #FFBC92, #D57530)', fotoTxt: '#4A3020', linea: '#F0E8C8', icono: '#D57530', ondaOff: '#EEDDBB', final: '#9FB768', finalTxt: '#2E3A16', finalSuave: '#3E4E20', ctaFinalFondo: '#FBF8E0', ctaFinalTxt: '#4A3020' },
    oscuro: { fondo: '#2E2418', superficie: '#3E3122', banda: '#38361E', texto: '#FBF8E0', suave: '#E3D9B8', label: '#FFBC92', acento: '#FFBC92', sobreAcento: '#2E2418', chip: '#4E4028', chipTxt: '#EEE47D', foto: 'linear-gradient(170deg, #D57530, #9FB768)', fotoTxt: '#FBF8E0', linea: '#4E4028', icono: '#EEE47D', ondaOff: '#6A5A3E', final: '#EEE47D', finalTxt: '#2E2418', finalSuave: '#5E4A10', ctaFinalFondo: '#2E2418', ctaFinalTxt: '#FBF8E0' },
  },
  rosa: {
    claro: { fondo: '#FFF4F0', superficie: '#FFFFFF', banda: '#FFE0EC', texto: '#4E2E22', suave: '#7A5446', label: '#B4466E', acento: '#FF9FC2', sobreAcento: '#4E2E22', chip: '#FCE8C8', chipTxt: '#6E4430', foto: 'linear-gradient(170deg, #F7DAA3, #FD8B7C)', fotoTxt: '#4E2E22', linea: '#F5E1DA', icono: '#C2577A', ondaOff: '#F2D3C8', final: '#A26952', finalTxt: '#FFF4F0', finalSuave: '#F7DAA3', ctaFinalFondo: '#FF9FC2', ctaFinalTxt: '#4E2E22' },
    oscuro: { fondo: '#3A2219', superficie: '#4E3024', banda: '#5A3428', texto: '#FFEFE6', suave: '#EBC9B8', label: '#FF9FC2', acento: '#FF9FC2', sobreAcento: '#3A2219', chip: '#6A4232', chipTxt: '#F7DAA3', foto: 'linear-gradient(170deg, #FD8B7C, #A26952)', fotoTxt: '#FFEFE6', linea: '#6A4232', icono: '#FF9FC2', ondaOff: '#7E5646', final: '#F7DAA3', finalTxt: '#3A2219', finalSuave: '#6E4430', ctaFinalFondo: '#3A2219', ctaFinalTxt: '#FFEFE6' },
  },
}

// ── utilidades de color ─────────────────────────────────────────────────────
function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
export function luminosidad(hex: string): number {
  const [r, g, b] = rgb(hex).map(v => v / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export function alfa(hex: string, a: number): string {
  const [r, g, b] = rgb(hex)
  return `rgba(${r},${g},${b},${a})`
}
function mezclar(a: string, b: string, p: number): string {
  const x = rgb(a), y = rgb(b)
  const m = x.map((v, i) => Math.round(v * (1 - p) + y[i] * p))
  return '#' + m.map(v => v.toString(16).padStart(2, '0')).join('')
}

export function plantillaValida(id: unknown): IdPlantilla {
  return PLANTILLAS.some(p => p.id === id) ? (id as IdPlantilla) : 'luna'
}
export function modoValido(modo: unknown, id: IdPlantilla): ModoPlantilla {
  return modo === 'claro' || modo === 'oscuro' ? modo : MODO_ANTERIOR[id]
}

const TITULO = "'Cormorant Garamond', serif"
const CUERPO = "'Inter', sans-serif"
export const FUENTES_GOOGLE = 'Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Inter:wght@400;500;600;700;800'

// Devuelve la plantilla con los nombres de siempre (bg, primary, cream…) para que todo lo que ya existía
// en las páginas siga funcionando, más los colores nuevos (superficie, banda, acento…).
// Nunca falla: si el valor guardado es raro, usa la equivalente o Luna.
export function temaPublico(template?: string | null, modo?: string | null) {
  const id = plantillaValida(template)
  const m = modoValido(modo, id)
  const c = COLORES[id][m]
  const claro = luminosidad(c.fondo) > 0.5
  const info = PLANTILLAS.find(p => p.id === id)!
  return {
    id, modo: m, nombre: `${info.nombre} ${m === 'claro' ? 'claro' : 'oscuro'}`,
    // nombres de siempre
    bg: c.fondo, bg2: c.banda, bg3: c.chip,
    primary: c.label, primaryLight: c.acento, primaryDim: alfa(c.acento, 0.28),
    accent: c.acento, accentLight: mezclar(c.acento, '#FFFFFF', 0.35), accentDim: alfa(c.acento, 0.16),
    text: c.suave, textDim: mezclar(c.suave, c.fondo, 0.25), cream: c.texto,
    border: alfa(c.texto, 0.14),
    fontTitle: TITULO, fontBody: CUERPO, fontSubtitle: CUERPO,
    googleFonts: FUENTES_GOOGLE,
    deco: info.deco, stars: !claro, dark: !claro,
    cardBg: c.superficie, heroBg: c.fondo,
    navBg: alfa(c.fondo, 0.94),
    btnBg: c.acento, btnColor: c.sobreAcento,
    // nuevos
    ...c,
    claro,
    // patrón de lunitas y luz del botón: según la luminosidad REAL del fondo
    patronFondo: claro ? '/landing/fondo-claro.png' : '/landing/fondo-pagina-publica.png',
    luz: claro ? c.texto : '#FFFFFF',
  }
}
export type TemaPublico = ReturnType<typeof temaPublico>

// Video de presentación: solo YouTube. Devuelve el id o '' si el link no sirve.
export function idYouTube(url?: string | null): string {
  const u = (url || '').trim()
  if (!u) return ''
  const m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  return m ? m[1] : ''
}

export const COMO_FUNCIONA_DEFAULT = { mostrar: true, pasos: ['Elegí tu sesión', 'Elegí día y hora', 'Confirmá y listo'] }
export type ComoFunciona = { mostrar: boolean; pasos: string[] }
export function comoFuncionaValido(v: unknown): ComoFunciona {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<ComoFunciona>
  const pasos = Array.isArray(o.pasos) ? o.pasos.slice(0, 3).map(p => String(p ?? '').slice(0, 60)) : []
  while (pasos.length < 3) pasos.push(COMO_FUNCIONA_DEFAULT.pasos[pasos.length])
  return { mostrar: typeof o.mostrar === 'boolean' ? o.mostrar : true, pasos }
}
