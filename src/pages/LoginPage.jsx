// ========== src/pages/LoginPage.js ==========
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { useAlert } from '../components/ConfirmContext';
import { api } from '../config/api';
import {
  FiLock, FiMail, FiUser,
  FiPhone, FiArrowRight, FiArrowLeft,
  FiBriefcase, FiCreditCard, FiCheckCircle,
  FiAlertCircle, FiInfo
} from 'react-icons/fi';
import Input from '../components/General/Input';
import LoadingOverlay from '../components/General/LoadingOverlay';
import CustomCombobox from '../components/General/CustomCombobox';
import { IconTextButton, ButtonGroup } from '../components/General/Button';

const SYSTEM_LOGO_URL = process.env.PUBLIC_URL + '/system.svg';
const WORKER_URL = 'https://proxy-cors.system-design-ec.workers.dev/';
const REMEMBERED_LOGIN_EMAIL_KEY = 'idon_login_remembered_email';
const REGISTER_EMAIL_PATTERN = /^[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.[A-Z]{2,}$/i;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { businessSlug: routeBusinessSlug } = useParams();
  const { user, login, selectBusiness, isAuthenticated, requiresBusinessSelection } = useSession();

  const alert = useAlert();

  /* ─── Screen state ─── */
  const [isLogin, setIsLogin] = useState(true);
  const [registroStep, setRegistroStep] = useState(1);
  const [showCookieBanner, setShowCookieBanner] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  /* ─── Business selector state ─── */
  const [showBusinessSelector, setShowBusinessSelector] = useState(false);
  const [availableBusinesses, setAvailableBusinesses] = useState([]);
  const [selectingBusiness, setSelectingBusiness] = useState(false);

  /* ─── Login fields ─── */
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessSlugInput, setBusinessSlugInput] = useState('');

  /* ─── Register fields ─── */
  const [regForm, setRegForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    documentType: 'cedula', documentNumber: '',
    businessName: '', businessTypeId: '',
    password: '', confirmPassword: '', termsAccepted: false
  });
  const [registerEmailTouched, setRegisterEmailTouched] = useState(false);
  const registerEmailFormatIsInvalid =
    regForm.email.length > 0 && !REGISTER_EMAIL_PATTERN.test(regForm.email);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState('');

  const errorTimerRef = useRef(null);

  const [ownerExists, setOwnerExists] = useState(false);
  const [ownerSearching, setOwnerSearching] = useState(false);
  const [foundByApi, setFoundByApi] = useState(false);

  const [businessTypes, setBusinessTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [errorTypes, setErrorTypes] = useState('');

  const logo = `${process.env.PUBLIC_URL}/IDON_3.png`;

  const [logoIndex, setLogoIndex] = useState(0);
  const [logoColor, setLogoColor] = useState(0);
  const [logoOpacity, setLogoOpacity] = useState(1);
  const [businessLogo, setBusinessLogo] = useState(null);

  // ─── NUEVA FUNCIÓN: Buscar en tu Worker Unificado ──────────────
  async function buscarEnWorker(documento) {
    try {
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documento })
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (error) {
      console.error("Error consultando Worker:", error);
      return null;
    }
  }

  // ─── Separar "APELLIDOS NOMBRES" en variables independientes ───
  function separarNombreCompleto(nombreCompleto) {
    if (!nombreCompleto) return { nombres: '', apellidos: '' };
    
    // Todo a mayúsculas y separado por espacios
    const partes = nombreCompleto.trim().toUpperCase().split(/\s+/);
    
    // Lógica basada en la cantidad de palabras (Formato Ecuador)
    if (partes.length === 4) {
      return {
        apellidos: `${partes[0]} ${partes[1]}`,
        nombres: `${partes[2]} ${partes[3]}`
      };
    } else if (partes.length === 3) {
      return {
        apellidos: `${partes[0]} ${partes[1]}`,
        nombres: partes[2]
      };
    } else if (partes.length === 2) {
      return {
        apellidos: partes[0],
        nombres: partes[1]
      };
    }
    
    // Fallback si tiene más o menos palabras
    return { nombres: nombreCompleto, apellidos: '' };
  }

  // ─── Validación de cédula ecuatoriana ──────────────────────
  const validarCedulaEcuatoriana = (cedula) => {
    if (cedula.length !== 10) return false;
    if (!/^\d+$/.test(cedula)) return false;
    
    const provincia = parseInt(cedula.substring(0, 2));
    if (provincia < 1 || provincia > 24) return false;
    
    const tercerDigito = parseInt(cedula[2]);
    if (tercerDigito < 0 || tercerDigito > 6) return false;
    
    const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    let suma = 0;
    for (let i = 0; i < 9; i++) {
      let digito = parseInt(cedula[i]) * coeficientes[i];
      if (digito > 9) digito -= 9;
      suma += digito;
    }
    const digitoVerificador = parseInt(cedula[9]);
    const digitoCalculado = (10 - (suma % 10)) % 10;
    
    return digitoVerificador === digitoCalculado;
  };

  const validarRucEcuatoriano = (ruc) => {
    if (ruc.length !== 13) return false;
    if (!/^\d+$/.test(ruc)) return false;
    
    const provincia = parseInt(ruc.substring(0, 2));
    if (provincia < 1 || provincia > 24) return false;
    
    const tercerDigito = parseInt(ruc[2]);
    if (tercerDigito < 0 || tercerDigito > 9) return false;
    
    if (tercerDigito <= 5) {
      const cedula = ruc.substring(0, 10);
      return validarCedulaEcuatoriana(cedula);
    }
    
    const coeficientes = [4, 3, 2, 7, 6, 5, 4, 3, 2];
    let suma = 0;
    for (let i = 0; i < 9; i++) {
      const digito = parseInt(ruc[i]);
      suma += digito * coeficientes[i];
    }
    
    const digitoVerificador = parseInt(ruc[9]);
    const digitoCalculado = (11 - (suma % 11)) % 11;
    const digitoFinal = digitoCalculado === 11 ? 0 : digitoCalculado;
    const ultimosDigitos = ruc.substring(10, 13);
    
    if (tercerDigito === 6 || tercerDigito === 9) {
      return digitoFinal === digitoVerificador && ultimosDigitos === '001';
    }
    
    return false;
  };

  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (localStorage.getItem('idon_cookies_accepted') === null) {
      setShowCookieBanner(true);
    }
  }, []);

  useEffect(() => {
    const rememberedEmail = localStorage.getItem(REMEMBERED_LOGIN_EMAIL_KEY);
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleAcceptCookies = () => {
    localStorage.setItem('idon_cookies_accepted', 'true');
    setShowCookieBanner(false);
  };

  const showError = (message, type = 'general') => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setError(message);
    setErrorType(type);
    errorTimerRef.current = setTimeout(() => {
      setError('');
      setErrorType('');
    }, 5000);
  };

  useEffect(() => {
    const saved = localStorage.getItem('business_logo') || SYSTEM_LOGO_URL;
    if (saved) setBusinessLogo(saved);
  }, []);

  useEffect(() => {
    if (!isLogin && registroStep === 2 && businessTypes.length === 0) {
      setLoadingTypes(true);
      setErrorTypes('');
      api.get('/business-types')
        .then(response => {
          const data = response.data;
          const arr = Array.isArray(data) ? data : (data.data || []);
          setBusinessTypes(arr);
        })
        .catch(e => setErrorTypes(e.message))
        .finally(() => setLoadingTypes(false));
    }
  }, [isLogin, registroStep]);

  const handleDocTypeChange = (value) => {
    setRegForm(f => ({
      ...f,
      documentType: value,
      documentNumber: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: ''
    }));
    setOwnerExists(false);
    setFoundByApi(false);
    setError('');
  };

  const handleDocumentNumberChange = async (value) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    let maxLength = regForm.documentType === 'ruc' ? 13 : 10;
    const truncated = cleaned.slice(0, maxLength);
    
    setRegForm(f => ({ ...f, documentNumber: truncated }));

    if (regForm.documentType === 'cedula' && truncated.length === 10) {
      if (!validarCedulaEcuatoriana(truncated)) {
        showError('Cédula inválida. Verifica el número.', 'document');
        setOwnerSearching(false);
        return;
      }

      setOwnerSearching(true);
      setOwnerExists(false);
      setFoundByApi(false);
      setError('');
      
      try {
        // 1. PRIMERO: Buscar en la base de datos de IDON
        const response = await api.get(`/business-owners/find?type=cedula&number=${truncated}`);
        const data = response.data;

        if (data.exists && data.owner) {
          setRegForm(f => ({
            ...f,
            firstName: data.owner.first_name || '',
            lastName: data.owner.last_name || '',
            email: data.owner.email || '',
            phone: data.owner.phone || ''
          }));
          setOwnerExists(true);
          showError('Usuario ya existe en la plataforma. Se cargarán sus datos automáticamente.', 'info');
        } else {
          // 2. SI NO ESTÁ EN LA BD, buscar en el Worker
          const civil = await buscarEnWorker(truncated);
          if (civil && civil.nombre) {
            const { nombres, apellidos } = separarNombreCompleto(civil.nombre);
            setRegForm(f => ({
              ...f,
              firstName: nombres || '',
              lastName: apellidos || ''
            }));
            setFoundByApi(true);
            setOwnerExists(false);
            showError('Datos obtenidos de datos públicos. Completa el registro.', 'info');
          } else {
            setRegForm(f => ({ ...f, firstName: '', lastName: '' }));
            setFoundByApi(false);
            setOwnerExists(false);
            showError('No se encontraron datos públicos. Completa los campos manualmente.', 'info');
          }
        }
      } catch (error) {
        setOwnerExists(false);
        setFoundByApi(false);
      } finally {
        setOwnerSearching(false);
      }
    } else if (regForm.documentType === 'ruc' && truncated.length === 13) {
      if (!validarRucEcuatoriano(truncated)) {
        showError('RUC inválido. Verifica el número.', 'document');
        setOwnerSearching(false);
        return;
      }

      setOwnerSearching(true);
      setOwnerExists(false);
      setFoundByApi(false);
      setError('');
      
      try {
        // 1. PRIMERO: Buscar en la base de datos de IDON
        const response = await api.get(`/business-owners/find?type=ruc&number=${truncated}`);
        const data = response.data;

        if (data.exists && data.owner) {
          setRegForm(f => ({
            ...f,
            firstName: data.owner.first_name || '',
            lastName: data.owner.last_name || '',
            email: data.owner.email || '',
            phone: data.owner.phone || ''
          }));
          setOwnerExists(true);
          showError('Usuario ya existe en la plataforma. Se cargarán sus datos automáticamente.', 'info');
        } else {
          // 2. SI NO ESTÁ EN LA BD, buscar. 
          // Como es RUC, tomamos los primeros 10 dígitos para buscar a la persona natural dueña
          const cedulaBase = truncated.substring(0, 10);
          const civil = await buscarEnWorker(cedulaBase);
          
          if (civil && civil.nombre) {
            const { nombres, apellidos } = separarNombreCompleto(civil.nombre);
            setRegForm(f => ({
              ...f,
              firstName: nombres || '',
              lastName: apellidos || ''
            }));
            setFoundByApi(true);
            setOwnerExists(false);
            showError('Datos obtenidos de datos públicos. Completa el registro.', 'info');
          } else {
            setRegForm(f => ({ ...f, firstName: '', lastName: '' }));
            setFoundByApi(false);
            setOwnerExists(false);
            showError('No se encontraron datos. Completa los campos manualmente.', 'info');
          }
        }
      } catch (error) {
        setOwnerExists(false);
        setFoundByApi(false);
      } finally {
        setOwnerSearching(false);
      }
    } else if (truncated.length < (regForm.documentType === 'ruc' ? 13 : 10)) {
      setOwnerExists(false);
      setFoundByApi(false);
      setRegForm(f => ({ ...f, firstName: '', lastName: '', email: '', phone: '' }));
      setError('');
    }
  };

  const isStep1Valid = () => {
    if (!regForm.documentType || regForm.documentNumber.trim().length < 6) return false;
    if (!regForm.firstName.trim() || !regForm.lastName.trim()) return false;
    if (!ownerExists && !regForm.email.includes('@')) return false;
    return true;
  };
  
  const isStep2Valid = () => regForm.businessName.trim() && regForm.businessTypeId;
  
  const isStep3Valid = () => {
    if (ownerExists) return regForm.termsAccepted;
    return (
      regForm.password.length >= 8 &&
      regForm.password === regForm.confirmPassword &&
      regForm.termsAccepted
    );
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      showError('Por favor ingresa tu correo y contraseña.', 'general');
      return;
    }
    
    setLoading(true);
    setError('');
    setErrorType('');
    
    try {
      const result = await login(email, password);
      
      if (result.success) {
        const businesses = result.businesses || [];
        const requiresSelection = result.requiresBusinessSelection || false;
        
        if ((requiresSelection || businesses.length > 1) && businesses.length > 0) {
          setAvailableBusinesses(businesses);
          setShowBusinessSelector(true);
          setLoading(false);
          return;
        }
        
        if (result.user?.userType === 'admin_idon') {
          navigate('/admin/dashboard', { replace: true });
        } else {
          navigate('/app', { replace: true });
        }
      } else {
        const mappedError = getLoginErrorState(result.error);
        showError(mappedError.message, mappedError.type);
      }
    } catch (err) {
      const mappedError = getLoginErrorState(err?.response?.data?.message || err?.message || 'Error al iniciar sesión');
      showError(mappedError.message, mappedError.type);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBusiness = async (businessId) => {
    setSelectingBusiness(true);
    setError('');
    
    try {
      const result = await selectBusiness(businessId);
      
      if (result.success) {
        setShowBusinessSelector(false);
        navigate('/app', { replace: true });
      } else {
        showError(result.error || 'Error al seleccionar negocio', 'general');
      }
    } catch (err) {
      showError(err?.message || 'Error al seleccionar negocio', 'general');
    } finally {
      setSelectingBusiness(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const body = {
        firstName: regForm.firstName,
        lastName: regForm.lastName,
        email: regForm.email,
        phone: regForm.phone,
        businessName: regForm.businessName,
        businessTypeId: regForm.businessTypeId,
        documentType: regForm.documentType,
        documentNumber: regForm.documentNumber,
        ownerExists,
        foundByApi,
      };
      if (!ownerExists) body.password = regForm.password;

      const response = await api.post('/register', body);
      
      if (response.data?.ok) {
        await alert.success(
          `¡Solicitud enviada exitosamente! Un administrador la revisará en breve.`,
          'Registro de Negocio'
        );
        setTimeout(() => {
          setRegForm({
            firstName: '', lastName: '', email: '', phone: '',
            documentType: 'cedula', documentNumber: '',
            businessName: '', businessTypeId: '',
            password: '', confirmPassword: '', termsAccepted: false
          });
          setOwnerExists(false);
          setFoundByApi(false);
          setRegistroStep(1);
          setIsLogin(true);
          setError('');
        }, 3000);
      }
    } catch (err) {
      setLoading(false);
      showError(err?.response?.data?.message || 'Error al registrarse', 'general');
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    if (registroStep === 1 && isStep1Valid()) {
      setRegistroStep(2);
      setError('');
    } else if (registroStep === 2 && isStep2Valid()) {
      setRegistroStep(3);
      setError('');
    } else {
      showError('Por favor completa todos los campos requeridos antes de continuar.', 'info');
    }
  };

  const handlePrevStep = () => {
    if (registroStep > 1) {
      setRegistroStep(registroStep - 1);
      setError('');
    }
  };

  const switchToRegister = () => {
    setIsLogin(false);
    setRegistroStep(1);
    setError('');
    setErrorType('');
    setRegForm({
      firstName: '', lastName: '', email: '', phone: '',
      documentType: 'cedula', documentNumber: '',
      businessName: '', businessTypeId: '',
      password: '', confirmPassword: '', termsAccepted: false
    });
    setOwnerExists(false);
    setFoundByApi(false);
  };

  const switchToLogin = () => {
    setIsLogin(true);
    setError('');
    setErrorType('');
  };

  const stepStatus = (n) => {
    if (registroStep > n) return 'done';
    if (registroStep === n) return 'active';
    return 'idle';
  };

  const getErrorIcon = () => {
    switch(errorType) {
      case 'password': return <FiLock size={16} />;
      case 'user': return <FiUser size={16} />;
      case 'document': return <FiCreditCard size={16} />;
      case 'info': return <FiInfo size={16} />;
      case 'success': return <FiCheckCircle size={16} />;
      default: return <FiAlertCircle size={16} />;
    }
  };

  const getLoginErrorState = (message = '') => {
    const text = String(message || '').trim();
    if (!text) {
      return { message: 'Credenciales inválidas', type: 'user' };
    }

    const normalized = text.toLowerCase();

    if (
      normalized.includes('usuario no registrado') ||
      normalized.includes('user not registered') ||
      normalized.includes('no existe') ||
      normalized.includes('no registrado') ||
      normalized.includes('not found')
    ) {
      return { message: text, type: 'user' };
    }

    if (
      normalized.includes('invalid credentials') ||
      normalized.includes('credenciales inválidas') ||
      normalized.includes('contraseña incorrecta') ||
      normalized.includes('password') ||
      normalized.includes('contraseña')
    ) {
      return { message: 'La contraseña es incorrecta.', type: 'password' };
    }

    if (normalized.includes('inactivo')) {
      return { message: text, type: 'user' };
    }

    return { message: text, type: 'general' };
  };

  return (
    <div className={`login-page ${isLogin ? 'login-mode' : 'register-mode'}${showCookieBanner ? ' has-cookie-banner' : ''}`} style={{ position: 'relative' }}>
      <div className="login-container split-layout">
        <section className="login-left image-panel-left">
          <div className="login-visual-content image-content">
            <h1>IDON CONTROL</h1>
            <p className="login-visual-description">SIMPLEMENTE EFICIENTE</p>
            <button
              type="button"
              className="login-switch-button"
              onClick={isLogin ? switchToRegister : switchToLogin}
            >
              {isLogin ? 'REGISTRARME' : 'INICIAR SESIÓN'}
            </button>
          </div>
          <svg
            className="curve-svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M 100 0 L 85 0 C 60 20, 60 80, 85 100 L 100 100 Z" fill="#ffffff" />
          </svg>
        </section>
        <main className="login-right form-panel-right">
          <div className="login-right-inner">
            <div className="login-form-brand">
              <img src={logo} alt="IDON" />
            </div>
            <div className="form-container">
              {showBusinessSelector ? (
                <div className="auth-form" key="biz-selector">
                  <h3 className="form-title">Selecciona tu negocio</h3>
                  <p style={{ color: '#2c2b2b', fontSize: '0.85rem', marginBottom: 16 }}>
                    Tienes <strong>{availableBusinesses.length}</strong> negocios registrados.
                    ¿A qué negocio deseas acceder?
                  </p>

                  {error && (
                    <div className={`alert alert-${errorType === 'info' ? 'info' : errorType === 'success' ? 'success' : 'error'}`}>
                      {getErrorIcon()} {error}
                    </div>
                  )}

                  {selectingBusiness ? (
                    <div className="spinner-overlay" style={{ 
                      position: 'relative',
                      minHeight: '300px',
                      background: 'transparent',
                      zIndex: 'auto'
                    }}>
                      <div className="spinner-brand">
                        <div className="spinner-loader spinner-loader-lg spinner-primary" />
                        <div className="brand-text">
                          ID<span className="highlight">ON</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {availableBusinesses.map((biz, index) => (
                        <button
                          key={biz.id}
                          type="button"
                          onClick={() => handleSelectBusiness(biz.id)}
                          disabled={selectingBusiness}
                          className="business-selector-btn"
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          <div className="business-selector-avatar">
                            {biz.name?.charAt(0).toUpperCase() || biz.slug?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="business-selector-name">{biz.name || biz.slug}</div>
                            <div className="business-selector-type">
                              {biz.business_type || biz.business_type_name || 'Negocio'}
                            </div>
                          </div>
                          <FiArrowRight size={18} className="business-selector-arrow" />
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setShowBusinessSelector(false);
                      setAvailableBusinesses([]);
                      setError('');
                      setErrorType('');
                    }}
                    style={{
                      marginTop: 20,
                      background: 'none',
                      border: 'none',
                      color: '#888',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      transition: 'color 0.2s',
                      display: 'block',
                      width: '100%',
                      textAlign: 'center',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ff8c42'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
                  >
                    ← Volver al inicio de sesión
                  </button>
                </div>
              ) : (
                <>
                  {isLogin ? (
                    <form onSubmit={handleLoginSubmit} className="auth-form" key="login">
                      <h3 className="form-title">¡Bienvenido!</h3>

                      {error && (
                        <div className={`alert alert-${errorType === 'info' ? 'info' : 'error'}`}>
                          {getErrorIcon()} {error}
                        </div>
                      )}

                      <div className="form-group">
                        <label><FiMail size={14} /> USUARIO</label>
                        <Input
                          type="email"
                          value={email}
                          onChange={(value) => {
                            setEmail(value);
                            if (rememberMe) {
                              if (value) {
                                localStorage.setItem(REMEMBERED_LOGIN_EMAIL_KEY, value);
                              } else {
                                localStorage.removeItem(REMEMBERED_LOGIN_EMAIL_KEY);
                              }
                            }
                          }}
                          placeholder="Ej: miemail@email.com"
                          size="md"
                          disabled={loading}
                          className={errorType === 'user' ? 'input-error' : ''}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label><FiLock size={14} /> CONTRASEÑA</label>
                        <Input
                          type="password"
                          value={password}
                          onChange={(value) => setPassword(value)}
                          placeholder="••••••••"
                          size="md"
                          disabled={loading}
                          className={errorType === 'password' ? 'input-error' : ''}
                          required
                        />
                      </div>

                      <div className="login-options">
                        <label className="remember-me" htmlFor="remember-login">
                          <input
                            id="remember-login"
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(event) => {
                              const checked = event.target.checked;
                              setRememberMe(checked);
                              if (checked && email) {
                                localStorage.setItem(REMEMBERED_LOGIN_EMAIL_KEY, email);
                              } else if (!checked) {
                                localStorage.removeItem(REMEMBERED_LOGIN_EMAIL_KEY);
                              }
                            }}
                          />
                          <span>Recuérdame</span>
                        </label>
                        <div className="forgot-password-link">
                          <IconTextButton
                            variant="link"
                            size="sm"
                            inline={true}
                            onClick={() => navigate('/forgot-password')}
                            title="recuperar contraseña"
                            className="forgot-password-button"
                          >
                            ¿Olvidaste tu contraseña?
                          </IconTextButton>
                        </div>
                      </div>

                      <div className="login-actions">
                        <IconTextButton
                          variant="primary"
                          size="md"
                          icon={<FiArrowRight size={17} />}
                          onClick={handleLoginSubmit}
                          disabled={loading}
                          title="continuar"
                          block={true}
                          className="login-submit-button"
                        >
                          Continuar
                        </IconTextButton>
                      </div>
                      {loading && (
                        <LoadingOverlay 
                          message="Iniciando sesión..."
                          backgroundColor="var(--bg-secondary)"
                          textColor="var(--text-primary)"
                          mutedColor="var(--text-muted)"
                          spinnerColor="#ff8c42"
                        />
                      )}
                    </form>
                  ) : (
                    <form
                      onSubmit={registroStep === 3 ? handleRegisterSubmit : e => e.preventDefault()}
                      className="auth-form"
                      key="register"
                    >
                      <h3 className="form-title register-main-heading">Regístrate</h3>
                      <div className="register-progress">
                        {[1,2,3].map((n, i) => (
                          <React.Fragment key={n}>
                            <div className={`progress-step ${stepStatus(n)}`}>
                              {registroStep > n ? <FiCheckCircle size={16} /> : n}
                            </div>
                            {i < 2 && (
                              <div className={`progress-connector ${registroStep > n ? 'done' : 'idle'}`} />
                            )}
                          </React.Fragment>
                        ))}
                      </div>

                      <h3 className="form-title register-step-title">
                        {registroStep === 1 && 'Tu información'}
                        {registroStep === 2 && 'Tu negocio'}
                        {registroStep === 3 && 'Seguridad'}
                      </h3>

                      {error && (
                        <div className={`alert alert-${errorType === 'info' ? 'info' : errorType === 'success' ? 'success' : 'error'}`}>
                          {getErrorIcon()} {error}
                        </div>
                      )}

                      {registroStep === 1 && (
                        <div className="step-content step-content-personal-info">
                          <div className="grid-2 register-document-fields">
                            <div className="form-group register-document-type-field">
                              <label><FiCreditCard size={14} /> T. Documento *</label>
                              <CustomCombobox
                                options={[
                                  { value: 'cedula', label: 'Cédula' },
                                  { value: 'passport', label: 'Pasaporte' },
                                  { value: 'ruc', label: 'RUC' }
                                ]}
                                value={regForm.documentType}
                                onChange={handleDocTypeChange}
                                placeholder="Selecciona tipo de documento"
                                size="md"
                                className="custom-combobox-full"
                                disabled={loading}
                                forceDropup={false} 
                              />
                            </div>
                            
                            <div className="form-group register-document-number-field">
                              <label><FiCreditCard size={14} /> N. Documento *</label>
                              <Input
                                type="text"
                                value={regForm.documentNumber}
                                onChange={handleDocumentNumberChange}
                                placeholder="Número de documento"
                                size="md"
                                disabled={loading}
                                required
                                className={errorType === 'document' ? 'input-error' : ''}
                                error={errorType === 'document' ? error : ''}
                              />
                              {ownerSearching && <small style={{ color: '#aaa' }}>Buscando...</small>}
                            </div>
                          </div>
                          
                          <div className="form-group register-first-name-field">
                            <label><FiUser size={14} /> Nombres *</label>
                            <Input
                              type="text"
                              value={regForm.firstName}
                              onChange={(value) => setRegForm({ ...regForm, firstName: value })}
                              placeholder="Nombres"
                              size="md"
                              disabled={ownerExists || loading}
                              readOnly={ownerExists || foundByApi}
                              required
                            />
                          </div>
                          
                          <div className="form-group register-last-name-field">
                            <label><FiUser size={14} /> Apellidos *</label>
                            <Input
                              type="text"
                              value={regForm.lastName}
                              onChange={(value) => setRegForm({ ...regForm, lastName: value })}
                              placeholder="Apellidos"
                              size="md"
                              disabled={ownerExists || loading}
                              readOnly={ownerExists || foundByApi}
                              required
                            />
                          </div>
                          
                          <div className="form-group register-email-field">
                            <label><FiMail size={14} /> Email *</label>
                            <Input
                              type="email"
                              value={regForm.email}
                              onChange={(value) => setRegForm({ ...regForm, email: value })}
                              onBlur={() => setRegisterEmailTouched(true)}
                              placeholder="Email"
                              size="md"
                              disabled={ownerExists || loading}
                              readOnly={ownerExists}
                              required={!ownerExists}
                              pattern={"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\\.[A-Za-z0-9-]+)*\\.[A-Za-z]{2,}"}
                              aria-invalid={registerEmailTouched && registerEmailFormatIsInvalid}
                              error={
                                registerEmailTouched && registerEmailFormatIsInvalid
                                  ? 'Ingresa un correo válido (usuario@dominio.com).'
                                  : ''
                              }
                            />
                          </div>

                          <div className="form-group register-phone-field">
                            <label><FiPhone size={14} /> Teléfono</label>
                            <Input
                              type="tel"
                              value={regForm.phone}
                              onChange={(value) =>
                                setRegForm({
                                  ...regForm,
                                  phone: value.replace(/\D/g, '').slice(0, 10)
                                })
                              }
                              placeholder="Teléfono"
                              size="md"
                              disabled={ownerExists || loading}
                              readOnly={ownerExists}
                              inputMode="numeric"
                              maxLength={10}
                              pattern="[0-9]{0,10}"
                            />
                          </div>
                        </div>
                      )}

                      {registroStep === 2 && (
                        <div className="step-content">
                          <div className="form-group">
                            <label><FiBriefcase size={14} /> Nombre del Negocio *</label>
                            <Input
                              type="text"
                              value={regForm.businessName}
                              onChange={(value) => setRegForm({ ...regForm, businessName: value })}
                              placeholder="Mi Negocio"
                              size="md"
                              disabled={loading}
                              required
                            />
                          </div>
                          
                          <div className="form-group">
                            <label><FiBriefcase size={14} /> Tipo de Negocio *</label>
                            {errorTypes && (
                              <small className="hint-error" style={{ marginBottom: 6, display: 'block' }}>
                                {errorTypes}
                              </small>
                            )}
                            <CustomCombobox
                              options={businessTypes.filter(bt => bt.is_active !== false).map(bt => ({
                                value: bt.id ?? bt.slug ?? bt.name,
                                label: bt.icon ? `${bt.icon} ${bt.name}` : bt.name
                              }))}
                              value={regForm.businessTypeId}
                              onChange={(value) => setRegForm({ ...regForm, businessTypeId: value })}
                              placeholder={loadingTypes ? 'Cargando tipos...' : 'Selecciona un tipo'}
                              disabled={loadingTypes || loading}
                              size="md"
                              className="custom-combobox-full"
                            />
                          </div>
                        </div>
                      )}

                      {registroStep === 3 && (
                        <div className="step-content">
                          {ownerExists ? (
                            <div style={{ padding: '12px 0' }}>
                              <div className="alert alert-info" style={{ background: 'rgba(240,165,0,.12)', borderColor: '#f0a500', color: '#f0a500' }}>
                                <FiCheckCircle size={16} style={{ marginRight: 8 }} />
                                El negocio será registrado bajo la cuenta existente de <strong>{regForm.firstName} {regForm.lastName}</strong>.
                                No necesitas crear una nueva contraseña.
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="form-group">
                                <label><FiLock size={14} /> Contraseña (Mín. 8 caracteres) *</label>
                                <Input
                                  type="password"
                                  value={regForm.password}
                                  onChange={(value) => setRegForm({ ...regForm, password: value })}
                                  placeholder="••••••••"
                                  size="md"
                                  disabled={loading}
                                  required
                                />
                              </div>
                              
                              <div className="form-group">
                                <label><FiLock size={14} /> Confirmar Contraseña *</label>
                                <Input
                                  type="password"
                                  value={regForm.confirmPassword}
                                  onChange={(value) => setRegForm({ ...regForm, confirmPassword: value })}
                                  placeholder="••••••••"
                                  size="md"
                                  disabled={loading}
                                  required
                                />
                                {regForm.password && regForm.confirmPassword && regForm.password !== regForm.confirmPassword && (
                                  <small className="hint-error">Las contraseñas no coinciden</small>
                                )}
                              </div>
                            </>
                          )}
                          
                          <div className="check-row" style={{ marginTop:'12px', alignItems: 'flex-start' }}>
                            <input
                              type="checkbox"
                              id="terms"
                              checked={regForm.termsAccepted}
                              onChange={e => setRegForm({ ...regForm, termsAccepted: e.target.checked })}
                              style={{ marginTop: 3 }}
                            />
                            <label htmlFor="terms" style={{ lineHeight: '1.4' }}>
                              He leído y acepto los{' '}
                              <a
                                href="/terms-and-conditions"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#ff8c42', textDecoration: 'underline' }}
                                onClick={e => e.stopPropagation()}
                              >
                                Términos y Condiciones
                              </a>
                              {' '}de uso de la plataforma
                            </label>
                          </div>
                        </div>
                      )}

                      <ButtonGroup style={{ marginTop: 24, width: '100%', justifyContent: 'center' }}>
                        {registroStep > 1 && (
                          <IconTextButton
                            variant=""
                            size="md"
                            icon={<FiArrowLeft size={17} />}
                            onClick={handlePrevStep}
                            title="atrás"
                          >
                            Atrás
                          </IconTextButton>
                        )}
                        
                        {registroStep < 3 ? (
                          <IconTextButton
                            variant="primary"
                            size="md"
                            icon={<FiArrowRight size={17} />}
                            onClick={handleNextStep} 
                            title="siguiente"
                          >
                            Siguiente
                          </IconTextButton>
                        ) : (
                          <IconTextButton
                            variant="primary"
                            size="md"
                            icon={<FiArrowRight size={17} />}
                            onClick={handleRegisterSubmit}
                            disabled={loading || !isStep3Valid()}
                            title="crear cuenta"
                            type="submit"
                          >
                            {loading ? (
                              <>
                                <span className="spinner" /> Registrando...
                              </>
                            ) : (
                              'Crear Cuenta'
                            )}
                          </IconTextButton>
                        )}
                      </ButtonGroup>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
      {showCookieBanner && (
        <aside className="cookie-banner" aria-label="Aviso de cookies">
          <div className="cookie-banner-copy">
            <h2 id="cookie-banner-title">Aviso de cookies</h2>
            <p className="cookie-banner-message">
              Usamos cookies para mejorar tu experiencia.
            </p>
          </div>
          <div className="cookie-banner-actions">
            <label className="cookie-banner-consent">
              <input type="checkbox" />
              <span>Acepto cookies</span>
            </label>
            <button className="cookie-banner-accept" type="button" onClick={handleAcceptCookies}>
              Aceptar
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}