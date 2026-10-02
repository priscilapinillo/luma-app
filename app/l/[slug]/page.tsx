'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { Camera, Music2, PlayCircle, Mic, MessageCircle, Mail, FileDown, ShoppingBag, Link as LinkIcon } from 'lucide-react'

type Link = { tipo: string; titulo: string; url: string; imagen_url?: string }
type Promo = { activa: boolean; titulo: string; descripcion: string; texto_boton: string; url: string }
type Perfil = {
  nombre: string; profesion: string; bio: string
  foto_url: string; template: string; links: Link[]; promo: Promo | null
}

const TEMPLATES: Record<string, any> = {
  luna: { bg: '#0D0B14', card: 'rgba(26,22,40,0.55)', border: 'rgba(201,168,76,0.25)', primary: '#C9A84C', text: '#F0E8D5', textDim: '#B8A88F', fondo: '/landing/fondo-pagina-publica.png', dark: true },
  aura: { bg: '#F8F4FF', card: 'rgba(255,255,255,0.55)', border: 'rgba(124,58,237,0.2)', primary: '#7C3AED', text: '#1F2937', textDim: '#6B7280', fondo: '/landing/fondo-claro.png', dark: false },
  tierra: { bg: '#FAF7F0', card: 'rgba(255,255,255,0.55)', border: 'rgba(146,64,14,0.2)', primary: '#92400E', text: '#1C1917', textDim: '#78716C', fondo: '/landing/fondo-claro.png', dark: false },
  rosa: { bg: '#FFF0F6', card: 'rgba(255,255,255,0.6)', border: 'rgba(190,24,93,0.2)', primary: '#BE185D', text: '#2D0A25', textDim: '#9D7A95', fondo: '/landing/fondo-claro.png', dark: false },
  violeta: { bg: '#1E0A3C', card: 'rgba(61,21,112,0.5)', border: 'rgba(192,132,252,0.25)', primary: '#C084FC', text: '#FAF5FF', textDim: '#C4B5FD', fondo: '/landing/fondo-pagina-publica.png', dark: true },
  verde: { bg: '#F0FDF4', card: 'rgba(255,255,255,0.6)', border: 'rgba(6,95,70,0.2)', primary: '#065F46', text: '#022C22', textDim: '#6B7280', fondo: '/landing/fondo-pagina-publica.png', dark: false },
}

const ROMANOS = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII']

const ICONOS: Record<string, any> = {
    instagram: Camera, tiktok: Music2, youtube: PlayCircle, podcast: Mic,
    whatsapp: MessageCircle, email: Mail, descargable: FileDown, tienda: ShoppingBag, otro: LinkIcon,
  }

export default function LinksPublicPage() {
  const params = useParams()
  const slug = params.slug as string
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(true)
  const [cartaElegida, setCartaElegida] = useState<number | null>(null)

  useEffect(() => { cargar() }, [slug])

  async function cargar() {
    const supabase = createClient()
    const { data } = await supabase
      .from('luma_links_profiles')
      .select('nombre, profesion, bio, foto_url, template, links, promo')
      .eq('slug', slug)
      .maybeSingle()
    if (data) setPerfil({ ...data, links: data.links || [], promo: data.promo || null })
    setLoading(false)
  }

  if (loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0D0B14',color:'#C9A84C',fontFamily:'serif'}}>cargando...</div>
  if (!perfil) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif'}}>Página no encontrada</div>

  const t = TEMPLATES[perfil.template] || TEMPLATES.luna
  const promo = perfil.promo && perfil.promo.activa && perfil.promo.url ? perfil.promo : null

  return (
    <div style={{minHeight:'100vh',position:'relative',background:t.bg,fontFamily:"'Jost',sans-serif",color:t.text}}>
      <style>{`
        
        *{box-sizing:border-box;margin:0;padding:0}
        .lp-bg{position:fixed;inset:0;z-index:0;background-image:url('${t.fondo}');background-size:cover;background-position:center;opacity:${t.dark ? 0.22 : 0.14}}
        .lp-content{position:relative;z-index:1;max-width:480px;margin:0 auto;padding:40px 20px 60px;display:flex;flex-direction:column;align-items:center}
        .lp-carta-wrap{position:relative;margin-bottom:14px;animation:lpFloat 4.5s ease-in-out infinite}
        .lp-carta-glow{position:absolute;inset:-30px;border-radius:50%;background:radial-gradient(circle, ${t.primary}55, transparent 70%);filter:blur(18px);z-index:0;animation:lpPulso 3.5s ease-in-out infinite}
        .lp-carta{position:relative;z-index:1;width:190px;height:290px;border-radius:16px;overflow:hidden;border:1.5px solid ${t.primary};box-shadow:0 20px 50px rgba(0,0,0,0.3)}
        .lp-carta img{width:100%;height:100%;object-fit:cover;position:relative;z-index:1}
        .lp-carta::before{content:'';position:absolute;inset:7px;border:1px solid ${t.primary}AA;border-radius:10px;pointer-events:none;z-index:2}
        .lp-carta::after{content:'';position:absolute;inset:11px;border:1px solid ${t.primary}55;border-radius:8px;pointer-events:none;z-index:2}
        @keyframes lpFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes lpPulso{0%,100%{opacity:0.5;transform:scale(1)}50%{opacity:0.85;transform:scale(1.08)}}
        .lp-nombre{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:600;margin-bottom:2px;text-align:center}
        .lp-profesion{font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${t.primary};margin-bottom:10px}
        .lp-bio{font-size:14px;color:${t.textDim};text-align:center;line-height:1.6;max-width:340px;margin-bottom:28px}
        .lp-links{display:flex;flex-direction:column;gap:22px;width:100%}
        .lp-link-card{
          position:relative;display:flex;align-items:center;gap:16px;
          border-radius:20px 20px 56px 56px;overflow:hidden;
          background:${t.card};border:1px solid ${t.border};
          backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
          text-decoration:none;box-shadow:0 14px 34px rgba(0,0,0,0.18);
          padding:24px 18px 20px;min-height:88px;
        }
        .lp-link-card::before{
          content:'';position:absolute;inset:6px;border:1px solid ${t.border};
          border-radius:16px 16px 46px 46px;pointer-events:none;
        }
        .lp-link-num{
          position:absolute;top:10px;left:50%;transform:translateX(-50%);
          font-family:'Cormorant Garamond',serif;font-size:10px;letter-spacing:3px;
          color:${t.primary};opacity:0.75;
        }
        .lp-link-glow{
          position:absolute;width:120px;height:120px;top:-40px;right:-40px;
          background:radial-gradient(circle, ${t.primary}33, transparent 70%);
          filter:blur(10px);pointer-events:none;
        }
        .lp-link-icon{
          position:relative;width:46px;height:46px;border-radius:50%;flex-shrink:0;
          background:radial-gradient(circle, ${t.primary}22, transparent 75%);
          border:1px solid ${t.primary}66;display:flex;align-items:center;justify-content:center;
          box-shadow:0 0 16px ${t.primary}33;
        }
        .lp-link-body{flex:1;min-width:0;position:relative}
        .lp-link-tipo{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${t.textDim};margin-bottom:3px}
        .lp-link-titulo{font-family:'Cormorant Garamond',serif;font-size:19px;font-weight:600;color:${t.text}}

        .lp-link-descarga{
          position:relative;display:flex;flex-direction:column;overflow:hidden;
          border-radius:20px 20px 56px 56px;
          background:${t.card};border:1px solid ${t.border};
          backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
          text-decoration:none;box-shadow:0 14px 34px rgba(0,0,0,0.18);
        }
        .lp-link-descarga::before{
          content:'';position:absolute;inset:6px;border:1px solid ${t.border};
          border-radius:16px 16px 46px 46px;pointer-events:none;z-index:2;
        }
        .lp-link-descarga-num{
          position:absolute;top:10px;left:50%;transform:translateX(-50%);
          font-family:'Cormorant Garamond',serif;font-size:10px;letter-spacing:3px;
          color:${t.primary};opacity:0.9;z-index:3;
          text-shadow:0 1px 4px rgba(0,0,0,0.6);
        }
        .lp-link-descarga-img{width:100%;height:170px;overflow:hidden}
        .lp-link-descarga-img img{width:100%;height:100%;object-fit:cover}
        .lp-link-descarga-default{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(160deg, ${t.primary}33, ${t.bg})}
        .lp-link-descarga-body{padding:16px 18px 22px;text-align:center}
        .lp-footer{margin-top:36px;font-size:10px;color:${t.textDim};text-align:center;letter-spacing:1px}
        .lp-footer a{color:${t.primary};text-decoration:none;font-weight:700}

        .lp-promo{position:relative;width:100%;margin-top:40px;padding-top:10px}
        .lp-promo-titulo{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:600;text-align:center;color:${t.text};margin-bottom:8px}
        .lp-promo-sub{font-size:14px;color:${t.textDim};text-align:center;margin:0 auto 34px;letter-spacing:0.3px;transition:opacity .3s;max-width:280px}
        .lp-promo-sub.oculto{opacity:0}
        .lp-promo-overlay{position:fixed;inset:0;background:rgba(5,4,10,0.72);opacity:0;pointer-events:none;transition:opacity .4s ease;z-index:20}
        .lp-promo-overlay.on{opacity:1;pointer-events:auto}
        .lp-promo-filas{display:flex;justify-content:center;gap:16px;position:relative;z-index:21}

        .lp-carta-slot{width:124px;height:225px;position:relative;transition:opacity .35s ease, transform .35s ease}
        .lp-carta-slot.oculta{opacity:0;transform:translateY(10px) scale(.92);pointer-events:none}
        .lp-carta-slot.elegida{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:22}

        .lp-carta-3d{width:100%;height:100%;position:relative;cursor:pointer;transform-style:preserve-3d;transition:transform .7s cubic-bezier(.34,1.56,.64,1);transform:perspective(1200px)}
        .lp-carta-slot.elegida .lp-carta-3d{transform:perspective(1200px) rotateY(180deg) scale(2.1);cursor:default}

        .lp-cara{position:absolute;inset:0;border-radius:12px 12px 28px 28px;backface-visibility:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 10px 26px rgba(0,0,0,0.4)}
        .lp-dorso{background:linear-gradient(160deg, ${t.primary}33, ${t.bg});border:1px solid ${t.primary}77}
        .lp-dorso::before{content:'';position:absolute;inset:7px;border:1px solid ${t.primary}44;border-radius:8px 8px 20px 20px}
        .lp-dorso-simbolo{font-size:22px;color:${t.primary};opacity:0.85}
        .lp-dorso-glow{position:absolute;inset:0;border-radius:12px 12px 28px 28px;transition:box-shadow .3s}
        .lp-carta-slot:not(.elegida):hover .lp-dorso-glow{box-shadow:0 0 22px 2px ${t.primary}55}

        .lp-frente{background:${t.card};border:1px solid ${t.primary}88;transform:rotateY(180deg);padding:22px 16px  45px;text-align:center;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);display:flex;flex-direction:column;align-items:center;justify-content:center}
        .lp-frente::before{content:'';position:absolute;inset:6px;border:1px solid ${t.primary}44;border-radius:8px 8px 20px 20px;pointer-events:none}
        .lp-frente-cerrar{position:absolute;top:10px;right:12px;width:22px;height:22px;border-radius:50%;background:${t.primary}22;display:flex;align-items:center;justify-content:center;font-size:12px;color:${t.text};cursor:pointer;z-index:5;line-height:1}
        .lp-frente-etiqueta{font-size:8px;letter-spacing:1.5px;text-transform:uppercase;color:${t.primary};margin-bottom:5px;font-weight:700}
        .lp-frente-titulo{font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:600;font-size:16px;color:${t.text};line-height:1.05;margin-bottom:6px}
        .lp-frente-desc{font-size:9px;color:${t.textDim};line-height:1.2;margin-bottom:8px}
        .lp-frente-btn{font-size:8px;font-weight:700;letter-spacing:0.3px;text-transform:uppercase;color:${t.dark ? '#1A1035' : '#fff'};background:${t.primary};border-radius:20px;padding:6px 14px;text-decoration:none}
      `}</style>

      <div className="lp-bg"/>

      <div className="lp-content">
      <div className="lp-carta-wrap">
          <div className="lp-carta-glow"/>
          <div className="lp-carta">
            {perfil.foto_url && <img src={perfil.foto_url} alt={perfil.nombre}/>}
          </div>
        </div>
        <div className="lp-nombre">{perfil.nombre}</div>
        {perfil.profesion && <div className="lp-profesion">{perfil.profesion}</div>}
        {perfil.bio && <p className="lp-bio">{perfil.bio}</p>}

        <div className="lp-links">
          {[...perfil.links]
            .sort((a, b) => (a.tipo === 'descargable' ? 1 : 0) - (b.tipo === 'descargable' ? 1 : 0))
            .map((link, i) => {
            const Icon = ICONOS[link.tipo] || LinkIcon
            const numero = ROMANOS[i] || String(i + 1)
            const esDescargable = link.tipo === 'descargable'
            if (esDescargable) {
              return (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="lp-link-descarga">
                  <div className="lp-link-descarga-num">✦ {numero} ✦</div>
                  <div className="lp-link-descarga-img">
                    {link.imagen_url
                      ? <img src={link.imagen_url} alt={link.titulo}/>
                      : <div className="lp-link-descarga-default"><FileDown size={32} color={t.primary}/></div>}
                  </div>
                  <div className="lp-link-descarga-body">
                    <div className="lp-link-tipo">Descargable</div>
                    <div className="lp-link-titulo">{link.titulo}</div>
                  </div>
                </a>
              )
            }
            return (
              <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="lp-link-card">
                <div className="lp-link-num">✦ {numero} ✦</div>
                <div className="lp-link-glow"/>
                <div className="lp-link-icon"><Icon size={20} color={t.primary}/></div>
                <div className="lp-link-body">
                  <div className="lp-link-tipo">{link.tipo}</div>
                  <div className="lp-link-titulo">{link.titulo}</div>
                </div>
              </a>
            )
          })}
        </div>

        {promo && (
          <div className="lp-promo">
            <div className="lp-promo-titulo">✦ Elegí una carta ✦</div>
            <div className={`lp-promo-sub${cartaElegida !== null ? ' oculto' : ''}`}>Tu recompensa de hoy te espera en una de las tres</div>
            <div className={`lp-promo-overlay${cartaElegida !== null ? ' on' : ''}`} onClick={() => setCartaElegida(null)}/>
            <div className="lp-promo-filas">
              {[0, 1, 2].map(i => (
                <div key={i} className={`lp-carta-slot${cartaElegida !== null && cartaElegida !== i ? ' oculta' : ''}${cartaElegida === i ? ' elegida' : ''}`}>
                  <div className="lp-carta-3d" onClick={() => cartaElegida === null && setCartaElegida(i)}>
                    <div className="lp-cara lp-dorso">
                      <div className="lp-dorso-glow"/>
                      <div className="lp-dorso-simbolo">{['✦', '☾', '☉'][i]}</div>
                    </div>
                    <div className="lp-cara lp-frente">
                      <div className="lp-frente-cerrar" onClick={(e) => { e.stopPropagation(); setCartaElegida(null) }}>✕</div>
                      <div className="lp-frente-etiqueta">Oferta especial</div>
                      <div className="lp-frente-titulo">{promo.titulo}</div>
                      {promo.descripcion && <div className="lp-frente-desc">{promo.descripcion}</div>}
                      

                      <a href={promo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="lp-frente-btn"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {promo.texto_boton || 'Ver más'}
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="lp-footer">Creado con <a href="https://lumaapp.lat" target="_blank" rel="noopener noreferrer">Luma</a></div>
      </div>
    </div>
  )
}