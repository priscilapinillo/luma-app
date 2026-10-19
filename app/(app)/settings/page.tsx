'use client'

import { useEffect, useState, useRef } from 'react'
import { User, Shield, Database, Settings, Camera, Eye, EyeOff, Download, Trash2, LogOut, ChevronDown, Copy, ExternalLink, Check } from 'lucide-react'
import { comprimirImagen } from '@/lib/comprimirImagen'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import MiPlan from '@/components/MiPlan'
import { PASOS, calcularPasos, contarListos, primerIncompleto, limpiarSlug, type IdPaso } from '@/lib/progresoPagina'

type Destacado = {
  activa: boolean
  etiqueta: string
  titulo: string
  descripcion: string
  texto_boton: string
  accion: 'whatsapp' | 'link' | 'curso'
  imagen_url: string
  url: string
  curso_slug: string
  mensaje_whatsapp: string
}
const DESTACADO_VACIO: Destacado = { activa: false, etiqueta: 'Empezá por acá', titulo: '', descripcion: '',imagen_url: '', texto_boton: 'Quiero saber más',accion: 'whatsapp', url: '', curso_slug: '', mensaje_whatsapp: '' }

type Anuncio = {
  activa: boolean
  etiqueta: string
  titulo: string
  descripcion: string
  fecha: string
  texto_boton: string
  accion: 'ninguno' | 'whatsapp' | 'link' | 'curso'
  url: string
  curso_slug: string
  mensaje_whatsapp: string
}
const ANUNCIO_VACIO: Anuncio = { activa: false, etiqueta: 'Próximamente', titulo: '', descripcion: '', fecha: '', texto_boton: 'Quiero mi lugar', accion: 'ninguno', url: '', curso_slug: '', mensaje_whatsapp: '' }

function isoAInputLocal(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

type Perfil = {
  id?: string
  nombre_profesional: string; nombre_completo: string
  especialidad: string; bio: string; whatsapp: string
  zona_horaria: string; moneda: string; formato_fecha: string; avatar_url: string
  pagina_activa: boolean; mensaje_bienvenida: string
  tipo_pago: string; slug: string
  template: string
  secciones: { sobre_mi: boolean; testimonios: boolean; faq: boolean; disponibilidad: boolean }
  faq: { pregunta: string; respuesta: string }[]
  mp_access_token: string
  mp_activo: boolean
  acepta_transferencia?: boolean
alias_pago?: string
cbu?: string
titular_cuenta?: string
banco?: string
instrucciones_pago?: string
valores: { icon: string; name: string; desc: string }[]
testimonios: { texto: string; nombre: string }[]
links: { tipo: string; titulo: string; url: string; descripcion?: string }[]
destacado: Destacado
anuncio: Anuncio
}


const ZONAS = ['America/Argentina/Buenos_Aires','America/Santiago','America/Lima','America/Bogota','America/Mexico_City','America/Montevideo','Europe/Madrid']
const MONEDAS = [
  { codigo: 'ARS', simbolo: '$', nombre: 'Peso argentino' },
  { codigo: 'MXN', simbolo: 'MX$', nombre: 'Peso mexicano' },
  { codigo: 'COP', simbolo: 'COL$', nombre: 'Peso colombiano' },
  { codigo: 'CLP', simbolo: 'CL$', nombre: 'Peso chileno' },
  { codigo: 'PEN', simbolo: 'S/', nombre: 'Sol peruano' },
  { codigo: 'UYU', simbolo: '$U', nombre: 'Peso uruguayo' },
  { codigo: 'BOB', simbolo: 'Bs.', nombre: 'Boliviano' },
  { codigo: 'PYG', simbolo: '₲', nombre: 'Guaraní paraguayo' },
  { codigo: 'VES', simbolo: 'Bs.S', nombre: 'Bolívar venezolano' },
  { codigo: 'BRL', simbolo: 'R$', nombre: 'Real brasileño' },
  { codigo: 'USD', simbolo: 'USD', nombre: 'Dólar estadounidense' },
]

const SIMBOLOS_MONEDA: Record<string, string> = Object.fromEntries(MONEDAS.map(m => [m.codigo, m.simbolo]))
type Tab = 'pagina' | 'seguridad' | 'datos' | 'preferencias'

type Franja = { dia_semana: number; hora_inicio: string; hora_fin: string }
const DIAS_CORTO = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

// "Lun a Vie: 09:00 a 18:00 h · Sáb: 09:00 a 13:00 h"
function resumenHorarios(franjas: Franja[]) {
  if (franjas.length === 0) return ''
  const orden = [1,2,3,4,5,6,0]
  const porDia = orden
    .map(d => ({
      d,
      rangos: franjas
        .filter(f => f.dia_semana === d)
        .sort((a, b) => (a.hora_inicio || '').localeCompare(b.hora_inicio || ''))
        .map(f => `${(f.hora_inicio || '').slice(0,5)} a ${(f.hora_fin || '').slice(0,5)}`)
        .join(' y '),
    }))
    .filter(x => x.rangos)
  const grupos: { desde: number; hasta: number; rangos: string }[] = []
  for (const x of porDia) {
    const ult = grupos[grupos.length - 1]
    if (ult && ult.rangos === x.rangos && orden.indexOf(ult.hasta) === orden.indexOf(x.d) - 1) ult.hasta = x.d
    else grupos.push({ desde: x.d, hasta: x.d, rangos: x.rangos })
  }
  return grupos
    .map(g => `${g.desde === g.hasta ? DIAS_CORTO[g.desde] : `${DIAS_CORTO[g.desde]} a ${DIAS_CORTO[g.hasta]}`}: ${g.rangos} h`)
    .join(' · ')
}

// Corta una espera que se cuelga (por ejemplo, un service worker que nunca responde)
function conLimite<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('tardó demasiado')), ms))])
}

async function registroSW() {
  const existente = await navigator.serviceWorker.getRegistration()
  if (existente) return existente
  return navigator.serviceWorker.register('/sw.js')
}

export default function AjustesPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<Tab>('pagina')
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState(false)
  const [misCursos, setMisCursos] = useState<{ titulo: string; slug: string }[]>([])
  const [subiendoDestacado, setSubiendoDestacado] = useState(false)
  useEffect(() => { cargarDatos() }, [])
  const [guardando, setGuardando] = useState(false)
  const [notificacionesActivas, setNotificacionesActivas] = useState(false)
  const [loadingNoti, setLoadingNoti] = useState(false)

  // ── Página de reservas: resúmenes, bloques abiertos y avisos
  const [serviciosActivos, setServiciosActivos] = useState<string[]>([])
  const [franjas, setFranjas] = useState<Franja[]>([])
  const [avisosEnCuenta, setAvisosEnCuenta] = useState(false)
  const [abiertos, setAbiertos] = useState<IdPaso[]>([])
  const [ultimoBloque, setUltimoBloque] = useState<IdPaso | null>(null)
  const [slugAviso, setSlugAviso] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [instalada, setInstalada] = useState(false)
  const [esIOS, setEsIOS] = useState(false)
  const [permisoNoti, setPermisoNoti] = useState<'default' | 'granted' | 'denied' | 'no-soportado'>('default')
  const [puedeInstalar, setPuedeInstalar] = useState(false)
  const [msgAvisos, setMsgAvisos] = useState('')
  const promptInstalarRef = useRef<any>(null)
  const slugGuardadoRef = useRef('')
  const [slugPublicado, setSlugPublicado] = useState('') // la dirección que de verdad quedó guardada
  const abiertoInicialRef = useRef(false)

  // ¿Está abierta desde el ícono de la pantalla de inicio? ¿Es iPhone? ¿Qué permiso tiene?
  useEffect(() => {
    const nav: any = navigator
    setInstalada(!!window.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true)
    setEsIOS(/iphone|ipad|ipod/i.test(nav.userAgent || '') || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1))
    const soporta = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
    setPermisoNoti(soporta ? (Notification.permission as 'default' | 'granted' | 'denied') : 'no-soportado')
    function alOfrecerInstalar(e: any) { e.preventDefault(); promptInstalarRef.current = e; setPuedeInstalar(true) }
    function alInstalar() {
      promptInstalarRef.current = null
      setPuedeInstalar(false)
      setMsgAvisos('¡Listo! Ahora abrí Luma desde el ícono nuevo de tu pantalla de inicio y activá los avisos desde ahí.')
    }
    window.addEventListener('beforeinstallprompt', alOfrecerInstalar)
    window.addEventListener('appinstalled', alInstalar)
    return () => {
      window.removeEventListener('beforeinstallprompt', alOfrecerInstalar)
      window.removeEventListener('appinstalled', alInstalar)
    }
  }, [])

  async function instalarApp() {
    const ev = promptInstalarRef.current
    if (!ev) return
    try {
      ev.prompt()
      await ev.userChoice
    } catch (e) { console.error('Error instalando:', e) }
    promptInstalarRef.current = null
    setPuedeInstalar(false)
  }

  async function toggleNotificaciones() {
    if (!instalada) return // los avisos solo se activan con Luma instalada
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setMsgAvisos('Este celular no permite avisos. Probá actualizando el sistema.')
      return
    }
    setLoadingNoti(true)
    setMsgAvisos('')
    if (notificacionesActivas) {
      try {
        const registration = await conLimite(registroSW(), 8000)
        const subActual = await registration.pushManager.getSubscription()
        const endpoint = subActual?.endpoint
        if (subActual) await subActual.unsubscribe()
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user && endpoint) {
          // solo este dispositivo: los otros (por ejemplo la compu) siguen recibiendo avisos
          const { error } = await supabase.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', endpoint)
          if (error) console.error('Error borrando suscripción push:', error)
        }
        setNotificacionesActivas(false)
        await cargarResumenes()
      } catch (err) {
        console.error('Error desactivando notificaciones:', err)
        setMsgAvisos('No se pudieron desactivar. Probá de nuevo.')
      } finally {
        setLoadingNoti(false)
      }
      return
    }
    try {
      const permiso = await Notification.requestPermission()
      setPermisoNoti(permiso as 'default' | 'granted' | 'denied')
      if (permiso !== 'granted') return
      const registration = await conLimite(registroSW(), 8000)
      await conLimite(navigator.serviceWorker.ready, 8000)
      const sub = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })
      const supabase = createClient()
      const { data: { session: sesionPush } } = await supabase.auth.getSession()
      if (!sesionPush) { setMsgAvisos('Tu sesión expiró. Volvé a iniciar sesión.'); return }
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub, accessToken: sesionPush.access_token }),
      })
      if (!res.ok) throw new Error('No se pudo registrar el celular (' + res.status + ')')
      setNotificacionesActivas(true)
      setAvisosEnCuenta(true)
    } catch(err) {
      console.error('Error activando notificaciones:', err)
      setMsgAvisos('Hubo un error al activar los avisos. Cerrá Luma, volvé a abrirla desde el ícono y probá de nuevo.')
    } finally {
      setLoadingNoti(false)
    }
  }

  async function avisoPrueba() {
    try {
      const reg = await conLimite(registroSW(), 8000)
      await reg.showNotification('Luma ✦', { body: 'Así te va a llegar el aviso cuando alguien reserve o pague.' })
    } catch (e) {
      console.error('Error en aviso de prueba:', e)
      setMsgAvisos('No se pudo mostrar el aviso de prueba. Revisá que las notificaciones de Luma estén permitidas en tu celular.')
    }
  }

  const [subiendoAvatar, setSubiendoAvatar] = useState(false)
  const [email, setEmail] = useState('')
  const [ultimoAcceso, setUltimoAcceso] = useState('')
  const [suscripcion, setSuscripcion] = useState<any>(null)
  const [confirmEliminar, setConfirmEliminar] = useState(false)
  const [msgExito, setMsgExito] = useState('')
  const perfilGuardadoRef = useRef<string>(''); const tokenGuardadoRef = useRef<string>('')
  // ── autoguardado: refs para leer siempre lo último y no pisar guardados en curso
  const perfilActualRef = useRef<any>(null)
  const cargadoRef = useRef(false)
  const guardandoRef = useRef(false)
  const repetirRef = useRef(false)
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [estadoGuardado, setEstadoGuardado] = useState<'idle' | 'guardando' | 'guardado' | 'error' | 'sin_conexion'>('idle')

  const [perfil, setPerfil] = useState<Perfil>({
    nombre_profesional: '', nombre_completo: '', especialidad: '',
    bio: '', whatsapp: '', zona_horaria: 'America/Argentina/Buenos_Aires',
    moneda: 'ARS', formato_fecha: 'dd/mm/yyyy', avatar_url: '',
    pagina_activa: false, mensaje_bienvenida: '', tipo_pago: 'libre', slug: '',
    template: 'luna',
    secciones: { sobre_mi: true, testimonios: true, faq: false, disponibilidad: true },
    faq: [],
    mp_access_token: '',
    mp_activo: false,
    valores: [
      {icon:'👁', name:'Escucha', desc:'Te escucho con el corazón y sin juicios'},
      {icon:'✨', name:'Claridad', desc:'Aporto claridad a lo que hoy te confunde'},
      {icon:'🌙', name:'Acompaño', desc:'Te acompaño en cada paso de tu proceso'},
    ],
    testimonios: [],
    links: [],
    destacado: DESTACADO_VACIO,
    anuncio: ANUNCIO_VACIO,
  })

  perfilActualRef.current = perfil

  useEffect(() => {
    function avisarSalida(e: BeforeUnloadEvent) {
      if (JSON.stringify(perfil) !== perfilGuardadoRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', avisarSalida)
    return () => window.removeEventListener('beforeunload', avisarSalida)
  }, [perfil])

  const [passForm, setPassForm] = useState({
    nueva: '', confirmar: '', showNueva: false, showConfirmar: false,
  })
  const [passError, setPassError] = useState('')
  const [passExito, setPassExito] = useState(false)


  // servicios, horarios y avisos: se recargan al volver de Servicios o Agenda
  async function cargarResumenes(userId?: string) {
    try {
      const supabase = createClient()
      let uid = userId
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser()
        uid = user?.id
      }
      if (!uid) return
      const [{ data: servs }, { data: avail }, { data: pushs }] = await Promise.all([
        supabase.from('services').select('nombre').eq('user_id', uid).eq('activo', true),
        supabase.from('availability').select('dia_semana,hora_inicio,hora_fin').eq('user_id', uid).eq('activo', true),
        supabase.from('push_subscriptions').select('user_id').eq('user_id', uid).limit(1),
      ])
      if (servs) setServiciosActivos(servs.map((s: any) => s.nombre).filter(Boolean))
      if (avail) setFranjas(avail as Franja[])
      if (pushs) setAvisosEnCuenta(pushs.length > 0)
    } catch (e) {
      console.error('Error cargando servicios y horarios:', e)
    }
  }

  async function cargarDatos() {
    setErrorCarga(false)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !user.email) {
        window.location.href = '/auth/login'
        return
      }
      setEmail(user.email || '')
      setUltimoAcceso(user.last_sign_in_at || '')
      const [{ data: prof, error: errProf }, { data: subs }, { data: cred }] = await Promise.all([
        supabase.from('therapist_profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('mp_credenciales').select('access_token').eq('user_id', user.id).maybeSingle(),
      ])
      // si no pudimos leer el perfil, NO habilitamos el guardado automático (así nunca se pisa con vacío)
      if (errProf) throw errProf
      if (prof) {
        const perfilCargado = {
          id: prof.id,
        nombre_profesional: prof.nombre_profesional || '',
        nombre_completo: prof.nombre_completo || '',
        especialidad: prof.especialidad || '',
        bio: prof.bio || '',
        whatsapp: prof.whatsapp || '',
        zona_horaria: prof.zona_horaria || 'America/Argentina/Buenos_Aires',
        moneda: prof.moneda || 'ARS',
        formato_fecha: prof.formato_fecha || 'dd/mm/yyyy',
        avatar_url: prof.avatar_url || '',
        pagina_activa: prof.pagina_activa || false,
        mensaje_bienvenida: prof.mensaje_bienvenida || '',
        tipo_pago: prof.tipo_pago || 'libre',
        slug: prof.slug || '',
        template: prof.template || 'luna',
        secciones: prof.secciones || { sobre_mi: true, testimonios: true, faq: false, disponibilidad: true },
        faq: prof.faq || [],
        mp_access_token: cred?.access_token || prof.mp_access_token || '',
        mp_activo: prof.mp_activo || false,
        acepta_transferencia: prof.acepta_transferencia || false,
        alias_pago: prof.alias_pago || '',
        cbu: prof.cbu || '',
        titular_cuenta: prof.titular_cuenta || '',
        banco: prof.banco || '',
        instrucciones_pago: prof.instrucciones_pago || '',
        valores: prof.valores || [
          {icon:'👁', name:'Escucha', desc:'Te escucho con el corazón y sin juicios'},
          {icon:'✨', name:'Claridad', desc:'Aporto claridad a lo que hoy te confunde'},
          {icon:'🌙', name:'Acompaño', desc:'Te acompaño en cada paso de tu proceso'},
        ],
        testimonios: prof.testimonios || [],
        links: prof.links || [],
        destacado: { ...DESTACADO_VACIO, ...(prof.destacado || {}) },
        anuncio: { ...ANUNCIO_VACIO, ...(prof.anuncio || {}) },
      }
      setPerfil(perfilCargado)
      perfilGuardadoRef.current = JSON.stringify(perfilCargado); tokenGuardadoRef.current = (cred?.access_token || '').trim()
      slugGuardadoRef.current = prof.slug || ''
      setSlugPublicado(prof.slug || '')
      }
      if (subs) setSuscripcion(subs)
      // recién acá: la carga salió bien (o es una cuenta nueva sin perfil todavía)
      cargadoRef.current = true

      await cargarResumenes(user.id)

      try {
        const { data: cursosPropios } = await supabase.from('courses').select('titulo,slug').eq('user_id', user.id).eq('estado', 'publicado')
        if (cursosPropios) setMisCursos(cursosPropios)
      } catch (e) { console.error('Error cargando cursos:', e) }

      // ¿este celular tiene los avisos activados? (permiso + registro en este dispositivo + registro en la cuenta)
      try {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration()
          const subDispositivo = reg ? await reg.pushManager.getSubscription() : null
          if (subDispositivo) {
            const { data: pushSub } = await supabase.from('push_subscriptions').select('user_id').eq('user_id', user.id).eq('endpoint', subDispositivo.endpoint).limit(1)
            if (pushSub && pushSub.length > 0) setNotificacionesActivas(true)
          }
        }
      } catch (e) { console.error('Error revisando avisos:', e) }
    } catch (err) {
      console.error('Error cargando:', err)
      setErrorCarga(true)
    } finally {
      setLoading(false)
    }
  }

  // al volver de Servicios o Agenda (o si el celular reabre la pantalla), actualizamos los resúmenes
  useEffect(() => {
    function alVolverVisible() { if (document.visibilityState === 'visible' && cargadoRef.current) cargarResumenes() }
    function alMostrar(e: PageTransitionEvent) { if (e.persisted && cargadoRef.current) cargarResumenes() }
    document.addEventListener('visibilitychange', alVolverVisible)
    window.addEventListener('pageshow', alMostrar)
    return () => {
      document.removeEventListener('visibilitychange', alVolverVisible)
      window.removeEventListener('pageshow', alMostrar)
    }
  }, [])

  // botón "Guardar": avisa con cartel y alertas
  async function guardarPerfil() {
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
    await guardar(false)
  }

  // guardado automático: sin alertas, muestra el estado en el indicador
  function programarAutoguardado(ms: number) {
    if (!cargadoRef.current) return
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
    autoTimerRef.current = setTimeout(() => { guardar(true) }, ms)
  }

  async function sincronizarTokenMP(userId: string, token: string): Promise<boolean> { const limpio = (token || '').trim(); if (limpio === tokenGuardadoRef.current) return true; const supabase = createClient(); const { error } = limpio ? await supabase.from('mp_credenciales').upsert({ user_id: userId, access_token: limpio, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }) : await supabase.from('mp_credenciales').delete().eq('user_id', userId); if (error) { console.error('Error guardando token MP:', error); return false } tokenGuardadoRef.current = limpio; return true }

  async function guardar(silencioso: boolean) {
    if (!cargadoRef.current) return
    // si ya hay un guardado en curso, lo repetimos al terminar (así no se pisan)
    if (guardandoRef.current) { repetirRef.current = true; return }
    const perfil = perfilActualRef.current as Perfil
    const foto = JSON.stringify(perfil)
    if (silencioso && foto === perfilGuardadoRef.current) return

    guardandoRef.current = true
    setGuardando(true)
    setEstadoGuardado('guardando')
    let ok = false
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (!silencioso) alert('Tu sesión expiró. Volvé a iniciar sesión para guardar los cambios.')
        setEstadoGuardado('error')
        return
      }
      // la dirección: si no la tocó, queda exactamente igual (no cambiamos links que ya compartió);
      // si la cambió, se limpia; si está vacía, se propone a partir del nombre profesional
      const slugEscrito = perfil.slug || ''
      let slugFijo = slugEscrito && slugEscrito === slugGuardadoRef.current
        ? slugEscrito
        : (limpiarSlug(slugEscrito) || limpiarSlug(perfil.nombre_profesional || ''))
      let slugOcupado = false
      if (slugFijo && slugFijo !== slugGuardadoRef.current) {
        const { data: ocupada } = await supabase.from('therapist_profiles').select('user_id').eq('slug', slugFijo).neq('user_id', user.id).limit(1)
        if (ocupada && ocupada.length > 0) {
          slugOcupado = true
          setSlugAviso(`La dirección «${slugFijo}» ya está en uso. Probá con otra, por ejemplo «${slugFijo}-tarot» o «${slugFijo}-terapias».`)
          slugFijo = slugGuardadoRef.current // guardamos todo lo demás con la dirección anterior
        } else {
          setSlugAviso('')
        }
      }
      const datos = {
        user_id: user.id,
        nombre_profesional: perfil.nombre_profesional,
        nombre_completo: perfil.nombre_completo,
        especialidad: perfil.especialidad,
        bio: perfil.bio, whatsapp: perfil.whatsapp,
        zona_horaria: perfil.zona_horaria, moneda: perfil.moneda,
        formato_fecha: perfil.formato_fecha, avatar_url: perfil.avatar_url,
        pagina_activa: perfil.pagina_activa,
        mensaje_bienvenida: perfil.mensaje_bienvenida,
        tipo_pago: perfil.tipo_pago,
        slug: slugFijo,
        template: perfil.template,
        secciones: perfil.secciones,
        faq: perfil.faq,
        mp_access_token: null,
        mp_activo: perfil.mp_activo,
        acepta_transferencia: perfil.acepta_transferencia || false,
        alias_pago: perfil.alias_pago || '',
        cbu: perfil.cbu || '',
        titular_cuenta: perfil.titular_cuenta || '',
        banco: perfil.banco || '',
        instrucciones_pago: perfil.instrucciones_pago || '',
        valores: perfil.valores,
        testimonios: perfil.testimonios,
        links: perfil.links,
        destacado: perfil.destacado,
        anuncio: perfil.anuncio,
        updated_at: new Date().toISOString(),
      }
      // .select('id') para confirmar que de verdad se guardó una fila
      const { data: filas, error: errGuardar } = perfil.id
        ? await supabase.from('therapist_profiles').update(datos).eq('user_id', user.id).select('id')
        : await supabase.from('therapist_profiles').insert(datos).select('id')
      if (errGuardar || !filas || filas.length === 0) {
        console.error('Error guardando perfil:', errGuardar)
        const esDireccionRepetida = errGuardar?.code === '23505' && /slug/i.test(`${errGuardar?.message || ''} ${errGuardar?.details || ''}`)
        if (esDireccionRepetida) {
          // alguien la tomó justo ahora: avisamos y volvemos a la dirección anterior para no trabar el resto
          setSlugAviso(`La dirección «${slugFijo}» ya está en uso. Probá con otra.`)
          const alternativa = slugGuardadoRef.current || `${slugFijo || 'mi-pagina'}-${Math.floor(100 + Math.random() * 900)}`
          setPerfil(prev => ({ ...prev, slug: alternativa }))
          setEstadoGuardado('error')
          return
        }
        if (silencioso) setEstadoGuardado(typeof navigator !== 'undefined' && navigator.onLine === false ? 'sin_conexion' : 'error')
        else { setEstadoGuardado('error'); alert('No se pudo guardar: ' + (errGuardar?.message || 'volvé a iniciar sesión e intentá de nuevo.')) }
        return
      }

      // perfil nuevo: guardamos su id; dirección: dejamos en pantalla la que quedó guardada
      slugGuardadoRef.current = slugFijo
      setSlugPublicado(slugFijo)
      const cambios: Partial<Perfil> = {}
      if (!perfil.id && filas[0]?.id) cambios.id = filas[0].id
      if (!slugOcupado && slugFijo !== perfil.slug) cambios.slug = slugFijo
      if (slugOcupado) {
        // lo escrito sigue en pantalla para que lo corrija, pero no figura como guardado
        perfilGuardadoRef.current = JSON.stringify({ ...perfil, ...cambios, slug: slugFijo })
        if (Object.keys(cambios).length > 0) setPerfil(prev => ({ ...prev, ...cambios }))
      } else if (Object.keys(cambios).length > 0) {
        const actualizado = { ...perfil, ...cambios }
        perfilGuardadoRef.current = JSON.stringify(actualizado)
        setPerfil(prev => ({ ...prev, ...cambios }))
      } else {
        perfilGuardadoRef.current = foto
      }
      ok = true
      if (!(await sincronizarTokenMP(user.id, perfil.mp_access_token))) { setEstadoGuardado('error'); if (!silencioso) alert('Se guardó tu perfil, pero no se pudo guardar el token de Mercado Pago. Probá de nuevo.'); return } setEstadoGuardado('guardado')
      if (!silencioso) {
        setMsgExito('Perfil guardado correctamente')
        setTimeout(() => setMsgExito(''), 3000)
      }
    } catch (err) {
      console.error('Error guardando:', err)
      if (silencioso) setEstadoGuardado(typeof navigator !== 'undefined' && navigator.onLine === false ? 'sin_conexion' : 'error')
      else { setEstadoGuardado('error'); alert('No se pudo guardar. Revisá tu conexión e intentá de nuevo.') }
    } finally {
      guardandoRef.current = false
      setGuardando(false)
      if (repetirRef.current) {
        repetirRef.current = false
        setTimeout(() => { guardar(true) }, 0)
      } else if (ok) {
        setTimeout(() => setEstadoGuardado(prev => prev === 'guardado' ? 'idle' : prev), 2000)
      }
    }
  }

  // cada cambio que NO es escribir en un campo (interruptores, plantillas, agregar o borrar, imágenes) se guarda solo
  useEffect(() => {
    if (!cargadoRef.current) return
    if (JSON.stringify(perfil) === perfilGuardadoRef.current) return
    const el = typeof document !== 'undefined' ? document.activeElement as HTMLElement | null : null
    const tipoInput = el && el.tagName === 'INPUT' ? (el as HTMLInputElement).type : ''
    const escribiendo = !!el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !['checkbox','radio','file','button','submit','range','color'].includes(tipoInput)))
    if (escribiendo) return // se guarda al salir del campo
    programarAutoguardado(700)
  }, [perfil])

  // si cierra la app, cambia de app o se va a otra sección: guardamos lo último
  useEffect(() => {
    function alOcultar() { if (document.visibilityState === 'hidden') guardar(true) }
    function alSalir() { guardar(true) }
    document.addEventListener('visibilitychange', alOcultar)
    window.addEventListener('pagehide', alSalir)
    return () => {
      document.removeEventListener('visibilitychange', alOcultar)
      window.removeEventListener('pagehide', alSalir)
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
      guardar(true)
    }
  }, [])

  // si vuelve internet, reintenta
  useEffect(() => {
    function alVolver() { programarAutoguardado(300) }
    window.addEventListener('online', alVolver)
    return () => window.removeEventListener('online', alVolver)
  }, [])

  async function subirImagenDestacado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendoDestacado(true)
    try {
      const comprimida = await comprimirImagen(file, 1500)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const path = `${user.id}/destacado-${Date.now()}.jpg`
      const { error } = await supabase.storage.from('avatars').upload(path, comprimida, { upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      setPerfil(prev => ({ ...prev, destacado: { ...prev.destacado, imagen_url: data.publicUrl } }))
    } catch (err: any) {
      alert(err?.message || 'No se pudo subir la imagen.')
    } finally {
      setSubiendoDestacado(false)
      e.target.value = ''
    }
  }

  async function subirAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendoAvatar(true)
    try {
      const archivoComprimido = await comprimirImagen(file)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const path = `${user.id}/avatar.jpg`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, archivoComprimido, { upsert: true })
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
        const newUrl = urlData.publicUrl + '?t=' + Date.now()
        setPerfil(prev => ({ ...prev, avatar_url: newUrl }))
        await supabase.from('therapist_profiles')
          .update({ avatar_url: newUrl })
          .eq('user_id', user.id)
      }
    } catch(err: any) {
      console.error('Error subiendo avatar:', err)
      alert(err?.message || 'No se pudo procesar la imagen.')
    } finally {
      setSubiendoAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function cambiarPassword() {
    setPassError('')
    if (passForm.nueva.length < 6) { setPassError('La contraseña debe tener al menos 6 caracteres'); return }
    if (passForm.nueva !== passForm.confirmar) { setPassError('Las contraseñas no coinciden'); return }
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: passForm.nueva })
    if (error) { setPassError('No se pudo cambiar la contraseña'); return }
    setPassExito(true)
    setPassForm({ nueva: '', confirmar: '', showNueva: false, showConfirmar: false })
    setTimeout(() => setPassExito(false), 3000)
  }

  async function cerrarSesion() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  async function exportarCSV(tipo: 'pacientes' | 'finanzas') {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (tipo === 'pacientes') {
      const { data } = await supabase.from('patients').select('*').eq('user_id', user.id)
      if (!data) return
      const csv = ['Nombre,Apellido,Celular,Email,Cumpleaños,Contexto',...data.map(p => `${p.nombre},${p.apellido},${p.celular||''},${p.email||''},${p.fecha_nacimiento||''},${(p.contexto_general||'').replace(/,/g,' ')}`)].join('\n')
      descargarCSV(csv, 'pacientes-luma.csv')
    } else {
      const { data } = await supabase.from('sessions').select('*').eq('user_id', user.id)
      if (!data) return
      const csv = ['Fecha,Hora,Servicio,Precio,Estado Pago,Estado Sesion',...data.map(s => `${s.fecha?.split('T')[0]||''},${s.hora||''},${s.servicio_nombre||''},${s.precio||0},${s.estado_pago||''},${s.estado_sesion||''}`)].join('\n')
      descargarCSV(csv, 'finanzas-luma.csv')
    }
  }

  function descargarCSV(contenido: string, nombre: string) {
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = nombre; a.click()
    URL.revokeObjectURL(url)
  }

  const iniciales = perfil.nombre_profesional
    ? perfil.nombre_profesional.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()
    : '?'

  // ── progreso de Página de reservas (la misma regla que usa el cartel de Inicio)
  const pasos = calcularPasos({
    avatar_url: perfil.avatar_url,
    nombre_profesional: perfil.nombre_profesional,
    whatsapp: perfil.whatsapp,
    tipo_pago: perfil.tipo_pago,
    mp_activo: perfil.mp_activo,
    tiene_token_mp: !!(perfil.mp_access_token || '').trim(),
    acepta_transferencia: perfil.acepta_transferencia,
    alias_pago: perfil.alias_pago,
    slug: slugPublicado,
    pagina_activa: perfil.pagina_activa,
    servicios_activos: serviciosActivos.length,
    franjas_activas: franjas.length,
    avisos_activos: avisosEnCuenta,
  })
  const listos = contarListos(pasos)

  // qué bloque se abre al entrar: el que pidió el link (?bloque=...), si no el primero sin completar
  useEffect(() => {
    if (loading || errorCarga || abiertoInicialRef.current) return
    abiertoInicialRef.current = true
    const params = new URLSearchParams(window.location.search)
    const t = params.get('tab')
    let b = params.get('bloque')
    if (t === 'perfil') b = 'perfil' // los links viejos a la pestaña Perfil abren el bloque 1
    if (t === 'seguridad' || t === 'datos' || t === 'preferencias') { setTab(t); return }
    const pedido = PASOS.some(p => p.id === b)
    const inicial = (pedido ? b : (primerIncompleto(pasos) || 'compartir')) as IdPaso
    setAbiertos([inicial])
    if (pedido) setTimeout(() => document.getElementById(`bloque-${inicial}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200)
  }, [loading, errorCarga])

  function alternar(id: IdPaso) {
    setAbiertos(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function irABloque(id: IdPaso) {
    setAbiertos(prev => prev.includes(id) ? prev : [...prev, id])
    setTimeout(() => document.getElementById(`bloque-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  const URL_PUBLICA = `https://lumaapp.lat/p/${slugPublicado}`
  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(URL_PUBLICA)
    } catch {
      window.prompt('Copiá tu link:', URL_PUBLICA)
    }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  // interruptor reutilizable (mismo diseño que los de antes)
  const interruptor = (activo: boolean, alCambiar: (v: boolean) => void, color = '#8B5CF6') => (
    <label style={{position:'relative',width:'40px',height:'22px',cursor:'pointer',display:'block',flexShrink:0}}>
      <input type="checkbox" style={{opacity:0,width:0,height:0,position:'absolute'}}
        checked={activo} onChange={e => alCambiar(e.target.checked)}/>
      <span style={{position:'absolute',inset:0,background:activo?color:'var(--border)',borderRadius:'22px',transition:'all 0.2s'}}>
        <span style={{position:'absolute',width:'16px',height:'16px',left:activo?'21px':'3px',top:'3px',background:'white',borderRadius:'50%',transition:'all 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}/>
      </span>
    </label>
  )

  // cada bloque: número, título, para qué sirve, estado y flechita. Se pueden abrir varios a la vez.
  const bloque = (id: IdPaso, contenido: React.ReactNode) => {
    const paso = PASOS.find(p => p.id === id)!
    const abierto = abiertos.includes(id)
    const listo = pasos[id]
    return (
      <section id={`bloque-${id}`} className={`pr-bloque${abierto ? ' abierto' : ''}`}>
        <button type="button" className="pr-cab" onClick={() => alternar(id)} aria-expanded={abierto}>
          <span className={`pr-num${listo ? ' listo' : ''}`}>{listo ? <Check size={14}/> : paso.numero}</span>
          <span className="pr-cab-txt">
            <span className="pr-tit">
              {paso.numero}. {paso.titulo}
              {ultimoBloque === id && estadoGuardado === 'guardado' && <span className="pr-guardado">Guardado ✓</span>}
              {ultimoBloque === id && estadoGuardado === 'guardando' && <span className="pr-guardado gris">Guardando…</span>}
            </span>
            <span className="pr-exp">{paso.explicacion}</span>
          </span>
          <span className={`pr-estado${listo ? ' listo' : ''}`}>{listo ? 'Listo' : 'Falta completar'}</span>
          <ChevronDown size={16} className="pr-flecha"/>
        </button>
        {abierto && (
          <div className="pr-cuerpo" onFocusCapture={() => setUltimoBloque(id)} onClickCapture={() => setUltimoBloque(id)}>
            {contenido}
          </div>
        )}
      </section>
    )
  }

  const tieneMedioDePago = (perfil.mp_activo && !!(perfil.mp_access_token || '').trim()) || (!!perfil.acepta_transferencia && !!(perfil.alias_pago || '').trim())
  const faltanParaCompartir = [
    !pasos.servicios && { id: 'servicios' as IdPaso, txt: 'tus servicios' },
    !pasos.horarios && { id: 'horarios' as IdPaso, txt: 'tus horarios' },
  ].filter(Boolean) as { id: IdPaso; txt: string }[]

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:'13px',color:'var(--text-muted)',background:'var(--bg)'}}>
      Cargando...
    </div>
  )

  if (errorCarga) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',padding:'24px',background:'var(--bg)'}}>
      <div style={{maxWidth:'360px',textAlign:'center',background:'var(--bg-card)',borderRadius:'20px',padding:'28px 22px',border:'0.5px solid var(--border-light)',boxShadow:'0 8px 32px var(--shadow)'}}>
        <div style={{fontSize:'32px',marginBottom:'10px'}}>☁️</div>
        <div style={{fontSize:'16px',fontWeight:800,color:'var(--text-primary)',marginBottom:'8px',fontFamily:"'Manrope',sans-serif"}}>No pudimos cargar tus datos</div>
        <p style={{fontSize:'13px',color:'var(--text-secondary)',lineHeight:1.6,margin:'0 0 18px'}}>Revisá tu conexión y reintentá. No se cambió nada de tu perfil.</p>
        <button className="save-btn" onClick={() => { setLoading(true); cargarDatos() }}
          style={{padding:'11px 22px',background:'linear-gradient(135deg,#8B5CF6,#A78BFA)',color:'white',border:'none',borderRadius:'11px',fontSize:'13px',fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
          Reintentar
        </button>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
  
  *{box-sizing:border-box}
  .sw{height:100vh;display:grid;grid-template-columns:240px 1fr;font-family:'Inter',sans-serif;background:var(--bg);overflow:hidden}
  .s-toggle-wrap{background:var(--bg-card);border-right:0.5px solid var(--border-light);padding:20px 14px;display:flex;flex-direction:column;gap:6px}
  .s-toggle-title{font-size:16px;font-weight:800;color:var(--text-primary);padding:0 4px;margin-bottom:10px;letter-spacing:-0.3px;font-family:'Manrope',sans-serif}
  .s-toggle-item{display:flex;align-items:center;gap:10px;padding:13px 14px;border-radius:14px;font-size:13px;font-weight:600;color:var(--text-secondary);cursor:pointer;transition:all 0.18s;border:1.5px solid transparent;background:var(--bg-input);font-family:inherit;width:100%;text-align:left}
  .s-toggle-item:hover{border-color:var(--border)}
  .s-toggle-item.active{background:var(--accent-light);color:var(--accent);font-weight:700;border-color:var(--accent)}
  .s-content{overflow-y:auto;padding:24px 28px}
  .s-section-title{font-size:18px;font-weight:800;color:var(--text-primary);letter-spacing:-0.5px;margin-bottom:4px;font-family:'Manrope',sans-serif}
  .s-section-sub{font-size:12px;color:var(--text-muted);margin-bottom:24px}
  .s-card{background:var(--bg-card);border-radius:18px;padding:20px 22px;border:0.5px solid var(--border-light);box-shadow:0 2px 12px var(--shadow);margin-bottom:16px}
  .s-card-title{font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:14px;display:flex;align-items:center;gap:7px;font-family:'Manrope',sans-serif}
  .avatar-wrap{display:flex;align-items:center;gap:16px;margin-bottom:20px}
  .avatar-img{width:72px;height:72px;border-radius:50%;object-fit:cover;border:2px solid var(--border)}
  .avatar-placeholder{width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#8B5CF6,#A78BFA);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:white;flex-shrink:0}
  .avatar-name{font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:2px;font-family:'Manrope',sans-serif}
  .avatar-spec{font-size:12px;color:var(--text-muted)}
  .avatar-btn{display:flex;align-items:center;gap:6px;padding:7px 14px;background:var(--accent-light);color:var(--accent);border:none;border-radius:9px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;margin-top:8px;transition:all 0.15s}
  .field-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .field{display:flex;flex-direction:column;gap:5px;margin-bottom:12px}
  .field.full{grid-column:1/-1}
  .field label{font-size:11px;font-weight:600;color:var(--text-primary)}
  .field input,.field select,.field textarea{padding:9px 11px;border-radius:10px;border:0.5px solid var(--border);font-size:13px;font-family:inherit;color:var(--text-primary);background:var(--bg-input);outline:none;width:100%}
  .field input:focus,.field select:focus,.field textarea:focus{border-color:var(--accent)}
  .field textarea{min-height:70px;resize:none}
  .field-hint{font-size:10px;color:var(--text-muted);margin-top:2px}
  .save-btn{display:inline-flex;align-items:center;gap:6px;padding:10px 20px;background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:white;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 4px 12px rgba(139,92,246,0.3);transition:all 0.15s}
  .save-btn:hover{box-shadow:0 6px 16px rgba(139,92,246,0.4);transform:translateY(-1px)}
  .save-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none}
  .msg-exito{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#059669;background:#DCFCE7;padding:7px 12px;border-radius:8px;border:0.5px solid #BBF7D0;margin-left:10px}
  .pass-field{position:relative;margin-bottom:12px}
  .pass-field label{font-size:11px;font-weight:600;color:var(--text-primary);display:block;margin-bottom:5px}
  .pass-input-wrap{position:relative}
  .pass-input{width:100%;padding:9px 38px 9px 11px;border-radius:10px;border:0.5px solid var(--border);font-size:13px;font-family:inherit;color:var(--text-primary);background:var(--bg-input);outline:none}
  .pass-input:focus{border-color:var(--accent)}
  .pass-eye{position:absolute;right:11px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-muted);display:flex;align-items:center}
  .pass-error{font-size:12px;color:#EF4444;padding:8px 12px;background:#FEF2F2;border-radius:8px;border:0.5px solid #FECACA;margin-bottom:12px}
  .pass-exito{font-size:12px;color:#059669;padding:8px 12px;background:#DCFCE7;border-radius:8px;border:0.5px solid #BBF7D0;margin-bottom:12px}
  .subs-card{background:linear-gradient(135deg,#1A1035,#3B1F7A);border-radius:18px;padding:20px 22px;margin-bottom:16px}
  .subs-label{font-size:10px;font-weight:700;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px}
  .subs-plan{font-size:20px;font-weight:800;color:white;letter-spacing:-0.5px;margin-bottom:4px;font-family:'Manrope',sans-serif}
  .subs-info{font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:14px}
  .subs-trial-bar{height:6px;background:rgba(255,255,255,0.15);border-radius:6px;overflow:hidden;margin-bottom:8px}
  .subs-trial-fill{height:100%;background:linear-gradient(90deg,#A78BFA,#C084FC);border-radius:6px}
  .subs-trial-text{font-size:11px;color:rgba(255,255,255,0.5)}
  .danger-zone{border:0.5px solid #FECACA;border-radius:14px;padding:16px 18px;background:#FFF5F5}
  html.dark .danger-zone{background:#200808;border-color:#7F1D1D}
  .danger-title{font-size:12px;font-weight:700;color:#EF4444;margin-bottom:10px}
  .danger-btn{display:flex;align-items:center;gap:7px;padding:8px 14px;border-radius:9px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;border:0.5px solid #FECACA;background:transparent;color:#EF4444;transition:all 0.15s;width:100%;margin-bottom:8px}
  .danger-btn:hover{background:#FEF2F2}
  .export-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
  .export-card{background:var(--bg-input);border-radius:12px;padding:16px;border:0.5px solid var(--border-light);text-align:center;cursor:pointer;transition:all 0.15s}
  .export-card:hover{background:var(--accent-light);border-color:var(--border);transform:translateY(-1px)}
  .export-icon{width:36px;height:36px;border-radius:10px;background:var(--accent-light);display:flex;align-items:center;justify-content:center;margin:0 auto 10px}
  .export-title{font-size:12px;font-weight:600;color:var(--text-primary);margin-bottom:3px}
  .export-sub{font-size:10px;color:var(--text-muted)}
  .pref-row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:0.5px solid var(--border-light)}
  .pref-row:last-child{border-bottom:none}
  .pref-label{font-size:13px;font-weight:500;color:var(--text-primary)}
  .pref-sub{font-size:11px;color:var(--text-muted);margin-top:2px}
  .pref-select{padding:6px 10px;border-radius:8px;border:0.5px solid var(--border);font-size:12px;font-family:inherit;color:var(--text-primary);background:var(--bg-input);outline:none;cursor:pointer}
  .confirm-overlay{position:fixed;inset:0;background:rgba(26,16,53,0.5);display:flex;align-items:center;justify-content:center;z-index:100;backdrop-filter:blur(4px)}
  .confirm-box{background:var(--bg-card);border-radius:20px;padding:24px;width:360px;box-shadow:0 32px 80px rgba(100,60,200,0.25)}
  .confirm-title{font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:8px;font-family:'Manrope',sans-serif}
  .confirm-text{font-size:13px;color:var(--text-secondary);line-height:1.6;margin-bottom:20px}
  .confirm-btns{display:flex;gap:8px}
  .confirm-cancel{flex:1;padding:10px;border-radius:10px;border:0.5px solid var(--border);background:var(--bg-card);font-size:13px;cursor:pointer;font-family:inherit;color:var(--text-secondary)}
  .confirm-delete{flex:1;padding:10px;border-radius:10px;border:none;background:#EF4444;color:white;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .info-item{background:var(--bg-input);border-radius:10px;padding:12px;border:0.5px solid var(--border-light)}
  .info-lbl{font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px}
  .info-val{font-size:13px;font-weight:600;color:var(--text-primary)}
  .s-toggle-mobile-wrap{display:none}
  @media(max-width:768px){
    .sw{grid-template-columns:1fr;height:auto;min-height:100vh;overflow:visible;display:flex;flex-direction:column}
    .s-toggle-wrap{display:none}
    .s-toggle-mobile-wrap{display:flex;gap:8px;overflow-x:auto;padding:12px 12px 10px;-webkit-overflow-scrolling:touch;scrollbar-width:none}
    .s-toggle-mobile-wrap::-webkit-scrollbar{display:none}
    .s-content{overflow:visible;padding:12px 12px 80px}
    .field-grid{grid-template-columns:1fr}
    .field.full{grid-column:1}
    .export-grid{grid-template-columns:1fr 1fr}
    .info-grid{grid-template-columns:1fr}
    .confirm-box{width:90vw}
    .pref-row{flex-direction:column;align-items:flex-start;gap:8px}
    .pref-select{width:100%}
  }
  .s-toggle-mobile-item{flex-shrink:0;padding:9px 16px;border-radius:20px;font-size:12.5px;font-weight:600;color:var(--text-secondary);background:var(--bg-input);border:1.5px solid var(--border);cursor:pointer;font-family:inherit;white-space:nowrap}
  .s-toggle-mobile-item.active{background:var(--accent);color:white;border-color:var(--accent)}
  .autosave-pill{position:fixed;right:20px;bottom:20px;z-index:250;padding:8px 14px;border-radius:20px;font-size:12px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,0.12);background:var(--bg-card);color:var(--text-secondary);border:0.5px solid var(--border);display:flex;align-items:center;gap:6px;font-family:inherit}
  .autosave-guardado{color:#059669;border-color:#A7F3D0}
  .autosave-error,.autosave-sin_conexion{color:#B45309;border-color:#FDE68A;background:#FFFBEB}
  .autosave-pill button{background:none;border:none;color:inherit;font-weight:800;text-decoration:underline;cursor:pointer;font-family:inherit;font-size:12px;padding:0}
  @media(max-width:767px){.autosave-pill{right:50%;transform:translateX(50%);bottom:calc(84px + env(safe-area-inset-bottom));white-space:nowrap}}
  .pr-progreso{background:var(--bg-card);border:0.5px solid var(--border-light);border-radius:16px;padding:14px 16px;margin-bottom:14px;box-shadow:0 2px 12px var(--shadow)}
  .pr-prog-txt{font-size:13px;color:var(--text-secondary);margin-bottom:8px}
  .pr-prog-txt strong{color:var(--text-primary)}
  .pr-barra{height:8px;border-radius:8px;background:var(--bg-input);overflow:hidden}
  .pr-barra>div{height:100%;background:linear-gradient(90deg,#8B5CF6,#C084FC);border-radius:8px;transition:width .4s}
  .pr-bloque{background:var(--bg-card);border:0.5px solid var(--border-light);border-radius:18px;margin-bottom:10px;box-shadow:0 2px 12px var(--shadow);overflow:hidden;scroll-margin-top:16px}
  .pr-bloque.abierto{border-color:var(--border)}
  .pr-cab{display:flex;align-items:center;gap:12px;width:100%;padding:16px 18px;background:none;border:none;cursor:pointer;text-align:left;font-family:inherit;color:inherit}
  .pr-num{width:30px;height:30px;border-radius:50%;background:var(--bg-input);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:var(--text-secondary);flex-shrink:0}
  .pr-num.listo{background:#059669;border-color:#059669;color:white}
  .pr-cab-txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
  .pr-tit{font-size:14px;font-weight:700;color:var(--text-primary);font-family:'Manrope',sans-serif;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .pr-exp{font-size:11.5px;color:var(--text-muted);line-height:1.45}
  .pr-guardado{font-size:10.5px;font-weight:700;color:#059669}
  .pr-guardado.gris{color:var(--text-muted)}
  .pr-estado{font-size:10.5px;font-weight:700;padding:4px 9px;border-radius:20px;background:#FEF3C7;color:#92400E;white-space:nowrap;flex-shrink:0}
  .pr-estado.listo{background:#DCFCE7;color:#166534}
  .pr-flecha{color:var(--text-muted);transition:transform .2s;flex-shrink:0}
  .pr-bloque.abierto .pr-flecha{transform:rotate(180deg)}
  .pr-cuerpo{padding:14px 18px 18px;border-top:0.5px solid var(--border-light)}
  .pr-resumen{font-size:13px;color:var(--text-secondary);line-height:1.6;background:var(--bg-input);border-radius:12px;padding:12px 14px;margin-bottom:12px}
  .pr-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:11px 18px;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;border:none;background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:white;box-shadow:0 4px 12px rgba(139,92,246,.3);text-decoration:none}
  .pr-btn.sec{background:var(--accent-light);color:var(--accent);box-shadow:none}
  .pr-btn:disabled{opacity:.5;cursor:not-allowed}
  .pr-aviso{font-size:12px;line-height:1.5;padding:10px 12px;border-radius:10px;background:#FFFBEB;border:0.5px solid #FDE68A;color:#92400E;margin:8px 0}
  html.dark .pr-aviso{background:#2A2108;border-color:#713F12;color:#FDE68A}
  .pr-aviso button{background:none;border:none;color:inherit;font-weight:800;text-decoration:underline;cursor:pointer;font-family:inherit;font-size:12px;padding:0}
  .pr-info{font-size:12px;line-height:1.55;padding:10px 12px;border-radius:10px;background:var(--bg-input);color:var(--text-secondary);margin:8px 0}
  .pr-sec{border-bottom:0.5px solid var(--border-light)}
  .pr-sec:last-child{border-bottom:none}
  .pr-sec-form{padding:2px 0 14px}
  .pr-opciones{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
  .pr-opcion{text-align:left;padding:14px;border-radius:14px;border:1.5px solid var(--border);background:var(--bg-input);cursor:pointer;font-family:inherit;color:var(--text-primary)}
  .pr-opcion.sel{border-color:var(--accent);background:var(--accent-light)}
  .pr-opcion strong{display:block;font-size:13px;margin-bottom:3px}
  .pr-opcion span{font-size:11.5px;color:var(--text-muted);line-height:1.4}
  .pr-fieldset{border:none;padding:0;margin:0;min-width:0}
  .pr-fieldset:disabled{opacity:.45}
  .pr-sub{font-size:12.5px;font-weight:800;color:var(--text-primary);margin:18px 0 8px;font-family:'Manrope',sans-serif}
  .pr-pasos-mini{margin:0 0 14px;padding-left:20px;font-size:13px;color:var(--text-secondary);line-height:1.8}
  .pr-slug{display:flex;align-items:stretch;border:0.5px solid var(--border);border-radius:12px;overflow:hidden;background:var(--bg-input)}
  .pr-slug span{padding:11px 2px 11px 12px;font-size:13px;color:var(--text-muted);white-space:nowrap}
  .pr-slug input{flex:1;min-width:0;border:none;background:transparent;padding:11px 12px 11px 0;font-size:13px;font-family:inherit;color:var(--text-primary);outline:none}
  .pr-acciones{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;align-items:center}
  .pr-copiar{position:relative;border-radius:13px;padding:2px;overflow:hidden;display:inline-flex;isolation:isolate}
  .pr-copiar::after{content:'';position:absolute;inset:0;border-radius:13px;background:var(--border);z-index:-2}
  .pr-copiar::before{content:'';position:absolute;left:50%;top:50%;width:300%;aspect-ratio:1;transform:translate(-50%,-50%) rotate(0deg);background:conic-gradient(from 0deg,transparent 0deg,transparent 240deg,#C084FC 300deg,#FDE68A 330deg,transparent 360deg);animation:pr-girar 7s linear infinite;z-index:-1}
  .pr-copiar button{border-radius:11px;padding:12px 18px;border:none;background:var(--bg-card);color:var(--text-primary);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;justify-content:center;gap:7px;width:100%}
  .pr-copiar button:disabled{opacity:.5;cursor:not-allowed}
  @keyframes pr-girar{to{transform:translate(-50%,-50%) rotate(360deg)}}
  @media (prefers-reduced-motion: reduce){.pr-copiar::before{animation:none;background:#A78BFA}}
  .pr-ver{font-size:14px;padding:13px 22px}
  .pr-ios{display:flex;flex-direction:column;gap:8px;margin:10px 0}
  .pr-ios div{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--text-secondary);line-height:1.4}
  .pr-ios b{width:26px;height:26px;border-radius:50%;background:var(--accent-light);color:var(--accent);display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0}
  .pr-plantillas{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
  @media(max-width:768px){
    .pr-cab{padding:14px;gap:10px}
    .pr-cuerpo{padding:12px 14px 16px}
    .pr-estado{font-size:9.5px;padding:3px 7px}
    .pr-opciones{grid-template-columns:1fr}
    .pr-plantillas{grid-template-columns:repeat(2,minmax(0,1fr))}
    .pr-acciones{flex-direction:column;align-items:stretch}
    .pr-acciones>*{width:100%}
    .pr-btn{width:100%;padding:13px 18px}
    .pr-cuerpo .pref-row{flex-direction:row;align-items:center;gap:12px}
  }
`}</style>

      <input ref={fileInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={subirAvatar}/>

      <div className="sw" onBlurCapture={() => programarAutoguardado(300)}>
      <div className="s-toggle-wrap">
          <div className="s-toggle-title">Ajustes</div>
          {([
            { id: 'pagina', icon: Settings, label: 'Página de reservas' },
            { id: 'seguridad', icon: Shield, label: 'Seguridad' },
            { id: 'datos', icon: Database, label: 'Datos y respaldo' },
            { id: 'preferencias', icon: Settings, label: 'Preferencias' },
          ] as const).map(({ id, icon: Icon, label }) => (
            <button key={id} className={`s-toggle-item${tab===id?' active':''}`} onClick={() => setTab(id)}>
              <Icon size={15}/>{label}
            </button>
          ))}
        </div>

        <div className="s-toggle-mobile-wrap">
  {([
    { id: 'pagina', label: 'Página de reservas' },
    { id: 'seguridad', label: 'Seguridad' },
    { id: 'datos', label: 'Datos' },
    { id: 'preferencias', label: 'Preferencias' },
  ] as const).map(({ id, label }) => (
    <button key={id} className={`s-toggle-mobile-item${tab===id?' active':''}`} onClick={() => setTab(id)}>
      {label}
    </button>
  ))}
</div>

        <div className="s-content">

          {tab === 'pagina' && (<>
            <div className="s-section-title">Página de reservas</div>
            <div className="s-section-sub">Completá los pasos en orden. Todo se guarda solo.</div>

            <div className="pr-progreso">
              <div className="pr-prog-txt">Tu página: <strong>{listos} de {PASOS.length}</strong> pasos listos</div>
              <div className="pr-barra"><div style={{width:`${(listos / PASOS.length) * 100}%`}}/></div>
            </div>

            {/* 1. PERFIL */}
            {bloque('perfil', (<>
              <div className="avatar-wrap">
                {perfil.avatar_url
                  ? <img src={perfil.avatar_url} className="avatar-img" alt="avatar"/>
                  : <div className="avatar-placeholder">{iniciales}</div>
                }
                <div>
                  <div className="avatar-name">{perfil.nombre_profesional || 'Tu nombre'}</div>
                  <div className="avatar-spec">{perfil.especialidad || 'Especialidad'}</div>
                  <button className="avatar-btn" onClick={() => fileInputRef.current?.click()} disabled={subiendoAvatar}>
                    <Camera size={12}/>{subiendoAvatar ? 'Subiendo...' : perfil.avatar_url ? 'Cambiar foto' : 'Subir foto'}
                  </button>
                  <div style={{fontSize:'10px',color:'var(--text-muted)',marginTop:'6px',lineHeight:'1.5'}}>
                    Es la foto que ven tus consultantes en tu página y cuando compartís tu link.
                  </div>
                </div>
              </div>
              <div className="field-grid">
                <div className="field">
                  <label>Nombre profesional</label>
                  <input placeholder="Ej: Priscila Tarot" value={perfil.nombre_profesional}
                    onChange={e => setPerfil({...perfil, nombre_profesional: e.target.value})}/>
                  <div className="field-hint">Es el nombre grande de tu página</div>
                </div>
                <div className="field">
                  <label>Nombre completo</label>
                  <input placeholder="Ej: Priscila García" value={perfil.nombre_completo}
                    onChange={e => setPerfil({...perfil, nombre_completo: e.target.value})}/>
                </div>
                <div className="field">
                  <label>Especialidad / Profesión</label>
                  <input placeholder="Ej: Tarotista · Terapeuta energética" value={perfil.especialidad}
                    onChange={e => setPerfil({...perfil, especialidad: e.target.value})}/>
                </div>
                <div className="field">
                  <label>WhatsApp</label>
                  <input placeholder="Ej: 5492236789012 (con código de país sin +)" value={perfil.whatsapp}
                    onChange={e => setPerfil({...perfil, whatsapp: e.target.value})}/>
                  <div className="field-hint">Aparece en tu página para que te puedan escribir.</div>
                </div>
                <div className="field full">
                  <label>Frase de bienvenida</label>
                  <input placeholder="Ej: Elegí lo que resuena con vos en este momento" value={perfil.mensaje_bienvenida} maxLength={140}
                    onChange={e => setPerfil({...perfil, mensaje_bienvenida: e.target.value})}/>
                  <div className="field-hint">La frase corta que aparece arriba de todo, debajo de tu nombre, apenas alguien abre tu página.</div>
                </div>
                <div className="field full">
                  <label>Bio (tu presentación)</label>
                  <textarea placeholder="Contá quién sos y cómo acompañás..."
                    value={perfil.bio} onChange={e => setPerfil({...perfil, bio: e.target.value})}
                    style={{minHeight:'90px'}}/>
                  <div className="field-hint">El texto más largo, que aparece más abajo en la sección «Sobre mí». Se muestra si tenés activada esa sección (bloque 5).</div>
                </div>
                <div className="field">
                  <label>Email</label>
                  <input value={email} disabled style={{opacity:0.5,cursor:'not-allowed'}}/>
                  <div className="field-hint">Para cambiar tu mail, escribinos a soporte.</div>
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginTop:'4px',flexWrap:'wrap'}}>
                <button className="save-btn" onClick={guardarPerfil} disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Guardar perfil'}
                </button>
                {msgExito && <span className="msg-exito">✓ {msgExito}</span>}
              </div>
            </>))}

            {/* 2. SERVICIOS */}
            {bloque('servicios', (<>
              <div className="pr-resumen">
                {serviciosActivos.length === 0
                  ? 'Todavía no tenés servicios activos.'
                  : `Tenés ${serviciosActivos.length} ${serviciosActivos.length === 1 ? 'servicio activo' : 'servicios activos'}: ${serviciosActivos.join(', ')}.`}
              </div>
              <a className="pr-btn" href="/services?desde=pagina">{serviciosActivos.length === 0 ? 'Crear mi primer servicio' : 'Ir a Servicios'} →</a>
            </>))}

            {/* 3. HORARIOS */}
            {bloque('horarios', (<>
              <div className="pr-resumen">
                {franjas.length === 0 ? 'Todavía no cargaste tus horarios.' : resumenHorarios(franjas)}
              </div>
              <a className="pr-btn" href="/calendar?desde=pagina&abrir=disponibilidad">{franjas.length === 0 ? 'Cargar mis horarios' : 'Ir a Agenda'} →</a>
            </>))}

            {/* 4. DISEÑO */}
            {bloque('diseno', (<>
              <div className="pr-plantillas">
      {[
        { id:'luna', nombre:'Luna', desc:'Oscuro · Místico · Tarot', emoji:'🌙', bg:'#0D0B14', color:'#C9A84C' },
        { id:'aura', nombre:'Aura', desc:'Claro · Limpio · Wellness', emoji:'✨', bg:'#F8F4FF', color:'#8B5CF6' },
        { id:'tierra', nombre:'Tierra', desc:'Orgánico · Beige · Natural', emoji:'🌿', bg:'#FAF7F0', color:'#92400E' },
        { id:'rosa', nombre:'Rosa', desc:'Romántico · Suave · Femenino', emoji:'🌸', bg:'#FFF0F6', color:'#BE185D' },
        { id:'violeta', nombre:'Violeta', desc:'Profundo · Mágico · Intenso', emoji:'💜', bg:'#1E0A3C', color:'#C084FC' },
        { id:'verde', nombre:'Verde', desc:'Natural · Sanador · Fresco', emoji:'🍃', bg:'#F0FDF4', color:'#065F46' },
      ].map(t => (
        <div key={t.id}
          onClick={() => setPerfil({...perfil, template: t.id})}
          style={{
            background: t.bg, borderRadius:'14px', padding:'16px 12px',
            border: perfil.template === t.id ? `2px solid ${t.color}` : '1.5px solid var(--border)',
            cursor:'pointer', textAlign:'center', transition:'all 0.2s',
            boxShadow: perfil.template === t.id ? `0 0 16px ${t.color}44` : 'none'
          }}>
          <div style={{fontSize:'24px',marginBottom:'6px'}}>{t.emoji}</div>
          <div style={{fontSize:'13px',fontWeight:700,color:t.color,marginBottom:'3px'}}>{t.nombre}</div>
          <div style={{fontSize:'10px',color:'#888',lineHeight:1.4}}>{t.desc}</div>
        </div>
      ))}
              </div>
              <div className="field-hint" style={{marginTop:'8px'}}>Cambiar de estilo no borra ni cambia nada de lo que cargaste.</div>
            </>))}

            {/* 5. SECCIONES */}
            {bloque('secciones', (<>
              {/* Sobre mí */}
              <div className="pr-sec">
                <div className="pref-row">
                  <div><div className="pref-label">Sobre mí</div><div className="pref-sub">Tu bio y tus valores</div></div>
                  {interruptor(perfil.secciones.sobre_mi, v => setPerfil({...perfil, secciones: {...perfil.secciones, sobre_mi: v}}))}
                </div>
                {perfil.secciones.sobre_mi && (
                  <div className="pr-sec-form">
                    {!perfil.bio.trim() && (
                      <div className="pr-aviso">Activaste Sobre mí pero todavía no escribiste tu bio. <button onClick={() => irABloque('perfil')}>Escribila en el bloque 1</button></div>
                    )}
                    <div style={{fontSize:'11px',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.5px',margin:'8px 0 10px'}}>Tus valores</div>
    {perfil.valores.map((v, i) => (
      <div key={i} style={{background:'var(--bg-input)',borderRadius:'14px',padding:'14px',border:'0.5px solid var(--border-light)',marginBottom:'12px',display:'flex',flexDirection:'column',gap:'10px'}}>
      <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
        <span style={{fontSize:'10px',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'1px'}}>Emoji</span>
        <input
          style={{padding:'9px',borderRadius:'10px',border:'0.5px solid var(--border)',fontSize:'22px',fontFamily:'inherit',color:'var(--text-primary)',background:'var(--bg-card)',outline:'none',textAlign:'center',width:'60px'}}
          value={v.icon}
          maxLength={2}
          placeholder="👁"
          onChange={e => {
            const nuevo = [...perfil.valores]
            nuevo[i] = {...nuevo[i], icon: e.target.value}
            setPerfil({...perfil, valores: nuevo})
          }}/>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
        <span style={{fontSize:'10px',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'1px'}}>Título <span style={{fontWeight:400,textTransform:'none',letterSpacing:0}}>({v.name.length}/19)</span></span>
        <input
          style={{padding:'9px 11px',borderRadius:'10px',border:'0.5px solid var(--border)',fontSize:'13px',fontFamily:'inherit',color:'var(--text-primary)',background:'var(--bg-card)',outline:'none',width:'100%'}}
          placeholder="Ej: Escucha"
          maxLength={19}
          value={v.name}
          onChange={e => {
            const nuevo = [...perfil.valores]
            nuevo[i] = {...nuevo[i], name: e.target.value}
            setPerfil({...perfil, valores: nuevo})
          }}/>
        <span style={{fontSize:'10px',color:'var(--text-muted)'}}>Una o dos palabras máximo.</span>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
        <span style={{fontSize:'10px',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'1px'}}>Descripción <span style={{fontWeight:400,textTransform:'none',letterSpacing:0}}>({v.desc.length}/60)</span></span>
        <textarea
          style={{padding:'9px 11px',borderRadius:'10px',border:'0.5px solid var(--border)',fontSize:'13px',fontFamily:'inherit',color:'var(--text-primary)',background:'var(--bg-card)',outline:'none',width:'100%',minHeight:'70px',resize:'none'}}
          placeholder="Ej: Te acompaño en cada paso de tu proceso."
          maxLength={60}
          value={v.desc}
          onChange={e => {
            const nuevo = [...perfil.valores]
            nuevo[i] = {...nuevo[i], desc: e.target.value}
            setPerfil({...perfil, valores: nuevo})
          }}/>
                   </div>
      </div>
    ))}
                  </div>
                )}
              </div>

              {/* Disponibilidad */}
              <div className="pr-sec">
                <div className="pref-row">
                  <div><div className="pref-label">Disponibilidad</div><div className="pref-sub">Calendario con tus horarios libres (los del bloque 3)</div></div>
                  {interruptor(perfil.secciones.disponibilidad, v => setPerfil({...perfil, secciones: {...perfil.secciones, disponibilidad: v}}))}
                </div>
                {perfil.secciones.disponibilidad && franjas.length === 0 && (
                  <div className="pr-sec-form">
                    <div className="pr-aviso">Activaste Disponibilidad pero no cargaste horarios. <button onClick={() => irABloque('horarios')}>Ir al bloque 3</button></div>
                  </div>
                )}
              </div>

              {/* Testimonios */}
              <div className="pr-sec">
                <div className="pref-row">
                  <div><div className="pref-label">Testimonios</div><div className="pref-sub">Opiniones de tus consultantes</div></div>
                  {interruptor(perfil.secciones.testimonios, v => setPerfil({...perfil, secciones: {...perfil.secciones, testimonios: v}}))}
                </div>
                {perfil.secciones.testimonios && (
                  <div className="pr-sec-form">
                    {!perfil.testimonios.some(t => (t.texto || '').trim()) && (
                      <div className="pr-aviso">Activaste Testimonios pero no cargaste ninguno.</div>
                    )}
    {perfil.testimonios.map((testi, i) => (
      <div key={i} style={{background:'var(--bg-input)',borderRadius:'12px',padding:'12px',marginBottom:'8px',border:'0.5px solid var(--border-light)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'8px',marginBottom:'8px'}}>
          <input
            style={{flex:1,padding:'7px 10px',borderRadius:'8px',border:'0.5px solid var(--border)',fontSize:'12px',fontFamily:'inherit',color:'var(--text-primary)',background:'var(--bg-card)',outline:'none'}}
            placeholder="Nombre de la consultante..."
            value={testi.nombre}
            onChange={e => {
              const nuevo = [...perfil.testimonios]
              nuevo[i] = {...nuevo[i], nombre: e.target.value}
              setPerfil({...perfil, testimonios: nuevo})
            }}/>
          <button onClick={() => setPerfil({...perfil, testimonios: perfil.testimonios.filter((_,j) => j !== i)})}
            style={{width:'28px',height:'28px',border:'none',background:'#FEF2F2',color:'#EF4444',borderRadius:'8px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            ✕
          </button>
        </div>
        <textarea
          style={{width:'100%',padding:'7px 10px',borderRadius:'8px',border:'0.5px solid var(--border)',fontSize:'12px',fontFamily:'inherit',color:'var(--text-primary)',background:'var(--bg-card)',outline:'none',resize:'none',minHeight:'70px'}}
          placeholder="Testimonio..."
          value={testi.texto}
          onChange={e => {
            const nuevo = [...perfil.testimonios]
            nuevo[i] = {...nuevo[i], texto: e.target.value}
            setPerfil({...perfil, testimonios: nuevo})
          }}/>
      </div>
    ))}
    <button
      onClick={() => setPerfil({...perfil, testimonios: [...perfil.testimonios, {texto:'',nombre:''}]})}
      style={{width:'100%',padding:'9px',borderRadius:'10px',border:'1.5px dashed var(--border)',background:'transparent',fontSize:'12px',color:'var(--text-muted)',cursor:'pointer',fontFamily:'inherit',marginTop:'4px'}}>
      + Agregar testimonio
    </button>
                  </div>
                )}
              </div>

              {/* Preguntas frecuentes */}
              <div className="pr-sec">
                <div className="pref-row">
                  <div><div className="pref-label">Preguntas frecuentes</div><div className="pref-sub">Respondé dudas antes de que pregunten</div></div>
                  {interruptor(perfil.secciones.faq, v => setPerfil({...perfil, secciones: {...perfil.secciones, faq: v}}))}
                </div>
                {perfil.secciones.faq && (
                  <div className="pr-sec-form">
                    {!perfil.faq.some(f => (f.pregunta || '').trim()) && (
                      <div className="pr-aviso">Activaste Preguntas frecuentes pero no cargaste ninguna.</div>
                    )}
      {perfil.faq.map((item, i) => (
        <div key={i} style={{background:'var(--bg-input)',borderRadius:'12px',padding:'12px',marginBottom:'8px',border:'0.5px solid var(--border-light)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'8px',marginBottom:'8px'}}>
            <input
              style={{flex:1,padding:'7px 10px',borderRadius:'8px',border:'0.5px solid var(--border)',fontSize:'12px',fontFamily:'inherit',color:'var(--text-primary)',background:'var(--bg-card)',outline:'none'}}
              placeholder="Pregunta..."
              value={item.pregunta}
              onChange={e => {
                const nuevo = [...perfil.faq]
                nuevo[i] = {...nuevo[i], pregunta: e.target.value}
                setPerfil({...perfil, faq: nuevo})
              }}/>
            <button onClick={() => setPerfil({...perfil, faq: perfil.faq.filter((_,j) => j !== i)})}
              style={{width:'28px',height:'28px',border:'none',background:'#FEF2F2',color:'#EF4444',borderRadius:'8px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              ✕
            </button>
          </div>
          <textarea
            style={{width:'100%',padding:'7px 10px',borderRadius:'8px',border:'0.5px solid var(--border)',fontSize:'12px',fontFamily:'inherit',color:'var(--text-primary)',background:'var(--bg-card)',outline:'none',resize:'none',minHeight:'60px'}}
            placeholder="Respuesta..."
            value={item.respuesta}
            onChange={e => {
              const nuevo = [...perfil.faq]
              nuevo[i] = {...nuevo[i], respuesta: e.target.value}
              setPerfil({...perfil, faq: nuevo})
            }}/>
        </div>
      ))}
      <button
        onClick={() => setPerfil({...perfil, faq: [...perfil.faq, {pregunta:'',respuesta:''}]})}
        style={{width:'100%',padding:'9px',borderRadius:'10px',border:'1.5px dashed var(--border)',background:'transparent',fontSize:'12px',color:'var(--text-muted)',cursor:'pointer',fontFamily:'inherit',marginTop:'4px'}}>
        + Agregar pregunta
      </button>
                  </div>
                )}
              </div>

              {/* Servicio destacado */}
              <div className="pr-sec">
                <div className="pref-row">
                  <div><div className="pref-label">✦ Servicio destacado</div><div className="pref-sub">Arriba de todo en tu página: tu puerta de entrada</div></div>
                  {interruptor(perfil.destacado.activa, v => setPerfil({...perfil, destacado: {...perfil.destacado, activa: v}}), '#059669')}
                </div>
                {perfil.destacado.activa && (
                  <div className="pr-sec-form">
                    <div style={{fontSize:'11px',color:'var(--text-muted)',marginBottom:'4px',lineHeight:1.5}}>
                      Usalo para una sesión diagnóstico, una mentoría, un evento, un taller o tu curso estrella. Ideal cuando antes de reservar necesitás conocer a la persona.
                    </div>
                    {!perfil.destacado.titulo.trim() && (
                      <div className="pr-aviso">Activaste el servicio destacado pero le falta el título: sin título no se muestra.</div>
                    )}
    <div className="field" style={{marginTop:'12px'}}>
    <label>Imagen de portada (opcional)</label>
      <div style={{width:'100%',aspectRatio:'820/312',borderRadius:'12px',overflow:'hidden',background:'var(--bg-input)',border:'1px dashed var(--border)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'8px'}}>
        {perfil.destacado.imagen_url
          ? <img src={perfil.destacado.imagen_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
          : <span style={{fontSize:'12px',color:'var(--text-muted)'}}>📷 Sin imagen</span>}
      </div>
      <div style={{display:'flex',gap:'12px',alignItems:'center',flexWrap:'wrap'}}>
        <label style={{fontSize:'12px',fontWeight:600,color:'var(--accent, #8B5CF6)',cursor:'pointer',margin:0}}>
          {subiendoDestacado ? 'Subiendo...' : perfil.destacado.imagen_url ? 'Cambiar imagen' : 'Subir imagen'}
          <input type="file" accept="image/*" style={{display:'none'}} disabled={subiendoDestacado} onChange={subirImagenDestacado}/>
        </label>
        {perfil.destacado.imagen_url && (
          <button type="button" onClick={() => setPerfil({...perfil, destacado: {...perfil.destacado, imagen_url: ''}})}
            style={{fontSize:'12px',color:'#EF4444',background:'transparent',border:'none',cursor:'pointer',padding:0,fontFamily:'inherit'}}>
            Quitar
          </button>
        )}
      </div>
      <div className="field-hint">Recomendado: 820 x 312 px (horizontal, como una portada de Facebook). Lo importante, centrado: los bordes se pueden recortar un poco en el celular.</div>
    </div>
    <div className="field">
      <label>Etiqueta chiquita (arriba de la imagen)</label>
      <input placeholder="Ej: Empezá por acá" value={perfil.destacado.etiqueta} maxLength={40}
        onChange={e => setPerfil({...perfil, destacado: {...perfil.destacado, etiqueta: e.target.value}})}/>
    </div>
    <div className="field">
      <label>Título</label>
      <input placeholder="Ej: Sesión diagnóstico" value={perfil.destacado.titulo} maxLength={60}
        onChange={e => setPerfil({...perfil, destacado: {...perfil.destacado, titulo: e.target.value}})}/>
    </div>
    <div className="field">
      <label>Descripción</label>
      <textarea placeholder="Ej: Antes de empezar un proceso juntas, nos conocemos en una charla de 20 minutos para ver qué necesitás." value={perfil.destacado.descripcion} maxLength={220}
        onChange={e => setPerfil({...perfil, destacado: {...perfil.destacado, descripcion: e.target.value}})}
        style={{minHeight:'70px',resize:'none'}}/>
    </div>
    <div className="field">
      <label>Texto del botón</label>
      <input placeholder="Ej: Quiero mi diagnóstico" value={perfil.destacado.texto_boton} maxLength={30}
        onChange={e => setPerfil({...perfil, destacado: {...perfil.destacado, texto_boton: e.target.value}})}/>
    </div>
    <div className="field">
      <label>¿Qué pasa cuando tocan el botón?</label>
      <select value={perfil.destacado.accion}
        onChange={e => setPerfil({...perfil, destacado: {...perfil.destacado, accion: e.target.value as Destacado['accion']}})}
        style={{padding:'9px 11px',borderRadius:'10px',border:'0.5px solid var(--border)',fontSize:'13px',fontFamily:'inherit',color:'var(--text-primary)',background:'var(--bg-input)',outline:'none',width:'100%'}}>
        <option value="whatsapp">Me escriben por WhatsApp</option>
        <option value="link">Van a un link (formulario, Calendly, etc.)</option>
        <option value="curso">Van a uno de mis cursos de Luma</option>
      </select>
    </div>
    {perfil.destacado.accion === 'whatsapp' && (
      <div className="field">
        <label>Mensaje que les aparece ya escrito</label>
        <textarea placeholder="Ej: Hola! Vi tu página y quiero saber más sobre la sesión diagnóstico." value={perfil.destacado.mensaje_whatsapp} maxLength={200}
          onChange={e => setPerfil({...perfil, destacado: {...perfil.destacado, mensaje_whatsapp: e.target.value}})}
          style={{minHeight:'60px',resize:'none'}}/>
        <div className="field-hint">{perfil.whatsapp ? `Les abre WhatsApp con tu número (${perfil.whatsapp}).` : '⚠ Primero cargá tu WhatsApp en el bloque 1 (Tu perfil); si no, este bloque no se muestra.'}</div>
      </div>
    )}
    {perfil.destacado.accion === 'link' && (
      <div className="field">
        <label>Link</label>
        <input placeholder="https://..." value={perfil.destacado.url}
          onChange={e => setPerfil({...perfil, destacado: {...perfil.destacado, url: e.target.value}})}/>
      </div>
    )}
    {perfil.destacado.accion === 'curso' && (
      <div className="field">
        <label>Curso</label>
        {misCursos.length === 0 ? (
          <div className="field-hint">⚠ Todavía no tenés cursos publicados.</div>
        ) : (
          <select value={perfil.destacado.curso_slug}
            onChange={e => setPerfil({...perfil, destacado: {...perfil.destacado, curso_slug: e.target.value}})}
            style={{padding:'9px 11px',borderRadius:'10px',border:'0.5px solid var(--border)',fontSize:'13px',fontFamily:'inherit',color:'var(--text-primary)',background:'var(--bg-input)',outline:'none',width:'100%'}}>
            <option value="">Elegí un curso</option>
            {misCursos.map(c => <option key={c.slug} value={c.slug}>{c.titulo}</option>)}
          </select>
        )}
      </div>
    )}
                  </div>
                )}
              </div>

              {/* Anuncio con cuenta regresiva */}
              <div className="pr-sec">
                <div className="pref-row">
                  <div><div className="pref-label">⏳ Anuncio con cuenta regresiva</div><div className="pref-sub">Para algo que se viene. Se oculta solo cuando llega la fecha</div></div>
                  {interruptor(perfil.anuncio.activa, v => setPerfil({...perfil, anuncio: {...perfil.anuncio, activa: v}}), '#059669')}
                </div>
                {perfil.anuncio.activa && (
                  <div className="pr-sec-form">
                    <div style={{fontSize:'11px',color:'var(--text-muted)',marginBottom:'4px',lineHeight:1.5}}>
                      El inicio de un curso, un taller, un evento o la apertura de cupos. En tu página aparece con un contador de días, horas, minutos y segundos.
                    </div>
    <div className="field" style={{marginTop:'12px'}}>
      <label>Etiqueta chiquita</label>
      <input placeholder="Ej: Próximamente" value={perfil.anuncio.etiqueta} maxLength={40}
        onChange={e => setPerfil({...perfil, anuncio: {...perfil.anuncio, etiqueta: e.target.value}})}/>
    </div>
    <div className="field">
      <label>Título</label>
      <input placeholder="Ej: Empieza el curso de Tarot Evolutivo" value={perfil.anuncio.titulo} maxLength={70}
        onChange={e => setPerfil({...perfil, anuncio: {...perfil.anuncio, titulo: e.target.value}})}/>
    </div>
    <div className="field">
      <label>Descripción (opcional)</label>
      <textarea placeholder="Ej: 8 encuentros en vivo por Zoom. Cupos limitados." value={perfil.anuncio.descripcion} maxLength={200}
        onChange={e => setPerfil({...perfil, anuncio: {...perfil.anuncio, descripcion: e.target.value}})}
        style={{minHeight:'60px',resize:'none'}}/>
    </div>
    <div className="field">
      <label>¿Cuándo empieza? (fecha y hora)</label>
      <input type="datetime-local" defaultValue={isoAInputLocal(perfil.anuncio.fecha)}
        onChange={e => { const v = e.target.value; if (!v) { setPerfil({...perfil, anuncio: {...perfil.anuncio, fecha: ''}}); return } const d = new Date(v); if (isNaN(d.getTime()) || d.getFullYear() < 2000) return; setPerfil({...perfil, anuncio: {...perfil.anuncio, fecha: d.toISOString()}}) }}/>
      <div className="field-hint">Ponela en tu horario. Cada persona ve la cuenta regresiva según el suyo.</div>
      {perfil.anuncio.activa && (!perfil.anuncio.titulo.trim() || !perfil.anuncio.fecha || new Date(perfil.anuncio.fecha).getTime() <= Date.now()) && (
        <div className="field-hint" style={{color:'#DC2626',fontWeight:600}}>⚠️ Tu anuncio todavía no se muestra: necesita un título y una fecha futura.</div>
      )}
    </div>
    <div className="field">
      <label>Botón</label>
      <select value={perfil.anuncio.accion}
        onChange={e => setPerfil({...perfil, anuncio: {...perfil.anuncio, accion: e.target.value as Anuncio['accion']}})}
        style={{padding:'9px 11px',borderRadius:'10px',border:'0.5px solid var(--border)',fontSize:'13px',fontFamily:'inherit',color:'var(--text-primary)',background:'var(--bg-input)',outline:'none',width:'100%'}}>
        <option value="ninguno">Sin botón, solo el aviso</option>
        <option value="curso">Va a uno de mis cursos de Luma</option>
        <option value="whatsapp">Me escriben por WhatsApp</option>
        <option value="link">Va a un link</option>
      </select>
    </div>
    {perfil.anuncio.accion !== 'ninguno' && (
      <div className="field">
        <label>Texto del botón</label>
        <input placeholder="Ej: Quiero mi lugar" value={perfil.anuncio.texto_boton} maxLength={30}
          onChange={e => setPerfil({...perfil, anuncio: {...perfil.anuncio, texto_boton: e.target.value}})}/>
      </div>
    )}
    {perfil.anuncio.accion === 'whatsapp' && (
      <div className="field">
        <label>Mensaje que les aparece ya escrito</label>
        <textarea placeholder="Ej: Hola! Quiero anotarme al curso que empieza el 23 de octubre." value={perfil.anuncio.mensaje_whatsapp} maxLength={200}
          onChange={e => setPerfil({...perfil, anuncio: {...perfil.anuncio, mensaje_whatsapp: e.target.value}})}
          style={{minHeight:'60px',resize:'none'}}/>
        {!perfil.whatsapp && <div className="field-hint">⚠ Primero cargá tu WhatsApp en el bloque 1 (Tu perfil); si no, el botón no aparece.</div>}
      </div>
    )}
    {perfil.anuncio.accion === 'link' && (
      <div className="field">
        <label>Link</label>
        <input placeholder="https://..." value={perfil.anuncio.url}
          onChange={e => setPerfil({...perfil, anuncio: {...perfil.anuncio, url: e.target.value}})}/>
      </div>
    )}
    {perfil.anuncio.accion === 'curso' && (
      <div className="field">
        <label>Curso</label>
        {misCursos.length === 0 ? (
          <div className="field-hint">⚠ Todavía no tenés cursos publicados.</div>
        ) : (
          <select value={perfil.anuncio.curso_slug}
            onChange={e => setPerfil({...perfil, anuncio: {...perfil.anuncio, curso_slug: e.target.value}})}
            style={{padding:'9px 11px',borderRadius:'10px',border:'0.5px solid var(--border)',fontSize:'13px',fontFamily:'inherit',color:'var(--text-primary)',background:'var(--bg-input)',outline:'none',width:'100%'}}>
            <option value="">Elegí un curso</option>
            {misCursos.map(c => <option key={c.slug} value={c.slug}>{c.titulo}</option>)}
          </select>
        )}
      </div>
    )}
                  </div>
                )}
              </div>
              <div className="field-hint" style={{marginTop:'6px'}}>Si apagás una sección, lo que escribiste no se borra: al volver a activarla está todo.</div>
            </>))}

            {/* 6. LINKS */}
            {bloque('links', (<>
              <div style={{fontSize:'11px',color:'var(--text-muted)',marginBottom:'12px',lineHeight:1.5}}>
                Podcast, comunidad, regalos, descargables o redes. Opcional.
              </div>
    {perfil.links.map((link, i) => (
      <div key={i} style={{background:'var(--bg-input)',borderRadius:'12px',padding:'12px',marginBottom:'8px',border:'0.5px solid var(--border-light)'}}>
        <div style={{display:'flex',gap:'8px',marginBottom:'8px'}}>
          <select
            style={{padding:'7px 10px',borderRadius:'8px',border:'0.5px solid var(--border)',fontSize:'12px',fontFamily:'inherit',color:'var(--text-primary)',background:'var(--bg-card)',outline:'none',flexShrink:0}}
            value={link.tipo}
            onChange={e => {
              const nuevo = [...perfil.links]
              nuevo[i] = {...nuevo[i], tipo: e.target.value}
              setPerfil({...perfil, links: nuevo})
            }}>
            <option value="tiktok">TikTok</option>
            <option value="instagram">Instagram</option>
            <option value="podcast">Podcast</option>
            <option value="youtube">YouTube</option>
            <option value="descargable">Descargable</option>
            <option value="otro">Otro</option>
          </select>
          <input
            style={{flex:1,padding:'7px 10px',borderRadius:'8px',border:'0.5px solid var(--border)',fontSize:'12px',fontFamily:'inherit',color:'var(--text-primary)',background:'var(--bg-card)',outline:'none',minWidth:0}}
            placeholder="Título (ej: @priscila.tarot)"
            value={link.titulo}
            onChange={e => {
              const nuevo = [...perfil.links]
              nuevo[i] = {...nuevo[i], titulo: e.target.value}
              setPerfil({...perfil, links: nuevo})
            }}/>
          <button onClick={() => setPerfil({...perfil, links: perfil.links.filter((_,j) => j !== i)})}
            style={{width:'28px',height:'28px',border:'none',background:'#FEF2F2',color:'#EF4444',borderRadius:'8px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            ✕
          </button>
        </div>
        <input
          style={{width:'100%',padding:'7px 10px',borderRadius:'8px',border:'0.5px solid var(--border)',fontSize:'12px',fontFamily:'inherit',color:'var(--text-primary)',background:'var(--bg-card)',outline:'none',marginBottom:'8px'}}
          placeholder="https://..."
          value={link.url}
          onChange={e => {
            const nuevo = [...perfil.links]
            nuevo[i] = {...nuevo[i], url: e.target.value}
            setPerfil({...perfil, links: nuevo})
          }}/>
        <input
          style={{width:'100%',padding:'7px 10px',borderRadius:'8px',border:'0.5px solid var(--border)',fontSize:'12px',fontFamily:'inherit',color:'var(--text-primary)',background:'var(--bg-card)',outline:'none'}}
          placeholder="Descripción breve (opcional)"
          value={link.descripcion || ''}
          onChange={e => {
            const nuevo = [...perfil.links]
            nuevo[i] = {...nuevo[i], descripcion: e.target.value}
            setPerfil({...perfil, links: nuevo})
          }}/>
      </div>
    ))}
    <button
      onClick={() => setPerfil({...perfil, links: [...perfil.links, {tipo:'instagram',titulo:'',url:'',descripcion:''}]})}
      style={{width:'100%',padding:'9px',borderRadius:'10px',border:'1.5px dashed var(--border)',background:'transparent',fontSize:'12px',color:'var(--text-muted)',cursor:'pointer',fontFamily:'inherit',marginTop:'4px'}}>
      + Agregar link
    </button>
            </>))}

            {/* 7. COBROS */}
            {bloque('cobros', (<>
              <div className="pr-sub" style={{marginTop:0}}>1. ¿Cómo te pagan cuando reservan?</div>
              <div className="pr-opciones">
                <button type="button" className={`pr-opcion${perfil.tipo_pago === 'completo' ? ' sel' : ''}`} onClick={() => setPerfil({...perfil, tipo_pago: 'completo'})}>
                  <strong>💳 Pago completo al reservar</strong>
                  <span>Pagan todo en el momento de reservar.</span>
                </button>
                <button type="button" className={`pr-opcion${perfil.tipo_pago === 'libre' ? ' sel' : ''}`} onClick={() => setPerfil({...perfil, tipo_pago: 'libre'})}>
                  <strong>🤝 Sin pago previo</strong>
                  <span>Reservan y te pagan después, por fuera de Luma.</span>
                </button>
              </div>
              {perfil.tipo_pago !== 'completo' && perfil.tipo_pago !== 'libre' && (
                <div className="pr-aviso">Elegí una de las dos opciones.</div>
              )}
              {perfil.tipo_pago === 'completo' && !tieneMedioDePago && (
                <div className="pr-aviso">Elegiste cobrar al reservar pero no activaste ningún medio de pago. Activá Mercado Pago o transferencia acá abajo.</div>
              )}

              <div className="pr-sub">2. Mercado Pago</div>
              {perfil.tipo_pago === 'libre' && (
                <div className="pr-info">Para tus reservas no hace falta: tus consultantes reservan sin pagar. Igual lo podés conectar para cobrar tus cursos.</div>
              )}
              <div style={{fontSize:'11.5px',color:'var(--text-muted)',marginBottom:'8px'}}>También sirve para cobrar tus cursos.</div>
    <div style={{background:'#EFF6FF',borderRadius:'12px',padding:'12px 14px',border:'0.5px solid #BFDBFE',marginBottom:'14px',fontSize:'12px',color:'#1D4ED8',lineHeight:1.6}}>
      Para integrar Mercado Pago necesitás tu <strong>Access Token</strong>. Lo encontrás en <strong>mercadopago.com/developers</strong> → Tu aplicación → Credenciales → Access Token de producción.
    </div>
    <div className="pref-row">
      <div>
        <div className="pref-label">Activar cobros con MP</div>
        <div className="pref-sub">Tus consultantes podrán pagar al reservar</div>
      </div>
      <label style={{position:'relative',width:'40px',height:'22px',cursor:'pointer',display:'block'}}>
        <input type="checkbox" style={{opacity:0,width:0,height:0,position:'absolute'}}
          checked={perfil.mp_activo}
          onChange={e => setPerfil({...perfil, mp_activo: e.target.checked})}/>
        <span style={{position:'absolute',inset:0,background:perfil.mp_activo?'#059669':'var(--border)',borderRadius:'22px',transition:'all 0.2s'}}>
          <span style={{position:'absolute',width:'16px',height:'16px',left:perfil.mp_activo?'21px':'3px',top:'3px',background:'white',borderRadius:'50%',transition:'all 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}/>
        </span>
      </label>
    </div>
    {perfil.mp_activo && (
      <div className="field" style={{marginTop:'12px'}}>
        <label>Access Token</label>
        <input
          type="password"
          placeholder="APP_USR-..."
          value={perfil.mp_access_token}
          onChange={e => setPerfil({...perfil, mp_access_token: e.target.value})}
          style={{padding:'9px 11px',borderRadius:'10px',border:'0.5px solid var(--border)',fontSize:'13px',fontFamily:'inherit',color:'var(--text-primary)',background:'var(--bg-input)',outline:'none',width:'100%'}}/>
        <div className="field-hint">Se guarda en un lugar privado: solo vos y el sistema de cobros lo pueden usar. Nunca lo compartás con nadie.</div>
      </div>
    )}

              <div className="pr-sub">3. Transferencia</div>
              {perfil.tipo_pago === 'libre' && (
                <div className="pr-info">No hace falta: tus consultantes reservan sin pagar.</div>
              )}
              <fieldset className="pr-fieldset" disabled={perfil.tipo_pago === 'libre'}>
    <div className="pref-row">
      <div>
        <div className="pref-label">Aceptar transferencias</div>
        <div className="pref-sub">Tus consultantes podrán elegir pagar por transferencia</div>
      </div>
      <label style={{position:'relative',width:'40px',height:'22px',cursor:'pointer',display:'block'}}>
        <input type="checkbox" style={{opacity:0,width:0,height:0,position:'absolute'}}
          checked={perfil.acepta_transferencia || false}
          onChange={e => setPerfil({...perfil, acepta_transferencia: e.target.checked})}/>
        <span style={{position:'absolute',inset:0,background:perfil.acepta_transferencia?'#059669':'var(--border)',borderRadius:'22px',transition:'all 0.2s'}}>
          <span style={{position:'absolute',width:'16px',height:'16px',left:perfil.acepta_transferencia?'21px':'3px',top:'3px',background:'white',borderRadius:'50%',transition:'all 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}/>
        </span>
      </label>
    </div>
    {perfil.acepta_transferencia && (<>
      <div className="field" style={{marginTop:'12px'}}>
        <label>Alias (requerido)</label>
        <input placeholder="Ej: mi.alias.mp" value={perfil.alias_pago || ''}
          onChange={e => setPerfil({...perfil, alias_pago: e.target.value})}/>
      </div>
      <div className="field">
        <label>CBU (opcional)</label>
        <input placeholder="22 dígitos" value={perfil.cbu || ''}
          onChange={e => setPerfil({...perfil, cbu: e.target.value})}/>
      </div>
      <div className="field">
        <label>Titular de la cuenta</label>
        <input placeholder="Nombre y apellido" value={perfil.titular_cuenta || ''}
          onChange={e => setPerfil({...perfil, titular_cuenta: e.target.value})}/>
      </div>
      <div className="field">
        <label>Banco (opcional)</label>
        <input placeholder="Ej: Banco Galicia" value={perfil.banco || ''}
          onChange={e => setPerfil({...perfil, banco: e.target.value})}/>
      </div>
      <div className="field">
        <label>Instrucciones adicionales (opcional)</label>
        <textarea placeholder="Ej: Enviame el comprobante por WhatsApp una vez que transferiste."
          value={perfil.instrucciones_pago || ''}
          onChange={e => setPerfil({...perfil, instrucciones_pago: e.target.value})}
          style={{minHeight:'70px',resize:'none'}}/>
      </div>
    </>)}
              </fieldset>
            </>))}

            {/* 8. AVISOS */}
            {bloque('avisos', (<>
              {!instalada ? (<>
                <div className="pr-aviso">🔒 Para recibir avisos, primero instalá Luma en tu celular. En el navegador los avisos no llegan bien, y en iPhone no llegan nunca.</div>
                {esIOS ? (
                  <div className="pr-ios">
                    <div><b>1</b><span>Abrí Luma en Safari y tocá el botón Compartir (el cuadrado con la flecha ↑).</span></div>
                    <div><b>2</b><span>Elegí «Agregar a pantalla de inicio».</span></div>
                    <div><b>3</b><span>Abrí Luma desde el ícono nuevo y volvé a este paso.</span></div>
                  </div>
                ) : puedeInstalar ? (
                  <button className="pr-btn" onClick={instalarApp}>📲 Instalar Luma</button>
                ) : (
                  <div className="pr-ios">
                    <div><b>1</b><span>Abrí el menú del navegador (los tres puntitos ⋮).</span></div>
                    <div><b>2</b><span>Tocá «Instalar app» o «Agregar a pantalla de inicio».</span></div>
                    <div><b>3</b><span>Abrí Luma desde el ícono nuevo y volvé a este paso.</span></div>
                  </div>
                )}
                <div className="pr-acciones">
                  <button className="pr-btn sec" disabled>🔒 Activar avisos</button>
                </div>
                {avisosEnCuenta && <div className="pr-info">Ya tenés los avisos activados en otro dispositivo.</div>}
              </>) : permisoNoti === 'no-soportado' ? (
                <div className="pr-aviso">Este celular no permite avisos. Probá actualizando el sistema.</div>
              ) : permisoNoti === 'denied' ? (
                <div className="pr-aviso">
                  Bloqueaste los avisos de Luma. Para habilitarlos: andá a la configuración de tu celular → Notificaciones → Luma → Permitir. Después cerrá Luma y volvé a abrirla.
                </div>
              ) : (<>
                {notificacionesActivas
                  ? <div className="pr-info">✅ Los avisos están activados en este celular.</div>
                  : avisosEnCuenta
                    ? <div className="pr-info">Ya tenés los avisos activados en otro dispositivo. Activalos acá para recibirlos también en este.</div>
                    : null}
                <div className="pr-acciones">
                  <button className="pr-btn" onClick={toggleNotificaciones} disabled={loadingNoti}>
                    {loadingNoti ? 'Un momento…' : notificacionesActivas ? 'Desactivar avisos' : 'Activar avisos'}
                  </button>
                  {notificacionesActivas && <button className="pr-btn sec" onClick={avisoPrueba}>Enviar aviso de prueba</button>}
                </div>
              </>)}
              {msgAvisos && <div className="pr-info">{msgAvisos}</div>}
              <a href="/ayuda#notificaciones" style={{fontSize:'11px',color:'var(--accent)',textDecoration:'underline',marginTop:'10px',display:'inline-block'}}>Ver tutorial</a>
            </>))}

            {/* 9. ACTIVÁ Y COMPARTÍ */}
            {bloque('compartir', (<>
              <ol className="pr-pasos-mini">
                <li>Para que tu página exista necesita un nombre: tu dirección.</li>
                <li>Sin dirección no hay a dónde llevar a tu consultante.</li>
                <li>Copiá tu link y ponelo en tu bio de Instagram.</li>
              </ol>
              <div className="field">
                <label>Tu dirección</label>
                <div className="pr-slug">
                  <span>lumaapp.lat/p/</span>
                  <input placeholder="tu-nombre" value={perfil.slug} maxLength={60}
                    onChange={e => setPerfil({...perfil, slug: limpiarSlug(e.target.value, true)})}
                    onBlur={() => { if (perfil.slug === slugGuardadoRef.current) return; const s = limpiarSlug(perfil.slug); if (s !== perfil.slug) setPerfil(prev => ({...prev, slug: s})) }}/>
                </div>
                <div className="field-hint">Solo letras minúsculas, números y guiones. Si la cambiás, el link viejo deja de funcionar.</div>
                {!perfil.slug && limpiarSlug(perfil.nombre_profesional) && (
                  <button type="button" className="pr-btn sec" style={{marginTop:'8px',alignSelf:'flex-start'}}
                    onClick={() => setPerfil({...perfil, slug: limpiarSlug(perfil.nombre_profesional)})}>
                    Usar lumaapp.lat/p/{limpiarSlug(perfil.nombre_profesional)}
                  </button>
                )}
                {slugAviso && <div className="pr-aviso">{slugAviso}</div>}
              </div>

              {faltanParaCompartir.length > 0 && (
                <div className="pr-aviso">
                  Tu página se va a ver incompleta: faltan {faltanParaCompartir.map((f, i) => (
                    <span key={f.id}>{i > 0 ? ' y ' : ''}<button onClick={() => irABloque(f.id)}>{f.txt}</button></span>
                  ))}.
                </div>
              )}

              <div className="pref-row">
                <div>
                  <div className="pref-label">Página activa</div>
                  <div className="pref-sub">{perfil.pagina_activa ? 'Tus consultantes pueden ver tu página y reservar' : 'Apagada: nadie puede ver tu página todavía'}</div>
                </div>
                {interruptor(perfil.pagina_activa, v => setPerfil({...perfil, pagina_activa: v}))}
              </div>

              <div className="pr-acciones">
                <div className="pr-copiar">
                  <button type="button" onClick={copiarLink} disabled={!slugPublicado}>
                    {copiado ? <><Check size={14}/>¡Copiado! Pegalo en tu bio</> : <><Copy size={14}/>Copiar link</>}
                  </button>
                </div>
                {slugPublicado && (
                  <a className="pr-btn pr-ver" href={`/p/${slugPublicado}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={15}/>Ver mi página
                  </a>
                )}
              </div>
              {perfil.slug !== slugPublicado && (
                <div className="field-hint" style={{marginTop:'8px'}}>Tu dirección nueva se guarda cuando salís del campo. Hasta entonces, el link que se copia es el anterior{slugPublicado ? '' : ' (todavía no tenés uno)'}.</div>
              )}
              {slugPublicado && !perfil.pagina_activa && (
                <div className="field-hint" style={{marginTop:'8px'}}>Ojo: tu página está apagada. Activala para que puedan entrar y reservar.</div>
              )}
            </>))}

            {/* TU PLAN (sin desplegable, no cuenta como paso) */}
            <div style={{marginTop:'18px'}}>
            <MiPlan sub={suscripcion} />
            </div>
</>)}

          {tab === 'seguridad' && (<>
            <div className="s-section-title">Seguridad</div>
            <div className="s-section-sub">Controlá el acceso a tu cuenta</div>
            <div className="s-card">
              <div className="s-card-title"><Shield size={14}/>Cambiar contraseña</div>
              {passError && <div className="pass-error">{passError}</div>}
              {passExito && <div className="pass-exito">✓ Contraseña actualizada correctamente</div>}
              <div className="pass-field">
                <label>Nueva contraseña</label>
                <div className="pass-input-wrap">
                  <input className="pass-input" type={passForm.showNueva ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres" value={passForm.nueva}
                    onChange={e => setPassForm({...passForm, nueva: e.target.value})}/>
                  <button className="pass-eye" onClick={() => setPassForm({...passForm, showNueva: !passForm.showNueva})}>
                    {passForm.showNueva ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                </div>
              </div>
              <div className="pass-field">
                <label>Confirmar contraseña</label>
                <div className="pass-input-wrap">
                  <input className="pass-input" type={passForm.showConfirmar ? 'text' : 'password'}
                    placeholder="Repetí la contraseña" value={passForm.confirmar}
                    onChange={e => setPassForm({...passForm, confirmar: e.target.value})}/>
                  <button className="pass-eye" onClick={() => setPassForm({...passForm, showConfirmar: !passForm.showConfirmar})}>
                    {passForm.showConfirmar ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                </div>
              </div>
              <button className="save-btn" onClick={cambiarPassword}>Cambiar contraseña</button>
            </div>
            <div className="s-card">
              <div className="s-card-title"><Shield size={14}/>Información de sesión</div>
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-lbl">Email de cuenta</div>
                  <div className="info-val">{email}</div>
                </div>
                <div className="info-item">
                  <div className="info-lbl">Último acceso</div>
                  <div className="info-val">
                    {ultimoAcceso ? new Date(ultimoAcceso).toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'}) : '—'}
                  </div>
                </div>
              </div>
            </div>
            <div className="s-card">
              <div className="s-card-title"><LogOut size={14}/>Sesión</div>
              <button className="save-btn" style={{background:'var(--accent-light)',color:'var(--accent)',boxShadow:'none'}} onClick={cerrarSesion}>
                <LogOut size={13}/>Cerrar sesión
              </button>
            </div>
            <div className="danger-zone">
              <div className="danger-title">Zona de peligro</div>
              <button className="danger-btn" onClick={() => setConfirmEliminar(true)}>
                <Trash2 size={13}/>Eliminar cuenta permanentemente
              </button>
            </div>
          </>)}

          {tab === 'datos' && (<>
            <div className="s-section-title">Datos y respaldo</div>
            <div className="s-section-sub">Exportá tu información en cualquier momento</div>
            <div className="s-card">
              <div className="s-card-title"><Download size={14}/>Exportar datos</div>
              <div className="export-grid">
                <div className="export-card" onClick={() => exportarCSV('pacientes')}>
                  <div className="export-icon"><User size={16} color="#7C3AED"/></div>
                  <div className="export-title">Pacientes</div>
                  <div className="export-sub">CSV con todos tus pacientes</div>
                </div>
                <div className="export-card" onClick={() => exportarCSV('finanzas')}>
                  <div className="export-icon"><Database size={16} color="#059669"/></div>
                  <div className="export-title">Finanzas</div>
                  <div className="export-sub">CSV con todas las sesiones</div>
                </div>
                <div className="export-card" style={{opacity:0.5,cursor:'not-allowed'}}>
                  <div className="export-icon"><Download size={16} color="#D97706"/></div>
                  <div className="export-title">Historial completo</div>
                  <div className="export-sub">Próximamente</div>
                </div>
              </div>
            </div>
            <div className="s-card">
              <div className="s-card-title"><Shield size={14}/>Sobre tus datos</div>
              <p style={{fontSize:'13px',color:'var(--text-secondary)',lineHeight:'1.7',margin:0}}>
                Todos tus datos se almacenan de forma segura en Supabase con cifrado en reposo. Cada terapeuta tiene sus datos completamente aislados. Podés exportar o eliminar tu información en cualquier momento.
              </p>
            </div>
          </>)}

          {tab === 'preferencias' && (<>
            <div className="s-section-title">Preferencias</div>
            <div className="s-section-sub">Personalizá cómo se muestra la información</div>
            <div className="s-card">
              <div className="pref-row">
                <div>
                  <div className="pref-label">Zona horaria</div>
                  <div className="pref-sub">Afecta los horarios mostrados</div>
                </div>
                <select className="pref-select" value={perfil.zona_horaria}
                  onChange={e => setPerfil({...perfil, zona_horaria: e.target.value})}>
                  {ZONAS.map(z => <option key={z} value={z}>{z.split('/').pop()?.replace('_',' ')}</option>)}
                </select>
              </div>
              <div className="pref-row">
                <div>
                  <div className="pref-label">Moneda</div>
                  <div className="pref-sub">Usada en finanzas y pagos</div>
                </div>
                <select className="pref-select" value={perfil.moneda}
                  onChange={e => setPerfil({...perfil, moneda: e.target.value})}>
                  {MONEDAS.map(m => <option key={m.codigo} value={m.codigo}>{m.simbolo} — {m.nombre}</option>)}
                </select>
              </div>
              <div className="pref-row">
                <div>
                  <div className="pref-label">Formato de fecha</div>
                  <div className="pref-sub">Cómo se muestran las fechas</div>
                </div>
                <select className="pref-select" value={perfil.formato_fecha}
                  onChange={e => setPerfil({...perfil, formato_fecha: e.target.value})}>
                  <option value="dd/mm/yyyy">dd/mm/yyyy</option>
                  <option value="mm/dd/yyyy">mm/dd/yyyy</option>
                  <option value="yyyy-mm-dd">yyyy-mm-dd</option>
                </select>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <button className="save-btn" onClick={guardarPerfil} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar preferencias'}
              </button>
              {msgExito && <span className="msg-exito">✓ {msgExito}</span>}
            </div>
          </>)}

        </div>
      </div>

      {confirmEliminar && (
        <div className="confirm-overlay" onClick={() => setConfirmEliminar(false)}>
          <div className="confirm-box" onClick={e => e.stopPropagation()}>
            <div style={{fontSize:'28px',marginBottom:'12px'}}>⚠️</div>
            <div className="confirm-title">¿Eliminar tu cuenta?</div>
            <div className="confirm-text">
              Esta acción es <strong>permanente e irreversible</strong>. Se eliminarán todos tus pacientes, sesiones, pagos y datos asociados.
            </div>
            <div className="confirm-btns">
              <button className="confirm-cancel" onClick={() => setConfirmEliminar(false)}>Cancelar</button>
              <button className="confirm-delete" onClick={async () => {
                const supabase = createClient()
                await supabase.auth.signOut()
                router.push('/auth/login')
              }}>Eliminar cuenta</button>
            </div>
          </div>
        </div>
      )}

      {estadoGuardado !== 'idle' && (
        <div className={`autosave-pill autosave-${estadoGuardado}`} role="status">
          {estadoGuardado === 'guardando' ? 'Guardando…'
            : estadoGuardado === 'guardado' ? '✓ Guardado'
            : estadoGuardado === 'sin_conexion' ? 'Sin conexión · se guarda cuando vuelva'
            : <>No se pudo guardar · <button onClick={() => guardar(true)}>Reintentar</button></>}
        </div>
      )}
    </>
  )
}