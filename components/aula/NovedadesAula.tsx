'use client'

import LunaProgreso from './LunaProgreso'

// Cambiando esta fecha, el aviso le vuelve a aparecer una vez a cada alumna (para futuras novedades).
export const FECHA_NOVEDADES = '2026-10-20T00:00:00Z'

export default function NovedadesAula({ onCerrar }: { onCerrar: () => void }) {
  const items = [
    ['🌙', 'Tu luna', 'Crece con cada lección hasta quedar llena cuando terminás.'],
    ['📓', 'Tu cuaderno', 'Anotá, resaltá, marcá momentos del video y bajalo en PDF. Solo lo ves vos.'],
    ['⭐', 'Favoritos', 'Guardá las lecciones que querés repasar.'],
    ['▶', 'Retomá donde dejaste', 'Un toque y seguís en el minuto exacto.'],
  ]
  return (
    <div onClick={onCerrar} role="dialog" aria-modal="true" aria-label="Tu aula se renovó"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(20,15,36,.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: "'Geist',sans-serif" }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '340px', maxHeight: '100%', overflowY: 'auto', background: '#140F24', border: '1px solid rgba(201,168,76,.4)', borderRadius: '22px', padding: '24px 22px', color: '#F4EFE6', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}><LunaProgreso p={1} tamano={70}/></div>
        <div style={{ fontFamily: "'Avigea','Cormorant Garamond',serif", fontSize: '30px', margin: '10px 0 4px' }}>Tu aula se renovó</div>
        <div style={{ fontSize: '13px', color: '#B7A9D9', marginBottom: '16px' }}>Cosas nuevas para que aprender sea más lindo ✨</div>
        {items.map(([ic, t, d]) => (
          <div key={t} style={{ display: 'flex', gap: '12px', textAlign: 'left', padding: '10px 0', borderTop: '1px solid rgba(244,239,230,.08)' }}>
            <div style={{ fontSize: '20px', width: '30px', flexShrink: 0, textAlign: 'center' }}>{ic}</div>
            <div><b style={{ display: 'block', fontSize: '13.5px', color: '#fff' }}>{t}</b><span style={{ fontSize: '12px', color: '#B7A9D9', lineHeight: 1.45 }}>{d}</span></div>
          </div>
        ))}
        <button onClick={onCerrar}
          style={{ width: '100%', background: '#C9A84C', color: '#1A1230', fontWeight: 700, fontSize: '14px', padding: '12px', borderRadius: '12px', marginTop: '14px', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          ¡Quiero verlo!
        </button>
      </div>
    </div>
  )
}
