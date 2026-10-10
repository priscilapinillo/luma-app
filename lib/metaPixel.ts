// Píxel de Meta: SOLO para páginas públicas de Luma (landing, registro y planes).
// Nunca se carga dentro de la app ni en las páginas de las terapeutas.
export const META_PIXEL_ID = '1812648106729304'

declare global {
  interface Window { fbq?: any; _fbq?: any }
}

export function cargarPixel() {
  if (typeof window === 'undefined' || window.fbq) return
  const n: any = function (...args: any[]) {
    if (n.callMethod) n.callMethod.apply(n, args)
    else n.queue.push(args)
  }
  window.fbq = n
  if (!window._fbq) window._fbq = n
  n.push = n
  n.loaded = true
  n.version = '2.0'
  n.queue = []
  // no registrar la navegación interna: si la persona entra a la app, Meta no ve esas páginas
  n.disablePushState = true
  const s = document.createElement('script')
  s.async = true
  s.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(s)
  // que Meta no lea botones ni textos por su cuenta: solo los eventos que mandamos nosotras
  window.fbq('set', 'autoConfig', false, META_PIXEL_ID)
  window.fbq('init', META_PIXEL_ID)
}

export function eventoMeta(nombre: string, datos?: Record<string, string | number>) {
  try {
    cargarPixel()
    window.fbq?.('track', nombre, datos || {})
  } catch {}
}