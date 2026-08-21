import React from 'react';

// Rutas a los SVG (ajusta si es necesario)
const SUPERIOR_IMG = '/Odontologia/periodontograma_s.svg';
const INFERIOR_IMG = '/Odontologia/periodontograma_i.svg';

const ALL_TEETH = {
  superior: [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
  inferior: [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38],
};

// Todas las filas que se muestran en las tablas
const ALL_ROWS = ['movilidad', 'implante', 'furcacion', 'sangrado', 'placa', 'mg', 'ps', 'nic'];

// Anchos de columna 
const COLUMN_WIDTHS = {
  label: 120,  
  tooth: {
    18: 65, 17: 65, 16: 75, 15: 50, 14: 55, 13: 50, 12: 45, 11: 50,
    21: 50, 22: 50, 23: 55, 24: 50, 25: 50, 26: 70, 27: 65, 28: 65,
    48: 65, 47: 70, 46: 75, 45: 50, 44: 55, 43: 50, 42: 45, 41: 45,
    31: 45, 32: 55, 33: 55, 34: 50, 35: 50, 36: 75, 37: 65, 38: 65,
  },
};

// ============================================================
// Subcomponente: Tabla de datos para una arcada
// ============================================================
const DataTable = ({ teeth, rows, teethData, activeCara, onToothClick, imageSrc, imagePosition }) => {
  // Obtener datos de un diente
  const getToothData = (num) => teethData[num] || {
    movilidad: 0,
    implante: false,
    furcacion: 0,
    ausente: false,
    sitios: {},
  };

  // Verificar si el diente tiene datos (para resaltar)
  const hasToothData = (num) => {
    const data = getToothData(num);
    if (data.ausente) return true;
    if (data.movilidad > 0) return true;
    if (data.furcacion > 0) return true;
    if (data.implante) return true;
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

  // Renderizar el valor de una celda según la fila
  const renderValue = (num, row) => {
    const data = getToothData(num);
    if (data.ausente) return '✕';

    switch (row) {
      case 'movilidad':
        return data.movilidad || '0';
      case 'implante':
        return data.implante ? '🦷' : '';
      case 'furcacion':
        return data.furcacion || '0';
      case 'sangrado': {
        const m = getSiteBoolean(num, 'mesial', 'sangrado');
        const c = getSiteBoolean(num, 'central', 'sangrado');
        const d = getSiteBoolean(num, 'distal', 'sangrado');
        return `${m ? '●' : '○'}${c ? '●' : '○'}${d ? '●' : '○'}`;
      }
      case 'placa': {
        const m = getSiteBoolean(num, 'mesial', 'placa');
        const c = getSiteBoolean(num, 'central', 'placa');
        const d = getSiteBoolean(num, 'distal', 'placa');
        return `${m ? '●' : '○'}${c ? '●' : '○'}${d ? '●' : '○'}`;
      }
      case 'mg': {
        const mgMesial = getSiteValue(num, 'mesial', 'mg');
        const mgCentral = getSiteValue(num, 'central', 'mg');
        const mgDistal = getSiteValue(num, 'distal', 'mg');
        return `${mgMesial} ${mgCentral} ${mgDistal}`;
      }
      case 'ps': {
        const psMesial = getSiteValue(num, 'mesial', 'ps');
        const psCentral = getSiteValue(num, 'central', 'ps');
        const psDistal = getSiteValue(num, 'distal', 'ps');
        return `${psMesial} ${psCentral} ${psDistal}`;
      }
      case 'nic': {
        const mgMesial = getSiteValue(num, 'mesial', 'mg');
        const psMesial = getSiteValue(num, 'mesial', 'ps');
        const mgCentral = getSiteValue(num, 'central', 'mg');
        const psCentral = getSiteValue(num, 'central', 'ps');
        const mgDistal = getSiteValue(num, 'distal', 'mg');
        const psDistal = getSiteValue(num, 'distal', 'ps');
        return `${mgMesial + psMesial} ${mgCentral + psCentral} ${mgDistal + psDistal}`;
      }
      default:
        return '';
    }
  };

  // Renderizar una fila de mediciones
  const renderRow = (rowKey, label) => {
    return (
      <tr key={rowKey}>
        <td className="perio-row-label" style={rowLabelStyle}>{label}</td>
        {teeth.map((num) => {
          const data = getToothData(num);
          const isAusente = data.ausente;
          const hasData = hasToothData(num);

          const cellStyle = {
            ...cellBaseStyle,
            width: COLUMN_WIDTHS.tooth[num] + 'px',
            minWidth: COLUMN_WIDTHS.tooth[num] + 'px',
            maxWidth: COLUMN_WIDTHS.tooth[num] + 'px',
            background: hasData ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
            borderColor: hasData ? '#10b981' : '#e2e8f0',
            cursor: 'pointer',
          };

          if (isAusente) {
            return (
              <td key={num} style={{ ...cellStyle, background: '#fef2f2', color: '#ef4444', fontWeight: 700 }}>
                ✕
              </td>
            );
          }

          return (
            <td
              key={num}
              style={cellStyle}
              onClick={() => onToothClick(num)}
              title={`Diente #${num}`}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = hasData ? 'rgba(16, 185, 129, 0.15)' : '#f1f5f9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = hasData ? 'rgba(16, 185, 129, 0.08)' : 'transparent';
              }}
            >
              <span style={{ fontSize: '12px' }}>{renderValue(num, rowKey)}</span>
            </td>
          );
        })}
      </tr>
    );
  };

  // Estilos para las celdas
  const rowLabelStyle = {
    width: COLUMN_WIDTHS.label + 'px',
    minWidth: COLUMN_WIDTHS.label + 'px',
    maxWidth: COLUMN_WIDTHS.label + 'px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#64748b',
    textAlign: 'center',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    padding: '4px 6px',
  };

  const cellBaseStyle = {
    textAlign: 'center',
    fontSize: '12px',
    padding: '2px 0',
    border: '1px solid #e2e8f0',
    transition: 'all 0.15s ease',
  };

  // Mapeo de nombres de filas a etiquetas
  const rowLabels = {
    movilidad: 'Movilidad',
    implante: 'Implante',
    furcacion: 'Furcación',
    sangrado: 'Sangrado',
    placa: 'Placa',
    mg: 'Mar. Gingival',
    ps: 'Prof. Sondaje',
    nic: 'Niv. Inserción',
  };

  // Calcular ancho total de la tabla
  const totalWidth = teeth.reduce((sum, num) => sum + COLUMN_WIDTHS.tooth[num], 0) + COLUMN_WIDTHS.label;

  // 🔥 Fila de números de dientes
  const toothNumberRow = (
    <tr>
      <td className="perio-row-label" style={rowLabelStyle}>Diente</td>
      {teeth.map((num) => {
        const hasData = hasToothData(num);
        return (
          <td
            key={num}
            style={{
              width: COLUMN_WIDTHS.tooth[num] + 'px',
              minWidth: COLUMN_WIDTHS.tooth[num] + 'px',
              maxWidth: COLUMN_WIDTHS.tooth[num] + 'px',
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: 700,
              color: hasData ? '#10b981' : '#0f172a',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '2px 0',
              position: 'relative',
            }}
          >
            {num}
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
                boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
              }} />
            )}
          </td>
        );
      })}
    </tr>
  );

  // 🔥 Fila con la imagen (empieza DESPUÉS de la columna label)
  const imageRow = (
    <tr>
      {/* Celda vacía para la columna label */}
      <td style={{
        width: COLUMN_WIDTHS.label + 'px',
        minWidth: COLUMN_WIDTHS.label + 'px',
        maxWidth: COLUMN_WIDTHS.label + 'px',
        background: '#fafafa',
        border: '1px solid #e2e8f0',
      }} />
      {/* Imagen que ocupa todas las columnas de dientes */}
      <td colSpan={teeth.length} style={{ padding: '4px 0', background: '#fafafa', border: '1px solid #e2e8f0' }}>
        <img
          src={imageSrc}
          alt="Dientes"
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            borderRadius: '4px',
          }}
        />
      </td>
    </tr>
  );

  // Construir la tabla según la posición de la imagen
  let rowsToRender = [];
  if (imagePosition === 'top') {
    // Imagen arriba: imagen, luego números, luego mediciones
    rowsToRender.push(imageRow);
    rowsToRender.push(toothNumberRow);
    rows.forEach(rowKey => rowsToRender.push(renderRow(rowKey, rowLabels[rowKey])));
  } else {
    // Imagen abajo: números, mediciones, luego imagen
    rowsToRender.push(toothNumberRow);
    rows.forEach(rowKey => rowsToRender.push(renderRow(rowKey, rowLabels[rowKey])));
    rowsToRender.push(imageRow);
  }

  return (
    <table
      className="perio-data-table"
      style={{
        width: totalWidth + 'px',
        minWidth: totalWidth + 'px',
        maxWidth: totalWidth + 'px',
        borderCollapse: 'collapse',
        fontSize: '13px',
        background: '#ffffff',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        margin: '0 auto',
      }}
    >
      <tbody>
        {rowsToRender}
      </tbody>
    </table>
  );
};

// ============================================================
// Componente principal PerioTable
// ============================================================
export default function PerioTable({ teethData, activeCara, onToothClick }) {
  return (
    <div className="perio-table-wrapper" style={{ padding: '0', overflowX: 'auto' }}>
      {/* ===== ARCADA SUPERIOR ===== */}
      <div className="perio-arch-section" style={{ marginBottom: '30px' }}>
        <DataTable
          teeth={ALL_TEETH.superior}
          rows={ALL_ROWS}
          teethData={teethData}
          activeCara={activeCara}
          onToothClick={onToothClick}
          imageSrc={SUPERIOR_IMG}
          imagePosition="bottom" // imagen abajo, mediciones arriba
        />
      </div>

      {/* ===== ARCADA INFERIOR ===== */}
      <div className="perio-arch-section">
        <DataTable
          teeth={ALL_TEETH.inferior}
          rows={ALL_ROWS}
          teethData={teethData}
          activeCara={activeCara}
          onToothClick={onToothClick}
          imageSrc={INFERIOR_IMG}
          imagePosition="top" // imagen arriba, mediciones abajo
        />
      </div>
    </div>
  );
}