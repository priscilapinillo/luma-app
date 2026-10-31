'use client'
// Carrusel que se desliza con el dedo (scroll nativo con imán) y, de respaldo, con las flechitas y los puntitos.
// Lo usan los testimonios en audio de la página de reservas. Toma los colores de la plantilla (variables CSS).
import { Children, useEffect, useRef, useState } from 'react'

export default function CarruselDeslizable({ children, etiqueta }: { children: React.ReactNode; etiqueta: string }) {
  const items = Children.toArray(children)
  const pista = useRef<HTMLDivElement | null>(null)
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const el = pista.current
    if (!el) return
    let cuadro = 0
    const alMover = () => {
      cancelAnimationFrame(cuadro)
      cuadro = requestAnimationFrame(() => {
        const ancho = (el.firstElementChild as HTMLElement | null)?.offsetWidth || el.clientWidth || 1
        setIdx(Math.max(0, Math.min(items.length - 1, Math.round(el.scrollLeft / ancho))))
      })
    }
    el.addEventListener('scroll', alMover, { passive: true })
    return () => { el.removeEventListener('scroll', alMover); cancelAnimationFrame(cuadro) }
  }, [items.length])

  function ir(i: number) {
    const el = pista.current
    if (!el) return
    const destino = Math.max(0, Math.min(items.length - 1, i))
    const reducir = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ancho = (el.firstElementChild as HTMLElement | null)?.offsetWidth || el.clientWidth
    el.scrollTo({ left: destino * ancho, behavior: reducir ? 'auto' : 'smooth' })
    setIdx(destino)
  }

  const flecha: React.CSSProperties = { width: 32, height: 32, borderRadius: '50%', border: '0.5px solid var(--border)', background: 'var(--card-bg)', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, transition: 'opacity .2s' }

  return (
    <div role="region" aria-roledescription="carrusel" aria-label={etiqueta}>
      <div ref={pista} className="carrusel-pista"
        style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch', overscrollBehaviorX: 'contain', scrollbarWidth: 'none', gap: 0, margin: '0 -8px', padding: '4px 8px 12px' }}>
        {items.map((hijo, i) => (
          <div key={i} aria-roledescription="diapositiva" aria-label={`${i + 1} de ${items.length}`}
            style={{ flex: '0 0 100%', minWidth: 0, scrollSnapAlign: 'center', scrollSnapStop: 'always', padding: '0 8px', boxSizing: 'border-box' }}>
            {hijo}
          </div>
        ))}
      </div>
      <style>{`.carrusel-pista::-webkit-scrollbar{display:none}`}</style>
      {items.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 4 }}>
          <button type="button" aria-label="Anterior" onClick={() => ir(idx - 1)} disabled={idx === 0} style={{ ...flecha, opacity: idx === 0 ? 0.3 : 1 }}>‹</button>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {items.map((_, i) => (
              <button type="button" key={i} aria-label={`Ir al ${i + 1}`} onClick={() => ir(i)} className={`testi-dot${idx === i ? ' act' : ''}`} style={{ border: 'none', padding: 0 }}/>
            ))}
          </div>
          <button type="button" aria-label="Siguiente" onClick={() => ir(idx + 1)} disabled={idx === items.length - 1} style={{ ...flecha, opacity: idx === items.length - 1 ? 0.3 : 1 }}>›</button>
        </div>
      )}
    </div>
  )
}
