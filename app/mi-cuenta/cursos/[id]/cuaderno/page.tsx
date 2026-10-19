'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Search, Download, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { tieneAccesoCurso } from '@/lib/acceso'
import { type Apunte, apuntesDeCurso, linksDeCapturas, limpiarHtml, textoPlano, formatoMinuto, favoritosDe } from '@/lib/aula'
import { pdfDelCuaderno, type BloqueCuaderno } from '@/lib/pdfCuaderno'
import { descargarBlob, nombreArchivo } from '@/lib/pdfImagenes'

type Grupo = {
  clave: string
  moduloTitulo: string
  moduloOrden: number
  leccionId: string | null
  leccionTitulo: string
  leccionOrden: number
  eliminada: boolean
  apuntes: Apunte[]
}

const sinAcentos = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Página "Mi cuaderno" de un curso: todos los apuntes ordenados por módulo y lección, con buscador y PDF.
// Privada: solo la alumna la ve. Si se le venció el acceso, la puede seguir leyendo y descargando.
export default function MiCuadernoPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.id as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tituloCurso, setTituloCurso] = useState('')
  const [acceso, setAcceso] = useState(false)
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [fotos, setFotos] = useState<Record<string, string>>({})
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set())
  const [busqueda, setBusqueda] = useState('')
  const [armando, setArmando] = useState('')

  useEffect(() => { cargar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function cargar() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/aula'); return }
      const { data: persona } = await supabase.from('persons').select('id').eq('auth_user_id', user.id).maybeSingle()
      if (!persona) { setError('No encontramos tu cuenta de alumna.'); return }

      const { data: insc } = await supabase.from('enrollments').select('id, estado, modalidad, fecha_vencimiento')
        .eq('course_id', courseId).eq('person_id', persona.id).maybeSingle()
      if (!insc) { setError('No encontramos tu inscripción a este curso.'); return }
      const conAcceso = tieneAccesoCurso(insc)
      setAcceso(conAcceso)

      const [{ data: curso }, apuntes, favs] = await Promise.all([
        supabase.from('courses').select('titulo').eq('id', courseId).maybeSingle(),
        apuntesDeCurso(persona.id, courseId),
        favoritosDe(persona.id, courseId).catch(() => []),
      ])
      setTituloCurso(curso?.titulo || apuntes[0]?.modulo_titulo || 'Mi curso')
      setFavoritos(new Set(favs.map(f => f.lesson_id)))

      // el orden actual del curso (si la terapeuta reordenó, el cuaderno sigue el orden nuevo)
      const { data: mods } = await supabase.from('modules').select('id, titulo, orden').eq('course_id', courseId).order('orden')
      let lecs: { id: string; titulo: string; orden: number; module_id: string }[] = []
      if (mods && mods.length) {
        const ids = mods.map(m => m.id)
        const r1 = conAcceso ? await supabase.from('lessons').select('id, titulo, orden, module_id').in('module_id', ids) : { data: null }
        lecs = r1.data || []
        if (!lecs.length) {
          const r2 = await supabase.from('lessons_publicas').select('id, titulo, orden, module_id').in('module_id', ids)
          lecs = r2.data || []
        }
      }
      const porLeccion = new Map<string, Grupo>()
      for (const a of apuntes) {
        const lec = a.lesson_id ? lecs.find(l => l.id === a.lesson_id) : undefined
        const mod = lec ? mods?.find(m => m.id === lec.module_id) : undefined
        const eliminada = !a.lesson_id || (lecs.length > 0 && !lec)
        const clave = a.lesson_id || `eliminada:${a.leccion_titulo}`
        if (!porLeccion.has(clave)) {
          porLeccion.set(clave, {
            clave,
            moduloTitulo: mod?.titulo || a.modulo_titulo || 'Módulo',
            moduloOrden: eliminada ? 1e6 : (mod ? (mods || []).indexOf(mod) : a.modulo_orden),
            leccionId: eliminada ? null : a.lesson_id,
            leccionTitulo: lec?.titulo || a.leccion_titulo || 'Lección',
            leccionOrden: lec?.orden ?? a.leccion_orden,
            eliminada,
            apuntes: [],
          })
        }
        porLeccion.get(clave)!.apuntes.push(a)
      }
      const orden = { nota: 0, momento: 1, frase: 2, captura: 3 }
      const lista = [...porLeccion.values()].sort((x, y) => x.moduloOrden - y.moduloOrden || x.leccionOrden - y.leccionOrden)
      for (const g of lista) {
        g.apuntes.sort((p, q) => orden[p.tipo] - orden[q.tipo] || (p.tipo === 'momento' ? (p.segundo || 0) - (q.segundo || 0) : p.created_at.localeCompare(q.created_at)))
        g.apuntes = g.apuntes.filter(a => a.tipo !== 'nota' || textoPlano(a.contenido))
      }
      setGrupos(lista.filter(g => g.apuntes.length))
      const paths = apuntes.map(a => a.imagen_path).filter(Boolean) as string[]
      if (paths.length) linksDeCapturas(paths).then(setFotos).catch(() => null)
    } catch (e) {
      console.error(e)
      setError('No pudimos cargar tu cuaderno. Revisá tu conexión y recargá la página.')
    } finally { setLoading(false) }
  }

  const filtrados = useMemo(() => {
    const q = sinAcentos(busqueda.trim())
    if (!q) return grupos
    return grupos.map(g => {
      const enTitulo = sinAcentos(`${g.moduloTitulo} ${g.leccionTitulo}`).includes(q)
      const apuntes = enTitulo ? g.apuntes : g.apuntes.filter(a => sinAcentos(a.tipo === 'nota' ? textoPlano(a.contenido) : a.contenido).includes(q))
      return { ...g, apuntes }
    }).filter(g => g.apuntes.length)
  }, [grupos, busqueda])

  async function descargarPdf() {
    if (armando) return
    setArmando('Armando tu PDF…')
    try {
      const bloques: BloqueCuaderno[] = []
      let modulo = ''
      for (const g of filtrados) {
        const tituloModulo = g.eliminada ? 'Lecciones eliminadas' : g.moduloTitulo
        if (tituloModulo !== modulo) { bloques.push({ tipo: 'modulo', texto: tituloModulo }); modulo = tituloModulo }
        bloques.push({ tipo: 'leccion', texto: g.leccionTitulo, nota: g.eliminada ? 'Esta lección ya no está en el curso, pero tus apuntes siguen acá.' : undefined })
        for (const a of g.apuntes) {
          if (a.tipo === 'nota') bloques.push({ tipo: 'nota', html: limpiarHtml(a.contenido) })
          else if (a.tipo === 'momento') bloques.push({ tipo: 'momento', segundo: a.segundo, texto: a.contenido })
          else if (a.tipo === 'frase') bloques.push({ tipo: 'frase', texto: a.contenido })
          else bloques.push({ tipo: 'captura', url: a.imagen_path ? fotos[a.imagen_path] || null : null, segundo: a.segundo })
        }
      }
      const fecha = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
      const blob = await pdfDelCuaderno(tituloCurso, `Descargado el ${fecha}${busqueda.trim() ? ` · búsqueda: "${busqueda.trim()}"` : ''}`, bloques,
        hoja => setArmando(`Armando tu PDF… hoja ${hoja}`))
      descargarBlob(blob, `cuaderno-${nombreArchivo(tituloCurso)}.pdf`)
      setArmando('')
    } catch (e) {
      console.error(e)
      setArmando('No se pudo armar el PDF en este navegador. Probá desde otro (Chrome o Safari).')
      setTimeout(() => setArmando(''), 6000)
    }
  }

  const irA = (g: Grupo, segundo?: number | null) => {
    if (!acceso || !g.leccionId) return
    router.push(`/mi-cuenta/cursos/${courseId}?leccion=${g.leccionId}${segundo ? `&t=${Math.floor(segundo)}` : ''}`)
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '14px', color: '#8C7A55', fontFamily: 'sans-serif', background: '#FFFDF7' }}>Abriendo tu cuaderno…</div>

  let moduloActual = ''
  return (
    <div style={{ minHeight: '100vh', background: '#FAF6EC', fontFamily: "'Geist',sans-serif" }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        .cq-nav{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:14px 20px;background:white;border-bottom:1px solid #EADFC4}
        .cq-back{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:#525252;cursor:pointer;background:none;border:none;font-family:inherit}
        .cq-wrap{max-width:760px;margin:0 auto;padding:26px 18px 60px}
        .cq-tag{font-size:11px;letter-spacing:3px;color:#A8862E;font-weight:700}
        .cq-h1{font-family:'Cormorant Garamond',serif;font-size:34px;font-weight:600;color:#2A1B12;line-height:1.15;margin:4px 0 6px}
        .cq-sub{font-size:12px;color:#8C7A55;margin-bottom:18px}
        .cq-herr{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px}
        .cq-buscar{flex:1;min-width:200px;display:flex;align-items:center;gap:8px;padding:10px 12px;background:white;border:1px solid #EADFC4;border-radius:12px}
        .cq-buscar input{flex:1;border:none;outline:none;font-size:14px;font-family:inherit;background:transparent}
        .cq-pdf{display:inline-flex;align-items:center;gap:6px;padding:10px 14px;border-radius:12px;border:none;background:#2A1B4D;color:#F4EFE6;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit}
        .cq-pdf:disabled{opacity:.6;cursor:default}
        .cq-mod{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#A8862E;font-weight:800;margin:26px 0 8px}
        .cq-hoja{background:#FFFDF7;border:1px solid #EADFC4;border-radius:16px;padding:16px 18px;margin-bottom:12px}
        .cq-lec{display:flex;align-items:center;gap:8px;font-size:16px;font-weight:800;color:#3B2A12;margin-bottom:10px}
        .cq-lec button{border:none;background:none;font:inherit;color:inherit;cursor:pointer;text-align:left;padding:0}
        .cq-nota{font-size:14px;line-height:1.7;color:#262626;white-space:pre-wrap;overflow-wrap:anywhere;margin-bottom:10px}
        .cq-nota mark{border-radius:3px;padding:0 1px;color:inherit}
        .cq-nota mark.m1{background:#FDE68A}.cq-nota mark.m2{background:#E9D5FF}.cq-nota mark.m3{background:#FBCFE8}
        .cq-item{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;color:#404040;line-height:1.5;padding:7px 0;border-top:1px dashed #EFE4C9}
        .cq-min{flex-shrink:0;font-weight:800;color:#A8862E;background:#FBF3DF;border:none;border-radius:7px;padding:3px 7px;font-size:12px;font-family:inherit}
        .cq-min.link{cursor:pointer}
        .cq-frase{border-left:3px solid #C9A84C;padding-left:10px;font-style:italic;color:#3B2A12}
        .cq-foto{max-width:100%;width:320px;border-radius:10px;border:1px solid #EFE4C9;display:block}
        .cq-vacio{text-align:center;padding:50px 20px;color:#8C7A55;font-size:14px;line-height:1.6;background:#FFFDF7;border:1px dashed #EADFC4;border-radius:16px}
      `}</style>
      <nav className="cq-nav">
        <button className="cq-back" onClick={() => router.push(acceso ? `/mi-cuenta/cursos/${courseId}` : '/mi-cuenta/cursos')}>
          <ArrowLeft size={15}/> {acceso ? 'Volver al curso' : 'Mis cursos'}
        </button>
        <span style={{ fontSize: '11px', color: '#A8862E', fontWeight: 700 }}>🔒 Solo lo ves vos</span>
      </nav>
      <div className="cq-wrap">
        {error ? <div className="cq-vacio">{error}</div> : (<>
          <div className="cq-tag">✦ MI CUADERNO</div>
          <h1 className="cq-h1">{tituloCurso}</h1>
          <div className="cq-sub">
            {acceso ? 'Tocá una lección o un minuto para volver ahí.' : 'Tu acceso a las lecciones venció, pero tu cuaderno es tuyo: lo podés leer y descargar cuando quieras.'}
          </div>

          {grupos.length > 0 && (
            <div className="cq-herr">
              <label className="cq-buscar">
                <Search size={15} color="#A8862E"/>
                <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar en mis apuntes" aria-label="Buscar en mis apuntes"/>
              </label>
              <button className="cq-pdf" onClick={descargarPdf} disabled={!!armando || filtrados.length === 0}>
                <Download size={15}/> Descargar PDF
              </button>
            </div>
          )}
          {armando && <div style={{ fontSize: '12px', color: '#5B21B6', background: '#F5F3FF', padding: '10px 12px', borderRadius: '10px', marginBottom: '12px' }}>{armando}</div>}

          {grupos.length === 0 ? (
            <div className="cq-vacio">
              📓<br/>Todavía no escribiste nada.<br/>Tus apuntes de cada lección aparecen acá.
              {acceso && <div style={{ marginTop: '14px' }}><button className="cq-pdf" onClick={() => router.push(`/mi-cuenta/cursos/${courseId}`)}>Ir al curso</button></div>}
            </div>
          ) : filtrados.length === 0 ? (
            <div className="cq-vacio">No encontramos “{busqueda}” en tus apuntes.</div>
          ) : filtrados.map(g => {
            const tituloModulo = g.eliminada ? 'Lecciones eliminadas' : g.moduloTitulo
            const mostrarModulo = tituloModulo !== moduloActual
            moduloActual = tituloModulo
            return (
              <div key={g.clave}>
                {mostrarModulo && <div className="cq-mod">{tituloModulo}</div>}
                <div className="cq-hoja">
                  <div className="cq-lec">
                    {g.leccionId && favoritos.has(g.leccionId) && <Star size={14} color="#C9A84C" fill="#C9A84C"/>}
                    {acceso && g.leccionId ? <button onClick={() => irA(g)}>{g.leccionTitulo} →</button> : <span>{g.leccionTitulo}</span>}
                  </div>
                  {g.eliminada && <div style={{ fontSize: '12px', color: '#B45309', marginTop: '-6px', marginBottom: '8px' }}>Esta lección ya no está en el curso, pero tus apuntes siguen acá.</div>}
                  {g.apuntes.map(a => a.tipo === 'nota' ? (
                    <div key={a.id} className="cq-nota" dangerouslySetInnerHTML={{ __html: limpiarHtml(a.contenido) }}/>
                  ) : (
                    <div key={a.id} className="cq-item">
                      {a.tipo === 'momento' && <button className={`cq-min${acceso && g.leccionId ? ' link' : ''}`} onClick={() => irA(g, a.segundo)}>📍 {formatoMinuto(a.segundo)}</button>}
                      {a.tipo === 'captura' && a.segundo != null && <button className={`cq-min${acceso && g.leccionId ? ' link' : ''}`} onClick={() => irA(g, a.segundo)}>📷 {formatoMinuto(a.segundo)}</button>}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {a.tipo === 'frase' ? <div className="cq-frase">“{a.contenido}”</div>
                          : a.tipo === 'captura' ? (fotos[a.imagen_path || ''] ? <img className="cq-foto" src={fotos[a.imagen_path || '']} crossOrigin="anonymous" alt="Captura" loading="lazy"/> : <span style={{ color: '#B9AE96' }}>📷 Captura</span>)
                          : <span>{a.contenido || <span style={{ color: '#B9AE96' }}>Momento marcado</span>}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </>)}
      </div>
    </div>
  )
}
