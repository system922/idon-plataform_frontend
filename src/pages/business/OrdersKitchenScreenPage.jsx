import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { FiClock, FiRefreshCw, FiCheck, FiPlay, FiRotateCcw, FiAlertCircle, FiVolume2, FiVolumeX } from 'react-icons/fi';
import { fetchWithAuth } from '../../config/apiBase';
import API_BASE from '../../config/apiBase';
import { useBusinessContext } from '../../admin/config/BusinessContext';
import { useSoundAlert } from '../../hooks/useSoundAlert';

// ── Helpers de tiempo ────────────────────────────────────────────────────────
function getElapsed(dateStr) {
  if (!dateStr) return '—';
  const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
}

function getElapsedColor(dateStr) {
  if (!dateStr) return '#64748b';
  const mins = (Date.now() - new Date(dateStr).getTime()) / 60000;
  if (mins < 10) return '#10b981';
  if (mins < 20) return '#f59e0b';
  return '#ef4444';
}

function groupItems(rawItems = []) {
  const groups = [];
  rawItems.forEach(item => {
    const notes = item.notes || item.notas || item.nota_cocina || item.observaciones || item.comentarios || '';
    if (notes.startsWith('__EXT__:')) {
      if (groups.length > 0) {
        const extra = notes.replace('__EXT__:', '').replace(/^\s*\+\s*/, '').trim();
        groups[groups.length - 1].extras.push(extra || item.product_name || item.nombre || '');
      }
    } else {
      const builtinExtras = Array.isArray(item.extras)
        ? item.extras.map(e => (typeof e === 'string' ? e : (e.name || e.nombre || e.descripcion || '')))
        : [];
      groups.push({
        id: item.id,
        name: item.product_name || item.nombre || item.descripcion || '—',
        qty: Number(item.quantity || item.cantidad) || 1,
        notes: notes || '',
        extras: builtinExtras,
      });
    }
  });
  return groups;
}

// ── Estilos de estado ────────────────────────────────────────────────────────
const ESTADO = {
  new:       { label: 'NUEVO',           bg: '#ef4444',             color: '#fff' },
  preparing: { label: 'EN PREPARACIÓN',  bg: '#f59e0b',             color: '#1a0a00' },
  ready:     { label: 'LISTO ✓',         bg: '#10b981',             color: '#fff' },
};

// ── Página ───────────────────────────────────────────────────────────────────
export default function OrdersKitchenScreenPage() {
  const { selectedBusiness } = useBusinessContext();
  const businessId = selectedBusiness?.id;
  const { playNewOrder } = useSoundAlert();

  const [orders, setOrders]           = useState([]);
  const [selectedId, setSelectedId]   = useState(null);
  const [detail, setDetail]           = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [kitchenState, setKitchenStateMap] = useState({});
  const [loading, setLoading]         = useState(true);
  const [tick, setTick]               = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const knownIdsRef = useRef(null); // ids cargados al inicio (no suenan)

  // Actualizar timers cada 15 s
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 15000);
    return () => clearInterval(t);
  }, []);

  // ── Cargar lista de órdenes pendientes ────────────────────────────────────
  const loadOrders = useCallback(async (fromSocket = false) => {
    try {
      const res = await fetchWithAuth('/api/ordenes?status=kitchen');
      if (!res.ok) return;
      const data = await res.json();
      const arr  = Array.isArray(data) ? data
        : (data?.data || data?.ordenes || data?.orders || []);

      const sorted = [...arr].sort((a, b) =>
        new Date(a.created_at || a.sale_date || 0) - new Date(b.created_at || b.sale_date || 0)
      );

      // Primera carga: registrar ids conocidos para no sonar por ellos
      if (knownIdsRef.current === null) {
        knownIdsRef.current = new Set(sorted.map(o => o.id));
      } else if (fromSocket && soundEnabled) {
        const hasNew = sorted.some(o =>
          !knownIdsRef.current.has(o.id) && o.status === 'pending'
        );
        if (hasNew) playNewOrder();
        sorted.forEach(o => knownIdsRef.current.add(o.id));
      }

      setOrders(sorted);
      // Sincronizar estado de cocina desde la BD (null → new)
      const dbToKitchen = { pending: 'new', sent: 'preparing', completed: 'ready' };
      setKitchenStateMap(prev => {
        const next = { ...prev };
        sorted.forEach(o => { next[o.id] = dbToKitchen[o.status] ?? 'new'; });
        Object.keys(next).forEach(id => {
          if (!sorted.find(o => o.id === id)) delete next[id];
        });
        return next;
      });
    } catch { } finally {
      setLoading(false);
    }
  }, [soundEnabled, playNewOrder]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // Refresco automático cada 30 s (respaldo al socket)
  useEffect(() => {
    const t = setInterval(loadOrders, 30000);
    return () => clearInterval(t);
  }, [loadOrders]);

  // ── Socket en tiempo real ─────────────────────────────────────────────────
  useEffect(() => {
    if (!businessId) return;
    const token = localStorage.getItem('idonToken') || localStorage.getItem('token');
    const socket = io(API_BASE, {
      auth: { token, businessId },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 8,
    });
    socket.on('new_order',    () => loadOrders(true));
    socket.on('data_changed', ({ entity }) => { if (entity === 'orders') loadOrders(); });
    return () => socket.disconnect();
  }, [businessId, loadOrders]);

  // ── Cargar detalle de la orden seleccionada ───────────────────────────────
  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    setLoadingDetail(true);
    fetchWithAuth(`/api/ordenes/${selectedId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const order = data.order || data.pedido || data;
        const items = order.items || data.items || [];
        setDetail({ ...order, items });
      })
      .catch(() => {})
      .finally(() => setLoadingDetail(false));
  }, [selectedId]);

  // ── Acciones de estado — persisten en BD ─────────────────────────────────
  const kitchenToDb = { new: 'pending', preparing: 'sent', ready: 'completed' };

  const setKS = useCallback(async (id, state) => {
    setKitchenStateMap(prev => ({ ...prev, [id]: state })); // optimistic
    try {
      if (state === 'ready') {
        await fetchWithAuth(`/api/ordenes/${id}/kitchen-ready`, { method: 'POST' });
      } else {
        await fetchWithAuth(`/api/ordenes/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: kitchenToDb[state] }),
        });
      }
    } catch {}
  }, []);

  const pendingOrders = orders.filter(o => kitchenState[o.id] !== 'ready');
  const readyOrders   = orders.filter(o => kitchenState[o.id] === 'ready');

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', height: 'calc(100vh - 60px)',
      background: '#060a12', color: '#f1f5f9',
      fontFamily: "'Inter', system-ui, sans-serif", overflow: 'hidden',
    }}>

      {/* ════ PANEL IZQUIERDO — Lista de órdenes ════════════════════════════ */}
      <div style={{
        width: 320, borderRight: '1px solid #1e293b',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
      }}>
        {/* Cabecera */}
        <div style={{
          padding: '14px 16px', background: '#0a1220',
          borderBottom: '1px solid #1e293b',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '0.5px' }}>
              🍳 PANTALLA DE COCINA
            </div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
              {pendingOrders.length} pendiente{pendingOrders.length !== 1 ? 's' : ''}
              {readyOrders.length > 0 && ` · ${readyOrders.length} listo${readyOrders.length !== 1 ? 's' : ''}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setSoundEnabled(v => !v)}
              title={soundEnabled ? 'Silenciar alertas' : 'Activar alertas de sonido'}
              style={{
                background: soundEnabled ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${soundEnabled ? '#10b981' : '#1e293b'}`,
                borderRadius: 8, color: soundEnabled ? '#10b981' : '#64748b',
                cursor: 'pointer', padding: '6px 10px',
                display: 'flex', alignItems: 'center', gap: 5, fontSize: 11,
              }}
            >
              {soundEnabled ? <FiVolume2 size={12} /> : <FiVolumeX size={12} />}
            </button>
            <button
              onClick={loadOrders}
              style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid #1e293b',
                borderRadius: 8, color: '#64748b', cursor: 'pointer',
                padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11,
              }}
            >
              <FiRefreshCw size={12} /> Actualizar
            </button>
          </div>
        </div>

        {/* Lista */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#334155', padding: 40, fontSize: 13 }}>
              Cargando órdenes…
            </div>
          ) : pendingOrders.length === 0 && readyOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>👨‍🍳</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#10b981' }}>¡Sin órdenes pendientes!</div>
              <div style={{ fontSize: 12, color: '#334155', marginTop: 6 }}>Todo listo en cocina</div>
            </div>
          ) : (
            <>
              {/* Pendientes */}
              {pendingOrders.map(order => {
                const ks        = kitchenState[order.id] || 'new';
                const isActive  = order.id === selectedId;
                const created   = order.created_at || order.sale_date;
                const itemCount = (order.items || []).filter(i =>
                  !(i.notes || '').startsWith('__EXT__:')).length;

                return (
                  <OrderCard
                    key={order.id}
                    order={order}
                    ks={ks}
                    isActive={isActive}
                    created={created}
                    itemCount={itemCount}
                    tick={tick}
                    onClick={() => setSelectedId(order.id)}
                  />
                );
              })}

              {/* Listos */}
              {readyOrders.length > 0 && (
                <>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: '#334155', letterSpacing: '1px',
                    textTransform: 'uppercase', padding: '12px 8px 6px',
                  }}>
                    Listos para mesa
                  </div>
                  {readyOrders.map(order => {
                    const isActive = order.id === selectedId;
                    return (
                      <div
                        key={order.id}
                        onClick={() => setSelectedId(order.id)}
                        style={{
                          background: isActive ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.04)',
                          border: `2px solid ${isActive ? '#10b981' : 'rgba(16,185,129,0.15)'}`,
                          borderRadius: 10, padding: '10px 12px', marginBottom: 6,
                          cursor: 'pointer', opacity: 0.75,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 900, fontSize: 16, color: '#10b981' }}>
                            Mesa {order.mesa_numero ?? order.order_type === 'take_away' ? 'LLEVAR' : '—'}
                          </span>
                          <span style={{ fontSize: 9, background: '#10b981', color: '#fff', borderRadius: 20, padding: '2px 8px', fontWeight: 800 }}>
                            LISTO ✓
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: '#334155', marginTop: 3 }}>
                          #{order.order_number || order.id.slice(0, 8)}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* ════ PANEL DERECHO — Detalle ════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selectedId ? (
          <EmptyDetail />
        ) : loadingDetail ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontSize: 14 }}>
            Cargando detalle…
          </div>
        ) : detail ? (
          <OrderDetail
            order={detail}
            ks={kitchenState[detail.id] || 'new'}
            tick={tick}
            onSetKS={(s) => setKS(detail.id, s)}
          />
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: 14 }}>
            <FiAlertCircle size={16} style={{ marginRight: 8 }} /> No se pudo cargar la orden
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tarjeta de orden en la lista ─────────────────────────────────────────────
function OrderCard({ order, ks, isActive, created, itemCount, tick, onClick }) {
  const E = ESTADO[ks] || ESTADO.new;
  return (
    <div
      onClick={onClick}
      style={{
        background: isActive
          ? 'rgba(104,66,254,0.12)'
          : ks === 'preparing' ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.03)',
        border: `2px solid ${isActive ? '#6842fe' : ks === 'preparing' ? '#f59e0b44' : '#1e293b'}`,
        borderRadius: 12, padding: '12px 14px', marginBottom: 8,
        cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 22, fontWeight: 900, color: '#f1f5f9' }}>
          {order.mesa_numero != null ? `Mesa ${order.mesa_numero}` : order.order_type === 'take_away' ? '🥡 Llevar' : '—'}
        </span>
        <span style={{
          fontSize: 9, fontWeight: 800, padding: '3px 9px', borderRadius: 20,
          background: E.bg, color: E.color, letterSpacing: '0.5px', whiteSpace: 'nowrap',
        }}>
          {E.label}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: '#475569' }}>
        <span>#{order.order_number || order.id.slice(0, 8)}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, color: getElapsedColor(created) }}>
          <FiClock size={10} /> {getElapsed(created)}
        </div>
      </div>

      <div style={{ marginTop: 6, fontSize: 11, color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{itemCount} producto{itemCount !== 1 ? 's' : ''}</span>
        {(order.notas || order.notes) && (
          <span style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 3, fontSize: 10 }}>
            📝
          </span>
        )}
      </div>
      {(order.notas || order.notes) && (
        <div style={{
          marginTop: 5, fontSize: 10, color: '#fbbf24',
          background: 'rgba(245,158,11,0.07)', borderRadius: 6,
          padding: '3px 7px', overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {order.notas || order.notes}
        </div>
      )}
    </div>
  );
}

// ── Detalle de orden seleccionada ────────────────────────────────────────────
function OrderDetail({ order, ks, tick, onSetKS }) {
  const created = order.created_at || order.sale_date;
  const items   = groupItems(order.items || []);
  const E       = ESTADO[ks] || ESTADO.new;

  return (
    <>
      {/* Cabecera del detalle */}
      <div style={{
        padding: '20px 28px', background: '#0a1220',
        borderBottom: '1px solid #1e293b',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 14,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 36, fontWeight: 900, lineHeight: 1 }}>
              {order.mesa_numero != null ? `Mesa ${order.mesa_numero}` : order.order_type === 'take_away' ? '🥡 Llevar' : '—'}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 20,
              background: E.bg, color: E.color,
            }}>
              {E.label}
            </span>
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: '#475569', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span>#{order.order_number || order.id?.slice(0, 8)}</span>
            {created && (
              <span style={{ color: getElapsedColor(created), fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <FiClock size={12} /> {getElapsed(created)} esperando
              </span>
            )}
            <span style={{ color: '#334155' }}>{items.length} ítem{items.length !== 1 ? 's' : ''}</span>
          </div>
          {(order.notas || order.notes) && (
            <div style={{
              marginTop: 10, fontSize: 14, color: '#fde68a',
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 8, padding: '8px 14px',
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontWeight: 700,
            }}>
              📝 Nota del pedido: {order.notas || order.notes}
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {ks === 'new' && (
            <button
              onClick={() => onSetKS('preparing')}
              style={btnStyle('#f59e0b', '#1a0a00')}
            >
              <FiPlay size={15} /> Iniciar Preparación
            </button>
          )}
          {ks !== 'ready' && (
            <button
              onClick={() => onSetKS('ready')}
              style={btnStyle('#10b981', '#fff')}
            >
              <FiCheck size={15} /> Listo para Mesa
            </button>
          )}
          {ks === 'ready' && (
            <button
              onClick={() => onSetKS('preparing')}
              style={btnStyle('rgba(255,255,255,0.08)', '#94a3b8', '#1e293b')}
            >
              <FiRotateCcw size={14} /> Devolver a Cocina
            </button>
          )}
        </div>
      </div>

      {/* Items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 14,
        }}>
          {items.map((item, i) => (
            <ItemCard key={i} item={item} index={i} />
          ))}
        </div>
      </div>
    </>
  );
}

// ── Tarjeta de ítem ───────────────────────────────────────────────────────────
function ItemCard({ item, index }) {
  return (
    <div style={{
      background: '#0d1726', border: '1.5px solid #1e293b',
      borderRadius: 14, padding: '16px 20px',
      display: 'flex', alignItems: 'flex-start', gap: 16,
    }}>
      {/* Cantidad */}
      <div style={{
        width: 52, height: 52, background: '#1e293b',
        borderRadius: 12, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 26, fontWeight: 900,
        color: '#f1f5f9', flexShrink: 0,
      }}>
        {item.qty}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.3 }}>
          {item.name}
        </div>

        {item.extras.length > 0 && (
          <div style={{ marginTop: 8, borderTop: '1px solid #1e3a5f', paddingTop: 7 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: '#10b981', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 4 }}>
              Extras
            </div>
            {item.extras.map((e, ei) => (
              <div key={ei} style={{
                fontSize: 13, color: '#6ee7b7',
                display: 'flex', alignItems: 'center', gap: 6, marginTop: 4,
                fontWeight: 600,
              }}>
                <span style={{
                  width: 18, height: 18, background: 'rgba(16,185,129,0.15)',
                  border: '1px solid #10b981', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 900, color: '#10b981', flexShrink: 0,
                }}>+</span>
                {e}
              </div>
            ))}
          </div>
        )}

        {item.notes && (
          <div style={{
            marginTop: 8, fontSize: 13, color: '#fde68a',
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 8, padding: '6px 10px',
            display: 'flex', alignItems: 'flex-start', gap: 6,
            fontWeight: 600,
          }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>📝</span>
            <span>{item.notes}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Estado vacío ─────────────────────────────────────────────────────────────
function EmptyDetail() {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', color: '#1e293b',
    }}>
      <div style={{ fontSize: 72, marginBottom: 16 }}>👨‍🍳</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#334155' }}>
        Selecciona una orden
      </div>
      <div style={{ fontSize: 13, color: '#1e293b', marginTop: 8 }}>
        Haz clic en una orden del panel izquierdo para ver su detalle
      </div>
    </div>
  );
}

// ── Utilidad estilos botón ────────────────────────────────────────────────────
function btnStyle(bg, color, borderColor) {
  return {
    padding: '12px 22px', background: bg, color,
    border: `1.5px solid ${borderColor || bg}`,
    borderRadius: 10, fontWeight: 800, fontSize: 14,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
    whiteSpace: 'nowrap',
  };
}
