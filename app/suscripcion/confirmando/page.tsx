'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

// Adonde vuelve la terapeuta después de pagar su plan en Mercado Pago.
// Le pregunta a Mercado Pago varias veces; apenas confirma, la lleva a su panel.
export default function ConfirmandoPagoPage() {
  const router = useRouter()
  const [estado, setEstado] = useState<'buscando' | 'listo' | 'demora' | 'sin_sesion'>('buscando')

  useEffect(() => { confirmar() }, [])

  async function confirmar() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setEstado('sin_sesion'); return }
    for (let i = 0; i < 8; i++) {
      try {
        const res = await fetch('/api/mp/verificar-suscripcion', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        })
        const r = await res.json().catch(() => ({}))
        if (r.vigente) {
          setEstado('listo')
          setTimeout(() => router.push('/dashboard?pago=ok'), 1800)
          return
        }
      } catch {}
      await new Promise(ok => setTimeout(ok, 4000))
    }
    setEstado('demora')
  }

  const titulo = estado === 'listo' ? '¡Listo! Tu plan está activo 💜'
    : estado === 'demora' ? 'Estamos confirmando tu pago'
    : estado === 'sin_sesion' ? '¡Gracias! Volviste de Mercado Pago'
    : 'Confirmando tu pago con Mercado Pago…'
  const texto = estado === 'listo' ? 'Te llevamos a tu panel.'
    : estado === 'demora' ? 'Mercado Pago todavía no nos avisó. Si completaste el pago, no pagues de nuevo: a veces tarda unos minutos. Tu plan se activa solo apenas se confirme.'
    : estado === 'sin_sesion' ? 'Si completaste el pago, ya está: no pagues de nuevo. Iniciá sesión con tu email y contraseña de Luma para ver tu plan.'
    : 'No cierres esta página, tarda unos segundos.'

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px 16px',fontFamily:"'Jost',sans-serif",
      background:'linear-gradient(135deg,#0D0620 0%,#1A0A3C 35%,#2D1060 65%,#1A0A2E 100%)'}}>
      <div style={{maxWidth:'440px',width:'100%',background:'rgba(255,255,255,0.97)',borderRadius:'22px',padding:'32px 26px',textAlign:'center',color:'#1A1035'}}>
        <div style={{fontSize:'38px',marginBottom:'12px'}}>{estado === 'listo' ? '✅' : estado === 'buscando' ? '⏳' : '💜'}</div>
        <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'26px',fontWeight:500,marginBottom:'10px'}}>{titulo}</h1>
        <p style={{fontSize:'14px',color:'#4A3F6B',lineHeight:1.6}}>{texto}</p>
        {estado === 'demora' && (
          <div style={{display:'flex',flexDirection:'column',gap:'10px',marginTop:'20px'}}>
            <button onClick={() => { setEstado('buscando'); confirmar() }}
              style={{padding:'13px',borderRadius:'12px',border:'none',background:'linear-gradient(135deg,#7C3AED,#A78BFA)',color:'white',fontWeight:700,fontSize:'14px',cursor:'pointer',fontFamily:'inherit'}}>
              Volver a revisar
            </button>
            <a href="/dashboard" style={{fontSize:'13px',color:'#7C3AED',fontWeight:600}}>Ir a mi panel</a>
          </div>
        )}
        {estado === 'sin_sesion' && (
          <a href="/auth/login" style={{display:'inline-block',marginTop:'20px',padding:'13px 26px',borderRadius:'12px',background:'linear-gradient(135deg,#7C3AED,#A78BFA)',color:'white',fontWeight:700,fontSize:'14px',textDecoration:'none'}}>
            Iniciar sesión
          </a>
        )}
      </div>
    </div>
  )
}
