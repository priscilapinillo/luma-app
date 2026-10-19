'use client'

// Tarjeta "Tu plan" de Ajustes: qué plan tiene, hasta cuándo, cómo paga, sus últimos pagos
// y el botón para cancelar el cobro automático (conserva todo hasta el último día pagado).
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { estadoPlan, type SubscriptionRow } from '@/lib/acceso'
import { fechaLarga, nombrePlan, etiquetaPlan } from '@/lib/textoPlan'

const PRECIO: Record<string, string> = { basico: '$9.900', premium: '$28.000' }

export default function MiPlan({ sub }: { sub: SubscriptionRow | null }) {
  const e = estadoPlan(sub)
  const et = etiquetaPlan(e)
  const [pagos, setPagos] = useState<{ fecha: string; monto: number; plan: string; metodo: string; estado: string }[]>([])
  const [confirmando, setConfirmando] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase.from('luma_pagos').select('fecha, monto, plan, metodo, estado').order('fecha', { ascending: false }).limit(6)
        if (data) setPagos(data as any)
      } catch {}
    })()
  }, [])

  async function cancelar() {
    if (cancelando) return
    setCancelando(true)
    setMensaje(null)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setMensaje({ ok: false, texto: 'Volvé a iniciar sesión.' }); return }
      const res = await fetch('/api/cuenta/cancelar-plan', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } })
      const r = await res.json().catch(() => ({}))
      if (r.ok) {
        setMensaje({ ok: true, texto: `Listo, cancelaste el cobro automático. No se te va a cobrar más${r.hasta ? ` y tenés todo hasta el ${fechaLarga(new Date(r.hasta))}` : ''}.` })
        setTimeout(() => window.location.reload(), 2500)
      } else {
        setMensaje({ ok: false, texto: r.error || 'No pudimos cancelar. Probá de nuevo en unos minutos.' })
      }
    } catch {
      setMensaje({ ok: false, texto: 'No pudimos conectarnos. Revisá tu internet y probá de nuevo.' })
    } finally {
      setCancelando(false)
      setConfirmando(false)
    }
  }

  const tienePlanPago = e.tipo === 'pago' || e.tipo === 'gracia' || e.tipo === 'cancelado_vigente'
  const diasPrueba = e.tipo === 'prueba' ? Math.max(0, e.dias ?? 0) : 0
  const filas: [string, string][] = []
  if (tienePlanPago) {
    filas.push(['Plan', `${nombrePlan(e)} · ${PRECIO[e.plan]} por mes`])
    if (e.tipo === 'pago') filas.push([e.automatico ? 'Próximo cobro' : 'Pagado hasta', fechaLarga(e.venceEl)])
    if (e.tipo === 'cancelado_vigente') filas.push(['Tenés todo hasta', fechaLarga(e.venceEl)])
    if (e.tipo === 'gracia') filas.push(['Funciona hasta', fechaLarga(e.graciaHasta)])
    filas.push(['Forma de pago', e.automatico ? 'Cobro automático con Mercado Pago' : e.tipo === 'cancelado_vigente' ? 'Cobro automático cancelado' : 'Pago manual (transferencia)'])
  }
  if (e.tipo === 'prueba' && e.automatico) filas.push(['Primer cobro', `${fechaLarga(e.venceEl)} · ${PRECIO[e.plan]} (${nombrePlan(e)})`])

  const textoBoton = e.tipo === 'prueba'
    ? (e.automatico ? null : '✦ Elegir mi plan (el primer cobro es cuando termina la prueba)')
    : e.tipo === 'pago'
      ? (e.automatico ? (e.plan === 'basico' ? '✦ Pasar a Premium' : null) : '✦ Activar cobro automático')
      : e.tipo === 'cancelado_vigente' ? '✦ Volver a activar el cobro automático'
      : e.tipo === 'gracia' ? (e.automatico ? '✦ Pagar con otra tarjeta' : '✦ Renovar mi plan')
      : e.tipo === 'vencido' ? '✦ Renovar mi plan'
      : '✦ Elegir mi plan — desde $9.900 ARS/mes'

  return (
    <div className="subs-card">
      <div className="subs-label">Tu plan</div>
      <div className="subs-plan">{e.tipo === 'prueba' ? 'Período de prueba' : et.titulo.replace(/^[✓⚠️✦\s]+/u, '')}</div>
      <div className="subs-info">
        {e.tipo === 'prueba' ? `${diasPrueba} día${diasPrueba === 1 ? '' : 's'} restante${diasPrueba === 1 ? '' : 's'} de prueba gratis` : et.detalle}
      </div>

      {e.tipo === 'prueba' && (<>
        <div className="subs-trial-bar"><div className="subs-trial-fill" style={{ width: `${Math.max(0, Math.min(100, (7 - diasPrueba) / 7 * 100))}%` }} /></div>
        <div className="subs-trial-text">{diasPrueba} de 7 días restantes</div>
      </>)}

      {filas.length > 0 && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filas.map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '12.5px', flexWrap: 'wrap' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>{k}</span>
              <span style={{ color: '#FFFFFF', fontWeight: 600, textAlign: 'right' }}>{v}</span>
            </div>
          ))}
        </div>
      )}

      {textoBoton && (
        <button onClick={() => window.location.href = '/suscripcion'}
          style={{ marginTop: '14px', width: '100%', padding: '11px', background: 'linear-gradient(135deg,#8B5CF6,#A78BFA)', color: 'white', border: 'none', borderRadius: '11px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(139,92,246,0.35)' }}>
          {textoBoton}
        </button>
      )}

      {e.automatico && e.nivel !== 'sin_acceso' && (
        <div style={{ marginTop: '12px' }}>
          {!confirmando ? (
            <button onClick={() => setConfirmando(true)}
              style={{ width: '100%', padding: '10px', background: 'transparent', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '11px', fontSize: '12.5px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancelar cobro automático
            </button>
          ) : (
            <div style={{ border: '1px solid rgba(255,255,255,0.25)', borderRadius: '12px', padding: '12px', fontSize: '12.5px', lineHeight: 1.55, color: 'rgba(255,255,255,0.85)' }}>
              {e.tipo === 'prueba'
                ? `No se te va a cobrar nada. Tu prueba sigue hasta el ${fechaLarga(e.venceEl)}.`
                : `No se te va a cobrar más. Tenés todo hasta el ${fechaLarga(e.venceEl)} y después se pausa tu página de reservas. Tus datos quedan guardados.`}
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button onClick={() => setConfirmando(false)} disabled={cancelando}
                  style={{ flex: 1, padding: '9px', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.35)', background: 'transparent', color: '#FFFFFF', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12.5px' }}>
                  Mejor no
                </button>
                <button onClick={cancelar} disabled={cancelando}
                  style={{ flex: 1, padding: '9px', borderRadius: '9px', border: 'none', background: '#B91C1C', color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12.5px', fontWeight: 600 }}>
                  {cancelando ? 'Cancelando…' : 'Sí, cancelar'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {mensaje && (
        <div role="status" style={{ marginTop: '10px', fontSize: '12.5px', lineHeight: 1.5, color: mensaje.ok ? '#6EE7B7' : '#FCA5A5' }}>{mensaje.texto}</div>
      )}

      {pagos.length > 0 && (
        <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tus últimos pagos</div>
          {pagos.map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', padding: '4px 0', color: p.estado === 'aprobado' ? '#FFFFFF' : 'rgba(255,255,255,0.5)' }}>
              <span>{fechaLarga(new Date(p.fecha))} · {p.plan === 'premium' ? 'Premium' : 'Básico'}</span>
              <span>${Number(p.monto).toLocaleString('es-AR')}{p.estado !== 'aprobado' ? ` (${p.estado})` : ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
