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
              <span className="me-titulo">{o.titulo}</span>
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
        .me-entrar{background:transparent;border:1px solid rgba(240,230,216,0.28);color:#F0E6D8;font-size:14px;font-weight:600;padding:10px 14px;border-radius:12px}
        .me-entrar:hover,.me-entrar[aria-expanded="true"]{background:rgba(240,230,216,0.1);border-color:rgba(240,230,216,0.45)}
        .me-registrar{background:#F0E6D8;border:1px solid transparent;color:#27344A;font-size:14px;font-weight:800;padding:10px 16px;border-radius:12px;box-shadow:0 8px 22px rgba(0,0,0,0.25)}
        .me-registrar:hover{background:#FFFCF7}
        .me-btn:focus-visible,.me-opcion:focus-visible{outline:2px solid #D6A6A5;outline-offset:3px}
        .me-panel{position:absolute;right:0;top:calc(100% + 10px);width:290px;max-width:calc(100vw - 32px);
          background:#FFFCF7;border:1px solid #E6DCCE;border-radius:18px;padding:6px;
          box-shadow:0 22px 50px rgba(39,52,74,0.25);z-index:300;animation:meAbrir .16s ease}
        @keyframes meAbrir{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
        .me-opcion{display:flex;align-items:center;gap:12px;padding:12px;border-radius:14px;text-decoration:none;color:#27344A}
        .me-opcion+.me-opcion{margin-top:2px}
        .me-opcion:hover{background:#F1ECF4}
        .me-icono{width:36px;height:36px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#E9E3EF;color:#4C5580}
        .me-textos{display:flex;flex-direction:column;gap:2px;min-width:0}
        .me-titulo{font-size:15px;font-weight:700;line-height:1.3}
        .me-detalle{font-size:12.5px;color:#6E7388;line-height:1.4}
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
