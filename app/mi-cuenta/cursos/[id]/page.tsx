'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, LogOut, Check, ChevronDown, ChevronUp, Play, FileText, Music, StickyNote, GraduationCap } from 'lucide-react'

type Leccion = {
  id: string; titulo: string; tipo: string; contenido_url: string | null
  contenido_texto: string | null; duracion_min: number | null; orden: number
  es_preview: boolean; descripcion: string | null; notas: string | null; module_id: string
}

type Modulo = {
  id: string; titulo: string; descripcion: string; orden: number
  lecciones: Leccion[]
}

type OpcionExamen = { id: string; texto: string }
type PreguntaExamen = { id: string; pregunta: string; tipo: string; opciones: OpcionExamen[] }
type ExamenInfo = { id: string; titulo: string; puntaje_minimo: number; max_intentos: number }

export default function AulaCursoPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.id as string

  const [loading, setLoading] = useState(true)
  const [sinAcceso, setSinAcceso] = useState(false)
  const [debugInfo, setDebugInfo] = useState('')
  const [curso, setCurso] = useState<{ titulo: string; imagen_url: string; user_id: string } | null>(null)
  const [modulos, setModulos] = useState<Modulo[]>([])
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null)
  const [completadas, setCompletadas] = useState<Set<string>>(new Set())
  const [moduloAbierto, setModuloAbierto] = useState<string | null>(null)
  const [leccionActiva, setLeccionActiva] = useState<Leccion | null>(null)
  const [guardandoProgreso, setGuardandoProgreso] = useState(false)
  const [examen, setExamen] = useState<ExamenInfo | null>(null)
  const [intentosUsados, setIntentosUsados] = useState(0)
  const [ultimoResultado, setUltimoResultado] = useState<{puntaje: number; aprobado: boolean} | null>(null)
  const [vista, setVista] = useState<'curso' | 'examen'>('curso')
  const [preguntasExamen, setPreguntasExamen] = useState<PreguntaExamen[]>([])
  const [respuestas, setRespuestas] = useState<Record<string,string>>({})
  const [enviandoExamen, setEnviandoExamen] = useState(false)
  const [cargandoExamen, setCargandoExamen] = useState(false)
  const [personaId, setPersonaId] = useState<string | null>(null)
  const [certificadoCodigo, setCertificadoCodigo] = useState<string | null>(null)

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: persona } = await supabase
        .from('persons').select('id').eq('auth_user_id', user.id).maybeSingle()
      if (!persona) { setSinAcceso(true); setLoading(false); return }
      setPersonaId(persona.id)

      const { data: enrollment, error: errorEnroll } = await supabase
        .from('enrollments').select('id, estado')
        .eq('course_id', courseId).eq('person_id', persona.id).maybeSingle()

      if (!enrollment || enrollment.estado !== 'activa') {
        setDebugInfo(enrollment ? `Encontró la inscripción pero el estado es "${enrollment.estado}", no "activa".` : `No se encontró inscripción. Error: ${errorEnroll ? JSON.stringify(errorEnroll) : 'ninguno'}`)
        setSinAcceso(true); setLoading(false); return
      }
      setEnrollmentId(enrollment.id)

      const { data: cursoData } = await supabase
        .from('courses').select('titulo, imagen_url, user_id').eq('id', courseId).maybeSingle()
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

      const { data: examData } = await supabase
        .from('exams').select('id,titulo,puntaje_minimo,max_intentos').eq('course_id', courseId).maybeSingle()
      if (examData) {
        setExamen(examData)
        const { data: intentos } = await supabase
          .from('exam_attempts').select('id,puntaje_obtenido,aprobado,completado_en')
          .eq('exam_id', examData.id).eq('enrollment_id', enrollment.id)
          .order('completado_en', { ascending: false })
        if (intentos) {
          setIntentosUsados(intentos.length)
          if (intentos.length > 0) setUltimoResultado({ puntaje: intentos[0].puntaje_obtenido, aprobado: intentos[0].aprobado })
        }
      }

      const { data: certExistente } = await supabase
        .from('certificates').select('codigo_unico').eq('enrollment_id', enrollment.id).maybeSingle()
      if (certExistente) setCertificadoCodigo(certExistente.codigo_unico)
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

  async function iniciarExamen() {
    if (!examen) return
    setCargandoExamen(true)
    try {
      const supabase = createClient()
      const { data: preg } = await supabase.from('exam_questions').select('id,pregunta,tipo,orden').eq('exam_id', examen.id).order('orden')
      if (preg) {
        const { data: opts } = await supabase.from('exam_options').select('id,texto,question_id').in('question_id', preg.map(p => p.id)).order('orden')
        setPreguntasExamen(preg.map(p => ({ ...p, opciones: (opts || []).filter(o => o.question_id === p.id) })))
      }
      setRespuestas({})
      setVista('examen')
    } catch (e) { console.error(e) }
    finally { setCargandoExamen(false) }
  }

  function seleccionarRespuesta(preguntaId: string, opcionId: string) {
    setRespuestas(prev => ({ ...prev, [preguntaId]: opcionId }))
  }

  async function enviarExamen() {
    if (!examen || !enrollmentId) return
    setEnviandoExamen(true)
    try {
      const supabase = createClient()
      const preguntaIds = preguntasExamen.map(p => p.id)
      const { data: opcionesCorrectas } = await supabase
        .from('exam_options').select('id,question_id,es_correcta')
        .in('question_id', preguntaIds).eq('es_correcta', true)

      let correctas = 0
      preguntasExamen.forEach(p => {
        const correcta = opcionesCorrectas?.find(o => o.question_id === p.id)
        if (correcta && respuestas[p.id] === correcta.id) correctas++
      })
      const puntaje = preguntasExamen.length > 0 ? Math.round((correctas / preguntasExamen.length) * 100) : 0
      const aprobado = puntaje >= examen.puntaje_minimo

      await supabase.from('exam_attempts').insert({
        exam_id: examen.id, enrollment_id: enrollmentId,
        respuestas, puntaje_obtenido: puntaje, aprobado,
      })

      setUltimoResultado({ puntaje, aprobado })
      setIntentosUsados(prev => prev + 1)
      setVista('curso')

      if (aprobado && !certificadoCodigo && curso && personaId) {
        const codigoNuevo = 'LUMA-' + Math.random().toString(36).slice(2, 8).toUpperCase()
        const { data: cert, error: errorCert } = await supabase.from('certificates').insert({
          enrollment_id: enrollmentId,
          course_id: courseId,
          person_id: personaId,
          terapeuta_id: curso.user_id,
          codigo_unico: codigoNuevo,
        }).select('codigo_unico').single()
        if (!errorCert && cert) setCertificadoCodigo(cert.codigo_unico)
      }
    } catch (e) { console.error(e) }
    finally { setEnviandoExamen(false) }
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
        .aula-examen-banner{display:flex;align-items:center;gap:10px;padding:14px 20px;border-top:1px solid #E5E5E5;background:#F4F0FF}
        .aula-examen-btn{padding:8px 16px;background:#8B5CF6;color:white;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;flex-shrink:0}
        .aula-examen-btn:disabled{opacity:0.6;cursor:not-allowed}
        .examen-titulo{font-size:20px;font-weight:800;color:#0A0A0A;margin-bottom:20px}
        .examen-pregunta{margin-bottom:24px;padding:18px;background:white;border:1px solid #E5E5E5;border-radius:14px}
        .examen-pregunta-txt{font-size:14px;font-weight:700;color:#0A0A0A;margin-bottom:12px}
        .examen-opcion{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;border:1px solid #E5E5E5;margin-bottom:8px;cursor:pointer}
        .examen-opcion.sel{border-color:#8B5CF6;background:#F4F0FF}
        .examen-opcion-radio{width:16px;height:16px;border-radius:50%;border:1.5px solid #D4D4D4;flex-shrink:0;display:flex;align-items:center;justify-content:center}
        .examen-opcion.sel .examen-opcion-radio{border-color:#8B5CF6;background:#8B5CF6}
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
                  onClick={() => { setLeccionActiva(l); setVista('curso') }}>
                  <div className={`aula-leccion-check${completadas.has(l.id) ? ' done' : ''}`}>
                    {completadas.has(l.id) && <Check size={11} color="white"/>}
                  </div>
                  {l.tipo === 'video' ? <Play size={12} color="#8B5CF6"/> : l.tipo === 'pdf' ? <FileText size={12} color="#8B5CF6"/> : l.tipo === 'audio' ? <Music size={12} color="#8B5CF6"/> : <StickyNote size={12} color="#8B5CF6"/>}
                  <div className="aula-leccion-titulo">{l.titulo}</div>
                </div>
              ))}
            </div>
          ))}

          {examen && totalLecciones > 0 && completadas.size === totalLecciones && (
            <div className="aula-examen-banner">
              <GraduationCap size={16} color="#8B5CF6"/>
              <div style={{flex:1}}>
                <div style={{fontSize:'12px',fontWeight:700,color:'#0A0A0A'}}>{examen.titulo}</div>
                {ultimoResultado && (
                  <div style={{fontSize:'10px',color: ultimoResultado.aprobado ? '#166534' : '#DC2626'}}>
                    Último intento: {ultimoResultado.puntaje}% {ultimoResultado.aprobado ? '· Aprobado ✓' : '· No aprobado'}
                  </div>
                )}
              </div>
              {ultimoResultado?.aprobado ? (
                certificadoCodigo ? (
                  <a href={`/certificado/${certificadoCodigo}`} target="_blank" rel="noopener noreferrer"
                    style={{fontSize:'10px',fontWeight:700,color:'#166534',textDecoration:'none',background:'#DCFCE7',padding:'6px 12px',borderRadius:'8px'}}>
                    🎓 Ver certificado
                  </a>
                ) : (
                  <span style={{fontSize:'10px',fontWeight:700,color:'#166534'}}>✓ Aprobado</span>
                )
              ) : intentosUsados >= examen.max_intentos ? (
                <span style={{fontSize:'10px',color:'#DC2626',fontWeight:600}}>Sin intentos</span>
              ) : (
                <button className="aula-examen-btn" onClick={iniciarExamen} disabled={cargandoExamen}>
                  {cargandoExamen ? '...' : ultimoResultado ? 'Reintentar' : 'Rendir'}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="aula-main">
          {vista === 'examen' ? (
            <div>
              <h1 className="examen-titulo">{examen?.titulo}</h1>
              {preguntasExamen.map((p, idx) => (
                <div key={p.id} className="examen-pregunta">
                  <div className="examen-pregunta-txt">{idx + 1}. {p.pregunta}</div>
                  {p.opciones.map(o => (
                    <div key={o.id}
                      className={`examen-opcion${respuestas[p.id] === o.id ? ' sel' : ''}`}
                      onClick={() => seleccionarRespuesta(p.id, o.id)}>
                      <div className="examen-opcion-radio"/>
                      <div style={{fontSize:'13px',color:'#404040'}}>{o.texto}</div>
                    </div>
                  ))}
                </div>
              ))}
              <button className="aula-btn-completar"
                onClick={enviarExamen}
                disabled={enviandoExamen || Object.keys(respuestas).length < preguntasExamen.length}>
                <Check size={15}/> {enviandoExamen ? 'Enviando...' : 'Entregar examen'}
              </button>
            </div>
          ) : leccionActiva ? (<>
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