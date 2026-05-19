'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { Search, Plus, X, Tag, Phone, Mail, Calendar, FileText, Edit2, Mic, Image, File, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type Paciente = {
  id: string; nombre: string; apellido: string; celular: string
  email: string; fecha_nacimiento: string; contexto_general: string
  alias: string; etiquetas?: string[]
}
type Sesion = {
  id: string; fecha: string; servicio_nombre: string
  contexto_sesion: string; estado_pago: string; precio: number
}
type Archivo = { id: string; nombre_archivo: string; tipo: string; url: string; created_at: string }
type Nota = { id: string; contenido: string; created_at: string }

function sinTildes(str: string) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

const PAGO_CONFIG: Record<string, { label: string; cls: string }> = {
  pendiente: { label: '⚡ Pendiente', cls: 'tag-p' },
  señado:    { label: '💛 Señado',    cls: 'tag-d' },
  pagado:    { label: '✓ Pagado',     cls: 'tag-ok' },
}

export default function PacientesPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [sesiones, setSesiones] = useState<Record<string, Sesion[]>>({})
  const [archivos, setArchivos] = useState<Record<string, Archivo[]>>({})
  const [notas, setNotas] = useState<Record<string, Nota[]>>({})
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<Paciente | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalNuevo, setModalNuevo] = useState(false)
  const [editando, setEditando] = useState(false)
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [tab, setTab] = useState<'sesiones' | 'archivos' | 'notas'>('sesiones')
  const [contextoLocal, setContextoLocal] = useState('')
  const [nuevaNota, setNuevaNota] = useState('')
  const [subiendoArchivo, setSubiendoArchivo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    nombre: '', apellido: '', celular: '', email: '',
    fecha_nacimiento: '', contexto_general: '', alias: '',
    etiquetas: [] as string[],
  })

  useEffect(() => { cargarDatos() }, [])

  useEffect(() => {
    if (pacienteSeleccionado) {
      setContextoLocal(pacienteSeleccionado.contexto_general || '')
      setTab('sesiones')
    }
  }, [pacienteSeleccionado?.id])

  async function cargarDatos() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: pacs }, { data: sess }, { data: archs }, { data: nots }] = await Promise.all([
        supabase.from('patients').select('*').eq('user_id', user.id).order('nombre'),
        supabase.from('sessions').select('*').eq('user_id', user.id).order('fecha', { ascending: false }),
        supabase.from('files').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('quick_notes').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ])

      if (pacs) setPacientes(pacs)
      if (pacs && sess) {
        const porPac: Record<string, Sesion[]> = {}
        pacs.forEach(p => { porPac[p.id] = sess.filter(s => s.patient_id === p.id) })
        setSesiones(porPac)
      }
      if (pacs && archs) {
        const porPac: Record<string, Archivo[]> = {}
        pacs.forEach(p => { porPac[p.id] = archs.filter(a => a.patient_id === p.id) })
        setArchivos(porPac)
      }
      if (pacs && nots) {
        const porPac: Record<string, Nota[]> = {}
        pacs.forEach(p => { porPac[p.id] = nots.filter(n => n.patient_id === p.id) })
        setNotas(porPac)
      }
    } catch (error) {
      console.error('Error al cargar datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const pacientesFiltrados = useMemo(() => {
    if (!busqueda) return pacientes
    const q = sinTildes(busqueda)
    return pacientes.filter(p =>
      sinTildes(`${p.nombre} ${p.apellido}`).includes(q) ||
      (p.celular && p.celular.includes(busqueda)) ||
      (p.email && sinTildes(p.email).includes(q)) ||
      (p.alias && p.alias.includes(busqueda))
    )
  }, [pacientes, busqueda])

  function abrirNuevo() {
    setForm({ nombre: '', apellido: '', celular: '', email: '', fecha_nacimiento: '', contexto_general: '', alias: '', etiquetas: [] })
    setEditando(false)
    setModalNuevo(true)
  }

  function abrirEditar(p: Paciente) {
    setForm({
      nombre: p.nombre || '', apellido: p.apellido || '', celular: p.celular || '',
      email: p.email || '', fecha_nacimiento: p.fecha_nacimiento || '',
      contexto_general: p.contexto_general || '', alias: p.alias || '',
      etiquetas: p.etiquetas || [],
    })
    setEditando(true)
    setModalNuevo(true)
  }

  function agregarEtiqueta() {
    if (!nuevaEtiqueta.trim()) return
    setForm(prev => ({ ...prev, etiquetas: [...prev.etiquetas, nuevaEtiqueta.trim()] }))
    setNuevaEtiqueta('')
  }

  function quitarEtiqueta(idx: number) {
    setForm(prev => ({ ...prev, etiquetas: prev.etiquetas.filter((_,i) => i !== idx) }))
  }

  async function guardarPaciente() {
    if (!form.nombre) { alert('El nombre es obligatorio'); return }
    setGuardando(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setGuardando(false); return }

      if (editando && pacienteSeleccionado) {
        const { data } = await supabase.from('patients').update({
          nombre: form.nombre, apellido: form.apellido, celular: form.celular,
          email: form.email, fecha_nacimiento: form.fecha_nacimiento || null,
          contexto_general: form.contexto_general,
          alias: form.alias || form.celular?.slice(-4) || '',
        }).eq('id', pacienteSeleccionado.id).select().single()
        if (data) {
          const actualizado = { ...data, etiquetas: form.etiquetas }
          setPacientes(prev => prev.map(p => p.id === data.id ? actualizado : p))
          setPacienteSeleccionado(actualizado)
        }
      } else {
        const { data } = await supabase.from('patients').insert({
          user_id: user.id, nombre: form.nombre, apellido: form.apellido,
          celular: form.celular, email: form.email,
          fecha_nacimiento: form.fecha_nacimiento || null,
          contexto_general: form.contexto_general,
          alias: form.alias || form.celular?.slice(-4) || '',
        }).select().single()
        if (data) {
          const nuevo = { ...data, etiquetas: form.etiquetas }
          setPacientes(prev => [...prev, nuevo])
          setPacienteSeleccionado(nuevo)
          setSesiones(prev => ({ ...prev, [data.id]: [] }))
          setArchivos(prev => ({ ...prev, [data.id]: [] }))
          setNotas(prev => ({ ...prev, [data.id]: [] }))
        }
      }
      setModalNuevo(false)
    } catch (err) {
      console.error('Error guardando paciente:', err)
    } finally {
      setGuardando(false)
    }
  }

  async function guardarContexto(id: string, contexto: string) {
    const supabase = createClient()
    await supabase.from('patients').update({ contexto_general: contexto }).eq('id', id)
    setPacientes(prev => prev.map(p => p.id === id ? { ...p, contexto_general: contexto } : p))
  }

  async function agregarNota() {
    if (!nuevaNota.trim() || !pacienteSeleccionado) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('quick_notes').insert({
      user_id: user.id, patient_id: pacienteSeleccionado.id, contenido: nuevaNota.trim(),
    }).select().single()
    if (data) {
      setNotas(prev => ({ ...prev, [pacienteSeleccionado.id]: [data, ...(prev[pacienteSeleccionado.id] || [])] }))
      setNuevaNota('')
    }
  }

  async function borrarNota(notaId: string) {
    if (!pacienteSeleccionado) return
    const supabase = createClient()
    await supabase.from('quick_notes').delete().eq('id', notaId)
    setNotas(prev => ({ ...prev, [pacienteSeleccionado.id]: (prev[pacienteSeleccionado.id] || []).filter(n => n.id !== notaId) }))
  }

  async function subirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !pacienteSeleccionado) return
    setSubiendoArchivo(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const ext = file.name.split('.').pop()
    const path = `${user.id}/${pacienteSeleccionado.id}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('patient-files').upload(path, file)
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('patient-files').getPublicUrl(path)
      const tipo = file.type.startsWith('image') ? 'imagen' : file.type.includes('pdf') ? 'pdf' : file.type.startsWith('audio') ? 'audio' : 'archivo'
      const { data } = await supabase.from('files').insert({
        user_id: user.id, patient_id: pacienteSeleccionado.id,
        nombre_archivo: file.name, tipo, url: urlData.publicUrl,
      }).select().single()
      if (data) setArchivos(prev => ({ ...prev, [pacienteSeleccionado.id]: [data, ...(prev[pacienteSeleccionado.id] || [])] }))
    }
    setSubiendoArchivo(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function borrarArchivo(archivoId: string) {
    if (!pacienteSeleccionado) return
    const supabase = createClient()
    await supabase.from('files').delete().eq('id', archivoId)
    setArchivos(prev => ({ ...prev, [pacienteSeleccionado.id]: (prev[pacienteSeleccionado.id] || []).filter(a => a.id !== archivoId) }))
  }

  function iconoArchivo(tipo: string) {
    if (tipo === 'imagen') return <Image size={14}/>
    if (tipo === 'audio') return <Mic size={14}/>
    if (tipo === 'pdf') return <FileText size={14}/>
    return <File size={14}/>
  }

  const sesionsPaciente = pacienteSeleccionado ? (sesiones[pacienteSeleccionado.id] || []) : []
  const archivosPaciente = pacienteSeleccionado ? (archivos[pacienteSeleccionado.id] || []) : []
  const notasPaciente = pacienteSeleccionado ? (notas[pacienteSeleccionado.id] || []) : []

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
        .pw{display:grid;grid-template-columns:55% 45%;height:100vh;overflow:hidden;font-family:'Inter',sans-serif;background:var(--bg);padding:14px 16px 14px 14px;gap:14px}
        .pl{display:flex;flex-direction:column;gap:10px;overflow:hidden;background:var(--bg-card);border-radius:22px;padding:18px;height:100%;box-shadow:0 4px 20px var(--shadow);border:0.5px solid var(--border-light)}
        .pr{display:flex;flex-direction:column;gap:0;background:var(--bg-card);border-radius:22px;height:100%;box-shadow:0 8px 32px var(--shadow);border:0.5px solid var(--border-light);overflow:hidden}

        .p-header{display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
        .p-title{font-size:18px;font-weight:800;color:var(--text-primary);letter-spacing:-0.5px;font-family:'Manrope',sans-serif}
        .p-count{font-size:12px;color:var(--text-muted);margin-top:2px}
        .p-new-btn{display:flex;align-items:center;gap:6px;padding:8px 14px;background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:white;border:none;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 4px 12px rgba(139,92,246,0.3);transition:all 0.15s;flex-shrink:0}
        .p-new-btn:hover{box-shadow:0 6px 16px rgba(139,92,246,0.4);transform:translateY(-1px)}

        .sr{position:relative;flex-shrink:0}
        .si{width:100%;padding:9px 34px 9px 12px;border-radius:11px;border:0.5px solid var(--border);font-size:13px;background:var(--bg-input);color:var(--text-primary);outline:none;font-family:inherit}
        .si:focus{border-color:var(--accent)}
        .sico{position:absolute;right:11px;top:50%;transform:translateY(-50%);color:var(--text-muted);pointer-events:none}

        .plist{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:6px;min-height:0;padding:4px 6px;margin-left:-6px;margin-right:-6px}
        .pc{background:var(--bg-card);border-radius:14px;padding:12px 14px;border:none;display:flex;align-items:center;gap:12px;cursor:pointer;flex-shrink:0;transition:all 0.15s;box-shadow:0 2px 12px var(--shadow)}
        .pc:hover{transform:translateY(-1px)}
        .pc.sel{box-shadow:0 6px 20px var(--shadow);transform:translateY(-1px);border:0.5px solid var(--border)}
        .pc-avatar{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--accent-light),#DDD6FE);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--accent);flex-shrink:0}
        .pc-body{flex:1;min-width:0}
        .pc-name{font-size:13px;font-weight:600;color:var(--text-primary);font-family:'Manrope',sans-serif}
        .pc-sub{font-size:11px;color:var(--text-muted);margin-top:1px}
        .pc-tags{display:flex;gap:4px;margin-top:4px;flex-wrap:wrap}
        .pc-tag{font-size:9px;padding:2px 7px;border-radius:20px;background:var(--accent-light);color:var(--accent);border:0.5px solid var(--border)}
        .pc-sessions{font-size:10px;color:var(--text-muted);flex-shrink:0;text-align:right}

        .re{flex:1;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:12px;text-align:center;line-height:2}

        .pr-fixed{padding:18px 20px 14px;flex-shrink:0;border-bottom:0.5px solid var(--border-light)}
        .pr-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}
        .pr-left{display:flex;align-items:center;gap:12px}
        .pr-avatar{width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#8B5CF6,#A78BFA);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:white;flex-shrink:0;box-shadow:0 4px 14px rgba(139,92,246,0.3)}
        .pr-name{font-size:16px;font-weight:800;color:var(--text-primary);letter-spacing:-0.3px;font-family:'Manrope',sans-serif}
        .pr-alias{font-size:11px;color:var(--text-muted);margin-top:1px}
        .pr-edit-btn{display:flex;align-items:center;gap:5px;padding:6px 12px;background:var(--accent-light);color:var(--accent);border:none;border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;transition:all 0.15s;flex-shrink:0}
        .pr-edit-btn:hover{background:var(--accent-hover)}

        .pr-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:10px}
        .pr-info-item{background:var(--bg-input);border-radius:9px;padding:8px 11px;border:0.5px solid var(--border-light)}
        .pr-info-label{font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;display:flex;align-items:center;gap:4px}
        .pr-info-value{font-size:12px;color:var(--text-primary);font-weight:500}

        .ctx-label{font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px}
        .ctx-area{width:100%;padding:9px 11px;border-radius:10px;border:0.5px solid var(--border);font-size:12px;color:var(--text-primary);resize:none;height:70px;font-family:inherit;background:var(--bg-input);outline:none;line-height:1.6}
        .ctx-area:focus{border-color:var(--accent)}

        .pr-etiquetas{display:flex;gap:5px;flex-wrap:wrap;align-items:center;margin-top:8px}
        .pr-tag{font-size:10px;padding:3px 9px;border-radius:20px;background:var(--accent-light);color:var(--accent);border:0.5px solid var(--border)}

        .tabs{display:flex;gap:2px;padding:10px 20px 0;flex-shrink:0;background:var(--bg-card)}
        .tab{padding:8px 14px;border-radius:8px 8px 0 0;font-size:12px;font-weight:600;cursor:pointer;border:none;background:transparent;color:var(--text-muted);font-family:inherit;transition:all 0.15s;border-bottom:2px solid transparent}
        .tab.active{color:var(--accent);border-bottom-color:var(--accent);background:var(--bg-input)}
        .tab:hover{color:var(--accent);background:var(--bg-input)}

        .tab-content{flex:1;overflow-y:auto;padding:14px 20px 16px;display:flex;flex-direction:column;gap:8px;min-height:0}

        .hist-empty{font-size:12px;color:var(--text-muted);text-align:center;padding:20px 0}
        .hist-item{background:var(--bg-input);border-radius:12px;padding:10px 13px;border:0.5px solid var(--border-light);flex-shrink:0}
        .hist-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
        .hist-date{font-size:11px;font-weight:600;color:var(--accent)}
        .hist-serv{font-size:10px;color:var(--text-muted)}
        .hist-ctx{font-size:11px;color:var(--text-secondary);line-height:1.5}
        .hist-badges{display:flex;gap:4px;margin-top:5px;flex-wrap:wrap}
        .hbadge{font-size:9px;padding:2px 7px;border-radius:20px;border:0.5px solid}
        .tag-p{background:#FEF9C3;color:#854D0E;border-color:#FDE68A}
        .tag-ok{background:#DCFCE7;color:#166534;border-color:#BBF7D0}
        .tag-d{background:#DBEAFE;color:#1E40AF;border-color:#BFDBFE}

        .upload-area{border:1.5px dashed var(--border);border-radius:12px;padding:16px;text-align:center;cursor:pointer;transition:all 0.15s;background:var(--bg-input);flex-shrink:0}
        .upload-area:hover{border-color:var(--accent);background:var(--accent-hover)}
        .upload-title{font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:4px}
        .upload-sub{font-size:10px;color:var(--text-muted)}
        .upload-types{display:flex;justify-content:center;gap:8px;margin-top:8px}
        .upload-type{display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text-muted)}
        .arch-item{background:var(--bg-input);border-radius:12px;padding:10px 13px;border:0.5px solid var(--border-light);display:flex;align-items:center;gap:10px;flex-shrink:0}
        .arch-icon{width:32px;height:32px;border-radius:8px;background:var(--accent-light);display:flex;align-items:center;justify-content:center;color:var(--accent);flex-shrink:0}
        .arch-body{flex:1;min-width:0}
        .arch-name{font-size:12px;font-weight:500;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .arch-date{font-size:10px;color:var(--text-muted);margin-top:1px}
        .arch-actions{display:flex;gap:5px}
        .arch-btn{width:26px;height:26px;border-radius:7px;border:0.5px solid var(--border);background:var(--bg-card);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-muted);transition:all 0.15s}
        .arch-btn:hover{border-color:var(--accent);color:var(--accent)}
        .arch-btn.danger:hover{border-color:#EF4444;color:#EF4444;background:#FEF2F2}

        .nota-input-wrap{background:var(--bg-input);border-radius:12px;padding:10px 13px;border:0.5px solid var(--border-light);flex-shrink:0}
        .nota-input{width:100%;border:none;background:transparent;font-size:12px;color:var(--text-primary);outline:none;resize:none;height:60px;font-family:inherit;line-height:1.6}
        .nota-actions{display:flex;justify-content:flex-end;margin-top:6px}
        .nota-save-btn{padding:5px 12px;background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:white;border:none;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit}
        .nota-item{background:var(--bg-input);border-radius:12px;padding:10px 13px;border:0.5px solid var(--border-light);flex-shrink:0}
        .nota-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px}
        .nota-date{font-size:9px;color:var(--text-muted)}
        .nota-del{width:20px;height:20px;border-radius:5px;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-muted);transition:all 0.15s}
        .nota-del:hover{color:#EF4444;background:#FEF2F2}
        .nota-text{font-size:12px;color:var(--text-primary);line-height:1.6;white-space:pre-wrap}

        .mo-overlay{position:fixed;inset:0;background:rgba(26,16,53,0.5);display:flex;align-items:center;justify-content:center;z-index:100;backdrop-filter:blur(4px)}
        .mo-box{background:var(--bg-card);border-radius:22px;padding:24px;width:480px;max-height:90vh;overflow-y:auto;box-shadow:0 32px 80px rgba(100,60,200,0.25)}
        .mo-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
        .mo-title{font-size:15px;font-weight:700;color:var(--text-primary);font-family:'Manrope',sans-serif}
        .mo-close{width:28px;height:28px;border-radius:8px;border:0.5px solid var(--border);background:var(--bg-card);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-muted)}
        .field{display:flex;flex-direction:column;gap:5px;margin-bottom:13px}
        .field label{font-size:12px;font-weight:600;color:var(--text-primary)}
        .field input,.field textarea{padding:9px 11px;border-radius:10px;border:0.5px solid var(--border);font-size:13px;font-family:inherit;color:var(--text-primary);background:var(--bg-input);outline:none;width:100%}
        .field input:focus,.field textarea:focus{border-color:var(--accent)}
        .field textarea{min-height:70px;resize:none}
        .field-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .save-btn{width:100%;padding:11px;background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:white;border:none;border-radius:11px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 4px 14px rgba(139,92,246,0.35);transition:all 0.15s}
        .save-btn:hover{box-shadow:0 6px 20px rgba(139,92,246,0.45);transform:translateY(-1px)}
        .save-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none}
        .tag-input-row{display:flex;gap:6px}
        .tag-input{flex:1;padding:8px 11px;border-radius:10px;border:0.5px solid var(--border);font-size:12px;font-family:inherit;color:var(--text-primary);background:var(--bg-input);outline:none}
        .tag-input:focus{border-color:var(--accent)}
        .tag-add-btn{padding:8px 12px;border-radius:10px;background:var(--accent-light);color:var(--accent);border:none;cursor:pointer;font-size:12px;font-weight:600;font-family:inherit}
        .etiquetas-wrap{display:flex;gap:5px;flex-wrap:wrap;margin-top:6px}
        .etq{display:flex;align-items:center;gap:4px;font-size:11px;padding:3px 8px;border-radius:20px;background:var(--accent-light);color:var(--accent);border:0.5px solid var(--border)}
        .etq-x{cursor:pointer;opacity:0.6;font-size:12px;line-height:1}
        .etq-x:hover{opacity:1}
      `}</style>

      <div className="pw">
        <div className="pl">
          <div className="p-header">
            <div>
              <div className="p-title">Pacientes</div>
              <div className="p-count">{pacientes.length} pacientes en total</div>
            </div>
            <button className="p-new-btn" onClick={abrirNuevo}>
              <Plus size={13}/> Nuevo paciente
            </button>
          </div>

          <div className="sr">
            <input className="si" placeholder="Buscar por nombre, teléfono o alias..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
            <span className="sico"><Search size={13}/></span>
          </div>

          <div className="plist">
            {pacientesFiltrados.length === 0 && (
              <p style={{fontSize:'12px',color:'var(--text-muted)',textAlign:'center',padding:'20px 0'}}>
                {busqueda ? 'No se encontraron pacientes' : 'Todavía no tenés pacientes cargados'}
              </p>
            )}
            {pacientesFiltrados.map(p => {
              const sessPac = sesiones[p.id] || []
              const iniciales = `${p.nombre?.[0]||''}${p.apellido?.[0]||''}`.toUpperCase()
              return (
                <div key={p.id} className={`pc${pacienteSeleccionado?.id===p.id?' sel':''}`}
                  onClick={() => setPacienteSeleccionado(p)}>
                  <div className="pc-avatar">{iniciales||'?'}</div>
                  <div className="pc-body">
                    <div className="pc-name">{p.nombre} {p.apellido}</div>
                    <div className="pc-sub">{p.celular||p.email||'Sin contacto'}</div>
                    {p.etiquetas && p.etiquetas.length > 0 && (
                      <div className="pc-tags">
                        {p.etiquetas.slice(0,3).map((t,i) => <span key={i} className="pc-tag">{t}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="pc-sessions">
                    <div style={{fontSize:'16px',fontWeight:'700',color:'var(--text-primary)',fontFamily:"'Manrope',sans-serif"}}>{sessPac.length}</div>
                    <div>sesiones</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="pr">
          {!pacienteSeleccionado ? (
            <div className="re">Seleccioná un paciente<br/>para ver su perfil</div>
          ) : (<>
            <div className="pr-fixed">
              <div className="pr-top">
                <div className="pr-left">
                  <div className="pr-avatar">
                    {`${pacienteSeleccionado.nombre?.[0]||''}${pacienteSeleccionado.apellido?.[0]||''}`.toUpperCase()||'?'}
                  </div>
                  <div>
                    <div className="pr-name">{pacienteSeleccionado.nombre} {pacienteSeleccionado.apellido}</div>
                    <div className="pr-alias">#{pacienteSeleccionado.alias||pacienteSeleccionado.celular?.slice(-4)||'----'}</div>
                  </div>
                </div>
                <button className="pr-edit-btn" onClick={() => abrirEditar(pacienteSeleccionado)}>
                  <Edit2 size={11}/> Editar
                </button>
              </div>

              <div className="pr-info-grid">
              <div className="pr-info-item">
  <div className="pr-info-label"><Phone size={9}/>Teléfono</div>
  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'6px'}}>
    <div className="pr-info-value">{pacienteSeleccionado.celular||'—'}</div>
    {pacienteSeleccionado.celular && (
      <a href={`https://wa.me/549${pacienteSeleccionado.celular.replace(/\D/g,'')}`}
        target="_blank" rel="noopener noreferrer"
        style={{display:'flex',alignItems:'center',gap:'4px',padding:'4px 9px',background:'#DCFCE7',color:'#166534',borderRadius:'8px',fontSize:'10px',fontWeight:'600',textDecoration:'none',border:'0.5px solid #BBF7D0',whiteSpace:'nowrap',flexShrink:0}}>
        💬 WA
      </a>
    )}
  </div>
</div>
                <div className="pr-info-item">
                  <div className="pr-info-label"><Mail size={9}/>Email</div>
                  <div className="pr-info-value" style={{fontSize:'11px',wordBreak:'break-all'}}>{pacienteSeleccionado.email||'—'}</div>
                </div>
                <div className="pr-info-item">
                  <div className="pr-info-label"><Calendar size={9}/>Cumpleaños</div>
                  <div className="pr-info-value">
                    {pacienteSeleccionado.fecha_nacimiento
                      ? new Date(pacienteSeleccionado.fecha_nacimiento+'T12:00:00').toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'})
                      : '—'}
                  </div>
                </div>
                <div className="pr-info-item">
                  <div className="pr-info-label"><FileText size={9}/>Sesiones</div>
                  <div className="pr-info-value">{sesionsPaciente.length} en total</div>
                </div>
              </div>

              {pacienteSeleccionado.etiquetas && pacienteSeleccionado.etiquetas.length > 0 && (
                <div className="pr-etiquetas">
                  <Tag size={10} color="var(--text-muted)"/>
                  {pacienteSeleccionado.etiquetas.map((t,i) => <span key={i} className="pr-tag">{t}</span>)}
                </div>
              )}

              <div style={{marginTop:'10px'}}>
                <div className="ctx-label">Contexto general</div>
                <textarea key={pacienteSeleccionado.id} className="ctx-area"
                  value={contextoLocal}
                  onChange={e => setContextoLocal(e.target.value)}
                  onBlur={() => guardarContexto(pacienteSeleccionado.id, contextoLocal)}
                  placeholder="Anotá el contexto general de este paciente..."/>
              </div>
            </div>

            <div className="tabs">
              {(['sesiones','archivos','notas'] as const).map(t => (
                <button key={t} className={`tab${tab===t?' active':''}`} onClick={() => setTab(t)}>
                  {t === 'sesiones' ? `Sesiones (${sesionsPaciente.length})` : t === 'archivos' ? `Archivos (${archivosPaciente.length})` : `Notas (${notasPaciente.length})`}
                </button>
              ))}
            </div>

            <div className="tab-content">
              {tab === 'sesiones' && (<>
                {sesionsPaciente.length === 0 && <div className="hist-empty">Este paciente aún no tiene sesiones registradas</div>}
                {sesionsPaciente.map((s,i) => (
                  <div key={i} className="hist-item">
                    <div className="hist-top">
                      <span className="hist-date">{new Date(s.fecha).toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'})}</span>
                      <span className="hist-serv">{s.servicio_nombre}</span>
                    </div>
                    {s.contexto_sesion && <div className="hist-ctx">{s.contexto_sesion}</div>}
                    <div className="hist-badges">
                      <span className={`hbadge ${PAGO_CONFIG[s.estado_pago]?.cls||'tag-p'}`}>
                        {PAGO_CONFIG[s.estado_pago]?.label||s.estado_pago}
                      </span>
                      {s.precio > 0 && (
                        <span className="hbadge" style={{background:'var(--accent-light)',color:'var(--accent)',borderColor:'var(--border)'}}>
                          ${s.precio.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </>)}

              {tab === 'archivos' && (<>
                <input ref={fileInputRef} type="file" accept="image/*,audio/*,.pdf,.doc,.docx"
                  style={{display:'none'}} onChange={subirArchivo}/>
                <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
                  {subiendoArchivo ? (
                    <div style={{fontSize:'12px',color:'var(--text-secondary)'}}>Subiendo archivo...</div>
                  ) : (<>
                    <div className="upload-title">Subir archivo</div>
                    <div className="upload-sub">Hacé click para seleccionar</div>
                    <div className="upload-types">
                      <span className="upload-type"><Image size={11}/>Imagen</span>
                      <span className="upload-type"><Mic size={11}/>Audio</span>
                      <span className="upload-type"><FileText size={11}/>PDF</span>
                      <span className="upload-type"><File size={11}/>Archivo</span>
                    </div>
                  </>)}
                </div>
                {archivosPaciente.length === 0 && <div className="hist-empty">No hay archivos subidos para este paciente</div>}
                {archivosPaciente.map(a => (
                  <div key={a.id} className="arch-item">
                    <div className="arch-icon">{iconoArchivo(a.tipo)}</div>
                    <div className="arch-body">
                      <div className="arch-name">{a.nombre_archivo}</div>
                      <div className="arch-date">{new Date(a.created_at).toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'})}</div>
                    </div>
                    <div className="arch-actions">
                      <a href={a.url} target="_blank" rel="noopener noreferrer">
                        <div className="arch-btn"><File size={11}/></div>
                      </a>
                      <div className="arch-btn danger" onClick={() => borrarArchivo(a.id)}>
                        <Trash2 size={11}/>
                      </div>
                    </div>
                  </div>
                ))}
              </>)}

              {tab === 'notas' && (<>
                <div className="nota-input-wrap">
                  <textarea className="nota-input"
                    placeholder="Escribí una nota rápida sobre este paciente..."
                    value={nuevaNota} onChange={e => setNuevaNota(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) agregarNota() }}/>
                  <div className="nota-actions">
                    <button className="nota-save-btn" onClick={agregarNota}>Guardar nota</button>
                  </div>
                </div>
                {notasPaciente.length === 0 && <div className="hist-empty">No hay notas para este paciente</div>}
                {notasPaciente.map(n => (
                  <div key={n.id} className="nota-item">
                    <div className="nota-top">
                      <span className="nota-date">{new Date(n.created_at).toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'})}</span>
                      <button className="nota-del" onClick={() => borrarNota(n.id)}><X size={10}/></button>
                    </div>
                    <div className="nota-text">{n.contenido}</div>
                  </div>
                ))}
              </>)}
            </div>
          </>)}
        </div>
      </div>

      {modalNuevo && (
        <div className="mo-overlay" onClick={() => setModalNuevo(false)}>
          <div className="mo-box" onClick={e => e.stopPropagation()}>
            <div className="mo-hdr">
              <span className="mo-title">{editando ? 'Editar paciente' : 'Nuevo paciente'}</span>
              <button className="mo-close" onClick={() => setModalNuevo(false)}><X size={12}/></button>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Nombre</label>
                <input placeholder="Ej: María" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}/>
              </div>
              <div className="field">
                <label>Apellido</label>
                <input placeholder="Ej: López" value={form.apellido} onChange={e => setForm({...form, apellido: e.target.value})}/>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Celular</label>
                <input placeholder="Ej: 2236789012" value={form.celular} onChange={e => setForm({...form, celular: e.target.value})}/>
              </div>
              <div className="field">
                <label>Email</label>
                <input type="email" placeholder="Ej: maria@email.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})}/>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Fecha de nacimiento</label>
                <input type="date" value={form.fecha_nacimiento} onChange={e => setForm({...form, fecha_nacimiento: e.target.value})}/>
              </div>
              <div className="field">
                <label>Alias</label>
                <input placeholder="Ej: 7890" value={form.alias} onChange={e => setForm({...form, alias: e.target.value})}/>
              </div>
            </div>
            <div className="field">
              <label>Contexto general</label>
              <textarea placeholder="Información importante sobre este paciente..."
                value={form.contexto_general} onChange={e => setForm({...form, contexto_general: e.target.value})}/>
            </div>
            <div className="field">
              <label>Etiquetas</label>
              <div className="tag-input-row">
                <input className="tag-input" placeholder="Ej: tarot, coaching, reiki..."
                  value={nuevaEtiqueta} onChange={e => setNuevaEtiqueta(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregarEtiqueta() }}}/>
                <button className="tag-add-btn" onClick={agregarEtiqueta}>+ Agregar</button>
              </div>
              {form.etiquetas.length > 0 && (
                <div className="etiquetas-wrap">
                  {form.etiquetas.map((t,i) => (
                    <span key={i} className="etq">
                      {t}<span className="etq-x" onClick={() => quitarEtiqueta(i)}>×</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button className="save-btn" onClick={guardarPaciente} disabled={guardando}>
              {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear paciente'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}