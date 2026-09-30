'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, BookOpen, Users, Info, GraduationCap, Video } from 'lucide-react'
import CourseInfoTab from './tabs/CourseInfoTab'
import CourseContentTab from './tabs/CourseContentTab'
import CourseStudentsTab from './tabs/CourseStudentsTab'
import CourseExamTab from './tabs/CourseExamTab'
import CourseLiveTab from './tabs/CourseLiveTab'

type Curso = {
  id: string
  titulo: string
  slug: string
  descripcion_corta: string
  descripcion_larga: string
  imagen_url: string
  video_presentacion_url: string
  precio: number
  precio_original: number | null
  modalidad: string
  nivel: string
  idioma: string
  duracion_estimada_horas: number | null
  politica_reembolso: string
  dias_garantia: number | null
  para_quien: string[]
  que_aprenderas: string[]
  requisitos: string[]
  estado: string
}

export default function CourseEditPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [curso, setCurso] = useState<Curso | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'info' | 'contenido' | 'alumnas' | 'examen' | 'encuentros'>('info')
  const [alumnasPendientes, setAlumnasPendientes] = useState(0)

  useEffect(() => { cargarCurso() }, [id])

  async function cargarCurso() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single()

      if (!data || data.user_id !== user.id) {
        router.push('/courses')
        return
      }
      setCurso(data)

      const { count } = await supabase
        .from('enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('course_id', id)
        .eq('estado', 'pendiente_pago')
      setAlumnasPendientes(count || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'var(--text-muted)',fontSize:'14px'}}>
      Cargando...
    </div>
  )

  if (!curso) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'var(--text-muted)',fontSize:'14px'}}>
      Curso no encontrado
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)'}}>
      <style>{`
        .tab-bar-wrap{position:relative}
        .tab-bar{display:flex;gap:4px;padding:0 20px;border-bottom:0.5px solid var(--border-light);background:var(--bg-card);position:sticky;top:0;z-index:10;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
        .tab-bar::-webkit-scrollbar{display:none}
        .tab-bar-fade{
          position:absolute;top:0;right:0;bottom:0;width:56px;
          background:linear-gradient(to right,transparent,var(--bg-card));
          pointer-events:none;z-index:11;
          display:none;
        }
        @media(max-width:640px){
          .tab-bar-fade{display:block}
        }
        .tab-btn{display:flex;align-items:center;gap:6px;padding:14px 16px;font-size:12.5px;font-weight:600;color:var(--text-muted);border:none;background:transparent;cursor:pointer;font-family:inherit;border-bottom:2px solid transparent;transition:all 0.15s;white-space:nowrap}
        .tab-btn.active{color:var(--accent);border-bottom-color:var(--accent)}
        .tab-btn:hover{color:var(--text-primary)}
        .curso-header{display:flex;align-items:center;gap:'12px';padding:16px 20px;background:var(--bg-card);border-bottom:0.5px solid var(--border-light)}
      `}</style>

      {/* HEADER */}
      <div className="curso-header" style={{display:'flex',alignItems:'center',gap:'12px',padding:'14px 20px',background:'var(--bg-card)',borderBottom:'0.5px solid var(--border-light)'}}>
        <button onClick={() => router.push('/courses')}
          style={{width:'32px',height:'32px',borderRadius:'8px',border:'0.5px solid var(--border)',background:'var(--bg-input)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <ArrowLeft size={14} color="var(--text-muted)"/>
        </button>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:'15px',fontWeight:800,color:'var(--text-primary)',fontFamily:'Manrope,sans-serif',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{curso.titulo}</div>
          <div style={{fontSize:'10px',color:'var(--text-muted)',marginTop:'1px'}}>
            <span style={{
              padding:'2px 8px',borderRadius:'20px',fontWeight:700,fontSize:'9px',letterSpacing:'0.5px',
              background: curso.estado === 'publicado' ? '#DCFCE7' : curso.estado === 'archivado' ? '#F1F5F9' : '#FEF9C3',
              color: curso.estado === 'publicado' ? '#166534' : curso.estado === 'archivado' ? '#475569' : '#92400E',
            }}>
              {curso.estado === 'publicado' ? 'Publicado' : curso.estado === 'archivado' ? 'Archivado' : 'Borrador'}
            </span>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="tab-bar-wrap">
        <div className="tab-bar">
          <button className={`tab-btn${tab==='info'?' active':''}`} onClick={() => setTab('info')}>
            <Info size={13}/>Información
          </button>
          <button className={`tab-btn${tab==='contenido'?' active':''}`} onClick={() => setTab('contenido')}>
            <BookOpen size={13}/>Contenido
          </button>
          <button className={`tab-btn${tab==='alumnas'?' active':''}`} onClick={() => setTab('alumnas')} style={{position:'relative'}}>
            <Users size={13}/>Alumnas
            {alumnasPendientes > 0 && (
              <span style={{background:'#EF4444',color:'white',fontSize:'9px',fontWeight:700,borderRadius:'10px',minWidth:'16px',height:'16px',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 4px'}}>
                {alumnasPendientes}
              </span>
            )}
          </button>
          <button className={`tab-btn${tab==='examen'?' active':''}`} onClick={() => setTab('examen')}>
            <GraduationCap size={13}/>Examen
          </button>
          <button className={`tab-btn${tab==='encuentros'?' active':''}`} onClick={() => setTab('encuentros')}>
            <Video size={13}/>Encuentros
          </button>
        </div>
        <div className="tab-bar-fade"/>
      </div>

      {/* CONTENIDO */}
      {tab === 'info' && <CourseInfoTab curso={curso} onUpdate={setCurso}/>}
      {tab === 'contenido' && <CourseContentTab cursoId={id}/>}
      {tab === 'alumnas' && <CourseStudentsTab cursoId={id}/>}
      {tab === 'examen' && <CourseExamTab cursoId={id}/>}
      {tab === 'encuentros' && <CourseLiveTab cursoId={id}/>}
    </div>
  )
}