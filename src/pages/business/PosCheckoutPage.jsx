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
  const [modoDividido, setModoDividido] = useState(false);
  const [foundCliente, setFoundCliente] = useState(null);
  const [clienteCedula, setClienteCedula] = useState('9999999999');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [printLoading, setPrintLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [clientApiLoading, setClientApiLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

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
  const [clientesDivididos, setClientesDivididos] = useState([]);
  const [pagosRegistrados, setPagosRegistrados] = useState([]);
  const [metodoPagoNormal, setMetodoPagoNormal] = useState('cash');
  const [totalPagadoAcumulado, setTotalPagadoAcumulado] = useState(0);

  const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

  useEffect(() => {
    loadOrders();
  }, [selectedBusiness]);

  const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`;

  const recargarOrden = async () => {
    if (!selectedOrder) return null;
    try {
      const res = await fetchWithAuth(`/api/ordenes/${selectedOrder.id}`);
      const ordenActualizada = await res.json();
      setSelectedOrder(ordenActualizada);
      return ordenActualizada;
    } catch (err) {
      console.error('Error recargando orden:', err);
      return null;
    }
  };

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
    setClientesDivididos([]);
    setPagosRegistrados([]);
    setTotalPagadoAcumulado(0);
    setModoDividido(false);
    setFacturaIndividual(false);
    setMetodoPagoNormal('cash');
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

  const buscarClientePorDocumento = async (documento, esParaComensal = false, comensalId = null) => {
    setClientApiLoading(true);
    setError('');

    if (!documento || (documento.length !== 10 && documento.length !== 13)) {
      if (esParaComensal && comensalId) {
        actualizarComensal(comensalId, 'nombre', '');
        actualizarComensal(comensalId, 'email', '');
      } else {
        setClienteNombre('');
        setClienteEmail('');
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
          
          if (esParaComensal && comensalId) {
            actualizarComensal(comensalId, 'nombre', nombre);
            actualizarComensal(comensalId, 'email', email);
          } else {
            setClienteNombre(nombre);
            setClienteEmail(email);
            setFoundCliente({ ...data, tipo: docType });
          }
        }
      } else {
        if (esParaComensal && comensalId) {
          actualizarComensal(comensalId, 'nombre', '');
          actualizarComensal(comensalId, 'email', '');
        } else {
          setClienteEmail('');
          setFoundCliente(null);
          await buscarEnPadron(documento.slice(0, 10), esParaComensal, comensalId);
        }
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setClientApiLoading(false);
    }
  };

  const buscarEnPadron = async (cedula10, esParaComensal = false, comensalId = null) => {
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
          if (esParaComensal && comensalId) {
            actualizarComensal(comensalId, 'nombre', nombreCompleto);
          } else {
            setClienteNombre(nombreCompleto);
          }
        }
      }
    } catch {
      if (!esParaComensal) setClienteNombre('');
    }
  };

  const guardarCliente = async (documento, nombre, email = null) => {
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
          tipo_documento
        }),
      });

      if (res.ok) {
        const cliente = await res.json();
        return cliente.id;
      }
      return null;
    } catch (err) {
      console.error('Error guardando cliente:', err);
      return null;
    }
  };

  const handleSelectOrder = (oid) => {
    const o = orders.find(x => String(x.id) === oid);
    setSelectedOrder(o || null);
    setClienteCedula(o?.customer_document_number || '9999999999');
    setClienteNombre(o?.customer_name || '');
    setClienteEmail('');
    setFoundCliente(null);
    setOrderNotes(o?.notes || '');
    setAmountPaid('');
    setSelectedItems([]);
    setClientesDivididos([]);
    setPagosRegistrados([]);
    setTotalPagadoAcumulado(0);
    setModoDividido(false);
    setFacturaIndividual(false);
    setError('');
  };

  const onClienteCedulaBlurOrEnter = (e, esParaComensal = false, comensalId = null) => {
    if ((e.type === "blur" || (e.type === "keypress" && e.key === "Enter"))) {
      const cedula = esParaComensal ? (clientesDivididos.find(c => c.id === comensalId)?.cedula || '') : clienteCedula;
      if (cedula.length === 10 || cedula.length === 13) {
        buscarClientePorDocumento(cedula, esParaComensal, comensalId);
      }
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

  // ── Funciones para cuenta dividida ────────────────────────────────────────
  
  const agregarComensal = () => {
    setClientesDivididos([
      ...clientesDivididos,
      {
        id: Date.now(),
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

  const eliminarComensal = (id) => {
    if (clientesDivididos.length === 1) {
      setError('Debe haber al menos un comensal');
      return;
    }
    const comensal = clientesDivididos.find(c => c.id === id);
    if (comensal && comensal.items.length > 0) {
      setSelectedItems(prev => [...prev, ...comensal.items]);
    }
    setClientesDivididos(clientesDivididos.filter(c => c.id !== id));
  };

  const actualizarComensal = (id, campo, valor) => {
    setClientesDivididos(clientesDivididos.map(comensal => 
      comensal.id === id ? { ...comensal, [campo]: valor } : comensal
    ));
  };

  const asignarItemsAComensal = (idComensal) => {
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
    
    setClientesDivididos(clientesDivididos.map(comensal => 
      comensal.id === idComensal 
        ? { ...comensal, items: [...comensal.items, ...itemsNoPagados] }
        : comensal
    ));
    setSelectedItems([]);
    setSuccess(`${itemsNoPagados.length} producto(s) asignado(s)`);
    setTimeout(() => setSuccess(''), 2000);
  };

  const quitarItemDeComensal = (idComensal, itemId) => {
    setClientesDivididos(clientesDivididos.map(comensal => 
      comensal.id === idComensal 
        ? { ...comensal, items: comensal.items.filter(id => id !== itemId) }
        : comensal
    ));
    setSelectedItems(prev => [...prev, itemId]);
  };

  const handleSelectItem = (itemId) => {
    // Verificar si el item ya está pagado
    const item = selectedOrder?.items.find(i => i.id === itemId);
    if (item?.paid) {
      setError('Este producto ya fue pagado');
      return;
    }
    setSelectedItems(prev => prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]);
  };

  const getSplitSubtotal = () => {
    if (!selectedOrder || !modoDividido) return 0;
    return selectedItems.reduce((sum, itemId) => {
      const item = selectedOrder.items.find(i => i.id === itemId);
      return sum + ((Number(item?.selling_price) || Number(item?.unit_price) || 0) * (item?.quantity || 1));
    }, 0);
  };

  const getSplitTax = () => {
    if (!selectedOrder || !modoDividido) return 0;
    return selectedItems.reduce((sum, itemId) => {
      const item = selectedOrder.items.find(i => i.id === itemId);
      return sum + ((Number(item?.tax_rate) || 0) * (item?.quantity || 1));
    }, 0);
  };

  const calcularSubtotalComensal = (comensal) => {
    if (!selectedOrder) return 0;
    let subtotal = 0;
    comensal.items.forEach(itemId => {
      const item = selectedOrder.items.find(i => i.id === itemId);
      if (item && !item.paid) {
        subtotal += (Number(item.selling_price) || Number(item.unit_price)) * item.quantity;
      }
    });
    return subtotal;
  };

  const calcularIVAComensal = (comensal) => {
    if (!selectedOrder) return 0;
    let iva = 0;
    comensal.items.forEach(itemId => {
      const item = selectedOrder.items.find(i => i.id === itemId);
      if (item && !item.paid) {
        iva += (Number(item.tax_rate) || 0) * item.quantity;
      }
    });
    return iva;
  };

  const calcularTotalComensal = (comensal) => {
    return calcularSubtotalComensal(comensal) + calcularIVAComensal(comensal);
  };

  const subtotalOrden = selectedOrder ? Number(selectedOrder.subtotal || 0) : 0;
  const ivaOrden = selectedOrder ? Number(selectedOrder.tax_amount || 0) : 0;
  const totalOrden = selectedOrder ? Number(selectedOrder.total || 0) : 0;
  const changeNormal = Math.max(0, (parseFloat(amountPaid) || 0) - totalOrden);

  const mixtoCardAmt = parseFloat(cardPaid) || 0;
  const mixtoTransferAmt = parseFloat(transferPaid) || 0;
  const mixtoCashAmt = parseFloat(amountPaid) || 0;
  const mixtoCashNeeded = Math.round(Math.max(0, totalOrden - mixtoCardAmt - mixtoTransferAmt) * 100) / 100;
  const mixtoChange = Math.max(0, mixtoCashAmt - mixtoCashNeeded);
  const mixtoReady = mixtoCashAmt >= mixtoCashNeeded && (mixtoCardAmt + mixtoTransferAmt + mixtoCashNeeded) > 0;

  // ── COBRAR COMENSAL ────────────────────────────────────────────────────────
  const cobrarComensal = async (comensal) => {
    if (comensal.items.length === 0) {
      setError('Este comensal no tiene productos asignados');
      return;
    }

    const totalComensal = calcularTotalComensal(comensal);
    
    if (comensal.metodoPago === 'cash' && comensal.montoRecibido < totalComensal) {
      setError(`Monto insuficiente. Total: ${fmt(totalComensal)}, Recibido: ${fmt(comensal.montoRecibido)}`);
      return;
    }

    setPrintLoading(true);
    
    try {
      let cedula = '9999999999';
      let nombre = 'CONSUMIDOR FINAL';
      let email = null;
      
      // Solo si es factura individual, usar los datos del comensal
      if (facturaIndividual) {
        cedula = comensal.cedula?.trim() || '9999999999';
        nombre = comensal.nombre?.trim() || 'CONSUMIDOR FINAL';
        email = comensal.email || null;
      }
      
      let clienteId = await guardarCliente(cedula, nombre, email);
      
      // Registrar pago en el backend
      await fetchWithAuth(`/api/ordenes/${selectedOrder.id}/pay-items`, {
        method: 'POST',
        body: JSON.stringify({
          item_ids: comensal.items,
          amount_paid: totalComensal,
          payment_method: comensal.metodoPago,
          cliente_id: clienteId,
          reference_number: comensal.metodoPago !== 'cash' ? (comensal.referencia || null) : null,
          notes: `${orderNotes} - Comensal: ${nombre}`
        }),
      });
      
      // Actualizar total pagado acumulado
      const nuevoTotalPagado = totalPagadoAcumulado + totalComensal;
      setTotalPagadoAcumulado(nuevoTotalPagado);
      
      // Si es factura individual, emitir factura AHORA
      if (facturaIndividual) {
        const partialOrder = {
          ...selectedOrder,
          items: selectedOrder.items.filter(i => comensal.items.includes(i.id))
        };
        await emitirFactura(partialOrder, cedula, nombre, 'split');
        await imprimirTicket(partialOrder, totalComensal, comensal.montoRecibido - totalComensal, null, 'split', nombre);
        setSuccess(`Factura generada para ${nombre}`);
      } else {
        // Guardar en historial para factura única al final
        setPagosRegistrados(prev => [...prev, {
          items: comensal.items,
          total: totalComensal,
          metodoPago: comensal.metodoPago
        }]);
        setSuccess(`Pago registrado para comensal`);
      }
      
      // ELIMINAR este comensal de la lista (ya pagó)
      setClientesDivididos(clientesDivididos.filter(c => c.id !== comensal.id));
      
      // RECARGAR la orden para actualizar productos pagados
      const ordenActualizada = await recargarOrden();
      
      if (ordenActualizada) {
        const productosPendientes = ordenActualizada.items.filter(i => !i.paid);
        
        // Si no quedan productos pendientes O el total pagado es igual al total de la orden
        if (productosPendientes.length === 0 || nuevoTotalPagado >= totalOrden) {
          // Si NO es factura individual y hay pagos registrados, generar UNA SOLA factura
          if (!facturaIndividual && pagosRegistrados.length > 0) {
            const todosLosItems = pagosRegistrados.flatMap(p => p.items);
            const ordenCompleta = { ...selectedOrder, items: todosLosItems };
            const clientePrincipal = { cedula: clienteCedula || '9999999999', nombre: clienteNombre || 'CONSUMIDOR FINAL' };
            await emitirFactura(ordenCompleta, clientePrincipal.cedula, clientePrincipal.nombre, 'split');
            await imprimirTicket(ordenCompleta, totalOrden, 0, null, 'split', 'FACTURA FINAL');
            setSuccess('Factura final generada con todos los productos');
          }
          
          // Cerrar la orden
          await fetchWithAuth(`/api/ordenes/${selectedOrder.id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({
              status: 'paid',
              payment_method: 'split',
              amount_paid: totalOrden,
              notes: orderNotes
            }),
          });
          setOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
          setSelectedOrder(null);
          setClientesDivididos([]);
          setPagosRegistrados([]);
          setTotalPagadoAcumulado(0);
          setSuccess('Orden completada y factura generada');
        } else {
          // Crear un nuevo comensal por defecto para el siguiente
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
          setSuccess(`Pago completado. Quedan ${productosPendientes.length} productos por pagar.`);
        }
      }
      
    } catch (err) {
      console.error('Error al cobrar comensal:', err);
      setError(err.message);
    } finally {
      setPrintLoading(false);
    }
  };

  // ── FACTURA ELECTRÓNICA ─────────────────────────────────────────────────
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
      return {
        description: item.product_name || item.name || 'Producto',
        qty: qty,
        unit_price: precioSinIVA,
        subtotal: qty * precioSinIVA,
        tax_amount: qty * montoIVA
      };
    });

    const subtotalTotal = itemsPayload.reduce((sum, i) => sum + i.subtotal, 0);
    const ivaTotal = itemsPayload.reduce((sum, i) => sum + i.tax_amount, 0);

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
          total: subtotalTotal + ivaTotal,
          forma_pago: FORMA_PAGO_MAP[method] || '01',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        console.log('Factura emitida:', data.invoice_number);
        return data.invoice_number || null;
      }
      return null;
    } catch (e) {
      console.error('Error al emitir factura:', e);
      return null;
    }
  }

  // ── IMPRESIÓN ──────────────────────────────────────────────────────────
  const imprimirTicket = async (order, paid, cambio, invoiceNumber = null, splitMode = null, customerName = null) => {
    try {
      const printerConfig = await getPrinterConfig('printer_main');
      const itemsToPrint = (order.items || []).map(item => {
        const precioSinIVA = Number(item.selling_price) || Number(item.unit_price) || 0;
        const montoIVA = Number(item.tax_rate) || 0;
        return {
          description: item.product_name || item.name || 'Producto',
          quantity: item.quantity,
          price: precioSinIVA,
          total: precioSinIVA * item.quantity,
          tax_amount: montoIVA * item.quantity
        };
      });
      const printSubtotal = itemsToPrint.reduce((sum, i) => sum + i.total, 0);
      const printTax = itemsToPrint.reduce((sum, i) => sum + i.tax_amount, 0);
      const result = await print('printer_main', 'invoice', {
        bizInfo,
        invoice: { number: invoiceNumber || order.order_number || order.id, date: new Date().toISOString() },
        customer: { name: customerName || clienteNombre || 'CONSUMIDOR FINAL', id: clienteCedula || '9999999999' },
        items: itemsToPrint,
        subtotal: printSubtotal,
        tax: printTax,
        taxRate: 0,
        total: printSubtotal + printTax,
        payment: { cash: paid, card: 0, other: 0 },
        printerFooter: printerConfig.footer,
      }, true);
      if (result.success) setSuccess(result.message);
      else setError(result.error);
    } catch (err) {
      console.error('Error imprimiendo:', err);
      setError('Error al imprimir');
    }
  };

  // ── PAGO NORMAL ──────────────────────────────────────────────────────────
  const pagoNormal = async () => {
    setPrintLoading(true);
    try {
      let cedula = clienteCedula?.trim() || '9999999999';
      let nombre = clienteNombre?.trim() || 'CONSUMIDOR FINAL';
      let clienteId = await guardarCliente(cedula, nombre, clienteEmail?.trim() || null);
      
      if (metodoPagoNormal === 'cash') {
        const paid = parseFloat(amountPaid) || 0;
        if (paid < totalOrden) {
          setError(`Monto insuficiente. Total: ${fmt(totalOrden)}`);
          setPrintLoading(false);
          return;
        }
        await fetchWithAuth(`/api/ordenes/${selectedOrder.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'paid',
            payment_method: 'cash',
            amount_paid: totalOrden,
            customer_id: clienteId,
            customer_name: nombre,
            customer_document_number: cedula,
            notes: orderNotes
          }),
        });
        const invoiceNum = await emitirFactura(selectedOrder, cedula, nombre, 'cash');
        await imprimirTicket(selectedOrder, totalOrden, paid - totalOrden, invoiceNum);
      } else if (metodoPagoNormal === 'card') {
        if (!refCard) {
          setError('Ingrese la referencia de la tarjeta');
          setPrintLoading(false);
          return;
        }
        await fetchWithAuth(`/api/ordenes/${selectedOrder.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'paid',
            payment_method: 'card',
            amount_paid: totalOrden,
            reference_number: refCard,
            customer_id: clienteId,
            customer_name: nombre,
            customer_document_number: cedula,
            notes: orderNotes
          }),
        });
        const invoiceNum = await emitirFactura(selectedOrder, cedula, nombre, 'card');
        await imprimirTicket(selectedOrder, totalOrden, 0, invoiceNum);
      } else if (metodoPagoNormal === 'transfer') {
        if (!refTransfer) {
          setError('Ingrese la referencia de la transferencia');
          setPrintLoading(false);
          return;
        }
        await fetchWithAuth(`/api/ordenes/${selectedOrder.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'paid',
            payment_method: 'transfer',
            amount_paid: totalOrden,
            reference_number: refTransfer,
            customer_id: clienteId,
            customer_name: nombre,
            customer_document_number: cedula,
            notes: orderNotes
          }),
        });
        const invoiceNum = await emitirFactura(selectedOrder, cedula, nombre, 'transfer');
        await imprimirTicket(selectedOrder, totalOrden, 0, invoiceNum);
      } else if (metodoPagoNormal === 'mixto') {
        const cashAmt = parseFloat(amountPaid) || 0;
        const cardAmt = parseFloat(cardPaid) || 0;
        const transferAmt = parseFloat(transferPaid) || 0;
        const cashNeeded = Math.max(0, totalOrden - cardAmt - transferAmt);
        if (cashAmt < cashNeeded) {
          setError(`Falta ${fmt(cashNeeded - cashAmt)} en efectivo`);
          setPrintLoading(false);
          return;
        }
        const mixtoPayments = [];
        if (cashNeeded > 0) mixtoPayments.push({ method: 'cash', amount: cashNeeded });
        if (cardAmt > 0) mixtoPayments.push({ method: 'card', amount: cardAmt, reference_number: refCard });
        if (transferAmt > 0) mixtoPayments.push({ method: 'transfer', amount: transferAmt, reference_number: refTransfer });
        await fetchWithAuth(`/api/ordenes/${selectedOrder.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'paid',
            payment_method: 'mixto',
            amount_paid: totalOrden,
            payments: mixtoPayments,
            customer_id: clienteId,
            customer_name: nombre,
            customer_document_number: cedula,
            notes: orderNotes
          }),
        });
        const invoiceNum = await emitirFactura(selectedOrder, cedula, nombre, 'mixto');
        await imprimirTicket(selectedOrder, totalOrden, cashAmt - cashNeeded, invoiceNum);
      }
      setOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
      await resetForm();
      setSuccess('Pago completado');
    } catch (err) {
      setError(err.message);
    } finally {
      setPrintLoading(false);
    }
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <PageTemplate title="Cobrar Orden" subtitle="Cobrar órdenes abiertas, imprimir recibo y abrir caja" backButton>
      <div className="checkout-modern-main">
        <div className="checkout-modern-card">
          {/* Selección de orden y cliente */}
          <div className="cmbx-row">
            <label className="label">Orden:</label>
            <select value={selectedOrder?.id || ''} onChange={e => handleSelectOrder(e.target.value)} className="combobox">
              <option value="">Seleccionar No. Orden</option>
              {orders.map(order => (
                <option key={order.id} value={order.id}>
                  {order.mesa_numero ? `Mesa ${order.mesa_numero}` : order.order_type === 'delivery' ? 'DELIVERY' : 'PARA LLEVAR'} - #{order.order_number || order.id}
                  {order.items?.filter(i => !i.paid).length > 0 && ` (${order.items.filter(i => !i.paid).length} pendientes)`}
                </option>
              ))}
            </select>

            {/* Campos de cliente - SOLO visibles en modo normal o cuando NO hay factura individual */}
            {(!modoDividido || (modoDividido && !facturaIndividual)) && (
              <>
                <label className="label">Cliente:</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    <input 
                      type="text" 
                      placeholder="Cédula/RUC" 
                      value={clienteCedula}
                      onChange={e => setClienteCedula(e.target.value.replace(/\D/g, '').slice(0, 13))}
                      onBlur={e => onClienteCedulaBlurOrEnter(e, false, null)}
                      onKeyPress={e => onClienteCedulaBlurOrEnter(e, false, null)}
                      disabled={!selectedOrder}
                      style={{ width: 130, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
                    />
                    {clientApiLoading && <div className="spinner-small"></div>}
                  </div>
                  <input 
                    type="text" 
                    placeholder="Nombre cliente" 
                    value={clienteNombre}
                    onChange={e => setClienteNombre(e.target.value)} 
                    disabled={!selectedOrder}
                    style={{ width: 220, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
                  />
                  <input 
                    type="email" 
                    placeholder="Email (factura)" 
                    value={clienteEmail}
                    onChange={e => setClienteEmail(e.target.value)} 
                    disabled={!selectedOrder}
                    style={{ width: 200, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
                  />
                </div>
              </>
            )}
            <OpenDrawerButton />
          </div>

          {error && <div className="error-msg">{error}</div>}
          {success && <div className="success-msg">{success}</div>}
          {printerError && <div className="error-msg">⚠️ {printerError}</div>}

          {selectedOrder && (
            <>
              {/* Botones de modo */}
              <div className="pay-methods">
                <button className={!modoDividido ? "pay-btn selected" : "pay-btn"} onClick={() => {
                  setModoDividido(false);
                  setClientesDivididos([]);
                  setSelectedItems([]);
                }}>
                  <DollarSign size={15} /> Normal
                </button>
                <button className={modoDividido ? "pay-btn selected" : "pay-btn"} onClick={() => {
                  setModoDividido(true);
                  setFacturaIndividual(false);
                  if (clientesDivididos.length === 0) {
                    setClientesDivididos([{
                      id: Date.now(), cedula: '', nombre: '', email: '', items: [],
                      metodoPago: 'cash', montoRecibido: 0, referencia: ''
                    }]);
                  }
                }}>
                  <Users size={15} /> Dividir Cuenta
                </button>
              </div>

              {/* Checkbox para factura individual - SOLO visible en modo dividido */}
              {modoDividido && (
                <div className="factura-opcion">
                  <label>
                    <input 
                      type="checkbox" 
                      checked={facturaIndividual} 
                      onChange={e => {
                        setFacturaIndividual(e.target.checked);
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
                      }} 
                    />
                    <span>📄 Factura INDIVIDUAL por cada comensal</span>
                  </label>
                  <small>
                    {facturaIndividual 
                      ? 'Cada comensal recibe su factura con sus datos' 
                      : 'Una sola factura al final con los datos del cliente principal'}
                  </small>
                </div>
              )}

              {/* Detalle del Pedido */}
              <div className="order-details">
                <div className="order-head">
                  <b>{selectedOrder.mesa_numero ? `Mesa ${selectedOrder.mesa_numero}` : selectedOrder.order_type} #{selectedOrder.order_number || selectedOrder.id}</b>
                  {modoDividido && selectedItems.length > 0 && (
                    <span className="badge">{selectedItems.length} producto(s) seleccionado(s)</span>
                  )}
                </div>

                {/* ==================== MODO NORMAL ==================== */}
                {!modoDividido && (
                  <>
                    <div className="order-items">
                      {selectedOrder.items.filter(item => !item.paid).map((item, idx) => (
                        <div key={idx} className="item-line">
                          <span>{item.quantity}x {item.product_name}</span>
                          <span className="item-amt">{fmt((Number(item.selling_price) || Number(item.unit_price)) * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="totals-footer">
                      <div className="sub-iva-total"><span>SUBTOTAL:</span><span>{fmt(subtotalOrden)}</span></div>
                      <div className="sub-iva-total"><span>IVA:</span><span>{fmt(ivaOrden)}</span></div>
                      <div className="sub-iva-total"><span><strong>TOTAL:</strong></span><span><strong>{fmt(totalOrden)}</strong></span></div>
                    </div>

                    {/* Selector de método de pago */}
                    <div className="metodo-pago-seleccion">
                      <button className={metodoPagoNormal === 'cash' ? "selected" : ""} onClick={() => setMetodoPagoNormal('cash')}>💰 Efectivo</button>
                      <button className={metodoPagoNormal === 'card' ? "selected" : ""} onClick={() => setMetodoPagoNormal('card')}>💳 Tarjeta</button>
                      <button className={metodoPagoNormal === 'transfer' ? "selected" : ""} onClick={() => setMetodoPagoNormal('transfer')}>🏦 Transferencia</button>
                      <button className={metodoPagoNormal === 'mixto' ? "selected" : ""} onClick={() => setMetodoPagoNormal('mixto')}>🔄 Mixto</button>
                    </div>

                    {/* Campos según método */}
                    {metodoPagoNormal === 'cash' && (
                      <div className="pay-input-row">
                        <div><label>Recibido:</label>
                          <input type="text" inputMode="numeric" value={amountPaidRaw} onChange={e => { let digits = e.target.value.replace(/\D/g, ''); if (!digits) digits = '0'; setAmountPaidRaw(digits); setAmountPaid((parseInt(digits, 10) / 100).toFixed(2)); }} />
                        </div>
                        <div><label>Cambio:</label><span>{fmt(changeNormal)}</span></div>
                      </div>
                    )}

                    {(metodoPagoNormal === 'card' || metodoPagoNormal === 'transfer') && (
                      <div className="pay-row"><label>Referencia:</label>
                        <input type="text" value={metodoPagoNormal === 'card' ? refCard : refTransfer} onChange={e => metodoPagoNormal === 'card' ? setRefCard(e.target.value) : setRefTransfer(e.target.value)} />
                      </div>
                    )}

                    {metodoPagoNormal === 'mixto' && (
                      <div className="pay-input-row">
                        <div><label>Efectivo:</label><input type="text" inputMode="numeric" value={amountPaidRaw} onChange={e => { let digits = e.target.value.replace(/\D/g, ''); handleMixtoField('cash', digits); }} /></div>
                        <div><label>Transferencia:</label><input type="text" inputMode="numeric" value={transferPaidRaw} onChange={e => { let digits = e.target.value.replace(/\D/g, ''); handleMixtoField('transfer', digits); }} /></div>
                        <div><label>Tarjeta:</label><input type="text" inputMode="numeric" value={cardPaidRaw} onChange={e => { let digits = e.target.value.replace(/\D/g, ''); handleMixtoField('card', digits); }} /></div>
                      </div>
                    )}
                  </>
                )}

                {/* ==================== MODO DIVIDIDO ==================== */}
                {modoDividido && (
                  <>
                    {/* Productos disponibles para asignar - solo los NO pagados */}
                    <div className="order-items">
                      <div className="section-title">📦 Productos pendientes:</div>
                      {selectedOrder.items.filter(item => !item.paid).map((item, idx) => (
                        <div key={idx} className="item-line" style={{ 
                          background: selectedItems.includes(item.id) ? '#f3f0ff' : 'transparent',
                          opacity: item.paid ? 0.5 : 1
                        }}>
                          <input 
                            type="checkbox" 
                            checked={selectedItems.includes(item.id)} 
                            onChange={() => handleSelectItem(item.id)}
                            disabled={item.paid}
                          />
                          <span>{item.quantity}x {item.product_name}</span>
                          <span className="item-amt">{fmt((Number(item.selling_price) || Number(item.unit_price)) * item.quantity)}</span>
                          {item.paid && <span className="paid-badge">✔ PAGADO</span>}
                        </div>
                      ))}
                      {selectedOrder.items.filter(item => !item.paid).length === 0 && (
                        <div className="empty-state">✓ Todos los productos han sido pagados</div>
                      )}
                    </div>

                    {selectedItems.length > 0 && (
                      <div className="totals-footer small">
                        <div>Seleccionado: {fmt(getSplitSubtotal() + getSplitTax())}</div>
                      </div>
                    )}

                    {/* Lista de comensales */}
                    <div className="clientes-container">
                      <div className="clientes-header">
                        <span>👥 Comensales</span>
                        <button onClick={agregarComensal} className="btn-add">+ Agregar Comensal</button>
                      </div>

                      {clientesDivididos.map((comensal, idx) => {
                        const subtotalC = calcularSubtotalComensal(comensal);
                        const ivaC = calcularIVAComensal(comensal);
                        const totalC = subtotalC + ivaC;
                        const cambio = comensal.montoRecibido - totalC;

                        return (
                          <div key={comensal.id} className="comensal-card">
                            <div className="comensal-header">
                              <span className="comensal-titulo">🍽️ Comensal {idx + 1}</span>
                              {clientesDivididos.length > 1 && (
                                <button onClick={() => eliminarComensal(comensal.id)} className="btn-delete">Eliminar</button>
                              )}
                            </div>

                            {/* Datos del comensal - SOLO visibles si es factura individual */}
                            {facturaIndividual ? (
                              <div className="comensal-datos">
                                <div className="busqueda-container">
                                  <input 
                                    type="text" 
                                    placeholder="Cédula/RUC" 
                                    value={comensal.cedula}
                                    onChange={e => actualizarComensal(comensal.id, 'cedula', e.target.value.replace(/\D/g, '').slice(0, 13))}
                                    onBlur={e => onClienteCedulaBlurOrEnter(e, true, comensal.id)}
                                    onKeyPress={e => onClienteCedulaBlurOrEnter(e, true, comensal.id)}
                                  />
                                  {clientApiLoading && <div className="spinner-small"></div>}
                                </div>
                                <input 
                                  type="text" 
                                  placeholder="Nombre completo" 
                                  value={comensal.nombre}
                                  onChange={e => actualizarComensal(comensal.id, 'nombre', e.target.value)} 
                                />
                                <input 
                                  type="email" 
                                  placeholder="Email (factura)" 
                                  value={comensal.email}
                                  onChange={e => actualizarComensal(comensal.id, 'email', e.target.value)} 
                                />
                              </div>
                            ) : (
                              <div className="comensal-sin-datos">
                                <span className="comensal-numero">Comensal {idx + 1}</span>
                              </div>
                            )}

                            {/* Productos asignados al comensal */}
                            <div className="productos-asignados">
                              <span>Productos asignados:</span>
                              {comensal.items.map(itemId => {
                                const item = selectedOrder.items.find(i => i.id === itemId);
                                return item ? (
                                  <div key={itemId} className="producto-item">
                                    <span>{item.quantity}x {item.product_name}</span>
                                    <div>
                                      <span>{fmt((Number(item.selling_price) || Number(item.unit_price)) * item.quantity)}</span>
                                      <button onClick={() => quitarItemDeComensal(comensal.id, itemId)} className="btn-quitar">Quitar</button>
                                    </div>
                                  </div>
                                ) : null;
                              })}
                              {comensal.items.length === 0 && <span className="empty-text">Sin productos</span>}
                            </div>

                            {/* Método de pago del comensal */}
                            <div className="metodo-pago-comensal">
                              <select value={comensal.metodoPago} onChange={e => actualizarComensal(comensal.id, 'metodoPago', e.target.value)}>
                                <option value="cash">💰 Efectivo</option>
                                <option value="card">💳 Tarjeta</option>
                                <option value="transfer">🏦 Transferencia</option>
                              </select>
                              <span>Recibido:</span>
                              <input type="number" step="0.01" placeholder="0.00" value={comensal.montoRecibido || ''}
                                onChange={e => actualizarComensal(comensal.id, 'montoRecibido', parseFloat(e.target.value) || 0)} />
                              {comensal.metodoPago !== 'cash' && (
                                <>
                                  <span>Ref:</span>
                                  <input type="text" placeholder="N° referencia" value={comensal.referencia || ''}
                                    onChange={e => actualizarComensal(comensal.id, 'referencia', e.target.value)} />
                                </>
                              )}
                            </div>

                            {/* Totales y botón cobrar */}
                            <div className="comensal-totales">
                              <div>
                                <div>Subtotal: <strong>{fmt(subtotalC)}</strong></div>
                                <div>IVA: <strong>{fmt(ivaC)}</strong></div>
                              </div>
                              <div>
                                <div className="total-valor">Total: {fmt(totalC)}</div>
                                {comensal.montoRecibido > 0 && (
                                  <div className={cambio >= 0 ? "cambio-success" : "cambio-error"}>
                                    {cambio >= 0 ? `💰 Cambio: ${fmt(cambio)}` : `⚠️ Falta: ${fmt(Math.abs(cambio))}`}
                                  </div>
                                )}
                                <button className="btn-cobrar" onClick={() => cobrarComensal(comensal)} disabled={comensal.montoRecibido < totalC || comensal.items.length === 0}>
                                  💵 Cobrar a este comensal
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Asignar productos seleccionados */}
                      {selectedItems.length > 0 && clientesDivididos.length > 0 && (
                        <div className="asignar-container">
                          <select className="asignar-select" id="comensalSelect">
                            {clientesDivididos.map((c, idx) => (
                              <option key={c.id} value={c.id}>Comensal {idx + 1}</option>
                            ))}
                          </select>
                          <button className="btn-asignar" onClick={() => {
                            const select = document.getElementById('comensalSelect');
                            const comensalId = parseInt(select.value);
                            asignarItemsAComensal(comensalId);
                          }}>📦 Asignar {selectedItems.length} producto(s)</button>
                        </div>
                      )}

                      {selectedItems.length > 0 && <div className="warning-box">⚠️ {selectedItems.length} producto(s) sin asignar</div>}
                    </div>
                  </>
                )}
              </div>

              {/* Botones principales */}
              <div className="actions-row">
                <button
                  className="btn-guardar"
                  disabled={printLoading || (!modoDividido && metodoPagoNormal === 'cash' && (!amountPaid || parseFloat(amountPaid) < totalOrden))}
                  onClick={() => {
                    if (!modoDividido) pagoNormal();
                  }}
                >
                  <Check size={16} /> {printLoading ? 'Procesando...' : modoDividido ? 'CONTINUAR' : 'COBRAR'}
                </button>
                <button className="btn-cancelar" onClick={() => {
                  setSelectedOrder(null);
                  setClientesDivididos([]);
                  setSelectedItems([]);
                  setPagosRegistrados([]);
                  setTotalPagadoAcumulado(0);
                  setModoDividido(false);
                }}>
                  <X size={16} /> Cancelar
                </button>
              </div>

              {/* Historial de pagos (solo cuando NO es factura individual) */}
              {modoDividido && !facturaIndividual && pagosRegistrados.length > 0 && (
                <div className="historial-pagos">
                  <div className="historial-titulo">📋 Pagos realizados:</div>
                  {pagosRegistrados.map((pago, idx) => (
                    <div key={idx} className="historial-item">• Pago {idx + 1} - {fmt(pago.total)} ({pago.items.length} productos)</div>
                  ))}
                  <div className="historial-total">Total pagado: {fmt(pagosRegistrados.reduce((s, p) => s + p.total, 0))} / Total orden: {fmt(totalOrden)}</div>
                  {totalPagadoAcumulado >= totalOrden && (
                    <div className="historial-completado">✅ ¡Pago completado! La factura se generará automáticamente.</div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .busqueda-container { display: flex; gap: 5px; align-items: center; flex: 1; }
        .spinner-small { width: 18px; height: 18px; border: 2px solid #ddd; border-top-color: #6842fe; border-radius: 50%; animation: spin 0.6s linear infinite; }
        .comensal-card { background: #f9f9ff; border: 1px solid #ddd; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
        .comensal-header { display: flex; justify-content: space-between; margin-bottom: 12px; }
        .comensal-titulo { font-weight: bold; }
        .comensal-sin-datos { margin-bottom: 12px; padding: 8px; background: #f0f0f0; border-radius: 6px; text-align: center; }
        .comensal-numero { font-weight: 600; color: #333; }
        .btn-delete { background: #ff4444; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; }
        .comensal-datos { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
        .comensal-datos input { flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
        .productos-asignados { margin-bottom: 12px; }
        .producto-item { display: flex; justify-content: space-between; background: #e8e8ff; padding: 6px 10px; border-radius: 4px; margin-bottom: 4px; }
        .btn-quitar { background: #ff6666; color: white; border: none; border-radius: 4px; padding: 2px 8px; margin-left: 8px; cursor: pointer; }
        .metodo-pago-comensal { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; background: #f0f0f0; padding: 8px; border-radius: 6px; margin-bottom: 12px; }
        .metodo-pago-comensal select, .metodo-pago-comensal input { padding: 6px; border-radius: 4px; border: 1px solid #ccc; }
        .comensal-totales { display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #ccc; padding-top: 8px; }
        .total-valor { font-size: 18px; font-weight: bold; color: #6842fe; }
        .cambio-success { color: #16a34a; font-size: 12px; }
        .cambio-error { color: #e11d48; font-size: 12px; }
        .btn-cobrar { background: #28a745; color: white; border: none; border-radius: 6px; padding: 6px 12px; margin-top: 8px; cursor: pointer; width: 100%; }
        .btn-cobrar:disabled { background: #ccc; cursor: not-allowed; }
        .asignar-container { display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; }
        .asignar-select { padding: 8px; border-radius: 6px; border: 1px solid #ccc; }
        .btn-asignar { background: #007bff; color: white; border: none; border-radius: 6px; padding: 8px 16px; cursor: pointer; }
        .warning-box { background: #fff3cd; padding: 12px; border-radius: 6px; text-align: center; color: #856404; margin-top: 12px; }
        .historial-pagos { background: #e8f5e9; padding: 12px; border-radius: 8px; margin-top: 16px; }
        .historial-completado { background: #28a745; color: white; padding: 8px; border-radius: 6px; text-align: center; margin-top: 8px; font-size: 12px; }
        .factura-opcion { background: #f0f0ff; padding: 12px; border-radius: 8px; margin: 12px 0; }
        .factura-opcion label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 600; }
        .factura-opcion small { margin-left: 26px; display: block; font-size: 12px; color: #666; margin-top: 4px; }
        .metodo-pago-seleccion { display: flex; gap: 8px; margin: 12px 0; flex-wrap: wrap; }
        .metodo-pago-seleccion button { flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 6px; background: white; cursor: pointer; }
        .metodo-pago-seleccion button.selected { background: #6842fe; color: white; border-color: #6842fe; }
        .empty-state { text-align: center; padding: 20px; color: #16a34a; }
        .empty-text { color: #999; font-size: 12px; }
        .error-msg { color: #e11d48; font-size: 12px; margin-top: 6px; }
        .success-msg { color: #16a34a; font-size: 12px; margin-top: 6px; }
        .pay-input-row { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; margin: 12px 0; }
        .pay-row { margin: 12px 0; }
        .badge { background: #6842fe; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: 8px; }
        .section-title { font-weight: bold; margin-bottom: 8px; font-size: 14px; color: #333; }
        .totals-footer.small { margin-top: 8px; padding-top: 4px; font-size: 13px; }
        .clientes-container { margin-top: 20px; border-top: 2px solid #e0e0e0; padding-top: 16px; }
        .clientes-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .btn-add { background: #6842fe; color: white; border: none; border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 12px; }
        .paid-badge { background: #28a745; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 8px; }
      `}</style>
    </PageTemplate>
  );
}