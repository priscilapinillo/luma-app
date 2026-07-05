'use client'

import { useState } from 'react'
import Link from 'next/link'

/** Editar manualmente cuando cambie la disponibilidad */
const LAUNCH_SPOTS_LEFT = 18

const DOLOR_ITEMS = [
  'Buscás entre chats de WhatsApp antes de cada sesión',
  'No recordás qué trabajaste con una paciente hace tres semanas',
  'No sabés cuánto ganaste este mes sin hacer cuentas',
  'Tus pacientes te preguntan cómo reservar y les mandás un audio',
  'Si perdés el celular, perdés años de trabajo',
]

const SIN_LUMA = [
  'WhatsApp',
  'Cuaderno',
  'Google Calendar',
  'Planilla de Excel',
  'Notas del celu',
  'Tu memoria',
]

const CON_LUMA = ['Un solo lugar.']

const BENEFICIOS = [
  {
    accent: '#8B5CF6',
    bg: '#EDE8FF',
    shadow: 'rgba(139,92,246,0.2)',
    antes: 'reconstruís de memoria qué trabajaste con cada paciente',
    despues: 'abrís su ficha y en 10 segundos sabés toda su historia',
  },
  {
    accent: '#EC4899',
    bg: '#FDF2F8',
    shadow: 'rgba(236,72,153,0.2)',
    antes: 'coordinás turnos por WhatsApp durante 20 minutos',
    despues: 'tu paciente entra a tu página, elige horario y reserva sola',
  },
  {
    accent: '#F59E0B',
    bg: '#FFFBEB',
    shadow: 'rgba(245,158,11,0.2)',
    antes: 'no sabés cuánto ganaste sin revisar tres lugares distintos',
    despues: 'abrís el dashboard y lo ves en tiempo real',
  },
  {
    accent: '#10B981',
    bg: '#ECFDF5',
    shadow: 'rgba(16,185,129,0.2)',
    antes: 'tu trabajo entero depende de un celular',
    despues: 'todo está en la plataforma, accesible desde cualquier dispositivo',
  },
]

const FAQ_ITEMS = [
  {
    q: '¿Necesito saber de tecnología?',
    a: 'No. Se configura en menos de 10 minutos.',
  },
  {
    q: '¿Mis datos están seguros?',
    a: 'Sí. Cada terapeuta solo ve su propia información.',
  },
  {
    q: '¿Funciona para lecturas de tarot y reiki?',
    a: 'Sí. Está hecha específicamente para profesionales del bienestar.',
  },
  {
    q: '¿Puedo cancelar cuando quiero?',
    a: 'Sí, sin trámites ni penalidades.',
  },
  {
    q: '¿Qué pasa cuando terminan los 7 días gratis?',
    a: 'Te avisamos antes de que venza el período. Si querés continuar, cargás tu método de pago. Si no, no se cobra nada.',
  },
]

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

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

        /* DASHBOARD */
        .dash-outer{position:relative;padding:0 5%}
        .dash-img-wrap{
          position:relative;
          border-radius:20px 20px 0 0;
          overflow:hidden;
          border:1.5px solid #E5E5E5;
          border-bottom:none;
          box-shadow:0 20px 80px rgba(0,0,0,0.12),0 0 0 1px rgba(0,0,0,0.03);
        }
        .dash-img{width:100%;display:block}
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

        /* SECTIONS */
        .section-block{padding:100px 5%;position:relative}
        .section-block.lavender{background:#EDE8FF}
        .section-inner{max-width:1000px;margin:0 auto}
        .section-header{text-align:center;margin-bottom:60px}
        .section-label{font-size:11px;font-weight:700;color:#8B5CF6;letter-spacing:3px;text-transform:uppercase;margin-bottom:12px;display:block}
        .section-title{font-size:clamp(30px,4vw,50px);font-weight:900;letter-spacing:-2px;line-height:1.05;color:#0A0A0A;margin-bottom:14px}
        .section-sub{font-size:16px;color:#737373;line-height:1.6;max-width:480px;margin:0 auto}

        /* DOLOR */
        .dolor-list{display:flex;flex-direction:column;gap:12px;max-width:640px;margin:0 auto 48px}
        .dolor-item{
          display:flex;align-items:flex-start;gap:14px;
          padding:20px 24px;background:white;
          border:1.5px solid rgba(0,0,0,0.06);
          border-radius:16px;
          box-shadow:0 4px 24px rgba(0,0,0,0.04);
          font-size:15px;color:#525252;line-height:1.65;
          transition:transform 0.2s,box-shadow 0.2s;
        }
        .dolor-item:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,0,0,0.08)}
        .dolor-check{
          width:22px;height:22px;border-radius:6px;flex-shrink:0;margin-top:2px;
          background:#EDE8FF;border:1.5px solid #8B5CF6;
          display:flex;align-items:center;justify-content:center;
        }
        .dolor-check svg{width:12px;height:12px;stroke:#8B5CF6;stroke-width:2.5;fill:none}
        .dolor-close{
          text-align:center;font-size:18px;font-weight:600;color:#0A0A0A;
          line-height:1.65;max-width:560px;margin:0 auto;
        }
        .dolor-close span{color:#8B5CF6}

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
        .compare-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
        .compare-col{border-radius:20px;padding:36px}
        .compare-col.antes{background:#111111;border:1.5px solid #1F1F1F}
        .compare-col.despues{background:linear-gradient(135deg,#1A0A3C,#2D1060);border:1.5px solid rgba(139,92,246,0.25);box-shadow:0 0 60px rgba(139,92,246,0.08)}
        .compare-col-hdr{display:flex;align-items:center;gap:12px;margin-bottom:28px}
        .compare-col-icon{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800}
        .compare-col.antes .compare-col-icon{background:#1A1A1A;color:#525252}
        .compare-col.despues .compare-col-icon{background:rgba(139,92,246,0.15);color:#A78BFA}
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

        /* BENEFICIOS — estilo bricks */
        .beneficios-section{padding:0 5% 80px;position:relative;z-index:1}
        .beneficios-grid{
          display:grid;
          grid-template-columns:repeat(2,1fr);
          gap:16px;
          max-width:1000px;
          margin:0 auto;
        }
        .beneficio-brick{
          border-radius:22px;
          overflow:hidden;
          border:1.5px solid rgba(0,0,0,0.06);
          box-shadow:0 4px 24px var(--shadow);
          background:var(--face-bg);
          position:relative;
          transition:transform 0.3s,box-shadow 0.3s;
          padding:28px 28px 32px;
        }
        .beneficio-brick:hover{transform:translateY(-6px);box-shadow:0 20px 50px var(--shadow)}
        .beneficio-brick::before{
          content:'';
          position:absolute;top:0;left:0;right:0;
          height:3px;
          background:var(--accent);
          border-radius:22px 22px 0 0;
        }
        .beneficio-tag{
          font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;
          margin-bottom:8px;display:block;
        }
        .beneficio-tag.antes{color:#A3A3A3}
        .beneficio-tag.despues{color:var(--accent)}
        .beneficio-text{font-size:14px;color:#525252;line-height:1.65;margin-bottom:20px}
        .beneficio-text.last{margin-bottom:0;color:#0A0A0A;font-weight:600}

       /* ==========================================
   SECCIÓN PRECIO
========================================== */

.precio-section{
    position:relative;
    padding:120px 20px;
    display:flex;
    justify-content:center;
    align-items:center;
}

.precio-card{
    position:relative;
    width:min(100%,900px);

    padding:60px;

    border-radius:32px;

    background:white;

    overflow:hidden;

    border:1px solid rgba(139,92,246,.15);

    box-shadow:
    0 30px 80px rgba(0,0,0,.08),
    0 15px 40px rgba(139,92,246,.12);
}


/* Borde animado */

.precio-card::before{

    content:"";

    position:absolute;

    inset:-2px;

    border-radius:34px;

    background:linear-gradient(
    90deg,
    transparent,
    #8B5CF6,
    #C9A84C,
    #8B5CF6,
    transparent);

    background-size:300%;

    animation:borderFlow 6s linear infinite;

    z-index:-2;

}

.precio-card::after{

    content:"";

    position:absolute;

    inset:2px;

    background:white;

    border-radius:30px;

    z-index:-1;

}

@keyframes borderFlow{

0%{background-position:0%}

100%{background-position:300%}

}


/* Badge */

.launch-badge{

display:inline-flex;

padding:10px 18px;

border-radius:999px;

background:#8B5CF6;

color:white;

font-weight:700;

font-size:.9rem;

margin-bottom:22px;

}


/* Precio viejo */

.precio-old{

font-size:30px;

text-decoration:line-through;

opacity:.35;

margin-bottom:8px;

}


/* Precio */

.precio-amount{

display:flex;

justify-content:center;

align-items:flex-start;

margin-bottom:10px;

}

.precio-num{

font-size:84px;

font-weight:800;

line-height:.9;

color:#8B5CF6;

}

.precio-unit{

font-size:28px;

margin-top:18px;

margin-left:10px;

font-weight:600;

}


/* Texto */

.precio-forever{

font-size:18px;

font-weight:600;

margin-bottom:40px;

}


/* CONTADOR */

.spots-box{

margin:40px 0;

padding:22px;

border-radius:18px;

background:#ff494e;

border:2px solid #870abb;

}

.spots-title{

font-weight:700;

font-size:18px;

margin-bottom:15px;

}

.spots-counter{

display:flex;

justify-content:center;

gap:10px;

margin-bottom:15px;

}

.spot-number{

width:54px;

height:64px;

display:flex;

align-items:center;

justify-content:center;

background:#111;

color:white;

font-size:34px;

font-weight:800;

border-radius:10px;

box-shadow:
0 5px 18px rgba(0,0,0,.25);

}


/* Beneficios */

.features-list{

margin:40px 0;

display:grid;

grid-template-columns:repeat(2,minmax(0,1fr));

gap:18px;

text-align:left;

}

.features-list li{

list-style:none;

padding-left:30px;

position:relative;

font-size:17px;

line-height:1.6;

}

.features-list li::before{

content:"✓";

position:absolute;

left:0;

color:#8B5CF6;

font-weight:bold;

}


/* Botón */

.precio-card .btn-primary{

margin-top:35px;

width:100%;

padding:20px;

font-size:22px;

border-radius:16px;

font-weight:700;

}


/* Mobile */

@media(max-width:768px){

.precio-card{

padding:35px 24px;

}

.precio-num{

font-size:62px;

}

.features-list{

grid-template-columns:1fr;

}

.spot-number{

width:45px;

height:54px;

font-size:28px;

}

}

}

        /* GARANTÍA */
        .garantia-section{
          padding:80px 5%;text-align:center;
          border-top:1.5px solid #F0F0F0;border-bottom:1.5px solid #F0F0F0;
        }
        .garantia-text{
          font-size:clamp(18px,3vw,22px);font-weight:600;color:#0A0A0A;
          line-height:1.65;max-width:560px;margin:0 auto;
        }

        /* FAQ */
        .faq-section{padding:100px 5%;max-width:760px;margin:0 auto}
        .faq-list{display:flex;flex-direction:column;gap:8px;margin-top:56px}
        .faq-item{
          background:white;border:1.5px solid #F0F0F0;border-radius:16px;
          overflow:hidden;transition:all 0.2s;
        }
        .faq-item:hover{box-shadow:0 4px 24px rgba(0,0,0,0.06)}
        .faq-item.open{border-color:rgba(139,92,246,0.2);box-shadow:0 4px 24px rgba(139,92,246,0.08)}
        .faq-question{
          width:100%;display:flex;align-items:center;justify-content:space-between;gap:16px;
          padding:22px 28px;background:none;border:none;cursor:pointer;
          text-align:left;font-family:'Geist',sans-serif;
          font-size:15px;font-weight:700;color:#0A0A0A;
          transition:color 0.2s;
        }
        .faq-question:hover{color:#8B5CF6}
        .faq-chevron{flex-shrink:0;transition:transform 0.2s;color:#A3A3A3}
        .faq-item.open .faq-chevron{transform:rotate(180deg);color:#8B5CF6}
        .faq-answer{max-height:0;overflow:hidden;transition:max-height 0.25s ease}
        .faq-item.open .faq-answer{max-height:180px}
        .faq-answer-inner{padding:0 28px 22px;font-size:14px;color:#525252;line-height:1.65}

        /* CTA */
        .cta-section{padding:100px 5%;text-align:center;background:linear-gradient(135deg,#F4F0FF 0%,#FFF0F8 50%,#F0F4FF 100%)}
        .cta-inner{max-width:560px;margin:0 auto}
        .cta-text{font-size:clamp(25px,3vw,22px);color:#525252;margin-bottom:36px;line-height:1.65;font-weight:400}
        .cta-actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}

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
          .hero-title{letter-spacing:-2.5px;max-width:100%;font-size:clamp(36px,9vw,52px);line-height:1}
          .dash-outer{padding:0 16px}
          .section-block{padding:60px 20px}
          .beneficios-section{padding:0 16px 60px}
          .beneficios-grid{grid-template-columns:1fr}
          .compare-section{padding:60px 20px}
          .compare-grid{grid-template-columns:1fr}
          .precio-section{padding:60px 20px}
          .faq-section{padding:60px 20px}
          .garantia-section{padding:60px 20px}
          .cta-section{padding:60px 20px}
          .footer{padding:24px 20px}
          .footer-inner{flex-direction:column;text-align:center}
          .footer-links{justify-content:center}
        }
        @media(max-width:480px){
          .hero{padding:90px 16px 0}
          .hero-actions{flex-direction:column;width:100%}
          .btn-primary,.btn-secondary{width:100%;text-align:center}
          .cta-actions{flex-direction:column;align-items:stretch}
        }
      `}</style>

      {/* NAV */}
      <nav className="nav">
        <a href="#" className="nav-logo">Luma<span>.</span></a>
        <div className="nav-links">
          <a href="#beneficios" className="nav-link">Beneficios</a>
          <a href="#compare" className="nav-link">Comparación</a>
          <a href="#precio" className="nav-link">Precio</a>
          <a href="#faq" className="nav-link">Preguntas</a>
        </div>
        <div className="nav-actions">
          <Link href="/auth/login" className="btn-ghost">Iniciar sesión</Link>
          <Link href="/auth/register" className="btn-dark">Empezar gratis</Link>
        </div>
      </nav>

      {/* SECCIÓN 1 — HERO */}
      <section className="hero">
        <h1 className="hero-title">
          ¿Cuánto dinero perdés por trabajar<br/>
          <span className="accent">desde WhatsApp?</span>
        </h1>
        <p className="hero-sub">
          Cada turno que coordinás por WhatsApp, cada sesión que olvidás registrar y cada cobro que perdés de vista te está costando plata real. Luma lo junta todo en un lugar para que no se te escape más nada.
        </p>
        <div className="hero-actions">
          <Link href="/auth/register" className="btn-primary">Empezar gratis — 7 días sin tarjeta</Link>
          <a href="#beneficios" className="btn-secondary">Ver cómo funciona</a>
        </div>
        <p className="hero-trust">Sin tarjeta — Listo en 5 minutos — Cancelás cuando querés</p>
      </section>

      {/* DASHBOARD — visual original */}
      <div className="dash-outer">
        <div className="dash-img-wrap">
          <img src="/screenshots/dashboard.png" alt="Dashboard de Luma" className="dash-img"/>
          <div className="dash-fade"/>
        </div>
      </div>

      {/* SECCIÓN 2 — EL DOLOR */}
      <section className="section-block" id="dolor">
        <div className="section-inner">
          <div className="section-header">
            <h2 className="section-title">¿Te suena familiar?</h2>
          </div>
          <ul className="dolor-list">
            {DOLOR_ITEMS.map((item, i) => (
              <li key={i} className="dolor-item">
                <span className="dolor-check" aria-hidden="true">
                  <svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
          <p className="dolor-close">
            Cada día que seguís así es un día que perdés plata. <span>Hoy podés cambiarlo.</span>
          </p>
        </div>
      </section>

      {/* SECCIÓN 3 — LA COMPARACIÓN */}
      <div className="compare-section" id="compare">
        <div className="compare-glow"/>
        <div className="compare-inner">
          <div className="compare-header">
            <h2 className="section-title">Hoy tu trabajo vive acá</h2>
          </div>
          <div className="compare-grid">
            <div className="compare-col antes">
              <div className="compare-col-hdr">
                <div className="compare-col-icon">—</div>
                <div className="compare-col-label">Sin Luma</div>
              </div>
              {SIN_LUMA.map((item, i) => (
                <div key={i} className="compare-item">
                  <div className="compare-item-ico">✕</div>
                  <div className="compare-item-text">{item}</div>
                </div>
              ))}
            </div>
            <div className="compare-col despues">
              <div className="compare-col-hdr">
                <div className="compare-col-icon">+</div>
                <div className="compare-col-label">Con Luma</div>
              </div>
              {CON_LUMA.map((item, i) => (
                <div key={i} className="compare-item">
                  <div className="compare-item-ico">✓</div>
                  <div className="compare-item-text">{item}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 4 — BENEFICIOS */}
      <section className="beneficios-section" id="beneficios">
        <div className="section-header" style={{ marginTop: 70 }}>
          <span className="section-label">Beneficios</span>
          <h2 className="section-title">Esto cambia cuando usás Luma</h2>
        </div>
        <div className="beneficios-grid">
          {BENEFICIOS.map((b, i) => (
            <div
              key={i}
              className="beneficio-brick"
              style={{
                '--shadow': b.shadow,
                '--face-bg': b.bg,
                '--accent': b.accent,
              } as React.CSSProperties}
            >
              <span className="beneficio-tag antes">Antes</span>
              <p className="beneficio-text">{b.antes}</p>
              <span className="beneficio-tag despues">Después</span>
              <p className="beneficio-text last">{b.despues}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SECCIÓN 5 — OFERTA */}
      <section className="precio-section" id="precio">

<div className="precio-card">

<div className="launch-badge">
Precio de lanzamiento
</div>

<h2 className="section-title">
Todo lo que necesitás para gestionar tu consulta.
</h2>

<p className="section-subtitle">
Durante los primeros 7 días probás absolutamente todas las funciones sin pagar un peso.
</p>

<div className="precio-old">
$12.900 / mes
</div>

<div className="precio-amount">

<span className="precio-num">
9.900
</span>

<span className="precio-unit">
/mes
</span>

</div>

<p className="precio-forever">
Precio para siempre. Sin aumentos.
</p>

<ul className="features-list">

<li>Agenda automática 24/7</li>

<li>Página pública personalizada</li>

<li>Reservas online</li>

<li>Servicios con horario o entrega en 24-96 h</li>

<li>Cobros por Mercado Pago</li>

<li>Cobros por transferencia</li>

<li>Historial completo de pacientes</li>

<li>Notas privadas</li>

<li>Dashboard financiero</li>


<li>Acceso desde cualquier dispositivo</li>

</ul>

<div className="spots-box">

<div className="spots-title">

Quedan lugares disponibles al precio de lanzamiento

</div>

<div className="spots-counter">

    {LAUNCH_SPOTS_LEFT
        .toString()
        .padStart(2, "0")
        .split("")
        .map((digit, index) => (
            <span
                key={index}
                className="spot-number"
            >
                {digit}
            </span>
        ))}

</div>

<strong>
Después volverá al precio normal.
</strong>

</div>

<Link
href="/auth/register"
className="btn-primary"
>

Quiero asegurar mi lugar

</Link>

</div>

</section>

      {/* SECCIÓN 6 — GARANTÍA */}
      <section className="garantia-section">
        <p className="garantia-text">
          Probala 7 días. Si no sentís que tu trabajo cambia, no pagás nada. Sin tarjeta. Sin compromiso.
        </p>
      </section>

      {/* SECCIÓN 7 — FAQ */}
      <section className="faq-section" id="faq">
        <span className="section-label">FAQ</span>
        <h2 className="section-title">Preguntas frecuentes</h2>
        <div className="faq-list">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className={`faq-item${openFaq === i ? ' open' : ''}`}>
              <button
                type="button"
                className="faq-question"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                aria-expanded={openFaq === i}
              >
                {item.q}
                <svg className="faq-chevron" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div className="faq-answer">
                <div className="faq-answer-inner">{item.a}</div>
              </div>
            </div>
          ))}
        </div>
      </section>


      {/* SECCIÓN 8 — REMATE FINAL */}
      <section className="cta-section">
        <div className="cta-inner">
          <p className="cta-text">
            Imaginá abrir el lunes con todo claro. Quién viene, cuánto cobrás, qué trabajaron la última vez. Sin buscar nada. Sin improvisar nada. Empezá gratis hoy — sin tarjeta.
          </p>
          <div className="cta-actions">
            <Link href="/auth/register" className="btn-primary">Crear cuenta gratis</Link>
          </div>
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
