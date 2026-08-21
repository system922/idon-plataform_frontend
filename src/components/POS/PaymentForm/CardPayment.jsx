// src/pages/cashier/components/PaymentForm/CardPayment.jsx
import React from 'react';
import { Check, X } from 'react-feather';
import { CiCreditCard1 } from "react-icons/ci";
import Input from '../../../components/General/Input';
import Button, { IconTextButton, ButtonGroup } from '../../../components/General/Button';

const CardPayment = ({
  refCard,
  setRefCard,
  totalOrdenConDescuento,
  printLoading,
  onPagar,
  onCancelar,
  fmt,
}) => {
  return (
    <div className="payment-reference-row">
      <label><CiCreditCard1 size={20} /> Referencia:</label>
      <Input
        type="text"
        value={refCard}
        onChange={setRefCard}
        placeholder="Número de referencia de la tarjeta"
        size="md"
      />
        <ButtonGroup>
          <IconTextButton
            variant="success"
            size="md"
            icon={<Check size={15} />}
            onClick={onPagar}
            disabled={printLoading || !refCard}
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
  );
};

export default CardPayment;