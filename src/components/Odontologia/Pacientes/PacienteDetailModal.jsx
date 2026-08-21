// componentes/pacientes/PacienteDetailModal.jsx
import React from 'react';
import { 
  FiX, 
  FiEdit, 
  FiCalendar, 
  FiPhone, 
  FiMail, 
  FiMapPin,
  FiUser,
  FiPhoneCall,
  FiActivity,
  FiBriefcase,
  FiGlobe,
  FiDroplet,
  FiClipboard,
  FiClock,
  FiHash
} from 'react-icons/fi';
import { PacienteAvatar } from './PacienteAvatar';
import { calculateBirthday, formatPhone } from '../../../utils/pacienteUtils';

export const PacienteDetailModal = ({ 
  isOpen, 
  onClose, 
  paciente, 
  onEdit 
}) => {
  if (!isOpen || !paciente) return null;

  const birthdayInfo = calculateBirthday(paciente.birth_date);
  
  const totalCitas = paciente.total_appointments || 0;
  const totalTratamientos = paciente.total_treatments || 0;
  const totalPagos = paciente.total_payments || 0;

  const hasAllergies = paciente.allergies && paciente.allergies.length > 0;
  const hasMedicalHistory = paciente.medical_history && paciente.medical_history.length > 0;

  const hcNumber = paciente.hc_number || 'Sin asignar';

  return (
    <div className="odonto-modal-overlay" onClick={onClose}>
      <div className="odonto-modal odonto-modal-detail" onClick={e => e.stopPropagation()}>
        {/* HEADER */}
        <div className="odonto-detail-header blue">
          <div className="odonto-detail-header-profile">
            <div className="odonto-detail-avatar">
              <PacienteAvatar 
                firstName={paciente.first_name}
                lastName={paciente.last_name}
                imageUrl={paciente.image_url}
                size={100}
                className="bordered-primary shadow-md"
              />
            </div>
            
            <div className="odonto-detail-info">
              <h3 className="odont-atender-section-header">
                {paciente.first_name} {paciente.last_name}
              </h3>
              
              <div className="odonto-detail-document">
                <FiUser size={14} />
                <span>No. Cédula: {paciente.document_number || 'No registrada'}</span>
              </div>
              
              <div className="odonto-detail-hc">
                <FiHash size={14} />
                <span>HC: <strong>{hcNumber}</strong></span>
              </div>
              
              <div className="odonto-detail-status">
                {birthdayInfo && birthdayInfo.isSoon && (
                  <span className="odonto-badge-birthday soon">
                    🎂 {birthdayInfo.formatted}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <button className="odonto-modal-close" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        <div className="odonto-modal-body odonto-detail-body">
          {/* INFORMACIÓN PERSONAL */}
          <div className="odonto-detail-section">
            <div className="odonto-detail-section-header">
              <FiUser className="odonto-detail-section-icon" />
              <h4 className="odonto-detail-section-title">Información Personal</h4>
            </div>
            <div className="odonto-detail-grid-three">
              <div className="odonto-detail-item">
                <label className="odonto-detail-label">
                  <FiCalendar size={14} />
                  <span>Fecha de nacimiento</span>
                </label>
                <span className="odonto-detail-value">
                  {paciente.birth_date ? new Date(paciente.birth_date).toLocaleDateString('es-EC', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  }) : 'No registrada'}
                </span>
              </div>
              <div className="odonto-detail-item">
                <label className="odonto-detail-label">
                  <FiActivity size={14} />
                  <span>Género</span>
                </label>
                <span className="odonto-detail-value">{paciente.gender || 'No registrado'}</span>
              </div>
              <div className="odonto-detail-item">
                <label className="odonto-detail-label">
                  <FiDroplet size={14} />
                  <span>Tipo de sangre</span>
                </label>
                <span className="odonto-detail-value odonto-blood-type">
                  {paciente.blood_type || 'No registrado'}
                </span>
              </div>
            </div>
          </div>

          {/* CONTACTO */}
          <div className="odonto-detail-section">
            <div className="odonto-detail-section-header">
              <FiPhoneCall className="odonto-detail-section-icon" />
              <h4 className="odonto-detail-section-title">Información de Contacto</h4>
            </div>
            <div className="odonto-detail-grid-three">
              <div className="odonto-detail-item">
                <label className="odonto-detail-label">
                  <FiPhone size={14} />
                  <span>Teléfono</span>
                </label>
                <span className="odonto-detail-value">{formatPhone(paciente.phone)}</span>
              </div>
              <div className="odonto-detail-item">
                <label className="odonto-detail-label">
                  <FiMail size={14} />
                  <span>Email</span>
                </label>
                <span className="odonto-detail-value">{paciente.email || 'No registrado'}</span>
              </div>
              <div className="odonto-detail-item">
                <label className="odonto-detail-label">
                  <FiMapPin size={14} />
                  <span>Dirección</span>
                </label>
                <span className="odonto-detail-value">{paciente.address || 'No registrada'}</span>
              </div>
            </div>
          </div>

          {/* MÉDICA */}
          <div className="odonto-detail-section">
            <div className="odonto-detail-section-header">
              <FiActivity className="odonto-detail-section-icon" />
              <h4 className="odonto-detail-section-title">Información Médica</h4>
            </div>
            <div className="odonto-detail-grid-two">
              <div className="odonto-detail-item">
                <label className="odonto-detail-label">
                  <FiClipboard size={14} />
                  <span>Alergias</span>
                </label>
                <span className="odonto-detail-value">
                  {hasAllergies ? (
                    <span className="odonto-allergy-tags">
                      {paciente.allergies.split(',').map((allergy, index) => (
                        <span key={index} className="odonto-allergy-tag">
                          {allergy.trim()}
                        </span>
                      ))}
                    </span>
                  ) : (
                    'Ninguna'
                  )}
                </span>
              </div>
              <div className="odonto-detail-item">
                <label className="odonto-detail-label">
                  <FiClipboard size={14} />
                  <span>Antecedentes médicos</span>
                </label>
                <span className="odonto-detail-value">
                  {hasMedicalHistory ? (
                    <div className="odonto-medical-history">
                      {paciente.medical_history}
                    </div>
                  ) : (
                    'Ninguno'
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* LABORAL */}
          <div className="odonto-detail-section">
            <div className="odonto-detail-section-header">
              <FiBriefcase className="odonto-detail-section-icon" />
              <h4 className="odonto-detail-section-title">Información Laboral</h4>
            </div>
            <div className="odonto-detail-grid-two">
              <div className="odonto-detail-item">
                <label className="odonto-detail-label">
                  <FiBriefcase size={14} />
                  <span>Ocupación</span>
                </label>
                <span className="odonto-detail-value">{paciente.occupation || 'No registrada'}</span>
              </div>
              <div className="odonto-detail-item">
                <label className="odonto-detail-label">
                  <FiGlobe size={14} />
                  <span>Nacionalidad</span>
                </label>
                <span className="odonto-detail-value">{paciente.nationality || 'No registrada'}</span>
              </div>
            </div>
          </div>

          {/* ESTADÍSTICAS */}
          <div className="odonto-detail-section">
            <div className="odonto-detail-section-header">
              <FiClock className="odonto-detail-section-icon" />
              <h4 className="odonto-detail-section-title">Estadísticas y Registro</h4>
            </div>
            <div className="odonto-detail-stats">
              <div className="odonto-detail-stat">
                <div className="stat-number">{totalCitas}</div>
                <div className="stat-label">Total de citas</div>
              </div>
              <div className="odonto-detail-stat">
                <div className="stat-number">{totalTratamientos}</div>
                <div className="stat-label">Tratamientos</div>
              </div>
              <div className="odonto-detail-stat">
                <div className="stat-number">${totalPagos.toFixed(2)}</div>
                <div className="stat-label">Total pagado</div>
              </div>
              <div className="odonto-detail-stat">
                <div className="stat-number">
                  {paciente.created_at ? new Date(paciente.created_at).toLocaleDateString('es-EC', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  }) : 'N/A'}
                </div>
                <div className="stat-label">Fecha de registro</div>
              </div>
            </div>
            
            {paciente.last_visit && (
              <div className="odonto-timeline">
                <div className="odonto-timeline-item">
                  <div className="odonto-timeline-dot"></div>
                  <div className="odonto-timeline-content">
                    <span className="odonto-timeline-label">Última visita:</span>
                    <span className="odonto-timeline-value">
                      {new Date(paciente.last_visit).toLocaleDateString('es-EC', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="odonto-modal-footer">
          <button className="odonto-btn-secondary" onClick={onClose}>
            Cerrar
          </button>
          <button 
            className="odonto-btn-primary" 
            onClick={() => {
              onClose();
              setTimeout(() => onEdit(paciente), 300);
            }}
          >
            <FiEdit size={14} style={{ marginRight: 6 }} /> Editar Paciente
          </button>
        </div>
      </div>
    </div>
  );
};