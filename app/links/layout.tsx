'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { usePathname, useRouter } from 'next/navigation'
import { tieneAccesoLumaActivo } from '@/lib/accesoLinks'

const RUTAS_PUBLICAS = ['/links/login', '/links/registro']

export default function LinksLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [listo, setListo] = useState(false)

  useEffect(() => {
    if (RUTAS_PUBLICAS.includes(pathname)) { setListo(true); return }

    async function verificar() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/links/login'); return }

      const { data: perfil } = await supabase
        .from('luma_links_profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (!perfil) { router.push('/links/login'); return }
      // con Luma vigente (prueba o plan al día) su lugar es el panel de Luma
      if (await tieneAccesoLumaActivo(user.id)) { router.replace('/dashboard'); return }
      setListo(true)
    }
    verificar()
  }, [pathname])

  if (!listo) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',background:'#F5EEE4',color:'#6E7388',font:"600 14px 'Inter',sans-serif"}}>
      <style>{`@keyframes lkLay{to{transform:rotate(360deg)}}`}</style>
      <span aria-hidden="true" style={{width:'16px',height:'16px',borderRadius:'50%',border:'2px solid #E6DCCE',borderTopColor:'#27344A',animation:'lkLay 1s linear infinite'}}/>
      Cargando…
    </div>
  )
  return <>{children}</>
}