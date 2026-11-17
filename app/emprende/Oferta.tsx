'use client'
// Reloj de los bonos, por visita. Es honesto porque lo que dice pasa de verdad:
//  - Mientras corre: el botón lleva al curso CON bonos.
//  - Cuando termina: se esconden los bonos y el botón lleva al curso SIN bonos (otro curso en Luma).
//  - Recién 'espera' minutos después le vuelve a aparecer.
import { useEffect, useState } from 'react'
import { OFERTA, URL_CHECKOUT, URL_CHECKOUT_SIN_BONOS } from '@/lib/emprende'

const CLAVE = 'em_bonos_inicio'
const MIN = 60000

function leer(): number | null {
  try { const v = localStorage.getItem(CLAVE); return v ? Number(v) : null } catch { return null }
}
function guardar(t: number) { try { localStorage.setItem(CLAVE, String(t)) } catch {} }

export default function Oferta() {
  const [aviso, setAviso] = useState(false)

  useEffect(() => {
    const raiz = document.querySelector('.em') as HTMLElement | null
    if (!raiz) return
    let inicio = leer() ?? Date.now()
    if (leer() === null) guardar(inicio)
    let fase: 'activa' | 'vencida' | '' = ''

    const pintar = () => {
      const ahora = Date.now()
      let fin = inicio + OFERTA.minutos * MIN
      if (ahora >= fin + OFERTA.espera * MIN) { inicio = ahora; guardar(inicio); fin = inicio + OFERTA.minutos * MIN }
      const nueva: 'activa' | 'vencida' = ahora < fin ? 'activa' : 'vencida'
      if (nueva !== fase) {
        if (fase === 'activa' && nueva === 'vencida') setAviso(true)
        fase = nueva
        raiz.dataset.oferta = nueva
        const url = nueva === 'activa' ? URL_CHECKOUT : URL_CHECKOUT_SIN_BONOS
        raiz.querySelectorAll<HTMLAnchorElement>('a[data-compra]').forEach(a => { a.href = url })
      }
      if (nueva === 'activa') {
        const seg = Math.max(0, Math.ceil((fin - ahora) / 1000))
        const txt = String(Math.floor(seg / 60)).padStart(2, '0') + ':' + String(seg % 60).padStart(2, '0')
        raiz.querySelectorAll('[data-reloj]').forEach(e => { e.textContent = txt })
        raiz.classList.toggle('urgente', seg <= 60)
      } else raiz.classList.remove('urgente')
    }

    pintar()
    const id = setInterval(pintar, 1000)
    return () => clearInterval(id)
  }, [])

  if (!aviso) return null
  return (
    <div className="aviso" role="dialog" aria-modal="true" aria-labelledby="aviso-t">
      <div className="aviso-box">
        <h3 id="aviso-t">Se terminó el tiempo de los bonos</h3>
        <p>Podés comprar igual el curso completo, pero ya sin los bonos de regalo.</p>
        <a className="btn" href={URL_CHECKOUT_SIN_BONOS}>Comprar sin bonos</a>
        <button type="button" className="aviso-x" onClick={() => setAviso(false)}>Cerrar</button>
      </div>
    </div>
  )
}
