import React, { useState } from 'react';
import { useCashDrawer } from '../hooks/useCashDrawer';
import { FiInbox, FiAlertCircle } from 'react-icons/fi';
import PasswordModal from './PasswordModal';
import '../styles/OpenDrawerButton.css';
import { fetchWithAuth } from '../config/apiBase';

function getOperatorUser() {
  try {
    return JSON.parse(localStorage.getItem('idonUser') || '{}');
  } catch {
    return {};
  }
}

// ── Modal de selección de motivo (sin pedir monto para egreso) ────────────────
function OpenDrawerReasonModal({ open, onSubmit, onClose, submitting, error }) {
  const [reasonType, setReasonType] = useState('');

  React.useEffect(() => {
    if (open) setReasonType('');
  }, [open]);

  const reasonsList = [
    { value: '',             label: 'Elige motivo...' },
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
          <p style={{ fontSize: 13, color: '#f39c12', margin: '10px 0 0',
            background: 'rgba(243,156,18,0.1)', borderRadius: 8, padding: '8px 12px' }}>
            Se abrirá el cajón. Al regresar de la compra una ventana te pedirá registrar lo gastado.
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

// ── Burbuja flotante persistente ──────────────────────────────────────────────
function EgressBubble({ onSave, saving, error, openDrawer }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [opening, setOpening] = useState(false);

  async function handleOpenDrawer() {
    setOpening(true);
    try { await openDrawer(); } finally { setOpening(false); }
  }

  function handleSave(e) {
    e.preventDefault();
    if (!amount || isNaN(parseFloat(amount))) return;
    onSave({ amount: parseFloat(amount), reason });
  }

  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 2000,
      background: '#1a1a2e', border: '2px solid #f39c12',
      borderRadius: 16, padding: '20px 22px', width: 320,
      boxShadow: '0 8px 40px rgba(243,156,18,0.4)',
    }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <FiAlertCircle size={20} color="#f39c12" />
        <span style={{ color: '#f39c12', fontWeight: 700, fontSize: 14 }}>
          Registra lo gastado al regresar
        </span>
      </div>
      <p style={{ color: '#ffffffaa', fontSize: 12, margin: '0 0 14px', lineHeight: 1.5 }}>
        Esta ventana no puede cerrarse hasta registrar el monto gastado.
      </p>

      {/* Botón abrir cajón sin clave */}
      <button
        type="button"
        onClick={handleOpenDrawer}
        disabled={opening}
        style={{
          width: '100%', marginBottom: 14, padding: '8px 0',
          background: '#2c3e50', color: '#fff',
          border: '1px solid #ffffff33', borderRadius: 8,
          cursor: 'pointer', fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
      >
        <FiInbox size={14} />
        {opening ? 'Abriendo...' : 'Abrir Cajón'}
      </button>

      {/* Formulario de gasto */}
      <form onSubmit={handleSave}>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Monto gastado *"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          disabled={saving}
          required
          style={{
            width: '100%', padding: '8px 10px', borderRadius: 8,
            border: '1px solid #ffffff33', background: '#0d0d1a',
            color: '#fff', fontSize: 13, marginBottom: 10, boxSizing: 'border-box',
          }}
        />
        <textarea
          placeholder="Comentario / descripción de la compra"
          value={reason}
          onChange={e => setReason(e.target.value)}
          disabled={saving}
          rows={2}
          style={{
            width: '100%', padding: '8px 10px', borderRadius: 8,
            border: '1px solid #ffffff33', background: '#0d0d1a',
            color: '#fff', fontSize: 13, marginBottom: 10,
            resize: 'vertical', boxSizing: 'border-box',
          }}
        />
        {error && (
          <div style={{ color: '#e74c3c', fontSize: 12, marginBottom: 8 }}>{error}</div>
        )}
        <button
          type="submit"
          disabled={saving || !amount}
          style={{
            width: '100%', padding: '10px 0', borderRadius: 8,
            background: amount ? '#27ae60' : '#444',
            color: '#fff', border: 'none', fontWeight: 700, fontSize: 14,
            cursor: amount ? 'pointer' : 'not-allowed', transition: 'background 0.2s',
          }}
        >
          {saving ? 'Guardando...' : 'Guardar Gasto y Cerrar'}
        </button>
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

  const [loading,        setLoading       ] = useState(false);
  const [err,            setErr           ] = useState('');
  const [pwOpen,         setPwOpen        ] = useState(false);
  const [submitting,     setSubmitting    ] = useState(false);
  const [modalErr,       setModalErr      ] = useState('');
  const [reasonOpen,     setReasonOpen    ] = useState(false);
  const [reasonModalErr, setReasonModalErr] = useState('');
  const [jefeName,       setJefeName      ] = useState('');
  const [jefeCaja,       setJefeCaja      ] = useState(null);
  const [bubbleOpen,     setBubbleOpen    ] = useState(false);
  const [bubbleSaving,   setBubbleSaving  ] = useState(false);
  const [bubbleErr,      setBubbleErr     ] = useState('');

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
      action      = 'caja_abierta';
      description = `Caja abierta por autorización de ${jefeCompleto}. Motivo: Reabrir por cierre accidental.`;
    } else if (reasonType === 'egreso_compra') {
      action      = 'drawer_expense';
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
          user_id:    operador.id,
          table_name: 'cash_drawer',
          action,
          description,
          new_values: null,
          reason:     '',
        }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setReasonModalErr(data?.error || 'Error registrando auditoría');
        setLoading(false);
        return;
      }

      // 2. Abrir cajón
      const ok = await openDrawer();
      if (!ok) { setErr('No se pudo abrir la caja'); setLoading(false); return; }

      setReasonOpen(false);

      // 3. Si es egreso → mostrar burbuja; si no → notificar done
      if (reasonType === 'egreso_compra') {
        setBubbleOpen(true);
      } else {
        if (typeof onDone === 'function') onDone();
      }
    } catch (e) {
      setReasonModalErr(e.message || 'Error al procesar');
    } finally {
      setLoading(false);
    }
  }

  // ── Guardar gasto desde la burbuja ─────────────────────────────────────────
  async function handleBubbleSave({ amount, reason }) {
    setBubbleSaving(true);
    setBubbleErr('');
    const operador = getOperatorUser();
    try {
      const resp = await fetchWithAuth('/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          amount,
          description: `Retiro/egreso para compras${reason ? ': ' + reason : ''}`,
          notes:       reason || null,
          category_id: '0f6dfe39-ef55-4765-8116-95f5c94bb7ca',
          created_by:  operador.id || null,
        }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setBubbleErr(data?.error || 'Error registrando el gasto');
        return;
      }

      setBubbleOpen(false);
      if (typeof onDone === 'function') onDone();
    } catch (e) {
      setBubbleErr(e.message || 'Error registrando el gasto');
    } finally {
      setBubbleSaving(false);
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

      {bubbleOpen && (
        <EgressBubble
          onSave={handleBubbleSave}
          saving={bubbleSaving}
          error={bubbleErr}
          openDrawer={openDrawer}
        />
      )}
    </div>
  );
}

export default OpenDrawerButton;
