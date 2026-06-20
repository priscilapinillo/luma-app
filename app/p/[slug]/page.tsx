'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { ChevronLeft, ChevronRight, Check, Clock, Shield, ChevronDown } from 'lucide-react'

type Terapeuta = {
  user_id: string; nombre_profesional: string; especialidad: string
  bio: string; avatar_url: string; mensaje_bienvenida: string
  tipo_pago: string; pagina_activa: boolean
  template?: string; slug?: string
  secciones?: { sobre_mi: boolean; testimonios: boolean; faq: boolean; disponibilidad: boolean }
  faq?: { pregunta: string; respuesta: string }[]
  valores?: { icon: string; name: string; desc: string }[]
  testimonios?: { texto: string; nombre: string }[]
  whatsapp?: string
  alias_pago?: string; cbu?: string; titular_cuenta?: string; banco?: string
  instrucciones_pago?: string; acepta_transferencia?: boolean
  mp_activo?: boolean
}
type Servicio = {
  id: string; nombre: string; descripcion: string
  duracion_estimada: number; precio_base: number; color: string
  tipo_servicio?: string; plazo_horas?: number
}
type Disponibilidad = { dia_semana: number; hora_inicio: string; hora_fin: string; activo: boolean }

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS_CORTO = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function horaAMin(h: string) {
  const [hh, mm] = h.split(':').map(Number)
  return hh * 60 + (mm || 0)
}

const TEMPLATES = {
  luna: {
    bg: '#0D0B14', bg2: '#12101C', bg3: '#1A1628',
    primary: '#C9A84C', primaryLight: '#E8D5A3', primaryDim: 'rgba(201,168,76,0.3)',
    accent: '#6B3FA0', accentLight: '#9B6DD0', accentDim: 'rgba(107,63,160,0.2)',
    text: '#D4C5A9', textDim: '#7A6B8A', cream: '#F0E8D5',
    border: 'rgba(201,168,76,0.2)',
    fontTitle: "'Cormorant Garamond', serif", fontBody: "'Jost', sans-serif", fontSubtitle: "'Jost', sans-serif",
    googleFonts: 'Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500&family=Jost:wght@300;400;500;600',
    deco: '✦', stars: true, dark: true,
    cardBg: 'rgba(26,22,40,0.6)', heroBg: 'linear-gradient(135deg,#1A1035,#0D0B14)',
    navBg: 'linear-gradient(to bottom,rgba(13,11,20,0.97),rgba(13,11,20,0))',
    btnBg: 'linear-gradient(135deg,#6B3FA0,#8B5CF6)', btnColor: '#E8D5A3',
  },
  aura: {
    bg: '#F8F4FF', bg2: '#F0EBFF', bg3: '#E8E0FF',
    primary: '#7C3AED', primaryLight: '#A78BFA', primaryDim: 'rgba(124,58,237,0.2)',
    accent: '#EC4899', accentLight: '#F9A8D4', accentDim: 'rgba(236,72,153,0.15)',
    text: '#4B5563', textDim: '#9CA3AF', cream: '#1F2937', border: 'rgba(124,58,237,0.15)',
    fontTitle: "'Playfair Display', serif", fontBody: "'DM Sans', sans-serif", fontSubtitle: "'DM Sans', sans-serif",
    googleFonts: 'Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=DM+Sans:wght@300;400;500;600',
    deco: '◈', stars: false, dark: false,
    cardBg: 'rgba(255,255,255,0.8)', heroBg: 'linear-gradient(135deg,#F8F4FF,#EDE9FE)',
    navBg: 'rgba(248,244,255,0.95)', btnBg: 'linear-gradient(135deg,#7C3AED,#EC4899)', btnColor: 'white',
  },
  tierra: {
    bg: '#FAF7F0', bg2: '#F5F0E8', bg3: '#EDE8DC',
    primary: '#92400E', primaryLight: '#D97706', primaryDim: 'rgba(146,64,14,0.2)',
    accent: '#065F46', accentLight: '#10B981', accentDim: 'rgba(6,95,70,0.15)',
    text: '#44403C', textDim: '#A8A29E', cream: '#1C1917', border: 'rgba(146,64,14,0.15)',
    fontTitle: "'Lora', serif", fontBody: "'Nunito', sans-serif", fontSubtitle: "'Nunito', sans-serif",
    googleFonts: 'Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Nunito:wght@300;400;500;600',
    deco: '❧', stars: false, dark: false,
    cardBg: 'rgba(255,255,255,0.7)', heroBg: 'linear-gradient(135deg,#FAF7F0,#F5F0E8)',
    navBg: 'rgba(250,247,240,0.95)', btnBg: 'linear-gradient(135deg,#92400E,#D97706)', btnColor: 'white',
  },
  rosa: {
    bg: '#FFF0F6', bg2: '#FFE4F0', bg3: '#FFD6E8',
    primary: '#BE185D', primaryLight: '#F472B6', primaryDim: 'rgba(190,24,93,0.2)',
    accent: '#9D174D', accentLight: '#EC4899', accentDim: 'rgba(157,23,77,0.15)',
    text: '#4A1942', textDim: '#9D7A95', cream: '#2D0A25', border: 'rgba(190,24,93,0.15)',
    fontTitle: "'Playfair Display', serif", fontBody: "'DM Sans', sans-serif", fontSubtitle: "'DM Sans', sans-serif",
    googleFonts: 'Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=DM+Sans:wght@300;400;500;600',
    deco: '✿', stars: false, dark: false,
    cardBg: 'rgba(255,255,255,0.85)', heroBg: 'linear-gradient(135deg,#FFF0F6,#FFE4F0)',
    navBg: 'rgba(255,240,246,0.95)', btnBg: 'linear-gradient(135deg,#BE185D,#EC4899)', btnColor: 'white',
  },
  violeta: {
    bg: '#1E0A3C', bg2: '#2D1058', bg3: '#3D1570',
    primary: '#C084FC', primaryLight: '#E9D5FF', primaryDim: 'rgba(192,132,252,0.3)',
    accent: '#A855F7', accentLight: '#D8B4FE', accentDim: 'rgba(168,85,247,0.2)',
    text: '#DDD6FE', textDim: '#8B5CF6', cream: '#FAF5FF', border: 'rgba(192,132,252,0.25)',
    fontTitle: "'Cormorant Garamond', serif", fontBody: "'Jost', sans-serif", fontSubtitle: "'Jost', sans-serif",
    googleFonts: 'Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500&family=Jost:wght@300;400;500;600',
    deco: '✧', stars: true, dark: true,
    cardBg: 'rgba(61,21,112,0.5)', heroBg: 'linear-gradient(135deg,#1E0A3C,#2D1058)',
    navBg: 'linear-gradient(to bottom,rgba(30,10,60,0.97),rgba(30,10,60,0))',
    btnBg: 'linear-gradient(135deg,#7C3AED,#C084FC)', btnColor: 'white',
  },
  verde: {
    bg: '#F0FDF4', bg2: '#DCFCE7', bg3: '#BBF7D0',
    primary: '#065F46', primaryLight: '#10B981', primaryDim: 'rgba(6,95,70,0.2)',
    accent: '#047857', accentLight: '#34D399', accentDim: 'rgba(4,120,87,0.15)',
    text: '#1C4532', textDim: '#6B7280', cream: '#022C22', border: 'rgba(6,95,70,0.15)',
    fontTitle: "'Lora', serif", fontBody: "'Nunito', sans-serif", fontSubtitle: "'Nunito', sans-serif",
    googleFonts: 'Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Nunito:wght@300;400;500;600',
    deco: '❧', stars: false, dark: false,
    cardBg: 'rgba(255,255,255,0.8)', heroBg: 'linear-gradient(135deg,#F0FDF4,#DCFCE7)',
    navBg: 'rgba(240,253,244,0.95)', btnBg: 'linear-gradient(135deg,#065F46,#10B981)', btnColor: 'white',
  },
}

const TESTIMONIOS_DEFAULT = [
  { texto: 'La sesión fue increíble. Llegué confundida y me fui con total claridad.', nombre: 'Camila R.' },
  { texto: 'Su energía y presencia me hicieron sentir contenida desde el primer momento.', nombre: 'Florencia M.' },
  { texto: 'Las lecturas escritas son increíbles, siempre súper detalladas y amorosas.', nombre: 'Julieta A.' },
]

// ─── helpers ────────────────────────────────────────────────────────────────

async function buscarOCrearPaciente(
  supabase: ReturnType<typeof createClient>,
  terapeutaId: string,
  nombre: string,
  whatsapp: string,
) {
  try {
    const { data: pacEx } = await supabase
      .from('patients').select('id')
      .eq('user_id', terapeutaId).eq('celular', whatsapp).maybeSingle()
    if (pacEx?.id) return pacEx.id

    const partes = nombre.trim().split(' ')
    const { data: np, error: errPac } = await supabase.from('patients').insert({
      user_id: terapeutaId,
      nombre: partes[0],
      apellido: partes.slice(1).join(' ') || '',
      celular: whatsapp,
      alias: whatsapp.slice(-4),
      contexto_general: '',
    }).select('id').single()

    if (errPac) {
      console.error('Error creando paciente:', JSON.stringify(errPac))
      throw new Error('Error creando paciente: ' + JSON.stringify(errPac))
    }
    return np?.id ?? null
  } catch(e) {
    console.error('Error en buscarOCrearPaciente:', e)
    return null
  }
}

async function crearSesionYBooking(
  supabase: ReturnType<typeof createClient>,
  opts: {
    terapeutaId: string
    pacienteId: string | null
    servicio: Servicio
    fecha: string
    hora: string
    mensaje: string
    nombre: string
    whatsapp: string
    metodoPago: string
  }
) {
  if (!opts.pacienteId) {
    console.error('pacienteId es null — no se puede crear la sesión')
    throw new Error('No se pudo crear o encontrar el paciente')
  }

  const { data: sesion, error } = await supabase.from('sessions').insert({
    user_id: opts.terapeutaId,
    patient_id: opts.pacienteId,
    service_id: opts.servicio.id,
    fecha: opts.fecha + 'T' + opts.hora + ':00',
    hora: opts.hora,
    duracion: opts.servicio.duracion_estimada,
    servicio_nombre: opts.servicio.nombre,
    precio: opts.servicio.precio_base,
    estado_pago: 'pendiente',
    realizado: false,
    contexto_sesion: opts.mensaje,
    metodo_pago: opts.metodoPago,
  }).select().single()

  if (error || !sesion) {
    console.error('Error creando sesión:', JSON.stringify(error))
    return null
  }

  await supabase.from('public_bookings').insert({
    therapist_id: opts.terapeutaId,
    patient_name: opts.nombre,
    patient_whatsapp: opts.whatsapp,
    patient_message: opts.mensaje,
    service_id: opts.servicio.id,
    service_name: opts.servicio.nombre,
    fecha: opts.fecha,
    hora: opts.hora,
    duracion: opts.servicio.duracion_estimada,
    precio: opts.servicio.precio_base,
    estado: 'pendiente_pago',
    session_id: sesion.id,
  })

  return sesion
}

// ─── componente principal ───────────────────────────────────────────────────

export default function PaginaPublica({ params }: { params: Promise<{ slug: string }> }) {
  const [terapeuta, setTerapeuta] = useState<Terapeuta | null>(null)
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad[]>([])
  const [sesionesOcupadas, setSesionesOcupadas] = useState<{fecha:string;hora:string;duracion:number}[]>([])
  const [loading, setLoading] = useState(true)

  // flujo de reserva
  const [paso, setPaso] = useState(0) // 0=inicial 2=horarios 3=form
  const [servicioSel, setServicioSel] = useState<Servicio | null>(null)
  const [fechaSel, setFechaSel] = useState('')
  const [horaSel, setHoraSel] = useState('')
  const [form, setForm] = useState({ nombre: '', whatsapp: '', mensaje: '' })
  const [metodoPago, setMetodoPago] = useState<'mp' | 'transferencia' | null>(null)

  // estado de envío
  const [enviando, setEnviando] = useState(false)   // pago libre
  const [enviandoTransferencia, setEnviandoTransferencia] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // MP
  const [mpInitPoint, setMpInitPoint] = useState<string | null>(null)
  const [preparandoMP, setPreparandoMP] = useState(false)
  const [mpError, setMpError] = useState('')

  // UI
  const [diasSel, setDiasSel] = useState<Date[]>([])
  const [diaActivoIdx, setDiaActivoIdx] = useState(0)
  const [mesBase, setMesBase] = useState(new Date())
  const [mostrarCalFull, setMostrarCalFull] = useState(false)
  const [faqAbierto, setFaqAbierto] = useState<number | null>(null)
  const [testiIdx, setTestiIdx] = useState(0)
  const [servicioModal, setServicioModal] = useState<Servicio | null>(null)

  const reservaRef = useRef<HTMLDivElement>(null)
  const horariosRef = useRef<HTMLDivElement>(null)
  const formularioRef = useRef<HTMLDivElement>(null)

  // ── efectos ──────────────────────────────────────────────────────────────

  function abrirModal(s: Servicio) { setServicioModal(s); document.body.style.overflow = 'hidden' }
  function cerrarModal() { setServicioModal(null); document.body.style.overflow = '' }

  useEffect(() => { cargarDatos() }, [])

  // quitar dark mode en página pública
  useEffect(() => {
    const teniaDark = document.documentElement.classList.contains('dark')
    document.documentElement.classList.remove('dark')
    return () => { if (teniaDark) document.documentElement.classList.add('dark') }
  }, [])

  // detectar vuelta de MP con status=approved
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const status = p.get('status')
    const sessionId = p.get('session_id')
    if (status === 'approved' && sessionId) {
      const supabase = createClient()
      Promise.all([
        supabase.from('sessions').update({ estado_pago: 'pagado' }).eq('id', sessionId),
        supabase.from('public_bookings').update({ estado: 'confirmada' }).eq('session_id', sessionId),
      ]).then(() => setEnviado(true))
    }
  }, [])

  // calcular próximos días disponibles
  useEffect(() => {
    const proximos: Date[] = []
    const hoy = new Date()
    let d = new Date(hoy)
    let count = 0
    while (proximos.length < 7 && count < 30) {
      const disp = disponibilidad.find(x => x.dia_semana === d.getDay())
      if (disp?.activo) proximos.push(new Date(d))
      d.setDate(d.getDate() + 1)
      count++
    }
    setDiasSel(proximos)
  }, [disponibilidad])

  // ── carga de datos ────────────────────────────────────────────────────────

  async function cargarDatos() {
    try {
      const supabase = createClient()
      const { slug } = await Promise.resolve(params)
      const slugDecoded = decodeURIComponent(slug)
      const { data: perfil } = await supabase
        .from('therapist_profiles').select('*')
        .eq('slug', slugDecoded).single()
      if (!perfil) { setLoading(false); return }
      setTerapeuta(perfil)
      const [{ data: servs }, { data: disp }, { data: sess }] = await Promise.all([
        supabase.from('services').select('*').eq('user_id', perfil.user_id).eq('activo', true),
        supabase.from('availability').select('*').eq('user_id', perfil.user_id),
        supabase.from('sessions').select('fecha,hora,duracion').eq('user_id', perfil.user_id),
      ])
      if (servs) setServicios(servs)
      if (disp) setDisponibilidad(disp)
      if (sess) setSesionesOcupadas(sess.map(s => ({
        fecha: s.fecha?.split('T')[0] || '',
        hora: s.hora || '',
        duracion: s.duracion || 60,
      })))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  // ── helpers de calendario ─────────────────────────────────────────────────

  function horariosDisponibles(fecha: string): string[] {
    if (!servicioSel) return []
    const diaSemana = new Date(fecha + 'T12:00:00').getDay()
    const disp = disponibilidad.find(d => d.dia_semana === diaSemana)
    if (!disp?.activo) return []
    const inicio = horaAMin(disp.hora_inicio)
    const fin = horaAMin(disp.hora_fin)
    const dur = servicioSel.duracion_estimada || 60
    const horarios: string[] = []
    for (let min = inicio; min + dur <= fin; min += 30) {
      const h = Math.floor(min / 60), m = min % 60
      const horaStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
      const conflicto = sesionesOcupadas.some(s => {
        if (s.fecha !== fecha) return false
        const sI = horaAMin(s.hora), sF = sI + s.duracion
        return min < sF && min + dur > sI
      })
      if (!conflicto) horarios.push(horaStr)
    }
    return horarios
  }

  function diasDelMes() {
    const año = mesBase.getFullYear(), mes = mesBase.getMonth()
    const offset = new Date(año, mes, 1).getDay()
    const total = new Date(año, mes + 1, 0).getDate()
    const dias: (Date | null)[] = []
    for (let i = 0; i < offset; i++) dias.push(null)
    for (let i = 1; i <= total; i++) dias.push(new Date(año, mes, i))
    return dias
  }

  function diaDisponible(fecha: Date) {
    if (fecha < new Date(new Date().setHours(0, 0, 0, 0))) return false
    return disponibilidad.find(d => d.dia_semana === fecha.getDay())?.activo || false
  }

  // ── acciones de pago ──────────────────────────────────────────────────────

  // PAGO LIBRE (sin cobro)
  async function confirmarReservaLibre() {
    if (!terapeuta || !servicioSel || !fechaSel || !horaSel || !form.nombre || !form.whatsapp) return
    setEnviando(true)
    setErrorMsg('')
    try {
      const supabase = createClient()
      const pacienteId = await buscarOCrearPaciente(supabase, terapeuta.user_id, form.nombre, form.whatsapp)
      const sesion = await crearSesionYBooking(supabase, {
        terapeutaId: terapeuta.user_id, pacienteId,
        servicio: servicioSel, fecha: fechaSel, hora: horaSel,
        mensaje: form.mensaje, nombre: form.nombre, whatsapp: form.whatsapp,
        metodoPago: 'libre',
      })
      if (sesion) setEnviado(true)
      else setErrorMsg('Hubo un error al confirmar. Intentá de nuevo.')
    } catch (e) {
      console.error(e)
      setErrorMsg('Hubo un error al confirmar. Intentá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  // TRANSFERENCIA
  async function confirmarTransferencia() {
    if (!terapeuta || !servicioSel || !fechaSel || !horaSel || !form.nombre || !form.whatsapp) {
      setErrorMsg(`Faltan datos: t=${!!terapeuta} s=${!!servicioSel} f=${fechaSel} h=${horaSel} n=${form.nombre} w=${form.whatsapp}`)
      return
    }
    setEnviandoTransferencia(true)
    setErrorMsg('')
    try {
      const supabase = createClient()
      const pacienteId = await buscarOCrearPaciente(supabase, terapeuta.user_id, form.nombre, form.whatsapp)
      const sesion = await crearSesionYBooking(supabase, {
        terapeutaId: terapeuta.user_id, pacienteId,
        servicio: servicioSel, fecha: fechaSel, hora: horaSel,
        mensaje: form.mensaje, nombre: form.nombre, whatsapp: form.whatsapp,
        metodoPago: 'transferencia',
      })
      if (sesion) setEnviado(true)
      else setErrorMsg('Hubo un error al confirmar. Intentá de nuevo.')
    } catch (e) {
      console.error(e)
      setErrorMsg('Hubo un error al confirmar. Intentá de nuevo.')
    } finally {
      setEnviandoTransferencia(false)
    }
  }

  // MERCADO PAGO — se llama al hacer click en el botón, no en useEffect
  async function prepararMP() {
    if (!terapeuta || !servicioSel || !fechaSel || !horaSel || !form.nombre || !form.whatsapp) return
    if (preparandoMP) return
    setPreparandoMP(true)
    setMpError('')
    try {
      const supabase = createClient()
      const pacienteId = await buscarOCrearPaciente(supabase, terapeuta.user_id, form.nombre, form.whatsapp)
      const sesion = await crearSesionYBooking(supabase, {
        terapeutaId: terapeuta.user_id, pacienteId,
        servicio: servicioSel, fecha: fechaSel, hora: horaSel,
        mensaje: form.mensaje, nombre: form.nombre, whatsapp: form.whatsapp,
        metodoPago: 'mercadopago',
      })
      if (!sesion) { setMpError('Error al crear la reserva. Intentá de nuevo.'); return }

      const monto = terapeuta.tipo_pago === 'completo'
        ? servicioSel.precio_base
        : Math.round(servicioSel.precio_base * 0.3)
      const origin = window.location.origin
      const res = await fetch('/api/mp/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          servicioNombre: servicioSel.nombre,
          precio: servicioSel.precio_base,
          monto,
          therapistId: terapeuta.user_id,
          successUrl: `${origin}/p/${terapeuta.slug || ''}?status=approved&session_id=${sesion.id}`,
          failureUrl: `${origin}/p/${terapeuta.slug || ''}?status=failure&session_id=${sesion.id}`,
        }),
      })
      const data = await res.json()
      if (data.init_point) {
        // redirigir directamente — funciona en iOS Safari porque está en el mismo click handler
        window.location.href = data.init_point
      } else {
        setMpError('No se pudo conectar con Mercado Pago. Intentá de nuevo.')
      }
    } catch (e) {
      console.error(e)
      setMpError('Error al conectar con Mercado Pago.')
    } finally {
      setPreparandoMP(false)
    }
  }

  // ── derivados ─────────────────────────────────────────────────────────────

  const t = TEMPLATES[(terapeuta?.template as keyof typeof TEMPLATES) || 'luna']
  const fotoUrl = terapeuta?.avatar_url || '/IMG-20260311-WA0023.jpg'
  const secciones = terapeuta?.secciones || { sobre_mi: true, testimonios: true, faq: false, disponibilidad: true }
  const faqItems = terapeuta?.faq || []
  const isLuna = (terapeuta?.template || 'luna') === 'luna'
  const mostrarTransferencia = !!(terapeuta?.acepta_transferencia && terapeuta?.alias_pago)
  const requierePago = terapeuta?.tipo_pago === 'sena' || terapeuta?.tipo_pago === 'completo'
  const formularioListo = !!(form.nombre.trim() && form.whatsapp.trim())

  // ── renders de carga/error ────────────────────────────────────────────────

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:TEMPLATES.luna.bg,color:TEMPLATES.luna.primary,fontFamily:'serif',fontSize:'14px',letterSpacing:'2px'}}>
      {TEMPLATES.luna.deco} cargando {TEMPLATES.luna.deco}
    </div>
  )

  if (!terapeuta) return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#0D0B14',gap:'16px'}}>
      <div style={{fontSize:'48px'}}>🌙</div>
      <div style={{fontSize:'18px',fontWeight:'700',color:'#E8D5A3',fontFamily:'serif'}}>Página no encontrada</div>
      <div style={{fontSize:'13px',color:'#6B5B7A'}}>Esta página no existe o no está activa</div>
    </div>
  )

  // ── render principal ──────────────────────────────────────────────────────

  return (
    <div data-public-page="true" style={{colorScheme:'normal'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=${t.googleFonts}&display=swap');
        :root {
          --bg:${t.bg};--bg2:${t.bg2};--bg3:${t.bg3};
          --primary:${t.primary};--primary-light:${t.primaryLight};--primary-dim:${t.primaryDim};
          --accent:${t.accent};--accent-light:${t.accentLight};--accent-dim:${t.accentDim};
          --text:${t.text};--text-dim:${t.textDim};--cream:${t.cream};
          --border:${t.border};--card-bg:${t.cardBg};
          --font-title:${t.fontTitle};--font-body:${t.fontBody};--font-subtitle:${t.fontSubtitle};
          --btn-bg:${t.btnBg};--btn-color:${t.btnColor};
        }
        *{box-sizing:border-box;margin:0;padding:0}
        html{background:${t.bg} !important;width:100%}
        body{background:${t.bg} !important;color:${t.text} !important;font-family:var(--font-body);overflow-x:hidden;width:100%}
        html.dark body{background:${t.bg} !important;color:${t.text} !important}

        .nav{position:fixed;top:0;left:0;right:0;width:100%;z-index:100;padding:16px 24px;display:flex;justify-content:space-between;align-items:center;background:${t.navBg};${!t.dark?'border-bottom:0.5px solid var(--border);backdrop-filter:blur(12px);':''}}
        .nav-logo{font-family:var(--font-title);font-size:20px;font-weight:600;color:var(--primary);letter-spacing:3px}
        .nav-cta{padding:8px 20px;background:var(--btn-bg);color:var(--btn-color);border:0.5px solid var(--primary-dim);border-radius:50px;font-size:12px;font-weight:500;cursor:pointer;font-family:var(--font-body);letter-spacing:1px;text-transform:uppercase;transition:all 0.3s}

        .hero{position:relative;min-height:100vh;width:100vw;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px 60px;text-align:center;z-index:1;background:${t.heroBg}}
        .carta-wrap{position:relative;margin-bottom:32px;animation:float 6s ease-in-out infinite}
        @keyframes float{0%,100%{transform:translateY(0px)}50%{transform:translateY(-12px)}}
        .carta{width:220px;height:340px;border-radius:16px;border:1.5px solid var(--primary);position:relative;overflow:hidden;box-shadow:0 0 40px var(--primary-dim),0 0 80px var(--accent-dim),inset 0 0 30px var(--primary-dim)}
        .carta-foto{width:100%;height:100%;object-fit:cover;object-position:center top;display:block}
        .carta-overlay{position:absolute;inset:0;background:${t.dark?'linear-gradient(to bottom,rgba(0,0,0,0.2) 0%,transparent 30%,transparent 60%,rgba(0,0,0,0.6) 100%)':'linear-gradient(to bottom,rgba(0,0,0,0.05) 0%,transparent 40%,transparent 60%,rgba(0,0,0,0.2) 100%)'}}
        .carta-frame{position:absolute;inset:8px;border:0.5px solid var(--primary-dim);border-radius:10px;pointer-events:none}
        .carta-roman{position:absolute;top:12px;left:0;right:0;text-align:center;font-family:var(--font-subtitle);font-size:11px;font-weight:600;color:var(--primary);letter-spacing:4px}
        .carta-name{position:absolute;bottom:12px;left:0;right:0;text-align:center;font-family:var(--font-subtitle);font-size:11px;font-weight:600;color:var(--primary-light);letter-spacing:3px;text-transform:uppercase}
        .hero-nombre{font-family:var(--font-title);font-size:clamp(42px,8vw,64px);font-weight:300;color:var(--cream);letter-spacing:-1px;line-height:1;margin-bottom:8px}
        .hero-esp{font-size:13px;font-weight:600;color:var(--primary);letter-spacing:3px;text-transform:uppercase;margin-bottom:16px;font-family:var(--font-subtitle)}
        .hero-bio{font-size:17px;line-height:1.8;color:var(--text);max-width:340px;font-weight:400;margin-bottom:32px;font-family:var(--font-subtitle)}
        .hero-cta{display:inline-flex;align-items:center;gap:10px;padding:16px 36px;background:var(--btn-bg);color:var(--btn-color);border:0.5px solid var(--primary-dim);border-radius:50px;font-size:14px;font-weight:600;cursor:pointer;font-family:var(--font-body);letter-spacing:2px;text-transform:uppercase;box-shadow:0 8px 32px var(--accent-dim);transition:all 0.3s;margin-bottom:16px}
        .hero-cta:hover{transform:translateY(-2px)}
        .hero-trust{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-dim);letter-spacing:1px;font-family:var(--font-subtitle)}

        .section{position:relative;z-index:1;padding:60px 20px;max-width:560px;margin:0 auto;width:100%}
        .section-label{display:flex;align-items:center;gap:10px;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:var(--primary);margin-bottom:12px;justify-content:center;font-family:var(--font-subtitle);font-weight:700}
        .section-title{font-family:var(--font-title);font-size:clamp(32px,6vw,48px);font-weight:300;color:var(--cream);letter-spacing:-1px;line-height:1.1;text-align:center;margin-bottom:8px}
        .section-sub{font-size:14px;color:var(--text-dim);text-align:center;margin-bottom:32px;font-family:var(--font-subtitle);font-weight:400}

        .sobre-card{background:var(--card-bg);border:0.5px solid var(--border);border-radius:20px;padding:28px 24px;${!t.dark?'box-shadow:0 4px 24px rgba(0,0,0,0.06);':''}}
        .sobre-values{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:20px}
        .sobre-val{text-align:center;padding:12px 8px;background:var(--primary-dim);border-radius:12px;border:0.5px solid var(--border)}
        .sobre-val-icon{font-size:20px;margin-bottom:6px}
        .sobre-val-name{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--primary);margin-bottom:4px;font-family:var(--font-subtitle);font-weight:700}
        .sobre-val-desc{font-size:12px;color:var(--text-dim);line-height:1.4;font-family:var(--font-subtitle)}

        .serv-list{display:flex;flex-direction:column;gap:12px;width:100%}
        .serv-card{background:var(--card-bg);border:0.5px solid var(--border);border-radius:16px;padding:20px;cursor:pointer;transition:all 0.18s;position:relative;overflow:hidden;${!t.dark?'box-shadow:0 2px 12px rgba(0,0,0,0.06);':''}}
        .serv-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;border-radius:0 2px 2px 0;background:linear-gradient(to bottom,var(--primary),var(--accent))}
        .serv-card:hover{border-color:var(--primary-dim);box-shadow:0 0 20px var(--primary-dim);transform:translateY(-2px)}
        .serv-tipo{font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--primary);margin-bottom:6px;font-family:var(--font-subtitle);font-weight:700}
        .serv-nombre{font-family:var(--font-title);font-size:20px;font-weight:500;color:var(--cream);margin-bottom:4px}
        .serv-desc{font-size:13px;color:var(--text-dim);line-height:1.6;margin-bottom:12px;font-family:var(--font-subtitle)}
        .serv-footer{display:flex;justify-content:space-between;align-items:center}
        .serv-precio{font-family:var(--font-title);font-size:22px;color:var(--primary-light);font-weight:500}
        .serv-meta{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-dim);font-family:var(--font-subtitle)}
        .serv-btn{padding:8px 20px;background:transparent;border:0.5px solid var(--primary-dim);color:var(--primary);border-radius:50px;font-size:11px;letter-spacing:2px;text-transform:uppercase;cursor:pointer;font-family:var(--font-subtitle);font-weight:600;transition:all 0.2s;min-height:36px}

        .serv-modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.88);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);animation:fadeIn 0.2s ease}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .serv-modal{background:var(--bg2);border-radius:20px;padding:28px 24px 32px;width:100%;max-width:480px;max-height:80vh;overflow-y:auto;animation:slideUp 0.2s ease;border:0.5px solid var(--border);position:relative;box-shadow:0 40px 80px rgba(0,0,0,0.8)}
        @keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
        .serv-modal-tipo{font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--primary);margin-bottom:8px;font-family:var(--font-subtitle);font-weight:700}
        .serv-modal-nombre{font-family:var(--font-title);font-size:28px;font-weight:300;color:var(--cream);margin-bottom:12px;letter-spacing:-0.5px}
        .serv-modal-desc{font-size:15px;color:var(--text);line-height:1.8;font-family:var(--font-subtitle);margin-bottom:20px}
        .serv-modal-meta{display:flex;gap:16px;margin-bottom:16px}
        .serv-modal-pill{padding:8px 16px;border-radius:50px;border:0.5px solid var(--border);background:var(--card-bg);font-size:12px;color:var(--text-dim);font-family:var(--font-subtitle)}
        .serv-modal-precio{font-family:var(--font-title);font-size:32px;color:var(--primary-light);font-weight:400;margin-bottom:20px}
        .serv-modal-btn{width:100%;padding:16px;background:var(--btn-bg);color:var(--btn-color);border:none;border-radius:50px;font-size:14px;font-weight:600;cursor:pointer;font-family:var(--font-subtitle);letter-spacing:2px;text-transform:uppercase;box-shadow:0 8px 32px var(--accent-dim);min-height:52px}
        .serv-modal-close{position:absolute;top:16px;right:16px;width:32px;height:32px;border-radius:50%;border:0.5px solid var(--border);background:var(--card-bg);color:var(--text-dim);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;line-height:1;font-weight:300}

        .metodo-pago-wrap{display:flex;flex-direction:column;gap:10px;margin-bottom:20px}
        .metodo-pago-opt{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:14px;border:1px solid var(--border);background:var(--card-bg);cursor:pointer;transition:all 0.18s;font-family:var(--font-subtitle)}
        .metodo-pago-opt.sel{border-color:var(--primary);box-shadow:0 0 0 1px var(--primary)}
        .metodo-radio{width:18px;height:18px;border-radius:50%;border:2px solid var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all 0.18s}
        .metodo-pago-opt.sel .metodo-radio{border-color:var(--primary);background:var(--primary)}
        .metodo-radio-inner{width:8px;height:8px;border-radius:50%;background:white}
        .metodo-label{font-size:14px;font-weight:600;color:var(--cream)}
        .metodo-sub{font-size:11px;color:var(--text-dim);margin-top:2px}

        .transferencia-datos{background:var(--card-bg);border:0.5px solid var(--border);border-radius:14px;padding:18px;margin-bottom:20px}
        .transferencia-titulo{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--primary);font-family:var(--font-subtitle);font-weight:700;margin-bottom:12px}
        .transferencia-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:0.5px solid var(--border);font-family:var(--font-subtitle)}
        .transferencia-row:last-child{border-bottom:none}
        .transferencia-lbl{font-size:11px;color:var(--text-dim)}
        .transferencia-val{font-size:14px;font-weight:600;color:var(--cream)}
        .transferencia-instrucciones{font-size:13px;color:var(--text);line-height:1.6;margin-top:12px;font-family:var(--font-subtitle)}

        .dias-scroll{display:flex;gap:8px;overflow-x:auto;padding-bottom:8px;margin-bottom:20px;scrollbar-width:none}
        .dias-scroll::-webkit-scrollbar{display:none}
        .dia-pill{flex-shrink:0;padding:10px 16px;border-radius:50px;border:0.5px solid var(--border);background:var(--card-bg);cursor:pointer;transition:all 0.2s;text-align:center}
        .dia-pill.act{background:var(--btn-bg);border-color:var(--accent)}
        .dia-pill-dia{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text-dim);margin-bottom:2px;font-family:var(--font-subtitle);font-weight:600}
        .dia-pill.act .dia-pill-dia{color:rgba(255,255,255,0.7)}
        .dia-pill-num{font-family:var(--font-title);font-size:18px;font-weight:500;color:var(--cream)}
        .horas-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
        .hora-btn{padding:11px 6px;border-radius:10px;border:0.5px solid var(--border);background:var(--card-bg);font-size:13px;color:var(--text);cursor:pointer;text-align:center;transition:all 0.2s;font-family:var(--font-body);min-height:44px}
        .hora-btn:hover{border-color:var(--primary-dim);color:var(--primary)}
        .hora-btn.sel{background:var(--btn-bg);border-color:var(--accent);color:var(--btn-color)}
        .cal-full{margin-top:16px}
        .cal-nav{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
        .cal-mes-lbl{font-family:var(--font-subtitle);font-size:16px;font-weight:600;color:var(--cream)}
        .cal-nav-btn{width:28px;height:28px;border-radius:50%;border:0.5px solid var(--border);background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-dim)}
        .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}
        .cal-hdr{text-align:center;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text-dim);padding:4px 0;font-family:var(--font-subtitle);font-weight:700}
        .cal-dia{height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--text-dim);transition:all 0.15s;font-family:var(--font-body)}
        .cal-dia.disp{cursor:pointer;color:var(--text)}
        .cal-dia.disp:hover{background:var(--accent-dim);color:var(--primary)}
        .cal-dia.sel-d{background:var(--btn-bg);color:var(--btn-color)}
        .cal-dia.pasado{opacity:0.3;cursor:not-allowed}

        .form-wrap{margin-top:20px}
        .field{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
        .field label{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--primary);font-family:var(--font-subtitle);font-weight:700}
        .field input,.field textarea{padding:12px 14px;border-radius:10px;border:0.5px solid var(--border);background:var(--card-bg);font-size:16px;font-family:var(--font-body);color:var(--cream);outline:none;width:100%;transition:border-color 0.2s;min-height:44px}
        .field input:focus,.field textarea:focus{border-color:var(--primary-dim)}
        .field textarea{min-height:90px;resize:none;font-size:14px}
        .field-hint{font-size:11px;color:var(--text-dim);font-family:var(--font-subtitle)}
        .resumen{background:var(--card-bg);border:0.5px solid var(--border);border-radius:14px;padding:18px;margin-bottom:20px}
        .resumen-row{display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px;font-family:var(--font-subtitle)}
        .resumen-row:last-child{margin-bottom:0;padding-top:10px;border-top:0.5px solid var(--border);font-size:16px}
        .resumen-lbl{color:var(--text-dim)}
        .resumen-val{color:var(--cream);font-weight:500}
        .resumen-total{color:var(--primary);font-family:var(--font-title);font-size:20px}
        .confirmar-btn{width:100%;padding:16px;background:var(--btn-bg);color:var(--btn-color);border:0.5px solid var(--primary-dim);border-radius:50px;font-size:14px;font-weight:600;cursor:pointer;font-family:var(--font-subtitle);letter-spacing:2px;text-transform:uppercase;box-shadow:0 8px 32px var(--accent-dim);transition:all 0.3s;min-height:52px;display:flex;align-items:center;justify-content:center;text-decoration:none}
        .confirmar-btn:hover{transform:translateY(-1px)}
        .confirmar-btn:disabled{opacity:0.5;cursor:not-allowed;transform:none}
        .error-msg{font-size:13px;color:#F87171;padding:10px 14px;background:rgba(248,113,113,0.1);border-radius:10px;border:0.5px solid rgba(248,113,113,0.3);margin-bottom:12px;text-align:center}

        .testi-card{background:var(--card-bg);border:0.5px solid var(--border);border-radius:16px;padding:24px;${!t.dark?'box-shadow:0 4px 24px rgba(0,0,0,0.06);':''}}
        .testi-quote{font-size:48px;color:var(--primary-dim);font-family:serif;line-height:0.8;margin-bottom:12px}
        .testi-texto{font-family:var(--font-subtitle);font-size:17px;font-weight:400;color:var(--cream);line-height:1.7;margin-bottom:16px}
        .testi-nombre{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--primary);font-family:var(--font-subtitle);font-weight:700}
        .testi-dots{display:flex;gap:8px;justify-content:center;margin-top:16px}
        .testi-dot{width:6px;height:6px;border-radius:50%;background:var(--border);cursor:pointer;transition:all 0.2s}
        .testi-dot.act{width:20px;border-radius:3px;background:var(--primary)}

        .faq-item{border:0.5px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:8px;background:var(--card-bg)}
        .faq-pregunta{padding:14px 16px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:600;color:var(--cream);font-family:var(--font-subtitle)}
        .faq-respuesta{padding:0 16px 14px;font-size:13px;color:var(--text-dim);line-height:1.7;font-family:var(--font-subtitle)}

        .divider{display:flex;align-items:center;gap:12px;margin:0 auto 48px;max-width:200px;color:var(--primary);font-size:10px;justify-content:center}
        .divider::before,.divider::after{content:'';flex:1;height:0.5px;background:var(--border)}
        .cta-final{background:${t.dark?'linear-gradient(135deg,rgba(107,63,160,0.3),rgba(26,22,40,0.9))':'linear-gradient(135deg,var(--accent-dim),var(--primary-dim))'};border:0.5px solid var(--border);border-radius:24px;padding:48px 24px;text-align:center;margin:0 0 60px}

        .exito-wrap{text-align:center;padding:48px 20px}
        .exito-circle{width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#10B981,#34D399);display:flex;align-items:center;justify-content:center;margin:0 auto 24px;box-shadow:0 0 40px rgba(16,185,129,0.4)}
        .exito-title{font-family:var(--font-title);font-size:32px;font-weight:300;color:var(--cream);margin-bottom:12px}
        .exito-sub{font-size:14px;color:var(--text-dim);line-height:1.8;margin-bottom:28px;font-family:var(--font-subtitle)}
        .wsp-btn{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;background:#25D366;color:white;border:none;border-radius:50px;font-size:14px;font-weight:600;cursor:pointer;font-family:var(--font-body);letter-spacing:1px;box-shadow:0 6px 20px rgba(37,211,102,0.3);text-decoration:none;min-height:52px}

        .footer{text-align:center;padding:20px;font-size:11px;color:var(--text-dim);letter-spacing:2px;z-index:1;position:relative;font-family:var(--font-subtitle)}
        .footer span{color:var(--primary)}

        .stars-bg{position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden}
        .star{position:absolute;width:2px;height:2px;background:var(--primary-light);border-radius:50%;opacity:0;animation:twinkle var(--dur,3s) var(--delay,0s) infinite}
        @keyframes twinkle{0%,100%{opacity:0}50%{opacity:var(--op,0.6)}}
        @keyframes pulseGlow{0%,100%{opacity:0.5;transform:translate(-50%,-50%) scale(1)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.1)}}
        @keyframes bounce{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(6px)}}
        .hero-scroll{position:absolute;bottom:24px;left:50%;transform:translateX(-50%);color:var(--primary-dim);animation:bounce 2s infinite}
        .carta-glow{position:absolute;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,var(--accent-dim) 0%,transparent 70%);top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:-1;animation:pulseGlow 4s ease-in-out infinite}

        @media(min-width:768px){
          .hero{flex-direction:row;text-align:left;width:100vw;padding:100px 80px 80px;justify-content:center;align-items:center;gap:80px}
          .hero .carta-wrap{flex-shrink:0}
          .hero .hero-text{max-width:500px;flex:1}
          .hero .hero-nombre{font-size:clamp(52px,6vw,80px)}
          .hero .hero-bio{font-size:18px;max-width:none}
          .carta{width:280px;height:420px}
          .hero-cta{margin-bottom:0}
          .section{max-width:800px}
          .serv-list{display:grid;grid-template-columns:1fr 1fr}
          .sobre-values{grid-template-columns:repeat(3,1fr)}
          .cta-final{margin:0 40px 60px}
          .nav{padding:20px 40px}
          .hero-trust{justify-content:flex-start}
        }
        @media(max-width:767px){
          .hero{flex-direction:column;text-align:center;padding:90px 24px 60px;gap:32px;align-items:center}
          .hero .hero-text{max-width:100%;flex:unset}
          .hero-trust{justify-content:center}
        }
      `}</style>

      {t.stars && (
        <div className="stars-bg">
          {Array.from({length:40}).map((_,i) => (
            <div key={i} className="star" style={{
              left:`${Math.random()*100}%`, top:`${Math.random()*100}%`,
              '--dur':`${2+Math.random()*4}s`, '--delay':`${Math.random()*4}s`,
              '--op': Math.random()*0.5+0.2,
            } as any}/>
          ))}
        </div>
      )}

      <nav className="nav">
        <div className="nav-logo">{isLuna ? '✦ ' : ''}{terapeuta.nombre_profesional?.split(' ')[0]?.toUpperCase() || 'LUMA'}</div>
        <button className="nav-cta" onClick={() => reservaRef.current?.scrollIntoView({behavior:'smooth'})}>
          Reservar sesión
        </button>
      </nav>

      <section className="hero">
        <div className="carta-wrap">
          <div className="carta-glow"/>
          <div className="carta">
            <img src={fotoUrl} alt={terapeuta.nombre_profesional} className="carta-foto"
              onError={e => { (e.target as HTMLImageElement).style.display='none' }}/>
            <div className="carta-overlay"/>
            <div className="carta-frame"/>
            <div className="carta-roman">{t.deco} XVIII {t.deco}</div>
            <div className="carta-name">{terapeuta.especialidad?.split('·')[0]?.trim() || 'La Intuición'}</div>
          </div>
        </div>
        <div className="hero-text">
          <div className="hero-esp">{terapeuta.especialidad || 'Tarot & Bienestar'}</div>
          <h1 className="hero-nombre">{terapeuta.nombre_profesional}</h1>
          <p className="hero-bio">{terapeuta.mensaje_bienvenida || 'Te acompaño a conectar con tu intuición y encontrar claridad.'}</p>
          <button className="hero-cta" onClick={() => reservaRef.current?.scrollIntoView({behavior:'smooth'})}>
            {t.deco} Reservar sesión
          </button>
          <div className="hero-trust"><Shield size={11}/> Sesiones online · Espacio seguro y confidencial</div>
        </div>
        <div className="hero-scroll"><ChevronDown size={20}/></div>
      </section>

      {secciones.sobre_mi && (<>
        <div className="divider">{t.deco} {t.deco} {t.deco}</div>
        <section className="section">
          <div className="section-label">Sobre mí</div>
          <h2 className="section-title">Mi propósito</h2>
          <div className="sobre-card">
            <p style={{fontSize:'15px',lineHeight:'1.9',color:'var(--text)',fontFamily:'var(--font-subtitle)',fontWeight:400,marginBottom:'8px'}}>
              {terapeuta.bio || 'Trabajo desde una mirada holística para acompañar procesos de transformación y crecimiento.'}
            </p>
            <div className="sobre-values">
              {(terapeuta.valores || [
                {icon:'👁', name:'Escucha', desc:'Te escucho con el corazón y sin juicios'},
                {icon:'✨', name:'Claridad', desc:'Aporto claridad a lo que hoy te confunde'},
                {icon:'🌙', name:'Acompaño', desc:'Te acompaño en cada paso de tu proceso'},
              ]).map(v => (
                <div key={v.name} className="sobre-val">
                  <div className="sobre-val-icon">{v.icon}</div>
                  <div className="sobre-val-name">{v.name}</div>
                  <div className="sobre-val-desc">{v.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </>)}

      <div className="divider">{t.deco} {t.deco} {t.deco}</div>

      {/* ── SECCIÓN RESERVA ── */}
      <section className="section" ref={reservaRef}>
        <div className="section-label">Servicios</div>
        <h2 className="section-title">¿Cómo puedo acompañarte?</h2>
        <p className="section-sub">Elegí el servicio que resuene con lo que necesitás hoy</p>

        {servicios.length === 0 ? (
          <div style={{textAlign:'center',color:'var(--text-dim)',padding:'40px',fontFamily:'var(--font-subtitle)',fontSize:'16px'}}>
            Próximamente disponibles {t.deco}
          </div>
        ) : (
          <div className="serv-list">
            {servicios.map(s => (
              <div key={s.id} className={`serv-card${servicioSel?.id===s.id?' sel':''}`} onClick={() => abrirModal(s)}>
                <div className="serv-tipo">{s.tipo_servicio === 'entrega' ? `⏳ Entrega en ${s.plazo_horas}hs` : '🔴 Sesión en vivo'}</div>
                <div className="serv-nombre">{s.nombre}</div>
                <div className="serv-desc">{s.descripcion?.slice(0,120)}{(s.descripcion?.length ?? 0) > 120 ? '...' : ''}</div>
                <div className="serv-footer">
                  <div>
                    <div className="serv-precio">${s.precio_base.toLocaleString()}</div>
                    {s.tipo_servicio === 'entrega'
                      ? <div className="serv-meta">📦 Recibís en {s.plazo_horas}hs</div>
                      : <div className="serv-meta"><Clock size={10}/>{s.duracion_estimada} min</div>}
                  </div>
                  <button className="serv-btn">Ver detalles</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* HORARIOS — solo para sesiones en vivo */}
        {paso >= 1 && paso < 3 && servicioSel && servicioSel.tipo_servicio !== 'entrega' && !enviado && secciones.disponibilidad && (
          <div ref={horariosRef} style={{marginTop:'32px'}}>
            <div className="section-label" style={{marginBottom:'16px'}}>Próximos turnos disponibles</div>
            {!mostrarCalFull ? (<>
              <div className="dias-scroll">
                {diasSel.map((d,i) => (
                  <div key={i} className={`dia-pill${diaActivoIdx===i?' act':''}`}
                    onClick={() => { setDiaActivoIdx(i); setFechaSel(formatDate(d)); setHoraSel('') }}>
                    <div className="dia-pill-dia">{DIAS_CORTO[d.getDay()]}</div>
                    <div className="dia-pill-num">{d.getDate()}</div>
                  </div>
                ))}
              </div>
              {fechaSel && (
                <div className="horas-grid">
                  {horariosDisponibles(fechaSel).length === 0
                    ? <div style={{gridColumn:'1/-1',textAlign:'center',color:'var(--text-dim)',fontSize:'13px',padding:'16px',fontFamily:'var(--font-subtitle)'}}>No hay horarios disponibles este día</div>
                    : horariosDisponibles(fechaSel).map(h => (
                      <button key={h} className={`hora-btn${horaSel===h?' sel':''}`}
                        onClick={() => { setHoraSel(h); setPaso(3); setTimeout(() => formularioRef.current?.scrollIntoView({behavior:'smooth',block:'nearest'}), 100) }}>{h}</button>
                    ))}
                </div>
              )}
              <button onClick={() => setMostrarCalFull(true)}
                style={{marginTop:'16px',width:'100%',padding:'10px',background:'transparent',border:'0.5px solid var(--border)',color:'var(--text-dim)',borderRadius:'10px',fontSize:'12px',letterSpacing:'2px',textTransform:'uppercase',cursor:'pointer',fontFamily:'var(--font-subtitle)',fontWeight:600,minHeight:'44px'}}>
                Ver calendario completo
              </button>
            </>) : (
              <div className="cal-full">
                <div className="cal-nav">
                  <button className="cal-nav-btn" onClick={() => { const d=new Date(mesBase);d.setMonth(d.getMonth()-1);setMesBase(d) }}><ChevronLeft size={12}/></button>
                  <div className="cal-mes-lbl">{MESES[mesBase.getMonth()]} {mesBase.getFullYear()}</div>
                  <button className="cal-nav-btn" onClick={() => { const d=new Date(mesBase);d.setMonth(d.getMonth()+1);setMesBase(d) }}><ChevronRight size={12}/></button>
                </div>
                <div className="cal-grid">
                  {DIAS_CORTO.map(d => <div key={d} className="cal-hdr">{d}</div>)}
                  {diasDelMes().map((dia,i) => {
                    if (!dia) return <div key={`v${i}`} className="cal-dia"/>
                    const f = formatDate(dia)
                    const disp = diaDisponible(dia)
                    const pas = dia < new Date(new Date().setHours(0,0,0,0))
                    return (
                      <div key={i} className={`cal-dia${f===fechaSel?' sel-d':disp&&!pas?' disp':pas?' pasado':''}`}
                        onClick={() => { if(!disp||pas) return; setFechaSel(f); setHoraSel(''); setMostrarCalFull(false) }}>
                        {dia.getDate()}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* FORMULARIO */}
        {paso >= 3 && fechaSel && horaSel && !enviado && (
          <div className="form-wrap" ref={formularioRef}>
            <div style={{height:'1px',background:'var(--border)',margin:'28px 0'}}/>
            <div className="section-label" style={{marginBottom:'20px'}}>Tus datos</div>

            <div className="field">
              <label>Nombre completo</label>
              <input placeholder="Ej: María López" value={form.nombre} onChange={e => setForm({...form,nombre:e.target.value})}/>
            </div>
            <div className="field">
              <label>WhatsApp</label>
              <input placeholder="Ej: 5492236789012" value={form.whatsapp} onChange={e => setForm({...form,whatsapp:e.target.value})}/>
              <div className="field-hint">Incluí el código de país sin el + · Ej: 5492236789012 (Argentina)</div>
            </div>
            <div className="field">
              <label>¿Qué querés trabajar? (opcional)</label>
              <textarea placeholder="Contanos un poco sobre lo que querés consultar..."
                value={form.mensaje} onChange={e => setForm({...form,mensaje:e.target.value})}/>
            </div>

            {/* RESUMEN + BOTONES — aparecen cuando nombre y whatsapp están completos */}
            {formularioListo && (<>
              <div className="resumen">
                <div className="resumen-row"><span className="resumen-lbl">Servicio</span><span className="resumen-val">{servicioSel?.nombre}</span></div>
                {servicioSel?.tipo_servicio !== 'entrega' && <>
                  <div className="resumen-row"><span className="resumen-lbl">Fecha</span><span className="resumen-val">{new Date(fechaSel+'T12:00:00').toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'})}</span></div>
                  <div className="resumen-row"><span className="resumen-lbl">Hora</span><span className="resumen-val">{horaSel} hs</span></div>
                </>}
                {servicioSel?.tipo_servicio === 'entrega' && (
                  <div className="resumen-row"><span className="resumen-lbl">Entrega estimada</span><span className="resumen-val">En {servicioSel.plazo_horas}hs</span></div>
                )}
                <div className="resumen-row"><span className="resumen-lbl">Total</span><span className="resumen-total">${servicioSel?.precio_base.toLocaleString()}</span></div>
              </div>

              {errorMsg && <div className="error-msg">{errorMsg}</div>}

              {/* CASO 1: requiere pago (sena o completo) */}
              {requierePago && (<>
                <div className="section-label" style={{marginBottom:'12px',justifyContent:'flex-start'}}>¿Cómo querés pagar?</div>
                <div className="metodo-pago-wrap">
                  <div className={`metodo-pago-opt${metodoPago==='mp'?' sel':''}`}
                    onClick={() => setMetodoPago('mp')}>
                    <div className="metodo-radio">{metodoPago==='mp' && <div className="metodo-radio-inner"/>}</div>
                    <div>
                      <div className="metodo-label">💳 Mercado Pago</div>
                      <div className="metodo-sub">Pagá con tarjeta, débito o saldo MP</div>
                    </div>
                  </div>
                  {mostrarTransferencia && (
                    <div className={`metodo-pago-opt${metodoPago==='transferencia'?' sel':''}`}
                      onClick={() => setMetodoPago('transferencia')}>
                      <div className="metodo-radio">{metodoPago==='transferencia' && <div className="metodo-radio-inner"/>}</div>
                      <div>
                        <div className="metodo-label">🏦 Transferencia bancaria</div>
                        <div className="metodo-sub">Transferí y enviá el comprobante por WhatsApp</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* TRANSFERENCIA seleccionada */}
                {metodoPago === 'transferencia' && (<>
                  <div className="transferencia-datos">
                    <div className="transferencia-titulo">Datos para transferir</div>
                    {terapeuta.alias_pago && <div className="transferencia-row"><span className="transferencia-lbl">Alias</span><span className="transferencia-val">{terapeuta.alias_pago}</span></div>}
                    {terapeuta.cbu && <div className="transferencia-row"><span className="transferencia-lbl">CBU</span><span className="transferencia-val" style={{fontSize:'12px'}}>{terapeuta.cbu}</span></div>}
                    {terapeuta.titular_cuenta && <div className="transferencia-row"><span className="transferencia-lbl">Titular</span><span className="transferencia-val">{terapeuta.titular_cuenta}</span></div>}
                    {terapeuta.banco && <div className="transferencia-row"><span className="transferencia-lbl">Banco</span><span className="transferencia-val">{terapeuta.banco}</span></div>}
                    {terapeuta.instrucciones_pago && <div className="transferencia-instrucciones">{terapeuta.instrucciones_pago}</div>}
                  </div>
                  <button className="confirmar-btn" onClick={confirmarTransferencia} disabled={enviandoTransferencia}>
                    {enviandoTransferencia ? `${t.deco} Confirmando...` : `${t.deco} Ya realicé el pago`}
                  </button>
                </>)}

                {/* MP seleccionado */}
                {metodoPago === 'mp' && (<>
                  {mpError && <div className="error-msg">{mpError}</div>}
                  <button className="confirmar-btn" onClick={prepararMP} disabled={preparandoMP}>
                    {preparandoMP ? `${t.deco} Preparando pago...` : `${t.deco} Pagar con Mercado Pago`}
                  </button>
                </>)}

                {/* ningún método seleccionado */}
                {!metodoPago && (
                  <div style={{fontSize:'13px',color:'var(--text-dim)',textAlign:'center',fontFamily:'var(--font-subtitle)',padding:'8px 0'}}>
                    Elegí cómo querés pagar para continuar
                  </div>
                )}
              </>)}

              {/* CASO 2: reserva libre (sin pago) */}
              {!requierePago && (
                <button className="confirmar-btn" onClick={confirmarReservaLibre} disabled={enviando}>
                  {enviando ? `${t.deco} Confirmando...` : `${t.deco} Confirmar reserva`}
                </button>
              )}
            </>)}
          </div>
        )}

        {/* ÉXITO */}
        {enviado && (
          <div className="exito-wrap">
            <div className="exito-circle"><Check size={36} color="white"/></div>
            <h2 className="exito-title">
              {metodoPago === 'transferencia' ? '¡Reserva recibida!' : '¡Reserva confirmada!'}
            </h2>
            <p className="exito-sub">
              {metodoPago === 'transferencia'
                ? <>Tu reserva de <em>{servicioSel?.nombre}</em> fue registrada. Una vez que confirmemos tu pago, te vamos a avisar por WhatsApp.</>
                : <>Tu sesión de <em>{servicioSel?.nombre}</em> quedó agendada. {terapeuta.nombre_profesional} se va a contactar con vos pronto.</>}
            </p>
            {metodoPago === 'transferencia' && terapeuta.whatsapp && (
  <a className="wsp-btn" style={{marginBottom:'12px'}}
    href={`https://wa.me/${terapeuta.whatsapp.replace(/\D/g,'').replace(/^0+/,'')}?text=${encodeURIComponent(
      servicioSel?.tipo_servicio === 'entrega'
        ? `Hola! Te envío el comprobante de pago por mi pedido de ${servicioSel?.nombre}. 🧾`
        : `Hola! Te envío el comprobante de pago por mi reserva de ${servicioSel?.nombre} el ${fechaSel} a las ${horaSel}hs. 🧾`
    )}`}
    target="_blank" rel="noopener noreferrer">
    📎 Enviar comprobante por WhatsApp
  </a>
)}
            {terapeuta.whatsapp && (
              <a className="wsp-btn" href={`https://wa.me/${terapeuta.whatsapp.replace(/\D/g,'').replace(/^0+/,'')}`} target="_blank" rel="noopener noreferrer">
                💬 Escribir por WhatsApp
              </a>
            )}
          </div>
        )}
      </section>

      {secciones.faq && faqItems.length > 0 && (<>
        <div className="divider">{t.deco} {t.deco} {t.deco}</div>
        <section className="section">
          <div className="section-label">FAQ</div>
          <h2 className="section-title">Preguntas frecuentes</h2>
          {faqItems.map((item, i) => (
            <div key={i} className="faq-item">
              <div className="faq-pregunta" onClick={() => setFaqAbierto(faqAbierto === i ? null : i)}>
                <span>{item.pregunta}</span>
                <span style={{fontSize:'18px',color:'var(--primary)'}}>{faqAbierto === i ? '−' : '+'}</span>
              </div>
              {faqAbierto === i && <div className="faq-respuesta">{item.respuesta}</div>}
            </div>
          ))}
        </section>
      </>)}

      {secciones.testimonios && (<>
        <div className="divider">{t.deco} {t.deco} {t.deco}</div>
        <section className="section">
          <div className="section-label">Testimonios</div>
          <h2 className="section-title">Lo que dicen</h2>
          <div className="testi-card">
            <div className="testi-quote">"</div>
            <p className="testi-texto">{(terapeuta.testimonios?.length ? terapeuta.testimonios : TESTIMONIOS_DEFAULT)[testiIdx]?.texto}</p>
            <div className="testi-nombre">— {(terapeuta.testimonios?.length ? terapeuta.testimonios : TESTIMONIOS_DEFAULT)[testiIdx]?.nombre}</div>
          </div>
          <div className="testi-dots">
            {(terapeuta.testimonios?.length ? terapeuta.testimonios : TESTIMONIOS_DEFAULT).map((_,i) => (
              <div key={i} className={`testi-dot${testiIdx===i?' act':''}`} onClick={() => setTestiIdx(i)}/>
            ))}
          </div>
        </section>
      </>)}

      <section className="section">
        <div className="cta-final">
          <div className="section-label">¿Lista para tu próximo paso?</div>
          <h2 style={{fontFamily:'var(--font-title)',fontSize:'clamp(28px,5vw,40px)',fontWeight:300,color:'var(--cream)',marginBottom:'8px'}}>
            Tu proceso merece<br/>un espacio cuidado {t.deco}
          </h2>
          <p style={{fontSize:'15px',color:'var(--text-dim)',marginBottom:'28px',fontFamily:'var(--font-subtitle)'}}>
            Estoy aquí para acompañarte
          </p>
          <button className="hero-cta" onClick={() => reservaRef.current?.scrollIntoView({behavior:'smooth'})}>
            {t.deco} Reservar mi sesión
          </button>
        </div>
      </section>

      {terapeuta.whatsapp && (
        <a href={`https://wa.me/${terapeuta.whatsapp.replace(/\D/g,'').replace(/^0+/,'')}`}
          target="_blank" rel="noopener noreferrer"
          style={{position:'fixed',bottom:'24px',right:'24px',zIndex:200,display:'flex',alignItems:'center',gap:'10px',padding:'12px 20px',background:'#25D366',color:'white',borderRadius:'50px',fontFamily:'var(--font-body)',fontSize:'13px',fontWeight:600,textDecoration:'none',boxShadow:'0 6px 24px rgba(37,211,102,0.4)'}}>
          💬 ¿Dudas? Escribime
        </a>
      )}

      {/* MODAL — fuera de cualquier section */}
      {servicioModal && (
        <div className="serv-modal-overlay" onClick={cerrarModal}>
          <div className="serv-modal" onClick={e => e.stopPropagation()}>
            <button className="serv-modal-close" onClick={cerrarModal}>×</button>
            <div className="serv-modal-tipo">{servicioModal.tipo_servicio === 'entrega' ? `⏳ Entrega en ${servicioModal.plazo_horas}hs` : '🔴 Sesión en vivo'}</div>
            <div className="serv-modal-nombre">{servicioModal.nombre}</div>
            <div className="serv-modal-desc">{servicioModal.descripcion}</div>
            <div className="serv-modal-meta">
              <div className="serv-modal-pill">
                {servicioModal.tipo_servicio === 'entrega' ? `📦 Entrega en ${servicioModal.plazo_horas}hs` : `⏱ ${servicioModal.duracion_estimada} min`}
              </div>
            </div>
            <div className="serv-modal-precio">${servicioModal.precio_base.toLocaleString()}</div>
            <button className="serv-modal-btn" onClick={() => {
              setServicioSel(servicioModal)
              setFechaSel('')
              setHoraSel('')
              setMetodoPago(null)
              setMpInitPoint(null)
              setMpError('')
              setErrorMsg('')
              setEnviado(false)
              setEnviando(false)
              setEnviandoTransferencia(false)
              setForm({ nombre: '', whatsapp: '', mensaje: '' })
              setPaso(0)
              cerrarModal()
              if (servicioModal.tipo_servicio === 'entrega') {
                // entrega: no necesita fecha/hora del calendario
                setFechaSel(new Date().toISOString().split('T')[0])
setHoraSel('12:00')
                setPaso(3)
                setTimeout(() => formularioRef.current?.scrollIntoView({behavior:'smooth',block:'nearest'}), 150)
              } else {
                // sesión en vivo: ir al calendario
                setPaso(2)
                setTimeout(() => horariosRef.current?.scrollIntoView({behavior:'smooth',block:'nearest'}), 150)
              }
            }}>
              {t.deco} {servicioModal.tipo_servicio === 'entrega' ? 'Solicitar ahora' : 'Reservar sesión'}
            </button>
          </div>
        </div>
      )}

      <footer className="footer">
        © 2025 {terapeuta.nombre_profesional} · Powered by <span>Luma</span>
      </footer>
    </div>
  )
}