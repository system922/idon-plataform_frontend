import React, { useState, useEffect } from 'react';
import '../styles/OpenDrawerButton.css';

function OpenDrawerReasonModal({ open, onSubmit, onClose, submitting, error }) {
  const [reasonType,     setReasonType]     = useState('');
  const [amount,         setAmount]         = useState('');
  const [paymentMethod,  setPaymentMethod]  = useState('cash');
  const [concept,        setConcept]        = useState('');

  useEffect(() => {
    if (open) {
      setReasonType('');
      setAmount('');
      setPaymentMethod('cash');
      setConcept('');
    }
  }, [open]);

  const reasonsList = [
    { value: '',              label: 'Elige motivo...' },
    { value: 'cierre_error',  label: 'Reabrir por cierre accidental' },
    { value: 'egreso_compra', label: 'Retiro/egreso para compras' },
    { value: 'ingreso_extra', label: 'Ingresos extras' },
  ];

  function handleSubmit(e) {
    e.preventDefault();
    if (!reasonType) return;
    if (reasonType === 'ingreso_extra' && !amount) return;
    onSubmit({ reasonType, amount: amount ? parseFloat(amount) : null, paymentMethod, concept });
  }

  if (!open) return null;

  const isIngreso = reasonType === 'ingreso_extra';
  const isEgreso  = reasonType === 'egreso_compra';

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.25)', zIndex: 1100, display: 'flex',
      alignItems: 'center', justifyContent: 'center'
    }}>
      <form onSubmit={handleSubmit}
        style={{ background: '#fff', borderRadius: 10, padding: 28, minWidth: 320 }}>
        <h3 style={{ marginBottom: 10 }}>Registrar Motivo de Apertura de Caja</h3>

        <select
          style={{ width: '100%', marginBottom: 15, padding: 8, borderRadius: 6 }}
          value={reasonType}
          disabled={submitting}
          onChange={e => setReasonType(e.target.value)}
          required
        >
          {reasonsList.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>

        {isEgreso && (
          <p style={{ fontSize: 13, color: '#555', marginBottom: 12 }}>
            Se abrirá el cajón. Al regresar de la compra aparecerá una burbuja para registrar lo gastado.
          </p>
        )}

        {isIngreso && (
          <div style={{ marginBottom: 4 }}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>Método de pago</label>
              <select
                style={{ width: '100%', padding: 8, borderRadius: 6 }}
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                disabled={submitting}
              >
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="transfer">Transferencia</option>
              </select>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>Monto *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                disabled={submitting}
                required
                style={{ width: '100%', padding: 8, borderRadius: 6, boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>Concepto (opcional)</label>
              <input
                type="text"
                placeholder="Describe el ingreso..."
                value={concept}
                onChange={e => setConcept(e.target.value)}
                disabled={submitting}
                style={{ width: '100%', padding: 8, borderRadius: 6, boxSizing: 'border-box' }}
              />
            </div>
          </div>
        )}

        {error && (
          <div style={{ color: '#d11', marginBottom: 8, fontSize: 13 }}>{error}</div>
        )}

        {reasonType && (
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button
              type="submit"
              disabled={submitting || (isIngreso && !amount)}
              style={{ background: '#13d06d', color: '#104818', border: 0, fontWeight: 600, borderRadius: 6, padding: '9px 20px' }}
            >
              {submitting
                ? (isIngreso ? 'Registrando...' : 'Abriendo...')
                : (isIngreso ? 'Registrar Ingreso' : 'Abrir Caja')}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{ background: '#eee', border: 0, borderRadius: 6, padding: '9px 20px', fontWeight: 600 }}
            >
              Cancelar
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

export default OpenDrawerReasonModal;
