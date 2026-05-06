import Link from 'next/link'

export default function LandingPage() {
  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#F4F2FF',fontFamily:'sans-serif'}}>
      <h1 style={{fontSize:'48px',fontWeight:'800',color:'#1A1035',letterSpacing:'-2px',marginBottom:'8px'}}>Luma</h1>
      <p style={{fontSize:'16px',color:'#7C6BAA',marginBottom:'32px'}}>No recuerda sesiones. Recuerda personas.</p>
      <div style={{display:'flex',gap:'12px'}}>
        <Link href="/auth/login">
          <button style={{padding:'12px 24px',borderRadius:'10px',border:'1px solid #C4B8E8',background:'white',color:'#7C3AED',fontSize:'14px',fontWeight:'600',cursor:'pointer'}}>
            Iniciar sesión
          </button>
        </Link>
        <Link href="/auth/register">
          <button style={{padding:'12px 24px',borderRadius:'10px',border:'none',background:'linear-gradient(135deg,#8B5CF6,#A78BFA)',color:'white',fontSize:'14px',fontWeight:'600',cursor:'pointer'}}>
            Empezar gratis →
          </button>
        </Link>
      </div>
    </div>
  )
}