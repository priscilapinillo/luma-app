import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MINUTOS_PAGO = 30          // el link de pago vence a los 30 min
const MINUTOS_REINTENTO = 25     // después de 25 min ya no se puede reintentar ese turno

function fechaMP(d: Date) {
  // formato que pide Mercado Pago: 2026-10-08T17:00:00.000+00:00
  return d.toISOString().replace('Z', '+00:00')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    if (body?.reservaId) return await preferenciaReserva(req, body, supabase)
    return await preferenciaLegacy(body, supabase)
  } catch (err) {
    console.error('Error MP:', err)
    return NextResponse.json({ error: 'Error interno', motivo: 'error_interno' }, { status: 500 })
  }
}

// ─── Reservas de la página pública ─────────────────────────────────────────────
// El precio, el nombre y los links de vuelta se arman acá con datos de la base,
// no con lo que manda el navegador.
async function preferenciaReserva(req: NextRequest, body: any, supabase: any) {
  const { reservaId, serviceId, therapistId, reemplazaId } = body
  if (!UUID.test(String(reservaId)) || !serviceId || !therapistId) {
    return NextResponse.json({ motivo: 'faltan_datos' }, { status: 400 })
  }

  const [perfilR, servR, sesionR] = await Promise.all([
    supabase.from('therapist_profiles').select('slug, mp_activo, mp_access_token').eq('user_id', therapistId).maybeSingle(),
    supabase.from('services').select('id, nombre, precio_base, user_id').eq('id', serviceId).maybeSingle(),
    supabase.from('sessions').select('id, user_id, service_id, estado_pago, estado_sesion, created_at').eq('id', reservaId).maybeSingle(),
  ])
  if (sesionR.error) {
    console.error('create-preference: error leyendo el turno', sesionR.error)
    return NextResponse.json({ motivo: 'error_interno' }, { status: 500 })
  }
  const perfil = perfilR.data
  const serv = servR.data
  const sesion = sesionR.data
  const token = (perfil?.mp_access_token || '').trim()

  if (!perfil?.mp_activo || !token) {
    return NextResponse.json({ motivo: 'mp_no_configurado' }, { status: 400 })
  }
  if (!serv || serv.user_id !== therapistId || !(Number(serv.precio_base) > 0)) {
    return NextResponse.json({ motivo: 'servicio_invalido' }, { status: 400 })
  }

  // si el turno ya existe (reintento), se valida antes de volver a cobrar
  let inicio = new Date()
  if (sesion) {
    if (sesion.user_id !== therapistId || String(sesion.service_id) !== String(serviceId)) {
      return NextResponse.json({ motivo: 'reserva_invalida' }, { status: 400 })
    }
    if (sesion.estado_pago === 'pagado') return NextResponse.json({ ya_pagado: true, existe: true })
    if (sesion.estado_sesion === 'cancelada') return NextResponse.json({ motivo: 'reserva_vencida' }, { status: 400 })
    if (sesion.created_at) {
      inicio = new Date(sesion.created_at)
      if (Date.now() - inicio.getTime() > MINUTOS_REINTENTO * 60000) {
        return NextResponse.json({ motivo: 'reserva_vencida' }, { status: 400 })
      }
    }
  }

  const origin = req.headers.get('origin') || new URL(req.url).origin
  const pagina = `${origin}/p/${encodeURIComponent(perfil.slug || '')}`
  const vence = new Date(inicio.getTime() + MINUTOS_PAGO * 60000)

  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [{ title: serv.nombre, quantity: 1, currency_id: 'ARS', unit_price: Number(serv.precio_base) }],
      back_urls: {
        success: `${pagina}?status=approved&session_id=${reservaId}`,
        failure: `${pagina}?status=failure&session_id=${reservaId}`,
        pending: `${pagina}?status=failure&session_id=${reservaId}`,
      },
      auto_return: 'approved',
      external_reference: String(reservaId),
      binary_mode: true,
      expires: true,
      expiration_date_from: fechaMP(new Date(Date.now() - 60000)),
      expiration_date_to: fechaMP(vence),
      ...(origin.startsWith('https://') ? { notification_url: `${origin}/api/mp/webhook-reserva?session_id=${reservaId}` } : {}),
    }),
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const tokenMalo = response.status === 401 || response.status === 403
    console.error('create-preference (reserva): Mercado Pago rechazó', response.status, data?.message)
    if (tokenMalo) {
      // aviso a la terapeuta para que revise su token (si falla el aviso, no importa)
      fetch(`${origin}/api/push/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: therapistId,
          titulo: '⚠️ Mercado Pago no está funcionando',
          cuerpo: 'Una clienta quiso pagarte y Mercado Pago rechazó tu token. Revisalo en Ajustes → Mercado Pago.',
        }),
      }).catch(() => {})
    }
    return NextResponse.json({ motivo: tokenMalo ? 'token_invalido' : 'error_mp' }, { status: 400 })
  }

  // Si la misma clienta tenía otro turno sin pagar (eligió otro horario), se cancela ese turno viejo.
  // Solo turnos de esta terapeuta, con Mercado Pago, sin pagar y creados en las últimas 2 horas.
  if (reemplazaId && UUID.test(String(reemplazaId)) && reemplazaId !== reservaId) {
    const { error: errCancel } = await supabase.from('sessions')
      .update({ estado_sesion: 'cancelada' })
      .eq('id', reemplazaId)
      .eq('user_id', therapistId)
      .eq('metodo_pago', 'mercadopago')
      .eq('estado_pago', 'pendiente')
      .gte('created_at', new Date(Date.now() - 2 * 3600000).toISOString())
    if (errCancel) console.warn('create-preference: no se pudo cancelar el turno anterior', errCancel)
  }

  return NextResponse.json({ init_point: data.init_point, id: data.id, existe: !!sesion })
}

// ─── Cursos (sin cambios: mismo comportamiento que antes) ─────────────────────
async function preferenciaLegacy(body: any, supabase: any) {
  const { servicioNombre, monto, therapistId, successUrl, failureUrl, externalReference } = body

  const { data: perfil } = await supabase
    .from('therapist_profiles')
    .select('mp_access_token, mp_activo')
    .eq('user_id', therapistId)
    .single()

  if (!perfil?.mp_activo || !perfil?.mp_access_token) {
    return NextResponse.json({ error: 'MP no configurado' }, { status: 400 })
  }

  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${perfil.mp_access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [{
        title: servicioNombre,
        quantity: 1,
        currency_id: 'ARS',
        unit_price: monto,
      }],
      back_urls: {
        success: successUrl,
        failure: failureUrl,
        pending: failureUrl,
      },
      payment_methods: {
        excluded_payment_types: [],
      },
      auto_return: 'approved',
      ...(externalReference ? { external_reference: String(externalReference) } : {}),
      binary_mode: true,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    return NextResponse.json({ error: data.message || 'Error MP' }, { status: 400 })
  }

  return NextResponse.json({ init_point: data.init_point, id: data.id })
}