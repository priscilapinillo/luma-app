'use client'

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode, SyntheticEvent } from 'react'
import { ExternalLink, FileText } from 'lucide-react'
import { detectarContenido } from '@/lib/contenido'

const marco: CSSProperties = { border: 'none', width: '100%', display: 'block', background: '#F5F5F5' }

// Control del reproductor para el cuaderno de la alumna (marcar momento, volver a un minuto, pausar).
// Solo existe para YouTube, Vimeo y videos/audios subidos. Drive y Loom no lo permiten.
export type ControlVideo = {
  tiempo: () => Promise<number>
  duracion: () => Promise<number>
  ir: (segundo: number) => void
  pausar: () => void
}

/* eslint-disable @typescript-eslint/no-explicit-any */
let apiYouTube: Promise<any> | null = null
function cargarApiYouTube(): Promise<any> {
  const w = window as any
  if (w.YT?.Player) return Promise.resolve(w.YT)
  if (apiYouTube) return apiYouTube
  apiYouTube = new Promise((ok, mal) => {
    const previo = w.onYouTubeIframeAPIReady
    w.onYouTubeIframeAPIReady = () => { if (typeof previo === 'function') previo(); ok(w.YT) }
    const sc = document.createElement('script')
    sc.src = 'https://www.youtube.com/iframe_api'; sc.async = true
    sc.onerror = () => { apiYouTube = null; mal(new Error('YouTube API')) }
    document.head.appendChild(sc)
  })
  return apiYouTube
}
let apiVimeo: Promise<any> | null = null
function cargarApiVimeo(): Promise<any> {
  const w = window as any
  if (w.Vimeo?.Player) return Promise.resolve(w.Vimeo)
  if (apiVimeo) return apiVimeo
  apiVimeo = new Promise((ok, mal) => {
    const sc = document.createElement('script')
    sc.src = 'https://player.vimeo.com/api/player.js'; sc.async = true
    sc.onload = () => ok(w.Vimeo)
    sc.onerror = () => { apiVimeo = null; mal(new Error('Vimeo API')) }
    document.head.appendChild(sc)
  })
  return apiVimeo
}

function conParametro(src: string, clave: string, valor: string) {
  const [base, hash] = src.split('#')
  return `${base}${base.includes('?') ? '&' : '?'}${clave}=${encodeURIComponent(valor)}${hash ? '#' + hash : ''}`
}

export default function VisorContenido({ url, tipo, alControl, inicio }: {
  url: string; tipo?: string
  alControl?: (c: ControlVideo | null) => void   // solo el aula de la alumna lo usa
  inicio?: number                                 // "Retomá": arranca en este segundo
}) {
  const [esMovil, setEsMovil] = useState(false)
  const [errorMedia, setErrorMedia] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const mediaRef = useRef<HTMLMediaElement | null>(null)
  const avisarRef = useRef(alControl)
  avisarRef.current = alControl

  useEffect(() => {
    const ua = navigator.userAgent
    const ipad = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1
    setEsMovil(/Android|iPhone|iPad|iPod|Mobile/i.test(ua) || ipad)
  }, [])
  useEffect(() => { setErrorMedia(false) }, [url])

  const c = detectarContenido(url, tipo)
  const conControl = !!alControl
  const visor = c?.visor

  useEffect(() => {
    const avisar = (x: ControlVideo | null) => avisarRef.current?.(x)
    if (!conControl) return
    let vivo = true
    let reproductor: any = null
    avisar(null)
    if (visor === 'youtube' && iframeRef.current) {
      const el = iframeRef.current
      cargarApiYouTube().then(YT => {
        if (!vivo) return
        reproductor = new YT.Player(el, {
          events: {
            onReady: () => {
              if (!vivo) return
              avisar({
                tiempo: async () => Number(reproductor.getCurrentTime?.()) || 0,
                duracion: async () => Number(reproductor.getDuration?.()) || 0,
                ir: (seg: number) => { reproductor.seekTo?.(seg, true); reproductor.playVideo?.() },
                pausar: () => reproductor.pauseVideo?.(),
              })
            },
          },
        })
      }).catch(() => avisar(null))
    } else if (visor === 'vimeo' && iframeRef.current) {
      const el = iframeRef.current
      cargarApiVimeo().then(Vimeo => {
        if (!vivo) return
        reproductor = new Vimeo.Player(el)
        reproductor.ready().then(() => {
          if (!vivo) return
          avisar({
            tiempo: () => reproductor.getCurrentTime().catch(() => 0),
            duracion: () => reproductor.getDuration().catch(() => 0),
            ir: (seg: number) => { reproductor.setCurrentTime(seg).then(() => reproductor.play()).catch(() => null) },
            pausar: () => { reproductor.pause().catch(() => null) },
          })
        }).catch(() => avisar(null))
      }).catch(() => avisar(null))
    } else if ((visor === 'video' || visor === 'audio') && mediaRef.current) {
      const m = mediaRef.current
      avisar({
        tiempo: async () => m.currentTime || 0,
        duracion: async () => (isFinite(m.duration) ? m.duration : 0),
        ir: (seg: number) => { m.currentTime = seg; m.play().catch(() => null) },
        pausar: () => m.pause(),
      })
    }
    return () => { vivo = false; avisar(null) }
  }, [url, visor, conControl])

  if (!c) return null

  // con control: YouTube y Vimeo necesitan permiso para que la página lea el minuto; "inicio" arranca donde quedó
  const ini = Math.max(0, Math.floor(inicio || 0))
  let srcVideo = c.embedUrl
  if (c.visor === 'youtube') {
    if (conControl) srcVideo = conParametro(conParametro(srcVideo, 'enablejsapi', '1'), 'origin', typeof window !== 'undefined' ? window.location.origin : '')
    if (ini > 0) srcVideo = conParametro(srcVideo, 'start', String(ini))
  } else if (c.visor === 'vimeo' && ini > 0) {
    srcVideo = `${srcVideo.split('#')[0]}#t=${ini}s`
  }
  const alCargarMedia = (e: SyntheticEvent<HTMLMediaElement>) => {
    if (ini > 0 && e.currentTarget.currentTime < 1) { try { e.currentTarget.currentTime = ini } catch { /* nada */ } }
  }

  // link de la compu de la terapeuta: no se puede abrir desde otro lado
  if (c.visor === 'local') {
    return (
      <div style={{padding:'16px 18px',borderRadius:'14px',border:'1px solid #FDE68A',background:'#FFFBEB',fontSize:'13px',color:'#92400E',lineHeight:1.6}}>
        <strong>Este material todavía no está disponible.</strong><br/>
        Avisale a tu terapeuta para que lo vuelva a cargar.
      </div>
    )
  }

  const botonAbrir = (texto: string) => (
    <a href={c.abrirUrl} target="_blank" rel="noopener noreferrer"
      style={{display:'inline-flex',alignItems:'center',gap:'6px',fontSize:'12px',fontWeight:600,color:'#7C3AED',textDecoration:'none'}}>
      <ExternalLink size={13}/> {texto}
    </a>
  )

  const pie = (extra?: ReactNode) => (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'10px',flexWrap:'wrap',padding:'8px 2px 0'}}>
      <span style={{fontSize:'11px',color:'#A3A3A3'}}>{c.plataforma}</span>
      <div style={{display:'flex',gap:'14px',flexWrap:'wrap',alignItems:'center'}}>
        {extra}
        {botonAbrir('Abrir en pestaña nueva')}
      </div>
    </div>
  )

  const caja16x9 = (src: string, titulo: string, conRef = false) => (
    <div style={{position:'relative',paddingBottom:'56.25%',height:0,borderRadius:'14px',overflow:'hidden',background:'#000'}}>
      <iframe ref={conRef ? iframeRef : undefined} src={src} title={titulo} loading={conRef && conControl ? undefined : 'lazy'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin" allowFullScreen
        style={{position:'absolute',inset:0,width:'100%',height:'100%',border:'none'}}/>
    </div>
  )

  const cajaAlta = (src: string, titulo: string) => (
    <div style={{borderRadius:'14px',overflow:'hidden',border:'1px solid #E5E5E5'}}>
      <iframe src={src} title={titulo} loading="lazy" allow="autoplay; fullscreen" allowFullScreen
        style={{...marco,height:'min(75vh, 900px)',minHeight:'420px'}}/>
    </div>
  )

  // ── videos de plataformas
  if (c.visor === 'youtube' || c.visor === 'vimeo') {
    return <div>{caja16x9(srcVideo, 'Video de la lección', true)}{pie()}</div>
  }
  if (c.visor === 'loom') {
    return <div>{caja16x9(c.embedUrl, 'Video de la lección')}{pie()}</div>
  }

  // ── Google Drive: el mismo visor sirve para PDF, video, audio e imágenes
  if (c.visor === 'drive') {
    if (tipo === 'audio') {
      return (
        <div>
          <div style={{borderRadius:'14px',overflow:'hidden',border:'1px solid #E5E5E5'}}>
            <iframe src={c.embedUrl} title="Audio de la lección" loading="lazy" allow="autoplay" style={{...marco,height:`${c.alto || 200}px`}}/>
          </div>
          {pie()}
        </div>
      )
    }
    if (tipo === 'video') return <div>{caja16x9(c.embedUrl, 'Video de la lección')}{pie()}</div>
    return <div>{cajaAlta(c.embedUrl, 'Documento de la lección')}{pie()}</div>
  }

  // ── Docs, Slides, Canva, formularios, carpetas
  if (c.visor === 'documento' || c.visor === 'carpeta') {
    return <div>{cajaAlta(c.embedUrl, c.plataforma)}{pie()}</div>
  }

  // ── reproductores de audio (Spotify, SoundCloud, iVoox, Apple Podcasts)
  if (c.visor === 'reproductor') {
    return (
      <div>
        <iframe src={c.embedUrl} title={`Audio en ${c.plataforma}`} loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          style={{...marco,background:'transparent',height:`${c.alto || 166}px`,borderRadius:'12px'}}/>
        {pie()}
      </div>
    )
  }

  // ── archivo de audio directo
  if (c.visor === 'audio') {
    return (
      <div>
        <div style={{padding:'14px',background:'white',border:'1px solid #E5E5E5',borderRadius:'14px'}}>
          <audio ref={el => { mediaRef.current = el }} onLoadedMetadata={alCargarMedia} controls preload="metadata" src={c.embedUrl} onError={() => setErrorMedia(true)} style={{width:'100%'}}/>
        </div>
        {errorMedia && (
          <div style={{marginTop:'8px',fontSize:'12px',color:'#92400E',background:'#FEF3C7',padding:'10px 12px',borderRadius:'10px',lineHeight:1.5}}>
            Este audio no se puede reproducir acá (por ejemplo, los audios de WhatsApp no andan en iPhone). Abrilo con el botón de abajo.
          </div>
        )}
        {pie()}
      </div>
    )
  }

  // ── archivo de video directo
  if (c.visor === 'video') {
    return (
      <div>
        <div style={{position:'relative',paddingBottom:'56.25%',height:0,borderRadius:'14px',overflow:'hidden',background:'#000'}}>
          <video ref={el => { mediaRef.current = el }} onLoadedMetadata={alCargarMedia} controls playsInline preload="metadata" onError={() => setErrorMedia(true)}
            style={{position:'absolute',inset:0,width:'100%',height:'100%'}}>
            <source src={c.embedUrl}/>
          </video>
        </div>
        {errorMedia && (
          <div style={{marginTop:'8px',fontSize:'12px',color:'#92400E',background:'#FEF3C7',padding:'10px 12px',borderRadius:'10px'}}>
            Este video no se puede reproducir acá. Abrilo con el botón de abajo.
          </div>
        )}
        {pie()}
      </div>
    )
  }

  // ── PDF directo: en compu lo muestra el navegador; en celular usamos el visor de Google
  //    (Android no muestra PDFs adentro de una página y iPhone solo muestra la primera hoja)
  if (c.visor === 'pdf') {
    const src = esMovil
      ? `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(c.embedUrl)}`
      : `${c.embedUrl}#view=FitH`
    return (
      <div>
        {cajaAlta(src, 'PDF de la lección')}
        {pie(esMovil ? <span style={{fontSize:'11px',color:'#A3A3A3'}}>¿No carga? Abrilo acá →</span> : undefined)}
      </div>
    )
  }

  // ── imagen
  if (c.visor === 'imagen') {
    return (
      <div>
        <img src={c.embedUrl} alt="" style={{width:'100%',borderRadius:'14px',display:'block',border:'1px solid #E5E5E5'}}/>
        {pie()}
      </div>
    )
  }

  // ── link que no reconocemos: igual se puede abrir
  return (
    <a href={c.abrirUrl} target="_blank" rel="noopener noreferrer"
      style={{display:'flex',alignItems:'center',gap:'12px',padding:'16px 18px',borderRadius:'14px',border:'1px solid #E5E5E5',background:'white',textDecoration:'none'}}>
      <div style={{width:'40px',height:'40px',borderRadius:'10px',background:'#F4F0FF',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
        <FileText size={18} color="#7C3AED"/>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:'14px',fontWeight:700,color:'#0A0A0A'}}>Abrir contenido</div>
        <div style={{fontSize:'12px',color:'#737373',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>Se abre en {c.plataforma}</div>
      </div>
      <ExternalLink size={16} color="#7C3AED"/>
    </a>
  )
}