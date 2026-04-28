import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Printer } from 'react-feather';
import qz from 'qz-tray';
import PageTemplate from '../../components/PageTemplate';
import { useBusinessContext } from '../../admin/config/BusinessContext';
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/ReceiptPrint.css';

import API_BASE from '../../config/apiBase';
const PRINTER_NAME  = 'POS-58';
const WIDTH         = 32;
// Helpers
const line  = () => '='.repeat(WIDTH);
const sep   = () => '-'.repeat(WIDTH);
const center = (txt) => {
  const t = String(txt || '').trim().substring(0, WIDTH);
  const pad = Math.max(0, Math.floor((WIDTH - t.length) / 2));
  return ' '.repeat(pad) + t;
};
const wrap = (txt, w = WIDTH) => {
  const str = String(txt || '').trim();
  if (!str) return [];
  const words = str.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (next.length <= w) { cur = next; }
    else { if (cur) lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  return lines;
};
const rowLR = (left, right) => {
  const r = String(right);
  const l = String(left).substring(0, WIDTH - r.length - 1);
  return l + ' '.repeat(Math.max(1, WIDTH - l.length - r.length)) + r;
};
const itemLine = (qty, name, price) => {
  const prefix = `${qty} x `;
  const suffix = ` ${price}`;
  const maxName = WIDTH - prefix.length - suffix.length;
  const n = String(name).substring(0, maxName).padEnd(maxName);
  return prefix + n + suffix;
};
const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`;

export default function PosReceiptPrint() {
  const { selectedBusiness } = useBusinessContext();
  const [paidOrders, setPaidOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);
  const [bizInfo, setBizInfo] = useState(null);
  const [printerConnected, setPrinterConnected] = useState(false);
  const tableRef = useRef(null);

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
        console.warn('⚠️ QZ Tray no disponible:', e?.message);
        setPrinterConnected(false);
      }
    })();
  }, []);


  // Load business receipt info
  useEffect(() => {
    if (!selectedBusiness?.schemaName) return;
    fetchWithAuth('/api/settings/receipt-info')
      .then(r => r.json())
      .then(data => setBizInfo(data))
      .catch(err => console.warn('No se pudo cargar info del negocio:', err));
  }, [selectedBusiness]);

  // Load only paid orders
  useEffect(() => {
    loadPaidOrders();
    const interval = setInterval(loadPaidOrders, 12000);
    return () => clearInterval(interval);
  }, [selectedBusiness]);

  const loadPaidOrders = async () => {
    try {
      const response = await fetchWithAuth('/api/ordenes');
      const data = await response.json();
      if (Array.isArray(data)) {
        const normalized = data
          .filter(o => o.status === 'paid')
          .map(o => ({
            ...o,
            total:      parseFloat(o.total)      || 0,
            subtotal:   parseFloat(o.subtotal)   || 0,
            tax_amount: parseFloat(o.tax_amount) || 0,
            tax_rate:   parseFloat(o.tax_rate)   || 0,
            items: (o.items || []).map(i => ({
              ...i,
              unit_price: parseFloat(i.unit_price) || 0,
              quantity:   parseFloat(i.quantity)   || 0,
              line_total: parseFloat(i.line_total) || 0,
            })),
          }));
        setPaidOrders(normalized);
      }
    } catch (err) {
      setNotification({ msg: 'Error al cargar órdenes pagadas', type: 'error' });
    }
  };

  // --- Imprimir comprobante ---
  const buildReceiptText = (order, paid, change) => {
    const biz     = bizInfo || {};
    const now     = new Date();
    const dateStr = now.toLocaleDateString('es-EC');
    const timeStr = now.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
    const taxRate = order.tax_rate || biz.tax_rate || 0;
    const fmtS    = (n) => `$${parseFloat(n || 0).toFixed(2)}`;

    let out = '';
    out += line() + '\n';

    // Nombre del comercio para header
    const bizName =
      biz.trade_name && biz.trade_name !== biz.company_name
        ? biz.trade_name
        : biz.company_name || selectedBusiness?.name || 'MI NEGOCIO';

    wrap(bizName.toUpperCase()).forEach(l => { out += center(l) + '\n'; });
    if (biz.address)
      wrap(biz.address).forEach(l => { out += center(l) + '\n'; });
    if (biz.city || biz.country)
      out += center([biz.city, biz.country].filter(Boolean).join(' - ')) + '\n';
    if (biz.phone) out += center(`Tel: ${biz.phone}`) + '\n';
    if (biz.email) out += center(biz.email) + '\n';
    if (biz.ruc) out += center(biz.ruc) + '\n';

    out += line() + '\n';

    out += `Fecha:  ${dateStr} ${timeStr}\n`;
    if (order.customer_document_number) 
      out += `C.I.: ${order.customer_document_number}\n`; 
    if (order.customer_name)       
      out += `Cliente:${order.customer_name}\n`;

    out += sep() + '\n';
    out += rowLR('DESCRIPCION', 'TOTAL') + '\n';
    out += sep() + '\n';

    (order.items || []).forEach(item => {
      const lineTotal = fmtS(item.unit_price * item.quantity);
      out += itemLine(item.quantity, item.product_name, lineTotal) + '\n';
      out += `     P.U. ${fmtS(item.unit_price)}\n`;
      out += sep() + '\n';
    });

    out += rowLR('SUBTOTAL',       fmtS(order.subtotal || order.total)) + '\n';
    if (order.tax_amount > 0 || taxRate > 0)
      out += rowLR(`IVA ${taxRate}%`, fmtS(order.tax_amount)) + '\n';
    out += line() + '\n';
    out += rowLR('VALOR TOTAL',    fmtS(order.total))  + '\n';
    out += line() + '\n';
    out += rowLR('Recibido',       fmtS(order.total))         + '\n';
    out += rowLR('Cambio/Vuelto',  fmtS(change))       + '\n';
    out += sep() + '\n';
    wrap(biz.receipt_footer || 'DOCUMENTO SIN VALIDEZ TRIBUTARIA')
      .forEach(l => { out += center(l) + '\n'; });
    out += center('Gracias por su preferencia') + '\n';
    out += line() + '\n';
    out += '\n\n\n\n\n';
    return out;
  };

  const handlePrintReceipt = async (order) => {
    const text = buildReceiptText(order, order.total, 0);

    if (printerConnected) {
      try {
        const config = qz.configs.create(PRINTER_NAME);
        await qz.print(config, [text]);
        return;
      } catch (e) {
        setNotification({ msg: 'Error con QZ Tray, usando impresión web', type: 'warning' });
      }
    }

    // Fallback: ventana navegador
    const escaped = text
      .split('\n')
      .map(l => l.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'))
      .join('\n');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Comprobante</title>
<style>
  @page { margin:3mm; size:58mm auto; }
  body { font-family:'Courier New',monospace; font-size:9pt; white-space:pre;
         width:50mm; margin:0 auto; color:#000; line-height:1.3; }
</style></head><body>${escaped}</body></html>`;

    const w = window.open('', '_blank', 'width=300,height=700,toolbar=0,menubar=0');
    if (!w) { alert('Permite ventanas emergentes para imprimir'); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 300);
  };

  // Filtro
  const filteredOrders = paidOrders.filter(order =>
    (order.mesa_numero?.toString()  || '').includes(searchTerm) ||
    (order.order_number?.toString() || '').includes(searchTerm) ||
    order.id.toString().includes(searchTerm)
  );


  // RENDER
  return (
    <PageTemplate
      title="Reimpresión recibos"
      subtitle={`${paidOrders.length} orden${paidOrders.length !== 1 ? 'es' : ''} pagada${paidOrders.length !== 1 ? 's' : ''}`}
    >
      <div className="checkout-main">

        {/* Lista de órdenes pagadas */}
        <div className="orders-list-panel">
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar mesa o #orden..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="orders-table">
            {filteredOrders.length === 0 ? (
              <div className="empty-state"><p>No hay órdenes pagadas</p></div>
            ) : (
              <table ref={tableRef}>
                <thead>
                  <tr>
                    <th>Mesa / Orden</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(order => (
                    <tr
                      key={order.id}
                      className={selectedOrder?.id === order.id ? 'selected' : ''}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <td className="mesa-num">
                        {order.mesa_numero != null ? `Mesa ${order.mesa_numero}` : 'S/Mesa'}
                        <br />
                        <small>#{order.order_number || order.id}</small>
                      </td>
                      <td>{order.items?.length || 0}</td>
                      <td className="amount">{fmt(order.total)}</td>
                      <td>
                        <button
                          className="btn-select"
                          onClick={e => { e.stopPropagation(); setSelectedOrder(order); }}
                        >
                          <Printer size={14} /> Reimprimir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Panel de detalle/imprimir */}
        {selectedOrder ? (
          <div className="payment-panel">
            <div className="panel-title">Detalle del recibo</div>
            <div className="order-summary">
              <div className="summary-header">
                <h3>
                  {selectedOrder.mesa_numero != null ? `Mesa ${selectedOrder.mesa_numero}` : 'Sin Mesa'}
                  &nbsp;<small>#{selectedOrder.order_number || selectedOrder.id}</small>
                </h3>
              </div>
              <div className="items-list">
                {(selectedOrder.items || []).map((item, idx) => (
                  <div key={idx} className="item-line">
                    <span className="item-name">{item.quantity}x {item.product_name}</span>
                    <span className="item-price">{fmt(item.unit_price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="subtotal-line">
                <span>Subtotal:</span>
                <span>{fmt(selectedOrder.subtotal || selectedOrder.total)}</span>
              </div>
              {selectedOrder.tax_amount > 0 && (
                <div className="tax-line">
                  <span>IVA {selectedOrder.tax_rate}%:</span>
                  <span>{fmt(selectedOrder.tax_amount)}</span>
                </div>
              )}
              <div className="total-line">
                <span>TOTAL:</span>
                <span className="total-amount">{fmt(selectedOrder.total)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
              <button
                className="btn-complete"
                style={{ minWidth: 160, fontSize: 15, fontWeight: 800 }}
                onClick={() => handlePrintReceipt(selectedOrder)}
                disabled={notification?.type === 'success'}
              >
                <Printer size={18} /> Imprimir
              </button>
              <button className="btn-cancel" style={{ marginLeft: 12 }} onClick={() => setSelectedOrder(null)}>
                <X size={13} /> Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="empty-panel">
            <p>Selecciona una orden para reimprimir</p>
          </div>
        )}
      </div>
      {notification && (
        <div className={`notification ${notification.type}`}>{notification.msg}</div>
      )}
    </PageTemplate>
  );
}