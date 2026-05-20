'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
      return
    }
    router.push('/dashboard')
  }

  return (
    <>
      <>
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Inter:wght@300;400;500;600&display=swap');
    *{box-sizing:border-box}
    .auth-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0D0B14;font-family:'Inter',sans-serif;padding:20px;position:relative;overflow:hidden}
    
    /* FONDO ANIMADO */
    .orb{position:absolute;border-radius:50%;filter:blur(80px);opacity:0.4;animation:drift var(--dur,12s) ease-in-out infinite alternate}
    .orb1{width:400px;height:400px;background:radial-gradient(circle,#6B3FA0,transparent);top:-100px;left:-100px;--dur:14s}
    .orb2{width:300px;height:300px;background:radial-gradient(circle,#C9A84C,transparent);bottom:-80px;right:-80px;--dur:18s}
    .orb3{width:200px;height:200px;background:radial-gradient(circle,#8B5CF6,transparent);top:50%;left:60%;--dur:10s}
    @keyframes drift{0%{transform:translate(0,0) scale(1)}100%{transform:translate(30px,20px) scale(1.1)}}
    
    /* STARS */
    .star{position:absolute;width:2px;height:2px;background:#C9A84C;border-radius:50%;opacity:0;animation:twinkle var(--dur,3s) var(--delay,0s) infinite}
    @keyframes twinkle{0%,100%{opacity:0}50%{opacity:var(--op,0.5)}}
    
    /* CRISTALES FLOTANTES */
    .crystal{position:absolute;opacity:0.12;animation:float var(--dur,8s) var(--delay,0s) ease-in-out infinite alternate}
    @keyframes float{0%{transform:translateY(0) rotate(0deg)}100%{transform:translateY(-20px) rotate(15deg)}}
    
    .auth-card{display:grid;grid-template-columns:1fr 1fr;width:100%;max-width:860px;border-radius:28px;overflow:hidden;box-shadow:0 40px 100px rgba(0,0,0,0.6),0 0 80px rgba(107,63,160,0.3),inset 0 0 0 0.5px rgba(201,168,76,0.2);position:relative;z-index:1;backdrop-filter:blur(20px)}
    
    /* LADO IZQUIERDO */
    .auth-left{background:linear-gradient(160deg,#1A1035 0%,#0D0B14 50%,#1A1628 100%);padding:48px 40px;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;border-right:0.5px solid rgba(201,168,76,0.15)}
    .auth-left-logo{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:300;color:#C9A84C;letter-spacing:4px;text-transform:uppercase;position:relative;z-index:1}
    .auth-left-logo span{color:#E8D5A3}
    .auth-left-deco{position:relative;z-index:1;margin:auto 0}
    .auth-carta{width:140px;height:210px;border-radius:12px;border:0.5px solid rgba(201,168,76,0.4);background:linear-gradient(160deg,#1E1A2E,#12101C);margin:0 auto 24px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;overflow:hidden;box-shadow:0 0 30px rgba(201,168,76,0.15),0 0 60px rgba(107,63,160,0.2)}
    .auth-carta::before{content:'';position:absolute;inset:8px;border:0.5px solid rgba(201,168,76,0.2);border-radius:6px;pointer-events:none}
    .auth-carta-star{font-size:48px;margin-bottom:8px;filter:drop-shadow(0 0 12px rgba(201,168,76,0.6))}
    .auth-carta-roman{font-family:'Cormorant Garamond',serif;font-size:11px;color:rgba(201,168,76,0.6);letter-spacing:4px}
    .auth-left-bottom{position:relative;z-index:1}
    .auth-left-tag{font-size:9px;color:rgba(201,168,76,0.5);letter-spacing:4px;text-transform:uppercase;margin-bottom:10px}
    .auth-left-title{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:300;color:#E8D5A3;line-height:1.5;letter-spacing:0.5px}
    .auth-left-title em{font-style:italic;color:#C9A84C}
    
    /* LADO DERECHO */
    .auth-right{background:rgba(18,16,28,0.95);padding:48px 44px;display:flex;flex-direction:column;justify-content:center;position:relative}
    .auth-right::before{content:'';position:absolute;top:0;right:0;width:200px;height:200px;background:radial-gradient(circle,rgba(139,92,246,0.08),transparent);pointer-events:none}
    .auth-right-label{font-size:9px;color:#C9A84C;font-weight:400;letter-spacing:4px;text-transform:uppercase;margin-bottom:10px}
    .auth-right h1{font-family:'Cormorant Garamond',serif;font-size:34px;font-weight:300;color:#E8D5A3;margin-bottom:6px;letter-spacing:-0.5px}
    .auth-right-sub{font-size:13px;color:rgba(212,197,169,0.5);margin-bottom:36px;line-height:1.7;font-style:italic;font-family:'Cormorant Garamond',serif}
    
    .auth-field{margin-bottom:20px}
    .auth-label{font-size:9px;font-weight:400;color:rgba(201,168,76,0.7);letter-spacing:3px;text-transform:uppercase;display:block;margin-bottom:8px}
    .auth-input{width:100%;padding:13px 16px;border-radius:12px;border:0.5px solid rgba(201,168,76,0.2);font-size:14px;color:#E8D5A3;outline:none;transition:all 0.3s;font-family:'Inter',sans-serif;background:rgba(255,255,255,0.04)}
    .auth-input::placeholder{color:rgba(212,197,169,0.25)}
    .auth-input:focus{border-color:rgba(201,168,76,0.5);background:rgba(201,168,76,0.05);box-shadow:0 0 20px rgba(201,168,76,0.08)}
    .auth-input-wrap{position:relative}
    .auth-input-wrap .auth-input{padding-right:44px}
    .auth-eye{position:absolute;right:14px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:rgba(201,168,76,0.4);font-size:14px;padding:0;transition:color 0.2s}
    .auth-eye:hover{color:#C9A84C}
    .auth-error{font-size:12px;color:#F87171;margin-bottom:16px;padding:10px 14px;background:rgba(239,68,68,0.1);border-radius:8px;border:0.5px solid rgba(239,68,68,0.3)}
    .auth-btn{width:100%;padding:14px;background:linear-gradient(135deg,#6B3FA0,#8B5CF6);color:#E8D5A3;border:0.5px solid rgba(201,168,76,0.2);border-radius:12px;font-size:13px;font-weight:500;cursor:pointer;font-family:'Inter',sans-serif;letter-spacing:2px;text-transform:uppercase;box-shadow:0 8px 32px rgba(107,63,160,0.4);transition:all 0.3s}
    .auth-btn:hover{transform:translateY(-1px);box-shadow:0 12px 40px rgba(107,63,160,0.5)}
    .auth-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none}
    .auth-footer{text-align:center;margin-top:20px;font-size:12px;color:rgba(201,168,76,0.4)}
    .auth-footer a{color:#C9A84C;text-decoration:none;transition:color 0.2s}
    .auth-footer a:hover{color:#E8D5A3}
    .auth-divider{display:flex;align-items:center;gap:12px;margin-bottom:28px;color:rgba(201,168,76,0.3);font-size:9px;letter-spacing:3px}
    .auth-divider::before,.auth-divider::after{content:'';flex:1;height:0.5px;background:rgba(201,168,76,0.15)}
    
    @media(max-width:640px){
      .auth-card{grid-template-columns:1fr}
      .auth-left{display:none}
      .auth-right{padding:36px 28px;border-radius:28px}
      .auth-wrap{align-items:center;padding:16px}
    }
  `}</style>

  {/* FONDO */}
  <div className="auth-wrap">
    <div className="orb orb1"/>
    <div className="orb orb2"/>
    <div className="orb orb3"/>
    {Array.from({length:30}).map((_,i) => (
      <div key={i} className="star" style={{
        left:`${Math.random()*100}%`,
        top:`${Math.random()*100}%`,
        '--dur':`${2+Math.random()*4}s`,
        '--delay':`${Math.random()*4}s`,
        '--op': Math.random()*0.4+0.1,
      } as any}/>
    ))}

    <div className="auth-card">
      {/* IZQUIERDA */}
      <div className="auth-left">
        <div className="auth-left-logo">L<span>uma</span></div>
        <div className="auth-left-deco">
          <div className="auth-carta">
            <div className="auth-carta-star">🌙</div>
            <div className="auth-carta-roman">✦ XVIII ✦</div>
          </div>
        </div>
        <div className="auth-left-bottom">
          <p className="auth-left-tag">Para terapeutas</p>
          <p className="auth-left-title">No recuerda sesiones.<br/><em>Recuerda personas.</em></p>
        </div>
      </div>

      {/* DERECHA */}
      <div className="auth-right">
        <p className="auth-right-label">✦ Bienvenida de vuelta</p>
        <h1>Iniciá sesión</h1>
        <p className="auth-right-sub">Accedé a tu espacio y retomá donde lo dejaste.</p>
        <div className="auth-divider">✦ ✦ ✦</div>

        <form onSubmit={handleLogin}>
          <div className="auth-field">
            <label className="auth-label">Email</label>
            <input className="auth-input" type="email" value={email}
              onChange={e => setEmail(e.target.value)} required placeholder="tu@email.com"/>
          </div>
          <div className="auth-field">
            <label className="auth-label">Contraseña</label>
            <div className="auth-input-wrap">
              <input className="auth-input" type={showPassword ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="••••••••••"/>
              <button type="button" className="auth-eye" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Ingresando...' : '✦ Ingresar'}
          </button>
        </form>

        <p className="auth-footer">
          ¿No tenés cuenta?{' '}
          <Link href="/auth/register">Registrate gratis</Link>
        </p>
      </div>
    </div>
  </div>
</>

      <div className="auth-wrap">
        <div className="auth-card">

          <div className="auth-left">
            <span className="auth-left-logo">Luma</span>
            <div className="auth-left-bottom">
              <p className="auth-left-tag">Para terapeutas</p>
              <p className="auth-left-title">No recuerda sesiones.<br /><em>Recuerda personas.</em></p>
            </div>
          </div>

          <div className="auth-right">
            <p className="auth-right-label">Bienvenida de vuelta</p>
            <h1>Iniciá sesión</h1>
            <p className="auth-right-sub">Accedé a tu espacio de trabajo y retomá donde lo dejaste.</p>

            <form onSubmit={handleLogin}>
              <div className="auth-field">
                <label className="auth-label">Email</label>
                <input
                  className="auth-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="tu@email.com"
                />
              </div>

              <div className="auth-field">
                <label className="auth-label">Contraseña</label>
                <div className="auth-input-wrap">
                  <input
                    className="auth-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••••"
                  />
                  <button
                    type="button"
                    className="auth-eye"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {error && <p className="auth-error">{error}</p>}

              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? 'Ingresando...' : 'Ingresar →'}
              </button>
            </form>

            <p className="auth-footer">
              ¿No tenés cuenta?{' '}
              <Link href="/auth/register">Registrate gratis</Link>
            </p>
          </div>

        </div>
      </div>
    </>
  )
}