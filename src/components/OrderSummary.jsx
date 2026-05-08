import React from 'react';
import { FiSend  } from 'react-icons/fi';
import { CiWarning } from "react-icons/ci";
import '../styles/OrderSummary.css';

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
  const isValid = items.length > 0 && (orderType !== 'dine_in' || (orderType === 'dine_in' && numeroMesa));

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

      {/* 🔥 MENSAJE DE VALIDACIÓN - NÚMERO DE MESA */}
      {orderType === 'dine_in' && !numeroMesa && items.length > 0 && (
        <div className="validation-message warning">
          <CiWarning /> Ingrese No. de mesa antes de enviar la orden <CiWarning />
        </div>
      )}

      {/* 🔥 MENSAJE DE VALIDACIÓN - SIN ITEMS */}
      {items.length === 0 && (
        <div className="validation-wrapper">
          <div className="validation-message warning">
            <CiWarning /> Debe agregar al menos un producto a la orden <CiWarning />
          </div>
        </div>
      )}

      <button
        className="btn-send-kitchen"
        onClick={guardarOrden}
        disabled={guardando || !isValid}
        type="button"
      >
        {guardando ? (
          <>
            <div className="spinner"></div>
            Enviando...
          </>
        ) : (
          <>
            <FiSend size={18} />
            Enviar a cocina
          </>
        )}
      </button>
    </div>
  );
}