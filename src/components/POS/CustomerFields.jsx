// src/pages/cashier/components/CustomerFields.jsx
import React, { useRef, useEffect } from 'react';
import Input from '../../components/General/Input';
import OpenDrawerButton from '../../components/OpenDrawerButton';

const CustomerFields = ({
  clienteCedula,
  setClienteCedula,
  clienteNombre,
  setClienteNombre,
  clienteEmail,
  setClienteEmail,
  clientApiLoading,
  onBuscarCliente,
  disabled = false,
}) => {
  const initialLoadRef = useRef(true);

  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }
  }, []);

  const handleCedulaChange = (valueOrEvent) => {
    let value = valueOrEvent;
    if (valueOrEvent && typeof valueOrEvent === 'object' && valueOrEvent.target) {
      value = valueOrEvent.target.value;
    }
    const val = String(value || '').replace(/\D/g, '').slice(0, 13);
    setClienteCedula(val);
    if (val.length === 10 || val.length === 13) {
      onBuscarCliente(val, false, null);
    } else if (val.length < 10 && val.length > 0) {
      setClienteNombre('');
      setClienteEmail('');
    }
  };

  const handleNombreChange = (valueOrEvent) => {
    let value = valueOrEvent;
    if (valueOrEvent && typeof valueOrEvent === 'object' && valueOrEvent.target) {
      value = valueOrEvent.target.value;
    }
    setClienteNombre(String(value || ''));
  };

  const handleEmailChange = (valueOrEvent) => {
    let value = valueOrEvent;
    if (valueOrEvent && typeof valueOrEvent === 'object' && valueOrEvent.target) {
      value = valueOrEvent.target.value;
    }
    setClienteEmail(String(value || ''));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      const val = clienteCedula;
      if (val.length === 10 || val.length === 13) {
        onBuscarCliente(val, false, null);
      }
    }
  };

  const handleBlur = () => {
    const val = clienteCedula;
    if (val.length === 10 || val.length === 13) {
      onBuscarCliente(val, false, null);
    }
  };

  const cedulaValue = clienteCedula || '';
  const nombreValue = clienteNombre || '';
  const emailValue = clienteEmail || '';

  return (
    <div className="cliente-fields">
      <div className="cf-cedula">
        <div className="input-container">
          <Input
            type="text"
            placeholder="Cédula/RUC"
            value={cedulaValue}
            onChange={handleCedulaChange}
            onKeyPress={handleKeyPress}
            onBlur={handleBlur}
            disabled={disabled}
            className="cf-cedula-input"
            size="md"
          />
          {clientApiLoading && <div className="spinner-small"></div>}
        </div>
      </div>
      <Input
        type="text"
        placeholder="Nombre cliente"
        value={nombreValue}
        onChange={handleNombreChange}
        disabled={disabled}
        className="cf-nombre"
        size="md"
      />
      <Input
        type="email"
        placeholder="Email"
        value={emailValue}
        onChange={handleEmailChange}
        disabled={disabled}
        className="cf-email"
        size="md"
      />
      <div className="OpenDrawerButton-wrapper">
        <OpenDrawerButton />
      </div>
    </div>
  );
};

export default CustomerFields;