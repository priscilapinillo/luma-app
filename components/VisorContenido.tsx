'use client'

import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { ExternalLink, FileText } from 'lucide-react'
import { detectarContenido } from '@/lib/contenido'

const marco: CSSProperties = { border: 'none', width: '100%', display: 'block', background: '#F5F5F5' }

export default function VisorContenido({ url, tipo }: { url: string; tipo?: string }) {
  const [esMovil, setEsMovil] = useState(false)
  const [errorMedia, setErrorMedia] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent
    const ipad = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1
    setEsMovil(/Android|iPhone|iPad|iPod|Mobile/i.test(ua) || ipad)
  }, [])
  useEffect(() => { setErrorMedia(false) }, [url])

  const c = detectarContenido(url, tipo)
  if (!c) return null

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

  const caja16x9 = (src: string, titulo: string) => (
    <div style={{position:'relative',paddingBottom:'56.25%',height:0,borderRadius:'14px',overflow:'hidden',background:'#000'}}>
      <iframe src={src} title={titulo} loading="lazy"
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
  if (c.visor === 'youtube' || c.visor === 'vimeo' || c.visor === 'loom') {
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
          <audio controls preload="metadata" src={c.embedUrl} onError={() => setErrorMedia(true)} style={{width:'100%'}}/>
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
          <video controls playsInline preload="metadata" onError={() => setErrorMedia(true)}
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