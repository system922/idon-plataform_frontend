import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useConfirm } from '../../context/ConfirmContext';
import { useAlert } from '../../components/ConfirmContext';
import {
  FiPlus, FiEdit2, FiTrash2, FiRefreshCw, FiX, FiAlertCircle, FiTruck
} from "react-icons/fi";
import PageTemplate from '../../components/PageTemplate';
import { fetchWithAuth } from '../../config/apiBase_';
import Table from '../../components/General/Table';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import SearchInput from '../../components/General/SearchInput';
import Input from '../../components/General/Input';
import Modal from '../../components/General/Modal';
import CustomCombobox from '../../components/General/CustomCombobox';

const EMPTY = { name: '', tax_id: '', contact: '', phone: '', email: '', address: '' };

// ─── Modal de proveedores ─────────────────────────────────────────────────────

function SupplierModal({ supplier, onClose, onSave, saving }) {
  const [form, setForm] = useState(supplier ? { ...supplier } : { ...EMPTY });
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('❌ El nombre del proveedor es requerido');
      return;
    }
    onSave(form);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={supplier ? 'Editar proveedor' : 'Nuevo proveedor'}
      size="md"
      footer={
        <>
          {error && (
            <div className="modal-error-text" style={{ color: 'var(--danger)', marginBottom: '12px' }}>
              <FiAlertCircle size={16} /> {error}
            </div>
          )}
          <ButtonGroup>
            <IconTextButton
              variant="danger"
              size="md"
              icon={<FiX size={14} />}
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </IconTextButton>
            <IconTextButton
              variant="success"
              size="md"
              icon={<FiPlus size={14} />}
              onClick={handleSubmit}
              disabled={saving || !form.name}
              loading={saving}
            >
              {saving ? 'Guardando...' : supplier ? 'Guardar cambios' : 'Crear proveedor'}
            </IconTextButton>
          </ButtonGroup>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Fila 1: RUC (menos ancho) + Nombre */}
          <div style={{ display: 'grid', gridTemplateColumns: '0.6fr 1.4fr', gap: '16px' }}>
            <div className="form-group">
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-secondary)' }}>
                RUC / NIT
              </label>
              <Input
                type="text"
                value={form.tax_id || ''}
                onChange={(value) => set('tax_id', value)}
                placeholder="Ej: 1234567890001"
                size="md"
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-secondary)' }}>
                Nombre *
              </label>
              <Input
                type="text"
                value={form.name}
                onChange={(value) => set('name', value)}
                placeholder="Ej: Distribuidora XYZ"
                size="md"
                autoFocus
                required
              />
            </div>
          </div>

          {/* Fila 2: Teléfono (menos ancho) + Email */}
          <div style={{ display: 'grid', gridTemplateColumns: '0.6fr 1.4fr', gap: '16px' }}>
            <div className="form-group">
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-secondary)' }}>
                Teléfono
              </label>
              <Input
                type="text"
                value={form.phone || ''}
                onChange={(value) => set('phone', value)}
                placeholder="099 999 9999"
                size="md"
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-secondary)' }}>
                Email
              </label>
              <Input
                type="email"
                value={form.email || ''}
                onChange={(value) => set('email', value)}
                placeholder="proveedor@email.com"
                size="md"
              />
            </div>
          </div>

          {/* Fila 3: Dirección (ancho completo) */}
          <div className="form-group">
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-secondary)' }}>
              Dirección
            </label>
            <Input
              type="text"
              value={form.address || ''}
              onChange={(value) => set('address', value)}
              placeholder="Dirección del proveedor..."
              size="md"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────

export default function InventorySuppliersPage() {
  const { showConfirm } = useConfirm();
  const alert = useAlert();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Opciones para el filtro de estado
  const statusOptions = [
    { value: 'all', label: 'Todos los estados' },
    { value: 'active', label: 'Activos' },
    { value: 'inactive', label: 'Inactivos' },
  ];

  // ── Carga de proveedores ──────────────────────────────────────────────────
  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth('/api/suppliers');
      if (!res.ok) throw new Error('Error al cargar proveedores');
      const data = await res.json();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Error al cargar los proveedores');
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSuppliers();
    setRefreshing(false);
  };

  const handleSave = async (form) => {
    setSaving(true);
    setError('');
    try {
      const isEdit = !!editing;
      const url = isEdit ? `/api/suppliers/${editing.id}` : '/api/suppliers';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetchWithAuth(url, { method, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Error al guardar proveedor');
      await loadSuppliers();
      setShowModal(false);
      setEditing(null);
      await alert.success(isEdit ? '✅ Proveedor actualizado correctamente' : '✅ Proveedor creado correctamente');
    } catch (e) {
      setError(e.message);
      await alert.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Eliminar con confirmación (ELIMINACIÓN FÍSICA) ──────────────────────
  const handleDelete = async (supplier) => {
    const confirmed = await showConfirm({
      title: 'Confirmar eliminación',
      message: `¿Eliminar el proveedor "${supplier.name}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      danger: true,
    });

    if (!confirmed) return;

    setSaving(true);
    try {
      const res = await fetchWithAuth(`/api/suppliers/${supplier.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      await loadSuppliers();
      await alert.success(`Proveedor "${supplier.name}" eliminado correctamente`);
    } catch (e) {
      setError(e.message);
      await alert.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => { setEditing(null); setError(''); setShowModal(true); };
  const openEdit = (supplier) => { setEditing(supplier); setError(''); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); setError(''); };

  // ── Datos filtrados ──────────────────────────────────────────────────────
  const filteredSuppliers = useMemo(() => {
    let result = suppliers;
    
    // Filtro por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s =>
        (s.name?.toLowerCase() || '').includes(term) ||
        (s.contact?.toLowerCase() || '').includes(term) ||
        (s.email?.toLowerCase() || '').includes(term) ||
        (s.tax_id?.toLowerCase() || '').includes(term)
      );
    }
    
    // Filtro por estado
    if (statusFilter === 'active') {
      result = result.filter(s => s.is_active === true);
    } else if (statusFilter === 'inactive') {
      result = result.filter(s => s.is_active === false);
    }
    
    return result;
  }, [suppliers, searchTerm, statusFilter]);

  // ── Columnas de la tabla ────────────────────────────────────────────────
  const columns = [
    {
      accessor: 'name',
      label: 'Proveedor',
      render: (item) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <strong>{item.name}</strong>
        </div>
      ),
    },
    {
      accessor: 'tax_id',
      label: 'RUC',
      render: (item) => (
        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
          {item.tax_id || '—'}
        </span>
      ),
    },
    {
      accessor: 'contact',
      label: 'Contacto',
      render: (item) => <span>{item.contact || '—'}</span>,
    },
    {
      accessor: 'phone',
      label: 'Teléfono',
      render: (item) => <span>{item.phone || '—'}</span>,
    },
    {
      accessor: 'email',
      label: 'Email',
      render: (item) => <span>{item.email || '—'}</span>,
    },
    {
      accessor: 'is_active',
      label: 'Estado',
      render: (item) => (
        <span className={item.is_active ? 'status-active' : 'status-inactive'}>
          {item.is_active ? 'Activo' : 'Inactivo'}
        </span>
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
            icon={<FiEdit2 size={14} />}
            onClick={() => openEdit(item)}
            tooltip="Editar proveedor"
          >
            Editar
          </IconTextButton>
          <IconTextButton
            variant="danger"
            size="sm"
            inline={true}
            icon={<FiTrash2 size={14} />}
            onClick={() => handleDelete(item)}
            tooltip="Eliminar proveedor"
          >
            Eliminar
          </IconTextButton>
        </ButtonGroup>
      ),
    },
  ];

  // ── Toolbar personalizado ──────────────────────────────────────────────
  const toolbar = (
    <div className="users-toolbar">
      <SearchInput
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Buscar proveedores..."
        size="md"
        variant="bordered"
        className="users-search-input"
        onClear={() => setSearchTerm('')}
        autoFocus={false}
      />
      
      {/* Filtro de estado con CustomCombobox */}
      <div style={{ minWidth: '180px' }}>
        <CustomCombobox
          options={statusOptions}
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="Filtrar por estado..."
          filterable={false}
        />
      </div>

      <ButtonGroup>
        <IconTextButton
          variant="success"
          size="md"
          icon={<FiPlus size={13} />}
          onClick={openCreate}
          disabled={!!saving}
          loading={!!saving}
        >
          Nuevo proveedor
        </IconTextButton>
      </ButtonGroup>
    </div>
  );

  // ── Botón de refrescar ──────────────────────────────────────────────────
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

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <PageTemplate
      title="Proveedores"
      subtitle="Gestión de proveedores del negocio"
      theme="business"
      loading={loading}
      headerAction={refreshButton}
    >
      {error && (
        <div className="alert alert-error" style={{ 
          padding: '12px 16px', 
          background: 'var(--danger-bg)', 
          color: 'var(--danger)', 
          borderRadius: '8px', 
          marginBottom: '16px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px' 
        }}>
          <FiAlertCircle size={16} /> {error}
        </div>
      )}

      <Table
        data={filteredSuppliers}
        columns={columns}
        keyField="id"
        title="Listado de proveedores"
        subtitle={`${filteredSuppliers.length} ${filteredSuppliers.length === 1 ? 'proveedor' : 'proveedores'} registrados`}
        toolbar={toolbar}
        searchable={false}
        searchPlaceholder="Buscar por nombre, contacto o email..."
        searchFields={['name', 'contact', 'email']}
        pagination={true}
        itemsPerPage={10}
        itemsPerPageOptions={[10, 25, 50, 100]}
        loading={loading}
        emptyMessage={
          searchTerm || statusFilter !== 'all'
            ? 'No hay proveedores que coincidan con los filtros aplicados'
            : 'No hay proveedores registrados'
        }
        striped={true}
        hoverable={true}
        bordered={false}
        compact={false}
      />

      {showModal && (
        <SupplierModal
          supplier={editing}
          onClose={closeModal}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </PageTemplate>
  );
}