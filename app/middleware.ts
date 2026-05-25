import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Rutas públicas — no requieren auth
  const publicPaths = ['/auth/login', '/auth/register', '/p/', '/politica-de-privacidad']
  const isPublic = publicPaths.some(p => req.nextUrl.pathname.startsWith(p))

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  if (user && !isPublic) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status, trial_ends_at, current_period_ends_at')
      .eq('user_id', user.id)
      .maybeSingle()

    const ahora = new Date()
    const trialVencido = sub?.trial_ends_at && new Date(sub.trial_ends_at) < ahora
    const pagoActivo = sub?.status === 'active' && sub?.current_period_ends_at && new Date(sub.current_period_ends_at) > ahora

    const necesitaPagar = trialVencido && !pagoActivo
    const esPaginaSuscripcion = req.nextUrl.pathname === '/suscripcion'

    if (necesitaPagar && !esPaginaSuscripcion) {
      return NextResponse.redirect(new URL('/suscripcion', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
