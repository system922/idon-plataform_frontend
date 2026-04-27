import React from 'react';
import { FiLayout } from 'react-icons/fi';
import '../../styles/AdminPages.css';

export default function Templates() {
  const templates = [
    { id: 1, name: 'Plantilla Básica', description: 'Estructura básica para nuevos proyectos', status: 'Activa' },
    { id: 2, name: 'Plantilla Premium', description: 'Plantilla con todas las características', status: 'Activa' },
    { id: 3, name: 'Plantilla Custom', description: 'Plantilla personalizable', status: 'Activa' },
  ];

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Plantillas</h1>
        <p className="admin-page-subtitle">Gestiona las plantillas disponibles del sistema</p>
      </div>

      <div className="admin-grid admin-grid-3">
        {templates.map((template) => (
          <div key={template.id} className="admin-card">
            <div className="admin-card-header">
              <h3>{template.name}</h3>
            </div>
            <div className="admin-card-body">
              <p style={{ color: 'var(--admin-text-secondary)', marginBottom: '12px' }}>
                {template.description}
              </p>
              <span className="admin-badge admin-badge-success">
                {template.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
