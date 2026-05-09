"use client";

import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function insertWaitlist(data: {
  nombre: string;
  email: string;
  profesion: string;
}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al guardar");
}

function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

export default function LandingPage() {
  const [form, setForm] = useState({ nombre: "", email: "", profesion: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre || !form.email || !form.profesion) return;
    setStatus("loading");
    try {
      await insertWaitlist(form);
      setStatus("success");
      setForm({ nombre: "", email: "", profesion: "" });
    } catch {
      setStatus("error");
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Lora:ital,wght@0,400;0,500;1,400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --lavender:     #b9a9e1;
          --lavender-mid: #cfc0ee;
          --lavender-lt:  #ede8f9;
          --rose:         #f0c4d4;
          --rose-lt:      #fdf0f5;
          --white:        #ffffff;
          --ink:          #2d2140;
          --ink-mid:      #5a4e72;
          --ink-lt:       #8b7fa8;
          --surface:      #faf8fd;
          --card-bg:      rgba(255,255,255,0.72);
          --radius-lg:    28px;
          --radius-md:    18px;
          --radius-sm:    12px;
          --shadow:       0 4px 32px rgba(100,80,160,0.10);
          --shadow-card:  0 2px 20px rgba(100,80,160,0.08);
        }

        html { scroll-behavior: smooth; }

        body {
          font-family: 'Lora', Georgia, serif;
          background: var(--surface);
          color: var(--ink);
          overflow-x: hidden;
        }

        h1,h2,h3,h4,h5,h6,button,.label {
          font-family: 'Manrope', sans-serif;
        }

        .fade-section {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.65s ease, transform 0.65s ease;
        }
        .fade-section.visible {
          opacity: 1;
          transform: translateY(0);
        }

        nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 32px;
          background: rgba(250,248,253,0.85);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(185,169,225,0.18);
        }
        .nav-logo {
          font-family: 'Manrope', sans-serif;
          font-weight: 800;
          font-size: 1.25rem;
          color: var(--ink);
          letter-spacing: -0.5px;
          display: flex; align-items: center; gap: 8px;
        }
        .nav-logo span { color: var(--lavender); }
        .nav-cta {
          background: var(--ink);
          color: var(--white);
          border: none;
          border-radius: 100px;
          padding: 10px 22px;
          font-family: 'Manrope', sans-serif;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s;
          text-decoration: none;
        }
        .nav-cta:hover { background: var(--ink-mid); transform: translateY(-1px); }

        .hero {
          min-height: 100vh;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          text-align: center;
          padding: 120px 24px 80px;
          position: relative;
          overflow: hidden;
        }
        .hero-blob {
          position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; z-index: 0;
        }
        .blob-1 {
          width: 520px; height: 520px;
          background: radial-gradient(circle, rgba(185,169,225,0.32) 0%, transparent 70%);
          top: -120px; left: -100px;
        }
        .blob-2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(240,196,212,0.28) 0%, transparent 70%);
          bottom: -80px; right: -80px;
        }
        .blob-3 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(207,192,238,0.20) 0%, transparent 70%);
          top: 40%; left: 55%;
        }
        .hero-content { position: relative; z-index: 1; max-width: 720px; }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(185,169,225,0.18);
          border: 1px solid rgba(185,169,225,0.35);
          border-radius: 100px;
          padding: 6px 16px;
          font-family: 'Manrope', sans-serif;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--ink-mid);
          margin-bottom: 28px;
          letter-spacing: 0.3px;
        }
        .hero h1 {
          font-size: clamp(2.2rem, 5vw, 3.6rem);
          font-weight: 800;
          line-height: 1.12;
          letter-spacing: -1px;
          color: var(--ink);
          margin-bottom: 22px;
        }
        .hero h1 em {
          font-style: normal;
          background: linear-gradient(135deg, var(--lavender) 0%, #9b7fd4 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero p {
          font-size: clamp(1rem, 2vw, 1.15rem);
          color: var(--ink-mid);
          line-height: 1.7;
          margin-bottom: 36px;
          max-width: 560px;
          margin-left: auto; margin-right: auto;
        }
        .hero-cta-group { display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          background: linear-gradient(135deg, #7c5cbf 0%, #a07fd4 100%);
          color: var(--white);
          border: none;
          border-radius: 100px;
          padding: 16px 36px;
          font-family: 'Manrope', sans-serif;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          box-shadow: 0 6px 28px rgba(124,92,191,0.30);
          transition: transform 0.2s, box-shadow 0.2s;
          text-decoration: none;
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 36px rgba(124,92,191,0.38); }
        .hero-microcopy {
          font-family: 'Manrope', sans-serif;
          font-size: 0.8rem;
          color: var(--ink-lt);
          font-weight: 500;
        }
        .hero-roadmap {
          margin-top: 20px;
          background: rgba(185,169,225,0.12);
          border: 1px solid rgba(185,169,225,0.25);
          border-radius: var(--radius-sm);
          padding: 10px 18px;
          font-family: 'Manrope', sans-serif;
          font-size: 0.8rem;
          color: var(--ink-mid);
          font-weight: 500;
        }
        .hero-roadmap strong { color: var(--ink); }

        section { padding: 96px 24px; }
        .container { max-width: 900px; margin: 0 auto; }
        .section-label {
          font-family: 'Manrope', sans-serif;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: var(--lavender);
          margin-bottom: 14px;
        }
        .section-title {
          font-size: clamp(1.8rem, 3.5vw, 2.6rem);
          font-weight: 800;
          line-height: 1.18;
          letter-spacing: -0.5px;
          color: var(--ink);
          margin-bottom: 16px;
        }
        .section-sub {
          font-size: 1.05rem;
          color: var(--ink-mid);
          line-height: 1.7;
          max-width: 560px;
        }

        .problema { background: var(--white); }
        .dolor-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
          margin-top: 48px;
        }
        .dolor-card {
          background: var(--surface);
          border: 1px solid rgba(185,169,225,0.20);
          border-radius: var(--radius-md);
          padding: 24px 24px 22px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .dolor-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-card); }
        .dolor-num {
          font-family: 'Manrope', sans-serif;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--lavender);
          margin-bottom: 10px;
          letter-spacing: 1px;
        }
        .dolor-card p {
          font-size: 0.95rem;
          color: var(--ink-mid);
          line-height: 1.65;
        }

        .solucion { background: var(--surface); }
        .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-top: 48px;
        }
        .feature-card {
          background: var(--card-bg);
          border: 1px solid rgba(185,169,225,0.22);
          border-radius: var(--radius-lg);
          padding: 28px 26px;
          backdrop-filter: blur(8px);
          box-shadow: var(--shadow-card);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .feature-card:hover { transform: translateY(-4px); box-shadow: var(--shadow); }
        .feature-icon {
          width: 44px; height: 44px;
          background: linear-gradient(135deg, var(--lavender-lt), var(--rose-lt));
          border-radius: var(--radius-sm);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.3rem;
          margin-bottom: 16px;
        }
        .feature-card h3 {
          font-size: 1rem;
          font-weight: 700;
          color: var(--ink);
          margin-bottom: 8px;
        }
        .feature-card p {
          font-size: 0.9rem;
          color: var(--ink-mid);
          line-height: 1.65;
        }

        .diferencial {
          background: linear-gradient(135deg, #f3effc 0%, #fdf0f5 100%);
          text-align: center;
        }
        .diferencial .container { max-width: 700px; }
        .diferencial-quote {
          font-size: clamp(1.4rem, 3vw, 2rem);
          font-weight: 800;
          color: var(--ink);
          line-height: 1.25;
          margin-bottom: 20px;
          letter-spacing: -0.3px;
        }
        .diferencial-quote em {
          font-style: normal;
          color: #7c5cbf;
        }
        .diferencial p {
          font-size: 1rem;
          color: var(--ink-mid);
          line-height: 1.75;
          margin-bottom: 16px;
        }
        .diferencial-roadmap {
          display: inline-block;
          background: rgba(124,92,191,0.08);
          border: 1px solid rgba(124,92,191,0.18);
          border-radius: var(--radius-md);
          padding: 14px 24px;
          font-family: 'Manrope', sans-serif;
          font-size: 0.875rem;
          color: var(--ink-mid);
          margin-top: 8px;
          line-height: 1.6;
        }

        .waitlist { background: var(--white); }
        .waitlist-inner {
          background: linear-gradient(135deg, #ede8f9 0%, #fdf0f5 100%);
          border-radius: var(--radius-lg);
          padding: 56px 40px;
          text-align: center;
          max-width: 600px;
          margin: 0 auto;
          box-shadow: 0 8px 48px rgba(124,92,191,0.10);
        }
        .waitlist h2 { font-size: clamp(1.6rem, 3vw, 2.2rem); margin-bottom: 10px; }
        .waitlist-sub {
          font-size: 0.95rem;
          color: var(--ink-mid);
          margin-bottom: 36px;
          line-height: 1.6;
        }
        .waitlist-form { display: flex; flex-direction: column; gap: 14px; }
        .form-input {
          width: 100%;
          background: rgba(255,255,255,0.85);
          border: 1px solid rgba(185,169,225,0.35);
          border-radius: var(--radius-sm);
          padding: 14px 18px;
          font-family: 'Lora', serif;
          font-size: 0.95rem;
          color: var(--ink);
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .form-input:focus {
          border-color: var(--lavender);
          box-shadow: 0 0 0 3px rgba(185,169,225,0.20);
        }
        .form-input::placeholder { color: var(--ink-lt); }
        .form-select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238b7fa8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 16px center;
          padding-right: 40px;
        }
        .btn-submit {
          width: 100%;
          background: linear-gradient(135deg, #7c5cbf 0%, #a07fd4 100%);
          color: var(--white);
          border: none;
          border-radius: 100px;
          padding: 16px;
          font-family: 'Manrope', sans-serif;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          box-shadow: 0 6px 24px rgba(124,92,191,0.28);
          transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
          margin-top: 4px;
        }
        .btn-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 32px rgba(124,92,191,0.36); }
        .btn-submit:disabled { opacity: 0.65; cursor: not-allowed; }
        .form-microcopy {
          font-family: 'Manrope', sans-serif;
          font-size: 0.78rem;
          color: var(--ink-lt);
          margin-top: 4px;
        }
        .form-success {
          background: rgba(124,92,191,0.08);
          border: 1px solid rgba(124,92,191,0.20);
          border-radius: var(--radius-md);
          padding: 20px 24px;
          font-family: 'Manrope', sans-serif;
          font-size: 0.95rem;
          color: var(--ink);
          font-weight: 600;
          line-height: 1.6;
        }
        .form-error {
          font-family: 'Manrope', sans-serif;
          font-size: 0.82rem;
          color: #c0536a;
          margin-top: 4px;
        }

        .faq { background: var(--surface); }
        .faq-list { margin-top: 48px; display: flex; flex-direction: column; gap: 14px; }
        .faq-item {
          background: var(--white);
          border: 1px solid rgba(185,169,225,0.22);
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        .faq-question {
          width: 100%; text-align: left;
          background: none; border: none; cursor: pointer;
          padding: 20px 24px;
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          font-family: 'Manrope', sans-serif;
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--ink);
          transition: background 0.15s;
        }
        .faq-question:hover { background: rgba(185,169,225,0.06); }
        .faq-icon {
          width: 24px; height: 24px; flex-shrink: 0;
          background: var(--lavender-lt);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem; font-weight: 700; color: #7c5cbf;
          transition: transform 0.25s;
        }
        .faq-icon.open { transform: rotate(45deg); }
        .faq-answer {
          max-height: 0; overflow: hidden;
          transition: max-height 0.3s ease, padding 0.3s ease;
          padding: 0 24px;
          font-size: 0.92rem;
          color: var(--ink-mid);
          line-height: 1.7;
        }
        .faq-answer.open { max-height: 200px; padding: 0 24px 20px; }

        footer {
          background: var(--ink);
          color: rgba(255,255,255,0.5);
          text-align: center;
          padding: 36px 24px;
          font-family: 'Manrope', sans-serif;
          font-size: 0.8rem;
        }
        footer strong { color: rgba(255,255,255,0.85); }

        @media (max-width: 600px) {
          nav { padding: 14px 20px; }
          section { padding: 72px 20px; }
          .waitlist-inner { padding: 40px 24px; }
          .dolor-grid, .feature-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <nav>
        <div className="nav-logo">
          <span>✦</span> Luma
        </div>
        <a href="#waitlist" className="nav-cta">Quiero mi lugar →</a>
      </nav>

      <section className="hero">
        <div className="hero-blob blob-1" />
        <div className="hero-blob blob-2" />
        <div className="hero-blob blob-3" />
        <div className="hero-content">
          <div className="hero-badge">✦ Lista de espera abierta · Solo 200 lugares</div>
          <h1>Para las que sostienen a otros,<br /><em>Luma sostiene tu práctica.</em></h1>
          <p>Luma organiza tu agenda, tu historial y tus finanzas para que nada se pierda y vos puedas enfocarte en lo que realmente importa.</p>
          <div className="hero-cta-group">
            <a href="#waitlist" className="btn-primary">Quiero mi lugar →</a>
            <span className="hero-microcopy">Solo 200 lugares · Gratis el primer mes</span>
            <div className="hero-roadmap">
              <strong>Próximamente:</strong> tu link personalizado para que tus clientes reserven y paguen solos. Sin WhatsApp.
            </div>
          </div>

          <div style={{
            marginTop: "56px",
            position: "relative",
            width: "100%",
            maxWidth: "900px",
            marginLeft: "auto",
            marginRight: "auto",
          }}>
            <div style={{
              position: "absolute",
              inset: "-2px",
              borderRadius: "20px",
              background: "linear-gradient(135deg, rgba(185,169,225,0.4) 0%, rgba(240,196,212,0.3) 100%)",
              filter: "blur(16px)",
              zIndex: 0,
            }} />
            <img
              src="/recorte.png"
              alt="Dashboard de Luma — agenda, historial y finanzas en un solo lugar"
              style={{
                position: "relative",
                zIndex: 1,
                width: "100%",
                height: "auto",
                borderRadius: "16px",
                boxShadow: "0 24px 80px rgba(100,80,160,0.18), 0 4px 24px rgba(100,80,160,0.10)",
                border: "1px solid rgba(185,169,225,0.25)",
                display: "block",
                maxWidth: "100%",
              }}
            />
          </div>
        </div>
      </section>

      <ProblemSection />
      <SolucionSection />
      <DiferencialSection />
      <WaitlistSection form={form} setForm={setForm} status={status} onSubmit={handleSubmit} />
      <FaqSection />

      <footer>
        <p>© {new Date().getFullYear()} <strong>Luma</strong> · Hecho con amor en Mar del Plata, Argentina 🌊</p>
      </footer>
    </>
  );
}

function ProblemSection() {
  const { ref, visible } = useFadeIn();
  const dolores = [
    "Antes de cada sesión perdés 10 minutos buscando en WhatsApp qué habló tu paciente la vez anterior.",
    "Tus cobros están en el banco, tus turnos en el calendario y tus notas en un cuaderno. Todo por separado.",
    "No sabés exactamente cuánto ganaste este mes hasta que te sentás a sumar todo a mano.",
    "Coordinás turnos por WhatsApp con tres mensajes de ida y vuelta para confirmar un horario.",
    "Cada vez que querés recordar cómo viene evolucionando un paciente, tenés que rebuscar entre notas, audios y chats.",
  ];
  return (
    <section className="problema">
      <div className="container">
        <div ref={ref} className={`fade-section${visible ? " visible" : ""}`}>
          <div className="section-label">El problema</div>
          <h2 className="section-title">¿Te suena familiar?</h2>
          <div className="dolor-grid">
            {dolores.map((d, i) => (
              <div className="dolor-card" key={i}>
                <div className="dolor-num">0{i + 1}</div>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SolucionSection() {
  const { ref, visible } = useFadeIn();
  const features = [
    { icon: "🗂️", title: "Historial completo de cada paciente", desc: "Notas, sesiones anteriores y evolución de cada paciente organizados y listos antes de que lleguen. Sin buscar. Sin improvisar." },
    { icon: "📅", title: "Agenda inteligente", desc: "Tus turnos organizados, con recordatorios automáticos y sin coordinación por WhatsApp." },
    { icon: "💸", title: "Cobros y finanzas en orden", desc: "Registrá cada pago y mirá de un vistazo cuánto ganaste, cuánto te deben y cómo viene el mes." },
    { icon: "🔗", title: "Todo conectado", desc: "Tu agenda, tu historial y tus finanzas hablan entre sí. Un turno nuevo aparece en todos lados automáticamente." },
  ];
  return (
    <section className="solucion">
      <div className="container">
        <div ref={ref} className={`fade-section${visible ? " visible" : ""}`}>
          <div className="section-label">La solución</div>
          <h2 className="section-title">Luma lo resuelve todo<br />en un solo lugar.</h2>
          <div className="feature-grid">
            {features.map((f, i) => (
              <div className="feature-card" key={i}>
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DiferencialSection() {
  const { ref, visible } = useFadeIn();
  return (
    <section className="diferencial">
      <div className="container">
        <div ref={ref} className={`fade-section${visible ? " visible" : ""}`}>
          <div className="section-label">El diferencial</div>
          <div className="diferencial-quote">
            Luma no es solo una agenda.<br />
            Es la <em>memoria de tu práctica.</em>
          </div>
          <p>Otras herramientas te dan un calendario. Luma recuerda quién es cada persona que atendés, cómo viene evolucionando y qué necesita de vos.</p>
          <p>Porque una buena sesión no empieza cuando el cliente llega. Empieza antes.</p>
          <div className="diferencial-roadmap">
            <strong>Y próximamente:</strong> tu link personalizado para que tus clientes reserven y paguen solos. Sin WhatsApp. Sin plataformas extra. Todo en Luma.
          </div>
        </div>
      </div>
    </section>
  );
}

function WaitlistSection({
  form, setForm, status, onSubmit,
}: {
  form: { nombre: string; email: string; profesion: string };
  setForm: React.Dispatch<React.SetStateAction<{ nombre: string; email: string; profesion: string }>>;
  status: "idle" | "loading" | "success" | "error";
  onSubmit: (e: React.FormEvent) => void;
}) {
  const { ref, visible } = useFadeIn();
  return (
    <section className="waitlist" id="waitlist">
      <div className="container">
        <div ref={ref} className={`fade-section${visible ? " visible" : ""}`}>
          <div className="waitlist-inner">
            <div className="section-label" style={{ textAlign: "center" }}>Lista de espera</div>
            <h2 className="section-title">Anotate. Los lugares son limitados.</h2>
            <p className="waitlist-sub">Las primeras 200 acceden gratis el primer mes.</p>
            {status === "success" ? (
              <div className="form-success">
                ✦ ¡Ya estás anotada! Te vamos a avisar cuando Luma esté lista.<br />
                <span style={{ fontWeight: 400, fontSize: "0.88rem" }}>Mientras tanto, seguinos en redes para ver cómo crece.</span>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="waitlist-form">
                <input
                  className="form-input"
                  type="text"
                  placeholder="Tu nombre"
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  required
                />
                <input
                  className="form-input"
                  type="email"
                  placeholder="Tu email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                />
                <select
                  className="form-input form-select"
                  value={form.profesion}
                  onChange={e => setForm(f => ({ ...f, profesion: e.target.value }))}
                  required
                >
                  <option value="" disabled>¿A qué te dedicás?</option>
                  <option value="terapeuta">Terapeuta</option>
                  <option value="tarotista">Tarotista</option>
                  <option value="coach">Coach</option>
                  <option value="reiki">Reikista</option>
                  <option value="astrologa">Astróloga</option>
                  <option value="otro">Otro</option>
                </select>
                <button type="submit" className="btn-submit" disabled={status === "loading"}>
                  {status === "loading" ? "Guardando..." : "Quiero mi lugar →"}
                </button>
                {status === "error" && (
                  <p className="form-error">Algo salió mal. Intentá de nuevo o escribinos.</p>
                )}
                <p className="form-microcopy">Sin tarjeta de crédito. Cancelás cuando quieras.</p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  const { ref, visible } = useFadeIn();
  const [open, setOpen] = useState<number | null>(null);
  const faqs = [
    { q: "¿Cuándo está lista Luma?", a: "Estamos en desarrollo activo y abrimos el acceso por orden de lista de espera. Anotarte hoy te asegura tu lugar entre las primeras." },
    { q: "¿Qué incluye el primer mes gratis?", a: "Acceso completo a todas las funciones disponibles al momento de tu ingreso. Sin límites, sin tarjeta de crédito." },
    { q: "¿Cuánto cuesta después del primer mes?", a: "USD 7 por mes. Menos que tu suscripción de Netflix. Cancelás cuando quieras, sin compromisos." },
    { q: "¿Mis datos y los de mis pacientes están seguros?", a: "Sí. Luma está construida sobre infraestructura segura y tus datos nunca se comparten con terceros." },
    { q: "¿Para qué tipo de profesionales es Luma?", a: "Para terapeutas, tarotistas, coaches y cualquier profesional del bienestar que atienda personas de forma individual." },
  ];
  return (
    <section className="faq">
      <div className="container">
        <div ref={ref} className={`fade-section${visible ? " visible" : ""}`}>
          <div className="section-label">FAQ</div>
          <h2 className="section-title">Preguntas frecuentes</h2>
          <div className="faq-list">
            {faqs.map((f, i) => (
              <div className="faq-item" key={i}>
                <button
                  className="faq-question"
                  onClick={() => setOpen(open === i ? null : i)}
                >
                  {f.q}
                  <span className={`faq-icon${open === i ? " open" : ""}`}>+</span>
                </button>
                <div className={`faq-answer${open === i ? " open" : ""}`}>{f.a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}