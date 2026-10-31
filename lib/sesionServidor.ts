import { NextRequest } from 'next/server'
import { db } from '@/lib/planLuma'

// Quién hace el pedido, según su sesión (nunca según lo que diga el navegador).
export async function usuarioDelPedido(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  if (!auth.startsWith('Bearer ')) return null
  const { data, error } = await db().auth.getUser(auth.slice(7))
  if (error || !data?.user) return null
  return data.user
}

// Freno simple contra dobles toques y abusos: la misma cuenta, la misma acción, cada `ms`.
const ultimos = new Map<string, number>()
export function muyPronto(clave: string, ms: number) {
  const ahora = Date.now()
  for (const [k, v] of ultimos) if (ahora - v > 120000) ultimos.delete(k)
  const antes = ultimos.get(clave)
  ultimos.set(clave, ahora)
  return !!antes && ahora - antes < ms
}
