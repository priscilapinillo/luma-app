'use client'
// Banco de ideas del Altar: Idea → Guion → Grabado → Publicado.
// Compu: se arrastra entre columnas. Celu: columnas una debajo de la otra; se mantiene apretada una tarjeta y se suelta en otra
// columna (o en los botones de arriba). Si no, sigue estando «Pasar a…» en la ficha (se despliega ahí mismo).
import { useRef, useState } from 'react'
import { useArrastreTactil } from './useArrastreTactil'
import { Plus, Trash2, Check, ArrowRight, Pencil } from 'lucide-react'
import Pista from './Pista'
import { toast } from '@/components/ToastProvider'
import { FORMATOS, COLUMNAS_BANCO, nuevoId, type DatosBanco, type ItemBanco, type ColumnaBanco, type Formato } from '@/lib/altar'

const COLOR_COL: Record<ColumnaBanco, string> = { idea: '#A99BB8', guion: '#626B91', grabado: '#C9A55C', publicado: '#8FB39A' }

export default function BancoIdeas({ datos, cambiar, soloLectura, limitePiezas, onLimite }: {
  datos: DatosBanco; cambiar: (d: DatosBanco, grupo?: string) => void; soloLectura: boolean; limitePiezas: number; onLimite: () => void
}) {
  const items = Array.isArray(datos.items) ? datos.items : []
  const [abierta, setAbierta] = useState<string | null>(null)
  const [nuevoEn, setNuevoEn] = useState<ColumnaBanco | null>(null)
  const [texto, setTexto] = useState('')
  const [arrastrando, setArrastrando] = useState<string | null>(null)
  const [sobre, setSobre] = useState<ColumnaBanco | null>(null)

  const set = (n: ItemBanco[], g?: string) => cambiar({ ...datos, items: n }, g)
  const editar = (id: string, c: Partial<ItemBanco>, g?: string) => set(items.map(i => i.id === id ? { ...i, ...c } : i), g)
  const contenedor = useRef<HTMLDivElement | null>(null)
  const tactil = useArrastreTactil((id, destino) => mover(id, destino as ColumnaBanco), contenedor)
  const sobreAhora = sobre || tactil.sobre
  const nombreCol = (c: ColumnaBanco) => COLUMNAS_BANCO.find(x => x.id === c)?.nombre || c

  function mover(id: string, col: ColumnaBanco) {
    const it = items.find(i => i.id === id)
    if (!it || it.columna === col || soloLectura) return
    // va al final de la columna nueva
    set([...items.filter(i => i.id !== id), { ...it, columna: col }])
    toast(col === 'publicado' ? 'Publicada. Bien ahí.' : `Pasó a ${nombreCol(col)}.`)
  }
  function agregar(col: ColumnaBanco) {
    const t = texto.trim()
    if (!t) { setNuevoEn(null); return }
    if (items.length >= limitePiezas) { onLimite(); return }
    set([...items, { id: nuevoId(), titulo: t.slice(0, 140), columna: col, formato: 'reel' }])
    setTexto(''); toast('Idea guardada.')
  }

  const tarjeta = (i: ItemBanco) => {
    const f = FORMATOS.find(x => x.id === i.formato) || FORMATOS[3]
    const abierto = abierta === i.id
    const sig = COLUMNAS_BANCO[COLUMNAS_BANCO.findIndex(c => c.id === i.columna) + 1]
    return (
      <div key={i.id} draggable={!soloLectura && !abierto} onDragStart={e => { setArrastrando(i.id); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', i.id) } catch {} }} onDragEnd={() => { setArrastrando(null); setSobre(null) }}
        {...tactil.props(i.id, i.titulo, !soloLectura && !abierto)}
        style={{ WebkitTouchCallout: 'none', WebkitUserSelect: abierto ? undefined : 'none', userSelect: abierto ? undefined : 'none', background: 'var(--al-tarjeta)', border: '1px solid var(--al-borde)', borderRadius: 14, boxShadow: '0 4px 12px rgba(39,52,74,.07)', opacity: arrastrando === i.id ? .45 : 1, cursor: soloLectura ? 'default' : 'grab' }}>
        <button onClick={() => { if (tactil.recienSolto()) return; setAbierta(abierto ? null : i.id) }} aria-expanded={abierto} style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'none', padding: '10px 11px', font: 'inherit', color: 'inherit', cursor: 'pointer' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10.5, fontWeight: 900, padding: '2px 8px', borderRadius: 20, background: f.fondo, color: f.texto }}>{f.nombre}</span>
            <span style={{ flex: 1 }}/>
            {!abierto && <Pencil size={13} style={{ opacity: .45 }} aria-hidden="true"/>}
          </span>
          <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.3, marginTop: 6, wordBreak: 'break-word' }}>{i.titulo || 'Sin título'}</div>
          {i.nota && !abierto && <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--al-texto2)', marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{i.nota}</div>}
        </button>
        {abierto && (
          <div className="luma-desplegable luma-desplegable-izq" style={{ borderTop: '1px solid var(--al-borde)', padding: 10, display: 'flex', flexDirection: 'column', gap: 9 }}>
            <input value={i.titulo} disabled={soloLectura} maxLength={140} aria-label="Título" onChange={e => editar(i.id, { titulo: e.target.value }, 'bt:' + i.id)} style={campo}/>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {FORMATOS.map(x => (
                <button key={x.id} disabled={soloLectura} aria-pressed={i.formato === x.id} onClick={() => editar(i.id, { formato: x.id as Formato })}
                  style={{ padding: '5px 10px', borderRadius: 20, border: i.formato === x.id ? '1.5px solid var(--al-acento)' : '1px solid var(--al-borde)', background: i.formato === x.id ? x.fondo : 'transparent', color: i.formato === x.id ? x.texto : 'var(--al-texto2)', font: '800 12px Nunito,sans-serif', cursor: 'pointer' }}>{x.nombre}</button>
              ))}
            </div>
            <textarea value={i.nota || ''} disabled={soloLectura} rows={3} maxLength={1200} placeholder="Guion, gancho, lo que se te ocurra…" onChange={e => editar(i.id, { nota: e.target.value }, 'bn:' + i.id)} style={{ ...campo, font: '600 13px Nunito,sans-serif', resize: 'vertical' }}/>
            {!soloLectura && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {COLUMNAS_BANCO.filter(c => c.id !== i.columna).map(c => (
                  <button key={c.id} onClick={() => { mover(i.id, c.id); setAbierta(null) }} style={{ ...chico, borderColor: c.id === sig?.id ? 'var(--al-acento)' : 'var(--al-borde)' }}>
                    <ArrowRight size={13}/> {c.nombre}
                  </button>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {!soloLectura ? <button onClick={() => { set(items.filter(x => x.id !== i.id)); setAbierta(null); toast('Borrada. Si fue sin querer, tocá deshacer.', 'info') }} style={{ ...chico, color: '#A24B47' }}><Trash2 size={14}/> Borrar</button> : <span/>}
              <button onClick={() => setAbierta(null)} style={{ ...chico, background: 'var(--al-acento)', color: 'var(--al-sobre-acento)', borderColor: 'transparent' }}><Check size={14}/> Listo</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div ref={contenedor} style={{ position: 'absolute', inset: 0, overflow: 'auto', padding: '14px 14px 130px' }}>
      {tactil.fantasma}
      {/* compu: las 4 columnas siempre entran en la pantalla. Celu: una debajo de la otra (sin barra de costado) */}
      <style>{`.al-banco{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;max-width:1240px;margin:0 auto}
        @media(max-width:767px){.al-banco{grid-template-columns:1fr}.al-banco>div{min-height:0!important}}
        .al-banco-atajos{display:none}
        @media(max-width:767px){.al-banco-atajos{display:flex;gap:6px;position:sticky;top:-14px;z-index:5;background:var(--al-bg);padding:8px 0 8px;margin-bottom:6px}}`}</style>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <Pista clave="banco2">Arrastrá una tarjeta a otra columna para avanzarla (en el celu, mantenela apretada un instante y después arrastrala). Tocala para escribir el guion o elegir si es reel, carrusel o historia.</Pista>
        {/* celu: atajos fijos arriba para soltar una tarjeta en cualquier columna sin bajar */}
        {tactil.arrastrando && (
          <div className="al-banco-atajos">
            {COLUMNAS_BANCO.map(c => (
              <div key={c.id} data-soltar={c.id} style={{ flex: 1, textAlign: 'center', padding: '10px 2px', borderRadius: 12, font: '900 12px Nunito,sans-serif', color: 'var(--al-texto)', background: tactil.sobre === c.id ? 'var(--al-acento)' : 'var(--al-tarjeta)', ...(tactil.sobre === c.id ? { color: 'var(--al-sobre-acento)' } : {}), border: '1.5px dashed var(--al-acento)' }}>{c.nombre}</div>
            ))}
          </div>
        )}
      </div>
      <div className="al-banco">
        {COLUMNAS_BANCO.map(c => {
          const deEsa = items.filter(i => i.columna === c.id)
          return (
            <div key={c.id} data-soltar={c.id} onDragOver={e => { if (arrastrando) { e.preventDefault(); setSobre(c.id) } }} onDragLeave={() => setSobre(s => s === c.id ? null : s)} onDrop={e => { e.preventDefault(); if (arrastrando) mover(arrastrando, c.id); setArrastrando(null); setSobre(null) }}
              style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10, borderRadius: 20, background: sobreAhora === c.id ? 'var(--al-suave)' : 'rgba(169,155,184,.12)', minHeight: 200, transition: 'background .15s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 4px 4px' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLOR_COL[c.id] }}/>
                <span className="al-f" style={{ fontSize: 19 }}>{c.nombre}</span>
                <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--al-texto2)' }}>{deEsa.length}</span>
              </div>
              {deEsa.map(tarjeta)}
              {!soloLectura && (nuevoEn === c.id
                ? <input autoFocus value={texto} maxLength={140} placeholder="Una idea…" onChange={e => setTexto(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') agregar(c.id); if (e.key === 'Escape') { setNuevoEn(null); setTexto('') } }}
                    onBlur={() => { if (texto.trim()) agregar(c.id); setNuevoEn(null) }} style={{ ...campo, border: '1.5px solid var(--al-acento)' }}/>
                : <button onClick={() => { setNuevoEn(c.id); setTexto('') }} style={{ ...chico, justifyContent: 'center', border: '1.5px dashed var(--al-borde)', color: 'var(--al-texto2)', background: 'transparent' }}><Plus size={14}/> Agregar</button>)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const campo: React.CSSProperties = { padding: '9px 10px', borderRadius: 10, border: '1px solid var(--al-borde)', background: 'var(--al-bg)', color: 'var(--al-texto)', font: '700 14px Nunito,sans-serif', width: '100%', boxSizing: 'border-box' }
const chico: React.CSSProperties = { display: 'inline-flex', gap: 5, alignItems: 'center', padding: '7px 11px', borderRadius: 12, border: '1px solid var(--al-borde)', background: 'var(--al-tarjeta)', color: 'var(--al-texto)', font: '800 12.5px Nunito,sans-serif', cursor: 'pointer' }
