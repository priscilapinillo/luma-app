// Luma Emprende · curso de postres en vasito
// Acá está todo lo que se edita de la landing (/emprende): datos de la cuenta, precio y textos.
// El pago, el aula y los mails los resuelve Luma Cursos como siempre.

export const EMPRENDE = {
  // ⚠️ 1) El slug de la cuenta que vende el curso (el de lumaapp.lat/p/ESTE-SLUG)
  slug: 'postres-en-vaso',
  // ⚠️ 2) El slug del curso creado en Cursos (lumaapp.lat/p/tu-slug/cursos/ESTE-SLUG)
  curso: 'postres-en-vaso',
  // ⚠️ 3) Mismo precio que el curso en el panel (si no coinciden, la persona ve uno y paga otro)
  precioTexto: '$ 3.499',
  titulo: 'Postres en vaso, emprendé desde casa',
  // ⚠️ 4) El segundo curso, IGUAL al primero pero SIN la parte de bonos. Se vende cuando se acaba el reloj.
  //    Mismo precio. Es lo que hace que el cartel "se terminan los bonos" sea verdad.
  cursoSinBonos: 'postres-en-vaso-sin-bonos',
}

// Reloj de los bonos (por visita): minutos de oferta y minutos que pasan hasta que le aparece de nuevo.
export const OFERTA = { minutos: 10, espera: 10 }

export const URL_CHECKOUT = `/p/${EMPRENDE.slug}/cursos/${EMPRENDE.curso}/checkout`
export const URL_CHECKOUT_SIN_BONOS = `/p/${EMPRENDE.slug}/cursos/${EMPRENDE.cursoSinBonos}/checkout`
export const SLUG_CONFIGURADO = !EMPRENDE.slug.startsWith('CAMBIAR')

export const MODULOS = [
  { n: 1, titulo: 'Recetario', extra: 'Más de 30 recetas en vasito', color: 'p', lista: ['Cheesecakes', 'Cremosos y mousses sin horno', 'Base de galletita, bizcochuelo y torta', 'Shots dulces para eventos', 'Helados'], chips: ['Técnica paso a paso', 'Utensilios', 'Herramientas', 'Reemplazos', 'Si algo sale mal', 'Conservación'] },
  { n: 2, titulo: 'Guía de pastelería', extra: '', color: 'li', texto: 'Herramientas, tips y cosas a tener en cuenta para que todo te salga bien desde la primera vez.' },
  { n: 3, titulo: 'Marketing y estrategia para redes', extra: '5 lecciones', color: 'mi', texto: 'Cómo mostrar tus vasitos, qué publicar y cómo conseguir tus primeros clientes.' },
  { n: 4, titulo: 'Costos y precio', extra: '', color: 'pe', texto: 'Cómo calcular cuánto cobrar, con planilla de costos lista para usar.' },
  { n: 5, titulo: 'Fotos, emplatado y packaging', extra: '', color: 'am', texto: 'Fotos con el celu, emplatado, packaging y preguntas de principiante.' },
]

export const QUE_RECIBIS = [
  { color: 'y', titulo: 'Recetario con más de 30 recetas', texto: 'Cheesecakes, cremosos y mousses sin horno, bases, shots para eventos y helados.', chips: ['Técnica', 'Utensilios', 'Herramientas', 'Cosas a tener en cuenta'] },
  { color: 'p', titulo: 'Herramientas y tips de pastelería', texto: 'Qué necesitás, qué podés reemplazar y cómo evitar los errores más comunes.' },
  { color: 'mi', titulo: 'Planilla de costos y cómo calcular tu precio', texto: 'Sabé cuánto te cuesta cada vasito y cuánto cobrar.' },
  { color: 'li', titulo: 'Marketing y fotografía con el celu', texto: 'Emplatado, packaging y fotos que dan ganas de pedir.' },
]
export const VIDEOS_EXTRA = {
  titulo: 'Videos extra',
  texto: 'Una recopilación de videos de YouTube para complementar. Son videos de YouTube de otras personas, reunidos en un solo lugar. No son el curso principal.',
}
export const BONOS = [
  '54 recetas de helados y flanes (PDF)',
  'Estrategias de venta para Instagram, TikTok y WhatsApp (PDF)',
  'Plantillas de mensajes para responder consultas (PDF)',
  'Guía: cómo conseguir tus primeros clientes (PDF)',
]

export const BONOS_CHIPS = [
  'Bono: 54 recetas de helados y flanes',
  'Bono: Estrategias de venta (Instagram, TikTok y WhatsApp)',
  'Bono: Plantillas de mensajes',
  'Bono: Guía de primeros clientes',
]

export const PARA_QUIEN = [
  { c: 'p', t: 'Sos mamá y querés trabajar desde casa' },
  { c: 'y', t: 'Estudiás y necesitás un ingreso extra' },
  { c: 'li', t: 'Te quedaste sin laburo y querés empezar algo propio' },
  { c: 'pe', t: 'Nunca vendiste y no sabés por dónde empezar' },
  { c: 'mi', t: 'No tenés mucho para invertir' },
  { c: 'p', t: 'Te encanta la repostería y querés animarte' },
]

export const FAQ = [
  { q: '¿Cómo lo recibo?', a: 'Apenas se aprueba tu pago te llega un mail con el acceso. El link también aparece en pantalla al terminar la compra.' },
  { q: '¿Cómo lo abro en el celu?', a: 'Entrás desde el navegador con tu mail y tu contraseña. Podés instalar el aula como una app desde el menú del navegador.' },
  { q: '¿Cómo pago?', a: 'Con Mercado Pago: tarjeta de crédito, débito o saldo en tu cuenta. El pago es único.' },
  { q: '¿Puedo pagar en efectivo?', a: 'Por ahora no. Se paga con tarjeta, débito o saldo en Mercado Pago.' },
  { q: 'No me llegó el mail, ¿qué hago?', a: 'Mirá la carpeta de spam. Si no está, en la pantalla de compra tenés el botón "No me llegó el mail" y te lo reenviamos.' },
  { q: '¿Cuánto tiempo tengo acceso?', a: 'De por vida.' },
  { q: '¿Los videos extra son parte del curso?', a: 'Son una recopilación de videos de YouTube de otras personas, como complemento. El curso principal es el recetario, con la planilla de costos y las guías para vender.' },
  { q: '¿Necesito muchos materiales?', a: 'Ingredientes comunes y utensilios de cocina que ya tengas en casa. La lista completa de cada receta está dentro del curso.' },
]
