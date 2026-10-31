import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // solo sirve mientras se prueba en la compu: deja que el celu (en el mismo wifi) abra el localhost. No cambia nada en la página en vivo.
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*'],
};

export default nextConfig;
