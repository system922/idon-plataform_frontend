// componentes/pacientes/PacienteModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiUpload, FiUser, FiCamera, FiSearch, FiLoader, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { PacienteAvatar } from './PacienteAvatar';
import { CameraModal } from './CameraModal';

export const PacienteModal = ({ 
  isOpen, 
  onClose, 
  paciente = null, 
  onSave,
  loading 
}) => {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    document_number: '',
    phone: '',
    email: '',
    birth_date: '',
    gender: 'Masculino',
    address: '',
    allergies: '',
    medical_history: '',
    occupation: '',
    nationality: '',
    blood_type: '',
    hc_number: '',
    image_url: '',
    image_file: null,
  });
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  
  const [searching, setSearching] = useState(false);
  const [searchSuccess, setSearchSuccess] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [foundData, setFoundData] = useState(null);
  const [cedulaTouched, setCedulaTouched] = useState(false);

  const [showCamera, setShowCamera] = useState(false);

  const handleCameraCapture = (file, previewUrl) => {
    setImagePreview(previewUrl);
    setForm(prev => ({ ...prev, image_file: file, image_url: '' }));
  };

  useEffect(() => {
    if (paciente) {
      setForm({
        first_name: paciente.first_name || '',
        last_name: paciente.last_name || '',
        document_number: paciente.document_number || '',
        phone: paciente.phone || '',
        email: paciente.email || '',
        birth_date: paciente.birth_date || '',
        gender: paciente.gender || 'Masculino',
        address: paciente.address || '',
        allergies: paciente.allergies || '',
        medical_history: paciente.medical_history || '',
        occupation: paciente.occupation || '',
        nationality: paciente.nationality || '',
        blood_type: paciente.blood_type || '',
        hc_number: paciente.hc_number || '',
        image_url: paciente.image_url || '',
        image_file: null,
      });
      setImagePreview(paciente.image_url || null);
      setSearchSuccess(false);
      setSearchMessage('');
      setFoundData(null);
      setCedulaTouched(false);
    } else {
      setForm({
        first_name: '',
        last_name: '',
        document_number: '',
        phone: '',
        email: '',
        birth_date: '',
        gender: 'Masculino',
        address: '',
        allergies: '',
        medical_history: '',
        occupation: '',
        nationality: '',
        blood_type: '',
        hc_number: '',
        image_url: '',
        image_file: null,
      });
      setImagePreview(null);
      setSearchSuccess(false);
      setSearchMessage('');
      setFoundData(null);
      setCedulaTouched(false);
    }
    setError('');
  }, [paciente]);

  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  if (!isOpen) return null;

  const buscarEnRegistroCivil = async (documentNumber) => {
    if (!documentNumber || documentNumber.length !== 10) {
      setSearchMessage('Ingrese una cédula válida de 10 dígitos');
      setSearchSuccess(false);
      return;
    }

    setSearching(true);
    setSearchMessage('');
    setSearchSuccess(false);
    setError('');

    try {
      const proxyUrl = 'https://infoplacas.herokuapp.com/';
      const targetUrl = 'https://si.secap.gob.ec/sisecap/logeo_web/json/busca_persona_registro_civil.php';
      const postData = new URLSearchParams({ 
        documento: documentNumber, 
        tipo: '1' 
      });

      const response = await fetch(proxyUrl + targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: postData
      });

      const text = await response.text();
      
      if (text) {
        const json = JSON.parse(text);
        if (json?.nombres) {
          const firstName = json.nombres ? json.nombres.toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) : '';
          const lastName = json.apellidos ? json.apellidos.toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) : '';
          const birthDate = json.fechaNacimiento || '';
          
          let gender = 'Masculino';
          if (json.sexo) {
            const sexoUpper = json.sexo.toUpperCase();
            if (sexoUpper === 'HOMBRE' || sexoUpper === 'MASCULINO') {
              gender = 'Masculino';
            } else if (sexoUpper === 'MUJER' || sexoUpper === 'FEMENINO') {
              gender = 'Femenino';
            }
          }
          
          let nationality = '';
          if (json.nacionalidad) {
            nationality = json.nacionalidad;
          }
          
          setForm(prev => ({
            ...prev,
            first_name: firstName,
            last_name: lastName,
            document_number: documentNumber,
            birth_date: birthDate,
            gender: gender,
            nationality: nationality,
          }));
          
          setFoundData({
            nombre: `${firstName} ${lastName}`,
            first_name: firstName,
            last_name: lastName,
            document_number: documentNumber,
            birth_date: birthDate,
            gender: gender,
            nationality: nationality,
          });
          
          setSearchSuccess(true);
          
          setTimeout(() => {
            setSearchMessage('');
          }, 4000);
        } else {
          setSearchSuccess(false);
          setSearchMessage('❌ No se encontraron datos en el registro civil');
        }
      } else {
        setSearchSuccess(false);
        setSearchMessage('❌ No se encontraron datos en el registro civil');
      }
    } catch (err) {
      console.error('Error al buscar en registro civil:', err);
      setSearchSuccess(false);
      setSearchMessage('❌ Error al consultar el registro civil');
    } finally {
      setSearching(false);
    }
  };

  const handleDocumentChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    
    setForm({ ...form, document_number: value });
    setSearchMessage('');
    setSearchSuccess(false);
    setFoundData(null);
    setCedulaTouched(true);

    if (value.length < 10) {
      setForm(prev => ({
        ...prev,
        first_name: '',
        last_name: '',
        document_number: value,
        phone: '',
        email: '',
        birth_date: '',
        gender: 'Masculino',
        address: '',
        allergies: '',
        medical_history: '',
        occupation: '',
        nationality: '',
        blood_type: '',
        hc_number: '',
        image_url: '',
        image_file: null,
      }));
      setSearchSuccess(false);
      setFoundData(null);
      setSearchMessage('');
      return;
    }
    
    if (value.length === 10) {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      
      const timeout = setTimeout(() => {
        buscarEnRegistroCivil(value);
      }, 600);
      
      setSearchTimeout(timeout);
    }
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm({ ...form, phone: value });
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona una imagen válida (JPG, PNG, GIF, etc.)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede ser mayor a 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);

    setForm({ ...form, image_file: file, image_url: '' });
    setError('');
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setForm({ ...form, image_file: null, image_url: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.document_number) {
      setError('La cédula es obligatoria');
      return;
    }

    if (form.document_number.length !== 10) {
      setError('La cédula debe tener exactamente 10 dígitos');
      return;
    }

    if (!form.first_name || !form.last_name) {
      setError('Nombres y apellidos son obligatorios');
      return;
    }

    const submitData = new FormData();
    
    const dataToSend = {
      document_number: form.document_number,
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email || '',
      phone: form.phone || '',
      birth_date: form.birth_date || '',
      gender: form.gender || 'Masculino',
      address: form.address || '',
      allergies: form.allergies || '',
      medical_history: form.medical_history || '',
      occupation: form.occupation || '',
      nationality: form.nationality || '',
      blood_type: form.blood_type || '',
      is_active: true
    };

    submitData.append('data', JSON.stringify(dataToSend));

    if (form.image_file) {
      submitData.append('image', form.image_file);
    }

    if (paciente) {
      submitData.append('id', paciente.id);
    }

    const result = await onSave(submitData);
    if (result?.success) {
      onClose();
    } else {
      setError(result?.error || 'Error al guardar paciente');
    }
  };

  const getCedulaStatus = () => {
    if (searching) return 'searching';
    if (searchSuccess) return 'success';
    if (form.document_number && cedulaTouched && !searchSuccess && !searching) return 'error';
    return 'default';
  };

  const cedulaStatus = getCedulaStatus();

  return (
    <>
      <div className="odonto-modal-overlay" onClick={onClose}>
        <div className="odonto-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 650 }}>
          {/* HEADER - usa primary gradient */}
          <div className="odonto-modal-header blue">
            <div>
              <h3>{paciente ? 'Editar Paciente' : 'Nuevo Paciente'}</h3>
              <p>{paciente ? 'Modificar información del paciente' : 'Registrar un nuevo paciente'}</p>
            </div>
            <button className="odonto-modal-close" onClick={onClose}>
              <FiX size={20} />
            </button>
          </div>

          {/* BODY */}
          <div className="odonto-modal-body">
            {error && (
              <div className="odonto-error-message">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              {/* CÉDULA + FOTO - layout compacto */}
              <div className="odonto-form-row-compact">
                {/* Cédula */}
                <div className="odonto-cedula-section">
                  <label className="odonto-cedula-label">N. CED.</label>
                  <div className={`odonto-cedula-wrapper ${cedulaStatus}`}>
                    <FiSearch className="odonto-cedula-icon" />
                    <input
                      name="document_number"
                      type="text"
                      value={form.document_number}
                      onChange={handleDocumentChange}
                      placeholder="10 dígitos"
                      required
                      disabled={!!paciente}
                      className="odonto-cedula-input"
                      maxLength="10"
                    />
                    
                    <span className={`odonto-cedula-counter ${form.document_number.length === 10 ? 'complete' : ''}`}>
                      {form.document_number.length}/10
                    </span>
                    
                    {searching && (
                      <div className="odonto-cedula-spinner">
                        <FiLoader size={14} />
                      </div>
                    )}
                    
                    {searchSuccess && !searching && (
                      <div className="odonto-cedula-success">
                        <FiCheckCircle size={14} />
                      </div>
                    )}
                    
                    {form.document_number.length === 10 && !searchSuccess && !searching && !paciente && (
                      <div className="odonto-cedula-error">
                        <FiAlertCircle size={14} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Foto */}
                <div className="odonto-image-upload">
                  <label className="odonto-image-label">FOTO</label>
                  
                  <div className="odonto-image-preview">
                    <PacienteAvatar 
                      firstName={form.first_name || '?'}
                      lastName={form.last_name || ''}
                      imageUrl={imagePreview}
                      size={36} 
                      className="bordered-primary"
                    />
                  </div>

                  <div className="odonto-image-actions">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                    
                    <button
                      type="button"
                      className="odonto-btn-upload"
                      onClick={handleUploadClick}
                    >
                      <FiUpload size={13} />
                      <span>{imagePreview ? 'Cambiar' : 'Subir'}</span>
                    </button>

                    {!imagePreview && (
                      <button
                        type="button"
                        className="odonto-btn-camera"
                        onClick={() => setShowCamera(true)}
                        title="Tomar foto con WebCam"
                      >
                        <FiCamera size={13} />
                        <span>Tomar</span>
                      </button>
                    )}

                    {imagePreview && (
                      <button
                        type="button"
                        className="odonto-btn-remove"
                        onClick={handleRemoveImage}
                      >
                        <FiX size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Nombres, Apellidos, Teléfono - 3 columnas */}
              <div className="odonto-form-row-three">
                <div className="odonto-form-group">
                  <label>Nombres *</label>
                  <input 
                    name="first_name" 
                    value={form.first_name} 
                    onChange={handleChange} 
                    required 
                    className={searchSuccess ? 'field-found' : ''}
                    placeholder="Ej: Juan Carlos"
                  />
                </div>
                <div className="odonto-form-group">
                  <label>Apellidos *</label>
                  <input 
                    name="last_name" 
                    value={form.last_name} 
                    onChange={handleChange} 
                    required 
                    className={searchSuccess ? 'field-found' : ''}
                    placeholder="Ej: Pérez González"
                  />
                </div>
                <div className="odonto-form-group">
                  <label>Teléfono</label>
                  <input 
                    name="phone" 
                    value={form.phone} 
                    onChange={handlePhoneChange} 
                    placeholder="0999123456"
                    style={{ maxWidth: '150px' }}
                  />
                </div>
              </div>

              {/* Email, Fecha, Género - custom 3 columnas */}
              <div className="odonto-form-row-custom">
                <div className="odonto-form-group">
                  <label>Email</label>
                  <input 
                    name="email" 
                    type="email" 
                    value={form.email} 
                    onChange={handleChange} 
                    placeholder="ejemplo@correo.com"
                    style={{ maxWidth: '280px' }}
                  />
                </div>
                <div className="odonto-form-group">
                  <label>Fecha de nacimiento</label>
                  <input 
                    name="birth_date" 
                    type="date" 
                    value={form.birth_date} 
                    onChange={handleChange} 
                    className={searchSuccess && form.birth_date ? 'field-found' : ''}
                    style={{ maxWidth: '140px' }}
                  />
                </div>
                <div className="odonto-form-group">
                  <label>Género</label>
                  <select 
                    name="gender" 
                    value={form.gender} 
                    onChange={handleChange}
                    className={searchSuccess ? 'field-found' : ''}
                    style={{ maxWidth: '140px' }}
                  >
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>

              {/* Dirección, Ocupación - 2 columnas */}
              <div className="odonto-form-row-address">
                <div className="odonto-form-group">
                  <label>Dirección</label>
                  <input 
                    name="address" 
                    value={form.address} 
                    onChange={handleChange} 
                    placeholder="Dirección completa"
                  />
                </div>
                <div className="odonto-form-group">
                  <label>Ocupación</label>
                  <input 
                    name="occupation" 
                    value={form.occupation || ''} 
                    onChange={handleChange} 
                    placeholder="Ej: Ingeniero, Médico..."
                  />
                </div>
              </div>

              {/* Nacionalidad, Sangre, Alergias - 3 columnas */}
              <div className="odonto-form-row-allergies">
                <div className="odonto-form-group">
                  <label>Nacionalidad</label>
                  <input 
                    name="nationality" 
                    value={form.nationality || ''} 
                    onChange={handleChange} 
                    placeholder="Ej: Ecuatoriana"
                    className={searchSuccess && form.nationality ? 'field-found' : ''}
                  />
                </div>
                <div className="odonto-form-group">
                  <label>T. Sangre</label>
                  <select 
                    name="blood_type" 
                    value={form.blood_type || ''} 
                    onChange={handleChange}
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
                </div>
                <div className="odonto-form-group">
                  <label>Alergias</label>
                  <input 
                    name="allergies" 
                    value={form.allergies} 
                    onChange={handleChange} 
                    placeholder="Ej: Penicilina, Polen, Látex..."
                  />
                </div>
              </div>

              {/* Antecedentes médicos - full width */}
              <div className="odonto-form-group" style={{ marginTop: '4px' }}>
                <label>Antecedentes médicos</label>
                <textarea 
                  name="medical_history" 
                  value={form.medical_history} 
                  onChange={handleChange} 
                  placeholder="Historial médico relevante del paciente..."
                  rows={2}
                  style={{ 
                    width: '100%', 
                    padding: '8px 12px', 
                    borderRadius: '6px', 
                    border: '1px solid #d1d5db', 
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    fontSize: '13px'
                  }}
                />
              </div>
            </form>
          </div>

          {/* FOOTER */}
          <div className="odonto-modal-footer">
            <button className="odonto-btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button 
              className="odonto-btn-primary" 
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Guardando...' : (paciente ? 'Actualizar' : 'Guardar')}
            </button>
          </div>
        </div>
      </div>

      {showCamera && (
        <CameraModal
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </>
  );
};