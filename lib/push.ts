// Envío de avisos al celular de la terapeuta. Solo se usa desde el servidor.
// Manda a TODOS sus dispositivos y borra los que ya no existen (si desinstaló la app).
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

let configurado = false
function configurar() {
  if (configurado) return
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
  configurado = true
}

export function supabaseServidor() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Devuelve a cuántos dispositivos llegó (0 si no tiene avisos activados)
export async function enviarAviso(userId: string, titulo: string, cuerpo: string): Promise<number> {
  if (!userId || !titulo) return 0
  configurar()
  const supabase = supabaseServidor()
  const { data: filas, error } = await supabase
    .from('push_subscriptions').select('subscription, endpoint').eq('user_id', userId)
  if (error) { console.error('Avisos: no se pudieron leer los dispositivos', error); return 0 }

  let enviados = 0
  for (const fila of filas || []) {
    let sub: any
    try { sub = typeof fila.subscription === 'string' ? JSON.parse(fila.subscription) : fila.subscription } catch { continue }
    if (!sub?.endpoint) continue
    try {
      await webpush.sendNotification(sub, JSON.stringify({ title: titulo, body: cuerpo, icon: '/favicon.ico' }))
      enviados++
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        // ese celular ya no existe (desinstaló la app o borró los datos): lo sacamos de la lista
        await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', sub.endpoint)
      } else {
        console.error('Avisos: error enviando', e?.statusCode, e?.body || e?.message)
      }
    }
  }
  return enviados
}