'use client'
// Una pizarra del Altar (libre, planner o banco): barra de arriba con ←, nombre, estado del guardado y deshacer/rehacer.
import { useContext, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Undo2, Redo2, Check, CloudOff, Loader2, AlertCircle, MoreHorizontal, LayoutGrid, List, Trash2, Lock, Sparkles, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { toast } from '@/components/ToastProvider'
import { LIMITES, mensajeAltar, NOMBRES_PLANTILLA, itemsDeBanco, type PizarraFila } from '@/lib/altar'
import { PlanAltar } from '@/components/altar/PlanAltar'
import { useGuardado } from '@/components/altar/useGuardado'
import PizarraLibre from '@/components/altar/PizarraLibre'
import VistaLista from '@/components/altar/VistaLista'
import PlannerSemanal from '@/components/altar/PlannerSemanal'
import BancoIdeas from '@/components/altar/BancoIdeas'
import Pista from '@/components/altar/Pista'

export default function PaginaPizarra() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { nivel } = useContext(PlanAltar)
  const [fila, setFila] = useState<PizarraFila | null>(null)
  const [lectura, setLectura] = useState(false)
  const [otraNombre, setOtraNombre] = useState('')
  const [noEsta, setNoEsta] = useState(false)

  useEffect(() => {
    (async () => {
      const s = createClient()
      const { data } = await s.from('pizarras').select('*').eq('id', id).is('borrada_en', null).maybeSingle()
      if (!data) { setNoEsta(true); return }
      if (nivel === 'basico') {
        // con Básico se edita solo la última que usó (lo mismo revisa la base)
        const { data: ultima } = await s.from('pizarras').select('id, nombre').is('borrada_en', null).order('updated_at', { ascending: false }).limit(1).maybeSingle()
        if (ultima && ultima.id !== data.id) { setLectura(true); setOtraNombre(ultima.nombre) }
      }
      setFila(data as PizarraFila)
    })()
  }, [id, nivel])

  if (noEsta) return (
    <div style={{ padding: '80px 20px', textAlign: 'center' }}>
      <div className="al-f" style={{ fontSize: 24, marginBottom: 8 }}>Esta pizarra no está</div>
      <div style={{ color: 'var(--al-texto2)', fontWeight: 700, marginBottom: 20 }}>Puede que esté en la papelera o que se haya borrado.</div>
      <Link href="/altar" style={{ color: 'var(--al-acento)', fontWeight: 900 }}>Volver al Altar</Link>
    </div>
  )
  if (!fila) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--al-texto2)', fontSize: 14 }}>Cargando…</div>
  return <Editor key={fila.id + ':' + lectura} fila={fila} nivel={nivel} lecturaInicial={lectura} otraNombre={otraNombre}
    onUsarEsta={async () => {
      // cambiarle algo inocente la vuelve "la última usada": desde ahí se edita esta y la otra queda para mirar
      const { error } = await createClient().from('pizarras').update({ nombre: fila.nombre }).eq('id', fila.id)
      if (error) { toast(mensajeAltar(error).texto, 'error'); return }
      const { data } = await createClient().from('pizarras').select('*').eq('id', fila.id).maybeSingle()
      if (data) { setFila(data as PizarraFila); setLectura(false); toast('Listo: ahora editás esta pizarra.') }
    }}
    onPapelera={() => router.push('/altar')}/>
}

function Editor({ fila, nivel, lecturaInicial, otraNombre, onUsarEsta, onPapelera }: { fila: PizarraFila; nivel: 'basico' | 'premium'; lecturaInicial: boolean; otraNombre: string; onUsarEsta: () => void; onPapelera: () => void }) {
  const g = useGuardado(fila)
  const soloLectura = lecturaInicial || g.soloLectura
  const limite = LIMITES[nivel].piezas
  const [vista, setVista] = useState<'pizarra' | 'lista'>('pizarra')
  const [irA, setIrA] = useState<string | null>(null)
  const [fondo, setFondo] = useState(fila.fondo || 'puntitos')
  const [menu, setMenu] = useState(false)
  const [cartelLimite, setCartelLimite] = useState(false)
  const [editNombre, setEditNombre] = useState(false)
  const [nombreTmp, setNombreTmp] = useState(g.nombre)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => { if (lecturaInicial) g.setSoloLectura(true) }, [lecturaInicial])
  // Contenido: la primera vez que se abre, trae las ideas de los Bancos de ideas que ya tenía (sin borrar los originales)
  useEffect(() => {
    if (fila.plantilla !== 'planner' || soloLectura || !g.datos || g.datos.bancoImportado) return
    let cancelado = false
    ;(async () => {
      const { data, error } = await createClient().from('pizarras').select('id, datos').eq('plantilla', 'banco').is('borrada_en', null)
      if (cancelado || error) return // si falla, se reintenta la próxima vez que abra
      const actuales: any[] = Array.isArray(g.datos.items) ? g.datos.items : []
      const ya = new Set(actuales.map(i => i.id))
      let nuevos = (data || []).flatMap((b: any) => itemsDeBanco(b.datos?.items)).filter(i => !ya.has(i.id))
      const lugar = Math.max(0, limite - actuales.length)
      const sobran = nuevos.length > lugar
      nuevos = nuevos.slice(0, lugar)
      g.cambiar({ ...g.datos, items: [...actuales, ...nuevos], bancoImportado: !sobran })
      if (nuevos.length) toast(nuevos.length === 1 ? 'Sumamos 1 idea de tu Banco de ideas.' : `Sumamos ${nuevos.length} ideas de tu Banco de ideas.`)
      if (sobran) toast('No entraron todas las ideas de tu Banco por el límite de tu plan.', 'info')
    })()
    return () => { cancelado = true }
  }, [fila.id, !!g.datos, soloLectura])
  // deshacer con el teclado (compu), salvo mientras escribe
  useEffect(() => {
    const t = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || (e.target as HTMLElement)?.closest?.('textarea,input')) return
      if (e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? g.rehacer() : g.deshacer() }
      if (e.key.toLowerCase() === 'y') { e.preventDefault(); g.rehacer() }
    }
    window.addEventListener('keydown', t); return () => window.removeEventListener('keydown', t)
  }, [g.deshacer, g.rehacer])
  useEffect(() => {
    if (!menu) return
    const fuera = (e: PointerEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false) }
    document.addEventListener('pointerdown', fuera); return () => document.removeEventListener('pointerdown', fuera)
  }, [menu])

  async function guardarNombre() {
    setEditNombre(false)
    const n = nombreTmp.trim()
    if (!n || n === g.nombre) { setNombreTmp(g.nombre); return }
    await g.guardar() // primero lo pendiente, así no choca la versión
    const ok = await g.renombrar(n)
    if (ok) toast('Nombre cambiado.'); else { setNombreTmp(g.nombre); toast('No se pudo cambiar el nombre. Probá de nuevo.', 'error') }
  }
  async function cambiarFondo(f: string) {
    setMenu(false); setFondo(f)
    if (!(await g.actualizar({ fondo: f }))) { setFondo(fila.fondo); toast('No se pudo cambiar el fondo.', 'error') }
  }
  async function aPapelera() {
    setMenu(false)
    if (!(await g.actualizar({ borrada_en: new Date().toISOString() }))) { toast('No se pudo mandar a la papelera. Probá de nuevo.', 'error'); return }
    toast('Está en la papelera 30 días. Desde ahí la recuperás.', 'info')
    onPapelera()
  }

  const IcoEstado = g.estado === 'guardado' ? Check : g.estado === 'guardando' || g.estado === 'pendiente' ? Loader2 : g.estado === 'sinred' ? CloudOff : AlertCircle
  const colorEstado = g.estado === 'error' ? 'var(--al-peligro)' : g.estado === 'sinred' ? 'var(--al-oro)' : g.estado === 'guardado' ? '#5E8F6B' : 'var(--al-texto2)'

  return (
    <div className="al-pagina">
      <style>{`
        .al-pagina{display:flex;flex-direction:column;height:100dvh}
        @media(max-width:767px){.al-pagina{height:calc(100dvh - 110px - env(safe-area-inset-bottom))}}
        .al-arriba{display:flex;align-items:center;gap:6px;padding:10px 12px;border-bottom:1px solid var(--al-borde);background:var(--al-tarjeta);position:relative;z-index:40}
        .al-ico{width:38px;height:38px;border-radius:12px;border:none;background:transparent;color:var(--al-texto);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
        .al-ico:hover:not(:disabled){background:var(--al-suave)} .al-ico:disabled{opacity:.3;cursor:default}
        .al-girar{animation:al-gira 1s linear infinite} @keyframes al-gira{to{rotate:360deg}}
        @media (prefers-reduced-motion: reduce){.al-girar{animation:none}}
        .al-aviso{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 14px;font:700 13.5px Nunito,sans-serif;border-bottom:1px solid var(--al-borde)}
        .al-aviso a,.al-aviso button{font:900 13px Nunito,sans-serif;color:var(--al-acento);background:none;border:none;cursor:pointer;text-decoration:underline;padding:0}
        @media(max-width:520px){.al-texto-estado{display:none}}
      `}</style>

      <div className="al-arriba">
        <Link href="/altar" className="al-ico" aria-label="Volver al Altar"><ArrowLeft size={19}/></Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editNombre
            ? <input autoFocus value={nombreTmp} maxLength={80} onChange={e => setNombreTmp(e.target.value)} onBlur={guardarNombre} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setNombreTmp(g.nombre); setEditNombre(false) } }}
                className="al-f" style={{ width: '100%', fontSize: 19, border: 'none', borderBottom: '2px solid var(--al-acento)', background: 'transparent', color: 'var(--al-texto)', outline: 'none', padding: '2px 0' }} aria-label="Nombre de la pizarra"/>
            : <button onClick={() => { setNombreTmp(g.nombre); setEditNombre(true) }} style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: '100%', border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: 'var(--al-texto)' }} aria-label="Cambiar el nombre">
                <span className="al-f" style={{ fontSize: 19, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.nombre}</span>
                <Pencil size={13} style={{ opacity: .45, flexShrink: 0 }}/>
              </button>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 800, color: colorEstado, marginTop: 1 }} aria-live="polite"
            title="Todo se guarda solo en tu cuenta de Luma, 2 segundos después de que dejás de tocar. No hace falta apretar nada."
            onClick={() => { if (g.estado === 'error' || g.estado === 'sinred') { g.setAviso(null); g.guardar() } }} role={g.estado === 'error' ? 'button' : undefined}>
            {soloLectura ? <><Lock size={12}/> Solo para mirar</> : <><IcoEstado size={12} className={g.estado === 'guardando' || g.estado === 'pendiente' ? 'al-girar' : undefined}/><span>{g.textoEstado}</span></>}
            <span style={{ color: 'var(--al-texto2)', fontWeight: 700 }} className="al-texto-estado">· {NOMBRES_PLANTILLA[fila.plantilla]}</span>
          </div>
        </div>
        {!soloLectura && <>
          <button className="al-ico" onClick={g.deshacer} disabled={!g.puedeDeshacer} aria-label="Deshacer" title="Deshacer"><Undo2 size={18}/></button>
          <button className="al-ico" onClick={g.rehacer} disabled={!g.puedeRehacer} aria-label="Rehacer" title="Rehacer"><Redo2 size={18}/></button>
        </>}
        {fila.plantilla === 'libre' && (
          <button className="al-ico" onClick={() => { setVista(v => v === 'pizarra' ? 'lista' : 'pizarra'); setIrA(null) }} aria-label={vista === 'pizarra' ? 'Ver como lista' : 'Ver la pizarra'} title={vista === 'pizarra' ? 'Ver como lista' : 'Ver la pizarra'}>
            {vista === 'pizarra' ? <List size={18}/> : <LayoutGrid size={18}/>}
          </button>
        )}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button className="al-ico" onClick={() => setMenu(m => !m)} aria-label="Más opciones" aria-expanded={menu}><MoreHorizontal size={19}/></button>
          {menu && (
            <div className="luma-desplegable" role="menu" style={{ position: 'absolute', right: 0, top: 44, width: 230, background: 'var(--al-tarjeta)', border: '1px solid var(--al-borde)', borderRadius: 16, padding: 6, boxShadow: '0 16px 36px rgba(39,52,74,.2)' }}>
              {fila.plantilla === 'libre' && !soloLectura && <>
                <div style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: '.12em', color: 'var(--al-texto2)', padding: '6px 10px 4px' }}>FONDO</div>
                {[['puntitos', 'Con puntitos'], ['liso', 'Liso']].map(([f, n]) => (
                  <button key={f} role="menuitemradio" aria-checked={fondo === f} onClick={() => cambiarFondo(f)} style={itemMenu}>{n}{fondo === f && <span style={{ marginLeft: 'auto', color: 'var(--al-acento)' }}>●</span>}</button>
                ))}
                <div style={{ height: 1, background: 'var(--al-borde)', margin: '4px 6px' }}/>
              </>}
              <button role="menuitem" onClick={aPapelera} style={{ ...itemMenu, color: 'var(--al-peligro)' }}><Trash2 size={15}/> Mandar a la papelera</button>
            </div>
          )}
        </div>
      </div>

      {lecturaInicial && (
        <div className="al-aviso" style={{ background: 'var(--al-suave)' }}>
          <Lock size={15}/> <span style={{ flex: 1, minWidth: 200 }}>Con Básico editás una pizarra a la vez (ahora: «{otraNombre}»). Esta queda para mirar, no se borra nada.</span>
          <button onClick={onUsarEsta}>Editar esta en lugar de la otra</button>
          <Link href="/suscripcion">Ver Premium</Link>
        </div>
      )}
      {g.aviso && !lecturaInicial && (
        <div className="al-aviso" style={{ background: g.aviso.tipo === 'otro' ? '#F6E4E2' : 'var(--al-suave)' }}>
          <AlertCircle size={15}/> <span style={{ flex: 1, minWidth: 200 }}>{g.aviso.texto}</span>
          {(g.aviso.tipo === 'plan' || g.aviso.tipo === 'limite') && <Link href="/suscripcion">{g.aviso.tipo === 'plan' ? 'Renovar' : 'Ver Premium'}</Link>}
          {g.aviso.tipo === 'otro' && <button onClick={() => { g.setAviso(null); g.guardar() }}>Probar de nuevo</button>}
        </div>
      )}
      {cartelLimite && (
        <div className="al-aviso luma-desplegable luma-desplegable-izq" style={{ background: 'var(--al-suave)' }}>
          <Sparkles size={15}/>
          <span style={{ flex: 1, minWidth: 200 }}>{nivel === 'premium'
            ? `Esta pizarra llegó a ${LIMITES.premium.piezas.toLocaleString('es-AR')} piezas. Empezá una nueva para seguir.`
            : `Llegaste a las ${LIMITES.basico.piezas} piezas de Básico. Con Premium tenés hasta ${LIMITES.premium.piezas.toLocaleString('es-AR')} y todas las pizarras que quieras.`}</span>
          {nivel !== 'premium' && <Link href="/suscripcion">Ver Premium</Link>}
          <button onClick={() => setCartelLimite(false)} style={{ textDecoration: 'none', color: 'var(--al-texto2)' }}>Cerrar</button>
        </div>
      )}

      {fila.plantilla === 'libre' && vista === 'pizarra' && !soloLectura && (
        <div style={{ padding: '10px 12px 0', background: 'var(--al-bg)' }}>
          <Pista clave="pizarra">Tocá una pieza para elegirla: con el <b>círculo con flechitas</b> la movés y, tocándola de nuevo, escribís. Para meter algo adentro de una columna, nota o carta, <b>arrastralo encima</b> y soltalo: se ordena solo.</Pista>
        </div>
      )}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {fila.plantilla === 'libre' && (vista === 'pizarra'
          ? <PizarraLibre datos={g.datos} cambiar={g.cambiar} soloLectura={soloLectura} nivel={nivel} limitePiezas={limite} fondo={fondo} onLimite={() => setCartelLimite(true)} irA={irA}/>
          : <VistaLista datos={g.datos} onIr={pid => { setIrA(pid); setVista('pizarra') }}/>)}
        {fila.plantilla === 'planner' && <PlannerSemanal datos={g.datos} cambiar={g.cambiar} soloLectura={soloLectura} limitePiezas={limite} onLimite={() => setCartelLimite(true)}/>}
        {fila.plantilla === 'banco' && <BancoIdeas datos={g.datos} cambiar={g.cambiar} soloLectura={soloLectura} limitePiezas={limite} onLimite={() => setCartelLimite(true)}/>}
      </div>

      {g.conflicto && (
        <div className="al-hoja-fondo" style={{ position: 'fixed', inset: 0, background: 'rgba(26,34,50,.35)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div role="dialog" aria-label="Dos versiones" style={{ width: '100%', maxWidth: 520, background: 'var(--al-tarjeta)', borderRadius: '24px 24px 0 0', padding: '22px 18px calc(22px + env(safe-area-inset-bottom))' }}>
            <div className="al-f" style={{ fontSize: 22, marginBottom: 6 }}>Esta pizarra cambió en otro lado</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--al-texto2)', marginBottom: 18 }}>La abriste en otro dispositivo (o en otra pestaña) y se guardó ahí. ¿Con cuál te quedás? La otra se pierde.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => { g.resolverConflicto('mia'); toast('Te quedaste con la de acá.') }} style={botonGrande(true)}>Quedarme con la de acá</button>
              <button onClick={() => { g.resolverConflicto('otra'); toast('Trajimos la del otro dispositivo.') }} style={botonGrande(false)}>Traer la del otro dispositivo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const itemMenu: React.CSSProperties = { width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px', border: 'none', background: 'none', borderRadius: 11, cursor: 'pointer', color: 'var(--al-texto)', font: '800 13.5px Nunito,sans-serif', textAlign: 'left' }
const botonGrande = (principal: boolean): React.CSSProperties => ({ height: 50, borderRadius: 25, border: principal ? 'none' : '1.5px solid var(--al-borde)', background: principal ? 'var(--al-acento)' : 'transparent', color: principal ? 'var(--al-sobre-acento)' : 'var(--al-texto)', font: '900 15px Nunito,sans-serif', cursor: 'pointer' })
