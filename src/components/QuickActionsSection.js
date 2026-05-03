// components/QuickActionsSection.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiFileText, FiDollarSign, FiTrendingUp, FiPlus, FiBell } from 'react-icons/fi';

export default function QuickActionsSection() {
  const navigate = useNavigate();

  return (
    <div className="dashboard-quick-actions">
      <h3>Acciones Rápidas</h3>
      <div className="action-buttons">
        <button className="action-btn quick" onClick={() => navigate('/app/inventory/inventory.products')}>
          <FiFileText /> Inventario
        </button>
        <button className="action-btn quick" onClick={() => navigate('/app/purchases')}>
          <FiDollarSign /> Compras
        </button>
        <button className="action-btn quick" onClick={() => navigate('/app/pos/pos.sales')}>
          <FiTrendingUp /> Ventas
        </button>
        <button className="action-btn quick" onClick={() => navigate('/app/reports/reports.dashboard')}>
          <FiTrendingUp /> Reportes
        </button>
        <button className="action-btn quick" onClick={() => navigate('/app/orders/orders.create')}>
          <FiPlus /> Nueva Orden
        </button>
        <button className="action-btn quick" onClick={() => navigate('/app/core/core.audit_log')}>
          <FiBell /> Auditoría
        </button>
      </div>
    </div>
  );
}