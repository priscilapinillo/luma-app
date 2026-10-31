import { NextRequest, NextResponse } from 'next/server'
import { esAdmin, servicio, ADMIN_EMAIL } from '@/lib/adminServidor'
import { resolverTransferencia } from '@/lib/pagosLuma'
import { cancelarCobroAutomatico } from '@/lib/planLuma'
import { detectarContenido } from '@/lib/contenido'

// Acciones del panel de Admin. Solo Priscila. Cada una es segura de repetir (doble toque no duplica nada).
export const maxDuration = 26
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  if (!(await esAdmin(req))) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 })
  try {
    const { accion, id, mb, url, titulo } = await req.json().catch(() => ({}))
    if (accion === 'video_bienvenida') {
      // el video del Inicio para todas las terapeutas (YouTube, Vimeo, Loom o Drive). Vacío = se saca.
      const u = String(url || '').trim().slice(0, 500)
      const t = String(titulo || '').trim().slice(0, 80) || 'Bienvenida a Luma'
      if (u) {
        const c = detectarContenido(u, 'video')
        if (!/^https:\/\//i.test(u) || !c || c.visor === 'link') return NextResponse.json({ ok: false, error: 'Ese link no es un video que se pueda mostrar (probá con YouTube).' }, { status: 400 })
      }
      const { error } = await servicio().from('luma_config').upsert({ clave: 'video_bienvenida', valor: u ? { url: u, titulo: t } : {}, updated_at: new Date().toISOString() })
      return NextResponse.json({ ok: !error, error: error ? 'No se pudo guardar.' : undefined }, { status: error ? 500 : 200 })
    }
    if (accion === 'espacio_extra') {
      // Priscila le da más espacio para descargables a una terapeuta puntual (0 a 2000 MB extra)
      if (!UUID.test(String(id))) return NextResponse.json({ ok: false, error: 'Falta la terapeuta.' }, { status: 400 })
      const extra = Math.round(Number(mb))
      if (!Number.isFinite(extra) || extra < 0 || extra > 2000) return NextResponse.json({ ok: false, error: 'Elegí entre 0 y 2000 MB extra.' }, { status: 400 })
      const { error } = await servicio().from('luma_espacio_extra').upsert({ user_id: String(id), mb: extra, updated_at: new Date().toISOString() })
      return NextResponse.json({ ok: !error, error: error ? 'No se pudo guardar.' : undefined }, { status: error ? 500 : 200 })
    }
    if (accion === 'confirmar_transferencia' || accion === 'rechazar_transferencia') {
      if (!UUID.test(String(id))) return NextResponse.json({ ok: false, error: 'Falta la transferencia.' }, { status: 400 })
      const r = await resolverTransferencia(String(id), accion === 'confirmar_transferencia' ? 'confirmar' : 'rechazar', ADMIN_EMAIL)
      return NextResponse.json(r, { status: r.ok ? 200 : 400 })
    }
    if (accion === 'cancelar_cobro') {
      if (!UUID.test(String(id))) return NextResponse.json({ ok: false, error: 'Falta la clienta.' }, { status: 400 })
      const r = await cancelarCobroAutomatico(String(id))
      return NextResponse.json(r, { status: r.ok ? 200 : 400 })
    }
    if (accion === 'resolver_alerta') {
      if (!UUID.test(String(id))) return NextResponse.json({ ok: false, error: 'Falta la alerta.' }, { status: 400 })
      const { error } = await servicio().from('luma_alertas').update({ resuelta: true }).eq('id', String(id))
      return NextResponse.json({ ok: !error })
    }
    if (accion === 'revisar_ahora') {
      // corre la guardia de las mañanas ahora mismo (la misma revisión, con la clave del servidor)
      const res = await fetch(new URL('/api/admin/control-diario', req.nextUrl.origin), { method: 'POST', headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` } })
      const r = await res.json().catch(() => ({}))
      return NextResponse.json({ ok: res.ok, ...r }, { status: res.ok ? 200 : 502 })
    }
    return NextResponse.json({ ok: false, error: 'Acción desconocida.' }, { status: 400 })
  } catch (e) {
    console.error('admin/accion:', e)
    return NextResponse.json({ ok: false, error: 'Hubo un error. Probá de nuevo.' }, { status: 500 })
  }
}
