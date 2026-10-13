import { NextRequest, NextResponse } from 'next/server'
import { enviarAviso } from '@/lib/push'

// Solo para uso interno del servidor de Luma (pide la clave secreta del servidor).
// Antes cualquiera podía mandarle avisos a cualquier terapeuta.
// Las páginas públicas ahora usan /api/push/aviso, que arma el aviso a partir de la reserva real.
export async function POST(req: NextRequest) {
  try {
    const clave = (req.headers.get('authorization') || '').replace('Bearer ', '')
    if (!clave || clave !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const { userId, titulo, cuerpo } = await req.json().catch(() => ({}))
    if (!userId || !titulo) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    const enviados = await enviarAviso(String(userId), String(titulo), String(cuerpo || ''))
    return NextResponse.json({ ok: enviados > 0, enviados })
  } catch (err) {
    console.error('Error enviando notificación:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}