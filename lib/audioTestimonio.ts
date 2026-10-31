// Testimonios en audio (etapa 8): todo se hace en el celu de la terapeuta, sin mandar el audio original a ningún lado.
// 1) se abre el audio (también los de WhatsApp, .opus, aunque el iPhone no los sepa leer),
// 2) se recorta (máximo 30 segundos) y 3) se comprime a MP3 liviano (unos 100 KB), que se escucha en cualquier celu.

export const MAX_SEGUNDOS = 30
export const LIMITE_AUDIOS = { basico: 3, premium: 15 } as const
const TASA = 22050 // suficiente para la voz
const KBPS = 32

export type AudioAbierto = { muestras: Float32Array; tasa: number; duracion: number }

function mezclarAMono(canales: Float32Array[], largo: number): Float32Array {
  if (canales.length === 1) return canales[0].slice(0, largo)
  const out = new Float32Array(largo)
  for (const c of canales) for (let i = 0; i < largo; i++) out[i] += c[i] / canales.length
  return out
}

function esOggOpus(b: Uint8Array) {
  // "OggS" al principio
  return b.length > 4 && b[0] === 0x4f && b[1] === 0x67 && b[2] === 0x67 && b[3] === 0x53
}

// El lector de audios de WhatsApp se carga recién cuando hace falta (no pesa en ninguna otra pantalla).
// Es el archivo de ogg-opus-decoder 1.7.5 guardado en /public/vendor (no depende de ningún sitio externo).
type LectorOpus = new () => { ready: Promise<void>; decodeFile: (b: Uint8Array) => Promise<{ channelData: Float32Array[]; samplesDecoded: number; sampleRate: number }>; free: () => void }
let lectorOpus: Promise<LectorOpus> | null = null
function cargarLectorOpus(): Promise<LectorOpus> {
  const global = window as unknown as Record<string, { OggOpusDecoder?: LectorOpus } | undefined>
  if (global['ogg-opus-decoder']?.OggOpusDecoder) return Promise.resolve(global['ogg-opus-decoder']!.OggOpusDecoder!)
  if (!lectorOpus) lectorOpus = new Promise((ok, mal) => {
    const s = document.createElement('script')
    s.src = '/vendor/ogg-opus-decoder-1.7.5.min.js'
    s.async = true
    s.onload = () => { const L = global['ogg-opus-decoder']?.OggOpusDecoder; if (L) ok(L); else { lectorOpus = null; mal(new Error('sin lector')) } }
    s.onerror = () => { lectorOpus = null; mal(new Error('sin lector')) }
    document.head.appendChild(s)
  })
  return lectorOpus
}

export async function abrirAudio(archivo: File): Promise<AudioAbierto> {
  if (archivo.size > 25 * 1024 * 1024) throw new Error('Ese audio es muy pesado. Elegí uno de menos de 25 MB.')
  const bytes = new Uint8Array(await archivo.arrayBuffer())
  // primero, lo que sabe el navegador
  try {
    const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)
    const ctx = new Ctx()
    try {
      const buf = await ctx.decodeAudioData(bytes.slice().buffer)
      const canales = Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i))
      return { muestras: mezclarAMono(canales, buf.length), tasa: buf.sampleRate, duracion: buf.duration }
    } finally { if (ctx.state !== 'closed') ctx.close().catch(() => {}) }
  } catch { /* sigue con el lector de WhatsApp */ }
  // audios de WhatsApp (.opus / .ogg) en celulares que no los leen (por ejemplo, el iPhone)
  if (esOggOpus(bytes)) {
    try {
      const OggOpusDecoder = await cargarLectorOpus()
      const dec = new OggOpusDecoder()
      await dec.ready
      try {
        const r = await dec.decodeFile(bytes)
        if (!r.samplesDecoded) throw new Error('vacío')
        return { muestras: mezclarAMono(r.channelData, r.samplesDecoded), tasa: r.sampleRate, duracion: r.samplesDecoded / r.sampleRate }
      } finally { dec.free() }
    } catch { /* cae al mensaje de abajo */ }
  }
  throw new Error('No pudimos abrir ese audio. Probá con el audio de WhatsApp guardado en tu celu, o con un archivo MP3 o M4A.')
}

// alturas de la onda para dibujarla (0 a 1)
export function onda(a: AudioAbierto, barras = 60): number[] {
  const porBarra = Math.max(1, Math.floor(a.muestras.length / barras))
  const r: number[] = []
  let max = 0.0001
  for (let i = 0; i < barras; i++) {
    let s = 0
    const ini = i * porBarra
    for (let j = ini; j < Math.min(a.muestras.length, ini + porBarra); j += 8) s = Math.max(s, Math.abs(a.muestras[j]))
    r.push(s); max = Math.max(max, s)
  }
  return r.map(v => Math.max(0.06, v / max))
}

function recortarYBajar(a: AudioAbierto, desde: number, hasta: number): Float32Array {
  const ini = Math.max(0, Math.floor(desde * a.tasa))
  const fin = Math.min(a.muestras.length, Math.floor(hasta * a.tasa))
  const trozo = a.muestras.subarray(ini, fin)
  const factor = a.tasa / TASA
  const largo = Math.floor(trozo.length / factor)
  const out = new Float32Array(largo)
  for (let i = 0; i < largo; i++) {
    // promedio simple: alcanza para voz y evita el "zumbido" de saltear muestras
    const a0 = Math.floor(i * factor), a1 = Math.min(trozo.length, Math.floor((i + 1) * factor))
    let s = 0; for (let j = a0; j < a1; j++) s += trozo[j]
    out[i] = a1 > a0 ? s / (a1 - a0) : trozo[a0] || 0
  }
  // fundido corto al principio y al final para que no "pegue"
  const f = Math.min(out.length >> 1, Math.floor(TASA * 0.08))
  for (let i = 0; i < f; i++) { const k = i / f; out[i] *= k; out[out.length - 1 - i] *= k }
  return out
}

export async function comprimirRecorte(a: AudioAbierto, desde: number, hasta: number): Promise<{ blob: Blob; duracion: number }> {
  const dur = hasta - desde
  if (!(dur > 0.5)) throw new Error('El recorte es muy corto.')
  if (dur > MAX_SEGUNDOS + 0.05) throw new Error(`El recorte puede durar hasta ${MAX_SEGUNDOS} segundos.`)
  const pcm = recortarYBajar(a, desde, hasta)
  const { Mp3Encoder } = await import('@breezystack/lamejs')
  const enc = new Mp3Encoder(1, TASA, KBPS)
  const partes: Uint8Array[] = []
  const BLOQUE = 1152 * 8
  const int16 = new Int16Array(BLOQUE)
  for (let i = 0; i < pcm.length; i += BLOQUE) {
    const n = Math.min(BLOQUE, pcm.length - i)
    for (let j = 0; j < n; j++) { const v = Math.max(-1, Math.min(1, pcm[i + j])); int16[j] = v < 0 ? v * 0x8000 : v * 0x7fff }
    const mp3 = enc.encodeBuffer(n === BLOQUE ? int16 : int16.subarray(0, n))
    if (mp3.length) partes.push(new Uint8Array(mp3))
    if (i % (BLOQUE * 20) === 0) await new Promise(r => setTimeout(r, 0)) // que la pantalla no se trabe
  }
  const fin = enc.flush()
  if (fin.length) partes.push(new Uint8Array(fin))
  return { blob: new Blob(partes as BlobPart[], { type: 'audio/mpeg' }), duracion: Math.round(dur * 10) / 10 }
}

export function minSeg(s: number) {
  const t = Math.max(0, Math.round(s))
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}
