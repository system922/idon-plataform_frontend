import React from 'react';

const SUPERIOR_IMG = '/Odontologia/periodontograma_s.svg';
const INFERIOR_IMG = '/Odontologia/periodontograma_i.svg';

const ALL_TEETH = {
  superior: [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
  inferior: [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38],
};

const ALL_ROWS = ['movilidad', 'implante', 'furcacion', 'sangrado', 'placa', 'mg', 'ps', 'nic'];

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
// Subcomponente: Tabla de datos + gráfico
// ============================================================
const DataTable = ({ teeth, rows, teethData, activeCara, onToothClick, imageSrc, imagePosition, archType }) => {
  const getToothData = (num) => teethData[num] || {
    movilidad: 0,
    implante: false,
    furcacion: 0,
    ausente: false,
    sitios: {},
  };

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
    const val = data.sitios?.[activeCara]?.[pos]?.[field];
    return Number(val) || 0;
  };

  const getSiteBoolean = (tooth, pos, field) => {
    const data = getToothData(tooth);
    return data.sitios?.[activeCara]?.[pos]?.[field] ?? false;
  };

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

          // 🔥 AUSENTE: ahora también tiene onClick para poder corregir
          if (isAusente) {
            return (
              <td
                key={num}
                style={{ ...cellStyle, background: '#fef2f2', color: '#ef4444', fontWeight: 700 }}
                onClick={() => onToothClick(num)}
                title={`Diente #${num} (ausente) - Haz clic para editar`}
              >
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

  const totalWidth = teeth.reduce((sum, num) => sum + COLUMN_WIDTHS.tooth[num], 0) + COLUMN_WIDTHS.label;
  const graphWidth = totalWidth - COLUMN_WIDTHS.label;

  const toothNumberRow = (
    <tr key="tooth-numbers">
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

  // ========== CONFIGURACIÓN ESPECÍFICA POR ARCADA ==========
  const GRAPH_HEIGHT = 140;

  const CONFIG = {
    superior: {
      BASE_LINE: 90,
      SCALE: 4,
      GRID_TOP: 0,
      GRID_LINES: 16,
      GRID_SPACING: 6,
    },
    inferior: {
      BASE_LINE: 55,
      SCALE: 4,
      GRID_TOP: 55,
      GRID_LINES: 16,
      GRID_SPACING: 6,
    },
  };

  const { BASE_LINE, SCALE, GRID_TOP, GRID_LINES, GRID_SPACING } = CONFIG[archType];

  // ========== CONSTRUCCIÓN DE PUNTOS ==========
  const buildGraphPoints = (type) => {
    const points = [];
    let currentX = 0;

    teeth.forEach((tooth) => {
      const width = COLUMN_WIDTHS.tooth[tooth];
      const xMesial = currentX + width * 0.15;
      const xCentral = currentX + width * 0.50;
      const xDistal = currentX + width * 0.85;

      const sites = ['mesial', 'central', 'distal'];
      const xs = [xMesial, xCentral, xDistal];

      sites.forEach((site, idx) => {
        const x = xs[idx];
        const mg = getSiteValue(tooth, site, 'mg');
        const ps = getSiteValue(tooth, site, 'ps');

        let y;

        if (archType === 'superior') {
          if (type === 'mg') {
            y = BASE_LINE - mg * SCALE;
          } else {
            y = BASE_LINE - (mg + ps) * SCALE;
          }
        } else {
          // Inferior: las curvas crecen hacia abajo
          if (type === 'mg') {
            y = BASE_LINE + mg * SCALE;
          } else {
            y = BASE_LINE + (mg + ps) * SCALE;
          }
        }

        if (y < 0) y = 0;
        if (y > GRAPH_HEIGHT) y = GRAPH_HEIGHT;

        points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
      });

      currentX += width;
    });

    if (points.length === 0) {
      return `0,${BASE_LINE} ${graphWidth},${BASE_LINE}`;
    }
    return points.join(' ');
  };

  // ========== FILA CON GRÁFICO ==========
  const imageRow = (
    <tr key="image-row">
      <td
        style={{
          width: COLUMN_WIDTHS.label + 'px',
          minWidth: COLUMN_WIDTHS.label + 'px',
          maxWidth: COLUMN_WIDTHS.label + 'px',
          background: '#fafafa',
          border: '1px solid #e2e8f0',
        }}
      />
      <td
        colSpan={teeth.length}
        style={{
          padding: 0,
          border: '1px solid #e2e8f0',
          background: '#fff',
          height: GRAPH_HEIGHT + 'px',
        }}
      >
        <svg
          width="100%"
          height={GRAPH_HEIGHT}
          viewBox={`0 0 ${graphWidth} ${GRAPH_HEIGHT}`}
          style={{
            display: 'block',
            background: '#ffffff',
          }}
        >
          {/* 1. IMAGEN DE LOS DIENTES (fondo) */}
          <image
            href={imageSrc}
            x="0"
            y="0"
            width={graphWidth}
            height={GRAPH_HEIGHT}
            preserveAspectRatio="xMidYMid meet"
          />

          {/* 2. REJILLA CONFIGURADA SEGÚN ARCADA */}
          {Array.from({ length: GRID_LINES }).map((_, i) => (
            <line
              key={`grid-${i}`}
              x1="0"
              y1={GRID_TOP + i * GRID_SPACING}
              x2={graphWidth}
              y2={GRID_TOP + i * GRID_SPACING}
              stroke="#bfbfbf"
              strokeWidth="1"
            />
          ))}

          {/* 3. CURVAS */}
          <polyline
            points={buildGraphPoints('mg')}
            fill="none"
            stroke="red"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <polyline
            points={buildGraphPoints('ps')}
            fill="none"
            stroke="blue"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </td>
    </tr>
  );

  let rowsToRender = [];
  if (imagePosition === 'top') {
    rowsToRender.push(imageRow);
    rowsToRender.push(toothNumberRow);
    rows.forEach(rowKey => rowsToRender.push(renderRow(rowKey, rowLabels[rowKey])));
  } else {
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
// Componente principal
// ============================================================
export default function PerioTable({ teethData, activeCara, onToothClick }) {
  return (
    <div className="perio-table-wrapper" style={{ padding: '0', overflowX: 'auto' }}>
      <div className="perio-arch-section" style={{ marginBottom: '30px' }}>
        <DataTable
          teeth={ALL_TEETH.superior}
          rows={ALL_ROWS}
          teethData={teethData}
          activeCara={activeCara}
          onToothClick={onToothClick}
          imageSrc={SUPERIOR_IMG}
          imagePosition="bottom"
          archType="superior"
        />
      </div>
      <div className="perio-arch-section">
        <DataTable
          teeth={ALL_TEETH.inferior}
          rows={ALL_ROWS}
          teethData={teethData}
          activeCara={activeCara}
          onToothClick={onToothClick}
          imageSrc={INFERIOR_IMG}
          imagePosition="top"
          archType="inferior"
        />
      </div>
    </div>
  );
}