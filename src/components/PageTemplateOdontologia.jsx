// src/components/odontologia/PageTemplateOdontologia.jsx
import React from 'react';
import { FiAlertCircle, FiRotateCcw } from 'react-icons/fi';
import '../styles/PageTemplateOdontologia.css';

/**
 * PageTemplateOdontologia - Template específico para el módulo de Odontología
 * Diseñado con la paleta de colores "Azul Dental"
 * 
 * @param {string} title - Título principal de la página
 * @param {string} subtitle - Subtítulo descriptivo
 * @param {React.ReactNode} children - Contenido de la página
 * @param {React.ReactNode} headerAction - Botones/acciones en el header
 * @param {boolean} loading - Estado de carga
 * @param {string} error - Mensaje de error
 * @param {function} onRetry - Callback para reintentar
 * @param {string} className - Clases CSS adicionales
 * @param {React.ReactNode} icon - Icono personalizado para la página (opcional)
 */
const PageTemplateOdontologia = ({
  title,
  subtitle,
  children,
  headerAction,
  loading = false,
  error = null,
  onRetry,
  className = '',
  icon = null,
}) => {
  return (
    <div className={`template-page ${className}`}>
      {/* HEADER */}
      {(title || subtitle || headerAction) && (
        <div className="template-header">
          <div className="template-header-content">
            {title && (
              <h1 className="template-title">
                {icon && <span className="template-title-icon">{icon}</span>}
                {title}
              </h1>
            )}
            {subtitle && <p className="template-subtitle">{subtitle}</p>}
          </div>
          {headerAction && (
            <div className="template-header-actions">
              {headerAction}
            </div>
          )}
        </div>
      )}

      {/* ERROR STATE */}
      {error && (
        <div className="template-error">
          <div className="template-error-content">
            <div className="template-error-icon">
              <FiAlertCircle size={24} />
            </div>
            <div>
              <h4 className="template-error-title">Error al cargar</h4>
              <p className="template-error-message">{error}</p>
            </div>
          </div>
          {onRetry && (
            <button className="template-error-retry" onClick={onRetry}>
              <FiRotateCcw size={14} />
              Reintentar
            </button>
          )}
        </div>
      )}

      {/* LOADING STATE */}
      {loading ? (
        <div className="template-loading">
          <div className="template-spinner"></div>
          <p>Cargando...</p>
        </div>
      ) : (
        <div className="template-content">{children}</div>
      )}
    </div>
  );
};

export default PageTemplateOdontologia;