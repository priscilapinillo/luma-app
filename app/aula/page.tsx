'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

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

  if (revisando) return <div className="au-cargando">Cargando…</div>

  return (
    <div className="au-pagina">
      <style>{`
        @font-face{font-family:'Avigea';src:url('/fonts/Avigea.ttf') format('truetype');font-display:swap}
        *{box-sizing:border-box;margin:0;padding:0}
        :root{
          --au-noche:#140F24; --au-hondo:#1E1734; --au-crema:#F4EFE6; --au-oro:#C9A84C;
          --au-lavanda:#B7A9D9; --au-linea:rgba(244,239,230,0.14); --au-error:#F2A7A7;
        }
        .au-cargando{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#140F24;color:#B7A9D9;font-family:'Montserrat',sans-serif;font-size:14px}
        .au-pagina{min-height:100vh;background:var(--au-noche);color:var(--au-crema);font-family:'Montserrat',sans-serif;
          display:flex;flex-direction:column;align-items:center;padding:28px 16px 56px}
        .au-logo{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:var(--au-crema);text-decoration:none;align-self:center;margin-bottom:56px}
        .au-logo span{color:var(--au-oro)}
        .au-col{width:100%;max-width:400px}

        /* las fases de la luna: cada lección, un paso más */
        .au-fases{display:flex;justify-content:center;gap:10px;margin-bottom:28px}
        .au-fase{width:11px;height:11px;border-radius:50%;background:var(--au-crema);border:1px solid rgba(201,168,76,0.55)}
        .au-fase:nth-child(1){box-shadow:inset 11px 0 0 0 var(--au-noche)}
        .au-fase:nth-child(2){box-shadow:inset 7px 0 0 0 var(--au-noche)}
        .au-fase:nth-child(3){box-shadow:inset 4px 0 0 0 var(--au-noche)}
        .au-fase:nth-child(4){box-shadow:none;background:var(--au-oro);border-color:var(--au-oro)}
        .au-fase:nth-child(5){box-shadow:inset -4px 0 0 0 var(--au-noche)}
        .au-fase:nth-child(6){box-shadow:inset -7px 0 0 0 var(--au-noche)}
        .au-fase:nth-child(7){box-shadow:inset -11px 0 0 0 var(--au-noche)}
        @media (prefers-reduced-motion:no-preference){
          .au-fase{opacity:0;animation:auFase .5s ease forwards}
          .au-fase:nth-child(1){animation-delay:.05s}.au-fase:nth-child(2){animation-delay:.12s}
          .au-fase:nth-child(3){animation-delay:.19s}.au-fase:nth-child(4){animation-delay:.26s}
          .au-fase:nth-child(5){animation-delay:.33s}.au-fase:nth-child(6){animation-delay:.40s}
          .au-fase:nth-child(7){animation-delay:.47s}
          @keyframes auFase{to{opacity:1}}
        }

        .au-h1{font-family:'Avigea','Cormorant Garamond',serif;font-weight:400;font-size:clamp(44px,11vw,64px);line-height:1.05;text-align:center;letter-spacing:.5px}
        .au-frase{font-family:'Cormorant Garamond',serif;font-size:20px;line-height:1.45;color:var(--au-lavanda);text-align:center;margin:12px auto 40px;max-width:30ch}

        .au-campo{display:flex;flex-direction:column;gap:7px;margin-bottom:18px}
        .au-campo label{font-size:13px;color:var(--au-lavanda)}
        .au-input-wrap{position:relative}
        .au-campo input{width:100%;padding:14px 16px;border-radius:12px;border:1px solid var(--au-linea);background:var(--au-hondo);color:var(--au-crema);font-size:16px;font-family:inherit;outline:none;transition:border-color .2s}
        .au-campo input:focus{border-color:var(--au-oro)}
        .au-ojo{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--au-lavanda);font-size:12px;cursor:pointer;font-family:inherit;padding:6px}

        .au-btn{width:100%;padding:15px;border:none;border-radius:12px;background:var(--au-crema);color:var(--au-noche);font-size:15px;font-weight:700;font-family:inherit;cursor:pointer;margin-top:6px;transition:background .2s}
        .au-btn:hover{background:#FFFFFF}
        .au-btn:disabled{opacity:.6;cursor:not-allowed}
        :is(.au-btn,.au-link,.au-campo input,.au-ojo,a):focus-visible{outline:2px solid var(--au-oro);outline-offset:3px}

        .au-link{background:none;border:none;color:var(--au-lavanda);font-size:13px;font-family:inherit;cursor:pointer;text-decoration:underline;text-underline-offset:3px;padding:4px 0}
        .au-link:hover{color:var(--au-crema)}
        .au-centro{text-align:center;margin-top:16px}

        .au-error{font-size:13px;color:var(--au-error);margin-bottom:14px;line-height:1.5}
        .au-ok{font-size:13px;color:var(--au-crema);background:var(--au-hondo);border:1px solid var(--au-linea);border-radius:12px;padding:12px 14px;margin-top:16px;line-height:1.55}
        .au-aviso{background:var(--au-hondo);border:1px solid rgba(201,168,76,0.4);border-radius:14px;padding:16px 18px;margin-bottom:22px;font-size:14px;line-height:1.6}
        .au-aviso a{color:var(--au-oro);font-weight:600}

        .au-pie{margin-top:48px;padding-top:22px;border-top:1px solid var(--au-linea);font-size:13px;line-height:1.65;color:var(--au-lavanda);text-align:center}
        .au-pie a{color:var(--au-crema)}
      `}</style>

      <Link href="/" className="au-logo">Luma<span>.</span></Link>

      <main className="au-col">
        <div className="au-fases" aria-hidden="true">
          {Array.from({ length: 7 }).map((_, i) => <span key={i} className="au-fase" />)}
        </div>
        <h1 className="au-h1">Tu aula</h1>
        <p className="au-frase">Lo que empezaste sigue acá, esperándote.</p>

        {aviso === 'terapeuta' && (
          <div className="au-aviso" role="status">
            Esta es una cuenta de terapeuta, no de alumna. Para entrar a tu panel, usá <Link href="/auth/login">Iniciar sesión de terapeutas</Link>.
            <br />Si en realidad querías hacer un curso, entrá desde el link que te pasó tu profesora.
          </div>
        )}
        {aviso === 'links' && (
          <div className="au-aviso" role="status">
            Esta es una cuenta de Luma Links. Entrá desde <Link href="/links/login">Luma Links</Link>.
          </div>
        )}
        {aviso === 'sin_cursos' && (
          <div className="au-aviso" role="status">
            Esta cuenta todavía no tiene cursos. Para anotarte, entrá desde el link del curso que te pasó tu profesora: ahí elegís cómo pagar y queda todo en tu aula.
          </div>
        )}

        <form onSubmit={entrar} noValidate>
          <div className="au-campo">
            <label htmlFor="au-email">Email</label>
            <input id="au-email" type="email" autoComplete="email" inputMode="email" required
              value={email} onChange={e => setEmail(e.target.value)} placeholder="el que usaste al comprar tu curso" />
          </div>
          <div className="au-campo">
            <label htmlFor="au-pass">Contraseña</label>
            <div className="au-input-wrap">
              <input id="au-pass" type={verPassword ? 'text' : 'password'} autoComplete="current-password" required
                value={password} onChange={e => setPassword(e.target.value)} style={{ paddingRight: '64px' }} />
              <button type="button" className="au-ojo" onClick={() => setVerPassword(!verPassword)}
                aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                {verPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </div>

          {error && <div className="au-error" role="alert">{error}</div>}

          <button className="au-btn" type="submit" disabled={cargando || !email.trim() || !password}>
            {cargando ? 'Entrando…' : 'Entrar a mis cursos'}
          </button>
        </form>

        <div className="au-centro">
          <button type="button" className="au-link" onClick={recuperar} disabled={recuperando}>
            {recuperando ? 'Enviando…' : 'Olvidé mi contraseña'}
          </button>
        </div>
        {mailEnviado && (
          <div className="au-ok" role="status">
            Te mandamos un mail a <strong>{email.trim()}</strong> para crear una contraseña nueva. Si no lo ves, revisá spam.
          </div>
        )}

        <div className="au-pie">
          ¿Todavía no tenés tu curso? Entrá desde el link que te pasó tu profesora.
          <br />¿Sos terapeuta? <Link href="/auth/login">Entrá acá</Link>
        </div>
      </main>
    </div>
  )
}
