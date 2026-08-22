import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from '../../context/SessionContext'; // ✅ AGREGADO
import ExcelJS from 'exceljs';
import PageTemplate from '../../components/PageTemplate';
import ReportPdfButton from '../../components/ReportPdfButton';
import Table from '../../components/General/Table';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import {
  Download, TrendingUp, TrendingDown, DollarSign,
  AlertCircle, Check
} from 'react-feather';
import {
  FiRefreshCw,
} from "react-icons/fi";
import { fetchWithAuth } from '../../config/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
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
export default function AccountingBalance() {
  const { user } = useSession(); // ✅ AGREGADO
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [groupBy, setGroupBy] = useState('month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // ─── Cargar balance ───────────────────────────────────────────────────────
  const loadBalance = useCallback(async () => {
    if (!dateRange.from || !dateRange.to) return;
    setLoading(true);
    setError('');
    try {
      // ✅ SIN /api
      const res = await fetchWithAuth(
        `/accounting/balance?from=${dateRange.from}&to=${dateRange.to}&groupBy=${groupBy}`
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error HTTP: ${res.status}`);
      }
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err.message || 'Error al cargar balance');
    } finally {
      setLoading(false);
    }
  }, [dateRange, groupBy]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  // ─── Refrescar ────────────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBalance();
    setRefreshing(false);
  }, [loadBalance]);

  // ─── Calcular totales ─────────────────────────────────────────────────────
  const totals = useMemo(() => {
    if (!data) return { totalVentas: 0, totalGastos: 0, neto: 0, margen: 0 };
    const totalVentas = data.sales?.reduce((sum, s) => sum + (Number(s.amount) || 0), 0) || 0;
    const totalGastos = data.expenses?.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) || 0;
    const neto = totalVentas - totalGastos;
    const margen = totalVentas > 0 ? (neto / totalVentas) * 100 : 0;
    return { totalVentas, totalGastos, neto, margen };
  }, [data]);

  // ─── Datos para gráficos ──────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (!data?.sales) return [];
    return data.sales.map(s => {
      const saleDate = normalizeDate(s.period);
      const gasto = data.expenses?.find(e => normalizeDate(e.period) === saleDate)?.amount || 0;
      return {
        period: formatDate(saleDate),
        periodKey: saleDate,
        Ventas: Number(s.amount) || 0,
        Gastos: Number(gasto) || 0
      };
    });
  }, [data]);

  // ─── Datos para tabla ─────────────────────────────────────────────────────
  const tableData = useMemo(() => {
    if (!data?.sales) return [];
    return data.sales.map(s => {
      const saleDate = normalizeDate(s.period);
      const gasto = data.expenses?.find(e => normalizeDate(e.period) === saleDate)?.amount || 0;
      const venta = Number(s.amount) || 0;
      const resultado = venta - Number(gasto);
      return {
        id: saleDate,
        period: saleDate,
        periodFormatted: groupBy === 'month'
          ? new Date(saleDate).toLocaleDateString('es-EC', { month: 'long', year: 'numeric' })
          : formatDate(saleDate),
        ventas: venta,
        gastos: Number(gasto),
        resultado: resultado,
        margenPorcentaje: venta > 0 ? +((resultado / venta) * 100).toFixed(1) : 0
      };
    });
  }, [data, groupBy]);

  // ─── Datos filtrados ──────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    if (!searchTerm) return tableData;
    const term = searchTerm.toLowerCase();
    return tableData.filter(row =>
      row.periodFormatted.toLowerCase().includes(term) ||
      row.ventas.toString().includes(term) ||
      row.gastos.toString().includes(term) ||
      row.resultado.toString().includes(term)
    );
  }, [tableData, searchTerm]);

  // ─── Configuración para PDF ──────────────────────────────────────────────
  const pdfConfig = useMemo(() => {
    if (!data) return null;
    const { totalVentas, totalGastos, neto, margen } = totals;
    return {
      title: 'Balance General - Estado de Resultados',
      subtitle: `Período: ${formatDate(dateRange.from)} al ${formatDate(dateRange.to)}`,
      kpis: [
        { label: 'Ventas Totales', value: totalVentas, formatter: (v) => `$${Number(v).toFixed(2)}` },
        { label: 'Gastos Operativos', value: totalGastos, formatter: (v) => `$${Number(v).toFixed(2)}` },
        { label: 'Resultado Neto', value: neto, formatter: (v) => `$${Number(v).toFixed(2)}`, bold: true },
        { label: 'Margen de Ganancia', value: margen, formatter: (v) => `${v.toFixed(1)}%`, bold: true }
      ],
      sections: tableData.length ? [{
        title: 'DETALLE POR PERÍODO',
        columns: [
          { label: 'Período', key: 'periodFormatted', width: 28 },
          { label: 'Ventas ($)', key: 'ventas', width: 16, formatter: (v) => `$${Number(v).toFixed(2)}` },
          { label: 'Gastos ($)', key: 'gastos', width: 16, formatter: (v) => `$${Number(v).toFixed(2)}` },
          { label: 'Resultado ($)', key: 'resultado', width: 16, formatter: (v) => `$${Number(v).toFixed(2)}` }
        ],
        rows: tableData
      }] : []
    };
  }, [data, tableData, totals, dateRange]);

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
        white: 'FFFFFF',
        black: '000000',
        positive: '166534',
        negative: '991B1B',
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

      const { totalVentas, totalGastos, neto, margen } = totals;

      const wb = new ExcelJS.Workbook();
      wb.creator = 'IDON Gestion';
      wb.created = new Date();

      const ws = wb.addWorksheet('BALANCE GENERAL', {
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
      styleHeader(ws.getCell('A1'), 'BALANCE GENERAL - ESTADO DE RESULTADOS');
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

      ws.getRow(3).height = 6;

      // Resumen ejecutivo
      ws.mergeCells('A4:E4');
      styleSection(ws.getCell('A4'), '  RESUMEN EJECUTIVO');
      ws.getRow(4).height = 18;

      const kpiRows = [
        ['Ventas Totales', totalVentas, '#currency'],
        ['Gastos Operativos', totalGastos, '#currency'],
        ['Resultado Neto', neto, '#currency'],
        ['Margen de Ganancia', margen, '#pct'],
      ];

      kpiRows.forEach(([label, value, type], i) => {
        const rowNum = 5 + i;
        ws.getRow(rowNum).height = 16;
        const cA = ws.getCell(`A${rowNum}`);
        const cB = ws.getCell(`B${rowNum}`);
        ws.mergeCells(`B${rowNum}:E${rowNum}`);

        const alt = i % 2 === 1;
        styleData(cA, label, 'left', alt);
        styleData(cB, value, 'right', alt, type === '#currency' ? '"$"#,##0.00' : '0.0"%"');

        if (label === 'Resultado Neto') {
          cB.font = { ...cB.font, bold: true, color: { argb: value >= 0 ? COLORS.positive : COLORS.negative } };
        }
      });

      const spRow1 = 5 + kpiRows.length;
      ws.getRow(spRow1).height = 6;

      // Detalle por período
      let r = spRow1 + 1;
      ws.mergeCells(`A${r}:E${r}`);
      styleSection(ws.getCell(`A${r}`), '  DETALLE POR PERÍODO');
      ws.getRow(r).height = 18;
      r++;

      ['Período', 'Ventas ($)', 'Gastos ($)', 'Resultado ($)', 'Margen (%)'].forEach((h, i) => {
        styleColHeader(ws.getCell(r, i + 1), h);
      });
      ws.getRow(r).height = 16;
      r++;

      tableData.forEach((row, idx) => {
        const alt = idx % 2 === 1;
        ws.getRow(r).height = 15;
        styleData(ws.getCell(r, 1), row.periodFormatted, 'left', alt);
        styleData(ws.getCell(r, 2), row.ventas, 'right', alt, '"$"#,##0.00');
        styleData(ws.getCell(r, 3), row.gastos, 'right', alt, '"$"#,##0.00');
        styleData(ws.getCell(r, 4), row.resultado, 'right', alt, '"$"#,##0.00');
        const cPct = ws.getCell(r, 5);
        styleData(cPct, row.margenPorcentaje, 'right', alt, '0.0"%"');
        cPct.font = { ...cPct.font, color: { argb: row.resultado >= 0 ? COLORS.positive : COLORS.negative } };
        r++;
      });

      // Totales
      ws.getRow(r).height = 18;
      styleTotals(ws.getCell(r, 1), 'TOTALES', 'left');
      styleTotals(ws.getCell(r, 2), totalVentas, 'right', '"$"#,##0.00');
      styleTotals(ws.getCell(r, 3), totalGastos, 'right', '"$"#,##0.00');
      styleTotals(ws.getCell(r, 4), neto, 'right', '"$"#,##0.00');
      styleTotals(ws.getCell(r, 5), margen, 'right', '0.0"%"');

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `balance_${dateRange.from}_${dateRange.to}.xlsx`;
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
      accessor: 'periodFormatted',
      label: 'Período',
      render: (item) => <span>{item.periodFormatted}</span>
    },
    {
      accessor: 'ventas',
      label: 'Ventas ($)',
      align: 'right',
      render: (item) => <span >${item.ventas.toFixed(2)}</span>
    },
    {
      accessor: 'gastos',
      label: 'Gastos ($)',
      align: 'right',
      render: (item) => <span>${item.gastos.toFixed(2)}</span>
    },
    {
      accessor: 'resultado',
      label: 'Resultado ($)',
      align: 'right',
      render: (item) => (
        <span>
          ${item.resultado.toFixed(2)}
        </span>
      )
    },
    {
      accessor: 'margenPorcentaje',
      label: 'Margen (%)',
      align: 'right',
      render: (item) => (
        <span>
          {item.margenPorcentaje}%
        </span>
      )
    }
  ], []);

  // ─── Toolbar personalizado ─────────────────────────────────────────────────
  const toolbar = useMemo(() => (
    <div className="users-toolbar">
      <ButtonGroup>
        <IconTextButton
          variant="success"
          size="md"
          icon={<Download size={13} />}
          onClick={handleExportXLSX}
          disabled={loadingData || !data}
          loading={loadingData}
        >
          Exportar Excel
        </IconTextButton>
        <ReportPdfButton
          customConfig={pdfConfig}
          dateRange={dateRange}
          groupBy={groupBy}
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

  // ─── Footer de la tabla (totales) ──────────────────────────────────────────
  const tableFooter = useMemo(() => {
    if (filteredData.length === 0) return null;
    const { totalVentas, totalGastos, neto, margen } = totals;
    return (
      <tr className="table-footer-totals">
        <td><strong>TOTALES</strong></td>
        <td className="text-right">
          <strong style={{ color: 'var(--text-primary)' }}>${totalVentas.toFixed(2)}</strong>
        </td>
        <td className="text-right">
          <strong style={{ color: 'var(--text-primary)' }}>${totalGastos.toFixed(2)}</strong>
        </td>
        <td className={`text-right ${neto >= 0 ? 'text-success' : 'text-primary'}`}>
          <strong>${neto.toFixed(2)}</strong>
        </td>
        <td className={`text-right ${neto >= 0 ? 'text-success' : 'text-primary'}`}>
          <strong>{margen.toFixed(1)}%</strong>
        </td>
      </tr>
    );
  }, [filteredData, totals]);

  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <PageTemplate
      title="BALANCE GENERAL"
      subtitle="Estado de Resultados - Pérdidas y Ganancias"
      theme="business"
      loading={loading}
      headerAction={refreshButton}
    >
      <div className="accounting-balance-container custom-dashboard">
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
            </select>
          </div>
        </div>

        {/* KPIs */}
        {data && (
          <div className="stat-cards-row">
            <div className="stat-card" style={{ borderLeft: '4px solid var(--primary)' }}>
              <div className="stat-card-icon" style={{ background: 'var(--bg-primary)' }}>
                <TrendingUp size={24} color="var(--text-primary)" />
              </div>
              <div>
                <div className="stat-card-label">Ventas Totales</div>
                <div className="stat-card-value" style={{ color: 'var(--text-primary)' }}>
                  ${totals.totalVentas.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="stat-card" style={{ borderLeft: '4px solid var(--primary)' }}>
              <div className="stat-card-icon" style={{ background: 'var(--bg-primary)' }}>
                <TrendingDown size={24} color="var(--text-primary)" />
              </div>
              <div>
                <div className="stat-card-label">Gastos Operativos</div>
                <div className="stat-card-value" style={{ color: 'var(--text-primary)' }}>
                  ${totals.totalGastos.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="stat-card" style={{ borderLeft: `4px solid ${totals.neto >= 0 ? 'var(--primary)' : 'var(--danger)'}` }}>
              <div className="stat-card-icon" style={{ background: totals.neto >= 0 ? 'var(--bg-primary)' : 'var(--danger-bg)' }}>
                <DollarSign size={24} color={totals.neto >= 0 ? 'var(--text-primary)' : 'var(--text-primary)'} />
              </div>
              <div>
                <div className="stat-card-label">Resultado Neto</div>
                <div className="stat-card-value" style={{ color: totals.neto >= 0 ? 'var(--text-primary)' : 'var(--danger)' }}>
                  ${totals.neto.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="stat-card" style={{ borderLeft: `4px solid ${totals.neto >= 0 ? 'var(--primary)' : 'var(--danger)'}` }}>
              <div className="stat-card-icon" style={{ background: totals.neto >= 0 ? 'var(--bg-primary)' : 'var(--danger-bg)' }}>
                <TrendingUp size={24} color={totals.neto >= 0 ? 'var(--text-primary)' : 'var(--text-primary)'} />
              </div>
              <div>
                <div className="stat-card-label">Margen de Ganancia</div>
                <div className="stat-card-value" style={{ color: totals.neto >= 0 ? 'var(--text-primary)' : 'var(--text-primary)' }}>
                  {totals.margen.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="dashboard-loading">
            <div className="spinner"></div>
            <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>
              Cargando balance...
            </p>
          </div>
        )}

        {!loading && data && (
          <>
            {/* Gráfico de área */}
            {chartData.length > 0 && (
              <div className="dashboard-graph-card">
                <h3 className="dashboard-graph-title">Evolución de Ventas vs Gastos</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--success)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="var(--success)" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--danger)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="var(--danger)" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="period" stroke="var(--text-muted)" />
                    <YAxis stroke="var(--text-muted)" tickFormatter={v => `$${v}`} />
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
                    <Area
                      type="monotone"
                      dataKey="Ventas"
                      stroke="var(--success)"
                      fill="url(#salesGrad)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="Gastos"
                      stroke="var(--danger)"
                      fill="url(#expenseGrad)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Tabla */}
            <Table
              data={filteredData}
              columns={columns}
              keyField="id"
              title="Detalle por Período"
              subtitle={`${filteredData.length} ${filteredData.length === 1 ? 'registro' : 'registros'} encontrados`}
              toolbar={toolbar}
              searchable={true}
              searchPlaceholder='Buscar por período o monto...'
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
              footer={tableFooter}
            /> 
          </>
        )}
      </div>
    </PageTemplate>
  );
}