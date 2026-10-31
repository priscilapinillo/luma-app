'use client'

// Formulario de tarjeta de Mercado Pago dentro de Luma (para el cobro automático mensual).
// Mercado Pago dibuja los campos y convierte la tarjeta en un "token": Luma nunca ve ni guarda el número.
// Si el formulario no carga (sin internet, bloqueador, falta la clave pública), avisa y deja el link de Mercado Pago.
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'

declare global { interface Window { MercadoPago?: any } }

const SDK = 'https://sdk.mercadopago.com/js/v2'
let cargaSDK: Promise<void> | null = null
function cargarSDK(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('sin navegador'))
  if (window.MercadoPago) return Promise.resolve()
  if (!cargaSDK) {
    cargaSDK = new Promise((ok, mal) => {
      const s = document.createElement('script')
      s.src = SDK; s.async = true
      s.onload = () => ok(); s.onerror = () => { cargaSDK = null; mal(new Error('no cargó')) }
      document.head.appendChild(s)
    })
  }
  return cargaSDK
}

export const hayTarjetaEnLuma = () => !!process.env.NEXT_PUBLIC_MP_PUBLIC_KEY

export default function TarjetaMP({ plan, monto, onListo, onLink }: {
  plan: 'basico' | 'premium'; monto: number
  onListo: () => void        // la suscripción quedó creada
  onLink: () => void         // pagar desde la página de Mercado Pago (alternativa)
}) {
  const caja = useRef<HTMLDivElement | null>(null)
  const controlador = useRef<any>(null)
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'sin_formulario'>('cargando')
  const [error, setError] = useState('')
  const enviando = useRef(false)
  const idCaja = `tarjeta-mp-${plan}`

  useEffect(() => {
    let vivo = true
    const clave = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY
    if (!clave) { setEstado('sin_formulario'); return }
    cargarSDK().then(async () => {
      if (!vivo || !caja.current || !window.MercadoPago) return
      const mp = new window.MercadoPago(clave, { locale: 'es-AR' })
      const bricks = mp.bricks()
      controlador.current = await bricks.create('cardPayment', idCaja, {
        initialization: { amount: monto },
        customization: { visual: { style: { theme: 'default' }, texts: { formSubmit: 'Activar mi plan' } }, paymentMethods: { maxInstallments: 1 } },
        callbacks: {
          onReady: () => { if (vivo) setEstado('listo') },
          onError: (e: any) => { console.error('Formulario de tarjeta:', e); if (vivo) setEstado(x => x === 'cargando' ? 'sin_formulario' : x) },
          onSubmit: (datos: any) => new Promise<void>(async (ok, mal) => {
            if (enviando.current) { mal(); return }
            enviando.current = true
            setError('')
            try {
              const { data: { session } } = await createClient().auth.getSession()
              const res = await fetch('/api/plan/tarjeta', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) },
                body: JSON.stringify({ plan, token: datos?.token, email: datos?.payer?.email }),
              })
              const r = await res.json().catch(() => ({ ok: false }))
              if (r.ok) { ok(); onListo() }
              else { setError(r.error || 'No se pudo activar con esa tarjeta.'); mal() }
            } catch {
              setError('No pudimos conectarnos. Revisá tu internet y probá de nuevo.'); mal()
            } finally { enviando.current = false }
          }),
        },
      })
    }).catch(() => { if (vivo) setEstado('sin_formulario') })
    // si en 12 segundos no apareció, se ofrece la alternativa
    const corte = setTimeout(() => { if (vivo) setEstado(e => e === 'cargando' ? 'sin_formulario' : e) }, 12000)
    return () => { vivo = false; clearTimeout(corte); try { controlador.current?.unmount?.() } catch {} }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, monto])

  return (
    <div>
      {estado === 'cargando' && <div style={{ fontSize: '13px', color: '#B8A8DE', textAlign: 'center', padding: '18px 0' }}>Cargando el formulario seguro de Mercado Pago…</div>}
      <div id={idCaja} ref={caja} style={{ display: estado === 'sin_formulario' ? 'none' : 'block' }} />
      {error && <div className="sus-error" style={{ marginTop: '12px' }}>{error}</div>}
      {estado === 'sin_formulario' && (
        <div style={{ fontSize: '13px', color: '#EDE6FF', lineHeight: 1.6, textAlign: 'center', padding: '6px 0' }}>
          El formulario de tarjeta no cargó en este dispositivo. Podés activar el cobro automático desde la página de Mercado Pago (elegí <strong>tarjeta</strong>, no dinero en cuenta).
        </div>
      )}
      <button type="button" onClick={onLink}
        style={{ display: 'block', margin: '14px auto 0', fontSize: '12px', color: '#C4B5FD', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}>
        {estado === 'sin_formulario' ? 'Ir a Mercado Pago' : '¿Preferís hacerlo en la página de Mercado Pago?'}
      </button>
    </div>
  )
}
