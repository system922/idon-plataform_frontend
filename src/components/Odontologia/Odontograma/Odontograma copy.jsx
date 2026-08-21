// src/pages/business/components/OdontogramaDigital.jsx
import React from 'react';
import odontogramaImg from '../assets/Odontologia/odontograma.png';

// ============================================================
// NUMERACIÓN DE DIENTES (2 filas, 16 columnas)
// ============================================================
const TOOTH_LAYOUT = [
  [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
  [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38],
];

// ============================================================
// POSICIONES MANUALES (AJUSTA ESTOS VALORES)
// ============================================================
// Cada diente tiene: { left, top, width, height } en porcentaje (%)
// left: distancia desde el borde izquierdo de la imagen
// top: distancia desde el borde superior
// width: ancho del área clickeable
// height: alto del área clickeable
//
// CÓMO CALCULAR:
// 1. Abre la imagen en el navegador y abre las herramientas de desarrollador (F12)
// 2. Inspecciona la imagen y obtén sus dimensiones (ancho y alto en píxeles)
// 3. Para cada diente, mide la posición X e Y (esquina superior izquierda) y el ancho y alto
// 4. Convierte a porcentaje: (pixel / total_pixels) * 100
//
// EJEMPLO: si la imagen mide 1400px de ancho y el diente 18 empieza en X=100px, left = 100/1400*100 = 7.14%

const TOOTH_POSITIONS_MANUAL = {
  // Fila superior - top: 0, height hasta 609px (0% a 40.3%)
  18: { left: 0.0, top: 0.0, width: 7.28, height: 40.3 },
  17: { left: 7.28, top: 0.0, width: 7.70, height: 40.3 },
  16: { left: 14.80, top: 0.0, width: 8.10, height: 40.3 },
  15: { left: 22.80, top: 0.0, width: 5.60, height: 40.3 },
  14: { left: 28.40, top: 0.0, width: 5.82, height: 40.3 },
  13: { left: 33.90, top: 0.0, width: 5.67, height: 40.3 },
  12: { left: 39.50, top: 0.0, width: 5.40, height: 40.3 },
  11: { left: 44.70, top: 0.0, width: 5.71, height: 40.3 },
  21: { left: 50.30, top: 0.0, width: 5.71, height: 40.3 },
  22: { left: 55.88, top: 0.0, width: 5.40, height: 40.3 },
  23: { left: 61.00, top: 0.0, width: 5.67, height: 40.3 },
  24: { left: 66.65, top: 0.0, width: 5.82, height: 40.3 },
  25: { left: 72.15, top: 0.0, width: 5.60, height: 40.3 },
  26: { left: 77.60, top: 0.0, width: 8.00, height: 40.3 },
  27: { left: 85.50, top: 0.0, width: 7.80, height: 40.3 },
  28: { left: 92.90, top: 0.0, width: 7.20, height: 40.3 },

  // Fila inferior - top: 948px hasta 1511px (62.7% a 100%)
  48: { left: 0.0, top: 62.7, width: 7.98, height: 37.3 },
  47: { left: 7.80, top: 62.7, width: 7.98, height: 37.3 },
  46: { left: 15.50, top: 62.7, width: 8.00, height: 37.3 },
  45: { left: 23.40, top: 62.7, width: 5.58, height: 37.3 },
  44: { left: 28.90, top: 62.7, width: 5.82, height: 37.3 },
  43: { left: 34.50, top: 62.7, width: 5.70, height: 37.3 },
  42: { left: 40.00, top: 62.7, width: 5.50, height: 37.3 },
  41: { left: 45.30, top: 62.7, width: 5.70, height: 37.3 },
  31: { left: 50.70, top: 62.7, width: 5.61, height: 37.3 },
  32: { left: 56.00, top: 62.7, width: 5.60, height: 37.3 },
  33: { left: 61.48, top: 62.7, width: 5.47, height: 37.3 },
  34: { left: 66.95, top: 62.7, width: 5.82, height: 37.3 },
  35: { left: 72.57, top: 62.7, width: 5.58, height: 37.3 },
  36: { left: 78.00, top: 62.7, width: 7.80, height: 37.3 },
  37: { left: 85.50, top: 62.7, width: 7.80, height: 37.3 },
  38: { left: 93.20, top: 62.7, width: 7.00, height: 37.3 },
};

// ============================================================
// GENERACIÓN DE POSICIONES (usa manual si existe, sino cuadrícula)
// ============================================================
const TOOTH_POSITIONS = {};

// Si el objeto manual está completo, usarlo; sino generar automático
const hasManualPositions = Object.keys(TOOTH_POSITIONS_MANUAL).length > 0;

if (hasManualPositions) {
  // Usar posiciones manuales
  Object.assign(TOOTH_POSITIONS, TOOTH_POSITIONS_MANUAL);
} else {
  // Generar cuadrícula uniforme (fallback)
  const rows = TOOTH_LAYOUT.length;
  const cols = TOOTH_LAYOUT[0].length;
  const MARGINS = { left: 1.5, top: 3, right: 1.5, bottom: 3 };
  const usableWidth = 100 - MARGINS.left - MARGINS.right;
  const usableHeight = 100 - MARGINS.top - MARGINS.bottom;
  const cellWidth = usableWidth / cols;
  const cellHeight = usableHeight / rows;

  TOOTH_LAYOUT.forEach((row, rowIndex) => {
    row.forEach((toothNum, colIndex) => {
      TOOTH_POSITIONS[toothNum] = {
        left: MARGINS.left + colIndex * cellWidth,
        top: MARGINS.top + rowIndex * cellHeight,
        width: cellWidth,
        height: cellHeight,
      };
    });
  });
}

// ============================================================
// MAPEO DE CONDICIONES Y SUPERFICIES (igual que antes)
// ============================================================
export const CONDITION_MAP = {
  caries: { label: 'Caries', icon: '🦷', color: '#facc15' },
  resina_adaptada: { label: 'Resina adaptada', icon: '🫧', color: '#10b981' },
  resina_desadaptada: { label: 'Resina desadaptada', icon: '🫧', color: '#ef4444' },
  amalgama_adaptada: { label: 'Amalgama adaptada', icon: '🛠️', color: '#10b981' },
  amalgama_desadaptada: { label: 'Amalgama desadaptada', icon: '🛠️', color: '#ef4444' },
  diente_sano: { label: 'Diente sano', icon: '✅', color: '#4ade80' },
  diente_ausente: { label: 'Diente ausente', icon: '❌', color: '#6b7280' },
  sellante_bueno: { label: 'Sellante bueno', icon: '🔒', color: '#3b82f6' },
  sellante_desadaptado: { label: 'Sellante desadaptado', icon: '🔒', color: '#ef4444' },
  fractura: { label: 'Fractura', icon: '💔', color: '#ef4444' },
  corona_buena: { label: 'Corona buena', icon: '👑', color: '#3b82f6' },
  corona_desadaptada: { label: 'Corona desadaptada', icon: '👑', color: '#ef4444' },
  provisional: { label: 'Provisional', icon: '⏳', color: '#f59e0b' },
  extraccion_indicada: { label: 'Extracción indicada', icon: '⚠️', color: '#ef4444' },
  endodoncia_buena: { label: 'Endodoncia buena', icon: '🦷', color: '#8b5cf6' },
  endodoncia_mala: { label: 'Endodoncia mala', icon: '🦷', color: '#ef4444' },
  perno_bueno: { label: 'Perno bueno', icon: '🔩', color: '#3b82f6' },
  perno_malo: { label: 'Perno malo', icon: '🔩', color: '#ef4444' },
  implante_bueno: { label: 'Implante bueno', icon: '💉', color: '#3b82f6' },
  implante_malo: { label: 'Implante malo', icon: '💉', color: '#ef4444' },
  ponico: { label: 'Pónico', icon: '🦷', color: '#ec4899' },
  otro: { label: 'Otros', icon: '❓', color: '#9ca3af' },
};

export const SURFACE_OPTIONS = [
  { value: 'todas', label: 'Todas las superficies' },
  { value: 'vestibular', label: 'Vestibular' },
  { value: 'oclusal', label: 'Oclusal/Incisal' },
  { value: 'lingual', label: 'Lingual/Palatina' },
  { value: 'mesial', label: 'Mesial' },
  { value: 'distal', label: 'Distal' },
];

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function OdontogramaDigital({
  odontogramData = {},
  onToothClick,
  selectedTooth,
  readOnly = false,
  debug = false,
}) {
  const renderTooth = (toothNumber) => {
    const pos = TOOTH_POSITIONS[toothNumber];
    if (!pos) return null;
    const data = odontogramData[toothNumber] || {};
    const conditions = data.conditions || [];
    const surfaces = data.surfaces || [];
    const treatment = data.treatment || '';

    let bgColor = 'rgba(255,255,255,0.05)';
    let borderColor = 'rgba(255,255,255,0.15)';
    let icon = '';
    let label = '';

    if (conditions.length > 0) {
      const firstCond = conditions[0];
      const condInfo = CONDITION_MAP[firstCond];
      if (condInfo) {
        icon = condInfo.icon;
        bgColor = `${condInfo.color}33`;
        borderColor = condInfo.color;
        label = surfaces.length > 0 ? surfaces.map(s => s.charAt(0).toUpperCase()).join('') : '';
        if (!label && conditions.length > 1) label = `+${conditions.length - 1}`;
      }
    } else if (treatment) {
      icon = '🔧';
      borderColor = '#4ade80';
      bgColor = 'rgba(74,222,128,0.2)';
      label = treatment.substring(0, 2);
    }

    const isSelected = selectedTooth === toothNumber;

    return (
      <div
        key={toothNumber}
        onClick={() => !readOnly && onToothClick && onToothClick(toothNumber)}
        style={{
          position: 'absolute',
          left: `${pos.left}%`,
          top: `${pos.top}%`,
          width: `${pos.width}%`,
          height: `${pos.height}%`,
          backgroundColor: isSelected ? 'rgba(104,66,254,0.4)' : bgColor,
          border: isSelected ? '2px solid #6842fe' : `1.5px solid ${borderColor}`,
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
          overflow: 'hidden',
          userSelect: 'none',
          ...(debug && { border: '2px solid rgba(255,0,0,0.8)', backgroundColor: 'rgba(255,0,0,0.1)' }),
        }}
        title={`Diente #${toothNumber}\nCondiciones: ${conditions.join(', ') || 'Ninguna'}\nSuperficies: ${surfaces.join(', ') || 'Ninguna'}\nTratamiento: ${treatment || '—'}`}
      >
        <div style={{ fontSize: 12, lineHeight: 1.2 }}>{icon || toothNumber}</div>
        {label && <div style={{ fontSize: 7, opacity: 0.8, marginTop: 1 }}>{label}</div>}
      </div>
    );
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <img
        src={odontogramaImg}
        alt="Odontograma"
        style={{ width: '100%', display: 'block', borderRadius: 8 }}
      />
      {Object.keys(TOOTH_POSITIONS).map(num => renderTooth(parseInt(num)))}
    </div>
  );
}