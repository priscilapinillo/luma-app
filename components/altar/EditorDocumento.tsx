'use client'
// Documento del Altar (solo Premium): texto largo en hojas A4, con barra de estilos, hoja nueva, PDF y autoguardado.
// Las hojas se arman solas: cuando un párrafo no entra en la hoja, pasa entero a la siguiente.
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Undo2, Redo2, Check, CloudOff, Loader2, AlertCircle, MoreHorizontal, Trash2, Pencil, Bold, Italic, Underline, List, ListOrdered, FilePlus2, Highlighter, ChevronDown, Download, Lock, Type, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import { toast } from '@/components/ToastProvider'
import { useGuardado } from '@/components/altar/useGuardado'
import { RESALTADORES, TINTAS_DOC, MAX_HOJAS, MAX_CARACTERES_HTML, limpiarHtml, textoPlano, contarPalabras, tiempoEnVozAlta, mensajeDocumento, htmlParaImprimir, type DocumentoFila, type OpcionesPdf } from '@/lib/documento'

// medidas de una hoja A4 a 96 puntos por pulgada (en la compu se ve en tamaño real)
const A4_ANCHO = 794, A4_ALTO = 1123, A4_MARGEN = 76, ENTRE_HOJAS = 28

const ESTILOS = [
  { id: 'h1', nombre: 'Título', ayuda: 'el más grande' },
  { id: 'h2', nombre: 'Subtítulo', ayuda: 'para cada parte' },
  { id: 'p', nombre: 'Texto normal', ayuda: '' },
  { id: 'blockquote', nombre: 'Cita o frase destacada', ayuda: '' },
  { id: 'h3', nombre: 'Etiqueta chica', ayuda: 'en mayúsculas' },
] as const

const OPCIONES_PDF: { id: keyof OpcionesPdf; titulo: string; sub: string }[] = [
  { id: 'numeros', titulo: 'Número de hoja', sub: 'Abajo, «1 de 3» (en Chrome y Edge)' },
  { id: 'encabezado', titulo: 'Encabezado', sub: 'Tu nombre y el título arriba' },
  { id: 'resaltados', titulo: 'Resaltados de color', sub: 'Apagalo para imprimir en blanco y negro' },
  { id: 'tituloEnHojaNueva', titulo: 'Cada título en hoja nueva', sub: 'Para guiones largos por partes' },
]
const PDF_INICIAL: OpcionesPdf = { numeros: true, encabezado: true, resaltados: true, tituloEnHojaNueva: false }

type Menu = null | 'estilo' | 'resaltar' | 'tinta' | 'pdf' | 'mas'

export default function EditorDocumento({ fila, autora, onPapelera }: { fila: DocumentoFila; autora: string; onPapelera: () => void }) {
  const g = useGuardado(fila, { tabla: 'documentos', mensaje: mensajeDocumento })
  const soloLectura = g.soloLectura
  const edRef = useRef<HTMLDivElement | null>(null)
  const papelRef = useRef<HTMLDivElement | null>(null)
  const zonaRef = useRef<HTMLDivElement | null>(null)
  const medidorRef = useRef<HTMLDivElement | null>(null)
  const rangoRef = useRef<Range | null>(null)
  const ultimoHtml = useRef<string>('')
  const timerEmitir = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafPaginar = useRef<number | null>(null)
  const avisoTope = useRef(false)

  const [medidas, setMedidas] = useState({ ancho: A4_ANCHO, alto: A4_ALTO, margen: A4_MARGEN, real: true })
  const [paginas, setPaginas] = useState(1)
  const [hojasA4, setHojasA4] = useState(1)
  const [palabras, setPalabras] = useState(0)
  const [menu, setMenu] = useState<Menu>(null)
  const [activo, setActivo] = useState({ b: false, i: false, u: false, bloque: 'p', ul: false, ol: false, alin: 'left' })
  const [pdf, setPdf] = useState<OpcionesPdf>(PDF_INICIAL)
  const [editNombre, setEditNombre] = useState(false)
  const [nombreTmp, setNombreTmp] = useState(g.nombre)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // opciones del PDF que eligió la última vez (solo en este navegador)
  useEffect(() => {
    try { const x = JSON.parse(localStorage.getItem('luma-doc-pdf') || 'null'); if (x && typeof x === 'object') setPdf({ ...PDF_INICIAL, ...x }) } catch {}
  }, [])
  const cambiarPdf = (k: keyof OpcionesPdf) => setPdf(p => { const n = { ...p, [k]: !p[k] }; try { localStorage.setItem('luma-doc-pdf', JSON.stringify(n)) } catch {}; return n })

  // ── medidas de la hoja: tamaño real en la compu; en el celu, el ancho de la pantalla (las letras no se achican)
  useEffect(() => {
    const zona = zonaRef.current
    if (!zona) return
    const medir = () => {
      const disponible = zona.clientWidth - 24
      if (disponible >= A4_ANCHO) setMedidas({ ancho: A4_ANCHO, alto: A4_ALTO, margen: A4_MARGEN, real: true })
      else {
        const ancho = Math.max(260, disponible)
        setMedidas({ ancho, alto: Math.round(ancho * 1.4142), margen: Math.max(20, Math.round(A4_MARGEN * ancho / A4_ANCHO)), real: false })
      }
    }
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(zona)
    return () => ro.disconnect()
  }, [])

  // ── armar las hojas: si un bloque no entra en la hoja, pasa entero a la siguiente (las listas, renglón por renglón)
  const paginar = useCallback(() => {
    const ed = edRef.current
    if (!ed) return
    const { alto: H, margen: M } = medidas
    const paso = H + ENTRE_HOJAS
    const arriba = (p: number) => p * paso + M
    const abajo = (p: number) => p * paso + H - M
    ed.querySelectorAll<HTMLElement>('[data-empuje]').forEach(el => { el.style.marginTop = ''; el.removeAttribute('data-empuje') })
    const unidades: HTMLElement[] = []
    const BLOQ = /^(P|H1|H2|H3|LI|BLOCKQUOTE|UL|OL|DIV)$/
    const juntar = (el: HTMLElement) => {
      // las listas (y cualquier bloque con bloques adentro) se reparten renglón por renglón
      const hijos = Array.from(el.children) as HTMLElement[]
      if (el.getAttribute('data-salto') !== '1' && hijos.some(h => BLOQ.test(h.tagName))) hijos.forEach(juntar)
      else unidades.push(el)
    }
    Array.from(ed.children).forEach(c => juntar(c as HTMLElement))
    const top = (el: HTMLElement) => el.getBoundingClientRect().top - ed.getBoundingClientRect().top
    let pagina = 0
    let forzar = false
    for (const el of unidades) {
      if (el.getAttribute('data-salto') === '1') { forzar = true; continue }
      let y = top(el)
      const h = el.offsetHeight
      if (forzar || (y + h > abajo(pagina) + 0.5 && y > arriba(pagina) + 1)) {
        const destino = Math.max(pagina + 1, forzar ? pagina + 1 : 0)
        const objetivo = arriba(destino)
        const base = parseFloat(getComputedStyle(el).marginTop) || 0
        el.style.marginTop = `${base + Math.max(0, objetivo - y)}px`
        el.setAttribute('data-empuje', '1')
        // los márgenes de dos bloques seguidos se pisan: se corrige con lo que quedó de verdad
        const y2 = top(el)
        if (Math.abs(y2 - objetivo) > 0.5) el.style.marginTop = `${(parseFloat(el.style.marginTop) || 0) + (objetivo - y2)}px`
        pagina = destino
        forzar = false
        y = top(el)
      }
      // un bloque más alto que una hoja (un párrafo enorme) ocupa las hojas que necesite
      if (y + h > abajo(pagina)) pagina = Math.max(pagina, Math.floor((y + h - M) / paso))
    }
    if (forzar) pagina += 1 // «hoja nueva» al final: aparece la hoja vacía
    const total = pagina + 1
    setPaginas(total)
    if (medidas.real) setHojasA4(total)
  }, [medidas])

  const pedirPaginar = useCallback(() => {
    if (rafPaginar.current) cancelAnimationFrame(rafPaginar.current)
    rafPaginar.current = requestAnimationFrame(() => { rafPaginar.current = null; paginar() })
  }, [paginar])

  // en el celu, las hojas A4 de verdad (las del PDF) se cuentan aparte, a tamaño real y sin mostrarse
  const contarHojasA4 = useCallback((html: string) => {
    if (medidas.real) return
    const m = medidorRef.current
    if (!m) return
    m.innerHTML = html
    const util = A4_ALTO - 2 * A4_MARGEN
    let hojas = 1, usado = 0
    Array.from(m.children).forEach(c => {
      const el = c as HTMLElement
      if (el.getAttribute('data-salto') === '1') { hojas++; usado = 0; return }
      const h = el.offsetHeight + (parseFloat(getComputedStyle(el).marginBottom) || 0)
      if (usado > 0 && usado + h > util) { hojas++; usado = 0 }
      usado += h
      while (usado > util) { hojas++; usado -= util }
    })
    setHojasA4(hojas)
    m.innerHTML = ''
  }, [medidas.real])

  // ── lo que se guarda: el texto limpio (sin los espacios de las hojas)
  const emitir = useCallback(() => {
    const ed = edRef.current
    if (!ed) return
    const html = limpiarHtml(ed.innerHTML)
    const plano = textoPlano(html)
    setPalabras(contarPalabras(plano))
    contarHojasA4(html)
    if (html === ultimoHtml.current) return
    if (html.length > MAX_CARACTERES_HTML) {
      g.setAviso({ texto: 'Este documento llegó al tamaño máximo. Lo último no se guarda: empezá un documento nuevo para seguir.', tipo: 'grande' })
      return
    }
    ultimoHtml.current = html
    g.cambiar({ html }, 'texto')
  }, [g.cambiar, g.setAviso, contarHojasA4])

  const alCambiar = useCallback(() => {
    pedirPaginar()
    if (timerEmitir.current) clearTimeout(timerEmitir.current)
    timerEmitir.current = setTimeout(emitir, 350)
  }, [pedirPaginar, emitir])

  // ── primera carga (y cuando se trae la versión de otro dispositivo)
  useEffect(() => {
    const ed = edRef.current
    if (!ed) return
    // si lo que llega es lo mismo que acabamos de escribir, no se toca nada (así no salta el cursor)
    const crudo = g.datos?.html
    if (crudo && crudo === ultimoHtml.current && ed.innerHTML) return
    const html = limpiarHtml(crudo || '<p><br></p>')
    ultimoHtml.current = html
    ed.innerHTML = html
    const plano = textoPlano(html)
    setPalabras(contarPalabras(plano))
    contarHojasA4(html)
    pedirPaginar()
  }, [g.datos])

  useEffect(() => { pedirPaginar() }, [medidas, pedirPaginar])
  useEffect(() => {
    // cuando cargan las letras, cambia el alto de los renglones: se vuelven a armar las hojas
    if (typeof document !== 'undefined' && (document as any).fonts?.ready) (document as any).fonts.ready.then(() => pedirPaginar()).catch(() => {})
    try { document.execCommand('defaultParagraphSeparator', false, 'p') } catch {}
  }, [pedirPaginar])
  useEffect(() => () => { if (timerEmitir.current) { clearTimeout(timerEmitir.current); emitir() } }, [emitir])

  // ── selección: se recuerda para que los botones apliquen donde estaba el cursor
  useEffect(() => {
    const alSeleccionar = () => {
      const ed = edRef.current
      const sel = document.getSelection()
      if (!ed || !sel || !sel.rangeCount) return
      const r = sel.getRangeAt(0)
      if (!ed.contains(r.commonAncestorContainer)) return
      rangoRef.current = r.cloneRange()
      try {
        const bloque = String(document.queryCommandValue('formatBlock') || 'p').toLowerCase().replace(/[<>]/g, '')
        setActivo({
          b: document.queryCommandState('bold'), i: document.queryCommandState('italic'), u: document.queryCommandState('underline'),
          bloque: bloque === 'div' || !bloque ? 'p' : bloque,
          ul: document.queryCommandState('insertUnorderedList'), ol: document.queryCommandState('insertOrderedList'),
          alin: document.queryCommandState('justifyCenter') ? 'center' : document.queryCommandState('justifyRight') ? 'right' : 'left',
        })
      } catch {}
    }
    document.addEventListener('selectionchange', alSeleccionar)
    return () => document.removeEventListener('selectionchange', alSeleccionar)
  }, [])

  const volverAlCursor = () => {
    const ed = edRef.current
    if (!ed) return false
    ed.focus({ preventScroll: true })
    const sel = document.getSelection()
    if (rangoRef.current && sel && ed.contains(rangoRef.current.commonAncestorContainer)) { sel.removeAllRanges(); sel.addRange(rangoRef.current) }
    else if (sel && !ed.contains(sel.anchorNode)) {
      const r = document.createRange(); r.selectNodeContents(ed); r.collapse(false); sel.removeAllRanges(); sel.addRange(r)
    }
    return true
  }
  const comando = (cmd: string, valor?: string) => {
    if (soloLectura) return
    if (!volverAlCursor()) return
    try {
      const css = cmd === 'hiliteColor' || cmd === 'foreColor' || cmd.startsWith('justify')
      if (css) document.execCommand('styleWithCSS', false, 'true')
      const ok = document.execCommand(cmd, false, valor)
      if (!ok && cmd === 'hiliteColor') document.execCommand('backColor', false, valor)
      if (css) document.execCommand('styleWithCSS', false, 'false')
    } catch {}
    alCambiar()
  }
  const ponerEstilo = (id: string) => {
    comando('formatBlock', `<${id}>`)
    setMenu(null)
    toast(`Estilo: ${ESTILOS.find(e => e.id === id)?.nombre}.`)
  }
  const alinear = (lado: 'left' | 'center' | 'right') => {
    comando(lado === 'left' ? 'justifyLeft' : lado === 'center' ? 'justifyCenter' : 'justifyRight')
    setActivo(a => ({ ...a, alin: lado }))
    toast(lado === 'left' ? 'Texto a la izquierda.' : lado === 'center' ? 'Texto centrado.' : 'Texto a la derecha.')
  }
  const resaltar = (color: string | null) => {
    const sel = document.getSelection()
    if (!rangoRef.current || rangoRef.current.collapsed) { toast('Primero marcá el texto que querés resaltar.', 'info'); setMenu(null); return }
    comando('hiliteColor', color || 'transparent')
    setMenu(null)
    if (sel) toast(color ? 'Resaltado.' : 'Sin resaltar.')
  }
  const pintar = (color: string, nombre: string) => {
    if (!rangoRef.current || rangoRef.current.collapsed) { toast('Primero marcá el texto que querés pintar.', 'info'); setMenu(null); return }
    comando('foreColor', color)
    setMenu(null)
    toast(`Letra ${nombre.toLowerCase()}.`)
  }
  // bloque de arriba de todo donde está el cursor (párrafo, título, lista…)
  const bloqueDelCursor = (): HTMLElement | null => {
    const ed = edRef.current
    const sel = document.getSelection()
    let n: Node | null = sel?.anchorNode || null
    if (!ed || !n || !ed.contains(n) || n === ed) return null
    while (n && n.parentNode !== ed) n = n.parentNode
    return (n as HTMLElement) || null
  }
  const ponerCursor = (el: Node, alFinal = false) => {
    const sel = document.getSelection(); if (!sel) return
    const r = document.createRange()
    if (alFinal) { r.selectNodeContents(el); r.collapse(false) } else { r.setStart(el, 0); r.collapse(true) }
    sel.removeAllRanges(); sel.addRange(r)
    rangoRef.current = r.cloneRange()
    ;(el as HTMLElement).scrollIntoView?.({ block: 'nearest' })
  }
  const hojaNueva = () => {
    if (soloLectura) return
    if (hojasA4 >= MAX_HOJAS) { toast(`Llegaste a ${MAX_HOJAS} hojas. Empezá otro documento para seguir.`, 'info'); return }
    const ed = edRef.current
    if (!ed || !volverAlCursor()) return
    const salto = document.createElement('div')
    salto.setAttribute('data-salto', '1'); salto.setAttribute('contenteditable', 'false'); salto.className = 'doc-salto'
    const p = document.createElement('p'); p.appendChild(document.createElement('br'))
    const aca = bloqueDelCursor()
    if (aca) aca.after(salto, p); else ed.append(salto, p)
    ponerCursor(p)
    alCambiar()
    toast('Hoja nueva: lo que escribas ahora empieza en otra hoja.')
  }

  // ── pegado limpio: solo texto con negrita, cursiva, subrayado, títulos y listas. Nada de imágenes ni estilos raros.
  const alPegar = (e: React.ClipboardEvent) => {
    e.preventDefault()
    if (soloLectura) return
    const html = e.clipboardData.getData('text/html')
    const texto = e.clipboardData.getData('text/plain')
    let limpio = ''
    if (html) limpio = limpiarHtml(html)
    else if (texto) limpio = texto.split(/\r?\n/).map(l => `<p>${l.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!)) || '<br>'}</p>`).join('')
    if (!limpio) return
    if (limpio.length + (ultimoHtml.current?.length || 0) > MAX_CARACTERES_HTML) { toast('Es demasiado texto para un solo documento. Pegalo en partes, en otro documento.', 'error'); return }
    const ed = edRef.current
    if (!ed || !volverAlCursor()) return
    const molde = document.createElement('template')
    molde.innerHTML = limpio
    const bloques = Array.from(molde.content.children) as HTMLElement[]
    if (bloques.length === 1 && bloques[0].tagName === 'P') {
      try { document.execCommand('insertHTML', false, bloques[0].innerHTML) } catch {}
    } else {
      const aca = bloqueDelCursor()
      const vacio = aca && !(aca.textContent || '').trim() && !aca.querySelector('[data-salto]')
      let ultimo: Node | null = null
      const frag = document.createDocumentFragment()
      bloques.forEach(b => { frag.appendChild(b); ultimo = b })
      if (aca) { aca.after(frag); if (vacio) aca.remove() } else ed.append(frag)
      if (ultimo) ponerCursor(ultimo, true)
    }
    alCambiar()
  }
  const alSoltar = (e: React.DragEvent) => {
    if (e.dataTransfer?.files?.length) { e.preventDefault(); toast('El Documento es solo texto: las imágenes van en una pizarra.', 'info') }
  }
  // tope de hojas: se puede borrar y cambiar, pero no agregar más
  const antesDeEscribir = (e: React.FormEvent<HTMLDivElement>) => {
    const tipo = (e.nativeEvent as InputEvent).inputType || ''
    if (hojasA4 > MAX_HOJAS && !tipo.startsWith('delete') && !tipo.startsWith('history') && !tipo.startsWith('format')) {
      e.preventDefault()
      if (!avisoTope.current) { avisoTope.current = true; toast(`Llegaste a ${MAX_HOJAS} hojas. Para seguir, empezá otro documento.`, 'info'); setTimeout(() => { avisoTope.current = false }, 4000) }
    }
  }

  // ── teclado: Ctrl+S guarda ya, Ctrl+Enter hoja nueva (Ctrl+B, I, U y Z ya los maneja el navegador)
  const alTeclear = (e: React.KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return
    const k = e.key.toLowerCase()
    if (e.shiftKey && (k === 'l' || k === 'e' || k === 'r')) { e.preventDefault(); alinear(k === 'l' ? 'left' : k === 'e' ? 'center' : 'right'); return }
    if (k === 's') { e.preventDefault(); emitir(); g.guardar().then(() => toast('Guardado.')) }
    if (k === 'enter') { e.preventDefault(); hojaNueva() }
  }

  // ── menús desplegables: se cierran tocando afuera o con Escape
  useEffect(() => {
    if (!menu) return
    const fuera = (e: PointerEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(null) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null) }
    document.addEventListener('pointerdown', fuera)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', fuera); document.removeEventListener('keydown', esc) }
  }, [menu])

  async function guardarNombre() {
    setEditNombre(false)
    const n = nombreTmp.trim()
    if (!n || n === g.nombre) { setNombreTmp(g.nombre); return }
    emitir()
    await g.guardar()
    const ok = await g.renombrar(n)
    if (ok) toast('Nombre cambiado.'); else { setNombreTmp(g.nombre); toast('No se pudo cambiar el nombre. Probá de nuevo.', 'error') }
  }
  async function aPapelera() {
    setMenu(null)
    emitir()
    if (!(await g.actualizar({ borrada_en: new Date().toISOString() }))) { toast('No se pudo mandar a la papelera. Probá de nuevo.', 'error'); return }
    toast('Está en la papelera 30 días. Desde ahí lo recuperás.', 'info')
    onPapelera()
  }

  // ── PDF: en la compu se abre la ventana de imprimir; en el celu, una pestaña con el botón «Guardar como PDF»
  function descargarPdf() {
    setMenu(null)
    const ed = edRef.current
    const html = ed ? limpiarHtml(ed.innerHTML) : (g.datos?.html || '')
    const pagina = htmlParaImprimir(g.nombre, autora, html, pdf)
    const tactil = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches
    if (tactil) {
      const url = URL.createObjectURL(new Blob([pagina], { type: 'text/html' }))
      const w = window.open(url, '_blank')
      if (!w) { toast('Tu navegador frenó la pestaña nueva. Permitila y probá de nuevo.', 'error'); URL.revokeObjectURL(url); return }
      setTimeout(() => URL.revokeObjectURL(url), 60000)
      toast('Se abrió tu documento: tocá «Guardar como PDF».')
      return
    }
    const marco = document.createElement('iframe')
    marco.setAttribute('aria-hidden', 'true')
    marco.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0'
    document.body.appendChild(marco)
    const d = marco.contentDocument
    if (!d || !marco.contentWindow) { marco.remove(); toast('No se pudo armar el PDF. Probá de nuevo.', 'error'); return }
    d.open(); d.write(pagina); d.close()
    const imprimir = async () => {
      try { await (d as any).fonts?.ready } catch {}
      try { marco.contentWindow!.focus(); marco.contentWindow!.print() } catch { toast('No se pudo abrir la ventana de imprimir.', 'error') }
      setTimeout(() => marco.remove(), 60000)
    }
    if (d.readyState === 'complete') setTimeout(imprimir, 300); else marco.onload = () => setTimeout(imprimir, 300)
    toast('Elegí «Guardar como PDF» en la ventana que se abre.')
  }

  const IcoEstado = g.estado === 'guardado' ? Check : g.estado === 'guardando' || g.estado === 'pendiente' ? Loader2 : g.estado === 'sinred' ? CloudOff : AlertCircle
  const colorEstado = g.estado === 'error' ? 'var(--al-peligro)' : g.estado === 'sinred' ? 'var(--al-oro)' : g.estado === 'guardado' ? '#5E8F6B' : 'var(--al-texto2)'
  const { ancho, alto, margen } = medidas
  const altoTotal = paginas * (alto + ENTRE_HOJAS) - ENTRE_HOJAS
  const nombreEstilo = ESTILOS.find(e => e.id === activo.bloque)?.nombre || 'Texto normal'
  const sinCursor = (e: React.PointerEvent | React.MouseEvent) => e.preventDefault() // así el botón no le saca el cursor al texto

  return (
    <div className="dc">
      <style>{`
        .dc{display:flex;flex-direction:column;height:100dvh;background:#EDE6DA}
        html.dark .dc{background:#141B29}
        @media(max-width:767px){.dc{height:calc(100dvh - 110px - env(safe-area-inset-bottom))}}
        .dc-arriba{display:flex;align-items:center;gap:6px;padding:10px 12px;border-bottom:1px solid var(--al-borde);background:var(--al-tarjeta);position:relative;z-index:40}
        .dc-ico{width:38px;height:38px;border-radius:12px;border:none;background:transparent;color:var(--al-texto);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
        .dc-ico:hover:not(:disabled){background:var(--al-suave)} .dc-ico:disabled{opacity:.3;cursor:default}
        .dc-girar{animation:dcGira 1s linear infinite} @keyframes dcGira{to{rotate:360deg}}
        .dc-barra{display:flex;align-items:center;gap:2px;padding:6px;margin:10px auto 0;border-radius:18px;background:#27344A;color:#F0E6D8;box-shadow:0 12px 30px rgba(39,52,74,.28);position:relative;z-index:30;max-width:calc(100% - 20px);overflow-x:auto;scrollbar-width:none}
        .dc-barra::-webkit-scrollbar{display:none}
        .dc-b{height:40px;min-width:40px;padding:0 10px;border-radius:13px;border:none;background:transparent;color:#F0E6D8;display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;font:800 13.5px Nunito,sans-serif;flex-shrink:0;transition:background .15s}
        .dc-b:hover:not(:disabled){background:rgba(240,230,216,.12)} .dc-b.on{background:#F0E6D8;color:#27344A} .dc-b:disabled{opacity:.35;cursor:default}
        .dc-sep{width:1px;height:24px;background:rgba(240,230,216,.2);margin:0 4px;flex-shrink:0}
        .dc-menu{position:absolute;z-index:60;background:var(--al-tarjeta);color:var(--al-texto);border:1px solid var(--al-borde);border-radius:20px;padding:10px;box-shadow:0 22px 50px rgba(39,52,74,.25);animation:dcAbre .16s ease both}
        @keyframes dcAbre{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
        .dc-menu-t{font:900 10.5px Nunito,sans-serif;letter-spacing:.14em;color:var(--al-texto2);padding:4px 6px 6px}
        .dc-op{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 10px;border-radius:12px;border:none;background:transparent;color:var(--al-texto);cursor:pointer;text-align:left}
        .dc-op:hover,.dc-op.on{background:var(--al-suave)}
        .dc-op small{font:700 11.5px Nunito,sans-serif;color:var(--al-texto2)}
        .dc-zona{flex:1;min-height:0;overflow:auto;padding:22px 12px 70px;scroll-padding-top:20px}
        .dc-papel{position:relative;margin:0 auto}
        .dc-hoja{position:absolute;left:0;right:0;background:#FFFDF9;border-radius:4px;box-shadow:0 12px 30px rgba(39,52,74,.13);pointer-events:none}
        .dc-num{position:absolute;bottom:14px;left:0;right:0;text-align:center;font:700 10.5px Nunito,sans-serif;color:#B8B3C4}
        .dc-texto{position:relative;z-index:1;outline:none;color:#27344A;font:500 15px/1.7 Nunito,sans-serif;caret-color:#626B91;word-wrap:break-word;overflow-wrap:anywhere}
        .dc-texto h1{font:900 30px/1.12 Fraunces,Georgia,serif;font-variation-settings:'SOFT' 100;margin:0 0 12px;letter-spacing:-.01em}
        .dc-texto h2{font:800 20px/1.25 Fraunces,Georgia,serif;font-variation-settings:'SOFT' 100;margin:18px 0 6px}
        .dc-texto h3{font:900 11px/1.4 Nunito,sans-serif;letter-spacing:.16em;color:#626B91;text-transform:uppercase;margin:0 0 8px}
        .dc-texto p{margin:0 0 9px}
        .dc-texto blockquote{margin:10px 0;padding-left:14px;border-left:3px solid #A99BB8;font-style:italic;color:#4C5580}
        .dc-texto ul,.dc-texto ol{margin:0 0 9px;padding-left:24px}
        .dc-texto li{margin:0 0 3px}
        .dc-texto blockquote[style*="text-align: right"]{border-left:0;padding-left:0;border-right:3px solid #A99BB8;padding-right:14px}
        .dc-texto blockquote[style*="text-align: center"]{border-left:0;padding-left:0;border-top:3px solid #A99BB8;padding-top:8px}
        .dc-texto li[style*="text-align: center"],.dc-texto li[style*="text-align: right"]{list-style-position:inside}
        .dc-texto .doc-salto,.dc-medidor .doc-salto{position:relative;height:18px;margin:6px 0;border-top:1.5px dashed #C9BFD6;user-select:none;cursor:default}
        .dc-texto .doc-salto::after{content:'Hoja nueva';position:absolute;top:-10px;left:50%;transform:translateX(-50%);padding:0 10px;background:#FFFDF9;font:800 10.5px Nunito,sans-serif;color:#A99BB8;letter-spacing:.06em}
        .dc-texto[contenteditable="false"]{cursor:default}
        .dc-medidor{position:absolute;left:-99999px;top:0;width:${A4_ANCHO - 2 * A4_MARGEN}px;visibility:hidden;font:500 15px/1.7 Nunito,sans-serif}
        .dc-medidor h1{font:900 30px/1.12 Fraunces,Georgia,serif;margin:0 0 12px}.dc-medidor h2{font:800 20px/1.25 Fraunces,Georgia,serif;margin:18px 0 6px}
        .dc-medidor h3{font:900 11px/1.4 Nunito,sans-serif;margin:0 0 8px}.dc-medidor p{margin:0 0 9px}.dc-medidor ul,.dc-medidor ol{margin:0 0 9px;padding-left:24px}
        .dc-medidor blockquote{margin:10px 0;padding-left:14px}
        .dc-pie{display:flex;justify-content:center;gap:14px;flex-wrap:wrap;padding:8px 12px;border-top:1px solid var(--al-borde);background:var(--al-tarjeta);font:800 12px Nunito,sans-serif;color:var(--al-texto2)}
        .dc-pie b{color:var(--al-texto)}
        .dc-aviso{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 14px;font:700 13.5px Nunito,sans-serif;border-bottom:1px solid var(--al-borde)}
        .dc-aviso a,.dc-aviso button{font:900 13px Nunito,sans-serif;color:var(--al-acento);background:none;border:none;cursor:pointer;text-decoration:underline;padding:0}
        .dc-check{display:flex;align-items:center;gap:12px;padding:8px 6px;cursor:pointer}
        .dc-check input{width:20px;height:20px;accent-color:#27344A;margin:0;flex-shrink:0}
        @media(max-width:520px){.dc-texto-estado{display:none}.dc-b .dc-largo{display:none}}
        @media (prefers-reduced-motion:reduce){.dc-girar,.dc-menu{animation:none}}
      `}</style>

      <div className="dc-arriba">
        <Link href="/altar" className="dc-ico" aria-label="Volver al Altar"><ArrowLeft size={19} /></Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editNombre
            ? <input autoFocus value={nombreTmp} maxLength={80} onChange={e => setNombreTmp(e.target.value)} onBlur={guardarNombre}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setNombreTmp(g.nombre); setEditNombre(false) } }}
                className="al-f" style={{ width: '100%', fontSize: 19, border: 'none', borderBottom: '2px solid var(--al-acento)', background: 'transparent', color: 'var(--al-texto)', outline: 'none', padding: '2px 0' }} aria-label="Nombre del documento" />
            : <button onClick={() => { setNombreTmp(g.nombre); setEditNombre(true) }} disabled={soloLectura} style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: '100%', border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: 'var(--al-texto)' }} aria-label="Cambiar el nombre">
                <span className="al-f" style={{ fontSize: 19, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.nombre}</span>
                <Pencil size={13} style={{ opacity: .45, flexShrink: 0 }} />
              </button>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 800, color: colorEstado, marginTop: 1 }} aria-live="polite"
            onClick={() => { if (g.estado === 'error' || g.estado === 'sinred') { g.setAviso(null); g.guardar() } }} role={g.estado === 'error' ? 'button' : undefined}>
            {soloLectura ? <><Lock size={12} /> Solo para mirar</> : <><IcoEstado size={12} className={g.estado === 'guardando' || g.estado === 'pendiente' ? 'dc-girar' : undefined} /><span>{g.textoEstado}</span></>}
            <span style={{ color: 'var(--al-texto2)', fontWeight: 700 }} className="dc-texto-estado">· Documento</span>
          </div>
        </div>
        <div ref={menu === 'pdf' || menu === 'mas' ? menuRef : undefined} style={{ position: 'relative', display: 'flex', gap: 2 }}>
          <button className="dc-ico" onMouseDown={sinCursor} onClick={() => setMenu(m => m === 'pdf' ? null : 'pdf')} aria-label="Descargar en PDF" aria-expanded={menu === 'pdf'} title="Descargar en PDF"><Download size={18} /></button>
          <button className="dc-ico" onClick={() => setMenu(m => m === 'mas' ? null : 'mas')} aria-label="Más opciones" aria-expanded={menu === 'mas'}><MoreHorizontal size={19} /></button>
          {menu === 'pdf' && (
            <div className="dc-menu" role="dialog" aria-label="Tu PDF" style={{ right: 0, top: 46, width: 'min(330px, calc(100vw - 24px))' }}>
              <div className="al-f" style={{ fontSize: 17, padding: '2px 6px 6px' }}>Tu PDF</div>
              {OPCIONES_PDF.map(o => (
                <label key={o.id} className="dc-check">
                  <span style={{ flex: 1 }}><b style={{ display: 'block', font: '800 13.5px Nunito,sans-serif' }}>{o.titulo}</b><span style={{ font: '600 12px Nunito,sans-serif', color: 'var(--al-texto2)' }}>{o.sub}</span></span>
                  <input type="checkbox" checked={pdf[o.id]} onChange={() => cambiarPdf(o.id)} />
                </label>
              ))}
              <div style={{ height: 1, background: 'var(--al-borde)', margin: '6px 4px 10px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', font: '700 12.5px Nunito,sans-serif', color: 'var(--al-texto2)', padding: '0 6px 10px' }}><span>{hojasA4} {hojasA4 === 1 ? 'hoja A4' : 'hojas A4'}</span><span>{palabras} palabras</span></div>
              <button onClick={descargarPdf} style={{ width: '100%', height: 48, borderRadius: 14, border: 'none', background: '#27344A', color: '#F0E6D8', font: '900 14.5px Nunito,sans-serif', cursor: 'pointer' }}>Descargar</button>
              <div style={{ font: '600 11.5px/1.45 Nunito,sans-serif', color: 'var(--al-texto2)', textAlign: 'center', marginTop: 8 }}>Se arma en tu celu o compu: elegí «Guardar como PDF». No ocupa espacio en Luma.</div>
            </div>
          )}
          {menu === 'mas' && (
            <div className="dc-menu" role="menu" style={{ right: 0, top: 46, width: 240, padding: 6 }}>
              <button role="menuitem" className="dc-op" onClick={aPapelera} disabled={soloLectura} style={{ color: 'var(--al-peligro)', justifyContent: 'flex-start', font: '800 13.5px Nunito,sans-serif' }}><Trash2 size={15} /> Mandar a la papelera</button>
            </div>
          )}
        </div>
      </div>

      {g.aviso && (
        <div className="dc-aviso" role="alert" style={{ background: g.aviso.tipo === 'otro' ? '#F6E4E2' : 'var(--al-suave)' }}>
          <AlertCircle size={15} /> <span style={{ flex: 1, minWidth: 200 }}>{g.aviso.texto}</span>
          {g.aviso.tipo === 'plan' && <Link href="/suscripcion">Ver Premium</Link>}
          {g.aviso.tipo === 'otro' && <button onClick={() => { g.setAviso(null); g.guardar() }}>Probar de nuevo</button>}
        </div>
      )}
      {hojasA4 > MAX_HOJAS && (
        <div className="dc-aviso" role="status" style={{ background: '#F7ECD3', color: '#5A4416' }}>
          <AlertCircle size={15} /> <span style={{ flex: 1, minWidth: 200 }}>Llegaste a {MAX_HOJAS} hojas: podés corregir y borrar, pero no sumar más. Para seguir, empezá otro documento.</span>
        </div>
      )}

      {!soloLectura && (
        <div ref={menu === 'estilo' || menu === 'resaltar' || menu === 'tinta' ? menuRef : undefined} style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
          <div className="dc-barra" role="toolbar" aria-label="Herramientas de texto">
            <button className={`dc-b${menu === 'estilo' ? ' on' : ''}`} onPointerDown={sinCursor} onMouseDown={sinCursor} onClick={() => setMenu(m => m === 'estilo' ? null : 'estilo')} aria-haspopup="menu" aria-expanded={menu === 'estilo'} aria-label={`Estilo del texto: ${nombreEstilo}`} title="Estilo del texto">
              <Type size={16} /><span className="dc-largo" style={{ minWidth: 92, textAlign: 'left' }}>{nombreEstilo}</span><ChevronDown size={14} />
            </button>
            <span className="dc-sep" />
            <button className={`dc-b${activo.b ? ' on' : ''}`} onPointerDown={sinCursor} onMouseDown={sinCursor} onClick={() => comando('bold')} aria-pressed={activo.b} aria-label="Negrita (Ctrl+B)" title="Negrita (Ctrl+B)"><Bold size={17} /></button>
            <button className={`dc-b${activo.i ? ' on' : ''}`} onPointerDown={sinCursor} onMouseDown={sinCursor} onClick={() => comando('italic')} aria-pressed={activo.i} aria-label="Cursiva (Ctrl+I)" title="Cursiva (Ctrl+I)"><Italic size={17} /></button>
            <button className={`dc-b${activo.u ? ' on' : ''}`} onPointerDown={sinCursor} onMouseDown={sinCursor} onClick={() => comando('underline')} aria-pressed={activo.u} aria-label="Subrayado (Ctrl+U)" title="Subrayado (Ctrl+U)"><Underline size={17} /></button>
            <button className={`dc-b${menu === 'resaltar' ? ' on' : ''}`} onPointerDown={sinCursor} onMouseDown={sinCursor} onClick={() => setMenu(m => m === 'resaltar' ? null : 'resaltar')} aria-haspopup="menu" aria-expanded={menu === 'resaltar'} aria-label="Resaltador" title="Resaltador"><Highlighter size={17} /></button>
            <button className={`dc-b${menu === 'tinta' ? ' on' : ''}`} onPointerDown={sinCursor} onMouseDown={sinCursor} onClick={() => setMenu(m => m === 'tinta' ? null : 'tinta')} aria-haspopup="menu" aria-expanded={menu === 'tinta'} aria-label="Color de letra" title="Color de letra"><span style={{ font: '900 16px Nunito,sans-serif', borderBottom: '3px solid #D6A6A5', lineHeight: 1 }}>A</span></button>
            <span className="dc-sep" />
            <button className={`dc-b${activo.alin === 'left' ? ' on' : ''}`} onPointerDown={sinCursor} onMouseDown={sinCursor} onClick={() => alinear('left')} aria-pressed={activo.alin === 'left'} aria-label="Alinear a la izquierda (Ctrl+Shift+L)" title="Alinear a la izquierda (Ctrl+Shift+L)"><AlignLeft size={17} /></button>
            <button className={`dc-b${activo.alin === 'center' ? ' on' : ''}`} onPointerDown={sinCursor} onMouseDown={sinCursor} onClick={() => alinear('center')} aria-pressed={activo.alin === 'center'} aria-label="Centrar (Ctrl+Shift+E)" title="Centrar (Ctrl+Shift+E)"><AlignCenter size={17} /></button>
            <button className={`dc-b${activo.alin === 'right' ? ' on' : ''}`} onPointerDown={sinCursor} onMouseDown={sinCursor} onClick={() => alinear('right')} aria-pressed={activo.alin === 'right'} aria-label="Alinear a la derecha (Ctrl+Shift+R)" title="Alinear a la derecha (Ctrl+Shift+R)"><AlignRight size={17} /></button>
            <span className="dc-sep" />
            <button className={`dc-b${activo.ul ? ' on' : ''}`} onPointerDown={sinCursor} onMouseDown={sinCursor} onClick={() => comando('insertUnorderedList')} aria-pressed={activo.ul} aria-label="Lista con puntos" title="Lista con puntos"><List size={17} /></button>
            <button className={`dc-b${activo.ol ? ' on' : ''}`} onPointerDown={sinCursor} onMouseDown={sinCursor} onClick={() => comando('insertOrderedList')} aria-pressed={activo.ol} aria-label="Lista numerada" title="Lista numerada"><ListOrdered size={17} /></button>
            <button className="dc-b" onPointerDown={sinCursor} onMouseDown={sinCursor} onClick={hojaNueva} aria-label="Hoja nueva (Ctrl+Enter)" title="Hoja nueva (Ctrl+Enter)"><FilePlus2 size={17} /><span className="dc-largo">Hoja nueva</span></button>
            <span className="dc-sep" />
            <button className="dc-b" onPointerDown={sinCursor} onMouseDown={sinCursor} onClick={() => comando('undo')} aria-label="Deshacer (Ctrl+Z)" title="Deshacer (Ctrl+Z)"><Undo2 size={17} /></button>
            <button className="dc-b" onPointerDown={sinCursor} onMouseDown={sinCursor} onClick={() => comando('redo')} aria-label="Rehacer" title="Rehacer"><Redo2 size={17} /></button>
          </div>
          {menu === 'estilo' && (
            <div className="dc-menu" role="menu" aria-label="Estilo del texto" style={{ top: 64, width: 'min(300px, calc(100vw - 24px))' }}>
              <div className="dc-menu-t">ESTILO</div>
              {ESTILOS.map(e => (
                <button key={e.id} role="menuitemradio" aria-checked={activo.bloque === e.id} className={`dc-op${activo.bloque === e.id ? ' on' : ''}`} onPointerDown={sinCursor} onMouseDown={sinCursor} onClick={() => ponerEstilo(e.id)}
                  style={e.id === 'h1' ? { font: "900 21px Fraunces,Georgia,serif" } : e.id === 'h2' ? { font: "800 17px Fraunces,Georgia,serif" } : e.id === 'blockquote' ? { font: 'italic 600 14.5px Nunito,sans-serif', color: '#4C5580' } : e.id === 'h3' ? { font: '900 11px Nunito,sans-serif', letterSpacing: '.16em', color: '#626B91' } : { font: '600 15px Nunito,sans-serif' }}>
                  <span>{e.id === 'h3' ? e.nombre.toUpperCase() : e.nombre}</span>{e.ayuda && <small>{e.ayuda}</small>}
                </button>
              ))}
            </div>
          )}
          {menu === 'resaltar' && (
            <div className="dc-menu" role="menu" aria-label="Resaltador" style={{ top: 64, width: 'min(320px, calc(100vw - 24px))' }}>
              <div className="dc-menu-t">RESALTADOR</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '0 6px 6px' }}>
                {RESALTADORES.map(r => (
                  <button key={r.id} role="menuitem" aria-label={`Resaltar ${r.nombre}`} title={r.nombre} onPointerDown={sinCursor} onMouseDown={sinCursor} onClick={() => resaltar(r.color)}
                    style={{ width: 38, height: 38, borderRadius: 12, border: 'none', background: r.color, boxShadow: 'inset 0 0 0 1px rgba(39,52,74,.08)', cursor: 'pointer' }} />
                ))}
                <button role="menuitem" onPointerDown={sinCursor} onMouseDown={sinCursor} onClick={() => resaltar(null)} style={{ height: 38, padding: '0 12px', borderRadius: 19, border: '1px solid var(--al-borde)', background: 'var(--al-tarjeta)', color: 'var(--al-texto2)', font: '700 12.5px Nunito,sans-serif', cursor: 'pointer' }}>Sin resaltar</button>
              </div>
            </div>
          )}
          {menu === 'tinta' && (
            <div className="dc-menu" role="menu" aria-label="Color de letra" style={{ top: 64, width: 'min(320px, calc(100vw - 24px))' }}>
              <div className="dc-menu-t">COLOR DE LETRA</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '0 6px 6px' }}>
                {TINTAS_DOC.map(t => (
                  <button key={t.id} role="menuitem" aria-label={`Letra ${t.nombre}`} title={t.nombre} onPointerDown={sinCursor} onMouseDown={sinCursor} onClick={() => pintar(t.color, t.nombre)}
                    style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', background: '#FBF7F1', color: t.color, font: '900 16px Nunito,sans-serif', boxShadow: 'inset 0 0 0 1px #E6DCCE', cursor: 'pointer' }}>A</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="dc-zona" ref={zonaRef}>
        <div className="dc-papel" ref={papelRef} style={{ width: ancho, minHeight: altoTotal }}>
          {Array.from({ length: paginas }).map((_, i) => (
            <div key={i} className="dc-hoja" style={{ top: i * (alto + ENTRE_HOJAS), height: alto }} aria-hidden="true">
              {medidas.real && paginas > 1 && <span className="dc-num">{i + 1} de {paginas}</span>}
            </div>
          ))}
          <div
            ref={edRef}
            className="dc-texto"
            contentEditable={!soloLectura}
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label="Texto del documento"
            spellCheck
            lang="es"
            style={{ padding: `${margen}px ${margen}px`, minHeight: altoTotal }}
            onInput={alCambiar}
            onBeforeInput={antesDeEscribir}
            onPaste={alPegar}
            onDrop={alSoltar}
            onKeyDown={alTeclear}
            onBlur={() => { if (timerEmitir.current) { clearTimeout(timerEmitir.current); emitir() } }}
          />
        </div>
        <div className="dc-medidor" ref={medidorRef} aria-hidden="true" />
      </div>

      <div className="dc-pie" aria-live="polite">
        <span><b>{palabras.toLocaleString('es-AR')}</b> {palabras === 1 ? 'palabra' : 'palabras'}</span>
        <span>≈ <b>{tiempoEnVozAlta(palabras)}</b> en voz alta</span>
        <span><b>{hojasA4}</b> {hojasA4 === 1 ? 'hoja A4' : 'hojas A4'}</span>
      </div>

      {g.conflicto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,34,50,.35)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div role="dialog" aria-label="Dos versiones" style={{ width: '100%', maxWidth: 520, background: 'var(--al-tarjeta)', borderRadius: '24px 24px 0 0', padding: '22px 18px calc(22px + env(safe-area-inset-bottom))' }}>
            <div className="al-f" style={{ fontSize: 22, marginBottom: 6 }}>Este documento cambió en otro lado</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--al-texto2)', marginBottom: 18 }}>Lo abriste en otro dispositivo (o en otra pestaña) y se guardó ahí. ¿Con cuál te quedás? La otra se pierde.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => { g.resolverConflicto('mia'); toast('Te quedaste con la de acá.') }} style={botonGrande(true)}>Quedarme con la de acá</button>
              <button onClick={() => { ultimoHtml.current = ''; g.resolverConflicto('otra'); toast('Trajimos la del otro dispositivo.') }} style={botonGrande(false)}>Traer la del otro dispositivo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const botonGrande = (principal: boolean): React.CSSProperties => ({ height: 50, borderRadius: 25, border: principal ? 'none' : '1.5px solid var(--al-borde)', background: principal ? 'var(--al-acento)' : 'transparent', color: principal ? 'var(--al-sobre-acento)' : 'var(--al-texto)', font: '900 15px Nunito,sans-serif', cursor: 'pointer' })
