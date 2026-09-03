// components/Odontologia/CobroModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  FiDollarSign,
  FiAlertCircle,
  FiCreditCard,
  FiX,
  FiCheck,
  FiGrid,
  FiSearch,
  FiUser,
  FiLoader,
  FiMail,
  FiPhone,
  FiMapPin,
} from 'react-icons/fi';
import { FaHandHoldingDollar } from 'react-icons/fa6';
import { FaMoneyBillTransfer } from 'react-icons/fa6';
import Modal from '../General/Modal';
import Input from '../../components/General/Input';
import { IconTextButton, ButtonGroup } from '../General/Button';
import { fetchWithAuth } from '../../config/apiBase_';
import { useQzTray } from '../../components/useQzTray';
import { usePrinterService } from '../../services/usePrinterService';

const FORMA_PAGO_MAP = { cash: '01', card: '19', transfer: '20', mixto: '01' };

const CobroModal = ({
  isOpen,
  onClose,
  presupuesto,
  paciente,
  onProcesarPago,
  onEmitirFactura,
  currencySymbol = 'US$',
  bizInfo = null,
}) => {
  // ── Hooks de impresión ──────────────────────────────────────────
  const { printerError } = useQzTray();
  const { print } = usePrinterService();

  // ── Estados ──────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [metodoPago, setMetodoPago] = useState('cash');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [facturaData, setFacturaData] = useState(null);
  const [enviandoFactura, setEnviandoFactura] = useState(false);
  const [buscandoCliente, setBuscandoCliente] = useState(false);

  const printResolveRef = useRef(null);

  // ── Estado del cliente ──────────────────────────────────────────
  const [clienteCedula, setClienteCedula] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteDireccion, setClienteDireccion] = useState('');
  const [foundCliente, setFoundCliente] = useState(null);
  const [clienteBuscado, setClienteBuscado] = useState(false);
  const [busquedaExitosa, setBusquedaExitosa] = useState(false);
  const [clienteIdGuardado, setClienteIdGuardado] = useState(null);

  // ── Estado de pagos ─────────────────────────────────────────────
  const [amountPaid, setAmountPaid] = useState('');
  const [amountPaidRaw, setAmountPaidRaw] = useState('');
  const [refCard, setRefCard] = useState('');
  const [refTransfer, setRefTransfer] = useState('');
  const [mixtoManual, setMixtoManual] = useState(new Set());
  const [mixtoActive, setMixtoActive] = useState(new Set());
  const [cardPaid, setCardPaid] = useState('');
  const [cardPaidRaw, setCardPaidRaw] = useState('');
  const [transferPaid, setTransferPaid] = useState('');
  const [transferPaidRaw, setTransferPaidRaw] = useState('');

  // ── Flag para saber si el usuario modificó la cédula ──────────
  const [usuarioModificoCedula, setUsuarioModificoCedula] = useState(false);

  // ── Función await para impresión ──────────────────────────────
  const awaitPrintDecision = () => new Promise(res => {
    printResolveRef.current = res;
    setShowPrintModal(true);
  });

  const handlePrintDecision = (v) => {
    setShowPrintModal(false);
    if (printResolveRef.current) {
      printResolveRef.current(v);
    }
  };

  // ── FUNCIÓN: Cargar cliente completo desde API ──────────────────
  const cargarClienteCompleto = async (clienteId) => {
    if (!clienteId) return null;
    
    try {
      const res = await fetchWithAuth(`/customers/${clienteId}`);
      if (res.ok) {
        const response = await res.json();
        const cliente = response.data || response;
        
        setClienteCedula(cliente.document_number || '');
        setClienteNombre(cliente.name || '');
        setClienteEmail(cliente.email || '');
        setClienteTelefono(cliente.phone || '');
        setClienteDireccion(cliente.address || '');
        
        setFoundCliente({
          id: cliente.id,
          document_number: cliente.document_number || '',
          nombre: cliente.name || '',
          email: cliente.email || '',
          phone: cliente.phone || '',
          address: cliente.address || '',
        });
        
        setClienteBuscado(true);
        setBusquedaExitosa(true);
        return cliente;
      }
      return null;
    } catch (err) {
      console.error('❌ Error cargando cliente completo:', err);
      return null;
    }
  };

  // ── Inicializar con paciente ────────────────────────────────────
  useEffect(() => {
    if (paciente) {
      const doc = paciente.document_number || paciente.cedula || '';
      const nombre = paciente.name || paciente.nombre || `${paciente.first_name || ''} ${paciente.last_name || ''}`.trim();
      const email = paciente.email || '';
      const phone = paciente.phone || paciente.telefono || '';
      const address = paciente.address || paciente.direccion || '';

      setClienteCedula(doc);
      setClienteNombre(nombre);
      setClienteEmail(email);
      setClienteTelefono(phone);
      setClienteDireccion(address);
      setClienteIdGuardado(paciente.id || null);

      setFoundCliente({
        document_number: doc,
        nombre: nombre,
        first_name: paciente.first_name || '',
        last_name: paciente.last_name || '',
        email: email,
        phone: phone,
        address: address,
        id: paciente.id || null,
      });
      setClienteBuscado(true);
      setBusquedaExitosa(true);
      setUsuarioModificoCedula(false);

      if (paciente.id) {
        cargarClienteCompleto(paciente.id);
      }
    }
  }, [paciente]);

  // ── Calcular totales ────────────────────────────────────────────
  const totalCobrar = presupuesto?.pending || 0;
  const changeNormal = Math.max(0, (parseFloat(amountPaid) || 0) - totalCobrar);
  const totalPagadoMixto = (parseFloat(amountPaid) || 0) + (parseFloat(cardPaid) || 0) + (parseFloat(transferPaid) || 0);
  const faltanteMixto = Math.max(0, totalCobrar - totalPagadoMixto);
  const cambioMixto = Math.max(0, totalPagadoMixto - totalCobrar);

  const fmt = (n) => `${currencySymbol} ${parseFloat(n || 0).toFixed(2)}`;

  // ── FUNCIÓN: Buscar cliente en base de datos local ──────────────
  const buscarClienteLocal = async (documento) => {
    if (!documento || (documento.length !== 10 && documento.length !== 13)) return null;

    try {
      const docType = documento.length === 13 ? 'ruc' : 'cedula';
      const res = await fetchWithAuth(`/customers/by-document?document_number=${documento}&document_type=${docType}`);

      if (res.ok) {
        const cliente = await res.json();
        if (cliente && cliente.id) {
          await cargarClienteCompleto(cliente.id);
          return {
            id: cliente.id,
            document_number: cliente.document_number || documento,
            nombre: cliente.name || '',
            email: cliente.email || '',
            phone: cliente.phone || '',
            address: cliente.address || '',
          };
        }
      }
      return null;
    } catch (err) {
      console.error('❌ Error buscando cliente local:', err);
      return null;
    }
  };

  // ── FUNCIÓN: Buscar en registro civil (SECAP) ──────────────────
  const buscarEnRegistroCivil = async (cedula10) => {
    try {
      const proxyUrl = 'https://infoplacas.herokuapp.com/';
      const targetUrl = 'https://si.secap.gob.ec/sisecap/logeo_web/json/busca_persona_registro_civil.php';
      const postData = new URLSearchParams({
        documento: cedula10,
        tipo: '1'
      });

      const response = await fetch(proxyUrl + targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: postData
      });

      const text = await response.text();

      if (text) {
        const json = JSON.parse(text);
        if (json?.nombres) {
          const nombreCompleto = (json.nombres + ' ' + (json.apellidos || '')).trim();
          return {
            nombre: nombreCompleto,
            first_name: json.nombres || '',
            last_name: json.apellidos || '',
          };
        }
      }
      return null;
    } catch (err) {
      console.error('❌ Error en registro civil:', err);
      return null;
    }
  };

  // ── FUNCIÓN: Guardar cliente en la base de datos ────────────────
  const guardarCliente = async (documento, nombre, email = null, telefono = null, direccion = null) => {
    if (!documento || !nombre) return null;
    if (documento.length !== 10 && documento.length !== 13) return null;

    const tipo_documento = documento.length === 13 ? 'ruc' : 'cedula';

    try {
      const resBusqueda = await fetchWithAuth(
        `/customers/by-document?document_number=${documento}&document_type=${tipo_documento}`
      );

      if (resBusqueda.ok) {
        const existe = await resBusqueda.json();
        if (existe && existe.id) {
          const updates = {};
          if (email && email.trim()) updates.email = email.trim();
          if (telefono && telefono.trim()) updates.phone = telefono.trim();
          if (direccion && direccion.trim()) updates.address = direccion.trim();
          
          if (Object.keys(updates).length > 0) {
            try {
              const updateRes = await fetchWithAuth(`/customers/${existe.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  nombre: existe.name || existe.nombre || nombre,
                  cedula: documento,
                  tipo_documento: tipo_documento,
                  ...updates,
                }),
              });
              
              if (updateRes.ok) {
                await cargarClienteCompleto(existe.id);
              }
            } catch (updateErr) {
              console.warn('No se pudo actualizar el cliente:', updateErr);
            }
          }
          
          await cargarClienteCompleto(existe.id);
          return existe.id;
        }
      }

      const res = await fetchWithAuth('/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre,
          cedula: documento,
          email: email || '',
          phone: telefono || '',
          address: direccion || '',
          tipo_documento: tipo_documento,
          notes: '',
        }),
      });

      if (res.ok) {
        const cliente = await res.json();
        const clienteId = cliente.data?.id || cliente.id;
        if (clienteId) {
          await cargarClienteCompleto(clienteId);
        }
        return clienteId;
      } else {
        const errorData = await res.json();
        console.error('❌ Error respuesta:', errorData);
        return null;
      }
    } catch (err) {
      console.error('❌ Error guardando cliente:', err);
      return null;
    }
  };

  // ── FUNCIÓN: Buscar cliente automáticamente ─────────────────────
  const buscarClienteAutomatico = async (documento) => {
    const docClean = documento.replace(/\D/g, '');
    if (!docClean || (docClean.length !== 10 && docClean.length !== 13)) {
      return;
    }

    let docBusqueda = docClean;
    let esRuc = false;
    if (docClean.length === 13) {
      esRuc = true;
      if (docClean.endsWith('001')) {
        docBusqueda = docClean.slice(0, 10);
      }
    }

    setBuscandoCliente(true);
    setError('');
    setClienteBuscado(false);
    setBusquedaExitosa(false);

    try {
      let cliente = await buscarClienteLocal(docBusqueda);

      if (!cliente && docBusqueda.length === 10) {
        const datosCivil = await buscarEnRegistroCivil(docBusqueda);
        if (datosCivil) {
          cliente = {
            document_number: docBusqueda,
            nombre: datosCivil.nombre,
            first_name: datosCivil.first_name,
            last_name: datosCivil.last_name,
            email: '',
            phone: '',
            address: '',
          };
        }
      }

      if (cliente) {
        const docFinal = esRuc ? docClean : cliente.document_number || docBusqueda;

        const clienteId = await guardarCliente(
          docFinal,
          cliente.nombre || cliente.first_name || '',
          cliente.email || '',
          cliente.phone || '',
          cliente.address || ''
        );

        if (clienteId) {
          setClienteIdGuardado(clienteId);
          await cargarClienteCompleto(clienteId);
        }

        setFoundCliente({
          ...cliente,
          document_number: docFinal,
          id: clienteId || cliente.id || null,
        });
        setClienteCedula(docFinal);
        setClienteNombre(cliente.nombre || cliente.first_name || '');
        setClienteEmail(cliente.email || '');
        setClienteTelefono(cliente.phone || '');
        setClienteDireccion(cliente.address || '');
        setClienteBuscado(true);
        setBusquedaExitosa(true);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setFoundCliente(null);
        setClienteBuscado(true);
        setBusquedaExitosa(false);
        if (!clienteNombre.trim()) {
          setError('No se encontraron datos. Ingrese el nombre manualmente.');
        } else {
          setError('No se encontraron datos. Verifique la cédula o complete los datos.');
        }
        setTimeout(() => setError(''), 5000);
      }
    } catch (err) {
      console.error('❌ Error en búsqueda automática:', err);
      setFoundCliente(null);
      setClienteBuscado(true);
      setBusquedaExitosa(false);
      setError('Error al buscar el cliente');
      setTimeout(() => setError(''), 5000);
    } finally {
      setBuscandoCliente(false);
    }
  };

  // ── EFECTO: Búsqueda automática al cambiar cédula ──────────────
  useEffect(() => {
    if (!usuarioModificoCedula) {
      return;
    }

    const docClean = clienteCedula.replace(/\D/g, '');
    if (docClean.length === 10 || docClean.length === 13) {
      if (foundCliente && foundCliente.document_number === docClean) {
        return;
      }
      const timer = setTimeout(() => {
        buscarClienteAutomatico(docClean);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      if (clienteCedula.length === 0) {
        setClienteBuscado(false);
        setBusquedaExitosa(false);
        setFoundCliente(null);
        setClienteIdGuardado(null);
      }
    }
  }, [clienteCedula, usuarioModificoCedula]);

  // ── FUNCIÓN: Guardar cliente manualmente ────────────────────────
  const guardarClienteManual = async () => {
    const docClean = clienteCedula.replace(/\D/g, '');
    if (!docClean || (docClean.length !== 10 && docClean.length !== 13)) {
      setError('Ingrese una cédula (10 dígitos) o RUC (13 dígitos) válido');
      return;
    }

    if (!clienteNombre.trim()) {
      setError('Ingrese el nombre del cliente');
      return;
    }

    setBuscandoCliente(true);
    try {
      const clienteId = await guardarCliente(
        docClean,
        clienteNombre.trim(),
        clienteEmail.trim() || null,
        clienteTelefono.trim() || null,
        clienteDireccion.trim() || null
      );

      if (clienteId) {
        setClienteIdGuardado(clienteId);
        setFoundCliente({
          document_number: docClean,
          nombre: clienteNombre.trim(),
          first_name: clienteNombre.trim().split(' ')[0] || '',
          last_name: clienteNombre.trim().split(' ').slice(1).join(' ') || '',
          email: clienteEmail.trim() || '',
          phone: clienteTelefono.trim() || '',
          address: clienteDireccion.trim() || '',
          id: clienteId,
        });
        setClienteBuscado(true);
        setBusquedaExitosa(true);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Error al guardar el cliente');
      }
    } catch (err) {
      console.error('❌ Error guardando cliente manual:', err);
      setError('Error al guardar el cliente');
    } finally {
      setBuscandoCliente(false);
    }
  };

  // ── Funciones para Mixto ────────────────────────────────────────
  const applyMixtoVals = (vals) => {
    setAmountPaid(vals.cash.toFixed(2));
    setAmountPaidRaw(String(Math.round(vals.cash * 100)));
    setCardPaid(vals.card.toFixed(2));
    setCardPaidRaw(String(Math.round(vals.card * 100)));
    setTransferPaid(vals.transfer.toFixed(2));
    setTransferPaidRaw(String(Math.round(vals.transfer * 100)));
  };

  const handleMixtoField = (field, digits) => {
    const total = totalCobrar;
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
    const total = totalCobrar;
    const newActive = new Set(mixtoActive);
    const newManual = new Set(mixtoManual);
    const vals = {
      cash: parseFloat(amountPaid) || 0,
      card: parseFloat(cardPaid) || 0,
      transfer: parseFloat(transferPaid) || 0,
    };
    if (newActive.has(method)) {
      newActive.delete(method);
      newManual.delete(method);
      vals[method] = 0;
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
    setMixtoManual(newManual);
    setMixtoActive(newActive);
    applyMixtoVals(vals);
  };

  // ── Emitir factura electrónica ──────────────────────────────────
  const emitirFactura = async (orderObj, cedula, nombre, method, email = null) => {
    const isCF = cedula === '9999999999' || cedula === '9999999999999';
    const tipoId = isCF ? '07' : (cedula.length === 13 ? '04' : '05');

    const totalFact = Number(totalCobrar);
    const subtotalFact = totalFact;
    const ivaAmountFact = 0;

    const itemsPayload = (orderObj.items || []).map((item, index) => {
      const qty = Number(item.quantity) || 1;
      const unitPrice = item.unit_price || (subtotalFact / (orderObj.items.length || 1));
      const description = item.product_name || item.service || item.description || `Tratamiento ${index + 1}`;
      const code = item.code || `TRT-${String(index + 1).padStart(3, '0')}`;

      return {
        code: code,
        description: description,
        qty: qty,
        unit_price: unitPrice,
        subtotal: (unitPrice * qty).toFixed(2),
        iva_amount: '0.00',
        iva_rate_pct: 0,
      };
    });

    if (!itemsPayload.length) {
      itemsPayload.push({
        code: 'TRT-001',
        description: presupuesto?.name || 'Tratamiento odontológico',
        qty: 1,
        unit_price: totalFact,
        subtotal: totalFact.toFixed(2),
        iva_amount: '0.00'
      });
    }

    const payload = {
      order_id: orderObj.id || `ORD-${Date.now()}`,
      customer: {
        name: isCF ? 'CONSUMIDOR FINAL' : nombre,
        ruc: isCF ? '9999999999' : cedula,
        email: email || null,
        tipo_identificacion: tipoId,
        phone: null
      },
      items: itemsPayload,
      subtotal: subtotalFact.toFixed(2),
      iva_amount: ivaAmountFact.toFixed(2),
      total: totalFact.toFixed(2),
      forma_pago: FORMA_PAGO_MAP[method] || '01',
      descuento: '0.00',
      iva_rate: 0,
    };

    try {
      setEnviandoFactura(true);
      const res = await fetchWithAuth('/einvoicing/invoices/emit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (!res.ok) {
        const msg = String(result.error || res.status);
        if (!/firma|signature|p12|certificado|electr/i.test(msg)) {
          setError(`Error factura: ${msg}`);
        }
        return null;
      }

      setFacturaData(result);
      setSuccess(`Factura emitida: ${result.invoice_number || ''}`);
      setTimeout(() => setSuccess(''), 4000);

      if (clienteEmail && result.id) {
        try {
          await fetchWithAuth(`/einvoicing/invoices/${result.id}/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: clienteEmail }),
          });
          setSuccess(s => s + ' Enviada al correo');
          setTimeout(() => setSuccess(''), 4000);
        } catch (emailErr) {
          console.warn('Error enviando email:', emailErr);
        }
      }

      return { id: result.id, invoice_number: result.invoice_number };
    } catch (e) {
      console.error('❌ Error en emitirFactura:', e);
      if (!/firma|signature|p12|certificado|electr/i.test(e.message)) {
        setError(`Error emitir factura: ${e.message}`);
      }
      return null;
    } finally {
      setEnviandoFactura(false);
    }
  };

  // ── Función para imprimir ──────────────────────────────────────
  const imprimirComprobante = async (pagoData, invoiceData, orderObj, paid, cambio, paymentMethod) => {
    try {
      const items = (orderObj.items || []).map(i => ({
        description: i.product_name || i.service || i.description || 'Tratamiento',
        quantity: i.quantity || 1,
        price: Number(i.unit_price) || Number(i.selling_price) || Number(i.price) || 0,
        total: (Number(i.unit_price) || Number(i.selling_price) || Number(i.price) || 0) * (i.quantity || 1),
      }));

      const printSub = items.reduce((s, i) => s + i.total, 0);
      const printIva = 0;
      const totalDescuentoImpresion = 0;
      const printTotal = Math.max(0, printSub - totalDescuentoImpresion) + printIva;
      const esCash = paymentMethod === 'cash' || paymentMethod === 'mixto';
      const discountsPrint = [];

      const baseData = {
        bizInfo: bizInfo || {
          business_name: 'Consultorio Dental',
          address: '',
          phone: '',
          email: '',
        },
        customer: { name: clienteNombre || 'CONSUMIDOR FINAL', id: clienteCedula || '9999999999' },
        items,
        subtotal: Math.max(0, printSub - totalDescuentoImpresion),
        discount: totalDescuentoImpresion,
        discounts: discountsPrint.length > 0 ? discountsPrint : null,
        tax: printIva,
        taxRate: 0,
        total: printTotal,
        recibido: esCash ? paid + Math.max(0, cambio) : 0,
        cambio: esCash ? Math.max(0, cambio) : 0,
        metodoPago: paymentMethod,
      };

      if (invoiceData?.invoice_number) {
        await print('printer_main', 'invoice', {
          ...baseData,
          invoice: { number: invoiceData.invoice_number, date: new Date().toISOString() },
          payment: { cash: paid, card: 0, other: 0 },
        }, true);
      } else {
        await print('printer_main', 'ticket-simple', baseData, true);
      }

      setSuccess('Comprobante impreso correctamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('❌ Error al imprimir:', err);
      setError('Error al imprimir el comprobante');
      setTimeout(() => setError(''), 3000);
    }
  };

  // ── Procesar cobro ──────────────────────────────────────────────
  const procesarCobro = async () => {
    if (!presupuesto) return;

    const docClean = clienteCedula.replace(/\D/g, '');
    if (docClean.length === 10 || docClean.length === 13 && clienteNombre.trim()) {
      const clienteId = await guardarCliente(
        docClean,
        clienteNombre.trim(),
        clienteEmail.trim() || null,
        clienteTelefono.trim() || null,
        clienteDireccion.trim() || null
      );
      if (clienteId) {
        setClienteIdGuardado(clienteId);
        if (!foundCliente) {
          setFoundCliente({
            document_number: docClean,
            nombre: clienteNombre.trim(),
            first_name: clienteNombre.trim().split(' ')[0] || '',
            last_name: clienteNombre.trim().split(' ').slice(1).join(' ') || '',
            email: clienteEmail.trim() || '',
            phone: clienteTelefono.trim() || '',
            address: clienteDireccion.trim() || '',
            id: clienteId,
          });
          setClienteBuscado(true);
          setBusquedaExitosa(true);
        }
      }
    }

    if (!foundCliente && !clienteNombre) {
      setError('Debe buscar o ingresar un cliente');
      return;
    }

    if (metodoPago === 'cash') {
      const paid = parseFloat(amountPaid) || 0;
      if (paid < totalCobrar) {
        setError(`Monto insuficiente. Total: ${fmt(totalCobrar)}`);
        return;
      }
    }
    if (metodoPago === 'card' && !refCard) {
      setError('Ingrese la referencia de la tarjeta');
      return;
    }
    if (metodoPago === 'transfer' && !refTransfer) {
      setError('Ingrese la referencia de la transferencia');
      return;
    }
    if (metodoPago === 'mixto') {
      if (faltanteMixto > 0.01) {
        setError(`Falta ${fmt(faltanteMixto)} por cubrir en el pago mixto`);
        return;
      }
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const cedula = clienteCedula?.trim() || '9999999999';
      const nombre = clienteNombre?.trim() || 'CONSUMIDOR FINAL';

      let paymentMethod = metodoPago;
      let payments = [];
      let cashPaidAmt = 0;
      let cambioFinal = 0;

      if (metodoPago === 'cash') {
        cashPaidAmt = parseFloat(amountPaid) || 0;
        cambioFinal = cashPaidAmt - totalCobrar;
        payments = [{ method: 'cash', amount: cashPaidAmt }];
      } else if (metodoPago === 'card') {
        payments = [{ method: 'card', amount: totalCobrar, reference_number: refCard }];
      } else if (metodoPago === 'transfer') {
        payments = [{ method: 'transfer', amount: totalCobrar, reference_number: refTransfer }];
      } else if (metodoPago === 'mixto') {
        const ca = parseFloat(amountPaid) || 0;
        const ka = parseFloat(cardPaid) || 0;
        const ta = parseFloat(transferPaid) || 0;
        if (ca > 0) { payments.push({ method: 'cash', amount: ca }); cashPaidAmt = ca; }
        if (ka > 0) payments.push({ method: 'card', amount: ka, reference_number: refCard });
        if (ta > 0) payments.push({ method: 'transfer', amount: ta, reference_number: refTransfer });
        cambioFinal = Math.max(0, cambioMixto);
      }

      const itemsFormateados = (presupuesto.items || []).map((item, index) => {
        const qty = Number(item.quantity) || 1;
        const price = parseFloat(item.price) || parseFloat(item.unit_price) || 0;
        const subtotalItem = price * qty;

        return {
          product_id: item.id || presupuesto.id,
          product_name: item.product_name || item.service || item.description || `Tratamiento ${index + 1}`,
          service: item.service || item.product_name || item.description || `Tratamiento ${index + 1}`,
          description: item.description || item.product_name || item.service || `Tratamiento ${index + 1}`,
          quantity: qty,
          unit_price: price,
          price: price,
          line_total: subtotalItem,
          tax_rate: 0,
          iva_amount: 0,
          code: item.code || `TRT-${String(index + 1).padStart(3, '0')}`,
          subtotal: subtotalItem,
          tooth: item.tooth || '',
          surfaces: item.surfaces || [],
          diagnostico: item.diagnostico || '',
        };
      });

      if (!itemsFormateados.length) {
        itemsFormateados.push({
          product_id: presupuesto.id,
          product_name: presupuesto.name || 'Tratamiento',
          service: presupuesto.name || 'Tratamiento',
          description: presupuesto.name || 'Tratamiento',
          quantity: 1,
          unit_price: totalCobrar,
          price: totalCobrar,
          line_total: totalCobrar,
          tax_rate: 0,
          iva_amount: 0,
          code: 'TRT-001',
          subtotal: totalCobrar,
          tooth: '',
          surfaces: [],
          diagnostico: '',
        });
      }

      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      const ordenParaFactura = {
        id: generateUUID(),
        items: itemsFormateados,
      };

      const clienteData = foundCliente || {
        id: 'temp-' + Date.now(),
        document_number: clienteCedula || '9999999999',
        nombre: clienteNombre || 'CONSUMIDOR FINAL',
        email: clienteEmail || '',
        phone: clienteTelefono || '',
        address: clienteDireccion || '',
      };

      let pagoData = {
        presupuesto_id: presupuesto.id,
        presupuesto_name: presupuesto.name,
        total: totalCobrar,
        metodo_pago: metodoPago,
        referencia: metodoPago === 'card' ? refCard : metodoPago === 'transfer' ? refTransfer : null,
        date: new Date().toISOString().slice(0, 10),
        doctor: 'Dr. Jefferson Cagua',
        cliente: clienteData,
        currencySymbol: currencySymbol,
        payments,
        monto_recibido: metodoPago === 'cash' ? cashPaidAmt : totalCobrar,
        cambio: cambioFinal,
        items_detalle: itemsFormateados.map(item => ({
          servicio: item.service || item.product_name || item.description,
          diente: item.tooth || '',
          precio: item.price || item.unit_price || 0,
          surfaces: item.surfaces || [],
          diagnostico: item.diagnostico || '',
        })),
      };

      if (onProcesarPago) {
        await onProcesarPago(pagoData);
      }

      let invoiceData = null;
      invoiceData = await emitirFactura(ordenParaFactura, cedula, nombre, paymentMethod, clienteEmail?.trim() || null);

      if (invoiceData) {
        pagoData.invoice_number = invoiceData.invoice_number;
      }

      const shouldPrint = await awaitPrintDecision();

      if (shouldPrint) {
        await imprimirComprobante(pagoData, invoiceData, ordenParaFactura, cashPaidAmt, cambioFinal, paymentMethod);
      }

      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 2000);

    } catch (err) {
      console.error('❌ Error en procesarCobro:', err);
      setError(err.message || 'Error al procesar el pago');
    } finally {
      setLoading(false);
    }
  };

  // ── Cerrar modal ────────────────────────────────────────────────
  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  if (!isOpen || !presupuesto) return null;

  // ── CONTENIDO DEL MODAL ──────────────────────────────────────────
  const modalContent = (
    <>
      {/* CLIENTE */}
      <div style={{
        marginBottom: 0,
        padding: 0,
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 0,
        }}>
          <FiUser size={16} style={{ color: 'rgba(255,255,255,0.4)' }} />
          
          {foundCliente && (
            <span style={{
              fontSize: 9,
              background: 'rgba(16,185,129,0.15)',
              color: '#10b981',
              padding: '2px 8px',
              borderRadius: 10,
              fontWeight: 600,
            }}>✓ Datos cargados</span>
          )}
          {buscandoCliente && (
            <span style={{
              fontSize: 9,
              background: 'rgba(104,66,254,0.15)',
              color: '#7c5cff',
              padding: '2px 8px',
              borderRadius: 10,
              fontWeight: 600,
            }}>
              <FiLoader size={10} className="spin" style={{ marginRight: 4 }} /> Buscando...
            </span>
          )}
        </div>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          marginTop: 4,
        }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{
              fontSize: 9,
              fontWeight: 600,
              color: 'var(--text-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>Cédula / RUC</div>
            <input
              type="text"
              value={clienteCedula}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 13);
                setClienteCedula(val);
                setUsuarioModificoCedula(true);
              }}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'var(--text-input)',
                color: 'rgba(255,255,255,0.9)',
                fontSize: 13,
                fontFamily: 'inherit',
              }}
              disabled={loading}
              placeholder="9999999999"
            />
          </div>
          <div style={{ flex: 2, minWidth: 120 }}>
            <div style={{
              fontSize: 9,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.3)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>Nombre completo</div>
            <input
              type="text"
              value={clienteNombre}
              onChange={e => setClienteNombre(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(8,12,20,0.6)',
                color: 'rgba(255,255,255,0.9)',
                fontSize: 13,
                fontFamily: 'inherit',
              }}
              disabled={loading}
              placeholder="Nombre del cliente"
            />
          </div>
        </div>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          marginTop: 6,
        }}>
          <div style={{ flex: 1.5, minWidth: 120 }}>
            <div style={{
              fontSize: 9,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.3)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              <FiMail size={10} style={{ marginRight: 4 }} /> Email (para factura)
            </div>
            <input
              type="email"
              value={clienteEmail}
              onChange={e => setClienteEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(8,12,20,0.6)',
                color: 'rgba(255,255,255,0.9)',
                fontSize: 13,
                fontFamily: 'inherit',
              }}
              disabled={loading}
              placeholder="correo@ejemplo.com"
            />
          </div>
          <div style={{ flex: 1, minWidth: 100 }}>
            <div style={{
              fontSize: 9,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.3)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              <FiPhone size={10} style={{ marginRight: 4 }} /> Teléfono
            </div>
            <input
              type="text"
              value={clienteTelefono}
              onChange={e => setClienteTelefono(e.target.value)}
              style={{
                width: '75%',
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(8,12,20,0.6)',
                color: 'rgba(255,255,255,0.9)',
                fontSize: 13,
                fontFamily: 'inherit',
              }}
              disabled={loading}
              placeholder="0999123456"
            />
          </div>
        </div>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          marginTop: 6,
        }}>
          <div style={{ flex: 2, minWidth: 120 }}>
            <div style={{
              fontSize: 9,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.3)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              <FiMapPin size={10} style={{ marginRight: 4 }} /> Dirección
            </div>
            <input
              type="text"
              value={clienteDireccion}
              onChange={e => setClienteDireccion(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(8,12,20,0.6)',
                color: 'rgba(255,255,255,0.9)',
                fontSize: 13,
                fontFamily: 'inherit',
              }}
              disabled={loading}
              placeholder="Dirección del cliente"
            />
          </div>
        </div>

        {usuarioModificoCedula && (
          <div style={{ marginTop: 10 }}>
            <button
              onClick={guardarClienteManual}
              disabled={buscandoCliente || loading}
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                border: '1px solid rgba(16,185,129,0.3)',
                background: 'rgba(16,185,129,0.08)',
                color: '#10b981',
                fontSize: 11,
                fontWeight: 600,
                cursor: (buscandoCliente || loading) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                opacity: (buscandoCliente || loading) ? 0.5 : 1,
              }}
            >
              {buscandoCliente ? (
                <><FiLoader size={12} className="spin" /> Guardando...</>
              ) : (
                <><FiUser size={12} /> Guardar Cliente</>
              )}
            </button>
            {clienteBuscado && !busquedaExitosa && (
              <div style={{ color: '#ef4444', fontSize: '11px', marginTop: 4 }}>
                No se encontraron datos. Ingrese la información manualmente y presione "Guardar Cliente".
              </div>
            )}
          </div>
        )}
      </div>

      {/* TOTAL A COBRAR */}
      <div style={{
        textAlign: 'center',
        padding: 16,
        marginBottom: 16,
        background: 'rgba(104,66,254,0.08)',
        borderRadius: 12,
        border: '1px solid rgba(104,66,254,0.15)',
      }}>
        <div style={{
          fontSize: 11,
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.4)',
          letterSpacing: '0.04em',
        }}>Total a cobrar</div>
        <div style={{
          fontSize: 28,
          fontWeight: 700,
          color: '#fff',
        }}>
          <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)' }}>{currencySymbol} </span>
          {parseFloat(totalCobrar).toFixed(2)}
        </div>
        <div style={{
          fontSize: 12,
          color: 'rgba(255,255,255,0.3)',
          marginTop: 4,
        }}>{presupuesto.name}</div>
      </div>

      {/* MENSAJES */}
      {error && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 10,
          marginBottom: 12,
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.15)',
          color: '#ef4444',
        }}>{error}</div>
      )}
      {success && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 10,
          marginBottom: 12,
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.15)',
          color: '#10b981',
        }}>{success}</div>
      )}
      {printerError && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 10,
          marginBottom: 12,
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.15)',
          color: '#ef4444',
        }}>⚠️ {printerError}</div>
      )}

      {/* MÉTODOS DE PAGO */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr 1fr',
        gap: 8,
        marginBottom: 16,
      }}>
        {[
          { key: 'cash', label: 'Efectivo', icon: <FaHandHoldingDollar size={20} /> },
          { key: 'card', label: 'Tarjeta', icon: <FiCreditCard size={20} /> },
          { key: 'transfer', label: 'Transferencia', icon: <FaMoneyBillTransfer size={20} /> },
          { key: 'mixto', label: 'Mixto', icon: <FiGrid size={20} /> },
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            style={{
              padding: '10px 6px',
              border: metodoPago === key ? '2px solid rgba(104,66,254,0.5)' : '2px solid rgba(255,255,255,0.06)',
              borderRadius: 10,
              background: metodoPago === key ? 'rgba(104,66,254,0.1)' : 'rgba(255,255,255,0.02)',
              color: metodoPago === key ? '#fff' : 'rgba(255,255,255,0.5)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              fontFamily: 'inherit',
            }}
            onClick={() => {
              setMetodoPago(key);
              setError('');
              if (key === 'mixto') {
                setAmountPaidRaw('');
                setAmountPaid('');
                setCardPaidRaw('');
                setCardPaid('');
                setTransferPaidRaw('');
                setTransferPaid('');
                setMixtoManual(new Set());
                setMixtoActive(new Set());
              }
            }}
            disabled={loading}
          >
            {icon}
            <span style={{
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>{label}</span>
          </button>
        ))}
      </div>

      {/* EFECTIVO */}
      {metodoPago === 'cash' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          marginBottom: 12,
        }}>
          <label style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}>Monto recibido</label>
          <input
            type="text"
            inputMode="numeric"
            value={amountPaid}
            placeholder="0.00"
            onChange={e => {
              let d = e.target.value.replace(/\D/g, '');
              if (!d) d = '0';
              if (d.length > 8) d = d.slice(0, 8);
              setAmountPaidRaw(d);
              setAmountPaid((parseInt(d, 10) / 100).toFixed(2));
            }}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(8,12,20,0.6)',
              color: 'rgba(255,255,255,0.9)',
              fontSize: 14,
              fontFamily: 'inherit',
              width: '100%',
              boxSizing: 'border-box',
            }}
            disabled={loading}
          />
          {parseFloat(amountPaid) > 0 && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.15)',
              color: '#10b981',
              fontSize: 18,
              fontWeight: 700,
              textAlign: 'center',
              marginTop: 8,
            }}>Cambio: {fmt(changeNormal)}</div>
          )}
        </div>
      )}

      {/* TARJETA */}
      {metodoPago === 'card' && (
        <>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            marginBottom: 12,
          }}>
            <label style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.4)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>Número de referencia</label>
            <input
              type="text"
              value={refCard}
              onChange={e => setRefCard(e.target.value)}
              placeholder="Ej: AUT-12345"
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(8,12,20,0.6)',
                color: 'rgba(255,255,255,0.9)',
                fontSize: 14,
                fontFamily: 'inherit',
                width: '100%',
                boxSizing: 'border-box',
              }}
              disabled={loading}
            />
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            marginBottom: 12,
          }}>
            <label style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.4)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>Monto a cobrar</label>
            <div style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.03)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 16,
            }}>{fmt(totalCobrar)}</div>
          </div>
        </>
      )}

      {/* TRANSFERENCIA */}
      {metodoPago === 'transfer' && (
        <>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            marginBottom: 12,
          }}>
            <label style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.4)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>Número de referencia</label>
            <input
              type="text"
              value={refTransfer}
              onChange={e => setRefTransfer(e.target.value)}
              placeholder="Ej: TRANS-12345"
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(8,12,20,0.6)',
                color: 'rgba(255,255,255,0.9)',
                fontSize: 14,
                fontFamily: 'inherit',
                width: '100%',
                boxSizing: 'border-box',
              }}
              disabled={loading}
            />
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            marginBottom: 12,
          }}>
            <label style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.4)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>Monto a cobrar</label>
            <div style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.03)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 16,
            }}>{fmt(totalCobrar)}</div>
          </div>
        </>
      )}

      {/* MIXTO */}
      {metodoPago === 'mixto' && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 6,
            marginBottom: 12,
          }}>
            {[
              { key: 'cash', label: 'Efectivo', icon: <FaHandHoldingDollar size={13} /> },
              { key: 'card', label: 'Tarjeta', icon: <FiCreditCard size={13} /> },
              { key: 'transfer', label: 'Transferencia', icon: <FaMoneyBillTransfer size={13} /> },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                style={{
                  padding: 8,
                  border: mixtoActive.has(key) ? '1px solid rgba(104,66,254,0.4)' : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 8,
                  background: mixtoActive.has(key) ? 'rgba(104,66,254,0.08)' : 'transparent',
                  color: mixtoActive.has(key) ? '#fff' : 'rgba(255,255,255,0.4)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  fontFamily: 'inherit',
                }}
                onClick={() => toggleMixtoMetodo(key)}
                disabled={loading}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {mixtoActive.size > 0 && (
            <>
              {mixtoActive.has('cash') && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  marginBottom: 12,
                }}>
                  <label style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.4)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}>Efectivo</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amountPaid}
                    placeholder="0.00"
                    onChange={e => {
                      let d = e.target.value.replace(/\D/g, '');
                      if (!d) d = '0';
                      if (d.length > 8) d = d.slice(0, 8);
                      handleMixtoField('cash', d);
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.06)',
                      background: 'rgba(8,12,20,0.6)',
                      color: 'rgba(255,255,255,0.9)',
                      fontSize: 14,
                      fontFamily: 'inherit',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                    disabled={loading}
                  />
                </div>
              )}
              {mixtoActive.has('card') && (
                <>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    marginBottom: 12,
                  }}>
                    <label style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.4)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}>Tarjeta</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cardPaid}
                      placeholder="0.00"
                      onChange={e => {
                        let d = e.target.value.replace(/\D/g, '');
                        if (!d) d = '0';
                        if (d.length > 8) d = d.slice(0, 8);
                        handleMixtoField('card', d);
                      }}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.06)',
                        background: 'rgba(8,12,20,0.6)',
                        color: 'rgba(255,255,255,0.9)',
                        fontSize: 14,
                        fontFamily: 'inherit',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                      disabled={loading}
                    />
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    marginBottom: 12,
                  }}>
                    <label style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.4)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}>Ref. tarjeta</label>
                    <input
                      type="text"
                      value={refCard}
                      onChange={e => setRefCard(e.target.value)}
                      placeholder="Ej: AUT-12345"
                      style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.06)',
                        background: 'rgba(8,12,20,0.6)',
                        color: 'rgba(255,255,255,0.9)',
                        fontSize: 14,
                        fontFamily: 'inherit',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                      disabled={loading}
                    />
                  </div>
                </>
              )}
              {mixtoActive.has('transfer') && (
                <>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    marginBottom: 12,
                  }}>
                    <label style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.4)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}>Transferencia</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={transferPaid}
                      placeholder="0.00"
                      onChange={e => {
                        let d = e.target.value.replace(/\D/g, '');
                        if (!d) d = '0';
                        if (d.length > 8) d = d.slice(0, 8);
                        handleMixtoField('transfer', d);
                      }}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.06)',
                        background: 'rgba(8,12,20,0.6)',
                        color: 'rgba(255,255,255,0.9)',
                        fontSize: 14,
                        fontFamily: 'inherit',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                      disabled={loading}
                    />
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    marginBottom: 12,
                  }}>
                    <label style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.4)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}>Ref. transferencia</label>
                    <input
                      type="text"
                      value={refTransfer}
                      onChange={e => setRefTransfer(e.target.value)}
                      placeholder="Ej: TRANS-12345"
                      style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.06)',
                        background: 'rgba(8,12,20,0.6)',
                        color: 'rgba(255,255,255,0.9)',
                        fontSize: 14,
                        fontFamily: 'inherit',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                      disabled={loading}
                    />
                  </div>
                </>
              )}
            </>
          )}

          {mixtoActive.size > 0 && (faltanteMixto > 0.01 || cambioMixto > 0.01) && (
            <div style={{
              display: 'flex',
              gap: 12,
              marginTop: 8,
            }}>
              {faltanteMixto > 0.01 && (
                <div style={{ flex: 1 }}>
                  <label style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.4)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}>Faltante</label>
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.15)',
                    color: '#ef4444',
                    fontSize: 18,
                    fontWeight: 700,
                    textAlign: 'center',
                  }}>{fmt(faltanteMixto)}</div>
                </div>
              )}
              {cambioMixto > 0.01 && (
                <div style={{ flex: 1 }}>
                  <label style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.4)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}>Cambio</label>
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: 'rgba(16,185,129,0.08)',
                    border: '1px solid rgba(16,185,129,0.15)',
                    color: '#10b981',
                    fontSize: 18,
                    fontWeight: 700,
                    textAlign: 'center',
                  }}>{fmt(cambioMixto)}</div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Indicador de factura electrónica */}
      {clienteEmail ? (
        <div style={{
          marginTop: 8,
          fontSize: 11,
          color: 'rgba(255,255,255,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          justifyContent: 'center',
        }}>
          <FiMail size={12} />
          Se enviará factura electrónica a: <strong style={{ color: 'rgba(255,255,255,0.6)' }}>{clienteEmail}</strong>
        </div>
      ) : (
        <div style={{
          marginTop: 8,
          fontSize: 11,
          color: 'rgba(239,68,68,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          justifyContent: 'center',
        }}>
          <FiAlertCircle size={12} />
          Sin email - no se enviará factura electrónica
        </div>
      )}
    </>
  );

  // ── FOOTER CON BOTONES ────────────────────────────────────────────
  const modalFooter = (
    <ButtonGroup>
      <IconTextButton
        variant=""
        size="md"
        icon={<FiX size={14} />}
        onClick={handleClose}
        disabled={loading}
      >
        Cancelar
      </IconTextButton>
      <IconTextButton
        variant="success"
        size="md"
        icon={<FiCheck size={14} />}
        onClick={procesarCobro}
        disabled={loading || enviandoFactura}
        loading={loading || enviandoFactura}
      >
        {enviandoFactura ? 'Emitiendo factura...' : loading ? 'Procesando...' : `Cobrar ${fmt(totalCobrar)}`}
      </IconTextButton>
    </ButtonGroup>
  );

  // ── RENDER CON MODAL GENÉRICO ────────────────────────────────────
  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Cobrar"
        size="md"
        closeOnOverlayClick={false}
        footer={modalFooter}
      >
        {modalContent}
      </Modal>

      {/* MODAL DE IMPRESIÓN - Se mantiene igual */}
      {showPrintModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20,
        }}>
          <div style={{
            background: '#13131f',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: '32px 28px',
            maxWidth: 340,
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🧾</div>
            <h3 style={{ color: '#f1f5f9', margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>
              ¿Imprimir comprobante?
            </h3>
            <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 24px' }}>
              El pago fue registrado exitosamente.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => handlePrintDecision(true)}
                style={{
                  background: 'linear-gradient(135deg,#10b981,#059669)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '11px 24px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <FiCheck size={15} /> Sí, imprimir
              </button>
              <button
                onClick={() => handlePrintDecision(false)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: '#94a3b8',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  padding: '11px 24px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <FiX size={15} /> No
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 0.8s linear infinite;
        }
      `}</style>
    </>
  );
};

export default CobroModal;