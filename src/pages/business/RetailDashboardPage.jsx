import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  FiTrendingUp, FiShoppingBag, FiDollarSign, FiCreditCard,
  FiRefreshCw, FiPackage, FiShoppingCart,
} from 'react-icons/fi';
import PageTemplate from '../../components/PageTemplate';
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/RetailDashboard.css';

const fmt = n =>
  typeof n !== 'number'
    ? '$0.00'
    : n.toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

const METHOD_LABELS = {
  cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', mixto: 'Mixto',
};
const METHOD_COLORS = {
  cash: '#10b981', card: '#3b82f6', transfer: '#f59e0b', mixto: '#a855f7',
};

function StatCard({ icon, label, value, detail, color, bg }) {
  return (
    <div className="rd-stat-card" style={{ '--card-color': color }}>
      <div className="rd-stat-icon" style={{ background: bg, color }}>
        {icon}
      </div>
      <div className="rd-stat-text">
        <div className="rd-stat-label">{label}</div>
        <div className="rd-stat-value" style={{ color }}>{value}</div>
        <div className="rd-stat-detail">{detail}</div>
      </div>
    </div>
  );
}

export default function RetailDashboardPage() {
  const navigate = useNavigate();
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth('/api/retail/stats');
      if (!res.ok) throw new Error('Error al cargar estadísticas');
      const json = await res.json();
      setData(json.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const mejorMetodo = data?.pagos?.length
    ? data.pagos.reduce((a, b) => (b.monto > a.monto ? b : a), data.pagos[0])
    : null;

  const headerAction = (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button
        onClick={() => navigate('/app/pos/pos.retail')}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(16,185,129,.3)',
          background: 'rgba(16,185,129,.15)', color: '#10b981',
          fontWeight: 700, fontSize: 13, cursor: 'pointer',
        }}
      >
        <FiShoppingCart size={15} /> Ir al POS
      </button>
      <button
        onClick={() => load(true)}
        disabled={refreshing}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(92,170,255,.3)',
          background: 'rgba(92,170,255,.15)', color: '#5caaff',
          fontWeight: 700, fontSize: 13, cursor: 'pointer',
        }}
      >
        <FiRefreshCw size={15} className={refreshing ? 'rd-spinning' : ''} />
        {refreshing ? 'Actualizando...' : 'Actualizar'}
      </button>
    </div>
  );

  return (
    <PageTemplate
      title="DASHBOARD RETAIL"
      subtitle="Ventas del día"
      headerAction={headerAction}
      loading={loading}
      error={error}
      onRetry={() => load()}
      theme="business"
    >
      <div className="rd-page">

        {/* ── Stats ── */}
        <div className="rd-stats">
          <StatCard
            icon={<FiTrendingUp size={24} />}
            label="Ventas hoy"
            value={fmt(data?.total_ventas ?? 0)}
            detail={`${data?.transacciones ?? 0} transacciones`}
            color="#10b981"
            bg="rgba(16,185,129,0.16)"
          />
          <StatCard
            icon={<FiShoppingBag size={24} />}
            label="Ticket promedio"
            value={fmt(data?.ticket_promedio ?? 0)}
            detail="Promedio por venta"
            color="#5caaff"
            bg="rgba(92,170,255,0.15)"
          />
          <StatCard
            icon={<FiDollarSign size={24} />}
            label="Método principal"
            value={METHOD_LABELS[mejorMetodo?.method] ?? '—'}
            detail={mejorMetodo ? fmt(mejorMetodo.monto) : 'Sin ventas'}
            color={METHOD_COLORS[mejorMetodo?.method] ?? '#64748b'}
            bg={`${METHOD_COLORS[mejorMetodo?.method] ?? '#64748b'}22`}
          />
          <StatCard
            icon={<FiCreditCard size={24} />}
            label="Formas de pago"
            value={data?.pagos?.length ?? 0}
            detail="Métodos usados hoy"
            color="#a855f7"
            bg="rgba(168,85,247,0.17)"
          />
        </div>

        {/* ── Gráfica + métodos de pago ── */}
        <div className="rd-charts">

          {/* Ventas por hora */}
          <div className="rd-panel">
            <div className="rd-panel-title">Ventas por hora</div>
            {!data?.por_hora?.length ? (
              <div className="rd-empty">Sin ventas registradas hoy</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.por_hora} barSize={16}>
                  <CartesianGrid stroke="#233356" strokeDasharray="4 3" vertical={false} />
                  <XAxis dataKey="label" stroke="#5caaffb0" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#5caaff85" tickFormatter={n => `$${n}`} tick={{ fontSize: 11 }} width={48} />
                  <Tooltip
                    contentStyle={{ background: '#23243b', border: 'none', borderRadius: 8, color: '#fff' }}
                    formatter={v => [fmt(v), 'Total']}
                    labelFormatter={l => `Hora: ${l}`}
                  />
                  <Bar dataKey="total" fill="#5caaff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Métodos de pago */}
          <div className="rd-panel">
            <div className="rd-panel-title">Métodos de pago</div>
            {!data?.pagos?.length ? (
              <div className="rd-empty">Sin datos</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {data.pagos.map(p => {
                  const pct   = data.total_ventas > 0 ? (p.monto / data.total_ventas) * 100 : 0;
                  const color = METHOD_COLORS[p.method] ?? '#64748b';
                  return (
                    <div key={p.method}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, gap: 8 }}>
                        <span style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {METHOD_LABELS[p.method] ?? p.method}
                        </span>
                        <span style={{ fontSize: 13, color, fontWeight: 700, flexShrink: 0 }}>{fmt(p.monto)}</span>
                      </div>
                      <div className="rd-bar-track">
                        <div className="rd-bar-fill" style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
                        {p.cantidad} {p.cantidad === 1 ? 'transacción' : 'transacciones'} · {pct.toFixed(1)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Top 5 productos ── */}
        <div className="rd-panel rd-products">
          <div className="rd-panel-title">
            <FiPackage size={16} /> Top 5 productos hoy
          </div>
          {!data?.top_productos?.length ? (
            <div className="rd-empty">Sin productos vendidos hoy</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.top_productos.map((p, i) => {
                const maxQty = data.top_productos[0]?.cantidad || 1;
                const pct    = (p.cantidad / maxQty) * 100;
                return (
                  <div key={p.name} className="rd-product-row">
                    <div
                      className="rd-product-rank"
                      style={{
                        background: i === 0 ? 'rgba(251,191,36,.2)' : 'rgba(92,170,255,.1)',
                        color: i === 0 ? '#fbbf24' : '#5caaff',
                      }}
                    >
                      {i + 1}
                    </div>
                    <div className="rd-product-info">
                      <div className="rd-product-name-row">
                        <span className="rd-product-name">{p.name}</span>
                        <span className="rd-product-total">{fmt(p.total)}</span>
                      </div>
                      <div className="rd-bar-track">
                        <div className="rd-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="rd-product-qty">
                        {p.cantidad} {p.cantidad === 1 ? 'unidad' : 'unidades'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </PageTemplate>
  );
}
