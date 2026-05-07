'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, X, Move, Lock, BarChart2, XCircle, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const HORAS = Array.from({length: 14}, (_, i) => i + 7)
const DIAS_SEMANA = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const DIAS_COMPLETO = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

type Turno = {
  id: string; patient_id: string; paciente_nombre: string
  fecha: string; hora: string; duracion: number
  servicio_nombre: string; precio: number
  estado_pago: string; estado_sesion: string
}
type Bloqueo = {
  id: string; titulo: string
  fecha_inicio: string; fecha_fin: string
  hora_inicio_solo: string; hora_fin_solo: string
  tipo: string; color: string
}
type Disponibilidad = {
  id?: string; dia_semana: number
  hora_inicio: string; hora_fin: string; activo: boolean
}
type Vista = 'semana' | 'mes'

const DISPONIBILIDAD_DEFAULT: Disponibilidad[] = [
  { dia_semana: 1, hora_inicio: '09:00', hora_fin: '18:00', activo: true },
  { dia_semana: 2, hora_inicio: '09:00', hora_fin: '18:00', activo: true },
  { dia_semana: 3, hora_inicio: '09:00', hora_fin: '18:00', activo: true },
  { dia_semana: 4, hora_inicio: '09:00', hora_fin: '18:00', activo: true },
  { dia_semana: 5, hora_inicio: '09:00', hora_fin: '18:00', activo: true },
  { dia_semana: 6, hora_inicio: '09:00', hora_fin: '13:00', activo: false },
  { dia_semana: 0, hora_inicio: '09:00', hora_fin: '13:00', activo: false },
]

const COLORES_TIPO: Record<string, { bg: string; border: string; text: string }> = {
  bloqueo:    { bg: '#F1F5F9', border: '#CBD5E1', text: '#475569' },
  descanso:   { bg: '#FEF9C3', border: '#FDE68A', text: '#92400E' },
  vacaciones: { bg: '#DCFCE7', border: '#86EFAC', text: '#166534' },
  personal:   { bg: '#FCE7F3', border: '#F9A8D4', text: '#9D174D' },
}

const COLORES_SERVICIO: Record<string, { bg: string; text: string }> = {
  'Lectura general':    { bg: '#EDE8FF', text: '#4C1D95' },
  'Lectura vincular':   { bg: '#FEF3C7', text: '#92400E' },
  'Armonización':       { bg: '#DCFCE7', text: '#065F46' },
  'Limpieza energética':{ bg: '#DBEAFE', text: '#1E40AF' },
  'Sesión una hora':    { bg: '#FCE7F3', text: '#9D174D' },
}

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function horaAMin(hora: string) {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + (m || 0)
}

export default function AgendaPage() {
  const hoy = new Date()
  const [vista, setVista] = useState<Vista>('semana')
  const [fechaBase, setFechaBase] = useState(new Date())
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([])
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad[]>(DISPONIBILIDAD_DEFAULT)
  const [loading, setLoading] = useState(true)
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<Turno | null>(null)
  const [vistaTab, setVistaTab] = useState<'calendario'|'carga'|'cancelados'>('calendario')
  const [modalBloqueo, setModalBloqueo] = useState(false)
  const [modalDisponibilidad, setModalDisponibilidad] = useState(false)
  const [guardandoBloqueo, setGuardandoBloqueo] = useState(false)
  const [guardandoDisp, setGuardandoDisp] = useState(false)
  const [dispLocal, setDispLocal] = useState<Disponibilidad[]>(DISPONIBILIDAD_DEFAULT)
  const [arrastrando, setArrastrando] = useState<string | null>(null)

  const [formBloqueo, setFormBloqueo] = useState({
    titulo: '', fecha_inicio: '', hora_inicio: '09:00',
    fecha_fin: '', hora_fin: '10:00', tipo: 'bloqueo',
  })

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    try {
      const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: sess }, { data: pacs }, { data: blocks }, { data: avail }] = await Promise.all([
      supabase.from('sessions').select('*').eq('user_id', user.id),
      supabase.from('patients').select('id,nombre,apellido').eq('user_id', user.id),
      supabase.from('calendar_blocks').select('*').eq('user_id', user.id),
      supabase.from('availability').select('*').eq('user_id', user.id),
    ])

    if (pacs && sess) {
      const map: Record<string, string> = {}
      pacs.forEach(p => { map[p.id] = `${p.nombre} ${p.apellido}`.trim() })
      setTurnos(sess.map(s => ({
        id: s.id, patient_id: s.patient_id,
        paciente_nombre: map[s.patient_id] || 'Paciente',
        fecha: s.fecha?.split('T')[0] || '',
        hora: s.hora || '09:00',
        duracion: s.duracion || 60,
        servicio_nombre: s.servicio_nombre || '',
        precio: s.precio || 0,
        estado_pago: s.estado_pago || 'pendiente',
        estado_sesion: s.estado_sesion || 'confirmada',
      })))
    }

    if (blocks) {
      setBloqueos(blocks.map(b => {
        const parseHora = (ts: string) => {
          if (!ts) return '00:00'
          const normalizado = ts.replace(' ', 'T')
          const fecha = new Date(normalizado)
          return `${String(fecha.getHours()).padStart(2,'0')}:${String(fecha.getMinutes()).padStart(2,'0')}`
        }
        const parseFecha = (ts: string) => {
          if (!ts) return ''
          const normalizado = ts.replace(' ', 'T')
          const fecha = new Date(normalizado)
          return formatDate(fecha)
        }
        return {
          ...b,
          fecha_inicio: parseFecha(b.fecha_inicio),
          fecha_fin: parseFecha(b.fecha_fin),
          hora_inicio_solo: parseHora(b.fecha_inicio),
          hora_fin_solo: parseHora(b.fecha_fin),
        }
      }))
    }

    if (avail && avail.length > 0) {
      const dispCompleta = DISPONIBILIDAD_DEFAULT.map(def => {
        const guardada = avail.find(a => a.dia_semana === def.dia_semana)
        return guardada ? { ...guardada } : def
      })
      setDisponibilidad(dispCompleta)
      setDispLocal(dispCompleta)
    } else {
      setDispLocal(DISPONIBILIDAD_DEFAULT)
    }

  } catch (err) {
    console.error('Error en agenda:', err)
  } finally {
    setLoading(false)
  }
  }

  const diasSemana = useMemo(() => {
    const inicio = new Date(fechaBase)
    const dia = inicio.getDay()
    const diff = dia === 0 ? -6 : 1 - dia
    inicio.setDate(inicio.getDate() + diff)
    return Array.from({length: 7}, (_, i) => {
      const d = new Date(inicio)
      d.setDate(inicio.getDate() + i)
      return d
    })
  }, [fechaBase])

  const diasMes = useMemo(() => {
    const año = fechaBase.getFullYear()
    const mes = fechaBase.getMonth()
    const primerDia = new Date(año, mes, 1)
    const ultimoDia = new Date(año, mes + 1, 0)
    const offset = primerDia.getDay() === 0 ? 6 : primerDia.getDay() - 1
    const dias: (Date | null)[] = []
    for (let i = 0; i < offset; i++) dias.push(null)
    for (let i = 1; i <= ultimoDia.getDate(); i++) dias.push(new Date(año, mes, i))
    return dias
  }, [fechaBase])

  function navAnterior() {
    const d = new Date(fechaBase)
    if (vista === 'semana') d.setDate(d.getDate() - 7)
    else d.setMonth(d.getMonth() - 1)
    setFechaBase(d)
  }
  function navSiguiente() {
    const d = new Date(fechaBase)
    if (vista === 'semana') d.setDate(d.getDate() + 7)
    else d.setMonth(d.getMonth() + 1)
    setFechaBase(d)
  }

  function turnosDelDia(fecha: Date) {
    const f = formatDate(fecha)
    return turnos.filter(t => t.fecha === f && t.estado_sesion !== 'cancelada')
  }

  function turnosEnHora(fecha: Date, hora: number) {
    return turnosDelDia(fecha).filter(t => {
      const hTurno = parseInt(t.hora.split(':')[0])
      return hTurno === hora
    })
  }

  function bloqueosEnCelda(fecha: Date, hora: number): Bloqueo[] {
    const f = formatDate(fecha)
    const horaMin = hora * 60
    return bloqueos.filter(b => {
      const fechaIni = b.fecha_inicio.split('T')[0]
      const fechaFin = b.fecha_fin.split('T')[0]
      if (f < fechaIni || f > fechaFin) return false
      const bIni = horaAMin(b.hora_inicio_solo)
      const bFin = horaAMin(b.hora_fin_solo)
      if (bIni === 0 && bFin >= 23 * 60) return true
      return horaMin >= bIni && horaMin < bFin
    })
  }

  function esFueraDeHorario(fecha: Date, hora: number): boolean {
    const diaSemana = fecha.getDay()
    const disp = disponibilidad.find(d => d.dia_semana === diaSemana)
    if (!disp) return true
    if (!disp.activo) return true
    const horaMin = hora * 60
    const ini = horaAMin(disp.hora_inicio)
    const fin = horaAMin(disp.hora_fin)
    return horaMin < ini || horaMin >= fin
  }

  async function moverTurno(turnoId: string, nuevaFecha: string, nuevaHora: string) {
    const supabase = createClient()
    await supabase.from('sessions').update({
      fecha: nuevaFecha + 'T' + nuevaHora + ':00',
      hora: nuevaHora,
    }).eq('id', turnoId)
    setTurnos(prev => prev.map(t => t.id === turnoId ? {...t, fecha: nuevaFecha, hora: nuevaHora} : t))
    setArrastrando(null)
  }

  async function cancelarTurno(id: string) {
    const supabase = createClient()
    await supabase.from('sessions').update({ estado_sesion: 'cancelada' }).eq('id', id)
    setTurnos(prev => prev.map(t => t.id === id ? {...t, estado_sesion: 'cancelada'} : t))
    setTurnoSeleccionado(null)
  }

  async function guardarBloqueo() {
    if (!formBloqueo.titulo || !formBloqueo.fecha_inicio) return
    setGuardandoBloqueo(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase.from('calendar_blocks').insert({
      user_id: user.id,
      titulo: formBloqueo.titulo,
      fecha_inicio: formBloqueo.fecha_inicio + 'T' + formBloqueo.hora_inicio + ':00',
      fecha_fin: (formBloqueo.fecha_fin || formBloqueo.fecha_inicio) + 'T' + formBloqueo.hora_fin + ':00',
      tipo: formBloqueo.tipo,
      color: COLORES_TIPO[formBloqueo.tipo]?.bg || '#F1F5F9',
    }).select().single()

    if (data) {
      setBloqueos(prev => [...prev, {
        ...data,
        fecha_inicio: formBloqueo.fecha_inicio,
        fecha_fin: formBloqueo.fecha_fin || formBloqueo.fecha_inicio,
        hora_inicio_solo: formBloqueo.hora_inicio,
        hora_fin_solo: formBloqueo.hora_fin,
      }])
    }
    setModalBloqueo(false)
    setGuardandoBloqueo(false)
    setFormBloqueo({ titulo: '', fecha_inicio: '', hora_inicio: '09:00', fecha_fin: '', hora_fin: '10:00', tipo: 'bloqueo' })
  }

  async function borrarBloqueo(id: string) {
    const supabase = createClient()
    await supabase.from('calendar_blocks').delete().eq('id', id)
    setBloqueos(prev => prev.filter(b => b.id !== id))
  }

  async function guardarDisponibilidad() {
    setGuardandoDisp(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('availability').delete().eq('user_id', user.id)
    const { data } = await supabase.from('availability').insert(
      dispLocal.map(d => ({
        user_id: user.id,
        dia_semana: d.dia_semana,
        hora_inicio: d.hora_inicio,
        hora_fin: d.hora_fin,
        activo: d.activo,
      }))
    ).select()
    if (data) setDisponibilidad(dispLocal)
    setModalDisponibilidad(false)
    setGuardandoDisp(false)
  }

  const cargaSemanal = useMemo(() => {
    return diasSemana.map(d => ({
      dia: DIAS_SEMANA[d.getDay()],
      count: turnosDelDia(d).length,
      horas: turnosDelDia(d).reduce((a, t) => a + (t.duracion||60)/60, 0),
      esHoy: formatDate(d) === formatDate(hoy),
      fecha: d.toLocaleDateString('es-AR', {day:'numeric', month:'short'}),
    }))
  }, [diasSemana, turnos])

  const maxCarga = Math.max(...cargaSemanal.map(d => d.count), 1)
  const cancelados = turnos.filter(t => t.estado_sesion === 'cancelada')

  const periodoLabel = vista === 'semana'
    ? `${diasSemana[0].getDate()} ${MESES[diasSemana[0].getMonth()].slice(0,3)} — ${diasSemana[6].getDate()} ${MESES[diasSemana[6].getMonth()].slice(0,3)} ${diasSemana[6].getFullYear()}`
    : `${MESES[fechaBase.getMonth()]} ${fechaBase.getFullYear()}`

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:'13px',color:'#9B8EC4',background:'#F4F2FF'}}>
      Cargando...
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box}
        .aw{height:100vh;display:flex;flex-direction:column;font-family:'Inter',sans-serif;background:#F4F2FF;padding:12px 14px;gap:10px;overflow:hidden}
        .a-header{display:flex;align-items:center;justify-content:space-between;flex-shrink:0;gap:8px}
        .a-title{font-size:17px;font-weight:800;color:#1A1035;letter-spacing:-0.5px}
        .a-periodo{font-size:11px;color:#7C6BAA;margin-top:1px}
        .a-right{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
        .a-tabs{display:flex;gap:2px;background:white;padding:3px;border-radius:10px;border:0.5px solid #EDE9FF;box-shadow:0 1px 4px rgba(139,92,246,0.06)}
        .a-tab{padding:5px 11px;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;border:none;background:transparent;color:#A99CC4;font-family:inherit;transition:all 0.15s;display:flex;align-items:center;gap:4px;white-space:nowrap}
        .a-tab.active{background:#F0EBFF;color:#7C3AED}
        .a-vista{display:flex;gap:2px;background:white;padding:3px;border-radius:10px;border:0.5px solid #EDE9FF;box-shadow:0 1px 4px rgba(139,92,246,0.06)}
        .a-vista-btn{padding:5px 11px;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;border:none;background:transparent;color:#A99CC4;font-family:inherit;transition:all 0.15s}
        .a-vista-btn.active{background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:white;box-shadow:0 2px 6px rgba(139,92,246,0.25)}
        .a-nav{display:flex;align-items:center;gap:4px}
        .a-nav-btn{width:28px;height:28px;border-radius:7px;border:0.5px solid #E2D9FF;background:white;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#7C6BAA;box-shadow:0 1px 3px rgba(139,92,246,0.06)}
        .a-nav-btn:hover{border-color:#8B5CF6;color:#7C3AED}
        .a-hoy-btn{padding:5px 12px;border-radius:7px;border:0.5px solid #E2D9FF;background:white;font-size:11px;font-weight:600;color:#7C3AED;cursor:pointer;font-family:inherit}
        .a-bloqueo-btn{display:flex;align-items:center;gap:4px;padding:6px 11px;background:#F0EBFF;color:#7C3AED;border:none;border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit}
        .a-bloqueo-btn:hover{background:#EDE8FF}
        .a-disp-btn{display:flex;align-items:center;gap:4px;padding:6px 11px;background:white;color:#7C6BAA;border:0.5px solid #E2D9FF;border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 1px 3px rgba(139,92,246,0.06)}
        .a-disp-btn:hover{border-color:#8B5CF6;color:#7C3AED}
        .semana-outer{flex:1;min-height:0;display:flex;flex-direction:column;background:white;border-radius:16px;box-shadow:0 4px 20px rgba(139,92,246,0.08);border:0.5px solid #EDE9FF;overflow:hidden}
        .semana-headers{display:grid;grid-template-columns:44px repeat(7,1fr);flex-shrink:0;border-bottom:0.5px solid #EDE9FF;background:#FAFAFF}
        .semana-corner{border-right:0.5px solid #EDE9FF}
        .sdh{padding:8px 4px;text-align:center;border-right:0.5px solid #EDE9FF}
        .sdh-dia{font-size:10px;font-weight:600;color:#A99CC4;text-transform:uppercase}
        .sdh-num{font-size:15px;font-weight:800;color:#1A1035;line-height:1;margin-top:2px}
        .sdh-num.hoy{width:26px;height:26px;background:linear-gradient(135deg,#8B5CF6,#A78BFA);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:12px;margin:2px auto 0}
        .semana-scroll{flex:1;overflow-y:auto;min-height:0}
        .semana-grid{display:grid;grid-template-columns:44px repeat(7,1fr)}
        .hora-lbl{border-right:0.5px solid #EDE9FF;border-bottom:0.5px solid #F0EBFF;height:56px;display:flex;align-items:flex-start;justify-content:flex-end;padding:4px 5px 0;font-size:10px;color:#C4B8E8;font-weight:500;background:#FAFAFF}
        .celda{border-right:0.5px solid #F0EBFF;border-bottom:0.5px solid #F0EBFF;height:56px;position:relative;transition:background 0.1s}
        .celda.fuera{background:repeating-linear-gradient(-45deg,#F8F6FF,#F8F6FF 3px,#F4F2FF 3px,#F4F2FF 7px)}
        .celda.bloqueada{background:repeating-linear-gradient(45deg,#FEF9C3,#FEF9C3 3px,#FFFBEB 3px,#FFFBEB 7px)}
        .celda.hoy-col{background:rgba(139,92,246,0.015)}
        .celda:not(.fuera):not(.bloqueada):hover{background:#FDFCFF;cursor:pointer}
        .bloqueo-chip{position:absolute;inset:2px 3px;border-radius:6px;padding:3px 6px;z-index:2;display:flex;align-items:center;gap:4px;overflow:hidden}
        .bloqueo-chip-label{font-size:9px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .bloqueo-x{width:14px;height:14px;border-radius:50%;background:rgba(0,0,0,0.1);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;font-size:9px;margin-left:auto}
        .turno-chip{position:absolute;left:3px;right:3px;border-radius:8px;padding:4px 7px;cursor:pointer;z-index:3;overflow:hidden;transition:all 0.15s;box-shadow:0 1px 4px rgba(0,0,0,0.1)}
        .turno-chip:hover{box-shadow:0 3px 10px rgba(0,0,0,0.15);transform:scale(1.01)}
        .turno-chip.dragging{opacity:0.4}
        .tc-nombre{font-size:10px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .tc-serv{font-size:9px;opacity:0.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .tc-hora{font-size:9px;opacity:0.55;margin-top:1px}
        .mes-outer{flex:1;min-height:0;display:flex;flex-direction:column;background:white;border-radius:16px;box-shadow:0 4px 20px rgba(139,92,246,0.08);border:0.5px solid #EDE9FF;overflow:hidden}
        .mes-hdr-row{display:grid;grid-template-columns:repeat(7,1fr);border-bottom:0.5px solid #EDE9FF;background:#FAFAFF;flex-shrink:0}
        .mes-hdr-dia{padding:8px;text-align:center;font-size:10px;font-weight:700;color:#A99CC4;text-transform:uppercase}
        .mes-grid{flex:1;display:grid;grid-template-columns:repeat(7,1fr);grid-auto-rows:1fr;overflow:hidden}
        .mes-celda{border-right:0.5px solid #F0EBFF;border-bottom:0.5px solid #F0EBFF;padding:5px;cursor:pointer;overflow:hidden;transition:background 0.1s}
        .mes-celda:hover{background:#FDFCFF}
        .mes-celda.hoy-c{background:rgba(139,92,246,0.04)}
        .mes-celda.vacio{background:#FAFAFF;cursor:default}
        .mes-celda.fuera-rango{background:repeating-linear-gradient(-45deg,#F8F6FF,#F8F6FF 3px,#F4F2FF 3px,#F4F2FF 7px)}
        .mes-num{font-size:11px;font-weight:700;color:#6B5B8A;width:20px;height:20px;display:flex;align-items:center;justify-content:center;border-radius:50%;margin-bottom:3px}
        .mes-num.hoy{background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:white;font-size:10px}
        .mes-chip{font-size:9px;padding:2px 5px;border-radius:4px;margin-bottom:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500;cursor:pointer}
        .mes-mas{font-size:9px;color:#A99CC4;padding-left:3px}
        .carga-outer{flex:1;background:white;border-radius:16px;padding:18px;box-shadow:0 4px 20px rgba(139,92,246,0.08);border:0.5px solid #EDE9FF;overflow-y:auto}
        .carga-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:10px;margin-top:14px}
        .carga-dia{border-radius:14px;padding:14px 10px;text-align:center;border:0.5px solid #EDE9FF;background:#FAFAFF}
        .carga-dia.hoy{border-color:#8B5CF6;background:linear-gradient(135deg,#EDE8FF,#F5F0FF)}
        .carga-dia-lbl{font-size:11px;font-weight:700;color:#1A1035;margin-bottom:2px}
        .carga-dia-fecha{font-size:9px;color:#A99CC4;margin-bottom:10px}
        .carga-bar-bg{height:70px;background:#F0EBFF;border-radius:8px;display:flex;align-items:flex-end;overflow:hidden;margin-bottom:8px}
        .carga-bar-fill{width:100%;background:linear-gradient(180deg,#8B5CF6,#A78BFA);border-radius:8px;transition:height 0.5s}
        .carga-count{font-size:16px;font-weight:800;color:#1A1035}
        .carga-lbl{font-size:9px;color:#A99CC4}
        .carga-h{font-size:10px;color:#7C6BAA;margin-top:3px;font-weight:500}
        .canc-outer{flex:1;background:white;border-radius:16px;padding:18px;box-shadow:0 4px 20px rgba(139,92,246,0.08);border:0.5px solid #EDE9FF;overflow-y:auto}
        .canc-list{display:flex;flex-direction:column;gap:7px;margin-top:12px}
        .canc-item{background:#FEF2F2;border-radius:12px;padding:11px 13px;border:0.5px solid #FECACA;display:flex;align-items:center;gap:10px}
        .canc-dot{width:7px;height:7px;border-radius:50%;background:#EF4444;flex-shrink:0}
        .canc-body{flex:1}
        .canc-nombre{font-size:12px;font-weight:600;color:#1A1035}
        .canc-info{font-size:10px;color:#A99CC4;margin-top:1px}
        .canc-restore{padding:5px 10px;border-radius:7px;background:white;border:0.5px solid #E2D9FF;color:#7C3AED;font-size:10px;font-weight:600;cursor:pointer;font-family:inherit}
        .canc-restore:hover{background:#F0EBFF}
        .det-overlay{position:fixed;inset:0;background:rgba(26,16,53,0.35);display:flex;align-items:center;justify-content:center;z-index:100;backdrop-filter:blur(3px)}
        .det-panel{background:white;border-radius:20px;padding:22px;width:340px;box-shadow:0 24px 60px rgba(100,60,200,0.2)}
        .det-hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px}
        .det-nombre{font-size:15px;font-weight:800;color:#1A1035;letter-spacing:-0.3px}
        .det-serv{font-size:11px;color:#A99CC4;margin-top:2px}
        .det-close{width:26px;height:26px;border-radius:7px;border:0.5px solid #E2D9FF;background:#F8F6FF;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#A99CC4}
        .det-info{background:#F8F6FF;border-radius:12px;padding:12px;margin-bottom:12px;display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .det-info-lbl{font-size:9px;font-weight:700;color:#A99CC4;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px}
        .det-info-val{font-size:12px;font-weight:600;color:#1A1035}
        .det-badge{font-size:10px;padding:3px 8px;border-radius:20px;border:0.5px solid;font-weight:500;display:inline-block}
        .det-p{background:#FEF9C3;color:#854D0E;border-color:#FDE68A}
        .det-ok{background:#DCFCE7;color:#166534;border-color:#BBF7D0}
        .det-d{background:#DBEAFE;color:#1E40AF;border-color:#BFDBFE}
        .det-move-hint{font-size:10px;color:#A99CC4;display:flex;align-items:center;gap:5px;margin-bottom:10px;padding:7px 10px;background:#F8F6FF;border-radius:8px}
        .det-btn{width:100%;padding:9px;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;border:none;display:flex;align-items:center;justify-content:center;gap:6px;transition:all 0.15s;margin-bottom:6px}
        .det-btn.danger{background:#FEF2F2;color:#EF4444;border:0.5px solid #FECACA}
        .det-btn.sec{background:#F0EBFF;color:#7C3AED}
        .mo-overlay{position:fixed;inset:0;background:rgba(26,16,53,0.5);display:flex;align-items:center;justify-content:center;z-index:200;backdrop-filter:blur(4px)}
        .mo-box{background:white;border-radius:20px;padding:22px;width:420px;max-height:90vh;overflow-y:auto;box-shadow:0 32px 80px rgba(100,60,200,0.25)}
        .mo-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
        .mo-title{font-size:14px;font-weight:700;color:#1A1035}
        .mo-close{width:26px;height:26px;border-radius:7px;border:0.5px solid #E2D9FF;background:white;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#A99CC4}
        .field{display:flex;flex-direction:column;gap:4px;margin-bottom:12px}
        .field label{font-size:11px;font-weight:600;color:#1A1035}
        .field input,.field select{padding:8px 10px;border-radius:9px;border:0.5px solid #E2D9FF;font-size:12px;font-family:inherit;color:#1A1035;background:#FAFAFF;outline:none;width:100%}
        .field input:focus,.field select:focus{border-color:#8B5CF6;box-shadow:0 0 0 3px rgba(139,92,246,0.08)}
        .field-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .save-btn{width:100%;padding:10px;background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:white;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 4px 12px rgba(139,92,246,0.3)}
        .save-btn:disabled{opacity:0.6;cursor:not-allowed}
        .tipo-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin-top:4px}
        .tipo-btn{padding:9px;border-radius:9px;border:0.5px solid #E2D9FF;background:#FAFAFF;cursor:pointer;text-align:center;font-size:11px;font-weight:600;color:#7C6BAA;transition:all 0.15s;font-family:inherit}
        .tipo-btn.sel{border-color:#8B5CF6;background:#EDE8FF;color:#7C3AED}
        .disp-box{background:white;border-radius:20px;padding:22px;width:480px;max-height:90vh;overflow-y:auto;box-shadow:0 32px 80px rgba(100,60,200,0.25)}
        .disp-dia-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;border:0.5px solid #EDE9FF;background:#FAFAFF;margin-bottom:8px}
        .disp-dia-nombre{font-size:12px;font-weight:700;color:#1A1035;min-width:80px}
        .disp-switch{position:relative;width:36px;height:20px;cursor:pointer;flex-shrink:0}
        .disp-switch input{opacity:0;width:0;height:0}
        .disp-slider{position:absolute;inset:0;background:#E2D9FF;border-radius:20px;transition:all 0.2s}
        .disp-slider:before{content:'';position:absolute;width:14px;height:14px;left:3px;top:3px;background:white;border-radius:50%;transition:all 0.2s;box-shadow:0 1px 2px rgba(0,0,0,0.1)}
        input:checked + .disp-slider{background:#8B5CF6}
        input:checked + .disp-slider:before{transform:translateX(16px)}
        .disp-hora{padding:5px 8px;border-radius:7px;border:0.5px solid #E2D9FF;font-size:11px;font-family:inherit;color:#1A1035;background:white;outline:none;width:80px}
        .disp-hora:focus{border-color:#8B5CF6}
        .disp-hora:disabled{opacity:0.4;cursor:not-allowed}
        .disp-sep{font-size:11px;color:#A99CC4}
      `}</style>

      <div className="aw">
        <div className="a-header">
          <div>
            <div className="a-title">Agenda</div>
            <div className="a-periodo">{periodoLabel}</div>
          </div>
          <div className="a-right">
            <div className="a-tabs">
              <button className={`a-tab${vistaTab==='calendario'?' active':''}`} onClick={() => setVistaTab('calendario')}>Calendario</button>
              <button className={`a-tab${vistaTab==='carga'?' active':''}`} onClick={() => setVistaTab('carga')}><BarChart2 size={10}/>Carga</button>
              <button className={`a-tab${vistaTab==='cancelados'?' active':''}`} onClick={() => setVistaTab('cancelados')}><XCircle size={10}/>Cancelados</button>
            </div>
            {vistaTab === 'calendario' && (
              <div className="a-vista">
                <button className={`a-vista-btn${vista==='semana'?' active':''}`} onClick={() => setVista('semana')}>Semana</button>
                <button className={`a-vista-btn${vista==='mes'?' active':''}`} onClick={() => setVista('mes')}>Mes</button>
              </div>
            )}
            <div className="a-nav">
              <button className="a-nav-btn" onClick={navAnterior}><ChevronLeft size={12}/></button>
              <button className="a-hoy-btn" onClick={() => setFechaBase(new Date())}>Hoy</button>
              <button className="a-nav-btn" onClick={navSiguiente}><ChevronRight size={12}/></button>
            </div>
            <button className="a-bloqueo-btn" onClick={() => setModalBloqueo(true)}><Lock size={11}/>Bloquear</button>
            <button className="a-disp-btn" onClick={() => { setDispLocal([...disponibilidad]); setModalDisponibilidad(true) }}><Settings size={11}/>Disponibilidad</button>
          </div>
        </div>

        {vistaTab === 'calendario' && vista === 'semana' && (
          <div className="semana-outer">
            <div className="semana-headers">
              <div className="semana-corner"/>
              {diasSemana.map((dia, i) => (
                <div key={i} className="sdh">
                  <div className="sdh-dia">{['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][i]}</div>
                  <div className={`sdh-num${formatDate(dia)===formatDate(hoy)?' hoy':''}`}>{dia.getDate()}</div>
                </div>
              ))}
            </div>
            <div className="semana-scroll">
              <div className="semana-grid">
                {HORAS.map(hora => (
                  <React.Fragment key={hora}>
                    <div className="hora-lbl">{hora}:00</div>
                    {diasSemana.map((dia, di) => {
                      const bsCelda = bloqueosEnCelda(dia, hora)
                      const esBloqueada = bsCelda.length > 0
                      const esFuera = esFueraDeHorario(dia, hora)
                      const esHoy = formatDate(dia) === formatDate(hoy)
                      const turnosHora = turnosEnHora(dia, hora)
                      return (
                        <div
                          key={`${hora}-${di}`}
                          className={`celda${esBloqueada?' bloqueada':esFuera?' fuera':''}${esHoy?' hoy-col':''}`}
                          onDragOver={e => { if (!esBloqueada && !esFuera) e.preventDefault() }}
                          onDrop={e => {
                            e.preventDefault()
                            const id = e.dataTransfer.getData('turnoId')
                            if (id && !esBloqueada && !esFuera) moverTurno(id, formatDate(dia), `${String(hora).padStart(2,'0')}:00`)
                          }}>
                          {esBloqueada && bsCelda.map(b => {
                            const c = COLORES_TIPO[b.tipo] || COLORES_TIPO.bloqueo
                            return (
                              <div key={b.id} className="bloqueo-chip" style={{background:c.bg, border:`1px dashed ${c.border}`}}>
                                <span className="bloqueo-chip-label" style={{color:c.text}}>🔒 {b.titulo}</span>
                                <span className="bloqueo-x" onClick={() => borrarBloqueo(b.id)}>×</span>
                              </div>
                            )
                          })}
                          {turnosHora.map((t, ti) => {
                            const cs = COLORES_SERVICIO[t.servicio_nombre] || {bg:'#EDE8FF',text:'#4C1D95'}
                            const h = Math.max(((t.duracion||60)/60)*56-4, 22)
                            const minutos = parseInt(t.hora.split(':')[1] || '0')
                            const offsetTop = (minutos / 60) * 56
                            return (
                              <div
                                key={t.id}
                                className={`turno-chip${arrastrando===t.id?' dragging':''}`}
                                style={{background:cs.bg, top: offsetTop + ti*2, height:`${h}px`, left:ti>0?`${3+ti*8}px`:'3px'}}
                                draggable
                                onDragStart={e => { e.dataTransfer.setData('turnoId',t.id); setArrastrando(t.id) }}
                                onDragEnd={() => setArrastrando(null)}
                                onClick={() => setTurnoSeleccionado(t)}>
                                <div className="tc-nombre" style={{color:cs.text}}>{t.paciente_nombre}</div>
                                <div className="tc-serv" style={{color:cs.text}}>{t.servicio_nombre}</div>
                                <div className="tc-hora" style={{color:cs.text}}>{t.hora}</div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}

        {vistaTab === 'calendario' && vista === 'mes' && (
          <div className="mes-outer">
            <div className="mes-hdr-row">
              {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => (
                <div key={d} className="mes-hdr-dia">{d}</div>
              ))}
            </div>
            <div className="mes-grid">
              {diasMes.map((dia, i) => {
                if (!dia) return <div key={`v${i}`} className="mes-celda vacio"/>
                const ts = turnosDelDia(dia)
                const esHoy = formatDate(dia) === formatDate(hoy)
                const disp = disponibilidad.find(d => d.dia_semana === dia.getDay())
                const esFuera = !disp?.activo
                return (
                  <div key={i} className={`mes-celda${esHoy?' hoy-c':''}${esFuera?' fuera-rango':''}`}>
                    <div className={`mes-num${esHoy?' hoy':''}`}>{dia.getDate()}</div>
                    {ts.slice(0,3).map((t,ti) => {
                      const cs = COLORES_SERVICIO[t.servicio_nombre] || {bg:'#EDE8FF',text:'#4C1D95'}
                      return (
                        <div key={ti} className="mes-chip" style={{background:cs.bg,color:cs.text}}
                          onClick={() => setTurnoSeleccionado(t)}>
                          {t.hora} {t.paciente_nombre.split(' ')[0]}
                        </div>
                      )
                    })}
                    {ts.length > 3 && <div className="mes-mas">+{ts.length-3} más</div>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {vistaTab === 'carga' && (
          <div className="carga-outer">
            <div style={{fontSize:'14px',fontWeight:'700',color:'#1A1035'}}>Carga semanal</div>
            <div style={{fontSize:'11px',color:'#A99CC4',marginTop:'2px'}}>Distribución de turnos esta semana</div>
            <div className="carga-grid">
              {cargaSemanal.map((d,i) => (
                <div key={i} className={`carga-dia${d.esHoy?' hoy':''}`}>
                  <div className="carga-dia-lbl">{d.dia}</div>
                  <div className="carga-dia-fecha">{d.fecha}</div>
                  <div className="carga-bar-bg">
                    <div className="carga-bar-fill" style={{height:`${(d.count/maxCarga)*100}%`}}/>
                  </div>
                  <div className="carga-count">{d.count}</div>
                  <div className="carga-lbl">turnos</div>
                  <div className="carga-h">{Math.round(d.horas*10)/10}h</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {vistaTab === 'cancelados' && (
          <div className="canc-outer">
            <div style={{fontSize:'14px',fontWeight:'700',color:'#1A1035'}}>Turnos cancelados</div>
            <div style={{fontSize:'11px',color:'#A99CC4',marginTop:'2px'}}>{cancelados.length} en total</div>
            {cancelados.length === 0 ? (
              <div style={{textAlign:'center',padding:'40px',color:'#C4B8E8',fontSize:'12px'}}>
                <div style={{fontSize:'28px',marginBottom:'10px'}}>✓</div>No hay turnos cancelados
              </div>
            ) : (
              <div className="canc-list">
                {cancelados.map(t => (
                  <div key={t.id} className="canc-item">
                    <div className="canc-dot"/>
                    <div className="canc-body">
                      <div className="canc-nombre">{t.paciente_nombre}</div>
                      <div className="canc-info">
                        {new Date(t.fecha+'T12:00:00').toLocaleDateString('es-AR',{day:'numeric',month:'long'})} · {t.hora} · {t.servicio_nombre}
                      </div>
                    </div>
                    <button className="canc-restore" onClick={async () => {
                      const supabase = createClient()
                      await supabase.from('sessions').update({estado_sesion:'confirmada'}).eq('id',t.id)
                      setTurnos(prev => prev.map(s => s.id===t.id ? {...s,estado_sesion:'confirmada'} : s))
                    }}>Restaurar</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {turnoSeleccionado && (
        <div className="det-overlay" onClick={() => setTurnoSeleccionado(null)}>
          <div className="det-panel" onClick={e => e.stopPropagation()}>
            <div className="det-hdr">
              <div>
                <div className="det-nombre">{turnoSeleccionado.paciente_nombre}</div>
                <div className="det-serv">{turnoSeleccionado.servicio_nombre}</div>
              </div>
              <div className="det-close" onClick={() => setTurnoSeleccionado(null)}><X size={11}/></div>
            </div>
            <div className="det-info">
              <div><div className="det-info-lbl">Fecha</div><div className="det-info-val">{new Date(turnoSeleccionado.fecha+'T12:00:00').toLocaleDateString('es-AR',{day:'numeric',month:'long'})}</div></div>
              <div><div className="det-info-lbl">Hora</div><div className="det-info-val">{turnoSeleccionado.hora}</div></div>
              <div><div className="det-info-lbl">Duración</div><div className="det-info-val">{turnoSeleccionado.duracion} min</div></div>
              <div>
                <div className="det-info-lbl">Pago</div>
                <span className={`det-badge ${turnoSeleccionado.estado_pago==='pagado'?'det-ok':turnoSeleccionado.estado_pago==='señado'?'det-d':'det-p'}`}>
                  {turnoSeleccionado.estado_pago==='pagado'?'✓ Pagado':turnoSeleccionado.estado_pago==='señado'?'💛 Señado':'⚡ Pendiente'}
                </span>
              </div>
            </div>
            <div className="det-move-hint"><Move size={10}/>Arrastrá el chip en el calendario para mover el turno</div>
            <button className="det-btn danger" onClick={() => cancelarTurno(turnoSeleccionado.id)}><XCircle size={12}/>Cancelar turno</button>
            <button className="det-btn sec" onClick={() => setTurnoSeleccionado(null)}>Cerrar</button>
          </div>
        </div>
      )}

      {modalBloqueo && (
        <div className="mo-overlay" onClick={() => setModalBloqueo(false)}>
          <div className="mo-box" onClick={e => e.stopPropagation()}>
            <div className="mo-hdr">
              <span className="mo-title">Bloquear horario</span>
              <button className="mo-close" onClick={() => setModalBloqueo(false)}><X size={11}/></button>
            </div>
            <div className="field">
              <label>Título</label>
              <input placeholder="Ej: Vacaciones, Descanso..." value={formBloqueo.titulo}
                onChange={e => setFormBloqueo({...formBloqueo, titulo: e.target.value})}/>
            </div>
            <div className="field">
              <label>Tipo</label>
              <div className="tipo-grid">
                {(['bloqueo','descanso','vacaciones','personal'] as const).map(t => (
                  <button key={t} className={`tipo-btn${formBloqueo.tipo===t?' sel':''}`}
                    onClick={() => setFormBloqueo({...formBloqueo, tipo: t})}>
                    {t==='bloqueo'?'🔒 Bloqueo':t==='descanso'?'☕ Descanso':t==='vacaciones'?'🌴 Vacaciones':'💜 Personal'}
                  </button>
                ))}
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Fecha inicio</label>
                <input type="date" value={formBloqueo.fecha_inicio} onChange={e => setFormBloqueo({...formBloqueo, fecha_inicio: e.target.value})}/>
              </div>
              <div className="field">
                <label>Hora inicio</label>
                <input type="time" value={formBloqueo.hora_inicio} onChange={e => setFormBloqueo({...formBloqueo, hora_inicio: e.target.value})}/>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Fecha fin</label>
                <input type="date" value={formBloqueo.fecha_fin} onChange={e => setFormBloqueo({...formBloqueo, fecha_fin: e.target.value})}/>
              </div>
              <div className="field">
                <label>Hora fin</label>
                <input type="time" value={formBloqueo.hora_fin} onChange={e => setFormBloqueo({...formBloqueo, hora_fin: e.target.value})}/>
              </div>
            </div>
            <button className="save-btn" onClick={guardarBloqueo} disabled={guardandoBloqueo}>
              {guardandoBloqueo ? 'Guardando...' : 'Guardar bloqueo'}
            </button>
          </div>
        </div>
      )}

      {modalDisponibilidad && (
        <div className="mo-overlay" onClick={() => setModalDisponibilidad(false)}>
          <div className="disp-box" onClick={e => e.stopPropagation()}>
            <div className="mo-hdr">
              <span className="mo-title">Configurar disponibilidad</span>
              <button className="mo-close" onClick={() => setModalDisponibilidad(false)}><X size={11}/></button>
            </div>
            <p style={{fontSize:'12px',color:'#A99CC4',marginBottom:'14px',lineHeight:'1.5'}}>
              Definí tus días y horarios laborales. Las horas fuera de tu disponibilidad aparecen sombreadas en el calendario.
            </p>
            {[1,2,3,4,5,6,0].map(dia => {
              const d = dispLocal.find(x => x.dia_semana === dia) || DISPONIBILIDAD_DEFAULT.find(x => x.dia_semana === dia)!
              return (
                <div key={dia} className="disp-dia-row">
                  <div className="disp-dia-nombre">{DIAS_COMPLETO[dia]}</div>
                  <label className="disp-switch">
                    <input type="checkbox" checked={d.activo}
                      onChange={e => setDispLocal(prev => prev.map(x => x.dia_semana===dia ? {...x,activo:e.target.checked} : x))}/>
                    <span className="disp-slider"/>
                  </label>
                  <input type="time" className="disp-hora" value={d.hora_inicio} disabled={!d.activo}
                    onChange={e => setDispLocal(prev => prev.map(x => x.dia_semana===dia ? {...x,hora_inicio:e.target.value} : x))}/>
                  <span className="disp-sep">a</span>
                  <input type="time" className="disp-hora" value={d.hora_fin} disabled={!d.activo}
                    onChange={e => setDispLocal(prev => prev.map(x => x.dia_semana===dia ? {...x,hora_fin:e.target.value} : x))}/>
                </div>
              )
            })}
            <button className="save-btn" style={{marginTop:'8px'}} onClick={guardarDisponibilidad} disabled={guardandoDisp}>
              {guardandoDisp ? 'Guardando...' : 'Guardar disponibilidad'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}