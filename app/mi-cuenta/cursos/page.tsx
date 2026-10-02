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
  course: {
    id: string
    titulo: string
    imagen_url: string
    slug: string
  }
  terapeuta: {
    nombre_profesional: string
    slug: string
    whatsapp: string | null
    alias_pago: string | null
    cbu: string | null
    titular_cuenta: string | null
    banco: string | null
  } | null
  proximoEncuentro: { fecha_hora: string } | null
}

export default function MisCursosPage() {
  const router = useRouter()
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([])
  const [loading, setLoading] = useState(true)
  const [debugInfo, setDebugInfo] = useState('')
  const [datosAbiertos, setDatosAbiertos] = useState<string | null>(null)

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: persona, error: errorPersona } = await supabase
        .from('persons').select('id').eq('auth_user_id', user.id).maybeSingle()
      if (!persona) {
        setDebugInfo(`No se encontró una persona vinculada a esta cuenta. Error: ${errorPersona ? JSON.stringify(errorPersona) : 'ninguno'}`)
        setLoading(false); return
      }

      const { data: enrollments, error: errorEnroll } = await supabase
        .from('enrollments')
        .select('id, estado, modalidad, fecha_inicio, fecha_vencimiento, course_id')
        .eq('person_id', persona.id)
        .order('fecha_inicio', { ascending: false })

      if (errorEnroll) {
        setDebugInfo(`Error cargando inscripciones: ${JSON.stringify(errorEnroll)}`)
        setLoading(false); return
      }

      if (!enrollments || enrollments.length === 0) {
        setInscripciones([])
        setLoading(false); return
      }

      const courseIds = enrollments.map(e => e.course_id)
      const { data: cursos } = await supabase
        .from('courses').select('id, titulo, imagen_url, slug, user_id')
        .in('id', courseIds)

      const terapeutaIds = [...new Set((cursos || []).map(c => c.user_id))]
      const { data: terapeutas } = await supabase
        .from('therapist_profiles').select('user_id, nombre_profesional, slug, whatsapp, alias_pago, cbu, titular_cuenta, banco')
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
          course: curso as Inscripcion['course'],
          terapeuta: terapeuta ? { nombre_profesional: terapeuta.nombre_profesional, slug: terapeuta.slug, whatsapp: terapeuta.whatsapp, alias_pago: terapeuta.alias_pago, cbu: terapeuta.cbu, titular_cuenta: terapeuta.titular_cuenta, banco: terapeuta.banco } : null,
          proximoEncuentro,
        }
      }).filter(i => i.course)

      setInscripciones(combinado)
    } catch (e: any) {
      console.error(e)
      setDebugInfo(`Error inesperado: ${e?.message || JSON.stringify(e)}`)
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
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&display=swap');
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