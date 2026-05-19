'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { ChevronLeft, ChevronRight, Check, Star, Clock, Send, Shield, ChevronDown } from 'lucide-react'

type Terapeuta = {
  user_id: string; nombre_profesional: string; especialidad: string
  bio: string; avatar_url: string; mensaje_bienvenida: string
  tipo_pago: string; pagina_activa: boolean
}
type Servicio = { id: string; nombre: string; descripcion: string; duracion_estimada: number; precio_base: number; color: string; tipo_servicio?: string; plazo_horas?: number }
type Disponibilidad = {
  dia_semana: number; hora_inicio: string; hora_fin: string; activo: boolean
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS_CORTO = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function horaAMin(h: string) {
  const [hh, mm] = h.split(':').map(Number)
  return hh * 60 + (mm || 0)
}

const TESTIMONIOS = [
  { texto: 'La sesión fue increíble. Llegué confundida y me fui con total claridad. La recomiendo de todo corazón.', nombre: 'Camila R.' },
  { texto: 'Su energía y presencia me hicieron sentir contenida desde el primer momento. Una experiencia transformadora.', nombre: 'Florencia M.' },
  { texto: 'Las lecturas escritas son increíbles, siempre súper detalladas y amorosas. Me acompañan mucho.', nombre: 'Julieta A.' },
]

export default function PaginaPublica({ params }: { params: Promise<{ slug: string }> }) {
  const [terapeuta, setTerapeuta] = useState<Terapeuta | null>(null)
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad[]>([])
  const [sesionesOcupadas, setSesionesOcupadas] = useState<{fecha:string;hora:string;duracion:number}[]>([])
  const [loading, setLoading] = useState(true)
  const [paso, setPaso] = useState(0)
  const [servicioSel, setServicioSel] = useState<Servicio | null>(null)
  const [fechaSel, setFechaSel] = useState('')
  const [horaSel, setHoraSel] = useState('')
  const [diasSel, setDiasSel] = useState<Date[]>([])
  const [diaActivoIdx, setDiaActivoIdx] = useState(0)
  const [mesBase, setMesBase] = useState(new Date())
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [testiIdx, setTestiIdx] = useState(0)
  const [mostrarCalFull, setMostrarCalFull] = useState(false)
  const reservaRef = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState({ nombre: '', whatsapp: '', mensaje: '' })

  useEffect(() => { cargarDatos() }, [])

  useEffect(() => {
    const proximos: Date[] = []
    const hoy = new Date()
    let d = new Date(hoy)
    let count = 0
    while (proximos.length < 7 && count < 30) {
      const disp = disponibilidad.find(x => x.dia_semana === d.getDay())
      if (disp?.activo) proximos.push(new Date(d))
      d.setDate(d.getDate() + 1)
      count++
    }
    setDiasSel(proximos)
  }, [disponibilidad])

  async function cargarDatos() {
    try {
      const supabase = createClient()
      const { slug } = await Promise.resolve(params)
const slugDecoded = decodeURIComponent(slug).replace(/-/g, ' ')
      const { data: perfil } = await supabase
        .from('therapist_profiles').select('*')
        .ilike('nombre_profesional', slugDecoded).single()

      if (!perfil) { setLoading(false); return }
      setTerapeuta(perfil)

      const [{ data: servs }, { data: disp }, { data: sess }] = await Promise.all([
        supabase.from('services').select('*').eq('user_id', perfil.user_id).eq('activo', true),
        supabase.from('availability').select('*').eq('user_id', perfil.user_id),
        supabase.from('sessions').select('fecha,hora,duracion').eq('user_id', perfil.user_id),
      ])

      if (servs) setServicios(servs)
      if (disp) setDisponibilidad(disp)
      if (sess) setSesionesOcupadas(sess.map(s => ({ fecha: s.fecha?.split('T')[0]||'', hora: s.hora||'', duracion: s.duracion||60 })))
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }

  function horariosDisponibles(fecha: string): string[] {
    if (!servicioSel) return []
    const diaSemana = new Date(fecha + 'T12:00:00').getDay()
    const disp = disponibilidad.find(d => d.dia_semana === diaSemana)
    if (!disp?.activo) return []
    const inicio = horaAMin(disp.hora_inicio)
    const fin = horaAMin(disp.hora_fin)
    const dur = servicioSel.duracion_estimada || 60
    const horarios: string[] = []
    for (let min = inicio; min + dur <= fin; min += 30) {
      const h = Math.floor(min/60), m = min%60
      const horaStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
      const conflicto = sesionesOcupadas.some(s => {
        if (s.fecha !== fecha) return false
        const sI = horaAMin(s.hora), sF = sI + s.duracion
        return min < sF && min + dur > sI
      })
      if (!conflicto) horarios.push(horaStr)
    }
    return horarios
  }

  function diasDelMes() {
    const año = mesBase.getFullYear(), mes = mesBase.getMonth()
    const primerDia = new Date(año, mes, 1)
    const ultimoDia = new Date(año, mes+1, 0)
    const offset = primerDia.getDay()
    const dias: (Date|null)[] = []
    for (let i = 0; i < offset; i++) dias.push(null)
    for (let i = 1; i <= ultimoDia.getDate(); i++) dias.push(new Date(año, mes, i))
    return dias
  }

  function diaDisponible(fecha: Date) {
    if (fecha < new Date(new Date().setHours(0,0,0,0))) return false
    const disp = disponibilidad.find(d => d.dia_semana === fecha.getDay())
    return disp?.activo || false
  }

  async function confirmarReserva() {
    if (!terapeuta || !servicioSel || !fechaSel || !horaSel || !form.nombre || !form.whatsapp) return
    setEnviando(true)
    try {
      const supabase = createClient()
      let pacienteId = null
      const { data: pacEx } = await supabase.from('patients').select('id')
        .eq('user_id', terapeuta.user_id).eq('celular', form.whatsapp).maybeSingle()
      if (pacEx) {
        pacienteId = pacEx.id
      } else {
        const partes = form.nombre.trim().split(' ')
        const { data: np } = await supabase.from('patients').insert({
          user_id: terapeuta.user_id, nombre: partes[0],
          apellido: partes.slice(1).join(' '), celular: form.whatsapp,
          alias: form.whatsapp.slice(-4), contexto_general: '',
        }).select().single()
        if (np) pacienteId = np.id
      }
      const { data: sesion } = await supabase.from('sessions').insert({
        user_id: terapeuta.user_id, patient_id: pacienteId,
        service_id: servicioSel.id,
        fecha: fechaSel + 'T' + horaSel + ':00', hora: horaSel,
        duracion: servicioSel.duracion_estimada,
        servicio_nombre: servicioSel.nombre, precio: servicioSel.precio_base,
        estado_pago: 'pendiente', realizado: false, contexto_sesion: form.mensaje,
      }).select().single()
      if (sesion) {
        await supabase.from('public_bookings').insert({
          therapist_id: terapeuta.user_id, patient_name: form.nombre,
          patient_whatsapp: form.whatsapp, patient_message: form.mensaje,
          service_id: servicioSel.id, service_name: servicioSel.nombre,
          fecha: fechaSel, hora: horaSel, duracion: servicioSel.duracion_estimada,
          precio: servicioSel.precio_base, estado: 'confirmada', session_id: sesion.id,
        })
        setEnviado(true)
      }
    } catch(e) { console.error(e) } finally { setEnviando(false) }
  }

  const iniciales = terapeuta?.nombre_profesional?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() || '?'
  const fotoUrl = terapeuta?.avatar_url || '/IMG-20260311-WA0023.jpg'

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0D0B14',color:'#C9A84C',fontFamily:'serif',fontSize:'14px',letterSpacing:'2px'}}>
      ✦ cargando ✦
    </div>
  )

  if (!terapeuta) return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#0D0B14',gap:'16px'}}>
      <div style={{fontSize:'48px'}}>🌙</div>
      <div style={{fontSize:'18px',fontWeight:'700',color:'#E8D5A3',fontFamily:'serif'}}>Página no encontrada</div>
      <div style={{fontSize:'13px',color:'#6B5B7A'}}>Esta página no existe o no está activa</div>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500&family=Jost:wght@300;400;500;600&display=swap');

        :root {
          --bg: #0D0B14;
          --bg2: #12101C;
          --bg3: #1A1628;
          --gold: #C9A84C;
          --gold-light: #E8D5A3;
          --gold-dim: rgba(201,168,76,0.3);
          --violet: #6B3FA0;
          --violet-light: #9B6DD0;
          --violet-dim: rgba(107,63,160,0.2);
          --cream: #F0E8D5;
          --text: #D4C5A9;
          --text-dim: #7A6B8A;
          --border: rgba(201,168,76,0.2);
        }

        * { box-sizing:border-box; margin:0; padding:0 }

        body {
          background: var(--bg);
          color: var(--text);
          font-family: 'Jost', sans-serif;
          overflow-x: hidden;
        }

        /* STARS BG */
        .stars-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }
        .star {
          position: absolute;
          width: 2px; height: 2px;
          background: var(--gold-light);
          border-radius: 50%;
          opacity: 0;
          animation: twinkle var(--dur, 3s) var(--delay, 0s) infinite;
        }
        @keyframes twinkle {
          0%,100%{opacity:0} 50%{opacity:var(--op,0.6)}
        }

        /* NAVBAR */
        .nav {
          position: fixed; top:0; left:0; right:0; z-index:100;
          padding: 16px 24px;
          display: flex; justify-content:space-between; align-items:center;
          background: linear-gradient(to bottom, rgba(13,11,20,0.95), transparent);
          backdrop-filter: blur(8px);
        }
        .nav-logo {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px; font-weight: 600;
          color: var(--gold);
          letter-spacing: 3px;
          display: flex; align-items:center; gap:8px;
        }
        .nav-logo::before { content:'✦'; font-size:12px; }
        .nav-cta {
          padding: 8px 20px;
          background: linear-gradient(135deg, var(--violet), var(--violet-light));
          color: var(--gold-light);
          border: 0.5px solid var(--gold-dim);
          border-radius: 50px;
          font-size: 12px; font-weight: 500;
          cursor: pointer; font-family: 'Jost', sans-serif;
          letter-spacing: 1px; text-transform: uppercase;
          transition: all 0.3s;
        }
        .nav-cta:hover { box-shadow: 0 0 20px rgba(107,63,160,0.5); }

        /* HERO */
        .hero {
          position: relative; min-height: 100vh;
          display: flex; flex-direction:column;
          align-items: center; justify-content:center;
          padding: 80px 20px 60px;
          text-align: center; z-index: 1;
        }

        /* CARTA TAROT */
        .carta-wrap {
          position: relative;
          margin-bottom: 32px;
          animation: float 6s ease-in-out infinite;
        }
        @keyframes float {
          0%,100%{transform:translateY(0px)} 50%{transform:translateY(-12px)}
        }
        .carta {
          width: 220px; height: 340px;
          border-radius: 16px;
          border: 1.5px solid var(--gold);
          position: relative; overflow: hidden;
          box-shadow:
            0 0 40px rgba(201,168,76,0.25),
            0 0 80px rgba(107,63,160,0.2),
            inset 0 0 30px rgba(201,168,76,0.05);
        }
        .carta-foto {
          width: 100%; height: 100%;
          object-fit: cover; object-position: center top;
          display: block;
        }
        .carta-overlay {
          position: absolute; inset:0;
          background: linear-gradient(
            to bottom,
            rgba(13,11,20,0.3) 0%,
            transparent 30%,
            transparent 60%,
            rgba(13,11,20,0.7) 100%
          );
        }
        .carta-frame {
          position: absolute; inset: 8px;
          border: 0.5px solid rgba(201,168,76,0.4);
          border-radius: 10px; pointer-events:none;
        }
        .carta-roman {
          position: absolute; top:12px; left:0; right:0;
          text-align:center;
          font-family: 'Cormorant Garamond', serif;
          font-size: 11px; font-weight:500;
          color: var(--gold); letter-spacing:4px;
        }
        .carta-name {
          position: absolute; bottom:12px; left:0; right:0;
          text-align:center;
          font-family: 'Cormorant Garamond', serif;
          font-size: 11px; font-weight:500;
          color: var(--gold-light); letter-spacing:3px;
          text-transform: uppercase;
        }
        .carta-stars-deco {
          position: absolute;
          width:100%; top:0; left:0;
          display:flex; justify-content:space-between;
          padding:20px 14px; pointer-events:none;
        }
        .carta-star { color:var(--gold); font-size:10px; opacity:0.8; }

        .carta-glow {
          position: absolute;
          width: 260px; height: 260px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(107,63,160,0.3) 0%, transparent 70%);
          top: 50%; left:50%; transform:translate(-50%,-50%);
          pointer-events:none; z-index:-1;
          animation: pulseGlow 4s ease-in-out infinite;
        }
        @keyframes pulseGlow {
          0%,100%{opacity:0.5;transform:translate(-50%,-50%) scale(1)}
          50%{opacity:1;transform:translate(-50%,-50%) scale(1.1)}
        }

        /* HERO TEXT */
        .hero-nombre {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(42px, 8vw, 64px);
          font-weight: 300; color: var(--cream);
          letter-spacing: -1px; line-height:1;
          margin-bottom: 8px;
        }
        .hero-esp {
          font-size: 14px; font-weight:400;
          color: var(--gold); letter-spacing:3px;
          text-transform:uppercase; margin-bottom: 16px;
        }
        .hero-divider {
          display:flex; align-items:center; gap:12px;
          justify-content:center; margin-bottom:16px;
          color: var(--gold-dim);
        }
        .hero-divider span { font-size:10px; color:var(--gold); }
        .hero-divider::before,.hero-divider::after {
          content:''; flex:1; max-width:60px;
          height:0.5px; background:var(--border);
        }
        .hero-bio {
          font-size: 15px; line-height:1.8;
          color: var(--text); max-width:340px;
          font-weight:300; margin-bottom: 32px;
          font-style:italic;
          font-family:'Cormorant Garamond',serif;
        }
        .hero-cta {
          display:inline-flex; align-items:center; gap:10px;
          padding: 16px 36px;
          background: linear-gradient(135deg, var(--violet), #8B5CF6);
          color: var(--gold-light);
          border: 0.5px solid var(--gold-dim);
          border-radius:50px; font-size:14px; font-weight:500;
          cursor:pointer; font-family:'Jost',sans-serif;
          letter-spacing:2px; text-transform:uppercase;
          box-shadow: 0 8px 32px rgba(107,63,160,0.4);
          transition:all 0.3s; margin-bottom:16px;
        }
        .hero-cta:hover {
          box-shadow:0 12px 40px rgba(107,63,160,0.6);
          transform:translateY(-2px);
        }
        .hero-trust {
          display:flex; align-items:center; gap:6px;
          font-size:11px; color:var(--text-dim); letter-spacing:1px;
        }
        .hero-scroll {
          position:absolute; bottom:24px; left:50%; transform:translateX(-50%);
          color:var(--gold-dim); animation:bounce 2s infinite;
        }
        @keyframes bounce { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(6px)} }

        /* SECTION GENERAL */
        .section { position:relative; z-index:1; padding:60px 20px; max-width:560px; margin:0 auto; }
        .section-label {
          display:flex; align-items:center; gap:10px;
          font-size:10px; letter-spacing:4px; text-transform:uppercase;
          color:var(--gold); margin-bottom:12px; justify-content:center;
        }
        .section-label::before,.section-label::after { content:'✦'; font-size:8px; }
        .section-title {
          font-family:'Cormorant Garamond',serif;
          font-size:clamp(32px,6vw,48px); font-weight:300;
          color:var(--cream); letter-spacing:-1px; line-height:1.1;
          text-align:center; margin-bottom:8px;
        }
        .section-sub { font-size:14px;color:var(--text-dim);text-align:center;margin-bottom:32px;font-style:italic;font-family:'Cormorant Garamond',serif; }

        /* SOBRE MI */
        .sobre-card {
          background:linear-gradient(135deg,rgba(26,22,40,0.8),rgba(18,16,28,0.9));
          border:0.5px solid var(--border);
          border-radius:20px; padding:28px 24px;
          position:relative; overflow:hidden;
        }
        .sobre-card::before {
          content:''; position:absolute; top:-40px; right:-40px;
          width:120px; height:120px; border-radius:50%;
          background:radial-gradient(circle,rgba(107,63,160,0.2),transparent);
          pointer-events:none;
        }
        .sobre-values { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-top:20px; }
        .sobre-val {
          text-align:center; padding:12px 8px;
          background:rgba(201,168,76,0.05); border-radius:12px;
          border:0.5px solid var(--border);
        }
        .sobre-val-icon { font-size:20px; margin-bottom:6px; }
        .sobre-val-name { font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--gold); margin-bottom:4px; }
        .sobre-val-desc { font-size:11px; color:var(--text-dim); line-height:1.4; }

        /* SERVICIOS */
        .serv-list { display:flex; flex-direction:column; gap:12px; }
        .serv-card {
          background:rgba(26,22,40,0.6);
          border:0.5px solid var(--border); border-radius:16px;
          padding:20px; cursor:pointer; transition:all 0.3s;
          position:relative; overflow:hidden;
        }
        .serv-card::before {
          content:''; position:absolute; left:0; top:0; bottom:0;
          width:3px; border-radius:0 2px 2px 0;
          background:linear-gradient(to bottom,var(--gold),var(--violet));
        }
        .serv-card:hover, .serv-card.sel {
          border-color:rgba(201,168,76,0.4);
          box-shadow:0 0 20px rgba(201,168,76,0.1);
          transform:translateX(4px);
        }
        .serv-tipo { font-size:9px; letter-spacing:3px; text-transform:uppercase; color:var(--gold); margin-bottom:6px; }
        .serv-nombre { font-family:'Cormorant Garamond',serif; font-size:20px; font-weight:500; color:var(--cream); margin-bottom:4px; }
        .serv-desc { font-size:13px; color:var(--text-dim); line-height:1.6; margin-bottom:12px; }
        .serv-footer { display:flex; justify-content:space-between; align-items:center; }
        .serv-precio { font-family:'Cormorant Garamond',serif; font-size:22px; color:var(--gold-light); font-weight:500; }
        .serv-meta { display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-dim); }
        .serv-btn {
          padding:8px 20px;
          background:transparent;
          border:0.5px solid var(--gold-dim);
          color:var(--gold); border-radius:50px;
          font-size:11px; letter-spacing:2px; text-transform:uppercase;
          cursor:pointer; font-family:'Jost',sans-serif; transition:all 0.2s;
        }
        .serv-btn:hover { background:var(--gold-dim); }

        /* DISPONIBILIDAD */
        .dias-scroll { display:flex; gap:8px; overflow-x:auto; padding-bottom:8px; margin-bottom:20px; scrollbar-width:none; }
        .dias-scroll::-webkit-scrollbar { display:none; }
        .dia-pill {
          flex-shrink:0; padding:10px 16px; border-radius:50px;
          border:0.5px solid var(--border); background:rgba(26,22,40,0.5);
          cursor:pointer; transition:all 0.2s; text-align:center;
        }
        .dia-pill.act { background:linear-gradient(135deg,var(--violet),var(--violet-light)); border-color:var(--violet); }
        .dia-pill-dia { font-size:9px; letter-spacing:2px; text-transform:uppercase; color:var(--text-dim); margin-bottom:2px; }
        .dia-pill.act .dia-pill-dia { color:rgba(255,255,255,0.7); }
        .dia-pill-num { font-family:'Cormorant Garamond',serif; font-size:18px; font-weight:500; color:var(--cream); }

        .horas-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
        .hora-btn {
          padding:11px 6px; border-radius:10px;
          border:0.5px solid var(--border); background:rgba(26,22,40,0.5);
          font-size:13px; color:var(--text); cursor:pointer;
          text-align:center; transition:all 0.2s; font-family:'Jost',sans-serif;
        }
        .hora-btn:hover { border-color:var(--gold-dim); color:var(--gold); }
        .hora-btn.sel { background:linear-gradient(135deg,var(--violet),var(--violet-light)); border-color:var(--violet); color:white; }

        /* CAL FULL */
        .cal-full { margin-top:16px; }
        .cal-nav { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; }
        .cal-mes-lbl { font-family:'Cormorant Garamond',serif; font-size:18px; color:var(--cream); }
        .cal-nav-btn { width:28px;height:28px;border-radius:50%;border:0.5px solid var(--border);background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-dim); }
        .cal-nav-btn:hover { border-color:var(--gold-dim); color:var(--gold); }
        .cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:3px; }
        .cal-hdr { text-align:center; font-size:9px; letter-spacing:2px; text-transform:uppercase; color:var(--text-dim); padding:4px 0; }
        .cal-dia {
          height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center;
          font-size:13px; color:var(--text-dim); transition:all 0.15s;
        }
        .cal-dia.disp { cursor:pointer; color:var(--text); }
        .cal-dia.disp:hover { background:var(--violet-dim); color:var(--gold); }
        .cal-dia.sel-d { background:linear-gradient(135deg,var(--violet),var(--violet-light)); color:white; }
        .cal-dia.pasado { opacity:0.3; cursor:not-allowed; }
        .cal-dia.vacio { }

        /* FORMULARIO */
        .form-wrap { margin-top:20px; }
        .field { display:flex; flex-direction:column; gap:6px; margin-bottom:14px; }
        .field label { font-size:10px; letter-spacing:3px; text-transform:uppercase; color:var(--gold); }
        .field input,.field textarea {
          padding:12px 14px; border-radius:10px;
          border:0.5px solid var(--border); background:rgba(26,22,40,0.7);
          font-size:14px; font-family:'Jost',sans-serif; color:var(--cream);
          outline:none; width:100%; transition:border-color 0.2s;
        }
        .field input:focus,.field textarea:focus { border-color:rgba(201,168,76,0.4); }
        .field textarea { min-height:90px; resize:none; }
        .field-hint { font-size:11px; color:var(--text-dim); font-style:italic; }

        /* RESUMEN */
        .resumen {
          background:rgba(26,22,40,0.7); border:0.5px solid var(--border);
          border-radius:14px; padding:18px; margin-bottom:20px;
        }
        .resumen-row { display:flex; justify-content:space-between; font-size:13px; margin-bottom:8px; }
        .resumen-row:last-child { margin-bottom:0; padding-top:10px; border-top:0.5px solid var(--border); font-size:16px; }
        .resumen-lbl { color:var(--text-dim); }
        .resumen-val { color:var(--cream); font-weight:500; }
        .resumen-total { color:var(--gold); font-family:'Cormorant Garamond',serif; font-size:20px; }

        .confirmar-btn {
          width:100%; padding:16px;
          background:linear-gradient(135deg,var(--violet),#8B5CF6);
          color:var(--gold-light); border:0.5px solid var(--gold-dim);
          border-radius:50px; font-size:14px; font-weight:500;
          cursor:pointer; font-family:'Jost',sans-serif;
          letter-spacing:2px; text-transform:uppercase;
          box-shadow:0 8px 32px rgba(107,63,160,0.4); transition:all 0.3s;
        }
        .confirmar-btn:hover { box-shadow:0 12px 40px rgba(107,63,160,0.6); transform:translateY(-1px); }
        .confirmar-btn:disabled { opacity:0.5; cursor:not-allowed; transform:none; }

        /* TESTIMONIOS */
        .testi-card {
          background:rgba(26,22,40,0.7); border:0.5px solid var(--border);
          border-radius:16px; padding:24px; position:relative;
        }
        .testi-quote { font-size:48px; color:var(--gold-dim); font-family:serif; line-height:0.8; margin-bottom:12px; }
        .testi-texto { font-family:'Cormorant Garamond',serif; font-size:18px; font-style:italic; color:var(--cream); line-height:1.7; margin-bottom:16px; }
        .testi-nombre { font-size:11px; letter-spacing:3px; text-transform:uppercase; color:var(--gold); }
        .testi-dots { display:flex; gap:8px; justify-content:center; margin-top:16px; }
        .testi-dot { width:6px; height:6px; border-radius:50%; background:var(--border); cursor:pointer; transition:all 0.2s; }
        .testi-dot.act { width:20px; border-radius:3px; background:var(--gold); }

        /* CTA FINAL */
        .cta-final {
          background:linear-gradient(135deg,rgba(107,63,160,0.3),rgba(26,22,40,0.9));
          border:0.5px solid var(--border); border-radius:24px;
          padding:48px 24px; text-align:center; position:relative; overflow:hidden;
          margin:0 0 60px;
        }
        .cta-final::before {
          content:''; position:absolute; top:-60px; left:50%; transform:translateX(-50%);
          width:200px; height:200px; border-radius:50%;
          background:radial-gradient(circle,rgba(201,168,76,0.1),transparent);
          pointer-events:none;
        }
        .cta-final-title { font-family:'Cormorant Garamond',serif; font-size:clamp(28px,5vw,40px); font-weight:300; color:var(--cream); margin-bottom:8px; }
        .cta-final-sub { font-size:13px; color:var(--text-dim); margin-bottom:28px; font-style:italic; font-family:'Cormorant Garamond',serif; }

        /* FOOTER */
        .footer { text-align:center; padding:20px; font-size:11px; color:var(--text-dim); letter-spacing:2px; z-index:1; position:relative; }
        .footer span { color:var(--gold); }

        /* EXITO */
        .exito-wrap { text-align:center; padding:48px 20px; }
        .exito-circle {
          width:80px; height:80px; border-radius:50%;
          background:linear-gradient(135deg,#10B981,#34D399);
          display:flex; align-items:center; justify-content:center;
          margin:0 auto 24px;
          box-shadow:0 0 40px rgba(16,185,129,0.4);
        }
        .exito-title { font-family:'Cormorant Garamond',serif; font-size:32px; font-weight:300; color:var(--cream); margin-bottom:12px; }
        .exito-sub { font-size:14px; color:var(--text-dim); line-height:1.8; margin-bottom:28px; font-style:italic; font-family:'Cormorant Garamond',serif; }
        .wsp-btn {
          display:inline-flex; align-items:center; gap:8px;
          padding:14px 28px; background:#25D366; color:white;
          border:none; border-radius:50px; font-size:14px; font-weight:500;
          cursor:pointer; font-family:'Jost',sans-serif; letter-spacing:1px;
          box-shadow:0 6px 20px rgba(37,211,102,0.3); text-decoration:none;
        }

        /* DIVIDER */
        .gold-divider {
          display:flex; align-items:center; gap:12px;
          margin:0 auto 48px; max-width:200px;
          color:var(--gold); font-size:10px; justify-content:center;
        }
        .gold-divider::before,.gold-divider::after {
          content:''; flex:1; height:0.5px; background:var(--border);
        }

        /* DESKTOP */
        @media(min-width:768px) {
          .hero { flex-direction:row; text-align:left; max-width:900px; margin:0 auto; gap:60px; padding:100px 40px 80px; }
          .hero-text { flex:1; }
          .hero-bio { max-width:none; }
          .carta { width:280px; height:420px; }
          .hero-cta { margin-bottom:0; }
          .section { max-width:800px; }
          .serv-list { display:grid; grid-template-columns:1fr 1fr; }
          .sobre-values { grid-template-columns:repeat(3,1fr); }
          .cta-final { margin:0 40px 60px; }
          .nav { padding:20px 40px; }
        }
      `}</style>

      {/* STARS */}
      <div className="stars-bg">
        {Array.from({length:40}).map((_,i) => (
          <div key={i} className="star" style={{
            left:`${Math.random()*100}%`,
            top:`${Math.random()*100}%`,
            '--dur':`${2+Math.random()*4}s`,
            '--delay':`${Math.random()*4}s`,
            '--op': Math.random()*0.5+0.2,
          } as any}/>
        ))}
      </div>

      {/* NAV */}
      <nav className="nav">
        <div className="nav-logo">LUMA</div>
        <button className="nav-cta" onClick={() => reservaRef.current?.scrollIntoView({behavior:'smooth'})}>
          Reservar sesión
        </button>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="carta-wrap">
          <div className="carta-glow"/>
          <div className="carta">
            <img
              src={fotoUrl}
              alt={terapeuta.nombre_profesional}
              className="carta-foto"
              onError={e => { (e.target as HTMLImageElement).style.display='none' }}
            />
            <div className="carta-overlay"/>
            <div className="carta-frame"/>
            <div className="carta-roman">✦ XVIII ✦</div>
            <div className="carta-stars-deco">
              <span className="carta-star">✦</span>
              <span className="carta-star">✦</span>
            </div>
            <div className="carta-name">{terapeuta.especialidad?.split('·')[0]?.trim() || 'La Intuición'}</div>
          </div>
        </div>

        <div className="hero-text">
          <div className="hero-esp">{terapeuta.especialidad || 'Tarot & Bienestar'}</div>
          <h1 className="hero-nombre">{terapeuta.nombre_profesional}</h1>
          <div className="hero-divider"><span>✦</span></div>
          <p className="hero-bio">
            {terapeuta.mensaje_bienvenida || 'Te acompaño a conectar con tu intuición, encontrar claridad y tomar decisiones desde tu poder personal.'}
          </p>
          <button className="hero-cta" onClick={() => reservaRef.current?.scrollIntoView({behavior:'smooth'})}>
            ✦ Reservar sesión
          </button>
          <div className="hero-trust">
            <Shield size={11}/> Sesiones online · Espacio seguro y confidencial
          </div>
        </div>

        <div className="hero-scroll"><ChevronDown size={20}/></div>
      </section>

      {/* SOBRE MÍ */}
      <section className="section">
        <div className="section-label">Sobre mí</div>
        <h2 className="section-title">Mi propósito</h2>
        <div className="sobre-card">
          <p style={{fontSize:'15px',lineHeight:'1.9',color:'var(--text)',fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',marginBottom:'8px'}}>
            {terapeuta.bio || 'Trabajo desde una mirada holística integrando el tarot, la energía y la intuición para acompañar procesos de transformación y crecimiento. Creo en la magia de los pequeños pasos y en el poder de escucharte a ti misma.'}
          </p>
          <div className="sobre-values">
            {[
              {icon:'👁', name:'Escucha', desc:'Te escucho con el corazón y sin juicios'},
              {icon:'✨', name:'Claridad', desc:'Aporto claridad a lo que hoy te confunde'},
              {icon:'🌙', name:'Acompaño', desc:'Te acompaño en cada paso de tu proceso'},
            ].map(v => (
              <div key={v.name} className="sobre-val">
                <div className="sobre-val-icon">{v.icon}</div>
                <div className="sobre-val-name">{v.name}</div>
                <div className="sobre-val-desc">{v.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="gold-divider">✦ ✦ ✦</div>

      {/* SERVICIOS */}
      <section className="section" ref={reservaRef}>
        <div className="section-label">Servicios</div>
        <h2 className="section-title">¿Cómo puedo acompañarte?</h2>
        <p className="section-sub">Elegí el servicio que resuene con lo que necesitás hoy</p>

        {servicios.length === 0 ? (
          <div style={{textAlign:'center',color:'var(--text-dim)',padding:'40px',fontStyle:'italic',fontFamily:"'Cormorant Garamond',serif",fontSize:'16px'}}>
            Próximamente disponibles ✦
          </div>
        ) : (
          <div className="serv-list">
            {servicios.map(s => (
              <div key={s.id}
                className={`serv-card${servicioSel?.id===s.id?' sel':''}`}
                onClick={() => {
                  setServicioSel(s)
                  setFechaSel('')
                  setHoraSel('')
                  if (s.tipo_servicio === 'entrega') {
                    setFechaSel(new Date().toISOString().split('T')[0])
                    setHoraSel('00:00')
                    setPaso(3)
                  } else {
                    setPaso(2)
                  }
                }}>
                <div className="serv-tipo">
                  {s.tipo_servicio === 'entrega' ? `⏳ Entrega en ${s.plazo_horas}hs` : '🔴 Sesión en vivo'}
                </div>
                <div className="serv-nombre">{s.nombre}</div>
                <div className="serv-desc">{s.descripcion}</div>
                <div className="serv-footer">
                  <div>
                    <div className="serv-precio">${s.precio_base.toLocaleString()}</div>
                    {s.tipo_servicio === 'entrega' ? (
                      <div className="serv-meta">📦 Recibís en {s.plazo_horas}hs</div>
                    ) : (
                      <div className="serv-meta"><Clock size={10}/>{s.duracion_estimada} min</div>
                    )}
                  </div>
                  <button className="serv-btn">
                    {s.tipo_servicio === 'entrega' ? 'Solicitar' : 'Reservar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* DISPONIBILIDAD */}
        {paso >= 1 && paso < 3 && servicioSel && servicioSel.tipo_servicio !== 'entrega' && !enviado && (
          <div style={{marginTop:'32px'}}>
            <div className="section-label" style={{marginBottom:'16px'}}>Próximos turnos disponibles</div>

            {!mostrarCalFull ? (<>
              <div className="dias-scroll">
                {diasSel.map((d,i) => (
                  <div key={i}
                    className={`dia-pill${diaActivoIdx===i?' act':''}`}
                    onClick={() => { setDiaActivoIdx(i); setFechaSel(formatDate(d)); setHoraSel('') }}>
                    <div className="dia-pill-dia">{DIAS_CORTO[d.getDay()]}</div>
                    <div className="dia-pill-num">{d.getDate()}</div>
                  </div>
                ))}
              </div>

              {fechaSel && (
                <div className="horas-grid">
                  {horariosDisponibles(fechaSel).length === 0 ? (
                    <div style={{gridColumn:'1/-1',textAlign:'center',color:'var(--text-dim)',fontSize:'13px',padding:'16px',fontStyle:'italic'}}>
                      No hay horarios disponibles este día
                    </div>
                  ) : horariosDisponibles(fechaSel).map(h => (
                    <button key={h}
                      className={`hora-btn${horaSel===h?' sel':''}`}
                      onClick={() => { setHoraSel(h); setPaso(2) }}>
                      {h}
                    </button>
                  ))}
                </div>
              )}

              <button onClick={() => setMostrarCalFull(true)}
                style={{marginTop:'16px',width:'100%',padding:'10px',background:'transparent',border:'0.5px solid var(--border)',color:'var(--text-dim)',borderRadius:'10px',fontSize:'12px',letterSpacing:'2px',textTransform:'uppercase',cursor:'pointer',fontFamily:"'Jost',sans-serif"}}>
                Ver calendario completo
              </button>
            </>) : (
              <div className="cal-full">
                <div className="cal-nav">
                  <button className="cal-nav-btn" onClick={() => { const d=new Date(mesBase);d.setMonth(d.getMonth()-1);setMesBase(d) }}><ChevronLeft size={12}/></button>
                  <div className="cal-mes-lbl">{MESES[mesBase.getMonth()]} {mesBase.getFullYear()}</div>
                  <button className="cal-nav-btn" onClick={() => { const d=new Date(mesBase);d.setMonth(d.getMonth()+1);setMesBase(d) }}><ChevronRight size={12}/></button>
                </div>
                <div className="cal-grid">
                  {DIAS_CORTO.map(d => <div key={d} className="cal-hdr">{d}</div>)}
                  {diasDelMes().map((dia,i) => {
                    if (!dia) return <div key={`v${i}`} className="cal-dia vacio"/>
                    const f = formatDate(dia)
                    const disp = diaDisponible(dia)
                    const pas = dia < new Date(new Date().setHours(0,0,0,0))
                    return (
                      <div key={i}
                        className={`cal-dia${f===fechaSel?' sel-d':disp&&!pas?' disp':pas?' pasado':''}`}
                        onClick={() => { if(!disp||pas) return; setFechaSel(f); setHoraSel(''); setMostrarCalFull(false) }}>
                        {dia.getDate()}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* FORMULARIO */}
        {paso >= 3 && fechaSel && horaSel && !enviado && (
          <div className="form-wrap">
            <div style={{height:'1px',background:'var(--border)',margin:'28px 0'}}/>
            <div className="section-label" style={{marginBottom:'20px'}}>Tus datos</div>
            <div className="field">
              <label>Nombre completo</label>
              <input placeholder="Ej: María López" value={form.nombre}
                onChange={e => setForm({...form,nombre:e.target.value})}/>
            </div>
            <div className="field">
              <label>WhatsApp</label>
              <input placeholder="Ej: 2236789012" value={form.whatsapp}
                onChange={e => setForm({...form,whatsapp:e.target.value})}/>
              <div className="field-hint">Te contactaremos para confirmar</div>
            </div>
            <div className="field">
              <label>¿Qué querés trabajar? (opcional)</label>
              <textarea placeholder="Contanos un poco sobre lo que querés consultar..."
                value={form.mensaje} onChange={e => setForm({...form,mensaje:e.target.value})}/>
            </div>

            {form.nombre && form.whatsapp && (
              <>
                <div className="resumen">
                  <div className="resumen-row"><span className="resumen-lbl">Servicio</span><span className="resumen-val">{servicioSel?.nombre}</span></div>
                  {servicioSel?.tipo_servicio !== 'entrega' && <>
                <div className="resumen-row"><span className="resumen-lbl">Fecha</span><span className="resumen-val">{new Date(fechaSel+'T12:00:00').toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'})}</span></div>
                <div className="resumen-row"><span className="resumen-lbl">Hora</span><span className="resumen-val">{horaSel} hs</span></div>
                </>}
{servicioSel?.tipo_servicio === 'entrega' && <div className="resumen-row"><span className="resumen-lbl">Entrega estimada</span><span className="resumen-val">En {servicioSel.plazo_horas}hs</span></div>}
                  <div className="resumen-row"><span className="resumen-lbl">Total</span><span className="resumen-total">${servicioSel?.precio_base.toLocaleString()}</span></div>
                </div>
                <button className="confirmar-btn" onClick={confirmarReserva} disabled={enviando}>
                  {enviando ? '✦ confirmando...' : '✦ Confirmar reserva'}
                </button>
              </>
            )}
          </div>
        )}

        {/* ÉXITO */}
        {enviado && (
          <div className="exito-wrap">
            <div className="exito-circle"><Check size={36} color="white"/></div>
            <h2 className="exito-title">¡Reserva confirmada!</h2>
            <p className="exito-sub">
              Tu sesión de <em>{servicioSel?.nombre}</em> quedó agendada para el{' '}
              <em>{new Date(fechaSel+'T12:00:00').toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'})}</em>{' '}
              a las <em>{horaSel} hs</em>.<br/><br/>
              {terapeuta.nombre_profesional} se va a contactar con vos pronto.
            </p>
            <a className="wsp-btn" href={`https://wa.me/549${terapeuta.nombre_profesional}`} target="_blank" rel="noopener noreferrer">
              💬 Escribir por WhatsApp
            </a>
          </div>
        )}
      </section>

      <div className="gold-divider">✦ ✦ ✦</div>

      {/* TESTIMONIOS */}
      <section className="section">
        <div className="section-label">Testimonios</div>
        <h2 className="section-title">Lo que dicen</h2>
        <div className="testi-card">
          <div className="testi-quote">"</div>
          <p className="testi-texto">{TESTIMONIOS[testiIdx].texto}</p>
          <div className="testi-nombre">— {TESTIMONIOS[testiIdx].nombre}</div>
        </div>
        <div className="testi-dots">
          {TESTIMONIOS.map((_,i) => (
            <div key={i} className={`testi-dot${testiIdx===i?' act':''}`} onClick={() => setTestiIdx(i)}/>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="section">
        <div className="cta-final">
          <div className="section-label">¿Lista para tu próximo paso?</div>
          <h2 className="cta-final-title">Tu proceso merece<br/>un espacio cuidado ✦</h2>
          <p className="cta-final-sub">Estoy aquí para acompañarte</p>
          <button className="hero-cta" onClick={() => reservaRef.current?.scrollIntoView({behavior:'smooth'})}>
            ✦ Reservar mi sesión
          </button>
        </div>
      </section>

      <footer className="footer">
        © 2025 {terapeuta.nombre_profesional} · Powered by <span>Luma</span>
      </footer>
    </>
  )
}
