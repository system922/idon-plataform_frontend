// components/Odontologia/Tratamientos/TratamientoDetailModal.jsx
import React from 'react';
import { 
  FiX, FiEdit, FiClock, FiDollarSign, 
  FiActivity, FiCheckCircle, FiXCircle,
  FiCalendar
} from 'react-icons/fi';

export default function TratamientoDetailModal({ 
  isOpen, 
  onClose, 
  tratamiento, 
  onEdit 
}) {
  if (!isOpen || !tratamiento) return null;

  const handleEditClick = () => {
    // Cerrar el modal de detalles
    onClose();
    // Abrir el modal de edición con los datos
    setTimeout(() => {
      onEdit(tratamiento);
    }, 100);
  };

  return (
    <div className="odonto-modal-overlay" onClick={onClose}>
      <div className="odonto-modal odonto-modal-detail" onClick={e => e.stopPropagation()}>
        {/* Header con gradiente azul */}
        <div className="odonto-detail-header blue">
          <div className="odonto-detail-header-profile">
            <div className="odonto-detail-avatar">
              <FiActivity size={32} color="rgba(255,255,255,0.8)" />
            </div>
            <div className="odonto-detail-info">
              <h2 className="odonto-detail-name">{tratamiento.name}</h2>
            </div>
          </div>
          <button className="odonto-modal-close" onClick={onClose} style={{ color: 'rgba(255,255,255,0.8)' }}>
            <FiX size={24} />
          </button>
        </div>

        {/* Body con scroll */}
        <div className="odonto-detail-body">
          {/* Descripción */}
          {tratamiento.description && (
            <div className="odonto-detail-section">
              <div className="odonto-detail-section-header">
                <span className="odonto-detail-section-title">📝 Descripción</span>
              </div>
              <p className="odonto-description-text">{tratamiento.description}</p>
            </div>
          )}

          {/* Grid de datos principales */}
          <div className="odonto-detail-section">
            <div className="odonto-detail-section-header">
              <span className="odonto-detail-section-title">📊 Información del Tratamiento</span>
            </div>
            <div className="odonto-detail-grid-two">
              <div className="odonto-detail-item">
                <div className="odonto-detail-label">
                  <FiClock size={16} />
                  <span>Duración</span>
                </div>
                <div className="odonto-detail-value">
                  {tratamiento.duration_minutes || 0} minutos
                </div>
              </div>

              <div className="odonto-detail-item">
                <div className="odonto-detail-label">
                  <FiDollarSign size={16} />
                  <span>Precio</span>
                </div>
                <div className="odonto-detail-value odonto-precio">
                  ${Number(tratamiento.price).toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Fechas */}
          {(tratamiento.created_at || tratamiento.updated_at) && (
            <div className="odonto-detail-section">
              <div className="odonto-detail-section-header">
                <span className="odonto-detail-section-title">📅 Fechas</span>
              </div>
              <div className="odonto-detail-grid-two">
                {tratamiento.created_at && (
                  <div className="odonto-detail-item">
                    <div className="odonto-detail-label">
                      <FiCalendar size={16} />
                      <span>Fecha de creación</span>
                    </div>
                    <div className="odonto-detail-value">
                      {new Date(tratamiento.created_at).toLocaleString()}
                    </div>
                  </div>
                )}

                {tratamiento.updated_at && tratamiento.created_at !== tratamiento.updated_at && (
                  <div className="odonto-detail-item">
                    <div className="odonto-detail-label">
                      <FiCalendar size={16} />
                      <span>Última actualización</span>
                    </div>
                    <div className="odonto-detail-value">
                      {new Date(tratamiento.updated_at).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="odonto-detail-actions" style={{
            display: 'flex',
            gap: '12px',
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '2px solid var(--border-color)',
            justifyContent: 'flex-end'
          }}>
            <button className="odonto-btn-secondary" onClick={onClose}>
              Cerrar
            </button>
            <button className="odonto-btn-primary" onClick={handleEditClick}>
              <FiEdit size={16} /> Editar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}