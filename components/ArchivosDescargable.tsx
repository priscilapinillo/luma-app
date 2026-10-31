'use client'
// Archivos de un descargable (lo ve solo la dueña, en el editor).
// Antes de subir se revisa todo en la pantalla (tipo, tamaño, cantidad y espacio) y el servidor lo vuelve a revisar
// antes y después de subir. Los archivos son privados: nadie los baja sin comprar.
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from '@/components/ToastProvider'
import { FileText, Music, Image as ImagenIcono, FileArchive, File, Upload, Trash2, RefreshCw, Download, Gift } from 'lucide-react'

export type Archivo = { id: string; nombre: string; tamano: number; mime: string | null; es_bonus: boolean; bonus_valor: number | null; orden: number }

const MB = 1024 * 1024
const MAX_ARCHIVO = 30 * MB
const MAX_ARCHIVOS = 5
const EXT_OK = ['pdf', 'epub', 'mp3', 'm4a', 'wav', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip']
const ext = (n: string) => (n.toLowerCase().match(/\.([a-z0-9]{1,5})$/)?.[1]) || ''
export const pesoLegible = (b: number) => b >= MB ? `${(b / MB).toFixed(b >= 10 * MB ? 0 : 1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`
export function tipoLegible(nombre: string) {
  const e = ext(nombre)
  if (e === 'pdf') return 'PDF'
  if (e === 'epub') return 'Ebook (EPUB)'
  if (['mp3', 'm4a', 'wav'].includes(e)) return `Audio ${e.toUpperCase()}`
  if (['jpg', 'jpeg', 'png'].includes(e)) return 'Imagen'
  if (['doc', 'docx'].includes(e)) return 'Word'
  if (['xls', 'xlsx'].includes(e)) return 'Excel'
  if (['ppt', 'pptx'].includes(e)) return 'PowerPoint'
  if (e === 'zip') return 'ZIP'
  return 'Archivo'
}
export function IconoArchivo({ nombre, size = 17 }: { nombre: string; size?: number }) {
  const e = ext(nombre)
  if (['mp3', 'm4a', 'wav'].includes(e)) return <Music size={size}/>
  if (['jpg', 'jpeg', 'png'].includes(e)) return <ImagenIcono size={size}/>
  if (e === 'zip') return <FileArchive size={size}/>
  if (['pdf', 'epub', 'doc', 'docx'].includes(e)) return <FileText size={size}/>
  return <File size={size}/>
}

async function token() {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token || ''
}
async function api(ruta: string, cuerpo: unknown) {
  const res = await fetch(ruta, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify(cuerpo) })
  return res.json().catch(() => ({ ok: false, mensaje: 'No pudimos conectarnos. Revisá tu internet.' }))
}

// sube con barra de progreso (el link firmado vale una sola vez, para esa carpeta)
function subirConProgreso(url: string, archivo: Blob, alAvanzar: (p: number) => void): Promise<boolean> {
  return new Promise(ok => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('x-upsert', 'false')
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (anon) xhr.setRequestHeader('apikey', anon)
    xhr.upload.onprogress = e => { if (e.lengthComputable) alAvanzar(Math.round(e.loaded / e.total * 100)) }
    xhr.onload = () => ok(xhr.status >= 200 && xhr.status < 300)
    xhr.onerror = () => ok(false)
    xhr.onabort = () => ok(false)
    const datos = new FormData()
    datos.append('cacheControl', '3600')
    datos.append('', archivo)
    xhr.send(datos)
  })
}

export default function ArchivosDescargable({ cursoId, pausado, onCambio }: { cursoId: string; pausado: boolean; onCambio?: (lista: Archivo[]) => void }) {
  const [lista, setLista] = useState<Archivo[]>([])
  const [cargando, setCargando] = useState(true)
  const [espacio, setEspacio] = useState<{ usado: number; total: number } | null>(null)
  const [subiendo, setSubiendo] = useState<{ nombre: string; pct: number } | null>(null)
  const [compradoras, setCompradoras] = useState(0)
  const entrada = useRef<HTMLInputElement | null>(null)
  const reemplazarId = useRef<string | null>(null)

  useEffect(() => { cargar() }, [cursoId])
  useEffect(() => { onCambio?.(lista) }, [lista])

  async function cargar() {
    try {
      const s = createClient()
      const [{ data }, esp, { count }] = await Promise.all([
        s.from('descargable_archivos').select('id, nombre, tamano, mime, es_bonus, bonus_valor, orden').eq('course_id', cursoId).order('orden'),
        api('/api/descargables/espacio', {}),
        s.from('enrollments').select('id', { count: 'exact', head: true }).eq('course_id', cursoId).eq('estado', 'activa'),
      ])
      setLista((data || []).map((a: any) => ({ ...a, tamano: Number(a.tamano) || 0 })))
      if (esp?.ok) setEspacio({ usado: esp.usado, total: esp.total })
      setCompradoras(count || 0)
    } finally { setCargando(false) }
  }

  function elegir(reemplaza: string | null) {
    if (subiendo) return
    if (pausado) { toast('Tu plan es Básico: subir archivos es parte de Premium.', 'error'); return }
    if (!reemplaza && lista.length >= MAX_ARCHIVOS) { toast(`Cada descargable puede tener hasta ${MAX_ARCHIVOS} archivos.`, 'error'); return }
    reemplazarId.current = reemplaza
    entrada.current?.click()
  }

  async function subir(archivo: File) {
    const reemplaza = reemplazarId.current
    reemplazarId.current = null
    if (entrada.current) entrada.current.value = ''
    // revisiones antes de subir (el servidor las repite)
    const e = ext(archivo.name)
    if (e === 'mp4' || e === 'mov') { toast('Los videos no se suben como archivo: pegá el link de YouTube en «Video de presentación».', 'error'); return }
    if (!EXT_OK.includes(e)) { toast('Este tipo de archivo no se puede vender por seguridad. Probá con PDF, EPUB, audio, imagen, Word, Excel, PowerPoint o ZIP.', 'error'); return }
    if (archivo.size > MAX_ARCHIVO) { toast(`Este archivo pesa ${pesoLegible(archivo.size)}. El máximo es 30 MB.`, 'error'); return }
    if (archivo.size === 0) { toast('Este archivo está vacío.', 'error'); return }
    const viejo = reemplaza ? lista.find(a => a.id === reemplaza)?.tamano || 0 : 0
    if (espacio && archivo.size > espacio.total - espacio.usado + viejo) {
      toast(`Te quedan ${pesoLegible(Math.max(0, espacio.total - espacio.usado + viejo))} de ${pesoLegible(espacio.total)}. Borrá algún archivo o subí uno más liviano.`, 'error'); return
    }
    setSubiendo({ nombre: archivo.name, pct: 0 })
    try {
      const pedido = await api('/api/descargables/subir', { courseId: cursoId, nombre: archivo.name, tamano: archivo.size, reemplaza })
      if (!pedido.ok) { toast(pedido.mensaje || 'No se pudo subir. Probá de nuevo.', 'error'); return }
      const subio = await subirConProgreso(pedido.signedUrl, archivo, pct => setSubiendo({ nombre: archivo.name, pct }))
      if (!subio) { toast('La subida se cortó. Revisá tu internet y probá de nuevo.', 'error'); return }
      const conf = await api('/api/descargables/confirmar', { archivoId: pedido.archivoId, reemplaza })
      if (!conf.ok) { toast(conf.mensaje || 'No se pudo subir. Probá de nuevo.', 'error'); return }
      toast(reemplaza ? 'Archivo reemplazado: quienes ya compraron bajan la versión nueva.' : `Listo · ${pesoLegible(conf.archivo.tamano)}`, 'success')
      await cargar()
    } finally { setSubiendo(null) }
  }

  async function borrar(a: Archivo) {
    const aviso = compradoras > 0
      ? `${compradoras} persona${compradoras !== 1 ? 's' : ''} compr${compradoras !== 1 ? 'aron' : 'ó'} esto. Si lo borrás, dejan de poder descargar «${a.nombre}».\n\n¿Preferís reemplazarlo por una versión nueva? Tocá Cancelar y usá «Reemplazar».\n\n¿Lo borramos igual?`
      : `¿Borrar «${a.nombre}»?`
    if (!confirm(aviso)) return
    const r = await api('/api/descargables/borrar', { archivoId: a.id })
    if (!r.ok) { toast(r.mensaje || 'No se pudo borrar.', 'error'); return }
    toast(r.pasoABorrador ? 'Archivo borrado. Como no le quedan archivos, el descargable pasó a borrador.' : 'Archivo borrado.', r.pasoABorrador ? 'info' : 'success')
    await cargar()
  }

  async function marcarBonus(a: Archivo, valor: boolean) {
    if (valor && lista.filter(x => !x.es_bonus && x.id !== a.id).length === 0) {
      toast('El descargable necesita al menos un archivo principal (que no sea bonus).', 'error'); return
    }
    const anterior = lista
    setLista(prev => prev.map(x => x.id === a.id ? { ...x, es_bonus: valor } : x))
    const { error } = await createClient().from('descargable_archivos').update({ es_bonus: valor }).eq('id', a.id)
    if (error) { setLista(anterior); toast('No se pudo guardar. Probá de nuevo.', 'error') }
  }

  async function guardarValor(a: Archivo, texto: string) {
    const limpio = texto.replace(/[^\d]/g, '')
    const valor = limpio ? Number(limpio) : null
    if (valor === a.bonus_valor) return
    const { error } = await createClient().from('descargable_archivos').update({ bonus_valor: valor }).eq('id', a.id)
    if (error) { toast('No se pudo guardar el valor.', 'error'); return }
    setLista(prev => prev.map(x => x.id === a.id ? { ...x, bonus_valor: valor } : x))
    toast('Valor guardado', 'success')
  }

  async function bajar(a: Archivo) {
    const r = await api('/api/descargables/link', { archivoId: a.id })
    if (!r.ok) { toast(r.mensaje || 'No pudimos preparar la descarga.', 'error'); return }
    window.location.href = r.url
  }

  const pctEspacio = espacio ? Math.min(100, Math.round(espacio.usado / espacio.total * 100)) : 0

  return (
    <div>
      <style>{`
        .arch-fila{display:flex;align-items:center;gap:10px;padding:10px 0;border-top:0.5px solid var(--border-light)}
        .arch-fila:first-child{border-top:none}
        .arch-ico{width:36px;height:36px;border-radius:10px;background:var(--accent-light);color:var(--accent);display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .arch-nombre{font-size:13px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .arch-meta{font-size:11px;color:var(--text-muted)}
        .arch-acc{width:30px;height:30px;border-radius:8px;border:0.5px solid var(--border);background:var(--bg-input);color:var(--text-muted);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
        .arch-acc:disabled{opacity:.4;cursor:default}
        .arch-subir{width:100%;margin-top:10px;display:flex;gap:8px;align-items:center;justify-content:center;padding:12px;border-radius:12px;border:1px dashed var(--accent);background:transparent;color:var(--accent);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
        .arch-subir:disabled{opacity:.5;cursor:default}
        .arch-bonus{display:flex;gap:8px;align-items:center;font-size:11.5px;color:var(--text-secondary);padding:0 0 8px 46px;flex-wrap:wrap}
        .arch-bonus input[type=text]{width:110px;padding:5px 8px;border-radius:8px;border:0.5px solid var(--border);background:var(--bg-input);color:var(--text-primary);font-size:12px;font-family:inherit}
        .arch-barra{height:6px;border-radius:4px;background:var(--border-light);overflow:hidden}
        .arch-barra > div{height:100%;border-radius:4px;transition:width .3s}
      `}</style>
      <input ref={entrada} type="file" style={{ display: 'none' }}
        accept=".pdf,.epub,.mp3,.m4a,.wav,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
        onChange={e => e.target.files?.[0] && subir(e.target.files[0])}/>

      <div style={{ border: '0.5px solid var(--border)', borderRadius: '14px', padding: '12px 14px', background: 'var(--bg-card)' }}>
        {cargando ? <div className="arch-meta" style={{ padding: '10px 0' }}>Cargando archivos…</div>
          : lista.length === 0 && !subiendo ? (
            <div className="arch-meta" style={{ padding: '6px 0', lineHeight: 1.6 }}>Todavía no subiste archivos. Subí al menos uno para poder publicarlo.</div>
          ) : lista.map(a => (
            <div key={a.id}>
              <div className="arch-fila">
                <span className="arch-ico"><IconoArchivo nombre={a.nombre}/></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="arch-nombre">{a.nombre}</div>
                  <div className="arch-meta">{tipoLegible(a.nombre)} · {pesoLegible(a.tamano)}{a.es_bonus ? ' · bonus' : ''}</div>
                </div>
                <button type="button" className="arch-acc" title="Descargar para revisar" aria-label="Descargar" onClick={() => bajar(a)}><Download size={14}/></button>
                <button type="button" className="arch-acc" title="Reemplazar por una versión nueva" aria-label="Reemplazar" disabled={!!subiendo || pausado} onClick={() => elegir(a.id)}><RefreshCw size={14}/></button>
                <button type="button" className="arch-acc" title="Borrar" aria-label="Borrar" disabled={!!subiendo} onClick={() => borrar(a)} style={{ color: '#EF4444' }}><Trash2 size={14}/></button>
              </div>
              <div className="arch-bonus">
                <label style={{ display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={a.es_bonus} onChange={e => marcarBonus(a, e.target.checked)} style={{ accentColor: '#DB2777' }}/>
                  <Gift size={12}/> Es un bonus de regalo
                </label>
                {a.es_bonus && (
                  <input type="text" inputMode="numeric" placeholder="Valor $ (opcional)" defaultValue={a.bonus_valor ?? ''}
                    onBlur={e => guardarValor(a, e.target.value)} aria-label="Valor del bonus en pesos"/>
                )}
              </div>
            </div>
          ))}
        {subiendo && (
          <div className="arch-fila">
            <span className="arch-ico"><Upload size={16}/></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="arch-nombre">{subiendo.nombre}</div>
              <div className="arch-barra" style={{ marginTop: '6px' }}><div style={{ width: `${subiendo.pct}%`, background: 'var(--accent)' }}/></div>
            </div>
            <span className="arch-meta" style={{ fontWeight: 700, color: 'var(--accent)' }}>{subiendo.pct}%</span>
          </div>
        )}
        <button type="button" className="arch-subir" disabled={!!subiendo || pausado || lista.length >= MAX_ARCHIVOS} onClick={() => elegir(null)}>
          <Upload size={15}/> {lista.length >= MAX_ARCHIVOS ? `Ya tenés ${MAX_ARCHIVOS} archivos (el máximo)` : lista.length ? 'Subir otro archivo' : 'Subir archivo'}
        </button>
      </div>

      {espacio && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-muted)' }}>
            <span>Tu espacio para descargables</span>
            <span><b style={{ color: 'var(--text-primary)' }}>{pesoLegible(espacio.usado)}</b> de {pesoLegible(espacio.total)}</span>
          </div>
          <div className="arch-barra" style={{ marginTop: '6px' }}>
            <div style={{ width: `${pctEspacio}%`, background: pctEspacio > 90 ? '#EF4444' : pctEspacio > 70 ? '#F59E0B' : '#10B981' }}/>
          </div>
        </div>
      )}
      <div className="field-hint" style={{ marginTop: '6px' }}>
        Hasta {MAX_ARCHIVOS} archivos de 30 MB cada uno: PDF, EPUB, audio (MP3, M4A, WAV), imágenes, Word, Excel, PowerPoint o ZIP. Son privados: solo los baja quien compró.
      </div>
    </div>
  )
}
