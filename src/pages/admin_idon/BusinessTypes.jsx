import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { useConfirm, useAlert } from '../../context/ConfirmContext';
import Table from '../../components/General/Table';
import Modal from '../../components/General/Modal';
import CustomCombobox from '../../components/General/CustomCombobox';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import Input from '../../components/General/Input';
import {
  FiBriefcase, FiPlus, FiEdit2, FiTrash2, FiCheck,
  FiRefreshCw, FiAlertCircle,
} from 'react-icons/fi';
import { adminApi } from '../../config/api';

export default function BusinessTypes() {
  const { showConfirm } = useConfirm();
  const alert = useAlert();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await adminApi.get('/admin/business-types');
      setTypes(Array.isArray(r) ? r : (r.data || []));
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
      title: 'Eliminar tipo de negocio',
      message: `¿Eliminar el tipo "${name}"? Los negocios asociados quedarán sin tipo. Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      danger: true,
    })) return;
    try {
      await adminApi.delete(`/admin/business-types/${id}`);
      await load();
      alert.success('Tipo de negocio eliminado correctamente', '✅ Éxito');
    } catch (e) {
      alert.error('Error: ' + e.message);
    }
  };

  const filteredTypes = useMemo(() => {
    let result = types;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(t =>
        t.name?.toLowerCase().includes(term) ||
        t.code?.toLowerCase().includes(term) ||
        t.description?.toLowerCase().includes(term)
      );
    }

    if (filterStatus === 'active') {
      result = result.filter(t => t.is_active !== false);
    } else if (filterStatus === 'inactive') {
      result = result.filter(t => t.is_active === false);
    }

    return result;
  }, [types, searchTerm, filterStatus]);

  const statusOptions = [
    { value: 'todos', label: `Todos (${types.length})` },
    { value: 'active', label: `Activos (${types.filter(t => t.is_active !== false).length})` },
    { value: 'inactive', label: `Inactivos (${types.filter(t => t.is_active === false).length})` },
  ];

  const columns = [
    {
      accessor: 'name',
      label: 'Nombre',
      render: (item) => (
        <div className="business-type-name">
          <div className="business-type-icon">
            <FiBriefcase size={14} />
          </div>
          <strong>{item.name}</strong>
        </div>
      ),
    },
    {
      accessor: 'code',
      label: 'Código',
      render: (item) => (
        <code className="business-type-code">{item.code}</code>
      ),
    },
    {
      accessor: 'description',
      label: 'Descripción',
      render: (item) => (
        <span className="business-type-description">
          {item.description || '—'}
        </span>
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
    <div className="business-types-toolbar">
      <CustomCombobox
        options={statusOptions}
        value={filterStatus}
        onChange={setFilterStatus}
        placeholder="Filtrar por estado"
        filterable={false}
        size="sm"
        className="business-types-filter"
      />
      <ButtonGroup>
        <IconTextButton
          variant="success"
          size="md"
          icon={<FiPlus size={13} />}
          onClick={() => setModal('new')}
        >
          Nuevo tipo
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
      title="TIPOS DE NEGOCIO"
      subtitle="Gestiona las categorías de negocio disponibles en la plataforma"
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
        data={filteredTypes}
        columns={columns}
        keyField="id"
        title="Tipos de Negocio"
        subtitle={`${filteredTypes.length} ${filteredTypes.length === 1 ? 'tipo' : 'tipos'} encontrados`}
        toolbar={toolbar}
        searchable={true}
        searchPlaceholder="Buscar por nombre, código o descripción..."
        searchFields={['name', 'code', 'description']}
        pagination={true}
        itemsPerPage={10}
        itemsPerPageOptions={[10, 25, 50, 100]}
        loading={loading}
        emptyMessage={
          searchTerm || filterStatus !== 'todos'
            ? 'No hay tipos de negocio que coincidan con los filtros aplicados'
            : 'No hay tipos de negocio registrados'
        }
        striped={true}
        hoverable={true}
        bordered={false}
        compact={false}
      />

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
  const alert = useAlert();
  const [form, setForm] = useState({
    code: item?.code || '',
    name: item?.name || '',
    description: item?.description || '',
    is_active: item?.is_active !== false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code || !form.name) {
      setError('❌ Código y nombre son requeridos');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (item) {
        await adminApi.put(`/admin/business-types/${item.id}`, form);
        alert.success('Tipo de negocio actualizado correctamente', '✅ Éxito');
      } else {
        await adminApi.post('/admin/business-types', form);
        alert.success('Tipo de negocio creado correctamente', '✅ Éxito');
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

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
          disabled={saving || !form.name || !form.code}
          loading={saving}
        >
          {saving ? 'Guardando...' : item ? 'Guardar cambios' : 'Crear tipo'}
        </IconTextButton>
      </ButtonGroup>
    </>
  );

  return (
    <Modal
      closeOnOverlayClick={false}
      isOpen={true}
      onClose={onClose}
      title={item ? 'Editar Tipo de Negocio' : 'Nuevo Tipo de Negocio'}
      size="md"
      className="business-types-modal"
      footer={footer}
    >
      <form onSubmit={handleSubmit}>
        <div className="business-types-form">
          <div className="business-types-form-row">
            <div className="business-types-form-group">
              <label>Nombre *</label>
              <Input
                type="text"
                value={form.name}
                onChange={(value) => setForm(f => ({ ...f, name: value }))}
                placeholder="Ej: Restaurante, Retail..."
                size="md"
                autoFocus
                required
              />
            </div>
            <div className="business-types-form-group">
              <label>Código *</label>
              <Input
                type="text"
                value={form.code}
                onChange={(value) => setForm(f => ({ ...f, code: value }))}
                placeholder="restaurant, retail..."
                size="md"
                disabled={!!item}
                required
              />
            </div>
          </div>

          <div className="business-types-form-group full-width">
            <label>Descripción</label>
            <Input
              type="textarea"
              value={form.description}
              onChange={(value) => setForm(f => ({ ...f, description: value }))}
              placeholder="Descripción breve del tipo de negocio"
              size="md"
              rows={3}
            />
          </div>

          <label className="business-types-checkbox">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
            />
            Tipo de negocio activo (visible en el registro)
          </label>
        </div>
      </form>
    </Modal>
  );
}