// src/pages/cashier/components/PaymentForm/TransferPayment.jsx
import React from 'react';
import { Check, X } from 'react-feather';
import { FaMoneyBillTransfer } from 'react-icons/fa6';
import Input from '../../../components/General/Input';
import Button, { IconTextButton, ButtonGroup } from '../../../components/General/Button';

const TransferPayment = ({
  refTransfer,
  setRefTransfer,
  totalOrdenConDescuento,
  printLoading,
  onPagar,
  onCancelar,
  fmt,
}) => {
  return (
    <div className="payment-reference-row">
      <label><FaMoneyBillTransfer size={20} /> Referencia:</label>
      <Input
        type="text"
        value={refTransfer}
        onChange={setRefTransfer}
        placeholder="Número de referencia de la transferencia"
        size="md"
      />
      <div className="pay-inline-actions">
        <ButtonGroup>
          <IconTextButton
            variant="success"
            size="md"
            icon={<Check size={15} />}
            onClick={onPagar}
            disabled={printLoading || !refTransfer}
            loading={printLoading}
          >
            COBRAR {fmt(totalOrdenConDescuento)}
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
  );
};

export default TransferPayment;