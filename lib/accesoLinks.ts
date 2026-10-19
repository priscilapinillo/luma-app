import { createClient } from '@/lib/supabase'
import { calcularAcceso } from '@/lib/acceso'

// ¿Esta cuenta tiene Luma (el producto pago) vigente HOY?
// Decide por FECHAS (prueba dentro de sus 7 días, o plan pago dentro de su mes, incluidos los días de gracia),
// nunca solo por el estado guardado. Regla de Luma Links: puede usarlo cualquier cuenta que NO tenga Luma vigente.
export async function tieneAccesoLumaActivo(userId: string): Promise<boolean> {
  const supabase = createClient()
  const { data } = await supabase
    .from('subscriptions')
    .select('status, plan, trial_ends_at, current_period_ends_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (!data) return false
  return calcularAcceso(data) !== 'sin_acceso'
}
