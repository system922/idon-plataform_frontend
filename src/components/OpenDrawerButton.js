// src/components/OpenDrawerButton.jsx
import React, { useState } from 'react';
import { FiInbox, FiAlertCircle } from 'react-icons/fi';
import Modal from './General/Modal';
import Input from './General/Input';
import Button, { IconTextButton, ButtonGroup } from './General/Button';
import CustomCombobox from './General/CustomCombobox';
import { useDrawer } from '../context/DrawerContext';
import { useSession } from '../context/SessionContext';
import '../styles/OpenDrawerButton.css';
import { fetchWithAuth } from '../config/api';
import { usePrinterService } from '../services/usePrinterService';
import {
   X, Save
} from 'react-feather';

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
  const [reasonType, setReasonType] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [concept, setConcept] = useState('');

  React.useEffect(() => {
    if (open) { 
      setReasonType(''); 
      setAmount(''); 
      setPaymentMethod('cash'); 
      setConcept(''); 
    }
  }, [open]);

  const reasonsList = [
    { value: '', label: 'Elige motivo...' },
    { value: 'cierre_error', label: 'Reabrir por cierre accidental' },
    { value: 'egreso_compra', label: 'Retiro/egreso para compras' },
    { value: 'ingreso_extra', label: 'Ingresos extras' },
  ];

  const reasonOptions = reasonsList.map(r => ({
    value: r.value,
    label: r.label
  }));

  const paymentOptions = [
    { value: 'cash', label: 'Efectivo' },
    { value: 'card', label: 'Tarjeta' },
    { value: 'transfer', label: 'Transferencia' },
  ];

  function handleSubmit(e) {
    e.preventDefault();
    if (!reasonType) return;
    if (reasonType === 'ingreso_extra' && !amount) return;
    onSubmit({ 
      reasonType, 
      amount: amount ? parseFloat(amount) : null, 
      paymentMethod, 
      concept 
    });
  }

  if (!open) return null;

  const isIngreso = reasonType === 'ingreso_extra';

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Registrar Motivo de Apertura de Caja"
      size="md"
      closeOnOverlayClick={!submitting}
    >
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <CustomCombobox
            options={reasonOptions}
            value={reasonType}
            onChange={setReasonType}
            placeholder="Elige motivo..."
            filterable={false}
            disabled={submitting}
          />

          {reasonType === 'egreso_compra' && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm, 8px)',
              background: 'var(--info-bg, rgba(59, 130, 246, 0.08))',
              color: 'var(--info, #3b82f6)',
              fontSize: 'var(--font-size-sm, 12px)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
            }}>
              Se abrirá el cajón. Al regresar de la compra aparecerá una burbuja para registrar lo gastado.
            </div>
          )}

          {isIngreso && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--font-size-sm, 12px)',
                  fontWeight: 'var(--font-weight-semibold, 600)',
                  color: 'var(--text-secondary, #4A5568)',
                  marginBottom: '4px',
                }}>
                  Método de pago
                </label>
                <CustomCombobox
                  options={paymentOptions}
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  placeholder="Selecciona método..."
                  filterable={false}
                  disabled={submitting}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--font-size-sm, 12px)',
                  fontWeight: 'var(--font-weight-semibold, 600)',
                  color: 'var(--text-secondary, #4A5568)',
                  marginBottom: '4px',
                }}>
                  Monto *
                </label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={setAmount}
                  disabled={submitting}
                  required
                  size="md"
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--font-size-sm, 12px)',
                  fontWeight: 'var(--font-weight-semibold, 600)',
                  color: 'var(--text-secondary, #4A5568)',
                  marginBottom: '4px',
                }}>
                  Concepto (opcional)
                </label>
                <Input
                  type="text"
                  placeholder="Describe el ingreso..."
                  value={concept}
                  onChange={setConcept}
                  disabled={submitting}
                  size="md"
                />
              </div>
            </div>
          )}

          {error && (
            <div style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm, 8px)',
              background: 'var(--danger-bg, rgba(239, 68, 68, 0.08))',
              color: 'var(--danger, #ef4444)',
              fontSize: 'var(--font-size-sm, 12px)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}>
              <FiAlertCircle size={14} /> {error}
            </div>
          )}

          {reasonType && (
            <div style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'flex-end',
              paddingTop: '12px',
              borderTop: '1px solid var(--border-color, #E2E8F0)',
              marginTop: '4px',
            }}>
              <ButtonGroup>
                <IconTextButton
                  variant=""
                  size="md"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Cancelar
                </IconTextButton>
                <IconTextButton
                  variant="success"
                  size="md"
                  type="submit"
                  disabled={submitting || (isIngreso && !amount)}
                  loading={submitting}
                >
                  {submitting
                    ? (isIngreso ? 'Registrando...' : 'Abriendo...')
                    : (isIngreso ? 'Registrar Ingreso' : 'Abrir Caja')}
                </IconTextButton>
              </ButtonGroup>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function renderJefeData(jefeCaja, jefeName) {
  return jefeCaja?.nombre || jefeName || 'Jefe de Caja';
}

// ── Componente principal ──────────────────────────────────────────────────────
function OpenDrawerButton({ label = "Abrir Caja", onDone, disabled = false, className = "primary" }) {
  const { openCashDrawer } = usePrinterService();
  const { startExpense } = useDrawer();
  const { selectedBusiness, user } = useSession(); // ✅ Obtener del contexto

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [pwOpen, setPwOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalErr, setModalErr] = useState('');
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reasonModalErr, setReasonModalErr] = useState('');
  const [jefeName, setJefeName] = useState('');
  const [jefeCaja, setJefeCaja] = useState(null);
  const [password, setPassword] = useState('');

  // ── Validar clave del jefe de caja ─────────────────────────────────────────
  async function handleValidate(password) {
    setSubmitting(true);
    setModalErr('');
    
    // Obtener schema desde el contexto (TODO EN MEMORIA)
    const schemaLocal = selectedBusiness?.schemaName || 
                        selectedBusiness?.schema || 
                        user?.schemaName || 
                        user?.schema;
    
    console.log('🔍 Validando clave - schemaLocal:', schemaLocal);
    console.log('🔍 selectedBusiness:', selectedBusiness);
    console.log('🔍 user:', user);

    try {
      if (!schemaLocal) {
        throw new Error('No se pudo determinar el schema del negocio. Por favor, selecciona un negocio primero.');
      }

      const res = await fetchWithAuth('/auth/validate-jefe-caja', {
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
      setPassword('');
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
      const resp = await fetchWithAuth('/audit-log', {
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
        const ingresoRes = await fetchWithAuth('/pos/cash-register/income-extra', {
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

      // 3. Abrir cajón según reglas
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
      <ButtonGroup>
        <IconTextButton
          variant="success"
          size="md"
          onClick={() => { 
            setPwOpen(true); 
            setModalErr(''); 
            setErr(''); 
            setReasonModalErr('');
            setPassword('');
          }}
          disabled={disabled || loading}
        >
          <FiInbox size={14} style={{ marginRight: '4px' }} />
          {loading ? 'Abriendo...' : label}
        </IconTextButton>
      </ButtonGroup>

      {err && (
        <div style={{
          padding: '8px 12px',
          borderRadius: 'var(--radius-sm, 8px)',
          background: 'var(--danger-bg, rgba(239, 68, 68, 0.08))',
          color: 'var(--danger, #ef4444)',
          fontSize: 'var(--font-size-sm, 12px)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginTop: '4px',
          border: '1px solid rgba(239, 68, 68, 0.2)',
        }}>
          <FiAlertCircle size={14} /> {err}
        </div>
      )}

      {/* Modal de contraseña */}
      <Modal
        isOpen={pwOpen}
        onClose={() => { 
          if (!submitting) {
            setPwOpen(false);
            setPassword('');
          }
        }}
        title="Clave Jefe/a de Caja"
        size="sm"
        closeOnOverlayClick={!submitting}
      >
        <form onSubmit={(e) => {
          e.preventDefault();
          if (password.trim()) {
            handleValidate(password);
          }
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Input
              type="password"
              placeholder="Ingresar clave..."
              value={password}
              onChange={setPassword}
              autoFocus
              disabled={submitting}
              size="md"
              required
            />
            
            {modalErr && (
              <div style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm, 8px)',
                background: 'var(--danger-bg, rgba(239, 68, 68, 0.08))',
                color: 'var(--danger, #ef4444)',
                fontSize: 'var(--font-size-sm, 12px)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}>
                <FiAlertCircle size={14} /> {modalErr}
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'flex-end',
              paddingTop: '8px',
              borderTop: '1px solid var(--border-color, #E2E8F0)',
            }}>
              <ButtonGroup>
                <IconTextButton
                  variant="danger"
                  size="md"
                  icon={<X size={14} />}
                  onClick={() => { 
                    if (!submitting) {
                      setPwOpen(false);
                      setPassword('');
                    }
                  }}
                  disabled={submitting}
                >
                  Cancelar
                </IconTextButton>
                <IconTextButton
                  variant="success"
                  size="md"
                  type="submit"
                  icon={<Save size={14} />}
                  disabled={submitting || !password.trim()}
                  loading={submitting}
                >
                  Validar
                </IconTextButton>
              </ButtonGroup>
            </div>
          </div>
        </form>
      </Modal>

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