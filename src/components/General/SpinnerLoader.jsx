// src/components/SpinnerLoader.jsx
import React from 'react';
import Logo from '../Logo';

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
            <Logo size="sm" />
            <div className={`spinner-loader ${sizeMap[size]} ${variantMap[variant]}`} />
            {message && <div className="sub-text">{message}</div>}
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