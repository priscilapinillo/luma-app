'use client'

import { useId } from 'react'

// La luna del aula: crece de nueva a llena con las lecciones completadas.
// p = avance de 0 a 1. apagada = sin acceso (vencido o pago pendiente).
export default function LunaProgreso({ p, tamano = 56, apagada = false, titulo }: {
  p: number; tamano?: number; apagada?: boolean; titulo?: string
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const av = Math.max(0, Math.min(1, Number.isFinite(p) ? p : 0))
  const oscuro = '#2A2245'
  const sup = `sup${uid}`, glow = `glow${uid}`, mc = `m${uid}`, hc = `h${uid}`, cr = `c${uid}`
  const llena = av >= 0.999
  const nueva = av <= 0.001
  const rx = Math.abs(1 - 2 * av) * 40

  return (
    <svg width={tamano} height={tamano} viewBox="-5 -5 110 110" role="img"
      aria-label={titulo || (llena ? 'Luna llena: curso terminado' : `Luna al ${Math.round(av * 100)}%`)}
      style={{ display: 'block', flexShrink: 0, opacity: apagada ? 0.45 : 1, filter: apagada ? 'grayscale(.5)' : undefined }}>
      <defs>
        <radialGradient id={sup} cx="40%" cy="38%" r="70%">
          <stop offset="0" stopColor="#FFFBF0"/><stop offset=".65" stopColor="#F1E9D6"/><stop offset="1" stopColor="#D9CCAE"/>
        </radialGradient>
        <radialGradient id={glow} cx="50%" cy="50%" r="50%">
          <stop offset=".55" stopColor="#F7E7B4" stopOpacity=".55"/><stop offset="1" stopColor="#F7E7B4" stopOpacity="0"/>
        </radialGradient>
        <clipPath id={mc}><circle cx="50" cy="50" r="40"/></clipPath>
        <clipPath id={hc}>
          <rect x="50" y="0" width="50" height="100"/>
          {av > 0.5 && !llena && <ellipse cx="50" cy="50" rx={rx} ry="40"/>}
        </clipPath>
        <g id={cr}>
          <circle cx="38" cy="34" r="7" fill="#DCCFB2"/><circle cx="37" cy="33" r="5.5" fill="#E6DAC0"/>
          <circle cx="62" cy="58" r="10" fill="#DCCFB2"/><circle cx="61" cy="56.5" r="8" fill="#E8DDC4"/>
          <circle cx="45" cy="66" r="4" fill="#DCCFB2"/><circle cx="66" cy="36" r="3.5" fill="#DCCFB2"/>
          <circle cx="30" cy="52" r="3" fill="#DCCFB2"/><circle cx="54" cy="44" r="2.5" fill="#E1D5BA"/>
        </g>
      </defs>
      {!nueva && !apagada && <circle cx="50" cy="50" r={44 + 11 * av} fill={`url(#${glow})`}/>}
      <g clipPath={`url(#${mc})`}>
        <rect x="0" y="0" width="100" height="100" fill={oscuro}/>
        {llena ? (<>
          <circle cx="50" cy="50" r="40" fill={`url(#${sup})`}/>
          <use href={`#${cr}`}/>
        </>) : !nueva && (av <= 0.5 ? (<>
          <rect x="50" y="0" width="50" height="100" fill={`url(#${sup})`}/>
          <g clipPath={`url(#${hc})`}><use href={`#${cr}`}/></g>
          <ellipse cx="50" cy="50" rx={rx} ry="40" fill={oscuro}/>
        </>) : (<>
          <rect x="50" y="0" width="50" height="100" fill={`url(#${sup})`}/>
          <ellipse cx="50" cy="50" rx={rx} ry="40" fill={`url(#${sup})`}/>
          <g clipPath={`url(#${hc})`}><use href={`#${cr}`}/></g>
        </>))}
      </g>
      <circle cx="50" cy="50" r="40" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeOpacity={nueva ? 0.7 : 1}/>
      {llena && !apagada && (<>
        <text x="84" y="20" fontSize="12" fill="#C9A84C">✦</text>
        <text x="10" y="86" fontSize="9" fill="#C9A84C">✦</text>
      </>)}
    </svg>
  )
}
