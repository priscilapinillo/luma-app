'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { ControlVideo } from '@/components/VisorContenido'
import {
  type Apunte, type ContextoLeccion, TOPE_CAPTURAS,
  apuntesDeLeccion, guardarNota, crearApunte, borrarApunte, subirCaptura, contarCapturas, linksDeCapturas,
  limpiarHtml, guardarNotaLocal, notaLocal, borrarNotaLocal, formatoMinuto,
} from '@/lib/aula'
import { achicarCaptura } from '@/lib/imagenCaptura'

type Estado = '' | 'guardando' | 'guardado' | 'offline' | 'error'

// La pizarra de apuntes de cada lección. Privada: solo la ve la alumna.
export default function Cuaderno({ ctx, control, esTexto, zonaTexto, pausarAlEscribir, onPausarAlEscribir, hrefCuaderno }: {
  ctx: ContextoLeccion
  control: ControlVideo | null
  esTexto: boolean
  zonaTexto: RefObject<HTMLElement | null>
  pausarAlEscribir: boolean
  onPausarAlEscribir: (v: boolean) => void
  hrefCuaderno: string
}) {
  const editorRef = useRef<HTMLDivElement | null>(null)
  const notaIdRef = useRef<string | null>(null)
  const baseRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendienteRef = useRef(false)
  const guardandoRef = useRef(false)
  // el componente se monta de nuevo en cada lección (key = lección): ctx no cambia mientras vive
  const ctxRef = useRef(ctx)
  const htmlRef = useRef('')

  const [cargando, setCargando] = useState(true)
  const [vacio, setVacio] = useState(true)
  const [estado, setEstado] = useState<Estado>('')
  const [avisoOtro, setAvisoOtro] = useState(false)
  const [apuntes, setApuntes] = useState<Apunte[]>([])
  const [fotos, setFotos] = useState<Record<string, string>>({})
  const [momento, setMomento] = useState<{ segundo: number; texto: string } | null>(null)
  const [duracion, setDuracion] = useState(0)
  const [frase, setFrase] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const [abierto, setAbierto] = useState(true)
  const archivoRef = useRef<HTMLInputElement | null>(null)

  // ── cargar lo guardado de esta lección
  useEffect(() => {
    let vivo = true
    setCargando(true); setApuntes([]); setEstado(''); setAvisoOtro(false); setMomento(null); setMensaje('')
    notaIdRef.current = null; baseRef.current = null
    ;(async () => {
      let html = ''
      try {
        const lista = await apuntesDeLeccion(ctx.personId, ctx.lessonId)
        if (!vivo) return
        const nota = lista.find(a => a.tipo === 'nota')
        if (nota) { notaIdRef.current = nota.id; baseRef.current = nota.updated_at; html = nota.contenido }
        const resto = lista.filter(a => a.tipo !== 'nota')
        setApuntes(resto)
        const paths = resto.map(a => a.imagen_path).filter(Boolean) as string[]
        if (paths.length) linksDeCapturas(paths).then(l => { if (vivo) setFotos(l) }).catch(() => null)
        // lo que quedó sin subir por falta de internet gana si es más nuevo
        const local = notaLocal(ctx.lessonId)
        if (local && (!nota || local.at > new Date(nota.updated_at).getTime())) { html = local.html; pendienteRef.current = true }
      } catch {
        const local = notaLocal(ctx.lessonId)
        if (local) { html = local.html; pendienteRef.current = true }
        if (vivo) setEstado('offline')
      }
      if (!vivo) return
      htmlRef.current = limpiarHtml(html)
      if (editorRef.current) editorRef.current.innerHTML = htmlRef.current
      setVacio(!editorRef.current?.textContent?.replace(/\u200B/g, '').trim())
      setCargando(false)
      if (pendienteRef.current) programarGuardado(200)
    })()
    return () => {
      vivo = false
      if (timerRef.current) clearTimeout(timerRef.current)
      // al cambiar de lección o salir: lo que falta subir queda en el celular y se sube ya
      if (pendienteRef.current) {
        const c = ctxRef.current, h = htmlRef.current
        guardarNotaLocal(c, h)
        const at = Date.now()
        guardarNota(c, h, notaIdRef.current, null).then(() => borrarNotaLocal(c.lessonId, at)).catch(() => null)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── guardar (se guarda solo, 1 segundo después de dejar de escribir)
  const guardarAhora = useCallback(async () => {
    timerRef.current = null
    if (!pendienteRef.current) return
    if (guardandoRef.current) { programarGuardado(800); return }
    // sin internet: queda guardado en el celular y se sube solo cuando vuelve
    if (typeof navigator !== 'undefined' && !navigator.onLine) { setEstado('offline'); return }
    const html = editorRef.current ? editorRef.current.innerHTML : htmlRef.current
    const c = ctxRef.current
    const momentoLocal = Date.now()
    guardarNotaLocal(c, html)
    pendienteRef.current = false
    guardandoRef.current = true
    setEstado('guardando')
    try {
      const r = await guardarNota(c, html, notaIdRef.current, baseRef.current)
      notaIdRef.current = r.id; baseRef.current = r.updated_at
      borrarNotaLocal(c.lessonId, momentoLocal)
      if (r.otroDispositivo) setAvisoOtro(true)
      setEstado('guardado')
    } catch {
      pendienteRef.current = true
      setEstado(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error')
    } finally { guardandoRef.current = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const programarGuardado = useCallback((ms = 1000) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(guardarAhora, ms)
  }, [guardarAhora])

  // al volver internet, o al salir de la página, se sube lo pendiente
  useEffect(() => {
    const online = () => { if (pendienteRef.current) programarGuardado(300) }
    const salir = () => { if (pendienteRef.current) guardarNotaLocal(ctxRef.current, htmlRef.current) }
    window.addEventListener('online', online)
    window.addEventListener('pagehide', salir)
    const reintento = setInterval(() => { if (pendienteRef.current && !timerRef.current && navigator.onLine) programarGuardado(100) }, 20000)
    return () => { window.removeEventListener('online', online); window.removeEventListener('pagehide', salir); clearInterval(reintento) }
  }, [programarGuardado])

  function alEscribir() {
    pendienteRef.current = true
    setVacio(!editorRef.current?.textContent?.replace(/\u200B/g, '').trim())
    if (editorRef.current) { htmlRef.current = editorRef.current.innerHTML; guardarNotaLocal(ctxRef.current, htmlRef.current) }
    // la pizarra de cada lección guarda hasta unas 4 carillas: avisamos antes de que se corte
    const largo = limpiarHtml(htmlRef.current).length
    if (largo > 19000) setMensaje('Esta pizarra está casi llena. Si querés seguir escribiendo, usá "Marcar momento" o anotá en la próxima lección.')
    setEstado(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'guardando')
    programarGuardado()
  }

  // ── resaltar
  // ── resaltar / sacar color
  // marca de resaltado que contiene a este nodo (dentro del cuaderno)
  function marcaDe(n: Node | null, el: HTMLElement): HTMLElement | null {
    while (n && n !== el) {
      if (n.nodeType === Node.ELEMENT_NODE && (n as Element).tagName === 'MARK') return n as HTMLElement
      n = n.parentNode
    }
    return null
  }
  // corta los resaltados en el punto donde está el cursor, para que lo que se escriba o pegue ahí quede afuera
  function salirDeMarcas(el: HTMLElement, r: Range) {
    let m = marcaDe(r.startContainer, el)
    while (m) {
      const resto = document.createRange()
      resto.setStart(r.startContainer, r.startOffset)
      resto.setEnd(m, m.childNodes.length)
      const despues = resto.extractContents()
      const otra = m.cloneNode(false) as HTMLElement
      otra.appendChild(despues)
      m.after(otra)
      if (!otra.textContent) otra.remove()
      r.setStartAfter(m); r.collapse(true)
      if (!m.textContent) m.remove()
      m = marcaDe(r.startContainer, el)
    }
  }
  // deja el cursor después de "nodo" y fuera de cualquier color (con un espacio invisible que se borra al guardar)
  function cursorSinColor(nodo: Node) {
    const sel = window.getSelection()
    if (!sel) return
    const invisible = document.createTextNode('\u200B')
    nodo.parentNode?.insertBefore(invisible, nodo.nextSibling)
    const r = document.createRange()
    r.setStart(invisible, 1); r.collapse(true)
    sel.removeAllRanges(); sel.addRange(r)
  }

  function resaltar(clase: 'm1' | 'm2' | 'm3' | null) {
    const el = editorRef.current
    const sel = window.getSelection()
    if (!el || !sel || sel.rangeCount === 0) { setMensaje('Marcá primero con el dedo o el mouse el texto que querés resaltar.'); return }
    const r = sel.getRangeAt(0)
    if (!el.contains(r.commonAncestorContainer)) { setMensaje('Tocá adentro de tu cuaderno primero.'); return }
    setMensaje('')

    // sin nada marcado: "Sin color" hace que lo próximo que escribas salga sin resaltar
    if (sel.isCollapsed) {
      if (!clase) {
        if (!marcaDe(r.startContainer, el)) { el.focus(); return }
        salirDeMarcas(el, r)
        const ancla = document.createTextNode('')
        r.insertNode(ancla)
        cursorSinColor(ancla)
        el.focus()
        return
      }
      setMensaje('Marcá primero con el dedo o el mouse el texto que querés resaltar.')
      return
    }

    const frag = r.extractContents()
    // sacamos resaltados viejos dentro de lo marcado
    frag.querySelectorAll('mark').forEach(m => m.replaceWith(...Array.from(m.childNodes)))
    // si lo marcado estaba adentro de un resaltado, lo cortamos para que el color nuevo (o ninguno) quede bien
    salirDeMarcas(el, r)
    let ultimo: Node | null
    if (clase) {
      const mark = document.createElement('mark')
      mark.className = clase
      mark.appendChild(frag)
      r.insertNode(mark)
      ultimo = mark
    } else {
      ultimo = frag.lastChild
      r.insertNode(frag)
    }
    // lo que escribas después ya sale sin color
    if (ultimo) cursorSinColor(ultimo)
    el.focus()
    alEscribir()
  }

  // ── pegar: solo texto (sin estilos raros de otras páginas)
  function alPegar(e: React.ClipboardEvent) {
    e.preventDefault()
    const t = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, t)
  }

  // ── pausar al escribir (opcional)
  function alEnfocar() { if (pausarAlEscribir && control) control.pausar() }

  // ── duración del video para las marquitas doradas
  useEffect(() => {
    setDuracion(0)
    if (!control) return
    let vivo = true
    const pedir = (n: number) => control.duracion().then(d => { if (!vivo) return; if (d > 0) setDuracion(d); else if (n < 10) setTimeout(() => pedir(n + 1), 1500) })
    pedir(0)
    return () => { vivo = false }
  }, [control])

  async function marcarMomento() {
    if (!control) return
    const s = await control.tiempo()
    if (pausarAlEscribir) control.pausar()
    setMomento({ segundo: Math.floor(s), texto: '' })
  }
  async function guardarMomento() {
    if (!momento) return
    try {
      const a = await crearApunte(ctx, 'momento', { contenido: momento.texto.trim(), segundo: momento.segundo })
      setApuntes(prev => [...prev, a]); setMomento(null)
    } catch { setMensaje('No se pudo guardar el momento. Revisá tu conexión.') }
  }

  // ── frase (lecciones de texto): se toma lo que la alumna marcó en el texto de la lección
  useEffect(() => {
    if (!esTexto) return
    const cambio = () => {
      const sel = window.getSelection()
      const zona = zonaTexto.current
      if (!sel || sel.isCollapsed || !zona || sel.rangeCount === 0) return
      if (!zona.contains(sel.getRangeAt(0).commonAncestorContainer)) return
      setFrase(sel.toString().trim().slice(0, 2000))
    }
    document.addEventListener('selectionchange', cambio)
    return () => document.removeEventListener('selectionchange', cambio)
  }, [esTexto, zonaTexto])

  async function guardarFrase() {
    if (!frase) { setMensaje('Marcá en el texto de la lección la frase que querés guardar.'); return }
    try {
      const a = await crearApunte(ctx, 'frase', { contenido: frase })
      setApuntes(prev => [...prev, a]); setFrase(''); setMensaje('')
      window.getSelection()?.removeAllRanges()
    } catch { setMensaje('No se pudo guardar la frase. Revisá tu conexión.') }
  }

  // ── captura
  async function elegirCaptura(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setMensaje(''); setSubiendo(true)
    try {
      const ya = await contarCapturas(ctx.personId, ctx.courseId)
      if (ya >= TOPE_CAPTURAS) throw new Error(`Llegaste al tope de ${TOPE_CAPTURAS} capturas en este curso. Borrá alguna para subir otra.`)
      const seg = control ? Math.floor(await control.tiempo()) : null
      const chica = await achicarCaptura(file)
      const a = await subirCaptura(ctx, chica, seg, '')
      setApuntes(prev => [...prev, a])
      if (a.imagen_path) linksDeCapturas([a.imagen_path]).then(l => setFotos(prev => ({ ...prev, ...l }))).catch(() => null)
    } catch (err: unknown) {
      setMensaje((err as Error)?.message || 'No se pudo subir la captura.')
    } finally { setSubiendo(false) }
  }

  async function borrar(a: Apunte) {
    if (!confirm('¿Borrar este apunte?')) return
    try { await borrarApunte(a); setApuntes(prev => prev.filter(x => x.id !== a.id)) }
    catch { setMensaje('No se pudo borrar. Revisá tu conexión.') }
  }

  const momentos = apuntes.filter(a => a.tipo === 'momento' || (a.tipo === 'captura' && a.segundo != null && control))
  const textoEstado = {
    '': '', guardando: 'Guardando…', guardado: 'Guardado ✓',
    offline: 'Sin conexión · se guarda cuando vuelva', error: 'No se pudo guardar · reintentando',
  }[estado]

  return (
    <div className="cu">
      <style>{`
        .cu{margin-top:24px;background:#FFFDF7;border:1px solid #EADFC4;border-radius:16px;overflow:hidden}
        .cu-cab{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px;border-bottom:1px solid #F1E7CF;cursor:pointer}
        .cu-tit{font-size:14px;font-weight:800;color:#3B2A12}
        .cu-sub{font-size:11px;color:#A8862E;font-weight:600}
        .cu-body{padding:12px 16px 16px}
        .cu-barra{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-bottom:10px}
        .cu-btn{display:inline-flex;align-items:center;gap:5px;padding:7px 11px;border-radius:9px;border:1px solid #EADFC4;background:white;font-size:12px;font-weight:700;color:#5B4520;cursor:pointer;font-family:inherit}
        .cu-btn:disabled{opacity:.55;cursor:default}
        .cu-color{width:24px;height:24px;border-radius:50%;border:2px solid white;box-shadow:0 0 0 1px #E5D9BC;cursor:pointer;padding:0}
        .cu-ed{min-height:120px;padding:12px 14px;background:white;border:1px solid #EFE4C9;border-radius:12px;font-size:14px;line-height:1.7;color:#262626;outline:none;white-space:pre-wrap;overflow-wrap:anywhere}
        .cu-ed:focus{border-color:#C9A84C;box-shadow:0 0 0 3px rgba(201,168,76,.15)}
        .cu-ed mark{border-radius:3px;padding:0 1px;color:inherit}
        .cu-ed mark.m1,.cu-lista mark.m1{background:#FDE68A}.cu-ed mark.m2{background:#E9D5FF}.cu-ed mark.m3{background:#FBCFE8}
        .cu-ph{position:relative}.cu-ph-txt{position:absolute;left:15px;top:13px;font-size:14px;color:#B9AE96;pointer-events:none}
        .cu-pie{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px;font-size:11px;color:#8C7A55}
        .cu-msg{margin-top:8px;font-size:12px;padding:9px 11px;border-radius:9px;background:#FEF3C7;color:#92400E;line-height:1.45}
        .cu-lin{position:relative;height:8px;border-radius:6px;background:#F1E7CF;margin:12px 0 4px}
        .cu-pin{position:absolute;top:-3px;width:14px;height:14px;margin-left:-7px;border-radius:50%;background:#C9A84C;border:2px solid #FFFDF7;cursor:pointer;padding:0}
        .cu-lista{display:flex;flex-direction:column;gap:8px;margin-top:12px}
        .cu-item{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;background:white;border:1px solid #F1E7CF;border-radius:12px;font-size:13px;color:#404040;line-height:1.5}
        .cu-min{flex-shrink:0;font-weight:800;color:#A8862E;background:#FBF3DF;border:none;border-radius:7px;padding:3px 7px;font-size:12px;cursor:pointer;font-family:inherit}
        .cu-x{margin-left:auto;flex-shrink:0;border:none;background:none;color:#B9AE96;cursor:pointer;font-size:16px;line-height:1}
        .cu-foto{width:100%;max-width:260px;border-radius:10px;display:block;border:1px solid #EFE4C9}
        .cu-sw{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:#5B4520;cursor:pointer;user-select:none}
        .cu-sw input{width:16px;height:16px;accent-color:#A8862E}
      `}</style>

      <div className="cu-cab" onClick={() => setAbierto(!abierto)}>
        <div>
          <div className="cu-tit">📓 Mi cuaderno</div>
          <div className="cu-sub">Solo lo ves vos · se guarda solo</div>
        </div>
        <a href={hrefCuaderno} onClick={e => e.stopPropagation()} style={{ fontSize: '12px', fontWeight: 700, color: '#A8862E', textDecoration: 'none', whiteSpace: 'nowrap' }}>Ver todo →</a>
      </div>

      {(
        <div className="cu-body" style={{ display: abierto ? undefined : 'none' }}>
          <div className="cu-barra">
            <span style={{ fontSize: '11px', color: '#8C7A55', fontWeight: 700, marginRight: '2px' }}>Resaltar</span>
            <button type="button" className="cu-color" style={{ background: '#FDE68A' }} aria-label="Resaltar en amarillo" onMouseDown={e => e.preventDefault()} onClick={() => resaltar('m1')}/>
            <button type="button" className="cu-color" style={{ background: '#E9D5FF' }} aria-label="Resaltar en lila" onMouseDown={e => e.preventDefault()} onClick={() => resaltar('m2')}/>
            <button type="button" className="cu-color" style={{ background: '#FBCFE8' }} aria-label="Resaltar en rosa" onMouseDown={e => e.preventDefault()} onClick={() => resaltar('m3')}/>
            <button type="button" className="cu-btn" style={{ padding: '5px 8px' }} onMouseDown={e => e.preventDefault()} onClick={() => resaltar(null)}>Sin color</button>
            <span style={{ flex: 1 }}/>
            {control && <button type="button" className="cu-btn" onClick={marcarMomento}>📍 Marcar momento</button>}
            {esTexto && <button type="button" className="cu-btn" onMouseDown={e => e.preventDefault()} onClick={guardarFrase}>✍️ Guardar frase</button>}
            <button type="button" className="cu-btn" disabled={subiendo} onClick={() => archivoRef.current?.click()}>{subiendo ? 'Subiendo…' : '📷 Captura'}</button>
            <input ref={archivoRef} type="file" accept="image/*,.heic,.heif" style={{ display: 'none' }} onChange={elegirCaptura}/>
          </div>

          {momento && (
            <div className="cu-item" style={{ marginBottom: '10px', borderColor: '#C9A84C', flexWrap: 'wrap' }}>
              <span className="cu-min">📍 {formatoMinuto(momento.segundo)}</span>
              <input autoFocus value={momento.texto} maxLength={300} placeholder="¿Qué querés recordar de este momento?"
                onChange={e => setMomento({ ...momento, texto: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') guardarMomento() }}
                style={{ flex: 1, minWidth: '160px', border: 'none', outline: 'none', fontSize: '13px', fontFamily: 'inherit', background: 'transparent' }}/>
              <button type="button" className="cu-btn" onClick={guardarMomento}>Guardar</button>
              <button type="button" className="cu-btn" onClick={() => setMomento(null)}>Cancelar</button>
            </div>
          )}

          <div className="cu-ph">
            <div ref={editorRef} className="cu-ed" contentEditable={!cargando} suppressContentEditableWarning
              role="textbox" aria-multiline="true" aria-label="Mis apuntes de esta lección"
              onInput={alEscribir} onPaste={alPegar} onFocus={alEnfocar} onBlur={() => { if (pendienteRef.current) programarGuardado(100) }}/>
            {vacio && !cargando && <div className="cu-ph-txt">Escribí acá lo que te llevás de esta lección…</div>}
            {cargando && <div className="cu-ph-txt">Cargando tus apuntes…</div>}
          </div>

          <div className="cu-pie">
            {control ? (
              <label className="cu-sw">
                <input type="checkbox" checked={pausarAlEscribir} onChange={e => onPausarAlEscribir(e.target.checked)}/>
                Pausar el video cuando escribo
              </label>
            ) : <span/>}
            <span style={{ color: estado === 'offline' || estado === 'error' ? '#B45309' : undefined }}>{textoEstado}</span>
          </div>

          {avisoOtro && (
            <div className="cu-msg" style={{ background: '#F5F3FF', color: '#5B21B6' }}>
              Este apunte se cambió en otro dispositivo. Quedó guardada tu versión de acá.
              <button type="button" onClick={() => setAvisoOtro(false)} style={{ marginLeft: '6px', border: 'none', background: 'none', color: 'inherit', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Entendido</button>
            </div>
          )}
          {mensaje && <div className="cu-msg">{mensaje}</div>}

          {control && duracion > 0 && momentos.length > 0 && (
            <div className="cu-lin" aria-label="Tus momentos en el video">
              {momentos.map(m => (
                <button key={m.id} type="button" className="cu-pin" title={`${formatoMinuto(m.segundo)} ${m.contenido}`}
                  style={{ left: `${Math.min(100, Math.max(0, ((m.segundo || 0) / duracion) * 100))}%` }}
                  onClick={() => control.ir(m.segundo || 0)}/>
              ))}
            </div>
          )}

          {apuntes.length > 0 && (
            <div className="cu-lista">
              {apuntes.map(a => (
                <div key={a.id} className="cu-item">
                  {a.tipo === 'momento' && (
                    <button type="button" className="cu-min" disabled={!control} onClick={() => control?.ir(a.segundo || 0)}>📍 {formatoMinuto(a.segundo)}</button>
                  )}
                  {a.tipo === 'frase' && <span style={{ flexShrink: 0 }}>✍️</span>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {a.tipo === 'frase' ? <em style={{ color: '#3B2A12' }}>“{a.contenido}”</em>
                      : a.tipo === 'captura' ? (<>
                        {a.segundo != null && <button type="button" className="cu-min" style={{ marginBottom: '6px' }} disabled={!control} onClick={() => control?.ir(a.segundo || 0)}>📷 {formatoMinuto(a.segundo)}</button>}
                        {fotos[a.imagen_path || ''] ? <img className="cu-foto" src={fotos[a.imagen_path || '']} alt="Captura" loading="lazy"/> : <span style={{ color: '#B9AE96' }}>📷 Captura</span>}
                      </>)
                      : <span>{a.contenido || <span style={{ color: '#B9AE96' }}>Momento marcado</span>}</span>}
                  </div>
                  <button type="button" className="cu-x" aria-label="Borrar" onClick={() => borrar(a)}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
