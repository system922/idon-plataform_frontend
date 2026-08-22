import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { useConfirm, useAlert } from '../../context/ConfirmContext';
import Table from '../../components/General/Table';
import Modal from '../../components/General/Modal';
import CustomCombobox from '../../components/General/CustomCombobox';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import Input from '../../components/General/Input';
import {
  FiPlus, FiEdit2, FiTrash2, FiCheck, FiRefreshCw,
  FiChevronDown, FiChevronRight, FiPackage, FiBriefcase,
  FiAlertCircle,
} from 'react-icons/fi';
import { adminApi } from '../../config/api';

const parsePerms = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
};

function PermsSummary({ permissions, modules }) {
  const perms = parsePerms(permissions);
  if (!perms.length) {
    return <span className="roles-perms-empty">Sin restricciones</span>;
  }
  return (
    <div className="roles-perms-summary">
      {perms.map(p => {
        const mod = modules.find(m => m.id === p.modulo);
        return (
          <span key={p.modulo} className="roles-perm-badge">
            {mod?.name ?? `mod-${p.modulo}`}
            {p.features?.length > 0 && (
              <span className="roles-perm-count">({p.features.length})</span>
            )}
          </span>
        );
      })}
    </div>
  );
}

function BusinessSelector({ businesses, selectedBiz, onSelect, loading }) {
  const options = [
    { value: '', label: '-- Selecciona un negocio --' },
    ...businesses.map(b => ({
      value: String(b.id),
      label: `${b.name} (${b.type || 'Sin tipo'})`
    }))
  ];

  return (
    <div className="roles-business-selector">
      <label className="roles-selector-label">Seleccionar Negocio</label>
      {loading ? (
        <span className="roles-selector-loading">Cargando negocios...</span>
      ) : (
        <div className="roles-selector-wrapper">
          <CustomCombobox
            options={options}
            value={selectedBiz?.id || ''}
            onChange={(value) => {
              const biz = businesses.find(b => String(b.id) === value);
              onSelect(biz || null);
            }}
            placeholder="Selecciona un negocio"
            filterable={true}
            size="md"
            className="roles-selector"
          />
          {selectedBiz && (
            <span className="roles-selector-slug">
              <FiBriefcase size={13} /> {selectedBiz.slug}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function Roles() {
  const { showConfirm } = useConfirm();
  const alert = useAlert();
  const [businesses, setBusinesses] = useState([]);
  const [selectedBiz, setSelectedBiz] = useState(null);
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [loadingBiz, setLoadingBiz] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    adminApi.get('/admin/businesses')
      .then(r => setBusinesses(r.data || []))
      .catch(() => setBusinesses([]))
      .finally(() => setLoadingBiz(false));
  }, []);

  const loadRoles = useCallback(async () => {
    if (!selectedBiz) return;
    setLoadingRoles(true);
    setError(null);
    try {
      const r = await adminApi.get(`/admin/tenant-roles?businessId=${selectedBiz.id}`);
      setRoles(r.roles || []);
      setModules(r.modules || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingRoles(false);
    }
  }, [selectedBiz]);

  useEffect(() => { loadRoles(); }, [loadRoles]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRoles();
    setRefreshing(false);
  };

  const handleDelete = async (id, name) => {
    if (!await showConfirm({
      title: 'Eliminar rol',
      message: `¿Eliminar el rol "${name}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      danger: true,
    })) return;
    try {
      await adminApi.delete(`/admin/tenant-roles/${id}?businessId=${selectedBiz.id}`);
      await loadRoles();
      alert.success('Rol eliminado correctamente', 'Eliminación Exitosa');
    } catch (e) {
      alert.error('Error: ' + e.message);
    }
  };

  const filteredRoles = useMemo(() => {
    if (!searchTerm) return roles;
    const term = searchTerm.toLowerCase();
    return roles.filter(r =>
      r.name?.toLowerCase().includes(term) ||
      r.description?.toLowerCase().includes(term)
    );
  }, [roles, searchTerm]);

  const columns = [
    {
      accessor: 'name',
      label: 'Nombre',
      render: (item) => (
        <strong className="roles-name">{item.name}</strong>
      ),
    },
    {
      accessor: 'description',
      label: 'Descripción',
      render: (item) => (
        <span className="roles-description">{item.description || '—'}</span>
      ),
    },
    {
      accessor: 'permissions',
      label: 'Módulos con acceso',
      render: (item) => (
        <PermsSummary permissions={item.permissions} modules={modules} />
      ),
    },
    {
      accessor: 'actions',
      label: 'Acciones',
      align: 'center',
      render: (item) => (
        <ButtonGroup>
          <IconTextButton
            variant="blue"
            size="sm"
            inline={true}
            icon={<FiEdit2 size={13} />}
            onClick={() => setModal(item)}
          >
            Editar
          </IconTextButton>
          <IconTextButton
            variant="danger"
            size="sm"
            inline={true}
            icon={<FiTrash2 size={13} />}
            onClick={() => handleDelete(item.id, item.name)}
          >
            Eliminar
          </IconTextButton>
        </ButtonGroup>
      ),
    },
  ];

  const toolbar = (
    <div className="roles-toolbar">
      <ButtonGroup>
        <IconTextButton
          variant="success"
          size="md"
          icon={<FiPlus size={13} />}
          onClick={() => setModal('new')}
          disabled={!selectedBiz}
        >
          Nuevo rol
        </IconTextButton>
      </ButtonGroup>
    </div>
  );

  const refreshButton = (
    <button
      onClick={handleRefresh}
      className="dashboard-refresh-btn-header"
      disabled={refreshing || !selectedBiz}
      title="Actualizar datos"
    >
      <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  return (
    <PageTemplate
      title="ROLES DE NEGOCIO"
      subtitle="Gestiona los roles y permisos de módulos dentro del esquema de cada negocio"
      theme="admin"
      loading={loadingBiz}
      error={error}
      onRetry={loadRoles}
      headerAction={refreshButton}
    >
      {error && (
        <div className="alert alert-error">
          <FiAlertCircle size={16} /> {error}
        </div>
      )}

      <BusinessSelector
        businesses={businesses}
        selectedBiz={selectedBiz}
        onSelect={(biz) => {
          setSelectedBiz(biz);
          setRoles([]);
          setModules([]);
        }}
        loading={loadingBiz}
      />

      {selectedBiz && (
        <Table
          data={filteredRoles}
          columns={columns}
          keyField="id"
          title="Roles del Negocio"
          subtitle={`${filteredRoles.length} ${filteredRoles.length === 1 ? 'rol' : 'roles'} encontrados • ${selectedBiz.name}`}
          toolbar={toolbar}
          searchable={true}
          searchPlaceholder="Buscar por nombre o descripción..."
          searchFields={['name', 'description']}
          pagination={true}
          itemsPerPage={10}
          itemsPerPageOptions={[10, 25, 50, 100]}
          loading={loadingRoles}
          emptyMessage={
            searchTerm
              ? 'No hay roles que coincidan con la búsqueda'
              : 'Este negocio aún no tiene roles definidos'
          }
          striped={true}
          hoverable={true}
          bordered={false}
          compact={false}
        />
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
    </PageTemplate>
  );
}

function RolModal({ item, modules, businessId, onClose, onSaved }) {
  const alert = useAlert();
  const [form, setForm] = useState({
    name: item?.name || '',
    description: item?.description || '',
    permissions: parsePerms(item?.permissions),
  });
  const [expanded, setExpanded] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const permForMod = modId => form.permissions.find(p => p.modulo === modId);
  const isModOn = modId => !!permForMod(modId);
  const isFeatOn = (modId, featId) => permForMod(modId)?.features.includes(featId) ?? false;
  const toggleExpand = modId =>
    setExpanded(e => e.includes(modId) ? e.filter(x => x !== modId) : [...e, modId]);

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
    if (!isModOn(mod.id)) {
      setExpanded(e => e.includes(mod.id) ? e : [...e, mod.id]);
    }
  };

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
    if (!form.name) {
      setError('❌ El nombre del rol es requerido');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = { businessId, ...form };
      if (item) {
        await adminApi.put(`/admin/tenant-roles/${item.id}`, payload);
        alert.success('Rol actualizado correctamente', '✅ Éxito');
      } else {
        await adminApi.post('/admin/tenant-roles', payload);
        alert.success('Rol creado correctamente', '✅ Éxito');
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const totalMods = form.permissions.length;
  const totalFeats = form.permissions.reduce((n, p) => n + p.features.length, 0);

  const footer = (
    <>
      {error && (
        <div className="modal-error-text">
          <FiAlertCircle size={16} /> {error}
        </div>
      )}
      <ButtonGroup>
        <IconTextButton
          variant="secondary"
          size="md"
          onClick={onClose}
          disabled={saving}
        >
          Cancelar
        </IconTextButton>
        <IconTextButton
          variant="success"
          size="md"
          icon={<FiCheck size={14} />}
          onClick={handleSubmit}
          disabled={saving || !form.name}
          loading={saving}
        >
          {saving ? 'Guardando...' : item ? 'Guardar cambios' : 'Crear rol'}
        </IconTextButton>
      </ButtonGroup>
    </>
  );

  return (
    <Modal
      closeOnOverlayClick={false}
      isOpen={true}
      onClose={onClose}
      title={item ? 'Editar Rol' : 'Nuevo Rol'}
      size="md"
      className="roles-modal"
      footer={footer}
    >
      <form onSubmit={handleSubmit}>
        <div className="roles-form">
          <div className="roles-form-group">
            <label>Nombre *</label>
            <Input
              type="text"
              value={form.name}
              onChange={(value) => setForm(f => ({ ...f, name: value }))}
              placeholder="ej. Cajero, Supervisor..."
              size="md"
              autoFocus
              required
            />
          </div>

          <div className="roles-form-group">
            <label>Descripción</label>
            <Input
              type="textarea"
              value={form.description}
              onChange={(value) => setForm(f => ({ ...f, description: value }))}
              placeholder="Responsabilidades de este rol..."
              size="md"
              rows={2}
            />
          </div>

          <div className="roles-permissions-section">
            <label>Módulos y Funcionalidades</label>
            <p className="roles-permissions-hint">
              Selecciona el módulo y luego marca individualmente las funcionalidades.
              Sin selección = acceso completo a todos los módulos del negocio.
            </p>

            {modules.length === 0 ? (
              <div className="roles-no-modules">
                Este negocio no tiene módulos activos.
              </div>
            ) : (
              <div className="roles-modules-list">
                {modules.map((mod, idx) => {
                  const modOn = isModOn(mod.id);
                  const isExpand = expanded.includes(mod.id);
                  const featSel = form.permissions.find(p => p.modulo === mod.id)?.features ?? [];

                  return (
                    <div
                      key={mod.id}
                      className={`roles-module-item ${modOn ? 'on' : ''}`}
                    >
                      <div
                        className="roles-module-header"
                        onClick={() => handleModCheck(mod)}
                      >
                        <input
                          type="checkbox"
                          checked={modOn}
                          onChange={() => {}}
                          className="roles-checkbox"
                        />
                        <span className="roles-module-name">
                          <FiPackage size={13} className="roles-module-icon" />
                          {mod.name}
                        </span>
                        {modOn && mod.features?.length > 0 && (
                          <span className="roles-feature-count">
                            {featSel.length}/{mod.features.length}
                          </span>
                        )}
                        {mod.features?.length > 0 && (
                          <span
                            className="roles-expand-icon"
                            onClick={(e) => { e.stopPropagation(); toggleExpand(mod.id); }}
                          >
                            {isExpand ? <FiChevronDown size={15} /> : <FiChevronRight size={15} />}
                          </span>
                        )}
                      </div>

                      {isExpand && mod.features?.length > 0 && (
                        <div className="roles-features-list">
                          {mod.features.map(feat => {
                            const featOn = isFeatOn(mod.id, feat.id);
                            return (
                              <label
                                key={feat.id}
                                className={`roles-feature-item ${featOn ? 'on' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={featOn}
                                  onChange={() => handleFeatCheck(mod, feat.id)}
                                  className="roles-feature-checkbox"
                                />
                                {feat.name}
                                {feat.is_premium && (
                                  <span className="roles-feature-premium">PRO</span>
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
              <div className="roles-summary">
                {totalMods} módulo(s) · {totalFeats} funcionalidad(es) seleccionada(s)
              </div>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}