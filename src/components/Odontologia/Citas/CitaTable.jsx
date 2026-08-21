// components/Odontologia/Citas/CitaTable.jsx
import React from 'react';
import { FiEdit, FiTrash2, FiEye, FiUser, FiClock, FiCalendar, FiCheck, FiX } from 'react-icons/fi';

export default function CitaTable({ 
  citas, 
  onEdit, 
  onDelete, 
  onView, 
  loading 
}) {
  const getStatusBadge = (status) => {
    const map = {
      scheduled: { label: 'Programada', class: 'scheduled' },
      confirmed: { label: 'Confirmada', class: 'confirmed' },
      in_progress: { label: 'En curso', class: 'in-progress' },
      completed: { label: 'Completada', class: 'completed' },
      cancelled: { label: 'Cancelada', class: 'cancelled' },
      no_show: { label: 'No asistió', class: 'no-show' }
    };
    return map[status] || map.scheduled;
  };

  const getStatusColor = (status) => {
    const map = {
      scheduled: '#facc15',
      confirmed: '#4ade80',
      in_progress: '#3b82f6',
      completed: '#9ca3af',
      cancelled: '#ef4444',
      no_show: '#f59e0b'
    };
    return map[status] || '#9ca3af';
  };

  return (
    <div className="odonto-table-container">
      <table className="odonto-table">
        <thead>
          <tr>
            <th>Paciente</th>
            <th>Odontólogo</th>
            <th>Tratamiento</th>
            <th>Fecha/Hora</th>
            <th>Duración</th>
            <th>Estado</th>
            <th className="center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {citas?.length > 0 ? (
            citas.map(c => {
              const statusBadge = getStatusBadge(c.status);
              const color = getStatusColor(c.status);
              const fecha = new Date(c.scheduled_for);
              
              return (
                <tr key={c.id}>
                  <td>
                    <div className="odonto-cell-with-avatar">
                      <FiUser size={14} style={{ color: 'var(--text-muted)' }} />
                      <span>{c.paciente_nombre || '—'}</span>
                    </div>
                  </td>
                  <td>{c.odontologo_nombre || '—'}</td>
                  <td>{c.treatment_name || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 500 }}>
                        {fecha.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {fecha.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </td>
                  <td>{c.duration_minutes || 30} min</td>
                  <td>
                    <span 
                      className={`odonto-badge-status ${statusBadge.class}`}
                      style={{ 
                        backgroundColor: color + '22',
                        color: color,
                        border: `1px solid ${color}33`
                      }}
                    >
                      {statusBadge.label}
                    </span>
                  </td>
                  <td className="center">
                    <div className="odonto-actions">
                      <button 
                        className="odonto-btn-icon view" 
                        onClick={() => onView(c)}
                        title="Ver detalles"
                      >
                        <FiEye size={14} />
                      </button>
                      <button 
                        className="odonto-btn-icon edit" 
                        onClick={() => onEdit(c)}
                        title="Editar"
                      >
                        <FiEdit size={14} />
                      </button>
                      <button 
                        className="odonto-btn-icon delete" 
                        onClick={() => onDelete(c.id)}
                        title="Eliminar"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="7" className="odonto-empty-state">
                {loading ? 'Cargando...' : 'No hay citas registradas'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}