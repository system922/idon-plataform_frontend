import React, { useState, forwardRef } from 'react';
import { FiEye, FiEyeOff, FiX, FiAlertCircle } from 'react-icons/fi';

/**
 * Componente Input reutilizable para todo el sistema
 * 
 * @param {Object} props
 * @param {string} props.label - Etiqueta del campo
 * @param {string} props.type - tipo: text, password, email, number, tel, textarea, money (NUEVO)
 * @param {string} props.value - Valor controlado
 * @param {Function} props.onChange - Función al cambiar
 * @param {string} props.placeholder - Placeholder
 * @param {string} props.size - sm, md, lg
 * @param {string} props.variant - default, ghost, bordered
 * @param {boolean} props.required - Campo requerido
 * @param {boolean} props.disabled - Deshabilitado
 * @param {boolean} props.readOnly - Solo lectura
 * @param {boolean} props.clearable - Mostrar botón de limpiar
 * @param {string} props.error - Mensaje de error
 * @param {string} props.help - Texto de ayuda
 * @param {React.ReactNode} props.icon - Icono izquierdo
 * @param {React.ReactNode} props.iconRight - Icono derecho
 * @param {string} props.className - Clases adicionales
 * @param {number} props.rows - Filas para textarea
 * @param {number} props.maxLength - Máximo de caracteres
 * @param {Function} props.onClear - Función al limpiar
 * @param {Function} props.onEnter - Función al presionar Enter
 * @param {boolean} props.autoFocus - Auto focus
 * @param {string} props.id - ID del campo
 * @param {string} props.name - Nombre del campo
 */
const Input = forwardRef(({
  // Valor y eventos
  value = '',
  onChange,
  onEnter,
  onClear,
  onFocus,
  onBlur,
  
  // Etiqueta y placeholder
  label,
  placeholder = '',
  type = 'text',
  
  // Estilos
  size = 'md',
  variant = 'default',
  className = '',
  
  // Estados
  required = false,
  disabled = false,
  readOnly = false,
  clearable = false,
  error = '',
  help = '',
  
  // Iconos
  icon = null,
  iconRight = null,
  
  // Textarea
  rows = 3,
  maxLength,
  
  // Accesibilidad
  id,
  name,
  autoFocus = false,
  autoComplete = 'off',
  
  // Otros
  ...rest
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ── Handlers ──────────────────────────────────────────────────

  const handleChange = (e) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  const handleClear = () => {
    if (onChange) {
      onChange('');
    }
    if (onClear) {
      onClear();
    }
    // Enfocar después de limpiar
    if (ref && ref.current) {
      ref.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && onEnter) {
      onEnter(e.target.value);
    }
  };

  const handleFocus = (e) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  // ── Construir clases ─────────────────────────────────────────

  const containerClasses = [
    'input-container',
    `input-${size}`,
    `input-${variant}`,
    isFocused ? 'input-focused' : '',
    error ? 'input-error' : '',
    disabled ? 'input-disabled' : '',
    readOnly ? 'input-readonly' : '',
    className
  ].filter(Boolean).join(' ');

  const inputClasses = [
    'input-field',
    icon ? 'input-with-icon' : '',
    (clearable && value) ? 'input-with-clear' : '',
    iconRight || type === 'password' ? 'input-with-icon-right' : '',
    error ? 'input-field-error' : '',
  ].filter(Boolean).join(' ');

  const isPassword = type === 'password';
  // 👇 CAMBIO CLAVE: Si es 'money', se comporta como texto para permitir el punto
  const inputType = type === 'money' ? 'text' : (isPassword && showPassword ? 'text' : type);
  const isTextarea = type === 'textarea';

  // ── Render ────────────────────────────────────────────────────

  const renderInput = () => {
    if (isTextarea) {
      return (
        <textarea
          ref={ref}
          id={id}
          name={name}
          className={inputClasses}
          value={value || ''}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          rows={rows}
          maxLength={maxLength}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          {...rest}
        />
      );
    }

    return (
      <input
        ref={ref}
        id={id}
        name={name}
        type={inputType}
        className={inputClasses}
        value={value || ''}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        maxLength={maxLength}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        required={required}
        {...rest}
      />
    );
  };

  return (
    <div className={containerClasses}>
      {/* ── Label ────────────────────────────────────────────────── */}
      {label && (
        <label htmlFor={id} className="input-label">
          {label}
          {required && <span className="input-required">*</span>}
        </label>
      )}

      {/* ── Wrapper con iconos ────────────────────────────────── */}
      <div className="input-wrapper">
        {/* Icono izquierdo */}
        {icon && (
          <span className="input-icon-left">
            {icon}
          </span>
        )}

        {/* Input */}
        {renderInput()}

        {/* Contador de caracteres */}
        {maxLength && (
          <span className="input-char-counter">
            {String(value || '').length}/{maxLength}
          </span>
        )}

        {/* Botón de limpiar */}
        {clearable && value && !disabled && !readOnly && (
          <button
            type="button"
            className="input-clear-btn"
            onClick={handleClear}
            title="Limpiar"
            aria-label="Limpiar"
          >
            <FiX size={14} />
          </button>
        )}

        {/* Botón mostrar/ocultar contraseña */}
        {isPassword && !readOnly && (
          <button
            type="button"
            className="input-password-toggle"
            onClick={togglePassword}
            title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
          </button>
        )}

        {/* Icono derecho personalizado */}
        {iconRight && !isPassword && (
          <span className="input-icon-right">
            {iconRight}
          </span>
        )}
      </div>

      {/* ── Error y ayuda ──────────────────────────────────────── */}
      {error && (
        <div className="input-helper input-helper-error">
          <FiAlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
      
      {help && !error && (
        <div className="input-helper input-helper-help">
          {help}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;