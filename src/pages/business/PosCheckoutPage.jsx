import React, { useState, useEffect, useCallback } from 'react';
import { Check, X, DollarSign, Users } from 'react-feather';
import PageTemplate from '../../components/PageTemplate';
import {
  FiX,
  FiGrid,
  FiCreditCard,
  FiSmartphone,
  FiPlus,
  FiUsers as FiUsersIcon,
  FiCheck
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

  const [facturaIndividual, setFacturaIndividual] = useState(false);
  const [clientesDivididos, setClientesDivididos] = useState([]);
  const [pagosRegistrados, setPagosRegistrados] = useState([]);
  const [metodoPagoNormal, setMetodoPagoNormal] = useState('cash');
  const [totalPagadoAcumulado, setTotalPagadoAcumulado] = useState(0);

  // ========== DESCUENTOS ==========
  const [availableDiscounts, setAvailableDiscounts] = useState([]);
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [totalOrdenConDescuento, setTotalOrdenConDescuento] = useState(0);

  // ========== CONFIGURACIÓN FISCAL ==========
  const [ivaRateGlobal, setIvaRateGlobal] = useState(15); // Valor por defecto 15%
  const [currencySymbol, setCurrencySymbol] = useState('$');

  // Cargar configuración fiscal desde API
  const loadFiscalConfig = async () => {
    try {
      console.log('🔄 Cargando configuración fiscal...');
      const res = await fetchWithAuth('/api/fiscal/config');
      console.log('📡 Respuesta del servidor:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('📦 Configuración fiscal recibida:', data);
        if (data && data.iva_rate) {
          setIvaRateGlobal(Number(data.iva_rate));
          console.log(`💰 Tasa de IVA global cargada: ${data.iva_rate}%`);
        }
        if (data && data.currency_symbol) {
          setCurrencySymbol(data.currency_symbol);
        }
      } else {
        console.warn('⚠️ No se pudo cargar configuración fiscal, usando valores por defecto');
      }
    } catch (err) {
      console.error('❌ Error cargando configuración fiscal:', err);
    }
  };

  // Cargar descuentos desde API
  const loadDiscounts = async () => {
    try {
      console.log('🔄 Cargando descuentos desde API...');
      const res = await fetchWithAuth('/api/discounts');
      console.log('📡 Respuesta del servidor:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('📦 Descuentos recibidos:', data);
        console.log('📊 Cantidad de descuentos:', data.length);
        
        const validDiscounts = (Array.isArray(data) ? data : []).filter(d => {
          const isValid = d && d.id && d.name && d.is_active !== undefined && d.type && d.value !== undefined;
          if (!isValid) {
            console.warn('⚠️ Descuento inválido encontrado:', d);
          }
          return isValid;
        });
        
        console.log('✅ Descuentos válidos:', validDiscounts.length);
        setAvailableDiscounts(validDiscounts);
      } else {
        console.error('❌ Error al cargar descuentos:', res.status);
        setAvailableDiscounts([]);
      }
    } catch (err) {
      console.error('❌ Error cargando descuentos:', err);
      setAvailableDiscounts([]);
    }
  };

  // Calcular subtotal SIN IVA (precio de venta * cantidad)
  const getSubtotalSinIVA = useCallback(() => {
    if (!selectedOrder) return 0;
    
    return (selectedOrder.items || []).reduce((sum, item) => {
      const price = Number(item.selling_price) || Number(item.unit_price) || 0;
      const quantity = Number(item.quantity) || 1;
      return sum + (price * quantity);
    }, 0);
  }, [selectedOrder]);

  // Obtener tasa de IVA desde configuración global
  const getIvaRate = useCallback(() => {
    return ivaRateGlobal;
  }, [ivaRateGlobal]);

  // Calcular total de la orden (con IVA)
  const getOrderTotal = useCallback(() => {
    if (!selectedOrder) return 0;
    
    if (selectedOrder.total && typeof selectedOrder.total === 'number' && selectedOrder.total > 0) {
      return Number(selectedOrder.total);
    }
    
    const subtotal = getSubtotalSinIVA();
    const ivaRate = getIvaRate();
    const iva = Math.round((subtotal * ivaRate / 100) * 100) / 100;
    
    return subtotal + iva;
  }, [selectedOrder, getSubtotalSinIVA, getIvaRate]);

  // Calcular subtotal de items por categoría
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

  // Verificar si descuento es aplicable (soportando categorías)
  const isDiscountApplicable = useCallback((discount, orderTotal, items = []) => {
    console.log(`🔍 Evaluando descuento: ${discount.name}`);
    console.log(`   - ID: ${discount.id}`);
    console.log(`   - is_active: ${discount.is_active}`);
    console.log(`   - type: ${discount.type}, value: ${discount.value}`);
    console.log(`   - applies_to: ${discount.applies_to}`);
    console.log(`   - orderTotal: ${orderTotal}, min_amount: ${discount.min_amount || 0}`);
    
    if (!discount.is_active) {
      console.log(`   ❌ Descuento inactivo`);
      return false;
    }

    if (!discount.type || discount.value === undefined || discount.value === null) {
      console.log(`   ❌ Descuento sin tipo o valor válido`);
      return false;
    }

    const now = new Date();
    
    if (discount.start_date) {
      const startDate = new Date(discount.start_date);
      if (startDate > now) {
        console.log(`   ❌ Fecha inicio futura: ${discount.start_date}`);
        return false;
      }
    }
    
    if (discount.end_date) {
      const endDate = new Date(discount.end_date);
      if (endDate < now) {
        console.log(`   ❌ Fecha fin pasada: ${discount.end_date}`);
        return false;
      }
    }
    
    if (discount.days_of_week && discount.days_of_week.length > 0) {
      const today = now.getDay();
      if (!discount.days_of_week.includes(today)) {
        console.log(`   ❌ Día no permitido. Hoy: ${today}, Permitidos: ${discount.days_of_week}`);
        return false;
      }
    }
    
    if (discount.start_time && discount.end_time) {
      const currentTime = now.toTimeString().slice(0, 5);
      if (currentTime < discount.start_time || currentTime > discount.end_time) {
        console.log(`   ❌ Horario fuera de rango. Actual: ${currentTime}, Rango: ${discount.start_time}-${discount.end_time}`);
        return false;
      }
    }
    
    // Para descuentos por categoría, verificar si hay items de esa categoría
    if (discount.applies_to === 'category') {
      if (!discount.category_id) {
        console.log(`   ❌ Descuento por categoría sin category_id`);
        return false;
      }
      
      const categoryTotal = getSubtotalByCategory(items, discount.category_id);
      if (categoryTotal === 0) {
        console.log(`   ❌ No hay productos de la categoría ${discount.category_id} en esta orden`);
        return false;
      }
      
      if (discount.min_amount && categoryTotal < Number(discount.min_amount)) {
        console.log(`   ❌ Monto insuficiente para la categoría. Total categoría: ${categoryTotal.toFixed(2)}, Mínimo requerido: ${Number(discount.min_amount).toFixed(2)}`);
        return false;
      }
      
      console.log(`   ✅ Descuento por categoría APLICA (total categoría: $${categoryTotal.toFixed(2)})`);
      return true;
    }
    
    // Para descuentos de orden completa
    if (discount.applies_to === 'order') {
      if (discount.min_amount && orderTotal < Number(discount.min_amount)) {
        console.log(`   ❌ Monto insuficiente. Total: ${orderTotal.toFixed(2)}, Mínimo requerido: ${Number(discount.min_amount).toFixed(2)}`);
        return false;
      }
      
      console.log(`   ✅ Descuento de orden APLICA`);
      return true;
    }
    
    console.log(`   ❌ Tipo de aplicación no soportado: ${discount.applies_to}`);
    return false;
  }, [getSubtotalByCategory]);

  // Calcular monto del descuento (soportando categorías) - sobre SUBTOTAL sin IVA
  const calculateDiscountAmountForOrder = useCallback((discount, subtotalSinIVA, items = []) => {
    if (!discount || !discount.type || discount.value === undefined) return 0;
    
    let baseAmount = 0;
    
    if (discount.applies_to === 'category' && discount.category_id) {
      baseAmount = getSubtotalByCategory(items, discount.category_id);
      console.log(`   📊 Base para descuento por categoría: $${baseAmount.toFixed(2)}`);
    } else {
      baseAmount = subtotalSinIVA;
      console.log(`   📊 Base para descuento de orden (subtotal Sin IVA): $${baseAmount.toFixed(2)}`);
    }
    
    let amount = 0;
    
    if (discount.type === 'percentage') {
      amount = baseAmount * (Number(discount.value) / 100);
      console.log(`   📊 Descuento porcentual: ${discount.value}% = $${amount.toFixed(2)}`);
    } else if (discount.type === 'fixed') {
      amount = Math.min(Number(discount.value), baseAmount);
      console.log(`   📊 Descuento fijo: $${amount.toFixed(2)}`);
    } else {
      console.log(`   ⚠️ Tipo de descuento desconocido: ${discount.type}`);
      return 0;
    }
    
    if (discount.max_discount && amount > Number(discount.max_discount)) {
      const originalAmount = amount;
      amount = Number(discount.max_discount);
      console.log(`   ✂️ Aplicando límite máximo: $${originalAmount.toFixed(2)} -> $${amount.toFixed(2)}`);
    }
    
    if (amount > baseAmount) {
      console.log(`   ✂️ Ajustando descuento (no puede superar el subtotal): $${amount.toFixed(2)} -> $${baseAmount.toFixed(2)}`);
      amount = baseAmount;
    }
    
    return amount;
  }, [getSubtotalByCategory]);

  // Obtener mejor descuento aplicable
  const getBestApplicableDiscount = useCallback((subtotalSinIVA, items) => {
    console.log('🔍 Buscando descuentos aplicables...');
    console.log('📦 Descuentos disponibles en memoria:', availableDiscounts.length);
    
    if (availableDiscounts.length === 0) {
      console.log('⚠️ No hay descuentos disponibles');
      return null;
    }
    
    const applicable = availableDiscounts.filter(discount => 
      isDiscountApplicable(discount, subtotalSinIVA, items)
    );
    
    console.log(`✅ Descuentos aplicables encontrados: ${applicable.length}`);
    
    if (applicable.length === 0) {
      console.log('⚠️ Ningún descuento aplicable');
      return null;
    }
    
    // Calcular el monto real de cada descuento para comparar
    const applicableWithAmount = applicable.map(discount => ({
      discount,
      amount: calculateDiscountAmountForOrder(discount, subtotalSinIVA, items)
    }));
    
    // Ordenar por monto de descuento (mayor a menor)
    applicableWithAmount.sort((a, b) => b.amount - a.amount);
    
    const selected = applicableWithAmount[0].discount;
    const selectedAmount = applicableWithAmount[0].amount;
    
    console.log(`🎯 Descuento seleccionado: ${selected.name}`);
    console.log(`   - Tipo: ${selected.type}`);
    console.log(`   - Valor: ${selected.value}`);
    console.log(`   - Aplica a: ${selected.applies_to}`);
    console.log(`   - Monto: $${selectedAmount.toFixed(2)}`);
    
    return selected;
  }, [availableDiscounts, isDiscountApplicable, calculateDiscountAmountForOrder]);

  // Calcular todos los valores de descuento - CORREGIDO SRI con IVA global
  const updateDiscountValues = useCallback(() => {
    if (!selectedOrder) {
      setAppliedDiscount(null);
      setDiscountAmount(0);
      setTotalOrdenConDescuento(getOrderTotal());
      return;
    }
    
    // Obtener subtotal SIN IVA (base imponible)
    const subtotalSinIVA = getSubtotalSinIVA();
    const ivaRate = getIvaRate();
    const items = selectedOrder.items || [];
    
    const best = getBestApplicableDiscount(subtotalSinIVA, items);
    
    if (best) {
      const amount = calculateDiscountAmountForOrder(best, subtotalSinIVA, items);
      setAppliedDiscount(best);
      setDiscountAmount(amount);
      
      // 🔥 CÁLCULO CORRECTO SRI:
      // 1. Nueva base imponible = subtotal sin IVA - descuento
      const nuevaBaseImponible = Math.max(0, subtotalSinIVA - amount);
      // 2. IVA sobre nueva base imponible (usando tasa global)
      const nuevoIVA = Math.round((nuevaBaseImponible * ivaRate / 100) * 100) / 100;
      // 3. Total = nueva base imponible + IVA
      const nuevoTotal = nuevaBaseImponible + nuevoIVA;
      
      setTotalOrdenConDescuento(nuevoTotal);
      
      console.log(`✨ Descuento aplicado (SRI correcto): ${best.name} - $${amount.toFixed(2)}`);
      console.log(`   Subtotal sin IVA original: $${subtotalSinIVA.toFixed(2)}`);
      console.log(`   Tasa IVA global: ${ivaRate}%`);
      console.log(`   Nueva base imponible: $${nuevaBaseImponible.toFixed(2)}`);
      console.log(`   IVA: $${nuevoIVA.toFixed(2)}`);
      console.log(`   Total con descuento: $${nuevoTotal.toFixed(2)}`);
    } else {
      setAppliedDiscount(null);
      setDiscountAmount(0);
      const totalConIVA = getOrderTotal();
      setTotalOrdenConDescuento(totalConIVA);
      console.log('⚠️ No se encontró ningún descuento aplicable');
    }
  }, [selectedOrder, getSubtotalSinIVA, getIvaRate, getOrderTotal, getBestApplicableDiscount, calculateDiscountAmountForOrder]);

  // Efecto para aplicar descuento cuando cambia la orden
  useEffect(() => {
    updateDiscountValues();
  }, [selectedOrder, updateDiscountValues]);

  // Cargar datos iniciales
  useEffect(() => {
    loadOrders();
    loadDiscounts();
    loadFiscalConfig(); // ← Cargar configuración fiscal
  }, [selectedBusiness]);

  // Recargar descuentos cuando se actualizan
  useEffect(() => {
    if (selectedOrder) {
      updateDiscountValues();
    }
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
    setAppliedDiscount(null);
    setDiscountAmount(0);
    setTotalOrdenConDescuento(0);
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
      const resBusqueda = await fetchWithAuth(`/api/customers/by-document?document_number=${documento}&document_type=${tipo_documento}`);
      if (resBusqueda.ok) {
        const existe = await resBusqueda.json();
        if (existe && existe.id) {
          return existe.id;
        }
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
    const currentTotal = selectedOrder ? totalOrdenConDescuento : 0;
    const value = parseInt(digits || '0', 10) / 100;
    const newManual = new Set(mixtoManual);
    if (value === 0) newManual.delete(field);
    else newManual.add(field);
    setMixtoManual(newManual);

    let vals = {
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

  // Variables para mostrar en el render
  const subtotalSinIVAMostrar = getSubtotalSinIVA();
  const ivaRateMostrar = getIvaRate();
  const nuevaBaseImponible = Math.max(0, subtotalSinIVAMostrar - discountAmount);
  const nuevoIVAMostrar = Math.round((nuevaBaseImponible * ivaRateMostrar / 100) * 100) / 100;

  // Funciones para cuenta dividida
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
    if (comensal && comensal.items.length > 0) {
      setSelectedItems(prev => [...prev, ...comensal.items]);
    }
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
        const totalPagado = (newComensal.cashAmount || 0) + (newComensal.cardAmount || 0) + (newComensal.transferAmount || 0);
        newComensal.montoRecibido = totalPagado;
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
  const totalOrdenBruto = getOrderTotal();

  // Factura electrónica
  const FORMA_PAGO_MAP = { cash: '01', card: '19', transfer: '20', mixto: '01', split: '01' };

  async function emitirFactura(order, custCedula, custNombre, method, discountData = null) {
    const cedula = custCedula?.trim() || '9999999999';
    const isCF = cedula === '9999999999' || cedula === '9999999999999';
    const tipoId = isCF ? '07' : (cedula.length === 13 ? '04' : '05');
    const email = foundCliente?.email || clienteEmail.trim() || null;

    let subtotalOriginal = 0;
    const itemsPayload = (order.items || []).map(item => {
      const qty = item.quantity || 1;
      const precioSinIVA = Number(item.selling_price) || Number(item.unit_price) || 0;
      const itemSubtotal = precioSinIVA * qty;
      subtotalOriginal += itemSubtotal;
      return {
        code: item.code || 'PROD',
        description: item.product_name || 'Producto',
        qty,
        unit_price: precioSinIVA,
        subtotal: itemSubtotal
      };
    });

    if (itemsPayload.length === 0) return null;

    // 🔥 USAR SOLO discountData (que viene del parámetro) para el descuento
    let descuentoTotal = 0;
    if (discountData && discountData.amount) {
      descuentoTotal = discountData.amount;
    } else if (discountData && discountData.type && discountData.value) {
      // Si por alguna razón llega el descuento en crudo, calcularlo
      if (discountData.type === 'percentage') {
        descuentoTotal = subtotalOriginal * (Number(discountData.value) / 100);
      } else if (discountData.type === 'fixed') {
        descuentoTotal = Math.min(Number(discountData.value), subtotalOriginal);
      }
    } else {
      // Si no hay descuentoData, asegurar 0
      descuentoTotal = 0;
    }

    // Calcular nueva base imponible e IVA
    const nuevaBaseImponible = Math.max(0, subtotalOriginal - descuentoTotal);
    const ivaRate = ivaRateGlobal;
    const ivaConDescuento = Math.round((nuevaBaseImponible * ivaRate / 100) * 100) / 100;
    const totalFactura = nuevaBaseImponible + ivaConDescuento;

    const payload = {
      order_id: order.id,
      customer: {
        name: isCF ? 'CONSUMIDOR FINAL' : (custNombre || ''),
        ruc: isCF ? '9999999999' : cedula,
        email: email || null,
        tipo_identificacion: tipoId,
        phone: null
      },
      items: itemsPayload,
      subtotal: subtotalOriginal.toFixed(2),
      iva_amount: ivaConDescuento.toFixed(2),
      total: totalFactura.toFixed(2),
      forma_pago: FORMA_PAGO_MAP[method] || '01',
      descuento: descuentoTotal.toFixed(2),
      iva_rate: ivaRate
    };

    try {
      const response = await fetchWithAuth('/api/einvoicing/invoices/emit', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) {
        setError(`Error factura: ${result.error || response.status}`);
        return null;
      }
      return result?.invoice_number || null;
    } catch (e) {
      setError(`Error emitir factura: ${e.message}`);
      console.error(e);
      return null;
    }
  }

  // Impresión
  const imprimirTicket = async (order, paid, cambio, invoiceNumber = null, splitMode = null, customerName = null) => {
    try {
      const printerConfig = await getPrinterConfig('printer_main');
      const itemsToPrint = (order.items || []).map(item => {
        const precioSinIVA = Number(item.selling_price) || Number(item.unit_price) || 0;
        return {
          description: item.product_name || 'Producto',
          quantity: item.quantity,
          price: precioSinIVA,
          total: precioSinIVA * item.quantity
        };
      });
      const printSubtotal = itemsToPrint.reduce((s, i) => s + i.total, 0);
      const printTotal = Math.max(0, printSubtotal - discountAmount);
      const nuevoIVAImpresion = Math.round((printTotal * ivaRateGlobal / 100) * 100) / 100;
      const printTotalFinal = printTotal + nuevoIVAImpresion;

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
          amount: discountAmount
        } : null
      }, true);
    } catch (err) {
      console.error('Error imprimiendo:', err);
      setError('Error al imprimir');
    }
  };

  // Cobrar comensal y pagoNormal se mantienen igual pero usan la nueva emitirFactura
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

      if (facturaIndividual) {
        const partialOrder = { ...selectedOrder, items: selectedOrder.items.filter(i => comensal.items.includes(i.id)) };
        const invoiceNum = await emitirFactura(partialOrder, cedula, nombre, 'split');
        await imprimirTicket(partialOrder, totalComensal, comensal.montoRecibido - totalComensal, invoiceNum, 'split', nombre);
        setSuccess(`Factura generada para ${nombre}`);
      } else {
        const itemsCompletos = comensal.items.map(itemId => selectedOrder?.items?.find(i => i.id === itemId)).filter(i => i);
        setPagosRegistrados(prev => [...prev, { cliente: { cedula, nombre, email }, items: itemsCompletos, total: totalComensal, metodoPago: comensal.metodoPago, payments }]);
        setSuccess(`Pago registrado para ${nombre}`);
      }

      setClientesDivididos(prev => prev.filter(c => c.id !== comensal.id));
      const ordenActualizada = await recargarOrden();
      const pagoTotalCompletado = nuevoTotalPagado === totalOrdenConDescuento;

      if (pagoTotalCompletado) {
        let itemsFinales = [];
        for (const pago of pagosRegistrados) if (pago.items) itemsFinales.push(...pago.items);
        if (!facturaIndividual) {
          const itemsActuales = comensal.items.map(itemId => selectedOrder?.items?.find(i => i.id === itemId)).filter(i => i);
          itemsActuales.forEach(item => { if (!itemsFinales.some(i => i.id === item.id)) itemsFinales.push(item); });
        }
        if (itemsFinales.length > 0) {
          const ordenCompleta = { ...selectedOrder, items: itemsFinales };
          const discountInfo = appliedDiscount ? { id: appliedDiscount.id, name: appliedDiscount.name, amount: discountAmount } : null;
          const invoiceNum = await emitirFactura(ordenCompleta, clienteCedula || '9999999999', clienteNombre || 'CONSUMIDOR FINAL', 'split', discountInfo);
          await imprimirTicket(ordenCompleta, totalOrdenConDescuento, 0, invoiceNum, 'split', 'FACTURA FINAL');
        }
        await fetchWithAuth(`/api/ordenes/${selectedOrder.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'paid', payment_method: 'split', amount_paid: totalOrdenConDescuento, notes: orderNotes, discount_id: appliedDiscount?.id || null, discount_amount: discountAmount })
        });
        setOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
        setSelectedOrder(null);
        setClientesDivididos([]);
        setPagosRegistrados([]);
        setTotalPagadoAcumulado(0);
        setSuccess('✅ Orden completada y factura final generada');
      } else if (ordenActualizada) {
        const comensalesPendientes = clientesDivididos.filter(c => c.id !== comensal.id);
        if (comensalesPendientes.length === 0) {
          setClientesDivididos([{ id: Date.now(), cedula: '', nombre: '', email: '', items: [], metodoPago: 'cash', montoRecibido: 0, referencia: '', cashAmount: 0, cardAmount: 0, transferAmount: 0 }]);
        }
        setSelectedItems([]);
        setSuccess(`Pago completado. Quedan ${ordenActualizada.items.filter(i => !i.paid).length} productos por pagar.`);
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setPrintLoading(false);
    }
  };

  // PAGO NORMAL (con descuento)
  const pagoNormal = async () => {
    setPrintLoading(true);
    try {
      let cedula = clienteCedula?.trim() || '9999999999';
      let nombre = clienteNombre?.trim() || 'CONSUMIDOR FINAL';
      let clienteId = await guardarCliente(cedula, nombre, clienteEmail?.trim() || null);

      let invoiceNum = null;
      const discountInfo = appliedDiscount ? { id: appliedDiscount.id, name: appliedDiscount.name, amount: discountAmount } : null;

      if (metodoPagoNormal === 'cash') {
        const paid = parseFloat(amountPaid) || 0;
        if (paid < totalOrdenConDescuento) throw new Error(`Monto insuficiente. Total: ${fmt(totalOrdenConDescuento)}`);
        await fetchWithAuth(`/api/ordenes/${selectedOrder.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'paid',
            payment_method: 'cash',
            amount_paid: totalOrdenConDescuento,
            customer_id: clienteId,
            customer_name: nombre,
            customer_document_number: cedula,
            notes: orderNotes,
            discount_id: appliedDiscount?.id || null,
            discount_amount: discountAmount
          }),
        });
        invoiceNum = await emitirFactura(selectedOrder, cedula, nombre, 'cash', discountInfo);
        await imprimirTicket(selectedOrder, totalOrdenConDescuento, paid - totalOrdenConDescuento, invoiceNum);
      } else if (metodoPagoNormal === 'card') {
        if (!refCard) throw new Error('Ingrese la referencia de la tarjeta');
        await fetchWithAuth(`/api/ordenes/${selectedOrder.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'paid',
            payment_method: 'card',
            amount_paid: totalOrdenConDescuento,
            reference_number: refCard,
            customer_id: clienteId,
            customer_name: nombre,
            customer_document_number: cedula,
            notes: orderNotes,
            discount_id: appliedDiscount?.id || null,
            discount_amount: discountAmount
          }),
        });
        invoiceNum = await emitirFactura(selectedOrder, cedula, nombre, 'card', discountInfo);
        await imprimirTicket(selectedOrder, totalOrdenConDescuento, 0, invoiceNum);
      } else if (metodoPagoNormal === 'transfer') {
        if (!refTransfer) throw new Error('Ingrese la referencia de la transferencia');
        await fetchWithAuth(`/api/ordenes/${selectedOrder.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'paid',
            payment_method: 'transfer',
            amount_paid: totalOrdenConDescuento,
            reference_number: refTransfer,
            customer_id: clienteId,
            customer_name: nombre,
            customer_document_number: cedula,
            notes: orderNotes,
            discount_id: appliedDiscount?.id || null,
            discount_amount: discountAmount
          }),
        });
        invoiceNum = await emitirFactura(selectedOrder, cedula, nombre, 'transfer', discountInfo);
        await imprimirTicket(selectedOrder, totalOrdenConDescuento, 0, invoiceNum);
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
            customer_id: clienteId,
            customer_name: nombre,
            customer_document_number: cedula,
            notes: orderNotes,
            discount_id: appliedDiscount?.id || null,
            discount_amount: discountAmount
          }),
        });
        invoiceNum = await emitirFactura(selectedOrder, cedula, nombre, 'mixto', discountInfo);
        await imprimirTicket(selectedOrder, totalOrdenConDescuento, cashAmt - cashNeeded, invoiceNum);
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

  // RENDER
  return (
    <PageTemplate title="Cobrar Orden" subtitle="Cobrar órdenes abiertas, imprimir recibo y abrir caja" backButton>
      <div className="checkout-modern-main">
        <div className="checkout-modern-card">
          {/* Selección de orden y cliente */}
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
                  onChange={e => setClienteCedula(e.target.value.replace(/\D/g, '').slice(0, 13))}
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
                <button className={!modoDividido ? "pay-btn selected" : "pay-btn"} onClick={() => { setModoDividido(false); setClientesDivididos([]); setSelectedItems([]); }}>
                  <DollarSign size={15} /> Normal
                </button>
                <button className={modoDividido ? "pay-btn selected" : "pay-btn"} onClick={() => {
                  setModoDividido(true);
                  setFacturaIndividual(false);
                  if (clientesDivididos.length === 0) {
                    setClientesDivididos([{ id: Date.now(), cedula: '', nombre: '', email: '', items: [], metodoPago: 'cash', montoRecibido: 0, referencia: '', cashAmount: 0, cardAmount: 0, transferAmount: 0 }]);
                  }
                }}>
                  <Users size={15} /> Dividir Cuenta
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

              <div className="order-details">
                <div className="order-head">
                  <b>{selectedOrder.mesa_numero ? `Mesa ${selectedOrder.mesa_numero}` : selectedOrder.order_type} #{selectedOrder.order_number || selectedOrder.id}</b>
                  {modoDividido && selectedItems.length > 0 && <span className="badge">{selectedItems.length} producto(s) seleccionado(s)</span>}
                </div>

                {!modoDividido ? (
                  // ----- MODO NORMAL -----
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
                          <span>DESCUENTO ({appliedDiscount.type === 'percentage' ? `${appliedDiscount.value}%` : `$${appliedDiscount.value}`}):</span>
                          <span style={{ color: '#10b981' }}>-{fmt(discountAmount)}</span>
                        </div>
                      )}
                      <div className="sub-iva-total"><span>BASE IMPONIBLE:</span><span>{fmt(nuevaBaseImponible)}</span></div>
                      <div className="sub-iva-total"><span>IVA ({ivaRateMostrar}%):</span><span>{fmt(nuevoIVAMostrar)}</span></div>
                      <div className="sub-iva-total total-row">
                        <span><strong>TOTAL:</strong></span>
                        <span className="total-amount"><strong>{fmt(totalOrdenConDescuento)}</strong></span>
                      </div>
                    </div>

                    <div className="metodo-pago-seleccion">
                      <button className={metodoPagoNormal === 'cash' ? "selected" : ""} onClick={() => setMetodoPagoNormal('cash')}><FaHandHoldingDollar size={20} /> Efectivo</button>
                      <button className={metodoPagoNormal === 'card' ? "selected" : ""} onClick={() => setMetodoPagoNormal('card')}><FiCreditCard size={20} /> Tarjeta</button>
                      <button className={metodoPagoNormal === 'transfer' ? "selected" : ""} onClick={() => setMetodoPagoNormal('transfer')}><FiSmartphone size={20} /> Transferencia</button>
                      <button className={metodoPagoNormal === 'mixto' ? "selected" : ""} onClick={() => {
                        setMetodoPagoNormal('mixto');
                        setAmountPaidRaw(''); setAmountPaid(''); setCardPaidRaw(''); setCardPaid(''); setTransferPaidRaw(''); setTransferPaid(''); setMixtoManual(new Set());
                      }}><FiGrid size={20} /> Mixto</button>
                    </div>

                    {metodoPagoNormal === 'cash' && (
                      <div className="payment-cash-row">
                        <div className="payment-field"><label><BsCurrencyExchange size={20} /> Recibido:</label>
                          <input type="text" inputMode="numeric" value={amountPaidRaw} onChange={e => { let digits = e.target.value.replace(/\D/g, ''); if (!digits) digits = '0'; if (digits.length > 8) digits = digits.slice(0,8); setAmountPaidRaw(digits); setAmountPaid((parseInt(digits,10)/100).toFixed(2)); }} placeholder="0.00" />
                        </div>
                        <div className="payment-field cambio-field"><label><BsCurrencyExchange size={20} /> Cambio:</label>
                          <span className="cambio-amount">{fmt(changeNormal)}</span>
                        </div>
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
                        <div className="payment-mixed-row">
                          <div className="mixed-field"><label><FaHandHoldingDollar size={20}/> Efectivo:</label>
                            <input type="text" inputMode="numeric" value={amountPaidRaw} onChange={e => { let digits = e.target.value.replace(/\D/g, ''); if (!digits) digits = '0'; if (digits.length > 8) digits = digits.slice(0,8); handleMixtoField('cash', digits); }} placeholder="0.00" />
                          </div>
                          <div className="mixed-field"><label><FiCreditCard size={20} /> Tarjeta:</label>
                            <input type="text" inputMode="numeric" value={cardPaidRaw} onChange={e => { let digits = e.target.value.replace(/\D/g, ''); if (!digits) digits = '0'; if (digits.length > 8) digits = digits.slice(0,8); handleMixtoField('card', digits); }} placeholder="0.00" />
                          </div>
                          <div className="mixed-field"><label><FaMoneyBillTransfer size={20} /> Transferencia:</label>
                            <input type="text" inputMode="numeric" value={transferPaidRaw} onChange={e => { let digits = e.target.value.replace(/\D/g, ''); if (!digits) digits = '0'; if (digits.length > 8) digits = digits.slice(0,8); handleMixtoField('transfer', digits); }} placeholder="0.00" />
                          </div>
                        </div>
                        <div className="mixed-total-row">
                          <div className="mixed-total-item"><span><IoFileTrayFull size={20} /> Total Ingresado:</span><strong>{fmt(totalPagadoMixto)}</strong></div>
                          {faltanteMixto > 0 && <div className="mixed-total-item warning"><span><CiWarning size={20} /> Faltante:</span><strong>{fmt(faltanteMixto)}</strong></div>}
                          {cambioMixto > 0 && <div className="mixed-total-item success"><span><BsCurrencyExchange size={20} /> Cambio:</span><strong>{fmt(cambioMixto)}</strong></div>}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  // MODO DIVIDIDO - Se mantiene igual por simplicidad
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
                      <div className="totals-footer small">
                        <div>Seleccionado: {fmt(getSplitSubtotal() + getSplitTax())}</div>
                      </div>
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

                        const cashRaw = comensal.cashAmount ? String(Math.round(comensal.cashAmount * 100)) : '';
                        const cardRaw = comensal.cardAmount ? String(Math.round(comensal.cardAmount * 100)) : '';
                        const transferRaw = comensal.transferAmount ? String(Math.round(comensal.transferAmount * 100)) : '';
                        const recibidoRaw = recibido > 0 ? String(Math.round(recibido * 100)) : '';

                        const totalPagadoMixtoComensal = (comensal.cashAmount || 0) + (comensal.cardAmount || 0) + (comensal.transferAmount || 0);
                        const cambioMixtoComensal = Math.max(0, totalPagadoMixtoComensal - totalC);
                        const faltanteMixtoComensal = Math.max(0, totalC - totalPagadoMixtoComensal);

                        return (
                          <div key={comensal.id} className="comensal-card">
                            <div className="comensal-header">
                              <span className="comensal-titulo"><FiUsersIcon size={14} /> Comensal {idx + 1}</span>
                              {clientesDivididos.length > 1 && (
                                <button onClick={() => eliminarComensal(comensal.id)} className="btn-delete"><FiX size={14} /> Eliminar</button>
                              )}
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
                              <button className={comensal.metodoPago === 'cash' ? "selected" : ""} onClick={() => actualizarComensal(comensal.id, 'metodoPago', 'cash')}>
                                <FaHandHoldingDollar size={16} /> Efectivo
                              </button>
                              <button className={comensal.metodoPago === 'card' ? "selected" : ""} onClick={() => actualizarComensal(comensal.id, 'metodoPago', 'card')}>
                                <FiCreditCard size={16} /> Tarjeta
                              </button>
                              <button className={comensal.metodoPago === 'transfer' ? "selected" : ""} onClick={() => actualizarComensal(comensal.id, 'metodoPago', 'transfer')}>
                                <FaMoneyBillTransfer size={16} /> Transferencia
                              </button>
                              <button className={comensal.metodoPago === 'mixto' ? "selected" : ""} onClick={() => actualizarComensal(comensal.id, 'metodoPago', 'mixto')}>
                                <FiGrid size={16} /> Mixto
                              </button>
                            </div>

                            {comensal.metodoPago === 'cash' && (
                              <div className="payment-cash-row">
                                <div className="payment-field">
                                  <label><BsCurrencyExchange size={16} /> Recibido:</label>
                                  <input type="text" inputMode="numeric" value={recibidoRaw}
                                    onChange={e => {
                                      let digits = e.target.value.replace(/\D/g, '');
                                      if (!digits) digits = '0';
                                      const value = parseInt(digits, 10) / 100;
                                      actualizarComensal(comensal.id, 'montoRecibido', value);
                                    }} placeholder="0.00" />
                                </div>
                                <div className="payment-field cambio-field">
                                  <label><BsCurrencyExchange size={16} /> Cambio:</label>
                                  <span className="cambio-amount">{fmt(Math.max(0, cambioC))}</span>
                                </div>
                              </div>
                            )}

                            {(comensal.metodoPago === 'card' || comensal.metodoPago === 'transfer') && (
                              <div className="payment-reference-row">
                                <label>{comensal.metodoPago === 'card' ? <FiCreditCard size={16} /> : <FaMoneyBillTransfer size={16} />} Referencia:</label>
                                <input type="text" value={comensal.referencia || ''}
                                  onChange={e => actualizarComensal(comensal.id, 'referencia', e.target.value)}
                                  placeholder="Número de referencia" />
                              </div>
                            )}

                            {comensal.metodoPago === 'mixto' && (
                              <>
                                <div className="payment-mixed-row">
                                  <div className="mixed-field"><label><FaHandHoldingDollar size={16} /> Efectivo:</label>
                                    <input type="text" inputMode="numeric" value={cashRaw}
                                      onChange={e => {
                                        let digits = e.target.value.replace(/\D/g, '');
                                        if (!digits) digits = '0';
                                        const value = parseInt(digits, 10) / 100;
                                        actualizarMontoMixtoComensal(comensal.id, 'cash', value);
                                      }} placeholder="0.00" />
                                  </div>
                                  <div className="mixed-field"><label><FiCreditCard size={16} /> Tarjeta:</label>
                                    <input type="text" inputMode="numeric" value={cardRaw}
                                      onChange={e => {
                                        let digits = e.target.value.replace(/\D/g, '');
                                        if (!digits) digits = '0';
                                        const value = parseInt(digits, 10) / 100;
                                        actualizarMontoMixtoComensal(comensal.id, 'card', value);
                                      }} placeholder="0.00" />
                                  </div>
                                  <div className="mixed-field"><label><FaMoneyBillTransfer size={16} /> Transferencia:</label>
                                    <input type="text" inputMode="numeric" value={transferRaw}
                                      onChange={e => {
                                        let digits = e.target.value.replace(/\D/g, '');
                                        if (!digits) digits = '0';
                                        const value = parseInt(digits, 10) / 100;
                                        actualizarMontoMixtoComensal(comensal.id, 'transfer', value);
                                      }} placeholder="0.00" />
                                  </div>
                                </div>
                                <div className="mixed-total-row">
                                  <div className="mixed-total-item"><span><IoFileTrayFull size={14} /> Total Ingresado:</span><strong>{fmt(totalPagadoMixtoComensal)}</strong></div>
                                  {faltanteMixtoComensal > 0 && <div className="mixed-total-item warning"><span><CiWarning size={14} /> Faltante:</span><strong>{fmt(faltanteMixtoComensal)}</strong></div>}
                                  {cambioMixtoComensal > 0 && <div className="mixed-total-item success"><span><BsCurrencyExchange size={14} /> Cambio:</span><strong>{fmt(cambioMixtoComensal)}</strong></div>}
                                </div>
                              </>
                            )}

                            <div className="comensal-totales">
                              <div>
                                <div>Subtotal: <strong>{fmt(subtotalC)}</strong></div>
                                <div>IVA: <strong>{fmt(ivaC)}</strong></div>
                              </div>
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
                          <button className="btn-asignar" onClick={() => {
                            const select = document.getElementById('comensalSelect');
                            const comensalId = parseInt(select.value);
                            asignarItemsAComensal(comensalId);
                          }}><FiPlus size={14} /> Asignar {selectedItems.length} producto(s)</button>
                        </div>
                      )}
                      {selectedItems.length > 0 && <div className="warning-box"><CiWarning size={14} /> {selectedItems.length} producto(s) sin asignar</div>}
                    </div>
                  </div>
                )}
              </div>

              <div className="actions-row">
                <button className="btn-guardar" disabled={printLoading || (!modoDividido && metodoPagoNormal === 'cash' && (!amountPaid || parseFloat(amountPaid) < totalOrdenConDescuento))}
                  onClick={() => { if (!modoDividido) pagoNormal(); }}>
                  <Check size={16} /> {printLoading ? 'Procesando...' : modoDividido ? 'CONTINUAR' : 'COBRAR'}
                </button>
                <button className="btn-cancelar" onClick={() => { setSelectedOrder(null); setClientesDivididos([]); setSelectedItems([]); setPagosRegistrados([]); setTotalPagadoAcumulado(0); setModoDividido(false); }}>
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