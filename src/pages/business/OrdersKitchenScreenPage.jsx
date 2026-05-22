import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  FiClock, FiRefreshCw, FiCheck, FiPlay, FiRotateCcw,
  FiAlertCircle, FiVolume2, FiVolumeX, FiHash,
  FiMessageSquare, FiPackage, FiCoffee, FiMusic, FiChevronDown,
  FiZap, FiBell, FiRadio, FiWind,
} from 'react-icons/fi';
import { MdOutlineTableRestaurant, MdOutlineTakeoutDining } from 'react-icons/md';
import { fetchWithAuth } from '../../config/apiBase';
import API_BASE from '../../config/apiBase';
import { useBusinessContext } from '../../admin/config/BusinessContext';
import { useSoundAlert } from '../../hooks/useSoundAlert';

// ── CSS animations ────────────────────────────────────────────────────────────
const STYLES = `
  @keyframes kSlideLeft {
    from { opacity: 0; transform: translateX(-18px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes kFadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes kSlideRight {
    from { opacity: 0; transform: translateX(28px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes kPopIn {
    0%   { opacity: 0; transform: scale(0.85); }
    65%  { transform: scale(1.05); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes kFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes kPulseRed {
    0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.55); }
    50%       { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
  }
  @keyframes kBreath {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.6; }
  }
  @keyframes kSpin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes kReadyIn {
    from { opacity: 0; transform: translateX(-10px) scale(0.97); }
    to   { opacity: 0.8; transform: translateX(0) scale(1); }
  }
  @keyframes kGlow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.0); }
    50%       { box-shadow: 0 0 12px 2px rgba(16,185,129,0.25); }
  }

  .k-card {
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease !important;
  }
  .k-card:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 6px 24px rgba(0,0,0,0.35) !important;
  }
  .k-card:active {
    transform: scale(0.98) translateY(0) !important;
  }

  .k-ready-card {
    transition: transform 0.18s ease, opacity 0.18s ease, border-color 0.18s ease !important;
  }
  .k-ready-card:hover {
    transform: translateX(3px) !important;
    opacity: 1 !important;
  }

  .k-btn {
    transition: filter 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease !important;
  }
  .k-btn:hover {
    filter: brightness(1.15) !important;
    transform: translateY(-2px) !important;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3) !important;
  }
  .k-btn:active {
    transform: scale(0.96) translateY(0) !important;
    filter: brightness(0.95) !important;
  }

  .k-icon-btn {
    transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.15s !important;
  }
  .k-icon-btn:hover {
    transform: scale(1.08) !important;
  }
  .k-icon-btn:active {
    transform: scale(0.94) !important;
  }

  .k-item-card {
    transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
  }
  .k-item-card:hover {
    border-color: #4f46e5 !important;
    box-shadow: 0 0 0 1px rgba(99,102,241,0.25), 0 4px 16px rgba(0,0,0,0.25) !important;
  }
`;

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

const ESTADO = {
  new:       { label: 'NUEVO',          bg: '#ef4444', color: '#fff'    },
  preparing: { label: 'EN PREPARACIÓN', bg: '#f59e0b', color: '#1a0a00' },
  ready:     { label: 'LISTO',          bg: '#10b981', color: '#fff'    },
};

// ── Página ───────────────────────────────────────────────────────────────────
export default function OrdersKitchenScreenPage() {
  const { selectedBusiness } = useBusinessContext();
  const businessId = selectedBusiness?.id;
  const { sounds } = useSoundAlert();
  const soundFnRef = useRef(null);

  const [orders, setOrders]                = useState([]);
  const [selectedId, setSelectedId]        = useState(null);
  const [detail, setDetail]                = useState(null);
  const [loadingDetail, setLoadingDetail]  = useState(false);
  const [kitchenState, setKitchenStateMap] = useState({});
  const [loading, setLoading]              = useState(true);
  const [tick, setTick]                    = useState(0);
  const [soundEnabled, setSoundEnabled]    = useState(true);
  const [spinning, setSpinning]            = useState(false);
  const [selectedSound, setSelectedSound]  = useState(
    () => localStorage.getItem('kitchenSound') || 'pulsos'
  );
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const knownIdsRef = useRef(null);
  const pickerRef   = useRef(null);

  // Ref siempre apunta al sonido activo (evita stale closure en loadOrders)
  soundFnRef.current = sounds[selectedSound]?.fn ?? sounds.pulsos.fn;

  // Cerrar picker al hacer clic fuera
  useEffect(() => {
    if (!showSoundPicker) return;
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowSoundPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSoundPicker]);

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 15000);
    return () => clearInterval(t);
  }, []);

  const loadOrders = useCallback(async (fromSocket = false) => {
    try {
      const res = await fetchWithAuth('/api/ordenes?status=kitchen');
      if (!res.ok) return;
      const data = await res.json();
      const arr  = Array.isArray(data) ? data : (data?.data || data?.ordenes || data?.orders || []);
      const sorted = [...arr].sort((a, b) =>
        new Date(a.created_at || a.sale_date || 0) - new Date(b.created_at || b.sale_date || 0)
      );

      if (knownIdsRef.current === null) {
        knownIdsRef.current = new Set(sorted.map(o => o.id));
      } else if (fromSocket && soundEnabled) {
        const hasNew = sorted.some(o => !knownIdsRef.current.has(o.id) && o.status === 'pending');
        if (hasNew) soundFnRef.current?.();
        sorted.forEach(o => knownIdsRef.current.add(o.id));
      }

      setOrders(sorted);
      const dbToKitchen = { pending: 'new', sent: 'preparing', completed: 'ready' };
      setKitchenStateMap(prev => {
        const next = { ...prev };
        sorted.forEach(o => { next[o.id] = dbToKitchen[o.status] ?? 'new'; });
        Object.keys(next).forEach(id => { if (!sorted.find(o => o.id === id)) delete next[id]; });
        return next;
      });
    } catch { } finally {
      setLoading(false);
    }
  }, [soundEnabled]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  useEffect(() => {
    const t = setInterval(loadOrders, 30000);
    return () => clearInterval(t);
  }, [loadOrders]);

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

  const kitchenToDb = { new: 'pending', preparing: 'sent', ready: 'completed' };

  const setKS = useCallback(async (id, state) => {
    setKitchenStateMap(prev => ({ ...prev, [id]: state }));
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

  const handleRefresh = useCallback(() => {
    setSpinning(true);
    loadOrders().finally(() => setTimeout(() => setSpinning(false), 600));
  }, [loadOrders]);

  const pendingOrders = orders.filter(o => kitchenState[o.id] !== 'ready');
  const readyOrders   = orders.filter(o => kitchenState[o.id] === 'ready');

  return (
    <>
      <style>{STYLES}</style>
      <div style={{
        display: 'flex', height: 'calc(100vh - 60px)',
        background: '#080d16', color: '#f1f5f9',
        fontFamily: "'Inter', system-ui, sans-serif", overflow: 'hidden',
      }}>

        {/* ════ PANEL IZQUIERDO ══════════════════════════════════════════════ */}
        <div style={{
          width: 300, borderRight: '1px solid #141e2e',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
          background: '#09101d',
        }}>
          {/* Cabecera */}
          <div style={{
            padding: '14px 16px', background: '#09101d',
            borderBottom: '1px solid #141e2e',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            animation: 'kFadeIn 0.4s ease both',
            position: 'relative', zIndex: 50,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, background: 'rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <FiCoffee size={16} color="#818cf8" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: '0.5px', color: '#f1f5f9' }}>COCINA</div>
                <div style={{ fontSize: 10, color: '#334155', marginTop: 1 }}>
                  <span style={{ color: pendingOrders.length > 0 ? '#f59e0b' : '#334155', transition: 'color 0.4s' }}>
                    {pendingOrders.length} pendiente{pendingOrders.length !== 1 ? 's' : ''}
                  </span>
                  {readyOrders.length > 0 && (
                    <span style={{ color: '#10b981', animation: 'kFadeIn 0.3s ease both' }}>
                      {' · '}{readyOrders.length} listo{readyOrders.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, position: 'relative' }} ref={pickerRef}>
              {/* Selector de sonido */}
              <IconBtn
                onClick={() => setShowSoundPicker(v => !v)}
                title="Seleccionar sonido"
                active={showSoundPicker}
              >
                <FiMusic size={13} />
                <FiChevronDown size={10} style={{ marginLeft: 2, transition: 'transform 0.2s', transform: showSoundPicker ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              </IconBtn>

              {/* Silenciar */}
              <IconBtn
                onClick={() => setSoundEnabled(v => !v)}
                title={soundEnabled ? 'Silenciar' : 'Activar sonido'}
                active={soundEnabled} activeColor="#10b981"
              >
                {soundEnabled ? <FiVolume2 size={13} /> : <FiVolumeX size={13} />}
              </IconBtn>

              {/* Actualizar */}
              <IconBtn onClick={handleRefresh} title="Actualizar">
                <FiRefreshCw size={13} style={spinning ? { animation: 'kSpin 0.6s linear' } : {}} />
              </IconBtn>

              {/* Dropdown picker */}
              {showSoundPicker && (
                <SoundPicker
                  sounds={sounds}
                  selectedSound={selectedSound}
                  onSelect={(key, fn) => {
                    setSelectedSound(key);
                    localStorage.setItem('kitchenSound', key);
                    fn();
                    setShowSoundPicker(false);
                  }}
                />
              )}
            </div>
          </div>

          {/* Lista */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
            {loading ? (
              <LoadingState />
            ) : pendingOrders.length === 0 && readyOrders.length === 0 ? (
              <EmptyList />
            ) : (
              <>
                {pendingOrders.map((order, idx) => {
                  const ks        = kitchenState[order.id] || 'new';
                  const isActive  = order.id === selectedId;
                  const created   = order.created_at || order.sale_date;
                  const itemCount = (order.items || []).filter(i =>
                    !(i.notes || '').startsWith('__EXT__:')).length;
                  return (
                    <OrderCard
                      key={order.id} order={order} ks={ks} isActive={isActive}
                      created={created} itemCount={itemCount} tick={tick} index={idx}
                      onClick={() => setSelectedId(order.id)}
                    />
                  );
                })}

                {readyOrders.length > 0 && (
                  <>
                    <div style={{
                      fontSize: 9, fontWeight: 700, color: '#1e3a5f', letterSpacing: '1.5px',
                      textTransform: 'uppercase', padding: '14px 8px 6px',
                      display: 'flex', alignItems: 'center', gap: 6,
                      animation: 'kFadeIn 0.3s ease both',
                    }}>
                      <FiCheck size={10} /> Listos para mesa
                    </div>
                    {readyOrders.map((order, idx) => {
                      const isActive   = order.id === selectedId;
                      const isTakeAway = order.order_type === 'take_away';
                      return (
                        <div
                          key={order.id} onClick={() => setSelectedId(order.id)}
                          className="k-ready-card"
                          style={{
                            background: isActive ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.03)',
                            border: `1.5px solid ${isActive ? '#10b981' : 'rgba(16,185,129,0.12)'}`,
                            borderRadius: 12, padding: '10px 12px', marginBottom: 6,
                            cursor: 'pointer', opacity: 0.8,
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            animation: `kReadyIn 0.35s ease both`,
                            animationDelay: `${idx * 0.05}s`,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {isTakeAway
                              ? <MdOutlineTakeoutDining size={16} color="#10b981" />
                              : <MdOutlineTableRestaurant size={16} color="#10b981" />
                            }
                            <div>
                              <div style={{ fontWeight: 800, fontSize: 13, color: '#10b981' }}>
                                {order.mesa_numero != null ? `Mesa ${order.mesa_numero}` : isTakeAway ? 'Llevar' : '—'}
                              </div>
                              <div style={{ fontSize: 10, color: '#1e3a5f', marginTop: 1 }}>
                                #{order.order_number || order.id.slice(0, 8)}
                              </div>
                            </div>
                          </div>
                          <span style={{
                            fontSize: 9, background: 'rgba(16,185,129,0.15)', color: '#10b981',
                            borderRadius: 20, padding: '3px 8px', fontWeight: 800, letterSpacing: '0.5px',
                            animation: 'kGlow 2.5s ease-in-out infinite',
                          }}>
                            LISTO ✓
                          </span>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* ════ PANEL DERECHO — Detalle ════════════════════════════════════ */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selectedId ? (
            <EmptyDetail />
          ) : loadingDetail ? (
            <LoadingDetail />
          ) : detail ? (
            <OrderDetail
              key={detail.id}
              order={detail} ks={kitchenState[detail.id] || 'new'}
              tick={tick}
              onSetKS={(s) => { setKS(detail.id, s); if (s === 'ready') setSelectedId(null); }}
            />
          ) : (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#ef4444', fontSize: 14, gap: 8, animation: 'kFadeIn 0.3s ease',
            }}>
              <FiAlertCircle size={16} /> No se pudo cargar la orden
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Tarjeta de orden en la lista ──────────────────────────────────────────────
function OrderCard({ order, ks, isActive, created, itemCount, tick, index, onClick }) {
  const E = ESTADO[ks] || ESTADO.new;
  const isTakeAway = order.order_type === 'take_away';
  const orderNote  = order.notas || order.notes;

  const borderColor = isActive ? '#6366f1'
    : ks === 'preparing' ? 'rgba(245,158,11,0.45)'
    : '#141e2e';
  const bgColor = isActive ? 'rgba(99,102,241,0.1)'
    : ks === 'preparing' ? 'rgba(245,158,11,0.05)'
    : 'rgba(255,255,255,0.02)';

  return (
    <div
      onClick={onClick}
      className="k-card"
      style={{
        background: bgColor,
        border: `1.5px solid ${borderColor}`,
        borderRadius: 12, padding: '12px 14px', marginBottom: 7,
        cursor: 'pointer',
        animation: `kSlideLeft 0.32s ease both`,
        animationDelay: `${index * 0.055}s`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isTakeAway
            ? <MdOutlineTakeoutDining size={18} color="#a78bfa" />
            : <MdOutlineTableRestaurant size={18} color="#94a3b8" />
          }
          <span style={{ fontSize: 17, fontWeight: 900, color: '#f1f5f9', lineHeight: 1 }}>
            {order.mesa_numero != null ? `Mesa ${order.mesa_numero}` : isTakeAway ? 'Llevar' : '—'}
          </span>
        </div>
        <StatusBadge label={E.label} bg={E.bg} color={E.color} ks={ks} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#334155', fontSize: 11 }}>
          <FiHash size={10} />
          <span>{order.order_number || order.id.slice(0, 8)}</span>
          <span style={{ color: '#1e293b' }}>·</span>
          <FiPackage size={10} />
          <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700,
          color: getElapsedColor(created), fontSize: 11, transition: 'color 1s ease',
        }}>
          <FiClock size={10} /> {getElapsed(created)}
        </div>
      </div>

      {orderNote && (
        <div style={{
          marginTop: 7, fontSize: 10,
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)',
          borderRadius: 6, padding: '4px 8px',
          display: 'flex', alignItems: 'center', gap: 5,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          <FiMessageSquare size={9} color="#f59e0b" />
          <span style={{ color: '#fbbf24', overflow: 'hidden', textOverflow: 'ellipsis' }}>{orderNote}</span>
        </div>
      )}
    </div>
  );
}

// ── Detalle de orden seleccionada ─────────────────────────────────────────────
function OrderDetail({ order, ks, tick, onSetKS }) {
  const created    = order.created_at || order.sale_date;
  const items      = groupItems(order.items || []);
  const E          = ESTADO[ks] || ESTADO.new;
  const isTakeAway = order.order_type === 'take_away';
  const orderNote  = order.notas || order.notes;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', animation: 'kSlideRight 0.3s ease both' }}>
      {/* Cabecera */}
      <div style={{
        padding: '18px 28px', background: '#09101d',
        borderBottom: '1px solid #141e2e',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 14,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            {isTakeAway
              ? <MdOutlineTakeoutDining size={28} color="#a78bfa" />
              : <MdOutlineTableRestaurant size={28} color="#6366f1" />
            }
            <span style={{ fontSize: 30, fontWeight: 900, lineHeight: 1 }}>
              {order.mesa_numero != null ? `Mesa ${order.mesa_numero}` : isTakeAway ? 'Llevar' : '—'}
            </span>
            <StatusBadge label={E.label} bg={E.bg} color={E.color} ks={ks} large />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: 12, color: '#334155' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <FiHash size={11} />
              <span>{order.order_number || order.id?.slice(0, 8)}</span>
            </div>
            {created && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                color: getElapsedColor(created), fontWeight: 700, transition: 'color 1s ease',
              }}>
                <FiClock size={11} /> {getElapsed(created)} esperando
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <FiPackage size={11} />
              <span>{items.length} ítem{items.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {orderNote && (
            <div style={{
              marginTop: 10, fontSize: 13, color: '#fde68a',
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
              borderRadius: 8, padding: '8px 14px',
              display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600,
              animation: 'kFadeIn 0.4s ease both',
            }}>
              <FiMessageSquare size={13} color="#f59e0b" />
              {orderNote}
            </div>
          )}
        </div>

        {/* Botones */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', animation: 'kFadeIn 0.4s ease both' }}>
          {ks === 'new' && (
            <ActionBtn onClick={() => onSetKS('preparing')} bg="#f59e0b" color="#1a0a00" icon={<FiPlay size={14} />}>
              Iniciar Preparación
            </ActionBtn>
          )}
          {ks !== 'ready' && (
            <ActionBtn onClick={() => onSetKS('ready')} bg="#10b981" color="#fff" icon={<FiCheck size={14} />}>
              Listo para Mesa
            </ActionBtn>
          )}
          {ks === 'ready' && (
            <ActionBtn onClick={() => onSetKS('preparing')} bg="rgba(255,255,255,0.06)" color="#94a3b8" border="#1e293b" icon={<FiRotateCcw size={13} />}>
              Devolver a Cocina
            </ActionBtn>
          )}
        </div>
      </div>

      {/* Items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 12,
        }}>
          {items.map((item, i) => (
            <ItemCard key={i} item={item} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tarjeta de ítem ───────────────────────────────────────────────────────────
function ItemCard({ item, index }) {
  const hasExtras = item.extras.length > 0;
  const hasNotes  = !!item.notes;

  return (
    <div
      className="k-item-card"
      style={{
        background: '#0d1726',
        border: '1px solid #1a2740',
        borderLeft: '3px solid #6366f1',
        borderRadius: 14,
        padding: '14px 16px',
        animation: `kFadeUp 0.35s ease both`,
        animationDelay: `${index * 0.07}s`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: (hasExtras || hasNotes) ? 10 : 0 }}>
        <span style={{ fontSize: 22, fontWeight: 900, color: '#818cf8', lineHeight: 1, flexShrink: 0 }}>
          {item.qty}x
        </span>
        <span style={{
          fontSize: 17, fontWeight: 800, color: '#f1f5f9',
          textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.2,
        }}>
          {item.name}
        </span>
      </div>

      {hasExtras && (
        <div style={{ paddingLeft: 4, marginBottom: hasNotes ? 6 : 0 }}>
          {item.extras.map((e, ei) => (
            <div
              key={ei}
              style={{
                fontSize: 13, color: '#a78bfa', marginTop: 4,
                display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500,
                animation: `kFadeIn 0.3s ease both`,
                animationDelay: `${index * 0.07 + ei * 0.04 + 0.1}s`,
              }}
            >
              <span style={{ color: '#7c3aed', fontSize: 15, fontWeight: 700 }}>+</span>
              {e}
            </div>
          ))}
        </div>
      )}

      {hasNotes && (
        <div style={{
          paddingLeft: 4, marginTop: hasExtras ? 2 : 6,
          fontSize: 12, color: '#64748b', fontStyle: 'italic',
          animation: `kFadeIn 0.3s ease both`,
          animationDelay: `${index * 0.07 + 0.15}s`,
        }}>
          * {item.notes} *
        </div>
      )}
    </div>
  );
}

// ── Componentes auxiliares ────────────────────────────────────────────────────
// ── Sound Picker ─────────────────────────────────────────────────────────────
const SOUND_META = {
  pulsos:  { icon: FiZap,          color: '#818cf8', desc: '3 pulsos ascendentes' },
  campana: { icon: FiBell,         color: '#34d399', desc: 'Do · Mi · Sol' },
  bip:     { icon: FiRadio,        color: '#60a5fa', desc: 'Bip bip rápido' },
  urgente: { icon: FiAlertCircle,  color: '#f87171', desc: 'Alerta rápida' },
  melodia: { icon: FiWind,         color: '#fbbf24', desc: 'Pentatónica suave' },
};

function SoundPicker({ sounds, selectedSound, onSelect }) {
  return (
    <div
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      style={{
        position: 'absolute', top: 'calc(100% + 10px)', right: 0, zIndex: 200,
        background: '#0d1726',
        border: '1px solid #1e293b',
        borderRadius: 14,
        padding: '10px 8px',
        minWidth: 210,
        boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1)',
        animation: 'kFadeUp 0.18s ease both',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '2px 8px 10px', borderBottom: '1px solid #1a2740', marginBottom: 6,
      }}>
        <FiMusic size={12} color="#6366f1" />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '1px', textTransform: 'uppercase' }}>
          Sonido de alerta
        </span>
      </div>

      {Object.entries(sounds).map(([key, { label, fn }]) => {
        const meta     = SOUND_META[key] || {};
        const Icon     = meta.icon || FiMusic;
        const accent   = meta.color || '#818cf8';
        const isActive = key === selectedSound;

        return (
          <div
            key={key}
            onClick={() => onSelect(key, fn)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', borderRadius: 10, cursor: 'pointer',
              background: isActive ? `rgba(${hexToRgb(accent)},0.12)` : 'transparent',
              border: `1px solid ${isActive ? `rgba(${hexToRgb(accent)},0.3)` : 'transparent'}`,
              marginBottom: 3,
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
          >
            {/* Ícono */}
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: `rgba(${hexToRgb(accent)},0.15)`,
              border: `1px solid rgba(${hexToRgb(accent)},0.25)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={14} color={accent} />
            </div>

            {/* Texto */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? accent : '#cbd5e1' }}>
                {label}
              </div>
              <div style={{ fontSize: 10, color: '#334155', marginTop: 1 }}>
                {meta.desc}
              </div>
            </div>

            {/* Check */}
            {isActive && (
              <div style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                background: `rgba(${hexToRgb(accent)},0.2)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <FiCheck size={10} color={accent} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function StatusBadge({ label, bg, color, ks, large }) {
  const anim = ks === 'new'
    ? 'kPulseRed 2s ease-in-out infinite'
    : ks === 'preparing'
    ? 'kBreath 1.6s ease-in-out infinite'
    : 'none';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      fontSize: large ? 11 : 9, fontWeight: 800,
      padding: large ? '5px 12px' : '3px 8px',
      borderRadius: 20, background: bg, color,
      letterSpacing: '0.5px', whiteSpace: 'nowrap',
      animation: anim,
    }}>
      <span style={{
        width: large ? 6 : 5, height: large ? 6 : 5,
        background: color, borderRadius: '50%', display: 'inline-block', opacity: 0.85,
      }} />
      {label}
    </div>
  );
}

function ActionBtn({ onClick, bg, color, border, icon, children }) {
  return (
    <button onClick={onClick} className="k-btn" style={{
      padding: '11px 20px', background: bg, color,
      border: `1.5px solid ${border || bg}`,
      borderRadius: 10, fontWeight: 700, fontSize: 13,
      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
      whiteSpace: 'nowrap', letterSpacing: '0.3px',
    }}>
      {icon} {children}
    </button>
  );
}

function IconBtn({ onClick, title, active, activeColor = '#6366f1', children }) {
  return (
    <button onClick={onClick} title={title} className="k-icon-btn" style={{
      background: active ? `rgba(${activeColor === '#10b981' ? '16,185,129' : '99,102,241'},0.12)` : 'rgba(255,255,255,0.04)',
      border: `1px solid ${active ? activeColor : '#141e2e'}`,
      borderRadius: 8, color: active ? activeColor : '#334155',
      cursor: 'pointer', padding: '7px 9px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {children}
    </button>
  );
}

function LoadingState() {
  return (
    <div style={{
      textAlign: 'center', color: '#1e293b', padding: 40, fontSize: 13,
      animation: 'kFadeIn 0.4s ease',
    }}>
      <FiRefreshCw size={20} color="#1e3a5f" style={{ animation: 'kSpin 1s linear infinite', marginBottom: 10 }} />
      <div>Cargando órdenes…</div>
    </div>
  );
}

function LoadingDetail() {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', color: '#1e293b', gap: 14,
      animation: 'kFadeIn 0.3s ease',
    }}>
      <FiRefreshCw size={24} color="#1e3a5f" style={{ animation: 'kSpin 0.9s linear infinite' }} />
      <span style={{ fontSize: 13 }}>Cargando detalle…</span>
    </div>
  );
}

function EmptyList() {
  return (
    <div style={{ textAlign: 'center', padding: '52px 20px', animation: 'kPopIn 0.45s ease both' }}>
      <div style={{
        width: 60, height: 60, background: 'rgba(16,185,129,0.08)',
        border: '1px solid rgba(16,185,129,0.15)',
        borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 14px',
        animation: 'kGlow 3s ease-in-out infinite',
      }}>
        <FiCheck size={26} color="#10b981" />
      </div>
      <div style={{ fontWeight: 700, fontSize: 14, color: '#10b981' }}>¡Sin órdenes pendientes!</div>
      <div style={{ fontSize: 12, color: '#1e293b', marginTop: 6 }}>Todo listo en cocina</div>
    </div>
  );
}

function EmptyDetail() {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      animation: 'kPopIn 0.45s ease both',
    }}>
      <div style={{
        width: 72, height: 72, background: 'rgba(99,102,241,0.08)',
        border: '1px solid rgba(99,102,241,0.15)',
        borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 18,
      }}>
        <FiCoffee size={32} color="#3730a3" />
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#1e293b' }}>
        Selecciona una orden
      </div>
      <div style={{ fontSize: 12, color: '#0f172a', marginTop: 8 }}>
        Haz clic en una orden del panel izquierdo
      </div>
    </div>
  );
}
