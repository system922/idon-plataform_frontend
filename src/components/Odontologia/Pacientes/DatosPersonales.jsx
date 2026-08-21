// components/Odontologia/DatosPersonales.jsx
import React, { useState, useEffect } from 'react';
import { 
  FiUser, FiCalendar, FiPhone, FiMail, FiMapPin,
  FiBriefcase, FiGlobe, FiDroplet, FiFileText,
  FiPhoneCall, FiEdit2, FiSave, FiX
} from 'react-icons/fi';
import { fetchWithAuth } from '../../../config/apiBase_';

export default function DatosPersonales({ paciente, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (paciente) {
      setFormData({ ...paciente });
    }
  }, [paciente]);

  if (!paciente) {
    return (
      <div className="odont-empty-state" style={{ padding: '40px', textAlign: 'center' }}>
        <p>No hay información del paciente disponible</p>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
    setSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Preparar datos para enviar
      const dataToSend = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        document_number: formData.document_number,
        birth_date: formData.birth_date,
        gender: formData.gender,
        blood_type: formData.blood_type,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        occupation: formData.occupation,
        nationality: formData.nationality,
        allergies: formData.allergies,
        medical_history: formData.medical_history,
        hc_number: formData.hc_number
      };

      const url = `/api/odontologia/pacientes/${paciente.id}`;
      const res = await fetchWithAuth(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al actualizar los datos');
      }

      setSuccess(true);
      setIsEditing(false);
      
      // Actualizar el paciente en el estado padre
      if (onSave) {
        onSave(data.data || formData);
      }

      // Mostrar mensaje de éxito
      setTimeout(() => setSuccess(false), 3000);

    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({ ...paciente });
    setIsEditing(false);
    setError(null);
    setSuccess(false);
  };

  return (
    <div className="odont-detail-body" style={{ padding: '20px' }}>
      {/* HEADER - Solo el nombre y el botón de editar */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid #e5e7eb'
      }}>
        {/* Botón Editar */}
        {!isEditing ? (
          <button 
            className="odonto-btn-secondary" 
            style={{ fontSize: '13px', padding: '8px 16px' }} 
            onClick={() => setIsEditing(true)}
          >
            <FiEdit2 size={16} /> Editar
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="odonto-btn-primary" 
              style={{ fontSize: '13px', padding: '8px 16px' }} 
              onClick={handleSave}
              disabled={saving}
            >
              <FiSave size={16} /> {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button 
              className="odonto-btn-secondary" 
              style={{ fontSize: '13px', padding: '8px 16px' }} 
              onClick={handleCancel}
              disabled={saving}
            >
              <FiX size={16} /> Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Mensajes de estado */}
      {error && (
        <div className="odonto-alert error" style={{ 
          marginBottom: '16px', 
          padding: '10px 14px',
          borderRadius: '8px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          fontSize: '13px'
        }}>
          ❌ {error}
        </div>
      )}
      {success && (
        <div className="odonto-alert success" style={{ 
          marginBottom: '16px', 
          padding: '10px 14px',
          borderRadius: '8px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          color: '#166534',
          fontSize: '13px'
        }}>
          ✅ Datos actualizados correctamente
        </div>
      )}

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
            {!isEditing ? (
              <span className="odonto-detail-value">
                {paciente.birth_date ? new Date(paciente.birth_date).toLocaleDateString('es-EC', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                }) : 'No registrada'}
              </span>
            ) : (
              <input
                type="date"
                name="birth_date"
                value={formData.birth_date || ''}
                onChange={handleChange}
                className="odonto-detail-value"
                style={{ 
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              />
            )}
          </div>
          <div className="odonto-detail-item">
            <label className="odonto-detail-label">
              <FiUser size={14} />
              <span>Género</span>
            </label>
            {!isEditing ? (
              <span className="odonto-detail-value">{paciente.gender || 'No registrado'}</span>
            ) : (
              <select
                name="gender"
                value={formData.gender || ''}
                onChange={handleChange}
                className="odonto-detail-value"
                style={{ 
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  background: '#fff',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">Seleccionar</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
                <option value="Otro">Otro</option>
              </select>
            )}
          </div>
          <div className="odonto-detail-item">
            <label className="odonto-detail-label">
              <FiDroplet size={14} />
              <span>Tipo de sangre</span>
            </label>
            {!isEditing ? (
              <span className="odonto-detail-value odonto-blood-type">
                {paciente.blood_type || 'No registrado'}
              </span>
            ) : (
              <select
                name="blood_type"
                value={formData.blood_type || ''}
                onChange={handleChange}
                className="odonto-detail-value"
                style={{ 
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  background: '#fff',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">Seleccionar</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* INFORMACIÓN DE CONTACTO */}
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
            {!isEditing ? (
              <span className="odonto-detail-value">{paciente.phone || 'No registrado'}</span>
            ) : (
              <input
                type="text"
                name="phone"
                value={formData.phone || ''}
                onChange={handleChange}
                className="odonto-detail-value"
                placeholder="0987654321"
                style={{ 
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              />
            )}
          </div>
          <div className="odonto-detail-item">
            <label className="odonto-detail-label">
              <FiMail size={14} />
              <span>Email</span>
            </label>
            {!isEditing ? (
              <span className="odonto-detail-value">{paciente.email || 'No registrado'}</span>
            ) : (
              <input
                type="email"
                name="email"
                value={formData.email || ''}
                onChange={handleChange}
                className="odonto-detail-value"
                placeholder="correo@ejemplo.com"
                style={{ 
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              />
            )}
          </div>
          <div className="odonto-detail-item">
            <label className="odonto-detail-label">
              <FiMapPin size={14} />
              <span>Dirección</span>
            </label>
            {!isEditing ? (
              <span className="odonto-detail-value">{paciente.address || 'No registrada'}</span>
            ) : (
              <input
                type="text"
                name="address"
                value={formData.address || ''}
                onChange={handleChange}
                className="odonto-detail-value"
                placeholder="Calle principal #123"
                style={{ 
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* INFORMACIÓN LABORAL */}
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
            {!isEditing ? (
              <span className="odonto-detail-value">{paciente.occupation || 'No registrada'}</span>
            ) : (
              <input
                type="text"
                name="occupation"
                value={formData.occupation || ''}
                onChange={handleChange}
                className="odonto-detail-value"
                placeholder="Ingeniero, Abogado, etc."
                style={{ 
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              />
            )}
          </div>
          <div className="odonto-detail-item">
            <label className="odonto-detail-label">
              <FiGlobe size={14} />
              <span>Nacionalidad</span>
            </label>
            {!isEditing ? (
              <span className="odonto-detail-value">{paciente.nationality || 'No registrada'}</span>
            ) : (
              <input
                type="text"
                name="nationality"
                value={formData.nationality || ''}
                onChange={handleChange}
                className="odonto-detail-value"
                placeholder="Ecuatoriana"
                style={{ 
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* INFORMACIÓN MÉDICA */}
      <div className="odonto-detail-section" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>
        <div className="odonto-detail-section-header">
          <FiFileText className="odonto-detail-section-icon" />
          <h4 className="odonto-detail-section-title">Información Médica</h4>
        </div>
        <div className="odonto-detail-grid-two">
          <div className="odonto-detail-item">
            <label className="odonto-detail-label">
              <FiFileText size={14} />
              <span>Alergias</span>
            </label>
            {!isEditing ? (
              <span className="odonto-detail-value">
                {paciente.allergies ? (
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
            ) : (
              <input
                type="text"
                name="allergies"
                value={formData.allergies || ''}
                onChange={handleChange}
                className="odonto-detail-value"
                placeholder="Penicilina, Látex, etc. (separar con comas)"
                style={{ 
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              />
            )}
          </div>
          <div className="odonto-detail-item">
            <label className="odonto-detail-label">
              <FiFileText size={14} />
              <span>Antecedentes médicos</span>
            </label>
            {!isEditing ? (
              <span className="odonto-detail-value">
                {paciente.medical_history || 'Ninguno'}
              </span>
            ) : (
              <textarea
                name="medical_history"
                value={formData.medical_history || ''}
                onChange={handleChange}
                className="odonto-detail-value"
                placeholder="Hipertensión, Diabetes, etc."
                rows="2"
                style={{ 
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  width: '100%',
                  minHeight: '50px',
                  boxSizing: 'border-box'
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}