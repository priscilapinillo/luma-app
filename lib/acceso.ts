// Única fuente de verdad para "¿qué nivel de acceso tiene esta cuenta?"
// Nunca confiar en `status` a ciegas: siempre comparar contra las fechas reales.
// Este archivo no usa la red: sirve igual en el navegador y en el servidor.

export type NivelAcceso = 'sin_acceso' | 'basico' | 'premium'

export type SubscriptionRow = {
  status: string | null
  plan: string | null
  trial_ends_at: string | null
  current_period_ends_at: string | null
  // opcional: solo hace falta para saber si tiene cobro automático
  mp_subscription_id?: string | null
}

// Días que sigue funcionando todo después de vencer un plan pago (con cartel de "renová").
export const DIAS_GRACIA = 3
const DIA = 86400000

const nivelDePlan = (plan: string | null): NivelAcceso => (plan === 'premium' ? 'premium' : 'basico')
const fecha = (iso: string | null | undefined) => {
  if (!iso) return null
  const t = new Date(iso).getTime()
  return Number.isFinite(t) ? t : null
}

// ¿Tiene cobro automático de Mercado Pago andando? (si canceló, ya no)
export function tieneCobroAutomatico(sub: SubscriptionRow | null): boolean {
  return !!sub?.mp_subscription_id && sub.status !== 'cancelled'
}

export type TipoEstado =
  | 'sin_plan'          // nunca tuvo plan de terapeuta
  | 'prueba'            // prueba gratis vigente
  | 'prueba_vencida'    // terminó la prueba y no pagó
  | 'pago'              // plan pago al día
  | 'gracia'            // plan pago vencido, pero dentro de los días de gracia
  | 'cancelado_vigente' // canceló el cobro, pero le quedan días pagos
  | 'vencido'           // plan pago vencido (pasaron los días de gracia, o canceló y se terminó el mes)

export type EstadoPlan = {
  tipo: TipoEstado
  nivel: NivelAcceso
  plan: 'basico' | 'premium'
  automatico: boolean
  // hasta cuándo tiene lo que pagó (o la prueba). En gracia: la fecha en que venció.
  venceEl: Date | null
  // en gracia: hasta cuándo sigue funcionando todo
  graciaHasta: Date | null
  // días que faltan para venceEl (0 = vence hoy; negativos = ya venció)
  dias: number | null
}

/**
 * Cálculo completo y puro del estado del plan. Todas las pantallas usan esto
 * para que nunca se contradigan (menú, Inicio, Ajustes, bloqueo, página pública).
 */
export function estadoPlan(sub: SubscriptionRow | null, ahora: number = Date.now()): EstadoPlan {
  const plan = sub?.plan === 'premium' ? 'premium' : 'basico'
  const automatico = tieneCobroAutomatico(sub)
  const base = { plan, automatico, graciaHasta: null } as const
  if (!sub) return { ...base, tipo: 'sin_plan', nivel: 'sin_acceso', venceEl: null, dias: null }

  const diasHasta = (t: number) => Math.ceil((t - ahora) / DIA)
  const finPrueba = fecha(sub.trial_ends_at)
  const finPeriodo = fecha(sub.current_period_ends_at)

  if (sub.status === 'trial') {
    if (finPrueba && finPrueba > ahora) {
      return { ...base, tipo: 'prueba', nivel: 'premium', venceEl: new Date(finPrueba), dias: diasHasta(finPrueba) }
    }
    // activó el cobro automático durante la prueba y el primer cobro todavía no salió (o lo rechazaron):
    // días de gracia mientras Mercado Pago reintenta
    if (automatico && finPrueba && finPrueba + DIAS_GRACIA * DIA > ahora) {
      return { ...base, tipo: 'gracia', nivel: nivelDePlan(sub.plan), venceEl: new Date(finPrueba),
        graciaHasta: new Date(finPrueba + DIAS_GRACIA * DIA), dias: diasHasta(finPrueba) }
    }
    return { ...base, tipo: 'prueba_vencida', nivel: 'sin_acceso', venceEl: finPrueba ? new Date(finPrueba) : null, dias: finPrueba ? diasHasta(finPrueba) : null }
  }

  if (sub.status === 'cancelled') {
    // canceló: conserva todo hasta el último día pagado, sin días de gracia
    if (finPeriodo && finPeriodo > ahora) {
      return { ...base, tipo: 'cancelado_vigente', nivel: nivelDePlan(sub.plan), venceEl: new Date(finPeriodo), dias: diasHasta(finPeriodo) }
    }
    return { ...base, tipo: 'vencido', nivel: 'sin_acceso', venceEl: finPeriodo ? new Date(finPeriodo) : null, dias: finPeriodo ? diasHasta(finPeriodo) : null }
  }

  if (sub.status === 'active' || sub.status === 'past_due') {
    if (finPeriodo && finPeriodo > ahora) {
      return { ...base, tipo: 'pago', nivel: nivelDePlan(sub.plan), venceEl: new Date(finPeriodo), dias: diasHasta(finPeriodo) }
    }
    if (finPeriodo && finPeriodo + DIAS_GRACIA * DIA > ahora) {
      return { ...base, tipo: 'gracia', nivel: nivelDePlan(sub.plan), venceEl: new Date(finPeriodo),
        graciaHasta: new Date(finPeriodo + DIAS_GRACIA * DIA), dias: diasHasta(finPeriodo) }
    }
    return { ...base, tipo: 'vencido', nivel: 'sin_acceso', venceEl: finPeriodo ? new Date(finPeriodo) : null, dias: finPeriodo ? diasHasta(finPeriodo) : null }
  }

  // estado desconocido: sin acceso (nunca se regala nada por un dato raro)
  return { ...base, tipo: 'vencido', nivel: 'sin_acceso', venceEl: null, dias: null }
}

/**
 * Cálculo puro, sin red. Úsalo para mostrar la UI al instante.
 * Si el resultado da 'sin_acceso' pero pareceDesactualizado() da true,
 * puede ser que Mercado Pago cobró y el aviso no llegó: verificar en vivo antes de bloquear.
 */
export function calcularAcceso(sub: SubscriptionRow | null): NivelAcceso {
  return estadoPlan(sub).nivel
}

/**
 * true si el cálculo dio 'sin_acceso' pero puede ser que Mercado Pago haya cobrado
 * y el aviso no haya llegado. Tiene límite: solo para quien tiene (o tuvo hasta hace poco)
 * cobro automático y venció hace pocos días. Antes no tenía límite, y una cuenta que pagó
 * a mano y no renovó seguía tomando reservas para siempre.
 */
export function pareceDesactualizado(sub: SubscriptionRow | null, ahora: number = Date.now()): boolean {
  if (!sub || sub.status !== 'active') return false
  if (calcularAcceso(sub) !== 'sin_acceso') return false
  // si la fila no trae el dato del cobro automático, se mira solo la fecha
  if (sub.mp_subscription_id === null) return false
  const fin = fecha(sub.current_period_ends_at)
  return !!fin && fin + (DIAS_GRACIA + 4) * DIA > ahora
}

export type EnrollmentRow = {
  estado: string | null
  modalidad: string | null
  fecha_vencimiento: string | null
}

/**
 * Única fuente de verdad para "¿esta alumna puede entrar al curso?"
 * Nunca confía solo en `estado` — si es suscripción, siempre revisa
 * también la fecha real de vencimiento, aunque `estado` diga 'activa'.
 */
export function tieneAccesoCurso(e: EnrollmentRow | null): boolean {
  if (!e) return false
  if (e.estado !== 'activa') return false
  if (e.modalidad === 'suscripcion' && e.fecha_vencimiento) {
    return new Date(e.fecha_vencimiento) > new Date()
  }
  return true
}
