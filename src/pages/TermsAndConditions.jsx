import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import '../styles/LegalPages.css';

export default function TermsAndConditions() {
  const navigate = useNavigate();

  return (
    <div className="legal-page">
      <header className="legal-header">
        <button 
          className="legal-back" 
          type="button" 
          onClick={() => navigate(-1)}
          title="Volver atrás"
        >
          <FiArrowLeft /> Volver
        </button>
        <h1>Términos y Condiciones</h1>
        <span className="legal-date">Última actualización: {new Date().toLocaleDateString('es-ES')}</span>
      </header>

      <main className="legal-content">
        <div className="legal-wrapper">
          {/* Aceptación de Términos */}
          <section className="legal-section">
            <h2>1. Aceptación de Términos</h2>
            <p>
              Al acceder y utilizar IDON ("el Servicio"), aceptas estar vinculado por estos Términos y Condiciones. Si no aceptas estos términos, no debes utilizar el Servicio. IDON se reserva el derecho de modificar estos términos en cualquier momento. Tu uso continuado del Servicio después de tales modificaciones constituye tu aceptación de los términos modificados.
            </p>
          </section>

          {/* Descripción del Servicio */}
          <section className="legal-section">
            <h2>2. Descripción del Servicio</h2>
            <p>
              IDON es un Sistema Integral de Gestión de Negocios ("IDON") que proporciona herramientas para:
            </p>
            <ul>
              <li>Gestión de múltiples sucursales empresariales</li>
              <li>Administración de usuarios y permisos</li>
              <li>Gestión de inventario y productos</li>
              <li>Procesamiento de ventas y transacciones</li>
              <li>Generación de reportes y análisis</li>
              <li>Auditoría e historial de transacciones</li>
              <li>Facturación Electrónica con autorización del SRI</li>
            </ul>
            <p>
              El Servicio se proporciona "TAL CUAL" y IDON se reserva el derecho de modificar, suspender o discontinuar cualquier aspecto del Servicio en cualquier momento.
            </p>
          </section>

          {/* Licencia de Uso */}
          <section className="legal-section">
            <h2>3. Licencia de Uso</h2>
            <p>
              IDON te otorga una licencia limitada, no exclusiva, revocable e intransferible para utilizar el Servicio. Esta licencia no te permite:
            </p>
            <ul>
              <li>Copiar, modificar o crear obras derivadas del Servicio</li>
              <li>Decodificar, descompilar o intentar obtener el código fuente</li>
              <li>Transferir tu acceso a terceros</li>
              <li>Utilizarlo para fines ilegales o no autorizados</li>
              <li>Acceder sin autorización o exceder los límites de acceso permitidos</li>
            </ul>
          </section>

          {/* Cuenta de Usuario */}
          <section className="legal-section">
            <h2>4. Cuenta de Usuario y Responsabilidades</h2>
            <h3>4.1 Creación de Cuenta</h3>
            <p>
              Para utilizar IDON, debes crear una cuenta proporcionando información precisa y completa. Eres responsable de mantener la confidencialidad de tu contraseña y de todas las actividades que ocurran bajo tu cuenta.
            </p>

            <h3>4.2 Tus Responsabilidades</h3>
            <ul>
              <li>Mantener la confidencialidad de tu contraseña y tokens de acceso</li>
              <li>Notificar inmediatamente cualquier acceso no autorizado</li>
              <li>Proporcionar información precisa y veraz</li>
              <li>Cumplir con todas las leyes aplicables</li>
              <li>No participar en actividades fraudulentas o maliciosas</li>
            </ul>

            <h3>4.3 Suspensión de Cuenta</h3>
            <p>
              IDON se reserva el derecho de suspender o cancelar tu cuenta si:
            </p>
            <ul>
              <li>Violas estos Términos y Condiciones</li>
              <li>Participas en actividades fraudulentas o ilegales</li>
              <li>No cumples con pagos requeridos</li>
              <li>Incumples nuestras políticas de seguridad</li>
            </ul>
          </section>

          {/* Contenido del Usuario */}
          <section className="legal-section">
            <h2>5. Contenido y Datos del Usuario</h2>
            <h3>5.1 Propiedad del Contenido</h3>
            <p>
              Retienes todos los derechos sobre los datos e información que cargas en IDON. Al utilizar el Servicio, nos otorgas una licencia para almacenar, procesar y utilizar tus datos para proporcionar el Servicio.
            </p>

            <h3>5.2 Acceso Autorizado</h3>
            <p>
              Todo acceso a tus datos está sujeto a tu configuración de permisos. IDON no compartirá tus datos con terceros sin tu consentimiento, excepto como se describe en nuestra Política de Privacidad.
            </p>

            <h3>5.3 Backup y Recuperación</h3>
            <p>
              IDON realiza backups regulares, pero no somos responsables de la pérdida de datos. Se recomienda mantener copias de seguridad de tus datos importantes.
            </p>
          </section>

          {/* Limitación de Responsabilidad */}
          <section className="legal-section">
            <h2>6. Limitación de Responsabilidad</h2>
            <p>
              EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEY, IDON NO SERÁ RESPONSABLE POR:
            </p>
            <ul>
              <li>Daños indirectos, especiales, consecuentes o punitivos</li>
              <li>Pérdida de datos, ingresos o ganancias</li>
              <li>Interrupción del servicio o indisponibilidad</li>
              <li>Errores o inexactitudes en la funcionalidad</li>
              <li>Pérdida de acceso a tu cuenta</li>
            </ul>
            <p>
              La responsabilidad total de IDON no excederá el monto que pagaste por el Servicio en los últimos 12 meses.
            </p>
          </section>

          {/* Descargo de Responsabilidad */}
          <section className="legal-section">
            <h2>7. Descargo de Responsabilidad</h2>
            <p>
              EL SERVICIO SE PROPORCIONA "TAL CUAL" SIN GARANTÍAS DE NINGÚN TIPO, EXPRESAS O IMPLÍCITAS, INCLUYENDO PERO NO LIMITADO A:
            </p>
            <ul>
              <li>Garantías de comerciabilidad</li>
              <li>Garantías de aptitud para un propósito particular</li>
              <li>Garantías de no infracción</li>
              <li>Garantías de precisión o integridad de datos</li>
            </ul>
            <p>
              IDON no garantiza que el Servicio será ininterrumpido, seguro o libre de errores.
            </p>
          </section>

          {/* Uso Aceptable */}
          <section className="legal-section">
            <h2>8. Política de Uso Aceptable</h2>
            <p>
              No debes utilizar IDON para:
            </p>
            <ul>
              <li>Infringir derechos de propiedad intelectual o privacidad</li>
              <li>Transmitir código malicioso o virus</li>
              <li>Participar en phishing, suplantación de identidad o fraude</li>
              <li>Realizar hackeos, ataques de denegación de servicio o pruebas de seguridad no autorizadas</li>
              <li>Violar leyes, regulaciones o derechos de terceros</li>
              <li>Acoso, abuso, discriminación o contenido ofensivo</li>
              <li>Vender, transferir o licenciar tu acceso</li>
            </ul>
          </section>

          {/* Seguridad */}
          <section className="legal-section">
            <h2>9. Obligaciones de Seguridad</h2>
            <p>
              Mientras IDON implementa medidas de seguridad razonables, ambas partes tienen responsabilidades:
            </p>
            <ul>
              <li>Mantener contraseñas fuertes y cambiarlas regularmente</li>
              <li>Desconectarse al terminar sesiones</li>
              <li>Reportar acceso no autorizado inmediatamente</li>
              <li>Utilizar conexiones seguras (SSL/HTTPS)</li>
              <li>Mantener tu dispositivo actualizado y protegido</li>
            </ul>
          </section>

          {/* Propiedad Intelectual */}
          <section className="legal-section">
            <h2>10. Propiedad Intelectual</h2>
            <p>
              La plataforma IDON, incluyendo su código, diseño, y características, está protegida por derechos de autor y propiedad intelectual. Todos los derechos reservados.
            </p>
            <p>
              <strong>Atribución:</strong> IDON fue diseñado y desarrollado por <strong>System Design Ec</strong>.
            </p>
          </section>

          {/* Precios y Pagos */}
          <section className="legal-section">
            <h2>11. Precios y Pagos</h2>
            <p>
              Los precios están sujetos a cambios con previo aviso. IDON se puede cambiar los precios con notificación previa. Los pagos son no reembolsables a menos que se especifique lo contrario.
            </p>
          </section>

          {/* Terminación */}
          <section className="legal-section">
            <h2>12. Terminación</h2>
            <p>
              Puedes cancelar tu cuenta en cualquier momento a través de los controles de tu cuenta. IDON se reserva el derecho de terminar tu acceso sin previo aviso por violación de estos Términos y Condiciones.
            </p>
            <p>
              Tras la terminación, tu acceso al Servicio será revocado y tus datos pueden ser eliminados según nuestra Política de Retención.
            </p>
          </section>

          {/* Cambios a Términos */}
          <section className="legal-section">
            <h2>13. Cambios a Estos Términos</h2>
            <p>
              IDON puede modificar estos Términos y Condiciones en cualquier momento. Los cambios serán efectivos cuando se publiquen. Tu uso continuado del Servicio después de tales cambios indica tu aceptación de los nuevos Términos.
            </p>
          </section>

          {/* Ley Aplicable */}
          <section className="legal-section">
            <h2>14. Ley Aplicable</h2>
            <p>
              Estos Términos y Condiciones se rigen por las leyes aplicables en la jurisdicción donde IDON opera, sin consideración de conflictos legales.
            </p>
          </section>

          {/* Contacto */}
          <section className="legal-section">
            <h2>15. Contacto</h2>
            <p>
              Si tienes preguntas sobre estos Términos y Condiciones, contacta con:
            </p>
            <div className="contact-info">
              <p><strong>IDON - Plataforma de Gestión Multinegocios</strong></p>
              <p>Soporte IDON: <a href="https://wa.link/ylxnbz">Contactar por WhatsApp</a></p>
              <p><strong>Diseñado y desarrollado por:</strong> System Design Ec</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
