import React, { useState, useEffect } from 'react';
import ExcelJS from 'exceljs';
import PageTemplate from '../../components/PageTemplate';
import ReportPdfButton from '../../components/ReportPdfButton';
import { 
  DollarSign, TrendingUp, TrendingDown, BarChart2, PieChart, 
  Download, Calendar, Loader, AlertCircle, Check 
} from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import '../../styles/AccountingBalance.css';

export default function AccountingBalance() {
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [groupBy, setGroupBy] = useState('month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [exporting, setExporting] = useState(false);

  const loadBalance = async () => {
    if (!dateRange.from || !dateRange.to) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth(`/api/accounting/balance?from=${dateRange.from}&to=${dateRange.to}&groupBy=${groupBy}`);
      if (!res.ok) throw new Error('Error al cargar balance');
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBalance();
  }, [dateRange, groupBy]);

  // ============================================================
  // EXPORTACIÓN A EXCEL (con estilos profesionales)
  // ============================================================
  const handleExportXLSX = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'IDON Accounting';
      wb.created = new Date();

      // Estilos comunes (igual que ReportsAdvanced)
      const COLORS = {
        headerBg:   '1E2840',
        sectionBg:  '2563EB',
        colHeaderBg:'DBEAFE',
        totalsBg:   '1E40AF',
        rowAlt:     'F0F7FF',
        white:      'FFFFFF',
        black:      '000000',
        positive:   '166534',
        negative:   '991B1B',
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

      const totalVentas   = Number(data.total_sales) || 0;
      const totalGastos   = Number(data.total_expenses) || 0;
      const neto          = Number(data.net_income) || (totalVentas - totalGastos);
      const margen        = totalVentas > 0 ? (neto / totalVentas) * 100 : 0;

      const ws = wb.addWorksheet('Balance General', { views: [{ showGridLines: false }] });
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

      // Periodo y grupo
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
      cellGroup.value = `Agrupado por: ${groupBy === 'month' ? 'Mes' : 'Día'}`;
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

      const kpis = [
        ['Ventas Totales', totalVentas, '#currency'],
        ['Gastos Operativos', totalGastos, '#currency'],
        ['Resultado Neto', neto, '#currency'],
        ['Margen de Ganancia', margen, '#pct'],
      ];
      kpis.forEach(([label, value, type], idx) => {
        const rowNum = 5 + idx;
        ws.getRow(rowNum).height = 16;
        const cA = ws.getCell(`A${rowNum}`);
        const cB = ws.getCell(`B${rowNum}`);
        ws.mergeCells(`B${rowNum}:E${rowNum}`);
        const alt = idx % 2 === 1;
        styleData(cA, label, 'left', alt);
        if (type === '#currency') {
          styleData(cB, value, 'right', alt, '"$"#,##0.00');
          if (label === 'Resultado Neto') {
            cB.font = { ...cB.font, bold: true, color: { argb: value >= 0 ? COLORS.positive : COLORS.negative } };
          }
        } else {
          styleData(cB, value.toFixed(1) + '%', 'right', alt);
        }
      });

      const spRow = 5 + kpis.length;
      ws.getRow(spRow).height = 6;

      // Detalle por período
      let r = spRow + 1;
      ws.mergeCells(`A${r}:E${r}`);
      styleSection(ws.getCell(`A${r}`), '  DETALLE POR PERÍODO');
      ws.getRow(r).height = 18;
      r++;

      ['Período', 'Ventas ($)', 'Gastos ($)', 'Resultado ($)', 'Margen (%)'].forEach((h, i) => {
        styleColHeader(ws.getCell(r, i + 1), h);
      });
      ws.getRow(r).height = 16;
      r++;

      const chartData = (data.sales || []).map(s => ({
        period: s.period,
        ventas: Number(s.amount) || 0,
        gastos: Number(data.expenses.find(e => e.period === s.period)?.amount) || 0
      }));

      chartData.forEach((row, idx) => {
        const result = row.ventas - row.gastos;
        const marginPct = row.ventas > 0 ? (result / row.ventas) * 100 : 0;
        const alt = idx % 2 === 1;
        ws.getRow(r).height = 15;
        const periodStr = groupBy === 'month'
          ? new Date(row.period).toLocaleDateString('es-EC', { month: 'long', year: 'numeric' })
          : new Date(row.period).toLocaleDateString();
        styleData(ws.getCell(r, 1), periodStr, 'left', alt);
        styleData(ws.getCell(r, 2), row.ventas, 'right', alt, '"$"#,##0.00');
        styleData(ws.getCell(r, 3), row.gastos, 'right', alt, '"$"#,##0.00');
        styleData(ws.getCell(r, 4), result, 'right', alt, '"$"#,##0.00');
        const cellMargin = ws.getCell(r, 5);
        styleData(cellMargin, marginPct.toFixed(1) + '%', 'right', alt);
        cellMargin.font = { ...cellMargin.font, color: { argb: result >= 0 ? COLORS.positive : COLORS.negative } };
        r++;
      });

      // Fila totales
      ws.getRow(r).height = 18;
      styleTotals(ws.getCell(r, 1), 'TOTALES', 'left');
      styleTotals(ws.getCell(r, 2), totalVentas, 'right', '"$"#,##0.00');
      styleTotals(ws.getCell(r, 3), totalGastos, 'right', '"$"#,##0.00');
      styleTotals(ws.getCell(r, 4), neto, 'right', '"$"#,##0.00');
      styleTotals(ws.getCell(r, 5), margen.toFixed(1) + '%', 'right');

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `balance_${dateRange.from}_${dateRange.to}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess('Exportado a Excel');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Error al exportar a Excel');
    } finally {
      setExporting(false);
    }
  };

  // ============================================================
  // CONFIGURACIÓN PARA PDF
  // ============================================================
  const chartData = (data?.sales || []).map(s => ({
    period: s.period,
    Ventas: Number(s.amount) || 0,
    Gastos: Number(data.expenses.find(e => e.period === s.period)?.amount) || 0
  })) || [];

  const totalVentasPDF = (data?.total_sales ? Number(data.total_sales) : chartData.reduce((s, row) => s + row.Ventas, 0)) || 0;
  const totalGastosPDF = (data?.total_expenses ? Number(data.total_expenses) : chartData.reduce((s, row) => s + row.Gastos, 0)) || 0;
  const netoPDF = (data?.net_income ? Number(data.net_income) : totalVentasPDF - totalGastosPDF) || 0;
  const margenPDF = totalVentasPDF > 0 ? (netoPDF / totalVentasPDF) * 100 : 0;

  const pdfConfig = data ? {
    title: 'Balance General - Estado de Resultados',
    kpis: [
      { label: 'Ventas Totales', value: totalVentasPDF, formatter: (v) => `$${Number(v).toFixed(2)}` },
      { label: 'Gastos Operativos', value: totalGastosPDF, formatter: (v) => `$${Number(v).toFixed(2)}` },
      { label: 'Resultado Neto', value: netoPDF, formatter: (v) => `$${Number(v).toFixed(2)}`, bold: true },
      { label: 'Margen de Ganancia', value: margenPDF, formatter: (v) => `${v.toFixed(1)}%`, bold: true }
    ],
    sections: chartData.length ? [{
      title: 'DETALLE POR PERÍODO',
      columns: [
        { label: 'Período', key: 'period', width: 28, formatter: (val) => {
          if (!val) return '';
          const d = new Date(val);
          return isNaN(d) ? val : d.toLocaleDateString('es-EC');
        } },
        { label: 'Ventas ($)', key: 'ventas', width: 16, formatter: (v) => `$${Number(v).toFixed(2)}` },
        { label: 'Gastos ($)', key: 'gastos', width: 16, formatter: (v) => `$${Number(v).toFixed(2)}` },
        { label: 'Resultado ($)', key: 'resultado', width: 16, formatter: (v) => `$${Number(v).toFixed(2)}` }
      ],
      rows: chartData.map(row => ({
        period: row.period,
        ventas: row.Ventas,
        gastos: row.Gastos,
        resultado: row.Ventas - row.Gastos
      }))
    }] : []
  } : null;

  // ============================================================
  // RENDER (mejorado)
  // ============================================================
  return (
    <PageTemplate
      title="Balance General"
      subtitle="Estado de Resultados - Pérdidas y Ganancias"
    >
      <div className="accounting-balance-container">
        {error && <div className="alert-error"><AlertCircle size={16} /> {error}</div>}
        {success && <div className="alert-success"><Check size={16} /> {success}</div>}

        <div className="filters-bar">
          <div className="filter-group">
            <label>Desde</label>
            <input type="date" value={dateRange.from} onChange={e => setDateRange({...dateRange, from: e.target.value})} />
          </div>
          <div className="filter-group">
            <label>Hasta</label>
            <input type="date" value={dateRange.to} onChange={e => setDateRange({...dateRange, to: e.target.value})} />
          </div>
          <div className="filter-group">
            <label>Agrupar por</label>
            <select value={groupBy} onChange={e => setGroupBy(e.target.value)}>
              <option value="day">Día</option>
              <option value="month">Mes</option>
            </select>
          </div>
          <button className="btn-secondary" onClick={handleExportXLSX} disabled={exporting}>
            <Download size={16} /> {exporting ? 'Exportando...' : 'Exportar Excel'}
          </button>
          <ReportPdfButton
            customConfig={pdfConfig}
            dateRange={dateRange}
            groupBy={groupBy}
            className="btn-secondary"
          />
        </div>

        {loading && <div className="loading-spinner"><Loader size={32} className="spin" /></div>}

        {!loading && data && (
          <>
            {/* KPIs */}
            <div className="kpi-cards">
              <div className="kpi-card">
                <div className="kpi-title">Ventas Totales</div>
                <div className="kpi-value">${totalVentasPDF.toFixed(2)}</div>
                <TrendingUp size={24} className="kpi-icon positive" />
              </div>
              <div className="kpi-card">
                <div className="kpi-title">Gastos Operativos</div>
                <div className="kpi-value">${totalGastosPDF.toFixed(2)}</div>
                <TrendingDown size={24} className="kpi-icon negative" />
              </div>
              {data.total_incomes > 0 && (
                <div className="kpi-card">
                  <div className="kpi-title">Ingresos No Operativos</div>
                  <div className="kpi-value">${Number(data.total_incomes || 0).toFixed(2)}</div>
                  <DollarSign size={24} className="kpi-icon" />
                </div>
              )}
              <div className={`kpi-card ${netoPDF >= 0 ? 'success' : 'danger'}`}>
                <div className="kpi-title">Resultado Neto</div>
                <div className="kpi-value">${netoPDF.toFixed(2)}</div>
                <BarChart2 size={24} className="kpi-icon" />
              </div>
            </div>

            {/* Gráfico de evolución */}
            {chartData.length > 0 && (
              <div className="chart-card">
                <h3>Evolución de Ventas vs Gastos</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="period" stroke="#94a3b8" tickFormatter={(v) => {
                      if (groupBy === 'month') return new Date(v).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
                      return new Date(v).toLocaleDateString();
                    }} />
                    <YAxis stroke="#94a3b8" tickFormatter={v => `$${v}`} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
                    <Legend />
                    <Area type="monotone" dataKey="Ventas" stroke="#10b981" fill="url(#salesGrad)" />
                    <Area type="monotone" dataKey="Gastos" stroke="#ef4444" fill="url(#expenseGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Tabla resumen por período */}
            <div className="table-card">
              <h3>Detalle por {groupBy === 'month' ? 'Mes' : 'Día'}</h3>
              <div className="table-responsive">
                <table className="balance-table">
                  <thead>
                    <tr>
                      <th>Período</th>
                      <th>Ventas</th>
                      <th>Gastos</th>
                      <th>Resultado</th>
                      <th>Margen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map(row => {
                      const result = row.Ventas - row.Gastos;
                      const margin = row.Ventas > 0 ? (result / row.Ventas) * 100 : 0;
                      const periodDisplay = groupBy === 'month'
                        ? new Date(row.period).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
                        : new Date(row.period).toLocaleDateString();
                      return (
                        <tr key={row.period} className="bal-tbody-tr">
                          <td data-label="Período">{periodDisplay}</td>
                          <td data-label="Ventas" className="sales">${row.Ventas.toFixed(2)}</td>
                          <td data-label="Gastos" className="expenses">${row.Gastos.toFixed(2)}</td>
                          <td data-label="Resultado" className={result >= 0 ? 'profit' : 'loss'}>${result.toFixed(2)}</td>
                          <td data-label="Margen" className={margin >= 0 ? 'profit' : 'loss'}>{margin.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bal-tfoot-tr">
                      <td data-label="Período"><strong>Totales</strong></td>
                      <td data-label="Ventas"><strong>${totalVentasPDF.toFixed(2)}</strong></td>
                      <td data-label="Gastos"><strong>${totalGastosPDF.toFixed(2)}</strong></td>
                      <td data-label="Resultado" className={netoPDF >= 0 ? 'profit' : 'loss'}><strong>${netoPDF.toFixed(2)}</strong></td>
                      <td data-label="Margen"><strong>{margenPDF.toFixed(1)}%</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </PageTemplate>
  );
}