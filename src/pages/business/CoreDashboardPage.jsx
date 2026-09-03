// pages/manager/ManagerDashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../context/SessionContext.js';
import { fetchWithAuth } from '../../config/api.js';
import PageTemplate from '../../components/PageTemplate.jsx';
import StatsCardsSection from '../../components/StatsCardsSection.js';
import SalesChartSection from '../../components/SalesChartSection.js';
import GraphsRowSection from '../../components/GraphsRowSection.js';
import { FiRefreshCw } from 'react-icons/fi';

// ─── SKELETON COMPONENT ──────────────────────────────────────────────────────

const DashboardSkeleton = () => (
  <div className="dashboard-skeleton">
    {/* Skeleton para Stats Cards */}
    <div className="stats-skeleton-grid">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="stats-skeleton-card">
          <div className="stats-skeleton-header">
            <div className="skeleton-line skeleton-icon" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
            <div className="skeleton-line" style={{ width: '40%' }} />
          </div>
          <div className="skeleton-line skeleton-number" style={{ width: '60%', height: '32px' }} />
          <div className="skeleton-line" style={{ width: '30%' }} />
        </div>
      ))}
    </div>

    {/* Skeleton para Gráfico de Ventas */}
    <div className="skeleton-chart-card">
      <div className="skeleton-chart-header">
        <div className="skeleton-line" style={{ width: '30%', height: '20px' }} />
        <div className="skeleton-line" style={{ width: '20%' }} />
      </div>
      <div className="skeleton-chart-body">
        {[1, 2, 3, 4, 5, 6, 7].map(i => (
          <div key={i} className="skeleton-bar" style={{ height: `${20 + Math.random() * 60}px` }} />
        ))}
      </div>
    </div>

    {/* Skeleton para Gráficos de Compras y Horas */}
    <div className="skeleton-row-grid">
      <div className="skeleton-chart-card">
        <div className="skeleton-chart-header">
          <div className="skeleton-line" style={{ width: '40%', height: '20px' }} />
        </div>
        <div className="skeleton-chart-body">
          {[1, 2, 3, 4, 5, 6, 7].map(i => (
            <div key={i} className="skeleton-bar" style={{ height: `${20 + Math.random() * 40}px` }} />
          ))}
        </div>
      </div>
      <div className="skeleton-chart-card">
        <div className="skeleton-chart-header">
          <div className="skeleton-line" style={{ width: '40%', height: '20px' }} />
        </div>
        <div className="skeleton-chart-body">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="skeleton-bar" style={{ height: `${20 + Math.random() * 50}px` }} />
          ))}
        </div>
      </div>
    </div>

    <style>{`
      .dashboard-skeleton {
        animation: fadeIn 0.3s ease;
        padding: 4px;
      }

      .stats-skeleton-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }

      .stats-skeleton-card {
        background: var(--bg-card);
        padding: 20px 24px;
        border-radius: 12px;
        border: 1px solid var(--border-color);
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      }

      .stats-skeleton-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
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
        margin: 4px 0;
      }

      .skeleton-icon {
        border-radius: 50%;
        width: 24px;
        height: 24px;
      }

      .skeleton-chart-card {
        background: var(--bg-card);
        border-radius: 12px;
        border: 1px solid var(--border-color);
        padding: 20px;
        margin-bottom: 24px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      }

      .skeleton-chart-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }

      .skeleton-chart-body {
        display: flex;
        align-items: flex-end;
        justify-content: space-around;
        height: 160px;
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
        transition: height 0.3s ease;
      }

      .skeleton-row-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
      }

      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @media (max-width: 768px) {
        .skeleton-row-grid {
          grid-template-columns: 1fr;
          gap: 16px;
        }

        .stats-skeleton-grid {
          grid-template-columns: 1fr 1fr;
        }

        .skeleton-chart-body {
          height: 120px;
        }
      }

      @media (max-width: 480px) {
        .stats-skeleton-grid {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  </div>
);

// ─── Helpers ────────────────────────────────────────────────────────────────

function getEcuadorDate() {
  const now = new Date();
  const ecuadorDate = new Date(now.getTime() - (5 * 60 * 60 * 1000));
  
  const year = ecuadorDate.getUTCFullYear();
  const month = String(ecuadorDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(ecuadorDate.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

function getEcuadorDateDaysAgo(days) {
  const now = new Date();
  const ecuadorDate = new Date(now.getTime() - (5 * 60 * 60 * 1000));
  const pastDate = new Date(ecuadorDate.getTime() - (days * 24 * 60 * 60 * 1000));
  
  const year = pastDate.getUTCFullYear();
  const month = String(pastDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(pastDate.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

const fmt = n =>
  typeof n !== 'number'
    ? '$0,00'
    : n.toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

function calcHours(emp) {
  const ahora = new Date();
  const checkIn  = emp.entrada          ? new Date(emp.entrada)          : null;
  const lunchOut = emp.salida_almuerzo  ? new Date(emp.salida_almuerzo)  : null;
  const lunchIn  = emp.entrada_almuerzo ? new Date(emp.entrada_almuerzo) : null;
  const checkOut = emp.salida           ? new Date(emp.salida)           : null;

  let totalMs = 0;
  if (!checkIn) return 0;

  if (checkIn && !lunchOut && !checkOut) {
    totalMs = ahora - checkIn;
    const hours = Math.round((totalMs / 3_600_000) * 100) / 100;
    return hours > 0 ? hours : 0;
  }

  if (checkIn && lunchOut && !lunchIn && !checkOut) {
    totalMs = lunchOut - checkIn;
    const hours = Math.round((totalMs / 3_600_000) * 100) / 100;
    return hours > 0 ? hours : 0;
  }

  if (checkIn && lunchOut && lunchIn && !checkOut) {
    totalMs = (lunchOut - checkIn) + (ahora - lunchIn);
    const hours = Math.round((totalMs / 3_600_000) * 100) / 100;
    return hours > 0 ? hours : 0;
  }

  if (checkIn && lunchOut && lunchIn && checkOut) {
    totalMs = (lunchOut - checkIn) + (checkOut - lunchIn);
    const hours = Math.round((totalMs / 3_600_000) * 100) / 100;
    return hours > 0 ? hours : 0;
  }

  if (checkIn && checkOut && !lunchOut && !lunchIn) {
    totalMs = checkOut - checkIn;
    const hours = Math.round((totalMs / 3_600_000) * 100) / 100;
    return hours > 0 ? hours : 0;
  }

  return 0;
}

function toArray(data) {
  return Array.isArray(data) ? data : data?.data ?? [];
}

// ─── Componente Principal ────────────────────────────────────────────────────

export default function ManagerDashboard() {
  const { logout } = useSession();
  const navigate = useNavigate();
  
  const today = getEcuadorDate();
  const fromDate = getEcuadorDateDaysAgo(29);

  const [stats, setStats] = useState({});
  const [graphData, setGraphData] = useState({ sales: [], purchases: [], hours: [] });
  const [loading, setLoading] = useState(true);
  const [graphLoading, setGraphLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchGraphs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchStats() {
    try {
      setLoading(true);
      const res = await fetchWithAuth(`/dashboard/stats?date=${today}`);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error('Error al cargar estadísticas');
      }
      const json = await res.json();
      setStats(json.data ?? json);
    } catch (err) {
      setError('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  }

  async function fetchGraphs() {
    try {
      setGraphLoading(true);
      const [salesRes, purchasesRes, attendanceRes] = await Promise.all([
        fetchWithAuth(`/graphs/sales-by-day?from=${fromDate}&to=${today}`),
        fetchWithAuth(`/graphs/purchases-by-day?from=${fromDate}&to=${today}`),
        fetchWithAuth('/attendance/today'),
      ]);

      const [salesData, purchasesData, attendanceData] = await Promise.all([
        salesRes.ok ? salesRes.json() : Promise.resolve([]),
        purchasesRes.ok ? purchasesRes.json() : Promise.resolve([]),
        attendanceRes.ok ? attendanceRes.json() : Promise.resolve([]),
      ]);

      const hours = toArray(attendanceData)
        .map(emp => {
          const h = calcHours(emp);
          return { day: emp.full_name?.split(' ')[0] ?? `Emp ${emp.employee_id}`, hours: h };
        });

      setGraphData({ sales: toArray(salesData), purchases: toArray(purchasesData), hours });
    } catch (err) {
      setGraphData({ sales: [], purchases: [], hours: [] });
    } finally {
      setGraphLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    setError('');
    try {
      await Promise.all([fetchStats(), fetchGraphs()]);
    } catch {
      setError('Error al actualizar los datos');
    } finally {
      setRefreshing(false);
    }
  }

  const salesTotal     = Number(stats?.total_cobrado)  || 0;
  const ticketsCount   = Number(stats?.tickets_count)  || 0;
  const purchasesTotal = Math.abs(Number(stats?.expenses_total) || 0);
  const pendingCount   = Number(stats?.pending_count)  || 0;
  const salesMonth     = Number(stats?.sales_month)    || 0;
  const balance        = salesTotal - purchasesTotal;

  const statsData = {
    sales:     { total: salesTotal, tickets: ticketsCount, month: salesMonth },
    purchases: { total: purchasesTotal },
    balance,
    pending:   { count: pendingCount },
  };

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

  // ✅ SI ESTÁ CARGANDO, MOSTRAR SKELETON
  if (loading) {
    return (
      <PageTemplate 
        title="PANEL DE CONTROL"
        subtitle="Resumen ejecutivo"
        headerAction={refreshButton}
        loading={false}
        error={error}
        onRetry={handleRefresh}
      >
        <DashboardSkeleton />
      </PageTemplate>
    );
  }

  return (
    <PageTemplate 
      title="PANEL DE CONTROL"
      subtitle="Resumen ejecutivo"
      headerAction={refreshButton}
      loading={loading}
      error={error}
      onRetry={handleRefresh}
    >
      <div className="custom-dashboard">
        <StatsCardsSection stats={statsData} />
        <SalesChartSection salesData={graphData.sales} />
        <GraphsRowSection 
          purchasesData={graphData.purchases}
          hoursData={graphData.hours}
          graphLoading={graphLoading}
        />
      </div>
    </PageTemplate>
  );
}