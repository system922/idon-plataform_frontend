// src/pages/cashier/components/PaymentForm/MixedPayment.jsx
import React from 'react';
import { Check, X } from 'react-feather';
import { FaHandHoldingDollar } from 'react-icons/fa6';
import { CiCreditCard1 } from "react-icons/ci";
import { FaMoneyBillTransfer } from 'react-icons/fa6';
import { IoFileTrayFull } from 'react-icons/io5';
import { CiWarning } from 'react-icons/ci';
import { BsCurrencyExchange } from 'react-icons/bs';
import Input from '../../../components/General/Input';
import Button, { IconTextButton, ButtonGroup } from '../../../components/General/Button';
import Checklist from '../../../components/General/Checklist';

const MixedPayment = ({
  amountPaid,
  setAmountPaid,
  amountPaidRaw,
  setAmountPaidRaw,
  cardPaid,
  setCardPaid,
  cardPaidRaw,
  setCardPaidRaw,
  transferPaid,
  setTransferPaid,
  transferPaidRaw,
  setTransferPaidRaw,
  refCard,
  setRefCard,
  refTransfer,
  setRefTransfer,
  mixtoActive,
  setMixtoActive,
  mixtoManual,
  setMixtoManual,
  totalOrdenConDescuento,
  printLoading,
  onPagar,
  onCancelar,
  fmt,
  handleMixtoField,
}) => {
  const totalPagadoMixto = (parseFloat(amountPaid) || 0) + (parseFloat(cardPaid) || 0) + (parseFloat(transferPaid) || 0);
  const faltanteMixto = Math.max(0, totalOrdenConDescuento - totalPagadoMixto);
  const cambioMixto = Math.max(0, totalPagadoMixto - totalOrdenConDescuento);

  // Opciones para el Checklist
  const paymentOptions = [
    { id: 'cash', label: 'Efectivo', icon: <FaHandHoldingDollar size={16} /> },
    { id: 'card', label: 'Tarjeta', icon: <CiCreditCard1 size={16} /> },
    { id: 'transfer', label: 'Transferencia', icon: <FaMoneyBillTransfer size={16} /> },
  ];

  // Convertir mixtoActive (Set) a array para el Checklist
  const selectedMethods = Array.from(mixtoActive);

  const handleChecklistChange = (selectedIds) => {
    const newActive = new Set(selectedIds);
    const newManual = new Set(mixtoManual);
    
    // Limpiar manual si el método fue deseleccionado
    for (const method of mixtoManual) {
      if (!newActive.has(method)) {
        newManual.delete(method);
        // Resetear el campo a 0 cuando se deselecciona
        switch (method) {
          case 'cash':
            setAmountPaid('0.00');
            setAmountPaidRaw('0');
            break;
          case 'card':
            setCardPaid('0.00');
            setCardPaidRaw('0');
            setRefCard('');
            break;
          case 'transfer':
            setTransferPaid('0.00');
            setTransferPaidRaw('0');
            setRefTransfer('');
            break;
          default:
            break;
        }
      }
    }
    
    setMixtoManual(newManual);
    setMixtoActive(newActive);
  };

  // Función para limpiar un campo específico
  const limpiarCampo = (metodo) => {
    switch (metodo) {
      case 'cash':
        setAmountPaid('0.00');
        setAmountPaidRaw('0');
        if (mixtoManual.has('cash')) {
          const newManual = new Set(mixtoManual);
          newManual.delete('cash');
          setMixtoManual(newManual);
        }
        break;
      case 'card':
        setCardPaid('0.00');
        setCardPaidRaw('0');
        setRefCard('');
        if (mixtoManual.has('card')) {
          const newManual = new Set(mixtoManual);
          newManual.delete('card');
          setMixtoManual(newManual);
        }
        break;
      case 'transfer':
        setTransferPaid('0.00');
        setTransferPaidRaw('0');
        setRefTransfer('');
        if (mixtoManual.has('transfer')) {
          const newManual = new Set(mixtoManual);
          newManual.delete('transfer');
          setMixtoManual(newManual);
        }
        break;
      default:
        break;
    }
  };

  // Función para manejar el cambio de valor con limpieza
  const handleFieldChange = (metodo, value) => {
    let d = value.replace(/\D/g, '');
    if (!d) d = '0';
    if (d.length > 8) d = d.slice(0, 8);
    
    // Si el valor es 0 o vacío, limpiar el campo
    if (d === '0' || d === '') {
      limpiarCampo(metodo);
    } else {
      handleMixtoField(metodo, d);
    }
  };

  return (
    <>
      <div className="mixto-toggle-row">
        <Checklist
          items={paymentOptions}
          value={selectedMethods}
          onChange={handleChecklistChange}
          mode="simple"
          variant="default"
          showIcons={true}
          selectAll={false}
          emptyMessage="No hay métodos de pago disponibles"
        />
      </div>

      {mixtoActive.size > 0 && (
        <div className="payment-mixed-row">
          {mixtoActive.has('cash') && (
            <div className="mixed-field">
              <label><FaHandHoldingDollar size={20} /> Efectivo:</label>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={amountPaid}
                  onChange={(value) => handleFieldChange('cash', value)}
                  placeholder="0.00"
                  size="md"
                  style={{ flex: 1 }}
                />
                {amountPaid !== '0.00' && (
                  <IconTextButton
                    variant="danger"
                    size="sm"
                    icon={<X size={12} />}
                    onClick={() => limpiarCampo('cash')}
                    title="Limpiar"
                  />
                )}
              </div>
            </div>
          )}
          {mixtoActive.has('card') && (
            <div className="mixed-field">
              <label><CiCreditCard1 size={20} /> Tarjeta:</label>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={cardPaid}
                  onChange={(value) => handleFieldChange('card', value)}
                  placeholder="0.00"
                  size="md"
                  style={{ flex: 1 }}
                />
                {cardPaid !== '0.00' && (
                  <IconTextButton
                    variant="danger"
                    size="sm"
                    icon={<X size={12} />}
                    onClick={() => limpiarCampo('card')}
                    title="Limpiar"
                  />
                )}
              </div>
              <Input
                type="text"
                placeholder="Ref. tarjeta"
                value={refCard}
                onChange={setRefCard}
                size="md"
                style={{ marginTop: 4 }}
              />
            </div>
          )}
          {mixtoActive.has('transfer') && (
            <div className="mixed-field">
              <label><FaMoneyBillTransfer size={20} /> Transferencia:</label>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={transferPaid}
                  onChange={(value) => handleFieldChange('transfer', value)}
                  placeholder="0.00"
                  size="md"
                  style={{ flex: 1 }}
                />
                {transferPaid !== '0.00' && (
                  <IconTextButton
                    variant="danger"
                    size="sm"
                    icon={<X size={12} />}
                    onClick={() => limpiarCampo('transfer')}
                    title="Limpiar"
                  />
                )}
              </div>
              <Input
                type="text"
                placeholder="Ref. transferencia"
                value={refTransfer}
                onChange={setRefTransfer}
                size="md"
                style={{ marginTop: 4 }}
              />
            </div>
          )}
        </div>
      )}

      {mixtoActive.size > 0 && (
        <div className="mixed-total-row">
          <div className="mixed-total-item">
            <span><IoFileTrayFull size={20} /> Total Ingresado:</span>
            <strong>{fmt(totalPagadoMixto)}</strong>
          </div>
          {faltanteMixto > 0 && (
            <div className="mixed-total-item warning">
              <span><CiWarning size={20} /> Faltante:</span>
              <strong>{fmt(faltanteMixto)}</strong>
            </div>
          )}
          {cambioMixto > 0 && (
            <div className="mixed-total-item success">
              <span><BsCurrencyExchange size={20} /> Cambio:</span>
              <strong>{fmt(cambioMixto)}</strong>
            </div>
          )}
          <div className="pay-inline-actions" style={{ marginLeft: 'auto' }}>
            <ButtonGroup>
              <IconTextButton
                variant="success"
                size="md"
                icon={<Check size={15} />}
                onClick={onPagar}
                disabled={printLoading || faltanteMixto > 0.01}
                loading={printLoading}
              >
                COBRAR
              </IconTextButton>
              <IconTextButton
                variant="danger"
                size="md"
                icon={<X size={13} />}
                onClick={onCancelar}
              >
                Cancelar
              </IconTextButton>
            </ButtonGroup>
          </div>
        </div>
      )}
    </>
  );
};

export default MixedPayment;