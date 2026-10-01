'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { tieneAccesoLumaActivo } from '@/lib/accesoLinks'


export default function LinksRegistroPage() {
  const router = useRouter()
  const registrandoRef = useRef(false)
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (registrandoRef.current) return
    registrandoRef.current = true
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: nombre } },
      })

      if (signUpError) {
        setError(signUpError.message === 'User already registered'
          ? 'Ese email ya tiene una cuenta. Iniciá sesión en vez de registrarte.'
          : 'No se pudo crear la cuenta. Intentá de nuevo.')
        return
      }
      if (!data.user) {
        setError('No se pudo crear la cuenta. Intentá de nuevo.')
        return
      }

      if (await tieneAccesoLumaActivo(data.user.id)) {
        await supabase.auth.signOut()
        setError('Ya tenés una cuenta de Luma activa con este email. Iniciá sesión en /auth/login en vez de crear un Luma Links — no se pueden tener las dos cosas a la vez.')
        return
      }

      const slugBase = nombre.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const slug = `${slugBase}-${data.user.id.slice(0, 6)}`

      const { error: insertError } = await supabase.from('luma_links_profiles').insert({
        auth_user_id: data.user.id,
        nombre: nombre.trim(),
        slug,
      })

      if (insertError) {
        console.error('Error creando perfil de Links:', insertError)
        setError('Se creó tu cuenta pero hubo un error armando tu perfil. Escribinos a soporte.')
        return
      }

      router.push('/links/dashboard')
    } catch (err) {
      console.error(err)
      setError('Error inesperado. Intentá de nuevo.')
    } finally {
      setLoading(false)
      registrandoRef.current = false
    }
  }

  return (
    <div className="lr-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Cormorant+Garamond:wght@500;600&display=swap');
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

        .lr-card{width:100%;max-width:420px;justify-self:center;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:28px;padding:30px 26px;
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
        .lr-btn{width:100%;height:52px;border:none;border-radius:999px;background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:white;font-size:15px;font-weight:700;
          font-family:inherit;cursor:pointer;box-shadow:0 12px 30px rgba(139,92,246,0.45);transition:transform .2s,box-shadow .2s;margin-top:6px}
        .lr-btn:hover{transform:translateY(-2px);box-shadow:0 16px 36px rgba(139,92,246,0.55)}
        .lr-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}
        .lr-trust{display:flex;flex-wrap:wrap;justify-content:center;gap:8px 14px;margin-top:16px;font-size:12px;color:#B9AED3}
        .lr-trust span::before{content:'✦ ';color:#C9A84C}
        .lr-switch{text-align:center;margin-top:18px;font-size:13px;color:#B9AED3}
        .lr-switch a{color:#C9A84C;font-weight:600;text-decoration:none}

        .lr-preview{justify-self:center;width:min(300px,82vw);animation:lrFloat 6s ease-in-out infinite}
        @keyframes lrFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        .lr-phone{border-radius:38px;padding:10px;background:linear-gradient(160deg,#2A2340,#100C1A);box-shadow:0 40px 90px rgba(0,0,0,0.55),0 0 0 1px rgba(201,168,76,0.25)}
        .lr-screen{border-radius:30px;overflow:hidden;padding:28px 18px 26px;text-align:center;
          background:radial-gradient(circle at 20% 10%,rgba(107,63,160,0.45),transparent 50%),radial-gradient(circle at 85% 90%,rgba(201,168,76,0.22),transparent 50%),#0D0B14}
        .lr-avatar{width:76px;height:76px;border-radius:50%;margin:0 auto 12px;background:linear-gradient(135deg,#6B3FA0,#C9A84C);display:flex;align-items:center;justify-content:center;
          font-family:'Cormorant Garamond',serif;font-size:32px;color:#F9F6F0;box-shadow:0 0 0 3px rgba(201,168,76,0.4)}
        .lr-nombre{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:#F0E8D5}
        .lr-bio{font-size:11px;color:#A898C4;margin:4px 0 18px}
        .lr-link{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:16px;margin-bottom:10px;text-align:left;
          background:linear-gradient(135deg,rgba(201,168,76,0.18),rgba(107,63,160,0.25));border:1px solid rgba(201,168,76,0.25);font-size:12px;font-weight:600;color:#F0E8D5}
        .lr-link-icon{width:28px;height:28px;border-radius:50%;background:rgba(201,168,76,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#E8D5A3}
        .lr-preview-cap{text-align:center;margin-top:14px;font-size:12px;color:#B9AED3}
      `}</style>

      <div className="lr-glow g1"/>
      <div className="lr-glow g2"/>

      <header className="lr-top">
        <a href="/" className="lr-logo">Luma<span>.</span></a>
        <span className="lr-pill">Links</span>
      </header>

      <section className="lr-hero">
        <h1 className="lr-h1">Link en bio <span className="oro">gratis</span> para tarotistas, terapeutas y astrólogas</h1>
        <p className="lr-sub">Todos tus links en una página con la estética de tu trabajo. La armás en dos minutos y es gratis para siempre.</p>
      </section>

      <div className="lr-grid">
        <form className="lr-card" onSubmit={handleRegister}>
          <div className="lr-card-title">Creá tu página</div>
          <div className="lr-card-sub">Sin tarjeta y sin vueltas.</div>

          {error && <div className="lr-error">{error}</div>}

          <div className="lr-field">
            <label className="lr-label">Tu nombre o el de tu marca</label>
            <input className="lr-input" placeholder="Ej: Luna Tarot" value={nombre} onChange={e => setNombre(e.target.value)} required/>
          </div>
          <div className="lr-field">
            <label className="lr-label">Email</label>
            <input className="lr-input" type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} required/>
          </div>
          <div className="lr-field">
            <label className="lr-label">Contraseña</label>
            <input className="lr-input" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}/>
          </div>

          <button type="submit" className="lr-btn" disabled={loading}>
            {loading ? 'Creando tu página...' : 'Crear mi página gratis'}
          </button>

          <div className="lr-trust">
            <span>Gratis para siempre</span>
            <span>Sin tarjeta</span>
            <span>6 estéticas para elegir</span>
          </div>

          <div className="lr-switch">¿Ya tenés tu Luma Links? <a href="/links/login">Iniciá sesión</a></div>
        </form>

      </div>
    </div>
  )
}