'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Check } from 'lucide-react'

// Desde Luma Links → Luma completo, con la MISMA cuenta y el mismo email (sin registrarse de nuevo).
const PLANES = [
  {
    id: 'basico', nombre: 'Básico', precio: 9900,
    features: [
      'Agenda y gestión de turnos ilimitados',
      'Historial completo de consultantes',
      'Página de reservas con cobro por Mercado Pago',
      'Tus links dentro de tu página',
      'Finanzas, archivos y notas por consultante',
    ],
  },
  {
    id: 'premium', nombre: 'Premium', precio: 28000, destacado: true,
    features: [
      'Todo lo del plan Básico',
      'Crear y vender cursos online',
      'Aula para tus alumnas, con cobro mensual automático',
      'Certificados y seguimiento del progreso',
      'Soporte prioritario',
    ],
  },
]

export default function PasarALumaPage() {
  const router = useRouter()
  const [cargando, setCargando] = useState(true)
  const [slugLinks, setSlugLinks] = useState<string | null>(null)
  const [activando, setActivando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/links/login'); return }
    // si ya es terapeuta, no tiene nada que hacer acá
    const { data: sub } = await supabase.from('subscriptions').select('user_id').eq('user_id', user.id).maybeSingle()
    if (sub) { router.push('/dashboard'); return }
    const { data: links } = await supabase.from('luma_links_profiles').select('slug').eq('auth_user_id', user.id).maybeSingle()
    setSlugLinks(links?.slug || null)
    setCargando(false)
  }

  async function empezar() {
    if (activando) return
    setActivando(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/links/login'); return }
      const res = await fetch('/api/cuenta/empezar-prueba', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const r = await res.json().catch(() => ({ ok: false }))
      if (!r.ok) { setError(r.error || 'No pudimos activar tu prueba. Probá de nuevo en unos minutos.'); setActivando(false); return }
      router.push('/dashboard')
    } catch {
      setError('No pudimos conectarnos. Revisá tu internet y probá de nuevo.')
      setActivando(false)
    }
  }

  if (cargando) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:'14px',color:'#6B7280',fontFamily:'sans-serif'}}>Cargando...</div>
  )

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        .pl-wrap{min-height:100vh;font-family:'Jost',sans-serif;padding:36px 16px 60px;color:#F9F6F0;
          background:linear-gradient(135deg,#0D0620 0%,#1A0A3C 35%,#2D1060 65%,#1A0A2E 100%)}
        .pl-inner{max-width:880px;margin:0 auto}
        .pl-logo{font-family:'Cormorant Garamond',serif;font-size:24px;color:#C4A8FF;letter-spacing:5px;text-transform:uppercase;text-align:center;margin-bottom:8px}
        .pl-title{font-family:'Cormorant Garamond',serif;font-size:clamp(26px,5vw,34px);font-weight:400;text-align:center;margin-bottom:8px}
        .pl-sub{font-size:14px;color:#C9BEEA;text-align:center;line-height:1.6;max-width:560px;margin:0 auto 28px}
        .pl-grid{display:grid;grid-template-columns:1fr;gap:18px;margin-bottom:24px}
        @media(min-width:640px){.pl-grid{grid-template-columns:1fr 1fr}}
        .pl-card{background:rgba(255,255,255,0.97);color:#1A1035;border-radius:22px;padding:28px 24px;position:relative}
        .pl-card.dest{box-shadow:0 0 0 2px #8B5CF6,0 24px 60px rgba(139,92,246,0.35)}
        .pl-badge{position:absolute;top:-11px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#7C3AED,#A78BFA);color:white;font-size:10px;font-weight:700;padding:4px 12px;border-radius:20px}
        .pl-nombre{font-family:'Cormorant Garamond',serif;font-size:24px;margin-bottom:8px}
        .pl-precio{font-family:'Cormorant Garamond',serif;font-size:36px;color:#4C1D95;line-height:1}
        .pl-per{font-size:12px;color:#9B8EC4;margin-bottom:16px}
        .pl-feat{display:flex;gap:8px;font-size:13px;color:#4A3F6B;line-height:1.4;margin-bottom:8px}
        .pl-check{width:18px;height:18px;border-radius:50%;background:linear-gradient(135deg,#8B5CF6,#A78BFA);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
        .pl-box{background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.14);border-radius:16px;padding:18px 20px;margin-bottom:16px;font-size:13.5px;line-height:1.65;color:#E4DCFA}
        .pl-box h3{font-size:14px;color:white;margin-bottom:8px}
        .pl-box ul{padding-left:18px}
        .pl-aviso{background:rgba(251,191,36,0.12);border-color:rgba(251,191,36,0.4)}
        .pl-btn{display:block;width:100%;max-width:420px;margin:22px auto 0;padding:16px;border:none;border-radius:14px;cursor:pointer;
          background:linear-gradient(135deg,#7C3AED,#8B5CF6,#A78BFA);color:white;font-size:15px;font-weight:700;font-family:inherit;box-shadow:0 10px 28px rgba(124,58,237,0.4)}
        .pl-btn:disabled{opacity:.6;cursor:not-allowed}
        .pl-error{max-width:520px;margin:14px auto 0;background:rgba(248,113,113,0.12);border:1px solid rgba(248,113,113,0.35);color:#FCA5A5;padding:12px 14px;border-radius:10px;font-size:13px;text-align:center}
        .pl-volver{display:block;text-align:center;margin-top:18px;font-size:13px;color:#C4B5FD}
      `}</style>
      <div className="pl-wrap">
        <div className="pl-inner">
          <div className="pl-logo">Luma</div>
          <h1 className="pl-title">Pasá tu cuenta a Luma</h1>
          <p className="pl-sub">
            Empezá con <strong>7 días gratis, sin tarjeta</strong>, con tu misma cuenta y tu mismo email. No tenés que registrarte de nuevo.
          </p>

          <div className="pl-grid">
            {PLANES.map(p => (
              <div key={p.id} className={`pl-card${p.destacado ? ' dest' : ''}`}>
                {p.destacado && <div className="pl-badge">Más elegido</div>}
                <div className="pl-nombre">{p.nombre}</div>
                <div className="pl-precio">${p.precio.toLocaleString('es-AR')}</div>
                <div className="pl-per">ARS por mes · después de la prueba gratis</div>
                {p.features.map((f, i) => (
                  <div key={i} className="pl-feat"><div className="pl-check"><Check size={9} color="white"/></div>{f}</div>
                ))}
              </div>
            ))}
          </div>

          <div className="pl-box">
            <h3>✨ Qué pasa cuando tocás el botón</h3>
            <ul>
              <li>Se activa tu prueba gratis de 7 días con todo lo del plan Básico.</li>
              <li>Pasamos tu nombre, profesión, bio, foto y links a tu perfil de Luma, así no empezás de cero.</li>
              <li>Durante la prueba armás tu página de reservas paso a paso desde Ajustes.</li>
            </ul>
          </div>

          <div className="pl-box pl-aviso">
            <h3>⚠️ Importante sobre tu link actual</h3>
            Tu página de Luma Links{slugLinks ? <> (<strong>lumaapp.lat/l/{slugLinks}</strong>)</> : null} deja de funcionar.
            Cuando actives tu página de reservas vas a tener tu nueva dirección, con tus links adentro: acordate de cambiarla en tu bio de Instagram o TikTok.
          </div>

          <div className="pl-box">
            <h3>💳 Cuando termine la prueba, elegís cómo pagar</h3>
            <ul>
              <li><strong>Mercado Pago:</strong> se cobra solo todos los meses. Funciona <strong>solo con tarjeta de crédito o débito</strong> (no con dinero en cuenta). Podés pagar con cualquier cuenta de Mercado Pago, aunque tenga otro email.</li>
              <li><strong>Transferencia:</strong> pagás cada mes a mano y nos mandás el comprobante. Te activamos en menos de 24 hs.</li>
            </ul>
          </div>

          <button className="pl-btn" onClick={empezar} disabled={activando}>
            {activando ? 'Activando tu prueba…' : '✦ Empezar mis 7 días gratis'}
          </button>
          {error && <div className="pl-error">{error}</div>}
          <a className="pl-volver" href="/links/dashboard">Volver a mi Luma Links</a>
        </div>
      </div>
    </>
  )
}
