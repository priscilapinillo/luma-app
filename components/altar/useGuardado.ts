'use client'
// Guardado del Altar: autoguardado 2 segundos después de dejar de tocar, deshacer/rehacer y "dos dispositivos a la vez".
// Cada guardado manda la versión que tiene: si otro dispositivo guardó antes, la base no pisa nada y se pregunta qué versión queda.
import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { mensajeAltar, type PizarraFila } from '@/lib/altar'

export type EstadoGuardado = 'guardado' | 'pendiente' | 'guardando' | 'sinred' | 'error'

type FilaGuardable = { id: string; nombre: string; datos: any; version: number }
// tabla: 'pizarras' (siempre) o 'documentos' (Documento del Altar). mensaje: cómo explicar los errores de esa tabla.
export function useGuardado(fila: FilaGuardable, opciones: { tabla?: 'pizarras' | 'documentos'; mensaje?: (e: any) => { texto: string; tipo: string } } = {}) {
  const tabla = opciones.tabla || 'pizarras'
  const explicar = opciones.mensaje || mensajeAltar
  const [datos, setDatos] = useState<any>(fila.datos || {})
  const [nombre, setNombre] = useState(fila.nombre)
  const [estado, setEstado] = useState<EstadoGuardado>('guardado')
  const [aviso, setAviso] = useState<{ texto: string; tipo: string } | null>(null)
  const [soloLectura, setSoloLectura] = useState(false)
  const [conflicto, setConflicto] = useState<(FilaGuardable & Partial<PizarraFila>) | null>(null)
  const [puedeDeshacer, setPuedeDeshacer] = useState(false)
  const [puedeRehacer, setPuedeRehacer] = useState(false)

  const version = useRef(fila.version)
  const datosRef = useRef<any>(fila.datos || {})
  const guardadoJson = useRef(JSON.stringify(fila.datos || {}))
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const guardandoRef = useRef(false)
  const repetir = useRef(false)
  const historial = useRef<any[]>([])
  const futuro = useRef<any[]>([])
  const ultimoGrupo = useRef<{ g: string; t: number } | null>(null)

  const actualizarBotones = () => { setPuedeDeshacer(historial.current.length > 0); setPuedeRehacer(futuro.current.length > 0) }

  const guardar = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    if (guardandoRef.current) { repetir.current = true; return }
    const json = JSON.stringify(datosRef.current)
    if (json === guardadoJson.current) { setEstado(e => (e === 'pendiente' || e === 'sinred') ? 'guardado' : e); return }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { setEstado('sinred'); return }
    guardandoRef.current = true
    setEstado('guardando')
    try {
      const s = createClient()
      const { data, error } = await s.from(tabla).update({ datos: datosRef.current })
        .eq('id', fila.id).eq('version', version.current).select('version').maybeSingle()
      if (error) {
        const m = explicar(error)
        if (m.tipo === 'red') { setEstado('sinred'); return }
        if (m.tipo === 'lectura') setSoloLectura(true)
        setAviso(m); setEstado('error'); return
      }
      if (!data) {
        // otro dispositivo guardó antes (o la pizarra ya no está): no se pisa nada, se pregunta
        const { data: remota } = await s.from(tabla).select('*').eq('id', fila.id).maybeSingle()
        if (!remota) { setAviso({ texto: tabla === 'documentos' ? 'No se pudo guardar: este documento ya no está disponible (se borró en otro dispositivo o tu plan ya no es Premium). Copiá lo que escribiste antes de salir.' : 'Esta pizarra ya no existe (puede que se haya borrado desde otro dispositivo).', tipo: 'otro' }); setEstado('error'); return }
        setConflicto(remota as any); setEstado('error'); return
      }
      version.current = (data as any).version
      guardadoJson.current = json
      setAviso(null)
      setEstado(JSON.stringify(datosRef.current) === json ? 'guardado' : 'pendiente')
    } catch {
      setEstado(typeof navigator !== 'undefined' && navigator.onLine === false ? 'sinred' : 'error')
    } finally {
      guardandoRef.current = false
      if (repetir.current) { repetir.current = false; setTimeout(() => { guardar() }, 0) }
    }
  }, [fila.id, tabla])

  const programar = useCallback((ms = 2000) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { guardar() }, ms)
  }, [guardar])

  // cambiar: `grupo` junta en un solo "deshacer" los cambios seguidos de lo mismo (por ejemplo, escribir en una nota)
  const cambiar = useCallback((nuevo: any, grupo?: string) => {
    if (soloLectura) return
    const ahora = Date.now()
    const mismo = grupo && ultimoGrupo.current && ultimoGrupo.current.g === grupo && ahora - ultimoGrupo.current.t < 1200
    if (!mismo) {
      historial.current.push(datosRef.current)
      if (historial.current.length > 60) historial.current.shift()
      futuro.current = []
    }
    ultimoGrupo.current = grupo ? { g: grupo, t: ahora } : null
    datosRef.current = nuevo
    setDatos(nuevo)
    setEstado('pendiente')
    actualizarBotones()
    programar()
  }, [programar, soloLectura])

  const deshacer = useCallback(() => {
    const prev = historial.current.pop()
    if (prev === undefined) return
    futuro.current.push(datosRef.current)
    datosRef.current = prev; setDatos(prev); setEstado('pendiente'); ultimoGrupo.current = null
    actualizarBotones(); programar()
  }, [programar])
  const rehacer = useCallback(() => {
    const sig = futuro.current.pop()
    if (sig === undefined) return
    historial.current.push(datosRef.current)
    datosRef.current = sig; setDatos(sig); setEstado('pendiente'); ultimoGrupo.current = null
    actualizarBotones(); programar()
  }, [programar])

  // conflicto: quedarse con la de este dispositivo (se guarda encima de la otra, porque lo eligió) o traer la otra
  const resolverConflicto = useCallback(async (cual: 'mia' | 'otra') => {
    const remota = conflicto
    if (!remota) return
    setConflicto(null)
    version.current = remota.version
    if (cual === 'otra') {
      datosRef.current = remota.datos || {}; setDatos(remota.datos || {}); setNombre(remota.nombre)
      guardadoJson.current = JSON.stringify(remota.datos || {})
      historial.current = []; futuro.current = []; actualizarBotones()
      setEstado('guardado')
    } else {
      guardadoJson.current = '' // fuerza el guardado
      await guardar()
    }
  }, [conflicto, guardar])

  const renombrar = useCallback(async (n: string) => {
    const limpio = n.trim().slice(0, 80)
    if (!limpio || limpio === nombre) return false
    const { data, error } = await createClient().from(tabla).update({ nombre: limpio }).eq('id', fila.id).eq('version', version.current).select('version').maybeSingle()
    if (error || !data) return false
    version.current = (data as any).version
    setNombre(limpio)
    return true
  }, [fila.id, nombre])

  // otros cambios de la fila (fondo, papelera): primero lo pendiente y después con la versión, así nunca choca consigo misma
  const actualizar = useCallback(async (cambios: Record<string, any>) => {
    await guardar()
    const { data, error } = await createClient().from(tabla).update(cambios).eq('id', fila.id).eq('version', version.current).select('version').maybeSingle()
    if (error || !data) return false
    version.current = (data as any).version
    return true
  }, [fila.id, guardar])

  // al volver internet, guarda; si cierra la pestaña con cambios sin guardar, avisa; si la oculta, guarda ya
  useEffect(() => {
    const online = () => programar(300)
    const oculta = () => { if (document.visibilityState === 'hidden') guardar() }
    const salir = (e: BeforeUnloadEvent) => {
      if (JSON.stringify(datosRef.current) !== guardadoJson.current) { guardar(); e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('online', online)
    document.addEventListener('visibilitychange', oculta)
    window.addEventListener('beforeunload', salir)
    return () => {
      window.removeEventListener('online', online)
      document.removeEventListener('visibilitychange', oculta)
      window.removeEventListener('beforeunload', salir)
      if (timer.current) { clearTimeout(timer.current); guardar() }
    }
  }, [guardar, programar])

  // todo se guarda solo, 2 segundos después de dejar de tocar: no hay botón de guardar
  const textoEstado = estado === 'guardado' ? 'Guardado' : estado === 'guardando' || estado === 'pendiente' ? 'Guardando…' : estado === 'sinred' ? 'Sin internet: se guarda cuando vuelva' : 'No se guardó · tocá para reintentar'
  return { datos, cambiar, estado, textoEstado, aviso, setAviso, soloLectura, setSoloLectura, conflicto, resolverConflicto, deshacer, rehacer, puedeDeshacer, puedeRehacer, guardar, nombre, renombrar, actualizar, version }
}
