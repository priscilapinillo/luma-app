'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ESTILOS_ACCESO } from '@/components/landing/estilosAcceso'

// Entrada de las ALUMNAS (lumaapp.lat/aula).
// - Solo inicia sesión: las cuentas de alumna se crean al comprar un curso desde el link de la profesora.
// - Si la cuenta es de terapeuta o de Luma Links, le explica por dónde entrar (no la deja en un lugar equivocado).
type Aviso = null | 'terapeuta' | 'links' | 'sin_cursos'

export default function AulaEntrarPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [revisando, setRevisando] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState<Aviso>(null)
  const [recuperando, setRecuperando] = useState(false)
  const [mailEnviado, setMailEnviado] = useState(false)

  // si ya tiene la sesión iniciada como alumna, va directo a sus cursos
  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: persona } = await supabase.from('persons').select('id').eq('auth_user_id', user.id).maybeSingle()
          if (persona) { router.replace('/mi-cuenta/cursos'); return }
        }
      } catch {}
      setRevisando(false)
    })()
  }, [])

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    if (cargando) return
    setCargando(true)
    setError('')
    setAviso(null)
    try {
      const supabase = createClient()
      const { data, error: errLogin } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (errLogin || !data.user) { setError('El email o la contraseña no coinciden. Revisalos y probá de nuevo.'); return }
      const uid = data.user.id

      // 1) alumna → a sus cursos
      const { data: persona } = await supabase.from('persons').select('id').eq('auth_user_id', uid).maybeSingle()
      if (persona) { router.push('/mi-cuenta/cursos'); return }

      // 2) no es alumna: se cierra la sesión y se le explica por dónde entrar
      const [{ data: sub }, { data: links }] = await Promise.all([
        supabase.from('subscriptions').select('user_id').eq('user_id', uid).maybeSingle(),
        supabase.from('luma_links_profiles').select('id').eq('auth_user_id', uid).maybeSingle(),
      ])
      await supabase.auth.signOut({ scope: 'local' })
      setAviso(sub ? 'terapeuta' : links ? 'links' : 'sin_cursos')
    } catch {
      setError('No pudimos conectarnos. Revisá tu internet y probá de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  async function recuperar() {
    if (!email.trim()) { setError('Escribí tu email arriba y volvé a tocar "Olvidé mi contraseña".'); return }
    setRecuperando(true)
    setError('')
    try {
      const supabase = createClient()
      const { error: errReset } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (errReset) setError('No pudimos enviar el mail. Probá de nuevo en unos minutos.')
      else setMailEnviado(true)
    } finally {
      setRecuperando(false)
    }
  }

  if (revisando) return (
    <div className="au" style={{ alignItems: 'center', justifyContent: 'center', gap: 10, color: '#6E7388', fontWeight: 600, fontSize: 14 }}>
      <style>{ESTILOS_ACCESO}</style>
      <i className="au-girar" style={{ borderColor: '#E6DCCE', borderTopColor: '#27344A' }} aria-hidden="true" />Cargando…
    </div>
  )

  return (
    <div className="au aula">
      <style>{ESTILOS_ACCESO}</style>
      <aside className="au-lado" aria-hidden="true">
        <span className="au-estrella au-titila" style={{ top: 110, right: 90, fontSize: 16, color: '#A65A6E' }}>✦</span>
        <span className="au-estrella au-titila" style={{ bottom: 190, left: 54, fontSize: 12, color: '#626B91', animationDelay: '.8s' }}>✦</span>
        <Link href="/" className="au-logo" tabIndex={-1}>Luma<span>.</span><small>AULA</small></Link>
        <h2 className="au-frase">Lo que empezaste sigue <em>acá</em>, esperándote.</h2>
        <p className="au-frase2"><span className="au-subraya">Una clase a la vez.</span></p>
        <div className="au-vis">
          <div className="au-curso au-flotar">
            <div className="au-curso-portada">Tu curso</div>
            <div className="au-curso-cuerpo">
              <div className="au-curso-fila"><b style={{ color: '#27344A' }}>Vas por la clase 8</b><span>72%</span></div>
              <div className="au-curso-barra"><span /></div>
              <div className="au-curso-clase"><i><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg></i>Seguir donde lo dejaste</div>
            </div>
          </div>
          <div className="au-certif au-caer"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9" r="6" /><path d="M8.5 14L7 22l5-3 5 3-1.5-8" /></svg>Tu certificado, al terminar</div>
        </div>
        <span className="au-lado-pie">Tus clases, tus materiales y tu certificado, en un solo lugar</span>
      </aside>
      <main className="au-main">
        <div className="au-caja">
          <Link href="/" className="au-logo-celu">Luma<span>.</span></Link>
          <form className="au-form au-entra" onSubmit={entrar} noValidate>
            <div><h1 className="au-h1">Tu aula</h1><p className="au-sub">Entrá con el email que usaste al comprar tu curso.</p></div>

            {aviso === 'terapeuta' && (
              <div className="au-aviso lavanda" role="status">
                <span>Esta es una cuenta de terapeuta, no de alumna. Para entrar a tu panel, usá <Link href="/auth/login">Iniciar sesión de terapeutas</Link>.</span>
                <span>Si en realidad querías hacer un curso, entrá desde el link que te pasó tu profesora.</span>
              </div>
            )}
            {aviso === 'links' && (
              <div className="au-aviso citrino" role="status">Esta es una cuenta de Luma Links. Entrá desde <Link href="/links/login">Luma Links</Link>.</div>
            )}
            {aviso === 'sin_cursos' && (
              <div className="au-aviso lavanda" role="status">Esta cuenta todavía no tiene cursos. Para anotarte, entrá desde el link del curso que te pasó tu profesora: ahí elegís cómo pagar y queda todo en tu aula.</div>
            )}

            <label className="au-campo" htmlFor="au-email">Email
              <span className="au-in"><input id="au-email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="el que usaste al comprar tu curso" /></span>
            </label>
            <label className="au-campo" htmlFor="au-pass">Contraseña
              <span className="au-in"><input id="au-pass" type={verPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" className="au-ojo" onClick={() => setVerPassword(!verPassword)} aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></button>
              </span>
            </label>
            <button type="button" className="au-link derecha" onClick={recuperar} disabled={recuperando}>{recuperando ? 'Enviando…' : 'Olvidé mi contraseña'}</button>

            {error && <div className="au-error" role="alert">{error}</div>}
            {mailEnviado && (
              <div className="au-aviso lavanda" role="status"><span>Te mandamos un mail a <strong>{email.trim()}</strong> para crear una contraseña nueva. Si no lo ves, revisá spam.</span></div>
            )}

            <button className="au-btn" type="submit" disabled={cargando || !email.trim() || !password}>{cargando ? <><i className="au-girar"/>Entrando…</> : 'Entrar a mis cursos'}</button>

            <div className="au-otros">
              <span>¿Todavía no tenés tu curso? Entrá desde el link que te pasó tu profesora.</span>
              <span>¿Sos terapeuta? <Link href="/auth/login">Entrá acá</Link></span>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
