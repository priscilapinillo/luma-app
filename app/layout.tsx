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
        <script dangerouslySetInnerHTML={{__html: `
          try {
            const theme = localStorage.getItem('luma-theme');
            if (theme === 'dark') document.documentElement.classList.add('dark');
          } catch(e) {}
        `}}/>
      </head>
      <body>{children}</body>
    </html>
  );
}