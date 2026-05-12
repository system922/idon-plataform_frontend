import React, { useState, useEffect, useCallback } from "react";
import ExcelJS from 'exceljs';
import {
  FiBarChart2, FiPackage, FiSearch, FiDownload, FiCalendar,
  FiChevronDown, FiRefreshCw, FiAlertCircle, FiTrendingUp,
  FiDollarSign, FiShoppingCart, FiGrid, FiLoader, FiInfo
} from "react-icons/fi";
import PageTemplate from '../../components/PageTemplate';
import ReportPdfButton from '../../components/ReportPdfButton';
import { useBusinessContext } from '../../admin/config/BusinessContext';
import { fetchWithAuth } from '../../config/apiBase';
import "../../styles/ReportsProductsPage.css";

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

// ─── Modal de filtros avanzados ───────────────────────────────────────────────
function FiltersModal({ open, filters, categories, onApply, onClose, loadingCategories }) {
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  if (!open) return null;

  return (
    <div className="report-modal-overlay" onClick={onClose}>
      <div className="report-modal-box" onClick={e => e.stopPropagation()}>
        <div className="report-modal-header">
          <h2>Filtros avanzados</h2>
          <button type="button" onClick={onClose} className="report-modal-close">×</button>
        </div>
        <div className="report-modal-body">
          <div className="report-filter-group">
            <label>Categoría</label>
            {loadingCategories ? (
              <div className="report-loading-small">Cargando categorías...</div>
            ) : (
              <select
                value={localFilters.category || ''}
                onChange={e => setLocalFilters({ ...localFilters, category: e.target.value || null })}
              >
                <option value="">Todas las categorías</option>
                {categories.map(cat => (
                  <option key={cat.id || cat} value={cat.id || cat}>
                    {cat.name || cat}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="report-filter-group">
            <label>Ordenar por</label>
            <select
              value={localFilters.orderBy || 'quantity'}
              onChange={e => setLocalFilters({ ...localFilters, orderBy: e.target.value })}
            >
              <option value="quantity">Mayor cantidad vendida</option>
              <option value="total">Mayor total vendido</option>
              <option value="name">Nombre (A-Z)</option>
            </select>
          </div>
          <div className="report-filter-group">
            <label>Límite de resultados</label>
            <select
              value={localFilters.limit || 50}
              onChange={e => setLocalFilters({ ...localFilters, limit: Number(e.target.value) })}
            >
              <option value={10}>10 productos</option>
              <option value={25}>25 productos</option>
              <option value={50}>50 productos</option>
              <option value={100}>100 productos</option>
              <option value={9999}>Todos</option>
            </select>
          </div>
        </div>
        <div className="report-modal-footer">
          <button className="report-btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="report-btn-apply" onClick={() => onApply(localFilters)}>Aplicar filtros</button>
        </div>
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

// ─── Página principal ─────────────────────────────────────────────────────────
export default function ReportsProductsPage() {
  const { selectedBusiness } = useBusinessContext();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('month');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [applyingFilters, setApplyingFilters] = useState(false);
  const [dataSource, setDataSource] = useState(null);
  const [stats, setStats] = useState({
    total_productos_vendidos: 0,
    total_ventas: 0,
    productos_distintos: 0,
    ticket_promedio: 0
  });

  // Filtros con valores primitivos para evitar re-renders
  const [filterCategory, setFilterCategory] = useState(null);
  const [filterOrderBy, setFilterOrderBy] = useState('quantity');
  const [filterLimit, setFilterLimit] = useState(50);

  // Opciones de período
  const dateOptions = [
    { value: 'day', label: 'Hoy' },
    { value: 'week', label: 'Esta semana' },
    { value: 'month', label: 'Este mes' },
    { value: 'quarter', label: 'Este trimestre' },
    { value: 'year', label: 'Este año' },
    { value: 'custom', label: 'Personalizado' }
  ];

  // Cargar categorías
  useEffect(() => {
    if (!selectedBusiness?.id) return;
    loadCategories();
  }, [selectedBusiness]);

  const loadCategories = async () => {
    if (loadingCategories) return;
    try {
      setLoadingCategories(true);

      const res = await fetchWithAuth('/api/reports/products/categories');
      
      if (!res.ok) {
        throw new Error(`Error HTTP: ${res.status}`);
      }
      
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

  // Cargar estadísticas
  const loadStats = useCallback(async () => {
    if (!selectedBusiness?.id) return;
    
    try {
      setLoadingStats(true);
      let url = `/api/reports/products-stats?periodo=${dateRange}`;
      
      if (dateRange === 'custom' && customStartDate && customEndDate) {
        url = `/api/reports/products-stats?startDate=${customStartDate}&endDate=${customEndDate}`;
      }
      

      const res = await fetchWithAuth(url);
      
      if (!res.ok) {
        throw new Error(`Error HTTP: ${res.status}`);
      }
      
      const data = await res.json();

      if (data.success && data.data) {
        setStats({
          total_productos_vendidos: data.data.total_productos_vendidos ?? 0,
          total_ventas: data.data.total_ventas ?? 0,
          productos_distintos: data.data.productos_distintos ?? 0,
          ticket_promedio: data.data.ticket_promedio ?? 0
        });
        setDataSource(data.metadata?.invoiceSource ?? null);
      } else {

      }
    } catch (err) {

    } finally {
      setLoadingStats(false);
    }
  }, [selectedBusiness, dateRange, customStartDate, customEndDate]);

  // Cargar reporte de productos
  const loadReport = useCallback(async () => {
    if (!selectedBusiness?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams();
      
      if (dateRange === 'custom' && customStartDate && customEndDate) {
        params.append('startDate', customStartDate);
        params.append('endDate', customEndDate);
      } else {
        params.append('periodo', dateRange);
      }
      
      if (filterCategory) {
        params.append('categoria', filterCategory);
      }
      params.append('order_by', filterOrderBy);
      params.append('limit', String(filterLimit));
      
      const url = `/api/reports/products-sold?${params.toString()}`;

      const res = await fetchWithAuth(url);
      
      if (!res.ok) {
        throw new Error(`Error HTTP: ${res.status}`);
      }
      
      const data = await res.json();

      let productsList = [];
      if (data.success && data.data && Array.isArray(data.data)) {
        productsList = data.data;
      } else if (data.productos && Array.isArray(data.productos)) {
        productsList = data.productos;
      } else if (data.products && Array.isArray(data.products)) {
        productsList = data.products;
      } else if (Array.isArray(data)) {
        productsList = data;
      }
      

      if (productsList.length === 0) {
        const sourceInfo = data.metadata?.invoiceSource || 'unknown';
        if (sourceInfo === 'none') {
          setError('No se encontraron ventas en el sistema. Registra facturas electrónicas u órdenes de POS pagadas para ver datos aquí.');
        } else {
          setError('No hay ventas registradas en este período. Intenta cambiar el rango de fechas.');
        }
      }
      
      const formatted = productsList.map((item, index) => ({
        id: item.id || item.producto_id || item.product_id || `temp-${index}`,
        name: item.nombre_producto || item.nombre || item.producto_nombre || item.name || 'Producto sin nombre',
        sku: item.sku || item.codigo || item.code || '-',
        qty: Number(item.cantidad_vendida || item.cantidad || item.total_qty || 0),
        total: Number(item.total_vendido || item.total_venta || item.monto || item.total || 0),
        category: item.categoria || item.category || 'Sin categoría',
        transactions: item.numero_transacciones || item.transacciones || 0
      }));
      
      setProducts(formatted);
      setDataSource(data.metadata?.invoiceSource ?? null);
    } catch (err) {

      setError('Error al cargar el reporte: ' + (err.message || 'Error desconocido'));
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBusiness, dateRange, customStartDate, customEndDate, filterCategory, filterOrderBy, filterLimit]);

  // Cargar datos al montar o cambiar dependencias
  useEffect(() => {
    if (selectedBusiness?.id) {
      loadStats();
    }
  }, [loadStats]);

  useEffect(() => {
    if (selectedBusiness?.id) {
      loadReport();
    }
  }, [loadReport]);

  // Filtrar por búsqueda local
  useEffect(() => {
    const filtered = products.filter(p =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [search, products]);

  // Refresh manual
  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([loadReport(), loadStats()]);
    } finally {
      setRefreshing(false);
    }
  };

  // Aplicar filtros desde el modal
  const handleApplyFilters = (newFilters) => {
    if (applyingFilters) return;
    setApplyingFilters(true);

    setFilterCategory(newFilters.category);
    setFilterOrderBy(newFilters.orderBy || 'quantity');
    setFilterLimit(newFilters.limit || 50);
    setShowFiltersModal(false);
    setTimeout(() => setApplyingFilters(false), 300);
  };

  // Manejar cambio de período
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

  // Aplicar fechas personalizadas
  const handleApplyCustomDate = (start, end) => {

    setCustomStartDate(start);
    setCustomEndDate(end);
    setShowCustomDate(false);
    setShowDateDropdown(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // EXPORTACIÓN A EXCEL (XLSX)
  // ─────────────────────────────────────────────────────────────────────────
  const handleExportXLSX = async () => {
    if (!filteredProducts.length) return;

    const wb = new ExcelJS.Workbook();
    wb.creator = 'IDON Gestion';
    wb.created = new Date();

    const ws = wb.addWorksheet('Productos', {
      views: [{ showGridLines: false }],
      pageSetup: { paperSize: 9, orientation: 'landscape' },
    });

    ws.columns = [
      { header: 'Producto', key: 'name', width: 35 },
      { header: 'SKU / Código', key: 'sku', width: 20 },
      { header: 'Categoría', key: 'category', width: 20 },
      { header: 'Cantidad vendida', key: 'qty', width: 18 },
      { header: 'Total vendido', key: 'total', width: 18 },
      { header: 'Participación (%)', key: 'percent', width: 18 },
    ];

    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A5F' } };

    const totalSales = filteredProducts.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
    
    filteredProducts.forEach(p => {
      const percent = totalSales > 0 ? ((Number(p.total) || 0) / totalSales) * 100 : 0;
      ws.addRow({
        name: p.name,
        sku: p.sku || '-',
        category: p.category || 'Sin categoría',
        qty: Number(p.qty) || 0,
        total: Number(p.total) || 0,
        percent: percent.toFixed(1) + '%'
      });
    });

    const totalQty = filteredProducts.reduce((s, p) => s + (Number(p.qty) || 0), 0);
    const totalRow = ws.addRow({
      name: 'TOTALES',
      sku: '',
      category: '',
      qty: totalQty,
      total: totalSales,
      percent: '100%'
    });
    totalRow.font = { bold: true };

    ws.getColumn('total').numFmt = '"$"#,##0.00';
    ws.getColumn('qty').numFmt = '#,##0';

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_productos_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // CONFIGURACIÓN PARA PDF
  // ─────────────────────────────────────────────────────────────────────────
  const totalQtyPDF = filteredProducts.reduce((sum, p) => sum + (Number(p.qty) || 0), 0);
  const totalSalesPDF = filteredProducts.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
  const productsCountPDF = filteredProducts.length;

  const pdfConfig = (filteredProducts.length > 0) ? {
    title: 'Reporte de Productos',
    subtitle: `Período: ${dateOptions.find(o => o.value === dateRange)?.label || dateRange} | Origen: ${dataSource === 'einvoicing' ? 'Facturación Electrónica' : dataSource === 'pos' ? 'POS' : 'N/A'}`,
    kpis: [
      { label: 'Total Productos Vendidos', value: stats.total_productos_vendidos || totalQtyPDF },
      { label: 'Total Ventas', value: stats.total_ventas || totalSalesPDF, formatter: (v) => `$${Number(v).toFixed(2)}` },
      { label: 'Ticket Promedio', value: stats.ticket_promedio || (productsCountPDF > 0 ? totalSalesPDF / productsCountPDF : 0), formatter: (v) => `$${Number(v).toFixed(2)}` },
      { label: 'Productos Distintos', value: stats.productos_distintos || productsCountPDF }
    ],
    sections: [{
      title: 'Detalle de Productos',
      columns: [
        { label: 'Producto', key: 'name', width: 35 },
        { label: 'SKU / Código', key: 'sku', width: 20 },
        { label: 'Categoría', key: 'category', width: 20 },
        { label: 'Cantidad vendida', key: 'qty', width: 18 },
        { label: 'Total vendido', key: 'total', width: 18, formatter: (v) => `$${Number(v).toFixed(2)}` },
        { label: 'Participación', key: 'percent', width: 18, formatter: (v) => `${Number(v).toFixed(1)}%` }
      ],
      rows: filteredProducts.map(p => {
        const percent = totalSalesPDF > 0 ? ((Number(p.total) || 0) / totalSalesPDF) * 100 : 0;
        return {
          name: p.name,
          sku: p.sku || '-',
          category: p.category || 'Sin categoría',
          qty: Number(p.qty) || 0,
          total: Number(p.total) || 0,
          percent: percent
        };
      })
    }]
  } : null;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  const headerAction = (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
      {/* Selector de período */}
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

      {/* Buscador */}
      <div className="report-search-wrapper">
        <FiSearch size={16} className="report-search-icon" />
        <input
          type="text"
          placeholder="Buscar producto o SKU..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="report-search-input"
        />
      </div>

      <button onClick={() => setShowFiltersModal(true)} className="report-btn-secondary">
        <FiGrid size={16} /> Filtros
      </button>

      <button onClick={handleExportXLSX} className="report-btn-secondary" disabled={!filteredProducts.length}>
        <FiDownload size={16} /> Excel
      </button>

      <ReportPdfButton
        customConfig={pdfConfig}
        dateRange={{ from: dateRange, to: new Date().toISOString().split('T')[0] }}
        groupBy={null}
        className="report-btn-secondary"
      />

      <button onClick={handleRefresh} className="report-btn-secondary" disabled={refreshing}>
        {refreshing ? <FiLoader size={16} className="spinning" /> : <FiRefreshCw size={16} />}
        {refreshing ? '...' : 'Actualizar'}
      </button>
    </div>
  );

  return (
    <PageTemplate
      title="PRODUCTOS"
      subtitle="Cantidad y ventas por producto"
      theme="business"
      loading={loading}
      headerAction={headerAction}
    >
      {/* Alerta de fuente de datos */}
      {dataSource === 'none' && !loading && (
        <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
          <FiAlertCircle size={16} /> 
          No se detectaron fuentes de datos. El sistema buscará en facturación electrónica y punto de venta.
        </div>
      )}

      {dataSource && dataSource !== 'none' && (
        <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
          <FiInfo size={16} /> 
          Origen de datos: <strong>{dataSource === 'einvoicing' ? 'Facturación Electrónica' : 'Punto de Venta (POS)'}</strong>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <FiAlertCircle size={16} /> {error}
        </div>
      )}

      {/* Tarjetas de resumen */}
      <div className="report-summary-grid">
        <SummaryCard
          title="Total Productos Vendidos"
          value={(stats.total_productos_vendidos ?? 0).toLocaleString()}
          icon={<FiShoppingCart size={24} />}
          color="#A0E7C7"
          loading={loadingStats}
        />
        <SummaryCard
          title="Total Ventas"
          value={`$${(stats.total_ventas ?? 0).toFixed(2)}`}
          icon={<FiDollarSign size={24} />}
          color="#FFD700"
          loading={loadingStats}
        />
        <SummaryCard
          title="Ticket Promedio"
          value={`$${(stats.ticket_promedio ?? 0).toFixed(2)}`}
          icon={<FiTrendingUp size={24} />}
          color="#FFA07A"
          subtitle="Por producto"
          loading={loadingStats}
        />
        <SummaryCard
          title="Productos Distintos"
          value={(stats.productos_distintos ?? 0).toLocaleString()}
          icon={<FiPackage size={24} />}
          color="#87CEEB"
          loading={loadingStats}
        />
      </div>

      {/* Producto destacado */}
      {filteredProducts.length > 0 && (
        <div className="report-top-product">
          <div className="report-top-product-content">
            <FiBarChart2 size={20} />
            <span>Producto más vendido:</span>
            <strong>{filteredProducts[0].name}</strong>
            <span className="report-top-product-qty">{Number(filteredProducts[0].qty) || 0} unidades</span>
            <span className="report-top-product-total">${(Number(filteredProducts[0].total) || 0).toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Tabla de productos */}
      <div className="report-table-container">
        <div className="report-table-wrapper">
          <table className="report-product-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU / Código</th>
                <th>Categoría</th>
                <th className="report-text-right">Cantidad vendida</th>
                <th className="report-text-right">Total vendido</th>
                <th className="report-text-right">% participación</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} className="report-empty-state">
                    <FiBarChart2 size={48} />
                    <span>No hay ventas registradas en este período</span>
                    {dataSource === 'none' && (
                      <span className="report-empty-hint">
                        No se detectaron facturas electrónicas ni órdenes de POS pagadas.
                      </span>
                    )}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product, idx) => {
                  const percentage = totalSalesPDF > 0 ? ((Number(product.total) || 0) / totalSalesPDF) * 100 : 0;
                  return (
                    <tr key={product.id || idx}>
                      <td className="report-product-name">
                        <FiPackage size={14} />
                        {product.name}
                      </td>
                      <td className="report-product-sku">{product.sku || '-'}</td>
                      <td className="report-product-category">{product.category || 'Sin categoría'}</td>
                      <td className="report-text-right report-product-qty">{Number(product.qty).toLocaleString()}</td>
                      <td className="report-text-right report-product-total">${(Number(product.total) || 0).toFixed(2)}</td>
                      <td className="report-text-right report-product-percent">
                        <div className="report-percent-bar">
                          <div className="report-percent-fill" style={{ width: `${Math.min(percentage, 100)}%` }} />
                          <span>{percentage.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredProducts.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={3} className="report-footer-label">Totales</td>
                  <td className="report-text-right report-footer-qty">{totalQtyPDF.toLocaleString()}</td>
                  <td className="report-text-right report-footer-total">${totalSalesPDF.toFixed(2)}</td>
                  <td className="report-text-right report-footer-percent">100%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal de filtros */}
      <FiltersModal
        open={showFiltersModal}
        filters={{ category: filterCategory, orderBy: filterOrderBy, limit: filterLimit }}
        categories={categories}
        loadingCategories={loadingCategories}
        onApply={handleApplyFilters}
        onClose={() => setShowFiltersModal(false)}
      />

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
    </PageTemplate>
  );
}