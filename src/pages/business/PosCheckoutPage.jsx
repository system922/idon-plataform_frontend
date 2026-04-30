import React, { useState, useEffect, useRef } from 'react';
import { Check, X, DollarSign, CreditCard, Divide } from 'react-feather';
import PageTemplate from '../../components/PageTemplate';
import OpenDrawerButton from '../../components/OpenDrawerButton';
import { useBusinessContext } from '../../admin/config/BusinessContext';
import { fetchWithAuth } from '../../config/apiBase';
import { useQzTray } from '../../components/useQzTray';
import { usePrinterService } from '../../services/usePrinterService';
import '../../styles/CheckoutModern.css';


export default function CheckoutModern() {
  const { selectedBusiness } = useBusinessContext();
  const { printerConnected, printerLoading, printerError } = useQzTray();
  const { print, getPrinterConfig, openCashDrawer } = usePrinterService();

  const [orders, setOrders] = useState([]);
  const [bizInfo, setBizInfo] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [foundCliente, setFoundCliente] = useState(null);
  const [clienteCedula, setClienteCedula] = useState('9999999999');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [printLoading, setPrintLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [clientApiLoading, setClientApiLoading] = useState(false);

  const [amountPaidRaw, setAmountPaidRaw] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [cardPaidRaw, setCardPaidRaw] = useState('');
  const [cardPaid, setCardPaid] = useState('');
  const [transferPaidRaw, setTransferPaidRaw] = useState('');
  const [transferPaid, setTransferPaid] = useState('');
  const [refCard, setRefCard] = useState('');
  const [refTransfer, setRefTransfer] = useState('');
  const [mixtoManual, setMixtoManual] = useState(new Set());


  // ── Carga inicial ──────────────────────────────────────────────────────────

  useEffect(() => {
    loadOrders();
  }, [selectedBusiness]);

  useEffect(() => {
    if (!selectedOrder) return;
    const t = Number(selectedOrder.total || 0);
    if (paymentMethod === 'card') {
      setAmountPaid(t.toFixed(2));
      setCardPaid(t.toFixed(2));
      setCardPaidRaw(String(Math.round(t * 100)));
      setTransferPaid('');
      setTransferPaidRaw('');
    } else if (paymentMethod === 'transfer') {
      setAmountPaid(t.toFixed(2));
      setTransferPaid(t.toFixed(2));
      setTransferPaidRaw(String(Math.round(t * 100)));
      setCardPaid('');
      setCardPaidRaw('');
    } else if (paymentMethod === 'mixto') {
      setAmountPaid('');
      setAmountPaidRaw('');
      setCardPaid('');
      setCardPaidRaw('');
      setTransferPaid('');
      setTransferPaidRaw('');
      setMixtoManual(new Set());
    }
  }, [paymentMethod, selectedOrder]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`;

  const resetForm = async () => {
    setClienteCedula('9999999999');
    setClienteNombre('');
    setClienteEmail('');
    setFoundCliente(null);
    setOrderNotes('');
    setSelectedOrder(null);
    setAmountPaid('');
    setAmountPaidRaw('');
    setCardPaid('');
    setCardPaidRaw('');
    setTransferPaid('');
    setTransferPaidRaw('');
    setRefCard('');
    setRefTransfer('');
    setMixtoManual(new Set());
  };

  const loadOrders = async () => {
    try {
      const res = await fetchWithAuth('/api/ordenes');
      const raw = await res.json();
      if (Array.isArray(raw)) {
        setOrders(raw.filter(o => o.status !== 'paid'));
      }
      // Obtener datos del negocio
      const bizRes = await fetchWithAuth('/api/settings/receipt-info');
      const bizData = await bizRes.json();
      setBizInfo(bizData);
    } catch (err) {
      console.error('Error cargando órdenes:', err);
    }
  };

  const buscarClientePorDocumento = async (documento) => {
    setClientApiLoading(true);
    setError('');
    setSuccess('');
    setFoundCliente(null);

    if (!documento || (documento.length !== 10 && documento.length !== 13)) {
      setClienteNombre('');
      setClientApiLoading(false);
      return;
    }

    try {
      let res;
      const docType = documento.length === 13 ? 'ruc' : 'cedula';

      res = await fetchWithAuth(`/api/customers/by-document?document_number=${documento}&document_type=${docType}`);

      if (res.ok) {
        const data = await res.json();
        if (data?.nombre || data?.name) {
          setClienteNombre(data.nombre || data.name);
          setClienteEmail(data.email || '');
          setFoundCliente({ ...data, tipo: docType });
        }
      } else {
        setClienteEmail('');
        setFoundCliente(null);
        // Buscar en API padrón Ecuador
        await buscarNombreEnPadronEcuador(documento.slice(0, 10));
      }
    } catch (err) {
      console.error('Error buscando cliente:', err);
    } finally {
      setClientApiLoading(false);
    }
  };

  const buscarNombreEnPadronEcuador = async (cedula10) => {
    try {
      const proxyUrl = 'https://infoplacas.herokuapp.com/';
      const targetUrl = 'https://si.secap.gob.ec/sisecap/logeo_web/json/busca_persona_registro_civil.php';
      const postData = new URLSearchParams({ documento: cedula10, tipo: '1' });

      const response = await fetch(proxyUrl + targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: postData
      });

      const textResponse = await response.text();
      if (textResponse) {
        const json = JSON.parse(textResponse);
        if (json?.nombres) {
          setClienteNombre((json.nombres + ' ' + (json.apellidos || '')).trim());
        }
      }
    } catch {
      setClienteNombre('');
    }
  };

  const guardarClienteSiNoExiste = async (documento, nombre, email = null, phone = null) => {
    const tipo_documento = documento.length === 13 ? 'ruc' : 'cedula';

    try {
      // Busca si existe
      const resBusqueda = await fetchWithAuth(`/api/clientes?cedula=${documento}`);
      if (resBusqueda.ok) {
        const existe = await resBusqueda.json();
        if (Array.isArray(existe) && existe.length > 0 && existe[0].id) {
          return existe[0].id;
        }
      }

      const res = await fetchWithAuth('/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          nombre,
          cedula: documento,
          email,
          phone,
          tipo_documento
        }),
      });

      if (res.ok) {
        const cliente = await res.json();
        setSuccess('Cliente nuevo');
        return cliente.id;
      }

      setError('Error al guardar cliente.');
      return null;
    } catch (err) {
      console.error('Error guardando cliente:', err);
      setError(err.message);
      return null;
    }
  };

  const handleSelectOrder = (oid) => {
    const o = orders.find(x => String(x.id) === oid);
    setSelectedOrder(o || null);
    setClienteCedula(o?.customer_document_number || '');
    setClienteNombre(o?.customer_name || '');
    setClienteEmail('');
    setFoundCliente(null);
    setOrderNotes(o?.notes || '');
    setAmountPaid('');
    setPaymentMethod('cash');
    setSelectedItems([]);
    setError('');
  };

  const onClienteCedulaBlurOrEnter = (e) => {
    if (
      (e.type === "blur" || (e.type === "keypress" && e.key === "Enter")) &&
      (clienteCedula.length === 10 || clienteCedula.length === 13)
    ) {
      buscarClientePorDocumento(clienteCedula);
    }
  };

  const handleMixtoField = (field, digits) => {
    const value = parseInt(digits || '0', 10) / 100;

    // Actualizar qué campos ingresó el usuario manualmente
    const newManual = new Set(mixtoManual);
    if (value === 0) newManual.delete(field);
    else newManual.add(field);
    setMixtoManual(newManual);

    // Valores actuales + el campo recién cambiado
    const vals = {
      cash:     field === 'cash'     ? value : (parseFloat(amountPaid)   || 0),
      card:     field === 'card'     ? value : (parseFloat(cardPaid)     || 0),
      transfer: field === 'transfer' ? value : (parseFloat(transferPaid) || 0),
    };

    const ALL = ['cash', 'card', 'transfer'];
    const autoFields = ALL.filter(f => !newManual.has(f));

    if (autoFields.length === 1) {
      // Dos campos manuales → el campo restante toma el faltante
      const af = autoFields[0];
      const manualSum = ALL.filter(f => f !== af).reduce((s, f) => s + vals[f], 0);
      vals[af] = Math.round(Math.max(0, total - manualSum) * 100) / 100;
    } else if (autoFields.length === 2) {
      // Un campo manual → el faltante va al auto de mayor prioridad (orden: transfer > card > cash)
      const manualField = ALL.find(f => newManual.has(f));
      const remainder   = Math.round(Math.max(0, total - (manualField ? vals[manualField] : 0)) * 100) / 100;
      if (manualField === 'card') {
        // Ingresó tarjeta → faltante en efectivo
        vals.cash = remainder; vals.transfer = 0;
      } else if (manualField === 'cash') {
        // Ingresó efectivo → faltante en transferencia primero
        vals.transfer = remainder; vals.card = 0;
      } else {
        // Ingresó transferencia → faltante en tarjeta
        vals.card = remainder; vals.cash = 0;
      }
    }
    // autoFields.length === 3 → nadie ingresó nada, no auto-rellenar

    setAmountPaid(vals.cash.toFixed(2));
    setAmountPaidRaw(String(Math.round(vals.cash * 100)));
    setCardPaid(vals.card.toFixed(2));
    setCardPaidRaw(String(Math.round(vals.card * 100)));
    setTransferPaid(vals.transfer.toFixed(2));
    setTransferPaidRaw(String(Math.round(vals.transfer * 100)));
  };

  // ── SPLIT ──────────────────────────────────────────────────────────────────

  const getSplitSubtotal = () =>
    selectedOrder && paymentMethod === 'split'
      ? selectedOrder.items
          .filter(i => selectedItems.includes(i.id))
          .reduce((sum, i) => sum + i.unit_price * i.quantity, 0)
      : (selectedOrder?.subtotal || 0);

  const getSplitTax = () =>
    selectedOrder && paymentMethod === 'split'
      ? selectedOrder.items
          .filter(i => selectedItems.includes(i.id))
          .reduce((sum, i) => sum + (i.line_total - i.unit_price * i.quantity), 0)
      : (selectedOrder?.tax_amount || 0);

  const getPaymentTotal = () => getSplitSubtotal() + getSplitTax();

  // ── Totales ────────────────────────────────────────────────────────────────

  const subtotal = selectedOrder ? Number(selectedOrder.subtotal || 0) : 0;
  const iva = selectedOrder ? Number(selectedOrder.tax_amount || 0) : 0;
  const total = selectedOrder ? Number(selectedOrder.total || 0) : 0;

  const change = Math.max(
    0,
    (parseFloat(amountPaid) || 0) -
      (paymentMethod === 'split' ? getPaymentTotal() : total)
  );

  const mixtoCardAmt     = parseFloat(cardPaid) || 0;
  const mixtoTransferAmt = parseFloat(transferPaid) || 0;
  const mixtoCashAmt     = parseFloat(amountPaid) || 0;
  const mixtoCashNeeded  = Math.round(Math.max(0, total - mixtoCardAmt - mixtoTransferAmt) * 100) / 100;
  const mixtoChange      = Math.max(0, mixtoCashAmt - mixtoCashNeeded);
  const mixtoReady       = mixtoCashAmt >= mixtoCashNeeded && (mixtoCardAmt + mixtoTransferAmt + mixtoCashNeeded) > 0;

  // ── Cobro/Guardar ──────────────────���───────────────────────────────────────

  const handlePayment = async () => {
    setPrintLoading(true);
    setError('');
    setSuccess('');

    let clienteId = null;

    let cedulaFinal = clienteCedula && clienteCedula.trim() !== '' ? clienteCedula : '9999999999';
    let nombreFinal = clienteNombre;

    if (!nombreFinal || nombreFinal.trim() === '') {
      nombreFinal = 'CONSUMIDOR FINAL';
    }

    if (cedulaFinal && nombreFinal) {
      clienteId = await guardarClienteSiNoExiste(cedulaFinal, nombreFinal, clienteEmail.trim() || null, null);
    }

    if (!clienteId) {
      setError('No se pudo asociar cliente');
      setPrintLoading(false);
      return;
    }

    // Actualizar nombre/email si el cliente ya existía y cambió algún dato
    if (foundCliente?.id) {
      const nombreCambio = clienteNombre.trim() !== (foundCliente.name || '').trim();
      const emailCambio  = clienteEmail.trim() !== (foundCliente.email || '').trim();
      if (nombreCambio || emailCambio) {
        fetchWithAuth(`/api/customers/${foundCliente.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: clienteNombre.trim(), email: clienteEmail.trim() || null }),
        }).catch(e => console.error('Error actualizando cliente:', e));
      }
    }

    // MIXTO
    if (selectedOrder && paymentMethod === 'mixto') {
      const cashAmt     = parseFloat(amountPaid) || 0;
      const cardAmt     = parseFloat(cardPaid) || 0;
      const transferAmt = parseFloat(transferPaid) || 0;
      const cashNeeded  = Math.round(Math.max(0, total - cardAmt - transferAmt) * 100) / 100;

      if (cashAmt < cashNeeded) {
        setError(`Falta ${fmt(cashNeeded - cashAmt)} en efectivo`);
        setPrintLoading(false);
        return;
      }

      const mixtoPayments = [];
      if (cashNeeded > 0)   mixtoPayments.push({ method: 'cash',     amount: cashNeeded.toFixed(2),  reference_number: null });
      if (cardAmt > 0)      mixtoPayments.push({ method: 'card',     amount: cardAmt.toFixed(2),     reference_number: refCard || null });
      if (transferAmt > 0)  mixtoPayments.push({ method: 'transfer', amount: transferAmt.toFixed(2), reference_number: refTransfer || null });

      try {
        const res = await fetchWithAuth(`/api/ordenes/${selectedOrder.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'paid',
            payment_method: 'mixto',
            amount_paid: total,
            payments: mixtoPayments,
            customer_id: clienteId,
            customer_name: clienteNombre,
            customer_document_number: clienteCedula,
            notes: orderNotes
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          setError(err.error || 'Error al completar pago');
          setPrintLoading(false);
          return;
        }

        const changeForPrint = cashAmt - cashNeeded;
        const invoiceNum = await emitirFactura(selectedOrder, clienteCedula, clienteNombre, 'mixto');
        await handlePrintReceipt(selectedOrder, total, changeForPrint, invoiceNum);
        setOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
        await resetForm();
        setTimeout(() => setSuccess(''), 1800);
      } catch (err) {
        setError(err.message);
      } finally {
        setPrintLoading(false);
      }
      return;
    }

    // SPLIT
    if (selectedOrder && paymentMethod === 'split') {
      if (selectedItems.length === 0) {
        setError("Selecciona al menos un producto para cobrar");
        setPrintLoading(false);
        return;
      }

      const pagoTotal = getPaymentTotal();
      const cash = parseFloat(amountPaid) || 0;
      const card = parseFloat(cardPaid) || 0;
      const transfer = parseFloat(transferPaid) || 0;

      const paid = cash + card + transfer;


      if (paid < pagoTotal) {
        setError(`El pago debe ser al menos ${fmt(pagoTotal)}`);
        setPrintLoading(false);
        return;
      }

      try {
        await fetchWithAuth(`/api/ordenes/${selectedOrder.id}/pay-items`, {
          method: 'POST',
          body: JSON.stringify({
            item_ids: selectedItems,
            amount_paid: pagoTotal, // 🔥 IMPORTANTE: no mandes el efectivo con cambio
            payment_method: paymentMethod,
            cliente_id: clienteId,
            notes: orderNotes
          }),
        });

        // 🔥 Marcar items pagados
        const nuevosItems = selectedOrder.items.map(i =>
          selectedItems.includes(i.id)
            ? { ...i, paid: true }
            : i
        );

        // 🔥 Recalcular lo que queda pendiente
        const remainingItems = nuevosItems.filter(i => !i.paid);

        const newSubtotal = remainingItems.reduce(
          (sum, i) => sum + (i.unit_price * i.quantity),
          0
        );

        const newTax = remainingItems.reduce(
          (sum, i) => sum + ((i.line_total || 0) - (i.unit_price * i.quantity)),
          0
        );

        const newTotal = newSubtotal + newTax;

        const newOrder = {
          ...selectedOrder,
          items: nuevosItems,
          subtotal: newSubtotal,
          tax_amount: newTax,
          total: newTotal
        };

        setSelectedOrder(newOrder);
        setSelectedItems([]);
        setAmountPaid('');

        // 🔥 Cambio SOLO para lo que se pagó
        const changeSplit = Math.max(0, paid - pagoTotal);

        // 🔥 Imprimir SOLO los items pagados
        await handlePrintReceipt(
          {
            ...selectedOrder,
            items: selectedOrder.items.filter(i => selectedItems.includes(i.id))
          },
          paid,
          changeSplit
        );

        // 🔥 Si TODO está pagado → cerrar orden
        const allPaid = nuevosItems.every(i => i.paid);

        if (allPaid) {
          await fetchWithAuth(`/api/ordenes/${selectedOrder.id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({
              status: 'paid',
              payment_method: 'split',
              amount_paid: selectedOrder.total,
              customer_id: clienteId,
              customer_name: clienteNombre,
              notes: orderNotes,
            }),
          });

          setOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
          setSelectedOrder(null);
          setTimeout(() => setSuccess(''), 1800);
        }

      } catch (err) {
        setError(err.message);
      } finally {
        setPrintLoading(false);
      }

      return;
    }

    // NO split (normal)
    if (selectedOrder) {
      const paid = parseFloat(amountPaid) || 0;

      if (paid < total) {
        setError(`El pago debe ser al menos ${fmt(total)}`);
        setPrintLoading(false);
        return;
      }

      // Para pos_payments siempre guardamos el total owed (no el efectivo recibido que incluye cambio)
      const refNum = paymentMethod === 'card' ? (refCard || null)
                   : paymentMethod === 'transfer' ? (refTransfer || null)
                   : null;

      try {
        const res = await fetchWithAuth(`/api/ordenes/${selectedOrder.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'paid',
            payment_method: paymentMethod,
            amount_paid: total,
            reference_number: refNum,
            customer_id: clienteId,
            customer_name: clienteNombre,
            customer_document_number: clienteCedula,
            notes: orderNotes
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          setError(errData.error || 'Error al completar pago');
          setPrintLoading(false);
          return;
        }

        const invoiceNum = await emitirFactura(selectedOrder, clienteCedula, clienteNombre, paymentMethod);
        await handlePrintReceipt(selectedOrder, paid, change, invoiceNum);
        setOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
        setSelectedOrder(null);
        setAmountPaid('');
        setTimeout(() => setSuccess(''), 1800);
        await resetForm();
      } catch (err) {
        setError(err.message);
      } finally {
        setPrintLoading(false);
      }
    }
  };

  // ── Factura electrónica ───────────────────────────────────────────────────

  const FORMA_PAGO_MAP = { cash: '01', card: '19', transfer: '20', mixto: '01', split: '01' };

  // Emite la factura y devuelve el número SRI (ahora rápido: backend guarda
  // como 'pendiente' y autoriza con el SRI en background)
  async function emitirFactura(order, custCedula, custNombre, method) {
    const cedula  = custCedula && custCedula.trim() !== '' ? custCedula : '9999999999';
    const isCF    = cedula === '9999999999' || cedula === '9999999999999';
    const isRUC   = !isCF && cedula.length === 13;
    const tipoId  = isCF ? '07' : isRUC ? '04' : '05';
    const taxRate = parseFloat(order.tax_rate) || 15;
    const ivaRate = taxRate > 1 ? taxRate : taxRate * 100;
    const email   = foundCliente?.email || clienteEmail.trim() || null;

    try {
      const res = await fetchWithAuth('/api/einvoicing/invoices/emit', {
        method: 'POST',
        body: JSON.stringify({
          order_id: order.id,
          customer: {
            name:                isCF ? 'CONSUMIDOR FINAL' : (custNombre || ''),
            ruc:                 isCF ? '9999999999999'    : cedula,
            email,
            tipo_identificacion: tipoId,
          },
          items: (order.items || []).map(i => ({
            description: i.product_name || i.name || 'Producto',
            qty:         i.quantity || 1,
            unit_price:  parseFloat(i.unit_price) || 0,
            subtotal:    parseFloat(i.line_total) || (i.unit_price * i.quantity) || 0,
          })),
          subtotal:   parseFloat(order.subtotal) || 0,
          iva_rate:   ivaRate,
          iva_amount: parseFloat(order.tax_amount) || 0,
          total:      parseFloat(order.total) || 0,
          forma_pago: FORMA_PAGO_MAP[method] || '01',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.invoice_number || null;
      }
      const errData = await res.json().catch(() => ({}));
      console.error('Error al emitir factura (HTTP', res.status, '):', errData.error || errData);
      return null;
    } catch (e) {
      console.error('Error al emitir factura:', e);
      return null;
    }
  }

  // ── Impresión ──────────────────────────────────────────────────────────────

  const handlePrintReceipt = async (order, paid, changeAmount, invoiceNumber = null) => {
    try {
      const printerConfig = await getPrinterConfig('printer_main');

      // Mapeo de forma de pago → { cash, card, other }
      const cashAmt     = paymentMethod === 'mixto' ? mixtoCashAmt     : paymentMethod === 'cash'     ? (parseFloat(amountPaid) || 0) : 0;
      const cardAmt     = paymentMethod === 'mixto' ? mixtoCardAmt     : paymentMethod === 'card'     ? (parseFloat(cardPaid)   || 0) : 0;
      const transferAmt = paymentMethod === 'mixto' ? mixtoTransferAmt : paymentMethod === 'transfer' ? (parseFloat(transferPaid) || 0) : 0;

      const result = await print('printer_main', 'invoice', {
        bizInfo,
        invoice: {
          number: invoiceNumber || order.order_number || order.id,
          date:   new Date().toISOString(),
        },
        customer: {
          name: clienteNombre || 'CONSUMIDOR FINAL',
          id:   clienteCedula || '9999999999',
        },
        items: (order.items || []).map(item => ({
          description: item.product_name || item.name || 'Producto',
          quantity:    item.quantity     || 1,
          price:       item.unit_price   || 0,
          total:       item.line_total   || (item.unit_price * item.quantity),
        })),
        subtotal: order.subtotal    || 0,
        tax:      order.tax_amount  || 0,
        taxRate:  order.vat_rate    || 0.15,
        total:    order.total       || 0,
        payment: {
          cash:  cashAmt,
          card:  cardAmt,
          other: transferAmt,
        },
        printerFooter: printerConfig.footer,
      }, paymentMethod === 'cash' || (paymentMethod === 'mixto' && cashAmt > 0));

      if (result.success) {
        setSuccess(result.message);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Error imprimiendo:', err);
      setError('Error al imprimir');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <PageTemplate
      title="Cobrar Orden"
      subtitle="Cobrar órdenes abiertas, imprimir recibo y abrir caja"
      backButton
    >
      <div className="checkout-modern-main">
        <div className="checkout-modern-card">
          {/* Combobox y cliente */}
          <div className="cmbx-row" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <label className="label" style={{ minWidth: 50, flex: '0 0 50px' }}>Orden:</label>
            <select
              value={selectedOrder?.id || ''}
              onChange={e => handleSelectOrder(e.target.value)}
              className="combobox"
              style={{ minWidth: 180, maxWidth: 180, flex: '1 1 180px' }}
            >
              <option value="">Seleccionar No. Orden</option>
              {orders.map(order => (
                <option key={order.id} value={order.id}>
                  {order.mesa_numero ? `Mesa ${order.mesa_numero}` : order.order_type === 'delivery' ? 'DELIVERY' : 'PARA LLEVAR'} - #{order.order_number || order.id}
                </option>
              ))}
            </select>

            <label className="label" style={{ minWidth: 50, flex: '0 0 50px', marginLeft: 16 }}>Cliente:</label>
            <input
              className="client-inp"
              type="text"
              placeholder="Cédula/RUC"
              value={clienteCedula}
              onChange={e => setClienteCedula(e.target.value.replace(/\D/g, '').slice(0, 13))}
              onBlur={onClienteCedulaBlurOrEnter}
              onKeyPress={onClienteCedulaBlurOrEnter}
              disabled={!selectedOrder}
              style={{ minWidth: 120, maxWidth: 120, flex: '1 1 120px', marginLeft: 4 }}
            />

            <input
              className="client-inp"
              type="text"
              placeholder="Nombre cliente (opcional)"
              value={clienteNombre}
              onChange={e => setClienteNombre(e.target.value)}
              style={{ minWidth: 240, maxWidth: 300, flex: '2 1 240px', marginLeft: 6 }}
            />

            <input
              className="client-inp"
              type="email"
              inputMode="email"
              placeholder="✉ Email (factura)"
              value={clienteEmail}
              onChange={e => setClienteEmail(e.target.value)}
              style={{ minWidth: 160, maxWidth: 200, flex: '1 1 160px', marginLeft: 4,
                border: clienteEmail ? '1.5px solid #6842fe' : undefined }}
            />
            <OpenDrawerButton />
          </div>

          {error && <div style={{ fontSize: 12, color: '#e11d48', fontWeight: 800, marginTop: 6 }}>{error}</div>}
          {success && <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 800, marginTop: 6 }}>{success}</div>}
          {printerError && <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 800, marginTop: 6 }}>⚠️ {printerError}</div>}
          
          {/* Contenido si hay orden seleccionada */}
          {selectedOrder && (
            <>
              {/* Detalle Pedido */}
              <div className="order-details">
                <div className="order-head">
                  <b>
                    {selectedOrder.mesa_numero ? `Mesa ${selectedOrder.mesa_numero}` : selectedOrder.order_type === 'delivery' ? 'DELIVERY' : 'PARA LLEVAR'}{' '}
                    <span style={{ fontWeight: 400, fontSize: 13, color: '#999' }}>
                      # {selectedOrder.order_number || selectedOrder.id}
                    </span>
                  </b>
                </div>

                <div className="order-items">
                  {(selectedOrder.items || []).map((item, idx) => (
                    <div key={idx} className="item-line">
                      <span>{item.quantity}x {item.product_name || item.name}</span>
                      <span className="item-amt">{fmt(item.unit_price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                <div className="totals-footer">
                  <div className="sub-iva-total">
                    <span>SUBTOTAL:</span>
                    <span>{fmt(paymentMethod === 'split' ? getSplitSubtotal() : subtotal)}</span>
                  </div>
                  <div className="sub-iva-total">
                    <span>IVA:</span>
                    <span>{fmt(paymentMethod === 'split' ? getSplitTax() : iva)}</span>
                  </div>
                  <div className="sub-iva-total">
                    <span>TOTAL:</span>
                    <span>{fmt(paymentMethod === 'split' ? getPaymentTotal() : total)}</span>
                  </div>
                </div>
              </div>

              {/* Métodos de Pago */}
              <div className="pay-methods">
                <button
                  className={paymentMethod === 'cash' ? "pay-btn selected" : "pay-btn"}
                  onClick={() => setPaymentMethod('cash')}
                >
                  <DollarSign size={15} /> Efectivo
                </button>
                <button
                  className={paymentMethod === 'transfer' ? "pay-btn selected" : "pay-btn"}
                  onClick={() => setPaymentMethod('transfer')}
                >
                  <DollarSign size={15} /> Transferencia
                </button>
                <button
                  className={paymentMethod === 'card' ? "pay-btn selected" : "pay-btn"}
                  onClick={() => setPaymentMethod('card')}
                >
                  <CreditCard size={15} /> Tarjeta
                </button>
                <button
                  className={paymentMethod === 'mixto' ? "pay-btn selected" : "pay-btn"}
                  onClick={() => setPaymentMethod('mixto')}
                >
                  <Divide size={15} /> Mixto
                </button>
                <button
                  className={paymentMethod === 'split' ? "pay-btn selected" : "pay-btn"}
                  onClick={() => setPaymentMethod('split')}
                >
                  <Divide size={15} /> Dividido
                </button>
              </div>

              {/* Campos de monto según método */}
              <div className="pay-input-row" style={{ gap: 24, flexWrap: 'wrap', alignItems: 'center', margin: '20px 0' }}>
                {/* EFECTIVO */}
                {paymentMethod === 'cash' && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fefefe', borderRadius: '9px', padding: '7px 18px' }}>
                      <label style={{ fontWeight: 900, color: '#231c41', fontSize: 18 }}>Recibido:</label>
                      <input
                        type="text"
                        className="input-pay"
                        style={{ color: 'rgb(0, 0, 0)', background: '#ffffff', fontWeight: 'bold', fontSize: 18, border: '1.8px solid #000000' }}
                        inputMode="numeric"
                        pattern="[0-9.,]*"
                        value={amountPaidRaw === '0' || amountPaidRaw === '' ? '' : (parseInt(amountPaidRaw, 10) / 100).toFixed(2)}
                        onChange={e => {
                          let digits = e.target.value.replace(/\D/g, '');
                          if (!digits) digits = '0';
                          if (digits.length > 10) digits = digits.slice(0, 10);
                          setAmountPaidRaw(digits);
                          setAmountPaid((parseInt(digits, 10) / 100).toFixed(2));
                        }}
                        onFocus={e => e.target.select()}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#d7d6fc', borderRadius: '9px', padding: '7px 18px' }}>
                      <label style={{ fontWeight: 900, color: '#231c41', fontSize: 18 }}>Cambio:</label>
                      <span style={{ color: '#191933', fontWeight: 800, fontSize: 18 }}>{fmt(change)}</span>
                    </div>
                  </>
                )}

                

                {/* TARJETA/TRANSFERENCIA */}
                {(paymentMethod === 'card' || paymentMethod === 'transfer') && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#d7d6fc', borderRadius: '9px', padding: '7px 18px' }}>
                      <label style={{ fontWeight: 900, color: '#231c41', fontSize: 18 }}>Monto:</label>
                      <span style={{ color: '#090', background: '#eafffd', fontWeight: 'bold', fontSize: 18, border: '1.8px solid #b2d9cf', borderRadius: 6, padding: '4px 14px', minWidth: 90, display: 'inline-block', textAlign: 'right' }}>
                        {fmt(total)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#d7d6fc', borderRadius: '9px', padding: '7px 18px' }}>
                      <label style={{ fontWeight: 900, color: '#231c41', fontSize: 18 }}>Ref:</label>
                      <input
                        type="text"
                        className="input-pay"
                        style={{ background: '#eafffd', fontWeight: 'bold', fontSize: 18, border: '1.8px solid #b2d9cf' }}
                        value={paymentMethod === 'card' ? refCard : refTransfer}
                        onChange={e => {
                          if (paymentMethod === 'card') setRefCard(e.target.value);
                          else setRefTransfer(e.target.value);
                        }}
                      />
                    </div>
                  </>
                )}

                {/* MIXTO */}
                {paymentMethod === 'mixto' && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#d7d6fc', borderRadius: '9px', padding: '7px 18px' }}>
                      <label style={{ fontWeight: 900, color: '#231c41', fontSize: 18 }}>Efectivo:</label>
                      <input
                        type="text"
                        className="input-pay"
                        style={{ color: '#090', background: '#eafffd', fontWeight: 'bold', fontSize: 18, border: '1.8px solid #b2d9cf' }}
                        inputMode="numeric"
                        pattern="[0-9.,]*"
                        value={amountPaidRaw === '0' || amountPaidRaw === '' ? '' : (parseInt(amountPaidRaw, 10) / 100).toFixed(2)}
                        onChange={e => {
                          let digits = e.target.value.replace(/\D/g, '');
                          if (!digits) digits = '0';
                          if (digits.length > 10) digits = digits.slice(0, 10);
                          handleMixtoField('cash', digits);
                        }}
                        onFocus={e => e.target.select()}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#d7d6fc', borderRadius: '9px', padding: '7px 18px' }}>
                      <label style={{ fontWeight: 900, color: '#231c41', fontSize: 18 }}>Transferencia:</label>
                      <input
                        type="text"
                        className="input-pay"
                        inputMode="numeric"
                        pattern="[0-9.,]*"
                        style={{ background: '#eafffd', fontWeight: 'bold', fontSize: 18, border: '1.8px solid #b2d9cf' }}
                        value={transferPaidRaw === '0' || transferPaidRaw === '' ? '' : (parseInt(transferPaidRaw, 10) / 100).toFixed(2)}
                        onChange={e => {
                          let digits = e.target.value.replace(/\D/g, '');
                          if (!digits) digits = '0';
                          if (digits.length > 10) digits = digits.slice(0, 10);
                          handleMixtoField('transfer', digits);
                        }}
                        onFocus={e => e.target.select()}
                      />
                      <label style={{ fontWeight: 900, color: '#231c41', fontSize: 18 }}>Ref:</label>
                      <input
                        type="text"
                        className="input-pay"
                        style={{ background: '#eafffd', fontWeight: 'bold', fontSize: 18, border: '1.8px solid #b2d9cf' }}
                        value={refTransfer}
                        onChange={e => setRefTransfer(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#d7d6fc', borderRadius: '9px', padding: '7px 18px' }}>
                      <label style={{ fontWeight: 900, color: '#231c41', fontSize: 18 }}>Tarjeta:</label>
                      <input
                        type="text"
                        className="input-pay"
                        inputMode="numeric"
                        pattern="[0-9.,]*"
                        style={{ background: '#eafffd', fontWeight: 'bold', fontSize: 18, border: '1.8px solid #b2d9cf' }}
                        value={cardPaidRaw === '0' || cardPaidRaw === '' ? '' : (parseInt(cardPaidRaw, 10) / 100).toFixed(2)}
                        onChange={e => {
                          let digits = e.target.value.replace(/\D/g, '');
                          if (!digits) digits = '0';
                          if (digits.length > 10) digits = digits.slice(0, 10);
                          handleMixtoField('card', digits);
                        }}
                        onFocus={e => e.target.select()}
                      />
                      <label style={{ fontWeight: 900, color: '#231c41', fontSize: 18 }}>Ref:</label>
                      <input
                        type="text"
                        className="input-pay"
                        style={{ background: '#eafffd', fontWeight: 'bold', fontSize: 18, border: '1.8px solid #b2d9cf' }}
                        value={refCard}
                        onChange={e => setRefCard(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: mixtoChange > 0 ? '#d7d6fc' : mixtoCashAmt < mixtoCashNeeded ? '#fee2e2' : '#dcfce7', borderRadius: '9px', padding: '7px 18px' }}>
                      {mixtoChange > 0 ? (
                        <>
                          <label style={{ fontWeight: 900, color: '#231c41', fontSize: 18 }}>Cambio:</label>
                          <span style={{ color: '#191933', fontWeight: 800, fontSize: 18 }}>{fmt(mixtoChange)}</span>
                        </>
                      ) : mixtoCashAmt < mixtoCashNeeded ? (
                        <>
                          <label style={{ fontWeight: 900, color: '#991b1b', fontSize: 18 }}>Falta efectivo:</label>
                          <span style={{ color: '#991b1b', fontWeight: 800, fontSize: 18 }}>{fmt(mixtoCashNeeded - mixtoCashAmt)}</span>
                        </>
                      ) : (
                        <label style={{ fontWeight: 900, color: '#16a34a', fontSize: 18 }}>✓ Pago completo</label>
                      )}
                    </div>
                  </>
                )}

                {/* SPLIT: Selección de items */}
                {paymentMethod === 'split' && selectedOrder && (
                <>
                  <div style={{ fontWeight: 700, fontSize: 12, marginTop: 4 }}>
                    Selecciona los productos a cobrar:
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {(selectedOrder.items || []).map((item, idx) => (
                      <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <input
                          type="checkbox"
                          disabled={item.paid}
                          checked={selectedItems.includes(item.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedItems(prev => [...prev, item.id]);
                            } else {
                              setSelectedItems(prev => prev.filter(id => id !== item.id));
                            }
                          }}
                        />
                        {item.quantity}x {item.product_name || item.name}
                      </label>
                    ))}
                  </div>

                  {/* 💰 PAGOS */}
                  <div style={{ marginTop: 15 }}>
                    <b>Métodos de pago:</b>

                    {/* EFECTIVO */}
                    <input
                      placeholder="Efectivo"
                      value={amountPaid}
                      onChange={e => setAmountPaid(e.target.value)}
                    />

                    {/* TARJETA */}
                    <input
                      placeholder="Tarjeta"
                      value={cardPaid}
                      onChange={e => setCardPaid(e.target.value)}
                    />

                    {/* TRANSFERENCIA */}
                    <input
                      placeholder="Transferencia"
                      value={transferPaid}
                      onChange={e => setTransferPaid(e.target.value)}
                    />
                  </div>
                </>
              )}

              </div>

              {/* Botones acciones */}
              <div className="actions-row">
                <button
                  className="btn-guardar"
                  disabled={printLoading || (
                    paymentMethod === 'mixto'
                      ? !mixtoReady
                      : paymentMethod === 'split'
                        ? (parseFloat(amountPaid) < getPaymentTotal() || selectedItems.length === 0)
                        : paymentMethod === 'cash'
                          ? (!amountPaid || parseFloat(amountPaid) < total)
                          : false
                  )}
                  onClick={handlePayment}
                >
                  <Check size={16} /> {printLoading ? 'Procesando...' : 'GUARDAR'}
                </button>
                <button className="btn-cancelar" onClick={() => setSelectedOrder(null)}>
                  <X size={16} /> Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      </div>


    </PageTemplate>
  );
}