// components/Odontologia/Citas/CitaDetailModal.jsx
import React from 'react';
import { 
  FiX, FiEdit, FiClock, FiUser, FiCalendar, 
  FiActivity, FiCheckCircle, FiXCircle, FiUserCheck,
  FiDollarSign, FiTrash2, FiVolume2
} from 'react-icons/fi';

export default function CitaDetailModal({ 
  isOpen, 
  onClose, 
  cita, 
  onEdit,
  onAtender,
  onLlamar,
  onStatusChange,
  onDelete
}) {
  if (!isOpen || !cita) return null;

  const getStatusBadge = (status) => {
    const map = {
      scheduled: { label: 'Programada', class: 'scheduled', icon: <FiClock size={16} /> },
      confirmed: { label: 'Confirmada', class: 'confirmed', icon: <FiCheckCircle size={16} /> },
      in_progress: { label: 'En curso', class: 'in-progress', icon: <FiActivity size={16} /> },
      completed: { label: 'Completada', class: 'completed', icon: <FiCheckCircle size={16} /> },
      cancelled: { label: 'Cancelada', class: 'cancelled', icon: <FiXCircle size={16} /> },
      no_show: { label: 'No asistió', class: 'no-show', icon: <FiXCircle size={16} /> }
    };
    return map[status] || map.scheduled;
  };

  const statusBadge = getStatusBadge(cita.status);

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('es-EC', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (time) => {
    if (!time) return '—';
    return time.slice(0, 5);
  };

  return (
    <div className="odonto-modal-overlay" onClick={onClose}>
      <div className="odonto-modal odonto-modal-detail" onClick={e => e.stopPropagation()}>
        <div className="odonto-modal-header blue">
          <div>
            <h3>Detalles de la Cita</h3>
            <p>{cita.paciente_nombre || 'Paciente'}</p>
          </div>
          <button className="odonto-modal-close" onClick={onClose}>
            <FiX size={24} />
          </button>
        </div>

        <div className="odonto-modal-body odonto-detail-body">
          <div className="odonto-detail-header-info" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '2px solid #e2e8f0'
          }}>
            <div className="odonto-detail-name-title" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <FiCalendar size={20} style={{ color: '#2563eb' }} />
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                Cita Odontológica
              </h2>
            </div>
            <span className={`odonto-badge-status ${statusBadge.class}`} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 14px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600
            }}>
              {statusBadge.icon}
              {statusBadge.label}
            </span>
          </div>

          <div className="odonto-detail-section">
            <div className="odonto-detail-section-header">
              <FiUser className="odonto-detail-section-icon" />
              <h4 className="odonto-detail-section-title">Información del Paciente</h4>
            </div>
            <div className="odonto-detail-grid-two">
              <div className="odonto-detail-item">
                <label className="odonto-detail-label">Nombre</label>
                <span className="odonto-detail-value">{cita.paciente_nombre || '—'}</span>
              </div>
              <div className="odonto-detail-item">
                <label className="odonto-detail-label">Documento</label>
                <span className="odonto-detail-value">{cita.document_number || '—'}</span>
              </div>
              <div className="odonto-detail-item">
                <label className="odonto-detail-label">Teléfono</label>
                <span className="odonto-detail-value">{cita.phone || '—'}</span>
              </div>
              <div className="odonto-detail-item">
                <label className="odonto-detail-label">Email</label>
                <span className="odonto-detail-value">{cita.email || '—'}</span>
              </div>
            </div>
          </div>

          <div className="odonto-detail-section">
            <div className="odonto-detail-section-header">
              <FiClock className="odonto-detail-section-icon" />
              <h4 className="odonto-detail-section-title">Detalles de la Cita</h4>
            </div>
            <div className="odonto-detail-grid-three">
              <div className="odonto-detail-item">
                <label className="odonto-detail-label">
                  <FiCalendar size={14} style={{ marginRight: 4 }} />
                  Fecha
                </label>
                <span className="odonto-detail-value">{formatDate(cita.fecha)}</span>
              </div>
              <div className="odonto-detail-item">
                <label className="odonto-detail-label">
                  <FiClock size={14} style={{ marginRight: 4 }} />
                  Hora
                </label>
                <span className="odonto-detail-value">{formatTime(cita.hora_inicio)} - {formatTime(cita.hora_fin)}</span>
              </div>
              <div className="odonto-detail-item">
                <label className="odonto-detail-label">
                  <FiActivity size={14} style={{ marginRight: 4 }} />
                  Duración
                </label>
                <span className="odonto-detail-value">{cita.duracion || 30} min</span>
              </div>
            </div>
          </div>

          <div className="odonto-detail-section">
            <div className="odonto-detail-section-header">
              <FiUserCheck className="odonto-detail-section-icon" />
              <h4 className="odonto-detail-section-title">Profesional y Tratamiento</h4>
            </div>
            <div className="odonto-detail-grid-two">
              <div className="odonto-detail-item">
                <label className="odonto-detail-label">Especialista</label>
                <span className="odonto-detail-value">{cita.especialista_nombre || '—'}</span>
                {cita.especialidad && (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{cita.especialidad}</span>
                )}
              </div>
              <div className="odonto-detail-item">
                <label className="odonto-detail-label">Tratamiento</label>
                <span className="odonto-detail-value">{cita.tratamiento_nombre || '—'}</span>
                {cita.price && (
                  <span style={{ fontSize: '12px', color: 'var(--primary-dark)' }}>
                    <FiDollarSign size={12} style={{ display: 'inline', marginRight: 2 }} />
                    {cita.price}
                  </span>
                )}
              </div>
            </div>
          </div>

          {(cita.motivo_nombre || cita.notas) && (
            <div className="odonto-detail-section">
              <div className="odonto-detail-section-header">
                <FiActivity className="odonto-detail-section-icon" />
                <h4 className="odonto-detail-section-title">Motivo y Notas</h4>
              </div>
              <div className="odonto-detail-grid">
                {cita.motivo_nombre && (
                  <div className="odonto-detail-item">
                    <label className="odonto-detail-label">Motivo</label>
                    <span className="odonto-detail-value">{cita.motivo_nombre}</span>
                  </div>
                )}
                {cita.notas && (
                  <div className="odonto-detail-item full-width">
                    <label className="odonto-detail-label">Notas</label>
                    <p className="odonto-description-text" style={{ margin: 0 }}>{cita.notas}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="odonto-detail-actions" style={{
            display: 'flex',
            gap: '10px',
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid #e2e8f0',
            flexWrap: 'wrap'
          }}>
            <button className="odonto-btn-secondary" onClick={onClose}>
              Cerrar
            </button>
            
            {cita.status !== 'completed' && cita.status !== 'cancelled' && (
              <>
                <button 
                  className="odonto-btn-secondary" 
                  onClick={() => onLlamar(cita)}
                  style={{ color: 'var(--primary)' }}
                >
                  <FiVolume2 size={16} style={{ marginRight: 6 }} /> Llamar
                </button>
                <button 
                  className="odonto-btn-secondary" 
                  onClick={() => onAtender(cita)}
                  style={{ color: 'var(--info)' }}
                >
                  <FiUserCheck size={16} style={{ marginRight: 6 }} /> Atender
                </button>
                <button 
                  className="odonto-btn-secondary" 
                  onClick={() => onStatusChange(cita.id, 'confirmed')}
                  style={{ color: 'var(--primary)' }}
                >
                  <FiCheckCircle size={16} style={{ marginRight: 6 }} /> Confirmar
                </button>
                <button 
                  className="odonto-btn-secondary" 
                  onClick={() => onStatusChange(cita.id, 'completed')}
                  style={{ color: 'var(--success)' }}
                >
                  <FiCheckCircle size={16} style={{ marginRight: 6 }} /> Completar
                </button>
              </>
            )}
            
            {cita.status !== 'cancelled' && (
              <button 
                className="odonto-btn-secondary" 
                onClick={() => {
                  if (window.confirm('¿Está seguro de cancelar esta cita?')) {
                    onStatusChange(cita.id, 'cancelled');
                    onClose();
                  }
                }}
                style={{ color: 'var(--danger)' }}
              >
                <FiXCircle size={16} style={{ marginRight: 6 }} /> Cancelar
              </button>
            )}
            
            <button 
              className="odonto-btn-primary" 
              onClick={() => { onEdit(cita); onClose(); }}
            >
              <FiEdit size={16} style={{ marginRight: 6 }} /> Editar
            </button>
            
            <button 
              className="odonto-btn-secondary" 
              onClick={() => { 
                if (window.confirm('¿Está seguro de eliminar esta cita?')) {
                  onDelete(cita.id);
                  onClose();
                }
              }}
              style={{ color: 'var(--danger)' }}
            >
              <FiTrash2 size={16} style={{ marginRight: 6 }} /> Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}