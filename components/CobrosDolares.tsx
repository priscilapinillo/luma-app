'use client'

// Ajustes → Cobros → "Cómo cobrar en dólares". Se guarda aparte del resto del perfil:
// si algo falla acá, el resto de Ajustes sigue igual (y al revés).
// Luma nunca toca la plata: solo muestra estos datos en tu página para que te paguen y te avisen.
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from '@/components/ToastProvider'

type Datos = { usd_link: string; usd_cuenta: string; usd_usdt: string; usd_usdt_red: string }
const VACIO: Datos = { usd_link: '', usd_cuenta: '', usd_usdt: '', usd_usdt_red: '' }

export function linkValido(url: string) {
  const u = url.trim()
  if (!u) return true
  try { const x = new URL(/^https?:\/\//i.test(u) ? u : 'https://' + u); return x.hostname.includes('.') } catch { return false }
}

export default function CobrosDolares() {
  const [ok, setOk] = useState<'cargando' | 'si' | 'no'>('cargando')
  const [d, setD] = useState<Datos>(VACIO)
  const [guardado, setGuardado] = useState<Datos>(VACIO)
  const [usa, setUsa] = useState({ link: false, cuenta: false, usdt: false })
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data, error } = await supabase.from('therapist_profiles').select('usd_link, usd_cuenta, usd_usdt, usd_usdt_red').eq('user_id', user.id).maybeSingle()
        if (error) { setOk('no'); return } // la base todavía no tiene estas columnas: el bloque no aparece
        const v: Datos = { usd_link: data?.usd_link || '', usd_cuenta: data?.usd_cuenta || '', usd_usdt: data?.usd_usdt || '', usd_usdt_red: data?.usd_usdt_red || '' }
        setD(v); setGuardado(v); setUsa({ link: !!v.usd_link, cuenta: !!v.usd_cuenta, usdt: !!v.usd_usdt })
        setOk('si')
      } catch { setOk('no') }
    })()
  }, [])

  if (ok !== 'si') return null

  const final: Datos = {
    usd_link: usa.link ? d.usd_link.trim() : '',
    usd_cuenta: usa.cuenta ? d.usd_cuenta.trim() : '',
    usd_usdt: usa.usdt ? d.usd_usdt.trim() : '',
    usd_usdt_red: usa.usdt ? d.usd_usdt_red.trim() : '',
  }
  const cambio = JSON.stringify(final) !== JSON.stringify(guardado)
  const problemas: string[] = []
  if (usa.link && !final.usd_link) problemas.push('Pegá tu link de pago o destildá «Link de pago».')
  if (usa.link && final.usd_link && !linkValido(final.usd_link)) problemas.push('El link de pago no parece una dirección web. Revisalo.')
  if (usa.cuenta && !final.usd_cuenta) problemas.push('Escribí los datos de tu cuenta o destildá «Datos de cuenta».')
  if (usa.usdt && !final.usd_usdt) problemas.push('Pegá la dirección de tu billetera o destildá «USDT».')
  if (usa.usdt && final.usd_usdt && !final.usd_usdt_red) problemas.push('Elegí la red de tu billetera USDT (si te equivocás, la plata se pierde).')

  async function guardar() {
    if (guardando) return
    if (problemas.length) { toast(problemas[0], 'error'); return }
    setGuardando(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast('Tu sesión expiró. Volvé a iniciar sesión.', 'error'); return }
      const datos = { usd_link: final.usd_link || null, usd_cuenta: final.usd_cuenta || null, usd_usdt: final.usd_usdt || null, usd_usdt_red: final.usd_usdt_red || null }
      const { error } = await supabase.from('therapist_profiles').update(datos).eq('user_id', user.id)
      if (error) { console.error(error); toast('No se pudo guardar. Revisá tu conexión e intentá de nuevo.', 'error'); return }
      setGuardado(final)
      toast(final.usd_link || final.usd_cuenta || final.usd_usdt ? 'Listo: tu página ya ofrece pagar en dólares.' : 'Listo: tu página ya no ofrece pagar en dólares.')
    } finally { setGuardando(false) }
  }

  const caja = (activo: boolean): React.CSSProperties => ({ border: `${activo ? 2 : 1}px solid ${activo ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '14px', padding: activo ? '13px' : '14px', marginBottom: '10px', background: 'var(--bg-card)' })
  const tilde = (v: boolean, set: (b: boolean) => void, txt: string) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary)', cursor: 'pointer' }}>
      <input type="checkbox" checked={v} onChange={e => set(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}/> {txt}
    </label>
  )

  return (
    <div style={{ marginTop: '22px', paddingTop: '18px', borderTop: '0.5px solid var(--border-light)' }}>
      <div className="pref-label" style={{ fontSize: '14px' }}>Cómo cobrar en dólares <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>(opcional)</span></div>
      <div className="pref-sub" style={{ margin: '4px 0 12px', lineHeight: 1.5 }}>
        Elegí una o más formas. Tu consultante o alumna paga ahí, toca «Ya pagué» y vos confirmás cuando te llega. El precio en dólares lo ponés en cada servicio o curso.
      </div>

      <div style={caja(usa.link)}>
        {tilde(usa.link, b => setUsa({ ...usa, link: b }), 'Link de pago')}
        <div className="pref-sub" style={{ margin: '4px 0 0 28px' }}>PayPal, Wise, Payoneer o el que uses.</div>
        {usa.link && <div className="field" style={{ margin: '10px 0 0' }}><input placeholder="Ej: paypal.me/tunombre" value={d.usd_link} onChange={e => setD({ ...d, usd_link: e.target.value })}/></div>}
      </div>
      <div style={caja(usa.cuenta)}>
        {tilde(usa.cuenta, b => setUsa({ ...usa, cuenta: b }), 'Datos de cuenta')}
        <div className="pref-sub" style={{ margin: '4px 0 0 28px' }}>Tu cuenta en dólares: banco, número, titular…</div>
        {usa.cuenta && <div className="field" style={{ margin: '10px 0 0' }}><textarea placeholder={'Ej: Banco X · Cuenta 123456 · Titular Flor Pérez'} value={d.usd_cuenta} onChange={e => setD({ ...d, usd_cuenta: e.target.value })} style={{ minHeight: '70px', resize: 'none' }}/></div>}
      </div>
      <div style={caja(usa.usdt)}>
        {tilde(usa.usdt, b => setUsa({ ...usa, usdt: b }), 'USDT')}
        <div className="pref-sub" style={{ margin: '4px 0 0 28px' }}>La dirección de tu billetera y su red.</div>
        {usa.usdt && (<>
          <div className="field" style={{ margin: '10px 0 0' }}><input placeholder="Dirección de tu billetera" value={d.usd_usdt} onChange={e => setD({ ...d, usd_usdt: e.target.value })}/></div>
          <div className="field" style={{ margin: '8px 0 0' }}>
            <select value={d.usd_usdt_red} onChange={e => setD({ ...d, usd_usdt_red: e.target.value })}>
              <option value="">Elegí la red…</option>
              <option value="TRC20">TRC20 (Tron)</option>
              <option value="ERC20">ERC20 (Ethereum)</option>
              <option value="BEP20">BEP20 (BNB Chain)</option>
              <option value="Polygon">Polygon</option>
              <option value="Solana">Solana</option>
            </select>
          </div>
        </>)}
      </div>

      {problemas.length > 0 && cambio && <div style={{ fontSize: '12px', color: '#B45309', margin: '4px 0 10px' }}>{problemas[0]}</div>}
      <button className="pr-btn" onClick={guardar} disabled={guardando || !cambio}
        style={{ opacity: !cambio ? 0.6 : 1 }}>
        {guardando ? 'Guardando…' : cambio ? 'Guardar cobros en dólares' : 'Guardado'}
      </button>
    </div>
  )
}
