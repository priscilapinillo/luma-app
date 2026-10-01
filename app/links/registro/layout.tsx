import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Link en bio gratis para tarotistas, terapeutas y astrólogas | Luma Links',
  description: 'Creá gratis tu página de links con la estética de tu trabajo: reservas, WhatsApp, redes y descargables en un solo lugar. Hecha para tarot, reiki, astrología y terapias holísticas.',
}

export default function LinksRegistroLayout({ children }: { children: ReactNode }) {
  return children
}