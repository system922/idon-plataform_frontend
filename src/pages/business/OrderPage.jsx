import React, { useEffect, useMemo, useState } from 'react';
import PageTemplate from '../../components/PageTemplate';
import OrderHeader from '../../components/OrderHeader';
import ItemsSection from '../../components/ItemsSection';
import AddItemModal from '../../components/AddItemModal';
import EditItemModal from '../../components/EditItemModal';
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/CreateOrder.css';

export default function TakeOrderPageNew() {
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
  const [extrasItem,            setExtrasItem           ] = useState([]);

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
    const taxRate = Number(productoSeleccionado.tax_rate) || 0;
    const cantidad = parseInt(cantidadItem, 10);
    const extrasUnitCost = extrasItem.reduce((s, e) => s + (Number(e.price) || 0), 0);
    const totalUnit = precio + extrasUnitCost;

    const nuevoItem = {
      id:         Date.now(),
      nombre:     productoSeleccionado.name,
      precio:     precio,
      tax_rate:   taxRate,
      cantidad:   cantidad,
      subtotal:   totalUnit * cantidad,
      notas:      notasItem,
      extras:     extrasItem,
      product_id:   productoSeleccionado.id,
      product_name: productoSeleccionado.name,
      quantity:     cantidad,
      unit_price:   precio,
      line_total:   totalUnit * cantidad,
    };

    setItems(prev => [...prev, nuevoItem]);
    setShowAddItemModal(false);
    setProductoSeleccionado(null);
    setCantidadItem(1);
    setNotasItem('');
    setExtrasItem([]);
    setError('');
  }

  // 👈 NUEVA FUNCIÓN: Abrir modal de edición
  function abrirEditarItem(item) {
    setItemEditando(item);
    setProductoSeleccionado({
      id:       item.product_id,
      name:     item.nombre,
      price:    item.precio,
      tax_rate: item.tax_rate,
    });
    setCantidadItem(item.cantidad);
    setNotasItem(item.notas || '');
    setExtrasItem(item.extras || []);
    setShowEditItemModal(true);
  }

  // 👈 NUEVA FUNCIÓN: Guardar cambios del item editado
  function guardarEdicionItem() {
    if (!productoSeleccionado || cantidadItem <= 0) {
      setError('Selecciona un producto y cantidad válida');
      return;
    }
    
    const precio = Number(productoSeleccionado.price) || 0;
    const taxRate = Number(productoSeleccionado.tax_rate) || 0;
    const cantidad = parseInt(cantidadItem, 10);
    const extrasUnitCost = extrasItem.reduce((s, e) => s + (Number(e.price) || 0), 0);
    const totalUnit = precio + extrasUnitCost;

    const itemActualizado = {
      ...itemEditando,
      nombre:     productoSeleccionado.name,
      precio:     precio,
      tax_rate:   taxRate,
      cantidad:   cantidad,
      subtotal:   totalUnit * cantidad,
      notas:      notasItem,
      extras:     extrasItem,
      product_id:   productoSeleccionado.id,
      product_name: productoSeleccionado.name,
      quantity:     cantidad,
      unit_price:   precio,
      line_total:   totalUnit * cantidad,
    };

    setItems(prev => prev.map(item =>
      item.id === itemEditando.id ? itemActualizado : item
    ));

    setShowEditItemModal(false);
    setItemEditando(null);
    setProductoSeleccionado(null);
    setCantidadItem(1);
    setNotasItem('');
    setExtrasItem([]);
    setError('');
  }

  const eliminarItem = itemId => setItems(prev => prev.filter(i => i.id !== itemId));

  // ── Totales ───────────────────────────────────────────────────────────────

  const subtotal    = useMemo(() => items.reduce((s, i) => s + (Number(i.line_total) || Number(i.subtotal) || 0), 0), [items]);
  const ivaAmount   = useMemo(() => items.reduce((s, i) => {
    const mainIva   = (Number(i.tax_rate) || 0) * (i.cantidad || i.quantity || 1);
    const extrasIva = (i.extras || []).reduce((se, e) => se + (Number(e.tax_rate) || 0) * (i.cantidad || i.quantity || 1), 0);
    return s + mainIva + extrasIva;
  }, 0), [items]);
  const totalConIva = useMemo(() => subtotal + ivaAmount, [subtotal, ivaAmount]);
  const ivaLabel    = useMemo(() => `${Math.round((vatRate || 0) * 1000) / 10}%`, [vatRate]);

  // ── Guardar orden ─────────────────────────────────────────────────────────

  async function guardarOrden() {
  // ✅ PREVENCIÓN DE DOBLE ENVÍO: Si ya está guardando, no continuar
  if (guardando) {
    return;
  }

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

    const itemsFormateados = items.flatMap(item => {
      const baseItem = {
        product_id:   item.product_id,
        product_name: item.product_name,
        quantity:     item.quantity,
        unit_price:   item.unit_price,
        line_total:   item.unit_price * item.quantity,
        notes:        item.notas || null,
      };

      const extraItems = (item.extras || []).map(e => ({
        product_id:   e.id,
        product_name: e.name,
        quantity:     item.quantity,
        unit_price:   Number(e.price) || 0,
        line_total:   (Number(e.price) || 0) * item.quantity,
        notes:        `__EXT__: + ${e.name}${e.nota ? ': ' + e.nota : ''}`,
      }));

      return [baseItem, ...extraItems];
    });

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
          categorias={categorias}
          extrasItem={extrasItem}
          setExtrasItem={setExtrasItem}
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
          extrasItem={extrasItem}
          setExtrasItem={setExtrasItem}
        />
      </div>
    </PageTemplate>
  );
}