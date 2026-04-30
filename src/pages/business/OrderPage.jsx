import React, { useEffect, useMemo, useState } from 'react';
import PageTemplate from '../../components/PageTemplate';
import OrderHeader from '../../components/OrderHeader';
import ItemsSection from '../../components/ItemsSection';
import AddItemModal from '../../components/AddItemModal';
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
  const [productoSeleccionado,  setProductoSeleccionado ] = useState(null);
  const [cantidadItem,          setCantidadItem         ] = useState(1);
  const [notasItem,             setNotasItem            ] = useState('');

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
      const res = await fetchWithAuth('/api/categories'); // API que retorna las categorías
      const data = await res.json();
      setCategorias(data); // Guardamos las categorías en el estado
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
    const precio   = Number(productoSeleccionado.price) || 0;
    const cantidad = parseInt(cantidadItem, 10);
    setItems(prev => [...prev, {
      id:         Date.now(),
      productoId: productoSeleccionado.id,
      nombre:     productoSeleccionado.name,
      precio,
      cantidad,
      notas:      notasItem,
      subtotal:   precio * cantidad,
    }]);
    setShowAddItemModal(false);
    setProductoSeleccionado(null);
    setCantidadItem(1);
    setNotasItem('');
    setError('');
  }

  const eliminarItem = itemId => setItems(prev => prev.filter(i => i.id !== itemId));

  // ── Totales ───────────────────────────────────────────────────────────────

  const subtotal    = useMemo(() => items.reduce((s, i) => s + (Number(i.subtotal) || 0), 0), [items]);
  const ivaAmount   = useMemo(() => subtotal * (Number.isFinite(vatRate) ? vatRate : 0.12), [subtotal, vatRate]);
  const totalConIva = useMemo(() => subtotal + ivaAmount, [subtotal, ivaAmount]);
  const ivaLabel    = useMemo(() => `${Math.round((vatRate || 0) * 1000) / 10}%`, [vatRate]);

  // ── Guardar orden ─────────────────────────────────────────────────────────

  async function guardarOrden() {
    // ── Validación para "dine_in" ───────────────────────────────────────────────────
    if (orderType === 'dine_in' && !numeroMesa) {
      setError('Debe ingresar un número de mesa');
      return; // No continuar con el guardado si no hay número de mesa
    }

    // ── Validación para asegurar que haya al menos un ítem ───────────────────────────
    if (items.length === 0) {
      setError('Debe agregar al menos un ítem');
      return; // No continuar con el guardado si no hay ítems
    }

    try {
      setGuardando(true);

      // Buscar o crear Consumidor Final
      const CF_CEDULA = '9999999999';
      const CF_NOMBRE = 'CONSUMIDOR FINAL';
      let clienteId   = null;

      const cfRes  = await fetchWithAuth(`/api/customers/cedula?cedula=${CF_CEDULA}`);
      const cfData = cfRes.ok ? await cfRes.json() : null;
      const cfExistente = Array.isArray(cfData) ? cfData[0] : cfData;

      if (cfExistente?.id) {
        clienteId = cfExistente.id;
      } else {
        const crearRes  = await fetchWithAuth('/api/customers', {
          method: 'POST',
          body: JSON.stringify({ nombre: CF_NOMBRE, cedula: CF_CEDULA }),
        });
        if (!crearRes.ok) throw new Error('Error creando Consumidor Final');
        const creado = await crearRes.json();
        clienteId    = creado.id;
      }

      // Guardar orden
      const res = await fetchWithAuth('/api/ordenes', {
        method: 'POST',
        body: JSON.stringify({
          numero_mesa:    orderType === 'dine_in' ? parseInt(numeroMesa, 10) : null, // Solo pasa si es "dine_in"
          mesa_id:        mesaId,
          cliente_id:     clienteId,
          items,
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
        />
      </div>
    </PageTemplate>
  );
}