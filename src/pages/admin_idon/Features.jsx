import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useConfirm, useAlert } from '../../context/ConfirmContext';
import {
  FiStar, FiPlus, FiEdit2, FiTrash2, FiCheck,
  FiRefreshCw, FiAlertCircle,
} from 'react-icons/fi';
import { adminApi } from '../../config/api';
import PageTemplate from '../../components/PageTemplate';
import Table from '../../components/General/Table';
import Modal from '../../components/General/Modal';
import CustomCombobox from '../../components/General/CustomCombobox';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import Input from '../../components/General/Input';
import '../../styles/Features.css';

export default function Features() {
  const { showConfirm } = useConfirm();
  const alert = useAlert();
  const [features, setFeatures] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [filterMod, setFilterMod] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [fr, mr] = await Promise.all([
        adminApi.get('/admin/features'),
        adminApi.get('/admin/modules'),
      ]);
      setFeatures(Array.isArray(fr.data) ? fr.data : []);
      setModules(Array.isArray(mr.data) ? mr.data : []);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleDelete = async (id, name) => {
    if (!await showConfirm({
      title: '⚠️ Eliminar funcionalidad',
      message: `¿Eliminar la funcionalidad "${name}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      danger: true,
    })) return;
    try {
      await adminApi.delete(`/admin/features/${id}`);
      await load();
      alert.success('Funcionalidad eliminada correctamente', '✅ Éxito');
    } catch (e) {
      alert.error('Error: ' + e.message);
    }
  };

  const activeModules = useMemo(() => {
    return modules.filter(m => m.is_active !== false);
  }, [modules]);

  const filteredFeatures = useMemo(() => {
    let result = features;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(f =>
        f.name?.toLowerCase().includes(term) ||
        f.code?.toLowerCase().includes(term) ||
        f.description?.toLowerCase().includes(term)
      );
    }

    if (filterMod) {
      result = result.filter(f => f.module_id === filterMod);
    }

    if (filterStatus === 'active') {
      result = result.filter(f => f.is_active !== false);
    } else if (filterStatus === 'inactive') {
      result = result.filter(f => f.is_active === false);
    }

    return result;
  }, [features, searchTerm, filterMod, filterStatus]);

  const modMap = useMemo(() => {
    return Object.fromEntries(modules.map(m => [m.id, m]));
  }, [modules]);

  const moduleOptions = useMemo(() => {
    const options = [
      { value: '', label: `Todos los módulos (${features.length})` }
    ];
    modules.forEach(m => {
      const count = features.filter(f => f.module_id === m.id).length;
      options.push({ value: m.id, label: `${m.name} (${count})` });
    });
    return options;
  }, [modules, features]);

  const statusOptions = [
    { value: 'todos', label: `Todos (${features.length})` },
    { value: 'active', label: `Activos (${features.filter(f => f.is_active !== false).length})` },
    { value: 'inactive', label: `Inactivos (${features.filter(f => f.is_active === false).length})` },
  ];

  const columns = [
    {
      accessor: 'name',
      label: 'Funcionalidad',
      render: (item) => (
        <div>
          <strong>{item.name}</strong>
          {item.description && (
            <div className="feature-description">{item.description}</div>
          )}
        </div>
      ),
    },
    {
      accessor: 'code',
      label: 'Código',
      render: (item) => (
        <code className="feature-code">{item.code}</code>
      ),
    },
    {
      accessor: 'module_id',
      label: 'Módulo',
      render: (item) => {
        const mod = modMap[item.module_id];
        return mod ? (
          <span className="feature-module">{mod.name}</span>
        ) : (
          <span className="feature-module-empty">—</span>
        );
      },
    },
    {
      accessor: 'is_premium',
      label: 'Premium',
      align: 'center',
      render: (item) => (
        item.is_premium
          ? <span className="admin-badge admin-badge-warning"><FiStar size={10} /> PRO</span>
          : <span className="feature-not-premium">—</span>
      ),
    },
    {
      accessor: 'is_active',
      label: 'Estado',
      render: (item) => (
        item.is_active !== false
          ? <span className="admin-badge admin-badge-success"><FiCheck size={11} /> Activo</span>
          : <span className="admin-badge admin-badge-warning">Inactivo</span>
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
    <div className="features-toolbar">
      <div className="features-filters">
        <CustomCombobox
          options={moduleOptions}
          value={filterMod}
          onChange={setFilterMod}
          placeholder="Filtrar por módulo"
          filterable={true}
          size="sm"
          className="features-filter"
        />
        <CustomCombobox
          options={statusOptions}
          value={filterStatus}
          onChange={setFilterStatus}
          placeholder="Filtrar por estado"
          filterable={false}
          size="sm"
          className="features-filter features-filter-status"
        />
      </div>
      <ButtonGroup>
        <IconTextButton
          variant="success"
          size="md"
          icon={<FiPlus size={13} />}
          onClick={() => setModal('new')}
        >
          Nueva funcionalidad
        </IconTextButton>
      </ButtonGroup>
    </div>
  );

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

  return (
    <PageTemplate
      title="FUNCIONALIDADES"
      subtitle="Gestiona las funcionalidades de cada módulo del sistema"
      theme="admin"
      loading={loading}
      error={error}
      onRetry={load}
      headerAction={refreshButton}
    >
      {error && (
        <div className="alert alert-error">
          <FiAlertCircle size={16} /> {error}
        </div>
      )}

      <Table
        data={filteredFeatures}
        columns={columns}
        keyField="id"
        title="Funcionalidades del Sistema"
        subtitle={`${filteredFeatures.length} ${filteredFeatures.length === 1 ? 'funcionalidad' : 'funcionalidades'} encontradas`}
        toolbar={toolbar}
        searchable={true}
        searchPlaceholder="Buscar por nombre, código o descripción..."
        searchFields={['name', 'code', 'description']}
        pagination={true}
        itemsPerPage={10}
        itemsPerPageOptions={[10, 25, 50, 100]}
        loading={loading}
        emptyMessage={
          searchTerm || filterMod || filterStatus !== 'todos'
            ? 'No hay funcionalidades que coincidan con los filtros aplicados'
            : 'No hay funcionalidades registradas'
        }
        striped={true}
        hoverable={true}
        bordered={false}
        compact={false}
      />

      {modal && (
        <FeatureModal
          item={modal === 'new' ? null : modal}
          modules={activeModules}
          onClose={() => setModal(null)}
          onSaved={load}
          defaultModuleId={filterMod}
        />
      )}
    </PageTemplate>
  );
}

function FeatureModal({ item, modules, onClose, onSaved, defaultModuleId }) {
  const alert = useAlert();
  const [form, setForm] = useState({
    code: item?.code || '',
    name: item?.name || '',
    description: item?.description || '',
    module_id: item?.module_id || defaultModuleId || modules[0]?.id || '',
    is_premium: item?.is_premium || false,
    is_active: item?.is_active !== false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code || !form.name || !form.module_id) {
      setError('❌ Código, nombre y módulo son requeridos');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (item) {
        await adminApi.put(`/admin/features/${item.id}`, form);
        alert.success('Funcionalidad actualizada correctamente', '✅ Éxito');
      } else {
        await adminApi.post('/admin/features', form);
        alert.success('Funcionalidad creada correctamente', '✅ Éxito');
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const moduleOptions = modules.map(m => ({
    value: m.id,
    label: m.name
  }));

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
          disabled={saving || !form.name || !form.code || !form.module_id}
          loading={saving}
        >
          {saving ? 'Guardando...' : item ? 'Guardar cambios' : 'Crear funcionalidad'}
        </IconTextButton>
      </ButtonGroup>
    </>
  );

  return (
    <Modal
      closeOnOverlayClick={false}
      isOpen={true}
      onClose={onClose}
      title={item ? 'Editar Funcionalidad' : 'Nueva Funcionalidad'}
      size="md"
      className="features-modal"
      footer={footer}
    >
      <form onSubmit={handleSubmit}>
        <div className="features-form">
          <div className="features-form-row">
            <div className="features-form-group">
              <label>Nombre *</label>
              <Input
                type="text"
                value={form.name}
                onChange={(value) => setForm(f => ({ ...f, name: value }))}
                placeholder="Ej: Gestión de inventario..."
                size="md"
                autoFocus
                required
              />
            </div>
            <div className="features-form-group">
              <label>Código *</label>
              <Input
                type="text"
                value={form.code}
                onChange={(value) => setForm(f => ({ ...f, code: value }))}
                placeholder="inventory_management..."
                size="md"
                disabled={!!item}
                required
              />
            </div>
          </div>

          <div className="features-form-group">
            <label>Módulo *</label>
            <CustomCombobox
              options={moduleOptions}
              value={form.module_id}
              onChange={(value) => setForm(f => ({ ...f, module_id: value }))}
              placeholder="Seleccionar módulo"
              filterable={true}
              size="md"
              className="features-module-combobox"
            />
          </div>

          <div className="features-form-group">
            <label>Descripción</label>
            <Input
              type="textarea"
              value={form.description}
              onChange={(value) => setForm(f => ({ ...f, description: value }))}
              placeholder="Descripción de la funcionalidad"
              size="md"
              rows={2}
            />
          </div>

          <div className="features-checkboxes">
            <label className="features-checkbox">
              <input
                type="checkbox"
                checked={form.is_premium}
                onChange={e => setForm(f => ({ ...f, is_premium: e.target.checked }))}
              />
              <FiStar size={12} className="features-checkbox-star" /> PRO / Premium
            </label>
            <label className="features-checkbox">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
              />
              Activo
            </label>
          </div>
        </div>
      </form>
    </Modal>
  );
}