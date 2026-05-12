import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiPlus, FiRefreshCw, FiEdit2, FiTrash2 } from 'react-icons/fi';
import PageTemplate from '../../components/PageTemplate';
import DataTable from '../../components/DataTable';
import ProductModal from '../../components/ProductModal';
import ConfirmModal from '../../components/ConfirmModal';
import { useToast } from '../../components/Toast';
import { productService } from '../../services/productService';
import { useAsyncOperation } from '../../hooks/useAsyncOperation';
import { formatCurrency, calculatePVP, toNumber } from '../../utils/productUtils';
import { ERROR_MESSAGES } from '../../constants/inventoryConstants';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import '../../styles/DataTable.css';
import '../../styles/ProductosPage.css';

const ProductosPage = () => {
  const [products, setProducts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  
  const { execute: loadProductsAsync, isLoading: loading, error: loadError } = useAsyncOperation();
  const { execute: saveProductAsync, isLoading: saving } = useAsyncOperation();
  const { execute: deleteProductAsync, isLoading: deleting } = useAsyncOperation();
  const { showToast, ToastContainer } = useToast();
  
  const isMounted = useRef(true);

  // En ProductosPage.jsx, dentro de loadProducts o en el useEffect
  const loadProducts = useCallback(async () => {
    try {
      const data = await loadProductsAsync(
        (signal) => productService.getAll(signal),
        (result) => {
          if (isMounted.current) {
            setProducts(result);
          }
        }
      );
      return data;
    } catch (error) {
      if (isMounted.current) showToast(ERROR_MESSAGES.LOAD_PRODUCTS, 'error');
    }
  }, [loadProductsAsync, showToast]);
  
  useEffect(() => {
    loadProducts();
  }, []);

  useRealtimeSync(['products', 'categories', 'inventory'], loadProducts);

  // Guardar producto
  const handleSaveProduct = useCallback(async (payload) => {
    try {
      if (editing) {
        await saveProductAsync(() => productService.update(editing.id, payload));
        showToast('Producto actualizado', 'success');
      } else {
        await saveProductAsync(() => productService.create(payload));
        showToast('Producto creado', 'success');
      }
      await loadProducts();
      setModalOpen(false);
      setEditing(null);
    } catch (error) {
      showToast(ERROR_MESSAGES.SAVE_PRODUCT, 'error');
    }
  }, [editing, saveProductAsync, loadProducts, showToast]);

  // Eliminar producto
  const handleDeleteProduct = useCallback(async () => {
    if (!confirmDelete) return;
    try {
      await deleteProductAsync(() => productService.delete(confirmDelete.id));
      showToast('Producto eliminado', 'success');
      await loadProducts();
      setConfirmDelete(null);
    } catch (error) {
      showToast(ERROR_MESSAGES.DELETE_PRODUCT, 'error');
    }
  }, [confirmDelete, deleteProductAsync, loadProducts, showToast]);

  // Configuración de columnas
  const columns = [
    { key: 'code', label: 'CÓDIGO', sortable: true },
    { key: 'sku', label: 'SKU', sortable: true },
    { key: 'barcode', label: 'CÓD. BARRAS' },
    { key: 'name', label: 'DESCRIPCIÓN', sortable: true },
    { key: 'category_name', label: 'CATEGORÍA', sortable: true },
    { 
      key: 'pvp', 
      label: 'PVP', 
      align: 'right',
      sortable: true,
      render: (_, row) => {
        const pvp = calculatePVP(row);
        const iva = toNumber(row.tax_rate);
        return (
          <div>
            <strong style={{ color: '#00c48c' }}>{formatCurrency(pvp)}</strong>
            {row.is_taxable && iva > 0 && (
              <small style={{ display: 'block', fontSize: 10, color: '#fbbf24' }}>
                IVA {formatCurrency(iva)}
              </small>
            )}
          </div>
        );
      }
    },
    { 
      key: 'unit_cost', 
      label: 'COSTO', 
      align: 'right',
      render: (val) => toNumber(val) > 0 ? formatCurrency(toNumber(val)) : '—'
    },
    { key: 'stock', label: 'STOCK', align: 'right', sortable: true },
    { 
      key: 'is_active', 
      label: 'ESTADO',
      render: (val) => (
        <span className={`status-badge ${val ? 'status-active' : 'status-inactive'}`}>
          {val ? 'Activo' : 'Inactivo'}
        </span>
      )
    },
  ];

  // Acciones por fila
  const rowActions = [
    {
      icon: <FiEdit2 size={16} />,
      title: 'Editar producto',
      onClick: (row) => { setEditing(row); setModalOpen(true); }
    },
    {
      icon: <FiTrash2 size={16} />,
      title: 'Eliminar producto',
      color: '#ef4444',
      onClick: (row) => setConfirmDelete({ id: row.id, name: row.name })
    }
  ];

  const isLoading = loading || saving || deleting;

  return (
    <PageTemplate
      title=" Gestión de Productos"
      subtitle="Gestión de inventario"
      theme="business"
      loading={isLoading}
      error={loadError}
      onRetry={loadProducts}
      headerAction={
        <div className="page-actions">
          <button className="btn-primary" onClick={() => { setEditing(null); setModalOpen(true); }}>
            <FiPlus size={18} /> Nuevo Producto
          </button>
          <button className="btn-icon" onClick={loadProducts} title="Recargar">
            <FiRefreshCw size={18} />
          </button>
        </div>
      }
    >
      <div className="productos-page">
        <ToastContainer />
        
        <DataTable
          data={products}
          columns={columns}
          actions={rowActions}
          loading={isLoading}
          enableSearch={true}
          enablePagination={true}
          pageSize={10}
          searchPlaceholder="Buscar por código, SKU, nombre o categoría..."
          emptyMessage="No hay productos registrados"
        />

        <ProductModal
          isOpen={modalOpen}
          product={editing}
          onSave={handleSaveProduct}
          onClose={() => { setModalOpen(false); setEditing(null); }}
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