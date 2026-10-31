'use client'

import { useEffect, useState, useContext, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { Plus, BookOpen, Edit2, Download, Pause, Tag } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { PlanCursos } from '@/lib/planCursos'

type Curso = {
  id: string
  titulo: string
  descripcion_corta: string
  imagen_url: string
  precio: number
  precio_original: number | null
  modalidad: string
  estado: string
  slug: string
  created_at: string
  tipo?: string
}

export default function CoursesPage() {
  const [cursos, setCursos] = useState<Curso[]>([])
  const [pendientesPorCurso, setPendientesPorCurso] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { pausa } = useContext(PlanCursos)
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => { cargarCursos() }, [])
  // el menú "Nuevo" se cierra tocando afuera o con Escape (sin crear nada)
  useEffect(() => {
    if (!menu) return
    const fuera = (e: MouseEvent | TouchEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false) }
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false) }
    document.addEventListener('mousedown', fuera); document.addEventListener('touchstart', fuera); document.addEventListener('keydown', tecla)
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('touchstart', fuera); document.removeEventListener('keydown', tecla) }
  }, [menu])
  
  async function cargarCursos() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/auth/login'; return }
      const { data } = await supabase
        .from('courses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (data) {
        setCursos(data)
        const { data: pendientes } = await supabase
          .from('enrollments')
          .select('course_id')
          .eq('terapeuta_id', user.id)
          .eq('estado', 'pendiente_pago')
        if (pendientes) {
          const conteo: Record<string, number> = {}
          pendientes.forEach(p => { conteo[p.course_id] = (conteo[p.course_id] || 0) + 1 })
          setPendientesPorCurso(conteo)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }
  const borradores = cursos.filter(c => c.estado === 'borrador')
  const publicados = cursos.filter(c => c.estado === 'publicado')
  const archivados = cursos.filter(c => c.estado === 'archivado')

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'var(--text-muted)',fontSize:'14px'}}>
      Cargando cursos...
    </div>
  )

  return (
    <div style={{padding:'20px',paddingBottom:'100px',maxWidth:'900px',margin:'0 auto'}}>
      <style>{`
        .curso-card{background:var(--bg-card);border:0.5px solid var(--border-light);border-radius:16px;overflow:hidden;transition:all 0.2s;cursor:pointer}
        .curso-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px var(--shadow)}
        .curso-img{width:100%;height:140px;object-fit:cover;background:linear-gradient(135deg,var(--accent-dim),var(--primary-dim))}
        .curso-body{padding:14px}
        .curso-titulo{font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:4px;font-family:'Manrope',sans-serif}
        .curso-desc{font-size:12px;color:var(--text-muted);line-height:1.5;margin-bottom:10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .curso-footer{display:flex;justify-content:space-between;align-items:center}
        .curso-precio{font-size:16px;font-weight:800;color:var(--accent);font-family:'Manrope',sans-serif}
        .curso-precio-original{font-size:11px;color:var(--text-muted);text-decoration:line-through;margin-right:4px}
        .curso-badge{font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:3px 8px;border-radius:20px}
        .badge-borrador{background:#FEF9C3;color:#92400E}
        .badge-publicado{background:#DCFCE7;color:#166534}
        .badge-archivado{background:#F1F5F9;color:#475569}
        .curso-actions{display:flex;gap:6px}
        .curso-btn{width:28px;height:28px;border-radius:8px;border:0.5px solid var(--border);background:var(--bg-input);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.15s}
        .curso-btn:hover{background:var(--accent);border-color:var(--accent)}
        .curso-btn:hover svg{color:white}
        .cursos-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;margin-top:12px}
        .section-label{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;margin-top:20px}
        .nuevo-menu{position:absolute;right:0;top:calc(100% + 8px);width:300px;max-width:calc(100vw - 40px);z-index:50;background:var(--bg-card);border:0.5px solid var(--border);border-radius:16px;padding:6px;box-shadow:0 18px 40px rgba(var(--ink-rgb),0.22)}
        .nuevo-menu-titulo{font-size:10.5px;letter-spacing:1.6px;text-transform:uppercase;font-weight:700;color:var(--text-muted);padding:8px 10px 4px}
        .nuevo-op{width:100%;display:flex;gap:12px;align-items:flex-start;text-align:left;padding:11px 10px;border:none;background:transparent;border-radius:12px;cursor:pointer;font-family:inherit;color:var(--text-primary)}
        .nuevo-op:hover,.nuevo-op:focus-visible{background:var(--accent-hover);outline:none}
        .nuevo-ico{width:36px;height:36px;border-radius:10px;background:var(--accent-light);color:var(--accent);display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .nuevo-op-t{display:block;font-size:14px;font-weight:700}
        .nuevo-op-d{display:block;font-size:12px;color:var(--text-muted);line-height:1.45;margin-top:2px}
        .badge-tipo{background:var(--accent-light);color:var(--accent);display:inline-flex;align-items:center;gap:4px}
      `}</style>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px'}}>
        <div>
          <h1 style={{fontSize:'22px',fontWeight:800,color:'var(--text-primary)',fontFamily:'Manrope,sans-serif',marginBottom:'4px'}}>Mis cursos</h1>
          <p style={{fontSize:'13px',color:'var(--text-muted)'}}>
            {publicados.length} publicado{publicados.length !== 1 ? 's' : ''} · {borradores.length} borrador{borradores.length !== 1 ? 'es' : ''}
          </p>
        </div>
        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          <button onClick={() => router.push('/services?ver=cupones')} title="Cupones de descuento"
            style={{display:'flex',alignItems:'center',gap:'6px',padding:'10px 14px',background:'var(--bg-card)',color:'var(--text-secondary)',border:'0.5px solid var(--border)',borderRadius:'12px',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
            <Tag size={14}/> Cupones
          </button>
          {!pausa && (
            <div ref={menuRef} style={{position:'relative'}}>
              <button onClick={() => setMenu(m => !m)} aria-haspopup="menu" aria-expanded={menu}
                style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 18px',background:'linear-gradient(135deg,var(--accent),var(--accent-strong))',color:'white',border:'none',borderRadius:'12px',fontSize:'13px',fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 14px rgba(var(--accent-rgb),0.35)'}}>
                <Plus size={14}/> Nuevo
              </button>
              {menu && (
                <div role="menu" className="luma-desplegable nuevo-menu">
                  <div className="nuevo-menu-titulo">¿Qué querés vender?</div>
                  <button role="menuitem" className="nuevo-op" onClick={() => { setMenu(false); router.push('/courses/new') }}>
                    <span className="nuevo-ico"><BookOpen size={18}/></span>
                    <span><span className="nuevo-op-t">Curso</span><span className="nuevo-op-d">Con aula, lecciones, encuentros y certificado. Pago único o por mes.</span></span>
                  </button>
                  <button role="menuitem" className="nuevo-op" onClick={() => { setMenu(false); router.push('/courses/new?tipo=descargable') }}>
                    <span className="nuevo-ico"><Download size={18}/></span>
                    <span><span className="nuevo-op-t">Descargable</span><span className="nuevo-op-d">Sin aula: un archivo para bajar. Ebook, PDF, audio, plantilla. Pago único.</span></span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {pausa && (
        <div style={{display:'flex',gap:'10px',padding:'14px',borderRadius:'14px',background:'#FFFBEB',border:'0.5px solid #FDE68A',color:'#92400E',fontSize:'13px',lineHeight:1.55,marginBottom:'8px'}}>
          <Pause size={16} style={{flexShrink:0,marginTop:'2px'}}/>
          <div>Tus cursos y descargables están <b>en pausa</b> porque tu plan es Básico. Quienes ya compraron siguen entrando y descargando. Si volvés a Premium, todo vuelve solo. <a href="/suscripcion" style={{color:'#92400E',fontWeight:700}}>Volver a Premium</a></div>
        </div>
      )}

      {cursos.length === 0 && (
        <div style={{textAlign:'center',padding:'60px 20px',color:'var(--text-muted)'}}>
          <BookOpen size={48} style={{opacity:0.2,marginBottom:'16px'}}/>
          <div style={{fontSize:'16px',fontWeight:600,marginBottom:'8px',color:'var(--text-primary)'}}>Todavía no tenés cursos ni descargables</div>
          <p style={{fontSize:'13px',lineHeight:1.7,marginBottom:'24px'}}>Tocá «Nuevo» arriba y elegí qué querés vender: un curso con aula o un descargable (ebook, audio, plantilla).</p>
        </div>
      )}

      {publicados.length > 0 && (
        <>
          <div className="section-label">Publicados</div>
          <div className="cursos-grid">
          {publicados.map(c => <CursoCard key={c.id} curso={c} pendientes={pendientesPorCurso[c.id] || 0} onEdit={() => router.push(`/courses/${c.id}`)} pausa={pausa}/>)}
          </div>
        </>
      )}

      {borradores.length > 0 && (
        <>
          <div className="section-label">Borradores</div>
          <div className="cursos-grid">
          {borradores.map(c => <CursoCard key={c.id} curso={c} pendientes={pendientesPorCurso[c.id] || 0} onEdit={() => router.push(`/courses/${c.id}`)} pausa={pausa}/>)}
          </div>
        </>
      )}

      {archivados.length > 0 && (
        <>
          <div className="section-label">Archivados</div>
          <div className="cursos-grid">
          {archivados.map(c => <CursoCard key={c.id} curso={c} pendientes={pendientesPorCurso[c.id] || 0} onEdit={() => router.push(`/courses/${c.id}`)} pausa={pausa}/>)}
          </div>
        </>
      )}
    </div>
  )
}

function CursoCard({ curso, pendientes, onEdit, pausa = false }: { curso: Curso; pendientes: number; onEdit: () => void; pausa?: boolean }) {
  return (
    <div className="curso-card" onClick={onEdit} style={{position:'relative'}}>
      {pendientes > 0 && (
        <span style={{position:'absolute',top:'10px',right:'10px',zIndex:2,background:'#EF4444',color:'white',fontSize:'10px',fontWeight:700,borderRadius:'20px',padding:'3px 9px',boxShadow:'0 2px 8px rgba(0,0,0,0.3)'}}>
          {pendientes} pendiente{pendientes !== 1 ? 's' : ''}
        </span>
      )}
      {curso.imagen_url
        ? <img src={curso.imagen_url} alt={curso.titulo} className="curso-img"/>
        : <div className="curso-img" style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
            <BookOpen size={32} style={{opacity:0.3,color:'var(--accent)'}}/>
          </div>
      }
      <div className="curso-body">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'6px'}}>
          <span style={{display:'flex',gap:'4px',flexWrap:'wrap'}}>
            {pausa && curso.estado === 'publicado'
              ? <span className="curso-badge" style={{background:'#FEF3C7',color:'#92400E'}}>En pausa</span>
              : <span className={`curso-badge badge-${curso.estado}`}>
                  {curso.estado === 'borrador' ? 'Borrador' : curso.estado === 'publicado' ? 'Publicado' : 'Archivado'}
                </span>}
            {curso.tipo === 'descargable' && <span className="curso-badge badge-tipo"><Download size={9}/> Descargable</span>}
          </span>
          <div className="curso-actions" onClick={e => e.stopPropagation()}>
            <div className="curso-btn" onClick={onEdit}><Edit2 size={11} color="var(--text-muted)"/></div>
          </div>
        </div>
        <div className="curso-titulo">{curso.titulo}</div>
        <div className="curso-desc">{curso.descripcion_corta || 'Sin descripción'}</div>
        <div className="curso-footer">
          <div>
            {curso.precio_original && <span className="curso-precio-original">${curso.precio_original.toLocaleString()}</span>}
            <span className="curso-precio">{Number(curso.precio) > 0 ? `$${curso.precio.toLocaleString()}` : 'Gratis'}</span>
          </div>
          <span style={{fontSize:'11px',color:'var(--text-muted)'}}>{curso.tipo === 'descargable' ? 'Pago único' : curso.modalidad === 'suscripcion' ? 'Por mes' : 'Pago único'}</span>
        </div>
      </div>
    </div>
  )
}