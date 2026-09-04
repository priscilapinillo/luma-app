'use client'

import { toast } from '@/components/ToastProvider'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft, ChevronRight, Expand, Check, Search, X,
  Mic, Pencil, Trash2, Plus
} from 'lucide-react'
import { createClient } from '@/lib/supabase'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS_SEMANA = ['dom','lun','mar','mié','jue','vie','sáb']

type Pago = 'pendiente' | 'señado' | 'pagado'
type SesionHistorial = { fecha: string; servicio: string; contexto: string }
type Turno = {
  id: string; pacienteId: string; pacienteNombre: string; pacienteDbId?: string
  fecha: string; hora: string; duracion: number
  servicio: string; precio: number; contexto: string
  pago: Pago; sena: number; metodo_pago?: string; realizado: boolean
  historial?: SesionHistorial[]
  created_at?: string
origen?: string
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
  const [trialVencido, setTrialVencido] = useState(false)
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
  const sugerenciasRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const [archivos, setArchivos] = useState<Archivo[]>([])
  const [subiendoArchivo, setSubiendoArchivo] = useState(false)
  const archivoInputRef = useRef<HTMLInputElement>(null)
  const [grabando, setGrabando] = useState(false)
  const [sessionNotes, setSessionNotes] = useState<{id:string;titulo:string;contenido:string;archivo_url:string|null;archivo_tipo:string|null;archivo_nombre:string|null;created_at:string}[]>([])
const [nuevaNota, setNuevaNota] = useState('')
const [nuevoTitulo, setNuevoTitulo] = useState('')
const [tabDetalle, setTabDetalle] = useState<'contexto'|'notas'>('contexto')
const [editandoNota, setEditandoNota] = useState<string|null>(null)
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
          supabase.from('therapist_profiles').select('nombre_profesional, pagina_activa').eq('user_id', user.id).maybeSingle(),
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
          const yaVioOnboarding = localStorage.getItem('luma-onboarding-done')
          if (!yaVioOnboarding) {
            setOnboardingChecks({
              servicio: (servs?.length || 0) > 0,
              disponibilidad: (avail?.length || 0) > 0,
              pagina: prof?.pagina_activa || false,
            })
            setShowOnboarding(true)
          }
        if (tsks) setTasks(tsks.map((t: any) => ({ id: t.id, texto: t.texto, completada: t.completada })))
        if (avail) setDisponibilidad(avail)
        if (prof?.nombre_profesional) setNombreTerapeuta(prof.nombre_profesional)
        else setNombreTerapeuta(user.email?.split('@')[0] || '')
        const { data: sub } = await supabase
        .from('subscriptions')
        .select('status, trial_ends_at, current_period_ends_at')
        .eq('user_id', user.id)
        .maybeSingle()
      
      const ahora = new Date()
      const trialVence = sub?.trial_ends_at && new Date(sub.trial_ends_at) < ahora
      const pagoActivo = sub?.status === 'active' && sub?.current_period_ends_at && new Date(sub.current_period_ends_at) > ahora
      if (trialVence && !pagoActivo) setTrialVencido(true)

        if (sesiones) {
          const cobrado = sesiones
            .filter((s: any) => s.estado_pago === 'pagado' && s.fecha >= mesInicio && s.fecha <= mesFin)
            .reduce((acc: number, s: any) => acc + (s.precio || 0), 0)
          const pendiente = sesiones
            .filter((s: any) => s.estado_pago === 'pendiente' && s.fecha >= mesInicio && s.fecha <= mesFin)
            .reduce((acc: number, s: any) => acc + (s.precio || 0), 0)
          setIngresosMes(cobrado)
          setPendientesMes(pendiente)
        }

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
    const dispHoy = disponibilidad.find(d => d.dia_semana === diaSemana)
    if (!dispHoy || !dispHoy.activo) return null
    const turnosHoyList = turnos.filter(t => t.fecha === formatDate(hoy)).sort((a, b) => horaAMin(a.hora) - horaAMin(b.hora))
    const inicioDisp = horaAMin(dispHoy.hora_inicio)
    const finDisp = horaAMin(dispHoy.hora_fin)
    const durMin = servicios.length > 0 ? Math.round(servicios.reduce((a, s) => a + (s.duracion_estimada || 60), 0) / servicios.length) : 60
    let cursor = inicioDisp
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
    if (!turno) return
    const supabase = createClient()
    const { error } = await supabase.from('sessions').update({ realizado: !turno.realizado }).eq('id', id)
    if (error) { console.error('Error actualizando realizado:', error); return }
    setTurnos(prev => prev.map(t => t.id === id ? {...t, realizado: !t.realizado} : t))
    if (turnoSeleccionado?.id === id) setTurnoSeleccionado(prev => prev ? {...prev, realizado: !prev.realizado} : prev)
  }

  async function updatePago(id: string, pago: Pago) {
    const supabase = createClient()
    const turno = turnos.find(t => t.id === id)
    const { error } = await supabase.from('sessions').update({ estado_pago: pago }).eq('id', id)
    if (!error) {
      setTurnos(prev => prev.map(t => t.id === id ? {...t, pago} : t))
      setTurnoSeleccionado(prev => prev?.id === id ? {...prev, pago} : prev)
      if (turno) {
        const precio = turno.precio || 0
        if (pago === 'pagado') {
          setIngresosMes(prev => prev + precio)
          if (turno.pago === 'pendiente') setPendientesMes(prev => Math.max(0, prev - precio))
        } else if (pago === 'pendiente' && turno.pago === 'pagado') {
          setIngresosMes(prev => Math.max(0, prev - precio))
          setPendientesMes(prev => prev + precio)
        }
      }
    }
  }

  async function updateSena(id: string, sena: number) {
    const supabase = createClient()
    const { error } = await supabase.from('sessions').update({ sena }).eq('id', id)
    if (!error) {
      setTurnos(prev => prev.map(t => t.id === id ? {...t, sena} : t))
      setTurnoSeleccionado(prev => prev?.id === id ? {...prev, sena} : prev)
    }
  }

  async function updateContexto(id: string, contexto: string) {
    const supabase = createClient()
    const { error } = await supabase.from('sessions').update({ contexto_sesion: contexto }).eq('id', id)
    if (error) console.error('Error guardando contexto:', error)
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
  
  async function guardarEdicionNota(id: string) {
    const supabase = createClient()
    await supabase.from('session_notes').update({ titulo: editTitulo, contenido: editContenido }).eq('id', id)
    setSessionNotes(prev => prev.map(n => n.id === id ? {...n, titulo: editTitulo, contenido: editContenido} : n))
    setEditandoNota(null)
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
    if (hayConflicto) { toast('⚠️ Ya tenés un turno en ese horario.'); return }
    const supabase = createClient()
    await supabase.from('sessions').update({ fecha: fecha+'T'+hora+':00', hora }).eq('id', id)
    setTurnos(prev => prev.map(t => t.id === id ? {...t, fecha, hora} : t))
    setTurnoSeleccionado(prev => prev?.id === id ? {...prev, fecha, hora} : prev)
    setEditandoFecha(false)
  }

  async function borrarTurno(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('sessions').delete().eq('id', id)
    if (error) { console.error('Error borrando turno:', error); toast('No se pudo eliminar el turno.'); return }
    setTurnos(prev => prev.filter(t => t.id !== id))
    setTurnoSeleccionado(null)
    setBorrarConfirm(false)
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
    if (!nuevoTurno.pacienteNombre) { toast('Completá el nombre del paciente'); return }
    if (!nuevoTurno.hora && !esEntrega) { toast('Completá la hora del turno'); return }
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
    if (hayConflicto) { toast('⚠️ Ya tenés un turno en ese horario.'); return }
    setGuardando(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let pacienteDbId = nuevoTurno.pacienteDbId
    if (!pacienteDbId) {
      const partes = nuevoTurno.pacienteNombre.trim().split(' ')
      const { data: nuevoPac } = await supabase.from('patients').insert({
        user_id: user.id, nombre: partes[0], apellido: partes.slice(1).join(' '),
        celular: nuevoTurno.pacienteCelular,
        alias: nuevoTurno.pacienteCelular ? nuevoTurno.pacienteCelular.slice(-4) : '',
        contexto_general: '',
      }).select().single()
      if (nuevoPac) { pacienteDbId = nuevoPac.id; setPacientes(prev => [...prev, nuevoPac]) }
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

    if (error) { console.error(error); setGuardando(false); return }

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
      historial: turnos.filter(t => {
        if (t.pacienteDbId !== pacienteDbId || t.id === nuevaSesion.id) return false
        return new Date(t.fecha?.split('T')[0]+'T12:00:00') < new Date(nuevoTurno.fecha+'T12:00:00')
      }).sort((a, b) => new Date(b.fecha?.split('T')[0]+'T12:00:00').getTime() - new Date(a.fecha?.split('T')[0]+'T12:00:00').getTime())
      .map(t => ({ fecha: new Date(t.fecha+'T12:00:00').toLocaleDateString('es-AR', { day:'numeric', month:'long' }), servicio: t.servicio, contexto: t.contexto })),
    }
    setTurnos(prev => [...prev, nuevo])
    setTurnoSeleccionado(nuevo)
    setModalOpen(false)
    setGuardando(false)
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

  const entregasPendientes = turnos.filter(t => {
    const s = servicios.find(sv => sv.nombre === t.servicio) as any
    return s?.tipo_servicio === 'entrega' && !t.realizado
  })

  const widgetFinanzas = (
    <div className="widget-card widget-ingresos" style={{background:'#FFFBEB',borderColor:'#FDE68A'}}>
      <div className="widget-blob" style={{width:'70px',height:'70px',background:'#F59E0B',top:'-15px',right:'-15px'}}/>
      <div className="widget-label" style={{color:'#B45309'}}>Ingresos · {mesNombre}</div>
      <div className="widget-title" style={{color:'#92400E'}}>${ingresosMes.toLocaleString()}</div>
      <div className="widget-sub" style={{color:'#B45309'}}>cobrados · <span style={{color:'#EF4444',fontWeight:600}}>${pendientesMes.toLocaleString()} pend.</span></div>
      <button className="widget-pill" style={{background:'#FEF3C7',color:'#92400E'}} onClick={() => window.location.href='/finances'}>Ver finanzas →</button>
    </div>
  )

  const widgetDisponibilidad = (
    <div className="widget-card widget-espacio" style={{background:'#F0FFF8',borderColor:'#BBF7D0'}}>
      <div className="widget-blob" style={{width:'60px',height:'60px',background:'#10B981',top:'-12px',right:'-12px'}}/>
      <div className="widget-label" style={{color:'#059669'}}>Disponibilidad hoy</div>
      {!disponibilidad.find(d => d.dia_semana === hoy.getDay())?.activo ? (<>
        <div className="widget-title" style={{color:'#166534',fontSize:'13px'}}>Día libre 🌿</div>
        <div className="widget-sub" style={{color:'#059669'}}>No trabajás hoy</div>
      </>) : proximoEspacioLibre ? (<>
        <div className="widget-title" style={{color:'#166534',fontSize:'13px'}}>¡Tenés lugar!</div>
        <div className="widget-sub" style={{color:'#059669'}}>Próximo: <strong>{proximoEspacioLibre} hs</strong></div>
      </>) : (<>
        <div className="widget-title" style={{color:'#166534',fontSize:'13px'}}>Agenda completa 🎉</div>
        <div className="widget-sub" style={{color:'#059669'}}>Sin espacios hoy</div>
      </>)}
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap');
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
        .wc{background:var(--accent-light);border-radius:16px;padding:13px 16px;border:0.5px solid var(--border);flex-shrink:0;position:relative;overflow:hidden}
        .wc-blob{position:absolute;border-radius:50%;background:var(--accent);opacity:0.12;width:80px;height:80px;top:-20px;right:-20px;pointer-events:none}
        .wc-h{font-size:16px;font-weight:800;color:var(--accent);font-family:'Manrope',sans-serif}
        .wc-s{font-size:12px;color:var(--text-secondary);margin-top:3px}
        .sr{position:relative;flex-shrink:0}
        .si{width:100%;padding:9px 32px 9px 12px;border-radius:11px;border:0.5px solid var(--border);font-size:13px;background:var(--bg-input);color:var(--text-primary);outline:none;font-family:inherit}
        .si:focus{border-color:var(--accent)}
        .sico{position:absolute;right:11px;top:50%;transform:translateY(-50%);color:var(--text-muted);pointer-events:none}
        .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;flex-shrink:0}
        .st{background:var(--bg-card);border-radius:14px;padding:10px 12px;border:0.5px solid var(--border-light);text-align:center;box-shadow:0 2px 10px var(--shadow)}
        .st.ac{background:var(--accent-light);border-color:var(--border)}
        .st-l{font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px}
        .st.ac .st-l{color:var(--text-secondary)}
        .st-n{font-size:22px;font-weight:800;color:var(--text-primary);font-family:'Manrope',sans-serif}
        .st.ac .st-n{color:var(--accent)}
        .widget-card{border-radius:20px;padding:14px 16px;border:0.5px solid;position:relative;overflow:hidden;flex-shrink:0}
        html.dark .widget-ingresos{background:#1A1200 !important;border-color:#3D2E00 !important}
        html.dark .widget-ingresos .widget-label{color:#FCD34D !important}
        html.dark .widget-ingresos .widget-title{color:#FDE68A !important}
        html.dark .widget-ingresos .widget-sub{color:#FCA5A5 !important}
        html.dark .widget-ingresos .widget-pill{background:#2D1F00 !important;color:#FCD34D !important}
        html.dark .widget-espacio{background:#052015 !important;border-color:#065f46 !important}
        html.dark .widget-espacio .widget-label{color:#6EE7B7 !important}
        html.dark .widget-espacio .widget-title{color:#A7F3D0 !important}
        html.dark .widget-espacio .widget-sub{color:#6EE7B7 !important}
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
        .day.ac{background:linear-gradient(135deg,#8B5CF6,#A78BFA);border-color:#8B5CF6;box-shadow:0 6px 16px rgba(139,92,246,0.35);transform:translateY(-1px)}
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
        .tdot{width:7px;height:7px;border-radius:50%;background:linear-gradient(135deg,#8B5CF6,#A78BFA);flex-shrink:0}
        .tb{flex:1;min-width:0}
        .tn{font-size:13px;font-weight:600;color:var(--text-primary);font-family:'Manrope',sans-serif}
        .ts2{font-size:11px;color:var(--text-muted);margin-top:1px}
        .ttags{display:flex;gap:3px;margin-top:4px;flex-wrap:wrap}
        .tg{font-size:10px;padding:2px 8px;border-radius:20px;border:0.5px solid}
        .tg-s{background:var(--accent-light);color:var(--accent);border-color:var(--border)}
        .tag-p{background:#FEF9C3;color:#854D0E;border-color:#FDE68A}
        .tag-ok{background:#DCFCE7;color:#166534;border-color:#BBF7D0}
        .tag-d{background:#DBEAFE;color:#1E40AF;border-color:#BFDBFE}
        .chk{width:24px;height:24px;border-radius:50%;border:0.5px solid var(--border);background:var(--bg-card);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:all 0.15s}
        .chk.ok{background:#DCFCE7;border-color:#BBF7D0;color:#166534}
        .ab{background:var(--bg-card);border:1.5px dashed var(--border);border-radius:14px;padding:10px;text-align:center;font-size:12px;color:var(--text-muted);cursor:pointer;width:100%;font-family:inherit;flex-shrink:0;transition:all 0.15s;margin-top:2px}
        .ab:hover{border-color:var(--accent);color:var(--accent)}
        .tasks-card{background:#FFFBEB;border-radius:20px;padding:14px 16px;border:0.5px solid #FDE68A;position:relative;overflow:hidden;flex-shrink:0}
        html.dark .tasks-card{background:#1A1200;border-color:#3D2E00}
        .tasks-blob{position:absolute;border-radius:50%;background:#F59E0B;opacity:0.2;pointer-events:none}
        .tasks-label{font-size:9px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#B45309;margin-bottom:8px}
        html.dark .tasks-label{color:#FCD34D}
        .task-item{display:flex;align-items:center;gap:8px;margin-bottom:7px}
        .task-cb{width:16px;height:16px;border-radius:5px;border:1.5px solid #FDE68A;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all 0.15s;background:transparent}
        .task-cb.done{background:#8B5CF6;border-color:#8B5CF6;color:white}
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
       .mo-overlay{position:fixed;inset:0;background:rgba(26,16,53,0.5);display:flex;align-items:center;justify-content:center;z-index:100;backdrop-filter:blur(4px);overflow:hidden}
        .mo-box{background:var(--bg-card);border-radius:22px;padding:24px;width:440px;max-height:88vh;overflow-y:auto;box-shadow:0 32px 80px rgba(100,60,200,0.25)}
        .mo-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
        .mo-title{font-size:15px;font-weight:700;color:var(--text-primary);font-family:'Manrope',sans-serif}
        .mo-close{width:28px;height:28px;border-radius:8px;border:0.5px solid var(--border);background:var(--bg-card);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-muted)}
        .field{display:flex;flex-direction:column;gap:5px;margin-bottom:13px;position:relative}
        .field label{font-size:12px;font-weight:600;color:var(--text-primary)}
        .field input,.field select,.field textarea{padding:9px 11px;border-radius:10px;border:0.5px solid var(--border);font-size:13px;font-family:inherit;color:var(--text-primary);background:var(--bg-input);outline:none;width:100%}
        .field input:focus,.field select:focus,.field textarea:focus{border-color:var(--accent)}
        .field textarea{min-height:65px;resize:none}
        .field-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .save-btn{width:100%;padding:11px;background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:white;border:none;border-radius:11px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 4px 14px rgba(139,92,246,0.35);transition:all 0.15s}
        .save-btn:hover{box-shadow:0 6px 20px rgba(139,92,246,0.45);transform:translateY(-1px)}
        .save-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none}
        .sug-list{position:absolute;top:100%;left:0;right:0;background:var(--bg-card);border:0.5px solid var(--border);border-radius:10px;box-shadow:0 8px 24px var(--shadow);z-index:50;overflow:hidden;margin-top:3px}
        .sug-item{padding:9px 12px;font-size:12px;color:var(--text-primary);cursor:pointer;display:flex;flex-direction:column;gap:2px;border-bottom:0.5px solid var(--border-light)}
        .sug-item:last-child{border-bottom:none}
        .sug-item:hover{background:var(--accent-hover)}
        .sug-item-sub{font-size:10px;color:var(--text-muted)}
        .hist-box{background:var(--bg-card);border-radius:22px;padding:24px;width:600px;max-height:85vh;overflow-y:auto;box-shadow:0 32px 80px rgba(100,60,200,0.25)}
        .hist-sessions{display:flex;flex-direction:column;gap:10px;margin-top:12px}
        .hist-sc{background:var(--bg-input);border-radius:14px;padding:14px;border:0.5px solid var(--border)}
        .hist-sc.current{border-color:var(--accent);background:var(--bg-card)}
        .hist-sc-top{display:flex;justify-content:space-between;margin-bottom:7px}
        .hist-sc-date{font-size:12px;font-weight:600;color:var(--accent)}
        .hist-sc-serv{font-size:11px;color:var(--text-muted)}
        .hist-sc-ctx{font-size:12px;color:var(--text-primary);line-height:1.6}
      `}</style>

      <div className="dw">
        {/* COLUMNA IZQUIERDA */}
        <div className="dl">
          <div className="wc">
            <div className="wc-blob"/>
            <div className="wc-h">¡{saludoHora()}, {nombreTerapeuta}! ✨</div>
            <div className="wc-s">Tenés {turnosHoy} sesiones hoy · Todo listo para empezar</div>
          </div>

          <div className="sr">
            <input className="si" placeholder="Buscar paciente, alias o servicio..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
            <span className="sico"><Search size={13}/></span>
          </div>

          <div className="stats">
            <div className="st ac"><div className="st-l">Hoy</div><div className="st-n">{turnosHoy}</div></div>
            <div className="st"><div className="st-l">Mañana</div><div className="st-n">{turnosManana}</div></div>
            <div className="st"><div className="st-l">Pasado</div><div className="st-n">{turnosPasado}</div></div>
          </div>

          {/* WIDGETS */}
          {entregasPendientes.length === 0 ? (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',flexShrink:0}}>
              {widgetFinanzas}
              {widgetDisponibilidad}
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:'10px',flexShrink:0}}>
           <div style={{background:'#EFF6FF',borderRadius:'20px',padding:'14px 16px',border:'0.5px solid #BFDBFE',position:'relative',display:'flex',flexDirection:'column',maxHeight:'160px'}}>
                <div style={{position:'absolute',borderRadius:'50%',background:'#3B82F6',opacity:0.2,width:'60px',height:'60px',top:'-12px',right:'-12px',pointerEvents:'none'}}/>
                <div style={{fontSize:'10px',fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:'#1D4ED8',marginBottom:'10px',flexShrink:0}}>📦 Entregas pendientes</div>
                <div style={{overflowY:'auto',flex:1}}>
                {entregasPendientes.slice(0,10).sort((a, b) => {
                  const sA = servicios.find(sv => sv.nombre === a.servicio) as any
                  const sB = servicios.find(sv => sv.nombre === b.servicio) as any
                  const plazoA = sA?.plazo_horas || 48
                  const plazoB = sB?.plazo_horas || 48
                  const venceA = new Date((a.created_at ? new Date(a.created_at) : new Date()).getTime() + plazoA * 3600000)
                  const venceB = new Date((b.created_at ? new Date(b.created_at) : new Date()).getTime() + plazoB * 3600000)
                  return venceA.getTime() - venceB.getTime()
                }).map((t,i) => {
                  const s = servicios.find(sv => sv.nombre === t.servicio) as any
                  const plazoHoras = s?.plazo_horas || 48
                 
                  const createdStr = t.created_at || ''
const rawCreated = createdStr.includes('+') || createdStr.includes('Z')
  ? createdStr
  : createdStr + '+00:00'
const creadoEn = createdStr ? new Date(rawCreated) : new Date()
                  const venceEn = new Date(creadoEn.getTime() + plazoHoras * 60 * 60 * 1000)
                  const restanMs = venceEn.getTime() - new Date().getTime()
                  const restanHoras = Math.floor(restanMs / (1000 * 60 * 60))
                  const restanMin = Math.floor((restanMs % (1000 * 60 * 60)) / (1000 * 60))
                  const vencido = restanMs < 0
                  const urgente = restanHoras < 6 && !vencido
                  return (
                    <div key={i} style={{background:'rgba(255,255,255,0.6)',borderRadius:'10px',padding:'5px 8px',marginBottom:'4px',border:`0.5px solid ${vencido?'#FECACA':urgente?'#FDE68A':'#BFDBFE'}`}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'2px'}}>
                        <span style={{fontSize:'11px',fontWeight:600,color:'#1E40AF'}}>{t.pacienteNombre}</span>
                        <span style={{fontSize:'9px',fontWeight:700,color:vencido?'#EF4444':urgente?'#D97706':'#2563EB'}}>
                          {vencido ? '⚠️ Vencido' : urgente ? `⚡ ${restanHoras}h ${restanMin}m` : `${restanHoras}h restantes`}
                        </span>
                      </div>
                      <div style={{fontSize:'9px',color:'#60A5FA'}}>{t.servicio}</div>
                    </div>
                                    )
                                  })}
                                </div>
              
                
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                {widgetFinanzas}
                {widgetDisponibilidad}
              </div>
            </div>
          )}

          <div className="cal-r">
            <button className="ca" onClick={() => setMesOffset(o => Math.max(0,o-1))}><ChevronLeft size={11}/></button>
            <div className="mons">
              {MESES.slice(mesOffset, mesOffset+5).map((mes,i) => {
                const real = mesOffset+i
                return <button key={mes} className={`mo${mesIdx===real?' ac':''}`} onClick={() => cambiarMes(real)}>{mes.slice(0,3)}</button>
              })}
            </div>
            <button className="ca" onClick={() => setMesOffset(o => Math.min(7,o+1))}><ChevronRight size={11}/></button>
          </div>

          <div className="days-r">
            <button className="ca" onClick={() => setDiaOffset(o => Math.max(0,o-1))}><ChevronLeft size={11}/></button>
            <div className="days">
              {Array.from({length:diasDelMes}).slice(diaOffset, diaOffset+6).map((_,i) => {
                const dia = diaOffset+i+1
                const fecha = `${hoy.getFullYear()}-${String(mesIdx+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
                const diaSemana = new Date(hoy.getFullYear(), mesIdx, dia).getDay()
                const tieneTurnos = turnos.some(t => t.fecha === fecha)
                const esSel = dia === diaSeleccionado
                return (
                  <button key={dia} className={`day${esSel?' ac':''}${tieneTurnos&&!esSel?' ht':''}`} onClick={() => cambiarDia(dia)}>
                    <span className="dn">{dia}</span>
                    <span className="dd">{DIAS_SEMANA[diaSemana]}</span>
                  </button>
                )
              })}
            </div>
            <button className="ca" onClick={() => setDiaOffset(o => Math.min(diasDelMes-6,o+1))}><ChevronRight size={11}/></button>
          </div>

          <div className="tlist">
            {turnosFiltrados.length === 0 && (
              <p style={{fontSize:'12px',color:'var(--text-muted)',textAlign:'center',padding:'12px 0'}}>No hay turnos para este día</p>
            )}
            {turnosFiltrados.map(turno => (
              <div key={turno.id}
                className={`tc${turnoSeleccionado?.id===turno.id?' sel':''}${turno.realizado?' done':''}`}
                onClick={() => {
                  const turnoConHistorial = turnos.find(t => t.id === turno.id)
                  const t2 = turnoConHistorial || turno
                  setTurnoSeleccionado(t2)
                  if (t2.pacienteDbId) { cargarArchivos(t2.pacienteDbId); cargarNotas(t2.pacienteDbId) }
setTabDetalle('contexto')
                }}>
                <div className="tdot"/>
                <div className="tb">
                  <div className="tn">{turno.pacienteNombre}</div>
                  <div className="ts2">
                    {busqueda && <span style={{color:'var(--accent)',marginRight:'4px'}}>{new Date(turno.fecha+'T12:00:00').toLocaleDateString('es-AR',{day:'numeric',month:'short'})} ·</span>}
                    {turno.hora} · {turno.duracion} min
                  </div>
                  <div className="ttags">
                  <span className="tg tg-s">{turno.servicio}</span>
{(() => {
  const s = servicios.find(sv => sv.nombre === turno.servicio) as any
  if (s?.tipo_servicio === 'entrega') return (
    <span className="tg" style={{background:'#EFF6FF',color:'#1D4ED8',borderColor:'#BFDBFE'}}>
      📦 Entrega {s.plazo_horas}h
    </span>
  )
  return (
    <span className="tg" style={{background:'#F0FDF4',color:'#166534',borderColor:'#BBF7D0'}}>
      🔴 En vivo
    </span>
  )
})()}
                    <span className={`tg ${PAGO_CONFIG[turno.pago].cls}`}>{PAGO_CONFIG[turno.pago].label}</span>
                  </div>
                </div>
                <button className={`chk${turno.realizado?' ok':''}`}
                  onClick={e => { e.stopPropagation(); toggleRealizado(turno.id) }}>
                  <Check size={11}/>
                </button>
              </div>
            ))}
            <button className="ab" onClick={() => setModalOpen(true)}>+ Agendar turno</button>
          </div>
        </div>

        {/* COLUMNA DERECHA */}
        <div className="dr">
          {/* TASKS */}
          <div className="tasks-card">
            <div className="tasks-blob" style={{width:'80px',height:'80px',top:'-20px',right:'-20px'}}/>
            <div className="tasks-label">Mis tareas</div>
            {tasks.slice(0,5).map(task => (
              <div key={task.id} className="task-item">
                <button className={`task-cb${task.completada?' done':''}`} onClick={() => toggleTask(task.id)}>
                  {task.completada && <Check size={9}/>}
                </button>
                <span className={`task-txt${task.completada?' done':''}`}>{task.texto}</span>
                <button className="task-del" onClick={() => borrarTask(task.id)}>
                  <X size={10}/>
                </button>
              </div>
            ))}
            <div className="task-input-row">
              <input className="task-input" placeholder="Nueva tarea..."
                value={nuevaTask}
                onChange={e => setNuevaTask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && agregarTask()}/>
              <button className="task-add-btn" onClick={agregarTask}><Plus size={12}/></button>
            </div>
          </div>

          {!turnoSeleccionado ? (
            <div className="re">Seleccioná un turno<br/>para ver el detalle</div>
          ) : (<>
            <div className="rt">
              <div>
                <div className="rid">#{turnoSeleccionado.pacienteId}</div>
                <div className="rdt">{turnoSeleccionado.hora} · {new Date(turnoSeleccionado.fecha+'T12:00:00').toLocaleDateString('es-AR',{day:'numeric',month:'long'})}</div>
              </div>
              <div className="r-actions">
                <button className="rex" onClick={() => { setNuevaFechaEditar(turnoSeleccionado.fecha); setNuevaHoraEditar(turnoSeleccionado.hora); setEditandoFecha(true) }}>
                  <Pencil size={11}/>
                </button>
                <button className="rex danger" onClick={() => setBorrarConfirm(true)}>
                  <Trash2 size={11}/>
                </button>
                <button className="rex" onClick={() => setHistorialOpen(true)}>
                  <Expand size={11}/>
                </button>
              </div>
            </div>

            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
              <div className="rname">{turnoSeleccionado.pacienteNombre}</div>
              {(() => {
                const pac = pacientes.find(p => p.id === turnoSeleccionado.pacienteDbId)
                if (!pac?.celular) return null
                const numero = pac.celular.replace(/\D/g,'')
                const prefijo = numero.startsWith('54') ? '' : '549'
                return (
                  <a href={`https://wa.me/${prefijo}${numero}`} target="_blank" rel="noopener noreferrer"
                    style={{display:'flex',alignItems:'center',gap:'5px',padding:'6px 12px',background:'#DCFCE7',color:'#166534',borderRadius:'10px',fontSize:'11px',fontWeight:'600',textDecoration:'none',border:'0.5px solid #BBF7D0',flexShrink:0}}>
                    💬 WhatsApp
                  </a>
                )
              })()}
            </div>
             
            {turnoSeleccionado.origen === 'pagina_publica' && (
  <div style={{
    background:'#FEF9C3',border:'0.5px solid #FDE68A',
    borderRadius:'12px',padding:'11px 14px',
    fontSize:'12px',color:'#854D0E',lineHeight:'1.6',
    flexShrink:0
  }}>
    ⚠️ Esta persona reservó desde tu página pública pero <strong>aún no completó el pago</strong>. Te recomendamos contactarla para confirmar.
    {(() => {
      const pac = pacientes.find(p => p.id === turnoSeleccionado.pacienteDbId)
      if (!pac?.celular) return null
      const numero = pac.celular.replace(/\D/g,'')
      const prefijo = numero.startsWith('54') ? '' : '549'
      return (
        <a href={`https://wa.me/${prefijo}${numero}?text=Hola%20${encodeURIComponent(turnoSeleccionado.pacienteNombre)}%2C%20te%20escribo%20por%20tu%20reserva%20pendiente%20de%20pago%20%F0%9F%99%8F`}
          target="_blank" rel="noopener noreferrer"
          style={{display:'block',marginTop:'8px',textAlign:'center',padding:'7px',background:'#DCFCE7',color:'#166534',borderRadius:'8px',fontSize:'11px',fontWeight:'600',textDecoration:'none',border:'0.5px solid #BBF7D0'}}>
          💬 Contactar por WhatsApp
        </a>
      )
    })()}
  </div>
)}

            <div className="rbadges">
            <span className="rb rb-s">
  {turnoSeleccionado.servicio} · ${turnoSeleccionado.precio.toLocaleString()}
  {turnoSeleccionado.metodo_pago === 'transferencia' && (
    <span title="Pago por transferencia" style={{marginLeft:'6px'}}>🏦</span>
  )}
</span>
              <select
                className={`pago-dd${turnoSeleccionado.pago==='pagado'?' ok':turnoSeleccionado.pago==='señado'?' dep':''}`}
                value={turnoSeleccionado.pago}
                onChange={e => updatePago(turnoSeleccionado.id, e.target.value as Pago)}>
                <option value="pendiente">⚡ Pendiente</option>
                <option value="señado">💛 Señado</option>
                <option value="pagado">✓ Pagado</option>
              </select>
            </div>

            {turnoSeleccionado.pago === 'señado' && (
              <div className="sena-row">
                <div className="sena-l">Seña abonada</div>
                <div style={{display:'flex',alignItems:'center',gap:'7px'}}>
                  <span style={{fontSize:'11px',color:'#854D0E'}}>$</span>
                  <input className="sena-input" type="number"
                    value={turnoSeleccionado.sena}
                    onChange={e => updateSena(turnoSeleccionado.id, Number(e.target.value))}/>
                  <span className="sena-r">Resta ${Math.max(0,resta).toLocaleString()}</span>
                </div>
              </div>
            )}

           {/* TABS CONTEXTO / NOTAS */}
<div style={{display:'flex',gap:'2px',background:'var(--bg-input)',padding:'3px',borderRadius:'10px',flexShrink:0}}>
  <button onClick={() => setTabDetalle('contexto')} style={{flex:1,padding:'6px',borderRadius:'7px',border:'none',fontSize:'11px',fontWeight:600,cursor:'pointer',fontFamily:'inherit',background:tabDetalle==='contexto'?'var(--bg-card)':'transparent',color:tabDetalle==='contexto'?'var(--accent)':'var(--text-muted)',transition:'all 0.15s'}}>
    Contexto
  </button>
  <button onClick={() => setTabDetalle('notas')} style={{flex:1,padding:'6px',borderRadius:'7px',border:'none',fontSize:'11px',fontWeight:600,cursor:'pointer',fontFamily:'inherit',background:tabDetalle==='notas'?'var(--bg-card)':'transparent',color:tabDetalle==='notas'?'var(--accent)':'var(--text-muted)',transition:'all 0.15s'}}>
    Post-sesión {sessionNotes.length > 0 ? `(${sessionNotes.length})` : ''}
  </button>
</div>

{tabDetalle === 'contexto' && (<>
  <div className="ctxl">Contexto de esta sesión</div>
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
      key={turnoSeleccionado.id}
      className="ea"
      value={contextoLocal}
      onChange={e => setContextoLocal(e.target.value)}
      onBlur={() => updateContexto(turnoSeleccionado.id, contextoLocal)}
      placeholder="Escribí el contexto de esta sesión..."
      autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}/>
  </div>
  <button onClick={() => window.location.href=`/patients?paciente=${turnoSeleccionado.pacienteDbId}`}
    style={{
      width:'100%',padding:'9px',
      background:'var(--bg-input)',
      border:'0.5px solid var(--border)',
      borderRadius:'11px',fontSize:'12px',
      color:'var(--text-secondary)',cursor:'pointer',
      fontFamily:'inherit',flexShrink:0,
      transition:'all 0.15s',
    }}
    onMouseOver={e => { e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.color='var(--accent)' }}
    onMouseOut={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-secondary)' }}>
    Ver historial completo en Pacientes →
  </button>
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
        style={{padding:'5px 12px',background:'linear-gradient(135deg,#8B5CF6,#A78BFA)',color:'white',border:'none',borderRadius:'7px',fontSize:'11px',fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:subiendoNotaArchivo?0.6:1}}>
        {subiendoNotaArchivo ? 'Guardando...' : '+ Guardar ficha'}
      </button>
    </div>
  </div>

 {/* FICHERO */}
{sessionNotes.length === 0 ? (
  <div style={{fontSize:'11px',color:'var(--text-muted)',textAlign:'center',padding:'12px 0'}}>Sin fichas aún</div>
) : (
  <div style={{position:'relative',flexShrink:0,minHeight:`${sessionNotes.length * 32 + 160}px`}}>
    {[...sessionNotes].reverse().map((n, i, arr) => {
      const isActive = editandoNota === n.id || editandoNota === n.id + '_expand'
      const expandida = editandoNota === n.id + '_expand'
      const topBase = i * 32
      const topActive = isActive ? Math.max(0, i * 32 - 20) : topBase
      const FOLDER_COLORS = [
        {tab:'#E9D5FF', body:'var(--bg-card)', border:'rgba(233,213,255,0.3)'},
        {tab:'#C7D2FE', body:'var(--bg-card)', border:'rgba(199,210,254,0.3)'},
        {tab:'#A7F3D0', body:'var(--bg-card)', border:'rgba(167,243,208,0.3)'},
        {tab:'#FBCFE8', body:'var(--bg-card)', border:'rgba(251,207,232,0.3)'},
        {tab:'#FDE68A', body:'var(--bg-card)', border:'rgba(211, 200, 159, 0.3)'},
        {tab:'#BAE6FD', body:'var(--bg-card)', border:'rgba(186,230,253,0.3)'},
      ]
      const color = FOLDER_COLORS[i % FOLDER_COLORS.length]
      return (
        <div key={n.id} style={{
          position:'absolute',
          top: isActive ? `${Math.max(0, topBase - 10)}px` : `${topBase}px`,
          left:0, right:0,
          zIndex: isActive ? 100 : i + 1,
          transition:'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          filter: isActive ? 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))' : 'none',
          transform: isActive ? 'translateY(-12px) scale(1.01)' : 'translateY(0) scale(1)',
        }}>
          {/* PESTAÑA */}
          <div style={{
            display:'inline-flex',alignItems:'center',gap:'5px',
            background: color.tab,
            borderRadius:'7px 12px 0 0',
            padding:'4px 14px 4px 10px',
            fontSize:'10px',fontWeight:700,
            color:'rgba(0,0,0,0.75)',
            marginLeft:`${12 + (i % 4) * 18}px`,
            maxWidth:'160px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
            cursor:'pointer',
            boxShadow:`0 -2px 8px rgba(0,0,0,0.3)`,
            letterSpacing:'0.3px',
          }}
          onClick={() => setEditandoNota(isActive ? null : n.id + '_expand')}>
            {n.archivo_tipo === 'imagen' && '🖼 '}
            {n.archivo_tipo === 'pdf' && '📄 '}
            {n.titulo}
          </div>
          {/* CUERPO DE LA CARPETA */}
          <div style={{
            background:`var(--bg-card)`,
            border:`1px solid ${color.border}`,
            borderRadius:'0 12px 12px 12px',
            padding: isActive ? '14px' : '0 14px',
            maxHeight: isActive ? '400px' : '0px',
            overflow: isActive ? 'auto' : 'hidden',
            transition:'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
            boxShadow:`inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.4)`,
          }}>

            
             {/* PREVIEW cuando está cerrada */}
{!isActive && n.contenido && (
  <div style={{
    padding:'6px 14px 8px',
    fontSize:'10px',
    color:'var(--text-muted)',
    lineHeight:'1.5',
    overflow:'hidden',
    maxHeight:'32px',
    whiteSpace:'nowrap',
    textOverflow:'ellipsis',
  }}>
    {n.contenido.slice(0,80)}
  </div>
)}




            {isActive && (<>
              {editandoNota === n.id ? (
                <>
                  <input value={editTitulo} onChange={e => setEditTitulo(e.target.value)}
                    placeholder="Nombre de la ficha..."
                    style={{width:'100%',border:`0.5px solid ${color.border}`,borderRadius:'8px',padding:'6px 8px',fontSize:'11px',fontWeight:600,color:'var(--text-primary)',background:'var(--bg-input)',outline:'none',fontFamily:'inherit',marginBottom:'7px'}}/>
                  <textarea value={editContenido} onChange={e => setEditContenido(e.target.value)}
                    style={{width:'100%',border:`0.5px solid ${color.border}`,borderRadius:'8px',padding:'7px',fontSize:'11px',color:'var(--text-primary)',background:'var(--bg-input)',outline:'none',resize:'none',height:'80px',fontFamily:'inherit',lineHeight:'1.6'}}/>
                  <div style={{marginTop:'7px',display:'flex',alignItems:'center',gap:'6px'}}>
                    <input ref={notaArchivoRef} type="file" accept="image/*,.pdf,.doc,.docx,audio/*" style={{display:'none'}}
                      onChange={e => setArchivoNota(e.target.files?.[0] || null)}/>
                    <button onClick={() => notaArchivoRef.current?.click()}
                      style={{padding:'3px 9px',borderRadius:'6px',background:'var(--bg-input)',border:`0.5px solid ${color.border}`,fontSize:'10px',color:'var(--text-primary)',cursor:'pointer',fontFamily:'inherit'}}>
                      📎 {archivoNota ? archivoNota.name.slice(0,18)+'...' : n.archivo_nombre ? 'Cambiar' : 'Adjuntar'}
                    </button>
                    {n.archivo_url && !archivoNota && (
                      <a href={n.archivo_url} target="_blank" rel="noopener noreferrer"
                        style={{fontSize:'10px',color:color.tab,textDecoration:'none',fontWeight:600}}>Ver actual</a>
                    )}
                  </div>
                  <div style={{display:'flex',gap:'6px',marginTop:'10px',justifyContent:'flex-end'}}>
                    <button onClick={() => { setEditandoNota(null); setArchivoNota(null) }}
                      style={{padding:'5px 12px',borderRadius:'7px',border:`0.5px solid ${color.border}`,background:'transparent',fontSize:'10px',color:'var(--text-secondary)',cursor:'pointer',fontFamily:'inherit'}}>
                      Cancelar
                    </button>
                    <button onClick={async () => {
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
                      setEditandoNota(null); setArchivoNota(null)
                    }}
                      style={{padding:'5px 12px',borderRadius:'7px',border:'none',background:color.tab,color:'rgba(0,0,0,0.8)',fontSize:'10px',fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                      Guardar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {n.contenido && (
                    <div style={{fontSize:'12px',color:'var(--text-primary)',lineHeight:'1.7',whiteSpace:'pre-wrap',marginBottom:'10px'}}>
                      {expandida ? n.contenido : n.contenido.slice(0,180)}
                      {n.contenido.length > 180 && (
                        <span onClick={() => setEditandoNota(expandida ? n.id+'_expand' : n.id+'_expand')}
                          style={{color:color.tab,cursor:'pointer',fontWeight:600,fontSize:'10px',marginLeft:'4px'}}>
                          {expandida ? ' ver menos ↑' : '... ver más ↓'}
                        </span>
                      )}
                    </div>
                  )}
                  {n.archivo_url && (
                    <div style={{display:'flex',alignItems:'center',gap:'8px',background:'var(--bg-input)',borderRadius:'8px',padding:'8px 10px',marginBottom:'10px',border:`0.5px solid ${color.border}`}}>
                      {n.archivo_tipo === 'imagen'
                        ? <img src={n.archivo_url} alt="" style={{width:'48px',height:'48px',borderRadius:'6px',objectFit:'cover'}}/>
                        : <span style={{fontSize:'20px'}}>{n.archivo_tipo==='pdf'?'📄':'📎'}</span>}
                      <a href={n.archivo_url} target="_blank" rel="noopener noreferrer"
                        style={{fontSize:'11px',color:color.tab,textDecoration:'none',fontWeight:600}}>
                        {n.archivo_nombre?.slice(0,28) || 'Ver archivo'}
                      </a>
                    </div>
                  )}
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderTop:`0.5px solid rgba(255,255,255,0.08)`,paddingTop:'8px'}}>
                    <span style={{fontSize:'9px',color:'var(--text-muted)',letterSpacing:'0.5px'}}>
                      {new Date(n.created_at).toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'})}
                    </span>
                    <div style={{display:'flex',gap:'5px'}}>
                      <button onClick={() => { setEditandoNota(n.id); setEditTitulo(n.titulo); setEditContenido(n.contenido||''); setArchivoNota(null) }}
                        style={{width:'24px',height:'24px',border:`0.5px solid ${color.border}`,borderRadius:'6px',background:'var(--bg-input)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:color.tab}}>
                        <Pencil size={9}/>
                      </button>
                      <button onClick={() => borrarNota(n.id)}
                        style={{width:'24px',height:'24px',border:'0.5px solid #EF4444',borderRadius:'6px',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#EF4444'}}>
                        <Trash2 size={9}/>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>)}
          </div>
        </div>
      )
    })}
  </div>

   
)}
</>)}

            
            
          </>)}
        </div>
      </div>

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



      {/* MODAL ONBOARDING */}
{showOnboarding && (
  <div className="mo-overlay" onClick={() => { setShowOnboarding(false); localStorage.setItem('luma-onboarding-done','1') }}>
    <div className="mo-box" style={{width:'420px'}} onClick={e => e.stopPropagation()}>
      <div className="mo-hdr">
        <span className="mo-title">✦ Bienvenida a Luma</span>
        <button className="mo-close" onClick={() => { setShowOnboarding(false); localStorage.setItem('luma-onboarding-done','1') }}><X size={12}/></button>
      </div>
      <p style={{fontSize:'13px',color:'var(--text-secondary)',marginBottom:'20px',lineHeight:'1.7'}}>
        Seguí estos pasos para empezar a usar Luma al 100%.
      </p>
      {[
        { key:'servicio', label:'Creá tu primer servicio', desc:'Andá a Servicios y creá al menos uno', href:'/services', emoji:'✨' },
        { key:'disponibilidad', label:'Configurá tu disponibilidad', desc:'En Ajustes → tu horario de atención', href:'/settings', emoji:'📅' },
        { key:'pagina', label:'Activá tu página pública', desc:'En Ajustes → Página pública', href:'/settings', emoji:'🌐' },
        { key:'link', label:'Compartí tu link', desc:'Envialo a tus consultantes', href:null, emoji:'🔗' },
      ].map((paso, i) => {
        const done = onboardingChecks[paso.key as keyof typeof onboardingChecks]
        return (
          <div key={i} style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 14px',borderRadius:'12px',background:done?'var(--accent-light)':'var(--bg-input)',border:`0.5px solid ${done?'var(--border)':'var(--border-light)'}`,marginBottom:'8px'}}>
            <div style={{width:'28px',height:'28px',borderRadius:'50%',background:done?'var(--accent)':'var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',flexShrink:0,color:done?'white':'var(--text-muted)'}}>
              {done ? '✓' : paso.emoji}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:'13px',fontWeight:600,color:'var(--text-primary)',textDecoration:done?'line-through':'none',opacity:done?0.6:1}}>{paso.label}</div>
              <div style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'2px'}}>{paso.desc}</div>
            </div>
            {!done && paso.href && (
              <a href={paso.href} onClick={() => { setShowOnboarding(false); localStorage.setItem('luma-onboarding-done','1') }}
                style={{fontSize:'11px',color:'var(--accent)',fontWeight:600,textDecoration:'none',flexShrink:0}}>
                Ir →
              </a>
            )}
          </div>
        )
      })}
      <button className="save-btn" style={{marginTop:'8px'}} onClick={() => { setShowOnboarding(false); localStorage.setItem('luma-onboarding-done','1') }}>
        Entendido, empezar
      </button>
    </div>
  </div>
)}
{/* MODAL TRIAL VENCIDO */}
{trialVencido && (
  <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',zIndex:99999,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',backdropFilter:'blur(8px)'}}>
    <div style={{background:'var(--bg-card)',borderRadius:'24px',padding:'36px 28px',maxWidth:'400px',width:'100%',textAlign:'center',border:'0.5px solid var(--border-light)',boxShadow:'0 40px 80px rgba(0,0,0,0.5)'}}>
      <div style={{fontSize:'44px',marginBottom:'16px'}}>✦</div>
      <div style={{fontFamily:'var(--font-display)',fontSize:'22px',fontWeight:800,color:'var(--text-primary)',marginBottom:'10px',letterSpacing:'-0.5px'}}>Tu período de prueba terminó</div>
      <p style={{fontSize:'14px',color:'var(--text-secondary)',lineHeight:1.7,marginBottom:'28px'}}>Para seguir usando Luma activá tu suscripción. Son $9.900 ARS por mes y podés cancelar cuando querás.</p>
      <button onClick={() => window.location.href='/suscripcion'}
        style={{width:'100%',padding:'14px',background:'linear-gradient(135deg,#8B5CF6,#A78BFA)',color:'white',border:'none',borderRadius:'12px',fontSize:'14px',fontWeight:700,cursor:'pointer',fontFamily:'inherit',marginBottom:'10px',boxShadow:'0 4px 20px rgba(139,92,246,0.3)'}}>
        ✦ Activar suscripción — $9.900/mes
      </button>
      <button onClick={async () => { const supabase = createClient(); await supabase.auth.signOut(); window.location.href='/auth/login' }}
        style={{width:'100%',padding:'12px',background:'transparent',color:'var(--text-muted)',border:'0.5px solid var(--border)',borderRadius:'12px',fontSize:'13px',cursor:'pointer',fontFamily:'inherit'}}>
        Cerrar sesión
      </button>
    </div>
  </div>
)}
    </>
  )
}
