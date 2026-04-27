import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiTrendingUp, FiPlus, FiDollarSign, FiShoppingCart,
  FiBarChart2, FiFileText, FiBell, FiRefreshCw
} from 'react-icons/fi';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import '../../styles/Dashboard_.css';
import { fetchWithAuth } from '../../config/apiBase';

// ─── Helpers ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, detail, color, bg }) {
  return (
    <div className="stat-card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="stat-card-icon" style={{ background: bg, color }}>{icon}</div>
      <div>
        <div className="stat-card-label">{label}</div>
        <div className="stat-card-value" style={{ color }}>{value}</div>
        <div className="stat-card-detail">{detail}</div>
      </div>
    </div>
  );
}

const fmt = n =>
  typeof n !== 'number'
    ? '$0,00'
    : n.toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

/**
 * Calcula horas trabajadas:
 *   Escenario A (2 marcaciones): check_out - check_in
 *   Escenario B (4 marcaciones): (entrada_almuerzo - entrada) + (salida - salida_almuerzo)
 * Retorna null si el empleado aún no ha salido.
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
  const navigate = useNavigate();
  const today    = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });

  const [stats,        setStats       ] = useState(null);
  const [graphData,    setGraphData   ] = useState({ sales: [], purchases: [], hours: [] });
  const [loading,      setLoading     ] = useState(true);
  const [graphLoading, setGraphLoading] = useState(true);
  const [error,        setError       ] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchStats(); fetchGraphs(); }, []);

  async function fetchStats() {
    try {
      setLoading(true);
      const [salesRes, purchasesRes, pendingRes, clientRes] = await Promise.all([
        fetchWithAuth(`/api/reports/sales-today?date=${today}`),
        fetchWithAuth(`/api/expenses?date=${today}`),
        fetchWithAuth(`/api/reports/pending`),
        fetchWithAuth(`/api/clientes`),
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

  function handleRefresh() { fetchStats(); fetchGraphs(); }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <div className="dashboard-loading"><div className="spinner" /></div>;

  const { sales = {}, purchases = {}, pending = {} } = stats ?? {};
  const balance = (sales.total_cobrado ?? 0) - (purchases.total ?? 0);

  return (
    <div className="custom-dashboard">

      <div className="dashboard-header">
        <h1>PANEL DE CONTROL</h1>
        <button onClick={handleRefresh} className="dashboard-refresh-btn">
          <FiRefreshCw size={18} /> Actualizar
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* ── Tarjetas resumen ── */}
      <div className="stat-cards-row">
        <StatCard
          icon={<FiTrendingUp size={28} />}
          label="VENTAS HOY"
          value={(sales.total_cobrado ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
          detail={`${sales.tickets_count ?? 0} tickets`}
          color="#10b981"
          bg="rgba(16,185,129,0.16)"
        />
        <StatCard
          icon={<FiShoppingCart size={28} />}
          label="COMPRAS HOY"
          value={fmt(purchases.total ?? 0)}
          detail="Gastos operativos"
          color="#3b82f6"
          bg="rgba(59,130,246,0.18)"
        />
        <StatCard
          icon={<FiDollarSign size={28} />}
          label="BALANCE NETO"
          value={fmt(balance)}
          detail="Ganancia neta"
          color={balance >= 0 ? '#10b981' : '#ef4444'}
          bg={balance >= 0 ? 'rgba(16,185,129,.13)' : 'rgba(239,68,68,.2)'}
        />
        <StatCard
          icon={<FiBarChart2 size={28} />}
          label="ÓRDENES POR COBRAR"
          value={pending.count ?? 0}
          detail="Pendientes por cobrar"
          color="#a855f7"
          bg="rgba(168,85,247,0.17)"
        />
      </div>

      {/* ── Ventas por día ── */}
      <div className="dashboard-graph-card graph-big"
        style={{ width: '100%', minHeight: 320, padding: 32, background: '#17192b', borderRadius: 16, marginBottom: 30 }}
      >
        <div style={{ fontSize: 18, color: '#fff', fontWeight: 700, marginBottom: 8 }}>Ventas por día</div>
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={graphData.sales}>
            <defs>
              <linearGradient id="salesLine" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#5caaff" stopOpacity={0.85} />
                <stop offset="100%" stopColor="#17192b" stopOpacity={0.2}  />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#233356" strokeDasharray="4 3" />
            <XAxis dataKey="day" stroke="#5caaffb0" />
            <YAxis stroke="#5caaff85" tickFormatter={n => `$${Number(n).toLocaleString('es-EC', { minimumFractionDigits: 2 })}`} />
            <Tooltip
              contentStyle={{ background: '#23243b', border: 'none', color: '#fff' }}
              formatter={v => [`$${Number(v).toFixed(2)}`, 'Total']}
              labelFormatter={l => `Fecha: ${l}`}
            />
            <Line type="monotone" dataKey="total" stroke="url(#salesLine)" strokeWidth={4}
              dot={{ stroke: '#fff', fill: '#5caaff', r: 6, strokeWidth: 2 }}
              activeDot={{ stroke: '#fff', fill: '#007AFF', r: 8, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Fila inferior: Compras + Horas ── */}
      <div style={{ display: 'flex', gap: 16 }}>

        <div className="dashboard-graph-card"
          style={{ flex: 1, minWidth: 0, background: '#17192b', borderRadius: 14, padding: 22 }}
        >
          <div style={{ fontSize: 15, color: '#fff', fontWeight: 700, marginBottom: 5 }}>Compras por día</div>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={graphData.purchases}>
              <defs>
                <linearGradient id="purchasesLine" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="10%" stopColor="#21e69e" stopOpacity={0.90} />
                  <stop offset="90%" stopColor="#17192b" stopOpacity={0.1}  />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#233356" strokeDasharray="4 3" />
              <XAxis dataKey="day" stroke="#21e69e88" />
              <YAxis stroke="#21e69e40" />
              <Tooltip
                contentStyle={{ background: '#23243b', border: 'none', color: '#fff' }}
                formatter={v => [`$${Number(v).toFixed(2)}`, 'Total']}
                labelFormatter={l => `Fecha: ${l}`}
              />
              <Line type="monotone" dataKey="total" stroke="url(#purchasesLine)" strokeWidth={3}
                dot={{ stroke: '#fff', fill: '#21e69e', r: 5, strokeWidth: 2 }}
                activeDot={{ stroke: '#fff', fill: '#048050', r: 7, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="dashboard-graph-card"
          style={{ flex: 1, minWidth: 0, background: '#17192b', borderRadius: 14, padding: 22 }}
        >
          <div style={{ fontSize: 15, color: '#fff', fontWeight: 700, marginBottom: 5 }}>Horas trabajadas hoy</div>
          {graphLoading ? (
            <div style={{ color: '#af47f9', textAlign: 'center', paddingTop: 50 }}>Cargando...</div>
          ) : graphData.hours.length === 0 ? (
            <div style={{ color: '#ffffff55', textAlign: 'center', paddingTop: 50, fontSize: 13 }}>
              Sin registros de salida aún
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={graphData.hours} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="hoursBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="10%" stopColor="#af47f9" stopOpacity={0.8} />
                    <stop offset="90%" stopColor="#17192b" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#233356" strokeDasharray="4 3" />
                <XAxis dataKey="day" stroke="#af47f9a0" tick={{ fontSize: 11 }} />
                <YAxis stroke="#af47f955" tickFormatter={n => `${n}h`} />
                <Tooltip
                  contentStyle={{ background: '#23243b', border: 'none', color: '#fff' }}
                  formatter={v => [`${v} hrs`, 'Horas']}
                  labelFormatter={l => `Colaborador/a: ${l}`}
                />
                <Bar dataKey="hours" fill="url(#hoursBar)" radius={[8, 8, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Acciones rápidas ── */}
      <div className="dashboard-quick-actions">
        <h3>Acciones Rápidas</h3>
        <div className="action-buttons">
          <button className="action-btn quick" onClick={() => navigate('/app/inventory/inventory.products')}><FiFileText />  Inventario</button>
          <button className="action-btn quick" onClick={() => navigate('/app/purchases')}                 ><FiDollarSign /> Compras</button>
          <button className="action-btn quick" onClick={() => navigate('/app/pos/pos.sales')}             ><FiTrendingUp /> Ventas</button>
          <button className="action-btn quick" onClick={() => navigate('/app/reports/reports.dashboard')} ><FiTrendingUp /> Reportes</button>
          <button className="action-btn quick" onClick={() => navigate('/app/orders/orders.create')}      ><FiPlus />       Nueva Orden</button>
          <button className="action-btn quick" onClick={() => navigate('/app/core/core.audit_log')}       ><FiBell />       Auditoría</button>
        </div>
      </div>

    </div>
  );
}