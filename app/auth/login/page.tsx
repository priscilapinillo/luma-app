'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AuthPage() {
  const [flipped, setFlipped] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Email o contraseña incorrectos'); setLoading(false); return }
    router.push('/dashboard')
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

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setRegLoading(true)
    setRegError('')
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email: regEmail, password: regPassword,
      options: { data: { full_name: nombre } }
    })
    if (error) { setRegError('No se pudo crear la cuenta. Intentá con otro email.'); setRegLoading(false); return }
    if (data.user) {
      const trialEnds = new Date()
      trialEnds.setDate(trialEnds.getDate() + 7)
      await supabase.from('subscriptions').insert({
        user_id: data.user.id,
        status: 'trial',
        trial_ends_at: trialEnds.toISOString(),
      })
    }
    setEnviado(true)
    setRegLoading(false)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html,body{height:100%;font-family:'Geist',sans-serif}

        .auth-wrap{
          min-height:100vh;width:100%;
          display:grid;
          grid-template-columns:1fr 1fr;
        }

        /* LADO IZQUIERDO — decorativo */
        .auth-left{
          background:#0A0A0A;
          position:relative;overflow:hidden;
          display:flex;flex-direction:column;
          justify-content:space-between;
          padding:48px;
        }
        .auth-left-glow1{
          position:absolute;width:500px;height:500px;border-radius:50%;
          background:radial-gradient(circle,rgba(139,92,246,0.2),transparent 70%);
          top:-150px;left:-150px;pointer-events:none;
        }
        .auth-left-glow2{
          position:absolute;width:400px;height:400px;border-radius:50%;
          background:radial-gradient(circle,rgba(236,72,153,0.12),transparent 70%);
          bottom:-100px;right:-100px;pointer-events:none;
        }
        .auth-left-top{position:relative;z-index:1}
        .auth-left-logo{
          font-size:24px;font-weight:900;color:white;
          letter-spacing:-1px;text-decoration:none;display:inline-block;
        }
        .auth-left-logo span{color:#8B5CF6}
        .auth-left-center{
          position:relative;z-index:1;
          flex:1;display:flex;flex-direction:column;
          justify-content:center;padding:40px 0;
        }
        .auth-left-tag{
          font-size:11px;font-weight:700;color:#525252;
          letter-spacing:3px;text-transform:uppercase;
          margin-bottom:20px;display:block;
        }
        .auth-left-title{
          font-size:clamp(36px,4vw,52px);font-weight:900;
          color:white;letter-spacing:-2px;line-height:1.05;
          margin-bottom:20px;
        }
        .auth-left-title .grad{
          background:linear-gradient(135deg,#8B5CF6,#EC4899,#F59E0B);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
        }
        .auth-left-sub{
          font-size:15px;color:#525252;line-height:1.65;
          max-width:380px;
        }
        .auth-left-features{
          display:flex;flex-direction:column;gap:12px;margin-top:32px;
        }
        .auth-left-feat{
          display:flex;align-items:center;gap:10px;
          font-size:14px;color:#737373;
        }
        .auth-left-feat-dot{
          width:6px;height:6px;border-radius:50%;
          background:linear-gradient(135deg,#8B5CF6,#EC4899);
          flex-shrink:0;
        }
        .auth-left-bottom{
          position:relative;z-index:1;
          font-size:13px;color:#404040;
        }

        /* DASHBOARD PREVIEW */
        .dash-preview{
          position:absolute;
          right:-40px;bottom:80px;
          width:340px;
          border-radius:14px;
          overflow:hidden;
          border:1px solid #1F1F1F;
          box-shadow:0 24px 60px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.03);
          transform:perspective(1000px) rotateY(-8deg) rotateX(4deg);
          transition:transform 0.3s;
          z-index:2;
        }
        .dash-preview:hover{transform:perspective(1000px) rotateY(-4deg) rotateX(2deg)}
        .dash-preview img{width:100%;display:block;opacity:0.85}
        .dash-preview-fade{
          position:absolute;bottom:0;left:0;right:0;height:120px;
          background:linear-gradient(to bottom,transparent,#0A0A0A);
          pointer-events:none;
        }

        /* LADO DERECHO — formulario */
        .auth-right{
          background:#FAFAFA;
          display:flex;flex-direction:column;
          align-items:center;justify-content:center;
          padding:40px 40px 300px 40px;
      
          position:relative;
        }
        .auth-right-inner{width:100%;max-width:480px;}

        /* FLIP CONTAINER */
        .flip-wrap{
          width:100%;
          perspective:1200px;
          
        }
        .flip-inner{
          position:relative;
          transform-style:preserve-3d;
          transition:transform 0.7s cubic-bezier(0.4,0,0.2,1);
        }
        .flip-inner.flipped{transform:rotateY(180deg)}
        .flip-face{
          width:100%;
          backface-visibility:hidden;
        }
        .flip-face.back{
          position:absolute;top:0;left:0;
          transform:rotateY(180deg);
        }

        /* FORM COMÚN */
        .form-logo{font-size:20px;font-weight:900;color:#0A0A0A;letter-spacing:-0.5px;margin-bottom:4px}
        .form-logo span{color:#8B5CF6}
        .form-title{font-size:28px;font-weight:900;color:#0A0A0A;letter-spacing:-1px;margin-bottom:6px;margin-top:28px}
        .form-sub{font-size:14px;color:#737373;margin-bottom:28px;line-height:1.5}
        .form-field{margin-bottom:14px}
        .form-label{font-size:12px;font-weight:600;color:#404040;display:block;margin-bottom:6px}
        .form-input{
          width:100%;padding:12px 14px;
          border-radius:10px;border:1.5px solid #E5E5E5;
          font-size:14px;color:#0A0A0A;
          outline:none;transition:all 0.2s;
          font-family:'Geist',sans-serif;
          background:white;
        }
        .form-input::placeholder{color:#A3A3A3}
        .form-input:focus{border-color:#8B5CF6;box-shadow:0 0 0 3px rgba(139,92,246,0.1)}
        .form-input-wrap{position:relative}
        .form-input-wrap .form-input{padding-right:42px}
        .form-eye{
          position:absolute;right:12px;top:50%;transform:translateY(-50%);
          background:none;border:none;cursor:pointer;
          color:#A3A3A3;font-size:14px;padding:0;
          transition:color 0.2s;
        }
        .form-eye:hover{color:#525252}
        .form-error{
          font-size:12px;color:#DC2626;margin-bottom:12px;
          padding:10px 12px;background:#FEF2F2;
          border-radius:8px;border:1px solid #FECACA;
        }
        .form-btn{
          width:100%;padding:13px;
          background:#0A0A0A;color:white;
          border:none;border-radius:10px;
          font-size:14px;font-weight:700;cursor:pointer;
          font-family:'Geist',sans-serif;letter-spacing:-0.2px;
          transition:all 0.2s;
          box-shadow:0 4px 14px rgba(0,0,0,0.15);
          margin-top:4px;
        }
        .form-btn:hover{background:#262626;transform:translateY(-1px);box-shadow:0 6px 20px rgba(0,0,0,0.2)}
        .form-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none}
        .form-divider{
          display:flex;align-items:center;gap:10px;
          margin:20px 0;color:#E5E5E5;font-size:12px;color:#A3A3A3;
        }
        .form-divider::before,.form-divider::after{content:'';flex:1;height:1px;background:#E5E5E5}
        .form-switch{
          text-align:center;margin-top:20px;
          font-size:13px;color:#737373;
        }
        .form-switch-link{
          color:#8B5CF6;font-weight:600;cursor:pointer;
          text-decoration:none;transition:color 0.2s;
          background:none;border:none;font-family:'Geist',sans-serif;
          font-size:13px;padding:0;
        }
        .form-switch-link:hover{color:#7C3AED}
        .form-trial{
          display:flex;align-items:center;gap:8px;
          padding:10px 12px;
          background:#F4F0FF;border:1px solid #DDD6FE;
          border-radius:8px;margin-bottom:20px;
          font-size:13px;color:#6D28D9;
        }
        .form-trial-dot{width:6px;height:6px;border-radius:50%;background:#8B5CF6;flex-shrink:0;animation:pulse 2s infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}

        /* ÉXITO */
        .exito{text-align:center;padding:20px 0}
        .exito-icon{font-size:40px;margin-bottom:16px;display:block}
        .exito-title{font-size:22px;font-weight:800;color:#0A0A0A;letter-spacing:-0.5px;margin-bottom:8px}
        .exito-sub{font-size:14px;color:#737373;line-height:1.6;margin-bottom:20px}
        .exito-email{color:#8B5CF6;font-weight:600}
        .exito-hint{font-size:13px;color:#A3A3A3;padding:10px 14px;background:#F5F5F5;border-radius:8px;margin-bottom:20px;line-height:1.5}
        .exito-back{
          font-size:13px;color:#8B5CF6;font-weight:600;cursor:pointer;
          background:none;border:none;font-family:'Geist',sans-serif;padding:0;
        }

        @media(max-width:768px){
          .auth-wrap{grid-template-columns:1fr}
          .auth-left{display:none}
          .auth-right{padding:40px 24px;min-height:100vh}
        }
      `}</style>

      <div className="auth-wrap">

        {/* IZQUIERDA */}
        <div className="auth-left">
          <div className="auth-left-glow1"/>
          <div className="auth-left-glow2"/>

          <div className="auth-left-top">
            <Link href="/" className="auth-left-logo">Luma<span>.</span></Link>
          </div>

          <div className="auth-left-center">
            <span className="auth-left-tag">Para profesionales del bienestar</span>
            <h2 className="auth-left-title">
              Tu trabajo,<br/>
              <span className="grad">organizado<br/>de verdad.</span>
            </h2>
            <p className="auth-left-sub">
              Agenda, historial, cobros y página de reservas — todo en un solo lugar.
            </p>
            <div className="auth-left-features">
              {[
                'Historial completo de cada consultante',
                'Página de reservas con Mercado Pago',
                'Dashboard de finanzas en tiempo real',
                '7 días gratis · Sin tarjeta',
              ].map((f,i) => (
                <div key={i} className="auth-left-feat">
                  <div className="auth-left-feat-dot"/>
                  {f}
                </div>
              ))}
            </div>

            {/* DASHBOARD PREVIEW */}
            <div className="dash-preview" style={{position:'relative',right:'unset',bottom:'unset',width:'100%',marginTop:'32px',transform:'none'}}>
              <img src="/screenshots/dashboard.png" alt="Dashboard"/>
              <div className="dash-preview-fade"/>
            </div>
          </div>

          <div className="auth-left-bottom">
            ARS $9.900/mes · Cancelás cuando querés
          </div>
        </div>

        {/* DERECHA */}
        <div className="auth-right">
          <div className="auth-right-inner">

            <div className="form-logo">Luma<span>.</span></div>

            <div className="flip-wrap">
              <div className={`flip-inner${flipped ? ' flipped' : ''}`}>

                {/* FRENTE — LOGIN */}
                <div className="flip-face front">
                  <div className="form-title">Iniciá sesión</div>
                  <p className="form-sub">Bienvenida de vuelta. Tu trabajo te espera.</p>
                  <form onSubmit={handleLogin}>
                    <div className="form-field">
                      <label className="form-label">Email</label>
                      <input className="form-input" type="email" value={email}
                        onChange={e => setEmail(e.target.value)} required placeholder="tu@email.com"/>
                    </div>
                    <div className="form-field">
                      <label className="form-label">Contraseña</label>
                      <div className="form-input-wrap">
                        <input className="form-input"
                          type={showPassword ? 'text' : 'password'}
                          value={password} onChange={e => setPassword(e.target.value)}
                          required placeholder="••••••••••"/>
                        <button type="button" className="form-eye"
                          onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? '○' : '●'}
                        </button>
                      </div>
                    </div>
                    {error && <div className="form-error">{error}</div>}
{!recuperando ? (
  <div style={{textAlign:'right',marginBottom:'12px'}}>
    <button type="button" className="form-switch-link"
      onClick={() => setRecuperando(true)}>
      ¿Olvidaste tu contraseña?
    </button>
  </div>
) : (
  <div style={{background:'#F4F0FF',border:'1px solid #DDD6FE',borderRadius:'10px',padding:'16px',marginBottom:'16px'}}>
    {recuperadoEnviado ? (
      <>
        <div style={{fontSize:'14px',fontWeight:700,color:'#6D28D9',marginBottom:'6px'}}>📬 Revisá tu email</div>
        <div style={{fontSize:'13px',color:'#737373',marginBottom:'10px'}}>Te enviamos un link para restablecer tu contraseña.</div>
        <button type="button" className="form-switch-link" onClick={() => { setRecuperando(false); setRecuperadoEnviado(false); setEmailRecuperar('') }}>
          ← Volver al login
        </button>
      </>
    ) : (
      <div onSubmit={handleRecuperar}>
        <div style={{fontSize:'13px',fontWeight:600,color:'#6D28D9',marginBottom:'10px'}}>Recuperar contraseña</div>
        <input className="form-input" type="email" placeholder="tu@email.com"
          value={emailRecuperar} onChange={e => setEmailRecuperar(e.target.value)}
          required style={{marginBottom:'10px'}}/>
        <div style={{display:'flex',gap:'8px'}}>
          <button type="button" className="form-switch-link"
            onClick={() => setRecuperando(false)}>
            Cancelar
          </button>
          <button type="button" className="form-btn"
            onClick={() => handleRecuperar()}
            disabled={enviandoRecuperar}
            style={{flex:1,marginTop:0,padding:'10px'}}>
            {enviandoRecuperar ? 'Enviando...' : 'Enviar link →'}
          </button>
        </div>
      </div>
    )}
  </div>
)}
<button type="submit" className="form-btn" disabled={loading}>
                      {loading ? 'Ingresando...' : 'Ingresar →'}
                    </button>
                  </form>
                  <div className="form-divider">o</div>
                  <div className="form-switch">
                    ¿No tenés cuenta?{' '}
                    <button className="form-switch-link"
                      onClick={() => { setFlipped(true); setError('') }}>
                      Registrate gratis
                    </button>
                  </div>
                </div>

                {/* DORSO — REGISTER */}
                <div className="flip-face back">
                  {enviado ? (
                    <div className="exito">
                      <span className="exito-icon">📬</span>
                      <div className="exito-title">Revisá tu email</div>
                      <p className="exito-sub">
                        Te enviamos un link a{' '}
                        <span className="exito-email">{regEmail}</span>.
                        Hacé click para activar tu cuenta.
                      </p>
                      <div className="exito-hint">
                        ¿No lo encontrás? Revisá la carpeta de spam o no deseados.
                      </div>
                      <button className="exito-back"
                        onClick={() => { setFlipped(false); setEnviado(false) }}>
                        ← Volver al login
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="form-title">Empezá gratis</div>
                      <div className="form-trial">
                        <div className="form-trial-dot"/>
                        <span><strong>7 días gratis</strong> · Después ARS $9.900/mes · Cancelás cuando querés</span>
                      </div>
                      <form onSubmit={handleRegister}>
                        <div className="form-field">
                          <label className="form-label">Tu nombre</label>
                          <input className="form-input" type="text" value={nombre}
                            onChange={e => setNombre(e.target.value)} required placeholder="Ej: Priscila"/>
                        </div>
                        <div className="form-field">
                          <label className="form-label">Email</label>
                          <input className="form-input" type="email" value={regEmail}
                            onChange={e => setRegEmail(e.target.value)} required placeholder="tu@email.com"/>
                        </div>
                        <div className="form-field">
                          <label className="form-label">Contraseña</label>
                          <input className="form-input" type="password" value={regPassword}
                            onChange={e => setRegPassword(e.target.value)}
                            required minLength={6} placeholder="Mínimo 6 caracteres"/>
                        </div>
                        {regError && <div className="form-error">{regError}</div>}
                        <button type="submit" className="form-btn" disabled={regLoading}>
                          {regLoading ? 'Creando cuenta...' : 'Crear cuenta gratis →'}
                        </button>
                      </form>
                      <div className="form-divider">o</div>
                      <div className="form-switch">
                        ¿Ya tenés cuenta?{' '}
                        <button className="form-switch-link"
                          onClick={() => { setFlipped(false); setRegError('') }}>
                          Iniciá sesión
                        </button>
                      </div>
                    </>
                  )}
                </div>

              </div>
            </div>

          </div>
        </div>

      </div>
    </>
  )
}