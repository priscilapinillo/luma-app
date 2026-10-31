'use client'
// Archivos de pacientes (balde 'patient-files'): se muestran con links firmados que vencen, nunca con el link público.
// · En la base se sigue guardando el link de siempre (nada cambia en los datos): acá solo se "traduce" para mostrar.
// · Si todavía no se cerró el balde (antes del deploy) o firmar falla, se usa el link de siempre: nunca desaparece una nota.
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'

const MARCA = '/object/public/patient-files/'
const DURACION = 3600 // 1 hora

export function rutaDeArchivo(url: string | null | undefined): string | null {
  if (!url) return null
  const i = url.indexOf(MARCA)
  if (i < 0) return null
  try { return decodeURIComponent(url.slice(i + MARCA.length).split('?')[0]) } catch { return null }
}

const cache = new Map<string, { url: string; vence: number }>()

export async function firmarArchivos(urls: (string | null | undefined)[]): Promise<Record<string, string>> {
  const salida: Record<string, string> = {}
  const pedir: { original: string; ruta: string }[] = []
  const ahora = Date.now()
  for (const u of new Set(urls.filter(Boolean) as string[])) {
    const ruta = rutaDeArchivo(u)
    if (!ruta) continue
    const c = cache.get(u)
    if (c && c.vence > ahora + 60000) { salida[u] = c.url; continue }
    pedir.push({ original: u, ruta })
  }
  for (let i = 0; i < pedir.length; i += 50) {
    const tanda = pedir.slice(i, i + 50)
    try {
      const { data } = await createClient().storage.from('patient-files').createSignedUrls(tanda.map(t => t.ruta), DURACION)
      for (const t of tanda) {
        const f = (data || []).find((d: any) => d.path === t.ruta && d.signedUrl && !d.error)
        if (f?.signedUrl) {
          salida[t.original] = f.signedUrl
          cache.set(t.original, { url: f.signedUrl, vence: ahora + DURACION * 1000 })
        }
      }
    } catch { /* se usa el link de siempre */ }
  }
  return salida
}

// Devuelve una función ver(url) que da el link firmado (o el de siempre mientras tanto, o si no se puede firmar).
export function useArchivosFirmados(urls: (string | null | undefined)[]) {
  const clave = useMemo(() => [...new Set(urls.filter(Boolean) as string[])].sort().join('|'), [urls])
  const [mapa, setMapa] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!clave) return
    let vivo = true
    firmarArchivos(clave.split('|')).then(m => { if (vivo && Object.keys(m).length) setMapa(prev => ({ ...prev, ...m })) })
    // se renuevan antes de que venzan, por si la pantalla queda abierta mucho tiempo
    const t = setInterval(() => firmarArchivos(clave.split('|')).then(m => { if (vivo) setMapa(prev => ({ ...prev, ...m })) }), (DURACION - 300) * 1000)
    return () => { vivo = false; clearInterval(t) }
  }, [clave])
  return (u: string | null | undefined) => (u ? mapa[u] || u : '')
}
