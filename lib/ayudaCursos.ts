// Textos de ayuda para crear y editar cursos (los mismos en "Nuevo curso" y en la pestaña Información).
// Cortos y en criollo: muchas terapeutas los leen apuradas desde el celu.
export const AYUDA_CURSO = {
  titulo: 'El nombre que ven tus alumnas en tu página y en su aula.',
  // textos para descargables (mismo editor, versión corta)
  descargable: {
    titulo: 'El nombre que se ve en tu página y en la cuenta de quien lo compra.',
    descripcionCorta: 'Una frase que se ve en la tarjeta. Ej: «12 rituales simples para cada luna nueva».',
    descripcionLarga: 'Se ve en la página de venta. Contá qué es, para qué sirve y qué va a encontrar adentro.',
  },
  descripcionCorta: 'Una frase que se ve en la tarjeta del curso. Ej: «Aprendé a leer las 78 cartas en 4 semanas».',
  descripcionLarga: 'Se ve en la página de venta. Contá qué incluye, cómo se cursa y con qué se queda tu alumna.',
  video: 'Opcional. Un video corto tuyo presentando el curso. Pegá el link de YouTube.',
  precio: (modalidad: string) => modalidad === 'suscripcion'
    ? 'Lo que paga tu alumna cada mes. Poné 0 si es gratis.'
    : 'Lo que paga tu alumna una sola vez. Poné 0 si es gratis.',
  precioTachado: 'Opcional. Si lo completás, se muestra tachado al lado del precio, como oferta. Tiene que ser más alto que el precio.',
  modalidad: (modalidad: string) => modalidad === 'suscripcion'
    ? 'Paga todos los meses. Si deja de pagar, el acceso se le vence solo.'
    : 'Paga una vez y entra para siempre.',
  duracion: 'Aproximada, sumando todas las lecciones. Ayuda a que tu alumna se organice.',
  listas: 'Frases cortas, una por renglón. Se ven en la página de venta.',
  garantia: 'Opcional. Se muestra en la página de venta y da confianza. Las devoluciones las hacés vos desde tu Mercado Pago.',
  estado: 'Borrador: solo lo ves vos. Publicado: aparece en tu página y se puede comprar.',
  precioUsd: 'Opcional. Si lo completás, tus alumnas pueden elegir pagar en dólares con las formas que pusiste en Ajustes → Cobros → «Cómo cobrar en dólares». Vos confirmás el pago cuando te llega.',
}
