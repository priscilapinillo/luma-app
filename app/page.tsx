'use client'

// Landing de Luma · rediseño Blue Hour + Avigea (29/10).
// Mantiene: menú de entrar/registrarse, cartas apiladas con scroll, video de presentación, Instagram flotante y Meta Pixel.
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Script from 'next/script'
import MenuEntradas from '@/components/MenuEntradas'
import InstagramFlotante from '@/components/InstagramFlotante'
import VideoPresentacion from '@/components/VideoPresentacion'
import MetaPixel from '@/components/MetaPixel'
import TelefonoLuma, { ESTILOS_TELEFONO } from '@/components/landing/TelefonoLuma'
import { PLANTILLAS, temaPublico, type IdPlantilla } from '@/lib/plantillas'

// Testimonios reales: cuando tengas, agregalos acá ({ texto, nombre, rol }). Mientras esté vacío, la sección no aparece.
const TESTIMONIOS: { texto: string; nombre: string; rol: string }[] = []

const CHAU = ['Excel', 'WhatsApp', 'Drive', 'Cuadernos', 'Classroom', 'Notas del celu', 'Systeme.io', 'Linktree']

const CARTAS = [
  { src: '/landing/carta-1.webp', rot: -4 },
  { src: '/landing/carta-2.webp', rot: 3 },
  { src: '/landing/carta-3.webp', rot: -3 },
  { src: '/landing/carta-4.webp', rot: 5 },
  { src: '/landing/carta-5.webp', rot: -5 },
]

const SEMANA = [
  { d: 'LUN', s: [['10:00 Sofía', '#F6E4E2', '#6E3433'], ['17:00 Ana', '#E6E9F2', '#27344A']] },
  { d: 'MAR', s: [['11:00 Clase en vivo', '#27344A', '#F0E6D8']] },
  { d: 'MIÉ', s: [['09:30 Lu', '#D8EBDD', '#24533A'], ['15:00 Carla', '#DCD3E6', '#27344A'], ['19:00 Meli', '#F6E4E2', '#6E3433']] },
  { d: 'JUE', s: [['18:00 Nueva', '#F7ECD3', '#5A4416']] },
  { d: 'VIE', s: [['10:00 Vale', '#E6E9F2', '#27344A'], ['16:00 Sofía', '#F6E4E2', '#6E3433']] },
]
const HISTORIAL = [
  { t: 'Sesión 5 · hoy', d: 'Trae la tirada del mes. Seguir con el miedo a decidir.', c: '#A65A6E' },
  { t: 'Sesión 4 · 12 oct', d: 'Salió el Loco. Habló del trabajo nuevo.', c: '#A99BB8' },
  { t: 'Sesión 3 · 28 sep', d: 'Pagó con Mercado Pago · $15.000', c: '#A99BB8' },
]
const BARRAS = [38, 52, 44, 68, 60, 92]
const ONDAS = [8, 14, 22, 30, 18, 26, 34, 20, 12, 24, 32, 16, 28, 22, 10, 26, 18, 30, 14, 22, 12, 8]

const PRIVACIDAD = [
  { t: 'Tu cuenta es solo tuya.', d: 'Ninguna otra terapeuta puede ver tus consultantes, tus notas ni tus cobros.' },
  { t: 'Mercado Pago cobra por vos.', d: 'Luma nunca ve los datos de la tarjeta de tus consultantes.' },
  { t: 'Todo viaja protegido.', d: 'La conexión es segura de punta a punta, desde el celu o la compu.' },
]

const PLANES = [
  { id: 'links', n: 'Luma Links', d: 'Para la que recién arranca y quiere que la conozcan.', precio: 'Gratis', per: '', cta: 'Crear gratis', href: '/links/registro',
    f: ['Las 6 plantillas, en claro y oscuro', 'Tu foto en el arco con estrellas', 'Links sin límite y descargable gratis', 'Promo «Elegí una carta»', 'Números de visitas y clics'] },
  { id: 'basico', n: 'Básico', d: 'Para la terapeuta que quiere organizarse de una vez.', precio: '$9.900', per: '/mes', cta: 'Empezar gratis', href: '/auth/register',
    f: ['Agenda y página donde reservan tus sesiones, con las 6 plantillas', 'Historial de cada consultante', 'Cobros con Mercado Pago y finanzas', 'Video de presentación y «Cómo funciona»', '3 testimonios en audio y 1 cupón', 'Altar de ideas: 1 pizarra y 6 stickers', 'Todo lo de Luma Links'] },
  { id: 'premium', n: 'Premium', d: 'Para la terapeuta que además quiere vender lo que sabe.', precio: '$28.000', per: '/mes', cta: 'Empezar gratis', href: '/auth/register',
    f: ['Todo lo del Básico', 'Cursos con aula, a la venta en tu misma página', 'Exámenes y certificados automáticos', 'Encuentros por Zoom', 'Documento: guiones en A4 y PDF', 'Altar sin límite y todos los stickers', '15 testimonios en audio y cupones sin límite'] },
]

const TABLA: [string, string, string, string][] = [
  ['Página de links con las 6 plantillas', '✓', '✓', '✓'], ['Agenda y página de reservas de sesiones', '—', '✓', '✓'], ['Historial de cada consultante', '—', '✓', '✓'],
  ['Cobros con Mercado Pago y finanzas', '—', '✓', '✓'], ['Testimonios en audio', '—', '3', '15'], ['Cupones', '—', '1 para sesiones', 'Todos los que quieras'],
  ['Altar de ideas', '—', '1 pizarra', 'Sin límite'], ['Stickers', '—', '6', 'Todos'], ['Documento para guiones (A4 y PDF)', '—', '—', '✓'],
  ['Cursos a la venta en tu página, aula y certificados', '—', '—', '✓'], ['Exámenes con corrección automática', '—', '—', '✓'], ['Encuentros por Zoom', '—', '—', '✓'],
]

const PREGUNTAS = [
  ['¿Mis consultantes los ve alguien más?', 'No. Cada cuenta está separada: ninguna otra terapeuta puede ver tus consultantes, tus notas ni tus cobros.'],
  ['¿Qué pasa cuando terminan los 7 días?', 'Elegís un plan y seguís con todo como lo dejaste. Si no elegís ninguno, no se te cobra nada.'],
  ['¿Qué pueden hacer mis consultantes en mi página?', 'Reservan y pagan sus sesiones sin crearse ninguna cuenta. Con Premium, esa misma página también vende tus cursos: tus alumnas los compran ahí y entran a su aula.'],
  ['¿Necesito saber de tecnología?', 'No. Si usás WhatsApp, podés usar Luma. Desde el Inicio te vamos guiando paso a paso.'],
  ['¿Sirve si no estoy en Argentina?', 'Sí. Tus consultantes reservan desde cualquier país. Cobrás en pesos con Mercado Pago y, si atendés afuera, en tu página podés mostrar cómo pagarte en dólares: link de pago, datos de cuenta o USDT.'],
  ['¿Puedo cancelar cuando quiera?', 'Sí, desde Mi cuenta, sin hablar con nadie. Y nunca se cobra dos veces el mismo mes.'],
  ['¿Puedo vender mis cursos?', 'Sí, con Premium: aula para tus alumnas, exámenes, certificados automáticos y encuentros por Zoom.'],
]

function Check() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
}

// probador de plantillas: las 6 de verdad, en claro y oscuro, con el celular realista
function Probador() {
  const [p, setP] = useState<IdPlantilla>('rosa')
  const [modo, setModo] = useState<'claro' | 'oscuro'>('claro')
  const [fijo, setFijo] = useState(false)
  const cajaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (fijo) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let visible = false
    const obs = new IntersectionObserver(e => { visible = e[0]?.isIntersecting ?? false }, { threshold: 0.3 })
    if (cajaRef.current) obs.observe(cajaRef.current)
    const id = setInterval(() => {
      if (!visible) return
      setP(actual => { const i = PLANTILLAS.findIndex(x => x.id === actual); return PLANTILLAS[(i + 1) % PLANTILLAS.length].id })
    }, 2600)
    return () => { clearInterval(id); obs.disconnect() }
  }, [fijo])

  const t = temaPublico(p, modo)
  return (
    <section id="plantillas" className="ln-wrap ln-prob-wrap" aria-label="Probá tu página">
      <div className="ln-prob" ref={cajaRef}>
        <div className="ln-prob-txt">
          <span className="ln-kicker claro">TU PÁGINA DE RESERVAS</span>
          <h2 className="ln-h2 claro">Elegí cómo se ve. <em>Tocá y mirá.</em></h2>
          <p className="ln-p claro">En un solo link, tus consultantes reservan sesiones y tus alumnas compran tus cursos. Elegí entre 6 plantillas, cada una en claro y oscuro: tu foto va adentro del arco con estrellas, con el color de tu página.</p>
          <span className="ln-nota claro" style={{ marginTop: -8 }}>Las sesiones van desde el plan Básico. Los cursos, con Premium.</span>
          <div className="ln-prob-chips" role="radiogroup" aria-label="Plantilla">
            {PLANTILLAS.map(x => {
              const c = temaPublico(x.id, modo)
              const on = x.id === p
              return (
                <button key={x.id} type="button" role="radio" aria-checked={on} className={`ln-prob-chip${on ? ' on' : ''}`} onClick={() => { setP(x.id); setFijo(true) }}>
                  <span className="ln-prob-muestra" style={{ background: `linear-gradient(135deg, ${c.fondo} 0 50%, ${c.acento} 50% 100%)` }} />
                  <span><b>{x.nombre}</b><small>{x.desc}</small></span>
                </button>
              )
            })}
          </div>
          <div className="ln-seg" role="radiogroup" aria-label="Modo">
            {(['claro', 'oscuro'] as const).map(m => (
              <button key={m} type="button" role="radio" aria-checked={modo === m} className={modo === m ? 'on' : ''} onClick={() => { setModo(m); setFijo(true) }}>{m === 'claro' ? 'Claro' : 'Oscuro'}</button>
            ))}
          </div>
          <span className="ln-nota claro">{fijo ? `Estás viendo ${t.nombre}.` : 'Se va cambiando sola hasta que tocás una.'}</span>
        </div>
        <div className="ln-prob-tel">
          {/* la escala va en un contenedor quieto: el celular y el flotar tienen animación y la pisarían (así se superponía en el celu) */}
          <div className="ln-prob-esc"><div className="ln-flotar"><TelefonoLuma pantalla="reserva" tema={t} escala={1} recorrido /></div></div>
        </div>
      </div>
    </section>
  )
}

export default function LandingPage() {
  const [gsapListo, setGsapListo] = useState(false)
  const [scrollTriggerListo, setScrollTriggerListo] = useState(false)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const [faq, setFaq] = useState(0)
  const [tabla, setTabla] = useState(false)

  // cartas apiladas (igual que antes): cada carta se fija y se achica mientras pasa la siguiente
  useEffect(() => {
    if (!gsapListo || !scrollTriggerListo) return
    const gsap = (window as any).gsap
    const ScrollTrigger = (window as any).ScrollTrigger
    if (!gsap || !ScrollTrigger) return
    const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[]
    if (cards.length === 0) return
    const lastCardIndex = cards.length - 1
    const lastCardST = ScrollTrigger.create({ trigger: cards[lastCardIndex], start: 'center center' })
    const triggers = cards.map((card, index) => {
      const scale = index === lastCardIndex ? 1 : 0.5
      const scaleDown = gsap.to(card, { scale })
      return ScrollTrigger.create({
        trigger: card, start: 'top top', end: () => lastCardST.start,
        pin: true, pinSpacing: false, scrub: 0.5, animation: scaleDown, toggleActions: 'restart none none reverse',
      })
    })
    const refrescar = () => ScrollTrigger.refresh()
    window.addEventListener('load', refrescar)
    const t = setTimeout(refrescar, 1500)
    ScrollTrigger.refresh()
    return () => { triggers.forEach((x: any) => x.kill()); lastCardST.kill(); window.removeEventListener('load', refrescar); clearTimeout(t) }
  }, [gsapListo, scrollTriggerListo])

  // aparecer al bajar (sin librerías)
  useEffect(() => {
    const els = document.querySelectorAll('.ln-aparece')
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('visto')); return }
    const obs = new IntersectionObserver(entradas => entradas.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visto'); obs.unobserve(e.target) } }), { threshold: 0.15 })
    els.forEach(e => obs.observe(e))
    return () => obs.disconnect()
  }, [])

  return (
    <div className="ln">
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js" strategy="afterInteractive" onLoad={() => setGsapListo(true)} />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js" strategy="afterInteractive" onLoad={() => {
        const gsap = (window as any).gsap
        const ScrollTrigger = (window as any).ScrollTrigger
        if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger)
        setScrollTriggerListo(true)
      }} />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,800&display=swap" />
      <style>{ESTILOS_TELEFONO + `
        @font-face{font-family:'Avigea';src:url('/fonts/Avigea.ttf') format('truetype');font-display:swap}
        html{scroll-behavior:smooth}
        body{margin:0;background:#F5EEE4}
        .ln{--tinta:#27344A;--tinta2:#6E7388;--azul:#4C5580;--lav:#626B91;--rosa:#D6A6A5;--vino:#A65A6E;--crema:#F0E6D8;--card:#FFFCF7;--borde:#E6DCCE;
          background:#F5EEE4;color:var(--tinta);font-family:'Inter',sans-serif;letter-spacing:-0.01em;overflow-x:clip}
        .ln *{box-sizing:border-box}
        .ln a{color:inherit}
        .ln :is(a,button):focus-visible{outline:2px solid var(--rosa);outline-offset:3px}
        .ln-av{font-family:'Avigea','Cormorant Garamond',serif;font-weight:400;letter-spacing:-0.025em;line-height:.9}
        .ln-wrap{max-width:1240px;margin:0 auto;padding-left:24px;padding-right:24px}
        .ln-kicker{font-size:12px;font-weight:800;letter-spacing:1.6px;color:var(--tinta2)}
        .ln-kicker.claro{color:#C9C0D9}
        .ln-h2{margin:0;font-family:'Avigea','Cormorant Garamond',serif;font-weight:400;font-size:clamp(44px,5.6vw,74px);line-height:.88;letter-spacing:-0.025em}
        .ln-h2 em{font-style:normal;color:var(--lav)}
        .ln-h2.claro{color:var(--crema)}.ln-h2.claro em{color:var(--rosa)}
        .ln-p{margin:0;font-size:16.5px;line-height:1.38;color:var(--tinta2)}
        .ln-p.claro{color:#D9D1E4}
        .ln-nota{font-size:13px;color:var(--tinta2)}.ln-nota.claro{color:#A99BB8}
        @keyframes lnFlotar{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
        @keyframes lnFlotarGiro{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-10px) rotate(2deg)}}
        @keyframes lnCaer{0%,8%{opacity:0;transform:translateY(-34px) scale(.94)}16%,78%{opacity:1;transform:none}88%,100%{opacity:0;transform:translateY(-12px)}}
        @keyframes lnPulso{0%,100%{box-shadow:0 12px 30px rgba(0,0,0,.3),0 0 0 0 rgba(214,166,165,.55)}50%{box-shadow:0 16px 40px rgba(0,0,0,.4),0 0 0 12px rgba(214,166,165,0)}}
        @keyframes lnMarq{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes lnOnda{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}
        @keyframes lnGirar{to{transform:rotate(360deg)}}
        @keyframes lnTitila{0%,100%{opacity:.25;transform:scale(.8)}50%{opacity:1;transform:scale(1.1)}}
        @keyframes lnEntrar{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:none}}
        @keyframes lnSubraya{0%,15%{transform:scaleX(0)}45%,100%{transform:scaleX(1)}}
        @keyframes lnBarra{from{transform:scaleY(.1)}to{transform:scaleY(1)}}
        @keyframes lnCambio{from{opacity:.2;transform:scale(.97)}to{opacity:1;transform:none}}
        .ln-flotar{animation:lnFlotar 6s ease-in-out infinite}
        .ln-flotar-giro{animation:lnFlotarGiro 7s ease-in-out infinite}
        .ln-caer{animation:lnCaer 7s ease-in-out infinite}
        .ln-pulso{animation:lnPulso 2.6s ease-in-out infinite}
        .ln-titila{animation:lnTitila 2.4s ease-in-out infinite}
        .ln-entrar{animation:lnEntrar .9s cubic-bezier(.2,.8,.2,1) both}
        .ln-d1{animation-delay:.12s}.ln-d2{animation-delay:.24s}.ln-d3{animation-delay:.36s}.ln-d4{animation-delay:.48s}
        .ln-cambio{animation:lnCambio .5s ease both}
        .ln-subraya{position:relative;display:inline-block}
        .ln-subraya::after{content:'';position:absolute;left:0;right:0;bottom:.04em;height:.12em;border-radius:99px;background:var(--rosa);transform-origin:left;animation:lnSubraya 4s ease-in-out infinite alternate;z-index:-1}
        .ln-aparece{opacity:0;transform:translateY(26px);transition:opacity .8s cubic-bezier(.2,.8,.2,1),transform .8s cubic-bezier(.2,.8,.2,1)}
        .ln-aparece.visto{opacity:1;transform:none}
        .ln-btn-crema{display:inline-flex;align-items:center;justify-content:center;min-height:56px;padding:0 26px;border-radius:18px;background:var(--crema);color:var(--tinta) !important;font-size:16px;font-weight:800;text-decoration:none}
        .ln-btn-borde{display:inline-flex;align-items:center;justify-content:center;min-height:56px;padding:0 22px;border-radius:18px;border:1px solid rgba(240,230,216,.3);color:var(--crema) !important;font-size:15px;font-weight:700;text-decoration:none;transition:background .2s}
        .ln-btn-borde:hover{background:rgba(240,230,216,.08)}

        /* nav */
        .ln-nav{position:absolute;top:0;left:0;right:0;z-index:40}
        .ln-nav-in{max-width:1240px;margin:0 auto;padding:18px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px}
        .ln-logo{font-family:'Avigea','Cormorant Garamond',serif;font-size:36px;line-height:.9;color:var(--crema) !important;text-decoration:none}
        .ln-logo span{color:var(--rosa)}
        .ln-nav-links{display:flex;gap:4px;margin-left:auto}
        .ln-nav-links a{padding:10px 14px;border-radius:12px;color:#C9C0D9 !important;font-size:14px;font-weight:600;text-decoration:none;transition:background .2s,color .2s}
        .ln-nav-links a:hover{background:rgba(240,230,216,.08);color:var(--crema) !important}

        /* hero */
        .ln-hero{position:relative;padding:120px 24px 90px;color:var(--crema);border-radius:0 0 48px 48px;overflow:hidden;
          background:radial-gradient(900px 520px at 78% 40%,rgba(98,107,145,.55),transparent 70%),radial-gradient(600px 400px at 10% 90%,rgba(214,166,165,.28),transparent 70%),linear-gradient(160deg,#27344A 0%,#1F2A3D 100%)}
        .ln-estrella{position:absolute;pointer-events:none}
        .ln-hero-in{max-width:1240px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;gap:48px}
        .ln-hero-txt{flex:1 1 480px;min-width:0;display:flex;flex-direction:column;gap:22px}
        .ln-pastilla{align-self:flex-start;display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:99px;background:rgba(240,230,216,.1);border:1px solid rgba(240,230,216,.22);font-size:13px;font-weight:600}
        .ln-pastilla i{width:7px;height:7px;border-radius:50%;background:#9FD8B0}
        .ln-h1{margin:0;font-family:'Avigea','Cormorant Garamond',serif;font-weight:400;font-size:clamp(54px,7vw,92px);line-height:.88;letter-spacing:-0.025em;position:relative;z-index:0}
        .ln-hero-sub{margin:0;max-width:520px;font-size:18px;line-height:1.35;color:#D9D1E4}
        .ln-hero-ctas{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
        .ln-hero-trust{font-size:13px;color:#A99BB8}
        .ln-hero-vis{flex:1 1 480px;min-width:0;position:relative;height:700px}
        .ln-anillo{position:absolute;left:50%;top:50%;width:560px;height:560px;margin:-280px 0 0 -280px;border-radius:50%;border:1px dashed rgba(240,230,216,.2);animation:lnGirar 40s linear infinite}
        .ln-halo{position:absolute;left:50%;top:52%;width:420px;height:420px;margin:-210px 0 0 -210px;border-radius:50%;background:radial-gradient(circle,rgba(214,166,165,.35),transparent 65%)}
        .ln-tel-atras{position:absolute;left:0;top:70px}
        .ln-tel-atras>div{transform:perspective(1800px) rotateY(22deg) rotateX(4deg) rotateZ(-7deg) scale(.84);filter:drop-shadow(0 40px 40px rgba(0,0,0,.45)) brightness(.92)}
        .ln-tel-frente{position:absolute;right:6%;top:18px}
        .ln-tel-frente>div{transform:perspective(1800px) rotateY(-14deg) rotateX(5deg) rotateZ(3deg);filter:drop-shadow(0 60px 50px rgba(0,0,0,.5)) drop-shadow(0 18px 18px rgba(0,0,0,.3))}
        .ln-notif{position:absolute;top:4px;right:0;width:318px;padding:12px 14px;border-radius:26px;background:rgba(250,247,242,.9);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);color:#1B1B1F;box-shadow:0 24px 50px rgba(0,0,0,.35),inset 0 0 0 .5px rgba(255,255,255,.6);display:flex;gap:11px;align-items:center;z-index:3}
        .ln-notif-ic{width:40px;height:40px;border-radius:10px;background:linear-gradient(145deg,#27344A,#1F2A3D);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:'Avigea',serif;font-size:26px;line-height:1;color:var(--crema)}
        .ln-notif-txt{display:flex;flex-direction:column;gap:1px;min-width:0;flex:1}
        .ln-notif-top{display:flex;justify-content:space-between;font-size:11.5px;color:#6B6B73}.ln-notif-top b{letter-spacing:.04em}
        .ln-notif-txt strong{font-size:14px}.ln-notif-txt span:last-child{font-size:13px;color:#3A3A40;line-height:1.25}
        .ln-chip-cobro{position:absolute;bottom:70px;left:26%;padding:12px 16px;border-radius:20px;background:#F7ECD3;color:#5A4416;box-shadow:0 22px 44px rgba(0,0,0,.35);display:flex;gap:10px;align-items:center;z-index:3}
        .ln-chip-cobro i{width:34px;height:34px;border-radius:11px;background:#FFFCF7;display:flex;align-items:center;justify-content:center;color:#8A6A22}
        .ln-chip-cobro small{display:block;font-size:10px;font-weight:800;letter-spacing:1.2px}.ln-chip-cobro b{font:800 22px/1 'Inter',sans-serif;letter-spacing:-.03em}
        .ln-chip-curso{position:absolute;bottom:150px;right:0;padding:11px 15px;border-radius:18px;background:#DCD3E6;color:var(--tinta);box-shadow:0 22px 44px rgba(0,0,0,.35);font-size:13px;font-weight:700;display:flex;gap:8px;align-items:center;z-index:3}

        /* chau */
        .ln-chau{padding:34px 0;overflow:hidden}
        .ln-chau-t{text-align:center;font-size:13px;font-weight:700;letter-spacing:1.6px;color:var(--tinta2);margin-bottom:16px}
        .ln-marq{display:flex;gap:14px;width:max-content;animation:lnMarq 26s linear infinite}
        .ln-marq span{padding:12px 20px;border-radius:99px;background:var(--card);border:1px solid var(--borde);box-shadow:0 6px 16px rgba(39,52,74,.06);font-size:15px;font-weight:700;color:var(--tinta2);white-space:nowrap;text-decoration:line-through;text-decoration-color:var(--rosa);text-decoration-thickness:2px}

        /* cartas apiladas */
        /* fondo de las cartas (29/10): degradé suave Blue Hour, sin imagen ni capas fijas. Arranca y termina en el color de la página, así no se pisa con las secciones de al lado */
        .ln-cartas{position:relative;overflow-x:clip;background:
          radial-gradient(760px 540px at 10% 9%,rgba(214,166,165,.34),transparent 70%),
          radial-gradient(820px 600px at 94% 34%,rgba(220,211,230,.9),transparent 70%),
          radial-gradient(760px 540px at 6% 66%,rgba(220,211,230,.75),transparent 70%),
          radial-gradient(720px 520px at 92% 92%,rgba(214,166,165,.3),transparent 70%),
          #F5EEE4}
        .ln-cartas-intro{position:relative;z-index:1;min-height:38vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:60px 6% 40px;gap:12px}
        .ln-cartas-intro .ln-h2{max-width:820px}.ln-cartas-intro .ln-h2 em{color:var(--vino)}
        .c-card{position:relative;height:100vh;display:flex;align-items:center;justify-content:center;z-index:1}
        .c-card-img{max-width:min(420px,80vw);width:100%;height:auto;filter:drop-shadow(0 30px 60px rgba(39,52,74,.25))}

        /* promesa */
        .ln-promesa{padding:90px 24px;background:var(--card);border-top:1px solid var(--borde);border-bottom:1px solid var(--borde);text-align:center}
        .ln-promesa p{margin:0 auto;max-width:960px;font-family:'Avigea','Cormorant Garamond',serif;font-size:clamp(40px,5vw,60px);line-height:.92;letter-spacing:-0.02em}
        .ln-promesa span{display:block}.ln-promesa .l2{color:var(--lav)}.ln-promesa em{font-style:normal;color:var(--vino)}

        /* funciones */
        .ln-fun{padding-top:100px;padding-bottom:60px;display:flex;flex-direction:column;gap:36px}
        .ln-fun-cab{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap}
        .ln-fun-cab .ln-h2{max-width:640px}.ln-fun-cab .ln-p{max-width:360px}
        .ln-tiles{display:flex;flex-wrap:wrap;gap:18px}
        .ln-tile{min-width:0;border-radius:30px;box-shadow:0 14px 34px rgba(39,52,74,.08);padding:26px;display:flex;flex-direction:column;gap:16px;transition:transform .35s cubic-bezier(.2,.8,.2,1),box-shadow .35s}
        .ln-tile:hover{transform:translateY(-6px);box-shadow:0 26px 50px rgba(39,52,74,.16)}
        .ln-tile.ancha{flex:2 1 560px}.ln-tile.media{flex:1 1 340px}
        .ln-tile-k{font-size:11px;font-weight:800;letter-spacing:1.4px}
        .ln-tile h3{margin:6px 0 0;font-family:'Avigea','Cormorant Garamond',serif;font-weight:400;font-size:38px;line-height:.9;letter-spacing:-.02em}
        .ln-semana{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}
        .ln-dia{border-radius:18px;background:#FBF7F1;border:1px solid #EFE7DB;padding:10px 8px;display:flex;flex-direction:column;gap:6px;min-height:150px}
        .ln-dia>b{font-size:11px;font-weight:800;color:var(--tinta2)}
        .ln-dia span{padding:6px 7px;border-radius:10px;font-size:10.5px;font-weight:700;line-height:1.15}
        .ln-mini{border-radius:22px;background:var(--card);padding:14px;display:flex;flex-direction:column;gap:10px;box-shadow:0 10px 24px rgba(39,52,74,.1)}
        .ln-hist{display:flex;gap:10px}.ln-hist i{width:10px;height:10px;margin-top:3px;border-radius:50%;flex-shrink:0}
        .ln-hist b{display:block;font-size:12px}.ln-hist span{font-size:12px;color:var(--tinta2);line-height:1.3}
        .ln-barras{display:flex;align-items:flex-end;gap:8px;height:90px}
        .ln-barras span{flex:1;border-radius:8px 8px 4px 4px;transform-origin:bottom}
        .ln-aparece.visto .ln-barras span{animation:lnBarra 1.6s cubic-bezier(.2,.8,.2,1) both}
        .ln-onda{display:flex;align-items:center;gap:3px;height:34px;flex:1}
        .ln-onda span{width:4px;border-radius:3px;animation:lnOnda 1.1s ease-in-out infinite;transform-origin:center}
        .ln-play{width:44px;height:44px;border-radius:50%;border:none;background:var(--tinta);color:var(--crema);display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .ln-arco-link{padding:12px 14px;border-radius:14px 14px 26px 26px;background:#FBF7F1;border:1px solid #EFE7DB;font:700 16px 'Cormorant Garamond',serif}

        /* probador */
        .ln-prob-wrap{padding-top:70px;padding-bottom:100px}
        .ln-prob{border-radius:40px;background:linear-gradient(160deg,#27344A,#1F2A3D);color:var(--crema);padding:54px;display:flex;flex-wrap:wrap;gap:50px;align-items:center;box-shadow:0 30px 70px rgba(39,52,74,.28)}
        .ln-prob-txt{flex:1 1 420px;min-width:0;display:flex;flex-direction:column;gap:22px}
        .ln-prob-chips{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
        .ln-prob-chip{display:flex;align-items:center;gap:10px;min-height:58px;padding:10px 12px;border-radius:16px;border:1.5px solid rgba(240,230,216,.16);background:rgba(240,230,216,.04);color:var(--crema);text-align:left;cursor:pointer;transition:all .25s;font-family:inherit}
        .ln-prob-chip:hover{border-color:rgba(240,230,216,.4)}
        .ln-prob-chip.on{border-color:var(--crema);background:rgba(240,230,216,.16);box-shadow:0 10px 24px rgba(0,0,0,.25)}
        .ln-prob-chip b{display:block;font-family:'Avigea','Cormorant Garamond',serif;font-weight:400;font-size:22px;line-height:.9}
        .ln-prob-chip small{font-size:11px;opacity:.75}
        .ln-prob-muestra{width:30px;height:30px;border-radius:10px;flex-shrink:0;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25)}
        .ln-seg{align-self:flex-start;display:flex;gap:4px;padding:5px;border-radius:16px;background:rgba(240,230,216,.08);border:1px solid rgba(240,230,216,.18)}
        .ln-seg button{min-height:44px;padding:0 20px;border-radius:12px;border:none;cursor:pointer;font:700 14px 'Inter',sans-serif;background:transparent;color:#C9C0D9;transition:all .2s}
        .ln-seg button.on{background:var(--crema);color:var(--tinta)}
        .ln-prob-tel{flex:0 1 330px;display:flex;justify-content:center}
        .ln-prob-tel .tl{filter:drop-shadow(0 40px 50px rgba(0,0,0,.5))}

        /* privacidad */
        .ln-priv{border-radius:36px;background:var(--card);border:1px solid var(--borde);box-shadow:0 18px 40px rgba(39,52,74,.08);padding:46px;display:flex;flex-wrap:wrap;gap:40px;align-items:center}
        .ln-priv-t{flex:1 1 380px;display:flex;gap:20px;align-items:center}
        .ln-priv-ic{width:88px;height:88px;border-radius:28px;background:#DCD3E6;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 14px 30px rgba(98,107,145,.3)}
        .ln-priv-t .ln-h2{font-size:clamp(36px,4vw,50px)}
        .ln-priv-l{flex:1 1 380px;display:flex;flex-direction:column;gap:12px}
        .ln-priv-l div{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border-radius:18px;background:#FBF7F1;border:1px solid #EFE7DB;font-size:15px;line-height:1.35}
        .ln-priv-l i{width:26px;height:26px;border-radius:50%;background:#D8EBDD;color:#2F6646;display:flex;align-items:center;justify-content:center;flex-shrink:0}

        /* lunes */
        .ln-lunes{padding:100px 24px;text-align:center;background:radial-gradient(700px 400px at 20% 30%,rgba(214,166,165,.35),transparent 70%),radial-gradient(700px 400px at 85% 80%,rgba(220,211,230,.8),transparent 70%),#F5EEE4}
        .ln-lunes-in{max-width:1000px;margin:0 auto;display:flex;flex-direction:column;gap:22px;align-items:center}
        .ln-lunes .ln-h2{font-size:clamp(48px,6.4vw,80px)}
        .ln-lunes p{margin:0;max-width:680px;font-size:19px;line-height:1.4;color:var(--azul)}
        .ln-lunes p b{color:var(--tinta)}.ln-lunes p .rosa{color:var(--vino);font-weight:700}
        .ln-lunes .cierre{font-family:'Avigea','Cormorant Garamond',serif;font-size:34px;line-height:.95;color:var(--lav)}

        /* testimonios */
        .ln-test{display:flex;gap:18px;flex-wrap:wrap}
        .ln-test figure{flex:1 1 320px;margin:0;min-height:260px;border-radius:30px;padding:28px;display:flex;flex-direction:column;gap:14px;box-shadow:0 14px 34px rgba(39,52,74,.1)}
        .ln-test blockquote{margin:0;font-family:'Avigea','Cormorant Garamond',serif;font-size:28px;line-height:.98}

        /* planes */
        .ln-planes{padding-top:80px;padding-bottom:40px;display:flex;flex-direction:column;gap:36px}
        .ln-planes-cab{text-align:center;display:flex;flex-direction:column;gap:10px;align-items:center}
        .ln-planes-grid{display:flex;gap:18px;flex-wrap:wrap;align-items:stretch;padding-top:14px}
        .ln-plan{position:relative;flex:1 1 320px;min-width:0;border-radius:32px;padding:32px 28px;display:flex;flex-direction:column;gap:16px;transition:transform .35s cubic-bezier(.2,.8,.2,1),box-shadow .35s}
        .ln-plan:hover{transform:translateY(-6px)}
        .ln-plan.links{background:var(--card);border:1px solid var(--borde);box-shadow:0 14px 34px rgba(39,52,74,.08)}
        .ln-plan.basico{background:#DCD3E6;box-shadow:0 14px 34px rgba(39,52,74,.1)}
        .ln-plan.premium{background:linear-gradient(160deg,#27344A,#1F2A3D);color:var(--crema);box-shadow:0 26px 60px rgba(39,52,74,.35);transform:translateY(-10px)}
        .ln-plan.premium:hover{transform:translateY(-14px)}
        .ln-plan-badge{position:absolute;top:-14px;left:50%;transform:translateX(-50%);padding:7px 14px;border-radius:99px;background:var(--rosa);color:var(--tinta);font-size:12px;font-weight:800;white-space:nowrap;box-shadow:0 8px 18px rgba(0,0,0,.2)}
        .ln-plan-n{font-family:'Avigea','Cormorant Garamond',serif;font-size:40px;line-height:.9}
        .ln-plan-d{font-size:14.5px;line-height:1.35;opacity:.8}
        .ln-plan-precio{display:flex;align-items:baseline;gap:4px}.ln-plan-precio b{font:800 44px 'Inter',sans-serif;letter-spacing:-.04em}.ln-plan-precio span{font-size:14px;opacity:.7}
        .ln-plan ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:10px}
        .ln-plan li{display:flex;gap:10px;align-items:flex-start;font-size:14.5px;line-height:1.3}
        .ln-plan li i{width:20px;height:20px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#E6E9F2;color:var(--azul)}
        .ln-plan.basico li i{background:var(--card)}.ln-plan.premium li i{background:var(--rosa);color:var(--tinta)}
        .ln-plan-btn{margin-top:auto;display:flex;align-items:center;justify-content:center;min-height:52px;border-radius:16px;font-size:15px;font-weight:800;text-decoration:none;background:#E6E9F2;color:var(--tinta) !important}
        .ln-plan.basico .ln-plan-btn{background:var(--tinta);color:var(--crema) !important}
        .ln-plan.premium .ln-plan-btn{background:var(--crema);color:var(--tinta) !important}
        .ln-plan-ej{font-size:13px;font-weight:700;color:var(--azul) !important;text-align:center}
        .ln-tabla-btn{align-self:center;display:flex;align-items:center;gap:8px;min-height:50px;padding:0 22px;border-radius:16px;border:1px solid var(--borde);background:var(--card);box-shadow:0 8px 20px rgba(39,52,74,.08);color:var(--tinta);font:700 15px 'Inter',sans-serif;cursor:pointer}
        .ln-tabla-btn svg{transition:transform .3s}.ln-tabla-btn[aria-expanded="true"] svg{transform:rotate(180deg)}
        .ln-tabla{border-radius:28px;background:var(--card);border:1px solid var(--borde);box-shadow:0 14px 34px rgba(39,52,74,.08);overflow-x:auto;animation:lnCambio .4s ease both}
        .ln-tabla table{width:100%;min-width:640px;border-collapse:collapse;font-size:14.5px}
        .ln-tabla th,.ln-tabla td{padding:13px 16px;text-align:center}
        .ln-tabla thead tr{background:#FBF7F1}.ln-tabla thead th{font-family:'Avigea','Cormorant Garamond',serif;font-weight:400;font-size:22px}
        .ln-tabla thead th:first-child{font:800 12px 'Inter',sans-serif;letter-spacing:1.2px;color:var(--tinta2);text-align:left;padding-left:22px}
        .ln-tabla tbody tr{border-top:1px solid #EFE7DB}
        .ln-tabla tbody th{text-align:left;padding-left:22px;font-weight:600}
        .ln-tabla td{font-weight:700}.ln-tabla td.no{font-weight:500;color:#B9B3C4}.ln-tabla td.pr{color:var(--vino)}

        /* preguntas */
        .ln-faq{max-width:900px;margin:0 auto;padding:80px 24px 100px;display:flex;flex-direction:column;gap:28px}
        .ln-faq .ln-h2{text-align:center}
        .ln-faq-l{display:flex;flex-direction:column;gap:10px}
        .ln-q{border-radius:22px;background:#FBF7F1;border:1px solid #EFE7DB;transition:all .3s}
        .ln-q.on{background:var(--card);border-color:#D9CDE6;box-shadow:0 14px 30px rgba(39,52,74,.1)}
        .ln-q button{width:100%;min-height:64px;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:18px 22px;border:none;background:transparent;color:var(--tinta);text-align:left;font:700 17px 'Inter',sans-serif;letter-spacing:-.01em;cursor:pointer}
        .ln-q button i{width:34px;height:34px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#EFE7DB;color:var(--azul);transition:transform .3s,background .3s,color .3s}
        .ln-q.on button i{background:var(--tinta);color:var(--crema);transform:rotate(45deg)}
        .ln-q p{margin:0;padding:0 22px 20px;font-size:15.5px;line-height:1.4;color:var(--azul);animation:lnCambio .3s ease both}

        /* cierre */
        .ln-cierre{position:relative;padding:120px 24px;text-align:center;color:var(--crema);border-radius:48px 48px 0 0;overflow:hidden;background:radial-gradient(700px 420px at 50% 0%,rgba(98,107,145,.6),transparent 70%),linear-gradient(160deg,#27344A,#141B29)}
        .ln-cierre-in{max-width:900px;margin:0 auto;display:flex;flex-direction:column;gap:26px;align-items:center}
        .ln-cierre .l1{margin:0;font-family:'Avigea','Cormorant Garamond',serif;font-size:clamp(50px,6.6vw,82px);line-height:.88;letter-spacing:-.025em}
        .ln-cierre .l1 em{font-style:normal;color:var(--rosa)}
        .ln-cierre .l2{margin:0;font-family:'Avigea','Cormorant Garamond',serif;font-size:clamp(28px,3.4vw,40px);line-height:.9;color:#A99BB8}
        .ln-pie{background:#141B29;color:#A99BB8;padding:30px 24px calc(30px + env(safe-area-inset-bottom))}
        .ln-pie-in{max-width:1240px;margin:0 auto;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:center;font-size:13.5px}
        .ln-pie a{color:#C9C0D9 !important}
        .ln-pie-links{display:flex;gap:18px;flex-wrap:wrap}

        /* botón fijo del celu */
        .ln-fijo{display:none}

        @media(max-width:1100px){.ln-hero-vis{height:620px}.ln-tel-frente{right:0}}
        @media(max-width:860px){
          .ln-nav-links{display:none}
          .ln-nav-in{padding:14px 14px;gap:8px}
          .ln-logo{font-size:30px}
          .ln-hero{padding:96px 18px 50px;border-radius:0 0 34px 34px}
          .ln-hero-in{gap:24px}
          .ln-hero-sub{font-size:16px}
          .ln-hero-vis{flex-basis:100%;height:470px}
          .ln-anillo{width:360px;height:360px;margin:-180px 0 0 -180px}
          .ln-tel-atras{left:-40px;top:60px}.ln-tel-atras>div{transform:perspective(1800px) rotateY(22deg) rotateZ(-7deg) scale(.56);transform-origin:top left}
          .ln-tel-frente{right:-30px;top:10px}.ln-tel-frente>div{transform:perspective(1800px) rotateY(-14deg) rotateX(5deg) rotateZ(3deg) scale(.66);transform-origin:top right}
          .ln-notif{width:262px;padding:10px 12px;border-radius:22px;right:0}
          .ln-chip-cobro{left:0;bottom:24px}
          .ln-chip-curso{display:none}
          .ln-prob{padding:28px 18px;border-radius:30px;gap:28px}
          .ln-prob-tel{order:-1;flex-basis:100%}
          .ln-prob-esc{transform:scale(.8);transform-origin:top center;margin-bottom:-129px}
          .ln-priv{padding:26px 20px;border-radius:28px}
          .ln-priv-ic{width:60px;height:60px;border-radius:20px}
          .ln-tile{padding:22px}
          .ln-semana{grid-template-columns:repeat(3,minmax(0,1fr))}
          .ln-semana .ln-dia:nth-child(n+4){display:none}
          .ln-planes-grid{flex-wrap:nowrap;overflow-x:auto;scroll-snap-type:x mandatory;padding:18px 4px 24px;margin:0 -24px;padding-left:24px;padding-right:24px;scrollbar-width:none}
          .ln-planes-grid::-webkit-scrollbar{display:none}
          .ln-plan{flex:0 0 86%;scroll-snap-align:center}
          .ln-plan.premium{transform:none}.ln-plan:hover,.ln-plan.premium:hover{transform:none}
          .ln-cierre{padding:80px 20px 120px;border-radius:34px 34px 0 0}
          .ln-fijo{display:flex;position:fixed;left:12px;right:84px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:200;transition:transform .35s,opacity .35s}
          .ln-fijo.oculto{transform:translateY(120%);opacity:0;pointer-events:none}
          .ln-fijo a{flex:1;min-height:54px;border-radius:18px;background:var(--tinta);color:var(--crema) !important;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;text-decoration:none;box-shadow:0 14px 34px rgba(39,52,74,.35)}
          .ln-pie{padding-bottom:calc(96px + env(safe-area-inset-bottom))}
        }
        @media(max-width:420px){.ln-prob-chips{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media (prefers-reduced-motion:reduce){.ln *,.ln *::before,.ln *::after{animation:none !important;transition:none !important}.ln-aparece{opacity:1;transform:none}}
      `}</style>

      <nav className="ln-nav" aria-label="Principal">
        <div className="ln-nav-in">
          <Link href="/" className="ln-logo">Luma<span>.</span></Link>
          <div className="ln-nav-links">
            <a href="#funciones">Funciones</a>
            <a href="#plantillas">Plantillas</a>
            <a href="#precio">Planes</a>
            <a href="#preguntas">Preguntas</a>
          </div>
          <MenuEntradas />
        </div>
      </nav>

      <section className="ln-hero" aria-label="Presentación">
        <span className="ln-estrella ln-titila" aria-hidden="true" style={{ top: 140, left: '6%', fontSize: 18 }}>✦</span>
        <span className="ln-estrella ln-titila ln-d2" aria-hidden="true" style={{ top: 260, left: '44%', fontSize: 12, color: '#D6A6A5' }}>✦</span>
        <span className="ln-estrella ln-titila ln-d4" aria-hidden="true" style={{ bottom: 120, left: '12%', fontSize: 14, color: '#C9C0D9' }}>✦</span>
        <div className="ln-hero-in">
          <div className="ln-hero-txt">
            <span className="ln-pastilla ln-entrar"><i aria-hidden="true" />Para terapeutas holísticas, tarotistas y coaches</span>
            <h1 className="ln-h1 ln-entrar ln-d1">Tu consultorio entero, <span className="ln-subraya">en un solo lugar.</span></h1>
            <p className="ln-hero-sub ln-entrar ln-d2">Turnos, historial de cada consultante, cobros y una página donde reservan tus sesiones y compran tus cursos. Sin cinco herramientas distintas, sin saber de tecnología.</p>
            <div className="ln-hero-ctas ln-entrar ln-d3">
              <Link href="/auth/register" className="ln-btn-crema ln-pulso">Empezar gratis, 7 días sin tarjeta</Link>
              <a href="#plantillas" className="ln-btn-borde">Ver cómo queda tu página</a>
            </div>
            <span className="ln-hero-trust ln-entrar ln-d4">Sin tarjeta · Sin compromiso · Cancelás cuando quieras</span>
          </div>
          <div className="ln-hero-vis" aria-hidden="true">
            <div className="ln-anillo" />
            <div className="ln-halo" />
            <div className="ln-tel-atras ln-flotar ln-d2"><div><TelefonoLuma pantalla="reserva" /></div></div>
            <div className="ln-tel-frente ln-flotar"><div><TelefonoLuma pantalla="inicio" /></div></div>
            <div className="ln-notif ln-caer">
              <span className="ln-notif-ic">L</span>
              <span className="ln-notif-txt">
                <span className="ln-notif-top"><b>LUMA</b><span>ahora</span></span>
                <strong>Nueva reserva</strong>
                <span>Sofía reservó Lectura de tarot · jueves 18:00</span>
              </span>
            </div>
            <div className="ln-chip-cobro ln-flotar-giro">
              <i><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></i>
              <span><small>COBRO APROBADO</small><b>$15.000</b></span>
            </div>
            <div className="ln-chip-curso ln-flotar ln-d3"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9" r="6" /><path d="M8.5 14L7 22l5-3 5 3-1.5-8" /></svg>Lu terminó tu curso</div>
          </div>
        </div>
      </section>

      <section className="ln-chau" aria-label="Lo que dejás de usar">
        <div className="ln-chau-t">CHAU A TENER TODO DESPARRAMADO EN</div>
        <div className="ln-marq" aria-hidden="true">
          {[...CHAU, ...CHAU].map((c, i) => <span key={i}>{c}</span>)}
        </div>
        <p style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{CHAU.join(', ')}</p>
      </section>

      <section className="ln-cartas" aria-label="Lo que te pasa">
        <div className="ln-cartas-intro">
          <h2 className="ln-h2">No soy bruja, pero <em>adivino lo que te pasa</em>…</h2>
          <p className="ln-p">Scrolleá y confirmá</p>
        </div>
        {CARTAS.map((carta, i) => (
          <div key={i} ref={el => { cardRefs.current[i] = el }} className="c-card">
            <img src={carta.src} alt="" loading="lazy" decoding="async" className="c-card-img" style={{ transform: `rotate(${carta.rot}deg)` }} />
          </div>
        ))}
      </section>

      <section className="ln-promesa" aria-label="La promesa">
        <p className="ln-aparece">
          <span>Existe una sola herramienta</span>
          <span className="l2">hecha para el trabajo que hacés.</span>
          <span>No adaptada. No genérica. <em>Hecha para vos.</em></span>
        </p>
      </section>

      <section id="funciones" className="ln-wrap ln-fun" aria-label="Funciones">
        <div className="ln-fun-cab">
          <h2 className="ln-h2">Todo lo que hacés, <em>en un solo lugar</em></h2>
          <p className="ln-p">Así se ve Luma por dentro, de verdad.</p>
        </div>
        <div className="ln-tiles">
          <article className="ln-tile ancha ln-aparece" style={{ background: '#FFFCF7', border: '1px solid #E6DCCE' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div><span className="ln-tile-k" style={{ color: '#626B91' }}>AGENDA</span><h3>Tus turnos se ordenan solos</h3></div>
              <span style={{ alignSelf: 'flex-start', padding: '6px 10px', borderRadius: 99, background: '#D8EBDD', color: '#2F6646', fontSize: 11.5, fontWeight: 800, whiteSpace: 'nowrap' }}>Sin WhatsApp</span>
            </div>
            <div className="ln-semana">
              {SEMANA.map(d => (
                <div key={d.d} className="ln-dia"><b>{d.d}</b>{d.s.map(([t, bg, c]) => <span key={t} style={{ background: bg, color: c }}>{t}</span>)}</div>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.35, color: '#6E7388' }}>Tus consultantes reservan solas desde tu página, eligen día y hora, y el turno aparece acá.</p>
          </article>

          <article className="ln-tile media ln-aparece" style={{ background: '#DCD3E6' }}>
            <div><span className="ln-tile-k" style={{ color: '#4C5580' }}>HISTORIAL</span><h3>Sabés dónde quedaron</h3></div>
            <div className="ln-mini">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ width: 36, height: 36, borderRadius: '50%', background: '#F6E4E2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#A65A6E' }}>S</span><span style={{ display: 'flex', flexDirection: 'column' }}><b style={{ fontSize: 14 }}>Sofía M.</b><span style={{ fontSize: 12, color: '#6E7388' }}>5 sesiones · desde marzo</span></span></div>
              {HISTORIAL.map(h => <div key={h.t} className="ln-hist"><i style={{ background: h.c }} /><span><b>{h.t}</b><span>{h.d}</span></span></div>)}
            </div>
          </article>

          <article className="ln-tile media ln-aparece" style={{ background: '#F6E4E2' }}>
            <div><span className="ln-tile-k" style={{ color: '#8E5553' }}>COBROS Y FINANZAS</span><h3>Sabés cuánto ganaste</h3></div>
            <div className="ln-mini" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}><span style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 11, fontWeight: 700, color: '#6E7388' }}>Octubre</span><b style={{ font: "800 28px 'Inter',sans-serif", letterSpacing: '-0.03em' }}>$186.000</b></span><span style={{ fontSize: 12, fontWeight: 800, color: '#2F6646' }}>+22%</span></div>
              <div className="ln-barras">{BARRAS.map((h, i) => <span key={i} style={{ height: `${h}%`, animationDelay: `${i * 0.1}s`, background: i === 5 ? '#A65A6E' : '#EBCBC8' }} />)}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6E7388' }}><span>2 cobros pendientes</span><b style={{ color: '#A65A6E' }}>Avisar</b></div>
            </div>
          </article>

          <article className="ln-tile media ln-aparece" style={{ background: '#27344A', color: '#F0E6D8', boxShadow: '0 14px 34px rgba(39,52,74,0.2)' }}>
            <div><span className="ln-tile-k" style={{ color: '#C9C0D9' }}>CURSOS Y AULA · PREMIUM</span><h3>Vendé lo que sabés</h3></div>
            <div style={{ borderRadius: 22, background: 'rgba(240,230,216,0.08)', border: '1px solid rgba(240,230,216,0.16)', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <b style={{ fontSize: 14 }}>Tarot desde cero</b>
              <div style={{ height: 8, borderRadius: 99, background: 'rgba(240,230,216,0.15)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: '72%', borderRadius: 99, background: '#D6A6A5' }} /></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#C9C0D9' }}><span>24 alumnas</span><span>Clase 8 de 11</span></div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{['Certificados', 'Exámenes', 'Zoom'].map(x => <span key={x} style={{ padding: '6px 10px', borderRadius: 99, background: 'rgba(240,230,216,0.12)', fontSize: 11.5, fontWeight: 700 }}>{x}</span>)}</div>
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.35, color: '#C9C0D9' }}>Tus alumnas compran el curso desde la misma página donde reservan sus sesiones.</p>
          </article>

          <article className="ln-tile ancha ln-aparece" style={{ background: '#F7ECD3', flexDirection: 'row', flexWrap: 'wrap', gap: 22 }}>
            <div style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="ln-tile-k" style={{ color: '#8A6A22' }}>ALTAR DE IDEAS · NUEVO</span>
              <h3 style={{ margin: 0 }}>Tu contenido, con orden y con onda</h3>
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.35, color: '#6E5A2E' }}>Pizarra libre con stickers, planner de la semana y <b>Documento</b> para escribir tus guiones en hojas A4 y bajarlos en PDF.</p>
            </div>
            <div style={{ flex: '1 1 280px', position: 'relative', height: 210 }} aria-hidden="true">
              <div className="ln-flotar-giro" style={{ position: 'absolute', left: 0, top: 10, width: 150, padding: 12, borderRadius: 14, background: '#E2DAEF', boxShadow: '0 10px 22px rgba(39,52,74,0.14)', fontSize: 12.5, fontWeight: 700, lineHeight: 1.25 }}>Reel: el Loco no es un error</div>
              <div className="ln-flotar ln-d2" style={{ position: 'absolute', left: 30, top: 110, width: 140, padding: 12, borderRadius: 14, background: '#F6D3D1', boxShadow: '0 10px 22px rgba(39,52,74,0.14)', fontSize: 12.5, fontWeight: 700, lineHeight: 1.25 }}>Martes: carrusel de la luna</div>
              <div style={{ position: 'absolute', right: 0, top: 0, width: 150, height: 200, padding: '16px 14px', background: '#FFFFFF', borderRadius: 6, boxShadow: '0 14px 30px rgba(39,52,74,0.18)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 7, fontWeight: 800, letterSpacing: 1.4, color: '#A99BB8' }}>DOCUMENTO</span>
                <span className="ln-av" style={{ fontSize: 17 }}>El camino del Loco</span>
                {[92, 100, 60, 84, 70].map((w, i) => <span key={i} style={{ height: 4, width: `${w}%`, borderRadius: 2, background: i === 2 ? '#F6D3D1' : '#E6DCCE' }} />)}
                <span style={{ marginTop: 'auto', alignSelf: 'flex-end', fontSize: 9, fontWeight: 800, padding: '4px 7px', borderRadius: 8, background: '#27344A', color: '#F0E6D8' }}>PDF</span>
              </div>
            </div>
          </article>

          <article className="ln-tile media ln-aparece" style={{ background: '#E6E9F2' }}>
            <div><span className="ln-tile-k" style={{ color: '#4C5580' }}>TESTIMONIOS EN AUDIO</span><h3>Que te escuchen</h3></div>
            <div className="ln-mini" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 20 }} aria-hidden="true">
              <span className="ln-play"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg></span>
              <span className="ln-onda">{ONDAS.map((h, i) => <span key={i} style={{ height: h, background: i < 9 ? '#27344A' : '#A99BB8', animationDelay: `${i * 0.07}s` }} />)}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#6E7388' }}>0:24</span>
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.35, color: '#4C5580' }}>Subís los audios que tus consultantes te mandan por WhatsApp (con su permiso), los recortás desde el celu y quedan en tu página de reservas.</p>
          </article>

          <article className="ln-tile ancha ln-aparece" style={{ background: '#FFFCF7', border: '1px solid #E6DCCE', flexDirection: 'row', flexWrap: 'wrap', gap: 26 }}>
            <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
              <div><span className="ln-tile-k" style={{ color: '#626B91' }}>LUMA LINKS · GRATIS</span><h3>El link de tu bio, gratis</h3></div>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.4, color: '#4C5580' }}>Es la versión gratis de Luma, para poner en la bio de Instagram o TikTok. Una sola página con todos tus links (WhatsApp, Instagram, tu guía gratis), como un Linktree pero hecho para tarotistas. Y ves cuántas personas entran y qué tocan.</p>            </div>
            <div style={{ flex: '0 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }} aria-hidden="true">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
                <span style={{ width: 36, height: 36, borderRadius: '50%', background: '#DCD3E6', color: '#4C5580', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>✦</span>
                <span style={{ display: 'flex', flexDirection: 'column' }}><b style={{ fontSize: 14 }}>Luna Tarot</b><span style={{ fontSize: 11.5, color: '#6E7388' }}>Tarot y astrología</span></span>
              </div>
              <span className="ln-arco-link">Reservá tu lectura</span>
              <span className="ln-arco-link">Guía gratis de la luna</span>
              <span className="ln-arco-link" style={{ background: '#F7ECD3', borderColor: '#E9D6A6' }}>✦ Elegí una carta</span>
            </div>
          </article>
        </div>
      </section>

      <Probador />

      <section className="ln-wrap" style={{ paddingBottom: 100 }} aria-label="Privacidad">
        <div className="ln-priv ln-aparece">
          <div className="ln-priv-t">
            <span className="ln-priv-ic ln-flotar" aria-hidden="true"><svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#27344A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><circle cx="12" cy="15.5" r="1.4" /></svg></span>
            <h2 className="ln-h2">Lo que escribís de cada consultante <em>lo ves solo vos.</em></h2>
          </div>
          <div className="ln-priv-l">
            {PRIVACIDAD.map(p => <div key={p.t}><i aria-hidden="true"><Check /></i><span><b>{p.t}</b> {p.d}</span></div>)}
          </div>
        </div>
      </section>

      <section className="ln-lunes" aria-label="Imaginá el lunes">
        <div className="ln-lunes-in ln-aparece">
          <h2 className="ln-h2">Imaginá abrir el lunes <span className="ln-subraya">con todo claro.</span></h2>
          <p><b>Quién viene, cuánto cobrás</b> y qué trabajaron la última vez. Una notificación que dice <span className="rosa">«nueva reserva»</span> mientras tomás el café. <i>Tus cursos vendiendo solos</i> mientras das sesiones.</p>
          <p className="cierre">Sin buscar nada. Sin improvisar nada. Sin perder nada.</p>
        </div>
      </section>

      <VideoPresentacion />

      {TESTIMONIOS.length > 0 && (
        <section className="ln-wrap" style={{ paddingTop: 100, display: 'flex', flexDirection: 'column', gap: 34 }} aria-label="Testimonios">
          <h2 className="ln-h2">Lo que dicen <em style={{ color: '#A65A6E' }}>las que ya la usan</em></h2>
          <div className="ln-test">
            {TESTIMONIOS.map((x, i) => (
              <figure key={i} style={i % 3 === 1 ? { background: '#27344A', color: '#F0E6D8' } : i % 3 === 2 ? { background: '#DCD3E6' } : { background: '#FFFCF7', border: '1px solid #E6DCCE' }}>
                <blockquote>«{x.texto}»</blockquote>
                <figcaption style={{ marginTop: 'auto', fontSize: 13.5 }}><b>{x.nombre}</b> · {x.rol}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <section id="precio" className="ln-wrap ln-planes" style={{ scrollMarginTop: 20 }} aria-label="Planes">
        <div className="ln-planes-cab">
          <h2 className="ln-h2">Elegí tu plan</h2>
          <p className="ln-p">Sin contratos. Sin sorpresas. Nunca se cobra dos veces el mismo mes.</p>
        </div>
        <div className="ln-planes-grid">
          {PLANES.map(p => (
            <article key={p.id} className={`ln-plan ${p.id}`}>
              {p.id === 'premium' && <span className="ln-plan-badge">Más completo</span>}
              <span className="ln-plan-n">{p.n}</span>
              <span className="ln-plan-d">{p.d}</span>
              <span className="ln-plan-precio"><b>{p.precio}</b>{p.per && <span>{p.per}</span>}</span>
              <ul>{p.f.map(f => <li key={f}><i aria-hidden="true"><Check /></i><span>{f}</span></li>)}</ul>
              <Link href={p.href} className="ln-plan-btn">{p.cta}</Link>
              {p.id === 'links' && <a href="/l/priscila-43898a" target="_blank" rel="noopener noreferrer" className="ln-plan-ej">Ver página de ejemplo</a>}
            </article>
          ))}
        </div>
        <button type="button" className="ln-tabla-btn" aria-expanded={tabla} aria-controls="ln-tabla" onClick={() => setTabla(v => !v)}>
          {tabla ? 'Ocultar la comparación' : 'Ver todo lo que incluye cada plan'}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        {tabla && (
          <div className="ln-tabla" id="ln-tabla">
            <table>
              <thead><tr><th scope="col">INCLUYE</th><th scope="col">Links</th><th scope="col">Básico</th><th scope="col" style={{ color: '#A65A6E' }}>Premium</th></tr></thead>
              <tbody>
                {TABLA.map(([f, a, b, c]) => (
                  <tr key={f}><th scope="row">{f}</th>{[a, b, c].map((v, i) => <td key={i} className={v === '—' ? 'no' : i === 2 ? 'pr' : ''}>{v === '—' ? <span aria-label="No incluye">—</span> : v === '✓' ? <span aria-label="Incluye">✓</span> : v}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="preguntas" className="ln-faq" aria-label="Preguntas frecuentes">
        <h2 className="ln-h2">Lo que seguro te preguntás</h2>
        <div className="ln-faq-l">
          {PREGUNTAS.map(([q, r], i) => {
            const on = faq === i
            return (
              <div key={q} className={`ln-q${on ? ' on' : ''}`}>
                <button type="button" aria-expanded={on} aria-controls={`ln-r-${i}`} onClick={() => setFaq(on ? -1 : i)}>
                  {q}<i aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg></i>
                </button>
                {on && <p id={`ln-r-${i}`}>{r}</p>}
              </div>
            )
          })}
        </div>
      </section>

      <InstagramFlotante />
      <MetaPixel medirClicsRegistro />

      <section className="ln-cierre" aria-label="Empezá hoy">
        <span className="ln-estrella ln-titila" aria-hidden="true" style={{ top: 80, left: '18%', fontSize: 16 }}>✦</span>
        <span className="ln-estrella ln-titila ln-d3" aria-hidden="true" style={{ top: 160, right: '20%', fontSize: 12, color: '#D6A6A5' }}>✦</span>
        <div className="ln-cierre-in">
          <p className="l1">Dentro de <em>7 días</em> podés tener todo resuelto.</p>
          <p className="l2">O podés seguir igual.</p>
          <Link href="/auth/register" className="ln-btn-crema ln-pulso" style={{ minHeight: 60, padding: '0 32px', fontSize: 17 }}>Empezar gratis</Link>
          <span style={{ fontSize: 13.5, color: '#A99BB8' }}>Sin tarjeta · 7 días gratis · Cancelás cuando quieras</span>
        </div>
      </section>

      <footer className="ln-pie">
        <div className="ln-pie-in">
          <span className="ln-av" style={{ fontSize: 28, color: '#F0E6D8' }}>Luma<span style={{ color: '#D6A6A5' }}>.</span></span>
          <span className="ln-pie-links"><a href="/ayuda">Ayuda</a><a href="/politica-de-privacidad">Política de privacidad</a><a href="https://www.instagram.com/luma.webapp/" target="_blank" rel="noopener noreferrer">Instagram</a></span>
          <span>Hecho en Mar del Plata</span>
        </div>
      </footer>

      <BotonFijo />
    </div>
  )
}

// botón fijo de "Empezar gratis" en el celu: aparece después del hero y se esconde en el cierre
function BotonFijo() {
  const [ver, setVer] = useState(false)
  useEffect(() => {
    const mirar = () => {
      const y = window.scrollY
      const fin = document.documentElement.scrollHeight - window.innerHeight - 700
      setVer(y > 600 && y < fin)
    }
    mirar()
    window.addEventListener('scroll', mirar, { passive: true })
    return () => window.removeEventListener('scroll', mirar)
  }, [])
  return (
    <div className={`ln-fijo${ver ? '' : ' oculto'}`}>
      <Link href="/auth/register">Empezar gratis, 7 días</Link>
    </div>
  )
}
