import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Search, Grid, List, Clock, X, ChevronRight, CheckCircle } from 'react-feather';
import PageTemplate from '../../components/PageTemplate';
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/OrdersTablesPage.css';

// ── Configuración de estados ──────────────────────────────────────────────────

const STATUS = {
  pending:   { label: 'Pendiente',      color: '#f59e0b', bg: 'rgba(245,158,11,.15)'  },
  sent:      { label: 'En preparación', color: '#3b82f6', bg: 'rgba(59,130,246,.15)'  },
  completed: { label: 'Lista',          color: '#22c55e', bg: 'rgba(34,197,94,.15)'   },
  paid:      { label: 'Pagada',         color: '#64748b', bg: 'rgba(100,116,139,.15)' },
};

const NEXT = {
  pending:   { status: 'sent',      label: 'Enviar a cocina' },
  sent:      { status: 'completed', label: 'Marcar lista'    },
  completed: { status: 'paid',      label: 'Cobrar'          },
  paid:      null,
};

const ORDER_TYPE_LABEL = {
  dine_in:  'Mesa',
  take_away: 'Llevar',
  delivery: 'Delivery',
  quick:    'Rápido',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function elapsed(dateStr) {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60)   return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

const fmt = n => `$${Number(n || 0).toFixed(2)}`;

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.pending;
  return (
    <span className="ot-badge" style={{ color: s.color, background: s.bg }}>
      <span className="ot-badge-dot" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function OrdersTablesPage() {
  const [orders,        setOrders]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [error,         setError]         = useState('');
  const [view,          setView]          = useState('mesas');   // 'mesas' | 'lista'
  const [filter,        setFilter]        = useState('active');  // 'active'|'pending'|'sent'|'completed'|'paid'
  const [search,        setSearch]        = useState('');
  const [selected,      setSelected]      = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const intervalRef = useRef(null);

  // ── Carga de datos ──────────────────────────────────────────────────────────

  const loadOrders = useCallback(async (silent = false) => {
    silent ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth('/api/ordenes?limit=200');
      if (!res.ok) throw new Error('Error al cargar órdenes');
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    intervalRef.current = setInterval(() => loadOrders(true), 15000);
    return () => clearInterval(intervalRef.current);
  }, [loadOrders]);

  // Sincroniza el modal cuando llegan datos frescos
  useEffect(() => {
    if (!selected || orders.length === 0) return;
    const fresh = orders.find(o => o.id === selected.id);
    if (fresh) setSelected(fresh);
  }, [orders]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cambio de estado ────────────────────────────────────────────────────────

  const advanceStatus = useCallback(async (order, e) => {
    e?.stopPropagation();
    const next = NEXT[order.status];
    if (!next || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetchWithAuth(`/api/ordenes/${order.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next.status }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Error al actualizar');
      }
      await loadOrders(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  }, [actionLoading, loadOrders]);

  // ── Filtrado / agrupado ─────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = orders;
    if      (filter === 'active') list = list.filter(o => o.status !== 'paid');
    else if (filter !== 'all')    list = list.filter(o => o.status === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(o =>
        String(o.mesa_numero || '').includes(q) ||
        String(o.order_number || '').toLowerCase().includes(q) ||
        String(o.customer_name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, filter, search]);

  // Para la vista de mesas: una card por mesa (la más reciente por mesa)
  const mesaCards = useMemo(() => {
    const map = new Map();
    for (const o of filtered) {
      const key = o.mesa_numero != null ? `m${o.mesa_numero}` : `o${o.id}`;
      if (!map.has(key) || new Date(o.created_at) > new Date(map.get(key).created_at)) {
        map.set(key, o);
      }
    }
    return [...map.values()].sort((a, b) => {
      const am = a.mesa_numero ?? 9999;
      const bm = b.mesa_numero ?? 9999;
      return am !== bm ? am - bm : new Date(b.created_at) - new Date(a.created_at);
    });
  }, [filtered]);

  // Contadores para el stats bar
  const stats = useMemo(() => ({
    active:    orders.filter(o => o.status !== 'paid').length,
    pending:   orders.filter(o => o.status === 'pending').length,
    sent:      orders.filter(o => o.status === 'sent').length,
    completed: orders.filter(o => o.status === 'completed').length,
  }), [orders]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <PageTemplate title="Gestión de Mesas" subtitle="Órdenes activas en tiempo real">
      <div className="ot-wrap">

        {/* ── Stats ── */}
        <div className="ot-stats">
          <div className="ot-stat">
            <span className="ot-stat-val">{stats.active}</span>
            <span className="ot-stat-lbl">Activas</span>
          </div>
          <div className="ot-stat ot-stat--amber">
            <span className="ot-stat-val">{stats.pending}</span>
            <span className="ot-stat-lbl">Pendientes</span>
          </div>
          <div className="ot-stat ot-stat--blue">
            <span className="ot-stat-val">{stats.sent}</span>
            <span className="ot-stat-lbl">En cocina</span>
          </div>
          <div className="ot-stat ot-stat--green">
            <span className="ot-stat-val">{stats.completed}</span>
            <span className="ot-stat-lbl">Listas</span>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="ot-toolbar">
          <div className="ot-search">
            <Search size={15} />
            <input
              placeholder="Buscar por mesa, nº de orden o cliente…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="ot-toolbar-right">
            <button
              className={`ot-icon-btn ${view === 'mesas' ? 'active' : ''}`}
              onClick={() => setView('mesas')}
              title="Vista mesas"
            >
              <Grid size={15} /> Mesas
            </button>
            <button
              className={`ot-icon-btn ${view === 'lista' ? 'active' : ''}`}
              onClick={() => setView('lista')}
              title="Vista lista"
            >
              <List size={15} /> Lista
            </button>
            <button
              className={`ot-icon-btn refresh ${refreshing ? 'spinning' : ''}`}
              onClick={() => loadOrders(true)}
              disabled={refreshing}
              title="Actualizar"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* ── Filtro de estado ── */}
        <div className="ot-tabs">
          {[
            { key: 'active',    label: `Activas (${stats.active})`       },
            { key: 'pending',   label: `Pendientes (${stats.pending})`   },
            { key: 'sent',      label: `En cocina (${stats.sent})`       },
            { key: 'completed', label: `Listas (${stats.completed})`     },
            { key: 'paid',      label: 'Pagadas'                         },
          ].map(t => (
            <button
              key={t.key}
              className={`ot-tab ${filter === t.key ? 'active' : ''}`}
              onClick={() => setFilter(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Error ── */}
        {error && <div className="ot-error">⚠ {error}</div>}

        {/* ── Contenido ── */}
        {loading ? (
          <div className="ot-loading">
            <div className="ot-spinner" />
            <span>Cargando órdenes…</span>
          </div>

        ) : filtered.length === 0 ? (
          <div className="ot-empty">
            <CheckCircle size={48} />
            <p>No hay órdenes {filter === 'active' ? 'activas' : 'en este estado'}</p>
          </div>

        ) : view === 'mesas' ? (
          /* ── Vista Mesas ── */
          <div className="ot-mesa-grid">
            {mesaCards.map(order => {
              const s    = STATUS[order.status] || STATUS.pending;
              const next = NEXT[order.status];
              const items = order.items || [];
              return (
                <div
                  key={order.id}
                  className="ot-mesa-card"
                  style={{ '--sc': s.color }}
                  onClick={() => setSelected(order)}
                >
                  <div className="ot-mesa-body">
                    <div className="ot-mesa-top">
                      <div className="ot-mesa-num">
                        {order.mesa_numero != null
                          ? <><span>Mesa</span><strong>{order.mesa_numero}</strong></>
                          : <strong>{ORDER_TYPE_LABEL[order.order_type] || 'Orden'}</strong>
                        }
                      </div>
                      <span
                        className="ot-mesa-badge"
                        style={{ color: s.color, background: s.bg }}
                      >
                        {s.label}
                      </span>
                    </div>

                    <div className="ot-mesa-meta">
                      <span className="ot-mesa-ordernum">#{order.order_number}</span>
                      {order.customer_name && (
                        <span className="ot-mesa-client">{order.customer_name}</span>
                      )}
                    </div>

                    <div className="ot-mesa-items-list">
                      {items.slice(0, 3).map((it, i) => (
                        <div key={i} className="ot-mesa-item-row">
                          <span className="ot-mesa-iqty">{it.quantity}x</span>
                          <span className="ot-mesa-iname">{it.product_name}</span>
                        </div>
                      ))}
                      {items.length > 3 && (
                        <div className="ot-mesa-more">+{items.length - 3} más…</div>
                      )}
                    </div>
                  </div>

                  <div className="ot-mesa-footer">
                    <span className="ot-mesa-elapsed">
                      <Clock size={11} />
                      {elapsed(order.created_at)}
                    </span>
                    <span className="ot-mesa-total">{fmt(order.total)}</span>
                  </div>

                  {next && (
                    <button
                      className="ot-mesa-action-btn"
                      onClick={e => advanceStatus(order, e)}
                      disabled={actionLoading}
                    >
                      {next.label} <ChevronRight size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

        ) : (
          /* ── Vista Lista ── */
          <div className="ot-list-wrap">
            <table className="ot-list">
              <thead>
                <tr>
                  <th>Mesa / Tipo</th>
                  <th>Orden</th>
                  <th>Cliente</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Tiempo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => {
                  const s    = STATUS[order.status] || STATUS.pending;
                  const next = NEXT[order.status];
                  return (
                    <tr
                      key={order.id}
                      className="ot-list-row"
                      onClick={() => setSelected(order)}
                    >
                      <td>
                        <div className="ot-list-mesa-cell">
                          {order.mesa_numero != null
                            ? <span className="ot-list-mesa">Mesa {order.mesa_numero}</span>
                            : <span className="ot-list-type">{ORDER_TYPE_LABEL[order.order_type] || '—'}</span>
                          }
                        </div>
                      </td>
                      <td className="ot-list-num">#{order.order_number}</td>
                      <td className="ot-list-client">{order.customer_name || '—'}</td>
                      <td className="ot-list-items">{(order.items || []).length} items</td>
                      <td className="ot-list-total">{fmt(order.total)}</td>
                      <td><StatusBadge status={order.status} /></td>
                      <td>
                        <span className="ot-list-elapsed">
                          <Clock size={12} />
                          {elapsed(order.created_at)}
                        </span>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        {next && (
                          <button
                            className="ot-list-action-btn"
                            style={{ color: s.color, borderColor: s.color }}
                            onClick={e => advanceStatus(order, e)}
                            disabled={actionLoading}
                          >
                            {next.label}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Modal de detalle ── */}
        {selected && (
          <>
            <div className="ot-overlay" onClick={() => setSelected(null)} />
            <div className="ot-modal">

              {/* Cabecera del modal */}
              <div className="ot-modal-head">
                <div>
                  <div className="ot-modal-title">
                    {selected.mesa_numero != null
                      ? `Mesa ${selected.mesa_numero}`
                      : ORDER_TYPE_LABEL[selected.order_type] || 'Orden'
                    }
                    <span className="ot-modal-ordernum">#{selected.order_number}</span>
                  </div>
                  <div className="ot-modal-meta">
                    {selected.customer_name && <span>{selected.customer_name}</span>}
                    <span className="ot-modal-elapsed">
                      <Clock size={12} />
                      {elapsed(selected.created_at)}
                    </span>
                    <StatusBadge status={selected.status} />
                  </div>
                </div>
                <button className="ot-modal-close" onClick={() => setSelected(null)}>
                  <X size={18} />
                </button>
              </div>

              {/* Items */}
              <div className="ot-modal-section">
                {(selected.items || []).map((item, i) => (
                  <div key={i} className="ot-modal-item-card">
                    <div className="ot-modal-item-left">
                      <span className="ot-modal-item-qty">{item.quantity}x</span>
                      <div>
                        <div className="ot-modal-item-name">{item.product_name}</div>
                        {item.notes && (
                          <div className="ot-modal-item-note">📝 {item.notes}</div>
                        )}
                      </div>
                    </div>
                    <div className="ot-modal-item-price">{fmt(item.line_total)}</div>
                  </div>
                ))}
              </div>

              <div className="ot-modal-divider" />

              {/* Totales */}
              <div className="ot-modal-totals">
                {selected.notas && (
                  <div className="ot-modal-notes-box">📝 {selected.notas}</div>
                )}
                <div className="ot-modal-row">
                  <span>Subtotal</span>
                  <span>{fmt(selected.subtotal)}</span>
                </div>
                {Number(selected.tax_amount) > 0 && (
                  <div className="ot-modal-row">
                    <span>IVA {selected.tax_rate}%</span>
                    <span>{fmt(selected.tax_amount)}</span>
                  </div>
                )}
                <div className="ot-modal-row ot-modal-row--main">
                  <span>Total</span>
                  <span>{fmt(selected.total)}</span>
                </div>
              </div>

              {/* Acción principal */}
              {NEXT[selected.status] && (
                <div className="ot-modal-actions">
                  <button
                    className="ot-modal-btn"
                    style={{ background: STATUS[selected.status]?.color || '#22c55e' }}
                    onClick={e => advanceStatus(selected, e)}
                    disabled={actionLoading}
                  >
                    {actionLoading
                      ? 'Procesando…'
                      : <>{NEXT[selected.status].label} <ChevronRight size={16} /></>
                    }
                  </button>
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </PageTemplate>
  );
}
