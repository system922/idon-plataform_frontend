import React from 'react';

/**
 * Componente de botón reutilizable
 * 
 * @param {Object} props
 * @param {string} props.variant - primary, success, danger, warning, info, purple, blue, secondary
 * @param {string} props.size - sm, md, lg, xl
 * @param {string} props.type - button, submit, reset
 * @param {boolean} props.outline - Variante outline
 * @param {boolean} props.ghost - Variante ghost
 * @param {boolean} props.icon - Botón solo con ícono
 * @param {boolean} props.loading - Estado de carga
 * @param {boolean} props.block - Botón de ancho completo
 * @param {boolean} props.inline - Botón en línea (más pequeño)
 * @param {string} props.className - Clases adicionales
 * @param {React.ReactNode} props.children - Contenido del botón
 * @param {Function} props.onClick - Función al hacer clic
 * @param {boolean} props.disabled - Deshabilitado
 * @param {string} props.title - Tooltip
 * @param {string} props.id - ID del elemento
 * @param {string} props.ariaLabel - Etiqueta ARIA
 */
const Button = ({
  // Variantes
  variant = 'primary',
  size = 'md',
  type = 'button',
  
  // Estilos
  outline = false,
  ghost = false,
  icon = false,
  loading = false,
  block = false,
  inline = false,
  
  // Contenido
  children,
  className = '',
  
  // Eventos
  onClick,
  
  // Estado
  disabled = false,
  
  // Accesibilidad
  title,
  id,
  ariaLabel,
  
  // Otros
  ...rest
}) => {
  // ── Construir clases ──────────────────────────────────────────

  const baseClass = 'btn';
  
  const variantClass = outline 
    ? `btn-${variant}-outline`
    : ghost 
      ? `btn-${variant}-ghost`
      : `btn-${variant}`;
  
  const sizeClass = size ? `btn-${size}` : '';
  
  const iconClass = icon ? 'btn-icon' : '';
  
  const loadingClass = loading ? 'btn-loading' : '';
  
  const blockClass = block ? 'btn-block' : '';
  
  const inlineClass = inline ? 'btn-inline' : '';
  
  const classes = [
    baseClass,
    variantClass,
    sizeClass,
    iconClass,
    loadingClass,
    blockClass,
    inlineClass,
    className
  ].filter(Boolean).join(' ');

  // ── Render ────────────────────────────────────────────────────

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      id={id}
      aria-label={ariaLabel}
      aria-busy={loading}
      {...rest}
    >
      {children}
    </button>
  );
};

// ─── Botón con ícono ─────────────────────────────────────────────

export const IconButton = ({
  icon,
  variant = 'primary',
  size = 'md',
  type = 'button',
  outline = false,
  ghost = false,
  loading = false,
  className = '',
  onClick,
  disabled = false,
  title,
  id,
  ariaLabel,
  ...rest
}) => {
  return (
    <Button
      variant={variant}
      size={size}
      type={type}
      outline={outline}
      ghost={ghost}
      icon={true}
      loading={loading}
      className={className}
      onClick={onClick}
      disabled={disabled}
      title={title}
      id={id}
      ariaLabel={ariaLabel}
      {...rest}
    >
      {icon}
    </Button>
  );
};

// ─── Botón con ícono y texto ────────────────────────────────────

export const IconTextButton = ({
  icon,
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  outline = false,
  ghost = false,
  loading = false,
  block = false,
  className = '',
  onClick,
  disabled = false,
  title,
  id,
  ariaLabel,
  iconPosition = 'left',
  ...rest
}) => {
  return (
    <Button
      variant={variant}
      size={size}
      type={type}
      outline={outline}
      ghost={ghost}
      loading={loading}
      block={block}
      className={className}
      onClick={onClick}
      disabled={disabled}
      title={title}
      id={id}
      ariaLabel={ariaLabel}
      {...rest}
    >
      {iconPosition === 'left' && icon}
      {children}
      {iconPosition === 'right' && icon}
    </Button>
  );
};

// ─── Grupo de botones ────────────────────────────────────────────

export const ButtonGroup = ({
  children,
  className = '',
  vertical = false,
  ...rest
}) => {
  const classes = [
    'btn-group',
    vertical ? 'btn-group-vertical' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} role="group" {...rest}>
      {children}
    </div>
  );
};

// ─── Exportación por defecto ─────────────────────────────────────

export default Button;