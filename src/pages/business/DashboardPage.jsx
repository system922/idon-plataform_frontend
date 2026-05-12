import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageTemplate from '../../components/PageTemplate';
import StatsCardsSection from '../../components/StatsCardsSection';
import SalesChartSection from '../../components/SalesChartSection';
import GraphsRowSection from '../../components/GraphsRowSection.js';
import QuickActionsSection from '../../components/QuickActionsSection';
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
  const [stats, setStats] = useState(null);
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
      const [salesRes, purchasesRes, pendingRes] = await Promise.all([
        fetchWithAuth(`/api/sales/today?date=${today}`),
        fetchWithAuth(`/api/expenses/dashboard/summary?date=${today}`),
        fetchWithAuth('/api/reports/pending'),
      ]);

      setStats({
        sales: salesRes.ok ? await salesRes.json() : {},
        purchases: purchasesRes.ok ? await purchasesRes.json() : {},
        pending: pendingRes.ok ? await pendingRes.json() : {},
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
        fetchWithAuth(`/api/graphs/sales-by-day?from=${fromDate}&to=${today}`),
        fetchWithAuth(`/api/graphs/purchases-by-day?from=${fromDate}&to=${today}`),
        fetchWithAuth('/api/attendance/today'),
      ]);

      const [salesData, purchasesData, attendanceData] = await Promise.all([
        salesRes.ok ? salesRes.json() : [],
        purchasesRes.ok ? purchasesRes.json() : [],
        attendanceRes.ok ? attendanceRes.json() : [],
      ]);

      // 🔍 LOG PARA DEBUG - Mira la consola del navegador
      console.log('Datos de asistencia COMPLETOS:', attendanceData);
      console.log('Cantidad de empleados:', attendanceData.length);
      
      attendanceData.forEach(emp => {
        console.log(`Empleado: ${emp.full_name}`, {
          entrada: emp.entrada,
          salida_almuerzo: emp.salida_almuerzo,
          entrada_almuerzo: emp.entrada_almuerzo,
          salida: emp.salida
        });
      });

      // ✅ AHORA se incluyen TODOS los empleados (sin filtrar por null)
      const hours = toArray(attendanceData)
        .map(emp => {
          const h = calcHours(emp);
          console.log(`Horas calculadas para ${emp.full_name}:`, h);
          return { day: emp.full_name?.split(' ')[0] ?? `Emp ${emp.employee_id}`, hours: h };
        });

      console.log('Horas procesadas final (todos los empleados):', hours);

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

  // ── LOGS PARA DEPURAR EL GRÁFICO DE HORAS (ANTES DEL RENDER) ─────────────────
  console.log('📊 [DEBUG] Datos que recibe el gráfico de horas:', graphData.hours);
  console.log('📊 [DEBUG] Cantidad de colaboradores a mostrar:', graphData.hours.length);
  if (graphData.hours.length > 0) {
    console.log('📊 [DEBUG] Primer colaborador:', graphData.hours[0]);
    console.log('📊 [DEBUG] Último colaborador:', graphData.hours[graphData.hours.length - 1]);
  }

  // ── EFECTO PARA LOGUEAR CAMBIOS EN graphData.hours ────────────────────────
  useEffect(() => {
    console.log('🔄 [useEffect] graphData.hours actualizado:', graphData.hours);
  }, [graphData.hours]);

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