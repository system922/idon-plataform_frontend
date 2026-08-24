import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { useConfirm, useAlert } from '../../context/ConfirmContext';
import Table from '../../components/General/Table';
import Modal from '../../components/General/Modal';
import CustomCombobox from '../../components/General/CustomCombobox';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import Input from '../../components/General/Input';
import {
  FiRefreshCw, FiCheck, FiAlertCircle,
  FiXCircle, FiCheckCircle, FiCalendar, FiMail
} from 'react-icons/fi';
import { adminApi } from '../../config/api';

const SUB_BADGE = {
  active:             { cls: 'admin-badge-success', label: 'Activa' },
  suspended:          { cls: 'admin-badge-danger',  label: 'Suspendida' },
  pending_activation: { cls: 'admin-badge-warning', label: 'Pendiente' },
};

function payInfo(nextBillingAt, status) {
  if (status === 'suspended') return { text: 'Suspendida', color: '#ef4444', bg: 'rgba(239,68,68,.1)' };
  if (!nextBillingAt)          return { text: 'Sin fecha',  color: 'var(--text-muted)', bg: 'transparent' };
  const days = Math.floor((new Date(nextBillingAt) - new Date()) / 86400000);
  if (days < 0)   return { text: `Vencido ${Math.abs(days)}d`, color: '#ef4444', bg: 'rgba(239,68,68,.1)' };
  if (days === 0) return { text: 'Vence hoy',                  color: '#ef4444', bg: 'rgba(239,68,68,.1)' };
  if (days <= 3)  return { text: `Vence en ${days}d`,          color: '#f59e0b', bg: 'rgba(245,158,11,.1)' };
  if (days <= 7)  return { text: `${days}d restantes`,         color: '#ff8c42', bg: 'rgba(255,140,66,.1)' };
  return { text: `${days}d restantes`, color: '#22c55e', bg: 'rgba(34,197,94,.1)' };
}

export default function Payments() {
  const { showConfirm } = useConfirm();
  const alert = useAlert();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [acting, setActing] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [emailModal, setEmailModal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await adminApi.get('/admin/payments');
      setData(r.data || r || []);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Usa el nuevo endpoint /payments/record
  const handleMarkPaid = async (subscriptionId, payload) => {
    setActing(subscriptionId);
    try {
      await adminApi.post('/admin/payments/record', {
        subscriptionId,
        ...payload
      });
      setPayModal(null);
      await load();
      alert.success('Pago registrado correctamente', '✅ Éxito');
    } catch (e) {
      alert.error('Error: ' + e.message);
    } finally {
      setActing(null);
    }
  };

  const handleSuspend = async (subId, businessName) => {
    if (!await showConfirm({
      title: '⚠️ Suspender negocio',
      message: `¿Suspender el negocio "${businessName}"? El dueño no podrá iniciar sesión hasta que se reactive.`,
      confirmText: 'Suspender',
      cancelText: 'Cancelar',
      danger: true,
    })) return;
    setActing(subId);
    try {
      await adminApi.post(`/admin/subscriptions/${subId}/suspend`, {});
      await load();
      alert.success('Negocio suspendido correctamente', '✅ Éxito');
    } catch (e) {
      alert.error('Error: ' + e.message);
    } finally {
      setActing(null);
    }
  };

  const handleReactive = async (subId, businessName) => {
    if (!await showConfirm({
      title: '🔄 Reactivar negocio',
      message: `¿Reactivar el negocio "${businessName}"? El dueño podrá iniciar sesión nuevamente.`,
      confirmText: 'Reactivar',
      cancelText: 'Cancelar',
      danger: false,
    })) return;
    setActing(subId);
    try {
      await adminApi.post(`/admin/subscriptions/${subId}/reactivate`, {});
      await load();
      alert.success('Negocio reactivado correctamente', '✅ Éxito');
    } catch (e) {
      alert.error('Error: ' + e.message);
    } finally {
      setActing(null);
    }
  };

  const now = new Date();

  const filteredData = useMemo(() => {
    let result = data;

    if (filter === 'overdue') {
      result = result.filter(r => {
        const days = r.next_billing_at ? Math.floor((new Date(r.next_billing_at) - now) / 86400000) : 9999;
        return days < 0 && r.sub_status !== 'suspended';
      });
    } else if (filter === 'upcoming') {
      result = result.filter(r => {
        const days = r.next_billing_at ? Math.floor((new Date(r.next_billing_at) - now) / 86400000) : 9999;
        return days >= 0 && days <= 7;
      });
    } else if (filter === 'active') {
      result = result.filter(r => r.sub_status === 'active');
    } else if (filter === 'suspended') {
      result = result.filter(r => r.sub_status === 'suspended');
    } else if (filter === 'no_sub') {
      result = result.filter(r => !r.sub_id);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(r =>
        r.business_name?.toLowerCase().includes(term) ||
        r.owner_name?.toLowerCase().includes(term) ||
        r.owner_email?.toLowerCase().includes(term) ||
        r.slug?.toLowerCase().includes(term)
      );
    }

    return result;
  }, [data, filter, searchTerm]);

  const counts = useMemo(() => ({
    total: data.length,
    overdue: data.filter(r => r.next_billing_at && Math.floor((new Date(r.next_billing_at)-now)/86400000) < 0 && r.sub_status !== 'suspended').length,
    upcoming: data.filter(r => { const d = r.next_billing_at ? Math.floor((new Date(r.next_billing_at)-now)/86400000) : 9999; return d>=0&&d<=7; }).length,
    suspended: data.filter(r => r.sub_status === 'suspended').length,
    no_sub: data.filter(r => !r.sub_id).length,
  }), [data]);

  const filterOptions = [
    { value: 'all', label: `Todos (${counts.total})` },
    { value: 'overdue', label: `Vencidos (${counts.overdue})` },
    { value: 'upcoming', label: `Esta semana (${counts.upcoming})` },
    { value: 'active', label: 'Activos' },
    { value: 'suspended', label: `Suspendidos (${counts.suspended})` },
    { value: 'no_sub', label: `Sin suscripción (${counts.no_sub})` },
  ];

  const columns = [
    {
      accessor: 'business_name',
      label: 'Negocio',
      render: (item) => (
        <div>
          <strong>{item.business_name}</strong>
          <div className="payment-business-type">{item.business_type} · {item.slug}</div>
          {!item.business_active && item.sub_status === 'suspended' && (
            <span className="payment-login-blocked">LOGIN BLOQUEADO</span>
          )}
        </div>
      ),
    },
    {
      accessor: 'owner_name',
      label: 'Propietario',
      render: (item) => (
        <div>
          <div>{item.owner_name || '—'}</div>
          <div className="payment-owner-email">{item.owner_email}</div>
        </div>
      ),
    },
    {
      accessor: 'subscription',
      label: 'Suscripción',
      render: (item) => {
        const sbdg = SUB_BADGE[item.sub_status] || SUB_BADGE.pending_activation;
        return item.sub_id ? (
          <div>
            <span className={`admin-badge ${sbdg.cls}`}>{sbdg.label}</span>
            <div className="payment-billing-period">
              {item.billing_period === 'monthly' ? 'Mensual' : 'Anual'}
            </div>
          </div>
        ) : (
          <span className="admin-badge admin-badge-warning">Sin suscripción</span>
        );
      },
    },
    {
      accessor: 'next_billing_at',
      label: 'Próximo cobro',
      render: (item) => (
        <div>
          {item.next_billing_at ? (
            <>
              <FiCalendar size={11} className="payment-calendar-icon" />
              {new Date(item.next_billing_at).toLocaleDateString('es-EC')}
            </>
          ) : '—'}
          {item.last_paid_at && (
            <div className="payment-last-paid">
              <FiCheck size={10} /> Últ: {new Date(item.last_paid_at).toLocaleDateString('es-EC')}
            </div>
          )}
        </div>
      ),
    },
    {
      accessor: 'total_amount',
      label: 'Total',
      align: 'center',
      render: (item) => (
        <div>
          <div className="payment-total-amount">
            ${parseFloat(item.total_amount || 0).toFixed(2)}
          </div>
          {item.discount_percentage > 0 && (
            <div className="payment-discount">-{item.discount_percentage}% dto.</div>
          )}
        </div>
      ),
    },
    {
      accessor: 'payment_status',
      label: 'Estado de pago',
      render: (item) => {
        const pi = payInfo(item.next_billing_at, item.sub_status);
        return item.sub_id ? (
          <span className="payment-status-badge" style={{ color: pi.color, background: pi.bg, borderColor: `${pi.color}33` }}>
            {pi.text}
          </span>
        ) : '—';
      },
    },
    {
      accessor: 'actions',
      label: 'Acciones',
      align: 'center',
      render: (item) => (
        <div className="payment-actions">
          {item.sub_id && item.sub_status !== 'suspended' && (
            <IconTextButton
              variant="success"
              size="sm"
              inline={true}
              icon={<FiCheck size={12} />}
              onClick={() => setPayModal(item)}
              disabled={acting === item.sub_id}
              className="payment-btn-paid"
            >
              Marcar pagado
            </IconTextButton>
          )}
          {item.sub_id && item.sub_status === 'active' && (
            <IconTextButton
              variant="danger"
              size="sm"
              inline={true}
              icon={<FiXCircle size={12} />}
              onClick={() => handleSuspend(item.sub_id, item.business_name)}
              disabled={acting === item.sub_id}
            >
              Suspender
            </IconTextButton>
          )}
          {item.sub_status === 'suspended' && (
            <IconTextButton
              variant="success"
              size="sm"
              inline={true}
              icon={<FiCheckCircle size={12} />}
              onClick={() => handleReactive(item.sub_id, item.business_name)}
              disabled={acting === item.sub_id}
            >
              Reactivar
            </IconTextButton>
          )}
          {item.owner_email && (
            <IconTextButton
              variant="info"
              size="sm"
              inline={true}
              icon={<FiMail size={12} />}
              onClick={() => setEmailModal(item)}
              disabled={acting === item.sub_id}
              className="payment-btn-email"
            >
              Enviar email
            </IconTextButton>
          )}
        </div>
      ),
    },
  ];

  const toolbar = (
    <div className="payments-toolbar">
      <CustomCombobox
        options={filterOptions}
        value={filter}
        onChange={setFilter}
        placeholder="Filtrar por estado"
        filterable={false}
        size="sm"
        className="payments-filter"
      />
    </div>
  );

  const refreshButton = (
    <button
      onClick={handleRefresh}
      className="dashboard-refresh-btn-header"
      disabled={refreshing}
      title="Actualizar datos"
    >
      <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  return (
    <PageTemplate
      title="PAGOS Y SUSCRIPCIONES"
      subtitle="Control de facturación, fechas de pago y estado de negocios"
      theme="admin"
      loading={loading}
      error={error}
      onRetry={load}
      headerAction={refreshButton}
    >
      {error && (
        <div className="alert alert-error">
          <FiAlertCircle size={16} /> {error}
        </div>
      )}

      <Table
        data={filteredData}
        columns={columns}
        keyField="business_id"
        title="Negocios"
        subtitle={`${filteredData.length} ${filteredData.length === 1 ? 'negocio' : 'negocios'} encontrados`}
        toolbar={toolbar}
        searchable={true}
        searchPlaceholder="Buscar por negocio, propietario o email..."
        searchFields={['business_name', 'owner_name', 'owner_email', 'slug']}
        pagination={true}
        itemsPerPage={10}
        itemsPerPageOptions={[10, 25, 50, 100]}
        loading={loading}
        emptyMessage={
          searchTerm || filter !== 'all'
            ? 'No hay negocios que coincidan con los filtros aplicados'
            : 'No hay negocios registrados'
        }
        striped={true}
        hoverable={true}
        bordered={false}
        compact={false}
      />

      {payModal && (
        <PayModal
          row={payModal}
          onClose={() => setPayModal(null)}
          onConfirm={handleMarkPaid}
        />
      )}

      {emailModal && (
        <EmailModal
          row={emailModal}
          onClose={() => setEmailModal(null)}
        />
      )}
    </PageTemplate>
  );
}

// ============================================================
// Modal de pago con selector de meses y visualización del período
// ============================================================
function PayModal({ row, onClose, onConfirm }) {
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('transferencia');
  const [reference, setReference] = useState('');
  const [months, setMonths] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Calcular el mes actual a cobrar basado en next_billing_at
  const getCurrentMonth = () => {
    if (!row.next_billing_at) {
      return new Date();
    }
    const next = new Date(row.next_billing_at);
    const now = new Date();
    // Si next es menor que hoy, significa que está vencido, usamos hoy
    if (next < now) {
      return now;
    }
    return next;
  };

  const currentMonth = getCurrentMonth();
  const currentMonthStr = currentMonth.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' });

  // Calcular el período que se cubrirá con los meses seleccionados
  const getPeriodEnd = () => {
    const base = new Date(currentMonth);
    base.setDate(1);
    const end = new Date(base);
    end.setMonth(end.getMonth() + months);
    end.setDate(1);
    return end;
  };

  const periodEnd = getPeriodEnd();
  const periodEndStr = periodEnd.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' });

  const handleConfirm = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        notes,
        payment_method: paymentMethod,
        reference: paymentMethod === 'transferencia' ? reference : '',
        months,
      };
      await onConfirm(row.sub_id, payload);
    } catch (e) {
      setError(e.message || 'Error al registrar pago');
    } finally {
      setSaving(false);
    }
  };

  const footer = (
    <>
      {error && (
        <div className="modal-error-text">
          <FiAlertCircle size={16} /> {error}
        </div>
      )}
      <ButtonGroup>
        <IconTextButton
          variant=""
          size="md"
          onClick={onClose}
          disabled={saving}
        >
          Cancelar
        </IconTextButton>
        <IconTextButton
          variant="success"
          size="md"
          icon={<FiCheck size={14} />}
          onClick={handleConfirm}
          disabled={saving}
          loading={saving}
        >
          {saving ? 'Registrando...' : 'Confirmar pago'}
        </IconTextButton>
      </ButtonGroup>
    </>
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <Modal
      closeOnOverlayClick={false}
      isOpen={true}
      onClose={onClose}
      title="Registrar Pago"
      size="sm"
      className="payments-pay-modal"
      footer={footer}
    >
      <div className="payments-pay-body" style={{ padding: '1rem 0' }}>
        <p className="payments-pay-business" style={{ fontWeight: 600, marginBottom: '1rem' }}>
          {row.business_name}
        </p>

        <div className="payments-pay-info" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Monto</span>
            <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>
              ${parseFloat(row.total_amount || 0).toFixed(2)}
            </span>
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vencimiento actual</span>
            <span style={{ fontWeight: 600 }}>
              {row.next_billing_at ? formatDate(row.next_billing_at) : '—'}
            </span>
          </div>
        </div>

        {/* Resumen del período a cobrar */}
        <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <strong>Período a cubrir:</strong>
          </div>
          <div style={{ fontWeight: 500 }}>
            {currentMonthStr} → {periodEndStr}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            ({months} {months === 1 ? 'mes' : 'meses'})
          </div>
        </div>

        <div className="payments-pay-field" style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="pay-months" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
            Meses a pagar
          </label>
          <select
            id="pay-months"
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}
          >
            <option value={1}>1 mes</option>
            <option value={2}>2 meses</option>
            <option value={3}>3 meses</option>
            <option value={6}>6 meses</option>
            <option value={12}>12 meses</option>
          </select>
        </div>

        <div className="payments-pay-field" style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="pay-method" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
            Método de Pago
          </label>
          <select
            id="pay-method"
            value={paymentMethod}
            onChange={(e) => {
              setPaymentMethod(e.target.value);
              if (e.target.value !== 'transferencia') {
                setReference('');
              }
            }}
            className="payments-pay-select"
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}
          >
            <option value="transferencia">Transferencia Bancaria</option>
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta de Crédito/Débito</option>
            <option value="otros">Otros</option>
          </select>
        </div>

        {paymentMethod === 'transferencia' && (
          <div className="payments-pay-field" style={{ marginBottom: '0.75rem' }}>
            <label htmlFor="pay-reference" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
              Referencia / Comprobante (opcional)
            </label>
            <input
              id="pay-reference"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Número de transferencia, comprobante, etc."
              className="payments-pay-input"
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}
            />
          </div>
        )}

        <div className="payments-pay-notes" style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
            Notas (opcional)
          </label>
          <Input
            type="textarea"
            value={notes}
            onChange={setNotes}
            placeholder="Notas adicionales..."
            size="md"
            rows={2}
          />
        </div>

        <p className="payments-pay-hint" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Al confirmar se registrará el pago y se extenderá la suscripción por los meses seleccionados.
        </p>
      </div>
    </Modal>
  );
}

// ============================================================
// Modal de envío de email (sin cambios)
// ============================================================
const PALETTE = ['#22c55e','#f59e0b','#ef4444','#6366f1','#3b82f6','#8b5cf6'];
const TYPE_COLORS = {
  bienvenida: '#22c55e',
  recordatorio_pago: '#f59e0b',
  suspension: '#ef4444',
  activacion: '#6366f1'
};

function EmailModal({ row, onClose }) {
  const alert = useAlert();
  const [selected, setSelected] = useState(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loadingTpls, setLoadingTpls] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.get('/admin/email-templates')
      .then(r => setTemplates((r.data || r || []).filter(t => t.is_active)))
      .catch(() => setTemplates([]))
      .finally(() => setLoadingTpls(false));
  }, []);

  const handleSend = async () => {
    if (!selected) return;
    setSending(true);
    setResult(null);
    setError('');
    try {
      await adminApi.post('/admin/email/send-template', {
        to: row.owner_email,
        templateKey: selected,
        businessName: row.business_name,
        ownerName: row.owner_name,
        amount: row.total_amount,
        dueDate: row.next_billing_at,
      });
      setResult({ ok: true, msg: 'Correo enviado correctamente.' });
      alert.success('Correo enviado correctamente', '✅ Éxito');
    } catch (e) {
      setResult({ ok: false, msg: e.message || 'Error al enviar.' });
      setError(e.message || 'Error al enviar el correo');
    } finally {
      setSending(false);
    }
  };

  const footer = (
    <>
      {error && (
        <div className="modal-error-text">
          <FiAlertCircle size={16} /> {error}
        </div>
      )}
      <ButtonGroup>
        <IconTextButton
          variant=""
          size="md"
          onClick={onClose}
          disabled={sending}
        >
          {result?.ok ? 'Cerrar' : 'Cancelar'}
        </IconTextButton>
        {!result?.ok && (
          <IconTextButton
            variant="success"
            size="md"
            icon={<FiMail size={14} />}
            onClick={handleSend}
            disabled={!selected || sending || loadingTpls}
            loading={sending}
          >
            {sending ? 'Enviando...' : 'Enviar correo'}
          </IconTextButton>
        )}
      </ButtonGroup>
    </>
  );

  return (
    <Modal
      closeOnOverlayClick={false}
      isOpen={true}
      onClose={onClose}
      title="Enviar Email"
      size="sm"
      className="payments-email-modal"
      footer={footer}
    >
      <div className="payments-email-body">
        <p className="payments-email-to">
          Para: <strong>{row.owner_name || '—'}</strong>
        </p>
        <p className="payments-email-address">{row.owner_email}</p>

        <p className="payments-email-templates-label">Selecciona una plantilla</p>

        {loadingTpls ? (
          <div className="payments-email-loading">Cargando plantillas...</div>
        ) : templates.length === 0 ? (
          <p className="payments-email-no-templates">
            No hay plantillas activas. Créalas en <strong>Comercial → Plantillas de Email</strong>.
          </p>
        ) : (
          <div className="payments-email-templates">
            {templates.map((t, i) => {
              const color = TYPE_COLORS[t.type] || PALETTE[i % PALETTE.length];
              const isSel = selected === t.type;
              return (
                <div
                  key={t.type}
                  className={`payments-email-template ${isSel ? 'selected' : ''}`}
                  style={{
                    borderColor: isSel ? color : 'var(--border-color)',
                    background: isSel ? `${color}14` : 'var(--bg-tertiary)'
                  }}
                  onClick={() => setSelected(t.type)}
                >
                  <div className="payments-email-template-dot" style={{ background: color }} />
                  <div>
                    <p className="payments-email-template-label">{t.label}</p>
                    {t.description && (
                      <p className="payments-email-template-desc">{t.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {result && (
          <div className={`payments-email-result ${result.ok ? 'success' : 'error'}`}>
            {result.msg}
          </div>
        )}
      </div>
    </Modal>
  );
}