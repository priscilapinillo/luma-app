'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Plus, Edit2, Trash2, X, Check, GraduationCap } from 'lucide-react'

type Opcion = { id: string; texto: string; es_correcta: boolean; orden: number }
type Pregunta = { id: string; pregunta: string; tipo: string; orden: number; opciones?: Opcion[] }
type Examen = { id: string; titulo: string; puntaje_minimo: number; max_intentos: number }

export default function CourseExamTab({ cursoId }: { cursoId: string }) {
  const [examen, setExamen] = useState<Examen | null>(null)
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [loading, setLoading] = useState(true)
  const [creandoExamen, setCreandoExamen] = useState(false)

  const [editandoConfig, setEditandoConfig] = useState(false)
  const [formConfig, setFormConfig] = useState({ titulo: 'Examen final', puntaje_minimo: 60, max_intentos: 3 })
  const [guardandoConfig, setGuardandoConfig] = useState(false)

  const [modalPregunta, setModalPregunta] = useState(false)
  const [editandoPregunta, setEditandoPregunta] = useState<Pregunta | null>(null)
  const [formPregunta, setFormPregunta] = useState('')
  const [formTipo, setFormTipo] = useState<'opcion_multiple' | 'verdadero_falso'>('opcion_multiple')
  const [formOpciones, setFormOpciones] = useState<{texto: string; es_correcta: boolean}[]>([
    { texto: '', es_correcta: false }, { texto: '', es_correcta: false },
  ])
  const [guardandoPregunta, setGuardandoPregunta] = useState(false)

  useEffect(() => { cargarExamen() }, [cursoId])

  async function cargarExamen() {
    try {
      const supabase = createClient()
      const { data: ex } = await supabase.from('exams').select('*').eq('course_id', cursoId).maybeSingle()
      if (!ex) { setExamen(null); setLoading(false); return }
      setExamen(ex)
      setFormConfig({ titulo: ex.titulo, puntaje_minimo: ex.puntaje_minimo, max_intentos: ex.max_intentos })

      const { data: preg } = await supabase.from('exam_questions').select('*').eq('exam_id', ex.id).order('orden')
      if (preg) {
        const { data: opts } = await supabase.from('exam_options').select('*')
          .in('question_id', preg.map(p => p.id)).order('orden')
        setPreguntas(preg.map(p => ({ ...p, opciones: opts?.filter(o => o.question_id === p.id) || [] })))
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function crearExamen() {
    setCreandoExamen(true)
    try {
      const supabase = createClient()
      const { data } = await supabase.from('exams').insert({
        course_id: cursoId, titulo: 'Examen final', puntaje_minimo: 60, max_intentos: 3,
      }).select().single()
      if (data) { setExamen(data); setFormConfig({ titulo: data.titulo, puntaje_minimo: data.puntaje_minimo, max_intentos: data.max_intentos }) }
    } catch (err) { console.error(err) }
    finally { setCreandoExamen(false) }
  }

  async function guardarConfig() {
    if (!examen) return
    setGuardandoConfig(true)
    try {
      const supabase = createClient()
      const { data } = await supabase.from('exams').update({
        titulo: formConfig.titulo,
        puntaje_minimo: Number(formConfig.puntaje_minimo),
        max_intentos: Number(formConfig.max_intentos),
      }).eq('id', examen.id).select().single()
      if (data) setExamen(data)
      setEditandoConfig(false)
    } catch (err) { console.error(err) }
    finally { setGuardandoConfig(false) }
  }

  function abrirNuevaPregunta() {
    setEditandoPregunta(null)
    setFormPregunta('')
    setFormTipo('opcion_multiple')
    setFormOpciones([{ texto: '', es_correcta: false }, { texto: '', es_correcta: false }])
    setModalPregunta(true)
  }

  function abrirEditarPregunta(p: Pregunta) {
    setEditandoPregunta(p)
    setFormPregunta(p.pregunta)
    setFormTipo(p.tipo as 'opcion_multiple' | 'verdadero_falso')
    if (p.tipo === 'verdadero_falso') {
      setFormOpciones([
        { texto: 'Verdadero', es_correcta: p.opciones?.find(o => o.texto === 'Verdadero')?.es_correcta || false },
        { texto: 'Falso', es_correcta: p.opciones?.find(o => o.texto === 'Falso')?.es_correcta || false },
      ])
    } else {
      setFormOpciones((p.opciones || []).map(o => ({ texto: o.texto, es_correcta: o.es_correcta })))
    }
    setModalPregunta(true)
  }

  function cambiarTipo(tipo: 'opcion_multiple' | 'verdadero_falso') {
    setFormTipo(tipo)
    if (tipo === 'verdadero_falso') {
      setFormOpciones([{ texto: 'Verdadero', es_correcta: true }, { texto: 'Falso', es_correcta: false }])
    } else {
      setFormOpciones([{ texto: '', es_correcta: false }, { texto: '', es_correcta: false }])
    }
  }

  function marcarCorrecta(idx: number) {
    setFormOpciones(prev => prev.map((o, i) => ({ ...o, es_correcta: i === idx })))
  }

  function editarTextoOpcion(idx: number, texto: string) {
    setFormOpciones(prev => prev.map((o, i) => i === idx ? { ...o, texto } : o))
  }

  function agregarOpcion() {
    setFormOpciones(prev => [...prev, { texto: '', es_correcta: false }])
  }

  function quitarOpcion(idx: number) {
    setFormOpciones(prev => prev.filter((_, i) => i !== idx))
  }

  async function guardarPregunta() {
    if (!examen || !formPregunta.trim()) return
    if (formOpciones.filter(o => o.texto.trim()).length < 2) return
    if (!formOpciones.some(o => o.es_correcta)) return
    setGuardandoPregunta(true)
    try {
      const supabase = createClient()
      let questionId = editandoPregunta?.id

      if (editandoPregunta) {
        await supabase.from('exam_questions').update({ pregunta: formPregunta, tipo: formTipo }).eq('id', editandoPregunta.id)
        await supabase.from('exam_options').delete().eq('question_id', editandoPregunta.id)
      } else {
        const { data: nueva } = await supabase.from('exam_questions').insert({
          exam_id: examen.id, pregunta: formPregunta, tipo: formTipo, orden: preguntas.length,
        }).select().single()
        questionId = nueva?.id
      }

      if (questionId) {
        const opcionesValidas = formOpciones.filter(o => o.texto.trim())
        await supabase.from('exam_options').insert(
          opcionesValidas.map((o, i) => ({ question_id: questionId, texto: o.texto.trim(), es_correcta: o.es_correcta, orden: i }))
        )
      }

      await cargarExamen()
      setModalPregunta(false)
    } catch (err) { console.error(err) }
    finally { setGuardandoPregunta(false) }
  }

  async function eliminarPregunta(id: string) {
    if (!confirm('¿Eliminar esta pregunta?')) return
    const supabase = createClient()
    await supabase.from('exam_questions').delete().eq('id', id)
    await cargarExamen()
  }

  if (loading) return <div style={{padding:'40px',textAlign:'center',color:'var(--text-muted)'}}>Cargando...</div>

  if (!examen) return (
    <div style={{padding:'48px 20px',textAlign:'center'}}>
      <GraduationCap size={32} color="var(--text-muted)" style={{marginBottom:'12px'}}/>
      <div style={{fontSize:'14px',fontWeight:600,color:'var(--text-primary)',marginBottom:'6px'}}>Este curso todavía no tiene examen</div>
      <p style={{fontSize:'12px',color:'var(--text-muted)',marginBottom:'20px'}}>Se desbloquea para la alumna cuando completa el 100% de las lecciones.</p>
      <button onClick={crearExamen} disabled={creandoExamen}
        style={{padding:'10px 20px',background:'linear-gradient(135deg,#8B5CF6,#7C3AED)',color:'white',border:'none',borderRadius:'10px',fontSize:'13px',fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
        {creandoExamen ? 'Creando...' : '+ Crear examen'}
      </button>
    </div>
  )

  return (
    <div style={{padding:'20px',maxWidth:'720px'}}>
      <style>{`
        .field{display:flex;flex-direction:column;gap:4px;margin-bottom:12px}
        .field label{font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px}
        .field input,.field select{padding:9px 12px;border-radius:10px;border:0.5px solid var(--border);font-size:13px;font-family:inherit;color:var(--text-primary);background:var(--bg-input);outline:none;width:100%}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px}
        .modal-box{background:var(--bg-card);border-radius:20px;padding:24px;width:100%;max-width:480px;max-height:80vh;overflow-y:auto}
        .pregunta-card{background:var(--bg-card);border:0.5px solid var(--border-light);border-radius:14px;padding:14px 16px;margin-bottom:10px}
        .opcion-row{display:flex;align-items:center;gap:8px;margin-top:8px}
        .opcion-radio{width:16px;height:16px;border-radius:50%;border:1.5px solid var(--border);flex-shrink:0;cursor:pointer;display:flex;align-items:center;justify-content:center}
        .opcion-radio.sel{border-color:#10B981;background:#10B981}
      `}</style>

      <div className="pregunta-card" style={{marginBottom:'20px'}}>
        {!editandoConfig ? (
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontSize:'14px',fontWeight:700,color:'var(--text-primary)'}}>{examen.titulo}</div>
              <div style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'2px'}}>
                Aprueba con {examen.puntaje_minimo}% · {examen.max_intentos} intento{examen.max_intentos !== 1 ? 's' : ''}
              </div>
            </div>
            <button onClick={() => setEditandoConfig(true)}
              style={{width:'28px',height:'28px',borderRadius:'8px',border:'0.5px solid var(--border)',background:'var(--bg-input)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Edit2 size={12} color="var(--text-muted)"/>
            </button>
          </div>
        ) : (
          <>
            <div className="field"><label>Título del examen</label>
              <input value={formConfig.titulo} onChange={e => setFormConfig({...formConfig, titulo: e.target.value})}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
              <div className="field"><label>% para aprobar</label>
                <input type="number" min="1" max="100" value={formConfig.puntaje_minimo}
                  onChange={e => setFormConfig({...formConfig, puntaje_minimo: Number(e.target.value)})}/>
              </div>
              <div className="field"><label>Intentos permitidos</label>
                <input type="number" min="1" value={formConfig.max_intentos}
                  onChange={e => setFormConfig({...formConfig, max_intentos: Number(e.target.value)})}/>
              </div>
            </div>
            <div style={{display:'flex',gap:'8px'}}>
              <button onClick={() => setEditandoConfig(false)}
                style={{padding:'8px 14px',borderRadius:'8px',border:'0.5px solid var(--border)',background:'transparent',fontSize:'12px',cursor:'pointer',fontFamily:'inherit',color:'var(--text-secondary)'}}>
                Cancelar
              </button>
              <button onClick={guardarConfig} disabled={guardandoConfig}
                style={{padding:'8px 14px',borderRadius:'8px',border:'none',background:'#8B5CF6',color:'white',fontSize:'12px',fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                {guardandoConfig ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </>
        )}
      </div>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
        <div style={{fontSize:'13px',color:'var(--text-muted)'}}>{preguntas.length} pregunta{preguntas.length !== 1 ? 's' : ''}</div>
        <button onClick={abrirNuevaPregunta}
          style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 14px',background:'linear-gradient(135deg,#8B5CF6,#7C3AED)',color:'white',border:'none',borderRadius:'10px',fontSize:'12px',fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
          <Plus size={12}/>Agregar pregunta
        </button>
      </div>

      {preguntas.length === 0 && (
        <div style={{textAlign:'center',padding:'32px 20px',color:'var(--text-muted)',fontSize:'12px'}}>
          Todavía no cargaste ninguna pregunta.
        </div>
      )}

      {preguntas.map((p, idx) => (
        <div key={p.id} className="pregunta-card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'10px'}}>
            <div style={{fontSize:'13px',fontWeight:600,color:'var(--text-primary)'}}>{idx + 1}. {p.pregunta}</div>
            <div style={{display:'flex',gap:'6px',flexShrink:0}}>
              <div onClick={() => abrirEditarPregunta(p)}
                style={{width:'24px',height:'24px',borderRadius:'7px',border:'0.5px solid var(--border)',background:'var(--bg-input)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Edit2 size={10} color="var(--text-muted)"/>
              </div>
              <div onClick={() => eliminarPregunta(p.id)}
                style={{width:'24px',height:'24px',borderRadius:'7px',border:'0.5px solid var(--border)',background:'var(--bg-input)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Trash2 size={10} color="#EF4444"/>
              </div>
            </div>
          </div>
          {p.opciones?.map(o => (
            <div key={o.id} style={{fontSize:'12px',color:o.es_correcta ? '#166534' : 'var(--text-muted)',fontWeight:o.es_correcta ? 700 : 400,marginTop:'4px'}}>
              {o.es_correcta ? '✓' : '○'} {o.texto}
            </div>
          ))}
        </div>
      ))}

      {/* MODAL PREGUNTA */}
      {modalPregunta && (
        <div className="modal-overlay" onClick={() => setModalPregunta(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <div style={{fontSize:'15px',fontWeight:700,color:'var(--text-primary)'}}>{editandoPregunta ? 'Editar pregunta' : 'Nueva pregunta'}</div>
              <button onClick={() => setModalPregunta(false)} style={{background:'transparent',border:'none',cursor:'pointer'}}><X size={16} color="var(--text-muted)"/></button>
            </div>

            <div className="field">
              <label>Pregunta *</label>
              <input value={formPregunta} placeholder="Ej: ¿Cuántos Arcanos Mayores tiene el Tarot?"
                onChange={e => setFormPregunta(e.target.value)}/>
            </div>

            <div className="field">
              <label>Tipo</label>
              <select value={formTipo} onChange={e => cambiarTipo(e.target.value as any)}>
                <option value="opcion_multiple">Opción múltiple</option>
                <option value="verdadero_falso">Verdadero / Falso</option>
              </select>
            </div>

            <div className="field">
              <label>Opciones — tocá el círculo para marcar la correcta</label>
              {formOpciones.map((o, i) => (
                <div key={i} className="opcion-row">
                  <div className={`opcion-radio${o.es_correcta ? ' sel' : ''}`} onClick={() => marcarCorrecta(i)}>
                    {o.es_correcta && <Check size={9} color="white"/>}
                  </div>
                  <input value={o.texto} placeholder={`Opción ${i + 1}`}
                    disabled={formTipo === 'verdadero_falso'}
                    onChange={e => editarTextoOpcion(i, e.target.value)}
                    style={{flex:1}}/>
                  {formTipo === 'opcion_multiple' && formOpciones.length > 2 && (
                    <button onClick={() => quitarOpcion(i)} style={{background:'transparent',border:'none',cursor:'pointer',color:'#EF4444',flexShrink:0}}>
                      <X size={14}/>
                    </button>
                  )}
                </div>
              ))}
              {formTipo === 'opcion_multiple' && (
                <button onClick={agregarOpcion} type="button"
                  style={{marginTop:'8px',fontSize:'11px',color:'var(--accent)',background:'transparent',border:'0.5px solid var(--accent)',borderRadius:'8px',padding:'5px 10px',cursor:'pointer',fontFamily:'inherit',width:'fit-content'}}>
                  <Plus size={10} style={{display:'inline',marginRight:'4px'}}/>Agregar opción
                </button>
              )}
            </div>

            <button onClick={guardarPregunta} disabled={guardandoPregunta}
              style={{width:'100%',padding:'12px',background:'linear-gradient(135deg,#8B5CF6,#7C3AED)',color:'white',border:'none',borderRadius:'10px',fontSize:'13px',fontWeight:700,cursor:'pointer',fontFamily:'inherit',marginTop:'8px'}}>
              {guardandoPregunta ? 'Guardando...' : editandoPregunta ? 'Guardar cambios' : 'Agregar pregunta'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}