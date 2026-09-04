import "./globals.css";

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
  <script dangerouslySetInnerHTML={{__html: `
    try {
      const theme = localStorage.getItem('luma-theme');
      if (theme === 'dark') document.documentElement.classList.add('dark');
    } catch(e) {}
  `}}/>
</head>
<body>
        {children}
        <script dangerouslySetInnerHTML={{__html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js')
                .catch(function(err) { console.log('SW error:', err) })
            })
          }
        `}}/>
      </body>
    </html>
  );
}