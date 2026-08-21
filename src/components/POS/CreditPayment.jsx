// src/components/POS/CreditPayment.jsx
import React, { useState } from 'react';
import { IconTextButton, ButtonGroup } from '../General/Button';
import Input from '../General/Input';
import { BsCashCoin } from "react-icons/bs";
import { CiCreditCard1 } from "react-icons/ci";
import { SlScreenSmartphone } from "react-icons/sl";
import { FiCheck, FiX, FiAlertTriangle } from 'react-icons/fi';

const CreditPayment = ({
  totalOrdenConDescuento,
  printLoading,
  onPagarParcial,
  onPagarCredito,
  onCancelar,
  fmt,
  // Datos del cliente desde el padre (ya están en la cabecera)
  clienteCedula,
  clienteNombre,
  clienteEmail,
}) => {
  const [modoPago, setModoPago] = useState('credito');
  const [montoAbono, setMontoAbono] = useState('');
  const [montoAbonoRaw, setMontoAbonoRaw] = useState('');
  const [metodoAbono, setMetodoAbono] = useState('cash');
  const [refAbono, setRefAbono] = useState('');

  // Verificar si el cliente es CONSUMIDOR FINAL
  const esConsumidorFinal = !clienteCedula || 
    clienteCedula === '9999999999' || 
    clienteCedula === '9999999999999' ||
    !clienteNombre ||
    clienteNombre.trim() === '' ||
    clienteNombre.trim().toUpperCase() === 'CONSUMIDOR FINAL';

  // Verificar si el cliente tiene datos reales (válidos para cuenta por cobrar)
  const clienteValido = !esConsumidorFinal && 
    clienteCedula?.length >= 10 && 
    clienteNombre?.trim() !== '';

  const handleMontoAbonoChange = (val) => {
    let digits = val.replace(/\D/g, '');
    if (!digits) digits = '0';
    if (digits.length > 8) digits = digits.slice(0, 8);
    setMontoAbonoRaw(digits);
    const value = parseInt(digits, 10) / 100;
    setMontoAbono(value.toString());
  };

  const handlePagar = () => {
    // Validar cliente REAL primero
    if (!clienteValido) {
      alert('⚠️ Para registrar una cuenta por cobrar, debe tener un cliente real (no CONSUMIDOR FINAL)');
      return;
    }

    if (modoPago === 'credito') {
      onPagarCredito();
    } else {
      const abono = parseFloat(montoAbono) || 0;
      if (abono <= 0) {
        alert('Ingrese un monto de abono válido');
        return;
      }
      if (abono > totalOrdenConDescuento) {
        alert(`El abono no puede ser mayor al total (${fmt(totalOrdenConDescuento)})`);
        return;
      }
      onPagarParcial(abono, metodoAbono, refAbono);
    }
  };

  return (
    <div className="credit-payment-container">
      {/* ALERTA: Cliente no válido para cuenta por cobrar */}
      {!clienteValido && (
        <div className="credit-cliente-required" style={{
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <FiAlertTriangle size={20} color="#d97706" />
          <span style={{ color: '#92400e', fontSize: '12px' }}>
            <strong>Cliente no válido!</strong> Para registrar una cuenta por cobrar, el cliente debe tener datos reales 
            (no puede ser "CONSUMIDOR FINAL").
          </span>
        </div>
      )}

      {/* Mostrar resumen del cliente (solo lectura) */}
      {clienteValido && (
        <div className="credit-cliente-resumen" style={{
          background: '#f0fdf4',
          border: '1px solid #86efac',
          borderRadius: '8px',
          padding: '10px 14px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          fontSize: '14px'
        }}>
          <span><strong>Cliente:</strong> {clienteNombre}</span>
          <span><strong>Cédula:</strong> {clienteCedula}</span>
          {clienteEmail && <span><strong>Email:</strong> {clienteEmail}</span>}
          <span style={{ color: '#16a34a', fontSize: '12px' }}>
            Válido para cuenta por cobrar
          </span>
        </div>
      )}

      {/* Selector de modo de pago */}
      <div className="credit-mode-selector">
        <ButtonGroup>
          <IconTextButton
            variant={modoPago === 'credito' ? 'primary' : 'secondary'}
            size="md"
            onClick={() => setModoPago('credito')}
            outline={modoPago !== 'credito'}
          >
            Todo a Crédito
          </IconTextButton>
          <IconTextButton
            variant={modoPago === 'parcial' ? 'primary' : 'secondary'}
            size="md"
            onClick={() => setModoPago('parcial')}
            outline={modoPago !== 'parcial'}
          >
            Abono Parcial
          </IconTextButton>
        </ButtonGroup>
      </div>

      {/* Modo: Todo a Crédito */}
      {modoPago === 'credito' && (
        <div className="credit-full-mode">
          <div className="credit-info-box">
            <p>
              <strong>Total a crédito:</strong> {fmt(totalOrdenConDescuento)}
            </p>
            <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
              El cliente pagará en una fecha posterior. Se generará una cuenta por cobrar.
            </p>
          </div>
          <div className="credit-actions">
            <ButtonGroup>
              <IconTextButton
                variant=""
                size="md"
                icon={<FiX size={16} />}
                onClick={onCancelar}
                disabled={printLoading}
              >
                Cancelar
              </IconTextButton>
              <IconTextButton
                variant="primary"
                size="md"
                icon={<BsCashCoin size={16} />}
                onClick={handlePagar}
                disabled={printLoading || !clienteValido}
              >
                {printLoading ? 'Procesando...' : 'Registrar Crédito'}
              </IconTextButton>
            </ButtonGroup>
          </div>
        </div>
      )}

      {/* Modo: Abono Parcial */}
      {modoPago === 'parcial' && (
        <div className="credit-partial-mode">
          <div className="credit-info-box">
            <p>
              <strong>Total de la orden:</strong> {fmt(totalOrdenConDescuento)}
            </p>
          </div>

          {/* Monto del abono */}
          <div className="partial-payment-row">
            <div className="partial-field">
              <label>Monto del Abono:</label>
              <Input
                type="text"
                inputMode="numeric"
                value={montoAbonoRaw ? (parseInt(montoAbonoRaw, 10) / 100).toFixed(2) : ''}
                onChange={handleMontoAbonoChange}
                placeholder="0.00"
                size="sm"
                style={{ width: '150px' }}
              />
            </div>
            <div className="partial-field">
              <label>Saldo Restante:</label>
              <span style={{ fontWeight: 'bold', fontSize: '16px' }}>
                {fmt(Math.max(0, totalOrdenConDescuento - (parseFloat(montoAbono) || 0)))}
              </span>
            </div>
          </div>

          {/* Método de pago del abono */}
          <div className="abono-metodo-selector">
            <label style={{ marginRight: '12px' }}>Método de pago del abono:</label>
            <ButtonGroup>
              <IconTextButton
                variant={metodoAbono === 'cash' ? 'primary' : 'secondary'}
                size="sm"
                icon={<BsCashCoin size={16} />}
                onClick={() => {
                  setMetodoAbono('cash');
                  setRefAbono('');
                }}
                outline={metodoAbono !== 'cash'}
              >
                Efectivo
              </IconTextButton>
              <IconTextButton
                variant={metodoAbono === 'card' ? 'primary' : 'secondary'}
                size="sm"
                icon={<CiCreditCard1 size={16} />}
                onClick={() => {
                  setMetodoAbono('card');
                  setRefAbono('');
                }}
                outline={metodoAbono !== 'card'}
              >
                Tarjeta
              </IconTextButton>
              <IconTextButton
                variant={metodoAbono === 'transfer' ? 'primary' : 'secondary'}
                size="sm"
                icon={<SlScreenSmartphone size={16} />}
                onClick={() => {
                  setMetodoAbono('transfer');
                  setRefAbono('');
                }}
                outline={metodoAbono !== 'transfer'}
              >
                Transferencia
              </IconTextButton>
            </ButtonGroup>
          </div>

          {/* Referencia (si es tarjeta o transferencia) */}
          {(metodoAbono === 'card' || metodoAbono === 'transfer') && (
            <div className="abono-reference">
              <label>Referencia:</label>
              <Input
                type="text"
                value={refAbono}
                onChange={(val) => setRefAbono(val)}
                placeholder={`Número de ${metodoAbono === 'card' ? 'tarjeta' : 'transferencia'}`}
                size="sm"
                style={{ width: '250px' }}
              />
            </div>
          )}

          <div className="credit-actions">
            <ButtonGroup>
              <IconTextButton
                variant=""
                size="md"
                icon={<FiX size={16} />}
                onClick={onCancelar}
                disabled={printLoading}
              >
                Cancelar
              </IconTextButton>
              <IconTextButton
                variant="primary"
                size="md"
                icon={<FiCheck size={16} />}
                onClick={handlePagar}
                disabled={
                  printLoading ||
                  !clienteValido ||
                  (metodoAbono !== 'cash' && !refAbono) ||
                  (parseFloat(montoAbono) || 0) <= 0
                }
              >
                {printLoading ? 'Procesando...' : 'Registrar Abono'}
              </IconTextButton>
            </ButtonGroup>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditPayment;