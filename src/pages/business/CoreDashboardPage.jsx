import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../context/SessionContext.js';
import { fetchWithAuth } from '../../config/api.js';
import PageTemplate from '../../components/PageTemplate.jsx';
import StatsCardsSection from '../../components/StatsCardsSection.js';
import SalesChartSection from '../../components/SalesChartSection.js';
import GraphsRowSection from '../../components/GraphsRowSection.js';
import { FiRefreshCw } from 'react-icons/fi';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD con zona horaria de Ecuador (UTC-5)
 */
function getEcuadorDate() {
  const now = new Date();
  const ecuadorDate = new Date(now.getTime() - (5 * 60 * 60 * 1000));
  
  const year = ecuadorDate.getUTCFullYear();
  const month = String(ecuadorDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(ecuadorDate.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Obtiene una fecha anterior en formato YYYY-MM-DD con zona horaria de Ecuador
 */
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