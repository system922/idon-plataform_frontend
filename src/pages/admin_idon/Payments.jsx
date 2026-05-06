import React, { useState, useEffect } from 'react';
import {
  FiCreditCard, FiRefreshCw, FiCheck, FiAlertCircle,
  FiClock, FiXCircle, FiCheckCircle, FiCalendar,
} from 'react-icons/fi';
import { adminApiService } from '../../services/apiService';
import '../../styles/AdminPages.css';

const SUB_BADGE = {
  active:             { cls: 'admin-badge-success', label: 'Activa' },
  suspended:          { cls: 'admin-badge-danger',  label: 'Suspendida' },
  pending_activation: { cls: 'admin-badge-warning', label: 'Pendiente' },
};

function payInfo(nextBillingAt, status) {
  if (status === 'suspended') return { text: 'Suspendida', color: '#ef4444', bg: 'rgba(239,68,68,.1)' };
  if (!nextBillingAt)          return { text: 'Sin fecha',  color: 'var(--admin-text-muted)', bg: 'transparent' };
  const days = Math.floor((new Date(nextBillingAt) - new Date()) / 86400000);
  if (days < 0)   return { text: `Vencido ${Math.abs(days)}d`, color: '#ef4444', bg: 'rgba(239,68,68,.1)' };
  if (days === 0) return { text: 'Vence hoy',                  color: '#ef4444', bg: 'rgba(239,68,68,.1)' };
  if (days <= 3)  return { text: `Vence en ${days}d`,          color: '#f59e0b', bg: 'rgba(245,158,11,.1)' };
  if (days <= 7)  return { text: `${days}d restantes`,         color: '#ff8c42', bg: 'rgba(255,140,66,.1)' };
  return { text: `${days}d restantes`, color: '#22c55e', bg: 'rgba(34,197,94,.1)' };
}

export default function Payments() {
  const [data,     setData]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [filter,   setFilter]   = useState('all');
  const [acting,   setActing]   = useState(null);
  const [payModal, setPayModal] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const r = await adminApiService.get('/admin/payments');
      setData(r.data || r || []);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleMarkPaid = async (subId, notes) => {
    setActing(subId);
    try {
      await adminApiService.post(`/admin/subscriptions/${subId}/mark-paid`, { notes });
      setPayModal(null);
      await load();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setActing(null);
    }
  };

  const handleSuspend = async (subId) => {
    if (!window.confirm('¿Suspender este negocio? El dueño no podrá iniciar sesión.')) return;
    setActing(subId);
    try {
      await adminApiService.post(`/admin/subscriptions/${subId}/suspend`, {});
      await load();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setActing(null);
    }
  };

  const now = new Date();
  const f = (row) => {
    const days = row.next_billing_at ? Math.floor((new Date(row.next_billing_at) - now) / 86400000) : 9999;
    if (filter === 'overdue')   return days < 0 && row.sub_status !== 'suspended';
    if (filter === 'upcoming')  return days >= 0 && days <= 7;
    if (filter === 'active')    return row.sub_status === 'active';
    if (filter === 'suspended') return row.sub_status === 'suspended';
    if (filter === 'no_sub')    return !row.sub_id;
    return true;
  };
  const filtered = data.filter(f);

  const counts = {
    overdue:   data.filter(r => r.next_billing_at && Math.floor((new Date(r.next_billing_at)-now)/86400000) < 0 && r.sub_status !== 'suspended').length,
    upcoming:  data.filter(r => { const d = r.next_billing_at ? Math.floor((new Date(r.next_billing_at)-now)/86400000) : 9999; return d>=0&&d<=7; }).length,
    suspended: data.filter(r => r.sub_status === 'suspended').length,
    no_sub:    data.filter(r => !r.sub_id).length,
  };

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Pagos y Suscripciones</h1>
        <p className="admin-page-subtitle">Control de facturación, fechas de pago y estado de negocios</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { l: 'Total negocios',   v: data.length,       c: '#ff8c42' },
          { l: 'Pagos vencidos',   v: counts.overdue,    c: '#ef4444' },
          { l: 'Próximos 7 días',  v: counts.upcoming,   c: '#f59e0b' },
          { l: 'Suspendidos',      v: counts.suspended,  c: '#9ca3af' },
          { l: 'Sin suscripción',  v: counts.no_sub,     c: '#3b82f6' },
        ].map(s => (
          <div key={s.l} className="admin-card" style={{ padding: '13px 16px', borderLeft: `3px solid ${s.c}` }}>
            <p style={{ margin: '0 0 3px', fontSize: 10, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>{s.l}</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: s.c }}>{s.v}</p>
          </div>
        ))}
      </div>

      {error && <div className="admin-card" style={{ marginBottom: 16, borderLeft: '4px solid #ef4444' }}><div className="admin-card-body"><p style={{ color: '#ef4444', margin: 0 }}>Error: {error}</p></div></div>}

      {/* Filtros */}
      <div className="admin-filters" style={{ marginBottom: 16 }}>
        {[
          ['all',       `Todos (${data.length})`],
          ['overdue',   `⚠ Vencidos (${counts.overdue})`],
          ['upcoming',  `🕐 Esta semana (${counts.upcoming})`],
          ['active',    '✓ Activos'],
          ['suspended', `✗ Suspendidos (${counts.suspended})`],
          ['no_sub',    `Sin suscripción (${counts.no_sub})`],
        ].map(([k, l]) => (
          <button key={k} className={`admin-filter-btn ${filter===k?'active':''}`} onClick={() => setFilter(k)}>{l}</button>
        ))}
        <button className="admin-btn admin-btn-secondary" onClick={load} style={{ marginLeft: 'auto' }}><FiRefreshCw size={14} /> Actualizar</button>
      </div>

      <div className="admin-card">
        <div className="admin-card-header"><h2>Negocios ({filtered.length})</h2></div>
        <div className="admin-card-body">
          {loading ? <div className="admin-loading"><div className="admin-spinner" />Cargando...</div>
          : filtered.length === 0 ? (
            <div className="admin-empty"><div className="admin-empty-icon"><FiCreditCard size={36} /></div><p className="admin-empty-title">Sin resultados</p></div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead><tr>
                  <th>Negocio</th><th>Propietario</th><th>Suscripción</th>
                  <th>Próximo cobro</th><th>Total</th><th>Estado de pago</th><th>Acciones</th>
                </tr></thead>
                <tbody>
                  {filtered.map(r => {
                    const pi   = payInfo(r.next_billing_at, r.sub_status);
                    const sbdg = SUB_BADGE[r.sub_status] || SUB_BADGE.pending_activation;
                    const busy = acting === r.sub_id;
                    const isOver = r.next_billing_at && Math.floor((new Date(r.next_billing_at)-now)/86400000) < 0;
                    return (
                      <tr key={r.business_id} style={{ opacity: r.sub_status === 'suspended' ? .6 : 1, background: isOver && r.sub_status!=='suspended' ? 'rgba(239,68,68,.02)' : undefined }}>
                        <td>
                          <strong style={{ fontSize: 13 }}>{r.business_name}</strong>
                          <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>{r.business_type} · {r.slug}</div>
                          {!r.business_active && r.sub_status === 'suspended' && (
                            <span style={{ fontSize: 10, color: '#ef4444', background: 'rgba(239,68,68,.1)', padding: '1px 5px', borderRadius: 4 }}>LOGIN BLOQUEADO</span>
                          )}
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {r.owner_name || '—'}
                          <div style={{ color: 'var(--admin-text-muted)', fontSize: 11 }}>{r.owner_email}</div>
                        </td>
                        <td>
                          {r.sub_id
                            ? <><span className={`admin-badge ${sbdg.cls}`}>{sbdg.label}</span>
                                <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 2 }}>{r.billing_period === 'monthly' ? 'Mensual' : 'Anual'}</div></>
                            : <span className="admin-badge admin-badge-warning">Sin suscripción</span>}
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {r.next_billing_at ? (
                            <><FiCalendar size={11} style={{ marginRight: 4, color: 'var(--admin-text-muted)' }} />{new Date(r.next_billing_at).toLocaleDateString('es-EC')}</>
                          ) : '—'}
                          {r.last_paid_at && (
                            <div style={{ fontSize: 11, color: '#22c55e', marginTop: 2 }}>
                              <FiCheck size={10} /> Últ: {new Date(r.last_paid_at).toLocaleDateString('es-EC')}
                            </div>
                          )}
                        </td>
                        <td style={{ fontWeight: 700, color: '#ff8c42', fontSize: 13 }}>
                          {r.total_amount ? `$${parseFloat(r.total_amount).toFixed(2)}` : '—'}
                          {r.discount_percentage > 0 && <div style={{ fontSize: 10, color: '#8CB79B' }}>-{r.discount_percentage}% dto.</div>}
                        </td>
                        <td>
                          {r.sub_id ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: pi.color, background: pi.bg, border: `1px solid ${pi.color}33` }}>
                              {pi.text}
                            </span>
                          ) : '—'}
                        </td>
                        <td>
                          <div className="admin-table-actions" style={{ flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                            {r.sub_id && r.sub_status !== 'suspended' && (
                              <button className="admin-table-btn admin-table-btn-success" onClick={() => setPayModal(r)} disabled={busy} style={{ fontSize: 11, background: 'rgba(34,197,94,.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,.3)' }}>
                                <FiCheck size={12} /> Marcar pagado
                              </button>
                            )}
                            {r.sub_id && r.sub_status === 'active' && (
                              <button className="admin-table-btn admin-table-btn-danger" onClick={() => handleSuspend(r.sub_id)} disabled={busy} style={{ fontSize: 11 }}>
                                <FiXCircle size={12} /> Suspender
                              </button>
                            )}
                            {r.sub_status === 'suspended' && (
                              <button className="admin-table-btn admin-table-btn-success" onClick={() => handleMarkPaid(r.sub_id, 'Reactivación manual')} disabled={busy} style={{ fontSize: 11 }}>
                                <FiCheckCircle size={12} /> Reactivar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {payModal && <PayModal row={payModal} onClose={() => setPayModal(null)} onConfirm={handleMarkPaid} />}
    </div>
  );
}

function PayModal({ row, onClose, onConfirm }) {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'var(--admin-bg-primary)', border: '1px solid var(--admin-border-light)', color: 'var(--admin-text-primary)' };
  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h2><FiCreditCard size={17} style={{ marginRight: 8, color: '#22c55e' }} /> Registrar Pago</h2>
          <button className="admin-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="admin-modal-body">
          <p style={{ margin: '0 0 14px', fontSize: 14 }}><strong>{row.business_name}</strong></p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)' }}>
              <p style={{ margin: '0 0 3px', fontSize: 10, color: '#8CB79B', textTransform: 'uppercase' }}>Monto</p>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#22c55e' }}>${parseFloat(row.total_amount || 0).toFixed(2)}</p>
            </div>
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,140,66,.06)', border: '1px solid rgba(255,140,66,.2)' }}>
              <p style={{ margin: '0 0 3px', fontSize: 10, color: '#ff8c42', textTransform: 'uppercase' }}>Vencimiento</p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#ff8c42' }}>
                {row.next_billing_at ? new Date(row.next_billing_at).toLocaleDateString('es-EC') : '—'}
              </p>
            </div>
          </div>
          <label style={{ display: 'block', marginBottom: 5, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#8CB79B' }}>Notas / Referencia (opcional)</label>
          <textarea style={{ ...inp, resize: 'vertical' }} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Referencia de transferencia, comprobante, etc." />
          <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--admin-text-muted)' }}>
            Al confirmar se registrará el pago y se actualizará la próxima fecha de cobro.
          </p>
        </div>
        <div className="admin-modal-footer">
          <button className="admin-btn admin-btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="admin-btn admin-btn-primary" disabled={saving}
            onClick={async () => { setSaving(true); await onConfirm(row.sub_id, notes); setSaving(false); }}
            style={{ background: 'linear-gradient(135deg,#34d399,#22c55e)', color: '#fff', border: 'none' }}>
            <FiCheck size={15} /> {saving ? 'Registrando...' : 'Confirmar pago'}
          </button>
        </div>
      </div>
    </div>
  );
}
