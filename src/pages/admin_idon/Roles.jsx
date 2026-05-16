import React, { useState, useEffect, useCallback } from 'react';
import { useConfirm } from '../../context/ConfirmContext';
import { useAlert } from '../../components/ConfirmContext';
import {
  FiLock, FiPlus, FiEdit2, FiTrash2, FiCheck, FiRefreshCw,
  FiChevronDown, FiChevronRight, FiPackage, FiBriefcase, FiUsers
} from 'react-icons/fi';
import { adminApiService as apiService } from '../../services/apiService';
import '../../styles/AdminPages.css';

const inp = {
  width: '100%', padding: '9px 12px', borderRadius: '8px', fontSize: '13px',
  background: 'var(--admin-bg-primary)', border: '1px solid var(--admin-border-light)',
  color: 'var(--admin-text-primary)',
};

const Lbl = ({ children }) => (
  <label style={{
    display: 'block', marginBottom: 5, fontSize: 11, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '.5px', color: '#8CB79B',
  }}>
    {children}
  </label>
);

/* Parsear permissions (JSONB o string) */
const parsePerms = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
};

/* Resumen de permisos en la tabla */
function PermsSummary({ permissions, modules }) {
  const perms = parsePerms(permissions);
  if (!perms.length)
    return <span style={{ color: 'var(--admin-text-muted)', fontSize: 12 }}>Sin restricciones</span>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {perms.map(p => {
        const mod = modules.find(m => m.id === p.modulo);
        return (
          <span key={p.modulo} style={{
            background: '#ff8c4215', color: '#ff8c42', border: '1px solid #ff8c4230',
            borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600,
          }}>
            {mod?.name ?? `mod-${p.modulo}`}
            {p.features?.length > 0 && (
              <span style={{ color: '#8CB79B', marginLeft: 4 }}>({p.features.length})</span>
            )}
          </span>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
════════════════════════════════════════════════════════════ */
export default function Roles() {
  const { showConfirm } = useConfirm();
  const alert = useAlert();
  const [businesses,       setBusinesses]      = useState([]);
  const [selectedBiz,      setSelectedBiz]     = useState(null);  // { id, name, slug, type }
  const [roles,            setRoles]           = useState([]);
  const [modules,          setModules]         = useState([]);
  const [loadingBiz,       setLoadingBiz]      = useState(true);
  const [loadingRoles,     setLoadingRoles]    = useState(false);
  const [error,            setError]           = useState(null);
  const [modal,            setModal]           = useState(null);  // null | 'new' | roleObj

  /* Cargar negocios aprovisionados */
  useEffect(() => {
    apiService.get('/admin/businesses')
      .then(r => setBusinesses(r.data || []))
      .catch(() => setBusinesses([]))
      .finally(() => setLoadingBiz(false));
  }, []);

  const loadRoles = useCallback(async () => {
    if (!selectedBiz) return;
    setLoadingRoles(true);
    setError(null);
    try {
      const r = await apiService.get(`/admin/tenant-roles?businessId=${selectedBiz.id}`);
      setRoles(r.roles || []);
      setModules(r.modules || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingRoles(false);
    }
  }, [selectedBiz]);

  useEffect(() => { loadRoles(); }, [loadRoles]);

  const handleDelete = async (id) => {
    if (!await showConfirm('¿Eliminar este rol?')) return;
    try {
      await apiService.delete(`/admin/tenant-roles/${id}?businessId=${selectedBiz.id}`);
      loadRoles();
    } catch (e) { await alert.error('Error: ' + e.message); }
  };

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Roles de Negocio</h1>
        <p className="admin-page-subtitle">
          Gestiona los roles y permisos de módulos dentro del esquema de cada negocio
        </p>
      </div>

      {/* ── Selector de negocio ── */}
      <div className="admin-card" style={{ marginBottom: 16 }}>
        <div className="admin-card-body" style={{ padding: '14px 16px' }}>
          <Lbl>Seleccionar Negocio</Lbl>
          {loadingBiz ? (
            <p style={{ fontSize: 13, color: 'var(--admin-text-muted)' }}>Cargando negocios...</p>
          ) : (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                style={{ ...inp, maxWidth: 360 }}
                value={selectedBiz?.id || ''}
                onChange={e => {
                  const biz = businesses.find(b => String(b.id) === e.target.value);
                  setSelectedBiz(biz || null);
                  setRoles([]);
                  setModules([]);
                }}
              >
                <option value="">-- Selecciona un negocio --</option>
                {businesses.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.type})</option>
                ))}
              </select>
              {selectedBiz && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 12, color: '#8CB79B', fontWeight: 600,
                }}>
                  <FiBriefcase size={13} /> {selectedBiz.slug}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Tabla de roles ── */}
      {selectedBiz && (
        <>
          {error && (
            <div className="admin-card" style={{ marginBottom: 16, borderLeft: '4px solid #ef4444' }}>
              <div className="admin-card-body">
                <p style={{ color: '#ef4444', margin: 0 }}>Error: {error}</p>
              </div>
            </div>
          )}

          <div className="admin-card">
            <div className="admin-card-header">
              <h2>
                <FiUsers size={15} style={{ marginRight: 6 }} />
                Roles — {selectedBiz.name} ({roles.length})
              </h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="admin-btn admin-btn-secondary" onClick={loadRoles}>
                  <FiRefreshCw size={14} />
                </button>
                <button className="admin-btn admin-btn-primary" onClick={() => setModal('new')}>
                  <FiPlus size={15} /> Nuevo rol
                </button>
              </div>
            </div>

            <div className="admin-card-body">
              {loadingRoles ? (
                <div className="admin-loading"><div className="admin-spinner" />Cargando roles...</div>
              ) : roles.length === 0 ? (
                <div className="admin-empty">
                  <div className="admin-empty-icon"><FiLock size={36} /></div>
                  <p className="admin-empty-title">Sin roles</p>
                  <p style={{ fontSize: 13, color: 'var(--admin-text-muted)' }}>
                    Este negocio aún no tiene roles definidos
                  </p>
                </div>
              ) : (
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Descripción</th>
                        <th>Módulos con acceso</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roles.map(r => (
                        <tr key={r.id}>
                          <td><strong style={{ fontSize: 13 }}>{r.name}</strong></td>
                          <td style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                            {r.description || '—'}
                          </td>
                          <td><PermsSummary permissions={r.permissions} modules={modules} /></td>
                          <td>
                            <div className="admin-table-actions">
                              <button className="admin-table-btn" onClick={() => setModal(r)}>
                                <FiEdit2 size={13} /> Editar
                              </button>
                              <button
                                className="admin-table-btn admin-table-btn-danger"
                                onClick={() => handleDelete(r.id)}
                              >
                                <FiTrash2 size={13} /> Eliminar
                              </button>
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
        </>
      )}

      {modal && selectedBiz && (
        <RolModal
          item={modal === 'new' ? null : modal}
          modules={modules}
          businessId={selectedBiz.id}
          onClose={() => setModal(null)}
          onSaved={loadRoles}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MODAL DE CREACIÓN / EDICIÓN
════════════════════════════════════════════════════════════ */
function RolModal({ item, modules, businessId, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:        item?.name        || '',
    description: item?.description || '',
    permissions: parsePerms(item?.permissions),
  });
  const [expanded, setExpanded] = useState([]);
  const [saving,   setSaving]   = useState(false);

  /* Helpers */
  const permForMod = modId => form.permissions.find(p => p.modulo === modId);
  const isModOn    = modId => !!permForMod(modId);
  const isFeatOn   = (modId, featId) => permForMod(modId)?.features.includes(featId) ?? false;
  const toggleExpand = modId =>
    setExpanded(e => e.includes(modId) ? e.filter(x => x !== modId) : [...e, modId]);

  /* Marcar/desmarcar módulo — SIN auto-seleccionar features */
  const handleModCheck = mod => {
    setForm(f => {
      const rest = f.permissions.filter(p => p.modulo !== mod.id);
      return {
        ...f,
        permissions: isModOn(mod.id)
          ? rest
          : [...rest, { modulo: mod.id, features: [] }],
      };
    });
    if (!isModOn(mod.id))
      setExpanded(e => e.includes(mod.id) ? e : [...e, mod.id]);
  };

  /* Marcar/desmarcar feature individual */
  const handleFeatCheck = (mod, featId) => {
    setForm(f => {
      const perms = [...f.permissions];
      const idx = perms.findIndex(p => p.modulo === mod.id);
      if (idx === -1) {
        perms.push({ modulo: mod.id, features: [featId] });
      } else {
        const feats = perms[idx].features;
        perms[idx] = {
          ...perms[idx],
          features: feats.includes(featId)
            ? feats.filter(id => id !== featId)
            : [...feats, featId],
        };
      }
      return { ...f, permissions: perms };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) return await alert.error('El nombre es requerido');
    setSaving(true);
    try {
      const payload = { businessId, ...form };
      if (item) await apiService.put(`/admin/tenant-roles/${item.id}`, payload);
      else       await apiService.post('/admin/tenant-roles', payload);
      onSaved();
      onClose();
    } catch (e) { await alert.error('Error: ' + e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div
        className="admin-modal"
        style={{ maxWidth: 600, width: '95vw' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="admin-modal-header">
          <h2>
            <FiLock size={17} style={{ marginRight: 8, color: '#ff8c42' }} />
            {item ? 'Editar' : 'Nuevo'} Rol
          </h2>
          <button className="admin-modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-modal-body">

            {/* Nombre */}
            <div className="admin-form-group">
              <Lbl>Nombre *</Lbl>
              <input
                style={inp}
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="ej. Cajero, Supervisor..."
                required
              />
            </div>

            {/* Descripción */}
            <div className="admin-form-group">
              <Lbl>Descripción</Lbl>
              <textarea
                style={{ ...inp, resize: 'vertical' }}
                rows={2}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Responsabilidades de este rol..."
              />
            </div>

            {/* Picker de módulos y features */}
            <Lbl>Módulos y Funcionalidades</Lbl>
            <p style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: -2, marginBottom: 10 }}>
              Selecciona el módulo y luego marca individualmente las funcionalidades.
              Sin selección = acceso completo a todos los módulos del negocio.
            </p>

            {modules.length === 0 ? (
              <div style={{ padding: '12px 0', color: 'var(--admin-text-muted)', fontSize: 13 }}>
                Este negocio no tiene módulos activos.
              </div>
            ) : (
              <div style={{
                maxHeight: 320, overflowY: 'auto', borderRadius: 8,
                border: '1px solid var(--admin-border-light)',
                background: 'var(--admin-bg-secondary)',
              }}>
                {modules.map((mod, idx) => {
                  const modOn    = isModOn(mod.id);
                  const isExpand = expanded.includes(mod.id);
                  const featSel  = form.permissions.find(p => p.modulo === mod.id)?.features ?? [];

                  return (
                    <div
                      key={mod.id}
                      style={{
                        borderBottom: idx < modules.length - 1 ? '1px solid var(--admin-border-light)' : 'none',
                      }}
                    >
                      {/* Fila del módulo */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px',
                        background: modOn ? 'rgba(255,140,66,0.06)' : 'transparent',
                      }}>
                        <input
                          type="checkbox"
                          checked={modOn}
                          onChange={() => handleModCheck(mod)}
                          style={{ cursor: 'pointer', accentColor: '#ff8c42', width: 15, height: 15, flexShrink: 0 }}
                        />
                        <span
                          style={{ flex: 1, fontWeight: modOn ? 700 : 500, fontSize: 13, cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => toggleExpand(mod.id)}
                        >
                          <FiPackage size={13} style={{ marginRight: 6, opacity: .6 }} />
                          {mod.name}
                        </span>
                        {modOn && mod.features?.length > 0 && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, background: '#ff8c4220',
                            color: '#ff8c42', borderRadius: 10, padding: '1px 7px',
                          }}>
                            {featSel.length}/{mod.features.length}
                          </span>
                        )}
                        {mod.features?.length > 0 && (
                          <span
                            style={{ color: 'var(--admin-text-muted)', cursor: 'pointer', lineHeight: 1 }}
                            onClick={() => toggleExpand(mod.id)}
                          >
                            {isExpand ? <FiChevronDown size={15} /> : <FiChevronRight size={15} />}
                          </span>
                        )}
                      </div>

                      {/* Features del módulo */}
                      {isExpand && mod.features?.length > 0 && (
                        <div style={{
                          padding: '4px 14px 10px 40px',
                          background: 'rgba(0,0,0,0.08)',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                          gap: '4px 12px',
                        }}>
                          {mod.features.map(feat => {
                            const featOn = isFeatOn(mod.id, feat.id);
                            return (
                              <label
                                key={feat.id}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 7,
                                  cursor: 'pointer', fontSize: 12, padding: '3px 0',
                                  color: featOn ? 'var(--admin-text-primary)' : 'var(--admin-text-muted)',
                                  fontWeight: featOn ? 600 : 400,
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={featOn}
                                  onChange={() => handleFeatCheck(mod, feat.id)}
                                  style={{ cursor: 'pointer', accentColor: '#8CB79B', width: 13, height: 13 }}
                                />
                                {feat.name}
                                {feat.is_premium && (
                                  <span style={{
                                    fontSize: 9, background: '#f59e0b20', color: '#f59e0b',
                                    borderRadius: 4, padding: '1px 4px',
                                  }}>PRO</span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {form.permissions.length > 0 && (
              <div style={{ marginTop: 10, fontSize: 11, color: 'var(--admin-text-muted)' }}>
                {form.permissions.length} módulo(s) · {form.permissions.reduce((n, p) => n + p.features.length, 0)} funcionalidad(es) seleccionada(s)
              </div>
            )}
          </div>

          <div className="admin-modal-footer">
            <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
              <FiCheck size={15} /> {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
