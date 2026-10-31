'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Check, Shield, Play, Sparkles, Star, Moon, Clock, BarChart3, Globe, BookOpen, Infinity as InfinityIcon, FileText, Music, StickyNote, Tag, MessageCircle, Gift, Download, Video, Users, Package } from 'lucide-react'
import { IconoArchivo, tipoLegible, pesoLegible } from '@/components/ArchivosDescargable'
import { temaPublico } from '@/lib/plantillas'

type Terapeuta = {
  user_id: string; nombre_profesional: string; especialidad: string
  bio: string; avatar_url: string; slug: string; template?: string; template_modo?: string | null
  whatsapp?: string; mp_activo?: boolean; acepta_transferencia?: boolean; alias_pago?: string
  usd_link?: string | null; usd_cuenta?: string | null; usd_usdt?: string | null
}

type Curso = {
  id: string; titulo: string; slug: string
  descripcion_corta: string; descripcion_larga: string
  imagen_url: string; video_presentacion_url: string
  precio: number; precio_original: number | null
  modalidad: string; nivel: string; idioma: string
  duracion_estimada_horas: number | null
  politica_reembolso: string; dias_garantia: number | null
  para_quien: string[]; que_aprenderas: string[]; requisitos: string[]
  estado: string; user_id: string
  precio_usd?: number | null
  tipo?: string
  bonus?: { nombre: string; detalle: string; tipo: string; valor: number | null }[]
}
type ArchivoPublico = { id: string; nombre: string; tamano: number; es_bonus: boolean; bonus_valor: number | null; orden: number }
const ICONO_BONUS: Record<string, any> = { audio: Music, pdf: FileText, video: Video, vivo: Users, comunidad: Users, otro: Gift }

type Leccion = {
  id: string; titulo: string; tipo: string; duracion_min: number | null
  es_preview: boolean; contenido_url?: string | null
}

type Modulo = {
  id: string; titulo: string; descripcion: string; orden: number
  lecciones?: Leccion[]
}

type Testimonio = {
  id: string; nombre?: string; texto: string; avatar_url?: string; orden: number
}

const ESTRELLAS_HERO = [
  { top: '14%', left: '22%' }, { top: '72%', left: '88%' },
  { top: '42%', left: '78%' }, { top: '86%', left: '28%' },
]
const ESTRELLAS_CTA = [
  { top: '18%', left: '85%' }, { top: '75%', left: '12%' },
]

const ZODIACOS_HERO = [
  { simbolo: '♈', top: '6%', left: '4%', size: '20px', rot: '-8deg' },
  { simbolo: '♌', top: '10%', left: '92%', size: '17px', rot: '10deg' },
  { simbolo: '♎', top: '66%', left: '6%', size: '18px', rot: '6deg' },
  { simbolo: '♓', top: '4%', left: '62%', size: '15px', rot: '-4deg' },
  { simbolo: '♊', top: '70%', left: '93%', size: '16px', rot: '12deg' },
  { simbolo: '♑', top: '24%', left: '3%', size: '14px', rot: '9deg' },
  { simbolo: '♐', top: '30%', left: '95%', size: '15px', rot: '-11deg' },
  { simbolo: '♋', top: '46%', left: '4%', size: '13px', rot: '5deg' },
]
const ZODIACOS_CTA = [
  { simbolo: '♍', top: '8%', left: '6%', size: '16px', rot: '-6deg' },
  { simbolo: '♏', top: '85%', left: '90%', size: '18px', rot: '8deg' },
  { simbolo: '♒', top: '40%', left: '4%', size: '14px', rot: '7deg' },
  { simbolo: '♉', top: '55%', left: '93%', size: '15px', rot: '-9deg' },
]
const DESTELLOS_HERO = [
  { top: '20%', left: '8%', size: 12, delay: '0s' },
  { top: '58%', left: '15%', size: 9, delay: '0.9s' },
  { top: '10%', left: '82%', size: 10, delay: '1.6s' },
  { top: '60%', left: '90%', size: 8, delay: '0.4s' },
  { top: '48%', left: '3%', size: 8, delay: '2.1s' },
  { top: '35%', left: '96%', size: 7, delay: '1.2s' },
]
const DESTELLOS_CTA = [
  { top: '15%', left: '18%', size: 9, delay: '0.3s' },
  { top: '70%', left: '80%', size: 8, delay: '1.4s' },
  { top: '92%', left: '30%', size: 7, delay: '0.8s' },
]

type VideoInfo = { tipo: 'youtube' | 'vimeo' | 'directo' | 'desconocido'; url: string }

function detectarVideo(urlOriginal: string): VideoInfo {
  const url = urlOriginal.trim()
  const si = url.match(/[?&]si=([a-zA-Z0-9_-]+)/)
  const extra = si ? `?si=${si[1]}` : ''

  const ytId = url.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/)
  if (ytId) return { tipo: 'youtube', url: `https://www.youtube.com/embed/${ytId[1]}${extra}` }

  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeo) return { tipo: 'vimeo', url: `https://player.vimeo.com/video/${vimeo[1]}` }

  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url)) {
    return { tipo: 'directo', url }
  }

  return { tipo: 'desconocido', url }
}

function renderizarReproductor(url: string) {
  const video = detectarVideo(url)
  if (video.tipo === 'youtube' || video.tipo === 'vimeo') {
    return <iframe src={video.url} title="Video del curso" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',border:'none'}}/>
  }
  if (video.tipo === 'directo') {
    return (
      <video controls autoPlay style={{position:'absolute',top:0,left:0,width:'100%',height:'100%'}}>
        <source src={video.url}/>
        Tu navegador no soporta este video.
      </video>
    )
  }
  return (
    <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',textAlign:'center'}}>
      <a href={video.url} target="_blank" rel="noopener noreferrer" style={{color:'var(--primary-light)',fontSize:'14px',textDecoration:'underline'}}>
        No pudimos reconocer este link. Abrilo directamente acá →
      </a>
    </div>
  )
}

export default function CursoPublicoPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const slugCurso = params.slugCurso as string

  const [terapeuta, setTerapeuta] = useState<Terapeuta | null>(null)
  const [curso, setCurso] = useState<Curso | null>(null)
  const [modulos, setModulos] = useState<Modulo[]>([])
  const [testimonios, setTestimonios] = useState<Testimonio[]>([])
  const [moduloAbierto, setModuloAbierto] = useState<string | null>(null)
  const [testiIdx, setTestiIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [debugInfo, setDebugInfo] = useState('')
  const [previewVideo, setPreviewVideo] = useState<string | null>(null)
  const [archivos, setArchivos] = useState<ArchivoPublico[]>([])
  const [ventasAbiertas, setVentasAbiertas] = useState(true)
  const programaRef = useRef<HTMLDivElement | null>(null)
  const [cuponLink, setCuponLink] = useState('')
  const [cupon, setCupon] = useState<null | { codigo: string; porcentaje: number; precioFinal: number; precioFinalUsd: number; meses: string | null }>(null)

  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    try {
      const supabase = createClient()
      const { data: perfil, error: errorPerfil } = await supabase
        .from('therapist_profiles').select('*')
        .eq('slug', slug).maybeSingle()
      if (!perfil) {
        setDebugInfo(`No encontró la terapeuta con slug "${slug}". Error: ${errorPerfil ? JSON.stringify(errorPerfil) : 'ninguno (simplemente no vino nada)'}`)
        setLoading(false); return
      }
      setTerapeuta(perfil)

      const { data: cursoData, error: errorCurso } = await supabase
        .from('courses').select('*')
        .eq('slug', slugCurso)
        .eq('user_id', perfil.user_id)
        .eq('estado', 'publicado')
        .maybeSingle()
      if (!cursoData) {
        console.warn('Curso no encontrado:', slugCurso, errorCurso)
        setDebugInfo('no_disponible')
        setLoading(false); return
      }
      setCurso(cursoData)

      // ¿puede vender? (si bajó a Básico, sus cursos y descargables están en pausa). Ante la duda, sí: el servidor revisa igual.
      try {
        const r = await fetch(`/api/pagina-disponible?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' })
        if (r.ok) { const j = await r.json(); if (j?.ventas === false || j?.disponible === false) setVentasAbiertas(false) }
      } catch {}
      // descargable: sus archivos (solo nombre, tipo y tamaño; nunca el archivo)
      if (cursoData.tipo === 'descargable') {
        const { data: arch } = await supabase.from('descargable_archivos').select('id, nombre, tamano, es_bonus, bonus_valor, orden').eq('course_id', cursoData.id).order('orden')
        setArchivos(((arch || []) as any[]).map(a => ({ ...a, tamano: Number(a.tamano) || 0 })))
      }
      // link con cupón (?cupon=): se muestra el precio con descuento (lo calcula el servidor)
      try {
        const c = new URLSearchParams(window.location.search).get('cupon')
        const cod = (c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20)
        if (cod && Number(cursoData.precio) > 0) {
          setCuponLink(cod)
          const r = await fetch('/api/cupones/validar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'curso', id: cursoData.id, codigo: cod }) })
          const j = await r.json().catch(() => null)
          if (j?.ok) setCupon({ codigo: j.codigo, porcentaje: j.porcentaje, precioFinal: j.precioFinal, precioFinalUsd: j.precioFinalUsd, meses: j.meses })
        }
      } catch {}

      const { data: mods } = await supabase
        .from('modules').select('*')
        .eq('course_id', cursoData.id).order('orden')
      if (mods) {
        const { data: lecs } = await supabase
          .from('lessons_publicas')
          .select('id,titulo,tipo,duracion_min,es_preview,contenido_url,module_id')
          .in('module_id', mods.map(m => m.id)).order('orden')
        setModulos(mods.map(m => ({
          ...m,
          lecciones: lecs?.filter(l => l.module_id === m.id) || []
        })))
        if (mods.length > 0) setModuloAbierto(mods[0].id)
      }

      const { data: testis } = await supabase
        .from('course_testimonials').select('*')
        .eq('course_id', cursoData.id).order('orden')
      if (testis) setTestimonios(testis)
    } catch (e: any) {
      console.error(e)
      setDebugInfo(`Error inesperado: ${e?.message || JSON.stringify(e)}`)
    } finally { setLoading(false) }
  }

  const t = temaPublico(terapeuta?.template, terapeuta?.template_modo)
  const totalLecciones = modulos.reduce((acc, m) => acc + (m.lecciones?.length || 0), 0)
  const esOferta = curso?.precio_original && curso.precio_original > curso.precio
  const tieneMP = !!terapeuta?.mp_activo
  const tieneTransferencia = !!(terapeuta?.acepta_transferencia && terapeuta?.alias_pago)
  // se puede pagar en dólares: el curso tiene precio en USD y la terapeuta configuró cómo cobrarlos
  const tieneUSD = Number(curso?.precio_usd) > 0 && !!(terapeuta?.usd_link || terapeuta?.usd_cuenta || terapeuta?.usd_usdt)
  const sinMetodoPago = !tieneMP && !tieneTransferencia && !tieneUSD
  const esGratis = curso != null && curso.precio != null && Number(curso.precio) === 0

  const leccionPreview = modulos
    .flatMap(m => m.lecciones || [])
    .find(l => l.es_preview && l.tipo === 'video' && l.contenido_url)
  const videoUrl = curso?.video_presentacion_url || leccionPreview?.contenido_url || null
  const tituloVideo = curso?.video_presentacion_url
    ? (curso?.tipo === 'descargable' ? 'Mirá el video de presentación' : 'Mirá el video de presentación del curso')
    : 'Mirá nuestra primera clase gratis y resolvé todas tus dudas'

  function irACheckout() { if (!ventasAbiertas) return; router.push(`/p/${slug}/cursos/${slugCurso}/checkout${cuponLink ? `?cupon=${encodeURIComponent(cuponLink)}` : ''}`) }
  const esDescargable = curso?.tipo === 'descargable'
  const principales = archivos.filter(a => !a.es_bonus)
  const sinExt = (n: string) => n.replace(/\.[a-z0-9]{1,5}$/i, '')
  const bonusLista = [
    ...archivos.filter(a => a.es_bonus).map(a => ({ nombre: sinExt(a.nombre), detalle: `${tipoLegible(a.nombre)} · ${pesoLegible(a.tamano)}`, tipo: 'archivo', valor: a.bonus_valor, archivo: a.nombre })),
    ...((Array.isArray(curso?.bonus) ? curso!.bonus : []).filter(b => b?.nombre).map(b => ({ ...b, archivo: '' }))),
  ].slice(0, 12)
  const precioMostrar = cupon ? cupon.precioFinal : Number(curso?.precio || 0)
  function siguienteTesti() { setTestiIdx(i => (i + 1) % testimonios.length) }
  function anteriorTesti() { setTestiIdx(i => (i - 1 + testimonios.length) % testimonios.length) }
  function onTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX }
  function onTouchMove(e: React.TouchEvent) { touchEndX.current = e.touches[0].clientX }
  function onTouchEnd() {
    const delta = touchStartX.current - touchEndX.current
    if (Math.abs(delta) > 40) { delta > 0 ? siguienteTesti() : anteriorTesti() }
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:'14px',color:'#6B7280',fontFamily:'sans-serif'}}>
      Cargando...
    </div>
  )

  if (!curso || !terapeuta) return (
    <div style={{padding:'60px 24px',fontSize:'14px',color:'#374151',fontFamily:'sans-serif',lineHeight:1.6,maxWidth:'480px',margin:'0 auto',textAlign:'center'}}>
      <div style={{fontWeight:700,fontSize:'17px',marginBottom:'8px'}}>Esto no está disponible</div>
      <div style={{color:'#6B7280',marginBottom:'18px'}}>Puede que se haya despublicado o que el link tenga un error.</div>
      {terapeuta && <a href={`/p/${slug}`} style={{color:'#6B3FA0',fontWeight:700}}>Ver la página de {terapeuta.nombre_profesional}</a>}
    </div>
  )

  // franjas: cada sección visible alterna fondo base y franja (nunca dos iguales seguidas)
  let nFranja = 0
  const franja = () => (nFranja++ % 2 === 0 ? 'franja franja-b' : 'franja')
  const aprender = (curso.que_aprenderas || []).filter(x => (x || '').trim())
  const paraQuien = (curso.para_quien || []).filter(x => (x || '').trim())
  const requisitos = (curso.requisitos || []).filter(x => (x || '').trim())
  const todasLecciones = modulos.flatMap(m => m.lecciones || [])
  const tienePdf = todasLecciones.some(l => l.tipo === 'pdf')
  const tieneVivo = bonusLista.some(b => b.tipo === 'vivo')
  const tieneMaterial = bonusLista.length > 0 || tienePdf
  const deporVida = curso.modalidad === 'unico' || esGratis
  const incluye: { icono: any; titulo: string; texto: string }[] = esDescargable ? [] : [
    { icono: BookOpen, titulo: 'Aula con cuaderno', texto: 'Tus lecciones y tus apuntes en un solo lugar' },
    ...(tienePdf ? [{ icono: FileText, titulo: 'Apuntes en PDF', texto: 'Para leer y repasar cuando quieras' }] : []),
    { icono: Star, titulo: 'Certificado', texto: 'Al terminar el curso' },
    ...(tieneVivo ? [{ icono: Users, titulo: 'Encuentro en vivo', texto: 'Para compartir y preguntar' }] : []),
    ...(tieneMaterial ? [{ icono: Download, titulo: 'Material descargable', texto: 'Recursos para llevarte' }] : []),
    ...(deporVida ? [{ icono: InfinityIcon, titulo: 'Acceso de por vida', texto: 'Entrás cuando quieras, sin vencimiento' }] : []),
  ]
  const textoModalidad = esGratis ? (esDescargable ? 'Gratis · lo descargás al instante' : 'Gratis · acceso inmediato al aula')
    : esDescargable ? 'Pago único · lo descargás al instante'
    : curso.modalidad === 'suscripcion' ? 'Pago mensual · acceso inmediato al aula' : 'Pago único · acceso inmediato al aula'
  const waNumero = (terapeuta.whatsapp || '').replace(/\D/g, '').replace(/^0+/, '')
  const textoComprar = esGratis ? (esDescargable ? 'Descargar gratis' : 'Inscribirme gratis') : 'Comprar ahora'

  const botonComprar = (clase: string) => !ventasAbiertas
    ? <div className={clase} style={{opacity:0.7,cursor:'default'}}>No disponible por ahora</div>
    : sinMetodoPago && !esGratis
      ? <a className="btn-wsp" href={`https://wa.me/${waNumero}?text=${encodeURIComponent(`Hola! Quiero inscribirme al curso ${curso.titulo}, ¿cómo pago?`)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={18}/> Quiero inscribirme</a>
      : <span className="luz-marco"><span className="luz-giro" aria-hidden="true"/><button className={clase} onClick={irACheckout}><Sparkles size={16}/> {textoComprar}</button></span>

  const bloquePrecio = (
    <div className="precio-bloque">
      {(esOferta || cupon) && !esGratis && (
        <div className="precio-fila">
          <span className="precio-viejo">${Number(cupon ? curso.precio : curso.precio_original).toLocaleString('es-AR')}</span>
          <span className="oferta-badge"><Tag size={11}/> {cupon ? `CUPÓN ${cupon.codigo} · −${cupon.porcentaje}%` : 'OFERTA'}</span>
        </div>
      )}
      <div className="precio-grande">{esGratis ? 'Gratis' : `$${precioMostrar.toLocaleString('es-AR')}`}</div>
      {cupon?.meses === 'primero' && curso.modalidad === 'suscripcion' && <div className="precio-sub">el primer mes · después ${curso.precio.toLocaleString('es-AR')} por mes</div>}
      {curso.modalidad === 'suscripcion' && !esGratis && !(cupon?.meses === 'primero') && <div className="precio-sub">por mes</div>}
      {tieneUSD && !esGratis && <div className="precio-sub">o USD {Number(cupon && cupon.precioFinalUsd ? cupon.precioFinalUsd : curso.precio_usd).toLocaleString('es-AR')} si pagás desde otro país</div>}
    </div>
  )

  return (
    <div style={{fontFamily:'var(--font-body)',background:'var(--bg)',minHeight:'100vh',color:'var(--text)'}}>
      <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?family=${t.googleFonts}&display=swap`}/>
      <style>{`
        :root{
          --bg:${t.bg};--bg2:${t.bg2};--bg3:${t.bg3};
          --primary:${t.primary};--primary-light:${t.primaryLight};--primary-dim:${t.primaryDim};
          --accent:${t.accent};--accent-light:${t.accentLight};--accent-dim:${t.accentDim};
          --text:${t.text};--text-dim:${t.textDim};--cream:${t.cream};--border:${t.border};
          --card-bg:${t.cardBg};--font-body:${t.fontBody};--font-title:${t.fontTitle};
          --btn-bg:${t.btnBg};--btn-color:${t.btnColor};
          --superficie:${t.superficie};--banda:${t.banda};--acento:${t.acento};--sobre-acento:${t.sobreAcento};
          --chip:${t.chip};--chip-txt:${t.chipTxt};--linea:${t.linea};--icono:${t.icono};--luz:${t.luz};
          --final:${t.final};--final-txt:${t.finalTxt};--final-suave:${t.finalSuave};--cta-final-fondo:${t.ctaFinalFondo};--cta-final-txt:${t.ctaFinalTxt};
        }
        *{box-sizing:border-box;margin:0;padding:0}
        html,body{background:var(--bg)}
        .mandala{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:${t.dark ? 0.2 : 0.16};background-image:url('${t.patronFondo}');background-size:cover;background-position:center;background-repeat:no-repeat}

        .nav{position:sticky;top:0;z-index:100;background:${t.navBg};backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);padding:14px 20px;border-bottom:1px solid var(--border)}
        .nav-inner{max-width:1040px;margin:0 auto;width:100%;display:flex;justify-content:space-between;align-items:center;gap:12px}
        .nav-nombre{font-family:var(--font-title);font-size:18px;font-weight:700;color:var(--cream);text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .nav-btn{padding:9px 18px;border-radius:50px;border:1.5px solid var(--cream);background:transparent;color:var(--cream);font-size:12px;font-weight:700;cursor:pointer;font-family:var(--font-body);flex-shrink:0;transition:transform .15s}
        .nav-btn:active,.hero-btn:active,.btn-comprar:active,.btn-sec:active{transform:scale(0.97)}

        .franja{position:relative;background:var(--bg)}
        .franja-b{background:var(--banda)}
        .seccion{padding:52px 20px;position:relative;max-width:1040px;margin:0 auto}
        .etiqueta{font-size:10.5px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:var(--primary);text-align:center;margin-bottom:8px}
        .seccion-titulo{font-family:var(--font-title);font-weight:600;font-size:clamp(28px,5vw,38px);line-height:1.08;color:var(--cream);text-align:center;margin-bottom:26px}

        .hero{position:relative;overflow:hidden;padding:44px 20px 56px;background:var(--bg)}
        .hero-grid{position:relative;z-index:2;max-width:1040px;margin:0 auto;display:grid;grid-template-areas:"etiqueta" "titulo" "foto" "subtitulo" "chips" "precio" "boton";gap:18px;justify-items:center;text-align:center}
        @media(min-width:860px){
          .hero-grid{grid-template-columns:1fr 1fr;grid-template-areas:"etiqueta foto" "titulo foto" "subtitulo foto" "chips foto" "precio foto" "boton foto";align-items:center;justify-items:start;text-align:left;gap:16px 56px;min-height:64vh}
          .hero-grid .chips-row{justify-content:flex-start}
          .hero-grid .precio-bloque{align-items:flex-start}
          .hero-grid .precio-fila{justify-content:flex-start}
          .hero-grid .botones{align-items:flex-start}
        }
        .ga-etiqueta{grid-area:etiqueta;margin:0}
        .ga-titulo{grid-area:titulo}
        .ga-foto{grid-area:foto;width:100%;display:flex;justify-content:center}
        .ga-subtitulo{grid-area:subtitulo}
        .ga-chips{grid-area:chips}
        .ga-precio{grid-area:precio}
        .ga-boton{grid-area:boton;width:100%}
        .hero-titulo{font-family:var(--font-title);font-weight:600;font-size:clamp(34px,6vw,54px);line-height:1.04;color:var(--cream);overflow-wrap:anywhere}
        .hero-foto-wrap{position:relative;width:100%;max-width:360px}
        .hero-foto{width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:28px;display:block;box-shadow:0 22px 44px rgba(0,0,0,0.25);background:${t.foto}}
        .hero-foto-vacia{width:100%;aspect-ratio:4/5;border-radius:28px;background:${t.foto};display:flex;align-items:center;justify-content:center;color:${t.fotoTxt};box-shadow:0 22px 44px rgba(0,0,0,0.25)}
        .hero-sticker{position:absolute;top:-12px;right:-10px;width:52px;height:52px;border-radius:50%;background:var(--superficie);display:flex;align-items:center;justify-content:center;transform:rotate(-12deg);box-shadow:0 10px 24px rgba(0,0,0,0.18)}
        .hero-sub{font-family:var(--font-title);font-style:italic;font-size:19px;color:var(--text);line-height:1.4;max-width:440px}
        .chips-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:520px}
        .chip{display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:50px;background:var(--chip);color:var(--chip-txt);font-size:12px;font-weight:600}
        .precio-bloque{display:flex;flex-direction:column;align-items:center;gap:4px}
        .precio-fila{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:center}
        .precio-viejo{font-size:16px;color:var(--text-dim);text-decoration:line-through}
        .oferta-badge{display:inline-flex;align-items:center;gap:5px;background:var(--acento);color:var(--sobre-acento);font-size:10.5px;font-weight:800;letter-spacing:0.1em;padding:4px 10px;border-radius:10px}
        .precio-grande{font-family:var(--font-title);font-weight:700;font-size:44px;line-height:1;color:var(--cream)}
        .precio-sub{font-size:12.5px;color:var(--text-dim)}
        .botones{display:flex;flex-direction:column;align-items:center;gap:10px;width:100%}
        .luz-marco{position:relative;display:inline-flex;overflow:hidden;isolation:isolate;padding:2.5px;border-radius:32px;box-shadow:0 12px 24px rgba(0,0,0,0.16);max-width:360px;width:100%}
        .luz-giro{position:absolute;z-index:-1;left:50%;top:50%;width:160%;aspect-ratio:1;transform:translate(-50%,-50%);background:conic-gradient(from 0deg,transparent 0deg,transparent 240deg,var(--luz) 300deg,transparent 360deg);animation:girarLuz 4s linear infinite}
        @keyframes girarLuz{to{transform:translate(-50%,-50%) rotate(360deg)}}
        .hero-btn,.btn-comprar{width:100%;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:16px 26px;background:var(--acento);color:var(--sobre-acento);border:none;border-radius:30px;font-size:14px;font-weight:800;letter-spacing:0.06em;cursor:pointer;font-family:var(--font-body);transition:transform .15s}
        .btn-sec{display:inline-flex;align-items:center;gap:6px;padding:12px 22px;border-radius:28px;border:1.5px solid var(--cream);background:transparent;color:var(--cream);font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-body);transition:transform .15s}
        .btn-wsp{width:100%;max-width:360px;padding:16px;background:#25D366;color:white;border:none;border-radius:50px;font-size:15px;font-weight:800;cursor:pointer;font-family:var(--font-body);display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none}

        .desc-larga{max-width:680px;margin:0 auto;font-size:15px;line-height:1.6;color:var(--text);white-space:pre-line;text-align:center}
        .quien{display:flex;align-items:center;gap:14px;max-width:440px;margin:28px auto 0;padding:14px;border-radius:22px;background:var(--superficie);box-shadow:0 8px 20px rgba(0,0,0,0.08);text-decoration:none}
        .quien-foto{width:58px;height:58px;border-radius:50%;object-fit:cover;flex-shrink:0;background:${t.foto}}
        .quien-nombre{font-family:var(--font-title);font-size:20px;font-weight:700;color:var(--cream);line-height:1.1}
        .quien-esp{font-size:12px;color:var(--text-dim);margin-top:2px}

        .bullets-grid{display:grid;grid-template-columns:1fr;gap:12px;max-width:720px;margin:0 auto}
        @media(min-width:640px){ .bullets-grid{grid-template-columns:1fr 1fr} }
        .bullet-card{display:flex;align-items:center;gap:14px;background:var(--superficie);border-radius:20px;padding:16px;box-shadow:0 8px 20px rgba(0,0,0,0.08)}
        .bullet-icon{width:44px;height:44px;border-radius:14px;background:var(--chip);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--icono)}
        .bullet-texto{font-size:14px;font-weight:600;color:var(--cream);line-height:1.4;overflow-wrap:anywhere}
        .tildes{display:flex;flex-direction:column;gap:12px;max-width:560px;margin:0 auto}
        .tilde-item{display:flex;align-items:flex-start;gap:12px;font-size:15px;color:var(--cream);line-height:1.45}
        .tilde-caja{width:26px;height:26px;border-radius:8px;background:var(--acento);color:var(--sobre-acento);display:flex;align-items:center;justify-content:center;flex-shrink:0}

        .testi-carousel{max-width:480px;margin:0 auto;position:relative;text-align:center}
        .testi-card{background:var(--superficie);border-radius:22px;padding:26px 22px;box-shadow:0 10px 22px rgba(0,0,0,0.12)}
        .testi-quote{font-size:52px;color:var(--primary-dim);font-family:serif;line-height:0.6;margin-bottom:10px}
        .testi-img{width:100%;max-height:280px;object-fit:cover;border-radius:16px;margin-bottom:16px;display:block}
        .testi-texto{font-family:var(--font-title);font-style:italic;font-size:19px;color:var(--cream);line-height:1.35;margin-bottom:14px}
        .testi-nombre{font-size:12px;font-weight:700;color:var(--cream)}
        .testi-nav{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:18px}
        .testi-arrow{width:36px;height:36px;border-radius:50%;border:none;background:var(--superficie);color:var(--cream);display:flex;align-items:center;justify-content:center;cursor:pointer}
        .testi-dots{display:flex;gap:7px}
        .testi-dot{width:6px;height:6px;border-radius:50%;background:var(--border);cursor:pointer;border:none}
        .testi-dot.act{width:18px;border-radius:3px;background:var(--acento)}

        .modulo-card{border-radius:20px;margin-bottom:12px;overflow:hidden;background:var(--superficie);box-shadow:0 8px 20px rgba(0,0,0,0.08)}
        .modulo-header{display:flex;align-items:center;gap:14px;padding:16px 18px;cursor:pointer;width:100%;background:none;border:none;text-align:left;font-family:inherit}
        .modulo-num{width:38px;height:38px;border-radius:50%;background:var(--acento);color:var(--sobre-acento);display:flex;align-items:center;justify-content:center;font-family:var(--font-title);font-weight:700;font-size:18px;flex-shrink:0}
        .modulo-titulo{flex:1;font-size:14.5px;font-weight:700;color:var(--cream);overflow-wrap:anywhere}
        .modulo-count{font-size:11px;color:var(--text-dim);flex-shrink:0}
        .leccion-item{display:flex;align-items:center;gap:10px;padding:11px 18px 11px 22px;border-top:1px solid var(--linea);animation:aparecer .2s ease}
        @keyframes aparecer{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
        .tipo-icon{width:28px;height:28px;border-radius:9px;background:var(--chip);display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .preview-badge{font-size:10px;background:var(--acento);color:var(--sobre-acento);padding:4px 9px;border-radius:10px;font-weight:800;font-family:inherit}

        .video-wrap{max-width:720px;margin:0 auto;border-radius:20px;overflow:hidden;position:relative;padding-bottom:min(56.25%, 405px);height:0;background:${t.foto};box-shadow:0 12px 26px rgba(0,0,0,0.2)}
        .video-wrap iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:none}

        .incluye-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;max-width:720px;margin:0 auto}
        @media(min-width:640px){ .incluye-grid{grid-template-columns:repeat(3,minmax(0,1fr))} }
        .incluye-item{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;background:var(--superficie);border-radius:20px;padding:18px 10px;box-shadow:0 6px 16px rgba(0,0,0,0.08)}
        .incluye-tit{font-family:var(--font-title);font-size:17px;font-weight:700;color:var(--cream);line-height:1.1}
        .incluye-txt{font-size:11.5px;color:var(--text-dim);line-height:1.35}
        .req-chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:640px;margin:0 auto}

        .cierre-wrap{padding:24px 14px 8px}
        .cierre{max-width:560px;margin:0 auto;padding:34px 22px;border-radius:28px;background:var(--final);color:var(--final-txt);display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center}
        .cierre-foto{width:84px;height:84px;border-radius:24px;object-fit:cover;box-shadow:0 10px 24px rgba(0,0,0,0.3)}
        .cierre-titulo{font-family:var(--font-title);font-size:32px;font-weight:600;line-height:1.05}
        .cierre .precio-viejo,.cierre .precio-sub{color:var(--final-suave)}
        .cierre .precio-grande{color:var(--final-txt)}
        .cierre-modalidad{font-size:12.5px;color:var(--final-suave)}
        .cierre .btn-comprar{background:var(--cta-final-fondo);color:var(--cta-final-txt)}
        .cierre .luz-marco{--luz:var(--final-txt)}
        .cierre-link{font-size:13px;font-weight:600;color:var(--final-txt);text-decoration:underline;text-underline-offset:3px}
        .garantia-card{margin-top:6px;border-radius:16px;padding:12px 14px;font-size:12.5px;line-height:1.45;color:var(--final-txt);background:rgba(127,127,127,0.14)}
        .ingresar-aula{text-align:center;padding:26px 20px 6px;font-size:13.5px;color:var(--text)}
        .ingresar-aula button{background:none;border:none;color:var(--cream);font-weight:700;text-decoration:underline;text-underline-offset:3px;cursor:pointer;font-family:inherit;font-size:inherit}
        .footer-curso{text-align:center;padding:18px 24px 30px;font-size:11px;color:var(--text-dim)}
        @media (prefers-reduced-motion:reduce){.luz-giro,.leccion-item{animation:none}}
      `}</style>

      {/* NAV: nombre de la terapeuta + Ingresar (para alumnas que ya compraron) */}
      <nav className="nav">
        <div className="nav-inner">
          <a className="nav-nombre" href={`/p/${slug}`}>{terapeuta.nombre_profesional}</a>
          <button className="nav-btn" onClick={() => router.push('/aula')}>Ingresar</button>
        </div>
      </nav>

      {/* 1. PORTADA (con lunitas) */}
      <div className="hero">
        <div className="mandala"/>
        <div className="hero-grid">
          <div className="etiqueta ga-etiqueta">{esDescargable ? 'DESCARGABLE' : 'CURSO ONLINE'}</div>
          <h1 className="hero-titulo ga-titulo">{curso.titulo}</h1>
          <div className="ga-foto">
            <div className="hero-foto-wrap">
              {curso.imagen_url
                ? <img src={curso.imagen_url} alt={curso.titulo} className="hero-foto"/>
                : <div className="hero-foto-vacia"><BookOpen size={44}/></div>}
              <div className="hero-sticker"><Star size={20} color={t.icono} fill={t.icono}/></div>
            </div>
          </div>
          {(curso.descripcion_corta || '').trim() && <p className="hero-sub ga-subtitulo">{curso.descripcion_corta}</p>}
          <div className="chips-row ga-chips">
            {esDescargable ? (<>
              <span className="chip"><Download size={13}/> {principales.length} archivo{principales.length !== 1 ? 's' : ''}</span>
              {bonusLista.length > 0 && <span className="chip"><Gift size={13}/> {bonusLista.length} bonus de regalo</span>}
              <span className="chip"><InfinityIcon size={13}/> Lo descargás cuando quieras</span>
            </>) : (<>
              {curso.duracion_estimada_horas && <span className="chip"><Clock size={13}/> {curso.duracion_estimada_horas} h</span>}
              {curso.nivel && <span className="chip"><BarChart3 size={13}/> Nivel {curso.nivel}</span>}
              {curso.idioma && <span className="chip"><Globe size={13}/> {curso.idioma}</span>}
              {modulos.length > 0 && <span className="chip"><BookOpen size={13}/> {modulos.length} módulo{modulos.length !== 1 ? 's' : ''}</span>}
              {deporVida && <span className="chip"><InfinityIcon size={13}/> Acceso de por vida</span>}
            </>)}
          </div>
          <div className="ga-precio">{ventasAbiertas && bloquePrecio}</div>
          <div className="ga-boton botones">
            {botonComprar('hero-btn')}
            {!esDescargable && modulos.length > 0 && (
              <button className="btn-sec" onClick={() => programaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Ver el programa <ChevronDown size={15}/></button>
            )}
          </div>
        </div>
      </div>

      {/* 2. SOBRE ESTE CURSO + quién lo da */}
      {((curso.descripcion_larga || '').trim() || terapeuta.nombre_profesional) && (
        <div className={franja()}>
          <div className="seccion">
            <div className="etiqueta">{esDescargable ? 'DE QUÉ SE TRATA' : 'SOBRE ESTE CURSO'}</div>
            {(curso.descripcion_larga || '').trim() && <p className="desc-larga">{curso.descripcion_larga}</p>}
            <a className="quien" href={`/p/${slug}`}>
              {terapeuta.avatar_url ? <img src={terapeuta.avatar_url} alt="" className="quien-foto"/> : <span className="quien-foto"/>}
              <span>
                <span style={{display:'block',fontSize:'10.5px',fontWeight:700,letterSpacing:'0.16em',color:'var(--primary)'}}>{esDescargable ? 'CREADO POR' : 'LO DA'}</span>
                <span className="quien-nombre" style={{display:'block'}}>{terapeuta.nombre_profesional}</span>
                {(terapeuta.especialidad || '').trim() && <span className="quien-esp" style={{display:'block'}}>{terapeuta.especialidad}</span>}
              </span>
            </a>
          </div>
        </div>
      )}

      {/* QUÉ INCLUYE (descargable): la lista de archivos sale sola */}
      {esDescargable && principales.length > 0 && (
        <div className={franja()}>
          <div className="seccion">
            <h2 className="seccion-titulo">Qué incluye</h2>
            <div className="bullets-grid">
              {principales.map(a => (
                <div key={a.id} className="bullet-card">
                  <div className="bullet-icon"><IconoArchivo nombre={a.nombre} size={18}/></div>
                  <div className="bullet-texto">{sinExt(a.nombre)}<span style={{display:'block',fontSize:'12px',opacity:0.7,marginTop:'2px',fontWeight:500}}>{tipoLegible(a.nombre)} · {pesoLegible(a.tamano)}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. QUÉ VAS A APRENDER */}
      {aprender.length > 0 && (
        <div className={franja()}>
          <div className="seccion">
            <h2 className="seccion-titulo">{esDescargable ? 'Qué vas a encontrar' : 'Qué vas a aprender'}</h2>
            <div className="bullets-grid">
              {aprender.map((item, i) => (
                <div key={i} className="bullet-card">
                  <div className="bullet-icon"><Sparkles size={18}/></div>
                  <div className="bullet-texto">{item}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. VIDEO DE PRESENTACIÓN */}
      {videoUrl && (
        <div className={franja()}>
          <div className="seccion">
            <h2 className="seccion-titulo">{tituloVideo}</h2>
            <div className="video-wrap">{renderizarReproductor(videoUrl!)}</div>
          </div>
        </div>
      )}

      {/* 5. PROGRAMA */}
      {!esDescargable && modulos.length > 0 && (
        <div className={franja()} ref={programaRef} style={{scrollMarginTop:'60px'}}>
          <div className="seccion">
            <h2 className="seccion-titulo">Programa del curso</h2>
            <div style={{maxWidth:'640px',margin:'0 auto'}}>
              {modulos.map((m, idx) => (
                <div key={m.id} className="modulo-card">
                  <button type="button" className="modulo-header" aria-expanded={moduloAbierto === m.id} onClick={() => setModuloAbierto(moduloAbierto === m.id ? null : m.id)}>
                    <span className="modulo-num">{idx + 1}</span>
                    <span className="modulo-titulo">{m.titulo}</span>
                    <span className="modulo-count">{m.lecciones?.length || 0} {(m.lecciones?.length || 0) === 1 ? 'lección' : 'lecciones'}</span>
                    {moduloAbierto === m.id ? <ChevronUp size={16} color="var(--text-dim)"/> : <ChevronDown size={16} color="var(--text-dim)"/>}
                  </button>
                  {moduloAbierto === m.id && m.lecciones?.map(l => {
                    const esVideoPreview = l.es_preview && l.tipo === 'video' && l.contenido_url
                    const esOtroPreview = l.es_preview && l.tipo !== 'video' && l.contenido_url
                    return (
                      <div key={l.id} className="leccion-item">
                        <div className="tipo-icon">
                          {l.tipo === 'video' ? <Play size={12} color="var(--icono)"/> : l.tipo === 'pdf' ? <FileText size={12} color="var(--icono)"/> : l.tipo === 'audio' ? <Music size={12} color="var(--icono)"/> : <StickyNote size={12} color="var(--icono)"/>}
                        </div>
                        <div style={{flex:1,fontSize:'13px',color:'var(--text)',overflowWrap:'anywhere'}}>{l.titulo}</div>
                        {l.duracion_min && <span style={{fontSize:'11px',color:'var(--text-dim)',flexShrink:0}}>{l.duracion_min} min</span>}
                        {esVideoPreview && (
                          <button onClick={() => setPreviewVideo(l.contenido_url!)} className="preview-badge" style={{border:'none',cursor:'pointer'}}>Ver ▶</button>
                        )}
                        {esOtroPreview && (
                          <a href={l.contenido_url!} target="_blank" rel="noopener noreferrer" className="preview-badge" style={{textDecoration:'none'}}>Ver</a>
                        )}
                        {l.es_preview && !l.contenido_url && <span className="preview-badge">GRATIS</span>}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. ¿PARA QUIÉN ES? */}
      {paraQuien.length > 0 && (
        <div className={franja()}>
          <div className="seccion">
            <h2 className="seccion-titulo">{esDescargable ? '¿Para quién es?' : '¿Para quién es este curso?'}</h2>
            <div className="tildes">
              {paraQuien.map((item, i) => (
                <div key={i} className="tilde-item"><span className="tilde-caja"><Check size={15}/></span><span>{item}</span></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. TESTIMONIOS */}
      {testimonios.length > 0 && (
        <div className={franja()}>
          <div className="seccion">
            <h2 className="seccion-titulo">{esDescargable ? 'Lo que dicen' : 'Lo que dicen las alumnas'}</h2>
            <div className="testi-carousel" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
              <div className="testi-card">
                {testimonios[testiIdx]?.avatar_url ? (
                  <img src={testimonios[testiIdx].avatar_url} alt="" className="testi-img"/>
                ) : (
                  <div className="testi-quote">“</div>
                )}
                {testimonios[testiIdx]?.texto && <p className="testi-texto">«{testimonios[testiIdx].texto}»</p>}
                <div className="testi-nombre">{testimonios[testiIdx]?.nombre || 'Alumna'}</div>
              </div>
              {testimonios.length > 1 && (
                <div className="testi-nav">
                  <button type="button" className="testi-arrow" aria-label="Anterior" onClick={anteriorTesti}><ChevronLeft size={16}/></button>
                  <div className="testi-dots">
                    {testimonios.map((_, i) => (
                      <button type="button" key={i} aria-label={`Testimonio ${i + 1}`} className={`testi-dot${testiIdx===i?' act':''}`} onClick={() => setTestiIdx(i)}/>
                    ))}
                  </div>
                  <button type="button" className="testi-arrow" aria-label="Siguiente" onClick={siguienteTesti}><ChevronRight size={16}/></button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8. QUÉ INCLUYE (curso): solo lo que este curso tiene */}
      {incluye.length > 0 && (
        <div className={franja()}>
          <div className="seccion">
            <h2 className="seccion-titulo">Qué incluye</h2>
            <div className="incluye-grid">
              {incluye.map((x, i) => {
                const Ico = x.icono
                return (
                  <div key={i} className="incluye-item">
                    <span className="bullet-icon"><Ico size={20}/></span>
                    <span className="incluye-tit">{x.titulo}</span>
                    <span className="incluye-txt">{x.texto}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* BONUS DE REGALO — solo si hay bonus */}
      {bonusLista.length > 0 && (
        <div className={franja()}>
          <div className="seccion">
            <h2 className="seccion-titulo"><Gift size={22} style={{verticalAlign:'-3px',marginRight:'6px'}}/>Bonus de regalo</h2>
            <div className="bullets-grid">
              {bonusLista.map((b, i) => {
                const Ico = b.archivo ? null : (ICONO_BONUS[b.tipo] || Gift)
                return (
                  <div key={i} className="bullet-card">
                    <div className="bullet-icon">{b.archivo ? <IconoArchivo nombre={b.archivo} size={18}/> : <Ico size={18}/>}</div>
                    <div className="bullet-texto">
                      {b.nombre}
                      {b.detalle && <span style={{display:'block',fontSize:'12px',opacity:0.75,marginTop:'2px',fontWeight:500}}>{b.detalle}</span>}
                      <span style={{display:'block',fontSize:'12px',marginTop:'4px'}}>
                        {Number(b.valor) > 0 && <span style={{textDecoration:'line-through',opacity:0.6,marginRight:'6px'}}>${Number(b.valor).toLocaleString('es-AR')}</span>}
                        <b style={{color:'var(--primary)'}}>{Number(b.valor) > 0 ? 'de regalo' : 'De regalo'}</b>
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* 9. QUÉ NECESITÁS */}
      {!esDescargable && requisitos.length > 0 && (
        <div className={franja()}>
          <div className="seccion">
            <h2 className="seccion-titulo">Qué necesitás</h2>
            <div className="req-chips">
              {requisitos.map((r, i) => <span key={i} className="chip"><Check size={13}/> {r}</span>)}
            </div>
          </div>
        </div>
      )}

      {/* 10. CIERRE */}
      <div className="cierre-wrap">
        <div className="cierre">
          {curso.imagen_url && <img src={curso.imagen_url} alt="" className="cierre-foto"/>}
          <h2 className="cierre-titulo">{esGratis ? 'Empezá hoy' : 'Accedé ahora'}</h2>
          {ventasAbiertas && bloquePrecio}
          <div className="cierre-modalidad">{textoModalidad}</div>
          <div className="botones">{botonComprar('btn-comprar')}</div>
          {ventasAbiertas && bonusLista.length > 0 && <div className="cierre-modalidad">Incluye {bonusLista.length} bonus de regalo</div>}
          {waNumero && (
            <a className="cierre-link" href={`https://wa.me/${waNumero}?text=${encodeURIComponent(`Hola! Tengo una duda sobre ${curso.titulo}`)}`} target="_blank" rel="noopener noreferrer">¿Dudas? Escribime</a>
          )}
          {curso.dias_garantia && (
            <div className="garantia-card">
              <Shield size={16} style={{verticalAlign:'-3px',marginRight:'6px'}}/>
              {curso.dias_garantia} días de garantía{curso.politica_reembolso ? ` — ${curso.politica_reembolso}` : ''}
            </div>
          )}
        </div>
      </div>

      <div className="ingresar-aula">
        ¿Ya {esDescargable ? 'lo compraste' : 'compraste este curso'}? <button onClick={() => router.push('/aula')}>{esDescargable ? 'Ingresar a mi cuenta' : 'Ingresar a mi aula'}</button>
      </div>

      <div className="footer-curso">
        Creado con <a href="https://lumaapp.lat" style={{color:'var(--primary)',textDecoration:'none',fontWeight:700}}>Luma</a>
      </div>

      {/* MODAL DE PREVIEW GRATIS */}
      {previewVideo && (
        <div
          onClick={() => setPreviewVideo(null)}
          style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}
        >
          <div onClick={(e) => e.stopPropagation()} style={{width:'100%',maxWidth:'720px',position:'relative'}}>
            <button
              onClick={() => setPreviewVideo(null)}
              aria-label="Cerrar"
              style={{position:'absolute',top:'-38px',right:0,background:'transparent',border:'none',color:'#fff',fontSize:'28px',cursor:'pointer',lineHeight:1}}
            >×</button>
            <div style={{position:'relative',paddingBottom:'56.25%',height:0,borderRadius:'12px',overflow:'hidden',background:'#000'}}>
              {renderizarReproductor(previewVideo)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
