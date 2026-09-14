'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Plus, BookOpen, Edit2, Eye, Archive, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'

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
}

export default function CoursesPage() {
  const [cursos, setCursos] = useState<Curso[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => { cargarCursos() }, [])

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
      if (data) setCursos(data)
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
    <div style={{padding:'20px',maxWidth:'900px',margin:'0 auto'}}>
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
      `}</style>

      {/* HEADER */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px'}}>
        <div>
          <h1 style={{fontSize:'22px',fontWeight:800,color:'var(--text-primary)',fontFamily:'Manrope,sans-serif',marginBottom:'4px'}}>Mis cursos</h1>
          <p style={{fontSize:'13px',color:'var(--text-muted)'}}>
            {publicados.length} publicado{publicados.length !== 1 ? 's' : ''} · {borradores.length} borrador{borradores.length !== 1 ? 'es' : ''}
          </p>
        </div>
        <button onClick={() => router.push('/courses/new')}
          style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 18px',background:'linear-gradient(135deg,#8B5CF6,#7C3AED)',color:'white',border:'none',borderRadius:'12px',fontSize:'13px',fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 14px rgba(139,92,246,0.35)'}}>
          <Plus size={14}/> Nuevo curso
        </button>
      </div>

      {/* EMPTY STATE */}
      {cursos.length === 0 && (
        <div style={{textAlign:'center',padding:'60px 20px',color:'var(--text-muted)'}}>
          <BookOpen size={48} style={{opacity:0.2,marginBottom:'16px'}}/>
          <div style={{fontSize:'16px',fontWeight:600,marginBottom:'8px',color:'var(--text-primary)'}}>Todavía no tenés cursos</div>
          <p style={{fontSize:'13px',lineHeight:1.7,marginBottom:'24px'}}>Creá tu primer curso y empezá a venderlo desde tu página pública.</p>
          <button onClick={() => router.push('/courses/new')}
            style={{padding:'12px 24px',background:'linear-gradient(135deg,#8B5CF6,#7C3AED)',color:'white',border:'none',borderRadius:'12px',fontSize:'13px',fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
            Crear mi primer curso
          </button>
        </div>
      )}

      {/* PUBLICADOS */}
      {publicados.length > 0 && (
        <>
          <div className="section-label">Publicados</div>
          <div className="cursos-grid">
            {publicados.map(c => <CursoCard key={c.id} curso={c} onEdit={() => router.push(`/courses/${c.id}`)}/>)}
          </div>
        </>
      )}

      {/* BORRADORES */}
      {borradores.length > 0 && (
        <>
          <div className="section-label">Borradores</div>
          <div className="cursos-grid">
            {borradores.map(c => <CursoCard key={c.id} curso={c} onEdit={() => router.push(`/courses/${c.id}`)}/>)}
          </div>
        </>
      )}

      {/* ARCHIVADOS */}
      {archivados.length > 0 && (
        <>
          <div className="section-label">Archivados</div>
          <div className="cursos-grid">
            {archivados.map(c => <CursoCard key={c.id} curso={c} onEdit={() => router.push(`/courses/${c.id}`)}/>)}
          </div>
        </>
      )}
    </div>
  )
}

function CursoCard({ curso, onEdit }: { curso: Curso; onEdit: () => void }) {
  return (
    <div className="curso-card" onClick={onEdit}>
      {curso.imagen_url
        ? <img src={curso.imagen_url} alt={curso.titulo} className="curso-img"/>
        : <div className="curso-img" style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
            <BookOpen size={32} style={{opacity:0.3,color:'var(--accent)'}}/>
          </div>
      }
      <div className="curso-body">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'6px'}}>
          <span className={`curso-badge badge-${curso.estado}`}>
            {curso.estado === 'borrador' ? 'Borrador' : curso.estado === 'publicado' ? 'Publicado' : 'Archivado'}
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
            <span className="curso-precio">${curso.precio.toLocaleString()}</span>
          </div>
          <span style={{fontSize:'11px',color:'var(--text-muted)',textTransform:'capitalize'}}>{curso.modalidad}</span>
        </div>
      </div>
    </div>
  )
}