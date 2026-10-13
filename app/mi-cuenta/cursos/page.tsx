'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { LogOut, Clock } from 'lucide-react'
import { tieneAccesoCurso } from '@/lib/acceso'

type Inscripcion = {
  id: string
  estado: string
  modalidad: string
  fecha_inicio: string
  fecha_vencimiento: string | null
  suscripcion_estado: string | null
  suscripcion_link: string | null
  proximo_cobro: string | null
  mp_preapproval_id: string | null
  suscripcion_aviso: string | null
  course: {
    id: string
    titulo: string
    imagen_url: string
    slug: string
    cobro_automatico?: boolean
  }
  terapeuta: {
    nombre_profesional: string
    slug: string
    whatsapp: string | null
    alias_pago: string | null
    cbu: string | null
    titular_cuenta: string | null
    banco: string | null
    mp_activo?: boolean
  } | null
  proximoEncuentro: { fecha_hora: string } | null
}

export default function MisCursosPage() {
  const router = useRouter()
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([])
  const [loading, setLoading] = useState(true)
  const [debugInfo, setDebugInfo] = useState('')
  const [datosAbiertos, setDatosAbiertos] = useState<string | null>(null)
  const [accionando, setAccionando] = useState<string | null>(null)
  const [mensajes, setMensajes] = useState<Record<string, string>>({})

  useEffect(() => { cargarDatos(true) }, [])

  const fechaLarga = (f: string | null) => f ? new Date(f).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' }) : ''

  async function tokenSesion() {
    const { data: { session } } = await createClient().auth.getSession()
    return session?.access_token
  }

  // le pregunta a Mercado Pago cómo están las suscripciones que lo necesitan (cobros nuevos, rechazos, vencimientos)
  async function refrescarSuscripciones(lista: Inscripcion[]) {
    const tresDias = Date.now() + 3 * 86400000
    const revisar = lista.filter(i => i.mp_preapproval_id && (
      ['pendiente', 'esperando_cobro', 'con_problemas', 'rechazada', 'activa'].includes(i.suscripcion_estado || '') &&
      (i.suscripcion_estado !== 'activa' || !i.fecha_vencimiento || new Date(i.fecha_vencimiento).getTime() < tresDias)
    )).slice(0, 5)
    if (revisar.length === 0) return false
    const accessToken = await tokenSesion()
    for (const i of revisar) {
      try {
        await fetch('/api/cursos/suscripcion/estado', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enrollmentId: i.id, accessToken }),
        })
      } catch (e) { console.error(e) }
    }
    return true
  }

  async function irASuscripcion(i: Inscripcion) {
    setAccionando(i.id)
    setMensajes(prev => ({ ...prev, [i.id]: '' }))
    let seVa = false
    try {
      for (let intento = 0; intento < 4; intento++) {
        const res = await fetch('/api/cursos/suscripcion/crear', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enrollmentId: i.id, accessToken: await tokenSesion() }),
        })
        const r = await res.json().catch(() => ({ estado: 'error' }))
        if (r.link) { seVa = true; window.location.href = r.link; return }
        if (r.estado === 'en_proceso') { await new Promise(ok => setTimeout(ok, 2500)); continue }
        if (r.estado === 'activa' || r.estado === 'esperando_cobro') { await cargarDatos(false); return }
        setMensajes(prev => ({ ...prev, [i.id]: r.mensaje || 'No se pudo conectar con Mercado Pago. Probá de nuevo.' }))
        return
      }
      setMensajes(prev => ({ ...prev, [i.id]: 'Mercado Pago está tardando. Probá de nuevo en un momento.' }))
    } finally { if (!seVa) setAccionando(null) }
  }

  async function cancelarSuscripcion(i: Inscripcion) {
    const hasta = fechaLarga(i.fecha_vencimiento)
    if (!confirm(`¿Cancelar la renovación automática de "${i.course.titulo}"?\n\nNo se te va a cobrar más.${hasta ? ` Seguís teniendo acceso hasta el ${hasta}.` : ''}`)) return
    setAccionando(i.id)
    try {
      const res = await fetch('/api/cursos/suscripcion/cancelar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId: i.id, accessToken: await tokenSesion() }),
      })
      const r = await res.json().catch(() => ({ ok: false }))
      if (!r.ok) { setMensajes(prev => ({ ...prev, [i.id]: r.mensaje || 'No se pudo cancelar. Probá de nuevo en unos minutos.' })); return }
      await cargarDatos(false)
    } finally { setAccionando(null) }
  }

  async function cargarDatos(revisarMP = false) {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: persona, error: errorPersona } = await supabase
        .from('persons').select('id').eq('auth_user_id', user.id).maybeSingle()
      if (!persona) {
        if (errorPersona) console.error('Error buscando la persona:', errorPersona)
        setDebugInfo('No encontramos cursos asociados a esta cuenta. Si compraste con otro email, cerrá sesión y entrá con ese.')
        setLoading(false); return
      }

      const { data: enrollments, error: errorEnroll } = await supabase
        .from('enrollments')
        .select('id, estado, modalidad, fecha_inicio, fecha_vencimiento, course_id, suscripcion_estado, suscripcion_link, proximo_cobro, mp_preapproval_id, suscripcion_aviso')
        .eq('person_id', persona.id)
        .order('fecha_inicio', { ascending: false })

      if (errorEnroll) {
        console.error('Error cargando inscripciones:', errorEnroll)
        setDebugInfo('No pudimos cargar tus cursos. Revisá tu conexión y recargá la página.')
        setLoading(false); return
      }

      if (!enrollments || enrollments.length === 0) {
        setInscripciones([])
        setLoading(false); return
      }

      const courseIds = enrollments.map(e => e.course_id)
      const { data: cursos } = await supabase
        .from('courses').select('id, titulo, imagen_url, slug, user_id, cobro_automatico')
        .in('id', courseIds)

      const terapeutaIds = [...new Set((cursos || []).map(c => c.user_id))]
      const { data: terapeutas } = await supabase
        .from('therapist_profiles').select('user_id, nombre_profesional, slug, whatsapp, alias_pago, cbu, titular_cuenta, banco, mp_activo')
        .in('user_id', terapeutaIds)

        const { data: encuentros } = await supabase
        .from('course_live_sessions').select('course_id, fecha_hora')
        .in('course_id', courseIds).gte('fecha_hora', new Date().toISOString())
        .order('fecha_hora')

      const combinado = enrollments.map(e => {
        const curso = cursos?.find(c => c.id === e.course_id)
        const terapeuta = terapeutas?.find(t => t.user_id === curso?.user_id)
        const proximoEncuentro = encuentros?.find(en => en.course_id === e.course_id) || null
        return {
          id: e.id,
          estado: e.estado,
          modalidad: e.modalidad,
          fecha_inicio: e.fecha_inicio,
          fecha_vencimiento: e.fecha_vencimiento,
          suscripcion_estado: e.suscripcion_estado || null,
          suscripcion_link: e.suscripcion_link || null,
          proximo_cobro: e.proximo_cobro || null,
          mp_preapproval_id: e.mp_preapproval_id || null,
          suscripcion_aviso: e.suscripcion_aviso || null,
          course: curso as Inscripcion['course'],
          terapeuta: terapeuta ? { nombre_profesional: terapeuta.nombre_profesional, slug: terapeuta.slug, whatsapp: terapeuta.whatsapp, alias_pago: terapeuta.alias_pago, cbu: terapeuta.cbu, titular_cuenta: terapeuta.titular_cuenta, banco: terapeuta.banco, mp_activo: terapeuta.mp_activo } : null,
          proximoEncuentro,
        }
      }).filter(i => i.course)

      setInscripciones(combinado)
      // si alguna suscripción necesita revisarse, le preguntamos a Mercado Pago y recargamos una sola vez
      if (revisarMP && await refrescarSuscripciones(combinado)) { await cargarDatos(false); return }
    } catch (e: any) {
      console.error(e)
      setDebugInfo('Hubo un problema al cargar tus cursos. Recargá la página.')
    } finally { setLoading(false) }
  }

  async function cerrarSesion() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:'14px',color:'#6B7280',fontFamily:'sans-serif'}}>
      Cargando...
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#FAFAFA',fontFamily:"'Geist',sans-serif"}}>
      <style>{`
        
        *{box-sizing:border-box;margin:0;padding:0}
        .mc-nav{display:flex;justify-content:space-between;align-items:center;padding:16px 24px;background:white;border-bottom:1px solid #E5E5E5}
        .mc-logo{font-size:18px;font-weight:900;color:#0A0A0A}
        .mc-logo span{color:#8B5CF6}
        .mc-logout{display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;border:1px solid #E5E5E5;background:white;font-size:12px;font-weight:600;color:#525252;cursor:pointer;font-family:inherit}
        .mc-wrap{max-width:900px;margin:0 auto;padding:32px 20px}
        .mc-titulo{font-size:24px;font-weight:800;color:#0A0A0A;margin-bottom:24px}
        .mc-grid{display:grid;grid-template-columns:1fr;gap:14px}
        @media(min-width:640px){ .mc-grid{grid-template-columns:1fr 1fr} }
        .mc-card{background:white;border:1px solid #E5E5E5;border-radius:14px;overflow:hidden;cursor:pointer;transition:transform 0.15s}
        .mc-card:hover{transform:translateY(-2px)}
        .mc-card.pendiente{cursor:default}
        .mc-card.pendiente .mc-card-img{opacity:0.6}
        .mc-btn-completar{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;padding:8px 14px;border-radius:8px;background:#8B5CF6;color:white;text-decoration:none}
        .mc-pendiente-txt{font-size:12px;color:#525252;line-height:1.5;margin-top:8px}
        .mc-card-img{width:100%;height:140px;object-fit:cover;background:#F0EBFF}
        .mc-card-body{padding:14px 16px}
        .mc-card-titulo{font-size:14px;font-weight:700;color:#0A0A0A;margin-bottom:4px}
        .mc-card-terapeuta{font-size:12px;color:#8B5CF6;margin-bottom:10px}
        .mc-badge{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px}
        .mc-badge.activa{background:#DCFCE7;color:#166534}
        .mc-badge.pendiente_pago{background:#FEF9C3;color:#92400E}
        .mc-ver-btn{margin-top:10px;font-size:12px;font-weight:700;color:#8B5CF6}
        .mc-empty{text-align:center;padding:60px 20px;color:#737373}
        .mc-btn-datos{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;padding:7px 12px;border-radius:8px;background:#F0EBFF;color:#6D28D9;border:none;cursor:pointer;font-family:inherit}
        .mc-datos-pago{margin-top:10px;padding:12px;background:#FAFAFA;border:1px solid #E5E5E5;border-radius:10px;font-size:12px}
        .mc-datos-row{display:flex;justify-content:space-between;padding:4px 0}
        .mc-sus{margin-top:10px;padding:9px 11px;border-radius:9px;background:#F5F3FF;color:#5B21B6;font-size:11.5px;line-height:1.5;cursor:default}
        .mc-sus.alerta{background:#FFFBEB;color:#92400E}
        .mc-link{display:inline;margin-left:6px;background:none;border:none;padding:0;color:inherit;font-weight:700;text-decoration:underline;cursor:pointer;font-family:inherit;font-size:11.5px}
        .mc-link:disabled{opacity:.6;cursor:default}
      `}</style>

      <nav className="mc-nav">
        <div className="mc-logo">Luma<span>.</span></div>
        <button className="mc-logout" onClick={cerrarSesion}><LogOut size={13}/> Cerrar sesión</button>
      </nav>

      <div className="mc-wrap">
        <h1 className="mc-titulo">Mis cursos</h1>

        {debugInfo && (
          <div style={{background:'#FEF3C7',padding:'14px',borderRadius:'8px',fontSize:'12px',marginBottom:'20px',whiteSpace:'pre-wrap'}}>{debugInfo}</div>
        )}

        {inscripciones.length === 0 ? (
          <div className="mc-empty">Todavía no compraste ningún curso.</div>
        ) : (
          <div className="mc-grid">
            {inscripciones.map(i => {
              const acceso = tieneAccesoCurso({ estado: i.estado, modalidad: i.modalidad, fecha_vencimiento: i.fecha_vencimiento })
              return (
              <div key={i.id}
                className={`mc-card${!acceso ? ' pendiente' : ''}`}
                onClick={() => { if (acceso) router.push(`/mi-cuenta/cursos/${i.course.id}`) }}>
                {i.course.imagen_url && <img src={i.course.imagen_url} className="mc-card-img"/>}
                <div className="mc-card-body">
                  <div className="mc-card-titulo">{i.course.titulo}</div>
                  {i.terapeuta && <div className="mc-card-terapeuta">{i.terapeuta.nombre_profesional}</div>}
                  {acceso ? (<>
                    <span className="mc-badge activa">✓ Acceso activo</span>
                    {i.proximoEncuentro && (
                      <div style={{fontSize:'11px',fontWeight:700,color:'#EC4899',marginTop:'6px'}}>
                        🔴 Encuentro: {new Date(i.proximoEncuentro.fecha_hora).toLocaleDateString('es-AR', { day:'numeric', month:'short' })}
                      </div>
                    )}
                    <div className="mc-ver-btn">Ver curso →</div>
                    {(i.suscripcion_estado === 'activa' || i.suscripcion_estado === 'esperando_cobro') && (
                      <div className="mc-sus" onClick={e => e.stopPropagation()}>
                        🔁 Renovación automática{i.proximo_cobro ? ` · próximo cobro: ${fechaLarga(i.proximo_cobro)}` : ''}
                        <button className="mc-link" disabled={accionando === i.id} onClick={() => cancelarSuscripcion(i)}>
                          {accionando === i.id ? 'Cancelando…' : 'Cancelar'}
                        </button>
                      </div>
                    )}
                    {i.suscripcion_aviso && ['activa', 'esperando_cobro', 'con_problemas'].includes(i.suscripcion_estado || '') && (
                      <div className="mc-sus alerta" onClick={e => e.stopPropagation()}>📣 {i.suscripcion_aviso}</div>
                    )}
                    {i.suscripcion_estado === 'con_problemas' && (
                      <div className="mc-sus alerta" onClick={e => e.stopPropagation()}>
                        ⚠️ No pudimos cobrar tu cuota. Actualizá tu tarjeta en Mercado Pago (Tu perfil → Suscripciones). Tenés acceso hasta el {fechaLarga(i.fecha_vencimiento)}.
                      </div>
                    )}
                    {i.suscripcion_estado === 'cancelada' && i.modalidad === 'suscripcion' && (
                      <div className="mc-sus" onClick={e => e.stopPropagation()}>Renovación automática cancelada · acceso hasta el {fechaLarga(i.fecha_vencimiento)}</div>
                    )}
                    {i.modalidad === 'suscripcion' && i.course.cobro_automatico && i.terapeuta?.mp_activo && !['activa', 'esperando_cobro', 'con_problemas', 'pendiente', 'creando'].includes(i.suscripcion_estado || '') && (
                      <div className="mc-sus" onClick={e => e.stopPropagation()}>
                        ¿Querés que se renueve solo? El primer cobro es el día que vence tu acceso.
                        <button className="mc-link" disabled={accionando === i.id} onClick={() => irASuscripcion(i)}>
                          {accionando === i.id ? 'Preparando…' : 'Activar renovación automática'}
                        </button>
                      </div>
                    )}
                    {mensajes[i.id] && <div className="mc-sus alerta" onClick={e => e.stopPropagation()}>{mensajes[i.id]}</div>}
                  </>) : i.suscripcion_estado === 'esperando_cobro' ? (<>
                    <span className="mc-badge pendiente_pago">⏳ Confirmando tu primer cobro</span>
                    <div className="mc-pendiente-txt">Tu suscripción está activa. El acceso se habilita apenas Mercado Pago acredite el cobro (suele tardar unos minutos). No hace falta que pagues de nuevo.</div>
                  </>) : i.suscripcion_estado === 'pendiente' || i.suscripcion_estado === 'rechazada' ? (<>
                    <span className="mc-badge pendiente_pago">{i.suscripcion_estado === 'rechazada' ? '⚠️ Tarjeta rechazada' : '⏳ Suscripción sin completar'}</span>
                    <div className="mc-pendiente-txt">{i.suscripcion_estado === 'rechazada' ? 'El primer cobro fue rechazado y no se te cobró nada. Podés probar con otra tarjeta.' : 'Todavía no terminaste en Mercado Pago. No se te cobró nada.'}</div>
                    <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'10px'}} onClick={e => e.stopPropagation()}>
                      <button className="mc-btn-completar" style={{border:'none',cursor:'pointer',fontFamily:'inherit'}} disabled={accionando === i.id} onClick={() => irASuscripcion(i)}>
                        {accionando === i.id ? 'Preparando…' : i.suscripcion_estado === 'rechazada' ? 'Probar con otra tarjeta →' : 'Completar ahora →'}
                      </button>
                    </div>
                    {mensajes[i.id] && <div className="mc-sus alerta" onClick={e => e.stopPropagation()}>{mensajes[i.id]}</div>}
                  </>) : i.suscripcion_estado === 'con_problemas' ? (<>
                    <span className="mc-badge pendiente_pago">⚠️ Cuota sin cobrar</span>
                    <div className="mc-pendiente-txt">Mercado Pago no pudo cobrar tu cuota y sigue intentando. Actualizá tu tarjeta en Mercado Pago (Tu perfil → Suscripciones): cuando se cobre, el acceso vuelve solo.</div>
                  </>) : i.estado !== 'activa' ? (<>
                    <span className="mc-badge pendiente_pago">⏳ Pago pendiente</span>
                    <div className="mc-pendiente-txt">
                      Si ya transferiste, {i.terapeuta?.nombre_profesional || 'tu terapeuta'} lo confirma en breve. Si no llegaste a pagar, podés completarlo ahora.
                    </div>
                    <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'10px'}}>
                      {i.terapeuta?.slug && i.course.slug && (
                        <a className="mc-btn-completar" href={`/p/${i.terapeuta.slug}/cursos/${i.course.slug}/checkout`}
                          onClick={e => e.stopPropagation()}>
                          Completar pago →
                        </a>
                      )}
                      {i.terapeuta?.whatsapp && (
                        <a href={`https://wa.me/${i.terapeuta.whatsapp.replace(/\D/g,'').replace(/^0+/,'')}?text=${encodeURIComponent(`Hola! Te paso el comprobante de mi inscripción a "${i.course.titulo}".`)}`}
                          target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{display:'inline-flex',alignItems:'center',gap:'6px',fontSize:'11px',fontWeight:700,padding:'7px 12px',borderRadius:'8px',background:'#25D366',color:'white',textDecoration:'none'}}>
                          💬 Enviar comprobante
                        </a>
                      )}
                    </div>
                  </>) : (<>
                    <span className="mc-badge pendiente_pago">⚠️ Acceso vencido</span>
                    {i.modalidad === 'suscripcion' && i.course.cobro_automatico && i.terapeuta?.mp_activo && (
                      <div style={{marginTop:'10px'}} onClick={e => e.stopPropagation()}>
                        <button className="mc-btn-completar" style={{border:'none',cursor:'pointer',fontFamily:'inherit'}} disabled={accionando === i.id} onClick={() => irASuscripcion(i)}>
                          {accionando === i.id ? 'Preparando…' : '🔁 Suscribirme de nuevo'}
                        </button>
                        {mensajes[i.id] && <div className="mc-sus alerta">{mensajes[i.id]}</div>}
                      </div>
                    )}
                    <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'10px'}}>
                      {(i.terapeuta?.alias_pago || i.terapeuta?.cbu) && (
                        <button className="mc-btn-datos"
                          onClick={e => { e.stopPropagation(); setDatosAbiertos(datosAbiertos === i.id ? null : i.id) }}>
                          🏦 Ver datos de pago
                        </button>
                      )}
                      {i.terapeuta?.whatsapp && (
                        <a href={`https://wa.me/${i.terapeuta.whatsapp.replace(/\D/g,'').replace(/^0+/,'')}?text=${encodeURIComponent(`Hola! Te paso el comprobante del próximo mes de "${i.course.titulo}" para que me renueves el acceso.`)}`}
                          target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{display:'inline-flex',alignItems:'center',gap:'6px',fontSize:'11px',fontWeight:700,padding:'7px 12px',borderRadius:'8px',background:'#25D366',color:'white',textDecoration:'none'}}>
                          💬 Enviar comprobante
                        </a>
                      )}
                    </div>
                    {datosAbiertos === i.id && (
                      <div className="mc-datos-pago" onClick={e => e.stopPropagation()}>
                        {i.terapeuta?.alias_pago && <div className="mc-datos-row"><span>Alias</span><strong>{i.terapeuta.alias_pago}</strong></div>}
                        {i.terapeuta?.cbu && <div className="mc-datos-row"><span>CBU</span><strong>{i.terapeuta.cbu}</strong></div>}
                        {i.terapeuta?.titular_cuenta && <div className="mc-datos-row"><span>Titular</span><strong>{i.terapeuta.titular_cuenta}</strong></div>}
                        {i.terapeuta?.banco && <div className="mc-datos-row"><span>Banco</span><strong>{i.terapeuta.banco}</strong></div>}
                      </div>
                    )}
                  </>)}
                </div>
              </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}