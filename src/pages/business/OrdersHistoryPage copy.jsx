import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Printer, Edit2, Trash2, Save, Calendar, RefreshCw } from 'react-feather';
import qz from 'qz-tray';
import PageTemplate from '../../components/PageTemplate';
import { useBusinessContext } from '../../admin/config/BusinessContext';
import AddItemModal from '../../components/AddItemModal';
import EditItemModal from '../../components/EditItemModal';
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/OrdersHistoryPage.css';

// --- Helpers de impresión ---
const PRINTER_NAME = 'POS-58';
const WIDTH = 32;
const line = () => '='.repeat(WIDTH);
const sep = () => '-'.repeat(WIDTH);
const center = (txt) => {
  const t = String(txt || '').trim();
  const pad = Math.max(0, Math.floor((WIDTH - t.length) / 2));
  return ' '.repeat(pad) + t;
};
const wrap = (txt, width = WIDTH) => {
  const str = String(txt ?? '').trim();
  if (!str) return [];
  const words = str.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (next.length <= width) cur = next;
    else { if (cur) lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  return lines;
};

const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`;

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

// --- Comanda modificada estilo cocina ---
function buildModificationComanda({
  mesaNum,
  ordenNum,
  tipoOrden = 'LOCAL',
  hora,
  removed = [],
  added = [],
  remaining = [],
}) {
  let out = '';
  out += line() + '\n';
  out += center('***** COMANDA MODIFICADA *****') + '\n';
  out += line() + '\n';
  if (mesaNum) {
    out += center(`MESA ${mesaNum}`) + '\n';
    out += sep() + '\n';
  }
  out += center(`ORDEN ${ordenNum || 'N/A'}`) + '\n';
  out += sep() + '\n';
  out += center(`${tipoOrden} • ${hora}`) + '\n';
  out += line() + '\n';

  if (remaining.length) {
    out += center('PRODUCTOS ACTUALES') + '\n';
    out += sep() + '\n';
    remaining.forEach((item) => {
      const qty = item.cantidad || item.quantity || 1;
      const name = String(item.nombre || item.product_name || 'Producto').toUpperCase();
      out += `${qty}x ${name}\n`;
      if (item.notas || item.notes) {
        out += ` - ${item.notas || item.notes}\n`;
      }
      out += sep() + '\n';
    });
  }

  if (removed.length) {
    out += center('PRODUCTOS REMOVIDOS') + '\n';
    out += sep() + '\n';
    removed.forEach((item) => {
      const qty = item.cantidad || item.quantity || 1;
      const name = String(item.nombre || item.product_name || 'Producto').toUpperCase();
      out += `${qty}x ~~${name}~~\n`;
      out += sep() + '\n';
    });
  }

  if (added.length) {
    out += center('PRODUCTOS AGREGADOS') + '\n';
    out += sep() + '\n';
    added.forEach((item) => {
      const qty = item.cantidad || item.quantity || 1;
      const name = String(item.nombre || item.product_name || 'Producto').toUpperCase();
      out += `${qty}x ${name} [NUEVO]\n`;
      if (item.notas || item.notes) {
        out += ` - ${item.notas || item.notes}\n`;
      }
      out += sep() + '\n';
    });
  }

  out += center('(Fin de modificación)') + '\n';
  out += line() + '\n';
  out += '\n\n\n\n\n';
  return out;
}

export default function OrdersHistoryPage() {
  const { selectedBusiness } = useBusinessContext();
  const [orders, setOrders] = useState([]);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editItems, setEditItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [printerConnected, setPrinterConnected] = useState(false);
  const [filterDate, setFilterDate] = useState(() => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
  });
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

  // Conexión QZ Tray
  useEffect(() => {
    (async () => {
      try {
        if (qz.websocket.isActive()) {
          setPrinterConnected(true);
          return;
        }
        const certData = await fetchWithAuth('/api/print/cert').then(r => r.text());
        qz.security.setCertificatePromise(async () => certData);
        qz.security.setSignaturePromise(async (toSign) => {
          const r = await fetchWithAuth('/api/print/sign', {
            method: 'POST',
            body: JSON.stringify({ data: toSign }),
          });
          const { signature } = await r.json();
          return signature;
        });
        await qz.websocket.connect({
          host: 'localhost',
          port: { secure: [8183, 8184], insecure: [8182] },
          usingSecure: window.location.protocol === 'https:',
        });
        setPrinterConnected(true);
      } catch (e) {

        setPrinterConnected(false);
      }
    })();
  }, []);

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

      const filtered = ordersArray.filter(order => {
        const fecha = order.sale_date || order.created_at;
        if (!fecha) return false;
        
        const orderDateObj = new Date(fecha);
        if (isNaN(orderDateObj.getTime())) return false;
        
        const orderDate = orderDateObj.toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
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

  const handleSelectOrder = async (order) => {
    if (editMode && selectedOrder?.id === order.id) return;
    
    const enrichedOrder = await enrichOrderItemsWithPrices(order);
    setSelectedOrder(enrichedOrder);
    setEditMode(false);
    setEditItems([]);
  };

  // 🔥 FUNCIÓN CORREGIDA - Cargar items para edición con todos los campos necesarios
  const handleEditOrder = async (order) => {
    const enrichedOrder = await enrichOrderItemsWithPrices(order);
    setSelectedOrder(enrichedOrder);
    setEditMode(true);
    
    // Crear editItems con la misma estructura que TakeOrderPageNew
    const itemsParaEditar = enrichedOrder.items.map(i => ({ 
      id: i.id || Date.now() + Math.random(),
      nombre: i.nombre || i.product_name,
      product_name: i.product_name || i.nombre,
      product_id: i.product_id,
      cantidad: i.quantity || i.cantidad || 1,
      quantity: i.quantity || i.cantidad || 1,
      precio: i.unit_price || i.price || i.selling_price || 0,
      unit_price: i.unit_price || i.price || i.selling_price || 0,
      subtotal: (i.unit_price || i.price || i.selling_price || 0) * (i.quantity || i.cantidad || 1),
      line_total: (i.unit_price || i.price || i.selling_price || 0) * (i.quantity || i.cantidad || 1),
      notas: i.notas || i.notes || '',
      extras: i.extras || [],
      tax_rate: i.tax_rate || 0,
    }));
    
    setEditItems(itemsParaEditar);
  };

  const handleRefresh = () => {
    loadOrders();
    if (selectedOrder) {
      handleSelectOrder(selectedOrder);
    }
    setSuccess('Órdenes actualizadas');
    setTimeout(() => setSuccess(''), 3000);
  };

  const printModificationTicket = async (order, removedItems, addedItems, remainingItems) => {
    const horaStr = new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
    const texto = buildModificationComanda({
      mesaNum: order.mesa_numero,
      ordenNum: order.order_number || order.id.slice(0,8),
      tipoOrden: order.order_type === 'dine_in' ? 'LOCAL' : order.order_type === 'take_away' ? 'LLEVAR' : 'DELIVERY',
      hora: horaStr,
      removed: removedItems,
      added: addedItems,
      remaining: remainingItems,
    });

    try {
      if (printerConnected) {
        const config = qz.configs.create(PRINTER_NAME);
        await qz.print(config, [texto]);
        setSuccess('Comanda modificada enviada a la impresora');
      } else {
        const escaped = texto.split('\n').map(l => l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')).join('\n');
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Comanda Modificada</title>
<style>@page { margin:3mm; size:58mm auto; } body { font-family:'Courier New',monospace; font-size:9pt; white-space:pre; width:50mm; margin:0 auto; color:#000; line-height:1.3; }</style></head><body>${escaped}</body></html>`;
        const w = window.open('', '_blank', 'width=300,height=700,toolbar=0,menubar=0');
        if (w) {
          w.document.write(html);
          w.document.close();
          setTimeout(() => {
            w.focus();
            w.print();
          }, 300);
          setSuccess('Comanda enviada a impresión web');
        } else {
          throw new Error('No se pudo abrir ventana de impresión');
        }
      }
    } catch (e) {
      setError(`Error de impresión: ${e.message}`);
    }
    setTimeout(() => {
      setSuccess('');
      setError('');
    }, 3000);
  };

  const handlePrintOriginalOrder = async (order) => {
    await printModificationTicket(order, [], [], order.items);
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
  // FUNCIONES DE EDICIÓN (igual que TakeOrderPageNew)
  // ============================================
  const abrirEditarItem = (item) => {
    setItemEditando(item);
    setProductoSeleccionado({
      id: item.product_id,
      name: item.nombre || item.product_name,
      price: item.precio || item.unit_price || 0,
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
    
    const precio = Number(productoSeleccionado.price) || 0;
    const taxRate = Number(productoSeleccionado.tax_rate) || 0;
    const cantidad = parseInt(cantidadItem, 10);
    const extrasUnitCost = extrasItem.reduce((s, e) => s + (Number(e.price) || 0), 0);
    const totalUnit = precio + extrasUnitCost;
    
    const itemActualizado = {
      ...itemEditando,
      nombre: productoSeleccionado.name,
      precio: precio,
      tax_rate: taxRate,
      cantidad: cantidad,
      subtotal: totalUnit * cantidad,
      notas: notasItem,
      extras: extrasItem,
      product_id: productoSeleccionado.id,
      product_name: productoSeleccionado.name,
      quantity: cantidad,
      unit_price: precio,
      line_total: totalUnit * cantidad,
    };
    
    setEditItems(prev => prev.map(item =>
      item.id === itemEditando.id ? itemActualizado : item
    ));
    
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
    
    const precio = Number(productoSeleccionado.price) || 0;
    const taxRate = Number(productoSeleccionado.tax_rate) || 0;
    const cantidad = parseInt(cantidadItem, 10);
    const extrasUnitCost = extrasItem.reduce((s, e) => s + (Number(e.price) || 0), 0);
    const totalUnit = precio + extrasUnitCost;
    
    const nuevoItem = {
      id: Date.now(),
      nombre: productoSeleccionado.name,
      precio: precio,
      tax_rate: taxRate,
      cantidad: cantidad,
      subtotal: totalUnit * cantidad,
      notas: notasItem,
      extras: extrasItem,
      product_id: productoSeleccionado.id,
      product_name: productoSeleccionado.name,
      quantity: cantidad,
      unit_price: precio,
      line_total: totalUnit * cantidad,
    };
    
    setEditItems(prev => [...prev, nuevoItem]);
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
    try {
      setIsSaving(true);
      const remainingItems = editItems.filter(i => !i._remove);
      
      const subtotal = remainingItems.reduce((s, i) => s + (Number(i.line_total) || Number(i.subtotal) || 0), 0);
      const itemsToSend = remainingItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        notes: item.notas || null
      }));
      
      const res = await fetchWithAuth(`/api/ordenes/${selectedOrder.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          items: itemsToSend,
          subtotal: subtotal
        }),
      });

      if (!res.ok) throw new Error('Error al actualizar orden');

      const updatedOrder = {
        ...selectedOrder,
        items: remainingItems,
        subtotal: subtotal
      };
      
      setSelectedOrder(updatedOrder);
      setEditMode(false);
      setEditItems([]);
      
      // Imprimir comanda modificada después de guardar
      const originalItems = selectedOrder.items || [];
      const removedItems = originalItems.filter(orig => 
        !remainingItems.some(curr => curr.id === orig.id)
      );
      const addedItems = remainingItems.filter(curr => curr._added);
      await printModificationTicket(selectedOrder, removedItems, addedItems, remainingItems);
      
      setSuccess('Orden modificada correctamente');
      setTimeout(() => setSuccess(''), 3000);
      loadOrders();
    } catch (err) {

      setError('Error al guardar cambios');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const editSubtotal = editItems.filter(i => !i._remove).reduce((s, i) => s + (Number(i.line_total) || Number(i.subtotal) || 0), 0);

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
                      <th>MESA / ORDEN</th>
                      <th>ESTADO</th>
                      <th>ITEMS</th>
                      <th>TOTAL</th>
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
                        <td className="mesa-num" data-label="Mesa / Orden">
                          {order.mesa_numero != null ? `Mesa ${order.mesa_numero}` : 'S/Mesa'}
                          <br /><small>#{order.order_number || order.id.slice(0,8)}</small>
                        </td>
                        <td data-label="Estado">
                          <span className={`badge badge-${order.status === 'paid' ? 'success' : order.status === 'pending' ? 'warning' : 'danger'}`}>
                            {order.status === 'paid' ? 'Pagada' : order.status === 'pending' ? 'Pendiente' : order.status}
                          </span>
                        </td>
                        <td data-label="Items">{order.items?.length || 0}</td>
                        <td className="amount" data-label="Total">{fmt(order.total)}</td>
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
                  <button className="btn-add-product" onClick={() => setShowAddItemModal(true)}>
                    + Agregar producto
                  </button>
                )}

                <div className="items-list-modern">
                  {editMode ? (
                    editItems.filter(i => !i._remove).length > 0 ? (
                      editItems.filter(i => !i._remove).map((item, idx) => (
                        <div key={idx} className={`item-row ${item._added ? 'added' : ''} ${item._modified ? 'modified' : ''}`}>
                          <div className="item-info">
                            <div className="item-qty-name">
                              <span className="item-qty">{item.cantidad}x</span>
                              <span className="item-name">{item.nombre}</span>
                            </div>
                            <div className="item-price">{fmt(getItemTotal(item))}</div>
                          </div>
                          {item.extras && item.extras.length > 0 && (
                            <div className="item-extras">
                              {item.extras.map((extra, i) => (
                                <span key={i} className="item-extra-tag">+ {extra.name} ${Number(extra.price || 0).toFixed(2)}</span>
                              ))}
                            </div>
                          )}
                          {item.notas && <div className="item-notes">📝 {item.notas}</div>}
                          <div className="item-actions">
                            <button 
                              className="icon-btn edit-btn" 
                              onClick={() => abrirEditarItem(item)}
                              title="Editar"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              className="icon-btn delete-btn" 
                              onClick={() => setEditItems(editItems.map((it, i) => i === idx ? { ...it, _remove: true } : it))}
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">
                        <p>No hay productos en esta orden</p>
                      </div>
                    )
                  ) : (
                    (selectedOrder.items || []).map((item, idx) => (
                      <div key={idx} className="item-row">
                        <div className="item-info">
                          <div className="item-qty-name">
                            <span className="item-qty">{item.cantidad || 1}x</span>
                            <span className="item-name">{item.nombre || item.product_name}</span>
                          </div>
                          <div className="item-price">{fmt((item.unit_price || item.price || 0) * (item.cantidad || 1))}</div>
                        </div>
                        {item.extras && item.extras.length > 0 && (
                          <div className="item-extras">
                            {item.extras.map((extra, i) => (
                              <span key={i} className="item-extra-tag">+ {extra.name} ${Number(extra.price || 0).toFixed(2)}</span>
                            ))}
                          </div>
                        )}
                        {item.notas && <div className="item-notes">📝 {item.notas}</div>}
                      </div>
                    ))
                  )}
                </div>

                <div className="summary-sticky">
                  <div className="summary-row">
                    <span>Subtotal:</span>
                    <span>{fmt(editMode ? editSubtotal : (selectedOrder.subtotal || 0))}</span>
                  </div>
                  <div className="summary-total">
                    <span>TOTAL:</span>
                    <span>{fmt(editMode ? editSubtotal : (selectedOrder.total || selectedOrder.subtotal || 0))}</span>
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