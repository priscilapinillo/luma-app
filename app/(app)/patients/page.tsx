'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { Search, Plus, X, Tag, Phone, Mail, Calendar, FileText, Edit2, Trash2, Pencil } from 'lucide-react'
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
type SessionNote = { id: string; titulo: string; contenido: string | null; archivo_url: string | null; archivo_tipo: string | null; archivo_nombre: string | null; created_at: string; session_id: string | null }

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
  const [sessionNotes, setSessionNotes] = useState<Record<string, SessionNote[]>>({})
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<Paciente | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalNuevo, setModalNuevo] = useState(false)
  const [editando, setEditando] = useState(false)
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [tab, setTab] = useState<'sesiones' | 'notas'>('sesiones')
  const [contextoLocal, setContextoLocal] = useState('')
  const [nuevaNota, setNuevaNota] = useState('')
  const [editandoNota, setEditandoNota] = useState<string|null>(null)
  const [editTitulo, setEditTitulo] = useState('')
  const [editContenido, setEditContenido] = useState('')
  const [archivoNota, setArchivoNota] = useState<File|null>(null)
  const [subiendoNotaArchivo, setSubiendoNotaArchivo] = useState(false)
  const [subiendoArchivo, setSubiendoArchivo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const notaArchivoRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    nombre: '', apellido: '', celular: '', email: '',
    fecha_nacimiento: '', contexto_general: '', alias: '',
    etiquetas: [] as string[],
  })

  useEffect(() => { cargarDatos() }, [])

  useEffect(() => {
    if (pacientes.length === 0) return
    const params = new URLSearchParams(window.location.search)
    const id = params.get('paciente')
    if (id) {
      const pac = pacientes.find(p => p.id === id)
      if (pac) setPacienteSeleccionado(pac)
    }
  }, [pacientes])

  useEffect(() => {
    if (pacienteSeleccionado) {
      setContextoLocal(pacienteSeleccionado.contexto_general || '')
      setTab('sesiones')
      setEditandoNota(null)
    }
  }, [pacienteSeleccionado?.id])

  async function cargarDatos() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !user.email) {
        window.location.href = '/auth/login'
        return
      }

      const [{ data: pacs }, { data: sess }, { data: archs }, { data: nots }] = await Promise.all([
        supabase.from('patients').select('*').eq('user_id', user.id).order('nombre'),
        supabase.from('sessions').select('*').eq('user_id', user.id).order('fecha', { ascending: false }),
        supabase.from('files').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('session_notes').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
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
        const porPac: Record<string, SessionNote[]> = {}
        pacs.forEach(p => { porPac[p.id] = nots.filter(n => n.patient_id === p.id) })
        setSessionNotes(porPac)
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
          setSessionNotes(prev => ({ ...prev, [data.id]: [] }))
        }
      }
      setModalNuevo(false)
    } catch (err) {
      console.error('Error guardando paciente:', err)
    } finally {
      setGuardando(false)
    }
  }

  async function borrarPaciente() {
    if (!pacienteSeleccionado) return
    if (!confirm(`¿Eliminar a ${pacienteSeleccionado.nombre} ${pacienteSeleccionado.apellido}? Esta acción no se puede deshacer.`)) return
    const supabase = createClient()
    await supabase.from('sessions').delete().eq('patient_id', pacienteSeleccionado.id)
    await supabase.from('files').delete().eq('patient_id', pacienteSeleccionado.id)
    await supabase.from('session_notes').delete().eq('patient_id', pacienteSeleccionado.id)
    await supabase.from('patients').delete().eq('id', pacienteSeleccionado.id)
    setPacientes(prev => prev.filter(p => p.id !== pacienteSeleccionado.id))
    setPacienteSeleccionado(null)
    setModalNuevo(false)
  }

  async function guardarContexto(id: string, contexto: string) {
    const supabase = createClient()
    await supabase.from('patients').update({ contexto_general: contexto }).eq('id', id)
    setPacientes(prev => prev.map(p => p.id === id ? { ...p, contexto_general: contexto } : p))
  }

  async function agregarNota() {
    if (!nuevaNota.trim() && !editContenido.trim() && !archivoNota) return
    if (!pacienteSeleccionado) return
    setSubiendoNotaArchivo(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      let archivo_url = null, archivo_tipo = null, archivo_nombre = null
      if (archivoNota) {
        const ext = archivoNota.name.split('.').pop()
        const path = `${user.id}/${pacienteSeleccionado.id}/notas/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('patient-files').upload(path, archivoNota)
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('patient-files').getPublicUrl(path)
          archivo_url = urlData.publicUrl
          archivo_tipo = archivoNota.type.startsWith('image') ? 'imagen' : archivoNota.type.includes('pdf') ? 'pdf' : 'archivo'
          archivo_nombre = archivoNota.name
        }
      }
      const { data } = await supabase.from('session_notes').insert({
        user_id: user.id,
        patient_id: pacienteSeleccionado.id,
        session_id: null,
        titulo: nuevaNota.trim().slice(0, 30) || 'Sin título',
        contenido: editContenido.trim() || null,
        archivo_url, archivo_tipo, archivo_nombre,
      }).select().single()
      if (data) {
        setSessionNotes(prev => ({ ...prev, [pacienteSeleccionado.id]: [data, ...(prev[pacienteSeleccionado.id] || [])] }))
        setNuevaNota('')
        setEditContenido('')
        setArchivoNota(null)
        if (notaArchivoRef.current) notaArchivoRef.current.value = ''
      }
    } catch(err) { console.error(err) } finally { setSubiendoNotaArchivo(false) }
  }

  async function guardarEdicionNota(n: SessionNote) {
    if (!pacienteSeleccionado) return
    setSubiendoNotaArchivo(true)
    try {
      const supabase = createClient()
      let archivo_url = n.archivo_url
      let archivo_tipo = n.archivo_tipo
      let archivo_nombre = n.archivo_nombre
      if (archivoNota) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const ext = archivoNota.name.split('.').pop()
          const path = `${user.id}/${pacienteSeleccionado.id}/notas/${Date.now()}.${ext}`
          const { error } = await supabase.storage.from('patient-files').upload(path, archivoNota)
          if (!error) {
            const { data: urlData } = supabase.storage.from('patient-files').getPublicUrl(path)
            archivo_url = urlData.publicUrl
            archivo_tipo = archivoNota.type.startsWith('image') ? 'imagen' : archivoNota.type.includes('pdf') ? 'pdf' : 'archivo'
            archivo_nombre = archivoNota.name
          }
        }
      }
      await supabase.from('session_notes').update({ titulo: editTitulo, contenido: editContenido, archivo_url, archivo_tipo, archivo_nombre }).eq('id', n.id)
      setSessionNotes(prev => ({
        ...prev,
        [pacienteSeleccionado.id]: (prev[pacienteSeleccionado.id] || []).map(x =>
          x.id === n.id ? { ...x, titulo: editTitulo, contenido: editContenido, archivo_url, archivo_tipo, archivo_nombre } : x
        )
      }))
      setEditandoNota(null)
      setArchivoNota(null)
      if (notaArchivoRef.current) notaArchivoRef.current.value = ''
    } catch (err) {
      console.error(err)
    } finally {
      setSubiendoNotaArchivo(false)
    }
  }

  async function borrarNota(notaId: string) {
    if (!pacienteSeleccionado) return
    if (!confirm('¿Eliminar esta ficha?')) return
    const supabase = createClient()
    await supabase.from('session_notes').delete().eq('id', notaId)
    setSessionNotes(prev => ({ ...prev, [pacienteSeleccionado.id]: (prev[pacienteSeleccionado.id] || []).filter(n => n.id !== notaId) }))
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

  const sesionsPaciente = pacienteSeleccionado ? (sesiones[pacienteSeleccionado.id] || []) : []
  const notasPaciente = pacienteSeleccionado ? (sessionNotes[pacienteSeleccionado.id] || []) : []

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:'13px',color:'var(--text-muted)',background:'var(--bg)'}}>
      Cargando...
    </div>
  )

  const FOLDER_COLORS = [
    {tab:'#E9D5FF', border:'rgba(233,213,255,0.3)'},
    {tab:'#C7D2FE', border:'rgba(199,210,254,0.3)'},
    {tab:'#A7F3D0', border:'rgba(167,243,208,0.3)'},
    {tab:'#FBCFE8', border:'rgba(251,207,232,0.3)'},
    {tab:'#FDE68A', border:'rgba(211,200,159,0.3)'},
    {tab:'#BAE6FD', border:'rgba(186,230,253,0.3)'},
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box}
        .pw{display:grid;grid-template-columns:55% 45%;height:100vh;overflow:hidden;font-family:'Inter',sans-serif;background:var(--bg);padding:14px 16px 14px 14px;gap:14px}
        .pl{display:flex;flex-direction:column;gap:10px;overflow:hidden;background:var(--bg-card);border-radius:22px;padding:18px;height:100%;box-shadow:0 4px 20px var(--shadow);border:0.5px solid var(--border-light)}
        .pr{display:flex;flex-direction:column;gap:0;background:var(--bg-card);border-radius:22px;height:100%;box-shadow:0 8px 32px var(--shadow);border:0.5px solid var(--border-light);overflow:hidden}
        @media(max-width:768px){
          .pw{grid-template-columns:1fr;height:auto;min-height:100vh;overflow:visible;padding:10px 10px 80px;gap:10px}
          .pl{height:auto;min-height:unset;overflow:visible;border-radius:16px;flex-shrink:0}
          .pr{height:auto;min-height:unset;overflow:visible;border-radius:16px;flex-shrink:0;overflow:visible}
          .plist{overflow:visible;min-height:unset;flex:unset;max-height:unset}
          .plist.compacto{max-height:180px;overflow-y:auto}
          .tab-content{overflow:visible;min-height:unset;flex:unset}
          .mo-box{width:95vw !important;max-width:480px}
        }
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
        .pr-fixed{padding:18px 20px 14px;flex-shrink:0;border-bottom:0.5px solid var(--border-light);overflow-y:auto;max-height:55%}
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
        .ctx-area{width:100%;padding:9px 11px;border-radius:10px;border:0.5px solid var(--border);font-size:12px;color:var(--text-primary);resize:vertical;min-height:60px;font-family:inherit;background:var(--bg-input);outline:none;line-height:1.6;overflow-y:auto;overflow-x:hidden;word-wrap:break-word;white-space:pre-wrap}
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

          <div className={`plist${pacienteSeleccionado ? ' compacto' : ''}`}>
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
                      <a href={`https://wa.me/${pacienteSeleccionado.celular.replace(/\D/g,'').replace(/^0+/,'')}`}
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

              

              <div style={{marginTop:'10px'}}>
                <div className="ctx-label">Contexto general</div>
                <textarea
                  key={pacienteSeleccionado.id}
                  className="ctx-area"
                  value={contextoLocal}
                  onChange={e => setContextoLocal(e.target.value)}
                  onBlur={() => guardarContexto(pacienteSeleccionado.id, contextoLocal)}
                  placeholder="Anotá el contexto general de este paciente..."
                />
              </div>
            </div>

            <div className="tabs">
              <button className={`tab${tab==='sesiones'?' active':''}`} onClick={() => setTab('sesiones')}>
                Sesiones ({sesionsPaciente.length})
              </button>
              <button className={`tab${tab==='notas'?' active':''}`} onClick={() => setTab('notas')}>
                Post-sesión ({notasPaciente.length})
              </button>
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

              {tab === 'notas' && (<>
                {/* NUEVA FICHA */}
<div style={{background:'var(--bg-input)',borderRadius:'14px',padding:'12px',border:'0.5px solid var(--border-light)',flexShrink:0}}>
  <input
    placeholder="Nombre de la ficha..."
    value={nuevaNota}
    onChange={e => setNuevaNota(e.target.value)}
    style={{width:'100%',border:'none',background:'transparent',fontSize:'12px',fontWeight:600,color:'var(--text-primary)',outline:'none',fontFamily:'inherit',marginBottom:'7px'}}
  />
  <textarea
    placeholder="¿Qué pasó en esta sesión? (opcional)"
    value={editContenido}
    onChange={e => setEditContenido(e.target.value)}
    style={{width:'100%',border:'none',background:'transparent',fontSize:'12px',color:'var(--text-primary)',outline:'none',resize:'none',height:'55px',fontFamily:'inherit',lineHeight:'1.6',marginBottom:'7px'}}
  />
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
    <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
      <input ref={notaArchivoRef} type="file" accept="image/*,.pdf,.doc,.docx,audio/*" style={{display:'none'}}
        onChange={e => setArchivoNota(e.target.files?.[0] || null)}/>
      <button onClick={() => notaArchivoRef.current?.click()}
        style={{padding:'4px 10px',borderRadius:'7px',background:'var(--bg-card)',border:'0.5px solid var(--border)',fontSize:'10px',color:'var(--text-muted)',cursor:'pointer',fontFamily:'inherit'}}>
        📎 {archivoNota ? archivoNota.name.slice(0,20)+'...' : 'Adjuntar'}
      </button>
      {archivoNota && (
        <button onClick={() => { setArchivoNota(null); if(notaArchivoRef.current) notaArchivoRef.current.value='' }}
          style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--text-muted)'}}>
          <X size={10}/>
        </button>
      )}
    </div>
    <button onClick={agregarNota}
      style={{padding:'5px 12px',background:'linear-gradient(135deg,#8B5CF6,#A78BFA)',color:'white',border:'none',borderRadius:'7px',fontSize:'11px',fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
      + Guardar ficha
    </button>
  </div>
</div>

                {/* FICHERO */}
                {notasPaciente.length === 0 ? (
                  <div style={{fontSize:'11px',color:'var(--text-muted)',textAlign:'center',padding:'12px 0'}}>Sin fichas aún</div>
                ) : (
                  <div style={{position:'relative',flexShrink:0,minHeight:`${notasPaciente.length * 32 + 160}px`}}>
                    {notasPaciente.map((n, i) => {
                      const isActive = editandoNota === n.id || editandoNota === n.id + '_expand'
                      const expandida = editandoNota === n.id + '_expand'
                      const isEditing = editandoNota === n.id
                      const color = FOLDER_COLORS[i % FOLDER_COLORS.length]
                      return (
                        <div key={n.id} style={{
                          position:'absolute',
                          top: isActive ? `${Math.max(0, i*32-10)}px` : `${i*32}px`,
                          left:0, right:0,
                          zIndex: isActive ? 100 : i+1,
                          transition:'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                          filter: isActive ? 'drop-shadow(0 20px 40px rgba(0,0,0,0.3))' : 'none',
                          transform: isActive ? 'translateY(-12px) scale(1.01)' : 'translateY(0) scale(1)',
                        }}>
                          {/* PESTAÑA */}
                          <div style={{
                            display:'inline-flex',alignItems:'center',gap:'5px',
                            background: color.tab,
                            borderRadius:'7px 12px 0 0',
                            padding:'4px 14px 4px 10px',
                            fontSize:'10px',fontWeight:700,
                            color:'rgba(0,0,0,0.75)',
                            marginLeft:`${12 + (i % 4) * 18}px`,
                            maxWidth:'160px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
                            cursor:'pointer',
                            boxShadow:'0 -2px 8px rgba(0,0,0,0.15)',
                          }}
                          onClick={() => setEditandoNota(isActive ? null : n.id + '_expand')}>
                            {n.archivo_tipo === 'imagen' && '🖼 '}
                            {n.archivo_tipo === 'pdf' && '📄 '}
                            {n.titulo}
                          </div>

                          {/* CUERPO */}
                          <div style={{
                            background:'var(--bg-card)',
                            border:`1px solid ${color.border}`,
                            borderRadius:'0 12px 12px 12px',
                            padding: isActive ? '14px' : '0 14px',
                            maxHeight: isActive ? '450px' : '0px',
                            overflow: isActive ? 'auto' : 'hidden',
                            transition:'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                            boxShadow:'0 4px 16px rgba(0,0,0,0.08)',
                          }}>
                            {!isActive && n.contenido && (
                              <div style={{padding:'6px 0 8px',fontSize:'10px',color:'var(--text-muted)',overflow:'hidden',maxHeight:'32px',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>
                                {n.contenido.slice(0,80)}
                              </div>
                            )}

                            {isActive && (<>
                              {isEditing ? (
                                <>
                                  <input value={editTitulo} onChange={e => setEditTitulo(e.target.value)}
                                    placeholder="Nombre de la ficha..."
                                    style={{width:'100%',border:`0.5px solid ${color.border}`,borderRadius:'8px',padding:'6px 8px',fontSize:'11px',fontWeight:600,color:'var(--text-primary)',background:'var(--bg-input)',outline:'none',fontFamily:'inherit',marginBottom:'7px'}}/>
                                  <textarea value={editContenido} onChange={e => setEditContenido(e.target.value)}
                                    style={{width:'100%',border:`0.5px solid ${color.border}`,borderRadius:'8px',padding:'7px',fontSize:'11px',color:'var(--text-primary)',background:'var(--bg-input)',outline:'none',resize:'none',height:'80px',fontFamily:'inherit',lineHeight:'1.6',marginBottom:'7px'}}/>
                                  <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'10px'}}>
                                    <input ref={notaArchivoRef} type="file" accept="image/*,.pdf,.doc,.docx,audio/*" style={{display:'none'}}
                                      onChange={e => setArchivoNota(e.target.files?.[0] || null)}/>
                                    <button onClick={() => notaArchivoRef.current?.click()}
                                      style={{padding:'3px 9px',borderRadius:'6px',background:'var(--bg-input)',border:`0.5px solid ${color.border}`,fontSize:'10px',color:'var(--text-primary)',cursor:'pointer',fontFamily:'inherit'}}>
                                      📎 {archivoNota ? archivoNota.name.slice(0,18)+'...' : n.archivo_nombre ? 'Cambiar archivo' : 'Adjuntar'}
                                    </button>
                                    {n.archivo_url && !archivoNota && (
                                      <a href={n.archivo_url} target="_blank" rel="noopener noreferrer"
                                        style={{fontSize:'10px',color:color.tab,textDecoration:'none',fontWeight:600}}>Ver actual</a>
                                    )}
                                  </div>
                                  <div style={{display:'flex',gap:'6px',justifyContent:'flex-end'}}>
                                    <button onClick={() => { setEditandoNota(null); setArchivoNota(null) }}
                                      style={{padding:'5px 12px',borderRadius:'7px',border:`0.5px solid ${color.border}`,background:'transparent',fontSize:'10px',color:'var(--text-secondary)',cursor:'pointer',fontFamily:'inherit'}}>
                                      Cancelar
                                    </button>
                                    <button onClick={() => guardarEdicionNota(n)} disabled={subiendoNotaArchivo}
                                      style={{padding:'5px 12px',borderRadius:'7px',border:'none',background:color.tab,color:'rgba(0,0,0,0.8)',fontSize:'10px',fontWeight:700,cursor:'pointer',fontFamily:'inherit',opacity:subiendoNotaArchivo?0.6:1}}>
                                      {subiendoNotaArchivo ? 'Guardando...' : 'Guardar'}
                                    </button>
                                  </div>
                                </>
                              ) : (<>
                                {n.contenido && (
                                  <div style={{fontSize:'12px',color:'var(--text-primary)',lineHeight:'1.7',whiteSpace:'pre-wrap',marginBottom:'10px'}}>
                                    {expandida ? n.contenido : n.contenido.slice(0,180)}
                                    {n.contenido.length > 180 && (
                                      <span onClick={() => setEditandoNota(n.id+'_expand')}
                                        style={{color:color.tab,cursor:'pointer',fontWeight:600,fontSize:'10px',marginLeft:'4px'}}>
                                        {expandida ? ' ver menos ↑' : '... ver más ↓'}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {n.archivo_url && (
                                  <div style={{display:'flex',alignItems:'center',gap:'8px',background:'var(--bg-input)',borderRadius:'8px',padding:'8px 10px',marginBottom:'10px',border:`0.5px solid ${color.border}`}}>
                                    {n.archivo_tipo === 'imagen'
                                      ? <img src={n.archivo_url} alt="" style={{width:'48px',height:'48px',borderRadius:'6px',objectFit:'cover'}}/>
                                      : <span style={{fontSize:'20px'}}>{n.archivo_tipo==='pdf'?'📄':'📎'}</span>}
                                    <a href={n.archivo_url} target="_blank" rel="noopener noreferrer"
                                      style={{fontSize:'11px',color:color.tab,textDecoration:'none',fontWeight:600}}>
                                      {n.archivo_nombre?.slice(0,28) || 'Ver archivo'}
                                    </a>
                                  </div>
                                )}
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderTop:'0.5px solid var(--border-light)',paddingTop:'8px'}}>
                                  <span style={{fontSize:'9px',color:'var(--text-muted)'}}>
                                    {new Date(n.created_at).toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'})}
                                  </span>
                                  <div style={{display:'flex',gap:'5px'}}>
                                    <button onClick={() => { setEditandoNota(n.id); setEditTitulo(n.titulo); setEditContenido(n.contenido||''); setArchivoNota(null) }}
                                      style={{width:'24px',height:'24px',border:`0.5px solid ${color.border}`,borderRadius:'6px',background:'var(--bg-input)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:color.tab}}>
                                      <Pencil size={9}/>
                                    </button>
                                    <button onClick={() => borrarNota(n.id)}
                                      style={{width:'24px',height:'24px',border:'0.5px solid #EF4444',borderRadius:'6px',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#EF4444'}}>
                                      <Trash2 size={9}/>
                                    </button>
                                  </div>
                                </div>
                              </>)}
                            </>)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
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
                <label>Celular (con código de país)</label>
                <input placeholder="Ej: 5492236789012" value={form.celular} onChange={e => setForm({...form, celular: e.target.value})}/>
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
          
          
            
            <button className="save-btn" onClick={guardarPaciente} disabled={guardando}>
              {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear paciente'}
            </button>
            {editando && (
              <button onClick={borrarPaciente}
                style={{width:'100%',padding:'11px',marginTop:'8px',background:'transparent',color:'#EF4444',border:'0.5px solid #FECACA',borderRadius:'11px',fontSize:'13px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit',transition:'all 0.15s'}}
                onMouseOver={e => (e.currentTarget.style.background='#FEF2F2')}
                onMouseOut={e => (e.currentTarget.style.background='transparent')}>
                Eliminar paciente
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}