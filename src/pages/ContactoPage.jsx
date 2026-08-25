// src/pages/ContactoPage.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import { CheckCircle, Mail, Phone, MapPin, Globe } from 'lucide-react';

// Número de WhatsApp (formato internacional sin '+')
const WHATSAPP_NUMBER = '593987852907';

const ContactoPage = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    mensaje: ''
  });
  const [isSending, setIsSending] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSending(true);

    // Construir el mensaje para WhatsApp
    const { nombre, email, mensaje } = formData;
    const whatsappMessage = `Hola, soy ${nombre || 'un cliente interesado'}.
Mi correo es: ${email || 'no especificado'}.
Mensaje: ${mensaje || 'Me gustaría recibir más información sobre IDON.'}

¡Espero su respuesta!`;

    // Codificar y abrir WhatsApp
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(url, '_blank');

    // Resetear estado después de un momento
    setTimeout(() => {
      setIsSending(false);
      setFormData({ nombre: '', email: '', mensaje: '' });
    }, 3000);
  };

  return (
    <div className="landing-container">
      <PublicHeader />
      <main className="landing-main">
        <div className="contact-container">
          {/* Título y subtítulo */}
          <h1>Contáctanos</h1>
          <p className="lead">
            <strong>Estamos aquí para ayudarte a transformar tu negocio. </strong> 
            Escríbenos y en breve uno de nuestros asesores se pondrá en contacto contigo.
          </p>

          {/* Grid de contacto (2 columnas) */}
          <div className="contact-grid">
            {/* Columna izquierda: Información de contacto */}
            <div className="contact-card">
              <h2>
                <Mail size={24} />
                Información de contacto
              </h2>
              <ul className="contact-info-list">
                <li>
                  <Phone size={20} />
                  <strong>Teléfono:</strong>
                  <a href="tel:0987852907">+593 987852907</a>
                </li>
                <li>
                  <Mail size={20} />
                  <strong>Email:</strong>
                  <a href="mailto:soporte@idonplataform.site">soporte@idonplataform.site</a>
                </li>
                <li>
                  <Globe size={20} />
                  <strong>Web:</strong>
                  <a href="https://www.idonplataform.site" target="_blank" rel="noopener noreferrer">
                    www.idonplataform.site
                  </a>
                </li>
                <li>
                  <MapPin size={20} />
                  <strong>Ubicación:</strong>
                  Santo Domingo, Ecuador
                </li>
              </ul>
              <div className="contact-badge">
                <CheckCircle size={16} />
                <span>Nos contactaremos contigo lo más pronto posible.</span>
              </div>
            </div>

            {/* Columna derecha: Formulario de contacto */}
            <div className="contact-card">
              <h2>
                <Mail size={24} />
                Envíanos un mensaje
              </h2>
              <form onSubmit={handleSubmit} className="contact-form">
                <input
                  type="text"
                  name="nombre"
                  placeholder="Tu nombre completo"
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Tu correo electrónico"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                <textarea
                  name="mensaje"
                  placeholder="¿En qué podemos ayudarte? Cuéntanos sobre tu negocio y tus necesidades."
                  rows="5"
                  value={formData.mensaje}
                  onChange={handleChange}
                  required
                />
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={isSending}
                >
                  {isSending ? 'Enviando...' : 'Enviar mensaje por WhatsApp'}
                </button>
                <p className="form-note">
                  Al enviar, se abrirá WhatsApp con tu mensaje pre-escrito. Solo debes confirmar el envío.
                </p>
              </form>
            </div>
          </div>

          {/* Sección de confianza: WhatsApp directo */}
          <div className="contact-trust">
            <h2>¿Prefieres hablar directamente?</h2>
            <p>
              También puedes llamarnos o escribirnos por WhatsApp. Estamos disponibles de lunes a viernes de 8:00 a 18:00.
            </p>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola, me gustaría recibir asesoría sobre IDON.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp"
            >
              <Phone size={18} />
              WhatsApp
            </a>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ContactoPage;