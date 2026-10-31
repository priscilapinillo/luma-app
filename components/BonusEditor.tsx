'use client'
// "Bonus de regalo" para la página de venta (cursos y descargables). Hasta 6.
// El contenido del bonus va donde corresponde (en un curso, un módulo "BONUS"; en un descargable, un archivo marcado
// como bonus): esto es solo la vidriera que se ve en la página.
import { Plus, X, ChevronUp, ChevronDown } from 'lucide-react'

export type Bonus = { nombre: string; detalle: string; tipo: string; valor: number | null }
export const TIPOS_BONUS: { valor: string; texto: string }[] = [
  { valor: 'audio', texto: 'Audio' },
  { valor: 'pdf', texto: 'PDF o guía' },
  { valor: 'video', texto: 'Video' },
  { valor: 'vivo', texto: 'Encuentro en vivo' },
  { valor: 'comunidad', texto: 'Comunidad o grupo' },
  { valor: 'otro', texto: 'Otro' },
]
export const MAX_BONUS = 6

// lo que se guarda: sin bonus vacíos, con los largos y valores cuidados
export function limpiarBonus(lista: Bonus[] | null | undefined): Bonus[] {
  return (Array.isArray(lista) ? lista : [])
    .map(b => ({
      nombre: String(b?.nombre || '').trim().slice(0, 60),
      detalle: String(b?.detalle || '').trim().slice(0, 120),
      tipo: TIPOS_BONUS.some(t => t.valor === b?.tipo) ? b.tipo : 'otro',
      valor: Number(b?.valor) > 0 ? Math.round(Number(b.valor)) : null,
    }))
    .filter(b => b.nombre)
    .slice(0, MAX_BONUS)
}

export default function BonusEditor({ value, onChange, desactivado }: { value: Bonus[]; onChange: (v: Bonus[]) => void; desactivado?: boolean }) {
  const lista = Array.isArray(value) ? value : []
  const cambiar = (i: number, campo: keyof Bonus, v: any) => onChange(lista.map((b, j) => j === i ? { ...b, [campo]: v } : b))
  const mover = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= lista.length) return
    const n = [...lista]; [n[i], n[j]] = [n[j], n[i]]; onChange(n)
  }
  return (
    <div>
      <style>{`
        .bonus-card{border:0.5px solid var(--border);border-radius:12px;padding:12px;margin-bottom:8px;background:var(--bg-input)}
        .bonus-fila{display:flex;gap:8px;align-items:center}
        .bonus-card input,.bonus-card select{padding:8px 10px;border-radius:8px;border:0.5px solid var(--border);font-size:12.5px;font-family:inherit;color:var(--text-primary);background:var(--bg-card);outline:none;min-width:0}
        .bonus-mini{width:28px;height:28px;border-radius:7px;border:0.5px solid var(--border);background:var(--bg-card);color:var(--text-muted);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
        .bonus-mini:disabled{opacity:.35;cursor:default}
        .bonus-cuenta{font-size:10.5px;color:var(--text-muted);text-align:right;margin-top:3px}
      `}</style>
      {lista.map((b, i) => {
        const sinNombre = !String(b.nombre || '').trim() && (String(b.detalle || '').trim() || b.valor)
        return (
          <div key={i} className="bonus-card">
            <div className="bonus-fila">
              <input style={{ flex: 1 }} value={b.nombre} maxLength={60} placeholder="Nombre · Ej: Meditación de luna nueva" disabled={desactivado}
                onChange={e => cambiar(i, 'nombre', e.target.value)} aria-label="Nombre del bonus"/>
              <button type="button" className="bonus-mini" onClick={() => mover(i, -1)} disabled={i === 0 || desactivado} aria-label="Subir"><ChevronUp size={13}/></button>
              <button type="button" className="bonus-mini" onClick={() => mover(i, 1)} disabled={i === lista.length - 1 || desactivado} aria-label="Bajar"><ChevronDown size={13}/></button>
              <button type="button" className="bonus-mini" onClick={() => onChange(lista.filter((_, j) => j !== i))} disabled={desactivado} aria-label="Quitar bonus" style={{ color: '#EF4444' }}><X size={13}/></button>
            </div>
            {sinNombre && <div style={{ fontSize: '11px', color: '#B45309', marginTop: '4px' }}>Ponele un nombre al bonus: sin nombre no se muestra.</div>}
            <input style={{ width: '100%', marginTop: '8px' }} value={b.detalle} maxLength={120} placeholder="Qué es, en una línea · Ej: Audio de 20 minutos para tu primer ritual" disabled={desactivado}
              onChange={e => cambiar(i, 'detalle', e.target.value)} aria-label="Detalle del bonus"/>
            <div className="bonus-cuenta">{String(b.detalle || '').length}/120</div>
            <div className="bonus-fila" style={{ marginTop: '4px' }}>
              <select value={b.tipo || 'otro'} onChange={e => cambiar(i, 'tipo', e.target.value)} disabled={desactivado} style={{ flex: 1 }} aria-label="Tipo de bonus">
                {TIPOS_BONUS.map(t => <option key={t.valor} value={t.valor}>{t.texto}</option>)}
              </select>
              <input style={{ width: '130px' }} inputMode="numeric" placeholder="Valor $ (opcional)" disabled={desactivado}
                value={b.valor ?? ''} onChange={e => { const t = e.target.value.replace(/[^\d]/g, ''); cambiar(i, 'valor', t ? Number(t) : null) }} aria-label="Valor en pesos"/>
            </div>
          </div>
        )
      })}
      {lista.length < MAX_BONUS ? (
        <button type="button" className="btn-add" disabled={desactivado}
          onClick={() => onChange([...lista, { nombre: '', detalle: '', tipo: 'otro', valor: null }])}>
          <Plus size={11}/>Agregar bonus
        </button>
      ) : <div className="field-hint">Llegaste a {MAX_BONUS} bonus, el máximo, para que la página no quede eterna.</div>}
    </div>
  )
}
