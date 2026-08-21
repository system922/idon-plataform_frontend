// src/pages/cashier/components/PaymentForm/CashPayment.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Check, X } from 'react-feather';
import { BsCurrencyExchange } from 'react-icons/bs';
import { FaHandHoldingDollar } from 'react-icons/fa6';
import { IconTextButton, ButtonGroup } from '../../../components/General/Button';

const CashPayment = ({
  amountPaid,
  setAmountPaid,
  amountPaidRaw,
  setAmountPaidRaw,
  totalOrdenConDescuento,
  printLoading,
  onPagar,
  onCancelar,
  fmt,
  disabled = false,
}) => {
  
  const total = Math.round((parseFloat(totalOrdenConDescuento) || 0) * 100) / 100;
  const recibido = Math.round((parseFloat(amountPaid) || 0) * 100) / 100;
  const change = Math.max(0, recibido - total);
  const isSufficient =
    recibido >= total &&
    amountPaid !== '' &&
    amountPaid !== '0.00';


  // Estado local para controlar el input
  const [localValue, setLocalValue] = useState(amountPaid || '');
  const inputRef = useRef(null);

  // Sincronizar con el estado padre
  useEffect(() => {
    if (amountPaid !== localValue) {
      setLocalValue(amountPaid || '');
    }
  }, [amountPaid]);

  // CORREGIDO: Manejar cualquier formato de onChange
  const handleFieldChange = (valueOrEvent) => {
    try {
      // Si es undefined o null, limpiar
      if (valueOrEvent === undefined || valueOrEvent === null) {
        setLocalValue('');
        setAmountPaid('');
        setAmountPaidRaw('');
        return;
      }

      // Obtener el valor real
      let value = valueOrEvent;
      
      // Si es un evento (tiene target), extraer el valor
      if (valueOrEvent && typeof valueOrEvent === 'object' && valueOrEvent.target) {
        value = valueOrEvent.target.value;
      }
      
      // Si es un número, convertir a string
      if (typeof value === 'number') {
        value = String(value);
      }
      
      // Asegurar que sea string
      value = String(value || '');
      
      // Si está vacío, limpiar
      if (value === '') {
        setLocalValue('');
        setAmountPaid('');
        setAmountPaidRaw('');
        return;
      }

      // SOLO PERMITIR DÍGITOS (0-9)
      let digits = value.replace(/\D/g, '');
      
      // Si no hay dígitos, limpiar
      if (digits === '') {
        setLocalValue('');
        setAmountPaid('');
        setAmountPaidRaw('');
        return;
      }
      
      // Limitar a 8 dígitos (máximo $99,999.99)
      if (digits.length > 8) {
        digits = digits.slice(0, 8);
      }
      
      // Mostrar en el input con formato de punto decimal
      const displayValue = (parseInt(digits, 10) / 100).toFixed(2);
      
      // Actualizar estado local y padre
      setLocalValue(displayValue);
      setAmountPaid(displayValue);
      setAmountPaidRaw(digits);
      
    } catch (error) {
      console.warn('Error en handleFieldChange:', error);
      // En caso de error, limpiar
      setLocalValue('');
      setAmountPaid('');
      setAmountPaidRaw('');
    }
  };

  // Manejar tecla Backspace
  const handleKeyDown = (e) => {
    try {
      if (e.key === 'Backspace') {
        const currentRaw = amountPaidRaw || '';
        if (currentRaw.length === 0) {
          e.preventDefault();
          return;
        }
        if (currentRaw.length === 1) {
          setLocalValue('');
          setAmountPaid('');
          setAmountPaidRaw('');
          e.preventDefault();
        }
      }
    } catch (error) {
      console.warn('Error en handleKeyDown:', error);
    }
  };

  console.log('💰 CASH PAYMENT DEBUG', {
    amountPaid,
    amountPaidRaw,
    totalOrdenConDescuento,
    total,
    recibido,
    isSufficient,
    printLoading,
    disabled,
    botonDisabled: printLoading || !amountPaid || !isSufficient || disabled,
  });


  return (
    <div className="payment-cash-row">
      <div className="payment-field">
        <label><FaHandHoldingDollar size={20} /> Recibido:</label>
        <div className="input-with-format">
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={localValue}
            onChange={handleFieldChange}
            onKeyDown={handleKeyDown}
            placeholder="0.00"
            disabled={disabled}
            autoFocus={!disabled}
            className="formatted-input input-wrapper"
          />
        </div>
      </div>
      <div className="payment-field cambio-field">
        <label><BsCurrencyExchange size={20} /> Cambio:</label>
        <span className={`cambio-amount ${change > 0 ? 'positive' : 'zero'}`}>
          {fmt(change)}
        </span>
      </div>
      <div className="pay-inline-actions">
        <ButtonGroup>
          <IconTextButton
            variant=""
            size="md"
            icon={<X size={13} />}
            onClick={onCancelar}
            disabled={printLoading || disabled}
          >
            Cancelar
          </IconTextButton>
          <IconTextButton
            variant="success"
            size="md"
            icon={<Check size={15} />}
            onClick={onPagar}
            disabled={printLoading || !amountPaid || !isSufficient || disabled}
            loading={printLoading}
          >
            COBRAR
          </IconTextButton>
        </ButtonGroup>
      </div>
    </div>
  );
};

export default CashPayment;