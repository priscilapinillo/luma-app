import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Para la página pública de reservas: qué horarios están ocupados y qué días ya llegaron al máximo.
// Cuenta igual que el servidor cuando reserva (mismos datos, mismas reglas), así la página nunca ofrece
// un horario o un día que después se rechaza al final. No devuelve nombres ni datos de nadie: solo fecha, hora y duración.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export async function GET(req: NextRequest) {
  const vacio = { ocupados: [], diasCompletos: [], maxDia: 0 }
  try {
    const t = String(req.nextUrl.searchParams.get('t') || '')
    if (!UUID.test(t)) return NextResponse.json(vacio, { status: 400 })
    const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: perfil } = await s.from('therapist_profiles').select('user_id, pagina_activa').eq('user_id', t).maybeSingle()
    if (!perfil || !perfil.pagina_activa) return NextResponse.json(vacio)

    // máximo por día (si la columna no existe todavía, no hay límite)
    const { data: lim, error: errLim } = await s.from('therapist_profiles').select('max_sesiones_dia').eq('user_id', t).maybeSingle()
    const maxDia = !errLim && Number((lim as any)?.max_sesiones_dia) > 0 ? Math.floor(Number((lim as any).max_sesiones_dia)) : 0

    const desde = new Date(Date.now() - 2 * 86400000), hasta = new Date(Date.now() + 120 * 86400000)
    const { data: filas, error } = await s.from('sessions').select('fecha, hora, duracion, estado_sesion, tipo_servicio')
      .eq('user_id', t).gte('fecha', ymd(desde) + 'T00:00:00').lte('fecha', ymd(hasta) + 'T23:59:59')
    if (error) return NextResponse.json(vacio, { status: 503 })

    const vivas = (filas || []).filter((x: any) => x.estado_sesion !== 'cancelada' && x.tipo_servicio !== 'entrega')
    const ocupados = vivas.map((x: any) => ({ fecha: String(x.fecha || '').slice(0, 10), hora: String(x.hora || String(x.fecha || '').slice(11, 16) || ''), duracion: Number(x.duracion) || 60 }))
      .filter(o => o.fecha && o.hora && o.hora !== '00:00')
    const porDia: Record<string, number> = {}
    for (const x of vivas) { const f = String((x as any).fecha || '').slice(0, 10); if (f) porDia[f] = (porDia[f] || 0) + 1 }
    const diasCompletos = maxDia > 0 ? Object.keys(porDia).filter(f => porDia[f] >= maxDia).sort() : []
    return NextResponse.json({ ocupados, diasCompletos, maxDia }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('agenda-publica:', e)
    return NextResponse.json(vacio, { status: 500 })
  }
}
