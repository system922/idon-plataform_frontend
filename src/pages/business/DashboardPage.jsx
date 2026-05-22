import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageTemplate from '../../components/PageTemplate';
import StatsCardsSection from '../../components/StatsCardsSection';
import SalesChartSection from '../../components/SalesChartSection';
import GraphsRowSection from '../../components/GraphsRowSection.js';
import { fetchWithAuth } from '../../config/apiBase';
import { useAuth } from '../../context/AuthContext';
import { FiRefreshCw } from 'react-icons/fi';
import '../../styles/Dashboard.css';

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = n =>
  typeof n !== 'number'
    ? '$0,00'
    : n.toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

/**
 * Calcula horas trabajadas acumuladas hasta el momento actual:
 *   - Si solo tiene entrada → horas desde entrada hasta ahora.
 *   - Si tiene entrada y salida de almuerzo (sin regreso) → horas hasta almuerzo.
 *   - Si tiene entrada, salida y regreso de almuerzo (sin salida final) → horas antes del almuerzo + desde regreso hasta ahora.
 *   - Si tiene todas las marcaciones → total fijo.
 *   - Si no hay entrada → 0.
 */
function calcHours(emp) {
  const ahora = new Date(); // hora actual del navegador

  const checkIn  = emp.entrada          ? new Date(emp.entrada)          : null;
  const lunchOut = emp.salida_almuerzo  ? new Date(emp.salida_almuerzo)  : null;
  const lunchIn  = emp.entrada_almuerzo ? new Date(emp.entrada_almuerzo) : null;
  const checkOut = emp.salida           ? new Date(emp.salida)           : null;

  let totalMs = 0;

  // Sin entrada → 0 horas
  if (!checkIn) return 0;

  // Caso 1: Solo entrada (aún no ha salido a almorzar ni terminado)
  if (checkIn && !lunchOut && !checkOut) {
    totalMs = ahora - checkIn;
    const hours = Math.round((totalMs / 3_600_000) * 100) / 100;
    return hours > 0 ? hours : 0;
  }

  // Caso 2: Entrada y salida de almuerzo (no ha regresado ni terminado)
  if (checkIn && lunchOut && !lunchIn && !checkOut) {
    totalMs = lunchOut - checkIn; // solo tiempo antes del almuerzo
    const hours = Math.round((totalMs / 3_600_000) * 100) / 100;
    return hours > 0 ? hours : 0;
  }

  // Caso 3: Entrada, salida almuerzo y entrada almuerzo (pero no ha salido definitivamente)
  if (checkIn && lunchOut && lunchIn && !checkOut) {
    totalMs = (lunchOut - checkIn) + (ahora - lunchIn);
    const hours = Math.round((totalMs / 3_600_000) * 100) / 100;
    return hours > 0 ? hours : 0;
  }

  // Caso 4: Las 4 marcaciones completas (tiempo fijo)
  if (checkIn && lunchOut && lunchIn && checkOut) {
    totalMs = (lunchOut - checkIn) + (checkOut - lunchIn);
    const hours = Math.round((totalMs / 3_600_000) * 100) / 100;
    return hours > 0 ? hours : 0;
  }

  // Caso 5: Solo entrada y salida final (sin almuerzo registrado)
  if (checkIn && checkOut && !lunchOut && !lunchIn) {
    totalMs = checkOut - checkIn;
    const hours = Math.round((totalMs / 3_600_000) * 100) / 100;
    return hours > 0 ? hours : 0;
  }

  // Cualquier otra combinación no contemplada → 0
  return 0;
}

function toArray(data) {
  return Array.isArray(data) ? data : data?.data ?? [];
}

// ─── Componente Principal ────────────────────────────────────────────────────

export default function ManagerDashboard() {
  const { logout: authLogout } = useAuth();
  
  const TZ = 'America/Guayaquil';
  const today = new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  const fromDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toLocaleDateString('en-CA', { timeZone: TZ });
  })();

  // Estados del dashboard
  const [stats, setStats] = useState({});
  const [graphData, setGraphData] = useState({ sales: [], purchases: [], hours: [] });
  const [loading, setLoading] = useState(true);
  const [graphLoading, setGraphLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Cargar datos del dashboard
  useEffect(() => {
    fetchStats();
    fetchGraphs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchStats() {
    try {
      setLoading(true);
      const res = await fetchWithAuth(`/api/dashboard/stats?date=${today}`);
      if (!res.ok) throw new Error('Error al cargar estadísticas');
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
        fetchWithAuth(`/api/graphs/sales-by-day?from=${fromDate}&to=${today}`),
        fetchWithAuth(`/api/graphs/purchases-by-day?from=${fromDate}&to=${today}`),
        fetchWithAuth('/api/attendance/today'),
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

  // ── Computed values con sanitización ─────────────────────────────────────

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

  // ── Botón de actualizar para el header ────────────────────────────────────
  
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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <PageTemplate 
      title="PANEL DE CONTROL" 
      subtitle="Resumen ejecutivo"
      headerAction={refreshButton}
      loading={loading}
      error={error}
      onRetry={handleRefresh}
      theme="business"
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