import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function sumarUnMes(fecha: Date) {
  const nueva = new Date(fecha)
  nueva.setMonth(nueva.getMonth() + 1)
  return nueva
}

async function actualizarDesdePreapproval(preapprovalId: string) {
  const res = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` },
  })
  const preapproval = await res.json()
  console.log('DEBUG webhook — preapproval completo:', JSON.stringify(preapproval))

  const [userId, plan] = (preapproval.external_reference || '').split(':')
  if (!userId) { console.error('Webhook: preapproval sin external_reference válido'); return }

  let status = 'past_due'
  let periodoVence: Date | null = null

  if (preapproval.status === 'authorized') {
    status = 'active'
    periodoVence = preapproval.next_payment_date ? new Date(preapproval.next_payment_date) : sumarUnMes(new Date())
  } else if (preapproval.status === 'cancelled') {
    status = 'cancelled'
  } else if (preapproval.status === 'paused') {
    status = 'past_due'
  }

  const { error } = await supabase.from('subscriptions').update({
    status,
    plan: plan || undefined,
    mp_subscription_id: preapprovalId,
    current_period_ends_at: periodoVence ? periodoVence.toISOString() : undefined,
  }).eq('user_id', userId)

  if (error) console.error('Webhook: error actualizando subscriptions:', error)
  else console.log(`Webhook: subscriptions actualizada para user ${userId} → status=${status}, plan=${plan}`)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const params = req.nextUrl.searchParams
    console.log('DEBUG webhook — body recibido:', JSON.stringify(body))
    console.log('DEBUG webhook — query params:', Object.fromEntries(params))

    const type = body.type || params.get('type') || params.get('topic')
    const dataId = body.data?.id || params.get('id') || params.get('data.id')

    if (!type || !dataId) {
      console.warn('Webhook: notificación sin type/id reconocible, la ignoro')
      return NextResponse.json({ recibido: true })
    }

    if (type === 'preapproval' || type === 'subscription_preapproval') {
      await actualizarDesdePreapproval(dataId)
    } else if (type === 'subscription_authorized_payment' || type === 'authorized_payment') {
      const res = await fetch(`https://api.mercadopago.com/authorized_payments/${dataId}`, {
        headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` },
      })
      const pago = await res.json()
      console.log('DEBUG webhook — authorized_payment completo:', JSON.stringify(pago))
      if (pago.preapproval_id) await actualizarDesdePreapproval(pago.preapproval_id)
    } else {
      console.log(`Webhook: tipo de notificación no manejado todavía: ${type}`)
    }

    return NextResponse.json({ recibido: true })
  } catch (err) {
    console.error('Webhook: error inesperado:', err)
    return NextResponse.json({ recibido: true })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true })
}