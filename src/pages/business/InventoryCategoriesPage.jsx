// src/pages/inventory/InventoryCategoriesPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { useSession } from '../../context/SessionContext'; // ✅ AGREGADO
import { useConfirm, useAlert } from '../../context/ConfirmContext';
import { 
  Plus, Edit2, Trash2, Tag, X, RefreshCw, Save,
  Box, Clock, Calendar
} from 'react-feather';
import { fetchWithAuth } from '../../config/api';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';

// ── Componentes reutilizables ──
import Table from '../../components/General/Table';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import Modal from '../../components/General/Modal';
import Input from '../../components/General/Input';

export default function InventoryCategoriesPage() {
  const { user } = useSession(); // ✅ AGREGADO
  const { showConfirm } = useConfirm();
  const alert = useAlert();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // ── Formulario ──
  const [form, setForm] = useState({ 
    name: '', 
    description: '',
    is_active: true 
  });

  const setFormField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Carga de datos ──
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Cargar categorías
      const catRes = await fetchWithAuth('/categories'); // ✅ SIN /api
      if (!catRes.ok) throw new Error((await catRes.json()).error || 'Error al cargar categorías');
      const catData = await catRes.json();
      const categoriesList = Array.isArray(catData) ? catData : [];
      
      // Cargar productos para contar por categoría
      const prodRes = await fetchWithAuth('/products'); // ✅ SIN /api
      const prodData = await prodRes.json();
      const productsList = Array.isArray(prodData) ? prodData : prodData?.productos ?? prodData?.data ?? [];
      setProducts(productsList);
      
      // Calcular conteo de productos por categoría
      const categoriesWithCount = categoriesList.map(cat => {
        const catId = String(cat.id);
        const productCount = productsList.filter(p => {
          const productCatId = p.category_id !== undefined ? String(p.category_id) : 
                              p.category !== undefined ? String(p.category) : 
                              null;
          return productCatId === catId;
        }).length;
        
        return {
          ...cat,
          product_count: productCount,
          is_active: cat.is_active === true || cat.is_active === 'true' || cat.is_active === 1
        };
      });
      
      setCategories(categoriesWithCount);
    } catch (e) {
      setError(e.message);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeSync('categories', load);

  // ── Formateador de fechas ──
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '—';
    }
  };

  // ── Abrir modal ──
  const openCreate = () => {
    setEditingCat(null);
    setForm({ name: '', description: '', is_active: true });
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setEditingCat(cat);
    setForm({ 
      name: cat.name || '', 
      description: cat.description || '',
      is_active: cat.is_active ?? true
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCat(null);
    setForm({ name: '', description: '', is_active: true });
  };

  // ── Guardar ──
  const handleSave = async (values) => {
    if (saving) return;
    
    // Validar nombre
    if (!values.name || !values.name.trim()) {
      await alert.error('El nombre de la categoría es requerido', 'Campo requerido');
      return;
    }

    try {
      setSaving(true);
      const url = editingCat ? `/categories/${editingCat.id}` : '/categories'; // ✅ SIN /api
      const method = editingCat ? 'PUT' : 'POST';
      const res = await fetchWithAuth(url, { 
        method, 
        body: JSON.stringify(values) 
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al guardar');
      }
      
      await load();
      closeModal();
      
      // Mostrar mensaje de éxito con useAlert
      await alert.success(
        editingCat ? 'Categoría actualizada exitosamente' : 'Categoría creada exitosamente',
        editingCat ? 'Categoría actualizada' : 'Categoría creada'
      );
    } catch (e) {
      await alert.error(e.message || 'Error al guardar la categoría', '❌ Error');
    } finally {
      setSaving(false);
    }
  };

  // ── Eliminar ──
  const handleDelete = async (cat) => {
    // Verificar si tiene productos asociados
    if (cat.product_count > 0) {
      await alert.error(
        `No se puede eliminar la categoría "${cat.name}" porque tiene ${cat.product_count} ${cat.product_count === 1 ? 'producto' : 'productos'} asociados.`,
        'No se puede eliminar'
      );
      return;
    }

    // Confirmar eliminación con showConfirm
    const confirmed = await showConfirm({
      title: 'Eliminar categoría',
      message: `¿Estás seguro de eliminar la categoría "${cat.name}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      danger: true,
    });

    if (!confirmed) return;

    try {
      const res = await fetchWithAuth(`/categories/${cat.id}`, { method: 'DELETE' }); // ✅ SIN /api
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al eliminar');
      }
      
      await load();
      
      // Mostrar mensaje de éxito con useAlert
      await alert.success(
        `Categoría "${cat.name}" eliminada exitosamente`,
        'Categoría eliminada'
      );
    } catch (e) {
      await alert.error(e.message || 'Error al eliminar la categoría', '❌ Error');
    }
  };

  // ── Refresh ──
  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
    await alert.info('Datos actualizados correctamente', '🔄 Actualizado');
  };

  // ── Filtro ──
  const filteredCategories = useMemo(() => {
    let result = categories.filter(c =>
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(search.toLowerCase())
    );
    
    // Ordenar: primero activas, luego inactivas
    result = [...result].sort((a, b) => {
      if (a.is_active && !b.is_active) return -1;
      if (!a.is_active && b.is_active) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
    
    return result;
  }, [categories, search]);

  // ── Columnas de la tabla ──
  const columns = [
    {
      accessor: 'name',
      label: 'Nombre',
      render: (item) => (
        <div className="category-name-cell">
          <div className="category-name-info">
            <span className="category-name" style={{
              color: item.is_active ? 'var(--text-primary)' : 'var(--text-muted)',
              textDecoration: item.is_active ? 'none' : 'line-through'
            }}>
              {item.name}
            </span>
            {!item.is_active && (
              <span className="category-status-badge"> INACTIVO</span>
            )}
            {item.description && (
              <span className="category-description">{item.description}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      accessor: 'product_count',
      label: 'Productos',
      render: (item) => (
        <div className="category-product-count">
          <span>{item.product_count || 0}</span>
          {item.product_count > 0 && (
            <span className="category-product-label">
              {item.product_count === 1 ? ' producto' : ' productos'}
            </span>
          )}
        </div>
      ),
    },
    {
      accessor: 'created_at',
      label: 'Creado',
      render: (item) => (
        <div className="category-date">
          <span>{formatDate(item.created_at)}</span>
        </div>
      ),
    },
    {
      accessor: 'updated_at',
      label: 'Modificado',
      render: (item) => (
        <div className="category-date">
          <span>{formatDate(item.updated_at)}</span>
        </div>
      ),
    },
    {
      accessor: 'actions',
      label: 'Acciones',
      align: 'left',
      render: (item) => (
        <ButtonGroup>
          <IconTextButton
            variant="info"
            size="sm"
            icon={<Edit2 size={13} />}
            onClick={() => openEdit(item)}
            title="Editar categoría"
          >
            Editar
          </IconTextButton>
          <IconTextButton
            variant="danger"
            size="sm"
            icon={<Trash2 size={13} />}
            onClick={() => handleDelete(item)}
            title={item.product_count > 0 ? `Tiene ${item.product_count} productos asociados` : "Eliminar categoría"}
            disabled={item.product_count > 0}
          >
            Eliminar
          </IconTextButton>
        </ButtonGroup>
      ),
    },
  ];

  // ── Render row personalizado ──
  const renderRow = (item) => (
    <tr key={item.id} className="table-row" style={{ 
      opacity: item.is_active ? 1 : 0.6,
      background: !item.is_active ? 'var(--bg-secondary)' : undefined
    }}>
      {columns.map((column, colIndex) => (
        <td key={colIndex} className="table-cell" data-label={column.label}>
          {column.render ? column.render(item) : item[column.accessor]}
        </td>
      ))}
    </tr>
  );

  // ── Toolbar estilo ReportsProductsPage ──
  const toolbar = (
    <div className="users-toolbar">
      <ButtonGroup>
        <IconTextButton
          variant="success"
          size="md"
          icon={<Plus size={13} />}
          onClick={openCreate}
          disabled={saving}
          loading={saving}
        >
          Nueva Categoría
        </IconTextButton>
      </ButtonGroup>
    </div>
  );

  // ── Header action (refresh) ──
  const refreshButton = (
    <button
      onClick={handleRefresh}
      className="dashboard-refresh-btn-header"
      disabled={refreshing}
      title="Actualizar datos"
    >
      <RefreshCw size={18} className={refreshing ? 'spinning' : ''} />
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  // ── Estadísticas ──
  const activeCategories = categories.filter(c => c.is_active).length;
  const inactiveCategories = categories.length - activeCategories;
  const totalProducts = categories.reduce((acc, cat) => acc + (cat.product_count || 0), 0);

  const isLoading = loading || saving;
  const [itemsPerPage, setItemsPerPage] = useState(10);

  return (
    <PageTemplate
      title="CATEGORÍAS DE PRODUCTOS"
      subtitle={`${activeCategories} activas · ${inactiveCategories} inactivas · ${totalProducts} productos en total`}
      loading={isLoading}
      error={error}
      onRetry={handleRefresh}
      theme="business"
      headerAction={refreshButton}
    >
      <div className="categories-page-wrapper">
        <Table
          data={filteredCategories}
          columns={columns}
          keyField="id"
          renderRow={renderRow}
          title="Lista de categorías"
          subtitle={`${filteredCategories.length} ${filteredCategories.length === 1 ? 'categoría' : 'categorías'} registradas`}
          toolbar={toolbar}
          searchPlaceholder='Ej: Categoría A'
          searchable={true}
          pagination={true}
          itemsPerPage={itemsPerPage}
          itemsPerPageOptions={[10, 15]}
          onItemsPerPageChange={(newPerPage) => setItemsPerPage(newPerPage)}
          loading={isLoading}
          emptyMessage={
            search ? 'No hay resultados para esa búsqueda' : 'No hay categorías registradas'
          }
          striped={true}
          hoverable={true}
          bordered={false}
          compact={false}
        />
      </div>

      {/* Modal de creación/edición */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingCat ? 'Editar categoría' : 'Nueva categoría'}
        size="sm"
        footer={
          <div className="modal-footer-actions">
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
                disabled={saving || !form.name.trim()}
                loading={saving}
              >
                {editingCat ? 'Modificar' : 'Guardar'}
              </IconTextButton>
            </ButtonGroup>
          </div>
        }
      >
        <div className="modal-form-container">
          <div className="form-group">
            <label className="form-label">
              Nombre *
            </label>
            <Input
              value={form.name}
              onChange={(val) => setFormField('name', val)}
              placeholder="Ej: Cafetería"
              size="md"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Descripción
            </label>
            <Input
              type="textarea"
              value={form.description}
              onChange={(val) => setFormField('description', val)}
              placeholder="Ej: Productos de café y bebidas calientes"
              size="md"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label className="form-label checkbox-label">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setFormField('is_active', e.target.checked)}
              />
              Categoría activa
            </label>
            <small className="form-hint">
              Las categorías inactivas no aparecerán en las listas de selección
            </small>
          </div>
        </div>
      </Modal>
    </PageTemplate>
  );
}