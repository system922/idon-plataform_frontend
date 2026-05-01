import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Printer, Edit2, Trash2, Save } from 'react-feather';
import qz from 'qz-tray';
import PageTemplate from '../../components/PageTemplate';
import { useBusinessContext } from '../../admin/config/BusinessContext';
import AddItemModal from '../../components/AddItemModal';
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

// --- Comanda MODIFICADA estilo cocina ---
function buildModificationComanda({
  mesaNum,
  ordenNum,
  tipoOrden='LOCAL',
  hora,
  removed=[],
  added=[],
  remaining=[],
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
      const name = String(item.product_name || item.nombre || item.name || `Item ${idx+1}`).toUpperCase();
      const prefix = `${qty}x `;
      const lines = wrap(name, WIDTH - prefix.length);
      out += prefix + (lines[0] || '') + '\n';
      for(let i=1;i<lines.length;i++) out += '   ' + lines[i] + '\n';
      if(item.nota || item.notas) {
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
      const name = String(item.product_name || item.nombre || item.name || `Item ${idx+1}`).toUpperCase();
      const prefix = `${qty}x `;
      const lines = wrap(name, WIDTH - prefix.length - 6);
      out += prefix + (lines[0] ? `~~${lines[0]}~~` : '') + '\n';
      for(let i=1;i<lines.length;i++) out += '   ~~' + lines[i] + '~~\n';
      if(item.nota || item.notas) {
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
      const name = String(item.product_name || item.nombre || item.name || `Item ${idx+1}`).toUpperCase();
      const prefix = `${qty}x `;
      const lines = wrap(name, WIDTH - prefix.length);
      out += prefix + (lines[0] || '') + ' [NUEVO]\n';
      for(let i=1;i<lines.length;i++) out += '   ' + lines[i] + '\n';
      if(item.nota || item.notas) {
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

  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidadItem, setCantidadItem] = useState(1);
  const [notasItem, setNotasItem] = useState('');

  useEffect(() => {
    (async () => {
      try {
        if (qz.websocket.isActive()) { setPrinterConnected(true); return; }
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

  useEffect(() => {
    loadOrders();
    loadProductos();
    loadCategorias();
  }, [selectedBusiness]);

  const loadOrders = async () => {
    try {
      const response = await fetchWithAuth('/api/ordenes?all=1');
      const data = await response.json();
      if (Array.isArray(data)) setOrders(data);
    } catch (err) {
      showNotification('Error al cargar órdenes', 'error');
    }
  };

  const loadProductos = async () => {
    try {
      const res = await fetchWithAuth('/api/products');
      const data = await res.json();
      setProductos(Array.isArray(data) ? data : data?.productos ?? data?.data ?? []);
    } catch (err) {
      showNotification('Error al cargar productos', 'error');
    }
  };

  const loadCategorias = async () => {
    try {
      const res = await fetchWithAuth('/api/categories');
      const data = await res.json();
      setCategorias(Array.isArray(data) ? data : []);
    } catch (err) {
      showNotification('Error al cargar categorías', 'error');
    }
  };

  const handlePrintModification = async (order, removedProducts = [], addedProducts = [], remainingItems=[]) => {
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
        remaining: remainingItems
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
        remaining: remainingItems
      });
      const escaped = texto.split('\n').map(l => l.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')).join('\n');
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Comanda Modificada</title>
<style>@page { margin:3mm; size:58mm auto; } body { font-family:'Courier New',monospace; font-size:9pt; white-space:pre; width:50mm; margin:0 auto; color:#000; line-height:1.3; }</style></head><body>${escaped}</body></html>`;
      const w = window.open('', '_blank', 'width=300,height=700,toolbar=0,menubar=0');
      if (!w) { alert('Permite ventanas emergentes para imprimir'); return; }
      w.document.write(html); w.document.close();
      setTimeout(() => { w.focus(); w.print(); }, 300);
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

  const handleSaveEdit = async () => {
    try {
      const remainingItems = editItems.filter(i => !i._remove);
      const removedItems = selectedOrder.items.filter(orig =>
        !remainingItems.find(ri =>
          ri.product_id === orig.product_id &&
          ri.product_name === orig.product_name &&
          ri.unit_price === orig.unit_price &&
          ri.quantity === orig.quantity
        )
      );
      const addedItems = remainingItems.filter(ri => ri._added);

      const res = await fetchWithAuth(`/api/ordenes/${selectedOrder.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ items: remainingItems })
      });

      if (!res.ok) throw new Error('Error al actualizar orden');

      showNotification('Orden modificada correctamente', 'success');
      setSelectedOrder({ ...selectedOrder, items: remainingItems });
      setEditMode(false);
      setEditItems([]);
      
      if (removedItems.length || addedItems.length) {
        await handlePrintModification(selectedOrder, removedItems, addedItems, remainingItems);
      }
      
      loadOrders();
    } catch (err) {
      showNotification('Error al guardar cambios', 'error');
    }
  };

  const agregarItem = () => {
    if (!productoSeleccionado) {
      showNotification('Selecciona un producto', 'warning');
      return;
    }
    
    const nuevoItem = {
      product_id: productoSeleccionado.id,
      product_name: productoSeleccionado.name,
      quantity: cantidadItem,
      unit_price: Number(productoSeleccionado.price),
      line_total: Number(productoSeleccionado.price) * cantidadItem,
      nota: notasItem,
      _added: true
    };

    setEditItems(prev => [...prev, nuevoItem]);
    setShowAddItemModal(false);
    setProductoSeleccionado(null);
    setCantidadItem(1);
    setNotasItem('');
    showNotification('Producto agregado', 'success');
  };

  return (
    <PageTemplate
      title="Historial de Órdenes"
      subtitle={`${orders.length} orden${orders.length !== 1 ? 'es' : ''} encontradas`}
    >
      <div className="checkout-main">
        <div className="orders-list-panel">
          <div className="panel-title">Historial de órdenes</div>
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar mesa o #orden..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="orders-table">
            {orders.length === 0 ? (
              <div className="empty-state"><p>No hay órdenes</p></div>
            ) : (
              <table ref={tableRef}>
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
                  {orders.filter(order =>
                    (order.mesa_numero?.toString() || '').includes(searchTerm)
                    || (order.order_number?.toString() || '').includes(searchTerm)
                    || order.id.toString().includes(searchTerm)
                  ).map(order => (
                    <tr
                      key={order.id}
                      className={selectedOrder?.id === order.id ? 'selected' : ''}
                      onClick={() => {
                        if (editMode && selectedOrder?.id === order.id) return;
                        setSelectedOrder(order);
                        setEditMode(false);
                        setEditItems([]);
                      }}
                    >
                      <td className="mesa-num">
                        {order.mesa_numero != null ? `Mesa ${order.mesa_numero}` : 'S/Mesa'}
                        <br /><small>#{order.order_number || order.id}</small>
                      </td>
                      <td>
                        <span className={`status-badge status-${order.status}`}>
                          {order.status}
                        </span>
                      </td>
                      <td>{order.items?.length || 0}</td>
                      <td className="amount">{fmt(order.total)}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="btn-action btn-edit"
                            onClick={e => {
                              e.stopPropagation();
                              if (editMode) return;
                              setSelectedOrder(order);
                              setEditMode(true);
                              setEditItems((order.items || []).map(i => ({ ...i })));
                            }}
                            disabled={editMode}
                          >
                            <Edit2 size={13} /> Editar
                          </button>
                          <button
                            type="button"
                            className="btn-action btn-delete"
                            onClick={e => {
                              e.stopPropagation();
                              handleDeleteOrder(order.id);
                            }}
                          >
                            <Trash2 size={13} /> Eliminar
                          </button>
                          <button
                            type="button"
                            className="btn-action btn-print"
                            onClick={e => {
                              e.stopPropagation();
                              handlePrintModification(order, [], [], order.items);
                            }}
                          >
                            <Printer size={13} /> Reimprimir
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

        {selectedOrder ? (
          <div className="payment-panel">
            <div className="panel-header">
              <h3 className="panel-title">
                Detalle de la orden
                {editMode && <span className="edit-badge">(Edición activa)</span>}
              </h3>
            </div>
            <div className="order-summary">
              <div className="order-info">
                <h2 className="order-mesa">
                  {selectedOrder.mesa_numero != null ? `Sin Mesa` : 'Sin Mesa'}
                </h2>
                <span className="order-number">#{selectedOrder.order_number || selectedOrder.id}</span>
              </div>

              {editMode && (
                <button
                  type="button"
                  className="btn-add-product"
                  onClick={() => {
                    setShowAddItemModal(true);
                    setProductoSeleccionado(null);
                    setCantidadItem(1);
                    setNotasItem('');
                  }}
                >
                  + Agregar producto
                </button>
              )}

              <div className="items-list">
                {editMode ? (
                  <>
                    {editItems.map((item, idx) => (
                      <div
                        key={idx}
                        className={`item-card${item._remove ? ' removed' : ''}${item._added ? ' added' : ''}`}
                      >
                        <div className="item-info">
                          <div className="item-qty-name">
                            <span className="item-qty">{item.quantity}x</span>
                            <span className="item-name">{item.product_name}</span>
                          </div>
                          <span className="item-price">{fmt(item.unit_price * item.quantity)}</span>
                        </div>
                        {!item._remove && (
                          <button
                            type="button"
                            className="btn-remove-x"
                            onClick={() =>
                              setEditItems(editItems.map((it, i) => (i === idx ? { ...it, _remove: true } : it)))
                            }
                            title="Quitar producto"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    <div className="action-buttons-group">
                      <button
                        type="button"
                        className="btn-save"
                        onClick={handleSaveEdit}
                      >
                        <Save size={14} /> Guardar Cambios e Imprimir
                      </button>
                      <button
                        type="button"
                        className="btn-cancel-edit"
                        onClick={() => {
                          setEditMode(false);
                          setEditItems([]);
                        }}
                      >
                        <X size={16} /> Cancelar
                      </button>
                    </div>
                  </>
                ) : (
                  (selectedOrder.items || []).map((item, idx) => (
                    <div key={idx} className="item-card">
                      <div className="item-info">
                        <div className="item-qty-name">
                          <span className="item-qty">{item.quantity}x</span>
                          <span className="item-name">{item.product_name}</span>
                        </div>
                        <span className="item-price">{fmt(item.unit_price * item.quantity)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="order-totals">
                <div className="subtotal-row">
                  <span>Subtotal:</span>
                  <span>
                    {fmt(
                      !editMode
                        ? selectedOrder.subtotal
                        : editItems.filter(i => !i._remove).reduce((s, it) => s + it.unit_price * it.quantity, 0)
                    )}
                  </span>
                </div>
                <div className="total-row">
                  <span>TOTAL:</span>
                  <span className="total-value">
                    {fmt(
                      !editMode
                        ? selectedOrder.total
                        : editItems.filter(i => !i._remove).reduce((s, it) => s + it.unit_price * it.quantity, 0)
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-panel">
            <p>Selecciona una orden para ver, editar o imprimir</p>
          </div>
        )}
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

      {notification && <div className={`notification ${notification.type}`}>{notification.msg}</div>}
    </PageTemplate>
  );
}