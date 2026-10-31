'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { tieneAccesoLumaActivo } from '@/lib/accesoLinks'
import MetaPixel from '@/components/MetaPixel'
import { eventoMeta } from '@/lib/metaPixel'
import { leerOrigen } from '@/lib/origen'
import TelefonoLuma, { ESTILOS_TELEFONO } from '@/components/landing/TelefonoLuma'
import { ESTILOS_ACCESO } from '@/components/landing/estilosAcceso'


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
        options: { data: { full_name: nombre, ...(leerOrigen() ? { origen: leerOrigen() } : {}) } },
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
        setError('Ya tenés Luma activo con este email. Entrá desde "Iniciar sesión → Soy terapeuta": no se pueden tener Luma y Luma Links a la vez.')
        return
      }

      // sin tildes ni símbolos (Lúna Tarot → luna-tarot); si no queda nada, un nombre genérico
      const slugBase = nombre.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'mi-pagina'
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

      eventoMeta('CompleteRegistration', { content_name: 'Luma Links' })
      router.push('/links/dashboard')
    } catch (err) {
      console.error(err)
      setError('Error inesperado. Intentá de nuevo.')
    } finally {
      setLoading(false)
      registrandoRef.current = false
    }
  }

  const fuerza = password.length === 0 ? 0 : password.length < 6 ? 1 : (password.length >= 10 || (/\d/.test(password) && /[a-zA-Z]/.test(password))) ? 3 : 2

  return (
    <div className="au links">
      <MetaPixel/>
      <style>{ESTILOS_TELEFONO + ESTILOS_ACCESO + `.au-tabs a{color:#6E7388 !important;transition:all .25s}.au-tabs a.on{background:#27344A;color:#F0E6D8 !important;box-shadow:0 8px 18px rgba(39,52,74,.25)}`}</style>
      <aside className="au-lado" aria-hidden="true">
        <span className="au-estrella au-titila" style={{ top: 110, right: 90, fontSize: 16, color: '#A65A6E' }}>✦</span>
        <span className="au-estrella au-titila" style={{ bottom: 170, left: 54, fontSize: 12, color: '#626B91', animationDelay: '.8s' }}>✦</span>
        <a href="/" className="au-logo" tabIndex={-1}>Luma<span>.</span><small>LINKS</small></a>
        <h2 className="au-frase">Link en bio <em>gratis</em> para tarotistas, terapeutas y astrólogas.</h2>
        <p className="au-frase2"><span className="au-subraya">La armás en dos minutos.</span></p>
        <div className="au-vis"><div className="au-tel au-flotar"><div><TelefonoLuma pantalla="links" escala={0.8} /></div></div></div>
        <span className="au-lado-pie">Todos tus links en una página con la estética de tu trabajo</span>
      </aside>
      <main className="au-main">
        <div className="au-caja">
          <a href="/" className="au-logo-celu">Luma<span>.</span></a>
          <nav className="au-tabs" aria-label="Entrar o crear">
            <a href="/links/login" style={{ flex: 1, minHeight: 46, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontWeight: 800, fontSize: 14 }}>Entrar</a>
            <a href="/links/registro" className="on" aria-current="page" style={{ flex: 1, minHeight: 46, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontWeight: 800, fontSize: 14 }}>Crear gratis</a>
          </nav>
          <form className="au-form au-entra" onSubmit={handleRegister}>
            <div><h1 className="au-h1">Creá tu página</h1><p className="au-sub"><b>Gratis para siempre</b> · Sin tarjeta y sin vueltas.</p></div>
            <label className="au-campo">Tu nombre o el de tu marca
              <span className="au-in"><input autoComplete="name" placeholder="Ej: Luna Tarot" value={nombre} onChange={e => setNombre(e.target.value)} required/></span>
            </label>
            <label className="au-campo">Email
              <span className="au-in"><input type="email" autoComplete="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} required/></span>
            </label>
            <label className="au-campo">Contraseña
              <span className="au-in"><input type="password" autoComplete="new-password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}/></span>
            </label>
            {fuerza > 0 && (
              <div className="au-fuerza" aria-live="polite">
                {[1, 2, 3].map(n => <span key={n} className={fuerza >= n ? `f${fuerza}` : ''}/>)}
                <b className={`f${fuerza}`}>{['', 'Muy corta (mínimo 6)', 'Va bien', 'Fuerte'][fuerza]}</b>
              </div>
            )}
            {error && <div className="au-error" role="alert">{error}</div>}
            <button type="submit" className="au-btn" disabled={loading}>{loading ? <><i className="au-girar"/>Creando tu página…</> : 'Crear mi página gratis'}</button>
            <div className="au-pastillas">
              <span className="verde">Gratis para siempre</span>
              <span className="lavanda">Sin tarjeta</span>
              <span className="citrino">6 plantillas, claro y oscuro</span>
            </div>
            <div className="au-otros">
              <span>¿Ya tenés tu Luma Links? <a href="/links/login">Iniciá sesión</a></span>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
