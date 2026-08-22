import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { usePermissions } from '../../utils/usePermissions';

import {
  Plus,
  ArrowLeft,
  Check,
  AlertCircle,
  RotateCcw
} from 'react-feather';

import {
  FiCheckCircle, 
  FiX, 
  FiBox, 
  FiEye, 
  FiRefreshCw as FiRefreshCwIcon, 
  FiCalendar, 
  FiFileText,  
  FiUser
} from 'react-icons/fi';
import { fetchWithAuth } from '../../config/api'; 
import { useConfirm } from '../../context/ConfirmContext';
import { useAlert } from '../../components/ConfirmContext';
import PageTemplate from '../../components/PageTemplate';
import Table from '../../components/General/Table';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import Modal from '../../components/General/Modal';
import Input from '../../components/General/Input';
import Checklist from '../../components/General/Checklist';
import CustomCombobox from '../../components/General/CustomCombobox';

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

export default function InventoryPhysicalPage() {
  const { user } = useSession();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const { showConfirm } = useConfirm();
  const alert = useAlert();

  const [inventories, setInventories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [active, setActive] = useState(null);
  const [items, setItems] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchItem, setSearchItem] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  
  // Filtros de fecha
  const [dateRange, setDateRange] = useState('all');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);
  
  // Modal de detalle de inventario
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailInventory, setDetailInventory] = useState(null);
  const [detailItems, setDetailItems] = useState([]);
  
  // Reconteo
  const [showRecountModal, setShowRecountModal] = useState(false);
  const [recountReason, setRecountReason] = useState('');
  const [recountSaving, setRecountSaving] = useState(false);
  
  // Formulario de creación
  const [inventoryName, setInventoryName] = useState('');

  // ── Opciones de fecha ──────────────────────────────────────────────
  const dateOptions = useMemo(() => ([
    { value: 'all', label: 'Todo' },
    { value: 'today', label: 'Hoy' },
    { value: 'week', label: 'Esta semana' },
    { value: 'month', label: 'Este mes' },
    { value: 'custom', label: 'Personalizado' }
  ]), []);

  // ── Obtener usuario actual ──────────────────────────────────────────────
  useEffect(() => {
    const getUser = async () => {
      try {
        const res = await fetchWithAuth('/auth/me');
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data);
          setIsOwner(data?.role === 'owner' || data?.isOwner === true);
        }
      } catch (e) {
        console.error('Error obteniendo usuario:', e);
      }
    };
    getUser();
  }, []);

  // ── Carga inicial ──────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [invRes, catRes] = await Promise.all([
        fetchWithAuth('/inventory/physical'),
        fetchWithAuth('/categories'),
      ]);
      if (!invRes.ok) throw new Error(`HTTP ${invRes.status}`);
      const [inv, cat] = await Promise.all([invRes.json(), catRes.json()]);
      setInventories(Array.isArray(inv) ? inv : []);
      setCategories(Array.isArray(cat) ? cat : []);
    } catch (err) {
      setError('Error cargando inventarios');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // ── Crear inventario ──────────────────────────────────────────────
  const createInventory = async () => {
    if (!selectedCategories.length) {
      alert.warning('Selecciona al menos una categoría');
      return;
    }
    try {
      const payload = {
        categories: selectedCategories,
        name: inventoryName || `Inventario ${new Date().toLocaleDateString()}`
      };
      
      const res = await fetchWithAuth('/inventory/physical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al crear');
      }
      setModalOpen(false);
      setSelectedCategories([]);
      setInventoryName('');
      await alert.success(
        `Inventario creado correctamente`,
        'Creación de Inventario Exitosa'
      );
      loadData();
    } catch (e) {
      alert.error(e.message);
    }
  };

  // ── Abrir inventario ──────────────────────────────────────────────
  const openInventory = async (inv) => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/inventory/physical/${inv.id}`);
      if (!res.ok) throw new Error('Error al abrir inventario');
      const data = await res.json();
      setActive(inv);
      setItems(data.items || []);
      setSearchItem('');
      setSelectedCategoryFilter('');
    } catch (e) {
      alert.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Ver detalle de inventario (modal) ────────────────────────────
  const viewDetailInventory = async (inv) => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(`/inventory/physical/${inv.id}`);
      if (!res.ok) throw new Error('Error al cargar detalle');
      const data = await res.json();
      setDetailInventory(data.inventory || inv);
      setDetailItems(data.items || []);
      setShowDetailModal(true);
    } catch (e) {
      alert.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Abrir modal de reconteo ──────────────────────────────────────
  const handleOpenRecount = () => {
    setRecountReason('');
    setShowRecountModal(true);
  };

  // ── Guardar reconteo y reabrir inventario ──────────────────────────
  const handleSaveRecount = async () => {
    if (!recountReason.trim()) {
      alert.warning('Debes escribir el motivo del reconteo');
      return;
    }

    setRecountSaving(true);
    try {
      const res = await fetchWithAuth(`/inventory/physical/${detailInventory.id}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: recountReason }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al reabrir inventario');
      }

      const data = await res.json();
      
      setShowRecountModal(false);
      setShowDetailModal(false);
      setRecountReason('');
      
      await loadData();
      
      // Abrir el inventario reabierto
      const updatedInv = inventories.find(i => i.id === detailInventory.id);
      if (updatedInv) {
        await openInventory(updatedInv);
      }
      
      await alert.success(
        `Inventario reabierto para reconteo. Motivo: ${recountReason}`,
        'Reapertura de Inventario Exitosa'
      );
    } catch (e) {
      alert.error(e.message || 'Error al iniciar reconteo');
    } finally {
      setRecountSaving(false);
    }
  };

  // ── Ver inventario cerrado (solo owner) ────────────────────────
  const viewClosedInventory = (inv) => {
    navigate(`/business/inventory/physical/${inv.id}/view`);
  };

  // ── Actualizar conteo ─────────────────────────────────────────────
  const updateItem = async (id, value) => {
    if (value < 0) return;
    try {
      const res = await fetchWithAuth(`/inventory/physical/${active.id}/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counted_stock: value }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al actualizar');
      }
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                counted_stock: value,
                difference: value - i.system_stock,
                status: 'counted',
              }
            : i
        )
      );
    } catch (e) {
      alert.error(e.message);
    }
  };

  // ── Cerrar inventario ─────────────────────────────────────────────
  const closeInventory = async () => {
    if (items.some((i) => i.status === 'pending')) {
      alert.warning('Debes completar todos los productos antes de cerrar');
      return;
    }

    const confirmed = await showConfirm({
      title: 'Cerrar inventario',
      message: '¿Estás seguro de cerrar este inventario? Esta acción no se puede deshacer.',
      confirmText: 'Cerrar',
      cancelText: 'Cancelar',
      danger: false,
    });
    if (!confirmed) return;

    setSaving(true);
    try {
      const res = await fetchWithAuth(`/inventory/physical/${active.id}/close`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Business-Id': localStorage.getItem('businessId') || ''
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al cerrar inventario');
      }

      const result = await res.json();
      
      await alert.success(
        result.message || 'Inventario guardado correctamente.',
        'Inventario Guardado'
      );
      
      setActive(null);
      loadData();
    } catch (e) {
      alert.error(e.message || 'Error al cerrar inventario');
    } finally {
      setSaving(false);
    }
  };

  // ── Función para formatear fecha+hora de cierre ──
  const formatClosedDateTime = useCallback((inventory) => {
    if (inventory?.status !== 'closed') return '—';
    if (!inventory?.closed_date || !inventory?.closed_time) return '—';

    try {
      let year, month, day, hours, minutes, seconds;

      // Extraer fecha (maneja Date o string)
      if (inventory.closed_date instanceof Date) {
        year = inventory.closed_date.getFullYear();
        month = inventory.closed_date.getMonth() + 1;
        day = inventory.closed_date.getDate();
      } else {
        const dateStr = String(inventory.closed_date).split('T')[0];
        const [y, m, d] = dateStr.split('-').map(Number);
        year = y;
        month = m;
        day = d;
      }

      // Extraer hora (maneja Date o string)
      if (inventory.closed_time instanceof Date) {
        hours = inventory.closed_time.getHours();
        minutes = inventory.closed_time.getMinutes();
        seconds = inventory.closed_time.getSeconds();
      } else {
        const timeStr = String(inventory.closed_time).split('.')[0];
        const [h, m, s] = timeStr.split(':').map(Number);
        hours = h;
        minutes = m;
        seconds = s || 0;
      }

      const dateObj = new Date(year, month - 1, day, hours, minutes, seconds);
      if (!isNaN(dateObj)) {
        return dateObj.toLocaleString();
      }
      // fallback seguro
      return `${String(inventory.closed_date)} ${String(inventory.closed_time)}`;
    } catch {
      return '—';
    }
  }, []);

  // ── Calcular progreso ─────────────────────────────────────────────
  const pending = items.filter((i) => i.status === 'pending').length;
  const counted = items.filter((i) => i.status === 'counted').length;
  const progress = items.length ? Math.round((counted / items.length) * 100) : 0;

  // ── Filtrar items ──────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    let result = items;
    
    if (searchItem) {
      const term = searchItem.toLowerCase();
      result = result.filter(i =>
        i.product_name?.toLowerCase().includes(term) ||
        i.product_code?.toLowerCase().includes(term) ||
        i.product_barcode?.toLowerCase().includes(term)
      );
    }
    
    if (selectedCategoryFilter) {
      result = result.filter(i => String(i.category_id) === selectedCategoryFilter);
    }
    
    return result;
  }, [items, searchItem, selectedCategoryFilter]);

  // ── Filtrar inventarios por fecha ──────────────────────────────────
  const filteredInventories = useMemo(() => {
    let result = inventories;
    
    if (dateRange === 'today') {
      const today = new Date().toISOString().split('T')[0];
      result = result.filter(inv => 
        inv.created_at?.split('T')[0] === today
      );
    } else if (dateRange === 'week') {
      const now = new Date();
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];
      result = result.filter(inv => 
        inv.created_at?.split('T')[0] >= weekAgoStr
      );
    } else if (dateRange === 'month') {
      const now = new Date();
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const monthAgoStr = monthAgo.toISOString().split('T')[0];
      result = result.filter(inv => 
        inv.created_at?.split('T')[0] >= monthAgoStr
      );
    } else if (dateRange === 'custom' && customStartDate && customEndDate) {
      result = result.filter(inv => 
        inv.created_at?.split('T')[0] >= customStartDate &&
        inv.created_at?.split('T')[0] <= customEndDate
      );
    }
    
    return result;
  }, [inventories, dateRange, customStartDate, customEndDate]);

  // ── Opciones para categorías ──────────────────────────────────────
  const categoryFilterOptions = useMemo(() => {
    const uniqueCategories = new Map();
    items.forEach(item => {
      if (item.category_id && !uniqueCategories.has(String(item.category_id))) {
        uniqueCategories.set(String(item.category_id), {
          value: String(item.category_id),
          label: item.category_name || 'Sin categoría'
        });
      }
    });
    return [
      { value: '', label: 'Todas las categorías' },
      ...Array.from(uniqueCategories.values())
    ];
  }, [items]);

  // ── Columnas para la tabla de inventarios ──────────────────────
  const inventoryColumns = [
    {
      accessor: 'name',
      label: 'Descripción',
      render: (item) => (
        <span>{item.name || `Inventario #${String(item.id).slice(0, 8)}`}</span>
      ),
    },
    {
      accessor: 'status',
      label: 'Estado',
      render: (item) => {
        const isOpen = item.status === 'open';
        return (
          <span className={`inventory-status-badge ${isOpen ? 'open' : 'closed'}`}>
            {isOpen ? 'Abierto' : 'Cerrado'}
          </span>
        );
      },
    },
    {
      accessor: 'created_by_name',
      label: 'Creado por',
      render: (item) => (
        <span>{item.created_by_name || '—'}</span>
      ),
    },
    {
      accessor: 'created_at',
      label: 'Fecha Creación',
      render: (item) => (
        <span>{new Date(item.created_at).toLocaleString()}</span>
      ),
    },
    {
      accessor: 'closed_by_name',
      label: 'Finalizado por',
      render: (item) => {
        if (item.status === 'open') return <span className="inventory-no-action">—</span>;
        return <span>{item.closed_by_name || '—'}</span>;
      },
    },
    {
      accessor: 'closed_date',
      label: 'Fecha Finalización',
      render: (item) => <span>{formatClosedDateTime(item)}</span>,
    },
    {
      accessor: 'total_items',
      label: 'Productos',
      align: 'center',
      render: (item) => (
        <span>
          {item.counted_items || 0}/{item.total_items || 0}
        </span>
      ),
    },
    {
      accessor: 'actions',
      label: 'Acciones',
      align: 'center',
      render: (item) => {
        return (
          <div className="inventory-actions-cell">
            {can('viewInventoryDetail') && (   // solo el botón de detalle a admin
              <IconTextButton
                variant="info"
                size="sm"
                inline={true}
                icon={<FiEye size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  viewDetailInventory(item);
                }}
                title="Ver detalle"
              >
                Ver
              </IconTextButton>
            )}
            {item.status === 'open' && (
              <IconTextButton
                variant="purple"
                size="sm"
                inline={true}
                icon={<FiBox size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  openInventory(item);
                }}
                title="Abrir inventario"
              >
                Abrir
              </IconTextButton>
            )}
          </div>
        );
      },
    },
  ];

  // ── Columnas para el modal de detalle ────────────────────────────
  const detailColumns = [
    {
      accessor: 'product_code',
      label: 'Código',
      render: (item) => <span>{item.product_code || '—'}</span>,
    },
    {
      accessor: 'product_name',
      label: 'Producto',
      render: (item) => <span>{item.product_name}</span>,
    },
    {
      accessor: 'system_stock',
      label: 'Stock Sistema',
      align: 'center',
      render: (item) => <span>{item.system_stock}</span>,
    },
    {
      accessor: 'counted_stock',
      label: 'Stock Contado',
      align: 'center',
      render: (item) => (
        <span>{item.counted_stock || 0}</span>
      ),
    },
    {
      accessor: 'difference',
      label: 'Diferencia',
      align: 'center',
      render: (item) => {
        const diff = item.difference || 0;
        const className = diff > 0 ? 'diff-positive' : diff < 0 ? 'diff-negative' : 'diff-zero';
        return <span className={className}>{diff > 0 ? `+${diff}` : diff}</span>;
      },
    },
    {
      accessor: 'status',
      label: 'Estado',
      align: 'center',
      render: (item) => (
        <span className={`item-status-badge item-status-${item.status}`}>
          {item.status === 'counted' ? 'Contado' : 'Pendiente'}
        </span>
      ),
    },
  ];

  // ── Columnas para la tabla de conteo ────────────────────────────
  const itemsColumns = [
    {
      accessor: 'code',
      label: 'Código',
      render: (item) => (
        <span>{item.product_code || '—'}</span>
      ),
    },
    {
      accessor: 'barcode',
      label: 'Código Barras',
      render: (item) => (
        <span>{item.product_barcode || '—'}</span>
      ),
    },
    {
      accessor: 'name',
      label: 'Producto',
      render: (item) => (
        <div className="product-cell">
          <div className="product-info">
            <span>{item.product_name}</span>
          </div>
        </div>
      ),
    },
    {
      accessor: 'description',
      label: 'Descripción',
      render: (item) => (
        <span>{item.product_description || '—'}</span>
      ),
    },
    {
      accessor: 'category_name',
      label: 'Categoría',
      render: (item) => (
        <span>{item.category_name || 'Sin categoría'}</span>
      ),
    },
    {
      accessor: 'counted_stock',
      label: 'Cantidad contada',
      align: 'center',
      render: (item) => (
        <Input
          min="0"
          value={item.counted_stock ?? ''}
          onChange={(val) => updateItem(item.id, Number(val))}
          placeholder="0"
          size="sm"
        />
      ),
    },
    {
      accessor: 'status',
      label: 'Estado',
      align: 'center',
      render: (item) => (
        <span className={`item-status-badge item-status-${item.status}`}>
          {item.status === 'counted' ? 'Contado' : 'Pendiente'}
        </span>
      ),
    },
  ];

  // ── Limpiar filtros ──────────────────────────────────────────────────
  const clearFilters = () => {
    setSearchItem('');
    setSelectedCategoryFilter('');
    setDateRange('all');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  // ── Manejar cambio de rango de fecha ──────────────────────────────
  const handleDateRangeChange = (value) => {
    setDateRange(value);
    setShowDateDropdown(false);
    if (value === 'custom') {
      setShowCustomDate(true);
    } else {
      setShowCustomDate(false);
      setCustomStartDate('');
      setCustomEndDate('');
    }
  };

  const handleApplyCustomDate = (start, end) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
    setShowCustomDate(false);
    setShowDateDropdown(false);
  };

  // ── Toolbar de la tabla de inventarios ──────────────────────────
  const inventoryToolbar = (
    <div className="users-toolbar">
      <ButtonGroup>
        <div className="report-dropdown">
          <CustomCombobox
            options={dateOptions}
            value={dateRange}
            onChange={handleDateRangeChange}
            placeholder="Seleccionar período"
            filterable={false}
            size="md"
            className="date-filter-combobox"
            forceDropup={false}
          />
        </div>
        <IconTextButton
          variant=""
          size="sm"
          icon={<FiX size={14} />}
          onClick={clearFilters}
        >
          Limpiar
        </IconTextButton>
        {can('createInventory') && (   // solo con permisos se crea
          <IconTextButton
            variant="success"
            size="md"
            icon={<Plus size={14} />}
            onClick={() => setModalOpen(true)}
          >
            Nuevo Inventario
          </IconTextButton>
        )}
      </ButtonGroup>
    </div>
  );

  // ── Toolbar para conteo de items ────────────────────────────────
  const itemsToolbar = (
    <div className="users-toolbar">
      <ButtonGroup>
        <div className="report-dropdown">
          <CustomCombobox
            options={categoryFilterOptions}
            value={selectedCategoryFilter || ''}
            onChange={setSelectedCategoryFilter}
            placeholder="Todas las categorías"
            filterable={true}
            size="md"
            forceDropup={false}
          />
        </div> 
        <IconTextButton
          variant="success"
          size="md"
          icon={<Check size={14} />}
          onClick={closeInventory}
          disabled={pending > 0 || saving}
          loading={saving}
        >
          {saving ? 'Cerrando...' : 'Cerrar Inventario'}
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
      <FiRefreshCwIcon size={18} className={refreshing ? 'spinning' : ''} />
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  // ── Opciones para categorías del filtro ─────────────────────────
  const categoryOptions = useMemo(() => [
    { value: '', label: 'Todas las categorías' },
    ...categories.map(cat => ({ value: String(cat.id), label: cat.name }))
  ], [categories]);

  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <PageTemplate
      title="Inventario Físico"
      subtitle="Conteo y ajuste de stock"
      loading={loading}
      error={error}
      onRetry={handleRefresh}
      theme="business"
      headerAction={refreshButton}
    >
      <div className="inventory-page">
        {/* ── LISTA DE INVENTARIOS ── */}
        {!active && (
          <div className="inventory-list-container">
            <Table
              data={filteredInventories}
              columns={inventoryColumns}
              keyField="id"
              title="Inventarios Registrados"
              subtitle={`${filteredInventories.length} ${filteredInventories.length === 1 ? 'Inventario' : 'Inventarios'} registrados`}
              toolbar={inventoryToolbar}
              searchable={true}
              pagination={true}
              itemsPerPage={itemsPerPage}
              itemsPerPageOptions={[10, 15]}
              onItemsPerPageChange={(newPerPage) => setItemsPerPage(newPerPage)}
              emptyMessage="No hay inventarios registrados"
              striped={false}
              hoverable={true}
              onRowClick={(row) => row.status !== 'closed' && openInventory(row)}
            />
          </div>
        )}

        {/* ── DETALLE DEL INVENTARIO ABIERTO ── */}
        {active && (
          <>
            <div className="detail-header">
              <ButtonGroup>
                <IconTextButton
                  variant=""
                  size="sm"
                  icon={<ArrowLeft size={14} />}
                  onClick={() => setActive(null)}
                >
                  Volver
                </IconTextButton>
                <div className="detail-info">
                  <span className="detail-date">#{String(active.id).slice(0, 8)}</span>
                  <span className="detail-date">{active.name || 'Sin nombre'}</span>
                  <span className="detail-date">
                    {new Date(active.created_at).toLocaleString()}
                  </span>
                </div>
              </ButtonGroup>

              <div className="progress-container">
                <div className="progress-stats">
                  <FiCheckCircle size={14} className="progress-icon" />
                  <span className="progress-count">{counted}</span>
                  <span className="progress-total">/ {items.length} contados</span>
                </div>
                <div className="progress-bar-wrapper">
                  <div
                    className={`progress-bar ${
                      progress === 100 ? 'progress-bar-green' : 'progress-bar-purple'
                    }`}
                    style={{ width: `${Math.max(progress, 2)}%` }}
                  />
                </div>
                <span
                  className={`progress-percentage ${
                    progress === 100 ? 'progress-percentage-green' : 'progress-percentage-gray'
                  }`}
                >
                  {progress}%
                </span>
              </div>
            </div>

            {/* ── TABLA DE CONTEO CON COMPONENTE TABLE ── */}
            <Table
              data={filteredItems}
              columns={itemsColumns}
              keyField="id"
              title="Contar productos"
              subtitle={`${filteredItems.length} ${filteredItems.length === 1 ? 'producto' : 'productos'}`}
              toolbar={itemsToolbar}
              pagination={true}
              itemsPerPage={15}
              searchable={true}
              searchPlaceholder="Ej: Producto A..."
              emptyMessage={
                searchItem || selectedCategoryFilter
                  ? 'No hay productos que coincidan con los filtros'
                  : 'No hay productos en este inventario'
              }
              striped={true}
              hoverable={true}
              bordered={false}
              compact={false}
            />
          </>
        )}

        {/* ── MODAL DE DETALLE DE INVENTARIO ── */}
        <Modal
          closeOnOverlayClick={false}
          isOpen={showDetailModal}
          onClose={() => {
          setShowDetailModal(false);
          setDetailInventory(null);
          setDetailItems([]);
          }}
          title={`Detalle de ${detailInventory?.name || 'Inventario'}  (${detailInventory?.status === 'open' ? 'Abierto' : 'Cerrado'})`}
          size="xl"
          className="inventory-detail-modal"
          footer={
            <ButtonGroup>
              <IconTextButton
                variant=""
                onClick={() => {
                setShowDetailModal(false);
                setDetailInventory(null);
                setDetailItems([]);
                }}
              >
                Cerrar
              </IconTextButton>
              {detailInventory?.status === 'closed' && (
                <IconTextButton
                  variant="warning"
                  onClick={handleOpenRecount}
                  icon={<RotateCcw size={14} />}
                >
                  Reconteo
                </IconTextButton>
              )}
              {detailInventory?.status === 'open' && (
                <IconTextButton
                  variant="success"
                  onClick={() => {
                    setShowDetailModal(false);
                    if (detailInventory) {
                      openInventory(detailInventory);
                    }
                  }}
                  icon={<FiBox size={14} />}
                >
                  Ir a contar
                </IconTextButton>
              )}
            </ButtonGroup>
          }
        >
          <div className="detail-modal-content">
            {/* Cabecera con información del inventario */}
            <div className="detail-modal-header">
              <div className="detail-modal-info-grid">
                {/* Creado por */}
                <div className="detail-modal-field">
                  <div className="detail-modal-label">
                    <FiUser size={14} />
                    <span>Creado por</span>
                  </div>
                  <span className="detail-modal-value" style={{ color: '#1a2332', fontWeight: 500 }}>
                    {detailInventory?.created_by_name || '—'}
                  </span>
                </div>
                
                {/* Fecha creación */}
                <div className="detail-modal-field">
                  <div className="detail-modal-label">
                    <FiCalendar size={14} />
                    <span>Fecha creación</span>
                  </div>
                  <span className="detail-modal-value" style={{ color: '#1a2332', fontWeight: 500 }}>
                    {detailInventory?.created_at ? new Date(detailInventory.created_at).toLocaleString() : '—'}
                  </span>
                </div>
                
                {/* Finalizado por (solo si está cerrado) */}
                {detailInventory?.status === 'closed' && (
                  <div className="detail-modal-field">
                    <div className="detail-modal-label">
                      <FiUser size={14} />
                      <span>Contado Por</span>
                    </div>
                    <span className="detail-modal-value" style={{ color: '#1a2332', fontWeight: 500 }}>
                      {detailInventory?.closed_by_name || '—'}
                    </span>
                  </div>
                )}
                
                {/* Fecha finalización (solo si está cerrado) */}
                {detailInventory?.status === 'closed' && (
                  <div className="detail-modal-field">
                    <div className="detail-modal-label">
                      <FiCalendar size={14} />
                      <span>Fecha finalización</span>
                    </div>
                    <span className="detail-modal-value" style={{ color: '#1a2332', fontWeight: 500 }}>
                      {formatClosedDateTime(detailInventory)}
                    </span>
                  </div>
                )}
                
                {/* Estado del conteo */}
                <div className="detail-modal-field">
                  <div className="detail-modal-label">
                    <FiCheckCircle size={14} />
                    <span>Conteo</span>
                  </div>
                  <span className="detail-modal-value" style={{ color: '#1a2332', fontWeight: 500 }}>
                    {detailItems.filter(i => i.status === 'counted').length} / {detailItems.length} productos contados
                  </span>
                </div>
                
                {/* Notas (si existen) */}
                {detailInventory?.notes && (
                  <div className="detail-modal-field">
                    <div className="detail-modal-label">
                      <FiFileText size={14} />
                      <span>Notas</span>
                    </div>
                    <span className="detail-modal-value" style={{ color: '#1a2332', fontWeight: 500 }}>{detailInventory.notes}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Tabla de productos */}
            <Table
              data={detailItems}
              columns={detailColumns}
              keyField="id"
              title="Productos"
              subtitle={`${detailItems.length} productos`}
              pagination={true}
              itemsPerPage={10}
              searchable={true}
              searchPlaceholder="Ej: producto A..."
              emptyMessage="No hay productos en este inventario"
              striped={true}
              hoverable={true}
              bordered={false}
              compact={false}
            />
            
          </div>
        </Modal>

        {/* ── MODAL DE RECONTEO ── */}
        <Modal
          closeOnOverlayClick={false}
          isOpen={showRecountModal}
          onClose={() => {
          setShowRecountModal(false);
          setRecountReason('');
          }}
          title="Reconteo de inventario"
          size="xl"
          className="recount-modal"
          footer={
            <ButtonGroup>
              <IconTextButton
                variant=""
                onClick={() => {
                setShowRecountModal(false);
                setRecountReason('');
                }}
              >
                Cancelar
              </IconTextButton>
              <IconTextButton
                variant="warning"
                onClick={handleSaveRecount}
                disabled={!recountReason.trim() || recountSaving}
                loading={recountSaving}
                icon={<RotateCcw size={14} />}
              >
                {recountSaving ? 'Reabriendo...' : 'Reabrir para Reconteo'}
              </IconTextButton>
            </ButtonGroup>
          }
        >
          <div className="recount-modal-body">
            <div className="recount-modal-icon">
              <RotateCcw size={30} />
            </div>
            <p className="recount-modal-title">
              ¿Reabrir inventario para reconteo?
            </p>
            <p className="recount-modal-subtitle">
              El inventario se reabrirá para permitir corregir los conteos.
              Esta acción registrará el motivo y el usuario que lo realizó.
            </p>
            <div className="recount-modal-field">
              <label>Motivo del reconteo *</label>
              <Input
                type="textarea"
                value={recountReason}
                onChange={setRecountReason}
                placeholder="Ej: Error en el conteo anterior, productos mal contados, etc."
                size="md"
                rows={3}
              />
            </div>
          </div>
        </Modal>

        {/* ── MODAL DE FECHAS PERSONALIZADAS ── */}
        {showCustomDate && (
          <div className="report-modal-overlay" onClick={() => setShowCustomDate(false)}>
            <div className="report-modal-box" onClick={e => e.stopPropagation()}>
              <div className="report-modal-header">
                <h2>Seleccionar fechas</h2>
                <button type="button" onClick={() => setShowCustomDate(false)} className="report-modal-close">×</button>
              </div>
              <div className="report-modal-body">
                <DateRangePicker
                  startDate={customStartDate}
                  endDate={customEndDate}
                  onApply={handleApplyCustomDate}
                  onClose={() => setShowCustomDate(false)}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL NUEVO INVENTARIO ── */}
        <Modal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedCategories([]);
            setInventoryName('');
          }}
          title="Nuevo inventario físico"
          size="md"
          className="inventory-modal"
          footer={
            <ButtonGroup>
              <IconTextButton
                variant=""
                onClick={() => {
                  setModalOpen(false);
                  setSelectedCategories([]);
                  setInventoryName('');
                }}
              >
                Cancelar
              </IconTextButton>
              <IconTextButton
                variant="primary"
                onClick={createInventory}
                disabled={selectedCategories.length === 0}
              >
                <Plus size={14} /> Crear inventario
              </IconTextButton>
            </ButtonGroup>
          }
        >
          <div className="inventory-modal-body">
            <div className="inventory-modal-field">
              <label>Descripción del inventario</label>
              <Input
                type="text"
                value={inventoryName}
                onChange={setInventoryName}
                placeholder="Ej: Inventario de agosto 2026"
                size="md"
              />
            </div>
            
            <p className="modal-subtitle">
              Selecciona las categorías que deseas incluir en el conteo físico.
            </p>
            {categories.length === 0 ? (
              <div className="modal-empty">
                <AlertCircle size={32} className="modal-empty-icon" />
                <p>No hay categorías registradas</p>
              </div>
            ) : (
              <Checklist
                items={categories.map((c) => ({ id: c.id, label: c.name }))}
                value={selectedCategories}
                onChange={setSelectedCategories}
                mode="simple"
                variant="default"
                showIcons={true}
                selectAll={true}
              />
            )}
          </div>
        </Modal>
      </div>
    </PageTemplate>
  );
}