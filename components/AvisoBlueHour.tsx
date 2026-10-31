'use client'
// Aviso de una sola vez: Luma cambió de colores (etapa 6, Blue Hour). Regla: nunca cambios silenciosos.
import { useEffect, useState } from 'react'
import { Moon, Sparkles, X } from 'lucide-react'

const CLAVE = 'luma-aviso-blue-hour'

export default function AvisoBlueHour() {
  const [ver, setVer] = useState(false)
  useEffect(() => { try { if (!localStorage.getItem(CLAVE)) setVer(true) } catch {} }, [])
  if (!ver) return null
  const cerrar = () => { setVer(false); try { localStorage.setItem(CLAVE, 'visto') } catch {} }
  const probarOscuro = () => {
    document.documentElement.classList.add('dark')
    try { localStorage.setItem('luma-theme', 'dark') } catch {}
    cerrar()
    window.location.reload() // así el menú también queda en oscuro
  }
  return (
    <div role="status" className="luma-desplegable" style={{ position: 'fixed', zIndex: 450, left: 12, right: 12, top: 'calc(12px + env(safe-area-inset-top))', margin: '0 auto', maxWidth: 420,
      background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: '14px 16px', boxShadow: '0 18px 44px rgba(var(--shadow-rgb),0.22)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--saludo-bg)', color: 'var(--saludo-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Sparkles size={18}/></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>Luma se vistió de nuevo</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 2 }}>Nuevos colores, más tranquilos para trabajar. Todo está en el mismo lugar que antes.</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <button onClick={cerrar} style={{ padding: '7px 14px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'white', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>Me gusta</button>
          {!document.documentElement.classList.contains('dark') && <button onClick={probarOscuro} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}><Moon size={13}/> Probar el modo oscuro</button>}
        </div>
      </div>
      <button onClick={cerrar} aria-label="Cerrar" style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}><X size={16}/></button>
    </div>
  )
}
