'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { X, Minus, Send } from 'lucide-react'

type Mensaje = {
  rol: 'luma' | 'terapeuta'
  texto: string
  timestamp: Date
}

const BIENVENIDA = `¡Hola! Soy Luma ✦ Puedo ayudarte con información sobre tus pacientes y tu trabajo. Podés preguntarme cosas como:

— ¿Cuándo fue la última sesión de María?
— ¿Cuánto generé este mes?
— ¿Qué temas trabaja Ana recurrentemente?
— ¿Cuántas sesiones tuve esta semana?

¿En qué te ayudo hoy?`

export default function LumaChat({ isMobile }: { isMobile: boolean }) {
  const [abierto, setAbierto] = useState(false)
  const [minimizado, setMinimizado] = useState(false)
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    { rol: 'luma', texto: BIENVENIDA, timestamp: new Date() }
  ])
  const [input, setInput] = useState('')
  const [cargando, setCargando] = useState(false)
  const [confirmarCerrar, setConfirmarCerrar] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
    }
    getUser()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  async function enviar() {
    if (!input.trim() || cargando || !userId) return
    const pregunta = input.trim()
    setInput('')
    setMensajes(prev => [...prev, { rol: 'terapeuta', texto: pregunta, timestamp: new Date() }])
    setCargando(true)
    try {
      const res = await fetch('/api/ia/paciente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pregunta, userId }),
      })
      const data = await res.json()
      setMensajes(prev => [...prev, { 
        rol: 'luma', 
        texto: data.respuesta || 'No pude procesar tu consulta. Intentá de nuevo.', 
        timestamp: new Date() 
      }])
    } catch {
      setMensajes(prev => [...prev, { 
        rol: 'luma', 
        texto: 'Hubo un error al consultar. Intentá de nuevo.', 
        timestamp: new Date() 
      }])
    } finally {
      setCargando(false)
      inputRef.current?.focus()
    }
  }

  function handleCerrar() {
    if (mensajes.length > 1) {
      setConfirmarCerrar(true)
    } else {
      setAbierto(false)
      setMinimizado(false)
    }
  }

  function confirmarYCerrar() {
    setAbierto(false)
    setMinimizado(false)
    setConfirmarCerrar(false)
    setMensajes([{ rol: 'luma', texto: BIENVENIDA, timestamp: new Date() }])
  }

  // ── BOLA DE CRISTAL ──────────────────────────────────────────────────────
  const bola = (
    <button
      onClick={() => { setAbierto(true); setMinimizado(false) }}
      style={{
        width: isMobile ? '44px' : '36px',
        height: isMobile ? '44px' : '36px',
        borderRadius: '50%',
        border: 'none',
        cursor: 'pointer',
        background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9), rgba(196,168,255,0.6) 40%, rgba(139,92,246,0.9) 70%, rgba(88,28,220,1))',
        boxShadow: '0 0 16px rgba(139,92,246,0.7), 0 0 32px rgba(139,92,246,0.3), inset 0 0 8px rgba(255,255,255,0.4)',
        animation: 'bolaFloat 3s ease-in-out infinite',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: isMobile ? '20px' : '16px',
        flexShrink: 0,
        position: 'relative',
      }}
      title="Preguntale a Luma"
    >
      <span style={{filter:'drop-shadow(0 0 4px rgba(255,255,255,0.8))'}}>🔮</span>
    </button>
  )

  // ── CHAT MOBILE (pantalla completa) ──────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <style>{`
          @keyframes bolaFloat {
            0%,100%{transform:translateY(0) scale(1);box-shadow:0 0 16px rgba(139,92,246,0.7),0 0 32px rgba(139,92,246,0.3)}
            50%{transform:translateY(-4px) scale(1.05);box-shadow:0 0 24px rgba(139,92,246,0.9),0 0 48px rgba(139,92,246,0.4)}
          }
          @keyframes msgIn {
            from{opacity:0;transform:translateY(8px)}
            to{opacity:1;transform:translateY(0)}
          }
          .luma-burbuja { animation: msgIn 0.2s ease; }
        `}</style>

        {/* Bola flotante mobile */}
        {(!abierto || minimizado) && (
          <div style={{ marginBottom: '8px' }}>
            {bola}
          </div>
        )}

        {/* Chat pantalla completa */}
        {abierto && !minimizado && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: '#F4F0FF',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Header */}
            <div style={{
              background: 'white',
              borderBottom: '0.5px solid rgba(139,92,246,0.15)',
              padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: '12px',
              paddingTop: 'calc(12px + env(safe-area-inset-top))',
            }}>
              <img src="/icon-192.png" alt="Luma"
                style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(139,92,246,0.3)' }}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#1A1035' }}>Luma</div>
                <div style={{ fontSize: '11px', color: '#8B5CF6' }}>Tu asistente de trabajo ✦</div>
              </div>
              <button onClick={() => setMinimizado(true)}
                style={{ width: '32px', height: '32px', borderRadius: '50%', border: '0.5px solid rgba(139,92,246,0.2)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
                <Minus size={14}/>
              </button>
              <button onClick={handleCerrar}
                style={{ width: '32px', height: '32px', borderRadius: '50%', border: '0.5px solid rgba(139,92,246,0.2)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
                <X size={14}/>
              </button>
            </div>

            {/* Mensajes */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {mensajes.map((m, i) => (
                <div key={i} className="luma-burbuja" style={{
                  display: 'flex', gap: '8px',
                  flexDirection: m.rol === 'terapeuta' ? 'row-reverse' : 'row',
                  alignItems: 'flex-end',
                }}>
                  {m.rol === 'luma' && (
                    <img src="/icon-192.png" alt="Luma"
                      style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}/>
                  )}
                  <div style={{
                    maxWidth: '75%',
                    padding: '10px 14px',
                    borderRadius: m.rol === 'terapeuta' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: m.rol === 'terapeuta' ? 'linear-gradient(135deg,#8B5CF6,#7C3AED)' : 'white',
                    color: m.rol === 'terapeuta' ? 'white' : '#1A1035',
                    fontSize: '14px', lineHeight: '1.6',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {m.texto}
                  </div>
                </div>
              ))}
              {cargando && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <img src="/icon-192.png" alt="Luma" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}/>
                  <div style={{ background: 'white', padding: '12px 16px', borderRadius: '18px 18px 18px 4px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[0,1,2].map(i => (
                        <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#8B5CF6', animation: `bolaFloat ${0.6 + i * 0.2}s ease-in-out infinite` }}/>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef}/>
            </div>

            {/* Input */}
            <div style={{
              background: 'white',
              borderTop: '0.5px solid rgba(139,92,246,0.15)',
              padding: '12px 16px',
              paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
              display: 'flex', gap: '8px', alignItems: 'center',
            }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviar()}
                placeholder="Preguntale a Luma..."
                style={{
                  flex: 1, padding: '10px 14px',
                  borderRadius: '50px',
                  border: '0.5px solid rgba(139,92,246,0.3)',
                  background: '#F4F0FF',
                  fontSize: '14px', fontFamily: 'inherit',
                  color: '#1A1035', outline: 'none',
                }}
              />
              <button onClick={enviar} disabled={!input.trim() || cargando}
                style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: input.trim() && !cargando ? 'linear-gradient(135deg,#8B5CF6,#7C3AED)' : 'rgba(139,92,246,0.2)',
                  border: 'none', cursor: input.trim() && !cargando ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s', flexShrink: 0,
                }}>
                <Send size={16} color={input.trim() && !cargando ? 'white' : '#8B5CF6'}/>
              </button>
            </div>
          </div>
        )}

        {/* Modal confirmar cerrar */}
        {confirmarCerrar && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: 'white', borderRadius: '20px', padding: '28px 24px', maxWidth: '320px', width: '100%', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔮</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#1A1035', marginBottom: '8px' }}>¿Cerrás el chat?</div>
              <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '24px', lineHeight: 1.6 }}>Esta conversación no tiene historial. Si cerrás, se borra todo.</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setConfirmarCerrar(false)}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '0.5px solid rgba(139,92,246,0.3)', background: 'transparent', color: '#8B5CF6', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancelar
                </button>
                <button onClick={confirmarYCerrar}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg,#8B5CF6,#7C3AED)', color: 'white', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // ── CHAT DESKTOP ──────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes bolaFloat {
          0%,100%{transform:translateY(0) scale(1);filter:drop-shadow(0 0 8px rgba(139,92,246,0.6))}
          50%{transform:translateY(-3px) scale(1.05);filter:drop-shadow(0 0 14px rgba(139,92,246,0.9))}
        }
        @keyframes msgIn {
          from{opacity:0;transform:translateY(6px)}
          to{opacity:1;transform:translateY(0)}
        }
        @keyframes chatIn {
          from{opacity:0;transform:translateX(12px) scale(0.97)}
          to{opacity:1;transform:translateX(0) scale(1)}
        }
        .luma-burbuja { animation: msgIn 0.2s ease; }
      `}</style>

      {/* Bola en sidebar desktop */}
      <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {bola}
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}
          onClick={() => { setAbierto(true); setMinimizado(false) }}>
          Preguntale a Luma
        </span>
      </div>

      {/* Panel de chat desktop */}
      {abierto && !minimizado && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '216px',
          width: '320px',
          height: '480px',
          background: '#F4F0FF',
          borderRadius: '20px',
          border: '0.5px solid rgba(139,92,246,0.2)',
          boxShadow: '0 8px 40px rgba(139,92,246,0.2)',
          display: 'flex', flexDirection: 'column',
          zIndex: 9999,
          animation: 'chatIn 0.2s ease',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            background: 'white',
            borderBottom: '0.5px solid rgba(139,92,246,0.15)',
            padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <img src="/icon-192.png" alt="Luma"
              style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(139,92,246,0.3)' }}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#1A1035' }}>Luma</div>
              <div style={{ fontSize: '10px', color: '#8B5CF6' }}>Tu asistente de trabajo ✦</div>
            </div>
            <button onClick={() => setMinimizado(true)}
              style={{ width: '24px', height: '24px', borderRadius: '50%', border: '0.5px solid rgba(139,92,246,0.2)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
              <Minus size={11}/>
            </button>
            <button onClick={handleCerrar}
              style={{ width: '24px', height: '24px', borderRadius: '50%', border: '0.5px solid rgba(139,92,246,0.2)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
              <X size={11}/>
            </button>
          </div>

          {/* Mensajes */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {mensajes.map((m, i) => (
              <div key={i} className="luma-burbuja" style={{
                display: 'flex', gap: '6px',
                flexDirection: m.rol === 'terapeuta' ? 'row-reverse' : 'row',
                alignItems: 'flex-end',
              }}>
                {m.rol === 'luma' && (
                  <img src="/icon-192.png" alt="Luma"
                    style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}/>
                )}
                <div style={{
                  maxWidth: '80%',
                  padding: '8px 12px',
                  borderRadius: m.rol === 'terapeuta' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: m.rol === 'terapeuta' ? 'linear-gradient(135deg,#8B5CF6,#7C3AED)' : 'white',
                  color: m.rol === 'terapeuta' ? 'white' : '#1A1035',
                  fontSize: '12.5px', lineHeight: '1.6',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  whiteSpace: 'pre-wrap',
                }}>
                  {m.texto}
                </div>
              </div>
            ))}
            {cargando && (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
                <img src="/icon-192.png" alt="Luma" style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}/>
                <div style={{ background: 'white', padding: '10px 14px', borderRadius: '14px 14px 14px 4px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#8B5CF6', animation: `bolaFloat ${0.6 + i * 0.2}s ease-in-out infinite` }}/>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div style={{
            background: 'white',
            borderTop: '0.5px solid rgba(139,92,246,0.15)',
            padding: '10px 12px',
            display: 'flex', gap: '8px', alignItems: 'center',
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviar()}
              placeholder="Preguntale a Luma..."
              style={{
                flex: 1, padding: '8px 12px',
                borderRadius: '50px',
                border: '0.5px solid rgba(139,92,246,0.3)',
                background: '#F4F0FF',
                fontSize: '12.5px', fontFamily: 'inherit',
                color: '#1A1035', outline: 'none',
              }}
            />
            <button onClick={enviar} disabled={!input.trim() || cargando}
              style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: input.trim() && !cargando ? 'linear-gradient(135deg,#8B5CF6,#7C3AED)' : 'rgba(139,92,246,0.2)',
                border: 'none', cursor: input.trim() && !cargando ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s', flexShrink: 0,
              }}>
              <Send size={13} color={input.trim() && !cargando ? 'white' : '#8B5CF6'}/>
            </button>
          </div>
        </div>
      )}

      {/* Modal confirmar cerrar desktop */}
      {confirmarCerrar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '28px 24px', maxWidth: '300px', width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>🔮</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#1A1035', marginBottom: '8px' }}>¿Cerrás el chat?</div>
            <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '20px', lineHeight: 1.6 }}>Esta conversación no tiene historial. Si cerrás, se borra todo.</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setConfirmarCerrar(false)}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '0.5px solid rgba(139,92,246,0.3)', background: 'transparent', color: '#8B5CF6', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>
                Cancelar
              </button>
              <button onClick={confirmarYCerrar}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#8B5CF6,#7C3AED)', color: 'white', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}