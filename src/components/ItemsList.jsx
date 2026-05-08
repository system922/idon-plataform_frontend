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
      {items.map((item, idx) => {
        // ✅ Calcular PVP unitario = selling_price + tax_rate (precio con IVA para mostrar)
        const unitPVP = (item.selling_price || 0) + (item.tax_rate || 0);
        // ✅ subtotal base (sin IVA) = selling_price × cantidad
        const subtotalBase = item.subtotal_base || item.line_total_base || (item.selling_price || 0) * (item.cantidad || 1);
        // ✅ IVA del item = tax_rate × cantidad
        const ivaItem = item.iva || item.line_iva || (item.tax_rate || 0) * (item.cantidad || 1);
        // ✅ Total del item = subtotalBase + ivaItem
        const totalItem = item.total || item.line_total || item.subtotal || (unitPVP * (item.cantidad || 1));

        return (
          <div key={item.id || idx} className="item-row">
            <div className="item-info">
              <div className="item-name">
                {item.cantidad || item.quantity || 1}x {item.nombre || item.product_name}
              </div>
              <div className="item-meta">
                <div className="item-price">${unitPVP.toFixed(2)} c/u</div>
                {/* ✅ Mostrar PVP unitario (con IVA incluido) */}
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
              {/* ✅ Mostrar total del item (con IVA incluido) */}
              <div className="item-price">${totalItem.toFixed(2)}</div>
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
        );
      })}
    </div>
  );
}