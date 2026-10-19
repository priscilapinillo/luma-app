import { createClient } from '@/lib/supabase'

// Le pide al servidor que revise el plan con Mercado Pago (por si cobró y el aviso no llegó).
// Usa la sesión: el servidor revisa siempre la cuenta de quien está conectada.
export async function verificarPlanEnVivo(): Promise<{ vigente: boolean; plan: string | null; tipo?: string }> {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/mp/verificar-suscripcion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) },
      body: JSON.stringify({ userId: session?.user?.id }),
    })
    const r = await res.json().catch(() => ({}))
    return { vigente: !!r.vigente, plan: r.plan || null, tipo: r.tipo }
  } catch (e) {
    console.error('Error verificando el plan en vivo:', e)
    return { vigente: false, plan: null }
  }
}
