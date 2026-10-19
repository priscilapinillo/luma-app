'use client'

// Cartel que tapa la app cuando no hay acceso. El texto depende de si era una prueba o un plan pago.
import { createClient } from '@/lib/supabase'
import type { TipoEstado } from '@/lib/acceso'

export default function BloqueoPlan({ tipo }: { tipo: TipoEstado | null }) {
  const eraPago = tipo === 'vencido'
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
          style={{width:'100%',padding:'14px',background:'linear-gradient(135deg,#8B5CF6,#A78BFA)',color:'white',border:'none',borderRadius:'12px',fontSize:'14px',fontWeight:700,cursor:'pointer',fontFamily:'inherit',marginBottom:'10px',boxShadow:'0 4px 20px rgba(139,92,246,0.3)'}}>
          {eraPago ? '✦ Renovar mi plan' : '✦ Ver planes desde $9.900/mes'}
        </button>
        <button onClick={async () => { const supabase = createClient(); await supabase.auth.signOut(); window.location.href='/auth/login' }}
          style={{width:'100%',padding:'12px',background:'transparent',color:'var(--text-muted)',border:'0.5px solid var(--border)',borderRadius:'12px',fontSize:'13px',cursor:'pointer',fontFamily:'inherit'}}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
