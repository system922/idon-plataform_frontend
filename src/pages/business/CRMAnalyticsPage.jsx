// src/pages/business/CrmAnalytics.jsx
import { useState, useEffect, useCallback } from 'react';
import { useSession } from '../../context/SessionContext'; 
import PageTemplate from '../../components/PageTemplate';
import {
  TrendingUp, CheckCircle, AlertCircle, Info, X, Layout,
  Users as UsersIcon,
  PieChart as PieChartIcon,
  Award as AwardIcon
} from 'react-feather';
import { FiRefreshCw } from 'react-icons/fi';
import { fetchWithAuth } from '../../config/api';
import '../../styles/CrmAnalytics.css';

// ── IMPORTAR COMPONENTES DE TABS ──
import TabResumen from '../../components/General/Tabs/TabResumen';
import TabVentas from '../../components/General/Tabs/TabVentas';
import TabClientes from '../../components/General/Tabs/TabClientes';
import TabSegmentacion from '../../components/General/Tabs/TabSegmentacion';
import TabRanking from '../../components/General/Tabs/TabRanking';

// ── CONFIGURACIÓN ──
const ECUADOR_TIMEZONE = 'America/Guayaquil';

const COLORS = {
  primary: 'var(--primary)',
  primaryLight: '#8b5cf6',
  primaryDark: '#4f2dbd',
  success: '#10b981',
  successLight: '#34d399',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  purple: '#8b5cf6',
  pink: '#ec4899',
  gray: '#6b7280',
  grayLight: '#9ca3af',
  grayDark: '#4b5563'
};

// ── UTILIDADES ──
export const formatUtils = {
  currency: (value) => {
    const num = Number(value) || 0;
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  },

  number: (value) => {
    const num = Number(value) || 0;
    return num.toLocaleString('es-EC');
  },

  compactNumber: (value) => {
    const num = Number(value) || 0;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  },

  percentage: (value, total) => {
    if (!total || total === 0) return '0%';
    return ((Number(value) / total) * 100).toFixed(1) + '%';
  },

  date: (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-EC', {
        timeZone: ECUADOR_TIMEZONE,
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '-';
    }
  },

  monthName: (monthNumber) => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return months[parseInt(monthNumber) - 1] || monthNumber;
  },

  dayName: (dayName) => {
    const days = {
      Monday: 'Lun',
      Tuesday: 'Mar',
      Wednesday: 'Mié',
      Thursday: 'Jue',
      Friday: 'Vie',
      Saturday: 'Sáb',
      Sunday: 'Dom'
    };
    return days[dayName] || dayName?.substring(0, 3) || '-';
  }
};

// ─── SKELETON ──────────────────────────────────────────────────────────────────

const CrmAnalyticsSkeleton = () => (
  <div className="crm-analytics-container">
    {/* Skeleton para Tabs */}
    <div className="crm-tabs-skeleton">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="skeleton-tab">
          <div className="skeleton-line" style={{ width: '16px', height: '16px', borderRadius: '50%' }} />
          <div className="skeleton-line" style={{ width: '60px' }} />
        </div>
      ))}
    </div>

    {/* Skeleton para contenido */}
    <div className="tab-content-skeleton">
      {/* Stats cards */}
      <div className="skeleton-stats-grid">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton-stat-card">
            <div className="skeleton-line" style={{ width: '40%' }} />
            <div className="skeleton-line skeleton-number" style={{ width: '60%', height: '32px' }} />
            <div className="skeleton-line" style={{ width: '30%' }} />
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="skeleton-charts-grid">
        <div className="skeleton-chart-card">
          <div className="skeleton-line" style={{ width: '40%', height: '20px', marginBottom: '16px' }} />
          <div className="skeleton-bars">
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
              <div key={i} className="skeleton-bar" style={{ height: `${20 + Math.random() * 60}px` }} />
            ))}
          </div>
        </div>
        <div className="skeleton-chart-card">
          <div className="skeleton-line" style={{ width: '40%', height: '20px', marginBottom: '16px' }} />
          <div className="skeleton-donut">
            <div className="skeleton-circle" />
          </div>
        </div>
      </div>
    </div>

    <style>{`
      .crm-tabs-skeleton {
        display: flex;
        gap: 4px;
        margin-bottom: 24px;
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 4px;
      }

      .skeleton-tab {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        border-radius: 8px;
      }

      .skeleton-stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }

      .skeleton-stat-card {
        padding: 20px 24px;
        background: var(--bg-card);
        border-radius: 12px;
        border: 1px solid var(--border-color);
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .skeleton-charts-grid {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 24px;
        margin-bottom: 24px;
      }

      .skeleton-chart-card {
        padding: 20px;
        background: var(--bg-card);
        border-radius: 12px;
        border: 1px solid var(--border-color);
      }

      .skeleton-bars {
        display: flex;
        align-items: flex-end;
        justify-content: space-around;
        height: 180px;
        gap: 8px;
        padding-top: 8px;
      }

      .skeleton-bar {
        flex: 1;
        min-width: 20px;
        background: linear-gradient(180deg, #e2e8f0 0%, #f1f5f9 100%);
        border-radius: 4px 4px 0 0;
        animation: shimmer 1.5s ease-in-out infinite;
        background-size: 200% 100%;
      }

      .skeleton-donut {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 180px;
      }

      .skeleton-circle {
        width: 140px;
        height: 140px;
        border-radius: 50%;
        background: conic-gradient(#e2e8f0 0%, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%, #e2e8f0 100%);
        animation: shimmer 1.5s ease-in-out infinite;
        background-size: 200% 200%;
      }

      .skeleton-line {
        height: 14px;
        background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
        background-size: 200% 100%;
        border-radius: 4px;
        animation: shimmer 1.5s ease-in-out infinite;
      }

      .skeleton-number {
        height: 32px;
        border-radius: 6px;
      }

      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      @media (max-width: 768px) {
        .skeleton-charts-grid {
          grid-template-columns: 1fr;
          gap: 16px;
        }

        .skeleton-stats-grid {
          grid-template-columns: 1fr 1fr;
        }

        .skeleton-bars {
          height: 120px;
        }
      }

      @media (max-width: 480px) {
        .skeleton-stats-grid {
          grid-template-columns: 1fr;
        }

        .skeleton-tab {
          padding: 6px 10px;
        }
      }
    `}</style>
  </div>
);

// ── COMPONENTE: CUSTOMER DETAIL MODAL ──
function CustomerDetailModal({ customer, formatUtils, onClose }) {
  if (!customer) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <div className="modal-avatar">
              {customer.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <h3>{customer.name || 'Cliente'}</h3>
              <span>{customer.document_number || 'Sin documento'}</span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-stats">
            <div className="modal-stat">
              <span className="modal-stat-value">{formatUtils.currency(customer.total_spent)}</span>
              <span className="modal-stat-label">Total gastado</span>
            </div>
            <div className="modal-stat">
              <span className="modal-stat-value">{formatUtils.number(customer.total_orders)}</span>
              <span className="modal-stat-label">Órdenes</span>
            </div>
            <div className="modal-stat">
              <span className="modal-stat-value">{formatUtils.currency(customer.avg_ticket)}</span>
              <span className="modal-stat-label">Promedio</span>
            </div>
            <div className="modal-stat">
              <span className="modal-stat-value">{formatUtils.date(customer.last_order)}</span>
              <span className="modal-stat-label">Última compra</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ──
export default function CrmAnalytics() {
  const { user } = useSession();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('resumen');
  const [data, setData] = useState({
    summary: null,
    segments: [],
    topCustomers: [],
    salesByHour: [],
    salesByDay: [],
    monthlyTrend: [],
    clv: null,
    invoiceSource: null
  });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState(null);
  const [timeRange, setTimeRange] = useState('month');

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
        fetchWithAuth('/crm/analytics/summary'),
        fetchWithAuth('/crm/analytics/customer-segments'),
        fetchWithAuth(`/crm/analytics/top-customers?limit=10&period=${timeRange}`),
        fetchWithAuth('/crm/analytics/sales-by-hour'),
        fetchWithAuth('/crm/analytics/sales-by-day'),
        fetchWithAuth('/crm/analytics/monthly-trend?months=6'),
        fetchWithAuth('/crm/analytics/customer-lifetime-value')
      ]);

      const summaryData = await summaryRes.json();
      const segmentsData = await segmentsRes.json();
      const topCustomersData = await topCustomersRes.json();
      const salesByHourData = await salesByHourRes.json();
      const salesByDayData = await salesByDayRes.json();
      const monthlyTrendData = await monthlyTrendRes.json();
      const clvData = await clvRes.json();

      setData({
        summary: summaryData.success ? summaryData.data : null,
        segments: segmentsData.success && Array.isArray(segmentsData.data) ? segmentsData.data : [],
        topCustomers: topCustomersData.success && Array.isArray(topCustomersData.data) ? topCustomersData.data : [],
        salesByHour: salesByHourData.success && Array.isArray(salesByHourData.data) ? salesByHourData.data : [],
        salesByDay: salesByDayData.success && Array.isArray(salesByDayData.data) ? salesByDayData.data : [],
        monthlyTrend: monthlyTrendData.success && Array.isArray(monthlyTrendData.data) ? monthlyTrendData.data : [],
        clv: clvData.success ? clvData.data : null,
        invoiceSource: summaryData.metadata?.invoiceSource || null
      });

    } catch (err) {
      setError(err.message);
      showNotification('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  const tabs = [
    { id: 'resumen', label: 'Resumen', icon: Layout, badge: null },
    { id: 'ventas', label: 'Ventas', icon: TrendingUp, badge: null },
    { id: 'clientes', label: 'Clientes', icon: UsersIcon, badge: data.summary?.total_customers || 0 },
    { id: 'segmentacion', label: 'Segmentación', icon: PieChartIcon, badge: null },
    { id: 'ranking', label: 'Ranking', icon: AwardIcon, badge: null },
  ];

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

  // SI ESTÁ CARGANDO, MOSTRAR SKELETON
  if (loading) {
    return (
      <PageTemplate
        title="Analítica de Clientes"
        subtitle="Dashboard completo de comportamiento y tendencias"
        loading={false}
        headerAction={refreshButton}
      >
        <CrmAnalyticsSkeleton />
      </PageTemplate>
    );
  }

  if (error) {
    return (
      <PageTemplate
        title="Analítica de Clientes"
        subtitle="Error al cargar los datos"
        error={error}
        onRetry={loadAllData}
      />
    );
  }

  return (
    <PageTemplate
      title="Analítica de Clientes"
      subtitle="Dashboard completo de comportamiento y tendencias"
      headerAction={refreshButton}
    >
      <div className="crm-analytics-container">
        {/* ── NOTIFICACIONES ── */}
        {notification && (
          <div className={`crm-analytics-notification ${notification.type}`}>
            {notification.type === 'error' && <AlertCircle size={16} style={{ marginRight: '8px' }} />}
            {notification.type === 'success' && <CheckCircle size={16} style={{ marginRight: '8px' }} />}
            {notification.type === 'info' && <Info size={16} style={{ marginRight: '8px' }} />}
            {notification.msg}
          </div>
        )}

        {/* ── TABS ── */}
        <div className="crm-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`crm-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
              {tab.badge !== null && tab.badge > 0 && (
                <span className="tab-badge">{tab.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── CONTENIDO DE TABS ── */}
        <div className="tab-content">
          {activeTab === 'resumen' && (
            <TabResumen
              data={data}
              formatUtils={formatUtils}
              COLORS={COLORS}
              timeRange={timeRange}
              setTimeRange={setTimeRange}
              onSelectCustomer={setSelectedCustomer}
            />
          )}

          {activeTab === 'ventas' && (
            <TabVentas
              data={data}
              formatUtils={formatUtils}
              COLORS={COLORS}
              timeRange={timeRange}
              setTimeRange={setTimeRange}
            />
          )}

          {activeTab === 'clientes' && (
            <TabClientes
              data={data}
              formatUtils={formatUtils}
              COLORS={COLORS}
              onSelectCustomer={setSelectedCustomer}
            />
          )}

          {activeTab === 'segmentacion' && (
            <TabSegmentacion
              data={data}
              formatUtils={formatUtils}
              COLORS={COLORS}
            />
          )}

          {activeTab === 'ranking' && (
            <TabRanking
              data={data}
              formatUtils={formatUtils}
              COLORS={COLORS}
              onSelectCustomer={setSelectedCustomer}
            />
          )}
        </div>

        {/* ── MODAL DE CLIENTE ── */}
        {selectedCustomer && (
          <CustomerDetailModal
            customer={selectedCustomer}
            formatUtils={formatUtils}
            onClose={() => setSelectedCustomer(null)}
          />
        )}
      </div>
    </PageTemplate>
  );
}