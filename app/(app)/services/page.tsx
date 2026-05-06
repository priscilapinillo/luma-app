'use client'

import { useEffect, useState } from 'react'
import { Plus, X, Edit2, Trash2, Clock, TrendingUp, BarChart2, DollarSign, Award } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type Servicio = {
  id: string; nombre: string; descripcion: string
  duracion_estimada: number; precio_base: number
  color: string; activo: boolean
}
type EstadServicio = {
  id: string; nombre: string; color: string
  total_sesiones: number; ingresos_total: number
  precio_base: number
}

const COLORES = [
  '#8B5CF6','#A78BFA','#C084FC','#E879F9',
  '#F472B6','#FB7185','#F97316','#FBBF24',
  '#34D399','#22D3EE','#60A5FA','#818CF8',
]

const FONDOS_CARDS = [
  '#F3F0FF','#EEF0FF','#F0F7FF','#F0FFF8',
  '#FFF8F0','#FFF0F5','#F5F0FF','#EDF9FF',
]

export default function ServiciosPage() {
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [estadisticas, setEstadisticas] = useState<EstadServicio[]>([])
  const [totalIngresos, setTotalIngresos] = useState(0)
  const [totalSesiones, setTotalSesiones] = useState(0)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Servicio | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [confirmBorrar, setConfirmBorrar] = useState<Servicio | null>(null)

  const [form, setForm] = useState({
    nombre: '', descripcion: '', duracion_estimada: 60,
    precio_base: 0, color: '#8B5CF6', activo: true,
  })

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: servs }, { data: sess }] = await Promise.all([
      supabase.from('services').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('sessions').select('servicio_nombre,precio,estado_pago').eq('user_id', user.id),
    ])

    if (servs) setServicios(servs)

    if (servs && sess) {
      const stats: EstadServicio[] = servs.map(s => {
        const sesionesDelServicio = sess.filter(se => se.servicio_nombre === s.nombre)
        const ingresos = sesionesDelServicio
          .filter(se => se.estado_pago === 'pagado')
          .reduce((acc, se) => acc + (se.precio || 0), 0)
        return {
          id: s.id, nombre: s.nombre, color: s.color,
          total_sesiones: sesionesDelServicio.length,
          ingresos_total: ingresos, precio_base: s.precio_base,
        }
      }).sort((a, b) => b.total_sesiones - a.total_sesiones)

      setEstadisticas(stats)
      setTotalSesiones(sess.length)
      setTotalIngresos(sess.filter(s => s.estado_pago === 'pagado').reduce((acc, s) => acc + (s.precio || 0), 0))
    }

    setLoading(false)
  }

  function abrirNuevo() {
    setForm({ nombre: '', descripcion: '', duracion_estimada: 60, precio_base: 0, color: '#8B5CF6', activo: true })
    setEditando(null)
    setModalOpen(true)
  }

  function abrirEditar(s: Servicio) {
    setForm({
      nombre: s.nombre, descripcion: s.descripcion || '',
      duracion_estimada: s.duracion_estimada || 60,
      precio_base: s.precio_base || 0, color: s.color || '#8B5CF6', activo: s.activo,
    })
    setEditando(s)
    setModalOpen(true)
  }

  async function guardar() {
    if (!form.nombre) { alert('El nombre es obligatorio'); return }
    setGuardando(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (editando) {
      const { data } = await supabase.from('services').update({
        nombre: form.nombre, descripcion: form.descripcion,
        duracion_estimada: form.duracion_estimada, precio_base: form.precio_base,
        color: form.color, activo: form.activo,
      }).eq('id', editando.id).select().single()
      if (data) setServicios(prev => prev.map(s => s.id === data.id ? data : s))
    } else {
      const { data } = await supabase.from('services').insert({
        user_id: user.id, nombre: form.nombre, descripcion: form.descripcion,
        duracion_estimada: form.duracion_estimada, precio_base: form.precio_base,
        color: form.color, activo: form.activo,
      }).select().single()
      if (data) setServicios(prev => [...prev, data])
    }

    setModalOpen(false)
    setGuardando(false)
    cargarDatos()
  }

  async function toggleActivo(s: Servicio) {
    const supabase = createClient()
    await supabase.from('services').update({ activo: !s.activo }).eq('id', s.id)
    setServicios(prev => prev.map(sv => sv.id === s.id ? { ...sv, activo: !sv.activo } : sv))
  }

  async function borrar(s: Servicio) {
    const supabase = createClient()
    await supabase.from('services').delete().eq('id', s.id)
    setServicios(prev => prev.filter(sv => sv.id !== s.id))
    setEstadisticas(prev => prev.filter(sv => sv.id !== s.id))
    setConfirmBorrar(null)
  }

  const activos = servicios.filter(s => s.activo)
  const inactivos = servicios.filter(s => !s.activo)
  const maxSesiones = estadisticas.length > 0 ? Math.max(...estadisticas.map(e => e.total_sesiones), 1) : 1
  const servicioTop = estadisticas[0]

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
        .sw{height:100vh;overflow-y:auto;font-family:'Inter',sans-serif;background:#F4F2FF;padding:20px 24px}

        .s-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
        .s-title{font-size:22px;font-weight:800;color:#1A1035;letter-spacing:-0.5px}
        .s-sub{font-size:12px;color:#A99CC4;margin-top:3px}
        .s-new-btn{display:flex;align-items:center;gap:6px;padding:10px 16px;background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:white;border:none;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 4px 12px rgba(139,92,246,0.3);transition:all 0.15s;white-space:nowrap}
        .s-new-btn:hover{box-shadow:0 6px 18px rgba(139,92,246,0.4);transform:translateY(-1px)}

        .s-section-label{font-size:11px;font-weight:700;color:#A99CC4;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px}
        .s-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;margin-bottom:28px}

        .sc{border-radius:20px;overflow:hidden;border:none;box-shadow:0 2px 12px rgba(139,92,246,0.08),0 1px 4px rgba(139,92,246,0.04);transition:all 0.15s;position:relative}
        .sc:hover{box-shadow:0 8px 24px rgba(139,92,246,0.14);transform:translateY(-2px)}
        .sc.inactivo{opacity:0.55}
        .sc-inner{padding:20px}
        .sc-top-row{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px}
        .sc-badge{font-size:10px;font-weight:700;padding:4px 10px;border-radius:20px;background:rgba(255,255,255,0.7);color:#4C1D95;border:0.5px solid rgba(139,92,246,0.2)}
        .sc-actions-top{display:flex;gap:5px}
        .sc-btn{width:28px;height:28px;border-radius:8px;background:rgba(255,255,255,0.7);border:0.5px solid rgba(139,92,246,0.15);display:flex;align-items:center;justify-content:center;cursor:pointer;color:#7C6BAA;transition:all 0.15s}
        .sc-btn:hover{background:white;color:#7C3AED;border-color:#8B5CF6}
        .sc-btn.danger:hover{background:white;color:#EF4444;border-color:#EF4444}
        .sc-name{font-size:18px;font-weight:800;color:#1A1035;letter-spacing:-0.5px;margin-bottom:6px;line-height:1.2}
        .sc-desc{font-size:12px;color:#6B5B8A;line-height:1.5;margin-bottom:14px;min-height:18px}
        .sc-tags{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}
        .sc-tag{font-size:11px;padding:4px 10px;border-radius:20px;background:rgba(255,255,255,0.7);color:#4C1D95;border:0.5px solid rgba(139,92,246,0.2);font-weight:500}
        .sc-footer{display:flex;justify-content:space-between;align-items:center;padding-top:14px;border-top:0.5px solid rgba(139,92,246,0.1)}
        .sc-precio{font-size:22px;font-weight:800;color:#1A1035;letter-spacing:-0.5px}
        .sc-precio-label{font-size:10px;color:#9B8EC4;margin-top:1px}
        .sc-toggle{padding:6px 14px;border-radius:20px;font-size:11px;font-weight:600;cursor:pointer;border:0.5px solid;font-family:inherit;transition:all 0.15s}
        .sc-toggle.on{background:rgba(236, 220, 252, 0.8);color:#166534;border-color:#BBF7D0}
        .sc-toggle.on:hover{background:#DCFCE7}
        .sc-toggle.off{background:rgba(243,244,246,0.8);color:#6B7280;border-color:#E5E7EB}
        .sc-toggle.off:hover{background:#E5E7EB}

        .s-empty{text-align:center;padding:40px 20px;color:#C4B8E8;font-size:13px;background:white;border-radius:16px;border:1.5px dashed #E2D9FF;margin-bottom:28px}

        /* ESTADÍSTICAS */
        .stats-section{background:white;border-radius:20px;padding:22px 24px;box-shadow:0 4px 20px rgba(139,92,246,0.08);border:0.5px solid #EDE9FF;margin-bottom:24px}
        .stats-title{font-size:16px;font-weight:800;color:#1A1035;letter-spacing:-0.3px;margin-bottom:4px;display:flex;align-items:center;gap:8px}
        .stats-sub{font-size:12px;color:#A99CC4;margin-bottom:20px}

        .stats-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}
        .stat-card{border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:12px}
        .stat-card.purple{background:linear-gradient(135deg,#EDE8FF,#E0D9FF);border:0.5px solid #C4B8E8}
        .stat-card.green{background:linear-gradient(135deg,#DCFCE7,#D1FAE5);border:0.5px solidrgb(187, 193, 247)}
        .stat-card.yellow{background:linear-gradient(135deg,#FEF9C3,#FEF3C7);border:0.5px solidrgb(155, 157, 195)}
        .stat-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .stat-icon.purple{background:rgba(139,92,246,0.15);color:#7C3AED}
        .stat-icon.green{background:rgba(16,185,129,0.15);color:#059669}
        .stat-icon.yellow{background:rgba(245,158,11,0.15);color:#D97706}
        .stat-num{font-size:22px;font-weight:800;color:#1A1035;letter-spacing:-0.5px;line-height:1}
        .stat-lbl{font-size:11px;color:#6B5B8A;margin-top:3px}

        .ranking-label{font-size:11px;font-weight:700;color:#A99CC4;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px}
        .ranking-list{display:flex;flex-direction:column;gap:10px}
        .ranking-item{display:flex;align-items:center;gap:12px}
        .ranking-pos{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0}
        .ranking-pos.top{background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:white}
        .ranking-pos.rest{background:#F0EBFF;color:#7C6BAA}
        .ranking-name{font-size:13px;font-weight:600;color:#1A1035;min-width:140px}
        .ranking-bar-wrap{flex:1;height:8px;background:#F0EBFF;border-radius:20px;overflow:hidden}
        .ranking-bar{height:100%;border-radius:20px;transition:width 0.6s ease}
        .ranking-count{font-size:12px;font-weight:600;color:#1A1035;min-width:50px;text-align:right}
        .ranking-ingresos{font-size:11px;color:#A99CC4;min-width:70px;text-align:right}

        /* MODAL */
        .mo-overlay{position:fixed;inset:0;background:rgba(26,16,53,0.5);display:flex;align-items:center;justify-content:center;z-index:100;backdrop-filter:blur(4px)}
        .mo-box{background:white;border-radius:20px;padding:24px;width:460px;max-height:90vh;overflow-y:auto;box-shadow:0 32px 80px rgba(100,60,200,0.25)}
        .mo-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
        .mo-title{font-size:15px;font-weight:700;color:#1A1035}
        .mo-close{width:28px;height:28px;border-radius:8px;border:0.5px solid #E2D9FF;background:white;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#A99CC4}
        .field{display:flex;flex-direction:column;gap:5px;margin-bottom:14px}
        .field label{font-size:12px;font-weight:600;color:#1A1035}
        .field input,.field textarea{padding:9px 11px;border-radius:10px;border:0.5px solid #E2D9FF;font-size:13px;font-family:inherit;color:#1A1035;background:#FAFAFF;outline:none;width:100%}
        .field input:focus,.field textarea:focus{border-color:#8B5CF6;box-shadow:0 0 0 3px rgba(139,92,246,0.08)}
        .field textarea{min-height:70px;resize:none}
        .field-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .color-grid{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}
        .color-dot{width:28px;height:28px;border-radius:50%;cursor:pointer;transition:all 0.15s;border:2.5px solid transparent}
        .color-dot.sel{border-color:#1A1035;transform:scale(1.15)}
        .save-btn{width:100%;padding:11px;background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:white;border:none;border-radius:11px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 4px 14px rgba(139,92,246,0.35);transition:all 0.15s;margin-top:4px}
        .save-btn:hover{box-shadow:0 6px 20px rgba(139,92,246,0.45);transform:translateY(-1px)}
        .save-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none}
        .activo-row{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#F8F6FF;border-radius:10px;border:0.5px solid #EDE9FF;margin-bottom:14px}
        .activo-label{font-size:13px;font-weight:500;color:#1A1035}
        .activo-sub{font-size:11px;color:#A99CC4;margin-top:1px}
        .activo-switch{position:relative;width:40px;height:22px;cursor:pointer}
        .activo-switch input{opacity:0;width:0;height:0}
        .activo-slider{position:absolute;inset:0;background:#E2D9FF;border-radius:22px;transition:all 0.2s}
        .activo-slider:before{content:'';position:absolute;width:16px;height:16px;left:3px;top:3px;background:white;border-radius:50%;transition:all 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.1)}
        input:checked + .activo-slider{background:#8B5CF6}
        input:checked + .activo-slider:before{transform:translateX(18px)}
      `}</style>

      <div className="sw">
        <div className="s-header">
          <div>
            <div className="s-title">Servicios</div>
            <div className="s-sub">{servicios.length} servicios · {activos.length} activos</div>
          </div>
          <button className="s-new-btn" onClick={abrirNuevo}>
            <Plus size={14}/> Nuevo servicio
          </button>
        </div>

        {/* ACTIVOS */}
        {activos.length > 0 && (<>
          <div className="s-section-label">Activos</div>
          <div className="s-grid">
            {activos.map((s, idx) => (
              <div key={s.id} className="sc" style={{background: FONDOS_CARDS[idx % FONDOS_CARDS.length]}}>
                <div className="sc-inner">
                  <div className="sc-top-row">
                    <span className="sc-badge">{s.duracion_estimada || 60} min</span>
                    <div className="sc-actions-top">
                      <div className="sc-btn" onClick={() => abrirEditar(s)} title="Editar">
                        <Edit2 size={11}/>
                      </div>
                      <div className="sc-btn danger" onClick={() => setConfirmBorrar(s)} title="Eliminar">
                        <Trash2 size={11}/>
                      </div>
                    </div>
                  </div>
                  <div className="sc-name">{s.nombre}</div>
                  <div className="sc-desc">{s.descripcion || 'Sin descripción'}</div>
                  <div className="sc-tags">
                    <span className="sc-tag" style={{background: s.color+'22', color: s.color, borderColor: s.color+'44'}}>
                      ● Activo
                    </span>
                    <span className="sc-tag">{s.duracion_estimada || 60} min por sesión</span>
                  </div>
                  <div className="sc-footer">
                    <div>
                      <div className="sc-precio">${(s.precio_base || 0).toLocaleString()}</div>
                      <div className="sc-precio-label">precio base</div>
                    </div>
                    <button className="sc-toggle on" onClick={() => toggleActivo(s)}>Activo</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>)}

        {/* INACTIVOS */}
        {inactivos.length > 0 && (<>
          <div className="s-section-label">Inactivos</div>
          <div className="s-grid">
            {inactivos.map((s, idx) => (
              <div key={s.id} className="sc inactivo" style={{background: FONDOS_CARDS[idx % FONDOS_CARDS.length]}}>
                <div className="sc-inner">
                  <div className="sc-top-row">
                    <span className="sc-badge">{s.duracion_estimada || 60} min</span>
                    <div className="sc-actions-top">
                      <div className="sc-btn" onClick={() => abrirEditar(s)}><Edit2 size={11}/></div>
                      <div className="sc-btn danger" onClick={() => setConfirmBorrar(s)}><Trash2 size={11}/></div>
                    </div>
                  </div>
                  <div className="sc-name">{s.nombre}</div>
                  <div className="sc-desc">{s.descripcion || 'Sin descripción'}</div>
                  <div className="sc-tags">
                    <span className="sc-tag">Inactivo</span>
                    <span className="sc-tag">{s.duracion_estimada || 60} min</span>
                  </div>
                  <div className="sc-footer">
                    <div>
                      <div className="sc-precio">${(s.precio_base || 0).toLocaleString()}</div>
                      <div className="sc-precio-label">precio base</div>
                    </div>
                    <button className="sc-toggle off" onClick={() => toggleActivo(s)}>Inactivo</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>)}

        {servicios.length === 0 && (
          <div className="s-empty">
            <div style={{fontSize:'32px',marginBottom:'12px'}}>✦</div>
            <div style={{fontWeight:'600',color:'#9B8EC4',marginBottom:'6px'}}>Todavía no tenés servicios</div>
            <div>Creá tu primer servicio para poder agendarlo en los turnos</div>
          </div>
        )}

        {/* ESTADÍSTICAS */}
        {estadisticas.length > 0 && (
          <div className="stats-section">
            <div className="stats-title">
              <BarChart2 size={16} color="#8B5CF6"/>
              Estadísticas de servicios
            </div>
            <div className="stats-sub">Basado en todas las sesiones registradas hasta hoy</div>

            <div className="stats-summary">
              <div className="stat-card purple">
                <div className="stat-icon purple"><TrendingUp size={16}/></div>
                <div>
                  <div className="stat-num">{totalSesiones}</div>
                  <div className="stat-lbl">Sesiones totales</div>
                </div>
              </div>
              <div className="stat-card green">
                <div className="stat-icon green"><DollarSign size={16}/></div>
                <div>
                  <div className="stat-num">${totalIngresos.toLocaleString()}</div>
                  <div className="stat-lbl">Ingresos cobrados</div>
                </div>
              </div>
              <div className="stat-card yellow">
                <div className="stat-icon yellow"><Award size={16}/></div>
                <div>
                  <div className="stat-num">{servicioTop?.nombre?.split(' ')[0] || '—'}</div>
                  <div className="stat-lbl">Servicio más pedido</div>
                </div>
              </div>
            </div>

            <div className="ranking-label">Ranking por sesiones</div>
            <div className="ranking-list">
              {estadisticas.filter(e => e.total_sesiones > 0 || true).map((e, i) => (
                <div key={e.id} className="ranking-item">
                  <div className={`ranking-pos ${i === 0 ? 'top' : 'rest'}`}>{i+1}</div>
                  <div className="ranking-name">{e.nombre}</div>
                  <div className="ranking-bar-wrap">
                    <div className="ranking-bar"
                      style={{
                        width: `${maxSesiones > 0 ? (e.total_sesiones / maxSesiones) * 100 : 0}%`,
                        background: e.color || '#8B5CF6',
                        opacity: 0.7,
                      }}/>
                  </div>
                  <div className="ranking-count">{e.total_sesiones} sesiones</div>
                  <div className="ranking-ingresos">${e.ingresos_total.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL NUEVO / EDITAR */}
      {modalOpen && (
        <div className="mo-overlay" onClick={() => setModalOpen(false)}>
          <div className="mo-box" onClick={e => e.stopPropagation()}>
            <div className="mo-hdr">
              <span className="mo-title">{editando ? 'Editar servicio' : 'Nuevo servicio'}</span>
              <button className="mo-close" onClick={() => setModalOpen(false)}><X size={12}/></button>
            </div>
            <div className="field">
              <label>Nombre del servicio</label>
              <input placeholder="Ej: Lectura general" value={form.nombre}
                onChange={e => setForm({...form, nombre: e.target.value})}/>
            </div>
            <div className="field">
              <label>Descripción</label>
              <textarea placeholder="Descripción breve del servicio..."
                value={form.descripcion}
                onChange={e => setForm({...form, descripcion: e.target.value})}/>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Duración (minutos)</label>
                <input type="number" min="15" step="15" value={form.duracion_estimada}
                  onChange={e => setForm({...form, duracion_estimada: Number(e.target.value)})}/>
              </div>
              <div className="field">
                <label>Precio base ($)</label>
                <input type="number" min="0" value={form.precio_base}
                  onChange={e => setForm({...form, precio_base: Number(e.target.value)})}/>
              </div>
            </div>
            <div className="field">
              <label>Color</label>
              <div className="color-grid">
                {COLORES.map(c => (
                  <div key={c} className={`color-dot${form.color===c?' sel':''}`}
                    style={{background:c}} onClick={() => setForm({...form, color: c})}/>
                ))}
              </div>
            </div>
            <div className="activo-row">
              <div>
                <div className="activo-label">Servicio activo</div>
                <div className="activo-sub">Los servicios activos aparecen al agendar turnos</div>
              </div>
              <label className="activo-switch">
                <input type="checkbox" checked={form.activo}
                  onChange={e => setForm({...form, activo: e.target.checked})}/>
                <span className="activo-slider"/>
              </label>
            </div>
            <button className="save-btn" onClick={guardar} disabled={guardando}>
              {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear servicio'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR BORRADO */}
      {confirmBorrar && (
        <div className="mo-overlay" onClick={() => setConfirmBorrar(null)}>
          <div className="mo-box" style={{width:'340px'}} onClick={e => e.stopPropagation()}>
            <div className="mo-hdr">
              <span className="mo-title">¿Eliminar servicio?</span>
              <button className="mo-close" onClick={() => setConfirmBorrar(null)}><X size={12}/></button>
            </div>
            <p style={{fontSize:'13px',color:'#6B5B8A',marginBottom:'20px',lineHeight:'1.6'}}>
              Se eliminará <strong>{confirmBorrar.nombre}</strong> permanentemente. Los turnos ya agendados con este servicio no se verán afectados.
            </p>
            <div style={{display:'flex',gap:'8px'}}>
              <button onClick={() => setConfirmBorrar(null)}
                style={{flex:1,padding:'11px',borderRadius:'10px',border:'0.5px solid #E2D9FF',background:'white',fontSize:'13px',cursor:'pointer',fontFamily:'inherit',color:'#6B5B8A'}}>
                Cancelar
              </button>
              <button onClick={() => borrar(confirmBorrar)}
                style={{flex:1,padding:'11px',borderRadius:'10px',border:'none',background:'#EF4444',color:'white',fontSize:'13px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 12px rgba(239,68,68,0.3)'}}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}