import React, { useState, useEffect, useCallback } from 'react';
import {
  FiBell, FiRefreshCw, FiAlertCircle, FiClock,
  FiCreditCard, FiClipboard, FiXCircle, FiCheckCircle,
} from 'react-icons/fi';
import { adminApiService as apiService } from '../../services/apiService';
import '../../styles/AdminPages.css';

const TYPE_CFG = {
  payment_overdue:  { label: 'Pago vencido',       color: '#ef4444', bg: 'rgba(239,68,68,.08)',  border: 'rgba(239,68,68,.25)',  icon: <FiAlertCircle size={18}/> },
  payment_upcoming: { label: 'Pago próximo',        color: '#f59e0b', bg: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.25)', icon: <FiClock size={18}/> },
  pending_request:  { label: 'Solicitud pendiente', color: '#3b82f6', bg: 'rgba(59,130,246,.08)', border: 'rgba(59,130,246,.25)', icon: <FiClipboard size={18}/> },
  suspended:        { label: 'Negocio suspendido',  color: '#9ca3af', bg: 'rgba(107,114,128,.08)',border: 'rgba(107,114,128,.25)',icon: <FiXCircle size={18}/> },
};
const PRIORITY_DOT = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };

export default function Notifications() {
  const [notifs,   setNotifs]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [filter,   setFilter]   = useState('all');
  const [lastLoad, setLastLoad] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await apiService.get('/admin/notifications/system');
      setNotifs(r.data || []); setError(null); setLastLoad(new Date());
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60000); // auto-reload cada 60 segundos
    return () => clearInterval(id);
  }, [load]);

  const counts = Object.fromEntries(
    Object.keys(TYPE_CFG).map(t => [t, notifs.filter(n => n.type === t).length])
  );
  const filtered = filter === 'all' ? notifs : notifs.filter(n => n.type === filter);
  const highCount = notifs.filter(n => n.priority === 'high').length;

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <h1 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FiBell size={24} style={{ color: '#ff8c42' }} /> Notificaciones del Sistema
          {highCount > 0 && (
            <span style={{ fontSize: 13, fontWeight: 700, background: '#ef4444', color: '#fff', padding: '2px 9px', borderRadius: 20 }}>{highCount} urgentes</span>
          )}
        </h1>
        <p className="admin-page-subtitle">Alertas de pagos, solicitudes y estado de negocios — auto-actualiza cada 60 seg</p>
      </div>

      {/* Tarjetas de conteos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {Object.entries(TYPE_CFG).map(([type, cfg]) => (
          <div key={type} className="admin-card"
            style={{ padding: '13px 16px', borderLeft: `3px solid ${cfg.color}`, cursor: 'pointer', transition: 'opacity .2s', opacity: filter!=='all'&&filter!==type?.5:1 }}
            onClick={() => setFilter(filter === type ? 'all' : type)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
              <span style={{ color: cfg.color }}>{cfg.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--admin-text-muted)' }}>{cfg.label}</span>
            </div>
            <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: cfg.color }}>{counts[type] || 0}</p>
          </div>
        ))}
      </div>

      {error && <div className="admin-card" style={{ marginBottom: 16, borderLeft: '4px solid #ef4444' }}><div className="admin-card-body"><p style={{ color: '#ef4444', margin: 0 }}>Error: {error}</p></div></div>}

      {/* Filtros */}
      <div className="admin-filters" style={{ marginBottom: 16 }}>
        <button className={`admin-filter-btn ${filter==='all'?'active':''}`} onClick={() => setFilter('all')}>Todas ({notifs.length})</button>
        {Object.entries(TYPE_CFG).map(([k, v]) => (
          <button key={k} className={`admin-filter-btn ${filter===k?'active':''}`} onClick={() => setFilter(k)}>
            <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: v.color, marginRight: 5 }} />
            {v.label} {counts[k] > 0 && `(${counts[k]})`}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {lastLoad && <span style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>Actualizado: {lastLoad.toLocaleTimeString('es-EC')}</span>}
          <button className="admin-btn admin-btn-secondary" onClick={load}><FiRefreshCw size={14} /> Actualizar</button>
        </div>
      </div>

      {/* Lista */}
      <div className="admin-card">
        <div className="admin-card-header"><h2>Notificaciones ({filtered.length})</h2></div>
        <div className="admin-card-body">
          {loading && !notifs.length ? <div className="admin-loading"><div className="admin-spinner" />Cargando...</div>
          : filtered.length === 0 ? (
            <div className="admin-empty">
              <div className="admin-empty-icon"><FiBell size={36} /></div>
              <p className="admin-empty-title">Sin notificaciones</p>
              <p className="admin-empty-text">{filter === 'all' ? 'Todo está en orden ✓' : `Sin notificaciones de tipo "${TYPE_CFG[filter]?.label}"`}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map(n => {
                const cfg = TYPE_CFG[n.type] || TYPE_CFG.payment_upcoming;
                return (
                  <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '13px 16px', borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                    {/* Ícono */}
                    <div style={{ color: cfg.color, flexShrink: 0, marginTop: 1 }}>{cfg.icon}</div>

                    {/* Contenido */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, background: `${cfg.color}15`, padding: '2px 8px', borderRadius: 20, border: `1px solid ${cfg.border}` }}>
                          {cfg.label}
                        </span>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: PRIORITY_DOT[n.priority] || '#6b7280' }} title={`Prioridad: ${n.priority}`} />
                        {n.priority === 'high' && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,.1)', padding: '1px 6px', borderRadius: 10 }}>URGENTE</span>
                        )}
                      </div>
                      <p style={{ margin: '0 0 3px', fontWeight: 700, fontSize: 14 }}>{n.title}</p>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--admin-text-muted)' }}>{n.message}</p>
                    </div>

                    {/* Fecha y días */}
                    <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', whiteSpace: 'nowrap', flexShrink: 0, textAlign: 'right' }}>
                      {n.date ? new Date(n.date).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      {n.days_overdue !== undefined && n.days_overdue > 0 && (
                        <div style={{ color: '#ef4444', fontWeight: 700, marginTop: 2 }}>{n.days_overdue}d vencido</div>
                      )}
                      {n.days_until !== undefined && (
                        <div style={{ color: cfg.color, fontWeight: 700, marginTop: 2 }}>en {n.days_until}d</div>
                      )}
                      {n.days_waiting !== undefined && (
                        <div style={{ color: cfg.color, fontWeight: 700, marginTop: 2 }}>{n.days_waiting}d esperando</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
