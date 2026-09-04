// pages/Inventory/SuppliersOrders.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from '../../context/SessionContext';
import {
  FiPlus,
  FiTrash2,
  FiRefreshCw,
  FiX,
  FiShoppingCart,
  FiPackage,
  FiAlertCircle,
  FiInfo,
  FiEye,
  FiEdit,
  FiCheck,
  FiCalendar
} from 'react-icons/fi';

import PageTemplate from '../../components/PageTemplate';
import Table from '../../components/General/Table';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import Input from '../../components/General/Input';
import Modal from '../../components/General/Modal';
import CustomCombobox from '../../components/General/CustomCombobox';

import { fetchWithAuth } from '../../config/api';
import { useAlert } from '../../components/ConfirmContext';
import { useConfirm } from '../../context/ConfirmContext';
import TableSkeleton from '../../components/General/TableSkeleton';


// ============================================================
// HELPERS
// ============================================================

const money = (value) => {
  const number = Number(value || 0);
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD'
  }).format(number);
};

// ─── Componente de selector de fechas personalizadas ─────────────────────────
function DateRangePicker({ startDate, endDate, onApply, onClose }) {
  const [localStart, setLocalStart] = useState(startDate || '');
  const [localEnd, setLocalEnd] = useState(endDate || '');

  const handleApply = () => {
    if (localStart && localEnd) {
      onApply(localStart, localEnd);
    }
  };

  return (
    <div className="report-date-range-picker">
      <div className="report-date-range-inputs">
        <input
          type="date"
          value={localStart}
          onChange={(e) => setLocalStart(e.target.value)}
          placeholder="Fecha inicial"
        />
        <span>a</span>
        <input
          type="date"
          value={localEnd}
          onChange={(e) => setLocalEnd(e.target.value)}
          placeholder="Fecha final"
        />
      </div>
      <div className="report-date-range-actions">
        <button onClick={onClose} className="report-btn-cancel">Cancelar</button>
        <button onClick={handleApply} className="report-btn-apply" disabled={!localStart || !localEnd}>
          Aplicar
        </button>
      </div>
    </div>
  );
}

// ============================================================
// OPCIONES DE FILTRO POR FECHA
// ============================================================

const dateFilterOptions = [
  { value: 'all', label: 'Todas' },
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mes' },
  { value: 'custom', label: 'Personalizado' },
];

// ============================================================
// MODAL - NUEVA ORDEN DE COMPRA 
// ============================================================

function PurchaseOrderModal({
  onClose,
  categories,
  onSave,
  saving
}) {
  const alert = useAlert();
  const confirm = useConfirm();
  
  const [items, setItems] = useState([]);
  const [productType, setProductType] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [orderDate, setOrderDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [products, setProducts] = useState([]);

  const productTypeOptions = [
    { value: 'COMMERCIAL', label: 'Producto Comercial' },
    { value: 'MANUFACTURED', label: 'Producto Manufacturado' },
  ];

  // ----------------------------------------------------------
  // CARGAR PRODUCTOS POR TIPO
  // ----------------------------------------------------------

  useEffect(() => {
    if (!productType) {
      setProducts([]);
      setSelectedCategory('');
      setLoadingProducts(false);
      return;
    }

    let cancelled = false;

    const loadProducts = async () => {
      setLoadingProducts(true);

      try {
        const response = await fetchWithAuth(
          `/purchase-orders/products/with-recipe?product_type=${encodeURIComponent(productType)}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Error al cargar productos');
        }

        if (!cancelled) {
          setProducts(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!cancelled) {
          setProducts([]);
          console.error('Error cargando productos:', error);
          await alert.error(error.message);
        }
      } finally {
        if (!cancelled) {
          setLoadingProducts(false);
        }
      }
    };

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [productType]);

  // ----------------------------------------------------------
  // MANEJAR CAMBIO DE TIPO DE PRODUCTO
  // ----------------------------------------------------------

  const handleProductTypeChange = async (value) => {
    if (items.length === 0 || value === productType) {
      setProductType(value);
      setSelectedCategory('');
      setProductSearch('');
      return;
    }

    const confirmed = await confirm.showConfirm({
      title: 'Cambiar tipo de orden',
      message: `Estás cambiando de "${productTypeOptions.find(opt => opt.value === productType)?.label}" a 
      "${productTypeOptions.find(opt => opt.value === value)?.label}". 
      Si continúas, se eliminarán los ${items.length} items que ya has agregado a la orden.
      ¿Deseas continuar?`,
      confirmText: 'Sí, cambiar',
      cancelText: 'Cancelar',
      danger: true,
    });
    if (confirmed) {
      setItems([]);
      setProductType(value);
      setSelectedCategory('');
      setProductSearch('');
      await alert.info(
        `Items eliminados. Ahora puedes agregar productos del nuevo tipo.`,
        'Items eliminados'
      );
    }
  };

  // ----------------------------------------------------------
  // CARGAR SUGERENCIAS
  // ----------------------------------------------------------

  const loadSuggestions = async () => {
    if (!productType) {
      await alert.warning('Primero selecciona un tipo de producto');
      return;
    }

    setLoadingSuggestions(true);
    try {
        const response = await fetchWithAuth('/purchase-orders/suggestions/items');
        const data = await response.json();

        if (!response.ok) {
        throw new Error(data.error || 'Error al cargar sugerencias');
        }

        const newItems = [];

        if (productType === 'COMMERCIAL') {
          if (data.commercial && data.commercial.length > 0) {
            data.commercial.forEach(product => {
              const existing = items.find(
                item => item.source_type === 'COMMERCIAL' && item.product_id === product.id
              );

              if (!existing) {
                newItems.push({
                  id: crypto.randomUUID(),
                  source_type: 'COMMERCIAL',
                  product_id: product.id,
                  recipe_id: null,
                  product_name: product.name,
                  product_code: product.code,
                  barcode: product.barcode || null,
                  quantity: 0,
                  stock: product.stock || 0,
                  min_stock: product.min_stock || 0,
                  required_quantity: 0,
                  is_suggestion: true,
                  notes: `Sugerido por stock bajo (${product.stock}/${product.min_stock})`
                });
              }
            });
          }
        } else if (productType === 'MANUFACTURED') {
          if (data.manufactured && data.manufactured.length > 0) {
            data.manufactured.forEach(product => {
              const needed = product.min_stock - product.stock;
              
              if (product.ingredients && product.ingredients.length > 0) {
                const yieldQty = Number(product.yield_qty || 1);
                
                product.ingredients.forEach(ingredient => {
                  const unitsToProduce = needed > 0 ? needed : 1;
                  const qtyNeeded = (unitsToProduce / yieldQty) * (ingredient.quantity || 0);
                  
                  const existing = items.find(
                    item => item.source_type === 'MANUFACTURED' && 
                            item.product_code === ingredient.raw_material_code
                  );

                  if (!existing) {
                    newItems.push({
                      id: crypto.randomUUID(),
                      source_type: 'MANUFACTURED',
                      product_id: product.id,
                      recipe_id: product.recipe_id,
                      raw_material_id: ingredient.raw_material_id,
                      product_name: ingredient.raw_material_name || 'Materia prima',
                      product_code: ingredient.raw_material_code || '',
                      barcode: null,
                      quantity: 0,
                      required_quantity: qtyNeeded,
                      stock: ingredient.stock_available || ingredient.stock || 0,
                      min_stock: ingredient.min_stock || 0,
                      is_suggestion: true,
                      notes: `Para producir ${product.name} (necesita ${unitsToProduce} unidades)`
                    });
                  }
                });
              }
            });
          }
        }

        if (newItems.length > 0) {
          setItems(prev => [...prev, ...newItems]);
          await alert.success(
            `Se agregaron ${newItems.length} sugerencias por stock bajo.`,
            'Sugerencia de Stock'
          );
        } else {
          await alert.warning(
            `No hay productos con stock bajo para el tipo "${productTypeOptions.find(opt => opt.value === productType)?.label}".`,
            'Sugerencia de Stock'
          );
        }

    } catch (error) {
        console.error('Error en loadSuggestions:', error);
        await alert.error(
        `Error al cargar sugerencias en este momento.`,
        'Sugerencia de Stock');
    } finally {
        setLoadingSuggestions(false);
    }
  };

  // ----------------------------------------------------------
  // OPCIONES DE CATEGORÍAS
  // ----------------------------------------------------------

  const categoryOptions = useMemo(() => {
    const uniqueCategories = new Map();
    products.forEach(product => {
      if (product.category_id && !uniqueCategories.has(String(product.category_id))) {
        const cat = categories.find(c => c.id === product.category_id);
        uniqueCategories.set(String(product.category_id), {
          value: String(product.category_id),
          label: cat?.name || 'Sin categoría'
        });
      }
    });
    return [
      { value: '', label: 'Todas las categorías' },
      ...Array.from(uniqueCategories.values())
    ];
  }, [products, categories]);

  // ----------------------------------------------------------
  // AGREGAR PRODUCTO COMERCIAL
  // ----------------------------------------------------------

  const addCommercialProduct = (product) => {
    const needed = product.min_stock - product.stock;
    const defaultQty = needed > 0 ? needed : 1;

    setItems(current => {
        const existing = current.find(
        item => item.source_type === 'COMMERCIAL' && item.product_id === product.id
        );

        if (existing) {
        return current.map(item =>
            item.id === existing.id
            ? { ...item, quantity: Number(item.quantity || 0) + defaultQty }
            : item
        );
        }

        return [
        ...current,
        {
            id: crypto.randomUUID(),
            source_type: 'COMMERCIAL',
            product_id: product.id,
            recipe_id: null,
            product_name: product.name,
            product_code: product.code,
            barcode: product.barcode || null,
            quantity: defaultQty,
            required_quantity: 0,
            stock: product.stock || 0,
            min_stock: product.min_stock || 0,
            is_suggestion: false,
            notes: ''
        }
        ];
    });
  };

  // ----------------------------------------------------------
  // AGREGAR PRODUCTO MANUFACTURED
  // ----------------------------------------------------------

  const addManufacturedProduct = (product) => {
    if (!product.materials || product.materials.length === 0) {
      alert.error(
        `El producto "${product.name}" no tiene materiales en su receta.`,
        'Items sin materiales'
      );
      return;
    }

    const yieldQty = Number(product.yield_qty || 1);
    const needed = product.min_stock - product.stock;
    const requestedQty = needed > 0 ? needed : 1;
    const multiplier = requestedQty / yieldQty;

    const newItems = product.materials.map(material => {
      const quantityNeeded = Number(material.quantity_needed || material.quantity || 0);
      
      return {
        id: crypto.randomUUID(),
        source_type: 'MANUFACTURED',
        product_id: product.id,
        recipe_id: product.recipe_id,
        raw_material_id: material.id,
        product_name: material.name || 'Materia prima',
        product_code: material.code || '',
        barcode: material.barcode || null,
        quantity: 0,
        required_quantity: quantityNeeded * multiplier,
        stock: material.stock_available || material.stock || 0,
        min_stock: material.min_stock || 0,
        is_suggestion: false,
        notes: `Material para ${product.name} (requiere ${quantityNeeded} por unidad)`
      };
    });

    setItems(current => [...current, ...newItems]);
    alert.success(
        `Se agregaron ${newItems.length} materias primas de "${product.name}"`,
        'Materia prima agregada'
      );
  };

  // ----------------------------------------------------------
  // SELECCIONAR PRODUCTO
  // ----------------------------------------------------------

  const handleProductSelect = async (product) => {
    if (product.product_type !== productType) {
      await alert.warning(
        `Este producto es de tipo "${product.product_type}", 
         pero la orden actual es para "${productType}". Cambia el tipo de orden primero.`,
        'Cambio de tipo de orden'
      );

      return;
    }

    const existing = items.find(
      item => item.source_type === product.product_type && 
              item.product_id === product.id
    );

    if (existing) {
      await alert.warning('Este producto ya está en la lista');
      return;
    }

    if (product.product_type === 'COMMERCIAL') {
      addCommercialProduct(product);
      return;
    }

    addManufacturedProduct(product);
  };

  // ----------------------------------------------------------
  // ELIMINAR LÍNEA
  // ----------------------------------------------------------

  const removeItem = (itemId) => {
    setItems(current => current.filter(item => item.id !== itemId));
  };

  // ----------------------------------------------------------
  // ELIMINAR SUGERENCIAS
  // ----------------------------------------------------------

  const clearSuggestions = () => {
    setItems(current => current.filter(item => !item.is_suggestion));
  };

  // ----------------------------------------------------------
  // ACTUALIZAR CANTIDAD
  // ----------------------------------------------------------

  const updateQuantity = (itemId, value) => {
    setItems(current =>
      current.map(item =>
        item.id === itemId
          ? { ...item, quantity: Number(value) || 0 }
          : item
      )
    );
  };

  // ----------------------------------------------------------
  // GUARDAR
  // ----------------------------------------------------------

  const handleSubmit = async () => {
    if (items.length === 0) {
      await alert.error(
        `Agrega al menos un producto o materia prima.`,
        'Error al procesar'
      );
      return;
    }

    const invalidItems = items.filter(item => !item.quantity || item.quantity <= 0);
    if (invalidItems.length > 0) {
      await alert.error(
        `Hay ${invalidItems.length} items con cantidad 0. 
        Por favor, ingresa cantidades válidas.`,
        'Asiganción de cantidad'
      );
      return;
    }

    const firstItem = items[0];
    const orderType = firstItem.source_type;
    const allSameType = items.every(item => item.source_type === orderType);
    
    if (!allSameType) {
      await alert.error(
        `No se pueden mezclar productos comerciales con materias primas en la misma orden.`,
        'Error al procesar'
      );
      return;
    }

    let payload = {
      order_date: orderDate,
      notes,
      order_type: orderType,
    };

    if (orderType === 'COMMERCIAL') {
      payload.items = items.map(item => ({
        product_id: item.product_id,
        quantity: Number(item.quantity),
        unit_cost: item.unit_cost || 0,
        notes: item.notes || null
      }));
    } else {
      payload.items = items.map(item => ({
        product_id: item.product_id,
        recipe_id: item.recipe_id,
        raw_material_id: item.raw_material_id,
        quantity: Number(item.quantity),
        required_quantity: item.required_quantity || Number(item.quantity),
        unit_cost: item.unit_cost || 0,
        notes: item.notes || null
      }));
    }

    await onSave(payload);
  };

  // ----------------------------------------------------------
  // FILTRAR PRODUCTOS
  // ----------------------------------------------------------

  const filteredProducts = useMemo(() => {
    if (!productType || !products.length) return [];

    let result = products.filter(p => p.is_active !== false);

    if (productSearch.trim()) {
      const search = productSearch.toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(search) ||
        p.code?.toLowerCase().includes(search) ||
        p.barcode?.toLowerCase().includes(search) ||
        p.sku?.toLowerCase().includes(search)
      );
    }

    if (selectedCategory) {
      result = result.filter(p => String(p.category_id) === selectedCategory);
    }

    return result;
  }, [products, productType, productSearch, selectedCategory]);

  // ----------------------------------------------------------
  // COLUMNAS PARA PRODUCTOS
  // ----------------------------------------------------------

  const productColumns = [
    {
      accessor: 'code',
      label: 'Cód. Aux.',
      render: (item) => <span>{item.code || '—'}</span>
    },
    {
      accessor: 'barcode',
      label: 'Cód. Barras',
      render: (item) => <span>{item.barcode || '—'}</span>
    },
    {
      accessor: 'name',
      label: 'Producto',
      render: (item) => <strong>{item.name}</strong>
    },
    {
      accessor: 'description',
      label: 'Descripción',
      render: (item) => <span>{item.description || '—'}</span>
    },
    {
      accessor: 'category_name',
      label: 'Categoría',
      render: (item) => {
        const cat = categories.find(c => c.id === item.category_id);
        return <span>{cat?.name || 'Sin categoría'}</span>;
      }
    },
    {
      accessor: 'stock',
      label: 'Stock',
      align: 'center',
      render: (item) => (
        <span style={{ 
          color: item.stock <= item.min_stock ? 'var(--danger)' : 'var(--success)',
          fontWeight: 'bold'
        }}>
          {item.stock || 0}
        </span>
      )
    },
    {
      accessor: 'materials_count',
      label: 'Materiales',
      align: 'center',
      render: (item) => {
        if (item.product_type === 'COMMERCIAL') return '—';
        return <span>{item.materials?.length || 0}</span>;
      }
    },
    {
      accessor: 'actions',
      label: 'Acciones',
      align: 'center',
      render: (item) => {
        const isInList = items.some(
          i => i.product_id === item.id && i.source_type === item.product_type
        );
        
        const hasMaterials = item.product_type === 'COMMERCIAL' || 
                            (item.materials && item.materials.length > 0);
        
        return (
          <IconTextButton
            variant={isInList ? 'secondary' : 'success'}
            size="sm"
            inline={true}
            icon={isInList ? <FiCheck size={14} /> : <FiPlus size={14} />}
            onClick={() => handleProductSelect(item)}
            disabled={isInList || !hasMaterials}
            tooltip={
              isInList 
                ? 'Agregado' 
                : !hasMaterials 
                  ? 'No tiene receta configurada' 
                  : 'Agregar a la orden'
            }
          >
            {isInList ? 'Agregado' : 'Agregar'}
          </IconTextButton>
        );
      }
    }
  ];

  // ----------------------------------------------------------
  // COLUMNAS PARA ITEMS DE LA ORDEN
  // ----------------------------------------------------------

  const orderItemColumns = [
    {
      accessor: 'product_code',
      label: 'Cód. Aux.',
      render: (item) => <span>{item.product_code || '—'}</span>
    },
    {
      accessor: 'barcode',
      label: 'Cód. Barras',
      render: (item) => <span>{item.barcode || '—'}</span>
    },
    {
      accessor: 'product_name',
      label: 'Producto',
      render: (item) => <strong>{item.product_name}</strong>
    },
    {
      accessor: 'required_quantity',
      label: 'Min. STOCK',
      align: 'center',
      render: (item) => {
        return (
            <span style={{ 
            fontSize: '12px', 
            color: 'var(--warning)',
            fontWeight: 'bold',
            display: 'block'
            }}>
            {item.min_stock || 0}
            </span>
        );
        }
    },
    {
      accessor: 'quantity',
      label: 'Cantidad',
      align: 'center',
      render: (item) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Input
            min="0"
            value={item.quantity || 0}
            onChange={(value) => updateQuantity(item.id, value)}
            size="sm"
            style={{ width: '90px', textAlign: 'center' }}
            placeholder="0"
          />
        </div>
      )
    },
    {
      accessor: 'stock',
      label: 'Stock',
      align: 'center',
      render: (item) => {
        const isLowStock = item.stock !== undefined && item.stock <= (item.min_stock || 0);
        return (
          <span style={{ 
            color: isLowStock ? 'var(--danger)' : 'var(--text-secondary)',
            fontWeight: isLowStock ? 'bold' : 'normal'
          }}>
            {item.stock !== undefined ? item.stock : '—'}
          </span>
        );
      }
    },
    {
      accessor: 'source_type',
      label: 'Tipo',
      align: 'center',
      render: (item) => (
        <span className={`order-item-type ${item.source_type?.toLowerCase() || 'commercial'}`}>
          {item.source_type === 'MANUFACTURED' ? 'Manufacturado' : 'Comercial'}
        </span>
      )
    },
    {
      accessor: 'is_suggestion',
      label: 'Origen',
      align: 'center',
      render: (item) => (
        <span style={{ fontSize: '11px', color: item.is_suggestion ? 'var(--warning)' : 'var(--text-muted)' }}>
          {item.is_suggestion ? '💡 Sugerido' : 'Manual'}
        </span>
      )
    },
    {
      accessor: 'actions',
      label: 'Acciones',
      align: 'center',
      render: (item) => (
        <IconTextButton
          variant=""
          size="sm"
          inline={true}
          icon={<FiTrash2 size={14} />}
          onClick={() => removeItem(item.id)}
          tooltip="Eliminar línea"
        >
          Eliminar
        </IconTextButton>
      )
    }
  ];

  // ----------------------------------------------------------
  // TOOLBAR DE PRODUCTOS
  // ----------------------------------------------------------

  const productToolbar = (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', width: '100%' }}>
      <div style={{ minWidth: '180px' }}>
        <CustomCombobox
          options={categoryOptions}
          value={selectedCategory}
          onChange={setSelectedCategory}
          placeholder="Filtrar por categoría..."
          filterable={true}
          size="md"
          
        />
      </div>
      <ButtonGroup>
        <IconTextButton
          variant="info"
          size="sm"
          icon={<FiRefreshCw size={14} />}
          onClick={loadSuggestions}
          disabled={loadingSuggestions || !productType}
        >
          {loadingSuggestions ? 'Cargando...' : 'Sugerencias'}
        </IconTextButton>
      </ButtonGroup>
    </div>
  );

  // ----------------------------------------------------------
  // TOOLBAR DE ITEMS DE LA ORDEN
  // ----------------------------------------------------------

  const orderItemsToolbar = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      {items.some(item => item.is_suggestion) && (
        <IconTextButton
          variant="danger"
          size="sm"
          icon={<FiX size={14} />}
          onClick={clearSuggestions}
        >
          Limpiar sugerencias
        </IconTextButton>
      )}
    </div>
  );

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------

  return (
    <Modal
      closeOnOverlayClick={false}
      isOpen={true}
      onClose={onClose}
      title="Nueva orden de compra"
      size="xl"
      className="purchase-order-modal"
      footer={
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
            icon={<FiShoppingCart size={14} />}
            onClick={handleSubmit}
            loading={saving}
            disabled={saving || items.length === 0}
          >
            {saving ? 'Creando orden...' : 'Guardar'}
          </IconTextButton>
        </ButtonGroup>
      }
    >
      <div className="purchase-order-modal-content">

        {/* ======================================================
            CABECERA
        ====================================================== */}

        <div className="purchase-order-header">
          <div className="purchase-order-header-row">
            <div className="form-group">
              <label>Fecha de orden</label>
              <Input
                type="date"
                value={orderDate}
                onChange={setOrderDate}
                size="md"
              />
            </div>

            <div className="form-group">
              <label>Tipo de producto</label>
              <CustomCombobox
                options={productTypeOptions}
                value={productType}
                onChange={handleProductTypeChange}
                placeholder="Seleccionar tipo..."
                filterable={false}
                size="md"
              />
            </div>
          </div>
        </div>

        {/* ======================================================
            TABLA DE PRODUCTOS
        ====================================================== */}

        {productType && (
          <div className="purchase-order-products-section">
            <Table
              data={filteredProducts}
              columns={productColumns}
              keyField="id"
              title={productType === 'COMMERCIAL' ? 'Productos comerciales' : 'Productos manufacturados'}
              subtitle={`${filteredProducts.length} ${filteredProducts.length === 1 ? 'item' : 'items'} `}
              toolbar={productToolbar}
              searchable={true}
              onSearchChange={setProductSearch}
              pagination={true}
              itemsPerPage={5}
              itemsPerPageOptions={[5, 10, 20]}
              loading={loadingProducts}
              emptyMessage={
                productSearch || selectedCategory
                  ? 'No hay productos que coincidan con los filtros'
                  : 'No hay productos disponibles'
              }
              striped={true}
              hoverable={true}
              bordered={false}
              compact={true}
            />
          </div>
        )}

        {/* ======================================================
            TABLA DE ITEMS DE LA ORDEN
        ====================================================== */}

        <div className="purchase-order-items-section">
          <Table
            data={items}
            columns={orderItemColumns}
            keyField="id"
            title="Detalle de orden de compra"
            subtitle={`${items.length} ${items.length === 1 ? 'item agregado' : 'items agregados'} `}
            toolbar={orderItemsToolbar}
            searchable={true}
            pagination={false}
            loading={false}
            striped={true}
            hoverable={true}
            bordered={false}
            compact={true}
          />
        </div>

        {/* ======================================================
            OBSERVACIONES
        ====================================================== */}

        <div className="form-group">
          <label>Observaciones</label>
          <Input
            type="text"
            value={notes}
            onChange={setNotes}
            placeholder="Observaciones de la orden..."
            size="md"
          />
        </div>

      </div>
    </Modal>
  );
}

// ============================================================
// MODAL - DETALLE DE ORDEN
// ============================================================

function OrderDetailModal({ 
  order, 
  items, 
  onClose, 
  onStatusChange, 
  onUpdateOrder,
  loading,
  changingStatus
  
}) {
  const alert = useAlert();
  const confirm = useConfirm();
  
  const statusLabels = {
    draft: 'Borrador',
    pending: 'Pendiente',
    approved: 'Aprobada',
    received: 'Recibida',
    cancelled: 'Cancelada'
  };

  const currentStatus = order?.status?.toLowerCase() || 'draft';
  const [orderItems, setOrderItems] = useState(items || []);
  const [updatingItem, setUpdatingItem] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState(order?.notes || '');
  const [hasChanges, setHasChanges] = useState(false);
  const [editedItems, setEditedItems] = useState({});

  useEffect(() => {
    if (items && items.length > 0) {
      const initial = {};
      items.forEach(item => {
        initial[item.id] = {
          quantity: item.quantity || 0
        };
      });
      setEditedItems(initial);
    }
    setNotes(order?.notes || '');
  }, [items, order]);

  useEffect(() => {
    if (!isEditing) {
      setHasChanges(false);
      return;
    }
    
    let hasQuantityChanges = false;
    for (const item of orderItems) {
      const edited = editedItems[item.id];
      if (edited && Number(edited.quantity) !== Number(item.quantity)) {
        hasQuantityChanges = true;
        break;
      }
    }
    
    const hasNotesChanges = notes !== (order?.notes || '');
    setHasChanges(hasQuantityChanges || hasNotesChanges);
  }, [editedItems, orderItems, notes, order, isEditing]);

  const updateItemQuantity = (itemId, newQuantity) => {
    if (newQuantity < 0) return;
    
    setEditedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantity: Number(newQuantity)
      }
    }));
  };

  const handleSaveChanges = async () => {
    const invalidItems = Object.keys(editedItems).filter(
      itemId => !editedItems[itemId]?.quantity || editedItems[itemId]?.quantity <= 0
    );
    
    if (invalidItems.length > 0) {
      await alert.success(
        `Hay ${invalidItems.length} items con cantidad 0. Por favor, ingresa cantidades válidas o elimine.`,
        'Modificación de Orden'
      );
      return;
    }

    const confirmed = await confirm.showConfirm({
      title: 'Guardar cambios',
      message: '¿Estás seguro de guardar los cambios en esta orden?',
      confirmText: 'Guardar',
      cancelText: 'Cancelar',
      danger: false,
    });

    if (!confirmed) return;

    setSaving(true);

    try {
      const updatedItems = orderItems.map(item => {
        const edited = editedItems[item.id];
        return {
          id: item.id,
          quantity: edited?.quantity !== undefined ? Number(edited.quantity) : Number(item.quantity || 0),
          product_id: item.product_id,
          source_type: item.source_type,
          product_name: item.product_name,
          product_code: item.product_code,
          barcode: item.barcode,
          recipe_id: item.recipe_id,
          notes: item.notes
        };
      });

      const response = await fetchWithAuth(`/purchase-orders/${order.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          notes: notes,
          items: updatedItems
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar la orden');
      }

      setOrderItems(updatedItems);
      setIsEditing(false);
      setHasChanges(false);
      
      await alert.success(`Cambios guardados correctamente`, 'Modificación de Orden');
      
      if (onUpdateOrder) {
        await onUpdateOrder();
      }

    } catch (error) {
      await alert.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (itemId) => {
    if (currentStatus !== 'draft') {
      await alert.warning(
        `Solo se pueden eliminar items de órdenes en estado "Borrador".`,
        'Modificación de Orden'
      );
      return;
    }

    const confirmed = await confirm.showConfirm({
      title: 'Eliminar item',
      message: '¿Estás seguro de eliminar este item de la orden?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      danger: true,
    });

    if (!confirmed) return;

    try {
      const response = await fetchWithAuth(`/purchase-orders/${order.id}/items/${itemId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar item');
      }

      const updatedItems = orderItems.filter(item => item.id !== itemId);
      setOrderItems(updatedItems);
      
      const newEditedItems = { ...editedItems };
      delete newEditedItems[itemId];
      setEditedItems(newEditedItems);
      
      await alert.success(
        `Item eliminado correctamente.`,
        'Modificación de Orden'
      );

    } catch (error) {
      await alert.error(error.message);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setHasChanges(false);
    const initial = {};
    orderItems.forEach(item => {
      initial[item.id] = {
        quantity: item.quantity || 0
      };
    });
    setEditedItems(initial);
    setNotes(order?.notes || '');
  };

  const detailColumns = [
    {
      accessor: 'product_code',
      label: 'Código',
      render: (item) => <span>{item.product_code || '—'}</span>
    },
    {
      accessor: 'product_name',
      label: 'Producto',
      render: (item) => <strong>{item.product_name}</strong>
    },
    {
      accessor: 'source_type',
      label: 'Tipo',
      render: (item) => (
        <span className={`order-item-type ${item.source_type?.toLowerCase() || 'commercial'}`}>
          {item.source_type === 'MANUFACTURED' ? 'Manufacturado' : 'Comercial'}
        </span>
      )
    },
    {
      accessor: 'quantity',
      label: 'Cantidad',
      align: 'center',
      render: (item) => {
        const isEditable = isEditing && currentStatus === 'draft';
        const currentQty = editedItems[item.id]?.quantity !== undefined 
          ? editedItems[item.id].quantity 
          : item.quantity || 0;
          
        return isEditable ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Input
              type="number"
              min="0"
              step="1"
              value={currentQty}
              onChange={(value) => updateItemQuantity(item.id, value)}
              size="sm"
              style={{ width: '80px', textAlign: 'center' }}
              placeholder="0"
              disabled={updatingItem || saving}
            />
          </div>
        ) : (
          <span>{item.quantity}</span>
        );
      }
    },
    {
      accessor: 'actions',
      label: 'Acciones',
      align: 'center',
      render: (item) => {
        if (!isEditing || currentStatus !== 'draft') return null;
        return (
          <IconTextButton
            variant=""
            size="sm"
            inline={true}
            icon={<FiTrash2 size={14} />}
            onClick={() => removeItem(item.id)}
            tooltip="Eliminar línea"
            disabled={updatingItem || saving}
          >
            Eliminar
          </IconTextButton>
        );
      }
    }
  ];

  const tableToolbar = (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      width: '100%',
      flexWrap: 'wrap',
      gap: '8px'
    }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {currentStatus === 'draft' && !isEditing && (
          <IconTextButton
            variant="primary"
            size="sm"
            icon={<FiEdit size={14} />}
            onClick={() => setIsEditing(true)}
          >
            Modificar
          </IconTextButton>
        )}

        {isEditing && (
          <>
            <IconTextButton
              variant=""
              size="sm"
              onClick={cancelEditing}
              disabled={saving}
            >
              Cancelar
            </IconTextButton>
            
            <IconTextButton
              variant="success"
              size="sm"
              icon={<FiCheck size={14} />}
              onClick={handleSaveChanges}
              loading={saving}
              disabled={saving || !hasChanges}
              tooltip={!hasChanges ? 'No hay cambios para guardar' : ''}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </IconTextButton>
          </>
        )}
      </div>
    </div>
  );

  const renderFooter = () => {
    const actions = [];

    actions.push(
      <IconTextButton 
        key="close" 
        variant="" 
        onClick={onClose}
        disabled={saving}
      >
        Cerrar
      </IconTextButton>
    );

    if (currentStatus === 'draft' || currentStatus === 'pending') {
      actions.push(
        <IconTextButton
          key="cancel-order"
          variant=""
          icon={<FiX size={14} />}
          onClick={() => onStatusChange('cancelled')}
          disabled={loading || saving || isEditing}
          tooltip={isEditing ? 'Guarda los cambios primero' : ''}
        >
          Cancelar
        </IconTextButton>
      );
    }

    if (currentStatus === 'draft' || currentStatus === 'pending') {
      const isApproveDisabled = changingStatus || saving || isEditing;
      
      actions.push(
        <IconTextButton
          key="approve"
          variant="success"
          icon={<FiCheck size={14} />}
          onClick={() => onStatusChange('approved')}
          disabled={isApproveDisabled}
          tooltip={isEditing ? 'Primero guarda los cambios para poder aprobar' : ''}
        >
          Aprobar
        </IconTextButton>
      );
    }

    if (currentStatus === 'approved') {
      actions.push(
        <IconTextButton
          key="receive"
          variant="success"
          icon={<FiCheck size={14} />}
          onClick={() => onStatusChange('received')}
          disabled={loading}
        >
          Recibir
        </IconTextButton>
      );
    }

    if (isEditing) {
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          width: '100%'
        }}>
          <span style={{ 
            fontSize: '13px', 
            color: 'var(--warning)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <FiAlertCircle size={16} />
            {hasChanges ? 'Tienes cambios sin guardar. Guarda antes de aprobar.' : 'Modo edición activo. Guarda para aplicar cambios.'}
          </span>
          <ButtonGroup>{actions}</ButtonGroup>
        </div>
      );
    }

    return <ButtonGroup>{actions}</ButtonGroup>;
  };

  const [itemsPerPage, setItemsPerPage] = useState(10);

  return (
    <Modal
      closeOnOverlayClick={false}
      isOpen={true}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span>Detalle de orden #{order?.order_number || ''}</span>
        </div>
      }
      size="xl"
      className="order-detail-modal"
      footer={renderFooter()}
    >
      <div className="order-detail-content">
        <div className="detail-modal-header">
          <div className="detail-modal-info-grid">
            <div className="detail-modal-field">
              <div className="detail-modal-label">
                <FiPackage size={14} />
                <span>Número de orden</span>
              </div>
              <span className="detail-modal-value" style={{ color: '#1a2332', fontWeight: 500 }}>
                {order?.order_number || '—'}
              </span>
            </div>

            <div className="detail-modal-field">
              <div className="detail-modal-label">
                <FiCalendar size={14} />
                <span>Fecha</span>
              </div>
              <span className="detail-modal-value" style={{ color: '#1a2332', fontWeight: 500 }}>
                {order?.order_date ? new Date(order.order_date).toLocaleDateString('es-EC') : '—'}
              </span>
            </div>

            <div className="detail-modal-field">
              <div className="detail-modal-label">
                <FiCheck size={14} />
                <span>Estado</span>
              </div>
              <span style={{ 
                fontWeight: 'bold',
                color: currentStatus === 'draft' ? 'var(--warning)' : 
                       currentStatus === 'pending' ? 'var(--info)' :
                       currentStatus === 'approved' ? 'var(--success)' :
                       currentStatus === 'received' ? 'var(--success)' :
                       'var(--danger)'
              }}>
                {statusLabels[currentStatus] || currentStatus}
              </span>
            </div>

            <div className="detail-modal-field" style={{ gridColumn: '1 / -1' }}>
              <div className="detail-modal-label">
                <FiInfo size={14} />
                <span>Observaciones</span>
              </div>
              {isEditing ? (
                <Input
                  type="text"
                  value={notes}
                  onChange={(value) => {
                    setNotes(value);
                  }}
                  placeholder="Observaciones de la orden..."
                  size="md"
                  style={{ marginTop: '4px' }}
                />
              ) : (
                <span className="detail-modal-value" style={{ color: '#1a2332', fontWeight: 500 }}>
                  {order?.notes || '—'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="order-detail-items" style={{ marginTop: '20px' }}>
          <Table
            data={orderItems}
            columns={detailColumns}
            keyField="id"
            title="Productos"
            subtitle={`${orderItems?.length || 0} ${orderItems?.length === 1 ? 'item en la orden' : 'items en la orden'}`}   
            toolbar={tableToolbar}
            searchable={true}
            searchPlaceholder="Buscar producto..."
            pagination={true}
            itemsPerPage={itemsPerPage}
            itemsPerPageOptions={[10, 15]}
            onItemsPerPageChange={(newPerPage) => setItemsPerPage(newPerPage)}
            loading={false}
            striped={true}
            hoverable={true}
            bordered={false}
            compact={false}
          />
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// PÁGINA PRINCIPAL
// ============================================================

export default function SuppliersOrders() {
  const { user } = useSession();
  const alert = useAlert();
  const confirm = useConfirm();

  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [changingStatus, setChangingStatus] = useState(false);

  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // ----------------------------------------------------------
  // Cargar datos
  // ----------------------------------------------------------

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [ordersResponse, categoriesResponse] = await Promise.all([
        fetchWithAuth('/purchase-orders'),
        fetchWithAuth('/categories')
      ]);

      const ordersData = await ordersResponse.json();
      const categoriesData = await categoriesResponse.json();

      if (!ordersResponse.ok) {
        throw new Error(ordersData.error || 'Error al cargar órdenes');
      }

      if (!categoriesResponse.ok) {
        throw new Error(categoriesData.error || 'Error al cargar categorías');
      }

      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);

    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ----------------------------------------------------------
  // Refresh
  // ----------------------------------------------------------

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // ----------------------------------------------------------
  // Ver detalle de orden
  // ----------------------------------------------------------

  const viewOrderDetail = async (order) => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(`/purchase-orders/${order.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar el detalle');
      }

      setSelectedOrder(data.order);
      setOrderItems(data.items || []);
      setShowDetailModal(true);

    } catch (error) {
      await alert.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------------
  // Cambiar estado de orden
  // ----------------------------------------------------------

  const handleStatusChange = async (newStatus) => {
    if (!selectedOrder) return;

    const statusLabels = {
      draft: 'Borrador',
      pending: 'Pendiente',
      approved: 'Aprobada',
      received: 'Recibida',
      cancelled: 'Cancelada'
    };

    const confirmed = await confirm.showConfirm({
      title: 'Cambiar estado',
      message: `¿Cambiar el estado de la orden #${selectedOrder.order_number} a "${statusLabels[newStatus]}"?`,
      confirmText: 'Cambiar',
      cancelText: 'Cancelar',
      danger: newStatus === 'cancelled',
    });

    if (!confirmed) return;

    setChangingStatus(true);

    try {
      const response = await fetchWithAuth(`/purchase-orders/${selectedOrder.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cambiar estado');
      }

      setShowDetailModal(false);
      await loadData();
      await alert.success(
        `Orden aprobada correctamente.`,
        'Aprobación exitosa'
      );
      return;
      

    } catch (error) {
      await alert.error(error.message);
    } finally {
      setChangingStatus(false);
    }
  };

  // ----------------------------------------------------------
  // Crear orden
  // ----------------------------------------------------------

  const handleSaveOrder = async (payload) => {
    setSaving(true);

    try {
      const response = await fetchWithAuth('/purchase-orders', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'No se pudo crear la orden');
      }

      setShowModal(false);
      await loadData();
      await alert.success(
        `Orden de compra creada correctamente.`,
        'Creación de Orden Exitosa'
      );
      return;

    } catch (error) {
      await alert.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------------
  // Eliminar orden
  // ----------------------------------------------------------

  const handleDeleteOrder = async (order) => {
    const confirmed = await confirm.showConfirm({
      title: 'Confirmar eliminación',
      message: `¿Eliminar la orden #${order.order_number}? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      danger: true,
    });

    if (!confirmed) return;

    try {
      const response = await fetchWithAuth(`/purchase-orders/${order.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Error al eliminar la orden');
      }

      await loadData();
      await alert.success(
        `Orden #${order.order_number} eliminada correctamente.`,
        'Eliminación exitosa'
      );
      return;

    } catch (error) {
      await alert.error(error.message);
    }
  };

  // ----------------------------------------------------------
  // Filtrar por fecha
  // ----------------------------------------------------------
  const getDateFilter = (dateStr, filter, startDate, endDate) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (filter) {
        case 'today':
        return date.toDateString() === today.toDateString();
        case 'week': {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return date >= weekStart;
        }
        case 'month': {
        return date.getMonth() === today.getMonth() && 
                date.getFullYear() === today.getFullYear();
        }
        case 'custom': {
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            return date >= start && date <= end;
        }
        return true;
        }
        default:
        return true;
    }
  };

  // ----------------------------------------------------------
  // Filtrado
  // ----------------------------------------------------------
  const filteredOrders = useMemo(() => {
    let result = orders;

    if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase();
        result = result.filter(order =>
        String(order.order_number || '').toLowerCase().includes(search)
        );
    }

    if (dateFilter !== 'all') {
        result = result.filter(order => 
        getDateFilter(order.order_date, dateFilter, customStartDate, customEndDate)
        );
    }

    return result;
  }, [orders, searchTerm, dateFilter, customStartDate, customEndDate]);

  // ----------------------------------------------------------
  // Columnas principales
  // ----------------------------------------------------------

  const columns = [
    {
      accessor: 'order_number',
      label: 'Orden',
      render: item => (
        <strong>{item.order_number || `OC-${String(item.id).slice(0, 8)}`}</strong>
      )
    },
    {
      accessor: 'order_date',
      label: 'Fecha',
      render: item => {
        if (!item.order_date) return '—';
        return new Date(item.order_date).toLocaleDateString('es-EC');
      }
    },
    {
      accessor: 'item_count',
      label: 'Items',
      render: item => <span>{item.item_count || 0}</span>
    },
    {
      accessor: 'status',
      label: 'Estado',
      render: item => {
        const status = (item.status || 'draft').toLowerCase();
        const labels = {
          draft: 'Borrador',
          pending: 'Pendiente',
          approved: 'Aprobada',
          received: 'Recibida',
          cancelled: 'Cancelada'
        };

        return (
          <span>
            {labels[status] || status}
          </span>
        );
      }
    },
    {
      accessor: 'actions',
      label: 'Acciones',
      align: 'center',
      render: (item) => (
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
          <IconTextButton
            variant="info"
            size="sm"
            inline={true}
            icon={<FiEye size={14} />}
            onClick={() => viewOrderDetail(item)}
            tooltip="Ver detalle"
          >
            Ver
          </IconTextButton>

          {item.status === 'draft' && (
            <IconTextButton
              variant="danger"
              size="sm"
              inline={true}
              icon={<FiTrash2 size={14} />}
              onClick={() => handleDeleteOrder(item)}
              tooltip="Eliminar"
            >
              Eliminar
            </IconTextButton>
          )}
        </div>
      )
    }
  ];

  // ----------------------------------------------------------
  // Toolbar
  // ----------------------------------------------------------
  const toolbar = (
    <div className="users-toolbar">
      <div style={{ minWidth: '180px' }}>
        <CustomCombobox
            options={dateFilterOptions}
            value={dateFilter}
            onChange={(value) => {
            setDateFilter(value);
            if (value === 'custom') {
                setShowCustomDate(true);
            } else {
                setShowCustomDate(false);
                setCustomStartDate('');
                setCustomEndDate('');
            }
            }}
            placeholder="Filtrar por fecha..."
            filterable={false}
            size="md"
        />
        </div>

        <ButtonGroup>
            <IconTextButton
                variant=""
                size="sm"
                icon={<FiX size={14} />}
                onClick={() => {
                setSearchTerm('');
                setDateFilter('all');
                setCustomStartDate('');
                setCustomEndDate('');
                setShowCustomDate(false);
                }}
            >
                Limpiar
            </IconTextButton>

            <IconTextButton
                variant="success"
                size="md"
                icon={<FiPlus size={13} />}
                onClick={() => setShowModal(true)}
            >
                Nueva orden de compra
            </IconTextButton>
        </ButtonGroup>
    </div>
  );

  // ----------------------------------------------------------
  // Refresh button
  // ----------------------------------------------------------

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
        title="ÓRDENES DE COMPRA"
        subtitle="Gestión de compras a proveedores"
        theme="business"
        loading={false}
        headerAction={refreshButton}
      >
        <TableSkeleton 
          rows={5}
          columns={5}
          title="ÓRDENES DE COMPRA"
          subtitle="Cargando órdenes..."
          columnWidths={['1.2fr', '1fr', '0.8fr', '1fr', '1.2fr']}
          toolbarWidth={200}
          showSearch={true}
        />
      </PageTemplate>
    );
  }

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

  return (
    <PageTemplate
      title="ÓRDENES DE COMPRA"
      subtitle="Gestión de compras a proveedores"
      theme="business"
      loading={loading}
      headerAction={refreshButton}
    >
      {error && (
        <div className="alert alert-error">
          <FiAlertCircle size={16} />
          {error}
        </div>
      )}

      <Table
        data={filteredOrders}
        columns={columns}
        keyField="id"
        title="Órdenes de compra"
        subtitle={`${filteredOrders.length} ${filteredOrders.length === 1 ? 'orden' : 'órdenes'}`}
        toolbar={toolbar}
        searchable={true}
        searchPlaceholder='Ej: OC-20260810-0001'
        pagination={true}
        itemsPerPage={itemsPerPage}
        itemsPerPageOptions={[10, 15]}
        onItemsPerPageChange={(newPerPage) => setItemsPerPage(newPerPage)}
        loading={loading}
        striped={true}
        hoverable={true}
        bordered={false}
        compact={false}
      />

      {showModal && (
        <PurchaseOrderModal
          onClose={() => setShowModal(false)}
          categories={categories}
          onSave={handleSaveOrder}
          saving={saving}
        />
      )}

      {showDetailModal && (
        <OrderDetailModal
          order={selectedOrder}
          items={orderItems}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedOrder(null);
            setOrderItems([]);
          }}
          onStatusChange={handleStatusChange}
          onUpdateOrder={loadData}
          loading={changingStatus}
        />
        
      )}

      {showCustomDate && (
        <div className="report-modal-overlay" onClick={() => setShowCustomDate(false)}>
            <div className="report-modal-box" onClick={e => e.stopPropagation()}>
            <div className="report-modal-header">
                <h2>Seleccionar fechas</h2>
                <button 
                type="button" 
                onClick={() => setShowCustomDate(false)} 
                className="report-modal-close"
                >
                ×
                </button>
            </div>
            <div className="report-modal-body">
                <DateRangePicker
                startDate={customStartDate}
                endDate={customEndDate}
                onApply={(start, end) => {
                    setCustomStartDate(start);
                    setCustomEndDate(end);
                    setShowCustomDate(false);
                    setDateFilter('custom');
                }}
                onClose={() => setShowCustomDate(false)}
                />
            </div>
            </div>
        </div>
      )}
    </PageTemplate>
  );
}