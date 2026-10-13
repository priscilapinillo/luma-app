// Tarea programada de Netlify: cada hora revisa unas pocas suscripciones de cursos en Mercado Pago.
// No hay que configurar nada: Netlify la detecta sola por estar en la carpeta netlify/functions.
export default async () => {
    const base = process.env.URL || 'https://lumaapp.lat'
    try {
      const r = await fetch(`${base}/api/cursos/suscripcion/revision-diaria`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
      })
      console.log('Revisión de suscripciones:', r.status, await r.text())
    } catch (e) {
      console.error('Revisión de suscripciones falló:', e)
    }
  }
  
  export const config = { schedule: '@hourly' }