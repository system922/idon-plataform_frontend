import React, { useState, useEffect } from 'react';
import '../styles/OpenDrawerButton.css';

function OpenDrawerReasonModal({ open, onSubmit, onClose, submitting, error }) {
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [reasonType, setReasonType] = useState('');

  useEffect(() => {
    if (open) {
      setReason('');
      setAmount('');
      setReasonType('');
    }
  }, [open]);

  const reasonsList = [
    { value: '', label: 'Elige motivo...' },
    { value: 'cierre_error', label: 'Reabrir por cierre accidental' },
    { value: 'egreso_compra', label: 'Retiro/egreso para compras' }
  ];

  function handleSubmit(e) {
    e.preventDefault();
    // Solo validar campos si es egreso_compra
    if (reasonType === 'egreso_compra' && !amount) return;
    onSubmit({ reasonType, reason, amount: amount ? parseFloat(amount) : null });
  }

  if (!open) return null;

  // Solo mostrar campos extra si es "egreso_compra"
  const isEgreso = reasonType === 'egreso_compra';

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.25)', zIndex: 1100, display: 'flex',
      alignItems: 'center', justifyContent: 'center'
    }}>
      <form onSubmit={handleSubmit}
        style={{ background: '#fff', borderRadius: 10, padding: 28, minWidth: 320 }}>
        <h3 style={{ marginBottom: 10 }}>Registrar Motivo de Apertura de Caja</h3>
        <select style={{ width: '100%', marginBottom: 15, padding: 8, borderRadius: 6 }}
          value={reasonType} disabled={submitting}
          onChange={e => setReasonType(e.target.value)}
          required>
          {reasonsList.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        {isEgreso && (
          <>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Ingrese monto re-ingresado o gastado"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              disabled={submitting}
              style={{ width: '100%', marginBottom: 12, padding: 8, borderRadius: 6 }}
              required
            />
            <textarea
              placeholder="Comentario adicional (motivo)"
              value={reason}
              onChange={e => setReason(e.target.value)}
              disabled={submitting}
              rows={2}
              style={{ width: '100%', marginBottom: 12, padding: 8, borderRadius: 6 }}
            />
          </>
        )}
        {error && <div style={{ color: '#d11', marginBottom: 8, fontSize: 13 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          {(isEgreso) && (
            <button type="submit" disabled={submitting} style={{ background: '#13d06d', color: '#104818', border: 0, fontWeight: 600, borderRadius: 6, padding: "9px 20px" }}>
              {submitting ? "Registrando..." : "Registrar y Abrir Caja"}
            </button>
          )}
          {/* Siempre mostrar cancelar para egreso, y también por cierre_error si quieres que pueda cancelar antes de registrar */}
          {isEgreso && (
            <button type="button" onClick={onClose} disabled={submitting}
              style={{ background: '#eee', border: 0, borderRadius: 6, padding: "9px 20px", fontWeight: 600 }}>Cancelar</button>
          )}
        </div>
      </form>
    </div>
  );
}

export default OpenDrawerReasonModal;