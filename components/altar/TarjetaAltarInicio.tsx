'use client'
// Tarjeta del Altar en el Inicio: lo que hay para publicar hoy (del planner) o «Anotá tu primera idea».
// Solo lee; no cambia nada. Si algo falla, no aparece (el Inicio sigue igual).
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { fechaLocal, FORMATOS, vencida, type ItemPlanner } from '@/lib/altar'

export default function TarjetaAltarInicio({ variante }: { variante?: 'grande' } = {}) {
  const [estado, setEstado] = useState<null | { vacio: true } | { hoy: (ItemPlanner & { pizarra: string })[]; vencidas: number; idPlanner: string | null; ultima: { id: string; nombre: string } }>(null)

  useEffect(() => {
    (async () => {
      try {
        const s = createClient()
        const { data, error } = await s.from('pizarras').select('id, nombre, plantilla, datos').is('borrada_en', null).order('updated_at', { ascending: false }).limit(10)
        if (error) return
        if (!data?.length) { setEstado({ vacio: true }); return }
        const hoy = fechaLocal()
        const items: (ItemPlanner & { pizarra: string })[] = []
        let vencidas = 0; let idPlanner: string | null = null
        for (const p of data) {
          if (p.plantilla !== 'planner') continue
          idPlanner = idPlanner || p.id
          for (const i of (Array.isArray((p.datos as any)?.items) ? (p.datos as any).items : []) as ItemPlanner[]) {
            if (i.fecha === hoy && i.estado !== 'publicado') items.push({ ...i, pizarra: p.id })
            if (vencida(i, hoy)) vencidas++
          }
        }
        items.sort((a, b) => (a.hora || '99').localeCompare(b.hora || '99'))
        setEstado({ hoy: items, vencidas, idPlanner, ultima: { id: data[0].id, nombre: data[0].nombre } })
      } catch {}
    })()
  }, [])

  if (!estado) return null
  if (variante === 'grande') return <AltarGrande estado={estado}/>
  const caja: React.CSSProperties = { display: 'block', textDecoration: 'none', color: 'var(--text-primary)', background: 'linear-gradient(135deg, rgba(98,107,145,.10), rgba(169,155,184,.16))', border: '0.5px solid var(--border)', borderRadius: 20, padding: '12px 14px', flexShrink: 0 }
  const titulo = <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--accent-2)', marginBottom: 6 }}><Sparkles size={12}/> Altar de ideas</div>

  if ('vacio' in estado) return (
    <Link href="/altar" style={caja}>
      {titulo}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>Anotá tu primera idea para tus redes</span>
        <ChevronRight size={16} color="var(--accent-2)"/>
      </div>
    </Link>
  )
  const destino = estado.idPlanner ? `/altar/${estado.idPlanner}` : `/altar/${estado.ultima.id}`
  return (
    <Link href={destino} style={caja}>
      {titulo}
      {estado.hoy.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {estado.hoy.slice(0, 3).map(i => {
            const f = FORMATOS.find(x => x.id === i.formato) || FORMATOS[3]
            return (
              <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, minWidth: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: f.fondo, color: f.texto, flexShrink: 0 }}>{f.nombre}</span>
                {i.hora && <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{i.hora}</span>}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.titulo}</span>
              </div>
            )
          })}
          {estado.hoy.length > 3 && <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>y {estado.hoy.length - 3} más</div>}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{estado.idPlanner ? 'Hoy no tenés nada para publicar' : `Seguí con «${estado.ultima.nombre}»`}</span>
          <ChevronRight size={16} color="var(--accent-2)"/>
        </div>
      )}
      {estado.vencidas > 0 && <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--vencido)', marginTop: 6 }}>{estado.vencidas === 1 ? '1 pieza se pasó de fecha' : `${estado.vencidas} piezas se pasaron de fecha`}</div>}
    </Link>
  )
}

// Inicio nuevo (rediseño 28/10): tarjeta oscura «Hoy en tu planner», con lugar fijo aunque no haya nada para hoy
type EstadoAltar = { vacio: true } | { hoy: (ItemPlanner & { pizarra: string })[]; vencidas: number; idPlanner: string | null; ultima: { id: string; nombre: string } }
function AltarGrande({ estado }: { estado: EstadoAltar }) {
  const caja: React.CSSProperties = { background: 'var(--menu-oscuro)', color: '#F0E6D8', borderRadius: 22, padding: 18, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }
  const etq = <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, letterSpacing: '1.4px', fontWeight: 700, textTransform: 'uppercase', color: '#C9C0D9' }}><Sparkles size={12}/> Altar de ideas</div>
  const titulo = (txt: string) => <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontSize: 24, lineHeight: 1.1 }}>{txt}</div>
  const boton = (href: string, txt: string) => <Link href={href} style={{ alignSelf: 'flex-end', padding: '10px 16px', borderRadius: 20, background: '#F0E6D8', color: '#27344A', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>{txt}</Link>
  if ('vacio' in estado) return (
    <section style={caja} aria-label="Altar de ideas">
      {etq}
      {titulo('Tu lugar para las ideas')}
      <div style={{ fontSize: 13.5, color: '#DCD3E6', lineHeight: 1.45 }}>Anotá lo que se te ocurre para tus redes y armá tu semana de publicaciones.</div>
      {boton('/altar', 'Anotar mi primera idea')}
    </section>
  )
  const destino = estado.idPlanner ? `/altar/${estado.idPlanner}` : `/altar/${estado.ultima.id}`
  return (
    <section style={caja} aria-label="Altar de ideas">
      {etq}
      {titulo(estado.idPlanner ? 'Hoy en tu planner' : `Seguí con «${estado.ultima.nombre}»`)}
      {estado.hoy.length > 0 ? estado.hoy.slice(0, 3).map(i => {
        const f = FORMATOS.find(x => x.id === i.formato) || FORMATOS[3]
        return (
          <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FFFCF7', color: '#27344A', borderRadius: 14, padding: '10px 12px', minWidth: 0 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: f.texto, flexShrink: 0 }}/>
            <span style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.titulo}</span>
            <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 8px', borderRadius: 20, background: f.fondo, color: f.texto, flexShrink: 0 }}>{i.hora ? `${i.hora} · ` : ''}{f.nombre}</span>
          </div>
        )
      }) : estado.idPlanner ? <div style={{ fontSize: 13.5, color: '#DCD3E6' }}>Hoy no tenés nada para publicar.</div> : null}
      {estado.hoy.length > 3 && <div style={{ fontSize: 12, color: '#C9C0D9' }}>y {estado.hoy.length - 3} más</div>}
      {estado.vencidas > 0 && <div style={{ fontSize: 12, fontWeight: 600, color: '#F09A92' }}>{estado.vencidas === 1 ? '1 pieza se pasó de fecha' : `${estado.vencidas} piezas se pasaron de fecha`}</div>}
      {boton(destino, 'Abrir el altar')}
    </section>
  )
}
