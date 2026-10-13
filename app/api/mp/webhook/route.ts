import { NextRequest, NextResponse } from 'next/server'
import { mpLuma, aplicarPreapproval, duenaDePreapproval } from '@/lib/planLuma'

// Aviso de Mercado Pago sobre los planes de Luma (lo que pagan las terapeutas).
// Solo cambia el plan con lo que Mercado Pago confirma al consultarlo directamente.
async function actualizarDesdePreapproval(preapprovalId: string) {
  const r = await mpLuma(`/preapproval/${encodeURIComponent(preapprovalId)}`)
  if (!r.ok || !r.data?.id) { console.error('Webhook: no se pudo leer el preapproval', preapprovalId, r.status); return }
  const preapproval = r.data

  // "pending" = abrió el pago pero todavía no lo autorizó: no se toca nada
  if (!['authorized', 'cancelled', 'paused'].includes(preapproval.status)) {
    console.log(`Webhook: preapproval ${preapprovalId} en estado ${preapproval.status}, no cambia nada`)
    return
  }

  // de quién es: por la referencia vieja ("userId:plan") o por el plan que preparó Luma
  const duena = await duenaDePreapproval(preapproval)
  if (!duena) { console.error('Webhook: no se sabe de quién es el preapproval', preapprovalId); return }

  await aplicarPreapproval(duena.userId, duena.plan, preapproval)
  console.log(`Webhook: user ${duena.userId} → ${preapproval.status}, plan=${duena.plan}`)
}

function validarFirma(req: NextRequest, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) {
    console.warn('Webhook: MP_WEBHOOK_SECRET no configurada, se salta la validación (inseguro)')
    return true
  }
  const signatureHeader = req.headers.get('x-signature')
  const requestId = req.headers.get('x-request-id')
  if (!signatureHeader) return false

  const partes = Object.fromEntries(
    signatureHeader.split(',').map(p => {
      const [k, v] = p.split('=')
      return [k?.trim(), v?.trim()]
    })
  )
  const ts = partes.ts
  const hash = partes.v1
  if (!ts || !hash) return false

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
  const crypto = require('crypto')
  const hashCalculado = crypto.createHmac('sha256', secret).update(manifest).digest('hex')

  return hashCalculado === hash
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const params = req.nextUrl.searchParams

    const type = body.type || params.get('type') || params.get('topic')
    const dataId = body.data?.id || params.get('id') || params.get('data.id')

    if (!type || !dataId) {
      console.warn('Webhook: notificación sin type/id reconocible, la ignoro')
      return NextResponse.json({ recibido: true })
    }

    if (!validarFirma(req, dataId)) {
      console.error('Webhook: firma inválida, se rechaza la notificación')
      return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
    }

    if (type === 'preapproval' || type === 'subscription_preapproval') {
      await actualizarDesdePreapproval(dataId)
    } else if (type === 'subscription_authorized_payment' || type === 'authorized_payment') {
      const res = await fetch(`https://api.mercadopago.com/authorized_payments/${dataId}`, {
        headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` },
      })
      const pago = await res.json()
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
