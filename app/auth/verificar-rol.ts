'use server'

import { createClient } from '@supabase/supabase-js'

// Devuelve true si el email ya pertenece a una alumna (fila en persons con auth_user_id seteado).
// Corre en el servidor con service role porque una visitante sin sesión no puede leer persons.
export async function emailEsAlumna(email: string): Promise<boolean> {
  const limpio = email.trim()
  if (!limpio) return false

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // ilike sin comodines = comparación exacta sin distinguir mayúsculas
  const patron = limpio.replace(/[\\%_]/g, c => `\\${c}`)
  const { data, error } = await supabase
    .from('persons').select('id')
    .ilike('email', patron)
    .not('auth_user_id', 'is', null)
    .limit(1)

  if (error) { console.error('emailEsAlumna:', error); return false }
  return (data?.length ?? 0) > 0
}
