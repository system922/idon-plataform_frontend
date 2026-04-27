import React, { useState, useEffect } from 'react';
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
  const { printerError } = useQzTray();
  const { print, getPrinterConfig } = usePrinterService();

  const [orders, setOrders] = useState([]);
  const [bizInfo, setBizInfo] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [foundCliente, setFoundCliente] = useState(null);
  const [clienteCedula, setClienteCedula] = useState('9999999999');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clientePhone, setClientePhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [printLoading, setPrintLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [, setClientApiLoading] = useState(false);

  // Normal payment state
  const [amountPaidRaw, setAmountPaidRaw] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [cardPaidRaw, setCardPaidRaw] = useState('');
  const [cardPaid, setCardPaid] = useState('');
  const [transferPaidRaw, setTransferPaidRaw] = useState('');
  const [transferPaid, setTransferPaid] = useState('');
  const [refCard, setRefCard] = useState('');
  const [refTransfer, setRefTransfer] = useState('');
  const [mixtoManual, setMixtoManual] = useState(new Set());

  // Split-specific state
  const [splitCurrentMethod, setSplitCurrentMethod] = useState('cash');
  const [splitAmountRaw, setSplitAmountRaw] = useState('');
  const [splitAmount, setSplitAmount] = useState('');
  const [splitCardRaw, setSplitCardRaw] = useState('');
  const [splitCard, setSplitCard] = useState('');
  const [splitTransferRaw, setSplitTransferRaw] = useState('');
  const [splitTransfer, setSplitTransfer] = useState('');
  const [splitRefCard, setSplitRefCard] = useState('');
  const [splitRefTransfer, setSplitRefTransfer] = useState('');
  const [splitMixtoManual, setSplitMixtoManual] = useState(new Set());
  const [splitGroups, setSplitGroups] = useState([]);

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

  const resetSplitFields = () => {
    setSplitAmountRaw('');
    setSplitAmount('');
    setSplitCardRaw('');
    setSplitCard('');
    setSplitTransferRaw('');
    setSplitTransfer('');
    setSplitRefCard('');
    setSplitRefTransfer('');
    setSplitMixtoManual(new Set());
  };

  const resetForm = async () => {
    setClienteCedula('9999999999');
    setClienteNombre('');
    setClientePhone('');
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
    setSplitGroups([]);
    resetSplitFields();
  };

  const loadOrders = async () => {
    try {
      const res = await fetchWithAuth('/api/ordenes');
      const raw = await res.json();
      if (Array.isArray(raw)) {
        setOrders(raw.filter(o => o.status !== 'paid'));
      }
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
          setClientePhone(data.phone || '');
          setFoundCliente({ ...data, tipo: docType });
        }
      } else {
        setClientePhone('');
        setFoundCliente(null);
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
      const resBusqueda = await fetchWithAuth(`/api/clientes?cedula=${documento}`);
      if (resBusqueda.ok) {
        const existe = await resBusqueda.json();
        if (Array.isArray(existe) && existe.length > 0 && existe[0].id) {
          return existe[0].id;
        }
      }
      const res = await fetchWithAuth('/api/customers', {
        method: 'POST',
        body: JSON.stringify({ nombre, cedula: documento, email, phone, tipo_documento }),
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
    setClientePhone('');
    setFoundCliente(null);
    setOrderNotes(o?.notes || '');
    setAmountPaid('');
    setPaymentMethod('cash');
    setSelectedItems([]);
    setSplitGroups([]);
    resetSplitFields();
    setSplitCurrentMethod('cash');
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
    const newManual = new Set(mixtoManual);
    if (value === 0) newManual.delete(field);
    else newManual.add(field);
    setMixtoManual(newManual);

    const vals = {
      cash:     field === 'cash'     ? value : (parseFloat(amountPaid)   || 0),
      card:     field === 'card'     ? value : (parseFloat(cardPaid)     || 0),
      transfer: field === 'transfer' ? value : (parseFloat(transferPaid) || 0),
    };

    const ALL = ['cash', 'card', 'transfer'];
    const autoFields = ALL.filter(f => !newManual.has(f));

    if (autoFields.length === 1) {
      const af = autoFields[0];
      const manualSum = ALL.filter(f => f !== af).reduce((s, f) => s + vals[f], 0);
      vals[af] = Math.round(Math.max(0, total - manualSum) * 100) / 100;
    } else if (autoFields.length === 2) {
      const manualField = ALL.find(f => newManual.has(f));
      const remainder = Math.round(Math.max(0, total - (manualField ? vals[manualField] : 0)) * 100) / 100;
      if (manualField === 'card') { vals.cash = remainder; vals.transfer = 0; }
      else if (manualField === 'cash') { vals.transfer = remainder; vals.card = 0; }
      else { vals.card = remainder; vals.cash = 0; }
    }

    setAmountPaid(vals.cash.toFixed(2));
    setAmountPaidRaw(String(Math.round(vals.cash * 100)));
    setCardPaid(vals.card.toFixed(2));
    setCardPaidRaw(String(Math.round(vals.card * 100)));
    setTransferPaid(vals.transfer.toFixed(2));
    setTransferPaidRaw(String(Math.round(vals.transfer * 100)));
  };

  const handleSplitMixtoField = (field, digits) => {
    const value = parseInt(digits || '0', 10) / 100;
    const splitTotal = getSplitSubtotal() + getSplitTax();
    const newManual = new Set(splitMixtoManual);
    if (value === 0) newManual.delete(field);
    else newManual.add(field);
    setSplitMixtoManual(newManual);

    const vals = {
      cash:     field === 'cash'     ? value : (parseFloat(splitAmount)   || 0),
      card:     field === 'card'     ? value : (parseFloat(splitCard)     || 0),
      transfer: field === 'transfer' ? value : (parseFloat(splitTransfer) || 0),
    };

    const ALL = ['cash', 'card', 'transfer'];
    const autoFields = ALL.filter(f => !newManual.has(f));

    if (autoFields.length === 1) {
      const af = autoFields[0];
      const manualSum = ALL.filter(f => f !== af).reduce((s, f) => s + vals[f], 0);
      vals[af] = Math.round(Math.max(0, splitTotal - manualSum) * 100) / 100;
    } else if (autoFields.length === 2) {
      const manualField = ALL.find(f => newManual.has(f));
      const remainder = Math.round(Math.max(0, splitTotal - (manualField ? vals[manualField] : 0)) * 100) / 100;
      if (manualField === 'card') { vals.cash = remainder; vals.transfer = 0; }
      else if (manualField === 'cash') { vals.transfer = remainder; vals.card = 0; }
      else { vals.card = remainder; vals.cash = 0; }
    }

    setSplitAmount(vals.cash.toFixed(2));
    setSplitAmountRaw(String(Math.round(vals.cash * 100)));
    setSplitCard(vals.card.toFixed(2));
    setSplitCardRaw(String(Math.round(vals.card * 100)));
    setSplitTransfer(vals.transfer.toFixed(2));
    setSplitTransferRaw(String(Math.round(vals.transfer * 100)));
  };

  // ── SPLIT helpers ──────────────────────────────────────────────────────────

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

  const change = Math.max(0, (parseFloat(amountPaid) || 0) - total);

  const mixtoCardAmt     = parseFloat(cardPaid) || 0;
  const mixtoTransferAmt = parseFloat(transferPaid) || 0;
  const mixtoCashAmt     = parseFloat(amountPaid) || 0;
  const mixtoCashNeeded  = Math.round(Math.max(0, total - mixtoCardAmt - mixtoTransferAmt) * 100) / 100;
  const mixtoChange      = Math.max(0, mixtoCashAmt - mixtoCashNeeded);
  const mixtoReady       = mixtoCashAmt >= mixtoCashNeeded && (mixtoCardAmt + mixtoTransferAmt + mixtoCashNeeded) > 0;

  // Split computed values
  const splitPayTotal    = paymentMethod === 'split' && selectedItems.length > 0 ? getPaymentTotal() : 0;
  const splitCashAmt     = parseFloat(splitAmount) || 0;
  const splitCardAmt     = parseFloat(splitCard) || 0;
  const splitTransferAmt = parseFloat(splitTransfer) || 0;
  const splitCashNeeded  = Math.round(Math.max(0, splitPayTotal - splitCardAmt - splitTransferAmt) * 100) / 100;
  const splitChange      = Math.max(0, splitCashAmt - splitPayTotal);
  const splitMixtoChange = Math.max(0, splitCashAmt - splitCashNeeded);
  const splitMixtoReady  = splitCashAmt >= splitCashNeeded && (splitCardAmt + splitTransferAmt + splitCashNeeded) > 0;
  const splitCobrarDisabled = printLoading || selectedItems.length === 0 || (
    splitCurrentMethod === 'cash'  ? splitCashAmt < splitPayTotal :
    splitCurrentMethod === 'mixto' ? !splitMixtoReady : false
  );

  // ── Impresión por grupo split ──────────────────────────────────────────────

  const handlePrintSplitGroup = async (group, order) => {
    try {
      const printerConfig = await getPrinterConfig('printer_main');
      const cashPmt = group.payments.find(p => p.method === 'cash');
      const cardPmt = group.payments.find(p => p.method === 'card');
      const trPmt   = group.payments.find(p => p.method === 'transfer');
      const pCash   = parseFloat(cashPmt?.amount) || 0;
      const pCard   = parseFloat(cardPmt?.amount) || 0;
      const pTr     = parseFloat(trPmt?.amount)   || 0;
      const openDrawer = group.method === 'cash' || (group.method === 'mixto' && pCash > 0);

      await print('printer_main', 'invoice', {
        bizInfo,
        invoice: {
          number: `${order.order_number || order.id}-${group.id}`,
          date:   new Date().toISOString(),
        },
        customer: {
          name: group.clienteNombre || 'CONSUMIDOR FINAL',
          id:   group.clienteCedula || '9999999999',
        },
        items: group.items.map(item => ({
          description: item.product_name || item.name || 'Producto',
          quantity:    item.quantity     || 1,
          price:       item.unit_price   || 0,
          total:       item.line_total   || (item.unit_price * item.quantity),
        })),
        subtotal:     group.subtotal,
        tax:          group.tax,
        taxRate:      order.vat_rate || 0.15,
        total:        group.total,
        payment:      { cash: pCash, card: pCard, other: pTr },
        printerFooter: printerConfig.footer,
      }, openDrawer);
    } catch (err) {
      console.error('Error imprimiendo grupo split:', err);
    }
  };

  // ── Cobro por grupo (split) ────────────────────────────────────────────────

  const handleSplitGroupPayment = async () => {
    setPrintLoading(true);
    setError('');
    setSuccess('');

    if (selectedItems.length === 0) {
      setError('Selecciona al menos un producto para cobrar');
      setPrintLoading(false);
      return;
    }

    const pagoTotal = getPaymentTotal();
    let payments = [];

    if (splitCurrentMethod === 'cash') {
      if (splitCashAmt < pagoTotal) {
        setError(`El pago debe ser al menos ${fmt(pagoTotal)}`);
        setPrintLoading(false);
        return;
      }
      payments = [{ method: 'cash', amount: pagoTotal.toFixed(2) }];
    } else if (splitCurrentMethod === 'card') {
      payments = [{ method: 'card', amount: pagoTotal.toFixed(2), reference_number: splitRefCard || null }];
    } else if (splitCurrentMethod === 'transfer') {
      payments = [{ method: 'transfer', amount: pagoTotal.toFixed(2), reference_number: splitRefTransfer || null }];
    } else if (splitCurrentMethod === 'mixto') {
      if (splitCashAmt < splitCashNeeded) {
        setError(`Falta ${fmt(splitCashNeeded - splitCashAmt)} en efectivo`);
        setPrintLoading(false);
        return;
      }
      if (splitCashNeeded  > 0) payments.push({ method: 'cash',     amount: splitCashNeeded.toFixed(2) });
      if (splitCardAmt     > 0) payments.push({ method: 'card',     amount: splitCardAmt.toFixed(2),     reference_number: splitRefCard     || null });
      if (splitTransferAmt > 0) payments.push({ method: 'transfer', amount: splitTransferAmt.toFixed(2), reference_number: splitRefTransfer || null });
    }

    const cedulaFinal = clienteCedula && clienteCedula.trim() !== '' ? clienteCedula : '9999999999';
    const nombreFinal = clienteNombre || 'CONSUMIDOR FINAL';
    const clienteId = await guardarClienteSiNoExiste(cedulaFinal, nombreFinal, null, clientePhone || null);

    if (!clienteId) {
      setError('No se pudo asociar cliente');
      setPrintLoading(false);
      return;
    }

    try {
      const selectedItemObjects = selectedOrder.items.filter(i => selectedItems.includes(i.id));
      const groupSubtotal = getSplitSubtotal();
      const groupTax      = getSplitTax();

      await fetchWithAuth(`/api/ordenes/${selectedOrder.id}/pay-items`, {
        method: 'POST',
        body: JSON.stringify({
          item_ids:       selectedItems,
          amount_paid:    pagoTotal,
          payment_method: splitCurrentMethod,
          payments:       payments.length > 1 ? payments : undefined,
          cliente_id:     clienteId,
          notes:          orderNotes,
        }),
      });

      const groupNum = splitGroups.length + 1;
      const newGroup = {
        id:            groupNum,
        items:         selectedItemObjects,
        subtotal:      groupSubtotal,
        tax:           groupTax,
        total:         pagoTotal,
        method:        splitCurrentMethod,
        payments,
        clienteCedula: cedulaFinal,
        clienteNombre: nombreFinal,
      };

      const newGroups = [...splitGroups, newGroup];
      setSplitGroups(newGroups);

      await handlePrintSplitGroup(newGroup, selectedOrder);

      const nuevosItems = selectedOrder.items.filter(i => !selectedItems.includes(i.id));
      setSelectedOrder({ ...selectedOrder, items: nuevosItems });
      setSelectedItems([]);
      resetSplitFields();

      if (nuevosItems.length === 0) {
        await fetchWithAuth(`/api/ordenes/${selectedOrder.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({
            status:         'paid',
            payment_method: 'split',
            amount_paid:    newGroups.reduce((s, g) => s + g.total, 0),
            cliente_id:     clienteId,
            notes:          orderNotes,
          }),
        });

        setOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
        setSplitGroups([]);
        setSuccess('¡Cuenta dividida y cerrada!');
        setTimeout(() => setSuccess(''), 2000);
        await resetForm();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setPrintLoading(false);
    }
  };

  // ── Cobro/Guardar (métodos normales) ───────────────────────────────────────

  const handlePayment = async () => {
    setPrintLoading(true);
    setError('');
    setSuccess('');

    let cedulaFinal = clienteCedula && clienteCedula.trim() !== '' ? clienteCedula : '9999999999';
    let nombreFinal = clienteNombre || 'CONSUMIDOR FINAL';

    const clienteId = await guardarClienteSiNoExiste(cedulaFinal, nombreFinal, null, clientePhone || null);

    if (!clienteId) {
      setError('No se pudo asociar cliente');
      setPrintLoading(false);
      return;
    }

    if (foundCliente?.id) {
      const nombreCambio = clienteNombre.trim() !== (foundCliente.name || '').trim();
      const phoneCambio  = (clientePhone || '') !== (foundCliente.phone || '');
      if (nombreCambio || phoneCambio) {
        fetchWithAuth(`/api/customers/${foundCliente.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: clienteNombre.trim(), phone: clientePhone || null }),
        }).catch(e => console.error('Error actualizando cliente:', e));
      }
    }

    // MIXTO
    if (selectedOrder && paymentMethod === 'mixto') {
      const cashNeeded = mixtoCashNeeded;

      if (mixtoCashAmt < cashNeeded) {
        setError(`Falta ${fmt(cashNeeded - mixtoCashAmt)} en efectivo`);
        setPrintLoading(false);
        return;
      }

      const mixtoPayments = [];
      if (cashNeeded      > 0) mixtoPayments.push({ method: 'cash',     amount: cashNeeded.toFixed(2),      reference_number: null });
      if (mixtoCardAmt    > 0) mixtoPayments.push({ method: 'card',     amount: mixtoCardAmt.toFixed(2),    reference_number: refCard     || null });
      if (mixtoTransferAmt > 0) mixtoPayments.push({ method: 'transfer', amount: mixtoTransferAmt.toFixed(2), reference_number: refTransfer || null });

      try {
        const res = await fetchWithAuth(`/api/ordenes/${selectedOrder.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({
            status:                   'paid',
            payment_method:           'mixto',
            amount_paid:              total,
            payments:                 mixtoPayments,
            cliente_id:               clienteId,
            customer_name:            clienteNombre,
            customer_document_number: clienteCedula,
            notes:                    orderNotes,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          setError(err.error || 'Error al completar pago');
          setPrintLoading(false);
          return;
        }

        const changeForPrint = mixtoCashAmt - cashNeeded;
        const invoiceNumMixto = await silentEmitInvoice(selectedOrder, clienteCedula, clienteNombre, 'mixto');
        await handlePrintReceipt(selectedOrder, total, changeForPrint, invoiceNumMixto);
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

    // NORMAL (cash, card, transfer)
    if (selectedOrder) {
      const paid = parseFloat(amountPaid) || 0;

      if (paid < total) {
        setError(`El pago debe ser al menos ${fmt(total)}`);
        setPrintLoading(false);
        return;
      }

      const refNum = paymentMethod === 'card'     ? (refCard     || null)
                   : paymentMethod === 'transfer'  ? (refTransfer || null)
                   : null;

      try {
        const res = await fetchWithAuth(`/api/ordenes/${selectedOrder.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({
            status:                   'paid',
            payment_method:           paymentMethod,
            amount_paid:              total,
            reference_number:         refNum,
            cliente_id:               clienteId,
            customer_name:            clienteNombre,
            customer_document_number: clienteCedula,
            notes:                    orderNotes,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          setError(errData.error || 'Error al completar pago');
          setPrintLoading(false);
          return;
        }

        const invoiceNum = await silentEmitInvoice(selectedOrder, clienteCedula, clienteNombre, paymentMethod);
        await handlePrintReceipt(selectedOrder, paid, change, invoiceNum);
        setOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
        setTimeout(() => setSuccess(''), 1800);
        await resetForm();
      } catch (err) {
        setError(err.message);
      } finally {
        setPrintLoading(false);
      }
    }
  };

  // ── Factura electrónica — emisión silenciosa ───────────────────────────────

  const FORMA_PAGO_MAP = { cash: '01', card: '19', transfer: '20', mixto: '01', split: '01' };

  async function silentEmitInvoice(order, custCedula, custNombre, method) {
    const cedula  = custCedula && custCedula.trim() !== '' ? custCedula : '9999999999';
    const isCF    = cedula === '9999999999' || cedula === '9999999999999';
    const isRUC   = !isCF && cedula.length === 13;
    const tipoId  = isCF ? '07' : isRUC ? '04' : '05';
    const taxRate = parseFloat(order.tax_rate) || 15;
    const ivaRate = taxRate > 1 ? taxRate : taxRate * 100;
    const phone   = clientePhone || foundCliente?.phone || null;
    const email   = foundCliente?.email || null;

    try {
      const res = await fetchWithAuth('/api/einvoicing/invoices/emit', {
        method: 'POST',
        body: JSON.stringify({
          order_id: order.id,
          customer: {
            name:                isCF ? 'CONSUMIDOR FINAL' : (custNombre || ''),
            ruc:                 isCF ? '9999999999999'    : cedula,
            email,
            phone,
            tipo_identificacion: tipoId,
          },
          items: (order.items || []).map(i => ({
            description: i.product_name || i.name || 'Producto',
            qty:         i.quantity || 1,
            unit_price:  parseFloat(i.unit_price) || 0,
            subtotal:    parseFloat(i.line_total) || (i.unit_price * i.quantity) || 0,
          })),
          subtotal:   parseFloat(order.subtotal)    || 0,
          iva_rate:   ivaRate,
          iva_amount: parseFloat(order.tax_amount)  || 0,
          total:      parseFloat(order.total)        || 0,
          forma_pago: FORMA_PAGO_MAP[method]         || '01',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.invoice_number || null;
      }
      return null;
    } catch (e) {
      console.error('Error al emitir factura electrónica:', e);
      return null;
    }
  }

  // ── Impresión ──────────────────────────────────────────────────────────────

  const handlePrintReceipt = async (order, paid, changeAmount, invoiceNumber = null) => {
    try {
      const printerConfig = await getPrinterConfig('printer_main');
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
        payment:  { cash: cashAmt, card: cardAmt, other: transferAmt },
        printerFooter: printerConfig.footer,
      }, paymentMethod === 'cash' || (paymentMethod === 'mixto' && cashAmt > 0));

      if (result.success) setSuccess(result.message);
      else setError(result.error);
    } catch (err) {
      console.error('Error imprimiendo:', err);
      setError('Error al imprimir');
    }
  };

  const METHOD_LABEL = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', mixto: 'Mixto' };

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
              type="text"
              inputMode="tel"
              placeholder="📱 Celular"
              value={clientePhone}
              onChange={e => setClientePhone(e.target.value.replace(/\D/g, '').slice(0, 15))}
              style={{ minWidth: 120, maxWidth: 140, flex: '1 1 120px', marginLeft: 4,
                border: clientePhone ? '1.5px solid #25d366' : undefined }}
            />
            <OpenDrawerButton />
          </div>

          {error      && <div style={{ fontSize: 12, color: '#e11d48', fontWeight: 800, marginTop: 6 }}>{error}</div>}
          {success    && <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 800, marginTop: 6 }}>{success}</div>}
          {printerError && <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 800, marginTop: 6 }}>⚠️ {printerError}</div>}

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
                <button className={paymentMethod === 'cash'     ? "pay-btn selected" : "pay-btn"} onClick={() => setPaymentMethod('cash')}>
                  <DollarSign size={15} /> Efectivo
                </button>
                <button className={paymentMethod === 'transfer' ? "pay-btn selected" : "pay-btn"} onClick={() => setPaymentMethod('transfer')}>
                  <DollarSign size={15} /> Transferencia
                </button>
                <button className={paymentMethod === 'card'     ? "pay-btn selected" : "pay-btn"} onClick={() => setPaymentMethod('card')}>
                  <CreditCard size={15} /> Tarjeta
                </button>
                <button className={paymentMethod === 'mixto'    ? "pay-btn selected" : "pay-btn"} onClick={() => setPaymentMethod('mixto')}>
                  <Divide size={15} /> Mixto
                </button>
                <button
                  className={paymentMethod === 'split' ? "pay-btn selected" : "pay-btn"}
                  onClick={() => { setPaymentMethod('split'); setSelectedItems([]); setSplitGroups([]); resetSplitFields(); setSplitCurrentMethod('cash'); }}
                >
                  <Divide size={15} /> Dividido
                </button>
              </div>

              {/* ── Campos normales (no split) ── */}
              {paymentMethod !== 'split' && (
                <div className="pay-input-row" style={{ gap: 24, flexWrap: 'wrap', alignItems: 'center', margin: '20px 0' }}>

                  {/* EFECTIVO */}
                  {paymentMethod === 'cash' && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fefefe', borderRadius: '9px', padding: '7px 18px' }}>
                        <label style={{ fontWeight: 900, color: '#231c41', fontSize: 18 }}>Recibido:</label>
                        <input
                          type="text" className="input-pay" inputMode="numeric" pattern="[0-9.,]*"
                          style={{ color: 'rgb(0,0,0)', background: '#ffffff', fontWeight: 'bold', fontSize: 18, border: '1.8px solid #000000' }}
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

                  {/* TARJETA / TRANSFERENCIA */}
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
                          type="text" className="input-pay"
                          style={{ background: '#eafffd', fontWeight: 'bold', fontSize: 18, border: '1.8px solid #b2d9cf' }}
                          value={paymentMethod === 'card' ? refCard : refTransfer}
                          onChange={e => { if (paymentMethod === 'card') setRefCard(e.target.value); else setRefTransfer(e.target.value); }}
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
                          type="text" className="input-pay" inputMode="numeric" pattern="[0-9.,]*"
                          style={{ color: '#090', background: '#eafffd', fontWeight: 'bold', fontSize: 18, border: '1.8px solid #b2d9cf' }}
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
                          type="text" className="input-pay" inputMode="numeric" pattern="[0-9.,]*"
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
                        <input type="text" className="input-pay" style={{ background: '#eafffd', fontWeight: 'bold', fontSize: 18, border: '1.8px solid #b2d9cf' }} value={refTransfer} onChange={e => setRefTransfer(e.target.value)} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#d7d6fc', borderRadius: '9px', padding: '7px 18px' }}>
                        <label style={{ fontWeight: 900, color: '#231c41', fontSize: 18 }}>Tarjeta:</label>
                        <input
                          type="text" className="input-pay" inputMode="numeric" pattern="[0-9.,]*"
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
                        <input type="text" className="input-pay" style={{ background: '#eafffd', fontWeight: 'bold', fontSize: 18, border: '1.8px solid #b2d9cf' }} value={refCard} onChange={e => setRefCard(e.target.value)} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: mixtoChange > 0 ? '#d7d6fc' : mixtoCashAmt < mixtoCashNeeded ? '#fee2e2' : '#dcfce7', borderRadius: '9px', padding: '7px 18px' }}>
                        {mixtoChange > 0 ? (
                          <><label style={{ fontWeight: 900, color: '#231c41', fontSize: 18 }}>Cambio:</label>
                            <span style={{ color: '#191933', fontWeight: 800, fontSize: 18 }}>{fmt(mixtoChange)}</span></>
                        ) : mixtoCashAmt < mixtoCashNeeded ? (
                          <><label style={{ fontWeight: 900, color: '#991b1b', fontSize: 18 }}>Falta efectivo:</label>
                            <span style={{ color: '#991b1b', fontWeight: 800, fontSize: 18 }}>{fmt(mixtoCashNeeded - mixtoCashAmt)}</span></>
                        ) : (
                          <label style={{ fontWeight: 900, color: '#16a34a', fontSize: 18 }}>✓ Pago completo</label>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── DIVIDIDO UI ── */}
              {paymentMethod === 'split' && (
                <div style={{ margin: '14px 0', padding: '14px 16px', background: '#f8f7ff', borderRadius: 12, border: '1.5px solid #d4d0f5' }}>

                  {/* Grupos ya cobrados */}
                  {splitGroups.length > 0 && (
                    <div style={{ marginBottom: 12, padding: '8px 10px', background: '#dcfce7', borderRadius: 8, border: '1px solid #86efac' }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: '#15803d', marginBottom: 4 }}>
                        Grupos cobrados ({splitGroups.length}):
                      </div>
                      {splitGroups.map(g => (
                        <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 2, flexWrap: 'wrap' }}>
                          <span style={{ background: '#16a34a', color: '#fff', borderRadius: 4, padding: '1px 7px', fontWeight: 700 }}>#{g.id}</span>
                          <span style={{ color: '#166534', flex: 1 }}>{g.items.map(i => `${i.quantity}x ${i.product_name || i.name}`).join(', ')}</span>
                          <span style={{ fontWeight: 700, color: '#15803d' }}>{fmt(g.total)}</span>
                          <span style={{ color: '#166534', fontSize: 11 }}>{METHOD_LABEL[g.method] || g.method}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedOrder.items.length === 0 ? (
                    <div style={{ fontWeight: 700, color: '#16a34a', textAlign: 'center', padding: 12 }}>
                      ✓ Todos los productos han sido cobrados
                    </div>
                  ) : (
                    <>
                      {/* Selección de productos */}
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#231c41' }}>
                        Grupo {splitGroups.length + 1} — Selecciona los productos a cobrar:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 12 }}>
                        {(selectedOrder.items || []).map((item, idx) => (
                          <label
                            key={idx}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                              padding: '5px 8px', borderRadius: 7, fontWeight: 600, fontSize: 13.5,
                              background: selectedItems.includes(item.id) ? '#e0e7ff' : '#fff',
                              border: selectedItems.includes(item.id) ? '1.5px solid #818cf8' : '1.5px solid #e5e7eb',
                              transition: 'background 0.1s, border 0.1s',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(item.id)}
                              onChange={e => setSelectedItems(prev =>
                                e.target.checked ? [...prev, item.id] : prev.filter(id => id !== item.id)
                              )}
                              style={{ width: 16, height: 16 }}
                            />
                            <span style={{ flex: 1 }}>{item.quantity}x {item.product_name || item.name}</span>
                            <span style={{ fontWeight: 700, color: '#4338ca' }}>{fmt(item.unit_price * item.quantity)}</span>
                          </label>
                        ))}
                      </div>

                      {/* Totales del grupo actual */}
                      {selectedItems.length > 0 && (
                        <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end', marginBottom: 10, fontSize: 13, flexWrap: 'wrap', borderTop: '1px dashed #c7d2fe', paddingTop: 8 }}>
                          <span>Subtotal: <b>{fmt(getSplitSubtotal())}</b></span>
                          <span>IVA: <b>{fmt(getSplitTax())}</b></span>
                          <span style={{ fontSize: 15, color: '#231c41' }}>Total: <b style={{ color: '#4338ca' }}>{fmt(splitPayTotal)}</b></span>
                        </div>
                      )}

                      {/* Método de pago para este grupo */}
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: '#231c41' }}>
                        Método de pago para este grupo:
                      </div>
                      <div style={{ display: 'flex', gap: 7, marginBottom: 12, flexWrap: 'wrap' }}>
                        {['cash', 'card', 'transfer', 'mixto'].map(m => (
                          <button
                            key={m}
                            className={splitCurrentMethod === m ? "pay-btn selected" : "pay-btn"}
                            style={{ fontSize: 12, padding: '5px 12px' }}
                            onClick={() => { setSplitCurrentMethod(m); resetSplitFields(); }}
                          >
                            {m === 'cash'     ? <><DollarSign size={13} /> Efectivo</>      :
                             m === 'card'     ? <><CreditCard size={13} /> Tarjeta</>       :
                             m === 'transfer' ? <><DollarSign size={13} /> Transferencia</> :
                                               <><Divide size={13} /> Mixto</>}
                          </button>
                        ))}
                      </div>

                      {/* Campos de pago del grupo */}
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>

                        {/* EFECTIVO */}
                        {splitCurrentMethod === 'cash' && (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fefefe', borderRadius: 9, padding: '7px 14px', border: '1px solid #ddd' }}>
                              <label style={{ fontWeight: 900, color: '#231c41', fontSize: 16 }}>Recibido:</label>
                              <input
                                type="text" className="input-pay" inputMode="numeric" pattern="[0-9.,]*"
                                style={{ color: '#000', background: '#fff', fontWeight: 'bold', fontSize: 16, border: '1.8px solid #000' }}
                                value={splitAmountRaw === '0' || splitAmountRaw === '' ? '' : (parseInt(splitAmountRaw, 10) / 100).toFixed(2)}
                                onChange={e => {
                                  let d = e.target.value.replace(/\D/g, '');
                                  if (!d) d = '0';
                                  if (d.length > 10) d = d.slice(0, 10);
                                  setSplitAmountRaw(d);
                                  setSplitAmount((parseInt(d, 10) / 100).toFixed(2));
                                }}
                                onFocus={e => e.target.select()}
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#d7d6fc', borderRadius: 9, padding: '7px 14px' }}>
                              <label style={{ fontWeight: 900, color: '#231c41', fontSize: 16 }}>Cambio:</label>
                              <span style={{ color: '#191933', fontWeight: 800, fontSize: 16 }}>{fmt(splitChange)}</span>
                            </div>
                          </>
                        )}

                        {/* TARJETA / TRANSFERENCIA */}
                        {(splitCurrentMethod === 'card' || splitCurrentMethod === 'transfer') && (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#d7d6fc', borderRadius: 9, padding: '7px 14px' }}>
                              <label style={{ fontWeight: 900, color: '#231c41', fontSize: 16 }}>Monto:</label>
                              <span style={{ color: '#090', background: '#eafffd', fontWeight: 'bold', fontSize: 16, border: '1.8px solid #b2d9cf', borderRadius: 6, padding: '4px 14px', minWidth: 80, display: 'inline-block', textAlign: 'right' }}>
                                {fmt(splitPayTotal)}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#d7d6fc', borderRadius: 9, padding: '7px 14px' }}>
                              <label style={{ fontWeight: 900, color: '#231c41', fontSize: 16 }}>Ref:</label>
                              <input
                                type="text" className="input-pay"
                                style={{ background: '#eafffd', fontWeight: 'bold', fontSize: 16, border: '1.8px solid #b2d9cf' }}
                                value={splitCurrentMethod === 'card' ? splitRefCard : splitRefTransfer}
                                onChange={e => { if (splitCurrentMethod === 'card') setSplitRefCard(e.target.value); else setSplitRefTransfer(e.target.value); }}
                              />
                            </div>
                          </>
                        )}

                        {/* MIXTO */}
                        {splitCurrentMethod === 'mixto' && (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#d7d6fc', borderRadius: 9, padding: '7px 12px' }}>
                              <label style={{ fontWeight: 900, color: '#231c41', fontSize: 15 }}>Efectivo:</label>
                              <input
                                type="text" className="input-pay" inputMode="numeric" pattern="[0-9.,]*"
                                style={{ color: '#090', background: '#eafffd', fontWeight: 'bold', fontSize: 15, border: '1.8px solid #b2d9cf' }}
                                value={splitAmountRaw === '0' || splitAmountRaw === '' ? '' : (parseInt(splitAmountRaw, 10) / 100).toFixed(2)}
                                onChange={e => {
                                  let d = e.target.value.replace(/\D/g, '');
                                  if (!d) d = '0';
                                  if (d.length > 10) d = d.slice(0, 10);
                                  handleSplitMixtoField('cash', d);
                                }}
                                onFocus={e => e.target.select()}
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#d7d6fc', borderRadius: 9, padding: '7px 12px', flexWrap: 'wrap' }}>
                              <label style={{ fontWeight: 900, color: '#231c41', fontSize: 15 }}>Transferencia:</label>
                              <input
                                type="text" className="input-pay" inputMode="numeric" pattern="[0-9.,]*"
                                style={{ background: '#eafffd', fontWeight: 'bold', fontSize: 15, border: '1.8px solid #b2d9cf' }}
                                value={splitTransferRaw === '0' || splitTransferRaw === '' ? '' : (parseInt(splitTransferRaw, 10) / 100).toFixed(2)}
                                onChange={e => {
                                  let d = e.target.value.replace(/\D/g, '');
                                  if (!d) d = '0';
                                  if (d.length > 10) d = d.slice(0, 10);
                                  handleSplitMixtoField('transfer', d);
                                }}
                                onFocus={e => e.target.select()}
                              />
                              <label style={{ fontWeight: 700, color: '#231c41', fontSize: 13 }}>Ref:</label>
                              <input type="text" className="input-pay" style={{ background: '#eafffd', fontWeight: 'bold', fontSize: 13, border: '1.8px solid #b2d9cf', maxWidth: 80 }} value={splitRefTransfer} onChange={e => setSplitRefTransfer(e.target.value)} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#d7d6fc', borderRadius: 9, padding: '7px 12px', flexWrap: 'wrap' }}>
                              <label style={{ fontWeight: 900, color: '#231c41', fontSize: 15 }}>Tarjeta:</label>
                              <input
                                type="text" className="input-pay" inputMode="numeric" pattern="[0-9.,]*"
                                style={{ background: '#eafffd', fontWeight: 'bold', fontSize: 15, border: '1.8px solid #b2d9cf' }}
                                value={splitCardRaw === '0' || splitCardRaw === '' ? '' : (parseInt(splitCardRaw, 10) / 100).toFixed(2)}
                                onChange={e => {
                                  let d = e.target.value.replace(/\D/g, '');
                                  if (!d) d = '0';
                                  if (d.length > 10) d = d.slice(0, 10);
                                  handleSplitMixtoField('card', d);
                                }}
                                onFocus={e => e.target.select()}
                              />
                              <label style={{ fontWeight: 700, color: '#231c41', fontSize: 13 }}>Ref:</label>
                              <input type="text" className="input-pay" style={{ background: '#eafffd', fontWeight: 'bold', fontSize: 13, border: '1.8px solid #b2d9cf', maxWidth: 80 }} value={splitRefCard} onChange={e => setSplitRefCard(e.target.value)} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: splitMixtoChange > 0 ? '#d7d6fc' : splitCashAmt < splitCashNeeded ? '#fee2e2' : '#dcfce7', borderRadius: 9, padding: '7px 12px' }}>
                              {splitMixtoChange > 0 ? (
                                <><label style={{ fontWeight: 900, color: '#231c41', fontSize: 15 }}>Cambio:</label>
                                  <span style={{ color: '#191933', fontWeight: 800, fontSize: 15 }}>{fmt(splitMixtoChange)}</span></>
                              ) : splitCashAmt < splitCashNeeded ? (
                                <><label style={{ fontWeight: 900, color: '#991b1b', fontSize: 15 }}>Falta:</label>
                                  <span style={{ color: '#991b1b', fontWeight: 800, fontSize: 15 }}>{fmt(splitCashNeeded - splitCashAmt)}</span></>
                              ) : (
                                <label style={{ fontWeight: 900, color: '#16a34a', fontSize: 15 }}>✓ Listo</label>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Botones acciones */}
              <div className="actions-row">
                {paymentMethod === 'split' ? (
                  <>
                    <button
                      className="btn-guardar"
                      disabled={splitCobrarDisabled}
                      onClick={handleSplitGroupPayment}
                    >
                      <Check size={16} /> {printLoading ? 'Procesando...' : `COBRAR GRUPO ${splitGroups.length + 1}`}
                    </button>
                    <button
                      className="btn-cancelar"
                      onClick={() => { setSplitGroups([]); setSelectedItems([]); resetSplitFields(); setSelectedOrder(null); }}
                    >
                      <X size={16} /> Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="btn-guardar"
                      disabled={printLoading || (
                        paymentMethod === 'mixto'
                          ? !mixtoReady
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
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </PageTemplate>
  );
}
