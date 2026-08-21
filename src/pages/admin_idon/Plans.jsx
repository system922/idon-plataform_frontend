import React from 'react';
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
    bgColor: 'rgba(245, 158, 11, 0.12)',
    features: [
      'Facturación electrónica SRI',
      'Soporte técnico incluido',
      'Capacitación para uso de la plataforma',
      'Punto de venta (POS)',
      'Gestión de productos',
      'Gestión de Inventario',
      'Gestión de clientes y ventas',
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
    bgColor: 'rgba(59, 130, 246, 0.12)',
    features: [
      'Facturación electrónica SRI',
      'Soporte técnico incluido',
      'Capacitación para uso de la plataforma',
      'Punto de venta (POS)',
      'Gestión de productos',
      'Gestión de Inventario',
      'Gestión de clientes (CRM básico)',
      'Cupones y promociones básicas',
      'Reportes de ventas y ganancias'
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
    bgColor: 'rgba(34, 197, 94, 0.12)',
    features: [
      'Facturación electrónica SRI',
      'Soporte técnico incluido',
      'Capacitación para uso de la plataforma',
      'Gestión de cultivos y cosechas',
      'Control de inventario agrícola',
      'Registro de traslado de productos',
      'Registro de costos por cultivo',
      'Trazabilidad de productos',
      'Reportes básicos de producción y ventas'
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
    bgColor: 'rgba(139, 92, 246, 0.12)',
    features: [
      'Facturación electrónica SRI',
      'Soporte prioritario incluido',
      'Capacitación para uso de la plataforma',
      'Gestión de inventario avanzado',
      'Punto de venta (POS)',
      'CRM Clientes avanzado',
      'Campañas de email',
      'Gestión de colaboradores',
      'Reportes avanzados',
      'Análisis de productos',
      'Gestión de proveedores'
    ]
  }
];

export default function Plans() {
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
            <div key={plan.id} className="plan-card">
              <div 
                className="plan-card-icon" 
                style={{ 
                  background: plan.bgColor, 
                  color: plan.color,
                  borderColor: plan.color
                }}
              >
                {plan.icon}
              </div>
              
              <h3 className="plan-card-title">{plan.name}</h3>
              <p className="plan-card-subtitle">{plan.description}</p>
              
              <div className="plan-card-price">
                <span className="plan-price-amount">${plan.price_monthly.toFixed(2)}</span>
                <span className="plan-price-period">/ mes</span>
              </div>
              
              <div className="plan-card-features">
                <span className="plan-features-title">Características incluidas:</span>
                <ul className="plan-features-list">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="plan-feature-item">
                      <FiCheck size={14} className="plan-feature-check" style={{ color: plan.color }} />
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