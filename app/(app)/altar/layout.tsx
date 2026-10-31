'use client'
// Altar de ideas: sesión y plan. Sin plan vigente vuelve al Inicio (sus ideas quedan guardadas).
// Las alumnas ya salen antes, en app/(app)/layout.tsx. Blue Hour + Fraunces/Nunito viven solo acá adentro.
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { calcularAcceso, pareceDesactualizado } from '@/lib/acceso'
import { verificarPlanEnVivo } from '@/lib/verificarPlan'
import { PlanAltar } from '@/components/altar/PlanAltar'

export default function AltarLayout({ children }: { children: React.ReactNode }) {
  const [plan, setPlan] = useState<{ nivel: 'basico' | 'premium'; userId: string } | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { window.location.href = '/auth/login'; return }
        const { data: sub } = await supabase.from('subscriptions').select('status, trial_ends_at, current_period_ends_at, plan, mp_subscription_id').eq('user_id', user.id).maybeSingle()
        let nivel = calcularAcceso(sub)
        if (nivel !== 'premium' && pareceDesactualizado(sub)) {
          const v = await verificarPlanEnVivo()
          if (v.vigente) nivel = v.plan === 'premium' ? 'premium' : 'basico'
        }
        if (nivel === 'sin_acceso') { window.location.href = '/dashboard'; return }
        setPlan({ nivel, userId: user.id })
      } catch (e) { console.error(e); window.location.href = '/dashboard' }
    })()
  }, [])

  return (
    <div className="altar">
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,400..900,100&family=Nunito:wght@500;600;700;800;900&display=swap"/>
      <style>{`
        .altar{--al-bg:#F4F1EC;--al-punto:rgba(98,107,145,.28);--al-tarjeta:#FFFCF7;--al-borde:#E6DCCE;--al-texto:#27344A;--al-texto2:#6E7388;
          --al-acento:#626B91;--al-sobre-acento:#FFFCF7;--al-suave:#ECE7F2;--al-oro:#C9A55C;--al-peligro:#A24B47;
          font-family:Nunito,system-ui,sans-serif;color:var(--al-texto);background:var(--al-bg);min-height:100%}
        /* modo oscuro (etapa 6): la mesa se oscurece; las notas y cartas quedan como papel claro arriba */
        html.dark .altar{--al-bg:#1A2232;--al-punto:rgba(169,155,184,.22);--al-tarjeta:#27344A;--al-borde:#34425C;--al-texto:#F0E6D8;--al-texto2:#B9B3C6;
          --al-acento:#A99BB8;--al-sobre-acento:#1A2232;--al-suave:#2E3A5A;--al-oro:#D9B96E;--al-peligro:#F09A92}
        .altar .al-f{font-family:Fraunces,Georgia,serif;font-variation-settings:'SOFT' 100;font-weight:850;letter-spacing:-.01em}
        .altar button:focus-visible,.altar a:focus-visible,.altar input:focus-visible{outline:2.5px solid var(--al-acento);outline-offset:2px}
      `}</style>
      {plan
        ? <PlanAltar.Provider value={plan}>{children}</PlanAltar.Provider>
        : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontSize: 14, color: '#6E7388' }}>Cargando…</div>}
    </div>
  )
}
