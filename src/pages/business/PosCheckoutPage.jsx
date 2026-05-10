import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Check, X, DollarSign, Users } from 'react-feather';
import PageTemplate from '../../components/PageTemplate';
import {
  FiX,
  FiGrid,
  FiCreditCard,
  FiSmartphone,
  FiPlus,
  FiUsers as FiUsersIcon,
  FiCheck,
  FiClock,
  FiPercent,
  FiTag
} from 'react-icons/fi';
import { FaHandHoldingDollar } from "react-icons/fa6";
import { BsCurrencyExchange } from "react-icons/bs";
import { FaMoneyBillTransfer } from "react-icons/fa6";
import { CiWarning } from "react-icons/ci";
import { IoFileTrayFull } from "react-icons/io5";
import OpenDrawerButton from '../../components/OpenDrawerButton';
import { useBusinessContext } from '../../admin/config/BusinessContext';
import { fetchWithAuth } from '../../config/apiBase';
import { useQzTray } from '../../components/useQzTray';
import { usePrinterService } from '../../services/usePrinterService';
import '../../styles/CheckoutModern.css';

export default function PosCheckoutPage() {
  const { selectedBusiness } = useBusinessContext();
  const { printerError } = useQzTray();
  const { print, getPrinterConfig } = usePrinterService();
  const location = useLocation();
  const autoSelectRef = useRef(location.state?.orderNumber || null);
  const customerCedulaRef = useRef(location.state?.customerCedula || null);

  const [orders, setOrders] = useState([]);
  const [bizInfo, setBizInfo] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modoDividido, setModoDividido] = useState(false);
  const [modoPorCobrar, setModoPorCobrar] = useState(false);
  const [foundCliente, setFoundCliente] = useState(null);
  const [clienteCedula, setClienteCedula] = useState('9999999999');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [printLoading, setPrintLoading] = useState(false);
  const [processingCliente, setProcessingCliente] = useState(false);
  const [processingCxC, setProcessingCxC] = useState(false);
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
  const [mixtoActive, setMixtoActive] = useState(new Set());

  const [facturaIndividual, setFacturaIndividual] = useState(false);
  const [clientesDivididos, setClientesDivididos] = useState([]);
  const [pagosRegistrados, setPagosRegistrados] = useState([]);
  const [metodoPagoNormal, setMetodoPagoNormal] = useState('cash');
  const [totalPagadoAcumulado, setTotalPagadoAcumulado] = useState(0);

  // ========== DESCUENTOS ==========
  const [availableDiscounts, setAvailableDiscounts] = useState([]);
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountDetails, setDiscountDetails] = useState(null); // Para detalles del descuento aplicado
  const [totalOrdenConDescuento, setTotalOrdenConDescuento] = useState(0);

  // ========== CONFIGURACIÓN FISCAL ==========
  const [ivaRateGlobal, setIvaRateGlobal] = useState(15);
  const [currencySymbol, setCurrencySymbol] = useState('$');

  // ========== FUNCIONES DE DESCUENTOS COMPLETAS ==========

  // Obtener subtotal por categoría
  const getSubtotalByCategory = useCallback((items, categoryId) => {
    return items.reduce((sum, item) => {
      if (item.category_id === categoryId) {
        const price = Number(item.selling_price) || Number(item.unit_price) || 0;
        const quantity = Number(item.quantity) || 1;
        return sum + (price * quantity);
      }
      return sum;
    }, 0);
  }, []);

  // Obtener subtotal por producto específico
  const getSubtotalByProduct = useCallback((items, productId) => {
    return items.reduce((sum, item) => {
      if (item.product_id === productId) {
        const price = Number(item.selling_price) || Number(item.unit_price) || 0;
        const quantity = Number(item.quantity) || 1;
        return sum + (price * quantity);
      }
      return sum;
    }, 0);
  }, []);

  // Obtener cantidad total de un producto específico
  const getQuantityByProduct = useCallback((items, productId) => {
    return items.reduce((sum, item) => {
      if (item.product_id === productId) {
        return sum + (Number(item.quantity) || 1);
      }
      return sum;
    }, 0);
  }, []);

  // Verificar si un descuento aplica (COMPLETO - con producto y categoría)
  const isDiscountApplicable = useCallback((discount, orderTotal, items = []) => {
    if (!discount.is_active) return false;
    if (!discount.type || discount.value === undefined) return false;
    
    const now = new Date();
    if (discount.start_date && new Date(discount.start_date) > now) return false;
    if (discount.end_date && new Date(discount.end_date) < now) return false;
    if (discount.days_of_week?.length && !discount.days_of_week.includes(now.getDay())) return false;
    if (discount.start_time && discount.end_time) {
      const currentTime = now.toTimeString().slice(0,5);
      if (currentTime < discount.start_time || currentTime > discount.end_time) return false;
    }
    
    // 🔥 Descuento por PRODUCTO ESPECÍFICO
    if (discount.applies_to === 'product') {
      if (!discount.product_id) return false;
      const productTotal = getSubtotalByProduct(items, discount.product_id);
      if (productTotal === 0) return false;
      if (discount.min_amount && productTotal < Number(discount.min_amount)) return false;
      if (discount.min_quantity) {
        const productQty = getQuantityByProduct(items, discount.product_id);
        if (productQty < discount.min_quantity) return false;
      }
      return true;
    }
    
    // 🔥 Descuento por CATEGORÍA
    if (discount.applies_to === 'category') {
      if (!discount.category_id) return false;
      const categoryTotal = getSubtotalByCategory(items, discount.category_id);
      if (categoryTotal === 0) return false;
      if (discount.min_amount && categoryTotal < Number(discount.min_amount)) return false;
      return true;
    }
    
    // 🔥 Descuento por ORDEN COMPLETA
    if (discount.applies_to === 'order') {
      if (discount.min_amount && orderTotal < Number(discount.min_amount)) return false;
      return true;
    }
    
    return false;
  }, [getSubtotalByCategory, getSubtotalByProduct, getQuantityByProduct]);

  // Calcular monto del descuento (COMPLETO)
  const calculateDiscountAmountForOrder = useCallback((discount, subtotalSinIVA, items = []) => {
    if (!discount || !discount.type || discount.value === undefined) return 0;
    
    let baseAmount = 0;
    let discountType = discount.type;
    let discountValue = Number(discount.value);
    
    // 🔥 Base según tipo de aplicación
    if (discount.applies_to === 'product' && discount.product_id) {
      baseAmount = getSubtotalByProduct(items, discount.product_id);
    } else if (discount.applies_to === 'category' && discount.category_id) {
      baseAmount = getSubtotalByCategory(items, discount.category_id);
    } else {
      baseAmount = subtotalSinIVA;
    }
    
    let amount = 0;
    
    // 🔥 Cálculo según tipo de descuento
    if (discountType === 'percentage') {
      amount = baseAmount * (discountValue / 100);
    } else if (discountType === 'fixed') {
      amount = Math.min(discountValue, baseAmount);
    } else if (discountType === 'buy_x_get_y') {
      // Compra X, lleva Y gratis - ejemplo: compra 2, lleva 1 gratis = 33% descuento
      const minQty = discount.min_quantity || 2;
      const freeQty = discount.free_quantity || 1;
      const discountPercent = (freeQty / (minQty + freeQty)) * 100;
      amount = baseAmount * (discountPercent / 100);
    } else if (discountType === 'bulk') {
      // Descuento por volumen
      let totalQty = 0;
      if (discount.applies_to === 'product' && discount.product_id) {
        totalQty = getQuantityByProduct(items, discount.product_id);
      } else {
        totalQty = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
      }
      if (totalQty >= (discount.min_quantity || 1)) {
        amount = baseAmount * (discountValue / 100);
      }
    } else if (discountType === 'coupon') {
      if (discountValue > 0) {
        amount = Math.min(discountValue, baseAmount);
      }
    }
    
    // Aplicar límite máximo de descuento
    if (discount.max_discount && amount > Number(discount.max_discount)) {
      amount = Number(discount.max_discount);
    }
    
    // No puede exceder la base
    if (amount > baseAmount) amount = baseAmount;
    
    return amount;
  }, [getSubtotalByCategory, getSubtotalByProduct, getQuantityByProduct]);

  // Obtener el mejor descuento aplicable (prioridad)
  const getBestApplicableDiscount = useCallback((subtotalSinIVA, items) => {
    if (availableDiscounts.length === 0) return null;
    
    const applicable = availableDiscounts.filter(d => isDiscountApplicable(d, subtotalSinIVA, items));
    if (applicable.length === 0) return null;
    
    const applicableWithAmount = applicable.map(d => ({ 
      discount: d, 
      amount: calculateDiscountAmountForOrder(d, subtotalSinIVA, items),
      details: {
        name: d.name,
        type: d.type,
        applies_to: d.applies_to,
        value: d.value,
        product_name: d.product_name,
        category_name: d.category_name
      }
    }));
    
    // Ordenar por prioridad (mayor primero) y luego por monto
    applicableWithAmount.sort((a, b) => {
      if (a.discount.priority !== b.discount.priority) {
        return (b.discount.priority || 0) - (a.discount.priority || 0);
      }
      return b.amount - a.amount;
    });
    
    return applicableWithAmount[0];
  }, [availableDiscounts, isDiscountApplicable, calculateDiscountAmountForOrder]);

  const getSubtotalSinIVA = useCallback(() => {
    if (!selectedOrder) return 0;
    return (selectedOrder.items || []).reduce((sum, item) => {
      const price = Number(item.selling_price) || Number(item.unit_price) || 0;
      const quantity = Number(item.quantity) || 1;
      return sum + (price * quantity);
    }, 0);
  }, [selectedOrder]);

  const getIvaRate = useCallback(() => ivaRateGlobal, [ivaRateGlobal]);

  const getIvaTotal = useCallback(() => {
    if (!selectedOrder) return 0;
    return (selectedOrder.items || []).reduce((sum, item) =>
      sum + (Number(item.tax_rate) || 0) * (Number(item.quantity) || 1), 0);
  }, [selectedOrder]);

  const getOrderTotal = useCallback(() => {
    if (!selectedOrder) return 0;
    if (selectedOrder.total && typeof selectedOrder.total === 'number' && selectedOrder.total > 0)
      return Number(selectedOrder.total);
    return getSubtotalSinIVA() + getIvaTotal();
  }, [selectedOrder, getSubtotalSinIVA, getIvaTotal]);

  // Actualizar valores de descuento
  const updateDiscountValues = useCallback(() => {
    if (!selectedOrder) {
      setAppliedDiscount(null);
      setDiscountAmount(0);
      setDiscountDetails(null);
      setTotalOrdenConDescuento(getOrderTotal());
      return;
    }
    
    const subtotalSinIVA = getSubtotalSinIVA();
    const ivaTotal = getIvaTotal();
    const items = selectedOrder.items || [];
    const best = getBestApplicableDiscount(subtotalSinIVA, items);
    
    if (best && best.amount > 0) {
      setAppliedDiscount(best.discount);
      setDiscountAmount(best.amount);
      setDiscountDetails(best.details);
      
      const nuevaBaseImponible = Math.max(0, subtotalSinIVA - best.amount);
      const ratio = subtotalSinIVA > 0 ? nuevaBaseImponible / subtotalSinIVA : 1;
      const nuevoIVA = Math.round(ivaTotal * ratio * 100) / 100;
      const nuevoTotal = nuevaBaseImponible + nuevoIVA;
      setTotalOrdenConDescuento(nuevoTotal);
    } else {
      setAppliedDiscount(null);
      setDiscountAmount(0);
      setDiscountDetails(null);
      setTotalOrdenConDescuento(getOrderTotal());
    }
  }, [selectedOrder, getSubtotalSinIVA, getIvaTotal, getOrderTotal, getBestApplicableDiscount]);

  // Cargar configuración fiscal
  const loadFiscalConfig = async () => {
    try {
      const res = await fetchWithAuth('/api/fiscal/config');
      if (res.ok) {
        const data = await res.json();
        if (data && data.iva_rate) setIvaRateGlobal(Number(data.iva_rate));
        if (data && data.currency_symbol) setCurrencySymbol(data.currency_symbol);
      }
    } catch (err) {
      console.error('Error cargando configuración fiscal:', err);
    }
  };

  // Cargar descuentos disponibles
  const loadDiscounts = async () => {
    try {
      const res = await fetchWithAuth('/api/discounts');
      if (res.ok) {
        const data = await res.json();
        const validDiscounts = (Array.isArray(data) ? data : []).filter(d =>
          d && d.id && d.name && d.is_active !== undefined && d.type && d.value !== undefined
        );
        setAvailableDiscounts(validDiscounts);
      } else {
        setAvailableDiscounts([]);
      }
    } catch (err) {
      console.error('Error cargando descuentos:', err);
      setAvailableDiscounts([]);
    }
  };

  useEffect(() => {
    updateDiscountValues();
  }, [selectedOrder, updateDiscountValues]);

  useEffect(() => {
    loadOrders();
    loadDiscounts();
    loadFiscalConfig();
  }, [selectedBusiness]);

  useEffect(() => {
    if (selectedOrder) updateDiscountValues();
  }, [availableDiscounts, updateDiscountValues]);

  const fmt = (n) => `${currencySymbol}${parseFloat(n || 0).toFixed(2)}`;

  const recargarOrden = async () => {
    if (!selectedOrder) return null;
    try {
      const res = await fetchWithAuth(`/api/ordenes/${selectedOrder.id}`);
      const ordenActualizada = await res.json();
      console.log('🔄 Orden recargada. Items:', ordenActualizada.items.map(i => ({ id: i.id, product_name: i.product_name, paid: i.paid })));
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
    setMixtoActive(new Set());
    setSelectedItems([]);
    setClientesDivididos([]);
    setPagosRegistrados([]);
    setTotalPagadoAcumulado(0);
    setModoDividido(false);
    setModoPorCobrar(false);
    setFacturaIndividual(false);
    setMetodoPagoNormal('cash');
    setAppliedDiscount(null);
    setDiscountAmount(0);
    setDiscountDetails(null);
    setTotalOrdenConDescuento(0);
  };

  const loadOrders = async () => {
    try {
      const res = await fetchWithAuth('/api/ordenes');
      const raw = await res.json();
      const todosActivos = Array.isArray(raw) ? raw.filter(o => o.status !== 'paid') : [];

      if (autoSelectRef.current) {
        const orderNum = String(autoSelectRef.current);
        const target = todosActivos.find(o =>
          String(o.order_number)  === orderNum ||
          String(o.numero_pedido) === orderNum
        );
        const listaCombobox = target && target.status === 'draft'
          ? [target, ...todosActivos.filter(o => o.status !== 'draft')]
          : todosActivos.filter(o => o.status !== 'draft');
        setOrders(listaCombobox);

        if (target) {
          setSelectedOrder(target);
          setClienteCedula(customerCedulaRef.current || target.customer_document_number || '9999999999');
          setClienteNombre(target.customer_name || '');
          setClienteEmail('');
          setFoundCliente(null);
          setOrderNotes(target.notes || '');
          setAmountPaid('');
          setAmountPaidRaw('');
          setSelectedItems([]);
          setClientesDivididos([]);
          setPagosRegistrados([]);
          setTotalPagadoAcumulado(0);
          setModoDividido(false);
          setModoPorCobrar(false);
          setFacturaIndividual(false);
          setError('');
        }
        autoSelectRef.current = null;
        customerCedulaRef.current = null;
      } else {
        setOrders(todosActivos.filter(o => o.status !== 'draft'));
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
          await buscarEnPadron(documento.slice(0,10), esParaComensal, comensalId);
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
      const response = await fetch(proxyUrl + targetUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: postData });
      const textResponse = await response.text();
      if (textResponse) {
        const json = JSON.parse(textResponse);
        if (json?.nombres) {
          const nombreCompleto = (json.nombres + ' ' + (json.apellidos || '')).trim();
          if (esParaComensal && comensalId) actualizarComensal(comensalId, 'nombre', nombreCompleto);
          else setClienteNombre(nombreCompleto);
        }
      }
    } catch {
      if (!esParaComensal) setClienteNombre('');
    }
  };

  const guardarCliente = async (documento, nombre, email = null) => {
    if (processingCliente) return null;
    const tipo_documento = documento.length === 13 ? 'ruc' : 'cedula';
    try {
      setProcessingCliente(true);
      const resBusqueda = await fetchWithAuth(`/api/customers/by-document?document_number=${documento}&document_type=${tipo_documento}`);
      if (resBusqueda.ok) {
        const existe = await resBusqueda.json();
        if (existe && existe.id) return existe.id;
      }
      const res = await fetchWithAuth('/api/customers', {
        method: 'POST',
        body: JSON.stringify({ nombre, cedula: documento, email, tipo_documento }),
      });
      if (res.ok) {
        const cliente = await res.json();
        return cliente.id;
      }
      return null;
    } catch (err) {
      console.error('Error guardando cliente:', err);
      return null;
    } finally {
      setProcessingCliente(false);
    }
  };

  const handleSelectOrder = (oid) => {
    const o = orders.find(x => String(x.id) === oid);
    setSelectedOrder(o || null);
    console.log('📋 Orden seleccionada. Items:', o?.items?.map(i => ({ id: i.id, nombre: i.product_name, paid: i.paid })));
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
    setModoPorCobrar(false);
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

  const applyMixtoVals = (vals) => {
    setAmountPaid(vals.cash.toFixed(2));
    setAmountPaidRaw(String(Math.round(vals.cash * 100)));
    setCardPaid(vals.card.toFixed(2));
    setCardPaidRaw(String(Math.round(vals.card * 100)));
    setTransferPaid(vals.transfer.toFixed(2));
    setTransferPaidRaw(String(Math.round(vals.transfer * 100)));
  };

  const handleMixtoField = (field, digits) => {
    const total = totalOrdenConDescuento;
    const value = parseInt(digits || '0', 10) / 100;
    const newManual = new Set(mixtoManual);
    if (value === 0) newManual.delete(field);
    else newManual.add(field);
    setMixtoManual(newManual);

    const vals = {
      cash:     field === 'cash'     ? value : (mixtoActive.has('cash')     ? (parseFloat(amountPaid) || 0)   : 0),
      card:     field === 'card'     ? value : (mixtoActive.has('card')     ? (parseFloat(cardPaid) || 0)     : 0),
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

  const toggleMixtoMetodo = (method) => {
    const total = totalOrdenConDescuento;
    const newActive = new Set(mixtoActive);
    const newManual = new Set(mixtoManual);
    const vals = {
      cash:     parseFloat(amountPaid) || 0,
      card:     parseFloat(cardPaid) || 0,
      transfer: parseFloat(transferPaid) || 0,
    };

    if (newActive.has(method)) {
      newActive.delete(method);
      newManual.delete(method);
      vals[method] = 0;
      const autoActive = [...newActive].filter(f => !newManual.has(f));
      if (autoActive.length === 1) {
        const af = autoActive[0];
        const manualSum = [...newActive].filter(f => newManual.has(f)).reduce((s, f) => s + vals[f], 0);
        vals[af] = Math.round(Math.max(0, total - manualSum) * 100) / 100;
      } else if (newActive.size === 1 && autoActive.length === 1) {
        vals[autoActive[0]] = total;
      }
    } else {
      newActive.add(method);
      const autoActive = [...newActive].filter(f => !newManual.has(f));
      if (autoActive.length === 1 && autoActive[0] === method) {
        const manualSum = [...newManual].reduce((s, f) => s + vals[f], 0);
        vals[method] = Math.round(Math.max(0, total - manualSum) * 100) / 100;
      }
    }

    setMixtoManual(newManual);
    setMixtoActive(newActive);
    applyMixtoVals(vals);
  };

  const subtotalSinIVAMostrar = getSubtotalSinIVA();
  const ivaRateMostrar = getIvaRate();
  const ivaTotalMostrar = getIvaTotal();
  const nuevaBaseImponible = Math.max(0, subtotalSinIVAMostrar - discountAmount);
  const ratioDescuento = subtotalSinIVAMostrar > 0 ? nuevaBaseImponible / subtotalSinIVAMostrar : 1;
  const nuevoIVAMostrar = Math.round(ivaTotalMostrar * ratioDescuento * 100) / 100;

  // ─── Funciones cuenta dividida ─────────────────────────────────────────────
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
      }
    ]);
  };

  const eliminarComensal = (id) => {
    if (clientesDivididos.length === 1) {
      setError('Debe haber al menos un comensal');
      return;
    }
    const comensal = clientesDivididos.find(c => c.id === id);
    if (comensal && comensal.items.length > 0) setSelectedItems(prev => [...prev, ...comensal.items]);
    setClientesDivididos(clientesDivididos.filter(c => c.id !== id));
  };

  const actualizarComensal = (id, campo, valor) => {
    setClientesDivididos(prev => prev.map(comensal =>
      comensal.id === id ? { ...comensal, [campo]: valor } : comensal
    ));
  };

  const actualizarMontoMixtoComensal = (id, tipo, valor) => {
    setClientesDivididos(prev => prev.map(comensal => {
      if (comensal.id === id) {
        const newComensal = { ...comensal };
        if (tipo === 'cash') newComensal.cashAmount = valor;
        if (tipo === 'card') newComensal.cardAmount = valor;
        if (tipo === 'transfer') newComensal.transferAmount = valor;
        newComensal.montoRecibido = (newComensal.cashAmount || 0) + (newComensal.cardAmount || 0) + (newComensal.transferAmount || 0);
        return newComensal;
      }
      return comensal;
    }));
  };

  const asignarItemsAComensal = (idComensal) => {
    if (selectedItems.length === 0) {
      setError('No hay productos seleccionados');
      return;
    }
    console.log('📦 Asignando items a comensal:', idComensal);
    console.log('IDs de items seleccionados (antes de filtrar pagados):', selectedItems);
    const itemsNoPagados = selectedItems.filter(itemId => {
      const item = selectedOrder?.items.find(i => i.id === itemId);
      return item && !item.paid;
    });
    console.log('Items no pagados (los que se asignarán):', itemsNoPagados.map(id => ({ id, nombre: selectedOrder?.items.find(i => i.id === id)?.product_name })));
    if (itemsNoPagados.length === 0) {
      setError('Los productos seleccionados ya fueron pagados');
      return;
    }
    setClientesDivididos(prev => prev.map(comensal =>
      comensal.id === idComensal
        ? { ...comensal, items: [...comensal.items, ...itemsNoPagados] }
        : comensal
    ));
    setSelectedItems([]);
    setSuccess(`${itemsNoPagados.length} producto(s) asignado(s)`);
    setTimeout(() => setSuccess(''), 2000);
  };

  const quitarItemDeComensal = (idComensal, itemId) => {
    setClientesDivididos(prev => prev.map(comensal =>
      comensal.id === idComensal
        ? { ...comensal, items: comensal.items.filter(id => id !== itemId) }
        : comensal
    ));
    setSelectedItems(prev => [...prev, itemId]);
  };

  const handleSelectItem = (itemId) => {
    const item = selectedOrder?.items.find(i => i.id === itemId);
    if (item?.paid) {
      setError('Este producto ya fue pagado');
      return;
    }
    console.log('🔍 handleSelectItem - itemId:', itemId, '| tipo:', typeof itemId, '| nombre:', item?.product_name);
    setSelectedItems(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
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
    return comensal.items.reduce((sum, itemId) => {
      const item = selectedOrder.items.find(i => i.id === itemId);
      return sum + (item ? (Number(item.selling_price) || Number(item.unit_price)) * item.quantity : 0);
    }, 0);
  };

  const calcularIVAComensal = (comensal) => {
    if (!selectedOrder) return 0;
    return comensal.items.reduce((sum, itemId) => {
      const item = selectedOrder.items.find(i => i.id === itemId);
      return sum + (item ? (Number(item.tax_rate) || 0) * item.quantity : 0);
    }, 0);
  };

  const calcularTotalComensal = (comensal) => calcularSubtotalComensal(comensal) + calcularIVAComensal(comensal);

  const changeNormal = Math.max(0, (parseFloat(amountPaid) || 0) - totalOrdenConDescuento);
  const totalPagadoMixto = (parseFloat(amountPaid) || 0) + (parseFloat(cardPaid) || 0) + (parseFloat(transferPaid) || 0);
  const faltanteMixto = Math.max(0, totalOrdenConDescuento - totalPagadoMixto);
  const cambioMixto = Math.max(0, totalPagadoMixto - totalOrdenConDescuento);
  const totalOrdenBruto = getOrderTotal();

  const FORMA_PAGO_MAP = { cash: '01', card: '19', transfer: '20', mixto: '01', split: '01' };

  // ─── Función emitirFactura ─────────────────────────────────────────────────
  async function emitirFactura(order, custCedula, custNombre, method, discountData = null, customerEmail = null) {
    const cedula = custCedula?.trim() || '9999999999';
    const isCF = cedula === '9999999999' || cedula === '9999999999999';
    const tipoId = isCF ? '07' : (cedula.length === 13 ? '04' : '05');
    const email = customerEmail || foundCliente?.email || clienteEmail.trim() || null;

    let subtotalOriginal = 0;
    let ivaSumado = 0;
    
    const itemsPayload = (order.items || []).map(item => {
      const qty = Number(item.quantity) || 1;
      const precioSinIVA = Number(item.selling_price) || Number(item.unit_price) || 0;
      const ivaUnitario = Number(item.tax_rate) || 0;
      const itemSubtotal = precioSinIVA * qty;
      const ivaItem = ivaUnitario * qty;
      
      subtotalOriginal += itemSubtotal;
      ivaSumado += ivaItem;
      
      return {
        code: item.code || 'PROD',
        description: item.product_name || 'Producto',
        qty,
        unit_price: precioSinIVA,
        subtotal: itemSubtotal,
        iva_amount: ivaItem
      };
    });
    
    if (itemsPayload.length === 0) return null;

    let descuentoTotal = discountAmount || 0;
    const nuevaBaseImponibleFact = Math.max(0, subtotalOriginal - descuentoTotal);
    const ratioFact = subtotalOriginal > 0 ? nuevaBaseImponibleFact / subtotalOriginal : 1;
    const ivaConDescuento = Math.round(ivaSumado * ratioFact * 100) / 100;
    const totalFactura = nuevaBaseImponibleFact + ivaConDescuento;

    const payload = {
      order_id: order.id,
      customer: {
        name: isCF ? 'CONSUMIDOR FINAL' : (custNombre || ''),
        ruc: isCF ? '9999999999' : cedula,
        email: email || null,
        tipo_identificacion: tipoId,
        phone: null
      },
      items: itemsPayload.map(item => ({
        code: item.code,
        description: item.description,
        qty: item.qty,
        unit_price: item.unit_price,
        subtotal: (item.subtotal * ratioFact).toFixed(2),
        iva_amount: (item.iva_amount * ratioFact).toFixed(2)
      })),
      subtotal: nuevaBaseImponibleFact.toFixed(2),
      iva_amount: ivaConDescuento.toFixed(2),
      total: totalFactura.toFixed(2),
      forma_pago: FORMA_PAGO_MAP[method] || '01',
      descuento: descuentoTotal.toFixed(2),
      iva_rate: ivaRateGlobal
    };

    try {
      const response = await fetchWithAuth('/api/einvoicing/invoices/emit', { method: 'POST', body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) {
        setError(`Error factura: ${result.error || response.status}`);
        return null;
      }
      return { id: result.id, invoice_number: result.invoice_number };
    } catch (e) {
      setError(`Error emitir factura: ${e.message}`);
      console.error(e);
      return null;
    }
  }

  // ─── Función para guardar cuenta por cobrar ────────────────────────────────
  const guardarCuentaPorCobrar = async () => {
    if (processingCxC) return null;
    if (!selectedOrder) return null;

    const clienteId   = foundCliente?.id   || null;
    const nombreCliente = foundCliente?.name || clienteNombre || 'CONSUMIDOR FINAL';
    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);

    try {
      setProcessingCxC(true);
      const response = await fetchWithAuth('/api/accounting-receivable/receivables', {
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
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al guardar cuenta por cobrar');
      return data.data;
    } catch (err) {
      console.error('Error guardando cuenta por cobrar:', err);
      setError(`Error al guardar cuenta por cobrar: ${err.message}`);
      return null;
    } finally {
      setProcessingCxC(false);
    }
  };

  // ─── PAGO DIFERIDO ─────────────────────────────────────────────────────────
  const pagoPorCobrar = async () => {
    setPrintLoading(true);
    try {
      const receivable = await guardarCuentaPorCobrar();
      if (!receivable) throw new Error('No se pudo guardar la cuenta por cobrar');

      await fetchWithAuth(`/api/ordenes/${selectedOrder.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'draft',
          payment_method: 'credit',
          notes: `${orderNotes || ''} - Cuenta por cobrar registrada (ID: ${receivable.id})`.trim()
        })
      });

      setOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
      setSuccess(`✅ Cuenta por cobrar registrada. Orden #${selectedOrder.order_number} pendiente de cobro. Vence en 30 días.`);
      await resetForm();
      setSelectedOrder(null);

    } catch (err) {
      setError(err.message || 'Error al procesar cuenta por cobrar');
    } finally {
      setPrintLoading(false);
    }
  };

  // ─── IMPRESIÓN ─────────────────────────────────────────────────────────────
  const imprimirTicket = async (order, paid, cambio, invoiceNumber = null, splitMode = null, customerName = null, openDrawer = false) => {
    try {
      const printerConfig = await getPrinterConfig('printer_main');
      const itemsToPrint = (order.items || []).map(item => ({
        description: item.product_name || 'Producto',
        quantity: item.quantity,
        price: Number(item.selling_price) || Number(item.unit_price) || 0,
        total: (Number(item.selling_price) || Number(item.unit_price) || 0) * item.quantity
      }));
      const printSubtotal = itemsToPrint.reduce((s, i) => s + i.total, 0);
      const printIvaBase = (order.items || []).reduce((s, item) =>
        s + (Number(item.tax_rate) || 0) * (Number(item.quantity) || 1), 0);
      const printBaseConDesc = Math.max(0, printSubtotal - discountAmount);
      const printRatio = printSubtotal > 0 ? printBaseConDesc / printSubtotal : 1;
      const nuevoIVAImpresion = Math.round(printIvaBase * printRatio * 100) / 100;
      const printTotalFinal = printBaseConDesc + nuevoIVAImpresion;
      await print('printer_main', 'invoice', {
        bizInfo,
        invoice: { number: invoiceNumber || order.order_number || order.id, date: new Date().toISOString() },
        customer: { name: customerName || clienteNombre || 'CONSUMIDOR FINAL', id: clienteCedula || '9999999999' },
        items: itemsToPrint,
        subtotal: printSubtotal,
        discount: discountAmount,
        tax: nuevoIVAImpresion,
        taxRate: ivaRateGlobal,
        total: printTotalFinal,
        payment: { cash: paid, card: 0, other: 0 },
        printerFooter: printerConfig.footer,
        discount: appliedDiscount ? { 
          name: appliedDiscount.name, 
          type: appliedDiscount.type, 
          value: appliedDiscount.value, 
          amount: discountAmount,
          applies_to: appliedDiscount.applies_to,
          details: discountDetails
        } : null
      }, openDrawer);
    } catch (err) {
      console.error('Error imprimiendo:', err);
      setError('Error al imprimir');
    }
  };

  // ─── COBRAR COMENSAL (modo dividido) ──────────────────────────────────────
  const cobrarComensal = async (comensal) => {
    if (modoPorCobrar) {
      setError('En modo "Por Cobrar" no se puede cobrar comensales. Finaliza la orden como cuenta por pagar.');
      return;
    }
    
    if (comensal.items.length === 0) {
      setError('Este comensal no tiene productos asignados');
      return;
    }

    const totalComensal = calcularTotalComensal(comensal);
    if (comensal.metodoPago === 'cash' && comensal.montoRecibido < totalComensal) {
      setError(`Monto insuficiente. Total: ${fmt(totalComensal)}, Recibido: ${fmt(comensal.montoRecibido)}`);
      return;
    }
    if (comensal.metodoPago === 'mixto' && comensal.montoRecibido < totalComensal) {
      setError(`Monto insuficiente. Total pagado: ${fmt(comensal.montoRecibido)}. Total: ${fmt(totalComensal)}`);
      return;
    }

    setPrintLoading(true);
    try {
      let cedula = '9999999999', nombre = 'CONSUMIDOR FINAL', email = null;
      if (facturaIndividual) {
        cedula = comensal.cedula?.trim() || '9999999999';
        nombre = comensal.nombre?.trim() || 'CONSUMIDOR FINAL';
        email = comensal.email || null;
      } else {
        cedula = clienteCedula?.trim() || '9999999999';
        nombre = clienteNombre?.trim() || 'CONSUMIDOR FINAL';
        email = clienteEmail?.trim() || null;
      }
      let clienteId = await guardarCliente(cedula, nombre, email);

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
        if (comensal.transferAmount > 0) payments.push({ method: 'transfer', amount: comensal.transferAmount, reference_number: comensal.referencia || null });
      }

      await fetchWithAuth(`/api/ordenes/${selectedOrder.id}/pay-items`, {
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

      if (facturaIndividual) {
        const partialOrder = { ...selectedOrder, items: selectedOrder.items.filter(i => comensal.items.includes(i.id)) };
        const invoiceData = await emitirFactura(partialOrder, cedula, nombre, 'split', null, comensal.email);
        await imprimirTicket(partialOrder, totalComensal, comensal.montoRecibido - totalComensal, invoiceData?.invoice_number, 'split', nombre, debeAbrirCajon);
        setSuccess(`Factura generada para ${nombre}`);
      } else {
        const itemsCompletos = comensal.items.map(itemId => selectedOrder?.items?.find(i => i.id === itemId)).filter(i => i);
        setPagosRegistrados(prev => [...prev, { cliente: { cedula, nombre, email }, items: itemsCompletos, total: totalComensal, metodoPago: comensal.metodoPago, payments }]);
        setSuccess(`Pago registrado para ${nombre}`);
      }

      setClientesDivididos(prev => prev.filter(c => c.id !== comensal.id));
      const ordenActualizada = await recargarOrden();
      const itemsPendientes = ordenActualizada?.items?.filter(i => !i.paid).length || 0;

      if (itemsPendientes === 0) {
        if (!facturaIndividual) {
          let itemsFinales = [];
          for (const pago of pagosRegistrados) if (pago.items) itemsFinales.push(...pago.items);
          const itemsActuales = comensal.items.map(itemId => selectedOrder?.items?.find(i => i.id === itemId)).filter(i => i);
          itemsActuales.forEach(item => { if (!itemsFinales.some(i => i.id === item.id)) itemsFinales.push(item); });

          if (itemsFinales.length > 0) {
            const ordenCompleta = { ...selectedOrder, items: itemsFinales };
            const discountInfo = appliedDiscount ? { id: appliedDiscount.id, name: appliedDiscount.name, amount: discountAmount } : null;
            const invoiceData = await emitirFactura(ordenCompleta, clienteCedula || '9999999999', clienteNombre || 'CONSUMIDOR FINAL', 'split', discountInfo, clienteEmail);
            await imprimirTicket(ordenCompleta, totalOrdenConDescuento, 0, invoiceData?.invoice_number, 'split', 'FACTURA FINAL', false);
          }
        } else {
          setSuccess('✅ Todos los comensales facturados. Orden completada.');
        }

        await fetchWithAuth(`/api/ordenes/${selectedOrder.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'paid',
            payment_method: 'split',
            amount_paid: totalOrdenConDescuento,
            notes: orderNotes,
            discount_id: appliedDiscount?.id || null,
            discount_amount: discountAmount
          })
        });

        setOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
        setSelectedOrder(null);
        setClientesDivididos([]);
        setPagosRegistrados([]);
        setTotalPagadoAcumulado(0);
        setSuccess(prev => prev.includes('Factura final') ? prev : '✅ Orden completada');
      } else {
        const comensalesPendientes = clientesDivididos.filter(c => c.id !== comensal.id);
        if (comensalesPendientes.length === 0) {
          setClientesDivididos([{ id: Date.now(), cedula: '', nombre: '', email: '', items: [], metodoPago: 'cash', montoRecibido: 0, referencia: '', cashAmount: 0, cardAmount: 0, transferAmount: 0 }]);
        }
        setSelectedItems([]);
        setSuccess(`Pago completado. Quedan ${itemsPendientes} productos por pagar.`);
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setPrintLoading(false);
    }
  };

  // ─── Actualizar cuenta por cobrar cuando se paga una orden draft ──────────
  const marcarCuentaPorCobrarComoPagada = async (orderNumber, total, metodoPago) => {
    try {
      const res = await fetchWithAuth(`/api/accounting-receivable/receivables?search=${encodeURIComponent(orderNumber)}&limit=5`);
      const data = await res.json();
      const lista = Array.isArray(data.data) ? data.data : data.receivables || [];
      const receivable = lista.find(r =>
        String(r.order_number) === String(orderNumber) ||
        String(r.invoice_number) === String(orderNumber)
      );
      if (!receivable) return;
      await fetchWithAuth(`/api/accounting-receivable/receivables/${receivable.id}/payments`, {
        method: 'POST',
        body: JSON.stringify({ amount: total, payment_method: metodoPago })
      });
    } catch (err) {
      console.error('Error actualizando cuenta por cobrar:', err);
    }
  };

  // ─── PAGO NORMAL ──────────────────────────────────────────────────────────
  const pagoNormal = async () => {
    if (modoPorCobrar) {
      await pagoPorCobrar();
      return;
    }
    
    setPrintLoading(true);
    try {
      let cedula = clienteCedula?.trim() || '9999999999';
      let nombre = clienteNombre?.trim() || 'CONSUMIDOR FINAL';
      let clienteId = await guardarCliente(cedula, nombre, clienteEmail?.trim() || null);
      let invoiceData = null;
      const discountInfo = appliedDiscount ? { id: appliedDiscount.id, name: appliedDiscount.name, amount: discountAmount, type: appliedDiscount.type, applies_to: appliedDiscount.applies_to } : null;

      let debeAbrirCajon = false;

      if (metodoPagoNormal === 'cash') {
        const paid = parseFloat(amountPaid) || 0;
        if (paid < totalOrdenConDescuento) throw new Error(`Monto insuficiente. Total: ${fmt(totalOrdenConDescuento)}`);
        await fetchWithAuth(`/api/ordenes/${selectedOrder.id}/status`, {
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
            discount_amount: discountAmount
          }),
        });
        invoiceData = await emitirFactura(selectedOrder, cedula, nombre, 'cash', discountInfo, clienteEmail);
        debeAbrirCajon = true;
        await imprimirTicket(selectedOrder, totalOrdenConDescuento, paid - totalOrdenConDescuento, invoiceData?.invoice_number, null, null, debeAbrirCajon);
      } else if (metodoPagoNormal === 'card') {
        if (!refCard) throw new Error('Ingrese la referencia de la tarjeta');
        await fetchWithAuth(`/api/ordenes/${selectedOrder.id}/status`, {
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
            discount_amount: discountAmount
          }),
        });
        invoiceData = await emitirFactura(selectedOrder, cedula, nombre, 'card', discountInfo, clienteEmail);
        debeAbrirCajon = false;
        await imprimirTicket(selectedOrder, totalOrdenConDescuento, 0, invoiceData?.invoice_number, null, null, debeAbrirCajon);
      } else if (metodoPagoNormal === 'transfer') {
        if (!refTransfer) throw new Error('Ingrese la referencia de la transferencia');
        await fetchWithAuth(`/api/ordenes/${selectedOrder.id}/status`, {
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
            discount_amount: discountAmount
          }),
        });
        invoiceData = await emitirFactura(selectedOrder, cedula, nombre, 'transfer', discountInfo, clienteEmail);
        debeAbrirCajon = false;
        await imprimirTicket(selectedOrder, totalOrdenConDescuento, 0, invoiceData?.invoice_number, null, null, debeAbrirCajon);
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
        await fetchWithAuth(`/api/ordenes/${selectedOrder.id}/status`, {
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
            discount_amount: discountAmount
          }),
        });
        invoiceData = await emitirFactura(selectedOrder, cedula, nombre, 'mixto', discountInfo, clienteEmail);
        debeAbrirCajon = (cashNeeded > 0);
        await imprimirTicket(selectedOrder, totalOrdenConDescuento, cashAmt - cashNeeded, invoiceData?.invoice_number, null, null, debeAbrirCajon);
      }

      if (selectedOrder.status === 'draft') {
        await marcarCuentaPorCobrarComoPagada(selectedOrder.order_number, totalOrdenConDescuento, metodoPagoNormal);
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

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <PageTemplate title="Cobrar Orden" subtitle="Cobrar órdenes abiertas, imprimir recibo y abrir caja" backButton>
      <div className="checkout-modern-main">
        <div className="checkout-modern-card">
          <div className="cmbx-row">
            <select value={selectedOrder?.id || ''} onChange={e => handleSelectOrder(e.target.value)} className="combobox" style={{ width: '130px' }}>
              <option value="">No. Orden</option>
              {orders.map(order => (
                <option key={order.id} value={order.id}>
                  {order.mesa_numero ? `Mesa ${order.mesa_numero}` : order.order_type === 'delivery' ? 'DELIVERY' : 'PARA LLEVAR'} - #{order.order_number || order.id}
                </option>
              ))}
            </select>

            {(!modoDividido || (modoDividido && !facturaIndividual)) && (
              <div className="cliente-fields">
                <input type="text" placeholder="No. Cédula/RUC" value={clienteCedula}
                  onChange={e => setClienteCedula(e.target.value.replace(/\D/g, '').slice(0,13))}
                  onBlur={e => onClienteCedulaBlurOrEnter(e, false, null)}
                  onKeyPress={e => onClienteCedulaBlurOrEnter(e, false, null)}
                  disabled={!selectedOrder} style={{ width: '135px' }} />
                {clientApiLoading && <div className="spinner-small"></div>}
                <input type="text" placeholder="Nombre cliente" value={clienteNombre}
                  onChange={e => setClienteNombre(e.target.value)} disabled={!selectedOrder} style={{ width: '300px' }} />
                <input type="email" placeholder="Email (factura)" value={clienteEmail}
                  onChange={e => setClienteEmail(e.target.value)} disabled={!selectedOrder} style={{ width: '300px' }} />
              </div>
            )}
            <OpenDrawerButton />
          </div>

          {error && <div className="error-msg">{error}</div>}
          {success && <div className="success-msg">{success}</div>}
          {printerError && <div className="error-msg">⚠️ {printerError}</div>}

          {selectedOrder && (
            <>
              <div className="pay-methods">
                <button className={!modoDividido && !modoPorCobrar ? "pay-btn selected" : "pay-btn"} onClick={() => { 
                  setModoDividido(false); 
                  setModoPorCobrar(false);
                  setClientesDivididos([]); 
                  setSelectedItems([]); 
                }}>
                  <DollarSign size={15} /> Normal
                </button>
                <button className={modoDividido ? "pay-btn selected" : "pay-btn"} onClick={() => {
                  setModoDividido(true);
                  setModoPorCobrar(false);
                  setFacturaIndividual(false);
                  if (clientesDivididos.length === 0) {
                    setClientesDivididos([{ id: Date.now(), cedula: '', nombre: '', email: '', items: [], metodoPago: 'cash', montoRecibido: 0, referencia: '', cashAmount: 0, cardAmount: 0, transferAmount: 0 }]);
                  }
                }}>
                  <Users size={15} /> Dividir Cuenta
                </button>
                <button className={modoPorCobrar ? "pay-btn selected" : "pay-btn"} onClick={() => {
                  setModoPorCobrar(true);
                  setModoDividido(false);
                  setClientesDivididos([]);
                  setSelectedItems([]);
                }}>
                  <FiClock size={15} /> Por Pagar
                </button>
              </div>

              {modoDividido && (
                <div className="factura-opcion">
                  <label>
                    <input type="checkbox" checked={facturaIndividual} onChange={e => {
                      setFacturaIndividual(e.target.checked);
                      setClientesDivididos([{ id: Date.now(), cedula: '', nombre: '', email: '', items: [], metodoPago: 'cash', montoRecibido: 0, referencia: '', cashAmount: 0, cardAmount: 0, transferAmount: 0 }]);
                      setSelectedItems([]);
                    }} />
                    <span>📄 Factura INDIVIDUAL por cada comensal</span>
                  </label>
                  <small>{facturaIndividual ? 'Cada comensal recibe su factura con sus datos' : 'Una sola factura al final con los datos del cliente principal'}</small>
                </div>
              )}

              {modoPorCobrar && (
                <div className="por-cobrar-info">
                  <small>ℹ️ Esta orden se guardará como cuenta por pagar a proveedor. No se emitirá factura ni se abrirá cajón.</small>
                </div>
              )}

              <div className="order-details">
                <div className="order-head">
                  <b>{selectedOrder.mesa_numero ? `Mesa ${selectedOrder.mesa_numero}` : selectedOrder.order_type} #{selectedOrder.order_number || selectedOrder.id}</b>
                  {modoDividido && selectedItems.length > 0 && <span className="badge">{selectedItems.length} producto(s) seleccionado(s)</span>}
                  {appliedDiscount && discountAmount > 0 && (
                    <span className="discount-badge">
                      <FiPercent size={12} /> {appliedDiscount.name} - {fmt(discountAmount)} OFF
                    </span>
                  )}
                </div>

                {!modoDividido && !modoPorCobrar ? (
                  // Modo normal
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
                      <div className="sub-iva-total"><span>SUBTOTAL:</span><span>{fmt(subtotalSinIVAMostrar)}</span></div>
                      {appliedDiscount && discountAmount > 0 && (
                        <div className="sub-iva-total discount-row">
                          <span>
                            <FiTag size={12} /> DESCUENTO ({appliedDiscount.name}): 
                            {appliedDiscount.type === 'percentage' ? ` ${appliedDiscount.value}%` : ` $${appliedDiscount.value}`}
                          </span>
                          <span style={{ color: '#10b981' }}>-{fmt(discountAmount)}</span>
                        </div>
                      )}
                      <div className="sub-iva-total"><span>BASE IMPONIBLE:</span><span>{fmt(nuevaBaseImponible)}</span></div>
                      <div className="sub-iva-total"><span>IVA ({ivaRateMostrar}%):</span><span>{fmt(nuevoIVAMostrar)}</span></div>
                      <div className="sub-iva-total total-row"><span><strong>TOTAL CON DESCUENTO:</strong></span><span className="total-amount"><strong>{fmt(totalOrdenConDescuento)}</strong></span></div>
                    </div>
                    <div className="metodo-pago-seleccion">
                      <button className={metodoPagoNormal === 'cash' ? "selected" : ""} onClick={() => setMetodoPagoNormal('cash')}><FaHandHoldingDollar size={20} /> Efectivo</button>
                      <button className={metodoPagoNormal === 'card' ? "selected" : ""} onClick={() => setMetodoPagoNormal('card')}><FiCreditCard size={20} /> Tarjeta</button>
                      <button className={metodoPagoNormal === 'transfer' ? "selected" : ""} onClick={() => setMetodoPagoNormal('transfer')}><FiSmartphone size={20} /> Transferencia</button>
                      <button className={metodoPagoNormal === 'mixto' ? "selected" : ""} onClick={() => { setMetodoPagoNormal('mixto'); setAmountPaidRaw(''); setAmountPaid(''); setCardPaidRaw(''); setCardPaid(''); setTransferPaidRaw(''); setTransferPaid(''); setMixtoManual(new Set()); setMixtoActive(new Set()); }}><FiGrid size={20} /> Mixto</button>
                    </div>

                    {metodoPagoNormal === 'cash' && (
                      <div className="payment-cash-row">
                        <div className="payment-field"><label><BsCurrencyExchange size={20} /> Recibido:</label><input type="text" inputMode="numeric" value={amountPaid} onChange={e => { let digits = e.target.value.replace(/\D/g, ''); if (!digits) digits = '0'; if (digits.length > 8) digits = digits.slice(0,8); setAmountPaidRaw(digits); setAmountPaid((parseInt(digits,10)/100).toFixed(2)); }} placeholder="0.00" /></div>
                        <div className="payment-field cambio-field"><label><BsCurrencyExchange size={20} /> Cambio:</label><span className="cambio-amount">{fmt(changeNormal)}</span></div>
                      </div>
                    )}

                    {(metodoPagoNormal === 'card' || metodoPagoNormal === 'transfer') && (
                      <div className="payment-reference-row">
                        <label>{metodoPagoNormal === 'card' ? <FiCreditCard size={20} /> : <FaMoneyBillTransfer size={20} />} Referencia:</label>
                        <input type="text" value={metodoPagoNormal === 'card' ? refCard : refTransfer} onChange={e => metodoPagoNormal === 'card' ? setRefCard(e.target.value) : setRefTransfer(e.target.value)} placeholder="Número de referencia" />
                      </div>
                    )}

                    {metodoPagoNormal === 'mixto' && (
                      <>
                        <div className="mixto-toggle-row">
                          {[
                            { key: 'cash', label: 'Efectivo', icon: <FaHandHoldingDollar size={16} /> },
                            { key: 'card', label: 'Tarjeta', icon: <FiCreditCard size={16} /> },
                            { key: 'transfer', label: 'Transferencia', icon: <FaMoneyBillTransfer size={16} /> },
                          ].map(({ key, label, icon }) => (
                            <button key={key} type="button"
                              className={`mixto-toggle${mixtoActive.has(key) ? ' active' : ''}`}
                              onClick={() => toggleMixtoMetodo(key)}
                            >
                              {icon} {label}
                            </button>
                          ))}
                        </div>

                        {mixtoActive.size > 0 && (
                          <div className="payment-mixed-row">
                            {mixtoActive.has('cash') && (
                              <div className="mixed-field">
                                <label><FaHandHoldingDollar size={20} /> Efectivo:</label>
                                <input type="text" inputMode="numeric" value={amountPaid}
                                  onChange={e => { let d = e.target.value.replace(/\D/g, ''); if (!d) d = '0'; if (d.length > 8) d = d.slice(0, 8); handleMixtoField('cash', d); }}
                                  placeholder="0.00" />
                              </div>
                            )}
                            {mixtoActive.has('card') && (
                              <div className="mixed-field">
                                <label><FiCreditCard size={20} /> Tarjeta:</label>
                                <input type="text" inputMode="numeric" value={cardPaid}
                                  onChange={e => { let d = e.target.value.replace(/\D/g, ''); if (!d) d = '0'; if (d.length > 8) d = d.slice(0, 8); handleMixtoField('card', d); }}
                                  placeholder="0.00" />
                                <input type="text" placeholder="Ref. tarjeta" value={refCard} onChange={e => setRefCard(e.target.value)} style={{ marginTop: 4 }} />
                              </div>
                            )}
                            {mixtoActive.has('transfer') && (
                              <div className="mixed-field">
                                <label><FaMoneyBillTransfer size={20} /> Transferencia:</label>
                                <input type="text" inputMode="numeric" value={transferPaid}
                                  onChange={e => { let d = e.target.value.replace(/\D/g, ''); if (!d) d = '0'; if (d.length > 8) d = d.slice(0, 8); handleMixtoField('transfer', d); }}
                                  placeholder="0.00" />
                                <input type="text" placeholder="Ref. transferencia" value={refTransfer} onChange={e => setRefTransfer(e.target.value)} style={{ marginTop: 4 }} />
                              </div>
                            )}
                          </div>
                        )}

                        {mixtoActive.size > 0 && (
                          <div className="mixed-total-row">
                            <div className="mixed-total-item"><span><IoFileTrayFull size={20} /> Total Ingresado:</span><strong>{fmt(totalPagadoMixto)}</strong></div>
                            {faltanteMixto > 0 && <div className="mixed-total-item warning"><span><CiWarning size={20} /> Faltante:</span><strong>{fmt(faltanteMixto)}</strong></div>}
                            {cambioMixto > 0 && <div className="mixed-total-item success"><span><BsCurrencyExchange size={20} /> Cambio:</span><strong>{fmt(cambioMixto)}</strong></div>}
                          </div>
                        )}
                      </>
                    )}
                  </>
                ) : modoDividido ? (
                  // Modo dividido
                  <div className="order-items">
                    <div className="section-title"><IoFileTrayFull size={14} /> Productos pendientes:</div>
                    {selectedOrder.items.filter(item => !item.paid).map((item, idx) => (
                      <div key={idx} className="item-line" style={{ background: selectedItems.includes(item.id) ? 'rgba(16,185,129,0.08)' : 'transparent' }}>
                        <input type="checkbox" checked={selectedItems.includes(item.id)} onChange={() => handleSelectItem(item.id)} disabled={item.paid} />
                        <span>{item.quantity}x {item.product_name}</span>
                        <span className="item-amt">{fmt((Number(item.selling_price) || Number(item.unit_price)) * item.quantity)}</span>
                        {item.paid && <span className="paid-badge">✔ PAGADO</span>}
                      </div>
                    ))}
                    {selectedOrder.items.filter(item => !item.paid).length === 0 && <div className="empty-state">✓ Todos los productos han sido pagados</div>}
                    
                    {selectedItems.length > 0 && (
                      <div className="totals-footer small"><div>Seleccionado: {fmt(getSplitSubtotal() + getSplitTax())}</div></div>
                    )}

                    <div className="clientes-container">
                      <div className="clientes-header">
                        <span><FiUsersIcon size={18} /> Comensales</span>
                        <button onClick={agregarComensal} className="btn-add"><FiPlus size={14} /> Agregar Comensal</button>
                      </div>

                      {clientesDivididos.map((comensal, idx) => {
                        const subtotalC = calcularSubtotalComensal(comensal);
                        const ivaC = calcularIVAComensal(comensal);
                        const totalC = subtotalC + ivaC;
                        const recibido = comensal.montoRecibido || 0;
                        const cambioC = recibido - totalC;
                        const totalPagadoMixtoComensal = (comensal.cashAmount || 0) + (comensal.cardAmount || 0) + (comensal.transferAmount || 0);
                        const cambioMixtoComensal = Math.max(0, totalPagadoMixtoComensal - totalC);
                        const faltanteMixtoComensal = Math.max(0, totalC - totalPagadoMixtoComensal);

                        return (
                          <div key={comensal.id} className="comensal-card">
                            <div className="comensal-header">
                              <span className="comensal-titulo"><FiUsersIcon size={14} /> Comensal {idx + 1}</span>
                              {clientesDivididos.length > 1 && <button onClick={() => eliminarComensal(comensal.id)} className="btn-delete"><FiX size={14} /> Eliminar</button>}
                            </div>

                            {facturaIndividual ? (
                              <div className="comensal-datos">
                                <div className="busqueda-container">
                                  <input type="text" placeholder="Cédula/RUC" value={comensal.cedula || ''}
                                    onChange={e => {
                                      const val = e.target.value.replace(/\D/g, '').slice(0,13);
                                      actualizarComensal(comensal.id, 'cedula', val);
                                      if (val.length === 10 || val.length === 13) buscarClientePorDocumento(val, true, comensal.id);
                                      else { actualizarComensal(comensal.id, 'nombre', ''); actualizarComensal(comensal.id, 'email', ''); }
                                    }} />
                                  {clientApiLoading && <div className="spinner-small"></div>}
                                </div>
                                <input type="text" placeholder="Nombre completo" value={comensal.nombre || ''} onChange={e => actualizarComensal(comensal.id, 'nombre', e.target.value)} />
                                <input type="email" placeholder="Email (factura)" value={comensal.email || ''} onChange={e => actualizarComensal(comensal.id, 'email', e.target.value)} />
                              </div>
                            ) : (
                              <div className="comensal-sin-datos"><span className="comensal-numero">Comensal {idx + 1}</span></div>
                            )}

                            <div className="productos-asignados">
                              <span>🍽️ Productos asignados:</span>
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

                            <div className="metodo-pago-seleccion">
                              <button className={comensal.metodoPago === 'cash' ? "selected" : ""} onClick={() => actualizarComensal(comensal.id, 'metodoPago', 'cash')}><FaHandHoldingDollar size={16} /> Efectivo</button>
                              <button className={comensal.metodoPago === 'card' ? "selected" : ""} onClick={() => actualizarComensal(comensal.id, 'metodoPago', 'card')}><FiCreditCard size={16} /> Tarjeta</button>
                              <button className={comensal.metodoPago === 'transfer' ? "selected" : ""} onClick={() => actualizarComensal(comensal.id, 'metodoPago', 'transfer')}><FaMoneyBillTransfer size={16} /> Transferencia</button>
                              <button className={comensal.metodoPago === 'mixto' ? "selected" : ""} onClick={() => actualizarComensal(comensal.id, 'metodoPago', 'mixto')}><FiGrid size={16} /> Mixto</button>
                            </div>

                            {comensal.metodoPago === 'cash' && (
                              <div className="payment-cash-row">
                                <div className="payment-field"><label><BsCurrencyExchange size={16} /> Recibido:</label><input type="text" inputMode="numeric" value={recibido > 0 ? recibido.toFixed(2) : ''} onChange={e => { let digits = e.target.value.replace(/\D/g, ''); if (!digits) digits = '0'; const value = parseInt(digits,10)/100; actualizarComensal(comensal.id, 'montoRecibido', value); }} placeholder="0.00" /></div>
                                <div className="payment-field cambio-field"><label><BsCurrencyExchange size={16} /> Cambio:</label><span className="cambio-amount">{fmt(Math.max(0, cambioC))}</span></div>
                              </div>
                            )}

                            {(comensal.metodoPago === 'card' || comensal.metodoPago === 'transfer') && (
                              <div className="payment-reference-row">
                                <label>{comensal.metodoPago === 'card' ? <FiCreditCard size={16} /> : <FaMoneyBillTransfer size={16} />} Referencia:</label>
                                <input type="text" value={comensal.referencia || ''} onChange={e => actualizarComensal(comensal.id, 'referencia', e.target.value)} placeholder="Número de referencia" />
                              </div>
                            )}

                            {comensal.metodoPago === 'mixto' && (
                              <>
                                <div className="payment-mixed-row">
                                  <div className="mixed-field"><label><FaHandHoldingDollar size={16} /> Efectivo:</label><input type="text" inputMode="numeric" value={comensal.cashAmount > 0 ? comensal.cashAmount.toFixed(2) : ''} onChange={e => { let digits = e.target.value.replace(/\D/g, ''); if (!digits) digits = '0'; const value = parseInt(digits,10)/100; actualizarMontoMixtoComensal(comensal.id, 'cash', value); }} placeholder="0.00" /></div>
                                  <div className="mixed-field"><label><FiCreditCard size={16} /> Tarjeta:</label><input type="text" inputMode="numeric" value={comensal.cardAmount > 0 ? comensal.cardAmount.toFixed(2) : ''} onChange={e => { let digits = e.target.value.replace(/\D/g, ''); if (!digits) digits = '0'; const value = parseInt(digits,10)/100; actualizarMontoMixtoComensal(comensal.id, 'card', value); }} placeholder="0.00" /></div>
                                  <div className="mixed-field"><label><FaMoneyBillTransfer size={16} /> Transferencia:</label><input type="text" inputMode="numeric" value={comensal.transferAmount > 0 ? comensal.transferAmount.toFixed(2) : ''} onChange={e => { let digits = e.target.value.replace(/\D/g, ''); if (!digits) digits = '0'; const value = parseInt(digits,10)/100; actualizarMontoMixtoComensal(comensal.id, 'transfer', value); }} placeholder="0.00" /></div>
                                </div>
                                <div className="mixed-total-row">
                                  <div className="mixed-total-item"><span><IoFileTrayFull size={14} /> Total Ingresado:</span><strong>{fmt(totalPagadoMixtoComensal)}</strong></div>
                                  {faltanteMixtoComensal > 0 && <div className="mixed-total-item warning"><span><CiWarning size={14} /> Faltante:</span><strong>{fmt(faltanteMixtoComensal)}</strong></div>}
                                  {cambioMixtoComensal > 0 && <div className="mixed-total-item success"><span><BsCurrencyExchange size={14} /> Cambio:</span><strong>{fmt(cambioMixtoComensal)}</strong></div>}
                                </div>
                              </>
                            )}

                            <div className="comensal-totales">
                              <div><div>Subtotal: <strong>{fmt(subtotalC)}</strong></div><div>IVA: <strong>{fmt(ivaC)}</strong></div></div>
                              <div>
                                <div className="total-valor">Total: {fmt(totalC)}</div>
                                {comensal.metodoPago === 'cash' && recibido > 0 && (
                                  <div className={cambioC >= 0 ? "cambio-success" : "cambio-error"}>
                                    {cambioC >= 0 ? `💰 Cambio: ${fmt(cambioC)}` : `⚠️ Falta: ${fmt(Math.abs(cambioC))}`}
                                  </div>
                                )}
                                <button className="btn-cobrar" onClick={() => cobrarComensal(comensal)}
                                  disabled={(comensal.metodoPago === 'cash' && recibido < totalC) || (comensal.metodoPago === 'mixto' && totalPagadoMixtoComensal < totalC) || comensal.items.length === 0}>
                                  <FiCheck size={14} /> Cobrar a este comensal
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {selectedItems.length > 0 && clientesDivididos.length > 0 && (
                        <div className="asignar-container">
                          <select className="asignar-select" id="comensalSelect">
                            {clientesDivididos.map((c, idx) => <option key={c.id} value={c.id}>Comensal {idx + 1}</option>)}
                          </select>
                          <button className="btn-asignar" onClick={() => { const select = document.getElementById('comensalSelect'); const comensalId = parseInt(select.value); asignarItemsAComensal(comensalId); }}><FiPlus size={14} /> Asignar {selectedItems.length} producto(s)</button>
                        </div>
                      )}
                      {selectedItems.length > 0 && <div className="warning-box"><CiWarning size={14} /> {selectedItems.length} producto(s) sin asignar</div>}
                    </div>
                  </div>
                ) : (
                  // Modo "Por Pagar" - vista simplificada
                  <div className="por-cobrar-view">
                    <div className="order-items">
                      {selectedOrder.items.filter(item => !item.paid).map((item, idx) => (
                        <div key={idx} className="item-line">
                          <span>{item.quantity}x {item.product_name}</span>
                          <span className="item-amt">{fmt((Number(item.selling_price) || Number(item.unit_price)) * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="totals-footer">
                      <div className="sub-iva-total"><span>SUBTOTAL:</span><span>{fmt(subtotalSinIVAMostrar)}</span></div>
                      {appliedDiscount && discountAmount > 0 && (
                        <div className="sub-iva-total discount-row">
                          <span>DESCUENTO ({appliedDiscount.type === 'percentage' ? `${appliedDiscount.value}%` : `$${appliedDiscount.value}`}):</span>
                          <span style={{ color: '#10b981' }}>-{fmt(discountAmount)}</span>
                        </div>
                      )}
                      <div className="sub-iva-total"><span>BASE IMPONIBLE:</span><span>{fmt(nuevaBaseImponible)}</span></div>
                      <div className="sub-iva-total"><span>IVA ({ivaRateMostrar}%):</span><span>{fmt(nuevoIVAMostrar)}</span></div>
                      <div className="sub-iva-total total-row"><span><strong>TOTAL:</strong></span><span className="total-amount"><strong>{fmt(totalOrdenConDescuento)}</strong></span></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="actions-row">
                <button className="btn-guardar" disabled={printLoading || (!modoDividido && !modoPorCobrar && metodoPagoNormal === 'cash' && (!amountPaid || parseFloat(amountPaid) < totalOrdenConDescuento))}
                  onClick={() => { 
                    if (!modoDividido) {
                      pagoNormal();
                    }
                  }}>
                  <Check size={16} /> {printLoading ? 'Procesando...' : modoDividido ? 'CONTINUAR' : (modoPorCobrar ? 'REGISTRAR CUENTA POR PAGAR' : 'COBRAR')}
                </button>
                <button className="btn-cancelar" onClick={() => { setSelectedOrder(null); setClientesDivididos([]); setSelectedItems([]); setPagosRegistrados([]); setTotalPagadoAcumulado(0); setModoDividido(false); setModoPorCobrar(false); }}>
                  <X size={16} /> Cancelar
                </button>
              </div>

              {modoDividido && !facturaIndividual && pagosRegistrados.length > 0 && (
                <div className="historial-pagos">
                  <div className="historial-titulo">📋 Pagos realizados:</div>
                  {pagosRegistrados.map((pago, idx) => <div key={idx} className="historial-item">• Pago {idx + 1} - {fmt(pago.total)} ({pago.items.length} productos)</div>)}
                  <div className="historial-total">Total pagado: {fmt(pagosRegistrados.reduce((s, p) => s + p.total, 0))} / Total orden: {fmt(totalOrdenBruto)}</div>
                  {totalPagadoAcumulado >= totalOrdenBruto && <div className="historial-completado">✅ ¡Pago completado! La factura se generará automáticamente.</div>}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PageTemplate>
  );
}