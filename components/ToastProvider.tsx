'use client'
import React from 'react'
import { useEffect, useState } from 'react'

// Avisos chiquitos ("toasts") para toda la app: toast('Guardado'), toast('No se pudo…', 'error').
// Está montado una sola vez en app/layout.tsx, así funciona en el panel, en Mi cuenta, en las páginas
// públicas y en el admin. Si alguien llama a toast() antes de que se monte, el aviso queda en fila
// y aparece apenas se monta (antes se perdía en silencio).

type ToastType = 'success' | 'error' | 'info'

type ToastData = {
  id: number
  message: string
  type: ToastType
  saliendo?: boolean
}

let toastId = 0
let addToastFn: ((message: string, type: ToastType) => void) | null = null
const enEspera: { message: string; type: ToastType }[] = []

export function toast(message: string, type: ToastType = 'success') {
  const texto = String(message ?? '').trim()
  if (!texto) return
  if (addToastFn) addToastFn(texto, type)
  else if (enEspera.length < 5) enEspera.push({ message: texto, type })
}

// cuanto más largo el texto, más tiempo queda en pantalla (entre 3,5 y 9 segundos)
function duracion(texto: string) {
  return Math.min(9000, Math.max(3500, 2000 + texto.length * 45))
}

const COLOR: Record<ToastType, string> = { success: '#34D399', error: '#F87171', info: '#C4B5FD' }

function Icono({ type }: { type: ToastType }) {
  const c = COLOR[type]
  if (type === 'success') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>
  )
  if (type === 'error') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/></svg>
  )
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5v.01"/></svg>
  )
}

export default function ToastProvider() {
  const [toasts, setToasts] = useState<ToastData[]>([])

  useEffect(() => {
    const cerrar = (id: number) => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, saliendo: true } : t))
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 220)
    }
    addToastFn = (message, type) => {
      const id = toastId++
      // como máximo 3 a la vez: si hay más, se va el más viejo
      setToasts(prev => [...prev.slice(-2), { id, message, type }])
      setTimeout(() => cerrar(id), duracion(message))
    }
    ;(addToastFn as any).cerrar = cerrar
    while (enEspera.length) { const t = enEspera.shift()!; addToastFn(t.message, t.type) }
    return () => { addToastFn = null }
  }, [])

  return (
    <div aria-live="polite" role="status" style={{
      position: 'fixed', left: '50%', transform: 'translateX(-50%)',
      bottom: 'calc(96px + env(safe-area-inset-bottom))',
      zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center',
      width: 'min(92vw, 420px)', pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div key={t.id}
          onClick={() => (addToastFn as any)?.cerrar?.(t.id)}
          className={`luma-toast${t.saliendo ? ' luma-toast-sale' : ''}`}
          style={{
            pointerEvents: 'auto', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 16px', borderRadius: '18px',
            fontSize: '13px', fontWeight: 600, lineHeight: 1.35,
            fontFamily: 'Inter, sans-serif', color: '#F5F3FA',
            background: 'rgba(30, 27, 44, 0.94)',
            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            maxWidth: '100%', overflowWrap: 'anywhere', whiteSpace: 'pre-line',
          }}>
          <span style={{ flexShrink: 0, display: 'flex' }}><Icono type={t.type}/></span>
          <span>{t.message}</span>
        </div>
      ))}
      <style>{`
        .luma-toast { animation: lumaToastEntra 0.26s cubic-bezier(.2,.8,.3,1) both }
        .luma-toast-sale { animation: lumaToastSale 0.22s ease both }
        @keyframes lumaToastEntra { from { opacity:0; transform:translateY(12px) scale(.96) } to { opacity:1; transform:none } }
        @keyframes lumaToastSale { to { opacity:0; transform:translateY(8px) scale(.97) } }
        @media (prefers-reduced-motion: reduce) { .luma-toast, .luma-toast-sale { animation: none } }
      `}</style>
    </div>
  )
}
