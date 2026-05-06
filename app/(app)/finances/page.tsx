'use client'

import { useEffect, useState, useMemo } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Clock, Users, Award, Target, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type Sesion = {
  id: string; fecha: string; hora: string
  servicio_nombre: string; precio: number
  estado_pago: string; sena: number; duracion: number
  patient_id: string; paciente_nombre?: string
}

type MetaMensual = { monto: number }

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function formatPesos(n: number) {
  return '$' + Math.round(n).toLocaleString('es-AR')
}

function pct(actual: number, anterior: number) {
  if (anterior === 0) return actual > 0 ? 100 : 0
  return Math.round(((actual - anterior) / anterior) * 100)
}

export default function FinanzasPage() {
  const hoy = new Date()
  const [sesiones, setSesiones] = useState<Sesion[]>([])
  const [pacientes, setPacientes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState<'semana' | 'mes' | 'anio'>('mes')
  const [meta, setMeta] = useState<number>(0)
  const [metaInput, setMetaInput] = useState<string>('')
  const [editandoMeta, setEditandoMeta] = useState(false)
  const [guardandoMeta, setGuardandoMeta] = useState(false)

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: sess }, { data: pacs }, { data: metaData }] = await Promise.all([
      supabase.from('sessions').select('*').eq('user_id', user.id).order('fecha', { ascending: true }),
      supabase.from('patients').select('id,nombre,apellido').eq('user_id', user.id),
      supabase.from('subscriptions').select('*').eq('user_id', user.id).single(),
    ])

    if (sess) setSesiones(sess)
    if (pacs) {
      const map: Record<string, string> = {}
      pacs.forEach(p => { map[p.id] = `${p.nombre} ${p.apellido}`.trim() })
      setPacientes(map)
    }

    // Guardamos la meta en localStorage por ahora
    const metaGuardada = localStorage.getItem('luma_meta_mensual')
    if (metaGuardada) setMeta(Number(metaGuardada))

    setLoading(false)
  }

  function guardarMeta() {
    const valor = Number(metaInput)
    if (!valor || valor <= 0) return
    setMeta(valor)
    localStorage.setItem('luma_meta_mensual', String(valor))
    setEditandoMeta(false)
    setMetaInput('')
  }

  // Filtros de período
  const { sesionesActual, sesionesAnterior } = useMemo(() => {
    const ahora = new Date()

    let inicioActual: Date, finActual: Date, inicioAnterior: Date, finAnterior: Date

    if (periodo === 'semana') {
      const dia = ahora.getDay()
      inicioActual = new Date(ahora); inicioActual.setDate(ahora.getDate() - dia); inicioActual.setHours(0,0,0,0)
      finActual = new Date(ahora); finActual.setHours(23,59,59,999)
      inicioAnterior = new Date(inicioActual); inicioAnterior.setDate(inicioActual.getDate() - 7)
      finAnterior = new Date(inicioActual); finAnterior.setDate(inicioActual.getDate() - 1); finAnterior.setHours(23,59,59,999)
    } else if (periodo === 'mes') {
      inicioActual = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
      finActual = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59)
      inicioAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)
      finAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59)
    } else {
      inicioActual = new Date(ahora.getFullYear(), 0, 1)
      finActual = new Date(ahora.getFullYear(), 11, 31, 23, 59, 59)
      inicioAnterior = new Date(ahora.getFullYear() - 1, 0, 1)
      finAnterior = new Date(ahora.getFullYear() - 1, 11, 31, 23, 59, 59)
    }

    const filtrar = (ini: Date, fin: Date) =>
      sesiones.filter(s => {
        const f = new Date(s.fecha)
        return f >= ini && f <= fin
      })

    return { sesionesActual: filtrar(inicioActual, finActual), sesionesAnterior: filtrar(inicioAnterior, finAnterior) }
  }, [sesiones, periodo])

  // Métricas del período actual
  const cobrado = sesionesActual.filter(s => s.estado_pago === 'pagado').reduce((a, s) => a + (s.precio || 0), 0)
  const pendiente = sesionesActual.filter(s => s.estado_pago === 'pendiente').reduce((a, s) => a + (s.precio || 0), 0)
  const senas = sesionesActual.filter(s => s.estado_pago === 'señado').reduce((a, s) => a + (s.sena || 0), 0)
  const senasRestantes = sesionesActual.filter(s => s.estado_pago === 'señado').reduce((a, s) => a + ((s.precio || 0) - (s.sena || 0)), 0)
  const facturado = sesionesActual.reduce((a, s) => a + (s.precio || 0), 0)
  const ticketPromedio = sesionesActual.length > 0 ? facturado / sesionesActual.length : 0
  const horasTrabajadas = sesionesActual.reduce((a, s) => a + ((s.duracion || 60) / 60), 0)
  const ingresoPorHora = horasTrabajadas > 0 ? cobrado / horasTrabajadas : 0

  // Métricas del período anterior para comparativa
  const cobradoAnterior = sesionesAnterior.filter(s => s.estado_pago === 'pagado').reduce((a, s) => a + (s.precio || 0), 0)
  const sesionesCountAnterior = sesionesAnterior.length

  // Evolución diaria (últimos 30 días para mes, 7 para semana)
  const evolucion = useMemo(() => {
    const dias = periodo === 'semana' ? 7 : periodo === 'mes' ? 30 : 12
    const resultado = []

    for (let i = dias - 1; i >= 0; i--) {
      if (periodo === 'anio') {
        const mesIdx = new Date().getMonth() - i
        const año = mesIdx < 0 ? new Date().getFullYear() - 1 : new Date().getFullYear()
        const mesReal = ((mesIdx % 12) + 12) % 12
        const sessMes = sesiones.filter(s => {
          const f = new Date(s.fecha)
          return f.getFullYear() === año && f.getMonth() === mesReal
        })
        resultado.push({
          label: MESES[mesReal].slice(0,3),
          cobrado: sessMes.filter(s => s.estado_pago === 'pagado').reduce((a, s) => a + (s.precio||0), 0),
          total: sessMes.length,
        })
      } else {
        const fecha = new Date()
        fecha.setDate(fecha.getDate() - i)
        fecha.setHours(0,0,0,0)
        const fechaFin = new Date(fecha); fechaFin.setHours(23,59,59,999)
        const sessDia = sesiones.filter(s => {
          const f = new Date(s.fecha)
          return f >= fecha && f <= fechaFin
        })
        resultado.push({
          label: periodo === 'semana' ? ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][fecha.getDay()] : String(fecha.getDate()),
          cobrado: sessDia.filter(s => s.estado_pago === 'pagado').reduce((a, s) => a + (s.precio||0), 0),
          total: sessDia.length,
        })
      }
    }
    return resultado
  }, [sesiones, periodo])

  const maxEvolucion = Math.max(...evolucion.map(e => e.cobrado), 1)

  // Por servicio
  const porServicio = useMemo(() => {
    const mapa: Record<string, { sesiones: number; cobrado: number; pendiente: number }> = {}
    sesionesActual.forEach(s => {
      const nombre = s.servicio_nombre || 'Sin servicio'
      if (!mapa[nombre]) mapa[nombre] = { sesiones: 0, cobrado: 0, pendiente: 0 }
      mapa[nombre].sesiones++
      if (s.estado_pago === 'pagado') mapa[nombre].cobrado += (s.precio || 0)
      if (s.estado_pago === 'pendiente') mapa[nombre].pendiente += (s.precio || 0)
    })
    return Object.entries(mapa).map(([nombre, data]) => ({ nombre, ...data })).sort((a, b) => b.sesiones - a.sesiones)
  }, [sesionesActual])

  const maxServicio = Math.max(...porServicio.map(s => s.sesiones), 1)

  // Por cliente
  const porCliente = useMemo(() => {
    const mapa: Record<string, { sesiones: number; cobrado: number; ultima: string }> = {}
    sesionesActual.forEach(s => {
      const nombre = pacientes[s.patient_id] || 'Desconocido'
      if (!mapa[nombre]) mapa[nombre] = { sesiones: 0, cobrado: 0, ultima: s.fecha }
      mapa[nombre].sesiones++
      if (s.estado_pago === 'pagado') mapa[nombre].cobrado += (s.precio || 0)
      if (new Date(s.fecha) > new Date(mapa[nombre].ultima)) mapa[nombre].ultima = s.fecha
    })
    return Object.entries(mapa).map(([nombre, data]) => ({ nombre, ...data })).sort((a, b) => b.cobrado - a.cobrado).slice(0, 8)
  }, [sesionesActual, pacientes])

  // Agenda económica — próximos 7 días
  const agendaEconomica = useMemo(() => {
    const dias = []
    for (let i = 0; i < 7; i++) {
      const fecha = new Date()
      fecha.setDate(fecha.getDate() + i)
      fecha.setHours(0,0,0,0)
      const fechaFin = new Date(fecha); fechaFin.setHours(23,59,59,999)
      const sessDia = sesiones.filter(s => {
        const f = new Date(s.fecha)
        return f >= fecha && f <= fechaFin
      })
      dias.push({
        label: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][fecha.getDay()],
        fecha: fecha.toLocaleDateString('es-AR', { day:'numeric', month:'short' }),
        proyectado: sessDia.reduce((a, s) => a + (s.precio || 0), 0),
        sesiones: sessDia.length,
        cobrado: sessDia.filter(s => s.estado_pago === 'pagado').reduce((a, s) => a + (s.precio||0), 0),
      })
    }
    return dias
  }, [sesiones])

  const maxAgenda = Math.max(...agendaEconomica.map(d => d.proyectado), 1)

  // Meta
  const pctMeta = meta > 0 ? Math.min(Math.round((cobrado / meta) * 100), 100) : 0
  const sesionesParaMeta = meta > 0 && ticketPromedio > 0 ? Math.ceil((meta - cobrado) / ticketPromedio) : 0

  const periodoLabel = { semana: 'Esta semana', mes: MESES[hoy.getMonth()], anio: String(hoy.getFullYear()) }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontSize:'13px', color:'#9B8EC4', background:'#F4F2FF' }}>
      Cargando...
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box}
        .fw{height:100vh;overflow-y:auto;font-family:'Inter',sans-serif;background:#F4F2FF;padding:20px 24px}

        .f-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
        .f-title{font-size:22px;font-weight:800;color:#1A1035;letter-spacing:-0.5px}
        .f-sub{font-size:12px;color:#A99CC4;margin-top:3px}
        .f-periodo{display:flex;gap:4px;background:white;padding:4px;border-radius:12px;border:0.5px solid #EDE9FF;box-shadow:0 2px 8px rgba(139,92,246,0.06)}
        .f-per-btn{padding:7px 16px;border-radius:9px;font-size:12px;font-weight:600;cursor:pointer;border:none;background:transparent;color:#A99CC4;font-family:inherit;transition:all 0.15s}
        .f-per-btn.active{background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:white;box-shadow:0 2px 8px rgba(139,92,246,0.25)}

        /* ZONA 1 — RESUMEN */
        .z-label{font-size:11px;font-weight:700;color:#A99CC4;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;display:flex;align-items:center;gap:6px}
        .resumen-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}
        .r-card{background:white;border-radius:16px;padding:16px 18px;border:none;box-shadow:0 2px 12px rgba(139,92,246,0.08)}
        .r-card.accent{background:linear-gradient(135deg,#8B5CF6,#A78BFA);box-shadow:0 6px 20px rgba(139,92,246,0.3)}
        .r-card-label{font-size:10px;font-weight:700;color:#A99CC4;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px}
        .r-card.accent .r-card-label{color:rgba(255,255,255,0.7)}
        .r-card-value{font-size:22px;font-weight:800;color:#1A1035;letter-spacing:-0.5px;line-height:1}
        .r-card.accent .r-card-value{color:white}
        .r-card-delta{display:flex;align-items:center;gap:4px;font-size:11px;margin-top:6px}
        .delta-up{color:#059669}
        .delta-down{color:#EF4444}
        .delta-neutral{color:#A99CC4}
        .r-card-sub{font-size:11px;color:#A99CC4;margin-top:4px}
        .r-card.accent .r-card-sub{color:rgba(255,255,255,0.6)}

        .resumen-grid-2{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:28px}
        .r2-card{background:white;border-radius:14px;padding:13px 15px;border:none;box-shadow:0 2px 10px rgba(139,92,246,0.07)}
        .r2-icon{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;margin-bottom:10px}
        .r2-val{font-size:18px;font-weight:800;color:#1A1035;letter-spacing:-0.3px;line-height:1}
        .r2-lbl{font-size:10px;color:#A99CC4;margin-top:3px}

        /* ZONA 2 — EVOLUCIÓN */
        .evol-section{background:white;border-radius:20px;padding:20px 22px;box-shadow:0 4px 20px rgba(139,92,246,0.08);border:0.5px solid #EDE9FF;margin-bottom:24px}
        .evol-bars{display:flex;align-items:flex-end;gap:4px;height:100px;margin-top:16px}
        .evol-bar-wrap{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px}
        .evol-bar{width:100%;border-radius:6px 6px 0 0;background:linear-gradient(180deg,#8B5CF6,#A78BFA);transition:height 0.5s ease;min-height:3px;cursor:pointer;position:relative}
        .evol-bar:hover{background:linear-gradient(180deg,#7C3AED,#8B5CF6)}
        .evol-bar.empty{background:#F0EBFF}
        .evol-label{font-size:9px;color:#A99CC4;text-align:center;white-space:nowrap}
        .evol-tooltip{position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:#1A1035;color:white;font-size:10px;padding:4px 8px;border-radius:6px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity 0.15s}
        .evol-bar:hover .evol-tooltip{opacity:1}

        /* ZONA 3 — POR SERVICIO */
        .serv-section{background:white;border-radius:20px;padding:20px 22px;box-shadow:0 4px 20px rgba(139,92,246,0.08);border:0.5px solid #EDE9FF;margin-bottom:24px}
        .serv-list{display:flex;flex-direction:column;gap:10px;margin-top:14px}
        .serv-item{display:flex;align-items:center;gap:12px}
        .serv-pos{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0}
        .serv-pos.top{background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:white}
        .serv-pos.rest{background:#F0EBFF;color:#7C6BAA}
        .serv-name{font-size:13px;font-weight:600;color:#1A1035;min-width:160px}
        .serv-bar-wrap{flex:1;height:8px;background:#F0EBFF;border-radius:20px;overflow:hidden}
        .serv-bar{height:100%;background:linear-gradient(90deg,#8B5CF6,#A78BFA);border-radius:20px;transition:width 0.6s ease}
        .serv-count{font-size:12px;font-weight:600;color:#1A1035;min-width:60px;text-align:right}
        .serv-money{font-size:11px;color:#059669;font-weight:600;min-width:80px;text-align:right}

        /* ZONA 4 — CLIENTES */
        .cli-section{background:white;border-radius:20px;padding:20px 22px;box-shadow:0 4px 20px rgba(139,92,246,0.08);border:0.5px solid #EDE9FF;margin-bottom:24px}
        .cli-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-top:14px}
        .cli-card{background:#F8F6FF;border-radius:14px;padding:14px;border:0.5px solid #EDE9FF}
        .cli-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#EDE8FF,#DDD6FE);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#4C1D95;margin-bottom:10px}
        .cli-name{font-size:13px;font-weight:600;color:#1A1035;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .cli-stats{display:flex;justify-content:space-between;align-items:center}
        .cli-stat-item{text-align:center}
        .cli-stat-val{font-size:14px;font-weight:700;color:#1A1035}
        .cli-stat-lbl{font-size:9px;color:#A99CC4;margin-top:1px}
        .cli-ultima{font-size:10px;color:#A99CC4;margin-top:8px}

        /* ZONA 5 — AGENDA ECONÓMICA */
        .agenda-section{background:white;border-radius:20px;padding:20px 22px;box-shadow:0 4px 20px rgba(139,92,246,0.08);border:0.5px solid #EDE9FF;margin-bottom:24px}
        .agenda-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-top:14px}
        .agenda-dia{border-radius:14px;padding:12px 10px;text-align:center;border:0.5px solid #EDE9FF;background:#FDFCFF;transition:all 0.15s}
        .agenda-dia.hoy{border-color:#8B5CF6;background:linear-gradient(135deg,#EDE8FF,#E8E3FF)}
        .agenda-dia.vacio{background:#F8F6FF;opacity:0.7}
        .agenda-dia-label{font-size:11px;font-weight:700;color:#1A1035;margin-bottom:2px}
        .agenda-dia-fecha{font-size:9px;color:#A99CC4;margin-bottom:8px}
        .agenda-dia-monto{font-size:14px;font-weight:800;color:#1A1035;letter-spacing:-0.3px}
        .agenda-dia.hoy .agenda-dia-monto{color:#7C3AED}
        .agenda-dia-scount{font-size:10px;color:#A99CC4;margin-top:2px}
        .agenda-dia-bar{height:3px;border-radius:3px;background:linear-gradient(90deg,#8B5CF6,#A78BFA);margin-top:8px;transition:width 0.5s}

        /* ZONA 6 — META */
        .meta-section{background:white;border-radius:20px;padding:20px 22px;box-shadow:0 4px 20px rgba(139,92,246,0.08);border:0.5px solid #EDE9FF;margin-bottom:24px}
        .meta-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
        .meta-amounts{display:flex;gap:24px;align-items:baseline}
        .meta-actual{font-size:28px;font-weight:800;color:#1A1035;letter-spacing:-1px}
        .meta-de{font-size:14px;color:#A99CC4;margin:0 4px}
        .meta-total{font-size:18px;font-weight:600;color:#A99CC4}
        .meta-edit-btn{padding:7px 14px;border-radius:10px;background:#F0EBFF;color:#7C3AED;border:none;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit}
        .meta-edit-btn:hover{background:#EDE8FF}
        .meta-bar-wrap{height:12px;background:#F0EBFF;border-radius:20px;overflow:hidden;margin-bottom:14px}
        .meta-bar{height:100%;background:linear-gradient(90deg,#8B5CF6,#A78BFA);border-radius:20px;transition:width 0.8s ease}
        .meta-bar.goal{background:linear-gradient(90deg,#10B981,#34D399)}
        .meta-info{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
        .meta-info-item{background:#F8F6FF;border-radius:10px;padding:10px 12px;border:0.5px solid #EDE9FF}
        .meta-info-label{font-size:9px;font-weight:700;color:#A99CC4;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px}
        .meta-info-val{font-size:14px;font-weight:700;color:#1A1035}
        .meta-input-wrap{display:flex;gap:8px;margin-bottom:16px}
        .meta-input{flex:1;padding:9px 12px;border-radius:10px;border:0.5px solid #E2D9FF;font-size:13px;font-family:inherit;color:#1A1035;background:#FAFAFF;outline:none}
        .meta-input:focus{border-color:#8B5CF6;box-shadow:0 0 0 3px rgba(139,92,246,0.08)}
        .meta-save-btn{padding:9px 18px;border-radius:10px;background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:white;border:none;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
        .meta-empty{text-align:center;padding:20px;color:#C4B8E8;font-size:12px}
      `}</style>

      <div className="fw">
        <div className="f-header">
          <div>
            <div className="f-title">Finanzas</div>
            <div className="f-sub">{periodoLabel[periodo]} · Análisis de rendimiento</div>
          </div>
          <div className="f-periodo">
            {(['semana','mes','anio'] as const).map(p => (
              <button key={p} className={`f-per-btn${periodo===p?' active':''}`} onClick={() => setPeriodo(p)}>
                {p === 'semana' ? 'Semana' : p === 'mes' ? 'Mes' : 'Año'}
              </button>
            ))}
          </div>
        </div>

        {/* ZONA 1 — RESUMEN */}
        <div className="z-label"><DollarSign size={12}/>Resumen financiero</div>
        <div className="resumen-grid">
          <div className="r-card accent">
            <div className="r-card-label">Cobrado</div>
            <div className="r-card-value">{formatPesos(cobrado)}</div>
            <div className="r-card-delta">
              {pct(cobrado, cobradoAnterior) >= 0
                ? <><ChevronUp size={12} className="delta-up"/><span className="delta-up">+{pct(cobrado, cobradoAnterior)}%</span></>
                : <><ChevronDown size={12} className="delta-down"/><span className="delta-down">{pct(cobrado, cobradoAnterior)}%</span></>}
              <span className="delta-neutral">vs período anterior</span>
            </div>
          </div>
          <div className="r-card">
            <div className="r-card-label">Pendiente de cobro</div>
            <div className="r-card-value" style={{color:'#D97706'}}>{formatPesos(pendiente)}</div>
            <div className="r-card-sub">{sesionesActual.filter(s=>s.estado_pago==='pendiente').length} sesiones</div>
          </div>
          <div className="r-card">
            <div className="r-card-label">Señas tomadas</div>
            <div className="r-card-value" style={{color:'#2563EB'}}>{formatPesos(senas)}</div>
            <div className="r-card-sub">Resta cobrar {formatPesos(senasRestantes)}</div>
          </div>
        </div>

        <div className="resumen-grid-2">
          <div className="r2-card">
            <div className="r2-icon" style={{background:'#EDE8FF'}}><TrendingUp size={14} color="#7C3AED"/></div>
            <div className="r2-val">{formatPesos(facturado)}</div>
            <div className="r2-lbl">Total facturado</div>
          </div>
          <div className="r2-card">
            <div className="r2-icon" style={{background:'#DCFCE7'}}><DollarSign size={14} color="#059669"/></div>
            <div className="r2-val">{formatPesos(ticketPromedio)}</div>
            <div className="r2-lbl">Ticket promedio</div>
          </div>
          <div className="r2-card">
            <div className="r2-icon" style={{background:'#FEF9C3'}}><Clock size={14} color="#D97706"/></div>
            <div className="r2-val">{Math.round(horasTrabajadas)}h</div>
            <div className="r2-lbl">Horas trabajadas</div>
          </div>
          <div className="r2-card">
            <div className="r2-icon" style={{background:'#F5F3FF'}}><Award size={14} color="#7C3AED"/></div>
            <div className="r2-val">{formatPesos(ingresoPorHora)}</div>
            <div className="r2-lbl">Ingreso por hora</div>
          </div>
        </div>

        {/* ZONA 2 — EVOLUCIÓN */}
        <div className="evol-section">
          <div className="z-label" style={{margin:0}}><TrendingUp size={12}/>Evolución de ingresos</div>
          <div className="evol-bars">
            {evolucion.map((e, i) => (
              <div key={i} className="evol-bar-wrap">
                <div
                  className={`evol-bar${e.cobrado===0?' empty':''}`}
                  style={{height: `${Math.max((e.cobrado/maxEvolucion)*100, e.cobrado>0?8:3)}px`}}>
                  {e.cobrado > 0 && (
                    <div className="evol-tooltip">{formatPesos(e.cobrado)}<br/>{e.total} ses.</div>
                  )}
                </div>
                <div className="evol-label">{e.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'0'}}>
          {/* ZONA 3 — POR SERVICIO */}
          <div className="serv-section" style={{marginBottom:'24px'}}>
            <div className="z-label" style={{margin:0}}><Award size={12}/>Por servicio</div>
            {porServicio.length === 0 ? (
              <div style={{fontSize:'12px',color:'#C4B8E8',textAlign:'center',padding:'20px 0'}}>Sin sesiones en este período</div>
            ) : (
              <div className="serv-list">
                {porServicio.map((s,i) => (
                  <div key={s.nombre} className="serv-item">
                    <div className={`serv-pos ${i===0?'top':'rest'}`}>{i+1}</div>
                    <div className="serv-name">{s.nombre}</div>
                    <div className="serv-bar-wrap">
                      <div className="serv-bar" style={{width:`${(s.sesiones/maxServicio)*100}%`}}/>
                    </div>
                    <div className="serv-count">{s.sesiones} ses.</div>
                    <div className="serv-money">{formatPesos(s.cobrado)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ZONA 4 — CLIENTES */}
          <div className="cli-section" style={{marginBottom:'24px'}}>
            <div className="z-label" style={{margin:0}}><Users size={12}/>Clientes del período</div>
            {porCliente.length === 0 ? (
              <div style={{fontSize:'12px',color:'#C4B8E8',textAlign:'center',padding:'20px 0'}}>Sin clientes en este período</div>
            ) : (
              <div className="cli-grid" style={{gridTemplateColumns:'repeat(2,1fr)'}}>
                {porCliente.slice(0,6).map(c => (
                  <div key={c.nombre} className="cli-card">
                    <div className="cli-avatar">{c.nombre.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}</div>
                    <div className="cli-name">{c.nombre}</div>
                    <div className="cli-stats">
                      <div className="cli-stat-item">
                        <div className="cli-stat-val">{c.sesiones}</div>
                        <div className="cli-stat-lbl">sesiones</div>
                      </div>
                      <div className="cli-stat-item">
                        <div className="cli-stat-val" style={{color:'#059669',fontSize:'13px'}}>{formatPesos(c.cobrado)}</div>
                        <div className="cli-stat-lbl">cobrado</div>
                      </div>
                    </div>
                    <div className="cli-ultima">Última: {new Date(c.ultima).toLocaleDateString('es-AR',{day:'numeric',month:'short'})}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ZONA 5 — AGENDA ECONÓMICA */}
        <div className="agenda-section">
          <div className="z-label" style={{margin:0}}><AlertCircle size={12}/>Agenda económica — próximos 7 días</div>
          <div className="agenda-grid">
            {agendaEconomica.map((d,i) => (
              <div key={i} className={`agenda-dia${i===0?' hoy':''}${d.sesiones===0?' vacio':''}`}>
                <div className="agenda-dia-label">{d.label}</div>
                <div className="agenda-dia-fecha">{d.fecha}</div>
                <div className="agenda-dia-monto">{d.proyectado > 0 ? formatPesos(d.proyectado) : '—'}</div>
                <div className="agenda-dia-scount">{d.sesiones > 0 ? `${d.sesiones} ses.` : 'libre'}</div>
                {d.proyectado > 0 && (
                  <div className="agenda-dia-bar" style={{width:`${(d.proyectado/maxAgenda)*100}%`}}/>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ZONA 6 — META */}
        <div className="meta-section">
          <div className="z-label" style={{margin:'0 0 14px'}}><Target size={12}/>Meta mensual</div>

          {editandoMeta ? (
            <div className="meta-input-wrap">
              <input className="meta-input" type="number" placeholder="Ej: 250000"
                value={metaInput} onChange={e => setMetaInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') guardarMeta() }}
                autoFocus/>
              <button className="meta-save-btn" onClick={guardarMeta}>Guardar</button>
              <button onClick={() => setEditandoMeta(false)}
                style={{padding:'9px 14px',borderRadius:'10px',border:'0.5px solid #E2D9FF',background:'white',cursor:'pointer',fontSize:'13px',color:'#A99CC4',fontFamily:'inherit'}}>
                Cancelar
              </button>
            </div>
          ) : meta === 0 ? (
            <div className="meta-empty">
              <div style={{fontSize:'28px',marginBottom:'8px'}}>🎯</div>
              <div style={{fontWeight:'600',color:'#9B8EC4',marginBottom:'6px'}}>No hay meta configurada</div>
              <div style={{marginBottom:'14px'}}>Definí tu meta mensual para medir tu progreso</div>
              <button className="meta-save-btn" onClick={() => setEditandoMeta(true)}>Configurar meta</button>
            </div>
          ) : (<>
            <div className="meta-row">
              <div className="meta-amounts">
                <span className="meta-actual">{formatPesos(cobrado)}</span>
                <span className="meta-de">de</span>
                <span className="meta-total">{formatPesos(meta)}</span>
              </div>
              <button className="meta-edit-btn" onClick={() => { setMetaInput(String(meta)); setEditandoMeta(true) }}>
                Editar meta
              </button>
            </div>
            <div className="meta-bar-wrap">
              <div className={`meta-bar${pctMeta >= 100 ? ' goal' : ''}`} style={{width:`${pctMeta}%`}}/>
            </div>
            <div className="meta-info">
              <div className="meta-info-item">
                <div className="meta-info-label">Completado</div>
                <div className="meta-info-val" style={{color: pctMeta >= 100 ? '#059669' : '#7C3AED'}}>{pctMeta}%</div>
              </div>
              <div className="meta-info-item">
                <div className="meta-info-label">Falta cobrar</div>
                <div className="meta-info-val" style={{color:'#D97706'}}>{formatPesos(Math.max(0, meta - cobrado))}</div>
              </div>
              <div className="meta-info-item">
                <div className="meta-info-label">Sesiones para cumplir</div>
                <div className="meta-info-val">{pctMeta >= 100 ? '✓ Meta cumplida' : `${sesionesParaMeta} más`}</div>
              </div>
            </div>
          </>)}
        </div>

      </div>
    </>
  )
}