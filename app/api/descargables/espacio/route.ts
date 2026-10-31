import { NextRequest, NextResponse } from 'next/server'
import { usuarioDelPedido } from '@/lib/sesionServidor'
import { espacioDe } from '@/lib/descargables'

// Cuánto espacio para descargables usa la terapeuta conectada (y cuánto tiene en total).
export async function POST(req: NextRequest) {
  const user = await usuarioDelPedido(req)
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })
  const e = await espacioDe(user.id)
  return NextResponse.json({ ok: true, usado: e.usado, total: e.total })
}
