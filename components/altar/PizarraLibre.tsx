'use client'
// Pizarra libre del Altar de ideas. Lienzo propio (sin librerías): mover con un dedo, zoom con dos dedos o la ruedita,
// flechas que se pegan a las piezas, y piezas que entran adentro de otras (una columna, una nota o una carta) y se
// ordenan solas una debajo de la otra.
// Mover en el celu: tocar la pieza la elige y aparece la manija redonda (se arrastra al toque); también sirve mantenerla apretada.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Minus, Maximize2, StickyNote, Square, ListChecks, Type, Link2, Columns3, Sparkles, MoveUpRight, Copy, Trash2, ArrowUpToLine, ExternalLink, X, Lock, Check, ClipboardPaste, Move, LogOut } from 'lucide-react'
import { toast } from '@/components/ToastProvider'
import { createClient } from '@/lib/supabase'
import { CRISTALES, TINTAS, cristal, nuevoId, acepta, type DatosLibre, type Pieza, type Flecha, type TipoPieza, type TipoFlecha, type Punta, type Extremo } from '@/lib/altar'
import { STICKERS, Sticker, esStickerCanva, stickerSeRecolorea } from './Stickers'

type Vista = { x: number; y: number; z: number }
type Sel = { tipo: 'pieza' | 'flecha'; id: string } | null
type P = { x: number; y: number }
const TAM: Record<TipoPieza, { w: number; h?: number }> = {
  nota: { w: 230 }, carta: { w: 200, h: 290 }, lista: { w: 240 }, titulo: { w: 340 }, link: { w: 230 }, columna: { w: 300, h: 420 }, sticker: { w: 72, h: 72 },
}
const NOMBRE: Record<TipoPieza, string> = { nota: 'nota', carta: 'carta', lista: 'lista', titulo: 'título', link: 'link', columna: 'columna', sticker: 'sticker' }
const TIPOS_FLECHA: { id: TipoFlecha; nombre: string }[] = [
  { id: 'recta', nombre: 'Recta' }, { id: 'curva-izq', nombre: 'Curva ←' }, { id: 'curva-der', nombre: 'Curva →' },
  { id: 'ondulada', nombre: 'Ondulada' }, { id: 'punteada', nombre: 'Punteada' },
]
const PUNTAS: { id: Punta; nombre: string }[] = [{ id: 'triangulo', nombre: 'Triángulo' }, { id: 'estrella', nombre: 'Estrellita' }, { id: 'luna', nombre: 'Luna' }, { id: 'ninguna', nombre: 'Sin punta' }]
const curvaInicial = (t: TipoFlecha) => t === 'curva-izq' ? 70 : t === 'curva-der' || t === 'rulo' ? -70 : 0
const EDITABLES: TipoPieza[] = ['nota', 'carta', 'lista', 'titulo', 'columna']

// ── geometría de las flechas
function bordeHacia(r: { x: number; y: number; w: number; h: number }, hacia: P): P {
  const c = { x: r.x + r.w / 2, y: r.y + r.h / 2 }
  const dx = hacia.x - c.x, dy = hacia.y - c.y
  if (!dx && !dy) return c
  const s = Math.min((r.w / 2 + 6) / Math.abs(dx || 1e-6), (r.h / 2 + 6) / Math.abs(dy || 1e-6))
  return { x: c.x + dx * s, y: c.y + dy * s }
}
function puntosFlecha(a: P, b: P, tipo: TipoFlecha, curva: number): P[] {
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
  const n = { x: -(b.y - a.y) / len, y: (b.x - a.x) / len }
  const c = { x: (a.x + b.x) / 2 + n.x * curva, y: (a.y + b.y) / 2 + n.y * curva }
  const N = tipo === 'ondulada' ? 64 : 24
  const pts: P[] = []
  for (let i = 0; i <= N; i++) {
    const t = i / N
    let x = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x
    let y = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y
    if (tipo === 'ondulada') { const o = Math.sin(t * len / 22 * Math.PI) * 7 * Math.min(1, t * 8, (1 - t) * 8); x += n.x * o; y += n.y * o }
    pts.push({ x, y })
  }
  return pts
}
const caminoDe = (pts: P[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
function PuntaFlecha({ tipo, color, en, angulo, grueso }: { tipo: Punta; color: string; en: P; angulo: number; grueso: boolean }) {
  if (tipo === 'ninguna') return null
  const d = tipo === 'triangulo' ? 'M3 0 L-11 -7 Q-8 0 -11 7 Z'
    : tipo === 'estrella' ? 'M4 0 L-2 -2.2 L-5 -8 L-6 -2 L-12 0 L-6 2 L-5 8 L-2 2.2 Z'
    : 'M2 -8 A9 9 0 1 0 2 8 A7 7 0 1 1 2 -8 Z'
  return <path d={d} fill={color} stroke={color} strokeWidth={1.2} strokeLinejoin="round" transform={`translate(${en.x} ${en.y}) rotate(${angulo}) scale(${grueso ? 1.3 : 1})`}/>
}
// el azul medianoche se vuelve crema en modo oscuro (si no, no se ve sobre la mesa oscura)
const tinta = (c?: string) => !c || c === '#27344A' ? 'var(--al-texto)' : c
function hostDe(u: string) { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return '' } }

export default function PizarraLibre({ datos, cambiar, soloLectura, nivel, limitePiezas, fondo, onLimite, irA }: {
  datos: DatosLibre; cambiar: (d: DatosLibre, grupo?: string) => void; soloLectura: boolean
  nivel: 'basico' | 'premium'; limitePiezas: number; fondo: string; onLimite: () => void; irA?: string | null
}) {
  const piezas = Array.isArray(datos.piezas) ? datos.piezas : []
  const flechas = Array.isArray(datos.flechas) ? datos.flechas : []
  const caja = useRef<HTMLDivElement | null>(null)
  const [vista, setVista] = useState<Vista>({ x: 20, y: 20, z: 1 })
  const vistaRef = useRef(vista); vistaRef.current = vista
  const [sel, setSel] = useState<Sel>(null)
  const [editando, setEditando] = useState<string | null>(null)
  const [herramienta, setHerramienta] = useState<'mover' | 'flecha'>('mover')
  const [menu, setMenu] = useState<null | 'piezas' | 'stickers'>(null)
  const [hojaLink, setHojaLink] = useState(false)
  const [tamanos, setTamanos] = useState<Record<string, { w: number; h: number }>>({})
  const [mov, setMov] = useState<{ id: string; dx: number; dy: number } | null>(null)
  const [destino, setDestino] = useState<string | null>(null)
  const [trazo, setTrazo] = useState<{ desde: Extremo; hasta: P } | null>(null)
  const [curvaTmp, setCurvaTmp] = useState<{ id: string; curva: number } | null>(null)
  const [redim, setRedim] = useState<{ id: string; w: number; h: number } | null>(null)
  const inter = useRef<any>(null)
  const punteros = useRef(new Map<number, P>())
  const observador = useRef<ResizeObserver | null>(null)
  const datosRef = useRef(datos); datosRef.current = datos

  // ── quién está adentro de quién
  const porId = useMemo(() => new Map(piezas.map(p => [p.id, p])), [piezas])
  const padreDe = (p: Pieza) => (p.padre && porId.has(p.padre) && p.padre !== p.id ? porId.get(p.padre)! : null)
  const arriba = piezas.filter(p => !padreDe(p))
  const hijosDe = (id: string) => piezas.filter(p => p.padre === id && porId.has(id))
  const raizDe = (p: Pieza): Pieza => { let x = p; for (let i = 0; i < 5; i++) { const pa = padreDe(x); if (!pa) break; x = pa } return x }
  const descendientes = (id: string): string[] => { const r: string[] = []; const pila = [id]; while (pila.length) { const a = pila.pop()!; for (const h of piezas) if (h.padre === a && !r.includes(h.id)) { r.push(h.id); pila.push(h.id) } } return r }

  const zMax = piezas.reduce((m, p) => Math.max(m, p.z || 0), 0)
  const rectDe = (p: Pieza) => {
    const t = tamanos[p.id]
    const desp = mov && mov.id === p.id ? mov : null
    const r = redim && redim.id === p.id ? redim : null
    return { x: p.x + (desp?.dx || 0), y: p.y + (desp?.dy || 0), w: r?.w || p.w || TAM[p.tipo].w, h: t?.h || r?.h || p.h || TAM[p.tipo].h || 120 }
  }

  // medir las piezas de arriba (para pegar las flechas)
  useEffect(() => {
    observador.current = new ResizeObserver(entradas => {
      setTamanos(prev => {
        const n = { ...prev }; let cambio = false
        for (const e of entradas) {
          const el = e.target as HTMLElement, id = el.dataset.pieza!
          const w = el.offsetWidth, h = el.offsetHeight
          if (!n[id] || n[id].w !== w || n[id].h !== h) { n[id] = { w, h }; cambio = true }
        }
        return cambio ? n : prev
      })
    })
    return () => observador.current?.disconnect()
  }, [])
  const medir = (el: HTMLDivElement | null) => { if (el) observador.current?.observe(el) }

  const [tamCaja, setTamCaja] = useState<{ w: number; h: number } | null>(null)
  useEffect(() => {
    const el = caja.current; if (!el) return
    const ro = new ResizeObserver(() => setTamCaja({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el); return () => ro.disconnect()
  }, [])

  // ir a una pieza (desde la vista lista)
  useEffect(() => {
    if (!irA || !caja.current) return
    const p0 = piezas.find(x => x.id === irA); if (!p0) return
    const p = raizDe(p0)
    const r = caja.current.getBoundingClientRect()
    setVista(v => ({ ...v, x: r.width / 2 - (p.x + (p.w || 200) / 2) * v.z, y: r.height / 3 - p.y * v.z }))
    setSel({ tipo: 'pieza', id: p0.id })
  }, [irA])

  const aMundo = (cx: number, cy: number): P => {
    const r = caja.current!.getBoundingClientRect(), v = vistaRef.current
    return { x: (cx - r.left - v.x) / v.z, y: (cy - r.top - v.y) / v.z }
  }
  // la pieza que está debajo del dedo (la de más arriba, aunque esté adentro de otra)
  const piezaBajo = (cx: number, cy: number, salvo: string[] = []) => {
    for (const el of document.elementsFromPoint(cx, cy)) {
      const id = (el as HTMLElement).closest?.('[data-pieza]')?.getAttribute('data-pieza')
      if (id && !salvo.includes(id) && porId.has(id)) return porId.get(id)!
    }
    return null
  }
  // el contenedor que recibiría a `p` si se suelta acá
  const contenedorBajo = (cx: number, cy: number, p: Pieza) => {
    const prohibidas = [p.id, ...descendientes(p.id)]
    const vistos = new Set<string>()
    for (const el of document.elementsFromPoint(cx, cy)) {
      const id = (el as HTMLElement).closest?.('[data-pieza]')?.getAttribute('data-pieza')
      if (!id || vistos.has(id) || prohibidas.includes(id)) continue
      vistos.add(id)
      const c = porId.get(id)
      if (c && acepta(c.tipo, p.tipo)) return c
    }
    return null
  }

  // ── cambios
  const reemplazar = (id: string, cambios: Partial<Pieza>, grupo?: string) =>
    cambiar({ ...datosRef.current, piezas: piezas.map(p => p.id === id ? { ...p, ...cambios } : p) }, grupo)

  // un lugar libre cerca del centro de la pantalla (así las piezas nuevas no quedan una arriba de la otra)
  function lugarLibre(w: number, h: number): P {
    const r = caja.current!.getBoundingClientRect(), v = vistaRef.current
    const c = { x: (r.width / 2 - v.x) / v.z - w / 2, y: (r.height / 2.4 - v.y) / v.z - h / 2 }
    const ocupados = arriba.map(rectDe)
    const choca = (x: number, y: number) => ocupados.some(o => x < o.x + o.w + 16 && x + w + 16 > o.x && y < o.y + o.h + 16 && y + h + 16 > o.y)
    for (let paso = 0; paso < 60; paso++) {
      const ang = paso * 2.4, rad = 34 * Math.sqrt(paso)
      const x = c.x + Math.cos(ang) * rad * 2.2, y = c.y + Math.sin(ang) * rad * 1.4
      if (!choca(x, y)) return { x: Math.round(x), y: Math.round(y) }
    }
    return { x: Math.round(c.x + 30), y: Math.round(c.y + 30) }
  }
  function agregar(tipo: TipoPieza, extra: Partial<Pieza> = {}) {
    setMenu(null)
    if (soloLectura) return
    if (piezas.length >= limitePiezas) { onLimite(); return }
    const t = TAM[tipo]
    const lugar = lugarLibre(t.w, t.h || 130)
    const p: Pieza = {
      id: nuevoId(), tipo, x: lugar.x, y: lugar.y, w: t.w, z: zMax + 1,
      ...(t.h ? { h: t.h } : {}),
      ...(tipo === 'nota' ? { color: 'amatista', texto: '' } : {}),
      ...(tipo === 'carta' ? { titulo: 'Una idea grande', texto: '' } : {}),
      ...(tipo === 'lista' ? { titulo: 'Lista', items: [{ id: nuevoId(), t: '', ok: false }] } : {}),
      ...(tipo === 'titulo' ? { texto: 'Título', color: '#27344A' } : {}),
      ...(tipo === 'columna' ? { titulo: 'Columna' } : {}),
      ...(tipo === 'sticker' ? { color: esStickerCanva(extra?.sticker) ? 'original' : '#626B91' } : {}),
      ...extra,
    }
    // si hay una columna, nota o carta elegida que la acepta, la nueva pieza entra ahí
    const elegida = sel?.tipo === 'pieza' ? porId.get(sel.id) : null
    if (elegida && acepta(elegida.tipo, tipo)) p.padre = elegida.id
    cambiar({ ...datosRef.current, piezas: [...piezas, p] })
    setSel({ tipo: 'pieza', id: p.id })
    if (EDITABLES.includes(tipo)) setEditando(p.id)
    if (p.padre) toast(`La ${NOMBRE[tipo]} entró en la ${NOMBRE[elegida!.tipo]}.`, 'info')
  }
  function borrarSel() {
    if (!sel || soloLectura) return
    if (sel.tipo === 'pieza') {
      const p = porId.get(sel.id); if (!p) return
      // lo que estaba adentro no se borra: queda suelto en el mismo lugar
      const base = raizDe(p), rb = rectDe(base), pa = padreDe(p)
      let y = rb.y
      const nuevas = piezas.filter(q => q.id !== p.id).map(q => {
        if (q.padre !== p.id) return q
        if (pa) return { ...q, padre: pa.id }
        const suelta = { ...q, padre: undefined, x: Math.round(rb.x), y: Math.round(y), w: q.w || TAM[q.tipo].w, z: zMax + 1 }
        y += 150
        return suelta
      })
      cambiar({ piezas: nuevas, flechas: flechas.filter(f => f.desde.pieza !== p.id && f.hasta.pieza !== p.id) })
      toast(hijosDe(p.id).length ? 'Borrado. Lo que tenía adentro quedó suelto. Si fue sin querer, tocá deshacer.' : 'Borrado. Si fue sin querer, tocá deshacer.', 'info')
    } else {
      cambiar({ ...datosRef.current, flechas: flechas.filter(f => f.id !== sel.id) })
      toast('Flecha borrada. Si fue sin querer, tocá deshacer.', 'info')
    }
    setSel(null); setEditando(null)
  }
  function duplicarSel() {
    if (!sel || sel.tipo !== 'pieza' || soloLectura) return
    const p = porId.get(sel.id); if (!p) return
    const familia = [p.id, ...descendientes(p.id)]
    if (piezas.length + familia.length > limitePiezas) { onLimite(); return }
    const ids = new Map(familia.map(id => [id, nuevoId()]))
    const copias: Pieza[] = familia.map(id => {
      const o: Pieza = JSON.parse(JSON.stringify(porId.get(id)))
      o.id = ids.get(id)!
      if (id === p.id) { o.x = p.x + 24; o.y = p.y + 24; o.z = zMax + 1 } else o.padre = ids.get(o.padre!)
      if (o.items) o.items = o.items.map(i => ({ ...i, id: nuevoId() }))
      return o
    })
    // la copia de algo que estaba adentro queda adentro del mismo lugar, justo debajo
    const pos = piezas.findIndex(q => q.id === p.id)
    const nuevas = [...piezas]; nuevas.splice(pos + 1, 0, ...copias)
    cambiar({ ...datosRef.current, piezas: nuevas }); setSel({ tipo: 'pieza', id: copias[0].id })
    toast('Duplicada.')
  }
  function sacarAfuera() {
    if (!sel || sel.tipo !== 'pieza' || soloLectura) return
    const p = porId.get(sel.id); if (!p) return
    const pa = padreDe(p); if (!pa) return
    const rb = rectDe(raizDe(p))
    cambiar({ ...datosRef.current, piezas: piezas.map(q => q.id === p.id ? { ...q, padre: undefined, x: Math.round(rb.x + rb.w + 30), y: Math.round(rb.y), w: q.w || TAM[q.tipo].w, z: zMax + 1 } : q) })
    toast(`La sacaste de la ${NOMBRE[pa.tipo]}.`)
  }
  // soltar una pieza: adentro de un contenedor (en el orden que corresponde) o suelta en la pizarra
  function soltar(id: string, cx: number, cy: number, dx: number, dy: number) {
    const p = porId.get(id); if (!p) return
    const c = contenedorBajo(cx, cy, p)
    if (c) {
      // posición: según la altura del dedo entre las que ya están adentro
      const hermanos = hijosDe(c.id).filter(h => h.id !== id)
      let antesDe: string | null = null
      for (const h of hermanos) {
        const el = document.querySelector(`[data-pieza="${h.id}"]`) as HTMLElement | null
        if (!el) continue
        const r = el.getBoundingClientRect()
        if (cy < r.top + r.height / 2) { antesDe = h.id; break }
      }
      const movida: Pieza = { ...p, padre: c.id }
      const resto = piezas.filter(q => q.id !== id)
      let pos = antesDe ? resto.findIndex(q => q.id === antesDe) : -1
      if (pos < 0) { const ult = hermanos.length ? resto.findIndex(q => q.id === hermanos[hermanos.length - 1].id) : -1; pos = ult >= 0 ? ult + 1 : resto.length }
      resto.splice(pos, 0, movida)
      cambiar({ ...datosRef.current, piezas: resto })
      if (p.padre !== c.id) toast(`Entró en la ${NOMBRE[c.tipo]}.`)
      return
    }
    if (padreDe(p)) {
      // estaba adentro y la soltó afuera: queda suelta donde la dejó
      const el = document.querySelector(`[data-pieza="${id}"]`) as HTMLElement | null
      const r = el?.getBoundingClientRect()
      const w0 = r ? aMundo(r.left, r.top) : aMundo(cx, cy)
      const ancho = r ? Math.round(r.width / vistaRef.current.z) : (p.w || TAM[p.tipo].w)
      cambiar({ ...datosRef.current, piezas: piezas.map(q => q.id === id ? { ...q, padre: undefined, x: Math.round(w0.x), y: Math.round(w0.y), w: Math.max(TAM[q.tipo].w * 0.6, ancho), z: zMax + 1 } : q) })
      toast('Quedó suelta en la pizarra.')
      return
    }
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) cambiar({ ...datosRef.current, piezas: piezas.map(q => q.id === id ? { ...q, x: Math.round(q.x + dx), y: Math.round(q.y + dy), z: zMax + 1 } : q) })
  }

  // ── punteros
  function abajo(e: React.PointerEvent) {
    abajoInterno(e)
    if (inter.current) { try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch {} }
  }
  function abajoInterno(e: React.PointerEvent) {
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (punteros.current.size === 2) {
      const [a, b] = [...punteros.current.values()]
      clearTimeout(inter.current?.timer)
      setMov(null); setDestino(null)
      inter.current = { modo: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y), v0: vistaRef.current, m0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }
      return
    }
    const t = e.target as HTMLElement
    const asa = t.closest('[data-asa]') as HTMLElement | null
    const redimEl = t.closest('[data-redim]') as HTMLElement | null
    const curvaEl = t.closest('[data-curva]') as HTMLElement | null
    if (asa && !soloLectura) { inter.current = { modo: 'pendiente', id: asa.dataset.asa, x0: e.clientX, y0: e.clientY, tactil: false, listo: true, v0: vistaRef.current }; iniciarArrastre(asa.dataset.asa!); return }
    if (redimEl) { const p = porId.get(redimEl.dataset.redim!); if (p) inter.current = { modo: 'redim', id: p.id, x0: e.clientX, y0: e.clientY, r0: rectDe(p) }; return }
    if (curvaEl) { inter.current = { modo: 'curva', id: curvaEl.dataset.curva }; return }
    if (herramienta === 'flecha' && !soloLectura) {
      const w = aMundo(e.clientX, e.clientY)
      const p = piezaBajo(e.clientX, e.clientY)
      const desde: Extremo = p ? { pieza: p.id, x: w.x, y: w.y } : { x: w.x, y: w.y }
      inter.current = { modo: 'flecha', desde }
      setTrazo({ desde, hasta: w })
      return
    }
    const fl = t.closest('[data-flecha]') as HTMLElement | null
    if (fl) { setSel({ tipo: 'flecha', id: fl.dataset.flecha! }); setEditando(null); inter.current = null; return }
    const pz = t.closest('[data-pieza]') as HTMLElement | null
    if (pz) {
      const id = pz.dataset.pieza!
      // escribiendo en esta pieza: el toque es para el texto
      if (editando === id && t.closest('textarea,input,button')) { inter.current = null; return }
      if (t.closest('button') && t.closest('[data-pieza]') === pz && editando !== id && t.closest('.al-luna')) { inter.current = null; return }
      const tactil = e.pointerType !== 'mouse'
      inter.current = { modo: 'pendiente', id, x0: e.clientX, y0: e.clientY, tactil, v0: vistaRef.current, listo: !tactil }
      if (tactil && !soloLectura) {
        inter.current.timer = setTimeout(() => {
          if (inter.current?.modo === 'pendiente') { inter.current.listo = true; iniciarArrastre(id); try { navigator.vibrate?.(12) } catch {} }
        }, 320)
      }
      return
    }
    setSel(null); setEditando(null); setMenu(null)
    inter.current = { modo: 'pan', x0: e.clientX, y0: e.clientY, v0: vistaRef.current }
  }
  function iniciarArrastre(id: string) {
    if (!porId.has(id)) return
    inter.current = { ...inter.current, modo: 'pieza', id }
    setEditando(null)
    setMov({ id, dx: 0, dy: 0 })
  }
  function mover(e: React.PointerEvent) {
    if (!punteros.current.has(e.pointerId)) return
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const it = inter.current; if (!it) return
    const v = vistaRef.current
    if (it.modo === 'pinch' && punteros.current.size >= 2) {
      const [a, b] = [...punteros.current.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y), m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const z = Math.min(2.5, Math.max(0.25, it.v0.z * d / it.d0))
      const r = caja.current!.getBoundingClientRect()
      const wx = (it.m0.x - r.left - it.v0.x) / it.v0.z, wy = (it.m0.y - r.top - it.v0.y) / it.v0.z
      setVista({ z, x: m.x - r.left - wx * z, y: m.y - r.top - wy * z })
    } else if (it.modo === 'pan') {
      setVista({ ...it.v0, x: it.v0.x + e.clientX - it.x0, y: it.v0.y + e.clientY - it.y0 })
    } else if (it.modo === 'pendiente') {
      const lejos = Math.hypot(e.clientX - it.x0, e.clientY - it.y0) > (it.tactil ? 10 : 4)
      if (!lejos) return
      if (it.tactil && !it.listo) { clearTimeout(it.timer); inter.current = { modo: 'pan', x0: it.x0, y0: it.y0, v0: it.v0 }; return }
      if (soloLectura) { inter.current = { modo: 'pan', x0: it.x0, y0: it.y0, v0: it.v0 }; return }
      iniciarArrastre(it.id)
    } else if (it.modo === 'pieza') {
      setMov({ id: it.id, dx: (e.clientX - it.x0) / v.z, dy: (e.clientY - it.y0) / v.z })
      const p = porId.get(it.id)
      const c = p ? contenedorBajo(e.clientX, e.clientY, p) : null
      setDestino(c ? c.id : null)
    } else if (it.modo === 'flecha') {
      setTrazo({ desde: it.desde, hasta: aMundo(e.clientX, e.clientY) })
    } else if (it.modo === 'curva') {
      const f = flechas.find(x => x.id === it.id); if (!f) return
      const [a, b] = extremos(f)
      const w = aMundo(e.clientX, e.clientY)
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
      const n = { x: -(b.y - a.y) / len, y: (b.x - a.x) / len }
      const curva = ((w.x - (a.x + b.x) / 2) * n.x + (w.y - (a.y + b.y) / 2) * n.y) * 2
      setCurvaTmp({ id: f.id, curva: Math.max(-400, Math.min(400, curva)) })
    } else if (it.modo === 'redim') {
      const p = porId.get(it.id)!
      const st = p.tipo === 'sticker'
      const w = Math.max(st ? 36 : 140, it.r0.w + (e.clientX - it.x0) / v.z), h = Math.max(st ? 36 : 120, it.r0.h + (e.clientY - it.y0) / v.z)
      setRedim({ id: it.id, w: st ? Math.min(220, w) : Math.min(900, w), h: st ? Math.min(220, w) : Math.min(1400, h) })
    }
  }
  function soltarPuntero(e: React.PointerEvent) {
    punteros.current.delete(e.pointerId)
    const it = inter.current
    if (!it) return
    if (it.modo === 'pinch') { if (punteros.current.size === 0) inter.current = null; return }
    clearTimeout(it.timer)
    if (it.modo === 'pendiente') {
      // un toque. En el celu: el primero elige (aparece la manija para mover) y el segundo abre para escribir. Con mouse: abre directo.
      const p = porId.get(it.id)
      const yaElegida = sel?.tipo === 'pieza' && sel.id === it.id
      setSel({ tipo: 'pieza', id: it.id })
      if (!soloLectura && p && EDITABLES.includes(p.tipo) && (!it.tactil || yaElegida)) setEditando(it.id)
      else if (editando !== it.id) setEditando(null)
    } else if (it.modo === 'pieza') {
      const z = vistaRef.current.z
      soltar(it.id, e.clientX, e.clientY, (e.clientX - it.x0) / z, (e.clientY - it.y0) / z)
      setSel({ tipo: 'pieza', id: it.id })
    } else if (it.modo === 'flecha') {
      const w = aMundo(e.clientX, e.clientY), desde: Extremo = it.desde
      if (Math.hypot(w.x - desde.x, w.y - desde.y) > 24) {
        const p = piezaBajo(e.clientX, e.clientY, desde.pieza ? [desde.pieza] : [])
        const f: Flecha = { id: nuevoId(), desde, hasta: p ? { pieza: p.id, x: w.x, y: w.y } : { x: w.x, y: w.y }, tipo: 'curva-der', punta: 'triangulo', grosor: 'normal', color: '#626B91', curva: curvaInicial('curva-der') }
        cambiar({ ...datosRef.current, flechas: [...flechas, f] })
        setSel({ tipo: 'flecha', id: f.id })
        setHerramienta('mover')
      }
    } else if (it.modo === 'curva' && curvaTmp) {
      cambiar({ ...datosRef.current, flechas: flechas.map(f => f.id === curvaTmp.id ? { ...f, curva: Math.round(curvaTmp.curva) } : f) })
    } else if (it.modo === 'redim' && redim) {
      reemplazar(redim.id, { w: Math.round(redim.w), h: Math.round(redim.h) })
    }
    inter.current = null; setMov(null); setDestino(null); setTrazo(null); setCurvaTmp(null); setRedim(null)
  }
  function rueda(e: React.WheelEvent) {
    const v = vistaRef.current
    if (e.ctrlKey || e.metaKey) {
      const r = caja.current!.getBoundingClientRect()
      const z = Math.min(2.5, Math.max(0.25, v.z * Math.exp(-e.deltaY * 0.01)))
      const wx = (e.clientX - r.left - v.x) / v.z, wy = (e.clientY - r.top - v.y) / v.z
      setVista({ z, x: e.clientX - r.left - wx * z, y: e.clientY - r.top - wy * z })
    } else setVista({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY })
  }
  useEffect(() => {
    const el = caja.current; if (!el) return
    const frenar = (e: WheelEvent) => e.preventDefault()
    el.addEventListener('wheel', frenar, { passive: false })
    return () => el.removeEventListener('wheel', frenar)
  }, [])
  function zoom(f: number) {
    const r = caja.current!.getBoundingClientRect(), v = vistaRef.current
    const z = Math.min(2.5, Math.max(0.25, v.z * f))
    const wx = (r.width / 2 - v.x) / v.z, wy = (r.height / 2 - v.y) / v.z
    setVista({ z, x: r.width / 2 - wx * z, y: r.height / 2 - wy * z })
  }
  function centrar() {
    if (!arriba.length || !caja.current) { setVista({ x: 20, y: 20, z: 1 }); return }
    const rs = arriba.map(rectDe)
    const x0 = Math.min(...rs.map(r => r.x)), y0 = Math.min(...rs.map(r => r.y)), x1 = Math.max(...rs.map(r => r.x + r.w)), y1 = Math.max(...rs.map(r => r.y + r.h))
    const r = caja.current.getBoundingClientRect()
    const z = Math.min(1.2, Math.max(0.25, Math.min((r.width - 60) / (x1 - x0 || 1), (r.height - 160) / (y1 - y0 || 1))))
    setVista({ z, x: (r.width - (x1 - x0) * z) / 2 - x0 * z, y: 80 - y0 * z })
  }
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const escribiendo = (e.target as HTMLElement)?.closest?.('textarea,input')
      if (e.key === 'Escape') { setSel(null); setEditando(null); setMenu(null); setHerramienta('mover') }
      if (!escribiendo && (e.key === 'Delete' || e.key === 'Backspace') && sel) { e.preventDefault(); borrarSel() }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  })

  // las flechas que tocan piezas de adentro se vuelven a dibujar cuando la pantalla terminó de acomodarse
  const [, setTic] = useState(0)
  const hayFlechasAdentro = flechas.some(f => [f.desde.pieza, f.hasta.pieza].some(id => { const q = id ? porId.get(id) : null; return !!(q && padreDe(q)) }))
  useEffect(() => {
    if (!hayFlechasAdentro) return
    const id = requestAnimationFrame(() => setTic(t => t + 1))
    return () => cancelAnimationFrame(id)
  }, [datos, tamanos, hayFlechasAdentro])
  // dónde está una pieza en la pizarra; si está adentro de otra, se mide en pantalla (se acomoda sola)
  function rectMundo(p: Pieza) {
    if (!padreDe(p) || typeof document === 'undefined' || !caja.current) return rectDe(raizDe(p))
    const el = document.querySelector(`[data-pieza="${p.id}"]`) as HTMLElement | null
    if (!el) return rectDe(raizDe(p))
    const r = el.getBoundingClientRect(), a = aMundo(r.left, r.top), z = vistaRef.current.z
    return { x: a.x, y: a.y, w: r.width / z, h: r.height / z }
  }
  // extremos de una flecha: pegados al borde de cada pieza
  function extremos(f: Flecha): [P, P] {
    const pa = f.desde.pieza ? porId.get(f.desde.pieza) : null, pb = f.hasta.pieza ? porId.get(f.hasta.pieza) : null
    const ra = pa ? rectMundo(pa) : null, rb = pb ? rectMundo(pb) : null
    const ca = ra ? { x: ra.x + ra.w / 2, y: ra.y + ra.h / 2 } : { x: f.desde.x, y: f.desde.y }
    const cb = rb ? { x: rb.x + rb.w / 2, y: rb.y + rb.h / 2 } : { x: f.hasta.x, y: f.hasta.y }
    return [ra ? bordeHacia(ra, cb) : ca, rb ? bordeHacia(rb, ca) : cb]
  }

  const ventana = tamCaja ? { x0: -vista.x / vista.z - 400, y0: -vista.y / vista.z - 400, x1: (tamCaja.w - vista.x) / vista.z + 400, y1: (tamCaja.h - vista.y) / vista.z + 400 } : null
  const visibles = [...arriba].sort((a, b) => (a.tipo === 'columna' ? -1 : 0) - (b.tipo === 'columna' ? -1 : 0) || (a.z || 0) - (b.z || 0))
  const enPantalla = (p: Pieza) => {
    if (!ventana || sel?.id === p.id || mov?.id === p.id || (sel && raizDe(porId.get(sel.id) || p).id === p.id)) return true
    const r = rectDe(p)
    return r.x + r.w > ventana.x0 && r.x < ventana.x1 && r.y + r.h > ventana.y0 && r.y < ventana.y1
  }

  const piezaSel = sel?.tipo === 'pieza' ? porId.get(sel.id) : null
  const flechaSel = sel?.tipo === 'flecha' ? flechas.find(f => f.id === sel.id) : null
  const tamPunto = 24 * vista.z
  const fondoCss = fondo === 'liso' ? 'var(--al-bg)' : `radial-gradient(circle, var(--al-punto) ${Math.max(0.8, 1.2 * vista.z)}px, transparent ${Math.max(0.9, 1.3 * vista.z)}px) ${vista.x}px ${vista.y}px / ${tamPunto}px ${tamPunto}px, var(--al-bg)`

  // una pieza y, adentro, las que contiene
  function dibujar(p: Pieza, dentro: boolean, prof = 0): React.ReactNode {
    const r = rectDe(p)
    const elegida = sel?.id === p.id
    const ed = editando === p.id && !soloLectura
    const moviendo = mov?.id === p.id
    const esDestino = destino === p.id
    const hijos = prof < 3 ? hijosDe(p.id) : []
    const estilo: React.CSSProperties = dentro
      ? { position: 'relative', width: p.tipo === 'sticker' ? Math.min(p.w || 72, 120) : '100%', margin: p.tipo === 'sticker' ? '0 auto' : undefined, height: p.tipo === 'sticker' ? Math.min(p.w || 72, 120) : undefined,
          ...(moviendo ? { transform: `translate(${mov!.dx}px, ${mov!.dy}px)`, zIndex: 3000, pointerEvents: 'none', opacity: .92 } : {}) }
      : { left: r.x, top: r.y, width: r.w, zIndex: moviendo ? 3000 : p.tipo === 'columna' ? 0 : (p.z || 1) + (elegida ? 1000 : 0),
          ...(p.tipo === 'carta' || p.tipo === 'columna' ? { minHeight: redim?.id === p.id ? redim.h : (p.h || TAM[p.tipo].h) } : p.tipo === 'sticker' ? { height: r.w } : p.h ? { minHeight: redim?.id === p.id ? redim.h : p.h } : {}),
          ...(moviendo ? { pointerEvents: 'none', opacity: .92 } : {}) }
    return (
      <div key={p.id} data-pieza={p.id} ref={dentro ? undefined : medir}
        className={`al-pieza${dentro ? ' dentro' : ''}${elegida ? ' sel' : ''}${esDestino ? ' destino' : ''}${moviendo ? ' moviendo' : ''}`} style={estilo}>
        <ContenidoPieza p={p} editando={ed} soloLectura={soloLectura} onCambio={(c, g) => reemplazar(p.id, c, g)} destino={esDestino}>
          {hijos.length > 0 && <div className="al-hijos">{hijos.map(h => dibujar(h, true, prof + 1))}</div>}
        </ContenidoPieza>
        {elegida && !soloLectura && !moviendo && <button className="al-asa" data-asa={p.id} aria-label="Mantené y arrastrá para mover"><Move size={16}/></button>}
        {elegida && !soloLectura && !dentro && ['carta', 'columna', 'sticker', 'nota', 'link', 'lista'].includes(p.tipo) && <div className="al-redim" data-redim={p.id} aria-label="Cambiar el tamaño"/>}
      </div>
    )
  }

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <style>{`
        .al-lienzo{position:absolute;inset:0;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;cursor:grab}
        .al-lienzo.flecha{cursor:crosshair}
        .al-mundo{position:absolute;left:0;top:0;transform-origin:0 0}
        .al-pieza{position:absolute;border-radius:18px;transition:box-shadow .15s;overflow-wrap:anywhere;word-break:break-word}
        .al-pieza.dentro{border-radius:14px}
        .al-pieza.dentro{--al-tam-titulo:22px}
        .al-pieza.sel{box-shadow:0 0 0 2.5px var(--al-acento),0 14px 30px rgba(39,52,74,.18)!important}
        .al-pieza.moviendo{box-shadow:0 22px 44px rgba(39,52,74,.28)!important}
        .al-pieza.destino>*:first-child{outline:3px dashed var(--al-acento);outline-offset:3px}
        .al-pieza textarea,.al-pieza input{font:inherit;color:inherit;background:transparent;border:none;outline:none;resize:none;width:100%;padding:0;margin:0;overflow-wrap:anywhere;user-select:text;-webkit-user-select:text}
        .al-hijos{display:flex;flex-direction:column;gap:8px;margin-top:10px}
        .al-nota{padding:14px 16px 16px;box-shadow:0 8px 20px rgba(39,52,74,.10);font-family:Nunito,sans-serif;font-weight:700;font-size:15px;line-height:1.4;min-height:110px;white-space:pre-wrap;box-sizing:border-box;position:relative}
        .al-pieza.dentro .al-nota{min-height:0;box-shadow:0 3px 10px rgba(39,52,74,.08)}
        .al-nota:after{content:'';position:absolute;top:0;right:0;width:22px;height:22px;border-top-right-radius:18px;background:linear-gradient(225deg,var(--al-bg) 50%,rgba(39,52,74,.12) 50%)}
        .al-carta{background:#FFFCF7;padding:10px;box-shadow:0 10px 24px rgba(39,52,74,.14);display:flex;box-sizing:border-box}
        .al-carta-marco{flex:1;min-width:0;border:1.5px solid #C9A55C;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px;text-align:center;color:#27344A}
        .al-titulo-f{font-family:Fraunces,serif;font-variation-settings:'SOFT' 100;font-weight:850}
        .al-lista{background:#FFFCF7;padding:14px;box-shadow:0 8px 20px rgba(39,52,74,.10);font-family:Nunito,sans-serif;color:#27344A;box-sizing:border-box}
        .al-item{display:flex;gap:9px;align-items:flex-start;padding:4px 0;font-weight:700;font-size:14px}
        .al-luna{width:20px;height:20px;flex-shrink:0;border:none;background:none;padding:0;cursor:pointer;margin-top:1px}
        .al-link{background:#fff;padding:10px 10px 12px;box-shadow:0 10px 24px rgba(39,52,74,.14);font-family:Nunito,sans-serif;color:#27344A;box-sizing:border-box}
        .al-link-img{width:100%;aspect-ratio:4/3;border-radius:8px;object-fit:cover;background:#ECE7F2;display:flex;align-items:center;justify-content:center;color:#6E7388;font-size:12px;text-align:center;padding:10px;box-sizing:border-box}
        .al-columna{background:rgba(169,155,184,.18);border:1.5px dashed rgba(98,107,145,.35);padding:14px;box-sizing:border-box}
        .al-vacia{margin-top:10px;padding:16px 10px;border:1.5px dashed rgba(98,107,145,.3);border-radius:14px;text-align:center;font:700 12.5px Nunito,sans-serif;color:var(--al-texto2)}
        .al-redim{position:absolute;right:-8px;bottom:-8px;width:22px;height:22px;border-radius:50%;background:var(--al-acento);border:3px solid #fff;cursor:nwse-resize;box-shadow:0 2px 6px rgba(0,0,0,.2)}
        .al-asa{position:absolute;left:-14px;top:-14px;width:34px;height:34px;border-radius:50%;background:var(--al-acento);color:var(--al-sobre-acento);border:3px solid #fff;display:flex;align-items:center;justify-content:center;cursor:grab;box-shadow:0 4px 12px rgba(0,0,0,.22);z-index:5;padding:0;touch-action:none}
        .al-barra{position:absolute;left:10px;right:10px;margin:0 auto;width:fit-content;top:10px;z-index:30;display:flex;gap:4px;align-items:center;background:var(--al-tarjeta);border:1px solid var(--al-borde);border-radius:16px;padding:6px;box-shadow:0 10px 26px rgba(39,52,74,.16);max-width:calc(100% - 20px);overflow-x:auto}
        .al-btn{min-width:36px;height:36px;border-radius:11px;border:none;background:transparent;color:var(--al-texto);display:flex;align-items:center;justify-content:center;gap:5px;cursor:pointer;font:700 12.5px Nunito,sans-serif;padding:0 8px;white-space:nowrap;flex-shrink:0}
        .al-btn:hover{background:var(--al-suave)} .al-btn.on{background:var(--al-acento);color:var(--al-sobre-acento)}
        .al-punto-color{width:24px;height:24px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px var(--al-borde);cursor:pointer;flex-shrink:0;padding:0}
        .al-ayuda{font:700 12px Nunito,sans-serif;color:var(--al-texto2);padding:0 6px;white-space:nowrap}
        .al-fab{position:absolute;right:18px;bottom:calc(18px + env(safe-area-inset-bottom));z-index:31;width:58px;height:58px;border-radius:50%;border:none;background:var(--al-acento);color:var(--al-sobre-acento);display:flex;align-items:center;justify-content:center;box-shadow:0 12px 28px rgba(39,52,74,.35);cursor:pointer}
        .al-menu{position:absolute;right:18px;bottom:calc(88px + env(safe-area-inset-bottom));z-index:31;background:var(--al-tarjeta);border:1px solid var(--al-borde);border-radius:20px;padding:8px;box-shadow:0 18px 40px rgba(39,52,74,.25);width:min(300px,calc(100vw - 36px));transform-origin:bottom right;max-height:calc(100% - 110px);overflow-y:auto}
        .al-op{width:100%;display:flex;gap:12px;align-items:center;padding:10px;border:none;background:none;border-radius:13px;cursor:pointer;color:var(--al-texto);font:800 14px Nunito,sans-serif;text-align:left}
        .al-op:hover{background:var(--al-suave)} .al-op small{display:block;font-weight:600;font-size:11.5px;color:var(--al-texto2)}
        .al-op-ico{width:34px;height:34px;border-radius:10px;background:var(--al-suave);color:var(--al-acento);display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .al-zoom{position:absolute;left:14px;bottom:calc(18px + env(safe-area-inset-bottom));z-index:30;display:flex;gap:4px;background:var(--al-tarjeta);border:1px solid var(--al-borde);border-radius:14px;padding:4px;box-shadow:0 8px 20px rgba(39,52,74,.12)}
        .al-hoja-fondo{position:fixed;inset:0;background:rgba(26,34,50,.35);z-index:300;display:flex;align-items:flex-end;justify-content:center}
        .al-hoja{width:100%;max-width:520px;background:var(--al-tarjeta);border-radius:24px 24px 0 0;padding:20px 18px calc(22px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px rgba(0,0,0,.2);animation:al-sube .2s ease-out}
        @keyframes al-sube{from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1}}
        @media (prefers-reduced-motion: reduce){.al-hoja{animation:none}}
        @media (max-width:767px){.al-fab{bottom:62px}.al-menu{bottom:132px;max-height:calc(100% - 150px)}}
      `}</style>

      <div ref={caja} className={`al-lienzo${herramienta === 'flecha' ? ' flecha' : ''}`} style={{ background: fondoCss }}
        onPointerDown={abajo} onPointerMove={mover} onPointerUp={soltarPuntero} onPointerCancel={soltarPuntero} onWheel={rueda}>
        <div className="al-mundo" style={{ transform: `translate(${vista.x}px, ${vista.y}px) scale(${vista.z})` }}>
          {visibles.filter(enPantalla).map(p => dibujar(p, false))}
          <svg style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', zIndex: 900, pointerEvents: 'none' }} width="1" height="1">
            {flechas.map(f => {
              const [a, b] = extremos(f)
              const tipo: TipoFlecha = f.tipo === 'rulo' ? 'curva-der' : f.tipo
              const curva = curvaTmp?.id === f.id ? curvaTmp.curva : (f.curva ?? curvaInicial(tipo))
              const pts = puntosFlecha(a, b, tipo, curva)
              const fin = pts[pts.length - 1], antes = pts[Math.max(0, pts.length - 4)]
              const ang = Math.atan2(fin.y - antes.y, fin.x - antes.x) * 180 / Math.PI
              const d = caminoDe(pts)
              const elegida = sel?.id === f.id
              const ancho = f.grosor === 'gruesa' ? 4 : 2.4
              const mitad = pts[Math.floor(pts.length / 2)]
              return (
                <g key={f.id}>
                  <path d={d} stroke="transparent" strokeWidth={22} fill="none" data-flecha={f.id} style={{ pointerEvents: 'stroke', cursor: 'pointer' }}/>
                  {elegida && <path d={d} stroke="var(--al-acento)" strokeOpacity={0.25} strokeWidth={ancho + 8} fill="none" strokeLinecap="round"/>}
                  <path d={d} stroke={tinta(f.color)} strokeWidth={ancho} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={tipo === 'punteada' ? `${ancho * 0.1} ${ancho * 3.2}` : undefined}/>
                  <PuntaFlecha tipo={f.punta} color={tinta(f.color)} en={fin} angulo={ang} grueso={f.grosor === 'gruesa'}/>
                  {elegida && !soloLectura && <circle cx={mitad.x} cy={mitad.y} r={10} fill="#fff" stroke="var(--al-acento)" strokeWidth={3} data-curva={f.id} style={{ pointerEvents: 'all', cursor: 'move' }}/>}
                </g>
              )
            })}
            {trazo && (() => { const pts = puntosFlecha({ x: trazo.desde.x, y: trazo.desde.y }, trazo.hasta, 'curva-der', -40); return <path d={caminoDe(pts)} stroke="#626B91" strokeWidth={2.4} strokeDasharray="6 6" fill="none"/> })()}
          </svg>
        </div>
      </div>

      {/* barra de la pieza elegida */}
      {!soloLectura && piezaSel && !mov && (
        <div className="al-barra luma-desplegable luma-desplegable-izq" onPointerDown={e => e.stopPropagation()}>
          {piezaSel.tipo === 'nota' && CRISTALES.map(c => (
            <button key={c.id} className="al-punto-color" title={c.nombre} aria-label={c.nombre} style={{ background: c.fondo, boxShadow: piezaSel.color === c.id ? `0 0 0 2px ${c.borde}` : undefined }} onClick={() => reemplazar(piezaSel.id, { color: c.id })}/>
          ))}
          {piezaSel.tipo === 'sticker' && esStickerCanva(piezaSel.sticker) && stickerSeRecolorea(piezaSel.sticker) && (
            <button className="al-punto-color" title="Colores originales" aria-label="Colores originales" style={{ background: 'conic-gradient(#f7c3cf,#fead9f,#cad2c5,#c2e5e9,#e3b8c5,#f7c3cf)', boxShadow: !piezaSel.color || piezaSel.color === 'original' ? '0 0 0 2px #626B91' : undefined }} onClick={() => reemplazar(piezaSel.id, { color: 'original' })}/>
          )}
          {(piezaSel.tipo === 'titulo' || (piezaSel.tipo === 'sticker' && (!esStickerCanva(piezaSel.sticker) || stickerSeRecolorea(piezaSel.sticker)))) && TINTAS.map(c => (
            <button key={c} className="al-punto-color" aria-label="Color" style={{ background: c, boxShadow: piezaSel.color === c ? `0 0 0 2px ${c}` : undefined }} onClick={() => reemplazar(piezaSel.id, { color: c })}/>
          ))}
          {piezaSel.tipo === 'link' && piezaSel.url && <a className="al-btn" href={piezaSel.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> Abrir</a>}
          {padreDe(piezaSel) && <button className="al-btn" onClick={sacarAfuera} title="Sacar afuera"><LogOut size={15}/> Sacar</button>}
          <button className="al-btn" onClick={duplicarSel} title="Duplicar" aria-label="Duplicar"><Copy size={16}/></button>
          {!padreDe(piezaSel) && <button className="al-btn" onClick={() => reemplazar(piezaSel.id, { z: zMax + 1 })} title="Al frente" aria-label="Al frente"><ArrowUpToLine size={16}/></button>}
          <button className="al-btn" onClick={borrarSel} title="Borrar" aria-label="Borrar" style={{ color: '#A24B47' }}><Trash2 size={16}/></button>
          <button className="al-btn" onClick={() => { setSel(null); setEditando(null) }} aria-label="Listo"><Check size={16}/> Listo</button>
        </div>
      )}
      {!soloLectura && flechaSel && (
        <div className="al-barra luma-desplegable luma-desplegable-izq" onPointerDown={e => e.stopPropagation()}>
          <select className="al-btn" value={flechaSel.tipo === 'rulo' ? 'curva-der' : flechaSel.tipo} aria-label="Tipo de flecha" onChange={e => cambiar({ ...datos, flechas: flechas.map(f => f.id === flechaSel.id ? { ...f, tipo: e.target.value as TipoFlecha, curva: curvaInicial(e.target.value as TipoFlecha) } : f) })} style={{ background: 'var(--al-suave)' }}>
            {TIPOS_FLECHA.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
          <select className="al-btn" value={flechaSel.punta} aria-label="Punta" onChange={e => cambiar({ ...datos, flechas: flechas.map(f => f.id === flechaSel.id ? { ...f, punta: e.target.value as Punta } : f) })} style={{ background: 'var(--al-suave)' }}>
            {PUNTAS.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
          <button className="al-btn" onClick={() => cambiar({ ...datos, flechas: flechas.map(f => f.id === flechaSel.id ? { ...f, grosor: f.grosor === 'gruesa' ? 'normal' : 'gruesa' } : f) })}>{flechaSel.grosor === 'gruesa' ? 'Gruesa' : 'Fina'}</button>
          {TINTAS.map(c => <button key={c} className="al-punto-color" aria-label="Color" style={{ background: c, boxShadow: flechaSel.color === c ? `0 0 0 2px ${c}` : undefined }} onClick={() => cambiar({ ...datos, flechas: flechas.map(f => f.id === flechaSel.id ? { ...f, color: c } : f) })}/>)}
          <button className="al-btn" onClick={borrarSel} aria-label="Borrar flecha" style={{ color: '#A24B47' }}><Trash2 size={16}/></button>
          <button className="al-btn" onClick={() => setSel(null)} aria-label="Listo"><Check size={16}/></button>
        </div>
      )}
      {herramienta === 'flecha' && (
        <div className="al-barra" onPointerDown={e => e.stopPropagation()}>
          <span className="al-ayuda" style={{ whiteSpace: 'normal' }}>Arrastrá de una pieza a otra para dibujar la flecha</span>
          <button className="al-btn on" onClick={() => setHerramienta('mover')}><X size={15}/> Listo</button>
        </div>
      )}
      {mov && destino && (
        <div className="al-barra" style={{ pointerEvents: 'none' }}><span className="al-ayuda">Soltá para meterla en la {NOMBRE[porId.get(destino)!.tipo]}</span></div>
      )}

      <div className="al-zoom" onPointerDown={e => e.stopPropagation()}>
        <button className="al-btn" onClick={() => zoom(1 / 1.2)} aria-label="Alejar"><Minus size={16}/></button>
        <button className="al-btn" onClick={() => setVista(v => ({ ...v, z: 1 }))} aria-label="Tamaño real" style={{ minWidth: 48 }}>{Math.round(vista.z * 100)}%</button>
        <button className="al-btn" onClick={() => zoom(1.2)} aria-label="Acercar"><Plus size={16}/></button>
        <button className="al-btn" onClick={centrar} aria-label="Ver todo"><Maximize2 size={15}/></button>
      </div>

      {!soloLectura && (<>
        {menu === 'piezas' && (
          <div className="al-menu luma-desplegable" role="menu" onPointerDown={e => e.stopPropagation()}>
            {piezaSel && ['columna', 'nota', 'carta'].includes(piezaSel.tipo) && (
              <div style={{ font: '700 12px Nunito,sans-serif', color: 'var(--al-texto2)', padding: '6px 10px 8px' }}>Lo que agregues ahora entra en la {NOMBRE[piezaSel.tipo]} elegida.</div>
            )}
            {([
              ['nota', StickyNote, 'Nota', 'Para una idea. Le podés meter links y títulos'],
              ['carta', Square, 'Carta', 'Una idea importante, destacada como carta de tarot'],
              ['lista', ListChecks, 'Lista', 'Casillas de luna que se llenan'],
              ['titulo', Type, 'Título', 'Texto grande para separar zonas'],
              ['link', Link2, 'Link', 'Pinterest, Instagram, YouTube o cualquier web'],
              ['columna', Columns3, 'Columna', 'Arrastrá cosas adentro: se ordenan solas'],
            ] as [TipoPieza, any, string, string][]).map(([t, Ico, n, d]) => (
              <button key={t} role="menuitem" className="al-op" onClick={() => t === 'link' ? (setMenu(null), piezas.length >= limitePiezas ? onLimite() : setHojaLink(true)) : agregar(t)}>
                <span className="al-op-ico"><Ico size={17}/></span><span>{n}<small>{d}</small></span>
              </button>
            ))}
            <button role="menuitem" className="al-op" onClick={() => setMenu('stickers')}><span className="al-op-ico"><Sparkles size={17}/></span><span>Sticker<small>Para decorar o marcar algo</small></span></button>
            <button role="menuitem" className="al-op" onClick={() => { setMenu(null); setSel(null); setHerramienta('flecha') }}><span className="al-op-ico"><MoveUpRight size={17}/></span><span>Flecha<small>Une una idea con otra</small></span></button>
          </div>
        )}
        {menu === 'stickers' && (
          <div className="al-menu luma-desplegable" onPointerDown={e => e.stopPropagation()} style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>
            {STICKERS.map(s => {
              const bloqueado = nivel !== 'premium' && !s.basico
              return (
                <button key={s.id} className="al-op" title={s.nombre} aria-label={s.nombre} style={{ justifyContent: 'center', padding: 6, position: 'relative', opacity: bloqueado ? 0.45 : 1 }}
                  onClick={() => bloqueado ? toast('Con Premium tenés todos los stickers.', 'info') : agregar('sticker', { sticker: s.id, ...(s.canva ? { w: 110, h: 110 } : {}) })}>
                  <Sticker id={s.id} size={38}/>
                  {bloqueado && <Lock size={11} style={{ position: 'absolute', top: 4, right: 4 }}/>}
                </button>
              )
            })}
          </div>
        )}
        <button className="al-fab" aria-label="Agregar una pieza" aria-expanded={!!menu} onPointerDown={e => e.stopPropagation()} onClick={() => { setMenu(m => m ? null : 'piezas'); setHerramienta('mover') }}>
          {menu ? <X size={24}/> : <Plus size={26}/>}
        </button>
      </>)}

      {hojaLink && <HojaLink onCerrar={() => setHojaLink(false)} onListo={l => { setHojaLink(false); agregar('link', l) }}/>}
    </div>
  )
}

// ── contenido de cada pieza (children = lo que tiene adentro)
function ContenidoPieza({ p, editando, soloLectura, onCambio, children, destino }: { p: Pieza; editando: boolean; soloLectura: boolean; onCambio: (c: Partial<Pieza>, grupo?: string) => void; children?: React.ReactNode; destino?: boolean }) {
  const auto = (el: HTMLTextAreaElement | null) => { if (el) { el.style.height = '0px'; el.style.height = el.scrollHeight + 'px' } }
  if (p.tipo === 'nota') {
    const c = cristal(p.color)
    return (
      <div className="al-nota" style={{ background: c.fondo, border: `1.5px solid ${c.borde}`, color: c.texto, borderRadius: 'inherit', minHeight: 'inherit' }}>
        <div style={{ fontSize: 10, letterSpacing: '.14em', fontWeight: 900, opacity: .6, marginBottom: 4 }}>{c.nombre.toUpperCase()}</div>
        {editando
          ? <textarea autoFocus ref={auto} value={p.texto || ''} placeholder="Escribí tu idea…" maxLength={1200} onChange={e => { auto(e.target); onCambio({ texto: e.target.value }, 'texto:' + p.id) }}/>
          : (p.texto || (children ? null : <span style={{ opacity: .5 }}>{soloLectura ? '' : 'Tocá para escribir'}</span>))}
        {children}
        {destino && !children && <div className="al-vacia">Soltá acá</div>}
      </div>
    )
  }
  if (p.tipo === 'carta') return (
    <div className="al-carta" style={{ borderRadius: 'inherit', minHeight: 'inherit' }}>
      <div className="al-carta-marco">
        <div style={{ display: 'flex', justifyContent: 'center' }}><Sticker id="estrella" size={26} color="#C9A55C"/></div>
        {editando
          ? <textarea value={p.titulo || ''} maxLength={60} rows={1} placeholder="Título" className="al-titulo-f" ref={auto} style={{ fontSize: 20, textAlign: 'center', lineHeight: 1.15 }} onChange={e => { auto(e.target); onCambio({ titulo: e.target.value }, 'titulo:' + p.id) }}/>
          : <div className="al-titulo-f" style={{ fontSize: 20, lineHeight: 1.15 }}>{p.titulo || 'Una idea grande'}</div>}
        <div style={{ height: 1, background: '#E8D9B5', margin: '2px 10px' }}/>
        {editando
          ? <textarea autoFocus ref={auto} value={p.texto || ''} maxLength={800} placeholder="Contá la idea en pocas palabras…" style={{ font: '700 13.5px/1.45 Nunito,sans-serif', textAlign: 'center' }} onChange={e => { auto(e.target); onCambio({ texto: e.target.value }, 'texto:' + p.id) }}/>
          : <div style={{ font: '700 13.5px/1.45 Nunito,sans-serif', whiteSpace: 'pre-wrap' }}>{p.texto}</div>}
        {children}
        {destino && !children && <div className="al-vacia">Soltá acá</div>}
      </div>
    </div>
  )
  if (p.tipo === 'lista') {
    const items = p.items || []
    const hechas = items.filter(i => i.ok).length
    const set = (it: typeof items, g?: string) => onCambio({ items: it }, g)
    return (
      <div className="al-lista" style={{ borderRadius: 'inherit', minHeight: 'inherit' }}>
        {editando
          ? <input value={p.titulo || ''} maxLength={60} placeholder="Título de la lista" className="al-titulo-f" style={{ fontSize: 18, marginBottom: 6 }} onChange={e => onCambio({ titulo: e.target.value }, 'titulo:' + p.id)}/>
          : <div className="al-titulo-f" style={{ fontSize: 18, marginBottom: 6 }}>{p.titulo || 'Lista'}</div>}
        {items.map((i, n) => (
          <div key={i.id} className="al-item">
            <button className="al-luna" aria-label={i.ok ? 'Destildar' : 'Tildar'} disabled={soloLectura} onPointerDown={e => e.stopPropagation()}
              onClick={() => set(items.map(x => x.id === i.id ? { ...x, ok: !x.ok } : x))}>
              <svg viewBox="0 0 20 20" width="20" height="20">{i.ok
                ? <path d="M12 2.5a8 8 0 1 0 5.5 13.8A7 7 0 0 1 12 2.5z" fill="#C9A55C" stroke="#C9A55C" strokeWidth="1.5"/>
                : <circle cx="10" cy="10" r="7.5" fill="none" stroke="#A99BB8" strokeWidth="1.8"/>}</svg>
            </button>
            {editando
              ? <input value={i.t} placeholder="Algo para hacer" maxLength={140} style={{ textDecoration: i.ok ? 'line-through' : undefined, opacity: i.ok ? .6 : 1 }}
                  onChange={e => set(items.map(x => x.id === i.id ? { ...x, t: e.target.value } : x), 'item:' + i.id)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const nuevos = [...items]; nuevos.splice(n + 1, 0, { id: nuevoId(), t: '', ok: false }); set(nuevos) } if (e.key === 'Backspace' && !i.t && items.length > 1) { e.preventDefault(); set(items.filter(x => x.id !== i.id)) } }}/>
              : <span style={{ textDecoration: i.ok ? 'line-through' : undefined, opacity: i.ok ? .6 : 1 }}>{i.t || <span style={{ opacity: .45 }}>…</span>}</span>}
          </div>
        ))}
        {editando && items.length < 40 && <button className="al-btn" style={{ padding: '0 4px', height: 30 }} onClick={() => set([...items, { id: nuevoId(), t: '', ok: false }])}><Plus size={14}/> Agregar</button>}
        {items.length > 0 && <div style={{ fontSize: 11.5, fontWeight: 800, color: '#6E7388', marginTop: 6 }}>{hechas} de {items.length}{hechas === items.length ? ' · luna llena' : ''}</div>}
      </div>
    )
  }
  if (p.tipo === 'titulo') return (
    <div style={{ color: !p.color || p.color === '#27344A' ? 'var(--al-texto)' : p.color, padding: '2px 4px' }}>
      {editando
        ? <textarea autoFocus ref={auto} value={p.texto || ''} maxLength={120} className="al-titulo-f" style={{ fontSize: 'var(--al-tam-titulo, 40px)', lineHeight: 1.05 }} onChange={e => { auto(e.target); onCambio({ texto: e.target.value }, 'texto:' + p.id) }}/>
        : <div className="al-titulo-f" style={{ fontSize: 'var(--al-tam-titulo, 40px)', lineHeight: 1.05, whiteSpace: 'pre-wrap' }}>{p.texto || 'Título'}</div>}
    </div>
  )
  if (p.tipo === 'link') return <PiezaLink p={p}/>
  if (p.tipo === 'columna') return (
    <div className="al-columna" style={{ borderRadius: 22, minHeight: 'inherit' }}>
      {editando
        ? <input autoFocus value={p.titulo || ''} maxLength={50} className="al-titulo-f" style={{ fontSize: 22, color: 'var(--al-texto)' }} onChange={e => onCambio({ titulo: e.target.value }, 'titulo:' + p.id)}/>
        : <div className="al-titulo-f" style={{ fontSize: 22, color: 'var(--al-texto)' }}>{p.titulo || 'Columna'}</div>}
      {children || <div className="al-vacia">{destino ? 'Soltá acá' : 'Arrastrá notas, links o títulos acá adentro'}</div>}
    </div>
  )
  if (p.tipo === 'sticker') return <div style={{ width: '100%', height: '100%', display: 'flex' }}><Sticker id={p.sticker} color={esStickerCanva(p.sticker) ? p.color : tinta(p.color)} size={Math.max(36, Math.min(p.w || 72, 220))}/></div>
  return null
}

function PiezaLink({ p }: { p: Pieza }) {
  const [fallo, setFallo] = useState(false)
  const yt = /youtube\.com|youtu\.be/.test(p.url || '')
  return (
    <div className="al-link" style={{ borderRadius: 14, minHeight: 'inherit' }}>
      <div style={{ position: 'relative' }}>
        {p.img && !fallo
          ? <img src={p.img} alt="" className="al-link-img" referrerPolicy="no-referrer" loading="lazy" draggable={false} onError={() => setFallo(true)}/>
          : <div className="al-link-img">{p.img ? 'La imagen ya no está disponible' : (p.sitio || hostDe(p.url || ''))}</div>}
        {yt && <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(39,52,74,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span></span>}
      </div>
      <div style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: '.12em', color: '#6E7388', marginTop: 8 }}>{(p.sitio || hostDe(p.url || '')).toUpperCase()}</div>
      <div style={{ fontWeight: 800, fontSize: 13.5, lineHeight: 1.3, marginTop: 2, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.titulo || p.url}</div>
    </div>
  )
}

function HojaLink({ onCerrar, onListo }: { onCerrar: () => void; onListo: (l: Partial<Pieza>) => void }) {
  const [url, setUrl] = useState('')
  const [cargando, setCargando] = useState(false)
  async function pegar() {
    try { const t = await navigator.clipboard.readText(); if (t) setUrl(t.trim()) } catch { toast('No pudimos leer lo copiado: pegalo con el teclado.', 'info') }
  }
  async function listo() {
    let u = url.trim()
    if (!u) return
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u
    try { new URL(u) } catch { toast('Ese link no parece válido.', 'error'); return }
    setCargando(true)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      const res = await fetch('/api/altar/link', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` }, body: JSON.stringify({ url: u }) })
      const r = await res.json().catch(() => ({}))
      if (!r.ok && r.mensaje) toast(r.mensaje, 'info')
      onListo({ url: r.url || u, titulo: r.titulo || '', img: r.img || null, sitio: r.sitio || hostDe(u) })
    } catch {
      onListo({ url: u, titulo: '', img: null, sitio: hostDe(u) })
    } finally { setCargando(false) }
  }
  return (
    <div className="al-hoja-fondo" onPointerDown={e => { if (e.target === e.currentTarget) onCerrar() }}>
      <div className="al-hoja" role="dialog" aria-label="Pegar un link">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <b className="al-titulo-f" style={{ fontSize: 22, color: 'var(--al-texto)' }}>Pegá un link</b>
          <button className="al-btn" onClick={onCerrar} aria-label="Cerrar"><X size={18}/></button>
        </div>
        <div style={{ font: '600 13px Nunito,sans-serif', color: 'var(--al-texto2)', marginBottom: 10 }}>De Pinterest, Instagram, YouTube o cualquier web. La imagen se ve sin descargarla.</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" inputMode="url" autoFocus onKeyDown={e => { if (e.key === 'Enter') listo() }}
            style={{ flex: 1, minWidth: 0, padding: '12px 14px', borderRadius: 12, border: '1px solid var(--al-borde)', background: 'var(--al-bg)', color: 'var(--al-texto)', font: '700 15px Nunito,sans-serif' }}/>
          <button className="al-btn" onClick={pegar} style={{ background: 'var(--al-suave)', height: 46 }}><ClipboardPaste size={16}/> Pegar</button>
        </div>
        <button onClick={listo} disabled={!url.trim() || cargando} style={{ marginTop: 14, width: '100%', height: 50, borderRadius: 25, border: 'none', background: 'var(--al-acento)', color: 'var(--al-sobre-acento)', font: '900 15px Nunito,sans-serif', cursor: 'pointer', opacity: !url.trim() || cargando ? .6 : 1 }}>
          {cargando ? 'Buscando la vista previa…' : 'Agregar a la pizarra'}
        </button>
      </div>
    </div>
  )
}
