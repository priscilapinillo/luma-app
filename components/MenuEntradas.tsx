'use client'

// Menú de la landing: "Iniciar sesión ▾" y "Registrarse ▾".
// Cada opción va directo a su página (sin pantallas intermedias).
// Se ve igual en compu y en celular. Se cierra tocando afuera o con Escape.
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Moon, GraduationCap, Link2, CalendarHeart, Sparkles } from 'lucide-react'

type Opcion = { href: string; titulo: string; emoji: string; detalle: string; Icono: typeof Moon }

const ENTRAR: Opcion[] = [
  { href: '/auth/login', titulo: 'Soy terapeuta', emoji: '🔮', detalle: 'Tu agenda, consultantes y cobros', Icono: Moon },
  { href: '/aula', titulo: 'Soy alumna', emoji: '📚', detalle: 'Los cursos que compraste', Icono: GraduationCap },
  { href: '/links/login', titulo: 'Luma Links', emoji: '🔗', detalle: 'Tu página de links', Icono: Link2 },
]

const REGISTRAR: Opcion[] = [
  { href: '/auth/register', titulo: 'Luma', emoji: '🌙', detalle: 'Agenda, reservas, cobros y cursos. 7 días gratis', Icono: CalendarHeart },
  { href: '/links/registro', titulo: 'Luma Links', emoji: '✨', detalle: 'Tu página de links, gratis para siempre', Icono: Sparkles },
]

export default function MenuEntradas() {
  const [abierto, setAbierto] = useState<null | 'entrar' | 'registrar'>(null)
  const cajaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    function fuera(e: MouseEvent | TouchEvent) {
      if (cajaRef.current && !cajaRef.current.contains(e.target as Node)) setAbierto(null)
    }
    function tecla(e: KeyboardEvent) { if (e.key === 'Escape') setAbierto(null) }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('touchstart', fuera, { passive: true })
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('touchstart', fuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [abierto])

  function lista(id: 'entrar' | 'registrar', opciones: Opcion[]) {
    if (abierto !== id) return null
    return (
      <div className="me-panel" role="menu" id={`me-${id}`}>
        {opciones.map(o => (
          <Link key={o.href} href={o.href} className="me-opcion" role="menuitem" onClick={() => setAbierto(null)}>
            <span className="me-icono" aria-hidden="true"><o.Icono size={18} strokeWidth={1.8} /></span>
            <span className="me-textos">
              <span className="me-titulo">{o.titulo} <span aria-hidden="true">{o.emoji}</span></span>
              <span className="me-detalle">{o.detalle}</span>
            </span>
          </Link>
        ))}
      </div>
    )
  }

  return (
    <div className="me-caja" ref={cajaRef}>
      <style>{`
        .me-caja{display:flex;align-items:center;gap:10px}
        .me-item{position:relative}
        .me-btn{display:inline-flex;align-items:center;gap:6px;font-family:inherit;cursor:pointer;white-space:nowrap;transition:background .2s,color .2s,border-color .2s}
        .me-btn svg{transition:transform .2s}
        .me-btn[aria-expanded="true"] svg{transform:rotate(180deg)}
        .me-entrar{background:transparent;border:1px solid rgba(255,255,255,0.22);color:#F3EEFF;font-size:14px;font-weight:500;padding:9px 14px;border-radius:10px}
        .me-entrar:hover,.me-entrar[aria-expanded="true"]{background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.4)}
        .me-registrar{background:linear-gradient(135deg,#8B5CF6,#A78BFA);border:1px solid transparent;color:#fff;font-size:14px;font-weight:700;padding:9px 16px;border-radius:10px;box-shadow:0 6px 20px rgba(139,92,246,0.35)}
        .me-btn:focus-visible,.me-opcion:focus-visible{outline:2px solid #C9A84C;outline-offset:3px}
        .me-panel{position:absolute;right:0;top:calc(100% + 10px);width:290px;max-width:calc(100vw - 32px);
          background:#1A1430;border:1px solid rgba(201,168,76,0.28);border-radius:14px;padding:6px;
          box-shadow:0 18px 40px rgba(0,0,0,0.45);z-index:300;animation:meAbrir .16s ease}
        @keyframes meAbrir{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
        .me-opcion{display:flex;align-items:center;gap:12px;padding:12px;border-radius:10px;text-decoration:none;color:#F4EFE6}
        .me-opcion+.me-opcion{margin-top:2px}
        .me-opcion:hover{background:rgba(139,92,246,0.16)}
        .me-icono{width:36px;height:36px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(201,168,76,0.12);color:#C9A84C}
        .me-textos{display:flex;flex-direction:column;gap:2px;min-width:0}
        .me-titulo{font-size:15px;font-weight:600;line-height:1.3}
        .me-detalle{font-size:12.5px;color:#B7A9D9;line-height:1.4}
        @media(max-width:640px){
          .me-caja{gap:8px;position:relative}
          .me-item{position:static}
          .me-entrar,.me-registrar{font-size:13px;padding:8px 10px}
        }
        @media(max-width:360px){
          .me-entrar,.me-registrar{font-size:12px;padding:8px 8px;gap:4px}
        }
        @media(prefers-reduced-motion:reduce){.me-panel{animation:none}.me-btn svg{transition:none}}
      `}</style>

      <div className="me-item">
        <button type="button" className="me-btn me-entrar" aria-haspopup="menu" aria-expanded={abierto === 'entrar'}
          aria-controls="me-entrar" onClick={() => setAbierto(abierto === 'entrar' ? null : 'entrar')}>
          Iniciar sesión <ChevronDown size={15} aria-hidden="true" />
        </button>
        {lista('entrar', ENTRAR)}
      </div>

      <div className="me-item">
        <button type="button" className="me-btn me-registrar" aria-haspopup="menu" aria-expanded={abierto === 'registrar'}
          aria-controls="me-registrar" onClick={() => setAbierto(abierto === 'registrar' ? null : 'registrar')}>
          Registrarse <ChevronDown size={15} aria-hidden="true" />
        </button>
        {lista('registrar', REGISTRAR)}
      </div>
    </div>
  )
}
