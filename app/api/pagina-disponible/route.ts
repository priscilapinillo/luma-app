import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calcularAcceso, pareceDesactualizado } from '@/lib/acceso'

// ¿La página de reservas de esta terapeuta puede tomar reservas?
// No, si se le venció la prueba o el plan (no puede ver las reservas que le lleguen).
// Ante cualquier duda (sin datos, error, pago que quizás no se registró) responde que SÍ:
// nunca cortamos reservas por un error nuestro.
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const si = NextResponse.json({ disponible: true }, { headers: { 'Cache-Control': 'no-store' } })
  try {
    const slug = (req.nextUrl.searchParams.get('slug') || '').trim()
    if (!slug) return si
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: perfil } = await supabase
      .from('therapist_profiles').select('user_id').eq('slug', slug).maybeSingle()
    if (!perfil?.user_id) return si
    const { data: sub } = await supabase
      .from('subscriptions').select('status, trial_ends_at, current_period_ends_at, plan, mp_subscription_id')
      .eq('user_id', perfil.user_id).maybeSingle()
    if (!sub) return si
    if (calcularAcceso(sub) !== 'sin_acceso') return si
    if (pareceDesactualizado(sub)) return si
    return NextResponse.json({ disponible: false }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('pagina-disponible:', e)
    return si
  }
}