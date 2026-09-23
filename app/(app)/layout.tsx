'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from "@/components/Sidebar"
import { AppProvider } from "@/lib/context"
import ToastProvider from "@/components/ToastProvider"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [verificando, setVerificando] = useState(true)

  useEffect(() => { verificarRol() }, [])

  async function verificarRol() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: sub } = await supabase
        .from('subscriptions').select('user_id').eq('user_id', user.id).maybeSingle()

      if (!sub) {
        // no tiene suscripción de terapeuta — fijate si es alumna, y mandala a su propio espacio
        const { data: persona } = await supabase
          .from('persons').select('id').eq('auth_user_id', user.id).maybeSingle()
        router.push(persona ? '/mi-cuenta/cursos' : '/auth/login')
        return
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
    </AppProvider>
  )
}