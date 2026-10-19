'use client'

import { useEffect } from 'react'
import LunaProgreso from './LunaProgreso'

export type TipoCelebracion = 'leccion' | 'modulo' | 'curso'

// Cartel de festejo al completar una lección, un módulo o el curso.
// Con "reducir movimiento" activado en el celular, se muestra sin animaciones.
export default function Celebracion({ tipo, avance, titulo, haySiguiente, onSiguiente, onCerrar, onCompartir }: {
  tipo: TipoCelebracion
  avance: number
  titulo?: string
  haySiguiente: boolean
  onSiguiente: () => void
  onCerrar: () => void
  onCompartir?: () => void
}) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [onCerrar])

  const grande = tipo !== 'leccion'
  const textos = {
    leccion: { tag: 'Lección completada', t: 'Una lección más cerca de vos ✨' },
    modulo: { tag: 'Módulo completado', t: titulo ? `Terminaste "${titulo}" 🌙` : 'Terminaste este módulo 🌙' },
    curso: { tag: '¡Curso terminado!', t: 'Tu luna está llena. Lo lograste ✨' },
  }[tipo]

  return (
    <div className="cel-velo" role="dialog" aria-modal="true" aria-label={textos.tag} onClick={onCerrar}>
      <style>{`
        .cel-velo{position:fixed;inset:0;z-index:1000;background:rgba(20,15,36,.78);display:flex;align-items:center;justify-content:center;padding:20px;animation:celFade .25s ease}
        .cel-card{position:relative;width:100%;max-width:${grande ? 380 : 330}px;background:radial-gradient(circle at 50% 20%,#2A1B4D,#140F24 70%);border:1px solid rgba(201,168,76,.4);border-radius:24px;padding:${grande ? '34px 24px 24px' : '28px 22px 22px'};text-align:center;color:#F4EFE6;font-family:'Geist',sans-serif;animation:celSube .35s cubic-bezier(.2,.9,.3,1.2);overflow:hidden}
        .cel-luna{display:flex;justify-content:center;margin-bottom:14px;animation:celLuna 2.4s ease-in-out infinite}
        .cel-tag{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;font-weight:700;margin-bottom:8px}
        .cel-t{font-family:'Avigea','Cormorant Garamond',serif;font-size:${grande ? 30 : 25}px;line-height:1.2;margin-bottom:20px}
        .cel-btn{display:block;width:100%;padding:13px;border-radius:12px;border:none;background:#C9A84C;color:#1A1230;font-weight:800;font-size:14px;cursor:pointer;font-family:inherit;margin-bottom:8px}
        .cel-btn2{display:block;width:100%;padding:11px;border-radius:12px;border:1px solid rgba(244,239,230,.18);background:transparent;color:#E4DAF8;font-weight:600;font-size:13px;cursor:pointer;font-family:inherit}
        .cel-estrella{position:absolute;color:#C9A84C;pointer-events:none;animation:celBrillo 2s ease-in-out infinite}
        @keyframes celFade{from{opacity:0}to{opacity:1}}
        @keyframes celSube{from{opacity:0;transform:translateY(24px) scale(.96)}to{opacity:1;transform:none}}
        @keyframes celLuna{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes celBrillo{0%,100%{opacity:.2;transform:scale(.7)}50%{opacity:1;transform:scale(1.1)}}
        @media (prefers-reduced-motion: reduce){
          .cel-velo,.cel-card,.cel-luna,.cel-estrella{animation:none !important}
          .cel-estrella{opacity:.7}
        }
      `}</style>
      <div className="cel-card" onClick={e => e.stopPropagation()}>
        {[[12, 18, 14, 0], [82, 12, 18, .4], [8, 70, 12, .8], [88, 62, 15, 1.2], ...(grande ? [[50, 6, 12, .6], [24, 40, 10, 1.4], [74, 38, 11, .2]] : [])].map(([x, y, tam, d], i) => (
          <span key={i} className="cel-estrella" style={{ left: `${x}%`, top: `${y}%`, fontSize: `${tam}px`, animationDelay: `${d}s` }}>✦</span>
        ))}
        <div className="cel-luna"><LunaProgreso p={tipo === 'curso' ? 1 : avance} tamano={grande ? 120 : 92}/></div>
        <div className="cel-tag">{textos.tag}</div>
        <div className="cel-t">{textos.t}</div>
        {tipo === 'curso' && onCompartir && (
          <button className="cel-btn" onClick={onCompartir}>✦ Compartir mi logro</button>
        )}
        {haySiguiente && tipo !== 'curso' && (
          <button className="cel-btn" onClick={onSiguiente}>Siguiente lección →</button>
        )}
        <button className="cel-btn2" onClick={onCerrar}>Quedarme acá</button>
      </div>
    </div>
  )
}
