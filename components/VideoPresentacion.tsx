'use client'

import { useState } from 'react'
import { detectarContenido } from '@/lib/contenido'

// ─── Pegá acá el link del video cuando lo tengas (YouTube, Vimeo, Loom o Drive). ───
// Mientras esté vacío, la sección NO aparece en la landing.
const VIDEO_PRESENTACION_URL = 'https://youtu.be/C7NGGfjjWjM'

export default function VideoPresentacion() {
  const [reproduciendo, setReproduciendo] = useState(false)
  const c = detectarContenido(VIDEO_PRESENTACION_URL, 'video')
  if (!c || c.visor === 'link') return null

  // portada de YouTube para no cargar el reproductor hasta que toquen play (la landing carga más rápido)
  const ytId = c.visor === 'youtube' ? c.embedUrl.match(/embed\/([a-zA-Z0-9_-]{11})/)?.[1] : null
  const portada = ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : null
  const src = c.embedUrl + (c.embedUrl.includes('?') ? '&' : '?') + 'autoplay=1&rel=0'

  return (
    <section className="vp-section">
      <style>{`
        .vp-section{position:relative;padding:100px 6%;background:linear-gradient(180deg,#1E1B2E 0%,#0D0B14 100%);overflow:hidden;text-align:center}
        .vp-kicker{font-family:'Montserrat',sans-serif;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;margin-bottom:12px}
        .vp-title{font-family:'Cormorant Garamond',serif;font-size:clamp(32px,4.5vw,52px);font-weight:600;color:#F9F6F0;margin-bottom:10px}
        .vp-sub{font-family:'Montserrat',sans-serif;font-size:15px;color:#C9BFE0;margin-bottom:40px}
        .vp-marco{position:relative;max-width:880px;margin:0 auto;border-radius:22px;padding:2px;overflow:hidden;isolation:isolate;box-shadow:0 30px 80px rgba(107,63,160,0.4)}
        .vp-marco::before{content:'';position:absolute;z-index:-1;left:50%;top:50%;width:200%;aspect-ratio:1;transform:translate(-50%,-50%);
          background:conic-gradient(from 0deg,transparent 0deg,rgba(201,168,76,0.3) 40deg,#E8D5A3 80deg,rgba(201,168,76,0.3) 120deg,transparent 160deg,transparent 200deg,rgba(139,92,246,0.35) 240deg,#C4B5FD 275deg,rgba(139,92,246,0.35) 310deg,transparent 360deg);
          animation:vpGira 8s linear infinite}
        @keyframes vpGira{to{transform:translate(-50%,-50%) rotate(360deg)}}
        @media (prefers-reduced-motion:reduce){.vp-marco::before{animation:none}}
        .vp-video{position:relative;padding-bottom:56.25%;height:0;border-radius:20px;overflow:hidden;background:#000}
        .vp-video iframe,.vp-portada{position:absolute;inset:0;width:100%;height:100%;border:none}
        .vp-portada{cursor:pointer;background-size:cover;background-position:center;display:flex;align-items:center;justify-content:center;padding:0}
        .vp-play{width:78px;height:78px;border-radius:50%;background:rgba(255,255,255,0.92);display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(0,0,0,0.4);transition:transform .2s}
        .vp-portada:hover .vp-play{transform:scale(1.08)}
      `}</style>
      <div className="vp-kicker">✦ Antes de elegir ✦</div>
      <h2 className="vp-title">¿Luma es para vos?</h2>
      <p className="vp-sub">En un par de minutos te muestro cómo es trabajar con Luma.</p>
      <div className="vp-marco">
        <div className="vp-video">
          {reproduciendo || !portada ? (
            <iframe src={reproduciendo ? src : c.embedUrl} title="Presentación de Luma"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin" allowFullScreen loading="lazy"/>
          ) : (
            <button className="vp-portada" style={{backgroundImage:`url(${portada})`}} onClick={() => setReproduciendo(true)} aria-label="Reproducir video de presentación">
              <span className="vp-play">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="#6B3FA0" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  )
}