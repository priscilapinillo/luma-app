'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, LogOut, Check, ChevronDown, ChevronUp, Play, FileText, Music, StickyNote, GraduationCap, ExternalLink, Eye, EyeOff, Star } from 'lucide-react'
import { tieneAccesoCurso } from '@/lib/acceso'
import VisorContenido, { type ControlVideo } from '@/components/VisorContenido'
import { detectarContenido } from '@/lib/contenido'
import LunaProgreso from '@/components/aula/LunaProgreso'
import Cuaderno from '@/components/aula/Cuaderno'
import Celebracion, { type TipoCelebracion } from '@/components/aula/Celebracion'
import CompartirLogro from '@/components/aula/CompartirLogro'
import type { DatosLogro } from '@/lib/dibujos'
import {
  type ContextoLeccion, favoritosDe, marcarFavorito, guardarProgreso, preferenciasDe, guardarPreferencias,
  sincronizarPendientes, yaCelebrado, anotarCelebrado,
} from '@/lib/aula'

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
  const [proximoEncuentro, setProximoEncuentro] = useState<{titulo: string; fecha_hora: string; link_zoom: string} | null>(null)
  const [adjuntos, setAdjuntos] = useState<{id: string; nombre: string; url: string}[]>([])
  const [adjuntoAbierto, setAdjuntoAbierto] = useState<string | null>(null)
  // ── aula nueva: cuaderno, favoritos, retomá, celebración y compartir
  const [control, setControl] = useState<ControlVideo | null>(null)
  const [inicio, setInicio] = useState<{ leccion: string; segundo: number } | null>(null)
  const [pausarAlEscribir, setPausarAlEscribir] = useState(false)
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set())
  const [celebracion, setCelebracion] = useState<{ tipo: TipoCelebracion; titulo?: string } | null>(null)
  const [compartir, setCompartir] = useState<DatosLogro | null>(null)
  const [nombres, setNombres] = useState<{ alumna: string; terapeuta: string }>({ alumna: '', terapeuta: '' })
  const textoRef = useRef<HTMLDivElement | null>(null)
  const controlRef = useRef<ControlVideo | null>(null)
  controlRef.current = control

  useEffect(() => { cargarDatos() }, [])

  useEffect(() => {
    setAdjuntoAbierto(null)
    if (!leccionActiva) { setAdjuntos([]); return }
    let cancelado = false
    const supabase = createClient()
    supabase.from('lesson_attachments').select('id, nombre, url').eq('lesson_id', leccionActiva.id)
      .then(({ data, error }) => {
        if (error) console.error('Error cargando adjuntos:', error)
        if (!cancelado) setAdjuntos(data || [])
      })
    return () => { cancelado = true }
  }, [leccionActiva?.id])

  async function cargarDatos() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/aula'); return }

      const { data: persona } = await supabase
        .from('persons').select('id, nombre, apellido').eq('auth_user_id', user.id).maybeSingle()
      if (!persona) { setSinAcceso(true); setLoading(false); return }
      setPersonaId(persona.id)
      const nombreAlumna = [persona.nombre, persona.apellido].filter(Boolean).join(' ').trim()

      let { data: enrollment, error: errorEnroll } = await supabase
        .from('enrollments').select('id, estado, modalidad, fecha_vencimiento, mp_preapproval_id, mp_plan_id')
        .eq('course_id', courseId).eq('person_id', persona.id).maybeSingle()

      // con suscripción automática: antes de cortar el acceso, le preguntamos a Mercado Pago si entró un cobro nuevo
      if (enrollment && !tieneAccesoCurso(enrollment) && (enrollment.mp_preapproval_id || enrollment.mp_plan_id)) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          const res = await fetch('/api/cursos/suscripcion/estado', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enrollmentId: enrollment.id, accessToken: session?.access_token }),
          })
          if (res.ok) {
            const info = await res.json()
            if (info.acceso) enrollment = { ...enrollment, estado: 'activa', fecha_vencimiento: info.fecha_vencimiento }
          }
        } catch (e) { console.error('Error revisando la suscripción:', e) }
      }

      if (!enrollment || !tieneAccesoCurso(enrollment)) {
        if (errorEnroll) console.error('Error buscando la inscripción:', errorEnroll)
        setDebugInfo(
          !enrollment ? 'No encontramos tu inscripción a este curso. Si lo compraste con otro email, entrá con esa cuenta.'
          : enrollment.estado !== 'activa' ? 'Tu pago todavía no está confirmado. Cuando se confirme, vas a poder entrar.'
          : `Tu acceso venció el ${new Date(enrollment.fecha_vencimiento as string).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}. Podés renovarlo desde Mi cuenta → Mis cursos.`
        )
        setSinAcceso(true); setLoading(false); return
      }
      setEnrollmentId(enrollment.id)

      const { data: cursoData } = await supabase
        .from('courses').select('titulo, imagen_url, user_id').eq('id', courseId).maybeSingle()
      if (cursoData) {
        setCurso(cursoData)
        supabase.from('therapist_profiles').select('nombre_profesional').eq('user_id', cursoData.user_id).maybeSingle()
          .then(({ data }) => setNombres({ alumna: nombreAlumna, terapeuta: data?.nombre_profesional || '' }), () => setNombres({ alumna: nombreAlumna, terapeuta: '' }))
      }

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
        // "Retomá donde dejaste": viene con ?leccion=...&t=segundos
        let pedida: Leccion | null = null
        try {
          const q = new URLSearchParams(window.location.search)
          const idPedida = q.get('leccion')
          if (idPedida) {
            pedida = modulosConLecciones.flatMap(m => m.lecciones).find(l => l.id === idPedida) || null
            const t = Math.max(0, Math.floor(Number(q.get('t')) || 0))
            if (pedida && t > 0) setInicio({ leccion: pedida.id, segundo: t })
          }
        } catch { /* sin parámetros */ }
        if (pedida) {
          setModuloAbierto(pedida.module_id)
          setLeccionActiva(pedida)
        } else if (modulosConLecciones.length > 0) {
          setModuloAbierto(modulosConLecciones[0].id)
          if (modulosConLecciones[0].lecciones.length > 0) setLeccionActiva(modulosConLecciones[0].lecciones[0])
        }
      }

      // lo nuevo del aula: si algo de esto falla, el curso se ve igual
      preferenciasDe(persona.id).then(p => setPausarAlEscribir(p.pausar_al_escribir)).catch(() => null)
      favoritosDe(persona.id, courseId).then(f => setFavoritos(new Set(f.map(x => x.lesson_id)))).catch(() => null)
      sincronizarPendientes(persona.id).catch(() => null)

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

      const { data: encuentro } = await supabase
        .from('course_live_sessions').select('titulo, fecha_hora, link_zoom')
        .eq('course_id', courseId).gte('fecha_hora', new Date(Date.now() - 2 * 3600000).toISOString()) // sigue visible hasta 2 horas después de empezar
        .order('fecha_hora').limit(1).maybeSingle()
      if (encuentro) setProximoEncuentro(encuentro)
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

      const next = new Set(completadas)
      yaCompletada ? next.delete(leccionId) : next.add(leccionId)
      setCompletadas(next)
      if (!yaCompletada) festejar(leccionId, next, !!existente)
    } catch (e) { console.error(e) }
    finally { setGuardandoProgreso(false) }
  }

  // ── celebración: la grande (módulo / curso) sale una sola vez; si desmarca y vuelve a marcar, no se repite
  function festejar(leccionId: string, hechas: Set<string>, yaLaHabiaMarcado: boolean) {
    try {
      const todas = modulos.flatMap(m => m.lecciones)
      const mod = modulos.find(m => m.lecciones.some(l => l.id === leccionId))
      if (todas.length > 0 && todas.every(l => hechas.has(l.id)) && !yaCelebrado(`curso:${courseId}`)) {
        anotarCelebrado(`curso:${courseId}`); setCelebracion({ tipo: 'curso' }); return
      }
      if (mod && mod.lecciones.length > 1 && mod.lecciones.every(l => hechas.has(l.id)) && !yaCelebrado(`modulo:${mod.id}`)) {
        anotarCelebrado(`modulo:${mod.id}`); setCelebracion({ tipo: 'modulo', titulo: mod.titulo }); return
      }
      if (!yaLaHabiaMarcado && !yaCelebrado(`leccion:${leccionId}`)) {
        anotarCelebrado(`leccion:${leccionId}`); setCelebracion({ tipo: 'leccion' })
      }
    } catch { /* el festejo nunca frena nada */ }
  }

  async function abrirCompartir() {
    const base: DatosLogro = { alumna: nombres.alumna || 'Alumna', curso: curso?.titulo || 'Curso', terapeuta: nombres.terapeuta, fecha: new Date(), esCertificado: !!certificadoCodigo }
    if (certificadoCodigo) {
      try {
        const { data } = await createClient().rpc('verificar_certificado', { p_codigo: certificadoCodigo })
        const c = data?.[0]
        if (c) {
          base.alumna = c.alumna_nombre || base.alumna
          base.terapeuta = c.terapeuta_nombre || base.terapeuta
          base.curso = c.curso_titulo || base.curso
          if (c.fecha_emision) base.fecha = new Date(c.fecha_emision)
        }
      } catch { /* usamos los datos que ya tenemos */ }
    }
    setCelebracion(null)
    setCompartir(base)
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

  // la nota y el certificado los decide el servidor (no se pueden falsificar desde el navegador)
  async function enviarExamen() {
    if (!examen || !enrollmentId) return
    setEnviandoExamen(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/cursos/examen/enviar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId: examen.id, enrollmentId, respuestas, accessToken: session?.access_token }),
      })
      const r = await res.json().catch(() => ({ ok: false }))
      if (!r.ok) { alert(r.mensaje || 'No se pudo enviar tu examen. Probá de nuevo.'); return }
      setUltimoResultado({ puntaje: r.puntaje, aprobado: r.aprobado })
      setIntentosUsados(prev => prev + 1)
      setVista('curso')
      if (r.certificado) setCertificadoCodigo(r.certificado)
    } catch (e) { console.error(e); alert('No se pudo enviar tu examen. Revisá tu conexión.') }
    finally { setEnviandoExamen(false) }
  }

  async function cerrarSesion() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/aula')
  }

  const totalLecciones = modulos.reduce((acc, m) => acc + m.lecciones.length, 0)
  const porcentaje = totalLecciones > 0 ? Math.round((completadas.size / totalLecciones) * 100) : 0
  const todasLasLecciones = useMemo(() => modulos.flatMap(m => m.lecciones), [modulos])
  const hechasDeVerdad = todasLasLecciones.filter(l => completadas.has(l.id)).length
  const cursoTerminado = totalLecciones > 0 && hechasDeVerdad === totalLecciones
  const siguienteLeccion = useMemo(() => {
    if (!leccionActiva) return null
    const i = todasLasLecciones.findIndex(l => l.id === leccionActiva.id)
    return i >= 0 ? todasLasLecciones[i + 1] || null : null
  }, [leccionActiva, todasLasLecciones])
  const moduloActivo = leccionActiva ? modulos.find(m => m.id === leccionActiva.module_id) : undefined
  const ctxLeccion: ContextoLeccion | null = useMemo(() => (personaId && leccionActiva ? {
    personId: personaId, courseId, lessonId: leccionActiva.id, leccionTitulo: leccionActiva.titulo,
    leccionOrden: leccionActiva.orden || 0, moduloTitulo: moduloActivo?.titulo || '', moduloOrden: moduloActivo?.orden || 0,
  } : null), [personaId, courseId, leccionActiva, moduloActivo])

  function irALeccion(l: Leccion) {
    setLeccionActiva(l); setVista('curso'); setModuloAbierto(l.module_id); setCelebracion(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function cambiarFavorito() {
    if (!ctxLeccion || !leccionActiva) return
    const si = !favoritos.has(leccionActiva.id)
    setFavoritos(prev => { const n = new Set(prev); si ? n.add(leccionActiva.id) : n.delete(leccionActiva.id); return n })
    try { await marcarFavorito(ctxLeccion, leccionActiva.tipo, si) }
    catch { setFavoritos(prev => { const n = new Set(prev); si ? n.delete(leccionActiva.id) : n.add(leccionActiva.id); return n }) }
  }

  function cambiarPausa(v: boolean) {
    setPausarAlEscribir(v)
    if (personaId) guardarPreferencias(personaId, { pausar_al_escribir: v }).catch(() => null)
  }

  // ── progreso para "Retomá donde dejaste" (lección + minuto) y para la luna de Mis cursos
  const inicioRef = useRef(inicio)
  inicioRef.current = inicio
  const progresoRef = useRef({ personaId, leccionActiva, totalLecciones, hechasDeVerdad })
  progresoRef.current = { personaId, leccionActiva, totalLecciones, hechasDeVerdad }
  const guardarDondeQuedo = useCallback(async (segundoFijo?: number) => {
    const { personaId: pid, leccionActiva: l, totalLecciones: tot, hechasDeVerdad: hechas } = progresoRef.current
    if (!pid || !l) return
    let seg = segundoFijo ?? 0
    if (segundoFijo === undefined && controlRef.current) { try { seg = await controlRef.current.tiempo() } catch { seg = 0 } }
    // si recién entró con "Retomá" y el video todavía no arrancó, no perdemos el minuto guardado
    const ini = inicioRef.current
    if (segundoFijo === undefined && seg < 2 && ini && ini.leccion === l.id) seg = ini.segundo
    guardarProgreso({ personId: pid, courseId, lessonId: l.id, leccionTitulo: l.titulo, segundo: seg, total: tot, completadas: hechas }).catch(() => null)
  }, [courseId])

  useEffect(() => {
    if (!leccionActiva || !personaId || loading) return
    guardarDondeQuedo(inicio?.leccion === leccionActiva.id ? inicio.segundo : 0)
    const cada = setInterval(() => { if (controlRef.current && document.visibilityState === 'visible') guardarDondeQuedo() }, 20000)
    const oculta = () => { if (document.visibilityState === 'hidden') guardarDondeQuedo() }
    document.addEventListener('visibilitychange', oculta)
    return () => { clearInterval(cada); document.removeEventListener('visibilitychange', oculta) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leccionActiva?.id, personaId, loading])

  // la luna también cuenta lecciones completadas
  useEffect(() => { if (leccionActiva && personaId && !loading) guardarDondeQuedo() }, [hechasDeVerdad]) // eslint-disable-line react-hooks/exhaustive-deps

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
        
        @font-face{font-family:'Avigea';src:url('/fonts/Avigea.ttf') format('truetype');font-display:swap}
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
            <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'10px'}}>
              <LunaProgreso p={totalLecciones > 0 ? hechasDeVerdad / totalLecciones : 0} tamano={52}/>
              <div className="aula-curso-titulo" style={{marginBottom:0}}>{curso?.titulo}</div>
            </div>
            <div className="aula-barra"><div className="aula-barra-fill" style={{width:`${porcentaje}%`}}/></div>
            <div className="aula-progreso-txt">{completadas.size} de {totalLecciones} lecciones · {porcentaje}%</div>
            {cursoTerminado && (!examen || !ultimoResultado?.aprobado) && (
              <button type="button" onClick={abrirCompartir}
                style={{marginTop:'10px',padding:'8px 12px',borderRadius:'9px',border:'1px solid #C9A84C',background:'#FFFBEB',color:'#8A6D1F',fontWeight:700,fontSize:'12px',cursor:'pointer',fontFamily:'inherit'}}>
                ✦ Compartir mi logro
              </button>
            )}
          </div>

          {proximoEncuentro && (
            <a href={proximoEncuentro.link_zoom} target="_blank" rel="noopener noreferrer"
              style={{display:'block',margin:'0 20px 16px',padding:'14px',background:'linear-gradient(135deg,#7C3AED,#EC4899)',borderRadius:'12px',textDecoration:'none',color:'white'}}>
              <div style={{fontSize:'10px',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',opacity:0.85,marginBottom:'4px'}}>🔴 Próximo encuentro en vivo</div>
              <div style={{fontSize:'13px',fontWeight:700,marginBottom:'2px'}}>{proximoEncuentro.titulo}</div>
              <div style={{fontSize:'11px',opacity:0.9}}>
                {new Date(proximoEncuentro.fecha_hora).toLocaleString('es-AR', { day:'numeric', month:'long', hour:'2-digit', minute:'2-digit' })} hs · Tocá para unirte
              </div>
            </a>
          )}

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
                  {favoritos.has(l.id) && <Star size={12} color="#C9A84C" fill="#C9A84C" style={{flexShrink:0}}/>}
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
                  <div style={{display:'flex',flexDirection:'column',gap:'6px',alignItems:'flex-end'}}>
                    <a href={`/certificado/${certificadoCodigo}`} target="_blank" rel="noopener noreferrer"
                      style={{fontSize:'10px',fontWeight:700,color:'#166534',textDecoration:'none',background:'#DCFCE7',padding:'6px 12px',borderRadius:'8px'}}>
                      🎓 Ver certificado
                    </a>
                    <button type="button" onClick={abrirCompartir}
                      style={{fontSize:'10px',fontWeight:700,color:'#8A6D1F',background:'#FFFBEB',border:'1px solid #E9D9A6',padding:'6px 12px',borderRadius:'8px',cursor:'pointer',fontFamily:'inherit'}}>
                      ✦ Compartir certificado
                    </button>
                  </div>
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
            {leccionActiva.tipo !== 'texto' && leccionActiva.contenido_url && leccionActiva.contenido_url.trim() !== '' && (
              <div style={{marginBottom:'20px'}}>
                <VisorContenido key={leccionActiva.id} url={leccionActiva.contenido_url} tipo={leccionActiva.tipo}
                  alControl={setControl} inicio={inicio?.leccion === leccionActiva.id ? inicio.segundo : undefined}/>
              </div>
            )}

            <div style={{display:'flex',alignItems:'flex-start',gap:'10px'}}>
              <h1 className="aula-leccion-main-titulo" style={{flex:1}}>{leccionActiva.titulo}</h1>
              <button type="button" onClick={cambiarFavorito} aria-pressed={favoritos.has(leccionActiva.id)}
                aria-label={favoritos.has(leccionActiva.id) ? 'Sacar de favoritos' : 'Guardar en favoritos'}
                title={favoritos.has(leccionActiva.id) ? 'Sacar de favoritos' : 'Guardar en favoritos'}
                style={{flexShrink:0,display:'inline-flex',alignItems:'center',gap:'5px',padding:'7px 11px',borderRadius:'10px',border:`1px solid ${favoritos.has(leccionActiva.id) ? '#E9D9A6' : '#E5E5E5'}`,background:favoritos.has(leccionActiva.id) ? '#FFFBEB' : 'white',color:favoritos.has(leccionActiva.id) ? '#8A6D1F' : '#737373',fontSize:'12px',fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                <Star size={14} color="#C9A84C" fill={favoritos.has(leccionActiva.id) ? '#C9A84C' : 'none'}/> {favoritos.has(leccionActiva.id) ? 'Favorita' : 'Favorito'}
              </button>
            </div>
            {leccionActiva.descripcion && <p className="aula-leccion-desc">{leccionActiva.descripcion}</p>}
            {leccionActiva.tipo === 'texto' && leccionActiva.contenido_texto && (
              <div ref={textoRef} className="aula-leccion-desc" style={{whiteSpace:'pre-line'}}>{leccionActiva.contenido_texto}</div>
            )}

            <button className={`aula-btn-completar${completadas.has(leccionActiva.id) ? ' done' : ''}`}
              onClick={() => toggleCompletada(leccionActiva.id)} disabled={guardandoProgreso}>
              <Check size={15}/> {completadas.has(leccionActiva.id) ? 'Completada' : 'Marcar como completada'}
            </button>

            {leccionActiva.notas && (
              <div className="aula-notas"><strong>Notas:</strong> {leccionActiva.notas}</div>
            )}

            {ctxLeccion && (
              <Cuaderno key={leccionActiva.id} ctx={ctxLeccion} control={control}
                esTexto={leccionActiva.tipo === 'texto' && !!leccionActiva.contenido_texto}
                zonaTexto={textoRef} pausarAlEscribir={pausarAlEscribir} onPausarAlEscribir={cambiarPausa}
                hrefCuaderno={`/mi-cuenta/cursos/${courseId}/cuaderno`}/>
            )}

            {adjuntos.length > 0 && (
              <div className="aula-notas">
                <strong>Material descargable</strong>
                <div style={{display:'flex',flexDirection:'column',gap:'8px',marginTop:'10px'}}>
                  {adjuntos.map(a => {
                    const info = detectarContenido(a.url)
                    if (!info) return null
                    const sePuedeVer = info.visor !== 'link'
                    const abierto = adjuntoAbierto === a.id
                    return (
                      <div key={a.id} style={{borderRadius:'10px',border:'1px solid #E5E5E5',background:'#FAFAFA',overflow:'hidden'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 14px'}}>
                          <FileText size={15} color="#8B5CF6" style={{flexShrink:0}}/>
                          <span style={{flex:1,minWidth:0,fontWeight:600,fontSize:'13px',color:'#0A0A0A',overflowWrap:'anywhere'}}>{a.nombre}</span>
                          {sePuedeVer && (
                            <button type="button" onClick={() => setAdjuntoAbierto(abierto ? null : a.id)}
                              style={{display:'inline-flex',alignItems:'center',gap:'4px',fontSize:'12px',fontWeight:600,color:'#7C3AED',background:'#F4F0FF',border:'none',borderRadius:'8px',padding:'6px 10px',cursor:'pointer',fontFamily:'inherit',flexShrink:0}}>
                              {abierto ? <><EyeOff size={12}/> Cerrar</> : <><Eye size={12}/> Ver acá</>}
                            </button>
                          )}
                          <a href={info.abrirUrl} target="_blank" rel="noopener noreferrer"
                            style={{display:'inline-flex',alignItems:'center',gap:'4px',fontSize:'12px',fontWeight:600,color:'#525252',textDecoration:'none',padding:'6px 8px',flexShrink:0}}>
                            <ExternalLink size={12}/> Abrir
                          </a>
                        </div>
                        {abierto && (
                          <div style={{padding:'0 12px 12px'}}>
                            <VisorContenido url={a.url}/>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>) : (
            <div style={{color:'#737373',fontSize:'14px'}}>Elegí una lección del menú para empezar.</div>
          )}
        </div>
      </div>

      {celebracion && (
        <Celebracion tipo={celebracion.tipo} titulo={celebracion.titulo}
          avance={totalLecciones > 0 ? hechasDeVerdad / totalLecciones : 0}
          haySiguiente={!!siguienteLeccion}
          onSiguiente={() => { if (siguienteLeccion) irALeccion(siguienteLeccion) }}
          onCerrar={() => setCelebracion(null)}
          onCompartir={abrirCompartir}/>
      )}
      {compartir && <CompartirLogro datos={compartir} onCerrar={() => setCompartir(null)}/>}
    </div>
  )
}