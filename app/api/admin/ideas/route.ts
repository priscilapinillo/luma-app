import { NextRequest, NextResponse } from 'next/server'
import { servicio, esAdmin } from '@/lib/adminServidor'

// las ideas que mandan las terapeutas desde Novedades (solo las ve la administradora)
export async function GET(req: NextRequest) {
  if (!(await esAdmin(req))) return NextResponse.json({ ok: false, motivo: 'no_autorizado' }, { status: 403 })
  const { data, error } = await servicio().from('sugerencias').select('*').order('created_at', { ascending: false }).limit(200)
  if (error) return NextResponse.json({ ok: false, motivo: 'error_leyendo' }, { status: 500 })
  return NextResponse.json({ ok: true, ideas: data })
}

export async function DELETE(req: NextRequest) {
  if (!(await esAdmin(req))) return NextResponse.json({ ok: false, motivo: 'no_autorizado' }, { status: 403 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ ok: false, motivo: 'falta_id' }, { status: 400 })
  const { error } = await servicio().from('sugerencias').delete().eq('id', id)
  if (error) return NextResponse.json({ ok: false, motivo: 'error_borrando' }, { status: 500 })
  return NextResponse.json({ ok: true })
}