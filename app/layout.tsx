import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
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