'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { comprimirImagen } from '@/lib/comprimirImagen'
import { Plus, X, LogOut, ExternalLink, Copy, Check, Share2 } from 'lucide-react'
import EstadisticasLinks from '@/components/EstadisticasLinks'
import { MENSAJE_WHATSAPP_DEFAULT } from '@/lib/linksUtil'

type Link = { tipo: string; titulo: string; url: string; imagen_url?: string; mensaje?: string }

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
  const [copiado, setCopiado] = useState(false)
  const [puedeCompartir, setPuedeCompartir] = useState(false)
  const [guardadoComo, setGuardadoComo] = useState('')

  useEffect(() => { setPuedeCompartir(typeof navigator !== 'undefined' && !!navigator.share) }, [])

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/links/login'); return }
    const { data } = await supabase.from('luma_links_profiles').select('*').eq('auth_user_id', user.id).maybeSingle()
    if (data) {
      const p = { ...data, links: data.links || [], promo: data.promo || PROMO_VACIA }
      setPerfil(p)
      setGuardadoComo(huella(p))
    }
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
      setGuardadoComo(huella(perfil))
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

  // para saber si hay cambios sin guardar
  function huella(p: Perfil) {
    return JSON.stringify([p.nombre, p.profesion, p.bio, p.foto_url, p.template, p.links, p.promo])
  }

  function agregarLink() {
    if (!perfil) return
    setPerfil({ ...perfil, links: [...perfil.links, { tipo: 'instagram', titulo: '', url: '' }] })
  }
  function editarLink(i: number, campo: keyof Link, valor: string) {
    if (!perfil) return
    const nuevo = [...perfil.links]
    nuevo[i] = { ...nuevo[i], [campo]: valor }
    // al elegir WhatsApp se propone el mensaje que le llega
    if (campo === 'tipo' && valor === 'whatsapp' && nuevo[i].mensaje === undefined) nuevo[i].mensaje = MENSAJE_WHATSAPP_DEFAULT
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

  function linkPublico() {
    return perfil ? `${window.location.origin}/l/${perfil.slug}` : ''
  }

  async function copiarLink() {
    const url = linkPublico()
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // navegadores viejos o sin permiso: copia a la antigua
      const area = document.createElement('textarea')
      area.value = url
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      try { document.execCommand('copy') } catch { alert('Copiá tu link: ' + url); return }
      finally { document.body.removeChild(area) }
    }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  async function compartirLink() {
    const url = linkPublico()
    if (!url || !navigator.share) return
    try {
      await navigator.share({ title: perfil?.nombre || 'Mis links', url })
    } catch { /* cerró el menú de compartir: no pasa nada */ }
  }

  async function cerrarSesion() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/links/login')
  }

  if (loading || !perfil) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif'}}>Cargando...</div>
  )

  const hayCambios = huella(perfil) !== guardadoComo

  return (
    <div className="ld-pagina">
      <style>{`
        *{box-sizing:border-box}
        .ld-pagina{min-height:100vh;background:#EFE8FA;font-family:'Jost',system-ui,sans-serif;color:#2A1B4D;
          background-image:radial-gradient(circle at 12% 0%,rgba(201,168,76,0.10),transparent 38%),radial-gradient(circle at 100% 30%,rgba(139,92,246,0.10),transparent 40%)}
        .ld-nav{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:14px 20px;border-bottom:1px solid #DCCFF3;background:rgba(239,232,250,0.85);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);position:sticky;top:0;z-index:20}
        .ld-logo{font-family:'Cormorant Garamond',Georgia,serif;font-size:22px;font-weight:600;color:#2A1B4D;display:flex;align-items:center;gap:8px}
        .ld-logo b{color:#A8862E;font-weight:600}
        .ld-logo i{font-style:normal;font-size:11px;color:#8B5CF6;letter-spacing:3px}
        .ld-nav-acc{display:flex;gap:8px;align-items:center}
        .ld-nav-link{font-size:12.5px;color:#4C2A8F;font-weight:600;display:flex;align-items:center;gap:4px;text-decoration:none;padding:8px 10px;border-radius:10px}
        .ld-nav-link:hover{background:#F1EAFB}
        .ld-nav-link,.ld-salir,.ld-logo{white-space:nowrap}
        @media(max-width:440px){.ld-logo i{display:none}.ld-nav{padding:12px 14px}.ld-nav-link{padding:8px 6px}}
        .ld-salir{display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:10px;border:1px solid #DCCFF3;background:#FBF8F2;color:#2A1B4D;font-size:12.5px;cursor:pointer;font-family:inherit}
        .ld-wrap{max-width:640px;margin:0 auto;padding:22px 16px 120px}
        .ld-card{background:#FFFFFF;border:1px solid #E7DEF6;border-radius:18px;padding:20px;margin-bottom:16px;box-shadow:0 1px 0 rgba(42,27,77,0.03)}
        .ld-card-crema{background:#FBF8F2;border-color:#E4D7B4}
        .ld-card-title{font-size:12px;font-weight:700;margin-bottom:14px;color:#8A6A1F;letter-spacing:1.2px;text-transform:uppercase}
        .ld-field{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}
        .ld-field label{font-size:12px;font-weight:600;color:#5B4A80}
        .ld-field input,.ld-field textarea,.ld-field select,.ld-input{padding:10px 12px;border-radius:11px;border:1px solid #DCCFF3;background:#F7F2FD;color:#2A1B4D;font-size:14px;font-family:inherit;outline:none;transition:border-color .2s,background .2s}
        .ld-field input:focus,.ld-field textarea:focus,.ld-input:focus{border-color:#A8862E;background:#fff}
        .ld-hint{font-size:11.5px;color:#7A6A99;line-height:1.5}
        .ld-tpl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
        .ld-tpl{border-radius:12px;padding:14px 8px;text-align:center;cursor:pointer;border:2px solid transparent;font-family:inherit}
        .ld-link-row{background:#F7F2FD;border:1px solid #E7DEF6;border-radius:12px;padding:10px;margin-bottom:8px}
        .ld-link-row .ld-input{background:#fff;font-size:13px;padding:8px 10px}
        .ld-btn-osc{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px 14px;border-radius:11px;border:none;background:#2A1B4D;color:#F4EFE6;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit;transition:background .2s}
        .ld-btn-osc:hover{background:#3A2766}
        .ld-btn-claro{display:inline-flex;align-items:center;gap:6px;padding:10px 14px;border-radius:11px;border:1px solid #DCCFF3;background:#fff;color:#4C2A8F;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit}
        .ld-link-pub{flex:1 1 200px;min-width:0;padding:10px 12px;border-radius:11px;background:#F1EAFB;color:#4C2A8F;font-size:13.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .ld-upgrade{background:linear-gradient(135deg,#1A1035,#3B1F7A);color:white;border-radius:18px;padding:18px 20px;margin-bottom:16px}
        .ld-agregar{display:flex;align-items:center;gap:6px;font-size:13px;color:#4C2A8F;background:transparent;border:1px dashed #A78BFA;border-radius:11px;padding:10px;width:100%;justify-content:center;cursor:pointer;font-family:inherit;font-weight:600}
        .ld-barra{position:fixed;left:0;right:0;bottom:0;z-index:30;padding:12px 16px calc(12px + env(safe-area-inset-bottom));background:rgba(251,248,242,0.96);border-top:1px solid #E4D7B4;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
        .ld-barra-in{max-width:640px;margin:0 auto;display:flex;align-items:center;gap:12px}
        .ld-barra-txt{flex:1;font-size:12.5px;color:#7A6A99}
        .ld-barra-txt.pend{color:#8A6A1F;font-weight:600}
        .ld-barra-txt.ok{color:#047857;font-weight:600}
        .ld-guardar{padding:12px 22px;border:none;border-radius:12px;background:#2A1B4D;color:#F4EFE6;font-weight:700;cursor:pointer;font-size:14px;font-family:inherit;flex-shrink:0}
        .ld-guardar:disabled{opacity:.55;cursor:not-allowed}
        :is(.ld-btn-osc,.ld-btn-claro,.ld-guardar,.ld-salir,.ld-agregar,.ld-tpl,.est-selector button):focus-visible{outline:2px solid #A8862E;outline-offset:2px}
        .est-cabeza{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px}
        .est-selector{display:flex;background:#F1EAFB;border-radius:10px;padding:3px}
        .est-selector button{border:none;background:transparent;padding:6px 10px;border-radius:8px;font-size:12px;color:#5B4A80;cursor:pointer;font-family:inherit;font-weight:600}
        .est-selector button.act{background:#2A1B4D;color:#F4EFE6}
        .est-vacio{font-size:13.5px;color:#5B4A80;line-height:1.6;padding:6px 0}
        .est-grandes{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
        .est-grande{background:#fff;border:1px solid #EFE4C8;border-radius:14px;padding:14px}
        .est-num{font-family:'Cormorant Garamond',Georgia,serif;font-size:36px;font-weight:600;line-height:1;color:#2A1B4D}
        .est-lbl{font-size:12px;color:#7A6A99;margin-top:4px}
        .est-bloque{margin-bottom:14px}
        .est-sub{font-size:12px;font-weight:700;color:#5B4A80;margin-bottom:8px}
        .est-fila{margin-bottom:9px}
        .est-fila-top{display:flex;justify-content:space-between;gap:10px;font-size:13px;margin-bottom:4px}
        .est-fila-nombre{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .est-fila-num{font-weight:700;color:#2A1B4D;font-variant-numeric:tabular-nums}
        .est-barra{height:6px;background:#EFE8FA;border-radius:99px;overflow:hidden}
        .est-barra div{height:100%;background:#A8862E;border-radius:99px}
        .est-dos{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        @media(max-width:420px){.est-dos{grid-template-columns:1fr}}
        .est-origen{display:flex;justify-content:space-between;font-size:13px;padding:3px 0}
        .est-mejor{font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;font-weight:600;text-transform:capitalize}
        .est-mini{font-size:12px;color:#7A6A99;margin-top:2px}
        .est-upsell{margin-top:4px;background:#2A1B4D;color:#F4EFE6;border-radius:14px;padding:14px 16px;font-size:13px;line-height:1.55;display:flex;flex-direction:column;gap:10px}
        .est-upsell a{align-self:flex-start;background:#C9A84C;color:#1A1035;font-weight:700;font-size:12.5px;padding:8px 14px;border-radius:10px;text-decoration:none}
      `}</style>

      <input ref={fileInputRef} type="file" accept="image/*" style={{display:'none'}}
        onChange={e => e.target.files?.[0] && subirFoto(e.target.files[0])}/>

      <nav className="ld-nav">
        <div className="ld-logo">Luma <b>Links</b> <i aria-hidden="true">✦ ☾ ✦</i></div>
        <div className="ld-nav-acc">
          <a href={`/l/${perfil.slug}`} target="_blank" rel="noopener noreferrer" className="ld-nav-link">
            Ver mi página <ExternalLink size={13}/>
          </a>
          <button onClick={cerrarSesion} className="ld-salir">
            <LogOut size={13}/> Salir
          </button>
        </div>
      </nav>

      <div className="ld-wrap">
        <div className="ld-card ld-card-crema" style={{padding:'16px 18px'}}>
          <div className="ld-card-title" style={{marginBottom:'8px'}}>Tu link</div>
          <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
            <div className="ld-link-pub">
              {typeof window !== 'undefined' ? window.location.host : ''}/l/{perfil.slug}
            </div>
            <button onClick={copiarLink} className="ld-btn-osc" style={copiado ? {background:'#047857'} : undefined}>
              {copiado ? <><Check size={13}/> Copiado</> : <><Copy size={13}/> Copiar</>}
            </button>
            {puedeCompartir && (
              <button onClick={compartirLink} className="ld-btn-claro">
                <Share2 size={13}/> Compartir
              </button>
            )}
          </div>
          <div className="ld-hint" style={{marginTop:'8px'}}>Pegalo en tu bio de Instagram o TikTok.</div>
        </div>

        <EstadisticasLinks />

        <div className="ld-upgrade">
          <div style={{fontSize:'13px',fontWeight:700,marginBottom:'4px'}}>Esto es solo el comienzo ✦</div>
          <div style={{fontSize:'12.5px',opacity:0.85,marginBottom:'10px',lineHeight:1.5}}>
            Con Luma podés transformar este link en tu página profesional completa, con reservas, servicios, cursos, tus links, pagos y gestión de consultantes.
          </div>
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
            <a href="/" style={{fontSize:'12px',fontWeight:700,color:'white',padding:'8px 14px',borderRadius:'10px',border:'1px solid rgba(196,181,253,0.5)',textDecoration:'none'}}>Más información</a>
            <a href="/pasar-a-luma" style={{fontSize:'12px',fontWeight:700,color:'#1A1035',background:'#C4B5FD',padding:'8px 14px',borderRadius:'10px',textDecoration:'none'}}>Ver planes →</a>
          </div>
        </div>

        <div className="ld-card">
          <div className="ld-card-title">Tu perfil</div>
          <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'14px'}}>
            <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="Cambiar tu foto"
              style={{width:'72px',height:'96px',borderRadius:'10px',border:'1.5px solid #A8862E',overflow:'hidden',cursor:'pointer',flexShrink:0,background:'#F1EAFB',display:'flex',alignItems:'center',justifyContent:'center',padding:0}}>
              {perfil.foto_url ? <img src={perfil.foto_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <span style={{fontSize:'12px',color:'#8B5CF6'}}>{subiendoFoto ? '...' : '📷'}</span>}
            </button>
            <div className="ld-hint">Tocá la carta para cambiar tu foto.<br/>Se muestra en formato carta de tarot.</div>
          </div>
          <div className="ld-field"><label htmlFor="ld-nombre">Nombre</label><input id="ld-nombre" value={perfil.nombre} onChange={e => setPerfil({...perfil, nombre: e.target.value})}/></div>
          <div className="ld-field"><label htmlFor="ld-prof">Profesión</label><input id="ld-prof" value={perfil.profesion} placeholder="Ej: Tarotista" onChange={e => setPerfil({...perfil, profesion: e.target.value})}/></div>
          <div className="ld-field"><label htmlFor="ld-bio">Bio corta</label><textarea id="ld-bio" value={perfil.bio} maxLength={120} style={{minHeight:'60px'}} onChange={e => setPerfil({...perfil, bio: e.target.value})}/></div>
        </div>

        <div className="ld-card ld-card-crema">
          <div className="ld-card-title">Estilo visual</div>
          <div className="ld-tpl-grid">
            {TEMPLATES.map(tpl => (
              <button type="button" key={tpl.id} className="ld-tpl" onClick={() => setPerfil({...perfil, template: tpl.id})} aria-pressed={perfil.template === tpl.id}
                style={{background: tpl.bg, borderColor: perfil.template === tpl.id ? tpl.color : 'transparent'}}>
                <div style={{fontSize:'12.5px',fontWeight:700,color:tpl.color}}>{tpl.nombre}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="ld-card">
          <div className="ld-card-title">Links</div>
          {perfil.links.map((link, i) => (
            <div key={i} className="ld-link-row">
              <div style={{display:'flex',gap:'6px',marginBottom:'6px'}}>
                <select value={link.tipo} onChange={e => editarLink(i, 'tipo', e.target.value)} className="ld-input" style={{flexShrink:0,padding:'8px'}} aria-label="Tipo de link">
                  {TIPOS_LINK.map(tp => <option key={tp.id} value={tp.id}>{tp.label}</option>)}
                </select>
                <input value={link.titulo} placeholder="Título" onChange={e => editarLink(i, 'titulo', e.target.value)} className="ld-input" style={{flex:1,minWidth:0}} aria-label="Título del link"/>
                <button onClick={() => eliminarLink(i)} aria-label="Borrar este link" style={{width:'32px',border:'none',background:'#FEF2F2',color:'#DC2626',borderRadius:'9px',cursor:'pointer'}}><X size={13}/></button>
              </div>
              <input value={link.url} placeholder={link.tipo === 'whatsapp' ? 'Tu número con código de país, ej: 5492235551234' : 'https://...'} onChange={e => editarLink(i, 'url', e.target.value)} className="ld-input" style={{width:'100%'}} aria-label="Dirección del link"/>
              {link.tipo === 'whatsapp' && (
                <div style={{marginTop:'8px'}}>
                  <label className="ld-hint" htmlFor={`ld-msg-${i}`} style={{fontWeight:600,color:'#5B4A80'}}>Mensaje que te llega</label>
                  <input id={`ld-msg-${i}`} value={link.mensaje ?? MENSAJE_WHATSAPP_DEFAULT} maxLength={160}
                    onChange={e => editarLink(i, 'mensaje', e.target.value)} className="ld-input" style={{width:'100%',marginTop:'4px'}}/>
                  <div className="ld-hint" style={{marginTop:'4px'}}>Así ya sabés que te escriben desde tu página.</div>
                </div>
              )}
              {link.tipo === 'descargable' && (
                <div style={{marginTop:'8px',display:'flex',gap:'10px',alignItems:'center'}}>
                  <div style={{width:'64px',height:'36px',borderRadius:'6px',overflow:'hidden',flexShrink:0,background:'#F1EAFB',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {link.imagen_url ? <img src={link.imagen_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <span style={{fontSize:'10px',color:'#8B5CF6'}}>📷</span>}
                  </div>
                  <div style={{flex:1}}>
                    <label style={{fontSize:'12px',color:'#4C2A8F',fontWeight:700,cursor:'pointer'}}>
                      {link.imagen_url ? 'Cambiar portada' : 'Subir portada'}
                      <input type="file" accept="image/*" style={{display:'none'}}
                        onChange={e => e.target.files?.[0] && subirImagenDescargable(i, e.target.files[0])}/>
                    </label>
                    <div className="ld-hint" style={{marginTop:'2px'}}>Recomendado: 820x312px aprox. (como una portada de Facebook)</div>
                  </div>
                </div>
              )}
            </div>
          ))}
          <button onClick={agregarLink} className="ld-agregar">
            <Plus size={13}/> Agregar link
          </button>
        </div>

        <div className="ld-card ld-card-crema">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px',gap:'10px'}}>
            <div className="ld-card-title" style={{marginBottom:0}}>Promo · &quot;Elegí una carta&quot;</div>
            <label style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'12.5px',fontWeight:600,color:'#5B4A80',cursor:'pointer'}}>
              <input type="checkbox" checked={perfil.promo.activa} onChange={e => editarPromo('activa', e.target.checked)}/>
              Activa
            </label>
          </div>
          <div className="ld-hint" style={{marginBottom:'14px'}}>
          En tu página pública aparecen 3 cartas para elegir, pero siempre revelan esta misma promo. Llevalas a tu WhatsApp, tu tienda o donde quieras — ideal para promos limitadas o semanales que vas cambiando.
          </div>
          <div className="ld-field"><label htmlFor="ld-p1">Título</label><input id="ld-p1" value={perfil.promo.titulo} placeholder="Ej: 20% en tu primera lectura" onChange={e => editarPromo('titulo', e.target.value)}/></div>
          <div className="ld-field"><label htmlFor="ld-p2">Descripción</label><textarea id="ld-p2" value={perfil.promo.descripcion} maxLength={100} style={{minHeight:'50px'}} placeholder="Ej: Válido esta semana para nuevas clientas" onChange={e => editarPromo('descripcion', e.target.value)}/></div>
          <div className="ld-field"><label htmlFor="ld-p3">Texto del botón</label><input id="ld-p3" value={perfil.promo.texto_boton} placeholder="Ej: Reservar ahora" onChange={e => editarPromo('texto_boton', e.target.value)}/></div>
          <div className="ld-field"><label htmlFor="ld-p4">Link del botón</label><input id="ld-p4" value={perfil.promo.url} placeholder="https://wa.me/... o link de tu tienda" onChange={e => editarPromo('url', e.target.value)}/></div>
        </div>

        <a href={`/l/${perfil.slug}`} target="_blank" rel="noopener noreferrer"
          style={{display:'block',width:'100%',padding:'13px',background:'linear-gradient(135deg,#25D9C0,#0EA5A0)',color:'white',border:'none',borderRadius:'12px',fontWeight:700,cursor:'pointer',fontSize:'13.5px',textAlign:'center',textDecoration:'none'}}>
          Ver mi página →
        </a>
      </div>

      {/* barra fija: siempre a mano, con aviso de cambios sin guardar */}
      <div className="ld-barra">
        <div className="ld-barra-in">
          <span className={`ld-barra-txt${msgExito ? ' ok' : hayCambios ? ' pend' : ''}`} role="status">
            {msgExito ? '✓ Guardado' : hayCambios ? 'Tenés cambios sin guardar' : 'Todo guardado'}
          </span>
          <button className="ld-guardar" onClick={guardar} disabled={guardando || (!hayCambios && !msgExito)}>
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
