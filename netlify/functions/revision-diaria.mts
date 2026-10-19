// Tarea programada de Netlify, cada hora:
// - revisa unas pocas suscripciones de cursos en Mercado Pago
// - tareas de Luma: revisa planes, manda avisos de vencimiento, sincroniza Loops y limpia estadísticas viejas
// No hay que configurar nada: Netlify la detecta sola por estar en la carpeta netlify/functions.
async function llamar(ruta: string, nombre: string) {
  const base = process.env.URL || 'https://lumaapp.lat'
  try {
    const r = await fetch(`${base}${ruta}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
    })
    console.log(`${nombre}:`, r.status, (await r.text()).slice(0, 500))
  } catch (e) {
    console.error(`${nombre} falló:`, e)
  }
}

export default async () => {
  // las dos a la vez, así no se pasan del tiempo máximo
  await Promise.all([
    llamar('/api/cursos/suscripcion/revision-diaria', 'Revisión de suscripciones de cursos'),
    llamar('/api/admin/tareas-hora', 'Tareas de Luma'),
  ])
}

export const config = { schedule: '@hourly' }
