import { createClient } from '@/lib/supabase'

// Chequeo de solo lectura, sin ninguna relación estructural entre tablas.
// Evita que una cuenta con Luma activo (pagando) también tenga Luma Links gratis.
export async function tieneAccesoLumaActivo(userId: string): Promise<boolean> {
  const supabase = createClient()
  const { data } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .maybeSingle()
  if (!data) return false
  return data.status === 'active' || data.status === 'trial'
}