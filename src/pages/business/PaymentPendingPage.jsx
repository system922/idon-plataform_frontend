// src/pages/business/PaymentPendingPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { api } from '../../config/api';
import {
  FiCreditCard,
  FiClock,
  FiLogOut,
  FiRefreshCw,
  FiAlertCircle,
  FiMail,
  FiUser,
  FiBriefcase,
  FiCheckCircle,
  FiPercent,
  FiInfo
} from 'react-icons/fi';

// Cuentas bancarias para transferencia
const BANK_ACCOUNTS = [
  {
    id: 1,
    bankName: 'BANCO PICHINCHA',
    bankImage: 'https://yt3.googleusercontent.com/8XLAF1AoMmKrX999-FMbfYlCLTtudDylFsU6LnTNQUYOqIQUTQaZpwVRylSwMJAKXCUHElck4A=s900-c-k-c0x00ffffff-no-rj',
    accountType: 'Cuenta de Ahorros',
    accountNumber: '2207508542',
    accountHolder: 'Jefferson Gregorio Cagua Figueroa'
  },
  {
    id: 2,
    bankName: 'BANCO BOLIVARIANO',
    bankImage: 'https://i0.wp.com/fiduvalor.com.ec/wp-content/uploads/2023/05/AQDL9O13aRNhSG6p.jpg?fit=1024%2C1024&ssl=1',
    accountType: 'Cuenta de Ahorros',
    accountNumber: '0004081788',
    accountHolder: 'Jefferson Gregorio Cagua Figueroa'
  },
  {
    id: 3,
    bankName: 'BANCO PRODUBANCO',
    bankImage: 'https://scalashopping.com/wp-content/uploads/2018/08/NuevoLogoPBO.jpg',
    accountType: 'Cuenta de Ahorros',
    accountNumber: '20300944487',
    accountHolder: 'Jefferson Gregorio Cagua Figueroa'
  }
];

// Datos del titular
const OWNER_INFO = {
  fullName: 'Jefferson Gregorio Cagua Figueroa',
  cedula: '1315614477',
  email: 'jcaguafigueroa9907@gmail.com'
};

export default function PaymentPendingPage({ onLogout }) {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  
  const [copiedId, setCopiedId] = useState(null);
  const [businessName, setBusinessName] = useState('');
  const [amount, setAmount] = useState(0);
  const [plan, setPlan] = useState('Mensual');
  const [dueDate, setDueDate] = useState('');
  const [discount, setDiscount] = useState(0);
  const [amountMonthly, setAmountMonthly] = useState(0);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(false);
  const [showMessage, setShowMessage] = useState(true);
  const [statusData, setStatusData] = useState(null);

  useEffect(() => {
    fetchBusinessInfo();
  }, []);

  const fetchBusinessInfo = async () => {
    try {
      setLoading(true);
      const response = await api.get('/business-status/my-status');
      const result = response.data;


      if (!result.ok) {
        throw new Error(result.error || 'Error al cargar datos');
      }

      const data = result.data;
      setStatusData(data);


      // EXTRAER DATOS DIRECTAMENTE DE data
      const name = data.business_name || 'Sin nombre';
      const amountValue = parseFloat(data.total_amount || 0);
      const discountValue = parseFloat(data.discount_percentage || 0);
      const amountMonthlyValue = parseFloat(data.amount_monthly || 0);
      const dueDateValue = data.next_billing_at || '';
      const subscriptionStatus = data.subscription_status || '';
      
      let planValue = 'Mensual';
      if (data.billing_period === 'annual' || data.billing_period === 'yearly') {
        planValue = 'Anual';
      } else if (data.billing_period === 'monthly') {
        planValue = 'Mensual';
      }

      setBusinessName(name);
      setAmount(amountValue);
      setPlan(planValue);
      setDueDate(dueDateValue);
      setDiscount(discountValue);
      setAmountMonthly(amountMonthlyValue);
      setStatus(data.status || 'provisioned');

      setLoading(false);
    } catch (error) {
      console.error('Error obteniendo información del negocio:', error);
      setError(error.response?.data?.message || error.message);
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    setChecking(true);
    await fetchBusinessInfo();
    setChecking(false);
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCloseMessage = () => {
    setShowMessage(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      if (onLogout) onLogout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      window.location.href = '/login';
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No disponible';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-EC', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'No disponible';
    }
  };

  // Determinar el título y mensaje según el estado
  const getPageContent = () => {
    const isProvisioned = status === 'provisioned';
    const isSuspended = status === 'suspended';
    const isApproved = status === 'approved';

    if (isProvisioned) {
      return {
        title: '¡Suscripción Creada!',
        subtitle: 'Tu negocio ha sido aprobado. Realiza el pago para activarlo.',
        badge: 'Pendiente de pago',
        message: 'Hemos creado tu suscripción. Para comenzar a usar IDON, solo falta realizar el pago.',
        buttonText: 'Verificar estado'
      };
    }

    if (isSuspended) {
      return {
        title: 'Suscripción Suspendida',
        subtitle: 'Tu acceso está bloqueado. Realiza el pago pendiente para reactivarlo.',
        badge: 'Acceso Bloqueado',
        message: 'Tu suscripción ha sido suspendida. Para recuperar el acceso, realiza el pago pendiente.',
        buttonText: 'Verificar estado'
      };
    }

    if (isApproved) {
      return {
        title: '¡Negocio Aprobado!',
        subtitle: 'Tu negocio ha sido aprobado. El equipo IDON te contactará para la suscripción.',
        badge: 'En proceso',
        message: 'Tu negocio está aprobado. En breve recibirás información sobre el plan de suscripción.',
        buttonText: 'Verificar estado'
      };
    }

    return {
      title: 'Pago Pendiente',
      subtitle: 'Completa el proceso de pago para activar tu negocio.',
      badge: 'Pendiente de pago',
      message: 'Realiza el pago para activar tu suscripción y comenzar a usar IDON.',
      buttonText: 'Verificar estado'
    };
  };

  const content = getPageContent();

  if (loading) {
    return (
      <div className="payment-pending-container">
        <div className="payment-pending-card">
          <div className="payment-pending-loading">
            <div className="spinner"></div>
            <p>Cargando información...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="payment-pending-container">
        <div className="payment-pending-card">
          <div className="payment-pending-error">
            <FiAlertCircle size={48} />
            <h2>Error al cargar</h2>
            <p>{error}</p>
            <button onClick={fetchBusinessInfo} className="btn-retry">
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-pending-container">
      <div className="payment-pending-card">
        {/* Icono */}
        <div className="payment-pending-icon-wrapper">
          <div className="payment-pending-icon-circle">
            {status === 'suspended' ? (
              <FiAlertCircle size={40} />
            ) : (
              <FiCreditCard size={40} />
            )}
          </div>
        </div>

        {/* Título */}
        <h1 className="payment-pending-title">{content.title}</h1>
        <p className="payment-pending-subtitle">{content.subtitle}</p>
        
        {/* Badge de estado */}
        <div className="payment-pending-status-badge">
          <FiClock size={12} /> {content.badge}
        </div>

        {/* Información del negocio */}
        <div className="business-payment-card">
          <div className="business-payment-header">
            <FiBriefcase size={16} />
            <span>Información del negocio</span>
          </div>
          <div className="business-payment-grid">
            <div className="business-payment-item">
              <span className="business-payment-label">Negocio</span>
              <strong className="business-payment-value">{businessName || 'Sin nombre'}</strong>
            </div>
            <div className="business-payment-item">
              <span className="business-payment-label">Plan</span>
              <strong className="business-payment-value">{plan}</strong>
            </div>
            <div className="business-payment-item">
              <span className="business-payment-label">Monto a pagar</span>
              <strong className="business-payment-value amount">
                {formatAmount(amount)}
              </strong>
              {discount > 0 && (
                <span className="business-payment-discount">
                  <FiPercent size={12} /> Descuento: {discount}%
                </span>
              )}
              {amountMonthly > 0 && discount > 0 && (
                <span className="business-payment-original">
                  Precio original: {formatAmount(amountMonthly)}
                </span>
              )}
            </div>
            {dueDate && (
              <div className="business-payment-item">
                <span className="business-payment-label">Fecha vencimiento</span>
                <strong className="business-payment-value">{formatDate(dueDate)}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Mensaje */}
        <div className="payment-pending-message-box">
          <FiInfo size={18} className="message-icon" />
          <span>{content.message}</span>
        </div>

        <p className="payment-pending-message-text">
          Para continuar, realiza una transferencia por el monto de <strong className="amount-highlight">{formatAmount(amount)}</strong> a una de las siguientes cuentas.
        </p>

        {/* Información del titular */}
        <div className="owner-info-card">
          <h3 className="owner-info-title">
            <FiUser size={14} /> Titular de las cuentas
          </h3>
          <div className="owner-info-grid">
            <div className="owner-info-item">
              <span className="owner-info-label">Nombre:</span>
              <strong className="owner-info-value">{OWNER_INFO.fullName}</strong>
            </div>
            <div className="owner-info-item">
              <span className="owner-info-label">Cédula:</span>
              <strong className="owner-info-value">{OWNER_INFO.cedula}</strong>
            </div>
            <div className="owner-info-item">
              <span className="owner-info-label">Correo:</span>
              <strong className="owner-info-value">{OWNER_INFO.email}</strong>
            </div>
          </div>
        </div>

        {/* Cuentas bancarias */}
        <div className="banks-section">
          <p className="banks-title">
            <FiCreditCard size={14} /> Cuentas para transferencia
          </p>
          
          <div className="banks-grid">
            {BANK_ACCOUNTS.map((account) => (
              <div key={account.id} className="bank-card">
                <div className="bank-header">
                  {account.bankImage ? (
                    <img 
                      src={account.bankImage} 
                      alt={account.bankName} 
                      className="bank-image"
                    />
                  ) : (
                    <div className="bank-initial">
                      {account.bankName.charAt(0)}
                    </div>
                  )}
                  <div className="bank-info">
                    <div className="bank-name">{account.bankName}</div>
                    <div className="bank-type">{account.accountType}</div>
                  </div>
                </div>
                
                <div className="bank-body">
                  <div className="bank-holder">
                    Titular: {account.accountHolder}
                  </div>
                  <div className="bank-number-wrapper">
                    <div className="bank-number">{account.accountNumber}</div>
                    <button
                      onClick={() => copyToClipboard(account.accountNumber, account.id)}
                      className={`copy-btn ${copiedId === account.id ? 'copied' : ''}`}
                    >
                      {copiedId === account.id ? (
                        <><FiCheckCircle size={14} /> Copiado</>
                      ) : (
                        <><FiRefreshCw size={14} /> Copiar</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Nota importante */}
        <div className="payment-note-card">
          <FiMail size={16} />
          <span>
            Una vez realizado el pago, envía el comprobante a tu asesor IDON para activar tu cuenta 
            en un plazo de <strong>5 a 10 minutos</strong>.
          </span>
        </div>

        {/* Acciones */}
        <div className="payment-pending-actions">
          <button
            onClick={handleCheckStatus}
            disabled={checking}
            className="btn-check-status"
          >
            <FiRefreshCw size={16} className={checking ? 'spinning' : ''} />
            {checking ? 'Verificando...' : content.buttonText}
          </button>
          <button
            onClick={handleLogout}
            className="btn-logout"
          >
            <FiLogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}