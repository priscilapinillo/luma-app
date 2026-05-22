import { createClient } from '@/lib/supabase'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const slugDecoded = decodeURIComponent(slug).replace(/-/g, ' ')

  const supabase = createClient()
  const { data: perfil } = await supabase
    .from('therapist_profiles')
    .select('nombre_profesional, especialidad, bio, avatar_url, mensaje_bienvenida')
    .ilike('nombre_profesional', slugDecoded)
    .single()

  if (!perfil) return { title: 'Luma' }

  const title = `${perfil.nombre_profesional} · Reservá tu sesión`
  const description = perfil.mensaje_bienvenida || perfil.bio || `Sesiones con ${perfil.nombre_profesional} — ${perfil.especialidad}`
  const image = perfil.avatar_url || 'https://luma-app-terapeutas-holisticos.netlify.app/og-default.jpg'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: image, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}