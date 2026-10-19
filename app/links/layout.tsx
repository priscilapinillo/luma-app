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
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>Cargando...</div>
  )
  return <>{children}</>
}