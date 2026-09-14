'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, X } from 'lucide-react'

export default function NewCoursePage() {
  const router = useRouter()
  const [guardando, setGuardando] = useState(false)
  const [subiendoImagen, setSubiendoImagen] = useState(false)

async function subirImagen(file: File) {
  if (!file) return
  setSubiendoImagen(true)
  try {
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const nombre = `${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('course-images')
      .upload(nombre, file, { upsert: true })
    if (error) { console.error(error); return }
    const { data } = supabase.storage.from('course-images').getPublicUrl(nombre)
    setForm(prev => ({ ...prev, imagen_url: data.publicUrl }))
  } catch (err) {
    console.error(err)
  } finally {
    setSubiendoImagen(false)
  }
}
  const [form, setForm] = useState({
    titulo: '',
    slug: '',
    descripcion_corta: '',
    descripcion_larga: '',
    imagen_url: '',
    video_presentacion_url: '',
    precio: 0,
    precio_original: '' as string | number,
    modalidad: 'unico',
    nivel: 'principiante',
    idioma: 'Español',
    duracion_estimada_horas: '' as string | number,
    politica_reembolso: '',
    dias_garantia: '' as string | number,
    para_quien: [''] as string[],
    que_aprenderas: [''] as string[],
    requisitos: [''] as string[],
  })

  function generarSlug(titulo: string) {
    return titulo.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 60)
  }

  async function guardar(estado: 'borrador' | 'publicado') {
    if (!form.titulo) { alert('El título es obligatorio'); return }
    setGuardando(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase.from('courses').insert({
        user_id: user.id,
        titulo: form.titulo,
        slug: form.slug || generarSlug(form.titulo),
        descripcion_corta: form.descripcion_corta || null,
        descripcion_larga: form.descripcion_larga || null,
        imagen_url: form.imagen_url || null,
        video_presentacion_url: form.video_presentacion_url || null,
        precio: Number(form.precio) || 0,
        precio_original: form.precio_original ? Number(form.precio_original) : null,
        modalidad: form.modalidad,
        nivel: form.nivel,
        idioma: form.idioma,
        duracion_estimada_horas: form.duracion_estimada_horas ? Number(form.duracion_estimada_horas) : null,
        politica_reembolso: form.politica_reembolso || null,
        dias_garantia: form.dias_garantia ? Number(form.dias_garantia) : null,
        para_quien: form.para_quien.filter(x => x.trim()),
        que_aprenderas: form.que_aprenderas.filter(x => x.trim()),
        requisitos: form.requisitos.filter(x => x.trim()),
        estado,
      }).select().single()

      if (error) { console.error(error); alert('Error al guardar'); return }
      router.push(`/courses/${data.id}`)
    } catch (err) {
      console.error(err)
    } finally {
      setGuardando(false)
    }
  }

  function agregarItem(campo: 'para_quien' | 'que_aprenderas' | 'requisitos') {
    setForm(prev => ({ ...prev, [campo]: [...prev[campo], ''] }))
  }

  function editarItem(campo: 'para_quien' | 'que_aprenderas' | 'requisitos', idx: number, valor: string) {
    setForm(prev => {
      const nuevo = [...prev[campo]]
      nuevo[idx] = valor
      return { ...prev, [campo]: nuevo }
    })
  }

  function eliminarItem(campo: 'para_quien' | 'que_aprenderas' | 'requisitos', idx: number) {
    setForm(prev => ({ ...prev, [campo]: prev[campo].filter((_, i) => i !== idx) }))
  }

  return (
    <div style={{padding:'20px',maxWidth:'720px',margin:'0 auto',paddingBottom:'80px'}}>
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
        .bottom-bar{position:fixed;bottom:0;left:200px;right:0;background:var(--bg-card);border-top:0.5px solid var(--border-light);padding:12px 20px;display:flex;gap:10px;justify-content:flex-end;z-index:100}
      `}</style>

      {/* HEADER */}
      <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'24px'}}>
        <button onClick={() => router.push('/courses')}
          style={{width:'36px',height:'36px',borderRadius:'10px',border:'0.5px solid var(--border)',background:'var(--bg-input)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <ArrowLeft size={16} color="var(--text-muted)"/>
        </button>
        <div>
          <h1 style={{fontSize:'18px',fontWeight:800,color:'var(--text-primary)',fontFamily:'Manrope,sans-serif'}}>Nuevo curso</h1>
          <p style={{fontSize:'12px',color:'var(--text-muted)'}}>Podés guardar como borrador y publicar después</p>
        </div>
      </div>

      {/* INFO BÁSICA */}
      <div className="section-title">Información básica</div>

      <div className="field">
        <label>Título del curso *</label>
        <input value={form.titulo} placeholder="Ej: Tarot para principiantes"
          onChange={e => setForm({...form, titulo: e.target.value, slug: generarSlug(e.target.value)})}/>
      </div>

      <div className="field">
        <label>Descripción corta</label>
        <textarea value={form.descripcion_corta} placeholder="Aparece en la card del curso en tu página pública (máx 150 caracteres)"
          maxLength={150}
          onChange={e => setForm({...form, descripcion_corta: e.target.value})}/>
        <span className="field-hint">{form.descripcion_corta.length}/150</span>
      </div>

      <div className="field">
        <label>Descripción completa</label>
        <textarea value={form.descripcion_larga} placeholder="Contá en detalle de qué trata el curso, qué incluye y por qué vale la pena."
          style={{minHeight:'120px'}}
          onChange={e => setForm({...form, descripcion_larga: e.target.value})}/>
      </div>

      <div className="field">
        <label>Imagen de portada</label>
        <div style={{border:'0.5px dashed var(--border)',borderRadius:'12px',padding:'20px',textAlign:'center',background:'var(--bg-input)',cursor:'pointer',position:'relative'}}
          onClick={() => document.getElementById('img-curso')?.click()}>
          {form.imagen_url
            ? <img src={form.imagen_url} alt="portada" style={{width:'100%',height:'160px',objectFit:'cover',borderRadius:'8px'}}/>
            : <div style={{color:'var(--text-muted)',fontSize:'13px'}}>
                {subiendoImagen ? 'Subiendo...' : '📷 Tocá para subir una imagen'}
                <div style={{fontSize:'10px',marginTop:'4px'}}>JPG, PNG o WEBP · Recomendado 1280x720px</div>
              </div>
          }
          <input id="img-curso" type="file" accept="image/*" style={{display:'none'}}
            onChange={e => e.target.files?.[0] && subirImagen(e.target.files[0])}/>
        </div>
        {form.imagen_url && (
          <button onClick={() => setForm({...form, imagen_url: ''})}
            style={{fontSize:'11px',color:'#EF4444',background:'transparent',border:'none',cursor:'pointer',marginTop:'4px',fontFamily:'inherit'}}>
            × Eliminar imagen
          </button>
        )}
      </div>

      <div className="field">
        <label>Video de presentación (YouTube)</label>
        <input value={form.video_presentacion_url} placeholder="https://youtube.com/watch?v=..."
          onChange={e => setForm({...form, video_presentacion_url: e.target.value})}/>
      </div>

      {/* PRECIO */}
      <div className="section-title">Precio y modalidad</div>

      <div className="precio-row">
        <div className="field">
          <label>Precio actual *</label>
          <input type="number" min="0" value={form.precio}
            onChange={e => setForm({...form, precio: Number(e.target.value)})}/>
        </div>
        <div className="field">
          <label>Precio original (opcional)</label>
          <input type="number" min="0" value={form.precio_original}
            placeholder="Para mostrar como OFERTA"
            onChange={e => setForm({...form, precio_original: e.target.value})}/>
        </div>
      </div>

      <div className="field">
        <label>Modalidad de venta</label>
        <select value={form.modalidad} onChange={e => setForm({...form, modalidad: e.target.value})}>
          <option value="unico">Pago único — acceso para siempre</option>
          <option value="suscripcion">Suscripción mensual</option>
        </select>
      </div>

      {/* DETALLES */}
      <div className="section-title">Detalles del curso</div>

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
          <input type="number" min="0" step="0.5" value={form.duracion_estimada_horas}
            placeholder="Ej: 4.5"
            onChange={e => setForm({...form, duracion_estimada_horas: e.target.value})}/>
        </div>
      </div>

      {/* PARA QUIÉN ES */}
      <div className="section-title">Para quién es este curso</div>
      {form.para_quien.map((item, i) => (
        <div key={i} className="bullet-item">
          <input value={item} placeholder="Ej: Para vos si querés aprender tarot desde cero"
            onChange={e => editarItem('para_quien', i, e.target.value)}/>
          {form.para_quien.length > 1 && (
            <button className="btn-remove" onClick={() => eliminarItem('para_quien', i)}><X size={10}/></button>
          )}
        </div>
      ))}
      <button className="btn-add" onClick={() => agregarItem('para_quien')}><Plus size={11}/>Agregar</button>

      {/* QUÉ VAS A APRENDER */}
      <div className="section-title">Qué vas a aprender</div>
      {form.que_aprenderas.map((item, i) => (
        <div key={i} className="bullet-item">
          <input value={item} placeholder="Ej: Leer las 78 cartas del tarot"
            onChange={e => editarItem('que_aprenderas', i, e.target.value)}/>
          {form.que_aprenderas.length > 1 && (
            <button className="btn-remove" onClick={() => eliminarItem('que_aprenderas', i)}><X size={10}/></button>
          )}
        </div>
      ))}
      <button className="btn-add" onClick={() => agregarItem('que_aprenderas')}><Plus size={11}/>Agregar</button>

      {/* REQUISITOS */}
      <div className="section-title">Requisitos previos</div>
      {form.requisitos.map((item, i) => (
        <div key={i} className="bullet-item">
          <input value={item} placeholder="Ej: No necesitás experiencia previa"
            onChange={e => editarItem('requisitos', i, e.target.value)}/>
          {form.requisitos.length > 1 && (
            <button className="btn-remove" onClick={() => eliminarItem('requisitos', i)}><X size={10}/></button>
          )}
        </div>
      ))}
      <button className="btn-add" onClick={() => agregarItem('requisitos')}><Plus size={11}/>Agregar</button>

      {/* GARANTÍA */}
      <div className="section-title">Garantía y reembolsos</div>
      <div className="precio-row">
        <div className="field">
          <label>Días de garantía</label>
          <input type="number" min="0" value={form.dias_garantia}
            placeholder="Ej: 7"
            onChange={e => setForm({...form, dias_garantia: e.target.value})}/>
        </div>
        <div className="field">
          <label>Política de reembolso</label>
          <input value={form.politica_reembolso}
            placeholder="Ej: Reembolso completo en 7 días"
            onChange={e => setForm({...form, politica_reembolso: e.target.value})}/>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="bottom-bar">
        <button onClick={() => router.push('/courses')}
          style={{padding:'10px 18px',background:'transparent',color:'var(--text-muted)',border:'0.5px solid var(--border)',borderRadius:'10px',fontSize:'13px',cursor:'pointer',fontFamily:'inherit'}}>
          Cancelar
        </button>
        <button onClick={() => guardar('borrador')} disabled={guardando}
          style={{padding:'10px 18px',background:'var(--bg-input)',color:'var(--text-primary)',border:'0.5px solid var(--border)',borderRadius:'10px',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
          Guardar borrador
        </button>
        <button onClick={() => guardar('publicado')} disabled={guardando}
          style={{padding:'10px 18px',background:'linear-gradient(135deg,#8B5CF6,#7C3AED)',color:'white',border:'none',borderRadius:'10px',fontSize:'13px',fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 14px rgba(139,92,246,0.35)'}}>
          {guardando ? 'Guardando...' : 'Publicar curso'}
        </button>
      </div>
    </div>
  )
}