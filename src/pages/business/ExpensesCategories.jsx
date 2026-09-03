import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "../../context/SessionContext";
import { fetchWithAuth } from "../../config/api";
import {
  FiPlus, FiEdit2, FiTrash2, FiRefreshCw, FiX,
  FiAlertCircle, FiCheck, FiTag
} from "react-icons/fi";
import PageTemplate from "../../components/PageTemplate";
import Table from "../../components/General/Table";
import { IconTextButton, ButtonGroup } from "../../components/General/Button";
import SearchInput from "../../components/General/SearchInput";
import Input from "../../components/General/Input";
import Modal from "../../components/General/Modal";
import TableSkeleton from '../../components/General/TableSkeleton';


const COLOR_PALETTE = [
  '#2ecc71', '#3498db', '#e74c3c', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#95a5a6', '#34495e', '#e84393',
  '#00b894', '#00cec9', '#0984e3', '#6c5ce7', '#fd79a8',
  '#fdcb6e', '#e17055', '#2d3436', '#636e72'
];

// ------------------------------------------------------------
// Modal de categoría (interno)
// ------------------------------------------------------------
function CategoryModal({ category, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    name: category?.name ?? '',
    color: category?.color ?? '#95a5a6',
  });
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('❌ El nombre de la categoría es requerido');
      return;
    }
    onSave(form);
  };

  return (
    <Modal
      closeOnOverlayClick={false}
      isOpen={true}
      onClose={onClose}
      title={category ? 'Editar categoría' : 'Nueva categoría'}
      size="sm"
      footer={
        <>
          {error && (
            <div
              style={{
                color: 'var(--danger)',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
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
              disabled={saving || !form.name.trim()}
              loading={saving}
            >
              {saving ? 'Guardando...' : category ? 'Actualizar' : 'Crear'}
            </IconTextButton>
          </ButtonGroup>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-secondary)' }}>
              Nombre de la categoría *
            </label>
            <Input
              type="text"
              value={form.name}
              onChange={(value) => setForm(f => ({ ...f, name: value }))}
              placeholder="Ej: Alquiler, Servicios, Proveedores..."
              size="md"
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-secondary)' }}>
              Color
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              {COLOR_PALETTE.map(col => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, color: col }))}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    border: form.color === col ? '3px solid var(--primary)' : '2px solid transparent',
                    backgroundColor: col,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    outline: 'none',
                  }}
                  title={col}
                />
              ))}
              <Input
                type="color"
                value={form.color}
                onChange={(value) => setForm(f => ({ ...f, color: value }))}
                style={{
                  width: '40px',
                  height: '40px',
                  padding: '2px',
                  cursor: 'pointer',
                  border: '2px solid var(--border-color)',
                  borderRadius: '6px',
                  background: 'white'
                }}
              />
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)'
          }}>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
              Vista previa:
            </span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              background: form.color,
              borderRadius: '4px',
              color: '#fff',
              fontSize: 'var(--font-size-sm)',
              fontWeight: '500'
            }}>
              <FiTag size={14} />
              {form.name || 'Categoría'}
            </div>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
              {form.color}
            </span>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ------------------------------------------------------------
// Componente principal
// ------------------------------------------------------------
export default function PurchasesCategories() {
  const { user } = useSession();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ============================================================
  // OBTENER BUSINESS ID (solo desde sessionStorage o user)
  // ============================================================
  const getBusinessId = useCallback(() => {
    try {
      const fromSession = sessionStorage.getItem('business_id');
      if (fromSession) return fromSession;
      if (user?.businessId) return user.businessId;
      return null;
    } catch {
      return null;
    }
  }, [user]);

  const businessId = getBusinessId();

  // ============================================================
  // CARGAR CATEGORÍAS
  // ============================================================
  const loadCategories = useCallback(async () => {
    if (!businessId) {
      setCategories([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetchWithAuth(
        `/purchases/expense-categories?businessId=${businessId}`
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al cargar categorías');
      }

      const data = await res.json();
      const arr = Array.isArray(data)
        ? data
        : data?.data || data?.categories || data?.expenseCategories || [];

      setCategories(arr);
    } catch (err) {
      console.error('Error cargando categorías:', err);
      setError(err.message || 'Error al cargar categorías');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // ============================================================
  // REFRESH
  // ============================================================
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadCategories();
    } finally {
      setRefreshing(false);
    }
  };

  // ============================================================
  // GUARDAR (crear / editar)
  // ============================================================
  const handleSave = async (form) => {
    if (!businessId) {
      setError('No se encontró el negocio activo.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { name, color } = form;
      const isEdit = !!editingCategory;
      const url = isEdit
        ? `/purchases/expense-categories/${editingCategory.id}?businessId=${businessId}`
        : `/purchases/expense-categories?businessId=${businessId}`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          name: name.trim(),
          color,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Error al guardar la categoría');
      }

      setSuccess(isEdit ? 'Categoría actualizada' : 'Categoría creada');
      setShowModal(false);
      setEditingCategory(null);
      await loadCategories();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error guardando categoría:', err);
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // ELIMINAR (con window.confirm)
  // ============================================================
  const handleDelete = async (category) => {
    if (!businessId) {
      setError('No se encontró el negocio activo.');
      return;
    }

    const confirmed = window.confirm(
      `¿Eliminar la categoría "${category.name}"? Los gastos que la usen quedarán sin categoría.`
    );
    if (!confirmed) return;

    setSaving(true);
    setError('');

    try {
      const res = await fetchWithAuth(
        `/purchases/expense-categories/${category.id}?businessId=${businessId}`,
        { method: 'DELETE' }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Error al eliminar la categoría');
      }

      setSuccess('Categoría eliminada');
      await loadCategories();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error eliminando categoría:', err);
      setError(err.message || 'Error al eliminar');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // ABRIR / CERRAR MODAL
  // ============================================================
  const openCreate = () => {
    setEditingCategory(null);
    setError('');
    setShowModal(true);
  };

  const openEdit = (category) => {
    setEditingCategory(category);
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setError('');
  };

  // ============================================================
  // FILTRO POR BÚSQUEDA
  // ============================================================
  const filteredCategories = useMemo(() => {
    if (!searchTerm) return categories;
    const term = searchTerm.toLowerCase();
    return categories.filter(cat =>
      cat.name?.toLowerCase().includes(term)
    );
  }, [categories, searchTerm]);

  // ============================================================
  // COLUMNAS DE LA TABLA
  // ============================================================
  const columns = [
    {
      accessor: 'name',
      label: 'Nombre',
      render: (item) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '16px',
            height: '16px',
            borderRadius: '4px',
            backgroundColor: item.color || '#95a5a6',
            flexShrink: 0
          }} />
          <strong>{item.name}</strong>
        </div>
      ),
    },
    {
      accessor: 'color',
      label: 'Color',
      render: (item) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            backgroundColor: item.color || '#95a5a6',
            border: '1px solid var(--border-color)'
          }} />
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
            {item.color || '#95a5a6'}
          </span>
        </div>
      ),
    },
    {
      accessor: 'created_at',
      label: 'Fecha de creación',
      render: (item) => (
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
          {item.created_at
            ? new Date(item.created_at).toLocaleDateString('es-ES')
            : '—'}
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
            tooltip="Editar categoría"
          >
            Editar
          </IconTextButton>
          <IconTextButton
            variant="danger"
            size="sm"
            inline={true}
            icon={<FiTrash2 size={14} />}
            onClick={() => handleDelete(item)}
            tooltip="Eliminar categoría"
          >
            Eliminar
          </IconTextButton>
        </ButtonGroup>
      ),
    },
  ];

  // ============================================================
  // TOOLBAR
  // ============================================================
  const toolbar = (
    <div className="users-toolbar">
      <SearchInput
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Buscar categorías..."
        size="md"
        variant="bordered"
        className="users-search-input"
        onClear={() => setSearchTerm('')}
        autoFocus={false}
      />
      <ButtonGroup>
        <IconTextButton
          variant="success"
          size="md"
          icon={<FiPlus size={13} />}
          onClick={openCreate}
          disabled={saving || !businessId}
          loading={saving}
        >
          Nueva categoría
        </IconTextButton>
      </ButtonGroup>
    </div>
  );

  // ============================================================
  // BOTÓN DE REFRESCO EN EL HEADER
  // ============================================================
  const refreshButton = (
    <button
      onClick={handleRefresh}
      className="dashboard-refresh-btn-header"
      disabled={refreshing || !businessId}
      title="Actualizar datos"
    >
      <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  if (loading) {
    return (
      <PageTemplate
        title="CATEGORÍAS DE GASTOS"
        subtitle="Gestiona las categorías para clasificar tus gastos operativos"
        theme="business"
        loading={false}
        headerAction={refreshButton}
      >
        <TableSkeleton 
          rows={5}
          columns={3}
          title="Categorías de gastos"
          subtitle="Cargando categorías..."
          columnWidths={['2.5fr', '1fr', '1.2fr']}
          toolbarWidth={160}
          showSearch={true}
        />
      </PageTemplate>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <PageTemplate
      title="CATEGORÍAS DE GASTOS"
      subtitle="Gestiona las categorías para clasificar tus gastos operativos"
      theme="business"
      loading={loading}
      headerAction={refreshButton}
    >
      {!businessId && !loading && (
        <div
          className="alert alert-error"
          style={{
            padding: '12px 16px',
            background: 'var(--danger-bg)',
            color: 'var(--danger)',
            borderRadius: '8px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FiAlertCircle size={16} />
          No se encontró un negocio activo.
        </div>
      )}

      {error && (
        <div
          className="alert alert-error"
          style={{
            padding: '12px 16px',
            background: 'var(--danger-bg)',
            color: 'var(--danger)',
            borderRadius: '8px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FiAlertCircle size={16} />
          {error}
        </div>
      )}

      {success && (
        <div
          className="alert alert-success"
          style={{
            padding: '12px 16px',
            background: 'var(--success-bg)',
            color: 'var(--success)',
            borderRadius: '8px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FiCheck size={16} />
          {success}
        </div>
      )}

      <Table
        data={filteredCategories}
        columns={columns}
        keyField="id"
        title="Categorías de gastos"
        subtitle={`${filteredCategories.length} ${filteredCategories.length === 1 ? 'categoría' : 'categorías'} registradas`}
        toolbar={toolbar}
        searchable={false}
        pagination={true}
        itemsPerPage={itemsPerPage}
        itemsPerPageOptions={[10, 15]}
        onItemsPerPageChange={setItemsPerPage}
        loading={loading}
        emptyMessage={
          searchTerm
            ? 'No hay categorías que coincidan con la búsqueda'
            : 'No hay categorías registradas'
        }
        striped={true}
        hoverable={true}
        bordered={false}
        compact={false}
      />

      {showModal && (
        <CategoryModal
          category={editingCategory}
          onClose={closeModal}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </PageTemplate>
  );
}