'use client'

import { useEffect, useState } from 'react'
import type React from 'react'
import { createClient } from '@/lib/supabase'

type Proxima = { id?: string; titulo: string; desc: string; eta: string; icon: string; color: string; colorDim: string }

type Novedad = {
  id: string; titulo: string; descripcion: string
  tipo: 'nuevo' | 'mejora' | 'arreglo'
  imagen_url: string | null; link_url: string | null
  publicada_at: string
}

const TIPOS: Record<string, { txt: string; color: string; bg: string }> = {
  nuevo: { txt: '✨ Nuevo', color: '#E8D5A3', bg: 'rgba(201,168,76,0.16)' },
  mejora: { txt: '🛠️ Mejora', color: '#C4B5FD', bg: 'rgba(139,92,246,0.18)' },
  arreglo: { txt: '🐛 Arreglo', color: '#6EE7B7', bg: 'rgba(52,211,153,0.14)' },
}

const ZODIACOS = [
  { s: '♈', top: '8%', left: '5%', size: '22px', rot: '-8deg' },
  { s: '♌', top: '12%', left: '90%', size: '18px', rot: '10deg' },
  { s: '♎', top: '68%', left: '7%', size: '19px', rot: '6deg' },
  { s: '♓', top: '5%', left: '60%', size: '15px', rot: '-4deg' },
  { s: '♊', top: '72%', left: '92%', size: '17px', rot: '12deg' },
  { s: '♑', top: '30%', left: '3%', size: '14px', rot: '9deg' },
  { s: '♐', top: '36%', left: '95%', size: '15px', rot: '-11deg' },
  { s: '♋', top: '50%', left: '4%', size: '13px', rot: '5deg' },
  { s: '♏', top: '84%', left: '40%', size: '14px', rot: '-6deg' },
  { s: '♉', top: '18%', left: '28%', size: '12px', rot: '7deg' },
]
const DESTELLOS = [
  { s: '✦', top: '22%', left: '10%', size: '12px', delay: '0s' },
  { s: '✧', top: '60%', left: '16%', size: '9px', delay: '0.9s' },
  { s: '✦', top: '12%', left: '80%', size: '10px', delay: '1.6s' },
  { s: '✧', top: '62%', left: '86%', size: '8px', delay: '0.4s' },
  { s: '✦', top: '44%', left: '50%', size: '7px', delay: '2.1s' },
]

function formatFecha(f: string) {
  return new Date(f).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// respaldo: solo se usa si todavía no existe la tabla de próximas en la base
const UPDATES_RESPALDO = [
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
  const [novedades, setNovedades] = useState<Novedad[]>([])
  const [vistasAntes, setVistasAntes] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [verAnteriores, setVerAnteriores] = useState(false)
  const [proximas, setProximas] = useState<Proxima[]>([])

  const [sugerencia, setSugerencia] = useState('')
  const [nombre, setNombre] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const [{ data: novs }, perfilRes, proxRes] = await Promise.all([
        supabase.from('novedades').select('id,titulo,descripcion,tipo,imagen_url,link_url,publicada_at')
          .order('publicada_at', { ascending: false }).limit(30),
        user
          ? supabase.from('therapist_profiles').select('nombre_profesional, novedades_vistas_at').eq('user_id', user.id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from('proximas_actualizaciones').select('id,titulo,descripcion,icono,etiqueta,color,orden')
          .eq('visible', true).order('orden').order('created_at'),
      ])
      if (proxRes.error) {
        setProximas(UPDATES_RESPALDO as Proxima[])
      } else {
        setProximas((proxRes.data || []).map((p: any) => ({
          id: p.id, titulo: p.titulo, desc: p.descripcion, eta: p.etiqueta, icon: p.icono,
          color: p.color, colorDim: p.color + '1F',
        })))
      }
      const lista: Novedad[] = novs || []
      setNovedades(lista)
      const perfil: any = (perfilRes as any)?.data
      if (perfil?.nombre_profesional) setNombre(perfil.nombre_profesional)
      setVistasAntes(perfil?.novedades_vistas_at || null)

      // marcar como vistas (así se apaga el puntito en todos sus dispositivos)
      if (user && perfil && lista.length > 0) {
        const ultima = lista[0].publicada_at
        if (!perfil.novedades_vistas_at || new Date(ultima) > new Date(perfil.novedades_vistas_at)) {
          await supabase.from('therapist_profiles')
            .update({ novedades_vistas_at: new Date().toISOString() })
            .eq('user_id', user.id)
        }
      }
      window.dispatchEvent(new Event('luma-novedades-vistas'))
    } catch (e) {
      console.error('Error cargando novedades:', e)
    } finally { setCargando(false) }
  }

  function esNueva(n: Novedad) {
    return !vistasAntes || new Date(n.publicada_at) > new Date(vistasAntes)
  }

  async function enviarSugerencia() {
    if (!sugerencia.trim()) { setError('Escribí tu idea antes de enviar.'); return }
    setEnviando(true)
    setError('')
    try {
      const supabase = createClient()
      const { error: err } = await supabase.from('sugerencias').insert({
        nombre: nombre.trim() || 'Anónimo',
        contenido: sugerencia.trim(),
        created_at: new Date().toISOString(),
      })
      if (err) { console.error(err); setError('No se pudo enviar. Intentá de nuevo en un rato.'); return }
      setEnviado(true)
      setSugerencia('')
    } catch {
      setError('Hubo un error al enviar. Revisá tu conexión e intentá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  const destacada = novedades[0]
  const anteriores = novedades.slice(1)

  return (
    <>
      <style>{`
        @font-face{font-family:'Avigea';src:url('/fonts/Avigea.ttf') format('truetype');font-display:swap}
        
        .nv{min-height:100vh;position:relative;overflow-x:hidden;font-family:'Inter',sans-serif;background:#0D0B14;color:#D4C5A9}
        .nv *{box-sizing:border-box}

        /* ── HERO astrológico (mismo fondo que la página pública) */
        .nv-hero{position:relative;overflow:hidden;padding:72px 24px 56px;text-align:center;
          background:
            radial-gradient(circle at 14% 18%, rgba(107,63,160,0.28) 0%, transparent 42%),
            radial-gradient(circle at 88% 8%, rgba(201,168,76,0.22) 0%, transparent 38%),
            radial-gradient(circle at 78% 92%, rgba(107,63,160,0.22) 0%, transparent 46%),
            linear-gradient(180deg,#0D0B14 0%,#12101C 100%)}
        .nv-hero::before{content:'';position:absolute;inset:0;z-index:0;pointer-events:none;opacity:0.14;
          background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")}
        .nv-mandala{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:0.2;background-image:url('/landing/fondo-pagina-publica.png');background-size:cover;background-position:center;background-repeat:no-repeat}
        .nv-zodiaco{position:absolute;z-index:0;color:#E8D5A3;opacity:.28;font-family:serif;pointer-events:none;user-select:none;text-shadow:0 0 10px rgba(201,168,76,0.3);animation:nvFlotar 7s ease-in-out infinite}
        @keyframes nvFlotar{0%,100%{transform:translateY(0) rotate(var(--rot,0deg))}50%{transform:translateY(-8px) rotate(var(--rot,0deg))}}
        .nv-destello{position:absolute;z-index:0;color:#E8D5A3;pointer-events:none;animation:nvTitilar 3s ease-in-out infinite}
        @keyframes nvTitilar{0%,100%{opacity:.15}50%{opacity:.8}}
        .nv-hero-in{position:relative;z-index:1;max-width:640px;margin:0 auto}
        .nv-volver{position:absolute;top:18px;left:20px;z-index:2;font-size:12px;color:#7A6B8A;text-decoration:none}
        .nv-volver:hover{color:#E8D5A3}
        .nv-kicker{font-size:11px;font-weight:600;letter-spacing:4px;text-transform:uppercase;color:#C9A84C;margin-bottom:14px}
        .nv-h1{font-family:'Avigea','Cormorant Garamond',serif;font-weight:400;font-size:clamp(46px,10vw,84px);line-height:1;margin:0 0 16px;
          background:linear-gradient(135deg,#F0E8D5 0%,#E8D5A3 45%,#C4B5FD 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
        .nv-sub{font-family:'Cormorant Garamond',serif;font-size:19px;line-height:1.6;color:#B8A9C9;margin:0}

        .nv-main{position:relative;z-index:1;max-width:760px;margin:0 auto;padding:8px 20px 120px}
        .nv-label{display:flex;align-items:center;gap:12px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;margin:56px 0 20px}
        .nv-label::after{content:'';flex:1;height:0.5px;background:rgba(201,168,76,0.25)}

        /* ── NOVEDAD DESTACADA: sombra + borde de luz que gira cada 8s */
        .nv-dest{position:relative;border-radius:26px;padding:2px;overflow:hidden;isolation:isolate;
          box-shadow:0 24px 70px rgba(107,63,160,0.35),0 0 50px rgba(201,168,76,0.12)}
        .nv-dest::before{content:'';position:absolute;z-index:-2;left:50%;top:50%;width:200%;aspect-ratio:1;transform:translate(-50%,-50%);
          background:conic-gradient(from 0deg,transparent 0deg,rgba(201,168,76,0.25) 40deg,#E8D5A3 80deg,rgba(201,168,76,0.25) 120deg,transparent 160deg,transparent 200deg,rgba(139,92,246,0.3) 240deg,#C4B5FD 275deg,rgba(139,92,246,0.3) 310deg,transparent 360deg);
          animation:nvGira 8s linear infinite}
        @keyframes nvGira{to{transform:translate(-50%,-50%) rotate(360deg)}}
        @media (prefers-reduced-motion:reduce){.nv-dest::before{animation:none}}
        .nv-dest-in{position:relative;border-radius:24px;overflow:hidden;background:linear-gradient(180deg,#171223 0%,#120F1C 100%)}
        .nv-dest-in::after{content:'';position:absolute;inset:7px;border:1px solid rgba(201,168,76,0.18);border-radius:18px;pointer-events:none}
        .nv-dest-img{width:100%;aspect-ratio:820/312;object-fit:cover;display:block}
        .nv-dest-sinimg{height:120px;display:flex;align-items:center;justify-content:center;font-size:40px;color:#E8D5A3;
          background:radial-gradient(circle at 50% 120%,rgba(201,168,76,0.28),transparent 60%),radial-gradient(circle at 20% 0%,rgba(139,92,246,0.3),transparent 55%)}
        .nv-dest-body{padding:24px 26px 30px}
        .nv-meta{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:12px}
        .nv-pill{display:inline-flex;align-items:center;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;letter-spacing:0.3px}
        .nv-pill-nuevo{background:#C9A84C;color:#1A1328}
        .nv-fecha{font-size:12px;color:#7A6B8A}
        .nv-dest-titulo{font-family:'Cormorant Garamond',serif;font-size:clamp(26px,5vw,34px);font-weight:600;color:#F0E8D5;line-height:1.15;margin:0 0 10px}
        .nv-dest-desc{font-size:15px;line-height:1.75;color:#B8A9C9;white-space:pre-line;margin:0}
        .nv-btn-link{display:inline-flex;align-items:center;gap:6px;margin-top:18px;padding:11px 20px;border-radius:50px;background:linear-gradient(135deg,#6B3FA0,#8B5CF6);color:#F0E8D5;font-size:13px;font-weight:700;text-decoration:none;box-shadow:0 8px 24px rgba(107,63,160,0.4)}

        .nv-ant-toggle{margin-top:16px;background:none;border:none;color:#C9A84C;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;padding:6px 0}
        .nv-ant{display:flex;flex-direction:column;gap:10px;margin-top:8px}
        .nv-ant-item{background:rgba(255,255,255,0.03);border:0.5px solid rgba(201,168,76,0.15);border-radius:16px;padding:16px 18px;box-shadow:0 8px 24px rgba(0,0,0,0.18)}
        .nv-ant-titulo{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;color:#F0E8D5;margin:0 0 4px}
        .nv-ant-desc{font-size:13.5px;line-height:1.7;color:#9C8DB0;white-space:pre-line;margin:0}

        .nv-vacio{text-align:center;padding:36px 20px;border-radius:20px;border:0.5px dashed rgba(201,168,76,0.25);color:#7A6B8A;font-size:14px;line-height:1.6}

        /* ── PRÓXIMAS (sombras más suaves) */
        .nv-prox{display:grid;grid-template-columns:1fr;gap:12px}
        @media(min-width:640px){.nv-prox{grid-template-columns:1fr 1fr}}
        .nv-prox-card{position:relative;background:rgba(255,255,255,0.03);border:0.5px solid rgba(139,92,246,0.18);border-radius:18px;padding:20px 20px 20px 70px;box-shadow:0 10px 30px rgba(0,0,0,0.22)}
        .nv-prox-icon{position:absolute;left:18px;top:20px;width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:18px;background:var(--icon-bg);border:0.5px solid var(--icon-border)}
        .nv-prox-eta{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;background:var(--eta-bg);color:var(--eta-color);border:0.5px solid var(--eta-border);margin-bottom:8px}
        .nv-prox-titulo{font-size:15px;font-weight:700;color:#E9D5FF;margin:0 0 6px;line-height:1.35}
        .nv-prox-desc{font-size:13.5px;line-height:1.7;color:#8E7FA3;margin:0}

        /* ── DEJANOS TU IDEA */
        .nv-idea{position:relative;overflow:hidden;background:linear-gradient(160deg,rgba(107,63,160,0.14),rgba(201,168,76,0.05));border:0.5px solid rgba(201,168,76,0.2);border-radius:24px;padding:30px 26px;box-shadow:0 14px 40px rgba(0,0,0,0.25)}
        .nv-idea::before{content:'✦';position:absolute;top:-30px;right:-10px;font-size:150px;color:rgba(201,168,76,0.06);pointer-events:none}
        .nv-idea-titulo{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:600;color:#F0E8D5;margin:0 0 6px}
        .nv-idea-sub{font-size:14px;line-height:1.7;color:#9C8DB0;margin:0 0 22px}
        .nv-campo{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
        .nv-campo label{font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#C9A84C}
        .nv-input,.nv-textarea{width:100%;padding:13px 16px;background:rgba(13,11,20,0.55);border:0.5px solid rgba(201,168,76,0.22);border-radius:14px;font-size:15px;color:#F0E8D5;font-family:inherit;outline:none;transition:border-color .2s, box-shadow .2s}
        .nv-textarea{min-height:130px;resize:vertical;line-height:1.7}
        .nv-input::placeholder,.nv-textarea::placeholder{color:#5B4C70}
        .nv-input:focus,.nv-textarea:focus{border-color:rgba(232,213,163,0.6);box-shadow:0 0 0 3px rgba(201,168,76,0.12)}
        .nv-contador{font-size:11px;color:#5B4C70;text-align:right}
        .nv-error{font-size:13px;color:#F87171;margin-bottom:12px}
        .nv-enviar{width:100%;padding:15px;border:none;border-radius:50px;background:linear-gradient(135deg,#C9A84C,#E8D5A3);color:#1A1328;font-size:14px;font-weight:800;letter-spacing:0.5px;cursor:pointer;font-family:inherit;box-shadow:0 10px 28px rgba(201,168,76,0.25);transition:transform .15s}
        .nv-enviar:hover{transform:translateY(-1px)}
        .nv-enviar:disabled{opacity:.55;cursor:not-allowed;transform:none}
        .nv-ok{text-align:center;padding:20px 0}
        .nv-ok-icon{font-size:38px;color:#E8D5A3;margin-bottom:10px}
        .nv-ok-btn{margin-top:14px;background:none;border:none;color:#C9A84C;font-weight:600;cursor:pointer;font-family:inherit;font-size:13px}

        @media(max-width:640px){
          .nv-hero{padding:64px 18px 44px}
          .nv-dest-body{padding:20px 20px 26px}
          .nv-idea{padding:24px 18px}
          .nv-main{padding-bottom:140px}
        }
      `}</style>

      <div className="nv">
        <section className="nv-hero">
          <div className="nv-mandala"/>
          {ZODIACOS.map((z, i) => (
            <div key={i} className="nv-zodiaco" style={{top:z.top,left:z.left,fontSize:z.size,'--rot':z.rot,animationDelay:`${i*0.4}s`} as React.CSSProperties}>{z.s}</div>
          ))}
          {DESTELLOS.map((d, i) => (
            <div key={i} className="nv-destello" style={{top:d.top,left:d.left,fontSize:d.size,animationDelay:d.delay}}>{d.s}</div>
          ))}
          <a href="/dashboard" className="nv-volver">← Volver</a>
          <div className="nv-hero-in">
            <div className="nv-kicker">✦ Luma crece con vos ✦</div>
            <h1 className="nv-h1">Novedades</h1>
            <p className="nv-sub">Todo lo nuevo de Luma, lo que se viene y un espacio para que nos cuentes qué te gustaría.</p>
          </div>
        </section>

        <main className="nv-main">
          <div className="nv-label">Lo último</div>
          {cargando ? (
            <div className="nv-vacio">Cargando…</div>
          ) : !destacada ? (
            <div className="nv-vacio">Muy pronto vas a ver acá cada novedad de Luma ✦</div>
          ) : (<>
            <article className="nv-dest">
              <div className="nv-dest-in">
                {destacada.imagen_url
                  ? <img src={destacada.imagen_url} alt="" className="nv-dest-img"/>
                  : <div className="nv-dest-sinimg">✦</div>}
                <div className="nv-dest-body">
                  <div className="nv-meta">
                    {esNueva(destacada) && <span className="nv-pill nv-pill-nuevo">Nuevo para vos</span>}
                    <span className="nv-pill" style={{background:TIPOS[destacada.tipo]?.bg,color:TIPOS[destacada.tipo]?.color}}>{TIPOS[destacada.tipo]?.txt || '✨ Nuevo'}</span>
                    <span className="nv-fecha">{formatFecha(destacada.publicada_at)}</span>
                  </div>
                  <h2 className="nv-dest-titulo">{destacada.titulo}</h2>
                  {destacada.descripcion && <p className="nv-dest-desc">{destacada.descripcion}</p>}
                  {destacada.link_url && (
                    <a href={destacada.link_url} className="nv-btn-link">Probarlo ahora →</a>
                  )}
                </div>
              </div>
            </article>

            {anteriores.length > 0 && (<>
              <button className="nv-ant-toggle" onClick={() => setVerAnteriores(!verAnteriores)}>
                {verAnteriores ? 'Ocultar novedades anteriores ▴' : `Ver novedades anteriores (${anteriores.length}) ▾`}
              </button>
              {verAnteriores && (
                <div className="nv-ant">
                  {anteriores.map(n => (
                    <div key={n.id} className="nv-ant-item">
                      <div className="nv-meta">
                        {esNueva(n) && <span className="nv-pill nv-pill-nuevo">Nuevo para vos</span>}
                        <span className="nv-pill" style={{background:TIPOS[n.tipo]?.bg,color:TIPOS[n.tipo]?.color}}>{TIPOS[n.tipo]?.txt || '✨ Nuevo'}</span>
                        <span className="nv-fecha">{formatFecha(n.publicada_at)}</span>
                      </div>
                      <h3 className="nv-ant-titulo">{n.titulo}</h3>
                      {n.descripcion && <p className="nv-ant-desc">{n.descripcion}</p>}
                      {n.link_url && <a href={n.link_url} style={{display:'inline-block',marginTop:'8px',fontSize:'13px',fontWeight:600,color:'#C9A84C',textDecoration:'none'}}>Probarlo →</a>}
                    </div>
                  ))}
                </div>
              )}
            </>)}
          </>)}

          {proximas.length > 0 && (<>
          <div className="nv-label">Próximas actualizaciones</div>
          <div className="nv-prox">
            {proximas.map((u, i) => (
              <div key={u.id || i} className="nv-prox-card"
                style={{
                  '--icon-bg': u.colorDim,
                  '--icon-border': u.color + '30',
                  '--eta-bg': u.colorDim,
                  '--eta-color': u.color,
                  '--eta-border': u.color + '30',
                } as React.CSSProperties}>
                <div className="nv-prox-icon">{u.icon}</div>
                <div className="nv-prox-eta">● {u.eta}</div>
                <h3 className="nv-prox-titulo">{u.titulo}</h3>
                <p className="nv-prox-desc">{u.desc}</p>
              </div>
            ))}
          </div>
          </>)}

          <div className="nv-label">Dejanos tu idea</div>
          <div className="nv-idea">
            {enviado ? (
              <div className="nv-ok">
                <div className="nv-ok-icon">✦</div>
                <div className="nv-idea-titulo">¡Gracias por tu idea!</div>
                <p className="nv-idea-sub" style={{margin:0}}>La leemos con atención. Así es como construimos Luma.</p>
                <button className="nv-ok-btn" onClick={() => setEnviado(false)}>Enviar otra idea</button>
              </div>
            ) : (<>
              <h2 className="nv-idea-titulo">¿Qué le falta a Luma?</h2>
              <p className="nv-idea-sub">Contanos qué te facilitaría el día a día. Las ideas que más se repiten pasan a Próximas actualizaciones.</p>
              <div className="nv-campo">
                <label htmlFor="nv-nombre">Tu nombre</label>
                <input id="nv-nombre" className="nv-input" placeholder="Opcional" value={nombre} maxLength={80}
                  onChange={e => setNombre(e.target.value)}/>
              </div>
              <div className="nv-campo">
                <label htmlFor="nv-idea">Tu idea</label>
                <textarea id="nv-idea" className="nv-textarea" maxLength={1500}
                  placeholder="¿Qué te gustaría poder hacer? ¿Qué problema te resolvería?"
                  value={sugerencia} onChange={e => { setSugerencia(e.target.value); setError('') }}/>
                <div className="nv-contador">{sugerencia.length}/1500</div>
              </div>
              {error && <div className="nv-error">{error}</div>}
              <button className="nv-enviar" onClick={enviarSugerencia} disabled={enviando || !sugerencia.trim()}>
                {enviando ? 'Enviando…' : '✦ Enviar mi idea'}
              </button>
            </>)}
          </div>
        </main>
      </div>
    </>
  )
}