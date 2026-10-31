'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Lock, Sparkles, BookOpen, Download } from 'lucide-react'
import { calcularAcceso, pareceDesactualizado, type NivelAcceso } from '@/lib/acceso'
import { verificarPlanEnVivo } from '@/lib/verificarPlan'
import { PlanCursos } from '@/lib/planCursos'

// Candado de la sección Cursos (el primero de tres: el servidor y la base dicen lo mismo).
// · Premium (o prueba gratis): todo.
// · Básico con cursos o descargables de cuando era Premium: "en pausa" (mira y atiende a sus alumnas; no crea, no publica, no vende).
// · Si no: el cartel de Premium. Detrás NO se carga ningún dato real (antes la pantalla borrosa cargaba los cursos de verdad).

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [tieneAcceso, setTieneAcceso] = useState(false)
  const [nivel, setNivel] = useState<NivelAcceso>('sin_acceso')
  const [pausa, setPausa] = useState(false)

  useEffect(() => { verificarAcceso() }, [])

  async function verificarAcceso() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/auth/login'; return }

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status, trial_ends_at, current_period_ends_at, plan, mp_subscription_id')
        .eq('user_id', user.id)
        .maybeSingle()

      let nivel = calcularAcceso(sub)

      if (nivel !== 'premium' && pareceDesactualizado(sub)) {
        const data = await verificarPlanEnVivo()
        if (data.vigente && data.plan === 'premium') nivel = 'premium'
      }

      setNivel(nivel)
      if (nivel === 'premium') { setTieneAcceso(true); setPausa(false) }
      else if (nivel === 'basico') {
        // ¿tiene cursos o descargables de antes? entra en pausa (solo cuenta, no trae datos)
        const { count } = await supabase.from('courses').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
        const conCursos = (count || 0) > 0
        setTieneAcceso(conCursos); setPausa(conCursos)
      } else { setTieneAcceso(false); setPausa(false) }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:'14px',color:'#6B7280',fontFamily:'sans-serif'}}>
      Cargando...
    </div>
  )

  if (tieneAcceso) return <PlanCursos.Provider value={{ nivel: nivel === 'premium' ? 'premium' : nivel, pausa }}>{children}</PlanCursos.Provider>

  return (
    <div style={{position:'relative',minHeight:'100vh'}}>
      <style>{`
        
        .cg-fondo{filter:blur(6px);opacity:0.5;pointer-events:none;user-select:none;height:100vh;overflow:hidden}
        .cg-overlay{position:fixed;inset:0;z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(10,5,25,0.35)}
        .cg-card{background:white;border-radius:20px;padding:36px 28px;max-width:380px;width:100%;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,0.35)}
        html.dark .cg-card{background:var(--bg-card);color:var(--text-primary)}
        .cg-icon{width:56px;height:56px;border-radius:50%;background:var(--gradient-boton);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;box-shadow:0 10px 30px rgba(var(--accent-rgb),0.35)}
        .cg-titulo{font-family:'Manrope',sans-serif;font-size:20px;font-weight:800;margin-bottom:8px}
        .cg-desc{font-size:13px;color:#737373;line-height:1.6;margin-bottom:20px;font-family:'Inter',sans-serif}
        html.dark .cg-desc{color:var(--text-secondary)}
        .cg-precio{font-size:28px;font-weight:900;font-family:'Manrope',sans-serif;color:var(--accent-deep);margin-bottom:4px}
        html.dark .cg-precio{color:var(--accent-2)}
        .cg-precio-sub{font-size:11px;color:#A3A3A3;margin-bottom:22px}
        .cg-btn{width:100%;padding:14px;background:var(--gradient-boton);color:white;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;box-shadow:0 10px 26px rgba(var(--accent-rgb),0.35);display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none}
        .cg-volver{display:block;margin-top:14px;font-size:12px;color:#A3A3A3;text-decoration:none}
      `}</style>

      {/* dibujo fijo: nada real detrás del cartel */}
      <div className="cg-fondo" aria-hidden="true" inert>
        <div style={{padding:'20px',maxWidth:'900px',margin:'0 auto'}}>
          <div style={{height:'26px',width:'160px',borderRadius:'8px',background:'var(--border-light)',margin:'8px 0 24px'}}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:'16px'}}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{background:'var(--bg-card)',borderRadius:'16px',overflow:'hidden',border:'0.5px solid var(--border-light)'}}>
                <div style={{height:'130px',background:'linear-gradient(135deg,var(--accent-light),#FCE7F3)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--accent-2)'}}>
                  {i % 2 ? <Download size={30}/> : <BookOpen size={30}/>}
                </div>
                <div style={{padding:'14px'}}>
                  <div style={{height:'12px',width:'70%',borderRadius:'6px',background:'var(--border-light)',marginBottom:'8px'}}/>
                  <div style={{height:'10px',width:'45%',borderRadius:'6px',background:'var(--border-light)'}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="cg-overlay">
        <div className="cg-card">
          <div className="cg-icon"><Lock size={24} color="white"/></div>
          <div className="cg-titulo">Cursos y descargables son parte de Luma Premium</div>
          <p className="cg-desc">Vendé cursos online con aula para tus alumnas, y descargables como ebooks, audios o plantillas, desde tu página y con todo integrado a lo que ya tenés en Luma.</p>
          <div className="cg-precio">$28.000<span style={{fontSize:'14px',fontWeight:600}}>/mes</span></div>
          <div className="cg-precio-sub">Incluye todo lo del plan actual + Cursos</div>
          <a href="/suscripcion" className="cg-btn"><Sparkles size={15}/> Pasarme a Premium</a>
          <a href="/dashboard" className="cg-volver">Volver al inicio</a>
        </div>
      </div>
    </div>
  )
}