import React, { useEffect, useState } from 'react';
import { FiRefreshCw, FiSearch, FiUser, FiMail, FiPhone, FiCheck, FiX } from 'react-icons/fi';
import apiService from '../../services/apiService';
import '../../styles/AdminPages.css';

export default function UsersList() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [search,  setSearch]  = useState('');

  const load = async () => {
    try { setLoading(true); const r = await apiService.get('/admin/users'); setUsers(r.data || []); setError(null); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter(u =>
    `${u.first_name||''} ${u.last_name||''} ${u.email||''}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Usuarios</h1>
        <p className="admin-page-subtitle">Todos los usuarios registrados en el sistema</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { l: 'Total usuarios',    v: users.length,                          c: '#ff8c42' },
          { l: 'Activos',           v: users.filter(u => u.is_active).length,         c: '#22c55e' },
          { l: 'Email verificado',  v: users.filter(u => u.email_verified).length,    c: '#3b82f6' },
        ].map(s => (
          <div key={s.l} className="admin-card" style={{ padding: '14px 18px' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>{s.l}</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: s.c }}>{s.v}</p>
          </div>
        ))}
      </div>

      {error && <div className="admin-card" style={{ marginBottom: 16, borderLeft: '4px solid #ef4444' }}><div className="admin-card-body"><p style={{ color: '#ef4444', margin: 0 }}>Error: {error}</p></div></div>}

      <div className="admin-card">
        <div className="admin-card-header">
          <h2>Usuarios ({filtered.length})</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <FiSearch size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
              <input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ padding: '7px 10px 7px 30px', borderRadius: 8, fontSize: 13, background: 'var(--admin-bg-primary)', border: '1px solid var(--admin-border-light)', color: 'var(--admin-text-primary)', width: 200, outline: 'none' }} />
            </div>
            <button className="admin-btn admin-btn-secondary" onClick={load}><FiRefreshCw size={14} /></button>
          </div>
        </div>
        <div className="admin-card-body">
          {loading ? <div className="admin-loading"><div className="admin-spinner" />Cargando...</div>
          : filtered.length === 0 ? (
            <div className="admin-empty"><div className="admin-empty-icon"><FiUser size={36} /></div><p className="admin-empty-title">Sin usuarios</p></div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead><tr><th>Usuario</th><th>Contacto</th><th>Documento</th><th>Activo</th><th>Email verificado</th><th>Registrado</th></tr></thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,140,66,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff8c42', flexShrink: 0 }}>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>{(u.first_name || u.email || '?')[0].toUpperCase()}</span>
                          </div>
                          <div>
                            <strong style={{ fontSize: 13 }}>{u.first_name} {u.last_name}</strong>
                            <div style={{ fontSize: 10, color: 'var(--admin-text-muted)' }}>{u.id?.slice(0,8)}…</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><FiMail size={11} />{u.email}</div>
                        {u.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2, color: 'var(--admin-text-muted)' }}><FiPhone size={11} />{u.phone}</div>}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {u.document_number ? <><span style={{ color: 'var(--admin-text-muted)', textTransform: 'capitalize' }}>{u.document_type}</span> {u.document_number}</> : '—'}
                      </td>
                      <td>{u.is_active ? <span className="admin-badge admin-badge-success"><FiCheck size={11} /> Sí</span> : <span className="admin-badge admin-badge-danger"><FiX size={11} /> No</span>}</td>
                      <td>{u.email_verified ? <span className="admin-badge admin-badge-success"><FiCheck size={11} /> Verificado</span> : <span className="admin-badge admin-badge-warning">Pendiente</span>}</td>
                      <td style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{u.created_at ? new Date(u.created_at).toLocaleDateString('es-EC') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
