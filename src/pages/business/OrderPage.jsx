import React, { useEffect, useMemo, useState } from 'react';
import PageTemplate from '../../components/PageTemplate';
import OrderHeader from '../../components/OrderHeader';
import ItemsSection from '../../components/ItemsSection';
import AddItemModal from '../../components/AddItemModal';
import EditItemModal from '../../components/EditItemModal';
import { fetchWithAuth } from '../../config/apiBase';
import { useQzTray } from '../../components/useQzTray';
import { usePrinterService } from '../../services/usePrinterService';
import '../../styles/CreateOrder.css';

export default function TakeOrderPageNew() {
  const { printerConnected, printerError } = useQzTray();
  const { print } = usePrinterService();

  const [vatRate,               setVatRate              ] = useState(0.15);
  const [categorias,            setCategorias           ] = useState([]);
  const [productos,             setProductos            ] = useState([]);
  const [guardando,             setGuardando            ] = useState(false);
  const [error,                 setError                ] = useState('');
  const [success,               setSuccess              ] = useState('');
  const [numeroMesa,            setNumeroMesa           ] = useState('');
  const [mesaId,                setMesaId               ] = useState('');
  const [notas,                 setNotas                ] = useState('');
  const [orderType,             setOrderType            ] = useState('dine_in');
  const [items,                 setItems                ] = useState([]);
  const [showAddItemModal,      setShowAddItemModal     ] = useState(false);
  const [showEditItemModal,     setShowEditItemModal    ] = useState(false);  // 👈 NUEVO
  const [productoSeleccionado,  setProductoSeleccionado ] = useState(null);
  const [cantidadItem,          setCantidadItem         ] = useState(1);
  const [notasItem,             setNotasItem            ] = useState('');
  const [itemEditando,          setItemEditando         ] = useState(null);   // 👈 NUEVO
  const [printLoading,          setPrintLoading         ] = useState(false);

  // ── Carga inicial ─────────────────────────────────────────────────────────

  useEffect(() => {
    cargarDatos();
    cargarIva();
    cargarCategorias();
  }, []);

  async function cargarIva() {
    try {
      const res  = await fetchWithAuth('/api/settings/tax');
      if (!res.ok) return;
      const data = await res.json();
      const rate = Number(data?.vat_rate ?? data?.iva_rate ?? data?.iva_percentage);
      if (Number.isFinite(rate)) setVatRate(rate > 1 ? rate / 100 : rate);
    } catch {}
  }

  async function cargarCategorias() {
    try {
      const res = await fetchWithAuth('/api/categories');
      const data = await res.json();
      setCategorias(data);
    } catch (err) {
      setError('Error al cargar categorías');
    }
  }

  async function cargarDatos() {
    try {
      setGuardando(true);
      const res  = await fetchWithAuth('/api/products');
      const data = await res.json();
      setProductos(Array.isArray(data) ? data : data?.productos ?? data?.data ?? []);
    } catch {
      setError('Error al cargar productos');
    } finally {
      setGuardando(false);
    }
  }

  // ── Items ─────────────────────────────────────────────────────────────────

  function agregarItem() {
    if (!productoSeleccionado || cantidadItem <= 0) {
      setError('Selecciona un producto y cantidad válida');
      return;
    }
    const precio = Number(productoSeleccionado.price) || 0;
    const cantidad = parseInt(cantidadItem, 10);
    
    const nuevoItem = {
      id:         Date.now(),
      nombre:     productoSeleccionado.name,
      precio:     precio,
      cantidad:   cantidad,
      subtotal:   precio * cantidad,
      notas:      notasItem,
      product_id:   productoSeleccionado.id,
      product_name: productoSeleccionado.name,
      quantity:     cantidad,
      unit_price:   precio,
      line_total:   precio * cantidad,
    };
    
    setItems(prev => [...prev, nuevoItem]);
    setShowAddItemModal(false);
    setProductoSeleccionado(null);
    setCantidadItem(1);
    setNotasItem('');
    setError('');
  }

  // 👈 NUEVA FUNCIÓN: Abrir modal de edición
  function abrirEditarItem(item) {
    setItemEditando(item);
    setProductoSeleccionado({
      id: item.product_id,
      name: item.nombre,
      price: item.precio
    });
    setCantidadItem(item.cantidad);
    setNotasItem(item.notas || '');
    setShowEditItemModal(true);
  }

  // 👈 NUEVA FUNCIÓN: Guardar cambios del item editado
  function guardarEdicionItem() {
    if (!productoSeleccionado || cantidadItem <= 0) {
      setError('Selecciona un producto y cantidad válida');
      return;
    }
    
    const precio = Number(productoSeleccionado.price) || 0;
    const cantidad = parseInt(cantidadItem, 10);
    
    const itemActualizado = {
      ...itemEditando,
      nombre:     productoSeleccionado.name,
      precio:     precio,
      cantidad:   cantidad,
      subtotal:   precio * cantidad,
      notas:      notasItem,
      product_id:   productoSeleccionado.id,
      product_name: productoSeleccionado.name,
      quantity:     cantidad,
      unit_price:   precio,
      line_total:   precio * cantidad,
    };
    
    setItems(prev => prev.map(item => 
      item.id === itemEditando.id ? itemActualizado : item
    ));
    
    setShowEditItemModal(false);
    setItemEditando(null);
    setProductoSeleccionado(null);
    setCantidadItem(1);
    setNotasItem('');
    setError('');
  }

  const eliminarItem = itemId => setItems(prev => prev.filter(i => i.id !== itemId));

  // ── Totales ───────────────────────────────────────────────────────────────

  const subtotal    = useMemo(() => items.reduce((s, i) => s + (Number(i.line_total) || Number(i.subtotal) || 0), 0), [items]);
  const ivaAmount   = useMemo(() => subtotal * (Number.isFinite(vatRate) ? vatRate : 0.12), [subtotal, vatRate]);
  const totalConIva = useMemo(() => subtotal + ivaAmount, [subtotal, ivaAmount]);
  const ivaLabel    = useMemo(() => `${Math.round((vatRate || 0) * 1000) / 10}%`, [vatRate]);

  // ── Impresión comanda ─────────────────────────────────────────────────────

  async function imprimirComanda(pedido) {
    if (!printerConnected) return;
    try {
      setPrintLoading(true);
      await print('printer_ticket', 'comanda', {
        comanda: { number: pedido?.numero_pedido ?? 'N/A' },
        table:   pedido?.mesa_numero ?? pedido?.numero_mesa ?? (orderType === 'delivery' ? 'DELIVERY' : 'LLEVAR'),
        items,
        notes:   notas,
      });
    } finally {
      setPrintLoading(false);
    }
  }

  // ── Guardar orden ─────────────────────────────────────────────────────────

  async function guardarOrden() {
  if (orderType === 'dine_in' && !numeroMesa) {
    setError('Debe ingresar un número de mesa');
    return;
  }

  if (items.length === 0) {
    setError('Debe agregar al menos un ítem');
    return;
  }

  try {
    setGuardando(true);

    // ✅ No asignamos ningún cliente al crear la orden
    const clienteId = null;

    const itemsFormateados = items.map(item => ({
      product_id:   item.product_id,
      product_name: item.product_name,
      quantity:     item.quantity,
      unit_price:   item.unit_price,
      line_total:   item.line_total,
      notes:        item.notas || null,
    }));

    const res = await fetchWithAuth('/api/ordenes', {
      method: 'POST',
      body: JSON.stringify({
        numero_mesa:    orderType === 'dine_in' ? parseInt(numeroMesa, 10) : null,
        mesa_id:        mesaId,
        cliente_id:     clienteId,   // ← null
        items:          itemsFormateados,
        notas,
        order_type:     orderType,
        vat_rate:       vatRate,
        iva_percentage: vatRate * 100,
        iva_amount:     ivaAmount,
        subtotal,
        total:          totalConIva,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al guardar orden');
    }

    const data = await res.json();
    setSuccess(`✅ Orden ${data?.pedido?.numero_pedido ?? ''} enviada a cocina`);

    await imprimirComanda(data.pedido);

    setTimeout(() => {
      setNumeroMesa('');
      setMesaId('');
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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <PageTemplate title="Nueva orden" subtitle="Enviar a cocina">
      <div className="takeorder-shell">
        {error   && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        {printerError && (
          <div className="print-alert">
            <div className="print-alert-title">Error de impresión</div>
            <div className="print-alert-desc">{printerError}. Verifica QZ Tray y la impresora USB.</div>
          </div>
        )}

        <div className="order-grid">
          <OrderHeader
            orderType={orderType}   setOrderType={setOrderType}
            numeroMesa={numeroMesa} setNumeroMesa={setNumeroMesa}
            mesaId={mesaId}         setMesaId={setMesaId}
            notas={notas}           setNotas={setNotas}
          />
          <ItemsSection
            items={items}
            eliminarItem={eliminarItem}
            abrirEditarItem={abrirEditarItem}  // 👈 PASAR LA FUNCIÓN
            setShowAddItemModal={setShowAddItemModal}
            subtotal={subtotal}
            ivaAmount={ivaAmount}
            totalConIva={totalConIva}
            ivaLabel={ivaLabel}
            guardando={guardando || printLoading}
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
          categorias={categorias}
        />

        {/* 👈 NUEVO MODAL DE EDICIÓN */}
        <EditItemModal
          showEditItemModal={showEditItemModal}
          setShowEditItemModal={setShowEditItemModal}
          productos={productos}
          productoSeleccionado={productoSeleccionado}
          setProductoSeleccionado={setProductoSeleccionado}
          cantidadItem={cantidadItem}
          setCantidadItem={setCantidadItem}
          notasItem={notasItem}
          setNotasItem={setNotasItem}
          guardarEdicionItem={guardarEdicionItem}
          categorias={categorias}
        />
      </div>
    </PageTemplate>
  );
}