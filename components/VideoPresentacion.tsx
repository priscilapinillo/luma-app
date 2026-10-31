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
        .vp-section{position:relative;padding:100px 6%;background:radial-gradient(700px 420px at 50% 0%,rgba(98,107,145,0.55),transparent 70%),linear-gradient(160deg,#27344A,#1F2A3D);overflow:hidden;text-align:center;border-radius:48px;margin:0 16px}
        .vp-kicker{font-family:'Inter',sans-serif;font-size:12px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:#C9C0D9;margin-bottom:14px}
        .vp-title{font-family:'Avigea','Cormorant Garamond',serif;font-size:clamp(44px,6vw,76px);font-weight:400;line-height:.9;letter-spacing:-.025em;color:#F0E6D8;margin-bottom:14px}
        .vp-sub{font-family:'Inter',sans-serif;font-size:16px;color:#D9D1E4;margin-bottom:40px}
        .vp-marco{position:relative;max-width:880px;margin:0 auto;border-radius:22px;padding:2px;overflow:hidden;isolation:isolate;box-shadow:0 30px 80px rgba(0,0,0,0.4)}
        .vp-marco::before{content:'';position:absolute;z-index:-1;left:50%;top:50%;width:200%;aspect-ratio:1;transform:translate(-50%,-50%);
          background:conic-gradient(from 0deg,transparent 0deg,rgba(214,166,165,0.35) 40deg,#F0E6D8 80deg,rgba(214,166,165,0.35) 120deg,transparent 160deg,transparent 200deg,rgba(169,155,184,0.4) 240deg,#DCD3E6 275deg,rgba(169,155,184,0.4) 310deg,transparent 360deg);
          animation:vpGira 8s linear infinite}
        @keyframes vpGira{to{transform:translate(-50%,-50%) rotate(360deg)}}
        @media (prefers-reduced-motion:reduce){.vp-marco::before{animation:none}}
        @media(max-width:640px){.vp-section{margin:0 10px;border-radius:32px;padding:70px 5%}}
        .vp-video{position:relative;padding-bottom:56.25%;height:0;border-radius:20px;overflow:hidden;background:#000}
        .vp-video iframe,.vp-portada{position:absolute;inset:0;width:100%;height:100%;border:none}
        .vp-portada{cursor:pointer;background-size:cover;background-position:center;display:flex;align-items:center;justify-content:center;padding:0}
        .vp-play{width:78px;height:78px;border-radius:50%;background:rgba(255,255,255,0.92);display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(0,0,0,0.4);transition:transform .2s}
        .vp-portada:hover .vp-play{transform:scale(1.08)}
      `}</style>
      <div className="vp-kicker">Antes de elegir</div>
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
                <svg width="30" height="30" viewBox="0 0 24 24" fill="#27344A" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  )
}