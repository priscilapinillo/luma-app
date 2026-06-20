'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LayoutDashboard, Users, CalendarDays, Sparkles, TrendingUp, Settings, LogOut, HelpCircle, Map } from 'lucide-react'
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

          /* ── NAV PILL GLASSMORPHISM ── */
          .sb-mobile {
            position: fixed;
            bottom: 12px;
            bottom: calc(12px + env(safe-area-inset-bottom));
            left: 50%;
            transform: translateX(-50%);
            width: calc(100% - 24px);
            max-width: 420px;
            z-index: 50;
            backdrop-filter: blur(16px) saturate(200%) contrast(180%);
            -webkit-backdrop-filter: blur(16px) saturate(200%) contrast(180%);
            background: rgba(139,92,246,0.25);
            border: 1px solid rgba(167,139,250,0.3);
            box-shadow: 0 10px 40px rgba(0,0,0,0.25), 0 2px 0 rgba(255,255,255,0.05) inset;
            padding: 6px;
            border-radius: 99rem;
            display: flex;
            justify-content: center;
            gap: 4px;
            font-family: 'Inter', sans-serif;
          }
          .sb-mobile {
  position: fixed;
  bottom: 12px;
  bottom: calc(12px + env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 24px);
  max-width: 420px;
  z-index: 200;
  backdrop-filter: blur(16px) saturate(200%);
  -webkit-backdrop-filter: blur(16px) saturate(200%);
  background: rgba(139,92,246,0.25);
  border: 1px solid rgba(167,139,250,0.4);
  box-shadow: 0 10px 40px rgba(0,0,0,0.3);
  padding: 6px;
  border-radius: 99rem;
  display: flex;
  justify-content: center;
  gap: 4px;
  font-family: 'Inter', sans-serif;
}
html.dark .sb-mobile {
  background: rgba(20,12,40,0.85);
  border-color: rgba(139,92,246,0.35);
}
.sb-mob-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1 1 0;
  min-width: 0;
 color: rgb(140 110 185 / 85%);
  text-decoration: none;
  padding: 8px 4px;
  border-radius: 999rem;
  font-size: 9px;
  font-weight: 600;
  transition: all 0.18s ease;
  -webkit-tap-highlight-color: transparent;
  gap: 3px;
}
.sb-mob-item:hover {
  background: rgba(255,255,255,0.15);
  color: rgb(205, 173, 226);
}
.sb-mob-item:active { transform: scale(0.96) }
.sb-mob-item.active {
  background: rgba(255,255,255,0.3);
  color: rgb(73, 41, 138);
}
.sb-mob-icon {
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
}

          /* ── BOTÓN FLOTANTE ── */
          .sb-float-btn {
  position: fixed;
  bottom: calc(96px + env(safe-area-inset-bottom));
  right: 16px;
  z-index: 300;
  width: 40px; height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg,#6B3FA0,#8B5CF6);
  border: 1px solid rgba(167,139,250,0.3);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 16px rgba(139,92,246,0.4);
  color: white;
  transition: all 0.2s;
}
.sb-float-btn:hover { transform: scale(1.05); box-shadow: 0 6px 20px rgba(139,92,246,0.5) }
.sb-float-btn:active { transform: scale(0.95) }

          /* ── MENÚ DESPLEGABLE ── */
          .sb-dropdown {
            position: fixed;
            bottom: calc(148px + env(safe-area-inset-bottom));
            right: 16px;
            z-index: 300;
            width: 200px;
            background: linear-gradient(139deg,rgba(26,16,50,1) 0%,rgba(37,16,52,1) 100%);
            border-radius: 14px;
            padding: 12px 0;
            display: flex;
            flex-direction: column;
            gap: 0;
            border: 0.5px solid rgba(139,92,246,0.25);
            box-shadow: 0 16px 48px rgba(0,0,0,0.5);
            animation: dropIn 0.15s ease;
          }
          html:not(.dark) .sb-dropdown {
            background: linear-gradient(139deg,rgba(255,255,255,1) 0%,rgba(248,240,255,1) 100%);
            border-color: rgba(139,92,246,0.15);
            box-shadow: 0 16px 48px rgba(0,0,0,0.15);
          }
          @keyframes dropIn {
            from { opacity:0; transform:translateY(8px) scale(0.97) }
            to { opacity:1; transform:translateY(0) scale(1) }
          }
          .sb-dropdown-sep {
            border: none;
            border-top: 1px solid rgba(139,92,246,0.15);
            margin: 6px 0;
          }
          html:not(.dark) .sb-dropdown-sep { border-top-color: rgba(139,92,246,0.1) }

          .sb-dropdown-list {
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 2px;
            padding: 0 8px;
          }
          .sb-dropdown-item {
            display: flex;
            align-items: center;
            color: rgba(167,139,250,0.8);
            gap: 10px;
            transition: all 0.2s ease;
            padding: 8px 10px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            font-family: 'Inter', sans-serif;
            text-decoration: none;
            border: none;
            background: transparent;
            width: 100%;
            text-align: left;
          }
          html:not(.dark) .sb-dropdown-item { color: rgba(107,63,160,0.8) }
          .sb-dropdown-item:hover {
            background: rgba(139,92,246,0.2);
            color: white;
            transform: translate(1px,-1px);
          }
          html:not(.dark) .sb-dropdown-item:hover {
            background: rgba(139,92,246,0.12);
            color: #6B3FA0;
          }
          .sb-dropdown-item:active { transform: scale(0.98) }
          .sb-dropdown-item.danger { color: rgba(252,165,165,0.8) }
          html:not(.dark) .sb-dropdown-item.danger { color: rgba(220,38,38,0.8) }
          .sb-dropdown-item.danger:hover {
            background: rgba(142,42,42,0.6);
            color: white;
          }
          html:not(.dark) .sb-dropdown-item.danger:hover {
            background: rgba(254,226,226,1);
            color: #DC2626;
          }

          /* ── TOGGLE THEME ── */
          .sb-mob-toggle-wrap {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 10px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            color: rgba(167,139,250,0.8);
            font-family: 'Inter', sans-serif;
            margin: 0 8px;
            transition: all 0.2s;
          }
          html:not(.dark) .sb-mob-toggle-wrap { color: rgba(107,63,160,0.8) }
          .sb-mob-toggle-wrap:hover {
            background: rgba(139,92,246,0.15);
            color: white;
          }
          html:not(.dark) .sb-mob-toggle-wrap:hover {
            background: rgba(139,92,246,0.08);
            color: #6B3FA0;
          }
          .sb-mob-toggle-left { display:flex;align-items:center;gap:8px }
          .sb-mob-toggle {
            width:36px;height:20px;border-radius:20px;
            background:rgba(139,92,246,0.3);
            position:relative;transition:background 0.2s;flex-shrink:0;
          }
          .sb-mob-toggle.on { background:linear-gradient(135deg,#6B3FA0,#8B5CF6) }
          .sb-mob-toggle-dot {
            position:absolute;top:2px;
            width:16px;height:16px;border-radius:50%;
            background:white;transition:left 0.2s;
            box-shadow:0 1px 4px rgba(0,0,0,0.3);
          }
          .sb-mob-toggle.on .sb-mob-toggle-dot { left:18px }
          .sb-mob-toggle.off .sb-mob-toggle-dot { left:2px }
        `}</style>

        {/* NAV BOTTOM */}
        <nav className="sb-mobile">
          {links.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href}
              className={`sb-mob-item${pathname === href || pathname.startsWith(href+'/') ? ' active' : ''}`}>
              <div className="sb-mob-icon"><Icon size={17}/></div>
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        {/* BOTÓN FLOTANTE */}
        <button className="sb-float-btn" onClick={() => setMenuMobile(!menuMobile)}>
  <Settings size={18}/>
</button>

        {/* MENÚ DESPLEGABLE */}
        {menuMobile && (<>
          <div className="sb-dropdown">
            {/* TOGGLE THEME */}
            <div className="sb-mob-toggle-wrap" onClick={toggleTheme}>
              <div className="sb-mob-toggle-left">
                <span>{dark ? '🌙' : '☀️'}</span>
                <span>{dark ? 'Modo oscuro' : 'Modo claro'}</span>
              </div>
              <div className={`sb-mob-toggle${dark?' on':' off'}`}>
                <div className="sb-mob-toggle-dot"/>
              </div>
            </div>

            <hr className="sb-dropdown-sep"/>

            <ul className="sb-dropdown-list">
              <li>
                <Link href="/roadmap" className="sb-dropdown-item" onClick={() => setMenuMobile(false)}>
                  <Map size={16}/> <span>Novedades</span>
                </Link>
              </li>
              <li>
                <Link href="/ayuda" className="sb-dropdown-item" onClick={() => setMenuMobile(false)}>
                  <HelpCircle size={16}/> <span>Ayuda</span>
                </Link>
              </li>
            </ul>

            <hr className="sb-dropdown-sep"/>

            <ul className="sb-dropdown-list">
              <li>
                <button className="sb-dropdown-item danger" onClick={() => { setMenuMobile(false); handleLogout() }}>
                  <LogOut size={16}/> <span>Cerrar sesión</span>
                </button>
              </li>
            </ul>
          </div>
          <div onClick={() => setMenuMobile(false)} style={{position:'fixed',inset:0,zIndex:299}}/>
        </>)}
      </>
    )
  }

  // ── SIDEBAR DESKTOP ──
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
        .sb-toggle.on{background:linear-gradient(135deg,#6B3FA0,#8B5CF6)}
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

        <Link href="/roadmap" className={`sb-link${pathname==='/roadmap'?' active':''}`}>
          <Map size={13}/>Novedades
        </Link>

        <Link href="/ayuda" className={`sb-link${pathname==='/ayuda'?' active':''}`}>
          <HelpCircle size={13}/>Ayuda
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