'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, LogOut, Check, ChevronDown, ChevronUp, Play, FileText, Music, StickyNote } from 'lucide-react'

type Leccion = {
  id: string; titulo: string; tipo: string; contenido_url: string | null
  contenido_texto: string | null; duracion_min: number | null; orden: number
  es_preview: boolean; descripcion: string | null; notas: string | null; module_id: string
}

type Modulo = {
  id: string; titulo: string; descripcion: string; orden: number
  lecciones: Leccion[]
}

export default function AulaCursoPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.id as string

  const [loading, setLoading] = useState(true)
  const [sinAcceso, setSinAcceso] = useState(false)
  const [debugInfo, setDebugInfo] = useState('')
  const [curso, setCurso] = useState<{ titulo: string; imagen_url: string } | null>(null)
  const [modulos, setModulos] = useState<Modulo[]>([])
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null)
  const [completadas, setCompletadas] = useState<Set<string>>(new Set())
  const [moduloAbierto, setModuloAbierto] = useState<string | null>(null)
  const [leccionActiva, setLeccionActiva] = useState<Leccion | null>(null)
  const [guardandoProgreso, setGuardandoProgreso] = useState(false)

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: persona } = await supabase
        .from('persons').select('id').eq('auth_user_id', user.id).maybeSingle()
      if (!persona) { setSinAcceso(true); setLoading(false); return }

      const { data: enrollment, error: errorEnroll } = await supabase
        .from('enrollments').select('id, estado')
        .eq('course_id', courseId).eq('person_id', persona.id).maybeSingle()

      if (!enrollment || enrollment.estado !== 'activa') {
        setDebugInfo(enrollment ? `Encontró la inscripción pero el estado es "${enrollment.estado}", no "activa".` : `No se encontró inscripción. Error: ${errorEnroll ? JSON.stringify(errorEnroll) : 'ninguno'}`)
        setSinAcceso(true); setLoading(false); return
      }
      setEnrollmentId(enrollment.id)

      const { data: cursoData } = await supabase
        .from('courses').select('titulo, imagen_url').eq('id', courseId).maybeSingle()
      if (cursoData) setCurso(cursoData)

      const { data: mods } = await supabase
        .from('modules').select('*').eq('course_id', courseId).order('orden')
      if (mods) {
        const { data: lecs } = await supabase
          .from('lessons').select('*').in('module_id', mods.map(m => m.id)).order('orden')
        const modulosConLecciones = mods.map(m => ({
          ...m,
          lecciones: (lecs || []).filter(l => l.module_id === m.id),
        }))
        setModulos(modulosConLecciones)
        if (modulosConLecciones.length > 0) {
          setModuloAbierto(modulosConLecciones[0].id)
          if (modulosConLecciones[0].lecciones.length > 0) setLeccionActiva(modulosConLecciones[0].lecciones[0])
        }
      }

      const { data: progreso } = await supabase
        .from('lesson_progress').select('lesson_id, completada')
        .eq('enrollment_id', enrollment.id)
      if (progreso) {
        setCompletadas(new Set(progreso.filter(p => p.completada).map(p => p.lesson_id)))
      }
    } catch (e: any) {
      console.error(e)
      setDebugInfo(`Error inesperado: ${e?.message || JSON.stringify(e)}`)
      setSinAcceso(true)
    } finally { setLoading(false) }
  }

  async function toggleCompletada(leccionId: string) {
    if (!enrollmentId || guardandoProgreso) return
    setGuardandoProgreso(true)
    try {
      const supabase = createClient()
      const yaCompletada = completadas.has(leccionId)

      const { data: existente } = await supabase
        .from('lesson_progress').select('id')
        .eq('enrollment_id', enrollmentId).eq('lesson_id', leccionId).maybeSingle()

      if (existente) {
        await supabase.from('lesson_progress')
          .update({ completada: !yaCompletada, fecha_completada: !yaCompletada ? new Date().toISOString() : null })
          .eq('id', existente.id)
      } else {
        await supabase.from('lesson_progress').insert({
          enrollment_id: enrollmentId, lesson_id: leccionId,
          completada: true, fecha_completada: new Date().toISOString(),
        })
      }

      setCompletadas(prev => {
        const next = new Set(prev)
        yaCompletada ? next.delete(leccionId) : next.add(leccionId)
        return next
      })
    } catch (e) { console.error(e) }
    finally { setGuardandoProgreso(false) }
  }

  async function cerrarSesion() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const totalLecciones = modulos.reduce((acc, m) => acc + m.lecciones.length, 0)
  const porcentaje = totalLecciones > 0 ? Math.round((completadas.size / totalLecciones) * 100) : 0

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:'14px',color:'#6B7280',fontFamily:'sans-serif'}}>
      Cargando...
    </div>
  )

  if (sinAcceso) return (
    <div style={{padding:'40px',fontFamily:'sans-serif',maxWidth:'600px',margin:'0 auto'}}>
      <div style={{fontSize:'18px',fontWeight:700,color:'#0A0A0A',marginBottom:'12px'}}>No tenés acceso a este curso</div>
      {debugInfo && <div style={{background:'#FEF3C7',padding:'14px',borderRadius:'8px',fontSize:'12px',marginBottom:'16px',whiteSpace:'pre-wrap'}}>{debugInfo}</div>}
      <button onClick={() => router.push('/mi-cuenta/cursos')}
        style={{padding:'10px 18px',borderRadius:'8px',border:'none',background:'#8B5CF6',color:'white',fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
        Volver a mis cursos
      </button>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#FAFAFA',fontFamily:"'Geist',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .aula-nav{display:flex;justify-content:space-between;align-items:center;padding:14px 20px;background:white;border-bottom:1px solid #E5E5E5}
        .aula-back{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:#525252;cursor:pointer;background:none;border:none;font-family:inherit}
        .aula-logout{display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;border:1px solid #E5E5E5;background:white;font-size:12px;font-weight:600;color:#525252;cursor:pointer;font-family:inherit}
        .aula-layout{display:flex;flex-direction:column}
        @media(min-width:900px){ .aula-layout{flex-direction:row;align-items:flex-start} }
        .aula-sidebar{width:100%;background:white;border-right:1px solid #E5E5E5;flex-shrink:0}
        @media(min-width:900px){ .aula-sidebar{width:320px;min-height:calc(100vh - 57px)} }
        .aula-progreso-wrap{padding:18px 20px;border-bottom:1px solid #E5E5E5}
        .aula-curso-titulo{font-size:14px;font-weight:800;color:#0A0A0A;margin-bottom:10px}
        .aula-barra{height:6px;background:#F0EBFF;border-radius:10px;overflow:hidden;margin-bottom:6px}
        .aula-barra-fill{height:100%;background:linear-gradient(90deg,#7C3AED,#EC4899);border-radius:10px;transition:width 0.3s}
        .aula-progreso-txt{font-size:11px;color:#737373}
        .aula-modulo{border-bottom:1px solid #F0F0F0}
        .aula-modulo-header{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;cursor:pointer}
        .aula-modulo-titulo{font-size:13px;font-weight:700;color:#0A0A0A}
        .aula-leccion{display:flex;align-items:center;gap:10px;padding:10px 20px 10px 32px;cursor:pointer;font-size:13px}
        .aula-leccion.activa{background:#F4F0FF}
        .aula-leccion-check{width:18px;height:18px;border-radius:50%;border:1.5px solid #D4D4D4;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .aula-leccion-check.done{background:#10B981;border-color:#10B981}
        .aula-leccion-titulo{flex:1;color:#404040}
        .aula-leccion.activa .aula-leccion-titulo{color:#0A0A0A;font-weight:600}
        .aula-main{flex:1;padding:28px 24px;max-width:800px;margin:0 auto;width:100%}
        .aula-video-wrap{position:relative;padding-bottom:56.25%;height:0;border-radius:14px;overflow:hidden;background:#000;margin-bottom:20px}
        .aula-video-wrap iframe,.aula-video-wrap video{position:absolute;top:0;left:0;width:100%;height:100%;border:none}
        .aula-leccion-main-titulo{font-size:20px;font-weight:800;color:#0A0A0A;margin-bottom:8px}
        .aula-leccion-desc{font-size:14px;color:#525252;line-height:1.6;margin-bottom:20px}
        .aula-btn-completar{display:flex;align-items:center;gap:8px;padding:12px 20px;border-radius:10px;border:none;background:#0A0A0A;color:white;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit}
        .aula-btn-completar.done{background:#DCFCE7;color:#166534}
        .aula-notas{margin-top:24px;padding:16px;background:white;border:1px solid #E5E5E5;border-radius:12px;font-size:13px;color:#525252;line-height:1.6}
      `}</style>

      <nav className="aula-nav">
        <button className="aula-back" onClick={() => router.push('/mi-cuenta/cursos')}><ArrowLeft size={15}/> Mis cursos</button>
        <button className="aula-logout" onClick={cerrarSesion}><LogOut size={13}/> Cerrar sesión</button>
      </nav>

      <div className="aula-layout">
        <div className="aula-sidebar">
          <div className="aula-progreso-wrap">
            <div className="aula-curso-titulo">{curso?.titulo}</div>
            <div className="aula-barra"><div className="aula-barra-fill" style={{width:`${porcentaje}%`}}/></div>
            <div className="aula-progreso-txt">{completadas.size} de {totalLecciones} lecciones · {porcentaje}%</div>
          </div>

          {modulos.map(m => (
            <div key={m.id} className="aula-modulo">
              <div className="aula-modulo-header" onClick={() => setModuloAbierto(moduloAbierto === m.id ? null : m.id)}>
                <div className="aula-modulo-titulo">{m.titulo}</div>
                {moduloAbierto === m.id ? <ChevronUp size={15} color="#737373"/> : <ChevronDown size={15} color="#737373"/>}
              </div>
              {moduloAbierto === m.id && m.lecciones.map(l => (
                <div key={l.id}
                  className={`aula-leccion${leccionActiva?.id === l.id ? ' activa' : ''}`}
                  onClick={() => setLeccionActiva(l)}>
                  <div className={`aula-leccion-check${completadas.has(l.id) ? ' done' : ''}`}>
                    {completadas.has(l.id) && <Check size={11} color="white"/>}
                  </div>
                  {l.tipo === 'video' ? <Play size={12} color="#8B5CF6"/> : l.tipo === 'pdf' ? <FileText size={12} color="#8B5CF6"/> : l.tipo === 'audio' ? <Music size={12} color="#8B5CF6"/> : <StickyNote size={12} color="#8B5CF6"/>}
                  <div className="aula-leccion-titulo">{l.titulo}</div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="aula-main">
          {leccionActiva ? (<>
            {leccionActiva.tipo === 'video' && leccionActiva.contenido_url && (
              <div className="aula-video-wrap">
                <iframe src={leccionActiva.contenido_url.replace('watch?v=', 'embed/')} allowFullScreen/>
              </div>
            )}
            {leccionActiva.tipo === 'audio' && leccionActiva.contenido_url && (
              <div style={{marginBottom:'20px'}}><audio controls src={leccionActiva.contenido_url} style={{width:'100%'}}/></div>
            )}
            {leccionActiva.tipo === 'pdf' && leccionActiva.contenido_url && (
              <a href={leccionActiva.contenido_url} target="_blank" rel="noopener noreferrer"
                style={{display:'inline-flex',alignItems:'center',gap:'8px',padding:'12px 18px',borderRadius:'10px',border:'1px solid #E5E5E5',background:'white',color:'#0A0A0A',fontWeight:600,fontSize:'13px',textDecoration:'none',marginBottom:'20px'}}>
                <FileText size={15}/> Abrir PDF
              </a>
            )}

            <h1 className="aula-leccion-main-titulo">{leccionActiva.titulo}</h1>
            {leccionActiva.descripcion && <p className="aula-leccion-desc">{leccionActiva.descripcion}</p>}
            {leccionActiva.tipo === 'texto' && leccionActiva.contenido_texto && (
              <div className="aula-leccion-desc" style={{whiteSpace:'pre-line'}}>{leccionActiva.contenido_texto}</div>
            )}

            <button className={`aula-btn-completar${completadas.has(leccionActiva.id) ? ' done' : ''}`}
              onClick={() => toggleCompletada(leccionActiva.id)} disabled={guardandoProgreso}>
              <Check size={15}/> {completadas.has(leccionActiva.id) ? 'Completada' : 'Marcar como completada'}
            </button>

            {leccionActiva.notas && (
              <div className="aula-notas"><strong>Notas:</strong> {leccionActiva.notas}</div>
            )}
          </>) : (
            <div style={{color:'#737373',fontSize:'14px'}}>Elegí una lección del menú para empezar.</div>
          )}
        </div>
      </div>
    </div>
  )
}