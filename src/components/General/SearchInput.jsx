import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Filter } from 'react-feather';

/**
 * Componente de búsqueda reutilizable
 * 
 * @param {Object} props
 * @param {string} props.value - Valor controlado
 * @param {Function} props.onChange - Función al cambiar el valor
 * @param {Function} props.onSearch - Función al buscar (Enter o clic)
 * @param {string} props.placeholder - Texto placeholder
 * @param {string} props.size - sm, md, lg
 * @param {string} props.variant - default, primary, ghost
 * @param {string} props.className - Clases adicionales
 * @param {boolean} props.loading - Estado de carga
 * @param {boolean} props.clearable - Mostrar botón de limpiar
 * @param {boolean} props.filterable - Mostrar botón de filtros
 * @param {Function} props.onFilterClick - Función al hacer clic en filtros
 * @param {string} props.filterLabel - Etiqueta del botón de filtros
 * @param {boolean} props.hasFilters - Indica si hay filtros activos
 * @param {React.ReactNode} props.filterContent - Contenido del panel de filtros
 * @param {boolean} props.autoFocus - Auto focus al montar
 * @param {Function} props.onClear - Función al limpiar
 * @param {Function} props.onFocus - Función al enfocar
 * @param {Function} props.onBlur - Función al perder foco
 * @param {string} props.id - ID del input
 * @param {string} props.name - Nombre del input
 * @param {string} props.ariaLabel - Etiqueta ARIA
 * @param {boolean} props.disabled - Deshabilitado
 * @param {string} props.hotkey - Tecla de acceso rápido (ej: 'Ctrl+K')
 * @param {number} props.debounceDelay - Delay para debounce (ms)
 */

const SearchInput = ({
  // Valor y eventos
  value = '',
  onChange,
  onSearch,
  
  // Estilos
  placeholder = 'Buscar...',
  size = 'md',
  variant = 'default',
  className = '',
  
  // Estados
  loading = false,
  clearable = true,
  filterable = false,
  hasFilters = false,
  disabled = false,
  autoFocus = false,
  
  // Filtros
  onFilterClick,
  filterLabel = 'Filtros',
  filterContent = null,
  
  // Eventos adicionales
  onClear,
  onFocus,
  onBlur,
  
  // Accesibilidad
  id,
  name,
  ariaLabel = 'Buscar',
  hotkey = null,
  
  // Configuración
  debounceDelay = 300,
  
  // Otros
  ...rest
}) => {
  const [internalValue, setInternalValue] = useState(value || '');
  const [isFocused, setIsFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef(null);
  const debounceTimer = useRef(null);

  // ── Sincronizar con valor externo ─────────────────────────────

  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  // ── Hotkey ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!hotkey) return;

    const handleKeyDown = (e) => {
      // Ctrl+K o Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [hotkey]);

  // ── Auto focus ─────────────────────────────────────────────────

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // ── Handlers ───────────────────────────────────────────────────

  const handleChange = (e) => {
    const newValue = e.target.value;
    setInternalValue(newValue);

    // Debounce para onChange
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (onChange) {
      debounceTimer.current = setTimeout(() => {
        onChange(newValue);
      }, debounceDelay);
    }
  };

  const handleClear = () => {
    setInternalValue('');
    if (onChange) onChange('');
    if (onClear) onClear();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (onSearch) {
        onSearch(internalValue);
      }
      // Si no hay onSearch, usamos onChange
      if (!onSearch && onChange) {
        onChange(internalValue);
      }
    }
    if (e.key === 'Escape') {
      handleClear();
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

  const handleFilterToggle = () => {
    setShowFilters(!showFilters);
    if (onFilterClick) onFilterClick(!showFilters);
  };

  // ── Construir clases ──────────────────────────────────────────

  const containerClasses = [
    'search-input-container',
    `search-input-${size}`,
    `search-input-${variant}`,
    isFocused ? 'search-input-focused' : '',
    loading ? 'search-input-loading' : '',
    disabled ? 'search-input-disabled' : '',
    className
  ].filter(Boolean).join(' ');

  const inputClasses = [
    'search-input-field',
    filterable ? 'search-input-with-filter' : '',
    clearable && internalValue ? 'search-input-with-clear' : ''
  ].filter(Boolean).join(' ');

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className={containerClasses}>
      <div className="search-input-wrapper">
        {/* ── Icono de búsqueda ────────────────────────────────── */}
        <span className="search-input-icon">
          {loading ? (
            <span className="search-input-spinner"></span>
          ) : (
            <Search size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
          )}
        </span>

        {/* ── Input ───────────────────────────────────────────── */}
        <input
          ref={inputRef}
          type="text"
          id={id}
          name={name}
          className={inputClasses}
          value={internalValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-disabled={disabled}
          aria-busy={loading}
          role="searchbox"
          {...rest}
        />

        {/* ── Hotkey hint ──────────────────────────────────────── */}
        {hotkey && !internalValue && !isFocused && (
          <span className="search-input-hotkey">
            {hotkey}
          </span>
        )}

        {/* ── Botón de limpiar ────────────────────────────────── */}
        {clearable && internalValue && (
          <button
            type="button"
            className="search-input-clear"
            onClick={handleClear}
            aria-label="Limpiar búsqueda"
            title="Limpiar búsqueda"
          >
            <X size={size === 'sm' ? 12 : size === 'lg' ? 18 : 14} />
          </button>
        )}

        {/* ── Botón de filtros ────────────────────────────────── */}
        {filterable && (
          <button
            type="button"
            className={`search-input-filter-btn ${hasFilters ? 'search-input-filter-active' : ''} ${
              showFilters ? 'search-input-filter-open' : ''
            }`}
            onClick={handleFilterToggle}
            aria-label="Filtros"
            title="Filtros"
          >
            <Filter size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
            {hasFilters && <span className="search-input-filter-dot"></span>}
            <span className="search-input-filter-label">{filterLabel}</span>
          </button>
        )}
      </div>

      {/* ── Panel de filtros ───────────────────────────────────── */}
      {filterable && showFilters && filterContent && (
        <div className="search-input-filters-panel">
          <div className="search-input-filters-header">
            <span className="search-input-filters-title">Filtros</span>
            <button
              className="search-input-filters-close"
              onClick={() => setShowFilters(false)}
              aria-label="Cerrar filtros"
            >
              <X size={14} />
            </button>
          </div>
          <div className="search-input-filters-content">
            {filterContent}
          </div>
          <div className="search-input-filters-actions">
            <button
              className="search-input-filters-clear"
              onClick={() => {
                if (onClear) onClear();
                setShowFilters(false);
              }}
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      )}

      {/* ── Contador de resultados ────────────────────────────── */}
      {rest.totalResults !== undefined && (
        <div className="search-input-results-count">
          {rest.totalResults} resultados
        </div>
      )}
    </div>
  );
};

// ─── Componente de búsqueda con sugerencias ──────────────────────

export const SearchInputWithSuggestions = ({
  suggestions = [],
  onSelectSuggestion,
  renderSuggestion,
  ...props
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      if (onSelectSuggestion) {
        onSelectSuggestion(suggestions[selectedIndex]);
        setShowSuggestions(false);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleFocus = () => {
    if (props.value && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleChange = (value) => {
    if (props.onChange) props.onChange(value);
    if (value && suggestions.length > 0) {
      setShowSuggestions(true);
      setSelectedIndex(-1);
    } else {
      setShowSuggestions(false);
    }
  };

  const defaultRenderSuggestion = (suggestion) => (
    <div className="search-suggestion-item">
      {suggestion.label || suggestion}
    </div>
  );

  return (
    <div className="search-input-suggestions-wrapper" ref={wrapperRef}>
      <SearchInput
        {...props}
        onChange={handleChange}
        onFocus={handleFocus}
        onKeyDown={(e) => {
          if (props.onKeyDown) props.onKeyDown(e);
          handleKeyDown(e);
        }}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="search-input-suggestions">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className={`search-suggestion-item ${
                index === selectedIndex ? 'search-suggestion-selected' : ''
              }`}
              onClick={() => {
                if (onSelectSuggestion) onSelectSuggestion(suggestion);
                setShowSuggestions(false);
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              {renderSuggestion
                ? renderSuggestion(suggestion)
                : defaultRenderSuggestion(suggestion)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchInput;