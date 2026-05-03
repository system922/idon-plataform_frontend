import React from 'react';

export default function OrderSummary({
  subtotal,
  ivaAmount,
  totalConIva,
  ivaLabel,
  items,
  guardando,
  orderType,
  numeroMesa,
  guardarOrden
}) {
  return (
    <div className="order-summary">
      <div className="summary-row">
        <span>Subtotal</span>
        <span>${subtotal.toFixed(2)}</span>
      </div>
      <div className="summary-row">
        <span>IVA ({ivaLabel})</span>
        <span>${ivaAmount.toFixed(2)}</span>
      </div>
      <div className="summary-row total">
        <span>Total</span>
        <span>${totalConIva.toFixed(2)}</span>
      </div>
      
      <div className="summary-note">
        <small>El cobro se realiza en la pantalla Cobrar.</small>
      </div>

      <button
        className="btn-send-kitchen"
        onClick={guardarOrden}
        disabled={guardando || items.length === 0 || (orderType === 'dine_in' && !numeroMesa)}
        type="button"
      >
        {guardando ? 'Enviando...' : 'Enviar a cocina'}
      </button>
    </div>
  );
}