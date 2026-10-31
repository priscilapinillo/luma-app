// Stickers holísticos del Altar: línea redondeada, sin relleno. Los 6 primeros vienen con Básico; con Premium, todos.
// Más los stickers de Canva de Priscila (lib/stickersCanva.ts): con sus colores, o pasados al color que se elija.
import { STICKERS_CANVA, svgConColor } from '@/lib/stickersCanva'

export const STICKERS: { id: string; nombre: string; basico: boolean; canva?: boolean; recolor?: boolean }[] = [
  { id: 'luna', nombre: 'Luna', basico: true },
  { id: 'estrella', nombre: 'Estrella', basico: true },
  { id: 'sol', nombre: 'Sol', basico: true },
  { id: 'corazon', nombre: 'Corazón', basico: true },
  { id: 'vela', nombre: 'Vela', basico: true },
  { id: 'cristal', nombre: 'Cristal', basico: true },
  { id: 'ojo', nombre: 'Ojo turco', basico: false },
  { id: 'carta', nombre: 'Carta', basico: false },
  { id: 'mano', nombre: 'Mano', basico: false },
  { id: 'planta', nombre: 'Planta', basico: false },
  ...STICKERS_CANVA.map(s => ({ id: s.id, nombre: s.nombre, basico: false, canva: true, recolor: !!s.svg })),
]
export const esStickerCanva = (id?: string) => STICKERS_CANVA.some(s => s.id === id)
export const stickerSeRecolorea = (id?: string) => !!STICKERS_CANVA.find(s => s.id === id)?.svg

export function Sticker({ id, color = '#626B91', size = 64 }: { id?: string; color?: string; size?: number }) {
  const canva = STICKERS_CANVA.find(s => s.id === id)
  if (canva) {
    if (canva.img) return <img src={canva.img} alt="" aria-hidden="true" draggable={false} style={{ width: size, height: size, objectFit: 'contain', pointerEvents: 'none' }}/>
    // el dibujo viene de un archivo nuestro (no lo escribe nadie de afuera)
    return <svg width={size} height={size} viewBox={canva.viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svgConColor(canva, color) }}/>
  }
  const p = { fill: 'none', stroke: color, strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  let d: React.ReactNode
  switch (id) {
    case 'luna': d = <path {...p} d="M38 10a22 22 0 1 0 16 34 18 18 0 1 1-16-34z"/>; break
    case 'estrella': d = <path {...p} d="M32 8l6.5 15.5L54 26l-12 10.5L45.5 53 32 44.5 18.5 53 22 36.5 10 26l15.5-2.5z"/>; break
    case 'sol': d = <g {...p}><circle cx="32" cy="32" r="11"/><path d="M32 8v7M32 49v7M8 32h7M49 32h7M15 15l5 5M44 44l5 5M15 49l5-5M44 20l5-5"/></g>; break
    case 'corazon': d = <path {...p} d="M32 52S10 39 10 24a11 11 0 0 1 22-3 11 11 0 0 1 22 3c0 15-22 28-22 28z"/>; break
    case 'vela': d = <g {...p}><path d="M24 28h16v26H24z"/><path d="M32 10c4 5 5 8 5 10a5 5 0 0 1-10 0c0-2 1-5 5-10z"/><path d="M20 54h24"/></g>; break
    case 'cristal': d = <g {...p}><path d="M32 6l12 14-12 38L20 20z"/><path d="M20 20h24M32 6v52"/></g>; break
    case 'ojo': d = <g {...p}><path d="M6 32s10-14 26-14 26 14 26 14-10 14-26 14S6 32 6 32z"/><circle cx="32" cy="32" r="8"/><circle cx="32" cy="32" r="2.5"/></g>; break
    case 'carta': d = <g {...p}><rect x="16" y="8" width="32" height="48" rx="5"/><path d="M32 22l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/></g>; break
    case 'mano': d = <g {...p}><path d="M22 34V16a3 3 0 0 1 6 0v14M28 28V12a3 3 0 0 1 6 0v18M34 30V14a3 3 0 0 1 6 0v18M40 32v-8a3 3 0 0 1 6 0v12c0 10-6 18-15 18-6 0-10-3-13-8l-6-10a3 3 0 0 1 5-3l5 5"/></g>; break
    case 'planta': d = <g {...p}><path d="M32 56V26"/><path d="M32 34c-12 0-18-8-18-18 10 0 18 6 18 18zM32 28c0-10 6-18 18-18 0 12-8 18-18 18z"/><path d="M22 56h20"/></g>; break
    default: d = <circle {...p} cx="32" cy="32" r="20"/>
  }
  return <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">{d}</svg>
}
