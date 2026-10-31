'use client'
// Vista lista de la pizarra libre: todo lo que hay, para leer rápido en el celu o encontrar algo. Tocar una pieza la muestra en la pizarra.
import { StickyNote, Square, ListChecks, Type, Link2, Columns3, Sparkles, ChevronRight } from 'lucide-react'
import { cristal, type DatosLibre, type Pieza } from '@/lib/altar'

const ICONO: Record<string, any> = { nota: StickyNote, carta: Square, lista: ListChecks, titulo: Type, link: Link2, columna: Columns3, sticker: Sparkles }
const NOMBRE: Record<string, string> = { nota: 'Nota', carta: 'Carta', lista: 'Lista', titulo: 'Título', link: 'Link', columna: 'Columna', sticker: 'Sticker' }

function resumen(p: Pieza) {
  if (p.tipo === 'lista') {
    const it = p.items || []
    return `${p.titulo || 'Lista'} · ${it.filter(i => i.ok).length} de ${it.length}`
  }
  if (p.tipo === 'link') return p.titulo || p.url || ''
  if (p.tipo === 'carta') return [p.titulo, p.texto].filter(Boolean).join(' — ')
  if (p.tipo === 'columna') return p.titulo || 'Columna'
  if (p.tipo === 'sticker') return p.sticker || ''
  return p.texto || ''
}

export default function VistaLista({ datos, onIr }: { datos: DatosLibre; onIr: (id: string) => void }) {
  const todas = Array.isArray(datos.piezas) ? datos.piezas : []
  const ids = new Set(todas.map(p => p.id))
  const piezas = todas.filter(p => p.tipo !== 'sticker')
  // de arriba a abajo y de izquierda a derecha, como se lee la pizarra; lo que está adentro de algo va debajo, corrido
  const sueltas = piezas.filter(p => !p.padre || !ids.has(p.padre)).sort((a, b) => Math.round(a.y / 80) - Math.round(b.y / 80) || a.x - b.x)
  const orden: (Pieza & { nivel: number })[] = []
  const sumar = (p: Pieza, nivel: number) => { orden.push({ ...p, nivel }); if (nivel < 3) for (const h of piezas.filter(q => q.padre === p.id)) sumar(h, nivel + 1) }
  sueltas.forEach(p => sumar(p, 0))
  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '16px 16px 120px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {orden.length === 0 && <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--al-texto2)', fontWeight: 700 }}>Todavía no hay nada en esta pizarra.</div>}
        {orden.map(p => {
          const Ico = ICONO[p.tipo] || StickyNote
          const c = p.tipo === 'nota' ? cristal(p.color) : null
          const texto = resumen(p)
          return (
            <button key={p.id} onClick={() => onIr(p.id)}
              style={{ marginLeft: p.nivel * 22, display: 'flex', gap: 12, alignItems: 'center', textAlign: 'left', padding: '12px 14px', borderRadius: 16, border: `1px solid ${c?.borde || 'var(--al-borde)'}`, background: c?.fondo || 'var(--al-tarjeta)', color: c?.texto || 'var(--al-texto)', cursor: 'pointer', font: 'inherit' }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--al-acento)' }}><Ico size={17}/></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 10.5, fontWeight: 900, letterSpacing: '.12em', opacity: .6 }}>{NOMBRE[p.tipo].toUpperCase()}</span>
                <span className={p.tipo === 'titulo' ? 'al-f' : undefined} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontWeight: 700, fontSize: p.tipo === 'titulo' ? 18 : 14.5, whiteSpace: 'pre-wrap' }}>{texto || <span style={{ opacity: .5 }}>(vacía)</span>}</span>
              </span>
              <ChevronRight size={16} style={{ opacity: .5, flexShrink: 0 }}/>
            </button>
          )
        })}
      </div>
    </div>
  )
}
