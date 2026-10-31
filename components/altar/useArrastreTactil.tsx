'use client'
// Arrastrar tarjetas con el dedo (celu y tablet), para el Planner y el Banco de ideas.
// · Mantener apretada la tarjeta un instante → vibra y se "levanta"; después se arrastra a donde dice data-soltar.
// · Si el dedo se mueve antes de levantarla, es un scroll normal (no se arrastra nada).
// · Cerca del borde de arriba o de abajo, la pantalla se mueve sola.
// · Si algo falla, sigue estando la forma manual (tocar la tarjeta y elegir el día o la columna).
import { useEffect, useRef, useState } from 'react'

export type Arrastre = { id: string; titulo: string; x: number; y: number; dx: number; dy: number; w: number }
const ESPERA_MS = 350

export function useArrastreTactil(onSoltar: (id: string, destino: string) => void, contenedor: React.RefObject<HTMLElement | null>) {
  const [arr, setArr] = useState<Arrastre | null>(null)
  const [sobre, setSobre] = useState<string | null>(null)
  const st = useRef<{ id: string; titulo: string; x0: number; y0: number; timer: ReturnType<typeof setTimeout> | null; activo: boolean; el: HTMLElement | null; ultimo: { x: number; y: number }; destino: string | null; raf: number | null }>(null as any)
  const alSoltar = useRef(onSoltar); alSoltar.current = onSoltar
  const soltoEn = useRef(0)

  // mientras se arrastra, el dedo no mueve la página (hay que avisarlo antes de que empiece el toque: por eso va siempre)
  useEffect(() => {
    const frenar = (e: TouchEvent) => { if (st.current?.activo) e.preventDefault() }
    document.addEventListener('touchmove', frenar, { passive: false })
    return () => { document.removeEventListener('touchmove', frenar); if (st.current?.timer) clearTimeout(st.current.timer); if (st.current?.raf) cancelAnimationFrame(st.current.raf) }
  }, [])

  const destinoEn = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null
    return el?.closest('[data-soltar]')?.getAttribute('data-soltar') ?? null
  }
  // la pantalla se mueve sola cerca de los bordes
  const autoScroll = () => {
    const s = st.current, c = contenedor.current
    if (!s?.activo || !c) return
    const r = c.getBoundingClientRect(), y = s.ultimo.y
    const vel = y < r.top + 70 ? -Math.ceil((r.top + 70 - y) / 6) : y > r.bottom - 90 ? Math.ceil((y - (r.bottom - 90)) / 6) : 0
    if (vel) { c.scrollTop += vel; const d = destinoEn(s.ultimo.x, s.ultimo.y); s.destino = d; setSobre(d) }
    s.raf = requestAnimationFrame(autoScroll)
  }

  const terminar = () => {
    const s = st.current
    if (s?.timer) clearTimeout(s.timer)
    if (s?.raf) cancelAnimationFrame(s.raf)
    if (s?.el) s.el.style.opacity = ''
    st.current = null as any
    setArr(null); setSobre(null)
  }

  function props(id: string, titulo: string, activo = true) {
    if (!activo) return {}
    return {
      onTouchStart: (e: React.TouchEvent<HTMLElement>) => {
        if (e.touches.length !== 1) { terminar(); return }
        const t = e.touches[0], el = e.currentTarget
        const s = { id, titulo, x0: t.clientX, y0: t.clientY, timer: null as any, activo: false, el, ultimo: { x: t.clientX, y: t.clientY }, destino: null as string | null, raf: null as number | null }
        st.current = s
        s.timer = setTimeout(() => {
          if (st.current !== s) return
          s.activo = true
          const r = el.getBoundingClientRect()
          el.style.opacity = '.35'
          try { navigator.vibrate?.(14) } catch {}
          setArr({ id, titulo, x: s.ultimo.x, y: s.ultimo.y, dx: s.x0 - r.left, dy: s.y0 - r.top, w: Math.min(r.width, 300) })
          s.raf = requestAnimationFrame(autoScroll)
        }, ESPERA_MS)
      },
      onTouchMove: (e: React.TouchEvent<HTMLElement>) => {
        const s = st.current; if (!s || s.id !== id) return
        const t = e.touches[0]
        s.ultimo = { x: t.clientX, y: t.clientY }
        if (!s.activo) {
          if (Math.hypot(t.clientX - s.x0, t.clientY - s.y0) > 10) terminar() // se movió antes: es scroll
          return
        }
        setArr(a => a ? { ...a, x: t.clientX, y: t.clientY } : a)
        const d = destinoEn(t.clientX, t.clientY)
        if (d !== s.destino) { s.destino = d; setSobre(d) }
      },
      onTouchEnd: (e: React.TouchEvent<HTMLElement>) => {
        const s = st.current; if (!s || s.id !== id) return
        if (s.activo) {
          e.preventDefault() // que no se abra la tarjeta al soltarla
          soltoEn.current = Date.now()
          const d = s.destino
          terminar()
          if (d) alSoltar.current(id, d)
        } else terminar()
      },
      onTouchCancel: () => terminar(),
      onContextMenu: (e: React.MouseEvent) => { if (st.current) e.preventDefault() },
    }
  }

  // la tarjeta "levantada" que sigue al dedo
  const fantasma = arr ? (
    <div aria-hidden="true" style={{ position: 'fixed', left: Math.max(6, Math.min(arr.x - 40, window.innerWidth - arr.w - 6)), top: arr.y - 66, /* arriba del dedo, así se ve dónde se suelta */ width: arr.w, zIndex: 400, pointerEvents: 'none',
      background: 'var(--al-tarjeta)', border: '1.5px solid var(--al-acento)', borderRadius: 14, padding: '10px 12px', boxShadow: '0 18px 40px rgba(39,52,74,.3)',
      font: '800 13.5px Nunito,sans-serif', color: 'var(--al-texto)', rotate: '-2deg', scale: '1.03' }}>
      {arr.titulo || 'Sin título'}
    </div>
  ) : null

  const recienSolto = () => Date.now() - soltoEn.current < 600
  return { props, arrastrando: arr?.id || null, sobre, fantasma, recienSolto }
}
