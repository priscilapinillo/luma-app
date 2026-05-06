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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        .auth-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #F4F2FF; font-family: 'Inter', sans-serif; padding: 24px; }
        .auth-card { display: grid; grid-template-columns: 380px 1fr; width: 100%; max-width: 860px; border-radius: 24px; overflow: hidden; box-shadow: 0 24px 80px rgba(100,60,200,0.15); }
        .auth-left { background: linear-gradient(160deg, #A78BFA 0%, #7C3AED 40%, #4C1D95 100%); padding: 48px 40px; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; }
        .auth-left::before { content: ''; position: absolute; top: -80px; right: -80px; width: 260px; height: 260px; border-radius: 50%; background: rgba(255,255,255,0.08); }
        .auth-left::after { content: ''; position: absolute; bottom: -60px; left: -60px; width: 200px; height: 200px; border-radius: 50%; background: rgba(255,255,255,0.06); }
        .auth-left-logo { font-size: 28px; font-weight: 700; color: white; letter-spacing: -0.5px; position: relative; z-index: 1; }
        .auth-left-bottom { position: relative; z-index: 1; }
        .auth-left-tag { font-size: 12px; color: rgba(255,255,255,0.6); margin-bottom: 12px; letter-spacing: 0.5px; }
        .auth-left-title { font-size: 26px; font-weight: 600; color: white; line-height: 1.3; letter-spacing: -0.5px; }
        .auth-left-title em { font-style: italic; color: #DDD6FE; }
        .auth-right { background: white; padding: 48px 44px; display: flex; flex-direction: column; justify-content: center; }
        .auth-right-label { font-size: 12px; color: #A78BFA; font-weight: 500; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; }
        .auth-right h1 { font-size: 28px; font-weight: 600; color: #1A1035; margin-bottom: 8px; letter-spacing: -0.5px; }
        .auth-right-sub { font-size: 14px; color: #9B8EC4; margin-bottom: 36px; line-height: 1.5; }
        .auth-field { margin-bottom: 20px; }
        .auth-label { font-size: 13px; font-weight: 500; color: #1A1035; display: block; margin-bottom: 8px; }
        .auth-input { width: 100%; padding: 12px 16px; border-radius: 10px; border: 1.5px solid #EDE9FF; font-size: 14px; color: #1A1035; outline: none; transition: border-color 0.2s; font-family: 'Inter', sans-serif; box-sizing: border-box; background: #FAFAFF; }
        .auth-input:focus { border-color: #8B5CF6; background: white; }
        .auth-input-wrap { position: relative; }
        .auth-input-wrap .auth-input { padding-right: 44px; }
        .auth-eye { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #9B8EC4; font-size: 16px; padding: 0; }
        .auth-error { font-size: 13px; color: #EF4444; margin-bottom: 16px; padding: 10px 14px; background: #FEF2F2; border-radius: 8px; border: 1px solid #FECACA; }
        .auth-btn { width: 100%; padding: 13px; background: linear-gradient(135deg, #7C3AED, #A78BFA); color: white; border: none; border-radius: 10px; font-size: 15px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif; box-shadow: 0 4px 14px rgba(124,58,237,0.35); transition: opacity 0.2s; }
        .auth-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .auth-footer { text-align: center; margin-top: 24px; font-size: 13px; color: #9B8EC4; }
        .auth-footer a { color: #7C3AED; font-weight: 500; text-decoration: none; }
      `}</style>

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