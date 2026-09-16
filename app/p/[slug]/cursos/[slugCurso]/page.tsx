'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Check, Shield, Play, Sparkles, Star, Moon } from 'lucide-react'

type Terapeuta = {
  user_id: string; nombre_profesional: string; especialidad: string
  bio: string; avatar_url: string; slug: string; template?: string
  whatsapp?: string; mp_activo?: boolean; acepta_transferencia?: boolean; alias_pago?: string
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
}

type Leccion = {
  id: string; titulo: string; tipo: string; duracion_min: number | null
  es_preview: boolean; contenido_url?: string | null
}

type Modulo = {
  id: string; titulo: string; descripcion: string; orden: number
  lecciones?: Leccion[]
}

type Testimonio = {
  id: string; titulo?: string; texto: string; avatar_url?: string; orden: number
}

const TEMPLATES = {
  luna: {
    bg: '#0D0B14', bg2: '#12101C', bg3: '#1A1628',
    primary: '#C9A84C', primaryLight: '#E8D5A3', primaryDim: 'rgba(201,168,76,0.3)',
    accent: '#6B3FA0', accentLight: '#9B6DD0', accentDim: 'rgba(107,63,160,0.2)',
    text: '#D4C5A9', textDim: '#7A6B8A', cream: '#F0E8D5', border: 'rgba(201,168,76,0.2)',
    fontBody: "'Jost', sans-serif", googleFonts: 'Jost:wght@300;400;500;600',
    dark: true, ctaBg: '#0D0B14',
    cardBg: 'rgba(26,22,40,0.6)', navBg: 'rgba(13,11,20,0.85)',
    btnBg: 'linear-gradient(135deg,#6B3FA0,#8B5CF6)', btnColor: '#E8D5A3',
  },
  aura: {
    bg: '#F8F4FF', bg2: '#F0EBFF', bg3: '#E8E0FF',
    primary: '#7C3AED', primaryLight: '#A78BFA', primaryDim: 'rgba(124,58,237,0.2)',
    accent: '#EC4899', accentLight: '#F9A8D4', accentDim: 'rgba(236,72,153,0.15)',
    text: '#4B5563', textDim: '#9CA3AF', cream: '#1F2937', border: 'rgba(124,58,237,0.15)',
    fontBody: "'DM Sans', sans-serif", googleFonts: 'DM+Sans:wght@300;400;500;600',
    dark: false, ctaBg: '#1A1A2E',
    cardBg: 'rgba(255,255,255,0.85)', navBg: 'rgba(248,244,255,0.85)',
    btnBg: 'linear-gradient(135deg,#7C3AED,#EC4899)', btnColor: 'white',
  },
  tierra: {
    bg: '#FAF7F0', bg2: '#F5F0E8', bg3: '#EDE8DC',
    primary: '#92400E', primaryLight: '#D97706', primaryDim: 'rgba(146,64,14,0.2)',
    accent: '#065F46', accentLight: '#10B981', accentDim: 'rgba(6,95,70,0.15)',
    text: '#44403C', textDim: '#A8A29E', cream: '#1C1917', border: 'rgba(146,64,14,0.15)',
    fontBody: "'Nunito', sans-serif", googleFonts: 'Nunito:wght@300;400;500;600',
    dark: false, ctaBg: '#1A1A2E',
    cardBg: 'rgba(255,255,255,0.8)', navBg: 'rgba(250,247,240,0.85)',
    btnBg: 'linear-gradient(135deg,#92400E,#D97706)', btnColor: 'white',
  },
  rosa: {
    bg: '#FFF0F6', bg2: '#FFE4F0', bg3: '#FFD6E8',
    primary: '#BE185D', primaryLight: '#F472B6', primaryDim: 'rgba(190,24,93,0.2)',
    accent: '#9D174D', accentLight: '#EC4899', accentDim: 'rgba(157,23,77,0.15)',
    text: '#4A1942', textDim: '#9D7A95', cream: '#2D0A25', border: 'rgba(190,24,93,0.15)',
    fontBody: "'DM Sans', sans-serif", googleFonts: 'DM+Sans:wght@300;400;500;600',
    dark: false, ctaBg: '#1A1A2E',
    cardBg: 'rgba(255,255,255,0.9)', navBg: 'rgba(255,240,246,0.85)',
    btnBg: 'linear-gradient(135deg,#BE185D,#EC4899)', btnColor: 'white',
  },
  violeta: {
    bg: '#1E0A3C', bg2: '#2D1058', bg3: '#3D1570',
    primary: '#C084FC', primaryLight: '#E9D5FF', primaryDim: 'rgba(192,132,252,0.3)',
    accent: '#A855F7', accentLight: '#D8B4FE', accentDim: 'rgba(168,85,247,0.2)',
    text: '#DDD6FE', textDim: '#8B5CF6', cream: '#FAF5FF', border: 'rgba(192,132,252,0.25)',
    fontBody: "'Jost', sans-serif", googleFonts: 'Jost:wght@300;400;500;600',
    dark: true, ctaBg: '#1E0A3C',
    cardBg: 'rgba(61,21,112,0.5)', navBg: 'rgba(30,10,60,0.85)',
    btnBg: 'linear-gradient(135deg,#7C3AED,#C084FC)', btnColor: 'white',
  },
  verde: {
    bg: '#F0FDF4', bg2: '#DCFCE7', bg3: '#BBF7D0',
    primary: '#065F46', primaryLight: '#10B981', primaryDim: 'rgba(6,95,70,0.2)',
    accent: '#047857', accentLight: '#34D399', accentDim: 'rgba(4,120,87,0.15)',
    text: '#1C4532', textDim: '#6B7280', cream: '#022C22', border: 'rgba(6,95,70,0.15)',
    fontBody: "'Nunito', sans-serif", googleFonts: 'Nunito:wght@300;400;500;600',
    dark: false, ctaBg: '#1A1A2E',
    cardBg: 'rgba(255,255,255,0.85)', navBg: 'rgba(240,253,244,0.85)',
    btnBg: 'linear-gradient(135deg,#065F46,#10B981)', btnColor: 'white',
  },
}

const ESTRELLAS_HERO = [
  { top: '14%', left: '22%' }, { top: '72%', left: '88%' },
  { top: '42%', left: '78%' }, { top: '86%', left: '28%' },
]
const ESTRELLAS_CTA = [
  { top: '18%', left: '85%' }, { top: '75%', left: '12%' },
]

// decoración esotérica del hero — puramente visual, no afecta datos ni lógica
const ZODIACOS_HERO = [
  { simbolo: '♈', top: '6%', left: '4%', size: '20px', rot: '-8deg' },
  { simbolo: '♌', top: '10%', left: '92%', size: '17px', rot: '10deg' },
  { simbolo: '♎', top: '88%', left: '8%', size: '18px', rot: '6deg' },
  { simbolo: '♓', top: '4%', left: '62%', size: '15px', rot: '-4deg' },
  { simbolo: '♊', top: '92%', left: '85%', size: '16px', rot: '12deg' },
]
const ZODIACOS_CTA = [
  { simbolo: '♍', top: '8%', left: '6%', size: '16px', rot: '-6deg' },
  { simbolo: '♏', top: '85%', left: '90%', size: '18px', rot: '8deg' },
]
const DESTELLOS_HERO = [
  { top: '20%', left: '8%', size: 12, delay: '0s' },
  { top: '80%', left: '18%', size: 9, delay: '0.9s' },
  { top: '10%', left: '82%', size: 10, delay: '1.6s' },
  { top: '68%', left: '92%', size: 8, delay: '0.4s' },
]

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

  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    try {
      const supabase = createClient()
      const { data: perfil } = await supabase
        .from('therapist_profiles').select('*')
        .eq('slug', slug).maybeSingle()
      if (!perfil) { setLoading(false); return }
      setTerapeuta(perfil)

      const { data: cursoData } = await supabase
        .from('courses').select('*')
        .eq('slug', slugCurso)
        .eq('user_id', perfil.user_id)
        .eq('estado', 'publicado')
        .maybeSingle()
      if (!cursoData) { setLoading(false); return }
      setCurso(cursoData)

      const { data: mods } = await supabase
        .from('modules').select('*')
        .eq('course_id', cursoData.id).order('orden')
      if (mods) {
        const { data: lecs } = await supabase
          .from('lessons')
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
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const t = TEMPLATES[(terapeuta?.template as keyof typeof TEMPLATES) || 'luna']
  const totalLecciones = modulos.reduce((acc, m) => acc + (m.lecciones?.length || 0), 0)
  const esOferta = curso?.precio_original && curso.precio_original > curso.precio
  const tieneMP = !!terapeuta?.mp_activo
  const tieneTransferencia = !!(terapeuta?.acepta_transferencia && terapeuta?.alias_pago)
  const sinMetodoPago = !tieneMP && !tieneTransferencia

  const leccionPreview = modulos
    .flatMap(m => m.lecciones || [])
    .find(l => l.es_preview && l.tipo === 'video' && l.contenido_url)
  const videoUrl = curso?.video_presentacion_url || leccionPreview?.contenido_url || null
  const tituloVideo = curso?.video_presentacion_url
    ? 'Mirá el video de presentación del curso'
    : 'Mirá nuestra primera clase gratis y resolvé todas tus dudas'

  function irACheckout() { router.push(`/p/${slug}/cursos/${slugCurso}/checkout`) }
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
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:'14px',color:'#6B7280',fontFamily:'sans-serif'}}>
      Curso no encontrado
    </div>
  )

  return (
    <div style={{fontFamily:'var(--font-body)',background:'var(--bg)',minHeight:'100vh',color:'var(--text)'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800;900&family=${t.googleFonts}&display=swap');
        :root{
          --bg:${t.bg};--bg2:${t.bg2};--bg3:${t.bg3};
          --primary:${t.primary};--primary-light:${t.primaryLight};--primary-dim:${t.primaryDim};
          --accent:${t.accent};--accent-light:${t.accentLight};--accent-dim:${t.accentDim};
          --text:${t.text};--text-dim:${t.textDim};--cream:${t.cream};--border:${t.border};
          --card-bg:${t.cardBg};--font-body:${t.fontBody};--font-title:'Montserrat',sans-serif;
          --btn-bg:${t.btnBg};--btn-color:${t.btnColor};--cta-bg:${t.ctaBg};
        }
        *{box-sizing:border-box;margin:0;padding:0}
        html,body{background:var(--bg)}

        .grano{position:relative}
        .grano::before{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;
          opacity:${t.dark ? 0.06 : 0.035};
          background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")}
        .estrella-fija{position:absolute;width:2px;height:2px;background:var(--primary-light);border-radius:50%;opacity:.7;z-index:0;animation:titilar 3.5s ease-in-out infinite}
        @keyframes titilar{0%,100%{opacity:.15}50%{opacity:.8}}
        .zodiaco{position:absolute;z-index:1;color:var(--primary-light);opacity:.28;font-family:serif;pointer-events:none;user-select:none;text-shadow:0 0 10px var(--primary-dim);animation:zodiflotar 7s ease-in-out infinite}
        @keyframes zodiflotar{0%,100%{transform:translateY(0) rotate(var(--rot,0deg))}50%{transform:translateY(-8px) rotate(var(--rot,0deg))}}
        .destello{position:absolute;z-index:1;color:var(--accent-light);opacity:0;pointer-events:none;animation:destellar 2.8s ease-in-out infinite}
        @keyframes destellar{0%,100%{opacity:0;transform:scale(.6) rotate(0deg)}50%{opacity:.85;transform:scale(1) rotate(90deg)}}
        .mandala{position:absolute;z-index:0;pointer-events:none;opacity:${t.dark ? 0.14 : 0.09};}

        .nav{position:sticky;top:0;z-index:100;background:${t.navBg};backdrop-filter:blur(10px);padding:14px 20px;border-bottom:1px solid var(--border)}
        .nav-inner{max-width:1040px;margin:0 auto;width:100%;display:flex;justify-content:space-between;align-items:center}
        .nav-nombre{font-family:var(--font-title);font-size:15px;font-weight:800;color:var(--primary)}
        .nav-btn{padding:9px 18px;border-radius:50px;border:1px solid var(--border);background:transparent;color:var(--text);font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font-body)}

        .hero{position:relative;overflow:hidden;padding:48px 20px 60px;
          background:
            radial-gradient(circle at 14% 18%, var(--accent-dim) 0%, transparent 42%),
            radial-gradient(circle at 88% 8%, var(--primary-dim) 0%, transparent 38%),
            radial-gradient(circle at 78% 92%, var(--accent-dim) 0%, transparent 46%),
            linear-gradient(160deg,var(--bg2),var(--bg) 72%);
        }
        .hero-shape{position:absolute;pointer-events:none;opacity:${t.dark ? 0.5 : 0.35};z-index:1}
        .hero-grid{position:relative;z-index:2;max-width:1040px;margin:0 auto;display:grid;grid-template-areas:"titulo" "foto" "subtitulo" "boton";gap:22px;justify-items:center;text-align:center}
        @media(min-width:860px){
          .hero-grid{grid-template-columns:1fr 1fr;grid-template-areas:"titulo foto" "subtitulo foto" "boton foto";align-items:center;justify-items:start;text-align:left;gap:24px 56px;min-height:70vh}
        }
        .ga-titulo{grid-area:titulo}
        .ga-foto{grid-area:foto;width:100%;display:flex;justify-content:center}
        .ga-subtitulo{grid-area:subtitulo}
        .ga-boton{grid-area:boton}
        .hero-titulo{font-family:var(--font-title);font-weight:900;font-size:clamp(28px,5vw,46px);line-height:1.12;color:var(--cream);text-shadow:${t.dark ? '0 4px 24px rgba(0,0,0,0.4)' : 'none'}}
        .hero-foto-wrap{position:relative;width:100%;max-width:380px;animation:float 5s ease-in-out infinite}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        .hero-blob{position:absolute;border-radius:50%;filter:blur(6px);z-index:0}
        .hero-foto-frame{position:relative;z-index:2;padding:5px;border-radius:32px;background:var(--btn-bg);box-shadow:0 30px 60px rgba(0,0,0,${t.dark?0.55:0.2}),0 0 0 1px var(--border)}
        .hero-foto{width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:27px;display:block}
        .hero-sticker{position:absolute;top:-14px;right:-10px;z-index:3;width:54px;height:54px;border-radius:50%;background:var(--card-bg);border:2px dashed var(--primary);display:flex;align-items:center;justify-content:center;transform:rotate(-12deg);box-shadow:0 10px 26px rgba(0,0,0,${t.dark?0.5:0.18});backdrop-filter:blur(6px)}
        .hero-sub{font-size:15px;color:var(--text-dim);line-height:1.5;max-width:420px}
        .hero-btn{padding:15px 34px;background:var(--btn-bg);color:var(--btn-color);border:none;border-radius:50px;font-size:14px;font-weight:800;cursor:pointer;font-family:var(--font-body);box-shadow:0 14px 34px var(--accent-dim)}
        .wave{position:relative;width:100%;line-height:0;z-index:2}

        .chips-row{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;padding:0 20px 8px;max-width:640px;margin:0 auto}
        .chip{padding:9px 16px;border-radius:50px;background:linear-gradient(135deg,var(--primary-dim),var(--accent-dim));color:var(--cream);font-size:12px;font-weight:700;border:1px solid var(--border);box-shadow:0 6px 16px rgba(0,0,0,${t.dark?0.3:0.06})}

        .seccion{padding:52px 20px;position:relative}
        .seccion-titulo{font-family:var(--font-title);font-weight:800;font-size:clamp(22px,4.5vw,32px);color:var(--cream);text-align:center;margin-bottom:28px}

        .desc-larga{max-width:680px;margin:0 auto;font-size:15px;line-height:1.55;color:var(--text);white-space:pre-line;text-align:center}

        .orn-divider{display:flex;align-items:center;justify-content:center;gap:14px;max-width:280px;margin:0 auto 8px;color:var(--primary)}
        .orn-divider .linea{flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--primary-dim),transparent)}

        .bullets-sec{background:var(--bg2)}
        .bullets-grid{display:flex;flex-direction:column;gap:14px;max-width:560px;margin:0 auto;position:relative;z-index:1}
        @media(min-width:768px){ .bullets-grid{display:grid;grid-template-columns:1fr 1fr} }
        .bullet-card{display:flex;align-items:center;gap:16px;background:${t.dark?'rgba(255,255,255,0.06)':'rgba(255,255,255,0.75)'};border-radius:22px;padding:18px 20px;box-shadow:0 12px 30px rgba(0,0,0,${t.dark?0.35:0.08});position:relative;overflow:hidden}
        .bullet-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--btn-bg)}
        .bullet-icon{width:40px;height:40px;border-radius:50%;background:var(--btn-bg);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 8px 18px var(--accent-dim);color:var(--btn-color);font-size:16px}
        .bullet-texto{font-size:14px;font-weight:700;color:var(--cream);line-height:1.4}

        .testi-sec{text-align:center;position:relative}
        .testi-carousel{max-width:480px;margin:0 auto;position:relative;z-index:1}
        .testi-card{background:var(--card-bg);border:1px solid var(--border);border-radius:24px;padding:32px 26px;box-shadow:0 16px 40px rgba(0,0,0,${t.dark?0.4:0.1});position:relative;overflow:hidden}
        .testi-card::after{content:'';position:absolute;width:140px;height:140px;background:var(--accent-dim);border-radius:50%;filter:blur(30px);top:-50px;right:-50px;z-index:-1}
        .testi-quote{font-size:52px;color:var(--primary-dim);font-family:serif;line-height:0.6;margin-bottom:10px}
        .testi-texto{font-size:16px;color:var(--cream);line-height:1.5;margin-bottom:16px}
        .testi-nombre{font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:var(--primary);font-weight:700}
        .testi-nav{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:20px}
        .testi-arrow{width:36px;height:36px;border-radius:50%;border:1px solid var(--border);background:var(--card-bg);color:var(--primary);display:flex;align-items:center;justify-content:center;cursor:pointer}
        .testi-dots{display:flex;gap:7px}
        .testi-dot{width:6px;height:6px;border-radius:50%;background:var(--border);cursor:pointer}
        .testi-dot.act{width:18px;border-radius:3px;background:var(--primary)}

        .modulo-card{border:1px solid var(--border);border-radius:20px;margin-bottom:12px;overflow:hidden;background:var(--card-bg);box-shadow:0 10px 26px rgba(0,0,0,${t.dark?0.35:0.06});position:relative}
        .modulo-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--btn-bg)}
        .modulo-header{display:flex;align-items:center;gap:14px;padding:16px 18px;cursor:pointer}
        .modulo-num{width:38px;height:38px;border-radius:50%;background:var(--btn-bg);color:var(--btn-color);display:flex;align-items:center;justify-content:center;font-family:var(--font-title);font-weight:800;font-size:14px;flex-shrink:0}
        .modulo-titulo{flex:1;font-size:14px;font-weight:700;color:var(--cream)}
        .modulo-count{font-size:11px;color:var(--text-dim)}
        .leccion-item{display:flex;align-items:center;gap:10px;padding:11px 18px 11px 62px;border-top:1px solid var(--border)}
        .tipo-icon{width:26px;height:26px;border-radius:8px;background:var(--primary-dim);display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0}
        .preview-badge{font-size:9px;background:#DCFCE7;color:#166534;padding:2px 7px;border-radius:10px;font-weight:800}

        .video-sec{background:var(--bg2);text-align:center}
        .video-wrap-frame{max-width:696px;margin:0 auto;position:relative;z-index:1;border-radius:24px;padding:6px;background:var(--btn-bg);box-shadow:0 20px 50px rgba(0,0,0,${t.dark?0.45:0.15})}
        .video-wrap{border-radius:18px;overflow:hidden;position:relative;padding-bottom:56.25%;height:0;background:#000}
        .video-wrap iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:none}

        .requisitos-sec{max-width:560px;margin:0 auto;text-align:center}
        .requisitos-lista{display:inline-flex;flex-direction:column;gap:8px;text-align:left;margin:0 auto}
        .requisito-item{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-dim)}

        .cta-sec{position:relative;background:
            radial-gradient(circle at 12% 15%, var(--accent-dim) 0%, transparent 45%),
            radial-gradient(circle at 90% 85%, var(--accent-dim) 0%, transparent 45%),
            linear-gradient(160deg,var(--cta-bg),#000);
          color:#F5F5F5;padding:60px 20px;overflow:hidden}
        .cta-inner{max-width:420px;margin:0 auto;position:relative;z-index:2;text-align:center}
        .cta-foto-frame{width:88px;height:88px;border-radius:24px;margin:0 auto 18px;padding:3px;background:var(--btn-bg);box-shadow:0 10px 30px rgba(0,0,0,0.4)}
        .cta-foto{width:100%;height:100%;border-radius:21px;object-fit:cover;display:block}
        .cta-titulo{font-family:var(--font-title);font-weight:900;font-size:clamp(24px,5vw,36px);margin-bottom:20px}
        .cta-beneficios{display:flex;flex-direction:column;gap:10px;text-align:left;margin-bottom:24px}
        .cta-beneficio{display:flex;align-items:center;gap:10px;font-size:13px;color:rgba(255,255,255,0.85)}
        .oferta-badge{display:inline-block;background:#FB923C;color:#1A1A2E;font-size:11px;font-weight:800;padding:5px 12px;border-radius:50px;margin-bottom:10px;border:1.5px dashed rgba(26,26,46,0.35);transform:rotate(-4deg);box-shadow:0 6px 14px rgba(0,0,0,0.25)}
        .cta-precio-original{font-size:15px;color:rgba(255,255,255,0.4);text-decoration:line-through}
        .cta-precio{font-family:var(--font-title);font-weight:900;font-size:44px;color:var(--primary-light);margin-bottom:20px;text-shadow:0 0 24px var(--primary-dim)}
        .btn-comprar{width:100%;padding:17px;background:var(--btn-bg);color:var(--btn-color);border:none;border-radius:50px;font-size:15px;font-weight:800;cursor:pointer;font-family:var(--font-body);box-shadow:0 14px 34px var(--accent-dim)}
        .btn-wsp{width:100%;padding:17px;background:#25D366;color:white;border:none;border-radius:50px;font-size:15px;font-weight:800;cursor:pointer;font-family:var(--font-body);display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none}
        .garantia-card{margin-top:20px;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);border-radius:18px;padding:18px;text-align:center}

        .footer-curso{text-align:center;padding:24px;font-size:11px;color:var(--text-dim)}
      `}</style>

      {/* NAV */}
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-nombre">{terapeuta.nombre_profesional}</div>
          <button className="nav-btn" onClick={() => router.push('/auth/login')}>Iniciar sesión</button>
        </div>
      </nav>

      {/* HERO — gradientes en capas + blobs + esoterismo (estrellas, zodiaco, destellos, mandala) + grano */}
      <div className="hero grano">
        <svg className="mandala" style={{top:'50%',left:'50%',width:'620px',height:'620px',transform:'translate(-50%,-50%)'}} viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="100" r="98" stroke="var(--primary)" strokeWidth="0.5"/>
          <circle cx="100" cy="100" r="76" stroke="var(--accent-light)" strokeWidth="0.5"/>
          <circle cx="100" cy="100" r="54" stroke="var(--primary)" strokeWidth="0.5"/>
        </svg>

        {t.dark && ESTRELLAS_HERO.map((s, i) => (
          <div key={i} className="estrella-fija" style={{top:s.top,left:s.left,animationDelay:`${i*0.6}s`}}/>
        ))}
        {ZODIACOS_HERO.map((z, i) => (
          <div key={i} className="zodiaco" style={{top:z.top,left:z.left,fontSize:z.size,'--rot':z.rot} as React.CSSProperties}>{z.simbolo}</div>
        ))}
        {DESTELLOS_HERO.map((d, i) => (
          <Sparkles key={i} size={d.size} className="destello" style={{top:d.top,left:d.left,animationDelay:d.delay}}/>
        ))}
        <svg className="hero-shape" style={{top:'8%',left:'6%',width:'46px'}} viewBox="0 0 24 24" fill="none">
          <path d="M12 2l2.2 6.8H21l-5.6 4.1 2.2 6.9L12 15.7 6.4 19.8l2.2-6.9L3 8.8h6.8z" fill="var(--primary)"/>
        </svg>
        <svg className="hero-shape" style={{top:'14%',right:'8%',width:'30px'}} viewBox="0 0 24 24" fill="none">
          <path d="M20 12.5A8.5 8.5 0 1111.5 4 6.8 6.8 0 0020 12.5z" fill="var(--accent-light)"/>
        </svg>
        <Moon size={22} className="hero-shape" style={{top:'80%',right:'12%',color:'var(--primary-light)',opacity:t.dark?0.5:0.3}}/>

        <div className="hero-grid">
          <h1 className="hero-titulo ga-titulo">{curso.titulo}</h1>

          <div className="ga-foto">
            <div className="hero-foto-wrap">
              <div className="hero-blob" style={{width:'170px',height:'170px',background:'var(--accent-dim)',top:'-24px',left:'-28px',opacity:0.9}}/>
              <div className="hero-blob" style={{width:'130px',height:'130px',background:'var(--primary-dim)',bottom:'-16px',right:'-20px',opacity:0.9}}/>
              <div className="hero-blob" style={{width:'90px',height:'90px',background:'var(--accent-dim)',bottom:'40%',left:'-14px',filter:'blur(10px)',opacity:0.6}}/>
              <div className="hero-foto-frame">
                {curso.imagen_url && <img src={curso.imagen_url} alt={curso.titulo} className="hero-foto"/>}
              </div>
              <div className="hero-sticker"><Star size={20} color="var(--primary)" fill="var(--primary)"/></div>
            </div>
          </div>

          <p className="hero-sub ga-subtitulo">{curso.descripcion_corta}</p>

          <div className="ga-boton">
            <button className="hero-btn" onClick={irACheckout}>✦ Comprar ahora — ${curso.precio.toLocaleString()}</button>
          </div>
        </div>

        <svg className="wave" viewBox="0 0 1440 60" preserveAspectRatio="none" style={{height:'46px',marginTop:'40px'}}>
          <path d="M0,32 C240,60 480,0 720,20 C960,40 1200,10 1440,30 L1440,60 L0,60 Z" fill="var(--bg)"/>
        </svg>
      </div>

      {/* METADATA — plano */}
      <div className="chips-row">
        {curso.duracion_estimada_horas && <div className="chip">⏱ {curso.duracion_estimada_horas}hs de curso</div>}
        {curso.nivel && <div className="chip">📊 Nivel {curso.nivel}</div>}
        {curso.idioma && <div className="chip">🌐 {curso.idioma}</div>}
        {modulos.length > 0 && <div className="chip">📚 {modulos.length} módulos</div>}
        {curso.modalidad === 'unico' && <div className="chip">✦ Acceso de por vida</div>}
      </div>

      {/* SOBRE ESTE CURSO — plano */}
      {curso.descripcion_larga?.trim() && (
        <div className="seccion">
          <h2 className="seccion-titulo">Sobre este curso</h2>
          <p className="desc-larga">{curso.descripcion_larga}</p>
        </div>
      )}

      {/* QUÉ VAS A APRENDER — medio: grano */}
      {curso.que_aprenderas?.filter(x => x.trim()).length > 0 && (
        <div className="seccion bullets-sec grano">
          <svg className="wave" viewBox="0 0 1440 40" preserveAspectRatio="none" style={{height:'34px',position:'absolute',top:'-1px',left:0}}>
            <path d="M0,20 C360,0 1080,40 1440,10 L1440,0 L0,0 Z" fill="var(--bg2)"/>
          </svg>
          <h2 className="seccion-titulo">Qué vas a aprender</h2>
          <div className="bullets-grid">
            {curso.que_aprenderas.filter(x => x.trim()).map((item, i) => (
              <div key={i} className="bullet-card">
                <div className="bullet-icon">✦</div>
                <div className="bullet-texto">{item}</div>
              </div>
            ))}
          </div>
          <svg className="wave" viewBox="0 0 1440 40" preserveAspectRatio="none" style={{height:'34px',position:'absolute',bottom:'-1px',left:0}}>
            <path d="M0,20 C360,40 1080,0 1440,30 L1440,40 L0,40 Z" fill="var(--bg)"/>
          </svg>
        </div>
      )}

      {/* PARA QUIÉN ES — plano */}
      {curso.para_quien?.filter(x => x.trim()).length > 0 && (
        <div className="seccion">
          <h2 className="seccion-titulo">¿Para quién es este curso?</h2>
          <div className="bullets-grid">
            {curso.para_quien.filter(x => x.trim()).map((item, i) => (
              <div key={i} className="bullet-card">
                <div className="bullet-icon"><Check size={16}/></div>
                <div className="bullet-texto">{item}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {testimonios.length > 0 && (curso.para_quien?.filter(x => x.trim()).length > 0) && (
        <div className="orn-divider"><span className="linea"/><Sparkles size={16}/><span className="linea"/></div>
      )}

      {/* TESTIMONIOS — plano */}
      {testimonios.length > 0 && (
        <div className="seccion testi-sec">
          <h2 className="seccion-titulo">Testimonios</h2>
          <div className="testi-carousel" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
            <div className="testi-card">
              <div className="testi-quote">"</div>
              <p className="testi-texto">{testimonios[testiIdx].texto}</p>
              <div className="testi-nombre">— {testimonios[testiIdx].titulo || 'Alumna'}</div>
            </div>
            {testimonios.length > 1 && (
              <div className="testi-nav">
                <div className="testi-arrow" onClick={anteriorTesti}><ChevronLeft size={16}/></div>
                <div className="testi-dots">
                  {testimonios.map((_, i) => (
                    <div key={i} className={`testi-dot${testiIdx===i?' act':''}`} onClick={() => setTestiIdx(i)}/>
                  ))}
                </div>
                <div className="testi-arrow" onClick={siguienteTesti}><ChevronRight size={16}/></div>
              </div>
            )}
          </div>
        </div>
      )}

      {modulos.length > 0 && testimonios.length > 0 && (
        <div className="orn-divider"><span className="linea"/><Sparkles size={16}/><span className="linea"/></div>
      )}

      {/* TEMARIO — plano */}
      {modulos.length > 0 && (
        <div className="seccion">
          <h2 className="seccion-titulo">Programa del curso</h2>
          <div style={{maxWidth:'640px',margin:'0 auto'}}>
            {modulos.map((m, idx) => (
              <div key={m.id} className="modulo-card">
                <div className="modulo-header" onClick={() => setModuloAbierto(moduloAbierto === m.id ? null : m.id)}>
                  <div className="modulo-num">{idx + 1}</div>
                  <div className="modulo-titulo">{m.titulo}</div>
                  <div className="modulo-count">{m.lecciones?.length || 0} lec.</div>
                  {moduloAbierto === m.id ? <ChevronUp size={16} color="var(--text-dim)"/> : <ChevronDown size={16} color="var(--text-dim)"/>}
                </div>
                {moduloAbierto === m.id && m.lecciones?.map(l => (
                  <div key={l.id} className="leccion-item">
                    <div className="tipo-icon">
                      {l.tipo === 'video' ? <Play size={11} color="var(--primary)"/> : l.tipo === 'pdf' ? '📄' : l.tipo === 'audio' ? '🎵' : '📝'}
                    </div>
                    <div style={{flex:1,fontSize:'13px',color:'var(--text)'}}>{l.titulo}</div>
                    {l.es_preview && <span className="preview-badge">GRATIS</span>}
                    {l.duracion_min && <span style={{fontSize:'11px',color:'var(--text-dim)'}}>{l.duracion_min}min</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIDEO — medio: grano */}
      {videoUrl && (
        <div className="seccion video-sec grano">
          <svg className="wave" viewBox="0 0 1440 40" preserveAspectRatio="none" style={{height:'34px',position:'absolute',top:'-1px',left:0}}>
            <path d="M0,20 C360,0 1080,40 1440,10 L1440,0 L0,0 Z" fill="var(--bg2)"/>
          </svg>
          <h2 className="seccion-titulo">{tituloVideo}</h2>
          <div className="video-wrap-frame">
            <div className="video-wrap">
              <iframe src={videoUrl.replace('watch?v=', 'embed/')} allowFullScreen/>
            </div>
          </div>
          <svg className="wave" viewBox="0 0 1440 40" preserveAspectRatio="none" style={{height:'34px',position:'absolute',bottom:'-1px',left:0}}>
            <path d="M0,20 C360,40 1080,0 1440,30 L1440,40 L0,40 Z" fill="var(--bg)"/>
          </svg>
        </div>
      )}

      {/* REQUISITOS — plano */}
      {curso.requisitos?.filter(x => x.trim()).length > 0 && (
        <div className="seccion requisitos-sec">
          <h2 className="seccion-titulo">Requisitos</h2>
          <div className="requisitos-lista">
            {curso.requisitos.filter(x => x.trim()).map((r, i) => (
              <div key={i} className="requisito-item"><Check size={13} color="var(--primary)"/> {r}</div>
            ))}
          </div>
        </div>
      )}

      <svg className="wave" viewBox="0 0 1440 40" preserveAspectRatio="none" style={{height:'34px',display:'block'}}>
        <path d="M0,10 C360,40 1080,0 1440,20 L1440,40 L0,40 Z" fill="var(--cta-bg)"/>
      </svg>

      {/* CTA FINAL — fuerte: estrellas + zodiaco + grano */}
      <div className="cta-sec grano">
        {t.dark && ESTRELLAS_CTA.map((s, i) => (
          <div key={i} className="estrella-fija" style={{top:s.top,left:s.left,animationDelay:`${i*0.8}s`}}/>
        ))}
        {ZODIACOS_CTA.map((z, i) => (
          <div key={i} className="zodiaco" style={{top:z.top,left:z.left,fontSize:z.size,'--rot':z.rot,color:'var(--primary-light)'} as React.CSSProperties}>{z.simbolo}</div>
        ))}
        <div className="cta-inner">
          {curso.imagen_url && (
            <div className="cta-foto-frame"><img src={curso.imagen_url} alt={curso.titulo} className="cta-foto"/></div>
          )}
          <h2 className="cta-titulo">Accedé ahora</h2>

          <div className="cta-beneficios">
            <div className="cta-beneficio"><Check size={15} color="var(--primary-light)"/> Acceso de por vida al contenido</div>
            {modulos.length > 0 && <div className="cta-beneficio"><Check size={15} color="var(--primary-light)"/> {modulos.length} módulos y {totalLecciones} lecciones en video</div>}
            <div className="cta-beneficio"><Check size={15} color="var(--primary-light)"/> Material descargable</div>
            <div className="cta-beneficio"><Check size={15} color="var(--primary-light)"/> Certificado de finalización verificable</div>
            <div className="cta-beneficio"><Check size={15} color="var(--primary-light)"/> Actualizaciones incluidas para siempre</div>
            {curso.dias_garantia && <div className="cta-beneficio"><Check size={15} color="var(--primary-light)"/> {curso.dias_garantia} días de garantía</div>}
          </div>

          {esOferta && <div className="oferta-badge">🏷️ OFERTA</div>}
          {curso.precio_original && esOferta && <div className="cta-precio-original">${curso.precio_original.toLocaleString()}</div>}
          <div className="cta-precio">${curso.precio.toLocaleString()}</div>

          {sinMetodoPago ? (
            <a className="btn-wsp"
              href={`https://wa.me/${terapeuta.whatsapp?.replace(/\D/g,'').replace(/^0+/,'')}?text=${encodeURIComponent(`Hola! Quiero inscribirme al curso ${curso.titulo}, ¿cómo pago?`)}`}
              target="_blank" rel="noopener noreferrer">
              💬 Quiero inscribirme
            </a>
          ) : (
            <button className="btn-comprar" onClick={irACheckout}>✦ Comprar curso</button>
          )}

          {curso.dias_garantia && (
            <div className="garantia-card">
              <Shield size={22} color="#34D399" style={{marginBottom:'6px'}}/>
              <div style={{fontSize:'13px',color:'rgba(255,255,255,0.85)',lineHeight:1.5}}>
                {curso.dias_garantia} días de garantía{curso.politica_reembolso ? ` — ${curso.politica_reembolso}` : ''}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <div className="footer-curso">
        Creado con <a href="https://lumaapp.lat" style={{color:'var(--primary)',textDecoration:'none',fontWeight:700}}>Luma</a>
      </div>
    </div>
  )
}
