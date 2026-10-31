'use client'

// Cartel que tapa la app cuando no hay acceso. El texto depende de si era una prueba o un plan pago.
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { tieneCobroAutomatico, type TipoEstado } from '@/lib/acceso'
import { toast } from '@/components/ToastProvider'

export default function BloqueoPlan({ tipo }: { tipo: TipoEstado | null }) {
  const eraPago = tipo === 'vencido'
  // Si venció pero Mercado Pago todavía puede cobrarle (cobro automático vivo), tiene que poder frenarlo desde acá:
  // este cartel tapa Ajustes, así que antes no tenía dónde cancelarlo.
  const [cobroVivo, setCobroVivo] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: sub } = await supabase.from('subscriptions').select('status, mp_subscription_id').eq('user_id', user.id).maybeSingle()
        setCobroVivo(tieneCobroAutomatico(sub as any))
      } catch {}
    })()
  }, [])
  async function cancelarCobro() {
    if (cancelando) return
    setCancelando(true)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      if (!session) { toast('Volvé a iniciar sesión.', 'error'); return }
      const res = await fetch('/api/cuenta/cancelar-plan', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } })
      const r = await res.json().catch(() => ({}))
      if (r.ok) { setCobroVivo(false); setConfirmando(false); toast('Listo: cancelaste el cobro automático. No se te va a cobrar más.') }
      else toast(r.error || 'No pudimos cancelar. Probá de nuevo en unos minutos.', 'error')
    } catch { toast('No pudimos conectarnos. Revisá tu internet y probá de nuevo.', 'error') }
    finally { setCancelando(false) }
  }
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(20,15,35,0.45)',zIndex:99999,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',backdropFilter:'blur(14px)',WebkitBackdropFilter:'blur(14px)'}}>
      <div role="dialog" aria-modal="true" aria-labelledby="bloqueo-titulo" style={{background:'var(--bg-card)',borderRadius:'24px',padding:'36px 28px',maxWidth:'400px',width:'100%',textAlign:'center',border:'0.5px solid var(--border-light)',boxShadow:'0 40px 80px rgba(0,0,0,0.5)'}}>
        <div style={{fontSize:'44px',marginBottom:'16px'}}>✦</div>
        <div id="bloqueo-titulo" style={{fontFamily:'var(--font-display)',fontSize:'22px',fontWeight:800,color:'var(--text-primary)',marginBottom:'10px',letterSpacing:'-0.5px'}}>
          {eraPago ? 'Tu plan venció' : 'Tu período de prueba terminó'}
        </div>
        <p style={{fontSize:'14px',color:'var(--text-secondary)',lineHeight:1.7,marginBottom:'28px'}}>
          {eraPago
            ? 'Renová tu plan para seguir usando Luma. Tus consultantes, turnos y datos siguen guardados.'
            : 'Para seguir usando Luma, elegí un plan. Podés cancelar cuando querés.'}
        </p>
        <button onClick={() => window.location.href='/suscripcion'}
          style={{width:'100%',padding:'14px',background:'linear-gradient(135deg,var(--accent),var(--accent-2))',color:'white',border:'none',borderRadius:'12px',fontSize:'14px',fontWeight:700,cursor:'pointer',fontFamily:'inherit',marginBottom:'10px',boxShadow:'0 4px 20px rgba(var(--accent-rgb),0.3)'}}>
          {eraPago ? '✦ Renovar mi plan' : '✦ Ver planes desde $9.900/mes'}
        </button>
        {cobroVivo && (!confirmando ? (
          <button onClick={() => setConfirmando(true)}
            style={{width:'100%',padding:'10px',background:'transparent',color:'var(--text-muted)',border:'none',fontSize:'12.5px',cursor:'pointer',fontFamily:'inherit',textDecoration:'underline',marginBottom:'6px'}}>
            No quiero renovar: cancelar el cobro automático
          </button>
        ) : (
          <div style={{border:'0.5px solid var(--border)',borderRadius:'12px',padding:'12px',marginBottom:'10px',fontSize:'12.5px',color:'var(--text-secondary)',lineHeight:1.5,textAlign:'left'}}>
            Mercado Pago no te va a cobrar más. Tus datos quedan guardados y podés volver cuando quieras.
            <div style={{display:'flex',gap:'8px',marginTop:'10px'}}>
              <button onClick={() => setConfirmando(false)} disabled={cancelando}
                style={{flex:1,padding:'9px',borderRadius:'9px',border:'0.5px solid var(--border)',background:'transparent',color:'var(--text-primary)',cursor:'pointer',fontFamily:'inherit',fontSize:'12.5px'}}>Mejor no</button>
              <button onClick={cancelarCobro} disabled={cancelando}
                style={{flex:1,padding:'9px',borderRadius:'9px',border:'none',background:'#B91C1C',color:'white',cursor:'pointer',fontFamily:'inherit',fontSize:'12.5px',fontWeight:600}}>{cancelando ? 'Cancelando…' : 'Sí, cancelar'}</button>
            </div>
          </div>
        ))}
        <button onClick={async () => { const supabase = createClient(); await supabase.auth.signOut(); window.location.href='/auth/login' }}
          style={{width:'100%',padding:'12px',background:'transparent',color:'var(--text-muted)',border:'0.5px solid var(--border)',borderRadius:'12px',fontSize:'13px',cursor:'pointer',fontFamily:'inherit'}}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
