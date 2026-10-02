import { NextRequest, NextResponse } from 'next/server'
import { servicio, esAdmin } from '@/lib/adminServidor'

const COLORES = ['#A78BFA', '#6EE7B7', '#FCD34D', '#93C5FD', '#F9A8D4', '#E8D5A3']

function limpiar(body: any) {
  const datos: Record<string, any> = {}
  if (body.titulo !== undefined) datos.titulo = String(body.titulo).trim().slice(0, 120)
  if (body.descripcion !== undefined) datos.descripcion = String(body.descripcion).trim().slice(0, 600)
  if (body.icono !== undefined) datos.icono = String(body.icono).trim().slice(0, 8) || '✨'
  if (body.etiqueta !== undefined) datos.etiqueta = String(body.etiqueta).trim().slice(0, 30) || 'Próximamente'
  if (body.color !== undefined) datos.color = COLORES.includes(body.color) ? body.color : '#A78BFA'
  if (body.visible !== undefined) datos.visible = !!body.visible
  if (body.orden !== undefined && Number.isFinite(Number(body.orden))) datos.orden = Math.round(Number(body.orden))
  return datos
}

// lista completa (incluye las ocultas) para el panel
export async function GET(req: NextRequest) {
  if (!(await esAdmin(req))) return NextResponse.json({ ok: false, motivo: 'no_autorizado' }, { status: 403 })
  const { data, error } = await servicio().from('proximas_actualizaciones').select('*').order('orden').order('created_at')
  if (error) return NextResponse.json({ ok: false, motivo: 'error_leyendo' }, { status: 500 })
  return NextResponse.json({ ok: true, proximas: data })
}

export async function POST(req: NextRequest) {
  if (!(await esAdmin(req))) return NextResponse.json({ ok: false, motivo: 'no_autorizado' }, { status: 403 })
  const datos = limpiar(await req.json())
  if (!datos.titulo) return NextResponse.json({ ok: false, motivo: 'falta_titulo' }, { status: 400 })
  const { data, error } = await servicio().from('proximas_actualizaciones').insert(datos).select().single()
  if (error) return NextResponse.json({ ok: false, motivo: 'error_guardando' }, { status: 500 })
  return NextResponse.json({ ok: true, proxima: data })
}

export async function PATCH(req: NextRequest) {
  if (!(await esAdmin(req))) return NextResponse.json({ ok: false, motivo: 'no_autorizado' }, { status: 403 })
  const body = await req.json()
  if (!body.id) return NextResponse.json({ ok: false, motivo: 'falta_id' }, { status: 400 })
  const datos = limpiar(body)
  if (datos.titulo === '') return NextResponse.json({ ok: false, motivo: 'falta_titulo' }, { status: 400 })
  const { data, error } = await servicio().from('proximas_actualizaciones').update(datos).eq('id', String(body.id)).select().single()
  if (error) return NextResponse.json({ ok: false, motivo: 'error_guardando' }, { status: 500 })
  return NextResponse.json({ ok: true, proxima: data })
}

export async function DELETE(req: NextRequest) {
  if (!(await esAdmin(req))) return NextResponse.json({ ok: false, motivo: 'no_autorizado' }, { status: 403 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ ok: false, motivo: 'falta_id' }, { status: 400 })
  const { error } = await servicio().from('proximas_actualizaciones').delete().eq('id', String(id))
  if (error) return NextResponse.json({ ok: false, motivo: 'error_borrando' }, { status: 500 })
  return NextResponse.json({ ok: true })
}