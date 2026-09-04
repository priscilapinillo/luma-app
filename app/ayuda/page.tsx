export default function AyudaPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Inter:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html,body{background:#F7F4FF;font-family:'Inter',sans-serif;color:#1A1035}
        .ay-wrap{max-width:720px;margin:0 auto;padding:56px 24px 80px}
        .ay-logo{font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#3B0F8C;letter-spacing:-0.5px;margin-bottom:44px;display:block;text-decoration:none}
        .ay-logo span{color:#8B5CF6}
        .ay-title{font-family:'Syne',sans-serif;font-size:38px;font-weight:800;color:#1A1035;letter-spacing:-1px;line-height:1.1;margin-bottom:10px}
        .ay-sub{font-size:15px;color:#7C6BAA;margin-bottom:52px;line-height:1.75;max-width:480px}
        .ay-section{margin-bottom:44px}
        .ay-section-title{font-family:'Syne',sans-serif;font-size:12px;font-weight:700;color:#8B5CF6;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid rgba(139,92,246,0.12)}
        .ay-faq{margin-bottom:6px;border-radius:12px;border:1px solid rgba(139,92,246,0.1);overflow:hidden;background:white;transition:border-color 0.2s;box-shadow:0 1px 4px rgba(139,92,246,0.04)}
        .ay-faq:hover{border-color:rgba(139,92,246,0.22)}
        .ay-faq-q{padding:16px 20px;font-size:14px;font-weight:500;color:#1A1035;cursor:pointer;display:flex;justify-content:space-between;align-items:center;user-select:none;line-height:1.4;gap:12px;list-style:none}
        .ay-faq-q::-webkit-details-marker{display:none}
        .ay-faq-q:hover{background:#FDFBFF}
        .ay-faq-icon{width:20px;height:20px;border-radius:50%;border:1px solid rgba(139,92,246,0.3);display:flex;align-items:center;justify-content:center;font-size:14px;color:#8B5CF6;flex-shrink:0;transition:all 0.2s;font-weight:300;line-height:1}
        details[open] .ay-faq-icon{background:#8B5CF6;color:white;border-color:#8B5CF6}
        .ay-faq-a{padding:12px 20px 16px;font-size:13.5px;color:#4A3F6B;line-height:1.85;white-space:pre-line;border-top:1px solid rgba(139,92,246,0.07)}
        .ay-contact{background:linear-gradient(135deg,#F4F0FF,#EDE8FF);border-radius:20px;padding:36px;text-align:center;margin-top:52px;border:1px solid rgba(139,92,246,0.15)}
        .ay-contact-title{font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#1A1035;margin-bottom:8px;letter-spacing:-0.5px}
        .ay-contact-sub{font-size:14px;color:#7C6BAA;margin-bottom:24px;line-height:1.75}
        .ay-contact-btn{display:inline-block;padding:13px 28px;background:linear-gradient(135deg,#6B3FA0,#8B5CF6);color:white;border-radius:50px;font-size:13px;font-weight:600;text-decoration:none;letter-spacing:0.5px;box-shadow:0 6px 20px rgba(124,58,237,0.25);transition:all 0.2s}
        .ay-contact-btn:hover{transform:translateY(-1px);box-shadow:0 8px 28px rgba(124,58,237,0.35)}
        .ay-divider{border:none;border-top:1px solid rgba(139,92,246,0.1);margin:40px 0}
        .ay-footer{font-size:12px;color:#9B8EC4;text-align:center;line-height:2}
        .ay-footer a{color:#8B5CF6;text-decoration:none}
        .ay-footer a:hover{text-decoration:underline}
        html.dark body{background:#0D0B14;color:#E9D5FF}
        html.dark .ay-logo{color:#C4A8FF}
        html.dark .ay-faq{background:rgba(255,255,255,0.04);border-color:rgba(139,92,246,0.15)}
        html.dark .ay-faq-q{color:#E9D5FF}
        html.dark .ay-faq:hover{border-color:rgba(139,92,246,0.3)}
        html.dark .ay-faq-a{color:#A89BC4;border-top-color:rgba(139,92,246,0.1)}
        html.dark .ay-faq-q:hover{background:rgba(255,255,255,0.03)}
        html.dark .ay-contact{background:linear-gradient(135deg,rgba(107,63,160,0.2),rgba(139,92,246,0.1));border-color:rgba(139,92,246,0.2)}
        html.dark .ay-contact-title{color:#E9D5FF}
        html.dark .ay-contact-sub{color:#9B8EC4}
        html.dark .ay-title{color:#E9D5FF}
        html.dark .ay-sub{color:#7C6BAA}
        html.dark .ay-section-title{color:#A78BFA}
        html.dark .ay-footer{color:#4B3B6A}
      `}</style>

      <div className="ay-wrap">
        <a href="/dashboard" className="ay-logo">Luma<span>.</span></a>

        <h1 className="ay-title">Centro de ayuda</h1>
        <p className="ay-sub">
          Encontrá respuestas a las preguntas más frecuentes. Si no encontrás lo que buscás, escribinos.
        </p>

        {[
          {
            categoria: 'Cuenta y acceso',
            faqs: [
              {
                q: '¿Cómo recupero mi contraseña?',
                a: 'Andá a la pantalla de login y hacé click en "Olvidé mi contraseña". Te vamos a mandar un email con un link para resetearla. Revisá también la carpeta de spam.'
              },
              {
                q: 'Confirmé mi email pero no puedo entrar',
                a: 'Cerrá el link de confirmación y volvé a ingresar desde luma-app-terapeutas-holisticos.netlify.app/auth/login con tu email y contraseña. Si el problema persiste escribinos.'
              },
              {
                q: '¿Puedo cambiar mi email?',
                a: 'Por ahora el cambio de email se hace manualmente. Escribinos a lumaapp.soporte@gmail.com con tu email actual y el nuevo y lo hacemos en menos de 24 horas.'
              },
              {
                q: 'No me llegó el email de confirmación',
                a: 'Revisá la carpeta de spam o no deseados. Si no está, escribinos a lumaapp.soporte@gmail.com y te lo reenviamos.'
              },
            ]
          },
          {
            categoria: 'Pagos y suscripción',
            faqs: [
              {
                q: '¿Cuánto cuesta Luma?',
                a: '$9.900 ARS por mes. Incluye acceso completo a todas las funciones: agenda, historial, página pública, finanzas y archivos. Podés cancelar cuando querás.'
              },
              {
                q: '¿Cómo funciona la prueba gratuita?',
                a: 'Tenés 7 días para explorar todo Luma sin ningún costo y sin tarjeta de crédito. Al vencer el período de prueba podés activar tu suscripción para seguir usando la plataforma.'
              },
              {
                q: 'Hubo un error al pagar con Mercado Pago',
                a: 'Verificá que tenés saldo o límite disponible en tu método de pago. Si el error persiste, escribinos a lumaapp.soporte@gmail.com con una captura del error.'
              },
              {
                q: '¿Cómo cancelo mi suscripción?',
                a: 'Escribinos a lumaapp.soporte@gmail.com y cancelamos tu suscripción en menos de 24 horas. Tus datos se mantienen guardados.'
              },
            ]
          },
          {
            categoria: 'Agenda y turnos',
            faqs: [
              {
                q: 'Agendé un turno pero no aparece en el dashboard',
                a: 'Verificá que la fecha seleccionada es correcta en el calendario del dashboard. Los turnos se muestran por día — usá las flechas para navegar entre días.'
              },
              {
                q: '¿Cómo configuro mi disponibilidad?',
                a: 'Andá a Ajustes → Disponibilidad. Ahí podés activar los días que trabajás y configurar tu horario de atención. Esto también afecta los turnos disponibles en tu página pública.'
              },
              {
                q: '¿Cómo borro un turno?',
                a: 'Abrí el turno desde el dashboard, hacé click en el ícono de papelera y confirmá la eliminación.'
              },
              {
                q: '¿Cómo muevo un turno a otra fecha?',
                a: 'Abrí el turno en el dashboard y hacé click en el ícono de lápiz. Podés cambiar la fecha y hora. El sistema te avisa si hay conflicto con otro turno.'
              },
              {
                q: '¿Y si ya no quiero recibir turnos?',
                a: 'Tenés dos opciones. La más rápida es ir a Agenda → Bloquear, elegir fecha de inicio y fin, y ese período deja de aparecer como disponible en tu página pública. Si querés pausar un servicio específico, andá a Servicios, editalo y desactivalo — va a desaparecer de tu página hasta que lo vuelvas a activar.'
              },
              {
                q: '¿Cómo activo las notificaciones de nuevas reservas?',
                a: `Para recibir una notificación en tu celular cada vez que alguien reserve, seguí estos pasos:

iOS (iPhone):
1. Abrí Luma en Safari
2. Tocá el ícono de compartir (el cuadrado con la flecha)
3. Elegí "Agregar a pantalla de inicio"
4. Abrí Luma desde el ícono que apareció en tu pantalla de inicio
5. Andá a Ajustes → activá "Recibir notificaciones de nuevas reservas"
6. Aceptá el permiso que aparece en pantalla

Android:
1. Abrí Luma en Chrome
2. Tocá los tres puntos del menú
3. Elegí "Agregar a pantalla de inicio" o "Instalar app"
4. Abrí Luma desde el ícono que apareció en tu pantalla de inicio
5. Andá a Ajustes → activá "Recibir notificaciones de nuevas reservas"
6. Aceptá el permiso que aparece en pantalla`
              },
            ]
          },
          {
            categoria: 'Página pública',
            faqs: [
              {
                q: '¿Cómo activo mi página pública?',
                a: 'Andá a Ajustes → Página pública y activá el toggle "Página activa". También podés personalizar tu mensaje de bienvenida, template y servicios visibles.'
              },
              {
                q: 'Mi página pública no muestra los servicios',
                a: 'Verificá que tus servicios estén marcados como "activos" en la sección Servicios. También asegurate de tener disponibilidad configurada en Ajustes.'
              },
              {
                q: '¿Cómo integro Mercado Pago en mi página?',
                a: `Para conectar Mercado Pago con Luma necesitás obtener tu Access Token de producción. Estos son los pasos:

1. Entrá a tu cuenta de Mercado Pago y andá a la sección Integraciones.
2. Si no tenés ninguna aplicación creada, hacé click en "Crear aplicación". Te va a pedir verificar tu cuenta y elegir un nombre.
3. Seleccioná "Pagos online", luego "A través de una plataforma" y cuando te pregunte cuál, elegí "Otra" y escribí Luma. Podés agregar el link de tu página pública o dejarlo vacío.
4. Una vez creada la app, andá al apartado "Credenciales de producción" en el menú de la aplicación. Ahí vas a ver tu Access Token real — las credenciales de prueba no funcionan para cobrar.
5. Copiá el Access Token y pegalo en Luma: Ajustes → Página pública → Mercado Pago. Activá el toggle y elegí si querés cobrar seña o el total.

Si ya tenés una aplicación creada, simplemente entrá a ella, seleccioná "Credenciales de producción" y copiá el Access Token.

Para gestionar los medios de pago y las comisiones, andá en Mercado Pago a Negocio → Costos y cuotas → Checkout. Desde ahí podés configurar qué métodos aceptás y cómo se distribuyen los costos por cobro.`
              },
              {
                q: '¿Cómo activo el pago por transferencia bancaria?',
                a: 'Andá a Ajustes → Página pública → Transferencia bancaria. Activá el toggle y completá al menos tu alias. También podés agregar CBU, titular, banco e instrucciones adicionales. Una vez activado, tus consultantes van a poder elegir entre Mercado Pago y transferencia al momento de reservar.'
              },
              {
                q: '¿Dónde encuentro el link de mi página?',
                a: 'En Ajustes → Página pública vas a ver el link completo para compartir. También podés copiarlo directamente desde ahí.'
              },
            ]
          },
          {
            categoria: 'Privacidad y seguridad',
            faqs: [
              {
                q: '¿Dónde se guardan mis datos y los de mis consultantes?',
                a: 'Todos los datos se almacenan en servidores seguros con cifrado en tránsito (HTTPS) y en reposo. Cada cuenta solo puede acceder a sus propios datos.'
              },
              {
                q: '¿Luma puede ver el historial de mis consultantes?',
                a: 'No. El contenido de tu trabajo — notas, contextos de sesión y archivos — es de uso exclusivo tuyo. Luma no accede, lee ni analiza ese contenido.'
              },
              {
                q: '¿Cómo elimino mi cuenta?',
                a: 'Escribinos a lumaapp.soporte@gmail.com y eliminamos tu cuenta y todos tus datos en menos de 48 horas.'
              },
            ]
          },
        ].map((seccion, si) => (
          <div key={si} className="ay-section" id={seccion.categoria === 'Agenda y turnos' ? 'notificaciones' : undefined}>
            <div className="ay-section-title">{seccion.categoria}</div>
            {seccion.faqs.map((faq, fi) => (
              <details key={fi} className="ay-faq">
                <summary className="ay-faq-q">
                  {faq.q}
                  <span className="ay-faq-icon">+</span>
                </summary>
                <div className="ay-faq-a">{faq.a}</div>
              </details>
            ))}
          </div>
        ))}

        <div className="ay-contact">
          <div className="ay-contact-title">¿No encontraste lo que buscabas?</div>
          <p className="ay-contact-sub">
            Escribinos y te respondemos en menos de 24 horas.<br/>
            También podés escribirnos si encontraste un error o querés sugerir algo.
          </p>
          <a href="mailto:lumaapp.soporte@gmail.com" className="ay-contact-btn">
            Escribir a soporte
          </a>
        </div>

        <hr className="ay-divider"/>

        <div className="ay-footer">
          © 2026 Luma · <a href="/dashboard">Volver al dashboard</a> · <a href="/politica-de-privacidad">Política de privacidad</a>
        </div>
      </div>
    </>
  )
}