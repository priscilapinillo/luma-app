// Tarea programada de Netlify: control diario de Luma (seguridad y datos), todos los días a las 9 de la mañana (Argentina).
export default async () => {
    const base = process.env.URL || 'https://lumaapp.lat'
    try {
      const r = await fetch(`${base}/api/admin/control-diario`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
      })
      console.log('Control diario:', r.status, (await r.text()).slice(0, 500))
    } catch (e) {
      console.error('Control diario falló:', e)
    }
  }
  
  export const config = { schedule: '0 12 * * *' }