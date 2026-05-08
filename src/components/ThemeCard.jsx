import React from 'react';

/**
 * Componente Card con tema visual configurable
 * 
 * @param {Object} props
 * @param {string} props.theme - Tema: 'identity', 'contact', 'business', 'printer'
 * @param {string} props.title - Título de la card
 * @param {React.ReactNode} props.icon - Icono (opcional)
 * @param {React.ReactNode} props.children - Contenido de la card
 * @param {React.ReactNode} props.actions - Botones de acción (opcional)
 * @param {boolean} props.noPadding - Si no se debe aplicar padding al body
 */
const ThemeCard = ({ 
  theme = 'business', 
  title, 
  icon, 
  children, 
  actions, 
  noPadding = false 
}) => {
  return (
    <div className={`card theme-${theme}`}>
      <div className="card-header">
        {icon && <div className="card-header-icon">{icon}</div>}
        <h3 className="card-title">{title}</h3>
      </div>
      <div className="card-body" style={noPadding ? { padding: 0 } : {}}>
        {children}
      </div>
      {actions && <div className="card-footer">{actions}</div>}
    </div>
  );
};

export default ThemeCard;