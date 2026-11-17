import Preguntas from './Preguntas'
import { EMPRENDE, URL_CHECKOUT, MODULOS, QUE_RECIBIS, VIDEOS_EXTRA, BONOS, BONOS_CHIPS, PARA_QUIEN, FAQ } from '@/lib/emprende'

const COLOR: Record<string, string> = { p: '#FFC8DD', li: '#DCD0FF', mi: '#C9F0DD', pe: '#FFD6BC', am: '#FFEFA8', y: '#FFE27A' }
const IMG = '/landing/emprende/'

function Estrella({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true"><path d="M13 1l3.2 7.3L24 9.4l-5.8 5.3 1.7 7.8L13 18.2 6.1 22.5l1.7-7.8L2 9.4l7.8-1.1z" fill="#D6246E" /></svg>
  )
}
function Flecha() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  )
}

export default function Emprende() {
  const cinta = 'RECETARIO CON MÁS DE 30 RECETAS  ·  PLANILLA DE COSTOS  ·  ESTRATEGIAS DE VENTA  ·  PLANTILLAS DE MENSAJES  ·  TUS PRIMEROS CLIENTES  ·  '
  return (
    <>
      <div className="strip">Pago seguro con Mercado Pago · Acceso al instante por mail</div>
      <header className="top">
        <div className="logo"><Estrella />Luma Emprende</div>
        <a className="pill" href={URL_CHECKOUT}>Comprar</a>
      </header>

      <main>
        <div className="hero">
          <div className="c1" /><div className="c2" />
          <div className="dash" style={{ top: 150, right: 22, width: 34, height: 12, background: 'var(--bl)', transform: 'rotate(-24deg)' }} />
          <div className="dash" style={{ top: 262, left: -12, width: 30, height: 11, background: 'var(--hp)', transform: 'rotate(30deg)' }} />
          <div className="hin">
            <div>
              <span className="tag">Curso online + recetario</span>
              <h1>{EMPRENDE.titulo}</h1>
              <p className="lead">Un recetario con más de 30 recetas, herramientas y tips, planilla de costos, guías para vender y plantillas de mensajes. Todo en un aula que abrís desde el celu, tuya de por vida.</p>
              <div className="price"><b>{EMPRENDE.precioTexto}</b><span>pago único</span></div>
              <a className="btn" href={URL_CHECKOUT}>Quiero entrar al curso <Flecha /></a>
              <div className="small" style={{ textAlign: 'left' }}>Pagás con Mercado Pago: tarjeta, débito o saldo en cuenta.</div>
            </div>
            <div>
              <div className="pics">
                <img className="a" src={`${IMG}portada-v1.webp`} width={640} height={640} alt="Portada del curso Repostería en vasos" />
                <img className="b" src={`${IMG}foto-rosa-v1.webp`} width={640} height={640} alt="Vasito de chocolate, crema y frutillas" />
              </div>
              <div className="bonos-hero">
                <div className="m">De regalo con tu compra</div>
                <div className="chips">{BONOS_CHIPS.map(b => <span key={b}>{b}</span>)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="cinta" aria-hidden="true"><span>{cinta}{cinta}{cinta}{cinta}</span></div>

        <section id="curso">
          <div className="wrap">
            <div className="eyebrow">El curso por dentro</div>
            <h2>5 módulos para pasar de la primera receta a tu primer pedido</h2>
            <div className="mods">
              {MODULOS.map(m => (
                <div key={m.n} className={`mc${m.n === 1 ? ' m1' : ''}`} style={{ background: COLOR[m.color] }}>
                  <div className="hd"><div className="n">{m.n}</div><div><h3>{m.titulo}</h3>{m.extra && <div className="cnt">{m.extra}</div>}</div></div>
                  {m.lista ? (<>
                    <ul>{m.lista.map(x => <li key={x}>{x}</li>)}</ul>
                    <div className="sub" style={{ marginTop: 12 }}>{m.chips?.map(c => <span key={c} style={{ background: '#fff', color: 'var(--ink)' }}>{c}</span>)}</div>
                  </>) : <p>{m.texto}</p>}
                </div>
              ))}
              <div className="photo" style={{ minHeight: 200 }}><img loading="lazy" src={`${IMG}vasito-d-v1.webp`} width={640} height={640} alt="Cheesecake de frutilla en vasito" /></div>
            </div>
          </div>
        </section>

        <div className="dark">
          <div className="in">
            <div>
              <div className="eyebrow">Todo lo que entra cuando comprás</div>
              <h2>Un curso completo para aprender, calcular y vender</h2>
              {QUE_RECIBIS.map(r => (
                <div key={r.titulo} className="ck2">
                  <i style={{ background: COLOR[r.color] }} aria-hidden="true">✓</i>
                  <div><b>{r.titulo}</b><p>{r.texto}</p>{r.chips && <div className="sub">{r.chips.map(c => <span key={c}>{c}</span>)}</div>}</div>
                </div>
              ))}
              <div className="ck2 yt">
                <i style={{ background: '#FFD6BC' }} aria-hidden="true">▶</i>
                <div><b>{VIDEOS_EXTRA.titulo}</b><p>{VIDEOS_EXTRA.texto}</p></div>
              </div>
              <div className="dash2"><span className="eyebrow">De regalo con tu compra</span>{BONOS.map(b => <div key={b}>{b}</div>)}</div>
            </div>
            <div>
              <div className="eyebrow">Cómo se ve por dentro</div>
              <h3 style={{ fontSize: 34, lineHeight: 1.05, letterSpacing: '-1px', margin: '8px 0' }} className="bf">Un aula que se abre desde el celu</h3>
              <p style={{ fontSize: 16, lineHeight: 1.5, marginBottom: 14 }}>Entrás con tu mail y tu contraseña, retomás justo donde dejaste, marcás cada lección como hecha y anotás tus apuntes. Se instala como una app.</p>
              <div className="pcol">
                <div className="dev"><div className="sc"><div className="top2"><span>Luma</span><span className="av">VO</span></div>
                  <div className="resume"><span style={{ fontSize: 8, fontWeight: 700 }}>RETOMÁ DONDE DEJASTE</span><b>Cremoso de chocolate</b>Quedaste en el min 4:12<br /><span className="btn2">Continuar ▶</span></div>
                  <div className="card"><div className="crs"><img src={`${IMG}portada-v1.webp`} width={44} height={44} alt="" /><div><b style={{ fontSize: 10.5 }}>Postres en vaso, emprendé desde casa</b><br /><span className="tagok">✓ Acceso activo</span></div></div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}><div className="moon" /><div style={{ flex: 1 }}><b>5 de 30 lecciones</b><div className="pbar" /></div></div></div>
                  <div className="nav"><span className="on">Mis cursos</span><span>Cuaderno</span><span>Perfil</span></div></div></div>
                <div className="dev"><div className="sc"><div className="top2"><span>← Recetario</span><span className="av">VO</span></div>
                  <div className="vd"><b>▶</b><i /></div>
                  <div style={{ margin: '6px 8px' }}><b style={{ fontSize: 11 }}>Cheesecake de frutilla</b><br />Lección 3 de 30</div>
                  <div style={{ margin: '4px 8px' }}><span className="btn2" style={{ margin: 0 }}>✓ Marcar como hecha</span></div>
                  <div className="tabs"><span>Lección</span><span className="on">Mi cuaderno</span></div>
                  <div className="card" style={{ fontSize: 9 }}>Usar <span className="hl">frutillas bien frías</span> y no pasarse de la maicena. Anotar el tiempo de heladera.</div>
                  <div className="nav"><span>Mis cursos</span><span className="on">Cuaderno</span><span>Perfil</span></div></div></div>
                <div className="dev"><div className="sc"><div className="top2"><span>← Mis cursos</span><span className="av">VO</span></div>
                  <div style={{ margin: '2px 8px', fontWeight: 800, fontSize: 10.5 }}>Módulo 1 · Recetario</div>
                  <div className="les done"><i>✓</i>Cheesecake clásico</div><div className="les done"><i>✓</i>Cheesecake de frutilla</div><div className="les now"><i>▶</i>Cremoso de chocolate</div><div className="les"><i />Mousse de maracuyá</div><div className="les"><i />Shots para eventos</div>
                  <div style={{ margin: '8px 8px 2px', fontWeight: 800, fontSize: 10.5 }}>Descargables</div><div className="les"><i>↓</i>Planilla de costos (PDF)</div>
                  <div className="nav"><span className="on">Mis cursos</span><span>Cuaderno</span><span>Perfil</span></div></div></div>
              </div>
              <div className="note">Dibujo de ejemplo del aula. Los nombres de las lecciones son ilustrativos.</div>
            </div>
          </div>
        </div>

        <section>
          <div className="wrap two">
            <div>
              <div className="eyebrow">Para quién es</div>
              <h2>Si buscás un ingreso desde casa, este curso es para vos</h2>
              <div className="chipsb">{PARA_QUIEN.map(x => <span key={x.t} style={{ background: COLOR[x.c] }}>{x.t}</span>)}</div>
            </div>
            <div className="helpc"><b className="bf">¿Dudas con el acceso o el pago?</b>Escribinos por mail y te ayudamos. Te respondemos lo antes posible.</div>
          </div>
        </section>

        <div className="buy" id="comprar">
          <div className="c" />
          <div className="in">
            <div>
              <h2>Empezá hoy</h2>
              <div className="big bf">{EMPRENDE.precioTexto}</div>
              <p style={{ fontSize: 15, lineHeight: 1.55, marginBottom: 16 }}>Recetario con más de 30 recetas, herramientas y tips, planilla de costos, marketing y fotografía, y videos extra. De regalo: las 54 recetas de helados y flanes, las estrategias de venta, las plantillas de mensajes y la guía de primeros clientes.</p>
              <a className="btn" href={URL_CHECKOUT}>Quiero entrar al curso</a>
              <div className="small" style={{ textAlign: 'left' }}>Medios de pago: tarjeta, débito y saldo en Mercado Pago.</div>
            </div>
            <div className="pic"><img loading="lazy" src={`${IMG}vasito-a-v1.webp`} width={640} height={551} alt="Cheesecake de frutilla en vaso" /></div>
          </div>
        </div>

        <section>
          <div className="wrap">
            <h2>Preguntas frecuentes</h2>
            <Preguntas items={FAQ} />
          </div>
        </section>

        <div className="close">
          <h2>Tu primer vasito para vender te está esperando</h2>
          <a className="btn" href={URL_CHECKOUT}>Quiero entrar al curso</a>
        </div>
      </main>

      <footer>
        <div className="logo"><Estrella size={22} />Luma Emprende</div>
        <div className="l"><a href="/politica-de-privacidad">Política de privacidad</a></div>
        <div style={{ color: '#5B4668' }}>Pagos procesados por Mercado Pago. Mar del Plata, Argentina.</div>
      </footer>

      <div className="bar">
        <img className="th" src={`${IMG}portada-v1.webp`} width={44} height={44} alt="" />
        <div className="t"><b>Postres en vaso</b>{EMPRENDE.precioTexto}</div>
        <a className="go" href={URL_CHECKOUT}>Comprar</a>
      </div>
    </>
  )
}
