import React, { useEffect, useMemo, useState, useRef } from 'react';
import { FiPlus, FiSave, FiEdit2, FiTrash2, FiShoppingCart, FiX, FiLink, FiCopy } from 'react-icons/fi';
import PageTemplate from '../../components/PageTemplate';
import OrderHeader from '../../components/OrderHeader';
import ItemsSection from '../../components/ItemsSection';
import AddItemModal from '../../components/AddItemModal';
import EditItemModal from '../../components/EditItemModal';
import { fetchWithAuth } from '../../config/apiBase';

export default function OrdersQrPage() {
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
  const [orderType, setOrderType] = useState('qr');
  const [items, setItems] = useState([]);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidadItem, setCantidadItem] = useState(1);
  const [notasItem, setNotasItem] = useState('');
  const [itemEditando, setItemEditando] = useState(null);
  const [extrasItem, setExtrasItem] = useState([]);

  // ── Datos del cliente (QR) ──────────────────────────────────────────────
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');

  // ── Datos del negocio para el link QR ──────────────────────────────────
  const [businessSlug, setBusinessSlug] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [copied, setCopied] = useState(false);

  // ── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    cargarDatos();
    cargarIva();
    cargarCategorias();
    cargarNegocio();
  }, []);

  async function cargarNegocio() {
    try {
      // Obtener el slug del negocio desde el contexto o localStorage
      const user = JSON.parse(localStorage.getItem('idonUser') || '{}');
      const slug = user?.businessSlug || user?.slug || '';
      const name = user?.businessName || user?.name || '';
      
      setBusinessSlug(slug);
      setBusinessName(name);
    } catch (e) {
      console.log('Error cargando negocio:', e);
    }
  }

  async function cargarIva() {
    try {
      const res = await fetchWithAuth('/api/productos/fiscal-rates');
      if (!res.ok) return;
      const data = await res.json();
      let rate = Number(data?.iva_rate ?? 0.15);
      if (rate > 1) rate = rate / 100;
      setVatRate(rate);
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
      const res = await fetchWithAuth('/api/products');
      const data = await res.json();
      const productosList = Array.isArray(data) ? data : data?.productos ?? data?.data ?? [];
      
      const productosTransformados = productosList.map(p => ({
        ...p,
        id: p.id,
        name: p.name,
        selling_price: Number(p.selling_price) || 0,
        tax_rate: Number(p.tax_rate) || 0,
        unit_cost: Number(p.unit_cost) || 0,
        stock: Number(p.stock) || 0,
        is_taxable: p.is_taxable === true,
        price: (Number(p.selling_price) || 0) + (Number(p.tax_rate) || 0),
      }));
      
      setProductos(productosTransformados);
    } catch {
      setError('Error al cargar productos');
    } finally {
      setGuardando(false);
    }
  }

  // ── Copiar enlace ────────────────────────────────────────────────────────
  function copiarEnlace() {
    const url = `${window.location.origin}/${businessSlug}/qr`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  }

  // ── Items ─────────────────────────────────────────────────────────────────
  function agregarItem() {
    if (!productoSeleccionado || cantidadItem <= 0) {
      setError('Selecciona un producto y cantidad válida');
      return;
    }
    
    const sellingPrice = Number(productoSeleccionado.selling_price) || 0;
    const taxRate = Number(productoSeleccionado.tax_rate) || 0;
    const pvp = sellingPrice + taxRate;
    const cantidad = parseInt(cantidadItem, 10);
    
    const extrasSellingTotal = extrasItem.reduce((s, e) => s + (Number(e.selling_price) || 0), 0);
    const extrasTaxTotal = extrasItem.reduce((s, e) => s + (Number(e.tax_rate) || 0), 0);
    
    const subtotalBase = (sellingPrice + extrasSellingTotal) * cantidad;
    const ivaTotal = (taxRate + extrasTaxTotal) * cantidad;
    const totalConIva = subtotalBase + ivaTotal;

    const nuevoItem = {
      id: Date.now(),
      nombre: productoSeleccionado.name,
      selling_price: sellingPrice,
      tax_rate: taxRate,
      pvp: pvp,
      cantidad: cantidad,
      subtotal_base: subtotalBase,
      iva: ivaTotal,
      total: totalConIva,
      notas: notasItem,
      extras: extrasItem,
      product_id: productoSeleccionado.id,
      product_name: productoSeleccionado.name,
      quantity: cantidad,
      unit_selling_price: sellingPrice,
      unit_tax_rate: taxRate,
      line_total_base: subtotalBase,
      line_iva: ivaTotal,
      line_total: totalConIva,
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
    setItemEditando(item);
    setProductoSeleccionado({
      id: item.product_id,
      name: item.nombre,
      selling_price: item.selling_price,
      tax_rate: item.tax_rate,
      price: item.pvp,
    });
    setCantidadItem(item.cantidad);
    setNotasItem(item.notas || '');
    setExtrasItem(item.extras || []);
    setShowEditItemModal(true);
  }

  function guardarEdicionItem() {
    if (!productoSeleccionado || cantidadItem <= 0) {
      setError('Selecciona un producto y cantidad válida');
      return;
    }

    const sellingPrice = Number(productoSeleccionado.selling_price) || 0;
    const taxRate = Number(productoSeleccionado.tax_rate) || 0;
    const pvp = sellingPrice + taxRate;
    const cantidad = parseInt(cantidadItem, 10);
    
    const extrasSellingTotal = extrasItem.reduce((s, e) => s + (Number(e.selling_price) || 0), 0);
    const extrasTaxTotal = extrasItem.reduce((s, e) => s + (Number(e.tax_rate) || 0), 0);
    
    const subtotalBase = (sellingPrice + extrasSellingTotal) * cantidad;
    const ivaTotal = (taxRate + extrasTaxTotal) * cantidad;
    const totalConIva = subtotalBase + ivaTotal;

    const itemActualizado = {
      ...itemEditando,
      nombre: productoSeleccionado.name,
      selling_price: sellingPrice,
      tax_rate: taxRate,
      pvp: pvp,
      cantidad: cantidad,
      subtotal_base: subtotalBase,
      iva: ivaTotal,
      total: totalConIva,
      notas: notasItem,
      extras: extrasItem,
      product_id: productoSeleccionado.id,
      product_name: productoSeleccionado.name,
      quantity: cantidad,
      unit_selling_price: sellingPrice,
      unit_tax_rate: taxRate,
      line_total_base: subtotalBase,
      line_iva: ivaTotal,
      line_total: totalConIva,
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
  const subtotalBase = useMemo(() => {
    return items.reduce((s, i) => s + (Number(i.subtotal_base) || Number(i.line_total_base) || 0), 0);
  }, [items]);

  const ivaTotal = useMemo(() => {
    return items.reduce((s, i) => s + (Number(i.iva) || Number(i.line_iva) || 0), 0);
  }, [items]);

  const totalConIva = useMemo(() => subtotalBase + ivaTotal, [subtotalBase, ivaTotal]);
  const ivaLabel = useMemo(() => `${Math.round((vatRate || 0) * 100)}%`, [vatRate]);

  // ── GUARDAR ORDEN ─────────────────────────────────────────────────────────
  async function guardarOrden() {
    if (guardando || isSendingRef.current) {
      return;
    }

    if (!clienteNombre.trim()) {
      setError('Por favor, ingresa tu nombre');
      return;
    }
    if (!clienteTelefono.trim()) {
      setError('Por favor, ingresa tu teléfono');
      return;
    }

    if (items.length === 0) {
      setError('Debe agregar al menos un ítem');
      return;
    }

    isSendingRef.current = true;
    setGuardando(true);
    setError('');

    try {
      const itemsFormateados = items.flatMap(item => {
        const baseItem = {
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_selling_price,
          line_total: item.unit_selling_price * item.quantity,
          tax_rate: item.unit_tax_rate,
          iva_amount: item.unit_tax_rate * item.quantity,
          notes: item.notas || null,
        };

        const extraItems = (item.extras || []).map(e => ({
          product_id: e.id,
          product_name: e.name,
          quantity: item.quantity,
          unit_price: Number(e.selling_price) || 0,
          line_total: (Number(e.selling_price) || 0) * item.quantity,
          tax_rate: Number(e.tax_rate) || 0,
          iva_amount: (Number(e.tax_rate) || 0) * item.quantity,
          notes: `__EXT__: + ${e.name}${e.nota ? ': ' + e.nota : ''}`,
        }));

        return [baseItem, ...extraItems];
      });

      const res = await fetchWithAuth('/api/ordenes', {
        method: 'POST',
        body: JSON.stringify({
          numero_mesa: null,
          mesa_id: null,
          cliente_id: null,
          items: itemsFormateados,
          notas: `${notas}\n\n🧑 Cliente: ${clienteNombre}\n📱 Teléfono: ${clienteTelefono}`,
          order_type: 'qr',
          vat_rate: vatRate,
          iva_percentage: vatRate * 100,
          iva_amount: ivaTotal,
          subtotal: subtotalBase,
          total: totalConIva,
          cliente_nombre: clienteNombre,
          cliente_telefono: clienteTelefono,
        }),
      });

      if (res.status === 409) {
        const errData = await res.json();
        setError(`⚠️ ${errData.error || 'Conflicto al generar número de orden'}`);
        setTimeout(() => setError(''), 5000);
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al guardar orden');
      }

      const data = await res.json();
      const orderNumber = data?.pedido?.numero_pedido || data?.pedido?.order_number || '';

      setSuccess(`✅ Orden ${orderNumber} recibida. ¡Gracias por tu pedido!`);

      setTimeout(() => {
        setNumeroMesa('');
        setMesaId('');
        setNotas('');
        setClienteNombre('');
        setClienteTelefono('');
        setItems([]);
        setSuccess('');
        setError('');
      }, 3500);

    } catch (err) {
      setError(err?.message || 'Error al guardar orden');
      setTimeout(() => setError(''), 5000);
    } finally {
      setGuardando(false);
      isSendingRef.current = false;
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  // 🔥 Construir el enlace público
  const publicUrl = `${window.location.origin}/${businessSlug}/qr`;

  return (
    <PageTemplate title="📱 Menú Digital QR" subtitle="Escanea el código QR y realiza tu pedido">
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

        {/* 🔥 SECCIÓN DEL ENLACE PÚBLICO */}
        {businessSlug && (
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
            color: 'white'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FiLink size={20} />
                  <strong style={{ fontSize: '16px' }}>🔗 Enlace público de tu menú</strong>
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.15)',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  marginTop: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap'
                }}>
                  <code style={{
                    color: 'white',
                    fontSize: '14px',
                    wordBreak: 'break-all',
                    flex: 1
                  }}>
                    {publicUrl}
                  </code>
                  <button
                    onClick={copiarEnlace}
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      border: 'none',
                      color: 'white',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      transition: 'background 0.3s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
                    onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
                  >
                    <FiCopy size={14} />
                    {copied ? '✅ Copiado' : '📋 Copiar enlace'}
                  </button>
                </div>
                <p style={{ fontSize: '12px', opacity: 0.8, marginTop: '6px' }}>
                  💡 Comparte este enlace con tus clientes para que puedan hacer pedidos desde su celular
                </p>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.15)',
                padding: '8px 14px',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>Código QR</div>
                <div style={{ fontSize: '24px' }}>📱</div>
              </div>
            </div>
          </div>
        )}

        {/* 🔥 Datos del cliente para QR */}
        <div className="qr-cliente-info" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '20px',
          padding: '16px',
          background: '#f7fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <input
            type="text"
            placeholder="👤 Tu nombre"
            value={clienteNombre}
            onChange={(e) => setClienteNombre(e.target.value)}
            style={{
              padding: '10px 14px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '14px',
              width: '100%'
            }}
          />
          <input
            type="text"
            placeholder="📱 Tu teléfono"
            value={clienteTelefono}
            onChange={(e) => setClienteTelefono(e.target.value)}
            style={{
              padding: '10px 14px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '14px',
              width: '100%'
            }}
          />
        </div>

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
            buttonText={guardando ? 'Enviando...' : '📤 Enviar Pedido'}
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