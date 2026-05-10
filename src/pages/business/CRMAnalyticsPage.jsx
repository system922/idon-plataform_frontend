import { useState, useEffect, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { 
  RefreshCw, TrendingUp, Users, ShoppingBag, DollarSign, 
  Clock, Calendar, Award, Target, PieChart
} from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/CrmAnalytics.css';

export default function CrmAnalytics() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [segments, setSegments] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [salesByHour, setSalesByHour] = useState([]);
  const [salesByDay, setSalesByDay] = useState([]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [clv, setClv] = useState(null);
  const [periodFilter, setPeriodFilter] = useState('all');
  const [error, setError] = useState('');
  const [notification, setNotification] = useState(null);
  const [invoiceSource, setInvoiceSource] = useState(null);

  const showNotification = (msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [
        summaryRes,
        segmentsRes,
        topCustomersRes,
        salesByHourRes,
        salesByDayRes,
        monthlyTrendRes,
        clvRes
      ] = await Promise.all([
        fetchWithAuth('/api/crm/analytics/summary'),
        fetchWithAuth('/api/crm/analytics/customer-segments'),
        fetchWithAuth(`/api/crm/analytics/top-customers?limit=10&period=${periodFilter}`),
        fetchWithAuth('/api/crm/analytics/sales-by-hour'),
        fetchWithAuth('/api/crm/analytics/sales-by-day'),
        fetchWithAuth('/api/crm/analytics/monthly-trend?months=6'),
        fetchWithAuth('/api/crm/analytics/customer-lifetime-value')
      ]);

      const summaryData = await summaryRes.json();
      const segmentsData = await segmentsRes.json();
      const topCustomersData = await topCustomersRes.json();
      const salesByHourData = await salesByHourRes.json();
      const salesByDayData = await salesByDayRes.json();
      const monthlyTrendData = await monthlyTrendRes.json();
      const clvData = await clvRes.json();

      if (summaryData.success) {
        setSummary(summaryData.data);
      }
      if (segmentsData.success && Array.isArray(segmentsData.data)) {
        setSegments(segmentsData.data);
      } else {
        setSegments([]);
      }
      if (topCustomersData.success && Array.isArray(topCustomersData.data)) {
        setTopCustomers(topCustomersData.data);
      } else {
        setTopCustomers([]);
      }
      if (salesByHourData.success && Array.isArray(salesByHourData.data)) {
        setSalesByHour(salesByHourData.data);
      } else {
        setSalesByHour([]);
      }
      if (salesByDayData.success && Array.isArray(salesByDayData.data)) {
        setSalesByDay(salesByDayData.data);
      } else {
        setSalesByDay([]);
      }
      if (monthlyTrendData.success && Array.isArray(monthlyTrendData.data)) {
        setMonthlyTrend(monthlyTrendData.data);
      } else {
        setMonthlyTrend([]);
      }
      if (clvData.success) {
        setClv(clvData.data);
      }

      if (summaryData.metadata) {
        setInvoiceSource(summaryData.metadata.invoiceSource);
      }

    } catch (err) {
      console.error('Error cargando datos:', err);
      setError(err.message);
      showNotification('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [periodFilter]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAllData();
    showNotification('Actualizando datos...', 'info');
  };

  // Calcular máximos para las barras (con validación)
  const maxHourSales = salesByHour.length > 0 
    ? Math.max(...salesByHour.map(h => Number(h.total_sales) || 0), 0) 
    : 0;
  const maxDaySales = salesByDay.length > 0 
    ? Math.max(...salesByDay.map(d => Number(d.total_sales) || 0), 0) 
    : 0;
  const maxMonthSales = monthlyTrend.length > 0 
    ? Math.max(...monthlyTrend.map(m => Number(m.total_sales) || 0), 0) 
    : 0;

  const formatCurrency = (value) => {
    const num = Number(value) || 0;
    return new Intl.NumberFormat('es-EC', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };
  
  const formatNumber = (value) => {
    const num = Number(value) || 0;
    return num.toLocaleString('es-EC');
  };

  const segmentColors = {
    vip: { bg: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', icon: '👑' },
    frecuente: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', icon: '⭐' },
    ocasional: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', icon: '🔄' },
    nuevo: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', icon: '🆕' }
  };

  const segmentNames = {
    vip: 'VIP',
    frecuente: 'Frecuente',
    ocasional: 'Ocasional',
    nuevo: 'Nuevo'
  };

  // Orden de segmentos para mostrar
  const segmentOrder = ['vip', 'frecuente', 'ocasional', 'nuevo'];
  
  // Ordenar segmentos según el orden deseado
  const sortedSegments = [...segments].sort((a, b) => {
    return segmentOrder.indexOf(a.segment) - segmentOrder.indexOf(b.segment);
  });

  return (
    <PageTemplate
      title="Analítica de Clientes"
      subtitle="Comportamiento y tendencias de tus clientes"
      loading={loading}
      error={error}
      onRetry={loadAllData}
      headerAction={
        <div className="header-actions">
          {invoiceSource && (
            <div className="invoice-source-badge-analytics">
              {invoiceSource === 'einvoicing' ? '📄 Fact. Electrónica' : '🛒 Ventas POS'}
            </div>
          )}
          <button className="btn-refresh-analytics" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
            Actualizar
          </button>
        </div>
      }
    >
      {notification && (
        <div className={`crm-analytics-notification ${notification.type}`}>
          {notification.msg}
        </div>
      )}

      {/* Tarjetas de resumen */}
      {summary && (
        <div className="analytics-summary-grid">
          <div className="summary-card">
            <div className="summary-icon total">
              <Users size={24} />
            </div>
            <div className="summary-info">
              <span className="summary-value">{formatNumber(summary.total_customers)}</span>
              <span className="summary-label">Total Clientes</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon active">
              <Users size={24} />
            </div>
            <div className="summary-info">
              <span className="summary-value">{formatNumber(summary.active_customers)}</span>
              <span className="summary-label">Clientes Activos</span>
              <span className="summary-sub">{formatNumber(summary.customers_last_30d)} últimos 30 días</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon revenue">
              <DollarSign size={24} />
            </div>
            <div className="summary-info">
              <span className="summary-value">{formatCurrency(summary.total_revenue)}</span>
              <span className="summary-label">Ingresos Totales</span>
              <span className="summary-sub">{formatNumber(summary.total_orders)} órdenes</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon ticket">
              <ShoppingBag size={24} />
            </div>
            <div className="summary-info">
              <span className="summary-value">{formatCurrency(summary.avg_ticket)}</span>
              <span className="summary-label">Ticket Promedio</span>
            </div>
          </div>
        </div>
      )}

      {/* Segmentación de clientes */}
      {sortedSegments.length > 0 && (
        <div className="analytics-section">
          <div className="section-header">
            <h3><PieChart size={18} /> Segmentación de Clientes</h3>
            <p>Distribución por comportamiento de compra</p>
          </div>
          <div className="segments-grid">
            {sortedSegments.map((segment, index) => {
              const config = segmentColors[segment.segment] || segmentColors.ocasional;
              const total = sortedSegments.reduce((sum, s) => sum + (Number(s.count) || 0), 0);
              const percentage = total > 0 ? ((Number(segment.count) / total) * 100).toFixed(1) : 0;
              const avgSpent = Number(segment.avg_spent) || 0;
              const avgOrders = Number(segment.avg_orders) || 0;
              
              return (
                <div key={`segment-${segment.segment}-${index}`} className="segment-card">
                  <div className="segment-header" style={{ background: config.bg }}>
                    <span className="segment-icon">{config.icon}</span>
                    <span className="segment-name" style={{ color: config.color }}>
                      {segmentNames[segment.segment] || segment.segment}
                    </span>
                  </div>
                  <div className="segment-body">
                    <div className="segment-stat">
                      <span className="stat-value">{formatNumber(segment.count)}</span>
                      <span className="stat-label">clientes</span>
                    </div>
                    <div className="segment-stat">
                      <span className="stat-value">{formatCurrency(avgSpent)}</span>
                      <span className="stat-label">gasto promedio</span>
                    </div>
                    <div className="segment-stat">
                      <span className="stat-value">{Math.round(avgOrders)}</span>
                      <span className="stat-label">órdenes promedio</span>
                    </div>
                    <div className="segment-progress">
                      <div className="progress-bar" style={{ width: `${percentage}%`, background: config.color }} />
                      <span className="progress-label">{percentage}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top clientes y CLV */}
      <div className="analytics-two-columns">
        {/* Top clientes */}
        <div className="analytics-section half">
          <div className="section-header">
            <h3><Award size={18} /> Top Clientes</h3>
            <div className="period-filter">
              <select value={periodFilter} onChange={e => setPeriodFilter(e.target.value)}>
                <option value="all">Todo el período</option>
                <option value="month">Último mes</option>
                <option value="week">Última semana</option>
              </select>
            </div>
          </div>
          <div className="top-customers-list">
            {topCustomers.length === 0 ? (
              <div className="empty-state">
                <ShoppingBag size={32} />
                <p>No hay datos de clientes</p>
                <span>Realiza ventas para ver el top de clientes</span>
              </div>
            ) : (
              topCustomers.map((customer, idx) => (
                <div key={customer.id || `customer-${idx}`} className="top-customer-item">
                  <div className="customer-rank">#{idx + 1}</div>
                  <div className="customer-avatar">
                    {customer.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="customer-info">
                    <div className="customer-name">{customer.name || 'Cliente'}</div>
                    <div className="customer-email">{customer.email || 'Sin email'}</div>
                    <div className="customer-document">{customer.document_number || 'Sin documento'}</div>
                  </div>
                  <div className="customer-stats">
                    <div className="stat">
                      <span className="stat-value">{formatNumber(customer.total_orders)}</span>
                      <span className="stat-label">órdenes</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">{formatCurrency(customer.total_spent)}</span>
                      <span className="stat-label">gastado</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">{formatCurrency(customer.avg_ticket)}</span>
                      <span className="stat-label">promedio</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CLV - Customer Lifetime Value */}
        {clv && (
          <div className="analytics-section half">
            <div className="section-header">
              <h3><Target size={18} /> Valor de Vida del Cliente (CLV)</h3>
              <p>Métrica clave de negocio</p>
            </div>
            <div className="clv-cards">
              <div className="clv-card">
                <span className="clv-value">{formatCurrency(clv.avg_clv)}</span>
                <span className="clv-label">CLV Promedio</span>
              </div>
              <div className="clv-card">
                <span className="clv-value">{formatCurrency(clv.median_clv)}</span>
                <span className="clv-label">CLV Mediana</span>
              </div>
              <div className="clv-card">
                <span className="clv-value">{formatCurrency(clv.max_clv)}</span>
                <span className="clv-label">CLV Máximo</span>
              </div>
              <div className="clv-card">
                <span className="clv-value">{formatCurrency(clv.avg_projected_annual)}</span>
                <span className="clv-label">Valor Anual Proyectado</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ventas por hora y día */}
      <div className="analytics-two-columns">
        {/* Ventas por hora */}
        <div className="analytics-section half">
          <div className="section-header">
            <h3><Clock size={18} /> Ventas por Hora</h3>
            <p>Horario de mayor actividad</p>
          </div>
          <div className="chart-bars hour-bars">
            {salesByHour.length === 0 ? (
              <div className="empty-chart">No hay datos de ventas por hora</div>
            ) : (
              salesByHour.map((hour, idx) => (
                <div key={`hour-${hour.hour}-${idx}`} className="bar-item">
                  <div className="bar-label">{String(hour.hour).padStart(2, '0')}:00</div>
                  <div className="bar-container">
                    <div 
                      className="bar-fill" 
                      style={{ 
                        width: maxHourSales > 0 ? `${(Number(hour.total_sales) / maxHourSales) * 100}%` : '0%',
                        background: 'linear-gradient(90deg, #6842fe, #8b5cf6)'
                      }}
                    />
                  </div>
                  <div className="bar-value">{formatCurrency(hour.total_sales)}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Ventas por día */}
        <div className="analytics-section half">
          <div className="section-header">
            <h3><Calendar size={18} /> Ventas por Día</h3>
            <p>Días de mayor facturación</p>
          </div>
          <div className="chart-bars day-bars">
            {salesByDay.length === 0 ? (
              <div className="empty-chart">No hay datos de ventas por día</div>
            ) : (
              salesByDay.map((day, idx) => (
                <div key={`day-${day.day_of_week}-${idx}`} className="bar-item">
                  <div className="bar-label">{day.day_name?.substring(0, 3) || '-'}</div>
                  <div className="bar-container">
                    <div 
                      className="bar-fill" 
                      style={{ 
                        width: maxDaySales > 0 ? `${(Number(day.total_sales) / maxDaySales) * 100}%` : '0%',
                        background: 'linear-gradient(90deg, #10b981, #34d399)'
                      }}
                    />
                  </div>
                  <div className="bar-value">{formatCurrency(day.total_sales)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Tendencia mensual */}
      {monthlyTrend.length > 0 && (
        <div className="analytics-section">
          <div className="section-header">
            <h3><TrendingUp size={18} /> Tendencia Mensual</h3>
            <p>Evolución de ventas y clientes</p>
          </div>
          <div className="monthly-trend">
            <div className="trend-chart">
              {monthlyTrend.map((month, idx) => (
                <div key={month.month_key || `month-${idx}`} className="trend-bar-item">
                  <div className="trend-label">
                    {month.month_key ? month.month_key.substring(5, 7) : '-'}/{month.year || '-'}
                  </div>
                  <div className="trend-bars">
                    <div 
                      className="trend-bar sales-bar" 
                      style={{ 
                        height: maxMonthSales > 0 ? `${(Number(month.total_sales) / maxMonthSales) * 100}%` : '0%',
                      }}
                      title={`Ventas: ${formatCurrency(month.total_sales)}`}
                    />
                    <div 
                      className="trend-bar customers-bar" 
                      style={{ 
                        height: maxMonthSales > 0 ? `${(Number(month.unique_customers) / maxMonthSales) * 100}%` : '0%',
                      }}
                      title={`Clientes: ${formatNumber(month.unique_customers)}`}
                    />
                  </div>
                  <div className="trend-values">
                    <span className="sales">{formatCurrency(month.total_sales)}</span>
                    <span className="customers">{formatNumber(month.unique_customers)} clientes</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="trend-legend">
              <span><div className="legend-color sales"></div> Ventas</span>
              <span><div className="legend-color customers"></div> Clientes únicos</span>
            </div>
          </div>
        </div>
      )}
    </PageTemplate>
  );
}