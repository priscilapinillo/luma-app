'use client'

// Estadísticas de Luma Links: visitas, clics por link, de dónde viene la gente y el mejor día.
// Los números salen de una función segura de Supabase que solo devuelve los de la dueña de la sesión.
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Datos = {
  visitas: number
  clics: number
  clicsWhatsapp: number
  porLink: { titulo: string; tipo: string; clics: number }[]
  origenes: { origen: string; visitas: number }[]
  porDia: { dia: number; visitas: number }[]
}

const ORIGENES: Record<string, string> = {
  instagram: 'Instagram', tiktok: 'TikTok', facebook: 'Facebook', whatsapp: 'WhatsApp', google: 'Google', directo: 'Link directo', otro: 'Otros',
}
const DIAS = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

export default function EstadisticasLinks() {
  const [dias, setDias] = useState<7 | 30>(30)
  const [datos, setDatos] = useState<Datos | null>(null)
  const [cargando, setCargando] = useState(true)
  const [falla, setFalla] = useState(false)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      setCargando(true)
      try {
        const { data, error } = await createClient().rpc('estadisticas_links', { p_dias: dias })
        if (!vivo) return
        if (error || !data) { setFalla(true); return }
        setDatos(data as Datos)
        setFalla(false)
      } catch { if (vivo) setFalla(true) }
      finally { if (vivo) setCargando(false) }
    })()
    return () => { vivo = false }
  }, [dias])

  // si las estadísticas todavía no están disponibles, no se muestra nada (el panel sigue normal)
  if (falla) return null

  const maxClics = Math.max(1, ...(datos?.porLink || []).map(l => l.clics))
  const totalOrigen = Math.max(1, (datos?.origenes || []).reduce((a, o) => a + o.visitas, 0))
  const mejorDia = [...(datos?.porDia || [])].sort((a, b) => b.visitas - a.visitas)[0]
  const vacio = !cargando && datos && datos.visitas === 0 && datos.clics === 0

  return (
    <section className="ld-card ld-card-crema" aria-labelledby="est-titulo">
      <div className="est-cabeza">
        <div id="est-titulo" className="ld-card-title" style={{ marginBottom: 0 }}>Cómo le va a tu página</div>
        <div className="est-selector" role="group" aria-label="Período">
          {([7, 30] as const).map(d => (
            <button key={d} type="button" className={dias === d ? 'act' : ''} aria-pressed={dias === d} onClick={() => setDias(d)}>
              Últimos {d} días
            </button>
          ))}
        </div>
      </div>

      {cargando && !datos ? (
        <div className="est-vacio">Cargando tus números…</div>
      ) : vacio ? (
        <div className="est-vacio">Compartí tu link en tu bio y acá vas a ver cuánta gente lo visita.</div>
      ) : datos && (<>
        <div className="est-grandes">
          <div className="est-grande"><div className="est-num">{datos.visitas.toLocaleString('es-AR')}</div><div className="est-lbl">visitas</div></div>
          <div className="est-grande"><div className="est-num">{datos.clics.toLocaleString('es-AR')}</div><div className="est-lbl">clics en tus links</div></div>
        </div>

        {datos.porLink.length > 0 && (
          <div className="est-bloque">
            <div className="est-sub">Lo que más tocan</div>
            {datos.porLink.slice(0, 8).map((l, i) => (
              <div key={i} className="est-fila">
                <div className="est-fila-top"><span className="est-fila-nombre">{l.titulo || l.tipo}</span><span className="est-fila-num">{l.clics}</span></div>
                <div className="est-barra"><div style={{ width: `${Math.round((l.clics / maxClics) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        )}

        <div className="est-dos">
          {datos.origenes.length > 0 && (
            <div className="est-bloque">
              <div className="est-sub">De dónde vienen</div>
              {datos.origenes.map(o => (
                <div key={o.origen} className="est-origen">
                  <span>{ORIGENES[o.origen] || 'Otros'}</span>
                  <span className="est-fila-num">{Math.round((o.visitas / totalOrigen) * 100)}%</span>
                </div>
              ))}
            </div>
          )}
          {mejorDia && (
            <div className="est-bloque">
              <div className="est-sub">Tu mejor día</div>
              <div className="est-mejor">{DIAS[mejorDia.dia]}</div>
              <div className="est-mini">Buen día para publicar y compartir tu link.</div>
            </div>
          )}
        </div>

        {datos.clicsWhatsapp > 0 && (
          <div className="est-upsell">
            <div><strong>{datos.clicsWhatsapp} {datos.clicsWhatsapp === 1 ? 'persona tocó' : 'personas tocaron'} tu WhatsApp</strong> en los últimos {dias} días. Con Luma podrían reservar y pagarte solas, sin que tengas que contestar.</div>
            <a href="/pasar-a-luma">Pasá tu cuenta a Luma →</a>
          </div>
        )}
      </>)}
    </section>
  )
}
