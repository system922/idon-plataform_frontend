import React, { useState, useEffect } from 'react';
import { useConfirm } from '../../context/ConfirmContext';
import { useAlert } from '../../components/ConfirmContext';
import { FiStar, FiPlus, FiEdit2, FiTrash2, FiCheck, FiFilter, FiRefreshCw } from 'react-icons/fi';
import { adminApiService } from '../../services/apiService';
import '../../styles/AdminPages.css';

const inp = { width: '100%', padding: '9px 12px', borderRadius: '8px', fontSize: '13px', background: 'var(--admin-bg-primary)', border: '1px solid var(--admin-border-light)', color: 'var(--admin-text-primary)' };
const Lbl = ({ children }) => <label style={{ display: 'block', marginBottom: 5, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: '#8CB79B' }}>{children}</label>;

export default function Features() {
  const { showConfirm } = useConfirm();
  const alert = useAlert();
  const [features,  setFeatures]  = useState([]);
  const [modules,   setModules]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [modal,     setModal]     = useState(null);
  const [filterMod, setFilterMod] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const [fr, mr] = await Promise.all([
        adminApiService.get('/admin/features'),
        adminApiService.get('/admin/modules'),
      ]);
      setFeatures(Array.isArray(fr.data) ? fr.data : []);
      setModules(Array.isArray(mr.data) ? mr.data : []);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!await showConfirm('¿Eliminar esta funcionalidad?')) return;
    try {
      await adminApiService.delete(`/admin/features/${id}`);
      load();
    } catch (e) {
      await alert.error('Error: ' + e.message);
    }
  };

  const filtered = filterMod ? features.filter(f => f.module_id === filterMod) : features;
  const modMap = Object.fromEntries(modules.map(m => [m.id, m]));

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Funcionalidades</h1>
        <p className="admin-page-subtitle">Gestiona las funcionalidades de cada módulo del sistema</p>
      </div>

      {error && <div className="admin-card" style={{ marginBottom: 16, borderLeft: '4px solid #ef4444' }}><div className="admin-card-body"><p style={{ color: '#ef4444', margin: 0 }}>Error: {error}</p></div></div>}

      {/* Filtro por módulo */}
      <div className="admin-card" style={{ marginBottom: 16 }}>
        <div className="admin-card-body" style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FiFilter size={14} style={{ color: 'var(--admin-text-muted)' }} />
            <select style={{ ...inp, flex: 1 }} value={filterMod} onChange={e => setFilterMod(e.target.value)}>
              <option value="">Todos los módulos ({features.length})</option>
              {modules.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({features.filter(f => f.module_id === m.id).length})</option>
              ))}
            </select>
            {filterMod && <button style={{ ...inp, width: 'auto', padding: '8px 12px', cursor: 'pointer', color: '#ef4444', border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.06)' }} onClick={() => setFilterMod('')}>✕ Limpiar</button>}
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <h2>Funcionalidades ({filtered.length})</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="admin-btn admin-btn-secondary" onClick={load}><FiRefreshCw size={14} /></button>
            <button className="admin-btn admin-btn-primary" onClick={() => setModal('new')}><FiPlus size={15} /> Nueva</button>
          </div>
        </div>
        <div className="admin-card-body">
          {loading ? <div className="admin-loading"><div className="admin-spinner" />Cargando...</div>
          : filtered.length === 0 ? (
            <div className="admin-empty">
              <div className="admin-empty-icon"><FiStar size={36} /></div>
              <p className="admin-empty-title">Sin funcionalidades</p>
              <p className="admin-empty-text">{filterMod ? 'No hay funcionalidades en este módulo' : 'No hay funcionalidades registradas aún'}</p>
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead><tr><th>Funcionalidad</th><th>Código</th><th>Módulo</th><th>Premium</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>
                  {filtered.map(f => {
                    const mod = modMap[f.module_id];
                    return (
                      <tr key={f.id}>
                        <td>
                          <strong style={{ fontSize: 13 }}>{f.name}</strong>
                          {f.description && <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 1 }}>{f.description}</div>}
                        </td>
                        <td><code style={{ fontSize: 11, background: 'rgba(255,140,66,.1)', color: '#ff8c42', padding: '2px 7px', borderRadius: 4 }}>{f.code}</code></td>
                        <td>{mod ? <span style={{ fontSize: 12, background: 'rgba(140,183,155,.1)', color: '#8CB79B', padding: '2px 9px', borderRadius: 20, fontWeight: 600 }}>{mod.name}</span> : <span style={{ color: 'var(--admin-text-muted)', fontSize: 12 }}>—</span>}</td>
                        <td style={{ textAlign: 'center' }}>
                          {f.is_premium ? <span className="admin-badge admin-badge-warning"><FiStar size={10} /> PRO</span> : <span style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>—</span>}
                        </td>
                        <td>{f.is_active !== false ? <span className="admin-badge admin-badge-success"><FiCheck size={11} /> Activo</span> : <span className="admin-badge admin-badge-warning">Inactivo</span>}</td>
                        <td>
                          <div className="admin-table-actions">
                            <button className="admin-table-btn" onClick={() => setModal(f)}><FiEdit2 size={13} /> Editar</button>
                            <button className="admin-table-btn admin-table-btn-danger" onClick={() => handleDelete(f.id)}><FiTrash2 size={13} /> Eliminar</button>
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

      {modal && <FeatureModal item={modal === 'new' ? null : modal} modules={modules} onClose={() => setModal(null)} onSaved={load} defaultModuleId={filterMod} />}
    </div>
  );
}

function FeatureModal({ item, modules, onClose, onSaved, defaultModuleId }) {
  const [form, setForm] = useState({
    code: item?.code || '', name: item?.name || '', description: item?.description || '',
    module_id: item?.module_id || defaultModuleId || modules[0]?.id || '',
    is_premium: item?.is_premium || false, is_active: item?.is_active !== false,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code || !form.name || !form.module_id) return await alert.error('Código, nombre y módulo son requeridos');
    setSaving(true);
    try {
      if (item) {
        await adminApiService.put(`/admin/features/${item.id}`, form);
      } else {
        await adminApiService.post('/admin/features', form);
      }
      onSaved(); onClose();
    } catch (e) {
      await alert.error('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h2><FiStar size={17} style={{ marginRight: 8, color: '#ff8c42' }} />{item ? 'Editar' : 'Nueva'} Funcionalidad</h2>
          <button className="admin-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="admin-modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="admin-form-group"><Lbl>Nombre *</Lbl><input style={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
              <div className="admin-form-group"><Lbl>Código *</Lbl><input style={inp} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} required /></div>
            </div>
            <div className="admin-form-group">
              <Lbl>Módulo *</Lbl>
              <select style={inp} value={form.module_id} onChange={e => setForm(f => ({ ...f, module_id: e.target.value }))} required>
                <option value="">Selecciona un módulo</option>
                {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="admin-form-group">
              <Lbl>Descripción</Lbl>
              <textarea style={{ ...inp, resize: 'vertical' }} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={form.is_premium} onChange={e => setForm(f => ({ ...f, is_premium: e.target.checked }))} />
                <FiStar size={12} style={{ color: '#f59e0b' }} /> PRO / Premium
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                Activo
              </label>
            </div>
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
