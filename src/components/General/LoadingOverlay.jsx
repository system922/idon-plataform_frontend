// src/components/General/LoadingOverlay.jsx
import React from 'react';
import Logo from '../Logo';

export const LoadingOverlay = ({ 
  message = 'Cargando...',
  fullScreen = true,
  showLogo = true,
  backgroundColor = 'var(--bg-secondary)',
  mutedColor = 'var(--text-muted)',
  spinnerColor = '#fc7916'
}) => {
  return (
    <div style={{ 
      position: fullScreen ? 'fixed' : 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: backgroundColor,
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }}>
        {showLogo && <Logo size="sm" />}

        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid rgba(12, 52, 100, 0.15)',
          borderTopColor: spinnerColor,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        
        {message && (
          <div style={{
            fontSize: '14px',
            color: mutedColor,
            fontWeight: 500
          }}>
            {message}
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoadingOverlay;