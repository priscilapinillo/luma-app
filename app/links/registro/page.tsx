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
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif',padding:'20px'}}>
      <form onSubmit={handleRegister} style={{width:'100%',maxWidth:'360px',display:'flex',flexDirection:'column',gap:'12px'}}>
        <h1 style={{fontSize:'22px',fontWeight:700,marginBottom:'4px'}}>Creá tu Luma Links</h1>
        <p style={{fontSize:'13px',color:'#666',marginBottom:'8px'}}>Tu página de links gratis, para siempre.</p>
        {error && <div style={{background:'#FEF2F2',color:'#DC2626',padding:'10px 14px',borderRadius:'8px',fontSize:'13px'}}>{error}</div>}
        <input placeholder="Tu nombre" value={nombre} onChange={e => setNombre(e.target.value)} required
          style={{padding:'12px',borderRadius:'10px',border:'1px solid #ddd'}}/>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
          style={{padding:'12px',borderRadius:'10px',border:'1px solid #ddd'}}/>
        <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
          style={{padding:'12px',borderRadius:'10px',border:'1px solid #ddd'}}/>
        <button type="submit" disabled={loading}
          style={{padding:'12px',borderRadius:'10px',border:'none',background:'#8B5CF6',color:'white',fontWeight:700,cursor:'pointer'}}>
          {loading ? 'Creando...' : 'Crear mi Luma Links'}
        </button>
        <a href="/links/login" style={{fontSize:'13px',textAlign:'center',color:'#8B5CF6'}}>Ya tengo cuenta</a>
      </form>
    </div>
  )
}