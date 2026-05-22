'use client'
import React from 'react'
import { useEffect, useState } from 'react'

type ToastType = 'success' | 'error' | 'info'

type ToastData = {
  id: number
  message: string
  type: ToastType
}

let toastId = 0
let addToastFn: ((message: string, type: ToastType) => void) | null = null

export function toast(message: string, type: ToastType = 'success') {
  if (addToastFn) addToastFn(message, type)
}

export default function ToastProvider() {
  const [toasts, setToasts] = useState<ToastData[]>([])

  useEffect(() => {
    addToastFn = (message, type) => {
      const id = toastId++
      setToasts(prev => [...prev, { id, message, type }])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 3500)
    }
    return () => { addToastFn = null }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div style={{
      position:'fixed', bottom:'90px', left:'50%', transform:'translateX(-50%)',
      zIndex:9999, display:'flex', flexDirection:'column', gap:'8px', alignItems:'center'
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding:'12px 20px',
          borderRadius:'50px',
          fontSize:'13px',
          fontWeight:600,
          fontFamily:'Inter,sans-serif',
          color:'white',
          background: t.type === 'success' ? '#10B981' : t.type === 'error' ? '#EF4444' : '#8B5CF6',
          boxShadow:'0 8px 24px rgba(0,0,0,0.2)',
          animation:'slideUp 0.3s ease',
          whiteSpace:'nowrap',
        }}>
          {t.type === 'success' ? '✓ ' : t.type === 'error' ? '✕ ' : 'ℹ '}{t.message}
        </div>
      ))}
      <style>{`
        @keyframes slideUp {
          from { opacity:0; transform:translateY(10px) }
          to { opacity:1; transform:translateY(0) }
        }
      `}</style>
    </div>
  )
}