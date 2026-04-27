import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  FiEye, FiEyeOff, FiLock, FiMail, FiUser,
  FiPhone, FiArrowRight, FiArrowLeft,
  FiBriefcase, FiCreditCard, FiShield,
  FiTrendingUp, FiBarChart2, FiCheckCircle
} from 'react-icons/fi';
import '../styles/LoginPage.css';

const SYSTEM_LOGO_URL = process.env.PUBLIC_URL + '/system.svg';
const LOGOS = [
  `${process.env.PUBLIC_URL}/IDON_1.svg`,
  `${process.env.PUBLIC_URL}/IDON_2.svg`,
  `${process.env.PUBLIC_URL}/IDON_3.svg`,
];
const COLORS = ['#ff8c42', '#8CB79B', '#FF6B9D', '#00D4FF'];

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
  const [pendingToken, setPendingToken] = useState(null);    // token without businessId
  const [pendingUser, setPendingUser] = useState(null);      // user without businessId
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
  const [showPasswords, setShowPasswords] = useState({
    login: false, register: false, confirm: false
  });

  /* ─── Owner lookup state ─── */
  const [ownerExists, setOwnerExists] = useState(false);
  const [ownerSearching, setOwnerSearching] = useState(false);
  const [, setFoundByApi] = useState(false);

  /* ─── Business types from API ─── */
  const [businessTypes, setBusinessTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [errorTypes, setErrorTypes] = useState('');

  /* ─── Logo carousel ─── */

  const [logoIndex, setLogoIndex] = useState(0);
  const [logoColor, setLogoColor] = useState(0);
  const [logoOpacity, setLogoOpacity] = useState(1);
  const [, setBusinessLogo] = useState(null);

  /* smooth logo cross-fade */
  useEffect(() => {
    const id = setInterval(() => {
      setLogoOpacity(0);
      setTimeout(() => {
        setLogoIndex(prev => (prev + 1) % LOGOS.length);
        setLogoOpacity(1);
      }, 600);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  /* color cycle */
  useEffect(() => {
    const id = setInterval(() => {
      setLogoColor(prev => (prev + 1) % COLORS.length);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Fetch business types when user reaches step 2 ─── */
  useEffect(() => {
    if (!isLogin && registroStep === 2 && businessTypes.length === 0) {
      setLoadingTypes(true);
      setErrorTypes('');
      const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4000';
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
  }, [isLogin, registroStep, businessTypes.length]);

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
        const API_BASE = process.env.REACT_APP_API_BASE || 'hhttps://idon-plataform-backend.onrender.com';
        const res = await fetch(`${API_BASE}/api/business-owners/find?type=cedula&number=${value}`);
        const data = await res.json();

        if (res.ok && data.exists && data.owner) {
          // Propietario ya registrado → cargar datos y avisar
          setRegForm(f => ({
            ...f,
            firstName: data.owner.first_name || '',
            lastName:  data.owner.last_name  || '',
            email:     data.owner.email      || '',
            phone:     data.owner.phone      || ''
          }));
          setOwnerExists(true);
          setError('Ud existe en los registros de la plataforma.');
        } else {
          // No registrado
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
    if (type === 'admin_idon' || type === 'admin') return '/admin/panel';
    // Empleados de esquema (nivel 3): van directo al panel de negocio
    if (type === 'schema_employee' && user?.businessId) return '/app/dashboard';
    // Usuario sin negocio aprobado → página de espera
    if (type === 'business_user' || !user?.businessId) return '/pending-approval';
    return '/app/dashboard';
  };

  // ------------------------------------
  // AUTENTICACIÓN Y GUARDADO DE USUARIO
  // ------------------------------------
  const _commitLogin = (token, user, backendType) => {
    const schemaName =
      user.schemaName ||
      user.schema ||
      user.tenant ||
      '';

    const userToStore = {
      ...user,
      token,
      type: backendType,
      userType: user?.userType || backendType,
      role:
        backendType === 'owner'           ? 'owner' :
        backendType === 'admin'           ? 'admin' :
        backendType === 'admin_idon'      ? 'admin_idon' :
        backendType === 'schema_employee' ? (user?.roleCode || 'employee') :
        (user?.role || 'user'),
      schemaName
    };

    localStorage.setItem('idonUser', JSON.stringify(userToStore));
    localStorage.setItem('idonToken', token);

    if (user?.businessId) {
      localStorage.setItem('dbName', schemaName);
      localStorage.setItem('selectedBusiness', JSON.stringify({
        id:         user.businessId,
        slug:       user.businessSlug,
        schemaName: schemaName,
      }));
    }
    if (onLogin) onLogin(userToStore);
    navigate(resolveRouteByType(backendType, user), { replace: true });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4000';
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, business: businessSlugInput || null })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al iniciar sesión');
      const payload = data.data;

      // Multi-business: show selector before navigating
      if (payload.requiresBusinessSelection && payload.businesses?.length > 1) {
        setPendingToken(payload.token);
        setPendingUser(payload.user);
        setAvailableBusinesses(payload.businesses);
        setShowBusinessSelector(true);
        return;
      }

      _commitLogin(payload.token, payload.user, payload.type ?? payload.user?.userType);
    } catch (err) {
      setError(err?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBusiness = async (businessId) => {
    setSelectingBusiness(true); setError('');
    try {
      const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4000';
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
      setError(err?.message || 'Error al seleccionar negocio');
    } finally {
      setSelectingBusiness(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4000';
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
      setError('✅ Solicitud enviada. Un administrador la revisará pronto.');
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
      setError(err?.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    if (registroStep === 1 && isStep1Valid())      { setRegistroStep(2); setError(''); }
    else if (registroStep === 2 && isStep2Valid()) { setRegistroStep(3); setError(''); }
    else setError('Por favor completa todos los campos requeridos');
  };

  const handlePrevStep = () => {
    if (registroStep > 1) { setRegistroStep(registroStep - 1); setError(''); }
  };

  const switchToRegister = () => {
    setIsLogin(false); setRegistroStep(1); setError('');
    setRegForm({
      firstName:'', lastName:'', email:'', phone:'',
      documentType:'cedula', documentNumber:'',
      businessName:'', businessTypeId:'',
      password:'', confirmPassword:'', termsAccepted:false
    });
  };

  const switchToLogin = () => { setIsLogin(true); setError(''); };

  /* ─── Step progress helper ─── */
  const stepStatus = (n) => {
    if (registroStep > n)  return 'done';
    if (registroStep === n) return 'active';
    return 'idle';
  };

  const currentColor = COLORS[logoColor];

  return (
    <div className="login-page">
      <div className="login-container">

        {/* ═══ LEFT ═══ */}
        <section className="login-left" aria-hidden="true">

          {/* dynamic ambient overlay */}
          <div className="color-ring" style={{
            background: `radial-gradient(ellipse 60% 60% at 30% 40%, ${currentColor}18 0%, transparent 70%),
                         radial-gradient(ellipse 50% 50% at 75% 70%, rgba(140,183,155,.1) 0%, transparent 65%)`
          }} />

          {/* Logo */}
          <div className="logo-carousel">
            <img
              src={LOGOS[logoIndex]}
              alt="IDON Logo"
              className="animated-logo"
              style={{
                opacity: logoOpacity,
                filter: `drop-shadow(0 0 28px ${currentColor}cc) drop-shadow(0 0 60px ${currentColor}66)`,
                transition: 'opacity .6s ease, filter 1.2s ease'
              }}
            />
          </div>

          {/* Brand name */}
          <div className="logo-wordmark">
            <div className="brand-name" data-text="IDON">IDON</div>
            <div className="brand-tagline">Sistema de Gestión Multi-Negocios</div>
          </div>

          {/* Features (ahora con react-icons) */}
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

          {/* Color dots */}
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

              {/* ── BUSINESS SELECTOR (shown after multi-business login) ── */}
              {showBusinessSelector ? (
                <div className="auth-form" key="biz-selector">
                  <h3 className="form-title">Selecciona tu negocio</h3>
                  <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: 16 }}>
                    Hola <strong style={{ color: '#fff' }}>{pendingUser?.firstName}</strong>, tienes{' '}
                    <strong style={{ color: '#ff8c42' }}>{availableBusinesses.length}</strong> negocios registrados.
                    ¿Con cuál deseas trabajar hoy?
                  </p>

                  {error && <div className="alert alert-error">⚠️ {error}</div>}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {availableBusinesses.map(biz => (
                      <button
                        key={biz.id}
                        type="button"
                        onClick={() => handleSelectBusiness(biz.id)}
                        disabled={selectingBusiness}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 10, padding: '12px 16px',
                          cursor: selectingBusiness ? 'not-allowed' : 'pointer',
                          textAlign: 'left', transition: 'border-color .2s, background .2s',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = '#ff8c42';
                          e.currentTarget.style.background = 'rgba(255,140,66,0.08)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                          e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                        }}
                      >
                        <div style={{
                          width: 40, height: 40, borderRadius: 8,
                          background: 'linear-gradient(135deg,#ff8c42,#e06420)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 18, fontWeight: 700, color: '#fff', flexShrink: 0,
                        }}>
                          {biz.name?.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {biz.name}
                          </div>
                          <div style={{ color: '#888', fontSize: '0.78rem', marginTop: 2 }}>
                            {biz.business_type || biz.slug}
                          </div>
                        </div>
                        <FiArrowRight size={16} style={{ color: '#ff8c42', flexShrink: 0 }} />
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowBusinessSelector(false);
                      setPendingToken(null); setPendingUser(null);
                      setAvailableBusinesses([]); setError('');
                    }}
                    style={{
                      marginTop: 16, background: 'none', border: 'none',
                      color: '#888', cursor: 'pointer', fontSize: '0.85rem',
                    }}
                  >
                    ← Volver al inicio de sesión
                  </button>
                </div>
              ) : (
              <>
              {/* Tabs */}
              <div className="form-tabs">
                <button className={`tab ${isLogin ? 'active' : ''}`} onClick={switchToLogin}>
                  Iniciar Sesión
                </button>
                <button className={`tab ${!isLogin ? 'active' : ''}`} onClick={switchToRegister}>
                  Registrarse
                </button>
              </div>

              {/* ── LOGIN ── */}
              {isLogin ? (
                <form onSubmit={handleLoginSubmit} className="auth-form" key="login">
                  <h3 className="form-title">Bienvenido/a</h3>

                  {error && <div className="alert alert-error">⚠️ {error}</div>}

                  <div className="form-group">
                    <label><FiMail size={14} /> Correo Electrónico</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      required
                      disabled={loading}
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
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                        className="password-toggle"
                      >
                        {showPassword ? <FiEyeOff size={17} /> : <FiEye size={17} />}
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
                /* ── REGISTER ── */
                <form
                  onSubmit={registroStep === 3 ? handleRegisterSubmit : e => e.preventDefault()}
                  className="auth-form"
                  key="register"
                >
                  {/* Step progress */}
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

                  {error && <div className="alert alert-error">⚠️ {error}</div>}

                  {/* STEP 1 */}
                  {registroStep === 1 && (
                    <div className="step-content">
                      {/* Documento primero */}
                      <div className="grid-2">
                        <div className="form-group">
                          <label><FiCreditCard size={14} /> Tipo de Documento *</label>
                          <select
                            value={regForm.documentType}
                            onChange={handleDocTypeChange}
                          >
                            <option value="cedula">Cédula</option>
                            <option value="passport">Pasaporte</option>
                            <option value="ruc">RUC</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label><FiCreditCard size={14} /> Número *</label>
                          <input
                            type="text"
                            value={regForm.documentNumber}
                            onChange={handleDocumentNumberChange}
                            placeholder="1234567890"
                            maxLength={regForm.documentType === 'cedula' ? 10 : 20}
                            required
                          />
                          {ownerSearching && (
                            <small style={{ color: '#aaa' }}>Buscando...</small>
                          )}

                        </div>
                      </div>

                      {/* Nombre y Apellido */}
                      <div className="grid-2">
                        <div className="form-group">
                          <label><FiUser size={14} /> Nombre</label>
                          <input
                            type="text"
                            value={regForm.firstName}
                            onChange={e => setRegForm({ ...regForm, firstName: e.target.value })}
                            placeholder="Juan"
                            readOnly={ownerExists}
                            disabled={ownerExists}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label><FiUser size={14} /> Apellido</label>
                          <input
                            type="text"
                            value={regForm.lastName}
                            onChange={e => setRegForm({ ...regForm, lastName: e.target.value })}
                            placeholder="Pérez"
                            readOnly={ownerExists}
                            disabled={ownerExists}
                            required
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label><FiMail size={14} /> Correo Electrónico{ownerExists ? '' : ' *'}</label>
                        <input
                          type="email"
                          value={regForm.email}
                          onChange={e => setRegForm({ ...regForm, email: e.target.value })}
                          placeholder="tu@email.com"
                          readOnly={ownerExists}
                          disabled={ownerExists}
                          required={!ownerExists}
                        />
                      </div>
                      <div className="form-group">
                        <label><FiPhone size={14} /> Teléfono (Opcional)</label>
                        <input
                          type="tel"
                          value={regForm.phone}
                          onChange={e => setRegForm({ ...regForm, phone: e.target.value })}
                          placeholder="+593 99 000 0000"
                          readOnly={ownerExists}
                          disabled={ownerExists}
                        />
                      </div>
                    </div>
                  )}

                  {/* STEP 2 */}
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

                  {/* STEP 3 */}
                  {registroStep === 3 && (
                    <div className="step-content">
                      {ownerExists ? (
                        /* Propietario existente: solo confirmar */
                        <div style={{ padding: '12px 0' }}>
                          <div className="alert alert-error" style={{ background: 'rgba(240,165,0,.12)', borderColor: '#f0a500', color: '#f0a500' }}>
                            <FiCheckCircle size={16} style={{ marginRight: 8 }} />
                            El negocio será registrado bajo la cuenta existente de <strong>{regForm.firstName} {regForm.lastName}</strong>.
                            No necesitas crear una nueva contraseña.
                          </div>
                        </div>
                      ) : (
                        /* Usuario nuevo: requiere contraseña */
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
                              >
                                {showPasswords.register ? <FiEyeOff size={17} /> : <FiEye size={17} />}
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
                              >
                                {showPasswords.confirm ? <FiEyeOff size={17} /> : <FiEye size={17} />}
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

                  {/* Nav buttons */}
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
                        {loading
                          ? <><span className="spinner" /> Registrando...</>
                          : <>Crear Cuenta <FiArrowRight size={17} /></>
                        }
                      </button>
                    )}
                  </div>
                </form>
              )}
              </>
              )} {/* end showBusinessSelector ternary */}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
