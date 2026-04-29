/**
 * GenericFeaturePage.jsx
 * Ubicación: src/pages/business/GenericFeaturePage.jsx
 * Página genérica placeholder para módulos y funcionalidades.
 * Se usa hasta que cada página tenga su implementación real.
 */
import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { FiTool, FiArrowLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

// Mapeo de códigos de módulo a nombre legible
const MODULE_NAMES = {
  core:          'Núcleo',
  pos:           'Punto de Venta',
  inventory:     'Inventario',
  reports:       'Reportes',
  payments:      'Pagos',
  accounting:    'Contabilidad',
  orders:        'Gestión de Órdenes',
  kitchen:       'Cocina',
  delivery:      'Delivery',
  tables:        'Mesas',
  reservations:  'Reservas',
  loyalty:       'Fidelización',
  suppliers:     'Proveedores',
  purchases:     'Compras',
  appointments:  'Citas',
  employees:     'Empleados',
  crm:           'CRM Clientes',
  routes:        'Rutas',
  tracking:      'Tracking',
  queue:         'Cola de Atención',
  ecommerce:     'E-commerce',
  notifications: 'Notificaciones',
  einvoicing:    'Facturación Electrónica',
};

// Convierte código snake_case a "Texto Legible"
const codeToLabel = (code = '') =>
  code.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function GenericFeaturePage({ moduleName, featureName }) {
  const { feature }  = useParams();
  const navigate     = useNavigate();
  const location     = useLocation();

  // Determinar el módulo desde la ruta /app/{module}/{feature}
  const pathParts  = location.pathname.split('/').filter(Boolean); // ['app', 'pos', 'ventas']
  const moduleCode = pathParts[1] || '';
  const featCode   = feature || pathParts[2] || '';

  const modLabel  = moduleName  || MODULE_NAMES[moduleCode] || codeToLabel(moduleCode);
  const featLabel = featureName || codeToLabel(featCode);
  const isGeneral = !featCode || featCode === moduleCode;

  return (
    <div style={{ maxWidth: 700 }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 13, color: 'rgba(255,255,255,.4)' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.4)', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
        >
          <FiArrowLeft size={14}/> Atrás
        </button>
        <span>·</span>
        <span>{modLabel}</span>
        {!isGeneral && <><span>·</span><span style={{ color: '#ff8c42' }}>{featLabel}</span></>}
      </div>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 800, color: '#fff' }}>
          {isGeneral ? modLabel : featLabel}
        </h1>
        {!isGeneral && (
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,.4)' }}>
            Módulo: {modLabel}
          </p>
        )}
      </div>

      {/* Placeholder */}
      <div style={{
        background: 'rgba(255,255,255,.03)', border: '1px dashed rgba(255,140,66,.3)',
        borderRadius: 16, padding: '48px 40px', textAlign: 'center',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16, margin: '0 auto 20px',
          background: 'rgba(255,140,66,.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff8c42',
        }}>
          <FiTool size={28}/>
        </div>
        <h2 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 700, color: '#fff' }}>
          {isGeneral ? modLabel : featLabel}
        </h2>
        <p style={{ margin: '0 0 6px', color: 'rgba(255,255,255,.45)', fontSize: 14 }}>
          Esta sección está en construcción.
        </p>
        <p style={{ margin: 0, color: 'rgba(255,255,255,.25)', fontSize: 12 }}>
          Ruta: {location.pathname}
        </p>
      </div>
    </div>
  );
}
