'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { emailEsAlumna } from '../verificar-rol'
import MetaPixel from '@/components/MetaPixel'
import { eventoMeta } from '@/lib/metaPixel'
import { leerOrigen } from '@/lib/origen'
import { calcularAcceso, pareceDesactualizado } from '@/lib/acceso'
import TelefonoLuma, { ESTILOS_TELEFONO } from '@/components/landing/TelefonoLuma'
import { ESTILOS_ACCESO } from '@/components/landing/estilosAcceso'

export default function AuthPage() {
  const [flipped, setFlipped] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [esCuentaLinks, setEsCuentaLinks] = useState(false)
  const [cuentaIncompleta, setCuentaIncompleta] = useState(false)
  const [completando, setCompletando] = useState(false)
  const [loading, setLoading] = useState(false)
  const [nombre, setNombre] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regError, setRegError] = useState('')
  const [regLoading, setRegLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [recuperando, setRecuperando] = useState(false)
  const [emailRecuperar, setEmailRecuperar] = useState('')
  const [enviandoRecuperar, setEnviandoRecuperar] = useState(false)
  const [recuperadoEnviado, setRecuperadoEnviado] = useState(false)
  const router = useRouter()

  // si viene de "Registrarse → Luma" (o del botón "Empezar gratis"), abre directo la tarjeta de crear cuenta
  useEffect(() => {
    try { if (new URLSearchParams(window.location.search).has('registro')) setFlipped(true) } catch {}
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setEsCuentaLinks(false)
    setCuentaIncompleta(false)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Email o contraseña incorrectos'); setLoading(false); return }

    const userId = data.user?.id

    // 1) terapeuta (con plan, aunque esté vencido) → su panel.
    //    Va primero: así, si alguna vez también tuvo Luma Links, igual puede entrar a pagar su plan.
    const { data: sub } = await supabase
      .from('subscriptions').select('user_id, status, plan, trial_ends_at, current_period_ends_at').eq('user_id', userId).maybeSingle()
    if (sub) {
      // plan o prueba vencidos (y no es un pago que Mercado Pago todavía no avisó) + tiene Luma Links → a su Luma Links
      if (calcularAcceso(sub) === 'sin_acceso' && !pareceDesactualizado(sub)) {
        const { data: links } = await supabase
          .from('luma_links_profiles').select('id').eq('auth_user_id', userId).maybeSingle()
        if (links) { router.push('/links/dashboard'); return }
      }
      router.push('/dashboard'); return
    }

    // 2) cuenta de Luma Links → se entra por Luma Links
    const { data: linksProfile } = await supabase
      .from('luma_links_profiles').select('id').eq('auth_user_id', userId).maybeSingle()
    if (linksProfile) {
      await supabase.auth.signOut({ scope: 'local' })
      setEsCuentaLinks(true)
      setLoading(false)
      return
    }

    // 3) alumna → sus cursos
    const { data: persona } = await supabase
      .from('persons').select('id').eq('auth_user_id', userId).maybeSingle()
    if (persona) { router.push('/mi-cuenta/cursos'); return }

    // 4) cuenta a medio crear (se registró pero no se le activó la prueba): le ofrecemos terminarla
    setCuentaIncompleta(true)
    setLoading(false)
  }

  // termina una cuenta que quedó a medio crear: le activa la prueba gratis de terapeuta (lo hace el servidor)
  async function completarCuenta() {
    setCompletando(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setCuentaIncompleta(false); setError('Volvé a iniciar sesión.'); setCompletando(false); return }
      const res = await fetch('/api/cuenta/empezar-prueba', {
        method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const r = await res.json().catch(() => ({ ok: false }))
      if (r.ok) { router.push('/dashboard'); return }
      setError(r.error || 'No pudimos activar tu prueba. Probá de nuevo en unos minutos.')
    } catch {
      setError('No pudimos conectarnos. Revisá tu internet y probá de nuevo.')
    }
    setCompletando(false)
  }
  async function handleRecuperar(e?: React.FormEvent) {
    e?.preventDefault()
    setEnviandoRecuperar(true)
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(emailRecuperar, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setRecuperadoEnviado(true)
    setEnviandoRecuperar(false)
  }

  const registrandoRef = useRef(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (registrandoRef.current) return
    registrandoRef.current = true
    setRegLoading(true)
    setRegError('')
    if (await emailEsAlumna(regEmail).catch(() => false)) {
      setRegError('Este email ya está registrado como alumna en Luma. Para tener también una cuenta de terapeuta, usá un email distinto.')
      setRegLoading(false); registrandoRef.current = false; return
    }
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email: regEmail, password: regPassword,
      options: { data: { full_name: nombre, ...(leerOrigen() ? { origen: leerOrigen() } : {}) } }
    })
    if (error) { setRegError('No se pudo crear la cuenta. Intentá con otro email.'); setRegLoading(false); registrandoRef.current = false; return }
    eventoMeta('CompleteRegistration', { content_name: 'Luma' })
    if (data.user) {
      // la prueba gratis la activa el servidor; si eso falla, se intenta desde acá como respaldo
      let listo = false
      if (data.session) {
        try {
          const res = await fetch('/api/cuenta/empezar-prueba', {
            method: 'POST', headers: { Authorization: `Bearer ${data.session.access_token}` },
          })
          const r = await res.json().catch(() => ({ ok: false }))
          listo = !!r.ok
        } catch {}
      }
      if (!listo) {
        const trialEnds = new Date()
        trialEnds.setDate(trialEnds.getDate() + 7)
        const { error: errorSub } = await supabase.from('subscriptions').insert({
          user_id: data.user.id,
          status: 'trial',
          trial_ends_at: trialEnds.toISOString(),
        })
        listo = !errorSub || errorSub.code === '23505'
      }
      if (!listo) {
        // nunca más la mandamos al panel con la cuenta a medio crear
        setRegError('Tu cuenta se creó, pero no pudimos activar tu prueba gratis. Iniciá sesión con tu email y contraseña y la activamos desde ahí.')
        setRegLoading(false); registrandoRef.current = false; return
      }
    }
    router.push('/dashboard')
    setRegLoading(false)
    registrandoRef.current = false
  }

  // abrir "recuperar" con el email que ya escribió
  function abrirRecuperar() {
    setEmailRecuperar(email)
    setRecuperadoEnviado(false)
    setRecuperando(true)
    setError('')
  }
  function cerrarRecuperar() {
    setRecuperando(false)
    setRecuperadoEnviado(false)
    setEmailRecuperar('')
  }
  const fuerza = regPassword.length === 0 ? 0 : regPassword.length < 6 ? 1 : (regPassword.length >= 10 || (/\d/.test(regPassword) && /[a-zA-Z]/.test(regPassword))) ? 3 : 2
  const textoFuerza = ['', 'Muy corta (mínimo 6)', 'Va bien', 'Fuerte'][fuerza]

  return (
    <div className="au">
      <MetaPixel/>
      <style>{ESTILOS_TELEFONO + ESTILOS_ACCESO}</style>

      <aside className="au-lado" aria-hidden="true">
        <span className="au-estrella au-titila" style={{ top: 120, right: 80, fontSize: 16 }}>✦</span>
        <span className="au-estrella au-titila" style={{ bottom: 160, left: 50, fontSize: 12, color: '#D6A6A5', animationDelay: '.8s' }}>✦</span>
        <Link href="/" className="au-logo" tabIndex={-1}>Luma<span>.</span></Link>
        <h2 className="au-frase">Tu consultante ideal está buscando <em>dónde reservar</em> ahora mismo.</h2>
        <p className="au-frase2"><span className="au-subraya">¿Tiene dónde hacerlo?</span></p>
        <div className="au-vis">
          <div className="au-tel au-flotar"><div><TelefonoLuma pantalla="reserva" escala={0.8} /></div></div>
          <div className="au-notif au-caer">
            <span className="au-notif-ic">L</span>
            <span className="au-notif-txt"><span>LUMA · ahora</span><strong>Nueva reserva</strong><span>Sofía · jueves 18:00</span></span>
          </div>
        </div>
        <span className="au-lado-pie">Sin tarjeta · 7 días gratis · Cancelás cuando quieras</span>
      </aside>

      <main className="au-main">
        <div className="au-caja">
          <Link href="/" className="au-logo-celu">Luma<span>.</span></Link>

          {!recuperando && (
            <div className="au-tabs" role="tablist" aria-label="Entrar o registrarse">
              <button type="button" role="tab" aria-selected={!flipped} className={!flipped ? 'on' : ''} onClick={() => { setFlipped(false); setRegError('') }}>Entrar</button>
              <button type="button" role="tab" aria-selected={flipped} className={flipped ? 'on' : ''} onClick={() => { setFlipped(true); setError('') }}>Empezá gratis</button>
            </div>
          )}

          {recuperando ? (
            recuperadoEnviado ? (
              <div className="au-tarjeta au-entra" role="status">
                <span className="au-ic-grande au-pop"><svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 7l8 6 8-6"/></svg></span>
                <h1 className="au-h1">Revisá tu email</h1>
                <p className="au-sub">Te mandamos un link{emailRecuperar ? <> a <b>{emailRecuperar}</b></> : ''} para elegir una contraseña nueva. Si no aparece, mirá en spam o promociones.</p>
                <button type="button" className="au-btn-claro" onClick={() => setRecuperadoEnviado(false)}>Mandarlo de nuevo</button>
                <button type="button" className="au-link" onClick={cerrarRecuperar}>Volver a entrar</button>
              </div>
            ) : (
              <form className="au-form au-entra" onSubmit={handleRecuperar}>
                <button type="button" className="au-volver" onClick={cerrarRecuperar}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>Volver a entrar</button>
                <div><h1 className="au-h1">Recuperar contraseña</h1><p className="au-sub">Escribí el email con el que entrás a Luma y te mandamos un link para elegir una nueva.</p></div>
                <label className="au-campo">Email
                  <span className="au-in"><IcMail/><input type="email" required autoComplete="email" value={emailRecuperar} onChange={e => setEmailRecuperar(e.target.value)} placeholder="tu@email.com"/></span>
                </label>
                <button type="submit" className="au-btn" disabled={enviandoRecuperar}>{enviandoRecuperar ? <><i className="au-girar"/>Enviando…</> : 'Mandarme el link'}</button>
              </form>
            )
          ) : !flipped ? (
            <form className="au-form au-entra" onSubmit={handleLogin}>
              <div><h1 className="au-h1">Iniciá sesión</h1><p className="au-sub">Bienvenida de vuelta. Tu trabajo te espera.</p></div>
              <label className="au-campo">Email
                <span className="au-in"><IcMail/><input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com"/></span>
              </label>
              <label className="au-campo">Contraseña
                <span className="au-in"><IcCandado/><input type={showPassword ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••"/>
                  <button type="button" className="au-ojo" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <IcOjoNo/> : <IcOjo/>}</button>
                </span>
              </label>
              <button type="button" className="au-link derecha" onClick={abrirRecuperar}>¿Olvidaste tu contraseña?</button>
              {error && <div className="au-error" role="alert">{error}</div>}
              {esCuentaLinks && (
                <div className="au-aviso citrino" role="status">
                  Esta es una cuenta de <strong>Luma Links</strong>, no de terapeuta. Entrá desde <Link href="/links/login">acá</Link>.
                </div>
              )}
              {cuentaIncompleta && (
                <div className="au-aviso lavanda" role="status">
                  <span>Tu cuenta quedó <strong>a medio crear</strong> (fue un error nuestro, perdón). ¿Qué querés hacer?</span>
                  <button type="button" className="au-btn" onClick={completarCuenta} disabled={completando}>{completando ? <><i className="au-girar"/>Activando…</> : 'Soy terapeuta: empezar mis 7 días gratis'}</button>
                  <Link href="/mi-cuenta/cursos" className="au-link">Soy alumna: ir a mis cursos</Link>
                </div>
              )}
              <button type="submit" className="au-btn" disabled={loading}>{loading ? <><i className="au-girar"/>Entrando…</> : 'Entrar'}</button>
              <div className="au-otros">
                <span>¿Tenés Luma Links? <Link href="/links/login">Entrá acá</Link></span>
                <span>¿Sos alumna de un curso? <Link href="/aula">Entrá a tu aula</Link></span>
              </div>
            </form>
          ) : (
            <form className="au-form au-entra" onSubmit={handleRegister}>
              <div><h1 className="au-h1">Empezá gratis</h1><p className="au-sub"><b>7 días gratis</b> · Después ARS $9.900/mes · Cancelás cuando quieras</p></div>
              <label className="au-campo">Tu nombre
                <span className="au-in"><input type="text" required autoComplete="name" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Priscila"/></span>
              </label>
              <label className="au-campo">Email
                <span className="au-in"><input type="email" required autoComplete="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="tu@email.com"/></span>
              </label>
              <label className="au-campo">Contraseña
                <span className="au-in"><input type="password" required minLength={6} autoComplete="new-password" value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Mínimo 6 caracteres"/></span>
              </label>
              {fuerza > 0 && (
                <div className="au-fuerza" aria-live="polite">
                  {[1, 2, 3].map(n => <span key={n} className={fuerza >= n ? `f${fuerza}` : ''}/>)}
                  <b className={`f${fuerza}`}>{textoFuerza}</b>
                </div>
              )}
              {regError && <div className="au-error" role="alert">{regError}</div>}
              <button type="submit" className="au-btn" disabled={regLoading}>{regLoading ? <><i className="au-girar"/>Creando tu cuenta…</> : 'Crear mi cuenta'}</button>
              <div className="au-pastillas">
                <span className="verde">Sin tarjeta</span>
                <span className="lavanda">Probás todo Premium 7 días</span>
                <span className="citrino">Cancelás cuando quieras</span>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}

function IcMail() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 7l8 6 8-6"/></svg> }
function IcCandado() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg> }
function IcOjo() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg> }
function IcOjoNo() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg> }
