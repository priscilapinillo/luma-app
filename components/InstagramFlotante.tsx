'use client'

import { useEffect, useRef, useState } from 'react'
import type React from 'react'

const IG_USUARIO = 'luma.webapp'
const IG_URL = `https://www.instagram.com/${IG_USUARIO}/`

// Botón flotante de Instagram (basado en el diseño de Uiverse by mRcOol7, adaptado a Luma).
// Compu: al pasar el mouse se despliega; un clic abre Instagram.
// Celular: el primer toque lo despliega, el segundo (o "Abrir Instagram") te lleva al perfil.
export default function InstagramFlotante() {
  const [visible, setVisible] = useState(false)
  const [abierto, setAbierto] = useState(false)
  const [esTactil, setEsTactil] = useState(false)
  const cajaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setEsTactil(window.matchMedia('(hover: none)').matches)
    // aparece después de bajar un poco, para no competir con el título principal
    const alScrollear = () => setVisible(window.scrollY > 240)
    alScrollear()
    window.addEventListener('scroll', alScrollear, { passive: true })
    return () => window.removeEventListener('scroll', alScrollear)
  }, [])

  // tocar afuera lo cierra
  useEffect(() => {
    if (!abierto) return
    function afuera(e: Event) {
      if (cajaRef.current && !cajaRef.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('pointerdown', afuera)
    return () => document.removeEventListener('pointerdown', afuera)
  }, [abierto])

  function alTocarIcono(e: React.MouseEvent<HTMLAnchorElement>) {
    // en celular, el primer toque solo despliega
    if (esTactil && !abierto) {
      e.preventDefault()
      setAbierto(true)
    }
  }

  return (
    <div ref={cajaRef}
      className={`ig-flot${visible ? ' ig-visible' : ''}${abierto ? ' ig-abierto' : ''}`}
      onMouseEnter={() => { if (!esTactil) setAbierto(true) }}
      onMouseLeave={() => { if (!esTactil) setAbierto(false) }}>
      <style>{`
        .ig-flot{position:fixed;right:22px;bottom:calc(22px + env(safe-area-inset-bottom));z-index:300;font-family:'Inter',system-ui,sans-serif;
          opacity:0;transform:translateY(16px) scale(.9);pointer-events:none;transition:opacity .35s ease,transform .35s ease}
        .ig-flot.ig-visible{opacity:1;transform:none;pointer-events:auto}

        /* cartelito "Seguinos" */
        .ig-cartel{position:absolute;right:66px;bottom:14px;white-space:nowrap;padding:7px 12px;border-radius:20px;font-size:12px;font-weight:700;color:#fff;
          background:linear-gradient(90deg,#962fbf,#d62976,#fa7e1e);box-shadow:0 6px 18px rgba(214,41,118,.35);
          animation:igRebote 2.6s ease-in-out infinite;transition:opacity .25s, transform .25s}
        .ig-cartel::after{content:'';position:absolute;right:-5px;top:50%;width:10px;height:10px;background:#fa7e1e;transform:translateY(-50%) rotate(45deg);border-radius:2px}
        @keyframes igRebote{0%,100%{transform:translateX(0)}50%{transform:translateX(-4px)}}
        .ig-abierto .ig-cartel{opacity:0;transform:translateX(8px);pointer-events:none}

        /* tarjetita de perfil */
        .ig-tip{position:absolute;right:-6px;bottom:20px;width:236px;padding:10px;border-radius:16px;opacity:0;pointer-events:none;transition:all .3s ease;
          box-shadow:inset 5px 5px 5px rgba(0,0,0,.18),inset -5px -5px 15px rgba(255,255,255,.08),5px 5px 15px rgba(0,0,0,.3),-5px -5px 15px rgba(255,255,255,.06)}
        .ig-abierto .ig-tip{bottom:84px;opacity:1;pointer-events:auto}
        .ig-perfil{border-radius:12px 16px;padding:12px;border:1px solid rgba(255,255,255,.18);
          background:linear-gradient(135deg,#4f5bd5 0%,#962fbf 35%,#d62976 70%,#fa7e1e 100%)}
        .ig-user{display:flex;gap:10px;align-items:center}
        .ig-avatar{width:46px;height:46px;border-radius:12px;background:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;
          font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700;color:#962fbf}
        .ig-nombre{font-size:15px;font-weight:800;color:#fff;line-height:1.2}
        .ig-usuario{font-size:12px;color:rgba(255,255,255,.85)}
        .ig-about{font-size:12px;color:rgba(255,255,255,.92);padding-top:8px;line-height:1.45}
        .ig-ir{display:block;margin-top:10px;text-align:center;padding:9px;border-radius:10px;background:#fff;color:#962fbf;font-size:13px;font-weight:800;text-decoration:none}

        /* ícono con capas (se despliegan en diagonal) */
        .ig-icono{display:block;position:relative;text-decoration:none;-webkit-tap-highlight-color:transparent}
        .ig-capas{position:relative;width:56px;height:56px;border-radius:50%;border:3px solid #d62976;transition:transform .3s,box-shadow .3s;
          box-shadow:0 0 15px rgba(214,41,118,.6),0 0 22px rgba(150,47,191,.45);background:#fff}
        .ig-abierto .ig-capas{transform:rotate(-35deg) skew(20deg);box-shadow:0 0 30px rgba(214,41,118,.9),0 0 40px rgba(150,47,191,.6)}
        .ig-capas span{position:absolute;inset:0;border-radius:50%;border:1px solid #d62976;transition:all .3s}
        .ig-abierto .ig-capas span{box-shadow:-1px 1px 3px #d62976}
        .ig-abierto .ig-capas span:nth-child(1){opacity:.2}
        .ig-abierto .ig-capas span:nth-child(2){opacity:.4;transform:translate(5px,-5px)}
        .ig-abierto .ig-capas span:nth-child(3){opacity:.6;transform:translate(10px,-10px)}
        .ig-abierto .ig-capas span:nth-child(4){opacity:.8;transform:translate(15px,-15px)}
        .ig-abierto .ig-capas span:nth-child(5){opacity:1;transform:translate(20px,-20px)}
        .ig-svg{display:flex;align-items:center;justify-content:center;
          background:radial-gradient(circle at 30% 107%,#fdf497 0%,#fdf497 5%,#fd5949 45%,#d6249f 60%,#285AEB 90%)}
        .ig-svg svg{width:26px;height:26px}
        .ig-texto{position:absolute;left:50%;bottom:-4px;transform:translateX(-50%);opacity:0;font-size:12px;font-weight:700;color:#d62976;white-space:nowrap;transition:bottom .3s,opacity .3s}
        .ig-abierto .ig-texto{bottom:-24px;opacity:1}

        @media(max-width:640px){
          .ig-flot{right:14px;bottom:calc(16px + env(safe-area-inset-bottom))}
          .ig-capas{width:50px;height:50px}
          .ig-cartel{right:60px;bottom:12px;font-size:11px}
          .ig-tip{width:220px}
          .ig-abierto .ig-tip{bottom:76px}
        }
        @media (prefers-reduced-motion:reduce){.ig-cartel{animation:none}.ig-capas,.ig-capas span,.ig-tip{transition:none}}
      `}</style>

      <div className="ig-cartel" aria-hidden="true">Seguinos ✦</div>

      <div className="ig-tip">
        <div className="ig-perfil">
          <div className="ig-user">
            <div className="ig-avatar">L</div>
            <div>
              <div className="ig-nombre">Luma</div>
              <div className="ig-usuario">@{IG_USUARIO}</div>
            </div>
          </div>
          <div className="ig-about">Tips, novedades y todo lo nuevo de Luma para terapeutas holísticas ✦</div>
          <a className="ig-ir" href={IG_URL} target="_blank" rel="noopener noreferrer">Abrir Instagram →</a>
        </div>
      </div>

      <a className="ig-icono" href={IG_URL} target="_blank" rel="noopener noreferrer"
        onClick={alTocarIcono} aria-label={`Instagram de Luma (@${IG_USUARIO})`}>
        <div className="ig-capas">
          <span></span><span></span><span></span><span></span>
          <span className="ig-svg">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="5" stroke="#fff" strokeWidth="2"/>
              <circle cx="12" cy="12" r="4.2" stroke="#fff" strokeWidth="2"/>
              <circle cx="17.3" cy="6.7" r="1.3" fill="#fff"/>
            </svg>
          </span>
        </div>
        <div className="ig-texto">Instagram</div>
      </a>
    </div>
  )
}