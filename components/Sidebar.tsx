'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LayoutDashboard, Users, CalendarDays, Sparkles, TrendingUp, Settings, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [dark, setDark] = useState(false)
  const [perfil, setPerfil] = useState({ nombre: '', plan: 'Trial activo' })
  const [isMobile, setIsMobile] = useState(false)
  const [menuMobile, setMenuMobile] = useState(false)
  const [sub, setSub] = useState<{status: string, trial_ends_at: string | null, current_period_ends_at: string | null} | null>(null)
  useEffect(() => {
    const saved = localStorage.getItem('luma-theme')
    if (saved === 'dark') setDark(true)
    cargarPerfil()
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  async function cargarPerfil() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: prof }, { data: sub }] = await Promise.all([
        supabase.from('therapist_profiles').select('nombre_profesional').eq('user_id', user.id).maybeSingle(),
        supabase.from('subscriptions').select('status, trial_ends_at, current_period_ends_at').eq('user_id', user.id).maybeSingle(),
      ])
      const planLabel = sub?.status === 'active' ? 'Plan activo' : sub?.status === 'trial' ? 'Trial activo' : 'Sin plan'
setPerfil({ 
  nombre: prof?.nombre_profesional || user.email?.split('@')[0] || 'Terapeuta', 
  plan: planLabel 
})
      if (sub) setSub(sub)
    } catch (err) {
      console.error('Error perfil:', err)
    }
  }

  function toggleTheme() {
    const newDark = !dark
    setDark(newDark)
    if (newDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('luma-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('luma-theme', 'light')
    }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const iniciales = perfil.nombre.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || '?'

  const links = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Inicio' },
    { href: '/calendar', icon: CalendarDays, label: 'Agenda' },
    { href: '/patients', icon: Users, label: 'Pacientes' },
    { href: '/services', icon: Sparkles, label: 'Servicios' },
    { href: '/finances', icon: TrendingUp, label: 'Finanzas' },
    { href: '/settings', icon: Settings, label: 'Ajustes' },
  ]

  if (isMobile) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap');
          .sb-mobile{
            position:fixed;bottom:0;left:0;right:0;z-index:200;
            background:rgba(255,255,255,0.95);
            backdrop-filter:blur(12px);
            border-top:0.5px solid rgba(139,92,246,0.15);
            display:flex;align-items:center;justify-content:space-around;
            padding:8px 0 max(8px,env(safe-area-inset-bottom));
            font-family:'Inter',sans-serif;
          }
          html.dark .sb-mobile{
            background:rgba(19,17,31,0.95);
            border-top-color:rgba(100,80,180,0.2);
          }
          .sb-mob-item{
            display:flex;flex-direction:column;align-items:center;gap:3px;
            padding:6px 10px;border-radius:12px;
            text-decoration:none;color:var(--text-muted);
            transition:all 0.15s;font-size:9px;font-weight:500;
            min-width:48px;
          }
          .sb-mob-item.active{color:var(--accent)}
          .sb-mob-item.active .sb-mob-icon{
            background:var(--accent-light);
            color:var(--accent);
          }
          .sb-mob-icon{
            width:32px;height:32px;border-radius:10px;
            display:flex;align-items:center;justify-content:center;
            transition:all 0.15s;
          }
        `}</style>

        <nav className="sb-mobile">
          {links.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href}
              className={`sb-mob-item${pathname === href || pathname.startsWith(href+'/') ? ' active' : ''}`}>
              <div className="sb-mob-icon"><Icon size={18}/></div>
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        {/* BOTÓN FLOTANTE */}
        <button onClick={() => setMenuMobile(!menuMobile)} style={{
          position:'fixed',bottom:'72px',right:'16px',zIndex:300,
          width:'44px',height:'44px',borderRadius:'50%',
          background:'linear-gradient(135deg,#8B5CF6,#A78BFA)',
          border:'none',cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'center',
          boxShadow:'0 4px 16px rgba(139,92,246,0.4)',
          fontSize:'18px',
        }}>⚙️</button>

        {menuMobile && (<>
          <div style={{
            position:'fixed',bottom:'124px',right:'16px',zIndex:300,
            background:'var(--bg-card)',borderRadius:'16px',
            border:'0.5px solid var(--border-light)',
            boxShadow:'0 8px 32px rgba(0,0,0,0.2)',
            overflow:'hidden',minWidth:'180px',
          }}>
            <button onClick={toggleTheme} style={{
              width:'100%',padding:'12px 16px',background:'transparent',
              border:'none',borderBottom:'0.5px solid var(--border-light)',
              display:'flex',alignItems:'center',gap:'10px',
              fontSize:'13px',color:'var(--text-primary)',cursor:'pointer',
              fontFamily:'inherit',textAlign:'left' as const,
            }}>
              {dark ? '☀️' : '🌙'} {dark ? 'Modo claro' : 'Modo oscuro'}
            </button>
            <button onClick={() => { setMenuMobile(false); handleLogout() }} style={{
              width:'100%',padding:'12px 16px',background:'transparent',
              border:'none',borderBottom:'0.5px solid var(--border-light)',
              display:'flex',alignItems:'center',gap:'10px',
              fontSize:'13px',color:'var(--text-primary)',cursor:'pointer',
              fontFamily:'inherit',textAlign:'left' as const,
            }}>
              🚪 Cerrar sesión
            </button>
            <a href="/ayuda" style={{
      display:'flex',alignItems:'center',gap:'10px',
      padding:'12px 16px',
      fontSize:'13px',color:'var(--text-primary)',textDecoration:'none',
    }}>
      💬 Ayuda
    </a>
          </div>
          <div onClick={() => setMenuMobile(false)} style={{
            position:'fixed',inset:0,zIndex:299,
          }}/>
        </>)}
      </>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap');
        .sb{
          width:200px;height:100vh;
          background:linear-gradient(160deg,#F8F0FF 0%,#EEE8FF 40%,#F5E8FF 70%,#FFE8F5 100%);
          border-right:0.5px solid rgba(139,92,246,0.15);
          display:flex;flex-direction:column;
          padding:16px 10px;gap:2px;
          flex-shrink:0;overflow:hidden;
          transition:all 0.2s;
          font-family:'Inter',sans-serif;
        }
        html.dark .sb{
          background:linear-gradient(160deg,#1A1628 0%,#1E1A2E 40%,#211828 70%,#1E1520 100%);
          border-right-color:rgba(100,80,180,0.2);
        }
        .sb-header{padding:4px 8px 18px;display:flex;align-items:center;gap:10px}
        .sb-brand{display:flex;flex-direction:column}
        .sb-brand-name{font-family:'Manrope',sans-serif;font-size:19px;font-weight:800;color:#3B0F8C;letter-spacing:-0.5px;line-height:1}
        html.dark .sb-brand-name{color:#C4A8FF}
        .sb-brand-sub{font-size:9px;color:var(--text-muted);margin-top:2px;font-family:'Inter',sans-serif}
        .sb-section{font-size:9px;font-weight:700;color:var(--text-muted);letter-spacing:1.5px;text-transform:uppercase;padding:8px 10px 4px;font-family:'Inter',sans-serif}
        .sb-link{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;font-size:12.5px;font-weight:500;color:var(--text-secondary);text-decoration:none;transition:all 0.15s;white-space:nowrap;font-family:'Inter',sans-serif}
        .sb-link:hover{background:rgba(139,92,246,0.08);color:var(--text-primary)}
        .sb-link.active{background:white;color:#3B0F8C;font-weight:600;box-shadow:0 2px 12px rgba(139,92,246,0.15)}
        html.dark .sb-link.active{background:rgba(139,92,246,0.2);color:#C4A8FF}
        .sb-div{border:none;border-top:0.5px solid rgba(139,92,246,0.12);margin:6px 0}
        .sb-spacer{flex:1;min-height:0}
        .sb-theme{display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:10px;margin-bottom:4px;background:rgba(139,92,246,0.06);cursor:pointer;border:none;width:100%;font-family:'Inter',sans-serif;transition:all 0.15s}
        .sb-theme:hover{background:rgba(139,92,246,0.1)}
        .sb-theme-left{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:500;color:var(--text-secondary)}
        .sb-toggle{width:32px;height:18px;border-radius:20px;border:none;cursor:pointer;position:relative;transition:background 0.2s;flex-shrink:0;background:var(--border)}
        .sb-toggle.on{background:var(--accent)}
        .sb-toggle-dot{position:absolute;top:2px;width:14px;height:14px;border-radius:50%;background:white;transition:left 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2)}
        .sb-toggle.on .sb-toggle-dot{left:16px}
        .sb-toggle.off .sb-toggle-dot{left:2px}
        .sb-trial{background:rgba(139,92,246,0.08);border-radius:10px;padding:8px 10px;border:0.5px solid rgba(139,92,246,0.15);margin-bottom:6px;flex-shrink:0}
        html.dark .sb-trial{background:rgba(139,92,246,0.15);border-color:rgba(139,92,246,0.25)}
        .sb-trial-t{font-size:10px;font-weight:700;color:var(--accent);margin-bottom:1px;font-family:'Manrope',sans-serif}
        .sb-trial-s{font-size:9px;color:var(--text-muted);line-height:1.3}
        .sb-bar{height:3px;background:var(--border);border-radius:3px;margin-top:5px;overflow:hidden}
        .sb-fill{height:100%;width:65%;background:linear-gradient(90deg,#8B5CF6,#F472B6);border-radius:3px}
        .sb-user{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,0.6);border:0.5px solid rgba(139,92,246,0.15);transition:all 0.15s;font-family:'Inter',sans-serif}
        html.dark .sb-user{background:rgba(255,255,255,0.05);border-color:rgba(139,92,246,0.2)}
        .sb-avatar{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#8B5CF6,#F472B6);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;flex-shrink:0;font-family:'Manrope',sans-serif}
        .sb-user-info{flex:1;min-width:0}
        .sb-user-name{font-size:11.5px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:'Manrope',sans-serif}
        .sb-user-plan{font-size:9px;color:var(--text-muted);margin-top:1px}
        .sb-logout{width:20px;height:20px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);flex-shrink:0;cursor:pointer;border-radius:5px;border:none;background:transparent;padding:0}
        .sb-logout:hover{color:#EF4444}
      `}</style>

      <aside className="sb">
        <div className="sb-header">
          <div className="sb-brand">
            <div className="sb-brand-name">Luma</div>
            <div className="sb-brand-sub">tu práctica, en orden</div>
          </div>
        </div>

        <div className="sb-section">Principal</div>

        {links.slice(0,5).map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}
            className={`sb-link${pathname === href || pathname.startsWith(href+'/') ? ' active' : ''}`}>
            <Icon size={13}/>{label}
          </Link>
        ))}

        <hr className="sb-div"/>

        <Link href="/settings" className={`sb-link${pathname==='/settings'?' active':''}`}>
          <Settings size={13}/>Configuración
        </Link>

        <Link href="/ayuda" className={`sb-link${pathname==='/ayuda'?' active':''}`}>
          <span style={{fontSize:'13px'}}>💬</span>Ayuda
        </Link>

        <div className="sb-spacer"/>

        <button className="sb-theme" onClick={toggleTheme}>
          <span className="sb-theme-left">
            <span>{dark ? '🌙' : '☀️'}</span>
            <span>{dark ? 'Modo oscuro' : 'Modo claro'}</span>
          </span>
          <div className={`sb-toggle${dark?' on':' off'}`}>
            <div className="sb-toggle-dot"/>
          </div>
        </button>

        {sub && (() => {
  const ahora = new Date()
  const esActivo = sub.status === 'active' && sub.current_period_ends_at && new Date(sub.current_period_ends_at) > ahora
  const esTrial = sub.status === 'trial' && sub.trial_ends_at
  const diasRestantes = esTrial ? Math.max(0, Math.ceil((new Date(sub.trial_ends_at!).getTime() - ahora.getTime()) / (1000*60*60*24))) : 0
  const pct = esTrial ? Math.round((diasRestantes / 7) * 100) : 100

  return (
    <div className="sb-trial" style={{background: esActivo ? 'rgba(16,185,129,0.08)' : 'rgba(139,92,246,0.08)', borderColor: esActivo ? 'rgba(16,185,129,0.2)' : 'rgba(139,92,246,0.15)'}}>
      <div className="sb-trial-t" style={{color: esActivo ? '#059669' : 'var(--accent)'}}>
        {esActivo ? '✓ Plan activo' : esTrial ? '✦ Trial activo' : '⚠️ Trial vencido'}
      </div>
      <div className="sb-trial-s">
        {esActivo ? 'Suscripción vigente' : esTrial ? `${diasRestantes} días restantes` : 'Activá tu suscripción'}
      </div>
      {esTrial && <div className="sb-bar"><div className="sb-fill" style={{width:`${pct}%`}}/></div>}
      {!esActivo && !esTrial && (
        <a href="/suscripcion" style={{fontSize:'10px',color:'var(--accent)',fontWeight:600,textDecoration:'none',display:'block',marginTop:'6px'}}>
          Activar ahora →
        </a>
      )}
    </div>
  )
})()}

        <div className="sb-user">
          <div className="sb-avatar">{iniciales}</div>
          <div className="sb-user-info">
            <div className="sb-user-name">{perfil.nombre}</div>
            <div className="sb-user-plan">{perfil.plan} · activo</div>
          </div>
          <button className="sb-logout" onClick={handleLogout} title="Cerrar sesión">
            <LogOut size={11}/>
          </button>
        </div>
      </aside>
    </>
  )
}