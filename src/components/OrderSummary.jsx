import React from 'react';
import { FiSend } from 'react-icons/fi';
import { CiWarning } from "react-icons/ci";
import '../styles/OrderSummary.css';

export default function OrderSummary({
  subtotal,        // ✅ Subtotal base (sin IVA) = suma de selling_price × cantidad
  ivaAmount,       // ✅ IVA total = suma de tax_rate × cantidad
  totalConIva,     // ✅ Total con IVA = subtotal + ivaAmount
  ivaLabel,        // ✅ Porcentaje de IVA (ej: "15%")
  items,
  guardando,
  orderType,
  numeroMesa,
  guardarOrden
}) {
  // ✅ Validación para habilitar el botón
  const isValid = items.length > 0 && (orderType !== 'dine_in' || (orderType === 'dine_in' && numeroMesa && numeroMesa.trim() !== ''));

  return (
    <div className="order-summary">
      {/* Subtotal (sin IVA) */}
      <div className="summary-row">
        <span>Subtotal</span>
        <span>${subtotal.toFixed(2)}</span>
      </div>
      
      {/* IVA por separado */}
      <div className="summary-row">
        <span>IVA ({ivaLabel})</span>
        <span>${ivaAmount.toFixed(2)}</span>
      </div>
      
      {/* Total con IVA */}
      <div className="summary-row total">
        <span>Total</span>
        <span>${totalConIva.toFixed(2)}</span>
      </div>
      
      {/* Nota informativa */}
      <div className="summary-note">
        <small>El cobro se realiza en la pantalla Cobrar.</small>
      </div>

      {/* Mensaje de validación - Número de mesa requerido */}
      {orderType === 'dine_in' && !numeroMesa && items.length > 0 && (
        <div className="validation-message warning">
          <CiWarning /> Ingrese No. de mesa antes de enviar la orden <CiWarning />
        </div>
      )}

      {/* Mensaje de validación - Sin items */}
      {items.length === 0 && (
        <div className="validation-wrapper">
          <div className="validation-message warning">
            <CiWarning /> Debe agregar al menos un producto a la orden <CiWarning />
          </div>
        </div>
      )}

      {/* Botón enviar a cocina */}
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