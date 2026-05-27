import React, { useState, useEffect } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { useConfirm } from '../../context/ConfirmContext';
import { useAlert } from '../../components/ConfirmContext';
import {
  FiBriefcase, FiPlus, FiEdit2, FiTrash2, FiCheck,
  FiRefreshCw, FiX,
} from 'react-icons/fi';
import { adminApiService } from '../../services/apiService';
import '../../styles/AdminPages.css';

const inp = {
  width: '100%', padding: '9px 12px', borderRadius: '8px', fontSize: '13px',
  background: 'var(--admin-bg-primary)', border: '1px solid var(--admin-border-light)',
  color: 'var(--admin-text-primary)',
};
const Lbl = ({ children }) => (
  <label style={{ display: 'block', marginBottom: 5, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: '#8CB79B' }}>
    {children}
  </label>
);

export default function BusinessTypes() {
  const { showConfirm } = useConfirm();
  const alert = useAlert();
  const [types,   setTypes]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [modal,   setModal]   = useState(null); // null | 'new' | item

  const load = async () => {
    try {
      setLoading(true);
      const r = await adminApiService.get('/admin/business-types');
      setTypes(Array.isArray(r) ? r : (r.data || []));
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!await showConfirm('¿Eliminar este tipo de negocio? Los negocios asociados quedarán sin tipo.')) return;
    try {
      await adminApiService.delete(`/admin/business-types/${id}`);
      load();
    } catch (e) {
      await alert.error('Error: ' + e.message);
    }
  };

  const active   = types.filter(t => t.is_active !== false).length;
  const inactive = types.length - active;

  const headerAction = (
    <div style={{ display: 'flex', gap: 8 }}>
      <button className="admin-btn admin-btn-secondary" onClick={load}><FiRefreshCw size={14} /></button>
      <button className="admin-btn admin-btn-primary" onClick={() => setModal('new')}><FiPlus size={15} /> Nuevo tipo</button>
    </div>
  );

  return (
    <PageTemplate theme="admin" title="Tipos de Negocio" subtitle="Gestiona las categorías de negocio disponibles en la plataforma" loading={loading} error={error} onRetry={load} headerAction={headerAction}>
      {/* Resumen */}
      <div className="admin-stats-3" style={{ gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total tipos',  val: types.length, color: '#ff8c42' },
          { label: 'Activos',      val: active,        color: '#22c55e' },
          { label: 'Inactivos',    val: inactive,      color: '#9ca3af' },
        ].map(s => (
          <div key={s.label} className="admin-card" style={{ padding: '14px 18px' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>{s.label}</p>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</p>
          </div>
        ))}
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <h2>Tipos de Negocio ({types.length})</h2>
        </div>
        <div className="admin-card-body">
          {loading ? (
            <div className="admin-loading"><div className="admin-spinner" />Cargando...</div>
          ) : types.length === 0 ? (
            <div className="admin-empty">
              <div className="admin-empty-icon"><FiBriefcase size={36} /></div>
              <p className="admin-empty-title">Sin tipos de negocio</p>
              <p className="admin-empty-text">Crea el primer tipo de negocio para la plataforma</p>
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Código</th>
                    <th>Descripción</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {types.map(t => (
                    <tr key={t.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,140,66,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff8c42', flexShrink: 0 }}>
                            <FiBriefcase size={14} />
                          </div>
                          <strong style={{ fontSize: 13 }}>{t.name}</strong>
                        </div>
                      </td>
                      <td>
                        <code style={{ fontSize: 11, background: 'rgba(255,140,66,.1)', color: '#ff8c42', padding: '2px 7px', borderRadius: 4 }}>{t.code}</code>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--admin-text-muted)', maxWidth: 300 }}>
                        {t.description || <span style={{ opacity: .4 }}>—</span>}
                      </td>
                      <td>
                        {t.is_active !== false
                          ? <span className="admin-badge admin-badge-success"><FiCheck size={11} /> Activo</span>
                          : <span className="admin-badge admin-badge-warning">Inactivo</span>}
                      </td>
                      <td>
                        <div className="admin-table-actions">
                          <button className="admin-table-btn" onClick={() => setModal(t)}><FiEdit2 size={13} /> Editar</button>
                          <button className="admin-table-btn admin-table-btn-danger" onClick={() => handleDelete(t.id)}><FiTrash2 size={13} /> Eliminar</button>
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

      {modal && (
        <BusinessTypeModal
          item={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </PageTemplate>
  );
}

function BusinessTypeModal({ item, onClose, onSaved }) {
  const [form, setForm] = useState({
    code:        item?.code        || '',
    name:        item?.name        || '',
    description: item?.description || '',
    is_active:   item?.is_active !== false,
  });
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code || !form.name) return await alert.error('Código y nombre son requeridos');
    setSaving(true);
    try {
      if (item) {
        await adminApiService.put(`/admin/business-types/${item.id}`, form);
      } else {
        await adminApiService.post('/admin/business-types', form);
      }
      onSaved();
      onClose();
    } catch (e) {
      await alert.error('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" style={{ maxWidth: 500, width: '95vw' }} onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h2>
            <FiBriefcase size={17} style={{ marginRight: 8, color: '#ff8c42' }} />
            {item ? 'Editar' : 'Nuevo'} Tipo de Negocio
          </h2>
          <button className="admin-modal-close" onClick={onClose}><FiX /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="admin-modal-body">
            <div className="admin-col-2" style={{ gap: 14 }}>
              <div className="admin-form-group">
                <Lbl>Nombre *</Lbl>
                <input style={inp} value={form.name} onChange={set('name')} required />
              </div>
              <div className="admin-form-group">
                <Lbl>Código *</Lbl>
                <input
                  style={inp} value={form.code} onChange={set('code')}
                  disabled={!!item} required
                  placeholder="restaurant, retail..."
                />
              </div>
            </div>
            <div className="admin-form-group" style={{ marginTop: 4 }}>
              <Lbl>Descripción</Lbl>
              <textarea
                style={{ ...inp, resize: 'vertical' }} rows={3}
                value={form.description} onChange={set('description')}
                placeholder="Descripción breve del tipo de negocio"
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, marginTop: 8 }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
              />
              Tipo de negocio activo (visible en el registro)
            </label>
          </div>
          <div className="admin-modal-footer">
            <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
              <FiCheck size={15} /> {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
