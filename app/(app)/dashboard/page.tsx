'use client'

import { toast } from '@/components/ToastProvider'
import { calcularAcceso, pareceDesactualizado, estadoPlan, type TipoEstado } from '@/lib/acceso'
import { verificarPlanEnVivo } from '@/lib/verificarPlan'
import { cartelPlan } from '@/lib/textoPlan'
import BloqueoPlan from '@/components/BloqueoPlan'
import { PASOS, calcularPasos, contarListos, primerIncompleto, type IdPaso } from '@/lib/progresoPagina'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft, ChevronRight, ChevronDown, Expand, Check, Search, X,
  Mic, Pencil, Trash2, Plus, Info, Eye, Link as LinkIcon, Package, MoreHorizontal, MessageCircle, User as UserIcon
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useArchivosFirmados } from '@/lib/archivosPrivados'
import VideoBienvenida from '@/components/VideoBienvenida'
import TarjetaAltarInicio from '@/components/altar/TarjetaAltarInicio'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS_SEMANA = ['dom','lun','mar','mié','jue','vie','sáb']

type Pago = 'pendiente' | 'señado' | 'pagado'
type SesionHistorial = { fecha: string; servicio: string; contexto: string }
type Turno = {
  id: string; pacienteId: string; pacienteNombre: string; pacienteDbId?: string
  fecha: string; hora: string; duracion: number
  servicio: string; precio: number; contexto: string
  pago: Pago; sena: number; metodo_pago?: string; realizado: boolean
  moneda?: string | null; precio_usd?: number | null
  cupon_codigo?: string | null; precio_original?: number | null
  historial?: SesionHistorial[]
  created_at?: string
origen?: string
  tipo?: string | null // 'entrega' o en vivo (de la sesión)
  reservaPagina?: boolean // vino de la página de reservas
  metodoRaw?: string | null // cómo pagó de verdad (sin suponer Mercado Pago)
}
type Paciente = { id: string; nombre: string; apellido: string; celular: string; alias: string }
type Servicio = { id: string; nombre: string; precio_base: number; duracion_estimada: number; tipo_servicio?: string; plazo_horas?: number }
type Task = { id: string; texto: string; completada: boolean }
type Disponibilidad = { dia_semana: number; activo: boolean; hora_inicio: string; hora_fin: string }
type Archivo = { id: string; nombre_archivo: string; tipo: string; url: string }

function sinTildes(str: string) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}
function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function horaAMin(hora: string) {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + (m || 0)
}

const PAGO_CONFIG = {
  pendiente: { label: '⚡ Pendiente', cls: 'tag-p' },
  señado:    { label: '💛 Señado',    cls: 'tag-d' },
  pagado:    { label: '✓ Pagado',     cls: 'tag-ok' },
}

export default function DashboardPage() {
  const hoy = new Date()
  const manana = new Date(); manana.setDate(hoy.getDate()+1)
  const pasado = new Date(); pasado.setDate(hoy.getDate()+2)

  const [mesIdx, setMesIdx] = useState(hoy.getMonth())
  const [mesOffset, setMesOffset] = useState(Math.max(0, hoy.getMonth()-2))
  const [diasPorMes, setDiasPorMes] = useState<Record<number,number>>({ [hoy.getMonth()]: hoy.getDate() })
  const [diaOffset, setDiaOffset] = useState(Math.max(0, hoy.getDate()-3))
  const [busqueda, setBusqueda] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [historialOpen, setHistorialOpen] = useState(false)
  const [editandoFecha, setEditandoFecha] = useState(false)
  const [borrarConfirm, setBorrarConfirm] = useState(false)
  const [nuevaFechaEditar, setNuevaFechaEditar] = useState('')
  const [nuevaHoraEditar, setNuevaHoraEditar] = useState('')
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<Turno | null>(null)
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [nuevaTask, setNuevaTask] = useState('')
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  // cartel de Inicio: una sola puerta a Página de reservas (misma regla de pasos que Ajustes)
  const [progresoPagina, setProgresoPagina] = useState<{ pasos: Record<IdPaso, boolean>; listos: number; slug: string; nuevo: boolean } | null>(null)
  const [cartelHoyOculto, setCartelHoyOculto] = useState(true)
  const [cartelListoOculto, setCartelListoOculto] = useState(true)
  const [linkCopiado, setLinkCopiado] = useState(false)
  // Inicio nuevo: listas resumidas o completas, menú del detalle y «Tu página» abierta o compacta
  const [verTodasEntregas, setVerTodasEntregas] = useState(false)
  const [verTodasTareas, setVerTodasTareas] = useState(false)
  const [menuDetalle, setMenuDetalle] = useState(false)
  const [paginaCompacta, setPaginaCompacta] = useState(false)
  const [paginaQuitada, setPaginaQuitada] = useState(false)
  useEffect(() => { try { setPaginaCompacta(localStorage.getItem('luma-inicio-pagina-compacta') === '1'); setPaginaQuitada(localStorage.getItem('luma-inicio-pagina-quitada') === '1') } catch {} }, [])
  function quitarPagina() {
    setPaginaQuitada(true)
    try { localStorage.setItem('luma-inicio-pagina-quitada', '1') } catch {}
    toast('Lo quitaste del Inicio. Tu página sigue en Ajustes → Página de reservas.')
  }
  function alternarPaginaCompacta() {
    setPaginaCompacta(v => { try { localStorage.setItem('luma-inicio-pagina-compacta', v ? '0' : '1') } catch {} return !v })
  }
  useEffect(() => {
    try {
      setCartelHoyOculto(localStorage.getItem('luma-cartel-pagina-hoy') === new Date().toDateString())
      setCartelListoOculto(localStorage.getItem('luma-cartel-pagina-listo') === '1')
    } catch { setCartelHoyOculto(false); setCartelListoOculto(false) }
  }, [])
  const [trialVencido, setTrialVencido] = useState(false)
  const [avisoRenovacion, setAvisoRenovacion] = useState<ReturnType<typeof cartelPlan>>(null)
  const [tipoPlan, setTipoPlan] = useState<TipoEstado | null>(null)
const [onboardingChecks, setOnboardingChecks] = useState({
  servicio: false,
  disponibilidad: false,
  pagina: false,
})
  const [nombreTerapeuta, setNombreTerapeuta] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [sugerencias, setSugerencias] = useState<Paciente[]>([])
  const [showSugerencias, setShowSugerencias] = useState(false)
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad[]>([])
  const [ingresosMes, setIngresosMes] = useState(0)
  const [pendientesMes, setPendientesMes] = useState(0)
  const [cursosMes, setCursosMes] = useState(0)

  // fecha puede venir como 'YYYY-MM-DD' o 'YYYY-MM-DDTHH:MM:SS': comparamos solo el día
  function esDelMesActual(fecha: string | null | undefined) {
    const f = (fecha || '').slice(0, 10)
    const prefijo = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-`
    return f.startsWith(prefijo)
  }
  const sugerenciasRef = useRef<HTMLDivElement>(null)
  const marcandoHecho = useRef<Set<string>>(new Set())
  const ultimoErrorSena = useRef(0)

  // Máximo de sesiones por día: un turno cargado a mano NUNCA se bloquea, solo avisamos.
  // Cuenta en la base (no en lo que se ve en pantalla), así sirve aunque estés mirando otro día.
  // Si algo falla (o la base no tiene la columna), no se muestra nada y todo sigue igual.
  async function contarDia(fecha: string, excluirId?: string): Promise<{ n: number; max: number } | null> {
    try {
      if (!fecha) return null
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      const { data: lim, error: errLim } = await supabase.from('therapist_profiles').select('max_sesiones_dia').eq('user_id', user.id).maybeSingle()
      const max = Math.floor(Number((lim as any)?.max_sesiones_dia) || 0)
      if (errLim || !(max > 0)) return null
      const { data: delDia, error } = await supabase.from('sessions').select('id, fecha, estado_sesion, tipo_servicio')
        .eq('user_id', user.id).gte('fecha', fecha + 'T00:00:00').lte('fecha', fecha + 'T23:59:59')
      if (error) return null
      const n = (delDia || []).filter((x: any) => x.id !== excluirId && String(x.fecha || '').slice(0, 10) === fecha
        && x.estado_sesion !== 'cancelada' && x.tipo_servicio !== 'entrega').length
      return { n, max }
    } catch { return null }
  }
  const textoSesiones = (n: number) => `${n} sesi${n === 1 ? 'ón' : 'ones'}`

  async function avisarSiPasaElMaximo(_supabase: any, _userId: string, fecha: string) {
    const r = await contarDia(fecha)
    if (r && r.n > r.max) setTimeout(() => toast(`Ese día ya tenés ${textoSesiones(r.n)} y tu máximo es ${r.max}. El turno quedó agendado igual.`, 'info'), 600)
  }

  const recognitionRef = useRef<any>(null)
  const [archivos, setArchivos] = useState<Archivo[]>([])
  const [subiendoArchivo, setSubiendoArchivo] = useState(false)
  const archivoInputRef = useRef<HTMLInputElement>(null)
  const [grabando, setGrabando] = useState(false)
  const [sessionNotes, setSessionNotes] = useState<{id:string;titulo:string;contenido:string;archivo_url:string|null;archivo_tipo:string|null;archivo_nombre:string|null;created_at:string}[]>([])
  const verArchivo = useArchivosFirmados(sessionNotes.map(n => n.archivo_url))
const [nuevaNota, setNuevaNota] = useState('')
const [nuevoTitulo, setNuevoTitulo] = useState('')
const [tabDetalle, setTabDetalle] = useState<'contexto'|'notas'>('contexto')
const [editandoNota, setEditandoNota] = useState<string|null>(null)
const [notaModalAbierta, setNotaModalAbierta] = useState<string|null>(null)
const [imagenExpandida, setImagenExpandida] = useState(false)
const [notaHover, setNotaHover] = useState<string|null>(null)
const [editTitulo, setEditTitulo] = useState('')
const [editContenido, setEditContenido] = useState('')
const [subiendoNotaArchivo, setSubiendoNotaArchivo] = useState(false)
const [archivoNota, setArchivoNota] = useState<File|null>(null)
const notaArchivoRef = useRef<HTMLInputElement>(null)
const [contextoLocal, setContextoLocal] = useState('')

  const diaSeleccionado = diasPorMes[mesIdx] ?? 1
  const diasDelMes = new Date(hoy.getFullYear(), mesIdx+1, 0).getDate()
  const fechaSeleccionada = `${hoy.getFullYear()}-${String(mesIdx+1).padStart(2,'0')}-${String(diaSeleccionado).padStart(2,'0')}`

  const [nuevoTurno, setNuevoTurno] = useState({
    pacienteNombre: '', pacienteCelular: '', pacienteDbId: '',
    fecha: fechaSeleccionada, hora: '',
    duracion: 60, servicio: '', servicioId: '', precio: 0,
    contexto: '', pago: 'pendiente' as Pago, sena: 0,
  })

  // aviso dentro de la ventana "Nuevo turno", antes de guardar, para la fecha elegida
  const [avisoDia, setAvisoDia] = useState('')
  const pedidoAviso = useRef(0)
  const esEntregaNuevo = servicios.find(s => s.id === nuevoTurno.servicioId)?.tipo_servicio === 'entrega'
  useEffect(() => {
    if (!modalOpen || esEntregaNuevo || !nuevoTurno.fecha) { setAvisoDia(''); return }
    const yo = ++pedidoAviso.current
    contarDia(nuevoTurno.fecha).then(r => {
      if (yo !== pedidoAviso.current) return // llegó tarde: ya eligió otra fecha
      setAvisoDia(r && r.n >= r.max
        ? `Ese día ya tenés ${textoSesiones(r.n)} y tu máximo es ${r.max}. Tu página no ofrece más horarios ese día, pero vos podés agendar igual.`
        : '')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen, nuevoTurno.fecha, esEntregaNuevo])
  
  useEffect(() => {
    if (modalOpen || historialOpen || editandoFecha || borrarConfirm || showOnboarding) {
      document.body.style.overflow = 'hidden'
      document.body.classList.add('modal-open')
    } else {
      document.body.style.overflow = ''
      document.body.classList.remove('modal-open')
    }
  return () => { document.body.style.overflow = '' }
}, [modalOpen, historialOpen, editandoFecha, borrarConfirm, showOnboarding])
  useEffect(() => {
    setNuevoTurno(prev => ({ ...prev, fecha: fechaSeleccionada }))
  }, [fechaSeleccionada])

  useEffect(() => {
    if (turnoSeleccionado) {
      setContextoLocal(turnoSeleccionado.contexto || '')
    }
  }, [turnoSeleccionado?.id])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('pago') === 'ok') {
      toast('✦ ¡Suscripción activada! Bienvenida a Luma.', 'success')
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [])

  useEffect(() => {
    async function cargarDatos() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !user.email) { 
          window.location.href = '/auth/login'
          return 
        }

        const mesInicio = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-01`
        const mesFin = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-31`

        const [{ data: sesiones }, { data: pacs }, { data: servs }, { data: prof }, { data: tsks }, { data: avail }] = await Promise.all([
          supabase.from('sessions').select('*, public_bookings(estado)').eq('user_id', user.id).neq('estado_sesion', 'cancelada').order('fecha', { ascending: true }),
          supabase.from('patients').select('*').eq('user_id', user.id),
          supabase.from('services').select('*').eq('user_id', user.id).eq('activo', true),
          supabase.from('therapist_profiles').select('nombre_profesional, pagina_activa, avatar_url, whatsapp, slug, tipo_pago, mp_activo, acepta_transferencia, alias_pago').eq('user_id', user.id).maybeSingle(),
          supabase.from('tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
          supabase.from('availability').select('*').eq('user_id', user.id),
        ])

        if (pacs) setPacientes(pacs)
          if (servs) {
            setServicios(servs)
            if (servs.length > 0) {
              setNuevoTurno(prev => ({ ...prev, servicio: servs[0].nombre, servicioId: servs[0].id, precio: servs[0].precio_base }))
            }
          }
        if (tsks) setTasks(tsks.map((t: any) => ({ id: t.id, texto: t.texto, completada: t.completada })))
        if (avail) setDisponibilidad(avail)
        if (prof?.nombre_profesional) setNombreTerapeuta(prof.nombre_profesional)
        else setNombreTerapeuta(user.email?.split('@')[0] || '')
        // progreso de Página de reservas para el cartel (si algo falla, el cartel no aparece y el Inicio sigue normal)
        try {
          const [{ data: credMP }, { data: pushs }] = await Promise.all([
            supabase.from('mp_credenciales').select('user_id').eq('user_id', user.id).maybeSingle(),
            supabase.from('push_subscriptions').select('user_id').eq('user_id', user.id).limit(1),
          ])
          const franjasActivas = (avail || []).filter((a: any) => a.activo).length
          const pasosP = calcularPasos({
            avatar_url: prof?.avatar_url, nombre_profesional: prof?.nombre_profesional, whatsapp: prof?.whatsapp,
            tipo_pago: prof?.tipo_pago || 'libre', mp_activo: prof?.mp_activo, tiene_token_mp: !!credMP,
            acepta_transferencia: prof?.acepta_transferencia, alias_pago: prof?.alias_pago,
            slug: prof?.slug, pagina_activa: prof?.pagina_activa,
            servicios_activos: servs?.length || 0, franjas_activas: franjasActivas,
            avisos_activos: (pushs?.length || 0) > 0,
          })
          setProgresoPagina({
            pasos: pasosP,
            listos: contarListos(pasosP),
            slug: prof?.slug || '',
            nuevo: !prof?.avatar_url && !(servs?.length) && franjasActivas === 0 && !prof?.pagina_activa,
          })
        } catch (e) { console.error('Error calculando el cartel de Inicio:', e) }
        const { data: sub } = await supabase
        .from('subscriptions')
        .select('status, trial_ends_at, current_period_ends_at, plan, mp_subscription_id')
        .eq('user_id', user.id)
        .maybeSingle()

      let nivelAcceso = calcularAcceso(sub)

      if (nivelAcceso === 'sin_acceso' && pareceDesactualizado(sub)) {
        const dataVerif = await verificarPlanEnVivo()
        if (dataVerif.vigente) nivelAcceso = dataVerif.plan === 'premium' ? 'premium' : 'basico'
      }

      setTipoPlan(estadoPlan(sub).tipo)
      if (nivelAcceso === 'sin_acceso') setTrialVencido(true)
      else setAvisoRenovacion(cartelPlan(estadoPlan(sub)))
        if (sesiones) {
          const cobrado = sesiones
            .filter((s: any) => s.estado_pago === 'pagado' && esDelMesActual(s.fecha))
            .reduce((acc: number, s: any) => acc + (s.precio || 0), 0)
          const pendiente = sesiones
            .filter((s: any) => s.estado_pago === 'pendiente' && esDelMesActual(s.fecha) && !(s.metodo_pago === 'mercadopago' && (s.public_bookings?.length || 0) > 0))
            .reduce((acc: number, s: any) => acc + (s.precio || 0), 0)
          setIngresosMes(cobrado)
          setPendientesMes(pendiente)
        }

        // pagos de cursos del mes (si la tabla no existe o falla, simplemente suma 0)
        try {
          const inicioMesISO = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString()
          const finMesISO = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1).toISOString()
          const { data: pagosC } = await supabase
            .from('course_payments').select('monto')
            .eq('terapeuta_id', user.id).gte('fecha', inicioMesISO).lt('fecha', finMesISO)
          if (pagosC) setCursosMes(pagosC.reduce((acc: number, p: any) => acc + (Number(p.monto) || 0), 0))
        } catch (e) { console.error('Error cargando pagos de cursos:', e) }

        if (sesiones && pacs) {
          const convertidos: Turno[] = sesiones.map((s: any) => {
            const pac = pacs.find((p: any) => p.id === s.patient_id)
            const historial = sesiones
              .filter((prev: any) => {
                if (prev.patient_id !== s.patient_id || prev.id === s.id) return false
                const fechaPrev = new Date(prev.fecha?.split('T')[0]+'T12:00:00')
                const fechaSesion = new Date(s.fecha?.split('T')[0]+'T12:00:00')
                return fechaPrev < fechaSesion
              })
              .sort((a: any, b: any) => new Date(b.fecha?.split('T')[0]+'T12:00:00').getTime() - new Date(a.fecha?.split('T')[0]+'T12:00:00').getTime())
              .map((prev: any) => ({
                fecha: new Date(prev.fecha?.split('T')[0]+'T12:00:00').toLocaleDateString('es-AR', { day:'numeric', month:'long' }),
                servicio: prev.servicio_nombre || '',
                contexto: prev.contexto_sesion || '',
              }))

            return {
              id: s.id,
              pacienteId: pac?.alias || pac?.celular?.slice(-4) || '',
              pacienteNombre: pac ? `${pac.nombre} ${pac.apellido}`.trim() : '',
              pacienteDbId: s.patient_id,
              fecha: s.fecha?.split('T')[0] || '',
              hora: s.hora || '',
              duracion: s.duracion || 60,
              servicio: s.servicio_nombre || '',
              precio: s.precio || 0,
              contexto: s.contexto_sesion || '',
              pago: (s.estado_pago as Pago) || 'pendiente',
              sena: s.sena || 0,
              realizado: s.realizado || false,
              historial,
              created_at: s.created_at || '',
              origen: s.public_bookings?.[0]?.estado === 'pendiente_pago' && s.estado_pago === 'pendiente' ? 'pagina_publica' : undefined,
metodo_pago: s.metodo_pago || 'mercadopago',
              moneda: s.moneda || null, precio_usd: s.precio_usd ?? null,
              cupon_codigo: s.cupon_codigo || null, precio_original: s.precio_original ?? null,
              tipo: s.tipo_servicio || null,
              reservaPagina: (s.public_bookings?.length || 0) > 0,
              metodoRaw: s.metodo_pago || null,
            }
          })
          setTurnos(convertidos)
        }
      } catch (err) {
        console.error('Error cargando datos:', err)
      } finally {
        setLoading(false)
      }
    }
    cargarDatos()
  }, [])

  const proximoEspacioLibre = useMemo(() => {
    const diaSemana = hoy.getDay()
    // horario cortado: un día puede tener varias franjas; se busca el primer lugar libre en orden
    const franjasHoy = disponibilidad.filter(d => d.dia_semana === diaSemana && d.activo).sort((a, b) => horaAMin(a.hora_inicio) - horaAMin(b.hora_inicio))
    if (franjasHoy.length === 0) return null
    const turnosHoyList = turnos.filter(t => t.fecha === formatDate(hoy)).sort((a, b) => horaAMin(a.hora) - horaAMin(b.hora))
    const durMin = servicios.length > 0 ? Math.round(servicios.reduce((a, s) => a + (s.duracion_estimada || 60), 0) / servicios.length) : 60
    for (const franja of franjasHoy) {
      const finDisp = horaAMin(franja.hora_fin)
      let cursor = horaAMin(franja.hora_inicio)
      for (const turno of turnosHoyList) {
        const ini = horaAMin(turno.hora)
        const fin = ini + turno.duracion
        if (cursor + durMin <= ini) break
        cursor = Math.max(cursor, fin)
      }
      if (cursor + durMin <= finDisp) {
        const h = Math.floor(cursor / 60)
        const m = cursor % 60
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
      }
    }
    return null
  }, [turnos, disponibilidad, servicios, hoy])

  function cambiarMes(nuevoMes: number) {
    setMesIdx(nuevoMes)
    const dia = nuevoMes === hoy.getMonth() ? hoy.getDate() : (diasPorMes[nuevoMes] ?? 1)
    setDiasPorMes(prev => ({ ...prev, [nuevoMes]: dia }))
    setDiaOffset(Math.max(0, dia - 3))
  }

  function cambiarDia(dia: number) {
    setDiasPorMes(prev => ({ ...prev, [mesIdx]: dia }))
  }

  const turnosFiltrados = useMemo(() => {
    if (!busqueda) return turnos.filter(t => t.fecha === fechaSeleccionada)
    const q = sinTildes(busqueda)
    const resultados = turnos.filter(t =>
      sinTildes(t.pacienteNombre).includes(q) ||
      t.pacienteId.includes(busqueda) ||
      sinTildes(t.servicio).includes(q) ||
      (t.contexto && sinTildes(t.contexto).includes(q))
    )
    const hoyMs = new Date().getTime()
    return resultados.sort((a, b) => {
      const diffA = Math.abs(new Date(a.fecha+'T12:00:00').getTime() - hoyMs)
      const diffB = Math.abs(new Date(b.fecha+'T12:00:00').getTime() - hoyMs)
      return diffA - diffB
    })
  }, [turnos, fechaSeleccionada, busqueda])

  const turnosHoy = turnos.filter(t => t.fecha === formatDate(hoy)).length
  const turnosManana = turnos.filter(t => t.fecha === formatDate(manana)).length
  const turnosPasado = turnos.filter(t => t.fecha === formatDate(pasado)).length

  function buscarSugerencias(valor: string) {
    if (!valor || valor.length < 2) { setSugerencias([]); setShowSugerencias(false); return }
    const q = sinTildes(valor)
    const found = pacientes.filter(p =>
      sinTildes(`${p.nombre} ${p.apellido}`).includes(q) ||
      (p.celular && p.celular.includes(valor)) ||
      (p.alias && p.alias.includes(valor))
    ).slice(0, 5)
    setSugerencias(found)
    setShowSugerencias(found.length > 0)
  }

  function seleccionarPaciente(p: Paciente) {
    setNuevoTurno(prev => ({
      ...prev,
      pacienteNombre: `${p.nombre} ${p.apellido}`.trim(),
      pacienteCelular: p.celular || '',
      pacienteDbId: p.id,
    }))
    setSugerencias([])
    setShowSugerencias(false)
  }

  async function toggleRealizado(id: string) {
    const turno = turnos.find(t => t.id === id)
    if (!turno || marcandoHecho.current.has(id)) return // evita el doble toque
    marcandoHecho.current.add(id)
    const nuevoValor = !turno.realizado
    const supabase = createClient()
    const { error } = await supabase.from('sessions').update({ realizado: nuevoValor }).eq('id', id)
    marcandoHecho.current.delete(id)
    if (error) { console.error('Error actualizando realizado:', error); toast('No se pudo actualizar la sesión. Revisá tu conexión e intentá de nuevo.', 'error'); return }
    setTurnos(prev => prev.map(t => t.id === id ? {...t, realizado: nuevoValor} : t))
    if (turnoSeleccionado?.id === id) setTurnoSeleccionado(prev => prev ? {...prev, realizado: nuevoValor} : prev)
    if (nuevoValor) toast('Sesión marcada como hecha')
  }

  async function updatePago(id: string, pago: Pago) {
    const supabase = createClient()
    const turno = turnos.find(t => t.id === id)
    const { error } = await supabase.from('sessions').update({ estado_pago: pago }).eq('id', id)
    if (!error) {
      setTurnos(prev => prev.map(t => t.id === id ? {...t, pago} : t))
      setTurnoSeleccionado(prev => prev?.id === id ? {...prev, pago} : prev)
      // solo mueve los totales si la sesión es de este mes, y contempla cualquier cambio de estado (también señado)
      if (turno && turno.pago !== pago && esDelMesActual(turno.fecha)) {
        const precio = turno.precio || 0
        if (turno.pago === 'pagado') setIngresosMes(prev => Math.max(0, prev - precio))
        if (turno.pago === 'pendiente') setPendientesMes(prev => Math.max(0, prev - precio))
        if (pago === 'pagado') setIngresosMes(prev => prev + precio)
        if (pago === 'pendiente') setPendientesMes(prev => prev + precio)
      }
      toast(pago === 'pagado' ? 'Marcado como pagado' : 'Estado de pago actualizado')
    } else {
      console.error('Error actualizando pago:', error)
      toast('No se pudo cambiar el estado de pago. Intentá de nuevo.', 'error')
    }
  }

  async function updateSena(id: string, sena: number) {
    const supabase = createClient()
    const { error } = await supabase.from('sessions').update({ sena }).eq('id', id)
    if (!error) {
      setTurnos(prev => prev.map(t => t.id === id ? {...t, sena} : t))
      setTurnoSeleccionado(prev => prev?.id === id ? {...prev, sena} : prev)
    } else {
      console.error('Error actualizando seña:', error)
      // se llama en cada tecla: avisa como mucho una vez cada 5 segundos
      if (Date.now() - ultimoErrorSena.current > 5000) { ultimoErrorSena.current = Date.now(); toast('No se pudo guardar la seña. Revisá tu conexión.', 'error') }
    }
  }

  async function updateContexto(id: string, contexto: string) {
    const supabase = createClient()
    const { error } = await supabase.from('sessions').update({ contexto_sesion: contexto }).eq('id', id)
    if (error) { console.error('Error guardando contexto:', error); toast('No se pudo guardar la nota de la sesión. Revisá tu conexión.', 'error') }
    setTurnos(prev => {
      const actualizado = prev.map(t => t.id === id ? {...t, contexto} : t)
      return actualizado.map(t => ({
        ...t,
        historial: actualizado
          .filter(prev => {
            if (prev.pacienteDbId !== t.pacienteDbId || prev.id === t.id) return false
            const fechaPrev = new Date(prev.fecha?.split('T')[0]+'T12:00:00')
            const fechaT = new Date(t.fecha?.split('T')[0]+'T12:00:00')
            return fechaPrev < fechaT
          })
          .sort((a, b) => new Date(b.fecha?.split('T')[0]+'T12:00:00').getTime() - new Date(a.fecha?.split('T')[0]+'T12:00:00').getTime())
          .map(prev => ({
            fecha: new Date(prev.fecha+'T12:00:00').toLocaleDateString('es-AR', { day:'numeric', month:'long' }),
            servicio: prev.servicio,
            contexto: prev.contexto,
          }))
      }))
    })
    setTurnoSeleccionado(prev => prev?.id === id ? {...prev, contexto} : prev)
  }

  function toggleGrabacion() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast('Para transcribir voz usá Safari en iPhone o Chrome en Android.', 'error')
      return
    }
    if (grabando) {
      recognitionRef.current?.stop()
      setGrabando(false)
      return
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'es-AR'
    recognition.continuous = true
    recognition.interimResults = false
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join(' ')
      if (turnoSeleccionado) {
        const contextoActual = turnoSeleccionado.contexto || ''
        updateContexto(turnoSeleccionado.id, contextoActual ? contextoActual + ' ' + transcript : transcript)
      }
    }
    recognition.onerror = () => { setGrabando(false) }
    recognition.onend = () => { setGrabando(false) }
    recognitionRef.current = recognition
    recognition.start()
    setGrabando(true)
  }
 
  async function cargarNotas(pacienteId: string) {
    const supabase = createClient()
    const { data } = await supabase.from('session_notes').select('*')
      .eq('patient_id', pacienteId).order('created_at', { ascending: false })
    if (data) setSessionNotes(data)
  }
  
  async function agregarNota() {
    if (!nuevaNota.trim() && !archivoNota) return
    if (!turnoSeleccionado?.pacienteDbId) return
    setSubiendoNotaArchivo(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
  
      let archivo_url = null, archivo_tipo = null, archivo_nombre = null
      if (archivoNota) {
        const ext = archivoNota.name.split('.').pop()
        const path = `${user.id}/${turnoSeleccionado.pacienteDbId}/notas/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('patient-files').upload(path, archivoNota)
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('patient-files').getPublicUrl(path)
          archivo_url = urlData.publicUrl
          archivo_tipo = archivoNota.type.startsWith('image') ? 'imagen' : archivoNota.type.includes('pdf') ? 'pdf' : 'archivo'
          archivo_nombre = archivoNota.name
        }
      }
  
      const { data } = await supabase.from('session_notes').insert({
        user_id: user.id,
        patient_id: turnoSeleccionado.pacienteDbId,
        session_id: turnoSeleccionado.id,
        titulo: nuevoTitulo.trim() || 'Sin título',
        contenido: nuevaNota.trim() || null,
        archivo_url, archivo_tipo, archivo_nombre,
      }).select().single()
  
      if (data) setSessionNotes(prev => [data, ...prev])
      setNuevaNota('')
      setNuevoTitulo('')
      setArchivoNota(null)
      if (notaArchivoRef.current) notaArchivoRef.current.value = ''
    } catch(err) { console.error(err) } finally { setSubiendoNotaArchivo(false) }
  }
  
  async function guardarEdicionNota(n: {id:string; archivo_url:string|null; archivo_tipo:string|null; archivo_nombre:string|null}) {
    setSubiendoNotaArchivo(true)
    try {
      const supabase = createClient()
      let archivo_url = n.archivo_url, archivo_tipo = n.archivo_tipo, archivo_nombre = n.archivo_nombre
      if (archivoNota) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const ext = archivoNota.name.split('.').pop()
          const path = `${user.id}/${turnoSeleccionado?.pacienteDbId}/notas/${Date.now()}.${ext}`
          const { error } = await supabase.storage.from('patient-files').upload(path, archivoNota)
          if (!error) {
            const { data: urlData } = supabase.storage.from('patient-files').getPublicUrl(path)
            archivo_url = urlData.publicUrl
            archivo_tipo = archivoNota.type.startsWith('image') ? 'imagen' : archivoNota.type.includes('pdf') ? 'pdf' : 'archivo'
            archivo_nombre = archivoNota.name
          }
        }
      }
      await supabase.from('session_notes').update({ titulo: editTitulo, contenido: editContenido, archivo_url, archivo_tipo, archivo_nombre }).eq('id', n.id)
      setSessionNotes(prev => prev.map(x => x.id === n.id ? {...x, titulo: editTitulo, contenido: editContenido, archivo_url, archivo_tipo, archivo_nombre} : x))
      setEditandoNota(null)
      setArchivoNota(null)
      if (notaArchivoRef.current) notaArchivoRef.current.value = ''
    } catch (err) {
      console.error(err)
    } finally {
      setSubiendoNotaArchivo(false)
    }
  }
  
  async function borrarNota(id: string) {
    if (!confirm('¿Eliminar esta ficha?')) return
    const supabase = createClient()
    await supabase.from('session_notes').delete().eq('id', id)
    setSessionNotes(prev => prev.filter(n => n.id !== id))
  }
  async function cargarArchivos(pacienteId: string) {
    const supabase = createClient()
    const { data } = await supabase.from('files').select('*').eq('patient_id', pacienteId).order('created_at', { ascending: false })
    if (data) setArchivos(data)
  }

  async function subirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !turnoSeleccionado?.pacienteDbId) return
    setSubiendoArchivo(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${turnoSeleccionado.pacienteDbId}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('patient-files').upload(path, file)
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('patient-files').getPublicUrl(path)
        const tipo = file.type.startsWith('image') ? 'imagen' : file.type.includes('pdf') ? 'pdf' : file.type.startsWith('audio') ? 'audio' : 'archivo'
        const { data } = await supabase.from('files').insert({
          user_id: user.id,
          patient_id: turnoSeleccionado.pacienteDbId,
          session_id: turnoSeleccionado.id,
          nombre_archivo: file.name,
          tipo,
          url: urlData.publicUrl,
        }).select().single()
        if (data) setArchivos(prev => [data, ...prev])
      }
    } catch(err) { console.error(err) } finally {
      setSubiendoArchivo(false)
      if (archivoInputRef.current) archivoInputRef.current.value = ''
    }
  }

  async function borrarArchivo(id: string) {
    const supabase = createClient()
    await supabase.from('files').delete().eq('id', id)
    setArchivos(prev => prev.filter(a => a.id !== id))
  }

  async function editarFechaHora(id: string, fecha: string, hora: string) {
    const turnoActual = turnos.find(t => t.id === id)
    if (!turnoActual) return
    const duracion = turnoActual.duracion || 60
    const horaInicioNuevo = horaAMin(hora)
    const horaFinNuevo = horaInicioNuevo + duracion
    const hayConflicto = turnos.some(t => {
      if (t.id === id || t.fecha !== fecha) return false
      const horaIni = horaAMin(t.hora)
      const horaFin = horaIni + t.duracion
      return horaInicioNuevo < horaFin && horaFinNuevo > horaIni
    })
    if (hayConflicto) { toast('Ya tenés un turno en ese horario.', 'error'); return }
    const supabase = createClient()
    const { error: errFecha } = await supabase.from('sessions').update({ fecha: fecha+'T'+hora+':00', hora }).eq('id', id)
    if (errFecha) { console.error('Error cambiando fecha:', errFecha); toast('No se pudo cambiar la fecha. Intentá de nuevo.', 'error'); return }
    toast('Turno reprogramado')
    // si lo pasó a OTRO día que ya está en su máximo: se reprograma igual, solo avisamos
    if (fecha !== turnoActual.fecha) {
      contarDia(fecha, id).then(r => {
        if (r && r.n + 1 > r.max) setTimeout(() => toast(`Ojo: ese día ahora tenés ${textoSesiones(r.n + 1)} y tu máximo es ${r.max}.`, 'info'), 600)
      })
    }
    setTurnos(prev => prev.map(t => t.id === id ? {...t, fecha, hora} : t))
    setTurnoSeleccionado(prev => prev?.id === id ? {...prev, fecha, hora} : prev)
    setEditandoFecha(false)
  }

  async function borrarTurno(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('sessions').delete().eq('id', id)
    if (error) { console.error('Error borrando turno:', error); toast('No se pudo eliminar el turno.', 'error'); return }
    setTurnos(prev => prev.filter(t => t.id !== id))
    setTurnoSeleccionado(null)
    setBorrarConfirm(false)
    toast('Turno eliminado')
  }

  async function agregarTask() {
    if (!nuevaTask.trim()) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('tasks').insert({ user_id: user.id, texto: nuevaTask.trim(), completada: false }).select().single()
    if (data) setTasks(prev => [...prev, { id: data.id, texto: data.texto, completada: data.completada }])
    setNuevaTask('')
  }

  async function toggleTask(id: string) {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    const supabase = createClient()
    await supabase.from('tasks').update({ completada: !task.completada }).eq('id', id)
    setTasks(prev => prev.map(t => t.id === id ? {...t, completada: !t.completada} : t))
  }

  async function borrarTask(id: string) {
    const supabase = createClient()
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  async function guardarTurno() {
    const esEntrega = servicios.find(s => s.nombre === nuevoTurno.servicio)?.tipo_servicio === 'entrega'
    if (!nuevoTurno.pacienteNombre) { toast('Completá el nombre del paciente', 'error'); return }
    if (!nuevoTurno.hora && !esEntrega) { toast('Completá la hora del turno', 'error'); return }
    const horaFinal = nuevoTurno.hora || '12:00'
    const horaInicioNuevo = horaAMin(horaFinal)
    const horaFinNuevo = horaInicioNuevo + nuevoTurno.duracion
    const hayConflicto = !esEntrega && turnos.some(t => {
      if (t.fecha !== nuevoTurno.fecha) return false
      const esEntregaExistente = servicios.find(s => s.nombre === t.servicio)?.tipo_servicio === 'entrega'
      if (esEntregaExistente) return false
      const horaInicioExistente = horaAMin(t.hora)
      const horaFinExistente = horaInicioExistente + t.duracion
      return horaInicioNuevo < horaFinExistente && horaFinNuevo > horaInicioExistente
    })
    if (hayConflicto) { toast('Ya tenés un turno en ese horario.', 'error'); return }
    if (guardando) return // evita guardar dos veces con un doble toque
    setGuardando(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setGuardando(false); toast('Tu sesión expiró. Volvé a iniciar sesión para agendar.', 'error'); return }

    let pacienteDbId = nuevoTurno.pacienteDbId
    let pacienteRecienCreada = false
    if (!pacienteDbId) {
      const partes = nuevoTurno.pacienteNombre.trim().split(' ')
      const { data: nuevoPac, error: errPac } = await supabase.from('patients').insert({
        user_id: user.id, nombre: partes[0], apellido: partes.slice(1).join(' '),
        celular: nuevoTurno.pacienteCelular,
        alias: nuevoTurno.pacienteCelular ? nuevoTurno.pacienteCelular.slice(-4) : '',
        contexto_general: '',
      }).select().single()
      if (errPac || !nuevoPac) {
        console.error('Error creando paciente:', errPac)
        setGuardando(false)
        toast('No se pudo guardar la paciente. Revisá tu conexión e intentá de nuevo.', 'error')
        return
      }
      pacienteDbId = nuevoPac.id
      pacienteRecienCreada = true
      setPacientes(prev => [...prev, nuevoPac])
      // si el turno falla, al reintentar se usa esta misma paciente (no se crea otra igual)
      setNuevoTurno(prev => ({ ...prev, pacienteDbId: nuevoPac.id }))
    }

    const { data: nuevaSesion, error } = await supabase.from('sessions').insert({
      user_id: user.id, patient_id: pacienteDbId,
      service_id: nuevoTurno.servicioId || null,
      fecha: nuevoTurno.fecha+'T'+horaFinal+':00',
      hora: horaFinal, duracion: nuevoTurno.duracion,
      contexto_sesion: nuevoTurno.contexto,
      servicio_nombre: nuevoTurno.servicio, precio: nuevoTurno.precio,
      sena: nuevoTurno.pago === 'señado' ? nuevoTurno.sena : 0,
      estado_pago: nuevoTurno.pago, estado: 'programada', realizado: false,
      tipo_servicio: servicios.find(s => s.id === nuevoTurno.servicioId)?.tipo_servicio || 'vivo',
    }).select().single()

    if (error || !nuevaSesion) {
      console.error('Error guardando turno:', error)
      setGuardando(false)
      const sinPermiso = error?.code === '42501' || /row-level security|permission/i.test(error?.message || '')
      toast(sinPermiso
        ? 'No se pudo guardar el turno. Si tu plan venció, renovalo desde Ajustes y volvé a intentar.'
        : `No se pudo guardar el turno. Revisá tu conexión e intentá de nuevo.${pacienteRecienCreada ? ' La paciente ya quedó guardada.' : ''}`, 'error')
      return
    }

    if (nuevoTurno.pago === 'pagado') setIngresosMes(prev => prev + nuevoTurno.precio)
    if (nuevoTurno.pago === 'pendiente') setPendientesMes(prev => prev + nuevoTurno.precio)

    const nuevo: Turno = {
      id: nuevaSesion.id,
      pacienteId: nuevoTurno.pacienteCelular ? nuevoTurno.pacienteCelular.slice(-4) : '----',
      pacienteNombre: nuevoTurno.pacienteNombre, pacienteDbId: pacienteDbId || '',
      fecha: nuevoTurno.fecha, hora: nuevoTurno.hora, duracion: nuevoTurno.duracion,
      servicio: nuevoTurno.servicio, precio: nuevoTurno.precio,
      contexto: nuevoTurno.contexto, pago: nuevoTurno.pago,
      sena: nuevoTurno.pago === 'señado' ? nuevoTurno.sena : 0,
      realizado: false,
      metodo_pago: 'mercadopago',
      tipo: servicios.find(s => s.id === nuevoTurno.servicioId)?.tipo_servicio || 'vivo',
      reservaPagina: false, metodoRaw: null,
      historial: turnos.filter(t => {
        if (t.pacienteDbId !== pacienteDbId || t.id === nuevaSesion.id) return false
        return new Date(t.fecha?.split('T')[0]+'T12:00:00') < new Date(nuevoTurno.fecha+'T12:00:00')
      }).sort((a, b) => new Date(b.fecha?.split('T')[0]+'T12:00:00').getTime() - new Date(a.fecha?.split('T')[0]+'T12:00:00').getTime())
      .map(t => ({ fecha: new Date(t.fecha+'T12:00:00').toLocaleDateString('es-AR', { day:'numeric', month:'long' }), servicio: t.servicio, contexto: t.contexto })),
    }
    setTurnos(prev => [...prev, nuevo])
    // en la compu se abre al costado; en el celu no tapamos la pantalla con el detalle
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1025px)').matches) setTurnoSeleccionado(nuevo)
    setModalOpen(false)
    setGuardando(false)
    toast('Turno agendado')
    avisarSiPasaElMaximo(supabase, user.id, nuevoTurno.fecha)
    setNuevoTurno({
      pacienteNombre: '', pacienteCelular: '', pacienteDbId: '',
      fecha: fechaSeleccionada, hora: '', duracion: 60,
      servicio: servicios[0]?.nombre || '', servicioId: servicios[0]?.id || '',
      precio: servicios[0]?.precio_base || 0, contexto: '', pago: 'pendiente', sena: 0,
    })
  }

  const resta = turnoSeleccionado ? turnoSeleccionado.precio - turnoSeleccionado.sena : 0
  const mesNombre = MESES[hoy.getMonth()]

  function saludoHora() {
    const hora = new Date().getHours()
    if (hora >= 6 && hora < 12) return 'Buenos días'
    if (hora >= 12 && hora < 19) return 'Buenas tardes'
    return 'Buenas noches'
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:'13px',color:'var(--text-muted)',background:'var(--bg)'}}>
      Cargando...
    </div>
  )

  // ── Inicio nuevo: ayudantes ──────────────────────────────────────────────
  function esEntrega(t: Turno) {
    if (t.tipo) return t.tipo === 'entrega'
    return (servicios.find(sv => sv.nombre === t.servicio) as any)?.tipo_servicio === 'entrega'
  }
  const entregasPendientes = turnos.filter(t => esEntrega(t) && !t.realizado)
  const plata = (t: Turno, n: number) => t.moneda === 'USD' ? `USD ${Number(n).toLocaleString('es-AR')}` : `$${Number(n).toLocaleString('es-AR')}`
  // una sola línea de color por turno: am = tenés que hacer algo, ve = listo, ro = algo salió mal, la = a coordinar
  function lineaPago(t: Turno): { texto: string; tono: 'am' | 've' | 'ro' | 'la' } {
    const monto = t.moneda === 'USD' ? (t.precio_usd ?? t.precio) : t.precio
    const desdePagina = t.origen === 'pagina_publica' && t.pago === 'pendiente'
    const pre = t.realizado ? (esEntrega(t) ? 'Entregada · ' : 'Hecha · ') : ''
    if (t.pago === 'pagado') {
      if (t.moneda === 'USD') return { texto: `${pre}Pagado en dólares · ${plata(t, monto)}`, tono: 've' }
      if (t.metodoRaw === 'transferencia') return { texto: `${pre}Pagado por transferencia · ${plata(t, monto)}`, tono: 've' }
      if (t.metodoRaw === 'mercadopago' && t.reservaPagina) return { texto: `${pre}Pagado con Mercado Pago · ${plata(t, monto)}`, tono: 've' }
      return { texto: `${pre}Pagado · ${plata(t, monto)}`, tono: 've' }
    }
    if (t.pago === 'señado') return { texto: `${pre}Señó ${plata(t, t.sena)} · faltan ${plata(t, Math.max(0, monto - t.sena))}`, tono: 'am' }
    if (desdePagina && t.metodo_pago === 'usd') return { texto: `${pre}Avisó que pagó ${plata(t, monto)}: revisá tu cuenta`, tono: 'am' }
    if (desdePagina && t.metodo_pago === 'transferencia') return { texto: `${pre}Avisó que transfirió ${plata(t, monto)}: revisá tu cuenta`, tono: 'am' }
    if (desdePagina && t.metodo_pago === 'libre') return { texto: `${pre}Reservó sin pagar: coordiná el pago`, tono: 'la' }
    if (desdePagina) return { texto: `${pre}El pago con Mercado Pago no se completó`, tono: 'ro' }
    return { texto: `${pre}Falta cobrar ${plata(t, monto)}`, tono: 'am' }
  }
  const COLOR_LINEA = { am: 'var(--l-am)', ve: 'var(--l-ve)', ro: 'var(--l-ro)', la: 'var(--l-la)' } as const
  function creadoEn(t: Turno) {
    const c = t.created_at || ''
    if (!c) return new Date()
    const d = new Date(c.includes('+') || c.includes('Z') ? c : c + '+00:00')
    return isNaN(d.getTime()) ? new Date() : d
  }
  const ahoraMs = Date.now()
  const entregasOrdenadas = entregasPendientes.map(t => {
    const s = servicios.find(sv => sv.nombre === t.servicio) as any
    const plazo = Number(s?.plazo_horas) || 48
    return { t, restanMs: creadoEn(t).getTime() + plazo * 3600000 - ahoraMs }
  }).sort((a, b) => a.restanMs - b.restanMs)
  function textoCuenta(ms: number): { n: string; txt: string; tono: 'am' | 've' | 'ro' } {
    const h = Math.abs(ms) / 3600000
    const n = h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : h >= 72 ? `${Math.floor(h / 24)} d` : `${Math.floor(h)} h`
    if (ms < 0) return { n: `−${n}`, txt: 'vencida', tono: 'ro' }
    return { n, txt: 'quedan', tono: h < 6 ? 'am' : 've' }
  }
  function pidioCuando(t: Turno) {
    const d = creadoEn(t)
    const dias = Math.round((new Date(formatDate(hoy) + 'T12:00:00').getTime() - new Date(formatDate(d) + 'T12:00:00').getTime()) / 86400000)
    return dias <= 0 ? 'la pidió hoy' : dias === 1 ? 'la pidió ayer' : `la pidió el ${d.toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' })}`
  }
  const vivosDelDia = turnos.filter(t => t.fecha === fechaSeleccionada && !esEntrega(t)).sort((a, b) => horaAMin(a.hora || '00:00') - horaAMin(b.hora || '00:00'))
  const listaTurnos = busqueda ? turnosFiltrados : vivosDelDia
  const tituloDia = fechaSeleccionada === formatDate(hoy) ? 'Turnos de hoy'
    : fechaSeleccionada === formatDate(manana) ? 'Turnos de mañana'
    : `Turnos del ${new Date(fechaSeleccionada + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric' })}`
  function abrirTurno(turno: Turno) {
    const t2 = turnos.find(t => t.id === turno.id) || turno
    setTurnoSeleccionado(t2)
    setMenuDetalle(false)
    if (t2.pacienteDbId) { cargarArchivos(t2.pacienteDbId); cargarNotas(t2.pacienteDbId) }
    setTabDetalle('contexto')
  }
  async function copiarLinkPagina() {
    if (!progresoPagina?.slug) return
    const url = `https://lumaapp.lat/p/${progresoPagina.slug}`
    try { await navigator.clipboard.writeText(url); toast('Link copiado. Pegalo en tu bio.') } catch { window.prompt('Copiá tu link:', url) }
    setLinkCopiado(true); setTimeout(() => setLinkCopiado(false), 2500)
  }

  const widgetFinanzas = (
    <div className="widget-card widget-ingresos" style={{background:'var(--w-ing-bg)',borderColor:'var(--w-ing-borde)'}}>
      <div className="widget-blob" style={{width:'70px',height:'70px',background:'var(--w-ing-blob)',top:'-15px',right:'-15px'}}/>
      <div className="widget-label" style={{color:'var(--w-ing-label)'}}>Ingresos · {mesNombre}</div>
      <div className="widget-title" style={{color:'var(--w-ing-title)'}}>${(ingresosMes + cursosMes).toLocaleString()}</div>
      <div className="widget-sub" style={{color:'var(--w-ing-label)'}}>cobrados · <span style={{color:'var(--vencido)',fontWeight:600}}>${pendientesMes.toLocaleString('es-AR')} por cobrar</span></div>
      <button className="widget-pill" style={{background:'var(--w-ing-pill)',color:'var(--w-ing-title)'}} onClick={() => window.location.href='/finances'}>Ver finanzas →</button>
    </div>
  )

  const widgetDisponibilidad = (
    <div className="widget-card widget-espacio" style={{background:'var(--w-dis-bg)',borderColor:'var(--w-dis-borde)'}}>
      <div className="widget-blob" style={{width:'60px',height:'60px',background:'var(--w-dis-blob)',top:'-12px',right:'-12px'}}/>
      <div className="widget-label" style={{color:'var(--w-dis-label)'}}>Disponibilidad hoy</div>
      {!disponibilidad.some(d => d.dia_semana === hoy.getDay() && d.activo) ? (<>
        <div className="widget-title" style={{color:'var(--w-dis-title)'}}>Día libre</div>
        <div className="widget-sub" style={{color:'var(--w-dis-label)'}}>No trabajás hoy</div>
      </>) : proximoEspacioLibre ? (<>
        <div className="widget-title" style={{color:'var(--w-dis-title)'}}>Tenés lugar</div>
        <div className="widget-sub" style={{color:'var(--w-dis-label)'}}>Próximo: <strong>{proximoEspacioLibre} hs</strong></div>
      </>) : (<>
        <div className="widget-title" style={{color:'var(--w-dis-title)'}}>Agenda completa</div>
        <div className="widget-sub" style={{color:'var(--w-dis-label)'}}>Sin espacios hoy</div>
      </>)}
    </div>
  )

  return (
    <>
      <style>{`
        
        *{box-sizing:border-box}
        .dw{display:grid;grid-template-columns:55% 43%;height:100vh;overflow:hidden;font-family:'Inter',sans-serif;background:var(--bg);padding:14px 16px 14px 14px;gap:14px}
        .dl{display:flex;flex-direction:column;gap:10px;overflow-y:auto;overflow-x:hidden;background:var(--bg-card);border-radius:22px;padding:18px;height:100%;box-shadow:0 4px 20px var(--shadow);border:0.5px solid var(--border-light)}
        .dr{display:flex;flex-direction:column;gap:10px;background:var(--bg-card);overflow-y:auto;border-radius:22px;padding:18px;height:100%;box-shadow:0 8px 32px var(--shadow);border:0.5px solid var(--border-light)}
        @media(max-width:768px){
  .dw{grid-template-columns:1fr;height:auto;min-height:100vh;overflow:visible;padding:10px 10px 80px;gap:10px}
  .dl{height:auto;min-height:unset;overflow:visible;border-radius:16px;flex-shrink:0}
  .dr{height:auto;min-height:unset;overflow:visible;border-radius:16px;flex-shrink:0}
  .tlist{overflow:visible;min-height:unset;flex:unset;max-height:unset}
  .mo-box{width:95vw !important;max-width:440px}
  .hist-box{width:95vw !important}
}
@media(min-width:769px) and (max-width:1024px){
  .dw{grid-template-columns:1fr;height:100vh;overflow:hidden;padding:12px 12px 12px;gap:12px}
  .dl{height:100%;overflow-y:auto;border-radius:18px;flex-shrink:0}
  .dr{height:auto;min-height:unset;overflow:visible;border-radius:18px;flex-shrink:0}
  .wc{padding:8px 12px !important}
  .wc-h{font-size:13px !important}
  .wc-s{font-size:11px !important}
  .si{padding:7px 32px 7px 11px !important;font-size:12px !important}
  .stats{gap:6px !important}
  .st{padding:7px 10px !important;border-radius:11px !important}
  .st-n{font-size:18px !important}
  .st-l{font-size:9px !important}
  .widget-card{padding:10px 12px !important;border-radius:14px !important}
  .widget-title{font-size:14px !important}
  .widget-label{font-size:9px !important}
  .widget-sub{font-size:10px !important}
  .widget-pill{font-size:9px !important;padding:2px 8px !important;margin-top:4px !important}
  .tlist{flex:1;overflow-y:auto;min-height:200px}
  .mo-box{width:90vw !important;max-width:480px}
  .hist-box{width:90vw !important}
  .ab{display:block !important;visibility:visible !important;opacity:1 !important}
}
        .cp-card{background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:14px 16px;flex-shrink:0;box-shadow:0 4px 16px var(--shadow)}
        .cp-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px}
        .cp-tit{font-size:14px;font-weight:800;color:var(--text-primary);font-family:'Manrope',sans-serif;line-height:1.35}
        .cp-x{background:none;border:none;font-size:11px;color:var(--text-muted);cursor:pointer;font-family:inherit;white-space:nowrap;padding:2px 0;text-decoration:underline}
        .cp-barra{height:7px;border-radius:7px;background:var(--bg-input);overflow:hidden;margin-bottom:10px}
        .cp-barra>div{height:100%;border-radius:7px;background:linear-gradient(90deg,var(--accent),var(--accent-soft))}
        .cp-acc{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
        .cp-sub{font-size:12px;color:var(--text-secondary)}
        .cp-dir{font-size:13px;color:var(--text-secondary);margin-bottom:10px;word-break:break-all}
        .cp-btn{display:inline-flex;align-items:center;justify-content:center;padding:9px 16px;border-radius:11px;font-size:12.5px;font-weight:700;border:none;cursor:pointer;font-family:inherit;background:linear-gradient(135deg,var(--accent),var(--accent-2));color:white;text-decoration:none}
        .cp-btn.sec{background:var(--accent-light);color:var(--accent)}
        .wc{background:var(--saludo-bg);border-radius:16px;padding:13px 16px;border:0.5px solid var(--border);flex-shrink:0;position:relative;overflow:hidden}
        .wc-blob{position:absolute;border-radius:50%;background:var(--accent);opacity:0.12;width:80px;height:80px;top:-20px;right:-20px;pointer-events:none}
        .wc-h{font-size:16px;font-weight:800;color:var(--saludo-text);font-family:'Manrope',sans-serif}
        .wc-s{font-size:12px;color:var(--text-secondary);margin-top:3px}
        .sr{position:relative;flex-shrink:0}
        .si{width:100%;padding:9px 32px 9px 12px;border-radius:11px;border:0.5px solid var(--border);font-size:13px;background:var(--bg-input);color:var(--text-primary);outline:none;font-family:inherit}
        .si:focus{border-color:var(--accent)}
        .sico{position:absolute;right:11px;top:50%;transform:translateY(-50%);color:var(--text-muted);pointer-events:none}
        .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;flex-shrink:0}
        .st{background:var(--bg-card);border-radius:14px;padding:10px 12px;border:0.5px solid var(--border-light);text-align:center;box-shadow:0 2px 10px var(--shadow)}
        .st.ac{background:var(--saludo-bg);border-color:var(--border)}
        .st-l{font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px}
        .st.ac .st-l{color:var(--text-secondary)}
        .st-n{font-size:22px;font-weight:800;color:var(--text-primary);font-family:'Manrope',sans-serif}
        .st.ac .st-n{color:var(--saludo-text)}
        .widget-card{border-radius:20px;padding:14px 16px;border:0.5px solid;position:relative;overflow:hidden;flex-shrink:0}
        /* etapa 6: los colores de estos dos cuadros (claro y oscuro) salen de las variables Blue Hour de globals.css */
        .widget-blob{position:absolute;border-radius:50%;pointer-events:none;opacity:0.3}
        .widget-label{font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:5px}
        .widget-title{font-size:18px;font-weight:800;font-family:'Manrope',sans-serif;line-height:1.1;margin-bottom:3px}
        .widget-sub{font-size:11px;line-height:1.5}
        .widget-pill{display:inline-block;font-size:10px;font-weight:600;padding:3px 10px;border-radius:20px;margin-top:8px;cursor:pointer;border:none;font-family:inherit}
        .cal-r{display:flex;align-items:center;gap:5px;flex-shrink:0}
        .ca{width:22px;height:22px;border-radius:6px;border:0.5px solid var(--border);background:var(--bg-card);color:var(--text-muted);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
        .mons{display:flex;flex:1;justify-content:space-around}
        .mo{font-size:11px;color:var(--text-muted);cursor:pointer;background:none;border:none;font-family:inherit;padding:2px}
        .mo.ac{font-size:12px;font-weight:700;color:var(--accent)}
        .days-r{display:flex;align-items:center;gap:5px;flex-shrink:0}
        .days{display:grid;grid-template-columns:repeat(6,1fr);gap:5px;flex:1}
        .day{height:42px;border-radius:12px;border:0.5px solid var(--border-light);background:var(--bg-card);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;cursor:pointer;transition:all 0.15s}
        .day:hover{transform:translateY(-1px)}
        .day.ac{background:linear-gradient(135deg,var(--accent),var(--accent-2));border-color:var(--accent);box-shadow:0 6px 16px rgba(var(--accent-rgb),0.35);transform:translateY(-1px)}
        .day.ht{border-color:var(--accent)}
        .dn{font-size:12px;font-weight:600;color:var(--text-secondary)}
        .day.ac .dn{color:white;font-weight:700}
        .day.ht .dn{color:var(--accent)}
        .dd{font-size:9px;color:var(--text-muted)}
        .day.ac .dd{color:rgba(255,255,255,0.75)}
        .tlist{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:7px;min-height:0;padding:2px 4px;margin:0 -4px}
        .tc{background:var(--bg-card);border-radius:14px;padding:10px 12px;border:none;display:flex;align-items:center;gap:9px;cursor:pointer;flex-shrink:0;transition:all 0.15s;box-shadow:0 2px 12px var(--shadow)}
        .tc:hover{transform:translateY(-1px)}
        .tc.sel{box-shadow:0 6px 20px var(--shadow);transform:translateY(-1px);border:0.5px solid var(--border)}
        .tc.done{opacity:0.35}
        .tdot{width:7px;height:7px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent-2));flex-shrink:0}
        .tb{flex:1;min-width:0}
        .tn{font-size:13px;font-weight:600;color:var(--text-primary);font-family:'Manrope',sans-serif}
        .ts2{font-size:11px;color:var(--text-muted);margin-top:1px}
        .ttags{display:flex;gap:3px;margin-top:4px;flex-wrap:wrap}
        .tg{font-size:10px;padding:2px 8px;border-radius:20px;border:0.5px solid}
        .tg-s{background:var(--accent-light);color:var(--accent);border-color:var(--border)}
        .tag-p{background:#FEF9C3;color:#854D0E;border-color:#FDE68A}
        .tag-ok{background:#DCFCE7;color:#166534;border-color:#BBF7D0}
        .tag-d{background:#DBEAFE;color:#1E40AF;border-color:#BFDBFE}
        .chk{height:30px;padding:0 11px;border-radius:16px;border:1px solid var(--border);background:var(--bg-card);color:var(--text-secondary);font-family:inherit;font-size:11px;font-weight:700;white-space:nowrap;display:flex;align-items:center;justify-content:center;gap:4px;cursor:pointer;flex-shrink:0;transition:background-color .2s,border-color .2s,color .2s,scale .12s}
        .chk:hover{border-color:var(--accent);color:var(--accent)}
        .chk.ok{background:#DCFCE7;border-color:#BBF7D0;color:#166534}
        .chk.ok svg{animation:chkPop .3s ease}
        @keyframes chkPop{0%{transform:scale(.4)}70%{transform:scale(1.25)}100%{transform:scale(1)}}
        @media (prefers-reduced-motion:reduce){.chk.ok svg{animation:none}}
        .ab{position:relative;overflow:hidden;isolation:isolate;background:transparent;border:none;border-radius:14px;padding:10px;text-align:center;font-size:12px;font-weight:600;color:var(--text-muted);cursor:pointer;width:100%;font-family:inherit;flex-shrink:0;transition:transform 0.15s,box-shadow 0.15s,color 0.15s;margin-top:2px}
        .ab::before{content:'';position:absolute;z-index:-2;left:50%;top:50%;width:300%;aspect-ratio:1;transform:translate(-50%,-50%);background:conic-gradient(from 0deg,var(--border) 0deg,var(--border) 250deg,rgba(var(--accent-rgb),0.25) 295deg,var(--accent-2) 335deg,var(--border) 360deg);animation:abGira 4s linear infinite}
        .ab::after{content:'';position:absolute;z-index:-1;inset:1.5px;border-radius:12.5px;background:var(--bg-card)}
        .ab:hover{color:var(--accent);transform:translateY(-1px);box-shadow:0 4px 14px rgba(var(--accent-rgb),0.18)}
        @keyframes abGira{to{transform:translate(-50%,-50%) rotate(360deg)}}
        @media (prefers-reduced-motion:reduce){.ab::before{animation:none}}
        .tasks-card{background:#FFFBEB;border-radius:20px;padding:14px 16px;border:0.5px solid #FDE68A;position:relative;overflow:hidden;flex-shrink:0}
        html.dark .tasks-card{background:#1A1200;border-color:#3D2E00}
        .tasks-blob{position:absolute;border-radius:50%;background:#F59E0B;opacity:0.2;pointer-events:none}
        .tasks-label{font-size:9px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#B45309;margin-bottom:8px}
        html.dark .tasks-label{color:#FCD34D}
        .task-item{display:flex;align-items:center;gap:8px;margin-bottom:7px}
        .task-cb{width:16px;height:16px;border-radius:5px;border:1.5px solid #FDE68A;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all 0.15s;background:transparent}
        .task-cb.done{background:var(--accent);border-color:var(--accent);color:white}
        .task-txt{font-size:12px;color:#92400E;flex:1;font-family:'Inter',sans-serif}
        html.dark .task-txt{color:#FCD34D}
        .task-txt.done{text-decoration:line-through;opacity:0.5}
        .task-del{width:16px;height:16px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#FCA5A5;opacity:0;transition:opacity 0.15s;border:none;background:transparent;padding:0}
        .task-item:hover .task-del{opacity:1}
        .task-input-row{display:flex;gap:6px;margin-top:8px}
        .task-input{flex:1;padding:6px 10px;border-radius:8px;border:0.5px solid #FDE68A;font-size:12px;background:rgba(255,255,255,0.7);color:#92400E;outline:none;font-family:inherit}
        html.dark .task-input{background:rgba(255,255,255,0.05);color:#FCD34D;border-color:#3D2E00}
        .task-add-btn{padding:6px 10px;border-radius:8px;border:none;background:#F59E0B;color:white;font-size:12px;cursor:pointer;font-family:inherit;font-weight:600}
        .re{flex:1;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:12px;text-align:center;line-height:2}
        .rt{display:flex;justify-content:space-between;align-items:flex-start;flex-shrink:0}
        .rid{font-size:24px;font-weight:800;color:var(--text-primary);letter-spacing:-1px;line-height:1;font-family:'Manrope',sans-serif}
        .rdt{font-size:10px;color:var(--text-muted);margin-top:3px}
        .r-actions{display:flex;gap:5px}
        .rex{width:26px;height:26px;border-radius:8px;border:0.5px solid var(--border);background:var(--bg-input);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-muted);transition:all 0.15s}
        .rex:hover{border-color:var(--accent);color:var(--accent)}
        .rex.danger{color:#EF4444;border-color:#FECACA}
        .rex.danger:hover{background:#FEF2F2;border-color:#EF4444}
        .rname{font-size:15px;font-weight:700;color:var(--text-primary);flex-shrink:0;font-family:'Manrope',sans-serif}
        .rbadges{display:flex;gap:5px;flex-wrap:wrap;align-items:center;flex-shrink:0}
        .rb{font-size:11px;padding:4px 10px;border-radius:20px;border:0.5px solid}
        .rb-s{background:var(--accent-light);color:var(--accent);border-color:var(--border)}
        .pago-dd{font-size:11px;padding:4px 10px;border-radius:20px;border:0.5px solid #FDE68A;background:#FEF9C3;color:#854D0E;cursor:pointer;outline:none;font-family:inherit;appearance:none;-webkit-appearance:none;transition:all 0.15s}
        .pago-dd.ok{background:#DCFCE7;color:#166534;border-color:#BBF7D0}
        .pago-dd.dep{background:#DBEAFE;color:#1E40AF;border-color:#BFDBFE}
        .sena-row{background:#FFFBEB;border-radius:10px;padding:8px 12px;border:0.5px solid #FDE68A;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
        .sena-l{font-size:11px;color:#854D0E}
        .sena-r{font-size:11px;font-weight:700;color:#92400E}
        .sena-input{font-size:12px;padding:3px 8px;border-radius:7px;border:0.5px solid #FDE68A;background:white;color:#92400E;width:80px;outline:none;font-family:inherit}
        .ctxl{font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;flex-shrink:0}
        .editor{border:0.5px solid var(--border);border-radius:14px;overflow:hidden;flex-shrink:0}
        .etb{display:flex;gap:3px;padding:6px 7px;border-bottom:0.5px solid var(--border-light);background:var(--bg-input);flex-wrap:wrap}
        .ebico{width:24px;height:24px;border-radius:6px;border:0.5px solid var(--border);background:var(--bg-card);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-secondary)}
        .ebico:hover{background:var(--accent-hover);color:var(--accent)}
        .ea{width:100%;padding:8px 11px;font-size:12px;color:var(--text-primary);resize:none;height:75px;font-family:inherit;background:transparent;outline:none;line-height:1.6;border:none}
        .rdiv{border:none;border-top:0.5px solid var(--border-light);flex-shrink:0}
        .hl{font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;flex-shrink:0}
        .hi{background:var(--bg-input);border-radius:12px;padding:10px 12px;border:0.5px solid var(--border-light);flex-shrink:0}
        .ht2{display:flex;gap:5px;font-size:10px;color:var(--text-muted);margin-bottom:3px}
        .htxt{font-size:12px;color:var(--text-secondary);line-height:1.5}
        .ver-mas{text-align:center;font-size:11px;color:var(--accent);cursor:pointer;padding:4px;flex-shrink:0}
        .ver-mas:hover{text-decoration:underline}
       .mo-overlay{position:fixed;inset:0;background:rgba(var(--ink-rgb),0.5);display:flex;align-items:center;justify-content:center;z-index:100;backdrop-filter:blur(4px);overflow:hidden}
       .ficha-modal-overlay{position:fixed;inset:0;background:rgba(var(--ink-rgb),0.6);display:flex;align-items:center;justify-content:center;z-index:500;backdrop-filter:blur(6px);padding:20px}
.ficha-modal-box{background:var(--bg-card);border-radius:20px;width:min(900px,92vw);height:75vh;overflow-y:auto;box-shadow:0 32px 80px rgba(0,0,0,0.4);position:relative}
.ficha-modal-img{width:100%;height:220px;object-fit:cover;display:block}
.ficha-modal-body{padding:20px 24px 28px}
.ficha-modal-close{position:absolute;top:14px;right:14px;width:32px;height:32px;border-radius:10px;background:rgba(0,0,0,0.45);border:none;color:white;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:2}
@media(max-width:768px){.ficha-modal-box{width:94vw;height:82vh}}
        .mo-box{background:var(--bg-card);border-radius:22px;padding:24px;width:440px;max-height:88vh;overflow-y:auto;box-shadow:0 32px 80px rgba(var(--shadow-rgb),0.25)}
        .mo-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
        .mo-title{font-size:15px;font-weight:700;color:var(--text-primary);font-family:'Manrope',sans-serif}
        .mo-close{width:28px;height:28px;border-radius:8px;border:0.5px solid var(--border);background:var(--bg-card);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-muted)}
        .field{display:flex;flex-direction:column;gap:5px;margin-bottom:13px;position:relative}
        .field label{font-size:12px;font-weight:600;color:var(--text-primary)}
        .field input,.field select,.field textarea{padding:9px 11px;border-radius:10px;border:0.5px solid var(--border);font-size:13px;font-family:inherit;color:var(--text-primary);background:var(--bg-input);outline:none;width:100%}
        .field input:focus,.field select:focus,.field textarea:focus{border-color:var(--accent)}
        .field textarea{min-height:65px;resize:none}
        .field-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .save-btn{width:100%;padding:11px;background:linear-gradient(135deg,var(--accent),var(--accent-2));color:white;border:none;border-radius:11px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 4px 14px rgba(var(--accent-rgb),0.35);transition:all 0.15s}
        .save-btn:hover{box-shadow:0 6px 20px rgba(var(--accent-rgb),0.45);transform:translateY(-1px)}
        .save-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none}
        .sug-list{position:absolute;top:100%;left:0;right:0;background:var(--bg-card);border:0.5px solid var(--border);border-radius:10px;box-shadow:0 8px 24px var(--shadow);z-index:50;overflow:hidden;margin-top:3px}
        .sug-item{padding:9px 12px;font-size:12px;color:var(--text-primary);cursor:pointer;display:flex;flex-direction:column;gap:2px;border-bottom:0.5px solid var(--border-light)}
        .sug-item:last-child{border-bottom:none}
        .sug-item:hover{background:var(--accent-hover)}
        .sug-item-sub{font-size:10px;color:var(--text-muted)}
        .hist-box{background:var(--bg-card);border-radius:22px;padding:24px;width:600px;max-height:85vh;overflow-y:auto;box-shadow:0 32px 80px rgba(var(--shadow-rgb),0.25)}
        .hist-sessions{display:flex;flex-direction:column;gap:10px;margin-top:12px}
        .hist-sc{background:var(--bg-input);border-radius:14px;padding:14px;border:0.5px solid var(--border)}
        .hist-sc.current{border-color:var(--accent);background:var(--bg-card)}
        .hist-sc-top{display:flex;justify-content:space-between;margin-bottom:7px}
        .hist-sc-date{font-size:12px;font-weight:600;color:var(--accent)}
        .hist-sc-serv{font-size:11px;color:var(--text-muted)}
        .hist-sc-ctx{font-size:12px;color:var(--text-primary);line-height:1.6}
        /* ══ INICIO NUEVO (rediseño 28/10): la página crece, sin scroll adentro; el detalle va al costado o a pantalla completa ══ */
        .in-wrap{--l-am:#8A5A0B;--l-ve:#3E7D57;--l-ro:#A24B47;--l-la:#625A92;--t-bg:#F7ECD3;--t-borde:#E9D6A6;--t-label:#8A6A22;--t-texto:#5A4416;
          display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:16px;padding:16px;align-items:start;font-family:'Inter',sans-serif;background:var(--bg);min-height:100vh;color:var(--text-primary)}
        html.dark .in-wrap{--l-am:#E8C77A;--l-ve:#8FC9A0;--l-ro:#F09A92;--l-la:#C9C0D9;--t-bg:#2A2518;--t-borde:#4A3F24;--t-label:#E8C77A;--t-texto:#F0E6D8}
        .in-main{display:flex;flex-direction:column;gap:14px;min-width:0}
        .in-aviso{border-radius:14px;padding:11px 16px;margin:12px 16px 0;font-size:13px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;line-height:1.5;background:var(--t-bg);border:1px solid var(--t-borde);color:var(--t-texto)}
        .in-aviso[data-tono="urgente"]{background:var(--pink-light);border-color:var(--rosa-viejo);color:var(--l-ro)}
        .in-aviso-btn{padding:8px 13px;border-radius:10px;background:var(--text-primary);color:var(--bg-card);font-weight:700;text-decoration:none;font-size:12.5px}
        .in-x{background:transparent;border:none;cursor:pointer;color:inherit;display:flex;padding:4px}
        .in-head{background:var(--menu-oscuro);color:#F0E6D8;border-radius:20px;padding:12px 16px;display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:'saludo btns' 'busca busca';gap:8px 12px;align-items:center}
        .in-saludo{grid-area:saludo;min-width:0}.in-busca{grid-area:busca}.in-head-btns{grid-area:btns}
        .in-saludo h1{margin:0;font:800 17px 'Manrope',sans-serif;line-height:1.2}
        .in-fecha{font-size:11px;color:#C9C0D9;margin-top:1px}
        .in-fecha::first-letter{text-transform:uppercase}
        .in-busca{display:flex;align-items:center;gap:8px;height:30px;padding:0 8px 0 10px;border-radius:10px;background:rgba(240,230,216,.1);border:1px solid rgba(240,230,216,.2);color:#C9C0D9;min-width:0}
        .in-busca input{flex:1;min-width:0;border:none;background:transparent;color:#F0E6D8;font:500 11px 'Inter',sans-serif;outline:none}
        .in-busca svg{width:13px;height:13px;flex-shrink:0}
        /* en el celu: se ve en 11px pero por dentro es de 16px, así el iPhone no hace zoom al tocar el buscador */
        @media(max-width:768px){.in-busca input{font-size:16px !important;width:145.5%;flex:none;transform:scale(.6875);transform-origin:left center;margin-right:-45.5%}}
        .in-busca input::placeholder{color:#B9B3C6}
        .in-busca-x{border:none;background:rgba(240,230,216,.15);color:#F0E6D8;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer}
        .in-head-btns{display:flex;gap:8px}
        .in-head-btn{height:25px;padding:0 10px;border-radius:8px;background:rgba(240,230,216,.1);border:1px solid rgba(240,230,216,.2);color:#F0E6D8;display:inline-flex;align-items:center;justify-content:center;gap:5px;font:600 11px 'Inter',sans-serif;text-decoration:none;cursor:pointer;white-space:nowrap;transition:transform .15s,background .2s}
        .in-head-btn svg{width:12px;height:12px}
        .in-head-btn:hover{background:rgba(240,230,216,.18)}
        .in-head-btn:active,.in-agendar:active,.in-btn:active,.in-entregada:active,.in-chk:active,.in-det-hecha:active,.in-seg button:active{transform:scale(.97)}
        .in-widgets{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1.3fr) minmax(0,1.4fr);gap:10px}
        .in-widgets .widget-card{border-radius:18px;padding:12px 14px;border-width:1px}
        .in-widgets .widget-title{font-size:19px}
        .in-cuenta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
        .in-cont{background:var(--bg-card);border:1px solid var(--border);border-radius:18px;padding:10px 12px;display:flex;flex-direction:column;justify-content:space-between;gap:4px}
        .in-cont.ac{background:var(--saludo-bg);border-color:transparent}
        .in-cont-t{font:700 15px 'Fraunces',serif;color:var(--text-secondary)}
        .in-cont.ac .in-cont-t{color:var(--saludo-text)}
        .in-cont-n{font:800 30px/1 'Fraunces',serif;color:var(--text-primary)}
        .in-cols{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:14px;align-items:start}
        .in-col-der{display:flex;flex-direction:column;gap:12px;min-width:0}
        .in-card{background:var(--bg-card);border:1px solid var(--border);border-radius:22px;padding:16px 14px;display:flex;flex-direction:column;gap:4px;min-width:0}
        .in-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px}
        .in-card-top h2{margin:0;font:800 18px 'Manrope',sans-serif}
        .in-meta{font-size:12px;color:var(--text-secondary);margin-top:2px}
        .in-mes{display:flex;align-items:center;gap:6px;margin-bottom:6px}
        .in-mes-txt{font:700 13px 'Manrope',sans-serif;min-width:84px;text-align:center}
        .in-volver-hoy{margin-left:auto;border:none;background:var(--accent-light);color:var(--text-primary);font:600 12px 'Inter',sans-serif;padding:6px 11px;border-radius:14px;cursor:pointer}
        .in-flecha{width:30px;height:30px;border-radius:10px;border:1px solid var(--border);background:var(--bg-input);color:var(--text-secondary);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
        .in-flecha:disabled{opacity:.35;cursor:default}
        .in-dias{display:flex;align-items:center;gap:5px;margin-bottom:12px}
        .in-dias-fila{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:5px;flex:1;min-width:0}
        .in-dia{position:relative;height:50px;border-radius:13px;border:1px solid var(--border);background:var(--bg-input);color:var(--text-secondary);display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;font-family:inherit;transition:background .2s,color .2s,transform .15s}
        .in-dia.ac{background:var(--text-primary);border-color:var(--text-primary);color:var(--bg-card)}
        .in-dia.ht{border-color:var(--accent-soft)}
        .in-dia-n{font:700 14px 'Inter',sans-serif}
        .in-dia-s{font-size:9.5px}
        .in-dia-punto{position:absolute;bottom:4px;width:4px;height:4px;border-radius:50%;background:currentColor;opacity:.6}
        .in-linea{display:flex;flex-direction:column}
        .in-fila{display:flex;gap:10px;animation:inEntra .25s ease both}
        @keyframes inEntra{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
        .in-fila.hecha .in-turno{opacity:.6}
        .in-hora{width:46px;text-align:right;padding-top:12px;flex-shrink:0}
        .in-hora-f{font-size:10px;font-weight:700;color:var(--accent-deep);text-transform:capitalize}
        .in-hora-h{font:700 14.5px 'Manrope',sans-serif;display:flex;justify-content:flex-end}
        .in-hora-d{font-size:10.5px;color:var(--text-secondary)}
        .in-eje{width:10px;display:flex;flex-direction:column;align-items:center;flex-shrink:0}
        .in-punto{width:10px;height:10px;border-radius:50%;margin-top:18px;flex-shrink:0}
        .in-raya{flex:1;width:2px;background:var(--border);margin-top:4px}
        .in-fila:last-child .in-raya{background:transparent}
        .in-turno{flex:1;min-width:0;margin-bottom:10px;background:var(--bg-input);border:1px solid var(--border);border-radius:16px;padding:12px 10px 12px 13px;display:flex;gap:8px;align-items:flex-start;cursor:pointer;transition:border-color .2s,box-shadow .2s,transform .15s}
        .in-turno:hover{border-color:var(--accent-soft)}
        .in-turno.sel{border-color:var(--text-primary);box-shadow:0 6px 18px var(--shadow)}
        .in-turno-txt{flex:1;min-width:0}
        .in-nombre{font:700 15px 'Manrope',sans-serif;overflow-wrap:anywhere}
        .in-serv{font-size:12.5px;color:var(--text-secondary);margin-top:2px;overflow-wrap:anywhere}
        .in-pago{font-size:12.5px;font-weight:600;margin-top:7px;line-height:1.35}
        .in-cupon{font-size:11.5px;color:var(--pink);margin-top:2px}
        .in-chk{width:40px;height:40px;border-radius:50%;border:1.5px solid var(--border);background:var(--bg-card);color:var(--text-muted);display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;transition:background .2s,border-color .2s,color .2s,transform .15s}
        .in-chk:hover{border-color:var(--l-ve);color:var(--l-ve)}
        .in-chk.ok{background:var(--l-ve);border-color:var(--l-ve);color:var(--bg-card)}
        .in-chk.ok svg{animation:chkPop .3s ease}
        .in-entregada{height:34px;padding:0 12px;border-radius:17px;border:1px solid var(--border);background:var(--bg-card);color:var(--text-primary);font:600 12px 'Inter',sans-serif;flex-shrink:0;cursor:pointer;transition:transform .15s,border-color .2s}
        .in-entregada:hover{border-color:var(--l-ve);color:var(--l-ve)}
        .in-vacio{font-size:13px;color:var(--text-secondary);text-align:center;padding:14px 8px;background:var(--bg-input);border-radius:14px}
        .in-mas{align-self:center;display:inline-flex;align-items:center;gap:5px;border:none;background:none;color:var(--accent-deep);font:600 12.5px 'Inter',sans-serif;cursor:pointer;padding:6px 10px}
        .in-agendar{position:relative;overflow:hidden;isolation:isolate;height:58px;border-radius:18px;border:none;background:transparent;color:#F0E6D8;font:700 15.5px 'Manrope',sans-serif;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;flex-shrink:0;transition:transform .15s}
        .in-agendar::before{content:'';position:absolute;inset:-300%;background:conic-gradient(from 0deg,transparent 0deg 290deg,#F0E6D8 330deg,transparent 360deg);animation:inGira 4s linear infinite;z-index:-2}
        .in-agendar::after{content:'';position:absolute;inset:2px;border-radius:16px;background:var(--menu-oscuro);z-index:-1}
        @keyframes inGira{to{transform:rotate(360deg)}}
        .in-abajo{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;align-items:start}
        .in-etq{font-size:10.5px;letter-spacing:1.3px;font-weight:700;text-transform:uppercase;margin-bottom:8px}
        .in-tareas{background:var(--t-bg);border:1px solid var(--t-borde);border-radius:20px;padding:14px 16px;display:flex;flex-direction:column;gap:6px;min-width:0}
        .in-tarea-vacia{font-size:13px;color:var(--t-texto);opacity:.75}
        .in-tarea{display:flex;align-items:center;gap:10px;min-height:32px}
        .in-tarea-cb{width:22px;height:22px;border-radius:7px;border:1.5px solid var(--t-label);background:transparent;color:var(--t-bg);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:background .2s}
        .in-tarea-cb.ok{background:var(--t-label)}
        .in-tarea-txt{flex:1;min-width:0;font-size:14px;color:var(--t-texto);overflow-wrap:anywhere}
        .in-tarea-txt.ok{text-decoration:line-through;opacity:.55}
        .in-tarea-x{border:none;background:none;color:var(--t-label);opacity:.55;cursor:pointer;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:8px;flex-shrink:0}
        .in-tarea-x:hover{opacity:1;background:rgba(0,0,0,.05)}
        .in-tarea-nueva{display:flex;gap:6px;margin-top:4px}
        .in-tarea-nueva input{flex:1;min-width:0;height:42px;border-radius:12px;border:1px solid var(--t-borde);background:var(--bg-card);padding:0 12px;font:500 14px 'Inter',sans-serif;color:var(--text-primary);outline:none}
        .in-tarea-nueva button{width:42px;height:42px;border-radius:12px;border:none;background:var(--t-label);color:var(--t-bg);display:flex;align-items:center;justify-content:center;cursor:pointer}
        .in-tarea-nueva button:disabled{opacity:.4;cursor:default}
        .in-pagina{background:var(--w-dis-bg);border:1px solid var(--w-dis-borde);border-radius:20px;padding:12px 16px 14px;display:flex;flex-direction:column;gap:8px;min-width:0}
        .in-pagina{position:relative}
        .in-pagina-cab{display:flex;align-items:center;gap:8px;border:none;background:none;padding:2px 34px 2px 0;cursor:pointer;font-family:inherit;color:var(--w-dis-label);width:100%}
        .in-pagina-x{position:absolute;top:9px;right:10px;width:28px;height:28px;border-radius:9px;border:none;background:transparent;color:var(--w-dis-label);opacity:.7;display:flex;align-items:center;justify-content:center;cursor:pointer}
        .in-pagina-x:hover{opacity:1;background:var(--w-dis-borde)}
        .in-pagina-estado{margin-left:auto;display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:700;color:var(--w-dis-title)}
        .in-pagina-flecha{transition:transform .2s}
        .in-pagina:not(.compacta) .in-pagina-flecha{transform:rotate(180deg)}
        .in-pagina-tit{font-size:14px;font-weight:600;color:var(--w-dis-title);line-height:1.35}
        .in-pagina-barra{height:6px;border-radius:3px;background:var(--w-dis-borde);overflow:hidden}
        .in-pagina-barra>div{height:100%;border-radius:3px;background:var(--w-dis-label);transition:width .4s ease}
        .in-pagina-cuerpo{display:flex;flex-direction:column;gap:10px;animation:inEntra .2s ease}
        .in-pagina-dir{font-size:13px;color:var(--w-dis-title);word-break:break-all}
        .in-pagina-btns{display:flex;gap:8px;flex-wrap:wrap}
        .in-btn{display:inline-flex;align-items:center;justify-content:center;padding:10px 16px;border-radius:12px;font:700 13px 'Inter',sans-serif;border:none;cursor:pointer;background:var(--text-primary);color:var(--bg-card);text-decoration:none;transition:transform .15s}
        .in-btn.sec{background:var(--bg-card);color:var(--text-primary);border:1px solid var(--w-dis-borde)}
        .in-pasos{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr;gap:5px}
        .in-pasos li{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--w-dis-title)}
        .in-pasos li.ok{opacity:.55}
        .in-paso-c{width:20px;height:20px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10.5px;font-weight:800;border:1.5px solid var(--w-dis-label);color:var(--w-dis-label)}
        .in-pasos li.ok .in-paso-c{background:var(--w-dis-label);color:var(--w-dis-bg)}

        .in-detalle{position:sticky;top:16px;max-height:calc(100vh - 32px);overflow-y:auto;overscroll-behavior:contain;background:var(--bg);border:1px solid var(--border);border-radius:24px;display:flex;flex-direction:column}
        .in-detalle.vacio{background:transparent;border-style:dashed;min-height:240px;align-items:center;justify-content:center}
        .in-det-vacio{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;font-size:13px;color:var(--text-secondary);padding:24px;line-height:1.5}
        .in-det-vacio span{width:44px;height:44px;border-radius:14px;background:var(--accent-light);display:flex;align-items:center;justify-content:center;color:var(--accent-deep)}
        .in-det-cab{background:var(--menu-oscuro);color:#F0E6D8;padding:14px 18px 18px;display:flex;flex-direction:column;gap:6px;border-radius:0 0 26px 26px;flex-shrink:0}
        .in-det-cab-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}
        .in-det-volver{display:flex;align-items:center;gap:4px;height:38px;padding:0 12px 0 6px;border-radius:19px;border:none;background:rgba(255,255,255,.14);color:#F0E6D8;font:600 13px 'Inter',sans-serif;cursor:pointer}
        .in-det-menu-wrap{position:relative}
        .in-det-mas{width:40px;height:40px;border-radius:12px;border:none;background:rgba(255,255,255,.14);color:#F0E6D8;display:flex;align-items:center;justify-content:center;cursor:pointer}
        .in-menu-fondo{position:fixed;inset:0;z-index:5}
        .in-menu{position:absolute;right:0;top:46px;z-index:6;width:240px;background:var(--bg-card);border:1px solid var(--border);border-radius:16px;box-shadow:0 18px 40px rgba(var(--shadow-rgb),.25);padding:6px;transform-origin:top right;animation:inMenu .18s ease}
        @keyframes inMenu{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:none}}
        .in-menu button{width:100%;display:flex;align-items:flex-start;gap:10px;padding:10px;border:none;background:none;border-radius:11px;cursor:pointer;text-align:left;color:var(--text-primary);font-family:inherit}
        .in-menu button:hover{background:var(--accent-hover)}
        .in-menu button svg{margin-top:2px;flex-shrink:0}
        .in-menu b{display:block;font-size:13.5px}
        .in-menu small{display:block;font-size:11.5px;color:var(--text-secondary);margin-top:1px}
        .in-menu .peligro{color:var(--l-ro)}
        .in-det-nombre{font:800 23px 'Manrope',sans-serif;line-height:1.15;overflow-wrap:anywhere}
        .in-det-sub{font-size:13px;color:#DCD3E6}
        .in-det-sub2{font-size:12.5px;color:#C9C0D9}
        .in-det-acc{display:flex;gap:8px;margin-top:8px}
        .in-det-acc a,.in-det-acc-off{flex:1;height:42px;border-radius:21px;background:rgba(255,255,255,.14);color:#F0E6D8;display:flex;align-items:center;justify-content:center;gap:7px;font-size:13px;font-weight:600;text-decoration:none}
        .in-det-acc-off{opacity:.5}
        .in-det-cuerpo{padding:16px;display:flex;flex-direction:column;gap:14px;flex:1}
        .in-det-card{background:var(--bg-card);border:1px solid var(--border);border-radius:20px;padding:14px;display:flex;flex-direction:column;gap:10px}
        .in-det-card .in-etq{margin-bottom:0}
        .in-pago-caja{border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:3px;font-size:12.5px;line-height:1.45}
        .in-pago-caja b{font-size:14px}
        .in-pago-caja.am{background:var(--t-bg);color:var(--t-texto)}
        .in-pago-caja.ro{background:var(--pink-light);color:var(--l-ro)}
        .in-pago-caja.la{background:var(--accent-light);color:var(--text-primary)}
        .in-pago-btns{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}
        .in-pago-btns>*{flex:1;min-width:120px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;font:600 13px 'Inter',sans-serif;text-decoration:none;cursor:pointer;border:1px solid currentColor;background:transparent;color:inherit}
        .in-pago-btns .si{background:var(--l-ve);border-color:var(--l-ve);color:var(--bg-card);font-weight:700}
        .in-pago-linea{font-size:14px;font-weight:700}
        .in-desglose{display:flex;flex-direction:column;gap:6px;font-size:13.5px}
        .in-desglose>div{display:flex;justify-content:space-between;gap:10px}
        .in-desglose>div span:first-child{color:var(--text-secondary);overflow-wrap:anywhere}
        .in-desglose .tachado{text-decoration:line-through;color:var(--text-muted)}
        .in-desglose .cupon span{color:var(--pink) !important}
        .in-desglose .raya{height:1px;background:var(--border)}
        .in-desglose .total{font-weight:700}
        .in-desglose .total span:first-child{color:var(--text-primary)}
        .in-seg{display:flex;background:var(--bg-input);border-radius:12px;padding:4px;gap:2px}
        .in-seg button{flex:1;height:40px;border-radius:9px;border:none;background:transparent;color:var(--text-secondary);font:600 12.5px 'Inter',sans-serif;cursor:pointer;transition:background .2s,color .2s,transform .15s}
        .in-seg button.on{background:var(--text-primary);color:var(--bg-card);font-weight:700}
        .in-sena{display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:var(--t-bg);border-radius:12px;padding:10px 12px;font-size:12.5px;color:var(--t-texto);font-weight:600}
        .in-sena-campo{display:inline-flex;align-items:center;gap:4px}
        .in-sena-campo input{width:100px;height:36px;border-radius:9px;border:1px solid var(--t-borde);background:var(--bg-card);padding:0 8px;font:600 14px 'Inter',sans-serif;color:var(--text-primary);outline:none}
        .in-sena-resta{margin-left:auto}
        .in-antes{background:var(--accent-light);border-radius:18px;padding:14px 16px}
        .in-antes-txt{font-size:14px;line-height:1.55;white-space:pre-line;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical;overflow:hidden}
        .in-tabs{display:flex;background:var(--bg-input);border:1px solid var(--border-light);border-radius:14px;padding:4px}
        .in-tabs button{flex:1;min-height:40px;border-radius:11px;border:none;background:transparent;color:var(--text-secondary);font:600 13px 'Inter',sans-serif;cursor:pointer;transition:background .2s,color .2s}
        .in-tabs button.on{background:var(--bg-card);color:var(--text-primary);font-weight:700;box-shadow:0 2px 8px var(--shadow)}
        .in-det-cuerpo .editor{background:var(--bg-card)}
        .in-det-cuerpo .ea{font-size:14px;height:120px}
        .in-link-hist{display:block;text-align:center;padding:11px;border-radius:12px;border:1px solid var(--border);color:var(--text-secondary);font-size:13px;text-decoration:none;background:var(--bg-card)}
        .in-link-hist:hover{border-color:var(--accent-soft);color:var(--text-primary)}
        .in-det-pie{position:sticky;bottom:0;padding:12px 16px 16px;background:linear-gradient(to top,var(--bg) 72%,transparent);flex-shrink:0}
        .in-det-hecha{width:100%;height:52px;border-radius:16px;border:none;background:var(--text-primary);color:var(--bg-card);font:700 15px 'Inter',sans-serif;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;transition:background .2s,transform .15s}
        .in-det-hecha.ok{background:var(--l-ve)}
        .mo-overlay{z-index:400 !important}

        @media(max-width:1500px){ .in-cols{grid-template-columns:1fr} }
        @media(max-width:1180px){
          .in-wrap{grid-template-columns:minmax(0,1fr) 360px}
        }
        @media(max-width:1024px){
          .in-wrap{grid-template-columns:1fr;padding:12px 12px 110px}
          .in-detalle{position:fixed;inset:0;z-index:350;max-height:none;border:none;border-radius:0;animation:inSube .25s ease}
          .in-detalle.vacio{display:none}
          .in-det-cab{padding-top:calc(14px + env(safe-area-inset-top))}
          .in-det-pie{padding-bottom:calc(16px + env(safe-area-inset-bottom))}
          body:has(.in-detalle:not(.vacio)){overflow:hidden}
          @keyframes inSube{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}
        }
        @media(max-width:768px){
          .in-widgets{grid-template-columns:1fr 1fr}
          .in-cuenta{grid-column:1 / -1}
          .in-cont{flex-direction:row;align-items:center}
          .in-cont-n{font-size:26px}
          .in-abajo{grid-template-columns:1fr}
          .in-head{padding:12px;border-radius:18px;grid-template-columns:1fr;grid-template-areas:'saludo' 'busca' 'btns';gap:8px}
          .in-head-btns>*{flex:1}
          .in-agendar{order:-1}
          .in-saludo h1{font-size:14px}
          .in-aviso{margin:10px 12px 0}
          .in-dias-fila{grid-template-columns:repeat(6,minmax(0,1fr))}
        }
        @media(max-width:360px){
          .in-widgets{grid-template-columns:1fr}
          .in-hora{width:40px}
        }
        @media (prefers-reduced-motion:reduce){.in-agendar::before,.in-fila,.in-detalle,.in-menu,.in-pagina-cuerpo{animation:none}}
      `}</style>

{avisoRenovacion && (
        <div role="status" className="in-aviso" data-tono={avisoRenovacion.tono}>
          <span style={{flex:'1 1 240px'}}>{avisoRenovacion.texto}</span>
          <span style={{display:'flex',alignItems:'center',gap:'8px',flexShrink:0}}>
            <a href="/suscripcion" className="in-aviso-btn">{avisoRenovacion.boton}</a>
            <button onClick={() => setAvisoRenovacion(null)} aria-label="Cerrar aviso" className="in-x"><X size={15}/></button>
          </span>
        </div>
      )}
      <div className={`in-wrap${turnoSeleccionado ? ' con-detalle' : ''}`}>
        <main className="in-main">
          {/* 1. CABECERA: saludo, buscador, tu página */}
          <header className="in-head">
            <div className="in-saludo">
              <h1>{saludoHora()}, {nombreTerapeuta}</h1>
              <div className="in-fecha">{hoy.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
            </div>
            <label className="in-busca">
              <Search size={16}/>
              <input placeholder="Buscar consultante, alias o servicio" value={busqueda} onChange={e => setBusqueda(e.target.value)} aria-label="Buscar"/>
              {busqueda && <button type="button" className="in-busca-x" aria-label="Borrar búsqueda" onClick={() => setBusqueda('')}><X size={14}/></button>}
            </label>
            <div className="in-head-btns">
              {progresoPagina?.slug ? (<>
                <a className="in-head-btn" href={`/p/${progresoPagina.slug}`} target="_blank" rel="noopener noreferrer"><Eye size={15}/>Ver mi página</a>
                <button type="button" className="in-head-btn" onClick={copiarLinkPagina}><LinkIcon size={15}/>{linkCopiado ? '¡Copiado!' : 'Copiar link'}</button>
              </>) : (
                <a className="in-head-btn" href="/settings?bloque=perfil"><Eye size={15}/>Armar mi página</a>
              )}
            </div>
          </header>

          <VideoBienvenida />

          {/* 2. CUADROS CHICOS */}
          <div className="in-widgets">
            {widgetFinanzas}
            {widgetDisponibilidad}
            <div className="in-cuenta">
              {[{ t: 'hoy', n: turnosHoy, ac: true }, { t: 'mañana', n: turnosManana }, { t: 'pasado', n: turnosPasado }].map(c => (
                <div key={c.t} className={`in-cont${c.ac ? ' ac' : ''}`}><span className="in-cont-t">{c.t}</span><span className="in-cont-n">{c.n}</span></div>
              ))}
            </div>
          </div>

          <div className="in-cols">
            {/* 3. TURNOS DEL DÍA (o resultados de búsqueda) */}
            <section className="in-card in-turnos" aria-label="Turnos">
              <div className="in-card-top">
                <h2>{busqueda ? 'Resultados' : tituloDia}</h2>
                <span className="in-meta">{busqueda ? `${turnosFiltrados.length} ${turnosFiltrados.length === 1 ? 'turno' : 'turnos'}` : `${vivosDelDia.length ? `${vivosDelDia.length} · ${vivosDelDia.filter(t => t.realizado).length} ${vivosDelDia.filter(t => t.realizado).length === 1 ? 'hecho' : 'hechos'}` : ''}`}</span>
              </div>
              {!busqueda && (<>
                <div className="in-mes">
                  <button type="button" className="in-flecha" aria-label="Mes anterior" disabled={mesIdx === 0} onClick={() => { const m = Math.max(0, mesIdx - 1); cambiarMes(m); setMesOffset(o => Math.min(o, m)) }}><ChevronLeft size={14}/></button>
                  <span className="in-mes-txt">{MESES[mesIdx]}</span>
                  <button type="button" className="in-flecha" aria-label="Mes siguiente" disabled={mesIdx === 11} onClick={() => { const m = Math.min(11, mesIdx + 1); cambiarMes(m); setMesOffset(o => Math.max(o, m - 4)) }}><ChevronRight size={14}/></button>
                  {fechaSeleccionada !== formatDate(hoy) && <button type="button" className="in-volver-hoy" onClick={() => { cambiarMes(hoy.getMonth()); setDiasPorMes(prev => ({ ...prev, [hoy.getMonth()]: hoy.getDate() })); setDiaOffset(Math.max(0, hoy.getDate() - 3)) }}>Volver a hoy</button>}
                </div>
                <div className="in-dias">
                  <button type="button" className="in-flecha" aria-label="Días anteriores" disabled={diaOffset === 0} onClick={() => setDiaOffset(o => Math.max(0, o - 1))}><ChevronLeft size={14}/></button>
                  <div className="in-dias-fila">
                    {Array.from({ length: diasDelMes }).slice(diaOffset, diaOffset + 6).map((_, i) => {
                      const dia = diaOffset + i + 1
                      const fecha = `${hoy.getFullYear()}-${String(mesIdx + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
                      const diaSemana = new Date(hoy.getFullYear(), mesIdx, dia).getDay()
                      const tieneTurnos = turnos.some(t => t.fecha === fecha && !esEntrega(t))
                      const esSel = dia === diaSeleccionado
                      const esHoy = fecha === formatDate(hoy)
                      return (
                        <button type="button" key={dia} className={`in-dia${esSel ? ' ac' : ''}${tieneTurnos && !esSel ? ' ht' : ''}`} aria-pressed={esSel} onClick={() => cambiarDia(dia)}>
                          <span className="in-dia-n">{dia}</span>
                          <span className="in-dia-s">{esHoy ? 'hoy' : DIAS_SEMANA[diaSemana]}</span>
                          {tieneTurnos && <span className="in-dia-punto" aria-hidden="true"/>}
                        </button>
                      )
                    })}
                  </div>
                  <button type="button" className="in-flecha" aria-label="Días siguientes" disabled={diaOffset >= diasDelMes - 6} onClick={() => setDiaOffset(o => Math.min(diasDelMes - 6, o + 1))}><ChevronRight size={14}/></button>
                </div>
              </>)}

              <div className="in-linea">
                {listaTurnos.length === 0 && (
                  <div className="in-vacio">
                    {busqueda ? 'No encontramos turnos con esa búsqueda.' : !disponibilidad.some(d => d.dia_semana === new Date(fechaSeleccionada + 'T12:00:00').getDay() && d.activo) ? 'Ese día no atendés. Igual podés agendar un turno.' : 'No hay turnos para este día.'}
                  </div>
                )}
                {listaTurnos.map(turno => {
                  const lp = lineaPago(turno)
                  const entrega = esEntrega(turno)
                  return (
                    <div key={turno.id} className={`in-fila${turno.realizado ? ' hecha' : ''}`}>
                      <div className="in-hora">
                        {busqueda && <div className="in-hora-f">{new Date(turno.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</div>}
                        <div className="in-hora-h">{entrega ? <Package size={15}/> : turno.hora}</div>
                        <div className="in-hora-d">{entrega ? 'entrega' : `${turno.duracion} min`}</div>
                      </div>
                      <div className="in-eje"><span className="in-punto" style={{ background: turno.realizado ? 'var(--accent-soft)' : COLOR_LINEA[lp.tono] }}/><span className="in-raya"/></div>
                      <div className={`in-turno${turnoSeleccionado?.id === turno.id ? ' sel' : ''}`} role="button" tabIndex={0}
                        onClick={() => abrirTurno(turno)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirTurno(turno) } }}>
                        <div className="in-turno-txt">
                          <div className="in-nombre">{turno.pacienteNombre || 'Sin nombre'}</div>
                          <div className="in-serv">{turno.servicio}{entrega ? '' : ' · en vivo'}{turno.realizado ? ' · hecha' : ''}</div>
                          <div className="in-pago" style={{ color: COLOR_LINEA[lp.tono] }}>{lp.texto}</div>
                          {turno.cupon_codigo && <div className="in-cupon">Con cupón {turno.cupon_codigo}{turno.precio_original ? ` · antes ${turno.moneda === 'USD' ? 'USD ' : '$'}${Number(turno.precio_original).toLocaleString('es-AR')}` : ''}</div>}
                        </div>
                        <button type="button" className={`in-chk${turno.realizado ? ' ok' : ''}`} aria-pressed={turno.realizado}
                          aria-label={turno.realizado ? 'Sesión hecha. Tocá para desmarcar' : 'Marcar sesión como hecha'}
                          onClick={e => { e.stopPropagation(); toggleRealizado(turno.id) }}>
                          <Check size={16} strokeWidth={2.6}/>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            <div className="in-col-der">
              {/* 4. ENTREGAS PENDIENTES (con cuenta regresiva) */}
              <section className="in-card in-entregas" aria-label="Entregas pendientes">
                <div className="in-card-top">
                  <div><h2>Entregas pendientes</h2>{entregasOrdenadas.length > 0 && <div className="in-meta">Lo que vence primero, arriba</div>}</div>
                  {entregasOrdenadas.length > 0 && <span className="in-meta">{entregasOrdenadas.length}</span>}
                </div>
                {entregasOrdenadas.length === 0 ? (
                  <div className="in-vacio">No tenés entregas pendientes.</div>
                ) : (
                  <div className="in-linea">
                    {(verTodasEntregas ? entregasOrdenadas : entregasOrdenadas.slice(0, 4)).map(({ t, restanMs }) => {
                      const lp = lineaPago(t)
                      const cuenta = textoCuenta(restanMs)
                      return (
                        <div key={t.id} className="in-fila">
                          <div className="in-hora"><div className="in-hora-h" style={{ color: COLOR_LINEA[cuenta.tono] }}>{cuenta.n}</div><div className="in-hora-d">{cuenta.txt}</div></div>
                          <div className="in-eje"><span className="in-punto" style={{ background: COLOR_LINEA[cuenta.tono] }}/><span className="in-raya"/></div>
                          <div className={`in-turno${turnoSeleccionado?.id === t.id ? ' sel' : ''}`} role="button" tabIndex={0}
                            onClick={() => abrirTurno(t)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirTurno(t) } }}>
                            <div className="in-turno-txt">
                              <div className="in-nombre">{t.pacienteNombre || 'Sin nombre'}</div>
                              <div className="in-serv">{t.servicio} · {pidioCuando(t)}</div>
                              <div className="in-pago" style={{ color: COLOR_LINEA[lp.tono] }}>{lp.texto}</div>
                              {t.cupon_codigo && <div className="in-cupon">Con cupón {t.cupon_codigo}{t.precio_original ? ` · antes $${Number(t.precio_original).toLocaleString('es-AR')}` : ''}</div>}
                            </div>
                            <button type="button" className="in-entregada" onClick={e => { e.stopPropagation(); toggleRealizado(t.id) }}>Entregada</button>
                          </div>
                        </div>
                      )
                    })}
                    {entregasOrdenadas.length > 4 && (
                      <button type="button" className="in-mas" onClick={() => setVerTodasEntregas(v => !v)}>
                        {verTodasEntregas ? 'Ver menos' : `Ver las ${entregasOrdenadas.length - 4} que faltan`} <ChevronDown size={14} style={{ transform: verTodasEntregas ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}/>
                      </button>
                    )}
                  </div>
                )}
              </section>

              <button type="button" className="in-agendar" onClick={() => setModalOpen(true)}><Plus size={18} strokeWidth={2.4}/>Agendar turno</button>
            </div>
          </div>

          {/* 5. ALTAR, TAREAS Y TU PÁGINA */}
          <div className="in-abajo">
            <TarjetaAltarInicio variante="grande" />

            <section className="in-tareas" aria-label="Mis tareas">
              <div className="in-etq" style={{ color: 'var(--t-label)' }}>Mis tareas{tasks.length > 0 ? ` · ${tasks.filter(x => !x.completada).length} por hacer` : ''}</div>
              {tasks.length === 0 && <div className="in-tarea-vacia">Anotá lo que no se te puede pasar.</div>}
              {(verTodasTareas ? tasks : tasks.slice(0, 5)).map(task => (
                <div key={task.id} className="in-tarea">
                  <button type="button" className={`in-tarea-cb${task.completada ? ' ok' : ''}`} aria-pressed={task.completada} aria-label={task.completada ? 'Desmarcar tarea' : 'Marcar tarea como hecha'} onClick={() => toggleTask(task.id)}>
                    {task.completada && <Check size={12} strokeWidth={3}/>}
                  </button>
                  <span className={`in-tarea-txt${task.completada ? ' ok' : ''}`}>{task.texto}</span>
                  <button type="button" className="in-tarea-x" aria-label="Borrar tarea" onClick={() => borrarTask(task.id)}><X size={13}/></button>
                </div>
              ))}
              {tasks.length > 5 && (
                <button type="button" className="in-mas" style={{ color: 'var(--t-label)' }} onClick={() => setVerTodasTareas(v => !v)}>
                  {verTodasTareas ? 'Ver menos' : `Ver las ${tasks.length - 5} que faltan`} <ChevronDown size={14} style={{ transform: verTodasTareas ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}/>
                </button>
              )}
              <div className="in-tarea-nueva">
                <input placeholder="Nueva tarea…" value={nuevaTask} onChange={e => setNuevaTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && agregarTask()} aria-label="Nueva tarea"/>
                <button type="button" onClick={agregarTask} aria-label="Agregar tarea" disabled={!nuevaTask.trim()}><Plus size={15}/></button>
              </div>
            </section>

            {/* Tu página: la guía (le falten pasos o no). Se puede achicar o quitar del Inicio */}
            {!paginaQuitada && <section className={`in-pagina${paginaCompacta ? ' compacta' : ''}`} aria-label="Tu página">
              {(() => {
                const total = PASOS.length
                const listos = progresoPagina?.listos ?? 0
                const completa = !!progresoPagina && listos === total
                const siguiente = !progresoPagina || progresoPagina.nuevo ? 'perfil' : (primerIncompleto(progresoPagina.pasos) || 'compartir')
                const faltan = total - listos
                return (<>
                  <button type="button" className="in-pagina-cab" aria-expanded={!paginaCompacta} onClick={alternarPaginaCompacta}>
                    <span className="in-etq" style={{ color: 'var(--w-dis-label)', marginBottom: 0 }}>Tu página</span>
                    <span className="in-pagina-estado">{completa ? <><Check size={13}/> Lista</> : `${listos} de ${total}`}</span>
                    <ChevronDown size={15} className="in-pagina-flecha"/>
                  </button>
                  <button type="button" className="in-pagina-x" aria-label="Quitar «Tu página» del Inicio" title="Quitar del Inicio" onClick={quitarPagina}><X size={14}/></button>
                  <div className="in-pagina-tit">
                    {!progresoPagina ? 'Revisá cómo está tu página de reservas'
                      : completa ? 'Tu página está lista para compartir'
                      : progresoPagina.nuevo ? `Armá tu página de reservas en ${total} pasos`
                      : `Te ${faltan === 1 ? 'falta 1 paso' : `faltan ${faltan} pasos`} para tenerla lista`}
                  </div>
                  <div className="in-pagina-barra"><div style={{ width: `${progresoPagina ? (listos / total) * 100 : 0}%` }}/></div>
                  {!paginaCompacta && (
                    <div className="in-pagina-cuerpo">
                      {completa && progresoPagina ? (<>
                        <div className="in-pagina-dir">lumaapp.lat/p/{progresoPagina.slug}</div>
                        <div className="in-pagina-btns">
                          <button type="button" className="in-btn" onClick={copiarLinkPagina}>{linkCopiado ? '¡Copiado! Pegalo en tu bio' : 'Copiar link'}</button>
                          <a className="in-btn sec" href="/settings?bloque=diseno">Cambiar el diseño</a>
                        </div>
                      </>) : (<>
                        {progresoPagina && (
                          <ul className="in-pasos">
                            {PASOS.map(p => (
                              <li key={p.id} className={progresoPagina.pasos[p.id] ? 'ok' : ''}>
                                <span className="in-paso-c">{progresoPagina.pasos[p.id] ? <Check size={11} strokeWidth={3}/> : p.numero}</span>{p.titulo}
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="in-pagina-btns">
                          <a className="in-btn" href={`/settings?bloque=${siguiente}`}>{!progresoPagina ? 'Ir a mi página' : progresoPagina.nuevo ? 'Empezar' : 'Seguir'} →</a>
                        </div>
                      </>)}
                    </div>
                  )}
                </>)
              })()}
            </section>}
          </div>
        </main>

        {/* 6. DETALLE DEL TURNO: al costado en la compu, pantalla completa en el celu */}
        {turnoSeleccionado ? (
          <aside className="in-detalle" aria-label={`Detalle del turno de ${turnoSeleccionado.pacienteNombre}`}>
            {(() => {
              const t = turnoSeleccionado
              const pac = pacientes.find(p => p.id === t.pacienteDbId)
              const numero = pac?.celular ? pac.celular.replace(/\D/g, '') : ''
              const linkWa = (texto?: string) => numero ? `https://wa.me/${numero.startsWith('54') ? '' : '549'}${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ''}` : null
              const entrega = esEntrega(t)
              const delPaciente = turnos.filter(x => x.pacienteDbId && x.pacienteDbId === t.pacienteDbId)
              const primera = delPaciente.reduce((m, x) => (!m || x.fecha < m ? x.fecha : m), '')
              const fechaTxt = new Date(t.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
              const esHoyT = t.fecha === formatDate(hoy)
              const lp = lineaPago(t)
              const simbolo = t.moneda === 'USD' ? 'USD ' : '$'
              return (<>
                <div className="in-det-cab">
                  <div className="in-det-cab-top">
                    <button type="button" className="in-det-volver" onClick={() => setTurnoSeleccionado(null)}><ChevronLeft size={18}/><span>{busqueda ? 'Resultados' : esEntrega(t) ? 'Entregas' : tituloDia}</span></button>
                    <div className="in-det-menu-wrap">
                      <button type="button" className="in-det-mas" aria-label="Más opciones: reprogramar, historial o borrar" aria-expanded={menuDetalle} onClick={() => setMenuDetalle(v => !v)}><MoreHorizontal size={18}/></button>
                      {menuDetalle && (<>
                        <div className="in-menu-fondo" onClick={() => setMenuDetalle(false)}/>
                        <div className="in-menu" role="menu">
                          {!entrega && <button type="button" role="menuitem" onClick={() => { setMenuDetalle(false); setNuevaFechaEditar(t.fecha); setNuevaHoraEditar(t.hora); setEditandoFecha(true) }}><Pencil size={15}/><span><b>Reprogramar</b><small>Cambiar el día o la hora</small></span></button>}
                          <button type="button" role="menuitem" onClick={() => { setMenuDetalle(false); setHistorialOpen(true) }}><Expand size={15}/><span><b>Ver historial</b><small>Sus sesiones anteriores</small></span></button>
                          <button type="button" role="menuitem" className="peligro" onClick={() => { setMenuDetalle(false); setBorrarConfirm(true) }}><Trash2 size={15}/><span><b>Borrar turno</b><small>Te pregunta antes</small></span></button>
                        </div>
                      </>)}
                    </div>
                  </div>
                  <div className="in-det-nombre">{t.pacienteNombre || 'Sin nombre'}</div>
                  <div className="in-det-sub">
                    {entrega ? `Entrega · ${t.servicio} · ${pidioCuando(t)}` : `${esHoyT ? 'Hoy' : fechaTxt} ${t.hora} · ${t.servicio} · ${t.duracion} min`}
                  </div>
                  {primera && <div className="in-det-sub2">{t.pacienteId ? `#${t.pacienteId} · ` : ''}Viene desde {new Date(primera + 'T12:00:00').toLocaleDateString('es-AR', { month: 'long', year: primera.slice(0, 4) === String(hoy.getFullYear()) ? undefined : 'numeric' })} · {delPaciente.length} {delPaciente.length === 1 ? 'sesión' : 'sesiones'}</div>}
                  <div className="in-det-acc">
                    {linkWa() ? <a href={linkWa()!} target="_blank" rel="noopener noreferrer"><MessageCircle size={15}/>WhatsApp</a> : <span className="in-det-acc-off" title="No tiene celular cargado"><MessageCircle size={15}/>Sin WhatsApp</span>}
                    <a href={`/patients?paciente=${t.pacienteDbId}`}><UserIcon size={15}/>Ficha completa</a>
                  </div>
                </div>

                <div className="in-det-cuerpo">
                  {/* PAGO */}
                  <div className="in-det-card">
                    <div className="in-etq" style={{ color: 'var(--accent-deep)' }}>Pago</div>
                    {t.origen === 'pagina_publica' && t.pago === 'pendiente' && (() => {
                      const nombre = t.pacienteNombre
                      const m = t.metodo_pago
                      if (m === 'usd') {
                        const wa = linkWa(`Hola ${nombre}! Te escribo por tu reserva del ${fechaTxt}. ¿Me pasás el comprobante del pago en dólares así lo confirmo? 🙏`)
                        return <div className="in-pago-caja am"><b>Avisó que pagó USD {t.precio_usd}</b><span>Reservó desde tu página y tocó «Ya pagué». Revisá tu cuenta y confirmalo cuando te llegue. Los dólares van aparte en Finanzas.</span>
                          <div className="in-pago-btns"><button type="button" className="si" onClick={() => updatePago(t.id, 'pagado')}>Me llegó: confirmar</button>{wa && <a href={wa} target="_blank" rel="noopener noreferrer">Pedir comprobante</a>}</div></div>
                      }
                      if (m === 'transferencia') {
                        const wa = linkWa(`Hola ${nombre}! Te escribo por tu reserva del ${fechaTxt}. ¿Me pasás el comprobante de la transferencia así la confirmo? 🙏`)
                        return <div className="in-pago-caja am"><b>Avisó que transfirió {simbolo}{Number(t.precio).toLocaleString('es-AR')}</b><span>Reservó desde tu página y tocó «Ya hice la transferencia». Fijate en tu cuenta: puede que ya esté.</span>
                          <div className="in-pago-btns"><button type="button" className="si" onClick={() => updatePago(t.id, 'pagado')}>Me llegó</button>{wa && <a href={wa} target="_blank" rel="noopener noreferrer">Pedir comprobante</a>}</div></div>
                      }
                      if (m === 'libre') {
                        const wa = linkWa(`Hola ${nombre}! Te escribo por tu reserva del ${fechaTxt} para coordinar el pago 😊`)
                        return <div className="in-pago-caja la"><b>Reservó sin pagar</b><span>Reservó desde tu página, sin pago previo. Coordiná el pago como prefieras y después marcalo acá abajo.</span>
                          {wa && <div className="in-pago-btns"><a href={wa} target="_blank" rel="noopener noreferrer">Escribirle por WhatsApp</a></div>}</div>
                      }
                      const wa = linkWa(`Hola ${nombre}! Vi que reservaste para el ${fechaTxt} pero el pago no llegó a completarse. ¿Te ayudo a terminarlo? 🙏`)
                      return <div className="in-pago-caja ro"><b>El pago con Mercado Pago no se completó</b><span>Empezó a pagar pero Mercado Pago no confirmó el cobro. Mientras no se pague, no suma en tus finanzas. Si te paga por otro medio, marcalo como pagado; si no, podés borrar el turno.</span>
                        {wa && <div className="in-pago-btns"><a href={wa} target="_blank" rel="noopener noreferrer">Ayudarla a pagar</a></div>}</div>
                    })()}
                    {!(t.origen === 'pagina_publica' && t.pago === 'pendiente') && (
                      <div className="in-pago-linea" style={{ color: COLOR_LINEA[lp.tono] }}>{lp.texto}</div>
                    )}
                    <div className="in-desglose">
                      <div><span>{t.servicio}</span><span className={t.cupon_codigo && t.precio_original ? 'tachado' : ''}>{simbolo}{Number(t.cupon_codigo && t.precio_original ? t.precio_original : t.precio).toLocaleString('es-AR')}</span></div>
                      {t.cupon_codigo && t.precio_original ? (
                        <div className="cupon"><span>Cupón {t.cupon_codigo}{t.precio_original > 0 ? ` · ${Math.round((1 - t.precio / t.precio_original) * 100)}%` : ''}</span><span>−{simbolo}{Number(t.precio_original - t.precio).toLocaleString('es-AR')}</span></div>
                      ) : t.cupon_codigo ? (
                        <div className="cupon"><span>Con cupón {t.cupon_codigo}</span><span/></div>
                      ) : null}
                      {t.pago === 'señado' && <div><span>Seña</span><span>−{simbolo}{Number(t.sena).toLocaleString('es-AR')}</span></div>}
                      <div className="raya"/>
                      <div className="total"><span>{t.pago === 'pagado' ? 'Cobrado' : 'A cobrar'}</span><span>{simbolo}{Number(t.pago === 'señado' ? Math.max(0, resta) : t.precio).toLocaleString('es-AR')}</span></div>
                    </div>
                    <div className="in-seg" role="group" aria-label="Estado del pago">
                      {(['pendiente', 'señado', 'pagado'] as Pago[]).filter(p => !(p === 'señado' && t.moneda === 'USD')).map(p => (
                        <button type="button" key={p} className={t.pago === p ? 'on' : ''} aria-pressed={t.pago === p} onClick={() => { if (t.pago !== p) updatePago(t.id, p) }}>
                          {p === 'pendiente' ? 'Pendiente' : p === 'señado' ? 'Señado' : 'Pagado'}
                        </button>
                      ))}
                    </div>
                    {t.pago === 'señado' && (
                      <label className="in-sena">
                        <span>Seña abonada</span>
                        <span className="in-sena-campo">$<input type="number" inputMode="numeric" min={0} value={t.sena} onChange={e => updateSena(t.id, Number(e.target.value))}/></span>
                        <span className="in-sena-resta">Resta ${Math.max(0, resta).toLocaleString('es-AR')}</span>
                      </label>
                    )}
                  </div>

                  <div className="in-tabs" role="tablist">
                    <button type="button" role="tab" aria-selected={tabDetalle === 'contexto'} className={tabDetalle === 'contexto' ? 'on' : ''} onClick={() => setTabDetalle('contexto')}>Contexto</button>
                    <button type="button" role="tab" aria-selected={tabDetalle === 'notas'} className={tabDetalle === 'notas' ? 'on' : ''} onClick={() => setTabDetalle('notas')}>Después de la sesión{sessionNotes.length > 0 ? ` · ${sessionNotes.length}` : ''}</button>
                  </div>

{tabDetalle === 'contexto' && (<>
  <div className="editor">
    <div className="etb">
      {grabando && (
        <span style={{fontSize:'10px',color:'#EF4444',display:'flex',alignItems:'center',gap:'4px'}}>
          <span style={{width:'6px',height:'6px',borderRadius:'50%',background:'#EF4444',display:'inline-block'}}/>
          Escuchando...
        </span>
      )}
    </div>
    <textarea
      key={t.id}
      className="ea"
      value={contextoLocal}
      onChange={e => setContextoLocal(e.target.value)}
      onBlur={() => updateContexto(t.id, contextoLocal)}
      placeholder="¿Qué trae hoy? Escribí el contexto de esta sesión..."
      autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}/>
  </div>
  <a className="in-link-hist" href={`/patients?paciente=${t.pacienteDbId}`}>Ver historial completo en Pacientes →</a>
</>)}

{tabDetalle === 'notas' && (<>
  {/* NUEVA FICHA */}
  <div style={{background:'var(--bg-input)',borderRadius:'14px',padding:'12px',border:'0.5px solid var(--border-light)',flexShrink:0}}>
    <input
      placeholder="Nombre de la ficha..."
      value={nuevoTitulo}
      onChange={e => setNuevoTitulo(e.target.value)}
      style={{width:'100%',border:'none',background:'transparent',fontSize:'12px',fontWeight:600,color:'var(--text-primary)',outline:'none',fontFamily:'inherit',marginBottom:'7px'}}/>
    <textarea
      placeholder="¿Qué pasó en esta sesión? (opcional)"
      value={nuevaNota}
      onChange={e => setNuevaNota(e.target.value)}
      style={{width:'100%',border:'none',background:'transparent',fontSize:'12px',color:'var(--text-primary)',outline:'none',resize:'none',height:'55px',fontFamily:'inherit',lineHeight:'1.6'}}/>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'6px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
        <input ref={notaArchivoRef} type="file" accept="image/*,.pdf,.doc,.docx,audio/*" style={{display:'none'}}
          onChange={e => setArchivoNota(e.target.files?.[0] || null)}/>
        <button onClick={() => notaArchivoRef.current?.click()}
          style={{padding:'4px 10px',borderRadius:'7px',background:'var(--bg-card)',border:'0.5px solid var(--border)',fontSize:'10px',color:'var(--text-muted)',cursor:'pointer',fontFamily:'inherit'}}>
          📎 {archivoNota ? archivoNota.name.slice(0,20)+'...' : 'Adjuntar'}
        </button>
        {archivoNota && (
          <button onClick={() => { setArchivoNota(null); if(notaArchivoRef.current) notaArchivoRef.current.value='' }}
            style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--text-muted)'}}>
            <X size={10}/>
          </button>
        )}
      </div>
      <button onClick={agregarNota} disabled={subiendoNotaArchivo}
        style={{padding:'5px 12px',background:'linear-gradient(135deg,var(--accent),var(--accent-2))',color:'white',border:'none',borderRadius:'7px',fontSize:'11px',fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:subiendoNotaArchivo?0.6:1}}>
        {subiendoNotaArchivo ? 'Guardando...' : '+ Guardar ficha'}
      </button>
    </div>
  </div>

{/* FICHERO */}
{sessionNotes.length === 0 ? (
  <div style={{fontSize:'11px',color:'var(--text-muted)',textAlign:'center',padding:'12px 0'}}>Sin fichas aún</div>
) : (() => {
  const notasOrdenadas = [...sessionNotes].reverse()
  return (
    <div style={{position:'relative',flexShrink:0,minHeight:`${(notasOrdenadas.length-1) * 46 + 190}px`}}>
      {notasOrdenadas.map((n, i) => {
        const isHovered = notaHover === n.id
        const hoveredIndex = notasOrdenadas.findIndex(x => x.id === notaHover)
        const empujado = hoveredIndex !== -1 && i > hoveredIndex
        const tieneImagen = n.archivo_tipo === 'imagen' && !!n.archivo_url
        const FOLDER_COLORS = [
          {tab:'#E9D5FF', border:'rgba(233,213,255,0.3)'},
          {tab:'#C7D2FE', border:'rgba(199,210,254,0.3)'},
          {tab:'#A7F3D0', border:'rgba(167,243,208,0.3)'},
          {tab:'#FBCFE8', border:'rgba(251,207,232,0.3)'},
          {tab:'#FDE68A', border:'rgba(211,200,159,0.3)'},
          {tab:'#BAE6FD', border:'rgba(186,230,253,0.3)'},
        ]
        const color = FOLDER_COLORS[i % FOLDER_COLORS.length]
        return (
          <div key={n.id}
            onMouseEnter={() => setNotaHover(n.id)}
            onMouseLeave={() => setNotaHover(null)}
            onClick={() => setNotaModalAbierta(n.id)}
            style={{
              position:'absolute',
              top:`${i*46 + (empujado ? 34 : 0) - (isHovered ? 10 : 0)}px`,
              left:0, right:0,
              height:'150px',
              zIndex: isHovered ? 200 : i+1,
              borderRadius:'16px',
              overflow:'hidden',
              cursor:'pointer',
              boxShadow: isHovered ? '0 20px 40px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.12)',
              transform: isHovered ? 'scale(1.015)' : 'scale(1)',
              transition:'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
              background: tieneImagen ? `url(${verArchivo(n.archivo_url)}) center/cover no-repeat` : `linear-gradient(135deg, ${color.tab}, #FFFFFF)`,
            }}>
            {tieneImagen && (
              <div style={{
                position:'absolute',inset:0,
                background:'linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 45%, rgba(0,0,0,0) 75%)',
              }}/>
            )}
            <div style={{position:'absolute',left:0,right:0,top:0,padding:'12px 16px'}}>
              <div style={{fontSize:'13px',fontWeight:800,color: tieneImagen ? 'white' : 'rgba(0,0,0,0.75)',fontFamily:"'Manrope',sans-serif",marginBottom:'4px',textShadow: tieneImagen ? '0 1px 4px rgba(0,0,0,0.4)' : 'none'}}>
                {n.archivo_tipo === 'pdf' && '📄 '}{n.titulo}
              </div>
              {n.contenido && (
                <div style={{fontSize:'11px',color: tieneImagen ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.6)',lineHeight:'1.4',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' as const}}>
                  {n.contenido}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
})()}
</>)}
                </div>

                <div className="in-det-pie">
                  <button type="button" className={`in-det-hecha${t.realizado ? ' ok' : ''}`} aria-pressed={t.realizado} onClick={() => toggleRealizado(t.id)}>
                    <Check size={18} strokeWidth={2.6}/>{entrega ? (t.realizado ? 'Entregada · tocá para desmarcar' : 'Marcar como entregada') : (t.realizado ? 'Sesión hecha · tocá para desmarcar' : 'Marcar la sesión como hecha')}
                  </button>
                </div>
              </>)
            })()}
          </aside>
        ) : (
          <aside className="in-detalle vacio" aria-hidden="true">
            <div className="in-det-vacio"><span><Info size={20}/></span>Tocá un turno para ver el detalle: el pago, el contexto y las fichas.</div>
          </aside>
        )}
      </div>


      {notaModalAbierta && (() => {
  const n = sessionNotes.find(x => x.id === notaModalAbierta)
  if (!n) return null
  const tieneImagen = n.archivo_tipo === 'imagen' && !!n.archivo_url
  const isEditing = editandoNota === n.id
  return (
    <div className="ficha-modal-overlay" onClick={() => { setNotaModalAbierta(null); setEditandoNota(null); setArchivoNota(null) }}>
      <div className="ficha-modal-box" onClick={e => e.stopPropagation()}>
        <button className="ficha-modal-close" onClick={() => { setNotaModalAbierta(null); setEditandoNota(null); setArchivoNota(null) }}><X size={16}/></button>
        {tieneImagen && (
  <img src={verArchivo(n.archivo_url)} alt="" className="ficha-modal-img"
    style={{cursor:'zoom-in'}}
    onClick={() => setImagenExpandida(true)}/>
)}
        <div className="ficha-modal-body">
          {isEditing ? (
            <>
              <input value={editTitulo} onChange={e => setEditTitulo(e.target.value)}
                placeholder="Nombre de la ficha..."
                style={{width:'100%',border:'0.5px solid var(--border)',borderRadius:'8px',padding:'8px 10px',fontSize:'14px',fontWeight:700,color:'var(--text-primary)',background:'var(--bg-input)',outline:'none',fontFamily:'inherit',marginBottom:'10px'}}/>
              <textarea value={editContenido} onChange={e => setEditContenido(e.target.value)}
                style={{width:'100%',border:'0.5px solid var(--border)',borderRadius:'8px',padding:'10px',fontSize:'13px',color:'var(--text-primary)',background:'var(--bg-input)',outline:'none',resize:'none',height:'160px',fontFamily:'inherit',lineHeight:'1.7',marginBottom:'10px'}}/>
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'14px'}}>
                <input ref={notaArchivoRef} type="file" accept="image/*,.pdf,.doc,.docx,audio/*" style={{display:'none'}}
                  onChange={e => setArchivoNota(e.target.files?.[0] || null)}/>
                <button onClick={() => notaArchivoRef.current?.click()}
                  style={{padding:'5px 10px',borderRadius:'7px',background:'var(--bg-input)',border:'0.5px solid var(--border)',fontSize:'11px',color:'var(--text-primary)',cursor:'pointer',fontFamily:'inherit'}}>
                  📎 {archivoNota ? archivoNota.name.slice(0,18)+'...' : n.archivo_nombre ? 'Cambiar archivo' : 'Adjuntar'}
                </button>
                {n.archivo_url && !archivoNota && (
                  <a href={verArchivo(n.archivo_url)} target="_blank" rel="noopener noreferrer" style={{fontSize:'11px',color:'var(--accent)',fontWeight:600}}>Ver actual</a>
                )}
              </div>
              <div style={{display:'flex',gap:'8px',justifyContent:'flex-end'}}>
                <button onClick={() => { setEditandoNota(null); setArchivoNota(null) }}
                  style={{padding:'7px 14px',borderRadius:'8px',border:'0.5px solid var(--border)',background:'transparent',fontSize:'12px',color:'var(--text-secondary)',cursor:'pointer',fontFamily:'inherit'}}>
                  Cancelar
                </button>
                <button onClick={() => guardarEdicionNota(n)} disabled={subiendoNotaArchivo}
                  style={{padding:'7px 14px',borderRadius:'8px',border:'none',background:'linear-gradient(135deg,var(--accent),var(--accent-2))',color:'white',fontSize:'12px',fontWeight:700,cursor:'pointer',fontFamily:'inherit',opacity:subiendoNotaArchivo?0.6:1}}>
                  {subiendoNotaArchivo ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 style={{fontSize:'18px',fontWeight:800,color:'var(--text-primary)',marginBottom:'12px',fontFamily:"'Manrope',sans-serif"}}>{n.titulo}</h3>
              {n.contenido && (
                <div style={{fontSize:'13px',color:'var(--text-primary)',lineHeight:'1.8',whiteSpace:'pre-wrap',marginBottom:'16px'}}>
                  {n.contenido}
                </div>
              )}
              {n.archivo_url && !tieneImagen && (
                <a href={verArchivo(n.archivo_url)} target="_blank" rel="noopener noreferrer"
                  style={{display:'inline-block',fontSize:'12px',color:'var(--accent)',fontWeight:600,marginBottom:'16px'}}>
                  📎 {n.archivo_nombre || 'Ver archivo'}
                </a>
              )}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderTop:'0.5px solid var(--border-light)',paddingTop:'12px',marginTop:'8px'}}>
                <span style={{fontSize:'10px',color:'var(--text-muted)'}}>
                  {new Date(n.created_at).toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'})}
                </span>
                <div style={{display:'flex',gap:'6px'}}>
                  <button onClick={() => { setEditandoNota(n.id); setEditTitulo(n.titulo); setEditContenido(n.contenido||''); setArchivoNota(null) }}
                    style={{width:'26px',height:'26px',border:'0.5px solid var(--border)',borderRadius:'7px',background:'var(--bg-input)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--accent)'}}>
                    <Pencil size={10}/>
                  </button>
                  <button onClick={() => { borrarNota(n.id); setNotaModalAbierta(null) }}
                    style={{width:'26px',height:'26px',border:'0.5px solid #EF4444',borderRadius:'7px',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#EF4444'}}>
                    <Trash2 size={10}/>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      {imagenExpandida && (
        <div onClick={() => setImagenExpandida(false)}
          style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',zIndex:600,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',cursor:'zoom-out'}}>
          <img src={verArchivo(n.archivo_url)} alt=""
            style={{maxWidth:'100%',maxHeight:'100%',borderRadius:'8px',boxShadow:'0 20px 60px rgba(0,0,0,0.6)'}}/>
        </div>
      )}
    </div>
  )
})()}

      {/* MODAL NUEVO TURNO */}
      {modalOpen && (
        <div className="mo-overlay" onClick={() => setModalOpen(false)}>
          <div className="mo-box" onClick={e => e.stopPropagation()}>
            <div className="mo-hdr">
              <span className="mo-title">Agendar turno</span>
              <button className="mo-close" onClick={() => setModalOpen(false)}><X size={12}/></button>
            </div>
            <div className="field" style={{position:'relative'}}>
              <label>Nombre del paciente</label>
              <input placeholder="Ej: María López" value={nuevoTurno.pacienteNombre}
                onChange={e => { setNuevoTurno({...nuevoTurno, pacienteNombre: e.target.value, pacienteDbId: ''}); buscarSugerencias(e.target.value) }}
                onFocus={() => buscarSugerencias(nuevoTurno.pacienteNombre)}
                onBlur={() => setTimeout(() => setShowSugerencias(false), 150)}
                autoComplete="off"/>
              {showSugerencias && (
                <div className="sug-list" ref={sugerenciasRef}>
                  {sugerencias.map(p => (
                    <div key={p.id} className="sug-item" onMouseDown={() => seleccionarPaciente(p)}>
                      <span>{p.nombre} {p.apellido}</span>
                      <span className="sug-item-sub">{p.celular ? `📱 ${p.celular}` : ''}{p.alias ? ` · #${p.alias}` : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="field-row">
              <div className="field">
              <label>Celular (con código de país)</label>
                <input placeholder="Ej: 5492236789012" value={nuevoTurno.pacienteCelular}
                  onChange={e => { setNuevoTurno({...nuevoTurno, pacienteCelular: e.target.value}); buscarSugerencias(e.target.value) }}/>
              </div>
              <div className="field">
                <label>Fecha</label>
                <input type="date" value={nuevoTurno.fecha}
                  onChange={e => setNuevoTurno({...nuevoTurno, fecha: e.target.value})}/>
              </div>
            </div>
            {avisoDia && (
              <div role="status" style={{display:'flex',gap:'8px',alignItems:'flex-start',margin:'-4px 0 12px',fontSize:'12px',lineHeight:1.45,color:'#92400E',background:'#FFFBEB',border:'0.5px solid #FDE68A',borderRadius:'10px',padding:'9px 11px'}}>
                <Info size={14} style={{flexShrink:0,marginTop:'1px'}}/><span>{avisoDia}</span>
              </div>
            )}
            <div className="field-row">
            {servicios.find(s => s.nombre === nuevoTurno.servicio)?.tipo_servicio !== 'entrega' && (
     <div className="field">
       <label>Hora</label>
      <input type="time" value={nuevoTurno.hora}
        onChange={e => setNuevoTurno({...nuevoTurno, hora: e.target.value})}/>
    </div>
  )}
  {servicios.find(s => s.nombre === nuevoTurno.servicio)?.tipo_servicio !== 'entrega' && (
     <div className="field">
       <label>Duración (min)</label>
      <input type="number" value={nuevoTurno.duracion}
        onChange={e => setNuevoTurno({...nuevoTurno, duracion: Number(e.target.value)})}/>
    </div>
  )}
</div>
<div className="field">
              <label>Servicio</label>
              <select value={nuevoTurno.servicio}
                onChange={e => {
                  const s = servicios.find(sv => sv.nombre === e.target.value)
                  setNuevoTurno({...nuevoTurno, servicio: e.target.value, servicioId: s?.id||'', precio: s?.precio_base||0, duracion: s?.duracion_estimada||60, hora: s?.tipo_servicio === 'entrega' ? '00:00' : ''})
                }}>
                {servicios.length === 0 && <option>Sin servicios cargados</option>}
                {servicios.map(s => <option key={s.id} value={s.nombre}>{s.nombre} · ${s.precio_base?.toLocaleString()}</option>)}
              </select>
            </div>

            {servicios.find(s => s.nombre === nuevoTurno.servicio)?.tipo_servicio === 'entrega' && (
              <div style={{
                background:'#EFF6FF', border:'0.5px solid #BFDBFE',
                borderRadius:'10px', padding:'10px 12px',
                fontSize:'12px', color:'#1D4ED8', lineHeight:'1.6',
                marginBottom:'13px'
              }}>
              Este servicio es de entrega. No requiere horario — se agendará automáticamente y podés tener varias entregas el mismo día sin conflictos.
              </div>
            )}

            <div className="field">
              <label>Estado de pago</label>
              <select value={nuevoTurno.pago} onChange={e => setNuevoTurno({...nuevoTurno, pago: e.target.value as Pago})}>
                <option value="pendiente">⚡ Pendiente</option>
                <option value="señado">💛 Señado</option>
                <option value="pagado">✓ Pagado</option>
              </select>
            </div>
            {nuevoTurno.pago === 'señado' && (
              <div className="field">
                <label>Monto de la seña ($)</label>
                <input type="number" placeholder="Ej: 1500" value={nuevoTurno.sena||''}
                  onChange={e => setNuevoTurno({...nuevoTurno, sena: Number(e.target.value)})}/>
              </div>
            )}
            <div className="field">
              <label>Contexto inicial</label>
              <textarea placeholder="¿De qué quiere hablar?" value={nuevoTurno.contexto}
                onChange={e => setNuevoTurno({...nuevoTurno, contexto: e.target.value})}/>
            </div>
            <button className="save-btn" onClick={guardarTurno} disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar turno'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL EDITAR FECHA */}
      {editandoFecha && turnoSeleccionado && (
        <div className="mo-overlay" onClick={() => setEditandoFecha(false)}>
          <div className="mo-box" style={{width:'340px'}} onClick={e => e.stopPropagation()}>
            <div className="mo-hdr">
              <span className="mo-title">Editar fecha y hora</span>
              <button className="mo-close" onClick={() => setEditandoFecha(false)}><X size={12}/></button>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Nueva fecha</label>
                <input type="date" value={nuevaFechaEditar} onChange={e => setNuevaFechaEditar(e.target.value)}/>
              </div>
              <div className="field">
                <label>Nueva hora</label>
                <input type="time" value={nuevaHoraEditar} onChange={e => setNuevaHoraEditar(e.target.value)}/>
              </div>
            </div>
            <button className="save-btn" onClick={() => editarFechaHora(turnoSeleccionado.id, nuevaFechaEditar, nuevaHoraEditar)}>
              Guardar cambios
            </button>
          </div>
        </div>
      )}

      {/* MODAL BORRAR */}
      {borrarConfirm && turnoSeleccionado && (
        <div className="mo-overlay" onClick={() => setBorrarConfirm(false)}>
          <div className="mo-box" style={{width:'340px'}} onClick={e => e.stopPropagation()}>
            <div className="mo-hdr">
              <span className="mo-title">¿Eliminar este turno?</span>
              <button className="mo-close" onClick={() => setBorrarConfirm(false)}><X size={12}/></button>
            </div>
            <p style={{fontSize:'13px',color:'var(--text-secondary)',marginBottom:'20px',lineHeight:'1.6'}}>
              Se eliminará el turno de <strong>{turnoSeleccionado.pacienteNombre}</strong> del {new Date(turnoSeleccionado.fecha+'T12:00:00').toLocaleDateString('es-AR',{day:'numeric',month:'long'})}. Esta acción no se puede deshacer.
            </p>
            <div style={{display:'flex',gap:'8px'}}>
              <button onClick={() => setBorrarConfirm(false)}
                style={{flex:1,padding:'11px',borderRadius:'10px',border:'0.5px solid var(--border)',background:'var(--bg-card)',fontSize:'13px',cursor:'pointer',fontFamily:'inherit',color:'var(--text-secondary)'}}>
                Cancelar
              </button>
              <button onClick={() => borrarTurno(turnoSeleccionado.id)}
                style={{flex:1,padding:'11px',borderRadius:'10px',border:'none',background:'#EF4444',color:'white',fontSize:'13px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit'}}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HISTORIAL */}
      {historialOpen && turnoSeleccionado && (
        <div className="mo-overlay" onClick={() => setHistorialOpen(false)}>
          <div className="hist-box" onClick={e => e.stopPropagation()}>
            <div className="mo-hdr">
              <div>
                <div className="mo-title">{turnoSeleccionado.pacienteNombre}</div>
                <div style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'2px'}}>Historial completo · #{turnoSeleccionado.pacienteId}</div>
              </div>
              <button className="mo-close" onClick={() => setHistorialOpen(false)}><X size={12}/></button>
            </div>
            <div className="hist-sessions">
              <div className="hist-sc current">
                <div className="hist-sc-top">
                  <span className="hist-sc-date">Sesión actual</span>
                  <span className="hist-sc-serv">{turnoSeleccionado.servicio}</span>
                </div>
                <div className="hist-sc-ctx">{turnoSeleccionado.contexto || 'Sin contexto aún.'}</div>
              </div>
              {turnoSeleccionado.historial?.map((h,i) => (
                <div key={i} className="hist-sc">
                  <div className="hist-sc-top">
                    <span className="hist-sc-date">{h.fecha}</span>
                    <span className="hist-sc-serv">{h.servicio}</span>
                  </div>
                  <div className="hist-sc-ctx">{h.contexto}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}



{/* MODAL PLAN VENCIDO */}
{trialVencido && <BloqueoPlan tipo={tipoPlan} />}
    </>
  )
}
