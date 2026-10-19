'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from "@/components/Sidebar"
import { AppProvider } from "@/lib/context"
import ToastProvider from "@/components/ToastProvider"
import { calcularAcceso, pareceDesactualizado, estadoPlan, type TipoEstado } from '@/lib/acceso'
import BloqueoPlan from '@/components/BloqueoPlan'
import { verificarPlanEnVivo } from '@/lib/verificarPlan'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname() || ''
  const [verificando, setVerificando] = useState(true)
  const [sinAcceso, setSinAcceso] = useState(false)
  const [tipoPlan, setTipoPlan] = useState<TipoEstado | null>(null)

  useEffect(() => { verificarRol() }, [])

  async function verificarRol() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: sub } = await supabase
        .from('subscriptions').select('user_id, status, trial_ends_at, current_period_ends_at, plan, mp_subscription_id').eq('user_id', user.id).maybeSingle()

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
          const dataVerif = await verificarPlanEnVivo()
          if (dataVerif.vigente) nivel = dataVerif.plan === 'premium' ? 'premium' : 'basico'
        }
        setSinAcceso(nivel === 'sin_acceso')
        setTipoPlan(estadoPlan(sub).tipo)
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
      {mostrarBloqueo && <BloqueoPlan tipo={tipoPlan} />}
    </AppProvider>
  )
}