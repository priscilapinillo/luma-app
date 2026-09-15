'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Plus, ChevronDown, ChevronUp, Edit2, Trash2, X, Check } from 'lucide-react'

type Modulo = {
  id: string; titulo: string; descripcion: string; orden: number
  lecciones?: Leccion[]
}
type Leccion = {
  id: string; module_id: string; titulo: string; tipo: string
  contenido_url: string; contenido_texto: string
  duracion_min: number | null; orden: number; es_preview: boolean
  descripcion?: string | null; notas?: string | null
}

export default function CourseContentTab({ cursoId }: { cursoId: string }) {
  const [modulos, setModulos] = useState<Modulo[]>([])
  const [loading, setLoading] = useState(true)
  const [moduloAbierto, setModuloAbierto] = useState<string | null>(null)
  const [modalModulo, setModalModulo] = useState(false)
  const [modalLeccion, setModalLeccion] = useState<string | null>(null)
  const [editandoModulo, setEditandoModulo] = useState<Modulo | null>(null)
  const [editandoLeccion, setEditandoLeccion] = useState<Leccion | null>(null)
  const [formModulo, setFormModulo] = useState({ titulo: '', descripcion: '' })
  const [formLeccion, setFormLeccion] = useState({
    titulo: '', tipo: 'video', contenido_url: '', contenido_texto: '',
    duracion_min: '' as string | number, es_preview: false,
    descripcion: '', notas: '',
  })
  const [guardando, setGuardando] = useState(false)
  const [subiendoAdjunto, setSubiendoAdjunto] = useState(false)
  const [adjuntosNuevos, setAdjuntosNuevos] = useState<{nombre: string; url: string; tipo: string}[]>([])
const [adjuntosExistentes, setAdjuntosExistentes] = useState<{id: string; nombre: string; url: string; tipo: string}[]>([])

  useEffect(() => { cargarModulos() }, [cursoId])

  async function cargarModulos() {
    try {
      const supabase = createClient()
      const { data: mods } = await supabase.from('modules').select('*').eq('course_id', cursoId).order('orden')
      if (!mods) return
      const { data: lecs, error: lecsError } = await supabase.from('lessons').select('*')
        .in('module_id', mods.map(m => m.id)).order('orden')
      console.log('LECCIONES:', lecs, 'ERROR:', lecsError)
        setModulos(mods.map((m: Modulo) => ({ ...m, lecciones: lecs?.filter((l: Leccion) => l.module_id === m.id) || [] })))
        if (mods.length > 0 && !moduloAbierto) setModuloAbierto(mods[0].id)
          // mantener el módulo abierto después de recargar
          else if (moduloAbierto) setModuloAbierto(moduloAbierto)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function guardarModulo() {
    if (!formModulo.titulo) return
    setGuardando(true)
    try {
      const supabase = createClient()
      if (editandoModulo) {
        await supabase.from('modules').update({ titulo: formModulo.titulo, descripcion: formModulo.descripcion }).eq('id', editandoModulo.id)
      } else {
        await supabase.from('modules').insert({ course_id: cursoId, titulo: formModulo.titulo, descripcion: formModulo.descripcion, orden: modulos.length })
      }
      await cargarModulos()
      setModalModulo(false)
      setFormModulo({ titulo: '', descripcion: '' })
      setEditandoModulo(null)
    } catch (err) { console.error(err) }
    finally { setGuardando(false) }
  }

  async function eliminarModulo(id: string) {
    if (!confirm('¿Eliminar este módulo y todas sus lecciones?')) return
    const supabase = createClient()
    await supabase.from('modules').delete().eq('id', id)
    await cargarModulos()
  }


  async function subirAdjunto(file: File) {
    setSubiendoAdjunto(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const nombre = `${Date.now()}-${file.name}`
      await supabase.storage.from('lesson-attachments').upload(nombre, file, { upsert: true })
      const { data } = supabase.storage.from('lesson-attachments').getPublicUrl(nombre)
      setAdjuntosNuevos(prev => [...prev, { nombre: file.name, url: data.publicUrl, tipo: ext || 'pdf' }])
    } catch(err) { console.error(err) }
    finally { setSubiendoAdjunto(false) }
  } 

  async function guardarLeccion(moduleId: string) {
    if (!formLeccion.titulo) return
    setGuardando(true)
    try {
      const supabase = createClient()
      const lecciones = modulos.find(m => m.id === moduleId)?.lecciones || []
      const datos = {
        titulo: formLeccion.titulo,
        tipo: formLeccion.tipo,
        contenido_url: formLeccion.contenido_url || null,
        contenido_texto: formLeccion.contenido_texto || null,
        duracion_min: formLeccion.duracion_min ? Math.round(Number(formLeccion.duracion_min)) : null,
        es_preview: formLeccion.es_preview,
        descripcion: formLeccion.descripcion || null,
        notas: formLeccion.notas || null,
      }
      if (editandoLeccion) {
        await supabase.from('lessons').update(datos).eq('id', editandoLeccion.id)
      } else {
        const { error: insertError } = await supabase.from('lessons').insert({ ...datos, module_id: moduleId, orden: lecciones.length })
      console.log('INSERT ERROR:', insertError)
      }
      await cargarModulos()
      // Guardar adjuntos
      if (adjuntosNuevos.length > 0) {
        const leccionId = editandoLeccion?.id || (await supabase.from('lessons').select('id').eq('module_id', moduleId).order('created_at', { ascending: false }).limit(1).single()).data?.id
        if (leccionId) {
          await supabase.from('lesson_attachments').insert(
            adjuntosNuevos.map(a => ({ lesson_id: leccionId, nombre: a.nombre, url: a.url, tipo: a.tipo }))
          )
        }
      }
      setModalLeccion(null)
      setAdjuntosNuevos([])
      setFormLeccion({ titulo: '', tipo: 'video', contenido_url: '', contenido_texto: '', duracion_min: '', es_preview: false, descripcion: '', notas: '' })
      setEditandoLeccion(null)
    } catch (err) { console.error(err) }
    finally { setGuardando(false) }
  }

  async function eliminarLeccion(id: string) {
    if (!confirm('¿Eliminar esta lección?')) return
    const supabase = createClient()
    await supabase.from('lessons').delete().eq('id', id)
    await cargarModulos()
  }

  if (loading) return <div style={{padding:'40px',textAlign:'center',color:'var(--text-muted)'}}>Cargando contenido...</div>

  return (
    <div style={{padding:'20px',maxWidth:'720px'}}>
      <style>{`
        .mod-card{background:var(--bg-card);border:0.5px solid var(--border-light);border-radius:14px;margin-bottom:10px;overflow:hidden}
        .mod-header{display:flex;align-items:center;gap:10px;padding:14px 16px;cursor:pointer;user-select:none}
        .mod-title{flex:1;font-size:13px;font-weight:700;color:var(--text-primary);font-family:'Manrope',sans-serif}
        .mod-actions{display:flex;gap:6px}
        .icon-btn{width:26px;height:26px;border-radius:7px;border:0.5px solid var(--border);background:var(--bg-input);display:flex;align-items:center;justify-content:center;cursor:pointer}
        .lec-item{display:flex;align-items:center;gap:10px;padding:10px 16px;border-top:0.5px solid var(--border-light)}
        .lec-tipo{font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:2px 7px;border-radius:10px}
        .tipo-video{background:#EDE8FF;color:#4C1D95}
        .tipo-pdf{background:#FEF3C7;color:#92400E}
        .tipo-audio{background:#DCFCE7;color:#166534}
        .tipo-texto{background:#F0F9FF;color:#0369A1}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px}
        .modal-box{background:var(--bg-card);border-radius:20px;padding:24px;width:100%;max-width:480px;max-height:80vh;overflow-y:auto}
        .field{display:flex;flex-direction:column;gap:4px;margin-bottom:12px}
        .field label{font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px}
        .field input,.field textarea,.field select{padding:9px 12px;border-radius:10px;border:0.5px solid var(--border);font-size:13px;font-family:inherit;color:var(--text-primary);background:var(--bg-input);outline:none;width:100%}
        .field textarea{resize:none;min-height:80px}
      `}</style>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
        <div style={{fontSize:'13px',color:'var(--text-muted)'}}>
          {modulos.length} módulo{modulos.length !== 1 ? 's' : ''} · {modulos.reduce((acc, m) => acc + (m.lecciones?.length || 0), 0)} lecciones
        </div>
        <button onClick={() => { setEditandoModulo(null); setFormModulo({ titulo: '', descripcion: '' }); setModalModulo(true) }}
          style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 14px',background:'linear-gradient(135deg,#8B5CF6,#7C3AED)',color:'white',border:'none',borderRadius:'10px',fontSize:'12px',fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
          <Plus size={12}/>Nuevo módulo
        </button>
      </div>

      {modulos.length === 0 && (
        <div style={{textAlign:'center',padding:'48px 20px',color:'var(--text-muted)'}}>
          <div style={{fontSize:'32px',marginBottom:'12px'}}>📚</div>
          <div style={{fontSize:'14px',fontWeight:600,color:'var(--text-primary)',marginBottom:'6px'}}>Sin contenido todavía</div>
          <p style={{fontSize:'12px'}}>Creá el primer módulo para empezar a agregar lecciones.</p>
        </div>
      )}

      {modulos.map(m => (
        <div key={m.id} className="mod-card">
          <div className="mod-header" onClick={() => setModuloAbierto(moduloAbierto === m.id ? null : m.id)}>
            {moduloAbierto === m.id ? <ChevronUp size={14} color="var(--text-muted)"/> : <ChevronDown size={14} color="var(--text-muted)"/>}
            <div className="mod-title">{m.titulo}</div>
            <div style={{fontSize:'11px',color:'var(--text-muted)',marginRight:'8px'}}>{m.lecciones?.length || 0} lec.</div>
            <div className="mod-actions" onClick={e => e.stopPropagation()}>
              <div className="icon-btn" onClick={() => { setEditandoModulo(m); setFormModulo({ titulo: m.titulo, descripcion: m.descripcion }); setModalModulo(true) }}>
                <Edit2 size={10} color="var(--text-muted)"/>
              </div>
              <div className="icon-btn" onClick={() => eliminarModulo(m.id)}>
                <Trash2 size={10} color="#EF4444"/>
              </div>
            </div>
          </div>

          {moduloAbierto === m.id && (
            <>
              {m.lecciones?.map(l => (
                <div key={l.id} className="lec-item">
                  <span className={`lec-tipo tipo-${l.tipo}`}>{l.tipo}</span>
                  <div style={{flex:1,fontSize:'12.5px',color:'var(--text-primary)',fontWeight:500}}>{l.titulo}</div>
                  {l.es_preview && <span style={{fontSize:'9px',background:'#DCFCE7',color:'#166534',padding:'2px 6px',borderRadius:'10px',fontWeight:700}}>PREVIEW</span>}
                  {l.duracion_min && <span style={{fontSize:'10px',color:'var(--text-muted)'}}>{l.duracion_min}min</span>}
                  <div className="mod-actions">
                    <div className="icon-btn" onClick={() => { setEditandoLeccion(l)
setFormLeccion({ titulo: l.titulo, tipo: l.tipo, contenido_url: l.contenido_url || '', contenido_texto: l.contenido_texto || '', duracion_min: l.duracion_min || '', es_preview: l.es_preview, descripcion: l.descripcion || '', notas: l.notas || '' })
setAdjuntosNuevos([])
setAdjuntosExistentes([])
setModalLeccion(m.id)
const supabase = createClient()
supabase.from('lesson_attachments').select('*').eq('lesson_id', l.id).then(({ data }) => {
  setAdjuntosExistentes(data || [])
})}}>
                      <Edit2 size={10} color="var(--text-muted)"/>
                    </div>
                    <div className="icon-btn" onClick={() => eliminarLeccion(l.id)}>
                      <Trash2 size={10} color="#EF4444"/>
                    </div>
                  </div>
                </div>
              ))}
              <div style={{padding:'10px 16px',borderTop:'0.5px solid var(--border-light)'}}>
                <button onClick={() => { setEditandoLeccion(null)
setFormLeccion({ titulo: '', tipo: 'video', contenido_url: '', contenido_texto: '', duracion_min: '', es_preview: false, descripcion: '', notas: '' })
setAdjuntosNuevos([])
setAdjuntosExistentes([])
setModalLeccion(m.id) }}
                  style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'11px',color:'var(--accent)',background:'transparent',border:'0.5px solid var(--accent)',borderRadius:'8px',padding:'5px 10px',cursor:'pointer',fontFamily:'inherit'}}>
                  <Plus size={10}/>Agregar lección
                </button>
              </div>
            </>
          )}
        </div>
      ))}

      {/* MODAL MÓDULO */}
      {modalModulo && (
        <div className="modal-overlay" onClick={() => setModalModulo(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <div style={{fontSize:'15px',fontWeight:700,color:'var(--text-primary)'}}>{editandoModulo ? 'Editar módulo' : 'Nuevo módulo'}</div>
              <button onClick={() => setModalModulo(false)} style={{background:'transparent',border:'none',cursor:'pointer'}}><X size={16} color="var(--text-muted)"/></button>
            </div>
            <div className="field">
              <label>Título del módulo *</label>
              <input value={formModulo.titulo} placeholder="Ej: Módulo 1 — Introducción al Tarot"
                onChange={e => setFormModulo({...formModulo, titulo: e.target.value})}/>
            </div>
            <div className="field">
              <label>Descripción (opcional)</label>
              <textarea value={formModulo.descripcion} placeholder="Qué cubre este módulo..."
                onChange={e => setFormModulo({...formModulo, descripcion: e.target.value})}/>
            </div>
            <button onClick={guardarModulo} disabled={guardando}
              style={{width:'100%',padding:'12px',background:'linear-gradient(135deg,#8B5CF6,#7C3AED)',color:'white',border:'none',borderRadius:'10px',fontSize:'13px',fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              {guardando ? 'Guardando...' : editandoModulo ? 'Guardar cambios' : 'Crear módulo'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL LECCIÓN */}
      {modalLeccion && (
        <div className="modal-overlay" onClick={() => setModalLeccion(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <div style={{fontSize:'15px',fontWeight:700,color:'var(--text-primary)'}}>{editandoLeccion ? 'Editar lección' : 'Nueva lección'}</div>
              <button onClick={() => setModalLeccion(null)} style={{background:'transparent',border:'none',cursor:'pointer'}}><X size={16} color="var(--text-muted)"/></button>
            </div>
            <div className="field">
              <label>Título *</label>
              <input value={formLeccion.titulo} placeholder="Ej: Introducción a los arcanos mayores"
                onChange={e => setFormLeccion({...formLeccion, titulo: e.target.value})}/>
            </div>
            <div className="field">
              <label>Tipo de contenido</label>
              <select value={formLeccion.tipo} onChange={e => setFormLeccion({...formLeccion, tipo: e.target.value})}>
                <option value="video">Video (YouTube)</option>
                <option value="pdf">PDF</option>
                <option value="audio">Audio</option>
                <option value="texto">Texto</option>
              </select>
            </div>
            {(formLeccion.tipo === 'video' || formLeccion.tipo === 'audio') && (
              <div className="field">
                <label>{formLeccion.tipo === 'video' ? 'URL de YouTube' : 'URL del audio'}</label>
                <input value={formLeccion.contenido_url} placeholder={formLeccion.tipo === 'video' ? 'https://youtube.com/watch?v=...' : 'https://...'}
                  onChange={e => setFormLeccion({...formLeccion, contenido_url: e.target.value})}/>
              </div>
            )}
            {formLeccion.tipo === 'pdf' && (
              <div className="field">
                <label>URL del PDF</label>
                <input value={formLeccion.contenido_url} placeholder="https://..."
                  onChange={e => setFormLeccion({...formLeccion, contenido_url: e.target.value})}/>
              </div>
            )}
            {formLeccion.tipo === 'texto' && (
              <div className="field">
                <label>Contenido</label>
                <textarea value={formLeccion.contenido_texto} style={{minHeight:'120px'}}
                  onChange={e => setFormLeccion({...formLeccion, contenido_texto: e.target.value})}/>
              </div>
            )}
            <div className="field">
              <label>Descripción de la lección</label>
              <textarea value={formLeccion.descripcion || ''} placeholder="Explicá brevemente de qué trata esta lección..."
                style={{minHeight:'70px'}}
                onChange={e => setFormLeccion({...formLeccion, descripcion: e.target.value})}/>
            </div>
            <div className="field">
              <label>Notas adicionales</label>
              <textarea value={formLeccion.notas || ''} placeholder="Ejercicios, aclaraciones, links útiles..."
                style={{minHeight:'70px'}}
                onChange={e => setFormLeccion({...formLeccion, notas: e.target.value})}/>
            </div>
            <div className="field">
              <label>Duración (minutos)</label>
              <input type="number" min="0" step="1" value={formLeccion.duracion_min}
                placeholder="Ej: 15"
                onChange={e => setFormLeccion({...formLeccion, duracion_min: e.target.value})}/>
              <span style={{fontSize:'10px',color:'var(--text-muted)',marginTop:'2px'}}>Solo números enteros. Ej: 15, 30, 60</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'16px',padding:'10px 12px',background:'var(--bg-input)',borderRadius:'10px',cursor:'pointer'}}
              onClick={() => setFormLeccion({...formLeccion, es_preview: !formLeccion.es_preview})}>
              <div style={{width:'18px',height:'18px',borderRadius:'5px',border:`1.5px solid ${formLeccion.es_preview ? '#8B5CF6' : 'var(--border)'}`,background:formLeccion.es_preview ? '#8B5CF6' : 'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                {formLeccion.es_preview && <Check size={10} color="white"/>}
              </div>
              <div>
                <div style={{fontSize:'12px',fontWeight:600,color:'var(--text-primary)'}}>Lección de preview</div>
                <div style={{fontSize:'10px',color:'var(--text-muted)'}}>Las alumnas pueden ver esta lección sin comprar el curso</div>
              </div>
            </div>
            <div className="field">
              <label>Archivos descargables</label>
              <div style={{border:'0.5px dashed var(--border)',borderRadius:'10px',padding:'14px',textAlign:'center',background:'var(--bg-input)',cursor:'pointer'}}
                onClick={() => document.getElementById('adj-upload')?.click()}>
                <div style={{fontSize:'12px',color:'var(--text-muted)'}}>
                  {subiendoAdjunto ? 'Subiendo...' : '📎 Subir PDF, audio u otro archivo'}
                </div>
                <input id="adj-upload" type="file" accept=".pdf,.mp3,.mp4,.doc,.docx,.zip" style={{display:'none'}}
                  onChange={e => e.target.files?.[0] && subirAdjunto(e.target.files[0])}/>
              </div>
              {adjuntosExistentes.map((a, i) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:'8px',marginTop:'6px',padding:'6px 10px',background:'var(--bg-input)',borderRadius:'8px',border:'0.5px solid var(--border)'}}>
                  <span style={{fontSize:'12px',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>📎 {a.nombre}</span>
                  <a href={a.url} target="_blank" rel="noopener noreferrer" style={{fontSize:'10px',color:'var(--accent)',textDecoration:'none'}}>Ver</a>
                  <button onClick={async () => {
                    const supabase = createClient()
                    await supabase.from('lesson_attachments').delete().eq('id', a.id)
                    setAdjuntosExistentes(prev => prev.filter((_,j) => j !== i))
                  }} style={{background:'transparent',border:'none',cursor:'pointer',color:'#EF4444',fontSize:'16px',flexShrink:0}}>×</button>
                </div>
              ))}
              {adjuntosNuevos.map((a, i) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:'8px',marginTop:'6px',padding:'6px 10px',background:'var(--bg-input)',borderRadius:'8px',border:'0.5px solid var(--border)'}}>
                  <span style={{fontSize:'12px',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.nombre}</span>
                  <button onClick={() => setAdjuntosNuevos(prev => prev.filter((_,j) => j !== i))}
                    style={{background:'transparent',border:'none',cursor:'pointer',color:'#EF4444',fontSize:'16px',flexShrink:0}}>×</button>
                </div>
              ))}
            </div>
            <button onClick={() => guardarLeccion(modalLeccion)} disabled={guardando}
              style={{width:'100%',padding:'12px',background:'linear-gradient(135deg,#8B5CF6,#7C3AED)',color:'white',border:'none',borderRadius:'10px',fontSize:'13px',fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              {guardando ? 'Guardando...' : editandoLeccion ? 'Guardar cambios' : 'Crear lección'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}