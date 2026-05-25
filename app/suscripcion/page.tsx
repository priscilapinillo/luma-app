'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'

export default function SuscripcionPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handlePagar() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: perfil } = await supabase
        .from('therapist_profiles')
        .select('slug')
        .eq('user_id', user.id)
        .maybeSingle()

      const res = await fetch('/api/mp/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })

      const data = await res.json()
      if (data.init_point) {
        window.location.href = data.init_point
      }
    } catch(e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html,body{height:100%}
        .sus-wrap{
          min-height:100vh;display:flex;align-items:center;justify-content:center;
          font-family:'Jost',sans-serif;padding:20px;
          background:linear-gradient(135deg,#0D0620 0%,#1A0A3C 30%,#2D1060 60%,#1A0A2E 100%);
          position:relative;overflow:hidden;
        }
        .sus-orb1{position:absolute;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,rgba(139,92,246,0.2),transparent);top:-150px;left:-150px;pointer-events:none}
        .sus-orb2{position:absolute;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,rgba(201,168,76,0.1),transparent);bottom:-100px;right:-100px;pointer-events:none}
        .sus-card{
          background:rgba(255,255,255,0.97);
          border-radius:28px;padding:48px 40px;
          width:100%;max-width:460px;
          box-shadow:0 40px 80px rgba(0,0,0,0.4),0 0 0 0.5px rgba(201,168,76,0.2);
          position:relative;z-index:1;
          text-align:center;
        }
        .sus-logo{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:300;color:#8B5CF6;letter-spacing:5px;text-transform:uppercase;display:block;margin-bottom:24px}
        .sus-icon{font-size:48px;margin-bottom:16px;display:block}
        .sus-title{font-family:'Cormorant Garamond',serif;font-size:34px;font-weight:300;color:#1A1035;margin-bottom:8px;letter-spacing:-0.5px}
        .sus-sub{font-size:14px;color:#7C6BAA;margin-bottom:32px;line-height:1.7}
        .sus-precio{
          background:linear-gradient(135deg,#F4F0FF,#EDE8FF);
          border:1.5px solid #DDD6FE;
          border-radius:16px;padding:20px 24px;
          margin-bottom:28px;
        }
        .sus-precio-num{font-family:'Cormorant Garamond',serif;font-size:48px;font-weight:300;color:#4C1D95;line-height:1}
        .sus-precio-per{font-size:13px;color:#9B8EC4;margin-top:4px}
        .sus-features{text-align:left;margin-bottom:28px;display:flex;flex-direction:column;gap:10px}
        .sus-feat{display:flex;align-items:center;gap:10px;font-size:13px;color:#4A3F6B}
        .sus-feat-check{width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,#8B5CF6,#A78BFA);display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .sus-btn{
          width:100%;padding:15px;
          background:linear-gradient(135deg,#7C3AED,#8B5CF6,#A78BFA);
          color:white;border:none;border-radius:12px;
          font-size:14px;font-weight:600;cursor:pointer;
          font-family:'Jost',sans-serif;letter-spacing:1px;
          box-shadow:0 8px 24px rgba(124,58,237,0.35);
          transition:all 0.3s;margin-bottom:12px;
        }
        .sus-btn:hover{transform:translateY(-1px);box-shadow:0 12px 32px rgba(124,58,237,0.45)}
        .sus-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none}
        .sus-seguro{font-size:11px;color:#9B8EC4;margin-bottom:20px;display:flex;align-items:center;justify-content:center;gap:5px}
        .sus-logout{font-size:12px;color:#C4B5FD;cursor:pointer;background:none;border:none;font-family:'Jost',sans-serif;padding:0;transition:color 0.2s}
        .sus-logout:hover{color:#8B5CF6}
        .sus-divider{border:none;border-top:0.5px solid rgba(139,92,246,0.15);margin:16px 0}
      `}</style>

      <div className="sus-wrap">
        <div className="sus-orb1"/><div className="sus-orb2"/>
        <div className="sus-card">
          <span className="sus-logo">Luma</span>
          <span className="sus-icon">🌙</span>
          <h1 className="sus-title">Tu prueba gratuita terminó</h1>
          <p className="sus-sub">
            Tus datos están guardados y seguros.<br/>
            Activá tu suscripción para seguir usando Luma.
          </p>

          <div className="sus-precio">
          <div className="sus-precio-num">$9.900</div>
            <div className="sus-precio-per">ARS por mes · Cancelás cuando querás</div>
          </div>

          <div className="sus-features">
            {[
              'Agenda y gestión de turnos ilimitados',
              'Historial completo de consultantes',
              'Página pública con Mercado Pago',
              'Dashboard de finanzas',
              'Archivos y notas por paciente',
              'Soporte prioritario',
            ].map((f,i) => (
              <div key={i} className="sus-feat">
                <div className="sus-feat-check"><Check size={10} color="white"/></div>
                {f}
              </div>
            ))}
          </div>

          <button className="sus-btn" onClick={handlePagar} disabled={loading}>
  {loading ? '⏳ Redirigiendo a Mercado Pago...' : '✦ Activar Luma por $9.900/mes'}
</button>

{loading && (
  <div style={{
    background:'#F4F0FF',border:'1px solid #DDD6FE',
    borderRadius:'10px',padding:'12px 16px',
    fontSize:'12px',color:'#6D28D9',
    lineHeight:'1.7',marginTop:'8px',textAlign:'left',
  }}>
    <strong>⚠️ Importante:</strong> No cierres esta pestaña ni el navegador.<br/>
    Vas a ser redirigida a Mercado Pago para completar el pago.<br/>
    Una vez que pagues, <strong>esperá a que te redirija de vuelta a Luma</strong> para que tu suscripción se active automáticamente.
  </div>
)}

          <div className="sus-seguro">🔒 Pago seguro con Mercado Pago</div>

          <hr className="sus-divider"/>

          <button className="sus-logout" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </>
  )
}