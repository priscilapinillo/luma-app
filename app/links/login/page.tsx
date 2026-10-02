'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { tieneAccesoLumaActivo } from '@/lib/accesoLinks'

export default function LinksLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mailRecuperoEnviado, setMailRecuperoEnviado] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (loginError || !data.user) {
        setError('Email o contraseña incorrectos.')
        return
      }

      // Chequeo estricto: esta cuenta tiene que tener un perfil de Luma Links.
      // No miramos subscriptions ni persons acá — si no está en luma_links_profiles, no entra.
      const { data: perfil } = await supabase
        .from('luma_links_profiles')
        .select('id')
        .eq('auth_user_id', data.user.id)
        .maybeSingle()

        if (!perfil) {
            if (await tieneAccesoLumaActivo(data.user.id)) {
              await supabase.auth.signOut()
              setError('Esta cuenta ya tiene un plan activo de Luma. No se puede tener Luma Links a la vez — cancelá el plan primero si querés usar la versión gratis.')
              return
            }
            const nombreSugerido = data.user.email?.split('@')[0] || 'usuaria'
            const slugBase = nombreSugerido.toLowerCase().replace(/[^a-z0-9-]/g, '')
            const slug = `${slugBase}-${data.user.id.slice(0, 6)}`
    
            const { error: insertError } = await supabase.from('luma_links_profiles').insert({
              auth_user_id: data.user.id,
              nombre: nombreSugerido,
              slug,
            })
    
            if (insertError) {
              await supabase.auth.signOut()
              setError('Hubo un error creando tu Luma Links. Intentá de nuevo.')
              return
            }
          }

      router.push('/links/dashboard')
    } catch (err) {
      console.error(err)
      setError('Error inesperado. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  async function recuperarContrasena() {
    if (!email.trim()) { setError('Escribí tu email arriba y volvé a tocar "Olvidé mi contraseña".'); return }
    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (resetError) { setError('No pudimos enviar el mail. Intentá de nuevo en unos minutos.'); return }
    setError('')
    setMailRecuperoEnviado(true)
  }

  return (
    <div className="lr-page">
      <style>{`
        
        @font-face{font-family:'Avigea';src:url('/fonts/Avigea.ttf') format('truetype');font-display:swap}
        *{box-sizing:border-box;margin:0;padding:0}
        .lr-page{min-height:100vh;position:relative;overflow:hidden;font-family:'Montserrat',sans-serif;color:#F9F6F0;
          background:linear-gradient(160deg,rgba(30,27,46,0.88),rgba(13,11,20,0.94)),url('/landing/hero-bgg.png') center/cover no-repeat;
          padding:28px 20px 60px}
        .lr-glow{position:absolute;border-radius:50%;filter:blur(90px);pointer-events:none;z-index:0}
        .lr-glow.g1{width:420px;height:420px;background:rgba(139,92,246,0.35);top:-120px;left:50%;transform:translateX(-50%);animation:lrPulse 6s ease-in-out infinite}
        .lr-glow.g2{width:320px;height:320px;background:rgba(201,168,76,0.18);bottom:-80px;right:-60px}
        @keyframes lrPulse{0%,100%{opacity:.75}50%{opacity:1}}

        .lr-top{position:relative;z-index:1;display:flex;justify-content:center;align-items:center;gap:10px;margin-bottom:28px}
        .lr-logo{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:600;color:#F9F6F0;text-decoration:none}
        .lr-logo span{color:#C9A84C}
        .lr-pill{font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#C9A84C;border:1px solid rgba(201,168,76,0.4);padding:4px 10px;border-radius:999px}

        .lr-hero{position:relative;z-index:1;text-align:center;max-width:920px;margin:0 auto 40px}
        .lr-h1{font-family:'Avigea','Cormorant Garamond',serif;font-weight:400;font-size:clamp(34px,6.2vw,68px);line-height:1.08;color:#F9F6F0;text-shadow:0 0 40px rgba(139,92,246,0.45)}
        .lr-h1 .oro{color:#C9A84C}
        .lr-sub{margin:18px auto 0;max-width:560px;font-size:15px;line-height:1.6;color:#D9D0EE}

        .lr-grid{position:relative;z-index:1;max-width:420px;margin:0 auto}
        .lr-card{width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:28px;padding:30px 26px;
          backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:0 30px 80px rgba(0,0,0,0.45)}
        .lr-card-title{font-size:18px;font-weight:700;margin-bottom:4px}
        .lr-card-sub{font-size:13px;color:#B9AED3;margin-bottom:22px}
        .lr-field{margin-bottom:14px}
        .lr-label{display:block;font-size:12px;font-weight:600;color:#D9D0EE;margin-bottom:7px;padding-left:4px}
        .lr-input{width:100%;height:50px;padding:0 18px;border-radius:16px;border:1px solid rgba(255,255,255,0.14);background:rgba(255,255,255,0.07);
          color:#F9F6F0;font-size:15px;font-family:inherit;outline:none;transition:all .2s}
        .lr-input::placeholder{color:#8F84AA}
        .lr-input:focus{border-color:#A78BFA;background:rgba(255,255,255,0.1);box-shadow:0 0 0 4px rgba(139,92,246,0.22)}
        .lr-error{font-size:13px;color:#FECACA;background:rgba(220,38,38,0.15);border:1px solid rgba(248,113,113,0.35);padding:10px 14px;border-radius:14px;margin-bottom:14px;line-height:1.5}
        .lr-ok{font-size:13px;color:#A7F3D0;background:rgba(16,185,129,0.14);border:1px solid rgba(52,211,153,0.35);padding:10px 14px;border-radius:14px;margin-bottom:14px;line-height:1.5}
        .lr-olvide{text-align:right;margin:-4px 0 14px}
        .lr-olvide button{background:none;border:none;padding:0;color:#C9A84C;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit}
        .lr-btn{width:100%;height:52px;border:none;border-radius:999px;background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:white;font-size:15px;font-weight:700;
          font-family:inherit;cursor:pointer;box-shadow:0 12px 30px rgba(139,92,246,0.45);transition:transform .2s,box-shadow .2s}
        .lr-btn:hover{transform:translateY(-2px);box-shadow:0 16px 36px rgba(139,92,246,0.55)}
        .lr-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}
        .lr-switch{text-align:center;margin-top:18px;font-size:13px;color:#B9AED3}
        .lr-switch a{color:#C9A84C;font-weight:600;text-decoration:none}
      `}</style>

      <div className="lr-glow g1"/>
      <div className="lr-glow g2"/>

      <header className="lr-top">
        <a href="/" className="lr-logo">Luma<span>.</span></a>
        <span className="lr-pill">Links</span>
      </header>

      <section className="lr-hero">
      <h1 className="lr-h1">Todo lo que hagas con <span className="oro">amor</span> estará bien hecho</h1>
      <p className="lr-sub">Qué lindo verte de nuevo.</p>
      </section>

      <div className="lr-grid">
        <form className="lr-card" onSubmit={handleLogin}>
          <div className="lr-card-title">Iniciá sesión</div>
          <div className="lr-card-sub">Con el email de tu Luma Links.</div>

          {error && <div className="lr-error">{error}</div>}
          {mailRecuperoEnviado && (
            <div className="lr-ok">Te mandamos un mail a {email.trim()} para elegir una contraseña nueva.</div>
          )}

          <div className="lr-field">
            <label className="lr-label">Email</label>
            <input className="lr-input" type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} required/>
          </div>
          <div className="lr-field">
            <label className="lr-label">Contraseña</label>
            <input className="lr-input" type="password" placeholder="Tu contraseña" value={password} onChange={e => setPassword(e.target.value)} required/>
          </div>

          <div className="lr-olvide">
            <button type="button" onClick={recuperarContrasena}>Olvidé mi contraseña</button>
          </div>

          <button type="submit" className="lr-btn" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <div className="lr-switch">¿Todavía no tenés tu página? <a href="/links/registro">Creala gratis</a></div>
        </form>
      </div>
    </div>
  )
}