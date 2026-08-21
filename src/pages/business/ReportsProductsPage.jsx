import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from '../../context/SessionContext';
import {
  FiBarChart2, FiPackage, FiDownload, FiCalendar,
  FiChevronDown, FiRefreshCw, FiAlertCircle, FiTrendingUp,
  FiDollarSign, FiShoppingCart, FiX
} from "react-icons/fi";
import PageTemplate from '../../components/PageTemplate';
import ReportPdfButton from '../../components/ReportPdfGenerator';
import ReportExcelButton from '../../components/ReportExcelGenerator';
import { fetchWithAuth } from '../../config/api';
import Table from '../../components/General/Table';
import { ButtonGroup } from '../../components/General/Button';
import CustomCombobox from '../../components/General/CustomCombobox';
import Modal from '../../components/General/Modal';

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmtCurrency = (n) => `$${Number(n || 0).toFixed(2)}`;

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

  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  return {
    from: formatDate(from),
    to: formatDate(to)
  };
};

// ─── Componente de tarjeta de resumen ─────────────────────────────────────
function SummaryCard({ title, value, icon, color, subtitle, loading }) {
  return (
    <div className="report-product-card">
      <div className="report-product-card-icon" style={{ color }}>{icon}</div>
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

// ─── Componente de selector de fechas personalizadas ──────────────────────
function DateRangePicker({ startDate, endDate, onApply, onClose }) {
  const [localStart, setLocalStart] = useState(startDate || '');
  const [localEnd, setLocalEnd] = useState(endDate || '');

  const handleApply = () => {
    if (localStart && localEnd) onApply(localStart, localEnd);
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

// ─── Página principal ──────────────────────────────────────────────────────
export default function ReportsProductsPage() {
  const { user } = useSession(); // ✅ Solo usamos useSession

  // ─── Estados ──────────────────────────────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [filterCategory, setFilterCategory] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ─── Estadísticas ─────────────────────────────────────────────────────────
  const [stats, setStats] = useState({
    total_productos_vendidos: 0,
    total_ventas: 0,
    productos_distintos: 0,
    ticket_promedio: 0,
    total_costo: 0,
    ganancia_bruta: 0,
    margen_bruto: 0
  });

  // ─── Opciones de fecha ──────────────────────────────────────────────────
  const dateOptions = useMemo(() => ([
    { value: 'all', label: 'Todas las fechas' },
    { value: 'day', label: 'Hoy' },
    { value: 'week', label: 'Esta semana' },
    { value: 'month', label: 'Este mes' },
    { value: 'quarter', label: 'Este trimestre' },
    { value: 'year', label: 'Este año' },
    { value: 'custom', label: 'Personalizado' }
  ]), []);

  // ─── Cargar categorías ──────────────────────────────────────────────────
  useEffect(() => {
    const loadCategories = async () => {
      if (loadingCategories) return;
      try {
        setLoadingCategories(true);
        const res = await fetchWithAuth('/reports/products/categories');
        if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
        const data = await res.json();
        if (data.success) {
          setCategories(Array.isArray(data.data) ? data.data : []);
        } else {
          setCategories([]);
        }
      } catch (err) {
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };
    loadCategories();
  }, []);

  // ─── Cargar reporte ──────────────────────────────────────────────────────
  const loadReport = useCallback(async () => {
    const { from, to } = getDateRangeFromPeriod(dateRange, customStartDate, customEndDate);
    if (!from || !to) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      let url = `/reports/profit-detail?from=${from}&to=${to}`;
      if (filterCategory) {
        url += `&category=${filterCategory}`;
      }

      const res = await fetchWithAuth(url);
      if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
      const result = await res.json();

      const data = result.data || {};
      const productList = data.products || [];
      const summary = data.summary || {};

      const formatted = productList.map((item) => ({
        id: item.product_id || `temp-${Math.random()}`,
        name: item.product_name || 'Producto sin nombre',
        sku: item.sku || '-',
        barcode: item.barcode || '-',
        category: item.category_name || 'Sin categoría',
        category_id: item.category_id,
        qty: Number(item.total_quantity || 0),
        total: Number(item.total_ventas || 0),
        costo: Number(item.total_costo || 0),
        ganancia: Number(item.total_ganancia || 0),
        margen: Number(item.margen || 0),
        precio_promedio: item.precio_promedio || 0,
        costo_promedio: item.costo_promedio || 0,
      }));

      setProducts(formatted);

      const totalVentas = summary.total_ventas || 0;
      const totalCosto = summary.total_costo || 0;
      const gananciaBruta = summary.total_ganancia || 0;
      const margenBruto = summary.margen_promedio || 0;
      const totalQty = formatted.reduce((s, p) => s + p.qty, 0);

      setStats({
        total_productos_vendidos: totalQty,
        total_ventas: totalVentas,
        productos_distintos: formatted.length,
        ticket_promedio: formatted.length > 0 ? totalVentas / formatted.length : 0,
        total_costo: totalCosto,
        ganancia_bruta: gananciaBruta,
        margen_bruto: margenBruto,
      });

      if (formatted.length === 0) {
        setError('No hay ventas registradas en este período.');
      }

    } catch (err) {
      setError('Error al cargar el reporte: ' + (err.message || 'Error desconocido'));
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange, customStartDate, customEndDate, filterCategory]);

  // ─── Cargar datos al montar o cambiar dependencias ──────────────────────
  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // ─── Filtro local por búsqueda ──────────────────────────────────────────
  useEffect(() => {
    const filtered = products.filter(p =>
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  // ─── Refresh manual ──────────────────────────────────────────────────────
  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await loadReport();
    } finally {
      setRefreshing(false);
    }
  };

  // ─── Manejo de fechas ──────────────────────────────────────────────────
  const handleDateRangeChange = useCallback((value) => {
    setDateRange(value);
    if (value === 'custom') {
      setShowCustomDate(true);
    } else {
      setShowCustomDate(false);
      setCustomStartDate('');
      setCustomEndDate('');
    }
  }, []);

  const handleApplyCustomDate = useCallback((start, end) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
    setDateRange('custom');
    setShowCustomDate(false);
  }, []);

  // ─── Limpiar filtros ──────────────────────────────────────────────────
  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setFilterCategory(null);
    setDateRange('month');
    setCustomStartDate('');
    setCustomEndDate('');
    setShowCustomDate(false);
  }, []);

  // ─── Cálculo de totales ──────────────────────────────────────────────────
  const totals = useMemo(() => {
    if (!filteredProducts.length) {
      return { totalVentas: 0, totalCosto: 0, gananciaBruta: 0, margen: 0, totalQty: 0, count: 0 };
    }
    const totalVentas = filteredProducts.reduce((sum, p) => sum + p.total, 0);
    const totalCosto = filteredProducts.reduce((sum, p) => sum + p.costo, 0);
    const gananciaBruta = totalVentas - totalCosto;
    const margen = totalVentas > 0 ? (gananciaBruta / totalVentas) * 100 : 0;
    const totalQty = filteredProducts.reduce((sum, p) => sum + p.qty, 0);
    return { totalVentas, totalCosto, gananciaBruta, margen, totalQty, count: filteredProducts.length };
  }, [filteredProducts]);

  const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  // ─── Generar nombre de archivo según el período ─────────────────────────────
  const getFilename = useCallback(() => {
    const baseName = 'reporte_productos';
    const { from, to } = getDateRangeFromPeriod(dateRange, customStartDate, customEndDate);
    if (!from || !to) {
      return `${baseName}_${dateRange}`;
    }

    const formatDateShort = (dateStr) => {
      const parts = dateStr.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    if (dateRange === 'day') {
      return `${baseName}_${formatDateShort(from)}`;
    }
    if (dateRange === 'week') {
      return `${baseName}_${formatDateShort(from)}--${formatDateShort(to)}`;
    }
    if (dateRange === 'month') {
      const [year, month] = from.split('-');
      const monthName = MONTHS[parseInt(month) - 1];
      return `${baseName}_${monthName}-${year}`;
    }
    if (dateRange === 'quarter') {
      const [year, month] = from.split('-');
      const quarter = Math.floor((parseInt(month) - 1) / 3) + 1;
      return `${baseName}_Q${quarter}-${year}`;
    }
    if (dateRange === 'year') {
      const [year] = from.split('-');
      return `${baseName}_${year}`;
    }
    if (dateRange === 'custom') {
      return `${baseName}_${formatDateShort(from)}--${formatDateShort(to)}`;
    }
    return `${baseName}_${dateRange}`;
  }, [dateRange, customStartDate, customEndDate]);

  // ─── Configuración Excel ──────────────────────────────────────────────────
  const excelConfig = useMemo(() => {
    if (!filteredProducts.length) return null;

    const periodText = dateOptions.find(o => o.value === dateRange)?.label || dateRange;

    const columns = [
      { label: 'Cód. barras', key: 'barcode', align: 'left', width: 20 },
      { label: 'Producto', key: 'name', align: 'left', width: 30 },
      { label: 'Categoría', key: 'category', align: 'left', width: 20 },
      { label: 'Cantidad', key: 'qty', align: 'right', width: 12, numFmt: '#,##0', total: true },
      { label: 'Ventas ($)', key: 'total', align: 'right', width: 14, numFmt: '"$"#,##0.00', total: true },
      { label: 'Costo ($)', key: 'costo', align: 'right', width: 14, numFmt: '"$"#,##0.00', total: true },
      { label: 'Ganancia ($)', key: 'ganancia', align: 'right', width: 14, numFmt: '"$"#,##0.00', total: true },
      { label: 'Margen (%)', key: 'margen', align: 'right', width: 12, numFmt: '0.0"%"' }
    ];

    const rows = filteredProducts.map(p => ({
      name: p.name,
      barcode: p.barcode || '-',
      category: p.category || 'Sin categoría',
      qty: p.qty,
      total: p.total,
      costo: p.costo || 0,
      ganancia: p.ganancia || 0,
      margen: p.margen || 0
    }));

    return {
      title: 'REPORTE DE PRODUCTOS',
      subtitle: 'Análisis de ventas, costos y margen por producto',
      period: `Período: ${periodText}`,
      filename: getFilename(),
      confidential: true,
      kpis: [
        { label: 'Productos Vendidos', value: totals.totalQty, formatter: (v) => Number(v).toLocaleString() },
        { label: 'Ventas Totales', value: totals.totalVentas, formatter: fmtCurrency, bold: true },
        { label: 'Costo Total (FIFO)', value: totals.totalCosto, formatter: fmtCurrency },
        { label: 'Ganancia Bruta', value: totals.gananciaBruta, formatter: fmtCurrency, bold: true },
        { label: 'Margen de Ganancia', value: totals.margen, formatter: (v) => `${Number(v).toFixed(1)}%`, bold: true },
        { label: 'Ticket Promedio', value: stats.ticket_promedio, formatter: fmtCurrency }
      ],
      sections: [{ title: 'DETALLE POR PRODUCTO', columns, rows, showTotals: true }],
      observations: [
        `Reporte generado para el período ${periodText}.`,
        `Total de productos distintos: ${totals.count}.`,
        'Las cifras están expresadas en dólares americanos (USD).',
        totals.gananciaBruta >= 0 ? '✅ El período presenta ganancias positivas.' : '⚠️ El período presenta pérdidas.'
      ],
    };
  }, [filteredProducts, totals, stats.ticket_promedio, dateRange]);

  // ─── Configuración PDF ───────────────────────────────────────────────────
  const pdfConfig = useMemo(() => {
    if (!filteredProducts.length || !excelConfig) return null;
    const columns = excelConfig.sections[0].columns.map(col => ({
      label: col.label,
      key: col.key,
      align: col.align,
      formatter: col.numFmt ? (val) => {
        if (col.numFmt.includes('"$"')) return fmtCurrency(val);
        if (col.numFmt.includes('%')) return `${Number(val).toFixed(1)}%`;
        return val;
      } : undefined
    }));

    return {
      title: excelConfig.title,
      subtitle: excelConfig.subtitle,
      period: excelConfig.period,
      filename: excelConfig.filename,
      confidential: true,
      kpis: excelConfig.kpis,
      sections: [{ title: excelConfig.sections[0].title, columns, rows: excelConfig.sections[0].rows }],
      observations: excelConfig.observations,
      signatures: excelConfig.signatures,
      chartRefs: []
    };
  }, [filteredProducts, excelConfig]);

  // ─── Columnas para la tabla UI ───────────────────────────────────────────
  const columns = useMemo(() => [
    { accessor: 'barcode', label: 'Cód. Barra', render: (item) => <span>{item.barcode || '-'}</span> },
    { accessor: 'name', label: 'Producto', render: (item) => <div><span>{item.name}</span></div> },
    { accessor: 'category', label: 'Categoría', render: (item) => <span>{item.category || 'Sin categoría'}</span> },
    { accessor: 'qty', label: 'Cantidad', align: 'center', render: (item) => <span>{Number(item.qty).toLocaleString()}</span> },
    { accessor: 'total', label: 'Ventas ($)', align: 'center', render: (item) => <span>{fmtCurrency(item.total)}</span> },
    { accessor: 'costo', label: 'Costo ($)', align: 'center', render: (item) => <span>{fmtCurrency(item.costo || 0)}</span> },
    { accessor: 'ganancia', label: 'Ganancia ($)', align: 'center', render: (item) => <span style={{ color: item.ganancia >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmtCurrency(item.ganancia)}</span> },
    { accessor: 'margen', label: 'Margen (%)', align: 'right', render: (item) => <span style={{ color: item.margen >= 0 ? 'var(--success)' : 'var(--danger)' }}>{item.margen.toFixed(1)}%</span> },
  ], []);

  // ─── Footer de la tabla ──────────────────────────────────────────────────
  const tableFooter = useMemo(() => {
    if (!filteredProducts.length) return null;
    return (
      <tr className="table-footer-totals">
        <td><strong>TOTALES</strong></td>
        <td></td><td></td>
        <td className="text-right"><strong>{totals.totalQty.toLocaleString()}</strong></td>
        <td className="text-right"><strong>{fmtCurrency(totals.totalVentas)}</strong></td>
        <td className="text-right"><strong>{fmtCurrency(totals.totalCosto)}</strong></td>
        <td className={`text-right ${totals.gananciaBruta >= 0 ? 'text-success' : 'text-danger'}`}>
          <strong>{fmtCurrency(totals.gananciaBruta)}</strong>
        </td>
        <td className={`text-right ${totals.margen >= 0 ? 'text-success' : 'text-danger'}`}>
          <strong>{totals.margen.toFixed(1)}%</strong>
        </td>
      </tr>
    );
  }, [filteredProducts, totals]);

  // ─── Toolbar ──────────────────────────────────────────────────────────────
  const tableToolbar = (
    <div className="products-toolbar">
      <div className="products-toolbar-right">
        <CustomCombobox
          options={dateOptions}
          value={dateRange}
          onChange={handleDateRangeChange}
          placeholder="Todas las fechas"
          filterable={false}
          forceDropup={false}
          className="combobox-compact"
          style={{ flexShrink: 1, minWidth: '80px', maxWidth: '150px' }}
        />

        <CustomCombobox
          options={[
            { value: '', label: 'Todas las categorías' },
            ...categories.map(cat => ({ value: cat.id, label: cat.name }))
          ]}
          value={filterCategory || ''}
          onChange={setFilterCategory}
          placeholder="Todas las categorías"
          filterable={true}
          className="combobox-compact"
          style={{ flexShrink: 1, minWidth: '80px', maxWidth: '150px' }}
        />
        <ButtonGroup>
          <ReportExcelButton config={excelConfig} />
          <ReportPdfButton
            customConfig={pdfConfig}
            dateRange={{ from: customStartDate || dateRange, to: customEndDate || new Date().toISOString().split('T')[0] }}
            groupBy={null}
          />
        </ButtonGroup>
        <button onClick={handleClearFilters} className="report-btn-cancel-sm" style={{ flexShrink: 0 }}>
          <FiX size={14} /> Limpiar
        </button>
      </div>
    </div>
  );

  // ─── Botón de refresh ────────────────────────────────────────────────────
  const refreshButton = (
    <button onClick={handleRefresh} className="dashboard-refresh-btn-header" disabled={refreshing} title="Actualizar datos">
      <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  // ─── Acciones del header ──────────────────────────────────────────────────
  const headerActions = (
    <div className="products-header-actions">
      {refreshButton}
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <PageTemplate title="REPORTE DE PRODUCTOS" subtitle="Cantidad, ventas y margen por producto" theme="business" loading={loading} headerAction={headerActions}>
      {error && <div className="alert alert-error"><FiAlertCircle size={16} /> {error}</div>}

      <div className="report-summary-grid">
        <SummaryCard title="Total Productos Vendidos" value={(stats.total_productos_vendidos ?? 0).toLocaleString()} icon={<FiShoppingCart size={24} />} color="var(--text-primary)" loading={loading} />
        <SummaryCard title="Ventas Totales" value={fmtCurrency(stats.total_ventas ?? 0)} icon={<FiDollarSign size={24} />} color="var(--text-primary)" loading={loading} />
        <SummaryCard title="Ganancia Bruta" value={fmtCurrency(stats.ganancia_bruta ?? 0)} icon={<FiTrendingUp size={24} />} color={stats.ganancia_bruta >= 0 ? 'var(--success)' : 'var(--danger)'} loading={loading} />
        <SummaryCard title="Margen Bruto" value={`${(stats.margen_bruto ?? 0).toFixed(1)}%`} icon={<FiBarChart2 size={24} />} color={stats.margen_bruto >= 0 ? 'var(--success)' : 'var(--danger)'} loading={loading} />
      </div>

      {filteredProducts.length > 0 && (
        <div className="report-top-product">
          <div className="report-top-product-content">
            <FiBarChart2 size={22} />
            <span>Producto más vendido:</span>
            <strong>{filteredProducts[0].name}</strong>
            <span className="report-top-product-qty">{Number(filteredProducts[0].qty) || 0} unidades</span>
            <span className="report-top-product-total">{fmtCurrency(filteredProducts[0].total)}</span>
          </div>
        </div>
      )}

      <div className="report-table-container">
        <Table
          data={filteredProducts}
          columns={columns}
          keyField="id"
          title="Detalle de productos"
          subtitle={`${filteredProducts.length} ${filteredProducts.length === 1 ? 'producto' : 'productos'} vendidos`}
          toolbar={tableToolbar}
          searchable={true}
          searchPlaceholder="Ej: Producto A, 6855555475209"
          pagination={true}
          itemsPerPage={itemsPerPage}
          itemsPerPageOptions={[10, 15, 20, 50]}
          onItemsPerPageChange={(newPerPage) => setItemsPerPage(newPerPage)}
          loading={loading}
          emptyMessage={error || 'No hay ventas registradas en este período.'}
          striped={true}
          hoverable={true}
          bordered={false}
          compact={false}
          footer={tableFooter}
        />
      </div>

      {showCustomDate && (
        <Modal isOpen={true} onClose={() => setShowCustomDate(false)} title="Seleccionar fechas" size="sm">
          <DateRangePicker
            startDate={customStartDate}
            endDate={customEndDate}
            onApply={handleApplyCustomDate}
            onClose={() => setShowCustomDate(false)}
          />
        </Modal>
      )}
    </PageTemplate>
  );
}