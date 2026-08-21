import React, { useEffect, useRef, useCallback } from 'react';
import { X } from 'react-feather';

/**
 * Componente Modal reutilizable
 * @param {boolean} isOpen - Controla si el modal está visible
 * @param {function} onClose - Función para cerrar el modal
 * @param {string} title - Título del modal
 * @param {React.ReactNode} children - Contenido del modal
 * @param {React.ReactNode} footer - Contenido del pie (opcional)
 * @param {string} size - Tamaño: 'sm' | 'md' | 'lg' | 'xl' | 'full' (default 'md')
 * @param {boolean} closeOnOverlayClick - Cerrar al hacer clic en el overlay (default true)
 * @param {boolean} closeOnEscape - Cerrar con tecla Escape (default true)
 * @param {string} className - Clases adicionales para el contenedor del modal
 * @param {string} overlayClassName - Clases adicionales para el overlay
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className = '',
  overlayClassName = '',
}) {
  const modalRef = useRef(null);

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  // Prevenir scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Cerrar al hacer clic en el overlay
  const handleOverlayClick = useCallback(
    (e) => {
      if (closeOnOverlayClick && e.target === e.currentTarget) {
        onClose?.();
      }
    },
    [closeOnOverlayClick, onClose]
  );

  // Enfocar el modal al abrir (para accesibilidad)
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  // Tamaños del modal
  const sizeStyles = {
    sm: { maxWidth: '400px', width: '100%' },
    md: { maxWidth: '560px', width: '100%' },
    lg: { maxWidth: '720px', width: '100%' },
    xl: { maxWidth: '900px', width: '100%' },
    full: { maxWidth: '95vw', width: '100%' },
  };

  // Estilos del overlay
  const overlayStyles = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 'var(--z-modal, 2000)',
    padding: '16px',
    animation: 'fadeIn 0.2s ease',
  };

  // Estilos del contenido del modal
  const contentStyles = {
    backgroundColor: 'var(--bg-card, #ffffff)',
    borderRadius: 'var(--radius-lg, 12px)',
    boxShadow: 'var(--shadow-modal, 0 25px 50px rgba(0, 0, 0, 0.15))',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    animation: 'slideUp 0.25s ease',
    ...sizeStyles[size] || sizeStyles.md,
  };

  // Estilos del header
  const headerStyles = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border-color, #E2E8F0)',
    backgroundColor: 'var(--bg-secondary, #ffffff)',
    flexShrink: 0,
    borderTopLeftRadius: 'var(--radius-lg, 12px)',
    borderTopRightRadius: 'var(--radius-lg, 12px)',
  };

  // Estilos del título
  const titleStyles = {
    margin: 0,
    fontSize: 'var(--font-size-lg, 18px)',
    fontWeight: 'var(--font-weight-semibold, 600)',
    color: 'var(--text-primary, #1A202C)',
    fontFamily: 'var(--font-family, Inter)',
  };

  // Estilos del botón cerrar
  const closeButtonStyles = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-tertiary, #f8fafc)',
    border: '1px solid var(--border-color, #E2E8F0)',
    borderRadius: 'var(--radius-sm, 8px)',
    color: 'var(--text-secondary, #4A5568)',
    cursor: 'pointer',
    padding: '4px',
    width: '32px',
    height: '32px',
    transition: 'var(--transition-fast, all 0.15s ease)',
    flexShrink: 0,
  };

  // Estilos del body
  const bodyStyles = {
    padding: '20px',
    overflowY: 'auto',
    flex: 1,
    backgroundColor: 'var(--bg-card, #ffffff)',
    color: 'var(--text-primary, #1A202C)',
  };

  // Estilos del footer
  const footerStyles = {
    padding: '12px 20px',
    borderTop: '1px solid var(--border-color, #E2E8F0)',
    backgroundColor: 'var(--bg-tertiary, #f8fafc)',
    flexShrink: 0,
    borderBottomLeftRadius: 'var(--radius-lg, 12px)',
    borderBottomRightRadius: 'var(--radius-lg, 12px)',
  };

  if (!isOpen) return null;

  return (
    <div
      style={overlayStyles}
      className={overlayClassName}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        ref={modalRef}
        style={contentStyles}
        className={className}
        tabIndex={-1}
      >
        {/* Cabecera */}
        <div style={headerStyles} className="modal-header">
          {title && (
            <h2 id="modal-title" style={titleStyles}>
              {title}
            </h2>
          )}
          <button
            style={closeButtonStyles}
            onClick={onClose}
            aria-label="Cerrar modal"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover, rgba(249, 115, 22, 0.04))';
              e.currentTarget.style.color = 'var(--primary, #f97316)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-tertiary, #f8fafc)';
              e.currentTarget.style.color = 'var(--text-secondary, #4A5568)';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo */}
        <div style={bodyStyles}>{children}</div>

        {/* Pie (opcional) */}
        {footer && <div style={footerStyles}>{footer}</div>}
      </div>
    </div>
  );
}