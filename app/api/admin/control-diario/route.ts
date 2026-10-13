import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calcularAcceso } from '@/lib/acceso'
import { enviarAviso } from '@/lib/push'

// Control diario de Luma (lo dispara Netlify todas las mañanas, con la clave secreta del servidor).
// 1) Seguridad: se hace pasar por alguien de afuera (con la clave pública, la misma que tiene cualquier navegador)
//    e intenta leer y escribir lo que NO debería poder. Si algo funciona → alarma.
// 2) Datos: busca cosas que no tienen sentido (accesos sin pago, planes vencidos activos, tokens rotos, etc.).
// El resultado queda en la tabla controles_diarios y te llega un aviso al celular.
export const maxDuration = 26
const ADMIN_EMAIL = 'priscilapinillo78@gmail.com'

type Hallazgo = { tipo: 'seguridad' | 'revisar'; que: string; detalle?: unknown }

export async function POST(req: NextRequest) {
  const clave = (req.headers.get('authorization') || '').replace('Bearer ', '')
  if (!clave || clave !== process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const s = createClient(URL_SB, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const anon = createClient(URL_SB, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
  const hallazgos: Hallazgo[] = []
  const ahora = Date.now()
  const hace = (h: number) => new Date(ahora - h * 3600000).toISOString()

  // ── 1) SEGURIDAD: lo que alguien de afuera NO tiene que poder leer
  const lecturasProhibidas = ['patients', 'sessions', 'subscriptions', 'enrollments', 'course_payments', 'mp_credenciales',
    'push_subscriptions', 'persons', 'lesson_progress', 'exam_options', 'exam_results', 'suscripcion_eventos', 'controles_diarios',
    'session_notes', 'payments', 'files', 'tasks', 'quick_notes', 'public_bookings']
  for (const tabla of lecturasProhibidas) {
    try {
      const { data, error } = await anon.from(tabla).select('*').limit(1)
      if (!error && data && data.length > 0) hallazgos.push({ tipo: 'seguridad', que: `Cualquiera puede leer la tabla «${tabla}»` })
    } catch {}
  }
  // el token de Mercado Pago no tiene que estar a la vista en ningún perfil
  try {
    const { data } = await anon.from('therapist_profiles').select('user_id').not('mp_access_token', 'is', null).neq('mp_access_token', '').limit(1)
    if (data && data.length > 0) hallazgos.push({ tipo: 'seguridad', que: 'Hay tokens de Mercado Pago visibles en perfiles públicos' })
  } catch {}

  // lo que alguien de afuera NO tiene que poder escribir (si lo logra, se borra al instante)
  const idPrueba = crypto.randomUUID()
  const intentos: { tabla: string; fila: Record<string, unknown> }[] = [
    { tabla: 'sessions', fila: { id: idPrueba, user_id: idPrueba, estado_pago: 'pendiente', servicio_nombre: 'CONTROL' } },
    { tabla: 'patients', fila: { id: idPrueba, user_id: idPrueba, nombre: 'CONTROL', apellido: '', celular: '0' } },
    { tabla: 'public_bookings', fila: { therapist_id: idPrueba, patient_name: 'CONTROL', estado: 'pendiente_pago' } },
    { tabla: 'course_payments', fila: { terapeuta_id: idPrueba, monto: 0, metodo: 'control', tipo: 'control' } },
    { tabla: 'enrollments', fila: { id: idPrueba, course_id: idPrueba, person_id: idPrueba, terapeuta_id: idPrueba, estado: 'activa' } },
    { tabla: 'subscriptions', fila: { user_id: idPrueba, status: 'active' } },
  ]
  for (const it of intentos) {
    try {
      const { error } = await anon.from(it.tabla).insert(it.fila)
      // 42501 = la base lo frenó por seguridad (lo correcto). Cualquier otro error significa que pasó la seguridad
      // y lo frenó otra cosa (por ejemplo un dato faltante): igual es un agujero.
      const frenado = !!error && (error.code === '42501' || String(error.code || '').startsWith('PGRST'))
      if (!frenado) {
        hallazgos.push({ tipo: 'seguridad', que: `Cualquiera puede escribir en la tabla «${it.tabla}»` })
        // limpiar lo que entró
        if ('id' in it.fila) await s.from(it.tabla).delete().eq('id', idPrueba)
        else if (it.tabla === 'public_bookings') await s.from(it.tabla).delete().eq('therapist_id', idPrueba)
        else if (it.tabla === 'course_payments') await s.from(it.tabla).delete().eq('terapeuta_id', idPrueba)
        else if (it.tabla === 'subscriptions') await s.from(it.tabla).delete().eq('user_id', idPrueba)
      }
    } catch {}
  }
  try {
    const { error } = await anon.rpc('buscar_o_crear_paciente', { p_terapeuta: idPrueba, p_nombre: 'CONTROL', p_apellido: '', p_celular: '0' })
    // si la función respondió algo distinto de "sin permiso", está abierta al público
    if (!error || error.code !== '42501') hallazgos.push({ tipo: 'seguridad', que: 'La función que busca pacientes está abierta al público' })
  } catch {}

  // ── 2) DATOS
  try {
    // planes que figuran activos pero vencieron hace más de 3 días (el aviso de Mercado Pago no llegó)
    const { data } = await s.from('subscriptions').select('user_id, current_period_ends_at').eq('status', 'active').lt('current_period_ends_at', hace(72)).limit(50)
    if (data && data.length) hallazgos.push({ tipo: 'revisar', que: `${data.length} plan(es) de Luma figuran activos pero vencieron hace más de 3 días`, detalle: data })
  } catch {}
  try {
    // terapeutas con Mercado Pago activado sin token guardado (sus clientas no pueden pagar)
    const [{ data: activos }, { data: creds }] = await Promise.all([
      s.from('therapist_profiles').select('user_id, nombre_profesional, slug').eq('mp_activo', true),
      s.from('mp_credenciales').select('user_id'),
    ])
    const conToken = new Set((creds || []).map((c: any) => c.user_id))
    const sinToken = (activos || []).filter((p: any) => !conToken.has(p.user_id))
    if (sinToken.length) hallazgos.push({ tipo: 'revisar', que: `${sinToken.length} terapeuta(s) con Mercado Pago activado pero sin token`, detalle: sinToken.map((p: any) => p.slug || p.nombre_profesional) })
  } catch {}
  try {
    // accesos activos a cursos pagos sin ningún pago registrado, que cambiaron en las últimas 24 h (posible trampa)
    const { data: cursosPagos } = await s.from('courses').select('id, titulo').gt('precio', 0)
    const ids = (cursosPagos || []).map((c: any) => c.id)
    if (ids.length) {
      const { data: activas } = await s.from('enrollments').select('id, course_id, person_id, updated_at, mp_preapproval_id')
        .in('course_id', ids).eq('estado', 'activa').gte('updated_at', hace(24))
      const sinPago: any[] = []
      for (const e of activas || []) {
        const { count } = await s.from('course_payments').select('id', { count: 'exact', head: true }).eq('enrollment_id', e.id)
        if (!count) sinPago.push({ inscripcion: e.id, curso: (cursosPagos || []).find((c: any) => c.id === e.course_id)?.titulo })
      }
      if (sinPago.length) hallazgos.push({ tipo: 'revisar', que: `${sinPago.length} acceso(s) a cursos pagos se activaron sin pago registrado (puede ser una confirmación a mano por $0, o una trampa)`, detalle: sinPago })
    }
  } catch {}
  try {
    // suscripciones de cursos que hace más de 2 días nadie revisa (la revisión automática no está corriendo)
    const { data } = await s.from('enrollments').select('id')
      .in('suscripcion_estado', ['pendiente', 'esperando_cobro', 'activa', 'con_problemas']).lt('suscripcion_revisada_at', hace(48)).limit(50)
    if (data && data.length) hallazgos.push({ tipo: 'revisar', que: `${data.length} suscripción(es) de cursos sin revisar hace más de 2 días (revisá la tarea automática en Netlify)` })
    const { data: trabadas } = await s.from('enrollments').select('id').eq('suscripcion_estado', 'creando').lt('suscripcion_creada_at', hace(1)).limit(50)
    if (trabadas && trabadas.length) hallazgos.push({ tipo: 'revisar', que: `${trabadas.length} suscripción(es) trabadas «creándose» hace más de una hora`, detalle: trabadas })
  } catch {}
  try {
    // páginas activas que no tienen nada para reservar
    const { data: activas } = await s.from('therapist_profiles').select('user_id, slug').eq('pagina_activa', true)
    const { data: servs } = await s.from('services').select('user_id').eq('activo', true)
    const conServ = new Set((servs || []).map((x: any) => x.user_id))
    const vacias = (activas || []).filter((p: any) => !conServ.has(p.user_id))
    if (vacias.length) hallazgos.push({ tipo: 'revisar', que: `${vacias.length} página(s) activas sin servicios (sus visitantes ven «se está preparando»)`, detalle: vacias.map((p: any) => p.slug) })
  } catch {}
  try {
    // planes vencidos con página activa (sus visitantes ven «no disponible»): para avisarles
    const { data: subs } = await s.from('subscriptions').select('user_id, status, trial_ends_at, current_period_ends_at, plan')
    const vencidas = new Set((subs || []).filter((x: any) => calcularAcceso(x) === 'sin_acceso').map((x: any) => x.user_id))
    const { data: activas } = await s.from('therapist_profiles').select('user_id, slug').eq('pagina_activa', true)
    const pausadas = (activas || []).filter((p: any) => vencidas.has(p.user_id))
    if (pausadas.length) hallazgos.push({ tipo: 'revisar', que: `${pausadas.length} terapeuta(s) con el plan vencido y la página activa: sus visitantes ven «no disponible»`, detalle: pausadas.map((p: any) => p.slug) })
  } catch {}

  const alarmas = hallazgos.filter(h => h.tipo === 'seguridad').length
  const revisar = hallazgos.filter(h => h.tipo === 'revisar').length
  try { await s.from('controles_diarios').insert({ alarmas_seguridad: alarmas, para_revisar: revisar, detalle: hallazgos }) } catch {}

  // aviso al celular de la admin
  try {
    let adminId: string | null = null
    for (let pagina = 1; pagina <= 10 && !adminId; pagina++) {
      const { data } = await s.auth.admin.listUsers({ page: pagina, perPage: 200 })
      const u = (data?.users || []).find(x => (x.email || '').toLowerCase() === ADMIN_EMAIL)
      if (u) adminId = u.id
      if (!data?.users?.length) break
    }
    if (adminId) {
      const titulo = alarmas ? `🚨 Control de Luma: ${alarmas} alarma(s) de seguridad` : revisar ? `⚠️ Control de Luma: ${revisar} cosa(s) para revisar` : '✅ Control de Luma: todo en orden'
      const cuerpo = hallazgos.length ? hallazgos.slice(0, 3).map(h => h.que).join(' · ').slice(0, 220) : 'Seguridad y datos revisados.'
      await enviarAviso(adminId, titulo, cuerpo)
    }
  } catch (e) { console.error('control-diario aviso:', e) }

  return NextResponse.json({ ok: true, alarmas, revisar, hallazgos })
}