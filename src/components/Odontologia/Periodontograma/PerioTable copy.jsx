// components/Odontologia/Periodontograma/PerioTable.jsx
import React from 'react';

// Rutas a los SVG en la carpeta public (ajusta si es necesario)
const SUPERIOR_IMG = '/Odontologia/periodontograma_s.svg';
const INFERIOR_IMG = '/Odontologia/periodontograma_i.svg';

const ALL_TEETH = {
  superior: [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
  inferior: [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38],
};

// ANCHOS DE COLUMNAS
const COLUMN_WIDTHS = {
  label: 50,
  tooth: {
    18: 37, 17: 37, 16: 37, 15: 30, 14: 30, 13: 30, 12: 30, 11: 30,
    21: 30, 22: 30, 23: 30, 24: 30, 25: 30, 26: 37, 27: 37, 28: 37,
    48: 37, 47: 37, 46: 37, 45: 30, 44: 30, 43: 30, 42: 30, 41: 30,
    31: 30, 32: 30, 33: 30, 34: 30, 35: 37, 36: 37, 37: 37, 38: 37
  }
};

// 🔥 Calcula el ancho total de la tabla
const calculateTotalWidth = () => {
  const allTeeth = [...ALL_TEETH.superior, ...ALL_TEETH.inferior];
  const totalToothWidth = allTeeth.reduce((sum, num) => sum + (COLUMN_WIDTHS.tooth[num] || 50), 0);
  return COLUMN_WIDTHS.label + totalToothWidth;
};

export default function PerioTable({ teethData, activeCara, onToothClick }) {
  // Obtener datos de un diente (con valores por defecto)
  const getToothData = (num) => teethData[num] || { 
    movilidad: 0, 
    implante: false, 
    furcacion: 0, 
    ausente: false, 
    sitios: {} 
  };

  // Verificar si un diente tiene algún dato registrado (para resaltar)
  const hasToothData = (num) => {
    const data = getToothData(num);
    if (data.ausente) return true;
    if (data.movilidad > 0) return true;
    if (data.furcacion > 0) return true;
    if (data.implante) return true;
    // Verificar si hay algún sitio con MG, PS, placa o sangrado
    const sitios = data.sitios || {};
    for (const cara of ['V', 'L']) {
      for (const pos of ['mesial', 'central', 'distal']) {
        const sitio = sitios[cara]?.[pos];
        if (sitio && (sitio.mg > 0 || sitio.ps > 0 || sitio.placa || sitio.sangrado)) {
          return true;
        }
      }
    }
    return false;
  };

  const getSiteValue = (tooth, pos, field) => {
    const data = getToothData(tooth);
    return data.sitios?.[activeCara]?.[pos]?.[field] ?? 0;
  };

  const getSiteBoolean = (tooth, pos, field) => {
    const data = getToothData(tooth);
    return data.sitios?.[activeCara]?.[pos]?.[field] ?? false;
  };

  // Renderizar una celda de una fila específica
  const renderToothCell = (num, row) => {
    const data = getToothData(num);
    const isAusente = data.ausente;
    const hasData = hasToothData(num);

    if (isAusente) {
      return (
        <td 
          key={num} 
          className="perio-cell ausente"
          style={{ 
            width: COLUMN_WIDTHS.tooth[num] || '50px',
            minWidth: COLUMN_WIDTHS.tooth[num] || '50px',
            maxWidth: COLUMN_WIDTHS.tooth[num] || '50px',
            background: '#fef2f2',
            color: '#ef4444',
            fontWeight: 700,
            textAlign: 'center'
          }}
        >
          ✕
        </td>
      );
    }

    const renderValue = () => {
      switch (row) {
        case 'movilidad':
          return <span className="perio-value-center">{data.movilidad || '0'}</span>;
        case 'implante':
          return <span className="perio-value-center">{data.implante ? '🦷' : ''}</span>;
        case 'furcacion':
          return <span className="perio-value-center">{data.furcacion || '0'}</span>;
        case 'sangrado': {
          const m = getSiteBoolean(num, 'mesial', 'sangrado');
          const c = getSiteBoolean(num, 'central', 'sangrado');
          const d = getSiteBoolean(num, 'distal', 'sangrado');
          return (
            <span className="perio-bop-indicator" style={{ fontSize: '14px', letterSpacing: '2px' }}>
              {m ? '●' : '○'}{c ? '●' : '○'}{d ? '●' : '○'}
            </span>
          );
        }
        case 'placa': {
          const m = getSiteBoolean(num, 'mesial', 'placa');
          const c = getSiteBoolean(num, 'central', 'placa');
          const d = getSiteBoolean(num, 'distal', 'placa');
          return (
            <span className="perio-placa-indicator" style={{ fontSize: '14px', letterSpacing: '2px' }}>
              {m ? '●' : '○'}{c ? '●' : '○'}{d ? '●' : '○'}
            </span>
          );
        }
        case 'mg': {
          const mgMesial = getSiteValue(num, 'mesial', 'mg');
          const mgCentral = getSiteValue(num, 'central', 'mg');
          const mgDistal = getSiteValue(num, 'distal', 'mg');
          return (
            <span className="perio-values" style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
              <span>{mgMesial}</span>
              <span>{mgCentral}</span>
              <span>{mgDistal}</span>
            </span>
          );
        }
        case 'ps': {
          const psMesial = getSiteValue(num, 'mesial', 'ps');
          const psCentral = getSiteValue(num, 'central', 'ps');
          const psDistal = getSiteValue(num, 'distal', 'ps');
          return (
            <span className="perio-values" style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
              <span>{psMesial}</span>
              <span>{psCentral}</span>
              <span>{psDistal}</span>
            </span>
          );
        }
        case 'nic': {
          const mgMesial = getSiteValue(num, 'mesial', 'mg');
          const psMesial = getSiteValue(num, 'mesial', 'ps');
          const mgCentral = getSiteValue(num, 'central', 'mg');
          const psCentral = getSiteValue(num, 'central', 'ps');
          const mgDistal = getSiteValue(num, 'distal', 'mg');
          const psDistal = getSiteValue(num, 'distal', 'ps');
          const nicMesial = mgMesial + psMesial;
          const nicCentral = mgCentral + psCentral;
          const nicDistal = mgDistal + psDistal;
          return (
            <span className="perio-values perio-nic" style={{ display: 'flex', justifyContent: 'center', gap: '4px', fontWeight: 700, color: '#6366f1' }}>
              <span>{nicMesial}</span>
              <span>{nicCentral}</span>
              <span>{nicDistal}</span>
            </span>
          );
        }
        default:
          return '';
      }
    };

    // 🔥 Estilo condicional: resaltar si el diente tiene datos
    const cellStyle = {
      width: COLUMN_WIDTHS.tooth[num] || '50px',
      minWidth: COLUMN_WIDTHS.tooth[num] || '50px',
      maxWidth: COLUMN_WIDTHS.tooth[num] || '50px',
      background: hasData ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
      borderColor: hasData ? '#10b981' : '#e2e8f0',
      textAlign: 'center',
      fontSize: '12px',
      padding: '2px 0',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    };

    return (
      <td
        key={num}
        className="perio-cell clickable"
        onClick={() => onToothClick(num)}
        title={`Diente #${num}${hasData ? ' (con datos)' : ''}`}
        style={cellStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = hasData ? 'rgba(16, 185, 129, 0.15)' : '#f1f5f9';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = hasData ? 'rgba(16, 185, 129, 0.08)' : 'transparent';
        }}
      >
        {renderValue()}
      </td>
    );
  };

  const renderRow = (label, rowKey, teeth) => (
    <tr>
      <td className="perio-row-label" style={{ 
        width: COLUMN_WIDTHS.label, 
        minWidth: COLUMN_WIDTHS.label,
        maxWidth: COLUMN_WIDTHS.label,
        fontSize: '11px',
        fontWeight: 600,
        color: '#64748b',
        textAlign: 'center',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        padding: '4px 6px'
      }}>
        {label}
      </td>
      {teeth.map(num => renderToothCell(num, rowKey))}
    </tr>
  );

  // Renderizar sección (superior o inferior)
  const renderSection = (teeth, title, imageSrc) => (
    <>
      <tr className="perio-section-header">
        <td colSpan={teeth.length + 1} style={{ padding: '4px 8px', textAlign: 'center', background: '#1a1f2a' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span style={{ 
              fontSize: '9px', 
              fontWeight: 700, 
              textTransform: 'uppercase', 
              letterSpacing: '0.08em',
              color: 'rgba(255,255,255,0.3)'
            }}>
              {title}
            </span>
            {/* 🔥 Imagen del periodontograma centrada */}
            <img 
              src={imageSrc} 
              alt={title} 
              style={{ 
                width: '100%', 
                maxWidth: '800px',
                display: 'block', 
                margin: '0 auto',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(0,0,0,0.1)'
              }} 
            />
          </div>
        </td>
      </tr>
      
      {/* Fila de números de dientes */}
      <tr className="perio-tooth-numbers">
        <td className="perio-row-label" style={{ 
          width: COLUMN_WIDTHS.label, 
          minWidth: COLUMN_WIDTHS.label,
          maxWidth: COLUMN_WIDTHS.label,
          fontSize: '11px',
          fontWeight: 700,
          color: '#0f172a',
          textAlign: 'center',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          padding: '4px 6px'
        }}>
          Diente
        </td>
        {teeth.map(num => {
          const hasData = hasToothData(num);
          return (
            <td 
              key={num} 
              className="perio-tooth-number"
              style={{ 
                width: COLUMN_WIDTHS.tooth[num] || '50px',
                minWidth: COLUMN_WIDTHS.tooth[num] || '50px',
                maxWidth: COLUMN_WIDTHS.tooth[num] || '50px',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: 700,
                color: hasData ? '#10b981' : '#0f172a',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '2px 0',
                position: 'relative'
              }}
            >
              {num}
              {/* 🔥 Indicador verde si el diente tiene datos */}
              {hasData && (
                <span style={{ 
                  position: 'absolute', 
                  top: '-2px', 
                  right: '-2px', 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: '#10b981',
                  border: '1px solid #fff',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                }} />
              )}
            </td>
          );
        })}
      </tr>
      
      {renderRow('Movilidad', 'movilidad', teeth)}
      {renderRow('Implante', 'implante', teeth)}
      {renderRow('Furcación', 'furcacion', teeth)}
      {renderRow('Sangrado', 'sangrado', teeth)}
      {renderRow('Placa', 'placa', teeth)}
      {renderRow('Margen Gingival', 'mg', teeth)}
      {renderRow('Prof. Sondaje', 'ps', teeth)}
      {renderRow('Nivel Inserción', 'nic', teeth)}
    </>
  );

  const tableWidth = calculateTotalWidth();

  return (
    <div className="perio-table-wrapper" style={{ overflowX: 'auto', padding: '0' }}>
      <table 
        className="perio-table"
        style={{ 
          width: tableWidth + 'px',
          minWidth: tableWidth + 'px',
          maxWidth: tableWidth + 'px',
          borderCollapse: 'collapse',
          fontSize: '13px',
          background: '#ffffff',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}
      >
        <thead>
          <tr>
            <th colSpan="17" className="perio-table-title" style={{
              padding: '8px 16px',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'rgba(255,255,255,0.5)',
              background: '#1a1f2a',
              textAlign: 'center'
            }}>
              {activeCara === 'V' ? 'VESTIBULAR' : 'LINGUAL / PALATINO'}
            </th>
          </tr>
        </thead>
        <tbody>
          {renderSection(ALL_TEETH.superior, 'SUPERIOR', SUPERIOR_IMG)}
          {renderSection(ALL_TEETH.inferior, 'INFERIOR', INFERIOR_IMG)}
        </tbody>
      </table>
    </div>
  );
}