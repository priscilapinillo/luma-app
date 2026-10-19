// Ayudas de Luma Links compartidas entre el panel y la página pública.

export const MENSAJE_WHATSAPP_DEFAULT = '¡Hola! Vengo de tu página y quiero hacer una consulta'

// Solo se aceptan direcciones seguras (web, mail, teléfono). Si escribió "instagram.com/..." se le agrega https://
export function urlSegura(url: string | undefined | null, tipo?: string): string {
  const u = String(url || '').trim()
  if (!u) return '#'
  // "@usuaria" en Instagram o TikTok → su perfil
  if (/^@[\w.]+$/.test(u)) {
    if (tipo === 'tiktok') return `https://www.tiktok.com/${u}`
    return `https://www.instagram.com/${u.slice(1)}`
  }
  if (/^(https?:|mailto:|tel:)/i.test(u)) return u
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return '#' // javascript:, data:, etc. → no
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u)) return `mailto:${u}`
  return `https://${u.replace(/^\/+/, '')}`
}

// Arma el link de WhatsApp con el mensaje ya escrito. Acepta un número suelto o un link wa.me / api.whatsapp.com.
export function urlWhatsapp(url: string | undefined | null, mensaje?: string | null): string {
  const u = String(url || '').trim()
  // si no eligió mensaje y su link ya traía uno (?text=...), se respeta el suyo
  let textoDelLink = ''
  try { textoDelLink = new URL(/^https?:/i.test(u) ? u : 'https://x/?' + u.split('?')[1]).searchParams.get('text') || '' } catch {}
  const texto = (mensaje ?? (textoDelLink || MENSAJE_WHATSAPP_DEFAULT)).trim()
  let numero = ''
  const wa = u.match(/wa\.me\/(\+?\d[\d\s-]*)/i)
  const api = u.match(/[?&]phone=(\+?\d[\d\s-]*)/i)
  if (wa) numero = wa[1]
  else if (api) numero = api[1]
  else if (/^\+?[\d\s()-]{6,}$/.test(u)) numero = u
  numero = numero.replace(/\D/g, '')
  if (!numero) {
    // no se pudo leer el número (por ejemplo, un link de grupo): se deja el link como está
    return urlSegura(u)
  }
  return `https://wa.me/${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`
}

// De dónde viene la visita: se reconoce por el navegador de cada app (más confiable que el "referrer").
export function origenDeVisita(): string {
  try {
    const ua = navigator.userAgent || ''
    if (/Instagram/i.test(ua)) return 'instagram'
    if (/musical_ly|TikTok|BytedanceWebview|trill/i.test(ua)) return 'tiktok'
    if (/FBAN|FBAV|FB_IAB|FBIOS|Messenger/i.test(ua)) return 'facebook'
    if (/WhatsApp/i.test(ua)) return 'whatsapp'
    const ref = document.referrer ? new URL(document.referrer).hostname : ''
    if (!ref) return 'directo'
    if (/instagram\./i.test(ref)) return 'instagram'
    if (/tiktok\./i.test(ref)) return 'tiktok'
    if (/facebook\.|fb\.|messenger\./i.test(ref)) return 'facebook'
    if (/whatsapp\.|wa\.me/i.test(ref)) return 'whatsapp'
    if (/google\./i.test(ref)) return 'google'
    return 'otro'
  } catch {
    return 'otro'
  }
}
