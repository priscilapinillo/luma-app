export default function PoliticaPrivacidad() {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500;600&display=swap');
          *{box-sizing:border-box;margin:0;padding:0}
          body{background:#F0EEFF;font-family:'Jost',sans-serif;color:#1A1035}
          .pp-wrap{max-width:720px;margin:0 auto;padding:60px 24px 80px}
          .pp-logo{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:300;color:#8B5CF6;letter-spacing:4px;text-transform:uppercase;margin-bottom:48px;display:block}
          .pp-title{font-family:'Cormorant Garamond',serif;font-size:42px;font-weight:300;color:#1A1035;margin-bottom:8px;line-height:1.1}
          .pp-date{font-size:12px;color:#9B8EC4;letter-spacing:2px;text-transform:uppercase;margin-bottom:48px;display:block}
          .pp-section{margin-bottom:36px}
          .pp-h2{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:400;color:#4C1D95;margin-bottom:12px}
          .pp-p{font-size:14px;line-height:1.9;color:#4A3F6B;margin-bottom:12px}
          .pp-ul{padding-left:20px;margin-bottom:12px}
          .pp-ul li{font-size:14px;line-height:1.9;color:#4A3F6B;margin-bottom:4px}
          .pp-divider{border:none;border-top:0.5px solid rgba(139,92,246,0.2);margin:32px 0}
          .pp-footer{font-size:12px;color:#9B8EC4;text-align:center;margin-top:48px}
          .pp-footer a{color:#8B5CF6;text-decoration:none}
        `}</style>
  
        <div className="pp-wrap">
          <a href="/" className="pp-logo">Luma</a>
  
          <h1 className="pp-title">Política de Privacidad</h1>
          <span className="pp-date">Última actualización: Mayo 2025</span>
  
          <div className="pp-section">
            <p className="pp-p">
              En Luma nos tomamos muy en serio la privacidad de las personas que usan nuestra plataforma. Esta política explica qué datos recopilamos, cómo los usamos y cómo los protegemos.
            </p>
          </div>
  
          <hr className="pp-divider"/>
  
          <div className="pp-section">
            <h2 className="pp-h2">1. Quiénes somos</h2>
            <p className="pp-p">
              Luma es una plataforma SaaS diseñada para terapeutas, tarotistas y profesionales del bienestar. Permite gestionar clientes, sesiones, pagos y comunicaciones en un solo lugar.
            </p>
          </div>
  
          <div className="pp-section">
            <h2 className="pp-h2">2. Qué datos recopilamos</h2>
            <p className="pp-p">Recopilamos los siguientes datos según el tipo de usuario:</p>
            <p className="pp-p"><strong>Profesionales (terapeutas):</strong></p>
            <ul className="pp-ul">
              <li>Nombre, email y contraseña al registrarse</li>
              <li>Información de perfil profesional</li>
              <li>Datos de configuración de su práctica</li>
              <li>Información de pagos procesados a través de Mercado Pago</li>
            </ul>
            <p className="pp-p"><strong>Consultantes (pacientes/clientes):</strong></p>
            <ul className="pp-ul">
              <li>Nombre y número de contacto ingresados por el profesional</li>
              <li>Historial de sesiones y notas de contexto</li>
              <li>Archivos subidos en el marco de la relación terapéutica</li>
            </ul>
          </div>
  
          <div className="pp-section">
            <h2 className="pp-h2">3. Cómo usamos los datos</h2>
            <ul className="pp-ul">
              <li>Para brindar el servicio de gestión de práctica profesional</li>
              <li>Para procesar pagos a través de Mercado Pago</li>
              <li>Para mejorar la plataforma y corregir errores</li>
              <li>Para enviar comunicaciones relacionadas con el servicio</li>
            </ul>
            <p className="pp-p">No vendemos ni compartimos datos personales con terceros con fines comerciales.</p>
          </div>
  
          <div className="pp-section">
            <h2 className="pp-h2">4. Confidencialidad del historial clínico</h2>
            <p className="pp-p">
              Las notas, contextos de sesión y archivos cargados en Luma son de uso exclusivo del profesional que los carga. Luma no accede, lee ni analiza el contenido clínico de las sesiones. Este contenido es responsabilidad del profesional y debe manejarse conforme a la ética y legislación de su práctica.
            </p>
          </div>
  
          <div className="pp-section">
            <h2 className="pp-h2">5. Almacenamiento y seguridad</h2>
            <ul className="pp-ul">
              <li>Los datos se almacenan en Supabase con cifrado en tránsito (HTTPS) y en reposo</li>
              <li>El acceso a los datos está protegido por políticas de Row Level Security (RLS)</li>
              <li>Cada profesional solo puede acceder a sus propios datos</li>
              <li>Los archivos se almacenan en buckets privados con acceso controlado</li>
            </ul>
          </div>
  
          <div className="pp-section">
            <h2 className="pp-h2">6. Tus derechos</h2>
            <p className="pp-p">Podés ejercer los siguientes derechos en cualquier momento:</p>
            <ul className="pp-ul">
              <li>Acceder a tus datos personales</li>
              <li>Solicitar la corrección de datos incorrectos</li>
              <li>Solicitar la eliminación de tu cuenta y datos</li>
              <li>Exportar tu información</li>
            </ul>
            <p className="pp-p">Para ejercer cualquiera de estos derechos escribinos a <strong>soporte@luma.app</strong></p>
          </div>
  
          <div className="pp-section">
            <h2 className="pp-h2">7. Cookies</h2>
            <p className="pp-p">
              Luma usa cookies únicamente para mantener la sesión iniciada. No usamos cookies de seguimiento ni publicidad.
            </p>
          </div>
  
          <div className="pp-section">
            <h2 className="pp-h2">8. Cambios en esta política</h2>
            <p className="pp-p">
              Podemos actualizar esta política ocasionalmente. Si hay cambios importantes te avisaremos por email. El uso continuado de Luma implica aceptación de la política vigente.
            </p>
          </div>
  
          <div className="pp-section">
            <h2 className="pp-h2">9. Contacto</h2>
            <p className="pp-p">
              Para cualquier consulta sobre privacidad escribinos a <strong>soporte@luma.app</strong>
            </p>
          </div>
  
          <hr className="pp-divider"/>
  
          <div className="pp-footer">
            © 2025 Luma · <a href="/auth/login">Volver a Luma</a>
          </div>
        </div>
      </>
    )
  }