import React, { useState, useEffect, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { useConfirm } from '../../context/ConfirmContext';
import { useAlert } from '../../components/ConfirmContext';
import { useSession } from '../../context/SessionContext';
import { useAudit } from '../../Helper/useAudit';
import {
  Plus, Edit2, CheckCircle, AlertCircle, X, Save, Trash2
} from 'react-feather';
import { FiRefreshCw } from 'react-icons/fi';
import { fetchWithAuth } from '../../config/api';
import Table from '../../components/General/Table';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import Input from '../../components/General/Input';
import Modal from '../../components/General/Modal';
import CustomCombobox from '../../components/General/CustomCombobox';

export default function CoreUsersPage() {
  const { user } = useSession();
  const { showConfirm } = useConfirm();
  const alert = useAlert();
  
  // Usar el hook useAudit
  const { logInsert, logUpdate, logDelete } = useAudit();
  
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role_id: '',
    is_active: true,
  });

  useEffect(() => {
    if (showModal) {
      if (editingUser) {
        setForm({
          first_name: editingUser.first_name ?? '',
          last_name: editingUser.last_name ?? '',
          email: editingUser.email ?? '',
          password: '',
          role_id: editingUser.role_id ?? roles?.[0]?.id ?? '',
          is_active: !!editingUser.is_active,
        });
      } else {
        setForm({
          first_name: '',
          last_name: '',
          email: '',
          password: '',
          role_id: roles?.[0]?.id ?? '',
          is_active: true,
        });
      }
    }
  }, [showModal, editingUser, roles]);

  useEffect(() => {
    if (showModal && !form.role_id && roles?.length) {
      setForm(f => ({ ...f, role_id: roles[0].id }));
    }
  }, [roles, showModal]);

  const setFormField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const canSubmit = form.first_name && form.last_name && form.email &&
                    (form.password || editingUser) && form.role_id;

  const hasChanges = useCallback(() => {
    if (!editingUser) return true;
    const fields = ['first_name', 'last_name', 'email', 'role_id', 'is_active'];
    return fields.some(key => {
      if (key === 'is_active') {
        return form.is_active !== !!editingUser.is_active;
      }
      return String(form[key]) !== String(editingUser[key] ?? '');
    });
  }, [editingUser, form]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth('/core/users');
      const data = await res.json();
      setUsers(
        Array.isArray(data.users)
          ? data.users.map(u => ({
              ...u,
              first_name: u.first_name ?? u.name?.split(' ')[0] ?? '',
              last_name: u.last_name ?? u.name?.split(' ').slice(1).join(' ') ?? '',
            }))
          : []
      );
    } catch {
      setError('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWithAuth('/core/roles')
      .then(r => r.json())
      .then(data => {
        const rolesArray = Array.isArray(data.roles) ? data.roles : [];
        setRoles(rolesArray);
      })
      .catch(() => setRoles([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // ─── GUARDAR (CREAR o MODIFICAR) con auditoría ──────────────────────────
  const handleSave = async (values) => {
    setSaving(true);
    setModalError('');
    
    try {
      const isEdit = !!editingUser;

      // Si es edición, obtener el usuario actual antes de modificar
      let oldUser = null;
      if (isEdit) {
        const oldRes = await fetchWithAuth(`/core/users/${editingUser.id}`);
        if (oldRes.ok) {
          oldUser = await oldRes.json();
        }
      }

      const res = await fetchWithAuth(
        isEdit ? `/core/users/${editingUser.id}` : '/core/users',
        { 
          method: isEdit ? 'PUT' : 'POST', 
          body: JSON.stringify(values)
        }
      );
      
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 409) {
          let errorMsg = data.message || data.error || 'Email ya registrado';
          if (data.details) {
            const { source, businessName } = data.details;
            if (source === 'public') {
              errorMsg = `El email "${values.email}" ya se encuentra registrado como usuario principal del sistema.`;
            } else if (source === 'schema' && businessName) {
              errorMsg = `El email "${values.email}" ya se encuentra registrado como colaborador/a en el negocio "${businessName}".`;
            }
          }
          throw new Error(errorMsg);
        }
        throw new Error(data.error || data.message || 'Error al guardar usuario');
      }
      
      // Registrar auditoría según el caso
      if (isEdit && oldUser) {
        // ─── AUDITORÍA DE MODIFICACIÓN ───
        // Asegurar que los datos tengan todos los campos necesarios
        const oldData = {
          id: oldUser.id,
          first_name: oldUser.first_name || '',
          last_name: oldUser.last_name || '',
          email: oldUser.email || '',
          role_id: oldUser.role_id || '',
          is_active: oldUser.is_active ?? true
        };

        const newData = {
          id: data.id || oldUser.id,
          first_name: data.first_name || values.first_name || '',
          last_name: data.last_name || values.last_name || '',
          email: data.email || values.email || '',
          role_id: data.role_id || values.role_id || '',
          is_active: data.is_active ?? values.is_active ?? true
        };

        await logUpdate(
          'users',
          oldData,
          newData,
          `Usuario actualizado: ${newData.first_name} ${newData.last_name} (${newData.email})`
        );

        await alert.success(
          `Usuario "${values.first_name} ${values.last_name}" actualizado correctamente`,
          'Usuario Actualizado'
        );
        
      } else {
        // ─── AUDITORÍA DE CREACIÓN ───
        const newData = {
          id: data.id || '',
          first_name: data.first_name || values.first_name || '',
          last_name: data.last_name || values.last_name || '',
          email: data.email || values.email || '',
          role_id: data.role_id || values.role_id || '',
          is_active: data.is_active ?? values.is_active ?? true
        };

        await logInsert(
          'users',
          newData,
          `Usuario creado: ${newData.first_name} ${newData.last_name} (${newData.email})`
        );

        await alert.success(
          `Usuario "${values.first_name} ${values.last_name}" creado correctamente`,
          'Usuario Creado'
        );
      }
      
      setShowModal(false);
      setEditingUser(null);
      load();
      
    } catch (e) {
      setModalError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── ELIMINAR con auditoría ──────────────────────────────────────────────
  const handleDelete = async (userToDelete) => {
    if (!await showConfirm({
      title: 'Confirmar eliminación',
      message: `¿Eliminar permanentemente a "${userToDelete.first_name} ${userToDelete.last_name}"?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      danger: true,
    })) return;

    setSaving(true);
    try {
      // ─── AUDITORÍA DE ELIMINACIÓN ───
      const deleteData = {
        id: userToDelete.id,
        first_name: userToDelete.first_name || '',
        last_name: userToDelete.last_name || '',
        email: userToDelete.email || '',
        role_id: userToDelete.role_id || '',
        is_active: userToDelete.is_active ?? true
      };

      await logDelete(
        'users',
        deleteData,
        `Usuario eliminado: ${userToDelete.first_name} ${userToDelete.last_name} (${userToDelete.email})`
      );

      // Eliminar el usuario
      const res = await fetchWithAuth(`/core/users/${userToDelete.id}?hard_delete=true`, { 
        method: 'DELETE'
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al eliminar usuario');
      
      await alert.success(
        `Usuario "${userToDelete.first_name} ${userToDelete.last_name}" eliminado correctamente`,
        'Usuario Eliminado'
      );
      load();
      
    } catch (e) {
      await alert.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setEditingUser(null);
    setModalError('');
    setShowModal(true);
  };
  
  const openEdit = (userToEdit) => {
    setEditingUser(userToEdit);
    setModalError('');
    setShowModal(true);
  };
  
  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setModalError('');
  };

  const filtrados = users.filter(u => {
    const q = search.toLowerCase();
    return [u.first_name, u.last_name].join(' ').toLowerCase().includes(q)
      || (u.email ?? '').toLowerCase().includes(q)
      || (roles.find(r => r.id === u.role_id)?.name ?? '').toLowerCase().includes(q);
  });

  const columns = [
    { accessor: 'first_name', label: 'Nombre', render: (item) => <span>{item.first_name}</span> },
    { accessor: 'last_name', label: 'Apellido' },
    { accessor: 'email', label: 'Email' },
    {
      accessor: 'role_id',
      label: 'Rol',
      render: (item) => (
        <span className="users-role-badge">
          {roles.find(r => r.id === item.role_id)?.name ?? item.role_id}
        </span>
      ),
    },
    {
      accessor: 'is_active',
      label: 'Estado',
      render: (item) => (
        item.is_active ? (
          <div className="users-status-active">
            <CheckCircle size={16} />
            <span>Activo</span>
          </div>
        ) : (
          <div className="users-status-inactive">
            <AlertCircle size={16} />
            <span>Inactivo</span>
          </div>
        )
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
            icon={<Edit2 size={12} />}
            onClick={() => openEdit(item)}
            title="Editar usuario"
          >
            Editar
          </IconTextButton>
          <IconTextButton
            variant="danger"
            size="sm"
            inline={true}
            icon={<Trash2 size={12} />}
            onClick={() => handleDelete(item)}
            title="Eliminar usuario"
          >
            Eliminar
          </IconTextButton>
        </ButtonGroup>
      ),
    },
  ];

  const toolbar = (
    <div className="users-toolbar">
      <ButtonGroup>
        <IconTextButton
          variant="success"
          size="md"
          icon={<Plus size={13} />}
          onClick={openCreate}
          disabled={!!saving}
          loading={!!saving}
        >
          Nuevo Usuario
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
      title="USUARIOS"
      subtitle="Gestión de usuarios y roles del negocio"
      loading={loading}
      error={error}
      onRetry={handleRefresh}
      theme="business"
      headerAction={refreshButton}
    >
      <div className="users-page-wrapper">
        <Table
          data={filtrados}
          columns={columns}
          keyField="id"
          title="Lista de usuarios"
          subtitle={`${filtrados.length} ${filtrados.length === 1 ? 'usuario' : 'usuarios'} registrados`}
          toolbar={toolbar}
          searchable={true}
          searchPlaceholder="Ej: Juan Pérez"
          pagination={true}
          itemsPerPage={10}
          itemsPerPageOptions={[10, 25, 50, 100]}
          loading={loading}
          emptyMessage={search ? 'No hay resultados para esa búsqueda' : 'No hay usuarios registrados'}
          striped={true}
          hoverable={true}
          bordered={false}
          compact={false}
        />

        <Modal
          isOpen={showModal}
          onClose={closeModal}
          title={editingUser ? 'Editar usuario' : 'Nuevo usuario'}
          size="md"
          footer={
            <>
              {modalError && (
                <div className="modal-error-text" style={{ 
                  color: '#dc2626', 
                  fontSize: '14px', 
                  marginBottom: '12px',
                  padding: '8px 12px',
                  backgroundColor: '#fef2f2',
                  borderRadius: '6px',
                  border: '1px solid #fca5a5',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px'
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{modalError}</span>
                </div>
              )}
              <ButtonGroup>
                <IconTextButton
                  variant=""
                  size="md"
                  icon={<X size={14} />}
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancelar
                </IconTextButton>
                <IconTextButton
                  variant="success"
                  size="md"
                  icon={<Save size={14} />}
                  onClick={() => handleSave(form)}
                  disabled={saving || !canSubmit || (editingUser && !hasChanges())}
                  loading={saving}
                >
                  {editingUser ? 'Guardar cambios' : 'Crear usuario'}
                </IconTextButton>
              </ButtonGroup>
            </>
          }
        >
          <div className="user-form-fields">
            <div className="form-row">
              <div className="form-group">
                <label>Nombre</label>
                <Input
                  value={form.first_name}
                  onChange={value => setFormField('first_name', value)}
                  placeholder="Nombre"
                  size="md"
                  required
                />
              </div>
              <div className="form-group">
                <label>Apellido</label>
                <Input
                  value={form.last_name}
                  onChange={value => setFormField('last_name', value)}
                  placeholder="Apellido"
                  size="md"
                  required
                />
              </div>
            </div>

            <div className="form-row" style={{ gridTemplateColumns: '2fr 1fr' }}>
              <div className="form-group">
                <label>Email</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={value => setFormField('email', value)}
                  placeholder="email@dominio.com"
                  size="md"
                  required
                />
              </div>
              <div className="form-group">
                <label>Rol</label>
                <CustomCombobox
                  options={roles.map(r => ({ label: r.name, value: r.id }))}
                  value={form.role_id}
                  onChange={value => setFormField('role_id', value)}
                  placeholder="Sel. un rol"
                  filterable
                  forceDropup={false}
                />
              </div>
            </div>

            <div className="form-row" style={{ gridTemplateColumns: '2fr 1fr' }}>
              <div className="form-group">
                <label>
                  Contraseña {editingUser && <span className="hint">(opcional)</span>}
                </label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={value => setFormField('password', value)}
                  placeholder={editingUser ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                  size="md"
                  autoComplete="new-password"
                  className="password-placeholder"
                />
              </div>
              {editingUser ? (
                <div className="form-group">
                  <label>Estado</label>
                  <CustomCombobox
                    options={[
                      { label: 'Activo', value: '1' },
                      { label: 'Inactivo', value: '0' }
                    ]}
                    value={form.is_active ? '1' : '0'}
                    onChange={value => setFormField('is_active', value === '1')}
                    placeholder="Selecciona estado"
                    filterable={false}
                    forceDropup={false}
                  />
                </div>
              ) : (
                <div></div>
              )}
            </div>
          </div>
        </Modal>
      </div>
    </PageTemplate>
  );
}