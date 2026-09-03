// components/Odontologia/Citas/CitaDetailModal.jsx
import React from 'react';
import {
  FiX,
  FiClock,
  FiUser,
  FiCalendar,
  FiActivity,
  FiCheckCircle,
  FiXCircle,
  FiUserCheck,
  FiDollarSign
} from 'react-icons/fi';
import Modal from '../../General/Modal';
import { IconTextButton, ButtonGroup } from '../../General/Button';

export default function CitaDetailModal({
  isOpen,
  onClose,
  cita
}) {
  if (!isOpen || !cita) return null;

  const getStatusBadge = (status) => {
    const map = {
      scheduled: { label: 'Programada', class: 'scheduled', icon: <FiClock size={14} /> },
      confirmed: { label: 'Confirmada', class: 'confirmed', icon: <FiCheckCircle size={14} /> },
      in_progress: { label: 'En curso', class: 'in-progress', icon: <FiActivity size={14} /> },
      completed: { label: 'Completada', class: 'completed', icon: <FiCheckCircle size={14} /> },
      cancelled: { label: 'Cancelada', class: 'cancelled', icon: <FiXCircle size={14} /> },
      no_show: { label: 'No asistió', class: 'no-show', icon: <FiXCircle size={14} /> }
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

  const modalContent = (
    <>
      {/* Header Info */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '2px solid #e2e8f0'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <FiCalendar size={20} style={{ color: '#2563eb' }} />
          <h2 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 700,
            color: '#0f172a'
          }}>
            Cita Odontológica
          </h2>
        </div>
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 14px',
          borderRadius: '20px',
          fontSize: '13px',
          fontWeight: 600,
          background: statusBadge.class === 'scheduled' ? '#dbeafe' : 
                     statusBadge.class === 'confirmed' ? '#d1fae5' :
                     statusBadge.class === 'in-progress' ? '#fef3c7' :
                     statusBadge.class === 'completed' ? '#d1fae5' :
                     statusBadge.class === 'cancelled' ? '#fee2e2' : '#fee2e2',
          color: statusBadge.class === 'scheduled' ? '#2563eb' : 
                 statusBadge.class === 'confirmed' ? '#065f46' :
                 statusBadge.class === 'in-progress' ? '#92400e' :
                 statusBadge.class === 'completed' ? '#065f46' :
                 statusBadge.class === 'cancelled' ? '#991b1b' : '#991b1b'
        }}>
          {statusBadge.icon}
          {statusBadge.label}
        </span>
      </div>

      {/* Información del Paciente */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '10px'
        }}>
          <FiUser size={16} style={{ color: '#94a3b8' }} />
          <h4 style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: 600,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.3px'
          }}>Información del Paciente</h4>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px'
        }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 600,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.3px'
            }}>Nombre</label>
            <span style={{ color: '#0f172a', fontWeight: 500 }}>
              {cita.paciente_nombre || '—'}
            </span>
          </div>
          <div>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 600,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.3px'
            }}>Documento</label>
            <span style={{ color: '#0f172a', fontWeight: 500 }}>
              {cita.document_number || '—'}
            </span>
          </div>
          <div>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 600,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.3px'
            }}>Teléfono</label>
            <span style={{ color: '#0f172a', fontWeight: 500 }}>
              {cita.phone || '—'}
            </span>
          </div>
          <div>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 600,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.3px'
            }}>Email</label>
            <span style={{ color: '#0f172a', fontWeight: 500 }}>
              {cita.email || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Detalles de la Cita */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '10px'
        }}>
          <FiClock size={16} style={{ color: '#94a3b8' }} />
          <h4 style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: 600,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.3px'
          }}>Detalles de la Cita</h4>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '12px'
        }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 600,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.3px'
            }}>
              <FiCalendar size={12} style={{ marginRight: 4 }} />
              Fecha
            </label>
            <span style={{ color: '#0f172a', fontWeight: 500 }}>
              {formatDate(cita.fecha)}
            </span>
          </div>
          <div>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 600,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.3px'
            }}>
              <FiClock size={12} style={{ marginRight: 4 }} />
              Hora
            </label>
            <span style={{ color: '#0f172a', fontWeight: 500 }}>
              {formatTime(cita.hora_inicio)} - {formatTime(cita.hora_fin)}
            </span>
          </div>
          <div>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 600,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.3px'
            }}>
              <FiActivity size={12} style={{ marginRight: 4 }} />
              Duración
            </label>
            <span style={{ color: '#0f172a', fontWeight: 500 }}>
              {cita.duracion || 30} min
            </span>
          </div>
        </div>
      </div>

      {/* Profesional y Tratamiento */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '10px'
        }}>
          <FiUserCheck size={16} style={{ color: '#94a3b8' }} />
          <h4 style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: 600,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.3px'
          }}>Profesional y Tratamiento</h4>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px'
        }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 600,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.3px'
            }}>Especialista</label>
            <span style={{ color: '#0f172a', fontWeight: 500 }}>
              {cita.especialista_nombre || '—'}
            </span>
            {cita.especialidad && (
              <span style={{
                display: 'block',
                fontSize: '12px',
                color: '#94a3b8'
              }}>{cita.especialidad}</span>
            )}
          </div>
          <div>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 600,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.3px'
            }}>Tratamiento</label>
            <span style={{ color: '#0f172a', fontWeight: 500 }}>
              {cita.tratamiento_nombre || '—'}
            </span>
            {cita.price && (
              <span style={{
                display: 'block',
                fontSize: '12px',
                color: '#2563eb',
                fontWeight: 600
              }}>
                <FiDollarSign size={12} style={{ display: 'inline', marginRight: 2 }} />
                {cita.price}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Motivo y Notas */}
      {(cita.motivo_nombre || cita.notas) && (
        <div style={{ marginBottom: '4px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '10px'
          }}>
            <FiActivity size={16} style={{ color: '#94a3b8' }} />
            <h4 style={{
              margin: 0,
              fontSize: '13px',
              fontWeight: 600,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.3px'
            }}>Motivo y Notas</h4>
          </div>
          <div>
            {cita.motivo_nombre && (
              <div style={{ marginBottom: '8px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px'
                }}>Motivo</label>
                <span style={{ color: '#0f172a' }}>
                  {cita.motivo_nombre}
                </span>
              </div>
            )}
            {cita.notas && (
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px'
                }}>Notas</label>
                <p style={{
                  margin: 0,
                  color: '#475569',
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}>{cita.notas}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );

  const modalFooter = (
    <ButtonGroup>
      <IconTextButton
        variant=""
        size="md"
        icon={<FiX size={14} />}
        onClick={onClose}
      >
        Cerrar
      </IconTextButton>
    </ButtonGroup>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detalles de la Cita"
      size="md"
      closeOnOverlayClick={true}
      footer={modalFooter}
    >
      {modalContent}
    </Modal>
  );
}