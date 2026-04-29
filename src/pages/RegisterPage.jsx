import React, { useState, useEffect } from 'react';
import '../styles/LoginPage.css';

import API_BASE from '../config/apiBase';

const RegisterPage = ({ onRegisterSuccess, onNavigateToLogin }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    ownerDocumentType: 'cedula',
    ownerDocument: '',
    ownerFirstName: '',
    ownerLastName: '',
    ownerEmail: '',
    ownerPhone: '',
    businessName: '',
    businessType: '',
    businessSlug: '',
    password: '',
    passwordConfirm: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [ownerExists, setOwnerExists] = useState(false);
  const [ownerSearching, setOwnerSearching] = useState(false);
  const [foundByApi, setFoundByApi] = useState(false);
  const [businessTypes, setBusinessTypes] = useState([]);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/business-types`)
      .then(r => r.json())
      .then(data => setBusinessTypes(Array.isArray(data) ? data : (data.data || [])))
      .catch(() => setBusinessTypes([]));
  }, []);

  // ---- BUSCAR PROPIETARIO ----
  const handleOwnerDocumentChange = async (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 15);
    setFormData(f => ({ ...f, ownerDocument: value }));

    if (formData.ownerDocumentType === 'cedula' && value.length === 10) {
      setOwnerSearching(true);
      setOwnerExists(false);
      setFoundByApi(false);
      try {
        // 1) Buscar en local
        const res = await fetch(`${API_BASE}/api/business-owners/find?type=cedula&number=${value}`);
        const data = await res.json();
        if (res.ok && data.exists && data.owner) {
          setFormData(f => ({
            ...f,
            ownerFirstName: data.owner.first_name || '',
            ownerLastName: data.owner.last_name || '',
            ownerEmail: data.owner.email || '',
            ownerPhone: data.owner.phone || ''
          }));
          setOwnerExists(true);
          setFoundByApi(false);
        } else {
          const civil = await buscarEnAPIEcuador(value);
          if (civil && typeof civil === 'object' && civil.nombres) {
            setFormData(f => ({
              ...f,
              ownerFirstName: civil.nombres || '',
              ownerLastName: civil.apellidos || '',
            }));
            setOwnerExists(false);
            setFoundByApi(true);
          } else {
            setFormData(f => ({
              ...f,
              ownerFirstName: '',
              ownerLastName: ''
            }));
            setOwnerExists(false);
            setFoundByApi(false);
          }
        }
      } catch {
        setOwnerExists(false);
        setFoundByApi(false);
      } finally {
        setOwnerSearching(false);
      }
    } else {
      setOwnerExists(false);
      setFoundByApi(false);
    }
  };

  const handleOwnerDocTypeChange = e => {
    setFormData(f => ({
      ...f,
      ownerDocumentType: e.target.value,
      ownerDocument: '',
      ownerFirstName: '',
      ownerLastName: ''
    }));
    setOwnerExists(false);
    setFoundByApi(false);
  };

  async function buscarEnAPIEcuador(cedula) {
    try {
      const proxyUrl = 'https://infoplacas.herokuapp.com/';
      const targetUrl = 'https://si.secap.gob.ec/sisecap/logeo_web/json/busca_persona_registro_civil.php';
      const postData = new URLSearchParams({
        documento: cedula,
        tipo: '1'
      });
      const response = await fetch(proxyUrl + targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: postData
      });
      if (!response.ok) return null;
      const textResponse = await response.text();
      if (!textResponse) return null;
      return JSON.parse(textResponse);
    } catch {
      return null;
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  // ---- VALIDACIONES ----
  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.ownerDocumentType) newErrors.ownerDocumentType = 'Tipo de documento es requerido';
    if (!formData.ownerDocument) newErrors.ownerDocument = 'Número de documento es requerido';
    if (!ownerExists) {
      if (!formData.ownerFirstName) newErrors.ownerFirstName = 'Nombre es requerido';
      if (!formData.ownerLastName) newErrors.ownerLastName = 'Apellido es requerido';
      if (!formData.ownerEmail) newErrors.ownerEmail = 'Email es requerido';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ownerEmail)) newErrors.ownerEmail = 'Email inválido';
    }
    if (!formData.ownerPhone) newErrors.ownerPhone = 'Teléfono es requerido para notificaciones';
    else if (!/^[0-9+\s()-]{7,15}$/.test(formData.ownerPhone)) newErrors.ownerPhone = 'Número de teléfono inválido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!formData.businessName) newErrors.businessName = 'Nombre del negocio es requerido';
    if (!formData.businessType) newErrors.businessType = 'Tipo de negocio es requerido';
    if (!formData.businessSlug) newErrors.businessSlug = 'Slug es requerido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};
    if (!ownerExists) {
      if (!formData.password) newErrors.password = 'Contraseña es requerida';
      else if (formData.password.length < 8) newErrors.password = 'Mínimo 8 caracteres';
      if (!formData.passwordConfirm) newErrors.passwordConfirm = 'Confirmación es requerida';
      else if (formData.password !== formData.passwordConfirm) newErrors.passwordConfirm = 'Las contraseñas no coinciden';
    }
    if (!termsAccepted) newErrors.terms = 'Debes aceptar los Términos y Condiciones para continuar';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handlePrevStep = () => setStep(step - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep3()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName:      formData.ownerFirstName,
          lastName:       formData.ownerLastName,
          email:          formData.ownerEmail,
          phone:          formData.ownerPhone,
          password:       ownerExists ? undefined : formData.password,
          businessName:   formData.businessName,
          businessTypeId: formData.businessType,
          businessSlug:   formData.businessSlug,
          documentType:   formData.ownerDocumentType,
          documentNumber: formData.ownerDocument,
          ownerExists,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error al registrar');
      setMessage({
        type: 'success',
        text: 'Solicitud enviada exitosamente. Un administrador la revisará pronto. Recibirás un mensaje por WhatsApp cuando sea aprobada.',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Error al registrar',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">IDON - Registro</h1>
        <p className="login-subtitle">Paso {step} de 3</p>

        {message && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
            {message.type === 'success' && (
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={onNavigateToLogin}
                  style={{ width: '100%' }}
                >
                  Ir a Iniciar Sesión
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={step === 3 ? handleSubmit : handleNextStep}>

          {/* --- STEP 1: DATOS DE CLIENTE / OWNER --- */}
          {step === 1 && (
            <>
              <div className="form-row" style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <label>Tipo de Documento *</label>
                  <select
                    name="ownerDocumentType"
                    value={formData.ownerDocumentType}
                    onChange={handleOwnerDocTypeChange}
                  >
                    <option value="cedula">Cédula</option>
                    <option value="passport">Pasaporte</option>
                    <option value="ruc">RUC</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label>Número *</label>
                  <input
                    name="ownerDocument"
                    value={formData.ownerDocument}
                    onChange={handleOwnerDocumentChange}
                    maxLength={formData.ownerDocumentType === "cedula" ? 10 : undefined}
                    required
                  />
                  {ownerSearching && <span>Buscando...</span>}
                  {ownerExists && <span style={{ color: "green" }}>Propietario encontrado ✓</span>}
                  {foundByApi && !ownerExists && (
                    <span style={{ color: "#ff8c42" }}>Precargado desde Registro Civil</span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Nombre</label>
                <input
                  type="text"
                  name="ownerFirstName"
                  value={formData.ownerFirstName}
                  onChange={handleChange}
                  readOnly={ownerExists}
                  disabled={ownerExists}
                  placeholder="Juan"
                  className={errors.ownerFirstName ? 'input-error' : ''}
                />
                {errors.ownerFirstName && <span className="error-text">{errors.ownerFirstName}</span>}
              </div>
              <div className="form-group">
                <label>Apellido</label>
                <input
                  type="text"
                  name="ownerLastName"
                  value={formData.ownerLastName}
                  onChange={handleChange}
                  readOnly={ownerExists}
                  disabled={ownerExists}
                  placeholder="Pérez"
                  className={errors.ownerLastName ? 'input-error' : ''}
                />
                {errors.ownerLastName && <span className="error-text">{errors.ownerLastName}</span>}
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="ownerEmail"
                  value={formData.ownerEmail}
                  onChange={handleChange}
                  readOnly={ownerExists}
                  disabled={ownerExists}
                  placeholder="juan@email.com"
                  className={errors.ownerEmail ? 'input-error' : ''}
                />
                {errors.ownerEmail && <span className="error-text">{errors.ownerEmail}</span>}
              </div>
              <div className="form-group">
                <label>Teléfono <span style={{ color: '#ff8c42' }}>*</span></label>
                <input
                  type="tel"
                  name="ownerPhone"
                  value={formData.ownerPhone}
                  onChange={handleChange}
                  placeholder="0987654321"
                  className={errors.ownerPhone ? 'input-error' : ''}
                />
                {errors.ownerPhone && <span className="error-text">{errors.ownerPhone}</span>}
                <small style={{ color: '#8CB79B', fontSize: 11, marginTop: 3, display: 'block' }}>
                  📱 Recibirás confirmación por WhatsApp
                </small>
              </div>
            </>
          )}

          {/* --- STEP 2: NEGOCIO --- */}
          {step === 2 && (
            <>
              <div className="form-group">
                <label>Nombre del Negocio</label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  placeholder="Mi Restaurante"
                  className={errors.businessName ? 'input-error' : ''}
                />
                {errors.businessName && <span className="error-text">{errors.businessName}</span>}
              </div>

              <div className="form-group">
                <label>Tipo de Negocio</label>
                <select
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleChange}
                  className={errors.businessType ? 'input-error' : ''}
                >
                  <option value="">Selecciona un tipo</option>
                  {businessTypes.map(bt => (
                    <option key={bt.id} value={bt.id}>
                      {bt.icon ? `${bt.icon} ` : ''}{bt.name}
                    </option>
                  ))}
                </select>
                {errors.businessType && <span className="error-text">{errors.businessType}</span>}
              </div>

              <div className="form-group">
                <label>Slug del Negocio</label>
                <input
                  type="text"
                  name="businessSlug"
                  value={formData.businessSlug}
                  onChange={handleChange}
                  placeholder="mi-restaurante"
                  className={errors.businessSlug ? 'input-error' : ''}
                />
                {errors.businessSlug && <span className="error-text">{errors.businessSlug}</span>}
              </div>
            </>
          )}

          {/* Step 3: Password */}
          {step === 3 && !ownerExists && (
            <>
              <div className="form-group">
                <label>Contraseña</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={errors.password ? 'input-error' : ''}
                />
                {errors.password && <span className="error-text">{errors.password}</span>}
              </div>
              <div className="form-group">
                <label>Confirmar Contraseña</label>
                <input
                  type="password"
                  name="passwordConfirm"
                  value={formData.passwordConfirm}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={errors.passwordConfirm ? 'input-error' : ''}
                />
                {errors.passwordConfirm && <span className="error-text">{errors.passwordConfirm}</span>}
              </div>
            </>
          )}
          {step === 3 && ownerExists && (
            <div style={{ margin: "20px 0", color: "#2ecc40" }}>
              El usuario ya existe con este documento. El negocio será asignado a su cuenta.
            </div>
          )}

          {step === 3 && (
            <div style={{ marginTop: '18px' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={e => {
                    setTermsAccepted(e.target.checked);
                    if (errors.terms) setErrors(prev => ({ ...prev, terms: null }));
                  }}
                  style={{ marginTop: '2px', flexShrink: 0 }}
                />
                <span>
                  He leído y acepto los{' '}
                  <a href="/terms-and-conditions" target="_blank" rel="noopener noreferrer" style={{ color: '#0ea5e9', textDecoration: 'underline' }}>
                    Términos y Condiciones
                  </a>
                  {' '}y la{' '}
                  <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: '#0ea5e9', textDecoration: 'underline' }}>
                    Política de Privacidad
                  </a>
                </span>
              </label>
              {errors.terms && <span className="error-text" style={{ display: 'block', marginTop: '4px' }}>{errors.terms}</span>}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            {step > 1 && (
              <button type="button" onClick={handlePrevStep} className="btn-primary" style={{ backgroundColor: '#6c757d' }}>
                Anterior
              </button>
            )}
            <button type="submit" disabled={loading} className="btn-primary" style={{ flex: 1 }}>
              {step === 3 ? (loading ? 'Registrando...' : 'Registrarse') : 'Siguiente'}
            </button>
          </div>
        </form>

        <div className="auth-links">
          <p>¿Ya tienes cuenta? <button onClick={onNavigateToLogin} className="link-button">Inicia sesión aquí</button></p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;