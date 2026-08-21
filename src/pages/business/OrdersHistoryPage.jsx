import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useSession } from '../../context/SessionContext';
import { FiPlus, FiSave, FiEdit2, FiTrash2, FiPrinter, FiSearch, FiRefreshCw, FiCalendar, FiX, FiEye } from 'react-icons/fi';
import PageTemplate from '../../components/PageTemplate';
import { useConfirm } from '../../context/ConfirmContext';
import { usePrinterService } from '../../services/usePrinterService';
import AddItemModal from '../../components/AddItemModal';
import EditItemModal from '../../components/EditItemModal';
import ItemsList from '../../components/ItemsList';
import { fetchWithAuth } from '../../config/api';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import CustomCombobox from '../../components/General/CustomCombobox';
import Table from '../../components/General/Table';
import Modal from '../../components/General/Modal';
import Checklist from '../../components/General/Checklist';

const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`;

// --- Función para obtener fecha actual de Ecuador ---
const getEcuadorDate = () => {
  const now = new Date();
  const ecuadorDate = new Date(now.getTime() - (5 * 60 * 60 * 1000));
  return ecuadorDate.toISOString().split('T')[0];
};

// --- Función para obtener precio actual de un producto ---
const getProductPrice = async (productId) => {
  try {
    const res = await fetchWithAuth(`/products/${productId}`);
    if (res.ok) {
      const product = await res.json();
      return Number(product.selling_price) || Number(product.price) || 0;
    }
    return 0;
  } catch {
    return 0;
  }
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

export default function OrdersHistoryPage() {
  const { user } = useSession();
  const isSavingRef = useRef(false);
  const { print } = usePrinterService();
  const { showConfirm } = useConfirm();

  // ─── Obtener businessId de forma robusta ──────────────────────────────────
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

  const businessId = getBusinessId();

  // Estado principal
  const [orders, setOrders] = useState([]);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editItems, setEditItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Estado para modales
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidadItem, setCantidadItem] = useState(1);
  const [notasItem, setNotasItem] = useState('');
  const [itemEditando, setItemEditando] = useState(null);
  const [extrasItem, setExtrasItem] = useState([]);

  // Estado para dividir orden
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [selectedSplitItems, setSelectedSplitItems] = useState([]);
  const [isSplitting, setIsSplitting] = useState(false);

  // Estado para filtros de fecha
  const [dateRange, setDateRange] = useState('all');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Opciones de fecha
  const dateOptions = useMemo(() => ([
    { value: 'all', label: 'Todas las fechas' },
    { value: 'day', label: 'Hoy' },
    { value: 'week', label: 'Esta semana' },
    { value: 'month', label: 'Este mes' },
    { value: 'custom', label: 'Personalizado' }
  ]), []);

  // ── Carga inicial ─────────────────────────────────────────────────────────
  const loadOrders = useCallback(async () => {
    if (!businessId) {
      setOrders([]);
      setLoadingOrders(false);
      return;
    }

    setLoadingOrders(true);
    try {
      let url = `/ordenes?businessId=${businessId}`;
      if (statusFilter) url += `&status=${statusFilter}`;

      const response = await fetchWithAuth(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      let ordersArray = Array.isArray(data) ? data : (data?.data || data?.ordenes || data?.orders);

      if (!Array.isArray(ordersArray)) {
        throw new Error('La respuesta no contiene un array de órdenes');
      }

      // Filtrar por fecha
      let filtered = ordersArray;

      if (dateRange === 'day') {
        const today = getEcuadorDate();
        filtered = ordersArray.filter(order => {
          const fecha = order.sale_date || order.created_at;
          if (!fecha) return false;
          const orderDate = new Date(fecha).toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
          return orderDate === today;
        });
      } else if (dateRange === 'week') {
        const now = new Date();
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = ordersArray.filter(order => {
          const fecha = order.sale_date || order.created_at;
          if (!fecha) return false;
          const orderDate = new Date(fecha);
          return orderDate >= weekAgo && orderDate <= now;
        });
      } else if (dateRange === 'month') {
        const now = new Date();
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filtered = ordersArray.filter(order => {
          const fecha = order.sale_date || order.created_at;
          if (!fecha) return false;
          const orderDate = new Date(fecha);
          return orderDate >= monthAgo && orderDate <= now;
        });
      } else if (dateRange === 'custom' && customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        filtered = ordersArray.filter(order => {
          const fecha = order.sale_date || order.created_at;
          if (!fecha) return false;
          const orderDate = new Date(fecha);
          return orderDate >= start && orderDate <= end;
        });
      }

      setOrders(filtered);
    } catch (err) {
      setError(`Error al cargar órdenes: ${err.message}`);
      setTimeout(() => setError(''), 3000);
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }, [businessId, statusFilter, dateRange, customStartDate, customEndDate]);

  const loadProductos = useCallback(async () => {
    if (!businessId) return;
    try {
      const res = await fetchWithAuth(`/products?businessId=${businessId}`);
      const data = await res.json();
      setProductos(Array.isArray(data) ? data : data?.productos ?? data?.data ?? []);
    } catch (err) {
      setError('Error al cargar productos');
      setTimeout(() => setError(''), 3000);
    }
  }, [businessId]);

  const loadCategorias = useCallback(async () => {
    if (!businessId) return;
    try {
      const res = await fetchWithAuth(`/categories?businessId=${businessId}`);
      const data = await res.json();
      setCategorias(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Error al cargar categorías');
      setTimeout(() => setError(''), 3000);
    }
  }, [businessId]);

  // ── useEffect para carga inicial ──────────────────────────────────────────
  useEffect(() => {
    if (businessId) {
      loadOrders();
      loadProductos();
      loadCategorias();
    } else {
      setLoadingOrders(false);
    }
  }, [businessId, loadOrders, loadProductos, loadCategorias]);

  useRealtimeSync('orders', loadOrders);

  // ── Enriquecer items con precios ─────────────────────────────────────────
  const enrichOrderItemsWithPrices = async (order) => {
    if (!order || !order.items) return order;

    const enrichedItems = await Promise.all(order.items.map(async (item) => {
      const producto = productos.find(p => p.id === item.product_id);

      if (producto) {
        return {
          ...item,
          unit_price: Number(producto.selling_price) || Number(producto.price) || 0,
          selling_price: Number(producto.selling_price) || Number(producto.price) || 0,
          price: Number(producto.selling_price) || Number(producto.price) || 0,
          tax_rate: Number(producto.tax_rate) || 0,
          extras: item.extras || [],
        };
      }

      try {
        const price = await getProductPrice(item.product_id);
        return {
          ...item,
          unit_price: price,
          selling_price: price,
          price: price,
          tax_rate: item.tax_rate || 0,
          extras: item.extras || [],
        };
      } catch {
        return {
          ...item,
          unit_price: item.unit_price || item.selling_price || 0,
          selling_price: item.selling_price || item.unit_price || 0,
          price: item.selling_price || item.unit_price || 0,
          tax_rate: item.tax_rate || 0,
          extras: item.extras || [],
        };
      }
    }));

    return {
      ...order,
      items: enrichedItems,
    };
  };

  // ── Seleccionar orden ─────────────────────────────────────────────────────
  const handleSelectOrder = async (order) => {
    if (editMode && selectedOrder?.id === order.id) return;

    if (editMode) {
      setEditMode(false);
      setEditItems([]);
      setSelectedOrder(null);
    }

    try {
      const res = await fetchWithAuth(`/ordenes/${order.id}?businessId=${businessId}`);
      const fresh = res.ok ? await res.json() : order;
      const merged = { ...order, ...fresh, items: fresh.items || order.items || [] };
      const enrichedOrder = await enrichOrderItemsWithPrices(merged);
      setSelectedOrder(enrichedOrder);
    } catch {
      const enrichedOrder = await enrichOrderItemsWithPrices(order);
      setSelectedOrder(enrichedOrder);
    }
  };

  // ── Editar orden ─────────────────────────────────────────────────────────
  const handleEditOrder = async (order) => {
    let fresh = order;
    try {
      const res = await fetchWithAuth(`/ordenes/${order.id}?businessId=${businessId}`);
      if (res.ok) {
        const data = await res.json();
        fresh = { ...order, ...data, items: data.items || order.items || [] };
      }
    } catch {}
    const enrichedOrder = await enrichOrderItemsWithPrices(fresh);
    setSelectedOrder(enrichedOrder);
    setEditMode(true);

    const rawItems = enrichedOrder.items || [];
    const grouped = [];
    rawItems.forEach(dbItem => {
      const notes = dbItem.notes || dbItem.notas || '';
      if (notes.startsWith('__EXT__:')) {
        if (grouped.length > 0) {
          grouped[grouped.length - 1].extras.push({
            id: dbItem.product_id,
            product_id: dbItem.product_id,
            name: dbItem.product_name,
            selling_price: Number(dbItem.selling_price) || 0,
            tax_rate: Number(dbItem.tax_rate) || 0,
            price: Number(dbItem.selling_price) || 0,
          });
        }
      } else {
        grouped.push({
          id: dbItem.id || (Date.now() + Math.random()),
          nombre: dbItem.product_name,
          product_name: dbItem.product_name,
          product_id: dbItem.product_id,
          cantidad: dbItem.quantity || 1,
          quantity: dbItem.quantity || 1,
          selling_price: Number(dbItem.selling_price) || 0,
          tax_rate: Number(dbItem.tax_rate) || 0,
          notas: notes,
          extras: [],
        });
      }
    });

    setEditItems(grouped);
  };

  // ── Cancelar edición ─────────────────────────────────────────────────────
  const handleCancelEdit = () => {
    setEditMode(false);
    setEditItems([]);
    setSelectedOrder(null);
    setSuccess('Edición cancelada');
    setTimeout(() => setSuccess(''), 2000);
  };

  // ── Actualizar ──────────────────────────────────────────────────────────
  const handleRefresh = () => {
    loadOrders();
    if (selectedOrder && !editMode) {
      handleSelectOrder(selectedOrder);
    }
    setSuccess('Órdenes actualizadas');
    setTimeout(() => setSuccess(''), 3000);
  };

  // ── Reimprimir ────────────────────────────────────────────────────────────
  const handlePrintOriginalOrder = async (order) => {
    let items = Array.isArray(order.items) ? order.items : [];

    if (items.length === 0) {
      try {
        const res = await fetchWithAuth(`/ordenes/${order.id}?businessId=${businessId}`);
        if (res.ok) {
          const data = await res.json();
          const fetched = data.order || data.pedido || data;
          items = fetched.items || fetched.pedido?.items || data.items || [];
        }
      } catch (e) {}
    }

    const result = await print('printer_ticket', 'comanda', {
      comanda: { number: order.order_number || order.id },
      table: order.mesa_numero ?? order.numero_mesa,
      items,
      notes: order.notas || order.notes || '',
    });

    if (result?.success === false) {
      setError(result.error || 'Error al reimprimir — verifica que QZ Tray esté activo');
      setTimeout(() => setError(''), 4000);
    }
  };

  // ── Eliminar ──────────────────────────────────────────────────────────────
  const handleDeleteOrder = async (orderId) => {
    if (!await showConfirm({
      title: 'Confirmar eliminación',
      message: `¿Seguro que deseas eliminar la orden?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      danger: true,
    })) return;
    try {
      const res = await fetchWithAuth(`/ordenes/${orderId}?businessId=${businessId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      setSuccess('Orden eliminada correctamente');
      setTimeout(() => setSuccess(''), 3000);
      loadOrders();
      setSelectedOrder(null);
    } catch (err) {
      setError('Error al eliminar orden');
      setTimeout(() => setError(''), 3000);
    }
  };

  // ── Separar productos por unidad ────────────────────────────────────────
  const separarProductosPorUnidad = async () => {
    if (!editMode) {
      setError('Primero debes entrar en modo edición');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const itemsConMultiplesUnidades = editItems.filter(item =>
      !item._remove && (item.cantidad || item.quantity || 1) > 1
    );

    if (itemsConMultiplesUnidades.length === 0) {
      setError('No hay productos con cantidad mayor a 1 para separar');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const confirmar = await showConfirm(
      `¿Separar ${itemsConMultiplesUnidades.length} producto(s) en unidades individuales?`
    );

    if (!confirmar) return;

    const nuevosItems = [];
    editItems.forEach(item => {
      if (item._remove) return;
      const cantidad = item.cantidad || item.quantity || 1;
      if (cantidad > 1) {
        const precioUnitario = item.precio || item.unit_price || 0;
        for (let i = 0; i < cantidad; i++) {
          nuevosItems.push({
            ...item,
            id: Date.now() + i + Math.random(),
            cantidad: 1,
            quantity: 1,
            subtotal: precioUnitario,
            line_total: precioUnitario,
            precio: precioUnitario,
            unit_price: precioUnitario,
            _separado: true,
          });
        }
      } else {
        nuevosItems.push(item);
      }
    });

    setEditItems(nuevosItems);
    setSuccess(`${itemsConMultiplesUnidades.length} producto(s) separados en ${nuevosItems.length} unidades`);
    setTimeout(() => setSuccess(''), 3000);
  };

  // ── Dividir orden ────────────────────────────────────────────────────────
  const abrirDividirOrden = () => {
    setSelectedSplitItems([]);
    setShowSplitModal(true);
  };

  const confirmarDivision = async (selectedItemIds) => {
    if (!selectedItemIds || selectedItemIds.length === 0) {
      setError('Selecciona al menos un producto para la nueva orden');
      setTimeout(() => setError(''), 3000);
      setGuardando(false);
      return;
    }

    const activeEditItems = editItems.filter(i => !i._remove);

    if (selectedItemIds.length === activeEditItems.length) {
      setError('Debes dejar al menos un producto en la orden original');
      setTimeout(() => setError(''), 3000);
      setGuardando(false);
      return;
    }

    const itemsParaNueva = activeEditItems.filter(i => selectedItemIds.includes(i.id));
    const itemsQueQuedan = activeEditItems.filter(i => !selectedItemIds.includes(i.id));

    try {
      setIsSplitting(true);
      setGuardando(true);

      const toItems = (list) => list.flatMap(item => {
        const quantity = item.quantity || item.cantidad || 1;
        const unitPrice = Number(item.selling_price) || 0;
        const taxRate = Number(item.tax_rate) || 0;
        const productName = item.nombre || item.product_name || 'Producto';

        const base = {
          product_id: item.product_id,
          product_name: productName,
          quantity: quantity,
          unit_price: unitPrice,
          tax_rate: taxRate,
          iva_amount: taxRate * quantity,
          line_total: (unitPrice + taxRate) * quantity,
          notes: item.notas || null,
        };

        const extras = (item.extras || []).map(e => ({
          product_id: e.id || e.product_id,
          product_name: e.name || 'Extra',
          quantity: quantity,
          unit_price: Number(e.selling_price) || Number(e.price) || 0,
          tax_rate: Number(e.tax_rate) || 0,
          iva_amount: (Number(e.tax_rate) || 0) * quantity,
          line_total: ((Number(e.selling_price) || Number(e.price) || 0) + (Number(e.tax_rate) || 0)) * quantity,
          notes: `__EXT__: + ${e.name}${e.nota ? ': ' + e.nota : ''}`,
        }));

        return [base, ...extras];
      });

      const calcTotals = (list) => {
        const subtotal = list.reduce((s, i) => {
          const qty = i.cantidad || i.quantity || 1;
          const base = (Number(i.selling_price) || 0) * qty;
          const extrasBase = (i.extras || []).reduce((es, e) =>
            es + (Number(e.selling_price) || Number(e.price) || 0), 0
          ) * qty;
          return s + base + extrasBase;
        }, 0);

        const iva = list.reduce((s, i) => {
          const qty = i.cantidad || i.quantity || 1;
          const iva = (Number(i.tax_rate) || 0) * qty;
          const extrasIva = (i.extras || []).reduce((es, e) =>
            es + (Number(e.tax_rate) || 0), 0
          ) * qty;
          return s + iva + extrasIva;
        }, 0);

        return { subtotal, iva, total: subtotal + iva };
      };

      const nuevaTotals = calcTotals(itemsParaNueva);
      const quedaTotals = calcTotals(itemsQueQuedan);

      const resNueva = await fetchWithAuth(`/ordenes?businessId=${businessId}`, {
        method: 'POST',
        body: JSON.stringify({
          mesa_numero: selectedOrder.mesa_numero,
          mesa_id: selectedOrder.mesa_id,
          order_type: selectedOrder.order_type || 'dine_in',
          items: toItems(itemsParaNueva),
          subtotal: nuevaTotals.subtotal,
          tax_amount: nuevaTotals.iva,
          total: nuevaTotals.total,
          notas: `División de #${selectedOrder.order_number || selectedOrder.id.slice(0, 8)}`,
        }),
      });

      if (!resNueva.ok) {
        const d = await resNueva.json();
        throw new Error(d.error || 'Error al crear nueva orden');
      }

      const resOriginal = await fetchWithAuth(`/ordenes/${selectedOrder.id}?businessId=${businessId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          items: toItems(itemsQueQuedan),
          subtotal: quedaTotals.subtotal,
          tax_amount: quedaTotals.iva,
          total: quedaTotals.total,
        }),
      });

      if (!resOriginal.ok) throw new Error('Error al actualizar orden original');

      setEditItems(itemsQueQuedan);
      setSelectedSplitItems([]);
      setShowSplitModal(false);
      setSuccess(`Orden dividida. Nueva orden creada con ${itemsParaNueva.length} producto(s)`);
      setTimeout(() => setSuccess(''), 5000);
      await loadOrders();
    } catch (err) {
      setError(err.message || 'Error al dividir la orden');
      setTimeout(() => setError(''), 4000);
    } finally {
      setIsSplitting(false);
      setGuardando(false);
    }
  };

  // ── Editar item ──────────────────────────────────────────────────────────
  const abrirEditarItem = (item) => {
    setItemEditando(item);
    setProductoSeleccionado({
      id: item.product_id,
      name: item.nombre || item.product_name,
      selling_price: item.selling_price || 0,
      price: item.selling_price || 0,
      tax_rate: item.tax_rate || 0,
    });
    setCantidadItem(item.cantidad || item.quantity || 1);
    setNotasItem(item.notas || '');
    setExtrasItem(item.extras || []);
    setShowEditItemModal(true);
  };

  const guardarEdicionItem = () => {
    if (guardando) return;
    if (!productoSeleccionado || cantidadItem <= 0) {
      setError('Selecciona un producto y cantidad válida');
      setTimeout(() => setError(''), 3000);
      return;
    }
    const sellingPrice = Number(productoSeleccionado.selling_price || productoSeleccionado.price) || 0;
    const taxRate = Number(productoSeleccionado.tax_rate) || 0;
    const cantidad = parseInt(cantidadItem, 10);

    setEditItems(prev => prev.map(item => item.id === itemEditando.id ? {
      ...itemEditando,
      nombre: productoSeleccionado.name,
      product_name: productoSeleccionado.name,
      product_id: productoSeleccionado.id,
      cantidad,
      quantity: cantidad,
      selling_price: sellingPrice,
      tax_rate: taxRate,
      notas: notasItem,
      extras: extrasItem,
      _modified: true,
    } : item));

    setShowEditItemModal(false);
    setItemEditando(null);
    setProductoSeleccionado(null);
    setCantidadItem(1);
    setNotasItem('');
    setExtrasItem([]);
    setSuccess('Producto modificado');
    setTimeout(() => setSuccess(''), 2000);
  };

  // ── Agregar item en edición ─────────────────────────────────────────────
  const agregarItem = () => {
    if (!productoSeleccionado || cantidadItem <= 0) {
      setError('Selecciona un producto y cantidad válida');
      setTimeout(() => setError(''), 3000);
      return;
    }
    const sellingPrice = Number(productoSeleccionado.selling_price || productoSeleccionado.price) || 0;
    const taxRate = Number(productoSeleccionado.tax_rate) || 0;
    const cantidad = parseInt(cantidadItem, 10);

    setEditItems(prev => [...prev, {
      id: Date.now(),
      nombre: productoSeleccionado.name,
      product_name: productoSeleccionado.name,
      product_id: productoSeleccionado.id,
      cantidad,
      quantity: cantidad,
      selling_price: sellingPrice,
      tax_rate: taxRate,
      notas: notasItem,
      extras: extrasItem,
      _added: true,
    }]);

    setShowAddItemModal(false);
    setProductoSeleccionado(null);
    setCantidadItem(1);
    setNotasItem('');
    setExtrasItem([]);
    setSuccess('Producto agregado');
    setTimeout(() => setSuccess(''), 2000);
  };

  // ── Guardar cambios editados ─────────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (guardando || isSavingRef.current) return;

    const originalItems = selectedOrder.items || [];
    const remainingItems = editItems.filter(i => !i._remove);

    const removedItems = originalItems.filter(orig =>
      !remainingItems.some(curr => curr.id === orig.id)
    );
    const addedItems = remainingItems.filter(curr => curr._added);
    const modifiedItems = remainingItems.filter(curr => curr._modified);

    const hasChanges = removedItems.length > 0 || addedItems.length > 0 || modifiedItems.length > 0;

    if (!hasChanges) {
      setError('No hay cambios para guardar');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      isSavingRef.current = true;
      setGuardando(true);

      const itemsToSend = remainingItems.flatMap(item => {
        const quantity = item.quantity || item.cantidad || 1;
        const unitPrice = Number(item.selling_price) || 0;
        const taxRate = Number(item.tax_rate) || 0;
        const productName = item.nombre || item.product_name || 'Producto';

        const base = {
          product_id: item.product_id,
          product_name: productName,
          quantity: quantity,
          unit_price: unitPrice,
          tax_rate: taxRate,
          iva_amount: taxRate * quantity,
          line_total: (unitPrice + taxRate) * quantity,
          notes: item.notas || null,
        };

        const extras = (item.extras || []).map(e => ({
          product_id: e.id || e.product_id,
          product_name: e.name || 'Extra',
          quantity: quantity,
          unit_price: Number(e.selling_price) || Number(e.price) || 0,
          tax_rate: Number(e.tax_rate) || 0,
          iva_amount: (Number(e.tax_rate) || 0) * quantity,
          line_total: ((Number(e.selling_price) || Number(e.price) || 0) + (Number(e.tax_rate) || 0)) * quantity,
          notes: `__EXT__: + ${e.name}${e.nota ? ': ' + e.nota : ''}`,
        }));

        return [base, ...extras];
      });

      const editSubtotal = remainingItems.reduce((s, item) => {
        const qty = item.cantidad || item.quantity || 1;
        const base = (Number(item.selling_price) || 0) * qty;
        const extrasBase = (item.extras || []).reduce((es, e) => es + (Number(e.selling_price) || Number(e.price) || 0), 0) * qty;
        return s + base + extrasBase;
      }, 0);

      const editIva = remainingItems.reduce((s, item) => {
        const qty = item.cantidad || item.quantity || 1;
        const iva = (Number(item.tax_rate) || 0) * qty;
        const extrasIva = (item.extras || []).reduce((es, e) => es + (Number(e.tax_rate) || 0), 0) * qty;
        return s + iva + extrasIva;
      }, 0);

      const editTotal = editSubtotal + editIva;

      const res = await fetchWithAuth(`/ordenes/${selectedOrder.id}?businessId=${businessId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          items: itemsToSend,
          subtotal: editSubtotal,
          tax_amount: editIva,
          total: editTotal,
        }),
      });

      if (!res.ok) throw new Error('Error al actualizar orden');

      const resData = await res.json();
      const orderSnapshot = { ...selectedOrder };

      setEditMode(false);
      setEditItems([]);
      setSelectedOrder(null);
      setSuccess('Orden guardada correctamente');
      setTimeout(() => setSuccess(''), 4000);

      await loadOrders();

      const imprimirMod = await showConfirm('¿Deseas imprimir la comanda modificada?', {
        title: 'Imprimir comanda',
        danger: false,
        confirmText: 'Imprimir',
        cancelText: 'No imprimir',
      });

      if (imprimirMod) {
        const tipoOrden = orderSnapshot.order_type === 'dine_in' ? 'LOCAL'
          : orderSnapshot.order_type === 'take_away' ? 'LLEVAR' : 'DELIVERY';
        const printResult = await print('printer_ticket', 'comanda-mod', {
          mesa: orderSnapshot.mesa_numero,
          orden: orderSnapshot.order_number || orderSnapshot.id.slice(0, 8),
          tipoOrden,
          items: remainingItems,
        });
        if (printResult?.success === false) {
          setError('⚠️ No se pudo imprimir — verifica que QZ Tray esté activo');
          setTimeout(() => setError(''), 4000);
        }
      }
    } catch (err) {
      setError('Error al guardar cambios');
      setTimeout(() => setError(''), 3000);
    } finally {
      setGuardando(false);
      isSavingRef.current = false;
    }
  };

  // ── Totales editados ──────────────────────────────────────────────────────
  const activeEditItems = editItems.filter(i => !i._remove);
  const editSubtotal = useMemo(() => {
    return activeEditItems.reduce((s, item) => {
      const qty = item.cantidad || item.quantity || 1;
      const base = (Number(item.selling_price) || 0) * qty;
      const extrasBase = (item.extras || []).reduce((es, e) => es + (Number(e.selling_price) || Number(e.price) || 0), 0) * qty;
      return s + base + extrasBase;
    }, 0);
  }, [activeEditItems]);

  const editIva = useMemo(() => {
    return activeEditItems.reduce((s, item) => {
      const qty = item.cantidad || item.quantity || 1;
      const iva = (Number(item.tax_rate) || 0) * qty;
      const extrasIva = (item.extras || []).reduce((es, e) => es + (Number(e.tax_rate) || 0), 0) * qty;
      return s + iva + extrasIva;
    }, 0);
  }, [activeEditItems]);

  const editTotal = editSubtotal + editIva;

  // ── Filtros ──────────────────────────────────────────────────────────────
  const filteredOrders = orders.filter(order => {
    const search = searchTerm.toLowerCase().trim();
    if (!search) return true;

    const mesaStr = order.mesa_numero?.toString() || '';
    const ordenStr = order.order_number?.toString() || '';

    return mesaStr.toLowerCase().includes(search) ||
          ordenStr.toLowerCase().includes(search);
  });

  const estadosDisponibles = [
    { value: 'active', label: 'Activas' },
    { value: 'pending', label: 'Pendientes' },
    { value: 'sent', label: 'En preparación' },
    { value: 'completed', label: 'Listas para mesa' },
    { value: 'cancelled', label: 'Canceladas' },
    { value: 'paid', label: 'Pagadas' },
    { value: '', label: 'Todos los estados' },
  ];

  const STATUS_LABEL = {
    pending: 'Pendiente',
    sent: 'En cocina',
    completed: 'Lista ✓',
    paid: 'Pagada',
    cancelled: 'Cancelada',
    draft: 'Borrador',
  };

  // ── Handlers para filtros de fecha ──────────────────────────────────────
  const handleDateRangeChange = useCallback((value) => {
    setDateRange(value);
    if (value !== 'custom') {
      setShowCustomDate(false);
      setCustomStartDate('');
      setCustomEndDate('');
    }
    if (value === 'custom') {
      setShowCustomDate(true);
    }
  }, []);

  const handleApplyCustomDate = useCallback((start, end) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
    setDateRange('custom');
    setShowCustomDate(false);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('active');
    setDateRange('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setShowCustomDate(false);
  }, []);

  // ── Columnas de la tabla ──────────────────────────────────────────────────
  const columns = [
    { key: 'mesa', label: 'MESA' },
    { key: 'orden', label: 'ORDEN' },
    { key: 'estado', label: 'ESTADO' },
    { key: 'items', label: 'ITEMS', align: 'center' },
    { key: 'acciones', label: 'ACCIONES', align: 'center' },
  ];

  // ── Render personalizado para cada fila ──────────────────────────────────
  const renderRow = (item) => {
    const orderNumber = item.order_number || item.id.slice(0, 8);
    const match = String(orderNumber).match(/\d+$/);
    const displayNumber = match ? match[0] : orderNumber;

    return (
      <tr
        key={item.id}
        className={`table-row ${selectedOrder?.id === item.id ? 'selected' : ''}`}
        onClick={() => handleSelectOrder(item)}
        style={{ cursor: 'pointer' }}
      >
        <td className="table-cell" data-label="MESA">
          {item.mesa_numero != null ? `Mesa ${item.mesa_numero}` : 'S/Mesa'}
        </td>
        <td className="table-cell" data-label="ORDEN">
          <small>#{displayNumber}</small>
        </td>
        <td className="table-cell" data-label="ESTADO">
          <span>
            {STATUS_LABEL[item.status] || item.status || '—'}
          </span>
        </td>
        <td className="table-cell" data-label="ITEMS" style={{ textAlign: 'center' }}>
          {item.items?.filter(i => !(i.notes || '').startsWith('__EXT__:')).length || 0}
        </td>
        <td className="table-cell table-actions-cell">
          <ButtonGroup>
            <IconTextButton
              variant="blue"
              size="sm"
              inline={true}
              icon={<FiEdit2 size={12} />}
              onClick={(e) => {
                e.stopPropagation();
                handleEditOrder(item);
              }}
              disabled={editMode}
              title="Editar orden"
            >
              Editar
            </IconTextButton>
            <IconTextButton
              variant="danger"
              size="sm"
              inline={true}
              icon={<FiTrash2 size={12} />}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteOrder(item.id);
              }}
              title="Eliminar orden"
            >
              Eliminar
            </IconTextButton>
            <IconTextButton
              variant=""
              size="sm"
              inline={true}
              icon={<FiPrinter size={12} />}
              onClick={(e) => {
                e.stopPropagation();
                handlePrintOriginalOrder(item);
              }}
              title="Reimprimir comanda"
            >
              Imprimir
            </IconTextButton>
          </ButtonGroup>
        </td>
      </tr>
    );
  };

  // ── Preparar items para el Checklist de división ────────────────────────
  const splitChecklistItems = activeEditItems.map(item => ({
    id: item.id,
    label: item.nombre || item.product_name || 'Producto sin nombre',
    badge: `x${item.cantidad || item.quantity || 1}`,
    _item: item,
  }));

  // ── Render personalizado para cada item del checklist ──────────────────
  const renderSplitItem = (item) => {
    const originalItem = item._item;
    const qty = originalItem.cantidad || originalItem.quantity || 1;
    const price = Number(originalItem.selling_price) || 0;
    const tax = Number(originalItem.tax_rate) || 0;
    const subtotal = (price + tax) * qty;
    const hasExtras = (originalItem.extras || []).length > 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span style={{ fontWeight: 500 }}>{item.label}</span>
          <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            {fmt(subtotal)}
          </span>
        </div>
        {hasExtras && (
          <div style={{ fontSize: '0.8rem', color: '#6ee7b7', marginTop: '2px' }}>
            + {originalItem.extras.map(e => e.name).join(', ')}
          </div>
        )}
        {originalItem.notas && (
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
            {originalItem.notas}
          </div>
        )}
      </div>
    );
  };

  // ── Calcular total de items seleccionados para división ─────────────────
  const selectedSplitTotal = useMemo(() => {
    const selectedItems = activeEditItems.filter(item =>
      selectedSplitItems.includes(item.id)
    );
    return selectedItems.reduce((sum, item) => {
      const qty = item.cantidad || item.quantity || 1;
      const price = Number(item.selling_price) || 0;
      const tax = Number(item.tax_rate) || 0;
      return sum + (price + tax) * qty;
    }, 0);
  }, [selectedSplitItems, activeEditItems]);

  const allItemsSelected = selectedSplitItems.length === activeEditItems.length;
  const someItemsSelected = selectedSplitItems.length > 0;

  // ── Footer del modal de división ────────────────────────────────────────
  const splitModalFooter = (
    <ButtonGroup
      style={{
        display: 'flex',
        gap: 'var(--space-2)',
        justifyContent: 'flex-end',
      }}
    >
      <IconTextButton
        variant=""
        size="md"
        onClick={() => {
          setShowSplitModal(false);
          setGuardando(false);
          setIsSplitting(false);
        }}
        disabled={isSplitting}
      >
        Cancelar
      </IconTextButton>
      <IconTextButton
        variant="success"
        size="md"
        onClick={() => confirmarDivision(selectedSplitItems)}
        disabled={
          isSplitting ||
          selectedSplitItems.length === 0 ||
          selectedSplitItems.length === activeEditItems.length
        }
      >
        {isSplitting ? 'Creando orden...' : `Crear Nueva Orden (${selectedSplitItems.length})`}
      </IconTextButton>
    </ButtonGroup>
  );

  const [itemsPerPage, setItemsPerPage] = useState(5);

  // ─── Toolbar ─────────────────────────────────────────────────────────────
  const toolbar = useMemo(() => (
    <div>
      <div className="products-toolbar-right">
        <div className="products-filter-actions" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          flexWrap: 'nowrap',
          flex: 1,
          minWidth: 0,
        }}>
          {/* Buscador en el toolbar */}
          <div className="search-input-wrapper" style={{
            position: 'relative',
            minWidth: '40px',
            maxWidth: '220px',
            flex: '1 1 120px',
            flexShrink: 1,
          }}>
            <FiSearch size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              style={{
                padding: '6px 12px 6px 34px',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                width: '100%',
                minWidth: '40px',
                fontSize: '12px',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                outline: 'none',
                transition: 'border-color 0.2s, width 0.2s',
                height: '34px'
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <FiX size={14} />
              </button>
            )}
          </div>

          <CustomCombobox
            options={dateOptions}
            value={dateRange}
            onChange={handleDateRangeChange}
            placeholder="Todas las fechas"
            filterable={false}
            forceDropup={false}
            className="combobox-compact"
            style={{ flexShrink: 1, minWidth: '80px', maxWidth: '150px' }}
          />

          <CustomCombobox
            options={estadosDisponibles}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="Todos los estados"
            filterable={false}
            forceDropup={false}
            className="combobox-compact"
            style={{ flexShrink: 1, minWidth: '80px', maxWidth: '150px' }}
          />

          <IconTextButton
            variant=""
            size="sm"
            icon={<FiRefreshCw size={14} />}
            onClick={handleClearFilters}
            style={{ flexShrink: 0 }}
          >
            Limpiar
          </IconTextButton>
        </div>
      </div>
    </div>
  ), [dateRange, statusFilter, searchTerm, handleDateRangeChange, handleClearFilters, dateOptions, estadosDisponibles]);

  // Botón de refrescar
  const refreshButton = (
    <button
      onClick={handleRefresh}
      className="dashboard-refresh-btn-header"
      disabled={loadingOrders}
      title="Actualizar datos"
    >
      <FiRefreshCw size={18} className={loadingOrders ? 'spinning' : ''} />
      <span>{loadingOrders ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <PageTemplate
      title="Historial de Órdenes"
      subtitle={`${filteredOrders.length} orden${filteredOrders.length !== 1 ? 'es' : ''} encontradas`}
      theme="business"
      loading={loadingOrders}
      headerAction={refreshButton}
    >
      <div className="takeorder-shell">
        {error && (
          <div className="alert alert-error">
            <FiX size={16} />
            {error}
          </div>
        )}
        {success && (
          <div className="alert alert-success">
            <FiRefreshCw size={16} />
            {success}
          </div>
        )}

        <div className="order-grid_1">
          {/* Panel Izquierdo - Lista de órdenes */}
          <section className="card card-soft orders-list" style={{
              maxHeight: '100vh',
              display: 'flex',
              flexDirection: 'column',
              flex: '0 0 100%',
              minWidth: '0',
              maxWidth: '100%',
            }}>

            {/* Contenedor con scroll para la tabla */}
            <Table
                data={filteredOrders}
                columns={columns}
                keyField="id"
                loading={loadingOrders}
                emptyMessage={`No hay órdenes para los filtros seleccionados`}
                searchable={false}
                pagination={true}
                itemsPerPage={itemsPerPage}
                itemsPerPageOptions={[5]}
                onItemsPerPageChange={(newPerPage) => setItemsPerPage(newPerPage)}
                renderRow={renderRow}
                onRowClick={(item) => handleSelectOrder(item)}
                hoverable={true}
                striped={true}
                compact={false}
                toolbar={toolbar}
              />

          </section>

          {/* Panel Derecho - Detalle de orden */}
          <section className="card card-soft order-detail" style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div className="card-head">
              <h3>Detalle de Orden</h3>
            </div>

            {selectedOrder ? (
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                <div className="order-header-info" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
                  <div className="order-mesa" style={{ fontWeight: 600, fontSize: 'var(--font-md)' }}>
                    {selectedOrder.mesa_numero != null ? `Mesa ${selectedOrder.mesa_numero}` : 'Sin Mesa'}
                  </div>
                  <div className="order-number" style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>
                    Orden #{selectedOrder ? (() => {
                      const orderNumber = selectedOrder.order_number || selectedOrder.id.slice(0, 8);
                      const match = String(orderNumber).match(/\d+$/);
                      const displayNumber = match ? match[0] : orderNumber;
                      return displayNumber;
                    })() : 'Selecciona una orden'}
                  </div>
                  {editMode && <span className="edit-badge" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)', padding: '2px 10px', fontSize: 'var(--font-xs)', fontWeight: 600 }}>(Modo edición)</span>}
                </div>

                {editMode && (
                  <div className="edit-actions-bar" style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
                    <IconTextButton
                      variant="success"
                      size="sm"
                      icon={<FiPlus size={14} />}
                      onClick={() => setShowAddItemModal(true)}
                    >
                      Agregar producto
                    </IconTextButton>
                    <IconTextButton
                      variant=""
                      size="sm"
                      onClick={separarProductosPorUnidad}
                      title="Convertir productos con cantidad > 1 en items individuales"
                    >
                      Separar por unidad
                    </IconTextButton>
                    <IconTextButton
                      variant="info"
                      size="sm"
                      onClick={abrirDividirOrden}
                      title="Dividir esta orden en dos órdenes separadas"
                    >
                      Dividir orden
                    </IconTextButton>
                  </div>
                )}

                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                  <ItemsList
                    items={editMode
                      ? activeEditItems
                      : (() => {
                          const grupos = [];
                          (selectedOrder.items || []).forEach(dbItem => {
                            const notes = dbItem.notes || dbItem.notas || '';
                            if (notes.startsWith('__EXT__:')) {
                              if (grupos.length > 0) grupos[grupos.length - 1].extras.push({
                                id: dbItem.product_id,
                                name: dbItem.product_name,
                                selling_price: dbItem.selling_price,
                                tax_rate: dbItem.tax_rate,
                              });
                            } else {
                              grupos.push({
                                id: dbItem.id,
                                nombre: dbItem.product_name,
                                product_name: dbItem.product_name,
                                product_id: dbItem.product_id,
                                cantidad: dbItem.quantity || 1,
                                quantity: dbItem.quantity || 1,
                                selling_price: Number(dbItem.selling_price) || 0,
                                tax_rate: Number(dbItem.tax_rate) || 0,
                                notas: dbItem.notes || '',
                                extras: [],
                              });
                            }
                          });
                          return grupos;
                        })()
                    }
                    eliminarItem={editMode
                      ? (itemId) => setEditItems(prev => prev.map(it => it.id === itemId ? { ...it, _remove: true } : it))
                      : () => {}
                    }
                    abrirEditarItem={editMode ? abrirEditarItem : () => {}}
                  />
                </div>

                <div className="summary-sticky" style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                  <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-1) 0', fontSize: 'var(--font-sm)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
                    <span>{fmt(editMode ? editSubtotal : (selectedOrder.subtotal || 0))}</span>
                  </div>
                  <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-1) 0', fontSize: 'var(--font-sm)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>IVA:</span>
                    <span>{fmt(editMode ? editIva : (selectedOrder.tax_amount || 0))}</span>
                  </div>
                  <div className="summary-total" style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) 0', fontSize: 'var(--font-lg)', fontWeight: 700, borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 'var(--space-1)' }}>
                    <span>TOTAL:</span>
                    <span>{fmt(editMode ? editTotal : (selectedOrder.total || 0))}</span>
                  </div>
                </div>

                {editMode && (
                  <ButtonGroup>
                    <IconTextButton
                      variant=""
                      size="md"
                      icon={<FiX size={14} />}
                      onClick={handleCancelEdit}
                    >
                      Cancelar
                    </IconTextButton>
                    <IconTextButton
                      variant="success"
                      size="md"
                      icon={<FiSave size={14} />}
                      onClick={handleSaveEdit}
                      disabled={guardando}
                    >
                      {guardando ? 'Guardando...' : 'Guardar Cambios'}
                    </IconTextButton>
                  </ButtonGroup>
                )}
              </div>
            ) : (
              <div className="empty-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, color: 'var(--text-muted)', flex: 1 }}>
                <p>Selecciona una orden para ver, editar o imprimir</p>
              </div>
            )}
          </section>
        </div>

        {/* MODAL DIVIDIR ORDEN */}
        <Modal
          isOpen={showSplitModal}
          onClose={() => setShowSplitModal(false)}
          title="Dividir Orden"
          size="sm"
          footer={splitModalFooter}
        >
          <div style={{ padding: 'var(--space-2) 0' }}>
            {/* Información de la orden */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--space-3)',
              padding: 'var(--space-2) var(--space-3)',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '8px',
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Mesa {selectedOrder?.mesa_numero || 'Sin mesa'}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Orden #{selectedOrder?.order_number || selectedOrder?.id?.slice(0, 8)}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  {activeEditItems.length} producto(s)
                </span>
              </div>
            </div>

            {/* Instrucciones */}
            <p style={{
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
              marginBottom: 'var(--space-3)',
              padding: 'var(--space-2)',
              background: 'rgba(104,66,254,0.05)',
              borderRadius: '6px',
              border: '1px solid rgba(104,66,254,0.1)',
            }}>
              Selecciona los productos que deseas mover a la nueva orden.
              Debes dejar al menos un producto en la orden original.
            </p>

            {/* Checklist de productos */}
            <Checklist
              items={splitChecklistItems}
              value={selectedSplitItems}
              onChange={setSelectedSplitItems}
              mode="simple"
              variant="default"
              maxHeight={350}
              selectAll={true}
              renderItem={renderSplitItem}
              emptyMessage="No hay productos para dividir"
            />

            {/* Resumen de selección */}
            {someItemsSelected && (
              <div style={{
                marginTop: 'var(--space-3)',
                padding: 'var(--space-2) var(--space-3)',
                background: allItemsSelected
                  ? 'rgba(239,68,68,0.1)'
                  : 'rgba(104,66,254,0.1)',
                border: `1px solid ${
                  allItemsSelected
                    ? 'rgba(239,68,68,0.2)'
                    : 'rgba(104,66,254,0.2)'
                }`,
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{
                  color: allItemsSelected ? 'var(--text-muted)' : 'var(--text-muted)'
                }}>
                  {allItemsSelected
                    ? 'Debes dejar al menos un producto en la orden original'
                    : `${selectedSplitItems.length} producto(s) seleccionado(s) → Nueva orden`
                  }
                </span>
                <strong style={{ color: allItemsSelected ? 'var(--text-muted)' : 'var(--text-muted)' }}>
                  {fmt(selectedSplitTotal)}
                </strong>
              </div>
            )}
          </div>
        </Modal>

        <AddItemModal
          showAddItemModal={showAddItemModal}
          setShowAddItemModal={setShowAddItemModal}
          productos={productos}
          productoSeleccionado={productoSeleccionado}
          setProductoSeleccionado={setProductoSeleccionado}
          cantidadItem={cantidadItem}
          setCantidadItem={setCantidadItem}
          notasItem={notasItem}
          setNotasItem={setNotasItem}
          agregarItem={agregarItem}
          categorias={categorias}
          extrasItem={extrasItem}
          setExtrasItem={setExtrasItem}
        />

        <EditItemModal
          showEditItemModal={showEditItemModal}
          setShowEditItemModal={setShowEditItemModal}
          productos={productos}
          productoSeleccionado={productoSeleccionado}
          setProductoSeleccionado={setProductoSeleccionado}
          cantidadItem={cantidadItem}
          setCantidadItem={setCantidadItem}
          notasItem={notasItem}
          setNotasItem={setNotasItem}
          guardarEdicionItem={guardarEdicionItem}
          categorias={categorias}
          extrasItem={extrasItem}
          setExtrasItem={setExtrasItem}
        />

        {/* Modal de fechas personalizadas */}
        {showCustomDate && (
          <Modal
            isOpen={true}
            onClose={() => setShowCustomDate(false)}
            title="Seleccionar fechas"
            size="sm"
          >
            <DateRangePicker
              startDate={customStartDate}
              endDate={customEndDate}
              onApply={handleApplyCustomDate}
              onClose={() => setShowCustomDate(false)}
            />
          </Modal>
        )}
      </div>
    </PageTemplate>
  );
}