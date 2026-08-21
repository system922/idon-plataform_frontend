// components/Odontologia/Planes/PlanTable.jsx
import React from 'react';
import { FiEdit, FiTrash2, FiEye, FiUser, FiDollarSign, FiLayers } from 'react-icons/fi';

export default function PlanTable({ 
  planes, 
  onEdit, 
  onDelete, 
  onView, 
  loading 
}) {
  const getStatusBadge = (status) => {
    const map = {
      draft: { label: 'Borrador', class: 'draft' },
      active: { label: 'Activo', class: 'active' },
      completed: { label: 'Completado', class: 'completed' },
      cancelled: { label: 'Cancelado', class: 'cancelled' }
    };
    return map[status] || map.draft;
  };

  const getFaseLabel = (fase) => {
    const map = {
      inicial: 'Inicial',
      evolucion: 'Evolución',
      alta: 'Alta'
    };
    return map[fase] || fase || 'Sin fase';
  };

  if (loading) {
    return (
      <div className="odonto-table-container">
        <div className="odonto-empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <p>Cargando planes...</p>
        </div>
      </div>
    );
  }

  if (!planes || planes.length === 0) {
    return (
      <div className="odonto-table-container">
        <div className="odonto-empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <h3 style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>No hay planes registrados</h3>
          <p style={{ color: 'var(--text-muted)' }}>Crea tu primer plan de tratamiento</p>
        </div>
      </div>
    );
  }

  return (
    <div className="odonto-table-container">
      <table className="odonto-table">
        <thead>
          <tr>
            <th>Nombre del Plan</th>
            <th>Paciente</th>
            <th className="center">Fase</th>
            <th className="center">Costo Total</th>
            <th className="center">Estado</th>
            <th className="center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {planes.map(p => {
            const statusBadge = getStatusBadge(p.status);
            
            return (
              <tr key={p.id}>
                <td>
                  <span className="odonto-name" style={{ fontWeight: 600 }}>{p.name}</span>
                  {p.description && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {p.description}
                    </div>
                  )}
                </td>
                <td>
                  <div className="odonto-cell-with-avatar">
                    <FiUser size={14} style={{ color: 'var(--text-muted)' }} />
                    <span>{p.paciente_nombre || '—'}</span>
                  </div>
                </td>
                <td className="center">
                  <span className="odonto-badge odonto-badge-info">
                    <FiLayers size={12} style={{ marginRight: 4 }} />
                    {getFaseLabel(p.fase)}
                  </span>
                </td>
                <td className="center">
                  <span className="odonto-precio" style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>
                    ${Number(p.total_cost).toFixed(2)}
                  </span>
                </td>
                <td className="center">
                  <span className={`odonto-badge-status ${statusBadge.class}`}>
                    {statusBadge.label}
                  </span>
                </td>
                <td className="center">
                  <div className="odonto-actions">
                    <button 
                      className="odonto-btn-icon view" 
                      onClick={() => onView(p)}
                      title="Ver detalles"
                    >
                      <FiEye size={14} />
                    </button>
                    <button 
                      className="odonto-btn-icon edit" 
                      onClick={() => onEdit(p)}
                      title="Editar"
                    >
                      <FiEdit size={14} />
                    </button>
                    <button 
                      className="odonto-btn-icon delete" 
                      onClick={() => onDelete(p.id)}
                      title="Eliminar"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="odonto-table-info">
        Mostrando {planes.length} planes
      </div>
    </div>
  );
}