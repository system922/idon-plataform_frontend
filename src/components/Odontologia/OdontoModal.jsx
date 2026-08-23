import React from 'react';
import { FiX } from 'react-icons/fi';

export default function OdontoModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
  headerVariant = 'primary',
  className = '',
}) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'odonto-modal-sm',
    md: 'odonto-modal-md',
    lg: 'odonto-modal-lg',
    xl: 'odonto-modal-xl',
    full: 'odonto-modal-full',
  };

  const headerClass = headerVariant ? `odonto-modal-header ${headerVariant}` : 'odonto-modal-header';

  return (
    <div 
      className="odonto-modal-overlay" 
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      <div
        className={`odonto-modal ${sizeClasses[size]} ${className}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="odonto-modal-title"
      >
        <div className={headerClass}>
          <div>
            {title && <h2 id="odonto-modal-title">{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="odonto-modal-close" onClick={onClose} aria-label="Cerrar">
            <FiX size={20} />
          </button>
        </div>

        <div className="odonto-modal-body">
          {children}
        </div>

        {footer && (
          <div className="odonto-modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}