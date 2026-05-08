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

  useEffect(() => {
    const saved = localStorage.getItem('luma-theme')
    if (saved === 'dark') setDark(true)
    cargarPerfil()
  }, [])

  async function cargarPerfil() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('therapist_profiles').select('nombre_profesional').eq('user_id', user.id).maybeSingle()
      if (prof?.nombre_profesional) setPerfil({ nombre: prof.nombre_profesional, plan: 'Plan Pro' })
      else setPerfil({ nombre: user.email?.split('@')[0] || 'Terapeuta', plan: 'Trial activo' })
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
  ]

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
        .sb-isotipo{width:36px;height:36px;flex-shrink:0}
        .sb-brand{display:flex;flex-direction:column}
        .sb-brand-name{font-family:'Manrope',sans-serif;font-size:19px;font-weight:800;color:#3B0F8C;letter-spacing:-0.5px;line-height:1}
        html.dark .sb-brand-name{color:#C4A8FF}
        .sb-brand-sub{font-size:9px;color:var(--text-muted);margin-top:2px;font-family:'Inter',sans-serif}

        .sb-section{font-size:9px;font-weight:700;color:var(--text-muted);letter-spacing:1.5px;text-transform:uppercase;padding:8px 10px 4px;font-family:'Inter',sans-serif}

        .sb-link{
          display:flex;align-items:center;gap:8px;
          padding:8px 10px;border-radius:10px;
          font-size:12.5px;font-weight:500;
          color:var(--text-secondary);
          text-decoration:none;
          transition:all 0.15s;
          white-space:nowrap;
          font-family:'Inter',sans-serif;
        }
        .sb-link:hover{background:rgba(139,92,246,0.08);color:var(--text-primary)}
        .sb-link.active{background:white;color:#3B0F8C;font-weight:600;box-shadow:0 2px 12px rgba(139,92,246,0.15)}
        html.dark .sb-link.active{background:rgba(139,92,246,0.2);color:#C4A8FF}

        .sb-div{border:none;border-top:0.5px solid rgba(139,92,246,0.12);margin:6px 0}
        .sb-spacer{flex:1;min-height:0}

        .sb-theme{
          display:flex;align-items:center;justify-content:space-between;
          padding:8px 10px;border-radius:10px;
          margin-bottom:4px;
          background:rgba(139,92,246,0.06);
          cursor:pointer;border:none;width:100%;
          font-family:'Inter',sans-serif;
          transition:all 0.15s;
        }
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

        .sb-user{
          display:flex;align-items:center;gap:8px;
          padding:8px 10px;border-radius:10px;
          background:rgba(255,255,255,0.6);
          border:0.5px solid rgba(139,92,246,0.15);
          transition:all 0.15s;
          font-family:'Inter',sans-serif;
        }
        html.dark .sb-user{background:rgba(255,255,255,0.05);border-color:rgba(139,92,246,0.2)}
        .sb-avatar{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#8B5CF6,#F472B6);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;flex-shrink:0;font-family:'Manrope',sans-serif}
        .sb-user-info{flex:1;min-width:0}
        .sb-user-name{font-size:11.5px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:'Manrope',sans-serif}
        .sb-user-plan{font-size:9px;color:var(--text-muted);margin-top:1px}
        .sb-logout{width:20px;height:20px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);flex-shrink:0;cursor:pointer;border-radius:5px;border:none;background:transparent;padding:0}
        .sb-logout:hover{color:#EF4444}
      `}</style>

      <aside className="sb">
        {/* HEADER */}
<div className="sb-header">
  <div className="sb-brand">
    <div className="sb-brand-name">Luma</div>
    <div className="sb-brand-sub">tu práctica, en orden</div>
  </div>
</div>

        {/* SECCIÓN PRINCIPAL */}
        <div className="sb-section">Principal</div>

        {links.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}
            className={`sb-link${pathname === href || pathname.startsWith(href+'/') ? ' active' : ''}`}>
            <Icon size={13}/>{label}
          </Link>
        ))}

        <hr className="sb-div"/>

        <Link href="/settings" className={`sb-link${pathname==='/settings'?' active':''}`}>
          <Settings size={13}/>Configuración
        </Link>

        <div className="sb-spacer"/>

        {/* TOGGLE DARK MODE */}
        <button className="sb-theme" onClick={toggleTheme}>
          <span className="sb-theme-left">
            <span>{dark ? '🌙' : '☀️'}</span>
            <span>{dark ? 'Modo oscuro' : 'Modo claro'}</span>
          </span>
          <div className={`sb-toggle${dark?' on':' off'}`}>
            <div className="sb-toggle-dot"/>
          </div>
        </button>

        {/* TRIAL */}
        <div className="sb-trial">
          <div className="sb-trial-t">✦ Trial activo</div>
          <div className="sb-trial-s">5 días restantes</div>
          <div className="sb-bar"><div className="sb-fill"/></div>
        </div>

        {/* USUARIO */}
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