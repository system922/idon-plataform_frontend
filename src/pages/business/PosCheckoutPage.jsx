import React, { useState, useEffect } from 'react';
import { Check, X, DollarSign, CreditCard, Divide, Users, FileText } from 'react-feather';
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
  
  // NUEVO: Para pago dividido con múltiples clientes
  const [splitCustomers, setSplitCustomers] = useState([]);
  const [generarFacturaSplit, setGenerarFacturaSplit] = useState(true);

  // ── Helper para redondear ─────────────────────────────────────────────────
  const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    loadOrders();
  }, [selectedBusiness]);

  useEffect(() => {
    if (!selectedOrder) return;
    const t = paymentMethod === 'split' ? getPaymentTotal() : Number(selectedOrder.total || 0);
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
    } else if (paymentMethod === 'split') {
      setAmountPaid('');
      setAmountPaidRaw('');
      setCardPaid('');
      setCardPaidRaw('');
      setTransferPaid('');
      setTransferPaidRaw('');
      setSelectedItems([]);
      // Inicializar con un cliente por defecto
      if (splitCustomers.length === 0) {
        setSplitCustomers([{
          id: Date.now(),
          nombre: '',
          cedula: '',
          items: [],
          email: ''
        }]);
      }
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
    setSelectedItems([]);
    setSplitCustomers([]);
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
          setClienteEmail(data.email || '');
          setFoundCliente({ ...data, tipo: docType });
        }
      } else {
        setClienteEmail('');
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
    setSplitCustomers([]);
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
    const currentTotal = selectedOrder ? Number(selectedOrder.total || 0) : 0;

    const value = parseInt(digits || '0', 10) / 100;

    const newManual = new Set(mixtoManual);
    if (value === 0) newManual.delete(field);
    else newManual.add(field);
    setMixtoManual(newManual);

    const vals = {
      cash: field === 'cash' ? value : (parseFloat(amountPaid) || 0),
      card: field === 'card' ? value : (parseFloat(cardPaid) || 0),
      transfer: field === 'transfer' ? value : (parseFloat(transferPaid) || 0),
    };

    const ALL = ['cash', 'card', 'transfer'];
    const autoFields = ALL.filter(f => !newManual.has(f));

    if (autoFields.length === 1) {
      const af = autoFields[0];
      const manualSum = ALL.filter(f => f !== af).reduce((s, f) => s + vals[f], 0);
      vals[af] = Math.round(Math.max(0, currentTotal - manualSum) * 100) / 100;
    } else if (autoFields.length === 2) {
      const manualField = ALL.find(f => newManual.has(f));
      const remainder = Math.round(Math.max(0, currentTotal - (manualField ? vals[manualField] : 0)) * 100) / 100;

      if (manualField === 'card') {
        vals.cash = remainder;
        vals.transfer = 0;
      } else if (manualField === 'cash') {
        vals.transfer = remainder;
        vals.card = 0;
      } else {
        vals.card = remainder;
        vals.cash = 0;
      }
    }

    setAmountPaid(vals.cash.toFixed(2));
    setAmountPaidRaw(String(Math.round(vals.cash * 100)));
    setCardPaid(vals.card.toFixed(2));
    setCardPaidRaw(String(Math.round(vals.card * 100)));
    setTransferPaid(vals.transfer.toFixed(2));
    setTransferPaidRaw(String(Math.round(vals.transfer * 100)));
  };

  // ── Funciones para SPLIT con múltiples clientes ───────────────────────────
  
  const addSplitCustomer = () => {
    setSplitCustomers([
      ...splitCustomers,
      {
        id: Date.now(),
        nombre: '',
        cedula: '',
        items: [],
        email: ''
      }
    ]);
  };

  const removeSplitCustomer = (customerId) => {
    if (splitCustomers.length === 1) {
      setError('Debe haber al menos un cliente para el pago dividido');
      return;
    }
    // Devolver los items al pool de no asignados
    const customer = splitCustomers.find(c => c.id === customerId);
    if (customer && customer.items.length > 0) {
      setSelectedItems([...selectedItems, ...customer.items]);
    }
    setSplitCustomers(splitCustomers.filter(c => c.id !== customerId));
  };

  const updateSplitCustomer = (customerId, field, value) => {
    setSplitCustomers(splitCustomers.map(customer => {
      if (customer.id === customerId) {
        return { ...customer, [field]: value };
      }
      return customer;
    }));
  };

  const assignItemsToCustomer = (customerId, itemsToAssign) => {
    setSplitCustomers(splitCustomers.map(customer => {
      if (customer.id === customerId) {
        return {
          ...customer,
          items: [...customer.items, ...itemsToAssign]
        };
      }
      return customer;
    }));
    setSelectedItems([]);
  };

  const removeItemFromCustomer = (customerId, itemId) => {
    setSplitCustomers(splitCustomers.map(customer => {
      if (customer.id === customerId) {
        return {
          ...customer,
          items: customer.items.filter(id => id !== itemId)
        };
      }
      return customer;
    }));
    setSelectedItems([...selectedItems, itemId]);
  };

  // ── SPLIT - Cálculo de totals con tax_rate REAL ────────────────────────────
  
  const getSplitSubtotal = () => {
    if (!selectedOrder || paymentMethod !== 'split') return 0;

    return selectedOrder.items
      .filter(i => selectedItems.includes(i.id) && !i.paid)
      .reduce((sum, i) => {
        return sum + (Number(i.unit_price) * i.quantity);
      }, 0);
  };

  const getSplitTax = () => {
    if (!selectedOrder || paymentMethod !== 'split') return 0;

    return selectedOrder.items
      .filter(i => selectedItems.includes(i.id) && !i.paid)
      .reduce((sum, i) => {
        const taxRate = Number(i.tax_rate) || 0;
        const itemSubtotal = Number(i.unit_price) * i.quantity;
        const itemTax = (itemSubtotal * taxRate) / 100;
        return sum + round2(itemTax);
      }, 0);
  };

  const getPaymentTotal = () => getSplitSubtotal() + getSplitTax();

  const getCustomerTotal = (customer) => {
    if (!selectedOrder) return 0;
    
    let subtotal = 0;
    let tax = 0;
    
    customer.items.forEach(itemId => {
      const item = selectedOrder.items.find(i => i.id === itemId);
      if (item && !item.paid) {
        const itemSubtotal = Number(item.unit_price) * item.quantity;
        const taxRate = Number(item.tax_rate) || 0;
        const itemTax = (itemSubtotal * taxRate) / 100;
        subtotal += itemSubtotal;
        tax += itemTax;
      }
    });
    
    return subtotal + tax;
  };

  // ── Totales de la orden completa ──────────────────────────────────────────
  const subtotal = selectedOrder ? Number(selectedOrder.subtotal || 0) : 0;
  const iva = selectedOrder ? Number(selectedOrder.tax_amount || 0) : 0;
  const total = selectedOrder ? Number(selectedOrder.total || 0) : 0;

  const totalAPagar = paymentMethod === 'split' ? getPaymentTotal() : total;
  const change = Math.max(0, (parseFloat(amountPaid) || 0) - totalAPagar);

  const mixtoCardAmt = parseFloat(cardPaid) || 0;
  const mixtoTransferAmt = parseFloat(transferPaid) || 0;
  const mixtoCashAmt = parseFloat(amountPaid) || 0;
  const mixtoCashNeeded = Math.round(Math.max(0, total - mixtoCardAmt - mixtoTransferAmt) * 100) / 100;
  const mixtoChange = Math.max(0, mixtoCashAmt - mixtoCashNeeded);
  const mixtoReady = mixtoCashAmt >= mixtoCashNeeded && (mixtoCardAmt + mixtoTransferAmt + mixtoCashNeeded) > 0;

  const handleSelectItem = (itemId) => {
    setSelectedItems((prevSelected) => {
      if (prevSelected.includes(itemId)) {
        return prevSelected.filter(id => id !== itemId);
      }
      return [...prevSelected, itemId];
    });
  };

  // ── Cobro/Guardar ──────────────────────────────────────────────────────────
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

    if (cedulaFinal && nombreFinal && paymentMethod !== 'split') {
      clienteId = await guardarClienteSiNoExiste(cedulaFinal, nombreFinal, clienteEmail.trim() || null, null);
    }

    if (!clienteId && paymentMethod !== 'split' && cedulaFinal !== '9999999999') {
      setError('No se pudo asociar cliente');
      setPrintLoading(false);
      return;
    }

    if (foundCliente?.id && paymentMethod !== 'split') {
      const nombreCambio = clienteNombre.trim() !== (foundCliente.name || '').trim();
      const emailCambio = clienteEmail.trim() !== (foundCliente.email || '').trim();
      if (nombreCambio || emailCambio) {
        fetchWithAuth(`/api/customers/${foundCliente.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: clienteNombre.trim(), email: clienteEmail.trim() || null }),
        }).catch(e => console.error('Error actualizando cliente:', e));
      }
    }

    // MIXTO (original)
    if (selectedOrder && paymentMethod === 'mixto') {
      const cashAmt = parseFloat(amountPaid) || 0;
      const cardAmt = parseFloat(cardPaid) || 0;
      const transferAmt = parseFloat(transferPaid) || 0;
      const cashNeeded = Math.round(Math.max(0, total - cardAmt - transferAmt) * 100) / 100;

      if (cashAmt < cashNeeded) {
        setError(`Falta ${fmt(cashNeeded - cashAmt)} en efectivo`);
        setPrintLoading(false);
        return;
      }

      const mixtoPayments = [];
      if (cashNeeded > 0) mixtoPayments.push({ method: 'cash', amount: cashNeeded.toFixed(2), reference_number: null });
      if (cardAmt > 0) mixtoPayments.push({ method: 'card', amount: cardAmt.toFixed(2), reference_number: refCard || null });
      if (transferAmt > 0) mixtoPayments.push({ method: 'transfer', amount: transferAmt.toFixed(2), reference_number: refTransfer || null });

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

    // SPLIT - Pago dividido con múltiples clientes (NUEVO)
    if (selectedOrder && paymentMethod === 'split') {
      if (selectedItems.length > 0) {
        setError("Debes asignar todos los productos a un cliente antes de pagar");
        setPrintLoading(false);
        return;
      }
      
      const customersWithItems = splitCustomers.filter(c => c.items.length > 0);
      if (customersWithItems.length === 0) {
        setError("Asigna al menos un producto a un cliente");
        setPrintLoading(false);
        return;
      }

      try {
        for (const customer of splitCustomers) {
          if (customer.items.length === 0) continue;
          
          const customerTotal = getCustomerTotal(customer);
          
          let custId = null;
          let cedula = customer.cedula && customer.cedula.trim() !== '' ? customer.cedula : '9999999999';
          let nombre = customer.nombre && customer.nombre.trim() !== '' ? customer.nombre : 'CONSUMIDOR FINAL';
          
          if (cedula && nombre) {
            custId = await guardarClienteSiNoExiste(cedula, nombre, customer.email || null, null);
          }
          
          await fetchWithAuth(`/api/ordenes/${selectedOrder.id}/pay-items`, {
            method: 'POST',
            body: JSON.stringify({
              item_ids: customer.items,
              amount_paid: customerTotal,
              payment_method: 'cash',
              cliente_id: custId,
              notes: `${orderNotes} - Cliente: ${nombre}`
            }),
          });
          
          if (generarFacturaSplit) {
            const partialOrder = {
              ...selectedOrder,
              items: selectedOrder.items.filter(i => customer.items.includes(i.id))
            };
            await emitirFactura(partialOrder, cedula, nombre, 'split');
          }
          
          await handlePrintReceipt(
            {
              ...selectedOrder,
              items: selectedOrder.items.filter(i => customer.items.includes(i.id))
            },
            customerTotal,
            0,
            null,
            'split',
            nombre
          );
        }
        
        await loadOrders();
        await resetForm();
        setSuccess('Pagos divididos registrados correctamente');
        
      } catch (err) {
        setError(err.message);
      } finally {
        setPrintLoading(false);
      }
      return;
    }

    // NORMAL (original - no split)
    if (selectedOrder && paymentMethod !== 'split') {
      const paid = parseFloat(amountPaid) || 0;

      if (paid < total) {
        setError(`El pago debe ser al menos ${fmt(total)}`);
        setPrintLoading(false);
        return;
      }

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

  // ── Factura electrónica (original pero con tax_rate real) ─────────────────
  const FORMA_PAGO_MAP = { cash: '01', card: '19', transfer: '20', mixto: '01', split: '01' };

  async function emitirFactura(order, custCedula, custNombre, method) {
    const cedula = custCedula && custCedula.trim() !== '' ? custCedula : '9999999999';
    const isCF = cedula === '9999999999' || cedula === '9999999999999';
    const isRUC = !isCF && cedula.length === 13;
    const tipoId = isCF ? '07' : isRUC ? '04' : '05';
    const email = foundCliente?.email || clienteEmail.trim() || null;

    const itemsPayload = (order.items || []).map(item => {
      const qty = item.quantity || 1;
      const price = parseFloat(item.unit_price) || 0;
      const subtotal = qty * price;
      const taxRate = parseFloat(item.tax_rate) || 0;
      const taxAmount = (subtotal * taxRate) / 100;

      return {
        description: item.product_name || item.name || 'Producto',
        qty: qty,
        unit_price: price,
        subtotal: subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount
      };
    });

    const subtotalTotal = itemsPayload.reduce((sum, i) => sum + i.subtotal, 0);
    const ivaTotal = itemsPayload.reduce((sum, i) => sum + i.tax_amount, 0);
    const totalFactura = subtotalTotal + ivaTotal;

    const uniqueTaxRates = [...new Set(itemsPayload.map(i => i.tax_rate))];
    const mainTaxRate = uniqueTaxRates.length === 1 ? uniqueTaxRates[0] : 0;

    try {
      const res = await fetchWithAuth('/api/einvoicing/invoices/emit', {
        method: 'POST',
        body: JSON.stringify({
          order_id: order.id,
          customer: {
            name: isCF ? 'CONSUMIDOR FINAL' : (custNombre || ''),
            ruc: isCF ? '9999999999999' : cedula,
            email,
            tipo_identificacion: tipoId,
          },
          items: itemsPayload,
          subtotal: subtotalTotal,
          iva_rate: mainTaxRate,
          iva_amount: ivaTotal,
          total: totalFactura,
          forma_pago: FORMA_PAGO_MAP[method] || '01',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return data.invoice_number || null;
      }
      const errData = await res.json().catch(() => ({}));
      console.error('Error al emitir factura:', errData.error || errData);
      return null;
    } catch (e) {
      console.error('Error al emitir factura:', e);
      return null;
    }
  }

  // ── Impresión ──────────────────────────────────────────────────────────────
  const handlePrintReceipt = async (order, paid, changeAmount, invoiceNumber = null, splitMode = null, customerName = null) => {
    try {
      const printerConfig = await getPrinterConfig('printer_main');

      const cashAmt = paymentMethod === 'mixto' ? mixtoCashAmt
        : paymentMethod === 'cash' ? (parseFloat(amountPaid) || 0)
          : splitMode === 'split' ? paid : 0;

      const cardAmt = paymentMethod === 'mixto' ? mixtoCardAmt
        : paymentMethod === 'card' ? (parseFloat(cardPaid) || 0)
          : 0;

      const transferAmt = paymentMethod === 'mixto' ? mixtoTransferAmt
        : paymentMethod === 'transfer' ? (parseFloat(transferPaid) || 0)
          : 0;

      const itemsToPrint = (order.items || []).map(item => {
        const qty = item.quantity || 1;
        const price = parseFloat(item.unit_price) || 0;
        const subtotal = qty * price;
        const taxRate = parseFloat(item.tax_rate) || 0;
        const taxAmount = (subtotal * taxRate) / 100;

        return {
          description: item.product_name || item.name || 'Producto',
          quantity: qty,
          price: price,
          total: subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount
        };
      });

      const printSubtotal = itemsToPrint.reduce((sum, i) => sum + i.total, 0);
      const printTax = itemsToPrint.reduce((sum, i) => sum + i.tax_amount, 0);
      const printTotal = printSubtotal + printTax;

      const result = await print('printer_main', 'invoice', {
        bizInfo,
        invoice: {
          number: invoiceNumber || order.order_number || order.id,
          date: new Date().toISOString(),
        },
        customer: {
          name: customerName || clienteNombre || 'CONSUMIDOR FINAL',
          id: clienteCedula || '9999999999',
        },
        items: itemsToPrint,
        subtotal: printSubtotal,
        tax: printTax,
        taxRate: 0,
        total: printTotal,
        payment: {
          cash: cashAmt,
          card: cardAmt,
          other: transferAmt,
        },
        printerFooter: printerConfig.footer,
      }, paymentMethod === 'cash' || (paymentMethod === 'mixto' && cashAmt > 0) || (splitMode === 'split' && cashAmt > 0));

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
          {/* Combobox y cliente - ORIGINAL */}
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
              disabled={!selectedOrder || paymentMethod === 'split'}
              style={{ minWidth: 120, maxWidth: 120, flex: '1 1 120px', marginLeft: 4 }}
            />

            <input
              className="client-inp"
              type="text"
              placeholder="Nombre cliente (opcional)"
              value={clienteNombre}
              onChange={e => setClienteNombre(e.target.value)}
              style={{ minWidth: 240, maxWidth: 300, flex: '2 1 240px', marginLeft: 6 }}
              disabled={paymentMethod === 'split'}
            />

            <input
              className="client-inp"
              type="email"
              inputMode="email"
              placeholder="✉ Email (factura)"
              value={clienteEmail}
              onChange={e => setClienteEmail(e.target.value)}
              style={{
                minWidth: 160, maxWidth: 200, flex: '1 1 160px', marginLeft: 4,
                border: clienteEmail ? '1.5px solid #6842fe' : undefined
              }}
              disabled={paymentMethod === 'split'}
            />
            <OpenDrawerButton />
          </div>

          {error && <div style={{ fontSize: 12, color: '#e11d48', fontWeight: 800, marginTop: 6 }}>{error}</div>}
          {success && <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 800, marginTop: 6 }}>{success}</div>}
          {printerError && <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 800, marginTop: 6 }}>⚠️ {printerError}</div>}
          
          {/* Contenido si hay orden seleccionada */}
          {selectedOrder && (
            <>
              {/* Métodos de Pago - ORIGINAL con botón Dividido nuevo */}
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
                  <Users size={15} /> Dividido
                </button>
              </div>

              {/* Opción de facturación para SPLIT - NUEVO */}
              {paymentMethod === 'split' && (
                <div style={{ margin: '12px 0', padding: '12px', background: '#f0f0ff', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={generarFacturaSplit}
                      onChange={e => setGenerarFacturaSplit(e.target.checked)}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: 600 }}>📄 Generar factura electrónica por cada cliente</span>
                  </label>
                  <span style={{ fontSize: 12, color: '#666' }}>
                    {generarFacturaSplit ? 'Se emitirá una factura individual por cada pago' : 'Solo se imprimirá el comprobante sin factura'}
                  </span>
                </div>
              )}

              {/* Detalle Pedido */}
              <div className="order-details">
                <div className="order-head">
                  <b>
                    {selectedOrder.mesa_numero ? `Mesa ${selectedOrder.mesa_numero}` : selectedOrder.order_type === 'delivery' ? 'DELIVERY' : 'PARA LLEVAR'}{' '}
                    <span style={{ fontWeight: 400, fontSize: 13, color: '#999' }}>
                      # {selectedOrder.order_number || selectedOrder.id}
                    </span>
                  </b>
                  {paymentMethod === 'split' && selectedItems.length > 0 && (
                    <span style={{ fontWeight: 400, fontSize: 12, color: '#6842fe', marginLeft: 12 }}>
                      ✓ {selectedItems.length} producto(s) seleccionado(s)
                    </span>
                  )}
                  {paymentMethod === 'split' && selectedItems.length === 0 && splitCustomers.some(c => c.items.length > 0) && (
                    <span style={{ fontWeight: 400, fontSize: 12, color: '#16a34a', marginLeft: 12 }}>
                      ✓ Todos los productos asignados
                    </span>
                  )}
                </div>

                {/* Items con checkboxes - SOLO para Split */}
                {paymentMethod === 'split' && (
                  <div className="order-items">
                    <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 14, color: '#333' }}>
                      📦 Productos pendientes:
                    </div>
                    {(selectedOrder.items || [])
                      .filter(item => !item.paid)
                      .map((item, idx) => (
                        <div key={idx} className="item-line" style={{
                          background: selectedItems.includes(item.id) ? '#f3f0ff' : 'transparent',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          marginBottom: '4px',
                          border: selectedItems.includes(item.id) ? '1.5px solid #6842fe' : 'none'
                        }}>
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.id)}
                            onChange={() => handleSelectItem(item.id)}
                            style={{ cursor: 'pointer', width: '18px', height: '18px', marginRight: 12 }}
                          />
                          <span style={{ flex: 1, marginLeft: '12px', fontWeight: selectedItems.includes(item.id) ? '600' : '400' }}>
                            {item.quantity}x {item.product_name || item.name}
                            {item.tax_rate > 0 && (
                              <span style={{ fontSize: 10, color: '#666', marginLeft: 8 }}>
                                (IVA {item.tax_rate}%)
                              </span>
                            )}
                          </span>
                          <span className="item-amt" style={{ fontWeight: selectedItems.includes(item.id) ? '700' : '600' }}>
                            {fmt(item.unit_price * item.quantity)}
                          </span>
                        </div>
                    ))}
                    {selectedOrder.items.filter(item => !item.paid).length === 0 && (
                      <div style={{ textAlign: 'center', padding: 20, color: '#16a34a' }}>
                        ✓ Todos los productos han sido pagados
                      </div>
                    )}
                  </div>
                )}

                {/* Items SIN checkboxes para otros métodos - ORIGINAL */}
                {paymentMethod !== 'split' && (
                  <div className="order-items">
                    {(selectedOrder.items || []).map((item, idx) => (
                      <div key={idx} className="item-line">
                        <span>
                          {item.quantity}x {item.product_name || item.name}
                          {item.tax_rate > 0 && (
                            <span style={{ fontSize: 10, color: '#666', marginLeft: 8 }}>
                              (IVA {item.tax_rate}%)
                            </span>
                          )}
                        </span>
                        <span className="item-amt">{fmt(item.unit_price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sección de Clientes para SPLIT - NUEVO */}
                {paymentMethod === 'split' && (
                  <div style={{ marginTop: 20, borderTop: '2px solid #e0e0e0', paddingTop: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <span style={{ fontWeight: 'bold', fontSize: 16 }}>👥 Clientes / Comensales</span>
                      <button
                        onClick={addSplitCustomer}
                        style={{
                          background: '#6842fe',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          padding: '6px 12px',
                          cursor: 'pointer',
                          fontSize: 12,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        + Agregar Cliente
                      </button>
                    </div>
                    
                    {splitCustomers.map((customer, idx) => (
                      <div key={customer.id} style={{
                        background: '#f9f9ff',
                        border: '1px solid #ddd',
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 16
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <span style={{ fontWeight: 'bold' }}>Cliente {idx + 1}</span>
                          {splitCustomers.length > 1 && (
                            <button
                              onClick={() => removeSplitCustomer(customer.id)}
                              style={{ background: '#ff4444', color: 'white', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                        
                        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                          <input
                            type="text"
                            placeholder="Cédula/RUC"
                            value={customer.cedula}
                            onChange={e => updateSplitCustomer(customer.id, 'cedula', e.target.value)}
                            style={{ flex: 1, padding: 8, border: '1px solid #ccc', borderRadius: 4, minWidth: 120 }}
                          />
                          <input
                            type="text"
                            placeholder="Nombre"
                            value={customer.nombre}
                            onChange={e => updateSplitCustomer(customer.id, 'nombre', e.target.value)}
                            style={{ flex: 2, padding: 8, border: '1px solid #ccc', borderRadius: 4, minWidth: 180 }}
                          />
                          <input
                            type="email"
                            placeholder="Email (opcional)"
                            value={customer.email}
                            onChange={e => updateSplitCustomer(customer.id, 'email', e.target.value)}
                            style={{ flex: 1, padding: 8, border: '1px solid #ccc', borderRadius: 4, minWidth: 160 }}
                          />
                        </div>
                        
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 'bold', color: '#666' }}>Productos asignados:</span>
                          <div style={{ marginTop: 6 }}>
                            {customer.items.map(itemId => {
                              const item = selectedOrder.items.find(i => i.id === itemId);
                              return item ? (
                                <div key={itemId} style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '4px 8px',
                                  background: '#e8e8ff',
                                  borderRadius: 4,
                                  marginBottom: 4,
                                  fontSize: 13
                                }}>
                                  <span>{item.quantity}x {item.product_name}</span>
                                  <div>
                                    <span style={{ marginRight: 12 }}>{fmt(item.unit_price * item.quantity)}</span>
                                    <button
                                      onClick={() => removeItemFromCustomer(customer.id, itemId)}
                                      style={{ background: '#ff6666', color: 'white', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 11 }}
                                    >
                                      Quitar
                                    </button>
                                  </div>
                                </div>
                              ) : null;
                            })}
                            {customer.items.length === 0 && (
                              <span style={{ fontSize: 12, color: '#999' }}>Sin productos asignados</span>
                            )}
                          </div>
                        </div>
                        
                        <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px dashed #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 'bold' }}>Total a pagar:</span>
                          <span style={{ fontWeight: 'bold', fontSize: 18, color: '#6842fe' }}>
                            {fmt(getCustomerTotal(customer))}
                          </span>
                        </div>
                      </div>
                    ))}
                    
                    <div style={{
                      marginTop: 16,
                      padding: 12,
                      background: selectedItems.length === 0 ? '#d4edda' : '#fff3cd',
                      borderRadius: 6,
                      textAlign: 'center'
                    }}>
                      {selectedItems.length === 0 ? (
                        <span style={{ color: '#155724' }}>✅ Todos los productos han sido asignados a los clientes</span>
                      ) : (
                        <span style={{ color: '#856404' }}>
                          ⚠️ {selectedItems.length} producto(s) sin asignar. Selecciona un cliente y asigna los productos con el botón "Asignar"
                        </span>
                      )}
                    </div>

                    {/* Botón para asignar productos al cliente seleccionado */}
                    {selectedItems.length > 0 && splitCustomers.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <select
                          id="clienteSelect"
                          style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc', marginRight: 8 }}
                        >
                          {splitCustomers.map((customer, idx) => (
                            <option key={customer.id} value={customer.id}>
                              Cliente {idx + 1} {customer.nombre && `- ${customer.nombre}`}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            const select = document.getElementById('clienteSelect');
                            const customerId = parseInt(select.value);
                            assignItemsToCustomer(customerId, [...selectedItems]);
                          }}
                          style={{
                            background: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            padding: '8px 16px',
                            cursor: 'pointer'
                          }}
                        >
                          Asignar productos seleccionados a este cliente
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Totales - ORIGINAL para métodos que no son split */}
                {paymentMethod !== 'split' && (
                  <div className="totals-footer">
                    <div className="sub-iva-total">
                      <span>SUBTOTAL:</span>
                      <span>{fmt(subtotal)}</span>
                    </div>
                    <div className="sub-iva-total">
                      <span>IVA:</span>
                      <span>{fmt(iva)}</span>
                    </div>
                    <div className="sub-iva-total" style={{ borderTop: '1.5px solid #ddd', paddingTop: '8px', marginTop: '8px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: 16 }}>TOTAL A PAGAR:</span>
                      <span style={{ fontWeight: 'bold', fontSize: 16 }}>{fmt(total)}</span>
                    </div>
                  </div>
                )}

                {/* Totales para Split - NUEVO */}
                {paymentMethod === 'split' && selectedItems.length > 0 && (
                  <div className="totals-footer" style={{ marginTop: 16 }}>
                    <div className="sub-iva-total">
                      <span>SUBTOTAL (seleccionados):</span>
                      <span>{fmt(getSplitSubtotal())}</span>
                    </div>
                    <div className="sub-iva-total">
                      <span>IVA (seleccionados):</span>
                      <span>{fmt(getSplitTax())}</span>
                    </div>
                    <div className="sub-iva-total" style={{ borderTop: '1.5px solid #ddd', paddingTop: '8px', marginTop: '8px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: 16 }}>TOTAL SELECCIONADO:</span>
                      <span style={{ fontWeight: 'bold', fontSize: 16, color: '#6842fe' }}>{fmt(getPaymentTotal())}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Campos de monto según método - ORIGINAL completo */}
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

                {/* MIXTO - ORIGINAL */}
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
              </div>

              {/* Botones acciones - ORIGINAL con validación para split */}
              <div className="actions-row">
                <button
                  className="btn-guardar"
                  disabled={printLoading || (
                    paymentMethod === 'split'
                      ? selectedItems.length > 0  // Si hay items sin asignar, no se puede pagar
                      : paymentMethod === 'cash'
                        ? (!amountPaid || parseFloat(amountPaid) < total)
                        : paymentMethod === 'card' || paymentMethod === 'transfer'
                          ? false
                          : paymentMethod === 'mixto'
                            ? !mixtoReady
                            : false
                  )}
                  onClick={handlePayment}
                >
                  <Check size={16} /> {printLoading ? 'Procesando...' : 'GUARDAR'}
                </button>
                <button className="btn-cancelar" onClick={() => {
                  setSelectedOrder(null);
                  setSelectedItems([]);
                  setSplitCustomers([]);
                }}>
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