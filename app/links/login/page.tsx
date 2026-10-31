'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { tieneAccesoLumaActivo } from '@/lib/accesoLinks'
import TelefonoLuma, { ESTILOS_TELEFONO } from '@/components/landing/TelefonoLuma'
import { ESTILOS_ACCESO } from '@/components/landing/estilosAcceso'

export default function LinksLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mailRecuperoEnviado, setMailRecuperoEnviado] = useState(false)
  const [ver, setVer] = useState(false)

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

        // si tiene Luma vigente (prueba o plan al día), su lugar es el panel de Luma
        if (await tieneAccesoLumaActivo(data.user.id)) {
          router.push('/dashboard')
          return
        }

        if (!perfil) {
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
    <div className="au links">
      <style>{ESTILOS_TELEFONO + ESTILOS_ACCESO + `.au-tabs a{color:#6E7388 !important;transition:all .25s}.au-tabs a.on{background:#27344A;color:#F0E6D8 !important;box-shadow:0 8px 18px rgba(39,52,74,.25)}`}</style>
      <aside className="au-lado" aria-hidden="true">
        <span className="au-estrella au-titila" style={{ top: 110, right: 90, fontSize: 16, color: '#A65A6E' }}>✦</span>
        <span className="au-estrella au-titila" style={{ bottom: 170, left: 54, fontSize: 12, color: '#626B91', animationDelay: '.8s' }}>✦</span>
        <a href="/" className="au-logo" tabIndex={-1}>Luma<span>.</span><small>LINKS</small></a>
        <h2 className="au-frase">Todo lo que hagas con <em>amor</em> estará bien hecho.</h2>
        <p className="au-frase2"><span className="au-subraya">Qué lindo verte de nuevo.</span></p>
        <div className="au-vis"><div className="au-tel au-flotar"><div><TelefonoLuma pantalla="links" escala={0.8} /></div></div></div>
        <span className="au-lado-pie">Tu página de links, con la estética de tu trabajo</span>
      </aside>
      <main className="au-main">
        <div className="au-caja">
          <a href="/" className="au-logo-celu">Luma<span>.</span></a>
          <nav className="au-tabs" aria-label="Entrar o crear">
            <a href="/links/login" className={"on"} aria-current={"page"} style={{ flex: 1, minHeight: 46, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontWeight: 800, fontSize: 14 }}>Entrar</a>
            <a href="/links/registro" className={""} aria-current={undefined} style={{ flex: 1, minHeight: 46, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontWeight: 800, fontSize: 14 }}>Crear gratis</a>
          </nav>
          <form className="au-form au-entra" onSubmit={handleLogin}>
            <div><h1 className="au-h1">Iniciá sesión</h1><p className="au-sub">Con el email de tu Luma Links.</p></div>
            <label className="au-campo">Email
              <span className="au-in"><input type="email" autoComplete="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} required/></span>
            </label>
            <label className="au-campo">Contraseña
              <span className="au-in"><input type={ver ? 'text' : 'password'} autoComplete="current-password" placeholder="Tu contraseña" value={password} onChange={e => setPassword(e.target.value)} required/>
                <button type="button" className="au-ojo" aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setVer(!ver)}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></button>
              </span>
            </label>
            <button type="button" className="au-link derecha" onClick={recuperarContrasena}>Olvidé mi contraseña</button>
            {error && <div className="au-error" role="alert">{error}</div>}
            {mailRecuperoEnviado && (
              <div className="au-aviso lavanda" role="status">Te mandamos un mail a <b>{email.trim()}</b> para elegir una contraseña nueva. Si no aparece, mirá en spam.</div>
            )}
            <button type="submit" className="au-btn" disabled={loading}>{loading ? <><i className="au-girar"/>Entrando…</> : 'Entrar'}</button>
            <div className="au-otros">
              <span>¿Todavía no tenés tu página? <a href="/links/registro">Creala gratis</a></span>
              <span>¿Sos terapeuta de Luma? <a href="/auth/login">Entrá acá</a></span>
              <span>¿Sos alumna? <a href="/aula">Entrá a tu aula</a></span>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
