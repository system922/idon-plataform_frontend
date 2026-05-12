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
        const unitPVP   = (item.selling_price || 0) + (item.tax_rate || 0);
        const totalItem = item.total || item.line_total || (unitPVP * (item.cantidad || item.quantity || 1));
        const cantidad  = item.cantidad || item.quantity || 1;
        const nombre    = (item.nombre || item.product_name || '').toUpperCase();
        const extras    = item.extras || [];
        const notas     = item.notas || '';

        return (
          <div key={item.id || idx} className="item-row comanda-style">

            {/* ── Línea 1: qty · nombre · precio c/u · total · acciones ── */}
            <div className="comanda-line-1">
              <div className="comanda-left">
                <span className="comanda-qty">{cantidad}x</span>
                <span className="comanda-nombre">{nombre}</span>
              </div>
              <div className="comanda-right">
                <span className="comanda-unitprice">${unitPVP.toFixed(2)} c/u</span>
                <span className="item-price">${totalItem.toFixed(2)}</span>
                <div className="item-actions">
                  <button className="icon-btn edit-btn" onClick={() => abrirEditarItem(item)} title="Editar">
                    <FiEdit2 size={15} />
                  </button>
                  <button className="icon-btn delete-btn" onClick={() => eliminarItem(item.id)} title="Eliminar">
                    <FiTrash2 size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* ── Extras ── */}
            {extras.map((extra, i) => (
              <div key={i} className="comanda-sub-line comanda-extra">
                <span>+ {extra.name?.toUpperCase()}</span>
              </div>
            ))}

            {/* ── Nota ── */}
            {notas && (
              <div className="comanda-sub-line comanda-nota">
                <span>* {notas} *</span>
              </div>
            )}

          </div>
        );
      })}
    </div>
  );
}