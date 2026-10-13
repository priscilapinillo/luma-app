// Regla única de "qué pasos de Página de reservas están listos".
// La usan Ajustes (los 9 bloques) y el cartel de Inicio, así nunca dicen cosas distintas.

export type DatosProgreso = {
    avatar_url?: string | null
    nombre_profesional?: string | null
    whatsapp?: string | null
    tipo_pago?: string | null
    mp_activo?: boolean | null
    tiene_token_mp?: boolean
    acepta_transferencia?: boolean | null
    alias_pago?: string | null
    slug?: string | null
    pagina_activa?: boolean | null
    servicios_activos: number
    franjas_activas: number
    avisos_activos: boolean
  }
  
  export type IdPaso =
    | 'perfil' | 'servicios' | 'horarios' | 'diseno' | 'secciones'
    | 'links' | 'cobros' | 'avisos' | 'compartir'
  
  export const PASOS: { id: IdPaso; numero: number; titulo: string; explicacion: string }[] = [
    { id: 'perfil', numero: 1, titulo: 'Tu perfil', explicacion: 'Es lo que ven tus consultantes en tu página de reservas.' },
    { id: 'servicios', numero: 2, titulo: 'Tus servicios', explicacion: 'Lo que tus consultantes pueden reservar. Sin servicios, tu página no tiene nada para ofrecer.' },
    { id: 'horarios', numero: 3, titulo: 'Tus horarios', explicacion: 'Los días y horas en que tus consultantes pueden reservar.' },
    { id: 'diseno', numero: 4, titulo: 'Diseño de tu página', explicacion: 'Elegí el estilo de tu página. Lo podés cambiar cuando quieras.' },
    { id: 'secciones', numero: 5, titulo: 'Secciones de tu página', explicacion: 'Elegí qué más mostrar en tu página.' },
    { id: 'links', numero: 6, titulo: 'Tus links', explicacion: 'Tus redes, podcast, comunidad o regalos, en una pestaña aparte de tu página.' },
    { id: 'cobros', numero: 7, titulo: 'Cobros', explicacion: 'Cómo te pagan tus consultantes cuando reservan.' },
    { id: 'avisos', numero: 8, titulo: 'Avisos de reservas', explicacion: 'Recibí un aviso en tu celular cada vez que alguien reserva o paga.' },
    { id: 'compartir', numero: 9, titulo: 'Activá y compartí tu página', explicacion: 'Tu dirección, el interruptor para activarla y tu link para compartir.' },
  ]
  
  const lleno = (v?: string | null) => !!(v && v.trim())
  
  export function calcularPasos(d: DatosProgreso): Record<IdPaso, boolean> {
    const cobraAlReservar = d.tipo_pago === 'completo'
    const tieneMedio = (!!d.mp_activo && !!d.tiene_token_mp) || (!!d.acepta_transferencia && lleno(d.alias_pago))
    return {
      perfil: lleno(d.avatar_url) && lleno(d.nombre_profesional) && lleno(d.whatsapp),
      servicios: d.servicios_activos > 0,
      horarios: d.franjas_activas > 0,
      diseno: true,      // cuenta también la plantilla que viene por defecto
      secciones: true,   // son opcionales
      links: true,       // opcional
      cobros: d.tipo_pago === 'libre' || (cobraAlReservar && tieneMedio),
      avisos: d.avisos_activos,
      compartir: lleno(d.slug) && !!d.pagina_activa,
    }
  }
  
  export function contarListos(pasos: Record<IdPaso, boolean>) {
    return PASOS.filter(p => pasos[p.id]).length
  }
  
  export function primerIncompleto(pasos: Record<IdPaso, boolean>): IdPaso | null {
    const p = PASOS.find(x => !pasos[x.id])
    return p ? p.id : null
  }
  
  // Dirección de la página: minúsculas, sin tildes, sin espacios, solo letras, números y guiones.
  // "mientrasEscribe" deja pasar un guión al final para poder seguir tipeando ("maria-" → "maria-luz").
  export function limpiarSlug(texto: string, mientrasEscribe = false) {
    let s = (texto || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/ñ/g, 'n')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-{2,}/g, '-')
      .replace(/^-+/, '')
    if (!mientrasEscribe) s = s.replace(/-+$/, '')
    return s.slice(0, 60)
  }