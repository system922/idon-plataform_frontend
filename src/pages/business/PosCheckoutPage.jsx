import React, { useState, useEffect } from 'react';
import { Check, X, DollarSign, CreditCard, Divide, Users } from 'react-feather';
import PageTemplate from '../../components/PageTemplate';
import OpenDrawerButton from '../../components/OpenDrawerButton';
import { useBusinessContext } from '../../admin/config/BusinessContext';
import { fetchWithAuth } from '../../config/apiBase';
import { useQzTray } from '../../components/useQzTray';
import { usePrinterService } from '../../services/usePrinterService';
import '../../styles/CheckoutModern.css';

export default function PosCheckoutPage() {
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
  
  // Control de facturación
  const [facturaIndividual, setFacturaIndividual] = useState(false);
  const [pagosRealizados, setPagosRealizados] = useState([]);
  
  // Clientes para pago dividido
  const [splitClientes, setSplitClientes] = useState([]);

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
      if (splitClientes.length === 0) {
        setSplitClientes([{
          id: Date.now(),
          nombre: '',
          cedula: '',
          email: '',
          items: [],
          metodoPago: 'cash',
          montoRecibido: 0,
          referencia: ''
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
    setPagosRealizados([]);
    setSplitClientes([]);
    setFacturaIndividual(false);
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
    setPagosRealizados([]);
    setSplitClientes([]);
    setFacturaIndividual(false);
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

  // ── SPLIT - Cálculo de totals usando selling_price y tax_rate ────────────
  
  const getSplitSubtotal = () => {
    if (!selectedOrder || paymentMethod !== 'split') return 0;

    return selectedOrder.items
      .filter(i => selectedItems.includes(i.id) && !i.paid)
      .reduce((sum, i) => {
        const precioSinIVA = Number(i.selling_price) || Number(i.unit_price) || 0;
        return sum + (precioSinIVA * i.quantity);
      }, 0);
  };

  const getSplitTax = () => {
    if (!selectedOrder || paymentMethod !== 'split') return 0;

    return selectedOrder.items
      .filter(i => selectedItems.includes(i.id) && !i.paid)
      .reduce((sum, i) => {
        const montoIVA = Number(i.tax_rate) || 0;
        return sum + (montoIVA * i.quantity);
      }, 0);
  };

  const getPaymentTotal = () => getSplitSubtotal() + getSplitTax();

  // ── Funciones para manejar clientes en pago dividido ──────────────────────
  
  const agregarClienteSplit = () => {
    setSplitClientes([
      ...splitClientes,
      {
        id: Date.now(),
        nombre: '',
        cedula: '',
        email: '',
        items: [],
        metodoPago: 'cash',
        montoRecibido: 0,
        referencia: ''
      }
    ]);
  };

  const actualizarClienteSplit = (id, campo, valor) => {
    setSplitClientes(splitClientes.map(cliente => 
      cliente.id === id ? { ...cliente, [campo]: valor } : cliente
    ));
  };

  const eliminarClienteSplit = (id) => {
    if (splitClientes.length === 1) {
      setError('Debe haber al menos un cliente');
      return;
    }
    const cliente = splitClientes.find(c => c.id === id);
    if (cliente && cliente.items.length > 0) {
      setSelectedItems([...selectedItems, ...cliente.items]);
    }
    setSplitClientes(splitClientes.filter(c => c.id !== id));
  };

  const asignarItemsACliente = (idCliente) => {
    if (selectedItems.length === 0) {
      setError('No hay productos seleccionados');
      return;
    }
    setSplitClientes(splitClientes.map(cliente => 
      cliente.id === idCliente 
        ? { ...cliente, items: [...cliente.items, ...selectedItems] }
        : cliente
    ));
    setSelectedItems([]);
    setSuccess(`${selectedItems.length} producto(s) asignado(s)`);
    setTimeout(() => setSuccess(''), 2000);
  };

  const quitarItemDeCliente = (idCliente, itemId) => {
    setSplitClientes(splitClientes.map(cliente => 
      cliente.id === idCliente 
        ? { ...cliente, items: cliente.items.filter(id => id !== itemId) }
        : cliente
    ));
    setSelectedItems([...selectedItems, itemId]);
  };

  const calcularTotalCliente = (cliente) => {
    if (!selectedOrder) return 0;
    let total = 0;
    cliente.items.forEach(itemId => {
      const item = selectedOrder.items.find(i => i.id === itemId);
      if (item && !item.paid) {
        const precioSinIVA = Number(item.selling_price) || Number(item.unit_price) || 0;
        const montoIVA = Number(item.tax_rate) || 0;
        total += (precioSinIVA + montoIVA) * item.quantity;
      }
    });
    return total;
  };

  const calcularCambioCliente = (cliente) => {
    const total = calcularTotalCliente(cliente);
    return Math.max(0, cliente.montoRecibido - total);
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

    // MIXTO (pago mixto normal)
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
            customer_id: await guardarClienteSiNoExiste(clienteCedula || '9999999999', clienteNombre || 'CONSUMIDOR FINAL', clienteEmail || null),
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

    // SPLIT - Pago dividido
    if (selectedOrder && paymentMethod === 'split') {
      // Verificar que no haya productos sin asignar
      if (selectedItems.length > 0) {
        setError("Asigna todos los productos a un cliente antes de pagar");
        setPrintLoading(false);
        return;
      }
      
      // Verificar que haya al menos un cliente con productos
      const clientesConItems = splitClientes.filter(c => c.items.length > 0);
      if (clientesConItems.length === 0) {
        setError("Asigna al menos un producto a un cliente");
        setPrintLoading(false);
        return;
      }

      // Verificar pagos válidos
      let pagosInvalidos = false;
      for (const cliente of splitClientes) {
        if (cliente.items.length > 0 && cliente.montoRecibido < calcularTotalCliente(cliente)) {
          pagosInvalidos = true;
          break;
        }
      }
      
      if (pagosInvalidos) {
        setError(`Uno o más clientes tienen pago insuficiente`);
        setPrintLoading(false);
        return;
      }

      try {
        // Procesar cada cliente
        for (const cliente of splitClientes) {
          if (cliente.items.length === 0) continue;
          
          const totalCliente = calcularTotalCliente(cliente);
          let cedula = cliente.cedula?.trim() || '9999999999';
          let nombre = cliente.nombre?.trim() || 'CONSUMIDOR FINAL';
          let clienteId = await guardarClienteSiNoExiste(cedula, nombre, cliente.email || null, null);
          
          // Registrar pago
          await fetchWithAuth(`/api/ordenes/${selectedOrder.id}/pay-items`, {
            method: 'POST',
            body: JSON.stringify({
              item_ids: cliente.items,
              amount_paid: totalCliente,
              payment_method: cliente.metodoPago,
              cliente_id: clienteId,
              reference_number: cliente.metodoPago !== 'cash' ? (cliente.referencia || null) : null,
              notes: `${orderNotes} - Cliente: ${nombre}`
            }),
          });
          
          // Si es factura individual, generar factura AHORA
          if (facturaIndividual) {
            const partialOrder = {
              ...selectedOrder,
              items: selectedOrder.items.filter(i => cliente.items.includes(i.id))
            };
            await emitirFactura(partialOrder, cedula, nombre, 'split');
            await handlePrintReceipt(partialOrder, totalCliente, cliente.montoRecibido - totalCliente, null, 'split', nombre);
            setSuccess(`Factura generada para ${nombre}`);
          } else {
            // Guardar en historial para factura única al final
            setPagosRealizados(prev => [...prev, {
              cliente: { cedula, nombre, email: cliente.email },
              items: cliente.items,
              total: totalCliente,
              metodoPago: cliente.metodoPago
            }]);
            setSuccess(`Pago registrado para ${nombre}`);
          }
        }
        
        // Recargar la orden para ver productos actualizados
        const res = await fetchWithAuth(`/api/ordenes/${selectedOrder.id}`);
        const ordenActualizada = await res.json();
        setSelectedOrder(ordenActualizada);
        
        // Verificar si ya no quedan productos pendientes
        const productosPendientes = ordenActualizada.items.filter(i => !i.paid);
        
        if (productosPendientes.length === 0) {
          // Si es factura única y hay pagos, generar UNA SOLA factura al final
          if (!facturaIndividual && pagosRealizados.length > 0) {
            const todosLosItems = pagosRealizados.flatMap(p => p.items);
            const ordenCompleta = {
              ...selectedOrder,
              items: todosLosItems
            };
            const primerCliente = pagosRealizados[0]?.cliente || { cedula: '9999999999', nombre: 'CONSUMIDOR FINAL' };
            await emitirFactura(ordenCompleta, primerCliente.cedula, primerCliente.nombre, 'split');
            await handlePrintReceipt(ordenCompleta, total, 0, null, 'split', 'FACTURA FINAL');
            setSuccess('Factura final generada con todos los productos');
          }
          
          // Cerrar la orden
          await fetchWithAuth(`/api/ordenes/${selectedOrder.id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({
              status: 'paid',
              payment_method: 'split',
              amount_paid: total,
              notes: orderNotes
            }),
          });
          setOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
          setSelectedOrder(null);
          setSplitClientes([]);
          setPagosRealizados([]);
        } else {
          // Limpiar para el siguiente grupo de clientes
          setSplitClientes([{
            id: Date.now(),
            nombre: '',
            cedula: '',
            email: '',
            items: [],
            metodoPago: 'cash',
            montoRecibido: 0,
            referencia: ''
          }]);
        }
        
        setSelectedItems([]);
        
      } catch (err) {
        setError(err.message);
      } finally {
        setPrintLoading(false);
      }
      return;
    }

    // NORMAL (no split)
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
            customer_id: await guardarClienteSiNoExiste(clienteCedula || '9999999999', clienteNombre || 'CONSUMIDOR FINAL', clienteEmail || null),
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

  // ── Factura electrónica ─────────────────────────────────────────────────
  const FORMA_PAGO_MAP = { cash: '01', card: '19', transfer: '20', mixto: '01', split: '01' };

  async function emitirFactura(order, custCedula, custNombre, method) {
    const cedula = custCedula && custCedula.trim() !== '' ? custCedula : '9999999999';
    const isCF = cedula === '9999999999' || cedula === '9999999999999';
    const isRUC = !isCF && cedula.length === 13;
    const tipoId = isCF ? '07' : isRUC ? '04' : '05';
    const email = foundCliente?.email || clienteEmail.trim() || null;

    const itemsPayload = (order.items || []).map(item => {
      const qty = item.quantity || 1;
      const precioSinIVA = Number(item.selling_price) || Number(item.unit_price) || 0;
      const montoIVA = Number(item.tax_rate) || 0;
      const subtotal = qty * precioSinIVA;
      const ivaTotal = qty * montoIVA;

      return {
        description: item.product_name || item.name || 'Producto',
        qty: qty,
        unit_price: precioSinIVA,
        subtotal: subtotal,
        tax_amount: ivaTotal
      };
    });

    const subtotalTotal = itemsPayload.reduce((sum, i) => sum + i.subtotal, 0);
    const ivaTotal = itemsPayload.reduce((sum, i) => sum + i.tax_amount, 0);
    const totalFactura = subtotalTotal + ivaTotal;

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

      const itemsToPrint = (order.items || []).map(item => {
        const precioSinIVA = Number(item.selling_price) || Number(item.unit_price) || 0;
        const montoIVA = Number(item.tax_rate) || 0;
        const subtotal = precioSinIVA * item.quantity;
        const ivaTotal = montoIVA * item.quantity;
        
        return {
          description: item.product_name || item.name || 'Producto',
          quantity: item.quantity,
          price: precioSinIVA,
          total: subtotal,
          tax_amount: ivaTotal
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
          cash: paid,
          card: 0,
          other: 0,
        },
        printerFooter: printerConfig.footer,
      }, true);

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
              style={{
                minWidth: 160, maxWidth: 200, flex: '1 1 160px', marginLeft: 4,
                border: clienteEmail ? '1.5px solid #6842fe' : undefined
              }}
            />
            <OpenDrawerButton />
          </div>

          {error && <div style={{ fontSize: 12, color: '#e11d48', fontWeight: 800, marginTop: 6 }}>{error}</div>}
          {success && <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 800, marginTop: 6 }}>{success}</div>}
          {printerError && <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 800, marginTop: 6 }}>⚠️ {printerError}</div>}

          {selectedOrder && (
            <>
              {/* Métodos de Pago */}
              <div className="pay-methods">
                <button className={paymentMethod === 'cash' ? "pay-btn selected" : "pay-btn"} onClick={() => setPaymentMethod('cash')}><DollarSign size={15} /> Efectivo</button>
                <button className={paymentMethod === 'transfer' ? "pay-btn selected" : "pay-btn"} onClick={() => setPaymentMethod('transfer')}><DollarSign size={15} /> Transferencia</button>
                <button className={paymentMethod === 'card' ? "pay-btn selected" : "pay-btn"} onClick={() => setPaymentMethod('card')}><CreditCard size={15} /> Tarjeta</button>
                <button className={paymentMethod === 'mixto' ? "pay-btn selected" : "pay-btn"} onClick={() => setPaymentMethod('mixto')}><Divide size={15} /> Mixto</button>
                <button className={paymentMethod === 'split' ? "pay-btn selected" : "pay-btn"} onClick={() => setPaymentMethod('split')}><Users size={15} /> Dividido</button>
              </div>

              {/* Opción de facturación para SPLIT */}
              {paymentMethod === 'split' && (
                <div style={{ margin: '12px 0', padding: '12px', background: '#f0f0ff', borderRadius: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={facturaIndividual}
                      onChange={e => {
                        setFacturaIndividual(e.target.checked);
                        if (!e.target.checked) {
                          setPagosRealizados([]);
                        }
                        if (e.target.checked && splitClientes.length === 0) {
                          setSplitClientes([{
                            id: Date.now(),
                            nombre: '',
                            cedula: '',
                            email: '',
                            items: [],
                            metodoPago: 'cash',
                            montoRecibido: 0,
                            referencia: ''
                          }]);
                        }
                      }}
                      style={{ width: 18, height: 18 }}
                    />
                    <span style={{ fontWeight: 600 }}>
                      {facturaIndividual ? '📄 Factura INDIVIDUAL por cada cliente' : '📄 Una sola factura al final (todos los productos)'}
                    </span>
                  </label>
                  <span style={{ fontSize: 12, color: '#666', marginLeft: 30 }}>
                    {facturaIndividual 
                      ? 'Cada cliente recibe su factura en el momento de pagar'
                      : 'Se genera UNA SOLA factura cuando TODOS hayan pagado'}
                  </span>
                </div>
              )}

              {/* Detalle Pedido */}
              <div className="order-details">
                <div className="order-head">
                  <b>
                    {selectedOrder.mesa_numero ? `Mesa ${selectedOrder.mesa_numero}` : selectedOrder.order_type === 'delivery' ? 'DELIVERY' : 'PARA LLEVAR'}{' '}
                    <span style={{ fontWeight: 400, fontSize: 13, color: '#999' }}># {selectedOrder.order_number || selectedOrder.id}</span>
                  </b>
                </div>

                {/* Items con checkboxes - SOLO para Split */}
                {paymentMethod === 'split' && (
                  <div className="order-items">
                    <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 14, color: '#333' }}>
                      📦 Productos pendientes (selecciona para asignar a cada cliente):
                    </div>
                    {selectedOrder.items.filter(item => !item.paid).map((item, idx) => (
                      <div key={idx} className="item-line" style={{
                        background: selectedItems.includes(item.id) ? '#f3f0ff' : 'transparent',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        marginBottom: '4px'
                      }}>
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={() => handleSelectItem(item.id)}
                          style={{ marginRight: 12 }}
                        />
                        <span style={{ flex: 1 }}>{item.quantity}x {item.product_name}</span>
                        <span className="item-amt">{fmt((Number(item.selling_price) || Number(item.unit_price)) * item.quantity)}</span>
                      </div>
                    ))}
                    {selectedOrder.items.filter(item => !item.paid).length === 0 && (
                      <div style={{ textAlign: 'center', padding: 20, color: '#16a34a' }}>
                        ✓ Todos los productos han sido pagados
                      </div>
                    )}
                  </div>
                )}

                {/* Items SIN checkboxes para otros métodos */}
                {paymentMethod !== 'split' && (
                  <div className="order-items">
                    {selectedOrder.items.filter(item => !item.paid).map((item, idx) => (
                      <div key={idx} className="item-line">
                        <span>{item.quantity}x {item.product_name}</span>
                        <span className="item-amt">{fmt((Number(item.selling_price) || Number(item.unit_price)) * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Totales selección para Split */}
                {paymentMethod === 'split' && selectedItems.length > 0 && (
                  <div className="totals-footer" style={{ marginTop: 16 }}>
                    <div className="sub-iva-total"><span>SUBTOTAL seleccionado:</span><span>{fmt(getSplitSubtotal())}</span></div>
                    <div className="sub-iva-total"><span>IVA seleccionado:</span><span>{fmt(getSplitTax())}</span></div>
                    <div className="sub-iva-total" style={{ borderTop: '1.5px solid #ddd', paddingTop: '8px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: 16 }}>TOTAL seleccionado:</span>
                      <span style={{ fontWeight: 'bold', fontSize: 16, color: '#6842fe' }}>{fmt(getPaymentTotal())}</span>
                    </div>
                  </div>
                )}

                {/* Totales - para métodos que no son split */}
                {paymentMethod !== 'split' && (
                  <div className="totals-footer">
                    <div className="sub-iva-total"><span>SUBTOTAL:</span><span>{fmt(subtotal)}</span></div>
                    <div className="sub-iva-total"><span>IVA:</span><span>{fmt(iva)}</span></div>
                    <div className="sub-iva-total" style={{ borderTop: '1.5px solid #ddd', paddingTop: '8px', marginTop: '8px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: 16 }}>TOTAL A PAGAR:</span>
                      <span style={{ fontWeight: 'bold', fontSize: 16 }}>{fmt(total)}</span>
                    </div>
                  </div>
                )}

                {/* Sección de Clientes para SPLIT */}
                {paymentMethod === 'split' && (
                  <div style={{ marginTop: 20, borderTop: '2px solid #e0e0e0', paddingTop: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <span style={{ fontWeight: 'bold', fontSize: 16 }}>👥 Clientes / Comensales</span>
                      <button onClick={agregarClienteSplit} style={{ background: '#6842fe', color: 'white', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer' }}>
                        + Agregar Cliente
                      </button>
                    </div>
                    
                    {splitClientes.map((cliente, idx) => {
                      const totalCliente = calcularTotalCliente(cliente);
                      const cambioCliente = calcularCambioCliente(cliente);
                      const faltaCliente = totalCliente - cliente.montoRecibido;
                      
                      return (
                        <div key={cliente.id} style={{ background: '#f9f9ff', border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <span style={{ fontWeight: 'bold' }}>🧑 Cliente {idx + 1}</span>
                            {splitClientes.length > 1 && (
                              <button onClick={() => eliminarClienteSplit(cliente.id)} style={{ background: '#ff4444', color: 'white', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>
                                Eliminar
                              </button>
                            )}
                          </div>
                          
                          {/* Datos del cliente */}
                          <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                            <input type="text" placeholder="Cédula/RUC" value={cliente.cedula} onChange={e => actualizarClienteSplit(cliente.id, 'cedula', e.target.value)} style={{ flex: 1, padding: 8, border: '1px solid #ccc', borderRadius: 4 }} />
                            <input type="text" placeholder="Nombre completo" value={cliente.nombre} onChange={e => actualizarClienteSplit(cliente.id, 'nombre', e.target.value)} style={{ flex: 2, padding: 8, border: '1px solid #ccc', borderRadius: 4 }} />
                            <input type="email" placeholder="Email (factura)" value={cliente.email} onChange={e => actualizarClienteSplit(cliente.id, 'email', e.target.value)} style={{ flex: 1, padding: 8, border: '1px solid #ccc', borderRadius: 4 }} />
                          </div>
                          
                          {/* Productos asignados */}
                          <div style={{ marginBottom: 12 }}>
                            <span style={{ fontSize: 12, fontWeight: 'bold', color: '#666' }}>Productos asignados:</span>
                            <div style={{ marginTop: 6 }}>
                              {cliente.items.map(itemId => {
                                const item = selectedOrder.items.find(i => i.id === itemId);
                                return item ? (
                                  <div key={itemId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: '#e8e8ff', borderRadius: 4, marginBottom: 4 }}>
                                    <span>{item.quantity}x {item.product_name}</span>
                                    <div>
                                      <span style={{ marginRight: 12 }}>{fmt((Number(item.selling_price) || Number(item.unit_price)) * item.quantity)}</span>
                                      <button onClick={() => quitarItemDeCliente(cliente.id, itemId)} style={{ background: '#ff6666', color: 'white', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 11 }}>Quitar</button>
                                    </div>
                                  </div>
                                ) : null;
                              })}
                              {cliente.items.length === 0 && <span style={{ fontSize: 12, color: '#999' }}>Sin productos asignados</span>}
                            </div>
                          </div>
                          
                          {/* Método de pago del cliente */}
                          <div style={{ marginBottom: 12, padding: 8, background: '#f0f0f0', borderRadius: 6 }}>
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                              <span style={{ fontWeight: 'bold' }}>💳 Método de pago:</span>
                              <select value={cliente.metodoPago} onChange={e => actualizarClienteSplit(cliente.id, 'metodoPago', e.target.value)} style={{ padding: 6, borderRadius: 4, border: '1px solid #ccc' }}>
                                <option value="cash">Efectivo</option>
                                <option value="card">Tarjeta</option>
                                <option value="transfer">Transferencia</option>
                              </select>
                              
                              <span style={{ fontWeight: 'bold' }}>💰 Monto recibido:</span>
                              <input type="number" step="0.01" placeholder="0.00" value={cliente.montoRecibido || ''} onChange={e => actualizarClienteSplit(cliente.id, 'montoRecibido', parseFloat(e.target.value) || 0)} style={{ width: 120, padding: 6, borderRadius: 4, border: '1px solid #ccc' }} />
                              
                              {cliente.metodoPago !== 'cash' && (
                                <>
                                  <span style={{ fontWeight: 'bold' }}>📝 Referencia:</span>
                                  <input type="text" placeholder="N° referencia" value={cliente.referencia || ''} onChange={e => actualizarClienteSplit(cliente.id, 'referencia', e.target.value)} style={{ width: 150, padding: 6, borderRadius: 4, border: '1px solid #ccc' }} />
                                </>
                              )}
                            </div>
                          </div>
                          
                          {/* Totales del cliente */}
                          <div style={{ paddingTop: 8, borderTop: '1px dashed #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div>Subtotal: <strong>{fmt(totalCliente - (totalCliente - (totalCliente / 1.15)))}</strong></div>
                              <div>IVA: <strong>{fmt(totalCliente - (totalCliente / 1.15))}</strong></div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 18, fontWeight: 'bold', color: '#6842fe' }}>Total: {fmt(totalCliente)}</div>
                              {cliente.montoRecibido > 0 && (
                                <div style={{ fontSize: 14, color: totalCliente <= cliente.montoRecibido ? '#16a34a' : '#e11d48' }}>
                                  {totalCliente <= cliente.montoRecibido 
                                    ? `💰 Cambio: ${fmt(cambioCliente)}` 
                                    : `⚠️ Falta: ${fmt(faltaCliente)}`}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Botón para asignar productos seleccionados */}
                    {selectedItems.length > 0 && splitClientes.length > 0 && (
                      <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
                        <select id="clienteSelect" style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc' }}>
                          {splitClientes.map((cliente, idx) => (
                            <option key={cliente.id} value={cliente.id}>
                              Cliente {idx + 1} {cliente.nombre && `- ${cliente.nombre}`}
                            </option>
                          ))}
                        </select>
                        <button onClick={() => {
                          const select = document.getElementById('clienteSelect');
                          const clienteId = parseInt(select.value);
                          asignarItemsACliente(clienteId);
                        }} style={{ background: '#28a745', color: 'white', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer' }}>
                          📦 Asignar {selectedItems.length} producto(s) a este cliente
                        </button>
                      </div>
                    )}

                    {/* Advertencia de productos sin asignar */}
                    {selectedItems.length > 0 && (
                      <div style={{ marginTop: 16, padding: 12, background: '#fff3cd', borderRadius: 6, textAlign: 'center' }}>
                        <span style={{ color: '#856404' }}>⚠️ {selectedItems.length} producto(s) sin asignar. Selecciona un cliente y asigna los productos.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Campos de monto para métodos normales */}
              {paymentMethod !== 'split' && (
                <div className="pay-input-row" style={{ gap: 24, flexWrap: 'wrap', alignItems: 'center', margin: '20px 0' }}>
                  {paymentMethod === 'cash' && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fefefe', borderRadius: '9px', padding: '7px 18px' }}>
                        <label style={{ fontWeight: 900, fontSize: 18 }}>Recibido:</label>
                        <input type="text" className="input-pay" inputMode="numeric" value={amountPaidRaw === '0' || amountPaidRaw === '' ? '' : (parseInt(amountPaidRaw, 10) / 100).toFixed(2)} onChange={e => { let digits = e.target.value.replace(/\D/g, ''); if (!digits) digits = '0'; setAmountPaidRaw(digits); setAmountPaid((parseInt(digits, 10) / 100).toFixed(2)); }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#d7d6fc', borderRadius: '9px', padding: '7px 18px' }}>
                        <label style={{ fontWeight: 900, fontSize: 18 }}>Cambio:</label>
                        <span style={{ fontWeight: 800, fontSize: 18 }}>{fmt(change)}</span>
                      </div>
                    </>
                  )}

                  {(paymentMethod === 'card' || paymentMethod === 'transfer') && (
                    <>
                      <div><label>Monto:</label><span>{fmt(totalAPagar)}</span></div>
                      <div><label>Referencia:</label><input type="text" value={paymentMethod === 'card' ? refCard : refTransfer} onChange={e => paymentMethod === 'card' ? setRefCard(e.target.value) : setRefTransfer(e.target.value)} /></div>
                    </>
                  )}

                  {paymentMethod === 'mixto' && (
                    <>
                      <div><label>Efectivo:</label><input type="text" inputMode="numeric" value={amountPaidRaw} onChange={e => { let digits = e.target.value.replace(/\D/g, ''); handleMixtoField('cash', digits); }} /></div>
                      <div><label>Transferencia:</label><input type="text" inputMode="numeric" value={transferPaidRaw} onChange={e => { let digits = e.target.value.replace(/\D/g, ''); handleMixtoField('transfer', digits); }} /></div>
                      <div><label>Tarjeta:</label><input type="text" inputMode="numeric" value={cardPaidRaw} onChange={e => { let digits = e.target.value.replace(/\D/g, ''); handleMixtoField('card', digits); }} /></div>
                    </>
                  )}
                </div>
              )}

              {/* Botones acciones */}
              <div className="actions-row">
                <button
                  className="btn-guardar"
                  disabled={printLoading || (
                    paymentMethod === 'split'
                      ? selectedItems.length > 0
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
                  setSplitClientes([]);
                  setPagosRealizados([]);
                  setFacturaIndividual(false);
                }}>
                  <X size={16} /> Cancelar
                </button>
              </div>

              {/* Historial de pagos para factura única */}
              {paymentMethod === 'split' && !facturaIndividual && pagosRealizados.length > 0 && (
                <div style={{ marginTop: 16, padding: 12, background: '#e8f5e9', borderRadius: 8 }}>
                  <div style={{ fontWeight: 'bold', marginBottom: 8 }}>📋 Clientes que ya pagaron:</div>
                  {pagosRealizados.map((pago, idx) => (
                    <div key={idx} style={{ fontSize: 12 }}>• {pago.cliente.nombre} - ${pago.total.toFixed(2)} ({pago.items.length} productos)</div>
                  ))}
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    Total pagado: ${pagosRealizados.reduce((sum, p) => sum + p.total, 0).toFixed(2)} / Total orden: ${total.toFixed(2)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PageTemplate>
  );
}