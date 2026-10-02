import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ÚNICA cuenta con permisos de administración. Se verifica siempre en el servidor.
export const ADMIN_EMAIL = 'priscilapinillo78@gmail.com'

export function servicio() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// confirma con Supabase quién es la persona por su sesión (no alcanza con saber la dirección)
export async function esAdmin(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return false
  const { data, error } = await servicio().auth.getUser(token)
  if (error || !data?.user?.email) return false
  return data.user.email.toLowerCase() === ADMIN_EMAIL
}