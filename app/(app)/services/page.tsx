'use client'

import { useEffect, useState } from 'react'
import { Plus, X, Edit2, Trash2, TrendingUp, BarChart2, DollarSign, Award, Clock, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type Servicio = {
  id: string; nombre: string; descripcion: string
  duracion_estimada: number; precio_base: number
  color: string; activo: boolean; precio_usd?: number | null
  tipo_servicio: 'vivo' | 'entrega'
  plazo_horas: number
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

const FONDOS_CARDS_DARK = [
  '#1A1628','#1A1A2E','#0F1728','#0F1A14',
  '#1A1400','#1A0F14','#1A1028','#0F1A1F',
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
  const [isDark, setIsDark] = useState(false)

  const [form, setForm] = useState({
    nombre: '', descripcion: '', duracion_estimada: 60,
    precio_base: 0, color: '#8B5CF6', activo: true,
    tipo_servicio: 'vivo' as 'vivo' | 'entrega',
    plazo_horas: 24,
    precio_usd: null as number | null,
  })

  useEffect(() => {
    cargarDatos()
    setIsDark(document.documentElement.classList.contains('dark'))
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [modalOpen])

  async function cargarDatos() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !user.email) {
        window.location.href = '/auth/login'
        return
      }
      const [{ data: servs }, { data: sess }] = await Promise.all([
        supabase.from('services').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('sessions').select('servicio_nombre,precio,estado_pago').eq('user_id', user.id),
      ])
      if (servs) setServicios(servs)
      if (servs && sess) {
        const stats: EstadServicio[] = servs.map(s => {
          const sesionesDelServicio = sess.filter(se => se.servicio_nombre === s.nombre)
          const ingresos = sesionesDelServicio.filter(se => se.estado_pago === 'pagado').reduce((acc, se) => acc + (se.precio || 0), 0)
          return { id: s.id, nombre: s.nombre, color: s.color, total_sesiones: sesionesDelServicio.length, ingresos_total: ingresos, precio_base: s.precio_base }
        }).sort((a, b) => b.total_sesiones - a.total_sesiones)
        setEstadisticas(stats)
        setTotalSesiones(sess.length)
        setTotalIngresos(sess.filter(s => s.estado_pago === 'pagado').reduce((acc, s) => acc + (s.precio || 0), 0))
      }
    } catch (err) {
      console.error('Error cargando:', err)
    } finally {
      setLoading(false)
    }
  }

  function abrirNuevo() {
    setForm({ nombre: '', descripcion: '', duracion_estimada: 60, precio_base: 0, color: '#8B5CF6', activo: true, tipo_servicio: 'vivo', plazo_horas: 24, precio_usd: null })
    setEditando(null)
    setModalOpen(true)
  }

  function abrirEditar(s: Servicio) {
    setForm({
      nombre: s.nombre, descripcion: s.descripcion || '',
      duracion_estimada: s.duracion_estimada || 60,
      precio_base: s.precio_base || 0, color: s.color || '#8B5CF6',
      activo: s.activo,
      tipo_servicio: s.tipo_servicio || 'vivo',
      plazo_horas: s.plazo_horas || 24,
      precio_usd: s.precio_usd || null,
    })
    setEditando(s)
    setModalOpen(true)
  }

  async function guardar() {
    if (!form.nombre) { alert('El nombre es obligatorio'); return }
    setGuardando(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setGuardando(false); return }
      const datos = {
        nombre: form.nombre, descripcion: form.descripcion,
        duracion_estimada: form.tipo_servicio === 'vivo' ? form.duracion_estimada : null,
        precio_base: form.precio_base, color: form.color, activo: form.activo,
        tipo_servicio: form.tipo_servicio,
        plazo_horas: form.tipo_servicio === 'entrega' ? form.plazo_horas : null,
        precio_usd: form.precio_usd || null,
      }
      if (editando) {
        const { data } = await supabase.from('services').update(datos).eq('id', editando.id).select().single()
        if (data) setServicios(prev => prev.map(s => s.id === data.id ? data : s))
      } else {
        const { data } = await supabase.from('services').insert({ user_id: user.id, ...datos }).select().single()
        if (data) setServicios(prev => [...prev, data])
      }
      setModalOpen(false)
      cargarDatos()
    } catch (err) {
      console.error('Error guardando:', err)
    } finally {
      setGuardando(false)
    }
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

  function fondoCard(s: Servicio, idx: number) {
    if (s.color) return s.color + (isDark ? '33' : '22')
    return isDark ? FONDOS_CARDS_DARK[idx % FONDOS_CARDS_DARK.length] : FONDOS_CARDS[idx % FONDOS_CARDS.length]
  }

  function badgeServicio(s: Servicio) {
    if (s.tipo_servicio === 'entrega') {
      return `⏳ Entrega en ${s.plazo_horas}hs`
    }
    return `🔴 En vivo · ${s.duracion_estimada || 60} min`
  }

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
        .sw{height:100vh;overflow-y:auto;font-family:'Inter',sans-serif;background:var(--bg);padding:20px 24px;overflow-x:hidden}
@media(max-width:768px){
  .sw{height:auto;min-height:100vh;padding:14px 12px 80px;overflow-x:hidden}
  .s-header{flex-direction:column;gap:10px;align-items:flex-start}
  .s-new-btn{width:100%;justify-content:center}
  .s-grid{grid-template-columns:1fr;gap:10px}
  .sc-name{font-size:14px}
  .sc-precio{font-size:18px}
  .stats-section{padding:14px}
  .stats-summary{grid-template-columns:1fr;gap:8px}
  .stat-card{padding:10px 12px}
  .stat-num{font-size:16px}
  .ranking-item{flex-wrap:wrap;gap:4px}
  .ranking-name{min-width:unset;width:100%;font-size:12px}
  .ranking-bar-wrap{width:100%;flex:unset}
  .ranking-count{min-width:unset;font-size:11px}
  .ranking-ingresos{min-width:unset;font-size:10px}
}
        .s-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
        .s-title{font-size:22px;font-weight:800;color:var(--text-primary);letter-spacing:-0.5px;font-family:'Manrope',sans-serif}
        .s-sub{font-size:12px;color:var(--text-muted);margin-top:3px}
        .s-new-btn{display:flex;align-items:center;gap:6px;padding:10px 16px;background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:white;border:none;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 4px 12px rgba(139,92,246,0.3);transition:all 0.15s;white-space:nowrap}
        .s-new-btn:hover{box-shadow:0 6px 18px rgba(139,92,246,0.4);transform:translateY(-1px)}
        .s-section-label{font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px}
        .s-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;margin-bottom:28px}
        .sc{border-radius:20px;overflow:hidden;border:0.5px solid rgba(139,92,246,0.15);box-shadow:0 2px 12px var(--shadow);transition:all 0.15s;position:relative}
        .sc:hover{box-shadow:0 8px 24px var(--shadow);transform:translateY(-2px)}
        .sc.inactivo{opacity:0.55}
        .sc-inner{padding:20px}
        .sc-top-row{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px}
        .sc-badge{font-size:10px;font-weight:700;padding:4px 10px;border-radius:20px;background:rgba(255,255,255,0.2);color:var(--text-primary);border:0.5px solid rgba(139,92,246,0.2);backdrop-filter:blur(4px)}
        .sc-badge.entrega{background:rgba(251,191,36,0.15);color:#B45309;border-color:rgba(251,191,36,0.3)}
        html.dark .sc-badge.entrega{color:#FCD34D}
        .sc-actions-top{display:flex;gap:5px}
        .sc-btn{width:28px;height:28px;border-radius:8px;background:rgba(255,255,255,0.2);border:0.5px solid rgba(139,92,246,0.15);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-secondary);transition:all 0.15s;backdrop-filter:blur(4px)}
        .sc-btn:hover{background:var(--bg-card);color:var(--accent);border-color:var(--accent)}
        .sc-btn.danger:hover{background:var(--bg-card);color:#EF4444;border-color:#EF4444}
        .sc-name{font-size:18px;font-weight:800;color:var(--text-primary);letter-spacing:-0.5px;margin-bottom:6px;line-height:1.2;font-family:'Manrope',sans-serif}
        .sc-desc{font-size:12px;color:var(--text-secondary);line-height:1.5;margin-bottom:14px;min-height:18px}
        .sc-tags{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}
        .sc-tag{font-size:11px;padding:4px 10px;border-radius:20px;background:rgba(255,255,255,0.2);color:var(--text-secondary);border:0.5px solid rgba(139,92,246,0.2);font-weight:500;backdrop-filter:blur(4px)}
        .sc-footer{display:flex;justify-content:space-between;align-items:center;padding-top:14px;border-top:0.5px solid rgba(139,92,246,0.1)}
        .sc-precio{font-size:22px;font-weight:800;color:var(--text-primary);letter-spacing:-0.5px;font-family:'Manrope',sans-serif}
        .sc-precio-label{font-size:10px;color:var(--text-muted);margin-top:1px}
        .sc-toggle{padding:6px 14px;border-radius:20px;font-size:11px;font-weight:600;cursor:pointer;border:0.5px solid;font-family:inherit;transition:all 0.15s}
        .sc-toggle.on{background:rgba(220,252,231,0.8);color:#166534;border-color:#BBF7D0}
        .sc-toggle.off{background:rgba(243,244,246,0.5);color:var(--text-muted);border-color:var(--border)}
        html.dark .sc-toggle.on{background:rgba(5,32,21,0.8);color:#6EE7B7;border-color:#065F46}
        .s-empty{text-align:center;padding:40px 20px;color:var(--text-muted);font-size:13px;background:var(--bg-card);border-radius:16px;border:1.5px dashed var(--border);margin-bottom:28px}
        .stats-section{background:var(--bg-card);border-radius:20px;padding:22px 24px;box-shadow:0 4px 20px var(--shadow);border:0.5px solid var(--border-light);margin-bottom:24px}
        .stats-title{font-size:16px;font-weight:800;color:var(--text-primary);letter-spacing:-0.3px;margin-bottom:4px;display:flex;align-items:center;gap:8px;font-family:'Manrope',sans-serif}
        .stats-sub{font-size:12px;color:var(--text-muted);margin-bottom:20px}
        .stats-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}
        .stats-summary .stat-card{min-width:0;width:100%}
  .stat-card .stat-num{font-size:14px;letter-spacing:-0.3px}
        .stat-card{border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:12px}
        .stat-card.purple{background:var(--accent-light);border:0.5px solid var(--border)}
        .stat-card.green{background:#DCFCE7;border:0.5px solid #BBF7D0}
        .stat-card.yellow{background:#FEF9C3;border:0.5px solid #FDE68A}
        html.dark .stat-card.green{background:#052015;border-color:#065F46}
        html.dark .stat-card.yellow{background:#1A1200;border-color:#3D2E00}
        .stat-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .stat-icon.purple{background:rgba(139,92,246,0.15);color:#7C3AED}
        .stat-icon.green{background:rgba(16,185,129,0.15);color:#059669}
        .stat-icon.yellow{background:rgba(245,158,11,0.15);color:#D97706}
        .stat-num{font-size:22px;font-weight:800;color:var(--text-primary);letter-spacing:-0.5px;line-height:1;font-family:'Manrope',sans-serif}
        .stat-lbl{font-size:11px;color:var(--text-secondary);margin-top:3px}
        .ranking-label{font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px}
        .ranking-list{display:flex;flex-direction:column;gap:10px}
        .ranking-item{display:flex;align-items:center;gap:12px}
        .ranking-pos{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0}
        .ranking-pos.top{background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:white}
        .ranking-pos.rest{background:var(--accent-light);color:var(--text-secondary)}
        .ranking-name{font-size:13px;font-weight:600;color:var(--text-primary);min-width:140px}
        .ranking-bar-wrap{flex:1;height:8px;background:var(--accent-light);border-radius:20px;overflow:hidden}
        .ranking-bar{height:100%;border-radius:20px;transition:width 0.6s ease}
        .ranking-count{font-size:12px;font-weight:600;color:var(--text-primary);min-width:50px;text-align:right}
        .ranking-ingresos{font-size:11px;color:var(--text-muted);min-width:70px;text-align:right}
        .mo-overlay{position:fixed;inset:0;background:rgba(26,16,53,0.5);display:flex;align-items:center;justify-content:center;z-index:100;backdrop-filter:blur(4px)}
        .mo-box{background:var(--bg-card);border-radius:20px;padding:24px;width:460px;max-height:80vh;overflow-y:auto;box-shadow:0 32px 80px rgba(100,60,200,0.25)}
        .mo-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
        .mo-title{font-size:15px;font-weight:700;color:var(--text-primary);font-family:'Manrope',sans-serif}
        .mo-close{width:28px;height:28px;border-radius:8px;border:0.5px solid var(--border);background:var(--bg-card);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-muted)}
        .field{display:flex;flex-direction:column;gap:5px;margin-bottom:14px}
        .field label{font-size:12px;font-weight:600;color:var(--text-primary)}
        .field input,.field textarea,.field select{padding:9px 11px;border-radius:10px;border:0.5px solid var(--border);font-size:13px;font-family:inherit;color:var(--text-primary);background:var(--bg-input);outline:none;width:100%}
        .field input:focus,.field textarea:focus,.field select:focus{border-color:var(--accent)}
        .field textarea{min-height:70px;resize:none}
        .field-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .color-grid{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}
        .color-dot{width:28px;height:28px;border-radius:50%;cursor:pointer;transition:all 0.15s;border:2.5px solid transparent}
        .color-dot.sel{border-color:var(--text-primary);transform:scale(1.15)}
        .save-btn{width:100%;padding:11px;background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:white;border:none;border-radius:11px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 4px 14px rgba(139,92,246,0.35);transition:all 0.15s;margin-top:4px}
        .save-btn:hover{box-shadow:0 6px 20px rgba(139,92,246,0.45);transform:translateY(-1px)}
        .save-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none}
        .activo-row{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--bg-input);border-radius:10px;border:0.5px solid var(--border-light);margin-bottom:14px}
        .activo-label{font-size:13px;font-weight:500;color:var(--text-primary)}
        .activo-sub{font-size:11px;color:var(--text-muted);margin-top:1px}
        .activo-switch{position:relative;width:40px;height:22px;cursor:pointer}
        .activo-switch input{opacity:0;width:0;height:0}
        .activo-slider{position:absolute;inset:0;background:var(--border);border-radius:22px;transition:all 0.2s}
        .activo-slider:before{content:'';position:absolute;width:16px;height:16px;left:3px;top:3px;background:white;border-radius:50%;transition:all 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.1)}
        .activo-switch input:checked + .activo-slider{background:var(--accent)}
        .activo-switch input:checked + .activo-slider:before{transform:translateX(18px)}
        .tipo-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px}
        .tipo-btn{padding:14px;border-radius:12px;border:0.5px solid var(--border);background:var(--bg-input);cursor:pointer;text-align:center;transition:all 0.15s;font-family:inherit}
        .tipo-btn.sel{border-color:var(--accent);background:var(--accent-light)}
        .tipo-btn-icon{font-size:24px;margin-bottom:6px}
        .tipo-btn-name{font-size:12px;font-weight:700;color:var(--text-primary)}
        .tipo-btn.sel .tipo-btn-name{color:var(--accent)}
        .tipo-btn-desc{font-size:10px;color:var(--text-muted);margin-top:2px;line-height:1.4}
        .plazo-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:4px}
        .plazo-btn{padding:10px 6px;border-radius:10px;border:0.5px solid var(--border);background:var(--bg-input);cursor:pointer;text-align:center;font-size:12px;font-weight:600;color:var(--text-secondary);transition:all 0.15s;font-family:inherit}
        .plazo-btn.sel{border-color:var(--accent);background:var(--accent-light);color:var(--accent)}
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

        {activos.length > 0 && (<>
          <div className="s-section-label">Activos</div>
          <div className="s-grid">
            {activos.map((s, idx) => (
              <div key={s.id} className="sc" style={{background: fondoCard(s, idx)}}>
                <div className="sc-inner">
                  <div className="sc-top-row">
                    <span className={`sc-badge${s.tipo_servicio==='entrega'?' entrega':''}`}>
                      {badgeServicio(s)}
                    </span>
                    <div className="sc-actions-top">
                      <div className="sc-btn" onClick={() => abrirEditar(s)}><Edit2 size={11}/></div>
                      <div className="sc-btn danger" onClick={() => setConfirmBorrar(s)}><Trash2 size={11}/></div>
                    </div>
                  </div>
                  <div className="sc-name">{s.nombre}</div>
                  <div className="sc-desc">{s.descripcion || 'Sin descripción'}</div>
                  <div className="sc-tags">
                    <span className="sc-tag" style={{color: s.color, borderColor: s.color+'44'}}>● Activo</span>
                    {s.tipo_servicio === 'entrega' ? (
                      <span className="sc-tag">📦 Con plazo de entrega</span>
                    ) : (
                      <span className="sc-tag">⏱ {s.duracion_estimada || 60} min</span>
                    )}
                  </div>
                  <div className="sc-footer">
                    <div>
                      <div className="sc-precio">${(s.precio_base || 0).toLocaleString()}</div>
                      <div className="sc-precio-label">ARS</div>
                      {s.precio_usd && (
                        <div style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'2px',fontWeight:600}}>USD {s.precio_usd}</div>
                      )}
                    </div>
                    <button className="sc-toggle on" onClick={() => toggleActivo(s)}>Activo</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>)}

        {inactivos.length > 0 && (<>
          <div className="s-section-label">Inactivos</div>
          <div className="s-grid">
            {inactivos.map((s, idx) => (
              <div key={s.id} className="sc inactivo" style={{background: fondoCard(s, idx)}}>
                <div className="sc-inner">
                  <div className="sc-top-row">
                    <span className="sc-badge">{badgeServicio(s)}</span>
                    <div className="sc-actions-top">
                      <div className="sc-btn" onClick={() => abrirEditar(s)}><Edit2 size={11}/></div>
                      <div className="sc-btn danger" onClick={() => setConfirmBorrar(s)}><Trash2 size={11}/></div>
                    </div>
                  </div>
                  <div className="sc-name">{s.nombre}</div>
                  <div className="sc-desc">{s.descripcion || 'Sin descripción'}</div>
                  <div className="sc-tags">
                    <span className="sc-tag">Inactivo</span>
                    <span className="sc-tag">{s.tipo_servicio === 'entrega' ? `📦 ${s.plazo_horas}hs` : `${s.duracion_estimada || 60} min`}</span>
                  </div>
                  <div className="sc-footer">
                    <div>
                    <div className="sc-precio">${(s.precio_base || 0).toLocaleString()}</div>
                      <div className="sc-precio-label">precio base</div>
                      {s.precio_usd && (
                        <div style={{fontSize:'10px',color:'var(--text-muted)',marginTop:'2px'}}>USD {s.precio_usd}</div>
                      )}
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
            <div style={{fontWeight:'600',color:'var(--text-secondary)',marginBottom:'6px'}}>Todavía no tenés servicios</div>
            <div>Creá tu primer servicio para poder agendarlo en los turnos</div>
          </div>
        )}

        {estadisticas.length > 0 && (
          <div className="stats-section">
            <div className="stats-title"><BarChart2 size={16} color="#8B5CF6"/>Estadísticas de servicios</div>
            <div className="stats-sub">Basado en todas las sesiones registradas hasta hoy</div>
            <div className="stats-summary" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:'15px',marginBottom:'20px'}}>
              <div className="stat-card purple">
                <div className="stat-icon purple"><TrendingUp size={16}/></div>
                <div><div className="stat-num">{totalSesiones}</div><div className="stat-lbl">Sesiones totales</div></div>
              </div>
              <div className="stat-card green">
                <div className="stat-icon green"><DollarSign size={16}/></div>
                <div><div className="stat-num">${totalIngresos.toLocaleString()}</div><div className="stat-lbl">Ingresos cobrados</div></div>
              </div>
              <div className="stat-card yellow">
                <div className="stat-icon yellow"><Award size={16}/></div>
                <div><div className="stat-num">{servicioTop?.nombre?.split(' ')[0] || '—'}</div><div className="stat-lbl">Servicio más pedido</div></div>
              </div>
            </div>
            <div className="ranking-label">Ranking por sesiones</div>
            <div className="ranking-list">
              {estadisticas.map((e, i) => (
                <div key={e.id} className="ranking-item">
                  <div className={`ranking-pos ${i === 0 ? 'top' : 'rest'}`}>{i+1}</div>
                  <div className="ranking-name">{e.nombre}</div>
                  <div className="ranking-bar-wrap">
                    <div className="ranking-bar" style={{width:`${(e.total_sesiones/maxSesiones)*100}%`,background:e.color||'#8B5CF6',opacity:0.7}}/>
                  </div>
                  <div className="ranking-count">{e.total_sesiones} ses.</div>
                  <div className="ranking-ingresos">${e.ingresos_total.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="mo-overlay" onClick={() => setModalOpen(false)}>
          <div className="mo-box" onClick={e => e.stopPropagation()}>
            <div className="mo-hdr">
              <span className="mo-title">{editando ? 'Editar servicio' : 'Nuevo servicio'}</span>
              <button className="mo-close" onClick={() => setModalOpen(false)}><X size={12}/></button>
            </div>

            <div className="field">
              <label>Nombre del servicio</label>
              <input placeholder="Ej: Lectura de Tarot" value={form.nombre}
                onChange={e => setForm({...form, nombre: e.target.value})}/>
            </div>

            <div className="field">
              <label>Tipo de servicio</label>
              <div className="tipo-grid">
                <button className={`tipo-btn${form.tipo_servicio==='vivo'?' sel':''}`}
                  onClick={() => setForm({...form, tipo_servicio: 'vivo'})}>
                  <div className="tipo-btn-icon">🔴</div>
                  <div className="tipo-btn-name">En vivo</div>
                  <div className="tipo-btn-desc">Sesión con fecha y hora específica</div>
                </button>
                <button className={`tipo-btn${form.tipo_servicio==='entrega'?' sel':''}`}
                  onClick={() => setForm({...form, tipo_servicio: 'entrega'})}>
                  <div className="tipo-btn-icon">📦</div>
                  <div className="tipo-btn-name">Con entrega</div>
                  <div className="tipo-btn-desc">Tarot escrito, carta astral, etc.</div>
                </button>
              </div>
            </div>

            {form.tipo_servicio === 'vivo' ? (
              <div className="field-row">
                <div className="field">
                  <label>Duración (minutos)</label>
                  <input type="number" min="15" step="15" value={form.duracion_estimada}
                    onChange={e => setForm({...form, duracion_estimada: Number(e.target.value)})}/>
                </div>
                <div className="field">
                  <label>Precio en ARS — sin puntos ni comas (ej: 9900)</label>
                  <input type="number" min="0" value={form.precio_base || ''}
                    onChange={e => setForm({...form, precio_base: Math.round(Number(e.target.value))})}/>
                </div>
                <div className="field">
                  <label>Precio en USD (opcional)</label>
                  <input type="text" inputMode="numeric" placeholder="Ej: 20" value={form.precio_usd ? form.precio_usd.toLocaleString('es-AR') : ''}
                    onChange={e => {
                      const limpio = e.target.value.replace(/\./g,'').replace(/,/g,'').replace(/[^0-9]/g,'')
                      setForm({...form, precio_usd: limpio ? Number(limpio) : null})
                    }}/>
                  <div style={{fontSize:'10px',color:'var(--text-muted)',marginTop:'4px'}}>Si lo completás, aparece en tu página pública como referencia para pago en dólares.</div>
                </div>
              </div>
            ) : (
              <>
                <div className="field">
                  <label>Plazo de entrega</label>
                  <div className="plazo-grid">
                    {[24, 48, 72, 96].map(h => (
                      <button key={h} className={`plazo-btn${form.plazo_horas===h?' sel':''}`}
                        onClick={() => setForm({...form, plazo_horas: h})}>
                        {h}hs
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                <label>Precio en ARS — sin puntos ni comas (ej: 9900)</label>
                <input type="number" min="0" value={form.precio_base || ''}
                    onChange={e => setForm({...form, precio_base: Number(e.target.value)})}/>
                </div>
                <div className="field">
                  <label>Precio en USD (opcional)</label>
                  <input type="number" min="0" placeholder="Ej: 20" value={form.precio_usd || ''}
                    onChange={e => setForm({...form, precio_usd: e.target.value ? Number(e.target.value) : null})}/>
                  <div style={{fontSize:'10px',color:'var(--text-muted)',marginTop:'4px'}}>Si lo completás, aparece en tu página pública como referencia para pago en dólares.</div>
                </div>
              </>
            )}

            <div className="field">
              <label>Descripción</label>
              <textarea placeholder="Descripción breve del servicio..."
                value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})}/>
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

      {confirmBorrar && (
        <div className="mo-overlay" onClick={() => setConfirmBorrar(null)}>
          <div className="mo-box" style={{width:'340px'}} onClick={e => e.stopPropagation()}>
            <div className="mo-hdr">
              <span className="mo-title">¿Eliminar servicio?</span>
              <button className="mo-close" onClick={() => setConfirmBorrar(null)}><X size={12}/></button>
            </div>
            <p style={{fontSize:'13px',color:'var(--text-secondary)',marginBottom:'20px',lineHeight:'1.6'}}>
              Se eliminará <strong>{confirmBorrar.nombre}</strong> permanentemente.
            </p>
            <div style={{display:'flex',gap:'8px'}}>
              <button onClick={() => setConfirmBorrar(null)}
                style={{flex:1,padding:'11px',borderRadius:'10px',border:'0.5px solid var(--border)',background:'var(--bg-card)',fontSize:'13px',cursor:'pointer',fontFamily:'inherit',color:'var(--text-secondary)'}}>
                Cancelar
              </button>
              <button onClick={() => borrar(confirmBorrar)}
                style={{flex:1,padding:'11px',borderRadius:'10px',border:'none',background:'#EF4444',color:'white',fontSize:'13px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit'}}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}