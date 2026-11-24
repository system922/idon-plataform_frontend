// src/components/SpinnerLoader.jsx
import React from 'react';

const isologo = `${process.env.PUBLIC_URL}/isotipo.png`;

export const SpinnerLoader = ({
  size = 'md',        // sm, md, lg, xl
  variant = 'primary', // primary, blue, success, danger, purple, white
  overlay = true,
  dark = false,
  message = '',
  showBrand = true,
  fullScreen = true,
  className = '',
}) => {

  const sizeMap = {
    sm: 'spinner-loader-sm',
    md: 'spinner-loader',
    lg: 'spinner-loader-lg',
    xl: 'spinner-loader-xl',
  };

  const variantMap = {
    primary: 'spinner-primary',
    blue: 'spinner-blue',
    success: 'spinner-success',
    danger: 'spinner-danger',
    purple: 'spinner-purple',
    white: 'spinner-white',
  };

  const overlayClass = dark ? 'spinner-overlay-dark' : 'spinner-overlay';
  const containerClass = fullScreen ? overlayClass : 'spinner-container';

  // Si es una pantalla completa con overlay
  if (overlay && fullScreen) {
    return (
      <div className={`${containerClass} ${className}`}>
        {showBrand ? (
          <div className="spinner-brand">
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
            {message && <div className="sub-text">{message}</div>}
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
        ) : (
          <>
            <div className={`spinner-loader ${sizeMap[size]} ${variantMap[variant]}`} />
            {message && <p className="spinner-message">{message}</p>}
          </>
        )}
      </div>
    );
  }

  // Spinner sin overlay (dentro de un contenedor)
  return (
    <div className="spinner-container">
      <div className={`spinner-loader ${sizeMap[size]} ${variantMap[variant]}`} />
      {message && <p className="spinner-message">{message}</p>}
    </div>
  );
};

export default SpinnerLoader;