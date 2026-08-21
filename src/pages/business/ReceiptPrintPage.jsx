// src/pages/business/InvoiceReprintPage.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSession } from '../../context/SessionContext';
import {
  FiCalendar, FiChevronDown, FiRefreshCw, FiAlertCircle,
  FiFileText, FiEye, FiPrinter, FiSearch, FiX,
  FiTrendingUp, FiDollarSign, FiUser, FiShoppingCart
} from "react-icons/fi";
import PageTemplate from '../../components/PageTemplate';
import { fetchWithAuth } from '../../config/api';
import { usePrinterService } from '../../services/usePrinterService';
import { useConfirm } from '../../context/ConfirmContext';
import { useAlert } from '../../components/ConfirmContext';
import Table from '../../components/General/Table';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import Modal from '../../components/General/Modal';

// ─── HELPERS ──────────────────────────────────────────────────────────────
const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`;

const getEcuadorDate = () => {
  const now = new Date();
  const ecuadorDate = new Date(now.getTime() - (5 * 60 * 60 * 1000));
  return ecuadorDate.toISOString().split('T')[0];
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('es-EC');
};

// ─── TARJETA DE RESUMEN ──────────────────────────────────────────────────
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

// ─── MODAL DE DETALLE DE FACTURA ──────────────────────────────────────
function InvoiceDetailModal({ sale, onClose, isOpen }) {
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
      setError('Error al cargar detalle');
    } finally {
      setLoading(false);
    }
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
      {loading && <div className="detail-loading">Cargando detalle...</div>}
      {error && (
        <div className="detail-error">
          <FiAlertCircle size={16} /> {error}
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
            <h4 className="detail-section-title"><FiUser size={16} /> Datos del Cliente</h4>
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
              <h4 className="detail-section-title"><FiShoppingCart size={16} /> Datos de la Orden</h4>
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
              {orden.items && orden.items.length > 0 && (
                <div className="detail-items-table">
                  <h5>Productos</h5>
                  <table>
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Producto</th>
                        <th className="text-center">Cant.</th>
                        <th className="text-right">P. Unit.</th>
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
                          <td className="text-right">{fmt(item.unit_price)}</td>
                          <td className="text-right">{fmt(item.iva_amount)}</td>
                          <td className="text-right">{fmt(item.line_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Resumen de Totales */}
          <div className="detail-summary">
            <h4 className="detail-section-title"><FiDollarSign size={16} /> Resumen de Totales</h4>
            <div className="summary-grid">
              <div className="summary-item">
                <label>Subtotal</label>
                <div className="summary-value">{fmt(factura.subtotal || sale.subtotal)}</div>
              </div>
              <div className="summary-item">
                <label>IVA</label>
                <div className="summary-value">{fmt(factura.iva || sale.iva || 0)}</div>
              </div>
              <div className="summary-item">
                <label>Descuento</label>
                <div className="summary-value">{fmt(factura.descuento || sale.descuento || 0)}</div>
              </div>
              <div className="summary-item summary-item-total">
                <label>Total</label>
                <div className="summary-value">{fmt(factura.total || sale.total)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── PÁGINA PRINCIPAL ──────────────────────────────────────────────────
export default function InvoiceReprintPage() {
  const { user, selectedBusiness } = useSession();
  const { showConfirm } = useConfirm();
  const alert = useAlert();
  const { print } = usePrinterService();

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
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [invoiceNumbers, setInvoiceNumbers] = useState({});
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [bizInfo, setBizInfo] = useState(null);

  const dateOptions = [
    { value: 'day', label: 'Hoy' },
    { value: 'week', label: 'Esta semana' },
    { value: 'month', label: 'Este mes' },
    { value: 'quarter', label: 'Este trimestre' },
    { value: 'year', label: 'Este año' },
    { value: 'custom', label: 'Personalizado' }
  ];

  const toNumber = (val) => Number(val) || 0;

  // ── Obtener rango efectivo ────────────────────────────────────────────
  const getEffectiveDateRange = useCallback(() => {
    const now = new Date();
    let from, to;

    if (dateRange === 'day') {
      const today = getEcuadorDate();
      from = today;
      to = today;
    } else if (dateRange === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      from = weekAgo.toISOString().split('T')[0];
      to = now.toISOString().split('T')[0];
    } else if (dateRange === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);
      from = monthAgo.toISOString().split('T')[0];
      to = now.toISOString().split('T')[0];
    } else if (dateRange === 'quarter') {
      const quarterStart = new Date(now);
      quarterStart.setMonth(now.getMonth() - 3);
      from = quarterStart.toISOString().split('T')[0];
      to = now.toISOString().split('T')[0];
    } else if (dateRange === 'year') {
      from = `${now.getFullYear()}-01-01`;
      to = `${now.getFullYear()}-12-31`;
    } else if (dateRange === 'custom' && customStartDate && customEndDate) {
      from = customStartDate;
      to = customEndDate;
    } else {
      // default month
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);
      from = monthAgo.toISOString().split('T')[0];
      to = now.toISOString().split('T')[0];
    }
    return { from, to };
  }, [dateRange, customStartDate, customEndDate]);

  // ── Cargar estadísticas ──────────────────────────────────────────────
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
      if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
      const data = await res.json();
      if (data.success && data.data) {
        setStats({
          total_facturas: data.data.total_ventas ?? 0,
          total_ingresos: data.data.total_ingresos ?? 0,
          ticket_promedio: data.data.total_ventas > 0 ? (data.data.total_ingresos / data.data.total_ventas) : 0,
          clientes_unicos: data.data.clientes_unicos ?? 0
        });
      }
    } catch (err) {
      // silencioso
    } finally {
      setLoadingStats(false);
    }
  }, [selectedBusiness, getEffectiveDateRange]);

  // ── Cargar ventas ─────────────────────────────────────────────────────
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

        // Obtener números de factura (solo para visualización)
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
              if (numero_factura) invoiceMap[id] = numero_factura;
            });
            setInvoiceNumbers(invoiceMap);
          } catch (err) {
            console.warn('Error al obtener números de factura:', err);
          } finally {
            setLoadingInvoices(false);
          }
        }
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

  // ── Cargar datos de negocio para impresión ────────────────────────────
  useEffect(() => {
    if (!selectedBusiness?.id) return;
    const loadBizInfo = async () => {
      try {
        const response = await fetchWithAuth('/settings/receipt-info');
        const data = await response.json();
        setBizInfo(data);
      } catch (error) {
        console.warn('Error cargando info del negocio:', error);
      }
    };
    loadBizInfo();
  }, [selectedBusiness]);

  // ── Carga inicial ─────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedBusiness?.id) {
      loadStats();
      loadSales(1);
    }
  }, [dateRange, customStartDate, customEndDate, selectedBusiness]);

  // ── Filtro por búsqueda ──────────────────────────────────────────────
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

  // ─── HANDLERS ──────────────────────────────────────────────────────────
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
    setDateRange('custom');
    setShowCustomDate(false);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setDateRange('month');
    setCustomStartDate('');
    setCustomEndDate('');
    setShowCustomDate(false);
  };

  // ─── REIMPRIMIR FACTURA ──────────────────────────────────────────────
  const handlePrintInvoice = async (sale) => {
    setLoading(true);
    try {
      // Obtener detalle completo para tener items
      let invoiceData = sale;
      try {
        const res = await fetchWithAuth(`/reports/sales/detail/${sale.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            invoiceData = data.data;
          }
        }
      } catch {}

      const factura = invoiceData.factura || {};
      const orden = invoiceData.orden || {};
      const items = orden.items || sale.items || [];

      const printData = {
        bizInfo,
        invoice: {
          number: factura.numero_factura || sale.numero_factura_electronica || 'N/A',
          auth_number: factura.auth_number || null,
          auth_date: factura.auth_date || null,
          date: factura.fecha_emision || sale.fecha,
        },
        customer: {
          name: factura.cliente_nombre || sale.cliente_nombre || 'CONSUMIDOR FINAL',
          id: factura.cliente_ruc || sale.cliente_cedula || '9999999999',
        },
        items: items.map(item => ({
          description: item.product_name || item.description || 'Producto',
          quantity: item.quantity || 1,
          price: item.unit_price || 0,
          total: (item.quantity || 1) * (item.unit_price || 0),
        })),
        subtotal_15: factura.subtotal || sale.subtotal || 0,
        subtotal_0: 0,
        tax: factura.iva || sale.iva || 0,
        total: factura.total || sale.total || 0,
        printerFooter: bizInfo?.receipt_footer || '¡Gracias por su preferencia!',
      };

      const result = await print('printer_main', 'invoice', printData, false);
      if (result?.success) {
        alert.success('Factura reimpresa correctamente');
      } else {
        alert.error(result?.error || 'Error al imprimir factura');
      }
    } catch (error) {
      alert.error('Error al reimprimir la factura');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (sale) => {
    setSelectedSale(sale);
    setShowDetailModal(true);
  };

  // ─── COLUMNAS ──────────────────────────────────────────────────────────
  const getNumeroVenta = (sale) => sale.numero_orden || sale.numero_factura || '-';
  const getNumeroFactura = (sale) => {
    if (invoiceNumbers[sale.id]) return invoiceNumbers[sale.id];
    return sale.numero_factura_electronica || sale.factura_numero || sale.documento || '-';
  };
  const getTaxAmount = (sale) => toNumber(sale.iva || 0);

  const columns = [
    { accessor: 'fecha', label: 'Fecha', render: (item) => <span>{formatDate(item.fecha)}</span> },
    { accessor: 'numero_venta', label: 'N° Venta', render: (item) => <span className="invoice-number">{getNumeroVenta(item)}</span> },
    { accessor: 'numero_factura', label: 'N° Factura', render: (item) => {
        const factura = getNumeroFactura(item);
        return <span>{loadingInvoices && !factura ? 'Cargando...' : factura}</span>;
      }
    },
    { accessor: 'cliente_nombre', label: 'Cliente', render: (item) => <span>{item.cliente_nombre || 'CONSUMIDOR FINAL'}</span> },
    { accessor: 'subtotal', label: 'Subtotal', align: 'center', render: (item) => <span>{fmt(item.subtotal)}</span> },
    { accessor: 'tax', label: 'IVA', align: 'center', render: (item) => <span>{fmt(getTaxAmount(item))}</span> },
    { accessor: 'total', label: 'Total', align: 'center', render: (item) => <span className="amount">{fmt(item.total)}</span> },
    { accessor: 'actions', label: 'Acciones', align: 'center', render: (item) => (
        <ButtonGroup>
          <IconTextButton
            variant="info"
            size="sm"
            inline={true}
            icon={<FiEye size={14} />}
            onClick={() => handleViewDetail(item)}
            title="Ver detalle"
          >
            Ver
          </IconTextButton>
          <IconTextButton
            variant="success"
            size="sm"
            inline={true}
            icon={<FiPrinter size={14} />}
            onClick={() => handlePrintInvoice(item)}
            disabled={loading}
            title="Reimprimir factura"
          >
            Reimprimir
          </IconTextButton>
        </ButtonGroup>
      )
    },
  ];

  // ─── TOOLBAR ──────────────────────────────────────────────────────────
  const toolbar = (
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
        <div className="search-input-wrapper" style={{ position: 'relative', minWidth: '150px' }}>
          <FiSearch size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar..."
            style={{
              padding: '6px 12px 6px 34px',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              width: '100%',
              fontSize: '12px',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              outline: 'none',
              height: '34px'
            }}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <FiX size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // ─── BOTÓN DE REFRESCAR ──────────────────────────────────────────────
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

  // ─── HEADER ACTIONS ──────────────────────────────────────────────────
  const headerActions = (
    <div className="products-header-actions"> 
      {refreshButton}
    </div>
  );

  // ─── RENDER ──────────────────────────────────────────────────────────
  return (
    <PageTemplate
      title="REIMPRESIÓN DE FACTURAS"
      subtitle={`${stats.total_facturas || 0} facturas • ${fmt(stats.total_ingresos || 0)} en total`}
      theme="business"
      loading={loading}
      headerAction={headerActions}
    >
      {error && (
        <div className="alert alert-error">
          <FiAlertCircle size={16} /> {error}
        </div>
      )}

      {/* Tarjetas de resumen igual que en reportes */}
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
          value={fmt(stats.total_ingresos || 0)}
          icon={<FiDollarSign size={24} />}
          color="var(--text-primary)"
          loading={loadingStats}
        />
        <SummaryCard
          title="Ticket Promedio"
          value={fmt(stats.ticket_promedio || 0)}
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

      {/* Tabla con acciones de reimpresión */}
      <div className="report-table-container">
        <Table
          data={filteredSales}
          columns={columns}
          keyField="id"
          title="Detalle de Ventas"
          subtitle={`${filteredSales.length} ${filteredSales.length === 1 ? 'factura' : 'facturas'} listas para reimprimir`}
          toolbar={toolbar}
          searchable={false}
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
        <Modal
          isOpen={true}
          onClose={() => setShowCustomDate(false)}
          title="Seleccionar fechas"
          size="sm"
          footer={
            <ButtonGroup>
              <IconTextButton
                variant="danger"
                size="md"
                icon={<FiX size={14} />}
                onClick={() => setShowCustomDate(false)}
              >
                Cancelar
              </IconTextButton>
              <IconTextButton
                variant="success"
                size="md"
                onClick={() => handleApplyCustomDate(customStartDate, customEndDate)}
                disabled={!customStartDate || !customEndDate}
              >
                Aplicar
              </IconTextButton>
            </ButtonGroup>
          }
        >
          <div className="report-date-range-picker">
            <div className="report-date-range-inputs">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                placeholder="Fecha inicial"
              />
              <span>a</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                placeholder="Fecha final"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de detalle de factura */}
      <InvoiceDetailModal
        sale={selectedSale}
        isOpen={!!selectedSale}
        onClose={() => setSelectedSale(null)}
      />
    </PageTemplate>
  );
}