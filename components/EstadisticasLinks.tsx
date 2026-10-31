'use client'

// Estadísticas de Luma Links: visitas, clics por link, de dónde viene la gente y el mejor día.
// Los números salen de una función segura de Supabase que solo devuelve los de la dueña de la sesión.
// Diseño Blue Hour (29/10): fila de números como los widgets del Inicio de Luma.
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
  instagram: 'Instagram', tiktok: 'TikTok', facebook: 'Facebook', whatsapp: 'WhatsApp', google: 'Google', directo: 'Directo', otro: 'Otros',
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

  const porLink = datos?.porLink || []
  const maxClics = Math.max(1, ...porLink.map(l => l.clics))
  const totalOrigen = Math.max(1, (datos?.origenes || []).reduce((a, o) => a + o.visitas, 0))
  const origenes = [...(datos?.origenes || [])].sort((a, b) => b.visitas - a.visitas).slice(0, 3)
  const mejorDia = [...(datos?.porDia || [])].sort((a, b) => b.visitas - a.visitas)[0]
  const masTocado = [...porLink].sort((a, b) => b.clics - a.clics)[0]
  const vacio = !cargando && datos && datos.visitas === 0 && datos.clics === 0
  const n = (x: number) => x.toLocaleString('es-AR')

  return (
    <section className="lk-est" aria-labelledby="est-titulo">
      <div className="lk-sec-cabeza">
        <h2 id="est-titulo" className="lk-h2">Cómo le va a tu página</h2>
        <div className="lk-seg" role="group" aria-label="Período">
          {([7, 30] as const).map(d => (
            <button key={d} type="button" className={dias === d ? 'act' : ''} aria-pressed={dias === d} onClick={() => setDias(d)}>
              {d} días
            </button>
          ))}
        </div>
      </div>

      {cargando && !datos ? (
        <div className="lk-est-grilla" aria-busy="true">
          {[0, 1, 2, 3].map(i => <div key={i} className="lk-est-w lk-cargando" />)}
        </div>
      ) : vacio ? (
        <div className="lk-est-vacio">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></svg>
          <span>Compartí tu link en tu bio y acá vas a ver cuánta gente lo visita y qué toca.</span>
        </div>
      ) : datos && (<>
        <div className="lk-est-grilla">
          <div className="lk-est-w rosa">
            <span className="lk-est-blob" aria-hidden="true" />
            <span className="lk-est-t">VISITAS · {dias} DÍAS</span>
            <span className="lk-est-n">{n(datos.visitas)}</span>
            <span className="lk-est-d">personas entraron a tu página</span>
          </div>
          <div className="lk-est-w azul">
            <span className="lk-est-blob" aria-hidden="true" />
            <span className="lk-est-t">CLICS EN TUS LINKS</span>
            <span className="lk-est-n">{n(datos.clics)}</span>
            <span className="lk-est-d">{masTocado && masTocado.clics > 0 ? `El más tocado: ${masTocado.titulo || masTocado.tipo}` : 'Todavía nadie tocó un link'}</span>
          </div>
          <div className="lk-est-w lavanda">
            <span className="lk-est-t">TU MEJOR DÍA</span>
            <span className="lk-est-dia">{mejorDia && mejorDia.visitas > 0 ? DIAS[mejorDia.dia] : '—'}</span>
            <span className="lk-est-d">{mejorDia && mejorDia.visitas > 0 ? 'Buen día para publicar' : 'Falta un poco de movimiento'}</span>
          </div>
          <div className="lk-est-w blanco">
            <span className="lk-est-t">DE DÓNDE VIENEN</span>
            {origenes.length === 0 ? <span className="lk-est-d">Sin datos todavía</span> : origenes.map(o => {
              const p = Math.round((o.visitas / totalOrigen) * 100)
              return (
                <div key={o.origen} className="lk-est-orig">
                  <span>{ORIGENES[o.origen] || 'Otros'}</span>
                  <span className="lk-est-bar"><span style={{ width: `${p}%` }} /></span>
                  <b>{p}%</b>
                </div>
              )
            })}
          </div>
        </div>

        {porLink.length > 0 && (
          <div className="lk-card lk-est-lista">
            <h3 className="lk-h3">Lo que más tocan</h3>
            {porLink.slice(0, 8).map((l, i) => (
              <div key={i} className="lk-est-fila">
                <div className="lk-est-fila-top"><span>{l.titulo || l.tipo}</span><b>{l.clics}</b></div>
                <div className="lk-est-bar ancha"><span style={{ width: `${Math.round((l.clics / maxClics) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        )}

        {datos.clicsWhatsapp > 0 && (
          <div className="lk-est-upsell">
            <div><strong>{datos.clicsWhatsapp} {datos.clicsWhatsapp === 1 ? 'persona tocó' : 'personas tocaron'} tu WhatsApp</strong> en los últimos {dias} días. Con Luma podrían reservar y pagarte solas, sin que tengas que contestar.</div>
            <a href="/pasar-a-luma">Pasá tu cuenta a Luma</a>
          </div>
        )}
      </>)}
    </section>
  )
}
