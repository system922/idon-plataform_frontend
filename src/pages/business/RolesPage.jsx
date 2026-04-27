import React, { useState, useEffect, useCallback } from "react";
import {
  FiSettings, FiShoppingCart, FiBox, FiBarChart2, FiCreditCard,
  FiDollarSign, FiClipboard, FiThermometer, FiTruck, FiGrid, FiCalendar,
  FiStar, FiUsers, FiUserCheck, FiMap, FiMapPin, FiList, FiGlobe,
  FiBell, FiFileText, FiChevronDown, FiChevronRight, FiPlus,
  FiEdit2, FiTrash2, FiRefreshCw
} from "react-icons/fi";
import PageTemplate from '../../components/PageTemplate';
import { useBusinessContext } from '../../admin/config/BusinessContext';
import { fetchWithAuth } from '../../config/apiBase';
import "../../styles/ModalRoles.css";

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
  <span style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 26, height: 26, borderRadius: 7, marginRight: 9,
    background: 'rgba(104,66,254,0.07)', color: '#6842fe', flexShrink: 0
  }}>
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
  };

  return (
    <div className="rol-modal-overlay">
      <div className="rol-modal-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h2>{role ? 'Editar rol' : 'Nuevo rol'}</h2>
          <button type="button" onClick={onClose}
            style={{ border: 'none', background: 'none', fontSize: 22, color: '#aab', cursor: 'pointer', padding: 0 }}>
            <FiChevronDown size={22} />
          </button>
        </div>

        <form onSubmit={e => { e.preventDefault(); onSave(form); }}>
          <label>Nombre</label>
          <input
            type="text" autoFocus required
            value={form.name}
            placeholder="Ej: Mesero"
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />

          <label>Descripción</label>
          <input
            type="text"
            value={form.description}
            placeholder="Descripción del rol (opcional)"
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />

          <label>Permisos / Módulos</label>
          <div className="rol-permisos-list" style={{ marginTop: 3 }}>
            {modules.map(m => (
              <div key={m.id} style={{ marginBottom: 2 }}>
                <div className="rol-modulo-checkbox"
                  style={{ fontWeight: isModSelected(m.id) ? 700 : 500, fontSize: 15, display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => handleModuleCheck(m)}
                >
                  <input type="checkbox" checked={isModSelected(m.id)}
                    onChange={() => handleModuleCheck(m)}
                    onClick={ev => ev.stopPropagation()}
                  />
                  {m.name}
                  {m.features?.length > 0 && (
                    <span style={{ marginLeft: 7, color: '#6e5dbe', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: 18 }}
                      onClick={e => { e.stopPropagation(); toggleExpand(m.id); }}>
                      {exp.includes(m.id) ? <FiChevronDown /> : <FiChevronRight />}
                    </span>
                  )}
                </div>

                {isModSelected(m.id) && m.features?.length > 0 && exp.includes(m.id) && (
                  <div className="rol-modulo-features" style={{ marginLeft: 25 }}>
                    {m.features.map(f => (
                      <label className="rol-feature-checkbox" key={f.id}
                        style={{ padding: '1px 0', minWidth: 110, fontWeight: isFeatureSelected(m.id, f.id) ? 800 : 400 }}>
                        <input type="checkbox"
                          checked={isFeatureSelected(m.id, f.id)}
                          onChange={() => handleFeatureCheck(m, f)}
                          onClick={ev => ev.stopPropagation()}
                        />
                        {f.name} {f.is_premium && <FiStar size={11} style={{ color: '#f59e0b', marginLeft: 3 }} />}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="rol-modal-footer">
            <button className="cancelar" type="button" onClick={onClose} disabled={saving}>Cancelar</button>
            <button className="crear" type="submit" disabled={saving || !form.name || !form.permissions.length}>
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
  const [showModal,   setShowModal  ] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [saving,      setSaving     ] = useState(false);

  // Módulos — no necesita X-DB-Name, usa fetchWithAuth igualmente para el token
  useEffect(() => {
    if (!selectedBusiness?.id) return setModules([]);
    fetchWithAuth('/api/navigation/business/modules-features')
      .then(r => r.json())
      .then(data => setModules(Array.isArray(data.data) ? data.data : []))
      .catch(() => setModules([]));
  }, [selectedBusiness]);

  const loadRoles = useCallback(() => {
    setLoading(true);
    fetchWithAuth('/api/core/roles')
      .then(r => r.json())
      .then(data => setRoles(Array.isArray(data.roles) ? data.roles : []))
      .catch(() => setRoles([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadRoles(); }, [loadRoles]);

  const handleSave = async (form) => {
    setSaving(true);
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
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role) => {
    if (!window.confirm(`¿Eliminar el rol "${role.name}"?`)) return;
    setSaving(true);
    try {
      await fetchWithAuth(`/api/core/roles/${role.id}`, { method: 'DELETE' });
      loadRoles();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => { setEditingRole(null); setShowModal(true); };
  const openEdit   = role => { setEditingRole(role); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditingRole(null); };

  return (
    <PageTemplate
      title="Roles y permisos"
      subtitle="Define a qué módulos y funcionalidades puede acceder cada usuario"
      headerAction={
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={loadRoles} title="Recargar" className="admin-btn admin-btn-secondary"><FiRefreshCw size={15} /></button>
          <button onClick={openCreate} className="admin-btn admin-btn-primary"><FiPlus /> Nuevo rol</button>
        </div>
      }
      loading={loading}
    >
      <div style={{ background: '#232433', borderRadius: 12, marginTop: 18 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#231d2e' }}>
              <th>Nombre</th>
              <th>Permisos / Módulos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(role => (
              <tr key={role.id}>
                <td>{role.name}</td>
                <td>
                  {(Array.isArray(role.permissions) ? role.permissions : []).map(perm => {
                    const mod = modules.find(m => m.id === perm.modulo);
                    return (
                      <div key={perm.modulo} style={{ marginBottom: 2 }}>
                        <span style={{ background: '#6842fe18', color: '#6842fe', borderRadius: 7, padding: '2px 10px', fontWeight: 700, fontSize: 13 }}>
                          {mod?.name ?? perm.modulo}
                        </span>
                        {perm.features?.length > 0 && mod?.features && (
                          <span style={{ fontSize: 11, color: '#909', marginLeft: 8 }}>
                            {mod.features
                              .filter(f => perm.features.includes(f.id))
                              .map(f => (
                                <span key={f.id} style={{ background: '#2e2942', color: '#22c55e', borderRadius: 7, marginLeft: 4, padding: '2px 7px' }}>
                                  {f.name}
                                </span>
                              ))}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </td>
                <td>
                  <button className="admin-btn" onClick={() => openEdit(role)}><FiEdit2 size={13} /></button>
                  <button className="admin-btn admin-btn-danger" onClick={() => handleDelete(role)}><FiTrash2 size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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