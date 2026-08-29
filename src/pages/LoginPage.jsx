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
import Footer from '../components/common/Footer';
import Input from '../components/General/Input';
import CustomCombobox from '../components/General/CustomCombobox';
import { IconTextButton, ButtonGroup } from '../components/General/Button';

const SYSTEM_LOGO_URL = process.env.PUBLIC_URL + '/system.svg';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { businessSlug: routeBusinessSlug } = useParams();
  const { user, login, selectBusiness, isAuthenticated, requiresBusinessSelection } = useSession();

  const alert = useAlert();

  /* ─── Screen state ─── */
  const [isLogin, setIsLogin] = useState(true);
  const [registroStep, setRegistroStep] = useState(1);

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

  const logo = `${process.env.PUBLIC_URL}/IDON_f.svg`;
  const color = 'var(--bg-secondary)';

  // Slides de propuesta de valor
  const vpSlides = [
    {
      type: 'problem',
      question: '¿AÚN HACES TODOS LOS PROCESOS DE TU NEGOCIO A MANO?',
      answer: 'Eso se acabó con IDON'
    },
    {
      type: 'features',
      title: 'TODO EN UNA SOLA PLATAFORMA',
      items: [
        'POS Retail',
        'POS Restaurante',
        'Inventario',
        'Facturación SRI',
        'Colaboradores',
        'Reportes & CRM',
        'Email Marketing',
        'Cierre de Caja'
      ]
    },
    {
      type: 'ctas',
      buttons: [
        { text: 'DEMO GRATUITA', type: 'primary' },
      ],
      subtext: 'sin tarjeta de crédito o débito',
      benefits: [
        'Facturas Electrónicas Ilimitadas',
        'Todo en la nube',
        'Configura en menos de 1 hora',
        'Soporte al 100%'
      ],
    },
    {
      type: 'faq',
      title: 'PREGUNTAS FRECUENTES',
      items: [
        {
          q: '¿Funciona con la facturación electrónica del SRI?',
          a: 'Sí. IDON Genera documentos electrónicos validados por el SRI automáticamente.'
        }
      ]
    }
  ];

  const [logoIndex, setLogoIndex] = useState(0);
  const [logoColor, setLogoColor] = useState(0);
  const [logoOpacity, setLogoOpacity] = useState(1);
  const [businessLogo, setBusinessLogo] = useState(null);

  const [vpSlideIndex, setVpSlideIndex] = useState(0);
  const [vpSlideOpacity, setVpSlideOpacity] = useState(1);

  // ─── Buscar en API de Ecuador (Registro Civil) ──────────────
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
    const id = setInterval(() => {
      setVpSlideOpacity(0);
      setTimeout(() => {
        setVpSlideIndex(prev => (prev + 1) % vpSlides.length);
        setVpSlideOpacity(1);
      }, 800);
    }, 7000);
    return () => clearInterval(id);
  }, [vpSlides.length]);

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

  // ─── Handler para cambio de tipo de documento ──────────────
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

  // ─── Handler para cambio de número de documento ─────────────
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
          // 2. SI NO ESTÁ EN LA BD, buscar en el Registro Civil
          const civil = await buscarEnAPIEcuador(truncated);
          if (civil && civil.nombres) {
            setRegForm(f => ({
              ...f,
              firstName: civil.nombres || '',
              lastName: civil.apellidos || ''
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
      } catch {
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
          // 2. SI NO ESTÁ EN LA BD, buscar en el Registro Civil (con los primeros 10 dígitos)
          const cedulaBase = truncated.substring(0, 10);
          const civil = await buscarEnAPIEcuador(cedulaBase);
          if (civil && civil.nombres) {
            setRegForm(f => ({
              ...f,
              firstName: civil.nombres || '',
              lastName: civil.apellidos || ''
            }));
            setFoundByApi(true);
            setOwnerExists(false);
            showError('Datos obtenidos de datos público. Completa el registro.', 'info');
          } else {
            setRegForm(f => ({ ...f, firstName: '', lastName: '' }));
            setFoundByApi(false);
            setOwnerExists(false);
            showError('No se encontraron datos. Completa los campos manualmente.', 'info');
          }
        }
      } catch {
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

  // ─── LOGIN CON SESSIONCONTEXT ─────────────────────────────────
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

  // ─── SELECCIONAR NEGOCIO ──────────────────────────────────────
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

  // ─── REGISTRO ──────────────────────────────────────────────────
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
    <div className="login-page" style={{ position: 'relative', paddingBottom: 44 }}>
      <div className="login-container">
        <section className="login-left" aria-hidden="true">
          <div className="color-ring" style={{
            background: `var(--bg-secondary)`
          }} />

          <div className="logo-carousel">
            <img
              src={logo}
              alt="IDON Logo"
              className="login-animated-logo"
              style={{
                filter: `drop-shadow(0 0 28px ${color}cc) drop-shadow(0 0 60px ${color}66)`,
              }}
            />
          </div>

          <div className="logo-wordmark">
            <div className="brand-name">
              <span className="brand-id">ID</span>
              <span className="brand-on">ON</span>
            </div>
            <div className="brand-tagline">Simplemente eficiente</div>
          </div>

          {/* ─── VALUE PROPOSITION SLIDES ─── */}
          <div className="value-proposition" key={`vp-${vpSlideIndex}`} style={{
            opacity: vpSlideOpacity,
            transition: 'opacity 1s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            {vpSlides[vpSlideIndex].type === 'problem' && (
              <div className="vp-slide vp-slide-problem">
                <div className="vp-problem-question">
                  {vpSlides[vpSlideIndex].question}
                </div>
                <div className="vp-problem-answer">
                  {vpSlides[vpSlideIndex].answer}
                </div>
              </div>
            )}

            {vpSlides[vpSlideIndex].type === 'features' && (
              <div className="vp-slide vp-slide-features">
                <div className="vp-features-title">
                  {vpSlides[vpSlideIndex].title}
                </div>
                <div className="vp-features-grid">
                  {vpSlides[vpSlideIndex].items.map((item, idx) => (
                    <div key={idx} className="vp-features-item" style={{
                      animation: `slideInFeature 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.1 + idx * 0.1}s both`
                    }}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {vpSlides[vpSlideIndex].type === 'ctas' && (
              <div className="vp-slide vp-slide-ctas">
                <div className="vp-ctas-buttons">
                  {vpSlides[vpSlideIndex].buttons.map((btn, idx) => (
                    <button 
                      key={idx}
                      className={`vp-cta-btn vp-cta-${btn.type}`}
                      style={{
                        animation: `slideInFeature 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.2 + idx * 0.2}s both`
                      }}
                    >
                      {btn.text}
                    </button>
                  ))}
                </div>
                <div className="vp-ctas-subtext">
                  {vpSlides[vpSlideIndex].subtext}
                </div>
                <div className="vp-ctas-benefits">
                  {vpSlides[vpSlideIndex].benefits.map((benefit, idx) => (
                    <div key={idx} className="vp-ctas-benefit" style={{
                      animation: `slideInFeature 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.6 + idx * 0.1}s both`
                    }}>
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {vpSlides[vpSlideIndex].type === 'faq' && (
              <div className="vp-slide vp-slide-faq">
                <div className="vp-faq-title">
                  {vpSlides[vpSlideIndex].title}
                </div>
                <div className="vp-faq-items">
                  {vpSlides[vpSlideIndex].items.map((item, idx) => (
                    <div key={idx} className="vp-faq-item" style={{
                      animation: `slideInFeature 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.1 + idx * 0.2}s both`
                    }}>
                      <div className="vp-faq-question">{item.q}</div>
                      <div className="vp-faq-answer">{item.a}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <main className="login-right">
          <div className="login-right-inner">
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
                        <label><FiMail size={14} /> EMAIL</label>
                        <Input
                          type="email"
                          value={email}
                          onChange={(value) => setEmail(value)}
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

                     {/* ─── Fila con botón centrado y enlace a la derecha ─── */}
                      <div style={{ 
                        display: 'grid',
                        gridTemplateColumns: '1fr auto 1fr',
                        alignItems: 'center',
                        gap: '16px'
                      }}>
                        {/* Espacio a la izquierda */}

                        {/* Botón "Continuar" centrado */}
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'center',
                          gridColumn: '2'
                        }}>
                          <IconTextButton
                            variant="success"
                            size="md"
                            inline={false}
                            icon={<FiArrowRight size={17} />}
                            onClick={handleLoginSubmit}
                            disabled={loading}
                            title="continuar"
                            block={true}
                            style={{ 
                              maxWidth: '110px',
                              flexShrink: 0
                            }}
                          >
                            {loading ? (
                              <>
                                <span className="spinner" /> Iniciando...
                              </>
                            ) : (
                              'Continuar'
                            )}
                          </IconTextButton>
                        </div>

                        {/* Enlace "Olvidé mi contraseña" a la derecha */}
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'flex-end',
                          gridColumn: '3'
                        }}>
                          <IconTextButton
                            variant="link"
                            size="sm"
                            inline={true}
                            icon={<FiLock size={14} />}
                            onClick={() => navigate('/forgot-password')}
                            title="recuperar contraseña"
                            style={{
                              color: 'var(--text-primary)',
                              fontSize: '0.65rem',
                              fontWeight: 500,
                              background: 'transparent',
                              border: 'none',
                              padding: '0px',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            ¿Olvidaste tu contraseña?
                          </IconTextButton>
                        </div>
                      </div>

                      
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

                      {registroStep === 1 && (
                        <div className="step-content">
                          <div className="grid-2">
                            <div className="form-group">
                              <label><FiCreditCard size={14} /> Tipo de Documento *</label>
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
                              />
                            </div>
                            
                            <div className="form-group">
                              <label><FiCreditCard size={14} /> Número de Documento *</label>
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
                          
                          <div className="form-group">
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
                          
                          <div className="form-group">
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
                          
                          <div className="form-group">
                            <label><FiMail size={14} /> Email *</label>
                            <Input
                              type="email"
                              value={regForm.email}
                              onChange={(value) => setRegForm({ ...regForm, email: value })}
                              placeholder="Email"
                              size="md"
                              disabled={ownerExists || loading}
                              readOnly={ownerExists}
                              required={!ownerExists}
                            />
                          </div>

                          <div className="form-group">
                            <label><FiPhone size={14} /> Teléfono</label>
                            <Input
                              type="tel"
                              value={regForm.phone}
                              onChange={(value) => setRegForm({ ...regForm, phone: value })}
                              placeholder="Teléfono"
                              size="md"
                              disabled={ownerExists || loading}
                              readOnly={ownerExists}
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
                              options={businessTypes.map(bt => ({
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

                      <ButtonGroup>
                        {registroStep > 1 && (
                          <IconTextButton
                            variant=""
                            size="md"
                            inline={true}
                            icon={<FiArrowLeft size={12} />}
                            onClick={handlePrevStep}
                            title="atrás"
                          >
                            Atrás
                          </IconTextButton>
                        )}
                        
                        {registroStep < 3 ? (
                          <IconTextButton
                            variant="success"
                            size="md"
                            inline={true}
                            icon={<FiArrowRight size={12} />}
                            onClick={handleNextStep} 
                            title="siguiente"
                          >
                            Siguiente
                          </IconTextButton>
                        ) : (
                          <IconTextButton
                            variant="success"
                            size="md"
                            inline={true}
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
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <Footer />
      </div>
    </div>
  );
}