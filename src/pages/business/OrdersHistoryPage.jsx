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
  const WIDTH = 32;
  const line = () => '='.repeat(WIDTH);
  const sep = () => '-'.repeat(WIDTH);
  const center = (text, width = WIDTH) => {
    const str = String(text ?? '').trim();
    const pad = Math.max(0, Math.floor((width - str.length) / 2));
    return ' '.repeat(pad) + str;
  };
  const wrap = (text, width = WIDTH) => {
    const str = String(text ?? '').trim();
    if (!str) return [];
    const words = str.split(/\s+/);
    const lines = [];
    let current = '';
    for (const w of words) {
      const next = current ? `${current} ${w}` : w;
      if (next.length <= width) current = next;
      else { if (current) lines.push(current); current = w; }
    }
    if (current) lines.push(current);
    return lines;
  };

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
    remaining.forEach((item, idx) => {
      const qty = item.quantity || item.cantidad || 1;
      const name = String(item.product_name || item.nombre || item.name || `Item ${idx + 1}`).toUpperCase();
      const prefix = `${qty}x `;
      const lines = wrap(name, WIDTH - prefix.length);
      out += prefix + (lines[0] || '') + '\n';
      for (let i = 1; i < lines.length; i++) out += '   ' + lines[i] + '\n';
      if (item.nota || item.notas) {
        wrap(item.nota || item.notas, WIDTH - 3).forEach(ln => out += ` - ${ln}\n`);
      }
      out += sep() + '\n';
    });
  }

  if (removed.length) {
    out += center('PRODUCTOS REMOVIDOS') + '\n';
    out += sep() + '\n';
    removed.forEach((item, idx) => {
      const qty = item.quantity || item.cantidad || 1;
      const name = String(item.product_name || item.nombre || item.name || `Item ${idx + 1}`).toUpperCase();
      const prefix = `${qty}x `;
      const lines = wrap(name, WIDTH - prefix.length - 6);
      out += prefix + (lines[0] ? `~~${lines[0]}~~` : '') + '\n';
      for (let i = 1; i < lines.length; i++) out += '   ~~' + lines[i] + '~~\n';
      if (item.nota || item.notas) {
        wrap(item.nota || item.notas, WIDTH - 6).forEach(ln => out += ` - ~~${ln}~~\n`);
      }
      out += sep() + '\n';
    });
  }

  if (added.length) {
    out += center('PRODUCTOS AGREGADOS') + '\n';
    out += sep() + '\n';
    added.forEach((item, idx) => {
      const qty = item.quantity || item.cantidad || 1;
      const name = String(item.product_name || item.nombre || item.name || `Item ${idx + 1}`).toUpperCase();
      const prefix = `${qty}x `;
      const lines = wrap(name, WIDTH - prefix.length);
      out += prefix + (lines[0] || '') + ' [NUEVO]\n';
      for (let i = 1; i < lines.length; i++) out += '   ' + lines[i] + '\n';
      if (item.nota || item.notas) {
        wrap(item.nota || item.notas, WIDTH - 3).forEach(ln => out += ` - ${ln}\n`);
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
  const [notification, setNotification] = useState(null);
  const [printerConnected, setPrinterConnected] = useState(false);
  const tableRef = useRef(null);
  const [filterDate, setFilterDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [statusFilter, setStatusFilter] = useState('pending');
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidadItem, setCantidadItem] = useState(1);
  const [notasItem, setNotasItem] = useState('');
  const [itemEditando, setItemEditando] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(false);

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
        console.warn('⚠️ QZ Tray no disponible:', e?.message);
        setPrinterConnected(false);
      }
    })();
  }, []);

  // Cargar datos cuando cambia el negocio, la fecha o el estado
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
      showNotification('Error al cargar productos', 'error');
    }
  };

  const loadCategorias = async () => {
    try {
      const res = await fetchWithAuth('/api/categories');
      const data = await res.json();
      setCategorias(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al cargar categorías:', err);
      showNotification('Error al cargar categorías', 'error');
    }
  };

  // 🔥 Función para obtener precios actualizados de los productos en una orden
  const enrichOrderItemsWithPrices = async (order) => {
    if (!order || !order.items) return order;
    
    const enrichedItems = await Promise.all(order.items.map(async (item) => {
      // Buscar el producto actual en la lista de productos cargados
      const producto = productos.find(p => p.id === item.product_id);
      
      if (producto) {
        return {
          ...item,
          unit_price: Number(producto.selling_price) || Number(producto.price) || 0,
          selling_price: Number(producto.selling_price) || Number(producto.price) || 0,
          tax_rate: Number(producto.tax_rate) || 0,
        };
      }
      
      // Si no está en la lista, hacer una petición directa
      try {
        const price = await getProductPrice(item.product_id);
        return {
          ...item,
          unit_price: price,
          selling_price: price,
          tax_rate: item.tax_rate || 0,
        };
      } catch {
        return {
          ...item,
          unit_price: item.unit_price || item.selling_price || 0,
          selling_price: item.selling_price || item.unit_price || 0,
          tax_rate: item.tax_rate || 0,
        };
      }
    }));
    
    // Recalcular totales de la orden
    const newSubtotal = enrichedItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const newTax = enrichedItems.reduce((sum, item) => sum + ((item.tax_rate || 0) * item.quantity), 0);
    const newTotal = newSubtotal + newTax;
    
    return {
      ...order,
      items: enrichedItems,
      subtotal: newSubtotal,
      tax_amount: newTax,
      total: newTotal,
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

      // Filtrar por fecha
      const filtered = ordersArray.filter(order => {
        const fecha = order.sale_date || order.created_at;
        if (!fecha) return false;
        
        const orderDateObj = new Date(fecha);
        if (isNaN(orderDateObj.getTime())) return false;
        
        const orderDate = orderDateObj.toISOString().split('T')[0];
        return orderDate === filterDate;
      });
      
      setOrders(filtered);
    } catch (err) {
      console.error(err);
      showNotification(`Error al cargar órdenes: ${err.message}`, 'error');
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleSelectOrder = async (order) => {
    if (editMode && selectedOrder?.id === order.id) return;
    
    // Enriquecer la orden con precios actualizados
    const enrichedOrder = await enrichOrderItemsWithPrices(order);
    setSelectedOrder(enrichedOrder);
    setEditMode(false);
    setEditItems([]);
  };

  const handleEditOrder = async (order) => {
    // Enriquecer la orden con precios actualizados antes de editar
    const enrichedOrder = await enrichOrderItemsWithPrices(order);
    setSelectedOrder(enrichedOrder);
    setEditMode(true);
    setEditItems(enrichedOrder.items.map(i => ({ 
      ...i, 
      id: i.id || Date.now() + Math.random(),
      unit_price: i.unit_price || i.selling_price || 0
    })));
  };

  const handleRefresh = () => {
    loadOrders();
    if (selectedOrder) {
      handleSelectOrder(selectedOrder);
    }
    showNotification('Órdenes actualizadas', 'success');
  };

  const handlePrintModification = async (order, removedProducts = [], addedProducts = [], remainingItems = []) => {
    try {
      if (!printerConnected) throw new Error('No hay impresora');
      const horaStr = new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
      const texto = buildModificationComanda({
        mesaNum: order.mesa_numero,
        ordenNum: order.order_number || order.id,
        tipoOrden: 'LOCAL',
        hora: horaStr,
        removed: removedProducts,
        added: addedProducts,
        remaining: remainingItems,
      });
      const config = qz.configs.create(PRINTER_NAME);
      await qz.print(config, [texto]);
      showNotification('Comanda modificada enviada a la impresora', 'success');
    } catch (e) {
      showNotification('Error de QZ Tray. Usando impresión web', 'warning');
      const texto = buildModificationComanda({
        mesaNum: order.mesa_numero,
        ordenNum: order.order_number || order.id,
        tipoOrden: 'LOCAL',
        hora: new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
        removed: removedProducts,
        added: addedProducts,
        remaining: remainingItems,
      });
      const escaped = texto.split('\n').map(l => l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')).join('\n');
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Comanda Modificada</title>
<style>@page { margin:3mm; size:58mm auto; } body { font-family:'Courier New',monospace; font-size:9pt; white-space:pre; width:50mm; margin:0 auto; color:#000; line-height:1.3; }</style></head><body>${escaped}</body></html>`;
      const w = window.open('', '_blank', 'width=300,height=700,toolbar=0,menubar=0');
      if (!w) {
        alert('Permite ventanas emergentes para imprimir');
        return;
      }
      w.document.write(html);
      w.document.close();
      setTimeout(() => {
        w.focus();
        w.print();
      }, 300);
    }
  };

  const showNotification = (msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('¿Seguro que deseas eliminar la orden?')) return;
    try {
      const res = await fetchWithAuth(`/api/ordenes/${orderId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      showNotification('Orden eliminada correctamente', 'success');
      loadOrders();
      setSelectedOrder(null);
    } catch (err) {
      showNotification('Error al eliminar orden', 'error');
    }
  };

  const abrirEditarItem = (item) => {
    setItemEditando(item);
    setProductoSeleccionado({
      id: item.product_id,
      name: item.product_name,
      price: item.unit_price
    });
    setCantidadItem(item.quantity);
    setNotasItem(item.notes || item.notas || '');
    setShowEditItemModal(true);
  };

  const guardarEdicionItem = async () => {
    if (!productoSeleccionado || cantidadItem <= 0) {
      showNotification('Selecciona un producto y cantidad válida', 'warning');
      return;
    }
    
    // Obtener el precio actualizado del producto
    let precio = Number(productoSeleccionado.price) || 0;
    
    // Si el producto tiene ID, obtener precio actualizado
    if (productoSeleccionado.id) {
      const productoActual = productos.find(p => p.id === productoSeleccionado.id);
      if (productoActual) {
        precio = Number(productoActual.selling_price) || Number(productoActual.price) || 0;
      } else {
        precio = await getProductPrice(productoSeleccionado.id);
      }
    }
    
    const cantidad = parseInt(cantidadItem, 10);
    
    const itemActualizado = {
      ...itemEditando,
      product_name: productoSeleccionado.name,
      quantity: cantidad,
      unit_price: precio,
      selling_price: precio,
      line_total: precio * cantidad,
      notes: notasItem,
      _modified: true,
    };
    
    setEditItems(prev => prev.map(item => 
      item.id === itemEditando.id ? itemActualizado : item
    ));
    
    setShowEditItemModal(false);
    setItemEditando(null);
    setProductoSeleccionado(null);
    setCantidadItem(1);
    setNotasItem('');
    showNotification('Producto modificado', 'success');
  };

  const handleSaveEdit = async () => {
    try {
      const remainingItems = editItems.filter(i => !i._remove);
      
      // Calcular totales actualizados
      const subtotal = remainingItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
      const taxAmount = remainingItems.reduce((sum, item) => sum + ((item.tax_rate || 0) * item.quantity), 0);
      const total = subtotal + taxAmount;
      
      // Preparar items para enviar al backend (solo IDs y cantidades)
      const itemsToSend = remainingItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        notes: item.notes || null
      }));
      
      const res = await fetchWithAuth(`/api/ordenes/${selectedOrder.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          items: itemsToSend,
          subtotal: subtotal,
          tax_amount: taxAmount,
          total: total
        }),
      });

      if (!res.ok) throw new Error('Error al actualizar orden');

      // Actualizar la orden seleccionada con los nuevos valores
      const updatedOrder = {
        ...selectedOrder,
        items: remainingItems,
        subtotal: subtotal,
        tax_amount: taxAmount,
        total: total
      };
      
      setSelectedOrder(updatedOrder);
      setEditMode(false);
      setEditItems([]);
      
      showNotification('Orden modificada correctamente', 'success');
      loadOrders();
    } catch (err) {
      console.error(err);
      showNotification('Error al guardar cambios', 'error');
    }
  };

  const agregarItem = async () => {
    if (!productoSeleccionado) {
      showNotification('Selecciona un producto', 'warning');
      return;
    }

    // Obtener precio actualizado
    let precio = Number(productoSeleccionado.price) || 0;
    const productoActual = productos.find(p => p.id === productoSeleccionado.id);
    if (productoActual) {
      precio = Number(productoActual.selling_price) || Number(productoActual.price) || 0;
    }

    const nuevoItem = {
      id: Date.now(),
      product_id: productoSeleccionado.id,
      product_name: productoSeleccionado.name,
      quantity: cantidadItem,
      unit_price: precio,
      selling_price: precio,
      line_total: precio * cantidadItem,
      notes: notasItem,
      tax_rate: productoActual?.tax_rate || 0,
      _added: true,
    };

    setEditItems(prev => [...prev, nuevoItem]);
    setShowAddItemModal(false);
    setProductoSeleccionado(null);
    setCantidadItem(1);
    setNotasItem('');
    showNotification('Producto agregado', 'success');
  };

  // Calcular totales para modo edición
  const editSubtotal = editItems.filter(i => !i._remove).reduce((sum, item) => sum + ((item.unit_price || 0) * (item.quantity || 0)), 0);
  const editTotal = editSubtotal;

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
        {notification && <div className={`alert alert-${notification.type}`}>{notification.msg}</div>}

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
                            <button className="btn-action btn-print" onClick={() => handlePrintModification(order, [], [], order.items)}>
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
                              <span className="item-qty">{item.quantity}x</span>
                              <span className="item-name">{item.product_name}</span>
                            </div>
                            <span className="item-price">{fmt((item.unit_price || 0) * (item.quantity || 0))}</span>
                          </div>
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
                            <span className="item-qty">{item.quantity}x</span>
                            <span className="item-name">{item.product_name}</span>
                          </div>
                          <span className="item-price">{fmt((item.unit_price || item.selling_price || 0) * (item.quantity || 0))}</span>
                        </div>
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
                    <span>{fmt(editMode ? editTotal : (selectedOrder.total || 0))}</span>
                  </div>
                </div>

                {editMode && (
                  <div className="action-buttons-group">
                    <button className="btn-save" onClick={handleSaveEdit}>
                      <Save size={14} /> Guardar Cambios
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
        />
      </div>
    </PageTemplate>
  );
}