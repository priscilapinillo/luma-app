export default function AyudaPage() {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500;600&display=swap');
          *{box-sizing:border-box;margin:0;padding:0}
          body{background:#F0EEFF;font-family:'Jost',sans-serif;color:#1A1035}
          .ay-wrap{max-width:760px;margin:0 auto;padding:60px 24px 80px}
          .ay-logo{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:300;color:#8B5CF6;letter-spacing:4px;text-transform:uppercase;margin-bottom:48px;display:block;text-decoration:none}
          .ay-title{font-family:'Cormorant Garamond',serif;font-size:42px;font-weight:300;color:#1A1035;margin-bottom:8px}
          .ay-sub{font-size:14px;color:#9B8EC4;margin-bottom:48px;line-height:1.7}
          .ay-section{margin-bottom:40px}
          .ay-section-title{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:400;color:#4C1D95;margin-bottom:16px;padding-bottom:8px;border-bottom:0.5px solid rgba(139,92,246,0.2)}
          .ay-faq{margin-bottom:12px;border-radius:12px;border:0.5px solid rgba(139,92,246,0.15);overflow:hidden;background:white}
          .ay-faq-q{padding:14px 18px;font-size:14px;font-weight:500;color:#1A1035;cursor:pointer;display:flex;justify-content:space-between;align-items:center;user-select:none}
          .ay-faq-q:hover{background:#FAF8FF}
          .ay-faq-icon{font-size:18px;color:#8B5CF6;transition:transform 0.2s;flex-shrink:0}
          .ay-faq-a{padding:0 18px 14px;font-size:13px;color:#4A3F6B;line-height:1.8}
          .ay-contact{background:linear-gradient(135deg,#F4F0FF,#EDE8FF);border-radius:20px;padding:32px;text-align:center;margin-top:48px;border:0.5px solid rgba(139,92,246,0.2)}
          .ay-contact-title{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:300;color:#1A1035;margin-bottom:8px}
          .ay-contact-sub{font-size:13px;color:#7C6BAA;margin-bottom:20px;line-height:1.7}
          .ay-contact-btn{display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#7C3AED,#8B5CF6);color:white;border-radius:50px;font-size:13px;font-weight:500;text-decoration:none;letter-spacing:1px;box-shadow:0 6px 20px rgba(124,58,237,0.3)}
          .ay-divider{border:none;border-top:0.5px solid rgba(139,92,246,0.15);margin:32px 0}
          .ay-footer{font-size:12px;color:#9B8EC4;text-align:center;margin-top:32px}
          .ay-footer a{color:#8B5CF6;text-decoration:none}
        `}</style>
  
        <div className="ay-wrap">
          <a href="/dashboard" className="ay-logo">Luma</a>
  
          <h1 className="ay-title">Centro de ayuda</h1>
          <p className="ay-sub">
            Encontrá respuestas a las preguntas más frecuentes.<br/>
            Si no encontrás lo que buscás, escribinos.
          </p>
  
          {[
            {
              categoria: '🔐 Cuenta y acceso',
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
              categoria: '💳 Pagos y suscripción',
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
              categoria: '📅 Agenda y turnos',
              faqs: [
                {
                  q: 'Agendé un turno pero no aparece en el dashboard',
                  a: 'Verificá que la fecha seleccionada es correcta en el calendario del dashboard. Los turnos se muestran por día — usá el buscador para encontrar un turno por nombre de paciente.'
                },
                {
                  q: '¿Cómo configuro mi disponibilidad?',
                  a: 'Andá a Ajustes → Disponibilidad. Ahí podés activar los días que trabajás y configurar tu horario de atención. Esto también afecta los turnos disponibles en tu página pública.'
                },
                {
                  q: 'No puedo borrar un turno',
                  a: 'Abrí el turno desde el dashboard, hacé click en el ícono de papelera y confirmá la eliminación. Si aparece un error, escribinos.'
                },
                {
                  q: '¿Cómo muevo un turno a otra fecha?',
                  a: 'Abrí el turno en el dashboard y hacé click en el ícono de lápiz. Podés cambiar la fecha y hora. El sistema te avisa si hay conflicto con otro turno.'
                },
              ]
            },
            {
              categoria: '🌐 Página pública',
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
                  a: 'Andá a Ajustes → Página pública → Mercado Pago. Pegá tu Access Token de producción y activá el toggle. Podés elegir entre cobrar seña o pago completo.'
                },
                {
                  q: '¿Dónde encuentro el link de mi página?',
                  a: 'En Ajustes → Página pública vas a ver el link completo para compartir. También podés copiarlo directamente desde ahí.'
                },
              ]
            },
            {
              categoria: '📱 Uso en celular',
              faqs: [
                {
                  q: 'La transcripción de voz no funciona en mi celular',
                  a: 'La transcripción de voz funciona en Safari en iPhone y Chrome en Android. En otros navegadores mobile no está disponible por limitaciones del sistema operativo.'
                },
                {
                  q: 'Se hace zoom cuando toco un campo de texto',
                  a: 'Esto puede pasar en versiones anteriores de Luma. Si actualizás la página (hard refresh) debería resolverse. Si persiste escribinos.'
                },
              ]
            },
            {
              categoria: '🔒 Privacidad y seguridad',
              faqs: [
                {
                  q: '¿Dónde se guardan mis datos y los de mis pacientes?',
                  a: 'Todos los datos se almacenan en servidores seguros de Supabase con cifrado en tránsito (HTTPS) y en reposo. Cada cuenta solo puede acceder a sus propios datos.'
                },
                {
                  q: '¿Luma puede ver el historial de mis pacientes?',
                  a: 'No. El contenido clínico — notas, contextos de sesión y archivos — es de uso exclusivo tuyo. Luma no accede, lee ni analiza ese contenido.'
                },
                {
                  q: '¿Cómo elimino mi cuenta?',
                  a: 'Escribinos a lumaapp.soporte@gmail.com y eliminamos tu cuenta y todos tus datos en menos de 48 horas.'
                },
              ]
            },
          ].map((seccion, si) => (
            <div key={si} className="ay-section">
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
              ✦ Escribir a soporte
            </a>
          </div>
  
          <hr className="ay-divider"/>
  
          <div className="ay-footer">
            © 2025 Luma · <a href="/dashboard">Volver al dashboard</a> · <a href="/politica-de-privacidad">Política de privacidad</a>
          </div>
        </div>
      </>
    )
  }