import React from 'react';
import { FiSave } from 'react-icons/fi';

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
    <div className="summary-sticky">
      <div className="summary-row">
        <span>Subtotal</span>
        <span>${subtotal.toFixed(2)}</span>
      </div>
      <div className="summary-row">
        <span>IVA ({ivaLabel})</span>
        <span>${ivaAmount.toFixed(2)}</span>
      </div>
      <div className="summary-total">
        <span>Total</span>
        <span>${totalConIva.toFixed(2)}</span>
      </div>
      <div className="summary-hint">
        El cobro se realiza en la pantalla <strong>Cobrar</strong>.
      </div>

      {items.length > 0 && (
        <button
          className="btn btn-success btn-block"
          onClick={guardarOrden}
          disabled={guardando || (orderType === 'dine_in' && !numeroMesa)}
          style={{ marginTop: '1rem', width: '100%' }}
          type="button"
        >
          <FiSave size={14} />
          {guardando ? 'Enviando...' : 'Enviar a cocina'}
        </button>
      )}
    </div>
  );
}
