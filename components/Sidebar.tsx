'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Users, CalendarDays, Sparkles, TrendingUp, Settings, LogOut } from 'lucide-react'
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

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <>
      <style>{`
        .sb{width:180px;height:100vh;background:white;border-right:0.5px solid #E2D9FF;display:flex;flex-direction:column;padding:14px 8px;gap:2px;flex-shrink:0;overflow:hidden}
        .sb-logo{padding:0 8px;margin-bottom:16px}
        .sb-logo-title{font-size:17px;font-weight:800;color:#3B0F8C;letter-spacing:-0.5px;font-family:Georgia,serif}
        .sb-logo-sub{font-size:9px;color:#A99CC4;letter-spacing:0.3px;margin-top:1px}
        .sb-link{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;font-size:12px;font-weight:500;color:#7C6BAA;text-decoration:none;transition:all 0.1s;white-space:nowrap}
        .sb-link:hover,.sb-link.active{background:#F0EBFF;color:#3B0F8C}
        .sb-div{border:none;border-top:0.5px solid #EDE9FF;margin:4px 0}
        .sb-spacer{flex:1;min-height:0}
        .sb-trial{background:#F8F5FF;border-radius:8px;padding:8px 10px;border:0.5px solid #E2D9FF;margin-bottom:4px;flex-shrink:0}
        .sb-trial-t{font-size:10px;font-weight:700;color:#3B0F8C;margin-bottom:1px}
        .sb-trial-s{font-size:9px;color:#A99CC4;line-height:1.3}
        .sb-bar{height:3px;background:#E2D9FF;border-radius:3px;margin-top:5px;overflow:hidden}
        .sb-fill{height:100%;width:65%;background:#8B5CF6;border-radius:3px}
        .sb-btn{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;font-size:12px;font-weight:500;color:#A99CC4;background:none;border:none;cursor:pointer;width:100%;font-family:inherit;flex-shrink:0}
        .sb-btn:hover{background:#F0EBFF;color:#3B0F8C}
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