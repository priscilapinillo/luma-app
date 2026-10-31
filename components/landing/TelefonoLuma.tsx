// Celular realista para la landing y las pantallas de entrar (29/10).
// Dibuja el Inicio de Luma, una página de reservas o una página de Luma Links, con marco de iPhone.
// Se dibuja a tamaño real (390 × 844) y se achica con escala, así se ve igual que la app de verdad.
import type { CSSProperties } from 'react'
import { temaPublico, alfa, COMO_FUNCIONA_DEFAULT, type TemaPublico } from '@/lib/plantillas'

type Pantalla = 'inicio' | 'reserva' | 'links'

const ANCHO = 312
const ALTO = 645

function BarraEstado({ color }: { color: string }) {
  return (
    <div className="tl-estado" style={{ color }}>
      <span>9:41</span>
      <span className="tl-estado-ic">
        <svg width="19" height="12" viewBox="0 0 19 12" fill={color} aria-hidden="true"><rect x="0" y="8" width="3.2" height="4" rx="1" /><rect x="5" y="5.5" width="3.2" height="6.5" rx="1" /><rect x="10" y="3" width="3.2" height="9" rx="1" /><rect x="15" y="0" width="3.2" height="12" rx="1" /></svg>
        <svg width="17" height="12" viewBox="0 0 17 12" fill={color} aria-hidden="true"><path d="M8.5 2.6c2.3 0 4.4.9 6 2.4l1.2-1.2A10.2 10.2 0 0 0 8.5.9 10.2 10.2 0 0 0 1.3 3.8L2.5 5c1.6-1.5 3.7-2.4 6-2.4zm0 3.4c1.4 0 2.6.5 3.6 1.4l1.2-1.2a6.9 6.9 0 0 0-9.6 0l1.2 1.2c1-.9 2.2-1.4 3.6-1.4zm0 3.4c.5 0 .9.2 1.2.5L8.5 11.1 7.3 9.9c.3-.3.7-.5 1.2-.5z" /></svg>
        <svg width="27" height="13" viewBox="0 0 27 13" fill="none" aria-hidden="true"><rect x="0.5" y="0.5" width="23" height="12" rx="3.8" stroke={color} opacity=".4" /><rect x="2.5" y="2.5" width="17" height="8" rx="2.2" fill={color} /><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2z" fill={color} opacity=".45" /></svg>
      </span>
    </div>
  )
}

const DIAS: [string, string, boolean, boolean?][] = [['27', 'lun', true], ['28', 'mar', false], ['29', 'hoy', true, true], ['30', 'vie', true], ['31', 'sáb', false], ['1', 'dom', false]]
const TURNOS = [
  { h: '10:00', dur: '60 min', n: 'Sofía Méndez', s: 'Lectura de tarot', p: 'Pagó $15.000 con Mercado Pago', c: '#3E7D57', hecha: true },
  { h: '15:30', dur: '45 min', n: 'Carla Ruiz', s: 'Reiki a distancia', p: 'Paga en la sesión · $12.000', c: '#8A5A0B', hecha: false },
  { h: '18:00', dur: '60 min', n: 'Lucía P. · nueva', s: 'Primera lectura', p: 'Reservó desde tu página', c: '#625A92', hecha: false, sel: true },
]

function Inicio() {
  return (
    <div className="tl-inicio">
      <BarraEstado color="#27344A" />
      <div className="tl-in-cuerpo">
        <header className="tl-in-head">
          <div><div className="tl-in-fecha">jueves, 29 de octubre</div><div className="tl-in-saludo">Buen día, Flor</div></div>
          <div className="tl-in-btns"><span>Ver mi página</span><span>Copiar link</span></div>
          <div className="tl-in-busca">Buscar consultante o turno</div>
        </header>
        <div className="tl-in-cuenta">
          <div className="ac"><b>hoy</b><span>3</span></div>
          <div><b>mañana</b><span>2</span></div>
          <div><b>pasado</b><span>4</span></div>
        </div>
        <section className="tl-in-card">
          <div className="tl-in-top"><b>Turnos</b><span>3 · 1 hecho</span></div>
          <div className="tl-in-mes"><i>‹</i><b>Octubre</b><i>›</i></div>
          <div className="tl-in-dias">
            {DIAS.map(([n, s, punto, hoy]) => (
              <span key={n} className={hoy ? 'hoy' : ''}><b>{n}</b><small>{s}</small>{punto && <em />}</span>
            ))}
          </div>
          {TURNOS.map((t, i) => (
            <div key={t.h} className="tl-in-fila">
              <div className="tl-in-hora"><b>{t.h}</b><small>{t.dur}</small></div>
              <div className="tl-in-eje"><i style={{ background: t.c }} /><span style={{ background: i === TURNOS.length - 1 ? 'transparent' : '#E6DCCE' }} /></div>
              <div className={`tl-in-turno${t.hecha ? ' hecha' : ''}${t.sel ? ' sel' : ''}`}>
                <div className="tl-in-txt"><b>{t.n}</b><span>{t.s}</span><em style={{ color: t.c }}>{t.p}</em></div>
                <span className={`tl-in-chk${t.hecha ? ' ok' : ''}`}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
              </div>
            </div>
          ))}
        </section>
        <div className="tl-in-agendar"><span className="tl-gira" aria-hidden="true" /><i aria-hidden="true" /><b>+ Agendar turno</b></div>
      </div>
      <span className="tl-in-menu" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h10" /></svg></span>
    </div>
  )
}

function Arco({ t, ancho, inicial, fondoFoto }: { t: TemaPublico; ancho: number; inicial: string; fondoFoto?: string }) {
  return (
    <div className="tl-marco" style={{ width: ancho }}>
      <div className="tl-carta" style={{ borderColor: t.label, background: fondoFoto || `linear-gradient(175deg, ${t.banda} 0%, ${t.acento} 100%)`, boxShadow: `0 0 34px 4px ${alfa(t.acento, 0.6)}, 0 0 70px 10px ${alfa(t.acento, 0.28)}` }}>
        <span className="tl-silueta-cabeza" style={{ background: alfa(t.texto, 0.22) }} />
        <span className="tl-silueta-cuerpo" style={{ background: alfa(t.texto, 0.22) }} />
        <span className="tl-inicial" style={{ color: t.texto }}>{inicial}</span>
      </div>
      <div className="tl-marco-linea" style={{ background: t.label, filter: `drop-shadow(0 0 6px ${alfa(t.acento, 0.55)})` }} />
    </div>
  )
}

// Réplica de la página de reservas de verdad (app/p/[slug]/page.tsx): mismo orden, mismas medidas y mismos colores.
// Portada → «Cómo funciona» → Servicios / Cursos / Links. Con `recorrido` baja sola para mostrar todo.
const ZODIACOS = [
  { s: '♈', top: '6%', left: '4%', size: 20, rot: '-8deg' }, { s: '♌', top: '10%', left: '92%', size: 17, rot: '10deg' },
  { s: '♎', top: '66%', left: '6%', size: 18, rot: '6deg' }, { s: '♓', top: '4%', left: '62%', size: 15, rot: '-4deg' },
  { s: '♊', top: '70%', left: '93%', size: 16, rot: '12deg' }, { s: '♑', top: '24%', left: '3%', size: 14, rot: '9deg' },
  { s: '♐', top: '30%', left: '95%', size: 15, rot: '-11deg' }, { s: '♋', top: '46%', left: '4%', size: 13, rot: '5deg' },
]
const DESTELLOS = [
  { s: '✦', top: '20%', left: '8%', size: 12, delay: '0s' }, { s: '✧', top: '58%', left: '15%', size: 9, delay: '.9s' },
  { s: '✦', top: '10%', left: '82%', size: 10, delay: '1.6s' }, { s: '✧', top: '60%', left: '90%', size: 8, delay: '.4s' },
  { s: '✦', top: '48%', left: '3%', size: 8, delay: '2.1s' }, { s: '✧', top: '35%', left: '96%', size: 7, delay: '1.2s' },
]
const SERVICIOS_EJ = [
  { n: 'Lectura de tarot', d: 'Una tirada para ordenar lo que estás viviendo y decidir con calma.', p: '15.000', m: '60 min' },
  { n: 'Reiki a distancia', d: 'Una sesión para soltar tensión y volver a tu centro, desde tu casa.', p: '12.000', m: '45 min' },
]

function Reserva({ t, recorrido }: { t: TemaPublico; recorrido?: boolean }) {
  const vars = {
    '--bg': t.bg, '--primary': t.primary, '--primary-light': t.primaryLight, '--primary-dim': t.primaryDim,
    '--accent': t.accent, '--accent-light': t.accentLight, '--accent-dim': t.accentDim,
    '--text': t.text, '--text-dim': t.textDim, '--cream': t.cream, '--border': t.border, '--card-bg': t.cardBg,
    '--btn-bg': t.btnBg, '--btn-color': t.btnColor, '--superficie': t.superficie, '--banda': t.banda,
    '--acento': t.acento, '--sobre-acento': t.sobreAcento, '--luz': t.luz,
    background: t.bg, color: t.text,
  } as CSSProperties
  return (
    <div className={`tr${recorrido ? ' tr-recorre' : ''}`} style={vars}>
      <div className="tr-nav" style={{ background: `linear-gradient(${t.navBg}, ${t.navBg}), ${t.bg}`, borderBottom: t.dark ? 'none' : `.5px solid ${t.border}` }}>
        <BarraEstado color={t.cream} />
        <div className="tr-nav-fila">
          <span className="tr-logo">{t.id === 'luna' ? '✦ ' : ''}FLOR</span>
          <span className="tr-nav-cta">Reservar sesión</span>
        </div>
      </div>

      <div className="tr-scroll">
        <section className="tr-hero" style={{ background: `radial-gradient(circle at 14% 18%, ${t.accentDim} 0%, transparent 42%), radial-gradient(circle at 88% 8%, ${t.primaryDim} 0%, transparent 38%), radial-gradient(circle at 78% 92%, ${t.accentDim} 0%, transparent 46%), ${t.heroBg}` }}>
          <div className="tr-grano" style={{ opacity: t.dark ? 0.14 : 0.09 }} />
          <div className="tr-mandala" style={{ backgroundImage: `url('${t.patronFondo}')`, opacity: t.dark ? 0.2 : 0.16 }} />
          {ZODIACOS.map((z, i) => <span key={i} className="tr-zodiaco" style={{ top: z.top, left: z.left, fontSize: z.size, ['--rot' as string]: z.rot } as CSSProperties}>{z.s}</span>)}
          {DESTELLOS.map((d, i) => <span key={i} className="tr-destello" style={{ top: d.top, left: d.left, fontSize: d.size, animationDelay: d.delay }}>{d.s}</span>)}

          <div className="tr-cartawrap">
            <Arco t={t} ancho={270} inicial="" fondoFoto={t.foto} />
            <div className="tr-etiqueta">{t.deco} Tarotista</div>
          </div>
          <div className="tr-esp">Tarotista · Lecturas online</div>
          <div className="tr-nombre">Flor · Tarot</div>
          <div className="tr-bio">Lecturas para ordenar, no para asustar.</div>
          <span className="tr-cta">
            <span className="tr-cta-dots" />
            <svg className="tr-chispa" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
              <path d="M14.187 8.096L15 5.25L15.813 8.096C16.0231 8.83114 16.4171 9.50062 16.9577 10.0413C17.4984 10.5819 18.1679 10.9759 18.903 11.186L21.75 12L18.904 12.813C18.1689 13.0231 17.4994 13.4171 16.9587 13.9577C16.4181 14.4984 16.0241 15.1679 15.814 15.903L15 18.75L14.187 15.904C13.9769 15.1689 13.5829 14.4994 13.0423 13.9587C12.5016 13.4181 11.8321 13.0241 11.097 12.814L8.25 12L11.096 11.187C11.8311 10.9769 12.5006 10.5829 13.0413 10.0423C13.5819 9.50162 13.9759 8.83214 14.186 8.097L14.187 8.096Z" />
              <path d="M6 14.25L5.741 15.285C5.59267 15.8785 5.28579 16.4206 4.85319 16.8532C4.42059 17.2858 3.87853 17.5927 3.285 17.741L2.25 18L3.285 18.259C3.87853 18.4073 4.42059 18.7142 4.85319 19.1468C5.28579 19.5794 5.59267 20.1215 5.741 20.715L6 21.75L6.259 20.715C6.40725 20.1216 6.71398 19.5796 7.14639 19.147C7.5788 18.7144 8.12065 18.4075 8.714 18.259L9.75 18L8.714 17.741C8.12065 17.5925 7.5788 17.2856 7.14639 16.853C6.71398 16.4204 6.40725 15.8784 6.259 15.285L6 14.25Z" />
            </svg>
            <span className="tr-cta-txt">{t.deco} Reservar sesión</span>
          </span>
          <span className="tr-cta2">Ver cursos</span>
          <div className="tr-confianza">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            Sesiones online · Espacio seguro y confidencial
          </div>
          <svg className="tr-baja" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
        </section>

        <section className="tr-franja" style={{ background: t.banda }}>
          <div className="tr-sec">
            <div className="tr-label">Cómo funciona</div>
            <div className="tr-como">
              {COMO_FUNCIONA_DEFAULT.pasos.map((p, i) => (
                <div key={p} className="tr-paso"><span className="tr-num">{i + 1}</span><span className="tr-pasotxt">{p}</span></div>
              ))}
            </div>
          </div>
        </section>

        <section className="tr-franja" style={{ background: t.bg }}>
          <div className="tr-sec">
            <div className="tr-label">Servicios</div>
            <div className="tr-titulo">¿Cómo puedo acompañarte?</div>
            <div className="tr-sub">Elegí el servicio que resuene con lo que necesitás hoy</div>
            <div className="tr-tabs">
              <span className="tr-tab tr-tab1">Servicios</span><span className="tr-tab tr-tab2">Cursos</span><span className="tr-tab">Links</span>
              <span className="tr-glider" />
            </div>
            <div className="tr-busca">Buscar servicios, cursos o links...</div>
            <div className="tr-paneles">
              <div className="tr-p1">
                {SERVICIOS_EJ.map(s => (
                  <div key={s.n} className="tr-serv">
                    <div className="tr-serv-tipo"><i />Sesión en vivo</div>
                    <div className="tr-serv-nombre">{s.n}</div>
                    <div className="tr-serv-desc">{s.d}</div>
                    <div className="tr-serv-pie">
                      <div><div className="tr-serv-precio">$ {s.p}</div><div className="tr-serv-meta"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>{s.m}</div></div>
                      <span className="tr-serv-btn">Ver detalles</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="tr-p2">
                <div className="tr-curso" style={{ background: t.foto }}>
                  <div className="tr-curso-vel" />
                  <div className="tr-curso-badge">Inicial</div>
                  <div className="tr-curso-h">Tarot desde cero</div>
                  <div className="tr-curso-desc">Aprendé a leer las cartas a tu ritmo, con clases, ejercicios y certificado.</div>
                  <div className="tr-curso-pie"><span className="tr-curso-precio">$45.000 <small>· USD 40</small></span><span className="tr-curso-btn">{t.deco} Ver detalle</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function Links({ t }: { t: TemaPublico }) {
  const card: CSSProperties = { background: alfa(t.superficie, t.dark ? 0.85 : 0.9), borderColor: alfa(t.label, 0.3) }
  return (
    <div className="tl-pub" style={{ background: `radial-gradient(420px 380px at 50% 22%, ${t.banda}, transparent 72%), ${t.fondo}`, color: t.texto }}>
      <BarraEstado color={t.texto} />
      <div style={{ height: 18 }} />
      <Arco t={t} ancho={190} inicial="" />
      <span className="tl-pub-nombre" style={{ fontSize: 34 }}>Luna Tarot</span>
      <span className="tl-pub-esp" style={{ color: t.label, marginTop: 6 }}>TAROT Y ASTROLOGÍA</span>
      <div className="tl-lk">
        {['Reservá por WhatsApp', 'Mi Instagram', 'Guía gratis de la luna'].map(x => (
          <span key={x} style={card}><i style={{ borderColor: t.acento }} />{x}</span>
        ))}
        <span className="tl-lk-promo" style={{ background: t.acento, color: t.sobreAcento, boxShadow: `0 12px 28px ${alfa(t.acento, 0.5)}` }}>{t.deco} Elegí una carta</span>
      </div>
    </div>
  )
}

export default function TelefonoLuma({ pantalla = 'inicio', tema, escala = 1, className, style, recorrido }: {
  pantalla?: Pantalla; tema?: TemaPublico; escala?: number; className?: string; style?: CSSProperties
  recorrido?: boolean // solo en «reserva»: la página baja sola y muestra todo lo que se puede reservar y comprar
}) {
  const t = tema || (pantalla === 'links' ? temaPublico('luna', 'oscuro') : temaPublico('rosa', 'claro'))
  return (
    <div className={`tl${className ? ' ' + className : ''}`} style={{ width: ANCHO * escala, height: ALTO * escala, ...style }} aria-hidden="true">
      <div className="tl-escala" style={{ transform: `scale(${escala})` }}>
        <span className="tl-boton" style={{ left: -3, top: 118, height: 30 }} />
        <span className="tl-boton" style={{ left: -3, top: 170, height: 56 }} />
        <span className="tl-boton" style={{ left: -3, top: 236, height: 56 }} />
        <span className="tl-boton der" style={{ right: -3, top: 190, height: 86 }} />
        <div className="tl-borde">
          <div className="tl-bisel">
            <div className="tl-pantalla">
              <div className="tl-real">
                {pantalla === 'inicio' && <Inicio />}
                {pantalla === 'reserva' && <Reserva t={t} recorrido={recorrido} />}
                {pantalla === 'links' && <Links t={t} />}
              </div>
              <span className="tl-isla" />
              <span className="tl-home" />
              <span className="tl-brillo" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// estilos del celular: se ponen una sola vez en la página que lo usa
export const ESTILOS_TELEFONO = `
.tl{position:relative;flex-shrink:0}
.tl-escala{position:absolute;left:0;top:0;width:${ANCHO}px;height:${ALTO}px;transform-origin:0 0;font-family:'Inter',sans-serif}
.tl-boton{position:absolute;width:4px;border-radius:2px 0 0 2px;background:linear-gradient(90deg,#15171B,#4A4E57)}
.tl-boton.der{border-radius:0 2px 2px 0;background:linear-gradient(270deg,#15171B,#4A4E57)}
.tl-borde{position:absolute;inset:0;border-radius:56px;padding:4px;background:linear-gradient(145deg,#5B606B 0%,#2A2D33 22%,#1A1C20 50%,#3A3E46 78%,#16181C 100%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.18),inset 0 1px 2px rgba(255,255,255,.25)}
.tl-bisel{width:100%;height:100%;border-radius:52px;padding:9px;background:#040506;box-sizing:border-box}
.tl-pantalla{position:relative;width:286px;height:619px;border-radius:44px;overflow:hidden;background:#F5EEE4}
.tl-real{width:390px;height:844px;transform:scale(.7333);transform-origin:0 0;position:relative;letter-spacing:-.01em}
.tl-isla{position:absolute;top:9px;left:50%;transform:translateX(-50%);width:90px;height:26px;border-radius:16px;background:#000}
.tl-home{position:absolute;bottom:7px;left:50%;transform:translateX(-50%);width:100px;height:4px;border-radius:3px;background:#1B1B1F;opacity:.85}
.tl-brillo{position:absolute;inset:0;border-radius:44px;pointer-events:none;background:linear-gradient(118deg,rgba(255,255,255,.22) 0%,rgba(255,255,255,.06) 26%,rgba(255,255,255,0) 40%)}
.tl-estado{height:54px;padding:18px 30px 0 40px;box-sizing:border-box;display:flex;justify-content:space-between;align-items:center;font:600 17px 'Inter',sans-serif;letter-spacing:-.02em;width:100%}
.tl-estado-ic{display:flex;gap:6px;align-items:center}
.tl-inicio{width:390px;height:844px;background:#F5EEE4;color:#27344A;position:relative}
.tl-in-cuerpo{padding:6px 14px 0;display:flex;flex-direction:column;gap:10px}
.tl-in-head{background:#27344A;color:#F0E6D8;border-radius:20px;padding:13px 14px;display:flex;flex-direction:column;gap:9px}
.tl-in-fecha{font-size:11px;color:#C9C0D9}.tl-in-saludo{font:800 15px 'Manrope',sans-serif;margin-top:2px}
.tl-in-btns{display:flex;gap:8px}.tl-in-btns span{flex:1;height:25px;border-radius:8px;background:rgba(240,230,216,.1);border:1px solid rgba(240,230,216,.2);display:flex;align-items:center;justify-content:center;font:600 11px 'Inter',sans-serif}
.tl-in-busca{height:30px;border-radius:10px;background:rgba(240,230,216,.1);border:1px solid rgba(240,230,216,.2);display:flex;align-items:center;padding:0 10px;font-size:11px;color:#B9B3C6}
.tl-in-cuenta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.tl-in-cuenta div{background:#FFFCF7;border:1px solid #E6DCCE;border-radius:18px;padding:10px 12px;display:flex;flex-direction:column;gap:6px}
.tl-in-cuenta div.ac{background:#DCD3E6;border-color:transparent}
.tl-in-cuenta b{font:700 15px 'Fraunces',Georgia,serif;color:#6E7388}.tl-in-cuenta .ac b{color:#4C5580}
.tl-in-cuenta span{font:800 30px/1 'Fraunces',Georgia,serif}
.tl-in-card{background:#FFFCF7;border:1px solid #E6DCCE;border-radius:22px;padding:14px 12px 4px;box-shadow:0 2px 18px rgba(39,52,74,.07)}
.tl-in-top{display:flex;justify-content:space-between;margin-bottom:8px}.tl-in-top b{font:800 18px 'Manrope',sans-serif}.tl-in-top span{font-size:12px;color:#6E7388;margin-top:3px}
.tl-in-mes{display:flex;align-items:center;gap:6px;margin-bottom:8px}
.tl-in-mes i{width:30px;height:30px;border-radius:10px;border:1px solid #E6DCCE;background:#FBF7F1;display:flex;align-items:center;justify-content:center;color:#6E7388;font-style:normal;font-size:18px}
.tl-in-mes b{font:700 13px 'Manrope',sans-serif;min-width:84px;text-align:center}
.tl-in-dias{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:5px;margin-bottom:12px}
.tl-in-dias span{position:relative;height:50px;border-radius:13px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px solid #E6DCCE;background:#FBF7F1;color:#6E7388}
.tl-in-dias span.hoy{border-color:#27344A;background:#27344A;color:#FFFCF7}
.tl-in-dias b{font:700 14px 'Inter',sans-serif}.tl-in-dias small{font-size:9.5px}
.tl-in-dias em{position:absolute;bottom:4px;width:4px;height:4px;border-radius:50%;background:currentColor;opacity:.6}
.tl-in-fila{display:flex;gap:10px}
.tl-in-hora{width:46px;text-align:right;padding-top:12px;flex-shrink:0;display:flex;flex-direction:column}
.tl-in-hora b{font:700 14.5px 'Manrope',sans-serif}.tl-in-hora small{font-size:10.5px;color:#6E7388}
.tl-in-eje{width:10px;display:flex;flex-direction:column;align-items:center;flex-shrink:0}
.tl-in-eje i{width:10px;height:10px;border-radius:50%;margin-top:18px;flex-shrink:0}.tl-in-eje span{flex:1;width:2px;margin-top:4px}
.tl-in-turno{flex:1;min-width:0;margin-bottom:10px;background:#FBF7F1;border:1px solid #E6DCCE;border-radius:16px;padding:12px 10px 12px 13px;display:flex;gap:8px;align-items:flex-start}
.tl-in-turno.hecha{opacity:.6}.tl-in-turno.sel{border-color:#27344A;box-shadow:0 6px 18px rgba(39,52,74,.07)}
.tl-in-txt{flex:1;min-width:0;display:flex;flex-direction:column}
.tl-in-txt b{font:700 15px 'Manrope',sans-serif}.tl-in-txt span{font-size:12.5px;color:#6E7388;margin-top:2px}
.tl-in-txt em{font-style:normal;font-size:12.5px;font-weight:600;margin-top:7px}
.tl-in-chk{width:40px;height:40px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;border:1.5px solid #E6DCCE;background:#FFFCF7;color:#9A9CAE}
.tl-in-chk.ok{border-color:#3E7D57;background:#3E7D57;color:#FFFCF7}
.tl-in-agendar{position:relative;overflow:hidden;isolation:isolate;height:58px;border-radius:18px;display:flex;align-items:center;justify-content:center}
.tl-gira{position:absolute;inset:-300%;background:conic-gradient(from 0deg,transparent 0deg 290deg,#F0E6D8 330deg,transparent 360deg);z-index:-2;animation:tlGira 4s linear infinite}
.tl-in-agendar i{position:absolute;inset:2px;border-radius:16px;background:#27344A;z-index:-1}
.tl-in-agendar b{color:#F0E6D8;font:700 15.5px 'Manrope',sans-serif}
@keyframes tlGira{to{transform:rotate(360deg)}}
.tl-in-menu{position:absolute;right:16px;bottom:40px;width:54px;height:54px;border-radius:50%;background:#27344A;color:#F0E6D8;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 24px rgba(39,52,74,.35)}
.tl-pub{width:390px;height:844px;position:relative;display:flex;flex-direction:column;align-items:center}
.tl-marco{position:relative;aspect-ratio:1080/1608;margin-top:6px;flex-shrink:0}
.tl-carta{position:absolute;left:6.1%;width:87.8%;top:10.6%;height:78.1%;border-radius:50% 50% 0 0 / 37.7% 37.7% 0 0;border:2px solid;overflow:hidden}
.tl-silueta-cabeza{position:absolute;left:50%;top:22%;transform:translateX(-50%);width:34%;aspect-ratio:1;border-radius:50%}
.tl-silueta-cuerpo{position:absolute;left:50%;bottom:-6%;transform:translateX(-50%);width:82%;height:44%;border-radius:50% 50% 0 0}
.tl-inicial{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:600 64px 'Cormorant Garamond',serif}
.tl-marco-linea{position:absolute;inset:0;-webkit-mask:url('/landing/tarotista.png') center / 100% 119.4% no-repeat;mask:url('/landing/tarotista.png') center / 100% 119.4% no-repeat}
.tl-pub-esp{font-size:11px;font-weight:800;letter-spacing:3px;margin-top:2px}
.tl-pub-nombre{font:600 40px/.95 'Cormorant Garamond',serif;margin-top:4px}
/* ── réplica de la página de reservas (mismos valores que app/p/[slug]/page.tsx) ── */
.tr{width:390px;height:844px;position:relative;overflow:hidden;font-family:'Inter',sans-serif}
.tr *{box-sizing:border-box}
.tr-nav{position:absolute;top:0;left:0;right:0;z-index:20}
.tr-nav-fila{display:flex;justify-content:space-between;align-items:center;padding:4px 24px 14px}
.tr-logo{font:600 14px/1.2 'Cormorant Garamond',serif;letter-spacing:1px;color:var(--primary)}
.tr-nav-cta{padding:8px 20px;background:var(--btn-bg);color:var(--btn-color);border:.5px solid var(--primary-dim);border-radius:50px;font:500 12px 'Inter',sans-serif;letter-spacing:1px;text-transform:uppercase}
.tr-scroll{position:absolute;left:0;top:0;width:390px}
.tr-hero{position:relative;height:844px;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:100px 20px 56px;text-align:center}
.tr-grano{position:absolute;inset:0;pointer-events:none;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")}
.tr-mandala{position:absolute;inset:0;pointer-events:none;background-size:cover;background-position:center;background-repeat:no-repeat}
.tr-zodiaco{position:absolute;color:var(--primary-light);opacity:.28;font-family:serif;text-shadow:0 0 10px var(--primary-dim);animation:trZodi 7s ease-in-out infinite}
@keyframes trZodi{0%,100%{transform:translateY(0) rotate(var(--rot,0deg))}50%{transform:translateY(-8px) rotate(var(--rot,0deg))}}
.tr-destello{position:absolute;color:var(--accent-light);opacity:0;animation:trDestello 2.8s ease-in-out infinite}
@keyframes trDestello{0%,100%{opacity:0;transform:scale(.6) rotate(0deg)}50%{opacity:.8;transform:scale(1) rotate(90deg)}}
.tr-cartawrap{position:relative;margin-bottom:30px;width:270px}
.tr-cartawrap .tl-marco{margin-top:0}
.tr-etiqueta{position:absolute;left:50%;bottom:3%;transform:translateX(-50%);white-space:nowrap;font:700 11px 'Inter',sans-serif;letter-spacing:.1em;padding:8px 14px;border-radius:18px;background:var(--superficie);color:var(--cream);box-shadow:0 6px 16px rgba(0,0,0,.18);z-index:3}
.tr-esp{position:relative;font:600 13px 'Inter',sans-serif;color:var(--primary);letter-spacing:3px;text-transform:uppercase;margin-bottom:14px}
.tr-nombre{position:relative;font:300 24px/1.15 'Cormorant Garamond',serif;color:var(--cream);letter-spacing:-1px;margin-bottom:8px}
.tr-bio{position:relative;font:400 17px/1.5 'Inter',sans-serif;color:var(--text);max-width:340px;margin-bottom:22px}
.tr-cta{position:relative;isolation:isolate;display:flex;align-items:center;gap:.5rem;padding:16px 36px;margin-bottom:14px}
.tr-cta::before{content:'';position:absolute;inset:0;z-index:0;background:var(--acento);border-radius:9999px;box-shadow:inset 0 .5px hsl(0,0%,100%),inset 0 -1px 2px 0 hsl(0,0%,0%),0 4px 10px -4px hsla(0,0%,0%,1)}
.tr-cta-dots{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:calc(100% + 2px);height:calc(100% + 2px);border-radius:9999px;overflow:hidden;z-index:-10}
.tr-cta-dots::before{content:'';position:absolute;top:30%;left:50%;transform-origin:left;width:100%;height:2rem;background:var(--luz);-webkit-mask:linear-gradient(transparent 0%,white 120%);mask:linear-gradient(transparent 0%,white 120%);animation:trGiraLuz 2s linear infinite}
@keyframes trGiraLuz{to{transform:rotate(360deg)}}
.tr-chispa{position:relative;z-index:10;width:1.6rem;flex-shrink:0;color:var(--sobre-acento)}
.tr-cta-txt{position:relative;z-index:10;color:var(--sobre-acento);font:600 14px 'Inter',sans-serif;letter-spacing:2px;text-transform:uppercase;white-space:nowrap}
.tr-cta2{position:relative;display:inline-flex;padding:12px 28px;border:.5px solid var(--primary-dim);border-radius:50px;color:var(--primary);font:600 12px 'Inter',sans-serif;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:14px}
.tr-confianza{position:relative;display:flex;align-items:center;gap:6px;font:400 11px 'Inter',sans-serif;color:var(--text-dim);letter-spacing:1px}
.tr-baja{position:absolute;bottom:22px;left:50%;margin-left:-10px;color:var(--primary-dim)}
.tr-franja{position:relative}
.tr-sec{padding:56px 20px}
.tr-label{display:flex;justify-content:center;font:700 10px 'Inter',sans-serif;letter-spacing:4px;text-transform:uppercase;color:var(--primary);margin-bottom:12px}
.tr-como{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:6px}
.tr-paso{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center}
.tr-num{width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:700 23px 'Cormorant Garamond',serif;background:var(--superficie);color:var(--cream);box-shadow:0 6px 14px rgba(0,0,0,.12)}
.tr-pasotxt{font:600 13px/1.35 'Inter',sans-serif;color:var(--cream)}
.tr-titulo{font:300 32px/1.1 'Cormorant Garamond',serif;color:var(--cream);letter-spacing:-1px;text-align:center;margin-bottom:8px}
.tr-sub{font:400 14px 'Inter',sans-serif;color:var(--text-dim);text-align:center;margin-bottom:28px}
.tr-tabs{display:flex;position:relative;background:var(--card-bg);border:.5px solid var(--border);border-radius:14px;overflow:hidden;width:fit-content;margin:0 auto 24px;box-shadow:0 8px 24px rgba(0,0,0,.15)}
.tr-tab{flex:1;display:flex;align-items:center;justify-content:center;min-width:90px;font:600 12px 'Inter',sans-serif;padding:10px 18px;color:var(--text-dim);position:relative;z-index:2}
.tr-tab1{color:var(--btn-color)}
.tr-glider{position:absolute;top:0;bottom:0;left:0;width:33.333%;border-radius:12px;z-index:1;background:var(--btn-bg);box-shadow:0 0 18px var(--accent-dim)}
.tr-busca{width:100%;padding:12px 16px;border-radius:50px;border:.5px solid var(--border);background:var(--card-bg);color:var(--text-dim);font:400 14px 'Inter',sans-serif;margin-bottom:24px}
.tr-paneles{display:grid}
.tr-p1,.tr-p2{grid-area:1/1}
.tr-p1{display:flex;flex-direction:column;gap:12px}
.tr-p2{opacity:0;pointer-events:none}
.tr-serv{position:relative;overflow:hidden;background:var(--card-bg);border:.5px solid var(--border);border-radius:16px;padding:20px}
.tr-serv::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;border-radius:0 2px 2px 0;background:linear-gradient(to bottom,var(--primary),var(--accent))}
.tr-serv-tipo{display:flex;align-items:center;gap:6px;font:700 9px 'Inter',sans-serif;letter-spacing:3px;text-transform:uppercase;color:var(--primary);margin-bottom:6px}
.tr-serv-tipo i{width:8px;height:8px;border-radius:50%;background:#E5484D}
.tr-serv-nombre{font:500 20px 'Cormorant Garamond',serif;color:var(--cream);margin-bottom:4px}
.tr-serv-desc{font:400 13px/1.6 'Inter',sans-serif;color:var(--text-dim);margin-bottom:12px}
.tr-serv-pie{display:flex;justify-content:space-between;align-items:center}
.tr-serv-precio{font:500 22px 'Cormorant Garamond',serif;color:var(--primary-light)}
.tr-serv-meta{display:flex;align-items:center;gap:6px;font:400 11px 'Inter',sans-serif;color:var(--text-dim)}
.tr-serv-btn{padding:8px 20px;border:.5px solid var(--primary-dim);color:var(--primary);border-radius:50px;font:600 11px 'Inter',sans-serif;letter-spacing:2px;text-transform:uppercase}
.tr-curso{position:relative;overflow:hidden;border-radius:24px;padding:20px 18px 18px;min-height:380px;display:flex;flex-direction:column;justify-content:flex-end;box-shadow:0 16px 40px rgba(0,0,0,.35)}
.tr-curso-vel{position:absolute;inset:0;z-index:1;background:linear-gradient(to bottom,transparent 0%,color-mix(in srgb,color-mix(in srgb,black 60%,var(--accent) 40%) 65%,transparent) 45%,color-mix(in srgb,color-mix(in srgb,black 88%,var(--accent) 12%) 65%,transparent) 100%)}
.tr-curso>*:not(.tr-curso-vel){position:relative;z-index:2}
.tr-curso-badge{font:700 10px 'Inter',sans-serif;letter-spacing:1px;text-transform:uppercase;color:var(--primary-light);opacity:.9;margin-bottom:4px}
.tr-curso-h{font:600 21px/1.15 'Cormorant Garamond',serif;color:#fff;margin-bottom:6px}
.tr-curso-desc{font:400 12px/1.3 'Inter',sans-serif;color:rgba(255,255,255,.8);margin-bottom:14px}
.tr-curso-pie{display:flex;align-items:center;justify-content:space-between;gap:8px}
.tr-curso-precio{font:600 16px 'Cormorant Garamond',serif;color:#fff}.tr-curso-precio small{font-size:13px;font-weight:500;opacity:.85}
.tr-curso-btn{padding:9px 16px;background:#fff;color:#1A1035;border-radius:50px;font:700 11px 'Inter',sans-serif;white-space:nowrap}
/* recorrido: portada → Cómo funciona → Servicios → Cursos → vuelve arriba */
.tr-recorre .tr-scroll{animation:trBaja 16s ease-in-out infinite}
.tr-recorre .tr-glider{animation:trGlider 16s ease-in-out infinite}
.tr-recorre .tr-tab1{animation:trTab1 16s ease-in-out infinite}
.tr-recorre .tr-tab2{animation:trTab2 16s ease-in-out infinite}
.tr-recorre .tr-p1{animation:trP1 16s ease-in-out infinite}
.tr-recorre .tr-p2{animation:trP2 16s ease-in-out infinite}
@keyframes trBaja{0%,16%{transform:translateY(0)}28%,84%{transform:translateY(-965px)}96%,100%{transform:translateY(0)}}
@keyframes trGlider{0%,46%{transform:translateX(0)}52%,80%{transform:translateX(100%)}86%,100%{transform:translateX(0)}}
@keyframes trTab1{0%,46%{color:var(--btn-color)}52%,80%{color:var(--text-dim)}86%,100%{color:var(--btn-color)}}
@keyframes trTab2{0%,46%{color:var(--text-dim)}52%,80%{color:var(--btn-color)}86%,100%{color:var(--text-dim)}}
@keyframes trP1{0%,46%{opacity:1}52%,80%{opacity:0}86%,100%{opacity:1}}
@keyframes trP2{0%,46%{opacity:0}52%,80%{opacity:1}86%,100%{opacity:0}}
@media (prefers-reduced-motion:reduce){.tr-recorre .tr-scroll,.tr-recorre .tr-glider,.tr-recorre .tr-tab1,.tr-recorre .tr-tab2,.tr-recorre .tr-p1,.tr-recorre .tr-p2,.tr-zodiaco,.tr-destello,.tr-cta-dots::before{animation:none}}
.tl-lk{width:100%;box-sizing:border-box;padding:22px 22px 0;display:flex;flex-direction:column;gap:11px}
.tl-lk span{display:flex;align-items:center;gap:12px;padding:15px 16px;border-radius:16px 16px 34px 34px;border:1px solid;font:600 19px 'Cormorant Garamond',serif}
.tl-lk span i{width:30px;height:30px;border-radius:50%;border:1px solid;flex-shrink:0}
.tl-lk .tl-lk-promo{justify-content:center;gap:8px;border-radius:16px;border:none;font:800 15px 'Inter',sans-serif}
@media (prefers-reduced-motion:reduce){.tl-gira{animation:none}}
`
