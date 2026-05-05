import React, { useState, useEffect, useCallback } from "react";
import {
  FiBarChart2, FiPackage, FiSearch, FiDownload, FiCalendar,
  FiChevronDown, FiRefreshCw, FiAlertCircle, FiTrendingUp,
  FiDollarSign, FiShoppingCart, FiGrid
} from "react-icons/fi";
import PageTemplate from '../../components/PageTemplate';
import { useBusinessContext } from '../../admin/config/BusinessContext';
import { fetchWithAuth } from '../../config/apiBase';
import "../../styles/ReportsProductsPage.css";

// ─── Componente de tarjeta de resumen ─────────────────────────────────────────
function SummaryCard({ title, value, icon, color, subtitle }) {
  return (
    <div className="report-product-card">
      <div className="report-product-card-icon" style={{ color }}>
        {icon}
      </div>
      <div className="report-product-card-content">
        <div className="report-product-card-title">{title}</div>
        <div className="report-product-card-value">{value}</div>
        {subtitle && <div className="report-product-card-subtitle">{subtitle}</div>}
      </div>
    </div>
  );
}

// ─── Modal de filtros avanzados ───────────────────────────────────────────────
function FiltersModal({ open, filters, categories, onApply, onClose }) {
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
          <button type="button" onClick={onClose} className="report-modal-close">
            ×
          </button>
        </div>

        <div className="report-modal-body">
          <div className="report-filter-group">
            <label>Categoría</label>
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
          <button className="report-btn-cancel" onClick={onClose}>
            Cancelar
          </button>
          <button className="report-btn-apply" onClick={() => onApply(localFilters)}>
            Aplicar filtros
          </button>
        </div>
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
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    category: null,
    orderBy: 'quantity',
    limit: 50
  });

  // Opciones de período
  const dateOptions = [
    { value: 'day', label: 'Hoy' },
    { value: 'week', label: 'Esta semana' },
    { value: 'month', label: 'Este mes' },
    { value: 'quarter', label: 'Este trimestre' },
    { value: 'year', label: 'Este año' }
  ];

  // Cargar categorías
  useEffect(() => {
    if (!selectedBusiness?.id) return;
    loadCategories();
  }, [selectedBusiness]);

  const loadCategories = async () => {
    try {
      const res = await fetchWithAuth('/api/reports/products/categories');
      const data = await res.json();
      setCategories(Array.isArray(data.data) ? data.data : data.categories || []);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  // Cargar reporte de productos
  const loadReport = useCallback(async () => {
    if (!selectedBusiness?.id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams({
        periodo: dateRange,
        ...(filters.category && { categoria: filters.category }),
        order_by: filters.orderBy,
        limit: filters.limit
      });
      
      const res = await fetchWithAuth(`/api/reports/products-sold?${params}`);
      const data = await res.json();
      
      const productsList = Array.isArray(data.data) 
        ? data.data 
        : data.productos || data.products || [];
      
      const formatted = productsList.map(item => ({
        id: item.id || item.producto_id,
        name: item.nombre || item.producto_nombre || item.name,
        sku: item.sku || item.codigo,
        qty: item.cantidad_vendida || item.total_qty || item.cantidad || 0,
        total: item.total_vendido || item.total_venta || item.monto || 0,
        category: item.categoria || 'Sin categoría'
      }));
      
      setProducts(formatted);
    } catch (err) {
      console.error('Error loading report:', err);
      setError('Error al cargar el reporte');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBusiness, dateRange, filters]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Filtrar por búsqueda
  useEffect(() => {
    const filtered = products.filter(p =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [search, products]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReport();
    setRefreshing(false);
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        periodo: dateRange,
        format: 'csv',
        ...(filters.category && { categoria: filters.category })
      });
      
      const res = await fetchWithAuth(`/api/reports/products-sold/export?${params}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reporte_productos_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting:', err);
      setError('Error al exportar el reporte');
    }
  };

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
  };

  // Calcular totales
  const totalQuantity = filteredProducts.reduce((sum, p) => sum + (Number(p.qty)   || 0), 0);
  const totalSales    = filteredProducts.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
  const averageTicket = filteredProducts.length > 0 ? totalSales / filteredProducts.length : 0;
  const topProduct = filteredProducts.length > 0 ? filteredProducts[0] : null;

  // Botones para headerAction
  const refreshButton = (
    <button 
      onClick={handleRefresh} 
      className="report-refresh-btn-header"
      disabled={refreshing}
      title="Actualizar datos"
    >
      <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} /> 
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  const exportButton = (
    <button onClick={handleExport} className="report-btn-secondary">
      <FiDownload size={16} /> Exportar
    </button>
  );

  const filtersButton = (
    <button onClick={() => setShowFiltersModal(true)} className="report-btn-secondary">
      <FiGrid size={16} /> Filtros
    </button>
  );

  return (
    <PageTemplate
      title="PRODUCTOS"
      subtitle="Cantidad y ventas por producto"
      theme="business"
      loading={loading}
      headerAction={
        <div className="report-header-actions">
          {/* Selector de período */}
          <div className="report-dropdown">
            <button 
              onClick={() => setShowDateDropdown(!showDateDropdown)} 
              className="report-date-btn"
            >
              <FiCalendar size={16} />
              {dateOptions.find(o => o.value === dateRange)?.label || 'Este mes'}
              <FiChevronDown size={14} />
            </button>
            {showDateDropdown && (
              <div className="report-dropdown-menu">
                {dateOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setDateRange(option.value);
                      setShowDateDropdown(false);
                    }}
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

          {filtersButton}
          {exportButton}
          {refreshButton}
        </div>
      }
    >
      {error && (
        <div className="alert alert-error">
          <FiAlertCircle size={16} /> {error}
        </div>
      )}

      {/* Tarjetas de resumen */}
      <div className="report-summary-grid">
        <SummaryCard
          title="Total Productos Vendidos"
          value={totalQuantity.toLocaleString()}
          icon={<FiShoppingCart size={24} />}
          color="#A0E7C7"
        />
        <SummaryCard
          title="Total Ventas"
          value={`$${totalSales.toFixed(2)}`}
          icon={<FiDollarSign size={24} />}
          color="#FFD700"
        />
        <SummaryCard
          title="Ticket Promedio"
          value={`$${averageTicket.toFixed(2)}`}
          icon={<FiTrendingUp size={24} />}
          color="#FFA07A"
          subtitle="Por producto"
        />
        <SummaryCard
          title="Productos Distintos"
          value={filteredProducts.length.toLocaleString()}
          icon={<FiPackage size={24} />}
          color="#87CEEB"
        />
      </div>

      {/* Producto destacado */}
      {topProduct && (
        <div className="report-top-product">
          <div className="report-top-product-content">
            <FiBarChart2 size={20} />
            <span>Producto más vendido:</span>
            <strong>{topProduct.name}</strong>
            <span className="report-top-product-qty">{Number(topProduct.qty) || 0} unidades</span>
            <span className="report-top-product-total">${(Number(topProduct.total) || 0).toFixed(2)}</span>
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
                <th className="report-text-right">Cantidad vendida</th>
                <th className="report-text-right">Total vendido</th>
                <th className="report-text-right">% participación</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} className="report-empty-state">
                    <FiBarChart2 size={48} />
                    <span>No hay ventas registradas en este período</span>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product, idx) => {
                  const percentage = totalSales > 0 ? ((Number(product.total) || 0) / totalSales) * 100 : 0;
                  return (
                    <tr key={product.id}>
                      <td className="report-product-name">
                        <FiPackage size={14} />
                        {product.name}
                      </td>
                      <td className="report-product-sku">{product.sku}</td>
                      <td className="report-text-right report-product-qty">{product.qty}</td>
                      <td className="report-text-right report-product-total">${(Number(product.total) || 0).toFixed(2)}</td>
                      <td className="report-text-right report-product-percent">
                        <div className="report-percent-bar">
                          <div 
                            className="report-percent-fill" 
                            style={{ width: `${percentage}%` }}
                          />
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
                  <td colSpan={2} className="report-footer-label">Totales</td>
                  <td className="report-text-right report-footer-qty">{totalQuantity}</td>
                  <td className="report-text-right report-footer-total">${totalSales.toFixed(2)}</td>
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
        filters={filters}
        categories={categories}
        onApply={handleApplyFilters}
        onClose={() => setShowFiltersModal(false)}
      />
    </PageTemplate>
  );
}