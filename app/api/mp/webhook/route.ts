import { NextRequest, NextResponse } from 'next/server'
import { mpLuma, revisarPlanLuma, duenaDePreapproval } from '@/lib/planLuma'

// Aviso de Mercado Pago sobre los planes de Luma (lo que pagan las terapeutas).
// El aviso solo dice "mirá esta suscripción": Luma le pregunta todo a Mercado Pago y revisa el plan completo
// (suscripción + cobros aprobados). Si el aviso llega dos veces, no pasa nada: cada cobro se anota una sola vez.
export const maxDuration = 26

async function revisarDuenaDe(preapprovalId: string) {
  const r = await mpLuma(`/preapproval/${encodeURIComponent(preapprovalId)}`)
  if (!r.ok || !r.data?.id) { console.error('Webhook: no se pudo leer el preapproval', preapprovalId, r.status); return }
  const duena = await duenaDePreapproval(r.data)
  if (!duena) { console.log('Webhook: el preapproval no es de un plan de Luma', preapprovalId); return }
  await revisarPlanLuma(duena.userId)
  console.log(`Webhook: revisado el plan de ${duena.userId} (preapproval ${preapprovalId} → ${r.data.status})`)
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
      await revisarDuenaDe(String(dataId))
    } else if (type === 'subscription_authorized_payment' || type === 'authorized_payment') {
      const r = await mpLuma(`/authorized_payments/${encodeURIComponent(String(dataId))}`)
      if (r.ok && r.data?.preapproval_id) await revisarDuenaDe(String(r.data.preapproval_id))
      else console.error('Webhook: no se pudo leer el cobro', dataId, r.status)
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
