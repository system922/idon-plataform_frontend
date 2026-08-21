// src/pages/cashier/components/PaymentMethods.jsx
import React from 'react';
import { DollarSign, Users, Clock } from 'react-feather';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';

const PaymentMethods = ({
  modoDividido,
  setModoDividido,
  modoPorCobrar,
  setModoPorCobrar,
  clientesDivididos,
  setClientesDivididos,
  setSelectedItems,
  facturaIndividual,
  setFacturaIndividual,
}) => {
  const handleDividir = () => {
    setModoDividido(true);
    setModoPorCobrar(false);
    setFacturaIndividual(false);
    if (clientesDivididos.length === 0) {
      setClientesDivididos([{ 
        id: Date.now(), 
        cedula: '', 
        nombre: '', 
        email: '', 
        items: [], 
        metodoPago: 'cash', 
        montoRecibido: 0, 
        referencia: '', 
        cashAmount: 0, 
        cardAmount: 0, 
        transferAmount: 0, 
        facturaIndividual: false, 
        mixtoMethods: [] 
      }]);
    }
  };

  const handleNormal = () => {
    setModoDividido(false);
    setModoPorCobrar(false);
    setClientesDivididos([]);
    setSelectedItems([]);
  };

  const handlePorCobrar = () => {
    setModoPorCobrar(true);
    setModoDividido(false);
    setClientesDivididos([]);
    setSelectedItems([]);
  };

  return (
    <div className="pay-methods">
      <ButtonGroup>
        <IconTextButton
          variant={!modoDividido && !modoPorCobrar ? 'primary' : 'secondary'}
          size="md"
          icon={<DollarSign size={15} />}
          onClick={handleNormal}
          outline={!(!modoDividido && !modoPorCobrar)}
        >
          Normal
        </IconTextButton>
        <IconTextButton
          variant={modoDividido ? 'primary' : 'secondary'}
          size="md"
          icon={<Users size={15} />}
          onClick={handleDividir}
          outline={!modoDividido}
        >
          Dividir Cuenta
        </IconTextButton>
        <IconTextButton
          variant={modoPorCobrar ? 'primary' : 'secondary'}
          size="md"
          icon={<Clock size={15} />}
          onClick={() => {
            setModoPorCobrar(!modoPorCobrar);
            if (!modoPorCobrar) {
              setModoDividido(false);
            }
          }}
          outline={!modoPorCobrar}
        >
          Por Cobrar
        </IconTextButton>
      </ButtonGroup>
    </div>
  );
};

export default PaymentMethods;