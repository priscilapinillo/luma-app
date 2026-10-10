// Guarda de dónde llegó la persona (anuncio, Instagram, otra web) para saber
// después qué trajo cada registro. Se guarda en su navegador por 30 días.
const CLAVE = 'luma-origen'
const DIAS = 30

export type Origen = {
  source: string
  medium?: string
  campaign?: string
  content?: string
  landing?: string
  fecha: string
}

export function guardarOrigen() {
  try {
    const p = new URLSearchParams(window.location.search)
    const source = p.get('utm_source')
    const campaign = p.get('utm_campaign')
    if (source || campaign) {
      const o: Origen = {
        source: source || 'desconocido',
        medium: p.get('utm_medium') || undefined,
        campaign: campaign || undefined,
        content: p.get('utm_content') || undefined,
        landing: window.location.pathname,
        fecha: new Date().toISOString(),
      }
      localStorage.setItem(CLAVE, JSON.stringify(o))
      return
    }
    // sin UTM: solo se anota si llegó desde otra web y no había nada guardado
    if (!leerOrigen() && document.referrer) {
      const host = new URL(document.referrer).hostname
      if (host && host !== window.location.hostname) {
        localStorage.setItem(CLAVE, JSON.stringify({
          source: host, medium: 'referral', landing: window.location.pathname, fecha: new Date().toISOString(),
        }))
      }
    }
  } catch {}
}

export function leerOrigen(): Origen | null {
  try {
    const r = localStorage.getItem(CLAVE)
    if (!r) return null
    const o = JSON.parse(r) as Origen
    if (Date.now() - new Date(o.fecha).getTime() > DIAS * 86400000) {
      localStorage.removeItem(CLAVE)
      return null
    }
    return o
  } catch { return null }
}