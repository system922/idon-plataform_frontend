// src/components/OpenDrawerButton.jsx
import React, { useState } from 'react';
import { useCashDrawer } from '../hooks/useCashDrawer';
import { FiInbox, FiAlertCircle } from 'react-icons/fi';
import PasswordModal from './PasswordModal';
import { useDrawer } from '../context/DrawerContext';  // 👈 contexto global
import '../styles/OpenDrawerButton.css';
import { fetchWithAuth } from '../config/apiBase';

function getOperatorUser() {
  try {
    return JSON.parse(localStorage.getItem('idonUser') || '{}');
  } catch {
    return {};
  }
}

// ── Modal de selección de motivo (sin cambios) ──────────────────────────────
function OpenDrawerReasonModal({ open, onSubmit, onClose, submitting, error }) {
  const [reasonType, setReasonType] = useState('');

  React.useEffect(() => {
    if (open) setReasonType('');
  }, [open]);

  const reasonsList = [
    { value: '', label: 'Elige motivo...' },
    { value: 'cierre_error', label: 'Reabrir por cierre accidental' },
    { value: 'egreso_compra', label: 'Retiro/egreso para compras' },
  ];

  function handleSubmit(e) {
    e.preventDefault();
    if (!reasonType) return;
    onSubmit({ reasonType });
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
          {reasonsList.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>

        {reasonType === 'egreso_compra' && (
          <p style={{
            fontSize: 13, color: '#f39c12', margin: '10px 0 0',
            background: 'rgba(243,156,18,0.1)', borderRadius: 8, padding: '8px 12px'
          }}>
            Se abrirá el cajón. Al regresar de la compra aparecerá una burbuja para registrar lo gastado.
          </p>
        )}

        {error && <div className="odr-error">{error}</div>}

        {reasonType && (
          <div className="odr-modal-buttons">
            <button type="submit" disabled={submitting}>
              {submitting ? 'Abriendo...' : 'Abrir Caja'}
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
  const openDrawer = useCashDrawer();
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
  async function handleReasonSubmit({ reasonType }) {
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
          new_values: null,
          reason: '',
        }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setReasonModalErr(data?.error || 'Error registrando auditoría');
        setLoading(false);
        return;
      }

      // 2. Abrir cajón (verificación segura)
      const openDrawerFn = typeof openDrawer === 'function' ? openDrawer : openDrawer?.openDrawer;
      if (typeof openDrawerFn === 'function') {
        await openDrawerFn().catch(() => {});
      } else {
        console.warn('openDrawer no es una función válida:', openDrawer);
      }

      setReasonOpen(false);

      // 3. Si es egreso → guardar pendiente en contexto global
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