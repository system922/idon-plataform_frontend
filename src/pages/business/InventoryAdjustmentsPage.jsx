import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../context/SessionContext'; 
import PageTemplate from '../../components/PageTemplate';
import { useConfirm, useAlert } from '../../context/ConfirmContext';
import { FiRefreshCw as FiRefreshCwIcon, FiPlus, FiX, FiEye, FiPackage, FiCheck, FiSearch, FiCalendar, FiFilter, FiChevronDown } from 'react-icons/fi';
import { fetchWithAuth } from '../../config/api'; 
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import Table from '../../components/General/Table';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import Input from '../../components/General/Input';
import Modal from '../../components/General/Modal';
import CustomCombobox from '../../components/General/CustomCombobox';
import '../../styles/InventoryAdjustmentsPage.css';
import TableSkeleton from '../../components/General/TableSkeleton';



export default function InventoryAdjustmentsPage() {
  const { user } = useSession(); 
  const navigate = useNavigate();
  const { showConfirm } = useConfirm();
  const alert = useAlert();
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [closedInventories, setClosedInventories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showMovementsModal, setShowMovementsModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productMovements, setProductMovements] = useState([]);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  // Filtros para el modal de movimientos
  const [movementFilter, setMovementFilter] = useState({
    type: 'all',
    startDate: '',
    endDate: ''
  });

  // Filtros de fecha para el toolbar
  const [dateRange, setDateRange] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Estado del modal de ajuste
  const [adjustmentMode, setAdjustmentMode] = useState('inventory');
  const [selectedInventory, setSelectedInventory] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [isInventoryAdjusted, setIsInventoryAdjusted] = useState(false);

  // Formulario manual
  const [form, setForm] = useState({
    product_id: '',
    type: 'entrada',
    quantity: '',
    unit_cost: '',
    notes: '',
  });

  // ─── Opciones de período ───────────────────────────────────────────────────
  const dateOptions = useMemo(() => ([
    { value: 'all', label: 'Todo' },
    { value: 'day', label: 'Hoy' },
    { value: 'week', label: 'Esta semana' },
    { value: 'month', label: 'Este mes' },
    { value: 'quarter', label: 'Este trimestre' },
    { value: 'year', label: 'Este año' },
    { value: 'custom', label: 'Personalizado' }
  ]), []);

  // ─── Opciones para categorías ─────────────────────────────────────────────
  const categoryOptions = useMemo(() => [
    { value: '', label: 'Todas las categorías' },
    ...categories.map(cat => ({ value: String(cat.id), label: cat.name }))
  ], [categories]);

  // ─── Cargar datos ──────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [mv, closed, pr, cat] = await Promise.all([
        fetchWithAuth('/inventory/movements'), // ✅ SIN /api
        fetchWithAuth('/inventory/closed'), // ✅ SIN /api
        fetchWithAuth('/products'), // ✅ SIN /api
        fetchWithAuth('/categories'), // ✅ SIN /api
      ]);
      
      const [mvData, closedData, prData, catData] = await Promise.all([
        mv.json(),
        closed.json(),
        pr.json(),
        cat.json()
      ]);
      
      setMovements(Array.isArray(mvData) ? mvData : []);
      setClosedInventories(Array.isArray(closedData) ? closedData : []);
      setProducts(Array.isArray(prData) ? prData : []);
      setCategories(Array.isArray(catData) ? catData : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useRealtimeSync(['inventory', 'movements', 'products'], load);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // ─── Ver movimientos de un producto (Kardex) ────────────────────────────
  const viewProductMovements = (product) => {
    setSelectedProduct(product);
    const productMoves = movements.filter(m => m.product_id === product.id);
    setProductMovements(productMoves);
    setMovementFilter({ type: 'all', startDate: '', endDate: '' });
    setShowMovementsModal(true);
  };

  // ─── Filtrar movimientos del modal ──────────────────────────────────────
  const filteredProductMovements = useMemo(() => {
    let filtered = productMovements;

    if (movementFilter.type !== 'all') {
      filtered = filtered.filter(m => m.type === movementFilter.type);
    }

    if (movementFilter.startDate) {
      const start = new Date(movementFilter.startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter(m => {
        const date = new Date(m.created_at);
        date.setHours(0, 0, 0, 0);
        return date >= start;
      });
    }

    if (movementFilter.endDate) {
      const end = new Date(movementFilter.endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(m => {
        const date = new Date(m.created_at);
        return date <= end;
      });
    }

    return filtered;
  }, [productMovements, movementFilter]);

  // ─── Abrir modal de ajuste ──────────────────────────────────────────────
  const openModal = () => {
    setAdjustmentMode('inventory');
    setSelectedInventory(null);
    setSelectedItems([]);
    setInventoryItems([]);
    setIsInventoryAdjusted(false);
    setForm({ product_id: '', type: 'entrada', quantity: '', unit_cost: '', notes: '' });
    setError('');
    setShowModal(true);
  };

  // ─── Cargar items de un inventario seleccionado ──────────────────────
  const loadInventoryItems = async (inventoryId) => {
    try {
      const res = await fetchWithAuth(`/inventory/closed/${inventoryId}`); // ✅ SIN /api
      if (!res.ok) throw new Error('Error al cargar items');
      const data = await res.json();
      setInventoryItems(data.items || []);
      
      const items = data.items || [];
      const allAdjusted = items.every(item => item.status === 'adjusted');
      const hasDifferences = items.some(item => item.difference !== 0);
      const hasPending = items.some(item => item.difference !== 0 && item.status !== 'adjusted');
      
      setIsInventoryAdjusted(allAdjusted && hasDifferences);
      
      if (allAdjusted && hasDifferences) {
        alert.warning('Todos los productos de este inventario ya han sido ajustados.');
        setSelectedItems([]);
        return;
      }
      
      if (!hasDifferences) {
        alert.info('Este inventario no tiene diferencias para ajustar.');
        setSelectedItems([]);
        return;
      }
      
      const itemsWithDiff = items
        .filter(item => item.difference !== 0 && item.status !== 'adjusted')
        .map(item => item.product_id);
      setSelectedItems(itemsWithDiff);
      
    } catch (e) {
      alert.error(e.message);
    }
  };

  // ─── Aplicar ajustes de inventario ──────────────────────────────────────
  const applyInventoryAdjustments = async () => {
    if (!selectedInventory) {
      alert.warning('Selecciona un inventario');
      return;
    }

    if (selectedItems.length === 0) {
      alert.warning('No hay productos pendientes para ajustar');
      return;
    }

    const alreadyAdjusted = inventoryItems
      .filter(item => selectedItems.includes(item.product_id))
      .some(item => item.status === 'adjusted');

    if (alreadyAdjusted) {
      alert.warning('Algunos productos seleccionados ya han sido ajustados.');
      const availableItems = inventoryItems
        .filter(item => item.difference !== 0 && item.status !== 'adjusted')
        .map(item => item.product_id);
      setSelectedItems(availableItems);
      return;
    }

    const confirmed = await showConfirm({
      title: 'Aplicar ajustes de inventario',
      message: `¿Estás seguro de aplicar los ajustes de ${selectedItems.length} producto(s) del inventario #${String(selectedInventory).slice(0, 8)}? Esta acción no se puede deshacer.`,
      confirmText: 'Aplicar ajustes',
      cancelText: 'Cancelar',
      danger: true,
    });
    if (!confirmed) return;

    setSaving(true);
    try {
      const res = await fetchWithAuth(`/inventory/closed/${selectedInventory}/apply`, { // ✅ SIN /api
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_ids: selectedItems }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al aplicar ajustes');
      }

      const result = await res.json();
      
      let message = result.message || 'Ajustes aplicados correctamente';
      
      await alert.success(message, '✅ Ajuste aplicado');
      
      if (selectedInventory) {
        await loadInventoryItems(selectedInventory);
      }
      await load();
      
      if (result.remaining === 0) {
        setShowModal(false);
        setSelectedInventory(null);
        setSelectedItems([]);
        setInventoryItems([]);
        setIsInventoryAdjusted(false);
      }
      
    } catch (e) {
      alert.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Guardar ajuste manual ──────────────────────────────────────────────
  const handleManualSave = async () => {
    if (!form.product_id || !form.type || !form.quantity) {
      setError('❌ Producto, tipo y cantidad son requeridos');
      return;
    }

    setSaving(true);
    try {
      const res = await fetchWithAuth('/inventory/movements', { // ✅ SIN /api
        method: 'POST',
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Error al guardar');
      await load();
      setShowModal(false);
      setForm({ product_id: '', type: 'entrada', quantity: '', unit_cost: '', notes: '' });
      await alert.success('Ajuste manual registrado correctamente', '✅ Registrado');
    } catch (e) {
      alert.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Toggle selección de items ──────────────────────────────────────────
  const toggleItemSelection = (productId) => {
    setSelectedItems(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const selectAllItems = () => {
    const allIds = inventoryItems
      .filter(item => item.difference !== 0 && item.status !== 'adjusted')
      .map(item => item.product_id);
    setSelectedItems(allIds);
  };

  const deselectAllItems = () => {
    setSelectedItems([]);
  };

  // ─── Obtener último movimiento de un producto ──────────────────────────
  const getLastMovement = (productId) => {
    const productMoves = movements.filter(m => m.product_id === productId);
    if (productMoves.length === 0) return null;
    return productMoves.reduce((latest, current) => {
      return new Date(current.created_at) > new Date(latest.created_at) ? current : latest;
    });
  };

  // ─── Obtener nombre de categoría ──────────────────────────────────────
  const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.name : 'Sin categoría';
  };

  // ─── Limpiar filtros ──────────────────────────────────────────────────────
  const handleClearFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setDateRange('all');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  // ─── Columnas de la tabla de productos ──────────────────────────────────
  const productColumns = [
    {
      accessor: 'code',
      label: 'Cód. Barra',
      render: (item) => (
        <span>{item.barcode || '—'}</span>
      ),
    },
    {
      accessor: 'name',
      label: 'Descripción',
      render: (item) => (
        <div className="product-description">
          <div className="product-name">{item.name}</div>
        </div>
      ),
    },
    {
      accessor: 'category_id',
      label: 'Categoría',
      render: (item) => (
        <span>{getCategoryName(item.category_id)}</span>
      ),
    },
    {
      accessor: 'stock',
      label: 'Stock',
      align: 'center',
      render: (item) => (
        <span className={`product-stock ${item.stock <= item.min_stock ? 'low' : ''}`}>
          {item.stock || 0}
        </span>
      ),
    },
    {
      accessor: 'last_movement',
      label: 'Último movimiento',
      align: 'center',
      render: (item) => {
        const last = getLastMovement(item.id);
        if (!last) return <span className="product-no-movement">Sin movimientos</span>;
        return (
          <span className="product-last-movement">
            {new Date(last.created_at).toLocaleDateString('es-EC', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        );
      }
    },
    {
      accessor: 'actions',
      label: 'Acciones',
      align: 'center',
      render: (item) => {
        const count = movements.filter(m => m.product_id === item.id).length;
        return (
          <IconTextButton
            variant="info"
            size="sm"
            inline={true}
            icon={<FiEye size={14} />}
            onClick={() => viewProductMovements(item)}
            title={`Ver movimientos (${count})`}
          >
            Ver más
          </IconTextButton>
        );
      },
    },
  ];

  // ─── Columnas para el modal de movimientos (Kardex) ──────────────────────
  const movementColumns = [
    {
      accessor: 'created_at',
      label: 'Fecha',
      render: (item) => (
        <span className="movement-date">
          {item.created_at ? new Date(item.created_at).toLocaleString('es-EC', { 
            dateStyle: 'medium', 
            timeStyle: 'short' 
          }) : '—'}
        </span>
      )
    },
    {
      accessor: 'type',
      label: 'Tipo',
      render: (item) => {
        const config = {
          entrada: { label: 'Entrada', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
          salida: { label: 'Salida', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
          adjustment: { label: 'Ajuste', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
          venta: { label: 'Venta', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
        };
        const cfg = config[item.type] || config.entrada;
        return (
          <span className="movement-type-badge" style={{ background: cfg.bg, color: cfg.color }}>
            {cfg.label}
          </span>
        );
      }
    },
    {
      accessor: 'quantity',
      label: 'Cantidad',
      render: (item) => {
        let sign = '±';
        let quantity = item.quantity;
        let color = '#f59e0b';
        
        if (item.type === 'adjustment') {
          if (item.notes) {
            const match = item.notes.match(/\(([+-])(\d+)\)/);
            if (match) {
              sign = match[1];
              quantity = match[2];
              color = sign === '+' ? '#22c55e' : sign === '-' ? '#ef4444' : '#f59e0b';
            }
          }
        } else if (item.type === 'entrada') {
          sign = '+';
          color = '#22c55e';
        } else if (item.type === 'salida' || item.type === 'venta') {
          sign = '−';
          color = '#ef4444';
        }
        
        return (
          <span className="movement-quantity" style={{ color }}>
            {sign}{Math.abs(quantity)}
          </span>
        );
      }
    },
    {
      accessor: 'unit_cost',
      label: 'Costo unit.',
      render: (item) => (
        <span className="movement-cost">
          {item.unit_cost ? `$${Number(item.unit_cost).toFixed(2)}` : '—'}
        </span>
      )
    },
    {
      accessor: 'notes',
      label: 'Notas',
      render: (item) => (
        <span className="movement-notes" title={item.notes}>
          {item.notes || '—'}
        </span>
      )
    },
  ];

  // ─── Opciones para combobox ────────────────────────────────────────────
  const productOptions = products.map(p => ({
    label: `${p.name}${p.code ? ` (${p.code})` : ''} — stock: ${p.stock || 0}`,
    value: p.id,
  }));

  const typeOptions = [
    { label: 'Entrada (+stock)', value: 'entrada' },
    { label: 'Salida (−stock)', value: 'salida' },
  ];

  const movementTypeOptions = [
    { label: 'Todos los tipos', value: 'all' },
    { label: 'Entrada', value: 'entrada' },
    { label: 'Salida', value: 'salida' },
    { label: 'Venta', value: 'venta' },
    { label: 'Ajuste', value: 'adjustment' },
  ];

  const inventoryOptions = useMemo(() => {
    return closedInventories
      .filter(inv => {
        const items = inv.items || [];
        const hasPending = items.some(item => item.difference !== 0 && item.status !== 'adjusted');
        return hasPending;
      })
      .map(inv => {
        const items = inv.items || [];
        const pendingCount = items.filter(item => item.difference !== 0 && item.status !== 'adjusted').length;
        const totalDiff = items.filter(item => item.difference !== 0).length;
        
        return {
          label: `Inventario #${String(inv.id).slice(0, 8)} - ${inv.closed_date ? new Date(inv.closed_date).toLocaleDateString() : '—'} (${pendingCount} pendientes de ${totalDiff})`,
          value: String(inv.id),
        };
      });
  }, [closedInventories]);

  // ─── Toolbar ─────────────────────────────────────────────────────────────
  const toolbar = (
    <div className="products-toolbar">
      <div className="products-toolbar-right">
        {/* Selector de fecha */}
        <div className="report-dropdown">
          <button onClick={() => setShowDateDropdown(!showDateDropdown)} className="report-date-btn">
            <FiCalendar size={16} />
            {dateOptions.find(o => o.value === dateRange)?.label || 'Todo'}
            <FiChevronDown size={14} />
          </button>
          {showDateDropdown && (
            <div className="report-dropdown-menu">
              {dateOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => {
                    setDateRange(option.value);
                    setShowDateDropdown(false);
                  }}
                  className={dateRange === option.value ? 'active' : ''}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filtro de categorías con CustomCombobox */}
        <div className="products-filter-group">
          <CustomCombobox
            options={categoryOptions}
            value={selectedCategory || ''}
            onChange={setSelectedCategory}
            placeholder="Todas las categorías"
            filterable={true}
            size="md"
          />
        </div>

        {/* Botón limpiar */}
        <IconTextButton
          variant=""
          size="md"
          icon={<FiX size={14} />}
          onClick={handleClearFilters}
        >
          Limpiar
        </IconTextButton>

        {/* Botón Nuevo ajuste */}
        <ButtonGroup>
          <IconTextButton
            variant="success"
            size="md"
            icon={<FiPlus size={13} />}
            onClick={openModal}
            disabled={saving}
            loading={saving}
          >
            Nuevo ajuste
          </IconTextButton>
        </ButtonGroup>
      </div>
    </div>
  );

  // ─── Botón de refrescar ──────────────────────────────────────────────────
  const refreshButton = (
    <button
      onClick={handleRefresh}
      className="dashboard-refresh-btn-header"
      disabled={refreshing}
      title="Actualizar datos"
    >
      <FiRefreshCwIcon size={18} className={refreshing ? 'spinning' : ''} />
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  // ─── Filtrar productos ──────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    let result = products;
    
    if (search) {
      const term = search.toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(term) ||
        p.code?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
      );
    }
    
    if (selectedCategory) {
      result = result.filter(p => String(p.category_id) === selectedCategory);
    }
    
    return result;
  }, [products, search, selectedCategory]);

  // ─── Estadísticas ──────────────────────────────────────────────────────
  const stats = [
    { label: 'Total productos', value: products.length, color: '#ff8c42' },
    { label: 'Con movimientos', value: products.filter(p => movements.some(m => m.product_id === p.id)).length, color: '#3b82f6' },
    { label: 'Sin movimientos', value: products.filter(p => !movements.some(m => m.product_id === p.id)).length, color: '#9ca3af' },
    { label: 'Stock bajo', value: products.filter(p => p.stock <= p.min_stock).length, color: '#ef4444' },
  ];

  // ─── Modal Footer ──────────────────────────────────────────────────────
  const modalFooter = (
    <>
      {error && <div className="modal-error-text">⚠️ {error}</div>}
      <ButtonGroup>
        <IconTextButton
          variant=""
          size="md"
          icon={<FiX size={14} />}
          onClick={() => {
            setShowModal(false);
            setSelectedInventory(null);
            setSelectedItems([]);
            setInventoryItems([]);
            setIsInventoryAdjusted(false);
            setError('');
          }}
          disabled={saving}
        >
          Cancelar
        </IconTextButton>
        {adjustmentMode === 'inventory' ? (
          <IconTextButton
            variant="success"
            size="md"
            icon={<FiCheck size={14} />}
            onClick={applyInventoryAdjustments}
            disabled={saving || !selectedInventory || selectedItems.length === 0 || isInventoryAdjusted}
            loading={saving}
          >
            Aplicar ({selectedItems.length})
          </IconTextButton>
        ) : (
          <IconTextButton
            variant="success"
            size="md"
            icon={<FiPlus size={14} />}
            onClick={handleManualSave}
            disabled={saving || !form.product_id || !form.type || !form.quantity}
            loading={saving}
          >
            Guardar
          </IconTextButton>
        )}
      </ButtonGroup>
    </>
  );
  

  const [itemsPerPage, setItemsPerPage] = useState(10);

  if (loading) {
    return (
      <PageTemplate
        title="Ajustes de Inventario"
        subtitle="Kardex de productos y ajustes de stock"
        loading={false}
        error={error}
        onRetry={handleRefresh}
        theme="business"
        headerAction={refreshButton}
      >
        <TableSkeleton 
          rows={5}
          columns={6}
          title="Kardex de Productos"
          subtitle="Cargando productos..."
          columnWidths={['1.2fr', '2.2fr', '1.2fr', '0.8fr', '1.5fr', '0.8fr']}
          toolbarWidth={160}
          showSearch={true}
        />
      </PageTemplate>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <PageTemplate
      title="Ajustes de Inventario"
      subtitle="Kardex de productos y ajustes de stock"
      loading={loading}
      error={error}
      onRetry={handleRefresh}
      theme="business"
      headerAction={refreshButton}
    >
      <div className="adjustments-page">
        {/* Stats */}
        <div className="adjustments-stats">
          {stats.map(s => (
            <div key={s.label} className="adjustments-stat">
              <div className="adjustments-stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="adjustments-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabla Kardex de productos */}
        <Table
          data={filteredProducts}
          columns={productColumns}
          keyField="id"
          title="Kardex de Productos"
          subtitle={`${filteredProducts.length} ${filteredProducts.length === 1 ? 'producto' : 'productos'}`}
          toolbar={toolbar}
          searchable={true}
          searchPlaceholder='Ej: Producto A'
          pagination={true}
          itemsPerPage={itemsPerPage}
          itemsPerPageOptions={[10, 15]}
          onItemsPerPageChange={(newPerPage) => setItemsPerPage(newPerPage)}
          loading={loading}
          emptyMessage={
            search || selectedCategory || dateRange !== 'all'
              ? 'No hay productos que coincidan con los filtros'
              : 'No hay productos registrados'
          }
          striped={true}
          hoverable={true}
          bordered={false}
          compact={false}
        />

        {/* Modal de movimientos del producto (Kardex) */}
        <Modal
          closeOnOverlayClick={false}
          isOpen={showMovementsModal}
          onClose={() => {
          setShowMovementsModal(false);
          setSelectedProduct(null);
          setProductMovements([]);
          setMovementFilter({ type: 'all', startDate: '', endDate: '' });
          }}
          title={`Kardex - ${selectedProduct?.name || ''}`}
          size="xl"
          className="movements-modal"
        >
          <div className="movements-modal-body">
            {/* Información del producto */}
            <div className="movements-product-info">
              <div className="movements-product-detail">
                <span className="movements-product-label">Cód. barra:</span>
                <span className="movements-product-value">{selectedProduct?.barcode || '—'}</span>
              </div>
              <div className="movements-product-detail">
                <span className="movements-product-label">Categoría:</span>
                <span className="movements-product-value">{getCategoryName(selectedProduct?.category_id)}</span>
              </div>
              <div className="movements-product-detail">
                <span className="movements-product-label">Stock actual:</span>
                <span className="movements-product-value movements-product-stock">{selectedProduct?.stock || 0}</span>
              </div>
              <div className="movements-product-detail">
                <span className="movements-product-label">Total movimientos:</span>
                <span className="movements-product-value">{filteredProductMovements.length}</span>
              </div>
            </div>

            {/* Filtros del modal */}
            <div className="movements-filters">
              {/* Combobox para tipo de movimiento */}
              <div className="movements-filter-group">
                <FiFilter size={14} className="movements-filter-icon" />
                <CustomCombobox
                  options={movementTypeOptions}
                  value={movementFilter.type}
                  onChange={(value) => setMovementFilter(f => ({ ...f, type: value }))}
                  placeholder="Todos los tipos"
                  dropup={true}
                  filterable={false}
                  size="sm"
                />
              </div>

              {/* Selector de fecha con dropdown (igual que en el toolbar) */}
              <div className="report-dropdown">
                <button 
                  onClick={() => setShowDateDropdown(!showDateDropdown)} 
                  className="report-date-btn"
                >
                  <FiCalendar size={14} />
                  {movementFilter.dateRange === 'custom' 
                    ? 'Personalizado' 
                    : dateOptions.find(o => o.value === movementFilter.dateRange)?.label || 'Todo'}
                  <FiChevronDown size={12} />
                </button>
                {showDateDropdown && (
                  <div className="report-dropdown-menu">
                    {dateOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => {
                          if (option.value === 'custom') {
                            setMovementFilter(f => ({ 
                              ...f, 
                              dateRange: 'custom',
                              startDate: '',
                              endDate: ''
                            }));
                          } else {
                            setMovementFilter(f => ({ 
                              ...f, 
                              dateRange: option.value,
                              startDate: '',
                              endDate: ''
                            }));
                          }
                          setShowDateDropdown(false);
                        }}
                        className={movementFilter.dateRange === option.value ? 'active' : ''}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Fechas personalizadas (se muestran cuando se selecciona "Personalizado") */}
              {movementFilter.dateRange === 'custom' && (
                <div className="movements-filter-group">
                  <FiCalendar size={14} className="movements-filter-icon" />
                  <input
                    type="date"
                    value={movementFilter.startDate}
                    onChange={(e) => setMovementFilter(f => ({ ...f, startDate: e.target.value }))}
                    className="movements-filter-date"
                    placeholder="Desde"
                  />
                  <span className="movements-filter-separator">—</span>
                  <input
                    type="date"
                    value={movementFilter.endDate}
                    onChange={(e) => setMovementFilter(f => ({ ...f, endDate: e.target.value }))}
                    className="movements-filter-date"
                    placeholder="Hasta"
                  />
                </div>
              )}

              {/* Botón limpiar filtros */}
              {(movementFilter.type !== 'all' || movementFilter.dateRange !== 'all' || movementFilter.startDate || movementFilter.endDate) && (
                <button
                  className="movements-filter-clear"
                  onClick={() => setMovementFilter({ type: 'all', dateRange: 'all', startDate: '', endDate: '' })}
                >
                  <FiX size={14} /> Limpiar filtros
                </button>
              )}
            </div>

            {/* ✅ Tabla de movimientos con componente Table */}
            <Table
              data={filteredProductMovements}
              columns={movementColumns}
              keyField="id"
              pagination={true}
              itemsPerPage={itemsPerPage}
              itemsPerPageOptions={[10, 15]}
              onItemsPerPageChange={(newPerPage) => setItemsPerPage(newPerPage)}
              striped={true}
              hoverable={true}
              bordered={false}
              compact={false}
              emptyMessage="No hay movimientos que coincidan con los filtros"
            />
          </div>
        </Modal>

        {/* Modal de ajustes */}
        <Modal
          closeOnOverlayClick={false}
          isOpen={showModal}
          onClose={() => {
          setShowModal(false);
          setSelectedInventory(null);
          setSelectedItems([]);
          setInventoryItems([]);
          setIsInventoryAdjusted(false);
          setError('');
          }}
          title="Nuevo ajuste de inventario"
          size="md"
          className="adjustments-modal"
          footer={modalFooter}
        >
          <div className="adjustments-modal-body">
            {/* Selector de modo */}
            <div className="adjustments-mode-selector">
              <button
                className={`adjustments-mode-btn ${adjustmentMode === 'inventory' ? 'active' : ''}`}
                onClick={() => {
                  setAdjustmentMode('inventory');
                  setSelectedInventory(null);
                  setInventoryItems([]);
                  setSelectedItems([]);
                  setIsInventoryAdjusted(false);
                  setError('');
                }}
              >
                <FiPackage size={14} /> Desde inventario cerrado
              </button>
              <button
                className={`adjustments-mode-btn ${adjustmentMode === 'manual' ? 'active' : ''}`}
                onClick={() => {
                  setAdjustmentMode('manual');
                  setSelectedInventory(null);
                  setInventoryItems([]);
                  setSelectedItems([]);
                  setIsInventoryAdjusted(false);
                  setError('');
                }}
              >
                <FiPlus size={14} /> Ajuste manual
              </button>
            </div>

            {adjustmentMode === 'inventory' ? (
              <div className="adjustments-inventory-mode">
                <div className="adjustments-form-group">
                  <label>Seleccionar inventario *</label>
                  <CustomCombobox
                    options={inventoryOptions}
                    value={selectedInventory ? String(selectedInventory) : ''}
                    onChange={(value) => {
                      setSelectedInventory(value);
                      if (value) {
                        loadInventoryItems(value);
                      } else {
                        setInventoryItems([]);
                        setSelectedItems([]);
                        setIsInventoryAdjusted(false);
                      }
                    }}
                    placeholder="Seleccionar inventario cerrado..."
                    filterable={true}
                    size="md"
                    forceDropup={false} 
                  />
                </div>

                {inventoryItems.length > 0 && (
                  <>
                    <div className="adjustments-items-actions">
                      <span className="adjustments-items-count">
                        {inventoryItems.filter(i => i.difference !== 0 && i.status !== 'adjusted').length} producto(s) pendientes
                      </span>
                      {isInventoryAdjusted && (
                        <span className="adjustments-already-adjusted-badge">
                          ✅ Todos ajustados
                        </span>
                      )}
                      <div className="adjustments-items-buttons">
                        <button className="adjustments-items-select-all" onClick={selectAllItems}>
                          Seleccionar todos
                        </button>
                        <button className="adjustments-items-deselect-all" onClick={deselectAllItems}>
                          Deseleccionar
                        </button>
                      </div>
                    </div>

                    <div className="adjustments-items-list">
                      {inventoryItems
                        .filter(item => item.difference !== 0)
                        .map(item => {
                          const isAdjusted = item.status === 'adjusted';
                          const isSelected = selectedItems.includes(item.product_id);
                          return (
                            <label 
                              key={item.id} 
                              className={`adjustments-item ${isAdjusted ? 'adjusted' : ''}`}
                              style={{ 
                                opacity: isAdjusted ? 0.5 : 1,
                                cursor: isAdjusted ? 'not-allowed' : 'pointer'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  if (!isAdjusted) {
                                    toggleItemSelection(item.product_id);
                                  }
                                }}
                                disabled={isAdjusted}
                              />
                              <span className="adjustments-item-name">{item.product_name}</span>
                              <span className="adjustments-item-stock">
                                {item.system_stock} → {item.counted_stock}
                              </span>
                              <span className={`adjustments-item-diff ${item.difference > 0 ? 'positive' : 'negative'}`}>
                                {item.difference > 0 ? '+' : ''}{item.difference}
                              </span>
                              {isAdjusted && (
                                <span className="adjustments-item-badge">✅ Ajustado</span>
                              )}
                            </label>
                          );
                        })}
                    </div>
                  </>
                )}

                {selectedInventory && inventoryItems.length === 0 && (
                  <div className="adjustments-no-items">
                    No hay productos con diferencias en este inventario.
                  </div>
                )}
              </div>
            ) : (
              <div className="adjustments-manual-mode">
                <div className="adjustments-form-group">
                  <label>Producto *</label>
                  <CustomCombobox
                    options={productOptions}
                    value={form.product_id}
                    onChange={(value) => setForm(f => ({ ...f, product_id: value }))}
                    placeholder="Seleccionar producto..."
                    filterable={true}
                    size="md"
                    forceDropup={false}
                  />
                </div>

                <div className="adjustments-form-row">
                  <div className="adjustments-form-group">
                    <label>Tipo *</label>
                    <CustomCombobox
                      options={typeOptions}
                      value={form.type}
                      onChange={(value) => setForm(f => ({ ...f, type: value }))}
                      placeholder="Seleccionar tipo..."
                      filterable={false}
                      size="md"
                      forceDropup={false}
                    />
                  </div>
                  <div className="adjustments-form-group">
                    <label>Cantidad *</label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={form.quantity}
                      onChange={(value) => setForm(f => ({ ...f, quantity: value }))}
                      placeholder="0"
                      size="md"
                    />
                  </div>
                </div>

                <div className="adjustments-form-group">
                  <label>Costo unitario (opcional)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.unit_cost}
                    onChange={(value) => setForm(f => ({ ...f, unit_cost: value }))}
                    placeholder="0.00"
                    size="md"
                  />
                </div>

                <div className="adjustments-form-group">
                  <label>Notas / Motivo</label>
                  <Input
                    type="textarea"
                    value={form.notes}
                    onChange={(value) => setForm(f => ({ ...f, notes: value }))}
                    placeholder="Ej: Recepción de proveedor, consumo interno, merma..."
                    size="md"
                    rows={2}
                  />
                </div>

                <div className="adjustments-form-info">
                  <span className="adjustments-form-info-icon">ℹ️</span>
                  <span className="adjustments-form-info-text">
                    Este ajuste modificará el stock del producto seleccionado.
                    {form.type === 'entrada' ? ' Aumentará el stock.' : ' Disminuirá el stock.'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Modal>
      </div>
    </PageTemplate>
  );
}