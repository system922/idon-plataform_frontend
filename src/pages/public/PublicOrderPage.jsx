// PublicOrderPage.jsx
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { 
  FiX, FiCheck, FiAlertCircle, FiPlus, FiMapPin, 
  FiPhone, FiChevronDown, FiChevronRight, FiShoppingCart 
} from 'react-icons/fi';
import PublicAddItemModal from './components/PublicAddItemModal';
import PublicEditItemModal from './components/PublicEditItemModal';
import { fetchWithAuth } from '../../config/api';  
import '../../styles/PublicOrder.css';

export default function PublicOrderPage() {
  const { slug } = useParams();
  const isSendingRef = useRef(false);

  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [negocio, setNegocio] = useState(null);
  const [items, setItems] = useState([]);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteDireccion, setClienteDireccion] = useState('');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [vatRate, setVatRate] = useState(0.15);
  const [featureActive, setFeatureActive] = useState(true);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [itemEditando, setItemEditando] = useState(null);
  const [orderType, setOrderType] = useState('takeaway');
  const [numeroMesa, setNumeroMesa] = useState('');
  const [mesaId, setMesaId] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidadItem, setCantidadItem] = useState(1);
  const [notasItem, setNotasItem] = useState('');

  // ── Estado para categorías expandidas ──────────────────────────────────
  const [categoriasExpandidas, setCategoriasExpandidas] = useState({});

  // ── Carga de datos ──────────────────────────────────────────────────────
  useEffect(() => {
    cargarDatos();
  }, [slug]);

  async function cargarDatos() {
    try {
      setLoading(true);
      setError('');

      // ✅ Sin /api
      const resNegocio = await fetchWithAuth(`/public/business/${slug}`);
      
      if (resNegocio.status === 403) {
        const data = await resNegocio.json();
        setFeatureActive(false);
        setError(data.error || 'Esta funcionalidad no está activa para este negocio');
        setLoading(false);
        return;
      }
      
      if (!resNegocio.ok) {
        throw new Error('Negocio no encontrado');
      }
      
      const dataNegocio = await resNegocio.json();
      setNegocio(dataNegocio.business);
      setFeatureActive(true);

      const tenant = dataNegocio.business.schema_name;
      
      // ✅ Sin /api
      const resCat = await fetchWithAuth(`/public/categories?tenant=${tenant}`);
      if (!resCat.ok) {
        throw new Error('Error al cargar categorías');
      }
      const dataCat = await resCat.json();
      // Filtrar categoría "Extras"
      const categoriasFiltradas = dataCat.filter(cat => 
        cat.name.toLowerCase() !== 'extras' && 
        cat.name.toLowerCase() !== 'extra'
      );
      setCategorias(categoriasFiltradas);
      
      // Inicializar todas las categorías como expandidas
      const expandidas = {};
      categoriasFiltradas.forEach(cat => {
        expandidas[cat.id] = true;
      });
      setCategoriasExpandidas(expandidas);

      // ✅ Sin /api
      const resProd = await fetchWithAuth(`/public/products?tenant=${tenant}`);
      if (!resProd.ok) {
        throw new Error('Error al cargar productos');
      }
      const dataProd = await resProd.json();
      const productosList = Array.isArray(dataProd) ? dataProd : dataProd?.productos ?? dataProd?.data ?? [];
      
      const productosTransformados = productosList.map(p => ({
        ...p,
        id: p.id,
        name: p.name,
        selling_price: Number(p.selling_price) || 0,
        tax_rate: Number(p.tax_rate) || 0,
        price: (Number(p.selling_price) || 0) + (Number(p.tax_rate) || 0),
        stock: Number(p.stock) || 0,
        category_id: p.category_id,
      }));
      
      setProductos(productosTransformados);

      // ✅ Sin /api
      const resIva = await fetchWithAuth(`/public/fiscal-rates?tenant=${tenant}`);
      if (resIva.ok) {
        const dataIva = await resIva.json();
        let rate = Number(dataIva?.iva_rate ?? 0.15);
        if (rate > 1) rate = rate / 100;
        setVatRate(rate);
      }

    } catch (err) {
      console.error('Error al cargar datos:', err);
      setError('Error al cargar el menú. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  // ── Toggle categoría ────────────────────────────────────────────────────
  const toggleCategoria = (categoriaId) => {
    setCategoriasExpandidas(prev => ({
      ...prev,
      [categoriaId]: !prev[categoriaId]
    }));
  };

  // ── Productos agrupados por categoría ──────────────────────────────────
  const productosPorCategoria = useMemo(() => {
    const grouped = {};
    categorias.forEach(cat => {
      grouped[cat.id] = {
        ...cat,
        productos: productos.filter(p => p.category_id === cat.id)
      };
    });
    return grouped;
  }, [categorias, productos]);

  // ── Items ─────────────────────────────────────────────────────────────────

  function agregarAlCarrito(producto) {
    setItems(prev => {
      const existente = prev.find(item => item.id === producto.id);
      if (existente) {
        return prev.map(item =>
          item.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      return [{ 
        ...producto, 
        cantidad: 1,
        nombre: producto.name,
        product_id: producto.id,
        product_name: producto.name,
        quantity: 1,
        unit_selling_price: producto.selling_price,
        unit_tax_rate: producto.tax_rate,
      }, ...prev];
    });
  }

  function agregarItemModal(producto, cantidad, notasItem) {
    const sellingPrice = Number(producto.selling_price) || 0;
    const taxRate = Number(producto.tax_rate) || 0;
    
    const nuevoItem = {
      id: Date.now(),
      nombre: producto.name,
      selling_price: sellingPrice,
      tax_rate: taxRate,
      cantidad: cantidad,
      notas: notasItem,
      product_id: producto.id,
      product_name: producto.name,
      quantity: cantidad,
      unit_selling_price: sellingPrice,
      unit_tax_rate: taxRate,
    };

    setItems(prev => [...prev, nuevoItem]);
  }

  function eliminarItem(itemId) {
    setItems(prev => prev.filter(item => item.id !== itemId));
  }

  function abrirEditarItem(item) {
    setItemEditando(item);
    setShowEditItemModal(true);
  }

  function guardarEdicionItem({ productoSeleccionado, cantidad, notas }) {
    const sellingPrice = Number(productoSeleccionado.selling_price) || 0;
    const taxRate = Number(productoSeleccionado.tax_rate) || 0;

    const itemActualizado = {
      ...itemEditando,
      nombre: productoSeleccionado.name,
      selling_price: sellingPrice,
      tax_rate: taxRate,
      cantidad: cantidad,
      notas: notas,
      product_id: productoSeleccionado.id,
      product_name: productoSeleccionado.name,
      quantity: cantidad,
      unit_selling_price: sellingPrice,
      unit_tax_rate: taxRate,
    };

    setItems(prev => prev.map(item =>
      item.id === itemEditando.id ? itemActualizado : item
    ));

    setShowEditItemModal(false);
    setItemEditando(null);
  }

  // ── Totales ─────────────────────────────────────────────────────────────
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.selling_price * item.cantidad), 0);
  }, [items]);

  const ivaTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.tax_rate * item.cantidad), 0);
  }, [items]);

  const total = useMemo(() => subtotal + ivaTotal, [subtotal, ivaTotal]);
  const ivaLabel = useMemo(() => `${Math.round((vatRate || 0) * 100)}%`, [vatRate]);

  // ── Guardar orden ──────────────────────────────────────────────────────
  async function guardarOrden() {
    if (isSendingRef.current || guardando) return;

    if (!clienteNombre.trim()) {
      setError('Por favor, ingresa tu nombre');
      setTimeout(() => setError(''), 5000);
      return;
    }

    if (!clienteTelefono.trim()) {
      setError('Por favor, ingresa tu teléfono');
      setTimeout(() => setError(''), 5000);
      return;
    }

    if (!clienteDireccion.trim()) {
      setError('Por favor, ingresa tu dirección');
      setTimeout(() => setError(''), 5000);
      return;
    }

    if (items.length === 0) {
      setError('Agrega al menos un producto');
      setTimeout(() => setError(''), 5000);
      return;
    }

    isSendingRef.current = true;
    setGuardando(true);
    setError('');
    setSuccess('');

    try {
      const notasCompletas = `Cliente: ${clienteNombre}\nTeléfono: ${clienteTelefono}\nDirección: ${clienteDireccion}\n${notas ? `\nNotas adicionales: ${notas}` : ''}`;

      const itemsFormateados = items.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.cantidad,
        unit_price: item.selling_price,
        line_total: item.selling_price * item.cantidad,
        tax_rate: item.tax_rate,
        iva_amount: item.tax_rate * item.cantidad,
        notes: item.notas || '',
      }));

      const payload = {
        tenant: negocio.schema_name,
        business_id: negocio.id,
        items: itemsFormateados,
        notas: notasCompletas,
        order_type: 'takeaway',
        vat_rate: vatRate,
        iva_percentage: vatRate * 100,
        iva_amount: ivaTotal,
        subtotal: subtotal,
        total: total,
        cliente_nombre: clienteNombre,
        cliente_telefono: clienteTelefono,
      };

      // ✅ Sin /api
      const res = await fetchWithAuth('/public/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.status === 403) {
        const err = await res.json();
        throw new Error(err.error || 'El negocio no tiene activa la funcionalidad de órdenes por QR');
      }

      if (res.status === 409) {
        const errData = await res.json();
        setError(`⚠️ ${errData.error || 'Conflicto al generar número de orden'}`);
        setTimeout(() => setError(''), 5000);
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al enviar pedido');
      }

      const data = await res.json();
      const orderNumber = data?.pedido?.numero_pedido || data?.pedido?.order_number || '';

      setSuccess(`✅ ¡Pedido #${orderNumber} recibido! Te confirmaremos en breve.`);

      setTimeout(() => {
        setItems([]);
        setClienteNombre('');
        setClienteTelefono('');
        setClienteDireccion('');
        setNotas('');
        setMesaId('');
        setSuccess('');
        setError('');
      }, 5000);

    } catch (err) {
      setError(err?.message || 'Error al enviar pedido');
      setTimeout(() => setError(''), 5000);
    } finally {
      setGuardando(false);
      isSendingRef.current = false;
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="public-order-page">
        <div className="public-loading-spinner">Cargando menú...</div>
      </div>
    );
  }

  if (error && !featureActive) {
    return (
      <div className="public-order-page">
        <div className="public-error-state">
          <FiAlertCircle size={48} className="public-error-icon" />
          <h2>⚠️ Funcionalidad no disponible</h2>
          <p>{error}</p>
          <p className="public-error-sub">
            Este negocio no tiene activa la funcionalidad de órdenes por QR.
            <br />
            Contacta al administrador para más información.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="public-order-page">
        <div className="public-error-state">
          <h2>⚠️ {error}</h2>
          <p>El negocio no está disponible o no existe.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="public-order-page">
      <div className="public-order-shell">
        {/* Header del negocio estilo KFC */}
        <div className="public-business-header">
          <div className="public-business-header-content">
            <div className="public-business-logo-container">
              {negocio?.logo_url ? (
                <img 
                  src={negocio.logo_url} 
                  alt={negocio.name} 
                  className="public-business-logo"
                />
              ) : (
                <div className="public-business-logo-placeholder">🏪</div>
              )}
            </div>
            <h1 className="public-business-name">{negocio?.name || 'Menú Digital'}</h1>
            <p className="public-business-subtitle">Elige tus productos favoritos</p>
            
            {/* Información del negocio */}
            <div className="public-business-contact">
              {negocio?.address && (
                <span className="public-business-contact-item">
                  <FiMapPin size={14} />
                  {negocio.address}
                </span>
              )}
              {negocio?.phone && (
                <span className="public-business-contact-item">
                  <FiPhone size={14} />
                  {negocio.phone}
                </span>
              )}
              {negocio?.ruc && (
                <span className="public-business-contact-item public-business-ruc">
                  RUC: {negocio.ruc}
                </span>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="public-alert public-alert-error">
            <FiX size={16} />
            {error}
          </div>
        )}
        {success && (
          <div className="public-alert public-alert-success">
            <FiCheck size={16} />
            {success}
          </div>
        )}

        <div className="public-order-grid">
          {/* Columna izquierda: Menú en Acordeón */}
          <div className="public-left-column">
            {/* Datos del cliente compactos */}
            <div className="public-cliente-compact">
              <p style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>CLIENTE</p>
              <input
                type="text"
                placeholder="Ej: Carlos Pérez"
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                className="public-cliente-input"
              />
              <p style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>TELÉFONO</p>
              <input
                type="text"
                placeholder="Ej: 0987654321"
                value={clienteTelefono}
                onChange={(e) => setClienteTelefono(e.target.value)}
                className="public-cliente-input"
              />
              <p style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>DIRECCIÓN</p>
              <input
                type="text"
                placeholder="Ej: Av. 12 de Octubre y Río Amazonas"
                value={clienteDireccion}
                onChange={(e) => setClienteDireccion(e.target.value)}
                className="public-cliente-input"
              />
              <p style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>NOTAS</p>
              <textarea
                placeholder="ej: Sin cebolla, por favor"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="public-notas-input"
                rows="2"
              />
            </div>

            {/* Menú de productos en Acordeón estilo KFC */}
            <div className="public-menu-section">
              <div className="public-menu-header">
                <h3 className="public-menu-title">Nuestro Menú</h3>
                <span className="public-menu-count">
                  {Object.values(productosPorCategoria).reduce((acc, cat) => acc + cat.productos.length, 0)} productos
                </span>
              </div>
              
              {Object.values(productosPorCategoria).map(categoria => {
                const tieneProductos = categoria.productos.length > 0;
                const isExpanded = categoriasExpandidas[categoria.id] !== false;
                
                if (!tieneProductos) return null;
                
                return (
                  <div key={categoria.id} className="public-menu-categoria">
                    <button
                      className="public-categoria-header"
                      onClick={() => toggleCategoria(categoria.id)}
                    >
                      <span className="public-categoria-header-left">
                        {isExpanded ? (
                          <FiChevronDown className="public-categoria-icon" size={18} />
                        ) : (
                          <FiChevronRight className="public-categoria-icon" size={18} />
                        )}
                        <span className="public-categoria-title">{categoria.name}</span>
                      </span>
                      <span className="public-categoria-count">
                        {categoria.productos.length}
                      </span>
                    </button>
                    
                    {isExpanded && (
                      <div className="public-categoria-body">
                        {categoria.productos.map(producto => (
                          <div key={producto.id} className="public-producto-card">
                            <div className="public-producto-info">
                              <span className="public-producto-nombre">{producto.name}</span>
                              <span className="public-producto-precio">${producto.selling_price.toFixed(2)}</span>
                            </div>
                            <button
                              className="public-producto-add-btn"
                              onClick={() => agregarAlCarrito(producto)}
                              title="Agregar al carrito"
                            >
                              <FiPlus size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {Object.values(productosPorCategoria).every(cat => cat.productos.length === 0) && (
                <p className="public-no-products">No hay productos disponibles</p>
              )}
            </div>
          </div>

          {/* Columna derecha: Carrito estilo KFC */}
          <div className="public-right-column">
            <div className="public-cart-container">
              <div className="public-cart-header">
                <FiShoppingCart size={20} />
                <span className="public-cart-title">Mi Pedido</span>
                {items.length > 0 && (
                  <span className="public-cart-badge">{items.reduce((acc, item) => acc + item.cantidad, 0)}</span>
                )}
              </div>

              {items.length === 0 ? (
                <div className="public-cart-empty">
                  <FiShoppingCart size={48} />
                  <p>Tu carrito está vacío</p>
                  <span>Agrega tus productos favoritos</span>
                </div>
              ) : (
                <>
                  <div className="public-cart-items">
                    {items.map(item => (
                      <div key={item.id} className="public-cart-item">
                        <div className="public-cart-item-info">
                          <span className="public-cart-item-qty">{item.cantidad}x</span>
                          <span className="public-cart-item-name">{item.nombre}</span>
                        </div>
                        <div className="public-cart-item-actions">
                          <span className="public-cart-item-price">
                            ${(item.selling_price * item.cantidad).toFixed(2)}
                          </span>
                          <button
                            className="public-cart-item-remove"
                            onClick={() => eliminarItem(item.id)}
                          >
                            <FiX size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="public-cart-totales">
                    <div className="public-cart-total-line">
                      <span>Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="public-cart-total-line">
                      <span>IVA ({ivaLabel})</span>
                      <span>${ivaTotal.toFixed(2)}</span>
                    </div>
                    <div className="public-cart-total-line public-cart-grand-total">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>

                    <button
                      className="public-cart-checkout-btn"
                      onClick={guardarOrden}
                      disabled={guardando || items.length === 0}
                    >
                      {guardando ? 'Enviando...' : '📤 Realizar Pedido'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <PublicAddItemModal
          showModal={showAddItemModal}
          setShowModal={setShowAddItemModal}
          productos={productos}
          agregarItem={agregarItemModal}
          categorias={categorias}
        />

        <PublicEditItemModal
          showModal={showEditItemModal}
          setShowModal={setShowEditItemModal}
          productos={productos}
          itemEditando={itemEditando}
          guardarEdicion={guardarEdicionItem}
          categorias={categorias}
        />
      </div>
    </div>
  );
}