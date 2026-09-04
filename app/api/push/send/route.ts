import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { userId, titulo, cuerpo } = await req.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: sub } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .maybeSingle()

    if (!sub) return NextResponse.json({ ok: false, reason: 'sin suscripción' })

    const subscription = JSON.parse(sub.subscription)
    await webpush.sendNotification(subscription, JSON.stringify({
      title: titulo,
      body: cuerpo,
      icon: '/favicon.ico',
    }))

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error enviando notificación:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}