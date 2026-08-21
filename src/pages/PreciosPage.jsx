import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import { CheckCircle } from 'lucide-react';

// Número de WhatsApp de IDON (formato internacional sin '+')
const WHATSAPP_NUMBER = '593987852907';

const PreciosPage = () => {
  // Estado para feedback visual al hacer clic en un plan
  const [clickedPlan, setClickedPlan] = useState(null);

  // Función que maneja el clic en el botón de WhatsApp
  const handleWhatsAppClick = (plan) => {
    setClickedPlan(plan);

    // Mensajes personalizados según el plan
    let message = '';
    switch (plan) {
      case 'artesano':
        message = 'Hola, estoy interesado en el plan *Artesano* de IDON ($10/mes). Me gustaría conocer más detalles sobre el punto de venta, la facturación SRI y el inventario básico.';
        break;
      case 'emprendedor':
        message = 'Hola, quiero información sobre el plan *Emprendedor* de IDON ($11/mes). Me interesa saber más sobre los descuentos, promociones y reportes avanzados.';
        break;
      case 'agricultor':
        message = 'Hola, estoy interesado en el plan *Agricultor* de IDON ($10/mes). Necesito detalles sobre el control de costos, la gestión de cultivos y el inventario agrícola.';
        break;
      case 'mipyme':
        message = 'Hola, quiero conocer más sobre el plan *MIPYME* de IDON ($12.50/mes). Me interesa la funcionalidad de inventario avanzado, las campañas de email y la gestión multicentros.';
        break;
      default:
        message = 'Hola, estoy interesado en conocer más sobre los planes de IDON.';
    }

    // Codificar el mensaje y abrir WhatsApp
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    // Restablecer el estado después de 3 segundos (para que el botón vuelva a su texto original)
    setTimeout(() => setClickedPlan(null), 3000);
  };

  return (
    <div className="landing-container">
      <PublicHeader />
      <main className="landing-main">
        <h1>Planes para todos los bolsillos</h1>
        <p className="lead">
          <strong>Tu negocio merece herramientas profesionales.</strong> Elige tu plan y descubre lo fácil que es gestionar tu negocio.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px,1fr))', gap: '2rem', margin: '3rem 0' }}>
          {/* PLAN ARTESANO */}
          <div className="feature-card-prices" style={{ textAlign: 'center' }}>
            <h3>Artesano</h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>$10<small style={{ fontSize: '1rem' }}>/mes</small></p>
            <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left' }}>
              <li><CheckCircle size={14} color="#10b981" /> Punto de venta (POS)</li>
              <li><CheckCircle size={14} color="#10b981" /> Facturación SRI</li>
              <li><CheckCircle size={14} color="#10b981" /> Inventario básico</li>
              <li><CheckCircle size={14} color="#10b981" /> Reportes básicos de ventas</li>
            </ul>
            <button
              onClick={() => handleWhatsAppClick('artesano')}
              className="cta-button-prices"
              style={{ marginTop: '1.5rem', display: 'inline-block', border: 'none', cursor: 'pointer' }}
            >
              {clickedPlan === 'artesano' ? 'Abriendo WhatsApp...' : 'Más información'}
            </button>
          </div>

          {/* PLAN EMPRENDEDOR */}
          <div className="feature-card-prices" style={{ textAlign: 'center' }}>
            <h3>Emprendedor</h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>$11<small style={{ fontSize: '1rem' }}>/mes</small></p>
            <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left' }}>
              <li><CheckCircle size={14} color="#10b981" /> Todo lo de Artesano</li>
              <li><CheckCircle size={14} color="#10b981" /> Descuentos y promociones</li>
              <li><CheckCircle size={14} color="#10b981" /> Reportes avanzados</li>
              <li><CheckCircle size={14} color="#10b981" /> Gestión de clientes</li>
            </ul>
            <button
              onClick={() => handleWhatsAppClick('emprendedor')}
              className="cta-button-prices"
              style={{ marginTop: '1.5rem', display: 'inline-block', border: 'none', cursor: 'pointer' }}
            >
              {clickedPlan === 'emprendedor' ? 'Abriendo WhatsApp...' : 'Más información'}
            </button>
          </div>

          {/* PLAN AGRICULTOR */}
          <div className="feature-card-prices" style={{ textAlign: 'center' }}>
            <h3>Agricultor</h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>$10<small style={{ fontSize: '1rem' }}>/mes</small></p>
            <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left' }}>
              <li><CheckCircle size={14} color="#10b981" /> Facturación SRI</li>
              <li><CheckCircle size={14} color="#10b981" /> Control de costos</li>
              <li><CheckCircle size={14} color="#10b981" /> Gestión de cultivos y cosechas</li>
              <li><CheckCircle size={14} color="#10b981" /> Control de inventario agrícola</li>
            </ul>
            <button
              onClick={() => handleWhatsAppClick('agricultor')}
              className="cta-button-prices"
              style={{ marginTop: '1.5rem', display: 'inline-block', border: 'none', cursor: 'pointer' }}
            >
              {clickedPlan === 'agricultor' ? 'Abriendo WhatsApp...' : 'Más información'}
            </button>
          </div>

          {/* PLAN MIPYME */}
          <div className="feature-card-prices" style={{ textAlign: 'center' }}>
            <h3>MIPYME</h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>$12.50<small style={{ fontSize: '1rem' }}>/mes</small></p>
            <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left' }}>
              <li><CheckCircle size={14} color="#10b981" /> Todo lo del plan emprendedor</li>
              <li><CheckCircle size={14} color="#10b981" /> Inventario avanzado</li>
              <li><CheckCircle size={14} color="#10b981" /> Campañas de email</li>
              <li><CheckCircle size={14} color="#10b981" /> Gestión multicentros</li>
            </ul>
            <button
              onClick={() => handleWhatsAppClick('mipyme')}
              className="cta-button-prices"
              style={{ marginTop: '1.5rem', display: 'inline-block', border: 'none', cursor: 'pointer' }}
            >
              {clickedPlan === 'mipyme' ? 'Abriendo WhatsApp...' : 'Más información'}
            </button>
          </div>
        </div>

        {/* Comparativa de ahorro */}
        <div className="audience-section" style={{ background: 'var(--bg-primary)' }}>
          <h2>¿Por qué IDON es la mejor inversión?</h2>
          <p>
            <strong>Herramientas por separado te costarían más de $80/mes.</strong> Con IDON lo tienes 
            <strong> TODO desde $10/mes</strong>. ¡Ahorra hasta $70 al mes!
          </p>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            <li><CheckCircle size={16} color="#10b981" /> Soporte incluido</li>
            <li><CheckCircle size={16} color="#10b981" /> Capacitación para uso de la plataforma</li>
            <li><CheckCircle size={16} color="#10b981" /> Actualizaciones automáticas</li>
            <li><CheckCircle size={16} color="#10b981" /> Sin penalizaciones por cancelación</li>
          </ul>
        </div>

        <div className="cta-section" style={{ marginTop: '2rem' }}>
          <h2>¡El momento es ahora!</h2>
          <p>Regístrate en 5 minutos desde tu celular. Sin papeles, sin complicaciones.</p>
          <Link to="/login" className="cta-button">Regístrate ahora</Link>
        </div>
      </main>
    </div>
  );
};

export default PreciosPage;