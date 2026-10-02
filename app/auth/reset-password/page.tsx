'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
    if (password.length < 6) { setError('Mínimo 6 caracteres'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError('No se pudo actualizar la contraseña. Intentá de nuevo.')
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

  return (
    <>
      <style>{`
        
        *{box-sizing:border-box;margin:0;padding:0}
        html,body{height:100%;font-family:'Geist',sans-serif}
        .wrap{
          min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;
          background-image:
            linear-gradient(160deg,rgba(30,27,46,0.85),rgba(13,11,20,0.92)),
            url('/landing/hero-bgg.png');
          background-size:cover;background-position:center;
        }
        .card{width:100%;max-width:400px;background:#F9F6F0;border-radius:20px;padding:36px 32px;box-shadow:0 30px 70px rgba(0,0,0,0.4)}
        .logo{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:600;color:#1E1B2E;margin-bottom:4px}
        .logo span{color:#8B5CF6}
        .title{font-size:22px;font-weight:800;color:#0A0A0A;letter-spacing:-0.5px;margin:24px 0 6px}
        .sub{font-size:14px;color:#737373;margin-bottom:24px;line-height:1.5}
        .form-input{width:100%;padding:12px 14px;border-radius:10px;border:1.5px solid #E5E5E5;font-size:14px;color:#0A0A0A;outline:none;transition:all 0.2s;font-family:'Geist',sans-serif;background:white;margin-bottom:12px;display:block}
        .form-input:focus{border-color:#8B5CF6;box-shadow:0 0 0 3px rgba(139,92,246,0.1)}
        .form-btn{width:100%;padding:13px;background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:white;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:'Geist',sans-serif;transition:all 0.2s;margin-top:4px;box-shadow:0 8px 24px rgba(139,92,246,0.35)}
        .form-btn:hover{transform:translateY(-1px)}
        .form-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none}
        .form-error{font-size:12px;color:#DC2626;margin-bottom:12px;padding:10px 12px;background:#FEF2F2;border-radius:8px;border:1px solid #FECACA}
        .notice{font-size:13px;color:#7C6BAA;padding:12px;background:#EDE8FF;border-radius:8px;margin-bottom:20px;line-height:1.5}
      `}</style>
      <div className="wrap">
        <div className="card">
          <div className="logo">Luma<span>.</span></div>
          {listo ? (
            <div style={{textAlign:'center',padding:'20px 0'}}>
              <div style={{fontSize:'48px',marginBottom:'16px'}}>✓</div>
              <div style={{fontSize:'20px',fontWeight:700,color:'#0A0A0A',marginBottom:'8px'}}>¡Contraseña actualizada!</div>
              <div style={{fontSize:'14px',color:'#737373'}}>Te estamos llevando a tu cuenta...</div>
            </div>
          ) : (<>
            <div className="title">Nueva contraseña</div>
            <p className="sub">Ingresá tu nueva contraseña para acceder a Luma.</p>
            {!sessionReady && !error && (
              <div className="notice">⏳ Verificando tu identidad...</div>
            )}
            {error && <div className="form-error">{error}</div>}
            {(sessionReady || error) && !error && (
              <form onSubmit={handleReset}>
                <input className="form-input" type="password" placeholder="Nueva contraseña"
                  value={password} onChange={e => setPassword(e.target.value)} required minLength={6}/>
                <input className="form-input" type="password" placeholder="Confirmar contraseña"
                  value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={6}/>
                <button type="submit" className="form-btn" disabled={loading}>
                  {loading ? 'Actualizando...' : 'Actualizar contraseña →'}
                </button>
              </form>
            )}
            {error && (
              <button onClick={() => router.push('/auth/login')}
                style={{width:'100%',padding:'11px',marginTop:'12px',background:'transparent',border:'1.5px solid #E5E5E5',borderRadius:'10px',fontSize:'13px',cursor:'pointer',fontFamily:'Geist,sans-serif',color:'#737373'}}>
                ← Volver al login
              </button>
            )}
          </>)}
        </div>
      </div>
    </>
  )
}