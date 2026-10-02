import "./globals.css";
import type { Viewport } from "next";
import Script from "next/script";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
  <title>Luma — Tu trabajo, en orden</title>
  <meta name="description" content="Agenda, historial, cobros y finanzas para terapeutas y profesionales del bienestar"/>
  <meta name="google-site-verification" content="N1lasbNh0oCGL_I5CnUXt9CEod8MmmRjzqTC3eWmkmg" />
  <meta name="mobile-web-app-capable" content="yes"/>
  <meta name="apple-mobile-web-app-capable" content="yes"/>
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
  <meta name="apple-mobile-web-app-title" content="Luma"/>
  <meta name="theme-color" content="#8B5CF6"/>
  <link rel="manifest" href="/manifest.json"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin=""/>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Geist:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800&family=Jost:wght@300;400;500;600&family=Manrope:wght@400;500;600;700;800;900&family=Montserrat:wght@400;500;600;700;800;900&family=Syne:wght@400;600;700;800&display=swap"/>
  </head>
  <body>
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{__html: `
          try {
            const theme = localStorage.getItem('luma-theme');
            if (theme === 'dark') document.documentElement.classList.add('dark');
          } catch(e) {}
        `}}/>
        {children}
        <script dangerouslySetInnerHTML={{__html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
                .catch(function(err) { console.log('SW error:', err) })
              function limpiarGlobito() {
                if (document.visibilityState === 'visible' && navigator.clearAppBadge) {
                  navigator.clearAppBadge().catch(function() {})
                }
              }
              limpiarGlobito()
              document.addEventListener('visibilitychange', limpiarGlobito)
            })
          }
        `}}/>
      </body>
    </html>
  );
}