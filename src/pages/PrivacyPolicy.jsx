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
        <h1>Privacy Policy</h1>
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
              Si tienes preguntas sobre esta Política de Privacidad o nuestras prácticas de privacidad, por favor contacta con:
            </p>
            <div className="contact-info">
              <p><strong>IDON - Sistema Integral de Gestión de Negocios</strong></p>
              <p>Email: <a href="mailto:privacy@idon.com">privacy@idon.com</a></p>
              <p>Sitio Web: <a href="https://idon.com" target="_blank" rel="noopener noreferrer">www.idon.com</a></p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
