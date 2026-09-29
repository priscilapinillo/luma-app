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

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif',padding:'20px'}}>
      <form onSubmit={handleLogin} style={{width:'100%',maxWidth:'360px',display:'flex',flexDirection:'column',gap:'12px'}}>
        <h1 style={{fontSize:'22px',fontWeight:700,marginBottom:'4px'}}>Iniciar sesión</h1>
        {error && <div style={{background:'#FEF2F2',color:'#DC2626',padding:'10px 14px',borderRadius:'8px',fontSize:'13px'}}>{error}</div>}
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
          style={{padding:'12px',borderRadius:'10px',border:'1px solid #ddd'}}/>
        <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required
          style={{padding:'12px',borderRadius:'10px',border:'1px solid #ddd'}}/>
        <button type="submit" disabled={loading}
          style={{padding:'12px',borderRadius:'10px',border:'none',background:'#8B5CF6',color:'white',fontWeight:700,cursor:'pointer'}}>
          {loading ? 'Entrando...' : 'Iniciar sesión'}
        </button>
        <a href="/links/registro" style={{fontSize:'13px',textAlign:'center',color:'#8B5CF6'}}>Crear cuenta</a>
      </form>
    </div>
  )
}