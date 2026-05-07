/**
 * SuspendedSubscriptionPage.jsx
 * Ubicación: src/pages/business/SuspendedSubscriptionPage.jsx
 * Página que se muestra cuando la suscripción del negocio está suspendida
 */

import React, { useState } from 'react';
import {
    FiUser,
     FiAlertTriangle, FiCopy, FiCheck, FiLogOut, FiMail, FiClock, FiCreditCard } from 'react-icons/fi';
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

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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
        <p className="suspended-message">
          El acceso a <strong>{businessName || 'tu negocio'}</strong> ha sido suspendido por falta de pago.
          Para reactivar tu suscripción, realiza una transferencia a una de las siguientes cuentas.
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
        <button onClick={onLogout} className="logout-btn">
          <FiLogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}