// src/components/OpenDrawerButton.jsx
import React, { useState } from 'react';
import { FiInbox, FiAlertCircle } from 'react-icons/fi';
import PasswordModal from './PasswordModal';
import { useDrawer } from '../context/DrawerContext';  // 👈 contexto global
import '../styles/OpenDrawerButton.css';
import { fetchWithAuth } from '../config/apiBase';
import { useQzTray } from './useQzTray';
import { usePrinterService } from '../services/usePrinterService';

function getOperatorUser() {
  try {
    return JSON.parse(localStorage.getItem('idonUser') || '{}');
  } catch {
    return {};
  }
}

const METODO_LABEL = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia' };

// ── Modal de selección de motivo ──────────────────────────────────────────────
function OpenDrawerReasonModal({ open, onSubmit, onClose, submitting, error }) {
  const [reasonType, setReasonType]     = useState('');
  const [amount, setAmount]             = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [concept, setConcept]           = useState('');

  React.useEffect(() => {
    if (open) { setReasonType(''); setAmount(''); setPaymentMethod('cash'); setConcept(''); }
  }, [open]);

  const reasonsList = [
    { value: '', label: 'Elige motivo...' },
    { value: 'cierre_error',   label: 'Reabrir por cierre accidental' },
    { value: 'egreso_compra',  label: 'Retiro/egreso para compras' },
    { value: 'ingreso_extra',  label: 'Ingresos extras' },
  ];

  function handleSubmit(e) {
    e.preventDefault();
    if (!reasonType) return;
    if (reasonType === 'ingreso_extra' && !amount) return;
    onSubmit({ reasonType, amount: amount ? parseFloat(amount) : null, paymentMethod, concept });
  }

  if (!open) return null;

  const isIngreso = reasonType === 'ingreso_extra';

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
          {reasonsList.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>

        {reasonType === 'egreso_compra' && (
          <p className="odr-modal-info">
            Se abrirá el cajón. Al regresar de la compra aparecerá una burbuja para registrar lo gastado.
          </p>
        )}

        {isIngreso && (
          <div style={{ marginTop: 4 }}>
            <div>
              <label>Método de pago</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                disabled={submitting}
              >
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="transfer">Transferencia</option>
              </select>
            </div>
            <div>
              <label>Monto *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
            <div>
              <label>Concepto (opcional)</label>
              <input
                type="text"
                placeholder="Describe el ingreso..."
                value={concept}
                onChange={e => setConcept(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>
        )}

        {error && <div className="odr-error">{error}</div>}

        {reasonType && (
          <div className="odr-modal-buttons">
            <button type="submit" disabled={submitting || (isIngreso && !amount)}>
              {submitting
                ? (isIngreso ? 'Registrando...' : 'Abriendo...')
                : (isIngreso ? 'Registrar Ingreso' : 'Abrir Caja')}
            </button>
            <button type="button" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function renderJefeData(jefeCaja, jefeName) {
  return jefeCaja?.nombre || jefeName || 'Jefe de Caja';
}

// ── Componente principal ──────────────────────────────────────────────────────
function OpenDrawerButton({ label = "Abrir Caja", onDone, disabled = false, className = "" }) {
  useQzTray();                                    // establece conexión QZ Tray
  const { openCashDrawer } = usePrinterService(); // abre cajón vía ESC/POS
  const { startExpense } = useDrawer();   // 👈 contexto global

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [pwOpen, setPwOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalErr, setModalErr] = useState('');
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reasonModalErr, setReasonModalErr] = useState('');
  const [jefeName, setJefeName] = useState('');
  const [jefeCaja, setJefeCaja] = useState(null);

  // ── Validar clave del jefe de caja ─────────────────────────────────────────
  async function handleValidate(password) {
    setSubmitting(true);
    setModalErr('');
    const selectedBusiness = JSON.parse(localStorage.getItem('selectedBusiness') || 'null');
    const schemaLocal = selectedBusiness?.schemaName;
    try {
      if (!schemaLocal) throw new Error('No se pudo determinar el schema del negocio');

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

      const data = await res.json();
      const nombreCompleto = data?.jefe?.nombre || 'Jefe de Caja';
      setJefeName(nombreCompleto);
      setJefeCaja({ nombre: nombreCompleto });
      setPwOpen(false);
      setReasonOpen(true);
    } catch (e) {
      setModalErr(e.message || 'Error validando clave');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Procesar selección de motivo ───────────────────────────────────────────
  async function handleReasonSubmit({ reasonType, amount, paymentMethod, concept }) {
    setLoading(true);
    setReasonModalErr('');

    const operador = getOperatorUser();
    if (!operador?.id) {
      setReasonModalErr('No se encontró información del usuario. Inicia sesión nuevamente.');
      setLoading(false);
      return;
    }

    const jefeCompleto = renderJefeData(jefeCaja, jefeName);
    let action, description;

    if (reasonType === 'cierre_error') {
      action = 'caja_abierta';
      description = `Caja abierta por autorización de ${jefeCompleto}. Motivo: Reabrir por cierre accidental.`;
    } else if (reasonType === 'egreso_compra') {
      action = 'drawer_expense';
      description = `Caja abierta por autorización de ${jefeCompleto}. Motivo: Retiro para compras (monto pendiente de registrar).`;
    } else if (reasonType === 'ingreso_extra') {
      action = 'income_extra';
      description = `Ingreso extra registrado por ${jefeCompleto}. Método: ${METODO_LABEL[paymentMethod] || paymentMethod}, Monto: $${Number(amount).toFixed(2)}${concept ? `, Concepto: ${concept}` : ''}.`;
    } else {
      setReasonModalErr('Motivo no válido');
      setLoading(false);
      return;
    }

    try {
      // 1. Guardar auditoría
      const resp = await fetchWithAuth('/api/audit-log', {
        method: 'POST',
        body: JSON.stringify({
          user_id: operador.id,
          table_name: 'cash_drawer',
          action,
          description,
          new_values: reasonType === 'ingreso_extra' ? { amount, payment_method: paymentMethod, concept } : null,
          reason: '',
        }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setReasonModalErr(data?.error || 'Error registrando auditoría');
        setLoading(false);
        return;
      }

      // 2. Si es ingreso extra → guardar en tabla incomes_extras
      if (reasonType === 'ingreso_extra') {
        const ingresoRes = await fetchWithAuth('/api/pos/cash-register/income-extra', {
          method: 'POST',
          body: JSON.stringify({
            amount,
            payment_method: paymentMethod,
            description: concept || null,
          }),
        });
        if (!ingresoRes.ok) {
          const data = await ingresoRes.json().catch(() => ({}));
          setReasonModalErr(data?.error || 'Error guardando ingreso extra');
          setLoading(false);
          return;
        }
      }

      // 3. Abrir cajón según reglas:
      //    - cierre_error  → siempre abre
      //    - egreso_compra → siempre abre
      //    - ingreso_extra → solo abre si el método de pago es efectivo
      const debeAbrirCajon =
        reasonType === 'cierre_error' ||
        reasonType === 'egreso_compra' ||
        (reasonType === 'ingreso_extra' && paymentMethod === 'cash');

      if (debeAbrirCajon) {
        await openCashDrawer().catch(() => {});
      }

      setReasonOpen(false);

      // 4. Si es egreso → guardar pendiente en contexto global
      if (reasonType === 'egreso_compra') {
        startExpense({
          userId: operador.id,
          jefeName: jefeCompleto,
          reasonType: 'egreso_compra',
          onDoneCallback: () => { if (typeof onDone === 'function') onDone(); }
        });
      } else {
        if (typeof onDone === 'function') onDone();
      }
    } catch (e) {
      setReasonModalErr(e.message || 'Error al procesar');
    } finally {
      setLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={`open-drawer-btn ${className}`}>
      <button
        type="button"
        onClick={() => { setPwOpen(true); setModalErr(''); setErr(''); setReasonModalErr(''); }}
        disabled={disabled || loading}
      >
        <FiInbox size={18} /> {loading ? 'Abriendo...' : label}
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