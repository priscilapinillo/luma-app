// Vista previa de links del Altar (solo servidor). Lee el título y la imagen de una página UNA vez; quedan guardados en la pieza.
// Seguridad: solo http/https y puertos normales; nunca direcciones internas (se revisa el DNS en cada salto de redirección);
// corta a los 5 segundos y lee como máximo 1 MB. La imagen NO pasa por Luma: la muestra el navegador sin mandar de dónde viene.
import { promises as dns } from 'dns'
import net from 'net'

export const MAX_BYTES = 1024 * 1024
export const TIEMPO_MS = 5000
const MAX_SALTOS = 3

export function ipPrivada(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number)
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224
  }
  if (net.isIPv6(ip)) {
    const x = ip.toLowerCase()
    if (x === '::' || x === '::1') return true
    const v4 = x.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/); if (v4) return ipPrivada(v4[1])
    if (/^::ffff:/.test(x)) return true
    return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(x) || x.startsWith('64:ff9b:') || x.startsWith('2001:db8')
  }
  return true
}

export type Resolver = (host: string) => Promise<string[]>
const resolverReal: Resolver = async host => (await dns.lookup(host, { all: true, verbatim: true })).map(r => r.address)

// ¿Se puede pedir esta dirección? Devuelve el motivo si no.
export async function urlPermitida(u: URL, resolver: Resolver = resolverReal): Promise<string | null> {
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return 'protocolo'
  if (u.username || u.password) return 'credenciales'
  if (u.port && !['80', '443'].includes(u.port)) return 'puerto'
  const host = u.hostname.replace(/^\[|\]$/g, '')
  if (!host || /^(localhost|.*\.local|.*\.internal|.*\.localhost)$/i.test(host)) return 'interna'
  if (net.isIP(host)) return ipPrivada(host) ? 'interna' : null
  let ips: string[] = []
  try { ips = await resolver(host) } catch { return 'dns' }
  if (!ips.length || ips.some(ipPrivada)) return 'interna'
  return null
}

export function youtubeId(url: string): string | null {
  try {
    const u = new URL(url)
    const h = u.hostname.replace(/^www\.|^m\./, '')
    if (h === 'youtu.be') return /^[\w-]{11}$/.test(u.pathname.slice(1, 12)) ? u.pathname.slice(1, 12) : null
    if (h === 'youtube.com' || h === 'music.youtube.com') {
      const v = u.searchParams.get('v'); if (v && /^[\w-]{11}$/.test(v)) return v
      const m = u.pathname.match(/^\/(shorts|embed|live)\/([\w-]{11})/); if (m) return m[2]
    }
  } catch {}
  return null
}

const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—', laquo: '«', raquo: '»', iexcl: '¡', iquest: '¿',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', uuml: 'ü', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ' }
export function decodificar(s: string) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => {
    if (e[0] === '#') { const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : '' }
    return ENT[e] ?? ENT[e.toLowerCase()] ?? m
  }).replace(/\s+/g, ' ').trim()
}

// título e imagen desde las etiquetas og:/twitter: o <title>
export function extraerMeta(html: string, base: string): { titulo: string; img: string | null; sitio: string } {
  const metas: Record<string, string> = {}
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0]
    const clave = (tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i) || [])[1]?.toLowerCase()
    const valor = (tag.match(/\bcontent\s*=\s*"([^"]*)"/i) || tag.match(/\bcontent\s*=\s*'([^']*)'/i) || [])[1]
    if (clave && valor !== undefined && !(clave in metas)) metas[clave] = valor
  }
  const tituloTag = (html.match(/<title[^>]*>([\s\S]{0,500}?)<\/title>/i) || [])[1] || ''
  const titulo = decodificar(metas['og:title'] || metas['twitter:title'] || tituloTag).slice(0, 200)
  let img: string | null = null
  const crudo = metas['og:image:secure_url'] || metas['og:image'] || metas['twitter:image'] || metas['twitter:image:src']
  if (crudo) {
    try {
      const u = new URL(decodificar(crudo), base)
      if (u.protocol === 'http:') u.protocol = 'https:'
      if (u.protocol === 'https:' && u.href.length <= 2000) img = u.href
    } catch {}
  }
  const sitio = decodificar(metas['og:site_name'] || '').slice(0, 60) || new URL(base).hostname.replace(/^www\./, '')
  return { titulo, img, sitio }
}

async function leerHasta(res: Response, max: number): Promise<string> {
  if (!res.body) return ''
  const lector = res.body.getReader()
  const partes: Uint8Array[] = []; let total = 0
  while (total < max) {
    const { done, value } = await lector.read()
    if (done || !value) break
    partes.push(value); total += value.length
  }
  try { await lector.cancel() } catch {}
  const todo = new Uint8Array(Math.min(total, max)); let o = 0
  for (const p of partes) { const t = p.subarray(0, Math.min(p.length, todo.length - o)); todo.set(t, o); o += t.length; if (o >= todo.length) break }
  return new TextDecoder('utf-8', { fatal: false }).decode(todo)
}

export type Vista = { ok: boolean; url: string; titulo: string; img: string | null; sitio: string; motivo?: string }

export async function vistaPrevia(entrada: string, deps: { resolver?: Resolver; fetcher?: typeof fetch } = {}): Promise<Vista> {
  const fetcher = deps.fetcher || fetch
  let u: URL
  try { u = new URL(entrada) } catch { return { ok: false, url: entrada, titulo: '', img: null, sitio: '', motivo: 'invalida' } }
  const sitio0 = u.hostname.replace(/^www\./, '')
  const nada = (motivo: string): Vista => ({ ok: false, url: u.href, titulo: '', img: null, sitio: sitio0, motivo })
  const malo = await urlPermitida(u, deps.resolver)
  if (malo) return nada(malo)

  const yt = youtubeId(u.href)
  if (yt) {
    let titulo = ''
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), TIEMPO_MS)
      const r = await fetcher(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent('https://www.youtube.com/watch?v=' + yt)}`, { signal: ctl.signal, redirect: 'error' })
      clearTimeout(t)
      if (r.ok) titulo = String((JSON.parse(await leerHasta(r, 64 * 1024)) || {}).title || '').slice(0, 200)
    } catch {}
    return { ok: true, url: u.href, titulo, img: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`, sitio: 'YouTube' }
  }

  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), TIEMPO_MS)
  try {
    let actual = u
    for (let salto = 0; salto <= MAX_SALTOS; salto++) {
      const res = await fetcher(actual.href, {
        signal: ctl.signal, redirect: 'manual',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LumaBot/1.0; +https://lumaapp.lat)', Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'es-AR,es;q=0.9' },
      })
      if (res.status >= 300 && res.status < 400) {
        const destino = res.headers.get('location')
        try { await res.body?.cancel() } catch {}
        if (!destino || salto === MAX_SALTOS) return nada('redirecciones')
        const sig = new URL(destino, actual)
        const m = await urlPermitida(sig, deps.resolver)
        if (m) return nada(m)
        actual = sig; continue
      }
      if (!res.ok) { try { await res.body?.cancel() } catch {}; return nada('http_' + res.status) }
      const tipo = res.headers.get('content-type') || ''
      if (!/text\/html|application\/xhtml/i.test(tipo)) { try { await res.body?.cancel() } catch {}; return nada('no_es_pagina') }
      const largo = Number(res.headers.get('content-length') || 0)
      if (largo > MAX_BYTES * 5) { try { await res.body?.cancel() } catch {}; return nada('muy_grande') }
      const html = await leerHasta(res, MAX_BYTES)
      const meta = extraerMeta(html, actual.href)
      return { ok: true, url: u.href, ...meta }
    }
    return nada('redirecciones')
  } catch (e: any) {
    return nada(e?.name === 'AbortError' ? 'tiempo' : 'red')
  } finally { clearTimeout(timer) }
}
