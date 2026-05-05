import React, { useState, useEffect, useRef } from 'react';
import ExcelJS from 'exceljs';
import PageTemplate from '../../components/PageTemplate';
import ReportPdfButton from '../../components/ReportPdfButton';
import {
  Download, Calendar, TrendingUp, TrendingDown, DollarSign,
  PieChart, BarChart2, Loader, AlertCircle, Check
} from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart as RePieChart, 
  Pie, Cell
} from 'recharts';
import '../../styles/ReportsAdvanced.css';

export default function ReportsAdvanced() {
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [groupBy, setGroupBy] = useState('day');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const chartLineRef = useRef(null);
  const chartBarRef  = useRef(null);

  const loadReport = async () => {
    if (!dateRange.from || !dateRange.to) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth(`/api/reports/advanced?from=${dateRange.from}&to=${dateRange.to}&groupBy=${groupBy}`);
      if (!res.ok) throw new Error('Error al cargar reporte');
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [dateRange, groupBy]);

  const handleExportXLSX = async () => {
    if (!data) return;

    // ── Helpers de estilo ────────────────────────────────────────────────────
    const fmtDate = (val) => {
      if (!val) return '';
      const d = new Date(val);
      return isNaN(d) ? String(val) : d.toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' });
    };

    const GROUP_LABELS = { day: 'Dia', month: 'Mes', category: 'Categoria' };

    const COLORS = {
      headerBg:   '1E2840',   // azul oscuro encabezado
      sectionBg:  '2563EB',   // azul sección
      colHeaderBg:'DBEAFE',   // azul claro encabezados de columna
      totalsBg:   '1E40AF',   // azul oscuro totales
      rowAlt:     'F0F7FF',   // fila alternada
      positive:   '166534',   // verde texto positivo
      negative:   '991B1B',   // rojo texto negativo
      white:      'FFFFFF',
      black:      '000000',
      gray:       '6B7280',
    };

    const border = {
      top:    { style: 'thin', color: { argb: 'D1D5DB' } },
      bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
      left:   { style: 'thin', color: { argb: 'D1D5DB' } },
      right:  { style: 'thin', color: { argb: 'D1D5DB' } },
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
          top:    { style: 'medium', color: { argb: COLORS.white } },
          bottom: { style: 'medium', color: { argb: COLORS.white } },
          left:   { style: 'thin',   color: { argb: '3B82F6' } },
          right:  { style: 'thin',   color: { argb: '3B82F6' } },
        },
      };
      if (numFmt) style.numFmt = numFmt;
      applyStyle(cell, style);
    };

    // ── Calcular totales ─────────────────────────────────────────────────────
    const totals  = data.summary ?? data.totals ?? {};
    const totalV  = Number(totals.total_sales    ?? 0);
    const totalG  = Number(totals.total_expenses ?? 0);
    const netProf = Number(totals.net_profit     ?? (totalV - totalG));
    const margin  = totalV > 0 ? +((netProf / totalV) * 100).toFixed(1) : 0;

    // ── Workbook ─────────────────────────────────────────────────────────────
    const wb = new ExcelJS.Workbook();
    wb.creator = 'IDON Gestion';
    wb.created = new Date();

    const ws = wb.addWorksheet('REPORTE A', {
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

    // ── Fila 1: Título principal ─────────────────────────────────────────────
    ws.mergeCells('A1:E1');
    styleHeader(ws.getCell('A1'), 'REPORTE AVANZADO');
    ws.getRow(1).height = 28;

    // ── Fila 2: Periodo ──────────────────────────────────────────────────────
    ws.getRow(2).height = 18;
    ws.mergeCells('A2:C2');
    const cellPeriod = ws.getCell('A2');
    cellPeriod.value = `Periodo: ${dateRange.from} al ${dateRange.to}`;
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

    // ── Fila 3: Generado ─────────────────────────────────────────────────────
    ws.mergeCells('A3:E3');
    const cellGen = ws.getCell('A3');
    cellGen.value = `Generado: ${new Date().toLocaleString('es-EC')}`;
    applyStyle(cellGen, {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '374151' } },
      font: { size: 8, color: { argb: '9CA3AF' }, name: 'Calibri', italic: true },
      alignment: { vertical: 'middle', horizontal: 'left' },
    });

    // ── Fila 4: Espacio ──────────────────────────────────────────────────────
    ws.getRow(4).height = 6;

    // ── Fila 5: RESUMEN EJECUTIVO ────────────────────────────────────────────
    ws.mergeCells('A5:E5');
    styleSection(ws.getCell('A5'), '  RESUMEN EJECUTIVO');
    ws.getRow(5).height = 18;

    const kpiRows = [
      ['Ventas Totales',     totalV,  '#currency'],
      ['Gastos Totales',     totalG,  '#currency'],
      ['Ganancia Neta',      netProf, '#currency'],
      ['Margen de Ganancia', margin,  '#pct'],
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

      // Color ganancia neta
      if (label === 'Ganancia Neta') {
        cB.font = { ...cB.font, bold: true, color: { argb: value >= 0 ? COLORS.positive : COLORS.negative } };
      }
    });

    // ── Espacio ──────────────────────────────────────────────────────────────
    const spRow1 = 6 + kpiRows.length;
    ws.getRow(spRow1).height = 6;

    // ── DETALLE POR PERIODO ──────────────────────────────────────────────────
    let r = spRow1 + 1;
    ws.mergeCells(`A${r}:E${r}`);
    styleSection(ws.getCell(`A${r}`), '  DETALLE POR PERIODO');
    ws.getRow(r).height = 18;
    r++;

    // Cabeceras de columna
    ['Fecha / Categoria', 'Ventas ($)', 'Gastos ($)', 'Margen ($)', 'Margen (%)'].forEach((h, i) => {
      styleColHeader(ws.getCell(r, i + 1), h);
    });
    ws.getRow(r).height = 16;
    r++;

    // Filas de datos
    (data.sales ?? []).forEach((s, idx) => {
      const key    = s.date ?? s.category ?? '';
      const venta  = Number(s.total_sales ?? s.total ?? 0);
      const gasto  = Number(data.expenses?.find(e => (e.date ?? e.category) === key)?.total_expenses ?? 0);
      const margen = venta - gasto;
      const pct    = venta > 0 ? +((margen / venta) * 100).toFixed(1) : 0;
      const alt    = idx % 2 === 1;

      ws.getRow(r).height = 15;
      styleData(ws.getCell(r, 1), fmtDate(key),  'left',   alt);
      styleData(ws.getCell(r, 2), venta,          'right',  alt, '"$"#,##0.00');
      styleData(ws.getCell(r, 3), gasto,          'right',  alt, '"$"#,##0.00');
      styleData(ws.getCell(r, 4), margen,         'right',  alt, '"$"#,##0.00');

      const cPct = ws.getCell(r, 5);
      styleData(cPct, pct, 'right', alt, '0.0"%"');
      cPct.font = { ...cPct.font, color: { argb: margen >= 0 ? COLORS.positive : COLORS.negative } };

      r++;
    });

    // Fila totales
    ws.getRow(r).height = 18;
    styleTotals(ws.getCell(r, 1), 'TOTALES',  'left');
    styleTotals(ws.getCell(r, 2), totalV,     'right', '"$"#,##0.00');
    styleTotals(ws.getCell(r, 3), totalG,     'right', '"$"#,##0.00');
    styleTotals(ws.getCell(r, 4), netProf,    'right', '"$"#,##0.00');
    styleTotals(ws.getCell(r, 5), margin,     'right', '0.0"%"');
    r += 2;

    // ── GASTOS DETALLADOS ────────────────────────────────────────────────────
    if (data.expenses?.length > 0) {
      ws.mergeCells(`A${r}:E${r}`);
      styleSection(ws.getCell(`A${r}`), '  GASTOS DETALLADOS');
      ws.getRow(r).height = 18;
      r++;

      styleColHeader(ws.getCell(r, 1), 'Fecha / Categoria');
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
        styleData(ws.getCell(r, 1), fmtDate(e.date ?? e.category ?? ''), 'left', alt);
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

    // ── Descargar ────────────────────────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer();
    const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    a.href       = url;
    a.download   = `reporte_${dateRange.from}_${dateRange.to}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);

    setSuccess('Exportado a Excel');
    setTimeout(() => setSuccess(''), 3000);
  };

  const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#8b5cf6'];

  return (
    <PageTemplate
      title="Reportes Avanzados"
      subtitle="Análisis de ventas, gastos y rentabilidad"
      loading={loading}
    >
      <div className="reports-advanced-container">
        {error && <div className="alert-error"><AlertCircle size={16} /> {error}</div>}
        {success && <div className="alert-success"><Check size={16} /> {success}</div>}

        <div className="filters-bar">
          <div className="filter-group">
            <label>Desde</label>
            <input type="date" value={dateRange.from} onChange={e => setDateRange({ ...dateRange, from: e.target.value })} />
          </div>
          <div className="filter-group">
            <label>Hasta</label>
            <input type="date" value={dateRange.to} onChange={e => setDateRange({ ...dateRange, to: e.target.value })} />
          </div>
          <div className="filter-group">
            <label>Agrupar por</label>
            <select value={groupBy} onChange={e => setGroupBy(e.target.value)}>
              <option value="day">Día</option>
              <option value="month">Mes</option>
              <option value="category">Categoría</option>
            </select>
          </div>
          <button className="btn-secondary" onClick={handleExportXLSX}>
            <Download size={16} /> Exportar Excel
          </button>
          <ReportPdfButton
            data={data}
            dateRange={dateRange}
            groupBy={groupBy}
            title="Reporte Avanzado"
            chartRefs={[chartLineRef, chartBarRef]}
          />
        </div>

        {data && data.totals && (
          <div className="kpi-cards">
            <div className="kpi-card">
              <div className="kpi-title">Ventas Totales</div>
              <div className="kpi-value">${Number(data.totals.total_sales).toFixed(2)}</div>
              <TrendingUp size={20} className="kpi-icon positive" />
            </div>
            <div className="kpi-card">
              <div className="kpi-title">Gastos Totales</div>
              <div className="kpi-value">${Number(data.totals.total_expenses).toFixed(2)}</div>
              <TrendingDown size={20} className="kpi-icon negative" />
            </div>
            <div className="kpi-card">
              <div className="kpi-title">Ganancia Neta</div>
              <div className="kpi-value" style={{ color: data.totals.net_profit >= 0 ? '#10b981' : '#ef4444' }}>
                ${Number(data.totals.net_profit).toFixed(2)}
              </div>
              <DollarSign size={20} className="kpi-icon" />
            </div>
          </div>
        )}

        {loading && <div className="loading-spinner"><Loader size={32} className="spin" /></div>}

        {!loading && data && (
          <>
            {/* Gráfico de evolución (solo si groupBy no es 'category') */}
            {groupBy !== 'category' && (
              <div className="chart-card" ref={chartLineRef}>
                <h3>Ventas vs Gastos</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={data.sales.map((s, idx) => ({
                    date: s.date,
                    Ventas: s.total_sales,
                    Gastos: data.expenses.find(e => e.date === s.date)?.total_expenses || 0
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" tickFormatter={v => `$${v}`} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
                    <Legend />
                    <Line type="monotone" dataKey="Ventas" stroke="#10b981" strokeWidth={2} />
                    <Line type="monotone" dataKey="Gastos" stroke="#ef4444" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Gráfico de barras o pastel según groupBy */}
            {groupBy === 'category' && data.sales && data.sales.length > 0 && (
              <div className="chart-card" ref={chartBarRef}>
                <h3>Ventas por Categoría</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={data.sales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="category" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" tickFormatter={v => `$${v}`} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b' }} />
                    <Bar dataKey="total_sales" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Tabla resumen */}
            <div className="table-card">
              <h3>Detalle de Ventas Diarias</h3>
              <div className="table-responsive">
                <table className="report-table">
                  <thead>
                    <tr><th>Fecha</th><th>Ventas</th><th>Gastos</th><th>Margen</th></tr>
                  </thead>
                  <tbody>
                    {data.sales.map(s => {
                      const gasto = data.expenses.find(e => e.date === s.date)?.total_expenses || 0;
                      const margen = s.total_sales - gasto;
                      return (
                        <tr key={s.date}>
                          <td>{s.date}</td>
                          <td>${Number(s.total_sales).toFixed(2)}</td>
                          <td>${Number(gasto).toFixed(2)}</td>
                          <td style={{ color: margen >= 0 ? '#10b981' : '#ef4444' }}>${margen.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </PageTemplate>
  );
}