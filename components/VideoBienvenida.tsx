'use client'
// Video de bienvenida del Inicio. Priscila lo pega en Admin (luma_config: video_bienvenida). «Ya lo vi» se guarda en la cuenta
// (sirve en todos los dispositivos); si Priscila cambia el video, vuelve a aparecer.
import { useEffect, useState } from 'react'
import { PlayCircle, X, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { detectarContenido } from '@/lib/contenido'
import { toast } from '@/components/ToastProvider'

export default function VideoBienvenida() {
  const [video, setVideo] = useState<{ url: string; titulo: string } | null>(null)
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const s = createClient()
        const [{ data: cfg }, { data: { user } }] = await Promise.all([
          s.from('luma_config').select('valor').eq('clave', 'video_bienvenida').maybeSingle(),
          s.auth.getUser(),
        ])
        const url = String((cfg?.valor as any)?.url || '')
        if (!url || !user) return
        if (user.user_metadata?.video_bienvenida_visto === url) return
        setVideo({ url, titulo: String((cfg?.valor as any)?.titulo || 'Bienvenida a Luma') })
      } catch {}
    })()
  }, [])

  if (!video) return null
  const c = detectarContenido(video.url, 'video')
  if (!c || c.visor === 'link') return null
  const src = c.embedUrl.replace('www.youtube.com/embed', 'www.youtube-nocookie.com/embed') + (c.embedUrl.includes('?') ? '&' : '?') + 'autoplay=1&rel=0'

  async function yaLoVi() {
    const url = video!.url
    setVideo(null)
    const { error } = await createClient().auth.updateUser({ data: { video_bienvenida_visto: url } })
    if (error) toast('No pudimos guardarlo: puede que lo veas de nuevo.', 'info')
    else toast('Listo, no aparece más.')
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 20, padding: abierto ? 12 : '12px 14px', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => setAbierto(a => !a)} aria-expanded={abierto} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, border: 'none', background: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', color: 'var(--text-primary)', fontFamily: 'inherit' }}>
          <PlayCircle size={26} color="var(--accent)" style={{ flexShrink: 0 }}/>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{video.titulo}</span>
            <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-muted)' }}>{abierto ? 'Tocá acá para cerrarlo' : 'Un video cortito para arrancar'}</span>
          </span>
        </button>
        <button onClick={yaLoVi} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
          <Check size={13}/> Ya lo vi
        </button>
        {abierto && <button onClick={() => setAbierto(false)} aria-label="Cerrar video" style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><X size={16}/></button>}
      </div>
      {abierto && (
        <div className="luma-desplegable luma-desplegable-izq" style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 14, overflow: 'hidden', background: '#000', marginTop: 10 }}>
          <iframe src={src} title={video.titulo} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}/>
        </div>
      )}
    </div>
  )
}
