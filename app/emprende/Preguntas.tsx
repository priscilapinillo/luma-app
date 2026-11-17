'use client'

import { useState } from 'react'

// Preguntas frecuentes desplegables (una abierta a la vez)
export default function Preguntas({ items }: { items: { q: string; a: string }[] }) {
  const [abierta, setAbierta] = useState(0)
  return (
    <div className="faq">
      {items.map((it, i) => {
        const abierto = abierta === i
        return (
          <div key={it.q} className={`q${abierto ? ' o' : ''}`}>
            <button type="button" className="qh" aria-expanded={abierto} aria-controls={`em-faq-${i}`}
              onClick={() => setAbierta(abierto ? -1 : i)}>
              <span>{it.q}</span>
              <em aria-hidden="true">{abierto ? '–' : '+'}</em>
            </button>
            {abierto && <p id={`em-faq-${i}`}>{it.a}</p>}
          </div>
        )
      })}
    </div>
  )
}
