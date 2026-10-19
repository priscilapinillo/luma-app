// Dibujos en canvas: la imagen para la historia de Instagram y el certificado de Luma para el PDF.
// Todo se dibuja junto (fondo, marcos, luna y letras) en una sola imagen:
// así el fondo nunca se pierde al compartir o descargar.

export type DatosLogro = {
  alumna: string
  curso: string
  terapeuta: string
  fecha: Date
  esCertificado: boolean
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

let fuentesListas: Promise<void> | null = null
// Espera a que estén las letras (Avigea, Cormorant, Jost). Si alguna no carga en 6 segundos, sigue con la de respaldo.
export function cargarFuentes(): Promise<void> {
  if (fuentesListas) return fuentesListas
  fuentesListas = (async () => {
    if (typeof document === 'undefined' || !('fonts' in document)) return
    try {
      if (![...document.fonts].some(f => f.family.replace(/['"]/g, '') === 'Avigea')) {
        const avigea = new FontFace('Avigea', "url('/fonts/Avigea.ttf')")
        document.fonts.add(await avigea.load())
      }
    } catch { /* sin Avigea: usa Cormorant */ }
    const pedidos = ['400 40px Avigea', '600 40px "Cormorant Garamond"', 'italic 400 40px "Cormorant Garamond"', 'italic 600 40px "Cormorant Garamond"', '500 40px "Cormorant Garamond"', '400 20px Jost', '600 20px Jost']
    await Promise.race([
      Promise.all(pedidos.map(p => document.fonts.load(p).catch(() => null))),
      new Promise(r => setTimeout(r, 6000)),
    ])
  })()
  return fuentesListas
}

export function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, mal) => {
    const img = new Image()
    // imágenes de Supabase: sin esto el navegador no deja convertir el dibujo en PDF
    if (/^https?:/i.test(src) && !src.startsWith(window.location.origin)) img.crossOrigin = 'anonymous'
    img.onload = () => ok(img)
    img.onerror = () => mal(new Error('No cargó ' + src))
    img.src = src
  })
}

// texto con espacio entre letras (funciona aunque el navegador no tenga letterSpacing)
function textoEspaciado(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, espacio: number) {
  const letras = [...texto]
  const anchos = letras.map(l => ctx.measureText(l).width)
  const total = anchos.reduce((a, b) => a + b, 0) + espacio * (letras.length - 1)
  const alin = ctx.textAlign
  let cx = alin === 'center' ? x - total / 2 : alin === 'right' ? x - total : x
  ctx.textAlign = 'left'
  letras.forEach((l, i) => { ctx.fillText(l, cx, y); cx += anchos[i] + espacio })
  ctx.textAlign = alin
  return total
}

// parte un texto en renglones que entren en "ancho"
function renglones(ctx: CanvasRenderingContext2D, texto: string, ancho: number): string[] {
  const palabras = texto.split(/\s+/).filter(Boolean)
  const out: string[] = []
  let linea = ''
  for (const p of palabras) {
    const prueba = linea ? linea + ' ' + p : p
    if (ctx.measureText(prueba).width <= ancho || !linea) linea = prueba
    else { out.push(linea); linea = p }
  }
  if (linea) out.push(linea)
  // palabra sola más ancha que el renglón: la cortamos
  return out.flatMap(l => {
    if (ctx.measureText(l).width <= ancho) return [l]
    const partes: string[] = []; let t = ''
    for (const ch of l) { if (ctx.measureText(t + ch).width > ancho && t) { partes.push(t); t = ch } else t += ch }
    if (t) partes.push(t)
    return partes
  })
}

// achica la letra hasta que el texto entre en maxRenglones (nombres y cursos largos)
function ajustar(ctx: CanvasRenderingContext2D, texto: string, fuente: (px: number) => string, desde: number, minimo: number, ancho: number, maxRenglones: number) {
  for (let px = desde; px >= minimo; px -= 2) {
    ctx.font = fuente(px)
    const r = renglones(ctx, texto, ancho)
    if (r.length <= maxRenglones) return { px, r }
  }
  ctx.font = fuente(minimo)
  const r = renglones(ctx, texto, ancho)
  if (r.length > maxRenglones) {
    const cortado = r.slice(0, maxRenglones)
    let ult = cortado[maxRenglones - 1]
    while (ult.length > 1 && ctx.measureText(ult + '…').width > ancho) ult = ult.slice(0, -1)
    cortado[maxRenglones - 1] = ult + '…'
    return { px: minimo, r: cortado }
  }
  return { px: minimo, r }
}

function rectRedondo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// la misma luna llena del aula (con cráteres y brillo)
export function dibujarLunaLlena(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const k = r / 40
  const brillo = ctx.createRadialGradient(cx, cy, 0, cx, cy, 55 * k)
  brillo.addColorStop(0, 'rgba(247,231,180,0.55)')
  brillo.addColorStop(0.55, 'rgba(247,231,180,0.55)')
  brillo.addColorStop(1, 'rgba(247,231,180,0)')
  ctx.fillStyle = brillo
  ctx.beginPath(); ctx.arc(cx, cy, 55 * k, 0, Math.PI * 2); ctx.fill()

  const sup = ctx.createRadialGradient(cx - 10 * k, cy - 12 * k, 0, cx - 10 * k, cy - 12 * k, 56 * k)
  sup.addColorStop(0, '#FFFBF0'); sup.addColorStop(0.65, '#F1E9D6'); sup.addColorStop(1, '#D9CCAE')
  ctx.fillStyle = sup
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()

  const crateres: [number, number, number, string][] = [
    [38, 34, 7, '#DCCFB2'], [37, 33, 5.5, '#E6DAC0'], [62, 58, 10, '#DCCFB2'], [61, 56.5, 8, '#E8DDC4'],
    [45, 66, 4, '#DCCFB2'], [66, 36, 3.5, '#DCCFB2'], [30, 52, 3, '#DCCFB2'], [54, 44, 2.5, '#E1D5BA'],
  ]
  for (const [x, y, rr, c] of crateres) {
    ctx.fillStyle = c
    ctx.beginPath(); ctx.arc(cx + (x - 50) * k, cy + (y - 50) * k, rr * k, 0, Math.PI * 2); ctx.fill()
  }
  ctx.strokeStyle = '#C9A84C'; ctx.lineWidth = 1.5 * k
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()
}

// ── Imagen para la historia de Instagram (1080 × 1920) ────────────────────────
export async function dibujarHistoria(d: DatosLogro): Promise<HTMLCanvasElement> {
  await cargarFuentes()
  let fondo: HTMLImageElement | null = null
  try { fondo = await cargarImagen('/landing/fondo-pagina-publica.png') } catch { fondo = null }

  const W = 1080, H = 1920
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('Tu navegador no puede armar la imagen.')

  // noche violeta
  const base = ctx.createLinearGradient(0, 0, 0, H)
  base.addColorStop(0, '#2A1B4D'); base.addColorStop(0.55, '#1E1734'); base.addColorStop(1, '#140F24')
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H)
  const luz = ctx.createRadialGradient(W / 2, 560, 0, W / 2, 560, 760)
  luz.addColorStop(0, 'rgba(91,52,170,0.55)'); luz.addColorStop(1, 'rgba(91,52,170,0)')
  ctx.fillStyle = luz; ctx.fillRect(0, 0, W, H)

  // zodíaco y estrellas (el fondo de las páginas públicas)
  if (fondo) {
    ctx.save(); ctx.globalAlpha = 0.17
    const fw = 1500, fh = fw * (fondo.naturalHeight / fondo.naturalWidth)
    for (let y = -fh / 3; y < H; y += fh) ctx.drawImage(fondo, (W - fw) / 2, y, fw, fh)
    ctx.restore()
  }

  // doble marco dorado
  ctx.strokeStyle = 'rgba(201,168,76,0.6)'; ctx.lineWidth = 3
  rectRedondo(ctx, 56, 56, W - 112, H - 112, 48); ctx.stroke()
  ctx.strokeStyle = 'rgba(201,168,76,0.32)'; ctx.lineWidth = 2
  rectRedondo(ctx, 80, 80, W - 160, H - 160, 36); ctx.stroke()

  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'

  // ✦ CERTIFICADO ✦ / ✦ MI LOGRO ✦
  ctx.fillStyle = '#C9A84C'
  ctx.font = '500 34px Jost, sans-serif'
  textoEspaciado(ctx, d.esCertificado ? '✦  CERTIFICADO  ✦' : '✦  MI LOGRO  ✦', W / 2, 600, 9)

  dibujarLunaLlena(ctx, W / 2, 780, 105)

  // nombre (se achica solo si es largo)
  const nom = ajustar(ctx, d.alumna || 'Alumna', px => `400 ${px}px Avigea, "Cormorant Garamond", serif`, 132, 64, W - 260, 2)
  ctx.fillStyle = '#F4EFE6'
  let y = 1060 + (nom.r.length > 1 ? -nom.px * 0.2 : 0)
  for (let k = 0; k < nom.r.length; k++) { if (k) y += nom.px * 1.05; ctx.fillText(nom.r[k], W / 2, y) }

  y += 110
  ctx.fillStyle = '#E4DAF8'
  ctx.font = 'italic 400 50px "Cormorant Garamond", serif'
  ctx.fillText('completó con amor y constancia', W / 2, y)

  y += 92
  ctx.fillStyle = '#C9A84C'
  ctx.font = '400 40px "Cormorant Garamond", serif'
  textoEspaciado(ctx, '✦   ☾   ✦', W / 2, y, 6)

  // curso
  y += 100
  const cur = ajustar(ctx, d.curso || 'Curso', px => `italic 600 ${px}px "Cormorant Garamond", serif`, 74, 44, W - 240, 3)
  ctx.fillStyle = '#FFFFFF'
  for (const l of cur.r) { ctx.fillText(l, W / 2, y); y += cur.px * 1.12 }

  if (d.terapeuta) {
    y += 6
    const ter = ajustar(ctx, 'con ' + d.terapeuta, px => `400 ${px}px Jost, sans-serif`, 38, 28, W - 260, 2)
    ctx.fillStyle = '#B9A7E8'
    for (const l of ter.r) { ctx.fillText(l, W / 2, y); y += ter.px * 1.25 }
  }

  // Octubre 2026 · Aprendido en Luma
  const mes = `${MESES[d.fecha.getMonth()]} ${d.fecha.getFullYear()}`
  ctx.font = '400 32px Jost, sans-serif'
  const parte1 = `${mes} · Aprendido en `
  ctx.textAlign = 'left'
  const esp = 3
  const ancho1 = [...parte1].reduce((a, l) => a + ctx.measureText(l).width + esp, 0)
  ctx.font = '600 32px Jost, sans-serif'
  const ancho2 = [...'Luma'].reduce((a, l) => a + ctx.measureText(l).width + esp, 0) - esp
  const x0 = (W - ancho1 - ancho2) / 2
  ctx.font = '400 32px Jost, sans-serif'; ctx.fillStyle = '#B9A7E8'
  textoEspaciado(ctx, parte1, x0, 1730, esp)
  ctx.font = '600 32px Jost, sans-serif'; ctx.fillStyle = '#C9A84C'
  textoEspaciado(ctx, 'Luma', x0 + ancho1, 1730, esp)
  ctx.textAlign = 'center'
  return c
}

// ── Certificado original de Luma (mismo diseño que la página) para el PDF ───────
export type ColoresCert = { bg: string; bg2: string; primary: string; primaryLight: string; primaryDim: string; accent: string; accentLight: string; accentDim: string; cream: string; textDim: string }
export type DatosCert = { codigo: string; fecha: string; curso: string; alumna: string; terapeuta: string }

export async function dibujarCertificadoLuma(t: ColoresCert, d: DatosCert): Promise<HTMLCanvasElement> {
  await cargarFuentes()
  const s = 3 // 720 px de la página × 3 = buena calidad para imprimir
  const W = 720 * s, H = Math.round(W / 1.55)
  // hoja A4 apaisada con el fondo oscuro de la página y el certificado en el centro
  const HW = Math.round(W * 1.12), HH = Math.round(HW / 1.4142)
  const c = document.createElement('canvas')
  c.width = HW; c.height = HH
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('Tu navegador no puede armar el PDF.')
  ctx.fillStyle = '#0a0812'; ctx.fillRect(0, 0, HW, HH)
  const ox = (HW - W) / 2, oy = (HH - H) / 2 - 18 * s

  ctx.save()
  ctx.translate(ox, oy)
  rectRedondo(ctx, 0, 0, W, H, 20 * s); ctx.clip()
  const base = ctx.createLinearGradient(0, 0, W, H)
  base.addColorStop(0, t.bg2); base.addColorStop(1, t.bg)
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H)
  const luz = (fx: number, fy: number, color: string) => {
    const g = ctx.createRadialGradient(fx * W, fy * H, 0, fx * W, fy * H, 0.45 * Math.max(W, H))
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  }
  luz(0.12, 0.15, t.accentDim); luz(0.9, 0.85, t.primaryDim)

  // marcos
  ctx.strokeStyle = t.primaryDim; ctx.lineWidth = 1.5 * s
  rectRedondo(ctx, 6 * s, 6 * s, W - 12 * s, H - 12 * s, 15 * s); ctx.stroke()
  ctx.lineWidth = 0.5 * s
  rectRedondo(ctx, 20 * s, 20 * s, W - 40 * s, H - 40 * s, 8 * s); ctx.stroke()

  // mandala
  ctx.save(); ctx.globalAlpha = 0.08; ctx.lineWidth = 0.5 * s * 2.4
  const cx = W / 2, cy = H / 2, k = 480 * s / 200
  ;[[98, t.primary], [76, t.accentLight], [54, t.primary]].forEach(([r, col]) => {
    ctx.strokeStyle = col as string; ctx.beginPath(); ctx.arc(cx, cy, (r as number) * k, 0, Math.PI * 2); ctx.stroke()
  })
  ctx.restore()

  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
  // medimos el bloque para centrarlo como en la página
  ctx.font = `600 ${44 * s}px "Cormorant Garamond", serif`
  const nombreR = ajustar(ctx, d.alumna, px => `italic 600 ${px}px "Cormorant Garamond", serif`, 44 * s, 26 * s, W - 140 * s, 2)
  // descripción: palabras normales en crema y el curso en negrita dorada
  const fuenteDesc = (cur: boolean) => cur ? `700 ${13 * s}px Jost, sans-serif` : `400 ${13 * s}px Jost, sans-serif`
  const palabras = [
    ...'por completar exitosamente el curso'.split(' ').map(t => ({ t, curso: false })),
    ...d.curso.split(/\s+/).filter(Boolean).map((t, i, arr) => ({ t: i === arr.length - 1 ? t + ',' : t, curso: true })),
    ...'aprobando el examen final.'.split(' ').map(t => ({ t, curso: false })),
  ]
  const descR: { t: string; curso: boolean }[][] = []
  {
    let linea: { t: string; curso: boolean }[] = [], ancho = 0
    for (const p of palabras) {
      ctx.font = fuenteDesc(p.curso)
      const w = ctx.measureText((linea.length ? ' ' : '') + p.t).width
      if (linea.length && ancho + w > 440 * s) { descR.push(linea); linea = [p]; ctx.font = fuenteDesc(p.curso); ancho = ctx.measureText(p.t).width }
      else { linea.push(p); ancho += w }
    }
    if (linea.length) descR.push(linea)
  }
  const alto = 52 * s + 16 * s + 14 * s + 30 * s + 24 * s + 18 * s + nombreR.r.length * nombreR.px * 1.15 + 20 * s + descR.length * 13 * s * 1.7 + 24 * s + 50 * s
  let y = (H - alto) / 2

  // sello
  const sr = 26 * s
  ctx.strokeStyle = t.primary; ctx.lineWidth = 1.5 * s
  ctx.save(); ctx.shadowColor = t.primaryDim; ctx.shadowBlur = 24 * s
  ctx.beginPath(); ctx.arc(cx, y + sr, sr, 0, Math.PI * 2); ctx.stroke(); ctx.restore()
  ctx.fillStyle = t.primary; ctx.font = `${20 * s}px "Cormorant Garamond", serif`
  ctx.textBaseline = 'middle'; ctx.fillText('✦', cx, y + sr + s); ctx.textBaseline = 'alphabetic'
  y += 52 * s + 16 * s

  ctx.fillStyle = t.primary; ctx.font = `600 ${10 * s}px Jost, sans-serif`
  textoEspaciado(ctx, 'CERTIFICADO DE FINALIZACIÓN', cx, y + 10 * s, 4 * s)
  y += 14 * s + 6 * s
  ctx.fillStyle = t.cream; ctx.font = `500 ${28 * s}px "Cormorant Garamond", serif`
  textoEspaciado(ctx, 'Luma', cx, y + 26 * s, 1 * s)
  y += 30 * s + 24 * s
  ctx.fillStyle = t.textDim; ctx.font = `400 ${11 * s}px Jost, sans-serif`
  textoEspaciado(ctx, 'Este certificado se otorga a', cx, y + 11 * s, 1 * s)
  y += 18 * s + 10 * s
  ctx.fillStyle = t.primaryLight; ctx.font = `italic 600 ${nombreR.px}px "Cormorant Garamond", serif`
  for (const l of nombreR.r) { y += nombreR.px * 0.95; ctx.fillText(l, cx, y); y += nombreR.px * 0.2 }
  y += 20 * s

  const lh = 13 * s * 1.7
  for (const linea of descR) {
    y += lh
    const piezas = linea.map((p, i) => ({ ...p, t: (i ? ' ' : '') + p.t }))
    let total = 0
    for (const p of piezas) { ctx.font = fuenteDesc(p.curso); total += ctx.measureText(p.t).width }
    let x = cx - total / 2
    ctx.textAlign = 'left'
    for (const p of piezas) {
      ctx.font = fuenteDesc(p.curso); ctx.fillStyle = p.curso ? t.primary : t.cream
      ctx.fillText(p.t, x, y - lh * 0.25); x += ctx.measureText(p.t).width
    }
    ctx.textAlign = 'center'
  }
  y += 24 * s

  // pie: firma y código
  const izq = cx - 280 * s, der = cx + 280 * s
  ctx.textAlign = 'left'
  ctx.fillStyle = t.primaryLight; ctx.font = `italic 400 ${18 * s}px "Cormorant Garamond", serif`
  const firma = d.terapeuta
  ctx.fillText(firma, izq, y + 18 * s)
  const anchoFirma = ctx.measureText(firma).width
  ctx.strokeStyle = t.primaryDim; ctx.lineWidth = 1 * s
  ctx.beginPath(); ctx.moveTo(izq, y + 26 * s); ctx.lineTo(izq + anchoFirma, y + 26 * s); ctx.stroke()
  ctx.fillStyle = t.textDim; ctx.font = `400 ${9 * s}px Jost, sans-serif`
  ctx.textAlign = 'center'
  textoEspaciado(ctx, 'INSTRUCTORA', izq + anchoFirma / 2, y + 42 * s, 1.5 * s)
  ctx.textAlign = 'right'
  ctx.fillStyle = t.cream; ctx.font = `600 ${12 * s}px Jost, sans-serif`
  ctx.fillText(d.fecha, der, y + 20 * s)
  ctx.fillStyle = t.textDim; ctx.font = `400 ${9 * s}px Jost, sans-serif`
  textoEspaciado(ctx, `CÓDIGO ${d.codigo}`, der, y + 42 * s, 1.5 * s)
  ctx.restore()

  // verificación debajo
  ctx.textAlign = 'center'; ctx.fillStyle = '#8A8299'; ctx.font = `400 ${10 * s}px Jost, sans-serif`
  textoEspaciado(ctx, 'Verificá la autenticidad en lumaapp.lat/certificado', HW / 2, oy + H + 26 * s, 1 * s)
  return c
}
