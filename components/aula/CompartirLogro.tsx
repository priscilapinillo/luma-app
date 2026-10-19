'use client'

import { useEffect, useState } from 'react'
import { dibujarHistoria, type DatosLogro } from '@/lib/dibujos'
import { descargarBlob, nombreArchivo } from '@/lib/pdfImagenes'

// Imagen vertical para la historia de Instagram (no reemplaza el certificado de Luma).
// Con certificado dice "CERTIFICADO"; sin certificado dice "MI LOGRO".
export default function CompartirLogro({ datos, onCerrar }: { datos: DatosLogro; onCerrar: () => void }) {
  const [blob, setBlob] = useState<Blob | null>(null)
  const [vista, setVista] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [puedeCompartir, setPuedeCompartir] = useState(false)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    let url: string | null = null
    let vivo = true
    ;(async () => {
      try {
        const c = await dibujarHistoria(datos)
        const b = await new Promise<Blob | null>(ok => c.toBlob(x => ok(x), 'image/png'))
        if (!b) throw new Error('sin imagen')
        if (!vivo) return
        url = URL.createObjectURL(b)
        setBlob(b); setVista(url)
        try {
          const f = new File([b], 'mi-logro-luma.png', { type: 'image/png' })
          setPuedeCompartir(typeof navigator.canShare === 'function' && navigator.canShare({ files: [f] }))
        } catch { setPuedeCompartir(false) }
      } catch (e) {
        console.error(e)
        if (vivo) setError('No se pudo armar la imagen en este navegador. Probá desde otro (Chrome o Safari).')
      }
    })()
    return () => { vivo = false; if (url) URL.revokeObjectURL(url) }
  }, [datos])

  const nombre = `${datos.esCertificado ? 'certificado' : 'logro'}-${nombreArchivo(datos.curso)}.png`

  async function compartir() {
    if (!blob) return
    try {
      await navigator.share({ files: [new File([blob], nombre, { type: 'image/png' })] })
    } catch (e: unknown) {
      if ((e as { name?: string })?.name === 'AbortError') return
      descargarBlob(blob, nombre)
      setAviso('Tu celular no dejó compartir directo: descargamos la imagen. Subila desde Instagram → Tu historia.')
    }
  }

  return (
    <div onClick={onCerrar} role="dialog" aria-modal="true" aria-label="Compartir"
      style={{ position: 'fixed', inset: 0, zIndex: 1001, background: 'rgba(20,15,36,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', fontFamily: "'Geist',sans-serif" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '360px', maxHeight: '100%', overflowY: 'auto', background: '#FAFAFA', borderRadius: '20px', padding: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <strong style={{ fontSize: '14px', color: '#0A0A0A' }}>{datos.esCertificado ? 'Compartir mi certificado' : 'Compartir mi logro'}</strong>
          <button onClick={onCerrar} aria-label="Cerrar" style={{ border: 'none', background: 'none', fontSize: '22px', lineHeight: 1, cursor: 'pointer', color: '#737373' }}>×</button>
        </div>
        <div style={{ aspectRatio: '9 / 16', width: '100%', maxHeight: '58vh', margin: '0 auto', borderRadius: '14px', overflow: 'hidden', background: '#1E1734', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {vista ? <img src={vista} alt="Vista previa" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}/>
            : !error ? <span style={{ color: '#C9A84C', fontSize: '13px' }}>Preparando tu imagen ✦</span> : null}
        </div>
        {error && <div style={{ marginTop: '10px', fontSize: '12px', color: '#92400E', background: '#FEF3C7', padding: '10px', borderRadius: '10px' }}>{error}</div>}
        {aviso && <div style={{ marginTop: '10px', fontSize: '12px', color: '#5B21B6', background: '#F5F3FF', padding: '10px', borderRadius: '10px', lineHeight: 1.5 }}>{aviso}</div>}
        {blob && (<>
          {puedeCompartir && (
            <button onClick={compartir}
              style={{ marginTop: '12px', width: '100%', padding: '13px', borderRadius: '12px', border: 'none', background: 'linear-gradient(90deg,#F58529,#DD2A7B,#8134AF)', color: 'white', fontWeight: 800, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Compartir en mi historia de Instagram
            </button>
          )}
          <button onClick={() => descargarBlob(blob, nombre)}
            style={{ marginTop: '8px', width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E5E5E5', background: 'white', color: '#404040', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
            Descargar imagen
          </button>
        </>)}
      </div>
    </div>
  )
}
