'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { LogOut, Clock } from 'lucide-react'

type Inscripcion = {
  id: string
  estado: string
  fecha_inicio: string
  course: {
    id: string
    titulo: string
    imagen_url: string
    slug: string
  }
  terapeuta: {
    nombre_profesional: string
    slug: string
  } | null
  proximoEncuentro: { fecha_hora: string } | null
}

export default function MisCursosPage() {
  const router = useRouter()
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([])
  const [loading, setLoading] = useState(true)
  const [debugInfo, setDebugInfo] = useState('')

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
        .select('id, estado, fecha_inicio, course_id')
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
        .from('therapist_profiles').select('user_id, nombre_profesional, slug')
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
          fecha_inicio: e.fecha_inicio,
          course: curso as Inscripcion['course'],
          terapeuta: terapeuta ? { nombre_profesional: terapeuta.nombre_profesional, slug: terapeuta.slug } : null,
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
        .mc-card.pendiente{cursor:default;opacity:0.75}
        .mc-card-img{width:100%;height:140px;object-fit:cover;background:#F0EBFF}
        .mc-card-body{padding:14px 16px}
        .mc-card-titulo{font-size:14px;font-weight:700;color:#0A0A0A;margin-bottom:4px}
        .mc-card-terapeuta{font-size:12px;color:#8B5CF6;margin-bottom:10px}
        .mc-badge{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px}
        .mc-badge.activa{background:#DCFCE7;color:#166534}
        .mc-badge.pendiente_pago{background:#FEF9C3;color:#92400E}
        .mc-ver-btn{margin-top:10px;font-size:12px;font-weight:700;color:#8B5CF6}
        .mc-empty{text-align:center;padding:60px 20px;color:#737373}
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
            {inscripciones.map(i => (
              <div key={i.id}
                className={`mc-card${i.estado !== 'activa' ? ' pendiente' : ''}`}
                onClick={() => { if (i.estado === 'activa') router.push(`/mi-cuenta/cursos/${i.course.id}`) }}>
                {i.course.imagen_url && <img src={i.course.imagen_url} className="mc-card-img"/>}
                <div className="mc-card-body">
                  <div className="mc-card-titulo">{i.course.titulo}</div>
                  {i.terapeuta && <div className="mc-card-terapeuta">{i.terapeuta.nombre_profesional}</div>}
                  {i.estado === 'activa' ? (<>
                    <span className="mc-badge activa">✓ Acceso activo</span>
                    {i.proximoEncuentro && (
                      <div style={{fontSize:'11px',fontWeight:700,color:'#EC4899',marginTop:'6px'}}>
                        🔴 Encuentro: {new Date(i.proximoEncuentro.fecha_hora).toLocaleDateString('es-AR', { day:'numeric', month:'short' })}
                      </div>
                    )}
                    <div className="mc-ver-btn">Ver curso →</div>
                  </>) : (
                    <span className="mc-badge pendiente_pago">⏳ Esperando confirmación de pago</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
