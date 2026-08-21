import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWithAuth } from '../config/api';

export const useDiscounts = (
  selectedOrder,
  getSubtotalSinIVA,
  getIvaTotal,
  getOrderTotal,
  ivaRateGlobal,
  fmt
) => {
  // ─── Estados ──────────────────────────────────────────────────────
  const [availableDiscounts, setAvailableDiscounts] = useState([]);
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountDetails, setDiscountDetails] = useState(null);
  const [totalOrdenConDescuento, setTotalOrdenConDescuento] = useState(0);
  const [subtotalConDescuento, setSubtotalConDescuento] = useState(0);
  const [ivaConDescuento, setIvaConDescuento] = useState(0);
  const [couponSlots, setCouponSlots] = useState([{ code: '', error: '' }]);
  const [couponPendingSelect, setCouponPendingSelect] = useState(false);
  const [pendingCoupon, setPendingCoupon] = useState(null);
  const [pendingSlotIdx, setPendingSlotIdx] = useState(null);
  const [couponSelectedItemIds, setCouponSelectedItemIds] = useState([]);
  const [couponDiscountAmount, setCouponDiscountAmount] = useState(0);
  const [couponVersion, setCouponVersion] = useState(0);
  const [descuentosExpanded, setDescuentosExpanded] = useState(false);
  const [manualUpdateTrigger, setManualUpdateTrigger] = useState(0);

  const appliedCouponsRef = useRef([]);
  const manualDiscountRef = useRef(null);

  // ─── Helpers de descuentos ───────────────────────────────────────

  const getSubtotalByCategory = useCallback((items, categoryId) => {
    return items.reduce((sum, item) => {
      if (String(item.category_id) === String(categoryId)) {
        const price = Number(item.selling_price) || Number(item.unit_price) || 0;
        const quantity = Number(item.quantity) || 1;
        return sum + (price * quantity);
      }
      return sum;
    }, 0);
  }, []);

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

  const getQuantityByProduct = useCallback((items, productId) => {
    return items.reduce((sum, item) => {
      if (item.product_id === productId) {
        return sum + (Number(item.quantity) || 1);
      }
      return sum;
    }, 0);
  }, []);

  const parseComboData = useCallback((discount) => {
    try {
      const raw = String(discount.description || '');
      if (!raw.startsWith('__COMBO__')) return null;
      const jsonPart = raw.slice(9).split('||')[0];
      return JSON.parse(jsonPart);
    } catch { return null; }
  }, []);

  const isComboDiscount = useCallback((discount) =>
    String(discount.description || '').startsWith('__COMBO__'), []);

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
    
    if (isComboDiscount(discount)) {
      const comboData = parseComboData(discount);
      if (!comboData?.items?.length) return false;
      return comboData.items.every(ci => {
        const orderItem = items.find(i => String(i.product_id) === String(ci.id));
        return orderItem && (Number(orderItem.quantity) || 1) >= ci.qty;
      });
    }

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
    
    if (discount.applies_to === 'category') {
      if (!discount.category_id) return false;
      const catItems = items.filter(i => String(i.category_id) === String(discount.category_id));
      const totalCatQty = catItems.reduce((s, i) => s + (Number(i.quantity) || 1), 0);
      if (discount.type === 'buy_x_get_y') {
        return totalCatQty >= 2;
      }
      if (discount.type === 'fixed' && String(discount.description || '').startsWith('__FPPU__')) {
        return catItems.length > 0;
      }
      const categoryTotal = getSubtotalByCategory(items, discount.category_id);
      if (categoryTotal === 0) return false;
      if (discount.min_amount && categoryTotal < Number(discount.min_amount)) return false;
      return true;
    }
    
    if (discount.applies_to === 'order') {
      if (discount.min_amount && orderTotal < Number(discount.min_amount)) return false;
      return true;
    }
    
    return false;
  }, [getSubtotalByCategory, getSubtotalByProduct, getQuantityByProduct, isComboDiscount, parseComboData]);

  const calculateDiscountAmountForOrder = useCallback((discount, subtotalSinIVA, items = []) => {
    if (!discount || !discount.type || discount.value === undefined) return 0;
    
    let baseAmount = 0;
    let discountType = discount.type;
    let discountValue = Number(discount.value);

    if (isComboDiscount(discount)) {
      const comboData = parseComboData(discount);
      if (!comboData?.items?.length) return 0;
      const comboPrice = Number(comboData.price) || 0;
      const combosCount = Math.floor(Math.min(...comboData.items.map(ci => {
        const oi = items.find(i => String(i.product_id) === String(ci.id));
        return oi ? Math.floor((Number(oi.quantity) || 1) / ci.qty) : 0;
      })));
      if (combosCount < 1) return 0;
      const regularBase = comboData.items.reduce((s, ci) => {
        const oi = items.find(i => String(i.product_id) === String(ci.id));
        const price = oi ? (Number(oi.selling_price) || Number(oi.unit_price) || 0) : 0;
        return s + price * ci.qty;
      }, 0);
      const comboBasePrice = comboPrice / (1 + ivaRateGlobal / 100);
      return Math.max(0, (regularBase - comboBasePrice) * combosCount);
    }

    if (discount.applies_to === 'product' && discount.product_id) {
      baseAmount = getSubtotalByProduct(items, discount.product_id);
    } else if (discount.applies_to === 'category' && discount.category_id) {
      baseAmount = getSubtotalByCategory(items, discount.category_id);
    } else {
      baseAmount = subtotalSinIVA;
    }
    
    let amount = 0;

    if (discountType === 'percentage') {
      amount = baseAmount * (discountValue / 100);
    } else if (discountType === 'fixed') {
      if (discount.applies_to === 'category' && discount.category_id &&
          String(discount.description || '').startsWith('__FPPU__')) {
        const catItems = items.filter(i => String(i.category_id) === String(discount.category_id));
        const baseTarget = discountValue / (1 + ivaRateGlobal / 100);
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
        const catItems = items.filter(i => String(i.category_id) === String(discount.category_id));
        const allUnits = [];
        catItems.forEach(item => {
          const price = Number(item.selling_price) || Number(item.unit_price) || 0;
          for (let u = 0; u < (Number(item.quantity) || 1); u++) allUnits.push(price);
        });
        allUnits.sort((a, b) => a - b);
        const discountedUnits = Math.floor(allUnits.length / 2);
        amount = allUnits.slice(0, discountedUnits).reduce((s, p) => s + p * (discountValue / 100), 0);
      } else {
        const minQty = discount.min_quantity || 2;
        const freeQty = discount.free_quantity || 1;
        const discountPercent = (freeQty / (minQty + freeQty)) * 100;
        amount = baseAmount * (discountPercent / 100);
      }
    } else if (discountType === 'bulk') {
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
    
    if (discount.max_discount && amount > Number(discount.max_discount)) {
      amount = Number(discount.max_discount);
    }
    
    if (amount > baseAmount) amount = baseAmount;
    
    return amount;
  }, [getSubtotalByCategory, getSubtotalByProduct, getQuantityByProduct, isComboDiscount, parseComboData, ivaRateGlobal]);

  // ─── Función central para recalcular totales con descuento ──────
  const recalcularTotalConDescuento = useCallback((discount = null, amount = 0) => {
    if (!selectedOrder) {
      setTotalOrdenConDescuento(0);
      setSubtotalConDescuento(0);
      setIvaConDescuento(0);
      return;
    }

    const items = selectedOrder.items || [];
    if (items.length === 0) {
      setTotalOrdenConDescuento(0);
      setSubtotalConDescuento(0);
      setIvaConDescuento(0);
      return;
    }

    // 1. Obtener descuento total (manual + cupones)
    let totalDescuento = (discountAmount || 0) + (couponDiscountAmount || 0);
    // Si se pasa un descuento específico (para actualización manual), usar ese
    if (discount && amount > 0) {
      totalDescuento = amount;
    }

    if (totalDescuento === 0) {
      // Sin descuento: usar totales originales
      const totalOriginal = getOrderTotal();
      const subtotalOriginal = getSubtotalSinIVA();
      const ivaOriginal = getIvaTotal();
      setTotalOrdenConDescuento(totalOriginal);
      setSubtotalConDescuento(subtotalOriginal);
      setIvaConDescuento(ivaOriginal);
      return;
    }

    // 2. Calcular subtotal original (base sin IVA) de todos los items
    const subtotalOriginal = items.reduce((sum, item) => {
      const price = Number(item.selling_price) || Number(item.unit_price) || 0;
      const qty = Number(item.quantity) || 1;
      return sum + price * qty;
    }, 0);

    if (subtotalOriginal === 0) {
      setTotalOrdenConDescuento(0);
      setSubtotalConDescuento(0);
      setIvaConDescuento(0);
      return;
    }

    // 3. Distribuir descuento proporcionalmente entre items y recalcular IVA
    let nuevoSubtotalTotal = 0;
    let nuevoIvaTotal = 0;

    items.forEach(item => {
      const price = Number(item.selling_price) || Number(item.unit_price) || 0;
      const qty = Number(item.quantity) || 1;
      const subtotalItem = price * qty;

      // Tasa de IVA del producto (0, 10, 15, etc.)
      const taxRate = Number(item.tax_rate) ?? Number(item.is_taxable) ?? 0;

      // Descuento proporcional
      const descuentoItem = (subtotalItem / subtotalOriginal) * totalDescuento;
      const nuevoSubtotalItem = Math.max(0, subtotalItem - descuentoItem);

      // Recalcular IVA del item con su propia tasa
      const nuevoIvaItem = (taxRate > 0) ? Math.round(nuevoSubtotalItem * (taxRate / 100) * 100) / 100 : 0;

      nuevoSubtotalTotal += nuevoSubtotalItem;
      nuevoIvaTotal += nuevoIvaItem;
    });

    // Redondear a 2 decimales
    nuevoSubtotalTotal = Math.round(nuevoSubtotalTotal * 100) / 100;
    nuevoIvaTotal = Math.round(nuevoIvaTotal * 100) / 100;
    const nuevoTotal = Math.round((nuevoSubtotalTotal + nuevoIvaTotal) * 100) / 100;

    setSubtotalConDescuento(nuevoSubtotalTotal);
    setIvaConDescuento(nuevoIvaTotal);
    setTotalOrdenConDescuento(nuevoTotal);
  }, [selectedOrder, discountAmount, couponDiscountAmount, getOrderTotal, getSubtotalSinIVA, getIvaTotal]);

  // ─── updateDiscountValues ────────────────────────────────────────
  const updateDiscountValues = useCallback(() => {
    if (!selectedOrder) {
      setAppliedDiscount(null);
      setDiscountAmount(0);
      setDiscountDetails(null);
      setCouponDiscountAmount(0);
      setTotalOrdenConDescuento(0);
      setSubtotalConDescuento(0);
      setIvaConDescuento(0);
      return;
    }

    // 1. Descuento manual
    let manualAmt = 0;
    const manual = manualDiscountRef.current;
    if (manual && manual.amount > 0) {
      manualAmt = manual.amount;
      setAppliedDiscount(manual.discount);
      setDiscountAmount(manual.amount);
      setDiscountDetails(manual.details);
    } else {
      setAppliedDiscount(null);
      setDiscountAmount(0);
      setDiscountDetails(null);
    }

    // 2. Descuentos de cupones
    let couponAmt = 0;
    for (const c of appliedCouponsRef.current) {
      couponAmt += c.amount || 0;
    }
    setCouponDiscountAmount(couponAmt);

    // 3. Recalcular total con descuento total (usando los descuentos actuales)
    recalcularTotalConDescuento();
  }, [selectedOrder, recalcularTotalConDescuento]);

  // ─── Cargar descuentos ─────────────────────────────────────────────
  const loadDiscounts = async () => {
    try {
      const res = await fetchWithAuth('/discounts');
      if (res.ok) {
        const data = await res.json();
        const validDiscounts = (Array.isArray(data) ? data : []).filter(d => {
          if (!d || !d.id || !d.name || d.is_active === undefined || !d.type || d.value === undefined) return false;
          if (d.applies_to === 'category' && !d.category_id && d.type !== 'coupon') return false;
          if (d.applies_to === 'product' && !d.product_id) return false;
          return true;
        });
        setAvailableDiscounts(validDiscounts);
      } else {
        setAvailableDiscounts([]);
      }
    } catch (err) {
      setAvailableDiscounts([]);
    }
  };

  // ─── Aplicar cupón ─────────────────────────────────────────────────
  const aplicarCupon = (slotIdx) => {
    const slot = couponSlots[slotIdx];
    const code = (slot?.code || '').trim().toUpperCase();
    const setSlotError = (idx, err) =>
      setCouponSlots(prev => prev.map((s, i) => i === idx ? { ...s, error: err } : s));
    
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
    setManualUpdateTrigger(v => v + 1);
  };

  // ─── Quitar cupón ──────────────────────────────────────────────────
  const quitarCupon = (couponIdx) => {
    appliedCouponsRef.current = appliedCouponsRef.current.filter((_, i) => i !== couponIdx);
    setCouponVersion(v => v + 1);
    setManualUpdateTrigger(v => v + 1);
  };

  // ─── Confirmar cupón de categoría ─────────────────────────────────
  const confirmarCuponCategoria = () => {
    if (couponSelectedItemIds.length === 0) { 
      setCouponSlots(prev => prev.map((s, i) => i === pendingSlotIdx ? { ...s, error: 'Selecciona al menos un ítem' } : s));
      return; 
    }
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
    if (newAmount <= 0) { 
      setCouponSlots(prev => prev.map((s, i) => i === pendingSlotIdx ? { ...s, error: 'El descuento resultó en 0' } : s));
      return; 
    }

    const details = { name: coupon.name, type: coupon.type, applies_to: 'category', value: coupon.value };
    appliedCouponsRef.current = [...appliedCouponsRef.current, { discount: coupon, amount: newAmount, details }];
    if (pendingSlotIdx !== null) {
      setCouponSlots(prev => prev.map((s, i) => i === pendingSlotIdx ? { code: '', error: '' } : s));
    }
    setCouponVersion(v => v + 1);
    setManualUpdateTrigger(v => v + 1);
    setCouponPendingSelect(false);
    setPendingCoupon(null);
    setPendingSlotIdx(null);
    setCouponSelectedItemIds([]);
  };

  // ─── Efectos ───────────────────────────────────────────────────────
  useEffect(() => {
    loadDiscounts();
  }, []);

  useEffect(() => {
    updateDiscountValues();
  }, [selectedOrder, availableDiscounts, couponVersion, manualUpdateTrigger]);

  // ─── Retornar ──────────────────────────────────────────────────────
  return {
    availableDiscounts,
    appliedDiscount, setAppliedDiscount,
    discountAmount, setDiscountAmount,
    discountDetails, setDiscountDetails,
    totalOrdenConDescuento, setTotalOrdenConDescuento,
    subtotalConDescuento,
    ivaConDescuento,
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
    loadDiscounts,
    updateDiscountValues,
    aplicarCupon,
    quitarCupon,
    confirmarCuponCategoria,
    isDiscountApplicable,
    calculateDiscountAmountForOrder,
    recalcularTotalConDescuento,
  };
};