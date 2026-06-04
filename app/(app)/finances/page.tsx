'use client'

import { useEffect, useState, useMemo } from 'react'
import { TrendingUp, DollarSign, Clock, Users, Award, Target, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type Sesion = {
  id: string; fecha: string; hora: string
  servicio_nombre: string; precio: number
  estado_pago: string; sena: number; duracion: number
  patient_id: string
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function formatPesos(n: number) {
  return '$' + Math.round(n).toLocaleString('es-AR')
}
function formatPesosCorto(n: number) {
  if (n >= 1000000) return '$' + (n/1000000).toFixed(1).replace('.0','') + 'M'
  if (n >= 1000) return '$' + (n/1000).toFixed(0) + 'k'
  return '$' + Math.round(n)
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

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !user.email) {
        window.location.href = '/auth/login'
        return
      }

      const [{ data: sess }, { data: pacs }] = await Promise.all([
        supabase.from('sessions').select('*').eq('user_id', user.id).order('fecha', { ascending: true }),
        supabase.from('patients').select('id,nombre,apellido').eq('user_id', user.id),
      ])

      if (sess) setSesiones(sess)
      if (pacs) {
        const map: Record<string, string> = {}
        pacs.forEach(p => { map[p.id] = `${p.nombre} ${p.apellido}`.trim() })
        setPacientes(map)
      }

      const metaGuardada = localStorage.getItem('luma_meta_mensual')
      if (metaGuardada) setMeta(Number(metaGuardada))

    } catch (err) {
      console.error('Error cargando:', err)
    } finally {
      setLoading(false)
    }
  }

  function guardarMeta() {
    const valor = Number(metaInput)
    if (!valor || valor <= 0) return
    setMeta(valor)
    localStorage.setItem('luma_meta_mensual', String(valor))
    setEditandoMeta(false)
    setMetaInput('')
  }

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
      sesiones.filter(s => { const f = new Date(s.fecha); return f >= ini && f <= fin })

    return { sesionesActual: filtrar(inicioActual, finActual), sesionesAnterior: filtrar(inicioAnterior, finAnterior) }
  }, [sesiones, periodo])

  const cobrado = sesionesActual.filter(s => s.estado_pago === 'pagado').reduce((a, s) => a + (s.precio || 0), 0)
  const pendiente = sesionesActual.filter(s => s.estado_pago === 'pendiente').reduce((a, s) => a + (s.precio || 0), 0)
  const senas = sesionesActual.filter(s => s.estado_pago === 'señado').reduce((a, s) => a + (s.sena || 0), 0)
  const senasRestantes = sesionesActual.filter(s => s.estado_pago === 'señado').reduce((a, s) => a + ((s.precio || 0) - (s.sena || 0)), 0)
  const facturado = sesionesActual.reduce((a, s) => a + (s.precio || 0), 0)
  const ticketPromedio = sesionesActual.length > 0 ? facturado / sesionesActual.length : 0
  const horasTrabajadas = sesionesActual.reduce((a, s) => a + ((s.duracion || 60) / 60), 0)
  const ingresoPorHora = horasTrabajadas > 0 ? cobrado / horasTrabajadas : 0
  const cobradoAnterior = sesionesAnterior.filter(s => s.estado_pago === 'pagado').reduce((a, s) => a + (s.precio || 0), 0)

  const evolucion = useMemo(() => {
    const dias = periodo === 'semana' ? 7 : periodo === 'mes' ? 30 : 12
    const resultado = []
    for (let i = dias - 1; i >= 0; i--) {
      if (periodo === 'anio') {
        const mesIdx = new Date().getMonth() - i
        const año = mesIdx < 0 ? new Date().getFullYear() - 1 : new Date().getFullYear()
        const mesReal = ((mesIdx % 12) + 12) % 12
        const sessMes = sesiones.filter(s => { const f = new Date(s.fecha); return f.getFullYear() === año && f.getMonth() === mesReal })
        resultado.push({
          label: MESES[mesReal].slice(0,3),
          cobrado: sessMes.filter(s => s.estado_pago === 'pagado').reduce((a, s) => a + (s.precio||0), 0),
          total: sessMes.length,
        })
      } else {
        const fecha = new Date(); fecha.setDate(fecha.getDate() - i); fecha.setHours(0,0,0,0)
        const fechaFin = new Date(fecha); fechaFin.setHours(23,59,59,999)
        const sessDia = sesiones.filter(s => { const f = new Date(s.fecha); return f >= fecha && f <= fechaFin })
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

  const porCliente = useMemo(() => {
    const mapa: Record<string, { sesiones: number; cobrado: number; ultima: string }> = {}
    sesionesActual.forEach(s => {
      const nombre = pacientes[s.patient_id] || 'Desconocido'
      if (!mapa[nombre]) mapa[nombre] = { sesiones: 0, cobrado: 0, ultima: s.fecha }
      mapa[nombre].sesiones++
      if (s.estado_pago === 'pagado') mapa[nombre].cobrado += (s.precio || 0)
      if (new Date(s.fecha) > new Date(mapa[nombre].ultima)) mapa[nombre].ultima = s.fecha
    })
    return Object.entries(mapa).map(([nombre, data]) => ({ nombre, ...data })).sort((a, b) => b.cobrado - a.cobrado).slice(0, 6)
  }, [sesionesActual, pacientes])

  const agendaEconomica = useMemo(() => {
    const dias = []
    for (let i = 0; i < 7; i++) {
      const fecha = new Date(); fecha.setDate(fecha.getDate() + i); fecha.setHours(0,0,0,0)
      const fechaFin = new Date(fecha); fechaFin.setHours(23,59,59,999)
      const sessDia = sesiones.filter(s => { const f = new Date(s.fecha); return f >= fecha && f <= fechaFin })
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
  const pctMeta = meta > 0 ? Math.min(Math.round((cobrado / meta) * 100), 100) : 0
  const sesionesParaMeta = meta > 0 && ticketPromedio > 0 ? Math.ceil((meta - cobrado) / ticketPromedio) : 0
  const periodoLabel = { semana: 'Esta semana', mes: MESES[hoy.getMonth()], anio: String(hoy.getFullYear()) }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:'13px',color:'var(--text-muted)',background:'var(--bg)'}}>
      Cargando...
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box}
        .fw{height:100vh;overflow-y:auto;font-family:'Inter',sans-serif;background:var(--bg);padding:20px 24px;overflow-x:hidden}
@media(max-width:768px){
  .fw{height:auto;min-height:100vh;padding:14px 12px 80px;overflow-x:hidden;width:100%;box-sizing:border-box}
  .f-header{flex-direction:column;gap:10px;align-items:flex-start}
  .f-periodo{width:100%}
  .f-per-btn{flex:1;text-align:center;padding:6px 8px;font-size:11px}
  .resumen-grid{grid-template-columns:1fr;gap:8px}
  .resumen-grid-2{grid-template-columns:repeat(2,1fr);gap:8px}
  .r2-card{padding:9px 12px;min-width:0;overflow:hidden}
  .r2-val{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-0.5px}
  .r2-lbl{font-size:9px}
  .r2-card{padding:10px 12px}
  .r2-val{font-size:10px}
  .r2-icon{width:26px;height:26px;margin-bottom:6px}
  .evol-section{padding:12px;overflow:hidden}
  .evol-section{padding:12px;overflow:hidden}
  .evol-bars{gap:1px;height:70px;overflow-x:auto;scrollbar-width:none}
  .evol-bars::-webkit-scrollbar{display:none}
  .evol-bar-wrap{min-width:16px;flex-shrink:0}
  .evol-label{font-size:6px;overflow:hidden;text-overflow:ellipsis;max-width:16px}
  .serv-section{padding:12px}
  .serv-item{gap:4px}
  .serv-name{min-width:unset;width:100%;font-size:11px;margin-bottom:2px}
  .serv-bar-wrap{min-width:40px}
  .serv-count{min-width:30px;font-size:10px}
  .serv-money{font-size:10px;min-width:unset}
  .cli-section{padding:12px}
  .cli-grid{grid-template-columns:1fr 1fr !important}
  .cli-card{padding:10px}
  .cli-name{font-size:11px}
  .cli-stat-val{font-size:12px}
  .agenda-section{padding:12px}
  .agenda-grid{display:flex;overflow-x:auto;gap:6px;padding-bottom:6px;scrollbar-width:none}
  .agenda-grid::-webkit-scrollbar{display:none}
  .agenda-dia{min-width:70px;flex-shrink:0;padding:8px 6px}
  .agenda-dia-label{font-size:10px}
  .agenda-dia-fecha{font-size:8px}
  .agenda-dia-monto{font-size:11px}
  .agenda-dia-scount{font-size:9px}
  .meta-section{padding:12px}
  .meta-amounts{flex-wrap:wrap;gap:4px}
  .meta-actual{font-size:18px}
  .meta-info{grid-template-columns:1fr 1fr}
  .meta-info-val{font-size:12px}
  .z-label{font-size:10px}
}
        .f-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
        .f-title{font-size:22px;font-weight:800;color:var(--text-primary);letter-spacing:-0.5px;font-family:'Manrope',sans-serif}
        .f-sub{font-size:12px;color:var(--text-muted);margin-top:3px}
        .f-periodo{display:flex;gap:4px;background:var(--bg-card);padding:4px;border-radius:12px;border:0.5px solid var(--border-light);box-shadow:0 2px 8px var(--shadow)}
        .f-per-btn{padding:7px 16px;border-radius:9px;font-size:12px;font-weight:600;cursor:pointer;border:none;background:transparent;color:var(--text-muted);font-family:inherit;transition:all 0.15s}
        .f-per-btn.active{background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:white;box-shadow:0 2px 8px rgba(139,92,246,0.25)}

        .z-label{font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;display:flex;align-items:center;gap:6px}

        .resumen-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}
        .r-card{background:var(--bg-card);border-radius:18px;padding:16px 18px;border:0.5px solid var(--border-light);box-shadow:0 2px 12px var(--shadow)}
        .r-card.accent{background:linear-gradient(135deg,#8B5CF6,#A78BFA);border:none;box-shadow:0 6px 20px rgba(139,92,246,0.3)}
        .r-card-label{font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px}
        .r-card.accent .r-card-label{color:rgba(255,255,255,0.7)}
        .r-card-value{font-size:22px;font-weight:800;color:var(--text-primary);letter-spacing:-0.5px;line-height:1;font-family:'Manrope',sans-serif}
        .r-card.accent .r-card-value{color:white}
        .r-card-delta{display:flex;align-items:center;gap:4px;font-size:11px;margin-top:6px}
        .delta-up{color:#059669}
        .delta-down{color:#EF4444}
        .delta-neutral{color:var(--text-muted)}
        .r-card-sub{font-size:11px;color:var(--text-muted);margin-top:4px}
        .r-card.accent .r-card-sub{color:rgba(255,255,255,0.6)}

        .resumen-grid-2{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px}
        .r2-card{background:var(--bg-card);border-radius:16px;padding:13px 15px;border:0.5px solid var(--border-light);box-shadow:0 2px 10px var(--shadow)}
        .r2-icon{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;margin-bottom:10px}
        .r2-val{font-size:18px;font-weight:800;color:var(--text-primary);letter-spacing:-0.3px;line-height:1;font-family:'Manrope',sans-serif}
        .r2-lbl{font-size:10px;color:var(--text-muted);margin-top:3px}

        .evol-section{background:var(--bg-card);border-radius:20px;padding:20px 22px;box-shadow:0 4px 20px var(--shadow);border:0.5px solid var(--border-light);margin-bottom:24px}
        .evol-bars{display:flex;align-items:flex-end;gap:4px;height:100px;margin-top:16px}
        .evol-bar-wrap{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px}
        .evol-bar{width:100%;border-radius:6px 6px 0 0;background:linear-gradient(180deg,#8B5CF6,#A78BFA);transition:height 0.5s ease;min-height:3px;cursor:pointer;position:relative}
        .evol-bar:hover{background:linear-gradient(180deg,#7C3AED,#8B5CF6)}
        .evol-bar.empty{background:var(--accent-light)}
        .evol-label{font-size:9px;color:var(--text-muted);text-align:center;white-space:nowrap}
        .evol-tooltip{position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:var(--text-primary);color:var(--bg);font-size:10px;padding:4px 8px;border-radius:6px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity 0.15s}
        .evol-bar:hover .evol-tooltip{opacity:1}

        .serv-section{background:var(--bg-card);border-radius:20px;padding:20px 22px;box-shadow:0 4px 20px var(--shadow);border:0.5px solid var(--border-light);margin-bottom:24px}
        .serv-list{display:flex;flex-direction:column;gap:10px;margin-top:14px}
        .serv-item{display:flex;align-items:center;gap:12px}
        .serv-pos{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0}
        .serv-pos.top{background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:white}
        .serv-pos.rest{background:var(--accent-light);color:var(--text-secondary)}
        .serv-name{font-size:13px;font-weight:600;color:var(--text-primary);min-width:160px}
        .serv-bar-wrap{flex:1;height:8px;background:var(--accent-light);border-radius:20px;overflow:hidden}
        .serv-bar{height:100%;background:linear-gradient(90deg,#8B5CF6,#A78BFA);border-radius:20px;transition:width 0.6s ease}
        .serv-count{font-size:12px;font-weight:600;color:var(--text-primary);min-width:60px;text-align:right}
        .serv-money{font-size:11px;color:#059669;font-weight:600;min-width:80px;text-align:right}

        .cli-section{background:var(--bg-card);border-radius:20px;padding:20px 22px;box-shadow:0 4px 20px var(--shadow);border:0.5px solid var(--border-light);margin-bottom:24px}
        .cli-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-top:14px}
        .cli-card{background:var(--bg-input);border-radius:14px;padding:14px;border:0.5px solid var(--border-light)}
        .cli-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--accent-light),#DDD6FE);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--accent);margin-bottom:10px}
        .cli-name{font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .cli-stats{display:flex;justify-content:space-between;align-items:center}
        .cli-stat-val{font-size:14px;font-weight:700;color:var(--text-primary)}
        .cli-stat-lbl{font-size:9px;color:var(--text-muted);margin-top:1px}
        .cli-ultima{font-size:10px;color:var(--text-muted);margin-top:8px}

        .agenda-section{background:var(--bg-card);border-radius:20px;padding:20px 22px;box-shadow:0 4px 20px var(--shadow);border:0.5px solid var(--border-light);margin-bottom:24px}
        .agenda-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-top:14px}
        .agenda-dia{border-radius:14px;padding:12px 10px;text-align:center;border:0.5px solid var(--border-light);background:var(--bg-input);transition:all 0.15s}
        .agenda-dia.hoy{border-color:var(--accent);background:var(--accent-light)}
        .agenda-dia.vacio{opacity:0.6}
        .agenda-dia-label{font-size:11px;font-weight:700;color:var(--text-primary);margin-bottom:2px}
        .agenda-dia-fecha{font-size:9px;color:var(--text-muted);margin-bottom:8px}
        .agenda-dia-monto{font-size:14px;font-weight:800;color:var(--text-primary);letter-spacing:-0.3px;font-family:'Manrope',sans-serif}
        .agenda-dia.hoy .agenda-dia-monto{color:var(--accent)}
        .agenda-dia-scount{font-size:10px;color:var(--text-muted);margin-top:2px}
        .agenda-dia-bar{height:3px;border-radius:3px;background:linear-gradient(90deg,#8B5CF6,#A78BFA);margin-top:8px}

        .meta-section{background:var(--bg-card);border-radius:20px;padding:20px 22px;box-shadow:0 4px 20px var(--shadow);border:0.5px solid var(--border-light);margin-bottom:24px}
        .meta-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
        .meta-amounts{display:flex;gap:24px;align-items:baseline}
        .meta-actual{font-size:28px;font-weight:800;color:var(--text-primary);letter-spacing:-1px;font-family:'Manrope',sans-serif}
        .meta-de{font-size:14px;color:var(--text-muted);margin:0 4px}
        .meta-total{font-size:18px;font-weight:600;color:var(--text-muted);font-family:'Manrope',sans-serif}
        .meta-edit-btn{padding:7px 14px;border-radius:10px;background:var(--accent-light);color:var(--accent);border:none;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit}
        .meta-edit-btn:hover{background:var(--accent-hover)}
        .meta-bar-wrap{height:12px;background:var(--accent-light);border-radius:20px;overflow:hidden;margin-bottom:14px}
        .meta-bar{height:100%;background:linear-gradient(90deg,#8B5CF6,#A78BFA);border-radius:20px;transition:width 0.8s ease}
        .meta-bar.goal{background:linear-gradient(90deg,#10B981,#34D399)}
        .meta-info{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
        .meta-info-item{background:var(--bg-input);border-radius:10px;padding:10px 12px;border:0.5px solid var(--border-light)}
        .meta-info-label{font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px}
        .meta-info-val{font-size:14px;font-weight:700;color:var(--text-primary);font-family:'Manrope',sans-serif}
        .meta-input-wrap{display:flex;gap:8px;margin-bottom:16px}
        .meta-input{flex:1;padding:9px 12px;border-radius:10px;border:0.5px solid var(--border);font-size:13px;font-family:inherit;color:var(--text-primary);background:var(--bg-input);outline:none}
        .meta-input:focus{border-color:var(--accent)}
        .meta-save-btn{padding:9px 18px;border-radius:10px;background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:white;border:none;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
        .meta-empty{text-align:center;padding:20px;color:var(--text-muted);font-size:12px}

        html.dark .r2-icon-purple{background:#2D2550 !important}
        html.dark .r2-icon-green{background:#052015 !important}
        html.dark .r2-icon-yellow{background:#1A1200 !important}
        html.dark .serv-money{color:#6EE7B7}
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
    <div className="r2-icon r2-icon-purple" style={{background:'#EDE8FF'}}><TrendingUp size={14} color="#7C3AED"/></div>
    <div className="r2-val">{formatPesosCorto(facturado)}</div>
    <div className="r2-lbl">Total facturado</div>
  </div>
  <div className="r2-card">
    <div className="r2-icon r2-icon-green" style={{background:'#DCFCE7'}}><DollarSign size={14} color="#059669"/></div>
    <div className="r2-val">{formatPesosCorto(ticketPromedio)}</div>
    <div className="r2-lbl">Ticket promedio</div>
  </div>
  <div className="r2-card">
    <div className="r2-icon r2-icon-yellow" style={{background:'#FEF9C3'}}><Clock size={14} color="#D97706"/></div>
    <div className="r2-val">{Math.round(horasTrabajadas)}h</div>
    <div className="r2-lbl">Horas trabajadas</div>
  </div>
  <div className="r2-card">
    <div className="r2-icon r2-icon-purple" style={{background:'#EDE8FF'}}><Award size={14} color="#7C3AED"/></div>
    <div className="r2-val">{formatPesosCorto(ingresoPorHora)}</div>
    <div className="r2-lbl">Ingreso por hora</div>
  </div>
</div>

        <div className="evol-section">
          <div className="z-label" style={{margin:0}}><TrendingUp size={12}/>Evolución de ingresos</div>
          <div className="evol-bars">
            {evolucion.map((e, i) => (
              <div key={i} className="evol-bar-wrap">
                <div className={`evol-bar${e.cobrado===0?' empty':''}`}
                  style={{height:`${Math.max((e.cobrado/maxEvolucion)*100, e.cobrado>0?8:3)}px`}}>
                  {e.cobrado > 0 && <div className="evol-tooltip">{formatPesos(e.cobrado)}<br/>{e.total} ses.</div>}
                </div>
                <div className="evol-label">{e.label}</div>
              </div>
            ))}
          </div>
        </div>

        
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:'16px',marginBottom:'0'}}>  <div className="serv-section" style={{marginBottom:'24px'}}>
            <div className="z-label" style={{margin:0}}><Award size={12}/>Por servicio</div>
            {porServicio.length === 0 ? (
              <div style={{fontSize:'12px',color:'var(--text-muted)',textAlign:'center',padding:'20px 0'}}>Sin sesiones en este período</div>
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

          <div className="cli-section" style={{marginBottom:'24px'}}>
            <div className="z-label" style={{margin:0}}><Users size={12}/>Clientes del período</div>
            {porCliente.length === 0 ? (
              <div style={{fontSize:'12px',color:'var(--text-muted)',textAlign:'center',padding:'20px 0'}}>Sin clientes en este período</div>
            ) : (
              <div className="cli-grid" style={{gridTemplateColumns:'repeat(2,1fr)'}}>
                {porCliente.map(c => (
                  <div key={c.nombre} className="cli-card">
                    <div className="cli-avatar">{c.nombre.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}</div>
                    <div className="cli-name">{c.nombre}</div>
                    <div className="cli-stats">
                      <div>
                        <div className="cli-stat-val">{c.sesiones}</div>
                        <div className="cli-stat-lbl">sesiones</div>
                      </div>
                      <div>
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

        <div className="agenda-section">
          <div className="z-label" style={{margin:0}}><AlertCircle size={12}/>Agenda económica — próximos 7 días</div>
          <div className="agenda-grid">
            {agendaEconomica.map((d,i) => (
              <div key={i} className={`agenda-dia${i===0?' hoy':''}${d.sesiones===0?' vacio':''}`}>
                <div className="agenda-dia-label">{d.label}</div>
                <div className="agenda-dia-fecha">{d.fecha}</div>
                <div className="agenda-dia-monto">{d.proyectado > 0 ? formatPesos(d.proyectado) : '—'}</div>
                <div className="agenda-dia-scount">{d.sesiones > 0 ? `${d.sesiones} ses.` : 'libre'}</div>
                {d.proyectado > 0 && <div className="agenda-dia-bar" style={{width:`${(d.proyectado/maxAgenda)*100}%`}}/>}
              </div>
            ))}
          </div>
        </div>

        <div className="meta-section">
          <div className="z-label" style={{margin:'0 0 14px'}}><Target size={12}/>Meta mensual</div>
          {editandoMeta ? (
            <div className="meta-input-wrap">
              <input className="meta-input" type="number" placeholder="Ej: 250000"
                value={metaInput} onChange={e => setMetaInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') guardarMeta() }} autoFocus/>
              <button className="meta-save-btn" onClick={guardarMeta}>Guardar</button>
              <button onClick={() => setEditandoMeta(false)}
                style={{padding:'9px 14px',borderRadius:'10px',border:'0.5px solid var(--border)',background:'var(--bg-card)',cursor:'pointer',fontSize:'13px',color:'var(--text-muted)',fontFamily:'inherit'}}>
                Cancelar
              </button>
            </div>
          ) : meta === 0 ? (
            <div className="meta-empty">
              <div style={{fontSize:'28px',marginBottom:'8px'}}>🎯</div>
              <div style={{fontWeight:'600',color:'var(--text-secondary)',marginBottom:'6px'}}>No hay meta configurada</div>
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
                <div className="meta-info-val" style={{color: pctMeta >= 100 ? '#059669' : 'var(--accent)'}}>{pctMeta}%</div>
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