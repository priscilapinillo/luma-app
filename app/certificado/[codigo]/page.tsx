'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const TEMPLATES: Record<string, any> = {
  luna: { bg: '#0D0B14', bg2: '#1A1628', primary: '#C9A84C', primaryLight: '#E8D5A3', primaryDim: 'rgba(201,168,76,0.3)', accent: '#6B3FA0', accentLight: '#9B6DD0', accentDim: 'rgba(107,63,160,0.25)', cream: '#F0E8D5', textDim: '#7A6B8A', border: 'rgba(201,168,76,0.3)' },
  aura: { bg: '#1F1730', bg2: '#2A2040', primary: '#A78BFA', primaryLight: '#DDD6FE', primaryDim: 'rgba(167,139,250,0.3)', accent: '#EC4899', accentLight: '#F9A8D4', accentDim: 'rgba(236,72,153,0.25)', cream: '#F8F4FF', textDim: '#9B8EC4', border: 'rgba(167,139,250,0.3)' },
  tierra: { bg: '#241A0F', bg2: '#332417', primary: '#D97706', primaryLight: '#FCD34D', primaryDim: 'rgba(217,119,6,0.3)', accent: '#065F46', accentLight: '#34D399', accentDim: 'rgba(6,95,70,0.25)', cream: '#FAF7F0', textDim: '#A8927A', border: 'rgba(217,119,6,0.3)' },
  rosa: { bg: '#2D0A25', bg2: '#3D1233', primary: '#F472B6', primaryLight: '#FBCFE8', primaryDim: 'rgba(244,114,182,0.3)', accent: '#9D174D', accentLight: '#EC4899', accentDim: 'rgba(157,23,77,0.25)', cream: '#FFF0F6', textDim: '#B98CA8', border: 'rgba(244,114,182,0.3)' },
  violeta: { bg: '#1E0A3C', bg2: '#2D1058', primary: '#C084FC', primaryLight: '#E9D5FF', primaryDim: 'rgba(192,132,252,0.3)', accent: '#A855F7', accentLight: '#D8B4FE', accentDim: 'rgba(168,85,247,0.25)', cream: '#FAF5FF', textDim: '#8B5CF6', border: 'rgba(192,132,252,0.3)' },
  verde: { bg: '#022C22', bg2: '#0A3D2E', primary: '#34D399', primaryLight: '#A7F3D0', primaryDim: 'rgba(52,211,153,0.3)', accent: '#065F46', accentLight: '#10B981', accentDim: 'rgba(6,95,70,0.25)', cream: '#F0FDF4', textDim: '#6EE7B7', border: 'rgba(52,211,153,0.3)' },
}

type Cert = {
  codigo_unico: string; fecha_emision: string
  curso_titulo: string
  alumna_nombre: string
  terapeuta_nombre: string
  template: string
}

export default function CertificadoPage() {
  const params = useParams()
  const codigo = (params.codigo as string || '').toUpperCase()

  const [cert, setCert] = useState<Cert | null>(null)
  const [loading, setLoading] = useState(true)
  const [noEncontrado, setNoEncontrado] = useState(false)

  useEffect(() => { cargar() }, [codigo])

  async function cargar() {
    try {
      const supabase = createClient()
      const { data: c } = await supabase
        .from('certificates').select('codigo_unico, fecha_emision, course_id, person_id, terapeuta_id')
        .eq('codigo_unico', codigo).maybeSingle()

      if (!c) { setNoEncontrado(true); setLoading(false); return }

      const [{ data: curso }, { data: persona }, { data: perfil }] = await Promise.all([
        supabase.from('courses').select('titulo').eq('id', c.course_id).maybeSingle(),
        supabase.from('persons').select('nombre, apellido').eq('id', c.person_id).maybeSingle(),
        supabase.from('therapist_profiles').select('nombre_profesional, template').eq('user_id', c.terapeuta_id).maybeSingle(),
      ])

      setCert({
        codigo_unico: c.codigo_unico,
        fecha_emision: c.fecha_emision,
        curso_titulo: curso?.titulo || 'Curso',
        alumna_nombre: `${persona?.nombre || ''} ${persona?.apellido || ''}`.trim() || 'Alumna',
        terapeuta_nombre: perfil?.nombre_profesional || 'Instructora',
        template: perfil?.template || 'luna',
      })
    } catch (e) { console.error(e); setNoEncontrado(true) }
    finally { setLoading(false) }
  }

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0D0B14',color:'#C4B8DE',fontFamily:'sans-serif',fontSize:'14px'}}>
      Verificando...
    </div>
  )

  if (noEncontrado || !cert) return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#0D0B14',color:'#F0E8D5',fontFamily:'sans-serif',gap:'12px',padding:'20px',textAlign:'center'}}>
      <div style={{fontSize:'32px'}}>✦</div>
      <div style={{fontSize:'16px',fontWeight:700}}>Certificado no encontrado</div>
      <div style={{fontSize:'13px',color:'#8B7BA8'}}>El código "{codigo}" no corresponde a ningún certificado emitido por Luma.</div>
    </div>
  )

  const t = TEMPLATES[cert.template] || TEMPLATES.luna
  const fecha = new Date(cert.fecha_emision).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{minHeight:'100vh',background:'#0a0812',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'40px 20px',fontFamily:"'Jost',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Jost:wght@300;400;500;600&display=swap');
        :root{
          --bg:${t.bg};--bg2:${t.bg2};--primary:${t.primary};--primary-light:${t.primaryLight};--primary-dim:${t.primaryDim};
          --accent:${t.accent};--accent-light:${t.accentLight};--accent-dim:${t.accentDim};
          --cream:${t.cream};--text-dim:${t.textDim};--border:${t.border};
        }
        .cert{position:relative;width:100%;max-width:720px;aspect-ratio:1.55/1;border-radius:20px;overflow:hidden;
          background:radial-gradient(circle at 12% 15%, var(--accent-dim) 0%, transparent 45%),
                      radial-gradient(circle at 90% 85%, var(--primary-dim) 0%, transparent 45%),
                      linear-gradient(150deg, var(--bg2), var(--bg));
          box-shadow:0 40px 100px rgba(0,0,0,0.6);padding:6px}
        .cert-inner{position:relative;height:100%;border-radius:15px;border:1.5px solid var(--primary-dim);
          display:flex;flex-direction:column;align-items:center;justify-content:center;padding:44px 40px;text-align:center;overflow:hidden}
        .cert-inner::before{content:'';position:absolute;inset:14px;border:0.5px solid var(--primary-dim);border-radius:8px;pointer-events:none}
        .mandala{position:absolute;top:50%;left:50%;width:480px;height:480px;transform:translate(-50%,-50%);opacity:0.08;pointer-events:none;z-index:0}
        .cert-sello{width:52px;height:52px;border-radius:50%;border:1.5px solid var(--primary);display:flex;align-items:center;justify-content:center;margin-bottom:16px;position:relative;z-index:1;box-shadow:0 0 24px var(--primary-dim);color:var(--primary);font-size:20px}
        .cert-tag{font-size:10px;letter-spacing:4px;text-transform:uppercase;color:var(--primary);margin-bottom:6px;position:relative;z-index:1;font-weight:600}
        .cert-titulo{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:500;color:var(--cream);letter-spacing:1px;margin-bottom:24px;position:relative;z-index:1}
        .cert-otorgado{font-size:11px;color:var(--text-dim);letter-spacing:1px;margin-bottom:10px;position:relative;z-index:1}
        .cert-nombre{font-family:'Cormorant Garamond',serif;font-size:clamp(28px,5vw,44px);font-weight:600;color:var(--primary-light);margin-bottom:20px;position:relative;z-index:1;font-style:italic}
        .cert-desc{font-size:13px;color:var(--cream);line-height:1.7;max-width:440px;margin-bottom:8px;position:relative;z-index:1}
        .cert-curso{font-weight:700;color:var(--primary)}
        .cert-footer{display:flex;justify-content:space-between;align-items:flex-end;width:100%;max-width:560px;margin-top:24px;position:relative;z-index:1}
        .cert-footer-col.right{text-align:right}
        .cert-footer-label{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text-dim);margin-bottom:3px}
        .cert-footer-val{font-size:12px;color:var(--cream);font-weight:600}
        .cert-firma{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:18px;color:var(--primary-light);border-bottom:1px solid var(--primary-dim);padding-bottom:4px;margin-bottom:4px}
        .verificado{margin-top:24px;display:flex;align-items:center;gap:8px;font-size:12px;color:#6EE7B7}
      `}</style>

      <div className="cert">
        <div className="cert-inner">
          <svg className="mandala" viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="98" stroke={t.primary} strokeWidth="0.5"/>
            <circle cx="100" cy="100" r="76" stroke={t.accentLight} strokeWidth="0.5"/>
            <circle cx="100" cy="100" r="54" stroke={t.primary} strokeWidth="0.5"/>
          </svg>

          <div className="cert-sello">✦</div>
          <div className="cert-tag">Certificado de finalización</div>
          <div className="cert-titulo">Luma</div>

          <div className="cert-otorgado">Este certificado se otorga a</div>
          <div className="cert-nombre">{cert.alumna_nombre}</div>

          <div className="cert-desc">
            por completar exitosamente el curso <span className="cert-curso">{cert.curso_titulo}</span>,
            aprobando el examen final.
          </div>

          <div className="cert-footer">
            <div className="cert-footer-col">
              <div className="cert-firma">{cert.terapeuta_nombre}</div>
              <div className="cert-footer-label">Instructora</div>
            </div>
            <div className="cert-footer-col right">
              <div className="cert-footer-val">{fecha}</div>
              <div className="cert-footer-label">Código {cert.codigo_unico}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="verificado">✓ Certificado verificado por Luma</div>
    </div>
  )
}