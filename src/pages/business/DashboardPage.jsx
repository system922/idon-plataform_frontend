import React, { useEffect, useState } from 'react';
import PageTemplate from '../../components/PageTemplate';
import StatsCardsSection from '../../components/StatsCardsSection';
import SalesChartSection from '../../components/SalesChartSection';
import GraphsRowSection from '../../components/GraphsRowSection.js';
import QuickActionsSection from '../../components/QuickActionsSection';
import { fetchWithAuth } from '../../config/apiBase';
import { FiRefreshCw } from 'react-icons/fi';
import '../../styles/Dashboard.css';

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = n =>
  typeof n !== 'number'
    ? '$0,00'
    : n.toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

/**
 * Calcula horas trabajadas:
 *   Escenario A (2 marcaciones): check_out - check_in
 *   Escenario B (4 marcaciones): (entrada_almuerzo - entrada) + (salida - salida_almuerzo)
 *   Retorna null si el empleado aún no ha salido.
 */
function calcHours(emp) {
  const checkIn  = emp.entrada          ? new Date(emp.entrada)          : null;
  const lunchOut = emp.salida_almuerzo  ? new Date(emp.salida_almuerzo)  : null;
  const lunchIn  = emp.entrada_almuerzo ? new Date(emp.entrada_almuerzo) : null;
  const checkOut = emp.salida           ? new Date(emp.salida)           : null;

  if (!checkIn || !checkOut) return null;

  const totalMs = (lunchOut && lunchIn)
    ? (lunchIn - checkIn) + (checkOut - lunchOut)   // Escenario B
    : (checkOut - checkIn);                          // Escenario A

  const hours = Math.round((totalMs / 3_600_000) * 100) / 100;
  return hours > 0 ? hours : 0;
}

function toArray(data) {
  return Array.isArray(data) ? data : data?.data ?? [];
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ManagerDashboard() {
  // Fecha en UTC para evitar problemas de zona horaria con el backend
  const today = new Date().toISOString().split('T')[0];

  const [stats,        setStats       ] = useState(null);
  const [graphData,    setGraphData   ] = useState({ sales: [], purchases: [], hours: [] });
  const [loading,      setLoading     ] = useState(true);
  const [graphLoading, setGraphLoading] = useState(true);
  const [error,        setError       ] = useState('');
  const [refreshing,   setRefreshing  ] = useState(false);

  // ── Carga inicial ─────────────────────────────────────────────────────────

  useEffect(() => { 
    fetchStats(); 
    fetchGraphs(); 
  }, []);

  async function fetchStats() {
    try {
      setLoading(true);
      const [salesRes, purchasesRes, pendingRes, clientRes] = await Promise.all([
        fetchWithAuth(`/api/reports/sales-today?date=${today}`),
        fetchWithAuth(`/api/expenses?date=${today}`),
        fetchWithAuth(`/api/reports/pending`),
        fetchWithAuth(`/api/customers?limit=1`),
      ]);

      setStats({
        sales:     salesRes.ok     ? await salesRes.json()     : {},
        purchases: purchasesRes.ok ? await purchasesRes.json() : {},
        pending:   pendingRes.ok   ? await pendingRes.json()   : {},
        clients:   clientRes.ok    ? await clientRes.json()    : {},
      });
    } catch {
      setError('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  }

  async function fetchGraphs() {
    try {
      setGraphLoading(true);
      const [salesRes, purchasesRes, attendanceRes] = await Promise.all([
        fetchWithAuth('/api/graphs/sales-by-day'),
        fetchWithAuth('/api/graphs/purchases-by-day'),
        fetchWithAuth('/api/attendance/today'),
      ]);

      const [salesData, purchasesData, attendanceData] = await Promise.all([
        salesRes.ok      ? salesRes.json()      : [],
        purchasesRes.ok  ? purchasesRes.json()  : [],
        attendanceRes.ok ? attendanceRes.json() : [],
      ]);

      const hours = toArray(attendanceData)
        .map(emp => {
          const h = calcHours(emp);
          if (h === null) return null;
          return { day: emp.full_name?.split(' ')[0] ?? `Emp ${emp.employee_id}`, hours: h };
        })
        .filter(Boolean);

      setGraphData({ sales: toArray(salesData), purchases: toArray(purchasesData), hours });
    } catch {
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

  const rawSales     = stats?.sales     ?? {};
  const rawPurchases = stats?.purchases ?? {};
  const rawPending   = stats?.pending   ?? {};

  let salesTotal     = Number(rawSales.total_cobrado)     || 0;
  let ticketsCount   = Number(rawSales.tickets_count)     || 0;
  let purchasesTotal = Number(rawPurchases.total)         || 0;
  let pendingCount   = Number(rawPending.count)           || 0;

  // Si hay tickets pero ventas total 0 → forzar tickets a 0 (inconsistencia de datos)
  if (ticketsCount > 0 && salesTotal === 0) {
    ticketsCount = 0;
  }

  // Las compras no deberían ser negativas; si lo son, usar valor absoluto
  if (purchasesTotal < 0) {
    purchasesTotal = Math.abs(purchasesTotal);
  }

  const balance = salesTotal - purchasesTotal;

  const statsData = {
    sales:    { total: salesTotal, tickets: ticketsCount },
    purchases: { total: purchasesTotal },
    balance,
    pending:  { count: pendingCount }
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
        <QuickActionsSection />
      </div>
    </PageTemplate>
  );
}