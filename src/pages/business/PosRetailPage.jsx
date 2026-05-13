import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PageTemplate from '../../components/PageTemplate';
import {
  FiSearch, FiX, FiPlus, FiMinus, FiTrash2,
  FiCreditCard, FiSmartphone, FiPercent, FiTag,
  FiGrid, FiCheck, FiHash
} from 'react-icons/fi';
import { FaHandHoldingDollar } from 'react-icons/fa6';
import { BsCurrencyExchange } from 'react-icons/bs';
import { FaMoneyBillTransfer } from 'react-icons/fa6';
import OpenDrawerButton from '../../components/OpenDrawerButton';
import { useBusinessContext } from '../../admin/config/BusinessContext';
import { fetchWithAuth } from '../../config/apiBase';
import { useQzTray } from '../../components/useQzTray';
import { usePrinterService } from '../../services/usePrinterService';
import '../../styles/PosRetail.css';

export default function PosRetailPage() {
  const navigate = useNavigate();
  const { selectedBusiness } = useBusinessContext();
  const { printerError } = useQzTray();
  const { print } = usePrinterService();
  const barcodeRef = useRef(null);

  // ── Catálogo ────────────────────────────────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');

  // ── Carrito ─────────────────────────────────────────────────────────────────
  const [cart, setCart] = useState([]);

  // ── Cliente ─────────────────────────────────────────────────────────────────
  const [clienteCedula, setClienteCedula] = useState('9999999999');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [clientApiLoading, setClientApiLoading] = useState(false);
  const [foundCliente, setFoundCliente] = useState(null);

  // ── Pago ────────────────────────────────────────────────────────────────────
  const [metodoPago, setMetodoPago] = useState('cash');
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

  // ── Descuentos ──────────────────────────────────────────────────────────────
  const [availableDiscounts, setAvailableDiscounts] = useState([]);
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountDetails, setDiscountDetails] = useState(null);
  const [totalConDescuento, setTotalConDescuento] = useState(0);

  // ── Fiscal ──────────────────────────────────────────────────────────────────
  const [ivaRateGlobal, setIvaRateGlobal] = useState(15);
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [bizInfo, setBizInfo] = useState(null);

  // ── UI ──────────────────────────────────────────────────────────────────────
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [printLoading, setPrintLoading] = useState(false);
  const [processingCliente, setProcessingCliente] = useState(false);

  const fmt = (n) => `${currencySymbol}${parseFloat(n || 0).toFixed(2)}`;

  // ── Totales del carrito ──────────────────────────────────────────────────────
  const subtotalSinIVA = cart.reduce((s, i) => s + i.selling_price * i.quantity, 0);
  const ivaTotal = cart.reduce((s, i) => s + i.tax_rate * i.quantity, 0);
  const totalBruto = subtotalSinIVA + ivaTotal;

  const nuevaBase = Math.max(0, subtotalSinIVA - discountAmount);
  const ratio = subtotalSinIVA > 0 ? nuevaBase / subtotalSinIVA : 1;
  const nuevoIVA = Math.round(ivaTotal * ratio * 100) / 100;

  const changeNormal = Math.max(0, (parseFloat(amountPaid) || 0) - totalConDescuento);
  const totalPagadoMixto = (parseFloat(amountPaid) || 0) + (parseFloat(cardPaid) || 0) + (parseFloat(transferPaid) || 0);
  const faltanteMixto = Math.max(0, totalConDescuento - totalPagadoMixto);
  const cambioMixto = Math.max(0, totalPagadoMixto - totalConDescuento);

  // ── Descuentos: helpers ──────────────────────────────────────────────────────
  const getSubtotalByCategory = useCallback((cartItems, categoryId) =>
    cartItems.reduce((s, i) => i.category_id === categoryId ? s + i.selling_price * i.quantity : s, 0), []);

  const getSubtotalByProduct = useCallback((cartItems, productId) =>
    cartItems.reduce((s, i) => i.product_id === productId ? s + i.selling_price * i.quantity : s, 0), []);

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
    if (discount.applies_to === 'product' && discount.product_id)
      baseAmt = getSubtotalByProduct(items, discount.product_id);
    else if (discount.applies_to === 'category' && discount.category_id)
      baseAmt = getSubtotalByCategory(items, discount.category_id);
    else baseAmt = base;

    let amount = 0;
    const v = Number(discount.value);
    if (discount.type === 'percentage') amount = baseAmt * (v / 100);
    else if (discount.type === 'fixed') amount = Math.min(v, baseAmt);
    else if (discount.type === 'buy_x_get_y') {
      const minQ = discount.min_quantity || 2;
      const freeQ = discount.free_quantity || 1;
      amount = baseAmt * (freeQ / (minQ + freeQ));
    } else if (discount.type === 'bulk') {
      const qty = discount.applies_to === 'product' && discount.product_id
        ? getQuantityByProduct(items, discount.product_id)
        : items.reduce((s, i) => s + i.quantity, 0);
      if (qty >= (discount.min_quantity || 1)) amount = baseAmt * (v / 100);
    } else if (discount.type === 'coupon') {
      amount = Math.min(v, baseAmt);
    }
    if (discount.max_discount && amount > Number(discount.max_discount)) amount = Number(discount.max_discount);
    return Math.min(amount, baseAmt);
  }, [getSubtotalByCategory, getSubtotalByProduct, getQuantityByProduct]);

  const getBestDiscount = useCallback((base, items) => {
    if (!availableDiscounts.length || !items.length) return null;
    const applicable = availableDiscounts
      .filter(d => isDiscountApplicable(d, base, items))
      .map(d => ({ discount: d, amount: calculateDiscountAmount(d, base, items) }))
      .filter(x => x.amount > 0)
      .sort((a, b) => (b.discount.priority || 0) - (a.discount.priority || 0) || b.amount - a.amount);
    return applicable[0] || null;
  }, [availableDiscounts, isDiscountApplicable, calculateDiscountAmount]);

  // ── Recalcular descuento al cambiar carrito ──────────────────────────────────
  useEffect(() => {
    const cartItems = cart.map(i => ({ ...i, product_id: i.product_id, category_id: i.category_id }));
    const best = getBestDiscount(subtotalSinIVA, cartItems);
    if (best && best.amount > 0) {
      setAppliedDiscount(best.discount);
      setDiscountAmount(best.amount);
      setDiscountDetails({ name: best.discount.name, type: best.discount.type, value: best.discount.value });
      const b = Math.max(0, subtotalSinIVA - best.amount);
      const r = subtotalSinIVA > 0 ? b / subtotalSinIVA : 1;
      setTotalConDescuento(b + Math.round(ivaTotal * r * 100) / 100);
    } else {
      setAppliedDiscount(null);
      setDiscountAmount(0);
      setDiscountDetails(null);
      setTotalConDescuento(totalBruto);
    }
  }, [cart, availableDiscounts, subtotalSinIVA, ivaTotal, totalBruto, getBestDiscount]);

  // ── Carga inicial ─────────────────────────────────────────────────────────────
  useEffect(() => {
    loadProducts();
    loadDiscounts();
    loadFiscalConfig();
    loadBizInfo();
  }, [selectedBusiness]);

  const loadProducts = async () => {
    try {
      const res = await fetchWithAuth('/api/products');
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.productos ?? data?.data ?? [];
      setProducts(list.map(p => ({
        ...p,
        selling_price: Number(p.selling_price) || 0,
        tax_rate: Number(p.tax_rate) || 0,
        stock: Number(p.stock) ?? null,
        category_id: p.category_id || null,
        code: p.code || p.barcode || p.sku || '',
      })));

      const cats = [];
      const seen = new Set();
      list.forEach(p => {
        if (p.category_id && p.category_name && !seen.has(p.category_id)) {
          seen.add(p.category_id);
          cats.push({ id: p.category_id, name: p.category_name });
        }
      });
      setCategories(cats);
    } catch {}
  };

  const loadDiscounts = async () => {
    try {
      const res = await fetchWithAuth('/api/discounts');
      if (res.ok) {
        const data = await res.json();
        setAvailableDiscounts(
          (Array.isArray(data) ? data : []).filter(d => d?.id && d?.name && d?.is_active !== undefined && d?.type && d?.value !== undefined)
        );
      }
    } catch {}
  };

  const loadFiscalConfig = async () => {
    try {
      const res = await fetchWithAuth('/api/fiscal/config');
      if (res.ok) {
        const data = await res.json();
        if (data?.iva_rate) setIvaRateGlobal(Number(data.iva_rate));
        if (data?.currency_symbol) setCurrencySymbol(data.currency_symbol);
      }
    } catch {}
  };

  const loadBizInfo = async () => {
    try {
      const res = await fetchWithAuth('/api/settings/receipt-info');
      if (res.ok) setBizInfo(await res.json());
    } catch {}
  };

  // ── Filtro de productos ───────────────────────────────────────────────────────
  const filteredProducts = products.filter(p => {
    const matchCat = !selectedCategory || p.category_id === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      p.name?.toLowerCase().includes(q) ||
      (p.code || '').toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  // ── Carrito: operaciones ──────────────────────────────────────────────────────
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        selling_price: product.selling_price,
        tax_rate: product.tax_rate,
        category_id: product.category_id,
        code: product.code,
        quantity: 1,
      }];
    });
    setError('');
  };

  const updateQty = (productId, delta) => {
    setCart(prev => prev
      .map(i => i.product_id === productId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i)
    );
  };

  const setQtyDirect = (productId, val) => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n > 0) {
      setCart(prev => prev.map(i => i.product_id === productId ? { ...i, quantity: n } : i));
    }
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(i => i.product_id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setClienteCedula('9999999999');
    setClienteNombre('');
    setClienteEmail('');
    setFoundCliente(null);
    setMetodoPago('cash');
    setAmountPaid(''); setAmountPaidRaw('');
    setCardPaid(''); setCardPaidRaw('');
    setTransferPaid(''); setTransferPaidRaw('');
    setRefCard(''); setRefTransfer('');
    setMixtoManual(new Set()); setMixtoActive(new Set());
    setError(''); setSuccess('');
    if (barcodeRef.current) barcodeRef.current.focus();
  };

  // ── Escáner de código de barras ───────────────────────────────────────────────
  const handleBarcodeSubmit = (code) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    const found = products.find(p =>
      p.code === trimmed || p.barcode === trimmed || p.sku === trimmed || String(p.id) === trimmed
    );
    if (found) {
      addToCart(found);
    } else {
      setError(`Producto no encontrado: ${trimmed}`);
      setTimeout(() => setError(''), 3000);
    }
    setBarcodeInput('');
  };

  // ── Búsqueda de cliente ───────────────────────────────────────────────────────
  const buscarClientePorDocumento = async (doc) => {
    if (!doc || (doc.length !== 10 && doc.length !== 13)) return;
    setClientApiLoading(true);
    try {
      const docType = doc.length === 13 ? 'ruc' : 'cedula';
      const res = await fetchWithAuth(`/api/customers/by-document?document_number=${doc}&document_type=${docType}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.nombre || data?.name) {
          setClienteNombre(data.nombre || data.name);
          setClienteEmail(data.email || '');
          setFoundCliente({ ...data, tipo: docType });
        }
      } else {
        setClienteNombre('');
        setClienteEmail('');
        setFoundCliente(null);
        await buscarEnPadron(doc.slice(0, 10));
      }
    } catch {} finally {
      setClientApiLoading(false);
    }
  };

  const buscarEnPadron = async (cedula10) => {
    try {
      const proxyUrl = 'https://infoplacas.herokuapp.com/';
      const targetUrl = 'https://si.secap.gob.ec/sisecap/logeo_web/json/busca_persona_registro_civil.php';
      const postData = new URLSearchParams({ documento: cedula10, tipo: '1' });
      const response = await fetch(proxyUrl + targetUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: postData });
      const text = await response.text();
      if (text) {
        const json = JSON.parse(text);
        if (json?.nombres) setClienteNombre((json.nombres + ' ' + (json.apellidos || '')).trim());
      }
    } catch { setClienteNombre(''); }
  };

  const guardarCliente = async (doc, nombre, email) => {
    if (processingCliente) return null;
    const tipo_documento = doc.length === 13 ? 'ruc' : 'cedula';
    try {
      setProcessingCliente(true);
      const check = await fetchWithAuth(`/api/customers/by-document?document_number=${doc}&document_type=${tipo_documento}`);
      if (check.ok) {
        const existe = await check.json();
        if (existe?.id) return existe.id;
      }
      const res = await fetchWithAuth('/api/customers', {
        method: 'POST',
        body: JSON.stringify({ nombre, cedula: doc, email, tipo_documento }),
      });
      if (res.ok) return (await res.json()).id;
      return null;
    } catch { return null; }
    finally { setProcessingCliente(false); }
  };

  // ── Mixto ─────────────────────────────────────────────────────────────────────
  const applyMixtoVals = (vals) => {
    setAmountPaid(vals.cash.toFixed(2)); setAmountPaidRaw(String(Math.round(vals.cash * 100)));
    setCardPaid(vals.card.toFixed(2)); setCardPaidRaw(String(Math.round(vals.card * 100)));
    setTransferPaid(vals.transfer.toFixed(2)); setTransferPaidRaw(String(Math.round(vals.transfer * 100)));
  };

  const handleMixtoField = (field, digits) => {
    const total = totalConDescuento;
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
      vals[af] = Math.round(Math.max(0, total - manualSum) * 100) / 100;
    }
    applyMixtoVals(vals);
  };

  const toggleMixtoMetodo = (method) => {
    const total = totalConDescuento;
    const newActive = new Set(mixtoActive);
    const newManual = new Set(mixtoManual);
    const vals = { cash: parseFloat(amountPaid) || 0, card: parseFloat(cardPaid) || 0, transfer: parseFloat(transferPaid) || 0 };
    if (newActive.has(method)) {
      newActive.delete(method); newManual.delete(method); vals[method] = 0;
      const auto = [...newActive].filter(f => !newManual.has(f));
      if (auto.length === 1) {
        const af = auto[0];
        const ms = [...newActive].filter(f => newManual.has(f)).reduce((s, f) => s + vals[f], 0);
        vals[af] = Math.round(Math.max(0, total - ms) * 100) / 100;
      }
    } else {
      newActive.add(method);
      const auto = [...newActive].filter(f => !newManual.has(f));
      if (auto.length === 1 && auto[0] === method) {
        const ms = [...newManual].reduce((s, f) => s + vals[f], 0);
        vals[method] = Math.round(Math.max(0, total - ms) * 100) / 100;
      }
    }
    setMixtoManual(newManual); setMixtoActive(newActive); applyMixtoVals(vals);
  };

  // ── Emitir factura ────────────────────────────────────────────────────────────
  const FORMA_PAGO_MAP = { cash: '01', card: '19', transfer: '20', mixto: '01' };

  const emitirFactura = async (orderObj, cedula, nombre, method, email = null) => {
    const isCF = cedula === '9999999999' || cedula === '9999999999999';
    const tipoId = isCF ? '07' : (cedula.length === 13 ? '04' : '05');

    let subtotalOrig = 0, ivaSumado = 0;
    const itemsPayload = (orderObj.items || []).map(item => {
      const qty = Number(item.quantity) || 1;
      const precio = Number(item.unit_price) || Number(item.selling_price) || 0;
      const ivaU = Number(item.tax_rate) || 0;
      subtotalOrig += precio * qty;
      ivaSumado += ivaU * qty;
      return { code: item.code || 'PROD', description: item.product_name, qty, unit_price: precio, subtotal: precio * qty, iva_amount: ivaU * qty };
    });
    if (!itemsPayload.length) return null;

    const descTotal = discountAmount || 0;
    const nuevaBase2 = Math.max(0, subtotalOrig - descTotal);
    const r = subtotalOrig > 0 ? nuevaBase2 / subtotalOrig : 1;
    const ivaFact = Math.round(ivaSumado * r * 100) / 100;
    const totalFact = nuevaBase2 + ivaFact;

    const payload = {
      order_id: orderObj.id,
      customer: { name: isCF ? 'CONSUMIDOR FINAL' : nombre, ruc: isCF ? '9999999999' : cedula, email: email || null, tipo_identificacion: tipoId, phone: null },
      items: itemsPayload.map(i => ({
        code: i.code, description: i.description, qty: i.qty, unit_price: i.unit_price,
        subtotal: (i.subtotal * r).toFixed(2), iva_amount: (i.iva_amount * r).toFixed(2),
      })),
      subtotal: nuevaBase2.toFixed(2),
      iva_amount: ivaFact.toFixed(2),
      total: totalFact.toFixed(2),
      forma_pago: FORMA_PAGO_MAP[method] || '01',
      descuento: descTotal.toFixed(2),
      iva_rate: ivaRateGlobal,
    };

    try {
      const res = await fetchWithAuth('/api/einvoicing/invoices/emit', { method: 'POST', body: JSON.stringify(payload) });
      const result = await res.json();
      if (!res.ok) {
        const msg = String(result.error || res.status);
        if (!/firma|signature|p12|certificado|electr/i.test(msg)) setError(`Error factura: ${msg}`);
        return null;
      }
      return { id: result.id, invoice_number: result.invoice_number };
    } catch (e) {
      if (!/firma|signature|p12|certificado|electr/i.test(e.message)) setError(`Error emitir factura: ${e.message}`);
      return null;
    }
  };

  // ── Imprimir ─────────────────────────────────────────────────────────────────
  const imprimirFactura = async (orderObj, paid, cambio, invoiceNumber, openDrawer, paymentMethod) => {
    try {
      const items = (orderObj.items || []).map(i => ({
        description: i.product_name,
        quantity: i.quantity,
        price: Number(i.unit_price) || Number(i.selling_price) || 0,
        total: (Number(i.unit_price) || Number(i.selling_price) || 0) * i.quantity,
      }));
      const printSub = items.reduce((s, i) => s + i.total, 0);
      const printIva = Math.round(ivaTotal * ratio * 100) / 100;
      const printTotal = Math.max(0, printSub - discountAmount) + printIva;
      const esCash = paymentMethod === 'cash' || paymentMethod === 'mixto';
      const baseData = {
        bizInfo,
        customer: { name: clienteNombre || 'CONSUMIDOR FINAL', id: clienteCedula || '9999999999' },
        items,
        subtotal: Math.max(0, printSub - discountAmount),
        discount: discountAmount,
        tax: printIva,
        taxRate: ivaRateGlobal,
        total: printTotal,
        recibido: esCash ? paid + Math.max(0, cambio) : 0,
        cambio: esCash ? Math.max(0, cambio) : 0,
        metodoPago: paymentMethod,
      };

      if (invoiceNumber) {
        await print('printer_main', 'invoice', {
          ...baseData,
          invoice: { number: invoiceNumber, date: new Date().toISOString() },
          payment: { cash: paid, card: 0, other: 0 },
        }, openDrawer);
      } else {
        await print('printer_main', 'ticket-simple', baseData, openDrawer);
      }
    } catch { setError('Error al imprimir'); }
  };

  // ── Procesar venta ────────────────────────────────────────────────────────────
  const procesarVenta = async () => {
    if (cart.length === 0) { setError('El carrito está vacío'); return; }

    if (metodoPago === 'cash') {
      const paid = parseFloat(amountPaid) || 0;
      if (paid < totalConDescuento) { setError(`Monto insuficiente. Total: ${fmt(totalConDescuento)}`); return; }
    }
    if (metodoPago === 'card' && !refCard) { setError('Ingrese la referencia de la tarjeta'); return; }
    if (metodoPago === 'transfer' && !refTransfer) { setError('Ingrese la referencia de la transferencia'); return; }
    if (metodoPago === 'mixto') {
      if (faltanteMixto > 0.01) { setError(`Falta ${fmt(faltanteMixto)} por cubrir en el pago mixto`); return; }
    }

    setPrintLoading(true);
    setError('');
    try {
      const cedula = clienteCedula?.trim() || '9999999999';
      const nombre = clienteNombre?.trim() || 'CONSUMIDOR FINAL';
      await guardarCliente(cedula, nombre, clienteEmail?.trim() || null);

      let paymentMethod = metodoPago;
      let payments = [];
      let debeAbrirCajon = false;
      let cashPaidAmt = 0;
      let cambioFinal = 0;

      if (metodoPago === 'cash') {
        cashPaidAmt = parseFloat(amountPaid) || 0;
        cambioFinal = cashPaidAmt - totalConDescuento;
        payments = [{ method: 'cash', amount: cashPaidAmt }];
        debeAbrirCajon = true;
      } else if (metodoPago === 'card') {
        payments = [{ method: 'card', amount: totalConDescuento, reference_number: refCard }];
      } else if (metodoPago === 'transfer') {
        payments = [{ method: 'transfer', amount: totalConDescuento, reference_number: refTransfer }];
      } else if (metodoPago === 'mixto') {
        const ca = parseFloat(amountPaid) || 0;
        const ka = parseFloat(cardPaid) || 0;
        const ta = parseFloat(transferPaid) || 0;
        if (ca > 0) { payments.push({ method: 'cash', amount: ca }); debeAbrirCajon = true; cashPaidAmt = ca; }
        if (ka > 0) payments.push({ method: 'card', amount: ka, reference_number: refCard });
        if (ta > 0) payments.push({ method: 'transfer', amount: ta, reference_number: refTransfer });
        cambioFinal = Math.max(0, cambioMixto);
      }

      const itemsFormateados = cart.map(i => ({
        product_id: i.product_id,
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.selling_price,
        line_total: i.selling_price * i.quantity,
        tax_rate: i.tax_rate,
        iva_amount: i.tax_rate * i.quantity,
        code: i.code || 'PROD',
      }));

      const ordenRes = await fetchWithAuth('/api/retail/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: itemsFormateados,
          subtotal: subtotalSinIVA,
          iva_amount: ivaTotal,
          total: totalConDescuento,
          customer_document_number: cedula,
          customer_name: nombre,
          discount_id: appliedDiscount?.id || null,
          discount_amount: discountAmount,
          payment_method: paymentMethod,
          payments,
          amount_paid: metodoPago === 'cash' ? cashPaidAmt : totalConDescuento,
          reference_number: paymentMethod === 'card' ? refCard : paymentMethod === 'transfer' ? refTransfer : null,
        }),
      });
      if (!ordenRes.ok) throw new Error('Error al registrar la venta');
      const orden = await ordenRes.json();

      const ordenParaFactura = {
        ...orden,
        items: itemsFormateados.map(i => ({ ...i, selling_price: i.unit_price })),
      };
      const invoiceData = await emitirFactura(ordenParaFactura, cedula, nombre, paymentMethod, clienteEmail?.trim() || null);

      await imprimirFactura(
        ordenParaFactura,
        metodoPago === 'cash' ? cashPaidAmt : totalConDescuento,
        cambioFinal,
        invoiceData?.invoice_number,
        debeAbrirCajon,
        paymentMethod,
      );

      setSuccess(`✅ Venta completada${invoiceData ? ` | Factura ${invoiceData.invoice_number}` : ''}`);
      clearCart();
    } catch (err) {
      setError(err.message || 'Error al procesar la venta');
    } finally {
      setPrintLoading(false);
    }
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────────
  return (
    <PageTemplate
      title="POS Retail"
      subtitle="Escanea o busca productos y cobra al instante"
      backButton
      headerAction={
        <button
          onClick={() => navigate('/app/pos/pos.retail_dashboard')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8, border: 'none',
            background: 'rgba(92,170,255,.15)', color: '#5caaff',
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}
        >
          Dashboard
        </button>
      }
    >
      <div className="retail-pos-layout">
        {/* PANEL IZQUIERDO: CATÁLOGO (más angosto) */}
        <div className="retail-catalog-panel">
          {/* Barra de búsqueda + escáner */}
          <div className="retail-search-bar">
            <div className="retail-barcode-wrap">
              <FiHash size={18} />
              <input
                ref={barcodeRef}
                type="text"
                placeholder="Escanear código de barras..."
                value={barcodeInput}
                onChange={e => setBarcodeInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { handleBarcodeSubmit(barcodeInput); } }}
                autoFocus
                className="retail-barcode-input"
              />
              {barcodeInput && (
                <button className="retail-clear-btn" onClick={() => setBarcodeInput('')}><FiX size={14} /></button>
              )}
            </div>
            <div className="retail-search-wrap">
              <FiSearch size={18} />
              <input
                type="text"
                placeholder="Buscar producto por nombre..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="retail-search-input"
              />
              {searchQuery && (
                <button className="retail-clear-btn" onClick={() => setSearchQuery('')}><FiX size={14} /></button>
              )}
            </div>
          </div>

          {/* Tabs de categorías */}
          <div className="retail-category-tabs">
            <button
              className={`retail-cat-tab${!selectedCategory ? ' active' : ''}`}
              onClick={() => setSelectedCategory(null)}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`retail-cat-tab${selectedCategory === cat.id ? ' active' : ''}`}
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Grid de productos */}
          <div className="retail-product-grid">
            {filteredProducts.length === 0 ? (
              <div className="retail-empty-state">No se encontraron productos</div>
            ) : filteredProducts.map(product => (
              <button
                key={product.id}
                className="retail-product-card"
                onClick={() => addToCart(product)}
              >
                <div className="retail-product-name">{product.name}</div>
                {product.code && <div className="retail-product-code">{product.code}</div>}
                <div className="retail-product-price">
                  {fmt(product.selling_price + product.tax_rate)}
                </div>
                {product.stock !== null && (
                  <div className={`retail-product-stock${product.stock <= 0 ? ' out' : product.stock <= 5 ? ' low' : ''}`}>
                    Stock: {product.stock}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* PANEL DERECHO: FACTURACIÓN (más ancho) */}
        <div className="retail-cart-panel">
          {/* Header del panel */}
          <div className="rcp-header">
            <div className="rcp-header-left">
              <span className="rcp-title">Facturación</span>
              {cart.length > 0 && (
                <span className="rcp-count">{cart.reduce((s, i) => s + i.quantity, 0)} items</span>
              )}
            </div>
            <OpenDrawerButton />
          </div>

          {/* Cliente */}
          <div className="rcp-customer">
            <div className="rcp-cx-row">
              <div className="rcp-cx-doc">
                <input
                  type="text"
                  placeholder="Cédula / RUC"
                  value={clienteCedula}
                  onChange={e => setClienteCedula(e.target.value.replace(/\D/g, '').slice(0, 13))}
                  onBlur={() => { if (clienteCedula.length === 10 || clienteCedula.length === 13) buscarClientePorDocumento(clienteCedula); }}
                  onKeyDown={e => { if (e.key === 'Enter' && (clienteCedula.length === 10 || clienteCedula.length === 13)) buscarClientePorDocumento(clienteCedula); }}
                  className="rcp-input"
                />
                {clientApiLoading && <div className="spinner-small" />}
              </div>
              <input type="text" placeholder="Nombre del cliente" value={clienteNombre} onChange={e => setClienteNombre(e.target.value)} className="rcp-input rcp-input-flex" />
            </div>
            <input type="email" placeholder="Email para factura electrónica" value={clienteEmail} onChange={e => setClienteEmail(e.target.value)} className="rcp-input rcp-input-full" />
          </div>

          {/* Mensajes */}
          {error   && <div className="rcp-msg rcp-msg-error">{error}</div>}
          {success && <div className="rcp-msg rcp-msg-success">{success}</div>}
          {printerError && <div className="rcp-msg rcp-msg-error">⚠️ {printerError}</div>}

          {/* Items del carrito */}
          <div className="retail-cart-items">
            {cart.length === 0 ? (
              <div className="rcp-empty">
                <FiGrid size={32} style={{ opacity: 0.2, marginBottom: 8 }} />
                <p>Escanea o selecciona productos del catálogo</p>
              </div>
            ) : cart.map(item => (
              <div key={item.product_id} className="rcp-item">
                <div className="rcp-item-info">
                  <span className="rcp-item-name">{item.product_name}</span>
                  {item.code && <span className="rcp-item-code">{item.code}</span>}
                </div>
                <div className="rcp-item-qty">
                  <button className="rcp-qty-btn" onClick={() => updateQty(item.product_id, -1)}><FiMinus size={12} /></button>
                  <input type="number" className="rcp-qty-input" value={item.quantity} min={1} onChange={e => setQtyDirect(item.product_id, e.target.value)} />
                  <button className="rcp-qty-btn" onClick={() => updateQty(item.product_id, 1)}><FiPlus size={12} /></button>
                </div>
                <span className="rcp-item-total">{fmt((item.selling_price + item.tax_rate) * item.quantity)}</span>
                <button className="rcp-remove-btn" onClick={() => removeFromCart(item.product_id)}><FiTrash2 size={13} /></button>
              </div>
            ))}
          </div>

          {/* Totales */}
          {cart.length > 0 && (
            <div className="rcp-totals">
              <div className="rcp-total-row"><span>Subtotal</span><span>{fmt(subtotalSinIVA)}</span></div>
              {appliedDiscount && discountAmount > 0 && (
                <div className="rcp-total-row rcp-discount">
                  <span><FiTag size={11} /> {appliedDiscount.name}</span>
                  <span>-{fmt(discountAmount)}</span>
                </div>
              )}
              <div className="rcp-total-row"><span>IVA {ivaRateGlobal}%</span><span>{fmt(nuevoIVA)}</span></div>
              <div className="rcp-total-grand">
                <span>TOTAL</span>
                <span>{fmt(totalConDescuento)}</span>
              </div>
            </div>
          )}

          {/* Pago */}
          {cart.length > 0 && (
            <div className="rcp-payment">
              {/* Métodos de pago */}
              <div className="rcp-methods">
                {[
                  { key: 'cash',     label: 'Efectivo',      icon: <FaHandHoldingDollar size={16} /> },
                  { key: 'card',     label: 'Tarjeta',       icon: <FiCreditCard size={16} /> },
                  { key: 'transfer', label: 'Transferencia', icon: <FaMoneyBillTransfer size={16} /> },
                  { key: 'mixto',    label: 'Mixto',         icon: <FiGrid size={16} /> },
                ].map(({ key, label, icon }) => (
                  <button
                    key={key}
                    className={`rcp-method-btn${metodoPago === key ? ' active' : ''}`}
                    onClick={() => {
                      setMetodoPago(key);
                      if (key === 'mixto') {
                        setAmountPaidRaw(''); setAmountPaid('');
                        setCardPaidRaw(''); setCardPaid('');
                        setTransferPaidRaw(''); setTransferPaid('');
                        setMixtoManual(new Set()); setMixtoActive(new Set());
                      }
                    }}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>

              {/* Efectivo */}
              {metodoPago === 'cash' && (
                <div className="rcp-cash">
                  <div className="rcp-cash-field">
                    <label>Recibido</label>
                    <input type="text" inputMode="numeric" value={amountPaid} placeholder="0.00"
                      onChange={e => {
                        let d = e.target.value.replace(/\D/g, '');
                        if (!d) d = '0';
                        if (d.length > 8) d = d.slice(0, 8);
                        setAmountPaidRaw(d);
                        setAmountPaid((parseInt(d, 10) / 100).toFixed(2));
                      }} />
                  </div>
                  <div className="rcp-cash-cambio">
                    <label>Cambio</label>
                    <span className={changeNormal > 0 ? 'cambio-pos' : 'cambio-zero'}>{fmt(changeNormal)}</span>
                  </div>
                </div>
              )}

              {/* Tarjeta / Transferencia */}
              {(metodoPago === 'card' || metodoPago === 'transfer') && (
                <div className="rcp-ref">
                  <label>Referencia</label>
                  <input type="text"
                    value={metodoPago === 'card' ? refCard : refTransfer}
                    onChange={e => metodoPago === 'card' ? setRefCard(e.target.value) : setRefTransfer(e.target.value)}
                    placeholder="Número de referencia o comprobante" />
                </div>
              )}

              {/* Mixto */}
              {metodoPago === 'mixto' && (
                <div className="rcp-mixto">
                  <div className="rcp-mixto-toggles">
                    {[
                      { key: 'cash',     label: 'Efectivo',      icon: <FaHandHoldingDollar size={13} /> },
                      { key: 'card',     label: 'Tarjeta',       icon: <FiCreditCard size={13} /> },
                      { key: 'transfer', label: 'Transferencia', icon: <FaMoneyBillTransfer size={13} /> },
                    ].map(({ key, label, icon }) => (
                      <button key={key} className={`rcp-mixto-toggle${mixtoActive.has(key) ? ' active' : ''}`} onClick={() => toggleMixtoMetodo(key)}>
                        {icon} {label}
                      </button>
                    ))}
                  </div>
                  {mixtoActive.size > 0 && (
                    <div className="rcp-mixto-fields">
                      {mixtoActive.has('cash') && (
                        <div className="rcp-mixto-field">
                          <label><FaHandHoldingDollar size={12} /> Efectivo</label>
                          <input type="text" inputMode="numeric" value={amountPaid} placeholder="0.00"
                            onChange={e => { let d = e.target.value.replace(/\D/g, ''); if (!d) d = '0'; if (d.length > 8) d = d.slice(0, 8); handleMixtoField('cash', d); }} />
                        </div>
                      )}
                      {mixtoActive.has('card') && (
                        <div className="rcp-mixto-field">
                          <label><FiCreditCard size={12} /> Tarjeta</label>
                          <input type="text" inputMode="numeric" value={cardPaid} placeholder="0.00"
                            onChange={e => { let d = e.target.value.replace(/\D/g, ''); if (!d) d = '0'; if (d.length > 8) d = d.slice(0, 8); handleMixtoField('card', d); }} />
                          <input type="text" placeholder="Ref. tarjeta" value={refCard} onChange={e => setRefCard(e.target.value)} className="rcp-ref-sub" />
                        </div>
                      )}
                      {mixtoActive.has('transfer') && (
                        <div className="rcp-mixto-field">
                          <label><FaMoneyBillTransfer size={12} /> Transferencia</label>
                          <input type="text" inputMode="numeric" value={transferPaid} placeholder="0.00"
                            onChange={e => { let d = e.target.value.replace(/\D/g, ''); if (!d) d = '0'; if (d.length > 8) d = d.slice(0, 8); handleMixtoField('transfer', d); }} />
                          <input type="text" placeholder="Ref. transferencia" value={refTransfer} onChange={e => setRefTransfer(e.target.value)} className="rcp-ref-sub" />
                        </div>
                      )}
                    </div>
                  )}
                  {mixtoActive.size > 0 && (faltanteMixto > 0.01 || cambioMixto > 0.01) && (
                    <div className="rcp-mixto-summary">
                      {faltanteMixto > 0.01 && <span className="rcp-faltante">Falta: {fmt(faltanteMixto)}</span>}
                      {cambioMixto > 0.01  && <span className="rcp-cambio-ok">Cambio: {fmt(cambioMixto)}</span>}
                    </div>
                  )}
                </div>
              )}

              {/* Acciones */}
              <div className="rcp-actions">
                <button className="rcp-clear-btn" onClick={clearCart} disabled={printLoading}>
                  <FiX size={15} /> Limpiar
                </button>
                <button className="rcp-cobrar-btn" onClick={procesarVenta} disabled={printLoading || cart.length === 0}>
                  {printLoading
                    ? <><div className="rcp-spinner" /> Procesando...</>
                    : <><FiCheck size={18} /> Cobrar {fmt(totalConDescuento)}</>
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTemplate>
  );
}