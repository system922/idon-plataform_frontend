import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useSession } from '../../context/SessionContext';
import { FiShoppingCart, FiX } from 'react-icons/fi';
import PageTemplate from '../../components/PageTemplate';
import OrderHeader from '../../components/OrderHeader';
import ItemsSection from '../../components/ItemsSection';
import AddItemModal from '../../components/AddItemModal';
import EditItemModal from '../../components/EditItemModal';
import { fetchWithAuth } from '../../config/api';

export default function TakeOrderPageNew() {
  const { user } = useSession();
  const isSendingRef = useRef(false);

  const [vatRate, setVatRate] = useState(0.15);
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [numeroMesa, setNumeroMesa] = useState('');
  const [mesaId, setMesaId] = useState('');
  const [notas, setNotas] = useState('');
  const [orderType, setOrderType] = useState('dine_in');
  const [items, setItems] = useState([]);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidadItem, setCantidadItem] = useState(1);
  const [notasItem, setNotasItem] = useState('');
  const [itemEditando, setItemEditando] = useState(null);
  const [extrasItem, setExtrasItem] = useState([]);

  // ── Helper de redondeo ──────────────────────────────────────────────────
  const redondear = (valor) => Math.round(valor * 100) / 100;

  // ── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    cargarDatos();
    cargarIva();
    cargarCategorias();
  }, []);

  async function cargarIva() {
    try {
      const res = await fetchWithAuth('/productos/fiscal-rates');
      if (!res.ok) return;
      const data = await res.json();
      let rate = Number(data?.iva_rate ?? 0.15);
      if (rate > 1) rate = rate / 100;
      setVatRate(rate);
    } catch {}
  }

  async function cargarCategorias() {
    try {
      const res = await fetchWithAuth('/categories');
      const data = await res.json();
      setCategorias(data);
    } catch (err) {
      setError('Error al cargar categorías');
    }
  }

  async function cargarDatos() {
    try {
      setGuardando(true);
      const res = await fetchWithAuth('/products');
      const data = await res.json();
      const productosList = Array.isArray(data) ? data : data?.productos ?? data?.data ?? [];

      const productosTransformados = productosList.map(p => {
        const precioSinIva = Number(p.selling_price) || 0;
        const ivaPorcentaje = Number(p.is_taxable) || 0;          
        const ivaPorUnidad = Number(p.tax_rate); 
        const precioConIva = Number(p.precioSinIva + p.ivaPorUnidad);

        return {
          ...p,
          id: p.id,
          name: p.name,
          selling_price: precioSinIva,
          unit_cost: Number(p.unit_cost) || 0,
          stock: Number(p.stock) || 0,
          is_taxable: ivaPorcentaje,           // porcentaje (ej. 15)
          tax_rate: ivaPorUnidad,              // monto de IVA por unidad (para cálculos internos)
          tax_percent: ivaPorcentaje,           // ← NUEVO: porcentaje para enviar al backend
          code: p.code || p.barcode || p.sku || '', // ← NUEVO: guardar el código
          price: precioConIva,
        };
      });

      setProductos(productosTransformados);
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

    const cantidad = parseInt(cantidadItem, 10);
    const precioSinIva = Number(productoSeleccionado.selling_price) || 0;
    const ivaPorcentaje = Number(productoSeleccionado.is_taxable) || 0; // ← porcentaje
    const ivaPorUnidad = Number(productoSeleccionado.tax_rate) || 0;

    const subtotalBase = redondear(precioSinIva * cantidad);
    const ivaTotal = redondear(ivaPorUnidad * cantidad);
    const lineTotal = redondear(subtotalBase + ivaTotal);

    // Extras: también usan su propio tax_rate (monto de IVA por unidad)
    const extrasGuardados = extrasItem.map(e => {
      const price = Number(e.selling_price) || 0;
      const percent = Number(e.is_taxable) || 0;          // ← porcentaje (ej. 15)
      const ivaPorUnidad = Number(e.tax_rate) || 0; 
      return {
        ...e,
        selling_price: price,
        tax_percent: percent,
        tax_rate: percent,                                // ← ahora es el porcentaje
        iva_amount: redondear(ivaPorUnidad * cantidad),   // monto total de IVA
      };
    });

    const nuevoItem = {
      id: Date.now(),
      nombre: productoSeleccionado.name,
      product_id: productoSeleccionado.id,
      product_name: productoSeleccionado.name,

      unit_price: precioSinIva,
      tax_rate: ivaPorcentaje,
      iva_amount: ivaTotal,
      line_total: lineTotal,

      subtotal_base: subtotalBase,
      iva: ivaTotal,
      total: lineTotal,
      line_total_base: subtotalBase,
      line_iva: ivaTotal,

      quantity: cantidad,
      notas: notasItem,
      extras: extrasGuardados,
    };

    setItems(prev => [...prev, nuevoItem]);
    setShowAddItemModal(false);
    setProductoSeleccionado(null);
    setCantidadItem(1);
    setNotasItem('');
    setExtrasItem([]);
    setError('');
  }

  function abrirEditarItem(item) {
    const producto = productos.find(
      p => p.id === item.product_id
    );

    // ─────────────────────────────────────────────
    // Recuperar producto principal
    // ─────────────────────────────────────────────
    if (producto) {
      setProductoSeleccionado({
        ...producto,
        selling_price: Number(producto.selling_price) || 0,
        tax_rate: Number(producto.tax_rate) || 0,
        is_taxable: Number(producto.is_taxable) || 0,
      });
    } else {
      const unitPrice = Number(item.unit_price) || 0;
      const ivaUnit = Number(item.tax_rate) || 0;

      setProductoSeleccionado({
        id: item.product_id,
        name: item.product_name,
        selling_price: unitPrice,
        tax_rate: ivaUnit,
        is_taxable: 0,
        category_name: item.category_name || '',
      });
    }

    // ─────────────────────────────────────────────
    // Cantidad y notas
    // ─────────────────────────────────────────────
    setCantidadItem(Number(item.quantity) || 1);
    setNotasItem(item.notas || '');

    // ─────────────────────────────────────────────
    // IMPORTANTE:
    // Los extras se recuperan nuevamente desde
    // productos para tener sus datos originales.
    // ─────────────────────────────────────────────
    const extrasOriginales = (item.extras || []).map(extra => {
      const extraId = extra.id || extra.product_id;
      const productoExtra = productos.find(p => p.id === extraId);

      if (productoExtra) {
        return {
          ...productoExtra,
          selling_price: Number(productoExtra.selling_price) || 0,
          tax_rate: Number(productoExtra.tax_rate) || 0,
          is_taxable: Number(productoExtra.is_taxable) || 0,
          iva_amount: Number(extra.iva_amount) || 0,
          price: (Number(productoExtra.selling_price) || 0) + (Number(productoExtra.tax_rate) || 0),
        };
      }

      // Fallback
      return {
        ...extra,
        selling_price: Number(extra.selling_price) || 0,
        tax_rate: Number(extra.tax_rate) || 0,
        is_taxable: Number(extra.is_taxable) || 0,
        iva_amount: Number(extra.iva_amount) || 0,
        price: (Number(extra.selling_price) || 0) + (Number(extra.tax_rate) || 0),
      };
    });

    setExtrasItem(extrasOriginales);

    // ─────────────────────────────────────────────
    // Guardar referencia del item que se está editando
    // ─────────────────────────────────────────────
    setItemEditando(item);
    setShowEditItemModal(true);
  }


  function guardarEdicionItem() {
    if (!productoSeleccionado || cantidadItem <= 0) {
      setError('Selecciona un producto y cantidad válida');
      return;
    }

    const cantidad = parseInt(cantidadItem, 10);

    // ─────────────────────────────────────────────
    // Producto principal
    // ─────────────────────────────────────────────
    const precioSinIva = Number(productoSeleccionado.selling_price) || 0;
    const ivaPorcentaje = Number(productoSeleccionado.is_taxable) || 0;
    const ivaPorUnidad = Number(productoSeleccionado.tax_rate) || 0;
    const subtotalBase = redondear(precioSinIva * cantidad);
    const ivaTotal = redondear(ivaPorUnidad * cantidad);
    const lineTotal = redondear(subtotalBase + ivaTotal);

    // ─────────────────────────────────────────────
    // EXACTAMENTE LA MISMA LÓGICA DE agregarItem()
    // ─────────────────────────────────────────────
    const extrasGuardados = extrasItem.map(e => {
    const price = Number(e.selling_price) || 0;
    // Tomamos el porcentaje desde is_taxable o tax_percent (prioridad)
    const percent = Number(e.is_taxable) || Number(e.tax_percent) || 0;
    // Calculamos el monto de IVA por unidad a partir del precio y el porcentaje
    const ivaPorUnidadExtra = redondear(price * (percent / 100));
    return {
      ...e,
      selling_price: price,
      tax_percent: percent,               // guardamos el porcentaje
      tax_rate: ivaPorUnidadExtra,        // ← siempre el monto calculado
      iva_amount: redondear(ivaPorUnidadExtra * cantidad),
    };
  });

    // ─────────────────────────────────────────────
    // Reconstruir el item
    // ─────────────────────────────────────────────
    const itemActualizado = {
      ...itemEditando,
      id: itemEditando.id,
      nombre: productoSeleccionado.name,
      product_id: productoSeleccionado.id,
      product_name: productoSeleccionado.name,
      unit_price: precioSinIva,
      tax_rate: ivaPorcentaje,
      iva_amount: ivaTotal,
      line_total: lineTotal,
      subtotal_base: subtotalBase,
      iva: ivaTotal,
      total: lineTotal,
      line_total_base: subtotalBase,
      line_iva: ivaTotal,
      quantity: cantidad,
      notas: notasItem,
      extras: extrasGuardados,
    };

    // ─────────────────────────────────────────────
    // Reemplazar solamente el item editado
    // ─────────────────────────────────────────────
    setItems(prev =>
      prev.map(item =>
        item.id === itemEditando.id
          ? itemActualizado
          : item
      )
    );

    // ─────────────────────────────────────────────
    // Limpiar edición
    // ─────────────────────────────────────────────
    setShowEditItemModal(false);
    setItemEditando(null);
    setProductoSeleccionado(null);
    setCantidadItem(1);
    setNotasItem('');
    setExtrasItem([]);
    setError('');
  }

  const eliminarItem = itemId => setItems(prev => prev.filter(i => i.id !== itemId));

  // ── Totales (sumando base + extras, redondeados) ──────────────────────
  const subtotalBase = useMemo(() => {
    const total = items.reduce((acc, item) => {
      const baseSubtotal = Number(item.subtotal_base) || 0;
      const extrasSubtotal = (item.extras || []).reduce(
        (sum, extra) => sum + (Number(extra.selling_price) || 0) * (Number(item.quantity) || 1),
        0
      );
      return acc + baseSubtotal + extrasSubtotal;
    }, 0);
    return redondear(total);
  }, [items]);

  const ivaTotal = useMemo(() => {
    const total = items.reduce((acc, item) => {
      const baseIVA = Number(item.iva_amount) || 0;
      const extrasIVA = (item.extras || []).reduce(
        (sum, extra) => sum + (Number(extra.iva_amount) || 0),
        0
      );
      return acc + baseIVA + extrasIVA;
    }, 0);
    return redondear(total);
  }, [items]);

  const totalConIva = useMemo(() => redondear(subtotalBase + ivaTotal), [subtotalBase, ivaTotal]);
  const ivaLabel = useMemo(() => `${Math.round((vatRate || 0) * 100)}%`, [vatRate]);

  // ── GUARDAR ORDEN ─────────────────────────────────────────────────────────
  async function guardarOrden() {
    if (guardando || isSendingRef.current) return;

    if (orderType === 'dine_in' && !numeroMesa) {
      setError('Debe ingresar un número de mesa');
      return;
    }

    if (items.length === 0) {
      setError('Debe agregar al menos un ítem');
      return;
    }

    isSendingRef.current = true;
    setGuardando(true);
    setError('');
    setSuccess('');

    try {
      const clienteId = null;

      const itemsFormateados = items.flatMap(item => {
        const quantity = Number(item.quantity) || 1;
        const unitPrice = Number(item.unit_price) || 0;
        const ivaUnit = Number(item.tax_rate) || 0; // monto de IVA por unidad
        const subtotalBase = Number(item.subtotal_base) || 0;
        const ivaMonto = Number(item.iva_amount) || 0;
        const totalConIva = Number(item.line_total) || 0;

        const baseItem = {
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: quantity,
          unit_price: unitPrice,
          subtotal_base: subtotalBase,
          line_total_base: subtotalBase,
          line_total: Number(item.is_taxable),
          tax_rate: ivaUnit,              // ← guardamos el monto de IVA por unidad
          iva_amount: ivaMonto,
          notes: item.notas || null,
        };

        const extraItems = (item.extras || []).map(e => {
          const extraQty = quantity;
          const extraPrice = Number(e.selling_price) || 0;
          const extraPercent = Number(e.tax_rate) || 0;        // ← ahora es el porcentaje (15)
          const extraIvaUnit = redondear(extraPrice * (extraPercent / 100));
          const extraBase = redondear(extraPrice * extraQty);
          const extraIva = redondear(extraIvaUnit * extraQty);
          return {
            product_id: e.id || e.product_id,
            product_name: e.name || 'Extra',
            quantity: extraQty,
            unit_price: extraPrice,
            subtotal_base: extraBase,
            line_total_base: extraBase,
            line_total: redondear(extraBase + extraIva),
            tax_rate: extraPercent,        // ← enviamos el porcentaje
            iva_amount: extraIva,          // ← monto total de IVA
            notes: `__EXT__: + ${e.name}${e.nota ? ': ' + e.nota : ''}`,
          };

        });

        return [baseItem, ...extraItems];
      });

      let subtotalTotal = 0, ivaTotal = 0, totalGeneral = 0;
      itemsFormateados.forEach(item => {
        subtotalTotal += Number(item.subtotal_base) || 0;
        ivaTotal += Number(item.iva_amount) || 0;
        totalGeneral += Number(item.line_total) || 0;
      });

      subtotalTotal = redondear(subtotalTotal);
      ivaTotal = redondear(ivaTotal);
      totalGeneral = redondear(totalGeneral);

      const res = await fetchWithAuth('/ordenes', {
        method: 'POST',
        body: JSON.stringify({
          numero_mesa: orderType === 'dine_in' ? parseInt(numeroMesa, 10) : null,
          mesa_id: mesaId || null,
          cliente_id: clienteId,
          items: itemsFormateados,
          notas: notas || '',
          order_type: orderType,
          subtotal: subtotalTotal,
          iva_amount: ivaTotal,
          total: totalGeneral,
        }),
      });

      if (res.status === 409) {
        const errData = await res.json();
        setError(`${errData.error || 'Conflicto al generar número de orden'}`);
        setTimeout(() => {
          setError('');
          setGuardando(false);
          isSendingRef.current = false;
        }, 5000);
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al guardar orden');
      }

      const data = await res.json();
      const orderNumber = data?.pedido?.numero_pedido || data?.pedido?.order_number || '';

      setSuccess(`Orden ${orderNumber} guardada`);

      setTimeout(() => {
        setNumeroMesa('');
        setMesaId('');
        setNotas('');
        setOrderType('dine_in');
        setItems([]);
        setShowAddItemModal(false);
        setShowEditItemModal(false);
        setProductoSeleccionado(null);
        setCantidadItem(1);
        setNotasItem('');
        setItemEditando(null);
        setExtrasItem([]);
        setSuccess('');
        setError('');
        setGuardando(false);
        isSendingRef.current = false;
      }, 2500);

    } catch (err) {
      setError(err?.message || 'Error al guardar orden');
      setTimeout(() => {
        setError('');
        setGuardando(false);
        isSendingRef.current = false;
      }, 5000);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <PageTemplate title="Nueva orden" subtitle="Tomar órdenes y enviar a cocina">
      <div className="takeorder-shell">
        {error && (
          <div className="alert alert-error">
            <FiX size={16} />
            {error}
          </div>
        )}
        {success && (
          <div className="alert alert-success">
            <FiShoppingCart size={16} />
            {success}
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
            notas={notas}
            setNotas={setNotas}
          />
          <ItemsSection
            items={items}
            eliminarItem={eliminarItem}
            abrirEditarItem={abrirEditarItem}
            setShowAddItemModal={setShowAddItemModal}
            subtotal={subtotalBase}
            ivaAmount={ivaTotal}
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