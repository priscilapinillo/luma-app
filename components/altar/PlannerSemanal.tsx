'use client'
// Contenido del Altar: UNA lista de piezas con dos vistas. «Por semana» (el planner, con el banco de ideas sin fecha abajo)
// y «Por etapa» (Idea → Guion → Grabado → Listo → Publicado). Una pieza es la misma en las dos: lo que se crea o se cambia en una se ve en la otra.
// Compu: se arrastra entre días. Celu: un día por pantalla; se mantiene apretada la tarjeta y se suelta en un día de arriba
// o en el banco. Si no, sigue estando la forma manual: tocar la tarjeta y elegir el día en la ficha.
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { PlanAltar } from './PlanAltar'
import { useArrastreTactil } from './useArrastreTactil'
import { ChevronLeft, ChevronRight, Plus, Trash2, Inbox, Eye, EyeOff, Check, Clock, Pencil, FileText, CalendarDays, LayoutGrid } from 'lucide-react'
import Pista from './Pista'
import { toast } from '@/components/ToastProvider'
import { FORMATOS, ESTADOS, COLOR_VENCIDA, nuevoId, fechaLocal, lunesDe, sumarDias, vencida, type DatosPlanner, type ItemPlanner, type Formato, type EstadoPieza } from '@/lib/altar'

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const deFecha = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }

export default function PlannerSemanal({ datos, cambiar, soloLectura, limitePiezas, onLimite }: {
  datos: DatosPlanner; cambiar: (d: DatosPlanner, grupo?: string) => void; soloLectura: boolean; limitePiezas: number; onLimite: () => void
}) {
  const items = Array.isArray(datos.items) ? datos.items : []
  const router = useRouter()
  const { nivel } = useContext(PlanAltar)
  const [vista, setVistaEstado] = useState<'semana' | 'etapa'>('semana')
  useEffect(() => { try { if (localStorage.getItem('luma-contenido-vista') === 'etapa') setVistaEstado('etapa') } catch {} }, [])
  const setVista = (v: 'semana' | 'etapa') => { setVistaEstado(v); setAbierta(null); setNuevoEn(null); try { localStorage.setItem('luma-contenido-vista', v) } catch {} }
  const hoy = fechaLocal()
  const [lunes, setLunes] = useState(() => lunesDe(new Date()))
  const [abierta, setAbierta] = useState<string | null>(null)
  const [nuevoEn, setNuevoEn] = useState<string | null>(null) // fecha, o 'banco'
  const [textoNuevo, setTextoNuevo] = useState('')
  const [arrastrando, setArrastrando] = useState<string | null>(null)
  const [sobre, setSobre] = useState<string | null>(null)
  const [celu, setCelu] = useState(false)
  const [diaCelu, setDiaCelu] = useState(() => (new Date().getDay() + 6) % 7)
  useEffect(() => { const m = () => setCelu(window.innerWidth < 768); m(); window.addEventListener('resize', m); return () => window.removeEventListener('resize', m) }, [])

  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => fechaLocal(sumarDias(lunes, i))), [lunes])
  const ocultar = !!datos.ocultarPublicadas
  const visible = (i: ItemPlanner) => !(ocultar && i.estado === 'publicado')
  const vencidas = items.filter(i => vencida(i, hoy))
  const banco = items.filter(i => !i.fecha && visible(i))

  const set = (nuevos: ItemPlanner[], grupo?: string) => cambiar({ ...datos, items: nuevos }, grupo)
  const editar = (id: string, c: Partial<ItemPlanner>, grupo?: string) => set(items.map(i => i.id === id ? { ...i, ...c } : i), grupo)

  function agregar(fecha: string | null, estado: EstadoPieza = 'idea') {
    const t = textoNuevo.trim()
    if (!t) { setNuevoEn(null); return }
    if (items.length >= limitePiezas) { onLimite(); return }
    set([...items, { id: nuevoId(), titulo: t.slice(0, 140), fecha, formato: 'reel', estado }])
    setTextoNuevo('')
    toast(vista === 'etapa' ? 'Pieza guardada.' : fecha ? 'Agregada al día.' : 'Guardada en el banco.')
  }
  function moverA(id: string, fecha: string | null) {
    if (soloLectura) return
    const it = items.find(i => i.id === id)
    if (it && it.fecha !== fecha) { editar(id, { fecha }); toast(fecha ? `Movida al ${DIAS[(deFecha(fecha).getDay() + 6) % 7].toLowerCase()} ${deFecha(fecha).getDate()}.` : 'Volvió al banco.') }
  }
  function moverEstado(id: string, estado: EstadoPieza) {
    if (soloLectura) return
    const it = items.find(i => i.id === id)
    if (it && it.estado !== estado) { editar(id, { estado }); toast(estado === 'publicado' ? 'Publicada. Bien ahí.' : `Pasó a ${ESTADOS.find(x => x.id === estado)?.nombre}.`) }
  }
  const [creandoDoc, setCreandoDoc] = useState(false)
  // el guion completo vive en un Documento (solo Premium) vinculado a la pieza
  async function abrirDoc(i: ItemPlanner) {
    if (creandoDoc) return
    const s = createClient()
    if (i.doc) {
      const { data } = await s.from('documentos').select('id, borrada_en').eq('id', i.doc).maybeSingle()
      if (data && !data.borrada_en) { router.push(`/altar/documento/${i.doc}`); return }
      toast(data ? 'Ese Documento está en la papelera. Recuperalo desde el Altar o creá otro.' : 'Ese Documento ya no está. Podés crear otro.', 'info')
      editar(i.id, { doc: undefined })
      return
    }
    if (soloLectura) return
    if (nivel !== 'premium') { toast('El Documento es de Premium. Acá podés escribir el guion corto.', 'info'); return }
    setCreandoDoc(true)
    const nombre = (i.titulo || 'Guion').slice(0, 80)
    const { data, error } = await s.from('documentos').insert({ nombre, datos: { html: i.nota ? `<p>${i.nota.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!)).split(/\r?\n/).join('</p><p>')}</p>` : '<p><br></p>' } }).select('id').single()
    setCreandoDoc(false)
    if (error || !data) { toast('No se pudo crear el Documento. Probá de nuevo.', 'error'); return }
    editar(i.id, { doc: data.id })
    toast('Documento creado y vinculado a la pieza.')
    setTimeout(() => router.push(`/altar/documento/${data.id}`), 150)
  }
  function soltar(fecha: string | null) {
    if (arrastrando) moverA(arrastrando, fecha)
    setArrastrando(null); setSobre(null)
  }
  const contenedor = useRef<HTMLDivElement | null>(null)
  const tactil = useArrastreTactil((id, destino) => { if (destino.startsWith('etapa:')) moverEstado(id, destino.slice(6) as EstadoPieza); else moverA(id, destino === 'banco' ? null : destino) }, contenedor)
  const sobreAhora = sobre || tactil.sobre
  function pasarVencidas() {
    if (!vencidas.length) return
    set(items.map(i => vencida(i, hoy) ? { ...i, fecha: null } : i))
    toast(vencidas.length === 1 ? 'Pasaste 1 pieza al banco.' : `Pasaste ${vencidas.length} piezas al banco.`)
  }
  const etiquetaSemana = `${deFecha(dias[0]).getDate()} ${MESES[deFecha(dias[0]).getMonth()]} – ${deFecha(dias[6]).getDate()} ${MESES[deFecha(dias[6]).getMonth()]}`

  const tarjeta = (i: ItemPlanner) => {
    const f = FORMATOS.find(x => x.id === i.formato) || FORMATOS[3]
    const e = ESTADOS.find(x => x.id === i.estado) || ESTADOS[0]
    const venc = vencida(i, hoy)
    const abierto = abierta === i.id
    return (
      <div key={i.id} draggable={!soloLectura && !abierto && !celu} onDragStart={ev => { setArrastrando(i.id); ev.dataTransfer.effectAllowed = 'move'; try { ev.dataTransfer.setData('text/plain', i.id) } catch {} }} onDragEnd={() => { setArrastrando(null); setSobre(null) }}
        {...tactil.props(i.id, i.titulo, !soloLectura && !abierto)}
        style={{ WebkitTouchCallout: 'none', WebkitUserSelect: abierto ? undefined : 'none', userSelect: abierto ? undefined : 'none', background: 'var(--al-tarjeta)', border: `1.5px solid ${venc ? COLOR_VENCIDA : 'var(--al-borde)'}`, borderRadius: 14, boxShadow: '0 4px 12px rgba(39,52,74,.07)', opacity: arrastrando === i.id ? .45 : i.estado === 'publicado' ? .7 : 1, cursor: soloLectura ? 'default' : 'grab' }}>
        <button onClick={() => { if (tactil.recienSolto()) return; setAbierta(abierto ? null : i.id) }} aria-expanded={abierto} style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'none', padding: '9px 10px', font: 'inherit', color: 'inherit', cursor: 'pointer' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 5, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10.5, fontWeight: 900, padding: '2px 8px', borderRadius: 20, background: f.fondo, color: f.texto }}>{f.nombre}</span>
            {vista === 'etapa' && <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--al-texto2)' }}>{i.fecha ? `${DIAS[(deFecha(i.fecha).getDay() + 6) % 7]} ${deFecha(i.fecha).getDate()} ${MESES[deFecha(i.fecha).getMonth()]}` : 'Sin fecha'}</span>}
            {i.hora && <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--al-texto2)', display: 'flex', gap: 3, alignItems: 'center' }}><Clock size={11}/>{i.hora}</span>}
            {i.doc && <FileText size={12} style={{ color: 'var(--al-texto2)' }} aria-label="Tiene Documento"/>}
            {venc && <span style={{ fontSize: 10.5, fontWeight: 900, color: COLOR_VENCIDA }}>Se pasó la fecha</span>}
            <span style={{ flex: 1 }}/>
            {!abierto && <Pencil size={12} style={{ opacity: .45 }} aria-hidden="true"/>}
          </div>
          <div style={{ fontWeight: 800, fontSize: 13.5, lineHeight: 1.3, textDecoration: i.estado === 'publicado' ? 'line-through' : undefined, wordBreak: 'break-word' }}>{i.titulo || 'Sin título'}</div>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginTop: 6, fontSize: 11.5, fontWeight: 800, color: 'var(--al-texto2)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: e.color }}/>{e.nombre}
          </div>
        </button>
        {abierto && (
          <div className="luma-desplegable luma-desplegable-izq" style={{ borderTop: '1px solid var(--al-borde)', padding: 10, display: 'flex', flexDirection: 'column', gap: 9 }}>
            <input value={i.titulo} disabled={soloLectura} maxLength={140} onChange={ev => editar(i.id, { titulo: ev.target.value }, 'pt:' + i.id)} aria-label="Título"
              style={{ padding: '9px 10px', borderRadius: 10, border: '1px solid var(--al-borde)', background: 'var(--al-bg)', color: 'var(--al-texto)', font: '700 14px Nunito,sans-serif' }}/>
            <div style={{ display: 'flex', gap: 6 }}>
              <select value={i.fecha || ''} disabled={soloLectura} aria-label="Día" onChange={ev => { editar(i.id, { fecha: ev.target.value || null }); toast(ev.target.value ? 'Cambiaste el día.' : 'Volvió al banco.') }} style={estiloSelect}>
                <option value="">Banco (sin fecha)</option>
                {i.fecha && !dias.includes(i.fecha) && <option value={i.fecha}>{deFecha(i.fecha).getDate()} {MESES[deFecha(i.fecha).getMonth()]}</option>}
                {dias.map((d, n) => <option key={d} value={d}>{DIAS[n]} {deFecha(d).getDate()}{d === hoy ? ' (hoy)' : ''}</option>)}
              </select>
              <input type="time" value={i.hora || ''} disabled={soloLectura} aria-label="Hora" onChange={ev => editar(i.id, { hora: ev.target.value || undefined })} style={{ ...estiloSelect, maxWidth: 110 }}/>
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {FORMATOS.map(x => <Chip key={x.id} on={i.formato === x.id} disabled={soloLectura} onClick={() => editar(i.id, { formato: x.id as Formato })} fondo={x.fondo} texto={x.texto}>{x.nombre}</Chip>)}
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {ESTADOS.map(x => <Chip key={x.id} on={i.estado === x.id} disabled={soloLectura} onClick={() => { editar(i.id, { estado: x.id as EstadoPieza }); if (x.id === 'publicado') toast('Publicada. Bien ahí.') }} punto={x.color}>{x.nombre}</Chip>)}
            </div>
            <textarea value={i.nota || ''} disabled={soloLectura} maxLength={1200} rows={3} placeholder="Guion corto, gancho, lo que se te ocurra…" aria-label="Guion corto" onChange={ev => editar(i.id, { nota: ev.target.value }, 'pn:' + i.id)}
              style={{ padding: '9px 10px', borderRadius: 10, border: '1px solid var(--al-borde)', background: 'var(--al-bg)', color: 'var(--al-texto)', font: '600 13px Nunito,sans-serif', resize: 'vertical' }}/>
            {(i.doc || !soloLectura) && <button onClick={() => abrirDoc(i)} disabled={creandoDoc} style={{ ...botonChico, justifyContent: 'center', width: '100%' }}><FileText size={14}/> {i.doc ? 'Abrir el Documento (guion completo)' : 'Escribir el guion completo'}</button>}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {!soloLectura ? <button onClick={() => { set(items.filter(x => x.id !== i.id)); setAbierta(null); toast('Borrada. Si fue sin querer, tocá deshacer.', 'info') }} style={{ ...botonChico, color: COLOR_VENCIDA }}><Trash2 size={14}/> Borrar</button> : <span/>}
              <button onClick={() => setAbierta(null)} style={{ ...botonChico, background: 'var(--al-acento)', color: 'var(--al-sobre-acento)' }}><Check size={14}/> Listo</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const agregarEn = (en: string) => soloLectura ? null : nuevoEn === en ? (
    <input autoFocus value={textoNuevo} maxLength={140} placeholder="¿Qué vas a publicar?" onChange={e => setTextoNuevo(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') agregar(en === 'banco' ? null : en); if (e.key === 'Escape') { setNuevoEn(null); setTextoNuevo('') } }}
      onBlur={() => { if (textoNuevo.trim()) agregar(en === 'banco' ? null : en); setNuevoEn(null) }}
      style={{ width: '100%', boxSizing: 'border-box', padding: '9px 10px', borderRadius: 12, border: '1.5px solid var(--al-acento)', background: 'var(--al-tarjeta)', color: 'var(--al-texto)', font: '700 13.5px Nunito,sans-serif' }}/>
  ) : (
    <button onClick={() => { setNuevoEn(en); setTextoNuevo('') }} style={{ ...botonChico, width: '100%', justifyContent: 'center', border: '1.5px dashed var(--al-borde)', color: 'var(--al-texto2)' }}><Plus size={14}/> Agregar</button>
  )

  const columna = (d: string, n: number) => {
    const deEse = items.filter(i => i.fecha === d && visible(i)).sort((a, b) => (a.hora || '99').localeCompare(b.hora || '99'))
    const esHoy = d === hoy
    return (
      <div key={d} data-soltar={d} onDragOver={e => { if (arrastrando) { e.preventDefault(); setSobre(d) } }} onDragLeave={() => setSobre(s => s === d ? null : s)} onDrop={e => { e.preventDefault(); soltar(d) }}
        style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8, padding: 8, borderRadius: 18, background: sobreAhora === d ? 'var(--al-suave)' : esHoy ? 'rgba(98,107,145,.08)' : 'transparent', border: esHoy ? '1.5px solid var(--al-acento)' : '1.5px solid transparent', transition: 'background .15s' }}>
        <div style={{ textAlign: 'center', padding: '2px 0 4px' }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.12em', color: esHoy ? 'var(--al-acento)' : 'var(--al-texto2)' }}>{esHoy ? 'HOY' : DIAS[n].toUpperCase()}</div>
          <div className="al-f" style={{ fontSize: 24, lineHeight: 1.1 }}>{deFecha(d).getDate()}</div>
        </div>
        {deEse.map(tarjeta)}
        {agregarEn(d)}
      </div>
    )
  }

  return (
    <div ref={contenedor} style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '14px 14px 130px' }}>
      {tactil.fantasma}
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <Pista clave="contenido1">{celu ? 'Es una sola lista con dos vistas. Mantené apretada una tarjeta y arrastrala: a un día para ponerle fecha, o a otra columna (Por etapa) para avanzarla. También podés tocarla y cambiar todo ahí.' : 'Es una sola lista con dos vistas: lo que creás o cambiás en una se ve en la otra. Arrastrá las tarjetas a un día para ponerles fecha, o a otra columna (Por etapa) para avanzarlas. Tocá una para escribir el guion.'}</Pista>
        <div role="tablist" aria-label="Cómo ver tu contenido" style={{ display: 'inline-flex', background: 'var(--al-suave)', borderRadius: 16, padding: 4, gap: 2, marginBottom: 12 }}>
          {([['semana', 'Por semana', CalendarDays], ['etapa', 'Por etapa', LayoutGrid]] as const).map(([v, t, Ico]) => (
            <button key={v} role="tab" aria-selected={vista === v} onClick={() => setVista(v)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 38, padding: '0 16px', borderRadius: 12, border: 'none', background: vista === v ? 'var(--al-acento)' : 'transparent', color: vista === v ? 'var(--al-sobre-acento)' : 'var(--al-texto)', font: '800 13.5px Nunito,sans-serif', cursor: 'pointer' }}><Ico size={15}/> {t}</button>
          ))}
        </div>
        {vista === 'etapa' ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
              <button onClick={() => cambiar({ ...datos, ocultarPublicadas: !ocultar })} disabled={soloLectura} style={botonChico}>{ocultar ? <Eye size={14}/> : <EyeOff size={14}/>} {ocultar ? 'Mostrar publicadas' : 'Ocultar publicadas'}</button>
            </div>
            <div className="al-etapas">
              {ESTADOS.map(c => {
                const deEsa = items.filter(i => i.estado === c.id && visible(i))
                const clave = 'etapa:' + c.id
                return (
                  <div key={c.id} data-soltar={clave} onDragOver={e => { if (arrastrando) { e.preventDefault(); setSobre(clave) } }} onDragLeave={() => setSobre(s => s === clave ? null : s)} onDrop={e => { e.preventDefault(); if (arrastrando) moverEstado(arrastrando, c.id as EstadoPieza); setArrastrando(null); setSobre(null) }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10, borderRadius: 20, background: sobreAhora === clave ? 'var(--al-suave)' : 'rgba(169,155,184,.12)', minHeight: 140, transition: 'background .15s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 4px 4px' }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: c.color }}/>
                      <span className="al-f" style={{ fontSize: 19 }}>{c.nombre}</span>
                      <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--al-texto2)' }}>{deEsa.length}</span>
                    </div>
                    {deEsa.map(tarjeta)}
                    {!soloLectura && (nuevoEn === clave
                      ? <input autoFocus value={textoNuevo} maxLength={140} placeholder="¿Qué vas a publicar?" onChange={e => setTextoNuevo(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') agregar(null, c.id as EstadoPieza); if (e.key === 'Escape') { setNuevoEn(null); setTextoNuevo('') } }}
                          onBlur={() => { if (textoNuevo.trim()) agregar(null, c.id as EstadoPieza); setNuevoEn(null) }}
                          style={{ width: '100%', boxSizing: 'border-box', padding: '9px 10px', borderRadius: 12, border: '1.5px solid var(--al-acento)', background: 'var(--al-tarjeta)', color: 'var(--al-texto)', font: '700 13.5px Nunito,sans-serif' }}/>
                      : <button onClick={() => { setNuevoEn(clave); setTextoNuevo('') }} style={{ ...botonChico, width: '100%', justifyContent: 'center', border: '1.5px dashed var(--al-borde)', color: 'var(--al-texto2)' }}><Plus size={14}/> Agregar</button>)}
                  </div>
                )
              })}
            </div>
            <style>{`.al-etapas{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;align-items:start}@media(max-width:1000px){.al-etapas{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:640px){.al-etapas{grid-template-columns:1fr}}`}</style>
          </>
        ) : (<>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <button aria-label="Semana anterior" onClick={() => setLunes(l => sumarDias(l, -7))} style={botonRedondo}><ChevronLeft size={18}/></button>
          <div className="al-f" style={{ fontSize: 19, minWidth: 150, textAlign: 'center' }}>{etiquetaSemana}</div>
          <button aria-label="Semana siguiente" onClick={() => setLunes(l => sumarDias(l, 7))} style={botonRedondo}><ChevronRight size={18}/></button>
          {!dias.includes(hoy) && <button onClick={() => { setLunes(lunesDe(new Date())); setDiaCelu((new Date().getDay() + 6) % 7) }} style={botonChico}>Volver a hoy</button>}
          <span style={{ flex: 1 }}/>
          {!soloLectura && vencidas.length > 0 && <button onClick={pasarVencidas} style={{ ...botonChico, color: COLOR_VENCIDA }}><Inbox size={14}/> Pasar lo vencido al banco ({vencidas.length})</button>}
          <button onClick={() => cambiar({ ...datos, ocultarPublicadas: !ocultar })} disabled={soloLectura} style={botonChico}>{ocultar ? <Eye size={14}/> : <EyeOff size={14}/>} {ocultar ? 'Mostrar publicadas' : 'Ocultar publicadas'}</button>
        </div>

        {celu ? (
          <>
            {/* los días quedan siempre arriba, para poder soltar una tarjeta aunque venga desde el banco */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 10, overflowX: 'auto', position: 'sticky', top: -14, zIndex: 5, background: 'var(--al-bg)', padding: '8px 2px 6px', margin: '0 -2px 10px' }}>
              {dias.map((d, n) => {
                const cant = items.filter(i => i.fecha === d && visible(i)).length
                return (
                  <button key={d} data-soltar={d} onClick={() => setDiaCelu(n)} aria-label={`${DIAS[n]} ${deFecha(d).getDate()}`}
                    style={{ flex: 1, minWidth: 42, padding: '6px 0', borderRadius: 12, outline: tactil.sobre === d ? '3px dashed var(--al-acento)' : undefined, outlineOffset: 2, scale: tactil.sobre === d ? '1.08' : undefined, border: d === hoy ? '1.5px solid var(--al-acento)' : '1px solid var(--al-borde)', background: diaCelu === n ? 'var(--al-acento)' : 'var(--al-tarjeta)', color: diaCelu === n ? 'var(--al-sobre-acento)' : 'var(--al-texto)', font: '800 11px Nunito,sans-serif', cursor: 'pointer' }}>
                    {d === hoy ? 'HOY' : DIAS[n]}<div style={{ fontSize: 15 }}>{deFecha(d).getDate()}</div>
                    <div style={{ height: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>{Array.from({ length: Math.min(cant, 4) }, (_, k) => <span key={k} style={{ width: 4, height: 4, borderRadius: 2, background: diaCelu === n ? 'var(--al-sobre-acento)' : 'var(--al-acento)' }}/>)}</div>
                  </button>
                )
              })}
            </div>
            {columna(dias[diaCelu], diaCelu)}
          </>
        ) : (
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>{dias.map((d, n) => columna(d, n))}</div>
        )}

        <div data-soltar="banco" onDragOver={e => { if (arrastrando) { e.preventDefault(); setSobre('banco') } }} onDragLeave={() => setSobre(s => s === 'banco' ? null : s)} onDrop={e => { e.preventDefault(); soltar(null) }}
          style={{ marginTop: 22, padding: 14, borderRadius: 20, background: sobreAhora === 'banco' ? 'var(--al-suave)' : 'rgba(169,155,184,.14)', border: '1.5px dashed rgba(98,107,145,.3)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
            <span className="al-f" style={{ fontSize: 21 }}>Banco de ideas</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--al-texto2)' }}>Sin fecha todavía{celu ? ' · mantené una apretada y arrastrala a un día' : ' · arrastralas a un día'}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 8 }}>
            {banco.map(tarjeta)}
            <div>{agregarEn('banco')}</div>
          </div>
        </div>
        </>)}
      </div>
    </div>
  )
}

const estiloSelect: React.CSSProperties = { flex: 1, minWidth: 0, padding: '8px', borderRadius: 10, border: '1px solid var(--al-borde)', background: 'var(--al-bg)', color: 'var(--al-texto)', font: '700 13px Nunito,sans-serif' }
const botonChico: React.CSSProperties = { display: 'inline-flex', gap: 5, alignItems: 'center', padding: '7px 11px', borderRadius: 12, border: '1px solid var(--al-borde)', background: 'var(--al-tarjeta)', color: 'var(--al-texto)', font: '800 12.5px Nunito,sans-serif', cursor: 'pointer' }
const botonRedondo: React.CSSProperties = { width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--al-borde)', background: 'var(--al-tarjeta)', color: 'var(--al-texto)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }

function Chip({ on, onClick, children, fondo, texto, punto, disabled }: { on: boolean; onClick: () => void; children: React.ReactNode; fondo?: string; texto?: string; punto?: string; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-pressed={on}
      style={{ display: 'inline-flex', gap: 5, alignItems: 'center', padding: '5px 10px', borderRadius: 20, border: on ? '1.5px solid var(--al-acento)' : '1px solid var(--al-borde)', background: on ? (fondo || 'var(--al-suave)') : 'transparent', color: on ? (texto || 'var(--al-texto)') : 'var(--al-texto2)', font: '800 12px Nunito,sans-serif', cursor: disabled ? 'default' : 'pointer' }}>
      {punto && <span style={{ width: 8, height: 8, borderRadius: '50%', background: punto }}/>}{children}
    </button>
  )
}
