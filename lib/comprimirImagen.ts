// Comprime una imagen en el navegador, usando el Canvas API (sin librerías externas).
// Reduce el ancho máximo y convierte a JPEG con calidad decreciente hasta
// quedar bajo el tamaño objetivo, o hasta agotar los intentos.

const ANCHO_MAXIMO = 1200
const TAMANO_OBJETIVO_KB_DEFAULT = 800
const TAMANO_MAXIMO_ORIGINAL_MB = 15

export async function comprimirImagen(file: File, tamanoObjetivoKB: number = TAMANO_OBJETIVO_KB_DEFAULT): Promise<File> {
  if (file.size > TAMANO_MAXIMO_ORIGINAL_MB * 1024 * 1024) {
    throw new Error(`La imagen es demasiado pesada (más de ${TAMANO_MAXIMO_ORIGINAL_MB}MB). Elegí una más liviana.`)
  }

  const bitmap = await createImageBitmap(file)
  const escala = Math.min(1, ANCHO_MAXIMO / bitmap.width)
  const ancho = Math.round(bitmap.width * escala)
  const alto = Math.round(bitmap.height * escala)

  const canvas = document.createElement('canvas')
  canvas.width = ancho
  canvas.height = alto
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bitmap, 0, 0, ancho, alto)

  let calidad = 0.9
  let blob: Blob | null = null
  for (let intento = 0; intento < 5; intento++) {
    blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', calidad))
    if (!blob || blob.size <= tamanoObjetivoKB * 1024) break
    calidad -= 0.15
  }

  if (!blob) return file
  const nombreNuevo = file.name.replace(/\.[^.]+$/, '') + '.jpg'
  return new File([blob], nombreNuevo, { type: 'image/jpeg' })
}