// src/pages/NoAccessPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiAlertTriangle, FiLogOut, FiHome } from 'react-icons/fi';
import PageTemplate from '../components/PageTemplate';

export default function NoAccessPage({ onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      navigate('/login');
    }
  };

  const handleGoHome = () => {
    navigate('/login');
  };

  return (
    <PageTemplate 
      title="Sin Acceso" 
      subtitle="No tienes acceso a este negocio"
    >
      <div className="no-access-container" style={{
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
            background: 'rgba(245, 158, 11, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <FiAlertTriangle size={40} color="#f59e0b" />
          </div>
          
          <h2 style={{ margin: '0 0 8px', fontSize: '22px', color: '#1a2332' }}>
            Sin Acceso
          </h2>
          
          <p style={{ color: '#8a9bb5', fontSize: '15px', marginBottom: '24px', lineHeight: '1.6' }}>
            No tienes acceso a este negocio o el negocio no existe.
          </p>

          <div style={{
            display: 'flex',
            gap: '12px',
            flexDirection: 'column'
          }}>
            <button
              onClick={handleGoHome}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 24px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                width: '100%',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = '#2563eb'}
              onMouseLeave={(e) => e.target.style.background = '#3b82f6'}
            >
              <FiHome size={18} />
              Ir al Inicio
            </button>

            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 24px',
                background: 'transparent',
                color: '#8a9bb5',
                border: '1px solid #e8edf3',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: 500,
                cursor: 'pointer',
                width: '100%',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#f8fafc';
                e.target.style.borderColor = '#cbd5e1';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.borderColor = '#e8edf3';
              }}
            >
              <FiLogOut size={18} />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </PageTemplate>
  );
}