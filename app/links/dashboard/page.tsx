'use client'

// Panel de Luma Links (rediseño Blue Hour, 29/10). Mismas funciones de siempre, ordenadas como el panel de Luma:
// menú al costado en la compu, pestañas en el celu, vista previa en vivo, toasts en cada acción.
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { comprimirImagen } from '@/lib/comprimirImagen'
import { Plus, LogOut, Eye, Copy, Check, Share2, Camera, Music2, PlayCircle, Mic, MessageCircle, Mail, FileDown, ShoppingBag, Link as LinkIcon, Pencil, ChevronUp, ChevronDown, Trash2, GripVertical, Home, Sparkles, BarChart3, Undo2 } from 'lucide-react'
import EstadisticasLinks from '@/components/EstadisticasLinks'
import { MENSAJE_WHATSAPP_DEFAULT } from '@/lib/linksUtil'
import { toast } from '@/components/ToastProvider'
import { PLANTILLAS, temaPublico, alfa, modoValido, plantillaValida, type TemaPublico } from '@/lib/plantillas'

type Link = { tipo: string; titulo: string; url: string; imagen_url?: string; mensaje?: string }

type Promo = { activa: boolean; titulo: string; descripcion: string; texto_boton: string; url: string }

type Perfil = {
  id: string
  nombre: string
  profesion: string
  bio: string
  foto_url: string
  template: string
  template_modo?: string | null
  slug: string
  links: Link[]
  promo: Promo
}

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

const ICONOS: Record<string, any> = {
  instagram: Camera, tiktok: Music2, youtube: PlayCircle, podcast: Mic,
  whatsapp: MessageCircle, email: Mail, descargable: FileDown, tienda: ShoppingBag, otro: LinkIcon,
}
// color del chip de cada tipo (fondo, ícono)
const TONOS: Record<string, [string, string]> = {
  instagram: ['#F6E4E2', '#A65A6E'], tiktok: ['#E9E3EF', '#4C5580'], youtube: ['#F6E4E2', '#A24B47'], podcast: ['#E9E3EF', '#625A92'],
  whatsapp: ['#D8EBDD', '#3E7D57'], email: ['#E6E9F2', '#4C5580'], descargable: ['#F7ECD3', '#8A6A22'], tienda: ['#F7ECD3', '#8A5A0B'], otro: ['#E6E9F2', '#4C5580'],
}

const PROMO_VACIA: Promo = { activa: false, titulo: '', descripcion: '', texto_boton: '', url: '' }

type Pestana = 'pagina' | 'links' | 'numeros'

function placeholderUrl(tipo: string) {
  if (tipo === 'whatsapp') return 'Tu número con código de país, ej: 5492235551234'
  if (tipo === 'email') return 'tu@email.com'
  return 'https://...'
}

function saludo() {
  const h = new Date().getHours()
  return h < 6 ? 'Buenas noches' : h < 13 ? 'Buen día' : h < 20 ? 'Buenas tardes' : 'Buenas noches'
}

// la página pública en chiquito, con lo que está escrito ahora (aunque no esté guardado)
function PreviaLinks({ perfil, t }: { perfil: Perfil; t: TemaPublico }) {
  const promo = perfil.promo.activa && perfil.promo.url ? perfil.promo : null
  const inicial = (perfil.nombre || '').trim().charAt(0).toUpperCase() || t.deco
  return (
    <div className="lk-pv" style={{ background: `radial-gradient(260px 220px at 50% 18%, ${t.banda}, transparent 75%), ${t.fondo}`, color: t.texto }}>
      <div className="lk-pv-marco">
        <div className="lk-pv-carta" style={{ borderColor: t.label, background: t.foto, boxShadow: `0 0 22px 3px ${alfa(t.acento, 0.55)}` }}>
          {perfil.foto_url ? <img src={perfil.foto_url} alt="" /> : <span style={{ color: t.fotoTxt }}>{inicial}</span>}
        </div>
        <div className="lk-pv-linea lk-marco-mask" style={{ background: t.label }} aria-hidden="true" />
      </div>
      <div className="lk-pv-nombre">{perfil.nombre || 'Tu nombre'}</div>
      {perfil.profesion && <div className="lk-pv-prof" style={{ color: t.label }}>{perfil.profesion}</div>}
      {perfil.bio && <div className="lk-pv-bio" style={{ color: t.suave }}>{perfil.bio}</div>}
      <div className="lk-pv-links">
        {perfil.links.length === 0 && <div className="lk-pv-vacio" style={{ borderColor: alfa(t.texto, 0.2), color: t.suave }}>Tus links van a aparecer acá</div>}
        {perfil.links.slice(0, 6).map((l, i) => {
          const Ic = ICONOS[l.tipo] || LinkIcon
          return (
            <div key={i} className="lk-pv-link" style={{ background: alfa(t.superficie, t.dark ? 0.72 : 0.85), borderColor: alfa(t.texto, 0.14) }}>
              <span className="lk-pv-ic" style={{ borderColor: alfa(t.label, 0.5), color: t.label }}><Ic size={12} /></span>
              <span>{l.titulo || TIPOS_LINK.find(x => x.id === l.tipo)?.label || 'Link'}</span>
            </div>
          )
        })}
      </div>
      {promo && <div className="lk-pv-promo" style={{ background: t.acento, color: t.sobreAcento, boxShadow: `0 8px 18px ${alfa(t.acento, 0.45)}` }}>{t.deco} {promo.titulo || 'Elegí una carta'}</div>}
    </div>
  )
}

export default function LinksDashboardPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(true)
  const [sinPerfil, setSinPerfil] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [subiendoPortada, setSubiendoPortada] = useState<number | null>(null)
  const [msgExito, setMsgExito] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [puedeCompartir, setPuedeCompartir] = useState(false)
  const [guardadoComo, setGuardadoComo] = useState('')
  const [pestana, setPestana] = useState<Pestana>('pagina')
  const [seccion, setSeccion] = useState('perfil')
  const [abierto, setAbierto] = useState<number | null>(null)
  const [arrastrando, setArrastrando] = useState<number | null>(null)
  const [borrado, setBorrado] = useState<{ link: Link; i: number } | null>(null)
  const [verPrevia, setVerPrevia] = useState(false)
  const timerBorrado = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setPuedeCompartir(typeof navigator !== 'undefined' && !!navigator.share) }, [])

  useEffect(() => { cargar() }, [])

  async function cargar() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/links/login'); return }
      const { data } = await supabase.from('luma_links_profiles').select('*').eq('auth_user_id', user.id).maybeSingle()
      if (data) {
        const p = { ...data, links: data.links || [], promo: data.promo || PROMO_VACIA }
        setPerfil(p)
        setGuardadoComo(huella(p))
      } else setSinPerfil(true)
    } catch {
      toast('No pudimos cargar tu página. Revisá tu conexión y recargá.', 'error')
      setSinPerfil(true)
    } finally { setLoading(false) }
  }

  const hayCambios = !!perfil && huella(perfil) !== guardadoComo

  // aviso si se va con cambios sin guardar
  useEffect(() => {
    if (!hayCambios) return
    const avisar = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [hayCambios])

  // Ctrl/Cmd + S guarda
  useEffect(() => {
    const atajo = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (hayCambios && !guardando) guardar() }
    }
    window.addEventListener('keydown', atajo)
    return () => window.removeEventListener('keydown', atajo)
  })

  async function guardar() {
    if (!perfil) return
    setGuardando(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast('Tu sesión expiró. Volvé a iniciar sesión para guardar los cambios.', 'error')
        router.push('/links/login')
        return
      }
      const datos: Record<string, unknown> = {
        nombre: perfil.nombre,
        profesion: perfil.profesion,
        bio: perfil.bio,
        foto_url: perfil.foto_url,
        template: plantillaValida(perfil.template),
        template_modo: modoValido(perfil.template_modo, plantillaValida(perfil.template)),
        links: perfil.links,
        promo: perfil.promo,
        updated_at: new Date().toISOString(),
      }
      let { error, data } = await supabase.from('luma_links_profiles').update(datos).eq('id', perfil.id).select()
      let sinModo = false
      // si la base todavía no tiene la columna del modo, se guarda todo lo demás igual
      if (error && /template_modo/.test(`${error.message || ''} ${(error as any).details || ''}`)) {
        const { template_modo: _m, ...resto } = datos
        ;({ error, data } = await supabase.from('luma_links_profiles').update(resto).eq('id', perfil.id).select())
        sinModo = !error
      }
      if (error) { toast('No se pudo guardar: ' + error.message, 'error'); return }
      if (!data || data.length === 0) {
        toast('No se pudo guardar tu perfil. Volvé a iniciar sesión e intentá de nuevo.', 'error')
        return
      }
      setGuardadoComo(huella(perfil))
      setMsgExito('Guardado')
      setTimeout(() => setMsgExito(''), 2200)
      toast(sinModo ? 'Guardado. El modo claro u oscuro se va a guardar cuando termine la actualización de Luma.' : 'Cambios guardados. Tu página ya se ve así.', sinModo ? 'info' : 'success')
    } catch {
      toast('No se pudo guardar. Revisá tu conexión e intentá de nuevo.', 'error')
    } finally { setGuardando(false) }
  }

  async function subirFoto(file: File) {
    if (!perfil) return
    if (!file.type.startsWith('image/')) { toast('Elegí una imagen (JPG, PNG o WEBP).', 'error'); return }
    setSubiendoFoto(true)
    try {
      const comprimida = await comprimirImagen(file, 1500)
      const supabase = createClient()
      const path = `${perfil.id}/${Date.now()}.jpg`
      const { error } = await supabase.storage.from('links-photos').upload(path, comprimida, { upsert: true })
      if (error) { toast('No se pudo subir la foto: ' + error.message, 'error'); return }
      const { data } = supabase.storage.from('links-photos').getPublicUrl(path)
      setPerfil(p => p ? { ...p, foto_url: data.publicUrl } : p)
      toast('Foto lista. Guardá para que se vea en tu página.', 'success')
    } catch (err: any) {
      toast(err?.message || 'No se pudo subir la foto.', 'error')
    } finally {
      setSubiendoFoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function subirImagenDescargable(i: number, file: File) {
    if (!perfil) return
    if (!file.type.startsWith('image/')) { toast('Elegí una imagen (JPG, PNG o WEBP).', 'error'); return }
    setSubiendoPortada(i)
    try {
      const comprimida = await comprimirImagen(file, 1500)
      const supabase = createClient()
      const path = `${perfil.id}/descargable-${i}-${Date.now()}.jpg`
      const { error } = await supabase.storage.from('links-photos').upload(path, comprimida, { upsert: true })
      if (error) { toast('No se pudo subir la portada: ' + error.message, 'error'); return }
      const { data } = supabase.storage.from('links-photos').getPublicUrl(path)
      editarLink(i, 'imagen_url', data.publicUrl)
      toast('Portada lista. Guardá para que se vea.', 'success')
    } catch (err: any) {
      toast(err?.message || 'No se pudo subir la imagen.', 'error')
    } finally { setSubiendoPortada(null) }
  }

  // para saber si hay cambios sin guardar
  function huella(p: Perfil) {
    return JSON.stringify([p.nombre, p.profesion, p.bio, p.foto_url, p.template, p.template_modo ?? null, p.links, p.promo])
  }

  function agregarLink() {
    if (!perfil) return
    setPerfil({ ...perfil, links: [...perfil.links, { tipo: 'instagram', titulo: '', url: '' }] })
    setAbierto(perfil.links.length)
    toast('Link nuevo agregado. Completalo y guardá.', 'success')
  }
  function editarLink(i: number, campo: keyof Link, valor: string) {
    setPerfil(p => {
      if (!p) return p
      const nuevo = [...p.links]
      nuevo[i] = { ...nuevo[i], [campo]: valor }
      // al elegir WhatsApp se propone el mensaje que le llega
      if (campo === 'tipo' && valor === 'whatsapp' && nuevo[i].mensaje === undefined) nuevo[i].mensaje = MENSAJE_WHATSAPP_DEFAULT
      return { ...p, links: nuevo }
    })
  }
  function eliminarLink(i: number) {
    if (!perfil) return
    const link = perfil.links[i]
    setPerfil({ ...perfil, links: perfil.links.filter((_, j) => j !== i) })
    setAbierto(null)
    setBorrado({ link, i })
    if (timerBorrado.current) clearTimeout(timerBorrado.current)
    timerBorrado.current = setTimeout(() => setBorrado(null), 8000)
    toast('Link borrado. Podés deshacerlo.', 'info')
  }
  function deshacerBorrado() {
    if (!perfil || !borrado) return
    const links = [...perfil.links]
    links.splice(Math.min(borrado.i, links.length), 0, borrado.link)
    setPerfil({ ...perfil, links })
    setBorrado(null)
    toast('Listo, el link volvió.', 'success')
  }
  function moverLink(desde: number, hasta: number) {
    if (!perfil || desde === hasta || hasta < 0 || hasta >= perfil.links.length) return
    const links = [...perfil.links]
    const [l] = links.splice(desde, 1)
    links.splice(hasta, 0, l)
    setPerfil({ ...perfil, links })
    if (abierto === desde) setAbierto(hasta)
    toast('Orden cambiado.', 'success')
  }
  function editarPromo(campo: keyof Promo, valor: string | boolean) {
    if (!perfil) return
    setPerfil({ ...perfil, promo: { ...perfil.promo, [campo]: valor } })
  }
  function alternarPromo() {
    if (!perfil) return
    const activa = !perfil.promo.activa
    editarPromo('activa', activa)
    toast(activa ? 'Promo activada. Se ve en tu página cuando guardes.' : 'Promo apagada.', activa ? 'success' : 'info')
  }
  function elegirPlantilla(id: string) {
    if (!perfil || perfil.template === id) return
    setPerfil({ ...perfil, template: id })
    toast(`Plantilla ${PLANTILLAS.find(p => p.id === id)?.nombre}. Mirala en la vista previa.`, 'success')
  }
  function elegirModo(m: 'claro' | 'oscuro') {
    if (!perfil) return
    if (modoValido(perfil.template_modo, plantillaValida(perfil.template)) === m) return
    setPerfil({ ...perfil, template_modo: m })
    toast(m === 'claro' ? 'Tu página ahora es clara.' : 'Tu página ahora es oscura.', 'success')
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
      try { document.execCommand('copy') } catch { toast('Copiá tu link: ' + url, 'info'); return }
      finally { document.body.removeChild(area) }
    }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
    toast('Link copiado. Pegalo en tu bio.', 'success')
  }

  async function compartirLink() {
    const url = linkPublico()
    if (!url || !navigator.share) return
    try {
      await navigator.share({ title: perfil?.nombre || 'Mis links', url })
    } catch { /* cerró el menú de compartir: no pasa nada */ }
  }

  async function cerrarSesion() {
    if (hayCambios && !confirm('Tenés cambios sin guardar. ¿Salir igual?')) return
    const supabase = createClient()
    await supabase.auth.signOut()
    toast('Cerraste sesión. ¡Hasta pronto!', 'info')
    router.push('/links/login')
  }

  function irA(id: string, p: Pestana) {
    setSeccion(id)
    setPestana(p)
    requestAnimationFrame(() => document.getElementById('lk-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }
  function cambiarPestana(p: Pestana) {
    setPestana(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) return (
    <div className="lk-carga">
      <style>{`.lk-carga{min-height:100vh;background:#F5EEE4;display:flex;align-items:center;justify-content:center;font:600 14px 'Inter',sans-serif;color:#6E7388;gap:10px}.lk-carga i{width:16px;height:16px;border-radius:50%;border:2px solid #E6DCCE;border-top-color:#27344A;animation:lkg 1s linear infinite}@keyframes lkg{to{transform:rotate(360deg)}}`}</style>
      <i aria-hidden="true" />Cargando tu página…
    </div>
  )
  if (!perfil || sinPerfil) return (
    <div style={{ minHeight: '100vh', background: '#F5EEE4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', fontFamily: "'Inter',sans-serif", color: '#27344A', padding: '24px', textAlign: 'center' }}>
      <b style={{ font: "800 20px 'Manrope',sans-serif" }}>No encontramos tu página de Luma Links</b>
      <span style={{ fontSize: '14px', color: '#6E7388' }}>Probá cerrar sesión y volver a entrar.</span>
      <button onClick={cerrarSesion} style={{ height: '44px', padding: '0 18px', borderRadius: '12px', border: 'none', background: '#27344A', color: '#F0E6D8', fontWeight: 700, cursor: 'pointer' }}>Cerrar sesión</button>
    </div>
  )

  const idPlantilla = plantillaValida(perfil.template)
  const modo = modoValido(perfil.template_modo, idPlantilla)
  const t = temaPublico(idPlantilla, modo)
  const host = typeof window !== 'undefined' ? window.location.host : 'lumaapp.lat'
  const nombreCorto = (perfil.nombre || '').trim().split(/\s|·/)[0] || ''
  const promoSinLink = perfil.promo.activa && !perfil.promo.url.trim()

  return (
    <div className="lk" data-pestana={pestana}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,700..900,100&display=swap" />
      <style>{`
        .lk{--bg:#F5EEE4;--card:#FFFCF7;--input:#FBF7F1;--borde:#E6DCCE;--borde2:#EFE7DB;--tinta:#27344A;--tinta2:#6E7388;--suave:#9A9CAE;--azul:#4C5580;--lav:#626B91;
          min-height:100vh;background:var(--bg);font-family:'Inter',sans-serif;color:var(--tinta);letter-spacing:-0.01em;display:flex}
        .lk *{box-sizing:border-box}
        .lk button{font-family:inherit}
        .lk :is(button,a,input,textarea,select):focus-visible{outline:2px solid var(--lav);outline-offset:2px}
        .lk-marco-mask{-webkit-mask:url('/landing/tarotista.png') center / 100% 119.4% no-repeat;mask:url('/landing/tarotista.png') center / 100% 119.4% no-repeat}
        /* menú al costado (compu) */
        .lk-menu{width:220px;flex-shrink:0;padding:22px 12px;background:linear-gradient(165deg,#FBF6EE 0%,#F4EDE4 50%,#EEE7EF 100%);border-right:1px solid var(--borde2);display:flex;flex-direction:column;gap:4px;position:sticky;top:0;height:100vh}
        .lk-marca{padding:0 8px 18px;display:flex;flex-direction:column;gap:2px}
        .lk-marca b{font:800 21px 'Manrope',sans-serif}.lk-marca b span{font-weight:600;color:var(--lav)}
        .lk-marca small{font-size:11px;color:var(--suave)}
        .lk-nav{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;border:none;background:transparent;color:var(--tinta2);font-size:13.5px;font-weight:500;cursor:pointer;text-align:left;transition:background .2s,box-shadow .2s,color .2s}
        .lk-nav:hover{background:rgba(255,252,247,.6)}
        .lk-nav.act{background:var(--card);box-shadow:0 2px 10px rgba(39,52,74,.07);color:var(--tinta);font-weight:600}
        .lk-upg{padding:14px;border-radius:18px;background:linear-gradient(135deg,#27344A,#1F2A3D);color:#F0E6D8;display:flex;flex-direction:column;gap:8px}
        .lk-upg b{font:900 17px/1.15 'Fraunces',serif;font-variation-settings:'SOFT' 100}
        .lk-upg span{font-size:12px;color:#C9C0D9;line-height:1.45}
        .lk-upg a{align-self:flex-start;padding:8px 12px;border-radius:10px;background:#F0E6D8;color:#27344A;font-size:12px;font-weight:700;text-decoration:none}
        .lk-cuenta{margin-top:10px;display:flex;align-items:center;gap:10px;padding:10px;border-radius:14px;background:var(--card);border:1px solid var(--borde2)}
        .lk-av{width:34px;height:34px;border-radius:50%;background:#DCD3E6;display:flex;align-items:center;justify-content:center;font:800 14px 'Manrope',sans-serif;color:var(--azul);flex-shrink:0;overflow:hidden}
        .lk-av img{width:100%;height:100%;object-fit:cover}
        .lk-cuenta-txt{display:flex;flex-direction:column;flex:1;min-width:0}.lk-cuenta-txt b{font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lk-cuenta-txt span{font-size:11px;color:var(--suave)}
        .lk-icono{width:34px;height:34px;border-radius:10px;border:none;background:transparent;color:var(--suave);display:flex;align-items:center;justify-content:center;cursor:pointer}
        .lk-icono:hover{background:var(--input);color:var(--tinta)}
        /* cuerpo */
        .lk-cuerpo{flex:1;min-width:0;display:flex;gap:16px;padding:16px 16px 104px}
        .lk-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:14px}
        .lk-head{background:linear-gradient(139deg,#27344A 0%,#1F2A3D 100%);color:#F0E6D8;border-radius:22px;padding:16px 18px;display:flex;flex-direction:column;gap:12px}
        .lk-head-top{display:flex;align-items:center;justify-content:space-between;gap:12px}
        .lk-head h1{margin:0;font:800 18px 'Manrope',sans-serif}
        .lk-head-sub{font-size:11.5px;color:#C9C0D9;margin-top:2px}
        .lk-head-acc{display:flex;gap:6px}
        .lk-hbtn{height:30px;padding:0 12px;border-radius:9px;background:rgba(240,230,216,.1);border:1px solid rgba(240,230,216,.2);color:#F0E6D8;display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;text-decoration:none;cursor:pointer;transition:background .2s,transform .15s}
        .lk-hbtn:hover{background:rgba(240,230,216,.18)}
        .lk-hbtn:active,.lk-cbtn:active,.lk-guardar:active{transform:scale(.97)}
        .lk-link-fila{display:flex;gap:8px;align-items:center}
        .lk-link-pub{flex:1;min-width:0;height:38px;padding:0 14px;border-radius:11px;background:rgba(240,230,216,.08);border:1px solid rgba(240,230,216,.18);display:flex;align-items:center;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .lk-cbtn{height:38px;padding:0 14px;border-radius:11px;border:none;background:#F0E6D8;color:#27344A;font-size:12.5px;font-weight:700;display:inline-flex;align-items:center;gap:6px;cursor:pointer;flex-shrink:0;transition:background .2s,transform .15s}
        .lk-cbtn.ok{background:#9FD8B0}
        .lk-cbtn.claro{background:transparent;border:1px solid rgba(240,230,216,.25);color:#F0E6D8;font-weight:600}
        .lk-tabs{display:none}
        .lk-cols{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;align-items:start}
        .lk-col{display:flex;flex-direction:column;gap:14px;min-width:0}
        .lk-card{background:var(--card);border:1px solid var(--borde);border-radius:22px;padding:16px;display:flex;flex-direction:column;gap:12px;scroll-margin-top:16px}
        .lk-h2{margin:0;font:800 16px 'Manrope',sans-serif}
        .lk-h3{margin:0;font:800 14px 'Manrope',sans-serif}
        .lk-sec-cabeza{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
        .lk-nota{font-size:11.5px;color:var(--tinta2);line-height:1.45}
        .lk-campo{display:flex;flex-direction:column;gap:4px;font-size:11.5px;font-weight:700;color:var(--tinta2)}
        .lk-campo small{font-weight:500}
        .lk-in{width:100%;height:40px;border-radius:11px;border:1px solid var(--borde);background:var(--input);padding:0 12px;font:500 13.5px 'Inter',sans-serif;color:var(--tinta);outline:none;transition:border-color .2s,box-shadow .2s,background .2s}
        textarea.lk-in{height:auto;min-height:60px;padding:10px 12px;resize:vertical;line-height:1.4}
        .lk-in:focus{border-color:var(--lav);background:#fff;box-shadow:0 0 0 3px rgba(98,107,145,.12)}
        .lk-in::placeholder{color:#B5B3C2}
        .lk-seg{display:flex;gap:3px;padding:3px;border-radius:12px;background:var(--input);border:1px solid var(--borde2)}
        .lk-seg button{border:none;background:transparent;padding:7px 13px;border-radius:9px;font-size:12px;font-weight:700;color:var(--suave);cursor:pointer;transition:background .2s,color .2s,box-shadow .2s}
        .lk-seg button.act{background:var(--card);color:var(--tinta);box-shadow:0 2px 8px rgba(0,0,0,.1)}
        /* números */
        .lk-est{display:flex;flex-direction:column;gap:10px;scroll-margin-top:16px}
        .lk-est-grilla{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
        .lk-est-w{position:relative;overflow:hidden;border-radius:18px;padding:12px 14px;display:flex;flex-direction:column;gap:3px;min-height:96px}
        .lk-est-w.rosa{background:#F6E4E2;border:1px solid #EBCBC8;color:#6E3433}
        .lk-est-w.azul{background:#E6E9F2;border:1px solid #D2D8E8;color:#27344A}
        .lk-est-w.lavanda{background:#DCD3E6;color:#27344A;justify-content:space-between}
        .lk-est-w.blanco{background:var(--card);border:1px solid var(--borde);gap:6px}
        .lk-est-blob{position:absolute;width:60px;height:60px;border-radius:50%;top:-16px;right:-16px;opacity:.3;background:#D6A6A5}
        .azul .lk-est-blob{background:#626B91;opacity:.25}
        .lk-est-t{font-size:10px;letter-spacing:1.2px;font-weight:700;opacity:.85}
        .lk-est-n{font:800 24px 'Manrope',sans-serif}
        .lk-est-d{font-size:11.5px;opacity:.85;line-height:1.3;overflow-wrap:anywhere}
        .lk-est-dia{font:900 24px 'Fraunces',serif;font-variation-settings:'SOFT' 100;text-transform:capitalize}
        .lk-est-orig{display:flex;align-items:center;gap:8px;font-size:11.5px}
        .lk-est-orig>span:first-child{width:64px;color:var(--azul);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .lk-est-orig b{width:32px;text-align:right}
        .lk-est-bar{flex:1;height:6px;border-radius:3px;background:var(--borde2);overflow:hidden;display:block}
        .lk-est-bar span{display:block;height:100%;border-radius:3px;background:#626B91;animation:lkBarra 1s cubic-bezier(.2,.8,.2,1) both;transform-origin:left}
        @keyframes lkBarra{from{transform:scaleX(0)}to{transform:scaleX(1)}}
        .lk-est-lista{gap:8px}
        .lk-est-fila-top{display:flex;justify-content:space-between;gap:10px;font-size:13px;margin-bottom:4px}
        .lk-est-fila-top span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .lk-est-upsell{background:linear-gradient(135deg,#27344A,#1F2A3D);color:#F0E6D8;border-radius:18px;padding:14px 16px;font-size:13px;line-height:1.5;display:flex;flex-direction:column;gap:10px}
        .lk-est-upsell a{align-self:flex-start;background:#F0E6D8;color:#27344A;font-weight:700;font-size:12.5px;padding:8px 14px;border-radius:10px;text-decoration:none}
        .lk-est-vacio{display:flex;align-items:center;gap:12px;padding:16px;border-radius:18px;background:var(--card);border:1px dashed #C9BFD6;font-size:13.5px;color:var(--tinta2);line-height:1.45}
        .lk-est-vacio svg{color:var(--lav);flex-shrink:0}
        .lk-cargando{background:linear-gradient(90deg,#EFE7DB 25%,#F7F1E8 50%,#EFE7DB 75%);background-size:200% 100%;animation:lkBrillo 1.4s ease-in-out infinite}
        @keyframes lkBrillo{from{background-position:200% 0}to{background-position:-200% 0}}
        /* perfil con arco */
        .lk-perfil{display:flex;gap:16px;align-items:center}
        .lk-foto{position:relative;width:108px;flex-shrink:0;border:none;padding:0;background:transparent;cursor:pointer}
        .lk-foto-marco{position:relative;width:100%;aspect-ratio:1080/1608}
        .lk-foto-carta{position:absolute;left:6.1%;width:87.8%;top:10.6%;height:78.1%;overflow:hidden;border-radius:50% 50% 0 0 / 37.7% 37.7% 0 0;border:2px solid;display:flex;align-items:center;justify-content:center;font:600 36px 'Cormorant Garamond',serif}
        .lk-foto-carta img{width:100%;height:100%;object-fit:cover;display:block}
        .lk-foto-linea{position:absolute;inset:0;pointer-events:none}
        .lk-foto-cam{position:absolute;bottom:2px;left:50%;transform:translateX(-50%);width:30px;height:30px;border-radius:50%;background:#27344A;color:#F0E6D8;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(39,52,74,.3);transition:transform .2s}
        .lk-foto:hover .lk-foto-cam{transform:translateX(-50%) scale(1.08)}
        .lk-foto-cargando{position:absolute;inset:10% 6% 12%;border-radius:50% 50% 0 0 / 37.7% 37.7% 0 0;background:rgba(39,52,74,.45);display:flex;align-items:center;justify-content:center}
        .lk-girar{width:20px;height:20px;border-radius:50%;border:2px solid rgba(240,230,216,.4);border-top-color:#F0E6D8;animation:lkg 1s linear infinite}
        @keyframes lkg{to{transform:rotate(360deg)}}
        .lk-perfil-campos{display:flex;flex-direction:column;gap:8px;flex:1;min-width:0}
        /* plantillas */
        .lk-tpls{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
        .lk-tpl{display:flex;flex-direction:column;gap:6px;padding:8px;border-radius:14px;border:2px solid transparent;cursor:pointer;text-align:left;transition:transform .2s,box-shadow .2s,border-color .2s;box-shadow:0 2px 8px rgba(0,0,0,.08)}
        .lk-tpl:hover{transform:translateY(-2px)}
        .lk-tpl.act{box-shadow:0 6px 16px rgba(0,0,0,.14)}
        .lk-tpl-franja{height:26px;border-radius:9px;display:flex;align-items:center;justify-content:center}
        .lk-tpl-franja i{width:44%;height:8px;border-radius:5px;display:block}
        .lk-tpl b{font:700 15px 'Cormorant Garamond',serif}
        /* links */
        .lk-lista{display:flex;flex-direction:column;gap:8px}
        .lk-lnk{border-radius:16px;background:var(--input);border:1px solid var(--borde2);transition:border-color .2s,box-shadow .2s,opacity .2s}
        .lk-lnk.abierto{border:1.5px solid #C9BFD6;box-shadow:0 8px 20px rgba(39,52,74,.08)}
        .lk-lnk.arrastrando{opacity:.45}
        .lk-lnk-fila{display:flex;align-items:center;gap:10px;padding:8px 8px 8px 4px}
        .lk-agarre{color:#C9BFD6;display:flex;cursor:grab;padding:4px 0}
        .lk-lnk-ic{width:34px;height:34px;border-radius:11px;flex-shrink:0;display:flex;align-items:center;justify-content:center}
        .lk-lnk-txt{display:flex;flex-direction:column;min-width:0;flex:1}
        .lk-lnk-txt b{font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .lk-lnk-txt span{font-size:11.5px;color:var(--suave);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .lk-lnk-ed{padding:4px 12px 12px;display:flex;flex-direction:column;gap:10px;animation:lkAbre .25s ease both}
        @keyframes lkAbre{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
        .lk-lnk-ed .lk-in{background:var(--card)}
        .lk-lnk-acc{display:flex;justify-content:space-between;align-items:center;gap:8px}
        .lk-mini{height:34px;padding:0 10px;border-radius:10px;border:1px solid var(--borde);background:var(--card);color:var(--azul);font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:5px;cursor:pointer}
        .lk-mini:disabled{opacity:.4;cursor:default}
        .lk-mini.rojo{border:none;background:transparent;color:#A24B47}
        .lk-portada{display:flex;gap:10px;align-items:center}
        .lk-portada-img{width:72px;height:40px;border-radius:8px;overflow:hidden;flex-shrink:0;background:#F7ECD3;display:flex;align-items:center;justify-content:center;color:#8A6A22}
        .lk-portada-img img{width:100%;height:100%;object-fit:cover}
        .lk-portada label{font-size:12.5px;color:var(--azul);font-weight:700;cursor:pointer}
        .lk-agregar{height:44px;border-radius:14px;border:1.5px dashed #C9BFD6;background:transparent;color:var(--azul);font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;transition:background .2s}
        .lk-agregar:hover{background:var(--input)}
        .lk-deshacer{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:12px;background:#F7ECD3;color:#5A4416;font-size:12.5px;font-weight:600;animation:lkAbre .25s ease both}
        .lk-deshacer button{border:none;background:#5A4416;color:#F7ECD3;height:30px;padding:0 12px;border-radius:9px;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:5px;cursor:pointer}
        .lk-vacio-links{padding:16px;border-radius:14px;background:var(--input);font-size:13px;color:var(--tinta2);text-align:center}
        /* promo */
        .lk-promo{background:#F7ECD3;border:1px solid #E9D6A6;border-radius:22px;padding:16px;display:flex;flex-direction:column;gap:10px;scroll-margin-top:16px}
        .lk-promo .lk-in{background:#FFFCF7;border-color:#E9D6A6}
        .lk-promo .lk-campo{color:#6E5A2E}
        .lk-promo-t{font-size:10.5px;letter-spacing:1.3px;font-weight:700;color:#8A6A22}
        .lk-switch{width:44px;height:26px;border-radius:13px;border:none;position:relative;cursor:pointer;transition:background .25s;flex-shrink:0}
        .lk-switch i{position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#FFFCF7;transition:transform .25s;box-shadow:0 1px 3px rgba(0,0,0,.2)}
        .lk-switch[aria-checked="true"]{background:#8A6A22}.lk-switch[aria-checked="true"] i{transform:translateX(18px)}
        .lk-switch[aria-checked="false"]{background:#D9C7A0}
        .lk-promo-aviso{font-size:12px;font-weight:600;color:#A24B47}
        /* vista previa */
        .lk-previa{width:300px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:10px;position:sticky;top:16px;align-self:flex-start}
        .lk-previa-t{font-size:10.5px;letter-spacing:1.3px;font-weight:700;color:var(--tinta2)}
        .lk-tel{width:286px;height:590px;padding:7px;border-radius:40px;background:#1F2A3D;box-shadow:0 22px 44px rgba(39,52,74,.25)}
        .lk-tel .lk-pv{border-radius:34px;height:100%}
        .lk-pv{overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;align-items:center;padding:24px 16px 20px;gap:6px;transition:background .5s;scrollbar-width:none}
        .lk-pv::-webkit-scrollbar{display:none}
        .lk-pv-marco{position:relative;width:138px;aspect-ratio:1080/1608;flex-shrink:0}
        .lk-pv-carta{position:absolute;left:6.1%;width:87.8%;top:10.6%;height:78.1%;overflow:hidden;border-radius:50% 50% 0 0 / 37.7% 37.7% 0 0;border:2px solid;display:flex;align-items:center;justify-content:center;font:600 44px 'Cormorant Garamond',serif;transition:all .5s}
        .lk-pv-carta img{width:100%;height:100%;object-fit:cover}
        .lk-pv-linea{position:absolute;inset:0;transition:background .5s}
        .lk-pv-nombre{font:600 22px 'Cormorant Garamond',serif;text-align:center;line-height:1.05}
        .lk-pv-prof{font-size:9px;letter-spacing:2px;font-weight:700;text-transform:uppercase}
        .lk-pv-bio{font-size:10.5px;text-align:center;line-height:1.4;max-width:220px}
        .lk-pv-links{width:100%;display:flex;flex-direction:column;gap:8px;margin-top:6px}
        .lk-pv-link{display:flex;align-items:center;gap:9px;padding:11px 12px;border-radius:12px 12px 26px 26px;border:1px solid;font:600 14px 'Cormorant Garamond',serif}
        .lk-pv-link>span:last-child{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .lk-pv-ic{width:24px;height:24px;border-radius:50%;border:1px solid;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .lk-pv-vacio{padding:14px;border-radius:12px;border:1px dashed;font-size:11px;text-align:center}
        .lk-pv-promo{width:100%;text-align:center;padding:11px;border-radius:13px;font-size:12px;font-weight:800;margin-top:4px}
        .lk-previa-nota{font-size:11.5px;color:var(--suave);text-align:center}
        .lk-solo-celu{display:none !important}
        .lk-mini-previa{display:flex;align-items:center;gap:12px}
        .lk-mini-tel{width:74px;height:120px;flex-shrink:0;border-radius:16px;background:#1F2A3D;padding:3px;overflow:hidden}
        .lk-mini-tel>div{width:100%;height:100%;border-radius:13px;display:flex;flex-direction:column;align-items:center;padding-top:10px;gap:5px}
        .lk-mini-tel span{display:block}
        .lk-previa-celu{display:flex;justify-content:center;animation:lkAbre .3s ease both}
        .lk-previa-celu .lk-pv{width:100%;max-width:330px;border-radius:26px;max-height:560px;border:6px solid #1F2A3D}
        .lk-txt-btn{border:none;background:transparent;color:var(--azul);font-size:12.5px;font-weight:700;padding:6px 0;cursor:pointer;text-align:left}
        /* barra de guardar */
        .lk-barra{position:fixed;left:236px;right:16px;bottom:16px;z-index:30;height:60px;padding:0 10px 0 18px;border-radius:20px;background:rgba(255,252,247,.95);border:1px solid var(--borde);box-shadow:0 12px 30px rgba(39,52,74,.14);display:flex;align-items:center;justify-content:space-between;gap:10px;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
        .lk-estado{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--tinta2)}
        .lk-estado i{width:8px;height:8px;border-radius:50%;background:#C9BFD6}
        .lk-estado.pend{color:#8A5A0B}.lk-estado.pend i{background:#D9A62E;animation:lkLatido 1.6s ease-in-out infinite}
        .lk-estado.ok{color:#3E7D57}.lk-estado.ok i{background:#3E7D57}
        @keyframes lkLatido{0%,100%{transform:scale(1)}50%{transform:scale(1.5)}}
        .lk-guardar{height:42px;padding:0 22px;border-radius:13px;border:none;background:linear-gradient(135deg,#27344A,#4C5580);color:#F0E6D8;font-size:13.5px;font-weight:700;cursor:pointer;transition:transform .15s,opacity .2s}
        .lk-guardar:disabled{background:#E6DCCE;color:#9A9CAE;cursor:default}
        .lk-atajo{font-size:11px;color:var(--suave);margin-right:6px}
        .lk-corto{display:none}
        @media(max-width:1279px){.lk-previa{display:none}}
        @media(max-width:1279px) and (min-width:1024px){.lk-solo-celu.lk-previa-card{display:flex !important}}
        @media(max-width:1023px){
          .lk{display:block}
          .lk-menu{display:none}
          .lk-cuerpo{padding:12px 12px 100px}
          .lk-head{border-radius:20px;padding:14px}
          .lk-head h1{font-size:15px}
          .lk-cols{grid-template-columns:minmax(0,1fr)}
          .lk-tabs{display:flex;gap:4px;padding:4px;border-radius:14px;background:var(--card);border:1px solid var(--borde2);position:sticky;top:8px;z-index:20;box-shadow:0 6px 16px rgba(39,52,74,.06)}
          .lk-tabs button{flex:1;height:38px;border-radius:10px;border:none;background:transparent;color:var(--tinta2);font-size:12.5px;font-weight:600;cursor:pointer;transition:background .2s,color .2s}
          .lk-tabs button.act{background:#27344A;color:#F0E6D8;font-weight:700}
          .lk[data-pestana="pagina"] [data-g]:not([data-g="pagina"]),
          .lk[data-pestana="links"] [data-g]:not([data-g="links"]),
          .lk[data-pestana="numeros"] [data-g]:not([data-g="numeros"]){display:none !important}
          .lk-solo-celu{display:flex !important}
          .lk-est-grilla{grid-template-columns:repeat(2,minmax(0,1fr))}
          .lk-in{font-size:16px}
          .lk-barra{left:10px;right:10px;bottom:calc(12px + env(safe-area-inset-bottom));height:58px;padding:0 8px 0 14px}
          .lk-atajo{display:none}
          .lk-largo{display:none}.lk-corto{display:inline}
          .lk-link-pub{font-size:11.5px;padding:0 10px;height:34px}
          .lk-cbtn{height:34px;width:34px;padding:0;justify-content:center}
          .lk-cbtn .lk-txt{display:none}
        }
        @media(max-width:420px){.lk-head-acc .lk-hbtn .lk-txt{display:none}.lk-hbtn{padding:0 9px}}
        @media (prefers-reduced-motion:reduce){.lk *{animation:none !important;transition:none !important}}
      `}</style>

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => e.target.files?.[0] && subirFoto(e.target.files[0])} />

      <nav className="lk-menu" aria-label="Menú de Luma Links">
        <div className="lk-marca"><b>Luma <span>Links</span></b><small>tu link, en orden</small></div>
        <button type="button" className={`lk-nav${seccion === 'perfil' ? ' act' : ''}`} onClick={() => irA('perfil', 'pagina')}><Home size={16} />Mi página</button>
        <button type="button" className={`lk-nav${seccion === 'links' ? ' act' : ''}`} onClick={() => irA('links', 'links')}><LinkIcon size={16} />Links</button>
        <button type="button" className={`lk-nav${seccion === 'promo' ? ' act' : ''}`} onClick={() => irA('promo', 'links')}><Sparkles size={16} />Promo de cartas</button>
        <button type="button" className={`lk-nav${seccion === 'numeros' ? ' act' : ''}`} onClick={() => irA('numeros', 'numeros')}><BarChart3 size={16} />Números</button>
        <div style={{ flexGrow: 1 }} />
        <div className="lk-upg">
          <b>Tu link puede ser una página con reservas</b>
          <span>Servicios, agenda, cobros y cursos, todo en Luma.</span>
          <a href="/pasar-a-luma">Ver planes</a>
        </div>
        <div className="lk-cuenta">
          <span className="lk-av">{perfil.foto_url ? <img src={perfil.foto_url} alt="" /> : (nombreCorto.charAt(0).toUpperCase() || 'L')}</span>
          <span className="lk-cuenta-txt"><b>{perfil.nombre || 'Mi página'}</b><span>Luma Links</span></span>
          <button type="button" className="lk-icono" onClick={cerrarSesion} aria-label="Salir"><LogOut size={15} /></button>
        </div>
      </nav>

      <div className="lk-cuerpo">
        <main className="lk-main">
          <header className="lk-head">
            <div className="lk-head-top">
              <div><h1>{saludo()}{nombreCorto ? `, ${nombreCorto}` : ''}</h1><div className="lk-head-sub">Así está tu link hoy</div></div>
              <div className="lk-head-acc">
                <a href={`/l/${perfil.slug}`} target="_blank" rel="noopener noreferrer" className="lk-hbtn"><Eye size={13} /><span className="lk-txt">Ver mi página</span></a>
                <button type="button" className="lk-hbtn lk-solo-celu" onClick={cerrarSesion} aria-label="Salir"><LogOut size={13} /></button>
              </div>
            </div>
            <div className="lk-link-fila">
              <span className="lk-link-pub">{host}/l/<b>{perfil.slug}</b></span>
              <button type="button" onClick={copiarLink} className={`lk-cbtn${copiado ? ' ok' : ''}`} aria-label="Copiar link">
                {copiado ? <Check size={14} /> : <Copy size={14} />}<span className="lk-txt">{copiado ? 'Copiado' : 'Copiar link'}</span>
              </button>
              {puedeCompartir && (
                <button type="button" onClick={compartirLink} className="lk-cbtn claro" aria-label="Compartir"><Share2 size={14} /><span className="lk-txt">Compartir</span></button>
              )}
            </div>
          </header>

          <div className="lk-tabs" role="tablist" aria-label="Secciones">
            <button type="button" role="tab" aria-selected={pestana === 'pagina'} className={pestana === 'pagina' ? 'act' : ''} onClick={() => cambiarPestana('pagina')}>Mi página</button>
            <button type="button" role="tab" aria-selected={pestana === 'links'} className={pestana === 'links' ? 'act' : ''} onClick={() => cambiarPestana('links')}>Links</button>
            <button type="button" role="tab" aria-selected={pestana === 'numeros'} className={pestana === 'numeros' ? 'act' : ''} onClick={() => cambiarPestana('numeros')}>Números</button>
          </div>

          <div data-g="numeros" id="lk-numeros" style={{ scrollMarginTop: '16px' }}><EstadisticasLinks /></div>

          <div className="lk-cols">
            <div className="lk-col">
              <section id="lk-perfil" data-g="pagina" className="lk-card" aria-labelledby="lk-t-perfil">
                <h2 id="lk-t-perfil" className="lk-h2">Tu perfil</h2>
                <div className="lk-perfil">
                  <button type="button" className="lk-foto" onClick={() => fileInputRef.current?.click()} aria-label="Cambiar tu foto" disabled={subiendoFoto}>
                    <span className="lk-foto-marco" style={{ display: 'block' }}>
                      <span className="lk-foto-carta" style={{ borderColor: t.label, background: t.foto, color: t.fotoTxt, boxShadow: `0 0 18px 2px ${alfa(t.acento, 0.5)}` }}>
                        {perfil.foto_url ? <img src={perfil.foto_url} alt="" /> : (nombreCorto.charAt(0).toUpperCase() || t.deco)}
                      </span>
                      <span className="lk-foto-linea lk-marco-mask" style={{ background: t.label }} aria-hidden="true" />
                      {subiendoFoto && <span className="lk-foto-cargando"><i className="lk-girar" /></span>}
                    </span>
                    <span className="lk-foto-cam" aria-hidden="true"><Camera size={14} /></span>
                  </button>
                  <div className="lk-perfil-campos">
                    <label className="lk-campo">Nombre<input className="lk-in" value={perfil.nombre} onChange={e => setPerfil({ ...perfil, nombre: e.target.value })} /></label>
                    <label className="lk-campo">Profesión<input className="lk-in" value={perfil.profesion} placeholder="Ej: Tarotista" onChange={e => setPerfil({ ...perfil, profesion: e.target.value })} /></label>
                  </div>
                </div>
                <label className="lk-campo">
                  <span>Bio corta <small>({(perfil.bio || '').length} de 120)</small></span>
                  <textarea className="lk-in" value={perfil.bio} maxLength={120} rows={2} onChange={e => setPerfil({ ...perfil, bio: e.target.value })} />
                </label>
                <span className="lk-nota">Foto vertical, como una historia. Se muestra adentro del arco con estrellas, con el color de tu plantilla.</span>
              </section>

              <section data-g="pagina" className="lk-card" aria-labelledby="lk-t-estilo">
                <div className="lk-sec-cabeza">
                  <h2 id="lk-t-estilo" className="lk-h2">Estilo</h2>
                  <div className="lk-seg" role="radiogroup" aria-label="Modo">
                    <button type="button" role="radio" aria-checked={modo === 'claro'} className={modo === 'claro' ? 'act' : ''} onClick={() => elegirModo('claro')}>Claro</button>
                    <button type="button" role="radio" aria-checked={modo === 'oscuro'} className={modo === 'oscuro' ? 'act' : ''} onClick={() => elegirModo('oscuro')}>Oscuro</button>
                  </div>
                </div>
                <div className="lk-tpls" role="radiogroup" aria-label="Plantilla">
                  {PLANTILLAS.map(p => {
                    const tm = temaPublico(p.id, modoValido(perfil.template_modo, p.id))
                    const on = idPlantilla === p.id
                    return (
                      <button type="button" key={p.id} role="radio" aria-checked={on} className={`lk-tpl${on ? ' act' : ''}`} onClick={() => elegirPlantilla(p.id)}
                        style={{ background: tm.fondo, borderColor: on ? tm.acento : 'transparent' }}>
                        <span className="lk-tpl-franja" style={{ background: tm.banda }}><i style={{ background: tm.acento }} /></span>
                        <b style={{ color: tm.texto }}>{p.nombre}</b>
                      </button>
                    )
                  })}
                </div>
                <span className="lk-nota">Las mismas plantillas de la página de reservas de Luma.</span>
              </section>

              <section data-g="pagina" className="lk-card lk-solo-celu lk-previa-card" aria-label="Vista previa">
                <div className="lk-mini-previa">
                  <div className="lk-mini-tel" aria-hidden="true">
                    <div style={{ background: t.fondo }}>
                      <span style={{ width: '32px', height: '44px', borderRadius: '16px 16px 2px 2px', border: `1.5px solid ${t.label}`, background: t.foto, boxShadow: `0 0 8px ${alfa(t.acento, 0.6)}` }} />
                      <span style={{ width: '54px', height: '9px', borderRadius: '4px 4px 7px 7px', background: alfa(t.superficie, 0.9), border: `1px solid ${alfa(t.texto, 0.14)}` }} />
                      <span style={{ width: '54px', height: '9px', borderRadius: '4px 4px 7px 7px', background: alfa(t.superficie, 0.9), border: `1px solid ${alfa(t.texto, 0.14)}` }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                    <b style={{ font: "800 14px 'Manrope',sans-serif" }}>Así se ve con {t.nombre}</b>
                    <span className="lk-nota">Con lo que escribiste, aunque todavía no lo guardes.</span>
                    <button type="button" className="lk-txt-btn" aria-expanded={verPrevia} onClick={() => setVerPrevia(v => !v)}>{verPrevia ? 'Ocultar vista previa' : 'Ver vista previa completa'}</button>
                  </div>
                </div>
                {verPrevia && <div className="lk-previa-celu"><PreviaLinks perfil={perfil} t={t} /></div>}
              </section>

              <section data-g="pagina" className="lk-upg lk-solo-celu" style={{ borderRadius: '20px' }}>
                <b>Tu link puede ser una página con reservas</b>
                <span>Servicios, agenda, cobros y cursos, todo en Luma.</span>
                <a href="/pasar-a-luma">Ver planes</a>
              </section>
            </div>

            <div className="lk-col">
              <section id="lk-links" data-g="links" className="lk-card" aria-labelledby="lk-t-links">
                <div className="lk-sec-cabeza">
                  <h2 id="lk-t-links" className="lk-h2">Tus links</h2>
                  <span className="lk-nota">{perfil.links.length > 1 ? 'Arrastrá o usá las flechas para ordenar' : perfil.links.length === 1 ? '1 link' : ''}</span>
                </div>
                {borrado && (
                  <div className="lk-deshacer" role="status">
                    <span>Borraste «{borrado.link.titulo || TIPOS_LINK.find(x => x.id === borrado.link.tipo)?.label}»</span>
                    <button type="button" onClick={deshacerBorrado}><Undo2 size={13} />Deshacer</button>
                  </div>
                )}
                <div className="lk-lista">
                  {perfil.links.length === 0 && <div className="lk-vacio-links">Todavía no tenés links. Agregá tu WhatsApp, tu Instagram o un descargable.</div>}
                  {perfil.links.map((link, i) => {
                    const Ic = ICONOS[link.tipo] || LinkIcon
                    const [bg, c] = TONOS[link.tipo] || TONOS.otro
                    const tipoLabel = TIPOS_LINK.find(x => x.id === link.tipo)?.label || 'Link'
                    const abre = abierto === i
                    const sub = link.tipo === 'descargable' ? (link.imagen_url ? 'Descargable · con portada' : 'Descargable · sin portada') : (link.url || 'Falta completar el link')
                    return (
                      <div key={i} className={`lk-lnk${abre ? ' abierto' : ''}${arrastrando === i ? ' arrastrando' : ''}`}
                        draggable={!abre}
                        onDragStart={e => { setArrastrando(i); e.dataTransfer.effectAllowed = 'move' }}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => { e.preventDefault(); if (arrastrando !== null) moverLink(arrastrando, i); setArrastrando(null) }}
                        onDragEnd={() => setArrastrando(null)}>
                        <div className="lk-lnk-fila">
                          <span className="lk-agarre" aria-hidden="true"><GripVertical size={16} /></span>
                          <span className="lk-lnk-ic" style={{ background: bg, color: c }}><Ic size={16} /></span>
                          <span className="lk-lnk-txt"><b>{link.titulo || tipoLabel}</b><span>{sub}</span></span>
                          <button type="button" className="lk-icono" aria-expanded={abre} aria-label={abre ? `Cerrar ${link.titulo || tipoLabel}` : `Editar ${link.titulo || tipoLabel}`} onClick={() => setAbierto(abre ? null : i)}>
                            {abre ? <ChevronUp size={16} /> : <Pencil size={15} />}
                          </button>
                        </div>
                        {abre && (
                          <div className="lk-lnk-ed">
                            <label className="lk-campo">Tipo
                              <select className="lk-in" value={link.tipo} onChange={e => editarLink(i, 'tipo', e.target.value)}>
                                {TIPOS_LINK.map(tp => <option key={tp.id} value={tp.id}>{tp.label}</option>)}
                              </select>
                            </label>
                            <label className="lk-campo">Texto del botón<input className="lk-in" value={link.titulo} placeholder={`Ej: ${link.tipo === 'whatsapp' ? 'Reservá por WhatsApp' : 'Mi ' + tipoLabel}`} onChange={e => editarLink(i, 'titulo', e.target.value)} /></label>
                            <label className="lk-campo">{link.tipo === 'whatsapp' ? 'Número' : link.tipo === 'email' ? 'Email' : 'Link'}<input className="lk-in" value={link.url} placeholder={placeholderUrl(link.tipo)} onChange={e => editarLink(i, 'url', e.target.value)} /></label>
                            {link.tipo === 'whatsapp' && (
                              <label className="lk-campo">Mensaje que te llega escrito
                                <input className="lk-in" value={link.mensaje ?? MENSAJE_WHATSAPP_DEFAULT} maxLength={160} onChange={e => editarLink(i, 'mensaje', e.target.value)} />
                                <small className="lk-nota">Así ya sabés que te escriben desde tu página.</small>
                              </label>
                            )}
                            {link.tipo === 'descargable' && (
                              <div className="lk-portada">
                                <span className="lk-portada-img">{subiendoPortada === i ? <i className="lk-girar" style={{ borderColor: 'rgba(138,106,34,.3)', borderTopColor: '#8A6A22' }} /> : link.imagen_url ? <img src={link.imagen_url} alt="" /> : <FileDown size={16} />}</span>
                                <div style={{ flex: 1 }}>
                                  <label>{link.imagen_url ? 'Cambiar portada' : 'Subir portada'}
                                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) subirImagenDescargable(i, e.target.files[0]); e.target.value = '' }} />
                                  </label>
                                  <div className="lk-nota" style={{ marginTop: '2px' }}>Recomendado: 820x312 px aprox. (como una portada de Facebook)</div>
                                </div>
                              </div>
                            )}
                            <div className="lk-lnk-acc">
                              <span style={{ display: 'flex', gap: '6px' }}>
                                <button type="button" className="lk-mini" onClick={() => moverLink(i, i - 1)} disabled={i === 0} aria-label="Subir este link"><ChevronUp size={14} />Subir</button>
                                <button type="button" className="lk-mini" onClick={() => moverLink(i, i + 1)} disabled={i === perfil.links.length - 1} aria-label="Bajar este link"><ChevronDown size={14} />Bajar</button>
                              </span>
                              <button type="button" className="lk-mini rojo" onClick={() => eliminarLink(i)}><Trash2 size={14} />Borrar</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                <button type="button" onClick={agregarLink} className="lk-agregar"><Plus size={15} />Agregar link</button>
              </section>

              <section id="lk-promo" data-g="links" className="lk-promo" aria-labelledby="lk-t-promo">
                <div className="lk-sec-cabeza">
                  <span id="lk-t-promo" className="lk-promo-t">PROMO · ELEGÍ UNA CARTA</span>
                  <button type="button" role="switch" aria-checked={perfil.promo.activa} aria-label="Promo activa" className="lk-switch" onClick={alternarPromo}><i /></button>
                </div>
                <span className="lk-nota" style={{ color: '#6E5A2E' }}>En tu página aparecen 3 cartas para elegir y todas revelan esta promo. Llevalas a tu WhatsApp, tu tienda o donde quieras: ideal para promos de la semana que vas cambiando.</span>
                <label className="lk-campo">Título<input className="lk-in" value={perfil.promo.titulo} placeholder="Ej: 20% en tu primera lectura" onChange={e => editarPromo('titulo', e.target.value)} /></label>
                <label className="lk-campo">Descripción<textarea className="lk-in" value={perfil.promo.descripcion} maxLength={100} rows={2} placeholder="Ej: Válido esta semana para nuevas clientas" onChange={e => editarPromo('descripcion', e.target.value)} /></label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '8px' }}>
                  <label className="lk-campo">Texto del botón<input className="lk-in" value={perfil.promo.texto_boton} placeholder="Ej: Reservar ahora" onChange={e => editarPromo('texto_boton', e.target.value)} /></label>
                  <label className="lk-campo">Link del botón<input className="lk-in" value={perfil.promo.url} placeholder="https://wa.me/... o tu tienda" onChange={e => editarPromo('url', e.target.value)} /></label>
                </div>
                {promoSinLink && <span className="lk-promo-aviso" role="status">Falta el link del botón: sin link, la promo no aparece en tu página.</span>}
              </section>
            </div>
          </div>
        </main>

        <aside className="lk-previa" aria-label="Así se ve tu página">
          <span className="lk-previa-t">ASÍ SE VE TU PÁGINA</span>
          <div className="lk-tel"><PreviaLinks perfil={perfil} t={t} /></div>
          <span className="lk-previa-nota">{hayCambios ? 'Así va a quedar cuando guardes' : 'Así la ve la gente ahora'}</span>
        </aside>
      </div>

      {/* barra fija: siempre a mano, con aviso de cambios sin guardar */}
      <div className="lk-barra">
        <span className={`lk-estado${msgExito ? ' ok' : hayCambios ? ' pend' : ''}`} role="status">
          <i aria-hidden="true" />{msgExito ? 'Guardado' : hayCambios ? <><span className="lk-largo">Tenés cambios sin guardar</span><span className="lk-corto">Sin guardar</span></> : 'Todo guardado'}
        </span>
        <span style={{ display: 'flex', alignItems: 'center' }}>
          {hayCambios && <span className="lk-atajo">Ctrl + S</span>}
          <button type="button" className="lk-guardar" onClick={guardar} disabled={guardando || !hayCambios}>
            {guardando ? 'Guardando…' : <><span className="lk-largo">Guardar cambios</span><span className="lk-corto">Guardar</span></>}
          </button>
        </span>
      </div>
    </div>
  )
}
