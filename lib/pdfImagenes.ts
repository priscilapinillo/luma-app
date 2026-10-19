// Arma un PDF a partir de dibujos (canvas). Cada canvas es una hoja.
// Se hace en el celular o la compu de quien descarga: no pasa por Netlify ni usa librerías.
// Como cada hoja es una imagen, el PDF se ve EXACTAMENTE igual que en pantalla
// (con fondos y colores), sin depender de la opción "gráficos de fondo" del navegador.

const enc = new TextEncoder()

async function jpegDe(canvas: HTMLCanvasElement, calidad: number): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>(ok => canvas.toBlob(b => ok(b), 'image/jpeg', calidad))
  if (!blob) throw new Error('No se pudo armar la imagen')
  return new Uint8Array(await blob.arrayBuffer())
}

// anchoPt × altoPt: tamaño de la hoja en puntos (A4 = 595 × 842)
export async function pdfDeCanvas(hojas: HTMLCanvasElement[], anchoPt: number, altoPt: number, calidad = 0.9): Promise<Blob> {
  const partes: Uint8Array[] = []
  const offsets: number[] = []
  let largo = 0
  const poner = (p: Uint8Array | string) => { const b = typeof p === 'string' ? enc.encode(p) : p; partes.push(b); largo += b.length }
  const objeto = (n: number, cuerpo: (string | Uint8Array)[]) => { offsets[n] = largo; poner(`${n} 0 obj\n`); cuerpo.forEach(poner); poner('\nendobj\n') }

  poner('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')
  const n = hojas.length
  // 1 = catálogo, 2 = páginas, luego por hoja: página, contenido, imagen
  const idPagina = (i: number) => 3 + i * 3
  objeto(1, ['<< /Type /Catalog /Pages 2 0 R >>'])
  objeto(2, [`<< /Type /Pages /Count ${n} /Kids [${hojas.map((_, i) => `${idPagina(i)} 0 R`).join(' ')}] >>`])
  for (let i = 0; i < n; i++) {
    const c = hojas[i]
    const jpg = await jpegDe(c, calidad)
    const p = idPagina(i), cont = p + 1, img = p + 2
    objeto(p, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${anchoPt} ${altoPt}] /Resources << /XObject << /Im${i} ${img} 0 R >> >> /Contents ${cont} 0 R >>`])
    const dibujo = `q ${anchoPt} 0 0 ${altoPt} 0 0 cm /Im${i} Do Q`
    objeto(cont, [`<< /Length ${dibujo.length} >>\nstream\n${dibujo}\nendstream`])
    objeto(img, [`<< /Type /XObject /Subtype /Image /Width ${c.width} /Height ${c.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`, jpg, '\nendstream'])
    // dejamos respirar al celular entre hoja y hoja (PDFs con muchas capturas)
    await new Promise(r => setTimeout(r, 0))
  }
  const total = 3 + n * 3
  const inicioXref = largo
  let xref = `xref\n0 ${total}\n0000000000 65535 f \n`
  for (let i = 1; i < total; i++) xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  poner(xref)
  poner(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`)
  return new Blob(partes as BlobPart[], { type: 'application/pdf' })
}

export function descargarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = nombre
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

export function nombreArchivo(texto: string): string {
  return (texto || 'luma').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'luma'
}
