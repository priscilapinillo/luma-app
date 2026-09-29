'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

export default function BuscarCertificadoPage() {
  const [codigo, setCodigo] = useState('')
  const router = useRouter()

  function buscar() {
    if (!codigo.trim()) return
    router.push(`/certificado/${codigo.trim().toUpperCase()}`)
  }

  return (
    <div style={{minHeight:'100vh',background:'#0D0B14',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',fontFamily:"'Jost',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500&family=Jost:wght@400;500;600&display=swap');`}</style>
      <div style={{maxWidth:'420px',width:'100%',textAlign:'center'}}>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'26px',color:'#E8D5A3',marginBottom:'8px'}}>Luma</div>
        <div style={{fontSize:'14px',color:'#C4B8DE',marginBottom:'28px'}}>Verificar un certificado</div>
        <input value={codigo} onChange={e => setCodigo(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && buscar()}
          placeholder="Ej: LUMA-8F3K21"
          style={{width:'100%',padding:'14px 16px',borderRadius:'12px',border:'1px solid rgba(201,168,76,0.3)',background:'rgba(255,255,255,0.05)',color:'#F0E8D5',fontSize:'14px',outline:'none',marginBottom:'14px',fontFamily:'inherit',textAlign:'center',letterSpacing:'1px'}}/>
        <button onClick={buscar}
          style={{width:'100%',padding:'14px',background:'linear-gradient(135deg,#6B3FA0,#8B5CF6)',color:'#E8D5A3',border:'none',borderRadius:'12px',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
          <Search size={14}/> Verificar
        </button>
      </div>
    </div>
  )
}