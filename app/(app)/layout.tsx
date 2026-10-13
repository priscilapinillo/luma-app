'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from "@/components/Sidebar"
import { AppProvider } from "@/lib/context"
import ToastProvider from "@/components/ToastProvider"
import { calcularAcceso, pareceDesactualizado } from '@/lib/acceso'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname() || ''
  const [verificando, setVerificando] = useState(true)
  const [sinAcceso, setSinAcceso] = useState(false)

  useEffect(() => { verificarRol() }, [])

  async function verificarRol() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: sub } = await supabase
        .from('subscriptions').select('user_id, status, trial_ends_at, current_period_ends_at, plan').eq('user_id', user.id).maybeSingle()

      if (!sub) {
        // no tiene suscripción de terapeuta — fijate si es alumna, y mandala a su propio espacio
        const { data: persona } = await supabase
          .from('persons').select('id').eq('auth_user_id', user.id).maybeSingle()
        router.push(persona ? '/mi-cuenta/cursos' : '/auth/login')
        return
      }

      // prueba o plan vencido: el mismo control que ya tenía el Inicio, ahora en todas las pantallas
      // (antes, entrando directo a Agenda, Pacientes o Ajustes se usaba la app normal)
      try {
        let nivel = calcularAcceso(sub)
        if (nivel === 'sin_acceso' && pareceDesactualizado(sub)) {
          // quizás pagó y el aviso de Mercado Pago no llegó: lo verificamos en vivo antes de bloquear
          try {
            const res = await fetch('/api/mp/verificar-suscripcion', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.id }),
            })
            const dataVerif = await res.json()
            if (dataVerif.vigente) nivel = dataVerif.plan === 'premium' ? 'premium' : 'basico'
          } catch (e) { console.error('Error verificando en vivo:', e) }
        }
        setSinAcceso(nivel === 'sin_acceso')
      } catch (e) {
        console.error('Error calculando el acceso:', e) // ante la duda, no bloqueamos
      }
      setVerificando(false)
    } catch (e) {
      console.error(e)
      router.push('/auth/login')
    }
  }

  if (verificando) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:'14px',color:'#6B7280',fontFamily:'sans-serif'}}>
      Cargando...
    </div>
  )

  // el Inicio ya muestra su propio cartel; la pantalla de planes nunca se tapa
  const mostrarBloqueo = sinAcceso && !pathname.startsWith('/dashboard') && !pathname.startsWith('/suscripcion')

  return (
    <AppProvider>
      <div className="app-container" style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', paddingLeft: '200px' }}>
        <Sidebar />
        <main style={{ 
          flex: 1, 
          overflowY: 'auto', 
          overflowX: 'hidden', 
          background: 'var(--bg)',
        }}>
          {children}
        </main>
      </div>
      <ToastProvider />
      {mostrarBloqueo && (
        <div style={{position:'fixed',inset:0,background:'rgba(20,15,35,0.45)',zIndex:99999,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',backdropFilter:'blur(14px)',WebkitBackdropFilter:'blur(14px)'}}>
          <div style={{background:'var(--bg-card)',borderRadius:'24px',padding:'36px 28px',maxWidth:'400px',width:'100%',textAlign:'center',border:'0.5px solid var(--border-light)',boxShadow:'0 40px 80px rgba(0,0,0,0.5)'}}>
            <div style={{fontSize:'44px',marginBottom:'16px'}}>✦</div>
            <div style={{fontFamily:'var(--font-display)',fontSize:'22px',fontWeight:800,color:'var(--text-primary)',marginBottom:'10px',letterSpacing:'-0.5px'}}>Tu período de prueba terminó</div>
            <p style={{fontSize:'14px',color:'var(--text-secondary)',lineHeight:1.7,marginBottom:'28px'}}>Para seguir usando Luma, elegí un plan. Podés cancelar cuando querés.</p>
            <button onClick={() => window.location.href='/suscripcion'}
              style={{width:'100%',padding:'14px',background:'linear-gradient(135deg,#8B5CF6,#A78BFA)',color:'white',border:'none',borderRadius:'12px',fontSize:'14px',fontWeight:700,cursor:'pointer',fontFamily:'inherit',marginBottom:'10px',boxShadow:'0 4px 20px rgba(139,92,246,0.3)'}}>
              ✦ Ver planes desde $9.900/mes
            </button>
            <button onClick={async () => { const supabase = createClient(); await supabase.auth.signOut(); window.location.href='/auth/login' }}
              style={{width:'100%',padding:'12px',background:'transparent',color:'var(--text-muted)',border:'0.5px solid var(--border)',borderRadius:'12px',fontSize:'13px',cursor:'pointer',fontFamily:'inherit'}}>
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </AppProvider>
  )
}