'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'

type Terapeuta = {
  user_id: string; nombre_profesional: string; especialidad: string
  bio: string; avatar_url: string; mensaje_bienvenida: string
  tipo_pago: string; pagina_activa: boolean; slug: string
}
type Servicio = { id: string; nombre: string; descripcion: string; duracion_estimada: number; precio_base: number; color: string }
type Disponibilidad = { dia_semana: number; hora_inicio: string; hora_fin: string; activo: boolean }

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function horaAMin(h: string) {
  const [hh, mm] = h.split(':').map(Number)
  return hh * 60 + (mm || 0)
}

export default function PaginaPublica({ params }: { params: { slug: string } }) {
  const [terapeuta, setTerapeuta] = useState<Terapeuta | null>(null)
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad[]>([])
  const [sesionesOcupadas, setSesionesOcupadas] = useState<{fecha: string; hora: string; duracion: number}[]>([])
  const [loading, setLoading] = useState(true)
  const [paso, setPaso] = useState(1)
  const [servicioSel, setServicioSel] = useState<Servicio | null>(null)
  const [fechaSel, setFechaSel] = useState('')
  const [horaSel, setHoraSel] = useState('')
  const [mesBase, setMesBase] = useState(new Date())
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const [form, setForm] = useState({
    nombre: '', whatsapp: '', mensaje: ''
  })

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    try {
      const supabase = createClient()

      const { data: perfil } = await supabase
        .from('therapist_profiles')
        .select('*')
        .eq('nombre_profesional', decodeURIComponent(params.slug).replace(/-/g, ' '))
        .single()

      if (!perfil) {
        setLoading(false)
        return
      }

      setTerapeuta(perfil)

      const [{ data: servs }, { data: disp }, { data: sess }] = await Promise.all([
        supabase.from('services').select('*').eq('user_id', perfil.user_id).eq('activo', true),
        supabase.from('availability').select('*').eq('user_id', perfil.user_id),
        supabase.from('sessions').select('fecha,hora,duracion').eq('user_id', perfil.user_id),
      ])

      if (servs) setServicios(servs)
      if (disp) setDisponibilidad(disp)
      if (sess) setSesionesOcupadas(sess.map(s => ({
        fecha: s.fecha?.split('T')[0] || '',
        hora: s.hora || '',
        duracion: s.duracion || 60,
      })))
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  function diasDelMes() {
    const año = mesBase.getFullYear()
    const mes = mesBase.getMonth()
    const primerDia = new Date(año, mes, 1)
    const ultimoDia = new Date(año, mes + 1, 0)
    const offset = primerDia.getDay()
    const dias: (Date | null)[] = []
    for (let i = 0; i < offset; i++) dias.push(null)
    for (let i = 1; i <= ultimoDia.getDate(); i++) dias.push(new Date(año, mes, i))
    return dias
  }

  function diaDisponible(fecha: Date): boolean {
    if (fecha < new Date(new Date().setHours(0,0,0,0))) return false
    const diaSemana = fecha.getDay()
    const disp = disponibilidad.find(d => d.dia_semana === diaSemana)
    return disp?.activo || false
  }

  function horariosDisponibles(fecha: string): string[] {
    if (!servicioSel) return []
    const diaSemana = new Date(fecha + 'T12:00:00').getDay()
    const disp = disponibilidad.find(d => d.dia_semana === diaSemana)
    if (!disp || !disp.activo) return []

    const inicio = horaAMin(disp.hora_inicio)
    const fin = horaAMin(disp.hora_fin)
    const duracion = servicioSel.duracion_estimada || 60
    const horarios: string[] = []

    for (let min = inicio; min + duracion <= fin; min += 30) {
      const h = Math.floor(min / 60)
      const m = min % 60
      const horaStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`

      const hayConflicto = sesionesOcupadas.some(s => {
        if (s.fecha !== fecha) return false
        const sIni = horaAMin(s.hora)
        const sFin = sIni + s.duracion
        return min < sFin && min + duracion > sIni
      })

      if (!hayConflicto) horarios.push(horaStr)
    }
    return horarios
  }

  async function confirmarReserva() {
    if (!terapeuta || !servicioSel || !fechaSel || !horaSel || !form.nombre || !form.whatsapp) return
    setEnviando(true)
    try {
      const supabase = createClient()

      let pacienteId = null
      const { data: pacExistente } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', terapeuta.user_id)
        .eq('celular', form.whatsapp)
        .maybeSingle()

      if (pacExistente) {
        pacienteId = pacExistente.id
      } else {
        const partes = form.nombre.trim().split(' ')
        const { data: nuevoPac } = await supabase.from('patients').insert({
          user_id: terapeuta.user_id,
          nombre: partes[0],
          apellido: partes.slice(1).join(' '),
          celular: form.whatsapp,
          alias: form.whatsapp.slice(-4),
          contexto_general: '',
        }).select().single()
        if (nuevoPac) pacienteId = nuevoPac.id
      }

      const { data: sesion } = await supabase.from('sessions').insert({
        user_id: terapeuta.user_id,
        patient_id: pacienteId,
        service_id: servicioSel.id,
        fecha: fechaSel + 'T' + horaSel + ':00',
        hora: horaSel,
        duracion: servicioSel.duracion_estimada,
        servicio_nombre: servicioSel.nombre,
        precio: servicioSel.precio_base,
        estado_pago: 'pendiente',
        estado: 'programada',
        realizado: false,
        contexto_sesion: form.mensaje,
      }).select().single()

      if (sesion) {
        await supabase.from('public_bookings').insert({
          therapist_id: terapeuta.user_id,
          patient_name: form.nombre,
          patient_whatsapp: form.whatsapp,
          patient_message: form.mensaje,
          service_id: servicioSel.id,
          service_name: servicioSel.nombre,
          fecha: fechaSel,
          hora: horaSel,
          duracion: servicioSel.duracion_estimada,
          precio: servicioSel.precio_base,
          tipo_pago: 'pendiente',
          estado: 'confirmada',
          session_id: sesion.id,
        })
        setEnviado(true)
      }
    } catch (err) {
      console.error('Error confirmando:', err)
    } finally {
      setEnviando(false)
    }
  }

  const iniciales = terapeuta?.nombre_profesional?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || '?'

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#F0EEFF',fontSize:'13px',color:'#9B8EC4'}}>
      Cargando...
    </div>
  )

  if (!terapeuta) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#F0EEFF',flexDirection:'column',gap:'12px'}}>
      <div style={{fontSize:'32px'}}>🔮</div>
      <div style={{fontSize:'16px',fontWeight:'700',color:'#1A1035'}}>Página no encontrada</div>
      <div style={{fontSize:'13px',color:'#A99CC4'}}>Esta terapeuta no existe o su página no está activa</div>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Inter',sans-serif;background:#F0EEFF;min-height:100vh}

        .pp-wrap{max-width:560px;margin:0 auto;padding:24px 16px 48px}

        .pp-header{text-align:center;margin-bottom:32px;padding-top:16px}
        .pp-avatar{width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#8B5CF6,#A78BFA);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;color:white;margin:0 auto 14px;box-shadow:0 8px 24px rgba(139,92,246,0.3)}
        .pp-avatar img{width:80px;height:80px;border-radius:50%;object-fit:cover}
        .pp-nombre{font-family:'Manrope',sans-serif;font-size:24px;font-weight:800;color:#1A1035;letter-spacing:-0.5px;margin-bottom:4px}
        .pp-esp{font-size:13px;color:#7C6BAA;margin-bottom:10px}
        .pp-bio{font-size:13px;color:#6B5B8A;line-height:1.7;max-width:400px;margin:0 auto}
        .pp-bienvenida{background:linear-gradient(135deg,#EDE8FF,#F5E8FF);border-radius:14px;padding:14px 18px;margin-bottom:28px;font-size:13px;color:#4C1D95;line-height:1.6;text-align:center;border:0.5px solid #DDD5F5}

        .pp-step{background:white;border-radius:22px;padding:22px;box-shadow:0 4px 20px rgba(139,92,246,0.08);border:0.5px solid #EDE9FF;margin-bottom:16px}
        .pp-step-title{font-family:'Manrope',sans-serif;font-size:15px;font-weight:800;color:#1A1035;margin-bottom:16px;display:flex;align-items:center;gap:8px}
        .pp-step-num{width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:white;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .pp-step-num.done{background:linear-gradient(135deg,#10B981,#34D399)}

        .serv-grid{display:flex;flex-direction:column;gap:10px}
        .serv-card{border-radius:14px;padding:14px 16px;cursor:pointer;border:2px solid transparent;transition:all 0.15s;display:flex;justify-content:space-between;align-items:center}
        .serv-card.sel{border-color:#8B5CF6;box-shadow:0 0 0 4px rgba(139,92,246,0.1)}
        .serv-card:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(139,92,246,0.12)}
        .serv-nombre{font-family:'Manrope',sans-serif;font-size:14px;font-weight:700;color:#1A1035;margin-bottom:3px}
        .serv-info{font-size:12px;color:#7C6BAA}
        .serv-precio{font-family:'Manrope',sans-serif;font-size:18px;font-weight:800;color:#1A1035;text-align:right}
        .serv-dur{font-size:10px;color:#A99CC4;text-align:right}

        .cal-nav{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
        .cal-mes{font-family:'Manrope',sans-serif;font-size:14px;font-weight:700;color:#1A1035}
        .cal-btn{width:28px;height:28px;border-radius:7px;border:0.5px solid #E2D9FF;background:white;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#7C6BAA}
        .cal-btn:hover{border-color:#8B5CF6;color:#7C3AED}
        .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:14px}
        .cal-dia-hdr{text-align:center;font-size:10px;font-weight:700;color:#A99CC4;text-transform:uppercase;padding:4px 0}
        .cal-dia{height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.15s;color:#6B5B8A}
        .cal-dia.disponible:hover{background:#EDE8FF;color:#7C3AED}
        .cal-dia.sel{background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:white;box-shadow:0 4px 12px rgba(139,92,246,0.3)}
        .cal-dia.pasado{color:#D1C4E9;cursor:not-allowed}
        .cal-dia.nodisponible{color:#D1C4E9;cursor:not-allowed;background:#F8F6FF}
        .cal-dia.vacio{cursor:default}

        .horas-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
        .hora-btn{padding:9px;border-radius:10px;border:0.5px solid #E2D9FF;background:#FAFAFF;font-size:12px;font-weight:600;color:#6B5B8A;cursor:pointer;text-align:center;transition:all 0.15s;font-family:inherit}
        .hora-btn:hover{border-color:#8B5CF6;color:#7C3AED;background:#F0EBFF}
        .hora-btn.sel{background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:white;border-color:#8B5CF6;box-shadow:0 4px 12px rgba(139,92,246,0.3)}

        .field{display:flex;flex-direction:column;gap:5px;margin-bottom:14px}
        .field label{font-size:12px;font-weight:600;color:#1A1035}
        .field input,.field textarea{padding:11px 13px;border-radius:11px;border:0.5px solid #E2D9FF;font-size:14px;font-family:inherit;color:#1A1035;background:#FAFAFF;outline:none;width:100%}
        .field input:focus,.field textarea:focus{border-color:#8B5CF6;box-shadow:0 0 0 3px rgba(139,92,246,0.08)}
        .field textarea{min-height:80px;resize:none}
        .field-hint{font-size:11px;color:#A99CC4;margin-top:3px}

        .resumen{background:#F8F6FF;border-radius:14px;padding:14px 16px;margin-bottom:16px;border:0.5px solid #EDE9FF}
        .resumen-row{display:flex;justify-content:space-between;align-items:center;font-size:13px;margin-bottom:6px}
        .resumen-row:last-child{margin-bottom:0;font-weight:700;font-size:14px;padding-top:8px;border-top:0.5px solid #EDE9FF}
        .resumen-lbl{color:#7C6BAA}
        .resumen-val{color:#1A1035;font-weight:600}

        .confirm-btn{width:100%;padding:14px;background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:white;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 6px 20px rgba(139,92,246,0.35);transition:all 0.2s}
        .confirm-btn:hover{box-shadow:0 10px 28px rgba(139,92,246,0.45);transform:translateY(-1px)}
        .confirm-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none}

        .exito-wrap{text-align:center;padding:40px 20px}
        .exito-icon{width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#10B981,#34D399);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;box-shadow:0 8px 24px rgba(16,185,129,0.3)}
        .exito-title{font-family:'Manrope',sans-serif;font-size:22px;font-weight:800;color:#1A1035;margin-bottom:8px}
        .exito-sub{font-size:14px;color:#7C6BAA;line-height:1.7;margin-bottom:24px}
        .wsp-btn{display:inline-flex;align-items:center;gap:8px;padding:13px 24px;background:#25D366;color:white;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 4px 14px rgba(37,211,102,0.3);text-decoration:none}

        .pasos{display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:28px}
        .paso-dot{width:8px;height:8px;border-radius:50%;background:#E2D9FF;transition:all 0.2s}
        .paso-dot.act{width:24px;border-radius:4px;background:#8B5CF6}
        .paso-dot.done{background:#10B981}

        .pp-footer{text-align:center;margin-top:32px;font-size:11px;color:#C4B8E8}
        .pp-footer span{color:#A99CC4;font-weight:600}
      `}</style>

      <div className="pp-wrap">

        {/* HEADER */}
        <div className="pp-header">
          <div className="pp-avatar">
            {terapeuta.avatar_url
              ? <img src={terapeuta.avatar_url} alt={terapeuta.nombre_profesional}/>
              : iniciales}
          </div>
          <div className="pp-nombre">{terapeuta.nombre_profesional}</div>
          {terapeuta.especialidad && <div className="pp-esp">{terapeuta.especialidad}</div>}
          {terapeuta.bio && <div className="pp-bio">{terapeuta.bio}</div>}
        </div>

        {terapeuta.mensaje_bienvenida && (
          <div className="pp-bienvenida">✨ {terapeuta.mensaje_bienvenida}</div>
        )}

        {/* INDICADOR DE PASOS */}
        {!enviado && (
          <div className="pasos">
            {[1,2,3,4].map(p => (
              <div key={p} className={`paso-dot${paso === p ? ' act' : paso > p ? ' done' : ''}`}/>
            ))}
          </div>
        )}

        {/* ENVIADO */}
        {enviado && (
          <div className="pp-step">
            <div className="exito-wrap">
              <div className="exito-icon"><Check size={32} color="white"/></div>
              <div className="exito-title">¡Reserva confirmada!</div>
              <div className="exito-sub">
                Tu sesión de <strong>{servicioSel?.nombre}</strong> quedó agendada para el <strong>{new Date(fechaSel+'T12:00:00').toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'})}</strong> a las <strong>{horaSel} hs</strong>.
                <br/><br/>
                {terapeuta.nombre_profesional} se va a contactar con vos pronto.
              </div>
              <a className="wsp-btn"
                href={`https://wa.me/${terapeuta.nombre_profesional}`}
                target="_blank" rel="noopener noreferrer">
                💬 Escribir por WhatsApp
              </a>
            </div>
          </div>
        )}

        {/* PASO 1 — SERVICIO */}
        {!enviado && paso >= 1 && (
          <div className="pp-step">
            <div className="pp-step-title">
              <div className={`pp-step-num${paso > 1 ? ' done' : ''}`}>{paso > 1 ? '✓' : '1'}</div>
              Elegí un servicio
            </div>
            <div className="serv-grid">
              {servicios.map(s => (
                <div key={s.id}
                  className={`serv-card${servicioSel?.id === s.id ? ' sel' : ''}`}
                  style={{background: s.color ? s.color + '15' : '#F8F6FF'}}
                  onClick={() => { setServicioSel(s); if (paso === 1) setPaso(2) }}>
                  <div>
                    <div className="serv-nombre">{s.nombre}</div>
                    <div className="serv-info">{s.descripcion || ''}</div>
                  </div>
                  <div>
                    <div className="serv-precio">${s.precio_base.toLocaleString()}</div>
                    <div className="serv-dur">{s.duracion_estimada} min</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PASO 2 — FECHA Y HORA */}
        {!enviado && paso >= 2 && servicioSel && (
          <div className="pp-step">
            <div className="pp-step-title">
              <div className={`pp-step-num${paso > 2 ? ' done' : ''}`}>{paso > 2 ? '✓' : '2'}</div>
              Elegí fecha y hora
            </div>
            <div className="cal-nav">
              <button className="cal-btn" onClick={() => { const d = new Date(mesBase); d.setMonth(d.getMonth()-1); setMesBase(d) }}><ChevronLeft size={12}/></button>
              <div className="cal-mes">{MESES[mesBase.getMonth()]} {mesBase.getFullYear()}</div>
              <button className="cal-btn" onClick={() => { const d = new Date(mesBase); d.setMonth(d.getMonth()+1); setMesBase(d) }}><ChevronRight size={12}/></button>
            </div>
            <div className="cal-grid">
              {DIAS.map(d => <div key={d} className="cal-dia-hdr">{d}</div>)}
              {diasDelMes().map((dia, i) => {
                if (!dia) return <div key={`v${i}`} className="cal-dia vacio"/>
                const f = formatDate(dia)
                const esSel = f === fechaSel
                const disponible = diaDisponible(dia)
                const pasado = dia < new Date(new Date().setHours(0,0,0,0))
                return (
                  <div key={i}
                    className={`cal-dia${esSel ? ' sel' : disponible && !pasado ? ' disponible' : pasado ? ' pasado' : ' nodisponible'}`}
                    onClick={() => {
                      if (!disponible || pasado) return
                      setFechaSel(f)
                      setHoraSel('')
                    }}>
                    {dia.getDate()}
                  </div>
                )
              })}
            </div>

            {fechaSel && (
              <>
                <div style={{fontSize:'12px',fontWeight:'700',color:'#A99CC4',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'10px'}}>
                  Horarios disponibles
                </div>
                {horariosDisponibles(fechaSel).length === 0 ? (
                  <div style={{fontSize:'13px',color:'#A99CC4',textAlign:'center',padding:'16px 0'}}>No hay horarios disponibles para este día</div>
                ) : (
                  <div className="horas-grid">
                    {horariosDisponibles(fechaSel).map(h => (
                      <button key={h} className={`hora-btn${horaSel === h ? ' sel' : ''}`}
                        onClick={() => { setHoraSel(h); setPaso(3) }}>
                        {h} hs
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* PASO 3 — DATOS */}
        {!enviado && paso >= 3 && fechaSel && horaSel && (
          <div className="pp-step">
            <div className="pp-step-title">
              <div className={`pp-step-num${paso > 3 ? ' done' : ''}`}>{paso > 3 ? '✓' : '3'}</div>
              Tus datos
            </div>
            <div className="field">
              <label>Nombre completo</label>
              <input placeholder="Ej: María López" value={form.nombre}
                onChange={e => setForm({...form, nombre: e.target.value})}/>
            </div>
            <div className="field">
              <label>WhatsApp</label>
              <input placeholder="Ej: 2236789012" value={form.whatsapp}
                onChange={e => setForm({...form, whatsapp: e.target.value})}/>
              <div className="field-hint">Te contactaremos por este número</div>
            </div>
            <div className="field">
              <label>¿Qué querés trabajar en esta sesión? (opcional)</label>
              <textarea placeholder="Contanos un poco sobre lo que querés consultar..."
                value={form.mensaje}
                onChange={e => setForm({...form, mensaje: e.target.value})}/>
            </div>
            {form.nombre && form.whatsapp && (
              <button className="confirm-btn" style={{background:'#F0EBFF',color:'#7C3AED',boxShadow:'none'}}
                onClick={() => setPaso(4)}>
                Continuar →
              </button>
            )}
          </div>
        )}

        {/* PASO 4 — CONFIRMACIÓN */}
        {!enviado && paso >= 4 && form.nombre && form.whatsapp && (
          <div className="pp-step">
            <div className="pp-step-title">
              <div className="pp-step-num">4</div>
              Confirmá tu reserva
            </div>
            <div className="resumen">
              <div className="resumen-row">
                <span className="resumen-lbl">Servicio</span>
                <span className="resumen-val">{servicioSel?.nombre}</span>
              </div>
              <div className="resumen-row">
                <span className="resumen-lbl">Fecha</span>
                <span className="resumen-val">{new Date(fechaSel+'T12:00:00').toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'})}</span>
              </div>
              <div className="resumen-row">
                <span className="resumen-lbl">Hora</span>
                <span className="resumen-val">{horaSel} hs · {servicioSel?.duracion_estimada} min</span>
              </div>
              <div className="resumen-row">
                <span className="resumen-lbl">Tu nombre</span>
                <span className="resumen-val">{form.nombre}</span>
              </div>
              <div className="resumen-row">
                <span className="resumen-lbl">Total</span>
                <span className="resumen-val" style={{color:'#7C3AED'}}>${servicioSel?.precio_base.toLocaleString()}</span>
              </div>
            </div>
            <button className="confirm-btn" onClick={confirmarReserva} disabled={enviando}>
              {enviando ? 'Confirmando...' : '✓ Confirmar reserva'}
            </button>
          </div>
        )}

        <div className="pp-footer">Powered by <span>Luma</span></div>
      </div>
    </>
  )
}