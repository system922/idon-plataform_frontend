// OrdersKitchenScreen.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from '../../context/SessionContext';
import { io } from 'socket.io-client';
import {
  FiClock, FiRefreshCw, FiCheck, FiPlay, FiRotateCcw,
  FiAlertCircle, FiVolume2, FiVolumeX, FiHash,
  FiMessageSquare, FiPackage, FiCoffee, FiMusic, FiChevronDown,
  FiZap, FiBell, FiRadio, FiWind,
} from 'react-icons/fi';
import { MdOutlineTableRestaurant, MdOutlineTakeoutDining } from 'react-icons/md';
import { fetchWithAuth } from '../../config/api';
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
  if (mins < 10) return 'normal';
  if (mins < 20) return 'warning';
  return 'urgent';
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
  const { user } = useSession();

  // ─── Obtener businessId de forma robusta ──────────────────────────────────
  const getBusinessId = useCallback(() => {
    try {
      const fromSession = sessionStorage.getItem('business_id');
      if (fromSession) {
        return fromSession;
      }
      if (user?.businessId) {
        return user.businessId;
      }
      return null;
    } catch {
      return null;
    }
  }, [user]);

  const businessId = getBusinessId();

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

  soundFnRef.current = sounds[selectedSound]?.fn ?? sounds.pulsos.fn;

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

  // ─── Cargar órdenes de cocina ──────────────────────────────────────────────
  const loadOrders = useCallback(async (fromSocket = false) => {
    if (!businessId) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetchWithAuth(`/ordenes?status=kitchen&businessId=${businessId}`);
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
  }, [businessId, soundEnabled]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  useEffect(() => {
    const t = setInterval(loadOrders, 30000);
    return () => clearInterval(t);
  }, [loadOrders]);

  // ─── Socket para nuevos pedidos ────────────────────────────────────────────
  useEffect(() => {
    if (!businessId) return;
    const token = localStorage.getItem('idonToken') || localStorage.getItem('token');
    const socket = io(process.env.REACT_APP_API_BASE || 'https://idon-plataform-backend.onrender.com', {
      auth: { token, businessId },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 8,
    });
    socket.on('new_order',    () => loadOrders(true));
    socket.on('data_changed', ({ entity }) => { if (entity === 'orders') loadOrders(); });
    return () => socket.disconnect();
  }, [businessId, loadOrders]);

  // ─── Cargar detalle de orden seleccionada ──────────────────────────────────
  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    if (!businessId) return;

    setLoadingDetail(true);
    fetchWithAuth(`/ordenes/${selectedId}?businessId=${businessId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const order = data.order || data.pedido || data;
        const items = order.items || data.items || [];
        setDetail({ ...order, items });
      })
      .catch(() => {})
      .finally(() => setLoadingDetail(false));
  }, [selectedId, businessId]);

  const kitchenToDb = { new: 'pending', preparing: 'sent', ready: 'completed' };

  const setKS = useCallback(async (id, state) => {
    if (!businessId) return;
    setKitchenStateMap(prev => ({ ...prev, [id]: state }));
    try {
      if (state === 'ready') {
        await fetchWithAuth(`/ordenes/${id}/kitchen-ready?businessId=${businessId}`, { method: 'POST' });
      } else {
        await fetchWithAuth(`/ordenes/${id}/status?businessId=${businessId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: kitchenToDb[state] }),
        });
      }
    } catch {}
  }, [businessId]);

  const handleRefresh = useCallback(() => {
    setSpinning(true);
    loadOrders().finally(() => setTimeout(() => setSpinning(false), 600));
  }, [loadOrders]);

  const pendingOrders = orders.filter(o => kitchenState[o.id] !== 'ready');
  const readyOrders   = orders.filter(o => kitchenState[o.id] === 'ready');

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="kitchen-container">
      {/* ════ PANEL IZQUIERDO ══════════════════════════════════════════════ */}
      <div className="kitchen-panel">
        {/* Cabecera */}
        <div className="kitchen-panel-header">
          <div className="kitchen-panel-header-left">
            <div className="kitchen-panel-icon">
              <FiCoffee size={16} />
            </div>
            <div>
              <div className="kitchen-panel-title">COCINA</div>
              <div className="kitchen-panel-subtitle">
                <span className="pending-count">
                  {pendingOrders.length} pendiente{pendingOrders.length !== 1 ? 's' : ''}
                </span>
                {readyOrders.length > 0 && (
                  <span className="ready-count">
                    {' · '}{readyOrders.length} listo{readyOrders.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="kitchen-panel-controls" ref={pickerRef}>
            <button
              className={`kitchen-icon-btn ${showSoundPicker ? 'active' : ''}`}
              onClick={() => setShowSoundPicker(v => !v)}
              title="Seleccionar sonido"
            >
              <FiMusic size={13} />
              <FiChevronDown size={10} style={{ marginLeft: 2, transition: 'transform 0.2s', transform: showSoundPicker ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </button>

            <button
              className={`kitchen-icon-btn ${soundEnabled ? 'sound-active' : ''}`}
              onClick={() => setSoundEnabled(v => !v)}
              title={soundEnabled ? 'Silenciar' : 'Activar sonido'}
            >
              {soundEnabled ? <FiVolume2 size={13} /> : <FiVolumeX size={13} />}
            </button>

            <button
              className={`kitchen-icon-btn ${spinning ? 'spinning' : ''}`}
              onClick={handleRefresh}
              title="Actualizar"
            >
              <FiRefreshCw size={13} />
            </button>

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
        <div className="kitchen-order-list">
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
                  <div className="kitchen-ready-divider">
                    <FiCheck size={10} /> Listos para mesa
                  </div>
                  {readyOrders.map((order, idx) => {
                    const isActive   = order.id === selectedId;
                    const isTakeAway = order.order_type === 'take_away';
                    return (
                      <div
                        key={order.id} onClick={() => setSelectedId(order.id)}
                        className={`kitchen-ready-card ${isActive ? 'active' : 'inactive'}`}
                        style={{ animationDelay: `${idx * 0.05}s` }}
                      >
                        <div className="kitchen-ready-card-left">
                          {isTakeAway
                            ? <MdOutlineTakeoutDining size={16} className="takeaway-icon" />
                            : <MdOutlineTableRestaurant size={16} className="table-icon" />
                          }
                          <div className="kitchen-ready-card-info">
                            <div className="table-number">
                              {order.mesa_numero != null ? `Mesa ${order.mesa_numero}` : isTakeAway ? 'Llevar' : '—'}
                            </div>
                            <div className="order-ref">
                              #{order.order_number || order.id.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                        <span className="kitchen-ready-badge">
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
      <div className="kitchen-detail-panel">
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
          <div className="kitchen-detail-error">
            <FiAlertCircle size={16} /> No se pudo cargar la orden
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tarjeta de orden en la lista ──────────────────────────────────────────────
function OrderCard({ order, ks, isActive, created, itemCount, tick, index, onClick }) {
  const E = ESTADO[ks] || ESTADO.new;
  const isTakeAway = order.order_type === 'take_away';
  const orderNote  = order.notas || order.notes;
  const timeClass = getElapsedColor(created);

  return (
    <div
      onClick={onClick}
      className={`kitchen-order-card ${isActive ? 'active' : ''} ${ks === 'preparing' ? 'preparing' : ''}`}
      style={{ animationDelay: `${index * 0.055}s` }}
    >
      <div className="kitchen-order-card-header">
        <div className="kitchen-order-card-id">
          {isTakeAway
            ? <MdOutlineTakeoutDining size={18} className="takeaway-icon" />
            : <MdOutlineTableRestaurant size={18} className="table-icon" />
          }
          <span className="kitchen-order-card-number">
            {order.mesa_numero != null ? `Mesa ${order.mesa_numero}` : isTakeAway ? 'Llevar' : '—'}
          </span>
        </div>
        <StatusBadge label={E.label} bg={E.bg} color={E.color} ks={ks} />
      </div>

      <div className="kitchen-order-card-details">
        <div className="kitchen-order-card-meta">
          <FiHash size={10} />
          <span>{order.order_number || order.id.slice(0, 8)}</span>
          <span style={{ color: '#1e293b' }}>·</span>
          <FiPackage size={10} />
          <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
        </div>
        <div className={`kitchen-order-card-time ${timeClass}`}>
          <FiClock size={10} /> {getElapsed(created)}
        </div>
      </div>

      {orderNote && (
        <div className="kitchen-order-note">
          <FiMessageSquare size={9} />
          <span>{orderNote}</span>
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
  const timeClass = getElapsedColor(created);

  return (
    <div className="kitchen-detail-panel" style={{ animation: 'kSlideRight 0.3s ease both' }}>
      {/* Cabecera */}
      <div className="kitchen-detail-header">
        <div className="kitchen-detail-header-left">
          <div className="kitchen-detail-title">
            {isTakeAway
              ? <MdOutlineTakeoutDining size={28} className="takeaway-icon" />
              : <MdOutlineTableRestaurant size={28} className="table-icon" />
            }
            <span className="table-number">
              {order.mesa_numero != null ? `Mesa ${order.mesa_numero}` : isTakeAway ? 'Llevar' : '—'}
            </span>
            <StatusBadge label={E.label} bg={E.bg} color={E.color} ks={ks} large />
          </div>

          <div className="kitchen-detail-meta">
            <div className="kitchen-detail-meta-item">
              <FiHash size={11} />
              <span>{order.order_number || order.id?.slice(0, 8)}</span>
            </div>
            {created && (
              <div className={`kitchen-detail-meta-item time ${timeClass}`}>
                <FiClock size={11} /> {getElapsed(created)} esperando
              </div>
            )}
            <div className="kitchen-detail-meta-item">
              <FiPackage size={11} />
              <span>{items.length} ítem{items.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {orderNote && (
            <div className="kitchen-detail-note">
              <FiMessageSquare size={13} />
              {orderNote}
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="kitchen-detail-actions">
          {ks === 'new' && (
            <button className="kitchen-btn kitchen-btn-primary" onClick={() => onSetKS('preparing')}>
              <FiPlay size={14} /> Iniciar Preparación
            </button>
          )}
          {ks !== 'ready' && (
            <button className="kitchen-btn kitchen-btn-success" onClick={() => onSetKS('ready')}>
              <FiCheck size={14} /> Listo para Mesa
            </button>
          )}
          {ks === 'ready' && (
            <button className="kitchen-btn kitchen-btn-secondary" onClick={() => onSetKS('preparing')}>
              <FiRotateCcw size={13} /> Devolver a Cocina
            </button>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="kitchen-detail-items">
        <div className="kitchen-detail-grid">
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
      className="kitchen-item-card"
      style={{ animationDelay: `${index * 0.07}s` }}
    >
      <div className="kitchen-item-header">
        <span className="kitchen-item-quantity">{item.qty}x</span>
        <span className="kitchen-item-name">{item.name}</span>
      </div>

      {hasExtras && (
        <div className="kitchen-item-extras">
          {item.extras.map((e, ei) => (
            <div
              key={ei}
              className="kitchen-item-extra"
              style={{ animationDelay: `${index * 0.07 + ei * 0.04 + 0.1}s` }}
            >
              <span className="plus">+</span>
              {e}
            </div>
          ))}
        </div>
      )}

      {hasNotes && (
        <div
          className="kitchen-item-notes"
          style={{ animationDelay: `${index * 0.07 + 0.15}s` }}
        >
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
      className="kitchen-sound-picker"
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      <div className="kitchen-sound-picker-header">
        <FiMusic size={12} />
        <span>Sonido de alerta</span>
      </div>

      {Object.entries(sounds).map(([key, { label, fn }]) => {
        const meta     = SOUND_META[key] || {};
        const Icon     = meta.icon || FiMusic;
        const accent   = meta.color || '#818cf8';
        const isActive = key === selectedSound;
        const rgb = hexToRgb(accent);

        return (
          <div
            key={key}
            onClick={() => onSelect(key, fn)}
            className={`kitchen-sound-option ${isActive ? 'active' : ''}`}
          >
            <div
              className="kitchen-sound-option-icon"
              style={{
                background: `rgba(${rgb},0.15)`,
                border: `1px solid rgba(${rgb},0.25)`,
              }}
            >
              <Icon size={14} color={accent} />
            </div>

            <div className="kitchen-sound-option-info">
              <div className={`kitchen-sound-option-label ${isActive ? 'active' : ''}`}>
                {label}
              </div>
              <div className="kitchen-sound-option-desc">{meta.desc}</div>
            </div>

            {isActive && (
              <div
                className="kitchen-sound-option-check"
                style={{ background: `rgba(${rgb},0.2)` }}
              >
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
  return (
    <div className={`kitchen-status-badge ${ks} ${large ? 'large' : ''}`}>
      <span className="dot" style={{ background: color }} />
      {label}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="kitchen-loading">
      <FiRefreshCw size={20} />
      <div>Cargando órdenes…</div>
    </div>
  );
}

function LoadingDetail() {
  return (
    <div className="kitchen-loading-detail">
      <FiRefreshCw size={24} />
      <span>Cargando detalle…</span>
    </div>
  );
}

function EmptyList() {
  return (
    <div className="kitchen-empty">
      <div className="kitchen-empty-icon">
        <FiCheck size={26} />
      </div>
      <div className="kitchen-empty-title">¡Sin órdenes pendientes!</div>
      <div className="kitchen-empty-subtitle">Todo listo en cocina</div>
    </div>
  );
}

function EmptyDetail() {
  return (
    <div className="kitchen-detail-empty">
      <div className="kitchen-detail-empty-icon">
        <FiCoffee size={32} />
      </div>
      <div className="kitchen-detail-empty-title">Selecciona una orden</div>
      <div className="kitchen-detail-empty-subtitle">
        Haz clic en una orden del panel izquierdo
      </div>
    </div>
  );
}