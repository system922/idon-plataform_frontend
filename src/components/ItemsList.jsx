import React from 'react';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

export default function ItemsList({ items, eliminarItem, abrirEditarItem }) {
  if (!items || items.length === 0) {
    return (
      <div className="items-empty-panel">
        <div className="empty-state">
          <div className="empty-title">No hay items</div>
          <div className="empty-desc">Agrega productos a la orden</div>
        </div>
      </div>
    );
  }

  return (
    <div className="items-list-modern">
      {items.map((item, idx) => (
        <div key={item.id || idx} className="item-row">
          <div className="item-info">
            <div className="item-name">{item.cantidad}x {item.nombre}</div>
            <div className="item-meta">
              <span>${(item.precio || 0).toFixed(2)} c/u</span>
              {item.extras && item.extras.length > 0 && (
                <div className="item-extras">
                  {item.extras.map((extra, i) => (
                    <span key={i} className="item-extra-tag">+ {extra.name}</span>
                  ))}
                </div>
              )}
              {item.notas && <span className="item-note">📝 {item.notas}</span>}
            </div>
          </div>
          <div className="item-right">
            <div className="item-price">${(item.line_total || item.subtotal || 0).toFixed(2)}</div>
            <div className="item-actions">
              <button
                className="icon-btn edit-btn"
                onClick={() => abrirEditarItem(item)}
                title="Editar item"
              >
                <FiEdit2 size={16} />
              </button>
              <button
                className="icon-btn delete-btn"
                onClick={() => eliminarItem(item.id)}
                title="Eliminar item"
              >
                <FiTrash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}