'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

const UPDATES = [
  {
    titulo: 'Notificaciones por email',
    desc: 'Recibí un aviso cada vez que alguien reserve un turno desde tu página pública. Sin perder ninguna consulta.',
    eta: 'Próximamente',
    icon: '📧',
    color: '#6EE7B7',
    colorDim: 'rgba(52,211,153,0.12)',
  },
  {
    titulo: 'Recordatorios automáticos por WhatsApp',
    desc: 'Luma te avisa por WhatsApp de tus turnos del día: quién tenés, a qué hora y con qué servicio. Sin tener que abrir la app.',
    eta: 'Próximamente',
    icon: '💬',
    color: '#A78BFA',
    colorDim: 'rgba(139,92,246,0.12)',
  },
  {
    titulo: 'IA para tus devoluciones y lecturas',
    desc: 'Creá plantillas personalizadas para cada devolución. La IA lee el historial de tu consultante y te ayuda a escribir lecturas únicas, con su contexto, sus preguntas y su proceso.',
    eta: 'Próximamente',
    icon: '✨',
    color: '#FCD34D',
    colorDim: 'rgba(252,211,77,0.1)',
    big: true,
  },
  {
    titulo: 'Consultá la IA por cada paciente',
    desc: 'Preguntale a la IA sobre un consultante específico. "¿Qué temas recurrentes tiene María?" o "¿Qué ejercicio le recomendarías entre sesiones?" Todo basado en sus notas reales.',
    eta: 'Próximamente',
    icon: '🔍',
    color: '#93C5FD',
    colorDim: 'rgba(147,197,253,0.1)',
    big: true,
  },
  {
    titulo: 'Asistente IA en tu página pública',
    desc: 'Un chat inteligente que ayuda a tus visitantes a elegir qué servicio tuyo les conviene más según lo que necesitan. Más reservas, menos consultas por WhatsApp.',
    eta: 'Próximamente',
    icon: '🤖',
    color: '#F9A8D4',
    colorDim: 'rgba(249,168,212,0.1)',
    big: true,
  },
  {
    titulo: 'Hablá con Luma por WhatsApp',
    desc: 'Preguntale a Luma directamente desde WhatsApp: "¿Cuántos turnos tengo hoy?", "¿Cuánto cobré esta semana?", "¿Qué notas tiene Ana?". Tu asistente de trabajo, siempre disponible.',
    eta: 'Próximamente',
    icon: '📱',
    color: '#6EE7B7',
    colorDim: 'rgba(52,211,153,0.1)',
    big: true,
  },
  {
    titulo: 'Múltiples terapeutas / equipo',
    desc: 'Creá un espacio compartido para coordinar agenda y pacientes con colegas o tu equipo.',
    eta: 'Próximamente',
    icon: '👥',
    color: '#A78BFA',
    colorDim: 'rgba(139,92,246,0.1)',
  },
]

export default function RoadmapPage() {
  const [sugerencia, setSugerencia] = useState('')
  const [nombre, setNombre] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  async function enviarSugerencia() {
    if (!sugerencia.trim()) { setError('Escribí tu sugerencia antes de enviar.'); return }
    setEnviando(true)
    setError('')
    try {
      const supabase = createClient()
      await supabase.from('sugerencias').insert({
        nombre: nombre.trim() || 'Anónimo',
        contenido: sugerencia.trim(),
        created_at: new Date().toISOString(),
      })
      setEnviado(true)
      setSugerencia('')
      setNombre('')
    } catch(e) {
      setError('Hubo un error al enviar. Intentá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html,body{min-height:100vh;font-family:'Inter',sans-serif;background:#0D0B14}

        .rp-wrap{min-height:100vh;position:relative;overflow:hidden}

        .rp-bg{
          position:fixed;inset:0;z-index:0;
          background:linear-gradient(135deg,#0D0B14 0%,#130820 50%,#0A1020 100%);
        }
        .rp-bg::before{
          content:'';position:absolute;inset:0;
          background-image:
            linear-gradient(90deg,rgba(139,92,246,0.06) 1px,transparent 1px),
            linear-gradient(rgba(139,92,246,0.06) 1px,transparent 1px);
          background-size:32px 32px;
        }
        .rp-bg::after{
          content:'';position:absolute;
          top:0;left:0;right:0;height:60vh;
          background:radial-gradient(ellipse 70% 40% at 50% 0%,rgba(139,92,246,0.18) 0%,transparent 70%);
          pointer-events:none;
        }

        .rp-content{position:relative;z-index:1;max-width:900px;margin:0 auto;padding:56px 24px 100px}

        .rp-logo{display:flex;align-items:center;gap:12px;margin-bottom:64px}
        .rp-logo-text{font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:#E9D5FF;letter-spacing:-0.5px}
        .rp-logo-text span{color:#8B5CF6}
        .rp-badge{padding:5px 12px;background:rgba(139,92,246,0.15);border:0.5px solid rgba(139,92,246,0.35);border-radius:20px;font-size:11px;font-weight:700;color:#A78BFA;letter-spacing:1.5px;text-transform:uppercase}

        .rp-hero{margin-bottom:72px}
        .rp-hero-label{font-size:11px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:#4B3B6A;margin-bottom:16px}
        .rp-hero-title{font-family:'Syne',sans-serif;font-size:clamp(36px,6vw,56px);font-weight:800;color:#F5F0FF;letter-spacing:-1.5px;line-height:1.05;margin-bottom:20px}
        .rp-hero-title span{
          background:linear-gradient(135deg,#8B5CF6,#C084FC,#F472B6);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
        }
        .rp-hero-sub{font-size:17px;color:#7A6B8A;line-height:1.75;max-width:560px;font-weight:400}

        .rp-section-label{
          font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;
          color:#4B3B6A;margin-bottom:28px;
          display:flex;align-items:center;gap:12px;
        }
        .rp-section-label::after{content:'';flex:1;height:0.5px;background:rgba(139,92,246,0.15)}

        .rp-updates{display:flex;flex-direction:column;gap:0;margin-bottom:80px}

        .rp-card{
          background:rgba(255,255,255,0.025);
          border:0.5px solid rgba(139,92,246,0.12);
          border-radius:0;
          padding:28px 28px 28px 72px;
          position:relative;
          transition:all 0.2s;
        }
        .rp-card:first-child{border-radius:16px 16px 0 0}
        .rp-card:last-child{border-radius:0 0 16px 16px}
        .rp-card:only-child{border-radius:16px}
        .rp-card + .rp-card{border-top:none}
        .rp-card:hover{
          background:rgba(139,92,246,0.05);
          z-index:1;
        }
        .rp-card.big{
          background:rgba(255,255,255,0.03);
          border-color:rgba(139,92,246,0.18);
        }
        .rp-card.big:hover{ background:rgba(139,92,246,0.08) }

        .rp-card-icon-wrap{
          position:absolute;
          left:22px;
          top:28px;
          width:36px;height:36px;
          border-radius:10px;
          background:var(--icon-bg);
          border:0.5px solid var(--icon-border);
          display:flex;align-items:center;justify-content:center;
          font-size:17px;
        }
        .rp-card-eta{
          display:inline-flex;align-items:center;
          padding:3px 10px;
          border-radius:20px;
          font-size:10px;font-weight:700;
          letter-spacing:0.5px;
          background:var(--eta-bg);
          color:var(--eta-color);
          border:0.5px solid var(--eta-border);
          margin-bottom:8px;
        }
        .rp-card-eta::before{
          content:'';
          width:5px;height:5px;border-radius:50%;
          background:var(--eta-dot);
          margin-right:6px;
          flex-shrink:0;
        }
        .rp-card-title{
          font-family:'Syne',sans-serif;
          font-size:16px;font-weight:700;
          color:#E9D5FF;
          margin-bottom:8px;
          line-height:1.3;
        }
        .rp-card.big .rp-card-title{ font-size:17px }
        .rp-card-desc{
          font-size:14px;color:#7A6B8A;
          line-height:1.75;
          font-weight:400;
        }
        .rp-card.big .rp-card-desc{ font-size:14.5px;color:#6B5B8A }

        .rp-suggest{
          background:rgba(255,255,255,0.03);
          border:0.5px solid rgba(139,92,246,0.18);
          border-radius:20px;
          padding:36px;
          position:relative;overflow:hidden;
        }
        .rp-suggest::before{
          content:'';position:absolute;top:-60px;right:-60px;
          width:280px;height:280px;border-radius:50%;
          background:radial-gradient(circle,rgba(139,92,246,0.08) 0%,transparent 70%);
          pointer-events:none;
        }
        .rp-suggest-title{
          font-family:'Syne',sans-serif;
          font-size:22px;font-weight:800;
          color:#E9D5FF;
          margin-bottom:8px;
          letter-spacing:-0.5px;
        }
        .rp-suggest-sub{font-size:14px;color:#7A6B8A;margin-bottom:28px;line-height:1.7}
        .rp-input{
          width:100%;
          padding:13px 16px;
          background:rgba(255,255,255,0.04);
          border:0.5px solid rgba(139,92,246,0.2);
          border-radius:12px;
          font-size:15px;
          color:#E9D5FF;
          font-family:'Inter',sans-serif;
          outline:none;
          transition:border-color 0.2s;
          margin-bottom:12px;
          line-height:1.5;
        }
        .rp-input::placeholder{color:#3B2B5A}
        .rp-input:focus{border-color:rgba(139,92,246,0.5);background:rgba(255,255,255,0.06)}
        .rp-textarea{
          width:100%;
          padding:14px 16px;
          background:rgba(255,255,255,0.04);
          border:0.5px solid rgba(139,92,246,0.2);
          border-radius:12px;
          font-size:14px;
          color:#E9D5FF;
          font-family:'Inter',sans-serif;
          outline:none;
          transition:border-color 0.2s;
          resize:none;
          min-height:120px;
          line-height:1.75;
          margin-bottom:12px;
        }
        .rp-textarea::placeholder{color:#3B2B5A}
        .rp-textarea:focus{border-color:rgba(139,92,246,0.5);background:rgba(255,255,255,0.06)}
        .rp-error{font-size:12px;color:#F87171;margin-bottom:12px}
        .rp-btn{
          padding:14px 28px;
          background:linear-gradient(135deg,#6B3FA0,#8B5CF6);
          color:white;border:none;
          border-radius:12px;
          font-size:14px;font-weight:700;
          cursor:pointer;
          font-family:'Inter',sans-serif;
          letter-spacing:0.3px;
          transition:all 0.2s;
          min-height:48px;
          box-shadow:0 4px 20px rgba(139,92,246,0.3);
        }
        .rp-btn:hover{transform:translateY(-1px);box-shadow:0 8px 28px rgba(139,92,246,0.4)}
        .rp-btn:disabled{opacity:0.5;cursor:not-allowed;transform:none}

        .rp-success{text-align:center;padding:32px 0}
        .rp-success-icon{font-size:40px;margin-bottom:16px}
        .rp-success-title{font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:#E9D5FF;margin-bottom:8px}
        .rp-success-sub{font-size:14px;color:#7A6B8A;line-height:1.6}

        .rp-footer{text-align:center;margin-top:56px;font-size:12px;color:#3B2B5A;letter-spacing:0.3px}
        .rp-footer a{color:#4B3B6A;text-decoration:none;transition:color 0.15s}
        .rp-footer a:hover{color:#A78BFA}

        @media(min-width:640px){
          .rp-updates{
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:0;
          }
          .rp-card{border-radius:0;border-right:none}
          .rp-card:first-child{border-radius:16px 0 0 0}
          .rp-card:nth-child(2){border-radius:0 16px 0 0;border-right:0.5px solid rgba(139,92,246,0.12)}
          .rp-card:nth-last-child(1):nth-child(odd){
            border-radius:0 0 16px 16px;
            grid-column:1/-1;
          }
          .rp-card:nth-last-child(2){border-radius:0 0 0 16px}
          .rp-card:nth-last-child(1):nth-child(even){
            border-radius:0 0 16px 0;
            border-right:0.5px solid rgba(139,92,246,0.12)
          }
          .rp-card + .rp-card{border-top:none}
          .rp-card:nth-child(odd){border-right:none}
          .rp-card:nth-child(even){border-right:0.5px solid rgba(139,92,246,0.12)}
        }
      `}</style>

      <div className="rp-wrap">
        <div className="rp-bg"/>
        <div className="rp-content">

          <div className="rp-logo">
            <div className="rp-logo-text">Luma<span>.</span></div>
            <div className="rp-badge">Novedades</div>
          </div>

          <div className="rp-hero">
            <div className="rp-hero-label">Lo que viene</div>
            <h1 className="rp-hero-title">
              Construimos Luma<br/>
              <span>con vos.</span>
            </h1>
            <p className="rp-hero-sub">
              Acá podés ver en qué estamos trabajando y dejarnos tu idea para que Luma sea exactamente lo que tu trabajo necesita.
            </p>
          </div>

          <div className="rp-section-label">Próximas actualizaciones</div>

          <div className="rp-updates">
            {UPDATES.map((u, i) => (
              <div key={i} className={`rp-card${u.big?' big':''}`}
                style={{
                  '--icon-bg': u.colorDim,
                  '--icon-border': u.color + '30',
                  '--eta-bg': u.colorDim,
                  '--eta-color': u.color,
                  '--eta-border': u.color + '30',
                  '--eta-dot': u.color,
                } as any}>
                <div className="rp-card-icon-wrap">{u.icon}</div>
                <div className="rp-card-eta">{u.eta}</div>
                <div className="rp-card-title">{u.titulo}</div>
                <div className="rp-card-desc">{u.desc}</div>
              </div>
            ))}
          </div>

          <div className="rp-section-label">Dejá tu idea</div>
          <div className="rp-suggest">
            {enviado ? (
              <div className="rp-success">
                <div className="rp-success-icon">✦</div>
                <div className="rp-success-title">¡Gracias por tu sugerencia!</div>
                <div className="rp-success-sub">La vamos a leer con atención. Tu feedback construye Luma.</div>
              </div>
            ) : (<>
              <div className="rp-suggest-title">¿Qué le falta a Luma?</div>
              <p className="rp-suggest-sub">Contanos qué feature cambiaría tu trabajo. Las mejores ideas entran al roadmap.</p>
              <input
                className="rp-input"
                placeholder="Tu nombre (opcional)"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
              />
              <textarea
                className="rp-textarea"
                placeholder="Describí tu idea... ¿Qué problema resolvería? ¿Cómo lo usarías?"
                value={sugerencia}
                onChange={e => { setSugerencia(e.target.value); setError('') }}
              />
              {error && <div className="rp-error">{error}</div>}
              <button className="rp-btn" onClick={enviarSugerencia} disabled={enviando}>
                {enviando ? 'Enviando...' : '✦ Enviar sugerencia'}
              </button>
            </>)}
          </div>

          <div className="rp-footer">
            <a href="/dashboard">← Volver al dashboard</a>
            &nbsp;·&nbsp;
            Luma © 2026
          </div>

        </div>
      </div>
    </>
  )
}