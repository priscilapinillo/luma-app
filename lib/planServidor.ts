// Nivel del plan de una terapeuta, calculado en el SERVIDOR (nunca se le cree al navegador).
// Usa la misma regla que todas las pantallas (lib/acceso.ts) y la misma que la base (luma_nivel).
import { db, revisarPlanLuma } from '@/lib/planLuma'
import { calcularAcceso, pareceDesactualizado, type NivelAcceso } from '@/lib/acceso'

const COLUMNAS = 'status, plan, trial_ends_at, current_period_ends_at, mp_subscription_id'

export async function nivelServidor(userId: string, opciones: { verificar?: boolean } = {}): Promise<NivelAcceso> {
  if (!userId) return 'sin_acceso'
  const s = db()
  const { data: sub } = await s.from('subscriptions').select(COLUMNAS).eq('user_id', userId).maybeSingle()
  let nivel = calcularAcceso(sub as any)
  // si parece que Mercado Pago cobró y el aviso no llegó, se pregunta antes de frenar (igual que en las pantallas)
  if (nivel !== 'premium' && opciones.verificar !== false && pareceDesactualizado(sub as any)) {
    try {
      await revisarPlanLuma(userId)
      const { data: otra } = await s.from('subscriptions').select(COLUMNAS).eq('user_id', userId).maybeSingle()
      nivel = calcularAcceso(otra as any)
    } catch (e) { console.error('nivelServidor: no se pudo verificar en vivo', e) }
  }
  return nivel
}

// ¿Puede vender cursos y descargables nuevos? Solo con Premium (o prueba gratis vigente, que es Premium).
export async function ventasAbiertas(terapeutaId: string): Promise<boolean> {
  return (await nivelServidor(terapeutaId)) === 'premium'
}
