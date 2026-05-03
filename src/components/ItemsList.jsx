import React from 'react';
import { FiTrash2, FiEdit2 } from 'react-icons/fi';  // 👈 AGREGAR FiEdit2

export default function ItemsList({
  items,
  eliminarItem,
  abrirEditarItem  // 👈 NUEVA PROP
}) {
  return (
    <div className="items-body">
      {items.length === 0 ? (
        <div className="items-empty-panel">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.5 }}>📦</div>
            <div className="empty-desc">Haz clic en "Agregar item" para comenzar</div>
          </div>
        </div>
      ) : (
        <div className="items-list-modern">
          {items.map((item) => (
            <div key={item.id} className="item-row">
              <div className="item-main">
                <div className="item-name">{item.nombre}</div>
                <div className="item-meta">
                  ${(Number(item.precio) || 0).toFixed(2)} × {item.cantidad}
                  {item.notas ? ` • ${item.notas}` : ''}
                </div>
              </div>
              <div className="item-right">
                <div className="item-price">${(Number(item.subtotal) || 0).toFixed(2)}</div>
                <div className="item-actions">
                  <button
                    className="icon-btn edit-btn"
                    onClick={() => abrirEditarItem(item)}
                    title="Editar"
                    type="button"
                  >
                    <FiEdit2 size={16} />
                  </button>
                  <button
                    className="icon-btn delete-btn"
                    onClick={() => eliminarItem(item.id)}
                    title="Eliminar"
                    type="button"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}