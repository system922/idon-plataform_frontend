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
              Al acceder y utilizar IDON ("el Servicio"), aceptas estar vinculado por estos Términos y Condiciones. IDON se reserva el derecho de modificar estos términos en cualquier momento. Tu uso continuado del Servicio después de tales modificaciones constituye tu aceptación de los términos modificados.
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
              Si tienes preguntas sobre estos Términos y Condiciones, contáctanos directamente:
            </p>
            <div className="contact-info">
              <p><strong>IDON PLATAFORM — by SYSTEM DESIGN</strong></p>
              <p>Respuesta rápida por WhatsApp:</p>
              <a
                href="https://wa.link/jhxo9m"
                target="_blank"
                rel="noopener noreferrer"
                className="contact-wa"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Contactar por WhatsApp
              </a>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
