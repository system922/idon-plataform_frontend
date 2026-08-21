import React from 'react';
import { FiEdit2, FiTrash2, FiShoppingCart } from 'react-icons/fi';

export default function ItemsList({ items, eliminarItem, abrirEditarItem }) {
  if (!items || items.length === 0) {
    return (
      <div className="items-empty-panel">
        <FiShoppingCart size={18} style={{ color: 'var(--text-muted)', marginBottom: 4 }} />
        <span className="empty-title">No hay items</span>
      </div>
    );
  }

  return (
    <div className="items-list-modern">
      {items.map((item, idx) => {
        // CANTIDAD
        const cantidad = item.quantity || item.cantidad || 1;
        const nombre = item.product_name || item.nombre || '';
        
        // PRECIO SIN IVA (unit_price)
        const unitPrice = item.unit_price || item.selling_price || 0;
        
        // IVA POR UNIDAD (MONTO)
        // Si el item tiene iva_amount total, dividir por cantidad para obtener el IVA por unidad
        let ivaPorUnidad = 0;
        if (item.iva_amount && cantidad > 0) {
          ivaPorUnidad = Number(item.iva_amount) / cantidad;
        } else if (item.tax_rate) {
          // Si tax_rate es el porcentaje (15), calcular el IVA por unidad
          const porcentajeIva = Number(item.tax_rate) || 0;
          ivaPorUnidad = (unitPrice * porcentajeIva) / 100;
        }
        
        // PVP = PRECIO SIN IVA + IVA POR UNIDAD
        const unitPVP = unitPrice + ivaPorUnidad;
        
        // TOTAL CON IVA (line_total)
        const totalItem = item.line_total || item.total || (unitPVP * cantidad);
        
        const extras = item.extras || [];
        const notas = item.notas || '';
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
                <span className="comanda-unitprice">---  ${totalItem.toFixed(2)}</span>
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
            {extras.map((extra, i) => {
              const extraPrice = Number(extra.selling_price) || 0;
              const extraIva = Number(extra.iva_amount) || 0;
              const extraPVP = extraPrice + extraIva;
              return (
                <div key={i} className="comanda-sub-line comanda-extra">
                  <span>+ {extra.name?.toUpperCase()} (${extraPVP.toFixed(2)})</span>
                </div>
              );
            })}

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