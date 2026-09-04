// src/pages/cashier/PosCheckoutPage.jsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { useConfirm, useAlert } from '../../context/ConfirmContext';
import { useSession } from '../../context/SessionContext';
import { fetchWithAuth } from '../../config/api';
import { useQzTray } from '../../components/useQzTray';
import { usePrinterService } from '../../services/usePrinterService';

import { BsCashCoin } from "react-icons/bs";
import { CiCreditCard1 } from "react-icons/ci";
import { SlScreenSmartphone } from "react-icons/sl";

import { IconTextButton, ButtonGroup } from '../../components/General/Button';

// Componentes
import OrderHeader from '../../components/POS/OrderHeader';
import CustomerFields from '../../components/POS/CustomerFields';
import PaymentMethods from '../../components/POS/PaymentMethods';
import DiscountSection from '../../components/POS/DiscountSection';
import OrderDetails from '../../components/POS/OrderDetails';

import PrintModal from '../../components/POS/PrintModal';
import CashPayment from '../../components/POS/PaymentForm/CashPayment';
import CardPayment from '../../components/POS/PaymentForm/CardPayment';
import TransferPayment from '../../components/POS/PaymentForm/TransferPayment';
import MixedPayment from '../../components/POS/PaymentForm/MixedPayment';
import CreditNotePayment from '../../components/POS/PaymentForm/CreditNotePayment';
import CreditPayment from '../../components/POS/CreditPayment';
import SplitCustomerCard from '../../components/POS/SplitPayment/SplitCustomerCard';
import SplitPaymentList from '../../components/POS/SplitPayment/SplitPaymentList';

// Hooks
import { useCheckout } from '../../hooks/useCheckout';
import { useDiscounts } from '../../hooks/useDiscounts';

export default function PosCheckoutPage() {
  const { user } = useSession();
  const { showConfirm } = useConfirm();
  const alert = useAlert();
  const { printerError } = useQzTray();
  const { print, openCashDrawer } = usePrinterService();

  // ─── Toast ─────────────────────────────────────────────────────
  const [toast, setToast] = useState({ message: '', type: '', visible: false });
  const toastTimerRef = useRef(null);

  const showToast = (message, type = 'success', duration = 4000) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type, visible: true });
    toastTimerRef.current = setTimeout(() => {
      setToast({ message: '', type: '', visible: false });
    }, duration);
  };

  const hideToast = () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message: '', type: '', visible: false });
  };

  // ─── Hooks ──────────────────────────────────────────────────────
  const checkout = useCheckout();
  const discounts = useDiscounts(
    checkout.selectedOrder,
    checkout.getSubtotalSinIVA,
    checkout.getIvaTotal,
    checkout.getOrderTotal,
    checkout.ivaRateGlobal,
    checkout.fmt
  );

  const {
    orders,
    setOrders,
    selectedOrder, setSelectedOrder,
    modoDividido, setModoDividido,
    modoPorCobrar, setModoPorCobrar,
    foundCliente, setFoundCliente,
    clienteCedula, setClienteCedula,
    clienteNombre, setClienteNombre,
    clienteEmail, setClienteEmail,
    orderNotes, setOrderNotes,
    printLoading, setPrintLoading,
    showPrintModal, setShowPrintModal,
    printResolveRef,
    clientApiLoading, setClientApiLoading,
    selectedItems, setSelectedItems,
    currencySymbol,
    amountPaidRaw, setAmountPaidRaw,
    amountPaid, setAmountPaid,
    cardPaidRaw, setCardPaidRaw,
    cardPaid, setCardPaid,
    transferPaidRaw, setTransferPaidRaw,
    transferPaid, setTransferPaid,
    refCard, setRefCard,
    refTransfer, setRefTransfer,
    mixtoManual, setMixtoManual,
    mixtoActive, setMixtoActive,
    facturaIndividual, setFacturaIndividual,
    clientesDivididos, setClientesDivididos,
    pagosRegistrados, setPagosRegistrados,
    metodoPagoNormal, setMetodoPagoNormal,
    totalPagadoAcumulado, setTotalPagadoAcumulado,
    creditNotesAvailable, setCreditNotesAvailable,
    appliedCreditNote, setAppliedCreditNote,
    creditNoteApplyAmt, setCreditNoteApplyAmt,
    cnLoading, setCnLoading,
    cnMetodoRestante, setCnMetodoRestante,
    cnCashPaid, setCnCashPaid,
    cnCashPaidRaw, setCnCashPaidRaw,
    cnCardRef, setCnCardRef,
    cnTransferRef, setCnTransferRef,
    fmt,
    getSubtotalSinIVA,
    getIvaTotal,
    getOrderTotal,
    loadOrders,
    resetForm,
    error, setError,
    success, setSuccess,
    ivaRateGlobal,
    draftOrder, 
    setDraftOrder,
  } = checkout;

  const {
    availableDiscounts,
    appliedDiscount, setAppliedDiscount,
    discountAmount, setDiscountAmount,
    totalOrdenConDescuento, setTotalOrdenConDescuento,
    subtotalConDescuento,      // ← NUEVO
    ivaConDescuento,           // ← NUEVO
    couponSlots, setCouponSlots,
    couponPendingSelect, setCouponPendingSelect,
    pendingCoupon, setPendingCoupon,
    pendingSlotIdx, setPendingSlotIdx,
    couponSelectedItemIds, setCouponSelectedItemIds,
    couponDiscountAmount, setCouponDiscountAmount,
    couponVersion, setCouponVersion,
    descuentosExpanded, setDescuentosExpanded,
    appliedCouponsRef,
    manualDiscountRef,
    aplicarCupon,
    quitarCupon,
    confirmarCuponCategoria,
    isDiscountApplicable,
    calculateDiscountAmountForOrder,
    recalcularTotalConDescuento,
  } = discounts;

  // ─── Estados adicionales ──────────────────────────────────────
  const [processingCliente, setProcessingCliente] = useState(false);
  const [processingCxC, setProcessingCxC] = useState(false);
  const [bizInfo, setBizInfo] = useState(null);

  // ─── Definición local de recargarOrden ──────────────────────
  const recargarOrden = async () => {
    if (!selectedOrder) return null;
    try {
      const res = await fetchWithAuth(`/ordenes/${selectedOrder.id}`);
      const ordenActualizada = await res.json();
      setSelectedOrder(ordenActualizada);
      return ordenActualizada;
    } catch (err) {
      console.error('Error recargando orden:', err);
      return null;
    }
  };

  // ─── Funciones auxiliares ────────────────────────────────────

  const guardarCliente = async (documento, nombre, email = null) => {
    if (processingCliente) return null;
    const tipo_documento = documento.length === 13 ? 'ruc' : 'cedula';
    try {
      setProcessingCliente(true);
      const resBusqueda = await fetchWithAuth(`/customers/by-document?document_number=${documento}&document_type=${tipo_documento}`);
      if (resBusqueda.ok) {
        const existe = await resBusqueda.json();
        if (existe && existe.id) return existe.id;
      }
      const res = await fetchWithAuth('/customers', {
        method: 'POST',
        body: JSON.stringify({ nombre, cedula: documento, email, tipo_documento }),
      });
      if (res.ok) {
        const cliente = await res.json();
        return cliente.id;
      }
      return null;
    } catch (err) {
      return null;
    } finally {
      setProcessingCliente(false);
    }
  };

  // ─── Validación de cliente para montos ≥ 50 ──────────────────────
  const validarClienteParaMonto = (monto) => {
    if (monto < 50) return true; // No aplica

    const cedula = clienteCedula?.trim() || '';
    const nombre = clienteNombre?.trim() || '';

    if (cedula === '9999999999' || cedula === '9999999999999') {
      throw new Error('Para montos mayores o iguales a $50.00 debe ingresar un número de cédula o RUC válido (no consumidor final).');
    }
    if (cedula.length !== 10 && cedula.length !== 13) {
      throw new Error('Para montos mayores o iguales a $50.00 debe ingresar un número de cédula (10 dígitos) o RUC (13 dígitos) válido.');
    }
    if (!nombre || nombre === '' || nombre.toUpperCase() === 'CONSUMIDOR FINAL') {
      throw new Error('Para montos mayores o iguales a $50.00 debe ingresar el nombre completo del cliente.');
    }
    return true;
  };

  const awaitPrintDecision = () => new Promise(resolve => {
    printResolveRef.current = resolve;
    setShowPrintModal(true);
  });

  const FORMA_PAGO_MAP = { cash: '01', card: '19', transfer: '20', mixto: '01', split: '01', credit_note: '01' };

  // ─── Emitir factura (usa iva_amount guardado, sin recalcular) ─────
  async function emitirFactura(order, custCedula, custNombre, method, discountData = null, customerEmail = null) {
    const cedula = custCedula?.trim() || '9999999999';
    const isCF = cedula === '9999999999' || cedula === '9999999999999';
    const tipoId = isCF ? '07' : (cedula.length === 13 ? '04' : '05');
    const email = customerEmail || foundCliente?.email || clienteEmail.trim() || null;

    // Mapear items tomando los valores guardados
    const items = (order.items || [])
      .filter(item => !item.paid)
      .map(item => {
        const qty = Number(item.quantity) || 1;
        const unitPrice = Number(item.selling_price) || Number(item.unit_price) || 0;
        const itemSubtotal = unitPrice * qty;
        const ivaAmount = Number(item.iva_amount) || 0;
        const taxRate = Number(item.tax_rate) ?? 0;

        return {
          code: item.code || 'PROD',
          description: item.product_name || item.description || 'Producto',
          qty,
          unit_price: unitPrice,
          subtotal: itemSubtotal,
          iva_amount: ivaAmount,
          iva_rate_pct: taxRate,
          category_id: item.category_id || null,
          product_id: item.product_id || null,
        };
      });

    if (items.length === 0) {
      return {
        id: null,
        invoice_number: null,
        auth_number: null,
        auth_date: null,
        status: 'pending',
        pending: true,
      };
    }

    const orderSubtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const orderIVA = items.reduce((sum, item) => sum + item.iva_amount, 0);
    const orderTotal = orderSubtotal + orderIVA;

    // Descuentos
    let descuentoTotal = (discountAmount || 0) + (couponDiscountAmount || 0);

    const itemsConDescuento = items.map(item => {
      let itemSubtotalFinal = item.subtotal;
      let itemIVAFinal = item.iva_amount;

      if (descuentoTotal > 0 && orderSubtotal > 0) {
        const ratioItem = item.subtotal / orderSubtotal;
        const itemDescuento = descuentoTotal * ratioItem;
        itemSubtotalFinal = item.subtotal - itemDescuento;
        if (item.iva_rate_pct > 0 && itemSubtotalFinal > 0) {
          itemIVAFinal = Math.round(itemSubtotalFinal * (item.iva_rate_pct / 100) * 100) / 100;
        } else {
          itemIVAFinal = 0;
        }
      }

      return {
        code: item.code,
        description: item.description,
        qty: item.qty,
        unit_price: item.unit_price,
        subtotal: itemSubtotalFinal,
        iva_amount: itemIVAFinal,
        iva_rate_pct: item.iva_rate_pct,
      };
    });

    const nuevaBaseImponible = itemsConDescuento.reduce((sum, item) => sum + item.subtotal, 0);
    const nuevoIVA = itemsConDescuento.reduce((sum, item) => sum + item.iva_amount, 0);
    const totalFactura = nuevaBaseImponible + nuevoIVA;

    const payload = {
      order_id: order.id,
      customer: {
        name: isCF ? 'CONSUMIDOR FINAL' : (custNombre || ''),
        ruc: isCF ? '9999999999' : cedula,
        email: email || null,
        tipo_identificacion: tipoId,
        phone: null,
      },
      items: itemsConDescuento.map(item => ({
        code: item.code,
        description: item.description,
        qty: item.qty,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        iva_amount: item.iva_amount,
        iva_rate_pct: item.iva_rate_pct,
      })),
      subtotal: nuevaBaseImponible,
      iva_amount: nuevoIVA,
      total: totalFactura,
      forma_pago: FORMA_PAGO_MAP[method] || '01',
      descuento: descuentoTotal,
      iva_rate: ivaRateGlobal,
    };

    try {
      const response = await fetchWithAuth('/einvoicing/invoices/emit', {
        method: 'POST',
        body: JSON.stringify(payload),
        timeoutMs: 180000,
      });

      let result = null;
      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (!response.ok) {
        const errMsg = String(result?.error || result?.message || response.statusText || response.status || 'No se pudo emitir la factura');
        const esFirmaError = /firma|signature|p12|certificado|electr/i.test(errMsg);
        return {
          id: result?.id || null,
          invoice_number: result?.invoice_number || null,
          auth_number: result?.auth_number || null,
          auth_date: result?.auth_date || null,
          status: result?.status || 'pending',
          pending: true,
          error: errMsg,
        };
      }

      return {
        id: result?.id || null,
        invoice_number: result?.invoice_number || null,
        auth_number: result?.auth_number || null,
        auth_date: result?.auth_date || null,
        status: result?.status || 'pending',
        pending: result?.status !== 'autorizada',
      };

    } catch (e) {
      const esFirmaError = /firma|signature|p12|certificado|electr/i.test(e.message || '');
      return {
        id: null,
        invoice_number: null,
        auth_number: null,
        auth_date: null,
        status: 'pending',
        pending: true,
        error: e.message,
      };
    }
  }

  // ─── Imprimir ticket (usa totales de la orden) ──────────────
  const imprimirTicket = async (order, paid, cambio, invoiceData = null, splitMode = null, customerName = null, openDrawer = false, paymentMethod = null) => {
    try {
      const itemsToPrint = (order.items || []).map(item => ({
        description: item.product_name || 'Producto',
        quantity:    item.quantity,
        price:       Number(item.selling_price) || Number(item.unit_price) || 0,
        total:       (Number(item.selling_price) || Number(item.unit_price) || 0) * item.quantity,
      }));

      // Usar los totales guardados (que ya son la suma exacta de los items)
      const printSubtotal = Number(order.subtotal) || 0;
      const printIVA = Number(order.tax_amount) || 0;
      const printTotal = Number(order.total) || 0;

      const totalDescuentoImpresion = discountAmount + couponDiscountAmount;
      const discountsPrint = [];
      if (discountAmount > 0 && appliedDiscount) discountsPrint.push({ name: appliedDiscount.name, amount: discountAmount });
      appliedCouponsRef.current.forEach(c => discountsPrint.push({ name: `Cupón: ${c.discount.name}`, amount: c.amount }));

      const tieneFactura = !!invoiceData && !!invoiceData.invoice_number;
      const estadoFactura = String(invoiceData?.status || '').toLowerCase();
      const tieneAutorizacion = !!invoiceData?.auth_number || estadoFactura === 'autorizada' || estadoFactura === 'authorized' || estadoFactura === 'autorizado';
      const template = tieneFactura && tieneAutorizacion ? 'invoice' : 'ticket-simple';
      const esCash = paymentMethod === 'cash';
      const esMixto = paymentMethod === 'mixto';
      const recibidoCliente = esCash || esMixto ? paid + Math.max(0, cambio) : 0;

      const invoiceInfo = tieneFactura ? {
        number: invoiceData.invoice_number || 'N/A',
        auth_number: invoiceData.auth_number || null,
        auth_date: invoiceData.auth_date || null,
        date: new Date().toISOString()
      } : null;

      const printData = (tieneFactura && tieneAutorizacion)
        ? {
            bizInfo,
            invoice: invoiceInfo,
            customer: { name: customerName || clienteNombre || 'CONSUMIDOR FINAL', id: clienteCedula || '9999999999' },
            items: itemsToPrint,
            subtotal_15: printSubtotal,
            subtotal_0: 0,
            discount: totalDescuentoImpresion,
            discounts: discountsPrint,
            tax: printIVA,
            taxRate: ivaRateGlobal / 100,
            total: printTotal,
            payment: { cash: paid, card: 0, other: 0 },
            recibido: recibidoCliente,
            cambio: esCash || esMixto ? Math.max(0, cambio) : 0,
            metodoPago: paymentMethod,
          }
        : {
            bizInfo,
            orden: order.order_number || order.id,
            customer: { id: clienteCedula || '9999999999', name: customerName || clienteNombre || 'CONSUMIDOR FINAL' },
            items: itemsToPrint,
            subtotal: printSubtotal,
            discount: totalDescuentoImpresion,
            discounts: discountsPrint,
            tax: printIVA,
            taxRate: ivaRateGlobal / 100,
            total: printTotal,
            recibido: esCash || esMixto ? paid + Math.max(0, cambio) : 0,
            cambio: esCash || esMixto ? Math.max(0, cambio) : 0,
            metodoPago: paymentMethod,
          };

      await print('printer_main', template, printData, openDrawer);
    } catch (err) {
      showToast('Error al imprimir', 'error');
    }
  };

  // ─── Cuenta por cobrar ────────────────────────────────────────
  const guardarCuentaPorCobrar = async () => {
    if (processingCxC || !selectedOrder) return null;
    const clienteId   = foundCliente?.id   || null;
    const nombreCliente = foundCliente?.name || clienteNombre || 'CONSUMIDOR FINAL';
    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);

    // Obtener usuario de la sesión (igual que en apertura/cierre)
    const userId = user?.id || user?.userId || null;
    const userName = user?.firstName || user?.first_name || user?.nombre || user?.name || 'Usuario';
    const userEmail = user?.email || '';

    try {
      setProcessingCxC(true);
      const response = await fetchWithAuth('/accounting-receivable/receivables', {
        method: 'POST',
        body: JSON.stringify({
          order_number:  selectedOrder.order_number,
          customer_id:   clienteId,
          customer_name: nombreCliente,
          amount:        totalOrdenConDescuento,
          issue_date:    new Date().toISOString().split('T')[0],
          due_date:      fechaVencimiento.toISOString().split('T')[0],
          description:   `Venta pendiente - Orden #${selectedOrder.order_number}`,
          notes:         orderNotes || null,
          // Datos del usuario para auditoría (igual que apertura/cierre)
          user_id: userId,
          user_name: userName,
          user_email: userEmail
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al guardar cuenta por cobrar');
      return data.data;
    } catch (err) {
      showToast(`Error al guardar cuenta por cobrar: ${err.message}`, 'error');
      return null;
    } finally {
      setProcessingCxC(false);
    }
  };

  // ─── Cuenta por cobrar con endpoint específico ──────────────
  const handlePagoCredito = async () => {
    setPrintLoading(true);
    try {
      // Validar cliente REAL (no CONSUMIDOR FINAL)
      if (!clienteCedula || clienteCedula === '9999999999' || clienteCedula === '9999999999999') {
        throw new Error('Para cuenta por cobrar debe ingresar un cliente real (no CONSUMIDOR FINAL)');
      }

      const customerId = await guardarCliente(clienteCedula, clienteNombre, clienteEmail);

      // Obtener usuario de la sesión (igual que en apertura/cierre)
      const userId = user?.id || user?.userId || null;
      const userName = user?.firstName || user?.first_name || user?.nombre || user?.name || 'Usuario';
      const userEmail = user?.email || '';

      const payload = {
        order_id: selectedOrder.id,
        order_number: selectedOrder.order_number,
        customer_id: customerId,
        customer_name: clienteNombre || 'CLIENTE SIN NOMBRE',
        customer_document: clienteCedula,
        customer_email: clienteEmail || null,
        total_amount: totalOrdenConDescuento,
        paid_amount: 0,
        payment_method: null,
        reference_number: null,
        notes: orderNotes || `Crédito total - Orden #${selectedOrder.order_number}`,
        // Datos del usuario para auditoría (igual que apertura/cierre)
        user_id: userId,
        user_name: userName,
        user_email: userEmail
      };

      const response = await fetchWithAuth('/accounting-receivable/create-from-order', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al crear cuenta por cobrar');
      }

      // Actualizar estado de la orden
      await fetchWithAuth(`/ordenes/${selectedOrder.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'draft',
          payment_method: 'credit',
          notes: `${orderNotes || ''} - Cuenta por cobrar registrada (ID: ${result.data.id})`.trim()
        })
      });

      // Imprimir recibo
      try {
        const printData = {
          bizInfo,
          orden: selectedOrder.order_number,
          customer: {
            id: clienteCedula,
            name: clienteNombre,
          },
          items: (selectedOrder.items || []).map(item => ({
            description: item.product_name || 'Producto',
            quantity: item.quantity,
            price: Number(item.selling_price) || Number(item.unit_price) || 0,
            total: (Number(item.selling_price) || Number(item.unit_price) || 0) * item.quantity,
          })),
          subtotal: totalOrdenConDescuento,
          tax: 0,
          total: totalOrdenConDescuento,
          vencimiento: result.data.due_date,
          printerFooter: '¡Gracias por su preferencia!',
        };
        await print('printer_main', 'credit-receivable', printData, false);
        showToast('Recibo de cuenta por cobrar impreso', 'success');
      } catch (printErr) {
      }

      setOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
      showToast(`Cuenta por cobrar registrada. Orden #${selectedOrder.order_number} pendiente.`, 'success');
      await resetForm();
      setSelectedOrder(null);

    } catch (err) {
      showToast(err.message || 'Error al procesar crédito', 'error');
    } finally {
      setPrintLoading(false);
    }
  };

  // Handler para pago parcial (abono)
  const handlePagoParcial = async (montoAbono, metodoAbono, refAbono) => {
    setPrintLoading(true);
    try {
      // Validar cliente REAL
      if (!clienteCedula || clienteCedula === '9999999999' || clienteCedula === '9999999999999') {
        throw new Error('Para cuenta por cobrar debe ingresar un cliente real (no CONSUMIDOR FINAL)');
      }

      const customerId = await guardarCliente(clienteCedula, clienteNombre, clienteEmail);
      const saldoRestante = Math.max(0, totalOrdenConDescuento - montoAbono);

      // Obtener usuario de la sesión (igual que en apertura/cierre)
      const userId = user?.id || user?.userId || null;
      const userName = user?.firstName || user?.first_name || user?.nombre || user?.name || 'Usuario';
      const userEmail = user?.email || '';

      const payload = {
        order_id: selectedOrder.id,
        order_number: selectedOrder.order_number,
        customer_id: customerId,
        customer_name: clienteNombre || 'CLIENTE SIN NOMBRE',
        customer_document: clienteCedula,
        customer_email: clienteEmail || null,
        total_amount: totalOrdenConDescuento,
        paid_amount: montoAbono,
        payment_method: metodoAbono,
        reference_number: refAbono || null,
        notes: orderNotes || `Abono parcial - Orden #${selectedOrder.order_number}`,
        // Datos del usuario para auditoría (igual que apertura/cierre)
        user_id: userId,
        user_name: userName,
        user_email: userEmail
      };

      const response = await fetchWithAuth('/accounting-receivable/create-from-order', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al crear cuenta por cobrar');
      }

      // Actualizar estado de la orden
      await fetchWithAuth(`/ordenes/${selectedOrder.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'draft',
          payment_method: 'credit',
          amount_paid: montoAbono,
          notes: `Abono de ${fmt(montoAbono)} - Saldo pendiente: ${fmt(saldoRestante)}`.trim()
        })
      });

      // Imprimir recibo
      try {
        const printData = {
          bizInfo,
          orden: selectedOrder.order_number,
          customer: {
            id: clienteCedula,
            name: clienteNombre,
          },
          items: (selectedOrder.items || []).map(item => ({
            description: item.product_name || 'Producto',
            quantity: item.quantity,
            price: Number(item.selling_price) || Number(item.unit_price) || 0,
            total: (Number(item.selling_price) || Number(item.unit_price) || 0) * item.quantity,
          })),
          subtotal: totalOrdenConDescuento,
          tax: 0,
          total: totalOrdenConDescuento,
          abono: montoAbono,
          saldo: saldoRestante,
          vencimiento: result.data.due_date,
          printerFooter: '¡Gracias por su preferencia!',
        };
        await print('printer_main', 'credit-receivable-with-abono', printData, false);
        showToast('Recibo de abono y cuenta por cobrar impreso', 'success');
      } catch (printErr) {
      }

      setOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
      showToast(
        `Abono de ${fmt(montoAbono)} registrado. Saldo pendiente: ${fmt(saldoRestante)}. ` +
        `Cuenta por cobrar creada.`,
        'success'
      );
      await resetForm();
      setSelectedOrder(null);

    } catch (err) {
      showToast(err.message || 'Error al procesar abono', 'error');
    } finally {
      setPrintLoading(false);
    }
  };

  // HANDLER PARA CUENTA POR COBRAR CON IMPRESIÓN
  const handlePagoPorCobrar = async () => {
    setPrintLoading(true);
    try {
      const receivable = await guardarCuentaPorCobrar();
      if (!receivable) throw new Error('No se pudo guardar la cuenta por cobrar');

      // Obtener usuario de la sesión (igual que en apertura/cierre)
      const userId = user?.id || user?.userId || null;
      const userName = user?.firstName || user?.first_name || user?.nombre || user?.name || 'Usuario';
      const userEmail = user?.email || '';

      await fetchWithAuth(`/ordenes/${selectedOrder.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'draft',
          payment_method: 'credit',
          notes: `${orderNotes || ''} - Cuenta por cobrar registrada (ID: ${receivable.id})`.trim()
        })
      });

      // ─── IMPRIMIR RECIBO DE CUENTA POR COBRAR ───
      try {
        const printData = {
          bizInfo,
          orden: selectedOrder.order_number,
          customer: {
            id: clienteCedula || '9999999999',
            name: clienteNombre || 'CONSUMIDOR FINAL',
          },
          items: (selectedOrder.items || []).map(item => ({
            description: item.product_name || 'Producto',
            quantity: item.quantity,
            price: Number(item.selling_price) || Number(item.unit_price) || 0,
            total: (Number(item.selling_price) || Number(item.unit_price) || 0) * item.quantity,
          })),
          subtotal: totalOrdenConDescuento,
          tax: 0,
          total: totalOrdenConDescuento,
          vencimiento: receivable.due_date || new Date(Date.now() + 30*24*60*60*1000).toISOString(),
          printerFooter: '¡Gracias por su preferencia!',
        };
        await print('printer_main', 'credit-receivable', printData, false);
        showToast('Recibo de cuenta por cobrar impreso', 'success');
      } catch (printErr) {
        showToast('Error al imprimir recibo de cuenta por cobrar', 'error');
      }

      setOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
      showToast(`Cuenta por cobrar registrada. Orden #${selectedOrder.order_number} pendiente de cobro. Vence en 30 días.`, 'success');
      await resetForm();
      setSelectedOrder(null);

    } catch (err) {
      showToast(err.message || 'Error al procesar cuenta por cobrar', 'error');
    } finally {
      setPrintLoading(false);
    }
  };

  // Función auxiliar para guardar cuenta por cobrar con monto específico
  const guardarCuentaPorCobrarConMonto = async (monto) => {
    if (processingCxC || !selectedOrder) return null;
    const clienteId = foundCliente?.id || null;
    const nombreCliente = foundCliente?.name || clienteNombre || 'CONSUMIDOR FINAL';
    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);

    try {
      setProcessingCxC(true);
      const response = await fetchWithAuth('/accounting-receivable/receivables', {
        method: 'POST',
        body: JSON.stringify({
          order_number: selectedOrder.order_number,
          customer_id: clienteId,
          customer_name: nombreCliente,
          amount: monto,
          issue_date: new Date().toISOString().split('T')[0],
          due_date: fechaVencimiento.toISOString().split('T')[0],
          description: `Saldo pendiente - Orden #${selectedOrder.order_number}`,
          notes: orderNotes || null,
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al guardar cuenta por cobrar');
      return data.data;
    } catch (err) {
      showToast(`Error al guardar cuenta por cobrar: ${err.message}`, 'error');
      return null;
    } finally {
      setProcessingCxC(false);
    }
  };

  const marcarCuentaPorCobrarComoPagada = async (orderNumber, total, metodoPago) => {
    try {
      const res = await fetchWithAuth(`/accounting-receivable/receivables?search=${encodeURIComponent(orderNumber)}&limit=5`);
      const data = await res.json();
      const lista = Array.isArray(data.data) ? data.data : data.receivables || [];
      const receivable = lista.find(r =>
        String(r.order_number) === String(orderNumber) ||
        String(r.invoice_number) === String(orderNumber)
      );
      if (!receivable) return;
      await fetchWithAuth(`/accounting-receivable/receivables/${receivable.id}/payments`, {
        method: 'POST',
        body: JSON.stringify({ amount: total, payment_method: metodoPago })
      });
    } catch (err) {
    }
  };

  // ─── Handlers de pago ───────────────────────────────────────────
  const handleCobrarComensal = async (comensal) => {
    if (modoPorCobrar) {
      showToast('En modo "Por Cobrar" no se puede cobrar comensales.', 'error');
      return;
    }
    if (comensal.items.length === 0) {
      showToast('Este comensal no tiene productos asignados', 'error');
      return;
    }

    const totalComensal = calcularTotalComensal(comensal);
    if (comensal.metodoPago === 'cash' && comensal.montoRecibido < totalComensal) {
      showToast(`Monto insuficiente. Total: ${fmt(totalComensal)}, Recibido: ${fmt(comensal.montoRecibido)}`, 'error');
      return;
    }
    if (comensal.metodoPago === 'mixto' && comensal.montoRecibido < totalComensal) {
      showToast(`Monto insuficiente. Total pagado: ${fmt(comensal.montoRecibido)}. Total: ${fmt(totalComensal)}`, 'error');
      return;
    }

    setPrintLoading(true);
    try {
      let cedula = '9999999999', nombre = 'CONSUMIDOR FINAL', email = null;
      if (comensal.facturaIndividual) {
        cedula = comensal.cedula?.trim() || '9999999999';
        nombre = comensal.nombre?.trim() || 'CONSUMIDOR FINAL';
        email = comensal.email || null;
      } else {
        cedula = clienteCedula?.trim() || '9999999999';
        nombre = clienteNombre?.trim() || 'CONSUMIDOR FINAL';
        email = clienteEmail?.trim() || null;
      }
      const clienteId = await guardarCliente(cedula, nombre, email);

      let payments = [];
      if (comensal.metodoPago === 'cash') {
        payments = [{ method: 'cash', amount: comensal.montoRecibido }];
      } else if (comensal.metodoPago === 'card') {
        payments = [{ method: 'card', amount: totalComensal, reference_number: comensal.referencia }];
      } else if (comensal.metodoPago === 'transfer') {
        payments = [{ method: 'transfer', amount: totalComensal, reference_number: comensal.referencia }];
      } else if (comensal.metodoPago === 'mixto') {
        if (comensal.cashAmount > 0) payments.push({ method: 'cash', amount: comensal.cashAmount });
        if (comensal.cardAmount > 0) payments.push({ method: 'card', amount: comensal.cardAmount, reference_number: comensal.referencia || null });
        if (comensal.transferAmount > 0) payments.push({ method: 'transfer', amount: comensal.transferAmount, reference_number: comensal.referenciaTransfer || null });
      }

      await fetchWithAuth(`/ordenes/${selectedOrder.id}/pay-items`, {
        method: 'POST',
        body: JSON.stringify({
          item_ids: comensal.items,
          amount_paid: totalComensal,
          payment_method: comensal.metodoPago,
          payments,
          cliente_id: clienteId,
          reference_number: (comensal.metodoPago !== 'cash' && comensal.metodoPago !== 'mixto') ? (comensal.referencia || null) : null,
          notes: `${orderNotes} - ${nombre}`
        }),
      });

      const nuevoTotalPagado = totalPagadoAcumulado + totalComensal;
      setTotalPagadoAcumulado(nuevoTotalPagado);
      const debeAbrirCajon = (comensal.metodoPago === 'cash') || (comensal.metodoPago === 'mixto' && (comensal.cashAmount || 0) > 0);

      if (comensal.facturaIndividual) {
        const partialOrder = { ...selectedOrder, items: selectedOrder.items.filter(i => comensal.items.includes(i.id)) };
        const invoiceData = await emitirFactura(partialOrder, cedula, nombre, 'split', null, comensal.email);
        const printSplit = await awaitPrintDecision();
        if (printSplit) {
          await imprimirTicket(partialOrder, totalComensal, comensal.montoRecibido - totalComensal, invoiceData, 'split', nombre, debeAbrirCajon, comensal.metodoPago);
        } else if (debeAbrirCajon) {
          openCashDrawer();
        }
        showToast(`Factura generada para ${nombre}`, 'success');
      } else {
        const itemsCompletos = comensal.items.map(itemId => selectedOrder?.items?.find(i => i.id === itemId)).filter(i => i);
        setPagosRegistrados(prev => [...prev, { cliente: { cedula, nombre, email }, items: itemsCompletos, total: totalComensal, metodoPago: comensal.metodoPago, payments }]);
        if (debeAbrirCajon) openCashDrawer();
        showToast(`Pago registrado para ${nombre}`, 'success');
      }

      setClientesDivididos(prev => prev.filter(c => c.id !== comensal.id));

      const ordenActualizada = await recargarOrden();
      const itemsPendientes = ordenActualizada?.items?.filter(i => !i.paid).length || 0;

      if (itemsPendientes === 0) {
        if (!comensal.facturaIndividual) {
          let itemsFinales = [];
          for (const pago of pagosRegistrados) if (pago.items) itemsFinales.push(...pago.items);
          const itemsActuales = comensal.items.map(itemId => selectedOrder?.items?.find(i => i.id === itemId)).filter(i => i);
          itemsActuales.forEach(item => { if (!itemsFinales.some(i => i.id === item.id)) itemsFinales.push(item); });

          if (itemsFinales.length > 0) {
            const ordenCompleta = { ...selectedOrder, items: itemsFinales };
            const discountInfo = (appliedDiscount || appliedCouponsRef.current.length > 0) ? { id: appliedDiscount?.id, name: [appliedDiscount?.name, ...appliedCouponsRef.current.map(c => c.discount.name)].filter(Boolean).join(' + '), amount: discountAmount + couponDiscountAmount } : null;
            const invoiceData = await emitirFactura(ordenCompleta, clienteCedula || '9999999999', clienteNombre || 'CONSUMIDOR FINAL', 'split', discountInfo, clienteEmail);
            const printFinal = await awaitPrintDecision();
            if (printFinal) {
              await imprimirTicket(ordenCompleta, totalOrdenConDescuento, 0, invoiceData, 'split', 'FACTURA FINAL', false);
            }
          }
        } else {
          showToast('Todos los comensales facturados. Orden completada.', 'success');
        }

        await fetchWithAuth(`/ordenes/${selectedOrder.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'paid',
            payment_method: 'split',
            amount_paid: totalOrdenConDescuento,
            notes: orderNotes,
            discount_id: appliedDiscount?.id || null,
            discount_amount: discountAmount + couponDiscountAmount
          })
        });

        setOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
        setSelectedOrder(null);
        setClientesDivididos([]);
        setPagosRegistrados([]);
        setTotalPagadoAcumulado(0);
        showToast('Orden completada', 'success');
      } else {
        const comensalesRestantes = clientesDivididos.filter(c => c.id !== comensal.id);
        if (comensalesRestantes.length === 0) {
          setClientesDivididos([{ id: Date.now(), cedula: '', nombre: '', email: '', items: [], metodoPago: 'cash', montoRecibido: 0, referencia: '', cashAmount: 0, cardAmount: 0, transferAmount: 0, facturaIndividual: false, mixtoMethods: [] }]);
        }
        setSelectedItems([]);
        showToast(`Pago completado. Quedan ${itemsPendientes} productos por pagar.`, 'success');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setPrintLoading(false);
    }
  };

  const handlePagoNormal = async () => {
    if (modoPorCobrar) {
      await handlePagoPorCobrar();
      return;
    }

    // VALIDACIÓN DE CLIENTE PARA MONTOS ≥ 50
    try {
      validarClienteParaMonto(totalOrdenConDescuento);
    } catch (err) {
      showToast(err.message, 'error');
      return;
    }

    setPrintLoading(true);
    try {
      let cedula = clienteCedula?.trim() || '9999999999';
      let nombre = clienteNombre?.trim() || 'CONSUMIDOR FINAL';
      let clienteId = await guardarCliente(cedula, nombre, clienteEmail?.trim() || null);
      let invoiceData = null;
      const totalDescuento = discountAmount + couponDiscountAmount;
      const discountInfo = (appliedDiscount || appliedCouponsRef.current.length > 0) ? {
        id: appliedDiscount?.id,
        name: [appliedDiscount?.name, ...appliedCouponsRef.current.map(c => c.discount.name)].filter(Boolean).join(' + '),
        amount: totalDescuento,
        type: appliedDiscount?.type,
        applies_to: appliedDiscount?.applies_to,
      } : null;

      let debeAbrirCajon = false;

      if (metodoPagoNormal === 'cash') {
        const paid = parseFloat(amountPaid) || 0;
        const totalExacto = totalOrdenConDescuento;
        if (paid < totalExacto) throw new Error(`Monto insuficiente. Total: ${fmt(totalExacto)}`);
        await fetchWithAuth(`/ordenes/${selectedOrder.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'paid',
            payment_method: 'cash',
            amount_paid: totalOrdenConDescuento,
            id_customer: cedula,
            customer_name: nombre,
            customer_document_number: cedula,
            notes: orderNotes,
            discount_id: appliedDiscount?.id || null,
            discount_amount: totalDescuento
          }),
        });
        invoiceData = await emitirFactura(selectedOrder, cedula, nombre, 'cash', discountInfo, clienteEmail);
        debeAbrirCajon = true;
        const p = await awaitPrintDecision();
        if (p) {
          await imprimirTicket(selectedOrder, totalOrdenConDescuento, paid - totalOrdenConDescuento, invoiceData, null, null, debeAbrirCajon, 'cash');
        } else {
          openCashDrawer();
        }
        showToast('Pago completado en efectivo', 'success');
      } else if (metodoPagoNormal === 'card') {
        if (!refCard) throw new Error('Ingrese la referencia de la tarjeta');
        await fetchWithAuth(`/ordenes/${selectedOrder.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'paid',
            payment_method: 'card',
            amount_paid: totalOrdenConDescuento,
            reference_number: refCard,
            id_customer: cedula,
            customer_name: nombre,
            customer_document_number: cedula,
            notes: orderNotes,
            discount_id: appliedDiscount?.id || null,
            discount_amount: totalDescuento
          }),
        });
        invoiceData = await emitirFactura(selectedOrder, cedula, nombre, 'card', discountInfo, clienteEmail);
        debeAbrirCajon = false;
        const p = await awaitPrintDecision();
        if (p) {
          await imprimirTicket(selectedOrder, totalOrdenConDescuento, 0, invoiceData, null, null, debeAbrirCajon, 'card');
        }
        showToast('Pago completado con tarjeta', 'success');
      } else if (metodoPagoNormal === 'transfer') {
        if (!refTransfer) throw new Error('Ingrese la referencia de la transferencia');
        await fetchWithAuth(`/ordenes/${selectedOrder.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'paid',
            payment_method: 'transfer',
            amount_paid: totalOrdenConDescuento,
            reference_number: refTransfer,
            id_customer: cedula,
            customer_name: nombre,
            customer_document_number: cedula,
            notes: orderNotes,
            discount_id: appliedDiscount?.id || null,
            discount_amount: totalDescuento
          }),
        });
        invoiceData = await emitirFactura(selectedOrder, cedula, nombre, 'transfer', discountInfo, clienteEmail);
        debeAbrirCajon = false;
        const p = await awaitPrintDecision();
        if (p) {
          await imprimirTicket(selectedOrder, totalOrdenConDescuento, 0, invoiceData, null, null, debeAbrirCajon, 'transfer');
        }
        showToast('Pago completado por transferencia', 'success');
      } else if (metodoPagoNormal === 'mixto') {
        const cashAmt = parseFloat(amountPaid) || 0;
        const cardAmt = parseFloat(cardPaid) || 0;
        const transferAmt = parseFloat(transferPaid) || 0;
        const cashNeeded = Math.max(0, totalOrdenConDescuento - cardAmt - transferAmt);
        if (cashAmt < cashNeeded) throw new Error(`Falta ${fmt(cashNeeded - cashAmt)} en efectivo`);
        const mixtoPayments = [];
        if (cashNeeded > 0) mixtoPayments.push({ method: 'cash', amount: cashNeeded });
        if (cardAmt > 0) mixtoPayments.push({ method: 'card', amount: cardAmt, reference_number: refCard });
        if (transferAmt > 0) mixtoPayments.push({ method: 'transfer', amount: transferAmt, reference_number: refTransfer });
        await fetchWithAuth(`/ordenes/${selectedOrder.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'paid',
            payment_method: 'mixto',
            amount_paid: totalOrdenConDescuento,
            payments: mixtoPayments,
            id_customer: cedula,
            customer_name: nombre,
            customer_document_number: cedula,
            notes: orderNotes,
            discount_id: appliedDiscount?.id || null,
            discount_amount: totalDescuento
          }),
        });
        invoiceData = await emitirFactura(selectedOrder, cedula, nombre, 'mixto', discountInfo, clienteEmail);
        debeAbrirCajon = (cashNeeded > 0);
        const p = await awaitPrintDecision();
        if (p) {
          await imprimirTicket(selectedOrder, totalOrdenConDescuento, cashAmt - cashNeeded, invoiceData, null, null, debeAbrirCajon, 'mixto');
        } else if (debeAbrirCajon) {
          openCashDrawer();
        }
        showToast('Pago completado con método mixto', 'success');
      } else if (metodoPagoNormal === 'credit_note') {
        if (!appliedCreditNote) throw new Error('Selecciona una nota de crédito');
        const applyAmt  = parseFloat(creditNoteApplyAmt) || 0;
        const restante  = Math.max(0, totalOrdenConDescuento - applyAmt);
        if (applyAmt <= 0) throw new Error('El monto a aplicar debe ser mayor a 0');
        if (applyAmt > parseFloat(appliedCreditNote.remaining_balance) + 0.01)
          throw new Error(`Monto mayor al saldo disponible ($${parseFloat(appliedCreditNote.remaining_balance).toFixed(2)})`);

        if (restante > 0.01) {
          if (!cnMetodoRestante) throw new Error(`Faltan ${fmt(restante)} — selecciona cómo pagar el restante`);
          if (cnMetodoRestante === 'cash') {
            const cashAmt = parseFloat(cnCashPaid) || 0;
            if (cashAmt < restante - 0.01) throw new Error(`Monto insuficiente. Faltan ${fmt(restante - cashAmt)}`);
          } else if (cnMetodoRestante === 'card'     && !cnCardRef    ) throw new Error('Ingrese la referencia de la tarjeta');
          else if   (cnMetodoRestante === 'transfer' && !cnTransferRef) throw new Error('Ingrese la referencia de la transferencia');
        }

        const actualApply = Math.min(applyAmt, parseFloat(appliedCreditNote.remaining_balance));
        const applyRes = await fetchWithAuth(`/einvoicing/credit-notes/${appliedCreditNote.id}/apply`, {
          method: 'POST',
          body: JSON.stringify({ amount: actualApply }),
        });
        if (!applyRes.ok) { const d = await applyRes.json(); throw new Error(d.error || 'Error al aplicar nota de crédito'); }

        const paymentsNC = [{ method: 'credit_note', amount: actualApply, reference: `NC#${appliedCreditNote.id}` }];
        if (restante > 0.01) {
          if      (cnMetodoRestante === 'cash')     paymentsNC.push({ method: 'cash',     amount: restante });
          else if (cnMetodoRestante === 'card')     paymentsNC.push({ method: 'card',     amount: restante, reference_number: cnCardRef     });
          else if (cnMetodoRestante === 'transfer') paymentsNC.push({ method: 'transfer', amount: restante, reference_number: cnTransferRef });
        }

        const notasPago = `NC#${appliedCreditNote.id} $${actualApply.toFixed(2)}` +
          (restante > 0.01 ? ` + ${cnMetodoRestante} $${restante.toFixed(2)}` : '') +
          (orderNotes ? `. ${orderNotes}` : '');

        await fetchWithAuth(`/ordenes/${selectedOrder.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'paid',
            payment_method: 'credit_note',
            amount_paid: totalOrdenConDescuento,
            payments: paymentsNC,
            id_customer: cedula,
            customer_name: nombre,
            customer_document_number: cedula,
            notes: notasPago.trim(),
            discount_id: appliedDiscount?.id || null,
            discount_amount: totalDescuento,
          }),
        });
        invoiceData = await emitirFactura(selectedOrder, cedula, nombre, 'credit_note', discountInfo, clienteEmail);
        debeAbrirCajon = (cnMetodoRestante === 'cash' && restante > 0.01);
        const cnCambio = cnMetodoRestante === 'cash' ? Math.max(0, (parseFloat(cnCashPaid) || 0) - restante) : 0;
        const p = await awaitPrintDecision();
        if (p) {
          await imprimirTicket(selectedOrder, totalOrdenConDescuento, cnCambio, invoiceData, null, null, debeAbrirCajon, 'credit_note');
        } else if (debeAbrirCajon) {
          openCashDrawer();
        }
        showToast('Pago completado con nota de crédito', 'success');
      }

      if (selectedOrder.status === 'draft') {
        await marcarCuentaPorCobrarComoPagada(selectedOrder.order_number, totalOrdenConDescuento, metodoPagoNormal);
      }

      setOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
      await resetForm();
      showToast('Pago completado', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setPrintLoading(false);
    }
  };

  // ─── Handlers de UI ───────────────────────────────────────────
  const handleSelectOrder = (oid) => {
    const o = orders.find(x => String(x.id) === oid);
    if (!o) {
      setSelectedOrder(null);
      return;
    }
    
    setSelectedOrder(o);
    
    if (o.status === 'draft') {
      setOrderNotes(o?.notes || '');
      return;
    }
    
    setAmountPaid('');
    setAmountPaidRaw('');
    setClienteCedula(o?.customer_document_number || '9999999999');
    setClienteNombre(o?.customer_name || '');
    setClienteEmail(o?.customer_email || '');
    setFoundCliente(null);
    setOrderNotes(o?.notes || '');
    setSelectedItems([]);
    setClientesDivididos([]);
    setPagosRegistrados([]);
    setTotalPagadoAcumulado(0);
    setModoDividido(false);
    setModoPorCobrar(false);
    setFacturaIndividual(false);
    setError('');
    appliedCouponsRef.current = [];
    manualDiscountRef.current = null;
    setCouponSlots([{ code: '', error: '' }]);
    setCouponPendingSelect(false);
    setPendingCoupon(null);
    setPendingSlotIdx(null);
    setCouponSelectedItemIds([]);
    setCouponDiscountAmount(0);
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
    } catch (error) {
      console.error('Error buscando en padrón:', error);
      if (!esParaComensal) setClienteNombre('');
    }
  };

  const handleBuscarCliente = async (documento, esParaComensal = false, comensalId = null) => {
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
      const res = await fetchWithAuth(`/customers/by-document?document_number=${documento}&document_type=${docType}`);
      
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
          await buscarEnPadron(documento.slice(0, 10), esParaComensal, comensalId);
        } else {
          setClienteEmail('');
          setFoundCliente(null);
          await buscarEnPadron(documento.slice(0, 10), esParaComensal, comensalId);
        }
      }
    } catch (err) {
      console.error('Error buscando cliente:', err);
      if (esParaComensal && comensalId) {
        await buscarEnPadron(documento.slice(0, 10), esParaComensal, comensalId);
      } else {
        await buscarEnPadron(documento.slice(0, 10), esParaComensal, comensalId);
      }
    } finally {
      setClientApiLoading(false);
    }
  };

  const handleSelectItem = (itemId) => {
    const item = selectedOrder?.items?.find(i => i.id === itemId);
    if (item?.paid) {
      showToast('Este producto ya fue pagado', 'error');
      return;
    }
    setSelectedItems(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const actualizarComensal = (id, campo, valor) => {
    setClientesDivididos(prev => prev.map(comensal =>
      comensal.id === id ? { ...comensal, [campo]: valor } : comensal
    ));
  };

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
        referencia: '',
        cashAmount: 0,
        cardAmount: 0,
        transferAmount: 0,
        facturaIndividual: false,
        mixtoMethods: [],
        referenciaTransfer: '',
      }
    ]);
  };

  const eliminarComensal = (id) => {
    if (clientesDivididos.length === 1) {
      showToast('Debe haber al menos un comensal', 'error');
      return;
    }
    const comensal = clientesDivididos.find(c => c.id === id);
    if (comensal && comensal.items.length > 0) {
      setSelectedItems(prev => [...prev, ...comensal.items]);
    }
    setClientesDivididos(clientesDivididos.filter(c => c.id !== id));
  };

  const asignarItemsAComensal = (idComensal) => {
    if (selectedItems.length === 0) {
      showToast('No hay productos seleccionados', 'error');
      return;
    }
    const itemsNoPagados = selectedItems.filter(itemId => {
      const item = selectedOrder?.items?.find(i => i.id === itemId);
      return item && !item.paid;
    });
    if (itemsNoPagados.length === 0) {
      showToast('Los productos seleccionados ya fueron pagados', 'error');
      return;
    }
    setClientesDivididos(prev => prev.map(comensal =>
      comensal.id === idComensal
        ? { ...comensal, items: [...comensal.items, ...itemsNoPagados] }
        : comensal
    ));
    setSelectedItems([]);
    showToast(`${itemsNoPagados.length} producto(s) asignado(s)`, 'success');
  };

  const quitarItemDeComensal = (idComensal, itemId) => {
    setClientesDivididos(prev => prev.map(comensal =>
      comensal.id === idComensal
        ? { ...comensal, items: comensal.items.filter(id => id !== itemId) }
        : comensal
    ));
    setSelectedItems(prev => [...prev, itemId]);
  };

  const calcularSubtotalComensal = (comensal) => {
    if (!selectedOrder) return 0;
    return comensal.items.reduce((sum, itemId) => {
      const item = selectedOrder.items.find(i => i.id === itemId);
      return sum + (item ? (Number(item.selling_price) || Number(item.unit_price)) * item.quantity : 0);
    }, 0);
  };

  const calcularIVAComensal = (comensal) => {
    if (!selectedOrder) return 0;
    return comensal.items.reduce((sum, itemId) => {
      const item = selectedOrder.items.find(i => i.id === itemId);
      return sum + (item ? (Number(item.iva_amount) || 0) : 0);
    }, 0);
  };

  const calcularTotalComensal = (comensal) => {
    return calcularSubtotalComensal(comensal) + calcularIVAComensal(comensal);
  };

  const handleMixtoField = (field, digits) => {
    const total = totalOrdenConDescuento;
    const value = parseInt(digits || '0', 10) / 100;
    const newManual = new Set(mixtoManual);
    if (value === 0) newManual.delete(field);
    else newManual.add(field);
    setMixtoManual(newManual);

    const vals = {
      cash: field === 'cash' ? value : (mixtoActive.has('cash') ? (parseFloat(amountPaid) || 0) : 0),
      card: field === 'card' ? value : (mixtoActive.has('card') ? (parseFloat(cardPaid) || 0) : 0),
      transfer: field === 'transfer' ? value : (mixtoActive.has('transfer') ? (parseFloat(transferPaid) || 0) : 0),
    };

    const activeList = [...mixtoActive];
    const autoFields = activeList.filter(f => !newManual.has(f));
    if (autoFields.length === 1) {
      const af = autoFields[0];
      const manualSum = activeList.filter(f => f !== af).reduce((s, f) => s + vals[f], 0);
      vals[af] = Math.round(Math.max(0, total - manualSum) * 100) / 100;
    }

    applyMixtoVals(vals);
  };

  const applyMixtoVals = (vals) => {
    setAmountPaid(vals.cash.toFixed(2));
    setAmountPaidRaw(String(Math.round(vals.cash * 100)));
    setCardPaid(vals.card.toFixed(2));
    setCardPaidRaw(String(Math.round(vals.card * 100)));
    setTransferPaid(vals.transfer.toFixed(2));
    setTransferPaidRaw(String(Math.round(vals.transfer * 100)));
  };

  const validarMontoParaFactura = useCallback(async (monto) => {
    if (monto >= 50) {
      const result = await showConfirm({
        title: 'Monto superior a $50.00',
        message: `El total de la orden es ${fmt(monto)}. ¿Deseas continuar con el pago?`,
        confirmText: 'Sí, continuar',
        cancelText: 'Cancelar',
      });
      return result;
    }
    return true;
  }, [showConfirm, fmt]);

  const handleCancelar = () => {
    setSelectedOrder(null);
    setClientesDivididos([]);
    setSelectedItems([]);
    setPagosRegistrados([]);
    setTotalPagadoAcumulado(0);
    setModoDividido(false);
    setModoPorCobrar(false);
    setClienteCedula('');
    setClienteNombre('');
    setClienteEmail('');
    showToast('Operación cancelada', 'info');
  };

  const handlePrintDecision = (shouldPrint) => {
    setShowPrintModal(false);
    printResolveRef.current?.(shouldPrint);
    printResolveRef.current = null;
  };

  // ─── CÁLCULOS PARA MOSTRAR (USANDO FUNCIONES DEL HOOK) ──────────
  // Ahora los totales se obtienen directamente de los items (sin redondeos)
  const subtotalSinIVAMostrar = getSubtotalSinIVA();
  const nuevoIVAMostrarRedondeado = getIvaTotal();
  const totalOrdenBruto = getOrderTotal();

  // Base imponible para descuentos (restar descuentos del subtotal real)
  const nuevaBaseImponible = Math.max(0, subtotalSinIVAMostrar - (discountAmount || 0) - (couponDiscountAmount || 0));

  // ─── EFECTO PARA NAVEGACIÓN DESDE CUENTAS POR COBRAR ──────────
  const [isFromReceivable, setIsFromReceivable] = useState(false);
  const [currentReceivableId, setCurrentReceivableId] = useState(null);

  useEffect(() => {
    const navigationState = window.history.state?.usr || {};
    if (navigationState.orderNumber) {
      setIsFromReceivable(true);
      setCurrentReceivableId(navigationState.receivableId || null);
      if (window.history.state?.usr) {
        window.history.replaceState({}, document.title);
      }
      const targetOrder = orders.find(o => 
        String(o.order_number) === String(navigationState.orderNumber) ||
        String(o.id) === String(navigationState.orderNumber)
      );
      if (targetOrder) {
        setDraftOrder(targetOrder);
        setSelectedOrder(targetOrder);
        const cedula = navigationState.customerCedula || targetOrder.customer_document_number || '9999999999';
        const nombre = navigationState.customerName || targetOrder.customer_name || '';
        setClienteCedula(cedula);
        setClienteNombre(nombre);
        setClienteEmail(targetOrder.customer_email || '');
        setFoundCliente(null);
        setOrderNotes(targetOrder.notes || '');
        showToast(`Cobrando cuenta #${targetOrder.order_number}`, 'info');
      } else {
        loadOrders();
      }
    }
  }, [orders, setDraftOrder]);
  

  // ─── Render ────────────────────────────────────────────────────

  return (
    <PageTemplate 
      title="COBRAR ORDEN" 
      subtitle="Cobrar órdenes, imprimir recibo y abrir caja" 
      backButton
    >
      <div className="checkout-modern-main">
        <div className="checkout-modern-card">
          <OrderHeader
            selectedOrder={selectedOrder}
            orders={orders}
            onSelectOrder={handleSelectOrder}
          >
            {!(modoDividido && clientesDivididos.length > 0 && clientesDivididos.every(c => c.facturaIndividual)) && (
              <CustomerFields
                clienteCedula={clienteCedula}
                setClienteCedula={setClienteCedula}
                clienteNombre={clienteNombre}
                setClienteNombre={setClienteNombre}
                clienteEmail={clienteEmail}
                setClienteEmail={setClienteEmail}
                clientApiLoading={clientApiLoading}
                onBuscarCliente={handleBuscarCliente}
                disabled={!selectedOrder}
              />
            )}
          </OrderHeader>

          {selectedOrder && (
            <>
              {!isFromReceivable && (
                <PaymentMethods
                  modoDividido={modoDividido}
                  setModoDividido={setModoDividido}
                  modoPorCobrar={modoPorCobrar}
                  setModoPorCobrar={setModoPorCobrar}
                  clientesDivididos={clientesDivididos}
                  setClientesDivididos={setClientesDivididos}
                  setSelectedItems={setSelectedItems}
                  facturaIndividual={facturaIndividual}
                  setFacturaIndividual={setFacturaIndividual}
                />
              )}

              {isFromReceivable && (
                <div className="alert alert-info" style={{ marginBottom: '16px' }}>
                  <strong>Cobrando cuenta pendiente:</strong> 
                  {currentReceivableId && ` ID: #${currentReceivableId}`}
                  <span style={{ marginLeft: '8px' }}>
                    Cliente: {clienteNombre || 'CONSUMIDOR FINAL'} ({clienteCedula})
                  </span>
                </div>
              )}

              {!modoDividido && !modoPorCobrar && (
                <DiscountSection
                  availableDiscounts={availableDiscounts}
                  appliedDiscount={appliedDiscount}
                  setAppliedDiscount={setAppliedDiscount}
                  discountAmount={discountAmount}
                  setDiscountAmount={setDiscountAmount}
                  totalOrdenConDescuento={totalOrdenConDescuento}
                  setTotalOrdenConDescuento={setTotalOrdenConDescuento}
                  couponSlots={couponSlots}
                  setCouponSlots={setCouponSlots}
                  couponPendingSelect={couponPendingSelect}
                  setCouponPendingSelect={setCouponPendingSelect}
                  pendingCoupon={pendingCoupon}
                  pendingSlotIdx={pendingSlotIdx}
                  setPendingSlotIdx={setPendingSlotIdx}
                  couponSelectedItemIds={couponSelectedItemIds}
                  setCouponSelectedItemIds={setCouponSelectedItemIds}
                  appliedCouponsRef={appliedCouponsRef}
                  manualDiscountRef={manualDiscountRef}
                  couponDiscountAmount={couponDiscountAmount}
                  setCouponDiscountAmount={setCouponDiscountAmount}
                  couponVersion={couponVersion}
                  setCouponVersion={setCouponVersion}
                  descuentosExpanded={descuentosExpanded}
                  setDescuentosExpanded={setDescuentosExpanded}
                  selectedOrder={selectedOrder}
                  getSubtotalSinIVA={getSubtotalSinIVA}
                  getOrderTotal={getOrderTotal}
                  fmt={fmt}
                  isDiscountApplicable={isDiscountApplicable}
                  calculateDiscountAmountForOrder={calculateDiscountAmountForOrder}
                  recalcularTotalConDescuento={recalcularTotalConDescuento}
                  aplicarCupon={aplicarCupon}
                  quitarCupon={quitarCupon}
                  confirmarCuponCategoria={confirmarCuponCategoria}
                />
              )}

              <OrderDetails
                selectedOrder={selectedOrder}
                modoDividido={modoDividido}
                selectedItems={selectedItems}
                onSelectItem={handleSelectItem}
                appliedDiscount={appliedDiscount}
                discountAmount={discountAmount}
                totalOrdenConDescuento={totalOrdenConDescuento}      // ← total con descuento
                subtotalConDescuento={subtotalConDescuento}         // ← NUEVO: base imponible con descuento
                ivaConDescuento={ivaConDescuento}                   // ← NUEVO: IVA recalculado con descuento
                couponDiscountAmount={couponDiscountAmount}
                appliedCouponsRef={appliedCouponsRef}
                fmt={fmt}
                clientesDivididos={clientesDivididos}
                setClientesDivididos={setClientesDivididos}
              >
                {modoDividido && (
                  <SplitPaymentList
                    clientesDivididos={clientesDivididos}
                    selectedItems={selectedItems}
                    selectedOrder={selectedOrder}
                    pagosRegistrados={pagosRegistrados}
                    totalPagadoAcumulado={totalPagadoAcumulado}
                    totalOrdenBruto={totalOrdenBruto}
                    onAgregarComensal={agregarComensal}
                    onAsignarItems={asignarItemsAComensal}
                    onSelectItem={handleSelectItem}
                    onEliminarComensal={eliminarComensal}
                    onQuitarItemDeComensal={quitarItemDeComensal}
                    onActualizarComensal={actualizarComensal}
                    onCobrarComensal={handleCobrarComensal}
                    fmt={fmt}
                    calcularTotalComensal={calcularTotalComensal}
                    calcularSubtotalComensal={calcularSubtotalComensal}
                    calcularIVAComensal={calcularIVAComensal}
                    obtenerItemsPendientes={() => {
                      const assignedItemIds = clientesDivididos.flatMap(c => c.items || []);
                      return selectedOrder?.items?.filter(item => !item.paid && !assignedItemIds.includes(item.id)) || [];
                    }}
                    clienteCedula={clienteCedula}
                    clienteNombre={clienteNombre}
                    clienteEmail={clienteEmail}
                  />
                )}
              </OrderDetails>

              {modoDividido && clientesDivididos.map((comensal, idx) => (
                <SplitCustomerCard
                  key={comensal.id}
                  comensal={comensal}
                  index={idx}
                  clientesDivididos={clientesDivididos}
                  onEliminarComensal={eliminarComensal}
                  onActualizarComensal={actualizarComensal}
                  onBuscarCliente={handleBuscarCliente}
                  onQuitarItem={quitarItemDeComensal}
                  onCobrarComensal={handleCobrarComensal}
                  clientApiLoading={clientApiLoading}
                  selectedOrder={selectedOrder}
                  fmt={fmt}
                />
              ))}

              {!modoPorCobrar && !modoDividido && (
                <>
                  <div className="metodo-pago-seleccion">
                    <ButtonGroup>
                      <IconTextButton
                        variant={metodoPagoNormal === 'cash' ? 'primary' : 'secondary'}
                        size="md"
                        icon={<BsCashCoin size={22} />}
                        onClick={() => setMetodoPagoNormal('cash')}
                        outline={metodoPagoNormal !== 'cash'}
                        data-method="cash"
                      >
                        Efectivo
                      </IconTextButton>
                      <IconTextButton
                        variant={metodoPagoNormal === 'card' ? 'primary' : 'secondary'}
                        size="md"
                        icon={<CiCreditCard1 size={22} />}
                        onClick={() => setMetodoPagoNormal('card')}
                        outline={metodoPagoNormal !== 'card'}
                        data-method="card"
                      >
                        Tarjeta
                      </IconTextButton>
                      <IconTextButton
                        variant={metodoPagoNormal === 'transfer' ? 'primary' : ''}
                        size="md"
                        icon={<SlScreenSmartphone size={22} />}
                        onClick={() => setMetodoPagoNormal('transfer')}
                        outline={metodoPagoNormal !== 'transfer'}
                        data-method="transfer"
                      >
                        Transferencia
                      </IconTextButton>
                      {!isFromReceivable && (
                        <>
                          <IconTextButton
                            variant={metodoPagoNormal === 'mixto' ? 'primary' : 'secondary'}
                            size="md"
                            icon={<BsCashCoin size={22} />}
                            onClick={() => { 
                              setMetodoPagoNormal('mixto'); 
                              setAmountPaidRaw(''); 
                              setAmountPaid(''); 
                              setCardPaidRaw(''); 
                              setCardPaid(''); 
                              setTransferPaidRaw(''); 
                              setTransferPaid(''); 
                              setMixtoManual(new Set()); 
                              setMixtoActive(new Set()); 
                            }}
                            outline={metodoPagoNormal !== 'mixto'}
                            data-method="mixto"
                          >
                            Mixto
                          </IconTextButton>
                          <IconTextButton
                            variant={metodoPagoNormal === 'credit_note' ? 'primary' : 'secondary'}
                            size="md"
                            icon={<BsCashCoin size={22} />}
                            onClick={() => { 
                              setMetodoPagoNormal('credit_note'); 
                            }}
                            outline={metodoPagoNormal !== 'credit_note'}
                            data-method="credit_note"
                          >
                            N. Crédito
                          </IconTextButton>
                        </>
                      )}
                    </ButtonGroup>
                  </div>

                  {metodoPagoNormal === 'cash' && (
                    <CashPayment
                      amountPaid={amountPaid}
                      setAmountPaid={setAmountPaid}
                      amountPaidRaw={amountPaidRaw}
                      setAmountPaidRaw={setAmountPaidRaw}
                      totalOrdenConDescuento={totalOrdenConDescuento}
                      printLoading={printLoading}
                      onPagar={handlePagoNormal}
                      onCancelar={handleCancelar}
                      fmt={fmt}
                    />
                  )}
                  {metodoPagoNormal === 'card' && (
                    <CardPayment
                      refCard={refCard}
                      setRefCard={setRefCard}
                      totalOrdenConDescuento={totalOrdenConDescuento}
                      printLoading={printLoading}
                      onPagar={handlePagoNormal}
                      onCancelar={handleCancelar}
                      fmt={fmt}
                    />
                  )}
                  {metodoPagoNormal === 'transfer' && (
                    <TransferPayment
                      refTransfer={refTransfer}
                      setRefTransfer={setRefTransfer}
                      totalOrdenConDescuento={totalOrdenConDescuento}
                      printLoading={printLoading}
                      onPagar={handlePagoNormal}
                      onCancelar={handleCancelar}
                      fmt={fmt}
                    />
                  )}
                  {!isFromReceivable && metodoPagoNormal === 'mixto' && (
                    <MixedPayment
                      amountPaid={amountPaid}
                      setAmountPaid={setAmountPaid}
                      amountPaidRaw={amountPaidRaw}
                      setAmountPaidRaw={setAmountPaidRaw}
                      cardPaid={cardPaid}
                      setCardPaid={setCardPaid}
                      cardPaidRaw={cardPaidRaw}
                      setCardPaidRaw={setCardPaidRaw}
                      transferPaid={transferPaid}
                      setTransferPaid={setTransferPaid}
                      transferPaidRaw={transferPaidRaw}
                      setTransferPaidRaw={setTransferPaidRaw}
                      refCard={refCard}
                      setRefCard={setRefCard}
                      refTransfer={refTransfer}
                      setRefTransfer={setRefTransfer}
                      mixtoActive={mixtoActive}
                      setMixtoActive={setMixtoActive}
                      mixtoManual={mixtoManual}
                      setMixtoManual={setMixtoManual}
                      totalOrdenConDescuento={totalOrdenConDescuento}
                      printLoading={printLoading}
                      onPagar={handlePagoNormal}
                      onCancelar={handleCancelar}
                      fmt={fmt}
                      handleMixtoField={handleMixtoField}
                    />
                  )}
                  {!isFromReceivable && metodoPagoNormal === 'credit_note' && (
                    <CreditNotePayment
                      creditNotesAvailable={creditNotesAvailable}
                      cnLoading={cnLoading}
                      appliedCreditNote={appliedCreditNote}
                      setAppliedCreditNote={setAppliedCreditNote}
                      creditNoteApplyAmt={creditNoteApplyAmt}
                      setCreditNoteApplyAmt={setCreditNoteApplyAmt}
                      cnMetodoRestante={cnMetodoRestante}
                      setCnMetodoRestante={setCnMetodoRestante}
                      cnCashPaid={cnCashPaid}
                      setCnCashPaid={setCnCashPaid}
                      cnCashPaidRaw={cnCashPaidRaw}
                      setCnCashPaidRaw={setCnCashPaidRaw}
                      cnCardRef={cnCardRef}
                      setCnCardRef={setCnCardRef}
                      cnTransferRef={cnTransferRef}
                      setCnTransferRef={setCnTransferRef}
                      totalOrdenConDescuento={totalOrdenConDescuento}
                      printLoading={printLoading}
                      onPagar={handlePagoNormal}
                      onCancelar={handleCancelar}
                      onLoadCreditNotes={() => {}}
                      fmt={fmt}
                    />
                  )}
                </>
              )}

              {modoPorCobrar && (
                <CreditPayment
                  totalOrdenConDescuento={totalOrdenConDescuento}
                  printLoading={printLoading}
                  onPagarParcial={handlePagoParcial}
                  onPagarCredito={handlePagoCredito}
                  onCancelar={handleCancelar}
                  fmt={fmt}
                  // Props para validación de cliente
                  clienteCedula={clienteCedula}
                  clienteNombre={clienteNombre}
                  clienteEmail={clienteEmail}
                  onBuscarCliente={handleBuscarCliente}
                  clientApiLoading={clientApiLoading}
                  setClienteCedula={setClienteCedula}
                  setClienteNombre={setClienteNombre}
                  setClienteEmail={setClienteEmail}
                />
              )}
             
            </>
          )}
        </div>
      </div>

      <PrintModal
        isOpen={showPrintModal}
        onPrint={handlePrintDecision}
        onClose={() => handlePrintDecision(false)}
      />

      {toast.visible && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            maxWidth: '400px',
            padding: '16px 20px',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            backgroundColor: toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#3b82f6',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontFamily: 'sans-serif',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.3s ease',
            animation: 'slideIn 0.3s ease',
          }}
        >
          <span style={{ flex: 1 }}>{toast.message}</span>
          <button
            onClick={hideToast}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '18px',
              cursor: 'pointer',
              lineHeight: 1,
              opacity: 0.8,
              padding: '0 4px',
            }}
          >
            ×
          </button>
        </div>
      )}
    </PageTemplate>
  );
}