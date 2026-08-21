// src/pages/cashier/hooks/useCheckout.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useSession } from '../context/SessionContext';  
import { fetchWithAuth } from '../config/api';

export const useCheckout = () => {
  const { user, selectedBusiness } = useSession();
  const location = useLocation();

  const autoSelectRef = useRef(location.state?.orderNumber || null);
  const customerCedulaRef = useRef(location.state?.customerCedula || null);
  const printResolveRef = useRef(null);

  // ─── Estados principales ──────────────────────────────────────────
  const [orders, setOrders] = useState([]);
  const [bizInfo, setBizInfo] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [draftOrder, setDraftOrder] = useState(null);
  
  const [modoDividido, setModoDividido] = useState(false);
  const [modoPorCobrar, setModoPorCobrar] = useState(false);
  const [foundCliente, setFoundCliente] = useState(null);
  const [clienteCedula, setClienteCedula] = useState('9999999999');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [printLoading, setPrintLoading] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [processingCliente, setProcessingCliente] = useState(false);
  const [processingCxC, setProcessingCxC] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [clientApiLoading, setClientApiLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [ivaRateGlobal, setIvaRateGlobal] = useState(15);
  const [currencySymbol, setCurrencySymbol] = useState('$');

  // ─── Estados de pago ──────────────────────────────────────────────
  const [amountPaidRaw, setAmountPaidRaw] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [cardPaidRaw, setCardPaidRaw] = useState('');
  const [cardPaid, setCardPaid] = useState('');
  const [transferPaidRaw, setTransferPaidRaw] = useState('');
  const [transferPaid, setTransferPaid] = useState('');
  const [refCard, setRefCard] = useState('');
  const [refTransfer, setRefTransfer] = useState('');
  const [mixtoManual, setMixtoManual] = useState(new Set());
  const [mixtoActive, setMixtoActive] = useState(new Set());

  // ─── Estados de split ─────────────────────────────────────────────
  const [facturaIndividual, setFacturaIndividual] = useState(false);
  const [clientesDivididos, setClientesDivididos] = useState([]);
  const [pagosRegistrados, setPagosRegistrados] = useState([]);
  const [metodoPagoNormal, setMetodoPagoNormal] = useState('cash');
  const [totalPagadoAcumulado, setTotalPagadoAcumulado] = useState(0);

  // ─── Estados de notas de crédito ──────────────────────────────────
  const [creditNotesAvailable, setCreditNotesAvailable] = useState([]);
  const [appliedCreditNote, setAppliedCreditNote] = useState(null);
  const [creditNoteApplyAmt, setCreditNoteApplyAmt] = useState('');
  const [cnLoading, setCnLoading] = useState(false);
  const [cnMetodoRestante, setCnMetodoRestante] = useState('');
  const [cnCashPaid, setCnCashPaid] = useState('');
  const [cnCashPaidRaw, setCnCashPaidRaw] = useState('');
  const [cnCardRef, setCnCardRef] = useState('');
  const [cnTransferRef, setCnTransferRef] = useState('');

  // ─── Utilidades ──────────────────────────────────────────────────
  const fmt = useCallback((n) => `${currencySymbol}${parseFloat(n || 0).toFixed(2)}`, [currencySymbol]);

  const redondear = (valor) => Math.round(valor * 100) / 100;

  // ─── FUNCIONES DE TOTALES USANDO LOS CAMPOS GUARDADOS ──────────
  const getSubtotalSinIVA = useCallback(() => {
    if (!selectedOrder) return 0;
    // Usar el subtotal guardado en la orden (redondeado)
    if (typeof selectedOrder.subtotal === 'number') {
      const val = redondear(selectedOrder.subtotal);
      console.log('📊 getSubtotalSinIVA -> usando selectedOrder.subtotal:', selectedOrder.subtotal, 'redondeado:', val);
      return val;
    }
    // Fallback: recalcular y redondear
    const subtotal = (selectedOrder.items || [])
      .filter(item => !item.paid)
      .reduce((sum, item) => sum + (Number(item.selling_price) || Number(item.unit_price) || 0) * (item.quantity || 1), 0);
    const val = redondear(subtotal);
    return val;
  }, [selectedOrder]);

  const getIvaTotal = useCallback(() => {
    if (!selectedOrder) return 0;
    // Usar el IVA guardado en la orden
    if (typeof selectedOrder.tax_amount === 'number') {
      const val = redondear(selectedOrder.tax_amount);
      return val;
    }
    if (typeof selectedOrder.iva_amount === 'number') {
      const val = redondear(selectedOrder.iva_amount);
      return val;
    }
    // Fallback: recalcular y redondear
    const iva = (selectedOrder.items || [])
      .filter(item => !item.paid)
      .reduce((sum, item) => {
        const qty = Number(item.quantity) || 1;
        const price = Number(item.selling_price) || Number(item.unit_price) || 0;
        const taxRate = Number(item.is_taxable) ?? 0;
        if (taxRate > 0) {
          return sum + (price * qty * (taxRate / 100));
        }
        return sum;
      }, 0);
    const val = redondear(iva);
    return val;
  }, [selectedOrder]);

  const getOrderTotal = useCallback(() => {
    if (!selectedOrder) return 0;
    // Usar el total guardado en la orden
    if (typeof selectedOrder.total === 'number') {
      const val = redondear(selectedOrder.total);
      return val;
    }
    // Fallback: subtotal + IVA (ambos redondeados)
    const total = redondear(getSubtotalSinIVA() + getIvaTotal());
    return total;
  }, [selectedOrder, getSubtotalSinIVA, getIvaTotal]);

  // ─── Recargar orden ──────────────────────────────────────────────
  const recargarOrden = useCallback(async () => {
    if (!selectedOrder) return null;
    try {
      const res = await fetchWithAuth(`/ordenes/${selectedOrder.id}`);
      const ordenActualizada = await res.json();
      setSelectedOrder(ordenActualizada);
      return ordenActualizada;
    } catch (err) {
      return null;
    }
  }, [selectedOrder]);

  // ─── Cargar datos ──────────────────────────────────────────────────
  const loadFiscalConfig = async () => {
    try {
      const res = await fetchWithAuth('/fiscal/config');
      if (res.ok) {
        const data = await res.json();
        if (data && data.iva_rate) setIvaRateGlobal(Number(data.iva_rate));
        if (data && data.currency_symbol) setCurrencySymbol(data.currency_symbol);
      }
    } catch (err) {}
  };

  // ─── loadOrders ──────────────────────────────────────────────────
  const loadOrders = useCallback(async () => {
    try {
      const [res, prodRes] = await Promise.all([
        fetchWithAuth('/ordenes'),
        fetchWithAuth('/products'),
      ]);
      const raw = await res.json();
      const todosActivos = Array.isArray(raw) ? raw.filter(o => o.status !== 'paid' && o.status !== 'cancelled') : [];


      let productMap = {};
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        (Array.isArray(prodData) ? prodData : []).forEach(p => {
          if (p.id) {
            let taxableValue = 0;
            if (typeof p.is_taxable === 'boolean') {
              taxableValue = p.is_taxable ? 15 : 0;
            } else if (p.is_taxable != null) {
              taxableValue = Number(Math.round(p.is_taxable));
            }
            const validRates = [0, 5, 8, 12, 15];
            if (!validRates.includes(taxableValue)) taxableValue = 0;

            productMap[String(p.id)] = {
              code: p.code || p.sku || 'PROD',
              category_id: p.category_id,
              is_taxable: taxableValue,
            };
          }
        });
      }

      const enrichedOrders = todosActivos.map(order => {
        if (order.items && Array.isArray(order.items)) {
          return {
            ...order,
            items: order.items.map(item => ({
              ...item,
              code: item.code || productMap[String(item.product_id)]?.code || 'PROD',
              category_id: item.category_id ?? productMap[String(item.product_id)]?.category_id ?? null,
              is_taxable: item.is_taxable ?? productMap[String(item.product_id)]?.is_taxable ?? 0,
            })),
          };
        }
        return order;
      });

      const hasAutoSelect = autoSelectRef.current !== null;
      const orderNumberToFind = hasAutoSelect ? String(autoSelectRef.current) : null;
      const customerCedulaFromRef = customerCedulaRef.current;
      const hasCustomerCedula = customerCedulaFromRef !== null && customerCedulaFromRef !== '9999999999';

      let target = null;
      
      if (orderNumberToFind) {
        target = enrichedOrders.find(o =>
          String(o.order_number) === orderNumberToFind ||
          String(o.numero_pedido) === orderNumberToFind ||
          String(o.id) === orderNumberToFind
        );
        if (target) {
        } else {
        }
      } else if (draftOrder) {
        const draftOrderNum = String(draftOrder.order_number || draftOrder.id);
        target = enrichedOrders.find(o =>
          String(o.order_number) === draftOrderNum ||
          String(o.numero_pedido) === draftOrderNum ||
          String(o.id) === draftOrderNum
        );
        if (target) {
        }
      }

      let listaCombobox = [];
    
      if (target) {
        listaCombobox = [
          target,
          ...enrichedOrders.filter(o => 
            o.status !== 'draft' && 
            o.id !== target.id
          )
        ];
        
        setDraftOrder(target);
        setSelectedOrder(target);

        const hasCustomerCedula = customerCedulaRef.current !== null && 
                                customerCedulaRef.current !== '9999999999';
        
        if (hasCustomerCedula) {
          if (!clienteNombre || clienteNombre === '') {
            setClienteNombre(target.customer_name || 'CONSUMIDOR FINAL');
          }
          if (!clienteEmail) {
            setClienteEmail(target.customer_email || '');
          }
        } else {
          if (!clienteCedula || clienteCedula === '9999999999') {
            setClienteCedula(target.customer_document_number || '9999999999');
          }
          if (!clienteNombre) {
            setClienteNombre(target.customer_name || '');
          }
          if (!clienteEmail) {
            setClienteEmail(target.customer_email || '');
          }
        }
        
        setFoundCliente(null);
        if (hasAutoSelect || !orderNotes) {
          setOrderNotes(target.notes || '');
        }

        setSelectedItems([]);
        setClientesDivididos([]);
        setPagosRegistrados([]);
        setTotalPagadoAcumulado(0);
        setModoDividido(false);
        setModoPorCobrar(false);
        setFacturaIndividual(false);
        setError('');
        
      } else {
        listaCombobox = enrichedOrders.filter(o => o.status !== 'draft');
        if (draftOrder) {
          setDraftOrder(null);
        }
      }
      
      setOrders(listaCombobox);

      if (autoSelectRef.current) {
        autoSelectRef.current = null;
        customerCedulaRef.current = null;
      }

      const bizRes = await fetchWithAuth('/settings/receipt-info');
      const bizData = await bizRes.json();
      setBizInfo(bizData);

    } catch (err) {
      console.error('Error en loadOrders:', err);
    }
  }, [draftOrder, clienteCedula, clienteNombre, clienteEmail, orderNotes]);

  // ─── ESCUCHAR CAMBIOS EN location.state ──────────────────────────
  useEffect(() => {
    const state = location.state || {};
    if (state.orderNumber) {
      autoSelectRef.current = state.orderNumber;
      customerCedulaRef.current = state.customerCedula || '9999999999';
      
      if (state.customerCedula) {
        setClienteCedula(state.customerCedula);
      }
      if (state.customerName) {
        setClienteNombre(state.customerName);
      }
      if (state.customerEmail) {
        setClienteEmail(state.customerEmail);
      }
      
      loadOrders();
    }
  }, [location.state, loadOrders]);

  // ─── Carga inicial ─────────────────────────────────────────────────
  useEffect(() => {
    loadOrders();
    loadFiscalConfig();
  }, [selectedBusiness]);

  // ─── Reset ─────────────────────────────────────────────────────────
  const resetForm = useCallback(async () => {
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
    setMixtoActive(new Set());
    setSelectedItems([]);
    setClientesDivididos([]);
    setPagosRegistrados([]);
    setTotalPagadoAcumulado(0);
    setModoDividido(false);
    setModoPorCobrar(false);
    setFacturaIndividual(false);
    setMetodoPagoNormal('cash');
    setCreditNotesAvailable([]);
    setAppliedCreditNote(null);
    setCreditNoteApplyAmt('');
    setCnMetodoRestante('');
    setCnCashPaid(''); setCnCashPaidRaw('');
    setCnCardRef(''); setCnTransferRef('');
    setDraftOrder(null);
  }, []);

  // ─── Retornar todo ─────────────────────────────────────────────────
  return {
    orders, setOrders,
    bizInfo, setBizInfo,
    selectedOrder, setSelectedOrder,
    draftOrder, setDraftOrder,
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
    processingCliente, setProcessingCliente,
    processingCxC, setProcessingCxC,
    error, setError,
    success, setSuccess,
    clientApiLoading, setClientApiLoading,
    selectedItems, setSelectedItems,
    ivaRateGlobal,
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
    loadFiscalConfig,
    resetForm,
    recargarOrden,
    user,
  };
};