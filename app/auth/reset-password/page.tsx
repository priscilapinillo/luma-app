'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import TelefonoLuma, { ESTILOS_TELEFONO } from '@/components/landing/TelefonoLuma'
import { ESTILOS_ACCESO } from '@/components/landing/estilosAcceso'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // error del formulario (no coinciden, muy corta…): no esconde el formulario, a diferencia del link vencido
  const [errorForm, setErrorForm] = useState('')
  const [ver, setVer] = useState(false)
  const [listo, setListo] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // Intentar con query params (token_hash)
    const params = new URLSearchParams(window.location.search)
    const tokenHash = params.get('token_hash')
    const type = params.get('type')

    if (tokenHash && type === 'recovery') {
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
        .then(({ error }) => {
          if (!error) setSessionReady(true)
          else setError('El link expiró o no es válido. Pedí uno nuevo.')
        })
      return
    }

    // Intentar con hash en URL (#access_token=...)
    const hash = window.location.hash
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const hashType = hashParams.get('type')
      if (accessToken && refreshToken && hashType === 'recovery') {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ error }) => {
            if (!error) setSessionReady(true)
            else setError('El link expiró o no es válido. Pedí uno nuevo.')
          })
        return
      }
    }

    // Escuchar evento PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setSessionReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { setErrorForm('Tiene que tener al menos 6 caracteres.'); return }
    if (password !== confirm) { setErrorForm('Las contraseñas no coinciden.'); return }
    setLoading(true)
    setErrorForm('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setErrorForm('No se pudo actualizar la contraseña. Intentá de nuevo.')
      setLoading(false)
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    let destino = '/auth/login'
    if (user) {
      const [{ data: links }, { data: sub }, { data: persona }] = await Promise.all([
        supabase.from('luma_links_profiles').select('id').eq('auth_user_id', user.id).maybeSingle(),
        supabase.from('subscriptions').select('user_id').eq('user_id', user.id).maybeSingle(),
        supabase.from('persons').select('id').eq('auth_user_id', user.id).maybeSingle(),
      ])
      if (links) destino = '/links/dashboard'
      else if (sub) destino = '/dashboard'
      else if (persona) destino = '/mi-cuenta/cursos'
    }
    setListo(true)
    setTimeout(() => router.push(destino), 2000)
  }

  const coinciden = confirm.length > 0 && confirm === password

  return (
    <div className="au">
      <style>{ESTILOS_TELEFONO + ESTILOS_ACCESO}</style>
      <aside className="au-lado" aria-hidden="true">
        <span className="au-estrella au-titila" style={{ top: 120, right: 80, fontSize: 16 }}>✦</span>
        <Link href="/" className="au-logo" tabIndex={-1}>Luma<span>.</span></Link>
        <h2 className="au-frase">Tu espacio te está <em>esperando</em>.</h2>
        <p className="au-frase2"><span className="au-subraya">Todo sigue donde lo dejaste.</span></p>
        <div className="au-vis"><div className="au-tel au-flotar"><div><TelefonoLuma pantalla="inicio" escala={0.8} /></div></div></div>
        <span className="au-lado-pie">Tus consultantes, tu agenda y tus cobros, a salvo.</span>
      </aside>
      <main className="au-main">
        <div className="au-caja">
          <Link href="/" className="au-logo-celu">Luma<span>.</span></Link>
          {listo ? (
            <div className="au-tarjeta au-entra" role="status">
              <span className="au-ic-grande ok au-pop"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>
              <h1 className="au-h1">¡Contraseña actualizada!</h1>
              <p className="au-sub" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><i className="au-girar" style={{ borderColor: '#E6DCCE', borderTopColor: '#27344A' }}/>Te estamos llevando a tu cuenta…</p>
            </div>
          ) : error ? (
            <div className="au-tarjeta au-entra" role="alert">
              <span className="au-ic-grande"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span>
              <h1 className="au-h1">Este link ya no sirve</h1>
              <p className="au-sub">{error} Los links duran un rato por seguridad.</p>
              <button type="button" className="au-btn" style={{ width: '100%' }} onClick={() => router.push('/auth/login')}>Pedir uno nuevo</button>
            </div>
          ) : !sessionReady ? (
            <div className="au-tarjeta au-entra" role="status">
              <span className="au-ic-grande"><i className="au-girar" style={{ width: 28, height: 28, borderWidth: 3, borderColor: 'rgba(39,52,74,.2)', borderTopColor: '#27344A' }}/></span>
              <h1 className="au-h1" style={{ fontSize: 40 }}>Un segundito…</h1>
              <p className="au-sub">Estamos verificando tu link.</p>
            </div>
          ) : (
            <form className="au-form au-entra" onSubmit={handleReset}>
              <div><h1 className="au-h1">Nueva contraseña</h1><p className="au-sub">Elegí una nueva para entrar a Luma.</p></div>
              <label className="au-campo">Nueva contraseña
                <span className="au-in"><input type={ver ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={e => { setPassword(e.target.value); setErrorForm('') }} required minLength={6} placeholder="Mínimo 6 caracteres"/>
                  <button type="button" className="au-ojo" aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setVer(!ver)}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></button>
                </span>
              </label>
              <label className="au-campo">Repetila
                <span className={`au-in${coinciden ? ' ok' : ''}`}><input type={ver ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={e => { setConfirm(e.target.value); setErrorForm('') }} required minLength={6}/>
                  {coinciden && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3E7D57" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 10 }} aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>}
                </span>
              </label>
              {coinciden && <span style={{ fontSize: 12.5, fontWeight: 700, color: '#3E7D57', marginTop: -6 }}>Coinciden</span>}
              {errorForm && <div className="au-error" role="alert">{errorForm}</div>}
              <button type="submit" className="au-btn" disabled={loading}>{loading ? <><i className="au-girar"/>Guardando…</> : 'Guardar contraseña'}</button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
