import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import qz from 'qz-tray';
import PageTemplate from '../../components/PageTemplate';
import OrderHeader from '../../components/OrderHeader';
import ItemsSection from '../../components/ItemsSection';
import AddItemModal from '../../components/AddItemModal';

import { useBusinessContext } from '../../admin/config/BusinessContext';
import '../../styles/CreateOrder.css';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4000';

export default function TakeOrderPageNew() {
  const navigate = useNavigate();
  const { selectedBusiness } = useBusinessContext();

  // Impresora
  const [printerConnected, setPrinterConnected] = useState(false);

  // Settings global (IVA)
  const [vatRate, setVatRate] = useState(0.12); // default fallback 12%

  // UI states
  const [printError, setPrintError] = useState(null);
  const [printLoading, setPrintLoading] = useState(false);

  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form
  const [numeroMesa, setNumeroMesa] = useState('');
  const [mesaId, setMesaId] = useState('');
  const [cedulaCliente, setCedulaCliente] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState('');
  const [notas, setNotas] = useState('');
  const [orderType, setOrderType] = useState('dine_in');
  const [items, setItems] = useState([]);

  // Modal add item
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidadItem, setCantidadItem] = useState(1);
  const [notasItem, setNotasItem] = useState('');

  // -----------------------------
  // Conectar QZ Tray
  // -----------------------------
  useEffect(() => {
    const connectPrinter = async () => {
      try {
        const certResponse = await fetch(`${API_BASE}/api/print/cert`);
        const certData = await certResponse.text();

        qz.security.setCertificatePromise(async () => certData);

        qz.security.setSignaturePromise(async (toSign) => {
          const signResponse = await fetch(`${API_BASE}/api/print/sign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: toSign })
          });
          const signData = await signResponse.json();
          return signData.signature;
        });

        if (!qz.websocket.isActive()) {
          await qz.websocket.connect();
        }
        setPrinterConnected(true);
      } catch (err) {
        console.warn('⚠️ No se pudo conectar a QZ Tray:', err?.message);
        setPrinterConnected(false);
      }
    };

    connectPrinter();
  }, []);

  // -----------------------------
  // Cargar datos + IVA (settings)
  // -----------------------------
  useEffect(() => {
    if (!selectedBusiness?.schemaName) {
      navigate('/dashboard');
      return;
    }

    if (
      selectedBusiness?.type &&
      !['restaurant', 'restaurante', 'cafe', 'cafeteria', 'cafetería', 'food'].includes(
        selectedBusiness.type.toLowerCase()
      )
    ) {
      setError('Este módulo solo está disponible para restaurantes y cafeterías');
      setLoading(false);
      return;
    }

    cargarDatos();
    cargarIvaDesdeSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusiness]);

  async function cargarIvaDesdeSettings() {
    try {
      const token = localStorage.getItem('idonToken') || localStorage.getItem('token');
      const businessId = selectedBusiness?.id || localStorage.getItem('businessId');

      const res = await fetch(`${API_BASE}/api/settings/tax`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Business-ID': businessId
        }
      });

      if (!res.ok) return;

      const data = await res.json();
      let rate = data?.vat_rate ?? data?.iva_rate ?? data?.iva_percentage;
      if (rate == null) return;

      rate = Number(rate);
      if (!Number.isFinite(rate)) return;

      const normalized = rate > 1 ? rate / 100 : rate;
      setVatRate(normalized);
    } catch (e) {
      // fallback silencioso
    }
  }

  async function cargarDatos() {
    try {
      setLoading(true);
      const token = localStorage.getItem('idonToken') || localStorage.getItem('token');
      const dbName = selectedBusiness?.schemaName;

      const [productosRes, clientesRes] = await Promise.all([
        fetch(`${API_BASE}/api/productos`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-DB-Name': dbName
          }
        }),
        fetch(`${API_BASE}/api/customers`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-DB-Name': dbName
          }
        })
      ]);

      if (productosRes.ok) {
        const data = await productosRes.json();
        setProductos(Array.isArray(data) ? data : data.productos || data.data || []);
      }

      if (clientesRes.ok) {
        const data = await clientesRes.json();
        setClientes(Array.isArray(data) ? data : data.clientes || data.data || []);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('Error al cargar productos y clientes');
      setLoading(false);
    }
  }

  // -----------------------------
  // Buscar Cliente por Cédula
  // -----------------------------
  async function buscarClientePorCedula(cedula) {
    if (!cedula || cedula.length !== 10) {
      setClienteSeleccionado(null);
      setNuevoClienteNombre('');
      return;
    }

    try {
      const token = localStorage.getItem('idonToken') || localStorage.getItem('token');

      const dbName = selectedBusiness?.schemaName;
      const res = await fetch(`${API_BASE}/api/clientes/cedula?cedula=${cedula}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-DB-Name': dbName
        }
      });

      if (res.status === 401) {
        setError('Sesión expirada. Por favor inicia sesión nuevamente');
        return;
      }

      if (!res.ok) {
        setError('Error al buscar cliente');
        return;
      }

      const data = await res.json();
      const cliente = Array.isArray(data) ? data[0] : data;

      if (cliente && cliente.id) {
        setClienteSeleccionado(cliente);
        setNuevoClienteNombre('');
        setError('');
        return;
      }

      const ecuadorData = await buscarEnAPIEcuador(cedula);

      if (ecuadorData && ecuadorData.nombres) {
        const nombreCompleto = `${ecuadorData.nombres} ${ecuadorData.apellidos || ''}`.trim();
        setNuevoClienteNombre(nombreCompleto);
        setClienteSeleccionado(null);
        setError('');
      } else {
        setError('❌ Cliente no encontrado. Ingresa el nombre manualmente.');
        setClienteSeleccionado(null);
        setSuccess('');
      }
    } catch (err) {
      console.error('Error buscando cliente:', err);
      setClienteSeleccionado(null);
      setError('Error en búsqueda, intenta de nuevo');
    }
  }

  async function buscarEnAPIEcuador(cedula) {
    try {
      const proxyUrl = 'https://infoplacas.herokuapp.com/';
      const targetUrl =
        'https://si.secap.gob.ec/sisecap/logeo_web/json/busca_persona_registro_civil.php';

      const postData = new URLSearchParams({
        documento: cedula,
        tipo: '1'
      });

      const response = await fetch(proxyUrl + targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: postData
      });

      if (!response.ok) return null;

      const textResponse = await response.text();
      if (!textResponse) return null;

      return JSON.parse(textResponse);
    } catch (error) {
      console.error('Error consultando API Ecuador:', error);
      return null;
    }
  }

  async function guardarNuevoCliente() {
    if (!nuevoClienteNombre.trim() || !cedulaCliente) {
      setError('Completa el nombre y cédula para guardar');
      return;
    }

    try {
      setGuardando(true);
      const token = localStorage.getItem('idonToken') || localStorage.getItem('token');

      const dbName = selectedBusiness?.schemaName;
      const res = await fetch(`${API_BASE}/api/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-DB-Name': dbName
        },
        body: JSON.stringify({
          nombre: nuevoClienteNombre,
        })
      });

      if (res.status === 401) {
        setError('Sesión expirada. Por favor inicia sesión nuevamente');
        setGuardando(false);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setClienteSeleccionado(data);
        setNuevoClienteNombre('');
        setSuccess(`✅ Cliente ${data.nombre} guardado exitosamente`);
        setError('');
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(`❌ ${errData.error || errData.message || 'Error al guardar cliente'}`);
      }
      setGuardando(false);
    } catch (err) {
      console.error('Error guardando cliente:', err);
      setError('Error al guardar cliente. Intenta de nuevo.');
      setGuardando(false);
    }
  }

  // -----------------------------
  // Totales (memo)
  // -----------------------------
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);
  }, [items]);

  const ivaAmount = useMemo(() => {
    return subtotal * (Number.isFinite(vatRate) ? vatRate : 0.12);
  }, [subtotal, vatRate]);

  const totalConIva = useMemo(() => subtotal + ivaAmount, [subtotal, ivaAmount]);

  const ivaLabel = useMemo(() => {
    const pct = Math.round((vatRate || 0) * 1000) / 10;
    return `${pct}%`;
  }, [vatRate]);

  // -----------------------------
  // Items
  // -----------------------------
  function agregarItem() {
    if (!productoSeleccionado || cantidadItem <= 0) {
      setError('Selecciona un producto y cantidad válida');
      return;
    }

    const precio = Number(productoSeleccionado.price) || 0;
    const cantidad = parseInt(cantidadItem, 10);
    const nuevoItem = {
      id: Date.now(),
      productoId: productoSeleccionado.id,
      nombre: productoSeleccionado.name,
      precio,
      cantidad,
      notas: notasItem, // <- AQUÍ están tus notas del modal
      subtotal: precio * cantidad
    };

    setItems((prev) => [...prev, nuevoItem]);
    setShowAddItemModal(false);
    setProductoSeleccionado(null);
    setCantidadItem(1);
    setNotasItem('');
    setError('');
  }

  function eliminarItem(itemId) {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }

  // -----------------------------
  // Imprimir comanda (compacta, separa items, imprime notas si existen)
  // -----------------------------
  const printComanda = async (pedido) => {
    if (!printerConnected) {
      setPrintError('Impresora no conectada');
      return { success: false, error: 'Impresora no conectada' };
    }

    try {
      setPrintError(null);

      const printerName = 'POS-58';
      const config = qz.configs.create(printerName);

      const WIDTH = 32;
      const line = () => '='.repeat(WIDTH);
      const sep = () => '-'.repeat(WIDTH);

      const center = (text, width = WIDTH) => {
        const str = String(text ?? '').trim();
        const pad = Math.max(0, Math.floor((width - str.length) / 2));
        return ' '.repeat(pad) + str;
      };

      const wrap = (text, width = WIDTH) => {
        const str = String(text ?? '').trim();
        if (!str) return [];
        const words = str.split(/\s+/);
        const lines = [];
        let current = '';
        for (const w of words) {
          const next = current ? `${current} ${w}` : w;
          if (next.length <= width) current = next;
          else {
            if (current) lines.push(current);
            current = w;
          }
        }
        if (current) lines.push(current);
        return lines;
      };

      const getItemsArray = (p) => {
        if (Array.isArray(p?.items)) return p.items;
        if (Array.isArray(p?.order_items)) return p.order_items;
        if (Array.isArray(p?.detalle)) return p.detalle;
        if (Array.isArray(p?.details)) return p.details;
        if (Array.isArray(p?.products)) return p.products;
        if (Array.isArray(p?.line_items)) return p.line_items;
        return [];
      };

      const getItemName = (item, idx) =>
        item?.producto ||
        item?.nombre ||
        item?.product_name ||
        item?.name ||
        item?.title ||
        item?.descripcion ||
        item?.description ||
        item?.producto_nombre ||
        `ITEM ${idx + 1}`;

      const getItemQty = (item) => {
        const q = item?.cantidad ?? item?.quantity ?? item?.qty ?? 1;
        const n = parseInt(q, 10);
        return Number.isFinite(n) && n > 0 ? n : 1;
      };

      const getItemNotes = (item) => {
        // AQUÍ debe venir item.notas si imprimimos con items locales (fix principal)
        const raw =
          item?.notas ??
          item?.notes ??
          item?.nota ??
          item?.note ??
          item?.observaciones ??
          item?.observacion ??
          item?.comments ??
          item?.comment;

        if (raw == null) return '';
        if (Array.isArray(raw)) return raw.filter(Boolean).join(' ');
        return String(raw).trim();
      };

      const typeMap = {
        dine_in: 'LOCAL',
        take_away: 'LLEVAR',
        delivery: 'DELIVERY',
        quick: 'RAPIDO'
      };

      const rawType = pedido?.tipo || pedido?.order_type || 'dine_in';
      const orderTypeText = typeMap[rawType] || 'LOCAL';

      const showMesa = rawType === 'dine_in';
      const mesaNum = String(pedido?.mesa_numero || pedido?.numero_mesa || 'N/A').trim();
      const ordenNum = String(pedido?.numero_pedido || 'N/A').trim();
      const hora = new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });

      const notasPedido = String(pedido?.notas || pedido?.notes || '').trim();
      const itemsArr = getItemsArray(pedido);

      // DEBUG
      console.log('🧾 items para imprimir (primer item):', itemsArr?.[0]);

      let out = '';
      out += line() + '\n';

      if (showMesa) {
        out += center(`MESA ${mesaNum}`) + '\n';
        out += sep() + '\n';
      }

      out += center(`ORDEN ${ordenNum}`) + '\n';
      out += sep() + '\n';
      out += center(`${orderTypeText} • ${hora}`) + '\n';
      out += line() + '\n';

      if (!itemsArr || itemsArr.length === 0) {
        out += center('SIN ITEMS') + '\n\n';
      } else {
        itemsArr.forEach((item, idx) => {
          const qty = getItemQty(item);
          const name = String(getItemName(item, idx)).trim().toUpperCase();

          const prefix = `${qty}x `;
          const nameLines = wrap(name, WIDTH - prefix.length);

          out += prefix + (nameLines[0] || '') + '\n';
          for (let i = 1; i < nameLines.length; i++) {
            out += '   ' + nameLines[i] + '\n';
          }

          const notes = getItemNotes(item);
          if (notes) {
            const noteLines = wrap(notes, WIDTH - 3);
            noteLines.forEach((ln) => {
              out += ` - ${ln}\n`;
            });
          }

          out += sep() + '\n';
        });

        out += '\n';
      }

      if (notasPedido) {
        out += center('NOTA') + '\n';
        wrap(notasPedido, WIDTH).forEach((ln) => (out += ln + '\n'));
        out += '\n';
      }

      out += line() + '\n';
      out += '\n\n\n\n\n\n\n\n\n'; // feed/corte

      await qz.print(config, [out]);
      return { success: true };
    } catch (err) {
      console.error('❌ printComanda error:', err);
      setPrintError(err?.message || 'Error imprimiendo');
      return { success: false, error: err?.message };
    }
  };

  // -----------------------------
  // Guardar = ENVIAR A COCINA
  // -----------------------------
  async function guardarOrden() {
    try {
      setGuardando(true);
      const token = localStorage.getItem('idonToken') || localStorage.getItem('token');
      const dbName = selectedBusiness?.schemaName;
      const businessId = selectedBusiness?.id || localStorage.getItem('businessId');

      if (orderType === 'dine_in' && !numeroMesa) {
        setError('Debe ingresar un número de mesa');
        setGuardando(false);
        return;
      }
      if (items.length === 0) {
        setError('Debe agregar al menos un item');
        setGuardando(false);
        return;
      }

      // --- Rutina inteligente de cliente ---
      let clienteId = null;
      let clienteObj = null;

      const cedulaCF = "9999999999";
      const nombreCF = "CONSUMIDOR FINAL";
      const nombreCliente = nuevoClienteNombre?.trim();
      const cedulaValida = cedulaCliente?.trim() && cedulaCliente.trim().length === 10;

      // 1. ¿Datos completos y válidos?
      if (nombreCliente && cedulaValida) {
        // Intenta buscar si ya existe
        let searchRes = await fetch(`${API_BASE}/api/clientes/cedula?cedula=${cedulaCliente}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-DB-Name': dbName
          }
        });
        let row = null;
        if (searchRes.ok) {
          const data = await searchRes.json();
          if (Array.isArray(data) && data[0]?.id) {
            row = data[0];
          } else if (data?.id) {
            row = data;
          }
        }
        if (row) {
          clienteId = row.id;
          clienteObj = row;
        } else {
          // No existe, lo crea
          let createRes = await fetch(`${API_BASE}/api/clientes`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'X-DB-Name': dbName
            },
            body: JSON.stringify({
              nombre: nombreCliente,
              cedula: cedulaCliente
            })
          });
          if (createRes.ok) {
            clienteObj = await createRes.json();
            clienteId = clienteObj.id;
          } else {
            const errRes = await createRes.json().catch(() => ({}));
            throw new Error(`Error creando cliente: ${errRes.error || errRes.message}`);
          }
        }
      } else {
        // Sin datos, usa Consumidor Final (busca o crea)
        let cfRes = await fetch(`${API_BASE}/api/clientes/cedula?cedula=${cedulaCF}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-DB-Name': dbName
          }
        });
        let row = null;
        if (cfRes.ok) {
          const data = await cfRes.json();
          if (Array.isArray(data) && data[0]?.id) {
            row = data[0];
          } else if (data?.id) {
            row = data;
          }
        }
        if (row) {
          clienteId = row.id;
          clienteObj = row;
        } else {
          // Crea CF
          let createCFRes = await fetch(`${API_BASE}/api/clientes`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'X-DB-Name': dbName
            },
            body: JSON.stringify({
              nombre: nombreCF,
              cedula: cedulaCF
            })
          });
          if (createCFRes.ok) {
            clienteObj = await createCFRes.json();
            clienteId = clienteObj.id;
          } else {
            const errCF = await createCFRes.json().catch(() => ({}));
            throw new Error(`Error creando Consumidor Final: ${errCF.error || errCF.message}`);
          }
        }
      }

      // --- Guarda la orden ---
      const payload = {
        numero_mesa: orderType === 'dine_in' ? (numeroMesa ? parseInt(numeroMesa, 10) : null) : null,
        mesa_id: mesaId,
        cliente_id: clienteId,
        items,
        notas,
        order_type: orderType,
        vat_rate: vatRate,
        iva_percentage: vatRate * 100,
        iva_amount: ivaAmount,
        subtotal: subtotal,
        total: totalConIva
      };

      const res = await fetch(`${API_BASE}/api/ordenes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-DB-Name': dbName,
          'X-Business-ID': businessId
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al guardar orden');
      }

      const data = await res.json();
      setSuccess(`✅ Orden ${data?.pedido?.numero_pedido ?? ''} enviada a cocina`);

      // Imprime con info cliente
      try {
        setPrintLoading(true);
        const pedidoParaImprimir = {
          ...data.pedido,
          cliente: data?.pedido?.cliente || clienteObj,
          items: items
        };
        await printComanda(pedidoParaImprimir);
      } finally {
        setPrintLoading(false);
      }

      setTimeout(() => {
        setNumeroMesa('');
        setMesaId('');
        setCedulaCliente('');
        setClienteSeleccionado(null);
        setNuevoClienteNombre('');
        setNotas('');
        setOrderType('dine_in');
        setItems([]);
        setSuccess('');
        setError('');
      }, 2500);

    } catch (err) {
      setError(err?.message || 'Error al guardar orden');
    } finally {
      setGuardando(false);
    }
  }

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <PageTemplate title="Nueva orden" subtitle="Enviar a cocina">
      <div className="takeorder-shell">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {printError && (
          <div className="print-alert">
            <div className="print-alert-title">Error de impresión</div>
            <div className="print-alert-desc">
              {printError}. Verifica QZ Tray y la impresora USB.
            </div>
          </div>
        )}

        <div className="order-grid">
          <OrderHeader
            orderType={orderType}
            setOrderType={setOrderType}
            numeroMesa={numeroMesa}
            setNumeroMesa={setNumeroMesa}
            mesaId={mesaId}
            setMesaId={setMesaId}
            cedulaCliente={cedulaCliente}
            setCedulaCliente={setCedulaCliente}
            clienteSeleccionado={clienteSeleccionado}
            nuevoClienteNombre={nuevoClienteNombre}
            setNuevoClienteNombre={setNuevoClienteNombre}
            buscarClientePorCedula={buscarClientePorCedula}
            guardarNuevoCliente={guardarNuevoCliente}
            guardando={guardando}
            notas={notas}
            setNotas={setNotas}
          />

          <ItemsSection
            items={items}
            eliminarItem={eliminarItem}
            setShowAddItemModal={setShowAddItemModal}
            subtotal={subtotal}
            ivaAmount={ivaAmount}
            totalConIva={totalConIva}
            ivaLabel={ivaLabel}
            guardando={guardando}
            orderType={orderType}
            numeroMesa={numeroMesa}
            guardarOrden={guardarOrden}
          />
        </div>

        <AddItemModal
          showAddItemModal={showAddItemModal}
          setShowAddItemModal={setShowAddItemModal}
          productos={productos}
          productoSeleccionado={productoSeleccionado}
          setProductoSeleccionado={setProductoSeleccionado}
          cantidadItem={cantidadItem}
          setCantidadItem={setCantidadItem}
          notasItem={notasItem}
          setNotasItem={setNotasItem}
          agregarItem={agregarItem}
        />
      </div>
    </PageTemplate>
  );
}