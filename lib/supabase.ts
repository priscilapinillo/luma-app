import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const c = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  conReintento(c)
  return c
}

// Cuando varias partes de la pantalla preguntan "¿quién está conectada?" al mismo tiempo, Supabase a veces corta una
// con el error "Lock ... was released because another request stole it". No es un problema de la sesión: se vuelve a
// preguntar (hasta 3 veces). Antes, ese corte dejaba el menú sin datos (por ejemplo, Cursos con candado siendo Premium).
const esLock = (e: unknown) => /lock/i.test(String((e as { message?: string })?.message || e || ''))
function conReintento(c: ReturnType<typeof createBrowserClient>) {
  const a = c.auth as unknown as Record<string, unknown> & { __reintento?: boolean }
  if (a.__reintento) return
  a.__reintento = true
  for (const metodo of ['getUser', 'getSession'] as const) {
    const original = (a[metodo] as (...x: unknown[]) => Promise<{ error?: unknown }>).bind(c.auth)
    a[metodo] = async (...args: unknown[]) => {
      for (let intento = 0; ; intento++) {
        try {
          const r = await original(...args)
          if (r?.error && esLock(r.error) && intento < 2) { await new Promise(ok => setTimeout(ok, 150 * (intento + 1))); continue }
          return r
        } catch (e) {
          if (!esLock(e) || intento >= 2) throw e
          await new Promise(ok => setTimeout(ok, 150 * (intento + 1)))
        }
      }
    }
  }
}