import React, { useState, useEffect, useRef } from 'react';
import { Search, Check, X, Printer, Edit2, Trash2, Save } from 'react-feather';
import qz from 'qz-tray';
import PageTemplate from '../../components/PageTemplate';
import { useBusinessContext } from '../../admin/config/BusinessContext';
import AddItemModal from '../../components/AddItemModal'; // <-- Ajusta ruta si difiere
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/OrdersHistoryPage.css';

// --- Helpers de impresión ---
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4000';
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

  // ITEMS ACTUALES
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
  // REMOVIDOS
  if (removed.length) {
    out += center('PRODUCTOS REMOVIDOS') + '\n';
    out += sep() + '\n';
    removed.forEach((item, idx) => {
      const qty = item.quantity || item.cantidad || 1;
      const name = String(item.product_name || item.nombre || item.name || `Item ${idx+1}`).toUpperCase();
      const prefix = `${qty}x `;
      const lines = wrap(name, WIDTH - prefix.length - 6); // for tachado
      out += prefix + (lines[0] ? `~~${lines[0]}~~` : '') + '\n';
      for(let i=1;i<lines.length;i++) out += '   ~~' + lines[i] + '~~\n';
      if(item.nota || item.notas) {
        wrap(item.nota || item.notas, WIDTH - 6).forEach(ln => out += ` - ~~${ln}~~\n`);
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
  const [productos, setProductos] = useState([
    { id: 1, name: 'Café Americano', price: 1.5 },
    { id: 2, name: 'Capuccino', price: 2.2 },
    { id: 3, name: 'Croissant', price: 1.8 },
    // ... agrega los productos de tu catálogo real aquí
  ]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editItems, setEditItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);
  const [printerConnected, setPrinterConnected] = useState(false);
  const tableRef = useRef(null);

  // --- Modal estado y campos ---
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidadItem, setCantidadItem] = useState(1);
  const [notasItem, setNotasItem] = useState('');

  // QZ Tray
  useEffect(() => {
    (async () => {
      try {
        const certData = await fetch(`${API_BASE}/api/print/cert`).then(r => r.text());
        qz.security.setCertificatePromise(async () => certData);
        qz.security.setSignaturePromise(async (toSign) => {
          const { signature } = await fetch(`${API_BASE}/api/print/sign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: toSign }),
          }).then(r => r.json());
          return signature;
        });
        if (!qz.websocket.isActive()) await qz.websocket.connect();
        setPrinterConnected(true);
      } catch (e) {
        setPrinterConnected(false);
      }
    })();
  }, []);

  // Load orders
  useEffect(() => { loadOrders(); }, [selectedBusiness]);
  const loadOrders = async () => {
    // Ajusta el endpoint a como te retorna tus órdenes históricas
    try {
      const response = await fetchWithAuth('/api/ordenes?all=1');
      const data = await response.json();
      if (Array.isArray(data)) setOrders(data);
    } catch (err) {
      showNotification('Error al cargar órdenes', 'error');
    }
  };

  // Print modificación con tachado/insertado estilo POS-Cocina
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
      // Fallback web print (igual visual en browser)
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

  // Notificaciones
  const showNotification = (msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Eliminar
  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('¿Seguro que deseas eliminar la orden?')) return;
    // PATCH/DELETE lógico solo si tu API lo permite
    showNotification('No implementado (simulación)', 'warning'); // agrega aquí tu fetch
  };

  // Guardar edición
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

      // PATCH la orden en tu backend...
      // await fetch(`${API_BASE}/api/ordenes/${selectedOrder.id}/productos`...

      showNotification('Orden modificada', 'success');
      setSelectedOrder({ ...selectedOrder, items: remainingItems });
      setEditMode(false); setEditItems([]);
      // Imprime modificación (si hay cambios)
      if (removedItems.length || addedItems.length)
        await handlePrintModification(selectedOrder, removedItems, addedItems, remainingItems);
    } catch (err) {
      showNotification('Error al guardar cambios', 'error');
    }
  };

  // AGREGAR ITEM DESDE MODAL
  const agregarItem = () => {
    if (!productoSeleccionado) return;
    setEditItems(editItems => [
      ...editItems,
      {
        product_id: Math.random().toString(36).substring(2,9),
        product_name: productoSeleccionado.name,
        quantity: cantidadItem,
        unit_price: Number(productoSeleccionado.price),
        line_total: Number(productoSeleccionado.price) * cantidadItem,
        nota: notasItem,
        _added: true
      }
    ]);
    setShowAddItemModal(false);
    setProductoSeleccionado(null); setCantidadItem(1); setNotasItem('');
  };

  return (
    <PageTemplate
      title="Historial de Órdenes"
      subtitle={`${orders.length} orden${orders.length !== 1 ? 'es' : ''} encontradas`}
    >
      <div className="checkout-main">
        {/* Lista de órdenes */}
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
                    <th>Mesa / Orden</th>
                    <th>Estado</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.filter(order =>
                    (order.mesa_numero?.toString()  || '').includes(searchTerm)
                    || (order.order_number?.toString() || '').includes(searchTerm)
                    || order.id.toString().includes(searchTerm)
                  ).map(order => (
                    <tr
                      key={order.id}
                      className={selectedOrder?.id === order.id ? 'selected' : ''}
                      onClick={() => {
                        if (editMode && selectedOrder?.id === order.id) return;
                        setSelectedOrder(order); setEditMode(false); setEditItems([]);
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
                        <button
                          type="button"
                          className="btn-edit"
                          onClick={e => { e.stopPropagation(); if (editMode) return; setSelectedOrder(order); setEditMode(true); setEditItems((order.items || []).map(i => ({ ...i }))); }}
                          disabled={editMode}>
                          <Edit2 size={14} /> Editar
                        </button>
                        <button
                          type="button"
                          className="btn-delete"
                          onClick={e => { e.stopPropagation(); handleDeleteOrder(order.id); }}>
                          <Trash2 size={13} /> Eliminar
                        </button>
                        <button
                          type="button"
                          className="btn-print"
                          onClick={e => { e.stopPropagation(); handlePrintModification(order, [], [], order.items); }}>
                          <Printer size={13} /> Reimprimir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        {/* Panel de detalle/editar */}
        {selectedOrder ? (
          <div className="payment-panel">
            <div className="panel-title">
              Detalle de la orden
              {editMode && <span style={{ color: '#10b981', marginLeft: 10 }}>(Edición activa)</span>}
            </div>
            <div className="order-summary">
              <div className="summary-header">
                <h3>
                  {selectedOrder.mesa_numero != null ? `Mesa ${selectedOrder.mesa_numero}` : 'Sin Mesa'}
                  &nbsp;<small>#{selectedOrder.order_number || selectedOrder.id}</small>
                </h3>
              </div>
              {/* Botón para abrir modal */}
              {editMode && (
                <div style={{margin: '16px 0'}}>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      setShowAddItemModal(true);
                      setProductoSeleccionado(null); setCantidadItem(1); setNotasItem('');
                    }}
                  >
                    + Agregar producto
                  </button>
                </div>
              )}
              {/* Lista editable */}
              {editMode ? (
                <div className="items-list">
                  {editItems.map((item, idx) => (
                    <div key={idx} className={`item-line${item._remove ? ' removed' : ''}${item._added ? ' added' : ''}`}>
                      <span className="item-name">{item.quantity}x {item.product_name}</span>
                      <span className="item-price">{fmt(item.unit_price * item.quantity)}</span>
                      {item.nota && <span style={{color:'#b3b3b3',fontSize:12,marginLeft:6}}>Nota: {item.nota}</span>}
                      {!item._remove && (
                        <button
                          type="button"
                          className="btn-remove-item"
                          onClick={() => setEditItems(editItems.map((it,i) => i===idx ? { ...it, _remove: true } : it))}
                          style={{ marginLeft:8, color: '#e3342f', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800 }}
                          title="Quitar producto">
                          <X size={13} />
                        </button>
                      )}
                      {item._added && <span style={{color:'#22d3ee',fontSize:11,marginLeft:7}}>(agregado)</span>}
                      {item._remove && <span style={{color:'#e3342f',fontSize:12,marginLeft:10}}>Eliminado</span>}
                    </div>
                  ))}
                  <div style={{ marginTop: 14 }}>
                    <button type="button" className="btn-complete" style={{ minWidth: 120, fontSize: 14, fontWeight: 800 }} onClick={handleSaveEdit}>
                      <Save size={14} /> Guardar Cambios e Imprimir
                    </button>
                    <button type="button" className="btn-cancel" style={{ marginLeft: 12 }}
                      onClick={() => { setEditMode(false); setEditItems([]); }}>
                      <X size={16} /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="items-list">
                  {(selectedOrder.items || []).map((item, idx) => (
                    <div key={idx} className="item-line">
                      <span className="item-name">{item.quantity}x {item.product_name}</span>
                      <span className="item-price">{fmt(item.unit_price * item.quantity)}</span>
                      {item.nota && <span style={{color:'#b3b3b3',fontSize:12,marginLeft:6}}>Nota: {item.nota}</span>}
                    </div>
                  ))}
                </div>
              )}
              <div className="subtotal-line">
                <span>Subtotal:</span>
                <span>
                  {
                    (!editMode
                      ? selectedOrder.subtotal
                      : editItems.filter(i => !i._remove).reduce((s,it) => s + it.unit_price * it.quantity, 0)) || 0
                  }
                </span>
              </div>
              <div className="total-line">
                <span>TOTAL:</span>
                <span className="total-amount">
                  {
                    (!editMode
                      ? selectedOrder.total
                      : editItems.filter(i => !i._remove).reduce((s,it) => s + it.unit_price * it.quantity, 0)) || 0
                  }
                </span>
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
      />
      {notification && (
        <div className={`notification ${notification.type}`}>{notification.msg}</div>
      )}
      <style>{`
        .item-line.removed { opacity:0.4; text-decoration:line-through; }
        .item-line.added { color: #22d3ee; }
        .btn-remove-item { margin-left:8px;}
      `}</style>
    </PageTemplate>
  );
}