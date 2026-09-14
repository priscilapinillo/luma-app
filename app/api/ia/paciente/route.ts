import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
// OpenRouter — no necesita paquete externo, usa fetch directo
console.log('OPENROUTER KEY:', process.env.OPENROUTER_API_KEY?.slice(0,10))

export async function POST(req: NextRequest) {
  try {
    const { pregunta, userId } = await req.json()
    if (!pregunta || !userId) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Traer todos los pacientes con sus sesiones
    const { data: pacientes } = await supabase
      .from('patients')
      .select('id, nombre, apellido, celular, contexto_general')
      .eq('user_id', userId)

    const { data: sesiones } = await supabase
      .from('sessions')
      .select('patient_id, fecha, hora, servicio_nombre, precio, estado_pago, realizado, contexto_sesion, resumen_sesion')
      .eq('user_id', userId)
      .order('fecha', { ascending: false })

    const { data: notas } = await supabase
      .from('session_notes')
      .select('patient_id, titulo, contenido, created_at')
      .eq('user_id', userId)

    // Armar contexto
    const contexto = pacientes?.map(p => {
      const sesionesDelPaciente = sesiones?.filter(s => s.patient_id === p.id) || []
      const notasDelPaciente = notas?.filter(n => n.patient_id === p.id) || []
      return `
PACIENTE: ${p.nombre} ${p.apellido}
Contexto general: ${p.contexto_general || 'Sin contexto'}
Sesiones (${sesionesDelPaciente.length}):
${sesionesDelPaciente.map(s => `  - ${s.fecha?.split('T')[0]} | ${s.servicio_nombre} | $${s.precio} | ${s.realizado ? 'Realizada' : 'Pendiente'} | Notas: ${s.contexto_sesion || 'Sin notas'}`).join('\n')}
Fichas post-sesión:
${notasDelPaciente.map(n => `  - ${n.titulo}: ${n.contenido}`).join('\n')}
`
    }).join('\n---\n')

    const prompt = `Sos una asistente para terapeutas holísticas. Tenés acceso a los datos de los pacientes de esta terapeuta. Respondé en español rioplatense, de forma clara y directa.

DATOS DE LOS PACIENTES:
${contexto}

FECHA Y HORA ACTUAL: ${new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}

PREGUNTA DE LA TERAPEUTA: ${pregunta}

INSTRUCCIONES DE RESPUESTA:
- Respondé en máximo 2-3 líneas
- Sé directa y concisa, sin explicar tu razonamiento
- No uses formato markdown, no uses asteriscos ni guiones
- Si no tenés el dato exacto, dalo aproximado sin explicaciones
- Hablá como una asistente eficiente, no como una IA`

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://lumaapp.lat',
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3.5-lightning:free',
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const json = await res.json()
    console.log('OPENROUTER RESPONSE:', JSON.stringify(json).slice(0, 500))
    const respuesta = json.choices?.[0]?.message?.content || 'No pude procesar tu consulta.'

    return NextResponse.json({ respuesta })
  } catch (err) {
    console.error('Error IA:', JSON.stringify(err))
    return NextResponse.json({ error: 'Error al consultar la IA' }, { status: 500 })
  }
}