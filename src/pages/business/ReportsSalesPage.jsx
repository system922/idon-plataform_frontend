import { useState, useEffect, useCallback } from 'react';
import ExcelJS from 'exceljs';
import PageTemplate from '../../components/PageTemplate';
import ReportPdfButton from '../../components/ReportPdfButton';
import {
  Search, DollarSign, User, FileText, Calendar, RefreshCw,
  TrendingUp, Download, Eye, ShoppingBag, Users
} from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/ReportsSalesPage.css';

export default function ReportsSalesPage() {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState(null);
  const [exporting, setExporting] = useState(false);

  const toNumber = (val) => Number(val) || 0;
  const formatCurrency = (value) => `$${toNumber(value).toFixed(2)}`;
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('es-EC');
  };

  // Cargar SOLO facturas autorizadas
  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetchWithAuth('/api/einvoicing/invoices?status=autorizada');
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al cargar facturas');
      }
      const data = await res.json();
      let invoicesData = Array.isArray(data) ? data : [];
      // Filtro extra por si acaso el backend no filtró
      invoicesData = invoicesData.filter(inv => inv.status === 'autorizada');
      setInvoices(invoicesData);
    } catch (err) {
      console.error('Error cargando facturas:', err);
      setError(err.message);
      setInvoices([]);
      showNotification('Error al cargar las facturas', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // Filtrado local (por fechas, búsqueda)
  useEffect(() => {
    let filtered = [...invoices];
    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(inv =>
        (inv.invoice_number || '').toLowerCase().includes(lowerSearch) ||
        (inv.customer_name || '').toLowerCase().includes(lowerSearch)
      );
    }
    if (dateFrom) {
      filtered = filtered.filter(inv => inv.emission_date?.split('T')[0] >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter(inv => inv.emission_date?.split('T')[0] <= dateTo);
    }
    filtered.sort((a, b) => new Date(b.emission_date) - new Date(a.emission_date));
    setFilteredInvoices(filtered);
  }, [invoices, search, dateFrom, dateTo]);

  const showNotification = (msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadInvoices();
    showNotification('Actualizando facturas...', 'info');
  };

  const handleResetFilters = () => {
    const today = new Date();
    const firstDay = new Date();
    firstDay.setDate(1);
    setDateFrom(firstDay.toISOString().split('T')[0]);
    setDateTo(today.toISOString().split('T')[0]);
    setSearch('');
    showNotification('Filtros restablecidos', 'success');
  };

  // Estadísticas
  const filteredStats = {
    total: filteredInvoices.length,
    revenue: filteredInvoices.reduce((sum, inv) => sum + toNumber(inv.total), 0),
    avgTicket: filteredInvoices.length > 0 ? filteredInvoices.reduce((sum, inv) => sum + toNumber(inv.total), 0) / filteredInvoices.length : 0,
    uniqueCustomers: new Set(filteredInvoices.map(inv => inv.customer_id || inv.customer_name)).size
  };

  // Configuración para PDF
  const pdfConfig = {
    title: 'Reporte de Ventas (Facturas Autorizadas)',
    landscape: true,
    kpis: [
      { label: 'Total Facturas', value: filteredStats.total, formatter: (v) => String(v) },
      { label: 'Ingresos Totales', value: filteredStats.revenue, formatter: (v) => `$${Number(v).toFixed(2)}`, bold: true },
      { label: 'Ticket Promedio', value: filteredStats.avgTicket, formatter: (v) => `$${Number(v).toFixed(2)}` },
      { label: 'Clientes Únicos', value: filteredStats.uniqueCustomers, formatter: (v) => String(v) },
    ],
    sections: filteredInvoices.length ? [{
      title: 'DETALLE DE FACTURAS AUTORIZADAS',
      columns: [
        { label: 'Fecha',      key: 'fecha',    width: 10 },
        { label: 'N° Factura', key: 'numero',   width: 18 },
        { label: 'Cliente',    key: 'cliente',  width: 34 },
        { label: 'Subtotal',   key: 'subtotal', width: 13, formatter: (v) => `$${Number(v).toFixed(2)}` },
        { label: 'IVA',        key: 'iva',      width: 12, formatter: (v) => `$${Number(v).toFixed(2)}` },
        { label: 'Total',      key: 'total',    width: 13, formatter: (v) => `$${Number(v).toFixed(2)}` },
      ],
      rows: filteredInvoices.map(inv => ({
        fecha:    formatDate(inv.emission_date || inv.created_at),
        numero:   inv.invoice_number || '-',
        cliente:  inv.customer_name || 'CONSUMIDOR FINAL',
        subtotal: toNumber(inv.subtotal),
        iva:      toNumber(inv.iva_amount),
        total:    toNumber(inv.total),
      })),
    }] : [],
  };

  // Exportación a Excel con estilos profesionales
  const handleExportXLSX = async () => {
    if (filteredInvoices.length === 0) {
      showNotification('No hay datos para exportar', 'warning');
      return;
    }
    setExporting(true);
    try {
      const COLORS = {
        headerBg:   '1E2840',
        sectionBg:  '2563EB',
        colHeaderBg:'DBEAFE',
        totalsBg:   '1E40AF',
        rowAlt:     'F0F7FF',
        white:      'FFFFFF',
        black:      '000000',
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
          fill: altRow ? { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.rowAlt } } : { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.white } },
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

      const wb = new ExcelJS.Workbook();
      wb.creator = 'IDON Gestion';
      wb.created = new Date();
      const ws = wb.addWorksheet('FACTURAS', {
        views: [{ showGridLines: false }],
        pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
      });
      ws.columns = [
        { key: 'a', width: 14 }, { key: 'b', width: 14 }, { key: 'c', width: 26 },
        { key: 'd', width: 13 }, { key: 'e', width: 13 }, { key: 'f', width: 13 },
      ];

      ws.mergeCells('A1:F1');
      styleHeader(ws.getCell('A1'), 'REPORTE DE VENTAS (FACTURAS AUTORIZADAS)');
      ws.getRow(1).height = 28;

      ws.getRow(2).height = 18;
      ws.mergeCells('A2:C2');
      const cellPeriod = ws.getCell('A2');
      cellPeriod.value = `Periodo: ${dateFrom} al ${dateTo}`;
      applyStyle(cellPeriod, {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A5F' } },
        font: { size: 9, color: { argb: COLORS.white }, name: 'Calibri' },
        alignment: { vertical: 'middle', horizontal: 'left' },
      });
      ws.mergeCells('D2:F2');
      const cellGen2 = ws.getCell('D2');
      cellGen2.value = `Generado: ${new Date().toLocaleString('es-EC')}`;
      applyStyle(cellGen2, {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '374151' } },
        font: { size: 8, color: { argb: '9CA3AF' }, name: 'Calibri', italic: true },
        alignment: { vertical: 'middle', horizontal: 'right' },
      });

      ws.getRow(3).height = 6;

      ws.mergeCells('A4:F4');
      styleSection(ws.getCell('A4'), '  RESUMEN EJECUTIVO');
      ws.getRow(4).height = 18;

      const kpiRows = [
        ['Total Facturas', filteredStats.total, null],
        ['Ingresos Totales', filteredStats.revenue, '"$"#,##0.00'],
        ['Ticket Promedio', filteredStats.avgTicket, '"$"#,##0.00'],
        ['Clientes Únicos', filteredStats.uniqueCustomers, null],
      ];
      kpiRows.forEach(([label, value, fmt], i) => {
        const rowNum = 5 + i;
        ws.getRow(rowNum).height = 16;
        const cA = ws.getCell(`A${rowNum}`);
        const cB = ws.getCell(`B${rowNum}`);
        ws.mergeCells(`B${rowNum}:F${rowNum}`);
        const alt = i % 2 === 1;
        styleData(cA, label, 'left', alt);
        styleData(cB, value, 'right', alt, fmt);
      });

      const spRow = 5 + kpiRows.length;
      ws.getRow(spRow).height = 6;

      let r = spRow + 1;
      ws.mergeCells(`A${r}:F${r}`);
      styleSection(ws.getCell(`A${r}`), '  DETALLE DE FACTURAS');
      ws.getRow(r).height = 18;
      r++;

      ['Fecha', 'N° Factura', 'Cliente', 'Subtotal', 'IVA', 'Total'].forEach((h, i) => {
        styleColHeader(ws.getCell(r, i + 1), h);
      });
      ws.getRow(r).height = 16;
      r++;

      let sumSubtotal = 0, sumIva = 0, sumTotal = 0;
      filteredInvoices.forEach((inv, idx) => {
        const alt = idx % 2 === 1;
        const sub = toNumber(inv.subtotal);
        const iva = toNumber(inv.iva_amount);
        const tot = toNumber(inv.total);
        sumSubtotal += sub;
        sumIva += iva;
        sumTotal += tot;

        ws.getRow(r).height = 15;
        styleData(ws.getCell(r, 1), formatDate(inv.emission_date || inv.created_at), 'left', alt);
        styleData(ws.getCell(r, 2), inv.invoice_number, 'center', alt);
        styleData(ws.getCell(r, 3), inv.customer_name || 'CONSUMIDOR FINAL', 'left', alt);
        styleData(ws.getCell(r, 4), sub, 'right', alt, '"$"#,##0.00');
        styleData(ws.getCell(r, 5), iva, 'right', alt, '"$"#,##0.00');
        styleData(ws.getCell(r, 6), tot, 'right', alt, '"$"#,##0.00');
        r++;
      });

      ws.getRow(r).height = 18;
      styleTotals(ws.getCell(r, 1), 'TOTALES', 'left');
      [2, 3].forEach(c => styleTotals(ws.getCell(r, c), ''));
      styleTotals(ws.getCell(r, 4), sumSubtotal, 'right', '"$"#,##0.00');
      styleTotals(ws.getCell(r, 5), sumIva,      'right', '"$"#,##0.00');
      styleTotals(ws.getCell(r, 6), sumTotal,    'right', '"$"#,##0.00');

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ventas_${dateFrom}_${dateTo}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification('Exportado a Excel', 'success');
    } catch (err) {
      console.error(err);
      showNotification('Error al exportar a Excel', 'error');
    } finally {
      setExporting(false);
    }
  };

  const stats = [
    { label: 'Total Facturas', value: filteredStats.total, icon: <ShoppingBag size={20} />, color: '#6842fe' },
    { label: 'Ingresos Totales', value: formatCurrency(filteredStats.revenue), icon: <DollarSign size={20} />, color: '#10b981' },
    { label: 'Ticket Promedio', value: formatCurrency(filteredStats.avgTicket), icon: <TrendingUp size={20} />, color: '#f59e0b' },
    { label: 'Clientes únicos', value: filteredStats.uniqueCustomers, icon: <Users size={20} />, color: '#8b5cf6' },
  ];

  const headerAction = (
    <div className="reports-header-actions">
      <button className="btn-export" onClick={handleExportXLSX} disabled={exporting || filteredInvoices.length === 0}>
        <Download size={16} /> {exporting ? 'Exportando...' : 'Excel'}
      </button>
      <ReportPdfButton customConfig={pdfConfig} dateRange={{ from: dateFrom, to: dateTo }} className="btn-export" />
      <button className="btn-refresh" onClick={handleRefresh} disabled={refreshing}>
        <RefreshCw size={16} className={refreshing ? 'spin' : ''} /> Actualizar
      </button>
    </div>
  );

  return (
    <PageTemplate
      title="Reporte de Ventas"
      subtitle={`${filteredStats.total} facturas • ${formatCurrency(filteredStats.revenue)} en total`}
      loading={loading}
      error={error}
      onRetry={loadInvoices}
      headerAction={headerAction}
    >
      {notification && <div className={`reports-notification ${notification.type}`}>{notification.msg}</div>}

      <div className="reports-stats-grid">
        {stats.map(stat => (
          <div key={stat.label} className="reports-stat-card">
            <div className="stat-icon" style={{ background: `${stat.color}20`, color: stat.color }}>{stat.icon}</div>
            <div className="stat-info"><span className="stat-value">{stat.value}</span><span className="stat-label">{stat.label}</span></div>
          </div>
        ))}
      </div>

      <div className="reports-filters">
        <div className="filter-search"><Search size={16} /><input type="text" placeholder="Buscar por #factura o cliente..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="filter-date"><Calendar size={16} /><input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /><span>a</span><input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
        <button className="btn-reset" onClick={handleResetFilters}>Limpiar filtros</button>
      </div>

      <div className="reports-table-container">
        <table className="reports-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>N° Factura</th>
              <th>Cliente</th>
              <th className="center">Subtotal</th>
              <th className="center">IVA</th>
              <th className="center">Total</th>
              <th className="center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length === 0 && !loading && (
              <tr><td colSpan={7} className="empty-state"><FileText size={32} /><p>No hay facturas autorizadas</p><span>Prueba cambiando los filtros de búsqueda</span></td></tr>
            )}
            {filteredInvoices.map(inv => (
              <tr key={inv.id}>
                <td>{formatDate(inv.emission_date || inv.created_at)}</td>
                <td className="order-number">{inv.invoice_number}</td>
                <td><div className="customer-cell"><User size={12} />{inv.customer_name || 'CONSUMIDOR FINAL'}</div></td>
                <td className="center amount">{formatCurrency(inv.subtotal)}</td>
                <td className="center amount">{formatCurrency(inv.iva_amount)}</td>
                <td className="center total">{formatCurrency(inv.total)}</td>
                <td className="center">
                  <button className="btn-view" onClick={() => setSelectedInvoice(inv)} title="Ver detalle">
                    <Eye size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredInvoices.length > 0 && (
        <div className="reports-table-info">Mostrando {filteredInvoices.length} facturas</div>
      )}

      {selectedInvoice && (
        <div className="reports-modal-overlay" onClick={() => setSelectedInvoice(null)}>
          <div className="reports-modal" onClick={e => e.stopPropagation()}>
            <div className="reports-modal-header">
              <div><h3>Detalle de Factura</h3><p>#{selectedInvoice.invoice_number}</p></div>
              <button className="btn-modal-close" onClick={() => setSelectedInvoice(null)}>✕</button>
            </div>
            <div className="reports-modal-body">
              <div className="detail-grid">
                <div className="detail-item"><label>Fecha</label><span>{formatDate(selectedInvoice.emission_date || selectedInvoice.created_at)}</span></div>
                <div className="detail-item"><label>Cliente</label><span>{selectedInvoice.customer_name || 'CONSUMIDOR FINAL'}</span></div>
                <div className="detail-item"><label>RUC/CI</label><span>{selectedInvoice.customer_ruc || '-'}</span></div>
                <div className="detail-item"><label>Subtotal</label><span>{formatCurrency(selectedInvoice.subtotal)}</span></div>
                <div className="detail-item"><label>IVA</label><span>{formatCurrency(selectedInvoice.iva_amount)}</span></div>
                <div className="detail-item"><label>Total</label><span className="total-amount">{formatCurrency(selectedInvoice.total)}</span></div>
                {selectedInvoice.access_key && (
                  <div className="detail-item"><label>Clave Acceso</label><span style={{fontSize:11}}>{selectedInvoice.access_key}</span></div>
                )}
              </div>
            </div>
            <div className="reports-modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedInvoice(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </PageTemplate>
  );
}