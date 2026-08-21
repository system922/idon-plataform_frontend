// components/Odontologia/Plantillas/PlantillaTable.jsx
import React from 'react';
import { FiEdit, FiTrash2, FiEye, FiCopy, FiClock, FiAlertCircle, FiRefreshCw, FiPlus } from 'react-icons/fi';

export default function PlantillaTable({ 
  plantillas, 
  onEdit, 
  onDelete, 
  onView, 
  onDuplicate,
  loading 
}) {
  // Si está cargando, mostrar mensaje de carga
  if (loading) {
    return (
      <div className="odonto-table-container">
        <div className="odonto-empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div className="odonto-loading-spinner" style={{ marginBottom: '12px' }}>
            <FiRefreshCw size={32} className="spin" />
          </div>
          <p>Cargando plantillas...</p>
        </div>
      </div>
    );
  }

  // Si no hay plantillas, mostrar mensaje amigable
  if (!plantillas || plantillas.length === 0) {
    return (
      <div className="odonto-table-container">
        <div className="odonto-empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <h3 style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>No hay plantillas registradas</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
            Crea tu primera plantilla de receta para agilizar la prescripción de medicamentos.
          </p>
          <button 
            className="odonto-btn-primary" 
            onClick={() => {
              if (window.onAddPlantilla) window.onAddPlantilla();
            }}
          >
            <FiPlus size={18} /> Crear primera plantilla
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="odonto-table-container">
      <table className="odonto-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Medicamentos</th>
            <th>Duración</th>
            <th>Advertencia</th>
            <th className="center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {plantillas.map(p => {
            // Obtener lista de medicamentos de la plantilla
            const medicamentosList = p.medicamentos?.map(m => {
              // Usar medicamento_nombre si existe, si no usar name
              const nombre = m.medicamento_nombre || m.name || '';
              // Agregar dosis si existe
              const dosis = m.dosis_especifica || m.dosage || '';
              return dosis ? `${nombre} (${dosis})` : nombre;
            }).filter(Boolean).join(', ') || '—';

            const totalMedicamentos = p.medicamentos?.length || 0;

            return (
              <tr key={p.id}>
                <td>
                  <span className="odonto-name" style={{ fontWeight: 600 }}>{p.nombre}</span>
                  {p.descripcion && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {p.descripcion}
                    </div>
                  )}
                </td>
                <td>
                  <div className="odonto-medicamentos-cell">
                    <span style={{ fontSize: '13px' }}>{medicamentosList}</span>
                    {totalMedicamentos > 1 && (
                      <span className="odonto-med-count">+{totalMedicamentos - 1}</span>
                    )}
                  </div>
                </td>
                <td>
                  {p.duracion ? (
                    <span className="odonto-badge odonto-badge-info">
                      <FiClock size={12} style={{ marginRight: 4 }} /> {p.duracion}
                    </span>
                  ) : (
                    <span className="odonto-expiry-none">—</span>
                  )}
                </td>
                <td>
                  {p.advertencias || p.warning ? (
                    <span className="odonto-badge odonto-badge-warning" title={p.advertencias || p.warning}>
                      <FiAlertCircle size={12} style={{ marginRight: 4 }} /> Sí
                    </span>
                  ) : (
                    <span className="odonto-expiry-none">—</span>
                  )}
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
                      className="odonto-btn-icon duplicate" 
                      onClick={() => onDuplicate(p)}
                      title="Duplicar"
                    >
                      <FiCopy size={14} />
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
        Mostrando {plantillas.length} plantillas
      </div>
    </div>
  );
}