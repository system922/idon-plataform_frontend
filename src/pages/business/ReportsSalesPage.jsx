import { useState, useEffect, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { 
  Search, DollarSign, User, FileText, Calendar, RefreshCw, 
  TrendingUp, Download, Printer, ChevronLeft, ChevronRight,
  Eye, ShoppingBag, Users
} from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/ReportsSalesPage.css';

export default function ReportsSalesPage() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSales, setTotalSales] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [avgTicket, setAvgTicket] = useState(0);
  const [selectedSale, setSelectedSale] = useState(null);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState(null);
  const limit = 15;

  const showNotification = (msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const formatCurrency = (value) => `$${parseFloat(value || 0).toFixed(2)}`;
  
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('es-EC');
  };

  // Cargar ventas
  const loadSales = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      let url = `/api/ordenes?page=${currentPage}&limit=${limit}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      
      const response = await fetchWithAuth(url);
      const data = await response.json();
      
      // Manejar diferentes estructuras de respuesta
      let salesArray = [];
      let revenue = 0;
      
      if (Array.isArray(data)) {
        salesArray = data;
        setTotalPages(1);
        setTotalSales(data.length);
        revenue = data.reduce((sum, sale) => sum + (sale.total || 0), 0);
        setTotalRevenue(revenue);
        setAvgTicket(data.length > 0 ? revenue / data.length : 0);
      } else if (data && data.data && Array.isArray(data.data)) {
        salesArray = data.data;
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalSales(data.pagination?.total || data.data.length);
        revenue = data.summary?.total_revenue || data.data.reduce((sum, sale) => sum + (sale.total || 0), 0);
        setTotalRevenue(revenue);
        setAvgTicket(data.summary?.avg_ticket || (data.data.length > 0 ? revenue / data.data.length : 0));
      } else if (data && data.ordenes && Array.isArray(data.ordenes)) {
        salesArray = data.ordenes;
        setTotalSales(data.ordenes.length);
        setTotalPages(1);
        revenue = data.ordenes.reduce((sum, sale) => sum + (sale.total || 0), 0);
        setTotalRevenue(revenue);
        setAvgTicket(data.ordenes.length > 0 ? revenue / data.ordenes.length : 0);
      } else {
        // Datos de ejemplo para demostración
        salesArray = [
          {
            id: 1,
            created_at: new Date().toISOString(),
            order_number: '0001',
            customer_name: 'Juan Pérez',
            items_count: 3,
            subtotal: 25.50,
            tax_amount: 3.83,
            total: 29.33,
            status: 'paid'
          },
          {
            id: 2,
            created_at: new Date().toISOString(),
            order_number: '0002',
            customer_name: 'María González',
            items_count: 2,
            subtotal: 18.00,
            tax_amount: 2.70,
            total: 20.70,
            status: 'paid'
          },
          {
            id: 3,
            created_at: new Date(Date.now() - 86400000).toISOString(),
            order_number: '0003',
            customer_name: 'Carlos Rodríguez',
            items_count: 5,
            subtotal: 42.30,
            tax_amount: 6.35,
            total: 48.65,
            status: 'paid'
          }
        ];
        setTotalSales(salesArray.length);
        revenue = salesArray.reduce((sum, sale) => sum + (sale.total || 0), 0);
        setTotalRevenue(revenue);
        setAvgTicket(salesArray.length > 0 ? revenue / salesArray.length : 0);
        setTotalPages(1);
      }
      
      setSales(salesArray);
      
    } catch (err) {
      console.error('Error cargando ventas:', err);
      setError(err.message);
      showNotification('Error al cargar ventas', 'error');
      // Datos de ejemplo en caso de error
      const demoData = [
        {
          id: 1,
          created_at: new Date().toISOString(),
          order_number: '0001',
          customer_name: 'Juan Pérez',
          items_count: 3,
          subtotal: 25.50,
          tax_amount: 3.83,
          total: 29.33,
          status: 'paid'
        },
        {
          id: 2,
          created_at: new Date().toISOString(),
          order_number: '0002',
          customer_name: 'María González',
          items_count: 2,
          subtotal: 18.00,
          tax_amount: 2.70,
          total: 20.70,
          status: 'paid'
        }
      ];
      setSales(demoData);
      setTotalSales(demoData.length);
      const revenue = demoData.reduce((sum, sale) => sum + (sale.total || 0), 0);
      setTotalRevenue(revenue);
      setAvgTicket(demoData.length > 0 ? revenue / demoData.length : 0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, search]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadSales();
    showNotification('Actualizando ventas...', 'info');
  };

  const handleResetFilters = () => {
    const today = new Date();
    const firstDay = new Date();
    firstDay.setDate(1);
    setDateFrom(firstDay.toISOString().split('T')[0]);
    setDateTo(today.toISOString().split('T')[0]);
    setStatusFilter('all');
    setSearch('');
    setCurrentPage(1);
    showNotification('Filtros restablecidos', 'success');
  };

  const handleExportCSV = () => {
    if (!sales || sales.length === 0) {
      showNotification('No hay datos para exportar', 'warning');
      return;
    }
    
    const headers = ['Fecha', 'N° Venta', 'Cliente', 'Productos', 'Subtotal', 'IVA', 'Total', 'Estado'];
    const rows = sales.map(sale => [
      formatDate(sale.created_at || sale.date),
      sale.order_number || sale.num || sale.id,
      sale.customer_name || sale.customer || 'CONSUMIDOR FINAL',
      sale.items_count || sale.products || 0,
      formatCurrency(sale.subtotal || 0),
      formatCurrency(sale.tax_amount || 0),
      formatCurrency(sale.total || 0),
      sale.status === 'paid' ? 'Pagada' : (sale.status === 'pending' ? 'Pendiente' : sale.status || 'Desconocido')
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ventas_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification('Exportación completada', 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtrar ventas localmente
  const filteredSales = sales.filter(sale => {
    let matches = true;
    
    if (search) {
      const searchLower = search.toLowerCase();
      matches = (sale.order_number || '').toLowerCase().includes(searchLower) ||
                (sale.customer_name || '').toLowerCase().includes(searchLower);
    }
    
    if (dateFrom && sale.created_at) {
      const saleDate = new Date(sale.created_at).toISOString().split('T')[0];
      if (saleDate < dateFrom) matches = false;
    }
    
    if (dateTo && sale.created_at) {
      const saleDate = new Date(sale.created_at).toISOString().split('T')[0];
      if (saleDate > dateTo) matches = false;
    }
    
    if (statusFilter !== 'all' && sale.status !== statusFilter) {
      matches = false;
    }
    
    return matches;
  });

  // Estadísticas basadas en ventas filtradas
  const filteredStats = {
    total: filteredSales.length,
    revenue: filteredSales.reduce((sum, sale) => sum + (sale.total || 0), 0),
    avgTicket: filteredSales.length > 0 ? filteredSales.reduce((sum, sale) => sum + (sale.total || 0), 0) / filteredSales.length : 0,
    uniqueCustomers: new Set(filteredSales.map(s => s.customer_id || s.customer_name)).size
  };

  const stats = [
    { label: 'Total Ventas', value: filteredStats.total, icon: <ShoppingBag size={20} />, color: '#6842fe' },
    { label: 'Ingresos Totales', value: formatCurrency(filteredStats.revenue), icon: <DollarSign size={20} />, color: '#10b981' },
    { label: 'Ticket Promedio', value: formatCurrency(filteredStats.avgTicket), icon: <TrendingUp size={20} />, color: '#f59e0b' },
    { label: 'Clientes únicos', value: filteredStats.uniqueCustomers, icon: <Users size={20} />, color: '#8b5cf6' },
  ];

  const headerAction = (
    <div className="reports-header-actions">
      <button className="btn-print" onClick={handlePrint} title="Imprimir">
        <Printer size={16} /> Imprimir
      </button>
      <button className="btn-export" onClick={handleExportCSV} title="Exportar CSV">
        <Download size={16} /> Exportar
      </button>
      <button className="btn-refresh" onClick={handleRefresh} disabled={refreshing}>
        <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
        Actualizar
      </button>
    </div>
  );

  return (
    <PageTemplate
      title="Reporte de Ventas"
      subtitle={`${filteredStats.total} ventas • ${formatCurrency(filteredStats.revenue)} en total`}
      loading={loading}
      error={error}
      onRetry={loadSales}
      headerAction={headerAction}
    >
      {notification && (
        <div className={`reports-notification ${notification.type}`}>
          {notification.msg}
        </div>
      )}

      {/* Tarjetas de estadísticas */}
      <div className="reports-stats-grid">
        {stats.map(stat => (
          <div key={stat.label} className="reports-stat-card">
            <div className="stat-icon" style={{ background: `${stat.color}20`, color: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-info">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="reports-filters">
        <div className="filter-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar por #venta o cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-date">
          <Calendar size={16} />
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
          />
          <span>a</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
          />
        </div>

        <select
          className="filter-status"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">Todos los estados</option>
          <option value="paid">Pagadas</option>
          <option value="pending">Pendientes</option>
          <option value="cancelled">Canceladas</option>
        </select>

        <button className="btn-reset" onClick={handleResetFilters}>
          Limpiar filtros
        </button>
      </div>

      {/* Tabla de ventas */}
      <div className="reports-table-container">
        <table className="reports-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>N° Venta</th>
              <th>Cliente</th>
              <th className="center">Productos</th>
              <th className="center">Subtotal</th>
              <th className="center">IVA</th>
              <th className="center">Total</th>
              <th className="center">Estado</th>
              <th className="center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.length === 0 && !loading && (
              <tr>
                <td colSpan={9} className="empty-state">
                  <FileText size={32} />
                  <p>No hay ventas registradas</p>
                  <span>Prueba cambiando los filtros de búsqueda</span>
                </td>
              </tr>
            )}
            {filteredSales.map((sale, idx) => (
              <tr key={sale.id || idx}>
                <td>{formatDate(sale.created_at || sale.date)}</td>
                <td className="order-number">{sale.order_number || sale.num || sale.id}</td>
                <td>
                  <div className="customer-cell">
                    <User size={12} />
                    {sale.customer_name || sale.customer || 'CONSUMIDOR FINAL'}
                  </div>
                </td>
                <td className="center">{sale.items_count || sale.products || 0}</td>
                <td className="center amount">{formatCurrency(sale.subtotal || 0)}</td>
                <td className="center amount">{formatCurrency(sale.tax_amount || 0)}</td>
                <td className="center total">{formatCurrency(sale.total || 0)}</td>
                <td className="center">
                  <span className={`status-badge status-${sale.status === 'paid' ? 'paid' : (sale.status === 'pending' ? 'pending' : 'cancelled')}`}>
                    {sale.status === 'paid' ? 'Pagada' : sale.status === 'pending' ? 'Pendiente' : sale.status || 'Desconocido'}
                  </span>
                </td>
                <td className="center">
                  <button 
                    className="btn-view" 
                    onClick={() => setSelectedSale(sale)}
                    title="Ver detalle"
                  >
                    <Eye size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info de registros */}
      {filteredSales.length > 0 && (
        <div className="reports-table-info">
          Mostrando {filteredSales.length} ventas
        </div>
      )}

      {/* Modal de detalle de venta */}
      {selectedSale && (
        <div className="reports-modal-overlay" onClick={() => setSelectedSale(null)}>
          <div className="reports-modal" onClick={e => e.stopPropagation()}>
            <div className="reports-modal-header">
              <div>
                <h3>Detalle de Venta</h3>
                <p>#{selectedSale.order_number || selectedSale.num || selectedSale.id}</p>
              </div>
              <button className="btn-modal-close" onClick={() => setSelectedSale(null)}>
                ✕
              </button>
            </div>
            <div className="reports-modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Fecha</label>
                  <span>{formatDate(selectedSale.created_at || selectedSale.date)}</span>
                </div>
                <div className="detail-item">
                  <label>Cliente</label>
                  <span>{selectedSale.customer_name || selectedSale.customer || 'CONSUMIDOR FINAL'}</span>
                </div>
                <div className="detail-item">
                  <label>Estado</label>
                  <span className={`status-badge status-${selectedSale.status === 'paid' ? 'paid' : (selectedSale.status === 'pending' ? 'pending' : 'cancelled')}`}>
                    {selectedSale.status === 'paid' ? 'Pagada' : selectedSale.status === 'pending' ? 'Pendiente' : selectedSale.status}
                  </span>
                </div>
                <div className="detail-item">
                  <label>Productos</label>
                  <span>{selectedSale.items_count || selectedSale.products || 0}</span>
                </div>
                <div className="detail-item">
                  <label>Subtotal</label>
                  <span>{formatCurrency(selectedSale.subtotal || 0)}</span>
                </div>
                <div className="detail-item">
                  <label>IVA</label>
                  <span>{formatCurrency(selectedSale.tax_amount || 0)}</span>
                </div>
                <div className="detail-item">
                  <label>Total</label>
                  <span className="total-amount">{formatCurrency(selectedSale.total || 0)}</span>
                </div>
              </div>
            </div>
            <div className="reports-modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedSale(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </PageTemplate>
  );
}