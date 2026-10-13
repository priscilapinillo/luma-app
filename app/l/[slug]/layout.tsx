// Vista previa al compartir un link de Luma Links: muestra la foto, el nombre y la bio
// de esa persona. Nunca la imagen de Luma. No cambia cómo se ve la página.
import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'

type Props = { params: Promise<{ slug: string }> }

function recortar(texto: string, max: number) {
  const limpio = (texto || '').replace(/\s+/g, ' ').trim()
  return limpio.length > max ? limpio.slice(0, max - 1).trimEnd() + '…' : limpio
}

const SIN_DATOS: Metadata = {
  title: 'Mis links',
  openGraph: { siteName: 'Luma', title: 'Mis links', images: [] },
  twitter: { card: 'summary', title: 'Mis links', images: [] },
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { slug } = await params
    const slugLimpio = decodeURIComponent(slug)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: p } = await supabase
      .from('luma_links_profiles')
      .select('nombre, profesion, bio, foto_url')
      .eq('slug', slugLimpio)
      .maybeSingle()

    if (!p || !(p.nombre || '').trim()) return SIN_DATOS

    const nombre = String(p.nombre).trim()
    const titulo = p.profesion ? `${nombre} · ${String(p.profesion).trim()}` : nombre
    const descripcion = recortar(p.bio || p.profesion || `Los links de ${nombre}`, 160)
    const imagenes = p.foto_url ? [{ url: p.foto_url, alt: nombre }] : []

    return {
      title: titulo,
      description: descripcion,
      openGraph: {
        siteName: 'Luma',
        title: titulo,
        description: descripcion,
        url: `https://lumaapp.lat/l/${encodeURIComponent(slugLimpio)}`,
        type: 'profile',
        images: imagenes,
      },
      twitter: {
        card: 'summary',
        title: titulo,
        description: descripcion,
        images: imagenes.map(i => i.url),
      },
    }
  } catch {
    return SIN_DATOS
  }
}

export default function LinksLayout({ children }: { children: React.ReactNode }) {
  return children
}