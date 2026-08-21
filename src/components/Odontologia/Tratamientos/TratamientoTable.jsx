// components/Odontologia/Tratamientos/TratamientoTable.jsx
import React from 'react';
import { FiEdit, FiTrash2, FiEye, FiClock } from 'react-icons/fi';

export default function TratamientoTable({ 
  tratamientos, 
  onEdit, 
  onDelete, 
  onView, 
  loading 
}) {
  return (
    <div className="odonto-table-container">
      <table className="odonto-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Descripción</th>
            <th className="center">Duración (min)</th>
            <th className="center">Precio</th>
            <th className="center">Estado</th>
            <th className="center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {tratamientos?.length > 0 ? (
            tratamientos.map(t => (
              <tr key={t.id}>
                <td>
                  <span className="odonto-name">{t.name}</span>
                </td>
                <td>
                  {t.description || '—'}
                </td>
                <td className="center">
                  <span className="odonto-badge odonto-badge-info">
                    <FiClock size={12} /> {t.duration_minutes || 0} min
                  </span>
                </td>
                <td className="center">
                  <span className="odonto-precio">${Number(t.price).toFixed(2)}</span>
                </td>
                <td className="center">
                  <span className={`odonto-badge-status ${t.is_active ? 'active' : 'inactive'}`}>
                    {t.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="center">
                  <div className="odonto-actions">
                    <button 
                      className="odonto-btn-icon view" 
                      onClick={() => onView(t)}
                      title="Ver detalles"
                    >
                      <FiEye size={14} />
                    </button>
                    <button 
                      className="odonto-btn-icon edit" 
                      onClick={() => onEdit(t)}
                      title="Editar"
                    >
                      <FiEdit size={14} />
                    </button>
                    <button 
                      className="odonto-btn-icon delete" 
                      onClick={() => onDelete(t.id)}
                      title="Eliminar"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" className="odonto-empty-state">
                {loading ? 'Cargando...' : 'No hay tratamientos registrados'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}