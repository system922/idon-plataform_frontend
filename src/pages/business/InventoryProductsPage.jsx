import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FiPlus, FiRefreshCw } from 'react-icons/fi';
import { Edit2, Trash2 } from 'react-feather';
import { useSession } from '../../context/SessionContext';
import PageTemplate from '../../components/PageTemplate';
import Table from '../../components/General/Table';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import SearchInput from '../../components/General/SearchInput';
import ProductModal from '../../components/ProductModal';
import ConfirmModal from '../../components/ConfirmModal';
import { useToast } from '../../components/Toast';
import { fetchWithAuth } from '../../config/api';
import { formatCurrency, calculatePVP, toNumber } from '../../utils/productUtils';
import { ERROR_MESSAGES } from '../../constants/inventoryConstants';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import TableSkeleton from '../../components/General/TableSkeleton';


const ProductosPage = () => {
  const { user } = useSession();

  const [products, setProducts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = nuevo, objeto = editar
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState('');

  const { showToast, ToastContainer } = useToast();

  // ── Carga de productos ──────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    setRefreshing(true);
    setLoading(true);
    setLoadError('');

    try {
      const res = await fetchWithAuth('/products?all=1');

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al cargar productos');
      }

      const data = await res.json();
      const list = Array.isArray(data)
        ? data
        : data?.productos ?? data?.products ?? data?.data ?? [];

      setProducts(list);
    } catch (error) {
      console.error('Error cargando productos:', error);
      setLoadError(error.message || 'Error al cargar productos');
      showToast(ERROR_MESSAGES.LOAD_PRODUCTS, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadProducts();
  }, []);

  useRealtimeSync('products', loadProducts);

  // ── Guardar producto ────────────────────────────────────────────────────
  const handleSaveProduct = useCallback(async (payload) => {
    if (saving) return;
    
    setSaving(true);
    try {
      const url = editing ? `/products/${editing.id}` : '/products';
      const method = editing ? 'PUT' : 'POST';
      
      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al guardar producto');
      }
      
      showToast(editing ? 'Producto actualizado' : 'Producto creado', 'success');
      await loadProducts();
      setModalOpen(false);
      setEditing(null);
    } catch (error) {
      showToast(error.message || ERROR_MESSAGES.SAVE_PRODUCT, 'error');
    } finally {
      setSaving(false);
    }
  }, [editing, loadProducts, showToast, saving]);

  // ── Eliminar producto ──────────────────────────────────────────────────
  const handleDeleteProduct = useCallback(async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res = await fetchWithAuth(`/products/${confirmDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al eliminar producto');
      }
      
      showToast('Producto eliminado', 'success');
      await loadProducts();
      setConfirmDelete(null);
    } catch (error) {
      showToast(error.message || ERROR_MESSAGES.DELETE_PRODUCT, 'error');
    } finally {
      setDeleting(false);
    }
  }, [confirmDelete, loadProducts, showToast]);

  // ── Handlers para abrir/cerrar modal ──────────────────────────────────
  const handleOpenCreate = () => {
    setEditing(null);  // ⚠️ Asegurar que editing sea null para nuevo
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditing(item);  // ⚠️ Pasar el objeto completo para edición
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    // ⚠️ No resetear editing inmediatamente, esperar a que el modal se cierre
    setTimeout(() => setEditing(null), 300);
  };

  // ── Filtrado por búsqueda ──────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    let result = products.filter(p => {
      const q = search.toLowerCase();
      return (p.code?.toLowerCase() || '').includes(q) ||
             (p.barcode?.toLowerCase() || '').includes(q) ||
             (p.name?.toLowerCase() || '').includes(q) ||
             (p.category_name?.toLowerCase() || '').includes(q);
    });
    
    result = [...result].sort((a, b) => {
      if (a.is_active && !b.is_active) return -1;
      if (!a.is_active && b.is_active) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
    
    return result;
  }, [products, search]);

  // ── Columnas ──────────────────────────────────────────────────────────
  const columns = [
    {
      accessor: 'barcode',
      label: 'CÓD. BARRAS',
      render: (item) => <span>{item.barcode || '—'}</span>
    },
    {
      accessor: 'name',
      label: 'DESCRIPCIÓN',
      render: (item) => <span>{item.name}</span>
    },
    {
      accessor: 'category_name',
      label: 'CATEGORÍA',
      render: (item) => <span>{item.category_name || '—'}</span>
    },
    {
      accessor: 'pvp',
      label: 'PVP',
      render: (item) => {
        const pvp = calculatePVP(item);
        const iva = toNumber(item.tax_rate);
        return (
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(pvp)}</strong>
            {toNumber(item.is_taxable) > 0 && iva > 0 && (
              <small style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)' }}>
                IVA {formatCurrency(iva)}
              </small>
            )}
          </div>
        );
      }
    },
    {
      accessor: 'unit_cost',
      label: 'COSTO',
      render: (item) => toNumber(item.unit_cost) > 0 ? formatCurrency(item.unit_cost) : '—'
    },
    {
      accessor: 'stock',
      label: 'STOCK',
      render: (item) => <span>{item.stock ?? 0}</span>
    },
    {
      accessor: 'is_active',
      label: 'ESTADO',
      render: (item) => (
        <span className={`${item.is_active ? 'status-active' : 'status-inactive'}`}>
          {item.is_active ? 'Activo' : 'Inactivo'}
        </span>
      )
    }, 
  ];

  // ── Render de fila con acciones ──────────────────────────────────────
  const renderRow = (item) => (
    <tr key={item.id} className={`table-row ${!item.is_active ? 'users-row-inactive' : ''}`}>
      {columns.map((col, idx) => (
        <td key={idx} className="table-cell" data-label={col.label}>
          {col.render ? col.render(item) : item[col.accessor]}
        </td>
      ))}
      <td className="table-cell table-actions-cell">
        <ButtonGroup>
          <IconTextButton
            variant="blue"
            size="sm"
            inline={true}
            icon={<Edit2 size={12} />}
            onClick={() => handleOpenEdit(item)}  // ← Usar handleOpenEdit
            title="Editar producto"
          >
            Editar
          </IconTextButton>
          <IconTextButton
            variant="danger"
            size="sm"
            inline={true}
            icon={<Trash2 size={12} />}
            onClick={() => setConfirmDelete({ id: item.id, name: item.name })}
            title="Eliminar producto"
          >
            Eliminar
          </IconTextButton>
        </ButtonGroup>
      </td>
    </tr>
  );

  // ── Toolbar ────────────────────────────────────────────────────
  const toolbar = (
    <div className="users-toolbar">
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar productos..."
        size="md"
        variant="bordered"
        className="users-search-input"
        onClear={() => setSearch('')}
        autoFocus={false}
      />
      <ButtonGroup>
        <IconTextButton
          variant="success"
          size="md"
          icon={<FiPlus size={13} />}
          onClick={handleOpenCreate}  // ← Usar handleOpenCreate
          disabled={saving || deleting}
          loading={saving || deleting}
        >
          Nuevo Producto
        </IconTextButton>
      </ButtonGroup>
    </div>
  );

  // ── Botón de refrescar ──────────────────────────────────────────────────
  const refreshButton = (
    <button
      onClick={loadProducts}
      className="dashboard-refresh-btn-header"
      disabled={refreshing}
      title="Actualizar datos"
    >
      <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  const isLoading = loading;
  const [itemsPerPage, setItemsPerPage] = useState(10);

  if (loading) {
    return (
      <PageTemplate
        title="Gestión de Productos"
        subtitle="Administra los productos, incluyendo códigos, SKU, precios y stock."
        loading={false}
        error={loadError}
        onRetry={loadProducts}
        headerAction={refreshButton}
        theme="business"
      >
        <TableSkeleton 
          rows={5}
          columns={7}
          title="Listado de productos"
          subtitle="Cargando productos..."
          columnWidths={['1fr', '2fr', '1.2fr', '0.8fr', '0.8fr', '0.8fr', '0.8fr']}
          toolbarWidth={160}
          showSearch={true}
        />
      </PageTemplate>
    );
  }

  return (
    <PageTemplate
      title="Gestión de Productos"
      subtitle="Administra los productos, incluyendo códigos, SKU, precios y stock."
      loading={isLoading}
      error={loadError}
      onRetry={loadProducts}
      headerAction={refreshButton}
      theme="business"
    >
      <div className="productos-page">
        <ToastContainer />

        <Table
          data={filteredProducts}
          columns={columns}
          keyField="id"
          renderRow={renderRow}
          title="Listado de productos"
          subtitle={`${filteredProducts.length} ${filteredProducts.length === 1 ? 'producto' : 'productos'} registrados`}
          toolbar={toolbar}
          searchable={false}
          pagination={true}
          itemsPerPage={itemsPerPage}
          itemsPerPageOptions={[10, 15]}
          onItemsPerPageChange={(newPerPage) => setItemsPerPage(newPerPage)}
          loading={isLoading}
          emptyMessage={search ? 'No hay resultados para esa búsqueda' : 'No hay productos registrados'}
          striped={true}
          hoverable={true}
          bordered={false}
          compact={false}
        />

        {/* ⚠️ PASAR editing CORRECTAMENTE */}
        <ProductModal
          isOpen={modalOpen}
          product={editing}  // ← editing es null para nuevo, objeto para editar
          onSave={handleSaveProduct}
          onClose={handleCloseModal}
          isSaving={saving}
        />

        <ConfirmModal
          isOpen={!!confirmDelete}
          title="Eliminar producto"
          message={`¿Estás seguro de eliminar "${confirmDelete?.name || 'este producto'}"?`}
          type="danger"
          confirmText="Eliminar"
          onConfirm={handleDeleteProduct}
          onCancel={() => setConfirmDelete(null)}
          isLoading={deleting}
        />
      </div>
    </PageTemplate>
  );
};

export default ProductosPage;