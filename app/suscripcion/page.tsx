'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import MetaPixel from '@/components/MetaPixel'
import { eventoMeta } from '@/lib/metaPixel'
import { estadoPlan, type EstadoPlan } from '@/lib/acceso'
import { fechaLarga } from '@/lib/textoPlan'
import TarjetaMP, { hayTarjetaEnLuma } from '@/components/TarjetaMP'
import { toast } from '@/components/ToastProvider'

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

type Ciclo = 'mensual' | 'anual'
type Metodo = 'tarjeta' | 'mercadopago' | 'transferencia'
type Cotiz = { monto?: number; detalle?: string; error?: string; cancelaAutomatico?: boolean }
const ANUAL: Record<string, number> = { basico: 99000, premium: 280000 }
const pesos = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')

const IcoTarjeta = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h3"/></svg>
const IcoMP = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5c1.5 1.5 2.5 1.5 4 0s2.5-1.5 4 0"/></svg>
const IcoBanco = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10l9-6 9 6M5 10v8M19 10v8M9.5 10v8M14.5 10v8M3 20h18"/></svg>

async function tokenSesion() {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token || ''
}

export default function SuscripcionPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const router = useRouter()
  const [est, setEst] = useState<EstadoPlan | null>(null)
  const [ciclo, setCiclo] = useState<Ciclo>('mensual')
  const [planSel, setPlanSel] = useState<'basico' | 'premium' | null>(null)
  const [metodo, setMetodo] = useState<Metodo | null>(null)
  const [cotiz, setCotiz] = useState<Cotiz | null>(null)
  const [cotizando, setCotizando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [pendiente, setPendiente] = useState<{ monto: number; concepto: string; plan: string; avisado_at: string } | null>(null)
  const [upgrade, setUpgrade] = useState<Cotiz | null>(null)
  const [upgradeMetodo, setUpgradeMetodo] = useState<'mercadopago' | 'transferencia' | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const pedidoCotiz = useRef(0)

  // cómo está su plan hoy, si tiene una transferencia esperando y si puede pasar a Premium pagando la diferencia
  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: sub } = await supabase.from('subscriptions')
          .select('status, plan, trial_ends_at, current_period_ends_at, mp_subscription_id').eq('user_id', user.id).maybeSingle()
        const e = estadoPlan(sub)
        setEst(e)
        try {
          const { data: pend } = await supabase.from('luma_intentos').select('monto, concepto, plan, avisado_at').eq('user_id', user.id).eq('estado', 'pendiente').maybeSingle()
          if (pend) setPendiente(pend as any)
        } catch {}
        if ((e.tipo === 'pago' || e.tipo === 'cancelado_vigente') && e.plan === 'basico' && !e.automatico) {
          const c = await cotizarEnServidor('diferencia', 'premium')
          if (c && !c.error) setUpgrade(c)
        }
      } catch {}
    })()
    try { if (new URLSearchParams(window.location.search).get('pago') === 'no') setError('El pago no se completó. No se te cobró nada: podés intentarlo de nuevo.') } catch {}
  }, [])

  async function cotizarEnServidor(concepto: string, plan: string): Promise<Cotiz | null> {
    try {
      const res = await fetch('/api/plan/cotizar', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await tokenSesion()}` }, body: JSON.stringify({ concepto, plan }) })
      return await res.json().catch(() => null)
    } catch { return null }
  }

  // cada vez que cambia lo elegido, el servidor dice cuánto es (o por qué no se puede)
  const concepto = ciclo === 'anual' ? 'anual' : 'mes'
  useEffect(() => {
    setCotiz(null)
    if (!planSel || !metodo || metodo === 'tarjeta') return
    const yo = ++pedidoCotiz.current
    setCotizando(true)
    cotizarEnServidor(concepto, planSel).then(c => { if (yo === pedidoCotiz.current) { setCotiz(c || { error: 'No pudimos calcular el monto. Probá de nuevo.' }); setCotizando(false) } })
  }, [planSel, metodo, concepto])

  const conAutomatico = !!est?.automatico && est.nivel !== 'sin_acceso'
  function textoBoton(planId: string, nombre: string) {
    if (ciclo === 'anual') return `✦ Elegir ${nombre} anual`
    if (!est) return `✦ Elegir ${nombre}`
    const mismo = est.plan === planId
    if (conAutomatico && mismo && (est.tipo === 'pago' || est.tipo === 'prueba')) return 'Es tu plan actual'
    if (conAutomatico && est.tipo === 'pago' && planId === 'premium') return '✦ Pasar a Premium desde hoy'
    if (conAutomatico && est.tipo === 'pago' && planId === 'basico') return `✦ Pasar a Básico desde el ${fechaLarga(est.venceEl)}`
    if (est.tipo === 'gracia' && est.automatico && mismo) return '✦ Pagar con otra tarjeta'
    return `✦ Elegir ${nombre}`
  }
  const esPlanActual = (planId: string) => ciclo === 'mensual' && !!est && conAutomatico && est.plan === planId && (est.tipo === 'pago' || est.tipo === 'prueba')

  function elegirPlan(planId: 'basico' | 'premium') {
    setError('')
    setPlanSel(planId)
    // con cobro automático andando, cambiar de plan mensual sigue siendo con tarjeta (se ajusta solo)
    setMetodo(ciclo === 'mensual' ? 'tarjeta' : 'mercadopago')
    eventoMeta('InitiateCheckout', { content_name: planId, value: ciclo === 'anual' ? ANUAL[planId] : (planId === 'premium' ? 28000 : 9900), currency: 'ARS' })
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }
  function cambiarCiclo(c: Ciclo) { setCiclo(c); setPlanSel(null); setMetodo(null); setError('') }

  // cobro automático por la página de Mercado Pago (como siempre)
  async function irAMercadoPagoSuscripcion(planId: string) {
    setError('')
    setLoading(planId)
    try {
      const token = await tokenSesion()
      if (!token) { router.push('/auth/login'); return }
      const res = await fetch('/api/mp/create-subscription', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan: planId }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.init_point) window.location.href = data.init_point
      else { setError(data.error || 'No se pudo iniciar el pago. Intentá de nuevo.'); setLoading(null) }
    } catch { setError('Error al conectar con Mercado Pago.'); setLoading(null) }
  }

  // un mes / anual / diferencia: Mercado Pago (redirige) o "Ya transferí"
  async function pagar(conc: string, plan: string, met: 'mercadopago' | 'transferencia') {
    if (enviando) return
    setEnviando(true); setError('')
    try {
      const res = await fetch('/api/plan/pagar', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await tokenSesion()}` }, body: JSON.stringify({ concepto: conc, plan, metodo: met }) })
      const r = await res.json().catch(() => ({}))
      if (met === 'mercadopago') {
        if (r.link) { window.location.href = r.link; return }
        setError(r.error || 'No se pudo preparar el pago. Probá de nuevo.')
      } else if (r.ok) {
        setPendiente({ monto: Number(r.monto) || 0, concepto: conc, plan, avisado_at: new Date().toISOString() })
        toast(r.yaAvisada ? 'Ya teníamos tu aviso: lo estamos revisando.' : 'Listo: te avisamos por mail cuando lo confirmemos.')
      } else setError(r.error || 'No pudimos registrar tu aviso. Probá de nuevo.')
    } catch { setError('No pudimos conectarnos. Revisá tu internet y probá de nuevo.') }
    finally { setEnviando(false) }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const precioPlan = (p: typeof PLANES[number]) => ciclo === 'anual' ? ANUAL[p.id] : p.precio
  const nombreSel = planSel === 'premium' ? 'Premium' : 'Básico'
  const montoTarjeta = planSel === 'premium' ? 28000 : 9900
  const datosTransfer = (monto?: number) => (
    <div className="sus-transfer-box" style={{ margin: '4px 0 0', maxWidth: 'none' }}>
      {monto ? <div className="sus-transfer-row"><span className="sus-transfer-lbl">Monto</span><span className="sus-transfer-val">{pesos(monto)}</span></div> : null}
      <div className="sus-transfer-row"><span className="sus-transfer-lbl">Alias</span><span className="sus-transfer-val">Luma.app</span></div>
      <div className="sus-transfer-row"><span className="sus-transfer-lbl">CBU</span><span className="sus-transfer-val">0170094740000040824239</span></div>
      <div className="sus-transfer-row"><span className="sus-transfer-lbl">Titular</span><span className="sus-transfer-val">Priscila Nair Soledad Pinillo</span></div>
      <div className="sus-transfer-row"><span className="sus-transfer-lbl">Banco</span><span className="sus-transfer-val">BBVA</span></div>
      <div className="sus-transfer-nota">
        Mandá el comprobante a <a href="mailto:lumaapp.soporte@gmail.com">lumaapp.soporte@gmail.com</a> desde el mail con el que te registraste en Luma. Después tocá «Ya transferí»: lo confirmamos en menos de 24 h y te avisamos por mail.
      </div>
    </div>
  )
  const avisoPendiente = pendiente && (
    <div className="sus-pend" role="status">
      <strong>Transferencia pendiente de confirmar.</strong> Nos avisaste el {fechaLarga(new Date(pendiente.avisado_at))} ({pesos(pendiente.monto)}). La revisamos en menos de 24 h y te avisamos por mail. Mientras tanto, Luma sigue funcionando como hasta ahora.
    </div>
  )

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
      
        .sus-ciclo{display:flex;gap:4px;max-width:360px;margin:0 auto 26px;background:rgba(255,255,255,0.08);border-radius:14px;padding:4px}
        .sus-ciclo button{flex:1;padding:10px;border:none;border-radius:11px;background:transparent;color:#B8A8DE;font-size:13px;font-weight:600;cursor:pointer;font-family:'Jost',sans-serif;display:flex;align-items:center;justify-content:center;gap:6px;transition:background .2s,color .2s}
        .sus-ciclo button.act{background:#8B5CF6;color:white}
        .sus-ciclo-badge{font-size:10px;background:#F0A3C8;color:#2A1A4A;border-radius:8px;padding:2px 6px;font-weight:700}
        .sus-equivale{font-size:11.5px;color:#9B8EC4;margin:-14px 0 18px}
        .sus-card.elegida{box-shadow:0 30px 70px rgba(139,92,246,0.35),0 0 0 3px #A78BFA}
        .sus-pago{max-width:560px;margin:28px auto 0;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.14);border-radius:22px;padding:22px;color:#EDE6FF;animation:susEntra .25s ease}
        @keyframes susEntra{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @media (prefers-reduced-motion: reduce){.sus-pago{animation:none}}
        .sus-pago-resumen{font-size:12.5px;color:#B8A8DE}
        .sus-pago-titulo{font-family:'Cormorant Garamond',serif;font-size:26px;color:white;margin:2px 0 14px}
        .sus-opt{display:flex;gap:12px;align-items:flex-start;width:100%;text-align:left;border:1px solid rgba(255,255,255,0.14);border-radius:16px;padding:14px;margin-bottom:10px;background:transparent;color:inherit;cursor:pointer;font-family:'Jost',sans-serif;transition:border-color .2s,background .2s}
        .sus-opt.sel{border:2px solid #A78BFA;background:rgba(139,92,246,0.16);padding:13px}
        .sus-opt:disabled{opacity:.55;cursor:not-allowed}
        .sus-opt-ico{color:#C4B5FD;flex-shrink:0;margin-top:1px}
        .sus-opt-tit{font-size:14px;font-weight:700;color:white;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
        .sus-opt-sub{font-size:12px;color:#B8A8DE;line-height:1.5;margin-top:3px}
        .sus-reco{font-size:9.5px;background:#34D399;color:#053;border-radius:8px;padding:2px 6px;font-weight:800;letter-spacing:.3px}
        .sus-monto{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin:6px 0 6px}
        .sus-monto b{font-size:26px;color:white}
        .sus-detalle{font-size:12.5px;color:#C9BEEB;line-height:1.55;margin-bottom:14px}
        .sus-ok{background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.35);border-radius:12px;padding:10px 12px;font-size:12.5px;line-height:1.5;color:#B7F5DA;margin:10px 0}
        .sus-pend{background:rgba(251,191,36,.12);border:1px solid rgba(251,191,36,.4);border-radius:14px;padding:12px 14px;font-size:12.5px;line-height:1.55;color:#FDE9B5;margin:10px 0}
        .sus-btn-sec{width:100%;padding:13px;background:transparent;color:#EDE6FF;border:1px solid rgba(255,255,255,0.25);border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Jost',sans-serif}
        .sus-upgrade{max-width:560px;margin:22px auto 0;border:1px dashed rgba(201,168,76,0.5);border-radius:18px;padding:16px 18px;color:#EDE6FF;font-size:13px;line-height:1.55}
`}</style>

      <div className="sus-wrap">
        <div className="sus-orb1"/><div className="sus-orb2"/>
          <MetaPixel/>
        <div className="sus-inner">
          <span className="sus-logo">Luma</span>
          <h1 className="sus-title">Elegí tu plan</h1>
          <p className="sus-sub">Cancelás cuando quieras · Mensual con tarjeta (se cobra solo), un mes por Mercado Pago, o el plan anual</p>

          {error && <div className="sus-error" role="alert">{error}</div>}

          {est && (est.tipo === 'pago' || est.tipo === 'prueba' || est.tipo === 'cancelado_vigente' || est.tipo === 'gracia') && (
            <div className="sus-estado" role="status">
              {est.tipo === 'prueba' && !est.automatico && <>Estás en tu prueba gratis hasta el <strong>{fechaLarga(est.venceEl)}</strong>. Si elegís un plan ahora, <strong>el primer cobro es ese día</strong>: no perdés los días que te quedan.</>}
              {est.tipo === 'prueba' && est.automatico && <>Ya activaste el cobro automático del plan <strong>{est.plan === 'premium' ? 'Premium' : 'Básico'}</strong>. El primer cobro es el <strong>{fechaLarga(est.venceEl)}</strong>, cuando termina tu prueba.</>}
              {est.tipo === 'pago' && est.automatico && <>Tenés el plan <strong>{est.plan === 'premium' ? 'Premium' : 'Básico'}</strong> con cobro automático. El próximo cobro es el <strong>{fechaLarga(est.venceEl)}</strong>.</>}
              {est.tipo === 'pago' && !est.automatico && <>Tenés tu plan pago hasta el <strong>{fechaLarga(est.venceEl)}</strong>. Lo que pagues ahora empieza ese día: <strong>nunca pagás dos veces el mismo mes</strong>.</>}
              {est.tipo === 'cancelado_vigente' && <>Cancelaste el cobro automático y tenés todo hasta el <strong>{fechaLarga(est.venceEl)}</strong>. Si volvés a pagar, <strong>empieza ese día</strong>.</>}
              {est.tipo === 'gracia' && <>Tu plan venció el <strong>{fechaLarga(est.venceEl)}</strong>{est.automatico ? ' y Mercado Pago no pudo cobrarlo' : ''}. Todo sigue funcionando hasta el <strong>{fechaLarga(est.graciaHasta)}</strong>. Si pagás ahora, el período nuevo empieza el {fechaLarga(est.venceEl)}: no pagás de más.</>}
            </div>
          )}

          {avisoPendiente}

          {/* PASAR A PREMIUM pagando solo la diferencia (tiene Básico pago, sin cobro automático) */}
          {upgrade && upgrade.monto && !planSel && (
            <div className="sus-upgrade" style={{ margin: '0 auto 24px' }}>
              <strong style={{ color: '#F4E3B0' }}>¿Querés Premium desde hoy?</strong> Pagás solo la diferencia: <strong>{pesos(upgrade.monto)}</strong>. {upgrade.detalle}
              {!upgradeMetodo ? (
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                  <button className="sus-btn" style={{ flex: 1, minWidth: '180px' }} onClick={() => setUpgradeMetodo('mercadopago')}>Pagar con Mercado Pago</button>
                  <button className="sus-btn-sec" style={{ flex: 1, minWidth: '180px' }} onClick={() => setUpgradeMetodo('transferencia')}>Por transferencia</button>
                </div>
              ) : upgradeMetodo === 'mercadopago' ? (
                <button className="sus-btn" style={{ marginTop: '12px' }} onClick={() => pagar('diferencia', 'premium', 'mercadopago')} disabled={enviando}>{enviando ? '⏳ Preparando…' : `Pagar ${pesos(upgrade.monto)} con Mercado Pago`}</button>
              ) : pendiente ? avisoPendiente : (<>
                {datosTransfer(upgrade.monto)}
                <button className="sus-btn" style={{ marginTop: '12px' }} onClick={() => pagar('diferencia', 'premium', 'transferencia')} disabled={enviando}>{enviando ? '⏳ Enviando aviso…' : 'Ya transferí'}</button>
              </>)}
            </div>
          )}

          <div className="sus-ciclo" role="tablist" aria-label="Mensual o anual">
            <button role="tab" aria-selected={ciclo === 'mensual'} className={ciclo === 'mensual' ? 'act' : ''} onClick={() => cambiarCiclo('mensual')}>Mensual</button>
            <button role="tab" aria-selected={ciclo === 'anual'} className={ciclo === 'anual' ? 'act' : ''} onClick={() => cambiarCiclo('anual')}>Anual <span className="sus-ciclo-badge">2 meses gratis</span></button>
          </div>

          <div className="sus-grid">
            {PLANES.map(p => (
              <div key={p.id} className={`sus-card${p.destacado ? ' destacado' : ''}${planSel === p.id ? ' elegida' : ''}`}>
                {p.destacado && <div className="sus-badge">Más elegido</div>}
                <div className="sus-plan-nombre">{p.nombre}</div>
                <div className="sus-precio-num">{pesos(precioPlan(p))}</div>
                <div className="sus-precio-per">ARS por {ciclo === 'anual' ? 'año' : 'mes'}</div>
                {ciclo === 'anual' && <div className="sus-equivale">Equivale a {pesos(ANUAL[p.id] / 12)} por mes · antes {pesos(p.precio * 12)}</div>}

                <div className="sus-features">
                  {p.features.map((f, i) => (
                    <div key={i} className="sus-feat">
                      <div className="sus-feat-check"><Check size={9} color="white"/></div>
                      {f}
                    </div>
                  ))}
                </div>

                <button className="sus-btn" onClick={() => elegirPlan(p.id as 'basico' | 'premium')} disabled={loading !== null || esPlanActual(p.id)}>
                  {loading === p.id ? '⏳ Redirigiendo...' : planSel === p.id ? '✓ Elegido' : textoBoton(p.id, p.nombre)}
                </button>
              </div>
            ))}
          </div>

          {ciclo === 'anual' && <p style={{ marginTop: '14px', lineHeight: 1.5, fontSize: '12px', color: '#B8A8DE', textAlign: 'center' }}>El anual se paga <strong style={{ color: '#EDE6FF' }}>una sola vez</strong> y no se renueva solo: te avisamos por mail antes de que venza.</p>}

          {planSel && (
            <div className="sus-pago" ref={panelRef}>
              <div className="sus-pago-resumen">{nombreSel} · {ciclo === 'anual' ? 'Anual' : 'Mensual'} · {ciclo === 'anual' ? `${pesos(ANUAL[planSel])} por año` : `${pesos(montoTarjeta)} por mes`}</div>
              <div className="sus-pago-titulo">¿Cómo querés pagar?</div>

              {ciclo === 'mensual' && (
                <button className={`sus-opt${metodo === 'tarjeta' ? ' sel' : ''}`} onClick={() => setMetodo('tarjeta')}>
                  <span className="sus-opt-ico"><IcoTarjeta/></span>
                  <span><span className="sus-opt-tit">Tarjeta · se cobra sola cada mes <span className="sus-reco">RECOMENDADO</span></span>
                    <span className="sus-opt-sub" style={{ display: 'block' }}>Crédito o débito. Te olvidás de pagar todos los meses. Cancelás cuando quieras.</span></span>
                </button>
              )}
              <button className={`sus-opt${metodo === 'mercadopago' ? ' sel' : ''}`} onClick={() => setMetodo('mercadopago')}>
                <span className="sus-opt-ico"><IcoMP/></span>
                <span><span className="sus-opt-tit">{ciclo === 'anual' ? 'Mercado Pago · pago único' : 'Mercado Pago · solo este mes'}</span>
                  <span className="sus-opt-sub" style={{ display: 'block' }}>{ciclo === 'anual' ? 'Acepta dinero en cuenta y tarjeta. Pagás una vez por los 12 meses.' : 'Acepta dinero en cuenta. No se repite: el mes que viene volvés a pagar.'}</span></span>
              </button>
              <button className={`sus-opt${metodo === 'transferencia' ? ' sel' : ''}`} onClick={() => setMetodo('transferencia')}>
                <span className="sus-opt-ico"><IcoBanco/></span>
                <span><span className="sus-opt-tit">Transferencia</span>
                  <span className="sus-opt-sub" style={{ display: 'block' }}>Transferís, nos avisás y lo confirmamos en menos de 24 h.</span></span>
              </button>

              {/* TARJETA */}
              {metodo === 'tarjeta' && (
                esPlanActual(planSel) ? <div className="sus-ok">Ya tenés este plan con cobro automático. No hace falta hacer nada.</div>
                : hayTarjetaEnLuma() ? (<>
                  {(est?.tipo === 'prueba' || est?.tipo === 'pago' || est?.tipo === 'cancelado_vigente') && est.venceEl && (
                    <div className="sus-ok">Hoy no se te cobra nada: el primer cobro es el <strong>{fechaLarga(est.venceEl)}</strong>, cuando termina lo que ya tenés. Nunca se cobra dos veces el mismo mes.</div>
                  )}
                  <TarjetaMP plan={planSel} monto={montoTarjeta}
                    onListo={() => { toast('¡Listo! Estamos confirmando con Mercado Pago.'); router.push('/suscripcion/confirmando') }}
                    onLink={() => irAMercadoPagoSuscripcion(planSel)}/>
                </>) : (<>
                  <div className="sus-detalle">Te llevamos a Mercado Pago para activar el cobro automático. Elegí <strong>tarjeta de crédito o débito</strong>: con dinero en cuenta el cobro mensual no funciona.</div>
                  <button className="sus-btn" onClick={() => irAMercadoPagoSuscripcion(planSel)} disabled={loading !== null}>{loading ? '⏳ Redirigiendo...' : 'Continuar a Mercado Pago'}</button>
                </>)
              )}

              {/* UN MES / ANUAL POR MERCADO PAGO o TRANSFERENCIA */}
              {(metodo === 'mercadopago' || metodo === 'transferencia') && (
                cotizando || !cotiz ? <div style={{ fontSize: '13px', color: '#B8A8DE', padding: '10px 0' }}>Calculando…</div>
                : cotiz.error ? <div className="sus-pend" role="alert">{cotiz.error}</div>
                : (<>
                  <div className="sus-monto"><span>Pagás</span><b>{pesos(cotiz.monto || 0)}</b></div>
                  {cotiz.detalle && <div className="sus-detalle">{cotiz.detalle}</div>}
                  {cotiz.cancelaAutomatico && <div className="sus-ok">Cuando se confirme el pago, cancelamos tu cobro mensual automático para que no se te cobre de más.</div>}
                  {metodo === 'mercadopago' ? (
                    <button className="sus-btn" onClick={() => pagar(concepto, planSel, 'mercadopago')} disabled={enviando}>{enviando ? '⏳ Preparando…' : `Pagar ${pesos(cotiz.monto || 0)} con Mercado Pago`}</button>
                  ) : pendiente ? avisoPendiente : (<>
                    {datosTransfer(cotiz.monto)}
                    <button className="sus-btn" style={{ marginTop: '14px' }} onClick={() => pagar(concepto, planSel, 'transferencia')} disabled={enviando}>{enviando ? '⏳ Enviando aviso…' : 'Ya transferí'}</button>
                  </>)}
                </>)
              )}
            </div>
          )}

          <div className="sus-seguro" style={{ marginTop: '22px' }}>🔒 Pagos seguros con Mercado Pago · Luma nunca ve ni guarda tu tarjeta</div>

          <hr className="sus-divider"/>
          <button className="sus-logout" onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </div>
    </>
  )
}
