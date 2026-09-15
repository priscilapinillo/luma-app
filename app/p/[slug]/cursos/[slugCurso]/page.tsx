'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Check, Clock, BookOpen, Award } from 'lucide-react'

type Terapeuta = {
  user_id: string; nombre_profesional: string; especialidad: string
  bio: string; avatar_url: string; slug: string
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

type Modulo = {
  id: string; titulo: string; descripcion: string; orden: number
  lecciones?: { id: string; titulo: string; tipo: string; duracion_min: number | null; es_preview: boolean }[]
}

export default function CursoPublicoPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const slugCurso = params.slugCurso as string

  const [terapeuta, setTerapeuta] = useState<Terapeuta | null>(null)
  const [curso, setCurso] = useState<Curso | null>(null)
  const [modulos, setModulos] = useState<Modulo[]>([])
  const [moduloAbierto, setModuloAbierto] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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
          .from('lessons').select('id,titulo,tipo,duracion_min,es_preview,module_id')
          .in('module_id', mods.map(m => m.id)).order('orden')
        setModulos(mods.map(m => ({
          ...m,
          lecciones: lecs?.filter(l => l.module_id === m.id) || []
        })))
        if (mods.length > 0) setModuloAbierto(mods[0].id)
      }
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const totalLecciones = modulos.reduce((acc, m) => acc + (m.lecciones?.length || 0), 0)

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:'14px',color:'#6B7280'}}>
      Cargando...
    </div>
  )

  if (!curso || !terapeuta) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:'14px',color:'#6B7280'}}>
      Curso no encontrado
    </div>
  )

  const esOferta = curso.precio_original && curso.precio_original > curso.precio

  return (
    <div style={{fontFamily:"'Inter',sans-serif",color:'#1A1A2E',background:'#FAFAFA',minHeight:'100vh'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Manrope:wght@700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .curso-nav{position:sticky;top:0;z-index:100;background:white;border-bottom:1px solid #F0F0F0;padding:14px 24px;display:flex;justify-content:space-between;align-items:center}
        .curso-nav-logo{font-family:'Manrope',sans-serif;font-size:18px;font-weight:800;color:#8B5CF6;cursor:pointer}
        .btn-comprar{padding:10px 24px;background:linear-gradient(135deg,#8B5CF6,#7C3AED);color:white;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap}
        .hero{background:linear-gradient(135deg,#1A0A3C 0%,#2D1060 100%);padding:48px 24px;color:white}
        .hero-inner{max-width:860px;margin:0 auto;display:grid;grid-template-columns:1fr 380px;gap:40px;align-items:start}
        .hero-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(139,92,246,0.2);border:1px solid rgba(139,92,246,0.3);color:#C4A8FF;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:4px 12px;border-radius:20px;margin-bottom:16px}
        .hero-titulo{font-family:'Manrope',sans-serif;font-size:clamp(28px,4vw,42px);font-weight:900;line-height:1.1;margin-bottom:16px}
        .hero-desc{font-size:16px;color:rgba(255,255,255,0.75);line-height:1.7;margin-bottom:24px}
        .hero-meta{display:flex;flex-wrap:wrap;gap:16px;font-size:12px;color:rgba(255,255,255,0.6)}
        .hero-meta-item{display:flex;align-items:center;gap:6px}
        .precio-card{background:white;border-radius:20px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,0.3);position:sticky;top:80px}
        .precio-original{font-size:14px;color:#9CA3AF;text-decoration:line-through;margin-bottom:4px}
        .precio-actual{font-family:'Manrope',sans-serif;font-size:40px;font-weight:900;color:#8B5CF6;line-height:1;margin-bottom:4px}
        .precio-periodo{font-size:12px;color:#6B7280;margin-bottom:20px}
        .oferta-badge{display:inline-block;background:#FEF3C7;color:#92400E;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;margin-bottom:12px}
        .btn-comprar-grande{width:100%;padding:16px;background:linear-gradient(135deg,#8B5CF6,#7C3AED);color:white;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;margin-bottom:12px;box-shadow:0 8px 24px rgba(139,92,246,0.4)}
        .garantia-texto{text-align:center;font-size:11px;color:#6B7280;line-height:1.5}
        .incluye-lista{margin-top:16px;display:flex;flex-direction:column;gap:8px}
        .incluye-item{display:flex;align-items:center;gap:8px;font-size:12px;color:#374151}
        .seccion{max-width:860px;margin:0 auto;padding:48px 24px}
        .seccion-titulo{font-family:'Manrope',sans-serif;font-size:24px;font-weight:800;color:#1A1A2E;margin-bottom:24px}
        .bullets-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .bullet-item{display:flex;align-items:flex-start;gap:10px;font-size:14px;color:#374151;line-height:1.5}
        .bullet-check{width:20px;height:20px;border-radius:50%;background:#EDE8FF;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}
        .modulo-card{border:1px solid #E5E7EB;border-radius:12px;margin-bottom:8px;overflow:hidden}
        .modulo-header{display:flex;align-items:center;gap:12px;padding:14px 16px;cursor:pointer;background:white;user-select:none}
        .modulo-titulo{flex:1;font-size:14px;font-weight:600;color:#1A1A2E}
        .leccion-item{display:flex;align-items:center;gap:10px;padding:10px 16px;border-top:1px solid #F3F4F6;background:#FAFAFA}
        .tipo-icon{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0}
        .tipo-video{background:#EDE8FF}
        .tipo-pdf{background:#FEF3C7}
        .tipo-audio{background:#DCFCE7}
        .tipo-texto{background:#DBEAFE}
        .preview-badge{font-size:9px;background:#DCFCE7;color:#166534;padding:2px 6px;border-radius:10px;font-weight:700}
        .terapeuta-card{background:white;border-radius:20px;padding:28px;border:1px solid #E5E7EB;display:flex;gap:20px;align-items:flex-start}
        .terapeuta-avatar{width:72px;height:72px;border-radius:50%;object-fit:cover;flex-shrink:0;background:#EDE8FF}
        .garantia-card{background:#F0FDF4;border:1px solid #86EFAC;border-radius:16px;padding:24px;text-align:center}
        .cta-final{background:linear-gradient(135deg,#1A0A3C,#2D1060);padding:64px 24px;text-align:center;color:white}
        .footer-curso{text-align:center;padding:20px;font-size:11px;color:#9CA3AF}
        @media(max-width:768px){
          .hero-inner{grid-template-columns:1fr}
          .precio-card{position:static;margin-top:24px}
          .bullets-grid{grid-template-columns:1fr}
        }
      `}</style>

      {/* NAV */}
      <nav className="curso-nav">
        <div className="curso-nav-logo" onClick={() => router.push(`/p/${slug}`)}>
          {terapeuta.nombre_profesional}
        </div>
        <button className="btn-comprar" onClick={() => router.push(`/p/${slug}/cursos/${slugCurso}/checkout`)}>
          Comprar curso
        </button>
      </nav>

      {/* HERO */}
      <div className="hero">
        <div className="hero-inner">
          <div>
            <div className="hero-badge">
              <BookOpen size={10}/> Curso online
            </div>
            <h1 className="hero-titulo">{curso.titulo}</h1>
            <p className="hero-desc">{curso.descripcion_corta}</p>
            <div className="hero-meta">
              {curso.nivel && <div className="hero-meta-item"><span>📊</span> {curso.nivel}</div>}
              {curso.idioma && <div className="hero-meta-item"><span>🌐</span> {curso.idioma}</div>}
              {totalLecciones > 0 && <div className="hero-meta-item"><BookOpen size={11}/> {totalLecciones} lecciones</div>}
              {curso.duracion_estimada_horas && <div className="hero-meta-item"><Clock size={11}/> {curso.duracion_estimada_horas}hs de contenido</div>}
              {curso.modalidad === 'unico' && <div className="hero-meta-item"><span>✦</span> Acceso de por vida</div>}
            </div>
          </div>

          {/* PRECIO CARD */}
          <div className="precio-card">
            {curso.imagen_url && <img src={curso.imagen_url} alt={curso.titulo} style={{width:'100%',height:'180px',objectFit:'cover',borderRadius:'12px',marginBottom:'20px'}}/>}
            {esOferta && <div className="oferta-badge">🏷️ OFERTA</div>}
            {curso.precio_original && <div className="precio-original">${curso.precio_original.toLocaleString()}</div>}
            <div className="precio-actual">${curso.precio.toLocaleString()}</div>
            <div className="precio-periodo">
              {curso.modalidad === 'suscripcion' ? 'por mes' : 'pago único'}
            </div>
            <button className="btn-comprar-grande" onClick={() => router.push(`/p/${slug}/cursos/${slugCurso}/checkout`)}>
              ✦ Comprar ahora
            </button>
            {curso.dias_garantia && (
              <div className="garantia-texto">
                🛡️ {curso.dias_garantia} días de garantía<br/>
                {curso.politica_reembolso}
              </div>
            )}
            <div className="incluye-lista">
              {totalLecciones > 0 && <div className="incluye-item"><Check size={14} color="#8B5CF6"/>{totalLecciones} lecciones</div>}
              {curso.duracion_estimada_horas && <div className="incluye-item"><Check size={14} color="#8B5CF6"/>{curso.duracion_estimada_horas}hs de contenido</div>}
              {curso.modalidad === 'unico' && <div className="incluye-item"><Check size={14} color="#8B5CF6"/>Acceso de por vida</div>}
              <div className="incluye-item"><Check size={14} color="#8B5CF6"/>Certificado de finalización</div>
            </div>
          </div>
        </div>
      </div>

      {/* PARA QUIÉN ES */}
      {curso.para_quien?.length > 0 && (
        <div className="seccion" style={{background:'white',maxWidth:'100%',padding:'48px 24px'}}>
          <div style={{maxWidth:'860px',margin:'0 auto'}}>
            <h2 className="seccion-titulo">¿Para quién es este curso?</h2>
            <div className="bullets-grid">
              {curso.para_quien.filter(x => x.trim()).map((item, i) => (
                <div key={i} className="bullet-item">
                  <div className="bullet-check"><Check size={10} color="#8B5CF6"/></div>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* QUÉ VAS A APRENDER */}
      {curso.que_aprenderas?.length > 0 && (
        <div className="seccion">
          <h2 className="seccion-titulo">Qué vas a aprender</h2>
          <div className="bullets-grid">
            {curso.que_aprenderas.filter(x => x.trim()).map((item, i) => (
              <div key={i} className="bullet-item">
                <div className="bullet-check"><Check size={10} color="#8B5CF6"/></div>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIDEO DE PRESENTACIÓN */}
      {curso.video_presentacion_url && (
        <div style={{background:'white',padding:'48px 24px'}}>
          <div style={{maxWidth:'860px',margin:'0 auto'}}>
            <h2 className="seccion-titulo">Video de presentación</h2>
            <div style={{position:'relative',paddingBottom:'56.25%',height:0,borderRadius:'16px',overflow:'hidden'}}>
              <iframe
                src={curso.video_presentacion_url.replace('watch?v=', 'embed/')}
                style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',border:'none'}}
                allowFullScreen/>
            </div>
          </div>
        </div>
      )}

      {/* PROGRAMA */}
      {modulos.length > 0 && (
        <div className="seccion">
          <h2 className="seccion-titulo">Programa del curso</h2>
          <div style={{fontSize:'13px',color:'#6B7280',marginBottom:'20px'}}>
            {modulos.length} módulo{modulos.length !== 1 ? 's' : ''} · {totalLecciones} lecciones
          </div>
          {modulos.map(m => (
            <div key={m.id} className="modulo-card">
              <div className="modulo-header" onClick={() => setModuloAbierto(moduloAbierto === m.id ? null : m.id)}>
                {moduloAbierto === m.id ? <ChevronUp size={14} color="#6B7280"/> : <ChevronDown size={14} color="#6B7280"/>}
                <div className="modulo-titulo">{m.titulo}</div>
                <div style={{fontSize:'11px',color:'#9CA3AF'}}>{m.lecciones?.length || 0} lec.</div>
              </div>
              {moduloAbierto === m.id && m.lecciones?.map(l => (
                <div key={l.id} className="leccion-item">
                  <div className={`tipo-icon tipo-${l.tipo}`}>
                    {l.tipo === 'video' ? '▶' : l.tipo === 'pdf' ? '📄' : l.tipo === 'audio' ? '🎵' : '📝'}
                  </div>
                  <div style={{flex:1,fontSize:'13px',color:'#374151'}}>{l.titulo}</div>
                  {l.es_preview && <span className="preview-badge">GRATIS</span>}
                  {l.duracion_min && <span style={{fontSize:'11px',color:'#9CA3AF'}}>{l.duracion_min}min</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* SOBRE LA TERAPEUTA */}
      <div style={{background:'white',padding:'48px 24px'}}>
        <div style={{maxWidth:'860px',margin:'0 auto'}}>
          <h2 className="seccion-titulo">Tu instructora</h2>
          <div className="terapeuta-card">
            {terapeuta.avatar_url
              ? <img src={terapeuta.avatar_url} alt={terapeuta.nombre_profesional} className="terapeuta-avatar"/>
              : <div className="terapeuta-avatar" style={{display:'flex',alignItems:'center',justifyContent:'center',fontSize:'24px'}}>👤</div>
            }
            <div>
              <div style={{fontSize:'18px',fontWeight:700,color:'#1A1A2E',marginBottom:'4px'}}>{terapeuta.nombre_profesional}</div>
              <div style={{fontSize:'13px',color:'#8B5CF6',marginBottom:'12px'}}>{terapeuta.especialidad}</div>
              <p style={{fontSize:'14px',color:'#374151',lineHeight:1.7}}>{terapeuta.bio}</p>
            </div>
          </div>
        </div>
      </div>

      {/* GARANTÍA */}
      {curso.dias_garantia && (
        <div className="seccion">
          <div className="garantia-card">
            <div style={{fontSize:'32px',marginBottom:'12px'}}>🛡️</div>
            <div style={{fontSize:'18px',fontWeight:700,color:'#166534',marginBottom:'8px'}}>
              Garantía de {curso.dias_garantia} días
            </div>
            <p style={{fontSize:'14px',color:'#374151',lineHeight:1.7}}>
              {curso.politica_reembolso || `Si en ${curso.dias_garantia} días no estás conforme, te devolvemos el dinero. Sin preguntas.`}
            </p>
          </div>
        </div>
      )}

      {/* CTA FINAL */}
      <div className="cta-final">
        <div style={{maxWidth:'560px',margin:'0 auto'}}>
          <h2 style={{fontFamily:'Manrope,sans-serif',fontSize:'clamp(24px,4vw,36px)',fontWeight:900,marginBottom:'16px'}}>
            ¿Lista para empezar?
          </h2>
          <p style={{fontSize:'15px',color:'rgba(255,255,255,0.7)',marginBottom:'32px',lineHeight:1.7}}>
            {curso.descripcion_corta}
          </p>
          {esOferta && <div className="oferta-badge" style={{marginBottom:'12px'}}>🏷️ OFERTA ESPECIAL</div>}
          {curso.precio_original && <div style={{fontSize:'16px',color:'rgba(255,255,255,0.5)',textDecoration:'line-through',marginBottom:'4px'}}>${curso.precio_original.toLocaleString()}</div>}
          <div style={{fontFamily:'Manrope,sans-serif',fontSize:'48px',fontWeight:900,color:'#C4A8FF',marginBottom:'4px'}}>${curso.precio.toLocaleString()}</div>
          <div style={{fontSize:'13px',color:'rgba(255,255,255,0.5)',marginBottom:'28px'}}>{curso.modalidad === 'suscripcion' ? 'por mes' : 'pago único'}</div>
          <button className="btn-comprar-grande" style={{maxWidth:'320px',margin:'0 auto'}}
            onClick={() => router.push(`/p/${slug}/cursos/${slugCurso}/checkout`)}>
            ✦ Comprar ahora
          </button>
        </div>
      </div>

      {/* FOOTER */}
      <div className="footer-curso">
        Creado con <a href="https://lumaapp.lat" style={{color:'#8B5CF6',textDecoration:'none',fontWeight:600}}>Luma</a>
      </div>
    </div>
  )
}