'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Script from 'next/script'

// ─── Íconos SVG genéricos para la animación del Hero ───────────────────────
function IconExcel() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" stroke="currentColor" strokeWidth="1"/>
    </svg>
  )
}
function IconChat() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
      <path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H9l-4 4V6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  )
}
function IconCap() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
      <path d="M12 3l10 5-10 5L2 8l10-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M6 10.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-5.5" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  )
}
function IconCloud() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
      <path d="M7 18a4 4 0 01-.5-7.96A5 5 0 0116.9 8.02 4.5 4.5 0 0117 18H7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  )
}
function IconNote() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
      <path d="M6 3h9l5 5v13a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M9 12h6M9 16h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
function IconGear() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
function IconMoon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M20 12.5A8.5 8.5 0 1111.5 4a7 7 0 008.5 8.5z"/>
    </svg>
  )
}
function IconCrystal() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="34" height="34">
      <path d="M12 2l6 5-2 11H8L6 7l6-5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M6 7h12M9 7l3 13M15 7l-3 13" stroke="currentColor" strokeWidth="1"/>
    </svg>
  )
}
function IconCandle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="34" height="34">
      <path d="M12 2c1 1.5 1 2.5 0 4-1-1.5-1-2.5 0-4z" fill="currentColor"/>
      <rect x="9" y="7" width="6" height="14" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M9 11h6" stroke="currentColor" strokeWidth="1"/>
    </svg>
  )
}
function IconCardTarot() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="34" height="34">
      <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1"/>
      <path d="M8 16h8" stroke="currentColor" strokeWidth="1"/>
    </svg>
  )
}
function IconFlower() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="34" height="34">
      <circle cx="12" cy="12" r="2.3" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="12" cy="6" r="3" stroke="currentColor" strokeWidth="1"/>
      <circle cx="12" cy="18" r="3" stroke="currentColor" strokeWidth="1"/>
      <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1"/>
      <circle cx="18" cy="12" r="3" stroke="currentColor" strokeWidth="1"/>
    </svg>
  )
}

// ─── Patrón astrológico de fondo, como SVG repetido ────────────────────────
function patronAstralCSS(color: string, opacidad: number) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'>
    <g fill='none' stroke='${color}' stroke-width='1' opacity='${opacidad}'>
      <circle cx='30' cy='30' r='1.5' fill='${color}'/>
      <circle cx='170' cy='50' r='1' fill='${color}'/>
      <circle cx='90' cy='90' r='1.2' fill='${color}'/>
      <circle cx='150' cy='150' r='1.5' fill='${color}'/>
      <circle cx='40' cy='160' r='1' fill='${color}'/>
      <text x="20" y="70" font-size="14" fill="${color}">♈</text>
      <text x="120" y="30" font-size="12" fill="${color}">♑</text>
      <text x="60" y="140" font-size="13" fill="${color}">♓</text>
      <text x="150" y="110" font-size="11" fill="${color}">♎</text>
    </g>
  </svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

function constelacionSVG(color: string) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'>
    <g stroke='${color}' stroke-width='1' fill='${color}' opacity='0.9'>
      <line x1='60' y1='90' x2='110' y2='60'/>
      <line x1='110' y1='60' x2='170' y2='75'/>
      <line x1='170' y1='75' x2='210' y2='120'/>
      <line x1='210' y1='120' x2='190' y2='180'/>
      <line x1='190' y1='180' x2='120' y2='200'/>
      <line x1='120' y1='200' x2='70' y2='160'/>
      <line x1='70' y1='160' x2='60' y2='90'/>
      <circle cx='60' cy='90' r='3'/>
      <circle cx='110' cy='60' r='2.5'/>
      <circle cx='170' cy='75' r='3'/>
      <circle cx='210' cy='120' r='2.5'/>
      <circle cx='190' cy='180' r='3'/>
      <circle cx='120' cy='200' r='2.5'/>
      <circle cx='70' cy='160' r='3'/>
    </g>
  </svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

const ICONOS_ORBITA = [
  { Icon: IconExcel, label: 'Excel', color: 'violeta' },
  { Icon: IconChat, label: 'WhatsApp', color: 'dorado' },
  { Icon: IconCap, label: 'Classroom', color: 'violeta' },
  { Icon: IconCloud, label: 'Drive', color: 'dorado' },
  { Icon: IconNote, label: 'Notas', color: 'violeta' },
  { Icon: IconGear, label: 'Systeme.io', color: 'dorado' },
]

export default function LandingPage() {
  const heroPhoneRef = useRef<HTMLDivElement>(null)
  const iconRefs = useRef<(HTMLDivElement | null)[]>([])
  const notifRef = useRef<HTMLImageElement>(null)
  const dashboardRef = useRef<HTMLImageElement>(null)
  const [gsapListo, setGsapListo] = useState(false)
  const [scrollTriggerListo, setScrollTriggerListo] = useState(false)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const cardsSectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!gsapListo) return
    const gsap = (window as any).gsap
    if (!gsap) return

    // Float suave del celular
    gsap.to(heroPhoneRef.current, {
      y: -14, duration: 2.6, repeat: -1, yoyo: true, ease: 'sine.inOut',
    })

    // Órbita de los íconos — radio grande, para que rodeen el celular en vez de pegarse a él
    const radio = 230
    iconRefs.current.forEach((el, i) => {
      if (!el) return
      const anguloInicial = (360 / ICONOS_ORBITA.length) * i
      gsap.set(el, {
        x: radio * Math.cos((anguloInicial * Math.PI) / 180),
        y: radio * Math.sin((anguloInicial * Math.PI) / 180),
      })
    })

    const orbitaState = { angulo: 0 }
    const orbitaTween = gsap.to(orbitaState, {
      angulo: 360,
      duration: 10,
      repeat: -1,
      ease: 'none',
      onUpdate: () => {
        iconRefs.current.forEach((el, i) => {
          if (!el) return
          const base = (360 / ICONOS_ORBITA.length) * i
          const anguloActual = base + orbitaState.angulo
          gsap.set(el, {
            x: radio * Math.cos((anguloActual * Math.PI) / 180),
            y: radio * Math.sin((anguloActual * Math.PI) / 180),
          })
        })
      },
    })

    // Ciclo: íconos succionados → pantalla cambia a dashboard → cae la notificación → vuelve todo
    function cicloSuccion() {
      const timelineSuccion = gsap.timeline({
        onComplete: () => { gsap.delayedCall(0.3, cicloSuccion) },
      })
      timelineSuccion
        .to(iconRefs.current, { scale: 0, opacity: 0, x: 0, y: 0, duration: 0.5, stagger: 0.05, ease: 'power2.in' })
        .to(dashboardRef.current, { opacity: 1, duration: 0.4 }, '-=0.1')
        .fromTo(notifRef.current,
          { opacity: 0, transform: 'translate(-50%,-140%)' },
          { opacity: 1, transform: 'translate(-50%,0%)', duration: 0.5, ease: 'back.out(1.4)' },
          '+=0.3')
        .to({}, { duration: 2 })
        .to(notifRef.current, { opacity: 0, transform: 'translate(-50%,-40%)', duration: 0.35 })
        .to(dashboardRef.current, { opacity: 0, duration: 0.4 }, '+=0.2')
        .to(iconRefs.current, { scale: 1, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'power2.out' })
    }
    gsap.delayedCall(3, cicloSuccion)

    return () => { orbitaTween.kill() }
  }, [gsapListo])

  useEffect(() => {
    if (!gsapListo || !scrollTriggerListo) return
    const gsap = (window as any).gsap
    const ScrollTrigger = (window as any).ScrollTrigger
    if (!gsap || !ScrollTrigger) return

    const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[]
    if (cards.length === 0) return

    const lastCardIndex = cards.length - 1
    const lastCardST = ScrollTrigger.create({
      trigger: cards[lastCardIndex],
      start: 'center center',
    })

    const triggers = cards.map((card, index) => {
      const scale = index === lastCardIndex ? 1 : 0.5
      const scaleDown = gsap.to(card, { scale })
      return ScrollTrigger.create({
        trigger: card,
        start: 'top top',
        end: () => lastCardST.start,
        pin: true,
        pinSpacing: false,
        scrub: 0.5,
        animation: scaleDown,
        toggleActions: 'restart none none reverse',
      })
    })

    window.addEventListener('load', () => ScrollTrigger.refresh())
    setTimeout(() => ScrollTrigger.refresh(), 1500)

    ScrollTrigger.refresh()

    // Sección 3 — líneas de "La Promesa" apareciendo una por una
    const promesaLineas = gsap.utils.toArray('.promesa-line')
    if (promesaLineas.length > 0) {
      gsap.fromTo(promesaLineas,
        { opacity: 0, y: 20 },
        {
          opacity: 1, y: 0, duration: 0.7, stagger: 0.35, ease: 'power2.out',
          scrollTrigger: { trigger: '.promesa-section', start: 'top 60%' },
        }
      )
    }



    return () => { triggers.forEach((t: any) => t.kill()); lastCardST.kill() }
  }, [gsapListo, scrollTriggerListo])

  return (
    <>
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js" strategy="afterInteractive" onLoad={() => setGsapListo(true)}/>
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js" strategy="afterInteractive" onLoad={() => {
        const gsap = (window as any).gsap
        const ScrollTrigger = (window as any).ScrollTrigger
        if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger)
        setScrollTriggerListo(true)
      }}/>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Montserrat:wght@400;500;600;700;800;900&display=swap');

        @font-face {
          font-family: 'Avigea';
          src: url('/fonts/Avigea.ttf') format('truetype');
          font-display: swap;
        }

        *{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{font-family:'Montserrat',sans-serif}

        :root{
          --violeta-oscuro:#1E1B2E;
          --violeta-medio:#8B5CF6;
          --dorado:#C9A84C;
          --lavanda:#EDE8FF;
          --crema:#F9F6F0;
        }

        .lp-nav{
          position:fixed;top:0;left:0;right:0;z-index:200;
          height:76px;padding:0 6%;
          display:flex;align-items:center;justify-content:space-between;
          background:rgba(15,10,25,0.55);
          backdrop-filter:blur(14px);
          -webkit-backdrop-filter:blur(14px);
          border-bottom:1px solid rgba(255,255,255,0.08);
        }
        .lp-nav-logo{
          font-family:'Cormorant Garamond',serif;
          font-size:24px;font-weight:600;color:#F9F6F0;
          text-decoration:none;letter-spacing:0.5px;
        }
        .lp-nav-logo span{color:#C9A84C}
        .lp-nav-actions{display:flex;align-items:center;gap:14px}
        .lp-nav-login{
          font-size:14px;color:#E5DDF5;text-decoration:none;font-weight:500;
          padding:9px 4px;transition:color 0.2s;
        }
        .lp-nav-login:hover{color:white}
        .lp-nav-login-links{
          font-size:13px;color:#C9A84C;text-decoration:none;font-weight:600;
          padding:9px 4px;transition:color 0.2s;
        }
        .lp-nav-login-links:hover{color:#E8D5A3}
        .lp-nav-cta{
          padding:10px 22px;
          background:linear-gradient(135deg,#8B5CF6,#A78BFA);
          color:white;border-radius:10px;
          font-size:13px;font-weight:700;
          text-decoration:none;
          box-shadow:0 6px 20px rgba(139,92,246,0.35);
          transition:transform 0.2s;
        }
        .lp-nav-cta:hover{transform:translateY(-1px)}
        @media(max-width:640px){
          .lp-nav{padding:0 20px}
          .lp-nav-login{display:none}
          .lp-nav-login-links{display:none}
        }

        .lp-h1{
          font-family:'Avigea','Cormorant Garamond',serif;
          font-weight:400;
        }
        .lp-h2, .lp-h3{
          font-family:'Cormorant Garamond',serif;
        }

        /* ── HERO ── */
        .lp-hero{
          position:relative;
          min-height:100vh;
          background:linear-gradient(160deg, var(--violeta-oscuro) 0%, #0D0B14 100%);
          display:flex;align-items:center;
          overflow:hidden;
          padding:120px 6% 60px;
        }
.lp-hero::before{
          content:'';
          position:absolute;inset:0;
          background-image:url('/landing/hero-bgg.png');
          background-size:cover;
          background-position:center;
          background-repeat:no-repeat;
          opacity:0.5;
          pointer-events:none;
        }
        .lp-hero-grano::after{
          content:'';position:absolute;inset:0;pointer-events:none;opacity:0.04;
          background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
        }
        .lp-hero-grid{
          position:relative;z-index:1;
          display:grid;grid-template-columns:1fr 1fr;
          gap:60px;align-items:center;
          max-width:1200px;margin:0 auto;width:100%;
        }
        .lp-hero-title{
          font-size:clamp(44px,6vw,80px);
          line-height:1.02;
          color:#F9F6F0;
          margin-bottom:10px;
          letter-spacing:-1px;
        }
        .lp-hero-sub{
          font-size:17px;color:#C9BFE0;line-height:1.7;
          max-width:480px;margin-bottom:15px;
        }
        .lp-hero-cta{
          display:inline-flex;align-items:center;gap:10px;
          padding:17px 38px;
          background:linear-gradient(135deg,#8B5CF6,#C084FC);
          color:white;border:none;border-radius:14px;
          font-size:16px;font-weight:700;cursor:pointer;
          font-family:'Montserrat',sans-serif;
          text-decoration:none;
          box-shadow:0 12px 32px rgba(139,92,246,0.4);
          transition:transform 0.2s;
        }
        .lp-hero-cta:hover{transform:translateY(-2px)}
        .lp-hero-trust{
          margin-top:16px;font-size:13px;color:#8B7FA8;
        }

        /* ── ANIMACIÓN DEL CELULAR ── */
        .lp-phone-stage{
          position:relative;
          display:flex;align-items:center;justify-content:center;
          height:600px;
        }
        .lp-phone-img{
          position:absolute;top:50%;left:50%;
          transform:translate(-50%,-50%);
          max-height:540px;width:auto;
          z-index:3;
          filter:drop-shadow(0 30px 60px rgba(0,0,0,0.5));
        }
        .lp-phone-img.dashboard{opacity:0}
        .lp-notif-img{
          position:absolute;top:12%;left:50%;
          transform:translate(-50%,-140%);
          width:76%;max-width:300px;
          z-index:5;opacity:0;
        }
        .lp-icon-orbit{
          position:absolute;top:50%;left:50%;
          width:50px;height:50px;
          margin:-25px 0 0 -25px;
          border-radius:14px;
          display:flex;align-items:center;justify-content:center;
          z-index:6;
          box-shadow:0 10px 26px rgba(0,0,0,0.35);
        }
        .lp-icon-orbit.violeta{background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:white}
        .lp-icon-orbit.dorado{background:linear-gradient(135deg,#C9A84C,#E8D5A3);color:#1E1B2E}

        @media(max-width:900px){
          .lp-hero-grid{grid-template-columns:1fr;gap:40px;text-align:center}
          .lp-hero-sub{margin-left:auto;margin-right:auto}
          .lp-phone-stage{order:-1;height:440px}
          .lp-phone-img{max-height:400px}
          .lp-icon-orbit{width:38px;height:38px;margin:-19px 0 0 -19px}
        }
        @media(max-width:640px){
          .promesa-text{font-size:clamp(30px,8.5vw,42px)}
        }

        /* ── SECCIÓN 3 — LA PROMESA ── */
        .promesa-section{
          position:relative;
          min-height:100vh;
          background:#FFFFFF;
          display:flex;align-items:center;
          padding:100px 6%;
          overflow:hidden;
        }
        .promesa-text{
          position:relative;z-index:1;
          font-family:'Montserrat',sans-serif;
          font-size:clamp(26px,4.2vw,46px);
          line-height:1.5;text-align:left;
          max-width:820px;
        }
        .promesa-line{
          opacity:0;
          display:block;
        }
        .promesa-linea1{
          font-weight:800;color:#0A0A0A;
        }
        .promesa-linea2{
          font-style:italic;font-weight:600;
          color:#7C6BAA;
        }
        .promesa-linea3{
          font-style:italic;font-weight:400;
          color:#8B5CF6;font-size:0.7em;
        }
        .promesa-highlight{
          font-style:italic;color:#1E1B2E;
          background:rgba(139,92,246,0.25);
          padding:1px 6px;border-radius:3px;
        }

        /* ── SECCIÓN 5 — EL FUTURO ── */
        .futuro-section{
          position:relative;
          background-image:url('/landing/fondo-seccion-lunes.png');
          background-size:cover;
          background-position:center;
          background-repeat:no-repeat;
          padding:110px 6%;
          overflow:hidden;
        }
        .futuro-grid{ position:relative;z-index:1; }
        .futuro-grid{
          display:flex;align-items:center;justify-content:center;
          max-width:1180px;margin:0 auto;
        }
        .futuro-mockup-stage{
          position:absolute;inset:0;
          pointer-events:none;
        }
        .futuro-sticker{
          position:absolute;z-index:3;
          color:#C9A84C;
          opacity:0.85;
        }
        .futuro-text-wrap{
          position:relative;
          background:#F9F6F0;
          padding:64px 6vw;
          width:70%;
          border-radius:4px;
          clip-path:polygon(0% 2%,3% 0%,97% 1%,100% 4%,99% 97%,96% 100%,2% 99%,1% 96%);
          box-shadow:0 30px 70px rgba(0,0,0,0.45);
          transform:rotate(-1deg);
        }
        .futuro-text-wrap::after{
          content:'';position:absolute;inset:0;pointer-events:none;opacity:0.05;
          background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
        }
        .futuro-pin{
          position:absolute;top:-11px;left:50%;transform:translateX(-50%);
          width:20px;height:20px;border-radius:50%;
          background:radial-gradient(circle at 35% 35%,#F87171,#991B1B);
          box-shadow:0 4px 10px rgba(0,0,0,0.45), inset 0 -2px 3px rgba(0,0,0,0.3);
          z-index:2;
        }
        .futuro-title{
          font-family:'Cormorant Garamond',serif;
          font-size:clamp(30px,4.5vw,52px);
          font-weight:600;color:#1E1B2E;
          margin-bottom:26px;line-height:1.25;
          position:relative;z-index:1;
        }
        .futuro-body{
          font-family:'Montserrat',sans-serif;
          font-size:clamp(15px,1.6vw,19px);
          line-height:1.9;
          color:#4A4358;
          position:relative;z-index:1;
        }
        .futuro-bold{font-weight:700;color:#1E1B2E;font-style:normal}
        .futuro-italic{font-style:italic}
        .futuro-color{color:#8B5CF6;font-weight:600;font-style:italic}
        .futuro-subrayado{text-decoration:underline;text-decoration-color:#C9A84C;text-decoration-thickness:2px;text-underline-offset:3px;font-style:normal;font-weight:600;color:#1E1B2E}
        @media(max-width:860px){
          .futuro-text-wrap{width:85%;padding:40px 24px}
        }

        /* ── SECCIÓN 4 — FUNCIONES (sticky scroll) ── */
        .funciones-wrap{
          position:relative;
        }
        .funcion-slide{
          position:sticky;top:0;
          height:100vh;
          display:flex;flex-direction:column;
          align-items:center;justify-content:center;
          text-align:center;
          padding:60px 6%;
          background:var(--fc-bg);
        }
        .funcion-nombre{
          font-family:'Cormorant Garamond',serif;
          font-size:clamp(26px,3.5vw,40px);
          font-weight:600;
          color:var(--fc-accent);
          margin-bottom:10px;
        }
        .funcion-mockup-wrap{
          width:min(370px,88vw);
          margin-bottom:32px;
          filter:drop-shadow(0 30px 60px rgba(0,0,0,0.2));
        }
        .funcion-mockup{
          width:100%;display:block;
        }
        .funcion-frase{
          font-family:'Montserrat',sans-serif;
          font-size:clamp(16px,2vw,20px);
          font-weight:500;
          color:#1E1B2E;
          max-width:480px;line-height:1.5;
        }

        /* ── SECCIÓN 8 — PLANES ── */
        .planes-section{
          position:relative;
          background:#F9F6F0;
          padding:110px 6%;
        }
        .planes-header{
          text-align:center;max-width:600px;margin:0 auto 60px;
        }
        .planes-title{
          font-family:'Cormorant Garamond',serif;
          font-size:clamp(32px,4.5vw,52px);
          font-weight:600;color:#1E1B2E;
          margin-bottom:12px;
        }
        .planes-sub{
          font-family:'Montserrat',sans-serif;
          font-size:15px;color:#8B7FA8;
        }
        .planes-grid{
          display:grid;grid-template-columns:1fr 1fr 1fr;
          gap:28px;max-width:1180px;margin:0 auto;
        }
        .plan-card{
          position:relative;
          border-radius:24px;
          padding:44px 34px;
          overflow:hidden;
        }
        .plan-card.basico{
          background:
            linear-gradient(rgba(170, 46, 46, 0.22),rgba(236, 215, 255, 0.7)),
            url('/landing/fondo-seccion-lunes.png');
          background-size:cover;
          background-position:center;
          border:1.5px solid rgba(30,27,46,0.1);
        }
        .plan-card.premium{
          background:
            linear-gradient(160deg,rgba(205, 76, 231, 0.6),rgba(240, 204, 108, 0.68)),
            url('/landing/hero-bg.svg');
          background-size:cover;
          background-position:center;
          color:white;
          box-shadow:0 40px 80px rgba(139,92,246,0.35);
          transform:scale(1.04);
        }

        .plan-badge{
          display:inline-block;
          background:rgba(255,255,255,0.2);
          color:white;font-size:11px;font-weight:700;
          letter-spacing:1px;text-transform:uppercase;
          padding:6px 14px;border-radius:20px;
          margin-bottom:18px;position:relative;z-index:1;
        }
        .plan-nombre{
          font-family:'Cormorant Garamond',serif;
          font-size:26px;font-weight:600;
          margin-bottom:6px;position:relative;z-index:1;
        }
        .plan-card.basico .plan-nombre{ color:#1E1B2E; }
        .plan-desc{
          font-family:'Montserrat',sans-serif;
          font-size:13px;margin-bottom:24px;
          position:relative;z-index:1;
        }
        .plan-card.basico .plan-desc{ color:#8B7FA8; }
        .plan-card.premium .plan-desc{ color:rgba(255,255,255,0.85); }
        .plan-precio{
          font-family:'Montserrat',sans-serif;
          font-size:42px;font-weight:800;
          margin-bottom:4px;position:relative;z-index:1;
        }
        .plan-card.basico .plan-precio{ color:#1E1B2E; }
        .plan-precio span{ font-size:15px;font-weight:500; }
        .plan-features{
          list-style:none;margin:26px 0 30px;
          display:flex;flex-direction:column;gap:11px;
          position:relative;z-index:1;
        }
        .plan-features li{
          display:flex;align-items:flex-start;gap:9px;
          font-family:'Montserrat',sans-serif;
          font-size:13.5px;
        }
        .plan-card.basico .plan-features li{ color:#4A4358; }
        .plan-features li::before{
          content:'✓';font-weight:700;flex-shrink:0;
        }
        .plan-card.basico .plan-features li::before{ color:#8B5CF6; }
        .plan-features li.destacado{ font-weight:700; }
        .plan-btn{
          display:block;width:100%;text-align:center;
          padding:15px;border-radius:12px;
          font-family:'Montserrat',sans-serif;
          font-size:14px;font-weight:700;
          text-decoration:none;
          position:relative;z-index:1;
          transition:transform 0.2s;
        }
        .plan-btn:hover{ transform:translateY(-2px); }
        .plan-card.basico .plan-btn{ background:#1E1B2E;color:white; }
        .plan-card.premium .plan-btn{ background:white;color:#6B3FA0; }
        .plan-card.gratis{
          background:
            linear-gradient(160deg,rgba(255,255,255,0.8),rgba(245,224,180,0.55)),
            url('/landing/fondo-seccion-lunes.png');
          background-size:cover;
          background-position:center;
          border:1.5px solid rgba(201,168,76,0.35);
        }
        .plan-card.gratis .plan-nombre{ color:#1E1B2E; }
        .plan-card.gratis .plan-desc{ color:#8B7FA8; }
        .plan-card.gratis .plan-precio{ color:#1E1B2E; }
        .plan-card.gratis .plan-features li{ color:#4A4358; }
        .plan-card.gratis .plan-features li::before{ color:#C9A84C; }
        .plan-card.gratis .plan-btn{ background:#1E1B2E;color:#E8D5A3; }
        .plan-link-ejemplo{
          display:block;text-align:center;margin-top:12px;
          font-family:'Montserrat',sans-serif;font-size:12px;font-weight:600;
          color:#8B7FA8;text-decoration:none;position:relative;z-index:1;
        }
        .plan-link-ejemplo:hover{ color:#1E1B2E;text-decoration:underline; }
        @media(max-width:760px){
          .planes-grid{grid-template-columns:1fr}
          .plan-card.premium{transform:scale(1)}
        }

        /* ── SECCIÓN 10 — CIERRE ── */
        .cierre-section{
          position:relative;
          min-height:100vh;
          background-image:
            linear-gradient(rgba(161, 9, 199, 0.4),rgba(67, 2, 105, 0.88)),
            url('/landing/hero-bg.svg');
          background-size:cover;
          background-position:center;
          background-repeat:no-repeat;
          display:flex;align-items:center;justify-content:center;
          text-align:center;
          padding:100px 6%;
          overflow:hidden;
        }
        .cierre-blob{
          position:absolute;border-radius:50%;pointer-events:none;filter:blur(40px);
        }
        .cierre-blob.b1{
          width:420px;height:420px;background:rgba(139,92,246,0.22);
          top:-100px;left:-100px;
          animation:cierreFlotar1 9s ease-in-out infinite;
        }
        .cierre-blob.b2{
          width:340px;height:340px;background:rgba(201,168,76,0.16);
          bottom:-80px;right:-60px;
          animation:cierreFlotar2 11s ease-in-out infinite;
        }
        @keyframes cierreFlotar1{
          0%,100%{ transform:translate(0,0) }
          50%{ transform:translate(40px,30px) }
        }
        @keyframes cierreFlotar2{
          0%,100%{ transform:translate(0,0) }
          50%{ transform:translate(-30px,-40px) }
        }
        .cierre-content{ position:relative;z-index:1;max-width:780px; }
        .cierre-text{
          font-family:'Cormorant Garamond',serif;
          font-size:clamp(32px,5.5vw,64px);
          line-height:1.3;
        }
        .cierre-line{
          opacity:0;display:block;
          animation:cierreAparecer 0.8s ease-out forwards;
        }
        .cierre-line.cierre-linea1{ animation-delay:0.2s; }
        .cierre-line.cierre-linea2{ animation-delay:0.7s; }
        @keyframes cierreAparecer{
          from{ opacity:0;transform:translateY(20px); }
          to{ opacity:1;transform:translateY(0); }
        }
        .cierre-linea1{ font-weight:700;color:#F9F6F0; }
        .cierre-accent{
          font-style:italic;color:#C9A84C;
        }
        .cierre-linea2{
          font-weight:400;font-style:italic;color:#9A72A8;
          font-size:0.8em;margin-top:6px;
        }
        .cierre-highlight{
          font-style:normal;color:#F9F6F0;
          background:rgba(139,92,246,0.3);
          padding:1px 8px;border-radius:4px;
        }
        .cierre-cta{
          display:inline-block;margin-top:44px;
          padding:18px 42px;
          background:linear-gradient(135deg,#8B5CF6,#A784FA);
          color:white;border:none;border-radius:14px;
          font-family:'Montserrat',sans-serif;
          font-size:16px;font-weight:700;
          text-decoration:none;
          position:relative;
          box-shadow:0 12px 34px rgba(112, 13, 143, 0.45);
          animation:cierreBrillo 2.8s ease-in-out infinite;
          transition:transform 0.2s;
        }
        .cierre-cta:hover{ transform:translateY(-2px) scale(1.02); }
        @keyframes cierreBrillo{
          0%,100%{ box-shadow:0 12px 34px rgba(139,92,246,0.45); }
          50%{ box-shadow:0 12px 44px rgba(139,92,246,0.75),0 0 30px rgba(156, 250, 34, 0.41); }
        }
        .cierre-trust{
          margin-top:18px;font-size:13px;color:rgba(247, 205, 205, 0.9);
          font-family:'Montserrat',sans-serif;
        }

        /* ── SECCIÓN 2 — CARTAS APILADAS ── */
        .cards-section{
          position:relative;
          overflow-x:clip;
          background-image:url('/landing/fondo-seccion-2.png');
          background-size:cover;
          background-position:center;
          background-repeat:no-repeat;
          background-attachment:fixed;
        }

        .cards-section::after{
          content:'';position:absolute;inset:0;pointer-events:none;opacity:0.025;z-index:0;
          background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
        }
        .cards-intro{
          position:relative;z-index:1;
          min-height:38vh;
          display:flex;flex-direction:column;
          align-items:center;justify-content:center;
          text-align:center;padding:40px 6%;
        }
        .cards-intro-title{
          font-family:'Cormorant Garamond',serif;
          font-size:clamp(32px,5vw,56px);
          font-weight:500;color:#1E1B2E;
          line-height:1.2;max-width:680px;
        }
        .cards-intro-title .accent{
          color:#8B5CF6;font-style:italic;
        }
        .cards-intro-sub{
          margin-top:16px;font-size:15px;color:#8B7FA8;
          font-family:'Montserrat',sans-serif;
        }
        .c-card{
          position:relative;
          height:100vh;
          display:flex;align-items:center;justify-content:center;
          z-index:1;
        }
        .c-card-img{
          max-width:min(420px,80vw);
          width:100%;height:auto;
          filter:drop-shadow(0 30px 60px rgba(0,0,0,0.2));
        }
      `}</style>

      {/* NAV */}
      <nav className="lp-nav">
        <Link href="/" className="lp-nav-logo">Luma<span>.</span></Link>
        <div className="lp-nav-actions">
          <Link href="/auth/login" className="lp-nav-login">Iniciar sesión</Link>
          <Link href="/links/login" className="lp-nav-login-links">Luma Links</Link>
          <Link href="/auth/register" className="lp-nav-cta">Registrarse</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="lp-hero lp-hero-grano">
        <div className="lp-hero-grid">
          <div>
            <h1 className="lp-h1 lp-hero-title">Agenda para terapeutas holísticas</h1>
            <p className="lp-hero-sub">
              Luma organiza tus turnos, el historial de cada consultante, tus cobros y tu página de reservas — todo en un solo lugar, sin aprender a programar ni pagar cinco herramientas distintas.
            </p>
            <Link href="/auth/register" className="lp-hero-cta">Empezar gratis — 7 días sin tarjeta</Link>
            <p className="lp-hero-trust">Sin tarjeta · Sin compromiso · Cancelás cuando querás</p>
          </div>

          <div className="lp-phone-stage">
            {ICONOS_ORBITA.map(({ Icon, label, color }, i) => (
              <div key={label} ref={el => { iconRefs.current[i] = el }} className={`lp-icon-orbit ${color}`} title={label}>
                <Icon/>
              </div>
            ))}
            <div ref={heroPhoneRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
              <img src="/landing/hero-home.png" alt="Luma" className="lp-phone-img home"/>
              <img ref={dashboardRef} src="/landing/hero-dashboard.png" alt="Luma dashboard" className="lp-phone-img dashboard"/>
              <img ref={notifRef} src="/landing/hero-notif.png" alt="" className="lp-notif-img"/>
            </div>
          </div>
        </div>
        </section>

      {/* SECCIÓN 2 — CARTAS */}
      <section ref={cardsSectionRef} className="cards-section">
      <div className="cards-intro">
          <h2 className="cards-intro-title">
            No soy bruja, pero <span className="accent">adivino lo que te pasa</span>...
          </h2>
          <p className="cards-intro-sub">Scrolleá y confirmá</p>
        </div>
        {[
    { src: '/landing/carta-1.png', rot: -4 },
    { src: '/landing/carta-2.png', rot: 3 },
    { src: '/landing/carta-3.png', rot: -3 },
    { src: '/landing/carta-4.png', rot: 5 },
    { src: '/landing/carta-5.png', rot: -5 },
  ].map((carta, i) => (
    <div key={i} ref={el => { cardRefs.current[i] = el }} className="c-card">
      <img src={carta.src} alt="" className="c-card-img" style={{ transform: `rotate(${carta.rot}deg)` }}/>
    </div>
  ))}
</section>

{/* SECCIÓN 3 — LA PROMESA */}
<section className="promesa-section">
  <p className="promesa-text">
    <span className="promesa-line promesa-linea1">Existe una sola herramienta</span>
    <span className="promesa-line promesa-linea2">hecha específicamente para el trabajo que hacés.</span>
    <span className="promesa-line promesa-linea3">No adaptada. No genérica. <span className="promesa-highlight">Hecha para vos.</span></span>
  </p>
</section>

{/* SECCIÓN 4 — FUNCIONES */}
<div className="funciones-wrap">
  {[
    { nombre: 'Agenda', accent: '#6D28D9', bg: '#F4F0FF', img: '/landing/funcion-1-agenda.png', frase: 'Tus turnos, organizados solos. Sin un solo mensaje de WhatsApp.' },
    { nombre: 'Historial', accent: '#7C3AED', bg: '#EDE4FF', img: '/landing/funcion-2-historial.png', frase: 'Todo lo que trabajaste con cada consultante, en un lugar. Antes de cada sesión sabés exactamente dónde quedaron.' },
    { nombre: 'Página pública', accent: '#8B5CF6', bg: '#E6D8FF', img: '/landing/funcion-3-pagina.png', frase: 'Tu espacio profesional. Tus consultantes reservan solas, sin escribirte.' },
    { nombre: 'Finanzas', accent: '#9750F0', bg: '#DFCCFF', img: '/landing/funcion-4-finanzas.png', frase: 'Sabés exactamente cuánto ganaste, quién pagó y qué está pendiente.' },
    { nombre: 'Cursos', accent: '#A855F7', bg: '#D8C0FF', img: '/landing/funcion-5-cursos.png', frase: 'Creá y vendé tus cursos desde el mismo lugar donde gestionás tu consultorio.' },
    { nombre: 'Links', accent: '#C084FC', bg: '#D0B4FF', img: '/landing/funcion-6-links.png', frase: 'Todos tus links, cursos y servicios, en un solo lugar.' },
  ].map((f, i) => (
    <div key={i} className="funcion-slide" style={{ '--fc-accent': f.accent, '--fc-bg': f.bg } as React.CSSProperties}>
      <div className="funcion-nombre">{f.nombre}</div>
      <div className="funcion-mockup-wrap">
        <img src={f.img} alt={f.nombre} className="funcion-mockup"/>
      </div>
      <p className="funcion-frase">{f.frase}</p>
    </div>
  ))}
  </div>
  
  {/* SECCIÓN 5 — EL FUTURO */}
  <section className="futuro-section">
    <div className="futuro-grid">
    <div className="futuro-mockup-stage">
        <div className="futuro-sticker" style={{ top: '8%', left: '6%' }}><IconMoon/></div>
        <div className="futuro-sticker" style={{ top: '10%', right: '8%' }}><IconCrystal/></div>
        <div className="futuro-sticker" style={{ bottom: '10%', left: '8%' }}><IconCandle/></div>
        <div className="futuro-sticker" style={{ bottom: '8%', right: '6%' }}><IconCardTarot/></div>
      </div>
      <div className="futuro-text-wrap">
        <div className="futuro-pin"/>
        <h2 className="futuro-title">Imaginá abrir el lunes con todo claro.</h2>
        <p className="futuro-body">
          <span className="futuro-bold">Quién viene, cuánto cobrás</span>, qué trabajaron la última vez.<br/>
          Una notificación que dice <span className="futuro-color">"nueva reserva"</span> mientras tomás el café.<br/>
          <span className="futuro-italic">Tus cursos vendiendo solos</span> mientras das sesiones.<br/><br/>
          Sin buscar nada. Sin improvisar nada. <span className="futuro-subrayado">Sin perder nada.</span>
        </p>
      </div>
    </div>
    </section>

{/* SECCIÓN 8 — PLANES */}
<section className="planes-section">
  <div className="planes-header">
    <h2 className="planes-title">Elegí tu plan</h2>
    <p className="planes-sub">Sin contratos. Sin sorpresas.</p>
  </div>
  <div className="planes-grid">
    <div className="plan-card gratis">
      <div className="plan-nombre">Luma Links</div>
      <p className="plan-desc">Para la que recién arranca y quiere que la conozcan.</p>
      <div className="plan-precio">Gratis</div>
      <ul className="plan-features">
        <li>Página de enlaces con estética mística</li>
        <li>Foto de portada, bio y links ilimitados</li>
        <li>Bloque especial para tu descargable gratuito</li>
        <li>Promo destacada "Elegí una carta"</li>
      </ul>
      <Link href="/links/registro" className="plan-btn">Crear gratis</Link>
      <a href="/l/priscila-43898a" target="_blank" rel="noopener noreferrer" className="plan-link-ejemplo">Ver página de ejemplo →</a>
    </div>
    <div className="plan-card basico">
      <div className="plan-nombre">Básico</div>
      <p className="plan-desc">Para la terapeuta que quiere organizarse de una vez.</p>
      <div className="plan-precio">$9.900<span>/mes</span></div>
      <ul className="plan-features">
        <li>Agenda ilimitada</li>
        <li>Historial de cada consultante</li>
        <li>Página pública de reservas</li>
        <li>Cobros integrados</li>
        <li>Dashboard de finanzas</li>
        <li>Links centralizados</li>
      </ul>
      <Link href="/auth/register" className="plan-btn">Empezar gratis</Link>
    </div>
    <div className="plan-card premium">
      <div className="plan-badge">Más completo</div>
      <div className="plan-nombre">Premium</div>
      <p className="plan-desc">Para la terapeuta que además quiere vender su conocimiento.</p>
      <div className="plan-precio">$28.000<span>/mes</span></div>
      <ul className="plan-features">
      <li>Todo lo del Plan Básico</li>
          <li>Creá y vendé tus propios cursos</li>
          <li>Aula virtual para tus alumnas</li>
          <li>Certificados automáticos al aprobar</li>
          <li>Programá encuentros por Zoom para tus cursos</li>
          <li>Exámenes con corrección automática</li>
      </ul>
      <Link href="/auth/register" className="plan-btn">Empezar gratis</Link>
    </div>
  </div>
  </section>

  {/* SECCIÓN 10 — CIERRE */}
  <section className="cierre-section">
    <div className="cierre-blob b1"/>
    <div className="cierre-blob b2"/>
    <div className="cierre-content">
      <p className="cierre-text">
        <span className="cierre-line cierre-linea1">
          Dentro de <span className="cierre-accent">7 días</span> podés tener <span className="cierre-highlight">todo resuelto</span>.
        </span>
        <span className="cierre-line cierre-linea2">O podés seguir igual.</span>
      </p>
      <Link href="/auth/register" className="cierre-cta">Empezar gratis</Link>
      <p className="cierre-trust">Sin tarjeta · 7 días gratis · Cancelás cuando querés</p>
    </div>
  </section>
  </>
  )
  }