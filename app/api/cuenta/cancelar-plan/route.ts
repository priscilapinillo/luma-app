import { NextRequest, NextResponse } from 'next/server'
import { db, cancelarCobroAutomatico } from '@/lib/planLuma'

// "Cancelar cobro automático" desde Ajustes. Solo la dueña de la cuenta (por su sesión).
// Conserva todo hasta el último día pagado; no se le vuelve a cobrar.
export const maxDuration = 26

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || ''
    if (!auth.startsWith('Bearer ')) return NextResponse.json({ ok: false, error: 'Iniciá sesión de nuevo.' }, { status: 401 })
    const { data: { user }, error } = await db().auth.getUser(auth.slice(7))
    if (error || !user) return NextResponse.json({ ok: false, error: 'Iniciá sesión de nuevo.' }, { status: 401 })
    const r = await cancelarCobroAutomatico(user.id)
    return NextResponse.json(r, { status: r.ok ? 200 : 400 })
  } catch (e) {
    console.error('cancelar-plan:', e)
    return NextResponse.json({ ok: false, error: 'No pudimos cancelar. Probá de nuevo en unos minutos.' }, { status: 500 })
  }
}
