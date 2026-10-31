'use client'
// Tarjeta de un testimonio en audio (página de reservas y vista previa en Ajustes).
// Un solo audio suena a la vez en toda la página. Colores por props, así sirve en cualquier plantilla.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, Pause } from 'lucide-react'
import { minSeg } from '@/lib/audioTestimonio'

export type TestimonioAudio = { id: string; url: string; duracion: number; nombre: string; frase: string; servicio: string }

const EVENTO = 'luma-audio-testimonio'

// alturas fijas por testimonio (no hace falta bajar el audio para dibujar la onda)
function alturas(id: string, n: number) {
  let semilla = 0
  for (const c of id) semilla = (semilla * 31 + c.charCodeAt(0)) % 9973
  return Array.from({ length: n }, (_, i) => {
    const v = Math.abs(Math.sin(i * 0.9 + semilla) * 0.6 + Math.sin(i * 0.37 + semilla * 2) * 0.4)
    return 0.2 + v * 0.8
  })
}

export default function AudioTestimonio({ t, colores }: {
  t: TestimonioAudio
  colores: { fondo: string; texto: string; suave: string; acento: string; sobreAcento: string; ondaOff: string; chip: string; chipTxt: string; titulo?: string }
}) {
  const ref = useRef<HTMLAudioElement | null>(null)
  const [sonando, setSonando] = useState(false)
  const [avance, setAvance] = useState(0)
  const [error, setError] = useState(false)
  const barras = useMemo(() => alturas(t.id, 30), [t.id])

  useEffect(() => {
    const otro = (e: Event) => { if ((e as CustomEvent).detail !== t.id) ref.current?.pause() }
    window.addEventListener(EVENTO, otro)
    return () => window.removeEventListener(EVENTO, otro)
  }, [t.id])

  function alternar() {
    const a = ref.current
    if (!a) return
    if (a.paused) {
      window.dispatchEvent(new CustomEvent(EVENTO, { detail: t.id }))
      a.play().catch(() => setError(true))
    } else a.pause()
  }

  const total = t.duracion || ref.current?.duration || 0
  return (
    <div style={{ width: '100%', boxSizing: 'border-box', textAlign: 'left', padding: 14, borderRadius: 22, display: 'flex', flexDirection: 'column', gap: 10, background: colores.fondo, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <audio ref={ref} src={t.url} preload="none"
        onPlay={() => setSonando(true)} onPause={() => setSonando(false)}
        onEnded={() => { setSonando(false); setAvance(0) }}
        onTimeUpdate={e => { const a = e.currentTarget; if (a.duration) setAvance(a.currentTime / a.duration) }}
        onError={() => setError(true)}/>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button type="button" onClick={alternar} aria-label={sonando ? 'Pausar testimonio' : `Escuchar el testimonio de ${t.nombre}`}
          style={{ width: 46, height: 46, borderRadius: '50%', border: 'none', background: colores.acento, color: colores.sobreAcento, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', boxShadow: '0 6px 14px rgba(0,0,0,0.18)', transition: 'transform .15s' }}
          onPointerDown={e => (e.currentTarget.style.transform = 'scale(.94)')} onPointerUp={e => (e.currentTarget.style.transform = '')} onPointerLeave={e => (e.currentTarget.style.transform = '')}>
          {sonando ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor" style={{ marginLeft: 2 }}/>}
        </button>
        <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 2, height: 34, flex: 1, minWidth: 0 }}>
          {barras.map((h, i) => (
            <span key={i} style={{ flex: 1, minWidth: 2, maxWidth: 4, borderRadius: 2, height: `${Math.round(h * 100)}%`, background: i / barras.length < avance ? colores.acento : colores.ondaOff, transition: 'background .15s' }}/>
          ))}
        </div>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: colores.suave, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{minSeg(sonando && ref.current ? ref.current.currentTime : total)}</span>
      </div>
      {error && <span style={{ fontSize: 12, color: colores.suave }}>No se pudo reproducir este audio.</span>}
      {t.frase && <span style={{ fontFamily: colores.titulo || "'Cormorant Garamond', serif", fontSize: 17, fontStyle: 'italic', lineHeight: 1.3, color: colores.texto, overflowWrap: 'anywhere' }}>«{t.frase}»</span>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: colores.texto }}>{t.nombre}</span>
        {t.servicio && <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em', color: colores.chipTxt, background: colores.chip, padding: '4px 9px', borderRadius: 12 }}>{t.servicio}</span>}
      </div>
    </div>
  )
}
