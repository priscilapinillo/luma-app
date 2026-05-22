'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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
    if (data.user) await supabase.from('subscriptions').insert({ user_id: data.user.id, status: 'trial' })
    setEnviado(true)
    setRegLoading(false)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Cinzel:wght@400;500;600&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html, body, #__next {
          height: 100%;
          width: 100%;
          overflow: hidden;
        }

        .scene {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(ellipse at 40% 30%, #2a1f5e 0%, #13111f 50%, #0a0812 100%);
          font-family: 'Cormorant Garamond', Georgia, serif;
          overflow: hidden;
        }

        /* FONDO */
        .starfield { position: absolute; inset: 0; pointer-events: none; }
        .star {
          position: absolute; border-radius: 50%;
          background: #fff;
          width: var(--sz); height: var(--sz);
          opacity: var(--op);
          animation: twinkle var(--d) var(--dl) ease-in-out infinite alternate;
        }
        @keyframes twinkle { to { opacity: 0.05; } }

        .nebula {
          position: absolute; border-radius: 50%;
          filter: blur(70px); pointer-events: none;
        }
        .nb1 { width: 600px; height: 600px; top: -150px; left: -150px; background: radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%); }
        .nb2 { width: 500px; height: 500px; bottom: -100px; right: -100px; background: radial-gradient(circle, rgba(167,139,250,0.10) 0%, transparent 70%); }
        .nb3 { width: 350px; height: 350px; top: 40%; left: 45%; transform: translate(-50%,-50%); background: radial-gradient(circle, rgba(201,168,76,0.05) 0%, transparent 70%); }

        /* CARTA */
        .carta-wrap {
          width: 370px;
          height: 630px;
          perspective: 1400px;
          position: relative;
          z-index: 1;
        }

        .carta-inner {
          width: 100%; height: 100%;
          position: relative;
          transform-style: preserve-3d;
          transition: transform 0.85s cubic-bezier(0.4, 0, 0.2, 1);
          filter: drop-shadow(0 30px 70px rgba(0,0,0,0.8)) drop-shadow(0 0 50px rgba(139,92,246,0.2));
        }
        .carta-inner.flipped { transform: rotateY(180deg); }

        .carta-face {
          position: absolute; inset: 0;
          backface-visibility: hidden;
          border-radius: 22px;
          overflow: hidden;
        }

        /* FRENTE — LOGIN — CLARO */
        .carta-frente {
          background: linear-gradient(150deg, #f0eeff 0%, #e8e0ff 40%, #ede8ff 70%, #f5f0ff 100%);
        }

        /* DORSO — REGISTER — OSCURO */
        .carta-dorso {
          transform: rotateY(180deg);
          background: linear-gradient(150deg, #1e1b30 0%, #13111f 40%, #1a1728 70%, #0f0d1a 100%);
        }

        /* SVG MARCO */
        .carta-svg {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          pointer-events: none; z-index: 0;
        }

        /* CONTENIDO */
        .carta-body {
          position: absolute;
          inset: 68px 28px 60px;
          display: flex; flex-direction: column;
          z-index: 1;
        }

        /* HEADER */
        .ch { text-align: center; margin-bottom: 10px; }
        .ch-roman {
          font-family: 'Cinzel', serif;
          font-size: 7.5px; letter-spacing: 5px;
          text-transform: uppercase; display: block; margin-bottom: 7px;
        }
        .frente .ch-roman { color: rgba(109,40,217,0.45); }
        .dorso .ch-roman { color: rgba(201,168,76,0.45); }

        .ch-logo {
          font-family: 'Cinzel Decorative', serif;
          font-size: 28px; font-weight: 400;
          letter-spacing: 5px; display: block; line-height: 1;
        }
        .frente .ch-logo { color: #5b21b6; }
        .dorso .ch-logo { color: #ede8ff; }

        .ch-tag {
          font-family: 'Cinzel', serif;
          font-size: 7px; letter-spacing: 3px;
          text-transform: uppercase; display: block; margin-top: 5px;
        }
        .frente .ch-tag { color: rgba(109,40,217,0.3); }
        .dorso .ch-tag { color: rgba(201,168,76,0.3); }

        /* DIVISOR */
        .cdiv {
          display: flex; align-items: center; gap: 6px;
          margin: 8px 0 12px; font-size: 8px;
        }
        .cdiv::before, .cdiv::after { content: ''; flex: 1; height: 0.5px; }
        .frente .cdiv { color: rgba(109,40,217,0.35); }
        .frente .cdiv::before, .frente .cdiv::after { background: linear-gradient(90deg,transparent,rgba(109,40,217,0.25),transparent); }
        .dorso .cdiv { color: rgba(201,168,76,0.35); }
        .dorso .cdiv::before, .dorso .cdiv::after { background: linear-gradient(90deg,transparent,rgba(201,168,76,0.25),transparent); }

        /* FORM */
        .cf { flex: 1; display: flex; flex-direction: column; }
        .cf-title {
          font-family: 'Cinzel', serif;
          font-size: 15px; font-weight: 500; margin-bottom: 3px;
        }
        .frente .cf-title { color: #3b0764; }
        .dorso .cf-title { color: #ede8ff; }

        .cf-sub {
          font-size: 13px; font-style: italic;
          margin-bottom: 12px; line-height: 1.5;
        }
        .frente .cf-sub { color: rgba(91,33,182,0.5); }
        .dorso .cf-sub { color: rgba(237,232,255,0.4); }

        .cf-field { margin-bottom: 9px; }
        .cf-label {
          font-family: 'Cinzel', serif;
          font-size: 7px; letter-spacing: 3px;
          text-transform: uppercase; display: block; margin-bottom: 5px;
        }
        .frente .cf-label { color: rgba(109,40,217,0.55); }
        .dorso .cf-label { color: rgba(201,168,76,0.5); }

        .cf-input {
          width: 100%; padding: 9px 12px;
          border-radius: 9px; font-size: 13px;
          font-family: 'Cormorant Garamond', serif;
          outline: none; transition: all 0.25s;
        }
        .frente .cf-input {
          background: rgba(139,92,246,0.07);
          border: 1px solid rgba(139,92,246,0.2);
          color: #3b0764;
        }
        .frente .cf-input::placeholder { color: rgba(109,40,217,0.25); }
        .frente .cf-input:focus {
          background: rgba(139,92,246,0.12);
          border-color: rgba(139,92,246,0.45);
          box-shadow: 0 0 0 3px rgba(139,92,246,0.08);
        }
        .dorso .cf-input {
          background: rgba(237,232,255,0.05);
          border: 1px solid rgba(237,232,255,0.12);
          color: #ede8ff;
        }
        .dorso .cf-input::placeholder { color: rgba(237,232,255,0.2); }
        .dorso .cf-input:focus {
          background: rgba(237,232,255,0.09);
          border-color: rgba(167,139,250,0.4);
          box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
        }

        .cf-input-wrap { position: relative; }
        .cf-input-wrap .cf-input { padding-right: 38px; }
        .cf-eye {
          position: absolute; right: 11px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          font-size: 11px; padding: 0; line-height: 1;
        }
        .frente .cf-eye { color: rgba(109,40,217,0.35); }
        .dorso .cf-eye { color: rgba(237,232,255,0.3); }

        .cf-error {
          font-size: 11px; padding: 7px 10px;
          border-radius: 7px; margin-bottom: 8px;
          font-family: 'Cinzel', serif; letter-spacing: 0.3px;
        }
        .frente .cf-error { color: #7c2d12; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); }
        .dorso .cf-error { color: #fca5a5; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); }

        .cf-btn {
          width: 100%; padding: 11px;
          border-radius: 11px; border: none;
          font-family: 'Cinzel', serif;
          font-size: 9px; font-weight: 600;
          letter-spacing: 4px; text-transform: uppercase;
          cursor: pointer; transition: all 0.25s; margin-top: 6px;
        }
        .frente .cf-btn {
          background: linear-gradient(135deg, #7c3aed, #8b5cf6, #a78bfa);
          color: #fff;
          box-shadow: 0 4px 24px rgba(139,92,246,0.4);
          border: 1px solid rgba(167,139,250,0.3);
        }
        .frente .cf-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 32px rgba(139,92,246,0.55);
        }
        .dorso .cf-btn {
          background: linear-gradient(135deg, #5b21b6, #7c3aed, #8b5cf6);
          color: #ede8ff;
          box-shadow: 0 4px 24px rgba(139,92,246,0.35);
          border: 1px solid rgba(201,168,76,0.2);
        }
        .dorso .cf-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 32px rgba(139,92,246,0.5);
        }
        .cf-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .cf-flip {
          text-align: center; margin-top: 10px;
          font-size: 12px; font-style: italic;
        }
        .frente .cf-flip { color: rgba(91,33,182,0.5); }
        .dorso .cf-flip { color: rgba(237,232,255,0.35); }
        .cf-flip-link {
          cursor: pointer; font-weight: 500; font-style: normal;
          text-decoration: underline; text-underline-offset: 2px;
          transition: color 0.2s;
        }
        .frente .cf-flip-link { color: #7c3aed; }
        .frente .cf-flip-link:hover { color: #5b21b6; }
        .dorso .cf-flip-link { color: #c9a84c; }
        .dorso .cf-flip-link:hover { color: #e8d5a3; }

        /* ÉXITO */
        .cf-exito {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          text-align: center; gap: 10px;
        }
        .cf-exito-icon { font-size: 38px; }
        .cf-exito-title { font-family: 'Cinzel', serif; font-size: 17px; font-weight: 500; color: #ede8ff; }
        .cf-exito-sub { font-size: 13px; font-style: italic; color: rgba(237,232,255,0.5); line-height: 1.6; }
        .cf-exito-email { color: #c9a84c; font-style: normal; }
        .cf-exito-hint {
          font-size: 11px; line-height: 1.6; padding: 9px 12px;
          border-radius: 8px; color: rgba(201,168,76,0.5);
          background: rgba(201,168,76,0.05); border: 1px solid rgba(201,168,76,0.12);
        }
        .cf-exito-btn {
          padding: 9px 22px; background: transparent;
          border: 1px solid rgba(201,168,76,0.3); color: #c9a84c;
          border-radius: 20px; font-family: 'Cinzel', serif;
          font-size: 8px; letter-spacing: 3px; text-transform: uppercase;
          cursor: pointer; transition: all 0.25s;
        }
        .cf-exito-btn:hover { background: rgba(201,168,76,0.08); color: #e8d5a3; }

        /* NÚMERO INFERIOR */
        .cn {
          position: absolute; bottom: 14px; left: 0; right: 0;
          text-align: center; font-family: 'Cinzel', serif;
          font-size: 7px; letter-spacing: 5px; text-transform: uppercase; z-index: 1;
        }
        .frente .cn { color: rgba(109,40,217,0.25); }
        .dorso .cn { color: rgba(201,168,76,0.2); }

        @media (max-width: 420px) {
          .carta-wrap { width: 330px; height: 590px; }
          .carta-body { inset: 60px 22px 52px; }
        }
      `}</style>

      {/* FONDO */}
      <div className="starfield">
        <div className="nebula nb1" /><div className="nebula nb2" /><div className="nebula nb3" />
        {Array.from({length: 55}).map((_,i) => (
          <div key={i} className="star" style={{
            left:`${Math.random()*100}%`, top:`${Math.random()*100}%`,
            '--sz':`${Math.random()*1.8+0.4}px`,
            '--op': Math.random()*0.35+0.08,
            '--d':`${Math.random()*4+2}s`,
            '--dl':`${Math.random()*6}s`,
          } as any}/>
        ))}
      </div>

      {/* CARTA */}
      <div className="carta-wrap">
        <div className={`carta-inner${flipped?' flipped':''}`}>

          {/* ── FRENTE — LOGIN — CLARO ── */}
          <div className="carta-face carta-frente frente">

            {/* Marco SVG violeta */}
            <svg className="carta-svg" viewBox="0 0 370 630" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="366" height="626" rx="20" fill="none" stroke="rgba(139,92,246,0.3)" strokeWidth="1"/>
              <rect x="7" y="7" width="356" height="616" rx="16" fill="none" stroke="rgba(139,92,246,0.12)" strokeWidth="0.5"/>
              {/* Arco superior */}
              <path d="M 55 78 Q 185 15 315 78" fill="none" stroke="rgba(139,92,246,0.2)" strokeWidth="0.8"/>
              <path d="M 75 88 Q 185 35 295 88" fill="none" stroke="rgba(139,92,246,0.1)" strokeWidth="0.5"/>
              {/* Luna */}
              <path d="M 172 20 Q 185 14 198 20 Q 190 28 180 28 Q 170 28 172 20Z" fill="rgba(139,92,246,0.35)"/>
              {/* Estrellas */}
              <text x="32" y="44" fontSize="11" fill="rgba(139,92,246,0.25)" textAnchor="middle">✦</text>
              <text x="338" y="44" fontSize="11" fill="rgba(139,92,246,0.25)" textAnchor="middle">✦</text>
              <text x="185" y="46" fontSize="8" fill="rgba(139,92,246,0.2)" textAnchor="middle">· · ·</text>
              {/* Líneas laterales */}
              <line x1="16" y1="105" x2="16" y2="525" stroke="rgba(139,92,246,0.1)" strokeWidth="0.5"/>
              <line x1="354" y1="105" x2="354" y2="525" stroke="rgba(139,92,246,0.1)" strokeWidth="0.5"/>
              {/* Rombos */}
              <rect x="12" y="205" width="8" height="8" fill="rgba(139,92,246,0.2)" transform="rotate(45 16 209)"/>
              <rect x="350" y="205" width="8" height="8" fill="rgba(139,92,246,0.2)" transform="rotate(45 354 209)"/>
              <rect x="12" y="315" width="8" height="8" fill="rgba(139,92,246,0.2)" transform="rotate(45 16 319)"/>
              <rect x="350" y="315" width="8" height="8" fill="rgba(139,92,246,0.2)" transform="rotate(45 354 319)"/>
              {/* Arco inferior */}
              <path d="M 55 555 Q 185 615 315 555" fill="none" stroke="rgba(139,92,246,0.2)" strokeWidth="0.8"/>
              <path d="M 75 545 Q 185 595 295 545" fill="none" stroke="rgba(139,92,246,0.1)" strokeWidth="0.5"/>
              {/* Esquinas */}
              <path d="M 18 18 L 48 18 M 18 18 L 18 48" stroke="rgba(139,92,246,0.4)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              <path d="M 352 18 L 322 18 M 352 18 L 352 48" stroke="rgba(139,92,246,0.4)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              <path d="M 18 612 L 48 612 M 18 612 L 18 582" stroke="rgba(139,92,246,0.4)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              <path d="M 352 612 L 322 612 M 352 612 L 352 582" stroke="rgba(139,92,246,0.4)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              {/* Banda inferior */}
              <rect x="2" y="584" width="366" height="44" fill="rgba(139,92,246,0.06)"/>
              <line x1="2" y1="584" x2="368" y2="584" stroke="rgba(139,92,246,0.2)" strokeWidth="0.5"/>
              <text x="32" y="612" fontSize="9" fill="rgba(139,92,246,0.2)" textAnchor="middle">✦</text>
              <text x="338" y="612" fontSize="9" fill="rgba(139,92,246,0.2)" textAnchor="middle">✦</text>
            </svg>

            <div className="carta-body">
              <div className="ch">
                <span className="ch-roman">✦ La Luna · XVIII ✦</span>
                <span className="ch-logo">Luma</span>
                <span className="ch-tag">tu práctica, en orden</span>
              </div>
              <div className="cdiv">— ✧ —</div>
              <div className="cf">
                <div className="cf-title">Iniciá sesión</div>
                <div className="cf-sub">Accedé a tu espacio y retomá donde lo dejaste.</div>
                <form onSubmit={handleLogin}>
                  <div className="cf-field">
                    <label className="cf-label">Email</label>
                    <input className="cf-input" type="email" value={email}
                      onChange={e=>setEmail(e.target.value)} required placeholder="tu@email.com"/>
                  </div>
                  <div className="cf-field">
                    <label className="cf-label">Contraseña</label>
                    <div className="cf-input-wrap">
                      <input className="cf-input" type={showPassword?'text':'password'}
                        value={password} onChange={e=>setPassword(e.target.value)}
                        required placeholder="••••••••"/>
                      <button type="button" className="cf-eye"
                        onClick={()=>setShowPassword(!showPassword)}>
                        {showPassword?'○':'●'}
                      </button>
                    </div>
                  </div>
                  {error && <div className="cf-error">{error}</div>}
                  <button type="submit" className="cf-btn" disabled={loading}>
                    {loading?'Ingresando...':'✦ Ingresar'}
                  </button>
                </form>
                <div className="cf-flip">
                  ¿No tenés cuenta?{' '}
                  <span className="cf-flip-link" onClick={()=>{setFlipped(true);setError('')}}>
                    Registrate gratis
                  </span>
                </div>
              </div>
            </div>
            <div className="cn">Luma · I</div>
          </div>

          {/* ── DORSO — REGISTER — OSCURO ── */}
          <div className="carta-face carta-dorso dorso">

            {/* Marco SVG dorado */}
            <svg className="carta-svg" viewBox="0 0 370 630" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="366" height="626" rx="20" fill="none" stroke="rgba(201,168,76,0.3)" strokeWidth="1"/>
              <rect x="7" y="7" width="356" height="616" rx="16" fill="none" stroke="rgba(201,168,76,0.12)" strokeWidth="0.5"/>
              <path d="M 55 78 Q 185 15 315 78" fill="none" stroke="rgba(201,168,76,0.18)" strokeWidth="0.8"/>
              <path d="M 75 88 Q 185 35 295 88" fill="none" stroke="rgba(201,168,76,0.09)" strokeWidth="0.5"/>
              <path d="M 172 20 Q 185 14 198 20 Q 190 28 180 28 Q 170 28 172 20Z" fill="rgba(201,168,76,0.3)"/>
              <text x="32" y="44" fontSize="11" fill="rgba(201,168,76,0.22)" textAnchor="middle">✦</text>
              <text x="338" y="44" fontSize="11" fill="rgba(201,168,76,0.22)" textAnchor="middle">✦</text>
              <text x="185" y="46" fontSize="8" fill="rgba(201,168,76,0.18)" textAnchor="middle">· · ·</text>
              <line x1="16" y1="105" x2="16" y2="525" stroke="rgba(201,168,76,0.08)" strokeWidth="0.5"/>
              <line x1="354" y1="105" x2="354" y2="525" stroke="rgba(201,168,76,0.08)" strokeWidth="0.5"/>
              <rect x="12" y="205" width="8" height="8" fill="rgba(201,168,76,0.18)" transform="rotate(45 16 209)"/>
              <rect x="350" y="205" width="8" height="8" fill="rgba(201,168,76,0.18)" transform="rotate(45 354 209)"/>
              <rect x="12" y="315" width="8" height="8" fill="rgba(201,168,76,0.18)" transform="rotate(45 16 319)"/>
              <rect x="350" y="315" width="8" height="8" fill="rgba(201,168,76,0.18)" transform="rotate(45 354 319)"/>
              <path d="M 55 555 Q 185 615 315 555" fill="none" stroke="rgba(201,168,76,0.18)" strokeWidth="0.8"/>
              <path d="M 75 545 Q 185 595 295 545" fill="none" stroke="rgba(201,168,76,0.09)" strokeWidth="0.5"/>
              <path d="M 18 18 L 48 18 M 18 18 L 18 48" stroke="rgba(201,168,76,0.35)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              <path d="M 352 18 L 322 18 M 352 18 L 352 48" stroke="rgba(201,168,76,0.35)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              <path d="M 18 612 L 48 612 M 18 612 L 18 582" stroke="rgba(201,168,76,0.35)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              <path d="M 352 612 L 322 612 M 352 612 L 352 582" stroke="rgba(201,168,76,0.35)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              <rect x="2" y="584" width="366" height="44" fill="rgba(201,168,76,0.04)"/>
              <line x1="2" y1="584" x2="368" y2="584" stroke="rgba(201,168,76,0.18)" strokeWidth="0.5"/>
              <text x="32" y="612" fontSize="9" fill="rgba(201,168,76,0.18)" textAnchor="middle">✦</text>
              <text x="338" y="612" fontSize="9" fill="rgba(201,168,76,0.18)" textAnchor="middle">✦</text>
            </svg>

            <div className="carta-body">
              <div className="ch">
                <span className="ch-roman">✦ La Luna · XVIII ✦</span>
                <span className="ch-logo">Luma</span>
                <span className="ch-tag">tu práctica, en orden</span>
              </div>
              <div className="cdiv">— ✧ —</div>
              {enviado ? (
                <div className="cf-exito">
                  <div className="cf-exito-icon">📬</div>
                  <div className="cf-exito-title">Revisá tu email</div>
                  <div className="cf-exito-sub">
                    Te enviamos un link a <span className="cf-exito-email">{regEmail}</span>
                  </div>
                  <div className="cf-exito-hint">¿No lo encontrás? Revisá la carpeta de spam.</div>
                  <button className="cf-exito-btn" onClick={()=>{setFlipped(false);setEnviado(false)}}>
                    Volver al login
                  </button>
                </div>
              ) : (
                <div className="cf">
                  <div className="cf-title">Empezá gratis</div>
                  <div className="cf-sub">7 días para explorar todo. Sin tarjeta.</div>
                  <form onSubmit={handleRegister}>
                    <div className="cf-field">
                      <label className="cf-label">Tu nombre</label>
                      <input className="cf-input" type="text" value={nombre}
                        onChange={e=>setNombre(e.target.value)} required placeholder="Ej: Florencia"/>
                    </div>
                    <div className="cf-field">
                      <label className="cf-label">Email</label>
                      <input className="cf-input" type="email" value={regEmail}
                        onChange={e=>setRegEmail(e.target.value)} required placeholder="tu@email.com"/>
                    </div>
                    <div className="cf-field">
                      <label className="cf-label">Contraseña</label>
                      <input className="cf-input" type="password" value={regPassword}
                        onChange={e=>setRegPassword(e.target.value)} required
                        minLength={6} placeholder="Mínimo 6 caracteres"/>
                    </div>
                    {regError && <div className="cf-error">{regError}</div>}
                    <button type="submit" className="cf-btn" disabled={regLoading}>
                      {regLoading?'Creando cuenta...':'✦ Crear cuenta'}
                    </button>
                  </form>
                  <div className="cf-flip">
                    ¿Ya tenés cuenta?{' '}
                    <span className="cf-flip-link" onClick={()=>{setFlipped(false);setRegError('')}}>
                      Iniciá sesión
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="cn">Luma · II</div>
          </div>

        </div>
      </div>
    </>
  )
}