// src/components/POS/OrderDetails.jsx
import React from 'react';
import { FiPercent } from 'react-icons/fi';

const OrderDetails = ({
  selectedOrder,
  modoDividido,
  selectedItems,
  onSelectItem,
  appliedDiscount,
  discountAmount,
  totalOrdenConDescuento,
  subtotalConDescuento,        // ← Nueva prop
  ivaConDescuento,             // ← Nueva prop
  couponDiscountAmount,
  appliedCouponsRef,
  fmt,
  children,
  clientesDivididos = [],
  setClientesDivididos,
}) => {
  // Manejar cambio de Factura Individual
  const handleFacturaIndividualChange = (e) => {
    const checked = e.target.checked;
    setClientesDivididos(prev => prev.map(c => ({ 
      ...c, 
      facturaIndividual: checked 
    })));
  };

  const tieneFacturaIndividual = clientesDivididos.some(c => c.facturaIndividual);

  return (
    <div className="order-details">
      <div className="order-head">
        <b>
          {selectedOrder.mesa_numero ? `Mesa ${selectedOrder.mesa_numero} ` : 
           selectedOrder.order_type === 'delivery' ? 'Delivery' : 'Para Llevar'} 
           -- Órden #{String(selectedOrder.order_number || selectedOrder.id).split('-').pop()}
        </b>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
          {modoDividido && selectedItems.length > 0 && (
            <span className="badge">{selectedItems.length} producto(s) seleccionado(s)</span>
          )}
          {appliedDiscount && discountAmount > 0 && (
            <span className="discount-badge">
              <FiPercent size={12} /> {appliedDiscount.name} - {fmt(discountAmount)} Desc.
            </span>
          )}
          
          {/* Toggle de Factura Individual - SOLO en modo dividido y UNA SOLA VEZ */}
          {modoDividido && clientesDivididos.length > 0 && (
            <label className="comensal-factura-toggle" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '6px',
              background: tieneFacturaIndividual ? 'var(--bg-primary)' : 'transparent',
              border: `1px solid ${tieneFacturaIndividual ? 'var(--border-color)' : 'transparent'}`,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}>
              <input
                type="checkbox"
                checked={tieneFacturaIndividual}
                onChange={handleFacturaIndividualChange}
                style={{
                  width: '16px',
                  height: '16px',
                  accentColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              />
              <span style={{ 
                fontSize: '13px', 
                color: tieneFacturaIndividual ? 'var(--text-primary)' : '#94a3b8',
                fontWeight: tieneFacturaIndividual ? '600' : '400'
              }}>
                Factura Individual
              </span>
            </label>
          )}
        </div>
      </div>

      {/* EN MODO DIVIDIDO: Mostrar children (SplitPaymentList) */}
      {modoDividido ? (
        children
      ) : (
        // Modo normal: mostrar productos y totales
        <>
          <div className="order-items">
            {selectedOrder.items.filter(item => !item.paid).map((item, idx) => (
              <div key={idx} className="item-line" style={{ 
                background: selectedItems.includes(item.id) ? 'rgba(16,185,129,0.08)' : 'transparent' 
              }}>
                <span className="item-qty">{item.quantity}x</span>
                <span className="item-name">{item.product_name}</span>
                <span className="item-amt">{fmt((Number(item.selling_price) || Number(item.unit_price)) * item.quantity)}</span>
                {item.paid && <span className="paid-badge">PAGADO</span>}
              </div>
            ))}
            {selectedOrder.items.filter(item => !item.paid).length === 0 && (
              <div className="empty-state">Todos los productos han sido pagados</div>
            )}
          </div>

          {/* ✅ SECCIÓN DE TOTALES ACTUALIZADA CON DESCUENTO */}
          <div className="totals-footer">
            {/* Subtotal (base imponible con descuento) */}
            <div className="sub-iva-total">
              <span>SUBTOTAL</span>
              <span>{fmt(subtotalConDescuento)}</span>
            </div>

            {/* Descuento manual (si existe) */}
            {appliedDiscount && discountAmount > 0 && (
              <div className="sub-iva-total discount-row">
                <span>DESCUENTO ({appliedDiscount.name})</span>
                <span style={{ color: '#10b981' }}>-{fmt(discountAmount)}</span>
              </div>
            )}

            {/* Cupones aplicados */}
            {appliedCouponsRef && appliedCouponsRef.current && appliedCouponsRef.current.map((c, idx) => (
              <div key={idx} className="sub-iva-total discount-row">
                <span>CUPÓN ({c.discount.name})</span>
                <span style={{ color: '#10b981' }}>-{fmt(c.amount)}</span>
              </div>
            ))}

            {/* IVA recalculado con descuento */}
            <div className="sub-iva-total">
              <span>I.V.A.</span>
              <span>{fmt(ivaConDescuento)}</span>
            </div>

            {/* TOTAL */}
            <div className="sub-iva-total total-row">
              <span>TOTAL</span>
              <span className="total-amount">{fmt(totalOrdenConDescuento)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OrderDetails;