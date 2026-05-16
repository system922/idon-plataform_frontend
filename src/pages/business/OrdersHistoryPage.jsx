import React, { useState, useEffect } from 'react';
import { Search, X, Printer, Edit2, Trash2, Save, Calendar, RefreshCw } from 'react-feather';
import { useConfirm } from '../../context/ConfirmContext';
import PageTemplate from '../../components/PageTemplate';
import { useBusinessContext } from '../../admin/config/BusinessContext';
import { usePrinterService } from '../../services/usePrinterService';
import AddItemModal from '../../components/AddItemModal';
import EditItemModal from '../../components/EditItemModal';
import ItemsList from '../../components/ItemsList';
import { fetchWithAuth } from '../../config/apiBase';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import '../../styles/OrdersHistoryPage.css';
import '../../styles/CreateOrder.css';

const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`;

// --- Función para obtener fecha actual de Ecuador ---
const getEcuadorDate = () => {
  // Ecuador está en UTC-5 (todo el año, sin horario de verano)
  const now = new Date();
  const ecuadorDate = new Date(now.getTime() - (5 * 60 * 60 * 1000));
  return ecuadorDate.toISOString().split('T')[0];
};

// --- Función para obtener precio actual de un producto ---
const getProductPrice = async (productId) => {
  try {
    const res = await fetchWithAuth(`/api/products/${productId}`);
    if (res.ok) {
      const product = await res.json();
      return Number(product.selling_price) || Number(product.price) || 0;
    }
    return 0;
  } catch {
    return 0;
  }
};


export default function OrdersHistoryPage() {
  const { selectedBusiness } = useBusinessContext();
  const { print } = usePrinterService();
  const { showConfirm } = useConfirm();
  const [orders, setOrders] = useState([]);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editItems, setEditItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // 🔥 FECHA INICIAL EN ECUADOR
  const [filterDate, setFilterDate] = useState(() => getEcuadorDate());
  
  const [statusFilter, setStatusFilter] = useState('pending');
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidadItem, setCantidadItem] = useState(1);
  const [notasItem, setNotasItem] = useState('');
  const [itemEditando, setItemEditando] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [extrasItem, setExtrasItem] = useState([]);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitSelection, setSplitSelection] = useState(new Set());
  const [isSplitting, setIsSplitting] = useState(false);


  useEffect(() => {
    loadOrders();
    loadProductos();
    loadCategorias();
  }, [selectedBusiness, filterDate, statusFilter]);

  const loadProductos = async () => {
    try {
      const res = await fetchWithAuth('/api/products');
      const data = await res.json();
      setProductos(Array.isArray(data) ? data : data?.productos ?? data?.data ?? []);
    } catch (err) {

      setError('Error al cargar productos');
      setTimeout(() => setError(''), 3000);
    }
  };

  const loadCategorias = async () => {
    try {
      const res = await fetchWithAuth('/api/categories');
      const data = await res.json();
      setCategorias(Array.isArray(data) ? data : []);
    } catch (err) {

      setError('Error al cargar categorías');
      setTimeout(() => setError(''), 3000);
    }
  };

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

  // 🔥 FUNCIÓN CORREGIDA - Filtra por fecha usando comparación directa
  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const url = statusFilter ? `/api/ordenes?status=${statusFilter}` : '/api/ordenes';
      const response = await fetchWithAuth(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      let ordersArray = Array.isArray(data) ? data : (data?.data || data?.ordenes || data?.orders);
      
      if (!Array.isArray(ordersArray)) {
        throw new Error('La respuesta no contiene un array de órdenes');
      }

      // 🔥 Filtrar por fecha usando comparación directa de strings YYYY-MM-DD
      const filtered = ordersArray.filter(order => {
        const fecha = order.sale_date || order.created_at;
        if (!fecha) return false;
        
        // Convertir a fecha Ecuador (UTC-5) para comparar correctamente
        const orderDate = new Date(fecha).toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
        return orderDate === filterDate;
      });
      
      setOrders(filtered);
    } catch (err) {

      setError(`Error al cargar órdenes: ${err.message}`);
      setTimeout(() => setError(''), 3000);
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  useRealtimeSync('orders', loadOrders);

  const handleSelectOrder = async (order) => {
    if (editMode && selectedOrder?.id === order.id) return;

    try {
      const res = await fetchWithAuth(`/api/ordenes/${order.id}`);
      const fresh = res.ok ? await res.json() : order;
      const merged = { ...order, ...fresh, items: fresh.items || order.items || [] };
      const enrichedOrder = await enrichOrderItemsWithPrices(merged);
      setSelectedOrder(enrichedOrder);
    } catch {
      const enrichedOrder = await enrichOrderItemsWithPrices(order);
      setSelectedOrder(enrichedOrder);
    }
    setEditMode(false);
    setEditItems([]);
  };

  const handleEditOrder = async (order) => {
    let fresh = order;
    try {
      const res = await fetchWithAuth(`/api/ordenes/${order.id}`);
      if (res.ok) {
        const data = await res.json();
        fresh = { ...order, ...data, items: data.items || order.items || [] };
      }
    } catch {}
    const enrichedOrder = await enrichOrderItemsWithPrices(fresh);
    setSelectedOrder(enrichedOrder);
    setEditMode(true);

    // Agrupar items: los __EXT__: se adjuntan como extras del item anterior
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

  const handleRefresh = () => {
    loadOrders();
    if (selectedOrder) {
      handleSelectOrder(selectedOrder);
    }
    setSuccess('Órdenes actualizadas');
    setTimeout(() => setSuccess(''), 3000);
  };

  const groupItemsForPrint = (rawItems = []) => {
    const grouped = [];
    rawItems.forEach(dbItem => {
      const notes = dbItem.notes || dbItem.notas || '';
      if (notes.startsWith('__EXT__:')) {
        if (grouped.length > 0) grouped[grouped.length - 1].extras.push({ name: dbItem.product_name });
      } else {
        grouped.push({
          nombre: dbItem.product_name, cantidad: dbItem.quantity || 1,
          notas: notes, extras: [],
        });
      }
    });
    return grouped;
  };

  const handlePrintOriginalOrder = async (order) => {
    let items = Array.isArray(order.items) ? order.items : [];

    // Buscar orden completa con items si el listado no los trae
    if (items.length === 0) {
      try {
        const res = await fetchWithAuth(`/api/ordenes/${order.id}`);
        if (res.ok) {
          const data = await res.json();
          // el backend puede devolver la orden anidada o plana
          const fetched = data.order || data.pedido || data;
          items = fetched.items || fetched.pedido?.items || data.items || [];
        }
      } catch (e) {

      }
    }

    const result = await print('printer_ticket', 'comanda', {
      comanda: { number: order.order_number || order.id },
      table:   order.mesa_numero ?? order.numero_mesa,
      items,
      notes:   order.notas || order.notes || '',
    });

    if (result?.success === false) {
      setError(result.error || 'Error al reimprimir — verifica que QZ Tray esté activo');
      setTimeout(() => setError(''), 4000);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!await showConfirm('¿Seguro que deseas eliminar la orden?')) return;
    try {
      const res = await fetchWithAuth(`/api/ordenes/${orderId}`, { method: 'DELETE' });
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

  // ============================================
  // FUNCIONES DE EDICIÓN
  // ============================================
  
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
      `¿Separar ${itemsConMultiplesUnidades.length} producto(s) en unidades individuales? Esta operación solo guardará los cambios, NO imprimirá comanda.`
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
    setSuccess(`✅ ${itemsConMultiplesUnidades.length} producto(s) separados en ${nuevosItems.length} unidades`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const separarProductoIndividual = async (item) => {
    if (!editMode) return;
    
    const cantidad = item.cantidad || item.quantity || 1;
    if (cantidad <= 1) {
      setError('Este producto ya está como unidad individual');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    const confirmar = await showConfirm(
      `¿Separar "${item.nombre}" (${cantidad} unidades) en ${cantidad} items individuales? Esta operación solo guardará los cambios, NO imprimirá comanda.`
    );

    if (!confirmar) return;
    
    const nuevosItems = [];
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
    
    const nuevosEditItems = editItems.filter(it => it.id !== item.id);
    setEditItems([...nuevosEditItems, ...nuevosItems]);
    
    setSuccess(`✅ "${item.nombre}" separado en ${cantidad} unidades`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const abrirDividirOrden = () => {
    setSplitSelection(new Set());
    setShowSplitModal(true);
  };

  const toggleSplitItem = (itemId) => {
    setSplitSelection(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const confirmarDivision = async () => {
    if (splitSelection.size === 0) {
      setError('Selecciona al menos un producto para la nueva orden');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const itemsParaNueva = activeEditItems.filter(i => splitSelection.has(i.id));
    const itemsQueQuedan = activeEditItems.filter(i => !splitSelection.has(i.id));

    if (itemsQueQuedan.length === 0) {
      setError('Debes dejar al menos un producto en la orden original');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      setIsSplitting(true);

      const toItems = (list) => list.flatMap(item => {
        const base = { product_id: item.product_id, quantity: item.quantity || item.cantidad || 1, notes: item.notas || null };
        const extras = (item.extras || []).map(e => ({
          product_id: e.id || e.product_id,
          quantity: item.quantity || item.cantidad || 1,
          notes: `__EXT__: + ${e.name}${e.nota ? ': ' + e.nota : ''}`,
        }));
        return [base, ...extras];
      });

      const calcTotals = (list) => {
        const subtotal = list.reduce((s, i) => s + (Number(i.selling_price) || 0) * (i.cantidad || i.quantity || 1), 0);
        const iva = list.reduce((s, i) => s + (Number(i.tax_rate) || 0) * (i.cantidad || i.quantity || 1), 0);
        return { subtotal, iva, total: subtotal + iva };
      };

      const nuevaTotals = calcTotals(itemsParaNueva);
      const quedaTotals = calcTotals(itemsQueQuedan);

      // Calcular sufijo: contar órdenes que ya son divisiones de esta (mismo número base o con _N)
      const baseNumber = selectedOrder.order_number || selectedOrder.id.slice(0, 8);
      const baseClean = baseNumber.replace(/_\d+$/, ''); // quitar sufijo previo si lo tiene
      const existentes = orders.filter(o => {
        const n = o.order_number || '';
        return n === baseClean || n.startsWith(baseClean + '_');
      });
      const nextSuffix = existentes.length; // 1, 2, 3...
      const newOrderNumber = `${baseClean}_${nextSuffix}`;

      // 1. Crear nueva orden
      const resNueva = await fetchWithAuth('/api/ordenes', {
        method: 'POST',
        body: JSON.stringify({
          numero_mesa: selectedOrder.mesa_numero,
          mesa_id: selectedOrder.mesa_id,
          order_type: selectedOrder.order_type || 'dine_in',
          order_number: newOrderNumber,
          items: toItems(itemsParaNueva),
          notas: `División de #${baseClean}`,
        }),
      });

      if (!resNueva.ok) {
        const d = await resNueva.json();
        throw new Error(d.error || 'Error al crear nueva orden');
      }

      // 2. Actualizar orden original
      const resOriginal = await fetchWithAuth(`/api/ordenes/${selectedOrder.id}`, {
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
      setSplitSelection(new Set());
      setShowSplitModal(false);
      setSuccess(`✅ Orden dividida. Nueva orden creada con ${itemsParaNueva.length} producto(s)`);
      setTimeout(() => setSuccess(''), 5000);
      await loadOrders();
    } catch (err) {
      setError(err.message || 'Error al dividir la orden');
      setTimeout(() => setError(''), 4000);
    } finally {
      setIsSplitting(false);
    }
  };

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
    if (isSaving) return;
    if (!productoSeleccionado || cantidadItem <= 0) {
      setError('Selecciona un producto y cantidad válida');
      setTimeout(() => setError(''), 3000);
      return;
    }
    const sellingPrice = Number(productoSeleccionado.selling_price || productoSeleccionado.price) || 0;
    const taxRate      = Number(productoSeleccionado.tax_rate) || 0;
    const cantidad     = parseInt(cantidadItem, 10);

    setEditItems(prev => prev.map(item => item.id === itemEditando.id ? {
      ...itemEditando,
      nombre:        productoSeleccionado.name,
      product_name:  productoSeleccionado.name,
      product_id:    productoSeleccionado.id,
      cantidad,
      quantity:      cantidad,
      selling_price: sellingPrice,
      tax_rate:      taxRate,
      notas:         notasItem,
      extras:        extrasItem,
      _modified:     true,
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

  const agregarItem = () => {
    if (!productoSeleccionado || cantidadItem <= 0) {
      setError('Selecciona un producto y cantidad válida');
      setTimeout(() => setError(''), 3000);
      return;
    }
    const sellingPrice = Number(productoSeleccionado.selling_price || productoSeleccionado.price) || 0;
    const taxRate      = Number(productoSeleccionado.tax_rate) || 0;
    const cantidad     = parseInt(cantidadItem, 10);

    setEditItems(prev => [...prev, {
      id:            Date.now(),
      nombre:        productoSeleccionado.name,
      product_name:  productoSeleccionado.name,
      product_id:    productoSeleccionado.id,
      cantidad,
      quantity:      cantidad,
      selling_price: sellingPrice,
      tax_rate:      taxRate,
      notas:         notasItem,
      extras:        extrasItem,
      _added:        true,
    }]);

    setShowAddItemModal(false);
    setProductoSeleccionado(null);
    setCantidadItem(1);
    setNotasItem('');
    setExtrasItem([]);
    setSuccess('Producto agregado');
    setTimeout(() => setSuccess(''), 2000);
  };

  const handleSaveEdit = async () => {
    if (isSaving) return;
    
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
      setIsSaving(true);

      // Aplanar extras como items independientes (igual que al crear orden)
      const itemsToSend = remainingItems.flatMap(item => {
        const base = {
          product_id: item.product_id,
          quantity:   item.quantity || item.cantidad,
          notes:      item.notas || null,
        };
        const extras = (item.extras || []).map(e => ({
          product_id: e.id || e.product_id,
          quantity:   item.quantity || item.cantidad,
          notes:      `__EXT__: + ${e.name}${e.nota ? ': ' + e.nota : ''}`,
        }));
        return [base, ...extras];
      });

      const res = await fetchWithAuth(`/api/ordenes/${selectedOrder.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          items:      itemsToSend,
          subtotal:   editSubtotal,
          tax_amount: editIva,
          total:      editTotal,
        }),
      });

      if (!res.ok) throw new Error('Error al actualizar orden');

      const resData = await res.json();
      const updatedOrder = {
        ...selectedOrder,
        subtotal:   resData.subtotal   ?? selectedOrder.subtotal,
        tax_amount: resData.tax_amount ?? selectedOrder.tax_amount,
        total:      resData.total      ?? selectedOrder.total,
        items:      remainingItems,
      };

      // Guardar datos de la orden antes de limpiar el estado
      const orderSnapshot = { ...selectedOrder };

      setEditMode(false);
      setEditItems([]);
      setSelectedOrder(null);
      setSuccess('✅ Orden guardada correctamente');
      setTimeout(() => setSuccess(''), 4000);

      // Recargar el listado y esperar a que termine
      await loadOrders();

      // Preguntar si desea imprimir la comanda modificada
      const imprimirMod = await showConfirm('¿Deseas imprimir la comanda modificada?', {
        title:       'Imprimir comanda',
        danger:      false,
        confirmText: 'Imprimir',
        cancelText:  'No imprimir',
      });

      if (imprimirMod) {
        const tipoOrden = orderSnapshot.order_type === 'dine_in' ? 'LOCAL'
          : orderSnapshot.order_type === 'take_away' ? 'LLEVAR' : 'DELIVERY';
        const printResult = await print('printer_ticket', 'comanda-mod', {
          mesa:      orderSnapshot.mesa_numero,
          orden:     orderSnapshot.order_number || orderSnapshot.id.slice(0, 8),
          tipoOrden,
          items:     remainingItems,
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
      setIsSaving(false);
    }
  };

  const activeEditItems = editItems.filter(i => !i._remove);

  const editSubtotal = activeEditItems.reduce((s, item) => {
    const qty        = item.cantidad || item.quantity || 1;
    const base       = (Number(item.selling_price) || 0) * qty;
    const extrasBase = (item.extras || []).reduce((es, e) => es + (Number(e.selling_price) || Number(e.price) || 0), 0) * qty;
    return s + base + extrasBase;
  }, 0);

  const editIva = activeEditItems.reduce((s, item) => {
    const qty       = item.cantidad || item.quantity || 1;
    const iva       = (Number(item.tax_rate) || 0) * qty;
    const extrasIva = (item.extras || []).reduce((es, e) => es + (Number(e.tax_rate) || 0), 0) * qty;
    return s + iva + extrasIva;
  }, 0);

  const editTotal = editSubtotal + editIva;

  const filteredOrders = orders.filter(order =>
    (order.mesa_numero?.toString() || '').includes(searchTerm) ||
    (order.order_number?.toString() || '').includes(searchTerm) ||
    order.id.toString().includes(searchTerm)
  );

  const estadosDisponibles = [
    { value: 'pending', label: 'Pendientes', color: 'warning' },
    { value: 'paid', label: 'Pagadas', color: 'success' },
    { value: 'cancelled', label: 'Canceladas', color: 'danger' },
    { value: '', label: 'Todas', color: 'info' },
  ];

  const getItemTotal = (item) => {
    return Number(item.line_total) || Number(item.subtotal) || 0;
  };

  return (
    <PageTemplate
      title="Historial de Órdenes"
      subtitle={`${filteredOrders.length} orden${filteredOrders.length !== 1 ? 'es' : ''} encontradas • Fecha: ${filterDate}`}
      headerAction={
        <button className="btn-refresh" onClick={handleRefresh} disabled={loadingOrders}>
          <RefreshCw size={16} className={loadingOrders ? 'spin' : ''} />
          Actualizar
        </button>
      }
    >
      <div className="checkout-shell">
        {error && (
          <div className="alert alert-error">
            <X size={16} />
            {error}
          </div>
        )}
        {success && (
          <div className="alert alert-success">
            <RefreshCw size={16} />
            {success}
          </div>
        )}

        <div className="order-grid">
          {/* Panel Izquierdo - Lista de órdenes */}
          <div className="card-soft orders-list">
            <div className="card-head">
              <h3>📋 Historial de órdenes</h3>
              <p>Órdenes registradas en el sistema</p>
            </div>

            <div className="filters-container">
              <div className="filter-date-container">
                <Calendar size={16} />
                <input
                  type="date"
                  className="filter-input"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                />
              </div>

              <div className="filter-status-container">
                <select
                  className="filter-input"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  {estadosDisponibles.map(estado => (
                    <option key={estado.value || 'all'} value={estado.value}>
                      {estado.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="search-box">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Buscar mesa o #orden..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="orders-table">
              {loadingOrders ? (
                <div className="empty-state"><p>Cargando órdenes...</p></div>
              ) : filteredOrders.length === 0 ? (
                <div className="empty-state">
                  <p>No hay órdenes para el día {filterDate}</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>MESA</th>
                      <th>ORDEN</th>
                      <th>ESTADO</th>
                      <th>ITEMS</th>
                      <th>ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(order => (
                      <tr
                        key={order.id}
                        className={selectedOrder?.id === order.id ? 'selected' : ''}
                        onClick={() => handleSelectOrder(order)}
                      >
                        <td className="mesa-num" data-label="Mesa">
                          {order.mesa_numero != null ? `Mesa ${order.mesa_numero}` : 'S/Mesa'}
                        </td>
                        <td data-label="Orden">
                          <small>#{order.order_number || order.id.slice(0,8)}</small>
                        </td>
                        <td data-label="Estado">
                          <span className={`badge badge-${order.status === 'paid' ? 'success' : order.status === 'pending' ? 'warning' : 'danger'}`}>
                            {order.status === 'paid' ? 'Pagada' : order.status === 'pending' ? 'Pendiente' : order.status}
                          </span>
                        </td>
                        <td data-label="Items">{order.items?.filter(i => !(i.notes||'').startsWith('__EXT__:')).length || 0}</td>
                        <td data-label="Acciones" onClick={e => e.stopPropagation()}>
                          <div className="action-buttons">
                            <button
                              className="btn-action btn-edit"
                              onClick={() => handleEditOrder(order)}
                              disabled={editMode}
                            >
                              <Edit2 size={13} /><span>Editar</span>
                            </button>
                            <button className="btn-action btn-delete" onClick={() => handleDeleteOrder(order.id)}>
                              <Trash2 size={13} /><span>Eliminar</span>
                            </button>
                            <button className="btn-action btn-reprint" onClick={() => handlePrintOriginalOrder(order)}>
                              <Printer size={13} /><span>Reimprimir</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Panel Derecho - Detalle de orden */}
          <div className="card-soft order-detail">
            <div className="card-head">
              <h3>📄 Detalle de la orden</h3>
              <p>{selectedOrder ? `Orden ${selectedOrder.order_number || selectedOrder.id.slice(0,8)}` : 'Selecciona una orden'}</p>
            </div>

            {selectedOrder ? (
              <>
                <div className="order-header-info">
                  <div className="order-mesa">
                    {selectedOrder.mesa_numero != null ? `Mesa ${selectedOrder.mesa_numero}` : 'Sin Mesa'}
                  </div>
                  <div className="order-number">
                    #{selectedOrder.order_number || selectedOrder.id.slice(0,8)}
                  </div>
                  {editMode && <span className="edit-badge">✏️ Modo edición</span>}
                </div>

                {editMode && (
                  <div className="edit-actions-bar">
                    <button className="btn-add-product" onClick={() => setShowAddItemModal(true)}>
                      + Agregar producto
                    </button>
                    <button
                      className="btn-separar-productos"
                      onClick={separarProductosPorUnidad}
                      title="Convertir productos con cantidad > 1 en items individuales"
                    >
                      🔄 Separar productos por unidad
                    </button>
                    <button
                      className="btn-separar-productos"
                      onClick={abrirDividirOrden}
                      title="Dividir esta orden en dos órdenes separadas"
                      style={{ background: 'rgba(104,66,254,0.15)', borderColor: 'rgba(104,66,254,0.4)', color: '#a78bfa' }}
                    >
                      ✂️ Dividir orden
                    </button>
                  </div>
                )}

                <ItemsList
                  items={editMode
                    ? activeEditItems
                    : (() => {
                        const grupos = [];
                        (selectedOrder.items || []).forEach(dbItem => {
                          const notes = dbItem.notes || dbItem.notas || '';
                          if (notes.startsWith('__EXT__:')) {
                            if (grupos.length > 0) grupos[grupos.length - 1].extras.push({
                              id: dbItem.product_id, name: dbItem.product_name,
                              selling_price: dbItem.selling_price, tax_rate: dbItem.tax_rate,
                            });
                          } else {
                            grupos.push({
                              id: dbItem.id, nombre: dbItem.product_name,
                              product_name: dbItem.product_name, product_id: dbItem.product_id,
                              cantidad: dbItem.quantity || 1, quantity: dbItem.quantity || 1,
                              selling_price: Number(dbItem.selling_price) || 0,
                              tax_rate: Number(dbItem.tax_rate) || 0,
                              notas: dbItem.notes || '', extras: [],
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

                <div className="summary-sticky">
                  <div className="summary-row">
                    <span>Subtotal:</span>
                    <span>{fmt(editMode ? editSubtotal : (selectedOrder.subtotal || 0))}</span>
                  </div>
                  <div className="summary-row">
                    <span>IVA:</span>
                    <span>{fmt(editMode ? editIva : (selectedOrder.tax_amount || 0))}</span>
                  </div>
                  <div className="summary-total">
                    <span>TOTAL:</span>
                    <span>{fmt(editMode ? editTotal : (selectedOrder.total || 0))}</span>
                  </div>
                </div>

                {editMode && (
                  <div className="action-buttons-group">
                    <button className="btn-save" onClick={handleSaveEdit} disabled={isSaving}>
                      <Save size={14} /> {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                    <button className="btn-cancel-edit" onClick={() => { setEditMode(false); setEditItems([]); }}>
                      <X size={14} /> Cancelar
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-panel">
                <p>Selecciona una orden para ver, editar o imprimir</p>
              </div>
            )}
          </div>
        </div>

        {/* MODAL DIVIDIR ORDEN */}
        {showSplitModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: '#111827', border: '1px solid #1e3a3a', borderRadius: 16, padding: 24, width: 500, maxWidth: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: 17, fontWeight: 700 }}>✂️ Dividir Orden</h3>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                    Mesa {selectedOrder?.mesa_numero} · #{selectedOrder?.order_number || selectedOrder?.id?.slice(0,8)}
                    &nbsp;·&nbsp;Selecciona los productos para la <strong style={{ color: '#a78bfa' }}>nueva orden</strong>
                  </p>
                </div>
                <button onClick={() => setShowSplitModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: 2 }}>&times;</button>
              </div>

              {/* Controles selección */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setSplitSelection(new Set(activeEditItems.map(i => i.id)))}
                  style={{ fontSize: 12, padding: '5px 12px', background: 'rgba(104,66,254,0.12)', color: '#a78bfa', border: '1px solid rgba(104,66,254,0.3)', borderRadius: 6, cursor: 'pointer' }}
                >
                  Seleccionar todo
                </button>
                <button
                  onClick={() => setSplitSelection(new Set())}
                  style={{ fontSize: 12, padding: '5px 12px', background: 'rgba(100,116,139,0.12)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.25)', borderRadius: 6, cursor: 'pointer' }}
                >
                  Limpiar
                </button>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b', alignSelf: 'center' }}>
                  {activeEditItems.length} producto(s) en total
                </span>
              </div>

              {/* Lista de items */}
              <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {activeEditItems.map(item => {
                  const selected = splitSelection.has(item.id);
                  const qty = item.cantidad || item.quantity || 1;
                  const subtotal = (Number(item.selling_price) || 0) * qty;
                  const iva = (Number(item.tax_rate) || 0) * qty;
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleSplitItem(item.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                        background: selected ? 'rgba(104,66,254,0.12)' : 'rgba(255,255,255,0.03)',
                        border: `1.5px solid ${selected ? '#6842fe' : 'rgba(255,255,255,0.07)'}`,
                        borderRadius: 10, cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
                      }}
                    >
                      <div style={{
                        width: 20, height: 20, borderRadius: 5, border: `2px solid ${selected ? '#6842fe' : '#334155'}`,
                        background: selected ? '#6842fe' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {selected && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.nombre || item.product_name}
                        </div>
                        {item.notas && (
                          <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>{item.notas}</div>
                        )}
                        {(item.extras || []).length > 0 && (
                          <div style={{ color: '#6ee7b7', fontSize: 11, marginTop: 2 }}>
                            + {item.extras.map(e => e.name).join(', ')}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ color: '#94a3b8', fontSize: 11 }}>x{qty}</div>
                        <div style={{ color: '#10b981', fontWeight: 700, fontSize: 13 }}>{fmt(subtotal + iva)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Resumen selección */}
              {splitSelection.size > 0 && (() => {
                const selItems = activeEditItems.filter(i => splitSelection.has(i.id));
                const total = selItems.reduce((s, i) => {
                  const qty = i.cantidad || i.quantity || 1;
                  return s + (Number(i.selling_price) || 0) * qty + (Number(i.tax_rate) || 0) * qty;
                }, 0);
                return (
                  <div style={{ background: 'rgba(104,66,254,0.1)', border: '1px solid rgba(104,66,254,0.25)', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: '#a78bfa' }}>{splitSelection.size} producto(s) → nueva orden</span>
                    <strong style={{ color: '#a78bfa' }}>{fmt(total)}</strong>
                  </div>
                );
              })()}

              {/* Acciones */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowSplitModal(false)}
                  disabled={isSplitting}
                  style={{ padding: '10px 20px', background: 'rgba(100,116,139,0.15)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.25)', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarDivision}
                  disabled={isSplitting || splitSelection.size === 0 || splitSelection.size === activeEditItems.length}
                  style={{
                    padding: '10px 20px',
                    background: (isSplitting || splitSelection.size === 0 || splitSelection.size === activeEditItems.length) ? 'rgba(104,66,254,0.3)' : '#6842fe',
                    color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13,
                    cursor: (isSplitting || splitSelection.size === 0 || splitSelection.size === activeEditItems.length) ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 7,
                  }}
                >
                  ✂️ {isSplitting ? 'Creando orden...' : `Crear Nueva Orden${splitSelection.size > 0 ? ` (${splitSelection.size})` : ''}`}
                </button>
              </div>

              {splitSelection.size === activeEditItems.length && activeEditItems.length > 0 && (
                <p style={{ margin: 0, fontSize: 11, color: '#f87171', textAlign: 'center' }}>
                  Debes dejar al menos un producto en la orden original
                </p>
              )}
            </div>
          </div>
        )}

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
      </div>
    </PageTemplate>
  );
}