'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LayoutDashboard, Users, CalendarDays, Sparkles, TrendingUp, Settings, LogOut, Moon, Sun } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const links = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/patients', icon: Users, label: 'Pacientes' },
  { href: '/calendar', icon: CalendarDays, label: 'Agenda' },
  { href: '/services', icon: Sparkles, label: 'Servicios' },
  { href: '/finances', icon: TrendingUp, label: 'Finanzas' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('luma-theme')
    if (saved === 'dark') setDark(true)
  }, [])

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

  return (
    <>
      <style>{`
        .sb{width:180px;height:100vh;background:var(--bg-sidebar);border-right:0.5px solid var(--border);display:flex;flex-direction:column;padding:14px 8px;gap:2px;flex-shrink:0;overflow:hidden;transition:background 0.2s,border-color 0.2s}
        .sb-logo{padding:0 8px;margin-bottom:16px}
        .sb-logo-title{font-size:17px;font-weight:800;color:var(--accent);letter-spacing:-0.5px;font-family:Georgia,serif}
        .sb-logo-sub{font-size:9px;color:var(--text-muted);letter-spacing:0.3px;margin-top:1px}
        .sb-link{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;font-size:12px;font-weight:500;color:var(--text-secondary);text-decoration:none;transition:all 0.1s;white-space:nowrap}
        .sb-link:hover,.sb-link.active{background:var(--accent-hover);color:var(--text-primary)}
        .sb-div{border:none;border-top:0.5px solid var(--border-light);margin:4px 0}
        .sb-spacer{flex:1;min-height:0}
        .sb-trial{background:var(--accent-light);border-radius:8px;padding:8px 10px;border:0.5px solid var(--border);margin-bottom:4px;flex-shrink:0}
        .sb-trial-t{font-size:10px;font-weight:700;color:var(--accent);margin-bottom:1px}
        .sb-trial-s{font-size:9px;color:var(--text-muted);line-height:1.3}
        .sb-bar{height:3px;background:var(--border);border-radius:3px;margin-top:5px;overflow:hidden}
        .sb-fill{height:100%;width:65%;background:var(--accent);border-radius:3px}
        .sb-btn{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;font-size:12px;font-weight:500;color:var(--text-muted);background:none;border:none;cursor:pointer;width:100%;font-family:inherit;flex-shrink:0}
        .sb-btn:hover{background:var(--accent-hover);color:var(--text-primary)}
        .sb-theme{display:flex;align-items:center;justify-content:space-between;padding:7px 10px;border-radius:8px;margin-bottom:2px}
        .sb-theme-lbl{font-size:12px;font-weight:500;color:var(--text-muted)}
        .sb-toggle{width:36px;height:20px;border-radius:20px;border:none;cursor:pointer;position:relative;transition:background 0.2s;flex-shrink:0}
        .sb-toggle.on{background:var(--accent)}
        .sb-toggle.off{background:var(--border)}
        .sb-toggle-dot{position:absolute;top:3px;width:14px;height:14px;border-radius:50%;background:white;transition:left 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2)}
        .sb-toggle.on .sb-toggle-dot{left:19px}
        .sb-toggle.off .sb-toggle-dot{left:3px}
      `}</style>
      <aside className="sb">
        <div className="sb-logo">
          <div className="sb-logo-title">Luma</div>
          <div className="sb-logo-sub">Memoria contextual</div>
        </div>
        {links.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}
            className={`sb-link${pathname === href || pathname.startsWith(href+'/') ? ' active' : ''}`}>
            <Icon size={13} />{label}
          </Link>
        ))}
        <hr className="sb-div" />
        <Link href="/settings" className={`sb-link${pathname==='/settings'?' active':''}`}>
          <Settings size={13} />Ajustes
        </Link>
        <div className="sb-spacer" />
        <div className="sb-theme">
          <span className="sb-theme-lbl">{dark ? <Moon size={12}/> : <Sun size={12}/>}</span>
          <button className={`sb-toggle${dark?' on':' off'}`} onClick={toggleTheme}>
            <div className="sb-toggle-dot"/>
          </button>
        </div>
        <div className="sb-trial">
          <div className="sb-trial-t">✦ Trial activo</div>
          <div className="sb-trial-s">5 días restantes</div>
          <div className="sb-bar"><div className="sb-fill" /></div>
        </div>
        <button className="sb-btn" onClick={handleLogout}>
          <LogOut size={13} />Cerrar sesión
        </button>
      </aside>
    </>
  )
}