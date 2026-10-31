// Documento del Altar (solo Premium): plantillas, limpieza del texto, conteos y PDF.
// La base (tabla documentos) vuelve a revisar todo: dueña, Premium, versión y tamaño.

export type DocumentoFila = {
  id: string; user_id: string; nombre: string; datos: { html?: string }; version: number
  borrada_en: string | null; created_at: string; updated_at: string
}

export const MAX_HOJAS = 50
export const MAX_CARACTERES_HTML = 600000 // la base corta en ~700 KB
export const PALABRAS_POR_MINUTO = 150 // hablando a cámara, tranquila

// colores (los mismos del diseño aprobado)
export const RESALTADORES = [
  { id: 'rosa', nombre: 'Rosa', color: '#F6D3D1' },
  { id: 'citrino', nombre: 'Citrino', color: '#F7ECD3' },
  { id: 'lavanda', nombre: 'Lavanda', color: '#E2DAEF' },
  { id: 'aventurina', nombre: 'Aventurina', color: '#D8EBDD' },
  { id: 'cielo', nombre: 'Cielo', color: '#C9D8F0' },
]
export const TINTAS_DOC = [
  { id: 'medianoche', nombre: 'Medianoche', color: '#27344A' },
  { id: 'crepusculo', nombre: 'Crepúsculo', color: '#626B91' },
  { id: 'rosaviejo', nombre: 'Rosa viejo', color: '#A65A6E' },
  { id: 'bordo', nombre: 'Bordó', color: '#A24B47' },
  { id: 'verde', nombre: 'Verde', color: '#3E7D57' },
  { id: 'oro', nombre: 'Oro', color: '#8A6A22' },
]

// Una sola plantilla: documento en blanco (29/10 se sacó «Guion de reel»; los documentos que ya se crearon con ella quedan igual)
export const PLANTILLAS_DOC = {
  blanco: { nombre: 'Documento', html: '<p><br></p>' },
} as const
export type PlantillaDoc = keyof typeof PLANTILLAS_DOC

// ── limpieza: solo quedan estilos de texto conocidos. Nada de scripts, imágenes, links ni estilos raros.
const BLOQUES = new Set(['P', 'H1', 'H2', 'H3', 'BLOCKQUOTE', 'UL', 'OL', 'LI'])
const EN_LINEA: Record<string, string> = { B: 'b', STRONG: 'b', I: 'i', EM: 'i', U: 'u' }
const SE_BORRAN = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'IMG', 'VIDEO', 'AUDIO', 'SVG', 'MATH', 'TEMPLATE', 'NOSCRIPT', 'LINK', 'META', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'FORM', 'CANVAS', 'HEAD', 'TITLE'])
const COLOR_OK = /^(#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\))$/i

function estiloSeguro(el: HTMLElement): string {
  const partes: string[] = []
  const c = el.style?.color?.trim()
  const f = el.style?.backgroundColor?.trim()
  if (c && COLOR_OK.test(c)) partes.push(`color: ${c}`)
  if (f && COLOR_OK.test(f) && f !== 'rgba(0, 0, 0, 0)' && f !== 'transparent') partes.push(`background-color: ${f}`)
  return partes.join('; ')
}

function limpiarNodo(n: Node, destino: Node, doc: Document, enBloque: boolean) {
  if (n.nodeType === 3) { destino.appendChild(doc.createTextNode(n.textContent || '')); return }
  if (n.nodeType !== 1) return
  const el = n as HTMLElement
  const tag = el.tagName.toUpperCase()
  if (SE_BORRAN.has(tag)) return
  if (tag === 'BR') { destino.appendChild(doc.createElement('br')); return }
  if (tag === 'DIV' && el.getAttribute('data-salto') === '1') {
    const s = doc.createElement('div')
    s.setAttribute('data-salto', '1'); s.setAttribute('contenteditable', 'false'); s.className = 'doc-salto'
    destino.appendChild(s); return
  }
  let nuevo: HTMLElement | null = null
  if (BLOQUES.has(tag)) { nuevo = doc.createElement(tag.toLowerCase()); const a = alineacionDe(el); if (a) nuevo.setAttribute('style', `text-align: ${a}`) }
  else if (EN_LINEA[tag]) nuevo = doc.createElement(EN_LINEA[tag])
  else if (tag === 'SPAN' || tag === 'FONT' || tag === 'MARK') {
    const est = tag === 'FONT' ? (el.getAttribute('color') && COLOR_OK.test(el.getAttribute('color')!) ? `color: ${el.getAttribute('color')}` : '') : estiloSeguro(el)
    const neg = el.style?.fontWeight && (el.style.fontWeight === 'bold' || +el.style.fontWeight >= 600)
    const cur = el.style?.fontStyle === 'italic'
    const sub = (el.style?.textDecorationLine || el.style?.textDecoration || '').includes('underline')
    if (est) { nuevo = doc.createElement('span'); nuevo.setAttribute('style', est) }
    if (neg || cur || sub) {
      // pegado desde Google Docs y similares: negrita/cursiva/subrayado vienen como estilos
      let dentro: Node = destino
      const envolver = (t: string) => { const x = doc.createElement(t); dentro.appendChild(x); dentro = x }
      if (nuevo) { dentro.appendChild(nuevo); dentro = nuevo }
      if (neg) envolver('b'); if (cur) envolver('i'); if (sub) envolver('u')
      el.childNodes.forEach(h => limpiarNodo(h, dentro, doc, enBloque))
      return
    }
  } else if (tag === 'DIV' || tag === 'SECTION' || tag === 'ARTICLE' || tag === 'HEADER' || tag === 'FOOTER' || tag === 'TABLE' || tag === 'TR') {
    // contenedores de otras páginas: pasan a párrafo si están afuera de un bloque
    if (!enBloque) nuevo = doc.createElement('p')
  } else if (tag === 'H4' || tag === 'H5' || tag === 'H6') nuevo = doc.createElement('h2')
  if (!nuevo) { el.childNodes.forEach(h => limpiarNodo(h, destino, doc, enBloque)); if (tag === 'TD') destino.appendChild(doc.createTextNode(' ')); return }
  destino.appendChild(nuevo)
  const esBloque = BLOQUES.has(nuevo.tagName) || nuevo.tagName === 'P'
  // el navegador a veces pone el resaltado o el color en la misma negrita o párrafo: se pasa a un span adentro
  let dentro: HTMLElement = nuevo
  if ((BLOQUES.has(tag) || EN_LINEA[tag]) && tag !== 'UL' && tag !== 'OL') {
    const est = estiloSeguro(el)
    if (est) { const sp = doc.createElement('span'); sp.setAttribute('style', est); nuevo.appendChild(sp); dentro = sp }
  }
  el.childNodes.forEach(h => limpiarNodo(h, dentro, doc, enBloque || esBloque))
}

// alineación del texto: solo centrado o a la derecha (a la izquierda es lo normal y no se guarda)
export function alineacionDe(el: Element): 'center' | 'right' | '' {
  const h = el as HTMLElement
  const v = String(h.style?.textAlign || el.getAttribute('align') || '').trim().toLowerCase().replace('-webkit-', '').replace('-moz-', '')
  return v === 'center' ? 'center' : v === 'right' || v === 'end' ? 'right' : ''
}
const copiarAlineacion = (de: Element, a: HTMLElement) => { const x = alineacionDe(de); if (x) a.setAttribute('style', `text-align: ${x}`) }

// arma el html limpio y se asegura de que arriba de todo haya solo bloques (párrafos, títulos, listas…)
export function limpiarHtml(html: string): string {
  if (typeof window === 'undefined') return ''
  const doc = new DOMParser().parseFromString(`<body>${html || ''}</body>`, 'text/html')
  const out = document.implementation.createHTMLDocument('')
  const raiz = out.createElement('div')
  doc.body.childNodes.forEach(n => limpiarNodo(n, raiz, out, false))
  // texto o negritas sueltas arriba de todo → van adentro de un párrafo
  const final = out.createElement('div')
  let suelto: HTMLElement | null = null
  Array.from(raiz.childNodes).forEach(n => {
    const esBloque = n.nodeType === 1 && (BLOQUES.has((n as HTMLElement).tagName) || (n as HTMLElement).getAttribute?.('data-salto') === '1')
    if (esBloque) { suelto = null; final.appendChild(n) }
    else {
      if (n.nodeType === 3 && !(n.textContent || '').trim() && !suelto) return
      if (!suelto) { suelto = out.createElement('p'); final.appendChild(suelto) }
      suelto.appendChild(n)
    }
  })
  // listas: solo <li> adentro; <li> sueltos van a una lista
  final.querySelectorAll('ul,ol').forEach(l => {
    Array.from(l.childNodes).forEach(h => { if (!(h.nodeType === 1 && (h as HTMLElement).tagName === 'LI')) { const li = out.createElement('li'); l.insertBefore(li, h); li.appendChild(h) } })
    if (!l.childNodes.length) l.remove()
  })
  final.querySelectorAll(':scope > li').forEach(li => { const ul = out.createElement('ul'); final.insertBefore(ul, li); ul.appendChild(li) })
  // un bloque adentro de otro (por ejemplo, párrafos pegados adentro de una cita) se separa en bloques uno al lado del otro
  const esBloqueEl = (n: Node) => n.nodeType === 1 && (BLOQUES.has((n as HTMLElement).tagName) || (n as HTMLElement).getAttribute('data-salto') === '1')
  const aplanar = (el: HTMLElement): Node[] => {
    if (el.tagName === 'UL' || el.tagName === 'OL' || el.getAttribute('data-salto') === '1') return [el]
    if (!Array.from(el.childNodes).some(esBloqueEl)) return [el]
    const salida: Node[] = []
    let actual: HTMLElement | null = null
    Array.from(el.childNodes).forEach(h => {
      if (esBloqueEl(h)) {
        actual = null
        const hijo = h as HTMLElement
        if (el.tagName === 'BLOCKQUOTE' && hijo.tagName === 'P') {
          const q = out.createElement('blockquote'); copiarAlineacion(hijo, q); Array.from(hijo.childNodes).forEach(x => q.appendChild(x)); salida.push(...aplanar(q))
        } else salida.push(...aplanar(hijo))
      } else {
        if (h.nodeType === 3 && !(h.textContent || '').trim() && !actual) return
        if (!actual) { actual = out.createElement(el.tagName === 'LI' ? 'p' : el.tagName.toLowerCase()); copiarAlineacion(el, actual); salida.push(actual) }
        actual.appendChild(h)
      }
    })
    return salida
  }
  Array.from(final.children).forEach(c => { const partes = aplanar(c as HTMLElement); if (partes.length !== 1 || partes[0] !== c) { partes.forEach(x => final.insertBefore(x, c)); c.remove() } })
  // bloques vacíos llevan un <br> para que se pueda escribir adentro
  final.querySelectorAll('p,h1,h2,h3,blockquote,li').forEach(b => { if (!b.textContent && !b.querySelector('br')) b.appendChild(out.createElement('br')) })
  if (!final.childNodes.length) final.innerHTML = '<p><br></p>'
  return final.innerHTML
}

// ── conteos
export function textoPlano(html: string): string {
  if (typeof window === 'undefined') return ''
  const d = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  d.querySelectorAll('p,h1,h2,h3,li,blockquote').forEach(b => b.append(' '))
  return (d.body.textContent || '').replace(/\s+/g, ' ').trim()
}
export const contarPalabras = (texto: string) => (texto.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) || []).length
export function tiempoEnVozAlta(palabras: number): string {
  if (!palabras) return '0 s'
  const seg = Math.round((palabras / PALABRAS_POR_MINUTO) * 60)
  if (seg < 60) return `${Math.max(5, Math.round(seg / 5) * 5)} s`
  const min = Math.floor(seg / 60), resto = Math.round((seg % 60) / 15) * 15
  return resto === 0 || resto === 60 ? `${min + (resto === 60 ? 1 : 0)} min` : `${min} min ${resto} s`
}
// primer título del documento (para la tarjeta del Altar)
export function primerTitulo(html: string): string {
  if (typeof window === 'undefined') return ''
  const d = new DOMParser().parseFromString(`<body>${html || ''}</body>`, 'text/html')
  return (d.querySelector('h1')?.textContent || d.querySelector('h2,p')?.textContent || '').trim().slice(0, 80)
}

// ── errores de la base → mensaje claro
export function mensajeDocumento(e: any): { texto: string; tipo: 'plan' | 'grande' | 'limite' | 'red' | 'otro' } {
  const m = String(e?.message || e || '')
  if (m.includes('documento_solo_premium') || m.includes('row-level security')) return { texto: 'El Documento es de Premium. Tus textos quedan guardados y vuelven cuando tengas Premium.', tipo: 'plan' }
  if (m.includes('documento_muy_grande')) return { texto: 'Este documento llegó al tamaño máximo. Empezá uno nuevo para seguir.', tipo: 'grande' }
  if (m.includes('limite_documentos')) return { texto: 'Llegaste a 300 documentos. Borrá alguno de la papelera para crear otro.', tipo: 'limite' }
  if (m.includes('relation') && m.includes('documentos')) return { texto: 'El Documento todavía no está activado en tu cuenta. Avisale a Luma.', tipo: 'otro' }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { texto: 'Sin conexión. Se guarda cuando vuelva.', tipo: 'red' }
  return { texto: 'No se pudo guardar. Probá de nuevo.', tipo: 'otro' }
}

// ── PDF: se arma en la compu o el celu con la ventana de imprimir («Guardar como PDF»). No se sube a ningún lado.
export type OpcionesPdf = { numeros: boolean; encabezado: boolean; resaltados: boolean; tituloEnHojaNueva: boolean }
const escapar = (t: string) => t.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

export function htmlParaImprimir(nombreDoc: string, autora: string, html: string, o: OpcionesPdf): string {
  const limpio = limpiarHtml(html)
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapar(nombreDoc)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,600..900,100&family=Nunito:ital,wght@0,500;0,600;0,700;0,800;0,900;1,600&display=swap">
<style>
@page{size:A4;margin:22mm 20mm 20mm}
${o.numeros ? '@page{@bottom-center{content:counter(page) " de " counter(pages);font:700 9pt Nunito,sans-serif;color:#9A9CAE}}' : ''}
*{box-sizing:border-box}
html,body{margin:0;background:#fff;color:#27344A;font:500 11.5pt/1.65 Nunito,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.enc{position:fixed;top:-14mm;left:0;right:0;display:flex;justify-content:space-between;font:700 8.5pt Nunito,sans-serif;color:#9A9CAE;border-bottom:1px solid #EFE7DB;padding-bottom:2mm}
h1{font:900 22pt/1.1 Fraunces,Georgia,serif;font-variation-settings:'SOFT' 100;margin:0 0 8pt}
h2{font:800 14pt/1.2 Fraunces,Georgia,serif;font-variation-settings:'SOFT' 100;margin:14pt 0 4pt;break-after:avoid}
h3{font:900 8.5pt Nunito,sans-serif;letter-spacing:.16em;color:#626B91;margin:0 0 6pt;text-transform:uppercase}
p{margin:0 0 7pt}
blockquote{margin:8pt 0;padding-left:10pt;border-left:3px solid #A99BB8;font-style:italic;color:#4C5580}
ul,ol{margin:0 0 7pt;padding-left:18pt}
blockquote[style*="text-align: right"]{border-left:0;padding-left:0;border-right:3px solid #A99BB8;padding-right:10pt}
blockquote[style*="text-align: center"]{border-left:0;padding-left:0;border-top:3px solid #A99BB8;padding-top:6pt}
li[style*="text-align: center"],li[style*="text-align: right"]{list-style-position:inside}
.doc-salto{break-after:page;height:0;border:0;margin:0}
.doc-salto *{display:none}
${o.tituloEnHojaNueva ? 'h1:not(:first-of-type){break-before:page}' : ''}
${o.resaltados ? '' : 'span[style*="background"]{background:none !important}'}
.aviso{font:700 12pt Nunito,sans-serif;color:#27344A;background:#F7ECD3;border-radius:12px;padding:12px 14px;margin:12px}
.aviso button{display:block;margin-top:10px;width:100%;height:48px;border:none;border-radius:12px;background:#27344A;color:#F0E6D8;font:900 15px Nunito,sans-serif}
@media print{.aviso{display:none}}
@media screen{body{max-width:210mm;margin:0 auto;padding:12px 16px 40px}.enc{position:static;margin-bottom:12px}}
</style></head><body>
<div class="aviso" id="aviso">Para guardarlo: tocá el botón y elegí <b>«Guardar como PDF»</b>.<button type="button" onclick="window.print()">Guardar como PDF</button></div>
${o.encabezado ? `<div class="enc"><span>${escapar(autora)}</span><span>${escapar(nombreDoc)}</span></div>` : ''}
<main>${limpio}</main>
</body></html>`
}
