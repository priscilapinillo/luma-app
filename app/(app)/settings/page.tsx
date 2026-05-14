'use client'

import { useEffect, useState, useRef } from 'react'
import { User, Shield, Database, Settings, Camera, Eye, EyeOff, Download, Trash2, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Perfil = {
  id?: string
  nombre_profesional: string; nombre_completo: string
  especialidad: string; bio: string; whatsapp: string
  zona_horaria: string; moneda: string; formato_fecha: string; avatar_url: string
}

const ZONAS = ['America/Argentina/Buenos_Aires','America/Santiago','America/Lima','America/Bogota','America/Mexico_City','America/Montevideo','Europe/Madrid']
const MONEDAS = ['ARS','USD','EUR','CLP','PEN','COP','MXN','UYU']
type Tab = 'perfil' | 'seguridad' | 'datos' | 'preferencias'

export default function AjustesPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<Tab>('perfil')
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [subiendoAvatar, setSubiendoAvatar] = useState(false)
  const [email, setEmail] = useState('')
  const [ultimoAcceso, setUltimoAcceso] = useState('')
  const [suscripcion, setSuscripcion] = useState<any>(null)
  const [confirmEliminar, setConfirmEliminar] = useState(false)
  const [msgExito, setMsgExito] = useState('')

  const [perfil, setPerfil] = useState<Perfil>({
    nombre_profesional: '', nombre_completo: '', especialidad: '',
    bio: '', whatsapp: '', zona_horaria: 'America/Argentina/Buenos_Aires',
    moneda: 'ARS', formato_fecha: 'dd/mm/yyyy', avatar_url: '',
  })

  const [passForm, setPassForm] = useState({
    nueva: '', confirmar: '', showNueva: false, showConfirmar: false,
  })
  const [passError, setPassError] = useState('')
  const [passExito, setPassExito] = useState(false)

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email || '')
      setUltimoAcceso(user.last_sign_in_at || '')
      const [{ data: prof }, { data: subs }] = await Promise.all([
        supabase.from('therapist_profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('subscriptions').select('*').eq('user_id', user.id).single(),
      ])
      if (prof) setPerfil({
        id: prof.id,
        nombre_profesional: prof.nombre_profesional || '',
        nombre_completo: prof.nombre_completo || '',
        especialidad: prof.especialidad || '',
        bio: prof.bio || '',
        whatsapp: prof.whatsapp || '',
        zona_horaria: prof.zona_horaria || 'America/Argentina/Buenos_Aires',
        moneda: prof.moneda || 'ARS',
        formato_fecha: prof.formato_fecha || 'dd/mm/yyyy',
        avatar_url: prof.avatar_url || '',
      })
      if (subs) setSuscripcion(subs)
    } catch (err) {
      console.error('Error cargando:', err)
    } finally {
      setLoading(false)
    }
  }

  async function guardarPerfil() {
    setGuardando(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const datos = {
        user_id: user.id,
        nombre_profesional: perfil.nombre_profesional,
        nombre_completo: perfil.nombre_completo,
        especialidad: perfil.especialidad,
        bio: perfil.bio, whatsapp: perfil.whatsapp,
        zona_horaria: perfil.zona_horaria, moneda: perfil.moneda,
        formato_fecha: perfil.formato_fecha, avatar_url: perfil.avatar_url,
        updated_at: new Date().toISOString(),
      }
      if (perfil.id) await supabase.from('therapist_profiles').update(datos).eq('user_id', user.id)
      else await supabase.from('therapist_profiles').insert(datos)
      setMsgExito('Perfil guardado correctamente')
      setTimeout(() => setMsgExito(''), 3000)
    } catch (err) {
      console.error('Error guardando:', err)
    } finally {
      setGuardando(false)
    }
  }

  async function subirAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendoAvatar(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const ext = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (!error) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      setPerfil(prev => ({ ...prev, avatar_url: urlData.publicUrl + '?t=' + Date.now() }))
    }
    setSubiendoAvatar(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function cambiarPassword() {
    setPassError('')
    if (passForm.nueva.length < 6) { setPassError('La contraseña debe tener al menos 6 caracteres'); return }
    if (passForm.nueva !== passForm.confirmar) { setPassError('Las contraseñas no coinciden'); return }
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: passForm.nueva })
    if (error) { setPassError('No se pudo cambiar la contraseña'); return }
    setPassExito(true)
    setPassForm({ nueva: '', confirmar: '', showNueva: false, showConfirmar: false })
    setTimeout(() => setPassExito(false), 3000)
  }

  async function cerrarSesion() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  async function exportarCSV(tipo: 'pacientes' | 'finanzas') {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (tipo === 'pacientes') {
      const { data } = await supabase.from('patients').select('*').eq('user_id', user.id)
      if (!data) return
      const csv = ['Nombre,Apellido,Celular,Email,Cumpleaños,Contexto',...data.map(p => `${p.nombre},${p.apellido},${p.celular||''},${p.email||''},${p.fecha_nacimiento||''},${(p.contexto_general||'').replace(/,/g,' ')}`)].join('\n')
      descargarCSV(csv, 'pacientes-luma.csv')
    } else {
      const { data } = await supabase.from('sessions').select('*').eq('user_id', user.id)
      if (!data) return
      const csv = ['Fecha,Hora,Servicio,Precio,Estado Pago,Estado Sesion',...data.map(s => `${s.fecha?.split('T')[0]||''},${s.hora||''},${s.servicio_nombre||''},${s.precio||0},${s.estado_pago||''},${s.estado_sesion||''}`)].join('\n')
      descargarCSV(csv, 'finanzas-luma.csv')
    }
  }

  function descargarCSV(contenido: string, nombre: string) {
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = nombre; a.click()
    URL.revokeObjectURL(url)
  }

  const iniciales = perfil.nombre_profesional
    ? perfil.nombre_profesional.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()
    : '?'

  const diasTrial = suscripcion?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(suscripcion.trial_ends_at).getTime() - Date.now()) / (1000*60*60*24)))
    : 0

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
        .sw{height:100vh;display:grid;grid-template-columns:220px 1fr;font-family:'Inter',sans-serif;background:var(--bg);overflow:hidden}
        .s-nav{background:var(--bg-card);border-right:0.5px solid var(--border-light);padding:20px 12px;display:flex;flex-direction:column;gap:2px}
        .s-nav-title{font-size:16px;font-weight:800;color:var(--text-primary);padding:0 10px;margin-bottom:16px;letter-spacing:-0.3px;font-family:'Manrope',sans-serif}
        .s-nav-item{display:flex;align-items:center;gap:9px;padding:9px 10px;border-radius:10px;font-size:12px;font-weight:500;color:var(--text-secondary);cursor:pointer;transition:all 0.15s;border:none;background:none;font-family:inherit;width:100%;text-align:left}
        .s-nav-item:hover{background:var(--accent-hover);color:var(--text-primary)}
        .s-nav-item.active{background:var(--accent-light);color:var(--accent);font-weight:600}
        .s-nav-div{border:none;border-top:0.5px solid var(--border-light);margin:6px 0}
        .s-content{overflow-y:auto;padding:24px 28px}
        .s-section-title{font-size:18px;font-weight:800;color:var(--text-primary);letter-spacing:-0.5px;margin-bottom:4px;font-family:'Manrope',sans-serif}
        .s-section-sub{font-size:12px;color:var(--text-muted);margin-bottom:24px}

        .s-card{background:var(--bg-card);border-radius:18px;padding:20px 22px;border:0.5px solid var(--border-light);box-shadow:0 2px 12px var(--shadow);margin-bottom:16px}
        .s-card-title{font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:14px;display:flex;align-items:center;gap:7px;font-family:'Manrope',sans-serif}

        .avatar-wrap{display:flex;align-items:center;gap:16px;margin-bottom:20px}
        .avatar-img{width:72px;height:72px;border-radius:50%;object-fit:cover;border:2px solid var(--border)}
        .avatar-placeholder{width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#8B5CF6,#A78BFA);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:white;flex-shrink:0}
        .avatar-name{font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:2px;font-family:'Manrope',sans-serif}
        .avatar-spec{font-size:12px;color:var(--text-muted)}
        .avatar-btn{display:flex;align-items:center;gap:6px;padding:7px 14px;background:var(--accent-light);color:var(--accent);border:none;border-radius:9px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;margin-top:8px;transition:all 0.15s}
        .avatar-btn:hover{background:var(--accent-hover)}

        .field-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .field{display:flex;flex-direction:column;gap:5px;margin-bottom:12px}
        .field.full{grid-column:1/-1}
        .field label{font-size:11px;font-weight:600;color:var(--text-primary)}
        .field input,.field select,.field textarea{padding:9px 11px;border-radius:10px;border:0.5px solid var(--border);font-size:13px;font-family:inherit;color:var(--text-primary);background:var(--bg-input);outline:none;width:100%}
        .field input:focus,.field select:focus,.field textarea:focus{border-color:var(--accent)}
        .field textarea{min-height:70px;resize:none}
        .field-hint{font-size:10px;color:var(--text-muted);margin-top:2px}

        .save-btn{display:inline-flex;align-items:center;gap:6px;padding:10px 20px;background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:white;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 4px 12px rgba(139,92,246,0.3);transition:all 0.15s}
        .save-btn:hover{box-shadow:0 6px 16px rgba(139,92,246,0.4);transform:translateY(-1px)}
        .save-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none}
        .msg-exito{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#059669;background:#DCFCE7;padding:7px 12px;border-radius:8px;border:0.5px solid #BBF7D0;margin-left:10px}

        .pass-field{position:relative;margin-bottom:12px}
        .pass-field label{font-size:11px;font-weight:600;color:var(--text-primary);display:block;margin-bottom:5px}
        .pass-input-wrap{position:relative}
        .pass-input{width:100%;padding:9px 38px 9px 11px;border-radius:10px;border:0.5px solid var(--border);font-size:13px;font-family:inherit;color:var(--text-primary);background:var(--bg-input);outline:none}
        .pass-input:focus{border-color:var(--accent)}
        .pass-eye{position:absolute;right:11px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-muted);display:flex;align-items:center}
        .pass-error{font-size:12px;color:#EF4444;padding:8px 12px;background:#FEF2F2;border-radius:8px;border:0.5px solid #FECACA;margin-bottom:12px}
        .pass-exito{font-size:12px;color:#059669;padding:8px 12px;background:#DCFCE7;border-radius:8px;border:0.5px solid #BBF7D0;margin-bottom:12px}

        .subs-card{background:linear-gradient(135deg,#1A1035,#3B1F7A);border-radius:18px;padding:20px 22px;margin-bottom:16px}
        .subs-label{font-size:10px;font-weight:700;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px}
        .subs-plan{font-size:20px;font-weight:800;color:white;letter-spacing:-0.5px;margin-bottom:4px;font-family:'Manrope',sans-serif}
        .subs-info{font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:14px}
        .subs-trial-bar{height:6px;background:rgba(255,255,255,0.15);border-radius:6px;overflow:hidden;margin-bottom:8px}
        .subs-trial-fill{height:100%;background:linear-gradient(90deg,#A78BFA,#C084FC);border-radius:6px}
        .subs-trial-text{font-size:11px;color:rgba(255,255,255,0.5)}

        .danger-zone{border:0.5px solid #FECACA;border-radius:14px;padding:16px 18px;background:#FFF5F5}
        html.dark .danger-zone{background:#200808;border-color:#7F1D1D}
        .danger-title{font-size:12px;font-weight:700;color:#EF4444;margin-bottom:10px}
        .danger-btn{display:flex;align-items:center;gap:7px;padding:8px 14px;border-radius:9px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;border:0.5px solid #FECACA;background:transparent;color:#EF4444;transition:all 0.15s;width:100%;margin-bottom:8px}
        .danger-btn:hover{background:#FEF2F2}
        .danger-btn:last-child{margin-bottom:0}

        .export-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
        .export-card{background:var(--bg-input);border-radius:12px;padding:16px;border:0.5px solid var(--border-light);text-align:center;cursor:pointer;transition:all 0.15s}
        .export-card:hover{background:var(--accent-light);border-color:var(--border);transform:translateY(-1px)}
        .export-icon{width:36px;height:36px;border-radius:10px;background:var(--accent-light);display:flex;align-items:center;justify-content:center;margin:0 auto 10px}
        .export-title{font-size:12px;font-weight:600;color:var(--text-primary);margin-bottom:3px}
        .export-sub{font-size:10px;color:var(--text-muted)}

        .pref-row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:0.5px solid var(--border-light)}
        .pref-row:last-child{border-bottom:none}
        .pref-label{font-size:13px;font-weight:500;color:var(--text-primary)}
        .pref-sub{font-size:11px;color:var(--text-muted);margin-top:2px}
        .pref-select{padding:6px 10px;border-radius:8px;border:0.5px solid var(--border);font-size:12px;font-family:inherit;color:var(--text-primary);background:var(--bg-input);outline:none;cursor:pointer}
        .pref-select:focus{border-color:var(--accent)}

        .confirm-overlay{position:fixed;inset:0;background:rgba(26,16,53,0.5);display:flex;align-items:center;justify-content:center;z-index:100;backdrop-filter:blur(4px)}
        .confirm-box{background:var(--bg-card);border-radius:20px;padding:24px;width:360px;box-shadow:0 32px 80px rgba(100,60,200,0.25)}
        .confirm-title{font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:8px;font-family:'Manrope',sans-serif}
        .confirm-text{font-size:13px;color:var(--text-secondary);line-height:1.6;margin-bottom:20px}
        .confirm-btns{display:flex;gap:8px}
        .confirm-cancel{flex:1;padding:10px;border-radius:10px;border:0.5px solid var(--border);background:var(--bg-card);font-size:13px;cursor:pointer;font-family:inherit;color:var(--text-secondary)}
        .confirm-delete{flex:1;padding:10px;border-radius:10px;border:none;background:#EF4444;color:white;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}

        .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .info-item{background:var(--bg-input);border-radius:10px;padding:12px;border:0.5px solid var(--border-light)}
        .info-lbl{font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px}
        .info-val{font-size:13px;font-weight:600;color:var(--text-primary)}
      `}</style>

      <input ref={fileInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={subirAvatar}/>

      <div className="sw">
        <div className="s-nav">
          <div className="s-nav-title">Ajustes</div>
          {([
            { id: 'perfil', icon: User, label: 'Perfil profesional' },
            { id: 'seguridad', icon: Shield, label: 'Seguridad' },
            { id: 'datos', icon: Database, label: 'Datos y respaldo' },
            { id: 'preferencias', icon: Settings, label: 'Preferencias' },
          ] as const).map(({ id, icon: Icon, label }) => (
            <button key={id} className={`s-nav-item${tab===id?' active':''}`} onClick={() => setTab(id)}>
              <Icon size={14}/>{label}
            </button>
          ))}
        </div>

        <div className="s-content">

          {tab === 'perfil' && (<>
            <div className="s-section-title">Perfil profesional</div>
            <div className="s-section-sub">Tu identidad dentro de Luma</div>
            <div className="s-card">
              <div className="avatar-wrap">
                {perfil.avatar_url
                  ? <img src={perfil.avatar_url} className="avatar-img" alt="avatar"/>
                  : <div className="avatar-placeholder">{iniciales}</div>
                }
                <div>
                  <div className="avatar-name">{perfil.nombre_profesional || 'Tu nombre'}</div>
                  <div className="avatar-spec">{perfil.especialidad || 'Especialidad'}</div>
                  <button className="avatar-btn" onClick={() => fileInputRef.current?.click()} disabled={subiendoAvatar}>
                    <Camera size={12}/>{subiendoAvatar ? 'Subiendo...' : 'Cambiar foto'}
                  </button>
                </div>
              </div>
              <div className="field-grid">
                <div className="field">
                  <label>Nombre profesional</label>
                  <input placeholder="Ej: Priscila Tarot" value={perfil.nombre_profesional}
                    onChange={e => setPerfil({...perfil, nombre_profesional: e.target.value})}/>
                  <div className="field-hint">Visible en toda la app</div>
                </div>
                <div className="field">
                  <label>Nombre completo</label>
                  <input placeholder="Ej: Priscila García" value={perfil.nombre_completo}
                    onChange={e => setPerfil({...perfil, nombre_completo: e.target.value})}/>
                </div>
                <div className="field">
                  <label>Especialidad / Profesión</label>
                  <input placeholder="Ej: Tarotista · Terapeuta energética" value={perfil.especialidad}
                    onChange={e => setPerfil({...perfil, especialidad: e.target.value})}/>
                </div>
                <div className="field">
                  <label>WhatsApp</label>
                  <input placeholder="Ej: +54 9 223 000-0000" value={perfil.whatsapp}
                    onChange={e => setPerfil({...perfil, whatsapp: e.target.value})}/>
                </div>
                <div className="field full">
                  <label>Bio corta</label>
                  <textarea placeholder="Una descripción breve de tu práctica profesional..."
                    value={perfil.bio} onChange={e => setPerfil({...perfil, bio: e.target.value})}/>
                </div>
                <div className="field">
                  <label>Email</label>
                  <input value={email} disabled style={{opacity:0.5,cursor:'not-allowed'}}/>
                  <div className="field-hint">No se puede cambiar desde acá</div>
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginTop:'4px'}}>
                <button className="save-btn" onClick={guardarPerfil} disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Guardar perfil'}
                </button>
                {msgExito && <span className="msg-exito">✓ {msgExito}</span>}
              </div>
            </div>
            <div className="subs-card">
              <div className="subs-label">Plan actual</div>
              <div className="subs-plan">
                {suscripcion?.status === 'trial' ? 'Período de prueba' : suscripcion?.status === 'active' ? 'Plan activo' : 'Sin plan activo'}
              </div>
              <div className="subs-info">
                {suscripcion?.status === 'trial' ? `${diasTrial} días restantes de prueba gratuita` : 'USD 7/mes · Facturación mensual'}
              </div>
              {suscripcion?.status === 'trial' && (<>
                <div className="subs-trial-bar">
                  <div className="subs-trial-fill" style={{width:`${Math.max(0,(7-diasTrial)/7*100)}%`}}/>
                </div>
                <div className="subs-trial-text">{diasTrial} de 7 días restantes</div>
              </>)}
            </div>
          </>)}

          {tab === 'seguridad' && (<>
            <div className="s-section-title">Seguridad</div>
            <div className="s-section-sub">Controlá el acceso a tu cuenta</div>
            <div className="s-card">
              <div className="s-card-title"><Shield size={14}/>Cambiar contraseña</div>
              {passError && <div className="pass-error">{passError}</div>}
              {passExito && <div className="pass-exito">✓ Contraseña actualizada correctamente</div>}
              <div className="pass-field">
                <label>Nueva contraseña</label>
                <div className="pass-input-wrap">
                  <input className="pass-input" type={passForm.showNueva ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres" value={passForm.nueva}
                    onChange={e => setPassForm({...passForm, nueva: e.target.value})}/>
                  <button className="pass-eye" onClick={() => setPassForm({...passForm, showNueva: !passForm.showNueva})}>
                    {passForm.showNueva ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                </div>
              </div>
              <div className="pass-field">
                <label>Confirmar contraseña</label>
                <div className="pass-input-wrap">
                  <input className="pass-input" type={passForm.showConfirmar ? 'text' : 'password'}
                    placeholder="Repetí la contraseña" value={passForm.confirmar}
                    onChange={e => setPassForm({...passForm, confirmar: e.target.value})}/>
                  <button className="pass-eye" onClick={() => setPassForm({...passForm, showConfirmar: !passForm.showConfirmar})}>
                    {passForm.showConfirmar ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                </div>
              </div>
              <button className="save-btn" onClick={cambiarPassword}>Cambiar contraseña</button>
            </div>
            <div className="s-card">
              <div className="s-card-title"><Shield size={14}/>Información de sesión</div>
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-lbl">Email de cuenta</div>
                  <div className="info-val">{email}</div>
                </div>
                <div className="info-item">
                  <div className="info-lbl">Último acceso</div>
                  <div className="info-val">
                    {ultimoAcceso ? new Date(ultimoAcceso).toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'}) : '—'}
                  </div>
                </div>
              </div>
            </div>
            <div className="s-card">
              <div className="s-card-title"><LogOut size={14}/>Sesión</div>
              <button className="save-btn" style={{background:'var(--accent-light)',color:'var(--accent)',boxShadow:'none'}} onClick={cerrarSesion}>
                <LogOut size={13}/>Cerrar sesión
              </button>
            </div>
            <div className="danger-zone">
              <div className="danger-title">Zona de peligro</div>
              <button className="danger-btn" onClick={() => setConfirmEliminar(true)}>
                <Trash2 size={13}/>Eliminar cuenta permanentemente
              </button>
            </div>
          </>)}

          {tab === 'datos' && (<>
            <div className="s-section-title">Datos y respaldo</div>
            <div className="s-section-sub">Exportá tu información en cualquier momento</div>
            <div className="s-card">
              <div className="s-card-title"><Download size={14}/>Exportar datos</div>
              <div className="export-grid">
                <div className="export-card" onClick={() => exportarCSV('pacientes')}>
                  <div className="export-icon"><User size={16} color="#7C3AED"/></div>
                  <div className="export-title">Pacientes</div>
                  <div className="export-sub">CSV con todos tus pacientes</div>
                </div>
                <div className="export-card" onClick={() => exportarCSV('finanzas')}>
                  <div className="export-icon"><Database size={16} color="#059669"/></div>
                  <div className="export-title">Finanzas</div>
                  <div className="export-sub">CSV con todas las sesiones</div>
                </div>
                <div className="export-card" style={{opacity:0.5,cursor:'not-allowed'}}>
                  <div className="export-icon"><Download size={16} color="#D97706"/></div>
                  <div className="export-title">Historial completo</div>
                  <div className="export-sub">Próximamente</div>
                </div>
              </div>
            </div>
            <div className="s-card">
              <div className="s-card-title"><Shield size={14}/>Sobre tus datos</div>
              <p style={{fontSize:'13px',color:'var(--text-secondary)',lineHeight:'1.7',margin:0}}>
                Todos tus datos se almacenan de forma segura en Supabase con cifrado en reposo. Cada terapeuta tiene sus datos completamente aislados. Podés exportar o eliminar tu información en cualquier momento.
              </p>
            </div>
          </>)}

          {tab === 'preferencias' && (<>
            <div className="s-section-title">Preferencias</div>
            <div className="s-section-sub">Personalizá cómo se muestra la información</div>
            <div className="s-card">
              <div className="pref-row">
                <div>
                  <div className="pref-label">Zona horaria</div>
                  <div className="pref-sub">Afecta los horarios mostrados</div>
                </div>
                <select className="pref-select" value={perfil.zona_horaria}
                  onChange={e => setPerfil({...perfil, zona_horaria: e.target.value})}>
                  {ZONAS.map(z => <option key={z} value={z}>{z.split('/').pop()?.replace('_',' ')}</option>)}
                </select>
              </div>
              <div className="pref-row">
                <div>
                  <div className="pref-label">Moneda</div>
                  <div className="pref-sub">Usada en finanzas y pagos</div>
                </div>
                <select className="pref-select" value={perfil.moneda}
                  onChange={e => setPerfil({...perfil, moneda: e.target.value})}>
                  {MONEDAS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="pref-row">
                <div>
                  <div className="pref-label">Formato de fecha</div>
                  <div className="pref-sub">Cómo se muestran las fechas</div>
                </div>
                <select className="pref-select" value={perfil.formato_fecha}
                  onChange={e => setPerfil({...perfil, formato_fecha: e.target.value})}>
                  <option value="dd/mm/yyyy">dd/mm/yyyy</option>
                  <option value="mm/dd/yyyy">mm/dd/yyyy</option>
                  <option value="yyyy-mm-dd">yyyy-mm-dd</option>
                </select>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <button className="save-btn" onClick={guardarPerfil} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar preferencias'}
              </button>
              {msgExito && <span className="msg-exito">✓ {msgExito}</span>}
            </div>
          </>)}

        </div>
      </div>

      {confirmEliminar && (
        <div className="confirm-overlay" onClick={() => setConfirmEliminar(false)}>
          <div className="confirm-box" onClick={e => e.stopPropagation()}>
            <div style={{fontSize:'28px',marginBottom:'12px'}}>⚠️</div>
            <div className="confirm-title">¿Eliminar tu cuenta?</div>
            <div className="confirm-text">
              Esta acción es <strong>permanente e irreversible</strong>. Se eliminarán todos tus pacientes, sesiones, pagos y datos asociados.
            </div>
            <div className="confirm-btns">
              <button className="confirm-cancel" onClick={() => setConfirmEliminar(false)}>Cancelar</button>
              <button className="confirm-delete" onClick={async () => {
                const supabase = createClient()
                await supabase.auth.signOut()
                router.push('/auth/login')
              }}>Eliminar cuenta</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}