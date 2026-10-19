'use client'

// Medida recomendada de la portada del curso (vertical, como un post de Instagram).
// Si la imagen subida no tiene esa forma, avisa suave que se puede ver recortada (no bloquea nada).
import { useEffect, useState } from 'react'

export default function AvisoPortada({ url }: { url?: string | null }) {
  const [distinta, setDistinta] = useState(false)

  useEffect(() => {
    setDistinta(false)
    if (!url) return
    const img = new Image()
    img.onload = () => {
      if (!img.naturalWidth || !img.naturalHeight) return
      const proporcion = img.naturalWidth / img.naturalHeight
      setDistinta(Math.abs(proporcion - 1080 / 1350) > 0.08)
    }
    img.src = url
  }, [url])

  return (
    <div className="field-hint" style={{ marginTop: '6px', lineHeight: 1.5 }}>
      Medida recomendada: <strong>1080 × 1350 px</strong> (vertical, como un post de Instagram).
      {distinta && <span style={{ display: 'block', color: '#B45309', marginTop: '2px' }}>Tu imagen tiene otra forma: puede verse recortada en algunas pantallas.</span>}
    </div>
  )
}
