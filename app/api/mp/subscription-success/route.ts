import { NextRequest, NextResponse } from 'next/server'

// Esta ruta antes activaba el plan de cualquiera que la abriera con ?user_id=...
// (sin comprobar ningún pago). Ahora solo redirige: el plan lo activa únicamente
// el aviso de Mercado Pago (/api/mp/webhook) o la verificación en vivo.
export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL('/dashboard?pago=ok', req.url))
}