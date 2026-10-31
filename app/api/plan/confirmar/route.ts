import { NextRequest, NextResponse } from 'next/server'
import { usuarioDelPedido, muyPronto } from '@/lib/sesionServidor'
import { revisarPagoUnico } from '@/lib/pagosLuma'
import { db } from '@/lib/planLuma'

// La pantalla "Confirmando" pregunta por su pago único. Solo puede confirmar pagos de SU cuenta.
export const maxDuration = 26
export async function POST(req: NextRequest) {
  try {
    const user = await usuarioDelPedido(req)
    if (!user) return NextResponse.json({ listo: false, motivo: 'sin_sesion' }, { status: 401 })
    const { paymentId, intento } = await req.json().catch(() => ({}))
    if (paymentId && /^\d{5,20}$/.test(String(paymentId)) && !muyPronto(`confirmar:${user.id}`, 4000)) {
      await revisarPagoUnico(String(paymentId), user.id)
    }
    if (intento && /^[0-9a-f-]{36}$/i.test(String(intento))) {
      const { data } = await db().from('luma_intentos').select('estado, user_id').eq('id', String(intento)).maybeSingle()
      if (data && data.user_id === user.id) return NextResponse.json({ listo: data.estado === 'aprobado', estado: data.estado })
    }
    return NextResponse.json({ listo: false })
  } catch (e) {
    console.error('plan/confirmar:', e)
    return NextResponse.json({ listo: false, motivo: 'error' }, { status: 500 })
  }
}
