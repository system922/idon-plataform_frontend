import React, { useRef, useEffect } from 'react';
import PageTemplate from '../../components/PageTemplate';
import {
  FiAward, FiTrendingUp, FiPackage, FiUsers,
  FiCheck
} from 'react-icons/fi';
import '../../styles/Plans.css';

const PLANS = [
  {
    id: 1,
    name: 'Artesano con Acuerdo Ministerial',
    code: 'artesano',
    price_monthly: 10.00,
    price_annual: 100.00,
    description: 'Plan especial para artesanos con acuerdo ministerial',
    icon: <FiAward size={35} />,
    color: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.25)',
    bgColor: 'rgba(245, 158, 11, 0.12)',
    features: [
      'Facturación electrónica SRI',
      'Punto de venta (POS)',
      'Gestión de Inventario',
      'Reportes básicos de ventas'
    ]
  },
  {
    id: 2,
    name: 'Emprendedor',
    code: 'emprendedor',
    price_monthly: 11.00,
    price_annual: 110.00,
    description: 'Plan ideal para emprendedores que inician su negocio',
    icon: <FiTrendingUp size={35} />,
    color: '#3b82f6',
    glowColor: 'rgba(59, 130, 246, 0.25)',
    bgColor: 'rgba(59, 130, 246, 0.12)',
    features: [
      'Todo lo de Artesano',
      'Descuentos y promociones',
      'Gestión de clientes',
      'Reportes Avanzados'
    ]
  },
  {
    id: 3,
    name: 'Agricultor',
    code: 'agricultor',
    price_monthly: 10.00,
    price_annual: 100.00,
    description: 'Plan diseñado para el sector agrícola',
    icon: <FiPackage size={35} />,
    color: '#22c55e',
    glowColor: 'rgba(34, 197, 94, 0.25)',
    bgColor: 'rgba(34, 197, 94, 0.12)',
    features: [
      'Control de costos',
      'Facturación electrónica SRI',
      'Gestión de cultivos y cosechas',
      'Control de inventario agrícola',
      
    ]
  },
  {
    id: 4,
    name: 'MIPYME',
    code: 'mipymes',
    price_monthly: 12.50,
    price_annual: 125.00,
    description: 'Plan completo para pequeñas y medianas empresas',
    icon: <FiUsers size={35} />,
    color: '#8b5cf6',
    glowColor: 'rgba(139, 92, 246, 0.25)',
    bgColor: 'rgba(139, 92, 246, 0.12)',
    features: [
      'Todo lo del plan emprendedor',
      'Inventario avanzado',
      'Inventario avanzado',
      'Gestión multicentros',
    ]
  }
];

export default function Plans() {
  const cardRefs = useRef({});

  useEffect(() => {
    const handleMouseMove = (e) => {
      Object.keys(cardRefs.current).forEach((id) => {
        const card = cardRefs.current[id];
        if (card && card.contains(e.target)) {
          const rect = card.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          card.style.setProperty('--mouse-x', `${x}%`);
          card.style.setProperty('--mouse-y', `${y}%`);
        }
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <PageTemplate
      title="PLANES IDON"
      subtitle="Conoce nuestros planes y elige el que mejor se adapte a tu negocio"
      theme="admin"
      loading={false}
      error={null}
    >
      <div className="plans-container">
        <div className="plans-grid">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              ref={(el) => (cardRefs.current[plan.id] = el)}
              className="plan-card"
              style={{
                '--color': plan.color,
                '--glow-shadow': plan.glowColor,
                '--glow-color': plan.glowColor,
                '--bg-card-hover': '#1a1a2e',
                '--border-color': 'rgba(255,255,255,0.1)',
                '--border-hover': plan.color,
              }}
            >
              {/* Efectos de luz */}
              <div className="light-ray"></div>
              <div className="glow-effect"></div>

              {/* Icono */}
              <div
                className="plan-card-icon"
                style={{
                  background: plan.bgColor,
                  color: plan.color,
                  borderColor: plan.color,
                }}
              >
                {plan.icon}
              </div>

              {/* Título */}
              <h3 className="plan-card-title">{plan.name}</h3>
              <p className="plan-card-subtitle">{plan.description}</p>

              {/* Precio */}
              <div className="plan-card-price">
                <span className="plan-price-amount">${plan.price_monthly.toFixed(2)}</span>
                <span className="plan-price-period">/ mes</span>
              </div>

              {/* Características */}
              <div className="plan-card-features">
                <span className="plan-features-title">Características incluidas:</span>
                <ul className="plan-features-list">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="plan-feature-item">
                      <FiCheck size={16} className="plan-feature-check" style={{ color: plan.color }} />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageTemplate>
  );
}