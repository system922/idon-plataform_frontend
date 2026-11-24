// src/components/General/LoadingOverlay.jsx
import React from 'react';

const isologo = `${process.env.PUBLIC_URL}/isotipo.png`;

export const LoadingOverlay = ({
  message = 'Cargando...',
  fullScreen = true,
  showLogo = true,
  backgroundColor = '#ffffff',
  mutedColor = '#475569'
}) => {
  return (
    <div style={{
      position: fullScreen ? 'fixed' : 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: backgroundColor,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: fullScreen ? '100vh' : '100%',
      zIndex: 9999
    }}>
      {showLogo && (
        <div
          aria-label="IDON"
          role="img"
          style={{
            position: 'relative',
            width: '90px',
            height: '90px',
            background: 'transparent'
          }}
        >
          <img
            src={isologo}
            alt=""
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block'
            }}
          />
          <img
            src={isologo}
            alt=""
            aria-hidden="true"
            className="idon-loading-reveal"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
              filter: 'grayscale(1) brightness(1.35) opacity(0.85)'
            }}
          />
        </div>
      )}

      {message && (
        <div style={{
          marginTop: '16px',
          fontSize: '1rem',
          color: mutedColor,
          fontWeight: 400,
          fontFamily: 'Inter, Montserrat, sans-serif',
          textAlign: 'center'
        }}>
          {message}
        </div>
      )}

      <style>{`
        @keyframes idonLogoReveal {
          0% { clip-path: inset(0 0 0 0); }
          70% { clip-path: inset(0 0 100% 0); }
          100% { clip-path: inset(0 0 100% 0); }
        }
        .idon-loading-reveal {
          animation: idonLogoReveal 2.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default LoadingOverlay;