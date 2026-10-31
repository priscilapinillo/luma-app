'use client'

// Anota cada 2 minutos que la terapeuta está usando Luma (solo mientras la pestaña está a la vista).
// Sirve para "Conectadas ahora" en el panel de Admin. Si falla (o la tabla todavía no existe), no pasa nada.
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function LatidoActividad() {
  useEffect(() => {
    let parar = false
    let ultimo = 0
    const latir = async () => {
      if (parar || document.visibilityState !== 'visible' || Date.now() - ultimo < 100000) return
      ultimo = Date.now()
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        await supabase.from('luma_actividad').upsert({ user_id: user.id, visto_at: new Date().toISOString() })
      } catch {}
    }
    latir()
    const cada = setInterval(latir, 120000)
    document.addEventListener('visibilitychange', latir)
    return () => { parar = true; clearInterval(cada); document.removeEventListener('visibilitychange', latir) }
  }, [])
  return null
}
