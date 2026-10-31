'use client'
// Un Documento del Altar (solo Premium). Con Básico no se abre: se explica y los textos quedan guardados.
// La base vuelve a revisar todo (tabla documentos): aunque alguien se saltee esta pantalla, no lee ni guarda nada.
import { useContext, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Lock, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { PlanAltar } from '@/components/altar/PlanAltar'
import EditorDocumento from '@/components/altar/EditorDocumento'
import type { DocumentoFila } from '@/lib/documento'

export default function PaginaDocumento() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { nivel, userId } = useContext(PlanAltar)
  const [fila, setFila] = useState<DocumentoFila | null>(null)
  const [noEsta, setNoEsta] = useState(false)
  const [autora, setAutora] = useState('')

  useEffect(() => {
    if (nivel !== 'premium') return
    let vivo = true
    ;(async () => {
      try {
        const s = createClient()
        const [{ data }, { data: perfil }] = await Promise.all([
          s.from('documentos').select('*').eq('id', id).is('borrada_en', null).maybeSingle(),
          s.from('therapist_profiles').select('nombre_profesional').eq('user_id', userId).maybeSingle(),
        ])
        if (!vivo) return
        if (!data) { setNoEsta(true); return }
        setAutora((perfil as any)?.nombre_profesional || '')
        setFila(data as DocumentoFila)
      } catch { if (vivo) setNoEsta(true) }
    })()
    return () => { vivo = false }
  }, [id, nivel, userId])

  if (nivel !== 'premium') return (
    <div style={{ maxWidth: 460, margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}>
      <span style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--al-suave)', color: 'var(--al-acento)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Lock size={28} /></span>
      <div className="al-f" style={{ fontSize: 26, margin: '14px 0 8px' }}>El Documento es de Premium</div>
      <div style={{ color: 'var(--al-texto2)', fontWeight: 700, marginBottom: 22, lineHeight: 1.5 }}>Escribí tus guiones en hojas A4 y bajalos en PDF. Si ya tenías documentos, siguen guardados y vuelven cuando tengas Premium.</div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/suscripcion" style={{ height: 46, padding: '0 20px', borderRadius: 23, background: 'var(--al-acento)', color: 'var(--al-sobre-acento)', font: '900 14.5px Nunito,sans-serif', display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>Ver Premium</Link>
        <Link href="/altar" style={{ height: 46, padding: '0 20px', borderRadius: 23, border: '1.5px solid var(--al-borde)', color: 'var(--al-texto)', font: '800 14.5px Nunito,sans-serif', display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>Volver al Altar</Link>
      </div>
    </div>
  )
  if (noEsta) return (
    <div style={{ padding: '80px 20px', textAlign: 'center' }}>
      <FileText size={30} color="var(--al-acento)" />
      <div className="al-f" style={{ fontSize: 24, margin: '10px 0 8px' }}>Este documento no está</div>
      <div style={{ color: 'var(--al-texto2)', fontWeight: 700, marginBottom: 20 }}>Puede que esté en la papelera o que se haya borrado.</div>
      <Link href="/altar" style={{ color: 'var(--al-acento)', fontWeight: 900 }}>Volver al Altar</Link>
    </div>
  )
  if (!fila) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--al-texto2)', fontSize: 14 }}>Cargando…</div>
  return <EditorDocumento key={fila.id} fila={fila} autora={autora} onPapelera={() => router.push('/altar')} />
}
