'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [loadingWait, setLoadingWait] = useState(false)
  const [funnelStep, setFunnelStep] = useState(0)
  const funnelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) startFunnel() },
      { threshold: 0.3 }
    )
    if (funnelRef.current) observer.observe(funnelRef.current)
    return () => observer.disconnect()
  }, [])

  function startFunnel() {
    setFunnelStep(0)
    setTimeout(() => setFunnelStep(1), 400)
    setTimeout(() => setFunnelStep(2), 900)
    setTimeout(() => setFunnelStep(3), 1400)
    setTimeout(() => setFunnelStep(4), 1900)
  }

  async function handleNewsletter(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoadingWait(true)
    try {
      const supabase = createClient()
      await supabase.from('waitlist').insert({ email })
      setEnviado(true)
    } catch {
      setEnviado(true)
    } finally {
      setLoadingWait(false)
    }
  }

  const features = [
    {
      icon: '📋',
      title: 'Historial con contexto real',
      desc: 'Cada consultante tiene su historia. Escribí notas después de cada sesión, subí archivos y transcribí voz. Luma recuerda lo que importa para que vos puedas enfocarte en acompañar.',
      img: '/screenshots/pacientes.png',
      shadow: 'rgba(139,92,246,0.2)',
      accent: '#8B5CF6',
      bg: '#EDE8FF',
      flex: 2,
    },
    {
      icon: '📅',
      title: 'Agenda que se maneja sola',
      desc: 'Configurá tu disponibilidad una vez. Tus consultantes reservan en tu página pública y vos solo confirmás. Sin WhatsApp de ida y vuelta para coordinar horarios.',
      img: '/screenshots/agenda.png',
      shadow: 'rgba(236,72,153,0.2)',
      accent: '#EC4899',
      bg: '#FDF2F8',
      flex: 1.3,
    },
    {
      icon: '💰',
      title: 'Finanzas claras, sin Excel',
      desc: 'Registrá señas, pagos completos y pendientes. Visualizá tus ingresos por mes, por servicio y por cliente. Sabé exactamente cuánto ganaste este mes.',
      img: '/screenshots/finanzas.png',
      shadow: 'rgba(245,158,11,0.2)',
      accent: '#F59E0B',
      bg: '#FFFBEB',
      flex: 1.5,
    },
    {
      icon: '🌐',
      title: 'Tu página de reservas',
      desc: 'Una página personalizada con tu estilo, tus servicios y tus horarios. Lista en minutos. Compartí el link y tus consultantes reservan solas.',
      img: '/screenshots/pagina-publica.png',
      shadow: 'rgba(16,185,129,0.2)',
      accent: '#10B981',
      bg: '#ECFDF5',
      flex: 1.2,
    },
    {
      icon: '⚡',
      title: 'Cobros con Mercado Pago',
      desc: 'Cobrá señas o pagos completos antes de confirmar la reserva. Sin intermediarios, el dinero va directo a tu cuenta. Fin a las señas que nunca llegan.',
      img: '/screenshots/servicios.png',
      shadow: 'rgba(59,130,246,0.2)',
      accent: '#3B82F6',
      bg: '#EFF6FF',
      flex: 2,
    },
  ]

  const antes = [
    'WhatsApp con 200 mensajes sin responder',
    'Anotás en papel o en notas del celu',
    'No sabés cuánto cobraste este mes',
    'Olvidás el contexto de cada consultante',
    'La seña llegó... o no llegó?',
    'Empezás cada sesión de cero',
  ]

  const despues = [
    'Link de reserva — ellas eligen cuando quieren',
    'Historial digital con notas y archivos',
    'Dashboard de finanzas en tiempo real',
    'Contexto completo antes de cada sesión',
    'Cobro automático con Mercado Pago',
    'Todo el historial en un lugar',
  ]

  const funnelSteps = [
    { icon: '🌐', label: 'Tu consultante entra a tu página', sub: 'luma.st/tu-nombre', color: '#8B5CF6' },
    { icon: '📅', label: 'Elige servicio, fecha y hora', sub: 'Según tu disponibilidad real', color: '#EC4899' },
    { icon: '💳', label: 'Paga la seña o el total', sub: 'Con Mercado Pago, al instante', color: '#F59E0B' },
    { icon: '✓', label: 'La reserva aparece en tu dashboard', sub: 'Con todos sus datos y contexto', color: '#10B981' },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{font-family:'Geist',sans-serif;background:#FAFAFA;color:#0A0A0A;overflow-x:hidden}

        /* NAV */
        .nav{
          position:fixed;top:0;left:0;right:0;z-index:100;
          padding:0 40px;height:64px;
          display:flex;align-items:center;justify-content:space-between;
          background:rgba(250,250,250,0.9);
          backdrop-filter:blur(16px);
          border-bottom:1px solid rgba(0,0,0,0.06);
        }
        .nav-logo{font-size:22px;font-weight:900;color:#0A0A0A;letter-spacing:-1px;text-decoration:none}
        .nav-logo span{color:#8B5CF6}
        .nav-links{display:flex;align-items:center;gap:32px}
        .nav-link{font-size:14px;color:#525252;text-decoration:none;font-weight:500;transition:color 0.2s}
        .nav-link:hover{color:#0A0A0A}
        .nav-actions{display:flex;align-items:center;gap:10px}
        .btn-ghost{padding:8px 16px;background:transparent;color:#0A0A0A;border:1.5px solid #E5E5E5;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;transition:all 0.2s}
        .btn-ghost:hover{border-color:#A3A3A3}
        .btn-dark{padding:8px 18px;background:#0A0A0A;color:white;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;transition:all 0.2s;box-shadow:0 2px 8px rgba(0,0,0,0.15)}
        .btn-dark:hover{background:#262626;transform:translateY(-1px)}

        /* HERO */
        .hero{
          padding:148px 5% 0;
          text-align:center;
        }
        .hero-badge{
          display:inline-flex;align-items:center;gap:8px;
          padding:6px 16px;background:white;border:1px solid #E5E5E5;
          border-radius:100px;font-size:12px;font-weight:600;color:#525252;
          margin-bottom:36px;box-shadow:0 2px 8px rgba(0,0,0,0.06);
        }
        .hero-badge-dot{width:6px;height:6px;border-radius:50%;background:#10B981;animation:pulse 2s infinite}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.8)}}
        .hero-title{
          font-size:clamp(52px,9.5vw,108px);
          font-weight:900;
          line-height:0.95;
          letter-spacing:-5px;
          color:#0A0A0A;
          margin:0 auto 28px;
          max-width:90%;
        }
        .hero-title .accent{
          background:linear-gradient(135deg,#8B5CF6 0%,#EC4899 50%,#F59E0B 100%);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
        }
        .hero-sub{
          font-size:19px;color:#525252;line-height:1.65;
          max-width:560px;margin:0 auto 44px;font-weight:400;
        }
        .hero-actions{
          display:flex;align-items:center;justify-content:center;
          gap:12px;flex-wrap:wrap;margin-bottom:20px;
        }
        .btn-primary{
          padding:16px 36px;background:#0A0A0A;color:white;
          border:none;border-radius:12px;font-size:16px;font-weight:700;
          cursor:pointer;font-family:'Geist',sans-serif;letter-spacing:-0.3px;
          transition:all 0.2s;text-decoration:none;display:inline-block;
          box-shadow:0 4px 20px rgba(0,0,0,0.25);
        }
        .btn-primary:hover{background:#262626;transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,0.3)}
        .btn-secondary{
          padding:16px 36px;background:white;color:#0A0A0A;
          border:1.5px solid #E5E5E5;border-radius:12px;
          font-size:16px;font-weight:700;cursor:pointer;
          font-family:'Geist',sans-serif;letter-spacing:-0.3px;
          transition:all 0.2s;text-decoration:none;display:inline-block;
        }
        .btn-secondary:hover{border-color:#A3A3A3;transform:translateY(-2px)}
        .hero-trust{font-size:13px;color:#A3A3A3;margin-bottom:56px}

        /* DASHBOARD — transición fluida hacia features */
        .dash-outer{
          position:relative;
          padding:0 5%;
          /* El fade cubre el fondo de la sección + el inicio de features */
        }
        .dash-img-wrap{
          position:relative;
          border-radius:20px 20px 0 0;
          overflow:hidden;
          border:1.5px solid #E5E5E5;
          border-bottom:none;
          box-shadow:0 20px 80px rgba(0,0,0,0.12),0 0 0 1px rgba(0,0,0,0.03);
        }
        .dash-img{width:100%;display:block}
        /* Degradé que cubre el fondo de la imagen Y la transición a la siguiente sección */
        .dash-fade{
          position:absolute;
          bottom:0;left:0;right:0;
          height:60%;
          background:linear-gradient(
            to bottom,
            transparent 0%,
            rgba(250,250,250,0.4) 40%,
            rgba(250,250,250,0.85) 65%,
            #FAFAFA 90%,
            #FAFAFA 100%
          );
          pointer-events:none;
        }

        /* FEATURES */
        .features-section{
          padding:0 5% 80px;
          position:relative;
          z-index:1;
        }
        .features-header{text-align:center;margin-bottom:52px}
        .section-label{font-size:11px;font-weight:700;color:#8B5CF6;letter-spacing:3px;text-transform:uppercase;margin-bottom:12px;margin-top:70px;display:block}
        .section-title{font-size:clamp(30px,4vw,50px);font-weight:900;letter-spacing:-2px;line-height:1.05;color:#0A0A0A;margin-bottom:14px}
        .section-sub{font-size:16px;color:#737373;line-height:1.6;max-width:480px;margin:0 auto}

        /* BRICKS */
        .bricks{
          display:flex;
          flex-wrap:wrap;
          gap:16px;
          align-items:stretch;
        }
        .brick{
          flex:var(--flex,1);
          min-width:260px;
          border-radius:22px;
          overflow:hidden;
          border:1.5px solid rgba(0,0,0,0.06);
          box-shadow:0 4px 24px var(--shadow);
          background:var(--face-bg);
          position:relative;
          transition:transform 0.3s,box-shadow 0.3s;
          display:flex;
          flex-direction:column;
        }
        .brick:hover{transform:translateY(-6px);box-shadow:0 20px 50px var(--shadow)}

        /* Imagen sin recorte — muestra completa con object-fit contain */
        .brick-img-wrap{
          flex:0 0 auto;
          overflow:hidden;
          border-bottom:1px solid rgba(0,0,0,0.06);
          background:var(--face-bg);
          display:flex;align-items:flex-start;justify-content:center;
          height:220px;
        }
        .brick-img-wrap img{
          width:100%;
          height:100%;
          object-fit:cover;
          object-position:top center;
          display:block;
          transition:transform 0.5s;
        }
        .brick:hover .brick-img-wrap img{transform:scale(1.04)}

        /* Contenido debajo de la imagen */
        .brick-content{
          padding:22px 24px 26px;
          flex:1;
        }
        .brick-icon{
          font-size:20px;margin-bottom:10px;display:block;
        }
        .brick-title{
          font-size:17px;font-weight:800;
          color:#0A0A0A;letter-spacing:-0.5px;
          line-height:1.2;margin-bottom:10px;
        }
        .brick-desc{
          font-size:14px;color:#525252;line-height:1.65;font-weight:400;
        }

        /* Borde de color arriba de cada brick */
        .brick::before{
          content:'';
          position:absolute;top:0;left:0;right:0;
          height:3px;
          background:var(--accent);
          border-radius:22px 22px 0 0;
        }

        /* COMPARE */
        .compare-section{
          padding:100px 5%;background:#0A0A0A;
          position:relative;overflow:hidden;
        }
        .compare-glow{position:absolute;width:700px;height:400px;border-radius:50%;background:radial-gradient(circle,rgba(139,92,246,0.1),transparent 70%);bottom:-150px;left:50%;transform:translateX(-50%);pointer-events:none}
        .compare-inner{max-width:1000px;margin:0 auto}
        .compare-header{text-align:center;margin-bottom:60px}
        .compare-header .section-label{color:#A78BFA}
        .compare-header .section-title{color:white}
        .compare-header .section-sub{color:#737373;margin:0 auto}
        .compare-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
        .compare-col{border-radius:20px;padding:36px}
        .compare-col.antes{background:#111111;border:1.5px solid #1F1F1F}
        .compare-col.despues{background:linear-gradient(135deg,#1A0A3C,#2D1060);border:1.5px solid rgba(139,92,246,0.25);box-shadow:0 0 60px rgba(139,92,246,0.08)}
        .compare-col-hdr{display:flex;align-items:center;gap:12px;margin-bottom:28px}
        .compare-col-icon{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:16px}
        .compare-col.antes .compare-col-icon{background:#1A1A1A}
        .compare-col.despues .compare-col-icon{background:rgba(139,92,246,0.15)}
        .compare-col-label{font-size:16px;font-weight:700}
        .compare-col.antes .compare-col-label{color:#525252}
        .compare-col.despues .compare-col-label{color:#C4B5FD}
        .compare-item{display:flex;align-items:flex-start;gap:12px;padding:11px 0;border-bottom:1px solid rgba(255,255,255,0.04)}
        .compare-item:last-child{border-bottom:none;padding-bottom:0}
        .compare-item-ico{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;flex-shrink:0;margin-top:1px;font-weight:700}
        .compare-col.antes .compare-item-ico{background:#1A1A1A;color:#525252}
        .compare-col.despues .compare-item-ico{background:rgba(139,92,246,0.15);color:#A78BFA}
        .compare-item-text{font-size:14px;line-height:1.5}
        .compare-col.antes .compare-item-text{color:#525252}
        .compare-col.despues .compare-item-text{color:#E5E5E5}

        /* FUNNEL */
        .funnel-section{padding:100px 5%;max-width:760px;margin:0 auto;text-align:center}
        .funnel-steps{margin-top:56px;display:flex;flex-direction:column;gap:4px}
        .funnel-step{display:flex;align-items:center;gap:20px;padding:22px 28px;background:white;border:1.5px solid #F0F0F0;border-radius:16px;transition:all 0.6s cubic-bezier(0.4,0,0.2,1);opacity:0;transform:translateY(16px);text-align:left;position:relative;overflow:hidden}
        .funnel-step::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--sc);border-radius:0 3px 3px 0}
        .funnel-step.vis{opacity:1;transform:translateY(0)}
        .funnel-step-icon{width:48px;height:48px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;background:var(--sb)}
        .funnel-step-body{flex:1}
        .funnel-step-label{font-size:16px;font-weight:700;color:#0A0A0A;letter-spacing:-0.3px;margin-bottom:2px}
        .funnel-step-sub{font-size:13px;color:#A3A3A3}
        .funnel-num{width:30px;height:30px;border-radius:50%;border:1.5px solid #E5E5E5;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#A3A3A3;flex-shrink:0}
        .funnel-connector{height:20px;display:flex;align-items:center;justify-content:center;color:#E5E5E5;font-size:16px;opacity:0;transition:opacity 0.5s 0.2s}
        .funnel-connector.vis{opacity:1}

        /* PRECIO */
        .precio-section{padding:80px 5%;text-align:center;border-top:1.5px solid #F0F0F0;border-bottom:1.5px solid #F0F0F0}
        .precio-card{background:white;border:1.5px solid #E5E5E5;border-radius:24px;padding:48px 40px;max-width:420px;margin:40px auto 0;box-shadow:0 8px 40px rgba(0,0,0,0.06);position:relative;overflow:hidden}
        .precio-card::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#8B5CF6,#EC4899,#F59E0B)}
        .precio-amount{display:flex;align-items:flex-end;justify-content:center;gap:4px;margin:20px 0 8px}
        .precio-num{font-size:64px;font-weight:900;letter-spacing:-3px;color:#0A0A0A;line-height:1}
        .precio-unit{font-size:16px;color:#A3A3A3;margin-bottom:10px;font-weight:500}
        .precio-trial{display:inline-block;padding:5px 14px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:20px;font-size:12px;font-weight:600;color:#166534;margin-bottom:28px}
        .precio-feature{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #F5F5F5;font-size:14px;color:#404040;text-align:left}
        .precio-feature:last-of-type{border-bottom:none}
        .precio-check{color:#8B5CF6;font-weight:800;font-size:13px;flex-shrink:0}

        /* CTA */
        .cta-section{padding:100px 5%;text-align:center;background:linear-gradient(135deg,#F4F0FF 0%,#FFF0F8 50%,#F0F4FF 100%)}
        .cta-inner{max-width:560px;margin:0 auto}
        .cta-title{font-size:clamp(36px,5vw,64px);font-weight:900;letter-spacing:-3px;line-height:1;color:#0A0A0A;margin-bottom:16px}
        .cta-sub{font-size:17px;color:#525252;margin-bottom:36px;line-height:1.6}
        .cta-actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:32px}
        .newsletter-form{display:flex;gap:10px;max-width:420px;margin:0 auto}
        .newsletter-input{flex:1;padding:13px 16px;border-radius:10px;border:1.5px solid #E5E5E5;font-size:14px;font-family:'Geist',sans-serif;color:#0A0A0A;outline:none;background:white;transition:border-color 0.2s}
        .newsletter-input:focus{border-color:#8B5CF6;box-shadow:0 0 0 3px rgba(139,92,246,0.1)}
        .newsletter-input::placeholder{color:#A3A3A3}
        .newsletter-btn{padding:13px 20px;background:#8B5CF6;color:white;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Geist',sans-serif;white-space:nowrap;transition:all 0.2s}
        .newsletter-btn:hover{background:#7C3AED;transform:translateY(-1px)}
        .newsletter-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none}
        .newsletter-success{display:flex;align-items:center;gap:10px;justify-content:center;padding:14px 20px;background:#F0FDF4;border:1.5px solid #BBF7D0;border-radius:12px;font-size:14px;color:#166534;font-weight:500;max-width:420px;margin:0 auto}
        .cta-note{font-size:13px;color:#A3A3A3;margin-top:14px}

        /* FOOTER */
        .footer{padding:32px 5%;border-top:1px solid #F0F0F0}
        .footer-inner{max-width:100%;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px}
        .footer-logo{font-size:18px;font-weight:900;color:#0A0A0A;letter-spacing:-0.5px}
        .footer-logo span{color:#8B5CF6}
        .footer-links{display:flex;gap:20px}
        .footer-link{font-size:13px;color:#A3A3A3;text-decoration:none;transition:color 0.2s}
        .footer-link:hover{color:#0A0A0A}
        .footer-copy{font-size:13px;color:#A3A3A3}

        /* RESPONSIVE */
        @media(max-width:768px){
          .nav-links,.nav-actions .btn-ghost{display:none}
          .hero{padding:100px 20px 0}
          .hero-title{letter-spacing:-2.5px;max-width:100%}
          .dash-outer{padding:0 16px}
          .features-section{padding:0 16px 60px}
          .bricks{flex-direction:column}
          .brick{flex:1 !important;min-width:unset}
          .brick-img-wrap{height:180px}
          .compare-section{padding:60px 20px}
          .compare-grid{grid-template-columns:1fr}
          .compare-col.antes{display:none}
          .funnel-section{padding:60px 20px}
          .precio-section{padding:60px 20px}
          .cta-section{padding:60px 20px}
          .cta-actions{flex-direction:column;align-items:stretch}
          .newsletter-form{flex-direction:column}
          .footer{padding:24px 20px}
          .footer-inner{flex-direction:column;text-align:center}
          .footer-links{justify-content:center}
        }
        @media(max-width:480px){
          .hero{padding:90px 16px 0}
          .hero-title{font-size:clamp(40px,11vw,60px);letter-spacing:-2px}
          .hero-actions{flex-direction:column;width:100%}
          .btn-primary,.btn-secondary{width:100%;text-align:center}
        }
      `}</style>

      {/* NAV */}
      <nav className="nav">
        <a href="#" className="nav-logo">Luma<span>.</span></a>
        <div className="nav-links">
          <a href="#funciones" className="nav-link">Funciones</a>
          <a href="#compare" className="nav-link">Antes y después</a>
          <a href="#precio" className="nav-link">Precio</a>
        </div>
        <div className="nav-actions">
          <Link href="/auth/login" className="btn-ghost">Iniciar sesión</Link>
          <Link href="/auth/register" className="btn-dark">Empezar gratis</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-badge">
          <div className="hero-badge-dot"/>
          Lanzamiento · ARS $9.900/mes · 7 días gratis
        </div>
        <h1 className="hero-title">
          Tu trabajo,<br/>
          <span className="accent">organizado de verdad.</span>
        </h1>
        <p className="hero-sub">
          Agenda, historial de consultantes, cobros y página de reservas — todo en un solo lugar. Para terapeutas, tarotistas y coaches que quieren trabajar con claridad.
        </p>
        <div className="hero-actions">
          <Link href="/auth/register" className="btn-primary">Empezar gratis — 7 días</Link>
          <Link href="/auth/login" className="btn-secondary">Ya tengo cuenta</Link>
        </div>
        <p className="hero-trust">Sin tarjeta de crédito · Cancelás cuando querés</p>
      </section>

      {/* DASHBOARD — transición fluida */}
      <div className="dash-outer">
        <div className="dash-img-wrap">
          <img src="/screenshots/dashboard.png" alt="Dashboard de Luma" className="dash-img"/>
          <div className="dash-fade"/>
        </div>
      </div>

      {/* FEATURES */}
      <section className="features-section" id="funciones">
        <div className="features-header">
          <span className="section-label">Funciones</span>
          <h2 className="section-title">Todo lo que necesitás.</h2>
          <p className="section-sub">Diseñado para profesionales del bienestar. No para empresas.</p>
        </div>
        <div className="bricks">
          {features.map((f, i) => (
            <div key={i} className="brick"
              style={{
                '--flex': f.flex,
                '--shadow': f.shadow,
                '--face-bg': f.bg,
                '--accent': f.accent,
              } as any}>
              <div className="brick-img-wrap">
                <img src={f.img} alt={f.title}/>
              </div>
              <div className="brick-content">
                <span className="brick-icon">{f.icon}</span>
                <div className="brick-title">{f.title}</div>
                <div className="brick-desc">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ANTES / DESPUÉS */}
      <div className="compare-section" id="compare">
        <div className="compare-glow"/>
        <div className="compare-inner">
          <div className="compare-header">
            <span className="section-label">Antes y después</span>
            <h2 className="section-title">De caos a claridad.</h2>
            <p className="section-sub">Así cambia tu trabajo cuando tenés las herramientas correctas.</p>
          </div>
          <div className="compare-grid">
            <div className="compare-col antes">
              <div className="compare-col-hdr">
                <div className="compare-col-icon">😵</div>
                <div className="compare-col-label">Sin Luma</div>
              </div>
              {antes.map((item, i) => (
                <div key={i} className="compare-item">
                  <div className="compare-item-ico">✕</div>
                  <div className="compare-item-text">{item}</div>
                </div>
              ))}
            </div>
            <div className="compare-col despues">
              <div className="compare-col-hdr">
                <div className="compare-col-icon">✨</div>
                <div className="compare-col-label">Con Luma</div>
              </div>
              {despues.map((item, i) => (
                <div key={i} className="compare-item">
                  <div className="compare-item-ico">✓</div>
                  <div className="compare-item-text">{item}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FUNNEL */}
      <section className="funnel-section" ref={funnelRef}>
        <span className="section-label">Cómo funciona</span>
        <h2 className="section-title">De reserva a sesión en 4 pasos.</h2>
        <p className="section-sub" style={{margin:'0 auto'}}>Tu consultante reserva sola. Vos te enfocás en acompañar.</p>
        <div className="funnel-steps">
          {funnelSteps.map((step, i) => (
            <div key={i}>
              <div className={`funnel-step${funnelStep > i ? ' vis' : ''}`}
                style={{'--sc':step.color,'--sb':step.color+'18',transitionDelay:`${i*0.08}s`} as any}>
                <div className="funnel-step-icon">{step.icon}</div>
                <div className="funnel-step-body">
                  <div className="funnel-step-label">{step.label}</div>
                  <div className="funnel-step-sub">{step.sub}</div>
                </div>
                <div className="funnel-num">{i + 1}</div>
              </div>
              {i < funnelSteps.length - 1 && (
                <div className={`funnel-connector${funnelStep > i + 1 ? ' vis' : ''}`}>↓</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* PRECIO */}
      <section className="precio-section" id="precio">
        <span className="section-label">Precio</span>
        <h2 className="section-title" style={{fontSize:'clamp(32px,4vw,48px)'}}>Simple y directo.</h2>
        <div className="precio-card">
          <div style={{fontSize:'11px',fontWeight:700,color:'#8B5CF6',letterSpacing:'3px',textTransform:'uppercase'}}>Todo incluido</div>
          <div className="precio-amount">
            <span style={{fontSize:'16px',color:'#A3A3A3',marginBottom:'10px',fontWeight:500}}>ARS</span>
            <span className="precio-num">9.900</span>
            <span className="precio-unit">/mes</span>
          </div>
          <div className="precio-trial">7 días gratis · Sin tarjeta</div>
          {[
            'Dashboard completo',
            'Página de reservas pública',
            'Mercado Pago integrado',
            'Historial ilimitado de consultantes',
            'Archivos y notas por consultante',
            'Soporte por WhatsApp',
          ].map((item, i) => (
            <div key={i} className="precio-feature">
              <span className="precio-check">✓</span>{item}
            </div>
          ))}
          <Link href="/auth/register" className="btn-primary"
            style={{display:'block',marginTop:'28px',textAlign:'center',borderRadius:'10px'}}>
            Empezar gratis
          </Link>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="cta-section">
        <div className="cta-inner">
          <h2 className="cta-title">Tu trabajo merece<br/>mejores herramientas.</h2>
          <p className="cta-sub">Empezá gratis hoy. Sin tarjeta, sin compromiso.</p>
          <div className="cta-actions">
            <Link href="/auth/register" className="btn-primary">Crear cuenta gratis</Link>
            <Link href="/auth/login" className="btn-secondary">Iniciar sesión</Link>
          </div>
          {enviado ? (
            <div className="newsletter-success">
              <span>✓</span> ¡Listo! Te avisamos con novedades.
            </div>
          ) : (
            <form className="newsletter-form" onSubmit={handleNewsletter}>
              <input className="newsletter-input" type="email" required
                placeholder="Suscribite al newsletter"
                value={email} onChange={e => setEmail(e.target.value)}/>
              <button className="newsletter-btn" type="submit" disabled={loadingWait}>
                {loadingWait ? '...' : 'Suscribirse'}
              </button>
            </form>
          )}
          <p className="cta-note">Solo novedades importantes. Sin spam.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-logo">Luma<span>.</span></div>
          <div className="footer-links">
            <a href="/privacidad" className="footer-link">Privacidad</a>
            <a href="/terminos" className="footer-link">Términos</a>
            <Link href="/auth/login" className="footer-link">Iniciar sesión</Link>
          </div>
          <div className="footer-copy">© 2025 Luma · Para profesionales del bienestar</div>
        </div>
      </footer>
    </>
  )
}