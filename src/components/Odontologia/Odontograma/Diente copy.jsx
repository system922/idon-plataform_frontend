// src/components/Odontologia/Diente.jsx
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { CONDITION_MAP } from '.';

// ============================================================
// SELECTOR DE CARAS (VERSIÓN CON POLÍGONOS - DISEÑO PROFESIONAL)
// ============================================================
const CaraSelector = ({ toothNumber, caras = {}, onCaraClick, readOnly }) => {
  // Mapeo fijo: Arriba=Vestibular, Abajo=Lingual, Izquierda=Mesial, Derecha=Distal, Centro=Oclusal
  const mapeo = {
    arriba: 'vestibular',
    izquierda: 'mesial',
    centro: 'oclusal',
    derecha: 'distal',
    abajo: 'lingual',
  };

  const getColor = (condId) => {
    if (!condId) return '#d1d5db';
    return CONDITION_MAP[condId]?.color || '#d1d5db';
  };

  const handleClick = (caraKey, e) => {
    e.stopPropagation();
    if (readOnly) return;
    onCaraClick?.(toothNumber, caraKey);
  };

  const colors = {
    V: getColor(caras[mapeo.arriba]),
    M: getColor(caras[mapeo.izquierda]),
    D: getColor(caras[mapeo.derecha]),
    L: getColor(caras[mapeo.abajo]),
    O: getColor(caras[mapeo.centro]),
  };

  return (
    <div 
      style={{ 
        width: '100%', 
        height: '100%',
        borderRadius: '4px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        overflow: 'hidden',
        background: '#f1f5f9',
        border: 'none',
      }}
    >
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', display: 'block' }}>
        {/* Vestibular (arriba) */}
        <polygon
          points="5,5 95,5 75,25 25,25"
          fill={colors.V}
          stroke="#94a3b8"
          strokeWidth="0.8"
          onClick={(e) => handleClick('vestibular', e)}
          style={{ cursor: readOnly ? 'default' : 'pointer', transition: 'fill 0.15s' }}
          onMouseEnter={(e) => { if (!readOnly) e.currentTarget.style.opacity = '0.8'; }}
          onMouseLeave={(e) => { if (!readOnly) e.currentTarget.style.opacity = '1'; }}
        />

        {/* Distal (derecha) */}
        <polygon
          points="95,5 95,95 75,75 75,25"
          fill={colors.D}
          stroke="#94a3b8"
          strokeWidth="0.8"
          onClick={(e) => handleClick('distal', e)}
          style={{ cursor: readOnly ? 'default' : 'pointer', transition: 'fill 0.15s' }}
          onMouseEnter={(e) => { if (!readOnly) e.currentTarget.style.opacity = '0.8'; }}
          onMouseLeave={(e) => { if (!readOnly) e.currentTarget.style.opacity = '1'; }}
        />

        {/* Lingual (abajo) */}
        <polygon
          points="5,95 95,95 75,75 25,75"
          fill={colors.L}
          stroke="#94a3b8"
          strokeWidth="1"
          onClick={(e) => handleClick('lingual', e)}
          style={{ cursor: readOnly ? 'default' : 'pointer', transition: 'fill 0.15s' }}
          onMouseEnter={(e) => { if (!readOnly) e.currentTarget.style.opacity = '0.8'; }}
          onMouseLeave={(e) => { if (!readOnly) e.currentTarget.style.opacity = '1'; }}
        />

        {/* Mesial (izquierda) */}
        <polygon
          points="5,5 25,25 25,75 5,95"
          fill={colors.M}
          stroke="#94a3b8"
          strokeWidth="0.8"
          onClick={(e) => handleClick('mesial', e)}
          style={{ cursor: readOnly ? 'default' : 'pointer', transition: 'fill 0.15s' }}
          onMouseEnter={(e) => { if (!readOnly) e.currentTarget.style.opacity = '0.8'; }}
          onMouseLeave={(e) => { if (!readOnly) e.currentTarget.style.opacity = '1'; }}
        />

        {/* Oclusal (centro) */}
        <rect
          x="25"
          y="25"
          width="50"
          height="50"
          fill={colors.O}
          stroke="#94a3b8"
          strokeWidth="0.8"
          onClick={(e) => handleClick('oclusal', e)}
          style={{ cursor: readOnly ? 'default' : 'pointer', transition: 'fill 0.15s' }}
          onMouseEnter={(e) => { if (!readOnly) e.currentTarget.style.opacity = '0.8'; }}
          onMouseLeave={(e) => { if (!readOnly) e.currentTarget.style.opacity = '1'; }}
        />

        {/* Letras */}
        <text x="50" y="18" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#0f172a" pointerEvents="none" fontFamily="Arial">
          V
        </text>

        <text x="12" y="52" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#0f172a" pointerEvents="none" fontFamily="Arial">
          M
        </text>

        <text x="88" y="52" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#0f172a" pointerEvents="none" fontFamily="Arial">
          D
        </text>

        <text x="50" y="88" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#0f172a" pointerEvents="none" fontFamily="Arial">
          L
        </text>

        <text x="50" y="54" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#0f172a" pointerEvents="none" fontFamily="Arial">
          O
        </text>
      </svg>
    </div>
  );
};

// ============================================================
// AJUSTES DE POSICIÓN (no modificados)
// ============================================================
const OFFSET_DIENTE_SUPERIOR = 0;
const OFFSET_DIENTE_INFERIOR = -3.5;
const OFFSET_CARA_SUPERIOR = '135px';
const OFFSET_CARA_INFERIOR = 'calc(100% - 180px)';

// ============================================================
// COMPONENTE TOOLTIP (se renderiza en el body con Portal)
// ============================================================
const TooltipPortal = ({ children, targetRef }) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [show, setShow] = useState(false);
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (!targetRef?.current) return;

    const updatePosition = () => {
      const rect = targetRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 10,
        left: rect.left + rect.width / 2,
      });
    };

    const handleMouseEnter = () => {
      updatePosition();
      setShow(true);
    };

    const handleMouseLeave = () => {
      setShow(false);
    };

    const element = targetRef.current;
    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [targetRef]);

  if (!show) return null;

  return ReactDOM.createPortal(
    <div
      ref={tooltipRef}
      style={{
        position: 'fixed',
        top: position.top - 10,
        left: position.left,
        transform: 'translate(-50%, -100%)',
        background: '#1e293b',
        color: '#f8fafc',
        padding: '8px 14px',
        borderRadius: '6px',
        fontSize: '12px',
        zIndex: 99999,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        pointerEvents: 'none',
        minWidth: '160px',
      }}
    >
      {children}
    </div>,
    document.body
  );
};

// ============================================================
// COMPONENTE DIENTE
// ============================================================
export default function Diente({
  toothNumber,
  position,
  data,
  isSelected,
  onToothClick,
  onUpdateTooth,
  readOnly,
  isUpper,
}) {
  const dienteRef = useRef(null);

  const { conditions = [], surfaces = [], treatment = '', caras = {} } = data;
  const firstCondition = conditions[0] || data.condition;
  const condInfo = CONDITION_MAP[firstCondition];
  const icon = condInfo?.icon;
  const bgColor = condInfo ? `${condInfo.color}33` : 'rgba(255,255,255,0.05)';
  const borderColor = condInfo?.color || 'rgba(255,255,255,0.15)';

  // Obtener texto de superficies para el tooltip
  const getSurfacesText = () => {
    if (surfaces && surfaces.length > 0) {
      return surfaces.join(', ');
    }
    if (caras && Object.keys(caras).length > 0) {
      return Object.keys(caras).join(', ');
    }
    return null;
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (!readOnly) onToothClick(toothNumber);
  };

  const handleCaraClick = (tooth, cara) => {
    const current = caras[cara] || null;
    const newCaras = { ...caras };
    let newSurfaces = [...(surfaces || [])];
    if (current) {
      delete newCaras[cara];
      newSurfaces = newSurfaces.filter(s => s !== cara);
    } else {
      newCaras[cara] = 'caries';
      if (!newSurfaces.includes(cara)) {
        newSurfaces.push(cara);
      }
    }
    onUpdateTooth(tooth, { caras: newCaras, surfaces: newSurfaces });
  };

  const offsetDiente = isUpper ? OFFSET_DIENTE_SUPERIOR : OFFSET_DIENTE_INFERIOR;
  const topFinal = position.top + offsetDiente;
  const selectorTop = isUpper ? OFFSET_CARA_SUPERIOR : OFFSET_CARA_INFERIOR;

  const renderContent = () => {
    if (icon && typeof icon === 'string') {
      return (
        <img
          src={icon}
          alt={condInfo?.label}
          style={{
            width: '40px',
            height: '40px',
            display: 'block',
            objectFit: 'contain',
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        />
      );
    } else if (icon) {
      return <span style={{ fontSize: '24px', lineHeight: '1.2' }}>{icon}</span>;
    } else {
      return null;
    }
  };

  const renderSurfaces = () => {
    if (surfaces.length === 0) return null;
    return (
      <div style={{ fontSize: 9, opacity: 0.8, marginTop: 1, color: '#000000', fontWeight: 600 }}>
        {surfaces.map(s => s.charAt(0).toUpperCase()).join('')}
      </div>
    );
  };

  // Contenido del tooltip
  const hallazgoLabel = condInfo?.label || 'Sin hallazgo';
  const superficiesText = getSurfacesText();
  
  const tooltipContent = (
    <div style={{ lineHeight: '1.6' }}>
      <div><strong>Diente:</strong> {toothNumber}</div>
      <div><strong>Hallazgo:</strong> {hallazgoLabel}</div>
      <div><strong>Superficie:</strong> {superficiesText || 'Ninguna'}</div>
    </div>
  );

  return (
    <>
      <div
        ref={dienteRef}
        className={`odont-diente ${isSelected ? 'selected' : ''}`}
        onClick={handleClick}
        style={{
          position: 'absolute',
          left: `${position.left}%`,
          top: `${topFinal}%`,
          width: `${position.width}%`,
          height: `${position.height}%`,
          backgroundColor: isSelected ? 'rgba(239,68,68,0.15)' : bgColor,
          border: isSelected ? '2px solid #ef4444' : `1.5px solid ${borderColor}`,
          borderRadius: 4,
          cursor: readOnly ? 'default' : 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 10,
          fontWeight: 600,
          transition: 'all 0.2s ease',
          textShadow: '0 0 4px rgba(0,0,0,0.5)',
          overflow: 'visible',
          userSelect: 'none',
          zIndex: isSelected ? 10 : 1,
        }}
      >
        {isUpper ? (
          <>
            {renderContent()}
            {renderSurfaces()}
          </>
        ) : (
          <>
            {renderSurfaces()}
            {renderContent()}
          </>
        )}

        {!readOnly && (
          <div
            style={{
              position: 'absolute',
              top: selectorTop,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '50px',
              height: '50px',
              zIndex: 20,
              pointerEvents: 'auto',
            }}
          >
            <CaraSelector
              toothNumber={toothNumber}
              caras={caras}
              onCaraClick={handleCaraClick}
              readOnly={readOnly}
            />
          </div>
        )}
      </div>

      {/* Tooltip renderizado en el body con Portal */}
      <TooltipPortal targetRef={dienteRef}>
        {tooltipContent}
      </TooltipPortal>
    </>
  );
}