'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Plus, Video, Trash2 } from 'lucide-react'

type Encuentro = { id: string; titulo: string; descripcion: string | null; fecha_hora: string; link_zoom: string }

export default function CourseLiveTab({ cursoId }: { cursoId: string }) {
  const [encuentros, setEncuentros] = useState<Encuentro[]>([])
  const [loading, setLoading] = useState(true)
  const [nuevo, setNuevo] = useState({ titulo: '', descripcion: '', fecha: '', hora: '', link_zoom: '' })
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargarEncuentros() }, [cursoId])

  async function cargarEncuentros() {
    try {
      const supabase = createClient()
      const { data } = await supabase.from('course_live_sessions').select('*')
        .eq('course_id', cursoId).order('fecha_hora')
      if (data) setEncuentros(data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function agregarEncuentro() {
    if (!nuevo.titulo.trim() || !nuevo.fecha || !nuevo.hora || !nuevo.link_zoom.trim()) return
    setGuardando(true)
    try {
      const supabase = createClient()
      const fechaHora = `${nuevo.fecha}T${nuevo.hora}:00`
      const { data, error } = await supabase.from('course_live_sessions').insert({
        course_id: cursoId,
        titulo: nuevo.titulo.trim(),
        descripcion: nuevo.descripcion.trim() || null,
        fecha_hora: fechaHora,
        link_zoom: nuevo.link_zoom.trim(),
      }).select().single()
      if (!error && data) {
        setEncuentros(prev => [...prev, data].sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora)))
        setNuevo({ titulo: '', descripcion: '', fecha: '', hora: '', link_zoom: '' })
      }
    } finally { setGuardando(false) }
  }

  async function eliminarEncuentro(id: string) {
    if (!confirm('¿Eliminar este encuentro?')) return
    const supabase = createClient()
    const { data, error } = await supabase.from('course_live_sessions').delete().eq('id', id).select()
    console.log('Resultado del borrado:', { data, error })
    if (error) { console.error('Error borrando encuentro:', error); return }
    setEncuentros(prev => prev.filter(e => e.id !== id))
  }

  if (loading) return <div style={{padding:'40px',textAlign:'center',color:'var(--text-muted)'}}>Cargando...</div>

  const ahora = new Date()
  const proximos = encuentros.filter(e => new Date(e.fecha_hora) >= ahora)
  const pasados = encuentros.filter(e => new Date(e.fecha_hora) < ahora)

  return (
    <div style={{padding:'20px',maxWidth:'720px'}}>
      <style>{`
        .field{display:flex;flex-direction:column;gap:4px;margin-bottom:12px}
        .field label{font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px}
        .field input,.field textarea{padding:9px 12px;border-radius:10px;border:0.5px solid var(--border);font-size:13px;font-family:inherit;color:var(--text-primary);background:var(--bg-input);outline:none;width:100%}
        .field textarea{resize:none;min-height:60px}
        .precio-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .enc-card{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--bg-card);border:0.5px solid var(--border-light);border-radius:12px;margin-bottom:8px}
        .enc-icon{width:34px;height:34px;border-radius:9px;background:var(--accent-light);display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .section-title{font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:12px;margin-top:8px;padding-bottom:8px;border-bottom:0.5px solid var(--border-light)}
      `}</style>

      {proximos.length === 0 && pasados.length === 0 && (
        <div style={{textAlign:'center',padding:'32px 20px',color:'var(--text-muted)'}}>
          <Video size={28} color="var(--text-muted)" style={{marginBottom:'10px'}}/>
          <p style={{fontSize:'13px'}}>Todavía no cargaste ningún encuentro en vivo.</p>
        </div>
      )}

      {proximos.length > 0 && (<>
        <div className="section-title">Próximos ({proximos.length})</div>
        {proximos.map(e => (
          <div key={e.id} className="enc-card">
            <div className="enc-icon"><Video size={15} color="var(--accent)"/></div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:'13px',fontWeight:600,color:'var(--text-primary)'}}>{e.titulo}</div>
              <div style={{fontSize:'11px',color:'var(--text-muted)'}}>
                {new Date(e.fecha_hora).toLocaleString('es-AR', { day:'numeric', month:'long', hour:'2-digit', minute:'2-digit' })} hs
              </div>
            </div>
            <button onClick={() => eliminarEncuentro(e.id)} style={{background:'transparent',border:'none',cursor:'pointer'}}>
              <Trash2 size={14} color="#EF4444"/>
            </button>
          </div>
        ))}
      </>)}

      {pasados.length > 0 && (<>
        <div className="section-title">Pasados ({pasados.length})</div>
        {pasados.map(e => (
          <div key={e.id} className="enc-card" style={{opacity:0.55}}>
            <div className="enc-icon"><Video size={15} color="var(--text-muted)"/></div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:'13px',fontWeight:600,color:'var(--text-primary)'}}>{e.titulo}</div>
              <div style={{fontSize:'11px',color:'var(--text-muted)'}}>
                {new Date(e.fecha_hora).toLocaleString('es-AR', { day:'numeric', month:'long', hour:'2-digit', minute:'2-digit' })} hs
              </div>
            </div>
            <button onClick={() => eliminarEncuentro(e.id)} style={{background:'transparent',border:'none',cursor:'pointer'}}>
              <Trash2 size={14} color="#EF4444"/>
            </button>
          </div>
        ))}
      </>)}

      <div className="section-title" style={{marginTop:'24px'}}>Agregar encuentro</div>
      <div style={{border:'0.5px solid var(--border)',borderRadius:'12px',padding:'16px'}}>
        <div className="field">
          <label>Título del encuentro</label>
          <input value={nuevo.titulo} placeholder="Ej: Repaso de Arcanos Mayores"
            onChange={e => setNuevo({...nuevo, titulo: e.target.value})}/>
        </div>
        <div className="precio-row">
          <div className="field">
            <label>Fecha</label>
            <input type="date" value={nuevo.fecha}
              onChange={e => setNuevo({...nuevo, fecha: e.target.value})}/>
          </div>
          <div className="field">
            <label>Hora</label>
            <input type="time" value={nuevo.hora}
              onChange={e => setNuevo({...nuevo, hora: e.target.value})}/>
          </div>
        </div>
        <span style={{fontSize:'10px',color:'var(--text-muted)',display:'block',marginBottom:'12px'}}>
          Recomendamos avisar con 3 o 4 días de anticipación, para que a tus alumnas les llegue a tiempo.
        </span>
        <div className="field">
          <label>Link de Zoom (o Meet, lo que uses)</label>
          <input value={nuevo.link_zoom} placeholder="https://zoom.us/j/..."
            onChange={e => setNuevo({...nuevo, link_zoom: e.target.value})}/>
        </div>
        <div className="field">
          <label>Descripción (opcional)</label>
          <textarea value={nuevo.descripcion} placeholder="De qué van a hablar en este encuentro..."
            onChange={e => setNuevo({...nuevo, descripcion: e.target.value})}/>
        </div>
        <button onClick={agregarEncuentro} disabled={guardando}
          style={{padding:'10px 16px',borderRadius:'10px',border:'none',background:'linear-gradient(135deg,#8B5CF6,#7C3AED)',color:'white',fontSize:'12px',fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
          <Plus size={12} style={{display:'inline',marginRight:'5px'}}/>{guardando ? 'Agregando...' : 'Agregar encuentro'}
        </button>
      </div>
    </div>
  )
}