// Vista previa al compartir el link de una terapeuta (WhatsApp, Instagram, Facebook):
// muestra SU foto, SU nombre y SU frase o bio. Nunca la imagen de Luma.
// No cambia nada de cómo se ve la página: solo la tarjetita del link compartido.
import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'

type Props = { params: Promise<{ slug: string }> }

function recortar(texto: string, max: number) {
  const limpio = (texto || '').replace(/\s+/g, ' ').trim()
  return limpio.length > max ? limpio.slice(0, max - 1).trimEnd() + '…' : limpio
}

const SIN_DATOS: Metadata = {
  title: 'Página de reservas',
  openGraph: { siteName: 'Luma', title: 'Página de reservas', images: [] },
  twitter: { card: 'summary', title: 'Página de reservas', images: [] },
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { slug } = await params
    const slugLimpio = decodeURIComponent(slug)
    // clave pública: solo se leen datos públicos (nunca tokens ni datos de cobro)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: p } = await supabase
      .from('therapist_profiles')
      .select('nombre_profesional, especialidad, bio, mensaje_bienvenida, avatar_url')
      .eq('slug', slugLimpio)
      .maybeSingle()

    if (!p || !(p.nombre_profesional || '').trim()) return SIN_DATOS

    const nombre = String(p.nombre_profesional).trim()
    const titulo = `${nombre} · Reservá tu sesión`
    const descripcion = recortar(p.mensaje_bienvenida || p.bio || p.especialidad || `Reservá tu sesión con ${nombre}`, 160)
    const imagenes = p.avatar_url ? [{ url: p.avatar_url, alt: nombre }] : []

    return {
      title: titulo,
      description: descripcion,
      openGraph: {
        siteName: 'Luma',
        title: titulo,
        description: descripcion,
        url: `https://lumaapp.lat/p/${encodeURIComponent(slugLimpio)}`,
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

export default function PaginaTerapeutaLayout({ children }: { children: React.ReactNode }) {
  return children
}