// components/PublicItemsSection.jsx
import React, { useMemo } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiShoppingCart } from 'react-icons/fi';

export default function PublicItemsSection({ 
  items, 
  eliminarItem, 
  abrirEditarItem,
  setShowAddItemModal,
  subtotal,
  ivaAmount,
  totalConIva,
  ivaLabel,
  guardando,
  orderType,
  numeroMesa,
  guardarOrden,
  agregarAlCarrito,
  productosPorCategoria
}) {
  const totalItems = useMemo(() => {
    return items.reduce((sum, item) => sum + item.cantidad, 0);
  }, [items]);

  return (
    <div className="public-items-section">
      {/* Lista de items */}
      <div className="public-items-list-container">
        <div className="public-items-header">
          <h3>🛒 Productos seleccionados</h3>
          <span className="public-items-count">{totalItems} items</span>
        </div>

        {items.length === 0 ? (
          <div className="public-empty-items">
            <FiShoppingCart size={48} />
            <p>No hay productos seleccionados</p>
            <p className="public-empty-sub">Selecciona productos del menú para comenzar</p>
          </div>
        ) : (
          <div className="public-items-list">
            {items.map((item, index) => (
              <div key={item.id || index} className="public-item-row">
                <div className="public-item-info">
                  <span className="public-item-cantidad">{item.cantidad}x</span>
                  <span className="public-item-nombre">{item.name || item.nombre}</span>
                </div>
                <div className="public-item-actions">
                  <span className="public-item-precio">${(item.selling_price * item.cantidad).toFixed(2)}</span>
                  <button 
                    className="public-item-btn public-edit-btn"
                    onClick={() => abrirEditarItem(item)}
                    title="Editar"
                  >
                    <FiEdit2 size={14} />
                  </button>
                  <button 
                    className="public-item-btn public-delete-btn"
                    onClick={() => eliminarItem(item.id)}
                    title="Eliminar"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Totales */}
      <div className="public-totales-container">
        <div className="public-total-line">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="public-total-line">
          <span>IVA ({ivaLabel})</span>
          <span>${ivaAmount.toFixed(2)}</span>
        </div>
        <div className="public-total-line public-grand-total">
          <span>Total</span>
          <span>${totalConIva.toFixed(2)}</span>
        </div>
        <button
          className="public-send-order-btn"
          onClick={guardarOrden}
          disabled={guardando || items.length === 0}
        >
          {guardando ? '⏳ Enviando...' : '📤 Enviar Pedido'}
        </button>
      </div>
    </div>
  );
}