import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import '../styles/LegalPages.css';

export default function PrivacyPolicy() {
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
        <h1>Política de Privacidad</h1>
        <span className="legal-date">Última actualización: {new Date().toLocaleDateString('es-ES')}</span>
      </header>

      <main className="legal-content">
        <div className="legal-wrapper">
          {/* Introducción */}
          <section className="legal-section">
            <h2>1. Introducción</h2>
            <p>
              IDON ("nosotros", "nuestro", "la Empresa") se compromete a proteger tu privacidad. Esta Política de Privacidad explica cómo recopilamos, utilizamos, divulgamos y protegemos tu información cuando utilizas nuestro sistema de gestión de negocios.
            </p>
            <p>
              Por favor, lee esta política cuidadosamente. Si no estás de acuerdo con nuestras prácticas, por favor no utilices nuestros servicios.
            </p>
          </section>

          {/* Información que Recopilamos */}
          <section className="legal-section">
            <h2>2. Información que Recopilamos</h2>
            <h3>2.1 Información Proporcionada Directamente</h3>
            <ul>
              <li><strong>Información de Cuenta:</strong> nombre, correo electrónico, número de teléfono, dirección</li>
              <li><strong>Información de Negocio:</strong> nombre del negocio, tipo de industria, datos financieros asociados</li>
              <li><strong>Información de Pago:</strong> datos de tarjeta de crédito (procesados por terceros seguros)</li>
              <li><strong>Información de Comunicación:</strong> mensajes de soporte, comentarios, retroalimentación</li>
            </ul>

            <h3>2.2 Información Recopilada Automáticamente</h3>
            <ul>
              <li>Dirección IP y tipo de navegador</li>
              <li>Páginas visitadas y tiempo de permanencia</li>
              <li>Sistema operativo y dispositivo utilizado</li>
              <li>Cookies y tecnologías de seguimiento similares</li>
            </ul>
          </section>

          {/* Cómo Utilizamos tu Información */}
          <section className="legal-section">
            <h2>3. Cómo Utilizamos tu Información</h2>
            <p>Utilizamos la información recopilada para:</p>
            <ul>
              <li>Proporcionar, mantener y mejorar nuestros servicios</li>
              <li>Procesar transacciones y enviar confirmaciones relacionadas</li>
              <li>Responder a tus consultas y solicitudes de soporte</li>
              <li>Enviar actualizaciones sobre cambios en nuestros servicios</li>
              <li>Detectar y prevenir fraude o actividades no autorizadas</li>
              <li>Cumplir con obligaciones legales y regulatorias</li>
              <li>Realizar análisis y mejorar la experiencia del usuario</li>
            </ul>
          </section>

          {/* Seguridad */}
          <section className="legal-section">
            <h2>4. Seguridad de tus Datos</h2>
            <p>
              Implementamos medidas de seguridad técnicas, administrativas y físicas para proteger tu información personal contra el acceso no autorizado, alteración, divulgación o destrucción. Estas incluyen:
            </p>
            <ul>
              <li>Encriptación de datos en tránsito y en reposo (SSL/TLS)</li>
              <li>Autenticación segura con contraseñas hasheadas</li>
              <li>Acceso restringido a datos sensibles</li>
              <li>Auditorías de seguridad regulares</li>
              <li>Cumplimiento con estándares OWASP</li>
            </ul>
            <p>
              Sin embargo, ningún sistema de seguridad es 100% seguro. No podemos garantizar la seguridad absoluta de tu información.
            </p>
          </section>

          {/* Cookies */}
          <section className="legal-section">
            <h2>5. Cookies y Tecnologías de Seguimiento</h2>
            <p>
              IDON utiliza cookies y tecnologías similares para mejorar tu experiencia. Las cookies son pequeños archivos almacenados en tu dispositivo. Utilizamos:
            </p>
            <ul>
              <li><strong>Cookies Esenciales:</strong> para mantener sesiones y funcionalidad básica</li>
              <li><strong>Cookies de Rendimiento:</strong> para análisis y mejora de servicios</li>
              <li><strong>Cookies de Preferencias:</strong> para recordar tu configuración</li>
            </ul>
            <p>Puedes controlar las cookies a través de la configuración de tu navegador.</p>
          </section>

          {/* Compartir Información */}
          <section className="legal-section">
            <h2>6. Compartir tu Información</h2>
            <p>
              No vendemos, alquilamos ni compartimos tu información personal con terceros, excepto en los siguientes casos:
            </p>
            <ul>
              <li><strong>Proveedores de Servicios:</strong> terceros que ayudan a proporcionar nuestros servicios (procesamiento de pagos, hosting, análisis)</li>
              <li><strong>Cumplimiento Legal:</strong> cuando se requiera por ley o regulación</li>
              <li><strong>Protección de Derechos:</strong> para proteger nuestros derechos, privacidad, seguridad o propiedad</li>
              <li><strong>Consentimiento:</strong> cuando hemos obtenido tu consentimiento explícito</li>
            </ul>
          </section>

          {/* Retención de Datos */}
          <section className="legal-section">
            <h2>7. Retención de Datos</h2>
            <p>
              Retenemos tu información personal mientras tu cuenta esté activa o por el tiempo necesario para proporcionar nuestros servicios. Puedes solicitar la eliminación de tus datos en cualquier momento contactando a nuestro equipo de soporte.
            </p>
            <p>
              Algunos datos pueden retenerse más tiempo si es requerido por ley o para fines de seguridad/fraude.
            </p>
          </section>

          {/* Tus Derechos */}
          <section className="legal-section">
            <h2>8. Tus Derechos y Opciones</h2>
            <p>Dependiendo de tu ubicación, tienes derecho a:</p>
            <ul>
              <li><strong>Acceso:</strong> solicitar una copia de tus datos personales</li>
              <li><strong>Corrección:</strong> actualizar información inexacta o incompleta</li>
              <li><strong>Eliminación:</strong> solicitar la eliminación de tus datos ("derecho al olvido")</li>
              <li><strong>Restricción:</strong> limitar cómo utilizamos tus datos</li>
              <li><strong>Portabilidad:</strong> recibir tus datos en un formato portable</li>
              <li><strong>Oposición:</strong> objetar ciertos usos de tus datos</li>
            </ul>
            <p>
              Para ejercer estos derechos, contacta a privacy@idon.com.
            </p>
          </section>

          {/* Cambios en Política */}
          <section className="legal-section">
            <h2>9. Cambios a Esta Política</h2>
            <p>
              Nos reservamos el derecho de modificar esta Política de Privacidad en cualquier momento. Los cambios se publicarán en esta página y la fecha de "Última actualización" será modificada. Tu uso continuado de IDON después de los cambios constituye tu aceptación de la política revisada.
            </p>
          </section>

          {/* Contacto */}
          <section className="legal-section">
            <h2>10. Contacta con Nosotros</h2>
            <p>
              Si tienes preguntas sobre esta Política de Privacidad o nuestras prácticas de privacidad, contáctanos directamente:
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
