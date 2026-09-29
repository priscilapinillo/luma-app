// Única fuente de verdad para "¿qué nivel de acceso tiene esta cuenta?"
// Nunca confiar en `status` a ciegas: siempre comparar contra las fechas reales.

export type NivelAcceso = 'sin_acceso' | 'basico' | 'premium'

export type SubscriptionRow = {
  status: string | null
  plan: string | null
  trial_ends_at: string | null
  current_period_ends_at: string | null
}

/**
 * Cálculo puro, sin red. Úsalo para mostrar la UI al instante.
 * Si el resultado da 'sin_acceso' pero sub.status sigue diciendo 'active',
 * es una señal de que los datos pueden estar desactualizados (el webhook
 * no llegó) — en ese caso, usar verificarAccesoLive() antes de bloquear.
 */
export function calcularAcceso(sub: SubscriptionRow | null): NivelAcceso {
  if (!sub) return 'sin_acceso'
  const ahora = new Date()

  // Trial vigente: acceso completo a todo — pero solo si el status realmente es 'trial'
  if (sub.status === 'trial' && sub.trial_ends_at && new Date(sub.trial_ends_at) > ahora) {
    return 'premium'
  }

  // Plan pago activo y no vencido
  if (sub.status === 'active' && sub.current_period_ends_at && new Date(sub.current_period_ends_at) > ahora) {
    return sub.plan === 'premium' ? 'premium' : 'basico'
  }

  return 'sin_acceso'
}

/**
 * true si el cálculo dio 'sin_acceso' pero el status guardado sugiere que
 * debería tener acceso — esto es lo que dispara el chequeo en vivo contra MP.
 */
export function pareceDesactualizado(sub: SubscriptionRow | null): boolean {
  if (!sub) return false
  return calcularAcceso(sub) === 'sin_acceso' && sub.status === 'active'
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