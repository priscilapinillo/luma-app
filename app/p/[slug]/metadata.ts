import { createClient } from '@supabase/supabase-js'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const slugDecoded = decodeURIComponent(slug)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: perfil } = await supabase
    .from('therapist_profiles')
    .select('nombre_profesional, especialidad, bio, avatar_url, mensaje_bienvenida')
    .eq('slug', slugDecoded)
    .maybeSingle()

  if (!perfil) return { title: 'Luma' }

  const title = `${perfil.nombre_profesional} · Reservá tu sesión`
  const description = perfil.mensaje_bienvenida || perfil.bio || `Sesiones con ${perfil.nombre_profesional} — ${perfil.especialidad}`
  const image = perfil.avatar_url || 'https://lumaapp.lat/og-image.png'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: image, width: 800, height: 800 }],
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: [image],
    },
  }
}