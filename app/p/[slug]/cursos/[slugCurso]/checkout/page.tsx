'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { Check, Shield } from 'lucide-react'

type Terapeuta = {
  user_id: string; nombre_profesional: string; template?: string
  whatsapp?: string; mp_activo?: boolean; acepta_transferencia?: boolean
  alias_pago?: string; cbu?: string; titular_cuenta?: string; banco?: string
  instrucciones_pago?: string
}

type Curso = {
  id: string; titulo: string; slug: string; imagen_url: string
  precio: number; modalidad: string; user_id: string
}

const TEMPLATES = {
  luna: { bg: '#0D0B14', bg2: '#12101C', primary: '#C9A84C', primaryLight: '#E8D5A3', primaryDim: 'rgba(201,168,76,0.3)', accent: '#6B3FA0', accentDim: 'rgba(107,63,160,0.2)', text: '#D4C5A9', textDim: '#7A6B8A', cream: '#F0E8D5', border: 'rgba(201,168,76,0.2)', fontBody: "'Jost', sans-serif", googleFonts: 'Jost:wght@300;400;500;600', dark: true, cardBg: 'rgba(26,22,40,0.6)', btnBg: 'linear-gradient(135deg,#6B3FA0,#8B5CF6)', btnColor: '#E8D5A3' },
  aura: { bg: '#F8F4FF', bg2: '#F0EBFF', primary: '#7C3AED', primaryLight: '#A78BFA', primaryDim: 'rgba(124,58,237,0.2)', accent: '#EC4899', accentDim: 'rgba(236,72,153,0.15)', text: '#4B5563', textDim: '#9CA3AF', cream: '#1F2937', border: 'rgba(124,58,237,0.15)', fontBody: "'DM Sans', sans-serif", googleFonts: 'DM+Sans:wght@300;400;500;600', dark: false, cardBg: 'rgba(255,255,255,0.85)', btnBg: 'linear-gradient(135deg,#7C3AED,#EC4899)', btnColor: 'white' },
  tierra: { bg: '#FAF7F0', bg2: '#F5F0E8', primary: '#92400E', primaryLight: '#D97706', primaryDim: 'rgba(146,64,14,0.2)', accent: '#065F46', accentDim: 'rgba(6,95,70,0.15)', text: '#44403C', textDim: '#A8A29E', cream: '#1C1917', border: 'rgba(146,64,14,0.15)', fontBody: "'Nunito', sans-serif", googleFonts: 'Nunito:wght@300;400;500;600', dark: false, cardBg: 'rgba(255,255,255,0.8)', btnBg: 'linear-gradient(135deg,#92400E,#D97706)', btnColor: 'white' },
  rosa: { bg: '#FFF0F6', bg2: '#FFE4F0', primary: '#BE185D', primaryLight: '#F472B6', primaryDim: 'rgba(190,24,93,0.2)', accent: '#9D174D', accentDim: 'rgba(157,23,77,0.15)', text: '#4A1942', textDim: '#9D7A95', cream: '#2D0A25', border: 'rgba(190,24,93,0.15)', fontBody: "'DM Sans', sans-serif", googleFonts: 'DM+Sans:wght@300;400;500;600', dark: false, cardBg: 'rgba(255,255,255,0.9)', btnBg: 'linear-gradient(135deg,#BE185D,#EC4899)', btnColor: 'white' },
  violeta: { bg: '#1E0A3C', bg2: '#2D1058', primary: '#C084FC', primaryLight: '#E9D5FF', primaryDim: 'rgba(192,132,252,0.3)', accent: '#A855F7', accentDim: 'rgba(168,85,247,0.2)', text: '#DDD6FE', textDim: '#8B5CF6', cream: '#FAF5FF', border: 'rgba(192,132,252,0.25)', fontBody: "'Jost', sans-serif", googleFonts: 'Jost:wght@300;400;500;600', dark: true, cardBg: 'rgba(61,21,112,0.5)', btnBg: 'linear-gradient(135deg,#7C3AED,#C084FC)', btnColor: 'white' },
  verde: { bg: '#F0FDF4', bg2: '#DCFCE7', primary: '#065F46', primaryLight: '#10B981', primaryDim: 'rgba(6,95,70,0.2)', accent: '#047857', accentDim: 'rgba(4,120,87,0.15)', text: '#1C4532', textDim: '#6B7280', cream: '#022C22', border: 'rgba(6,95,70,0.15)', fontBody: "'Nunito', sans-serif", googleFonts: 'Nunito:wght@300;400;500;600', dark: false, cardBg: 'rgba(255,255,255,0.85)', btnBg: 'linear-gradient(135deg,#065F46,#10B981)', btnColor: 'white' },
}

export default function CheckoutCursoPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const slugCurso = params.slugCurso as string

  const [terapeuta, setTerapeuta] = useState<Terapeuta | null>(null)
  const [curso, setCurso] = useState<Curso | null>(null)
  const [loading, setLoading] = useState(true)

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [metodoPago, setMetodoPago] = useState<'mp' | 'transferencia' | null>(null)

  const [enviandoTransferencia, setEnviandoTransferencia] = useState(false)
  const [preparandoMP, setPreparandoMP] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [enviado, setEnviado] = useState(false)

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    try {
      const supabase = createClient()
      const { data: perfil } = await supabase
        .from('therapist_profiles').select('*')
        .eq('slug', slug).maybeSingle()
      if (!perfil) { setLoading(false); return }
      setTerapeuta(perfil)

      const { data: cursoData } = await supabase
        .from('courses').select('id,titulo,slug,imagen_url,precio,modalidad,user_id')
        .eq('slug', slugCurso).eq('user_id', perfil.user_id).eq('estado', 'publicado')
        .maybeSingle()
      if (!cursoData) { setLoading(false); return }
      setCurso(cursoData)

      const p = new URLSearchParams(window.location.search)
      if (p.get('status') === 'approved' && p.get('enrollment_id')) {
        await supabase.from('enrollments').update({ estado: 'activa' }).eq('id', p.get('enrollment_id'))
        setEnviado(true)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const t = TEMPLATES[(terapeuta?.template as keyof typeof TEMPLATES) || 'luna']
  const tieneMP = !!terapeuta?.mp_activo
  const tieneTransferencia = !!(terapeuta?.acepta_transferencia && terapeuta?.alias_pago)
  const sinMetodoPago = !tieneMP && !tieneTransferencia
  const formularioListo = !!(nombre.trim() && email.trim() && password.trim().length >= 6)

  async function autenticarAlumna(): Promise<string | null> {
    const supabase = createClient()
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { data: { full_name: nombre } },
    })
    if (!signUpError && signUpData.user) return signUpData.user.id

    if (signUpError && signUpError.message.toLowerCase().includes('already')) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(), password,
      })
      if (signInError) {
        setErrorMsg('Ese email ya tiene una cuenta en Luma y la contraseña no coincide. Si ya compraste algo antes, usá la misma contraseña.')
        return null
      }
      return signInData.user?.id || null
    }

    setErrorMsg(signUpError?.message || 'No se pudo crear la cuenta. Intentá de nuevo.')
    return null
  }

  async function asegurarPersona(userId: string): Promise<string | null> {
    const supabase = createClient()
    const { data: existente } = await supabase
      .from('persons').select('id').eq('auth_user_id', userId).maybeSingle()
    if (existente) return existente.id

    const partes = nombre.trim().split(' ')
    const { data: nueva, error } = await supabase.from('persons').insert({
      email: email.trim(),
      nombre: partes[0],
      apellido: partes.slice(1).join(' ') || '',
      auth_user_id: userId,
    }).select('id').single()
    if (error) { console.error('Error creando persona:', error); return null }
    return nueva?.id || null
  }

  async function crearOActualizarInscripcion(personaId: string, estado: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('enrollments')
      .upsert({
        course_id: curso!.id,
        person_id: personaId,
        terapeuta_id: curso!.user_id,
        modalidad: curso!.modalidad,
        estado,
      }, { onConflict: 'course_id,person_id' })
      .select().single()
    if (error) { console.error('Error creando inscripción:', error); return null }
    return data
  }

  async function handleTransferencia() {
    setErrorMsg('')
    setEnviandoTransferencia(true)
    try {
      const userId = await autenticarAlumna()
      if (!userId) return
      const personaId = await asegurarPersona(userId)
      if (!personaId) { setErrorMsg('Hubo un error al registrar tus datos. Intentá de nuevo.'); return }
      const insc = await crearOActualizarInscripcion(personaId, 'pendiente_pago')
      if (!insc) { setErrorMsg('Hubo un error al confirmar. Intentá de nuevo.'); return }
      setEnviado(true)
    } finally { setEnviandoTransferencia(false) }
  }

  async function handleWhatsappSinPago() {
    setErrorMsg('')
    setEnviandoTransferencia(true)
    try {
      const userId = await autenticarAlumna()
      if (!userId) return
      const personaId = await asegurarPersona(userId)
      if (!personaId) { setErrorMsg('Hubo un error al registrar tus datos. Intentá de nuevo.'); return }
      await crearOActualizarInscripcion(personaId, 'pendiente_pago')
      setEnviado(true)
    } finally { setEnviandoTransferencia(false) }
  }

  async function handleMP() {
    setErrorMsg('')
    setPreparandoMP(true)
    try {
      const userId = await autenticarAlumna()
      if (!userId) return
      const personaId = await asegurarPersona(userId)
      if (!personaId) { setErrorMsg('Hubo un error al registrar tus datos. Intentá de nuevo.'); return }
      const insc = await crearOActualizarInscripcion(personaId, 'pendiente_pago')
      if (!insc) { setErrorMsg('Hubo un error al crear la inscripción. Intentá de nuevo.'); return }

      const origin = window.location.origin
      const res = await fetch('/api/mp/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          servicioNombre: curso!.titulo,
          precio: curso!.precio,
          monto: curso!.precio,
          therapistId: curso!.user_id,
          successUrl: `${origin}/p/${slug}/cursos/${slugCurso}/checkout?status=approved&enrollment_id=${insc.id}`,
          failureUrl: `${origin}/p/${slug}/cursos/${slugCurso}/checkout?status=failure&enrollment_id=${insc.id}`,
        }),
      })
      const data = await res.json()
      if (data.init_point) window.location.href = data.init_point
      else setErrorMsg('No se pudo conectar con Mercado Pago. Intentá de nuevo.')
    } catch (e) {
      console.error(e)
      setErrorMsg('Error al conectar con Mercado Pago.')
    } finally { setPreparandoMP(false) }
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:'14px',color:'#6B7280',fontFamily:'sans-serif'}}>
      Cargando...
    </div>
  )

  if (!curso || !terapeuta) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:'14px',color:'#6B7280',fontFamily:'sans-serif'}}>
      Curso no encontrado
    </div>
  )

  return (
    <div style={{fontFamily:'var(--font-body)',background:'var(--bg)',minHeight:'100vh',color:'var(--text)'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=${t.googleFonts}&display=swap');
        :root{
          --bg:${t.bg};--bg2:${t.bg2};--primary:${t.primary};--primary-light:${t.primaryLight};
          --primary-dim:${t.primaryDim};--accent:${t.accent};--accent-dim:${t.accentDim};
          --text:${t.text};--text-dim:${t.textDim};--cream:${t.cream};--border:${t.border};
          --card-bg:${t.cardBg};--font-body:${t.fontBody};--btn-bg:${t.btnBg};--btn-color:${t.btnColor};
        }
        *{box-sizing:border-box;margin:0;padding:0}
        html,body{background:var(--bg)}
        .wrap{max-width:460px;margin:0 auto;padding:32px 20px 60px}
        .resumen-curso{display:flex;gap:14px;align-items:center;background:var(--card-bg);border:1px solid var(--border);border-radius:16px;padding:14px;margin-bottom:24px}
        .resumen-img{width:56px;height:56px;border-radius:10px;object-fit:cover;flex-shrink:0}
        .resumen-titulo{font-size:14px;font-weight:700;color:var(--cream)}
        .resumen-precio{font-size:18px;font-weight:800;color:var(--primary-light);margin-top:2px}
        .field{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
        .field label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--primary)}
        .field input{padding:12px 14px;border-radius:10px;border:1px solid var(--border);background:var(--card-bg);font-size:15px;color:var(--cream);outline:none;width:100%}
        .field-hint{font-size:11px;color:var(--text-dim)}
        .metodo-opt{display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:12px;border:1px solid var(--border);background:var(--card-bg);cursor:pointer;margin-bottom:10px}
        .metodo-opt.sel{border-color:var(--primary);box-shadow:0 0 0 1px var(--primary)}
        .metodo-radio{width:18px;height:18px;border-radius:50%;border:2px solid var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:center}
        .metodo-opt.sel .metodo-radio{border-color:var(--primary);background:var(--primary)}
        .metodo-radio-inner{width:8px;height:8px;border-radius:50%;background:white}
        .metodo-label{font-size:14px;font-weight:700;color:var(--cream)}
        .metodo-sub{font-size:11px;color:var(--text-dim);margin-top:2px}
        .transferencia-datos{background:var(--card-bg);border:1px solid var(--border);border-radius:14px;padding:16px;margin:14px 0}
        .transferencia-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px}
        .confirmar-btn{width:100%;padding:16px;background:var(--btn-bg);color:var(--btn-color);border:none;border-radius:50px;font-size:14px;font-weight:800;cursor:pointer;box-shadow:0 10px 24px var(--accent-dim);margin-top:8px}
        .confirmar-btn:disabled{opacity:.5;cursor:not-allowed}
        .error-msg{font-size:13px;color:#F87171;padding:10px 14px;background:rgba(248,113,113,0.1);border-radius:10px;border:1px solid rgba(248,113,113,0.3);margin-bottom:12px}
        .exito-wrap{text-align:center;padding:40px 0}
        .exito-circle{width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#10B981,#34D399);display:flex;align-items:center;justify-content:center;margin:0 auto 20px}
        .exito-btn{display:inline-block;margin-top:16px;padding:14px 30px;background:var(--btn-bg);color:var(--btn-color);border-radius:50px;font-size:14px;font-weight:700;text-decoration:none}
      `}</style>

      <div className="wrap">
        {!enviado ? (
          <>
            <div className="resumen-curso">
              {curso.imagen_url && <img src={curso.imagen_url} className="resumen-img"/>}
              <div>
                <div className="resumen-titulo">{curso.titulo}</div>
                <div className="resumen-precio">${curso.precio.toLocaleString()}</div>
              </div>
            </div>

            <div className="field">
              <label>Nombre completo</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: María López"/>
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com"/>
            </div>
            <div className="field">
              <label>Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres"/>
              <div className="field-hint">Con esto vas a poder entrar después a ver tu curso. Si ya compraste algo en Luma antes, usá la misma.</div>
            </div>

            {errorMsg && <div className="error-msg">{errorMsg}</div>}

            {formularioListo && (<>
              {sinMetodoPago ? (
                <button className="confirmar-btn" onClick={handleWhatsappSinPago} disabled={enviandoTransferencia}>
                  {enviandoTransferencia ? 'Un momento...' : '💬 Continuar por WhatsApp'}
                </button>
              ) : (<>
                <div style={{fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',color:'var(--primary)',margin:'8px 0'}}>¿Cómo querés pagar?</div>

                {tieneMP && (
                  <div className={`metodo-opt${metodoPago==='mp'?' sel':''}`} onClick={() => setMetodoPago('mp')}>
                    <div className="metodo-radio">{metodoPago==='mp' && <div className="metodo-radio-inner"/>}</div>
                    <div>
                      <div className="metodo-label">💳 Mercado Pago</div>
                      <div className="metodo-sub">Tarjeta, débito o saldo en cuenta</div>
                    </div>
                  </div>
                )}
                {tieneTransferencia && (
                  <div className={`metodo-opt${metodoPago==='transferencia'?' sel':''}`} onClick={() => setMetodoPago('transferencia')}>
                    <div className="metodo-radio">{metodoPago==='transferencia' && <div className="metodo-radio-inner"/>}</div>
                    <div>
                      <div className="metodo-label">🏦 Transferencia bancaria</div>
                      <div className="metodo-sub">Transferís y enviás el comprobante por WhatsApp</div>
                    </div>
                  </div>
                )}

                {metodoPago === 'transferencia' && (
                  <div className="transferencia-datos">
                    {terapeuta.alias_pago && <div className="transferencia-row"><span>Alias</span><strong>{terapeuta.alias_pago}</strong></div>}
                    {terapeuta.cbu && <div className="transferencia-row"><span>CBU</span><strong>{terapeuta.cbu}</strong></div>}
                    {terapeuta.titular_cuenta && <div className="transferencia-row"><span>Titular</span><strong>{terapeuta.titular_cuenta}</strong></div>}
                    {terapeuta.banco && <div className="transferencia-row"><span>Banco</span><strong>{terapeuta.banco}</strong></div>}
                  </div>
                )}

                {metodoPago === 'mp' && (
                  <button className="confirmar-btn" onClick={handleMP} disabled={preparandoMP}>
                    {preparandoMP ? 'Preparando pago...' : '✦ Pagar con Mercado Pago'}
                  </button>
                )}
                {metodoPago === 'transferencia' && (
                  <button className="confirmar-btn" onClick={handleTransferencia} disabled={enviandoTransferencia}>
                    {enviandoTransferencia ? 'Un momento...' : '✦ Ya hice la transferencia'}
                  </button>
                )}
              </>)}
            </>)}
          </>
        ) : (
          <div className="exito-wrap">
            <div className="exito-circle"><Check size={32} color="white"/></div>
            <h2 style={{fontSize:'24px',fontWeight:800,color:'var(--cream)',marginBottom:'10px'}}>
              {metodoPago === 'transferencia' || sinMetodoPago ? '¡Ya casi!' : '¡Listo!'}
            </h2>
            <p style={{fontSize:'14px',color:'var(--text-dim)',lineHeight:1.6}}>
              {metodoPago === 'transferencia'
                ? <>Registramos tu inscripción a <strong>{curso.titulo}</strong>. En cuanto {terapeuta.nombre_profesional} confirme tu transferencia, tenés acceso.</>
                : sinMetodoPago
                  ? <>Registramos tu inscripción a <strong>{curso.titulo}</strong>. Coordiná el pago por WhatsApp para que te den acceso.</>
                  : <>Tu pago de <strong>{curso.titulo}</strong> se acreditó. Ya podés entrar a ver el curso.</>}
            </p>
            {(metodoPago === 'transferencia' && terapeuta.whatsapp) && (
              <a className="exito-btn" style={{background:'#25D366',display:'block',marginBottom:'10px'}}
                href={`https://wa.me/${terapeuta.whatsapp.replace(/\D/g,'').replace(/^0+/,'')}?text=${encodeURIComponent(`Hola! Te envío el comprobante de mi inscripción a ${curso.titulo}.`)}`}
                target="_blank" rel="noopener noreferrer">
                📎 Enviar comprobante por WhatsApp
              </a>
            )}
            {sinMetodoPago && terapeuta.whatsapp && (
              <a className="exito-btn" style={{background:'#25D366',display:'block',marginBottom:'10px'}}
                href={`https://wa.me/${terapeuta.whatsapp.replace(/\D/g,'').replace(/^0+/,'')}?text=${encodeURIComponent(`Hola! Quiero inscribirme al curso ${curso.titulo}, ¿cómo pago?`)}`}
                target="_blank" rel="noopener noreferrer">
                💬 Coordinar pago por WhatsApp
              </a>
            )}
            <a className="exito-btn" href="/mi-cuenta/cursos">Ir a mi cuenta</a>
          </div>
        )}
      </div>
    </div>
  )
}