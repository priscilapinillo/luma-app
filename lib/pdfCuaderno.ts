// Arma el PDF del cuaderno de la alumna dibujando cada hoja (A4) en el celular o la compu.
// Así se ve igual que en pantalla: papel crema, resaltados de colores, minutos dorados y capturas.
// Se arma hoja por hoja para que no se cuelgue en celulares con poca memoria.

import { pdfDeCanvas } from '@/lib/pdfImagenes'
import { cargarFuentes, cargarImagen } from '@/lib/dibujos'
import { formatoMinuto } from '@/lib/aula'

export type BloqueCuaderno =
  | { tipo: 'modulo'; texto: string }
  | { tipo: 'leccion'; texto: string; nota?: string }
  | { tipo: 'nota'; html: string }
  | { tipo: 'momento'; segundo: number | null; texto: string }
  | { tipo: 'frase'; texto: string }
  | { tipo: 'captura'; url: string | null; segundo: number | null }

const W = 1240, H = 1754, M = 110 // A4 a 150 dpi
const COLOR_MARCA: Record<string, string> = { m1: '#FDE68A', m2: '#E9D5FF', m3: '#FBCFE8' }
type Pieza = { t: string; marca?: string; b?: boolean; i?: boolean }

// convierte el HTML (ya limpio) del cuaderno en renglones de piezas con su estilo
function piezasDeHtml(html: string): Pieza[][] {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const parrafos: Pieza[][] = [[]]
  const recorrer = (n: Node, estilo: Omit<Pieza, 't'>) => {
    if (n.nodeType === Node.TEXT_NODE) {
      const partes = (n.textContent || '').split('\n')
      partes.forEach((p, i) => { if (i > 0) parrafos.push([]); if (p) parrafos[parrafos.length - 1].push({ t: p, ...estilo }) })
      return
    }
    if (n.nodeType !== Node.ELEMENT_NODE) return
    const el = n as Element
    const tag = el.tagName.toLowerCase()
    if (tag === 'br') { parrafos.push([]); return }
    const nuevo = { ...estilo }
    if (tag === 'mark') nuevo.marca = COLOR_MARCA[el.className] || COLOR_MARCA.m1
    if (tag === 'b') nuevo.b = true
    if (tag === 'i') nuevo.i = true
    const bloque = tag === 'div' || tag === 'p'
    if (bloque && parrafos[parrafos.length - 1].length) parrafos.push([])
    el.childNodes.forEach(h => recorrer(h, nuevo))
    if (bloque) parrafos.push([])
  }
  doc.body.firstElementChild?.childNodes.forEach(h => recorrer(h, {}))
  while (parrafos.length && parrafos[parrafos.length - 1].length === 0) parrafos.pop()
  return parrafos
}

export async function pdfDelCuaderno(titulo: string, subtitulo: string, bloques: BloqueCuaderno[], alAvanzar?: (hoja: number) => void): Promise<Blob> {
  await cargarFuentes()
  const hojas: HTMLCanvasElement[] = []
  let c!: HTMLCanvasElement, ctx!: CanvasRenderingContext2D, y = 0

  const nuevaHoja = () => {
    c = document.createElement('canvas'); c.width = W; c.height = H
    ctx = c.getContext('2d') as CanvasRenderingContext2D
    ctx.fillStyle = '#FFFDF7'; ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = '#EADFC4'; ctx.lineWidth = 2; ctx.strokeRect(40, 40, W - 80, H - 80)
    ctx.fillStyle = '#B9AE96'; ctx.font = '400 20px Jost, sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(`${titulo} · Mi cuaderno · Luma`, W / 2, H - 62)
    ctx.textAlign = 'left'
    hojas.push(c); y = M
    alAvanzar?.(hojas.length)
  }
  const lugar = async (alto: number) => {
    if (y + alto > H - M - 20) { await new Promise(r => setTimeout(r, 0)); nuevaHoja() }
  }
  const fuente = (p: { b?: boolean; i?: boolean }, px: number) => `${p.i ? 'italic ' : ''}${p.b ? 700 : 400} ${px}px Jost, sans-serif`

  // escribe piezas con resaltado, partiendo en renglones
  const escribir = async (parrafos: Pieza[][], px: number, x0: number, ancho: number, color: string, interlinea = 1.55) => {
    const lh = px * interlinea
    for (const par of parrafos) {
      if (par.length === 0) { y += lh * 0.6; continue }
      // separamos en palabras manteniendo el estilo
      const palabras: Pieza[] = []
      for (const p of par) p.t.split(/(\s+)/).forEach(t => { if (t) palabras.push({ ...p, t }) })
      let linea: Pieza[] = [], anchoLinea = 0
      const volcar = async () => {
        await lugar(lh)
        let x = x0
        for (const p of linea) {
          ctx.font = fuente(p, px)
          const w = ctx.measureText(p.t).width
          if (p.marca) { ctx.fillStyle = p.marca; ctx.fillRect(x - 1, y + px * 0.12, w + 2, px * 1.18) }
          ctx.fillStyle = color; ctx.textBaseline = 'top'
          ctx.fillText(p.t, x, y + px * 0.2)
          x += w
        }
        y += lh; linea = []; anchoLinea = 0
      }
      for (const p of palabras) {
        ctx.font = fuente(p, px)
        let w = ctx.measureText(p.t).width
        if (anchoLinea + w > ancho && linea.length) {
          await volcar()
          if (/^\s+$/.test(p.t)) continue
        }
        // palabra más larga que el renglón: la cortamos
        let resto = p.t
        while (w > ancho) {
          let n = resto.length
          while (n > 1 && ctx.measureText(resto.slice(0, n)).width > ancho) n--
          linea.push({ ...p, t: resto.slice(0, n) }); await volcar()
          resto = resto.slice(n); w = ctx.measureText(resto).width
        }
        linea.push({ ...p, t: resto }); anchoLinea += w
      }
      if (linea.length) await volcar()
    }
  }

  nuevaHoja()
  // portada chiquita arriba de la primera hoja
  ctx.fillStyle = '#A8862E'; ctx.font = '600 22px Jost, sans-serif'; ctx.textBaseline = 'top'
  ctx.fillText('✦  MI CUADERNO', M, y); y += 44
  ctx.fillStyle = '#2A1B12'; ctx.font = '600 54px "Cormorant Garamond", serif'
  await escribir([[{ t: titulo }]], 50, M, W - 2 * M, '#2A1B12', 1.2)
  ctx.fillStyle = '#8C7A55'; ctx.font = '400 22px Jost, sans-serif'
  ctx.fillText(subtitulo, M, y + 6); y += 60
  ctx.strokeStyle = '#C9A84C'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(M, y); ctx.lineTo(M + 120, y); ctx.stroke(); y += 40

  for (const b of bloques) {
    ctx.textBaseline = 'top'
    if (b.tipo === 'modulo') {
      await lugar(240)
      y += 18
      ctx.fillStyle = '#A8862E'; ctx.font = '600 20px Jost, sans-serif'
      ctx.fillText('MÓDULO', M, y); y += 32
      await escribir([[{ t: b.texto, b: true }]], 34, M, W - 2 * M, '#2A1B12', 1.3)
      y += 8
    } else if (b.tipo === 'leccion') {
      await lugar(150)
      y += 10
      await escribir([[{ t: b.texto, b: true }]], 28, M, W - 2 * M, '#5B4520', 1.35)
      if (b.nota) await escribir([[{ t: b.nota, i: true }]], 20, M, W - 2 * M, '#B45309')
      y += 6
    } else if (b.tipo === 'nota') {
      await escribir(piezasDeHtml(b.html), 25, M, W - 2 * M, '#262626')
      y += 14
    } else if (b.tipo === 'momento') {
      await lugar(44)
      const etiqueta = `📍 ${formatoMinuto(b.segundo)}`
      ctx.font = '700 23px Jost, sans-serif'
      const w = ctx.measureText(etiqueta).width + 20
      ctx.fillStyle = '#FBF3DF'; ctx.fillRect(M, y + 2, w, 34)
      ctx.fillStyle = '#A8862E'; ctx.fillText(etiqueta, M + 10, y + 7)
      const yAntes = y
      await escribir([[{ t: b.texto || 'Momento marcado' }]], 24, M + w + 14, W - 2 * M - w - 14, '#404040')
      if (y === yAntes) y += 40
      y += 8
    } else if (b.tipo === 'frase') {
      await lugar(50)
      const yIni = y
      await escribir([[{ t: `“${b.texto}”`, i: true }]], 25, M + 26, W - 2 * M - 26, '#3B2A12')
      ctx.fillStyle = '#C9A84C'; ctx.fillRect(M, yIni + 4, 5, Math.max(30, y - yIni - 8))
      y += 12
    } else if (b.tipo === 'captura') {
      let img: HTMLImageElement | null = null
      if (b.url) { try { img = await cargarImagen(b.url) } catch { img = null } }
      if (img) {
        const maxW = W - 2 * M, maxH = 620
        const k = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1.5)
        const iw = img.naturalWidth * k, ih = img.naturalHeight * k
        await lugar(ih + (b.segundo != null ? 40 : 10))
        if (b.segundo != null) { ctx.fillStyle = '#A8862E'; ctx.font = '700 21px Jost, sans-serif'; ctx.fillText(`📷 ${formatoMinuto(b.segundo)}`, M, y); y += 34 }
        ctx.drawImage(img, M, y, iw, ih)
        ctx.strokeStyle = '#EFE4C9'; ctx.lineWidth = 2; ctx.strokeRect(M, y, iw, ih)
        y += ih + 20
      } else {
        await escribir([[{ t: '📷 Captura (no se pudo cargar)', i: true }]], 21, M, W - 2 * M, '#B9AE96')
      }
    }
  }
  return pdfDeCanvas(hojas, 595, 842, 0.82)
}
