import { NextRequest, NextResponse } from 'next/server'
import { esAdmin, servicio } from '@/lib/adminServidor'
import { estadoPlan } from '@/lib/acceso'

// Todo lo que muestra el panel de Admin, en un solo pedido. Solo Priscila (se verifica con su sesión en el servidor).
// Cada bloque va por separado: si una tabla todavía no existe o falla, el resto del panel se ve igual.
export const maxDuration = 26
const PRECIO_MES: Record<string, number> = { basico: 9900, premium: 28000 }

export async function GET(req: NextRequest) {
  if (!(await esAdmin(req))) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const s = servicio()
  const ahora = Date.now()
  const hace = (h: number) => new Date(ahora - h * 3600000).toISOString()
  const r: Record<string, any> = { generado: new Date().toISOString() }
  const intentar = async (nombre: string, fn: () => Promise<void>) => { try { await fn() } catch (e: any) { console.error('admin/panel', nombre, e); (r.fallas ||= []).push(nombre) } }

  // cuentas (auth) — nombres y emails
  const usuarios: { id: string; email: string; nombre: string; creada: string; ultimoIngreso: string | null }[] = []
  await intentar('usuarios', async () => {
    for (let pagina = 1; pagina <= 25; pagina++) {
      const { data } = await s.auth.admin.listUsers({ page: pagina, perPage: 200 })
      const lista = data?.users || []
      for (const u of lista) usuarios.push({ id: u.id, email: u.email || '', nombre: String((u.user_metadata as any)?.full_name || '').trim(), creada: u.created_at, ultimoIngreso: u.last_sign_in_at || null })
      if (lista.length < 200) break
    }
  })
  const usuarioDe = new Map(usuarios.map(u => [u.id, u]))

  // actividad ("conectadas ahora")
  const vistoDe = new Map<string, string>()
  await intentar('actividad', async () => {
    const { data, error } = await s.from('luma_actividad').select('user_id, visto_at').gt('visto_at', hace(24 * 30))
    if (error) throw error
    for (const a of data || []) vistoDe.set(a.user_id, a.visto_at)
  })
  const vistoHace = (id: string) => { const v = vistoDe.get(id); return v ? ahora - Date.parse(v) : Infinity }

  // planes
  await intentar('planes', async () => {
    const { data: subs } = await s.from('subscriptions').select('user_id, status, plan, trial_ends_at, current_period_ends_at, mp_subscription_id')
    const porTipo: Record<string, number> = {}
    let automaticas = 0, basico = 0, premium = 0, ingresoMensual = 0
    const clientas: any[] = []
    for (const sub of subs || []) {
      const e = estadoPlan(sub as any)
      porTipo[e.tipo] = (porTipo[e.tipo] || 0) + 1
      if (e.automatico && e.nivel !== 'sin_acceso') automaticas++
      if (e.nivel === 'premium' && e.tipo !== 'prueba') premium++
      if (e.nivel === 'basico') basico++
      if (e.automatico && (e.tipo === 'pago' || e.tipo === 'gracia')) ingresoMensual += PRECIO_MES[e.plan] || 0
      const u = usuarioDe.get(sub.user_id)
      clientas.push({
        id: sub.user_id, email: u?.email || '', nombre: u?.nombre || '', tipo: e.tipo, plan: e.plan, nivel: e.nivel,
        automatico: e.automatico, venceEl: e.venceEl ? e.venceEl.toISOString() : null, graciaHasta: e.graciaHasta ? e.graciaHasta.toISOString() : null,
        creada: u?.creada || null, visto: vistoDe.get(sub.user_id) || u?.ultimoIngreso || null,
      })
    }
    clientas.sort((a, b) => String(b.visto || '').localeCompare(String(a.visto || '')))
    r.planes = { total: (subs || []).length, porTipo, automaticas, basico, premium, ingresoMensualEstimado: ingresoMensual }
    r.clientas = clientas
  })

  r.conectadas = {
    ahora: [...vistoDe.keys()].filter(id => vistoHace(id) < 5 * 60000).map(id => ({ id, nombre: usuarioDe.get(id)?.nombre || '', email: usuarioDe.get(id)?.email || '' })),
    hoy: [...vistoDe.keys()].filter(id => vistoHace(id) < 24 * 3600000).length,
    semana: [...vistoDe.keys()].filter(id => vistoHace(id) < 7 * 24 * 3600000).length,
  }
  r.cuentas = {
    total: usuarios.length,
    nuevasSemana: usuarios.filter(u => Date.parse(u.creada) > ahora - 7 * 24 * 3600000).length,
    nuevasHoy: usuarios.filter(u => Date.parse(u.creada) > ahora - 24 * 3600000).length,
  }

  // plata del plan de Luma
  await intentar('pagos', async () => {
    const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0)
    const { data } = await s.from('luma_pagos').select('user_id, monto, metodo, estado, fecha, plan').gte('fecha', new Date(ahora - 62 * 24 * 3600000).toISOString()).order('fecha', { ascending: false })
    const aprobados = (data || []).filter(p => p.estado === 'aprobado')
    const delMes = aprobados.filter(p => Date.parse(p.fecha) >= inicioMes.getTime())
    r.pagos = {
      mes: delMes.reduce((a, p) => a + (Number(p.monto) || 0), 0),
      cantidadMes: delMes.length,
      ultimos: (data || []).slice(0, 15).map(p => ({ ...p, nombre: usuarioDe.get(p.user_id)?.nombre || usuarioDe.get(p.user_id)?.email || '' })),
      devueltos: (data || []).filter(p => p.estado !== 'aprobado').length,
    }
  })

  // transferencias esperando confirmación
  await intentar('transferencias', async () => {
    const { data, error } = await s.from('luma_intentos').select('id, user_id, concepto, plan, monto, detalle, avisado_at, created_at').eq('estado', 'pendiente').order('avisado_at', { ascending: true })
    if (error) throw error
    const subs = new Map<string, any>((r.clientas || []).map((c: any) => [c.id, c]))
    r.transferencias = (data || []).map(t => ({ ...t, nombre: usuarioDe.get(t.user_id)?.nombre || '', email: usuarioDe.get(t.user_id)?.email || '', estadoPlan: subs.get(t.user_id)?.tipo || 'sin_plan' }))
  })

  // uso de Luma
  await intentar('uso', async () => {
    const contar = async (tabla: string, filtro?: (q: any) => any) => { let q: any = s.from(tabla).select('*', { count: 'exact', head: true }); if (filtro) q = filtro(q); const { count } = await q; return count || 0 }
    r.uso = {
      paginasActivas: await contar('therapist_profiles', q => q.eq('pagina_activa', true)),
      alumnas: await contar('persons'),
      cursosPublicados: await contar('courses', q => q.eq('estado', 'publicado')),
      reservasSemana: await contar('public_bookings', q => q.gte('created_at', hace(24 * 7))),
      turnosSemana: await contar('sessions', q => q.gte('created_at', hace(24 * 7))),
    }
  })

  // errores y alertas
  await intentar('errores', async () => {
    const lista: any[] = []
    const { data: alertas, error } = await s.from('luma_alertas').select('id, tipo, titulo, detalle, user_id, created_at').eq('resuelta', false).order('created_at', { ascending: false }).limit(40)
    if (!error) for (const a of alertas || []) lista.push({ ...a, origen: 'dinero', nombre: a.user_id ? (usuarioDe.get(a.user_id)?.nombre || usuarioDe.get(a.user_id)?.email || '') : '' })
    // errores de suscripciones de cursos de los últimos 7 días, juntados por alumna y tipo (los repetidos van en una línea)
    const { data: ev } = await s.from('suscripcion_eventos').select('id, enrollment_id, evento, detalle, created_at').gte('created_at', hace(24 * 7)).order('created_at', { ascending: false }).limit(400)
    const malos = (ev || []).filter((x: any) => /error|no_se_pudo|no_anotado|duplicada_no/.test(String(x.evento)))
    const ids = [...new Set(malos.map((x: any) => String(x.enrollment_id)))]
    const info = new Map<string, { curso: string; terapeuta: string }>()
    if (ids.length) {
      const { data: ens } = await s.from('enrollments').select('id, course_id').in('id', ids)
      const cursoIds = [...new Set((ens || []).map((x: any) => x.course_id))]
      const { data: cursos } = cursoIds.length ? await s.from('courses').select('id, titulo, user_id').in('id', cursoIds) : { data: [] as any[] }
      const duenas = [...new Set((cursos || []).map((x: any) => x.user_id))]
      const { data: perfiles } = duenas.length ? await s.from('therapist_profiles').select('user_id, nombre_profesional').in('user_id', duenas) : { data: [] as any[] }
      for (const en of ens || []) {
        const c = (cursos || []).find((x: any) => x.id === en.course_id)
        info.set(String(en.id), { curso: c?.titulo || 'curso', terapeuta: (perfiles || []).find((p: any) => p.user_id === c?.user_id)?.nombre_profesional || '' })
      }
    }
    const QUE: Record<string, string> = {
      buscar_en_plan_error: 'no se pudo buscar la suscripción en Mercado Pago', revisar_error: 'no se pudo leer el estado de la suscripción',
      cobros_error: 'no se pudieron leer los cobros', cancelar_error: 'no se pudo cancelar la suscripción', crear_error: 'no se pudo crear la suscripción',
      cambiar_monto_error: 'no se pudo cambiar el monto', cobro_no_anotado: 'un cobro no se pudo anotar', duplicada_no_se_pudo_cancelar: 'quedó una suscripción duplicada sin cancelar',
    }
    const CODIGO = (c: any) => c === 401 || c === 403 ? 'el token de Mercado Pago de la terapeuta no funciona: tiene que volver a conectarlo en Ajustes'
      : c === 404 ? 'esa suscripción ya no existe en Mercado Pago (no hace daño)'
      : c === 429 ? 'Mercado Pago estaba ocupado (se reintenta solo)'
      : c === 0 || (c >= 500 && c < 600) ? 'Mercado Pago no respondió en ese momento (se reintenta solo)' : c ? `código ${c}` : ''
    const grupos = new Map<string, any>()
    for (const e of malos) {
      const k = `${e.enrollment_id}|${e.evento}|${(e.detalle as any)?.status ?? ''}`
      const g = grupos.get(k)
      if (g) { g.veces++; continue }
      const i = info.get(String(e.enrollment_id))
      const codigo = (e.detalle as any)?.status
      grupos.set(k, {
        id: 'ev-' + e.id, tipo: e.evento, origen: 'cursos', created_at: e.created_at, veces: 1,
        titulo: `Curso «${i?.curso || '—'}»${i?.terapeuta ? ` de ${i.terapeuta}` : ''}: ${QUE[e.evento] || String(e.evento).replace(/_/g, ' ')}`,
        detalle: { mensaje: CODIGO(codigo) ? `Motivo: ${CODIGO(codigo)}.` : '' },
      })
    }
    for (const g of [...grupos.values()].slice(0, 25)) lista.push(g)
    r.errores = lista
  })

  // guardia de las mañanas
  await intentar('guardia', async () => {
    const { data } = await s.from('controles_diarios').select('created_at, alarmas_seguridad, para_revisar, detalle').order('created_at', { ascending: false }).limit(7)
    r.guardia = data || []
  })

  // espacio de archivos: todo Luma (giga gratis de Supabase) y descargables por terapeuta
  await intentar('espacio', async () => {
    const MB = 1024 * 1024
    const { data: total } = await s.rpc('luma_espacio_total')
    const [{ data: archivos }, { data: extras }] = await Promise.all([
      s.from('descargable_archivos').select('terapeuta_id, tamano').eq('estado', 'listo'),
      s.from('luma_espacio_extra').select('user_id, mb'),
    ])
    const por = new Map<string, { usado: number; archivos: number }>()
    for (const a of archivos || []) {
      const x = por.get(a.terapeuta_id) || { usado: 0, archivos: 0 }
      x.usado += Number(a.tamano) || 0; x.archivos++; por.set(a.terapeuta_id, x)
    }
    const extraDe = new Map((extras || []).map((e: any) => [e.user_id, Number(e.mb) || 0]))
    const ids = new Set([...por.keys(), ...extraDe.keys()])
    r.espacio = {
      totalMb: Math.round((Number(total) || 0) / MB * 10) / 10,
      topeMb: 850, giga: 1024,
      terapeutas: [...ids].map(id => {
        const u = usuarioDe.get(id)
        const x = por.get(id) || { usado: 0, archivos: 0 }
        const extra = extraDe.get(id) || 0
        return { id, nombre: u?.nombre || '', email: u?.email || '', usadoMb: Math.round(x.usado / MB * 10) / 10, archivos: x.archivos, extraMb: extra, totalMb: 100 + extra }
      }).sort((a, b) => b.usadoMb - a.usadoMb),
    }
  })

  return NextResponse.json(r)
}
