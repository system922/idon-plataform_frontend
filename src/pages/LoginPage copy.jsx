import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  FiEye, FiEyeOff, FiLock, FiMail, FiUser,
  FiPhone, FiArrowRight, FiArrowLeft,
  FiBriefcase, FiCreditCard, FiShield,
  FiTrendingUp, FiBarChart2, FiCheckCircle,
  FiAlertCircle, FiInfo
} from 'react-icons/fi';
import Footer from '../components/common/Footer';
import Input from '../components/General/Input';
import CustomCombobox from '../components/General/CustomCombobox';
import Button, { IconTextButton, ButtonGroup } from '../components/General/Button';

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

  const errorTimerRef = useRef(null);

  const [ownerExists, setOwnerExists] = useState(false);
  const [ownerSearching, setOwnerSearching] = useState(false);
  const [foundByApi, setFoundByApi] = useState(false);

  const [businessTypes, setBusinessTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [errorTypes, setErrorTypes] = useState('');

  const logos = [
    `${process.env.PUBLIC_URL}/IDON_1.svg`,
    `${process.env.PUBLIC_URL}/IDON_2.svg`,
  ];
  const colors = ['#f97316', '#f97316', '#f97316', '#f97316'];

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
        { text: 'DEMO GRATUITO', type: 'primary' },
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
          a: 'Sí. IDON está integrado con el SRI para Ecuador. Genera documentos electrónicos validados automáticamente.'
        }
      ]
    }
  ];

  const [logoIndex, setLogoIndex] = useState(0);
  const [logoColor, setLogoColor] = useState(0);
  const [logoOpacity, setLogoOpacity] = useState(1);
  const [businessLogo, setBusinessLogo] = useState(null);

  /* ─── Value Proposition Slides ─── */
  const [vpSlideIndex, setVpSlideIndex] = useState(0);
  const [vpSlideOpacity, setVpSlideOpacity] = useState(1);

  // ─── Función para validar cédula ecuatoriana ──────────────
  const validarCedulaEcuatoriana = (cedula) => {
    if (cedula.length !== 10) return false;
    if (!/^\d+$/.test(cedula)) return false;
    
    const provincia = parseInt(cedula.substring(0, 2));
    if (provincia < 1 || provincia > 24) return false;
    
    const tercerDigito = parseInt(cedula[2]);
    if (tercerDigito < 0 || tercerDigito > 6) return false;
    
    // Verificar dígito verificador
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

  // ─── Función para validar RUC ecuatoriano ──────────────────
  const validarRucEcuatoriano = (ruc) => {
    if (ruc.length !== 13) return false;
    if (!/^\d+$/.test(ruc)) return false;
    
    const provincia = parseInt(ruc.substring(0, 2));
    if (provincia < 1 || provincia > 24) return false;
    
    const tercerDigito = parseInt(ruc[2]);
    
    // RUC de persona natural: tercer dígito entre 0-5
    // RUC de persona jurídica: tercer dígito 6
    // RUC de sociedad pública: tercer dígito 9
    if (tercerDigito < 0 || tercerDigito > 9) return false;
    
    // Si es persona natural (tercer dígito 0-5), validar con algoritmo de cédula
    if (tercerDigito <= 5) {
      const cedula = ruc.substring(0, 10);
      return validarCedulaEcuatoriana(cedula);
    }
    
    // Para persona jurídica o sociedad pública (tercer dígito 6 o 9)
    const coeficientes = [4, 3, 2, 7, 6, 5, 4, 3, 2];
    let suma = 0;
    
    for (let i = 0; i < 9; i++) {
      const digito = parseInt(ruc[i]);
      suma += digito * coeficientes[i];
    }
    
    const digitoVerificador = parseInt(ruc[9]);
    const digitoCalculado = (11 - (suma % 11)) % 11;
    const digitoFinal = digitoCalculado === 11 ? 0 : digitoCalculado;
    
    // Verificar que los últimos 3 dígitos sean 001
    const ultimosDigitos = ruc.substring(10, 13);
    
    // Para persona jurídica (tercer dígito 6) y sociedad pública (tercer dígito 9)
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
      setLogoOpacity(0);
      setTimeout(() => {
        setLogoIndex(prev => (prev + 1) % logos.length);
        setLogoOpacity(1);
      }, 800);
    }, 5500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setLogoColor(prev => (prev + 1) % colors.length);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  /* ─── VP Slides Rotation (7 seconds) ─── */
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
    // Limpiar solo números
    const cleaned = value.replace(/[^0-9]/g, '');
    let maxLength = 10;
    
    // Si el tipo de documento es RUC, permitir hasta 13 dígitos
    if (regForm.documentType === 'ruc') {
      maxLength = 13;
    }
    
    const truncated = cleaned.slice(0, maxLength);
    
    setRegForm(f => ({ ...f, documentNumber: truncated }));

    // Si es cédula y tiene 10 dígitos
    if (regForm.documentType === 'cedula' && truncated.length === 10) {
      // Validar cédula
      if (!validarCedulaEcuatoriana(truncated)) {
        showError('⚠️ Cédula inválida. Verifica el número.', 'document');
        setOwnerSearching(false);
        return;
      }

      // Buscar en el padrón
      setOwnerSearching(true);
      setOwnerExists(false);
      setFoundByApi(false);
      setError('');
      
      try {
        const API_BASE = process.env.REACT_APP_API_BASE || 'https://idon-plataform-backend.onrender.com';
        const res = await fetch(`${API_BASE}/api/business-owners/find?type=cedula&number=${truncated}`);
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
          const civil = await buscarEnAPIEcuador(truncated);
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
    }
    
    // Si es RUC y tiene 13 dígitos
    else if (regForm.documentType === 'ruc' && truncated.length === 13) {
      // Validar RUC
      if (!validarRucEcuatoriano(truncated)) {
        showError('⚠️ RUC inválido. Verifica el número.', 'document');
        setOwnerSearching(false);
        return;
      }

      // Buscar en el padrón (para RUC también se puede buscar)
      setOwnerSearching(true);
      setOwnerExists(false);
      setFoundByApi(false);
      setError('');
      
      try {
        const API_BASE = process.env.REACT_APP_API_BASE || 'https://idon-plataform-backend.onrender.com';
        const res = await fetch(`${API_BASE}/api/business-owners/find?type=ruc&number=${truncated}`);
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
          // Para RUC, también se puede buscar en el registro civil usando los primeros 10 dígitos
          const cedulaBase = truncated.substring(0, 10);
          const civil = await buscarEnAPIEcuador(cedulaBase);
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
    }
    
    // Si no tiene la longitud completa, limpiar campos
    else if (truncated.length < (regForm.documentType === 'ruc' ? 13 : 10)) {
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

  // ============================================
  // AUTENTICACIÓN - REDIRECCIÓN SIMPLE
  // ============================================
  const _commitLogin = (token, user, backendType) => {
    const schemaName = user.schemaName || user.schema || user.tenant || '';
    const userType = user?.userType || backendType;

    const userToStore = {
      ...user,
      token,
      type: backendType,
      userType: userType,
      role: backendType === 'owner' ? 'owner' :
            backendType === 'admin' ? 'admin' :
            backendType === 'admin_idon' ? 'admin_idon' :
            backendType === 'schema_employee' ? (user?.roleCode || 'employee') :
            (user?.role || 'user'),
      schemaName,
    };

    localStorage.setItem('idonUser', JSON.stringify(userToStore));
    localStorage.setItem('idonToken', token);

    if (user?.businessId || user?.business_id) {
      const businessId = user?.businessId || user?.business_id;
      const businessSlug = user?.businessSlug || user?.business_slug || '';
      
      localStorage.setItem('dbName', schemaName);
      localStorage.setItem('selectedBusiness', JSON.stringify({
        id: businessId,
        slug: businessSlug,
        schemaName: schemaName,
      }));
    }
    
    if (onLogin) onLogin(userToStore);
    
    const redirectRoute = (backendType === 'admin_idon' || backendType === 'admin') 
      ? '/admin/dashboard' 
      : '/app';
    
    navigate(redirectRoute, { replace: true });
  };

  const clearLoginFields = () => {
    setEmail('');
    setPassword('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
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
        
        if (res.status === 403) {
          const errorMessage = data.message || data.error || 'Tu negocio está suspendido. Por favor realiza el pago.';
          localStorage.setItem('pendingPaymentEmail', email);
          localStorage.setItem('pendingPaymentMessage', errorMessage);
          window.location.href = '/app/payment-pending';
          return;
        }
        
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
        } else if (res.status === 429) {
          showError('⏳ Demasiados intentos. Por favor espera unos minutos.', 'general');
        } else {
          showError(`❌ Error del servidor (${res.status}). Por favor intenta más tarde.`, 'general');
        }
        return;
      }
      
      const payload = data.data;
      setLoading(false);

      if (payload.businessStatus === 'suspended' || payload.user?.businessStatus === 'suspended') {
        localStorage.setItem('pendingPaymentEmail', email);
        localStorage.setItem('pendingPaymentMessage', payload.message || 'Tu negocio está suspendido. Por favor realiza el pago.');
        localStorage.setItem('idonToken', payload.token);
        localStorage.setItem('idonUser', JSON.stringify(payload.user));
        window.location.href = '/app/payment-pending';
        return;
      }

      if (payload.businessStatus === 'payment_pending' || payload.user?.businessStatus === 'payment_pending') {
        localStorage.setItem('pendingPaymentEmail', email);
        localStorage.setItem('pendingPaymentMessage', payload.message || 'Tienes pagos pendientes. Por favor realiza el pago.');
        localStorage.setItem('idonToken', payload.token);
        localStorage.setItem('idonUser', JSON.stringify(payload.user));
        window.location.href = '/app/payment-pending';
        return;
      }

      if (payload.requiresBusinessSelection && payload.businesses?.length > 1) {
        setPendingToken(payload.token);
        setPendingUser(payload.user);
        setAvailableBusinesses(payload.businesses);
        setShowBusinessSelector(true);
        return;
      }

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
      
      showError('¡Solicitud enviada exitosamente! Un administrador la revisará en breve.', 'success');
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
      case 'document': return <FiCreditCard size={16} />;
      case 'info': return <FiInfo size={16} />;
      case 'success': return <FiCheckCircle size={16} />;
      default: return <FiAlertCircle size={16} />;
    }
  };

  return (
    <div className="login-page" style={{ position: 'relative', paddingBottom: 44 }}>
      <div className="login-container">
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
              key={`logo-${logoIndex}`}
              style={{
                opacity: logoOpacity,
                filter: `drop-shadow(0 0 28px ${currentColor}cc) drop-shadow(0 0 60px ${currentColor}66)`,
                transition: 'opacity 1s cubic-bezier(0.4, 0, 0.2, 1), filter 1.5s cubic-bezier(0.4, 0, 0.2, 1), transform 1s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
          </div>

          <div className="logo-wordmark">
            <div className="brand-name">
              <span className="brand-id">ID</span>
              <span className="brand-on">ON</span>
            </div>
            <div className="brand-tagline">Plataforma de Gestión Multi-Negocios</div>
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

        <main className="login-right">
          <div className="login-right-inner">
            <div className="form-container">
              {showBusinessSelector ? (
                <div className="auth-form" key="biz-selector">
                  <h3 className="form-title">Selecciona tu negocio</h3>
                  <p style={{ color: '#2c2b2b', fontSize: '0.85rem', marginBottom: 16 }}>
                    Hola <strong>{pendingUser?.firstName}</strong>, tienes{' '}
                    <strong>{availableBusinesses.length}</strong> negocios registrados.
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
                            {biz.name?.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="business-selector-name">{biz.name}</div>
                            <div className="business-selector-type">{biz.business_type || biz.slug}</div>
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
                      setPendingToken(null);
                      setPendingUser(null);
                      setAvailableBusinesses([]);
                      setError('');
                      setErrorType('');
                      clearLoginFields();
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
                              readOnly={ownerExists}
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
                              readOnly={ownerExists}
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
                                ⚠️ {errorTypes}
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
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <Footer />
      </div>
    </div>
  );
}