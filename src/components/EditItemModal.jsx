import React, { useState } from 'react';
import '../styles/AddItemModal.css';  // Reusa el mismo CSS

export default function EditItemModal({
  showEditItemModal,
  setShowEditItemModal,
  productos,
  productoSeleccionado,
  setProductoSeleccionado,
  cantidadItem,
  setCantidadItem,
  notasItem,
  setNotasItem,
  guardarEdicionItem,
  categorias,
}) {
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');

  // Filtrar productos según la categoría seleccionada
  const productosFiltrados = categoriaSeleccionada
    ? productos.filter(p => p.category_name === categoriaSeleccionada)
    : productos;

  if (!showEditItemModal) return null;

  return (
    <div className="modal-overlay" onClick={() => setShowEditItemModal(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        
        <div className="modal-header">
          <h2>Editar item</h2>
          <p>Modifica el producto, cantidad o notas.</p>
        </div>

        <div className="modal-body">
          <div className="modal-form-grid">

            {/* CATEGORÍA */}
            <div className="field">
              <label>Categoría</label>
              <select
                value={categoriaSeleccionada}
                onChange={(e) => setCategoriaSeleccionada(e.target.value)}
              >
                <option value="">-- Selecciona una categoría --</option>
                {categorias && categorias.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* PRODUCTO */}
            <div className="field">
              <label>Producto</label>
              <select
                value={productoSeleccionado?.id || ''}
                onChange={(e) => {
                  const producto = productosFiltrados.find((p) => String(p.id) === String(e.target.value));
                  setProductoSeleccionado(producto || null);
                }}
              >
                <option value="">-- Selecciona --</option>
                {productosFiltrados.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* CANTIDAD */}
            <div className="field">
              <label>Cantidad</label>
              <div className="stepper">
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => setCantidadItem((v) => Math.max(1, parseInt(v, 10) - 1))}
                >
                  −
                </button>
                <input
                  className="stepper-input"
                  type="number"
                  min="1"
                  value={cantidadItem}
                  onChange={(e) => setCantidadItem(Math.max(1, parseInt(e.target.value, 10) || 1))}
                />
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => setCantidadItem((v) => parseInt(v, 10) + 1)}
                >
                  +
                </button>
              </div>
            </div>

            {/* PRECIO */}
            <div className="field">
              <label>Precio</label>
              <input
                type="text"
                value={productoSeleccionado ? `$ ${Number(productoSeleccionado.price || 0).toFixed(2)}` : ''}
                disabled
              />
            </div>

            {/* NOTAS */}
            <div className="field">
              <label>Notas</label>
              <textarea
                value={notasItem}
                onChange={(e) => setNotasItem(e.target.value)}
                placeholder="Sin picante, sin cebolla..."
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="btn btn-secondary" 
            onClick={() => setShowEditItemModal(false)} 
            type="button"
          >
            Cancelar
          </button>
          <button 
            className="btn btn-primary" 
            onClick={guardarEdicionItem} 
            disabled={!productoSeleccionado} 
            type="button"
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}