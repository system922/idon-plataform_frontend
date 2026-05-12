import React, { useState, useEffect } from 'react';
import { Search, X, Printer, Edit2, Trash2, Save, Calendar, RefreshCw } from 'react-feather';
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
      console.error('Error al cargar productos:', err);
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
      console.error('Error al cargar categorías:', err);
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
        
        // Obtener solo la parte YYYY-MM-DD de la fecha de la orden
        const orderDate = fecha.split('T')[0];
        
        // Comparar con filterDate (que ya está en formato YYYY-MM-DD de Ecuador)
        return orderDate === filterDate;
      });
      
      setOrders(filtered);
    } catch (err) {
      console.error(err);
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
    
    const enrichedOrder = await enrichOrderItemsWithPrices(order);
    setSelectedOrder(enrichedOrder);
    setEditMode(false);
    setEditItems([]);
  };

  const handleEditOrder = async (order) => {
    const enrichedOrder = await enrichOrderItemsWithPrices(order);
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
    const enrichedOrder = await enrichOrderItemsWithPrices(order);
    const grouped = groupItemsForPrint(enrichedOrder.items);
    const tipoOrden = order.order_type === 'dine_in' ? 'LOCAL' : order.order_type === 'take_away' ? 'LLEVAR' : 'DELIVERY';
    await print('printer_comanda', 'comanda-mod', {
      mesa:      order.mesa_numero,
      orden:     order.order_number || order.id.slice(0, 8),
      tipoOrden,
      items:     grouped,
    });
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('¿Seguro que deseas eliminar la orden?')) return;
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
  
  const separarProductosPorUnidad = () => {
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

    const confirmar = window.confirm(
      `¿Separar ${itemsConMultiplesUnidades.length} producto(s) en unidades individuales?\n\n` +
      itemsConMultiplesUnidades.map(i => 
        `• ${i.nombre}: ${i.cantidad || i.quantity} unidades → se convertirá en ${i.cantidad || i.quantity} items`
      ).join('\n') +
      '\n\n⚠️ Esta operación solo guardará los cambios, NO imprimirá comanda.'
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

  const separarProductoIndividual = (item) => {
    if (!editMode) return;
    
    const cantidad = item.cantidad || item.quantity || 1;
    if (cantidad <= 1) {
      setError('Este producto ya está como unidad individual');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    const confirmar = window.confirm(
      `¿Separar "${item.nombre}" (${cantidad} unidades) en ${cantidad} items individuales?\n\n⚠️ Esta operación solo guardará los cambios, NO imprimirá comanda.`
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

      setSelectedOrder(updatedOrder);

      // Siempre intentar imprimir la comanda modificada
      const tipoOrden = selectedOrder.order_type === 'dine_in' ? 'LOCAL' : selectedOrder.order_type === 'take_away' ? 'LLEVAR' : 'DELIVERY';
      const printResult = await print('printer_comanda', 'comanda-mod', {
        mesa:      selectedOrder.mesa_numero,
        orden:     selectedOrder.order_number || selectedOrder.id.slice(0, 8),
        tipoOrden,
        items:     remainingItems,
      });

      if (printResult?.success === false) {
        setSuccess('✅ Orden guardada — ⚠️ No se pudo imprimir (QZ Tray no conectado)');
      } else {
        setSuccess('✅ Orden guardada y comanda enviada a cocina');
      }
      
      setEditMode(false);
      setEditItems([]);
      setSelectedOrder(null);

      setTimeout(() => setSuccess(''), 5000);
      loadOrders();
    } catch (err) {
      console.error(err);
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
        <div className="header-actions">
          <button className="btn-refresh" onClick={handleRefresh} disabled={loadingOrders}>
            <RefreshCw size={16} className={loadingOrders ? 'spin' : ''} />
            Actualizar
          </button>
        </div>
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
                            <button className="btn-action btn-print" onClick={() => handlePrintOriginalOrder(order)}>
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