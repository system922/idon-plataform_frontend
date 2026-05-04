import React, { useState, useEffect, useCallback } from "react";
import {
  FiSettings, FiShoppingCart, FiBox, FiBarChart2, FiCreditCard,
  FiDollarSign, FiClipboard, FiThermometer, FiTruck, FiGrid, FiCalendar,
  FiStar, FiUsers, FiUserCheck, FiMap, FiMapPin, FiList, FiGlobe,
  FiBell, FiFileText, FiChevronDown, FiChevronRight, FiPlus,
  FiEdit2, FiTrash2, FiRefreshCw, FiX, FiAlertCircle
} from "react-icons/fi";
import PageTemplate from '../../components/PageTemplate';
import { useBusinessContext } from '../../admin/config/BusinessContext';
import { fetchWithAuth } from '../../config/apiBase';
import "../../styles/RolesPage.css";

const MOD_ICON_MAP = {
  core:          <FiSettings />,
  pos:           <FiShoppingCart />,
  inventory:     <FiBox />,
  reports:       <FiBarChart2 />,
  payments:      <FiCreditCard />,
  accounting:    <FiDollarSign />,
  orders:        <FiClipboard />,
  kitchen:       <FiThermometer />,
  delivery:      <FiTruck />,
  tables:        <FiGrid />,
  reservations:  <FiCalendar />,
  loyalty:       <FiStar />,
  suppliers:     <FiTruck />,
  purchases:     <FiShoppingCart />,
  appointments:  <FiCalendar />,
  employees:     <FiUsers />,
  crm:           <FiUserCheck />,
  routes:        <FiMap />,
  tracking:      <FiMapPin />,
  queue:         <FiList />,
  ecommerce:     <FiGlobe />,
  notifications: <FiBell />,
  einvoicing:    <FiFileText />,
};

const ModIcon = ({ code }) => (
  <span className="rol-mod-icon">
    {MOD_ICON_MAP[code] || <FiBox />}
  </span>
);

// ─── Modal ───────────────────────────────────────────────────────────────────

function RoleModal({ role, onClose, onSave, saving, modules }) {
  const getInitialPermissions = () =>
    role?.permissions?.length
      ? role.permissions.map(p => ({ modulo: p.modulo, features: Array.isArray(p.features) ? p.features : [] }))
      : [];

  const [form, setForm] = useState({
    name:        role?.name        ?? '',
    description: role?.description ?? '',
    permissions: getInitialPermissions(),
  });
  const [exp, setExp] = useState([]);
  const [error, setError] = useState('');

  const toggleExpand    = modId => setExp(e => e.includes(modId) ? e.filter(x => x !== modId) : [...e, modId]);
  const isModSelected   = modId => !!form.permissions.find(p => p.modulo === modId);
  const isFeatureSelected = (modId, featId) => form.permissions.find(p => p.modulo === modId)?.features.includes(featId) ?? false;

  const handleModuleCheck = mod => {
    setForm(f => {
      const perms = [...f.permissions];
      const idx   = perms.findIndex(p => p.modulo === mod.id);
      idx >= 0
        ? perms.splice(idx, 1)
        : perms.push({ modulo: mod.id, features: mod.features?.map(ft => ft.id) ?? [] });
      return { ...f, permissions: perms };
    });
    setExp(e => e.includes(mod.id) ? e : [...e, mod.id]);
    setError('');
  };

  const handleFeatureCheck = (mod, feature) => {
    setForm(f => {
      let perms = [...f.permissions];
      let perm  = perms.find(p => p.modulo === mod.id);
      if (!perm) {
        perms.push({ modulo: mod.id, features: [feature.id] });
      } else if (perm.features.includes(feature.id)) {
        perm.features = perm.features.filter(id => id !== feature.id);
        if (!perm.features.length) perms = perms.filter(p => p.modulo !== mod.id);
      } else {
        perm.features.push(feature.id);
      }
      return { ...f, permissions: perms };
    });
    setExp(e => e.includes(mod.id) ? e : [...e, mod.id]);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('❌ El nombre del rol es requerido');
      return;
    }
    if (!form.permissions.length) {
      setError('❌ Debes seleccionar al menos un módulo o permiso');
      return;
    }
    onSave(form);
  };

  return (
    <div className="rol-modal-overlay">
      <div className="rol-modal-box">
        <div className="rol-modal-header">
          <h2>{role ? 'Editar rol' : 'Nuevo rol'}</h2>
          <button type="button" onClick={onClose} className="rol-modal-close">
            <FiX size={22} />
          </button>
        </div>

        {error && (
          <div className="alert alert-error">
            <FiAlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="rol-form-group">
            <label>Nombre del rol *</label>
            <input
              type="text" autoFocus required
              value={form.name}
              placeholder="Ej: Administrador, Mesero, Cajero"
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="rol-form-group">
            <label>Descripción</label>
            <input
              type="text"
              value={form.description}
              placeholder="Descripción del rol (opcional)"
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="rol-form-group">
            <label>Permisos / Módulos *</label>
            <div className="rol-permisos-list">
              {modules.map(m => (
                <div key={m.id} className="rol-modulo-item">
                  <div 
                    className={`rol-modulo-checkbox ${isModSelected(m.id) ? 'selected' : ''}`}
                    onClick={() => handleModuleCheck(m)}
                  >
                    <input 
                      type="checkbox" 
                      checked={isModSelected(m.id)}
                      onChange={() => handleModuleCheck(m)}
                      onClick={ev => ev.stopPropagation()}
                    />
                    <ModIcon code={m.code || m.id} />
                    <span className="rol-modulo-name">{m.name}</span>
                    {m.features?.length > 0 && (
                      <span 
                        className="rol-modulo-expand"
                        onClick={e => { e.stopPropagation(); toggleExpand(m.id); }}
                      >
                        {exp.includes(m.id) ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                      </span>
                    )}
                  </div>

                  {isModSelected(m.id) && m.features?.length > 0 && exp.includes(m.id) && (
                    <div className="rol-modulo-features">
                      {m.features.map(f => (
                        <label 
                          className={`rol-feature-checkbox ${isFeatureSelected(m.id, f.id) ? 'selected' : ''}`}
                          key={f.id}
                        >
                          <input
                            type="checkbox"
                            checked={isFeatureSelected(m.id, f.id)}
                            onChange={() => handleFeatureCheck(m, f)}
                            onClick={ev => ev.stopPropagation()}
                          />
                          <span>{f.name}</span>
                          {f.is_premium && <FiStar size={11} className="rol-premium-icon" />}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rol-modal-footer">
            <button className="rol-btn-cancel" type="button" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button className="rol-btn-save" type="submit" disabled={saving || !form.name || !form.permissions.length}>
              {saving ? 'Guardando...' : role ? 'Guardar cambios' : 'Crear rol'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function RolesPage() {
  const { selectedBusiness } = useBusinessContext();
  const [roles,       setRoles      ] = useState([]);
  const [modules,     setModules    ] = useState([]);
  const [loading,     setLoading    ] = useState(true);
  const [refreshing,  setRefreshing ] = useState(false);
  const [showModal,   setShowModal  ] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [saving,      setSaving     ] = useState(false);
  const [error,       setError      ] = useState('');

  // Módulos
  useEffect(() => {
    if (!selectedBusiness?.id) return setModules([]);
    fetchWithAuth('/api/navigation/business/modules-features')
      .then(r => r.json())
      .then(data => setModules(Array.isArray(data.data) ? data.data : []))
      .catch(() => setModules([]));
  }, [selectedBusiness]);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth('/api/core/roles');
      const data = await res.json();
      setRoles(Array.isArray(data.roles) ? data.roles : []);
    } catch (err) {
      setError('Error al cargar los roles');
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRoles(); }, [loadRoles]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRoles();
    setRefreshing(false);
  };

  const handleSave = async (form) => {
    setSaving(true);
    setError('');
    try {
      const { name, description, permissions } = form;
      const isEdit = !!editingRole;
      const res = await fetchWithAuth(
        isEdit ? `/api/core/roles/${editingRole.id}` : '/api/core/roles',
        { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify({ name, description, permissions }) }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? data.message ?? 'Error al guardar rol');
      setShowModal(false);
      setEditingRole(null);
      loadRoles();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role) => {
    if (!window.confirm(`¿Eliminar el rol "${role.name}"? Esta acción no se puede deshacer.`)) return;
    setSaving(true);
    try {
      await fetchWithAuth(`/api/core/roles/${role.id}`, { method: 'DELETE' });
      loadRoles();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => { setEditingRole(null); setError(''); setShowModal(true); };
  const openEdit   = role => { setEditingRole(role); setError(''); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditingRole(null); setError(''); };

  // Botones para el headerAction
  const refreshButton = (
    <button 
      onClick={handleRefresh} 
      className="dashboard-refresh-btn-header"
      disabled={refreshing}
      title="Actualizar datos"
    >
      <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} /> 
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  const newRoleButton = (
    <button onClick={openCreate} className="roles-btn-primary">
      <FiPlus size={16} /> Nuevo rol
    </button>
  );

  return (
    <PageTemplate
      title="ROLES Y PERMISOS"
      subtitle="Define a qué módulos y funcionalidades puede acceder cada usuario"
      theme="business"
      loading={loading}
      headerAction={
        <div className="roles-header-actions">
          {newRoleButton}
          {refreshButton}
        </div>
      }
    >
      {error && (
        <div className="alert alert-error">
          <FiAlertCircle size={16} /> {error}
        </div>
      )}

      <div className="roles-table-container">
        <div className="roles-table-wrapper">
          <table className="roles-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Permisos / Módulos</th>
                <th style={{ width: '100px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {roles.length === 0 ? (
                <tr>
                  <td colSpan={3} className="roles-empty-state">
                    <FiSettings size={48} className="roles-empty-icon" />
                    <span>No hay roles registrados</span>
                    <button onClick={openCreate} className="roles-empty-btn">
                      <FiPlus size={14} /> Crear primer rol
                    </button>
                  </td>
                </tr>
              ) : (
                roles.map(role => (
                  <tr key={role.id}>
                    <td className="roles-cell-name">
                      <strong>{role.name}</strong>
                      {role.description && (
                        <span className="roles-cell-description">{role.description}</span>
                      )}
                    </td>
                    <td className="roles-cell-permissions">
                      <div className="roles-permissions-container">
                        {(Array.isArray(role.permissions) ? role.permissions : []).map(perm => {
                          const mod = modules.find(m => m.id === perm.modulo);
                          return (
                            <div key={perm.modulo} className="roles-permission-badge">
                              <span className="roles-permission-module">
                                {mod?.name ?? perm.modulo}
                              </span>
                              {perm.features?.length > 0 && (
                                <div className="roles-permission-features">
                                  {mod?.features
                                    ?.filter(f => perm.features.includes(f.id))
                                    .map(f => (
                                      <span key={f.id} className="roles-permission-feature">
                                        {f.name}
                                      </span>
                                    ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="roles-cell-actions">
                      <button 
                        className="roles-action-btn edit" 
                        onClick={() => openEdit(role)}
                        title="Editar rol"
                      >
                        <FiEdit2 size={14} />
                      </button>
                      <button 
                        className="roles-action-btn delete" 
                        onClick={() => handleDelete(role)}
                        title="Eliminar rol"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <RoleModal
          role={editingRole}
          modules={modules}
          onClose={closeModal}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </PageTemplate>
  );
}