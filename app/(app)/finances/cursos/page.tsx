'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, GraduationCap, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type Pago = {
  id: string; monto: number; fecha: string
  metodo: string; tipo: string
  course_id: string | null; enrollment_id: string | null
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function formatPesos(n: number) {
  return '$' + Math.round(n).toLocaleString('es-AR')
}

export default function HistorialCursosPage() {
  const [pagos, setPagos] = useState<Pago[]>([])
  const [cursos, setCursos] = useState<Record<string, string>>({})
  const [alumnas, setAlumnas] = useState<Record<string, string>>({})
  const [filtroCurso, setFiltroCurso] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [borrando, setBorrando] = useState<string | null>(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/auth/login'; return }

      const [{ data: pagosData, error: errPagos }, { data: cursosData }] = await Promise.all([
        supabase.from('course_payments').select('id,monto,fecha,metodo,tipo,course_id,enrollment_id')
          .eq('terapeuta_id', user.id).order('fecha', { ascending: false }),
        supabase.from('courses').select('id,titulo').eq('user_id', user.id),
      ])
      if (errPagos) { setError('No pudimos cargar el historial. Probá de nuevo en un rato.'); return }

      const lista: Pago[] = pagosData || []
      setPagos(lista)
      const mapC: Record<string, string> = {}
      ;(cursosData || []).forEach((c: { id: string; titulo: string }) => { mapC[c.id] = c.titulo })
      setCursos(mapC)

      // nombre de cada alumna: pago -> inscripción -> persona
      const enrIds = [...new Set(lista.map(p => p.enrollment_id).filter(Boolean))] as string[]
      if (enrIds.length > 0) {
        const { data: enrs } = await supabase.from('enrollments').select('id,person_id').in('id', enrIds)
        const personIds = [...new Set((enrs || []).map((e: { person_id: string }) => e.person_id))]
        const { data: personas } = personIds.length > 0
          ? await supabase.from('persons').select('id,nombre,apellido').in('id', personIds)
          : { data: [] as { id: string; nombre: string; apellido: string }[] }
        const mapA: Record<string, string> = {}
        ;(enrs || []).forEach((e: { id: string; person_id: string }) => {
          const p = (personas || []).find((x: { id: string }) => x.id === e.person_id)
          if (p) mapA[e.id] = `${p.nombre || ''} ${p.apellido || ''}`.trim()
        })
        setAlumnas(mapA)
      }
    } catch (e) {
      console.error(e)
      setError('No pudimos cargar el historial. Probá de nuevo en un rato.')
    } finally { setLoading(false) }
  }

  async function borrarPago(id: string) {
    if (!confirm('¿Borrar este pago de tus Finanzas? Usalo solo si lo cargaste por error. El acceso de la alumna no cambia.')) return
    setBorrando(id)
    try {
      const supabase = createClient()
      const { error: err } = await supabase.from('course_payments').delete().eq('id', id)
      if (err) { alert('No se pudo borrar: ' + err.message); return }
      setPagos(prev => prev.filter(p => p.id !== id))
    } finally { setBorrando(null) }
  }

  const filtrados = useMemo(() => filtroCurso ? pagos.filter(p => p.course_id === filtroCurso) : pagos, [pagos, filtroCurso])

  const porMes = useMemo(() => {
    const grupos: { clave: string; titulo: string; total: number; pagos: Pago[] }[] = []
    filtrados.forEach(p => {
      const f = new Date(p.fecha)
      const clave = `${f.getFullYear()}-${f.getMonth()}`
      let g = grupos.find(x => x.clave === clave)
      if (!g) { g = { clave, titulo: `${MESES[f.getMonth()]} ${f.getFullYear()}`, total: 0, pagos: [] }; grupos.push(g) }
      g.pagos.push(p)
      g.total += Number(p.monto) || 0
    })
    return grupos
  }, [filtrados])

  const totalGeneral = filtrados.reduce((a, p) => a + (Number(p.monto) || 0), 0)

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:'13px',color:'var(--text-muted)',background:'var(--bg)'}}>
      Cargando...
    </div>
  )

  return (
    <>
      <style>{`
        .hc{height:100vh;overflow-y:auto;font-family:'Inter',sans-serif;background:var(--bg);padding:20px 24px}
        @media(max-width:768px){ .hc{height:auto;min-height:100vh;padding:14px 12px 90px} }
        .hc-back{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:600;color:var(--accent);text-decoration:none;margin-bottom:10px}
        .hc-title{font-size:22px;font-weight:800;color:var(--text-primary);letter-spacing:-0.5px;font-family:'Manrope',sans-serif;display:flex;align-items:center;gap:8px}
        .hc-sub{font-size:12px;color:var(--text-muted);margin:4px 0 18px;line-height:1.5}
        .hc-top{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px}
        .hc-total{background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:white;border-radius:16px;padding:12px 18px;font-family:'Manrope',sans-serif}
        .hc-total small{display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;opacity:0.75}
        .hc-total b{font-size:20px;font-weight:800}
        .hc-select{padding:9px 12px;border-radius:10px;border:0.5px solid var(--border);background:var(--bg-card);color:var(--text-primary);font-size:13px;font-family:inherit;outline:none;max-width:100%}
        .hc-mes{background:var(--bg-card);border-radius:18px;padding:16px 18px;border:0.5px solid var(--border-light);box-shadow:0 2px 12px var(--shadow);margin-bottom:14px}
        .hc-mes-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px}
        .hc-mes-titulo{font-size:13px;font-weight:800;color:var(--text-primary);font-family:'Manrope',sans-serif}
        .hc-mes-total{font-size:13px;font-weight:800;color:#059669;font-family:'Manrope',sans-serif}
        .hc-row{display:grid;grid-template-columns:70px 1fr 1fr 110px 90px 28px;gap:10px;align-items:center;padding:9px 0;border-top:0.5px solid var(--border-light);font-size:12px;color:var(--text-primary)}
        .hc-fecha{color:var(--text-muted);font-size:11px}
        .hc-metodo{font-size:11px;color:var(--text-muted)}
        .hc-monto{text-align:right;font-weight:700;font-family:'Manrope',sans-serif}
        .hc-del{width:26px;height:26px;border-radius:8px;border:none;background:transparent;color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center}
        .hc-del:hover{background:#FEF2F2;color:#EF4444}
        .hc-empty{text-align:center;padding:50px 20px;color:var(--text-muted);font-size:13px;line-height:1.6}
        @media(max-width:768px){
          .hc-row{grid-template-columns:1fr auto 28px;gap:2px 10px}
          .hc-row .hc-fecha{grid-column:1}
          .hc-row .hc-alumna{grid-column:1}
          .hc-row .hc-curso{grid-column:1;color:var(--text-muted)}
          .hc-row .hc-metodo{grid-column:1}
          .hc-row .hc-monto{grid-row:1;grid-column:2}
          .hc-row .hc-del{grid-row:1;grid-column:3}
        }
      `}</style>

      <div className="hc">
        <Link href="/finances" className="hc-back"><ChevronLeft size={14}/> Volver a Finanzas</Link>
        <div className="hc-title"><GraduationCap size={20}/> Historial de cursos</div>
        <div className="hc-sub">Cada pago de curso confirmado: los de Mercado Pago se cargan solos, y los que confirmás a mano desde la pestaña Alumnas de cada curso.</div>

        {error ? <div className="hc-empty">{error}</div> : (<>
          <div className="hc-top">
            <div className="hc-total"><small>{filtroCurso ? 'Total de este curso' : 'Total cobrado en cursos'}</small><b>{formatPesos(totalGeneral)}</b></div>
            {Object.keys(cursos).length > 1 && (
              <select className="hc-select" value={filtroCurso} onChange={e => setFiltroCurso(e.target.value)}>
                <option value="">Todos los cursos</option>
                {Object.entries(cursos).map(([id, titulo]) => <option key={id} value={id}>{titulo}</option>)}
              </select>
            )}
          </div>

          {porMes.length === 0 ? (
            <div className="hc-empty">
              Todavía no hay pagos de cursos registrados.<br/>
              Aparecen acá cuando una alumna paga con Mercado Pago o cuando confirmás un pago desde la pestaña Alumnas.
            </div>
          ) : porMes.map(g => (
            <div key={g.clave} className="hc-mes">
              <div className="hc-mes-head">
                <div className="hc-mes-titulo">{g.titulo}</div>
                <div className="hc-mes-total">{formatPesos(g.total)}</div>
              </div>
              {g.pagos.map(p => (
                <div key={p.id} className="hc-row">
                  <div className="hc-fecha">{new Date(p.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</div>
                  <div className="hc-alumna" style={{fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {(p.enrollment_id && alumnas[p.enrollment_id]) || 'Alumna'}
                  </div>
                  <div className="hc-curso" style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {(p.course_id && cursos[p.course_id]) || 'Curso eliminado'}
                  </div>
                  <div className="hc-metodo">
                    {p.metodo === 'mercadopago' ? '💳 Mercado Pago' : '✋ Confirmado a mano'}{p.tipo === 'renovacion' ? ' · renovación' : ''}
                  </div>
                  <div className="hc-monto">{formatPesos(Number(p.monto) || 0)}</div>
                  <button className="hc-del" onClick={() => borrarPago(p.id)} disabled={borrando === p.id} aria-label="Borrar pago">
                    <Trash2 size={13}/>
                  </button>
                </div>
              ))}
            </div>
          ))}
        </>)}
      </div>
    </>
  )
}