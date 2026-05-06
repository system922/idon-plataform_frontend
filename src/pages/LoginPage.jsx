import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  FiEye, FiEyeOff, FiLock, FiMail, FiUser,
  FiPhone, FiArrowRight, FiArrowLeft,
  FiBriefcase, FiCreditCard, FiShield,
  FiTrendingUp, FiBarChart2, FiCheckCircle,
  FiAlertCircle, FiInfo
} from 'react-icons/fi';
import '../styles/LoginPage.css';

const SYSTEM_LOGO_URL = process.env.PUBLIC_URL + '/system.svg';

export default function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { businessSlug: routeBusinessSlug } = useParams();

  /* ─── Screen state ─── */
  const [isLogin, setIsLogin] = useState(true);
  const [registroStep, setRegistroStep] = useState(1);

  /* ─── Business selector state ─── */
  const [showBusinessSelector, setShowBusinessSelector] = useState(false);
  const [availableBusinesses, setAvailableBusinesses] = useState([]);
  const [pendingToken, setPendingToken] = useState(null);
  const [pendingUser, setPendingUser] = useState(null);
  const [selectingBusiness, setSelectingBusiness] = useState(false);

  /* ─── Login fields ─── */
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [businessSlugInput, setBusinessSlugInput] = useState('');
  const [remember, setRemember] = useState(true);

  /* ─── Register fields ─── */
  const [regForm, setRegForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    documentType: 'cedula', documentNumber: '',
    businessName: '', businessTypeId: '',
    password: '', confirmPassword: '', termsAccepted: false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    login: false, register: false, confirm: false
  });

  // Ref para timer de error
  const errorTimerRef = useRef(null);

  /* ─── Owner lookup state ─── */
  const [ownerExists, setOwnerExists] = useState(false);
  const [ownerSearching, setOwnerSearching] = useState(false);
  const [foundByApi, setFoundByApi] = useState(false);

  /* ─── Business types from API ─── */
  const [businessTypes, setBusinessTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [errorTypes, setErrorTypes] = useState('');

  /* ─── Logo carousel ─── */
  const logos = [
    `${process.env.PUBLIC_URL}/IDON_1.svg`,
    `${process.env.PUBLIC_URL}/IDON_2.svg`,
    `${process.env.PUBLIC_URL}/IDON_3.svg`
  ];
  const colors = ['#ff8c42', '#8CB79B', '#FF6B9D', '#00D4FF'];

  const [logoIndex, setLogoIndex] = useState(0);
  const [logoColor, setLogoColor] = useState(0);
  const [logoOpacity, setLogoOpacity] = useState(1);
  const [businessLogo, setBusinessLogo] = useState(null);

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  // Función para mostrar mensaje de error
  const showError = (message, type = 'general') => {
    // Limpiar timer anterior
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    
    setError(message);
    setErrorType(type);
    
    // Auto-limpiar después de 5 segundos
    errorTimerRef.current = setTimeout(() => {
      setError('');
      setErrorType('');
    }, 5000);
  };

  /* smooth logo cross-fade */
  useEffect(() => {
    const id = setInterval(() => {
      setLogoOpacity(0);
      setTimeout(() => {
        setLogoIndex(prev => (prev + 1) % logos.length);
        setLogoOpacity(1);
      }, 600);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  /* color cycle */
  useEffect(() => {
    const id = setInterval(() => {
      setLogoColor(prev => (prev + 1) % colors.length);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  /* business data */
  useEffect(() => {
    const saved = localStorage.getItem('business_logo') || SYSTEM_LOGO_URL;
    if (saved) setBusinessLogo(saved);

    try {
      const biz = sessionStorage.getItem('selectedBusiness');
      if (biz) {
        const d = JSON.parse(biz);
        setBusinessSlugInput(d.businessSlug || d.id);
        sessionStorage.removeItem('selectedBusiness');
        return;
      }
    } catch {}

    const q = new URLSearchParams(location.search);
    const id = routeBusinessSlug || q.get('b');
    if (id) setBusinessSlugInput(id);
  }, []);

  /* ─── Fetch business types when user reaches step 2 ─── */
  useEffect(() => {
    if (!isLogin && registroStep === 2 && businessTypes.length === 0) {
      setLoadingTypes(true);
      setErrorTypes('');
      const API_BASE = process.env.REACT_APP_API_BASE || 'https://idon-plataform-backend.onrender.com';
      fetch(`${API_BASE}/api/business-types`)
        .then(r => {
          if (!r.ok) throw new Error('No se pudieron cargar los tipos de negocio');
          return r.json();
        })
        .then(data => {
          const arr = Array.isArray(data) ? data : (data.data || []);
          setBusinessTypes(arr);
        })
        .catch(e => setErrorTypes(e.message))
        .finally(() => setLoadingTypes(false));
    }
  }, [isLogin, registroStep]);

  /* ─── Ecuador civil registry API ─── */
  async function buscarEnAPIEcuador(cedula) {
    try {
      const proxyUrl = 'https://infoplacas.herokuapp.com/';
      const targetUrl = 'https://si.secap.gob.ec/sisecap/logeo_web/json/busca_persona_registro_civil.php';
      const res = await fetch(proxyUrl + targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ documento: cedula, tipo: '1' })
      });
      if (!res.ok) return null;
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  }

  /* ─── Document type change: reset dependent fields ─── */
  const handleDocTypeChange = (e) => {
    setRegForm(f => ({
      ...f,
      documentType: e.target.value,
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

  /* ─── Document number change: lookup owner then API ─── */
  const handleDocumentNumberChange = async (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
    setRegForm(f => ({ ...f, documentNumber: value }));

    if (regForm.documentType === 'cedula' && value.length === 10) {
      setOwnerSearching(true);
      setOwnerExists(false);
      setFoundByApi(false);
      setError('');
      try {
        const API_BASE = process.env.REACT_APP_API_BASE || 'https://idon-plataform-backend.onrender.com';
        const res = await fetch(`${API_BASE}/api/business-owners/find?type=cedula&number=${value}`);
        const data = await res.json();

        if (res.ok && data.exists && data.owner) {
          setRegForm(f => ({
            ...f,
            firstName: data.owner.first_name || '',
            lastName:  data.owner.last_name  || '',
            email:     data.owner.email      || '',
            phone:     data.owner.phone      || ''
          }));
          setOwnerExists(true);
          showError('⚠️ Usuario ya existe en la plataforma. Se cargarán sus datos automáticamente.', 'info');
        } else {
          const civil = await buscarEnAPIEcuador(value);
          if (civil && civil.nombres) {
            setRegForm(f => ({
              ...f,
              firstName: civil.nombres   || '',
              lastName:  civil.apellidos || ''
            }));
            setFoundByApi(true);
          } else {
            setRegForm(f => ({ ...f, firstName: '', lastName: '' }));
            setFoundByApi(false);
          }
          setOwnerExists(false);
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

  /* ─── Route resolver by user type ─── */
  const resolveRouteByType = (type, user) => {
    if (type === 'admin_idon' || type === 'admin') return '/admin/dashboard';
    if (type === 'schema_employee' && user?.businessId) return '/app/dashboard';
    if (type === 'business_user' || !user?.businessId) return '/pending-approval';
    return '/app/dashboard';
  };

  // ------------------------------------
  // AUTENTICACIÓN Y GUARDADO DE USUARIO
  // ------------------------------------
  const _commitLogin = (token, user, backendType) => {
    const schemaName = user.schemaName || user.schema || user.tenant || '';

    const userToStore = {
      ...user,
      token,
      type: backendType,
      userType: user?.userType || backendType,
      role: backendType === 'owner' ? 'owner' :
            backendType === 'admin' ? 'admin' :
            backendType === 'admin_idon' ? 'admin_idon' :
            backendType === 'schema_employee' ? (user?.roleCode || 'employee') :
            (user?.role || 'user'),
      schemaName
    };

    localStorage.setItem('idonUser', JSON.stringify(userToStore));
    localStorage.setItem('idonToken', token);

    if (user?.businessId) {
      localStorage.setItem('dbName', schemaName);
      localStorage.setItem('selectedBusiness', JSON.stringify({
        id: user.businessId,
        slug: user.businessSlug,
        schemaName: schemaName,
      }));
    }
    if (onLogin) onLogin(userToStore);
    navigate(resolveRouteByType(backendType, user), { replace: true });
  };

  // Limpiar campos de login
  const clearLoginFields = () => {
    setEmail('');
    setPassword('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Validar campos
    if (!email || !password) {
      showError('❌ Por favor ingresa tu correo y contraseña.', 'general');
      return;
    }
    
    setLoading(true);
    setError('');
    setErrorType('');
    
    try {
      const API_BASE = process.env.REACT_APP_API_BASE || 'https://idon-plataform-backend.onrender.com';
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, business: businessSlugInput || null })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setLoading(false);
        
        // Mostrar mensaje de error según el código de estado
        if (res.status === 401) {
          const errorMessage = data.message || data.error || 'Credenciales inválidas';
          
          if (errorMessage.toLowerCase().includes('password') || 
              errorMessage.toLowerCase().includes('contraseña')) {
            showError('❌ Contraseña incorrecta. Por favor, verifica tu contraseña.', 'password');
            setPassword('');
          } else if (errorMessage.toLowerCase().includes('email') || 
                     errorMessage.toLowerCase().includes('usuario')) {
            showError('❌ Usuario no encontrado. Verifica tu correo electrónico o regístrate.', 'user');
            setEmail('');
            setPassword('');
          } else {
            showError(`❌ ${errorMessage}`, 'general');
          }
        } else if (res.status === 403) {
          showError('⛔ Acceso denegado. Tu cuenta podría estar inactiva o requerir aprobación.', 'general');
        } else if (res.status === 429) {
          showError('⏳ Demasiados intentos. Por favor espera unos minutos.', 'general');
        } else {
          showError(`❌ Error del servidor (${res.status}). Por favor intenta más tarde.`, 'general');
        }
        return;
      }
      
      const payload = data.data;
      setLoading(false);

      // Multi-business
      if (payload.requiresBusinessSelection && payload.businesses?.length > 1) {
        setPendingToken(payload.token);
        setPendingUser(payload.user);
        setAvailableBusinesses(payload.businesses);
        setShowBusinessSelector(true);
        return;
      }

      // ✅ ÉXITO: Redirigir directamente
      _commitLogin(payload.token, payload.user, payload.type ?? payload.user?.userType);
      
    } catch (err) {
      setLoading(false);
      showError(`❌ Error de conexión. Verifica tu internet e intenta nuevamente.`, 'general');
    }
  };

  const handleSelectBusiness = async (businessId) => {
    setSelectingBusiness(true); 
    setError('');
    try {
      const API_BASE = process.env.REACT_APP_API_BASE || 'https://idon-plataform-backend.onrender.com';
      const res = await fetch(`${API_BASE}/api/auth/select-business`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${pendingToken}`,
        },
        body: JSON.stringify({ businessId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al seleccionar negocio');
      
      _commitLogin(data.data.token, data.data.user, 'owner');
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
      const API_BASE = process.env.REACT_APP_API_BASE || 'https://idon-plataform-backend.onrender.com';
      const body = {
        firstName:      regForm.firstName,
        lastName:       regForm.lastName,
        email:          regForm.email,
        phone:          regForm.phone,
        businessName:   regForm.businessName,
        businessTypeId: regForm.businessTypeId,
        documentType:   regForm.documentType,
        documentNumber: regForm.documentNumber,
        ownerExists,
      };
      if (!ownerExists) body.password = regForm.password;

      const res = await fetch(`${API_BASE}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al registrarse');
      
      showError('✅ ¡Solicitud enviada exitosamente! Un administrador la revisará en breve.', 'success');
      setTimeout(() => {
        setRegForm({
          firstName:'', lastName:'', email:'', phone:'',
          documentType:'cedula', documentNumber:'',
          businessName:'', businessTypeId:'',
          password:'', confirmPassword:'', termsAccepted:false
        });
        setOwnerExists(false);
        setFoundByApi(false);
        setRegistroStep(1);
        setIsLogin(true);
        setError('');
      }, 3000);
    } catch (err) {
      setLoading(false);
      showError(err?.message || 'Error al registrarse. Por favor intenta nuevamente.', 'general');
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
      showError('⚠️ Por favor completa todos los campos requeridos antes de continuar.', 'info');
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
    clearLoginFields();
    setRegForm({
      firstName:'', lastName:'', email:'', phone:'',
      documentType:'cedula', documentNumber:'',
      businessName:'', businessTypeId:'',
      password:'', confirmPassword:'', termsAccepted:false
    });
  };

  const switchToLogin = () => { 
    setIsLogin(true); 
    setError('');
    setErrorType('');
    clearLoginFields();
  };

  /* ─── Step progress helper ─── */
  const stepStatus = (n) => {
    if (registroStep > n)  return 'done';
    if (registroStep === n) return 'active';
    return 'idle';
  };

  const currentColor = colors[logoColor];

  const getErrorIcon = () => {
    switch(errorType) {
      case 'password': return <FiLock size={16} />;
      case 'user': return <FiUser size={16} />;
      case 'info': return <FiInfo size={16} />;
      case 'success': return <FiCheckCircle size={16} />;
      default: return <FiAlertCircle size={16} />;
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">

        {/* ═══ LEFT ═══ */}
        <section className="login-left" aria-hidden="true">
          <div className="color-ring" style={{
            background: `radial-gradient(ellipse 60% 60% at 30% 40%, ${currentColor}18 0%, transparent 70%),
                         radial-gradient(ellipse 50% 50% at 75% 70%, rgba(140,183,155,.1) 0%, transparent 65%)`
          }} />

          <div className="logo-carousel">
            <img
              src={logos[logoIndex]}
              alt="IDON Logo"
              className="animated-logo"
              style={{
                opacity: logoOpacity,
                filter: `drop-shadow(0 0 28px ${currentColor}cc) drop-shadow(0 0 60px ${currentColor}66)`,
                transition: 'opacity .6s ease, filter 1.2s ease'
              }}
            />
          </div>

          <div className="logo-wordmark">
            <div className="brand-name" data-text="IDON">IDON</div>
            <div className="brand-tagline">Sistema de Gestión Multi-Negocios</div>
          </div>

          <div className="feature-list">
            {[
              { Icon: FiTrendingUp,  label: 'Gestión integral de negocios' },
              { Icon: FiShield,      label: 'Seguridad empresarial' },
              { Icon: FiBarChart2,   label: 'Analytics en tiempo real' }
            ].map(({ Icon, label }) => (
              <div className="feature-item" key={label}>
                <div className="feature-icon-wrap"><Icon size={16} /></div>
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className="color-indicators">
            {colors.map((c, i) => (
              <div
                key={i}
                className={`color-dot ${i === logoColor ? 'active' : ''}`}
                style={{ backgroundColor: c, boxShadow: i === logoColor ? `0 0 10px ${c}` : 'none' }}
              />
            ))}
          </div>
        </section>

        {/* ═══ RIGHT ═══ */}
        <main className="login-right">
          <div className="login-right-inner">
            <div className="form-container">

              {showBusinessSelector ? (
                <div className="auth-form" key="biz-selector">
                  <h3 className="form-title">Selecciona tu negocio</h3>
                  <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: 16 }}>
                    Hola <strong style={{ color: '#fff' }}>{pendingUser?.firstName}</strong>, tienes{' '}
                    <strong style={{ color: '#ff8c42' }}>{availableBusinesses.length}</strong> negocios registrados.
                    ¿Con cuál deseas trabajar hoy?
                  </p>

                  {error && (
                    <div className={`alert alert-${errorType === 'info' ? 'info' : errorType === 'success' ? 'success' : 'error'}`}>
                      {getErrorIcon()} {error}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {availableBusinesses.map(biz => (
                      <button
                        key={biz.id}
                        type="button"
                        onClick={() => handleSelectBusiness(biz.id)}
                        disabled={selectingBusiness}
                        className="business-selector-btn"
                      >
                        <div className="business-selector-avatar">
                          {biz.name?.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="business-selector-name">{biz.name}</div>
                          <div className="business-selector-type">{biz.business_type || biz.slug}</div>
                        </div>
                        <FiArrowRight size={16} className="business-selector-arrow" />
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowBusinessSelector(false);
                      setPendingToken(null);
                      setPendingUser(null);
                      setAvailableBusinesses([]);
                      setError('');
                      setErrorType('');
                      clearLoginFields();
                    }}
                    className="back-to-login-btn"
                  >
                    ← Volver al inicio de sesión
                  </button>
                </div>
              ) : (
                <>
                  <div className="form-tabs">
                    <button className={`tab ${isLogin ? 'active' : ''}`} onClick={switchToLogin}>
                      Iniciar Sesión
                    </button>
                    <button className={`tab ${!isLogin ? 'active' : ''}`} onClick={switchToRegister}>
                      Registrarse
                    </button>
                  </div>

                  {isLogin ? (
                    <form onSubmit={handleLoginSubmit} className="auth-form" key="login">
                      <h3 className="form-title">Bienvenido/a</h3>

                      {error && (
                        <div className={`alert alert-${errorType === 'info' ? 'info' : 'error'}`}>
                          {getErrorIcon()} {error}
                        </div>
                      )}

                      <div className="form-group">
                        <label><FiMail size={14} /> Correo Electrónico</label>
                        <input
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="tu@email.com"
                          required
                          disabled={loading}
                          className={errorType === 'user' ? 'input-error' : ''}
                        />
                      </div>

                      <div className="form-group">
                        <label><FiLock size={14} /> Contraseña</label>
                        <div className="password-input">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            disabled={loading}
                            className={errorType === 'password' ? 'input-error' : ''}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            tabIndex={-1}
                            className="password-toggle"
                            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                          >
                            {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                          </button>
                        </div>
                      </div>

                      <div className="check-row">
                        <input
                          type="checkbox"
                          id="remember"
                          checked={remember}
                          onChange={e => setRemember(e.target.checked)}
                        />
                        <label htmlFor="remember">Recordarme</label>
                      </div>

                      <button type="submit" disabled={loading} className="btn-submit">
                        {loading ? <><span className="spinner" /> Iniciando...</> : <>Continuar <FiArrowRight size={17} /></>}
                      </button>
                    </form>
                  ) : (
                    <form
                      onSubmit={registroStep === 3 ? handleRegisterSubmit : e => e.preventDefault()}
                      className="auth-form"
                      key="register"
                    >
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

                      <h3 className="form-title">
                        {registroStep === 1 && 'Tu información'}
                        {registroStep === 2 && 'Tu negocio'}
                        {registroStep === 3 && 'Seguridad'}
                      </h3>

                      {error && (
                        <div className={`alert alert-${errorType === 'info' ? 'info' : errorType === 'success' ? 'success' : 'error'}`}>
                          {getErrorIcon()} {error}
                        </div>
                      )}

                      {/* STEP 1 */}
                      {registroStep === 1 && (
                        <div className="step-content">
                          <div className="grid-2">
                            <div className="form-group">
                              <div className="input-with-icon">
                                <FiCreditCard size={14} className="input-icon" />
                                <select value={regForm.documentType} onChange={handleDocTypeChange}>
                                  <option value="cedula">Cédula</option>
                                  <option value="passport">Pasaporte</option>
                                  <option value="ruc">RUC</option>
                                </select>
                              </div>
                            </div>
                            <div className="form-group">
                              <div className="input-with-icon">
                                <FiCreditCard size={14} className="input-icon" />
                                <input
                                  type="text"
                                  value={regForm.documentNumber}
                                  onChange={handleDocumentNumberChange}
                                  placeholder="Número de documento"
                                  maxLength={regForm.documentType === 'cedula' ? 10 : 20}
                                  required
                                />
                              </div>
                              {ownerSearching && <small style={{ color: '#aaa' }}>Buscando...</small>}
                            </div>
                          </div>

                          <div className="grid-2">
                            <div className="form-group">
                              <div className="input-with-icon">
                                <FiUser size={14} className="input-icon" />
                                <input
                                  type="text"
                                  value={regForm.firstName}
                                  onChange={e => setRegForm({ ...regForm, firstName: e.target.value })}
                                  placeholder="Nombres"
                                  readOnly={ownerExists}
                                  disabled={ownerExists}
                                  required
                                />
                              </div>
                            </div>
                            <div className="form-group">
                              <div className="input-with-icon">
                                <FiUser size={14} className="input-icon" />
                                <input
                                  type="text"
                                  value={regForm.lastName}
                                  onChange={e => setRegForm({ ...regForm, lastName: e.target.value })}
                                  placeholder="Apellidos"
                                  readOnly={ownerExists}
                                  disabled={ownerExists}
                                  required
                                />
                              </div>
                            </div>
                          </div>

                          <div className="form-group">
                            <div className="input-with-icon">
                              <FiMail size={14} className="input-icon" />
                              <input
                                type="email"
                                value={regForm.email}
                                onChange={e => setRegForm({ ...regForm, email: e.target.value })}
                                placeholder="Email"
                                readOnly={ownerExists}
                                disabled={ownerExists}
                                required={!ownerExists}
                              />
                            </div>
                          </div>

                          <div className="form-group">
                            <div className="input-with-icon">
                              <FiPhone size={14} className="input-icon" />
                              <input
                                type="tel"
                                value={regForm.phone}
                                onChange={e => setRegForm({ ...regForm, phone: e.target.value })}
                                placeholder="Teléfono"
                                readOnly={ownerExists}
                                disabled={ownerExists}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {registroStep === 2 && (
                        <div className="step-content">
                          <div className="form-group">
                            <label><FiBriefcase size={14} /> Nombre del Negocio *</label>
                            <input
                              type="text"
                              value={regForm.businessName}
                              onChange={e => setRegForm({ ...regForm, businessName: e.target.value })}
                              placeholder="Mi Negocio"
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label><FiBriefcase size={14} /> Tipo de Negocio *</label>
                            {errorTypes && (
                              <small className="hint-error" style={{ marginBottom: 6, display: 'block' }}>
                                ⚠️ {errorTypes}
                              </small>
                            )}
                            <select
                              value={regForm.businessTypeId}
                              onChange={e => setRegForm({ ...regForm, businessTypeId: e.target.value })}
                              required
                              disabled={loadingTypes}
                            >
                              <option value="">
                                {loadingTypes ? 'Cargando tipos...' : 'Selecciona un tipo'}
                              </option>
                              {businessTypes.map(bt => (
                                <option key={bt.id ?? bt.slug ?? bt.name} value={bt.id ?? bt.slug}>
                                  {bt.icon ? `${bt.icon} ` : ''}{bt.name}
                                </option>
                              ))}
                            </select>
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
                                <label><FiLock size={14} /> Contraseña (Mín. 8 caracteres)</label>
                                <div className="password-input">
                                  <input
                                    type={showPasswords.register ? 'text' : 'password'}
                                    value={regForm.password}
                                    onChange={e => setRegForm({ ...regForm, password: e.target.value })}
                                    placeholder="••••••••"
                                    required
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPasswords({ ...showPasswords, register: !showPasswords.register })}
                                    tabIndex={-1}
                                    className="password-toggle"
                                    aria-label={showPasswords.register ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                  >
                                    {showPasswords.register ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                  </button>
                                </div>
                              </div>
                              <div className="form-group">
                                <label><FiLock size={14} /> Confirmar Contraseña</label>
                                <div className="password-input">
                                  <input
                                    type={showPasswords.confirm ? 'text' : 'password'}
                                    value={regForm.confirmPassword}
                                    onChange={e => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                                    placeholder="••••••••"
                                    required
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                    tabIndex={-1}
                                    className="password-toggle"
                                    aria-label={showPasswords.confirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                  >
                                    {showPasswords.confirm ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                  </button>
                                </div>
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

                      <div className="step-buttons">
                        {registroStep > 1 && (
                          <button type="button" onClick={handlePrevStep} className="btn-secondary">
                            <FiArrowLeft size={17} /> Atrás
                          </button>
                        )}
                        {registroStep < 3 ? (
                          <button type="button" onClick={handleNextStep} className="btn-submit">
                            Siguiente <FiArrowRight size={17} />
                          </button>
                        ) : (
                          <button type="submit" disabled={loading || !isStep3Valid()} className="btn-submit">
                            {loading ? <><span className="spinner" /> Registrando...</> : <>Crear Cuenta <FiArrowRight size={17} /></>}
                          </button>
                        )}
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}