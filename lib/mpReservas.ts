// Lógica compartida para confirmar pagos de reservas con Mercado Pago.
// La usan /api/mp/confirmar-pago-reserva (cuando la clienta vuelve a la página)
// y /api/mp/webhook-reserva (cuando Mercado Pago avisa por detrás, aunque la clienta haya cerrado la pestaña).
import { createClient } from '@supabase/supabase-js'

export function supabaseServicio() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// El token vive en la tabla privada mp_credenciales (nadie de afuera puede leerla).
// Mientras dure la mudanza, si no está ahí se usa el de therapist_profiles.
export async function tokenMPDeTerapeuta(userId: string): Promise<string | null> {
  if (!userId) return null
  const supabase = supabaseServicio()
  const { data: cred } = await supabase
    .from('mp_credenciales').select('access_token')
    .eq('user_id', userId).maybeSingle()
  const nuevo = (cred?.access_token || '').trim()
  if (nuevo) return nuevo
  const { data } = await supabase
    .from('therapist_profiles').select('mp_access_token')
    .eq('user_id', userId).maybeSingle()
  const viejo = (data?.mp_access_token || '').trim()
  return viejo || null
}

export type ResultadoConfirmacion = { ok: boolean; motivo?: string; status: number }

// Solo marca "pagado" si Mercado Pago confirma que el pago existe, está aprobado,
// es de este turno y el monto alcanza. Si ya estaba pagado, no hace nada (no duplica).
export async function confirmarPagoReserva(sessionId: string, paymentId: string): Promise<ResultadoConfirmacion> {
  if (!sessionId || !paymentId) return { ok: false, motivo: 'faltan_datos', status: 400 }
  const supabase = supabaseServicio()

  const { data: sesion } = await supabase
    .from('sessions').select('id, user_id, precio, estado_pago, estado_sesion')
    .eq('id', sessionId).maybeSingle()
  if (!sesion) return { ok: false, motivo: 'sesion_no_existe', status: 404 }
  if (sesion.estado_pago === 'pagado') return { ok: true, status: 200 }

  const token = await tokenMPDeTerapeuta(sesion.user_id)
  if (!token) return { ok: false, motivo: 'mp_no_configurado', status: 400 }

  const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(paymentId))}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) return { ok: false, motivo: 'pago_no_encontrado', status: 400 }
  const pago = await res.json()

  const aprobado = pago.status === 'approved'
  const esDeEstaSesion = String(pago.external_reference) === String(sesion.id)
  const montoOk = Number(pago.transaction_amount) >= Number(sesion.precio || 0)
  if (!aprobado || !esDeEstaSesion || !montoOk) {
    console.warn('Pago de reserva no válido:', { sessionId, paymentId, status: pago.status, esDeEstaSesion, montoOk })
    return { ok: false, motivo: 'pago_no_valido', status: 400 }
  }

  if (sesion.estado_sesion === 'cancelada') {
    // El pago entró igual: se marca pagado para que la terapeuta lo vea y lo resuelva con la clienta.
    console.warn('Pago aprobado para un turno cancelado:', { sessionId, paymentId })
  }

  const { error } = await supabase.from('sessions').update({ estado_pago: 'pagado' }).eq('id', sesion.id)
  if (error) {
    console.error('Error marcando turno como pagado:', error)
    return { ok: false, motivo: 'error_guardando', status: 500 }
  }
  await supabase.from('public_bookings').update({ estado: 'confirmada' }).eq('session_id', sesion.id)
  return { ok: true, status: 200 }
}