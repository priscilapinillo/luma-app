import { NextRequest, NextResponse } from 'next/server'
import { servicio, esAdmin } from '@/lib/adminServidor'
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    if (!(await esAdmin(req))) return NextResponse.json({ ok: false, motivo: 'no_autorizado' }, { status: 403 })

    const body = await req.json()
    const titulo = String(body.titulo || '').trim().slice(0, 120)
    const descripcion = String(body.descripcion || '').trim().slice(0, 1500)
    const tipo = ['nuevo', 'mejora', 'arreglo'].includes(body.tipo) ? body.tipo : 'nuevo'
    const imagen_url = body.imagen_url ? String(body.imagen_url).trim().slice(0, 500) : null
    let link_url: string | null = body.link_url ? String(body.link_url).trim().slice(0, 500) : null
    // solo links internos de Luma (ej: /finances) o https
    if (link_url && !link_url.startsWith('/') && !/^https:\/\//i.test(link_url)) link_url = 'https://' + link_url
    if (!titulo) return NextResponse.json({ ok: false, motivo: 'falta_titulo' }, { status: 400 })

    const sb = servicio()
    const { data: novedad, error } = await sb.from('novedades')
      .insert({ titulo, descripcion, tipo, imagen_url, link_url })
      .select().single()
    if (error || !novedad) {
      console.error('Error guardando novedad:', error)
      return NextResponse.json({ ok: false, motivo: 'error_guardando' }, { status: 500 })
    }

    // notificación a todas las que tienen las notificaciones activadas
    let enviadas = 0
    let fallidas = 0
    if (body.notificar !== false) {
      const { data: subs } = await sb.from('push_subscriptions').select('user_id, subscription')
      const payload = JSON.stringify({
        title: '✦ Novedad en Luma',
        body: titulo,
        icon: '/favicon.ico',
        url: '/roadmap',
      })
      const lista = subs || []
      for (let i = 0; i < lista.length; i += 20) {
        await Promise.allSettled(lista.slice(i, i + 20).map(async (s: any) => {
          try {
            const sub = typeof s.subscription === 'string' ? JSON.parse(s.subscription) : s.subscription
            await webpush.sendNotification(sub, payload)
            enviadas++
          } catch (e: any) {
            fallidas++
            // suscripción vencida (el celular la dio de baja): la limpiamos
            if (e?.statusCode === 404 || e?.statusCode === 410) {
              await sb.from('push_subscriptions').delete().eq('user_id', s.user_id)
            }
          }
        }))
      }
    }

    return NextResponse.json({ ok: true, novedad, enviadas, fallidas })
  } catch (err) {
    console.error('Error publicando novedad:', err)
    return NextResponse.json({ ok: false, motivo: 'error_interno' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!(await esAdmin(req))) return NextResponse.json({ ok: false, motivo: 'no_autorizado' }, { status: 403 })
    const { id } = await req.json()
    if (!id) return NextResponse.json({ ok: false, motivo: 'falta_id' }, { status: 400 })
    const { error } = await servicio().from('novedades').delete().eq('id', String(id))
    if (error) return NextResponse.json({ ok: false, motivo: 'error_borrando' }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error borrando novedad:', err)
    return NextResponse.json({ ok: false, motivo: 'error_interno' }, { status: 500 })
  }
}