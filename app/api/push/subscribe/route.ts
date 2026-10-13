import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Registra un dispositivo de la terapeuta para recibir avisos (puede tener varios: celular y compu).
// El usuario se toma de su sesión (nunca del dato que manda el navegador),
// así nadie puede anotarse para recibir los avisos de otra persona.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const subscription = body?.subscription
    const accessToken = (req.headers.get('authorization') || '').replace('Bearer ', '') || body?.accessToken
    const endpoint = subscription?.endpoint
    if (!subscription || !endpoint || !accessToken) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: { user }, error: errUser } = await supabase.auth.getUser(accessToken)
    if (errUser || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const fila = {
      user_id: user.id,
      subscription: JSON.stringify(subscription),
      endpoint: String(endpoint),
      updated_at: new Date().toISOString(),
    }
    // un registro por dispositivo
    let { error } = await supabase.from('push_subscriptions').upsert(fila, { onConflict: 'user_id,endpoint' })
    if (error && error.code === '23505') {
      // todavía rige la regla vieja de "un dispositivo por terapeuta": reemplazamos el que había
      ({ error } = await supabase.from('push_subscriptions').update(fila).eq('user_id', user.id))
    }
    if (error) {
      console.error('Error guardando suscripción:', error)
      return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error guardando suscripción:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}