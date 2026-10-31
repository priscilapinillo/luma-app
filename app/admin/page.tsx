'use client'

// Panel de Admin (solo Priscila). Mostrar o no la página se decide acá; los datos y las acciones
// los vuelve a verificar SIEMPRE el servidor con su sesión.
import { useEffect, useMemo, useState } from 'react'
import type React from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from '@/components/ToastProvider'

const ADMIN_EMAIL = 'priscilapinillo78@gmail.com'
type Pestana = 'resumen' | 'pagos' | 'clientas' | 'errores' | 'guardia'

const TIPO: Record<string, { txt: string; color: string; fondo: string }> = {
  prueba: { txt: 'En prueba', color: '#5B21B6', fondo: '#EDE8FF' },
  pago: { txt: 'Al día', color: '#166534', fondo: '#DCFCE7' },
  gracia: { txt: 'En gracia', color: '#92400E', fondo: '#FEF3C7' },
  cancelado_vigente: { txt: 'Canceló (con días)', color: '#475569', fondo: '#F1F5F9' },
  vencido: { txt: 'Vencida', color: '#991B1B', fondo: '#FEE2E2' },
  prueba_vencida: { txt: 'Prueba vencida', color: '#991B1B', fondo: '#FEE2E2' },
  sin_plan: { txt: 'Sin plan', color: '#475569', fondo: '#F1F5F9' },
}
const CONCEPTO: Record<string, string> = { mes: '1 mes', anual: 'anual', diferencia: 'pasar a Premium' }
const pesos = (n: number) => '$' + Math.round(Number(n) || 0).toLocaleString('es-AR')
const fecha = (iso?: string | null) => iso ? new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const hace = (iso?: string | null) => {
  if (!iso) return 'nunca'
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000)
  if (m < 2) return 'ahora'
  if (m < 60) return `hace ${m} min`
  const h = Math.round(m / 60); if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24); return `hace ${d} día${d === 1 ? '' : 's'}`
}

const tarjeta: React.CSSProperties = { background: 'white', borderRadius: '16px', padding: '16px 18px', border: '1px solid #EDE9FF' }
const btn = (fondo: string, color = 'white', borde = 'none'): React.CSSProperties => ({ padding: '8px 12px', borderRadius: '9px', background: fondo, color, border: borde, fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' })

export default function AdminPanel() {
  const [estado, setEstado] = useState<'cargando' | 'no' | 'si'>('cargando')
  const [pestana, setPestana] = useState<Pestana>('resumen')
  const [d, setD] = useState<any>(null)
  const [cargando, setCargando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<string>('todas')
  const [confirmar, setConfirmar] = useState<null | { titulo: string; texto: string; boton: string; peligro?: boolean; hacer: () => Promise<void> }>(null)
  const [haciendo, setHaciendo] = useState(false)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await createClient().auth.getUser()
      if (!user) { window.location.href = '/auth/login'; return }
      if ((user.email || '').toLowerCase() !== ADMIN_EMAIL) { setEstado('no'); return }
      setEstado('si')
      cargar()
    })()
  }, [])
  // se actualiza solo cada minuto mientras está a la vista
  useEffect(() => {
    if (estado !== 'si') return
    const t = setInterval(() => { if (document.visibilityState === 'visible') cargar(true) }, 60000)
    return () => clearInterval(t)
  }, [estado])

  async function token() { const { data: { session } } = await createClient().auth.getSession(); return session?.access_token || '' }
  async function cargar(silencioso = false) {
    if (!silencioso) setCargando(true)
    try {
      const res = await fetch('/api/admin/panel', { headers: { Authorization: `Bearer ${await token()}` }, cache: 'no-store' })
      const j = await res.json().catch(() => null)
      if (!res.ok || !j) { if (!silencioso) toast('No se pudo cargar el panel. Probá de nuevo.', 'error'); return }
      setD(j)
    } finally { if (!silencioso) setCargando(false) }
  }
  async function accion(cuerpo: Record<string, unknown>, okTxt: string) {
    const res = await fetch('/api/admin/accion', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify(cuerpo) })
    const r = await res.json().catch(() => ({}))
    if (r.ok) { toast(okTxt); await cargar(true) } else toast(r.error || 'No se pudo hacer. Probá de nuevo.', 'error')
    return r
  }
  async function ejecutarConfirmado() {
    if (!confirmar || haciendo) return
    setHaciendo(true)
    try { await confirmar.hacer() } finally { setHaciendo(false); setConfirmar(null) }
  }

  const clientas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return (d?.clientas || []).filter((c: any) =>
      (filtro === 'todas' || (filtro === 'automatico' ? c.automatico : c.tipo === filtro)) &&
      (!q || c.email.toLowerCase().includes(q) || c.nombre.toLowerCase().includes(q)))
  }, [d, busqueda, filtro])

  if (estado === 'cargando') return <div style={{ padding: 40, fontFamily: 'Inter, sans-serif', color: '#7C6BAA' }}>Cargando…</div>
  if (estado === 'no') return <div style={{ padding: 40, fontFamily: 'Inter, sans-serif' }}>Esta página es solo para la administración de Luma.</div>

  const pendientes = d?.transferencias?.length || 0
  const errores = d?.errores?.length || 0
  const guardia = d?.guardia?.[0]
  const tabs: [Pestana, string, number?][] = [['resumen', 'Resumen'], ['pagos', 'Pagos', pendientes], ['clientas', 'Clientas'], ['errores', 'Errores', errores], ['guardia', 'Guardia', guardia?.alarmas_seguridad || 0]]

  return (
    <div style={{ minHeight: '100vh', background: '#F0EEFF', fontFamily: 'Inter, sans-serif', color: '#1A1035' }}>
      <style>{`
        .ad-tabs{display:flex;gap:6px;overflow-x:auto;padding:0 16px;scrollbar-width:none}
        .ad-tab{padding:12px 14px;border:none;background:none;font-size:13px;font-weight:600;color:#7C6BAA;cursor:pointer;border-bottom:2px solid transparent;font-family:inherit;white-space:nowrap;display:flex;gap:6px;align-items:center}
        .ad-tab.act{color:#8B5CF6;border-bottom-color:#8B5CF6}
        .ad-num{background:#EF4444;color:white;border-radius:10px;font-size:10px;padding:1px 7px;font-weight:700}
        .ad-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px}
        .ad-kpi-n{font-size:26px;font-weight:800;line-height:1.1}
        .ad-kpi-t{font-size:11.5px;color:#7C6BAA;font-weight:600;margin-top:4px}
        .ad-fila{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-top:1px solid #F1EEFF;flex-wrap:wrap}
        .ad-fila:first-child{border-top:none}
        .ad-chip{font-size:11px;font-weight:700;padding:3px 9px;border-radius:10px;white-space:nowrap}
        .ad-sec{font-size:17px;font-weight:800;margin:22px 0 10px}
        .ad-ayuda{font-size:12.5px;color:#7C6BAA;line-height:1.5;margin:-4px 0 12px}
        .ad-mo{position:fixed;inset:0;background:rgba(20,16,35,.45);display:flex;align-items:center;justify-content:center;padding:16px;z-index:50}
        .ad-mo-box{background:white;border-radius:18px;max-width:420px;width:100%;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.25)}
        .ad-punto{width:8px;height:8px;border-radius:50%;background:#22C55E;display:inline-block;box-shadow:0 0 0 3px rgba(34,197,94,.2)}
      `}</style>

      <div style={{ background: '#1A1035', color: 'white', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 800 }}>Luma · Admin</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#C4B5FD' }}>{d?.generado ? `Actualizado ${hace(d.generado)}` : ''}</span>
          <button onClick={() => cargar()} style={btn('rgba(255,255,255,.12)')} disabled={cargando}>{cargando ? 'Cargando…' : 'Actualizar'}</button>
          <a href="/admin/novedades" style={{ ...btn('#8B5CF6'), textDecoration: 'none' }}>Novedades</a>
        </div>
      </div>
      <div style={{ background: 'white', borderBottom: '1px solid #EDE9FF' }}>
        <div className="ad-tabs" role="tablist">
          {tabs.map(([id, txt, n]) => (
            <button key={id} role="tab" aria-selected={pestana === id} className={`ad-tab${pestana === id ? ' act' : ''}`} onClick={() => setPestana(id)}>
              {txt}{n ? <span className="ad-num">{n}</span> : null}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '18px 16px 60px' }}>
        {!d ? <div style={{ color: '#7C6BAA' }}>Cargando datos…</div> : (<>
          {d.fallas?.length > 0 && <div style={{ ...tarjeta, background: '#FFFBEB', borderColor: '#FDE68A', fontSize: '12.5px', marginBottom: '12px' }}>Algunos datos no se pudieron leer: {d.fallas.join(', ')}. ¿Corriste el SQL de la etapa 3?</div>}

          {/* ── RESUMEN */}
          {pestana === 'resumen' && (<>
            <div className="ad-grid">
              <div style={tarjeta}><div className="ad-kpi-n" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span className="ad-punto"/>{d.conectadas?.ahora?.length || 0}</div><div className="ad-kpi-t">Conectadas ahora</div></div>
              <div style={tarjeta}><div className="ad-kpi-n">{d.conectadas?.hoy || 0}</div><div className="ad-kpi-t">Usaron Luma hoy</div></div>
              <div style={tarjeta}><div className="ad-kpi-n">{d.conectadas?.semana || 0}</div><div className="ad-kpi-t">En los últimos 7 días</div></div>
              <div style={tarjeta}><div className="ad-kpi-n">{pesos(d.pagos?.mes || 0)}</div><div className="ad-kpi-t">Cobrado este mes ({d.pagos?.cantidadMes || 0} pagos)</div></div>
              <div style={tarjeta}><div className="ad-kpi-n">{pesos(d.planes?.ingresoMensualEstimado || 0)}</div><div className="ad-kpi-t">Por mes con cobro automático</div></div>
              <div style={tarjeta}><div className="ad-kpi-n">{d.planes?.automaticas || 0}</div><div className="ad-kpi-t">Con cobro automático</div></div>
              <div style={tarjeta}><div className="ad-kpi-n">{d.cuentas?.total || 0}</div><div className="ad-kpi-t">Cuentas · {d.cuentas?.nuevasSemana || 0} nuevas esta semana</div></div>
              <div style={tarjeta}><div className="ad-kpi-n">{pendientes}</div><div className="ad-kpi-t">Transferencias por confirmar</div></div>
            </div>

            <div className="ad-sec">Estado de las clientas</div>
            <div className="ad-grid">
              {Object.entries(TIPO).map(([k, v]) => (
                <button key={k} onClick={() => { setFiltro(k); setPestana('clientas') }} style={{ ...tarjeta, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}>
                  <div className="ad-kpi-n">{d.planes?.porTipo?.[k] || 0}</div>
                  <div className="ad-chip" style={{ display: 'inline-block', marginTop: '6px', color: v.color, background: v.fondo }}>{v.txt}</div>
                </button>
              ))}
            </div>

            {d.conectadas?.ahora?.length > 0 && (<>
              <div className="ad-sec">Conectadas ahora</div>
              <div style={tarjeta}>{d.conectadas.ahora.map((c: any) => <div key={c.id} className="ad-fila"><span><span className="ad-punto" style={{ marginRight: 8 }}/>{c.nombre || c.email}</span><span style={{ fontSize: 12, color: '#7C6BAA' }}>{c.email}</span></div>)}</div>
            </>)}

            <div className="ad-sec">Uso de Luma</div>
            <div className="ad-grid">
              <div style={tarjeta}><div className="ad-kpi-n">{d.uso?.paginasActivas ?? '—'}</div><div className="ad-kpi-t">Páginas de reservas activas</div></div>
              <div style={tarjeta}><div className="ad-kpi-n">{d.uso?.reservasSemana ?? '—'}</div><div className="ad-kpi-t">Reservas online (7 días)</div></div>
              <div style={tarjeta}><div className="ad-kpi-n">{d.uso?.turnosSemana ?? '—'}</div><div className="ad-kpi-t">Turnos creados (7 días)</div></div>
              <div style={tarjeta}><div className="ad-kpi-n">{d.uso?.cursosPublicados ?? '—'}</div><div className="ad-kpi-t">Cursos publicados</div></div>
              <div style={tarjeta}><div className="ad-kpi-n">{d.uso?.alumnas ?? '—'}</div><div className="ad-kpi-t">Alumnas</div></div>
              <div style={tarjeta}><div className="ad-kpi-n">{(d.planes?.basico || 0)} / {(d.planes?.premium || 0)}</div><div className="ad-kpi-t">Básico / Premium con acceso</div></div>
            </div>

            {d.espacio && (<>
              <div className="ad-sec">Espacio de archivos</div>
              <div className="ad-ayuda">El plan gratis de Supabase trae 1 GB para todo (fotos, notas de pacientes, portadas y descargables). A los {d.espacio.topeMb} MB se pausan las subidas nuevas de descargables. Cada terapeuta tiene 100 MB para descargables; podés darle más a una puntual.</div>
              <div style={tarjeta}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><b>Todo Luma</b><span><b>{d.espacio.totalMb} MB</b> de {d.espacio.giga} MB</span></div>
                <div style={{ height: 8, borderRadius: 6, background: '#EDE9FF', marginTop: 8, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, d.espacio.totalMb / d.espacio.giga * 100)}%`, background: d.espacio.totalMb >= d.espacio.topeMb ? '#EF4444' : d.espacio.totalMb >= 700 ? '#F59E0B' : '#10B981' }}/>
                </div>
              </div>
              <div style={{ ...tarjeta, marginTop: 10 }}>
                {d.espacio.terapeutas.length === 0 ? <div style={{ fontSize: 13, color: '#7C6BAA' }}>Todavía nadie subió descargables.</div> : d.espacio.terapeutas.map((t: any) => (
                  <div key={t.id} className="ad-fila">
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700 }}>{t.nombre || t.email}</div>
                      <div style={{ fontSize: 12, color: '#7C6BAA' }}>{t.usadoMb} MB de {t.totalMb} MB · {t.archivos} archivo{t.archivos !== 1 ? 's' : ''}{t.extraMb ? ` · +${t.extraMb} MB extra` : ''}</div>
                    </div>
                    <button style={btn('white', '#6B3FA0', '1px solid #DDD5F5')} onClick={async () => {
                      const v = prompt(`¿Cuántos MB EXTRA le das a ${t.nombre || t.email}? (0 a 2000; hoy: ${t.extraMb || 0})`, String(t.extraMb || 0))
                      if (v === null) return
                      const mb = Number(v.replace(/[^\d]/g, ''))
                      if (!Number.isFinite(mb) || mb < 0 || mb > 2000) { toast('Elegí entre 0 y 2000 MB.', 'error'); return }
                      await accion({ accion: 'espacio_extra', id: t.id, mb }, `Listo: ${t.nombre || t.email} tiene ${100 + mb} MB para descargables.`)
                    }}>Espacio extra</button>
                  </div>
                ))}
              </div>
            </>)}

            <VideoBienvenidaAdmin accion={accion} tarjeta={tarjeta}/>
          </>)}

          {/* ── PAGOS */}
          {pestana === 'pagos' && (<>
            <div className="ad-sec" style={{ marginTop: 0 }}>Transferencias por confirmar</div>
            <div className="ad-ayuda">Confirmá solo cuando veas la plata y el comprobante en tu mail. Al confirmar, el plan se activa solo y le llega un mail. Nunca se suma dos veces.</div>
            <div style={tarjeta}>
              {pendientes === 0 ? <div style={{ fontSize: 13, color: '#7C6BAA' }}>No hay transferencias esperando.</div> : d.transferencias.map((t: any) => (
                <div key={t.id} className="ad-fila">
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}>{t.nombre || t.email}</div>
                    <div style={{ fontSize: 12, color: '#7C6BAA' }}>{t.email} · avisó {hace(t.avisado_at)}</div>
                    <div style={{ fontSize: 12.5, marginTop: 4 }}>{t.plan === 'premium' ? 'Premium' : 'Básico'} · {CONCEPTO[t.concepto] || t.concepto} · <b>{pesos(t.monto)}</b></div>
                    {t.detalle && <div style={{ fontSize: 11.5, color: '#7C6BAA', marginTop: 2 }}>{t.detalle}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={btn('#16A34A')} onClick={() => setConfirmar({
                      titulo: `¿Confirmar ${pesos(t.monto)} de ${t.nombre || t.email}?`,
                      texto: `Se activa ${t.plan === 'premium' ? 'Premium' : 'Básico'} (${CONCEPTO[t.concepto] || t.concepto}) y le llega un mail de confirmación. Hacelo solo si ya viste la plata en tu cuenta.`,
                      boton: 'Sí, confirmar', hacer: async () => { await accion({ accion: 'confirmar_transferencia', id: t.id }, 'Transferencia confirmada: el plan ya está activo.') },
                    })}>Confirmar</button>
                    <button style={btn('white', '#B91C1C', '1px solid #FECACA')} onClick={() => setConfirmar({
                      titulo: '¿Marcar que no llegó?', texto: 'Le llega un mail amable pidiendo que revise el comprobante. No se le quita nada de lo que ya tiene.',
                      boton: 'Sí, no llegó', peligro: true, hacer: async () => { await accion({ accion: 'rechazar_transferencia', id: t.id }, 'Listo: le avisamos que revise la transferencia.') },
                    })}>No llegó</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="ad-sec">Últimos pagos del plan</div>
            <div style={tarjeta}>
              {(d.pagos?.ultimos || []).length === 0 ? <div style={{ fontSize: 13, color: '#7C6BAA' }}>Todavía no hay pagos en los últimos 2 meses.</div> : d.pagos.ultimos.map((p: any, i: number) => (
                <div key={i} className="ad-fila">
                  <span><b>{p.nombre || '—'}</b> <span style={{ fontSize: 12, color: '#7C6BAA' }}>· {fecha(p.fecha)} · {p.plan === 'premium' ? 'Premium' : 'Básico'} · {p.metodo}</span></span>
                  <span style={{ fontWeight: 700, color: p.estado === 'aprobado' ? '#1A1035' : '#B91C1C' }}>{pesos(p.monto)}{p.estado !== 'aprobado' ? ` (${p.estado})` : ''}</span>
                </div>
              ))}
            </div>
          </>)}

          {/* ── CLIENTAS */}
          {pestana === 'clientas' && (<>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por email o nombre…" aria-label="Buscar clienta"
                style={{ flex: 1, minWidth: 200, padding: '11px 14px', borderRadius: 12, border: '1px solid #DDD5F5', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: 'white' }}/>
              <select value={filtro} onChange={e => setFiltro(e.target.value)} aria-label="Filtrar por estado"
                style={{ padding: '11px 12px', borderRadius: 12, border: '1px solid #DDD5F5', fontSize: 14, fontFamily: 'inherit', background: 'white' }}>
                <option value="todas">Todas</option>
                <option value="automatico">Con cobro automático</option>
                {Object.entries(TIPO).map(([k, v]) => <option key={k} value={k}>{v.txt}</option>)}
              </select>
            </div>
            <div className="ad-ayuda">«Cancelar cobro automático»: para cuando una clienta te pide la baja por mail. Conserva lo que ya pagó y le llega un mail con la confirmación.</div>
            <div style={tarjeta}>
              {clientas.length === 0 ? <div style={{ fontSize: 13, color: '#7C6BAA' }}>No hay clientas con ese filtro.</div> : clientas.slice(0, 300).map((c: any) => {
                const t = TIPO[c.tipo] || TIPO.sin_plan
                return (
                  <div key={c.id} className="ad-fila">
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700 }}>{c.nombre || c.email}</div>
                      <div style={{ fontSize: 12, color: '#7C6BAA', overflowWrap: 'anywhere' }}>{c.email} · usó Luma {hace(c.visto)}</div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
                        <span className="ad-chip" style={{ color: t.color, background: t.fondo }}>{t.txt}</span>
                        <span style={{ fontSize: 12 }}>{c.plan === 'premium' ? 'Premium' : 'Básico'}{c.automatico ? ' · cobro automático' : ''}</span>
                        {c.venceEl && <span style={{ fontSize: 12, color: '#7C6BAA' }}>· {c.tipo === 'prueba' ? 'prueba hasta' : c.tipo === 'vencido' || c.tipo === 'prueba_vencida' ? 'venció' : c.automatico ? 'próximo cobro' : 'pagado hasta'} {fecha(c.venceEl)}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={btn('white', '#5B21B6', '1px solid #DDD5F5')} onClick={() => { navigator.clipboard?.writeText(c.email).then(() => toast('Email copiado'), () => toast('No se pudo copiar', 'error')) }}>Copiar email</button>
                      {c.automatico && (
                        <button style={btn('white', '#B91C1C', '1px solid #FECACA')} onClick={() => setConfirmar({
                          titulo: `¿Cancelar el cobro automático de ${c.nombre || c.email}?`,
                          texto: 'Mercado Pago no le cobra más. Conserva todo hasta el último día pagado y le llega un mail con la confirmación.',
                          boton: 'Sí, cancelar', peligro: true, hacer: async () => { await accion({ accion: 'cancelar_cobro', id: c.id }, 'Cobro automático cancelado.') },
                        })}>Cancelar cobro automático</button>
                      )}
                    </div>
                  </div>
                )
              })}
              {clientas.length > 300 && <div style={{ fontSize: 12, color: '#7C6BAA', paddingTop: 10 }}>Mostrando 300 de {clientas.length}. Usá el buscador.</div>}
            </div>
          </>)}

          {/* ── ERRORES */}
          {pestana === 'errores' && (<>
            <div className="ad-ayuda">Acá aparece todo lo que necesita tu atención: pagos que no se pudieron aplicar, montos raros, devoluciones, cobros que no se pudieron cancelar y errores de las suscripciones de cursos.</div>
            <div style={tarjeta}>
              {errores === 0 ? <div style={{ fontSize: 13, color: '#166534' }}>Todo en orden: no hay errores para revisar.</div> : d.errores.map((e: any) => (
                <div key={e.id} className="ad-fila">
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}>{e.titulo}</div>
                    <div style={{ fontSize: 12, color: '#7C6BAA' }}>{e.veces > 1 ? `${e.veces} veces · la última ` : ''}{hace(e.created_at)}{e.nombre ? ` · ${e.nombre}` : ''} · {e.origen === 'dinero' ? 'plan de Luma' : 'cursos'}</div>
                    {e.detalle?.mensaje && <div style={{ fontSize: 12.5, marginTop: 4 }}>{e.detalle.mensaje}</div>}
                  </div>
                  {e.origen === 'dinero' && <button style={btn('white', '#5B21B6', '1px solid #DDD5F5')} onClick={() => accion({ accion: 'resolver_alerta', id: e.id }, 'Marcado como resuelto')}>Ya lo resolví</button>}
                </div>
              ))}
            </div>
          </>)}

          {/* ── GUARDIA */}
          {pestana === 'guardia' && (<>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div className="ad-ayuda" style={{ margin: 0 }}>La revisión de seguridad y datos que te llega todas las mañanas.</div>
              <button style={btn('#8B5CF6')} onClick={() => setConfirmar({ titulo: '¿Revisar ahora?', texto: 'Corre la misma revisión de todas las mañanas y te llega el aviso al celular.', boton: 'Revisar', hacer: async () => { await accion({ accion: 'revisar_ahora' }, 'Revisión hecha') } })}>Revisar ahora</button>
            </div>
            {(d.guardia || []).length === 0 ? <div style={{ ...tarjeta, marginTop: 12, fontSize: 13, color: '#7C6BAA' }}>Todavía no hay revisiones guardadas.</div> : d.guardia.map((g: any, i: number) => {
              const detalle: any[] = Array.isArray(g.detalle) ? g.detalle : []
              const color = g.alarmas_seguridad ? '#B91C1C' : g.para_revisar ? '#92400E' : '#166534'
              return (
                <div key={i} style={{ ...tarjeta, marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <b style={{ color }}>{g.alarmas_seguridad ? `${g.alarmas_seguridad} alarma(s) de seguridad` : g.para_revisar ? `${g.para_revisar} cosa(s) para revisar` : 'Todo en orden'}</b>
                    <span style={{ fontSize: 12, color: '#7C6BAA' }}>{new Date(g.created_at).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {detalle.length > 0 && <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12.5, lineHeight: 1.6 }}>{detalle.slice(0, i === 0 ? 30 : 5).map((h, j) => <li key={j}><b style={{ color: h.tipo === 'seguridad' ? '#B91C1C' : '#92400E' }}>{h.tipo === 'seguridad' ? 'Seguridad' : 'Revisar'}:</b> {h.que}</li>)}</ul>}
                </div>
              )
            })}
          </>)}
        </>)}
      </div>

      {confirmar && (
        <div className="ad-mo" onClick={() => !haciendo && setConfirmar(null)}>
          <div className="ad-mo-box" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>{confirmar.titulo}</div>
            <div style={{ fontSize: 13, color: '#4A3F6B', lineHeight: 1.55, marginBottom: 16 }}>{confirmar.texto}</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={btn('#F1EEFF', '#1A1035')} onClick={() => setConfirmar(null)} disabled={haciendo}>No, volver</button>
              <button style={btn(confirmar.peligro ? '#B91C1C' : '#16A34A')} onClick={ejecutarConfirmado} disabled={haciendo}>{haciendo ? 'Un momento…' : confirmar.boton}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
// Video de bienvenida del Inicio: lo ven todas las terapeutas hasta que tocan «Ya lo vi». Si lo cambiás, les vuelve a aparecer.
function VideoBienvenidaAdmin({ accion, tarjeta }: { accion: (c: Record<string, unknown>, ok: string) => Promise<any>; tarjeta: React.CSSProperties }) {
  const [url, setUrl] = useState('')
  const [titulo, setTitulo] = useState('')
  const [actual, setActual] = useState('')
  const [guardando, setGuardando] = useState(false)
  useEffect(() => {
    createClient().from('luma_config').select('valor').eq('clave', 'video_bienvenida').maybeSingle().then(({ data }) => {
      const v: any = data?.valor || {}
      setUrl(v.url || ''); setTitulo(v.titulo || ''); setActual(v.url || '')
    })
  }, [])
  async function guardar(u: string) {
    setGuardando(true)
    const r = await accion({ accion: 'video_bienvenida', url: u, titulo }, u ? 'Video guardado: lo van a ver en el Inicio.' : 'Listo: ya no aparece el video.')
    if (r?.ok) { setActual(u); if (!u) setUrl('') }
    setGuardando(false)
  }
  const campo: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid #DDD5F5', fontSize: 14, fontFamily: 'inherit' }
  return (<>
    <div className="ad-sec">Video de bienvenida</div>
    <div className="ad-ayuda">Aparece arriba en el Inicio de todas las terapeutas hasta que tocan «Ya lo vi». Si lo cambiás por otro, les vuelve a aparecer. Sirve YouTube (también Vimeo, Loom o Drive).</div>
    <div style={{ ...tarjeta, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://youtu.be/…" style={campo} aria-label="Link del video"/>
      <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Título (opcional): Bienvenida a Luma" maxLength={80} style={campo} aria-label="Título del video"/>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button disabled={guardando || !url.trim()} onClick={() => guardar(url.trim())} style={{ padding: '9px 16px', borderRadius: 10, border: 'none', background: '#8B5CF6', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{guardando ? 'Guardando…' : 'Guardar'}</button>
        {actual && <button disabled={guardando} onClick={() => guardar('')} style={{ padding: '9px 16px', borderRadius: 10, border: '1px solid #DDD5F5', background: 'white', color: '#6B3FA0', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Sacar el video</button>}
      </div>
      {actual ? <div style={{ fontSize: 12, color: '#7C6BAA' }}>Ahora se muestra: {actual}</div> : <div style={{ fontSize: 12, color: '#7C6BAA' }}>Ahora no hay video.</div>}
    </div>
  </>)
}
