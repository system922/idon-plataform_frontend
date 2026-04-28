import React, { useState } from 'react';
import { useCashDrawer } from '../hooks/useCashDrawer';
import { FiInbox } from 'react-icons/fi';
import PasswordModal from './PasswordModal';
import '../styles/OpenDrawerButton.css';

import { fetchWithAuth } from '../config/apiBase';

function getOperatorUser() {
  try {
    // ----- Usa idonUser, no user -----
    return JSON.parse(localStorage.getItem('idonUser') || '{}');
  } catch {
    return {};
  }
}

function OpenDrawerReasonModal({ open, onSubmit, onClose, submitting, error }) {
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [reasonType, setReasonType] = useState('');

  React.useEffect(() => {
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

  const isEgreso = reasonType === 'egreso_compra';

  function handleSubmit(e) {
    e.preventDefault();
    if (!reasonType) return;
    if (reasonType === 'egreso_compra' && !amount) return;
    onSubmit({ reasonType, reason, amount: amount ? parseFloat(amount) : null });
  }

  if (!open) return null;

  return (
    <div className="odr-modal-overlay">
      <form onSubmit={handleSubmit} className="odr-modal-form">
        <h3>Registrar Motivo de Apertura de Caja</h3>
        <select
          value={reasonType}
          disabled={submitting}
          onChange={e => setReasonType(e.target.value)}
          required
        >
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
              required
            />
            <textarea
              placeholder="Comentario adicional (motivo)"
              value={reason}
              onChange={e => setReason(e.target.value)}
              disabled={submitting}
              rows={2}
            />
          </>
        )}
        {error && <div className="odr-error">{error}</div>}
        <div className="odr-modal-buttons">
          {reasonType && (
            <>
              <button type="submit" disabled={submitting}>
                {submitting ? "Registrando..." : "Registrar y Abrir Caja"}
              </button>
              <button type="button" onClick={onClose} disabled={submitting}>
                Cancelar
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}

function OpenDrawerButton({
  label = "Abrir Caja",
  onDone,
  disabled = false,
  className = "",
}) {
  const openDrawer = useCashDrawer();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [pwOpen, setPwOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalErr, setModalErr] = useState('');
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reasonModalErr, setReasonModalErr] = useState('');
  const [jefeName, setJefeName] = useState('');

  async function handleValidate(password) {
    setSubmitting(true);
    setModalErr('');
    const selectedBusiness = JSON.parse(localStorage.getItem('selectedBusiness') || 'null');
    const schemaLocal = selectedBusiness?.schemaName;

    try {
      if (!schemaLocal) throw new Error('No se pudo determinar el schema del negocio');
      // -------- aquí el cambio: fetchWithAuth en vez de fetch/API_BASE -----
      const res = await fetchWithAuth('/api/auth/validate-jefe-caja', {
        method: 'POST',
        body: JSON.stringify({ password, schema: schemaLocal }),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 404) {
          setModalErr('Clave no autorizada para abrir caja');
          return;
        }
        const error = await res.json();
        setModalErr(error.error || 'Error validando clave');
        return;
      }
      const jefe = await res.json();
      setJefeName(jefe.nombre || jefe.email || jefe.firstName || 'Jefe de Caja');
      setPwOpen(false);
      setReasonOpen(true);
    } catch (e) {
      setModalErr(e.message || 'Error validando clave');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReasonSubmit({ reasonType, reason, amount }) {
    setLoading(true);
    setReasonModalErr('');
    const operador = getOperatorUser();

    if (!operador || !operador.id) {
      setReasonModalErr("No se encontró información del usuario operador. Inicia sesión nuevamente.");
      setLoading(false);
      return;
    }

    const user_id = operador.id;
    let action, description, new_values;

    if (reasonType === 'cierre_error') {
      action = "caja_abierta";
      description = `Caja abierta por autorización del jefe de caja: ${jefeName}. Acción: Reabrir por cierre accidental.`;
      new_values = null;
    } else if (reasonType === 'egreso_compra') {
      action = "drawer_expense";
      description = `Caja abierta por autorización del jefe de caja: ${jefeName}. Acción: Retiro/egreso para compras. Motivo: ${reason}`;
      new_values = { amount: amount || null };
    } else {
      setReasonModalErr("Motivo no válido");
      setLoading(false);
      return;
    }

    const payload = { user_id, table_name: "cash_drawer", action, description, new_values, reason };

    try {
      const resp = await fetchWithAuth('/api/audit-log', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setReasonModalErr(data?.error || "Error registrando auditoría o abriendo caja");
        setLoading(false);
        return;
      }

      const ok = await openDrawer();
      if (!ok) setErr('No se pudo abrir la caja');
      else if (typeof onDone === 'function') onDone();
      setReasonOpen(false);
    } catch (e) {
      setReasonModalErr(e.message || 'Error registrando auditoría o abriendo caja');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`open-drawer-btn ${className}`}>
      <button
        type="button"
        onClick={() => {
          setPwOpen(true);
          setModalErr('');
          setErr('');
          setReasonModalErr('');
        }}
        disabled={disabled || loading}
      >
        <FiInbox size={18} /> {loading ? "Abriendo..." : label}
      </button>
      {err && <div className="odr-error-msg">{err}</div>}

      <PasswordModal
        open={pwOpen}
        submitting={submitting}
        onClose={() => { if (!submitting) setPwOpen(false); }}
        onSubmit={handleValidate}
        error={modalErr}
      />
      <OpenDrawerReasonModal
        open={reasonOpen}
        onClose={() => { if (!loading) setReasonOpen(false); }}
        onSubmit={handleReasonSubmit}
        submitting={loading}
        error={reasonModalErr}
      />
    </div>
  );
}

export default OpenDrawerButton;