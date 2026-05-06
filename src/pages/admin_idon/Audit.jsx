import React, { useState, useEffect } from 'react';
import { FiFileText, FiRefreshCw } from 'react-icons/fi';
import { adminApiService as apiService } from '../../services/apiService';
import '../../styles/AdminPages.css';

const TYPE_CFG = {
  payment:   { label: 'Pago',       color: '#22c55e' },
  approval:  { label: 'Aprobación', color: '#3b82f6' },
  rejection: { label: 'Rechazo',    color: '#ef4444' },
  request:   { label: 'Solicitud',  color: '#f59e0b' },
};
const STATUS_CFG = {
  success: { label: 'Éxito',    cls: 'admin-badge-success' },
  error:   { label: 'Error',    cls: 'admin-badge-danger'  },
  pending: { label: 'Pendiente',cls: 'admin-badge-warning' },
};

export default function Audit() {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [filter,  setFilter]  = useState('all');

  const load = async () => {
    try {
      setLoading(true);
      const [billing, requests] = await Promise.all([
        apiService.get('/admin/billing-history'),
        apiService.get('/admin/requests'),
      ]);

      const entries = [];

      // Billing history
      (billing.data || []).forEach(b => {
        entries.push({
          id: `bh-${b.id}`, date: b.billing_date || b.created_at,
          type: 'payment', status: b.status === 'paid' ? 'success' : 'pending',
          actor: 'Admin', action: b.status === 'paid' ? 'Pago registrado' : 'Factura pendiente',
          target: b.business_name,
          detail: `${b.billing_period === 'monthly' ? 'Mensual' : 'Anual'} · $${parseFloat(b.amount || 0).toFixed(2)}${b.invoice_number ? ' · ' + b.invoice_number : ''}`,
        });
      });

      // Registration requests
      (requests.data || []).forEach(r => {
        if (r.status === 'approved' && r.reviewed_at) {
          entries.push({ id: `req-a-${r.id}`, date: r.reviewed_at, type: 'approval', status: 'success', actor: 'Admin', action: 'Solicitud aprobada', target: r.business_name, detail: `Propietario: ${r.owner_email || r.email}` });
        } else if (r.status === 'rejected' && r.reviewed_at) {
          entries.push({ id: `req-r-${r.id}`, date: r.reviewed_at, type: 'rejection', status: 'error', actor: 'Admin', action: 'Solicitud rechazada', target: r.business_name, detail: r.rejection_reason || '—' });
        } else if (r.status === 'pending') {
          entries.push({ id: `req-p-${r.id}`, date: r.requested_at || r.creado, type: 'request', status: 'pending', actor: r.email || r.owner_email || '—', action: 'Nueva solicitud de registro', target: r.business_name || r.empresa, detail: `Propietario: ${r.propietario || r.owner_email || '—'}` });
        }
      });

      entries.sort((a, b) => new Date(b.date) - new Date(a.date));
      setLogs(entries); setError(null);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === 'all' ? logs : logs.filter(l => l.type === filter);

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Auditoría</h1>
        <p className="admin-page-subtitle">Registro cronológico de actividades del sistema</p>
      </div>

      {error && <div className="admin-card" style={{ marginBottom: 16, borderLeft: '4px solid #ef4444' }}><div className="admin-card-body"><p style={{ color: '#ef4444', margin: 0 }}>Error: {error}</p></div></div>}

      <div className="admin-filters" style={{ marginBottom: 16 }}>
        <button className={`admin-filter-btn ${filter==='all'?'active':''}`} onClick={() => setFilter('all')}>Todas ({logs.length})</button>
        {Object.entries(TYPE_CFG).map(([k, v]) => (
          <button key={k} className={`admin-filter-btn ${filter===k?'active':''}`} onClick={() => setFilter(k)}>
            <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: v.color, marginRight: 5 }} />
            {v.label} ({logs.filter(l => l.type === k).length})
          </button>
        ))}
        <button className="admin-btn admin-btn-secondary" onClick={load} style={{ marginLeft: 'auto' }}><FiRefreshCw size={14} /> Actualizar</button>
      </div>

      <div className="admin-card">
        <div className="admin-card-header"><h2>Actividades ({filtered.length})</h2></div>
        <div className="admin-card-body">
          {loading ? <div className="admin-loading"><div className="admin-spinner" />Cargando...</div>
          : filtered.length === 0 ? (
            <div className="admin-empty"><div className="admin-empty-icon"><FiFileText size={36} /></div><p className="admin-empty-title">Sin actividades</p></div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead><tr><th>Fecha y hora</th><th>Actor</th><th>Acción</th><th>Objetivo</th><th>Detalle</th><th>Estado</th></tr></thead>
                <tbody>
                  {filtered.map(log => {
                    const tc = TYPE_CFG[log.type]   || TYPE_CFG.request;
                    const sc = STATUS_CFG[log.status] || STATUS_CFG.pending;
                    return (
                      <tr key={log.id}>
                        <td style={{ fontSize: 11, color: 'var(--admin-text-muted)', whiteSpace: 'nowrap' }}>
                          {log.date ? new Date(log.date).toLocaleString('es-EC', { year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit' }) : '—'}
                        </td>
                        <td style={{ fontSize: 12 }}>{log.actor}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: tc.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 13 }}>{log.action}</span>
                          </div>
                        </td>
                        <td><strong style={{ fontSize: 13 }}>{log.target}</strong></td>
                        <td style={{ fontSize: 11, color: 'var(--admin-text-muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.detail}>{log.detail}</td>
                        <td><span className={`admin-badge ${sc.cls}`}>{sc.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
