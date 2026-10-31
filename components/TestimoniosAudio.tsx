'use client'
// Ajustes → Testimonios: subir un audio de WhatsApp, recortarlo (hasta 30 s), escribir qué dice y quién es,
// con permiso obligatorio. Básico 3, Premium 15. Todo el recorte y la compresión pasan en el celu de la terapeuta.
import { useEffect, useRef, useState } from 'react'
import { Mic, Play, Pause, Trash2, X, Loader2, Scissors } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { toast } from '@/components/ToastProvider'
import { abrirAudio, comprimirRecorte, onda, minSeg, MAX_SEGUNDOS, LIMITE_AUDIOS, type AudioAbierto } from '@/lib/audioTestimonio'
import AudioTestimonio, { type TestimonioAudio } from '@/components/AudioTestimonio'

const BALDE = 'testimonios-audio'

export default function TestimoniosAudio({ nivel, servicios }: { nivel: 'premium' | 'basico' | 'sin_acceso' | null; servicios: string[] }) {
  const [lista, setLista] = useState<TestimonioAudio[] | null>(null)
  const [sinTabla, setSinTabla] = useState(false)
  const [abriendo, setAbriendo] = useState(false)
  const [audio, setAudio] = useState<AudioAbierto | null>(null)
  const [nombreArchivo, setNombreArchivo] = useState('')
  const [desde, setDesde] = useState(0)
  const [hasta, setHasta] = useState(0)
  const [frase, setFrase] = useState('')
  const [nombre, setNombre] = useState('')
  const [servicio, setServicio] = useState('')
  const [permiso, setPermiso] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [borrando, setBorrando] = useState<string | null>(null)
  const [sonando, setSonando] = useState(false)
  const input = useRef<HTMLInputElement | null>(null)
  const ctxRef = useRef<{ ctx: AudioContext; src: AudioBufferSourceNode } | null>(null)
  const limite = nivel === 'premium' ? LIMITE_AUDIOS.premium : nivel === 'basico' ? LIMITE_AUDIOS.basico : 0

  useEffect(() => { cargar() }, [])
  useEffect(() => () => pararRecorte(), [])

  async function cargar() {
    try {
      const s = createClient()
      const { data: { user } } = await s.auth.getUser()
      if (!user) return
      const { data, error } = await s.from('testimonios_audio').select('id, path, duracion, nombre, frase, servicio, orden').eq('terapeuta_id', user.id).order('orden', { ascending: true })
      if (error) { setSinTabla(true); setLista([]); return }
      setLista((data || []).map(r => ({ ...r, url: s.storage.from(BALDE).getPublicUrl(r.path).data.publicUrl, frase: r.frase || '', servicio: r.servicio || '' })))
    } catch { setLista([]) }
  }

  async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setAbriendo(true)
    try {
      const a = await abrirAudio(f)
      if (a.duracion < 1) throw new Error('Ese audio está vacío o es muy corto.')
      setAudio(a); setNombreArchivo(f.name)
      setDesde(0); setHasta(Math.min(a.duracion, MAX_SEGUNDOS))
      setFrase(''); setNombre(''); setServicio(''); setPermiso(false)
    } catch (err) {
      toast((err as Error).message || 'No pudimos abrir ese audio.', 'error')
    } finally { setAbriendo(false) }
  }

  function cerrar() { pararRecorte(); setAudio(null) }

  // cierra el reproductor del recorte una sola vez (cerrarlo dos veces tira error en el navegador)
  function cerrarCtx(ctx: AudioContext) { if (ctx.state !== 'closed') ctx.close().catch(() => {}) }
  function pararRecorte() {
    const actual = ctxRef.current
    ctxRef.current = null
    if (actual) {
      actual.src.onended = null
      try { actual.src.stop() } catch {}
      cerrarCtx(actual.ctx)
    }
    setSonando(false)
  }
  function escucharRecorte() {
    if (!audio) return
    if (sonando) { pararRecorte(); return }
    try {
      const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)
      const ctx = new Ctx()
      const buf = ctx.createBuffer(1, audio.muestras.length, audio.tasa)
      buf.copyToChannel(new Float32Array(audio.muestras), 0)
      const src = ctx.createBufferSource()
      src.buffer = buf; src.connect(ctx.destination)
      src.onended = () => { if (ctxRef.current?.ctx === ctx) ctxRef.current = null; setSonando(false); cerrarCtx(ctx) }
      src.start(0, desde, hasta - desde)
      ctxRef.current = { ctx, src }; setSonando(true)
    } catch { toast('No se pudo reproducir el recorte en este celu.', 'error') }
  }

  // los dos extremos del recorte: nunca más de 30 segundos ni menos de 1
  function moverDesde(v: number) {
    const d = Math.min(Math.max(0, v), Math.max(0, (audio?.duracion || 0) - 1))
    setDesde(d)
    if (hasta - d > MAX_SEGUNDOS) setHasta(d + MAX_SEGUNDOS)
    if (hasta - d < 1) setHasta(Math.min(audio?.duracion || 0, d + 1))
  }
  function moverHasta(v: number) {
    const h = Math.max(Math.min(audio?.duracion || 0, v), 1)
    setHasta(h)
    if (h - desde > MAX_SEGUNDOS) setDesde(h - MAX_SEGUNDOS)
    if (h - desde < 1) setDesde(Math.max(0, h - 1))
  }

  async function guardar() {
    if (!audio || guardando) return
    if (!nombre.trim()) { toast('Escribí el nombre (por ejemplo «Camila · Rosario»).', 'error'); return }
    if (!permiso) { toast('Marcá que tenés su permiso para publicarlo.', 'error'); return }
    setGuardando(true); pararRecorte()
    try {
      const { blob, duracion } = await comprimirRecorte(audio, desde, hasta)
      const s = createClient()
      const { data: { session } } = await s.auth.getSession()
      const fd = new FormData()
      fd.append('audio', blob, 'testimonio.mp3')
      fd.append('nombre', nombre); fd.append('frase', frase); fd.append('servicio', servicio)
      fd.append('duracion', String(duracion)); fd.append('permiso', permiso ? 'si' : 'no')
      const res = await fetch('/api/testimonios-audio', { method: 'POST', headers: { Authorization: `Bearer ${session?.access_token || ''}` }, body: fd })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.ok) { toast(j.mensaje || 'No se pudo guardar. Probá de nuevo.', 'error'); return }
      const t = j.testimonio
      setLista(prev => [...(prev || []), { ...t, url: s.storage.from(BALDE).getPublicUrl(t.path).data.publicUrl, frase: t.frase || '', servicio: t.servicio || '' }])
      setAudio(null)
      toast('Testimonio guardado. Ya se escucha en tu página.', 'success')
    } catch (err) {
      toast((err as Error).message || 'No se pudo guardar. Revisá tu conexión.', 'error')
    } finally { setGuardando(false) }
  }

  async function borrar(id: string) {
    if (borrando) return
    if (!window.confirm('¿Borrar este testimonio? Deja de verse en tu página.')) return
    setBorrando(id)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      const res = await fetch(`/api/testimonios-audio?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${session?.access_token || ''}` } })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.ok) { toast(j.mensaje || 'No se pudo borrar.', 'error'); return }
      setLista(prev => (prev || []).filter(x => x.id !== id))
      toast('Testimonio borrado')
    } catch {
      toast('No se pudo borrar. Revisá tu conexión e intentá de nuevo.', 'error')
    } finally { setBorrando(null) }
  }

  if (sinTabla) return null // todavía no se corrió el SQL de la etapa 8: no mostramos nada que no funcione
  const cantidad = lista?.length || 0
  const lleno = cantidad >= limite
  const barras = audio ? onda(audio, 56) : []
  const colores = { fondo: 'var(--bg-card)', texto: 'var(--text-primary)', suave: 'var(--text-secondary)', acento: 'var(--accent)', sobreAcento: 'var(--bg-card)', ondaOff: 'var(--border)', chip: 'var(--bg-input)', chipTxt: 'var(--text-secondary)', titulo: 'inherit' }

  return (
    <div className="ta">
      <style>{`
        .ta{display:flex;flex-direction:column;gap:10px;margin-bottom:14px}
        .ta-tit{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px}
        .ta-cuenta{font-size:11.5px;text-transform:none;letter-spacing:0;font-weight:600}
        .ta-item{display:flex;gap:8px;align-items:flex-start}
        .ta-item>div{flex:1;min-width:0}
        .ta-borrar{width:34px;height:34px;border-radius:10px;border:1px solid var(--border);background:var(--bg-card);color:var(--vencido);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;margin-top:6px}
        .ta-agregar{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:12px;border-radius:12px;border:1.5px dashed var(--border);background:transparent;font:600 13px inherit;font-family:inherit;color:var(--text-secondary);cursor:pointer;transition:border-color .2s,color .2s,transform .15s}
        .ta-agregar:hover:not(:disabled){border-color:var(--accent);color:var(--text-primary)}
        .ta-agregar:active:not(:disabled){transform:scale(.98)}
        .ta-agregar:disabled{opacity:.6;cursor:default}
        .ta-form{background:var(--bg-input);border:1px solid var(--border);border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:12px;animation:taEntra .2s ease}
        @keyframes taEntra{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
        .ta-form-cab{display:flex;align-items:center;gap:8px}
        .ta-form-cab b{flex:1;font-size:14px;color:var(--text-primary)}
        .ta-x{width:32px;height:32px;border-radius:10px;border:none;background:var(--bg-card);color:var(--text-muted);display:flex;align-items:center;justify-content:center;cursor:pointer}
        .ta-ayuda{font-size:12.5px;color:var(--text-secondary);line-height:1.45}
        .ta-onda{position:relative;height:64px;display:flex;align-items:center;gap:2px;padding:0 2px;border-radius:12px;background:var(--bg-card);cursor:pointer;touch-action:none}
        .ta-onda span{flex:1;min-width:1px;border-radius:2px;transition:background .1s}
        .ta-rango{display:grid;grid-template-columns:auto 1fr;gap:6px 10px;align-items:center;font-size:12px;color:var(--text-secondary)}
        .ta-rango input[type=range]{width:100%;accent-color:var(--accent);height:28px}
        .ta-sel{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
        .ta-chip{font-size:12px;font-weight:700;background:var(--accent-light);color:var(--text-primary);padding:6px 10px;border-radius:12px}
        .ta-btn2{height:38px;padding:0 14px;border-radius:19px;border:1.5px solid var(--text-primary);background:transparent;color:var(--text-primary);font:700 12.5px inherit;font-family:inherit;display:inline-flex;align-items:center;gap:6px;cursor:pointer}
        .ta-campo{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:700;color:var(--text-primary)}
        .ta-campo input,.ta-campo textarea{padding:10px 12px;border-radius:12px;border:1px solid var(--border);background:var(--bg-card);font:500 13.5px inherit;font-family:inherit;color:var(--text-primary);outline:none;resize:none}
        .ta-dos{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .ta-permiso{display:flex;gap:10px;align-items:flex-start;background:var(--pink-light);border-radius:12px;padding:11px 12px;font-size:12.5px;font-weight:600;color:var(--text-primary);line-height:1.4;cursor:pointer}
        .ta-permiso input{width:20px;height:20px;margin:0;accent-color:var(--accent);flex-shrink:0}
        .ta-guardar{height:48px;border-radius:24px;border:none;background:var(--gradient-boton);color:#fff;font:700 14.5px inherit;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;transition:transform .15s}
        .ta-guardar:active:not(:disabled){transform:scale(.97)}
        .ta-guardar:disabled{opacity:.6}
        .ta-girar{animation:taGira 1s linear infinite}
        @keyframes taGira{to{transform:rotate(360deg)}}
        @media(max-width:480px){.ta-dos{grid-template-columns:1fr}}
        @media (prefers-reduced-motion:reduce){.ta-form,.ta-girar{animation:none}}
      `}</style>
      <div className="ta-tit">
        <span>Testimonios en audio</span>
        {lista && limite > 0 && <span className="ta-cuenta">{cantidad} de {limite}</span>}
      </div>

      {lista === null && <div className="ta-ayuda">Cargando…</div>}
      {lista?.map(t => (
        <div key={t.id} className="ta-item">
          <div><AudioTestimonio t={t} colores={colores}/></div>
          <button type="button" className="ta-borrar" aria-label={`Borrar el testimonio de ${t.nombre}`} disabled={borrando === t.id} onClick={() => borrar(t.id)}>
            {borrando === t.id ? <Loader2 size={15} className="ta-girar"/> : <Trash2 size={15}/>}
          </button>
        </div>
      ))}
      {nivel === 'basico' && cantidad > LIMITE_AUDIOS.basico && (
        <div className="pr-aviso">Con el plan Básico tu página muestra los primeros {LIMITE_AUDIOS.basico}. Los demás quedan guardados y vuelven a verse con Premium.</div>
      )}

      {audio ? (
        <div className="ta-form">
          <div className="ta-form-cab">
            <Scissors size={16}/><b>Recortá el audio</b>
            <button type="button" className="ta-x" aria-label="Cancelar" onClick={cerrar}><X size={16}/></button>
          </div>
          <div className="ta-ayuda">{nombreArchivo} · {minSeg(audio.duracion)}. Mové los dos controles hasta la parte que querés mostrar. Máximo {MAX_SEGUNDOS} segundos.</div>
          <div className="ta-onda" aria-hidden="true"
            onPointerDown={e => {
              const r = e.currentTarget.getBoundingClientRect()
              const seg = ((e.clientX - r.left) / r.width) * audio.duracion
              if (Math.abs(seg - desde) < Math.abs(seg - hasta)) moverDesde(seg); else moverHasta(seg)
            }}>
            {barras.map((h, i) => {
              const seg = (i / barras.length) * audio.duracion
              const dentro = seg >= desde && seg <= hasta
              return <span key={i} style={{ height: `${Math.round(h * 90)}%`, background: dentro ? 'var(--accent)' : 'var(--border)' }}/>
            })}
          </div>
          <div className="ta-rango">
            <span>Desde</span>
            <input type="range" min={0} max={audio.duracion} step={0.1} value={desde} onChange={e => moverDesde(Number(e.target.value))} aria-label="Desde qué segundo"/>
            <span>Hasta</span>
            <input type="range" min={0} max={audio.duracion} step={0.1} value={hasta} onChange={e => moverHasta(Number(e.target.value))} aria-label="Hasta qué segundo"/>
          </div>
          <div className="ta-sel">
            <span className="ta-chip">{minSeg(desde)} → {minSeg(hasta)} · {Math.round(hasta - desde)} s</span>
            <button type="button" className="ta-btn2" onClick={escucharRecorte}>{sonando ? <Pause size={14}/> : <Play size={14}/>}{sonando ? 'Parar' : 'Escuchar el recorte'}</button>
          </div>
          <label className="ta-campo">¿Qué dice? (se muestra debajo del audio)
            <textarea rows={2} maxLength={200} value={frase} onChange={e => setFrase(e.target.value)} placeholder="Me ayudó a entender por qué repito siempre la misma historia."/>
          </label>
          <div className="ta-dos">
            <label className="ta-campo">Nombre
              <input maxLength={60} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Camila · Rosario"/>
            </label>
            <label className="ta-campo">Servicio (opcional)
              <input maxLength={60} value={servicio} onChange={e => setServicio(e.target.value)} placeholder="Lectura vincular" list="ta-servicios"/>
              <datalist id="ta-servicios">{servicios.map(s => <option key={s} value={s}/>)}</datalist>
            </label>
          </div>
          <label className="ta-permiso">
            <input type="checkbox" checked={permiso} onChange={e => setPermiso(e.target.checked)}/>
            Tengo permiso de esta persona para publicar su audio en mi página.
          </label>
          <button type="button" className="ta-guardar" onClick={guardar} disabled={guardando}>
            {guardando ? <><Loader2 size={16} className="ta-girar"/>Guardando…</> : 'Guardar testimonio'}
          </button>
        </div>
      ) : (<>
        <input ref={input} type="file" accept="audio/*,.opus,.ogg,.m4a,.mp3,.aac,.wav" style={{ display: 'none' }} onChange={elegir}/>
        <button type="button" className="ta-agregar" disabled={abriendo || lista === null || lleno} onClick={() => input.current?.click()}>
          {abriendo ? <><Loader2 size={15} className="ta-girar"/>Abriendo el audio…</>
            : limite === 0 ? 'Renová tu plan para sumar audios'
            : lleno ? (nivel === 'premium' ? `Llegaste a los ${limite} audios` : `Llegaste a los ${limite} audios del plan Básico`)
            : <><Mic size={15}/>Agregar testimonio en audio</>}
        </button>
        {!lleno && limite > 0 && <div className="ta-ayuda">Elegí un audio de WhatsApp o una nota de voz. Lo recortás acá mismo y queda liviano.</div>}
      </>)}
    </div>
  )
}
