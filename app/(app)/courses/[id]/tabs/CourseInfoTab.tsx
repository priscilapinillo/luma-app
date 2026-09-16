'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Plus, X } from 'lucide-react'

type Curso = {
  id: string; titulo: string; slug: string
  descripcion_corta: string; descripcion_larga: string
  imagen_url: string; video_presentacion_url: string
  precio: number; precio_original: number | null
  modalidad: string; nivel: string; idioma: string
  duracion_estimada_horas: number | null
  politica_reembolso: string; dias_garantia: number | null
  para_quien: string[]; que_aprenderas: string[]; requisitos: string[]
  estado: string
}

type Testimonio = {
    id: string; tipo: string; nombre: string; texto: string
    avatar_url: string | null; video_url: string | null; orden: number
  }

export default function CourseInfoTab({ curso, onUpdate }: { curso: Curso; onUpdate: (c: Curso) => void }) {
    console.log('CURSO ESTADO:', curso.estado)
    const [form, setForm] = useState({ ...curso,
    para_quien: curso.para_quien || [''],
    que_aprenderas: curso.que_aprenderas || [''],
    requisitos: curso.requisitos || [''],
  })
  const [guardando, setGuardando] = useState(false)
  const [subiendoImagen, setSubiendoImagen] = useState(false)
  const [msg, setMsg] = useState('')

  const [testimonios, setTestimonios] = useState<Testimonio[]>([])
  const [subiendoTesti, setSubiendoTesti] = useState<string | null>(null)
  const [guardandoTesti, setGuardandoTesti] = useState(false)
  const [nuevoTesti, setNuevoTesti] = useState({ tipo: 'texto', nombre: '', texto: '', avatar_url: '', video_url: '' })

  useEffect(() => { cargarTestimonios() }, [])

  async function cargarTestimonios() {
    const supabase = createClient()
    const { data } = await supabase.from('course_testimonials').select('*').eq('course_id', curso.id).order('orden')
    if (data) setTestimonios(data)
  }

  async function subirImagen(file: File) {
    setSubiendoImagen(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const nombre = `${Date.now()}.${ext}`
      await supabase.storage.from('course-images').upload(nombre, file, { upsert: true })
      const { data } = supabase.storage.from('course-images').getPublicUrl(nombre)
      setForm(prev => ({ ...prev, imagen_url: data.publicUrl }))
    } finally { setSubiendoImagen(false) }
  }

  async function subirArchivoTesti(file: File, campo: 'avatar_url' | 'video_url') {
    setSubiendoTesti(campo)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `testimonios/${curso.id}/${Date.now()}.${ext}`
      await supabase.storage.from('course-images').upload(path, file, { upsert: true })
      const { data } = supabase.storage.from('course-images').getPublicUrl(path)
      setNuevoTesti(prev => ({ ...prev, [campo]: data.publicUrl }))
    } finally { setSubiendoTesti(null) }
  }

  async function agregarTestimonio() {
    if (nuevoTesti.tipo === 'texto' && !nuevoTesti.texto.trim()) return
    if (nuevoTesti.tipo === 'imagen' && !nuevoTesti.avatar_url) return
    if (nuevoTesti.tipo === 'video' && !nuevoTesti.video_url) return
    setGuardandoTesti(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from('course_testimonials').insert({
        course_id: curso.id,
        tipo: nuevoTesti.tipo,
        nombre: nuevoTesti.nombre,
        texto: nuevoTesti.texto,
        avatar_url: nuevoTesti.avatar_url || null,
        video_url: nuevoTesti.video_url || null,
        orden: testimonios.length,
      }).select().single()
      if (error) console.error('Error insertando testimonio:', error)
      if (data) {
        setTestimonios(prev => [...prev, data])
        setNuevoTesti({ tipo: 'texto', nombre: '', texto: '', avatar_url: '', video_url: '' })
      }
    } finally { setGuardandoTesti(false) }
  }

  async function eliminarTestimonio(id: string) {
    const supabase = createClient()
    await supabase.from('course_testimonials').delete().eq('id', id)
    setTestimonios(prev => prev.filter(t => t.id !== id))
  }

  async function guardar(estado?: string) {
    setGuardando(true)
    try {
      const supabase = createClient()
      const datos = {
        titulo: form.titulo,
        descripcion_corta: form.descripcion_corta,
        descripcion_larga: form.descripcion_larga,
        imagen_url: form.imagen_url,
        video_presentacion_url: form.video_presentacion_url,
        precio: Number(form.precio),
        precio_original: form.precio_original ? Number(form.precio_original) : null,
        modalidad: form.modalidad,
        nivel: form.nivel,
        duracion_estimada_horas: form.duracion_estimada_horas ? Number(form.duracion_estimada_horas) : null,
        politica_reembolso: form.politica_reembolso,
        dias_garantia: form.dias_garantia ? Number(form.dias_garantia) : null,
        para_quien: form.para_quien.filter(x => x.trim()),
        que_aprenderas: form.que_aprenderas.filter(x => x.trim()),
        requisitos: form.requisitos.filter(x => x.trim()),
        updated_at: new Date().toISOString(),
        ...(estado ? { estado } : {}),
      }
      const { data } = await supabase.from('courses').update(datos).eq('id', curso.id).select().single()
      if (data) { onUpdate(data); setMsg('Guardado ✓') }
      setTimeout(() => setMsg(''), 2000)
    } catch (err) { console.error(err) }
    finally { setGuardando(false) }
  }

  function agregarItem(campo: 'para_quien' | 'que_aprenderas' | 'requisitos') {
    setForm(prev => ({ ...prev, [campo]: [...prev[campo], ''] }))
  }
  function editarItem(campo: 'para_quien' | 'que_aprenderas' | 'requisitos', idx: number, valor: string) {
    setForm(prev => { const n = [...prev[campo]]; n[idx] = valor; return { ...prev, [campo]: n } })
  }
  function eliminarItem(campo: 'para_quien' | 'que_aprenderas' | 'requisitos', idx: number) {
    setForm(prev => ({ ...prev, [campo]: prev[campo].filter((_, i) => i !== idx) }))
  }

  return (
    <div style={{padding:'20px',maxWidth:'720px',paddingBottom:'160px'}}>
      <style>{`
        .field{display:flex;flex-direction:column;gap:4px;margin-bottom:16px}
        .field label{font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px}
        .field input,.field textarea,.field select{padding:10px 12px;border-radius:10px;border:0.5px solid var(--border);font-size:13px;font-family:inherit;color:var(--text-primary);background:var(--bg-input);outline:none;width:100%}
        .field textarea{resize:none;min-height:80px}
        .field-hint{font-size:10px;color:var(--text-muted);margin-top:2px}
        .section-title{font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:12px;margin-top:24px;padding-bottom:8px;border-bottom:0.5px solid var(--border-light)}
        .bullet-item{display:flex;gap:8px;align-items:center;margin-bottom:6px}
        .bullet-item input{flex:1;padding:8px 10px;border-radius:8px;border:0.5px solid var(--border);font-size:12px;font-family:inherit;color:var(--text-primary);background:var(--bg-input);outline:none}
        .btn-add{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--accent);background:transparent;border:0.5px solid var(--accent);border-radius:8px;padding:5px 10px;cursor:pointer;font-family:inherit;margin-top:4px}
        .btn-remove{width:24px;height:24px;border-radius:6px;border:none;background:#FEE2E2;color:#EF4444;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}
               .precio-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
       .testi-tipo-row{display:flex;gap:6px;margin-bottom:12px}
       .testi-tipo-btn{flex:1;padding:8px;border-radius:8px;border:0.5px solid var(--border);background:var(--bg-input);font-size:11px;font-weight:600;color:var(--text-muted);cursor:pointer;font-family:inherit}
       .testi-tipo-btn.act{background:var(--accent);color:white;border-color:var(--accent)}
       .testi-card{display:flex;gap:10px;align-items:center;padding:10px;border:0.5px solid var(--border);border-radius:10px;margin-bottom:8px;background:var(--bg-input)}
       .testi-card-thumb{width:40px;height:40px;border-radius:8px;object-fit:cover;flex-shrink:0;background:var(--border-light)}
       .testi-card-texto{flex:1;font-size:12px;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
       .testi-upload-box{border:0.5px dashed var(--border);border-radius:10px;padding:14px;text-align:center;background:var(--bg-input);cursor:pointer;font-size:12px;color:var(--text-muted)}
</parameter>
       .bottom-bar{position:fixed;bottom:calc(72px + env(safe-area-inset-bottom));left:0;right:0;background:transparent;border-top:none;border-bottom:none;padding:12px 20px;display:flex;gap:8px;justify-content:flex-end;align-items:center;z-index:201;flex-wrap:wrap}
@media(min-width:768px){.bottom-bar{left:200px;bottom:0;border-bottom:none}}
      `}</style>

      <div className="section-title">Información básica</div>
      <div className="field">
        <label>Título *</label>
        <input value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})}/>
      </div>
      <div className="field">
        <label>Descripción corta</label>
        <textarea value={form.descripcion_corta} maxLength={150}
          onChange={e => setForm({...form, descripcion_corta: e.target.value})}/>
        <span className="field-hint">{form.descripcion_corta?.length || 0}/150</span>
      </div>
      <div className="field">
        <label>Descripción completa</label>
        <textarea value={form.descripcion_larga} style={{minHeight:'120px'}}
          onChange={e => setForm({...form, descripcion_larga: e.target.value})}/>
      </div>
      <div className="field">
        <label>Imagen de portada</label>
        <div style={{border:'0.5px dashed var(--border)',borderRadius:'12px',padding:'20px',textAlign:'center',background:'var(--bg-input)',cursor:'pointer'}}
          onClick={() => document.getElementById('img-edit')?.click()}>
          {form.imagen_url
            ? <img src={form.imagen_url} alt="portada" style={{width:'100%',height:'160px',objectFit:'cover',borderRadius:'8px'}}/>
            : <div style={{color:'var(--text-muted)',fontSize:'13px'}}>{subiendoImagen ? 'Subiendo...' : '📷 Tocá para cambiar la imagen'}</div>
          }
          <input id="img-edit" type="file" accept="image/*" style={{display:'none'}}
            onChange={e => e.target.files?.[0] && subirImagen(e.target.files[0])}/>
        </div>
        {form.imagen_url && <button onClick={() => setForm({...form, imagen_url: ''})}
          style={{fontSize:'11px',color:'#EF4444',background:'transparent',border:'none',cursor:'pointer',marginTop:'4px',fontFamily:'inherit'}}>× Eliminar imagen</button>}
      </div>
      <div className="field">
        <label>Video de presentación (YouTube)</label>
        <input value={form.video_presentacion_url || ''} placeholder="https://youtube.com/watch?v=..."
          onChange={e => setForm({...form, video_presentacion_url: e.target.value})}/>
      </div>

      <div className="section-title">Precio y modalidad</div>
      <div className="precio-row">
        <div className="field">
        <label>Precio base (sin puntos ni comas, ej: 15000) *</label>
          <input type="number" min="0" value={form.precio}
            onChange={e => setForm({...form, precio: Number(e.target.value)})}/>
        </div>
        <div className="field">
        <label>Precio con oferta (el tachado que se muestra arriba)</label>
          <input type="number" min="0" value={form.precio_original || ''}
            onChange={e => setForm({...form, precio_original: e.target.value ? Number(e.target.value) : null})}/>
        </div>
      </div>
      <div className="field">
        <label>Modalidad</label>
        <select value={form.modalidad} onChange={e => setForm({...form, modalidad: e.target.value})}>
          <option value="unico">Pago único — acceso para siempre</option>
          <option value="suscripcion">Suscripción mensual</option>
        </select>
      </div>

      <div className="section-title">Detalles</div>
      <div className="precio-row">
        <div className="field">
          <label>Nivel</label>
          <select value={form.nivel} onChange={e => setForm({...form, nivel: e.target.value})}>
            <option value="principiante">Principiante</option>
            <option value="intermedio">Intermedio</option>
            <option value="avanzado">Avanzado</option>
          </select>
        </div>
        <div className="field">
          <label>Duración estimada (horas)</label>
          <input type="number" min="0" step="0.5" value={form.duracion_estimada_horas || ''}
            onChange={e => setForm({...form, duracion_estimada_horas: e.target.value ? Number(e.target.value) : null})}/>
        </div>
      </div>

      <div className="section-title">Para quién es</div>
      {form.para_quien.map((item, i) => (
        <div key={i} className="bullet-item">
          <input value={item} placeholder="Ej: Para vos si querés aprender tarot desde cero"
            onChange={e => editarItem('para_quien', i, e.target.value)}/>
          {form.para_quien.length > 1 && <button className="btn-remove" onClick={() => eliminarItem('para_quien', i)}><X size={10}/></button>}
        </div>
      ))}
      <button className="btn-add" onClick={() => agregarItem('para_quien')}><Plus size={11}/>Agregar</button>

      <div className="section-title">Qué vas a aprender</div>
      {form.que_aprenderas.map((item, i) => (
        <div key={i} className="bullet-item">
          <input value={item} placeholder="Ej: Leer las 78 cartas del tarot"
            onChange={e => editarItem('que_aprenderas', i, e.target.value)}/>
          {form.que_aprenderas.length > 1 && <button className="btn-remove" onClick={() => eliminarItem('que_aprenderas', i)}><X size={10}/></button>}
        </div>
      ))}
      <button className="btn-add" onClick={() => agregarItem('que_aprenderas')}><Plus size={11}/>Agregar</button>

      <div className="section-title">Requisitos previos</div>
      {form.requisitos.map((item, i) => (
        <div key={i} className="bullet-item">
          <input value={item} placeholder="Ej: No necesitás experiencia previa"
            onChange={e => editarItem('requisitos', i, e.target.value)}/>
          {form.requisitos.length > 1 && <button className="btn-remove" onClick={() => eliminarItem('requisitos', i)}><X size={10}/></button>}
        </div>
      ))}
      <button className="btn-add" onClick={() => agregarItem('requisitos')}><Plus size={11}/>Agregar</button>

      <div className="section-title">Garantía</div>
      <div className="precio-row">
        <div className="field">
          <label>Días de garantía</label>
          <input type="number" min="0" value={form.dias_garantia || ''}
            onChange={e => setForm({...form, dias_garantia: e.target.value ? Number(e.target.value) : null})}/>
        </div>
        <div className="field">
          <label>Política de reembolso</label>
          <input value={form.politica_reembolso || ''}
            onChange={e => setForm({...form, politica_reembolso: e.target.value})}/>
        </div>
      </div>

      <div className="section-title">Testimonios</div>

      {testimonios.map(ti => (
        <div key={ti.id} className="testi-card">
          {ti.tipo === 'video'
            ? <div className="testi-card-thumb" style={{display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px'}}>🎬</div>
            : ti.avatar_url
              ? <img src={ti.avatar_url} className="testi-card-thumb"/>
              : <div className="testi-card-thumb"/>
          }
          <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:'11px',fontWeight:700,color:'var(--text-primary)'}}>{ti.nombre || 'Sin nombre'}</div>
            <div className="testi-card-texto">{ti.tipo === 'video' ? 'Video subido' : ti.texto}</div>
          </div>
          <button className="btn-remove" onClick={() => eliminarTestimonio(ti.id)}><X size={10}/></button>
        </div>
      ))}

      <div style={{border:'0.5px solid var(--border)',borderRadius:'12px',padding:'14px',marginTop:'10px'}}>
        <div className="testi-tipo-row">
          <button className={`testi-tipo-btn${nuevoTesti.tipo==='texto'?' act':''}`} onClick={() => setNuevoTesti({...nuevoTesti, tipo:'texto'})}>Texto</button>
          <button className={`testi-tipo-btn${nuevoTesti.tipo==='imagen'?' act':''}`} onClick={() => setNuevoTesti({...nuevoTesti, tipo:'imagen'})}>Imagen</button>
          <button className={`testi-tipo-btn${nuevoTesti.tipo==='video'?' act':''}`} onClick={() => setNuevoTesti({...nuevoTesti, tipo:'video'})}>Video</button>
        </div>

        <div className="field">
          <label>Nombre de la alumna</label>
          <input value={nuevoTesti.nombre} placeholder="Ej: Camila R."
            onChange={e => setNuevoTesti({...nuevoTesti, nombre: e.target.value})}/>
        </div>

        {nuevoTesti.tipo !== 'video' && (
          <div className="field">
            <label>{nuevoTesti.tipo === 'imagen' ? 'Texto opcional (debajo de la imagen)' : 'Testimonio'}</label>
            <textarea value={nuevoTesti.texto} placeholder="Qué dijo la alumna..."
              onChange={e => setNuevoTesti({...nuevoTesti, texto: e.target.value})}/>
          </div>
        )}

        {nuevoTesti.tipo === 'imagen' && (
          <div className="field">
            <label>Imagen o captura</label>
            <div className="testi-upload-box" onClick={() => document.getElementById('testi-img')?.click()}>
              {nuevoTesti.avatar_url ? <img src={nuevoTesti.avatar_url} style={{width:'100%',height:'100px',objectFit:'cover',borderRadius:'8px'}}/> : (subiendoTesti === 'avatar_url' ? 'Subiendo...' : '📷 Tocá para subir')}
            </div>
            <input id="testi-img" type="file" accept="image/*" style={{display:'none'}}
              onChange={e => e.target.files?.[0] && subirArchivoTesti(e.target.files[0], 'avatar_url')}/>
          </div>
        )}

        {nuevoTesti.tipo === 'video' && (
          <div className="field">
            <label>Video</label>
            <div className="testi-upload-box" onClick={() => document.getElementById('testi-video')?.click()}>
              {nuevoTesti.video_url ? '✓ Video cargado' : (subiendoTesti === 'video_url' ? 'Subiendo...' : '🎬 Tocá para subir')}
            </div>
            <input id="testi-video" type="file" accept="video/*" style={{display:'none'}}
              onChange={e => e.target.files?.[0] && subirArchivoTesti(e.target.files[0], 'video_url')}/>
          </div>
        )}

        <button className="btn-add" onClick={agregarTestimonio} disabled={guardandoTesti}>
          <Plus size={11}/>{guardandoTesti ? 'Agregando...' : 'Agregar testimonio'}
        </button>
      </div>

      <div className="bottom-bar">
        {msg && <span style={{fontSize:'12px',color:'#10B981',fontWeight:600}}>{msg}</span>}
        {curso.estado !== 'publicado' && (
          <button onClick={() => guardar('publicado')} disabled={guardando}
            style={{padding:'10px 18px',background:'#DCFCE7',color:'#166534',border:'0.5px solid #86EFAC',borderRadius:'10px',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
            Publicar
          </button>
        )}
        {curso.estado === 'publicado' && (
          <button onClick={() => guardar('archivado')} disabled={guardando}
            style={{padding:'10px 18px',background:'#F1F5F9',color:'#475569',border:'0.5px solid #CBD5E1',borderRadius:'10px',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
            Archivar
          </button>
        )}
        <button onClick={() => guardar()} disabled={guardando}
          style={{padding:'10px 18px',background:'linear-gradient(135deg,#8B5CF6,#7C3AED)',color:'white',border:'none',borderRadius:'10px',fontSize:'13px',fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}