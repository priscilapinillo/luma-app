'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { LogOut, Clock, Star } from 'lucide-react'
import { tieneAccesoCurso } from '@/lib/acceso'
import LunaProgreso from '@/components/aula/LunaProgreso'
import NovedadesAula, { FECHA_NOVEDADES } from '@/components/aula/NovedadesAula'
import CompartirLogro from '@/components/aula/CompartirLogro'
import type { DatosLogro } from '@/lib/dibujos'
import {
  type Favorito, type Progreso, progresosDe, favoritosDe, preferenciasDe, guardarPreferencias,
  formatoMinuto, diasParaVencer, DIAS_AVISO_VENCE,
} from '@/lib/aula'

type LeccionCorta = { id: string; titulo: string; orden: number; module_id: string; course_id: string; moduloOrden: number }
type Retoma = { courseId: string; cursoTitulo: string; leccionId: string; leccionTitulo: string; segundo: number; siguiente: boolean }

type Inscripcion = {
  id: string
  estado: string
  modalidad: string
  fecha_inicio: string
  fecha_vencimiento: string | null
  suscripcion_estado: string | null
  suscripcion_link: string | null
  proximo_cobro: string | null
  mp_preapproval_id: string | null
  suscripcion_aviso: string | null
  course: {
    id: string
    titulo: string
    imagen_url: string
    slug: string
    cobro_automatico?: boolean
  }
  terapeuta: {
    nombre_profesional: string
    slug: string
    whatsapp: string | null
    alias_pago: string | null
    cbu: string | null
    titular_cuenta: string | null
    banco: string | null
    mp_activo?: boolean
  } | null
  proximoEncuentro: { fecha_hora: string } | null
}

export default function MisCursosPage() {
  const router = useRouter()
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([])
  const [loading, setLoading] = useState(true)
  const [debugInfo, setDebugInfo] = useState('')
  const [datosAbiertos, setDatosAbiertos] = useState<string | null>(null)
  const [accionando, setAccionando] = useState<string | null>(null)
  const [mensajes, setMensajes] = useState<Record<string, string>>({})
  // ── aula nueva (si algo de esto falla, Mis cursos se ve igual que siempre)
  const [pestana, setPestana] = useState<'cursos' | 'favoritos' | 'cuadernos'>('cursos')
  const [luna, setLuna] = useState<Record<string, { hechas: number; total: number }>>({})
  const [retoma, setRetoma] = useState<Retoma | null>(null)
  const [favoritos, setFavoritos] = useState<Favorito[]>([])
  const [filtroFav, setFiltroFav] = useState('')
  const [apuntesPorCurso, setApuntesPorCurso] = useState<Record<string, number>>({})
  const [apuntesPorLeccion, setApuntesPorLeccion] = useState<Record<string, number>>({})
  const [certificados, setCertificados] = useState<Record<string, string>>({})
  const [novedades, setNovedades] = useState(false)
  const [personaId, setPersonaId] = useState<string | null>(null)
  const [nombreAlumna, setNombreAlumna] = useState('')
  const [compartir, setCompartir] = useState<DatosLogro | null>(null)
  const [avisoBloqueo, setAvisoBloqueo] = useState('')

  useEffect(() => { cargarDatos(true) }, [])

  const fechaLarga = (f: string | null) => f ? new Date(f).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' }) : ''

  async function tokenSesion() {
    const { data: { session } } = await createClient().auth.getSession()
    return session?.access_token
  }

  // le pregunta a Mercado Pago cómo están las suscripciones que lo necesitan (cobros nuevos, rechazos, vencimientos)
  async function refrescarSuscripciones(lista: Inscripcion[]) {
    const tresDias = Date.now() + 3 * 86400000
    const revisar = lista.filter(i => (i.mp_preapproval_id || i.suscripcion_estado === 'pendiente') && (
      ['pendiente', 'esperando_cobro', 'con_problemas', 'rechazada', 'activa'].includes(i.suscripcion_estado || '') &&
      (i.suscripcion_estado !== 'activa' || !i.fecha_vencimiento || new Date(i.fecha_vencimiento).getTime() < tresDias)
    )).slice(0, 5)
    if (revisar.length === 0) return false
    const accessToken = await tokenSesion()
    for (const i of revisar) {
      try {
        await fetch('/api/cursos/suscripcion/estado', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enrollmentId: i.id, accessToken }),
        })
      } catch (e) { console.error(e) }
    }
    return true
  }

  async function irASuscripcion(i: Inscripcion) {
    setAccionando(i.id)
    setMensajes(prev => ({ ...prev, [i.id]: '' }))
    let seVa = false
    try {
      for (let intento = 0; intento < 4; intento++) {
        const res = await fetch('/api/cursos/suscripcion/crear', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enrollmentId: i.id, accessToken: await tokenSesion() }),
        })
        const r = await res.json().catch(() => ({ estado: 'error' }))
        if (r.link) { seVa = true; window.location.href = r.link; return }
        if (r.estado === 'en_proceso') { await new Promise(ok => setTimeout(ok, 2500)); continue }
        if (r.estado === 'activa' || r.estado === 'esperando_cobro') { await cargarDatos(false); return }
        setMensajes(prev => ({ ...prev, [i.id]: r.mensaje || 'No se pudo conectar con Mercado Pago. Probá de nuevo.' }))
        return
      }
      setMensajes(prev => ({ ...prev, [i.id]: 'Mercado Pago está tardando. Probá de nuevo en un momento.' }))
    } finally { if (!seVa) setAccionando(null) }
  }

  async function cancelarSuscripcion(i: Inscripcion) {
    const hasta = fechaLarga(i.fecha_vencimiento)
    if (!confirm(`¿Cancelar la renovación automática de "${i.course.titulo}"?\n\nNo se te va a cobrar más.${hasta ? ` Seguís teniendo acceso hasta el ${hasta}.` : ''}`)) return
    setAccionando(i.id)
    try {
      const res = await fetch('/api/cursos/suscripcion/cancelar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId: i.id, accessToken: await tokenSesion() }),
      })
      const r = await res.json().catch(() => ({ ok: false }))
      if (!r.ok) { setMensajes(prev => ({ ...prev, [i.id]: r.mensaje || 'No se pudo cancelar. Probá de nuevo en unos minutos.' })); return }
      await cargarDatos(false)
    } finally { setAccionando(null) }
  }

  async function cargarDatos(revisarMP = false) {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/aula'); return }

      const { data: persona, error: errorPersona } = await supabase
        .from('persons').select('id, nombre, apellido').eq('auth_user_id', user.id).maybeSingle()
      if (!persona) {
        if (errorPersona) console.error('Error buscando la persona:', errorPersona)
        setDebugInfo('No encontramos cursos asociados a esta cuenta. Si compraste con otro email, cerrá sesión y entrá con ese.')
        setLoading(false); return
      }

      const { data: enrollments, error: errorEnroll } = await supabase
        .from('enrollments')
        .select('id, estado, modalidad, fecha_inicio, fecha_vencimiento, course_id, suscripcion_estado, suscripcion_link, proximo_cobro, mp_preapproval_id, suscripcion_aviso')
        .eq('person_id', persona.id)
        .order('fecha_inicio', { ascending: false })

      if (errorEnroll) {
        console.error('Error cargando inscripciones:', errorEnroll)
        setDebugInfo('No pudimos cargar tus cursos. Revisá tu conexión y recargá la página.')
        setLoading(false); return
      }

      if (!enrollments || enrollments.length === 0) {
        setInscripciones([])
        setLoading(false); return
      }

      const courseIds = enrollments.map(e => e.course_id)
      const { data: cursos } = await supabase
        .from('courses').select('id, titulo, imagen_url, slug, user_id, cobro_automatico')
        .in('id', courseIds)

      const terapeutaIds = [...new Set((cursos || []).map(c => c.user_id))]
      const { data: terapeutas } = await supabase
        .from('therapist_profiles').select('user_id, nombre_profesional, slug, whatsapp, alias_pago, cbu, titular_cuenta, banco, mp_activo')
        .in('user_id', terapeutaIds)

        const { data: encuentros } = await supabase
        .from('course_live_sessions').select('course_id, fecha_hora')
        .in('course_id', courseIds).gte('fecha_hora', new Date(Date.now() - 2 * 3600000).toISOString()) // sigue visible hasta 2 horas después de empezar
        .order('fecha_hora')

      const combinado = enrollments.map(e => {
        const curso = cursos?.find(c => c.id === e.course_id)
        const terapeuta = terapeutas?.find(t => t.user_id === curso?.user_id)
        const proximoEncuentro = encuentros?.find(en => en.course_id === e.course_id) || null
        return {
          id: e.id,
          estado: e.estado,
          modalidad: e.modalidad,
          fecha_inicio: e.fecha_inicio,
          fecha_vencimiento: e.fecha_vencimiento,
          suscripcion_estado: e.suscripcion_estado || null,
          suscripcion_link: e.suscripcion_link || null,
          proximo_cobro: e.proximo_cobro || null,
          mp_preapproval_id: e.mp_preapproval_id || null,
          suscripcion_aviso: e.suscripcion_aviso || null,
          course: curso as Inscripcion['course'],
          terapeuta: terapeuta ? { nombre_profesional: terapeuta.nombre_profesional, slug: terapeuta.slug, whatsapp: terapeuta.whatsapp, alias_pago: terapeuta.alias_pago, cbu: terapeuta.cbu, titular_cuenta: terapeuta.titular_cuenta, banco: terapeuta.banco, mp_activo: terapeuta.mp_activo } : null,
          proximoEncuentro,
        }
      }).filter(i => i.course)

      setInscripciones(combinado)
      setPersonaId(persona.id)
      setNombreAlumna([persona.nombre, persona.apellido].filter(Boolean).join(' ').trim())
      cargarAulaNueva(persona.id, combinado).catch(e => console.error('Aula nueva:', e))
      // si alguna suscripción necesita revisarse, le preguntamos a Mercado Pago y recargamos una sola vez
      if (revisarMP && await refrescarSuscripciones(combinado)) { await cargarDatos(false); return }
    } catch (e: any) {
      console.error(e)
      setDebugInfo('Hubo un problema al cargar tus cursos. Recargá la página.')
    } finally { setLoading(false) }
  }

  // luna, retomá, favoritos, cuadernos, certificados y aviso de novedades
  async function cargarAulaNueva(pid: string, lista: Inscripcion[]) {
    const supabase = createClient()
    const courseIds = lista.map(i => i.course.id)
    const enrollIds = lista.map(i => i.id)
    const [progresos, favs, prefs, mods, prog, certs, apuntes] = await Promise.all([
      progresosDe(pid).catch(() => [] as Progreso[]),
      favoritosDe(pid).catch(() => [] as Favorito[]),
      preferenciasDe(pid).catch(() => null),
      supabase.from('modules').select('id, course_id, orden').in('course_id', courseIds).then(r => r.data || [], () => []),
      supabase.from('lesson_progress').select('enrollment_id, lesson_id, completada').in('enrollment_id', enrollIds).then(r => r.data || [], () => []),
      supabase.from('certificates').select('enrollment_id, codigo_unico').in('enrollment_id', enrollIds).then(r => r.data || [], () => []),
      supabase.from('alumna_apuntes').select('course_id, lesson_id').eq('person_id', pid).limit(5000).then(r => r.data || [], () => []),
    ])
    setFavoritos(favs)
    const porCurso: Record<string, number> = {}, porLeccion: Record<string, number> = {}
    for (const a of apuntes as { course_id: string; lesson_id: string | null }[]) {
      porCurso[a.course_id] = (porCurso[a.course_id] || 0) + 1
      if (a.lesson_id) porLeccion[a.lesson_id] = (porLeccion[a.lesson_id] || 0) + 1
    }
    setApuntesPorCurso(porCurso); setApuntesPorLeccion(porLeccion)
    const cert: Record<string, string> = {}
    for (const c of certs as { enrollment_id: string; codigo_unico: string }[]) cert[c.enrollment_id] = c.codigo_unico
    setCertificados(cert)

    // lecciones de cada curso (las del curso con acceso + el temario público, para las que vencieron)
    const modIds = (mods as { id: string }[]).map(m => m.id)
    let lecciones: LeccionCorta[] = []
    if (modIds.length) {
      const [a, b] = await Promise.all([
        supabase.from('lessons').select('id, titulo, orden, module_id').in('module_id', modIds).then(r => r.data || [], () => []),
        supabase.from('lessons_publicas').select('id, titulo, orden, module_id').in('module_id', modIds).then(r => r.data || [], () => []),
      ])
      const vistas = new Set<string>()
      for (const l of [...a, ...b] as { id: string; titulo: string; orden: number; module_id: string }[]) {
        if (vistas.has(l.id)) continue
        vistas.add(l.id)
        const m = (mods as { id: string; course_id: string; orden: number }[]).find(x => x.id === l.module_id)
        if (m) lecciones.push({ ...l, course_id: m.course_id, moduloOrden: m.orden || 0 })
      }
      lecciones = lecciones.sort((x, y) => x.moduloOrden - y.moduloOrden || (x.orden || 0) - (y.orden || 0))
    }

    // la luna de cada curso: en vivo si se puede; si no (acceso vencido), lo último que se guardó
    const hechasPorInsc: Record<string, Set<string>> = {}
    for (const p of prog as { enrollment_id: string; lesson_id: string; completada: boolean }[]) {
      if (!p.completada) continue
      ;(hechasPorInsc[p.enrollment_id] ||= new Set()).add(p.lesson_id)
    }
    const l: Record<string, { hechas: number; total: number }> = {}
    for (const i of lista) {
      const delCurso = lecciones.filter(x => x.course_id === i.course.id)
      const hechas = hechasPorInsc[i.id] || new Set<string>()
      const snap = progresos.find(p => p.course_id === i.course.id)
      if (delCurso.length) l[i.course.id] = { hechas: delCurso.filter(x => hechas.has(x.id)).length, total: delCurso.length }
      else if (snap && snap.total_lecciones > 0) l[i.course.id] = { hechas: snap.completadas, total: snap.total_lecciones }
    }
    setLuna(l)

    // Retomá donde dejaste: el último curso con acceso donde abrió una lección
    let r: Retoma | null = null
    for (const p of progresos) {
      const i = lista.find(x => x.course.id === p.course_id)
      if (!i || !p.lesson_id || !tieneAccesoCurso({ estado: i.estado, modalidad: i.modalidad, fecha_vencimiento: i.fecha_vencimiento })) continue
      const delCurso = lecciones.filter(x => x.course_id === p.course_id)
      const pos = delCurso.findIndex(x => x.id === p.lesson_id)
      if (delCurso.length && pos < 0) continue // la lección ya no existe
      const hechas = hechasPorInsc[i.id] || new Set<string>()
      if (hechas.has(p.lesson_id)) {
        const sig = delCurso.slice(pos + 1).find(x => !hechas.has(x.id)) || delCurso.find(x => !hechas.has(x.id))
        if (!sig) continue // curso terminado: no hay nada para retomar
        r = { courseId: p.course_id, cursoTitulo: i.course.titulo, leccionId: sig.id, leccionTitulo: sig.titulo, segundo: 0, siguiente: true }
      } else {
        r = { courseId: p.course_id, cursoTitulo: i.course.titulo, leccionId: p.lesson_id, leccionTitulo: delCurso[pos]?.titulo || p.leccion_titulo, segundo: p.segundo || 0, siguiente: false }
      }
      break
    }
    setRetoma(r)

    // aviso "Tu aula se renovó": una sola vez por alumna (se guarda en su cuenta)
    if (prefs && (!prefs.novedades_vistas_at || new Date(prefs.novedades_vistas_at) < new Date(FECHA_NOVEDADES))) setNovedades(true)
  }

  function cerrarNovedades() {
    setNovedades(false)
    if (personaId) guardarPreferencias(personaId, { novedades_vistas_at: new Date().toISOString() }).catch(() => null)
  }

  async function abrirCompartir(i: Inscripcion) {
    const codigo = certificados[i.id]
    const base: DatosLogro = { alumna: nombreAlumna || 'Alumna', curso: i.course.titulo, terapeuta: i.terapeuta?.nombre_profesional || '', fecha: new Date(), esCertificado: !!codigo }
    if (codigo) {
      try {
        const { data } = await createClient().rpc('verificar_certificado', { p_codigo: codigo })
        const c = data?.[0]
        if (c) {
          base.alumna = c.alumna_nombre || base.alumna; base.terapeuta = c.terapeuta_nombre || base.terapeuta
          base.curso = c.curso_titulo || base.curso; if (c.fecha_emision) base.fecha = new Date(c.fecha_emision)
        }
      } catch { /* usamos lo que tenemos */ }
    }
    setCompartir(base)
  }

  function abrirFavorito(f: Favorito) {
    const i = inscripciones.find(x => x.course.id === f.course_id)
    if (!i || !tieneAccesoCurso({ estado: i.estado, modalidad: i.modalidad, fecha_vencimiento: i.fecha_vencimiento })) {
      setAvisoBloqueo(f.lesson_id); return
    }
    router.push(`/mi-cuenta/cursos/${f.course_id}?leccion=${f.lesson_id}`)
  }

  async function cerrarSesion() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/aula')
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:'14px',color:'#6B7280',fontFamily:'sans-serif'}}>
      Cargando...
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#FAFAFA',fontFamily:"'Geist',sans-serif"}}>
      <style>{`
        
        *{box-sizing:border-box;margin:0;padding:0}
        .mc-nav{display:flex;justify-content:space-between;align-items:center;padding:16px 24px;background:white;border-bottom:1px solid #E5E5E5}
        .mc-logo{font-size:18px;font-weight:900;color:#0A0A0A}
        .mc-logo span{color:#8B5CF6}
        .mc-logout{display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;border:1px solid #E5E5E5;background:white;font-size:12px;font-weight:600;color:#525252;cursor:pointer;font-family:inherit}
        .mc-wrap{max-width:900px;margin:0 auto;padding:32px 20px}
        .mc-titulo{font-size:24px;font-weight:800;color:#0A0A0A;margin-bottom:24px}
        .mc-grid{display:grid;grid-template-columns:1fr;gap:14px}
        @media(min-width:640px){ .mc-grid{grid-template-columns:1fr 1fr} }
        .mc-card{background:white;border:1px solid #E5E5E5;border-radius:14px;overflow:hidden;cursor:pointer;transition:transform 0.15s}
        .mc-card:hover{transform:translateY(-2px)}
        .mc-card.pendiente{cursor:default}
        .mc-card.pendiente .mc-card-img{opacity:0.6}
        .mc-btn-completar{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;padding:8px 14px;border-radius:8px;background:#8B5CF6;color:white;text-decoration:none}
        .mc-pendiente-txt{font-size:12px;color:#525252;line-height:1.5;margin-top:8px}
        .mc-card-img{width:100%;height:140px;object-fit:cover;background:#F0EBFF}
        .mc-card-body{padding:14px 16px}
        .mc-card-titulo{font-size:14px;font-weight:700;color:#0A0A0A;margin-bottom:4px}
        .mc-card-terapeuta{font-size:12px;color:#8B5CF6;margin-bottom:10px}
        .mc-badge{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px}
        .mc-badge.activa{background:#DCFCE7;color:#166534}
        .mc-badge.pendiente_pago{background:#FEF9C3;color:#92400E}
        .mc-ver-btn{margin-top:10px;font-size:12px;font-weight:700;color:#8B5CF6}
        .mc-empty{text-align:center;padding:60px 20px;color:#737373}
        .mc-btn-datos{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;padding:7px 12px;border-radius:8px;background:#F0EBFF;color:#6D28D9;border:none;cursor:pointer;font-family:inherit}
        .mc-datos-pago{margin-top:10px;padding:12px;background:#FAFAFA;border:1px solid #E5E5E5;border-radius:10px;font-size:12px}
        .mc-datos-row{display:flex;justify-content:space-between;padding:4px 0}
        .mc-sus{margin-top:10px;padding:9px 11px;border-radius:9px;background:#F5F3FF;color:#5B21B6;font-size:11.5px;line-height:1.5;cursor:default}
        .mc-sus.alerta{background:#FFFBEB;color:#92400E}
        .mc-link{display:inline;margin-left:6px;background:none;border:none;padding:0;color:inherit;font-weight:700;text-decoration:underline;cursor:pointer;font-family:inherit;font-size:11.5px}
        .mc-link:disabled{opacity:.6;cursor:default}
        @font-face{font-family:'Avigea';src:url('/fonts/Avigea.ttf') format('truetype');font-display:swap}
        .mc-cab{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:16px;flex-wrap:wrap}
        .mc-cab .mc-titulo{margin-bottom:0}
        .mc-nov{border:none;background:none;color:#8B5CF6;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit;padding:4px 0}
        .mc-tabs{display:flex;gap:6px;margin-bottom:18px;overflow-x:auto}
        .mc-tab{flex-shrink:0;padding:8px 12px;border-radius:20px;border:1px solid #E5E5E5;background:white;font-size:12.5px;font-weight:700;color:#525252;cursor:pointer;font-family:inherit}
        .mc-tab.on{background:#140F24;border-color:#140F24;color:#F4EFE6}
        .mc-retoma{display:flex;align-items:center;gap:14px;padding:14px 16px;margin-bottom:16px;border-radius:16px;background:linear-gradient(135deg,#2A1B4D,#140F24);color:#F4EFE6;cursor:pointer;border:1px solid rgba(201,168,76,.35)}
        .mc-retoma-play{width:44px;height:44px;border-radius:50%;background:#C9A84C;color:#1A1230;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
        .mc-luna{display:flex;align-items:center;gap:12px;margin-bottom:4px}
        .mc-luna-txt{font-size:11px;color:#A8862E;font-weight:700;margin-bottom:10px}
        .mc-vence{margin-top:10px;padding:10px 11px;border-radius:9px;background:#FFF7ED;border:1px solid #FED7AA;color:#9A3412;font-size:11.5px;line-height:1.5;cursor:default}
        .mc-extra{display:inline-flex;align-items:center;gap:6px;margin-top:10px;font-size:11.5px;font-weight:700;padding:7px 12px;border-radius:8px;border:1px solid #E9D9A6;background:#FFFBEB;color:#8A6D1F;cursor:pointer;font-family:inherit;text-decoration:none}
        .mc-fila{display:flex;align-items:center;gap:12px;padding:12px 14px;background:white;border:1px solid #E5E5E5;border-radius:12px;cursor:pointer;margin-bottom:8px}
        .mc-fila-t{font-size:14px;font-weight:700;color:#0A0A0A}
        .mc-fila-s{font-size:11.5px;color:#737373;margin-top:2px}
      `}</style>

      <nav className="mc-nav">
        <div className="mc-logo">Luma<span>.</span></div>
        <button className="mc-logout" onClick={cerrarSesion}><LogOut size={13}/> Cerrar sesión</button>
      </nav>

      <div className="mc-wrap">
        <div className="mc-cab">
          <h1 className="mc-titulo">Mis cursos</h1>
          {inscripciones.length > 0 && <button className="mc-nov" onClick={() => setNovedades(true)}>✨ Novedades</button>}
        </div>
        {inscripciones.length > 0 && (
          <div className="mc-tabs" role="tablist">
            <button role="tab" aria-selected={pestana === 'cursos'} className={`mc-tab${pestana === 'cursos' ? ' on' : ''}`} onClick={() => setPestana('cursos')}>📚 Cursos</button>
            <button role="tab" aria-selected={pestana === 'favoritos'} className={`mc-tab${pestana === 'favoritos' ? ' on' : ''}`} onClick={() => setPestana('favoritos')}>⭐ Favoritos{favoritos.length ? ` (${favoritos.length})` : ''}</button>
            <button role="tab" aria-selected={pestana === 'cuadernos'} className={`mc-tab${pestana === 'cuadernos' ? ' on' : ''}`} onClick={() => setPestana('cuadernos')}>📓 Cuadernos</button>
          </div>
        )}

        {debugInfo && (
          <div style={{background:'#FEF3C7',padding:'14px',borderRadius:'8px',fontSize:'12px',marginBottom:'20px',whiteSpace:'pre-wrap'}}>{debugInfo}</div>
        )}

        {inscripciones.length > 0 && pestana === 'favoritos' && (
          <div>
            {favoritos.length === 0 ? (
              <div className="mc-empty">⭐<br/>Todavía no guardaste lecciones.<br/>Tocá la estrella en una lección para tenerla siempre a mano.</div>
            ) : (<>
              {new Set(favoritos.map(f => f.course_id)).size > 1 && (
                <select value={filtroFav} onChange={e => setFiltroFav(e.target.value)} aria-label="Filtrar por curso"
                  style={{marginBottom:'12px',padding:'9px 12px',borderRadius:'10px',border:'1px solid #E5E5E5',background:'white',fontSize:'13px',fontFamily:'inherit',maxWidth:'100%'}}>
                  <option value="">Todos mis cursos</option>
                  {inscripciones.filter(i => favoritos.some(f => f.course_id === i.course.id)).map(i => <option key={i.course.id} value={i.course.id}>{i.course.titulo}</option>)}
                </select>
              )}
              {favoritos.filter(f => !filtroFav || f.course_id === filtroFav).map(f => {
                const i = inscripciones.find(x => x.course.id === f.course_id)
                const bloqueada = !i || !tieneAccesoCurso({ estado: i.estado, modalidad: i.modalidad, fecha_vencimiento: i.fecha_vencimiento })
                const n = apuntesPorLeccion[f.lesson_id] || 0
                return (
                  <div key={f.lesson_id}>
                    <div className="mc-fila" onClick={() => abrirFavorito(f)} style={bloqueada ? {opacity:.75} : undefined}>
                      <Star size={18} color="#C9A84C" fill="#C9A84C" style={{flexShrink:0}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div className="mc-fila-t">{f.leccion_titulo || 'Lección'}</div>
                        <div className="mc-fila-s">{i?.course.titulo || 'Curso'}{f.modulo_titulo ? ` · ${f.modulo_titulo}` : ''}{n ? ` · 📓 ${n} apunte${n === 1 ? '' : 's'}` : ''}</div>
                      </div>
                      <span style={{fontSize:'12px',fontWeight:700,color: bloqueada ? '#A3A3A3' : '#8B5CF6',flexShrink:0}}>{bloqueada ? '🔒' : 'Ver →'}</span>
                    </div>
                    {avisoBloqueo === f.lesson_id && (
                      <div className="mc-sus alerta" style={{marginTop:'-4px',marginBottom:'10px'}}>
                        Esta lección está bloqueada hasta que renueves tu acceso a “{i?.course.titulo}”. Tus apuntes siguen en tu cuaderno.
                        <button className="mc-link" onClick={() => { setAvisoBloqueo(''); setPestana('cursos') }}>Ver cómo renovar</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </>)}
          </div>
        )}

        {inscripciones.length > 0 && pestana === 'cuadernos' && (
          <div>
            <div style={{fontSize:'12px',color:'#737373',marginBottom:'12px'}}>🔒 Tus cuadernos son privados: solo los ves vos.</div>
            {inscripciones.map(i => {
              const n = apuntesPorCurso[i.course.id] || 0
              return (
                <div key={i.id} className="mc-fila" onClick={() => router.push(`/mi-cuenta/cursos/${i.course.id}/cuaderno`)}>
                  <span style={{fontSize:'22px',flexShrink:0}}>📓</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="mc-fila-t">{i.course.titulo}</div>
                    <div className="mc-fila-s">{n ? `${n} apunte${n === 1 ? '' : 's'}` : 'Todavía vacío'}{i.terapeuta ? ` · con ${i.terapeuta.nombre_profesional}` : ''}</div>
                  </div>
                  <span style={{fontSize:'12px',fontWeight:700,color:'#A8862E',flexShrink:0}}>Abrir →</span>
                </div>
              )
            })}
          </div>
        )}

        {pestana === 'cursos' && retoma && (
          <div className="mc-retoma" role="button" tabIndex={0}
            onClick={() => router.push(`/mi-cuenta/cursos/${retoma.courseId}?leccion=${retoma.leccionId}${retoma.segundo > 5 ? `&t=${Math.floor(retoma.segundo)}` : ''}`)}>
            <div className="mc-retoma-play">▶</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:'10px',letterSpacing:'2px',textTransform:'uppercase',color:'#C9A84C',fontWeight:700}}>{retoma.siguiente ? 'Seguí con la próxima' : 'Retomá donde dejaste'}</div>
              <div style={{fontSize:'14px',fontWeight:700,marginTop:'2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{retoma.leccionTitulo}</div>
              <div style={{fontSize:'11.5px',color:'#B7A9D9',marginTop:'1px'}}>{retoma.cursoTitulo}{!retoma.siguiente && retoma.segundo > 5 ? ` · minuto ${formatoMinuto(retoma.segundo)}` : ''}</div>
            </div>
          </div>
        )}

        {pestana !== 'cursos' ? null : inscripciones.length === 0 ? (
          <div className="mc-empty">Todavía no compraste ningún curso.</div>
        ) : (
          <div className="mc-grid">
            {inscripciones.map(i => {
              const acceso = tieneAccesoCurso({ estado: i.estado, modalidad: i.modalidad, fecha_vencimiento: i.fecha_vencimiento })
              const ln = luna[i.course.id]
              const terminado = !!ln && ln.total > 0 && ln.hechas >= ln.total
              const sinEmpezarPago = !acceso && i.estado !== 'activa'
              const dias = diasParaVencer(i.fecha_vencimiento)
              const proximoAVencer = acceso && i.modalidad === 'suscripcion' && dias !== null && dias <= DIAS_AVISO_VENCE &&
                !['activa', 'esperando_cobro', 'con_problemas'].includes(i.suscripcion_estado || '')
              return (
              <div key={i.id}
                className={`mc-card${!acceso ? ' pendiente' : ''}`}
                onClick={() => { if (acceso) router.push(`/mi-cuenta/cursos/${i.course.id}`) }}>
                {i.course.imagen_url && <img src={i.course.imagen_url} className="mc-card-img"/>}
                <div className="mc-card-body">
                  <div className="mc-luna">
                    {(ln || sinEmpezarPago) && <LunaProgreso p={sinEmpezarPago ? 0 : ln ? ln.hechas / ln.total : 0} tamano={46} apagada={!acceso}/>}
                    <div style={{flex:1,minWidth:0}}>
                      <div className="mc-card-titulo">{i.course.titulo}</div>
                      {i.terapeuta && <div className="mc-card-terapeuta" style={{marginBottom:0}}>{i.terapeuta.nombre_profesional}</div>}
                    </div>
                  </div>
                  <div className="mc-luna-txt">
                    {sinEmpezarPago ? '🌑 Tu luna empieza cuando se confirme tu pago'
                      : ln ? (terminado ? '🌕 ¡Curso terminado!' : `${ln.hechas} de ${ln.total} lecciones`) : ''}
                  </div>
                  {acceso ? (<>
                    <span className="mc-badge activa">✓ Acceso activo</span>
                    {i.proximoEncuentro && (
                      <div style={{fontSize:'11px',fontWeight:700,color:'#EC4899',marginTop:'6px'}}>
                        🔴 Encuentro: {new Date(i.proximoEncuentro.fecha_hora).toLocaleDateString('es-AR', { day:'numeric', month:'short' })}
                      </div>
                    )}
                    <div className="mc-ver-btn">Ver curso →</div>
                    {(i.suscripcion_estado === 'activa' || i.suscripcion_estado === 'esperando_cobro') && (
                      <div className="mc-sus" onClick={e => e.stopPropagation()}>
                        🔁 Renovación automática{i.proximo_cobro ? ` · próximo cobro: ${fechaLarga(i.proximo_cobro)}` : ''}
                        <button className="mc-link" disabled={accionando === i.id} onClick={() => cancelarSuscripcion(i)}>
                          {accionando === i.id ? 'Cancelando…' : 'Cancelar'}
                        </button>
                      </div>
                    )}
                    {i.suscripcion_aviso && ['activa', 'esperando_cobro', 'con_problemas'].includes(i.suscripcion_estado || '') && (
                      <div className="mc-sus alerta" onClick={e => e.stopPropagation()}>📣 {i.suscripcion_aviso}</div>
                    )}
                    {i.suscripcion_estado === 'con_problemas' && (
                      <div className="mc-sus alerta" onClick={e => e.stopPropagation()}>
                        ⚠️ No pudimos cobrar tu cuota. Actualizá tu tarjeta en Mercado Pago (Tu perfil → Suscripciones). Tenés acceso hasta el {fechaLarga(i.fecha_vencimiento)}.
                      </div>
                    )}
                    {i.suscripcion_estado === 'cancelada' && i.modalidad === 'suscripcion' && (
                      <div className="mc-sus" onClick={e => e.stopPropagation()}>Renovación automática cancelada · acceso hasta el {fechaLarga(i.fecha_vencimiento)}</div>
                    )}
                    {proximoAVencer && (
                      <div className="mc-vence" onClick={e => e.stopPropagation()}>
                        ⏳ <strong>Tu acceso vence {dias !== null && dias <= 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias} días`}</strong> ({fechaLarga(i.fecha_vencimiento)}).
                        {' '}Renová por transferencia{i.course.cobro_automatico && i.terapeuta?.mp_activo ? ' o activá la renovación automática' : ''} para no perder el acceso.
                        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'8px'}}>
                          {(i.terapeuta?.alias_pago || i.terapeuta?.cbu) && (
                            <button className="mc-btn-datos" onClick={() => setDatosAbiertos(datosAbiertos === i.id ? null : i.id)}>🏦 Ver datos de pago</button>
                          )}
                          {i.terapeuta?.whatsapp && (
                            <a href={`https://wa.me/${i.terapeuta.whatsapp.replace(/\D/g,'').replace(/^0+/,'')}?text=${encodeURIComponent(`Hola! Te paso el comprobante del próximo mes de "${i.course.titulo}" para renovar mi acceso.`)}`}
                              target="_blank" rel="noopener noreferrer"
                              style={{display:'inline-flex',alignItems:'center',gap:'6px',fontSize:'11px',fontWeight:700,padding:'7px 12px',borderRadius:'8px',background:'#25D366',color:'white',textDecoration:'none'}}>
                              💬 Enviar comprobante
                            </a>
                          )}
                        </div>
                        {datosAbiertos === i.id && (
                          <div className="mc-datos-pago">
                            {i.terapeuta?.alias_pago && <div className="mc-datos-row"><span>Alias</span><strong>{i.terapeuta.alias_pago}</strong></div>}
                            {i.terapeuta?.cbu && <div className="mc-datos-row"><span>CBU</span><strong>{i.terapeuta.cbu}</strong></div>}
                            {i.terapeuta?.titular_cuenta && <div className="mc-datos-row"><span>Titular</span><strong>{i.terapeuta.titular_cuenta}</strong></div>}
                            {i.terapeuta?.banco && <div className="mc-datos-row"><span>Banco</span><strong>{i.terapeuta.banco}</strong></div>}
                          </div>
                        )}
                      </div>
                    )}
                    {i.modalidad === 'suscripcion' && i.course.cobro_automatico && i.terapeuta?.mp_activo && !['activa', 'esperando_cobro', 'con_problemas', 'pendiente', 'creando'].includes(i.suscripcion_estado || '') && (
                      <div className="mc-sus" onClick={e => e.stopPropagation()}>
                        ¿Querés que se renueve solo? El primer cobro es el día que vence tu acceso.
                        <button className="mc-link" disabled={accionando === i.id} onClick={() => irASuscripcion(i)}>
                          {accionando === i.id ? 'Preparando…' : 'Activar renovación automática'}
                        </button>
                      </div>
                    )}
                    {mensajes[i.id] && <div className="mc-sus alerta" onClick={e => e.stopPropagation()}>{mensajes[i.id]}</div>}
                    {terminado && (
                      <button className="mc-extra" onClick={e => { e.stopPropagation(); abrirCompartir(i) }}>
                        ✦ {certificados[i.id] ? 'Compartir mi certificado' : 'Compartir mi logro'}
                      </button>
                    )}
                  </>) : i.suscripcion_estado === 'esperando_cobro' ? (<>
                    <span className="mc-badge pendiente_pago">⏳ Confirmando tu primer cobro</span>
                    <div className="mc-pendiente-txt">Tu suscripción está activa. El acceso se habilita apenas Mercado Pago acredite el cobro (suele tardar unos minutos). No hace falta que pagues de nuevo.</div>
                  </>) : i.suscripcion_estado === 'pendiente' || i.suscripcion_estado === 'rechazada' ? (<>
                    <span className="mc-badge pendiente_pago">{i.suscripcion_estado === 'rechazada' ? '⚠️ Tarjeta rechazada' : '⏳ Suscripción sin completar'}</span>
                    <div className="mc-pendiente-txt">{i.suscripcion_estado === 'rechazada' ? 'El primer cobro fue rechazado y no se te cobró nada. Podés probar con otra tarjeta.' : 'Todavía no terminaste en Mercado Pago. Si te llegó a descontar dinero, Mercado Pago lo devuelve solo. Para completarla, usá tarjeta de crédito o débito (no dinero en cuenta).'}</div>
                    <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'10px'}} onClick={e => e.stopPropagation()}>
                      <button className="mc-btn-completar" style={{border:'none',cursor:'pointer',fontFamily:'inherit'}} disabled={accionando === i.id} onClick={() => irASuscripcion(i)}>
                        {accionando === i.id ? 'Preparando…' : i.suscripcion_estado === 'rechazada' ? 'Probar con otra tarjeta →' : 'Completar ahora →'}
                      </button>
                    </div>
                    {mensajes[i.id] && <div className="mc-sus alerta" onClick={e => e.stopPropagation()}>{mensajes[i.id]}</div>}
                  </>) : i.suscripcion_estado === 'con_problemas' ? (<>
                    <span className="mc-badge pendiente_pago">⚠️ Cuota sin cobrar</span>
                    <div className="mc-pendiente-txt">Mercado Pago no pudo cobrar tu cuota y sigue intentando. Actualizá tu tarjeta en Mercado Pago (Tu perfil → Suscripciones): cuando se cobre, el acceso vuelve solo.</div>
                  </>) : i.estado !== 'activa' ? (<>
                    <span className="mc-badge pendiente_pago">⏳ Pago pendiente</span>
                    <div className="mc-pendiente-txt">
                      Si ya transferiste, {i.terapeuta?.nombre_profesional || 'tu terapeuta'} lo confirma en breve. Si no llegaste a pagar, podés completarlo ahora.
                    </div>
                    <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'10px'}}>
                      {i.terapeuta?.slug && i.course.slug && (
                        <a className="mc-btn-completar" href={`/p/${i.terapeuta.slug}/cursos/${i.course.slug}/checkout`}
                          onClick={e => e.stopPropagation()}>
                          Completar pago →
                        </a>
                      )}
                      {i.terapeuta?.whatsapp && (
                        <a href={`https://wa.me/${i.terapeuta.whatsapp.replace(/\D/g,'').replace(/^0+/,'')}?text=${encodeURIComponent(`Hola! Te paso el comprobante de mi inscripción a "${i.course.titulo}".`)}`}
                          target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{display:'inline-flex',alignItems:'center',gap:'6px',fontSize:'11px',fontWeight:700,padding:'7px 12px',borderRadius:'8px',background:'#25D366',color:'white',textDecoration:'none'}}>
                          💬 Enviar comprobante
                        </a>
                      )}
                    </div>
                  </>) : (<>
                    <span className="mc-badge pendiente_pago">⚠️ Acceso vencido</span>
                    {i.modalidad === 'suscripcion' && i.course.cobro_automatico && i.terapeuta?.mp_activo && (
                      <div style={{marginTop:'10px'}} onClick={e => e.stopPropagation()}>
                        <button className="mc-btn-completar" style={{border:'none',cursor:'pointer',fontFamily:'inherit'}} disabled={accionando === i.id} onClick={() => irASuscripcion(i)}>
                          {accionando === i.id ? 'Preparando…' : '🔁 Suscribirme de nuevo'}
                        </button>
                        {mensajes[i.id] && <div className="mc-sus alerta">{mensajes[i.id]}</div>}
                      </div>
                    )}
                    <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'10px'}}>
                      {(i.terapeuta?.alias_pago || i.terapeuta?.cbu) && (
                        <button className="mc-btn-datos"
                          onClick={e => { e.stopPropagation(); setDatosAbiertos(datosAbiertos === i.id ? null : i.id) }}>
                          🏦 Ver datos de pago
                        </button>
                      )}
                      {i.terapeuta?.whatsapp && (
                        <a href={`https://wa.me/${i.terapeuta.whatsapp.replace(/\D/g,'').replace(/^0+/,'')}?text=${encodeURIComponent(`Hola! Te paso el comprobante del próximo mes de "${i.course.titulo}" para que me renueves el acceso.`)}`}
                          target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{display:'inline-flex',alignItems:'center',gap:'6px',fontSize:'11px',fontWeight:700,padding:'7px 12px',borderRadius:'8px',background:'#25D366',color:'white',textDecoration:'none'}}>
                          💬 Enviar comprobante
                        </a>
                      )}
                    </div>
                    {datosAbiertos === i.id && (
                      <div className="mc-datos-pago" onClick={e => e.stopPropagation()}>
                        {i.terapeuta?.alias_pago && <div className="mc-datos-row"><span>Alias</span><strong>{i.terapeuta.alias_pago}</strong></div>}
                        {i.terapeuta?.cbu && <div className="mc-datos-row"><span>CBU</span><strong>{i.terapeuta.cbu}</strong></div>}
                        {i.terapeuta?.titular_cuenta && <div className="mc-datos-row"><span>Titular</span><strong>{i.terapeuta.titular_cuenta}</strong></div>}
                        {i.terapeuta?.banco && <div className="mc-datos-row"><span>Banco</span><strong>{i.terapeuta.banco}</strong></div>}
                      </div>
                    )}
                    {(apuntesPorCurso[i.course.id] || 0) > 0 && (
                      <div className="mc-sus" style={{background:'#FFFBEB',color:'#8A6D1F'}} onClick={e => e.stopPropagation()}>
                        📓 Tu cuaderno sigue disponible
                        <button className="mc-link" onClick={() => router.push(`/mi-cuenta/cursos/${i.course.id}/cuaderno`)}>Ver mis apuntes</button>
                      </div>
                    )}
                    {terminado && (
                      <button className="mc-extra" onClick={e => { e.stopPropagation(); abrirCompartir(i) }}>
                        ✦ {certificados[i.id] ? 'Compartir mi certificado' : 'Compartir mi logro'}
                      </button>
                    )}
                  </>)}
                </div>
              </div>
              )
            })}
          </div>
        )}
      </div>
      {novedades && <NovedadesAula onCerrar={cerrarNovedades}/>}
      {compartir && <CompartirLogro datos={compartir} onCerrar={() => setCompartir(null)}/>}
    </div>
  )
}