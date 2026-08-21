// src/pages/InactiveUserPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUserX, FiAlertCircle, FiLogOut } from 'react-icons/fi';
import PageTemplate from '../components/PageTemplate';

export default function InactiveUserPage({ onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      navigate('/login');
    }
  };

  return (
    <PageTemplate 
      title="Cuenta Inactiva" 
      subtitle="Tu cuenta no tiene acceso a este negocio"
    >
      <div className="inactive-user-container" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        padding: '20px'
      }}>
        <div style={{
          maxWidth: '500px',
          width: '100%',
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid #e8edf3',
          textAlign: 'center'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <FiUserX size={40} color="#ef4444" />
          </div>
          
          <h2 style={{ margin: '0 0 8px', fontSize: '22px', color: '#1a2332' }}>
            Cuenta Inactiva
          </h2>
          
          <p style={{ color: '#8a9bb5', fontSize: '15px', marginBottom: '24px', lineHeight: '1.6' }}>
            Tu cuenta no está activa en este negocio. 
            Contacta al administrador del negocio para reactivar tu acceso.
          </p>

          <div style={{
            background: '#f8fafc',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid #e8edf3',
            marginBottom: '24px',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <FiAlertCircle size={16} style={{ color: '#f59e0b', marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '13px', color: '#1a2332', fontWeight: 500 }}>
                  Posibles motivos:
                </div>
                <ul style={{ margin: '4px 0 0', paddingLeft: '20px', fontSize: '13px', color: '#8a9bb5' }}>
                  <li>El administrador desactivó tu cuenta</li>
                  <li>Tu cuenta fue eliminada del negocio</li>
                  <li>No tienes permisos asignados</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 24px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = '#dc2626'}
            onMouseLeave={(e) => e.target.style.background = '#ef4444'}
          >
            <FiLogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </PageTemplate>
  );
}