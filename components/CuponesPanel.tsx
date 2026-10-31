'use client'
// Cupones de descuento de la terapeuta (en Servicios; Cursos tiene un acceso directo).
// · Crear: el formulario se despliega arriba de la lista (sin pantalla nueva).
// · Con Básico: 1 cupón activo y solo para sesiones. La base lo exige igual aunque alguien fuerce la pantalla.
// · El descuento lo calcula siempre el servidor al pagar; acá solo se configura.
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from '@/components/ToastProvider'
import { calcularAcceso } from '@/lib/acceso'
import { Tag, Plus, X, Link2, Copy, Archive, Pencil } from 'lucide-react'

type Cupon = {
  id: string; codigo: string; porcentaje: number; cursos: string[]; servicios: string[]
  vence_el: string | null; usos_max: number | null; una_por_persona: boolean; meses: 'primero' | 'todos'
  activo: boolean; archivado: boolean; created_at: string
}
type Uso = { cupon_id: string; estado: string; expira_at: string | null; precio_original: number; precio_final: number; moneda: string }
type Item = { id: string; nombre: string; mensual?: boolean }

const normalizar = (c: string) => c.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20)
const hoyAR = () => new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10)
const fechaCorta = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
const plata = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')
const vacio = { codigo: '', porcentaje: '' as string | number, para: 'todo' as 'todo' | 'elegir', cursos: [] as string[], servicios: [] as string[], vence_el: '', usos_max: '' as string | number, una_por_persona: true, meses: 'primero' as 'primero' | 'todos' }

function mensajeError(e: any, codigo: string): string {
  const m = String(e?.message || '')
  if (e?.code === '23505') return `Ya tenés un cupón ${codigo}.`
  if (m.includes('basico_solo_sesiones')) return 'Con Básico los cupones son solo para sesiones.'
  if (m.includes('plan_vencido')) return 'Tu plan venció: renovalo para usar cupones.'
  if (m.includes('cupon_ya_usado')) return 'El código y el % no se pueden cambiar porque el cupón ya se usó. Creá uno nuevo.'
  if (m.includes('usos_menor_a_usados')) return 'No podés poner menos usos de los que ya se usaron.'
  if (m.includes('porcentaje')) return 'El descuento va del 5% al 90%.'
  if (m.includes('codigo')) return 'El código tiene que tener entre 3 y 20 letras o números.'
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'No se pudo guardar. Revisá tu internet.'
  return 'No se pudo guardar. Probá de nuevo.'
}

export default function CuponesPanel() {
  const [cupones, setCupones] = useState<Cupon[]>([])
  const [usos, setUsos] = useState<Uso[]>([])
  const [cursos, setCursos] = useState<Item[]>([])
  const [servicios, setServicios] = useState<Item[]>([])
  const [nivel, setNivel] = useState<'premium' | 'basico' | 'sin_acceso'>('premium')
  const [slug, setSlug] = useState('')
  const [cargando, setCargando] = useState(true)
  const [abierto, setAbierto] = useState(false)
  const [form, setForm] = useState({ ...vacio })
  const [editando, setEditando] = useState<string | null>(null)
  const [edicion, setEdicion] = useState({ vence_el: '', usos_max: '' as string | number })
  const [guardando, setGuardando] = useState(false)
  const basico = nivel !== 'premium'

  useEffect(() => { cargar() }, [])

  async function cargar() {
    try {
      const s = createClient()
      const { data: { user } } = await s.auth.getUser()
      if (!user) return
      const [{ data: c }, { data: u }, { data: cu }, { data: sv }, { data: sub }, { data: perfil }] = await Promise.all([
        s.from('cupones').select('*').eq('terapeuta_id', user.id).eq('archivado', false).order('created_at', { ascending: false }),
        s.from('cupon_usos').select('cupon_id, estado, expira_at, precio_original, precio_final, moneda').eq('terapeuta_id', user.id).neq('estado', 'liberado'),
        s.from('courses').select('id, titulo, modalidad, estado').eq('user_id', user.id).neq('estado', 'archivado'),
        s.from('services').select('id, nombre').eq('user_id', user.id).eq('activo', true),
        s.from('subscriptions').select('status, plan, trial_ends_at, current_period_ends_at, mp_subscription_id').eq('user_id', user.id).maybeSingle(),
        s.from('therapist_profiles').select('slug').eq('user_id', user.id).maybeSingle(),
      ])
      setCupones((c || []) as Cupon[])
      setUsos((u || []) as Uso[])
      setCursos((cu || []).map((x: any) => ({ id: x.id, nombre: x.titulo, mensual: x.modalidad === 'suscripcion' })))
      setServicios((sv || []).map((x: any) => ({ id: x.id, nombre: x.nombre })))
      setNivel(calcularAcceso(sub as any))
      setSlug((perfil as any)?.slug || '')
    } finally { setCargando(false) }
  }

  // el que funciona con Básico: el más nuevo activo
  const elQueFunciona = useMemo(() => cupones.filter(c => c.activo).sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.id, [cupones])

  function numeros(c: Cupon) {
    const ahora = new Date().toISOString()
    const de = usos.filter(u => u.cupon_id === c.id)
    const confirmados = de.filter(u => u.estado === 'confirmado')
    const enPago = de.filter(u => u.estado === 'reservado' && (u.expira_at || '') > ahora).length
    const vendio = confirmados.filter(u => u.moneda !== 'USD').reduce((a, u) => a + Number(u.precio_final), 0)
    const desconto = confirmados.filter(u => u.moneda !== 'USD').reduce((a, u) => a + Number(u.precio_original) - Number(u.precio_final), 0)
    return { usados: confirmados.length, enPago, vendio, desconto }
  }
  function estado(c: Cupon): { texto: string; color: string } {
    const n = numeros(c)
    if (!c.activo) return { texto: 'Apagado', color: 'var(--text-muted)' }
    if (c.vence_el && c.vence_el < hoyAR()) return { texto: `Vencido el ${fechaCorta(c.vence_el)}`, color: '#B45309' }
    if (c.usos_max && n.usados >= c.usos_max) return { texto: 'Agotado', color: '#B45309' }
    if (basico && c.id !== elQueFunciona) return { texto: 'En pausa (Básico: funciona 1)', color: '#B45309' }
    return { texto: 'Activo', color: '#059669' }
  }
  function paraQue(c: Cupon) {
    const nc = (c.cursos || []).length, ns = (c.servicios || []).length
    if (!nc && !ns) return basico ? 'Todas tus sesiones' : 'Todo: cursos, descargables y sesiones'
    const nombres = [
      ...cursos.filter(x => c.cursos.includes(x.id)).map(x => x.nombre),
      ...servicios.filter(x => c.servicios.includes(x.id)).map(x => x.nombre),
    ]
    return nombres.length ? `Solo ${nombres.slice(0, 2).join(', ')}${nombres.length > 2 ? ` y ${nombres.length - 2} más` : ''}` : 'Solo lo que elegiste (ya no existe: no se puede usar)'
  }

  function link(c: Cupon) {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://lumaapp.lat'
    return `${base}/p/${encodeURIComponent(slug)}?cupon=${encodeURIComponent(c.codigo)}`
  }
  async function copiar(texto: string, aviso: string) {
    try { await navigator.clipboard.writeText(texto); toast(aviso, 'success') }
    catch { prompt('Copialo desde acá:', texto) }
  }

  // Básico: para prender uno, primero se apaga el que funciona (con confirmación)
  async function hacerLugar(nuevoCodigo: string): Promise<boolean> {
    const otro = cupones.find(c => c.id === elQueFunciona)
    if (!basico || !otro || otro.codigo === nuevoCodigo) return true
    if (!confirm(`Con Básico tenés 1 cupón activo. ¿Apagamos ${otro.codigo} y prendemos ${nuevoCodigo}?`)) return false
    const { error } = await createClient().from('cupones').update({ activo: false }).eq('activo', true).eq('archivado', false)
    if (error) { toast('No se pudo apagar el otro cupón. Probá de nuevo.', 'error'); return false }
    return true
  }

  async function crear() {
    if (guardando) return
    const codigo = normalizar(form.codigo)
    const pct = Math.round(Number(form.porcentaje))
    if (codigo.length < 3) { toast('El código tiene que tener entre 3 y 20 letras o números.', 'error'); return }
    if (!(pct >= 5 && pct <= 90)) { toast('El descuento va del 5% al 90%.', 'error'); return }
    if (cupones.some(c => c.codigo === codigo)) { toast(`Ya tenés un cupón ${codigo}.`, 'error'); return }
    if (form.vence_el && form.vence_el < hoyAR()) { toast('Elegí una fecha desde hoy.', 'error'); return }
    const usosMax = form.usos_max === '' ? null : Math.round(Number(form.usos_max))
    if (usosMax !== null && !(usosMax > 0)) { toast('Los usos tienen que ser 1 o más (o dejalo vacío: sin límite).', 'error'); return }
    if (form.para === 'elegir' && !form.cursos.length && !form.servicios.length) { toast('Elegí al menos un curso o servicio, o tocá «Todo».', 'error'); return }
    if (!(await hacerLugar(codigo))) return
    setGuardando(true)
    try {
      const fila = {
        codigo, porcentaje: pct,
        cursos: form.para === 'elegir' && !basico ? form.cursos : [],
        servicios: form.para === 'elegir' ? form.servicios : [],
        vence_el: form.vence_el || null, usos_max: usosMax,
        una_por_persona: form.una_por_persona, meses: form.meses, activo: true,
      }
      const { data, error } = await createClient().from('cupones').insert(fila).select().single()
      if (error || !data) { toast(mensajeError(error, codigo), 'error'); await cargar(); return }
      if (codigo !== form.codigo.trim()) toast(`Cupón creado: quedó como ${codigo}`, 'success')
      else toast('Cupón creado', 'success')
      setForm({ ...vacio }); setAbierto(false)
      await cargar()
    } finally { setGuardando(false) }
  }

  async function prender(c: Cupon, valor: boolean) {
    if (valor && !(await hacerLugar(c.codigo))) return
    const { error } = await createClient().from('cupones').update({ activo: valor }).eq('id', c.id)
    if (error) { toast(mensajeError(error, c.codigo), 'error'); return }
    toast(valor ? `${c.codigo} prendido` : `${c.codigo} apagado: nadie lo puede aplicar desde ahora`, 'success')
    await cargar()
  }

  async function archivar(c: Cupon) {
    const n = numeros(c)
    if (!confirm(n.usados || n.enPago
      ? `¿Borrar ${c.codigo}? Sale de la lista, pero la historia y Finanzas quedan intactas.${n.enPago ? ` Las ${n.enPago} compra(s) en pago se respetan con su descuento.` : ''}`
      : `¿Borrar ${c.codigo}?`)) return
    const { error } = await createClient().from('cupones').update({ archivado: true }).eq('id', c.id)
    if (error) { toast(mensajeError(error, c.codigo), 'error'); return }
    toast('Cupón borrado', 'success')
    await cargar()
  }

  async function guardarEdicion(c: Cupon) {
    const usosMax = edicion.usos_max === '' ? null : Math.round(Number(edicion.usos_max))
    const n = numeros(c)
    if (edicion.vence_el && edicion.vence_el < hoyAR()) { toast('Elegí una fecha desde hoy.', 'error'); return }
    if (usosMax !== null && usosMax < Math.max(1, n.usados)) { toast(`Ya se usó ${n.usados} ${n.usados === 1 ? 'vez' : 'veces'}. Poné ${Math.max(1, n.usados)} o más.`, 'error'); return }
    const { error } = await createClient().from('cupones').update({ vence_el: edicion.vence_el || null, usos_max: usosMax }).eq('id', c.id)
    if (error) { toast(mensajeError(error, c.codigo), 'error'); return }
    toast('Cambios guardados', 'success'); setEditando(null)
    await cargar()
  }

  const chip = (activo: boolean) => ({ padding: '7px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', border: activo ? '0.5px solid var(--accent)' : '0.5px solid var(--border)', background: activo ? 'var(--accent)' : 'var(--bg-input)', color: activo ? 'white' : 'var(--text-secondary)' } as const)
  const hayMensuales = cursos.some(c => c.mensual)

  return (
    <div id="cupones" style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-light)', borderRadius: '18px', padding: '18px', margin: '0 0 20px' }}>
      <style>{`
        .cup-campo{display:flex;flex-direction:column;gap:4px}
        .cup-campo label{font-size:11px;font-weight:700;color:var(--text-muted)}
        .cup-campo input{padding:10px 12px;border-radius:10px;border:0.5px solid var(--border);font-size:13px;font-family:inherit;color:var(--text-primary);background:var(--bg-input);outline:none;width:100%;min-width:0}
        .cup-card{border:0.5px solid var(--border);border-radius:14px;padding:14px;margin-top:10px;background:var(--bg-input)}
        .cup-acc{display:inline-flex;align-items:center;gap:5px;padding:7px 10px;border-radius:9px;border:0.5px solid var(--border);background:var(--bg-card);color:var(--text-secondary);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit}
        .cup-lista{max-height:150px;overflow:auto;border:0.5px solid var(--border);border-radius:10px;padding:6px 10px;background:var(--bg-input)}
        .cup-lista label{display:flex;gap:8px;align-items:center;font-size:12.5px;color:var(--text-primary);padding:5px 0;cursor:pointer}
        .cup-dos{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}><Tag size={16}/> Cupones</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px', lineHeight: 1.5 }}>
            {basico ? 'Con Básico tenés 1 cupón activo para tus sesiones. Con Premium, todos los que quieras y también para cursos y descargables.' : 'Descuentos en % para cursos, descargables y sesiones. Se usan con el código o con un link que ya lo trae puesto.'}
          </div>
        </div>
        {!abierto && nivel !== 'sin_acceso' && (
          <button onClick={() => setAbierto(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '11px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            <Plus size={14}/> Crear cupón
          </button>
        )}
      </div>

      {abierto && (
        <div className="luma-desplegable cup-card" style={{ borderColor: 'var(--accent)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <b style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Nuevo cupón</b>
            <button onClick={() => { setAbierto(false); setForm({ ...vacio }) }} aria-label="Cerrar" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={17}/></button>
          </div>
          <div className="cup-dos">
            <div className="cup-campo"><label htmlFor="cup-codigo">Código</label>
              <input id="cup-codigo" value={form.codigo} placeholder="LUNA20" maxLength={24} style={{ letterSpacing: '1px', fontWeight: 700 }}
                onChange={e => setForm({ ...form, codigo: e.target.value })}/>
              {form.codigo && normalizar(form.codigo) !== form.codigo && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Queda como <b>{normalizar(form.codigo) || '—'}</b></span>}
            </div>
            <div className="cup-campo"><label htmlFor="cup-pct">Descuento (%)</label>
              <input id="cup-pct" inputMode="numeric" value={form.porcentaje} placeholder="20"
                onChange={e => setForm({ ...form, porcentaje: e.target.value.replace(/[^\d]/g, '').slice(0, 2) })}/>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Del 5% al 90%</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>¿Para qué sirve?</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button type="button" style={chip(form.para === 'todo')} onClick={() => setForm({ ...form, para: 'todo' })}>{basico ? 'Todas mis sesiones' : 'Todo'}</button>
              <button type="button" style={chip(form.para === 'elegir')} onClick={() => setForm({ ...form, para: 'elegir' })}>Elegir {basico ? 'servicios' : 'cursos o servicios'}</button>
            </div>
            {form.para === 'elegir' && (
              <div className="luma-desplegable luma-desplegable-izq cup-lista" style={{ marginTop: '8px' }}>
                {!basico && cursos.map(c => (
                  <label key={c.id}><input type="checkbox" checked={form.cursos.includes(c.id)}
                    onChange={e => setForm({ ...form, cursos: e.target.checked ? [...form.cursos, c.id] : form.cursos.filter(x => x !== c.id) })}/>{c.nombre}</label>
                ))}
                {servicios.map(sv => (
                  <label key={sv.id}><input type="checkbox" checked={form.servicios.includes(sv.id)}
                    onChange={e => setForm({ ...form, servicios: e.target.checked ? [...form.servicios, sv.id] : form.servicios.filter(x => x !== sv.id) })}/>{sv.nombre}</label>
                ))}
                {(!basico ? cursos.length : 0) + servicios.length === 0 && <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '4px 0' }}>Todavía no tenés {basico ? 'servicios activos' : 'cursos ni servicios activos'}.</div>}
              </div>
            )}
          </div>
          <div className="cup-dos">
            <div className="cup-campo"><label htmlFor="cup-vence">Vence (opcional)</label>
              <input id="cup-vence" type="date" min={hoyAR()} value={form.vence_el} onChange={e => setForm({ ...form, vence_el: e.target.value })}/>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sirve hasta las 23:59 de ese día</span>
            </div>
            <div className="cup-campo"><label htmlFor="cup-usos">Usos (opcional)</label>
              <input id="cup-usos" inputMode="numeric" value={form.usos_max} placeholder="Sin límite" onChange={e => setForm({ ...form, usos_max: e.target.value.replace(/[^\d]/g, '').slice(0, 5) })}/>
            </div>
          </div>
          {!basico && hayMensuales && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>En cursos mensuales</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button type="button" style={chip(form.meses === 'primero')} onClick={() => setForm({ ...form, meses: 'primero' })}>Solo el primer mes</button>
                <button type="button" style={chip(form.meses === 'todos')} onClick={() => setForm({ ...form, meses: 'todos' })}>Todos los meses</button>
              </div>
            </div>
          )}
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>
            <span>Una vez por persona</span>
            <input type="checkbox" checked={form.una_por_persona} onChange={e => setForm({ ...form, una_por_persona: e.target.checked })} style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}/>
          </label>
          <button onClick={crear} disabled={guardando}
            style={{ padding: '12px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {guardando ? 'Creando…' : 'Crear cupón'}
          </button>
        </div>
      )}

      {cargando ? <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>Cargando cupones…</div>
        : cupones.length === 0 && !abierto ? <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '12px' }}>Todavía no tenés cupones.</div>
        : cupones.map(c => {
          const n = numeros(c), e = estado(c)
          return (
            <div key={c.id} className="cup-card" style={{ opacity: c.activo ? 1 : 0.75 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '1px', color: 'var(--text-primary)' }}>{c.codigo}</span>
                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--pink)' }}>−{c.porcentaje}%</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{paraQue(c)}{c.vence_el ? ` · vence el ${fechaCorta(c.vence_el)}` : ''}{cursos.some(x => x.mensual) && !basico ? ` · ${c.meses === 'todos' ? 'todos los meses' : 'solo el primer mes'}` : ''}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Usado {n.usados}{c.usos_max ? ` de ${c.usos_max}` : ''}{n.enPago ? ` · ${n.enPago} en pago` : ''}{n.vendio ? ` · vendió ${plata(n.vendio)} · descontó ${plata(n.desconto)}` : ''}{c.una_por_persona ? ' · una vez por persona' : ''}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', color: e.color, marginTop: '6px', textTransform: 'uppercase' }}>{e.texto}</div>
              {editando === c.id ? (
                <div className="luma-desplegable luma-desplegable-izq" style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="cup-dos">
                    <div className="cup-campo"><label>Vence</label><input type="date" min={hoyAR()} value={edicion.vence_el} onChange={ev => setEdicion({ ...edicion, vence_el: ev.target.value })}/></div>
                    <div className="cup-campo"><label>Usos</label><input inputMode="numeric" placeholder="Sin límite" value={edicion.usos_max} onChange={ev => setEdicion({ ...edicion, usos_max: ev.target.value.replace(/[^\d]/g, '') })}/></div>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>El código y el % no se cambian {n.usados || n.enPago ? 'porque ya se usó' : 'para cuidar la historia'}: si querés otro, creá uno nuevo.</div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="cup-acc" onClick={() => guardarEdicion(c)} style={{ background: 'var(--accent)', color: 'white', borderColor: 'var(--accent)' }}>Guardar</button>
                    <button className="cup-acc" onClick={() => setEditando(null)}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                  <button className="cup-acc" onClick={() => copiar(link(c), 'Link copiado: el descuento ya viene puesto')} disabled={!slug}><Link2 size={13}/> Copiar link</button>
                  <button className="cup-acc" onClick={() => copiar(c.codigo, 'Código copiado')}><Copy size={13}/> Copiar código</button>
                  {basico && c.id !== elQueFunciona && elQueFunciona
                    ? <button className="cup-acc" onClick={() => prender(c, true)}>Usar este en lugar de {cupones.find(x => x.id === elQueFunciona)?.codigo}</button>
                    : <button className="cup-acc" onClick={() => prender(c, !c.activo)}>{c.activo ? 'Apagar' : 'Prender'}</button>}
                  <button className="cup-acc" onClick={() => { setEditando(c.id); setEdicion({ vence_el: c.vence_el || '', usos_max: c.usos_max ?? '' }) }}><Pencil size={13}/> Editar</button>
                  <button className="cup-acc" onClick={() => archivar(c)} style={{ color: '#B91C1C' }}><Archive size={13}/> Borrar</button>
                </div>
              )}
            </div>
          )
        })}
    </div>
  )
}
