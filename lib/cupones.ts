// Cupones de descuento (solo servidor). El descuento lo calcula SIEMPRE el servidor, nunca el navegador.
// Reglas (ver claude/diseno-etapa-4.md):
//  · El cupón se busca siempre dentro de la terapeuta de esa página: un código de otra nunca sirve.
//  · Solo porcentaje, del 5% al 90%. En pesos se redondea al peso; en dólares, a los centavos.
//  · Con Básico: un cupón (el más nuevo activo) y solo para sesiones. Sin plan: ninguno.
//  · Al empezar a pagar se RESERVA un uso (la base lo cuenta con candado) y se confirma con el pago.
import { createHash } from 'crypto'
import { db } from '@/lib/planLuma'
import { nivelServidor } from '@/lib/planServidor'

export type Objeto = { tipo: 'curso' | 'sesion'; id: string; terapeutaId: string }
export type Cupon = {
  id: string; terapeuta_id: string; codigo: string; porcentaje: number
  cursos: string[] | null; servicios: string[] | null
  vence_el: string | null; usos_max: number | null; una_por_persona: boolean
  meses: 'primero' | 'todos'; activo: boolean; archivado: boolean; created_at: string
}
export type Motivo = 'no_disponible' | 'no_es_aca' | 'no_es_para_esto' | 'ya_usado' | 'agotado' | 'muchos_intentos' | 'ya_confirmado' | 'precio_bajo'

export const normalizarCodigo = (c: unknown) =>
  String(c ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20)

export function precioConDescuento(precio: number, porcentaje: number, moneda: 'ARS' | 'USD' = 'ARS'): number {
  const p = Number(precio) || 0
  const pct = Math.min(90, Math.max(0, Math.round(Number(porcentaje) || 0)))
  const final = p * (100 - pct) / 100
  return moneda === 'USD' ? Math.round(final * 100) / 100 : Math.round(final)
}

export function mensajeCupon(m: Motivo | string, tipo: 'curso' | 'sesion' = 'curso'): string {
  switch (m) {
    case 'no_es_aca': return 'Este cupón no es válido acá.'
    case 'no_es_para_esto': return tipo === 'sesion' ? 'Este cupón no es para este servicio.' : 'Este cupón no es para este curso.'
    case 'ya_usado': return 'Ya usaste este cupón.'
    case 'muchos_intentos': return 'Esperá unos minutos para probar otro cupón.'
    case 'ya_confirmado': return 'Esta compra ya está pagada.'
    case 'precio_bajo': return 'Con este descuento el precio queda por debajo del mínimo de Mercado Pago. Probá con transferencia.'
    default: return 'Este cupón ya no está disponible.'
  }
}

// Fecha de hoy en Argentina (los cupones vencen a las 23:59 de ese día, hora de Argentina)
export function hoyArgentina(ahora = Date.now()): string {
  return new Date(ahora - 3 * 3600000).toISOString().slice(0, 10)
}
export const vencido = (c: Pick<Cupon, 'vence_el'>, ahora = Date.now()) => !!c.vence_el && String(c.vence_el).slice(0, 10) < hoyArgentina(ahora)

// ── contra adivinar códigos: hasta 10 intentos cada 10 minutos por persona ──
export function huellaDe(headers: Headers): string {
  const ip = (headers.get('x-nf-client-connection-ip') || headers.get('x-forwarded-for') || '').split(',')[0].trim()
  const ua = headers.get('user-agent') || ''
  return createHash('sha256').update(ip + '|' + ua).digest('hex').slice(0, 32)
}
export async function demasiadosIntentos(huella: string): Promise<boolean> {
  const s = db()
  const desde = new Date(Date.now() - 10 * 60000).toISOString()
  const { count } = await s.from('cupon_intentos').select('id', { count: 'exact', head: true }).eq('huella', huella).gte('created_at', desde)
  if ((count || 0) >= 10) return true
  await s.from('cupon_intentos').insert({ huella })
  return false
}

// ── reglas ──
// ¿Este cupón sirve para esto? (sin contar usos todavía)
export function aplicable(c: Cupon, obj: Objeto, nivel: string, elMasNuevoActivo: boolean, ahora = Date.now()): Motivo | null {
  if (c.terapeuta_id !== obj.terapeutaId) return 'no_es_aca'
  if (!c.activo || c.archivado || vencido(c, ahora)) return 'no_disponible'
  if (nivel === 'sin_acceso') return 'no_disponible'
  if (nivel === 'basico' && (obj.tipo !== 'sesion' || !elMasNuevoActivo)) return 'no_disponible'
  const cursos = (c.cursos || []).map(String)
  const servicios = (c.servicios || []).map(String)
  const elegidos = cursos.length > 0 || servicios.length > 0
  if (elegidos) {
    const lista = obj.tipo === 'curso' ? cursos : servicios
    if (!lista.includes(String(obj.id))) return 'no_es_para_esto'
  }
  return null
}

export async function buscarCupon(terapeutaId: string, codigo: string): Promise<Cupon | null> {
  const cod = normalizarCodigo(codigo)
  if (cod.length < 3) return null
  const { data } = await db().from('cupones').select('*').eq('terapeuta_id', terapeutaId).eq('codigo', cod).eq('archivado', false).maybeSingle()
  return (data as Cupon) || null
}

async function esElMasNuevoActivo(c: Cupon): Promise<boolean> {
  const { data } = await db().from('cupones').select('id').eq('terapeuta_id', c.terapeuta_id).eq('activo', true).eq('archivado', false)
    .order('created_at', { ascending: false }).limit(1)
  return !!data?.[0] && data[0].id === c.id
}

// ¿Quedan usos? (confirmados + reservas vigentes, sin contar esta misma compra)
async function quedanUsos(c: Cupon, quien: string | null, objetoId: string | null): Promise<Motivo | null> {
  const s = db()
  const ahora = new Date().toISOString()
  const { data: usos } = await s.from('cupon_usos').select('id, objeto_id, quien, estado, expira_at').eq('cupon_id', c.id).neq('estado', 'liberado')
  const vivos = (usos || []).filter((u: any) => u.objeto_id !== objetoId && (u.estado === 'confirmado' || (u.estado === 'reservado' && u.expira_at > ahora)))
  if (c.una_por_persona && quien && vivos.some((u: any) => u.quien === quien)) return 'ya_usado'
  if (c.usos_max && vivos.length >= c.usos_max) return 'agotado'
  return null
}

export type Revision = { ok: true; cupon: Cupon; porcentaje: number } | { ok: false; motivo: Motivo; mensaje: string }

// Revisa un código para mostrar el precio con descuento (sin reservar). `quien` puede ser null si todavía no se sabe.
export async function revisarCupon(codigo: string, obj: Objeto, quien: string | null, objetoId: string | null = null): Promise<Revision> {
  const c = await buscarCupon(obj.terapeutaId, codigo)
  if (!c) return { ok: false, motivo: 'no_es_aca', mensaje: mensajeCupon('no_es_aca', obj.tipo) }
  const nivel = await nivelServidor(obj.terapeutaId)
  const nuevo = nivel === 'basico' ? await esElMasNuevoActivo(c) : true
  const m = aplicable(c, obj, nivel, nuevo) || await quedanUsos(c, quien, objetoId)
  if (m) return { ok: false, motivo: m, mensaje: mensajeCupon(m, obj.tipo) }
  return { ok: true, cupon: c, porcentaje: c.porcentaje }
}

// Reserva el uso en la base (con candado). horas: cuánto dura la reserva si no se paga.
export async function reservarUso(c: Cupon, tipo: 'curso' | 'sesion', objetoId: string, quien: string,
  original: number, final: number, moneda: 'ARS' | 'USD', horas: number): Promise<{ ok: true; uso: string } | { ok: false; motivo: Motivo; mensaje: string }> {
  const { data, error } = await db().rpc('luma_reservar_cupon', {
    p_cupon: c.id, p_tipo: tipo, p_objeto: objetoId, p_quien: quien,
    p_original: original, p_final: final, p_moneda: moneda, p_horas: horas,
  })
  if (error || !data) {
    console.error('reservarUso:', error)
    return { ok: false, motivo: 'no_disponible', mensaje: 'No pudimos aplicar el cupón. Probá de nuevo en un momento.' }
  }
  const r = data as any
  if (!r.ok) return { ok: false, motivo: r.motivo, mensaje: mensajeCupon(r.motivo, tipo) }
  return { ok: true, uso: String(r.uso) }
}

export async function liberarUso(usoId: string | null | undefined) {
  if (!usoId) return
  try { await db().rpc('luma_liberar_cupon', { p_uso: usoId }) } catch (e) { console.error('liberarUso:', e) }
}
