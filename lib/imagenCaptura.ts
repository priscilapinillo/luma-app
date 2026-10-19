// Achica las capturas del cuaderno antes de subirlas: máximo 1600 px, formato WebP (~150–250 KB).
// Si el celular no sabe hacer WebP, usa JPEG. Si igual pesa más de 600 KB, no se sube.

export const MAX_KB_CAPTURA = 600

function cargarImagen(file: File): Promise<HTMLImageElement> {
  return new Promise((ok, mal) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); ok(img) }
    img.onerror = () => { URL.revokeObjectURL(url); mal(new Error('formato')) }
    img.src = url
  })
}

const aBlob = (c: HTMLCanvasElement, tipo: string, calidad: number) =>
  new Promise<Blob | null>(ok => c.toBlob(b => ok(b), tipo, calidad))

export async function achicarCaptura(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
    throw new Error('Elegí una foto o una captura de pantalla.')
  }
  if (file.size > 40 * 1024 * 1024) throw new Error('Esa foto es demasiado grande (más de 40 MB). Probá con una captura de pantalla.')

  let img: HTMLImageElement
  try { img = await cargarImagen(file) } catch {
    throw new Error('Ese formato de foto no se puede leer acá (pasa con algunas fotos de iPhone). Probá con una captura de pantalla o compartila como JPG.')
  }
  const lado = 1600
  const escala = Math.min(1, lado / Math.max(img.naturalWidth || 1, img.naturalHeight || 1))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(img.naturalWidth * escala))
  canvas.height = Math.max(1, Math.round(img.naturalHeight * escala))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo preparar la imagen.')
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, canvas.width, canvas.height) // capturas con transparencia: fondo blanco
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  const limite = MAX_KB_CAPTURA * 1024
  for (const calidad of [0.8, 0.7, 0.6, 0.5]) {
    let b = await aBlob(canvas, 'image/webp', calidad)
    if (!b || b.type !== 'image/webp') b = await aBlob(canvas, 'image/jpeg', calidad) // Safari viejo no hace WebP
    if (b && (b.size <= 250 * 1024 || (calidad === 0.5 && b.size <= limite))) return b
    if (b && b.size <= limite && calidad <= 0.6) return b
  }
  throw new Error(`La imagen sigue pesando más de ${MAX_KB_CAPTURA} KB después de achicarla. Probá con una captura más chica.`)
}
