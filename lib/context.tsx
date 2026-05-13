'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { createClient } from '@/lib/supabase'

type Sesion = {
  id: string; fecha: string; hora: string
  servicio_nombre: string; precio: number
  estado_pago: string; sena: number; duracion: number
  patient_id: string; realizado: boolean
  contexto_sesion: string; hora_fin?: string
}

type AppContextType = {
  sesiones: Sesion[]
  setSesiones: (s: Sesion[]) => void
  updatePagoGlobal: (id: string, pago: string) => Promise<void>
  updateSenaGlobal: (id: string, sena: number) => Promise<void>
  recargarSesiones: () => Promise<void>
  cargando: boolean
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [sesiones, setSesiones] = useState<Sesion[]>([])
  const [cargando, setCargando] = useState(false)

  const recargarSesiones = useCallback(async () => {
    try {
      setCargando(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('sessions').select('*').eq('user_id', user.id).order('fecha', { ascending: true })
      if (data) setSesiones(data)
    } catch (err) {
      console.error('Error recargando sesiones:', err)
    } finally {
      setCargando(false)
    }
  }, [])

  const updatePagoGlobal = useCallback(async (id: string, pago: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('sessions').update({ estado_pago: pago }).eq('id', id)
    if (!error) {
      setSesiones(prev => prev.map(s => s.id === id ? { ...s, estado_pago: pago } : s))
    }
  }, [])

  const updateSenaGlobal = useCallback(async (id: string, sena: number) => {
    const supabase = createClient()
    const { error } = await supabase.from('sessions').update({ sena }).eq('id', id)
    if (!error) {
      setSesiones(prev => prev.map(s => s.id === id ? { ...s, sena } : s))
    }
  }, [])

  return (
    <AppContext.Provider value={{ sesiones, setSesiones, updatePagoGlobal, updateSenaGlobal, recargarSesiones, cargando }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext debe usarse dentro de AppProvider')
  return ctx
}