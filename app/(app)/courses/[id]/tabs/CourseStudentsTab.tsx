'use client'

export default function CourseStudentsTab({ cursoId }: { cursoId: string }) {
  return (
    <div style={{padding:'40px 20px',textAlign:'center',color:'var(--text-muted)'}}>
      <div style={{fontSize:'32px',marginBottom:'12px'}}>👩‍🎓</div>
      <div style={{fontSize:'14px',fontWeight:600,color:'var(--text-primary)',marginBottom:'6px'}}>Alumnas</div>
      <p style={{fontSize:'12px'}}>Las alumnas aparecerán acá cuando alguien se inscriba al curso.</p>
    </div>
  )
}