// src/pages/business/PosGeneralPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import PageTemplate from '../../components/PageTemplate';
import {
  FiSearch, FiX, FiPlus, FiMinus, FiTrash2,
  FiCreditCard, FiPercent, FiTag,
  FiGrid, FiCheck, FiHash, FiUser, FiClock
} from 'react-icons/fi';
import { FaHandHoldingDollar, FaMoneyBillTransfer } from 'react-icons/fa6';
import OpenDrawerButton from '../../components/OpenDrawerButton';
import { fetchWithAuth } from '../../config/api';
import { calculatePVP } from '../../utils/productUtils';
import { consultarDocumento } from '../../utils/ecuadorApi';
import { useQzTray } from '../../components/useQzTray';
import { usePrinterService } from '../../services/usePrinterService';
import PrintModal from '../../components/POS/PrintModal';
import CreditPayment from '../../components/POS/CreditPayment';
import Button, { IconTextButton, ButtonGroup } from '../../components/General/Button';
import Input from '../../components/General/Input';
import CustomCombobox from '../../components/General/CustomCombobox';
import SearchInput from '../../components/General/SearchInput';

export default function PosGeneralPage() {
  const { selectedBusiness, user } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const { printerError } = useQzTray();
  const { print } = usePrinterService();
  const barcodeRef = useRef(null);
  const appliedCouponRef = useRef(null);
  const manualDiscountRef = useRef(null);
  const printResolveRef = useRef(null);
  const barcodeTimeoutRef = useRef(null);
  const handledReceivableStateRef = useRef(null);
  const receivableLoadRef = useRef(0);

  const [showPrintModal, setShowPrintModal] = useState(false);
  const awaitPrintDecision = () => new Promise(res => { printResolveRef.current = res; setShowPrintModal(true); });
  const handlePrintDecision = (shouldPrint) => {
    setShowPrintModal(false);
    printResolveRef.current?.(shouldPrint);
    printResolveRef.current = null;
  };

  // Catálogo
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');

  // Carrito
  const [cart, setCart] = useState([]);

  // Colaboradores (employees)
  const [collaborators, setCollaborators] = useState([]);
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState('');

  // Cliente
  const [clienteCedula, setClienteCedula] = useState('9999999999');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [clientApiLoading, setClientApiLoading] = useState(false);
  const [foundCliente, setFoundCliente] = useState(null);

  // Pago
  const [metodoPago, setMetodoPago] = useState('cash');
  const [modoPorCobrar, setModoPorCobrar] = useState(false);
  const [receivableToCollect, setReceivableToCollect] = useState(null);
  const [receivableOrder, setReceivableOrder] = useState(null);
  const [receivableOrderLoading, setReceivableOrderLoading] = useState(false);
  const [receivablePaymentAmount, setReceivablePaymentAmount] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [amountPaidRaw, setAmountPaidRaw] = useState('');
  const [cardPaid, setCardPaid] = useState('');
  const [cardPaidRaw, setCardPaidRaw] = useState('');
  const [transferPaid, setTransferPaid] = useState('');
  const [transferPaidRaw, setTransferPaidRaw] = useState('');
  const [refCard, setRefCard] = useState('');
  const [refTransfer, setRefTransfer] = useState('');
  const [mixtoManual, setMixtoManual] = useState(new Set());
  const [mixtoActive, setMixtoActive] = useState(new Set());

  // Descuentos
  const [availableDiscounts, setAvailableDiscounts] = useState([]);
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [totalConDescuento, setTotalConDescuento] = useState(0);
  const [subtotalConDescuento, setSubtotalConDescuento] = useState(0);
  const [ivaConDescuento, setIvaConDescuento] = useState(0);

  // Cupones
  const [showDiscounts, setShowDiscounts] = useState(false);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponPendingSelect, setCouponPendingSelect] = useState(false);
  const [pendingCoupon, setPendingCoupon] = useState(null);
  const [couponSelectedItemIds, setCouponSelectedItemIds] = useState([]);
  const [couponDiscountAmount, setCouponDiscountAmount] = useState(0);
  const [appliedCouponDiscount, setAppliedCouponDiscount] = useState(null);
  const [couponVersion, setCouponVersion] = useState(0);

  // Fiscal
  const [ivaRateGlobal, setIvaRateGlobal] = useState(15);
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [bizInfo, setBizInfo] = useState(null);

  // UI
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [printLoading, setPrintLoading] = useState(false);
  const [processingCliente, setProcessingCliente] = useState(false);
  const [mobileTab, setMobileTab] = useState('catalog');

  useEffect(() => {
    const account = location.state;
    if (!account?.fromReceivable || !account.receivableId || handledReceivableStateRef.current === account) return;
    handledReceivableStateRef.current = account;
    const loadId = ++receivableLoadRef.current;

    const balance = Number(account.receivableBalance ?? account.receivableAmount ?? 0);
    setReceivableToCollect({
      id: account.receivableId,
      orderNumber: account.orderNumber || '',
      amount: Number(account.receivableAmount ?? balance),
      customerName: account.customerName || '',
      customerCedula: account.customerCedula || '',
      customerEmail: account.customerEmail || '',
      customerPhone: account.customerPhone || '',
      customerAddress: account.customerAddress || '',
      dueDate: account.receivableDueDate || '',
      balance,
      status: account.receivableStatus || 'pending',
    });
    setReceivableOrder(null);
    setReceivableOrderLoading(true);
    setReceivablePaymentAmount('0.00');
    setModoPorCobrar(false);
    setAmountPaid('');
    setAmountPaidRaw('');
    setCardPaid('');
    setCardPaidRaw('');
    setTransferPaid('');
    setTransferPaidRaw('');
    setRefCard('');
    setRefTransfer('');
    setMixtoActive(new Set());
    setMixtoManual(new Set());
    setMetodoPago('cash');
    setClienteCedula(account.customerCedula || '9999999999');
    setClienteNombre(account.customerName || '');
    setClienteEmail(account.customerEmail || '');
    setSelectedCollaboratorId('');
    setMobileTab('cart');
    setCart([]);
    manualDiscountRef.current = null;
    appliedCouponRef.current = null;
    setAppliedDiscount(null);
    setDiscountAmount(0);
    setSubtotalConDescuento(0);
    setIvaConDescuento(0);
    setTotalConDescuento(0);
    setCouponDiscountAmount(0);
    setAppliedCouponDiscount(null);
    setCouponPendingSelect(false);
    setPendingCoupon(null);
    setCouponSelectedItemIds([]);
    setError('');
    setSuccess('');

    const loadOrder = async () => {
      try {
        if (!account.orderNumber) throw new Error('La cuenta no tiene un número de orden asociado.');
        const response = await fetchWithAuth(
          `/pos-general/orders/by-number/${encodeURIComponent(account.orderNumber)}`
        );
        const result = await response.json();
        if (loadId !== receivableLoadRef.current) return;
        if (!response.ok) throw new Error(result.error || 'No se pudo cargar la orden de la cuenta.');

        const orderItems = (result.items || []).map(item => {
          const quantity = Number(item.quantity) || 1;
          const unitPrice = Number(item.unit_price) || 0;
          const taxAmount = Number(item.iva_amount) || 0;
          return {
            product_id: item.product_id || item.id,
            product_name: item.product_name || 'Producto',
            code: item.code || '',
            quantity,
            selling_price: unitPrice,
            tax_rate: Number(item.tax_rate) || 0,
            unit_iva_amount: quantity ? taxAmount / quantity : 0,
            iva_amount: taxAmount,
            line_total: Number(item.line_total) || (unitPrice * quantity + taxAmount),
          };
        });
        if (!orderItems.length) throw new Error('La orden asociada no contiene productos.');

        const itemSubtotal = redondear(orderItems.reduce(
          (sum, item) => sum + item.selling_price * item.quantity,
          0
        ));
        const itemTax = redondear(orderItems.reduce((sum, item) => sum + item.iva_amount, 0));
        const orderDiscount = Math.min(Number(result.discount_amount) || 0, itemSubtotal);
        const netSubtotal = redondear(Math.max(0, itemSubtotal - orderDiscount));
        const taxScale = itemSubtotal > 0 ? netSubtotal / itemSubtotal : 1;
        const netTax = redondear(itemTax * taxScale);
        const reconciledTotal = redondear(netSubtotal + netTax);
        const expectedOrderTotal = Number(account.receivableAmount ?? reconciledTotal);
        const needsTotalReconciliation = Math.abs((Number(result.total) || 0) - expectedOrderTotal) > 0.01;
        const loadedOrder = {
          ...result,
          ...(needsTotalReconciliation
            ? { subtotal: itemSubtotal, tax_amount: netTax, total: reconciledTotal }
            : {}),
          items: orderItems,
        };
        setReceivableOrder(loadedOrder);
        setReceivableToCollect(current => ({
          ...current,
          orderNumber: result.order_number || current.orderNumber,
        }));
        setCart(orderItems);
        setSelectedCollaboratorId(result.collaborator_id ? String(result.collaborator_id) : '');
        setClienteCedula(result.customer_document_number || account.customerCedula || '9999999999');
        setClienteNombre(result.customer_name || account.customerName || '');
        setClienteEmail(result.customer_email || account.customerEmail || '');
      } catch (loadError) {
        if (loadId === receivableLoadRef.current) {
          setError(loadError.message || 'No se pudo cargar la orden de la cuenta.');
        }
      } finally {
        if (loadId === receivableLoadRef.current) setReceivableOrderLoading(false);
      }
    };
    loadOrder();
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const redondear = (valor) => Math.round(valor * 100) / 100;
  const fmt = (n) => `${currencySymbol}${redondear(parseFloat(n || 0)).toFixed(2)}`;

  const subtotalSinIVA = redondear(cart.reduce((s, i) => s + i.selling_price * i.quantity, 0));
  const ivaTotal = redondear(cart.reduce((s, i) => s + (i.iva_amount || 0), 0));
  const totalBruto = redondear(subtotalSinIVA + ivaTotal);
  const totalParaCobrar = receivableToCollect
    ? Number(receivablePaymentAmount) || 0
    : totalConDescuento;

  // ── Helpers descuentos ──
  const getSubtotalByCategory = useCallback((cartItems, categoryId) =>
    redondear(cartItems.reduce((s, i) => i.category_id === categoryId ? s + i.selling_price * i.quantity : s, 0)), []);
  const getSubtotalByProduct = useCallback((cartItems, productId) =>
    redondear(cartItems.reduce((s, i) => i.product_id === productId ? s + i.selling_price * i.quantity : s, 0)), []);
  const getQuantityByProduct = useCallback((cartItems, productId) =>
    cartItems.reduce((s, i) => i.product_id === productId ? s + i.quantity : s, 0), []);

  const isDiscountApplicable = useCallback((discount, orderTotal, items) => {
    if (!discount.is_active || !discount.type || discount.value === undefined) return false;
    const now = new Date();
    if (discount.start_date && new Date(discount.start_date) > now) return false;
    if (discount.end_date && new Date(discount.end_date) < now) return false;
    if (discount.days_of_week?.length && !discount.days_of_week.includes(now.getDay())) return false;
    if (discount.start_time && discount.end_time) {
      const t = now.toTimeString().slice(0, 5);
      if (t < discount.start_time || t > discount.end_time) return false;
    }
    if (discount.applies_to === 'product') {
      if (!discount.product_id) return false;
      const pt = getSubtotalByProduct(items, discount.product_id);
      if (pt === 0) return false;
      if (discount.min_amount && pt < Number(discount.min_amount)) return false;
      if (discount.min_quantity && getQuantityByProduct(items, discount.product_id) < discount.min_quantity) return false;
      return true;
    }
    if (discount.applies_to === 'category') {
      if (!discount.category_id) return false;
      const ct = getSubtotalByCategory(items, discount.category_id);
      if (ct === 0) return false;
      if (discount.min_amount && ct < Number(discount.min_amount)) return false;
      return true;
    }
    if (discount.applies_to === 'order') {
      if (discount.min_amount && orderTotal < Number(discount.min_amount)) return false;
      return true;
    }
    return false;
  }, [getSubtotalByCategory, getSubtotalByProduct, getQuantityByProduct]);

  const calculateDiscountAmount = useCallback((discount, base, items) => {
    if (!discount || !discount.type || discount.value === undefined) return 0;
    let baseAmt = 0;
    if (discount.applies_to === 'product' && discount.product_id) baseAmt = getSubtotalByProduct(items, discount.product_id);
    else if (discount.applies_to === 'category' && discount.category_id) baseAmt = getSubtotalByCategory(items, discount.category_id);
    else baseAmt = base;

    let amount = 0;
    const v = Number(discount.value);
    if (discount.type === 'percentage') amount = baseAmt * (v / 100);
    else if (discount.type === 'fixed') {
      if (discount.applies_to === 'category' && String(discount.description || '').startsWith('__FPPU__')) {
        const catItems = items.filter(i => String(i.category_id) === String(discount.category_id));
        const baseTarget = v / (1 + ivaRateGlobal / 100);
        amount = catItems.reduce((s, item) => {
          const diff = (Number(item.selling_price) || 0) - baseTarget;
          return diff > 0 ? s + diff * (item.quantity || 1) : s;
        }, 0);
      } else amount = Math.min(v, baseAmt);
    }
    else if (discount.type === 'buy_x_get_y') {
      amount = baseAmt * ((discount.free_quantity || 1) / ((discount.min_quantity || 2) + (discount.free_quantity || 1)));
    } else if (discount.type === 'bulk') {
      const qty = discount.applies_to === 'product' && discount.product_id
        ? getQuantityByProduct(items, discount.product_id)
        : items.reduce((s, i) => s + i.quantity, 0);
      if (qty >= (discount.min_quantity || 1)) amount = baseAmt * (v / 100);
    } else if (discount.type === 'coupon') amount = Math.min(v, baseAmt);
    if (discount.max_discount && amount > Number(discount.max_discount)) amount = Number(discount.max_discount);
    return redondear(Math.min(amount, baseAmt));
  }, [getSubtotalByCategory, getSubtotalByProduct, getQuantityByProduct, ivaRateGlobal]);

  // ── Recalcular totales ──
  useEffect(() => {
    const cartItems = cart.map(i => ({ ...i }));
    if (cartItems.length === 0) {
      setTotalConDescuento(0); setSubtotalConDescuento(0); setIvaConDescuento(0);
      setAppliedDiscount(null); setDiscountAmount(0);
      setCouponDiscountAmount(0); setAppliedCouponDiscount(null);
      return;
    }

    let manualAmt = 0;
    if (manualDiscountRef.current) {
      const newAmt = calculateDiscountAmount(manualDiscountRef.current.discount, subtotalSinIVA, cartItems);
      if (newAmt > 0) { manualAmt = newAmt; setAppliedDiscount(manualDiscountRef.current.discount); setDiscountAmount(newAmt); }
      else { manualDiscountRef.current = null; setAppliedDiscount(null); setDiscountAmount(0); }
    } else { setAppliedDiscount(null); setDiscountAmount(0); }

    let couponAmt = 0;
    if (appliedCouponRef.current) {
      const coupon = appliedCouponRef.current.discount;
      couponAmt = coupon.applies_to === 'category'
        ? appliedCouponRef.current.amount
        : calculateDiscountAmount(coupon, subtotalSinIVA, cartItems);
      couponAmt = redondear(Math.max(0, couponAmt));
      setCouponDiscountAmount(couponAmt); setAppliedCouponDiscount(coupon);
    } else { setCouponDiscountAmount(0); setAppliedCouponDiscount(null); }

    const descuentoTotal = redondear(manualAmt + couponAmt);
    if (descuentoTotal === 0) {
      setTotalConDescuento(totalBruto); setSubtotalConDescuento(subtotalSinIVA); setIvaConDescuento(ivaTotal);
      return;
    }
    const subtotalOriginal = cartItems.reduce((s, i) => s + i.selling_price * i.quantity, 0);
    if (subtotalOriginal === 0) { setTotalConDescuento(0); setSubtotalConDescuento(0); setIvaConDescuento(0); return; }

    let nuevoSub = 0, nuevoIva = 0;
    cartItems.forEach(item => {
      const subItem = item.selling_price * item.quantity;
      const descItem = redondear(descuentoTotal * (subItem / subtotalOriginal));
      const nuevoSubItem = redondear(Math.max(0, subItem - descItem));
      nuevoSub += nuevoSubItem;
      nuevoIva += subItem > 0
        ? redondear(item.iva_amount * (nuevoSubItem / subItem))
        : 0;
    });
    setTotalConDescuento(redondear(nuevoSub + nuevoIva));
    setSubtotalConDescuento(nuevoSub);
    setIvaConDescuento(nuevoIva);
  }, [cart, subtotalSinIVA, ivaTotal, totalBruto, ivaRateGlobal, calculateDiscountAmount, couponVersion]);

  // ── Carga inicial ──
  useEffect(() => {
    loadProducts(); loadDiscounts(); loadFiscalConfig(); loadBizInfo(); loadCollaborators();
  }, [selectedBusiness]);

  const loadProducts = async () => {
    try {
      const res = await fetchWithAuth('/productos');
      if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.productos ?? data?.data ?? [];
      const normalized = list.map(p => {
        const price = Number(p.selling_price) || 0;
        const taxPct = typeof p.is_taxable === 'boolean'
          ? (p.is_taxable ? ivaRateGlobal : 0)
          : Number(p.is_taxable) || 0;
        return { ...p, selling_price: price, tax_rate: taxPct,
          iva_amount: p.is_active && taxPct > 0 ? redondear(calculatePVP(p) - price) : 0,
          stock: p.stock != null ? Number(p.stock) : null,
          category_id: p.category_id || null,
          code: p.code || p.barcode || p.sku || '',
          barcode: p.barcode || '', sku: p.sku || '' };
      });
      setProducts(normalized);
      const cats = []; const seen = new Set();
      list.forEach(p => {
        if (p.category_id && p.category_name && !seen.has(p.category_id)) {
          seen.add(p.category_id); cats.push({ id: p.category_id, name: p.category_name });
        }
      });
      setCategories(cats);
    } catch (e) { console.error('Error loading products:', e); }
  };

  const loadDiscounts = async () => {
    try {
      const res = await fetchWithAuth('/discounts');
      if (res.ok) {
        const data = await res.json();
        setAvailableDiscounts((Array.isArray(data) ? data : []).filter(d => d?.id && d?.name && d?.is_active !== undefined && d?.type && d?.value !== undefined));
      }
    } catch (e) { console.error('Error loading discounts:', e); }
  };

  const loadFiscalConfig = async () => {
    try {
      const res = await fetchWithAuth('/fiscal/config');
      if (res.ok) {
        const data = await res.json();
        if (data?.iva_rate) setIvaRateGlobal(Number(data.iva_rate));
        if (data?.currency_symbol) setCurrencySymbol(data.currency_symbol);
      }
    } catch (e) { console.error('Error loading fiscal config:', e); }
  };

  const loadBizInfo = async () => {
    try {
      const res = await fetchWithAuth('/settings/receipt-info');
      if (res.ok) setBizInfo(await res.json());
    } catch (e) { console.error('Error loading biz info:', e); }
  };

  // 🔥 Colaboradores desde /employees
  const loadCollaborators = async () => {
    try {
      const res = await fetchWithAuth('/employees');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.employees ?? data?.data ?? [];
        const normalized = list
          .filter(e => e.status !== 'inactive' && e.status !== 'terminated')
          .map(e => ({
            id: e.id,
            full_name: e.full_name || '',
          }));
        setCollaborators(normalized);
      }
    } catch (e) { console.error('Error loading collaborators:', e); }
  };

  // ── Filtro ──
  const filteredProducts = products.filter(p => {
    const matchCat = !selectedCategory || p.category_id === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || String(p.name || '').toLowerCase().includes(q) || String(p.code || '').toLowerCase().includes(q) ||
      String(p.barcode || '').toLowerCase().includes(q) || String(p.sku || '').toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  // ── Carrito ──
  const addToCart = (product) => {
    if (receivableToCollect) return;
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        const newQty = existing.quantity + 1;
        const newIva = redondear(product.iva_amount * newQty);
        return prev.map(i => i.product_id === product.id
          ? { ...i, quantity: newQty, iva_amount: newIva,
              line_total: redondear(i.selling_price * newQty + newIva) }
          : i);
      }
      const iva = product.iva_amount;
      return [...prev, { product_id: product.id, product_name: product.name, selling_price: product.selling_price,
        tax_rate: product.tax_rate, unit_iva_amount: iva, category_id: product.category_id, code: product.code,
        quantity: 1, iva_amount: iva, line_total: redondear(product.selling_price + iva) }];
    });
    setError('');
  };

  const updateQty = (productId, delta) => {
    setCart(prev => prev.map(i => {
      if (i.product_id !== productId) return i;
      const quantity = Math.max(1, i.quantity + delta);
      const iva = redondear((i.unit_iva_amount ?? i.selling_price * (i.tax_rate / 100)) * quantity);
      return { ...i, quantity, iva_amount: iva, line_total: redondear(i.selling_price * quantity + iva) };
    }));
  };

  const setQtyDirect = (productId, val) => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n > 0) {
      setCart(prev => prev.map(i => {
        if (i.product_id !== productId) return i;
        const iva = redondear((i.unit_iva_amount ?? i.selling_price * (i.tax_rate / 100)) * n);
        return { ...i, quantity: n, iva_amount: iva, line_total: redondear(i.selling_price * n + iva) };
      }));
    }
  };

  const removeFromCart = (productId) => setCart(prev => prev.filter(i => i.product_id !== productId));

  const clearCart = () => {
    if (receivableToCollect) return;
    setCart([]); setClienteCedula('9999999999'); setClienteNombre(''); setClienteEmail(''); setFoundCliente(null);
    setMetodoPago('cash'); setModoPorCobrar(false);
    setAmountPaid(''); setAmountPaidRaw(''); setCardPaid(''); setCardPaidRaw('');
    setTransferPaid(''); setTransferPaidRaw(''); setRefCard(''); setRefTransfer('');
    setMixtoManual(new Set()); setMixtoActive(new Set());
    setError(''); setSuccess('');
    appliedCouponRef.current = null; manualDiscountRef.current = null;
    setCouponCodeInput(''); setCouponError(''); setCouponPendingSelect(false);
    setPendingCoupon(null); setCouponSelectedItemIds([]); setCouponDiscountAmount(0);
    setAppliedCouponDiscount(null); setTotalConDescuento(0);
    setSubtotalConDescuento(0); setIvaConDescuento(0); setShowDiscounts(false);
    setSelectedCollaboratorId('');
    if (barcodeRef.current) barcodeRef.current.focus();
  };

  // ── Cupones ──
  const aplicarCupon = () => {
    setCouponError('');
    const code = couponCodeInput.trim().toUpperCase();
    if (!code) { setCouponError('Ingrese el código del cupón'); return; }
    if (cart.length === 0) { setCouponError('Agrega productos al carrito primero'); return; }
    const coupon = availableDiscounts.find(d => d.type === 'coupon' && d.is_active &&
      ((d.code && d.code.toUpperCase() === code) || (d.name && d.name.toUpperCase() === code)));
    if (!coupon) { setCouponError('Código de cupón inválido o inactivo'); return; }
    const cartItems = cart.map(i => ({ ...i }));
    if (coupon.applies_to === 'category' && coupon.category_id) {
      const catItems = cartItems.filter(i => String(i.category_id) === String(coupon.category_id));
      if (catItems.length === 0) { setCouponError(`No hay productos de esa categoría`); return; }
      setPendingCoupon(coupon); setCouponPendingSelect(true); setCouponSelectedItemIds([]); return;
    }
    const newAmount = calculateDiscountAmount(coupon, subtotalSinIVA, cartItems);
    if (newAmount <= 0) { setCouponError('El cupón no aplica a este carrito'); return; }
    manualDiscountRef.current = null;
    appliedCouponRef.current = { discount: coupon, amount: newAmount };
    setCouponVersion(v => v + 1);
    setSuccess(`Cupón "${coupon.name}" aplicado: -${fmt(newAmount)}`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const confirmarCuponCategoria = () => {
    if (couponSelectedItemIds.length === 0) { setCouponError('Selecciona al menos un ítem'); return; }
    const coupon = pendingCoupon;
    const pct = Number(coupon.value) / 100;
    const selectedTotal = cart.filter(i => couponSelectedItemIds.includes(i.product_id)).reduce((s, i) => s + i.selling_price * i.quantity, 0);
    const newAmount = redondear(selectedTotal * pct);
    if (newAmount <= 0) { setCouponError('El descuento resultó en 0'); return; }
    manualDiscountRef.current = null;
    appliedCouponRef.current = { discount: coupon, amount: newAmount };
    setCouponVersion(v => v + 1); setCouponPendingSelect(false); setPendingCoupon(null);
    setCouponSelectedItemIds([]); setCouponError('');
    setSuccess(`Cupón "${coupon.name}" aplicado: -${fmt(newAmount)}`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const quitarCupon = () => {
    appliedCouponRef.current = null; setCouponCodeInput(''); setCouponError('');
    setCouponPendingSelect(false); setPendingCoupon(null); setCouponSelectedItemIds([]);
    setCouponDiscountAmount(0); setAppliedCouponDiscount(null); setCouponVersion(v => v + 1);
  };

  // ── Escáner ──
  const handleBarcodeChange = (value) => {
    setBarcodeInput(value);
    const trimmed = value.trim();
    if (barcodeTimeoutRef.current) clearTimeout(barcodeTimeoutRef.current);
    if (trimmed.length > 3 && !trimmed.includes(' ')) {
      barcodeTimeoutRef.current = setTimeout(() => {
        const found = products.find(p => p.code === trimmed || p.barcode === trimmed || p.sku === trimmed || String(p.id) === trimmed);
        if (found) { addToCart(found); setBarcodeInput(''); }
        else { setError(`Producto no encontrado: ${trimmed}`); setTimeout(() => setError(''), 3000); setBarcodeInput(''); }
      }, 150);
    }
  };

  const handleBarcodeSubmit = (code) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    if (barcodeTimeoutRef.current) clearTimeout(barcodeTimeoutRef.current);
    const found = products.find(p => p.code === trimmed || p.barcode === trimmed || p.sku === trimmed || String(p.id) === trimmed);
    if (found) addToCart(found);
    else { setError(`Producto no encontrado: ${trimmed}`); setTimeout(() => setError(''), 3000); }
    setBarcodeInput('');
  };

  // ── Cliente ──
  const buscarClientePorDocumento = async (doc) => {
    if (!doc || (doc.length !== 10 && doc.length !== 13)) return;
    setClientApiLoading(true);
    try {
      const docType = doc.length === 13 ? 'ruc' : 'cedula';
      let clienteLocal = null;

      try {
        const res = await fetchWithAuth(
          `/customers/by-document?document_number=${encodeURIComponent(doc)}&document_type=${docType}`
        );
        if (res.ok) clienteLocal = await res.json();
      } catch (error) {
        console.error('Error buscando cliente en IDON:', error);
      }

      if (clienteLocal?.nombre || clienteLocal?.name) {
        setClienteNombre(clienteLocal.nombre || clienteLocal.name);
        setClienteEmail(clienteLocal.email || '');
        setFoundCliente({ ...clienteLocal, tipo: docType });
        return;
      }

      const clienteExterno = await consultarDocumento(doc);
      if (clienteExterno?.nombreFormateado) {
        setClienteNombre(clienteExterno.nombreFormateado);
        setClienteEmail(clienteExterno.email || '');
        setFoundCliente(clienteExterno);
      } else {
        setClienteNombre('');
        setClienteEmail('');
        setFoundCliente(null);
      }
    } catch (error) {
      console.error('Error buscando cliente:', error);
      setClienteNombre('');
      setClienteEmail('');
      setFoundCliente(null);
    } finally {
      setClientApiLoading(false);
    }
  };

  const guardarCliente = async (doc, nombre, email) => {
    if (processingCliente) return null;
    const tipo_documento = doc.length === 13 ? 'ruc' : 'cedula';
    try {
      setProcessingCliente(true);
      const check = await fetchWithAuth(`/customers/by-document?document_number=${doc}&document_type=${tipo_documento}`);
      if (check.ok) { const existe = await check.json(); if (existe?.id) return existe.id; }
      const res = await fetchWithAuth('/customers', { method: 'POST', body: JSON.stringify({ nombre, cedula: doc, email, tipo_documento }) });
      if (res.ok) {
        const cliente = await res.json();
        return cliente?.id || cliente?.data?.id || null;
      }
      return null;
    } catch (e) { return null; } finally { setProcessingCliente(false); }
  };

  // ── Mixto ──
  const applyMixtoVals = (vals) => {
    setAmountPaid(vals.cash.toFixed(2)); setAmountPaidRaw(String(Math.round(vals.cash * 100)));
    setCardPaid(vals.card.toFixed(2)); setCardPaidRaw(String(Math.round(vals.card * 100)));
    setTransferPaid(vals.transfer.toFixed(2)); setTransferPaidRaw(String(Math.round(vals.transfer * 100)));
  };

  const handleMixtoField = (field, digits) => {
    const value = parseInt(digits || '0', 10) / 100;
    const newManual = new Set(mixtoManual);
    if (value === 0) newManual.delete(field); else newManual.add(field);
    setMixtoManual(newManual);
    const vals = {
      cash: field === 'cash' ? value : (mixtoActive.has('cash') ? (parseFloat(amountPaid) || 0) : 0),
      card: field === 'card' ? value : (mixtoActive.has('card') ? (parseFloat(cardPaid) || 0) : 0),
      transfer: field === 'transfer' ? value : (mixtoActive.has('transfer') ? (parseFloat(transferPaid) || 0) : 0),
    };
    const autoFields = [...mixtoActive].filter(f => !newManual.has(f));
    if (autoFields.length === 1) {
      const af = autoFields[0];
      const manualSum = [...mixtoActive].filter(f => f !== af).reduce((s, f) => s + vals[f], 0);
      vals[af] = redondear(Math.max(0, totalParaCobrar - manualSum));
    }
    applyMixtoVals(vals);
  };

  const toggleMixtoMetodo = (method) => {
    const newActive = new Set(mixtoActive);
    const newManual = new Set(mixtoManual);
    const vals = { cash: parseFloat(amountPaid) || 0, card: parseFloat(cardPaid) || 0, transfer: parseFloat(transferPaid) || 0 };
    if (newActive.has(method)) {
      newActive.delete(method); newManual.delete(method); vals[method] = 0;
      const auto = [...newActive].filter(f => !newManual.has(f));
      if (auto.length === 1) {
        const af = auto[0];
        const ms = [...newActive].filter(f => newManual.has(f)).reduce((s, f) => s + vals[f], 0);
        vals[af] = redondear(Math.max(0, totalParaCobrar - ms));
      }
    } else {
      newActive.add(method);
      const auto = [...newActive].filter(f => !newManual.has(f));
      if (auto.length === 1 && auto[0] === method) {
        const ms = [...newManual].reduce((s, f) => s + vals[f], 0);
        vals[method] = redondear(Math.max(0, totalParaCobrar - ms));
      }
    }
    setMixtoManual(newManual); setMixtoActive(newActive); applyMixtoVals(vals);
  };

  // ── Emitir factura ──
  const FORMA_PAGO_MAP = { cash: '01', card: '19', transfer: '20', mixto: '01' };

  const emitirFactura = async (orderObj, cedula, nombre, method, email = null) => {
    const isCF = cedula === '9999999999' || cedula === '9999999999999';
    const tipoId = isCF ? '07' : (cedula.length === 13 ? '04' : '05');
    let subtotalOrig = 0, ivaSumado = 0;
    const itemsPayload = (orderObj.items || []).map(item => {
      const qty = Number(item.quantity) || 1;
      const precio = Number(item.unit_price) || Number(item.selling_price) || 0;
      const ivaMonto = Number(item.iva_amount) || 0;
      const sub = redondear(precio * qty);
      subtotalOrig += sub; ivaSumado += ivaMonto;
      return { code: item.code || 'PROD', description: item.product_name, qty, unit_price: precio,
        subtotal: sub, iva_amount: ivaMonto, iva_rate_pct: Number(item.tax_rate) || 0 };
    });
    if (!itemsPayload.length) return null;
    const descTotal = orderObj.discount_amount !== undefined
      ? Number(orderObj.discount_amount) || 0
      : redondear((discountAmount || 0) + (couponDiscountAmount || 0));
    const nuevaBase2 = redondear(Math.max(0, subtotalOrig - descTotal));
    const r = subtotalOrig > 0 ? nuevaBase2 / subtotalOrig : 1;
    const ivaFact = redondear(ivaSumado * r);
    const totalFact = redondear(nuevaBase2 + ivaFact);
    const payload = {
      order_id: orderObj.id,
      customer: { name: isCF ? 'CONSUMIDOR FINAL' : nombre, ruc: isCF ? '9999999999' : cedula, email: email || null, tipo_identificacion: tipoId, phone: null },
      items: itemsPayload.map(i => ({ ...i, subtotal: redondear(i.subtotal * r).toFixed(2), iva_amount: redondear(i.iva_amount * r).toFixed(2) })),
      subtotal: nuevaBase2.toFixed(2), iva_amount: ivaFact.toFixed(2), total: totalFact.toFixed(2),
      forma_pago: FORMA_PAGO_MAP[method] || '01', descuento: descTotal.toFixed(2), iva_rate: ivaRateGlobal,
    };
    try {
      const res = await fetchWithAuth('/einvoicing/invoices/emit', { method: 'POST', body: JSON.stringify(payload) });
      const result = await res.json();
      if (!res.ok) { const msg = String(result.error || res.status); if (!/firma|signature|p12|certificado|electr/i.test(msg)) setError(`Error factura: ${msg}`); return null; }
      return { id: result.id, invoice_number: result.invoice_number };
    } catch (e) {
      if (!/firma|signature|p12|certificado|electr/i.test(e.message)) setError(`Error emitir factura: ${e.message}`);
      return null;
    }
  };

  // ── Imprimir ──
  const imprimirFactura = async (orderObj, paid, cambio, invoiceNumber, openDrawer, paymentMethod) => {
    try {
      const items = (orderObj.items || []).map(i => ({
        description: i.product_name, quantity: i.quantity,
        price: Number(i.unit_price) || Number(i.selling_price) || 0,
        total: (Number(i.unit_price) || Number(i.selling_price) || 0) * i.quantity,
      }));
      const totalDesc = receivableOrder
        ? Number(receivableOrder.discount_amount) || 0
        : redondear(discountAmount + couponDiscountAmount);
      const esCash = paymentMethod === 'cash' || paymentMethod === 'mixto';
      const discountsPrint = [];
      if (receivableOrder && totalDesc > 0) discountsPrint.push({ name: 'Descuento de orden', amount: totalDesc });
      else {
        if (discountAmount > 0 && appliedDiscount) discountsPrint.push({ name: appliedDiscount.name, amount: discountAmount });
        if (couponDiscountAmount > 0 && appliedCouponDiscount) discountsPrint.push({ name: `Cupón: ${appliedCouponDiscount.name}`, amount: couponDiscountAmount });
      }
      const baseData = {
        bizInfo,
        customer: { name: clienteNombre || 'CONSUMIDOR FINAL', id: clienteCedula || '9999999999' },
        items,
        subtotal: receivableOrder ? Number(receivableOrder.subtotal) || 0 : subtotalConDescuento,
        discount: totalDesc,
        discounts: discountsPrint.length > 0 ? discountsPrint : null,
        tax: receivableOrder ? Number(receivableOrder.tax_amount) || 0 : ivaConDescuento,
        taxRate: receivableOrder ? Number(receivableOrder.tax_rate) || ivaRateGlobal : ivaRateGlobal,
        total: receivableToCollect?.amount || totalConDescuento,
        recibido: esCash ? paid + Math.max(0, cambio) : 0,
        cambio: esCash ? Math.max(0, cambio) : 0, metodoPago: paymentMethod,
      };
      if (invoiceNumber) {
        await print('printer_main', 'invoice', { ...baseData, invoice: { number: invoiceNumber, date: new Date().toISOString() }, payment: { cash: paid, card: 0, other: 0 } }, openDrawer);
      } else {
        await print('printer_main', 'ticket-simple', baseData, openDrawer);
      }
    } catch (e) { console.error(e); setError('Error al imprimir'); }
  };

  const salirDeCobroCuenta = () => {
    receivableLoadRef.current += 1;
    setReceivableToCollect(null);
    setReceivableOrder(null);
    setReceivableOrderLoading(false);
    setReceivablePaymentAmount('');
    handledReceivableStateRef.current = null;
    setClienteCedula('9999999999');
    setClienteNombre('');
    setClienteEmail('');
    setCart([]);
    setSelectedCollaboratorId('');
    setAmountPaid('');
    setAmountPaidRaw('');
    setCardPaid('');
    setCardPaidRaw('');
    setTransferPaid('');
    setTransferPaidRaw('');
    setMobileTab('catalog');
    setError('');
    setSuccess('');
    navigate('/app/pos/pos.general', { replace: true });
  };

  const procesarVentaPorCobrar = async (paidAmount = 0, paymentMethod = null, referenceNumber = null, dueDate = null) => {
    if (cart.length === 0) { setError('El carrito está vacío'); return; }
    if (!selectedCollaboratorId) { setError('Seleccione el colaborador asociado a la venta.'); return; }
    if (totalConDescuento <= 0) { setError('El total de la venta debe ser mayor a cero.'); return; }
    if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      setError('Seleccione un plazo válido para calcular la fecha límite de pago.');
      return;
    }

    const cedula = clienteCedula?.trim() || '';
    const nombre = clienteNombre?.trim() || '';
    if (!cedula || cedula === '9999999999' || cedula === '9999999999999' ||
        (cedula.length !== 10 && cedula.length !== 13) ||
        !nombre || nombre.toUpperCase() === 'CONSUMIDOR FINAL') {
      setError('Para registrar una cuenta por cobrar, ingrese un cliente real con cédula o RUC y nombre.');
      return;
    }
    if (paidAmount < 0 || paidAmount > totalConDescuento) {
      setError('El abono debe ser mayor o igual a cero y no superar el total.');
      return;
    }
    if (paidAmount > 0 && !['cash', 'card', 'transfer'].includes(paymentMethod)) {
      setError('Seleccione un método válido para registrar el abono.');
      return;
    }
    if (paidAmount > 0 && paymentMethod !== 'cash' && !referenceNumber?.trim()) {
      setError('Ingrese la referencia del abono.');
      return;
    }

    setPrintLoading(true);
    setError('');
    setSuccess('');
    let orderNumberCreated = null;
    let printWarning = '';
    try {
      const customerId = await guardarCliente(cedula, nombre, clienteEmail?.trim() || null);
      if (!customerId) throw new Error('No se pudo guardar o encontrar el cliente para la cuenta por cobrar.');

      const itemsFormateados = cart.map(i => ({
        product_id: i.product_id,
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.selling_price,
        tax_rate: i.tax_rate,
        iva_amount: i.iva_amount,
        line_total: i.line_total,
        code: i.code || 'PROD',
      }));

      const orderResponse = await fetchWithAuth('/pos-general/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: itemsFormateados,
          customer_document_number: cedula,
          customer_name: nombre,
          customer_id: customerId,
          customer_email: clienteEmail?.trim() || null,
          subtotal: subtotalSinIVA,
          iva_amount: ivaConDescuento,
          total: totalConDescuento,
          discount_id: appliedDiscount?.id || appliedCouponDiscount?.id || null,
          discount_amount: redondear(discountAmount + couponDiscountAmount),
          payment_method: 'credit',
          payments: [],
          amount_paid: 0,
          collaborator_id: selectedCollaboratorId,
        }),
      });
      const order = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(order.error || 'No se pudo registrar la orden a crédito.');
      orderNumberCreated = order.order_number;

      const userId = user?.id || user?.userId || null;
      const userName = user?.firstName || user?.first_name || user?.nombre || user?.name || 'Usuario';
      const receivableResponse = await fetchWithAuth('/accounting-receivable/create-from-order', {
        method: 'POST',
        body: JSON.stringify({
          order_id: order.id,
          order_number: order.order_number,
          customer_id: customerId,
          customer_name: nombre,
          customer_document: cedula,
          customer_email: clienteEmail?.trim() || null,
          total_amount: totalConDescuento,
          due_date: dueDate,
          paid_amount: paidAmount,
          payment_method: paidAmount > 0 ? paymentMethod : null,
          reference_number: referenceNumber?.trim() || null,
          notes: `POS General${paidAmount > 0 ? ` - Abono inicial ${fmt(paidAmount)}` : ''}`,
          user_id: userId,
          user_name: userName,
          user_email: user?.email || '',
        }),
      });
      const receivableResult = await receivableResponse.json();
      if (!receivableResponse.ok || !receivableResult.success) {
        throw new Error(receivableResult.error || 'No se pudo crear la cuenta por cobrar.');
      }

      const receivable = receivableResult.data;
      const dueDateLabel = String(receivable.due_date || dueDate)
        .slice(0, 10)
        .split('-')
        .reverse()
        .join('/');
      try {
        const printData = {
          bizInfo,
          orden: order.order_number,
          customer: { id: cedula, name: nombre },
          items: itemsFormateados.map(item => ({
            description: item.product_name,
            quantity: item.quantity,
            price: item.unit_price,
            total: item.line_total,
          })),
          subtotal: totalConDescuento,
          tax: 0,
          total: totalConDescuento,
          ...(paidAmount > 0
            ? { abono: paidAmount, saldo: Number(receivable.balance) }
            : {}),
          vencimiento: receivable.due_date,
          printerFooter: '¡Gracias por su preferencia!',
        };
        await print(
          'printer_main',
          paidAmount > 0 ? 'credit-receivable-with-abono' : 'credit-receivable',
          printData,
          false
        );
      } catch (printError) {
        console.error('Error al imprimir recibo de cuenta por cobrar:', printError);
        printWarning = 'La cuenta por cobrar se registró, pero no se pudo imprimir el recibo.';
      }

      clearCart();
      if (printWarning) setError(printWarning);
      setSuccess(
        paidAmount > 0
          ? `Abono de ${fmt(paidAmount)} registrado. Saldo pendiente: ${fmt(receivable.balance)}; vence ${dueDateLabel}. Orden #${order.order_number}.`
          : `Cuenta por cobrar registrada. Orden #${order.order_number}, vence ${dueDateLabel}.`
      );
    } catch (err) {
      setError(orderNumberCreated
        ? `${err.message} La orden #${orderNumberCreated} quedó pendiente; verifique antes de volver a procesarla.`
        : err.message || 'Error al registrar la cuenta por cobrar.');
    } finally {
      setPrintLoading(false);
    }
  };

  // ── Procesar venta ──
  const procesarVenta = async () => {
    if (modoPorCobrar) return;
    if (cart.length === 0) { setError('El carrito está vacío'); return; }
    if (receivableOrderLoading) { setError('Espere mientras se carga la orden de la cuenta.'); return; }
    if (receivableToCollect && !receivableOrder) { setError('No se pudo cargar la orden asociada a esta cuenta.'); return; }
    if (receivableToCollect && (receivableToCollect.status === 'paid' || Number(receivableToCollect.balance) <= 0)) {
      setError('Esta cuenta ya está pagada.');
      return;
    }
    if (receivableToCollect && totalParaCobrar <= 0) {
      setError('Ingrese un monto mayor a cero para registrar el abono.');
      return;
    }
    if (receivableToCollect && totalParaCobrar > Number(receivableToCollect.balance) + 0.001) {
      setError('El monto a abonar no puede superar el saldo pendiente.');
      return;
    }
    if (!selectedCollaboratorId) { setError('Seleccione el colaborador asociado a la venta.'); return; }

    if (metodoPago === 'cash') {
      const paid = receivableToCollect ? totalParaCobrar : (parseFloat(amountPaid) || 0);
      if (paid < totalParaCobrar - 0.005) { setError(`Monto insuficiente. Total: ${fmt(totalParaCobrar)}`); return; }
    }
    if (metodoPago === 'card' && !refCard) { setError('Ingrese la referencia de la tarjeta'); return; }
    if (metodoPago === 'transfer' && !refTransfer) { setError('Ingrese la referencia de la transferencia'); return; }
    if (metodoPago === 'mixto') {
      const pagosMixtos = (parseFloat(amountPaid) || 0) + (parseFloat(cardPaid) || 0) + (parseFloat(transferPaid) || 0);
      const faltante = redondear(Math.max(0, totalParaCobrar - pagosMixtos));
      if (faltante > 0.01) { setError(`Falta ${fmt(faltante)} por cubrir en el pago mixto`); return; }
      if (receivableToCollect && pagosMixtos > totalParaCobrar + 0.01) {
        setError(`El pago no puede superar el saldo pendiente de ${fmt(totalParaCobrar)}.`);
        return;
      }
    }

    if (!receivableToCollect && totalConDescuento >= 50) {
      const cedula = clienteCedula?.trim() || '';
      const nombre = clienteNombre?.trim() || '';
      if (cedula === '9999999999' || cedula === '9999999999999') { setError('Para montos ≥ $50.00 debe ingresar cédula o RUC válido.'); return; }
      if (cedula.length !== 10 && cedula.length !== 13) { setError('Para montos ≥ $50.00 debe ingresar cédula (10) o RUC (13) válido.'); return; }
      if (!nombre || nombre.toUpperCase() === 'CONSUMIDOR FINAL') { setError('Para montos ≥ $50.00 debe ingresar el nombre completo.'); return; }
    }

    setPrintLoading(true); setError('');
    try {
      const cedula = clienteCedula?.trim() || '9999999999';
      const nombre = clienteNombre?.trim() || 'CONSUMIDOR FINAL';
      const customerId = receivableToCollect
        ? receivableOrder.customer_id || null
        : await guardarCliente(cedula, nombre, clienteEmail?.trim() || null);

      let paymentMethod = metodoPago;
      let payments = [];
      let debeAbrirCajon = false;
      let cashPaidAmt = 0;
      let cambioFinal = 0;

      if (metodoPago === 'cash') {
        cashPaidAmt = receivableToCollect ? totalParaCobrar : (parseFloat(amountPaid) || 0);
        cambioFinal = receivableToCollect ? 0 : redondear(cashPaidAmt - totalParaCobrar);
        payments = [{ method: 'cash', amount: receivableToCollect ? totalParaCobrar : cashPaidAmt }];
        debeAbrirCajon = true;
      } else if (metodoPago === 'card') {
        payments = [{ method: 'card', amount: totalParaCobrar, reference_number: refCard }];
      } else if (metodoPago === 'transfer') {
        payments = [{ method: 'transfer', amount: totalParaCobrar, reference_number: refTransfer }];
      } else if (metodoPago === 'mixto') {
        const ca = parseFloat(amountPaid) || 0;
        const ka = parseFloat(cardPaid) || 0;
        const ta = parseFloat(transferPaid) || 0;
        if (ca > 0) { payments.push({ method: 'cash', amount: ca }); debeAbrirCajon = true; cashPaidAmt = ca; }
        if (ka > 0) payments.push({ method: 'card', amount: ka, reference_number: refCard });
        if (ta > 0) payments.push({ method: 'transfer', amount: ta, reference_number: refTransfer });
        cambioFinal = redondear(Math.max(0, (ca + ka + ta) - totalParaCobrar));
      }

      const itemsFormateados = cart.map(i => ({
        product_id: i.product_id, product_name: i.product_name, quantity: i.quantity,
        unit_price: i.selling_price, tax_rate: i.tax_rate, iva_amount: i.iva_amount,
        line_total: i.line_total, code: i.code || 'PROD',
      }));

      if (receivableToCollect) {
        const paymentResponse = await fetchWithAuth(
          `/accounting-receivable/receivables/${receivableToCollect.id}/payments`,
          {
            method: 'POST',
            body: JSON.stringify({
              amount: totalParaCobrar,
              payment_method: paymentMethod,
              reference_number: paymentMethod === 'card' ? refCard : paymentMethod === 'transfer' ? refTransfer : null,
              payments,
              update_order: true,
              user_id: user?.id || user?.userId || null,
            }),
          }
        );
        const paymentResult = await paymentResponse.json();
        if (!paymentResponse.ok || !paymentResult.success) {
          throw new Error(paymentResult.error || 'No se pudo registrar el pago de la cuenta.');
        }

        const updatedReceivable = paymentResult.data;
        const newBalance = Number(updatedReceivable.balance) || 0;
        setReceivableToCollect(current => ({
          ...current,
          balance: newBalance,
          status: updatedReceivable.status,
        }));
        setReceivableOrder(current => current
          ? { ...current, status: updatedReceivable.status }
          : current);
        setReceivablePaymentAmount('0.00');
        setAmountPaid('');
        setAmountPaidRaw('');
        setMetodoPago('cash');
        setMixtoActive(new Set());
        setMixtoManual(new Set());
        setCardPaid('');
        setCardPaidRaw('');
        setTransferPaid('');
        setTransferPaidRaw('');
        setRefCard('');
        setRefTransfer('');

        let invoiceData = null;
        if (newBalance <= 0) {
          const orderForInvoice = {
            ...receivableOrder,
            items: itemsFormateados.map(item => ({ ...item, selling_price: item.unit_price })),
          };
          invoiceData = await emitirFactura(orderForInvoice, cedula, nombre, paymentMethod, clienteEmail?.trim() || null);
          const shouldPrint = await awaitPrintDecision();
          if (shouldPrint) {
            await imprimirFactura(orderForInvoice, totalParaCobrar, cambioFinal,
              invoiceData?.invoice_number, debeAbrirCajon, paymentMethod);
          }
        }

        setSuccess(newBalance <= 0
          ? `Cuenta #${receivableToCollect.orderNumber} pagada completamente${invoiceData ? ` | Factura ${invoiceData.invoice_number}` : ''}.`
          : 'Abono registrado correctamente.');
        navigate('/app/accounting/accounting.receivable', { replace: true });
        return;
      }

      const ordenRes = await fetchWithAuth('/pos-general/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: itemsFormateados,
          subtotal: subtotalSinIVA,
          iva_amount: ivaConDescuento,
          total: totalConDescuento,
          customer_document_number: cedula,
          customer_name: nombre,
          customer_id: customerId,
          customer_email: clienteEmail?.trim() || null,
          discount_id: appliedDiscount?.id || appliedCouponDiscount?.id || null,
          discount_amount: redondear(discountAmount + couponDiscountAmount),
          payment_method: paymentMethod,
          payments,
          amount_paid: metodoPago === 'cash' ? cashPaidAmt : totalParaCobrar,
          reference_number: paymentMethod === 'card' ? refCard : paymentMethod === 'transfer' ? refTransfer : null,
          collaborator_id: selectedCollaboratorId,
        }),
      });
      if (!ordenRes.ok) throw new Error('Error al registrar la venta');
      const orden = await ordenRes.json();

      const ordenParaFactura = { ...orden, items: itemsFormateados.map(i => ({ ...i, selling_price: i.unit_price })) };
      const invoiceData = await emitirFactura(ordenParaFactura, cedula, nombre, paymentMethod, clienteEmail?.trim() || null);

      const shouldPrint = await awaitPrintDecision();
      if (shouldPrint) {
        await imprimirFactura(ordenParaFactura, metodoPago === 'cash' ? cashPaidAmt : totalConDescuento, cambioFinal,
          invoiceData?.invoice_number, debeAbrirCajon, paymentMethod);
      }

      setSuccess(`Venta completada${invoiceData ? ` | Factura ${invoiceData.invoice_number}` : ''}`);
      clearCart();
    } catch (err) { setError(err.message || 'Error al procesar la venta'); }
    finally { setPrintLoading(false); }
  };

  // ── Render ──
  return (
    <PageTemplate title="POS GENERAL" subtitle="Escanea, cobra y asocia vendedor" className="pos-retail-template pos-general-template">
      <div className="retail-pos-wrapper pos-general-wrapper">
        <div className={`retail-mobile-tabs${receivableToCollect ? ' pos-general-hidden' : ''}`}>
          <button className={`retail-mobile-tab${mobileTab === 'catalog' ? ' active' : ''}`} onClick={() => setMobileTab('catalog')}>
            <FiGrid size={15} /> Catálogo
          </button>
          <button className={`retail-mobile-tab${mobileTab === 'cart' ? ' active' : ''}`} onClick={() => setMobileTab('cart')}>
            <FiCheck size={15} /> Cobrar
            {cart.length > 0 && <span className="retail-mobile-tab-badge">{cart.reduce((s,i)=>s+i.quantity,0)}</span>}
          </button>
        </div>

        <div className={`retail-pos-layout pos-general-layout${receivableToCollect ? ' pos-general-collecting' : ''}`}>
          {/* CATÁLOGO */}
          <div className={`retail-catalog-panel${mobileTab === 'catalog' ? ' mob-active' : ' mob-hidden'}`}>
            <div className="retail-search-row">
              <SearchInput ref={barcodeRef} value={barcodeInput} onChange={handleBarcodeChange} onSearch={handleBarcodeSubmit}
                placeholder="Ej: 7855555475209" icon={<FiHash size={18} />} size="sm" clearable autoFocus className="retail-barcode-input" />
              <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Buscar producto..."
                icon={<FiSearch size={18} />} size="sm" clearable className="retail-search-input" />
            </div>

            <CustomCombobox options={[{ value: '', label: 'Todas las categorías' },
              ...categories.map(cat => ({ value: String(cat.id), label: cat.name }))]}
              value={selectedCategory !== null ? String(selectedCategory) : ''}
              onChange={(val) => setSelectedCategory(val ? Number(val) : null)} placeholder="Categoría" />

            <div className="retail-product-grid">
              {filteredProducts.length === 0 ? (
                <div className="retail-empty-state">No se encontraron productos</div>
              ) : filteredProducts.map(product => (
                <button key={product.id} className="retail-product-card" onClick={() => addToCart(product)}>
                  <div className="retail-product-name">{product.name}</div>
                  {product.code && <div className="retail-product-code">{product.barcode}</div>}
                  <div className="retail-product-price">{fmt(product.selling_price + product.iva_amount)}</div>
                  {product.stock !== null && (
                    <div className={`retail-product-stock${product.stock <= 0 ? ' out' : product.stock <= 5 ? ' low' : ''}`}>
                      Stock: {product.stock}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* FACTURACIÓN */}
          <div className={`retail-cart-panel pos-general-cart-panel${mobileTab === 'cart' ? ' mob-active' : ' mob-hidden'}`}>
            <div className="pos-general-cart-content">
              <div className="rcp-header">
                <div className="rcp-header-left">
                  <span className="rcp-title">Facturación</span>
                  {cart.length > 0 && <span className="rcp-count">{cart.reduce((s,i)=>s+i.quantity,0)} items</span>}
                </div>
                <OpenDrawerButton />
              </div>

              {receivableToCollect && (
                <div className="pos-general-receivable-notice">
                  <div>
                    <strong>Cuenta por cobrar · Orden #{receivableToCollect.orderNumber}</strong>
                    <span>{receivableToCollect.dueDate
                      ? `Vence ${String(receivableToCollect.dueDate).slice(0, 10).split('-').reverse().join('/')}`
                      : 'Cobro de saldo pendiente'}</span>
                  </div>
                  <IconTextButton variant="secondary" size="sm" onClick={salirDeCobroCuenta} disabled={printLoading}>
                    <FiX size={14} /> Salir
                  </IconTextButton>
                </div>
              )}
              {receivableOrderLoading && <div className="rcp-msg">Cargando datos de la orden...</div>}

              <div className={receivableToCollect ? 'pos-general-receivable-customer-row' : ''}>
                {/* Cliente */}
                <div className={`rcp-customer${receivableToCollect ? ' pos-general-receivable-customer' : ''}`}>
                  <div className="rcp-cx-row rcp-cx-row-single">
                    <div className="rcp-cx-doc">
                      <Input type="text" placeholder="Cédula / RUC" value={clienteCedula}
                        disabled={Boolean(receivableToCollect)}
                        onChange={(val) => {
                          const clean = val.replace(/\D/g, '').slice(0, 13);
                          setClienteCedula(clean);
                          if (clean.length === 10 || clean.length === 13) buscarClientePorDocumento(clean);
                          else if (clean.length < 10) { setClienteNombre(''); setClienteEmail(''); }
                        }}
                        onEnter={() => { if (clienteCedula.length === 10 || clienteCedula.length === 13) buscarClientePorDocumento(clienteCedula); }}
                        className="rcp-input" size="md" iconRight={clientApiLoading ? <div className="spinner-small" /> : null} />
                      {clientApiLoading && <small aria-live="polite">Cargando datos...</small>}
                    </div>
                    <Input type="text" placeholder="Nombre del cliente" value={clienteNombre} onChange={setClienteNombre} className="rcp-input rcp-input-flex" size="sm" disabled={Boolean(receivableToCollect)} />
                    <Input type="email" placeholder="Email" value={clienteEmail} onChange={setClienteEmail} className="rcp-input rcp-input-flex" size="md" disabled={Boolean(receivableToCollect)} />
                  </div>
                </div>

                {/* Colaborador */}
                <div className={receivableToCollect ? 'pos-general-receivable-collaborator' : ''} style={{
                  display: 'flex', alignItems: 'center', gap: '8px', flexWrap: receivableToCollect ? 'nowrap' : 'wrap',
                  background: receivableToCollect ? 'transparent' : 'var(--bg-tertiary, #f8fafc)',
                  border: receivableToCollect ? 'none' : '1px solid var(--border-color, #E2E8F0)',
                  borderRadius: receivableToCollect ? 0 : 'var(--radius-sm, 6px)',
                  padding: receivableToCollect ? 0 : '8px 10px',
                  marginTop: receivableToCollect ? 0 : '8px', marginBottom: receivableToCollect ? 0 : '4px',
                }}>
                  <FiUser size={15} style={{ color: 'var(--text-muted, #94a3b8)', flexShrink: 0 }} />
                  <span style={{ fontSize: 'var(--font-size-sm, 12px)', fontWeight: 600, color: 'var(--text-secondary, #4A5568)', whiteSpace: 'nowrap' }}>
                    Colaborador
                  </span>
                  <div style={{ flex: receivableToCollect ? '1 1 0' : '1 1 200px', minWidth: 0 }}>
                    <CustomCombobox
                      options={[
                        { value: '', label: '— Seleccionar colaborador —' },
                        ...collaborators.map(c => ({
                          value: String(c.id),
                          label: c.full_name || 'Sin nombre',
                        })),
                        ...(receivableOrder?.collaborator_id && !collaborators.some(
                          c => String(c.id) === String(receivableOrder.collaborator_id)
                        ) ? [{
                          value: String(receivableOrder.collaborator_id),
                          label: receivableOrder.collaborator_name || 'Colaborador',
                        }] : []),
                      ]}
                      value={selectedCollaboratorId}
                      onChange={setSelectedCollaboratorId}
                      placeholder="Colaborador"
                      disabled={Boolean(receivableToCollect && receivableOrder?.collaborator_id)}
                    />
                  </div>
                  {!receivableToCollect && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <IconTextButton
                      variant={!modoPorCobrar ? 'primary' : 'secondary'}
                      size="md"
                      onClick={() => setModoPorCobrar(false)}
                      outline={modoPorCobrar}
                      disabled={printLoading || cart.length === 0}
                    >
                      <FaHandHoldingDollar size={16} /> Normal
                    </IconTextButton>
                    <IconTextButton
                      variant={modoPorCobrar ? 'primary' : 'secondary'}
                      size="md"
                      onClick={() => setModoPorCobrar(true)}
                      outline={!modoPorCobrar}
                      disabled={printLoading || cart.length === 0}
                    >
                      <FiClock size={16} /> Por Cobrar
                    </IconTextButton>
                  </div>}
                </div>
              </div>

              {/* Descuentos */}
              <div className={receivableToCollect ? 'pos-general-hidden' : ''} style={{ background: 'var(--bg-tertiary, #f8fafc)', border: '1px solid var(--border-color, #E2E8F0)',
                borderRadius: 'var(--radius-sm, 6px)', marginBottom: '12px', marginTop: '5px', overflow: 'hidden' }}>
                <div onClick={() => setShowDiscounts(p => !p)} style={{
                  fontSize: 'var(--font-size-sm, 13px)', fontWeight: 'var(--font-weight-semibold, 600)',
                  padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none',
                  borderBottom: showDiscounts ? '1px solid var(--border-color, #E2E8F0)' : 'none',
                }}>
                  <FiPercent size={14} /> DESCUENTOS Y CUPONES
                  {(appliedDiscount || appliedCouponRef.current) && (
                    <span style={{ marginLeft: 'auto', color: 'var(--success, #10b981)', fontWeight: 700, fontSize: 11 }}>
                      -{fmt((discountAmount || 0) + (couponDiscountAmount || 0))}
                    </span>
                  )}
                  <span style={{ marginLeft: (appliedDiscount || appliedCouponRef.current) ? 0 : 'auto', color: '#94a3b8', fontSize: 12 }}>
                    {showDiscounts ? '▲' : '▼'}
                  </span>
                </div>

                {showDiscounts && (
                  <div style={{ padding: '12px' }}>
                    {availableDiscounts.filter(d => d.is_active && d.type !== 'coupon' && isDiscountApplicable(d, totalBruto, cart)).length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                        {availableDiscounts.filter(d => d.is_active && d.type !== 'coupon' && isDiscountApplicable(d, totalBruto, cart)).map(discount => {
                          const isSel = appliedDiscount?.id === discount.id;
                          const label = discount.type === 'percentage' ? `${discount.value}% DESC` :
                            discount.type === 'fixed' ? `$${parseFloat(discount.value).toFixed(2)} DESC` :
                            discount.type === 'buy_x_get_y' ? `COMPRA X LLEVA Y` :
                            discount.type === 'bulk' ? `${discount.value}% MAYOREO` : `DESC`;
                          return (
                            <button key={discount.id} onClick={() => {
                              if (isSel) { manualDiscountRef.current = null; setAppliedDiscount(null); setDiscountAmount(0); }
                              else {
                                const newAmount = calculateDiscountAmount(discount, subtotalSinIVA, cart);
                                manualDiscountRef.current = { discount, amount: newAmount };
                                setAppliedDiscount(discount); setDiscountAmount(newAmount);
                              }
                              setCouponVersion(v => v + 1);
                            }} style={{
                              padding: '8px 10px', borderRadius: 6, textAlign: 'center', cursor: 'pointer',
                              border: isSel ? '2px solid var(--success, #10b981)' : '1px solid var(--border-color, #E2E8F0)',
                              background: isSel ? 'rgba(16,185,129,0.15)' : '#fff',
                              color: isSel ? 'var(--success, #10b981)' : '#4A5568',
                              fontSize: 12, fontWeight: 600,
                            }}>
                              <div>{label}</div>
                              <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{discount.name}</div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {couponPendingSelect && (
                      <div style={{ background: 'rgba(0,0,0,0.05)', borderRadius: 6, padding: 10, marginBottom: 10 }}>
                        <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600, marginBottom: 8 }}>
                          Cupón "{pendingCoupon?.name}" — selecciona qué ítem(s) reciben {pendingCoupon?.value}% de descuento:
                        </div>
                        {cart.filter(i => !pendingCoupon?.category_id || String(i.category_id) === String(pendingCoupon.category_id)).map(item => {
                          const checked = couponSelectedItemIds.includes(item.product_id);
                          return (
                            <div key={item.product_id} onClick={() => setCouponSelectedItemIds(prev =>
                              prev.includes(item.product_id) ? prev.filter(id => id !== item.product_id) : [...prev, item.product_id])}
                              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
                                background: checked ? 'rgba(99,102,241,0.15)' : '#fff', marginBottom: 4,
                                border: `1px solid ${checked ? '#6366f1' : '#E2E8F0'}` }}>
                              <input type="checkbox" checked={checked} readOnly />
                              <span style={{ flex: 1 }}>{item.quantity}× {item.product_name}</span>
                            </div>
                          );
                        })}
                        <ButtonGroup>
                          <IconTextButton variant="success" size="md" onClick={confirmarCuponCategoria}
                            disabled={couponSelectedItemIds.length === 0}>
                            Aplicar ({couponSelectedItemIds.length})
                          </IconTextButton>
                          <IconTextButton variant="" size="md" onClick={() => {
                            setCouponPendingSelect(false); setPendingCoupon(null); setCouponSelectedItemIds([]); setCouponError('');
                          }}>Cancelar</IconTextButton>
                        </ButtonGroup>
                      </div>
                    )}

                    <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 10 }}>
                      {appliedCouponRef.current ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.12)', border: '1px solid #10b981',
                          borderRadius: 6, padding: '7px 10px' }}>
                          <FiTag size={11} style={{ color: '#10b981' }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>
                            {appliedCouponDiscount?.name || 'Cupón'} -{fmt(couponDiscountAmount)}
                          </span>
                          <IconTextButton variant="danger" size="sm" icon={<FiX size={12} />} onClick={quitarCupon}>Quitar</IconTextButton>
                        </div>
                      ) : !couponPendingSelect && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <input type="text" placeholder="Código de cupón" value={couponCodeInput}
                            onChange={e => { setCouponCodeInput(e.target.value.toUpperCase()); setCouponError(''); }}
                            onKeyPress={e => e.key === 'Enter' && aplicarCupon()}
                            style={{ flex: 1, padding: '7px 10px', border: `1px solid ${couponError ? '#ef4444' : '#E2E8F0'}`, borderRadius: 6, fontSize: 13 }} />
                          <IconTextButton variant="success" size="md" onClick={aplicarCupon}>Aplicar</IconTextButton>
                        </div>
                      )}
                      {couponError && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 3 }}>{couponError}</div>}
                    </div>
                  </div>
                )}
              </div>

              {error && <div className="rcp-msg rcp-msg-error">{error}</div>}
              {success && <div className="rcp-msg rcp-msg-success">{success}</div>}
              {printerError && <div className="rcp-msg rcp-msg-error">⚠️ {printerError}</div>}

              {/* Items */}
              <div className="retail-cart-items pos-general-cart-items">
                {cart.length === 0 ? (
                  <div className="rcp-empty">
                    <FiGrid size={32} style={{ opacity: 0.2, marginBottom: 8 }} />
                    <p>Escanea o selecciona productos del catálogo</p>
                  </div>
                ) : cart.map(item => (
                  <div key={item.product_id} className="rcp-item">
                    <div className="rcp-item-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="rcp-item-qty-badge">{item.quantity}x</span>
                        <span className="rcp-item-name">{item.product_name}</span>
                      </div>
                      {item.code && <span className="rcp-item-code">{item.code}</span>}
                    </div>
                    {!receivableToCollect && <div className="rcp-item-controls">
                      <button className="rcp-qty-btn" onClick={() => updateQty(item.product_id, -1)}><FiMinus size={12} /></button>
                      <Input type="number" value={item.quantity} onChange={(val) => setQtyDirect(item.product_id, val)} size="sm" className="rcp-qty-input" min={1} />
                      <button className="rcp-qty-btn" onClick={() => updateQty(item.product_id, 1)}><FiPlus size={12} /></button>
                    </div>}
                    <span className="rcp-item-total">{fmt(item.line_total || (item.selling_price * item.quantity))}</span>
                    {!receivableToCollect && <IconTextButton variant="danger" size="sm" icon={<FiTrash2 size={13} />} onClick={() => removeFromCart(item.product_id)} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Totales + pago */}
            <div className="rcp-bottom-section pos-general-bottom-section">
              {cart.length > 0 && (
              <div className={`rcp-totals${receivableToCollect ? ' pos-general-receivable-totals' : ''}`}>
                  <div className="rcp-total-row"><span>Subtotal</span><span>{fmt(subtotalSinIVA)}</span></div>
                  {!receivableToCollect && appliedDiscount && discountAmount > 0 && (
                    <div className="rcp-total-row rcp-discount"><span><FiTag size={11} /> {appliedDiscount.name}</span><span>-{fmt(discountAmount)}</span></div>
                  )}
                  {!receivableToCollect && appliedCouponDiscount && couponDiscountAmount > 0 && (
                    <div className="rcp-total-row rcp-discount"><span><FiTag size={11} /> Cupón: {appliedCouponDiscount.name}</span><span>-{fmt(couponDiscountAmount)}</span></div>
                  )}
                  {receivableToCollect && Number(receivableOrder?.discount_amount) > 0 && (
                    <div className="rcp-total-row rcp-discount"><span><FiTag size={11} /> Descuento de la orden</span><span>-{fmt(receivableOrder.discount_amount)}</span></div>
                  )}
                  <div className="rcp-total-row">
                    <span>IVA {Number(receivableOrder?.tax_rate) || ivaRateGlobal}%</span>
                    <span>{fmt(receivableOrder ? receivableOrder.tax_amount : ivaConDescuento)}</span>
                  </div>
                  <div className="rcp-total-grand">
                    <span>{receivableToCollect ? 'TOTAL DE LA ORDEN' : 'TOTAL'}</span>
                    <span>{fmt(receivableToCollect
                      ? (receivableToCollect.amount || receivableOrder?.total)
                      : totalConDescuento)}</span>
                  </div>
                  {receivableToCollect && (
                    <div className="pos-general-receivable-payment-row">
                      <div className="rcp-total-row pos-general-balance-row">
                        <span>Saldo por cobrar</span><strong>{fmt(receivableToCollect.balance)}</strong>
                      </div>
                      <div className="pos-general-receivable-amount">
                        <label>
                          Monto a cobrar
                          <Input
                            type="number"
                            min="0"
                            max={receivableToCollect.balance}
                            step="0.01"
                            value={receivablePaymentAmount}
                            placeholder="0.00"
                            disabled={receivableToCollect.status === 'paid'}
                            onChange={value => {
                              setReceivablePaymentAmount(value);
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {cart.length > 0 && (
                <div className="rcp-payment">
                  {modoPorCobrar && !receivableToCollect ? (
                    <CreditPayment
                      totalOrdenConDescuento={totalConDescuento}
                      printLoading={printLoading}
                      onPagarParcial={procesarVentaPorCobrar}
                      onPagarCredito={(dueDate) => procesarVentaPorCobrar(0, null, null, dueDate)}
                      onCancelar={() => setModoPorCobrar(false)}
                      fmt={fmt}
                      clienteCedula={clienteCedula}
                      clienteNombre={clienteNombre}
                      clienteEmail={clienteEmail}
                      enableDueDate
                    />
                  ) : (
                    <>
                  <div className="rcp-methods">
                    {[
                      { key: 'cash', label: 'Efectivo', icon: <FaHandHoldingDollar size={16} /> },
                      { key: 'card', label: 'Tarjeta', icon: <FiCreditCard size={16} /> },
                      { key: 'transfer', label: 'Transferencia', icon: <FaMoneyBillTransfer size={16} /> },
                      { key: 'mixto', label: 'Mixto', icon: <FiGrid size={16} /> },
                    ].filter(({ key }) => !receivableToCollect || key !== 'mixto').map(({ key, label, icon }) => (
                      <IconTextButton key={key} variant={metodoPago === key ? 'primary' : 'secondary'} size="md"
                        onClick={() => setMetodoPago(key)} outline={metodoPago !== key}>
                        {icon} {label}
                      </IconTextButton>
                    ))}
                  </div>

                  {metodoPago === 'cash' && (
                    <div className="rcp-cash-actions-row">
                      {!receivableToCollect && (
                        <>
                          <div className="rcp-cash-field">
                            <label>Recibido</label>
                            <Input type="text" inputMode="numeric" value={amountPaid}
                              onChange={(val) => {
                                let d = val.replace(/\D/g, '') || '0';
                                if (d.length > 8) d = d.slice(0, 8);
                                setAmountPaidRaw(d);
                                setAmountPaid((parseInt(d, 10) / 100).toFixed(2));
                              }} placeholder="0.00" size="md" className="rcp-cash-input" />
                          </div>
                          <div className="rcp-cash-cambio">
                            <label>Cambio</label>
                            <span className="rcp-cambio-box">{fmt(redondear(Math.max(0, (parseFloat(amountPaid)||0) - totalParaCobrar)))}</span>
                          </div>
                        </>
                      )}
                      <ButtonGroup>
                        <IconTextButton variant="" size="md" onClick={receivableToCollect ? salirDeCobroCuenta : clearCart} disabled={printLoading}>
                          <FiX size={15} /> {receivableToCollect ? 'Salir' : 'Limpiar'}
                        </IconTextButton>
                        <IconTextButton variant="success" size="md" onClick={procesarVenta}
                          disabled={printLoading || cart.length === 0 || receivableOrderLoading || receivableToCollect?.status === 'paid'} loading={printLoading}>
                          <FiCheck size={18} /> Cobrar {fmt(totalParaCobrar)}
                        </IconTextButton>
                      </ButtonGroup>
                    </div>
                  )}

                  {(metodoPago === 'card' || metodoPago === 'transfer') && (
                    <>
                      <div className="rcp-ref">
                        <label>Referencia</label>
                        <Input type="text" value={metodoPago === 'card' ? refCard : refTransfer}
                          onChange={metodoPago === 'card' ? setRefCard : setRefTransfer}
                          placeholder="Número de referencia" size="md" />
                      </div>
                      <ButtonGroup>
                        <IconTextButton variant="" size="md" onClick={receivableToCollect ? salirDeCobroCuenta : clearCart} disabled={printLoading}>
                          <FiX size={15} /> {receivableToCollect ? 'Salir' : 'Limpiar'}
                        </IconTextButton>
                        <IconTextButton variant="success" size="md" onClick={procesarVenta}
                          disabled={printLoading || cart.length === 0 || receivableOrderLoading || receivableToCollect?.status === 'paid'} loading={printLoading}>
                          <FiCheck size={18} /> Cobrar {fmt(totalParaCobrar)}
                        </IconTextButton>
                      </ButtonGroup>
                    </>
                  )}

                  {metodoPago === 'mixto' && (
                    <>
                      <div className="rcp-mixto">
                        <div className="rcp-mixto-toggles">
                          {[
                            { key: 'cash', label: 'Efectivo', icon: <FaHandHoldingDollar size={13} /> },
                            { key: 'card', label: 'Tarjeta', icon: <FiCreditCard size={13} /> },
                            { key: 'transfer', label: 'Transferencia', icon: <FaMoneyBillTransfer size={13} /> },
                          ].map(({ key, label, icon }) => (
                            <Button key={key} variant={mixtoActive.has(key) ? 'primary' : 'secondary'} size="sm"
                              onClick={() => toggleMixtoMetodo(key)} outline={!mixtoActive.has(key)}>{icon} {label}</Button>
                          ))}
                        </div>
                        {mixtoActive.has('cash') && (
                          <div className="rcp-mixto-field">
                            <label>Efectivo</label>
                            <Input type="text" inputMode="numeric" value={amountPaid}
                              onChange={(val) => { let d = val.replace(/\D/g, '') || '0'; if (d.length > 8) d = d.slice(0, 8); handleMixtoField('cash', d); }}
                              placeholder="0.00" size="md" />
                          </div>
                        )}
                        {mixtoActive.has('card') && (
                          <div className="rcp-mixto-field">
                            <label>Tarjeta</label>
                            <Input type="text" inputMode="numeric" value={cardPaid}
                              onChange={(val) => { let d = val.replace(/\D/g, '') || '0'; if (d.length > 8) d = d.slice(0, 8); handleMixtoField('card', d); }}
                              placeholder="0.00" size="md" />
                            <Input type="text" placeholder="Ref. tarjeta" value={refCard} onChange={setRefCard} size="sm" />
                          </div>
                        )}
                        {mixtoActive.has('transfer') && (
                          <div className="rcp-mixto-field">
                            <label>Transferencia</label>
                            <Input type="text" inputMode="numeric" value={transferPaid}
                              onChange={(val) => { let d = val.replace(/\D/g, '') || '0'; if (d.length > 8) d = d.slice(0, 8); handleMixtoField('transfer', d); }}
                              placeholder="0.00" size="md" />
                            <Input type="text" placeholder="Ref. transferencia" value={refTransfer} onChange={setRefTransfer} size="sm" />
                          </div>
                        )}
                      </div>
                      <ButtonGroup>
                        <IconTextButton variant="" size="md" onClick={receivableToCollect ? salirDeCobroCuenta : clearCart} disabled={printLoading}>
                          <FiX size={15} /> {receivableToCollect ? 'Salir' : 'Limpiar'}
                        </IconTextButton>
                        <IconTextButton variant="success" size="md" onClick={procesarVenta}
                          disabled={printLoading || cart.length === 0 || receivableOrderLoading || receivableToCollect?.status === 'paid'} loading={printLoading}>
                          <FiCheck size={18} /> Cobrar {fmt(totalParaCobrar)}
                        </IconTextButton>
                      </ButtonGroup>
                    </>
                  )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <PrintModal isOpen={showPrintModal} onPrint={handlePrintDecision} onClose={() => handlePrintDecision(false)} />
    </PageTemplate>
  );
}