import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('user_id')
    if (!userId) return NextResponse.redirect(new URL('/suscripcion?error=true', req.url))

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const ahora = new Date()
    const unMesDespues = new Date(ahora)
    unMesDespues.setMonth(unMesDespues.getMonth() + 1)

    await supabase.from('subscriptions')
      .update({
        status: 'active',
        current_period_ends_at: unMesDespues.toISOString(),
      })
      .eq('user_id', userId)

    return NextResponse.redirect(new URL('/dashboard?pago=ok', req.url))
  } catch (err) {
    console.error('Error subscription success:', err)
    return NextResponse.redirect(new URL('/suscripcion?error=true', req.url))
  }
}