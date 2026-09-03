import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { useConfirm, useAlert } from '../../context/ConfirmContext';
import Table from '../../components/General/Table';
import Modal from '../../components/General/Modal';
import CustomCombobox from '../../components/General/CustomCombobox';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import Input from '../../components/General/Input';
import {
  FiPlus, FiEdit2, FiTrash2, FiCheck,
  FiRefreshCw, FiSettings, FiAlertCircle
} from 'react-icons/fi';
import { adminApi } from '../../config/api';

export default function AdminModulos() {
  const { showConfirm } = useConfirm();
  const alert = useAlert();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await adminApi.get('/admin/modules');
      setModules(Array.isArray(r.data) ? r.data : []);
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
      title: 'Eliminar módulo',
      message: `¿Eliminar el módulo "${name}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      danger: true,
    })) return;
    try {
      await adminApi.delete(`/admin/modules/${id}`);
      await load();
      alert.success('Módulo eliminado correctamente', '✅ Éxito');
    } catch (e) {
      alert.error('Error: ' + e.message);
    }
  };

  const filteredModules = useMemo(() => {
    let result = modules;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(m =>
        m.name?.toLowerCase().includes(term) ||
        m.code?.toLowerCase().includes(term) ||
        m.description?.toLowerCase().includes(term)
      );
    }

    if (filterStatus === 'active') {
      result = result.filter(m => m.is_active !== false);
    } else if (filterStatus === 'inactive') {
      result = result.filter(m => m.is_active === false);
    }

    return result;
  }, [modules, searchTerm, filterStatus]);

  const statusOptions = [
    { value: 'todos', label: `Todos (${modules.length})` },
    { value: 'active', label: `Activos (${modules.filter(m => m.is_active !== false).length})` },
    { value: 'inactive', label: `Inactivos (${modules.filter(m => m.is_active === false).length})` },
  ];

  const columns = [
    {
      accessor: 'name',
      label: 'Nombre',
      render: (item) => (
        <div className="modulo-name">
          <div className="modulo-icon">
            <FiSettings size={14} />
          </div>
          <div>
            <strong>{item.name}</strong>
            {item.description && (
              <div className="modulo-description">{item.description}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      accessor: 'code',
      label: 'Código',
      render: (item) => (
        <code className="modulo-code">{item.code}</code>
      ),
    },
    {
      accessor: 'price_monthly',
      label: 'Precio/mes',
      align: 'right',
      render: (item) => (
        <span className="modulo-price-monthly">
          ${parseFloat(item.price_monthly || 0).toFixed(2)}
        </span>
      ),
    },
    {
      accessor: 'price_annual',
      label: 'Precio/año',
      align: 'right',
      render: (item) => (
        <span className="modulo-price-annual">
          ${parseFloat(item.price_annual || 0).toFixed(2)}
        </span>
      ),
    },
    {
      accessor: 'sort_order',
      label: 'Orden',
      align: 'center',
      render: (item) => (
        <span className="modulo-sort-order">{item.sort_order}</span>
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
          options={statusOptions}
          value={filterStatus}
          onChange={setFilterStatus}
          placeholder="Filtrar por estado"
          filterable={false}
          size="sm"
          className="features-filter"
        />
        <ButtonGroup>
          <IconTextButton
            variant="success"
            size="md"
            icon={<FiPlus size={13} />}
            onClick={() => setModal('new')}
          >
            Nuevo módulo
          </IconTextButton>
        </ButtonGroup>
      </div>
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
      title="MÓDULOS"
      subtitle="Gestiona los módulos del sistema y sus precios"
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
        data={filteredModules}
        columns={columns}
        keyField="id"
        title="Módulos del Sistema"
        subtitle={`${filteredModules.length} ${filteredModules.length === 1 ? 'módulo' : 'módulos'} encontrados`}
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
            ? 'No hay módulos que coincidan con los filtros aplicados'
            : 'No hay módulos registrados'
        }
        striped={true}
        hoverable={true}
        bordered={false}
        compact={false}
      />

      {modal && (
        <ModuloModal
          item={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </PageTemplate>
  );
}

function ModuloModal({ item, onClose, onSaved }) {
  const alert = useAlert();
  const [form, setForm] = useState({
    code: item?.code || '',
    name: item?.name || '',
    description: item?.description || '',
    price_monthly: item?.price_monthly || 0,
    price_annual: item?.price_annual || 0,
    icon: item?.icon || '',
    sort_order: item?.sort_order || 0,
    is_active: item?.is_active !== false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code || !form.name) {
      setError('Código y nombre son requeridos');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (item) {
        await adminApi.put(`/admin/modules/${item.id}`, form);
        alert.success('Módulo actualizado correctamente', 'Actualización Exitosa');
      } else {
        await adminApi.post('/admin/modules', form);
        alert.success('Módulo creado correctamente', 'Creación Exitosa');
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const monthly = parseFloat(form.price_monthly || 0);
  const annual = parseFloat(form.price_annual || 0);
  const savingAmount = monthly > 0 && annual > 0 ? (monthly * 12 - annual) : 0;

  const footer = (
    <>
      {error && (
        <div className="modal-error-text">
          <FiAlertCircle size={16} /> {error}
        </div>
      )}
      <ButtonGroup>
        <IconTextButton
          variant=""
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
          {saving ? 'Guardando...' : item ? 'Guardar cambios' : 'Crear módulo'}
        </IconTextButton>
      </ButtonGroup>
    </>
  );

  return (
    <Modal
      closeOnOverlayClick={false}
      isOpen={true}
      onClose={onClose}
      title={item ? 'Editar Módulo' : 'Nuevo Módulo'}
      size="md"
      className="modulos-modal"
      footer={footer}
    >
      <form onSubmit={handleSubmit}>
        <div className="modulos-form">
          <div className="modulos-form-row">
            <div className="modulos-form-group">
              <label>Nombre *</label>
              <Input
                type="text"
                value={form.name}
                onChange={(value) => setForm(f => ({ ...f, name: value }))}
                placeholder="Ej: Punto de Venta, Inventario..."
                size="md"
                autoFocus
                required
              />
            </div>
            <div className="modulos-form-group">
              <label>Código *</label>
              <Input
                type="text"
                value={form.code}
                onChange={(value) => setForm(f => ({ ...f, code: value }))}
                placeholder="pos, inventory..."
                size="md"
                disabled={!!item}
                required
              />
            </div>
          </div>

          <div className="modulos-form-row">
            <div className="modulos-form-group">
              <label>Precio mensual ($)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.price_monthly}
                onChange={(value) => setForm(f => ({ ...f, price_monthly: value }))}
                placeholder="0.00"
                size="md"
              />
            </div>
            <div className="modulos-form-group">
              <label>Precio anual ($)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.price_annual}
                onChange={(value) => setForm(f => ({ ...f, price_annual: value }))}
                placeholder="0.00"
                size="md"
              />
            </div>
          </div>

          <div className="modulos-form-row">
            <div className="modulos-form-group">
              <label>Ícono (código)</label>
              <Input
                type="text"
                value={form.icon}
                onChange={(value) => setForm(f => ({ ...f, icon: value }))}
                placeholder="shopping-cart"
                size="md"
              />
            </div>
            <div className="modulos-form-group">
              <label>Orden de aparición</label>
              <Input
                type="number"
                min="0"
                value={form.sort_order}
                onChange={(value) => setForm(f => ({ ...f, sort_order: value }))}
                placeholder="0"
                size="md"
              />
            </div>
          </div>

          <div className="modulos-form-group full-width">
            <label>Descripción</label>
            <Input
              type="textarea"
              value={form.description}
              onChange={(value) => setForm(f => ({ ...f, description: value }))}
              placeholder="Descripción del módulo"
              size="md"
              rows={2}
            />
          </div>

          <label className="modulos-checkbox">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
            />
            Módulo activo
          </label>

          {(monthly > 0 || annual > 0) && (
            <div className="modulos-preview">
              <span>Mensual: <strong className="modulos-preview-monthly">${monthly.toFixed(2)}</strong></span>
              <span>Anual: <strong className="modulos-preview-annual">${annual.toFixed(2)}</strong></span>
              {monthly > 0 && annual > 0 && (
                <span className="modulos-preview-saving">
                  Ahorro anual: <strong>${savingAmount.toFixed(2)}</strong>
                </span>
              )}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}