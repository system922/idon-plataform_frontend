import React, { useState } from 'react';
import '../styles/AddItemModal.css';

export default function AddItemModal({
  showAddItemModal,
  setShowAddItemModal,
  productos,
  productoSeleccionado,
  setProductoSeleccionado,
  cantidadItem,
  setCantidadItem,
  notasItem,
  setNotasItem,
  agregarItem,
  categorias,
  extrasItem,
  setExtrasItem,
}) {
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [extraSel,  setExtraSel ] = useState('');
  const [notaExtra, setNotaExtra] = useState('');

  const extrasProductos = productos.filter(p => p.category_name?.toLowerCase() === 'extras');
  const categoriasFiltradas = categorias.filter(c => c.name?.toLowerCase() !== 'extras');

  const productosFiltrados = categoriaSeleccionada
    ? productos.filter(p => p.category_name === categoriaSeleccionada)
    : productos.filter(p => p.category_name?.toLowerCase() !== 'extras');

  if (!showAddItemModal) return null;

  const handleClose = () => {
    setShowAddItemModal(false);
    setExtrasItem([]);
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="modal-header">
          <h2>Agregar item</h2>
          <p>Selecciona producto, cantidad y notas.</p>
        </div>

        {/* BODY - GRID 4 COLUMNAS */}
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
                {categoriasFiltradas && categoriasFiltradas.map((cat) => (
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

            {/* EXTRAS */}
            {extrasProductos.length > 0 && (
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Extras</label>
                <div className="extras-adder-row">
                  <select
                    className="extras-adder-sel"
                    value={extraSel}
                    onChange={e => setExtraSel(e.target.value)}
                  >
                    <option value="">— Selecciona un extra —</option>
                    {extrasProductos.map(ex => (
                      <option key={ex.id} value={ex.id}>{ex.name}</option>
                    ))}
                  </select>
                  <input
                    className="extras-adder-nota"
                    type="text"
                    placeholder="Nota del extra..."
                    value={notaExtra}
                    onChange={e => setNotaExtra(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && extraSel) e.currentTarget.closest('.extras-adder-row').querySelector('.extras-adder-btn').click();
                    }}
                  />
                  <button
                    type="button"
                    className="extras-adder-btn"
                    disabled={!extraSel}
                    onClick={() => {
                      const ex = extrasProductos.find(p => String(p.id) === extraSel);
                      if (!ex) return;
                      setExtrasItem(prev => [...prev, { id: ex.id, name: ex.name, nota: notaExtra.trim(), price: Number(ex.price) || 0, tax_rate: Number(ex.tax_rate) || 0 }]);
                      setExtraSel('');
                      setNotaExtra('');
                    }}
                  >
                    + Agregar
                  </button>
                </div>
                {extrasItem.length > 0 && (
                  <ul className="extras-added-list">
                    {extrasItem.map((e, i) => (
                      <li key={i} className="extras-added-item">
                        <span className="extras-added-name">+ {e.name}</span>
                        {e.price > 0 && <span className="extras-added-price">+${Number(e.price).toFixed(2)}</span>}
                        {e.nota && <span className="extras-added-nota"> — {e.nota}</span>}
                        <button
                          type="button"
                          className="extras-added-remove"
                          onClick={() => setExtrasItem(prev => prev.filter((_, j) => j !== i))}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* NOTAS */}
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Notas</label>
              <textarea
                value={notasItem}
                onChange={(e) => setNotasItem(e.target.value)}
                placeholder="Sin picante, sin cebolla..."
              />
            </div>
          </div>
        </div>

        {/* FOOTER - BOTONES JUNTOS */}
        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={handleClose}
            type="button"
          >
            Cancelar
          </button>
          <button 
            className="btn btn-primary" 
            onClick={agregarItem} 
            disabled={!productoSeleccionado} 
            type="button"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}