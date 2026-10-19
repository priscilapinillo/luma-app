// Textos del plan para las pantallas (menú, Inicio, Ajustes, bloqueo). Las fechas, siempre con la hora de Argentina.
import type { EstadoPlan } from '@/lib/acceso'

const ZONA = 'America/Argentina/Buenos_Aires'

export function fechaLarga(d: Date | null): string {
  if (!d) return ''
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', timeZone: ZONA })
}

// días de calendario entre hoy y la fecha, en Argentina (así nunca dice "vence hoy" por la diferencia horaria)
export function diasCalendario(d: Date | null, ahora: Date = new Date()): number | null {
  if (!d) return null
  const dia = (x: Date) => {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(x)
    return Date.UTC(Number(p.slice(0, 4)), Number(p.slice(5, 7)) - 1, Number(p.slice(8, 10)))
  }
  return Math.round((dia(d) - dia(ahora)) / 86400000)
}

export function cuandoVence(d: Date | null): string {
  const n = diasCalendario(d)
  if (n === null) return ''
  if (n <= 0) return 'hoy'
  if (n === 1) return 'mañana'
  return `en ${n} días`
}

export const nombrePlan = (e: EstadoPlan) => (e.plan === 'premium' ? 'Premium' : 'Básico')

// Etiqueta corta para el menú
export function etiquetaPlan(e: EstadoPlan): { titulo: string; detalle: string; ok: boolean; renovar: boolean } {
  switch (e.tipo) {
    case 'prueba': {
      const n = Math.max(0, diasCalendario(e.venceEl) ?? 0)
      return { titulo: '✦ Prueba gratis', detalle: n === 0 ? 'Termina hoy' : `${n} día${n === 1 ? '' : 's'} restante${n === 1 ? '' : 's'}`, ok: false, renovar: false }
    }
    case 'pago':
      return { titulo: `✓ Plan ${nombrePlan(e)}`, detalle: e.automatico ? `Se renueva el ${fechaLarga(e.venceEl)}` : `Pagado hasta el ${fechaLarga(e.venceEl)}`, ok: true, renovar: false }
    case 'cancelado_vigente':
      return { titulo: `✓ Plan ${nombrePlan(e)}`, detalle: `Hasta el ${fechaLarga(e.venceEl)}`, ok: true, renovar: false }
    case 'gracia':
      return { titulo: '⚠️ Plan por renovar', detalle: `Funciona hasta el ${fechaLarga(e.graciaHasta)}`, ok: false, renovar: true }
    case 'vencido':
      return { titulo: '⚠️ Plan vencido', detalle: 'Renová para seguir', ok: false, renovar: true }
    case 'prueba_vencida':
      return { titulo: '⚠️ Prueba vencida', detalle: 'Activá tu plan', ok: false, renovar: true }
    default:
      return { titulo: 'Sin plan', detalle: 'Activá tu plan', ok: false, renovar: true }
  }
}

// Cartel del Inicio (null = no hace falta mostrar nada)
export function cartelPlan(e: EstadoPlan): null | { tono: 'aviso' | 'urgente'; texto: string; boton: string } {
  const dias = diasCalendario(e.venceEl)
  if (e.tipo === 'gracia') {
    return e.automatico
      ? { tono: 'urgente', texto: `No pudimos cobrar tu plan con Mercado Pago. Revisá tu tarjeta o pagá con otra: todo sigue funcionando hasta el ${fechaLarga(e.graciaHasta)}.`, boton: 'Pagar con otra tarjeta' }
      : { tono: 'urgente', texto: `Tu plan venció el ${fechaLarga(e.venceEl)}. Tenés hasta el ${fechaLarga(e.graciaHasta)} para renovarlo sin que se corte nada.`, boton: 'Renovar mi plan' }
  }
  if (e.tipo === 'pago' && !e.automatico && dias !== null && dias <= 5) {
    return { tono: dias <= 1 ? 'urgente' : 'aviso', texto: `Tu plan ${nombrePlan(e)} vence ${cuandoVence(e.venceEl)} (${fechaLarga(e.venceEl)}). Activá el cobro automático: el primer cobro va a ser ese día, nunca dos veces el mismo mes.`, boton: 'Activar cobro automático' }
  }
  if (e.tipo === 'cancelado_vigente' && dias !== null && dias <= 5) {
    return { tono: dias <= 1 ? 'urgente' : 'aviso', texto: `Cancelaste el cobro automático. Tu plan sigue hasta el ${fechaLarga(e.venceEl)} y después se pausa tu página de reservas.`, boton: 'Volver a activarlo' }
  }
  return null
}
