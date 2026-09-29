'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Lock, Sparkles } from 'lucide-react'
import { calcularAcceso, pareceDesactualizado } from '@/lib/acceso'

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [tieneAcceso, setTieneAcceso] = useState(false)

  useEffect(() => { verificarAcceso() }, [])

  async function verificarAcceso() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status, trial_ends_at, current_period_ends_at, plan')
        .eq('user_id', user.id)
        .maybeSingle()

      let nivel = calcularAcceso(sub)

      if (nivel !== 'premium' && pareceDesactualizado(sub)) {
        try {
          const res = await fetch('/api/mp/verificar-suscripcion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id }),
          })
          const data = await res.json()
          if (data.vigente && data.plan === 'premium') nivel = 'premium'
        } catch (e) { console.error('Error verificando en vivo:', e) }
      }

      setTieneAcceso(nivel === 'premium')
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:'14px',color:'#6B7280',fontFamily:'sans-serif'}}>
      Cargando...
    </div>
  )

  if (tieneAcceso) return <>{children}</>

  return (
    <div style={{position:'relative',minHeight:'100vh'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@700;800;900&family=Inter:wght@400;500;600&display=swap');
        .cg-fondo{filter:blur(6px);opacity:0.5;pointer-events:none;user-select:none;height:100vh;overflow:hidden}
        .cg-overlay{position:fixed;inset:0;z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(10,5,25,0.35)}
        .cg-card{background:white;border-radius:20px;padding:36px 28px;max-width:380px;width:100%;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,0.35)}
        html.dark .cg-card{background:#1A1030;color:#F0E8D5}
        .cg-icon{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#6B3FA0,#8B5CF6);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;box-shadow:0 10px 30px rgba(139,92,246,0.35)}
        .cg-titulo{font-family:'Manrope',sans-serif;font-size:20px;font-weight:800;margin-bottom:8px}
        .cg-desc{font-size:13px;color:#737373;line-height:1.6;margin-bottom:20px;font-family:'Inter',sans-serif}
        html.dark .cg-desc{color:#A896C4}
        .cg-precio{font-size:28px;font-weight:900;font-family:'Manrope',sans-serif;color:#6B3FA0;margin-bottom:4px}
        html.dark .cg-precio{color:#C4A8FF}
        .cg-precio-sub{font-size:11px;color:#A3A3A3;margin-bottom:22px}
        .cg-btn{width:100%;padding:14px;background:linear-gradient(135deg,#6B3FA0,#8B5CF6);color:white;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;box-shadow:0 10px 26px rgba(139,92,246,0.35);display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none}
        .cg-volver{display:block;margin-top:14px;font-size:12px;color:#A3A3A3;text-decoration:none}
      `}</style>

      <div className="cg-fondo">{children}</div>

      <div className="cg-overlay">
        <div className="cg-card">
          <div className="cg-icon"><Lock size={24} color="white"/></div>
          <div className="cg-titulo">Cursos es parte de Luma Premium</div>
          <p className="cg-desc">Sumá venta de cursos online a tu página, con checkout, aula para tus alumnas y todo integrado a lo que ya tenés en Luma.</p>
          <div className="cg-precio">$28.000<span style={{fontSize:'14px',fontWeight:600}}>/mes</span></div>
          <div className="cg-precio-sub">Incluye todo lo del plan actual + Cursos</div>
          <a href="/suscripcion" className="cg-btn"><Sparkles size={15}/> Pasarme a Premium</a>
          <a href="/dashboard" className="cg-volver">Volver al inicio</a>
        </div>
      </div>
    </div>
  )
}