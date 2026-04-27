/**
 * ════════════════════════════════════════════════════════════════
 * PAGETEMPLATE - Componente Universal para TODO el Sistema
 *
 * UN componente para controlar TODAS las páginas:
 * - Admin pages (theme="admin")
 * - Business pages (theme="business")
 * - Public pages (theme="default")
 *
 * Estilos moderno naranja + dark theme
 * ════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { FiAlertCircle, FiRotateCcw } from 'react-icons/fi';
import '../styles/PageTemplate.css';

/**
 * PageTemplate - Componente Universal
 *
 * @param {string} title - Título principal de la página
 * @param {string} subtitle - Subtítulo descriptivo (opcional)
 * @param {React.ReactNode} children - Contenido de la página
 * @param {React.ReactNode} headerAction - Botones/acciones en el header (opcional)
 * @param {boolean} loading - Estado de carga
 * @param {string} error - Mensaje de error (opcional)
 * @param {function} onRetry - Callback para reintentar (opcional)
 * @param {string} theme - Tema visual: "admin" | "business" | "default"
 * @param {string} className - Clases CSS adicionales
 */
const PageTemplate = ({
  title,
  subtitle,
  children,
  headerAction,
  loading = false,
  error = null,
  onRetry,
  theme = 'default',
  className = '',
}) => {
  return (
    <div className={`page-template page-template-${theme} ${className}`}>
      {/* HEADER CON TÍTULO Y ACCIONES */}
      {(title || subtitle || headerAction) && (
        <div className="page-template-header">
          <div className="page-template-header-content">
            {title && <h1 className="page-template-title">{title}</h1>}
            {subtitle && <p className="page-template-subtitle">{subtitle}</p>}
          </div>
          {headerAction && (
            <div className="page-template-header-actions">
              {headerAction}
            </div>
          )}
        </div>
      )}

      {/* ERROR STATE */}
      {error && (
        <div className="page-template-error">
          <div className="page-template-error-content">
            <div className="page-template-error-icon">
              <FiAlertCircle size={24} />
            </div>
            <div>
              <h4 className="page-template-error-title">⚠️ Error al cargar</h4>
              <p className="page-template-error-message">{error}</p>
            </div>
          </div>
          {onRetry && (
            <button
              className="page-template-error-retry"
              onClick={onRetry}
              title="Reintentar cargar"
            >
              <FiRotateCcw size={14} />
              Reintentar
            </button>
          )}
        </div>
      )}

      {/* LOADING STATE */}
      {loading ? (
        <div className="page-template-loading">
          <div className="page-template-spinner"></div>
          <p>Cargando...</p>
        </div>
      ) : (
        /* CONTENT */
        <div className="page-template-content">{children}</div>
      )}
    </div>
  );
};

export default PageTemplate;
