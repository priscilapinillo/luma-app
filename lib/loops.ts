// Conexión con Loops (mails automáticos). Solo servidor.
// - Si la llave LOOPS_API_KEY no está cargada, no hace nada (nada se rompe).
// - Solo se mandan a Loops las cuentas de Luma y de Luma Links: NUNCA las alumnas
//   (son clientas de cada terapeuta, no de Luma).
// - Si Loops falla, se anota en los registros y sigue todo normal.
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { estadoPlan } from '@/lib/acceso'

const BASE = 'https://app.loops.so/api/v1'

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
}

export const loopsActivo = () => !!process.env.LOOPS_API_KEY

async function llamar(metodo: 'POST' | 'PUT', ruta: string, cuerpo: unknown, idem?: string) {
  if (!loopsActivo()) return { ok: false, status: 0, data: null as any }
  const control = new AbortController()
  const corte = setTimeout(() => control.abort(), 8000)
  try {
    const res = await fetch(BASE + ruta, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${process.env.LOOPS_API_KEY}`,
        'Content-Type': 'application/json',
        ...(idem ? { 'Idempotency-Key': idem.slice(0, 100) } : {}),
      },
      body: JSON.stringify(cuerpo),
      signal: control.signal,
      cache: 'no-store',
    })
    const data = await res.json().catch(() => null)
    // 409 = ese mismo evento ya se mandó (no es un error)
    if (!res.ok && res.status !== 409) console.error('Loops:', ruta, res.status, JSON.stringify(data)?.slice(0, 300))
    return { ok: res.ok || res.status === 409, status: res.status, data }
  } catch (e: any) {
    console.error('Loops: sin respuesta', ruta, e?.message)
    return { ok: false, status: 0, data: null }
  } finally {
    clearTimeout(corte)
  }
}

async function emailDe(userId: string): Promise<{ email: string; nombre: string } | null> {
  const { data } = await db().auth.admin.getUserById(userId)
  const u = data?.user
  if (!u?.email) return null
  const nombre = String((u.user_metadata as any)?.full_name || '').trim().split(' ')[0] || ''
  return { email: u.email, nombre }
}

// Manda un evento (por ejemplo "plan_por_vencer") para disparar un mail en Loops.
// `clave` evita mandarlo dos veces el mismo día aunque se llame de nuevo.
export async function eventoLoops(userId: string, nombre: string, props?: Record<string, unknown>, clave?: string) {
  if (!loopsActivo()) return false
  const quien = await emailDe(userId)
  if (!quien) return false
  // no se le mandan mails de Luma a una cuenta que es solo de alumna
  const s = db()
  const [{ data: sub }, { data: links }] = await Promise.all([
    s.from('subscriptions').select('user_id').eq('user_id', userId).maybeSingle(),
    s.from('luma_links_profiles').select('id').eq('auth_user_id', userId).maybeSingle(),
  ])
  if (!sub && !links) return false
  const eventProperties: Record<string, string | number | boolean> = {}
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined) continue
    eventProperties[k] = typeof v === 'number' || typeof v === 'boolean' ? v : String(v)
  }
  const r = await llamar('POST', '/events/send', { email: quien.email, userId, eventName: nombre, eventProperties },
    clave ? `${nombre}:${userId}:${clave}` : undefined)
  return r.ok
}

type Props = Record<string, string | number | boolean>

/**
 * Sincroniza con Loops las cuentas de Luma y Luma Links. Solo manda las que cambiaron desde la última vez
 * (se guarda una "huella" en loops_contactos), hasta `limite` por vuelta, para no pasarse de tiempo.
 */
export async function sincronizarLoops(limite = 40, hastaMs = Date.now() + 15000): Promise<{ enviadas: number; pendientes: number }> {
  if (!loopsActivo()) return { enviadas: 0, pendientes: 0 }
  const s = db()

  const usuarios: { id: string; email: string; nombre: string; creada: string }[] = []
  for (let pagina = 1; pagina <= 20; pagina++) {
    const { data } = await s.auth.admin.listUsers({ page: pagina, perPage: 200 })
    const lista = data?.users || []
    for (const u of lista) {
      if (!u.email) continue
      usuarios.push({ id: u.id, email: u.email, nombre: String((u.user_metadata as any)?.full_name || '').trim().split(' ')[0] || '', creada: u.created_at })
    }
    if (lista.length < 200) break
  }

  const [{ data: subs }, { data: links }, { data: perfiles }, { data: servicios }, { data: pacientes }, { data: hechas }] = await Promise.all([
    s.from('subscriptions').select('user_id, status, plan, trial_ends_at, current_period_ends_at, mp_subscription_id'),
    s.from('luma_links_profiles').select('auth_user_id, slug'),
    s.from('therapist_profiles').select('user_id, slug, pagina_activa'),
    s.from('services').select('user_id').eq('activo', true).limit(20000),
    s.from('patients').select('user_id').limit(50000),
    s.from('loops_contactos').select('user_id, huella, sincronizado_at'),
  ])
  const subDe = new Map((subs || []).map((x: any) => [x.user_id, x]))
  const linksDe = new Map((links || []).map((x: any) => [x.auth_user_id, x]))
  const perfilDe = new Map((perfiles || []).map((x: any) => [x.user_id, x]))
  const contar = (filas: any[] | null) => {
    const m = new Map<string, number>()
    for (const f of filas || []) m.set(f.user_id, (m.get(f.user_id) || 0) + 1)
    return m
  }
  const servDe = contar(servicios)
  const pacDe = contar(pacientes)
  const huellaDe = new Map((hechas || []).map((x: any) => [x.user_id, x.huella]))
  const cuandoDe = new Map((hechas || []).map((x: any) => [x.user_id, new Date(x.sincronizado_at || 0).getTime()]))

  const cambiadas: { id: string; email: string; props: Props; huella: string }[] = []
  for (const u of usuarios) {
    const sub = subDe.get(u.id)
    const lk = linksDe.get(u.id)
    if (!sub && !lk) continue // alumnas y cuentas a medio crear: no van a Loops
    const est = estadoPlan(sub || null)
    const perfil = perfilDe.get(u.id)
    const props: Props = {
      firstName: u.nombre,
      tipoCuenta: sub && (est.nivel !== 'sin_acceso' || !lk) ? 'luma' : 'links',
      estadoPlan: sub ? est.tipo : 'sin_plan',
      planLuma: sub ? est.plan : '',
      cobroAutomatico: est.automatico,
      tieneLinks: !!lk,
      paginaActiva: !!perfil?.pagina_activa,
      serviciosActivos: servDe.get(u.id) || 0,
      consultantes: pacDe.get(u.id) || 0,
      slug: perfil?.slug || lk?.slug || '',
      ...(est.venceEl ? { venceEl: est.venceEl.toISOString() } : {}),
      cuentaCreada: u.creada,
    }
    const huella = createHash('sha1').update(u.email + JSON.stringify(props)).digest('hex')
    const guardada = huellaDe.get(u.id)
    if (guardada === huella) continue
    // Loops la rechazó hace menos de un día con estos mismos datos: se reintenta mañana
    if (guardada === 'error:' + huella && Date.now() - (cuandoDe.get(u.id) || 0) < 86400000) continue
    cambiadas.push({ id: u.id, email: u.email, props, huella })
  }

  let enviadas = 0
  for (const c of cambiadas.slice(0, limite)) {
    if (Date.now() > hastaMs) break
    const r = await llamar('PUT', '/contacts/update', { email: c.email, userId: c.id, ...c.props })
    if (r.ok) {
      await s.from('loops_contactos').upsert({ user_id: c.id, huella: c.huella, sincronizado_at: new Date().toISOString() })
      enviadas++
    } else if (r.status === 400) {
      // dato rechazado por Loops (por ejemplo, falta crear una propiedad): se anota para no reintentar cada hora
      await s.from('loops_contactos').upsert({ user_id: c.id, huella: 'error:' + c.huella, sincronizado_at: new Date().toISOString() })
    }
    await new Promise(ok => setTimeout(ok, 120)) // respeta el límite de Loops (10 por segundo)
  }
  return { enviadas, pendientes: Math.max(0, cambiadas.length - enviadas) }
}
