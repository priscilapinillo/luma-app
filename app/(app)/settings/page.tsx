'use client'

import { useEffect, useState, useRef } from 'react'
import { User, Shield, Database, Settings, Camera, Eye, EyeOff, Download, Trash2, LogOut } from 'lucide-react'
import { comprimirImagen } from '@/lib/comprimirImagen'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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
type Tab = 'perfil' | 'pagina' | 'seguridad' | 'datos' | 'preferencias'

export default function AjustesPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<Tab>('perfil')
  const [loading, setLoading] = useState(true)
  const [misCursos, setMisCursos] = useState<{ titulo: string; slug: string }[]>([])
  const [subiendoDestacado, setSubiendoDestacado] = useState(false)
  useEffect(() => { cargarDatos() }, [])
  const [guardando, setGuardando] = useState(false)
  const [notificacionesActivas, setNotificacionesActivas] = useState(false)
  
  const [loadingNoti, setLoadingNoti] = useState(false)

  async function toggleNotificaciones() {
    setLoadingNoti(true)
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      alert('Tu navegador no soporta notificaciones. Agregá Luma a tu pantalla de inicio primero.')
      setLoadingNoti(false)
      return
    }
    if (notificacionesActivas) {
      try {
        const registration = await navigator.serviceWorker.ready
        const subActual = await registration.pushManager.getSubscription()
        if (subActual) await subActual.unsubscribe()
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { error } = await supabase.from('push_subscriptions').delete().eq('user_id', user.id)
          if (error) console.error('Error borrando suscripción push:', error)
        }
        setNotificacionesActivas(false)
      } catch (err) {
        console.error('Error desactivando notificaciones:', err)
      } finally {
        setLoadingNoti(false)
      }
      return
    }
    try {
      const permiso = await Notification.requestPermission()
      if (permiso !== 'granted') {
        alert('Permiso denegado. Habilitá las notificaciones desde la configuración de tu celular.')
        return
      }
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub, userId: user.id }),
      })
      setNotificacionesActivas(true)
    } catch(err) {
      console.error('Error activando notificaciones:', err)
      alert('Hubo un error al activar las notificaciones.')
    } finally {
      setLoadingNoti(false)
    }
  }
  const [subiendoAvatar, setSubiendoAvatar] = useState(false)
  const [email, setEmail] = useState('')
  const [ultimoAcceso, setUltimoAcceso] = useState('')
  const [suscripcion, setSuscripcion] = useState<any>(null)
  const [confirmEliminar, setConfirmEliminar] = useState(false)
  const [msgExito, setMsgExito] = useState('')
  const perfilGuardadoRef = useRef<string>('')
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

  

  async function cargarDatos() {
    console.log('cargarDatos inicio')
    try {
      const supabase = createClient()
      console.log('supabase creado')
      const { data: { user } } = await supabase.auth.getUser()
      console.log('user:', user?.email)
      if (!user || !user.email) {
        window.location.href = '/auth/login'
        return
      }
      setEmail(user.email || '')
      setUltimoAcceso(user.last_sign_in_at || '')
      const [{ data: prof }, { data: subs }] = await Promise.all([
        supabase.from('therapist_profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle(),
      ])
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
        slug: prof.slug || prof.nombre_profesional?.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'') || '',
        template: prof.template || 'luna',
        secciones: prof.secciones || { sobre_mi: true, testimonios: true, faq: false, disponibilidad: true },
        faq: prof.faq || [],
        mp_access_token: prof.mp_access_token || '',
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
      perfilGuardadoRef.current = JSON.stringify(perfilCargado)
      }
      if (subs) setSuscripcion(subs)
      const { data: cursosPropios } = await supabase.from('courses').select('titulo,slug').eq('user_id', user.id).eq('estado', 'publicado')
      if (cursosPropios) setMisCursos(cursosPropios)

        // Verificar si ya tiene notificaciones activas
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          const { data: pushSub } = await supabase
            .from('push_subscriptions')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle()
          if (pushSub) setNotificacionesActivas(true)
        }
  
      } catch (err) {
        console.error('Error cargando:', err)
      } finally {
        cargadoRef.current = true
        setLoading(false)
      }
    }
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
        return
      }
      const slugFijo = perfil.slug || perfil.nombre_profesional?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'') || ''
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
        mp_access_token: perfil.mp_access_token,
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
        if (silencioso) setEstadoGuardado(typeof navigator !== 'undefined' && navigator.onLine === false ? 'sin_conexion' : 'error')
        else alert('No se pudo guardar: ' + (errGuardar?.message || 'volvé a iniciar sesión e intentá de nuevo.'))
        return
      }

      // perfil nuevo: guardamos su id y fijamos el link (así no se crea otro perfil ni cambia la dirección de su página)
      const cambios: Partial<Perfil> = {}
      if (!perfil.id && filas[0]?.id) cambios.id = filas[0].id
      if (!perfil.slug && slugFijo) cambios.slug = slugFijo
      if (Object.keys(cambios).length > 0) {
        const actualizado = { ...perfil, ...cambios }
        perfilGuardadoRef.current = JSON.stringify(actualizado)
        setPerfil(prev => ({ ...prev, ...cambios }))
      } else {
        perfilGuardadoRef.current = foto
      }
      ok = true
      setEstadoGuardado('guardado')
      if (!silencioso) {
        setMsgExito('Perfil guardado correctamente')
        setTimeout(() => setMsgExito(''), 3000)
      }
    } catch (err) {
      console.error('Error guardando:', err)
      if (silencioso) setEstadoGuardado(typeof navigator !== 'undefined' && navigator.onLine === false ? 'sin_conexion' : 'error')
      else alert('No se pudo guardar. Revisá tu conexión e intentá de nuevo.')
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

  const diasTrial = suscripcion?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(suscripcion.trial_ends_at).getTime() - Date.now()) / (1000*60*60*24)))
    : 0

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:'13px',color:'var(--text-muted)',background:'var(--bg)'}}>
      Cargando...
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
`}</style>

      <input ref={fileInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={subirAvatar}/>

      <div className="sw" onBlurCapture={() => programarAutoguardado(300)}>
      <div className="s-toggle-wrap">
          <div className="s-toggle-title">Ajustes</div>
          {([
            { id: 'perfil', icon: User, label: 'Perfil profesional' },
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
    { id: 'perfil', label: 'Perfil' },
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

          {tab === 'perfil' && (<>
            <div className="s-section-title">Perfil profesional</div>
            <div className="s-section-sub">Tu identidad dentro de Luma</div>
            <div className="s-card">
              <div className="avatar-wrap">
                {perfil.avatar_url
                  ? <img src={perfil.avatar_url} className="avatar-img" alt="avatar"/>
                  : <div className="avatar-placeholder">{iniciales}</div>
                }
                <div>
                  <div className="avatar-name">{perfil.nombre_profesional || 'Tu nombre'}</div>
                  <div className="avatar-spec">{perfil.especialidad || 'Especialidad'}</div>
                  <button className="avatar-btn" onClick={() => fileInputRef.current?.click()} disabled={subiendoAvatar}>
                    <Camera size={12}/>{subiendoAvatar ? 'Subiendo...' : 'Cambiar foto'}
                  </button>
                  <div style={{fontSize:'10px',color:'var(--text-muted)',marginTop:'6px',lineHeight:'1.5'}}>
                    Esta foto también se usa en tu página pública de reservas.
                  </div>
                </div>
              </div>
              <div className="field-grid">
                <div className="field">
                  <label>Nombre profesional</label>
                  <input placeholder="Ej: Priscila Tarot" value={perfil.nombre_profesional}
                    onChange={e => setPerfil({...perfil, nombre_profesional: e.target.value})}/>
                  <div className="field-hint">Visible en toda la app</div>
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
  <div style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'4px',lineHeight:'1.5'}}>
    💡 Este número aparece en tu página pública para que las consultantes puedan contactarte por WhatsApp.
  </div>


</div>
                <div className="field full">
                  <label>Bio corta</label>
                  <textarea placeholder="Una descripción breve de tu práctica profesional..."
                    value={perfil.bio} onChange={e => setPerfil({...perfil, bio: e.target.value})}/>
                </div>
                <div className="field">
                  <label>Email</label>
                  <input value={email} disabled style={{opacity:0.5,cursor:'not-allowed'}}/>
                  <div className="field-hint">No se puede cambiar desde acá</div>
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginTop:'4px'}}>
                <button className="save-btn" onClick={guardarPerfil} disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Guardar perfil'}
                </button>
                {msgExito && <span className="msg-exito">✓ {msgExito}</span>}
              </div>
            </div>
            <div className="subs-card">
              <div className="subs-label">Plan actual</div>
              <div className="subs-plan">
                {suscripcion?.status === 'trial' ? 'Período de prueba' : suscripcion?.status === 'active' ? 'Plan activo' : 'Sin plan activo'}
              </div>
              <div className="subs-info">
                {suscripcion?.status === 'trial' ? `${diasTrial} días restantes de prueba gratuita` :'$9.900 ARS/mes · Facturación mensual'}
              </div>
              {suscripcion?.status === 'trial' && (<>
                <div className="subs-trial-bar">
                  <div className="subs-trial-fill" style={{width:`${Math.max(0,(7-diasTrial)/7*100)}%`}}/>
                </div>
                <div className="subs-trial-text">{diasTrial} de 7 días restantes</div>
              </>)}
              {suscripcion?.status !== 'active' && (
                <button
                  onClick={() => window.location.href = '/suscripcion'}
                  style={{
                    marginTop:'14px', width:'100%', padding:'11px',
                    background:'linear-gradient(135deg,#8B5CF6,#A78BFA)',
                    color:'white', border:'none', borderRadius:'11px',
                    fontSize:'13px', fontWeight:600, cursor:'pointer',
                    fontFamily:'inherit', boxShadow:'0 4px 14px rgba(139,92,246,0.35)',
                    transition:'all 0.15s',
                  }}
                  onMouseOver={e => (e.currentTarget.style.transform='translateY(-1px)')}
                  onMouseOut={e => (e.currentTarget.style.transform='translateY(0)')}>
                  {suscripcion?.status === 'expired'
                    ? '✦ Reactivar suscripción — $9.900 ARS/mes'
                    : '✦ Activar ahora y no perder acceso — $9.900 ARS/mes'}
                </button>
              )}
            </div>
          </>)}

          {tab === 'pagina' && (<>
            <div className="s-section-title">Página de reservas</div>
            <div className="s-section-sub">Tu espacio de reservas personalizado</div>

  {/* TEMPLATE */}
  <div className="s-card">
    <div className="s-card-title"><Settings size={14}/>Estilo visual</div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:'8px',marginBottom:'4px'}}>
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
  </div>

  {/* URL */}
  <div className="s-card">
    <div className="s-card-title"><Settings size={14}/>URL de tu página</div>
    <div className="field">
      <label>Slug</label>
      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
        <span style={{fontSize:'12px',color:'var(--text-muted)',whiteSpace:'nowrap',padding:'9px 11px',background:'var(--bg-input)',borderRadius:'10px',border:'0.5px solid var(--border)'}}>
          /p/
        </span>
        <input
          style={{flex:1,padding:'9px 11px',borderRadius:'10px',border:'0.5px solid var(--border)',fontSize:'13px',fontFamily:'inherit',color:'var(--text-primary)',background:'var(--bg-input)',outline:'none'}}
          placeholder="tu-nombre"
          value={perfil.slug}
          onChange={e => setPerfil({...perfil, slug: e.target.value.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')})}/>
      </div>
      <div className="field-hint">Solo letras minúsculas, números y guiones</div>
    </div>
    <div className="field">
      <label>Mensaje de bienvenida</label>
      <textarea
        style={{padding:'9px 11px',borderRadius:'10px',border:'0.5px solid var(--border)',fontSize:'13px',fontFamily:'inherit',color:'var(--text-primary)',background:'var(--bg-input)',outline:'none',minHeight:'70px',resize:'none',width:'100%'}}
        placeholder="Ej: Hola! Reservá tu sesión de forma fácil y rápida..."
        value={perfil.mensaje_bienvenida}
        onChange={e => setPerfil({...perfil, mensaje_bienvenida: e.target.value})}/>
    </div>
    <div style={{background:'var(--bg-input)',borderRadius:'10px',padding:'12px 14px',border:'0.5px solid var(--border-light)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px'}}>
      <span style={{fontSize:'13px',color:'var(--text-secondary)',wordBreak:'break-all'}}>
      const url = `https://lumaapp.lat/p/${perfil.slug || ''}`
      </span>
      <button style={{padding:'6px 14px',borderRadius:'8px',background:'var(--accent-light)',color:'var(--accent)',border:'none',fontSize:'11px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}
        onClick={() => {
          const url = `${window.location.origin}/p/${perfil.slug || ''}`
          navigator.clipboard.writeText(url)
          setMsgExito('Link copiado!')
          setTimeout(() => setMsgExito(''), 2000)
        }}>
        Copiar link
      </button>
    </div>
    {perfil.pagina_activa && perfil.slug && (
      <a href={`/p/${perfil.slug}`} target="_blank" rel="noopener noreferrer"
        style={{display:'block',marginTop:'10px',fontSize:'12px',color:'var(--accent)',textDecoration:'none',textAlign:'center'}}>
        Ver mi página →
      </a>
    )}
  </div>

  {/* NOTIFICACIONES */}
<div className="s-card">
  <div className="s-card-title"><Settings size={14}/>Notificaciones</div>
  <div className="pref-row">
    <div>
      <div className="pref-label">Recibir notificaciones de nuevas reservas</div>
      <div className="pref-sub">Agregá Luma a tu pantalla de inicio para recibirlas</div>
      <a href="/ayuda#notificaciones" style={{fontSize:'11px',color:'var(--accent)',textDecoration:'underline',marginTop:'4px',display:'inline-block'}}>
        Ver tutorial
      </a>
    </div>
    <label style={{position:'relative',width:'40px',height:'22px',cursor:'pointer',display:'block',flexShrink:0}}>
      <input type="checkbox" style={{opacity:0,width:0,height:0,position:'absolute'}}
       checked={notificacionesActivas}
       onChange={toggleNotificaciones}
       disabled={loadingNoti}/>
      <span style={{position:'absolute',inset:0,background:notificacionesActivas?'#8B5CF6':'var(--border)',borderRadius:'22px',transition:'all 0.2s'}}>
        <span style={{position:'absolute',width:'16px',height:'16px',left:notificacionesActivas?'21px':'3px',top:'3px',background:'white',borderRadius:'50%',transition:'all 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}/>
      </span>
    </label>
  </div>
</div>

  {/* SECCIONES */}
  <div className="s-card">
    <div className="s-card-title"><Settings size={14}/>Secciones visibles</div>
    {[
      { key:'sobre_mi', label:'Sobre mí', desc:'Tu historia y valores' },
      { key:'disponibilidad', label:'Disponibilidad', desc:'Calendario con horarios libres' },
      { key:'testimonios', label:'Testimonios', desc:'Opiniones de tus consultantes' },
      { key:'faq', label:'Preguntas frecuentes', desc:'Respondé dudas antes de que pregunten' },
    ].map(s => (
      <div key={s.key} className="pref-row">
        <div>
          <div className="pref-label">{s.label}</div>
          <div className="pref-sub">{s.desc}</div>
        </div>
        <label style={{position:'relative',width:'40px',height:'22px',cursor:'pointer',display:'block'}}>
          <input type="checkbox" style={{opacity:0,width:0,height:0,position:'absolute'}}
            checked={perfil.secciones[s.key as keyof typeof perfil.secciones]}
            onChange={e => setPerfil({...perfil, secciones: {...perfil.secciones, [s.key]: e.target.checked}})}/>
          <span style={{
            position:'absolute',inset:0,
            background: perfil.secciones[s.key as keyof typeof perfil.secciones] ? '#8B5CF6' : 'var(--border)',
            borderRadius:'22px',transition:'all 0.2s'
          }}>
            <span style={{
              position:'absolute',width:'16px',height:'16px',
              left: perfil.secciones[s.key as keyof typeof perfil.secciones] ? '21px' : '3px',
              top:'3px',background:'white',borderRadius:'50%',
              transition:'all 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'
            }}/>
          </span>
        </label>
      </div>
    ))}
  </div>

  {/* FAQ */}
  {perfil.secciones.faq && (
    <div className="s-card">
      <div className="s-card-title"><Settings size={14}/>Preguntas frecuentes</div>
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

  {/* RESERVAS */}
  <div className="s-card">
    <div className="s-card-title"><Settings size={14}/>Configuración de reservas</div>
    <div className="pref-row">
      <div>
        <div className="pref-label">Página activa</div>
        <div className="pref-sub">Tus consultantes pueden ver y reservar</div>
      </div>
      <label style={{position:'relative',width:'40px',height:'22px',cursor:'pointer',display:'block'}}>
        <input type="checkbox" style={{opacity:0,width:0,height:0,position:'absolute'}}
          checked={perfil.pagina_activa}
          onChange={e => setPerfil({...perfil, pagina_activa: e.target.checked})}/>
        <span style={{position:'absolute',inset:0,background:perfil.pagina_activa?'#8B5CF6':'var(--border)',borderRadius:'22px',transition:'all 0.2s'}}>
          <span style={{position:'absolute',width:'16px',height:'16px',left:perfil.pagina_activa?'21px':'3px',top:'3px',background:'white',borderRadius:'50%',transition:'all 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}/>
        </span>
      </label>
    </div>
    <div className="pref-row">
      <div>
        <div className="pref-label">Tipo de pago</div>
        <div className="pref-sub">Qué se le pide al consultante al reservar</div>
      </div>
      <select className="pref-select" value={perfil.tipo_pago} onChange={e => setPerfil({...perfil, tipo_pago: e.target.value})}>
        <option value="libre">Sin pago — reserva directa</option>
        
        <option value="completo">Pago completo</option>
      </select>
    </div>
  </div>

{/* SOBRE MÍ */}
<div className="s-card">
    <div className="s-card-title"><Settings size={14}/>Sección "Sobre mí"</div>
    <div className="field" style={{marginBottom:'16px'}}>
      <label>Bio</label>
      <textarea
        style={{padding:'9px 11px',borderRadius:'10px',border:'0.5px solid var(--border)',fontSize:'13px',fontFamily:'inherit',color:'var(--text-primary)',background:'var(--bg-input)',outline:'none',minHeight:'80px',resize:'none',width:'100%'}}
        placeholder="Contá quién sos y cómo acompañás..."
        value={perfil.bio}
        onChange={e => setPerfil({...perfil, bio: e.target.value})}/>
    </div>
    <div style={{fontSize:'11px',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'10px'}}>Tus valores</div>
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


  {/* TESTIMONIOS */}
  <div className="s-card">
    <div className="s-card-title"><Settings size={14}/>Testimonios</div>
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

  {/* SERVICIO DESTACADO */}
  <div className="s-card">
    <div className="s-card-title">✦ Servicio destacado</div>
    <div style={{fontSize:'11px',color:'var(--text-muted)',marginBottom:'12px',lineHeight:1.5}}>
      Aparece arriba de todo en tu página, apenas entran. Usalo para tu puerta de entrada: una sesión diagnóstico, una mentoría, un evento, un taller o tu curso estrella. Ideal cuando antes de reservar necesitás conocer a la persona.
    </div>
    <div className="pref-row">
      <div>
        <div className="pref-label">Mostrar en mi página</div>
        <div className="pref-sub">Podés apagarlo cuando quieras sin perder lo que escribiste</div>
      </div>
      <label style={{position:'relative',width:'40px',height:'22px',cursor:'pointer',display:'block'}}>
        <input type="checkbox" style={{opacity:0,width:0,height:0,position:'absolute'}}
          checked={perfil.destacado.activa}
          onChange={e => setPerfil({...perfil, destacado: {...perfil.destacado, activa: e.target.checked}})}/>
        <span style={{position:'absolute',inset:0,background:perfil.destacado.activa?'#059669':'var(--border)',borderRadius:'22px',transition:'all 0.2s'}}>
          <span style={{position:'absolute',width:'16px',height:'16px',left:perfil.destacado.activa?'21px':'3px',top:'3px',background:'white',borderRadius:'50%',transition:'all 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}/>
        </span>
      </label>
    </div>
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
      <div className="field-hint">Recomendado: 820 x 312 px (horizontal, como una portada de Facebook). Lo importante, centrado: los bordes se pueden recortar un poco en el celular. Después tocá "Guardar todo".</div>
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
        <div className="field-hint">{perfil.whatsapp ? `Les abre WhatsApp con tu número (${perfil.whatsapp}).` : '⚠ Primero cargá tu WhatsApp en la pestaña Perfil, si no el bloque no se muestra.'}</div>
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

  {/* ANUNCIO CON CONTADOR */}
  <div className="s-card">
    <div className="s-card-title">⏳ Anuncio con cuenta regresiva</div>
    <div style={{fontSize:'11px',color:'var(--text-muted)',marginBottom:'12px',lineHeight:1.5}}>
      Para avisar algo que se viene: el inicio de un curso, un taller, un evento o la apertura de cupos. En tu página aparece con un contador de días, horas, minutos y segundos. Cuando llega la fecha, desaparece solo.
    </div>
    <div className="pref-row">
      <div>
        <div className="pref-label">Mostrar en mi página</div>
        <div className="pref-sub">Se oculta automáticamente cuando pasa la fecha</div>
      </div>
      <label style={{position:'relative',width:'40px',height:'22px',cursor:'pointer',display:'block'}}>
        <input type="checkbox" style={{opacity:0,width:0,height:0,position:'absolute'}}
          checked={perfil.anuncio.activa}
          onChange={e => setPerfil({...perfil, anuncio: {...perfil.anuncio, activa: e.target.checked}})}/>
        <span style={{position:'absolute',inset:0,background:perfil.anuncio.activa?'#059669':'var(--border)',borderRadius:'22px',transition:'all 0.2s'}}>
          <span style={{position:'absolute',width:'16px',height:'16px',left:perfil.anuncio.activa?'21px':'3px',top:'3px',background:'white',borderRadius:'50%',transition:'all 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}/>
        </span>
      </label>
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
      <input type="datetime-local" value={isoAInputLocal(perfil.anuncio.fecha)}
        onChange={e => setPerfil({...perfil, anuncio: {...perfil.anuncio, fecha: e.target.value ? new Date(e.target.value).toISOString() : ''}})}/>
      <div className="field-hint">Ponela en tu horario. Cada persona ve la cuenta regresiva según el suyo.</div>
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
        {!perfil.whatsapp && <div className="field-hint">⚠ Primero cargá tu WhatsApp en la pestaña Perfil, si no el botón no aparece.</div>}
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

  {/* LINKS */}
  <div className="s-card">
    <div className="s-card-title"><Settings size={14}/>Links</div>
    <div style={{fontSize:'11px',color:'var(--text-muted)',marginBottom:'12px',lineHeight:1.5}}>
      Tus redes, podcast o cualquier link extra — aparecen en una pestaña aparte de tu página pública.
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
  </div>

  {/* MERCADO PAGO */}
  <div className="s-card">
    <div className="s-card-title">💳 Mercado Pago</div>
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
        <div className="field-hint">Se guarda cifrado. Nunca lo compartás con nadie.</div>
      </div>
    )}
  </div>

  {/* TRANSFERENCIA BANCARIA */}
  <div className="s-card">
    <div className="s-card-title">🏦 Transferencia bancaria</div>
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
  </div>

  <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'24px'}}>
    <button className="save-btn" onClick={guardarPerfil} disabled={guardando}>
      {guardando ? 'Guardando...' : 'Guardar todo'}
    </button>
    {msgExito && <span className="msg-exito">✓ {msgExito}</span>}
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