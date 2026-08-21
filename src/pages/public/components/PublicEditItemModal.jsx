// components/PublicEditItemModal.jsx
import React, { useState, useMemo } from 'react';
import { FiX, FiPlus, FiMinus } from 'react-icons/fi';

export default function PublicEditItemModal({ 
  showModal, 
  setShowModal, 
  productos, 
  itemEditando,
  guardarEdicion,
  categorias 
}) {
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [notas, setNotas] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');

  // Cargar datos del item cuando se abre el modal
  React.useEffect(() => {
    if (itemEditando && showModal) {
      setProductoSeleccionado({
        id: itemEditando.product_id,
        name: itemEditando.nombre,
        selling_price: itemEditando.selling_price,
        tax_rate: itemEditando.tax_rate,
      });
      setCantidad(itemEditando.cantidad);
      setNotas(itemEditando.notas || '');
    }
  }, [itemEditando, showModal]);

  const productosFiltrados = useMemo(() => {
    if (!categoriaSeleccionada) return productos;
    return productos.filter(p => p.category_id === parseInt(categoriaSeleccionada));
  }, [productos, categoriaSeleccionada]);

  const handleGuardar = () => {
    if (!productoSeleccionado) return;
    guardarEdicion({
      ...itemEditando,
      productoSeleccionado,
      cantidad,
      notas
    });
    setShowModal(false);
  };

  if (!showModal) return null;

  return (
    <div className="public-modal-overlay" onClick={() => setShowModal(false)}>
      <div className="public-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="public-modal-header">
          <h3>Editar producto</h3>
          <button className="public-modal-close" onClick={() => setShowModal(false)}>
            <FiX size={20} />
          </button>
        </div>

        <div className="public-modal-body">
          <div className="public-modal-field">
            <label>Categoría</label>
            <select
              value={categoriaSeleccionada}
              onChange={(e) => setCategoriaSeleccionada(e.target.value)}
              className="public-modal-select"
            >
              <option value="">Todas las categorías</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="public-modal-field">
            <label>Producto</label>
            <select
              value={productoSeleccionado?.id || ''}
              onChange={(e) => {
                const product = productos.find(p => p.id === parseInt(e.target.value));
                setProductoSeleccionado(product);
              }}
              className="public-modal-select"
            >
              <option value="">Selecciona un producto</option>
              {productosFiltrados.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} - ${p.selling_price.toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <div className="public-modal-field">
            <label>Cantidad</label>
            <div className="public-cantidad-control">
              <button 
                className="public-qty-btn"
                onClick={() => setCantidad(Math.max(1, cantidad - 1))}
              >
                <FiMinus size={16} />
              </button>
              <span className="public-qty-display">{cantidad}</span>
              <button 
                className="public-qty-btn"
                onClick={() => setCantidad(cantidad + 1)}
              >
                <FiPlus size={16} />
              </button>
            </div>
          </div>

          <div className="public-modal-field">
            <label>Notas (opcional)</label>
            <input
              type="text"
              placeholder="Ej: Sin cebolla"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="public-modal-input"
            />
          </div>
        </div>

        <div className="public-modal-footer">
          <button 
            className="public-modal-btn public-cancel-btn"
            onClick={() => setShowModal(false)}
          >
            Cancelar
          </button>
          <button 
            className="public-modal-btn public-confirm-btn"
            onClick={handleGuardar}
            disabled={!productoSeleccionado}
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}