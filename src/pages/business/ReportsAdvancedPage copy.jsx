import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSession } from '../../context/SessionContext';
import ExcelJS from 'exceljs';
import PageTemplate from '../../components/PageTemplate';
import ReportPdfButton from '../../components/ReportPdfButton';
import Table from '../../components/General/Table';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import SearchInput from '../../components/General/SearchInput';
import {
  Download, TrendingUp, TrendingDown, DollarSign,
  AlertCircle, Check
} from 'react-feather';
import {
  FiRefreshCw,
} from "react-icons/fi";
import { fetchWithAuth } from '../../config/api';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// ─── Helpers de fechas ────────────────────────────────────────────────────────
const formatDate = (isoDate) => {
  if (!isoDate) return '';
  if (typeof isoDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  }
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return String(isoDate);
  return date.toLocaleDateString('es-EC', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Guayaquil'
  });
};

const normalizeDate = (dateValue) => {
  if (!dateValue) return '';
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }
  if (typeof dateValue === 'string' && dateValue.includes('T')) {
    return dateValue.split('T')[0];
  }
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return String(dateValue);
  return date.toISOString().split('T')[0];
};

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ReportsAdvanced() {
  const { user } = useSession(); // ✅ AGREGADO
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [groupBy, setGroupBy] = useState('day');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const chartLineRef = useRef(null);
  const chartBarRef = useRef(null);

  // ─── Cargar reporte ───────────────────────────────────────────────────────
  const loadReport = useCallback(async () => {
    if (!dateRange.from || !dateRange.to) return;
    setLoading(true);
    setError('');
    try {
      // ✅ SIN /api
      const res = await fetchWithAuth(
        `/reports/advanced?from=${dateRange.from}&to=${dateRange.to}&groupBy=${groupBy}`
      );
      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || `HTTP ${res.status}: Error al cargar reporte`);
      }
      
      setData(result);
    } catch (err) {
      setError(err.message || 'Error desconocido al cargar reporte');
    } finally {
      setLoading(false);
    }
  }, [dateRange, groupBy]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // ─── Refrescar ────────────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReport();
    setRefreshing(false);
  }, [loadReport]);

  // ─── Calcular totales ─────────────────────────────────────────────────────
  const computeTotals = useCallback(() => {
    if (!data) return { totalVentas: 0, totalGastos: 0, neto: 0, margen: 0 };
    const totalVentas = data.sales?.reduce((sum, s) => sum + (Number(s.total_sales) || 0), 0) || 0;
    const totalGastos = data.expenses?.reduce((sum, e) => sum + (Number(e.total_expenses) || 0), 0) || 0;
    const neto = totalVentas - totalGastos;
    const margen = totalVentas > 0 ? (neto / totalVentas) * 100 : 0;
    return { totalVentas, totalGastos, neto, margen };
  }, [data]);

  // ─── Datos para gráficos ──────────────────────────────────────────────────
  const chartData = useMemo(() => {
    return data?.sales?.map(s => {
      const saleDate = normalizeDate(s.date);
      const gasto = data.expenses?.find(e => normalizeDate(e.date) === saleDate)?.total_expenses || 0;
      return {
        date: formatDate(saleDate),
        dateKey: saleDate,
        Ventas: Number(s.total_sales) || 0,
        Gastos: Number(gasto) || 0,
        Margen: (Number(s.total_sales) || 0) - (Number(gasto) || 0)
      };
    }) || [];
  }, [data]);

  // ─── Datos para tabla ─────────────────────────────────────────────────────
  const tableData = useMemo(() => {
    return data?.sales?.map(s => {
      const saleDate = normalizeDate(s.date);
      const gasto = data.expenses?.find(e => normalizeDate(e.date) === saleDate)?.total_expenses || 0;
      const venta = Number(s.total_sales) || 0;
      const margen = venta - Number(gasto);
      return {
        id: saleDate,
        date: saleDate,
        dateFormatted: formatDate(saleDate),
        ventas: venta,
        gastos: Number(gasto),
        margen: margen,
        margenPorcentaje: venta > 0 ? +((margen / venta) * 100).toFixed(1) : 0
      };
    }) || [];
  }, [data]);

  // ─── Datos filtrados ──────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    if (!searchTerm) return tableData;
    const term = searchTerm.toLowerCase();
    return tableData.filter(row => 
      row.dateFormatted.toLowerCase().includes(term) ||
      row.ventas.toString().includes(term) ||
      row.gastos.toString().includes(term) ||
      row.margen.toString().includes(term)
    );
  }, [tableData, searchTerm]);

  // ─── Totales ──────────────────────────────────────────────────────────────
  const totals = useMemo(() => computeTotals(), [computeTotals]);

  // ─── Configuración para PDF ──────────────────────────────────────────────
  const pdfConfig = useMemo(() => {
    if (!data) return null;
    const { totalVentas, totalGastos, neto, margen } = totals;
    return {
      title: 'Reporte Avanzado',
      kpis: [
        { label: 'Ventas Totales', value: totalVentas, formatter: (v) => `$${Number(v).toFixed(2)}` },
        { label: 'Gastos Totales', value: totalGastos, formatter: (v) => `$${Number(v).toFixed(2)}` },
        { label: 'Ganancia Neta', value: neto, formatter: (v) => `$${Number(v).toFixed(2)}`, bold: true },
        { label: 'Margen de Ganancia', value: margen, formatter: (v) => `${Number(v).toFixed(1)}%`, bold: true }
      ],
      sections: tableData.length ? [{
        title: 'DETALLE POR PERÍODO',
        columns: [
          { label: 'Fecha', key: 'dateFormatted', width: 28 },
          { label: 'Ventas ($)', key: 'ventas', width: 16, formatter: (v) => `$${Number(v).toFixed(2)}` },
          { label: 'Gastos ($)', key: 'gastos', width: 16, formatter: (v) => `$${Number(v).toFixed(2)}` },
          { label: 'Margen ($)', key: 'margen', width: 16, formatter: (v) => `$${Number(v).toFixed(2)}` }
        ],
        rows: tableData
      }] : [],
      chartRefs: [chartLineRef, chartBarRef]
    };
  }, [data, tableData, totals]);

  // ─── Exportación a Excel ──────────────────────────────────────────────────
  const handleExportXLSX = useCallback(async () => {
    if (loadingData || !data) return;
    setLoadingData(true);
    try {
      const GROUP_LABELS = { day: 'Día', month: 'Mes', category: 'Categoría' };
      const COLORS = {
        headerBg: '1E2840',
        sectionBg: '2563EB',
        colHeaderBg: 'DBEAFE',
        totalsBg: '1E40AF',
        rowAlt: 'F0F7FF',
        positive: '166534',
        negative: '991B1B',
        white: 'FFFFFF',
        black: '000000',
      };

      const border = {
        top: { style: 'thin', color: { argb: 'D1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
        left: { style: 'thin', color: { argb: 'D1D5DB' } },
        right: { style: 'thin', color: { argb: 'D1D5DB' } },
      };

      const applyStyle = (cell, style) => { cell.style = style; };
      
      const styleHeader = (cell, text) => {
        cell.value = text;
        applyStyle(cell, {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } },
          font: { bold: true, size: 14, color: { argb: COLORS.white }, name: 'Calibri' },
          alignment: { vertical: 'middle', horizontal: 'center' },
        });
      };
      
      const styleSection = (cell, text) => {
        cell.value = text;
        applyStyle(cell, {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.sectionBg } },
          font: { bold: true, size: 10, color: { argb: COLORS.white }, name: 'Calibri' },
          alignment: { vertical: 'middle', horizontal: 'left' },
          border,
        });
      };
      
      const styleColHeader = (cell, text) => {
        cell.value = text;
        applyStyle(cell, {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.colHeaderBg } },
          font: { bold: true, size: 9, color: { argb: '1E3A5F' }, name: 'Calibri' },
          alignment: { vertical: 'middle', horizontal: 'center' },
          border,
        });
      };
      
      const styleData = (cell, value, align = 'left', altRow = false, numFmt = null) => {
        cell.value = value;
        const style = {
          fill: altRow
            ? { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.rowAlt } }
            : { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.white } },
          font: { size: 9, name: 'Calibri', color: { argb: COLORS.black } },
          alignment: { vertical: 'middle', horizontal: align },
          border,
        };
        if (numFmt) style.numFmt = numFmt;
        applyStyle(cell, style);
      };
      
      const styleTotals = (cell, value, align = 'center', numFmt = null) => {
        cell.value = value;
        const style = {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.totalsBg } },
          font: { bold: true, size: 9, color: { argb: COLORS.white }, name: 'Calibri' },
          alignment: { vertical: 'middle', horizontal: align },
          border: {
            top: { style: 'medium', color: { argb: COLORS.white } },
            bottom: { style: 'medium', color: { argb: COLORS.white } },
            left: { style: 'thin', color: { argb: '3B82F6' } },
            right: { style: 'thin', color: { argb: '3B82F6' } },
          },
        };
        if (numFmt) style.numFmt = numFmt;
        applyStyle(cell, style);
      };

      const { totalVentas: totalV, totalGastos: totalG, neto: netProf, margen: margin } = totals;

      const wb = new ExcelJS.Workbook();
      wb.creator = 'IDON Gestion';
      wb.created = new Date();

      const ws = wb.addWorksheet('REPORTE AVANZADO', {
        views: [{ showGridLines: false }],
        pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
      });

      ws.columns = [
        { key: 'a', width: 28 },
        { key: 'b', width: 16 },
        { key: 'c', width: 16 },
        { key: 'd', width: 16 },
        { key: 'e', width: 14 },
      ];

      // Título
      ws.mergeCells('A1:E1');
      styleHeader(ws.getCell('A1'), 'REPORTE AVANZADO');
      ws.getRow(1).height = 28;

      // Período
      ws.getRow(2).height = 18;
      ws.mergeCells('A2:C2');
      const cellPeriod = ws.getCell('A2');
      cellPeriod.value = `Período: ${formatDate(dateRange.from)} al ${formatDate(dateRange.to)}`;
      applyStyle(cellPeriod, {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A5F' } },
        font: { size: 9, color: { argb: COLORS.white }, name: 'Calibri' },
        alignment: { vertical: 'middle', horizontal: 'left' },
      });

      ws.mergeCells('D2:E2');
      const cellGroup = ws.getCell('D2');
      cellGroup.value = `Agrupado por: ${GROUP_LABELS[groupBy] || groupBy}`;
      applyStyle(cellGroup, {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A5F' } },
        font: { size: 9, color: { argb: 'BFDBFE' }, name: 'Calibri' },
        alignment: { vertical: 'middle', horizontal: 'right' },
      });

      // Generado
      ws.mergeCells('A3:E3');
      const cellGen = ws.getCell('A3');
      cellGen.value = `Generado: ${new Date().toLocaleString('es-EC')}`;
      applyStyle(cellGen, {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '374151' } },
        font: { size: 8, color: { argb: '9CA3AF' }, name: 'Calibri', italic: true },
        alignment: { vertical: 'middle', horizontal: 'left' },
      });

      ws.getRow(4).height = 6;

      // Resumen ejecutivo
      ws.mergeCells('A5:E5');
      styleSection(ws.getCell('A5'), '  RESUMEN EJECUTIVO');
      ws.getRow(5).height = 18;

      const kpiRows = [
        ['Ventas Totales', totalV, '#currency'],
        ['Gastos Totales', totalG, '#currency'],
        ['Ganancia Neta', netProf, '#currency'],
        ['Margen de Ganancia', margin, '#pct'],
      ];

      kpiRows.forEach(([label, value, type], i) => {
        const rowNum = 6 + i;
        ws.getRow(rowNum).height = 16;
        const cA = ws.getCell(`A${rowNum}`);
        const cB = ws.getCell(`B${rowNum}`);
        ws.mergeCells(`B${rowNum}:E${rowNum}`);

        const alt = i % 2 === 1;
        styleData(cA, label, 'left', alt);
        styleData(cB, value, 'right', alt, type === '#currency' ? '"$"#,##0.00' : '0.0"%"');

        if (label === 'Ganancia Neta') {
          cB.font = { ...cB.font, bold: true, color: { argb: value >= 0 ? COLORS.positive : COLORS.negative } };
        }
      });

      const spRow1 = 6 + kpiRows.length;
      ws.getRow(spRow1).height = 6;

      // Detalle por período
      let r = spRow1 + 1;
      ws.mergeCells(`A${r}:E${r}`);
      styleSection(ws.getCell(`A${r}`), '  DETALLE POR PERÍODO');
      ws.getRow(r).height = 18;
      r++;

      ['Fecha', 'Ventas ($)', 'Gastos ($)', 'Margen ($)', 'Margen (%)'].forEach((h, i) => {
        styleColHeader(ws.getCell(r, i + 1), h);
      });
      ws.getRow(r).height = 16;
      r++;

      tableData.forEach((row, idx) => {
        const venta = row.ventas;
        const gasto = row.gastos;
        const margen = row.margen;
        const pct = row.margenPorcentaje;
        const alt = idx % 2 === 1;

        ws.getRow(r).height = 15;
        styleData(ws.getCell(r, 1), row.dateFormatted, 'left', alt);
        styleData(ws.getCell(r, 2), venta, 'right', alt, '"$"#,##0.00');
        styleData(ws.getCell(r, 3), gasto, 'right', alt, '"$"#,##0.00');
        styleData(ws.getCell(r, 4), margen, 'right', alt, '"$"#,##0.00');

        const cPct = ws.getCell(r, 5);
        styleData(cPct, pct, 'right', alt, '0.0"%"');
        cPct.font = { ...cPct.font, color: { argb: margen >= 0 ? COLORS.positive : COLORS.negative } };
        r++;
      });

      // Totales
      ws.getRow(r).height = 18;
      styleTotals(ws.getCell(r, 1), 'TOTALES', 'left');
      styleTotals(ws.getCell(r, 2), totalV, 'right', '"$"#,##0.00');
      styleTotals(ws.getCell(r, 3), totalG, 'right', '"$"#,##0.00');
      styleTotals(ws.getCell(r, 4), netProf, 'right', '"$"#,##0.00');
      styleTotals(ws.getCell(r, 5), margin, 'right', '0.0"%"');
      r += 2;

      // Gastos detallados
      if (data.expenses?.length > 0) {
        ws.mergeCells(`A${r}:E${r}`);
        styleSection(ws.getCell(`A${r}`), '  GASTOS DETALLADOS');
        ws.getRow(r).height = 18;
        r++;

        styleColHeader(ws.getCell(r, 1), 'Fecha');
        styleColHeader(ws.getCell(r, 2), 'Gastos ($)');
        [3, 4, 5].forEach(c => {
          applyStyle(ws.getCell(r, c), {
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.colHeaderBg } },
            border,
          });
        });
        ws.getRow(r).height = 16;
        r++;

        data.expenses.forEach((e, idx) => {
          const alt = idx % 2 === 1;
          ws.getRow(r).height = 15;
          styleData(ws.getCell(r, 1), formatDate(normalizeDate(e.date)), 'left', alt);
          styleData(ws.getCell(r, 2), Number(e.total_expenses ?? 0), 'right', alt, '"$"#,##0.00');
          [3, 4, 5].forEach(c => {
            applyStyle(ws.getCell(r, c), {
              fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: alt ? COLORS.rowAlt : COLORS.white } },
              border,
            });
          });
          r++;
        });
      }

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_${dateRange.from}_${dateRange.to}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      setSuccess('Exportado a Excel correctamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error al exportar a Excel: ' + err.message);
    } finally {
      setLoadingData(false);
    }
  }, [data, loadingData, dateRange, groupBy, tableData, totals]);

  // ─── Columnas de la tabla ──────────────────────────────────────────────────
  const columns = useMemo(() => [
    {
      accessor: 'dateFormatted',
      label: 'Fecha',
      render: (item) => <span>{item.dateFormatted}</span>
    },
    {
      accessor: 'ventas',
      label: 'Ventas ($)',
      align: 'right',
      render: (item) => <span style={{ fontWeight: 500 }}>${item.ventas.toFixed(2)}</span>
    },
    {
      accessor: 'gastos',
      label: 'Gastos ($)',
      align: 'right',
      render: (item) => <span style={{ fontWeight: 500 }}>${item.gastos.toFixed(2)}</span>
    },
    {
      accessor: 'margen',
      label: 'Margen ($)',
      align: 'right',
      render: (item) => (
        <span style={{ 
          fontWeight: 600,
          color: item.margen >= 0 ? 'var(--success)' : 'var(--danger)'
        }}>
          ${item.margen.toFixed(2)}
        </span>
      )
    },
    {
      accessor: 'margenPorcentaje',
      label: 'Margen (%)',
      align: 'right',
      render: (item) => (
        <span style={{ 
          fontWeight: 600,
          color: item.margen >= 0 ? 'var(--success)' : 'var(--danger)'
        }}>
          {item.margenPorcentaje}%
        </span>
      )
    }
  ], []);

  // ─── Toolbar personalizado ─────────────────────────────────────────────────
  const toolbar = useMemo(() => (
    <div className="users-toolbar">
      <SearchInput
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Buscar por fecha o monto..."
        size="md"
        variant="bordered"
        className="users-search-input"
        onClear={() => setSearchTerm('')}
        autoFocus={false}
      />
      <ButtonGroup>
        <IconTextButton
          variant="primary"
          size="md"
          icon={<Download size={13} />}
          onClick={handleExportXLSX}
          disabled={loadingData || !data}
          loading={loadingData}
        >
          XLSX
        </IconTextButton>
        <ReportPdfButton
          customConfig={pdfConfig}
          dateRange={dateRange}
          groupBy={groupBy}
          className="btn-secondary"
        />
      </ButtonGroup>
    </div>
  ), [searchTerm, handleExportXLSX, loadingData, data, pdfConfig, dateRange, groupBy]);

  // ─── Botón de refrescar ──────────────────────────────────────────────────
  const refreshButton = useMemo(() => (
    <button
      onClick={handleRefresh}
      className="dashboard-refresh-btn-header"
      disabled={refreshing}
      title="Actualizar datos"
    >
      <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  ), [handleRefresh, refreshing]);

  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <PageTemplate
      title="REPORTES AVANZADOS"
      subtitle="Análisis de ventas, gastos y rentabilidad"
      theme="business"
      loading={loading}
      headerAction={refreshButton}
    >
      <div className="reports-advanced-container custom-dashboard">
        {error && (
          <div className="alert-error">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {success && (
          <div className="alert-success">
            <Check size={16} /> {success}
          </div>
        )}

        {/* Filtros */}
        <div className="filters-bar">
          <div className="filter-group">
            <label>Desde</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={e => setDateRange({ ...dateRange, from: e.target.value })}
            />
          </div>
          <div className="filter-group">
            <label>Hasta</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={e => setDateRange({ ...dateRange, to: e.target.value })}
            />
          </div>
          <div className="filter-group">
            <label>Agrupar por</label>
            <select 
              value={groupBy} 
              onChange={e => setGroupBy(e.target.value)}
            >
              <option value="day">Día</option>
              <option value="month">Mes</option>
              <option value="category">Categoría</option>
            </select>
          </div>
        </div>

        {/* KPIs */}
        {data && (
          <div className="stat-cards-row">
            <div 
              className="stat-card" 
              style={{ borderLeft: '4px solid var(--primary)' }}
            >
              <div 
                className="stat-card-icon" 
                style={{ background: 'var(--bg-primary)' }}
              >
                <TrendingUp size={24} color="var(--text-primary)" />
              </div>
              <div>
                <div className="stat-card-label">Ventas Totales</div>
                <div className="stat-card-value">${totals.totalVentas.toFixed(2)}</div>
              </div>
            </div>

            <div 
              className="stat-card" 
              style={{ borderLeft: '4px solid var(--primary)' }}
            >
              <div 
                className="stat-card-icon" 
                style={{ background: 'var(--bg-primary)' }}
              >
                <TrendingDown size={24} color="var(--text-primary)" />
              </div>
              <div>
                <div className="stat-card-label">Gastos Totales</div>
                <div className="stat-card-value">${totals.totalGastos.toFixed(2)}</div>
              </div>
            </div>

            <div 
              className="stat-card" 
              style={{ borderLeft: '4px solid var(--primary)' 
              }}
            >
              <div 
                className="stat-card-icon" 
                style={{ background: 'var(--bg-primary)' }}
              >
                <DollarSign size={24} color="var(--text-primary)" />
                
              </div>
              <div>
                <div className="stat-card-label">Ganancia Neta</div>
                <div className="stat-card-value">${totals.neto.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="stat-card" 
              style={{ borderLeft: '4px solid var(--primary)' }}
            >
              <div 
                className="stat-card-icon" 
                style={{ background: 'var(--bg-primary)' }}
              >
                <TrendingUp size={24} color="var(--text-primary)" />
              </div>
              <div>
                <div className="stat-card-label">Margen de Ganancia</div>
                <div className="stat-card-value">{totals.margen.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="dashboard-loading">
            <div className="spinner"></div>
            <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>
              Cargando reporte...
            </p>
          </div>
        )}

        {!loading && data && (
          <>
            {/* Gráfico de líneas */}
            {groupBy !== 'category' && chartData.length > 0 && (
              <div className="dashboard-graph-card" ref={chartLineRef}>
                <h3 className="dashboard-graph-title">Ventas vs Gastos</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={chartData}>
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      stroke="var(--border-color)" 
                    />
                    <XAxis dataKey="date" stroke="var(--text-muted)" />
                    <YAxis 
                      stroke="var(--text-muted)" 
                      tickFormatter={v => `$${v}`} 
                    />
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: 'var(--bg-card)', 
                        borderColor: 'var(--border-color)', 
                        color: 'var(--text-primary)',
                        borderRadius: 'var(--radius-sm)'
                      }}
                      formatter={(value) => `$${Number(value).toFixed(2)}`}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="Ventas" 
                      stroke="var(--success)" 
                      strokeWidth={2} 
                      dot={{ r: 3 }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Gastos" 
                      stroke="var(--danger)" 
                      strokeWidth={2} 
                      dot={{ r: 3 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Gráfico de barras para categorías */}
            {groupBy === 'category' && data.sales && data.sales.length > 0 && (
              <div className="dashboard-graph-card" ref={chartBarRef}>
                <h3 className="dashboard-graph-title">Ventas por Categoría</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={data.sales}>
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      stroke="var(--border-color)" 
                    />
                    <XAxis dataKey="category" stroke="var(--text-muted)" />
                    <YAxis 
                      stroke="var(--text-muted)" 
                      tickFormatter={v => `$${v}`} 
                    />
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: 'var(--bg-card)', 
                        borderColor: 'var(--border-color)', 
                        color: 'var(--text-primary)',
                        borderRadius: 'var(--radius-sm)'
                      }}
                      formatter={(value) => `$${Number(value).toFixed(2)}`}
                    />
                    <Bar 
                      dataKey="total_sales" 
                      fill="var(--primary)" 
                      radius={[4, 4, 0, 0]} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Tabla */}
            <div className="roles-table-container">
              <Table
                data={filteredData}
                columns={columns}
                keyField="id"
                title="Detalle de Ventas Diarias"
                subtitle={`${filteredData.length} ${filteredData.length === 1 ? 'registro' : 'registros'} encontrados`}
                toolbar={toolbar}
                searchable={false}
                pagination={true}
                itemsPerPage={itemsPerPage}
                itemsPerPageOptions={[10, 15]}
                onItemsPerPageChange={(newPerPage) => setItemsPerPage(newPerPage)}
                loading={loading}
                emptyMessage={
                  searchTerm
                    ? 'No hay registros que coincidan con la búsqueda'
                    : 'No hay datos para el período seleccionado'
                }
                striped={true}
                hoverable={true}
                bordered={false}
                compact={false}
                footer={
                  filteredData.length > 0 ? (
                    <tr className="table-footer-totals">
                      <td><strong>TOTALES</strong></td>
                      <td className="text-right">
                        <strong>${totals.totalVentas.toFixed(2)}</strong>
                      </td>
                      <td className="text-right">
                        <strong>${totals.totalGastos.toFixed(2)}</strong>
                      </td>
                      <td className={`text-right ${totals.neto >= 0 ? 'text-success' : 'text-danger'}`}>
                        <strong>${totals.neto.toFixed(2)}</strong>
                      </td>
                      <td className={`text-right ${totals.margen >= 0 ? 'text-success' : 'text-danger'}`}>
                        <strong>{totals.margen.toFixed(1)}%</strong>
                      </td>
                    </tr>
                  ) : null
                }
              />
            </div>
          </>
        )}
      </div>
    </PageTemplate>
  );
}