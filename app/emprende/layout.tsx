import './emprende.css'
import type { Metadata, Viewport } from 'next'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FFE27A',
}

// Lo que se ve al compartir el link (WhatsApp, Instagram). No nombra los bonos: dependen del momento de compra.
export const metadata: Metadata = {
  title: 'Postres en vaso, emprendé desde casa | Luma Emprende',
  description: 'Recetario con más de 30 recetas en vasito, herramientas y tips, planilla de costos y guías para vender. Aula online, acceso de por vida.',
  openGraph: {
    type: 'website',
    siteName: 'Luma Emprende',
    title: 'Postres en vaso, emprendé desde casa | Luma Emprende',
    description: 'Recetario con más de 30 recetas en vasito, planilla de costos y guías para vender. Se abre desde el celu.',
    url: 'https://lumaapp.lat/emprende',
    images: [{ url: 'https://lumaapp.lat/landing/emprende/og-v1.jpg', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image', images: ['https://lumaapp.lat/landing/emprende/og-v1.jpg'] },
}

export default function EmprendeLayout({ children }: { children: React.ReactNode }) {
  return <div className="em">{children}</div>
}
