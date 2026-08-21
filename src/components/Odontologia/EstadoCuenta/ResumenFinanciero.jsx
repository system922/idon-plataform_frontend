// components/Odontologia/EstadoCuenta/components/ResumenFinanciero.jsx

import React from 'react';
import { fmt } from '../../../utils/helpers';

const ResumenFinanciero = ({ summary, currencySymbol }) => (
  <div className="odonto-stats-grid">
    <div className="odonto-stat-card">
      <div className="odonto-stat-info">
        <div className="odonto-stat-value">{summary.totalPlanes}</div>
        <div className="odonto-stat-label">Total Planes</div>
      </div>
    </div>
    <div className="odonto-stat-card">
      <div className="odonto-stat-info">
        <div className="odonto-stat-value">{fmt(currencySymbol, summary.totalPresupuestos)}</div>
        <div className="odonto-stat-label">Total Presupuestos</div>
      </div>
    </div>
    <div className="odonto-stat-card">
      <div className="odonto-stat-info">
        <div className="odonto-stat-value" style={{ color: 'var(--primary)' }}>{fmt(currencySymbol, summary.totalPagado)}</div>
        <div className="odonto-stat-label">Pagado</div>
      </div>
    </div>
    <div className="odonto-stat-card">
      <div className="odonto-stat-info">
        <div className="odonto-stat-value" style={{ color: 'var(--warning)' }}>{fmt(currencySymbol, summary.totalPendiente)}</div>
        <div className="odonto-stat-label">Por pagar</div>
      </div>
    </div>
  </div>
);

export default ResumenFinanciero;