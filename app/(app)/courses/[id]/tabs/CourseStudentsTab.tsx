'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Check, Clock, Mail } from 'lucide-react'

type Alumna = {
  enrollmentId: string
  personId: string
  nombre: string
  apellido: string
  email: string
  estado: string
  modalidad: string
  fechaInicio: string
  fechaVencimiento: string | null
  fechaConfirmacion: string
  leccionesCompletadas: number
}

export default function CourseStudentsTab({ cursoId }: { cursoId: string }) {
  const [alumnas, setAlumnas] = useState<Alumna[]>([])
  const [totalLecciones, setTotalLecciones] = useState(0)
  const [loading, setLoading] = useState(true)
  const [confirmando, setConfirmando] = useState<string | null>(null)

  useEffect(() => { cargarAlumnas() }, [cursoId])

  async function cargarAlumnas() {
    try {
      const supabase = createClient()

      const { data: mods } = await supabase.from('modules').select('id').eq('course_id', cursoId)
      let totalLecc = 0
      if (mods && mods.length > 0) {
        const { count } = await supabase.from('lessons').select('id', { count: 'exact', head: true })
          .in('module_id', mods.map(m => m.id))
        totalLecc = count || 0
      }
      setTotalLecciones(totalLecc)

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('id, person_id, estado, modalidad, fecha_inicio, fecha_vencimiento, updated_at')
        .eq('course_id', cursoId)
        .order('fecha_inicio', { ascending: false })

      if (!enrollments || enrollments.length === 0) { setAlumnas([]); setLoading(false); return }

      const personIds = enrollments.map(e => e.person_id)
      const { data: personas } = await supabase
        .from('persons').select('id, nombre, apellido, email').in('id', personIds)

      const { data: progreso } = await supabase
        .from('lesson_progress').select('enrollment_id, completada')
        .in('enrollment_id', enrollments.map(e => e.id))

      const combinado = enrollments.map(e => {
        const persona = personas?.find(p => p.id === e.person_id)
        const completadas = (progreso || []).filter(pr => pr.enrollment_id === e.id && pr.completada).length
        return {
          enrollmentId: e.id,
          personId: e.person_id,
          nombre: persona?.nombre || '',
          apellido: persona?.apellido || '',
          email: persona?.email || '',
          estado: e.estado,
          modalidad: e.modalidad,
          fechaInicio: e.fecha_inicio,
          fechaVencimiento: e.fecha_vencimiento,
          fechaConfirmacion: e.updated_at,
          leccionesCompletadas: completadas,
        }
      })

      setAlumnas(combinado)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function confirmarPago(enrollmentId: string) {
    setConfirmando(enrollmentId)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('enrollments')
        .update({ estado: 'activa' }).eq('id', enrollmentId)
      if (error) { console.error(error); return }
      setAlumnas(prev => prev.map(a => a.enrollmentId === enrollmentId ? { ...a, estado: 'activa', fechaConfirmacion: new Date().toISOString() } : a))
    } finally { setConfirmando(null) }
  }

  function formatFecha(f: string | null) {
    if (!f) return '—'
    return new Date(f).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (loading) return (
    <div style={{padding:'40px 20px',textAlign:'center',color:'var(--text-muted)',fontSize:'13px'}}>Cargando...</div>
  )

  if (alumnas.length === 0) return (
    <div style={{padding:'40px 20px',textAlign:'center',color:'var(--text-muted)'}}>
      <div style={{fontSize:'32px',marginBottom:'12px'}}>👩‍🎓</div>
      <div style={{fontSize:'14px',fontWeight:600,color:'var(--text-primary)',marginBottom:'6px'}}>Alumnas</div>
      <p style={{fontSize:'12px'}}>Las alumnas aparecerán acá cuando alguien se inscriba al curso.</p>
    </div>
  )

  return (
    <div style={{padding:'20px',maxWidth:'720px'}}>
      <style>{`
        .al-card{border:0.5px solid var(--border);border-radius:12px;padding:16px;margin-bottom:10px;background:var(--bg-input)}
        .al-header{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:10px}
        .al-nombre{font-size:14px;font-weight:700;color:var(--text-primary)}
        .al-email{font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:4px;margin-top:2px}
        .al-badge{font-size:10px;font-weight:700;padding:4px 10px;border-radius:20px;white-space:nowrap;flex-shrink:0}
        .al-badge.activa{background:#DCFCE7;color:#166534}
        .al-badge.pendiente_pago{background:#FEF9C3;color:#92400E}
        .al-meta-row{display:flex;flex-wrap:wrap;gap:14px;font-size:11px;color:var(--text-muted);margin-bottom:10px}
        .al-progreso-barra{height:5px;background:var(--border-light);border-radius:10px;overflow:hidden;margin-bottom:4px}
        .al-progreso-fill{height:100%;background:linear-gradient(135deg,#8B5CF6,#7C3AED);border-radius:10px}
        .al-btn-confirmar{display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;border:none;background:#166534;color:white;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:8px}
        .al-btn-confirmar:disabled{opacity:0.6;cursor:not-allowed}
      `}</style>

      <div style={{fontSize:'13px',fontWeight:700,color:'var(--text-primary)',marginBottom:'14px'}}>
        {alumnas.length} alumna{alumnas.length !== 1 ? 's' : ''}
      </div>

      {alumnas.map(a => {
        const porcentaje = totalLecciones > 0 ? Math.round((a.leccionesCompletadas / totalLecciones) * 100) : 0
        return (
          <div key={a.enrollmentId} className="al-card">
            <div className="al-header">
              <div>
                <div className="al-nombre">{a.nombre} {a.apellido}</div>
                <div className="al-email"><Mail size={10}/> {a.email}</div>
              </div>
              {a.estado === 'activa'
                ? <span className="al-badge activa">✓ Acceso activo</span>
                : <span className="al-badge pendiente_pago">⏳ Pendiente de pago</span>}
            </div>

            <div className="al-meta-row">
              <span>Inscripción: {formatFecha(a.fechaInicio)}</span>
              {a.estado === 'activa' && <span>Pago confirmado: {formatFecha(a.fechaConfirmacion)}</span>}
              {a.modalidad === 'suscripcion' && <span>Vence: {formatFecha(a.fechaVencimiento)}</span>}
            </div>

            {a.estado === 'activa' && totalLecciones > 0 && (<>
              <div className="al-progreso-barra"><div className="al-progreso-fill" style={{width:`${porcentaje}%`}}/></div>
              <div style={{fontSize:'11px',color:'var(--text-muted)'}}>{a.leccionesCompletadas} de {totalLecciones} lecciones · {porcentaje}%</div>
            </>)}

            {a.estado !== 'activa' && (
              <button className="al-btn-confirmar" onClick={() => confirmarPago(a.enrollmentId)} disabled={confirmando === a.enrollmentId}>
                <Check size={12}/> {confirmando === a.enrollmentId ? 'Confirmando...' : 'Confirmar pago recibido'}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}