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
  const { print, openCashDrawer } = usePrinterService();
  const location = useLocation();
  const autoSelectRef = useRef(location.state?.orderNumber || null);
  const customerCedulaRef = useRef(location.state?.customerCedula || null);
  const appliedCouponsRef = useRef([]);      // [{ discount, amount, details }, ...]
  const manualDiscountRef = useRef(null);   // { discount, amount, details } — seleccionado manualmente por el cajero

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
  const [discountDetails, setDiscountDetails] = useState(null);
  const [totalOrdenConDescuento, setTotalOrdenConDescuento] = useState(0);

  // ========== CUPONES (código manual) ==========
  const [couponSlots, setCouponSlots] = useState([{ code: '', error: '' }]); // slots de input
  const [couponPendingSelect, setCouponPendingSelect] = useState(false);
  const [pendingCoupon, setPendingCoupon] = useState(null);
  const [pendingSlotIdx, setPendingSlotIdx] = useState(null);
  const [couponSelectedItemIds, setCouponSelectedItemIds] = useState([]);
  const [couponDiscountAmount, setCouponDiscountAmount] = useState(0); // suma total de cupones
  const [couponVersion, setCouponVersion] = useState(0);
  const [descuentosExpanded, setDescuentosExpanded] = useState(false);

  // ========== CONFIGURACIÓN FISCAL ==========
  const [ivaRateGlobal, setIvaRateGlobal] = useState(15);
  const [currencySymbol, setCurrencySymbol] = useState('$');

  // ========== FUNCIONES DE DESCUENTOS COMPLETAS ==========

  // Obtener subtotal por categoría
  const getSubtotalByCategory = useCallback((items, categoryId) => {
    return items.reduce((sum, item) => {
      // Comparación robusta: convierte ambos a string para evitar problemas tipo/valor
      if (String(item.category_id) === String(categoryId)) {
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

  // ── Helpers para descuentos tipo Combo ──
  const parseComboData = useCallback((discount) => {
    try {
      const raw = String(discount.description || '');
      if (!raw.startsWith('__COMBO__')) return null;
      const jsonPart = raw.slice(9).split('||')[0];
      return JSON.parse(jsonPart); // { price, items:[{id,qty,name}] }
    } catch { return null; }
  }, []);

  const isComboDiscount = useCallback((discount) =>
    String(discount.description || '').startsWith('__COMBO__'), []);

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
    
    // 🔥 Descuento tipo COMBO
    if (isComboDiscount(discount)) {
      const comboData = parseComboData(discount);
      if (!comboData?.items?.length) return false;
      return comboData.items.every(ci => {
        const orderItem = items.find(i => String(i.product_id) === String(ci.id));
        return orderItem && (Number(orderItem.quantity) || 1) >= ci.qty;
      });
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
    
    // 🔥 Descuento por CATEGORÍA (incluyendo modo 2do producto: buy_x_get_y + category)
    if (discount.applies_to === 'category') {
      if (!discount.category_id) return false;

      const catItems = items.filter(i => String(i.category_id) === String(discount.category_id));
      const totalCatQty = catItems.reduce((s, i) => s + (Number(i.quantity) || 1), 0);

      // Modo 2do producto: necesita al menos 2 unidades en la categoría
      if (discount.type === 'buy_x_get_y') {
        return totalCatQty >= 2;
      }

      // Modo precio fijo por unidad: necesita al menos 1 item en la categoría
      if (discount.type === 'fixed' && String(discount.description || '').startsWith('__FPPU__')) {
        return catItems.length > 0;
      }

      // Modo normal: necesita subtotal > 0
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
  }, [getSubtotalByCategory, getSubtotalByProduct, getQuantityByProduct, isComboDiscount, parseComboData]);

  // Calcular monto del descuento (COMPLETO)
  const calculateDiscountAmountForOrder = useCallback((discount, subtotalSinIVA, items = []) => {
    if (!discount || !discount.type || discount.value === undefined) return 0;
    
    let baseAmount = 0;
    let discountType = discount.type;
    let discountValue = Number(discount.value);

    // 🔥 Combo: precio especial por conjunto de productos
    if (isComboDiscount(discount)) {
      const comboData = parseComboData(discount);
      if (!comboData?.items?.length) return 0;
      const comboPrice = Number(comboData.price) || 0;
      // Cuántos combos completos caben en la orden
      const combosCount = Math.floor(Math.min(...comboData.items.map(ci => {
        const oi = items.find(i => String(i.product_id) === String(ci.id));
        return oi ? Math.floor((Number(oi.quantity) || 1) / ci.qty) : 0;
      })));
      if (combosCount < 1) return 0;
      // Precio regular base (sin IVA) de los items del combo
      const regularBase = comboData.items.reduce((s, ci) => {
        const oi = items.find(i => String(i.product_id) === String(ci.id));
        const price = oi ? (Number(oi.selling_price) || Number(oi.unit_price) || 0) : 0;
        return s + price * ci.qty;
      }, 0);
      // El precio del combo ($10.00) es precio final CON IVA → convertir a base sin IVA
      const comboBasePrice = comboPrice / (1 + ivaRateGlobal / 100);
      return Math.max(0, (regularBase - comboBasePrice) * combosCount);
    }

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
      // Modo precio fijo por unidad en categoría
      if (discount.applies_to === 'category' && discount.category_id &&
          String(discount.description || '').startsWith('__FPPU__')) {
        const catItems = items.filter(i => String(i.category_id) === String(discount.category_id));
        const baseTarget = discountValue / (1 + ivaRateGlobal / 100); // valor ingresado es PVP con IVA
        amount = catItems.reduce((s, item) => {
          const price = Number(item.selling_price) || Number(item.unit_price) || 0;
          const qty   = Number(item.quantity) || 1;
          const diff  = price - baseTarget;
          return diff > 0 ? s + diff * qty : s;
        }, 0);
      } else if (discount.applies_to === 'product' && discount.product_id && (discount.min_quantity || 1) > 1) {
        const productQty = getQuantityByProduct(items, discount.product_id);
        const packs = Math.max(1, Math.floor(productQty / (discount.min_quantity || 1)));
        amount = Math.min(discountValue * packs, baseAmount);
      } else {
        amount = Math.min(discountValue, baseAmount);
      }
    } else if (discountType === 'buy_x_get_y') {
      if (discount.applies_to === 'category' && discount.category_id) {
        // Modo 2do producto: el más barato de cada par recibe el descuento
        const catItems = items.filter(i => String(i.category_id) === String(discount.category_id));
        const allUnits = [];
        catItems.forEach(item => {
          const price = Number(item.selling_price) || Number(item.unit_price) || 0;
          for (let u = 0; u < (Number(item.quantity) || 1); u++) allUnits.push(price);
        });
        allUnits.sort((a, b) => a - b); // más barato primero
        const discountedUnits = Math.floor(allUnits.length / 2);
        amount = allUnits.slice(0, discountedUnits).reduce((s, p) => s + p * (discountValue / 100), 0);
      } else {
        // Comportamiento genérico: compra X lleva Y gratis
        const minQty = discount.min_quantity || 2;
        const freeQty = discount.free_quantity || 1;
        const discountPercent = (freeQty / (minQty + freeQty)) * 100;
        amount = baseAmount * (discountPercent / 100);
      }
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
  }, [getSubtotalByCategory, getSubtotalByProduct, getQuantityByProduct, isComboDiscount, parseComboData, ivaRateGlobal]);

  // Obtener el mejor descuento aplicable (prioridad) — los cupones se excluyen, requieren código manual
  const getBestApplicableDiscount = useCallback((subtotalSinIVA, items) => {
    if (availableDiscounts.length === 0) return null;

    const applicable = availableDiscounts
      .filter(d => d.type !== 'coupon')
      .filter(d => isDiscountApplicable(d, subtotalSinIVA, items));
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
    return (selectedOrder.items || []).filter(item => !item.paid).reduce((sum, item) => {
      const price = Number(item.selling_price) || Number(item.unit_price) || 0;
      const quantity = Number(item.quantity) || 1;
      return sum + (price * quantity);
    }, 0);
  }, [selectedOrder]);

  const getIvaRate = useCallback(() => ivaRateGlobal, [ivaRateGlobal]);

  const getIvaTotal = useCallback(() => {
    if (!selectedOrder) return 0;
    return (selectedOrder.items || []).filter(item => !item.paid).reduce((sum, item) =>
      sum + (Number(item.tax_rate) || 0) * (Number(item.quantity) || 1), 0);
  }, [selectedOrder]);

  const getOrderTotal = useCallback(() => {
    if (!selectedOrder) return 0;
    const hasPaidItems = (selectedOrder.items || []).some(item => item.paid);
    if (!hasPaidItems && selectedOrder.total && typeof selectedOrder.total === 'number' && selectedOrder.total > 0)
      return Number(selectedOrder.total);
    return getSubtotalSinIVA() + getIvaTotal();
  }, [selectedOrder, getSubtotalSinIVA, getIvaTotal]);

  // ─────────── RECALCULAR TOTALES DESPUÉS DE APLICAR DESCUENTO MANUALMENTE ───────────
  const recalcularTotalConDescuento = useCallback((discount, discountAmountValue) => {
    if (!selectedOrder) return;
    
    const subtotalSinIVA = getSubtotalSinIVA();
    const ivaTotal = getIvaTotal();
    const items = selectedOrder.items || [];
    
    let tipoDescuento = discount.applies_to || 'order';
    let nuevaBaseImponible = subtotalSinIVA;
    let nuevoIVA = 0;
    let nuevoTotalFinal = null;

    if (tipoDescuento === 'category' && discount.category_id &&
        String(discount.description || '').startsWith('__FPPU__')) {
      // FPPU: precio fijo solo para ítems más caros que el target; extras baratos van a precio normal
      const catItems = items.filter(i => String(i.category_id) === String(discount.category_id));
      const ivaRate = getIvaRate() / 100;
      const pvpFijo = Number(discount.value);
      const baseTarget = pvpFijo / (1 + ivaRate);
      const subtotalCategoria = getSubtotalByCategory(items, discount.category_id);
      const subtotalOtras = subtotalSinIVA - subtotalCategoria;
      const pvpCategoriaCombinado = catItems.reduce((s, item) => {
        const price = Number(item.selling_price) || Number(item.unit_price) || 0;
        const qty   = Number(item.quantity) || 1;
        return s + (price > baseTarget ? pvpFijo : price * (1 + ivaRate)) * qty;
      }, 0);
      const ivaOtras = Math.round(subtotalOtras * ivaRate * 100) / 100;
      const baseCombinada = pvpCategoriaCombinado / (1 + ivaRate);
      nuevaBaseImponible = Math.round((baseCombinada + subtotalOtras) * 100) / 100;
      nuevoIVA = Math.round((pvpCategoriaCombinado * ivaRate / (1 + ivaRate) + ivaOtras) * 100) / 100;
      nuevoTotalFinal = Math.round((pvpCategoriaCombinado + subtotalOtras + ivaOtras) * 100) / 100;
    } else if (tipoDescuento === 'category' && discount.category_id) {
      const subtotalCategoria = getSubtotalByCategory(items, discount.category_id);
      const subtotalOtras = subtotalSinIVA - subtotalCategoria;

      const subtotalCategoriaConDescuento = Math.max(0, subtotalCategoria - discountAmountValue);
      const ivaCategoriaConDescuento = Math.round(subtotalCategoriaConDescuento * (getIvaRate() / 100) * 100) / 100;
      const ivaOtras = Math.round(subtotalOtras * (getIvaRate() / 100) * 100) / 100;

      nuevaBaseImponible = subtotalCategoriaConDescuento + subtotalOtras;
      nuevoIVA = ivaCategoriaConDescuento + ivaOtras;
    } else if (tipoDescuento === 'product' && discount.product_id) {
      const subtotalProducto = getSubtotalByProduct(items, discount.product_id);
      const subtotalOtros = subtotalSinIVA - subtotalProducto;
      
      const subtotalProductoConDescuento = Math.max(0, subtotalProducto - discountAmountValue);
      const ivaProductoConDescuento = Math.round(subtotalProductoConDescuento * (getIvaRate() / 100) * 100) / 100;
      const ivaOtros = Math.round(subtotalOtros * (getIvaRate() / 100) * 100) / 100;
      
      nuevaBaseImponible = subtotalProductoConDescuento + subtotalOtros;
      nuevoIVA = ivaProductoConDescuento + ivaOtros;
    } else {
      nuevaBaseImponible = Math.max(0, subtotalSinIVA - discountAmountValue);
      nuevoIVA = Math.round(nuevaBaseImponible * (getIvaRate() / 100) * 100) / 100;
    }

    const nuevoTotal = nuevoTotalFinal !== null
      ? nuevoTotalFinal
      : Math.round((nuevaBaseImponible + nuevoIVA) * 100) / 100;
    setTotalOrdenConDescuento(nuevoTotal);
  }, [selectedOrder, getSubtotalSinIVA, getIvaTotal, getIvaRate, getSubtotalByCategory, getSubtotalByProduct]);

  // Actualizar valores de descuento
  const updateDiscountValues = useCallback(() => {
    if (!selectedOrder) {
      setAppliedDiscount(null);
      setDiscountAmount(0);
      setDiscountDetails(null);
      setCouponDiscountAmount(0);
      setTotalOrdenConDescuento(getOrderTotal());
      return;
    }

    const subtotalSinIVA = getSubtotalSinIVA();
    const ivaRate = getIvaRate() / 100;
    const items = selectedOrder.items || [];

    // ── 1. Auto-descuento — solo el que el cajero seleccionó manualmente ──
    const couponActive = appliedCouponsRef.current.length > 0;
    const best = manualDiscountRef.current;
    let autoDiscountedTotal = getOrderTotal();
    // Base imponible después del descuento regular (antes del cupón)
    // Se calcula desde los ítems para evitar valores redondeados del DB
    let discountedBase = subtotalSinIVA;

    if (best && best.amount > 0) {
      setAppliedDiscount(best.discount);
      setDiscountAmount(best.amount);
      setDiscountDetails(best.details);

      let tipoDescuento = best.discount.applies_to || 'order';
      let nuevaBaseImponible = subtotalSinIVA;
      let nuevoIVA = 0;
      let nuevoTotalFinal = null;

      if (tipoDescuento === 'category' && best.discount.category_id &&
          String(best.discount.description || '').startsWith('__FPPU__')) {
        const catItems = items.filter(i => String(i.category_id) === String(best.discount.category_id));
        const pvpFijo = Number(best.discount.value);
        const baseTarget = pvpFijo / (1 + ivaRate);
        const subtotalCategoria = getSubtotalByCategory(items, best.discount.category_id);
        const subtotalOtras = subtotalSinIVA - subtotalCategoria;
        const pvpCategoriaCombinado = catItems.reduce((s, item) => {
          const price = Number(item.selling_price) || Number(item.unit_price) || 0;
          const qty   = Number(item.quantity) || 1;
          return s + (price > baseTarget ? pvpFijo : price * (1 + ivaRate)) * qty;
        }, 0);
        const ivaOtras = Math.round(subtotalOtras * ivaRate * 100) / 100;
        const baseCombinada = pvpCategoriaCombinado / (1 + ivaRate);
        nuevaBaseImponible = Math.round((baseCombinada + subtotalOtras) * 100) / 100;
        nuevoIVA = Math.round((pvpCategoriaCombinado * ivaRate / (1 + ivaRate) + ivaOtras) * 100) / 100;
        nuevoTotalFinal = Math.round((pvpCategoriaCombinado + subtotalOtras + ivaOtras) * 100) / 100;
      } else if (tipoDescuento === 'category' && best.discount.category_id) {
        const subtotalCategoria = getSubtotalByCategory(items, best.discount.category_id);
        const subtotalOtras = subtotalSinIVA - subtotalCategoria;
        const subtotalCategoriaConDescuento = Math.max(0, subtotalCategoria - best.amount);
        const ivaCategoriaConDescuento = Math.round(subtotalCategoriaConDescuento * ivaRate * 100) / 100;
        const ivaOtras = Math.round(subtotalOtras * ivaRate * 100) / 100;
        nuevaBaseImponible = subtotalCategoriaConDescuento + subtotalOtras;
        nuevoIVA = ivaCategoriaConDescuento + ivaOtras;
      } else if (tipoDescuento === 'product' && best.discount.product_id) {
        const subtotalProducto = getSubtotalByProduct(items, best.discount.product_id);
        const subtotalOtros = subtotalSinIVA - subtotalProducto;
        const subtotalProductoConDescuento = Math.max(0, subtotalProducto - best.amount);
        const ivaProductoConDescuento = Math.round(subtotalProductoConDescuento * ivaRate * 100) / 100;
        const ivaOtros = Math.round(subtotalOtros * ivaRate * 100) / 100;
        nuevaBaseImponible = subtotalProductoConDescuento + subtotalOtros;
        nuevoIVA = ivaProductoConDescuento + ivaOtros;
      } else {
        nuevaBaseImponible = Math.max(0, subtotalSinIVA - best.amount);
        nuevoIVA = Math.round(nuevaBaseImponible * ivaRate * 100) / 100;
      }

      discountedBase = nuevaBaseImponible;
      autoDiscountedTotal = nuevoTotalFinal !== null
        ? nuevoTotalFinal
        : Math.round((nuevaBaseImponible + nuevoIVA) * 100) / 100;
    } else {
      setAppliedDiscount(null);
      setDiscountAmount(0);
      setDiscountDetails(null);
      // discountedBase ya es subtotalSinIVA
    }

    // ── 2. Cupones manuales — suma de todos ──
    let couponAmt = 0;
    for (const c of appliedCouponsRef.current) {
      const coupon = c.discount;
      const amt = coupon.applies_to === 'category'
        ? c.amount
        : calculateDiscountAmountForOrder(coupon, subtotalSinIVA, items);
      couponAmt += Math.max(0, amt);
    }
    setCouponDiscountAmount(couponAmt);

    // ── 3. Total final combinado ──
    // Se calcula desde la base (no desde el total del DB) para evitar errores de redondeo
    let finalTotal;
    if (couponAmt > 0) {
      const baseAfterCoupon = Math.max(0, discountedBase - couponAmt);
      const ivaAfterCoupon = Math.round(baseAfterCoupon * ivaRate * 100) / 100;
      finalTotal = Math.round((baseAfterCoupon + ivaAfterCoupon) * 100) / 100;
    } else {
      finalTotal = autoDiscountedTotal;
    }
    setTotalOrdenConDescuento(finalTotal);
  }, [selectedOrder, getSubtotalSinIVA, getIvaTotal, getOrderTotal, getBestApplicableDiscount, getIvaRate, getSubtotalByCategory, getSubtotalByProduct, calculateDiscountAmountForOrder]);

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

    }
  };

  // Cargar descuentos disponibles
  const loadDiscounts = async () => {
    try {
      const res = await fetchWithAuth('/api/discounts');
      if (res.ok) {
        const data = await res.json();
        console.log('[DESCUENTOS API] Respuesta completa:', data);
        
        const validDiscounts = (Array.isArray(data) ? data : []).filter(d => {
          // Validación básica
          if (!d || !d.id || !d.name || d.is_active === undefined || !d.type || d.value === undefined) {
            console.warn('[DESCUENTOS FILTRADO] Descuento inválido (falta campo básico):', d);
            return false;
          }
          
          // Validación según tipo de aplicación
          if (d.applies_to === 'category' && !d.category_id && d.type !== 'coupon') {
            console.warn('[DESCUENTOS FILTRADO] Descuento por categoría sin category_id:', d.name);
            return false; // Los cupones pueden no tener category_id (selección al cobrar)
          }
          if (d.applies_to === 'product' && !d.product_id) {
            console.warn('[DESCUENTOS FILTRADO] Descuento por producto sin product_id:', d.name);
            return false; // Descuento por producto necesita product_id
          }
          
          console.log('[DESCUENTOS VÁLIDO]', {
            name: d.name,
            type: d.type,
            applies_to: d.applies_to,
            category_id: d.category_id,
            product_id: d.product_id,
            is_active: d.is_active
          });
          
          return true;
        });
        console.log('[DESCUENTOS TOTALES]', validDiscounts.length, 'descuentos válidos cargados');
        setAvailableDiscounts(validDiscounts);
      } else {
        console.error('[DESCUENTOS API ERROR]', res.status);
        setAvailableDiscounts([]);
      }
    } catch (err) {
      console.error('[DESCUENTOS EXCEPTION]', err);
      setAvailableDiscounts([]);
    }
  };

  useEffect(() => {
    updateDiscountValues();
  }, [selectedOrder, updateDiscountValues, couponVersion]);

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

      setSelectedOrder(ordenActualizada);
      return ordenActualizada;
    } catch (err) {

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
    appliedCouponsRef.current = [];
    manualDiscountRef.current = null;
    setCouponSlots([{ code: '', error: '' }]);
    setCouponPendingSelect(false);
    setPendingCoupon(null);
    setPendingSlotIdx(null);
    setCouponSelectedItemIds([]);
    setCouponDiscountAmount(0);
  };

  const loadOrders = async () => {
    try {
      const [res, prodRes] = await Promise.all([
        fetchWithAuth('/api/ordenes'),
        fetchWithAuth('/api/products'),
      ]);
      const raw = await res.json();
      const todosActivos = Array.isArray(raw) ? raw.filter(o => o.status !== 'paid') : [];

      // Mapa product_id → category_id para enriquecer items
      let productCategoryMap = {};
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        (Array.isArray(prodData) ? prodData : []).forEach(p => {
          if (p.id && p.category_id != null) productCategoryMap[String(p.id)] = p.category_id;
        });
      }

      const enrichedOrders = todosActivos.map(order => {
        if (order.items && Array.isArray(order.items)) {
          return {
            ...order,
            items: order.items.map(item => ({
              ...item,
              category_id: item.category_id ?? productCategoryMap[String(item.product_id)] ?? null,
            })),
          };
        }
        return order;
      });

      if (autoSelectRef.current) {
        const orderNum = String(autoSelectRef.current);
        const target = enrichedOrders.find(o =>
          String(o.order_number)  === orderNum ||
          String(o.numero_pedido) === orderNum
        );
        const listaCombobox = target && target.status === 'draft'
          ? [target, ...enrichedOrders.filter(o => o.status !== 'draft')]
          : enrichedOrders.filter(o => o.status !== 'draft');
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
        setOrders(enrichedOrders.filter(o => o.status !== 'draft'));
      }

      const bizRes = await fetchWithAuth('/api/settings/receipt-info');
      const bizData = await bizRes.json();
      setBizInfo(bizData);

    } catch (err) {

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

      return null;
    } finally {
      setProcessingCliente(false);
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

  const setSlotError = (idx, err) =>
    setCouponSlots(prev => prev.map((s, i) => i === idx ? { ...s, error: err } : s));

  const aplicarCupon = (slotIdx) => {
    const slot = couponSlots[slotIdx];
    const code = (slot?.code || '').trim().toUpperCase();
    setSlotError(slotIdx, '');
    if (!code) { setSlotError(slotIdx, 'Ingrese el código del cupón'); return; }
    if (!selectedOrder) { setSlotError(slotIdx, 'Seleccione una orden primero'); return; }

    const alreadyApplied = appliedCouponsRef.current.some(c =>
      (c.discount.code && c.discount.code.toUpperCase() === code) ||
      (c.discount.name && c.discount.name.toUpperCase() === code)
    );
    if (alreadyApplied) { setSlotError(slotIdx, 'Este cupón ya fue aplicado'); return; }

    const coupon = availableDiscounts.find(d =>
      d.type === 'coupon' &&
      d.is_active &&
      ((d.code && d.code.toUpperCase() === code) || (d.name && d.name.toUpperCase() === code))
    );
    if (!coupon) { setSlotError(slotIdx, 'Código de cupón inválido o inactivo'); return; }

    const items = selectedOrder.items || [];

    if (coupon.applies_to === 'category') {
      const elegibles = coupon.category_id
        ? items.filter(item => String(item.category_id) === String(coupon.category_id) && !item.paid)
        : items.filter(item => !item.paid);
      if (elegibles.length === 0) {
        setSlotError(slotIdx, 'No hay productos disponibles en la orden para este cupón');
        return;
      }
      setPendingCoupon(coupon);
      setPendingSlotIdx(slotIdx);
      setCouponPendingSelect(true);
      setCouponSelectedItemIds([]);
      return;
    }

    if (coupon.applies_to === 'products_list') {
      try {
        const allowed = JSON.parse(coupon.description?.replace('__MULTIPRODUCT__', '') || '[]');
        const allowedIds = allowed.map(p => String(p.id));
        const matchItems = items.filter(item => allowedIds.includes(String(item.product_id)) && !item.paid);
        if (matchItems.length === 0) {
          setSlotError(slotIdx, 'Ninguno de los productos del cupón está en la orden');
          return;
        }
      } catch {
        setSlotError(slotIdx, 'Cupón inválido');
        return;
      }
      setPendingCoupon(coupon);
      setPendingSlotIdx(slotIdx);
      setCouponPendingSelect(true);
      setCouponSelectedItemIds([]);
      return;
    }

    if (coupon.applies_to === 'product' && coupon.product_id) {
      const enOrden = items.some(item => String(item.product_id) === String(coupon.product_id));
      if (!enOrden) {
        setSlotError(slotIdx, `Este cupón aplica solo si hay "${coupon.product_name || 'el producto'}" en la orden`);
        return;
      }
    }

    const subtotal = getSubtotalSinIVA();
    const newAmount = calculateDiscountAmountForOrder(coupon, subtotal, items);
    if (newAmount <= 0) { setSlotError(slotIdx, 'El cupón no aplica a esta orden'); return; }

    const details = { name: coupon.name, type: coupon.type, applies_to: coupon.applies_to, value: coupon.value };
    appliedCouponsRef.current = [...appliedCouponsRef.current, { discount: coupon, amount: newAmount, details }];
    setCouponSlots(prev => prev.map((s, i) => i === slotIdx ? { code: '', error: '' } : s));
    setCouponVersion(v => v + 1);
    setSuccess(`Cupón "${coupon.name}" aplicado: -${fmt(newAmount)}`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const confirmarCuponCategoria = () => {
    if (couponSelectedItemIds.length === 0) { setSlotError(pendingSlotIdx ?? 0, 'Selecciona al menos un ítem'); return; }
    const coupon = pendingCoupon;
    const items = selectedOrder.items || [];
    const pct = Number(coupon.value) / 100;

    const selectedTotal = items
      .filter(item => couponSelectedItemIds.includes(item.id))
      .reduce((sum, item) => {
        const price = Number(item.selling_price) || Number(item.unit_price) || 0;
        return sum + price * (Number(item.quantity) || 1);
      }, 0);

    const newAmount = Math.round(selectedTotal * pct * 100) / 100;
    if (newAmount <= 0) { setSlotError(pendingSlotIdx ?? 0, 'El descuento resultó en 0'); return; }

    const details = { name: coupon.name, type: coupon.type, applies_to: 'category', value: coupon.value };
    appliedCouponsRef.current = [...appliedCouponsRef.current, { discount: coupon, amount: newAmount, details }];
    if (pendingSlotIdx !== null) {
      setCouponSlots(prev => prev.map((s, i) => i === pendingSlotIdx ? { code: '', error: '' } : s));
    }
    setCouponVersion(v => v + 1);
    setCouponPendingSelect(false);
    setPendingCoupon(null);
    setPendingSlotIdx(null);
    setCouponSelectedItemIds([]);
    setSuccess(`Cupón "${coupon.name}" aplicado: -${fmt(newAmount)}`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const quitarCupon = (couponIdx) => {
    appliedCouponsRef.current = appliedCouponsRef.current.filter((_, i) => i !== couponIdx);
    setCouponVersion(v => v + 1);
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
  const nuevaBaseImponible = Math.max(0, subtotalSinIVAMostrar - discountAmount - couponDiscountAmount);
  const nuevoIVAMostrar = Math.round(nuevaBaseImponible * (ivaRateMostrar / 100) * 100) / 100;

  // Total de ítems aún NO pagados (para modo dividido)
  const itemsPendientes = (selectedOrder?.items || []).filter(item => !item.paid);
  const subtotalPendiente = itemsPendientes.reduce((s, item) =>
    s + (Number(item.selling_price) || Number(item.unit_price) || 0) * (Number(item.quantity) || 1), 0);
  const ivaPendiente = itemsPendientes.reduce((s, item) =>
    s + (Number(item.tax_rate) || 0) * (Number(item.quantity) || 1), 0);
  const totalPendiente = subtotalPendiente + ivaPendiente;

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

    const itemsNoPagados = selectedItems.filter(itemId => {
      const item = selectedOrder?.items.find(i => i.id === itemId);
      return item && !item.paid;
    });

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
  const totalOrdenBruto = (selectedOrder?.items || []).reduce((s, item) =>
    s + (Number(item.selling_price) || Number(item.unit_price) || 0) * (Number(item.quantity) || 1)
    + (Number(item.tax_rate) || 0) * (Number(item.quantity) || 1), 0);

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
        iva_amount: ivaItem,
        category_id: item.category_id, // Agregamos category_id para identificar items por categoría
        product_id: item.product_id    // Agregamos product_id para identificar items por producto
      };
    });
    
    if (itemsPayload.length === 0) return null;

    let descuentoTotal = (discountAmount || 0) + (couponDiscountAmount || 0);
    
    // 🔥 Determinar si el descuento aplica a categoría o producto específico
    let tipoDescuento = appliedDiscount?.applies_to || 'order'; // 'order', 'category', 'product'
    let categoryIdDescuento = appliedDiscount?.category_id || null;
    let productIdDescuento = appliedDiscount?.product_id || null;

    // Calcular subtotal CON DESCUENTO según el tipo
    let nuevaBaseImponibleFact = subtotalOriginal;
    let nuevoIVAFact = ivaSumado;

    if (tipoDescuento === 'category' && categoryIdDescuento) {
      // Descuento por categoría: solo aplica a items de esa categoría
      const itemsCategoriaConDescuento = itemsPayload.filter(item => item.category_id === categoryIdDescuento);
      const itemsOtrasCategoriass = itemsPayload.filter(item => item.category_id !== categoryIdDescuento);
      
      const subtotalCategoriaConDescuento = itemsCategoriaConDescuento.reduce((sum, item) => sum + item.subtotal, 0);
      const subtotalOtrasCategoriass = itemsOtrasCategoriass.reduce((sum, item) => sum + item.subtotal, 0);
      const ivaCategoriaConDescuento = itemsCategoriaConDescuento.reduce((sum, item) => sum + item.iva_amount, 0);
      const ivaOtrasCategoriass = itemsOtrasCategoriass.reduce((sum, item) => sum + item.iva_amount, 0);
      
      // Aplicar descuento solo a la categoría
      const subtotalCategoriaConDescuentoAplicado = Math.max(0, subtotalCategoriaConDescuento - descuentoTotal);
      const ivaCategoriaConDescuentoAplicado = Math.round(subtotalCategoriaConDescuentoAplicado * (ivaRateGlobal / 100) * 100) / 100;
      
      nuevaBaseImponibleFact = subtotalCategoriaConDescuentoAplicado + subtotalOtrasCategoriass;
      nuevoIVAFact = ivaCategoriaConDescuentoAplicado + ivaOtrasCategoriass;
    } else if (tipoDescuento === 'product' && productIdDescuento) {
      // Descuento por producto: solo aplica a items de ese producto
      const itemsProductoConDescuento = itemsPayload.filter(item => item.product_id === productIdDescuento);
      const itemsOtrosProductos = itemsPayload.filter(item => item.product_id !== productIdDescuento);
      
      const subtotalProductoConDescuento = itemsProductoConDescuento.reduce((sum, item) => sum + item.subtotal, 0);
      const subtotalOtrosProductos = itemsOtrosProductos.reduce((sum, item) => sum + item.subtotal, 0);
      const ivaProductoConDescuento = itemsProductoConDescuento.reduce((sum, item) => sum + item.iva_amount, 0);
      const ivaOtrosProductos = itemsOtrosProductos.reduce((sum, item) => sum + item.iva_amount, 0);
      
      // Aplicar descuento solo al producto
      const subtotalProductoConDescuentoAplicado = Math.max(0, subtotalProductoConDescuento - descuentoTotal);
      const ivaProductoConDescuentoAplicado = Math.round(subtotalProductoConDescuentoAplicado * (ivaRateGlobal / 100) * 100) / 100;
      
      nuevaBaseImponibleFact = subtotalProductoConDescuentoAplicado + subtotalOtrosProductos;
      nuevoIVAFact = ivaProductoConDescuentoAplicado + ivaOtrosProductos;
    } else {
      // Descuento por orden: aplica a todos los items
      nuevaBaseImponibleFact = Math.max(0, subtotalOriginal - descuentoTotal);
      nuevoIVAFact = Math.round(nuevaBaseImponibleFact * (ivaRateGlobal / 100) * 100) / 100;
    }

    const totalFactura = nuevaBaseImponibleFact + nuevoIVAFact;

    // Mapear items con descuentos aplicados correctamente
    const itemsConDescuento = itemsPayload.map(item => {
      let itemSubtotalFinal = item.subtotal;
      let itemIVAFinal = item.iva_amount;

      if (tipoDescuento === 'category' && categoryIdDescuento && item.category_id === categoryIdDescuento) {
        // Aplicar descuento proporcionalmente a este item
        const subtotalCategoriaConDescuento = itemsPayload.filter(i => i.category_id === categoryIdDescuento).reduce((sum, i) => sum + i.subtotal, 0);
        if (subtotalCategoriaConDescuento > 0) {
          const ratioItem = item.subtotal / subtotalCategoriaConDescuento;
          itemSubtotalFinal = item.subtotal - (descuentoTotal * ratioItem);
          itemIVAFinal = Math.round(itemSubtotalFinal * (ivaRateGlobal / 100) * 100) / 100;
        }
      } else if (tipoDescuento === 'product' && productIdDescuento && item.product_id === productIdDescuento) {
        // Aplicar descuento proporcionalmente a este item
        const subtotalProductoConDescuento = itemsPayload.filter(i => i.product_id === productIdDescuento).reduce((sum, i) => sum + i.subtotal, 0);
        if (subtotalProductoConDescuento > 0) {
          const ratioItem = item.subtotal / subtotalProductoConDescuento;
          itemSubtotalFinal = item.subtotal - (descuentoTotal * ratioItem);
          itemIVAFinal = Math.round(itemSubtotalFinal * (ivaRateGlobal / 100) * 100) / 100;
        }
      } else if (tipoDescuento === 'order') {
        // Aplicar descuento proporcionalmente a todos los items
        if (subtotalOriginal > 0) {
          const ratioItem = item.subtotal / subtotalOriginal;
          itemSubtotalFinal = item.subtotal - (descuentoTotal * ratioItem);
          itemIVAFinal = Math.round(itemSubtotalFinal * (ivaRateGlobal / 100) * 100) / 100;
        }
      }

      return {
        code: item.code,
        description: item.description,
        qty: item.qty,
        unit_price: item.unit_price,
        subtotal: itemSubtotalFinal.toFixed(2),
        iva_amount: itemIVAFinal.toFixed(2)
      };
    });

    const payload = {
      order_id: order.id,
      customer: {
        name: isCF ? 'CONSUMIDOR FINAL' : (custNombre || ''),
        ruc: isCF ? '9999999999' : cedula,
        email: email || null,
        tipo_identificacion: tipoId,
        phone: null
      },
      items: itemsConDescuento,
      subtotal: nuevaBaseImponibleFact.toFixed(2),
      iva_amount: nuevoIVAFact.toFixed(2),
      total: totalFactura.toFixed(2),
      forma_pago: FORMA_PAGO_MAP[method] || '01',
      descuento: descuentoTotal.toFixed(2),
      iva_rate: ivaRateGlobal
    };

    try {
      const response = await fetchWithAuth('/api/einvoicing/invoices/emit', { method: 'POST', body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) {
        const errMsg = String(result.error || response.status);
        const esFirmaError = /firma|signature|p12|certificado|electr/i.test(errMsg);
        if (!esFirmaError) setError(`Error factura: ${errMsg}`);
        return null;
      }
      return { id: result.id, invoice_number: result.invoice_number };
    } catch (e) {
      const esFirmaError = /firma|signature|p12|certificado|electr/i.test(e.message);
      if (!esFirmaError) setError(`Error emitir factura: ${e.message}`);

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
  const imprimirTicket = async (order, paid, cambio, invoiceNumber = null, splitMode = null, customerName = null, openDrawer = false, paymentMethod = null) => {
    try {
      const itemsToPrint = (order.items || []).map(item => ({
        description: item.product_name || 'Producto',
        quantity:    item.quantity,
        price:       Number(item.selling_price) || Number(item.unit_price) || 0,
        total:       (Number(item.selling_price) || Number(item.unit_price) || 0) * item.quantity,
      }));

      const printSubtotal = itemsToPrint.reduce((s, i) => s + i.total, 0);
      const printIvaBase = (order.items || []).reduce((s, item) =>
        s + (Number(item.tax_rate) || 0) * (Number(item.quantity) || 1), 0);
      const totalDescuentoImpresion = discountAmount + couponDiscountAmount;
      const discountsPrint = [];
      if (discountAmount > 0 && appliedDiscount) discountsPrint.push({ name: appliedDiscount.name, amount: discountAmount });
      appliedCouponsRef.current.forEach(c => discountsPrint.push({ name: `Cupón: ${c.discount.name}`, amount: c.amount }));
      const printBaseConDesc = Math.max(0, printSubtotal - totalDescuentoImpresion);
      const nuevoIVAImpresion = Math.round(printBaseConDesc * (ivaRateGlobal / 100) * 100) / 100;
      const printTotalFinal = printBaseConDesc + nuevoIVAImpresion;
      const tieneFactura = !!invoiceNumber;
      const template     = tieneFactura ? 'invoice' : 'ticket-simple';
      const esCash = paymentMethod === 'cash';
      const esMixto = paymentMethod === 'mixto';
      const recibidoCliente = esCash || esMixto ? paid + Math.max(0, cambio) : 0;

      const printData = tieneFactura
        ? {
            bizInfo,
            invoice:      { number: invoiceNumber, date: new Date().toISOString() },
            customer:     { name: customerName || clienteNombre || 'CONSUMIDOR FINAL', id: clienteCedula || '9999999999' },
            items:        itemsToPrint,
            subtotal:     printBaseConDesc,
            discount:     totalDescuentoImpresion,
            discounts:    discountsPrint,
            tax:          nuevoIVAImpresion,
            taxRate:      ivaRateGlobal,
            total:        printTotalFinal,
            payment:      { cash: paid, card: 0, other: 0 },
            recibido:     recibidoCliente,
            cambio:       esCash || esMixto ? Math.max(0, cambio) : 0,
            metodoPago:   paymentMethod,
          }
        : {
            bizInfo,
            orden:        order.order_number || order.id,
            customer:     { id: clienteCedula || '9999999999', name: customerName || clienteNombre || 'CONSUMIDOR FINAL' },
            items:        itemsToPrint,
            subtotal:     printSubtotal,
            discount:     totalDescuentoImpresion,
            discounts:    discountsPrint,
            tax:          nuevoIVAImpresion,
            taxRate:      ivaRateGlobal,
            total:        printTotalFinal,
            recibido:     esCash || esMixto ? paid + Math.max(0, cambio) : 0,
            cambio:       esCash || esMixto ? Math.max(0, cambio) : 0,
            metodoPago:   paymentMethod,
          };

      await print('printer_main', template, printData, openDrawer);
    } catch (err) {

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
        await imprimirTicket(partialOrder, totalComensal, comensal.montoRecibido - totalComensal, invoiceData?.invoice_number, 'split', nombre, debeAbrirCajon, comensal.metodoPago);
        setSuccess(`Factura generada para ${nombre}`);
      } else {
        const itemsCompletos = comensal.items.map(itemId => selectedOrder?.items?.find(i => i.id === itemId)).filter(i => i);
        setPagosRegistrados(prev => [...prev, { cliente: { cedula, nombre, email }, items: itemsCompletos, total: totalComensal, metodoPago: comensal.metodoPago, payments }]);
        if (debeAbrirCajon) openCashDrawer();
        setSuccess(`Pago registrado para ${nombre}`);
      }

      setClientesDivididos(prev => prev.filter(c => c.id !== comensal.id));
      const [ordenActualizada] = await Promise.all([recargarOrden(), loadOrders()]);
      const itemsPendientes = ordenActualizada?.items?.filter(i => !i.paid).length || 0;

      if (itemsPendientes === 0) {
        if (!facturaIndividual) {
          let itemsFinales = [];
          for (const pago of pagosRegistrados) if (pago.items) itemsFinales.push(...pago.items);
          const itemsActuales = comensal.items.map(itemId => selectedOrder?.items?.find(i => i.id === itemId)).filter(i => i);
          itemsActuales.forEach(item => { if (!itemsFinales.some(i => i.id === item.id)) itemsFinales.push(item); });

          if (itemsFinales.length > 0) {
            const ordenCompleta = { ...selectedOrder, items: itemsFinales };
            const discountInfo = (appliedDiscount || appliedCouponsRef.current.length > 0) ? { id: appliedDiscount?.id, name: [appliedDiscount?.name, ...appliedCouponsRef.current.map(c => c.discount.name)].filter(Boolean).join(' + '), amount: discountAmount + couponDiscountAmount } : null;
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
            discount_amount: discountAmount + couponDiscountAmount
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
        const paid = Math.round((parseFloat(amountPaid) || 0) * 100) / 100;
        const totalExacto = Math.round(totalOrdenConDescuento * 100) / 100;
        if (paid < totalExacto) throw new Error(`Monto insuficiente. Total: ${fmt(totalExacto)}`);
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
            discount_amount: totalDescuento
          }),
        });
        invoiceData = await emitirFactura(selectedOrder, cedula, nombre, 'cash', discountInfo, clienteEmail);
        debeAbrirCajon = true;
        await imprimirTicket(selectedOrder, totalOrdenConDescuento, paid - totalOrdenConDescuento, invoiceData?.invoice_number, null, null, debeAbrirCajon, 'cash');
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
            discount_amount: totalDescuento
          }),
        });
        invoiceData = await emitirFactura(selectedOrder, cedula, nombre, 'card', discountInfo, clienteEmail);
        debeAbrirCajon = false;
        await imprimirTicket(selectedOrder, totalOrdenConDescuento, 0, invoiceData?.invoice_number, null, null, debeAbrirCajon, 'card');
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
            discount_amount: totalDescuento
          }),
        });
        invoiceData = await emitirFactura(selectedOrder, cedula, nombre, 'transfer', discountInfo, clienteEmail);
        debeAbrirCajon = false;
        await imprimirTicket(selectedOrder, totalOrdenConDescuento, 0, invoiceData?.invoice_number, null, null, debeAbrirCajon, 'transfer');
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
            discount_amount: totalDescuento
          }),
        });
        invoiceData = await emitirFactura(selectedOrder, cedula, nombre, 'mixto', discountInfo, clienteEmail);
        debeAbrirCajon = (cashNeeded > 0);
        await imprimirTicket(selectedOrder, totalOrdenConDescuento, cashAmt - cashNeeded, invoiceData?.invoice_number, null, null, debeAbrirCajon, 'mixto');
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

              {/* ===== DESCUENTOS + CUPONES ===== */}
              {!modoDividido && !modoPorCobrar && (
                <div style={{ background: '#1a3a3a', border: '1px solid #2d5f5f', borderRadius: '8px', marginBottom: '12px', color: '#e0e0e0', overflow: 'hidden' }}>
                  <div onClick={() => setDescuentosExpanded(p => !p)}
                    style={{ fontSize: '13px', fontWeight: '600', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none', borderBottom: descuentosExpanded ? '1px solid #2d5f5f' : 'none' }}>
                    <FiPercent size={14} />
                    DESCUENTOS Y CUPONES
                    {(appliedDiscount || appliedCouponsRef.current.length > 0) && (
                      <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#10b981', fontWeight: '700' }}>
                        -{fmt(discountAmount + couponDiscountAmount)}
                      </span>
                    )}
                    <span style={{ marginLeft: appliedDiscount || appliedCouponsRef.current.length > 0 ? '0' : 'auto', color: '#94a3b8', fontSize: '12px' }}>
                      {descuentosExpanded ? '▲' : '▼'}
                    </span>
                  </div>
                  {descuentosExpanded && <div style={{ padding: '12px' }}>

                  {/* ── Descuentos disponibles ── */}
                  {availableDiscounts.filter(d => d.is_active && d.type !== 'coupon' && isDiscountApplicable(d, getOrderTotal(), selectedOrder?.items || [])).length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                      {availableDiscounts
                        .filter(d => d.is_active && d.type !== 'coupon' && isDiscountApplicable(d, getOrderTotal(), selectedOrder?.items || []))
                        .map(discount => {
                          const isSelected = appliedDiscount?.id === discount.id;
                          const isFPPU = discount.type === 'fixed' && discount.applies_to === 'category' &&
                            String(discount.description || '').startsWith('__FPPU__');
                          const discountLabel =
                            isFPPU ? `$${parseFloat(discount.value).toFixed(2)}/u FIJO` :
                            discount.type === 'percentage' ? `${discount.value}% DESC` :
                            discount.type === 'fixed' ? `$${parseFloat(discount.value).toFixed(2)} DESC` :
                            discount.type === 'buy_x_get_y' ? `COMPRA X LLEVA Y` :
                            discount.type === 'bulk' ? `${discount.value}% MAYOREO` : `DESC`;
                          return (
                            <button
                              key={discount.id}
                              onClick={() => {
                                const couponAmt = couponDiscountAmount;
                                const ivaMult = 1 + ivaRateGlobal / 100;
                                if (isSelected) {
                                  manualDiscountRef.current = null;
                                  setAppliedDiscount(null);
                                  setDiscountAmount(0);
                                  setDiscountDetails(null);
                                  const base = getOrderTotal();
                                  setTotalOrdenConDescuento(couponAmt > 0 ? Math.round(Math.max(0, base - couponAmt * ivaMult) * 100) / 100 : base);
                                } else {
                                  const newAmount = calculateDiscountAmountForOrder(discount, getSubtotalSinIVA(), selectedOrder?.items || []);
                                  const details = { name: discount.name, type: discount.type, applies_to: discount.applies_to, value: discount.value, product_name: discount.product_name, category_name: discount.category_name };
                                  manualDiscountRef.current = { discount, amount: newAmount, details };
                                  setAppliedDiscount(discount);
                                  setDiscountAmount(newAmount);
                                  setDiscountDetails(details);
                                  recalcularTotalConDescuento(discount, newAmount);
                                  if (couponAmt > 0) {
                                    setTotalOrdenConDescuento(prev => Math.round(Math.max(0, prev - couponAmt * ivaMult) * 100) / 100);
                                  }
                                }
                              }}
                              style={{ padding: '8px 10px', borderRadius: '6px', border: isSelected ? '2px solid #10b981' : '1px solid #404040', background: isSelected ? 'rgba(16,185,129,0.2)' : '#262626', color: isSelected ? '#10b981' : '#b0b0b0', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all 0.2s', textAlign: 'center', whiteSpace: 'normal' }}
                              title={discount.name}
                            >
                              <div>{discountLabel}</div>
                              <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>{discount.name}</div>
                            </button>
                          );
                        })}
                    </div>
                  )}


                  {/* ── Selector de ítems para cupón de categoría ── */}
                  {couponPendingSelect && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '10px' }}>
                      <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: '600' }}>
                        🎯 Cupón "{pendingCoupon?.name}" — selecciona qué ítem(s) reciben el {pendingCoupon?.value}% de descuento:
                      </div>
                      {(selectedOrder?.items || [])
                        .filter(item => {
                          if (item.paid) return false;
                          if (pendingCoupon?.applies_to === 'category') {
                            return pendingCoupon.category_id
                              ? String(item.category_id) === String(pendingCoupon.category_id)
                              : true;
                          }
                          if (pendingCoupon?.applies_to === 'products_list') {
                            try {
                              const allowed = JSON.parse(pendingCoupon.description?.replace('__MULTIPRODUCT__', '') || '[]');
                              return allowed.some(p => String(p.id) === String(item.product_id));
                            } catch { return false; }
                          }
                          return false;
                        })
                        .map(item => {
                          const checked = couponSelectedItemIds.includes(item.id);
                          const base = (Number(item.selling_price) || Number(item.unit_price) || 0) * (Number(item.quantity) || 1);
                          const descItem = Math.round(base * (Number(pendingCoupon?.value) / 100) * 100) / 100;
                          return (
                            <div key={item.id} onClick={() => setCouponSelectedItemIds(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id])}
                              style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '8px 12px', borderRadius: '6px', background: checked ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${checked ? '#6366f1' : '#334155'}` }}>
                              <input type="checkbox" checked={checked} readOnly style={{ accentColor: '#6366f1', width: 16, height: 16, cursor: 'pointer' }} />
                              <span style={{ flex: 1, fontSize: '13px', color: '#f1f5f9' }}>{item.quantity}× {item.product_name}</span>
                              <span style={{ fontSize: '12px', color: '#94a3b8' }}>{fmt(base)}</span>
                              {checked && <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '700' }}>-{fmt(descItem)}</span>}
                            </div>
                          );
                        })}
                      {pendingSlotIdx !== null && couponSlots[pendingSlotIdx]?.error && (
                        <div style={{ color: '#ef4444', fontSize: '11px' }}>{couponSlots[pendingSlotIdx].error}</div>
                      )}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <button onClick={confirmarCuponCategoria} disabled={couponSelectedItemIds.length === 0}
                          style={{ flex: 1, background: couponSelectedItemIds.length > 0 ? '#6366f1' : '#334155', border: 'none', borderRadius: '6px', color: '#fff', padding: '9px', cursor: couponSelectedItemIds.length > 0 ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: '600' }}>
                          ✓ Aplicar ({couponSelectedItemIds.length} ítem{couponSelectedItemIds.length !== 1 ? 's' : ''})
                        </button>
                        <button onClick={() => { setCouponPendingSelect(false); setPendingCoupon(null); setPendingSlotIdx(null); setCouponSelectedItemIds([]); }}
                          style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#94a3b8', padding: '9px 14px', cursor: 'pointer', fontSize: '13px' }}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Cupones: cards aplicadas + inputs en una sola fila ── */}
                  <div style={{ borderTop: '1px solid #2d5f5f', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '6px' }}>
                      {/* Cards de cupones ya aplicados */}
                      {appliedCouponsRef.current.map((c, idx) => (
                        <div key={`applied-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(16,185,129,0.12)', border: '1px solid #10b981', borderRadius: '6px', padding: '7px 10px', flexShrink: 0 }}>
                          <FiTag size={11} style={{ color: '#10b981' }} />
                          <span style={{ fontSize: '12px', fontWeight: '700', color: '#10b981', whiteSpace: 'nowrap' }}>{c.discount.name}</span>
                          <span style={{ fontSize: '11px', color: '#6ee7b7', whiteSpace: 'nowrap' }}>-{fmt(c.amount)}</span>
                          <button onClick={() => quitarCupon(idx)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center' }}>
                            <FiX size={12} />
                          </button>
                        </div>
                      ))}
                      {/* Inputs de cupones */}
                      {couponSlots.map((slot, idx) => (
                        <div key={idx} style={{ flex: '1 1 160px', minWidth: '140px' }}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <input
                              type="text"
                              placeholder="Código de cupón"
                              value={slot.code}
                              onChange={e => setCouponSlots(prev => prev.map((s, i) => i === idx ? { ...s, code: e.target.value.toUpperCase(), error: '' } : s))}
                              onKeyPress={e => e.key === 'Enter' && aplicarCupon(idx)}
                              style={{ flex: 1, minWidth: 0, background: '#0f172a', border: `1px solid ${slot.error ? '#ef4444' : '#334155'}`, borderRadius: '6px', color: '#f1f5f9', padding: '7px 10px', fontSize: '13px', outline: 'none' }}
                            />
                            <button onClick={() => aplicarCupon(idx)}
                              style={{ background: '#6366f1', border: 'none', borderRadius: '6px', color: '#fff', padding: '7px 10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                              Aplicar
                            </button>
                            {couponSlots.length > 1 && (
                              <button onClick={() => setCouponSlots(prev => prev.filter((_, i) => i !== idx))}
                                style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#94a3b8', padding: '7px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                <FiX size={13} />
                              </button>
                            )}
                          </div>
                          {slot.error && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '3px' }}>{slot.error}</div>}
                        </div>
                      ))}
                      {/* Botón agregar */}
                      <button
                        onClick={() => setCouponSlots(prev => [...prev, { code: '', error: '' }])}
                        style={{ background: '#1e3a3a', border: '1px solid #2d5f5f', borderRadius: '6px', color: '#94a3b8', cursor: 'pointer', padding: '7px 10px', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, alignSelf: 'flex-start' }}>
                        <FiPlus size={11} /> +
                      </button>
                    </div>
                  </div>
                  </div>}
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
                      {appliedCouponsRef.current.map((c, idx) => (
                        <div key={idx} className="sub-iva-total discount-row">
                          <span><FiTag size={12} /> CUPÓN ({c.discount.name})</span>
                          <span style={{ color: '#10b981' }}>-{fmt(c.amount)}</span>
                        </div>
                      ))}
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
                    
                    <div className="totals-footer small">
                      <div>Pendiente por pagar: <strong>{fmt(totalPendiente)}</strong></div>
                      {selectedItems.length > 0 && <div>Seleccionado: {fmt(getSplitSubtotal() + getSplitTax())}</div>}
                    </div>

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
                <button className="btn-guardar" disabled={printLoading || (!modoDividido && !modoPorCobrar && metodoPagoNormal === 'cash' && (!amountPaid || Math.round((parseFloat(amountPaid) || 0) * 100) / 100 < Math.round(totalOrdenConDescuento * 100) / 100))}
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
                  <div className="historial-total">Total pagado: {fmt(pagosRegistrados.reduce((s, p) => s + p.total, 0))} / Pendiente: {fmt(Math.max(0, totalOrdenBruto - totalPagadoAcumulado))}</div>
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