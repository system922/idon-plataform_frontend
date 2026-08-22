import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { useConfirm, useAlert } from '../../context/ConfirmContext';
import Table from '../../components/General/Table';
import Modal from '../../components/General/Modal';
import CustomCombobox from '../../components/General/CustomCombobox';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import Input from '../../components/General/Input';
import {
  FiRefreshCw, FiMail, FiPhone, FiCheck, FiX,
  FiAlertCircle, FiEdit2, FiTrash2, FiLock, FiUnlock,
  FiSave,
} from 'react-icons/fi';
import { adminApi } from '../../config/api';

export default function UsersList() {
  const { showConfirm } = useConfirm();
  const alert = useAlert();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [editModal, setEditModal] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await adminApi.get('/admin/users');
      setUsers(r.data || []);
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

  const handleToggleActive = async (user) => {
    const isActive = user.is_active;
    const action = isActive ? 'desactivar' : 'activar';
    const actionPast = isActive ? 'desactivado' : 'activado';
    
    if (!await showConfirm({
      title: isActive ? 'Desactivar usuario' : 'Activar usuario',
      message: `¿Estás seguro de que deseas ${action} al usuario "${user.first_name} ${user.last_name}"?`,
      confirmText: isActive ? 'Desactivar' : 'Activar',
      cancelText: 'Cancelar',
      danger: isActive,
    })) return;
    
    try {
      await adminApi.patch(`/admin/users/${user.id}/toggle-active`);
      await load();
      alert.success(
        `Usuario ${actionPast} correctamente`,
        isActive ? 'Usuario Desactivado' : 'Usuario Activado'
      );
    } catch (e) {
      alert.error('Error: ' + e.message);
    }
  };

  const handleDelete = async (user) => {
    if (!await showConfirm({
      title: 'Eliminar usuario',
      message: `¿Eliminar permanentemente al usuario "${user.first_name} ${user.last_name}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      danger: true,
    })) return;
    try {
      await adminApi.delete(`/admin/users/${user.id}`);
      await load();
      alert.success('Usuario eliminado correctamente', '✅ Éxito');
    } catch (e) {
      alert.error('Error: ' + e.message);
    }
  };

  const filteredUsers = useMemo(() => {
    let result = users;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(u =>
        `${u.first_name || ''} ${u.last_name || ''} ${u.email || ''} ${u.document_number || ''}`
          .toLowerCase().includes(term)
      );
    }

    if (filterStatus === 'active') {
      result = result.filter(u => u.is_active === true);
    } else if (filterStatus === 'inactive') {
      result = result.filter(u => u.is_active === false);
    } else if (filterStatus === 'verified') {
      result = result.filter(u => u.email_verified === true);
    } else if (filterStatus === 'unverified') {
      result = result.filter(u => u.email_verified === false);
    }

    return result;
  }, [users, searchTerm, filterStatus]);

  const statusOptions = [
    { value: 'todos', label: `Todos (${users.length})` },
    { value: 'active', label: `Activos (${users.filter(u => u.is_active).length})` },
    { value: 'inactive', label: `Inactivos (${users.filter(u => !u.is_active).length})` },
    { value: 'verified', label: `Verificados (${users.filter(u => u.email_verified).length})` },
    { value: 'unverified', label: `No verificados (${users.filter(u => !u.email_verified).length})` },
  ];

  const columns = [
    {
      accessor: 'name',
      label: 'Usuario',
      render: (item) => (
        <div className="user-name">
          <div className="user-avatar">
            <span>{(item.first_name || item.email || '?')[0].toUpperCase()}</span>
          </div>
          <div>
            <div className="user-full-name">{item.first_name} {item.last_name}</div>
            <div className="user-id">{item.id?.slice(0, 8)}…</div>
          </div>
        </div>
      ),
    },
    {
      accessor: 'contact',
      label: 'Contacto',
      render: (item) => (
        <div>
          <div className="user-email"><FiMail size={11} /> {item.email}</div>
          {item.phone && (
            <div className="user-phone"><FiPhone size={11} /> {item.phone}</div>
          )}
        </div>
      ),
    },
    {
      accessor: 'is_active',
      label: 'Activo',
      align: 'center',
      render: (item) => (
        item.is_active
          ? <span className="admin-badge admin-badge-success"><FiCheck size={11} /> Sí</span>
          : <span className="admin-badge admin-badge-danger"><FiX size={11} /> No</span>
      ),
    },
    {
      accessor: 'email_verified',
      label: 'Email verificado',
      align: 'center',
      render: (item) => (
        item.email_verified
          ? <span className="admin-badge admin-badge-success"><FiCheck size={11} /> Verificado</span>
          : <span className="admin-badge admin-badge-warning">Pendiente</span>
      ),
    },
    {
      accessor: 'created_at',
      label: 'Registrado',
      render: (item) => (
        <span className="user-created">
          {item.created_at ? new Date(item.created_at).toLocaleDateString('es-EC') : '—'}
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
            icon={<FiEdit2 size={12} />}
            onClick={() => setEditModal(item)}
          >
            Editar
          </IconTextButton>
          <IconTextButton
            variant={item.is_active ? 'danger' : 'success'}
            size="sm"
            inline={true}
            icon={item.is_active ? <FiLock size={12} /> : <FiUnlock size={12} />}
            onClick={() => handleToggleActive(item)}
          >
            {item.is_active ? 'Desactivar' : 'Activar'}
          </IconTextButton>
          <IconTextButton
            variant="danger"
            size="sm"
            inline={true}
            icon={<FiTrash2 size={12} />}
            onClick={() => handleDelete(item)}
          >
            Eliminar
          </IconTextButton>
        </ButtonGroup>
      ),
    },
  ];

  const toolbar = (
    <div className="users-toolbar">
      <CustomCombobox
        options={statusOptions}
        value={filterStatus}
        onChange={setFilterStatus}
        placeholder="Filtrar por estado"
        filterable={false}
        size="sm"
        className="users-filter"
      />
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
      title="USUARIOS"
      subtitle="Todos los usuarios registrados en el sistema"
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
        data={filteredUsers}
        columns={columns}
        keyField="id"
        title="Usuarios del Sistema"
        subtitle={`${filteredUsers.length} ${filteredUsers.length === 1 ? 'usuario' : 'usuarios'} encontrados`}
        toolbar={toolbar}
        searchable={true}
        searchPlaceholder="Buscar por nombre, email..."
        searchFields={['first_name', 'last_name', 'email']}
        pagination={true}
        itemsPerPage={10}
        itemsPerPageOptions={[10, 25, 50, 100]}
        loading={loading}
        emptyMessage={
          searchTerm || filterStatus !== 'todos'
            ? 'No hay usuarios que coincidan con los filtros aplicados'
            : 'No hay usuarios registrados'
        }
        striped={true}
        hoverable={true}
        bordered={false}
        compact={false}
      />

      {editModal && (
        <EditUserModal
          user={editModal}
          onClose={() => setEditModal(null)}
          onSaved={load}
        />
      )}
    </PageTemplate>
  );
}

function EditUserModal({ user, onClose, onSaved }) {
  const alert = useAlert();
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name || !form.email) {
      setError('Nombre, apellido y email son requeridos');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await adminApi.put(`/admin/users/${user.id}`, form);
      alert.success('Usuario actualizado correctamente', '✅ Éxito');
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
          icon={<FiSave size={14} />}
          onClick={handleSubmit}
          disabled={saving || !form.first_name || !form.last_name || !form.email}
          loading={saving}
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </IconTextButton>
      </ButtonGroup>
    </>
  );

  return (
    <Modal
      closeOnOverlayClick={false}
      isOpen={true}
      onClose={onClose}
      title="Editar Usuario"
      size="md"
      className="users-edit-modal"
      footer={footer}
    >
      <div className="users-edit-form">
        <div className="users-edit-row">
          <div className="users-edit-field">
            <label>Nombre *</label>
            <Input
              type="text"
              value={form.first_name}
              onChange={(value) => setForm(f => ({ ...f, first_name: value }))}
              placeholder="Nombre"
              size="md"
              autoFocus
              required
            />
          </div>
          <div className="users-edit-field">
            <label>Apellido *</label>
            <Input
              type="text"
              value={form.last_name}
              onChange={(value) => setForm(f => ({ ...f, last_name: value }))}
              placeholder="Apellido"
              size="md"
              required
            />
          </div>
        </div>

        <div className="users-edit-field">
          <label>Email *</label>
          <Input
            type="email"
            value={form.email}
            onChange={(value) => setForm(f => ({ ...f, email: value }))}
            placeholder="correo@ejemplo.com"
            size="md"
            required
          />
        </div>

        <div className="users-edit-field">
          <label>Teléfono</label>
          <Input
            type="text"
            value={form.phone}
            onChange={(value) => setForm(f => ({ ...f, phone: value }))}
            placeholder="0999999999"
            size="md"
          />
        </div>

        <div className="users-edit-info">
          <div className="users-edit-info-item">
            <span className="users-edit-info-label">Registrado:</span>
            <span className="users-edit-info-value">
              {user.created_at ? new Date(user.created_at).toLocaleDateString('es-EC') : '—'}
            </span>
          </div>
          <div className="users-edit-info-item">
            <span className="users-edit-info-label">Estado:</span>
            <span className="users-edit-info-value" style={{ color: user.is_active ? '#22c55e' : '#ef4444' }}>
              {user.is_active ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <div className="users-edit-info-item">
            <span className="users-edit-info-label">Email verificado:</span>
            <span className="users-edit-info-value" style={{ color: user.email_verified ? '#22c55e' : '#f59e0b' }}>
              {user.email_verified ? 'Verificado' : 'Pendiente'}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}