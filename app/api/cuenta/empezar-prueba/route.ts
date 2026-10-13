import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/planLuma'

// Le da a una cuenta su prueba gratis de terapeuta (7 días). La usan:
// - el registro de terapeuta (recién creada la cuenta)
// - "Pasar mi cuenta a Luma" desde Luma Links (misma cuenta, mismo email)
// - el inicio de sesión, cuando una cuenta quedó a medio crear
// Reglas (las controla el servidor, no el navegador):
// - solo una vez por cuenta: si ya tiene plan (aunque esté vencido), no se le da otra prueba
// - las cuentas de alumna no se convierten (para eso se usa otro email, como en el registro)
type Link = { tipo?: string; titulo?: string; url?: string; descripcion?: string }

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ ok: false, error: 'Iniciá sesión de nuevo.' }, { status: 401 })
    const s = db()
    const { data: { user }, error: errorUser } = await s.auth.getUser(authHeader.replace('Bearer ', ''))
    if (errorUser || !user) return NextResponse.json({ ok: false, error: 'Iniciá sesión de nuevo.' }, { status: 401 })

    const { data: sub } = await s.from('subscriptions').select('user_id').eq('user_id', user.id).maybeSingle()
    if (sub) return NextResponse.json({ ok: true, yaTenia: true })

    const { data: persona } = await s.from('persons').select('id').eq('auth_user_id', user.id).maybeSingle()
    if (persona) {
      return NextResponse.json({ ok: false, error: 'Este email está registrado como alumna en Luma. Para tener una cuenta de terapeuta, registrate con un email distinto.' }, { status: 400 })
    }

    // 1) la prueba gratis
    const vence = new Date(Date.now() + 7 * 86400000).toISOString()
    const { error: errSub } = await s.from('subscriptions').insert({ user_id: user.id, status: 'trial', plan: 'basico', trial_ends_at: vence })
    if (errSub && errSub.code !== '23505') { // 23505 = ya tenía (dos toques a la vez)
      console.error('empezar-prueba: no se pudo crear la prueba', errSub)
      return NextResponse.json({ ok: false, error: 'No pudimos activar tu prueba. Probá de nuevo en unos minutos.' }, { status: 500 })
    }

    // 2) si venía de Luma Links: se pasan sus datos a su perfil de terapeuta y se cierra Luma Links
    const { data: links } = await s.from('luma_links_profiles').select('*').eq('auth_user_id', user.id).maybeSingle()
    if (links) {
      const { data: perfil } = await s.from('therapist_profiles').select('id').eq('user_id', user.id).maybeSingle()
      if (!perfil) {
        const misLinks: Link[] = Array.isArray(links.links) ? links.links : []
        const { error: errPerfil } = await s.from('therapist_profiles').insert({
          user_id: user.id,
          nombre_profesional: links.nombre || null,
          especialidad: links.profesion || null,
          bio: links.bio || null,
          avatar_url: links.foto_url || null,
          template: links.template || 'luna',
          links: misLinks
            .filter(l => l && l.url)
            .map(l => ({ tipo: l.tipo || 'otro', titulo: l.titulo || '', url: l.url || '', descripcion: '' })),
        })
        if (errPerfil) {
          // la prueba ya quedó activa; si el perfil no se pudo copiar, NO se borra Luma Links (no se pierde nada)
          console.error('empezar-prueba: no se pudo copiar el perfil de Links', errPerfil)
          return NextResponse.json({ ok: true, linksSinCopiar: true })
        }
      }
      const { error: errBorrar } = await s.from('luma_links_profiles').delete().eq('auth_user_id', user.id)
      if (errBorrar) console.error('empezar-prueba: no se pudo cerrar Luma Links', errBorrar)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error empezar-prueba:', err)
    return NextResponse.json({ ok: false, error: 'No pudimos activar tu prueba. Probá de nuevo en unos minutos.' }, { status: 500 })
  }
}
