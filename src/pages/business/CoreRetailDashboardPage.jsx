// pages/retail/RetailDashboardPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { fetchWithAuth } from '../../config/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  FiTrendingUp, FiShoppingBag, FiDollarSign, FiCreditCard,
  FiRefreshCw, FiPackage, FiShoppingCart,
} from 'react-icons/fi';
import PageTemplate from '../../components/PageTemplate';

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

// ─── SKELETON COMPONENT ──────────────────────────────────────────────────────

const RetailDashboardSkeleton = () => (
  <div className="rd-skeleton">
    {/* Skeleton para Stats Cards */}
    <div className="rd-stats-skeleton">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="rd-stat-card-skeleton">
          <div className="skeleton-icon-circle" />
          <div className="skeleton-text-block">
            <div className="skeleton-line" style={{ width: '60%' }} />
            <div className="skeleton-line skeleton-number" style={{ width: '50%', height: '28px' }} />
            <div className="skeleton-line" style={{ width: '40%' }} />
          </div>
        </div>
      ))}
    </div>

    {/* Skeleton para Gráficos */}
    <div className="rd-charts-skeleton">
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
        <div className="skeleton-methods">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-method-item">
              <div className="skeleton-line" style={{ width: '30%' }} />
              <div className="skeleton-line" style={{ width: '25%' }} />
              <div className="skeleton-bar-track">
                <div className="skeleton-bar-fill" style={{ width: `${20 + Math.random() * 60}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Skeleton para Top Productos */}
    <div className="skeleton-products-card">
      <div className="skeleton-line" style={{ width: '30%', height: '20px', marginBottom: '16px' }} />
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="skeleton-product-item">
          <div className="skeleton-rank" />
          <div className="skeleton-product-info">
            <div className="skeleton-line" style={{ width: '50%' }} />
            <div className="skeleton-line" style={{ width: '20%' }} />
            <div className="skeleton-bar-track">
              <div className="skeleton-bar-fill" style={{ width: `${20 + Math.random() * 60}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>

    <style>{`
      .rd-skeleton {
        animation: fadeIn 0.3s ease;
        padding: 4px;
      }

      .rd-stats-skeleton {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }

      .rd-stat-card-skeleton {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px 20px;
        background: var(--bg-card);
        border-radius: 12px;
        border: 1px solid var(--border-color);
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      }

      .skeleton-icon-circle {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s ease-in-out infinite;
        flex-shrink: 0;
      }

      .skeleton-text-block {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .skeleton-line {
        height: 14px;
        background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
        background-size: 200% 100%;
        border-radius: 4px;
        animation: shimmer 1.5s ease-in-out infinite;
      }

      .skeleton-number {
        height: 28px;
        border-radius: 6px;
      }

      .rd-charts-skeleton {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 24px;
        margin-bottom: 24px;
      }

      .skeleton-chart-card {
        background: var(--bg-card);
        border-radius: 12px;
        border: 1px solid var(--border-color);
        padding: 20px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
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
        transition: height 0.3s ease;
      }

      .skeleton-methods {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .skeleton-method-item {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }

      .skeleton-bar-track {
        width: 100%;
        height: 8px;
        background: #e2e8f0;
        border-radius: 4px;
        overflow: hidden;
        margin-top: 4px;
      }

      .skeleton-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 100%);
        border-radius: 4px;
        animation: shimmer 1.5s ease-in-out infinite;
        background-size: 200% 100%;
      }

      .skeleton-products-card {
        background: var(--bg-card);
        border-radius: 12px;
        border: 1px solid var(--border-color);
        padding: 20px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      }

      .skeleton-product-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 0;
        border-bottom: 1px solid #f1f5f9;
      }

      .skeleton-product-item:last-child {
        border-bottom: none;
      }

      .skeleton-rank {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s ease-in-out infinite;
        flex-shrink: 0;
      }

      .skeleton-product-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @media (max-width: 992px) {
        .rd-charts-skeleton {
          grid-template-columns: 1fr;
          gap: 16px;
        }
      }

      @media (max-width: 768px) {
        .rd-stats-skeleton {
          grid-template-columns: 1fr 1fr;
        }

        .skeleton-bars {
          height: 120px;
        }
      }

      @media (max-width: 480px) {
        .rd-stats-skeleton {
          grid-template-columns: 1fr;
        }

        .rd-stat-card-skeleton {
          padding: 12px 16px;
        }

        .skeleton-icon-circle {
          width: 36px;
          height: 36px;
        }
      }
    `}</style>
  </div>
);

// ─── StatCard ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, detail, color, bg }) {
  return (
    <div className="rd-stat-card">
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

// ─── Componente Principal ────────────────────────────────────────────────────

export default function RetailDashboardPage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth('/retail/stats');
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
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
        title="DASHBOARD RETAIL"
        subtitle="Ventas del día"
        theme="business"
        loading={false}
        headerAction={refreshButton}
        error={error}
      >
        <RetailDashboardSkeleton />
      </PageTemplate>
    );
  }

  return (
    <PageTemplate
      title="DASHBOARD RETAIL"
      subtitle="Ventas del día"
      theme="business"
      loading={loading}
      headerAction={refreshButton}
      error={error}
      onRetry={() => load(false)}
    >
      <div className="rd-page">

        {/* ── Stats ── */}
        <div className="rd-stats">
          <StatCard
            icon={<FiTrendingUp size={24} />}
            label="Ventas hoy"
            value={fmt(data?.total_ventas ?? 0)}
            detail={`${data?.transacciones ?? 0} transacciones`}
            color="var(--text-primary)"
            bg="rgba(16,185,129,0.16)"
          />
          <StatCard
            icon={<FiShoppingBag size={24} />}
            label="Ticket promedio"
            value={fmt(data?.ticket_promedio ?? 0)}
            detail="Promedio por venta"
            color="var(--text-primary)"
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
            color="var(--text-primary)"
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