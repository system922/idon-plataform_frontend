import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useConfirm } from '../../context/ConfirmContext';
import { useAlert } from '../../components/ConfirmContext';
import { useSession } from '../../context/SessionContext';
import { useAudit } from '../../Helper/useAudit';
import {
  FiSettings, FiShoppingCart, FiBox, FiBarChart2, FiCreditCard,
  FiDollarSign, FiClipboard, FiThermometer, FiTruck, FiGrid, FiCalendar,
  FiStar, FiUsers, FiUserCheck, FiMap, FiMapPin, FiList, FiGlobe,
  FiBell, FiFileText, FiPlus,
  FiEdit2, FiTrash2, FiRefreshCw, FiX, FiAlertCircle
} from "react-icons/fi";
import PageTemplate from '../../components/PageTemplate';
import { fetchWithAuth } from '../../config/api';
import Table from '../../components/General/Table';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import Input from '../../components/General/Input';
import Modal from '../../components/General/Modal';
import Checklist from '../../components/General/Checklist';
import TableSkeleton from '../../components/General/TableSkeleton';


// ─── Iconos por módulo ──────────────────────────────────────────────────
const MOD_ICON_MAP = {
  core:          <FiSettings size={16} />,
  pos:           <FiShoppingCart size={16} />,
  inventory:     <FiBox size={16} />,
  reports:       <FiBarChart2 size={16} />,
  payments:      <FiCreditCard size={16} />,
  accounting:    <FiDollarSign size={16} />,
  orders:        <FiClipboard size={16} />,
  kitchen:       <FiThermometer size={16} />,
  delivery:      <FiTruck size={16} />,
  tables:        <FiGrid size={16} />,
  reservations:  <FiCalendar size={16} />,
  loyalty:       <FiStar size={16} />,
  suppliers:     <FiTruck size={16} />,
  purchases:     <FiShoppingCart size={16} />,
  appointments:  <FiCalendar size={16} />,
  employees:     <FiUsers size={16} />,
  crm:           <FiUserCheck size={16} />,
  routes:        <FiMap size={16} />,
  tracking:      <FiMapPin size={16} />,
  queue:         <FiList size={16} />,
  ecommerce:     <FiGlobe size={16} />,
  notifications: <FiBell size={16} />,
  einvoicing:    <FiFileText size={16} />,
};

const ModIcon = ({ code }) => (
  <span className="rol-mod-icon">
    {MOD_ICON_MAP[code] || <FiBox size={16} />}
  </span>
);

// ─── Helper para obtener nombres de módulos y funcionalidades ──────────
function getPermissionNames(permissions, modules) {
  if (!permissions || !modules) return [];
  
  return permissions.map(p => {
    const mod = modules.find(m => m.id === p.modulo);
    const moduleName = mod?.name || p.modulo;
    
    const featureNames = (p.features || []).map(fId => {
      const feature = mod?.features?.find(f => f.id === fId);
      return feature?.name || fId;
    });
    
    return {
      modulo: moduleName,
      features: featureNames
    };
  });
}

// ─── Modal de roles ─────────────────────────────────────────────────────
function RoleModal({ role, onClose, onSave, saving, modules }) {
  const getInitialPermissions = () =>
    role?.permissions?.length
      ? role.permissions.map(p => ({ 
          modulo: String(p.modulo), 
          features: Array.isArray(p.features) ? p.features.map(f => String(f)) : [] 
        }))
      : [];

  const [form, setForm] = useState({
    name:        role?.name        ?? '',
    description: role?.description ?? '',
    permissions: getInitialPermissions(),
  });
  const [error, setError] = useState('');

  const checklistItems = useMemo(() => {
    return modules.map(m => ({
      id: String(m.id),
      label: m.name,
      icon: <ModIcon code={m.code || m.id} />,
      children: m.features?.map(f => ({
        id: String(f.id),
        label: f.name,
        isPremium: f.is_premium || false,
      })) || [],
    }));
  }, [modules]);

  const handlePermissionsChange = (newPermissions) => {
    setForm(f => ({ ...f, permissions: newPermissions }));
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
    <Modal
      closeOnOverlayClick={false}
      isOpen={true}
      onClose={onClose}
      title={role ? 'Editar rol' : 'Nuevo rol'}
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
              variant=""
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
              disabled={saving || !form.name || !form.permissions.length}
              loading={saving}
            >
              {saving ? 'Guardando...' : role ? 'Guardar cambios' : 'Crear rol'}
            </IconTextButton>
          </ButtonGroup>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '0.75fr 1.25fr', gap: '16px' }}>
            <div className="form-group">
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-secondary)' }}>
                Nombre del rol *
              </label>
              <Input
                type="text"
                value={form.name}
                onChange={(value) => setForm(f => ({ ...f, name: value }))}
                placeholder="Ej: Administrador, Mesero, Cajero"
                size="md"
                autoFocus
                required
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-secondary)' }}>
                Descripción
              </label>
              <Input
                type="text"
                value={form.description}
                onChange={(value) => setForm(f => ({ ...f, description: value }))}
                placeholder="Descripción del rol (opcional)"
                size="md"
              />
            </div>
          </div>

          <div className="checklist-wrapper">
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-secondary)' }}>
              Permisos / Módulos *
            </label>
            <Checklist
              items={checklistItems}
              value={form.permissions}
              onChange={handlePermissionsChange}
              mode="hierarchical"
              variant="default"
              maxHeight={320}
              showIcons
              selectAll
              emptyMessage="No hay módulos disponibles"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────

export default function RolesPage() {
  const { user } = useSession();
  const { showConfirm } = useConfirm();
  const alert = useAlert();
  
  const { logInsert, logUpdate, logDelete } = useAudit();
  
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState('');

  const getBusinessId = useCallback(() => {
    try {
      const fromSession = sessionStorage.getItem('business_id');
      if (fromSession) {
        return fromSession;
      }
      if (user?.businessId) {
        return user.businessId;
      }
      return null;
    } catch {
      return null;
    }
  }, [user]);

  useEffect(() => {
    const businessId = getBusinessId();
    if (!businessId) {
      setModules([]);
      return;
    }

    const loadModules = async () => {
      try {
        const response = await fetchWithAuth('/business-status/navigation', {
          headers: {
            'x-business-id': businessId
          }
        });
        
        const data = await response.json();
        
        if (data?.ok && data?.data?.modules?.length > 0) {
          const formattedModules = data.data.modules.map(mod => ({
            id: mod.id,
            name: mod.name,
            code: mod.code,
            features: mod.pages?.map(page => ({
              id: page.id || page.code,
              name: page.name,
              is_premium: page.is_premium || false
            })) || []
          }));
          setModules(formattedModules);
        } else {
          setModules([]);
        }
      } catch (err) {
        console.error('Error cargando módulos:', err);
        setModules([]);
      }
    };

    loadModules();
  }, [getBusinessId]);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth('/core/roles');
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

  // ─── GUARDAR (CREAR o MODIFICAR) con auditoría ──────────────────────────
  const handleSave = async (form) => {
    setSaving(true);
    setError('');
    try {
      const { name, description, permissions } = form;
      const isEdit = !!editingRole;

      // Si es edición, obtener el rol actual antes de modificar
      let oldRole = null;
      if (isEdit) {
        const oldRes = await fetchWithAuth(`/core/roles/${editingRole.id}`);
        if (oldRes.ok) {
          oldRole = await oldRes.json();
          // Si la respuesta viene como { role: {...} }, extraer el objeto role
          if (oldRole?.role) {
            oldRole = oldRole.role;
          }
        }
      }

      const res = await fetchWithAuth(
        isEdit ? `/core/roles/${editingRole.id}` : '/core/roles',
        { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify({ name, description, permissions }) }
      );
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error ?? data.message ?? 'Error al guardar rol');

      // ─── OBTENER NOMBRES DE MÓDULOS Y FUNCIONALIDADES ───
      const oldPermissionsNames = oldRole?.permissions ? getPermissionNames(oldRole.permissions, modules) : [];
      const newPermissionsNames = data.permissions || permissions ? getPermissionNames(data.permissions || permissions, modules) : [];

      // ─── AUDITORÍA ───
      if (isEdit && oldRole) {
        const oldData = {
          id: null,
          name: oldRole.name || '',
          description: oldRole.description || '',
          permissions: oldPermissionsNames,  // ← Nombres en lugar de IDs
          permissions_raw: oldRole.permissions || []  // ← También guardar raw para referencia
        };

        const newData = {
          id: null,
          name: data.name || name || '',
          description: data.description || description || '',
          permissions: newPermissionsNames,  // ← Nombres en lugar de IDs
          permissions_raw: data.permissions || permissions || []  // ← También guardar raw
        };

        await logUpdate(
          'roles',
          oldData,
          newData,
          `Rol actualizado: ${newData.name}`
        );

        await alert.success(
          `Rol "${name}" actualizado correctamente`,
          'Rol Actualizado'
        );
        
      } else {
        const newData = {
          id: null,
          name: data.name || name || '',
          description: data.description || description || '',
          permissions: newPermissionsNames,  // ← Nombres en lugar de IDs
          permissions_raw: data.permissions || permissions || []  // ← También guardar raw
        };

        await logInsert(
          'roles',
          newData,
          `Rol creado: ${newData.name}`
        );

        await alert.success(
          `Rol "${name}" creado correctamente`,
          'Rol Creado'
        );
      }

      setShowModal(false);
      setEditingRole(null);
      loadRoles();
      
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── ELIMINAR con auditoría ──────────────────────────────────────────────
  const handleDelete = async (role) => {
    if (!await showConfirm({
      title: 'Confirmar eliminación',
      message: `¿Eliminar permanentemente el rol "${role.name}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      danger: true,
    })) return;

    setSaving(true);
    try {
      // ─── OBTENER NOMBRES DE MÓDULOS Y FUNCIONALIDADES ───
      const permissionsNames = role.permissions ? getPermissionNames(role.permissions, modules) : [];

      const deleteData = {
        id: null,
        name: role.name || '',
        description: role.description || '',
        permissions: permissionsNames,  // ← Nombres en lugar de IDs
        permissions_raw: role.permissions || []  // ← También guardar raw
      };

      await logDelete(
        'roles',
        deleteData,
        `Rol eliminado: ${role.name}`
      );

      const res = await fetchWithAuth(`/core/roles/${role.id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error ?? 'Error al eliminar rol');

      await alert.success(
        `Rol "${role.name}" eliminado correctamente`,
        'Rol Eliminado'
      );
      
      loadRoles();
    } catch (e) {
      setError(e.message);
      await alert.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => { setEditingRole(null); setError(''); setShowModal(true); };
  const openEdit = role => { setEditingRole(role); setError(''); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditingRole(null); setError(''); };

  // ── Datos filtrados ──────────────────────────────────────────────────────
  const filteredRoles = useMemo(() => {
    let result = roles;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(r => {
        const nameMatch = r.name?.toLowerCase().includes(term) || false;
        const descMatch = r.description?.toLowerCase().includes(term) || false;
        const moduleMatch = (r.permissions || []).some(p => {
          const mod = modules.find(m => m.id === p.modulo);
          return mod?.name?.toLowerCase().includes(term) || false;
        });
        return nameMatch || descMatch || moduleMatch;
      });
    }
    
    if (selectedModule) {
      result = result.filter(r =>
        (r.permissions || []).some(p => p.modulo === selectedModule)
      );
    }
    
    return result;
  }, [roles, searchTerm, selectedModule, modules]);

  // ── Columnas de la tabla ────────────────────────────────────────────────
  const columns = [
    {
      accessor: 'name',
      label: 'Nombre',
      render: (item) => (
        <div>
          <strong>{item.name}</strong>
          {item.description && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.description}</div>
          )}
        </div>
      ),
    },
    {
      accessor: 'permissions',
      label: 'Permisos / Módulos',
      render: (item) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {(Array.isArray(item.permissions) ? item.permissions : []).map(perm => {
            const mod = modules.find(m => m.id === perm.modulo);
            return (
              <div key={perm.modulo} style={{
                background: 'var(--primary-bg)',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span style={{ fontWeight: 500 }}>{mod?.name ?? perm.modulo}</span>
                {perm.features?.length > 0 && (
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    ({perm.features.length})
                  </span>
                )}
              </div>
            );
          })}
        </div>
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
            tooltip="Editar rol"
          >
            Editar
          </IconTextButton>
          <IconTextButton
            variant="danger"
            size="sm"
            inline={true}
            icon={<FiTrash2 size={14} />}
            onClick={() => handleDelete(item)}
            tooltip="Eliminar rol"
          >
            Eliminar
          </IconTextButton>
        </ButtonGroup>
      ),
    },
  ];

  // ── Toolbar ──────────────────────────────────────────────────────────────
  const toolbar = (
    <div className="users-toolbar">
      <ButtonGroup>
        <IconTextButton
          variant="success"
          size="md"
          icon={<FiPlus size={13} />}
          onClick={openCreate}
          disabled={!!saving}
          loading={!!saving}
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
      disabled={refreshing}
      title="Actualizar datos"
    >
      <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  const [itemsPerPage, setItemsPerPage] = useState(10);

  if (loading) {
    return (
      <PageTemplate
        title="ROLES Y PERMISOS"
        subtitle="Define a qué módulos y funcionalidades puede acceder cada usuario"
        theme="business"
        loading={false}
        headerAction={refreshButton}
      >
        <TableSkeleton 
          rows={5}
          columns={3}
          title="Roles del negocio"
          subtitle="Cargando roles..."
          columnWidths={['2fr', '3fr', '1.2fr']}
          toolbarWidth={140}
          showSearch={true}
        />
      </PageTemplate>
    );
  }

  return (
    <PageTemplate
      title="ROLES Y PERMISOS"
      subtitle="Define a qué módulos y funcionalidades puede acceder cada usuario"
      theme="business"
      loading={loading}
      headerAction={refreshButton}
    >
      {error && (
        <div className="alert alert-error" style={{ padding: '12px 16px', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiAlertCircle size={16} /> {error}
        </div>
      )}

      <Table
        data={filteredRoles}
        columns={columns}
        keyField="id"
        title="Roles del negocio"
        subtitle={`${filteredRoles.length} ${filteredRoles.length === 1 ? 'rol' : 'roles'} registrados`}
        toolbar={toolbar}
        searchable={true}
        searchPlaceholder="Ej: Cajero/a..."
        searchFields={['name', 'description']}
        pagination={true}
        itemsPerPage={itemsPerPage}
        itemsPerPageOptions={[10, 15]}
        onItemsPerPageChange={(newPerPage) => setItemsPerPage(newPerPage)}
        loading={loading}
        emptyMessage={
          searchTerm || selectedModule
            ? 'No hay roles que coincidan con los filtros aplicados'
            : 'No hay roles registrados'
        }
        striped={true}
        hoverable={true}
        bordered={false}
        compact={false}
      />

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