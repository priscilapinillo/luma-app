'use client'
// Una pista corta arriba de una pantalla del Altar, para que nadie tenga que adivinar cómo se usa. Se cierra con «Entendido»
// y no vuelve a aparecer en esa compu o celu.
import { useEffect, useState } from 'react'
import { Lightbulb, X } from 'lucide-react'

export default function Pista({ clave, children }: { clave: string; children: React.ReactNode }) {
  const [ver, setVer] = useState(false)
  useEffect(() => { try { setVer(localStorage.getItem('luma-pista-' + clave) !== 'vista') } catch { setVer(true) } }, [clave])
  if (!ver) return null
  const cerrar = () => { setVer(false); try { localStorage.setItem('luma-pista-' + clave, 'vista') } catch {} }
  return (
    <div className="luma-desplegable luma-desplegable-izq" role="note" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', margin: '0 0 12px', borderRadius: 14, background: 'var(--al-suave)', border: '1px solid var(--al-borde)', font: '700 13px/1.45 Nunito,sans-serif', color: 'var(--al-texto)' }}>
      <Lightbulb size={16} color="var(--al-oro)" style={{ flexShrink: 0, marginTop: 1 }}/>
      <span style={{ flex: 1 }}>{children}</span>
      <button onClick={cerrar} style={{ border: 'none', background: 'none', color: 'var(--al-acento)', font: '900 12.5px Nunito,sans-serif', cursor: 'pointer', padding: '0 2px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }} aria-label="Entendido, no mostrar más"><X size={13}/> Entendido</button>
    </div>
  )
}
