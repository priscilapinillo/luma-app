// Luma — service worker: notificaciones, globito en el ícono y aviso sin conexión

const PAGINA_SIN_CONEXION = '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sin conexión · Luma</title></head><body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#1A1025;color:#F0E8D5;font-family:system-ui,sans-serif;text-align:center;padding:24px"><div><div style="font-size:40px;color:#C4A8FF">✦</div><h1 style="font-size:20px;margin:12px 0 8px">Estás sin conexión</h1><p style="color:#B8A9C9;font-size:15px;line-height:1.6;margin:0 0 20px">Revisá tu internet. Cuando vuelva, tocá Reintentar.</p><button onclick="location.reload()" style="padding:12px 22px;border-radius:50px;border:0;background:#8B5CF6;color:#fff;font-weight:700;font-size:14px;cursor:pointer">Reintentar</button></div></body></html>'

// La versión nueva de este archivo se activa sola, sin esperar a que cierren todas las pestañas
self.addEventListener('install', function () {
  self.skipWaiting()
})

self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    // Pide la página en paralelo mientras el service worker se despierta (abre más rápido)
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable() } catch (e) {}
    }
    await self.clients.claim()
  })())
})

// Solo interviene al abrir páginas: si no hay internet muestra un aviso lindo.
// Todo lo demás (imágenes, datos, pagos) va directo, como si no existiera.
self.addEventListener('fetch', function (event) {
  if (event.request.mode !== 'navigate') return
  event.respondWith((async function () {
    try {
      const adelantada = await event.preloadResponse
      if (adelantada) return adelantada
      return await fetch(event.request)
    } catch (e) {
      return new Response(PAGINA_SIN_CONEXION, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }
  })())
})

// Solo deja ir a páginas de Luma; cualquier otra cosa va al inicio
function urlSegura(url) {
  try {
    const u = new URL(url || '/dashboard', self.location.origin)
    if (u.origin !== self.location.origin) return '/dashboard'
    return u.pathname + u.search + u.hash
  } catch (e) {
    return '/dashboard'
  }
}

// Pone el número en el ícono (solo si la app no está abierta en pantalla)
async function actualizarGlobito() {
  if (!self.navigator || !self.navigator.setAppBadge) return
  try {
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    if (ventanas.some(function (v) { return v.visibilityState === 'visible' })) return
    const abiertas = await self.registration.getNotifications()
    await self.navigator.setAppBadge(abiertas.length || 1)
  } catch (e) {
    try { await self.navigator.setAppBadge() } catch (e2) {}
  }
}

// Si ya no queda ninguna notificación pendiente, borra el globito
async function bajarGlobito() {
  if (!self.navigator || !self.navigator.clearAppBadge) return
  try {
    const abiertas = await self.registration.getNotifications()
    if (abiertas.length === 0) await self.navigator.clearAppBadge()
  } catch (e) {}
}

self.addEventListener('push', function (event) {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Luma', {
      body: data.body || '',
      icon: data.icon || '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: urlSegura(data.url) },
    }).then(actualizarGlobito)
  )
})

self.addEventListener('notificationclose', function (event) {
  event.waitUntil(bajarGlobito())
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  const destino = urlSegura(event.notification.data && event.notification.data.url)
  event.waitUntil((async function () {
    await bajarGlobito()
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    // Si ya tiene esa página abierta, la trae al frente (no pierde nada de lo que estaba escribiendo)
    for (const v of ventanas) {
      try {
        const u = new URL(v.url)
        if (u.origin === self.location.origin && u.pathname === destino.split(/[?#]/)[0] && 'focus' in v) {
          return v.focus()
        }
      } catch (e) {}
    }
    // Si no, abre la página en una ventana nueva (nunca pisa una página donde esté escribiendo)
    const nueva = await self.clients.openWindow(destino)
    if (!nueva && ventanas[0] && 'focus' in ventanas[0]) return ventanas[0].focus()
    return nueva
  })())
})