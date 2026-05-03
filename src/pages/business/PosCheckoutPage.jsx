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
  const [modoDividido, setModoDividido] = useState(false); // false = normal, true = cuenta dividida
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
  
  // Control de cuenta dividida
  const [facturaIndividual, setFacturaIndividual] = useState(false);
  const [pagosRealizados, setPagosRealizados] = useState([]);
  const [clientesDivididos, setClientesDivididos] = useState([]);
  const [clienteActual, setClienteActual] = useState(null);

  // ── Helper para redondear ─────────────────────────────────────────────────
  const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    loadOrders();
  }, [selectedBusiness]);

  useEffect(() => {
    if (!selectedOrder) return;
    if (modoDividido) {
      setSelectedItems([]);
      if (clientesDivididos.length === 0 && facturaIndividual) {
        setClientesDivididos([{
          id: Date.now(),
          cedula: '',
          nombre: '',
          email: '',
          items: [],
          metodoPago: 'cash',
          montoRecibido: 0,
          referencia: ''
        }]);
      }
    }
  }, [modoDividido, selectedOrder]);

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
    setClientesDivididos([]);
    setModoDividido(false);
    setFacturaIndividual(false);
    setClienteActual(null);
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

  const buscarClientePorDocumento = async (documento, esParaClienteDividido = false, clienteId = null) => {
    setClientApiLoading(true);
    setError('');
    setSuccess('');

    if (!documento || (documento.length !== 10 && documento.length !== 13)) {
      if (esParaClienteDividido && clienteId) {
        actualizarClienteDividido(clienteId, 'nombre', '');
        actualizarClienteDividido(clienteId, 'email', '');
      } else {
        setClienteNombre('');
      }
      setClientApiLoading(false);
      return;
    }

    try {
      const docType = documento.length === 13 ? 'ruc' : 'cedula';
      const res = await fetchWithAuth(`/api/customers/by-document?document_number=${documento}&document_type=${docType}`);

      if (res.ok) {
        const data = await res.json();
        if (data?.nombre || data?.name) {
          const nombre = data.nombre || data.name;
          const email = data.email || '';
          
          if (esParaClienteDividido && clienteId) {
            actualizarClienteDividido(clienteId, 'nombre', nombre);
            actualizarClienteDividido(clienteId, 'email', email);
          } else {
            setClienteNombre(nombre);
            setClienteEmail(email);
            setFoundCliente({ ...data, tipo: docType });
          }
        }
      } else {
        if (esParaClienteDividido && clienteId) {
          actualizarClienteDividido(clienteId, 'nombre', '');
          actualizarClienteDividido(clienteId, 'email', '');
        } else {
          setClienteEmail('');
          setFoundCliente(null);
          await buscarNombreEnPadronEcuador(documento.slice(0, 10), esParaClienteDividido, clienteId);
        }
      }
    } catch (err) {
      console.error('Error buscando cliente:', err);
    } finally {
      setClientApiLoading(false);
    }
  };

  const buscarNombreEnPadronEcuador = async (cedula10, esParaClienteDividido = false, clienteId = null) => {
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
          const nombreCompleto = (json.nombres + ' ' + (json.apellidos || '')).trim();
          if (esParaClienteDividido && clienteId) {
            actualizarClienteDividido(clienteId, 'nombre', nombreCompleto);
          } else {
            setClienteNombre(nombreCompleto);
          }
        }
      }
    } catch {
      if (!esParaClienteDividido) {
        setClienteNombre('');
      }
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
    setSelectedItems([]);
    setPagosRealizados([]);
    setClientesDivididos([]);
    setModoDividido(false);
    setFacturaIndividual(false);
    setClienteActual(null);
    setError('');
  };

  const onClienteCedulaBlurOrEnter = (e, esParaClienteDividido = false, clienteId = null) => {
    const cedula = esParaClienteDividido ? 
      (clientesDivididos.find(c => c.id === clienteId)?.cedula || '') : 
      clienteCedula;
      
    if (
      (e.type === "blur" || (e.type === "keypress" && e.key === "Enter")) &&
      (cedula.length === 10 || cedula.length === 13)
    ) {
      buscarClientePorDocumento(cedula, esParaClienteDividido, clienteId);
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

  // ── Cálculo de totals ────────────────────────────────────────────────────
  const getSplitSubtotal = () => {
    if (!selectedOrder || !modoDividido) return 0;

    return selectedOrder.items
      .filter(i => selectedItems.includes(i.id) && !i.paid)
      .reduce((sum, i) => {
        const precioSinIVA = Number(i.selling_price) || Number(i.unit_price) || 0;
        return sum + (precioSinIVA * i.quantity);
      }, 0);
  };

  const getSplitTax = () => {
    if (!selectedOrder || !modoDividido) return 0;

    return selectedOrder.items
      .filter(i => selectedItems.includes(i.id) && !i.paid)
      .reduce((sum, i) => {
        const montoIVA = Number(i.tax_rate) || 0;
        return sum + (montoIVA * i.quantity);
      }, 0);
  };

  const getPaymentTotal = () => getSplitSubtotal() + getSplitTax();

  // ── Funciones para cuenta dividida ────────────────────────────────────────
  
  const agregarClienteDividido = () => {
    const nuevoId = Date.now();
    setClientesDivididos([
      ...clientesDivididos,
      {
        id: nuevoId,
        cedula: '',
        nombre: '',
        email: '',
        items: [],
        metodoPago: 'cash',
        montoRecibido: 0,
        referencia: ''
      }
    ]);
  };

  const eliminarClienteDividido = (id) => {
    if (clientesDivididos.length === 1) {
      setError('Debe haber al menos un cliente');
      return;
    }
    const cliente = clientesDivididos.find(c => c.id === id);
    if (cliente && cliente.items.length > 0) {
      setSelectedItems([...selectedItems, ...cliente.items]);
    }
    setClientesDivididos(clientesDivididos.filter(c => c.id !== id));
  };

  const actualizarClienteDividido = (id, campo, valor) => {
    setClientesDivididos(clientesDivididos.map(cliente => 
      cliente.id === id ? { ...cliente, [campo]: valor } : cliente
    ));
  };

  const asignarItemsACliente = (idCliente) => {
    if (selectedItems.length === 0) {
      setError('No hay productos seleccionados');
      return;
    }
    
    const itemsNoPagados = selectedItems.filter(itemId => {
      const item = selectedOrder.items.find(i => i.id === itemId);
      return item && !item.paid;
    });
    
    if (itemsNoPagados.length === 0) {
      setError('Los productos seleccionados ya fueron pagados');
      return;
    }
    
    setClientesDivididos(clientesDivididos.map(cliente => 
      cliente.id === idCliente 
        ? { ...cliente, items: [...cliente.items, ...itemsNoPagados] }
        : cliente
    ));
    setSelectedItems([]);
    setSuccess(`${itemsNoPagados.length} producto(s) asignado(s)`);
    setTimeout(() => setSuccess(''), 2000);
  };

  const quitarItemDeCliente = (idCliente, itemId) => {
    setClientesDivididos(clientesDivididos.map(cliente => 
      cliente.id === idCliente 
        ? { ...cliente, items: cliente.items.filter(id => id !== itemId) }
        : cliente
    ));
    setSelectedItems([...selectedItems, itemId]);
  };

  const calcularSubtotalCliente = (cliente) => {
    if (!selectedOrder) return 0;
    let subtotal = 0;
    cliente.items.forEach(itemId => {
      const item = selectedOrder.items.find(i => i.id === itemId);
      if (item && !item.paid) {
        const precioSinIVA = Number(item.selling_price) || Number(item.unit_price) || 0;
        subtotal += precioSinIVA * item.quantity;
      }
    });
    return subtotal;
  };

  const calcularIVACliente = (cliente) => {
    if (!selectedOrder) return 0;
    let iva = 0;
    cliente.items.forEach(itemId => {
      const item = selectedOrder.items.find(i => i.id === itemId);
      if (item && !item.paid) {
        const montoIVA = Number(item.tax_rate) || 0;
        iva += montoIVA * item.quantity;
      }
    });
    return iva;
  };

  const calcularTotalCliente = (cliente) => {
    return calcularSubtotalCliente(cliente) + calcularIVACliente(cliente);
  };

  const calcularCambioCliente = (cliente) => {
    const total = calcularTotalCliente(cliente);
    return Math.max(0, cliente.montoRecibido - total);
  };

  // ── Totales de la orden completa ──────────────────────────────────────────
  const subtotal = selectedOrder ? Number(selectedOrder.subtotal || 0) : 0;
  const iva = selectedOrder ? Number(selectedOrder.tax_amount || 0) : 0;
  const total = selectedOrder ? Number(selectedOrder.total || 0) : 0;

  const totalAPagar = !modoDividido ? total : getPaymentTotal();
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

  // ── Métodos de pago para cuenta normal ────────────────────────────────────
  const [metodoPagoNormal, setMetodoPagoNormal] = useState('cash');

  // ── Cobro/Guardar ──────────────────────────────────────────────────────────
  const handlePayment = async () => {
    setPrintLoading(true);
    setError('');
    setSuccess('');

    // ── MODO NORMAL (no dividido) ──────────────────────────────────────────
    if (!modoDividido && selectedOrder) {
      if (metodoPagoNormal === 'cash') {
        const paid = parseFloat(amountPaid) || 0;
        if (paid < total) {
          setError(`El pago debe ser al menos ${fmt(total)}`);
          setPrintLoading(false);
          return;
        }
        
        try {
          const res = await fetchWithAuth(`/api/ordenes/${selectedOrder.id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({
              status: 'paid',
              payment_method: 'cash',
              amount_paid: total,
              customer_id: await guardarClienteSiNoExiste(clienteCedula || '9999999999', clienteNombre || 'CONSUMIDOR FINAL', clienteEmail || null),
              customer_name: clienteNombre,
              customer_document_number: clienteCedula,
              notes: orderNotes
            }),
          });
          if (!res.ok) throw new Error('Error al completar pago');
          
          const invoiceNum = await emitirFactura(selectedOrder, clienteCedula, clienteNombre, 'cash');
          await handlePrintReceipt(selectedOrder, paid, change, invoiceNum);
          setOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
          await resetForm();
          setSuccess('Pago completado');
        } catch (err) {
          setError(err.message);
        } finally {
          setPrintLoading(false);
        }
        return;
      }
      
      if (metodoPagoNormal === 'card') {
        const paid = total;
        const refNum = refCard;
        
        try {
          const res = await fetchWithAuth(`/api/ordenes/${selectedOrder.id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({
              status: 'paid',
              payment_method: 'card',
              amount_paid: total,
              reference_number: refNum,
              customer_id: await guardarClienteSiNoExiste(clienteCedula || '9999999999', clienteNombre || 'CONSUMIDOR FINAL', clienteEmail || null),
              customer_name: clienteNombre,
              customer_document_number: clienteCedula,
              notes: orderNotes
            }),
          });
          if (!res.ok) throw new Error('Error al completar pago');
          
          const invoiceNum = await emitirFactura(selectedOrder, clienteCedula, clienteNombre, 'card');
          await handlePrintReceipt(selectedOrder, paid, 0, invoiceNum);
          setOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
          await resetForm();
          setSuccess('Pago con tarjeta completado');
        } catch (err) {
          setError(err.message);
        } finally {
          setPrintLoading(false);
        }
        return;
      }
      
      if (metodoPagoNormal === 'transfer') {
        const paid = total;
        const refNum = refTransfer;
        
        try {
          const res = await fetchWithAuth(`/api/ordenes/${selectedOrder.id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({
              status: 'paid',
              payment_method: 'transfer',
              amount_paid: total,
              reference_number: refNum,
              customer_id: await guardarClienteSiNoExiste(clienteCedula || '9999999999', clienteNombre || 'CONSUMIDOR FINAL', clienteEmail || null),
              customer_name: clienteNombre,
              customer_document_number: clienteCedula,
              notes: orderNotes
            }),
          });
          if (!res.ok) throw new Error('Error al completar pago');
          
          const invoiceNum = await emitirFactura(selectedOrder, clienteCedula, clienteNombre, 'transfer');
          await handlePrintReceipt(selectedOrder, paid, 0, invoiceNum);
          setOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
          await resetForm();
          setSuccess('Pago con transferencia completado');
        } catch (err) {
          setError(err.message);
        } finally {
          setPrintLoading(false);
        }
        return;
      }
      
      if (metodoPagoNormal === 'mixto') {
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
          if (!res.ok) throw new Error('Error al completar pago');
          
          const changeForPrint = cashAmt - cashNeeded;
          const invoiceNum = await emitirFactura(selectedOrder, clienteCedula, clienteNombre, 'mixto');
          await handlePrintReceipt(selectedOrder, total, changeForPrint, invoiceNum);
          setOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
          await resetForm();
          setSuccess('Pago mixto completado');
        } catch (err) {
          setError(err.message);
        } finally {
          setPrintLoading(false);
        }
        return;
      }
    }

    // ── MODO CUENTA DIVIDIDA ─────────────────────────────────────────────────
    if (modoDividido && selectedOrder) {
      if (selectedItems.length > 0) {
        setError("Asigna todos los productos a un cliente antes de pagar");
        setPrintLoading(false);
        return;
      }
      
      const clientesConItems = clientesDivididos.filter(c => c.items.length > 0);
      if (clientesConItems.length === 0) {
        setError("Asigna al menos un producto a un cliente");
        setPrintLoading(false);
        return;
      }

      // Verificar pagos válidos
      let pagosInvalidos = false;
      for (const cliente of clientesDivididos) {
        if (cliente.items.length > 0 && cliente.montoRecibido < calcularTotalCliente(cliente)) {
          pagosInvalidos = true;
          setError(`${cliente.nombre || 'Cliente'} tiene pago insuficiente`);
          setPrintLoading(false);
          return;
        }
      }

      try {
        for (const cliente of clientesDivididos) {
          if (cliente.items.length === 0) continue;
          
          const totalCliente = calcularTotalCliente(cliente);
          let cedula = cliente.cedula?.trim() || '9999999999';
          let nombre = cliente.nombre?.trim() || 'CONSUMIDOR FINAL';
          let clienteId = await guardarClienteSiNoExiste(cedula, nombre, cliente.email || null, null);
          
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
          
          // Factura individual por cliente si está activado
          if (facturaIndividual) {
            const partialOrder = {
              ...selectedOrder,
              items: selectedOrder.items.filter(i => cliente.items.includes(i.id))
            };
            await emitirFactura(partialOrder, cedula, nombre, 'split');
            await handlePrintReceipt(partialOrder, totalCliente, cliente.montoRecibido - totalCliente, null, 'split', nombre);
            setSuccess(`Factura generada para ${nombre}`);
          } else {
            setPagosRealizados(prev => [...prev, {
              cliente: { cedula, nombre, email: cliente.email },
              items: cliente.items,
              total: totalCliente,
              metodoPago: cliente.metodoPago
            }]);
            setSuccess(`Pago registrado para ${nombre}`);
          }
        }
        
        // Recargar orden
        const res = await fetchWithAuth(`/api/ordenes/${selectedOrder.id}`);
        const ordenActualizada = await res.json();
        setSelectedOrder(ordenActualizada);
        
        const productosPendientes = ordenActualizada.items.filter(i => !i.paid);
        
        if (productosPendientes.length === 0) {
          // Factura única al final si está desactivada la individual
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
          setClientesDivididos([]);
          setPagosRealizados([]);
        } else {
          setClientesDivididos([{
            id: Date.now(),
            cedula: '',
            nombre: '',
            email: '',
            items: [],
            metodoPago: 'cash',
            montoRecibido: 0,
            referencia: ''
          }]);
          setSelectedItems([]);
          setSuccess(`Pagos completados. Quedan ${productosPendientes.length} productos por pagar.`);
        }
        
      } catch (err) {
        console.error('Error en cuenta dividida:', err);
        setError(err.message);
      } finally {
        setPrintLoading(false);
      }
      return;
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
          {/* Selección de orden */}
          <div className="cmbx-row" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <label className="label" style={{ minWidth: 50 }}>Orden:</label>
            <select
              value={selectedOrder?.id || ''}
              onChange={e => handleSelectOrder(e.target.value)}
              className="combobox"
              style={{ minWidth: 180 }}
            >
              <option value="">Seleccionar No. Orden</option>
              {orders.map(order => (
                <option key={order.id} value={order.id}>
                  {order.mesa_numero ? `Mesa ${order.mesa_numero}` : order.order_type === 'delivery' ? 'DELIVERY' : 'PARA LLEVAR'} - #{order.order_number || order.id}
                </option>
              ))}
            </select>

            {/* Datos del cliente principal - visibles cuando NO está en modo dividido */}
            {!modoDividido && (
              <>
                <label className="label" style={{ marginLeft: 16 }}>Cliente:</label>
                <div className="cliente-fields" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <input
                    className="client-inp"
                    type="text"
                    placeholder="Cédula/RUC"
                    value={clienteCedula}
                    onChange={e => setClienteCedula(e.target.value.replace(/\D/g, '').slice(0, 13))}
                    onBlur={onClienteCedulaBlurOrEnter}
                    onKeyPress={e => onClienteCedulaBlurOrEnter(e)}
                    disabled={!selectedOrder}
                    style={{ minWidth: 120 }}
                  />
                  <input
                    className="client-inp"
                    type="text"
                    placeholder="Nombre cliente"
                    value={clienteNombre}
                    onChange={e => setClienteNombre(e.target.value)}
                    disabled={!selectedOrder}
                    style={{ minWidth: 200 }}
                  />
                  <input
                    className="client-inp"
                    type="email"
                    placeholder="Email (factura)"
                    value={clienteEmail}
                    onChange={e => setClienteEmail(e.target.value)}
                    disabled={!selectedOrder}
                    style={{ minWidth: 180 }}
                  />
                </div>
              </>
            )}
            <OpenDrawerButton />
          </div>

          {error && <div style={{ fontSize: 12, color: '#e11d48', fontWeight: 800, marginTop: 6 }}>{error}</div>}
          {success && <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 800, marginTop: 6 }}>{success}</div>}
          {printerError && <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 800, marginTop: 6 }}>⚠️ {printerError}</div>}

          {selectedOrder && (
            <>
              {/* Controles de pago */}
              <div className="pay-methods">
                <button 
                  className={!modoDividido && metodoPagoNormal === 'cash' ? "pay-btn selected" : "pay-btn"} 
                  onClick={() => {
                    setModoDividido(false);
                    setMetodoPagoNormal('cash');
                  }}
                  disabled={modoDividido}
                >
                  <DollarSign size={15} /> Efectivo
                </button>
                <button 
                  className={!modoDividido && metodoPagoNormal === 'transfer' ? "pay-btn selected" : "pay-btn"} 
                  onClick={() => {
                    setModoDividido(false);
                    setMetodoPagoNormal('transfer');
                  }}
                  disabled={modoDividido}
                >
                  <DollarSign size={15} /> Transferencia
                </button>
                <button 
                  className={!modoDividido && metodoPagoNormal === 'card' ? "pay-btn selected" : "pay-btn"} 
                  onClick={() => {
                    setModoDividido(false);
                    setMetodoPagoNormal('card');
                  }}
                  disabled={modoDividido}
                >
                  <CreditCard size={15} /> Tarjeta
                </button>
                <button 
                  className={!modoDividido && metodoPagoNormal === 'mixto' ? "pay-btn selected" : "pay-btn"} 
                  onClick={() => {
                    setModoDividido(false);
                    setMetodoPagoNormal('mixto');
                  }}
                  disabled={modoDividido}
                >
                  <Divide size={15} /> Mixto
                </button>
                <button 
                  className={modoDividido ? "pay-btn selected" : "pay-btn"} 
                  onClick={() => {
                    setModoDividido(true);
                    if (clientesDivididos.length === 0) {
                      setClientesDivididos([{
                        id: Date.now(),
                        cedula: '',
                        nombre: '',
                        email: '',
                        items: [],
                        metodoPago: 'cash',
                        montoRecibido: 0,
                        referencia: ''
                      }]);
                    }
                  }}
                >
                  <Users size={15} /> Dividir Cuenta
                </button>
              </div>

              {/* Opción de facturación individual (solo en modo dividido) */}
              {modoDividido && (
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
                      }}
                      style={{ width: 18, height: 18 }}
                    />
                    <span style={{ fontWeight: 600 }}>
                      {facturaIndividual ? '📄 Factura INDIVIDUAL por cada cliente' : '📄 Una sola factura al final (todos los productos)'}
                    </span>
                  </label>
                  <span style={{ fontSize: 12, color: '#666', marginLeft: 30 }}>
                    {facturaIndividual 
                      ? 'Cada cliente recibe su factura con sus datos y productos'
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
                  {modoDividido && selectedItems.length > 0 && (
                    <span style={{ fontWeight: 400, fontSize: 12, color: '#6842fe', marginLeft: 12 }}>
                      ✓ {selectedItems.length} producto(s) seleccionado(s)
                    </span>
                  )}
                </div>

                {/* Items - con checkboxes solo en modo dividido */}
                {modoDividido && (
                  <div className="order-items">
                    <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 14, color: '#333' }}>
                      📦 Selecciona productos para asignar a cada cliente:
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

                {/* Items SIN checkboxes para modo normal */}
                {!modoDividido && (
                  <div className="order-items">
                    {selectedOrder.items.filter(item => !item.paid).map((item, idx) => (
                      <div key={idx} className="item-line">
                        <span>{item.quantity}x {item.product_name}</span>
                        <span className="item-amt">{fmt((Number(item.selling_price) || Number(item.unit_price)) * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Totales selección para modo dividido */}
                {modoDividido && selectedItems.length > 0 && !facturaIndividual && (
                  <div className="totals-footer" style={{ marginTop: 16 }}>
                    <div className="sub-iva-total"><span>SUBTOTAL seleccionado:</span><span>{fmt(getSplitSubtotal())}</span></div>
                    <div className="sub-iva-total"><span>IVA seleccionado:</span><span>{fmt(getSplitTax())}</span></div>
                    <div className="sub-iva-total" style={{ borderTop: '1.5px solid #ddd', paddingTop: '8px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: 16 }}>TOTAL seleccionado:</span>
                      <span style={{ fontWeight: 'bold', fontSize: 16, color: '#6842fe' }}>{fmt(getPaymentTotal())}</span>
                    </div>
                  </div>
                )}

                {/* Totales modo normal */}
                {!modoDividido && (
                  <div className="totals-footer">
                    <div className="sub-iva-total"><span>SUBTOTAL:</span><span>{fmt(subtotal)}</span></div>
                    <div className="sub-iva-total"><span>IVA:</span><span>{fmt(iva)}</span></div>
                    <div className="sub-iva-total" style={{ borderTop: '1.5px solid #ddd', paddingTop: '8px', marginTop: '8px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: 16 }}>TOTAL A PAGAR:</span>
                      <span style={{ fontWeight: 'bold', fontSize: 16 }}>{fmt(total)}</span>
                    </div>
                  </div>
                )}

                {/* Sección de Clientes para cuenta dividida */}
                {modoDividido && (
                  <div className="clientes-container">
                    <div className="clientes-header">
                      <span>👥 Clientes / Comensales</span>
                      <button onClick={agregarClienteDividido} className="btn-agregar-cliente">
                        + Agregar Cliente
                      </button>
                    </div>
                    
                    {clientesDivididos.map((cliente, idx) => {
                      const subtotalCliente = calcularSubtotalCliente(cliente);
                      const ivaCliente = calcularIVACliente(cliente);
                      const totalCliente = calcularTotalCliente(cliente);
                      const cambioCliente = calcularCambioCliente(cliente);
                      const faltaCliente = totalCliente - cliente.montoRecibido;
                      
                      return (
                        <div key={cliente.id} className="cliente-card">
                          <div className="cliente-header">
                            <span className="cliente-titulo">🧑 Cliente {idx + 1}</span>
                            {clientesDivididos.length > 1 && (
                              <button onClick={() => eliminarClienteDividido(cliente.id)} className="btn-eliminar-cliente">
                                Eliminar
                              </button>
                            )}
                          </div>
                          
                          {/* Datos del cliente */}
                          <div className="cliente-individual-fields">
                            <input
                              type="text"
                              placeholder="Cédula/RUC"
                              value={cliente.cedula}
                              onChange={e => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 13);
                                actualizarClienteDividido(cliente.id, 'cedula', val);
                              }}
                              onKeyPress={e => {
                                if (e.key === 'Enter') {
                                  buscarClientePorDocumento(cliente.cedula, true, cliente.id);
                                }
                              }}
                              onBlur={() => buscarClientePorDocumento(cliente.cedula, true, cliente.id)}
                            />
                            <input
                              type="text"
                              placeholder="Nombre completo"
                              value={cliente.nombre}
                              onChange={e => actualizarClienteDividido(cliente.id, 'nombre', e.target.value)}
                            />
                            <input
                              type="email"
                              placeholder="Email (factura)"
                              value={cliente.email}
                              onChange={e => actualizarClienteDividido(cliente.id, 'email', e.target.value)}
                            />
                          </div>
                          
                          {/* Productos asignados */}
                          <div className="productos-asignados">
                            <span>Productos asignados:</span>
                            <div style={{ marginTop: 6 }}>
                              {cliente.items.map(itemId => {
                                const item = selectedOrder.items.find(i => i.id === itemId);
                                return item ? (
                                  <div key={itemId} className="producto-asignado">
                                    <span className="producto-nombre">{item.quantity}x {item.product_name}</span>
                                    <div>
                                      <span className="producto-total">{fmt((Number(item.selling_price) || Number(item.unit_price)) * item.quantity)}</span>
                                      <button onClick={() => quitarItemDeCliente(cliente.id, itemId)} className="btn-quitar-item">
                                        Quitar
                                      </button>
                                    </div>
                                  </div>
                                ) : null;
                              })}
                              {cliente.items.length === 0 && <span style={{ fontSize: 12, color: '#999' }}>Sin productos asignados</span>}
                            </div>
                          </div>
                          
                          {/* Método de pago del cliente */}
                          <div className="metodo-pago-cliente">
                            <select value={cliente.metodoPago} onChange={e => actualizarClienteDividido(cliente.id, 'metodoPago', e.target.value)}>
                              <option value="cash">💰 Efectivo</option>
                              <option value="card">💳 Tarjeta</option>
                              <option value="transfer">🏦 Transferencia</option>
                            </select>
                            
                            <span>Monto recibido:</span>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={cliente.montoRecibido || ''}
                              onChange={e => actualizarClienteDividido(cliente.id, 'montoRecibido', parseFloat(e.target.value) || 0)}
                              style={{ width: 120 }}
                            />
                            
                            {cliente.metodoPago !== 'cash' && (
                              <>
                                <span>Referencia:</span>
                                <input
                                  type="text"
                                  placeholder="N° referencia"
                                  value={cliente.referencia || ''}
                                  onChange={e => actualizarClienteDividido(cliente.id, 'referencia', e.target.value)}
                                  style={{ width: 150 }}
                                />
                              </>
                            )}
                          </div>
                          
                          {/* Totales del cliente */}
                          <div className="cliente-totales">
                            <div className="cliente-subtotal-iva">
                              <div>Subtotal: <strong>{fmt(subtotalCliente)}</strong></div>
                              <div>IVA: <strong>{fmt(ivaCliente)}</strong></div>
                            </div>
                            <div className="cliente-total">
                              <div className="cliente-total-valor">Total: {fmt(totalCliente)}</div>
                              {cliente.montoRecibido > 0 && (
                                <div className={totalCliente <= cliente.montoRecibido ? "cliente-cambio success" : "cliente-cambio error"}>
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
                    
                    {/* Botón para asignar productos */}
                    {selectedItems.length > 0 && clientesDivididos.length > 0 && (
                      <div className="asignar-container">
                        <select
                          id="clienteSelect"
                          className="asignar-select"
                          defaultValue={clientesDivididos[0]?.id}
                        >
                          {clientesDivididos.map((cliente, idx) => (
                            <option key={cliente.id} value={cliente.id}>
                              Cliente {idx + 1} {cliente.nombre && `- ${cliente.nombre}`}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            const select = document.getElementById('clienteSelect');
                            const clienteId = parseInt(select.value);
                            asignarItemsACliente(clienteId);
                          }}
                          className="btn-asignar"
                        >
                          📦 Asignar {selectedItems.length} producto(s) a este cliente
                        </button>
                      </div>
                    )}

                    {/* Advertencia */}
                    {selectedItems.length > 0 && (
                      <div className="warning-box">
                        ⚠️ {selectedItems.length} producto(s) sin asignar. Selecciona un cliente y asigna los productos.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Campos de pago para modo normal */}
              {!modoDividido && (
                <div className="pay-input-row" style={{ gap: 24, flexWrap: 'wrap', alignItems: 'center', margin: '20px 0' }}>
                  {metodoPagoNormal === 'cash' && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fefefe', borderRadius: '9px', padding: '7px 18px' }}>
                        <label style={{ fontWeight: 900, fontSize: 18 }}>Recibido:</label>
                        <input
                          type="text"
                          className="input-pay"
                          inputMode="numeric"
                          value={amountPaidRaw === '0' || amountPaidRaw === '' ? '' : (parseInt(amountPaidRaw, 10) / 100).toFixed(2)}
                          onChange={e => {
                            let digits = e.target.value.replace(/\D/g, '');
                            if (!digits) digits = '0';
                            setAmountPaidRaw(digits);
                            setAmountPaid((parseInt(digits, 10) / 100).toFixed(2));
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#d7d6fc', borderRadius: '9px', padding: '7px 18px' }}>
                        <label style={{ fontWeight: 900, fontSize: 18 }}>Cambio:</label>
                        <span style={{ fontWeight: 800, fontSize: 18 }}>{fmt(change)}</span>
                      </div>
                    </>
                  )}

                  {metodoPagoNormal === 'card' && (
                    <>
                      <div><label>Referencia:</label>
                        <input type="text" value={refCard} onChange={e => setRefCard(e.target.value)} style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc', width: 200 }} />
                      </div>
                    </>
                  )}

                  {metodoPagoNormal === 'transfer' && (
                    <>
                      <div><label>Referencia:</label>
                        <input type="text" value={refTransfer} onChange={e => setRefTransfer(e.target.value)} style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc', width: 200 }} />
                      </div>
                    </>
                  )}

                  {metodoPagoNormal === 'mixto' && (
                    <>
                      <div><label>Efectivo:</label>
                        <input type="text" inputMode="numeric" value={amountPaidRaw} onChange={e => { let digits = e.target.value.replace(/\D/g, ''); handleMixtoField('cash', digits); }} />
                      </div>
                      <div><label>Transferencia:</label>
                        <input type="text" inputMode="numeric" value={transferPaidRaw} onChange={e => { let digits = e.target.value.replace(/\D/g, ''); handleMixtoField('transfer', digits); }} />
                      </div>
                      <div><label>Tarjeta:</label>
                        <input type="text" inputMode="numeric" value={cardPaidRaw} onChange={e => { let digits = e.target.value.replace(/\D/g, ''); handleMixtoField('card', digits); }} />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Botones acciones */}
              <div className="actions-row">
                <button
                  className="btn-guardar"
                  disabled={printLoading || (
                    modoDividido
                      ? selectedItems.length > 0
                      : metodoPagoNormal === 'cash'
                        ? (!amountPaid || parseFloat(amountPaid) < total)
                        : false
                  )}
                  onClick={handlePayment}
                >
                  <Check size={16} /> {printLoading ? 'Procesando...' : 'COBRAR'}
                </button>
                <button className="btn-cancelar" onClick={() => {
                  setSelectedOrder(null);
                  setSelectedItems([]);
                  setClientesDivididos([]);
                  setPagosRealizados([]);
                  setModoDividido(false);
                  setFacturaIndividual(false);
                }}>
                  <X size={16} /> Cancelar
                </button>
              </div>

              {/* Historial de pagos para factura única */}
              {modoDividido && !facturaIndividual && pagosRealizados.length > 0 && (
                <div className="historial-pagos">
                  <div className="historial-titulo">📋 Clientes que ya pagaron:</div>
                  {pagosRealizados.map((pago, idx) => (
                    <div key={idx} className="historial-item">
                      • {pago.cliente.nombre} - ${pago.total.toFixed(2)} ({pago.items.length} productos)
                    </div>
                  ))}
                  <div className="historial-total">
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