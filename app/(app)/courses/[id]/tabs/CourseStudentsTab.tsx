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
  celular: string | null
  estado: string
  modalidad: string
  fechaInicio: string
  fechaVencimiento: string | null
  fechaConfirmacion: string
  leccionesCompletadas: number
  suscripcionEstado: string | null
  proximoCobro: string | null
}

const SUS_VIVA = ['pendiente', 'esperando_cobro', 'activa', 'con_problemas', 'rechazada', 'creando']
async function tokenSesion() {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token
}

export default function CourseStudentsTab({ cursoId }: { cursoId: string }) {
  const [alumnas, setAlumnas] = useState<Alumna[]>([])
  const [totalLecciones, setTotalLecciones] = useState(0)
  const [loading, setLoading] = useState(true)
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [precioCurso, setPrecioCurso] = useState<number | null>(null)

  useEffect(() => { cargarAlumnas(true) }, [cursoId])

  async function cargarAlumnas(revisarMP = false) {
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

      const { data: cursoData } = await supabase.from('courses').select('precio').eq('id', cursoId).maybeSingle()
      if (cursoData && cursoData.precio != null) setPrecioCurso(Number(cursoData.precio))

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('id, person_id, estado, modalidad, fecha_inicio, fecha_vencimiento, updated_at, suscripcion_estado, proximo_cobro')
        .eq('course_id', cursoId)
        .order('fecha_inicio', { ascending: false })

      if (!enrollments || enrollments.length === 0) { setAlumnas([]); setLoading(false); return }

      const personIds = enrollments.map(e => e.person_id)
      const { data: personas } = await supabase
        .from('persons').select('id, nombre, apellido, email, celular').in('id', personIds)

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
          celular: persona?.celular || null,
          estado: e.estado,
          modalidad: e.modalidad,
          fechaInicio: e.fecha_inicio,
          fechaVencimiento: e.fecha_vencimiento,
          fechaConfirmacion: e.updated_at,
          leccionesCompletadas: completadas,
          suscripcionEstado: (e as any).suscripcion_estado || null,
          proximoCobro: (e as any).proximo_cobro || null,
        }
      })

      setAlumnas(combinado)
      // si hay suscripciones automáticas, le preguntamos a Mercado Pago por cobros nuevos y recargamos una vez
      if (revisarMP && combinado.some(a => a.suscripcionEstado && SUS_VIVA.includes(a.suscripcionEstado))) {
        try {
          const res = await fetch('/api/cursos/suscripcion/revisar-curso', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courseId: cursoId, accessToken: await tokenSesion() }),
          })
          const r = await res.json().catch(() => ({}))
          if (r.revisadas > 0) { await cargarAlumnas(false); return }
        } catch (e) { console.error('Error revisando suscripciones:', e) }
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  // pregunta cuánto pagó (viene completo con el precio del curso). null = canceló
  function pedirMonto(texto: string): number | null {
    const sugerido = precioCurso != null ? String(precioCurso) : ''
    const respuesta = window.prompt(`${texto}\n\n¿Cuánto te pagó? Se suma a tus Finanzas. Si cobraste distinto, corregilo.`, sugerido)
    if (respuesta === null) return null
    const limpio = respuesta.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.')
    const monto = Number(limpio)
    if (limpio === '' || !isFinite(monto) || monto < 0) {
      alert('Escribí un monto válido, solo con números. No se hizo ningún cambio.')
      return null
    }
    return monto
  }

  // anota el pago en Finanzas. Si falla, el acceso ya quedó dado: solo avisamos
  async function registrarPago(enrollmentId: string, monto: number, tipo: 'compra' | 'renovacion') {
    if (monto <= 0) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('course_payments').insert({
      terapeuta_id: user.id,
      enrollment_id: enrollmentId,
      course_id: cursoId,
      monto,
      metodo: 'manual',
      tipo,
    })
    if (error) {
      console.error('Error registrando pago:', error.message, error.code, error.details)
      alert(`El acceso quedó habilitado, pero no se pudo anotar el pago en Finanzas.\n\nDetalle: ${error.message || error.code || 'sin detalle'}`)
    }
  }

  // cancela la suscripción automática de una alumna (conserva el acceso que ya pagó)
  async function cancelarSuscripcionAlumna(a: Alumna, preguntar = true): Promise<boolean> {
    if (preguntar && !confirm(`¿Cancelar la suscripción automática de ${a.nombre}?\n\nNo se le va a cobrar más. Conserva el acceso hasta ${a.fechaVencimiento ? formatFecha(a.fechaVencimiento) : 'la fecha que ya pagó'}.`)) return false
    setConfirmando(a.enrollmentId)
    try {
      const res = await fetch('/api/cursos/suscripcion/cancelar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId: a.enrollmentId, accessToken: await tokenSesion() }),
      })
      const r = await res.json().catch(() => ({ ok: false }))
      if (!r.ok) { alert(r.mensaje || 'No se pudo cancelar. Probá de nuevo en unos minutos.'); return false }
      setAlumnas(prev => prev.map(x => x.enrollmentId === a.enrollmentId ? { ...x, suscripcionEstado: 'cancelada' } : x))
      return true
    } finally { setConfirmando(null) }
  }

  async function confirmarPago(enrollmentId: string, modalidad: string) {
    const alumna = alumnas.find(x => x.enrollmentId === enrollmentId)
    // si tiene una suscripción de Mercado Pago en proceso, se cancela antes (si no, se le cobraría dos veces)
    if (alumna?.suscripcionEstado && ['pendiente', 'esperando_cobro', 'rechazada', 'creando'].includes(alumna.suscripcionEstado)) {
      if (!confirm(`${alumna.nombre} tiene una suscripción de Mercado Pago en proceso.\n\nSi confirmás el pago a mano, se la cancelamos para que no se le cobre dos veces. ¿Seguimos?`)) return
      if (!(await cancelarSuscripcionAlumna(alumna, false))) return
    }
    const monto = pedirMonto('Vas a habilitar el acceso al curso.')
    if (monto === null) return
    setConfirmando(enrollmentId)
    try {
      const supabase = createClient()
      const datos: any = { estado: 'activa' }
      if (modalidad === 'suscripcion') {
        const vence = new Date()
        vence.setDate(vence.getDate() + 30)
        datos.fecha_vencimiento = vence.toISOString()
      }
      const { error } = await supabase.from('enrollments')
        .update(datos).eq('id', enrollmentId)
      if (error) { console.error(error); return }
      setAlumnas(prev => prev.map(a => a.enrollmentId === enrollmentId
        ? { ...a, estado: 'activa', fechaConfirmacion: new Date().toISOString(), fechaVencimiento: datos.fecha_vencimiento || a.fechaVencimiento }
        : a))
      await registrarPago(enrollmentId, monto, 'compra')
    } finally { setConfirmando(null) }
  }

  async function renovarMes(enrollmentId: string) {
    const monto = pedirMonto('Vas a habilitar un mes más de acceso.')
    if (monto === null) return
    setConfirmando(enrollmentId)
    try {
      const supabase = createClient()
      const vence = new Date()
      vence.setDate(vence.getDate() + 30)
      const { error } = await supabase.from('enrollments')
        .update({ fecha_vencimiento: vence.toISOString() }).eq('id', enrollmentId)
      if (error) { console.error(error); return }
      setAlumnas(prev => prev.map(a => a.enrollmentId === enrollmentId ? { ...a, fechaVencimiento: vence.toISOString() } : a))
      await registrarPago(enrollmentId, monto, 'renovacion')
    } finally { setConfirmando(null) }
  }

  function diasParaVencer(fecha: string | null) {
    if (!fecha) return null
    return Math.ceil((new Date(fecha).getTime() - Date.now()) / (1000*60*60*24))
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

            {a.suscripcionEstado && (
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'8px',flexWrap:'wrap',fontSize:'11.5px',padding:'8px 10px',borderRadius:'8px',marginBottom:'10px',
                background: ['con_problemas','rechazada'].includes(a.suscripcionEstado) ? '#FFFBEB' : a.suscripcionEstado === 'cancelada' ? 'var(--bg-card)' : '#F5F3FF',
                color: ['con_problemas','rechazada'].includes(a.suscripcionEstado) ? '#92400E' : a.suscripcionEstado === 'cancelada' ? 'var(--text-muted)' : '#5B21B6'}}>
                <span>
                  {a.suscripcionEstado === 'activa' ? `🔁 Cobro automático activo${a.proximoCobro ? ` · próximo cobro: ${formatFecha(a.proximoCobro)}` : ''}`
                    : a.suscripcionEstado === 'esperando_cobro' ? '⏳ Cobro automático: esperando que se acredite el primer cobro'
                    : a.suscripcionEstado === 'con_problemas' ? '⚠️ Mercado Pago no pudo cobrar la última cuota y sigue intentando. Tiene unos días de gracia.'
                    : a.suscripcionEstado === 'rechazada' ? '⚠️ Su tarjeta fue rechazada en el primer cobro (no se le cobró nada)'
                    : a.suscripcionEstado === 'pendiente' || a.suscripcionEstado === 'creando' ? '⏳ Empezó a suscribirse pero no terminó en Mercado Pago'
                    : '🔁 Cobro automático cancelado'}
                </span>
                {SUS_VIVA.includes(a.suscripcionEstado) && (
                  <button onClick={() => cancelarSuscripcionAlumna(a)} disabled={confirmando === a.enrollmentId}
                    style={{fontSize:'11px',fontWeight:700,background:'none',border:'none',color:'inherit',textDecoration:'underline',cursor:'pointer',fontFamily:'inherit',padding:0}}>
                    {confirmando === a.enrollmentId ? 'Cancelando…' : 'Cancelar suscripción'}
                  </button>
                )}
              </div>
            )}

            {a.estado === 'activa' && totalLecciones > 0 && (<>
              <div className="al-progreso-barra"><div className="al-progreso-fill" style={{width:`${porcentaje}%`}}/></div>
              <div style={{fontSize:'11px',color:'var(--text-muted)'}}>{a.leccionesCompletadas} de {totalLecciones} lecciones · {porcentaje}%</div>
            </>)}

            {a.estado !== 'activa' && (
              <button className="al-btn-confirmar" onClick={() => confirmarPago(a.enrollmentId, a.modalidad)} disabled={confirmando === a.enrollmentId}>
                <Check size={12}/> {confirmando === a.enrollmentId ? 'Confirmando...' : 'Confirmar pago recibido'}
              </button>
            )}

            {a.estado === 'activa' && a.modalidad === 'suscripcion' && !['activa','esperando_cobro','con_problemas'].includes(a.suscripcionEstado || '') && (() => {
              const dias = diasParaVencer(a.fechaVencimiento)
              if (dias === null || dias > 5) return null
              const vencido = dias < 0
              const linkWa = a.celular
                ? `https://wa.me/${a.celular.replace(/\D/g,'').replace(/^0+/,'')}?text=${encodeURIComponent(`Hola ${a.nombre}! Te escribo porque ${vencido ? 'tu acceso al curso venció' : `tu acceso al curso vence en ${dias} día${dias!==1?'s':''}`}. ¿Me pasás el comprobante del próximo mes para renovarte el acceso?`)}`
                : null
              return (
                <div style={{marginTop:'10px',padding:'10px 12px',borderRadius:'10px',background: vencido ? '#FEF2F2' : '#FFFBEB',border:`0.5px solid ${vencido ? '#FECACA' : '#FDE68A'}`}}>
                  <div style={{fontSize:'11.5px',fontWeight:600,color: vencido ? '#991B1B' : '#92400E',marginBottom:'8px'}}>
                    {vencido ? '⚠️ El acceso ya venció' : `⏳ Vence en ${dias} día${dias!==1?'s':''}`}
                  </div>
                  <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                    {linkWa && (
                      <a href={linkWa} target="_blank" rel="noopener noreferrer"
                        style={{fontSize:'11px',fontWeight:700,padding:'7px 12px',borderRadius:'8px',background:'#25D366',color:'white',textDecoration:'none'}}>
                        💬 Avisar por WhatsApp
                      </a>
                    )}
                    <button onClick={() => renovarMes(a.enrollmentId)} disabled={confirmando === a.enrollmentId}
                      style={{fontSize:'11px',fontWeight:700,padding:'7px 12px',borderRadius:'8px',border:'none',background:'#166534',color:'white',cursor:'pointer',fontFamily:'inherit'}}>
                      {confirmando === a.enrollmentId ? '...' : '✓ Habilitar mes siguiente'}
                    </button>
                  </div>
                </div>
              )
            })()}
          </div>
        )
      })}
    </div>
  )
}