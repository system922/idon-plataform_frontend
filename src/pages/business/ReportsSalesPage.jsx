import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSession } from '../../context/SessionContext';
import {
  FiCalendar, FiChevronDown, FiRefreshCw, FiAlertCircle, FiTrendingUp,
  FiDollarSign, FiShoppingCart, FiX, FiUser, FiFileText, FiEye
} from "react-icons/fi";
import PageTemplate from '../../components/PageTemplate';
import ReportPdfButton from '../../components/ReportPdfGenerator';
import ReportExcelButton from '../../components/ReportExcelGenerator';
import { fetchWithAuth } from '../../config/api';
import Table from '../../components/General/Table';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import Modal from '../../components/General/Modal';

// ─── Componente de tarjeta de resumen ─────────────────────────────────────────
function SummaryCard({ title, value, icon, color, subtitle, loading }) {
  return (
    <div className="report-product-card">
      <div className="report-product-card-icon" style={{ color }}>
        {icon}
      </div>
      <div className="report-product-card-content">
        <div className="report-product-card-title">{title}</div>
        {loading ? (
          <div className="report-product-card-value skeleton-loading">Cargando...</div>
        ) : (
          <div className="report-product-card-value">{value ?? '0'}</div>
        )}
        {subtitle && <div className="report-product-card-subtitle">{subtitle}</div>}
      </div>
    </div>
  );
}

// ─── Componente de selector de fechas personalizadas ─────────────────────────
function DateRangePicker({ startDate, endDate, onApply, onClose }) {
  const [localStart, setLocalStart] = useState(startDate || '');
  const [localEnd, setLocalEnd] = useState(endDate || '');

  const handleApply = () => {
    if (localStart && localEnd) {
      onApply(localStart, localEnd);
    }
  };

  return (
    <div className="report-date-range-picker">
      <div className="report-date-range-inputs">
        <input
          type="date"
          value={localStart}
          onChange={(e) => setLocalStart(e.target.value)}
          placeholder="Fecha inicial"
        />
        <span>a</span>
        <input
          type="date"
          value={localEnd}
          onChange={(e) => setLocalEnd(e.target.value)}
          placeholder="Fecha final"
        />
      </div>
      <div className="report-date-range-actions">
        <button onClick={onClose} className="report-btn-cancel">Cancelar</button>
        <button onClick={handleApply} className="report-btn-apply" disabled={!localStart || !localEnd}>
          Aplicar
        </button>
      </div>
    </div>
  );
}

// ─── Modal de detalle de factura ─────────────────────────────────────────────
function SaleDetailModal({ sale, onClose, isOpen }) {
  const { user } = useSession();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (sale && isOpen) {
      loadDetail();
    }
  }, [sale, isOpen]);

  const loadDetail = async () => {
    if (!sale) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth(`/reports/sales/detail/${sale.id}`);
      const data = await res.json();
      if (data.success) {
        setDetail(data.data);
      } else {
        setError(data.error || 'Error al cargar detalle');
      }
    } catch (err) {
      console.error('Error loading detail:', err);
      setError('Error al cargar detalle');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => `$${Number(value || 0).toFixed(2)}`;
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('es-EC');
  };

  const factura = detail?.factura || {};
  const orden = detail?.orden || {};

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detalle de Factura"
      size="lg"
      footer={
        <ButtonGroup>
          <IconTextButton
            variant="danger"
            size="md"
            icon={<FiX size={14} />}
            onClick={onClose}
          >
            Cerrar
          </IconTextButton>
        </ButtonGroup>
      }
    >
      {loading && (
        <div className="detail-loading">Cargando detalle...</div>
      )}

      {error && (
        <div className="detail-error">
          <FiAlertCircle size={16} />
          {error}
        </div>
      )}

      {detail && !loading && (
        <div>
          {/* Datos de la Factura */}
          <div className="detail-section">
            <h4 className="detail-section-title">
              <FiFileText size={16} /> Datos de la Factura
            </h4>
            <div className="detail-grid">
              <div className="detail-item">
                <label>N° Factura</label>
                <span className="detail-value">{factura.numero_factura || sale.numero_factura_electronica || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <label>Estado</label>
                <span className={`status-badge ${factura.estado || 'pendiente'}`}>
                  {factura.estado || 'pendiente'}
                </span>
              </div>
              <div className="detail-item">
                <label>Fecha Emisión</label>
                <span className="detail-value">{formatDate(factura.fecha_emision || sale.fecha)}</span>
              </div>
              {factura.clave_acceso && (
                <div className="detail-item">
                  <label>Clave Acceso</label>
                  <span className="detail-value-mono">{factura.clave_acceso}</span>
                </div>
              )}
            </div>
          </div>

          {/* Datos del Cliente */}
          <div className="detail-section">
            <h4 className="detail-section-title">
              <FiUser size={16} /> Datos del Cliente
            </h4>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Nombre</label>
                <span className="detail-value">{factura.cliente_nombre || sale.cliente_nombre || 'CONSUMIDOR FINAL'}</span>
              </div>
              <div className="detail-item">
                <label>RUC/CI</label>
                <span className="detail-value">{factura.cliente_ruc || sale.cliente_cedula || '-'}</span>
              </div>
            </div>
          </div>

          {/* Datos de la Orden */}
          {orden.id && (
            <div className="detail-section">
              <h4 className="detail-section-title">
                <FiShoppingCart size={16} /> Datos de la Orden
              </h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>N° Orden</label>
                  <span className="detail-value">{orden.numero_orden || '-'}</span>
                </div>
                <div className="detail-item">
                  <label>Mesa</label>
                  <span className="detail-value">{orden.mesa || '-'}</span>
                </div>
              </div>

              {/* Items de la Orden */}
              {orden.items && orden.items.length > 0 && (
                <div className="detail-items-table">
                  <h5>Productos</h5>
                  <div className="items-table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Código de barras</th>
                          <th>Producto</th>
                          <th className="text-center">Cant.</th>
                          <th className="text-right">Precio Unit.</th>
                          <th className="text-right">IVA</th>
                          <th className="text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orden.items.map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.barcode || item.product_barcode || item.code || '-'}</td>
                            <td>{item.product_name}</td>
                            <td className="text-center">{item.quantity}</td>
                            <td className="text-right">{formatCurrency(item.unit_price)}</td>
                            <td className="text-right">{formatCurrency(item.iva_amount)}</td>
                            <td className="text-right">{formatCurrency(item.line_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan="3"></td>
                          <td className="text-right"><strong>Subtotal:</strong></td>
                          <td className="text-right"><strong>{formatCurrency(orden.orden_subtotal || factura.subtotal)}</strong></td>
                          <td className="text-right"><strong>{formatCurrency(orden.orden_total || factura.total)}</strong></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resumen de Totales */}
          <div className="detail-summary">
            <h4 className="detail-section-title">
              <FiDollarSign size={16} /> Resumen de Totales
            </h4>
            <div className="summary-grid">
              <div className="summary-item">
                <label>Subtotal</label>
                <div className="summary-value">{formatCurrency(factura.subtotal || sale.subtotal)}</div>
              </div>
              <div className="summary-item">
                <label>IVA</label>
                <div className="summary-value">{formatCurrency(factura.iva || sale.iva || 0)}</div>
              </div>
              <div className="summary-item">
                <label>Descuento</label>
                <div className="summary-value">{formatCurrency(factura.descuento || sale.descuento || 0)}</div>
              </div>
              <div className="summary-item summary-item-total">
                <label>Total</label>
                <div className="summary-value">{formatCurrency(factura.total || sale.total)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Helper para obtener rango de fechas según período ─────────────────────
const getDateRangeFromPeriod = (period, customStart, customEnd) => {
  const now = new Date();
  let from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let to = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (period === 'all') {
    from = new Date(2020, 0, 1);
    to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === 'day') {
    // hoy
  } else if (period === 'week') {
    from = new Date(now);
    from.setDate(now.getDate() - 6);
    to = new Date(now);
  } else if (period === 'month') {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else if (period === 'quarter') {
    const quarter = Math.floor(now.getMonth() / 3);
    from = new Date(now.getFullYear(), quarter * 3, 1);
    to = new Date(now.getFullYear(), quarter * 3 + 3, 0);
  } else if (period === 'year') {
    from = new Date(now.getFullYear(), 0, 1);
    to = new Date(now.getFullYear(), 11, 31);
  } else if (period === 'custom') {
    if (customStart && customEnd) {
      from = new Date(customStart);
      to = new Date(customEnd);
    } else {
      return { from: null, to: null };
    }
  }

  const formatDateISO = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  return {
    from: formatDateISO(from),
    to: formatDateISO(to)
  };
};

// ─── Página principal ─────────────────────────────────────────────────────────
export default function ReportsSalesPage() {
  const { user, selectedBusiness } = useSession();
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('month');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [stats, setStats] = useState({
    total_facturas: 0,
    total_ingresos: 0,
    ticket_promedio: 0,
    clientes_unicos: 0
  });
  const [statsMetadata, setStatsMetadata] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [invoiceNumbers, setInvoiceNumbers] = useState({});
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const chartRef = useRef(null);

  const dateOptions = [
    { value: 'day', label: 'Hoy' },
    { value: 'week', label: 'Esta semana' },
    { value: 'month', label: 'Este mes' },
    { value: 'quarter', label: 'Este trimestre' },
    { value: 'year', label: 'Este año' },
    { value: 'custom', label: 'Personalizado' }
  ];

  const toNumber = (val) => Number(val) || 0;
  const formatCurrency = (value) => `$${toNumber(value).toFixed(2)}`;
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('es-EC');
  };

  // ── Obtener rango efectivo ────────────────────────────────────────────────
  const getEffectiveDateRange = useCallback(() => {
    return getDateRangeFromPeriod(dateRange, customStartDate, customEndDate);
  }, [dateRange, customStartDate, customEndDate]);

  // ── Cargar estadísticas ────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    if (!selectedBusiness?.id) return;
    
    try {
      setLoadingStats(true);
      const { from, to } = getEffectiveDateRange();
      let url = `/reports/sales/summary`;
      const params = [];
      if (from && to) {
        params.push(`from=${from}`);
        params.push(`to=${to}`);
      }
      if (params.length) url += `?${params.join('&')}`;
      
      const res = await fetchWithAuth(url);
      
      if (!res.ok) {
        throw new Error(`Error HTTP: ${res.status}`);
      }
      
      const data = await res.json();

      if (data.success && data.data) {
        setStats({
          total_facturas: data.data.total_ventas ?? 0,
          total_ingresos: data.data.total_ingresos ?? 0,
          ticket_promedio: data.data.total_ventas > 0 ? (data.data.total_ingresos / data.data.total_ventas) : 0,
          clientes_unicos: data.data.clientes_unicos ?? 0
        });
        setStatsMetadata({
          source: 'einvoicing',
          sourceLabel: 'Facturación Electrónica',
          sourceIcon: <FiFileText size={14} />,
          title: 'Reporte de Ventas (Facturas Autorizadas)',
          docLabel: 'N° Factura',
          taxLabel: 'IVA'
        });
      }
    } catch (err) {
      // Error silencioso
    } finally {
      setLoadingStats(false);
    }
  }, [selectedBusiness, getEffectiveDateRange]);

  // ── Cargar ventas ──────────────────────────────────────────────────────────
  const loadSales = useCallback(async (page = 1) => {
    if (!selectedBusiness?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    setInvoiceNumbers({});
    
    try {
      const { from, to } = getEffectiveDateRange();
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', '20');
      if (from && to) {
        params.append('from', from);
        params.append('to', to);
      }
      
      const url = `/reports/sales?${params.toString()}`;

      const res = await fetchWithAuth(url);
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al cargar facturas');
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
        setStatsMetadata({
          source: 'einvoicing',
          sourceLabel: 'Facturación Electrónica',
          sourceIcon: <FiFileText size={14} />,
          title: 'Reporte de Ventas (Facturas Autorizadas)',
          docLabel: 'N° Factura',
          taxLabel: 'IVA'
        });

        // ─── Enriquecer con números de factura ──────────────────────────────
        const saleIds = result.data.map(sale => sale.id).filter(id => id);
        if (saleIds.length > 0) {
          setLoadingInvoices(true);
          try {
            const detailPromises = saleIds.map(id =>
              fetchWithAuth(`/reports/sales/detail/${id}`)
                .then(res => res.json())
                .then(data => ({
                  id,
                  numero_factura: data?.data?.factura?.numero_factura || null
                }))
                .catch(() => ({ id, numero_factura: null }))
            );
            
            const results = await Promise.all(detailPromises);
            
            const invoiceMap = {};
            results.forEach(({ id, numero_factura }) => {
              if (numero_factura) {
                invoiceMap[id] = numero_factura;
              }
            });
            setInvoiceNumbers(invoiceMap);
          } catch (err) {
            console.warn('Error al obtener números de factura:', err);
          } finally {
            setLoadingInvoices(false);
          }
        }
        // ─── Fin enriquecimiento ──────────────────────────────────────────────

      } else {
        throw new Error(result.error || 'Error al cargar facturas');
      }
    } catch (err) {
      setError(err.message);
      setSales([]);
      setFilteredSales([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBusiness, getEffectiveDateRange]);

  useEffect(() => {
    if (selectedBusiness?.id) {
      loadStats();
      loadSales(1);
    }
  }, [dateRange, customStartDate, customEndDate, selectedBusiness]);

  // Filtrar por búsqueda local
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredSales(sales);
      return;
    }
    
    const lowerSearch = searchTerm.toLowerCase();
    const filtered = sales.filter(sale =>
      (sale.numero_orden || '').toLowerCase().includes(lowerSearch) ||
      (sale.numero_factura || '').toLowerCase().includes(lowerSearch) ||
      (sale.cliente_nombre || '').toLowerCase().includes(lowerSearch) ||
      (sale.cliente_cedula || '').includes(lowerSearch)
    );
    setFilteredSales(filtered);
  }, [searchTerm, sales]);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([loadSales(pagination.page), loadStats()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDateRangeChange = (value) => {
    setDateRange(value);
    setShowDateDropdown(false);
    if (value === 'custom') {
      setShowCustomDate(true);
    } else {
      setShowCustomDate(false);
      setCustomStartDate('');
      setCustomEndDate('');
    }
  };

  const handleApplyCustomDate = (start, end) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
    setShowCustomDate(false);
    setShowDateDropdown(false);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setDateRange('month');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const getTaxAmount = (sale) => {
    return toNumber(sale.iva || 0);
  };

  // ─── Obtener N° Venta y N° Factura para cada registro ────────────────────
  const getNumeroVenta = (sale) => {
    return sale.numero_orden || sale.numero_factura || '-';
  };

  const getNumeroFactura = (sale) => {
    if (invoiceNumbers[sale.id]) {
      return invoiceNumbers[sale.id];
    }
    return sale.numero_factura_electronica || sale.factura_numero || sale.documento || '-';
  };

  // ─── Configuración para EXCEL ─────────────────────────────────────────────
  const excelConfig = useMemo(() => {
    if (!filteredSales.length) return null;

    const periodText = dateOptions.find(o => o.value === dateRange)?.label || dateRange;

    const salesColumns = [
      { label: 'Fecha', key: 'fecha', width: 14 },
      { label: 'N° Venta', key: 'venta', width: 16 },
      { label: 'N° Factura', key: 'factura', width: 18 },
      { label: 'Cliente', key: 'cliente', width: 34 },
      { label: 'Subtotal', key: 'subtotal', width: 13, numFmt: '"$"#,##0.00', total: true },
      { label: 'IVA', key: 'tax', width: 13, numFmt: '"$"#,##0.00', total: true },
      { label: 'Total', key: 'total', width: 13, numFmt: '"$"#,##0.00', total: true }
    ];

    const salesRows = filteredSales.map(sale => ({
      fecha: formatDate(sale.fecha),
      venta: getNumeroVenta(sale),
      factura: getNumeroFactura(sale),
      cliente: sale.cliente_nombre || 'CONSUMIDOR FINAL',
      subtotal: toNumber(sale.subtotal),
      tax: getTaxAmount(sale),
      total: toNumber(sale.total)
    }));

    const totalVentas = filteredSales.reduce((sum, s) => sum + toNumber(s.total), 0);
    const totalSubtotal = filteredSales.reduce((sum, s) => sum + toNumber(s.subtotal), 0);
    const totalIVA = filteredSales.reduce((sum, s) => sum + getTaxAmount(s), 0);
    const count = filteredSales.length;

    return {
      title: 'REPORTE DE VENTAS',
      subtitle: 'Facturas emitidas y detalle de ventas',
      period: `Período: ${periodText}`,
      filename: `reporte_ventas_${new Date().toISOString().slice(0,10)}`,
      confidential: true,
      kpis: [
        { label: 'Total Facturas', value: count, formatter: (v) => String(v) },
        { label: 'Total Ventas', value: totalVentas, formatter: (v) => `$${Number(v).toFixed(2)}` },
        { label: 'Ticket Promedio', value: count > 0 ? totalVentas / count : 0, formatter: (v) => `$${Number(v).toFixed(2)}` },
        { label: 'IVA Total', value: totalIVA, formatter: (v) => `$${Number(v).toFixed(2)}` }
      ],
      sections: [
        {
          title: 'DETALLE DE FACTURAS',
          columns: salesColumns,
          rows: salesRows,
          showTotals: true
        }
      ],
      observations: [
        `Reporte generado para el período ${periodText}.`,
        `Total de facturas: ${count}.`,
        'Las cifras están expresadas en dólares americanos (USD).'
      ],
      chartRefs: [chartRef]
    };
  }, [filteredSales, dateRange, dateOptions, invoiceNumbers]);

  // ─── Configuración para PDF ───────────────────────────────────────────────
  const pdfConfig = useMemo(() => {
    if (!filteredSales.length) return null;

    const periodText = dateOptions.find(o => o.value === dateRange)?.label || dateRange;

    const salesColumns = [
      { label: 'Fecha', key: 'fecha', width: 14 },
      { label: 'N° Venta', key: 'venta', width: 16 },
      { label: 'N° Factura', key: 'factura', width: 18 },
      { label: 'Cliente', key: 'cliente', width: 34 },
      { label: 'Subtotal', key: 'subtotal', width: 13, formatter: (v) => `$${Number(v).toFixed(2)}`, total: true },
      { label: 'IVA', key: 'tax', width: 13, formatter: (v) => `$${Number(v).toFixed(2)}`, total: true },
      { label: 'Total', key: 'total', width: 13, formatter: (v) => `$${Number(v).toFixed(2)}`, total: true }
    ];

    const salesRows = filteredSales.map(sale => ({
      fecha: formatDate(sale.fecha),
      venta: getNumeroVenta(sale),
      factura: getNumeroFactura(sale),
      cliente: sale.cliente_nombre || 'CONSUMIDOR FINAL',
      subtotal: toNumber(sale.subtotal),
      tax: getTaxAmount(sale),
      total: toNumber(sale.total)
    }));

    const totalVentas = filteredSales.reduce((sum, s) => sum + toNumber(s.total), 0);
    const totalSubtotal = filteredSales.reduce((sum, s) => sum + toNumber(s.subtotal), 0);
    const totalIVA = filteredSales.reduce((sum, s) => sum + getTaxAmount(s), 0);
    const count = filteredSales.length;

    return {
      title: 'REPORTE DE VENTAS',
      subtitle: 'Facturas emitidas y detalle de ventas',
      period: `Período: ${periodText}`,
      filename: `reporte_ventas_${new Date().toISOString().slice(0,10)}`,
      confidential: true,
      landscape: false,
      kpis: [
        { label: 'Total Facturas', value: count, formatter: (v) => String(v) },
        { label: 'Total Ventas', value: totalVentas, formatter: (v) => `$${Number(v).toFixed(2)}` },
        { label: 'Ticket Promedio', value: count > 0 ? totalVentas / count : 0, formatter: (v) => `$${Number(v).toFixed(2)}` },
        { label: 'IVA Total', value: totalIVA, formatter: (v) => `$${Number(v).toFixed(2)}` }
      ],
      sections: [
        {
          title: 'DETALLE DE FACTURAS',
          columns: salesColumns,
          rows: salesRows,
          showTotals: true
        }
      ],
      observations: [
        `Reporte generado para el período ${periodText}.`,
        `Total de facturas: ${count}.`,
        'Las cifras están expresadas en dólares americanos (USD).'
      ],
      chartRefs: [chartRef],
      signatures: [
        {
          name: user?.firstName || user?.nombre || 'Usuario',
          role: 'Responsable del Reporte',
          date: new Date().toISOString()
        }
      ]
    };
  }, [filteredSales, dateRange, dateOptions, user, invoiceNumbers]);

  // ─── Columnas de la tabla ────────────────────────────────────────────────
  const columns = [
    {
      accessor: 'fecha',
      label: 'Fecha',
      render: (item) => <span>{formatDate(item.fecha)}</span>,
    },
    {
      accessor: 'numero_venta',
      label: 'N° Venta',
      render: (item) => <span className="invoice-number">{getNumeroVenta(item)}</span>,
    },
    {
      accessor: 'numero_factura',
      label: 'N° Factura',
      render: (item) => {
        const factura = getNumeroFactura(item);
        return (
          <span>
            {loadingInvoices && !factura ? (
              <span className="loading-dots">Cargando...</span>
            ) : (
              factura
            )}
          </span>
        );
      },
    },
    {
      accessor: 'cliente_nombre',
      label: 'Cliente',
      render: (item) => (
        <span>{item.cliente_nombre || 'CONSUMIDOR FINAL'}</span>
      ),
    },
    {
      accessor: 'subtotal',
      label: 'Subtotal',
      align: 'center',
      render: (item) => <span>{formatCurrency(item.subtotal)}</span>,
    },
    {
      accessor: 'tax',
      label: 'IVA',
      align: 'center',
      render: (item) => <span>{formatCurrency(getTaxAmount(item))}</span>,
    },
    {
      accessor: 'total',
      label: 'Total',
      align: 'center',
      render: (item) => <span>{formatCurrency(item.total)}</span>,
    },
    {
      accessor: 'actions',
      label: 'Acciones',
      align: 'center',
      render: (item) => (
        <IconTextButton
          variant="info"
          size="sm"
          inline={true}
          icon={<FiEye size={12} />}
          onClick={() => setSelectedSale(item)}
          title="Ver detalle completo"
        >
          Ver
        </IconTextButton>
      ),
    },
  ];

  // ─── Toolbar ──────────────────────────────────────────────────────────────
  const tableToolbar = (
    <div className="products-toolbar">
      <div className="products-toolbar-right">
        <div className="report-dropdown">
          <button onClick={() => setShowDateDropdown(!showDateDropdown)} className="report-date-btn">
            <FiCalendar size={16} />
            {dateOptions.find(o => o.value === dateRange)?.label || 'Este mes'}
            <FiChevronDown size={14} />
          </button>
          {showDateDropdown && (
            <div className="report-dropdown-menu">
              {dateOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => handleDateRangeChange(option.value)}
                  className={dateRange === option.value ? 'active' : ''}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="products-filter-actions">
          <button onClick={handleClearFilters} className="report-btn-cancel-sm">
            <FiX size={14} /> Limpiar
          </button>
        </div>
        <ButtonGroup>
        <ReportExcelButton
          config={excelConfig}
          onSuccess={() => {}}
          onError={(err) => {
            setError('Error al generar Excel: ' + err.message);
            setTimeout(() => setError(''), 5000);
          }}
        />
        <ReportPdfButton
          customConfig={pdfConfig}
          dateRange={{ from: dateRange, to: new Date().toISOString().split('T')[0] }}
          groupBy={null}
          onSuccess={() => {}}
          onError={(err) => {
            setError('Error al generar PDF: ' + err.message);
            setTimeout(() => setError(''), 5000);
          }}
        />
      </ButtonGroup>
      </div>
    </div>
  );

  // ─── Botón de refrescar ──────────────────────────────────────────────────
  const refreshButton = (
    <button
      onClick={handleRefresh}
      className="dashboard-refresh-btn-header"
      disabled={refreshing}
      title="Actualizar datos"
    >
      <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  // ─── Header Actions ─────────────────────────────────────────────────────
  const headerActions = (
    <div className="products-header-actions"> 
      {refreshButton}
    </div>
  );

  const [itemsPerPage, setItemsPerPage] = useState(10);

  return (
    <PageTemplate
      title="REPORTE DE VENTAS"
      subtitle={`${stats.total_facturas || 0} facturas • ${formatCurrency(stats.total_ingresos || 0)} en total`}
      theme="business"
      loading={loading}
      headerAction={headerActions}
    >
      {error && (
        <div className="alert alert-error">
          <FiAlertCircle size={16} /> {error}
        </div>
      )}

      <div className="report-summary-grid">
        <SummaryCard
          title="Total Facturas"
          value={(stats.total_facturas || 0).toLocaleString()}
          icon={<FiFileText size={24} />}
          color="var(--text-primary)"
          loading={loadingStats}
        />
        <SummaryCard
          title="Ingresos Totales"
          value={formatCurrency(stats.total_ingresos || 0)}
          icon={<FiDollarSign size={24} />}
          color="var(--text-primary)"
          loading={loadingStats}
        />
        <SummaryCard
          title="Ticket Promedio"
          value={formatCurrency(stats.ticket_promedio || 0)}
          icon={<FiTrendingUp size={24} />}
          color="var(--text-primary)"
          loading={loadingStats}
        />
        <SummaryCard
          title="Clientes Únicos"
          value={(stats.clientes_unicos || 0).toLocaleString()}
          icon={<FiUser size={24} />}
          color="var(--text-primary)"
          loading={loadingStats}
        />
      </div>

      <div className="report-table-container">
        <Table
          data={filteredSales}
          columns={columns}
          keyField="id"
          title="Detalle de Ventas"
          subtitle={`${filteredSales.length} ${filteredSales.length === 1 ? 'factura' : 'facturas'} registradas`}
          toolbar={tableToolbar}
          searchable={true}
          searchPlaceholder="Buscar por #venta, #factura o cliente..."
          pagination={true}
          itemsPerPage={itemsPerPage}
          itemsPerPageOptions={[10, 15]}
          onItemsPerPageChange={(newPerPage) => setItemsPerPage(newPerPage)}
          loading={loading}
          emptyMessage={
            error ? error : 
            'No hay facturas registradas en este período. Intenta cambiar el rango de fechas.'
          }
          striped={true}
          hoverable={true}
          bordered={false}
          compact={false}
        />
      </div>

      {/* Modal de fechas personalizadas */}
      {showCustomDate && (
        <div className="report-modal-overlay" onClick={() => setShowCustomDate(false)}>
          <div className="report-modal-box" onClick={e => e.stopPropagation()}>
            <div className="report-modal-header">
              <h2>Seleccionar fechas</h2>
              <button type="button" onClick={() => setShowCustomDate(false)} className="report-modal-close">×</button>
            </div>
            <div className="report-modal-body">
              <DateRangePicker
                startDate={customStartDate}
                endDate={customEndDate}
                onApply={handleApplyCustomDate}
                onClose={() => setShowCustomDate(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalle de factura */}
      <SaleDetailModal
        sale={selectedSale}
        isOpen={!!selectedSale}
        onClose={() => setSelectedSale(null)}
      />
    </PageTemplate>
  );
}