'use client'
// Tarjeta de un descargable en "Mis cursos": sin aula, sin progreso, sin certificado. Solo sus archivos y "Descargar".
// Cada toque en "Descargar" arma en ese momento un link nuevo que vence en 5 minutos (la descarga arranca enseguida).
// El acceso es para siempre: si algo falla, se vuelve a tocar y sale otro link.
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from '@/components/ToastProvider'
import { Download, Gift } from 'lucide-react'
import { IconoArchivo, tipoLegible, pesoLegible } from '@/components/ArchivosDescargable'

type Archivo = { id: string; nombre: string; tamano: number; es_bonus: boolean; orden: number }

export default function TarjetaDescargable({ courseId, titulo, imagen, terapeuta, acceso, estado, whatsapp }: {
  courseId: string; titulo: string; imagen?: string | null; terapeuta?: string | null
  acceso: boolean; estado: string; whatsapp?: string | null
}) {
  const [archivos, setArchivos] = useState<Archivo[] | null>(null)
  const [bajando, setBajando] = useState<string | null>(null)

  useEffect(() => {
    if (!acceso) { setArchivos([]); return }
    createClient().from('descargable_archivos').select('id, nombre, tamano, es_bonus, orden').eq('course_id', courseId).order('orden')
      .then(({ data }) => setArchivos(((data || []) as any[]).map(a => ({ ...a, tamano: Number(a.tamano) || 0 }))), () => setArchivos([]))
  }, [courseId, acceso])

  async function descargar(a: Archivo) {
    if (bajando) return
    setBajando(a.id)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      if (!session) { window.location.href = `/auth/login?volver=${encodeURIComponent('/mi-cuenta/cursos')}`; return }
      const res = await fetch('/api/descargables/link', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ archivoId: a.id }) })
      const r = await res.json().catch(() => ({ ok: false, mensaje: 'No pudimos preparar tu descarga. Probá en un minuto.' }))
      if (!r.ok) { toast(r.mensaje || 'No pudimos preparar tu descarga. Probá en un minuto.', 'error'); return }
      // descarga directa, con el nombre original (sin abrir una pestaña rara en el celu)
      const enlace = document.createElement('a')
      enlace.href = r.url; enlace.download = r.nombre || a.nombre; enlace.rel = 'noopener'
      document.body.appendChild(enlace); enlace.click(); enlace.remove()
      toast('Tu descarga empezó')
    } finally { setTimeout(() => setBajando(null), 800) }
  }

  const principales = (archivos || []).filter(a => !a.es_bonus)
  const bonus = (archivos || []).filter(a => a.es_bonus)
  const fila = (a: Archivo) => (
    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
      <span style={{ width: 34, height: 34, borderRadius: 10, background: '#F3EEFF', color: '#6B3FA0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IconoArchivo nombre={a.nombre} size={16}/></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.nombre}</div>
        <div style={{ fontSize: 11, color: '#8A7FA8' }}>{tipoLegible(a.nombre)} · {pesoLegible(a.tamano)}</div>
      </div>
      <button type="button" onClick={e => { e.stopPropagation(); descargar(a) }} disabled={bajando === a.id}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#6B3FA0', color: 'white', border: 'none', borderRadius: 10, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, minHeight: 36 }}>
        <Download size={14}/> {bajando === a.id ? 'Preparando…' : 'Descargar'}
      </button>
    </div>
  )

  return (
    <div className={`mc-card${!acceso ? ' pendiente' : ''}`} style={{ cursor: 'default' }}>
      {imagen && <img src={imagen} className="mc-card-img" alt=""/>}
      <div className="mc-card-body">
        <div style={{ fontSize: 10, letterSpacing: '1.5px', fontWeight: 700, color: '#A8862E', display: 'flex', alignItems: 'center', gap: 5 }}><Download size={11}/> DESCARGABLE</div>
        <div className="mc-card-titulo">{titulo}</div>
        {terapeuta && <div className="mc-card-terapeuta">{terapeuta}</div>}
        {acceso ? (
          archivos === null ? <div style={{ fontSize: 12, color: '#8A7FA8' }}>Cargando archivos…</div>
            : archivos.length === 0 ? <div style={{ fontSize: 12, color: '#8A7FA8', lineHeight: 1.5 }}>Este archivo ya no está disponible. Escribile a {terapeuta || 'la terapeuta'}.</div>
            : (<>
              {principales.map(fila)}
              {bonus.length > 0 && <div style={{ fontSize: 10.5, letterSpacing: '1.2px', fontWeight: 700, color: '#BE185D', marginTop: 10, display: 'flex', alignItems: 'center', gap: 5 }}><Gift size={11}/> BONUS DE REGALO</div>}
              {bonus.map(fila)}
              <div style={{ fontSize: 11, color: '#8A7FA8', marginTop: 8, lineHeight: 1.5 }}>Lo podés descargar todas las veces que quieras.</div>
            </>)
        ) : estado === 'baja' ? (
          <div style={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
            Tu acceso terminó. Escribile a {terapeuta || 'la terapeuta'}.
            {whatsapp && <a href={`https://wa.me/${whatsapp.replace(/\D/g, '').replace(/^0+/, '')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: 6, color: '#6B3FA0', fontWeight: 700 }}>Escribir por WhatsApp</a>}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '8px 10px', lineHeight: 1.5 }}>
            Se habilita cuando se confirme tu pago. Te avisamos por mail.
          </div>
        )}
      </div>
    </div>
  )
}
