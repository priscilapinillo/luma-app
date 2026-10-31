'use client'
// Altar de ideas: la lista de pizarras y documentos, «+ Nueva» con las plantillas (menú desplegable) y la papelera de 30 días.
// Los documentos son solo de Premium: con Básico ni se piden (y la base tampoco los mostraría).
import { useContext, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, LayoutGrid, CalendarDays, Lightbulb, Trash2, RotateCcw, ChevronDown, Lock, Sparkles, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { toast } from '@/components/ToastProvider'
import { LIMITES, datosIniciales, mensajeAltar, piezasDe, NOMBRES_PLANTILLA, type Plantilla, type PizarraFila } from '@/lib/altar'
import { PlanAltar } from '@/components/altar/PlanAltar'
import { PLANTILLAS_DOC, primerTitulo, mensajeDocumento, type DocumentoFila, type PlantillaDoc } from '@/lib/documento'

const ICONO: Record<Plantilla, any> = { libre: LayoutGrid, planner: CalendarDays, banco: Lightbulb }
const DESCRIPCION: Record<Plantilla, string> = {
  libre: 'Notas, cartas, links y flechas, como en una mesa',
  planner: 'Ideas, guiones y planner en una sola lista',
  banco: 'Idea → Guion → Grabado → Publicado',
}
const DIA = 86400000
function haceCuanto(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'recién'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60); if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24); return d === 1 ? 'ayer' : `hace ${d} días`
}

export default function AltarInicio() {
  const router = useRouter()
  const { nivel } = useContext(PlanAltar)
  const [filas, setFilas] = useState<PizarraFila[] | null>(null)
  const [menu, setMenu] = useState(false)
  const [creando, setCreando] = useState(false)
  const [verPapelera, setVerPapelera] = useState(false)
  const [confirmarBorrar, setConfirmarBorrar] = useState<string | null>(null)
  const [docs, setDocs] = useState<DocumentoFila[]>([])
  const [filtro, setFiltro] = useState<'todo' | 'pizarras' | 'documentos'>('todo')
  const menuRef = useRef<HTMLDivElement | null>(null)

  async function cargar() {
    const s = createClient()
    const [{ data, error }, rDocs] = await Promise.all([
      s.from('pizarras').select('id, user_id, nombre, plantilla, fondo, datos, version, borrada_en, created_at, updated_at').order('updated_at', { ascending: false }),
      nivel === 'premium'
        ? s.from('documentos').select('id, user_id, nombre, datos, version, borrada_en, created_at, updated_at').order('updated_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ])
    // si la tabla de documentos todavía no existe (falta el SQL), el Altar sigue igual
    setDocs(rDocs.error ? [] : ((rDocs.data || []) as DocumentoFila[]))
    if (error) { toast('No pudimos traer tus pizarras. Probá de nuevo.', 'error'); setFilas([]); return }
    setFilas((data || []) as PizarraFila[])
  }
  useEffect(() => { cargar() }, [nivel])
  useEffect(() => {
    if (!menu) return
    const fuera = (e: PointerEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false) }
    document.addEventListener('pointerdown', fuera); return () => document.removeEventListener('pointerdown', fuera)
  }, [menu])

  const activas = (filas || []).filter(f => !f.borrada_en)
  const docsActivos = docs.filter(d => !d.borrada_en)
  const papelera = (filas || []).filter(f => f.borrada_en)
  const docsPapelera = docs.filter(d => d.borrada_en)
  const premium = nivel === 'premium'
  const llenoBasico = nivel === 'basico' && activas.length >= LIMITES.basico.pizarras

  async function nueva(p: Plantilla) {
    setMenu(false)
    if (creando) return
    // Contenido: una sola lista por cuenta. Si ya tiene una, se abre esa
    if (p === 'planner') {
      const ya = activas.find(f => f.plantilla === 'planner')
      if (ya) { toast('Ya tenés tu lista de Contenido. La abrimos.', 'info'); router.push(`/altar/${ya.id}`); return }
    }
    if (llenoBasico) { toast('Con Básico tenés 1 pizarra. Pasate a Premium para tener todas las que quieras.', 'info'); return }
    setCreando(true)
    const { data, error } = await createClient().from('pizarras').insert({ nombre: NOMBRES_PLANTILLA[p], plantilla: p, datos: datosIniciales(p) }).select('id').single()
    setCreando(false)
    if (error || !data) { toast(mensajeAltar(error).texto, 'error'); cargar(); return }
    toast('Pizarra creada.')
    router.push(`/altar/${data.id}`)
  }
  async function nuevoDoc(tipo: PlantillaDoc = 'blanco') {
    setMenu(false)
    if (creando) return
    if (!premium) { toast('El Documento es de Premium.', 'info'); return }
    setCreando(true)
    const { data, error } = await createClient().from('documentos').insert({ nombre: PLANTILLAS_DOC[tipo].nombre, datos: { html: PLANTILLAS_DOC[tipo].html } }).select('id').single()
    setCreando(false)
    if (error || !data) { toast(mensajeDocumento(error).texto, 'error'); cargar(); return }
    toast('Documento creado.')
    router.push(`/altar/documento/${data.id}`)
  }
  async function recuperarDoc(d: DocumentoFila) {
    const { error } = await createClient().from('documentos').update({ borrada_en: null }).eq('id', d.id)
    if (error) { toast(mensajeDocumento(error).texto, 'error'); return }
    toast('Recuperado.'); cargar()
  }
  async function borrarDocDelTodo(d: DocumentoFila) {
    setConfirmarBorrar(null)
    const { data, error } = await createClient().from('documentos').delete().eq('id', d.id).not('borrada_en', 'is', null).select('id')
    if (error || !data?.length) { toast('No se pudo borrar. Probá de nuevo.', 'error'); return }
    toast('Borrado para siempre.', 'info'); cargar()
  }
  async function recuperar(f: PizarraFila) {
    const { error } = await createClient().from('pizarras').update({ borrada_en: null }).eq('id', f.id)
    if (error) { toast(mensajeAltar(error).texto, 'error'); return }
    toast('Recuperada.'); cargar()
  }
  async function borrarDelTodo(f: PizarraFila) {
    setConfirmarBorrar(null)
    const { data, error } = await createClient().from('pizarras').delete().eq('id', f.id).not('borrada_en', 'is', null).select('id')
    if (error || !data?.length) { toast('No se pudo borrar. Probá de nuevo.', 'error'); return }
    toast('Borrada para siempre.', 'info'); cargar()
  }

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '28px 18px 60px' }}>
      {/* el menú de «Nueva» sale hacia adentro de la pantalla: en la compu hacia la izquierda del botón, en el celu hacia la derecha */}
      <style>{`.al-menu-nueva{right:0}@media(max-width:640px){.al-menu-nueva{right:auto;left:0;transform-origin:top left}}`}</style>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', marginBottom: 22 }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.16em', color: 'var(--al-texto2)' }}>TU ESPACIO CREATIVO</div>
          <h1 className="al-f" style={{ fontSize: 36, margin: '4px 0 2px', lineHeight: 1.05 }}>Altar de ideas</h1>
          <div style={{ fontWeight: 700, color: 'var(--al-texto2)', fontSize: 14.5 }}>Lo que se te ocurre para tus redes y tu trabajo, en un solo lugar.</div>
          <div style={{ fontWeight: 600, color: 'var(--al-texto2)', fontSize: 13, marginTop: 4 }}>Con «Nueva» elegís: pizarra libre, Contenido (ideas, guiones y planner en una sola lista) o documento.</div>
        </div>
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button onClick={() => setMenu(m => !m)} aria-expanded={menu} disabled={creando || filas === null}
            style={{ display: 'flex', alignItems: 'center', gap: 7, height: 46, padding: '0 18px', borderRadius: 23, border: 'none', background: 'var(--al-acento)', color: 'var(--al-sobre-acento)', font: '900 14.5px Nunito,sans-serif', cursor: 'pointer', boxShadow: '0 10px 24px rgba(98,107,145,.35)' }}>
            <Plus size={18}/> {creando ? 'Creando…' : 'Nueva'} <ChevronDown size={15} style={{ rotate: menu ? '180deg' : '0deg', transition: 'rotate .15s' }}/>
          </button>
          {menu && (
            <div className="luma-desplegable al-menu-nueva" role="menu" style={{ position: 'absolute', top: 54, zIndex: 20, width: 'min(320px, calc(100vw - 36px))', background: 'var(--al-tarjeta)', border: '1px solid var(--al-borde)', borderRadius: 20, padding: 8, boxShadow: '0 18px 40px rgba(39,52,74,.22)' }}>
              {llenoBasico && (
                <div style={{ display: 'flex', gap: 8, padding: '10px', marginBottom: 4, borderRadius: 14, background: 'var(--al-suave)', fontWeight: 700, fontSize: 13 }}>
                  <Lock size={15} style={{ flexShrink: 0, marginTop: 2 }}/><span>Con Básico tenés 1 pizarra. <Link href="/suscripcion" style={{ color: 'var(--al-acento)', fontWeight: 900 }}>Ver Premium</Link></span>
                </div>
              )}
              {(['libre', 'planner'] as Plantilla[]).map(p => {
                const Ico = ICONO[p]
                return (
                  <button key={p} role="menuitem" disabled={llenoBasico} onClick={() => nueva(p)}
                    style={{ width: '100%', display: 'flex', gap: 12, alignItems: 'center', padding: 10, border: 'none', background: 'none', borderRadius: 13, cursor: llenoBasico ? 'default' : 'pointer', textAlign: 'left', color: 'var(--al-texto)', opacity: llenoBasico ? .45 : 1 }}>
                    <span style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--al-suave)', color: 'var(--al-acento)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ico size={18}/></span>
                    <span><span style={{ display: 'block', font: '900 14.5px Nunito,sans-serif' }}>{NOMBRES_PLANTILLA[p]}</span><span style={{ display: 'block', font: '600 12px Nunito,sans-serif', color: 'var(--al-texto2)' }}>{DESCRIPCION[p]}</span></span>
                  </button>
                )
              })}
              <div style={{ height: 1, background: 'var(--al-borde)', margin: '6px 8px' }}/>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px 2px', fontSize: 10.5, fontWeight: 900, letterSpacing: '.12em', color: 'var(--al-texto2)' }}>
                DOCUMENTO <span style={{ padding: '2px 7px', borderRadius: 10, background: '#27344A', color: '#F0E6D8', letterSpacing: '.08em' }}>NUEVO</span>
                {!premium && <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center', marginLeft: 'auto', color: 'var(--al-acento)' }}><Lock size={11}/> PREMIUM</span>}
              </div>
              <button role="menuitem" disabled={!premium || creando} onClick={() => nuevoDoc('blanco')}
                style={{ width: '100%', display: 'flex', gap: 12, alignItems: 'center', padding: 10, border: 'none', background: 'none', borderRadius: 13, cursor: premium ? 'pointer' : 'default', textAlign: 'left', color: 'var(--al-texto)', opacity: premium ? 1 : .5 }}>
                <span style={{ width: 38, height: 38, borderRadius: 12, background: '#F7ECD3', color: '#8A6A22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><FileText size={18}/></span>
                <span><span style={{ display: 'block', font: '900 14.5px Nunito,sans-serif' }}>Documento en blanco</span><span style={{ display: 'block', font: '600 12px Nunito,sans-serif', color: 'var(--al-texto2)' }}>Textos largos en hojas A4, con PDF</span></span>
              </button>
              {!premium && (
                <div style={{ display: 'flex', gap: 8, padding: '8px 10px', margin: '2px 0 2px', borderRadius: 14, background: 'var(--al-suave)', fontWeight: 700, fontSize: 12.5 }}>
                  <span>El Documento es de Premium. <Link href="/suscripcion" style={{ color: 'var(--al-acento)', fontWeight: 900 }}>Ver Premium</Link></span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {premium && docsActivos.length > 0 && activas.length > 0 && (
        <div role="group" aria-label="Mostrar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {([['todo', 'Todo'], ['pizarras', 'Pizarras'], ['documentos', 'Documentos']] as const).map(([f, n]) => (
            <button key={f} aria-pressed={filtro === f} onClick={() => setFiltro(f)}
              style={{ height: 38, padding: '0 16px', borderRadius: 19, border: filtro === f ? 'none' : '1px solid var(--al-borde)', background: filtro === f ? '#27344A' : 'var(--al-tarjeta)', color: filtro === f ? '#F0E6D8' : 'var(--al-acento)', font: '800 13px Nunito,sans-serif', cursor: 'pointer' }}>{n}</button>
          ))}
        </div>
      )}

      {filas === null && <div style={{ color: 'var(--al-texto2)', fontWeight: 700 }}>Cargando…</div>}

      {filas !== null && activas.length === 0 && docsActivos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '50px 20px', borderRadius: 26, background: 'var(--al-tarjeta)', border: '1px solid var(--al-borde)' }}>
          <Sparkles size={30} color="var(--al-oro)"/>
          <div className="al-f" style={{ fontSize: 24, margin: '10px 0 6px' }}>Tu altar está vacío</div>
          <div style={{ fontWeight: 700, color: 'var(--al-texto2)', marginBottom: 18 }}>Empezá con una pizarra libre: anotá la primera idea que tengas.</div>
          <button onClick={() => nueva('libre')} disabled={creando} style={{ height: 46, padding: '0 22px', borderRadius: 23, border: 'none', background: 'var(--al-acento)', color: 'var(--al-sobre-acento)', font: '900 14.5px Nunito,sans-serif', cursor: 'pointer' }}>Anotá tu primera idea</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 12 }}>
        {filtro !== 'pizarras' && docsActivos.map(d => {
          const titulo = primerTitulo(d.datos?.html || '') || d.nombre
          return (
            <Link key={'d' + d.id} href={`/altar/documento/${d.id}`} style={{ display: 'block', textDecoration: 'none', color: 'var(--al-texto)', background: 'var(--al-tarjeta)', border: '1px solid var(--al-borde)', borderRadius: 22, padding: 16, boxShadow: '0 6px 18px rgba(39,52,74,.06)' }}>
              <div style={{ position: 'relative', height: 110, borderRadius: 14, background: '#E9E1D4', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', overflow: 'hidden', marginBottom: 12 }} aria-hidden="true">
                <div style={{ width: 120, height: 96, padding: '12px 12px 0', background: '#FFFDF9', borderRadius: '3px 3px 0 0', boxShadow: '0 6px 16px rgba(39,52,74,.14)', display: 'flex', flexDirection: 'column', gap: 5, boxSizing: 'border-box' }}>
                  <span style={{ font: '900 9px Fraunces,Georgia,serif', color: '#27344A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{titulo}</span>
                  {[90, 100, 64, 84].map((w, i) => <span key={i} style={{ height: 3, width: `${w}%`, borderRadius: 2, background: i === 2 ? '#F6D3D1' : '#E6DCCE' }}/>)}
                </div>
                <span style={{ position: 'absolute', top: 8, left: 8, display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 10, background: '#F7ECD3', color: '#5A4416', font: '900 10.5px Nunito,sans-serif' }}><FileText size={11}/> Documento</span>
              </div>
              <div className="al-f" style={{ fontSize: 20, lineHeight: 1.15, wordBreak: 'break-word' }}>{d.nombre}</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--al-texto2)', marginTop: 4 }}>Documento · {haceCuanto(d.updated_at)}</div>
            </Link>
          )
        })}
        {filtro !== 'documentos' && activas.map((f, n) => {
          const Ico = ICONO[f.plantilla] || LayoutGrid
          const lectura = nivel === 'basico' && n > 0
          const cant = piezasDe(f.datos)
          return (
            <Link key={f.id} href={`/altar/${f.id}`} style={{ display: 'block', textDecoration: 'none', color: 'var(--al-texto)', background: 'var(--al-tarjeta)', border: '1px solid var(--al-borde)', borderRadius: 22, padding: 16, boxShadow: '0 6px 18px rgba(39,52,74,.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ width: 40, height: 40, borderRadius: 13, background: 'var(--al-suave)', color: 'var(--al-acento)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ico size={19}/></span>
                <span style={{ flex: 1 }}/>
                {lectura && <span style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 11, fontWeight: 900, padding: '3px 9px', borderRadius: 20, background: 'var(--al-suave)', color: 'var(--al-texto2)' }}><Lock size={11}/> Para mirar</span>}
              </div>
              <div className="al-f" style={{ fontSize: 20, lineHeight: 1.15, wordBreak: 'break-word' }}>{f.nombre}</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--al-texto2)', marginTop: 4 }}>
                {NOMBRES_PLANTILLA[f.plantilla]} · {cant} {cant === 1 ? 'pieza' : 'piezas'} · {haceCuanto(f.updated_at)}
              </div>
            </Link>
          )
        })}
      </div>

      {papelera.length + docsPapelera.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <button onClick={() => setVerPapelera(v => !v)} aria-expanded={verPapelera} style={{ display: 'flex', alignItems: 'center', gap: 7, border: 'none', background: 'none', color: 'var(--al-texto2)', font: '800 13.5px Nunito,sans-serif', cursor: 'pointer', padding: 0 }}>
            <Trash2 size={15}/> Papelera ({papelera.length + docsPapelera.length}) <ChevronDown size={14} style={{ rotate: verPapelera ? '180deg' : '0deg', transition: 'rotate .15s' }}/>
          </button>
          {verPapelera && (
            <div className="luma-desplegable luma-desplegable-izq" style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--al-texto2)' }}>Lo que está acá se borra solo a los 30 días.</div>
              {papelera.map(f => {
                const quedan = Math.max(0, 30 - Math.floor((Date.now() - new Date(f.borrada_en!).getTime()) / DIA))
                return (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 14px', borderRadius: 16, background: 'var(--al-tarjeta)', border: '1px solid var(--al-borde)' }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{f.nombre}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--al-texto2)' }}>{NOMBRES_PLANTILLA[f.plantilla]} · {quedan === 0 ? 'se borra hoy' : quedan === 1 ? 'queda 1 día' : `quedan ${quedan} días`}</div>
                    </div>
                    {confirmarBorrar === f.id ? (
                      <div className="luma-desplegable" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12.5, fontWeight: 800 }}>¿Borrar para siempre?</span>
                        <button onClick={() => borrarDelTodo(f)} style={{ ...chico, background: 'var(--al-peligro)', color: '#fff', borderColor: 'transparent' }}>Sí, borrar</button>
                        <button onClick={() => setConfirmarBorrar(null)} style={chico}>No</button>
                      </div>
                    ) : (<>
                      <button onClick={() => recuperar(f)} style={chico}><RotateCcw size={14}/> Recuperar</button>
                      <button onClick={() => setConfirmarBorrar(f.id)} style={{ ...chico, color: 'var(--al-peligro)' }} aria-label="Borrar para siempre"><Trash2 size={14}/></button>
                    </>)}
                  </div>
                )
              })}
              {docsPapelera.map(d => {
                const quedan = Math.max(0, 30 - Math.floor((Date.now() - new Date(d.borrada_en!).getTime()) / DIA))
                const clave = 'd' + d.id
                return (
                  <div key={clave} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 14px', borderRadius: 16, background: 'var(--al-tarjeta)', border: '1px solid var(--al-borde)' }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{d.nombre}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--al-texto2)' }}>Documento · {quedan === 0 ? 'se borra hoy' : quedan === 1 ? 'queda 1 día' : `quedan ${quedan} días`}</div>
                    </div>
                    {confirmarBorrar === clave ? (
                      <div className="luma-desplegable" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12.5, fontWeight: 800 }}>¿Borrar para siempre?</span>
                        <button onClick={() => borrarDocDelTodo(d)} style={{ ...chico, background: 'var(--al-peligro)', color: '#fff', borderColor: 'transparent' }}>Sí, borrar</button>
                        <button onClick={() => setConfirmarBorrar(null)} style={chico}>No</button>
                      </div>
                    ) : (<>
                      <button onClick={() => recuperarDoc(d)} style={chico}><RotateCcw size={14}/> Recuperar</button>
                      <button onClick={() => setConfirmarBorrar(clave)} style={{ ...chico, color: 'var(--al-peligro)' }} aria-label="Borrar para siempre"><Trash2 size={14}/></button>
                    </>)}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const chico: React.CSSProperties = { display: 'inline-flex', gap: 5, alignItems: 'center', padding: '7px 11px', borderRadius: 12, border: '1px solid var(--al-borde)', background: 'var(--al-tarjeta)', color: 'var(--al-texto)', font: '800 12.5px Nunito,sans-serif', cursor: 'pointer' }
