'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import MetaPixel from '@/components/MetaPixel'
import { eventoMeta } from '@/lib/metaPixel'
import { estadoPlan, type EstadoPlan } from '@/lib/acceso'
import { fechaLarga } from '@/lib/textoPlan'

const PLANES = [
  {
    id: 'basico',
    nombre: 'Básico',
    precio: 9900,
    features: [
      'Agenda y gestión de turnos ilimitados',
      'Historial completo de consultantes',
      'Página pública con Mercado Pago',
      'Dashboard de finanzas',
      'Archivos y notas por paciente',
    ],
  },
  {
    id: 'premium',
    nombre: 'Premium',
    precio: 28000,
    destacado: true,
    features: [
      'Todo lo del plan Básico',
      'Crear y vender cursos online',
      'Checkout y aula para tus alumnas',
      'Certificados y seguimiento de progreso',
      'Soporte prioritario',
    ],
  },
]

export default function SuscripcionPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [transferAbierta, setTransferAbierta] = useState(false)
  const [planTransfer, setPlanTransfer] = useState<'basico' | 'premium'>('basico')
  const router = useRouter()
  const [est, setEst] = useState<EstadoPlan | null>(null)

  // cómo está su plan hoy: para explicarle cuándo es el primer cobro y no ofrecerle pagar dos veces
  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: sub } = await supabase.from('subscriptions')
          .select('status, plan, trial_ends_at, current_period_ends_at, mp_subscription_id').eq('user_id', user.id).maybeSingle()
        setEst(estadoPlan(sub))
      } catch {}
    })()
  }, [])

  const conAutomatico = !!est?.automatico && est.nivel !== 'sin_acceso'
  function textoBoton(planId: string, nombre: string) {
    if (!est) return `✦ Elegir ${nombre}`
    const mismo = est.plan === planId
    if (conAutomatico && mismo && (est.tipo === 'pago' || est.tipo === 'prueba')) return 'Es tu plan actual'
    if (conAutomatico && est.tipo === 'pago' && planId === 'premium') return '✦ Pasar a Premium desde hoy'
    if (conAutomatico && est.tipo === 'pago' && planId === 'basico') return `✦ Pasar a Básico desde el ${fechaLarga(est.venceEl)}`
    if (est.tipo === 'gracia' && est.automatico && mismo) return '✦ Pagar con otra tarjeta'
    return `✦ Elegir ${nombre}`
  }
  const esPlanActual = (planId: string) => !!est && conAutomatico && est.plan === planId && (est.tipo === 'pago' || est.tipo === 'prueba')

  async function handlePagar(planId: string) {
    setError('')
    setLoading(planId)
    eventoMeta('InitiateCheckout', { content_name: planId, value: planId === 'premium' ? 28000 : 9900, currency: 'ARS' })
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }

      const res = await fetch('/api/mp/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          plan: planId,
          backUrl: process.env.NODE_ENV === 'development'
            ? 'https://lumaapp.lat/dashboard?pago=ok'
            : `${window.location.origin}/dashboard?pago=ok`,
        }),
      })

      const data = await res.json()
      if (data.init_point) {
        window.location.href = data.init_point
      } else {
        setError(data.error || 'No se pudo iniciar el pago. Intentá de nuevo.')
        setLoading(null)
      }
    } catch(e) {
      console.error(e)
      setError('Error al conectar con Mercado Pago.')
      setLoading(null)
    }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <>
      <style>{`
        
        *{box-sizing:border-box;margin:0;padding:0}
        html,body{height:100%}
        .sus-wrap{
          min-height:100vh;display:flex;align-items:center;justify-content:center;
          font-family:'Jost',sans-serif;padding:40px 20px;
          background:linear-gradient(135deg,#0D0620 0%,#1A0A3C 30%,#2D1060 60%,#1A0A2E 100%);
          position:relative;overflow:hidden;
        }
        .sus-orb1{position:absolute;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,rgba(139,92,246,0.2),transparent);top:-150px;left:-150px;pointer-events:none}
        .sus-orb2{position:absolute;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,rgba(201,168,76,0.1),transparent);bottom:-100px;right:-100px;pointer-events:none}

        .sus-inner{position:relative;z-index:1;width:100%;max-width:880px}
        .sus-logo{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:300;color:#C4A8FF;letter-spacing:5px;text-transform:uppercase;display:block;text-align:center;margin-bottom:6px}
        .sus-title{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:300;color:white;text-align:center;margin-bottom:8px;letter-spacing:-0.5px}
        .sus-sub{font-size:13px;color:#B8A8DE;text-align:center;margin-bottom:36px}

        .sus-estado{max-width:620px;margin:0 auto 24px;background:rgba(255,255,255,0.08);border:1px solid rgba(201,168,76,0.35);color:#EDE6FF;padding:14px 18px;border-radius:14px;font-size:13px;line-height:1.6;text-align:center}
        .sus-estado strong{color:#F4E3B0}
        .sus-error{max-width:500px;margin:0 auto 20px;background:rgba(248,113,113,0.12);border:1px solid rgba(248,113,113,0.3);color:#FCA5A5;padding:12px 16px;border-radius:10px;font-size:12px;text-align:center}

        .sus-grid{display:grid;grid-template-columns:1fr;gap:20px}
        @media(min-width:640px){ .sus-grid{grid-template-columns:1fr 1fr} }

        .sus-card{
          background:rgba(255,255,255,0.97);
          border-radius:24px;padding:32px 28px;
          box-shadow:0 30px 70px rgba(0,0,0,0.4);
          display:flex;flex-direction:column;
          position:relative;
        }
        .sus-card.destacado{box-shadow:0 30px 70px rgba(139,92,246,0.35),0 0 0 2px #8B5CF6}
        .sus-badge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#7C3AED,#A78BFA);color:white;font-size:10px;font-weight:700;padding:5px 14px;border-radius:20px;letter-spacing:0.5px}

        .sus-plan-nombre{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:500;color:#1A1035;margin-bottom:12px}
        .sus-precio-num{font-family:'Cormorant Garamond',serif;font-size:40px;font-weight:300;color:#4C1D95;line-height:1}
        .sus-precio-per{font-size:12px;color:#9B8EC4;margin-bottom:20px}

        .sus-features{text-align:left;margin-bottom:24px;display:flex;flex-direction:column;gap:9px;flex:1}
        .sus-feat{display:flex;align-items:flex-start;gap:9px;font-size:12.5px;color:#4A3F6B;line-height:1.4}
        .sus-feat-check{width:18px;height:18px;border-radius:50%;background:linear-gradient(135deg,#8B5CF6,#A78BFA);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}

        .sus-btn{
          width:100%;padding:14px;
          background:linear-gradient(135deg,#7C3AED,#8B5CF6,#A78BFA);
          color:white;border:none;border-radius:12px;
          font-size:13px;font-weight:600;cursor:pointer;
          font-family:'Jost',sans-serif;letter-spacing:0.5px;
          box-shadow:0 8px 24px rgba(124,58,237,0.35);
          transition:all 0.3s;
        }
        .sus-btn:hover{transform:translateY(-1px);box-shadow:0 12px 32px rgba(124,58,237,0.45)}
        .sus-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none}

        .sus-seguro{font-size:11px;color:#B8A8DE;margin-top:24px;text-align:center;display:flex;align-items:center;justify-content:center;gap:5px}
        .sus-transfer-link{display:block;margin:14px auto 0;font-size:11.5px;color:#9B8EC4;background:none;border:none;cursor:pointer;font-family:'Jost',sans-serif;text-decoration:underline;text-align:center}
        .sus-transfer-link:hover{color:#C4B5FD}
        .sus-transfer-box{max-width:440px;margin:16px auto 0;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:20px 22px}
        .sus-transfer-tabs{display:flex;gap:8px;margin-bottom:16px}
        .sus-transfer-tab{flex:1;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:#B8A8DE;font-size:12px;font-weight:600;cursor:pointer;font-family:'Jost',sans-serif}
        .sus-transfer-tab.act{background:rgba(139,92,246,0.3);border-color:#8B5CF6;color:white}
        .sus-transfer-row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.08);font-size:12.5px}
        .sus-transfer-row:last-of-type{border-bottom:none}
        .sus-transfer-lbl{color:#9B8EC4}
        .sus-transfer-val{color:white;font-weight:600}
        .sus-transfer-nota{font-size:11.5px;color:#B8A8DE;line-height:1.6;margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.1)}
        .sus-transfer-nota a{color:#C4B5FD}
        .sus-divider{border:none;border-top:0.5px solid rgba(255,255,255,0.1);margin:16px auto;max-width:200px}
        .sus-logout{font-size:12px;color:#C4B5FD;cursor:pointer;background:none;border:none;font-family:'Jost',sans-serif;padding:0;display:block;margin:0 auto;transition:color 0.2s}
        .sus-logout:hover{color:white}
      `}</style>

      <div className="sus-wrap">
        <div className="sus-orb1"/><div className="sus-orb2"/>
          <MetaPixel/>
        <div className="sus-inner">
          <span className="sus-logo">Luma</span>
          <h1 className="sus-title">Elegí tu plan</h1>
          <p className="sus-sub">Cancelás cuando quieras · Cobro mensual automático por Mercado Pago, solo con tarjeta de crédito o débito</p>

          {error && <div className="sus-error">{error}</div>}

          {est && (est.tipo === 'pago' || est.tipo === 'prueba' || est.tipo === 'cancelado_vigente' || est.tipo === 'gracia') && (
            <div className="sus-estado" role="status">
              {est.tipo === 'prueba' && !est.automatico && <>Estás en tu prueba gratis hasta el <strong>{fechaLarga(est.venceEl)}</strong>. Si elegís un plan ahora, <strong>el primer cobro es ese día</strong>: no perdés los días que te quedan.</>}
              {est.tipo === 'prueba' && est.automatico && <>Ya activaste el cobro automático del plan <strong>{est.plan === 'premium' ? 'Premium' : 'Básico'}</strong>. El primer cobro es el <strong>{fechaLarga(est.venceEl)}</strong>, cuando termina tu prueba.</>}
              {est.tipo === 'pago' && est.automatico && <>Tenés el plan <strong>{est.plan === 'premium' ? 'Premium' : 'Básico'}</strong> con cobro automático. El próximo cobro es el <strong>{fechaLarga(est.venceEl)}</strong>.</>}
              {est.tipo === 'pago' && !est.automatico && <>Tenés tu plan pago hasta el <strong>{fechaLarga(est.venceEl)}</strong>. Si activás el cobro automático ahora, <strong>el primer cobro es ese día</strong>: nunca pagás dos veces el mismo mes.</>}
              {est.tipo === 'cancelado_vigente' && <>Cancelaste el cobro automático y tenés todo hasta el <strong>{fechaLarga(est.venceEl)}</strong>. Si lo volvés a activar, <strong>el primer cobro es ese día</strong>.</>}
              {est.tipo === 'gracia' && <>Tu plan venció el <strong>{fechaLarga(est.venceEl)}</strong>{est.automatico ? ' y Mercado Pago no pudo cobrarlo' : ''}. Todo sigue funcionando hasta el <strong>{fechaLarga(est.graciaHasta)}</strong>. Si pagás ahora, el mes nuevo empieza el {fechaLarga(est.venceEl)}: no pagás de más.</>}
            </div>
          )}

          <div className="sus-grid">
            {PLANES.map(p => (
              <div key={p.id} className={`sus-card${p.destacado ? ' destacado' : ''}`}>
                {p.destacado && <div className="sus-badge">Más elegido</div>}
                <div className="sus-plan-nombre">{p.nombre}</div>
                <div className="sus-precio-num">${p.precio.toLocaleString('es-AR')}</div>
                <div className="sus-precio-per">ARS por mes</div>

                <div className="sus-features">
                  {p.features.map((f, i) => (
                    <div key={i} className="sus-feat">
                      <div className="sus-feat-check"><Check size={9} color="white"/></div>
                      {f}
                    </div>
                  ))}
                </div>

                <button className="sus-btn" onClick={() => handlePagar(p.id)} disabled={loading !== null || esPlanActual(p.id)}>
                  {loading === p.id ? '⏳ Redirigiendo...' : textoBoton(p.id, p.nombre)}
                </button>
              </div>
            ))}
          </div>

          <div className="sus-seguro">🔒 Pago seguro con Mercado Pago</div>
          <div className="sus-seguro" style={{marginTop:'6px',lineHeight:1.5}}>Podés pagar con cualquier cuenta de Mercado Pago, aunque tenga otro email. No elijas &quot;dinero en cuenta&quot;: el cobro mensual solo funciona con tarjeta.</div>

          {conAutomatico ? (
            <div className="sus-seguro" style={{marginTop:'14px'}}>Como ya tenés el cobro automático, no hace falta pagar por transferencia.</div>
          ) : !transferAbierta ? (
            <button className="sus-transfer-link" onClick={() => setTransferAbierta(true)}>
              ¿Preferís pagar por transferencia?
            </button>
          ) : (
            <div className="sus-transfer-box">
              <div className="sus-transfer-tabs">
                <button className={`sus-transfer-tab${planTransfer==='basico'?' act':''}`} onClick={() => setPlanTransfer('basico')}>Básico — $9.900</button>
                <button className={`sus-transfer-tab${planTransfer==='premium'?' act':''}`} onClick={() => setPlanTransfer('premium')}>Premium — $28.000</button>
              </div>
              <div className="sus-transfer-row"><span className="sus-transfer-lbl">Alias</span><span className="sus-transfer-val">Luma.app</span></div>
              <div className="sus-transfer-row"><span className="sus-transfer-lbl">CBU</span><span className="sus-transfer-val">0170094740000040824239</span></div>
              <div className="sus-transfer-row"><span className="sus-transfer-lbl">Titular</span><span className="sus-transfer-val">Priscila Nair Soledad Pinillo</span></div>
              <div className="sus-transfer-row"><span className="sus-transfer-lbl">Banco</span><span className="sus-transfer-val">BBVA</span></div>
              <div className="sus-transfer-nota">
                Una vez que transferís, mandanos el comprobante a <a href="mailto:lumaapp.soporte@gmail.com">lumaapp.soporte@gmail.com</a> junto con el email con el que te registraste en Luma. Activamos tu cuenta en menos de 24hs.
              </div>
            </div>
          )}

          <hr className="sus-divider"/>
          <button className="sus-logout" onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </div>
    </>
  )
}
