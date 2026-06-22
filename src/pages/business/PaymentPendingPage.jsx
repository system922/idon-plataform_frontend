/**
 * SuspendedSubscriptionPage.jsx
 * Ubicación: src/pages/business/SuspendedSubscriptionPage.jsx
 * Página que se muestra cuando la suscripción del negocio está suspendida
 */

import React, { useState, useEffect } from 'react';
import {
    FiUser,
    FiAlertTriangle, FiCopy, FiCheck, FiLogOut, FiMail, FiClock, FiCreditCard, FiX, FiDollarSign, FiBriefcase
} from 'react-icons/fi';
import '../../styles/SuspendedSubscriptionPage.css';

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

export default function SuspendedSubscriptionPage({ businessName, onLogout }) {
  const [copiedId, setCopiedId] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [message, setMessage] = useState('');
  const [showMessage, setShowMessage] = useState(true);
  const [businessInfo, setBusinessInfo] = useState({
    name: '',
    amount: 0,
    plan: 'Mensual',
    dueDate: '',
    discount: 0,
    amountMonthly: 0,
    amountAnnual: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Recuperar el email y mensaje del localStorage
    const email = localStorage.getItem('pendingPaymentEmail');
    const msg = localStorage.getItem('pendingPaymentMessage');
    
    if (email) {
      setUserEmail(email);
    } else {
      try {
        const userStr = localStorage.getItem('idonUser');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user.email) {
            setUserEmail(user.email);
          }
          if (user.businessName || user.name) {
            setBusinessInfo(prev => ({
              ...prev,
              name: user.businessName || user.name
            }));
          }
        }
      } catch (e) {}
    }
    
    if (msg) {
      setMessage(msg);
    }

    // Obtener información del negocio desde el backend
    const fetchBusinessInfo = async () => {
      try {
        const token = localStorage.getItem('idonToken');
        if (!token) {
          setLoading(false);
          return;
        }

        const API_BASE = process.env.REACT_APP_API_BASE || 'https://idon-plataform-backend.onrender.com';
        
        // 🔥 PRIMERO: Obtener el business_id del usuario desde el token
        const res = await fetch(`${API_BASE}/api/business-status/my-status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (res.ok) {
          const data = await res.json();  
          const subscription = data.subscription || {};
          const business = data.business || {};
          
          // USAR AMBOS NOMBRES (camelCase y snake_case)
          const amount = parseFloat(
            subscription.totalAmount || 
            subscription.total_amount || 
            subscription.amountMonthly || 
            subscription.amount_monthly || 
            0
          );
          
          const discount = parseFloat(
            subscription.discountPercentage || 
            subscription.discount_percentage || 
            0
          );
          
          const amountMonthly = parseFloat(
            subscription.amountMonthly || 
            subscription.amount_monthly || 
            0
          );
          
          const amountAnnual = parseFloat(
            subscription.amountAnnual || 
            subscription.amount_annual || 
            0
          );
          
          // Determinar el plan
          let plan = 'Mensual';
          if (subscription.billingPeriod === 'annual' || subscription.billingPeriod === 'yearly') {
            plan = 'Anual';
          } else if (subscription.billingPeriod === 'monthly') {
            plan = 'Mensual';
          }
          
          setBusinessInfo({
            name: business.name || businessName || 'tu negocio',
            amount: amount,
            plan: plan,
            dueDate: subscription.nextBillingAt || subscription.suspendedAt || '',
            discount: discount,
            amountMonthly: amountMonthly,
            amountAnnual: amountAnnual
          });
          
          setLoading(false);
        } else {
          console.error('Error en la respuesta:', res.status);
          const errorData = await res.json().catch(() => ({}));
          console.error('Error data:', errorData);
          setError(`Error al obtener información: ${res.status}`);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error obteniendo información del negocio:', error);
        setError(error.message);
        setLoading(false);
      }
    };

    fetchBusinessInfo();
  }, [businessName]);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCloseMessage = () => {
    setShowMessage(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('pendingPaymentEmail');
    localStorage.removeItem('pendingPaymentMessage');
    localStorage.removeItem('pendingPaymentRedirect');
    if (onLogout) {
      onLogout();
    } else {
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
    if (!dateStr) return 'Fecha no disponible';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-EC', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Fecha no disponible';
    }
  };

  if (loading) {
    return (
      <div className="suspended-container">
        <div className="suspended-card">
          <div style={{ color: 'white', textAlign: 'center', padding: '40px' }}>
            <div className="spinner"></div>
            <p>Cargando información...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="suspended-container">
      <div className="suspended-card">
        
        {/* Icono de alerta */}
        <div className="suspended-icon-wrapper">
          <div className="suspended-icon-circle">
            <FiAlertTriangle size={48} />
          </div>
        </div>

        {/* Título y mensaje */}
        <h1 className="suspended-title">Suscripción Suspendida</h1>
        
        {/* Badge de estado */}
        <div className="status-badge">
          <FiClock size={12} /> Pago Pendiente
        </div>

        {/* Mensaje personalizado del backend */}
        {message && showMessage && (
          <div className="suspended-message-box">
            <span>{message}</span>
            <button onClick={handleCloseMessage} className="message-close-btn">
              <FiX size={18} />
            </button>
          </div>
        )}

        {/* Información del negocio y monto a pagar */}
        <div className="business-payment-card">
          <div className="business-payment-header">
            <FiBriefcase size={16} />
            <span>Información del negocio</span>
          </div>
          <div className="business-payment-grid">
            <div className="business-payment-item">
              <span className="business-payment-label">Negocio</span>
              <strong className="business-payment-value">{businessInfo.name || 'tu negocio'}</strong>
            </div>
            <div className="business-payment-item">
              <span className="business-payment-label">Plan</span>
              <strong className="business-payment-value">{businessInfo.plan || 'Mensual'}</strong>
            </div>
            <div className="business-payment-item">
              <span className="business-payment-label">Monto a pagar</span>
              <strong className="business-payment-value amount">
                <FiDollarSign size={16} />
                {formatAmount(businessInfo.amount)}
              </strong>
              {businessInfo.discount > 0 && (
                <span className="business-payment-discount">
                  Descuento: {businessInfo.discount}%
                </span>
              )}
              {businessInfo.amountMonthly > 0 && businessInfo.discount > 0 && (
                <span className="business-payment-original">
                  Precio original: {formatAmount(businessInfo.amountMonthly)}
                </span>
              )}
            </div>
            {businessInfo.dueDate && (
              <div className="business-payment-item">
                <span className="business-payment-label">Fecha vencimiento</span>
                <strong className="business-payment-value">{formatDate(businessInfo.dueDate)}</strong>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="error-message" style={{ color: '#ef4444', marginBottom: '16px' }}>
            ⚠️ {error}
          </div>
        )}
        <p className="suspended-message">
          Para reactivar tu suscripción, realiza una transferencia por el monto de <strong className="amount-highlight">{formatAmount(businessInfo.amount)}</strong> a una de las siguientes cuentas.
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
                        <><FiCheck size={14} /> Copiado</>
                      ) : (
                        <><FiCopy size={14} /> Copiar</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Nota importante */}
        <div className="note-card">
          <FiMail size={16} />
          <span>
            Una vez realizado el pago, envía el comprobante al soporte para reactivar tu cuenta 
            en un plazo de <strong>5 a 10 minutos</strong>.
          </span>
        </div>

        {/* Botón de cierre de sesión */}
        <button onClick={handleLogout} className="logout-btn">
          <FiLogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}