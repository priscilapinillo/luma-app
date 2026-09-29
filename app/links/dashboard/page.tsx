'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { comprimirImagen } from '@/lib/comprimirImagen'
import { Plus, X, LogOut, ExternalLink } from 'lucide-react'

type Link = { tipo: string; titulo: string; url: string; imagen_url?: string }

type Promo = { activa: boolean; titulo: string; descripcion: string; texto_boton: string; url: string }

type Perfil = {
  id: string
  nombre: string
  profesion: string
  bio: string
  foto_url: string
  template: string
  slug: string
  links: Link[]
  promo: Promo
}

const TEMPLATES = [
  { id: 'luna', nombre: 'Luna', bg: '#0D0B14', color: '#C9A84C' },
  { id: 'aura', nombre: 'Aura', bg: '#F8F4FF', color: '#8B5CF6' },
  { id: 'tierra', nombre: 'Tierra', bg: '#FAF7F0', color: '#92400E' },
  { id: 'rosa', nombre: 'Rosa', bg: '#FFF0F6', color: '#BE185D' },
  { id: 'violeta', nombre: 'Violeta', bg: '#1E0A3C', color: '#C084FC' },
  { id: 'verde', nombre: 'Verde', bg: '#F0FDF4', color: '#065F46' },
]

const TIPOS_LINK = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'podcast', label: 'Podcast' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'email', label: 'Email' },
  { id: 'descargable', label: 'Descargable' },
  { id: 'tienda', label: 'Tienda' },
  { id: 'otro', label: 'Otro' },
]

const PROMO_VACIA: Promo = { activa: false, titulo: '', descripcion: '', texto_boton: '', url: '' }

export default function LinksDashboardPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [msgExito, setMsgExito] = useState('')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/links/login'); return }
    const { data } = await supabase.from('luma_links_profiles').select('*').eq('auth_user_id', user.id).maybeSingle()
    if (data) setPerfil({ ...data, links: data.links || [], promo: data.promo || PROMO_VACIA })
    setLoading(false)
  }

  async function guardar() {
    if (!perfil) return
    setGuardando(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Tu sesión expiró. Volvé a iniciar sesión para guardar los cambios.')
        router.push('/links/login')
        return
      }
      const { error, data } = await supabase.from('luma_links_profiles').update({
        nombre: perfil.nombre,
        profesion: perfil.profesion,
        bio: perfil.bio,
        foto_url: perfil.foto_url,
        template: perfil.template,
        links: perfil.links,
        promo: perfil.promo,
        updated_at: new Date().toISOString(),
      }).eq('id', perfil.id).select()
      if (error) { alert('Error al guardar: ' + error.message); return }
      if (!data || data.length === 0) {
        alert('No se pudo guardar tu perfil. Volvé a iniciar sesión e intentá de nuevo.')
        return
      }
      setMsgExito('Guardado ✓')
      setTimeout(() => setMsgExito(''), 2000)
    } finally { setGuardando(false) }
  }

  async function subirFoto(file: File) {
    if (!perfil) return
    setSubiendoFoto(true)
    try {
        const comprimida = await comprimirImagen(file, 1500)
      const supabase = createClient()
      const path = `${perfil.id}/${Date.now()}.jpg`
      await supabase.storage.from('links-photos').upload(path, comprimida, { upsert: true })
      const { data } = supabase.storage.from('links-photos').getPublicUrl(path)
      setPerfil({ ...perfil, foto_url: data.publicUrl })
    } catch (err: any) {
      alert(err?.message || 'No se pudo subir la foto.')
    } finally { setSubiendoFoto(false) }
  }

  async function subirImagenDescargable(i: number, file: File) {
    if (!perfil) return
    try {
      const comprimida = await comprimirImagen(file, 1500)
      const supabase = createClient()
      const path = `${perfil.id}/descargable-${i}-${Date.now()}.jpg`
      await supabase.storage.from('links-photos').upload(path, comprimida, { upsert: true })
      const { data } = supabase.storage.from('links-photos').getPublicUrl(path)
      editarLink(i, 'imagen_url', data.publicUrl)
    } catch (err: any) {
      alert(err?.message || 'No se pudo subir la imagen.')
    }
  }

  function agregarLink() {
    if (!perfil) return
    setPerfil({ ...perfil, links: [...perfil.links, { tipo: 'instagram', titulo: '', url: '' }] })
  }
  function editarLink(i: number, campo: keyof Link, valor: string) {
    if (!perfil) return
    const nuevo = [...perfil.links]
    nuevo[i] = { ...nuevo[i], [campo]: valor }
    setPerfil({ ...perfil, links: nuevo })
  }
  function eliminarLink(i: number) {
    if (!perfil) return
    setPerfil({ ...perfil, links: perfil.links.filter((_, j) => j !== i) })
  }
  function editarPromo(campo: keyof Promo, valor: string | boolean) {
    if (!perfil) return
    setPerfil({ ...perfil, promo: { ...perfil.promo, [campo]: valor } })
  }

  async function cerrarSesion() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/links/login')
  }

  if (loading || !perfil) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif'}}>Cargando...</div>
  )

  const t = TEMPLATES.find(x => x.id === perfil.template) || TEMPLATES[0]

  return (
    <div style={{minHeight:'100vh',background:'#FAFAFA',fontFamily:'sans-serif'}}>
      <style>{`
        *{box-sizing:border-box}
        .ld-nav{display:flex;justify-content:space-between;align-items:center;padding:16px 24px;background:white;border-bottom:1px solid #E5E5E5}
        .ld-wrap{max-width:640px;margin:0 auto;padding:24px 20px 100px}
        .ld-card{background:white;border:1px solid #E5E5E5;border-radius:16px;padding:20px;margin-bottom:16px}
        .ld-card-title{font-size:13px;font-weight:700;margin-bottom:14px;color:#0A0A0A}
        .ld-field{display:flex;flex-direction:column;gap:5px;margin-bottom:12px}
        .ld-field label{font-size:11px;font-weight:600;color:#525252}
        .ld-field input,.ld-field textarea,.ld-field select{padding:9px 11px;border-radius:10px;border:1px solid #E5E5E5;font-size:13px;font-family:inherit;outline:none}
        .ld-tpl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
        .ld-tpl{border-radius:12px;padding:14px 8px;text-align:center;cursor:pointer;border:2px solid transparent}
        .ld-link-row{background:#FAFAFA;border:1px solid #E5E5E5;border-radius:10px;padding:10px;margin-bottom:8px}
        .ld-save-btn{width:100%;padding:13px;background:linear-gradient(135deg,#8B5CF6,#7C3AED);color:white;border:none;border-radius:12px;font-weight:700;cursor:pointer;font-size:13px}
        .ld-upgrade{background:linear-gradient(135deg,#1A1035,#3B1F7A);color:white;border-radius:16px;padding:18px 20px;margin-bottom:16px}
      `}</style>

      <input ref={fileInputRef} type="file" accept="image/*" style={{display:'none'}}
        onChange={e => e.target.files?.[0] && subirFoto(e.target.files[0])}/>

      <nav className="ld-nav">
        <div style={{fontWeight:900}}>Luma<span style={{color:'#8B5CF6'}}>Links</span></div>
        <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
          <a href={`/l/${perfil.slug}`} target="_blank" rel="noopener noreferrer" style={{fontSize:'12px',color:'#8B5CF6',display:'flex',alignItems:'center',gap:'4px'}}>
            Ver mi página <ExternalLink size={12}/>
          </a>
          <button onClick={cerrarSesion} style={{display:'flex',alignItems:'center',gap:'6px',padding:'7px 12px',borderRadius:'8px',border:'1px solid #E5E5E5',background:'white',fontSize:'12px',cursor:'pointer'}}>
            <LogOut size={12}/> Salir
          </button>
        </div>
      </nav>

      <div className="ld-wrap">
        <div className="ld-upgrade">
          <div style={{fontSize:'13px',fontWeight:700,marginBottom:'4px'}}>Esto es solo el comienzo ✦</div>
          <div style={{fontSize:'12px',opacity:0.85,marginBottom:'10px',lineHeight:1.5}}>
            Con Luma podés transformar este link en tu página profesional completa, con reservas, servicios, pagos y gestión de consultantes.
          </div>
          <a href="/suscripcion" style={{fontSize:'12px',fontWeight:700,color:'#C4B5FD'}}>Conocé Luma →</a>
        </div>

        <div className="ld-card">
          <div className="ld-card-title">Tu perfil</div>
          <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'14px'}}>
            <div onClick={() => fileInputRef.current?.click()} style={{width:'72px',height:'96px',borderRadius:'10px',border:'1.5px solid #8B5CF6',overflow:'hidden',cursor:'pointer',flexShrink:0,background:'#F0EBFF',display:'flex',alignItems:'center',justifyContent:'center'}}>
              {perfil.foto_url ? <img src={perfil.foto_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <span style={{fontSize:'10px',color:'#8B5CF6'}}>{subiendoFoto ? '...' : '📷'}</span>}
            </div>
            <div style={{fontSize:'11px',color:'#737373'}}>Tocá la carta para cambiar tu foto.<br/>Se muestra en formato carta de tarot.</div>
          </div>
          <div className="ld-field"><label>Nombre</label><input value={perfil.nombre} onChange={e => setPerfil({...perfil, nombre: e.target.value})}/></div>
          <div className="ld-field"><label>Profesión</label><input value={perfil.profesion} placeholder="Ej: Tarotista" onChange={e => setPerfil({...perfil, profesion: e.target.value})}/></div>
          <div className="ld-field"><label>Bio corta</label><textarea value={perfil.bio} maxLength={120} style={{minHeight:'60px'}} onChange={e => setPerfil({...perfil, bio: e.target.value})}/></div>
        </div>

        <div className="ld-card">
          <div className="ld-card-title">Estilo visual</div>
          <div className="ld-tpl-grid">
            {TEMPLATES.map(tpl => (
              <div key={tpl.id} className="ld-tpl" onClick={() => setPerfil({...perfil, template: tpl.id})}
                style={{background: tpl.bg, borderColor: perfil.template === tpl.id ? tpl.color : 'transparent'}}>
                <div style={{fontSize:'12px',fontWeight:700,color:tpl.color}}>{tpl.nombre}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="ld-card">
          <div className="ld-card-title">Links</div>
          {perfil.links.map((link, i) => (
            <div key={i} className="ld-link-row">
              <div style={{display:'flex',gap:'6px',marginBottom:'6px'}}>
                <select value={link.tipo} onChange={e => editarLink(i, 'tipo', e.target.value)} style={{flexShrink:0,padding:'7px',borderRadius:'8px',border:'1px solid #E5E5E5',fontSize:'12px'}}>
                  {TIPOS_LINK.map(tp => <option key={tp.id} value={tp.id}>{tp.label}</option>)}
                </select>
                <input value={link.titulo} placeholder="Título" onChange={e => editarLink(i, 'titulo', e.target.value)} style={{flex:1,minWidth:0,padding:'7px 10px',borderRadius:'8px',border:'1px solid #E5E5E5',fontSize:'12px'}}/>
                <button onClick={() => eliminarLink(i)} style={{width:'28px',border:'none',background:'#FEF2F2',color:'#EF4444',borderRadius:'8px',cursor:'pointer'}}><X size={12}/></button>
              </div>
              <input value={link.url} placeholder="https://..." onChange={e => editarLink(i, 'url', e.target.value)} style={{width:'100%',padding:'7px 10px',borderRadius:'8px',border:'1px solid #E5E5E5',fontSize:'12px'}}/>
              {link.tipo === 'descargable' && (
                <div style={{marginTop:'8px',display:'flex',gap:'10px',alignItems:'center'}}>
                  <div style={{width:'64px',height:'36px',borderRadius:'6px',overflow:'hidden',flexShrink:0,background:'#F0EBFF',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {link.imagen_url ? <img src={link.imagen_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <span style={{fontSize:'9px',color:'#8B5CF6'}}>📷</span>}
                  </div>
                  <div style={{flex:1}}>
                    <label style={{fontSize:'11px',color:'#8B5CF6',fontWeight:700,cursor:'pointer'}}>
                      {link.imagen_url ? 'Cambiar portada' : 'Subir portada'}
                      <input type="file" accept="image/*" style={{display:'none'}}
                        onChange={e => e.target.files?.[0] && subirImagenDescargable(i, e.target.files[0])}/>
                    </label>
                    <div style={{fontSize:'10px',color:'#A3A3A3',marginTop:'2px'}}>Recomendado: 820x312px aprox. (como una portada de Facebook)</div>
                  </div>
                </div>
              )}
            </div>
          ))}
          <button onClick={agregarLink} style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'12px',color:'#8B5CF6',background:'transparent',border:'1px dashed #8B5CF6',borderRadius:'8px',padding:'8px',width:'100%',justifyContent:'center',cursor:'pointer'}}>
            <Plus size={12}/> Agregar link
          </button>
        </div>

        <div className="ld-card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px'}}>
            <div className="ld-card-title" style={{marginBottom:0}}>Promo · "Elegí una carta"</div>
            <label style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'12px',fontWeight:600,color:'#525252',cursor:'pointer'}}>
              <input type="checkbox" checked={perfil.promo.activa} onChange={e => editarPromo('activa', e.target.checked)}/>
              Activa
            </label>
          </div>
          <div style={{fontSize:'11px',color:'#737373',marginBottom:'14px',lineHeight:1.5}}>
          En tu página pública aparecen 3 cartas para elegir, pero siempre revelan esta misma promo. Llevalas a tu WhatsApp, tu tienda o donde quieras — ideal para promos limitadas o semanales que vas cambiando.
          </div>
          <div className="ld-field"><label>Título</label><input value={perfil.promo.titulo} placeholder="Ej: 20% en tu primera lectura" onChange={e => editarPromo('titulo', e.target.value)}/></div>
          <div className="ld-field"><label>Descripción</label><textarea value={perfil.promo.descripcion} maxLength={100} style={{minHeight:'50px'}} placeholder="Ej: Válido esta semana para nuevas clientas" onChange={e => editarPromo('descripcion', e.target.value)}/></div>
          <div className="ld-field"><label>Texto del botón</label><input value={perfil.promo.texto_boton} placeholder="Ej: Reservar ahora" onChange={e => editarPromo('texto_boton', e.target.value)}/></div>
          <div className="ld-field"><label>Link del botón</label><input value={perfil.promo.url} placeholder="https://wa.me/... o link de tu tienda" onChange={e => editarPromo('url', e.target.value)}/></div>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'12px'}}>
          <button className="ld-save-btn" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar cambios'}</button>
          {msgExito && <span style={{color:'#10B981',fontSize:'12px',fontWeight:600}}>{msgExito}</span>}
        </div>

        <a href={`/l/${perfil.slug}`} target="_blank" rel="noopener noreferrer"
          style={{display:'block',width:'100%',padding:'13px',background:'linear-gradient(135deg,#25D9C0,#0EA5A0)',color:'white',border:'none',borderRadius:'12px',fontWeight:700,cursor:'pointer',fontSize:'13px',textAlign:'center',textDecoration:'none'}}>
          Ver mi página →
        </a>
      </div>
    </div>
  )
}