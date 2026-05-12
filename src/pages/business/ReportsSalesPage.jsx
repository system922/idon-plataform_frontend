import { useState, useEffect, useCallback } from 'react';
import ExcelJS from 'exceljs';
import PageTemplate from '../../components/PageTemplate';
import ReportPdfButton from '../../components/ReportPdfButton';
import {
  Search, DollarSign, User, FileText, Calendar, RefreshCw,
  TrendingUp, Download, Eye, ShoppingBag, Users, Zap
} from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/ReportsSalesPage.css';

export default function ReportsSalesPage() {
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [useEinvoicing, setUseEinvoicing] = useState(false);
  const [statsMetadata, setStatsMetadata] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [summary, setSummary] = useState(null);

  const toNumber = (val) => Number(val) || 0;
  const formatCurrency = (value) => `$${toNumber(value).toFixed(2)}`;
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('es-EC');
  };

  // Cargar resumen de ventas
  const loadSummary = useCallback(async () => {
    try {
      let url = `/api/reports/sales/summary`;
      const params = [];
      if (dateFrom) params.push(`startDate=${dateFrom}`);
      if (dateTo) params.push(`endDate=${dateTo}`);
      if (params.length) url += `?${params.join('&')}`;
      
      const res = await fetchWithAuth(url);
      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          setSummary(result.data);
          setUseEinvoicing(result.metadata?.invoiceSource === 'einvoicing');
          setStatsMetadata({
            source: result.metadata?.invoiceSource || 'pos',
            sourceLabel: result.metadata?.invoiceSource === 'einvoicing' ? 'Facturación Electrónica' : 'Ventas POS',
            sourceIcon: result.metadata?.invoiceSource === 'einvoicing' ? <FileText size={14} /> : <Zap size={14} />,
            title: result.metadata?.invoiceSource === 'einvoicing' ? 'Reporte de Ventas (Facturas Autorizadas)' : 'Reporte de Ventas (Órdenes POS)',
            docLabel: result.metadata?.invoiceSource === 'einvoicing' ? 'N° Factura' : 'N° Orden',
            taxLabel: result.metadata?.invoiceSource === 'einvoicing' ? 'IVA' : 'Impuesto'
          });
        }
      }
    } catch (err) {

    }
  }, [dateFrom, dateTo]);

  // Cargar ventas con paginación y filtros
  const loadSales = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      
      let url = `/api/reports/sales?page=${page}&limit=20`;
      const params = [];
      if (dateFrom) params.push(`startDate=${dateFrom}`);
      if (dateTo) params.push(`endDate=${dateTo}`);
      if (params.length) url += `&${params.join('&')}`;
      
      const res = await fetchWithAuth(url);
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al cargar ventas');
      }
      
      const result = await res.json();
      
      if (result.success) {
        setSales(result.data);
        setFilteredSales(result.data);
        setPagination({
          page: result.pagination.page,
          totalPages: result.pagination.totalPages,
          total: result.pagination.total
        });
        setUseEinvoicing(result.metadata?.invoiceSource === 'einvoices');
        setStatsMetadata({
          source: result.metadata?.invoiceSource || 'pos',
          sourceLabel: result.metadata?.invoiceSource === 'einvoicing' ? 'Facturación Electrónica' : 'Ventas POS',
          sourceIcon: result.metadata?.invoiceSource === 'einvoicing' ? <FileText size={14} /> : <Zap size={14} />,
          title: result.metadata?.invoiceSource === 'einvoicing' ? 'Reporte de Ventas (Facturas Autorizadas)' : 'Reporte de Ventas (Órdenes POS)',
          docLabel: result.metadata?.invoiceSource === 'einvoicing' ? 'N° Factura' : 'N° Orden',
          taxLabel: result.metadata?.invoiceSource === 'einvoicing' ? 'IVA' : 'Impuesto'
        });
      } else {
        throw new Error(result.error || 'Error al cargar ventas');
      }
      
    } catch (err) {

      setError(err.message);
      setSales([]);
      setFilteredSales([]);
      showNotification('Error al cargar las ventas', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateFrom, dateTo]);

  // Cargar resumen y ventas cuando cambian los filtros
  useEffect(() => {
    loadSales(1);
    loadSummary();
  }, [dateFrom, dateTo]);

  // Filtrado local por búsqueda
  useEffect(() => {
    if (!search.trim()) {
      setFilteredSales(sales);
      return;
    }
    
    const lowerSearch = search.toLowerCase();
    const filtered = sales.filter(sale =>
      (sale.numero_factura || '').toLowerCase().includes(lowerSearch) ||
      (sale.cliente_nombre || '').toLowerCase().includes(lowerSearch) ||
      (sale.cliente_cedula || '').includes(lowerSearch)
    );
    setFilteredSales(filtered);
  }, [search, sales]);

  const showNotification = (msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadSales(pagination.page);
    loadSummary();
    showNotification('Actualizando ventas...', 'info');
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

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadSales(newPage);
    }
  };

  // Estadísticas desde el resumen del backend
  const filteredStats = {
    total: summary?.total_ventas || filteredSales.length,
    revenue: summary?.total_ingresos || filteredSales.reduce((sum, sale) => sum + toNumber(sale.total), 0),
    avgTicket: summary?.total_ventas > 0 ? (summary?.total_ingresos / summary?.total_ventas) : 
               (filteredSales.length > 0 ? filteredSales.reduce((sum, sale) => sum + toNumber(sale.total), 0) / filteredSales.length : 0),
    uniqueCustomers: summary?.clientes_unicos || new Set(filteredSales.map(sale => sale.customer_id || sale.cliente_nombre)).size
  };

  // Obtener el valor del impuesto según la fuente
  const getTaxAmount = (sale) => {
    return toNumber(sale.iva || 0);
  };

  // Configuración para PDF
  const pdfConfig = {
    title: statsMetadata?.title || 'Reporte de Ventas',
    landscape: true,
    kpis: [
      { label: `Total ${useEinvoicing ? 'Facturas' : 'Órdenes'}`, value: filteredStats.total, formatter: (v) => String(v) },
      { label: 'Ingresos Totales', value: filteredStats.revenue, formatter: (v) => `$${Number(v).toFixed(2)}`, bold: true },
      { label: 'Ticket Promedio', value: filteredStats.avgTicket, formatter: (v) => `$${Number(v).toFixed(2)}` },
      { label: 'Clientes Únicos', value: filteredStats.uniqueCustomers, formatter: (v) => String(v) },
    ],
    sections: filteredSales.length ? [{
      title: useEinvoicing ? 'DETALLE DE FACTURAS AUTORIZADAS' : 'DETALLE DE ÓRDENES POS',
      columns: [
        { label: 'Fecha',      key: 'fecha',    width: 10 },
        { label: statsMetadata?.docLabel || 'Documento', key: 'numero', width: 18 },
        { label: 'Cliente',    key: 'cliente',  width: 34 },
        { label: 'Subtotal',   key: 'subtotal', width: 13, formatter: (v) => `$${Number(v).toFixed(2)}` },
        { label: statsMetadata?.taxLabel || 'Impuesto', key: 'tax', width: 12, formatter: (v) => `$${Number(v).toFixed(2)}` },
        { label: 'Total',      key: 'total',    width: 13, formatter: (v) => `$${Number(v).toFixed(2)}` },
      ],
      rows: filteredSales.map(sale => ({
        fecha:    formatDate(sale.fecha),
        numero:   sale.numero_factura || '-',
        cliente:  sale.cliente_nombre || 'CONSUMIDOR FINAL',
        subtotal: toNumber(sale.subtotal),
        tax:      getTaxAmount(sale),
        total:    toNumber(sale.total),
      })),
    }] : [],
  };

  // Exportación a Excel con estilos profesionales
  const handleExportXLSX = async () => {
    if (filteredSales.length === 0) {
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
      const ws = wb.addWorksheet('VENTAS', {
        views: [{ showGridLines: false }],
        pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
      });
      ws.columns = [
        { key: 'a', width: 14 }, { key: 'b', width: 14 }, { key: 'c', width: 26 },
        { key: 'd', width: 13 }, { key: 'e', width: 13 }, { key: 'f', width: 13 },
      ];

      ws.mergeCells('A1:F1');
      styleHeader(ws.getCell('A1'), statsMetadata?.title || 'REPORTE DE VENTAS');
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
      cellGen2.value = `Generado: ${new Date().toLocaleString('es-EC')} | Fuente: ${statsMetadata?.sourceLabel || 'POS'}`;
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
        [`Total ${useEinvoicing ? 'Facturas' : 'Órdenes'}`, filteredStats.total, null],
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
      styleSection(ws.getCell(`A${r}`), useEinvoicing ? '  DETALLE DE FACTURAS' : '  DETALLE DE ÓRDENES');
      ws.getRow(r).height = 18;
      r++;

      const headers = useEinvoicing 
        ? ['Fecha', 'N° Factura', 'Cliente', 'Subtotal', 'IVA', 'Total']
        : ['Fecha', 'N° Orden', 'Cliente', 'Subtotal', 'Impuesto', 'Total'];
      
      headers.forEach((h, i) => {
        styleColHeader(ws.getCell(r, i + 1), h);
      });
      ws.getRow(r).height = 16;
      r++;

      let sumSubtotal = 0, sumTax = 0, sumTotal = 0;
      filteredSales.forEach((sale, idx) => {
        const alt = idx % 2 === 1;
        const sub = toNumber(sale.subtotal);
        const tax = getTaxAmount(sale);
        const tot = toNumber(sale.total);
        sumSubtotal += sub;
        sumTax += tax;
        sumTotal += tot;

        ws.getRow(r).height = 15;
        styleData(ws.getCell(r, 1), formatDate(sale.fecha), 'left', alt);
        styleData(ws.getCell(r, 2), sale.numero_factura || '-', 'center', alt);
        styleData(ws.getCell(r, 3), sale.cliente_nombre || 'CONSUMIDOR FINAL', 'left', alt);
        styleData(ws.getCell(r, 4), sub, 'right', alt, '"$"#,##0.00');
        styleData(ws.getCell(r, 5), tax, 'right', alt, '"$"#,##0.00');
        styleData(ws.getCell(r, 6), tot, 'right', alt, '"$"#,##0.00');
        r++;
      });

      ws.getRow(r).height = 18;
      styleTotals(ws.getCell(r, 1), 'TOTALES', 'left');
      [2, 3].forEach(c => styleTotals(ws.getCell(r, c), ''));
      styleTotals(ws.getCell(r, 4), sumSubtotal, 'right', '"$"#,##0.00');
      styleTotals(ws.getCell(r, 5), sumTax,      'right', '"$"#,##0.00');
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

      showNotification('Error al exportar a Excel', 'error');
    } finally {
      setExporting(false);
    }
  };

  const stats = [
    { label: `Total ${useEinvoicing ? 'Facturas' : 'Órdenes'}`, value: filteredStats.total, icon: <ShoppingBag size={20} />, color: '#6842fe' },
    { label: 'Ingresos Totales', value: formatCurrency(filteredStats.revenue), icon: <DollarSign size={20} />, color: '#10b981' },
    { label: 'Ticket Promedio', value: formatCurrency(filteredStats.avgTicket), icon: <TrendingUp size={20} />, color: '#f59e0b' },
    { label: 'Clientes únicos', value: filteredStats.uniqueCustomers, icon: <Users size={20} />, color: '#8b5cf6' },
  ];

  const headerAction = (
    <div className="reports-header-actions">
      {statsMetadata && (
        <div className="source-badge" title={`Datos desde: ${statsMetadata.sourceLabel}`}>
          {statsMetadata.sourceIcon}
          <span>{statsMetadata.sourceLabel}</span>
        </div>
      )}
      <button className="btn-export" onClick={handleExportXLSX} disabled={exporting || filteredSales.length === 0}>
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
      subtitle={`${filteredStats.total} ${useEinvoicing ? 'facturas' : 'órdenes'} • ${formatCurrency(filteredStats.revenue)} en total`}
      loading={loading}
      error={error}
      onRetry={() => loadSales(pagination.page)}
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
        <div className="filter-search">
          <Search size={16} />
          <input 
            type="text" 
            placeholder={`Buscar por #${useEinvoicing ? 'factura' : 'orden'} o cliente...`} 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <div className="filter-date">
          <Calendar size={16} />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span>a</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <button className="btn-reset" onClick={handleResetFilters}>Limpiar filtros</button>
      </div>

      <div className="reports-table-container">
        <table className="reports-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>{useEinvoicing ? 'N° Factura' : 'N° Orden'}</th>
              <th>Cliente</th>
              <th className="center">Subtotal</th>
              <th className="center">{useEinvoicing ? 'IVA' : 'Impuesto'}</th>
              <th className="center">Total</th>
              <th className="center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="empty-state">
                  <FileText size={32} />
                  <p>No hay {useEinvoicing ? 'facturas autorizadas' : 'órdenes registradas'}</p>
                  <span>Prueba cambiando los filtros de búsqueda</span>
                </td>
              </tr>
            )}
            {filteredSales.map(sale => (
              <tr key={sale.id}>
                <td>{formatDate(sale.fecha)}</td>
                <td className="order-number">{sale.numero_factura}</td>
                <td><div className="customer-cell"><User size={12} />{sale.cliente_nombre || 'CONSUMIDOR FINAL'}</div></td>
                <td className="center amount">{formatCurrency(sale.subtotal)}</td>
                <td className="center amount">{formatCurrency(getTaxAmount(sale))}</td>
                <td className="center total">{formatCurrency(sale.total)}</td>
                <td className="center">
                  <button className="btn-view" onClick={() => setSelectedSale(sale)} title="Ver detalle">
                    <Eye size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pagination.totalPages > 1 && (
          <div className="reports-pagination">
            <button className="btn-pagination" onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1}>
              Anterior
            </button>
            <span className="pagination-info">Página {pagination.page} de {pagination.totalPages}</span>
            <button className="btn-pagination" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}>
              Siguiente
            </button>
          </div>
        )}
      </div>

      {filteredSales.length > 0 && (
        <div className="reports-table-info">
          Mostrando {filteredSales.length} de {pagination.total || filteredStats.total} {useEinvoicing ? 'facturas' : 'órdenes'}
          {statsMetadata && <span className="source-info"> (Datos desde: {statsMetadata.sourceLabel})</span>}
        </div>
      )}

      {selectedSale && (
        <div className="reports-modal-overlay" onClick={() => setSelectedSale(null)}>
          <div className="reports-modal" onClick={e => e.stopPropagation()}>
            <div className="reports-modal-header">
              <div>
                <h3>Detalle de {useEinvoicing ? 'Factura' : 'Orden'}</h3>
                <p>#{selectedSale.numero_factura}</p>
              </div>
              <button className="btn-modal-close" onClick={() => setSelectedSale(null)}>✕</button>
            </div>
            <div className="reports-modal-body">
              <div className="detail-grid">
                <div className="detail-item"><label>Fecha</label><span>{formatDate(selectedSale.fecha)}</span></div>
                <div className="detail-item"><label>Cliente</label><span>{selectedSale.cliente_nombre || 'CONSUMIDOR FINAL'}</span></div>
                <div className="detail-item"><label>RUC/CI</label><span>{selectedSale.cliente_cedula || '-'}</span></div>
                <div className="detail-item"><label>Subtotal</label><span>{formatCurrency(selectedSale.subtotal)}</span></div>
                <div className="detail-item"><label>{useEinvoicing ? 'IVA' : 'Impuesto'}</label><span>{formatCurrency(getTaxAmount(selectedSale))}</span></div>
                <div className="detail-item"><label>Total</label><span className="total-amount">{formatCurrency(selectedSale.total)}</span></div>
              </div>
            </div>
            <div className="reports-modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedSale(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </PageTemplate>
  );
}