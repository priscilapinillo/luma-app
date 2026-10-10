'use client'

import { useEffect } from 'react'
import { cargarPixel, eventoMeta } from '@/lib/metaPixel'
import { guardarOrigen } from '@/lib/origen'

// Ponelo solo en páginas públicas (landing, registro, planes).
// medirClicsRegistro: cuenta como "Lead" los clics en los botones de registrarse.
export default function MetaPixel({ medirClicsRegistro = false }: { medirClicsRegistro?: boolean }) {
  useEffect(() => {
    guardarOrigen()
    cargarPixel()
    eventoMeta('PageView')
    if (!medirClicsRegistro) return
    function alClic(e: MouseEvent) {
      const a = (e.target as HTMLElement | null)?.closest?.('a') as HTMLAnchorElement | null
      if (!a) return
      const href = a.getAttribute('href') || ''
      if (href.includes('/auth/register')) eventoMeta('Lead', { content_name: 'Luma' })
      else if (href.includes('/links/registro')) eventoMeta('Lead', { content_name: 'Luma Links' })
    }
    document.addEventListener('click', alClic, true)
    return () => document.removeEventListener('click', alClic, true)
  }, [medirClicsRegistro])
  return null
}