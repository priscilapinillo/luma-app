'use client'
// Aviso de una sola vez (etapa 7): se renovaron las plantillas de la página de reservas.
// Regla: nunca cambios silenciosos. Solo lo ven las cuentas que ya tenían página antes de la renovación.
// Se muestra después del aviso de Blue Hour (nunca dos avisos encimados) y queda guardado en la cuenta.
import { useEffect, useState } from 'react'
import { Palette, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { temaPublico } from '@/lib/plantillas'

const CLAVE = 'luma-aviso-plantillas'
const CLAVE_BLUE_HOUR = 'luma-aviso-blue-hour'
const FECHA_RENOVACION = new Date('2026-10-30T23:59:59-03:00').getTime()

export default function AvisoPlantillas() {
  const [datos, setDatos] = useState<{ nombre: string; slug: string } | null>(null)

  useEffect(() => {
    let vivo = true
    let timer: ReturnType<typeof setInterval> | null = null
    async function revisar() {
      try {
        if (localStorage.getItem(CLAVE)) return
      } catch {}
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !vivo) return
        if (user.user_metadata?.aviso_plantillas === 'visto') { try { localStorage.setItem(CLAVE, 'visto') } catch {} return }
        if (new Date(user.created_at).getTime() > FECHA_RENOVACION) return // cuenta nueva: no hubo cambio para ella
        const { data: perfil } = await supabase.from('therapist_profiles').select('template, template_modo, slug').eq('user_id', user.id).maybeSingle()
        if (!perfil || !perfil.slug || !vivo) return // sin página armada: no hay nada que avisar
        const tema = temaPublico(perfil.template, perfil.template_modo)
        const mostrar = () => { if (vivo) setDatos({ nombre: tema.nombre, slug: perfil.slug }) }
        // si todavía está el aviso de Blue Hour, esperamos a que lo cierre
        const blueHourVisto = () => { try { return !!localStorage.getItem(CLAVE_BLUE_HOUR) } catch { return true } }
        if (blueHourVisto()) mostrar()
        else timer = setInterval(() => { if (blueHourVisto()) { if (timer) clearInterval(timer); mostrar() } }, 1500)
      } catch {}
    }
    revisar()
    return () => { vivo = false; if (timer) clearInterval(timer) }
  }, [])

  if (!datos) return null

  const cerrar = () => {
    setDatos(null)
    try { localStorage.setItem(CLAVE, 'visto') } catch {}
    createClient().auth.updateUser({ data: { aviso_plantillas: 'visto' } }).catch(() => {})
  }

  return (
    <div role="status" className="luma-desplegable" style={{ position: 'fixed', zIndex: 450, left: 12, right: 12, top: 'calc(12px + env(safe-area-inset-top))', margin: '0 auto', maxWidth: 440,
      background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: '14px 16px', boxShadow: '0 18px 44px rgba(var(--shadow-rgb),0.22)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--saludo-bg)', color: 'var(--saludo-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Palette size={18}/></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>Renovamos las plantillas de tu página</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 2 }}>
          Te pusimos <strong>{datos.nombre}</strong>, la más parecida a la que tenías. Podés elegir otra cuando quieras. Tus textos, servicios y fotos siguen igual.
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <a href={`/p/${datos.slug}`} target="_blank" rel="noopener noreferrer" onClick={cerrar} style={{ padding: '7px 14px', borderRadius: 10, background: 'var(--accent)', color: 'white', fontWeight: 700, fontSize: 12.5, textDecoration: 'none' }}>Ver mi página</a>
          <a href="/settings?bloque=diseno" onClick={cerrar} style={{ padding: '7px 12px', borderRadius: 10, border: '1px solid var(--border)', color: 'var(--text-primary)', fontWeight: 600, fontSize: 12.5, textDecoration: 'none' }}>Elegir otra</a>
        </div>
      </div>
      <button onClick={cerrar} aria-label="Cerrar" style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}><X size={16}/></button>
    </div>
  )
}
