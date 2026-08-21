import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { FiChevronDown } from 'react-icons/fi';

const CustomCombobox = ({
  options = [],
  value = '',
  onChange,
  placeholder = 'Selecciona...',
  filterable = true,
  disabled = false,
  className = '',
  size = 'md', // sm, md, lg
  dropup = false,
  forceDropup = null, // true: fuerza arriba, false: fuerza abajo, null: automático
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ 
    top: 0, 
    left: 0, 
    width: 0, 
    maxHeight: 280, 
    placement: 'bottom' 
  });
  
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selectedOption = options.find(opt => opt.value === value);
  const displayLabel = selectedOption?.label || '';

  const filteredOptions = filterable && searchTerm
    ? options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  // ── Tamaños ──────────────────────────────────────────────────
  const sizeStyles = {
    sm: {
      height: 32,
      fontSize: 12,
      padding: '4px 8px',
      iconSize: 14,
    },
    md: {
      height: 40,
      fontSize: 13,
      padding: '8px 12px',
      iconSize: 18,
    },
    lg: {
      height: 48,
      fontSize: 15,
      padding: '10px 16px',
      iconSize: 20,
    },
  };

  const currentSize = sizeStyles[size] || sizeStyles.md;

  // ── Actualizar posición del dropdown ──────────────────────
  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const gap = 4;
    const viewportPadding = 8;
    
    // ✅ Determinar si debe abrir hacia arriba
    let shouldOpenAbove;
    
    // Si forceDropup está definido (true o false), usarlo
    if (forceDropup !== null && forceDropup !== undefined) {
      shouldOpenAbove = forceDropup;
    } 
    // Si no, usar la prop dropup (legacy)
    else if (dropup) {
      shouldOpenAbove = true;
    } 
    // Si no, calcular automáticamente
    else {
      const spaceBelow = Math.max(0, viewportHeight - rect.bottom - gap - viewportPadding);
      const spaceAbove = Math.max(0, rect.top - gap - viewportPadding);
      
      const estimatedHeight = Math.min(filteredOptions.length * 38 + 10, 280);
      const neededHeight = Math.max(120, Math.min(estimatedHeight, 280));
      
      shouldOpenAbove = spaceBelow < neededHeight || spaceAbove > spaceBelow;
    }
    
    // Calcular espacios disponibles
    const spaceBelow = Math.max(0, viewportHeight - rect.bottom - gap - viewportPadding);
    const spaceAbove = Math.max(0, rect.top - gap - viewportPadding);
    const availableHeight = shouldOpenAbove ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(120, Math.min(280, availableHeight || 280));

    // Posición horizontal
    const left = Math.max(
      viewportPadding,
      Math.min(rect.left, viewportWidth - rect.width - viewportPadding)
    );

    // Posición vertical
    let top;
    if (shouldOpenAbove) {
      top = Math.max(viewportPadding, rect.top - gap - maxHeight);
    } else {
      top = rect.bottom + gap;
    }

    setDropdownPosition({
      top,
      left,
      width: rect.width,
      maxHeight,
      placement: shouldOpenAbove ? 'top' : 'bottom',
    });
  }, [filteredOptions.length, dropup, forceDropup]);

  // ── Abrir/cerrar dropdown ──────────────────────────────────
  const toggleOpen = () => {
    if (disabled) return;
    const newOpen = !isOpen;
    setIsOpen(newOpen);
    if (newOpen) {
      requestAnimationFrame(() => {
        updatePosition();
      });
      setSearchTerm('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  // ── Efecto para actualizar posición ──────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const handleUpdate = () => updatePosition();
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);
    
    // También actualizar cuando cambie el tamaño del modal
    const modalContent = document.querySelector('.modal-content');
    if (modalContent) {
      modalContent.addEventListener('scroll', handleUpdate);
    }

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
      if (modalContent) {
        modalContent.removeEventListener('scroll', handleUpdate);
      }
    };
  }, [isOpen, updatePosition]);

  // ── Resetear highlighted index ────────────────────────────
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [filteredOptions]);

  // ── Cerrar al hacer click fuera ───────────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // ── Manejar teclado ──────────────────────────────────────
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        toggleOpen();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          selectOption(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  // ── Seleccionar opción ──────────────────────────────────
  const selectOption = (option) => {
    onChange(option.value);
    setIsOpen(false);
    setSearchTerm('');
    inputRef.current?.focus();
  };

  // ── Manejar cambio en input ─────────────────────────────
  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  // ── Renderizar dropdown con Portal ──────────────────────
  const renderDropdown = () => {
    if (!isOpen) return null;

    const style = {
      position: 'fixed',
      top: dropdownPosition.top,
      left: dropdownPosition.left,
      width: dropdownPosition.width,
      maxHeight: dropdownPosition.maxHeight,
      overflowY: 'auto',
      background: '#ffffff',
      border: '1px solid #e8edf3',
      borderRadius: 8,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      zIndex: 99999,
      padding: '4px 0',
      listStyle: 'none',
      margin: 0,
      transformOrigin: dropdownPosition.placement === 'top' ? 'bottom left' : 'top left',
    };

    return ReactDOM.createPortal(
      <ul style={style}>
        {filteredOptions.length === 0 ? (
          <li style={{ padding: '12px 16px', color: '#8a9bb5', fontSize: currentSize.fontSize }}>
            No hay opciones
          </li>
        ) : (
          filteredOptions.map((opt, idx) => (
            <li
              key={opt.value}
              style={{
                padding: `${currentSize.height === 32 ? '6px 12px' : '10px 16px'}`,
                cursor: 'pointer',
                fontSize: currentSize.fontSize,
                color: opt.value === value ? '#1a2332' : '#4a5a6e',
                background: idx === highlightedIndex
                  ? '#f1f4f9'
                  : 'transparent',
                fontWeight: opt.value === value ? 600 : 400,
                transition: 'background 0.15s',
              }}
              onMouseEnter={() => setHighlightedIndex(idx)}
              onMouseDown={(e) => {
                e.preventDefault();
                selectOption(opt);
              }}
            >
              {opt.label}
            </li>
          ))
        )}
      </ul>,
      document.body
    );
  };

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className={`custom-combobox custom-combobox-${size} ${className}`}
      style={{ position: 'relative', width: '100%' }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: '#f8fafc',
          border: '2px solid #e8edf3',
          borderRadius: 8,
          padding: `0 ${currentSize.padding}`,
          height: currentSize.height,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          transition: 'border-color 0.2s',
          minWidth: 0,
        }}
        onClick={toggleOpen}
      >
        <input
          ref={inputRef}
          type="text"
          value={filterable ? (isOpen ? searchTerm : displayLabel) : displayLabel}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={!filterable}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#1a2332',
            fontSize: currentSize.fontSize,
            padding: currentSize.padding,
            minWidth: 0,
            width: '100%',
          }}
        />
        <FiChevronDown
          size={currentSize.iconSize}
          style={{
            color: '#8a9bb5',
            flexShrink: 0,
            marginLeft: 4,
            transition: 'transform 0.2s',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </div>
      {renderDropdown()}
    </div>
  );
};

export default CustomCombobox;