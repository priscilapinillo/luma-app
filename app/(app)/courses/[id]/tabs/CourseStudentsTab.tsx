'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Check, Clock, Mail, UserX, RotateCcw, X } from 'lucide-react'
import { toast } from '@/components/ToastProvider'

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
  metodoPago?: string | null
  // con cupón: lo que tenía que pagar (lo calculó el servidor)
  precioAcordado?: number | null
  precioAcordadoUsd?: number | null
  cuponCodigo?: string | null
  cuponPorcentaje?: number | null
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
  const [precioUSD, setPrecioUSD] = useState<number | null>(null)
  const [aQuitar, setAQuitar] = useState<Alumna | null>(null)      // ventana "Quitar acceso ahora"
  const [aReactivar, setAReactivar] = useState<Alumna | null>(null) // ventana "Reactivar acceso"
  const [procesando, setProcesando] = useState(false)

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

      // cómo eligió pagar cada una (por ejemplo, en dólares) y el precio en dólares del curso:
      // se leen aparte, así si la base todavía no tiene esas columnas la lista se ve igual
      try {
        const [{ data: metodos, error: e1 }, { data: cu, error: e2 }] = await Promise.all([
          supabase.from('enrollments').select('id, metodo_pago, precio_acordado, precio_acordado_usd, cupon_codigo, cupon_porcentaje').in('id', enrollments.map(e => e.id)),
          supabase.from('courses').select('precio_usd').eq('id', cursoId).maybeSingle(),
        ])
        if (!e1 && metodos) for (const a of combinado) {
          const m = (metodos as any[]).find(x => x.id === a.enrollmentId)
          Object.assign(a, {
            metodoPago: m?.metodo_pago || null,
            precioAcordado: Number(m?.precio_acordado) > 0 ? Number(m.precio_acordado) : null,
            precioAcordadoUsd: Number(m?.precio_acordado_usd) > 0 ? Number(m.precio_acordado_usd) : null,
            cuponCodigo: m?.cupon_codigo || null,
            cuponPorcentaje: m?.cupon_porcentaje || null,
          })
        }
        if (!e2) setPrecioUSD(Number((cu as any)?.precio_usd) > 0 ? Number((cu as any).precio_usd) : null)
      } catch {}

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
  function pedirMonto(texto: string, enUSD = false, alumna?: Alumna): number | null {
    // con cupón se sugiere lo que tenía que pagar con el descuento
    const sugerido = enUSD
      ? (alumna?.precioAcordadoUsd != null ? String(alumna.precioAcordadoUsd) : precioUSD != null ? String(precioUSD) : '')
      : (alumna?.precioAcordado != null ? String(alumna.precioAcordado) : precioCurso != null ? String(precioCurso) : '')
    if (alumna?.cuponCodigo) texto += `\n\nUsó el cupón ${alumna.cuponCodigo} (−${alumna.cuponPorcentaje}%).`
    const respuesta = window.prompt(enUSD
      ? `${texto}\n\n¿Cuántos DÓLARES te pagó? Se suma aparte en Finanzas (nunca a los pesos). Si cobraste distinto, corregilo.`
      : `${texto}\n\n¿Cuánto te pagó? Se suma a tus Finanzas. Si cobraste distinto, corregilo.`, sugerido)
    if (respuesta === null) return null
    // en dólares se aceptan centavos con coma o punto (40,50 o 40.50); en pesos, los puntos son de miles
    const limpio = enUSD
      ? respuesta.replace(/[^\d.,]/g, '').replace(',', '.')
      : respuesta.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.')
    const monto = Number(limpio)
    if (limpio === '' || !isFinite(monto) || monto < 0) {
      toast('Escribí un monto válido, solo con números. No se hizo ningún cambio.', 'error')
      return null
    }
    return monto
  }

  // anota el pago en Finanzas. Si falla, el acceso ya quedó dado: solo avisamos
  async function registrarPago(enrollmentId: string, monto: number, tipo: 'compra' | 'renovacion', enUSD = false) {
    if (monto <= 0) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('course_payments').insert({
      terapeuta_id: user.id,
      enrollment_id: enrollmentId,
      course_id: cursoId,
      // en dólares: el monto en pesos va en 0 (así nunca se suma a los pesos) y los dólares en monto_usd
      monto: enUSD ? 0 : monto,
      metodo: enUSD ? 'usd' : 'manual',
      tipo,
      ...(enUSD ? { monto_usd: Math.round(monto * 100) / 100 } : {}),
    })
    if (error) {
      console.error('Error registrando pago:', error.message, error.code, error.details)
      alert(`El acceso quedó habilitado, pero no se pudo anotar el pago en Finanzas.\n\nDetalle: ${error.message || error.code || 'sin detalle'}`)
    }
  }

  // cancela la suscripción automática de una alumna (conserva el acceso que ya pagó)
  async function cancelarSuscripcionAlumna(a: Alumna, preguntar = true): Promise<boolean> {
    if (preguntar && !confirm(`¿Cancelar el cobro automático de ${a.nombre}?\n\nNo se le va a cobrar más. Sigue entrando al curso hasta ${a.fechaVencimiento ? formatFecha(a.fechaVencimiento) : 'la fecha que ya pagó'} y después se le vence sola.\n\nNo le llega ningún mail de Luma.`)) return false
    setConfirmando(a.enrollmentId)
    try {
      const res = await fetch('/api/cursos/suscripcion/cancelar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId: a.enrollmentId, accessToken: await tokenSesion() }),
      })
      const r = await res.json().catch(() => ({ ok: false }))
      if (!r.ok) { toast(r.mensaje || 'No se pudo cancelar. Probá de nuevo en unos minutos.', 'error'); return false }
      setAlumnas(prev => prev.map(x => x.enrollmentId === a.enrollmentId ? { ...x, suscripcionEstado: 'cancelada' } : x))
      if (preguntar) toast('Cobro automático cancelado. No se le cobra más.')
      return true
    } finally { setConfirmando(null) }
  }

  // ÚLTIMA opción: corta el acceso ya (antes cancela el cobro automático en el servidor). Sin mail, sin borrar nada.
  async function quitarAcceso(a: Alumna) {
    if (procesando) return
    setProcesando(true)
    try {
      const res = await fetch('/api/cursos/quitar-acceso', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId: a.enrollmentId, accessToken: await tokenSesion() }),
      })
      const r = await res.json().catch(() => ({ ok: false }))
      if (!r.ok) { toast(r.mensaje || 'No se pudo quitar el acceso. Probá de nuevo en unos minutos.', 'error'); return }
      setAlumnas(prev => prev.map(x => x.enrollmentId === a.enrollmentId
        ? { ...x, estado: 'baja', suscripcionEstado: r.cobroCancelado ? 'cancelada' : x.suscripcionEstado } : x))
      setAQuitar(null)
      toast(`Listo: ${a.nombre} ya no puede entrar al curso.`)
    } finally { setProcesando(false) }
  }

  // vuelve a darle acceso (lo puede hacer solo la dueña del curso; no se cobra nada)
  async function reactivar(a: Alumna) {
    if (procesando) return
    setProcesando(true)
    try {
      const { data, error } = await createClient().from('enrollments')
        .update({ estado: 'activa' }).eq('id', a.enrollmentId).eq('estado', 'baja').select('id, estado')
      if (error || !data || data.length === 0 || data[0].estado !== 'activa') {
        console.error('Error reactivando:', error)
        toast('No se pudo reactivar. Probá de nuevo en unos minutos.', 'error'); return
      }
      setAlumnas(prev => prev.map(x => x.enrollmentId === a.enrollmentId ? { ...x, estado: 'activa' } : x))
      setAReactivar(null)
      const dias = diasParaVencer(a.fechaVencimiento)
      toast(a.modalidad === 'suscripcion' && dias !== null && dias < 0
        ? `${a.nombre} está reactivada, pero su mes ya había vencido. Cuando te pague, tocá «Habilitar mes siguiente».`
        : `Listo: ${a.nombre} vuelve a entrar al curso.`, a.modalidad === 'suscripcion' && dias !== null && dias < 0 ? 'info' : 'success')
    } finally { setProcesando(false) }
  }

  async function confirmarPago(enrollmentId: string, modalidad: string) {
    const alumna = alumnas.find(x => x.enrollmentId === enrollmentId)
    // si tiene una suscripción de Mercado Pago en proceso, se cancela antes (si no, se le cobraría dos veces)
    if (alumna?.suscripcionEstado && ['pendiente', 'esperando_cobro', 'rechazada', 'creando'].includes(alumna.suscripcionEstado)) {
      if (!confirm(`${alumna.nombre} tiene una suscripción de Mercado Pago en proceso.\n\nSi confirmás el pago a mano, se la cancelamos para que no se le cobre dos veces. ¿Seguimos?`)) return
      if (!(await cancelarSuscripcionAlumna(alumna, false))) return
    }
    const enUSD = alumna?.metodoPago === 'usd'
    const monto = pedirMonto(enUSD ? 'Vas a habilitar el acceso al curso (eligió pagar en dólares).' : 'Vas a habilitar el acceso al curso.', enUSD, alumna)
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
      await registrarPago(enrollmentId, monto, 'compra', enUSD)
    } finally { setConfirmando(null) }
  }

  async function renovarMes(enrollmentId: string) {
    const enUSD = alumnas.find(x => x.enrollmentId === enrollmentId)?.metodoPago === 'usd'
    const monto = pedirMonto('Vas a habilitar un mes más de acceso.', enUSD)
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
      await registrarPago(enrollmentId, monto, 'renovacion', enUSD)
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
        .al-badge.baja{background:var(--bg-card);color:var(--text-muted);border:0.5px solid var(--border)}
        .al-acciones{display:flex;justify-content:flex-end;margin-top:10px}
        .al-btn-sutil{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:var(--text-muted);background:none;border:none;cursor:pointer;font-family:inherit;padding:4px 2px;border-radius:6px}
        .al-btn-sutil:hover{color:#B91C1C}
        .al-baja-box{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:11.5px;color:var(--text-muted);padding:10px 12px;border-radius:10px;background:var(--bg-card);border:0.5px dashed var(--border)}
        .al-btn-reactivar{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:8px;border:0.5px solid var(--accent);background:transparent;color:var(--accent);font-size:11.5px;font-weight:700;cursor:pointer;font-family:inherit}
        .al-mo{position:fixed;inset:0;background:rgba(20,16,35,.45);display:flex;align-items:center;justify-content:center;z-index:9000;padding:16px;animation:alFade .18s ease}
        .al-mo-box{background:var(--bg-card);border-radius:18px;max-width:420px;width:100%;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.25);animation:alSube .22s cubic-bezier(.2,.8,.3,1)}
        .al-mo-tit{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;font-size:15px;font-weight:800;color:var(--text-primary);margin-bottom:12px}
        .al-mo-x{border:none;background:var(--bg-input);border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-muted);flex-shrink:0}
        .al-mo-lista{list-style:none;padding:0;margin:0 0 14px;display:flex;flex-direction:column;gap:8px}
        .al-mo-lista li{display:flex;gap:8px;font-size:12.5px;line-height:1.45;color:var(--text-secondary)}
        .al-mo-lista li svg{flex-shrink:0;margin-top:2px}
        .al-mo-sugerencia{font-size:12px;line-height:1.5;color:var(--accent-deep);background:#F5F3FF;border-radius:10px;padding:10px 12px;margin-bottom:14px}
        .al-mo-botones{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
        .al-mo-btn{padding:10px 16px;border-radius:10px;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit;border:none}
        .al-mo-btn.sec{background:var(--bg-input);color:var(--text-primary)}
        .al-mo-btn.peligro{background:#B91C1C;color:white}
        .al-mo-btn.ok{background:var(--accent);color:white}
        .al-mo-btn:disabled{opacity:.6;cursor:not-allowed}
        @keyframes alFade{from{opacity:0}to{opacity:1}}
        @keyframes alSube{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}
        @media (prefers-reduced-motion: reduce){.al-mo,.al-mo-box{animation:none}}
        .al-meta-row{display:flex;flex-wrap:wrap;gap:14px;font-size:11px;color:var(--text-muted);margin-bottom:10px}
        .al-progreso-barra{height:5px;background:var(--border-light);border-radius:10px;overflow:hidden;margin-bottom:4px}
        .al-progreso-fill{height:100%;background:linear-gradient(135deg,var(--accent),var(--accent-strong));border-radius:10px}
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
                : a.estado === 'baja'
                  ? <span className="al-badge baja">Acceso quitado</span>
                  : <span className="al-badge pendiente_pago">⏳ Pendiente de pago{a.metodoPago === 'usd' ? ' · USD' : ''}</span>}
            </div>

            <div className="al-meta-row">
              <span>Inscripción: {formatFecha(a.fechaInicio)}</span>
              {a.estado === 'activa' && <span>Pago confirmado: {formatFecha(a.fechaConfirmacion)}</span>}
              {a.modalidad === 'suscripcion' && <span>Vence: {formatFecha(a.fechaVencimiento)}</span>}
            </div>

            {a.suscripcionEstado && (
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'8px',flexWrap:'wrap',fontSize:'11.5px',padding:'8px 10px',borderRadius:'8px',marginBottom:'10px',
                background: ['con_problemas','rechazada'].includes(a.suscripcionEstado) ? '#FFFBEB' : a.suscripcionEstado === 'cancelada' ? 'var(--bg-card)' : '#F5F3FF',
                color: ['con_problemas','rechazada'].includes(a.suscripcionEstado) ? '#92400E' : a.suscripcionEstado === 'cancelada' ? 'var(--text-muted)' : 'var(--accent-deep)'}}>
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
                    {confirmando === a.enrollmentId ? 'Cancelando…' : 'Cancelar cobro automático'}
                  </button>
                )}
              </div>
            )}

            {a.estado === 'activa' && totalLecciones > 0 && (<>
              <div className="al-progreso-barra"><div className="al-progreso-fill" style={{width:`${porcentaje}%`}}/></div>
              <div style={{fontSize:'11px',color:'var(--text-muted)'}}>{a.leccionesCompletadas} de {totalLecciones} lecciones · {porcentaje}%</div>
            </>)}

            {a.estado !== 'activa' && a.estado !== 'baja' && a.metodoPago === 'usd' && (
              <div style={{fontSize:'11.5px',color:'#92400E',background:'#FFFBEB',border:'0.5px solid #FDE68A',borderRadius:'8px',padding:'8px 10px',marginBottom:'4px'}}>
                Eligió pagar en dólares{(a.precioAcordadoUsd ?? precioUSD) ? ` (USD ${a.precioAcordadoUsd ?? precioUSD})` : ''} y avisó que pagó. Revisá tu cuenta y confirmalo cuando te llegue.
              </div>
            )}
            {a.estado !== 'activa' && a.estado !== 'baja' && a.cuponCodigo && (
              <div style={{fontSize:'11.5px',color:'var(--pink)',background:'var(--pink-light)',borderRadius:'8px',padding:'7px 10px',marginBottom:'4px'}}>
                Con cupón {a.cuponCodigo} (−{a.cuponPorcentaje}%) · tenía que pagar {a.metodoPago === 'usd' && a.precioAcordadoUsd ? `USD ${a.precioAcordadoUsd}` : a.precioAcordado != null ? `$${a.precioAcordado.toLocaleString('es-AR')}` : 'el precio con descuento'}
              </div>
            )}
            {a.estado !== 'activa' && a.estado !== 'baja' && (
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

            {a.estado === 'baja' && (
              <div className="al-baja-box">
                <span>No puede entrar al curso. Sus pagos, certificado y cuaderno siguen guardados.</span>
                <button className="al-btn-reactivar" onClick={() => setAReactivar(a)}><RotateCcw size={12}/> Reactivar acceso</button>
              </div>
            )}
            {a.estado === 'activa' && (
              <div className="al-acciones">
                <button className="al-btn-sutil" onClick={() => setAQuitar(a)}><UserX size={12}/> Quitar acceso</button>
              </div>
            )}
          </div>
        )
      })}

      {aQuitar && (() => {
        const a = aQuitar
        const cobroVivo = !!a.suscripcionEstado && SUS_VIVA.includes(a.suscripcionEstado)
        const diasPagos = diasParaVencer(a.fechaVencimiento)
        return (
          <div className="al-mo" onClick={() => !procesando && setAQuitar(null)}>
            <div className="al-mo-box" role="dialog" aria-modal="true" aria-labelledby="al-mo-quitar" onClick={e => e.stopPropagation()}>
              <div className="al-mo-tit">
                <span id="al-mo-quitar">¿Quitarle el acceso a {a.nombre} ahora?</span>
                <button className="al-mo-x" aria-label="Cerrar" onClick={() => setAQuitar(null)} disabled={procesando}><X size={13}/></button>
              </div>
              {cobroVivo && a.modalidad === 'suscripcion' && diasPagos !== null && diasPagos > 0 && (
                <div className="al-mo-sugerencia">
                  Si solo querés que no se le cobre más, usá <strong>«Cancelar cobro automático»</strong>: sigue entrando hasta el {formatFecha(a.fechaVencimiento)}, que ya pagó, y después se le vence sola.
                </div>
              )}
              <ul className="al-mo-lista">
                <li><UserX size={14} color="#B91C1C"/><span>Deja de ver el curso <strong>desde ahora</strong>{a.modalidad === 'suscripcion' && diasPagos !== null && diasPagos > 0 ? ', aunque le queden días pagos' : ''}.</span></li>
                {cobroVivo && <li><Check size={14} color="#166534"/><span>Primero cancelamos su cobro automático: no se le cobra más.</span></li>}
                <li><Mail size={14} color="var(--text-muted)"/><span>No le llega ningún mail de Luma.</span></li>
                <li><RotateCcw size={14} color="var(--accent)"/><span>No se borra nada: pagos, certificado y cuaderno quedan. La podés reactivar cuando quieras.</span></li>
              </ul>
              <div className="al-mo-botones">
                <button className="al-mo-btn sec" onClick={() => setAQuitar(null)} disabled={procesando}>No, volver</button>
                <button className="al-mo-btn peligro" onClick={() => quitarAcceso(a)} disabled={procesando}>
                  {procesando ? 'Quitando…' : 'Sí, quitar acceso'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {aReactivar && (() => {
        const a = aReactivar
        const dias = diasParaVencer(a.fechaVencimiento)
        const vencida = a.modalidad === 'suscripcion' && dias !== null && dias < 0
        return (
          <div className="al-mo" onClick={() => !procesando && setAReactivar(null)}>
            <div className="al-mo-box" role="dialog" aria-modal="true" aria-labelledby="al-mo-reactivar" onClick={e => e.stopPropagation()}>
              <div className="al-mo-tit">
                <span id="al-mo-reactivar">¿Reactivar el acceso de {a.nombre}?</span>
                <button className="al-mo-x" aria-label="Cerrar" onClick={() => setAReactivar(null)} disabled={procesando}><X size={13}/></button>
              </div>
              <ul className="al-mo-lista">
                <li><RotateCcw size={14} color="var(--accent)"/><span>{vencida
                  ? 'Su mes ya había vencido: va a aparecer como vencida. Cuando te pague, tocá «Habilitar mes siguiente».'
                  : a.modalidad === 'suscripcion' && a.fechaVencimiento
                    ? `Vuelve a entrar al curso hasta el ${formatFecha(a.fechaVencimiento)}, lo que ya había pagado.`
                    : 'Vuelve a entrar al curso, con su progreso y su cuaderno como los dejó.'}</span></li>
                <li><Check size={14} color="#166534"/><span>No se le cobra nada y no le llega ningún mail.</span></li>
                {a.modalidad === 'suscripcion' && <li><Clock size={14} color="var(--text-muted)"/><span>El cobro automático no se vuelve a prender solo: si lo quiere, lo activa ella desde Mis cursos.</span></li>}
              </ul>
              <div className="al-mo-botones">
                <button className="al-mo-btn sec" onClick={() => setAReactivar(null)} disabled={procesando}>No, volver</button>
                <button className="al-mo-btn ok" onClick={() => reactivar(a)} disabled={procesando}>
                  {procesando ? 'Reactivando…' : 'Sí, reactivar'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}