import React from 'react';
import PageTemplate from '../../components/PageTemplate';
import { FiCreditCard } from 'react-icons/fi';
import '../../styles/AdminPages.css';

export default function Plans() {
  const plans = [
    { id: 1, name: 'Starter', price: '$29/mes', features: ['Básico', 'Hasta 5 usuarios', 'Soporte por email'] },
    { id: 2, name: 'Professional', price: '$99/mes', features: ['Completo', 'Hasta 50 usuarios', 'Soporte prioritario', 'API'] },
    { id: 3, name: 'Enterprise', price: 'Personalizado', features: ['Todo incluido', 'Usuarios ilimitados', 'Soporte 24/7', 'SLA'] },
  ];

  return (
    <PageTemplate theme="admin" title="Planes de Suscripción" subtitle="Gestiona los planes disponibles en el sistema" loading={false} error={null}>
      <div className="admin-grid admin-grid-3">
        {plans.map((plan) => (
          <div key={plan.id} className="admin-card">
            <div className="admin-card-header">
              <h3>{plan.name}</h3>
            </div>
            <div className="admin-card-body">
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--admin-orange)', marginBottom: '16px' }}>
                {plan.price}
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {plan.features.map((feature, idx) => (
                  <li key={idx} style={{ fontSize: '13px', color: 'var(--admin-text-secondary)' }}>
                    ✓ {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </PageTemplate>
  );
}
