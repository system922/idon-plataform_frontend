import React, { useState, useEffect } from 'react';
import { useConfirm } from '../../context/ConfirmContext';
import {
  FiBox, FiPlus, FiEdit2, FiTrash2, FiCheck, FiX,
  FiRefreshCw, FiSettings, FiDollarSign,
} from 'react-icons/fi';
import { adminApiService } from '../../services/apiService';
import '../../styles/AdminPages.css';

const inp = { width: '100%', padding: '9px 12px', borderRadius: '8px', fontSize: '13px', background: 'var(--admin-bg-primary)', border: '1px solid var(--admin-border-light)', color: 'var(--admin-text-primary)' };
const Lbl = ({ children }) => <label style={{ display: 'block', marginBottom: 5, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: '#8CB79B' }}>{children}</label>;

export default function AdminModulos() {
  const { showConfirm } = useConfirm();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [modal,   setModal]   = useState(null); // null | 'new' | item

  const load = async () => {
    try {
      setLoading(true);
      const r = await adminApiService.get('/admin/modules');
      setModules(Array.isArray(r.data) ? r.data : []);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!await showConfirm('¿Eliminar este módulo?')) return;
    try {
      await adminApiService.delete(`/admin/modules/${id}`);
      load();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const totalMens = modules.reduce((s, m) => s + parseFloat(m.price_monthly || 0), 0);
  const totalAnu  = modules.reduce((s, m) => s + parseFloat(m.price_annual  || 0), 0);

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Módulos</h1>
        <p className="admin-page-subtitle">Gestiona los módulos del sistema y sus precios</p>
      </div>

      {/* Resumen de precios */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total módulos',   val: modules.length,            color: '#ff8c42', fmt: v => v },
          { label: 'Precio total/mes',val: totalMens,                  color: '#22c55e', fmt: v => `$${v.toFixed(2)}` },
          { label: 'Precio total/año',val: totalAnu,                   color: '#3b82f6', fmt: v => `$${v.toFixed(2)}` },
        ].map(s => (
          <div key={s.label} className="admin-card" style={{ padding: '14px 18px' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>{s.label}</p>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: s.color }}>{s.fmt(s.val)}</p>
          </div>
        ))}
      </div>

      {error && <div className="admin-card" style={{ marginBottom: 16, borderLeft: '4px solid #ef4444' }}><div className="admin-card-body"><p style={{ color: '#ef4444', margin: 0 }}>Error: {error}</p></div></div>}

      <div className="admin-card">
        <div className="admin-card-header">
          <h2>Módulos ({modules.length})</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="admin-btn admin-btn-secondary" onClick={load}><FiRefreshCw size={14} /></button>
            <button className="admin-btn admin-btn-primary" onClick={() => setModal('new')}><FiPlus size={15} /> Nuevo módulo</button>
          </div>
        </div>
        <div className="admin-card-body">
          {loading ? <div className="admin-loading"><div className="admin-spinner" />Cargando...</div>
          : modules.length === 0 ? (
            <div className="admin-empty">
              <div className="admin-empty-icon"><FiBox size={36} /></div>
              <p className="admin-empty-title">Sin módulos registrados</p>
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead><tr><th>Nombre</th><th>Código</th><th style={{ textAlign: 'right' }}>Precio/mes</th><th style={{ textAlign: 'right' }}>Precio/año</th><th>Orden</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>
                  {modules.map(m => (
                    <tr key={m.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,140,66,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff8c42', flexShrink: 0 }}>
                            <FiSettings size={14} />
                          </div>
                          <div>
                            <strong style={{ fontSize: 13 }}>{m.name}</strong>
                            {m.description && <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 1 }}>{m.description}</div>}
                          </div>
                        </div>
                      </td>
                      <td><code style={{ fontSize: 11, background: 'rgba(255,140,66,.1)', color: '#ff8c42', padding: '2px 7px', borderRadius: 4 }}>{m.code}</code></td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#ff8c42' }}>${parseFloat(m.price_monthly || 0).toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#8CB79B' }}>${parseFloat(m.price_annual  || 0).toFixed(2)}</td>
                      <td style={{ textAlign: 'center', fontSize: 12 }}>{m.sort_order}</td>
                      <td>{m.is_active !== false ? <span className="admin-badge admin-badge-success"><FiCheck size={11} /> Activo</span> : <span className="admin-badge admin-badge-warning">Inactivo</span>}</td>
                      <td>
                        <div className="admin-table-actions">
                          <button className="admin-table-btn" onClick={() => setModal(m)}><FiEdit2 size={13} /> Editar</button>
                          <button className="admin-table-btn admin-table-btn-danger" onClick={() => handleDelete(m.id)}><FiTrash2 size={13} /> Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modal && <ModuloModal item={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSaved={load} />}
    </div>
  );
}

function ModuloModal({ item, onClose, onSaved }) {
  const [form, setForm] = useState({
    code: item?.code || '', name: item?.name || '', description: item?.description || '',
    price_monthly: item?.price_monthly || 0, price_annual: item?.price_annual || 0,
    icon: item?.icon || '', sort_order: item?.sort_order || 0, is_active: item?.is_active !== false,
  });
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code || !form.name) return alert('Código y nombre son requeridos');
    setSaving(true);
    try {
      if (item) {
        await adminApiService.put(`/admin/modules/${item.id}`, form);
      } else {
        await adminApiService.post('/admin/modules', form);
      }
      onSaved(); onClose();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h2><FiSettings size={17} style={{ marginRight: 8, color: '#ff8c42' }} />{item ? 'Editar' : 'Nuevo'} Módulo</h2>
          <button className="admin-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="admin-modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="admin-form-group"><Lbl>Nombre *</Lbl><input style={inp} value={form.name} onChange={set('name')} required /></div>
              <div className="admin-form-group"><Lbl>Código *</Lbl><input style={inp} value={form.code} onChange={set('code')} disabled={!!item} required /></div>
              <div className="admin-form-group">
                <Lbl>Precio mensual ($)</Lbl>
                <input style={inp} type="number" step="0.01" min="0" value={form.price_monthly} onChange={set('price_monthly')} />
              </div>
              <div className="admin-form-group">
                <Lbl>Precio anual ($)</Lbl>
                <input style={inp} type="number" step="0.01" min="0" value={form.price_annual} onChange={set('price_annual')} />
              </div>
              <div className="admin-form-group"><Lbl>Ícono (código)</Lbl><input style={inp} value={form.icon} onChange={set('icon')} placeholder="shopping-cart" /></div>
              <div className="admin-form-group"><Lbl>Orden de aparición</Lbl><input style={inp} type="number" min="0" value={form.sort_order} onChange={set('sort_order')} /></div>
            </div>
            <div className="admin-form-group" style={{ marginTop: 4 }}>
              <Lbl>Descripción</Lbl>
              <textarea style={{ ...inp, resize: 'vertical' }} rows={2} value={form.description} onChange={set('description')} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, marginTop: 8 }}>
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
              Módulo activo
            </label>
            {/* Preview precio */}
            {(parseFloat(form.price_monthly) > 0 || parseFloat(form.price_annual) > 0) && (
              <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: 'rgba(255,140,66,.06)', border: '1px solid rgba(255,140,66,.2)', fontSize: 12, display: 'flex', gap: 20 }}>
                <span>Mensual: <strong style={{ color: '#ff8c42' }}>${parseFloat(form.price_monthly || 0).toFixed(2)}</strong></span>
                <span>Anual: <strong style={{ color: '#8CB79B' }}>${parseFloat(form.price_annual || 0).toFixed(2)}</strong></span>
                {parseFloat(form.price_monthly) > 0 && parseFloat(form.price_annual) > 0 && (
                  <span style={{ color: '#22c55e' }}>Ahorro anual: <strong>${(parseFloat(form.price_monthly) * 12 - parseFloat(form.price_annual)).toFixed(2)}</strong></span>
                )}
              </div>
            )}
          </div>
          <div className="admin-modal-footer">
            <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}><FiCheck size={15} /> {saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
