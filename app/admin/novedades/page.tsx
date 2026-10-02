'use client'

import { useEffect, useState } from 'react'
import type React from 'react'
import { createClient } from '@/lib/supabase'
import { comprimirImagen } from '@/lib/comprimirImagen'

// solo para mostrar o no la página: el permiso real lo verifica el servidor
const ADMIN_EMAIL = 'priscilapinillo78@gmail.com'

type Novedad = { id: string; titulo: string; descripcion: string; tipo: string; imagen_url: string | null; link_url: string | null; publicada_at: string }
type Proxima = { id: string; titulo: string; descripcion: string; icono: string; etiqueta: string; color: string; orden: number; visible: boolean }
type Idea = { id: string; nombre: string | null; contenido: string; created_at: string }

const VACIO = { titulo: '', descripcion: '', tipo: 'nuevo', imagen_url: '', link_url: '', notificar: true }
const PROX_VACIA = { titulo: '', descripcion: '', icono: '✨', etiqueta: 'Próximamente', color: '#A78BFA' }
const COLORES = ['#A78BFA', '#6EE7B7', '#FCD34D', '#93C5FD', '#F9A8D4', '#E8D5A3']

const campo: React.CSSProperties = {width:'100%',padding:'10px 12px',borderRadius:'10px',border:'1px solid #E5E5E5',fontSize:'14px',fontFamily:'inherit',outline:'none',background:'white'}
const tarjeta: React.CSSProperties = {background:'white',border:'1px solid #E5E5E5',borderRadius:'16px',padding:'18px'}
const btnChico: React.CSSProperties = {fontSize:'12px',fontWeight:600,border:'none',borderRadius:'8px',padding:'6px 10px',cursor:'pointer',fontFamily:'inherit'}

export default function AdminNovedadesPage() {
  const [estado, setEstado] = useState<'cargando' | 'no' | 'si'>('cargando')
  const [userId, setUserId] = useState('')
  const [pestana, setPestana] = useState<'novedades' | 'proximas' | 'ideas'>('novedades')

  // novedades
  const [form, setForm] = useState(VACIO)
  const [lista, setLista] = useState<Novedad[]>([])
  const [publicando, setPublicando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [resultado, setResultado] = useState('')
  const [proximaALanzar, setProximaALanzar] = useState<Proxima | null>(null)

  // próximas
  const [proximas, setProximas] = useState<Proxima[]>([])
  const [nuevaProx, setNuevaProx] = useState(PROX_VACIA)
  const [editando, setEditando] = useState<Proxima | null>(null)
  const [guardandoProx, setGuardandoProx] = useState(false)

  // ideas
  const [ideas, setIdeas] = useState<Idea[]>([])

  useEffect(() => { iniciar() }, [])

  async function iniciar() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/auth/login'; return }
    if ((user.email || '').toLowerCase() !== ADMIN_EMAIL) { setEstado('no'); return }
    setUserId(user.id)
    setEstado('si')
    cargarLista()
    cargarProximas()
    cargarIdeas()
  }

  async function token() {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || ''
  }

  async function api(ruta: string, metodo: string, cuerpo?: any) {
    const res = await fetch(ruta, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    })
    return res.json().catch(() => ({ ok: false, motivo: 'respuesta_invalida' }))
  }

  // ── NOVEDADES
  async function cargarLista() {
    const supabase = createClient()
    const { data } = await supabase.from('novedades').select('*').order('publicada_at', { ascending: false }).limit(50)
    setLista(data || [])
  }

  async function subirImagen(file: File) {
    setSubiendo(true)
    try {
      const comprimida = await comprimirImagen(file, 1500)
      const supabase = createClient()
      const path = `${userId}/novedad-${Date.now()}.jpg`
      const { error } = await supabase.storage.from('avatars').upload(path, comprimida, { upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      setForm(prev => ({ ...prev, imagen_url: data.publicUrl }))
    } catch (e: any) {
      alert('No se pudo subir la imagen: ' + (e?.message || 'intentá de nuevo'))
    } finally { setSubiendo(false) }
  }

  async function publicar() {
    if (!form.titulo.trim()) { alert('Poné un título.'); return }
    const aviso = (form.notificar
      ? 'Se va a publicar y les va a llegar una notificación a todas las terapeutas con notificaciones activadas.'
      : 'Se va a publicar sin notificación.')
      + (proximaALanzar ? `\n\nTambién se va a sacar "${proximaALanzar.titulo}" de Próximas actualizaciones.` : '')
      + '\n\n¿Publicar?'
    if (!confirm(aviso)) return
    setPublicando(true)
    setResultado('')
    try {
      const r = await api('/api/admin/novedades', 'POST', form)
      if (!r.ok) { alert('No se pudo publicar: ' + (r.motivo || 'error')); return }
      let extra = ''
      if (proximaALanzar) {
        const b = await api('/api/admin/proximas', 'DELETE', { id: proximaALanzar.id })
        extra = b.ok ? ' La saqué de Próximas.' : ' (No se pudo sacar de Próximas: hacelo a mano.)'
        setProximaALanzar(null)
        cargarProximas()
      }
      setResultado((form.notificar
        ? `✓ Publicada. Notificación enviada a ${r.enviadas} terapeuta${r.enviadas === 1 ? '' : 's'}${r.fallidas ? ` (${r.fallidas} no la recibieron)` : ''}.`
        : '✓ Publicada sin notificación.') + extra)
      setForm(VACIO)
      cargarLista()
    } finally { setPublicando(false) }
  }

  async function borrarNovedad(id: string) {
    if (!confirm('¿Borrar esta novedad? Deja de verse en la página de Novedades.')) return
    const r = await api('/api/admin/novedades', 'DELETE', { id })
    if (!r.ok) { alert('No se pudo borrar.'); return }
    setLista(prev => prev.filter(n => n.id !== id))
  }

  // ── PRÓXIMAS
  async function cargarProximas() {
    const r = await api('/api/admin/proximas', 'GET')
    if (r.ok) setProximas(r.proximas || [])
  }

  async function crearProxima() {
    if (!nuevaProx.titulo.trim()) { alert('Poné un título.'); return }
    setGuardandoProx(true)
    try {
      const orden = proximas.length ? Math.max(...proximas.map(p => p.orden)) + 1 : 0
      const r = await api('/api/admin/proximas', 'POST', { ...nuevaProx, orden, visible: true })
      if (!r.ok) { alert('No se pudo guardar: ' + (r.motivo || 'error')); return }
      setNuevaProx(PROX_VACIA)
      cargarProximas()
    } finally { setGuardandoProx(false) }
  }

  async function guardarEdicion() {
    if (!editando) return
    if (!editando.titulo.trim()) { alert('El título no puede quedar vacío.'); return }
    setGuardandoProx(true)
    try {
      const r = await api('/api/admin/proximas', 'PATCH', editando)
      if (!r.ok) { alert('No se pudo guardar: ' + (r.motivo || 'error')); return }
      setEditando(null)
      cargarProximas()
    } finally { setGuardandoProx(false) }
  }

  async function cambiarVisible(p: Proxima) {
    const r = await api('/api/admin/proximas', 'PATCH', { id: p.id, visible: !p.visible })
    if (!r.ok) { alert('No se pudo cambiar.'); return }
    setProximas(prev => prev.map(x => x.id === p.id ? { ...x, visible: !p.visible } : x))
  }

  async function mover(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= proximas.length) return
    const a = proximas[i], b = proximas[j]
    // intercambia posiciones (usa el índice como orden para que no queden empates)
    const ra = await api('/api/admin/proximas', 'PATCH', { id: a.id, orden: j })
    const rb = await api('/api/admin/proximas', 'PATCH', { id: b.id, orden: i })
    if (!ra.ok || !rb.ok) alert('No se pudo reordenar del todo. Recargá la página.')
    cargarProximas()
  }

  async function borrarProxima(p: Proxima) {
    if (!confirm(`¿Borrar "${p.titulo}" de Próximas actualizaciones?`)) return
    const r = await api('/api/admin/proximas', 'DELETE', { id: p.id })
    if (!r.ok) { alert('No se pudo borrar.'); return }
    setProximas(prev => prev.filter(x => x.id !== p.id))
  }

  function lanzar(p: Proxima) {
    setProximaALanzar(p)
    setForm({ ...VACIO, titulo: p.titulo, descripcion: p.descripcion })
    setPestana('novedades')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── IDEAS
  async function cargarIdeas() {
    const r = await api('/api/admin/ideas', 'GET')
    if (r.ok) setIdeas(r.ideas || [])
  }

  async function borrarIdea(id: string) {
    if (!confirm('¿Borrar esta idea?')) return
    const r = await api('/api/admin/ideas', 'DELETE', { id })
    if (!r.ok) { alert('No se pudo borrar.'); return }
    setIdeas(prev => prev.filter(x => x.id !== id))
  }

  if (estado === 'cargando') return <div style={{padding:'40px',fontFamily:'sans-serif',color:'#737373'}}>Cargando…</div>
  if (estado === 'no') return (
    <div style={{padding:'60px 20px',fontFamily:'sans-serif',textAlign:'center'}}>
      <div style={{fontSize:'18px',fontWeight:700,marginBottom:'10px'}}>Esta página no existe</div>
      <a href="/dashboard" style={{color:'#7C3AED'}}>Volver al inicio</a>
    </div>
  )

  const pestanaBtn = (id: typeof pestana, texto: string) => (
    <button onClick={() => setPestana(id)}
      style={{...btnChico,padding:'9px 14px',fontSize:'13px',background: pestana === id ? '#7C3AED' : 'white',color: pestana === id ? 'white' : '#525252',border:'1px solid ' + (pestana === id ? '#7C3AED' : '#E5E5E5')}}>
      {texto}
    </button>
  )

  return (
    <div style={{minHeight:'100vh',background:'#FAFAFA',fontFamily:"'Inter',sans-serif",padding:'28px 18px 80px'}}>
      <div style={{maxWidth:'680px',margin:'0 auto'}}>
        <div style={{fontSize:'12px',fontWeight:700,letterSpacing:'2px',color:'#7C3AED',textTransform:'uppercase'}}>Solo vos</div>
        <h1 style={{fontSize:'24px',fontWeight:800,margin:'4px 0 16px'}}>Panel de Novedades</h1>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'18px'}}>
          {pestanaBtn('novedades', '✦ Novedades')}
          {pestanaBtn('proximas', `🗓️ Próximas (${proximas.filter(p => p.visible).length})`)}
          {pestanaBtn('ideas', `💡 Ideas recibidas (${ideas.length})`)}
          <a href="/roadmap" style={{marginLeft:'auto',alignSelf:'center',fontSize:'13px',color:'#7C3AED'}}>Ver la página →</a>
        </div>

        {/* ── NOVEDADES */}
        {pestana === 'novedades' && (<>
          <div style={{...tarjeta,display:'flex',flexDirection:'column',gap:'12px'}}>
            <div style={{fontSize:'15px',fontWeight:800}}>Publicar novedad</div>
            {proximaALanzar && (
              <div style={{fontSize:'12px',background:'#F4F0FF',color:'#5B21B6',padding:'10px 12px',borderRadius:'10px',display:'flex',gap:'8px',alignItems:'center'}}>
                <span style={{flex:1}}>🚀 Lanzando "{proximaALanzar.titulo}": al publicar se saca de Próximas.</span>
                <button onClick={() => { setProximaALanzar(null); setForm(VACIO) }} style={{...btnChico,background:'white',color:'#5B21B6'}}>Cancelar</button>
              </div>
            )}
            <label style={{fontSize:'12px',fontWeight:700}}>Título *
              <input style={{...campo,marginTop:'6px'}} maxLength={120} value={form.titulo} placeholder="Ej: Ya podés ver tus finanzas de meses anteriores"
                onChange={e => setForm({...form, titulo: e.target.value})}/>
            </label>
            <label style={{fontSize:'12px',fontWeight:700}}>Descripción
              <textarea style={{...campo,marginTop:'6px',minHeight:'110px',resize:'vertical'}} maxLength={1500} value={form.descripcion}
                placeholder="Contá qué cambió y cómo usarlo."
                onChange={e => setForm({...form, descripcion: e.target.value})}/>
            </label>
            <label style={{fontSize:'12px',fontWeight:700}}>Tipo
              <select style={{...campo,marginTop:'6px'}} value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                <option value="nuevo">✨ Nuevo</option>
                <option value="mejora">🛠️ Mejora</option>
                <option value="arreglo">🐛 Arreglo</option>
              </select>
            </label>
            <div style={{fontSize:'12px',fontWeight:700}}>Imagen (opcional, 820 x 312 px)
              <div style={{marginTop:'6px',display:'flex',gap:'10px',alignItems:'center',flexWrap:'wrap'}}>
                {form.imagen_url && <img src={form.imagen_url} alt="" style={{width:'160px',aspectRatio:'820/312',objectFit:'cover',borderRadius:'8px'}}/>}
                <label style={{fontSize:'13px',color:'#7C3AED',cursor:'pointer',fontWeight:600}}>
                  {subiendo ? 'Subiendo…' : form.imagen_url ? 'Cambiar imagen' : 'Subir imagen'}
                  <input type="file" accept="image/*" style={{display:'none'}} disabled={subiendo}
                    onChange={e => { const f = e.target.files?.[0]; if (f) subirImagen(f); e.target.value = '' }}/>
                </label>
                {form.imagen_url && <button onClick={() => setForm({...form, imagen_url: ''})} style={{...btnChico,color:'#EF4444',background:'none'}}>Quitar</button>}
              </div>
            </div>
            <label style={{fontSize:'12px',fontWeight:700}}>Link del botón "Probarlo" (opcional)
              <input style={{...campo,marginTop:'6px'}} value={form.link_url} placeholder="Ej: /finances"
                onChange={e => setForm({...form, link_url: e.target.value})}/>
            </label>
            <label style={{display:'flex',alignItems:'center',gap:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer'}}>
              <input type="checkbox" checked={form.notificar} onChange={e => setForm({...form, notificar: e.target.checked})}/>
              Mandar notificación al celular
            </label>
            <button onClick={publicar} disabled={publicando || subiendo}
              style={{padding:'13px',border:'none',borderRadius:'12px',background:'linear-gradient(135deg,#8B5CF6,#7C3AED)',color:'white',fontWeight:700,fontSize:'14px',cursor:'pointer',opacity: publicando ? 0.6 : 1}}>
              {publicando ? 'Publicando…' : '✦ Publicar novedad'}
            </button>
            {resultado && <div style={{fontSize:'13px',color:'#059669',fontWeight:600}}>{resultado}</div>}
          </div>

          <h2 style={{fontSize:'16px',fontWeight:800,margin:'26px 0 10px'}}>Publicadas</h2>
          {lista.length === 0 ? <div style={{fontSize:'13px',color:'#737373'}}>Todavía no hay novedades.</div> : (
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {lista.map(n => (
                <div key={n.id} style={{...tarjeta,padding:'12px 14px',display:'flex',gap:'10px',alignItems:'center'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'14px',fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{n.titulo}</div>
                    <div style={{fontSize:'11px',color:'#A3A3A3'}}>{new Date(n.publicada_at).toLocaleString('es-AR')} · {n.tipo}</div>
                  </div>
                  <button onClick={() => borrarNovedad(n.id)} style={{...btnChico,color:'#EF4444',background:'#FEF2F2'}}>Borrar</button>
                </div>
              ))}
            </div>
          )}
        </>)}

        {/* ── PRÓXIMAS */}
        {pestana === 'proximas' && (<>
          <div style={{fontSize:'12px',color:'#737373',marginBottom:'12px',lineHeight:1.5}}>
            Lo que ven las terapeutas en "Próximas actualizaciones". Ocultá las que no vas a hacer, ordenalas con las flechas y, cuando la lances, tocá <strong>🚀 Ya la lancé</strong>: se arma la novedad y se saca de esta lista.
          </div>
          {proximas.length === 0 && <div style={{fontSize:'13px',color:'#737373',marginBottom:'12px'}}>No hay próximas actualizaciones cargadas.</div>}
          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            {proximas.map((p, i) => editando?.id === p.id ? (
              <div key={p.id} style={{...tarjeta,display:'flex',flexDirection:'column',gap:'8px',borderColor:'#C4B5FD'}}>
                <div style={{display:'flex',gap:'8px'}}>
                  <input style={{...campo,width:'64px',textAlign:'center'}} maxLength={8} value={editando.icono} onChange={e => setEditando({...editando, icono: e.target.value})}/>
                  <input style={campo} maxLength={120} value={editando.titulo} onChange={e => setEditando({...editando, titulo: e.target.value})}/>
                </div>
                <textarea style={{...campo,minHeight:'80px',resize:'vertical'}} maxLength={600} value={editando.descripcion} onChange={e => setEditando({...editando, descripcion: e.target.value})}/>
                <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
                  <input style={{...campo,width:'160px'}} maxLength={30} value={editando.etiqueta} placeholder="Próximamente" onChange={e => setEditando({...editando, etiqueta: e.target.value})}/>
                  {COLORES.map(c => (
                    <button key={c} onClick={() => setEditando({...editando, color: c})} aria-label={`Color ${c}`}
                      style={{width:'24px',height:'24px',borderRadius:'50%',background:c,border: editando.color === c ? '3px solid #0A0A0A' : '1px solid #E5E5E5',cursor:'pointer'}}/>
                  ))}
                </div>
                <div style={{display:'flex',gap:'8px'}}>
                  <button onClick={guardarEdicion} disabled={guardandoProx} style={{...btnChico,background:'#7C3AED',color:'white',padding:'8px 14px'}}>{guardandoProx ? 'Guardando…' : 'Guardar'}</button>
                  <button onClick={() => setEditando(null)} style={{...btnChico,background:'#F5F5F5',color:'#525252',padding:'8px 14px'}}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div key={p.id} style={{...tarjeta,padding:'12px 14px',display:'flex',gap:'10px',alignItems:'center',opacity: p.visible ? 1 : 0.5}}>
                <div style={{display:'flex',flexDirection:'column',gap:'2px'}}>
                  <button onClick={() => mover(i, -1)} disabled={i === 0} style={{...btnChico,padding:'2px 6px',background:'#F5F5F5'}} aria-label="Subir">▲</button>
                  <button onClick={() => mover(i, 1)} disabled={i === proximas.length - 1} style={{...btnChico,padding:'2px 6px',background:'#F5F5F5'}} aria-label="Bajar">▼</button>
                </div>
                <div style={{fontSize:'20px'}}>{p.icono}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:'14px',fontWeight:700}}>{p.titulo}</div>
                  <div style={{fontSize:'11px',color:'#A3A3A3'}}>{p.visible ? `Visible · ${p.etiqueta}` : 'Oculta (no la ven las terapeutas)'}</div>
                </div>
                <div style={{display:'flex',gap:'6px',flexWrap:'wrap',justifyContent:'flex-end'}}>
                  <button onClick={() => lanzar(p)} style={{...btnChico,background:'#DCFCE7',color:'#166534'}}>🚀 Ya la lancé</button>
                  <button onClick={() => setEditando(p)} style={{...btnChico,background:'#F4F0FF',color:'#5B21B6'}}>Editar</button>
                  <button onClick={() => cambiarVisible(p)} style={{...btnChico,background:'#F5F5F5',color:'#525252'}}>{p.visible ? 'Ocultar' : 'Mostrar'}</button>
                  <button onClick={() => borrarProxima(p)} style={{...btnChico,background:'#FEF2F2',color:'#EF4444'}}>Borrar</button>
                </div>
              </div>
            ))}
          </div>

          <div style={{...tarjeta,marginTop:'18px',display:'flex',flexDirection:'column',gap:'8px'}}>
            <div style={{fontSize:'14px',fontWeight:800}}>Agregar próxima actualización</div>
            <div style={{display:'flex',gap:'8px'}}>
              <input style={{...campo,width:'64px',textAlign:'center'}} maxLength={8} value={nuevaProx.icono} onChange={e => setNuevaProx({...nuevaProx, icono: e.target.value})}/>
              <input style={campo} maxLength={120} value={nuevaProx.titulo} placeholder="Título" onChange={e => setNuevaProx({...nuevaProx, titulo: e.target.value})}/>
            </div>
            <textarea style={{...campo,minHeight:'80px',resize:'vertical'}} maxLength={600} value={nuevaProx.descripcion} placeholder="Qué va a poder hacer la terapeuta" onChange={e => setNuevaProx({...nuevaProx, descripcion: e.target.value})}/>
            <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
              <input style={{...campo,width:'160px'}} maxLength={30} value={nuevaProx.etiqueta} onChange={e => setNuevaProx({...nuevaProx, etiqueta: e.target.value})}/>
              {COLORES.map(c => (
                <button key={c} onClick={() => setNuevaProx({...nuevaProx, color: c})} aria-label={`Color ${c}`}
                  style={{width:'24px',height:'24px',borderRadius:'50%',background:c,border: nuevaProx.color === c ? '3px solid #0A0A0A' : '1px solid #E5E5E5',cursor:'pointer'}}/>
              ))}
            </div>
            <button onClick={crearProxima} disabled={guardandoProx} style={{padding:'11px',border:'none',borderRadius:'10px',background:'#7C3AED',color:'white',fontWeight:700,cursor:'pointer'}}>
              {guardandoProx ? 'Guardando…' : '+ Agregar'}
            </button>
          </div>
        </>)}

        {/* ── IDEAS */}
        {pestana === 'ideas' && (
          ideas.length === 0 ? <div style={{fontSize:'13px',color:'#737373'}}>Todavía no llegaron ideas.</div> : (
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {ideas.map(idea => (
                <div key={idea.id} style={{...tarjeta,padding:'14px 16px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',gap:'10px',marginBottom:'6px'}}>
                    <div style={{fontSize:'13px',fontWeight:700}}>{idea.nombre || 'Anónimo'}</div>
                    <div style={{fontSize:'11px',color:'#A3A3A3'}}>{new Date(idea.created_at).toLocaleString('es-AR')}</div>
                  </div>
                  <div style={{fontSize:'14px',color:'#404040',lineHeight:1.6,whiteSpace:'pre-line'}}>{idea.contenido}</div>
                  <div style={{display:'flex',gap:'6px',marginTop:'10px'}}>
                    <button onClick={() => { setNuevaProx({ ...PROX_VACIA, titulo: idea.contenido.slice(0, 80) }); setPestana('proximas') }}
                      style={{...btnChico,background:'#F4F0FF',color:'#5B21B6'}}>→ Pasar a Próximas</button>
                    <button onClick={() => borrarIdea(idea.id)} style={{...btnChico,background:'#FEF2F2',color:'#EF4444'}}>Borrar</button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}