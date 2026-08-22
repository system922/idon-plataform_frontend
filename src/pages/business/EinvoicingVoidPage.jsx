import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '../../context/SessionContext';  // ✅ AGREGADO
import { useBusinessContext } from '../../admin/config/BusinessContext';  // ✅ AGREGADO
import PageTemplate from '../../components/PageTemplate';
import { useConfirm } from '../../context/ConfirmContext';
import { useAlert } from '../../components/ConfirmContext';
import {
  RefreshCw, AlertCircle, CheckCircle, XCircle, Clock,
  FileText, X, Plus, Minus, List, CreditCard, Send, Download
} from 'react-feather';
import { FiRefreshCw as FiRefreshCwIcon } from 'react-icons/fi';
import { fetchWithAuth } from '../../config/api';  // ✅ Cambiado
import { usePrinterService } from '../../services/usePrinterService';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import Modal from '../../components/General/Modal';
import Table from '../../components/General/Table';
import '../../styles/EinvoicingInvoicesPage.css';

const INV_STATUS = {
  autorizada: { color: '#15803d', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.3)', label: 'Autorizada', Icon: CheckCircle },
  anulada:    { color: '#b91c1c', bg: 'rgba(225,29,72,0.06)', border: 'rgba(225,29,72,0.25)', label: 'Anulada', Icon: XCircle },
  pendiente:  { color: '#b45309', bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.3)', label: 'Pendiente', Icon: Clock },
};

const CN_STATUS = {
  emitida:    { color: '#2563eb', bg: 'rgba(37,99,235,0.08)', border: 'rgba(37,99,235,0.3)', label: 'Emitida', Icon: Send },
  autorizada: { color: '#15803d', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.3)', label: 'Autorizada', Icon: CheckCircle },
  pendiente:  { color: '#b45309', bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.3)', label: 'Pendiente', Icon: Clock },
  rechazada:  { color: '#b91c1c', bg: 'rgba(225,29,72,0.06)', border: 'rgba(225,29,72,0.25)', label: 'Rechazada', Icon: XCircle },
  utilizada:  { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.3)', label: 'Utilizada', Icon: CheckCircle },
  anulada:    { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.3)', label: 'Anulada', Icon: XCircle },
  error:      { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.3)', label: 'Error', Icon: AlertCircle },
};

// ── Modal de anulación ─────────────────────────────────────────────────────
function VoidModal({ invoice, onClose, onConfirm, submitting }) {
  const [voidType, setVoidType] = useState('total');
  const [reason, setReason] = useState('');
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (invoice) {
      const rawItems = typeof invoice.items === 'string'
        ? JSON.parse(invoice.items)
        : (invoice.items || []);
      const parsed = rawItems.map(it => ({
        ...it,
        qty_credited: parseFloat(it.qty ?? it.quantity) || 0,
        price: parseFloat(it.unit_price) || 0,
        subtotal_credited: parseFloat(it.subtotal) || 0,
      }));
      setItems(parsed);
    }
  }, [invoice]);

  const updateItemQty = (idx, qty) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const newQty = Math.max(0, Math.min(qty, parseFloat(it.qty ?? it.quantity) || 0));
      return { ...it, qty_credited: newQty, subtotal_credited: newQty * it.price };
    }));
  };

  const calcModal = () => {
    if (!invoice) return { subtotal: 0, iva: 0, total: 0 };
    if (voidType === 'total') {
      const sub = parseFloat(invoice.subtotal) || 0;
      const iva = parseFloat(invoice.iva_amount) || 0;
      return { subtotal: sub, iva, total: sub + iva };
    }
    const sub = items.reduce((s, it) => s + (parseFloat(it.subtotal_credited) || 0), 0);
    const iva = sub * 0.15;
    return { subtotal: sub, iva, total: sub + iva };
  };

  const { subtotal: mSub, iva: mIva, total: mTotal } = calcModal();

  const handleSubmit = () => {
    if (!reason.trim()) { setError('Escribe el motivo'); return; }
    if (mTotal <= 0) { setError('El monto a acreditar debe ser mayor a 0'); return; }
    onConfirm(voidType, reason, items, mSub, mIva, mTotal);
  };

  return (
    <Modal
      closeOnOverlayClick={false}
      isOpen={true}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{
            background: 'rgba(225,29,72,0.12)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px',
            color: '#e11d48'
          }}>
            <XCircle size={18} />
          </span>
          <span>Anular Comprobante</span>
        </div>
      }
      size="md"
      footer={
        <ButtonGroup>
          <IconTextButton
            variant="danger"
            size="md"
            icon={<X size={14} />}
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </IconTextButton>
          <IconTextButton
            variant="danger"
            size="md"
            icon={<XCircle size={14} />}
            onClick={handleSubmit}
            disabled={submitting || mTotal <= 0}
            loading={submitting}
          >
            {submitting ? 'Emitiendo…' : voidType === 'total' ? 'Anular Factura' : 'Emitir Nota de Crédito Parcial'}
          </IconTextButton>
        </ButtonGroup>
      }
    >
      <div className="einv-void-modal-body">
        {/* Info factura */}
        <div className="einv-void-invoice-info">
          <div>
            <span className="einv-void-label">Factura</span>
            <span className="einv-void-value">{invoice.invoice_number}</span>
          </div>
          <div>
            <span className="einv-void-label">Cliente</span>
            <span className="einv-void-value">{invoice.customer_name}</span>
          </div>
          <div>
            <span className="einv-void-label">Total factura</span>
            <span className="einv-void-total">${parseFloat(invoice.total || 0).toFixed(2)}</span>
          </div>
        </div>

        {/* Tipo de anulación */}
        <div>
          <label className="einv-void-label">Tipo de anulación</label>
          <div className="einv-void-type-grid">
            {[
              { val: 'total', label: 'Anulación total', desc: 'Acredita el 100% de la factura' },
              { val: 'parcial', label: 'Anulación parcial', desc: 'Selecciona los ítems a devolver' },
            ].map(opt => (
              <button
                key={opt.val}
                className={`einv-void-type-btn ${voidType === opt.val ? 'active' : ''}`}
                onClick={() => setVoidType(opt.val)}
              >
                <div className="einv-void-type-label">{opt.label}</div>
                <div className="einv-void-type-desc">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Ítems (solo anulación parcial) */}
        {voidType === 'parcial' && (
          <div>
            <label className="einv-void-label">Ítems a acreditar</label>
            {items.length === 0 ? (
              <div className="einv-void-empty-items">La factura no tiene ítems registrados. Se acreditará el monto total.</div>
            ) : (
              <div className="einv-void-items">
                {items.map((it, idx) => (
                  <div key={idx} className="einv-void-item">
                    <div className="einv-void-item-info">
                      <div className="einv-void-item-desc">{it.description}</div>
                      <div className="einv-void-item-price">
                        ${parseFloat(it.price || 0).toFixed(2)} c/u · máx {parseFloat(it.qty ?? it.quantity ?? 0)}
                      </div>
                    </div>
                    <div className="einv-void-item-actions">
                      <button
                        onClick={() => updateItemQty(idx, it.qty_credited - 1)}
                        className="einv-void-qty-btn"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="einv-void-qty">{it.qty_credited}</span>
                      <button
                        onClick={() => updateItemQty(idx, it.qty_credited + 1)}
                        className="einv-void-qty-btn"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Motivo */}
        <div>
          <label className="einv-void-label">Motivo <span className="required">*</span></label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder={voidType === 'total' ? 'Ej: Anulación total por error en datos del cliente' : 'Ej: Devolución de producto, ítem no entregado'}
            rows={3}
            className="einv-void-textarea"
          />
        </div>

        {/* Totales */}
        <div className="einv-void-totals">
          <div>
            <span>Subtotal a acreditar</span>
            <span>${mSub.toFixed(2)}</span>
          </div>
          <div>
            <span>IVA</span>
            <span>${mIva.toFixed(2)}</span>
          </div>
          <div className="einv-void-total-credit">
            <span>Total nota de crédito</span>
            <span>-${mTotal.toFixed(2)}</span>
          </div>
        </div>

        {error && (
          <div className="einv-void-error">
            <AlertCircle size={14} /> {error}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Componente principal ──────────────────────────────────────────────────
export default function EinvoicingVoidPage() {
  const { user } = useSession();  // ✅ AGREGADO
  const { selectedBusiness } = useBusinessContext();  // ✅ AGREGADO
  const { showConfirm } = useConfirm();
  const alert = useAlert();
  const { print } = usePrinterService();
  const [invoices, setInvoices] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selInvoice, setSelInvoice] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('invoices');
  const [actionId, setActionId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      // ✅ Sin /api
      const [invRes, cnRes] = await Promise.all([
        fetchWithAuth('/einvoicing/invoices?limit=200'),
        fetchWithAuth('/einvoicing/credit-notes'),
      ]);
      const invData = await invRes.json();
      const cnData = await cnRes.json();
      setInvoices(
        (Array.isArray(invData) ? invData : [])
          .filter(i => i.status === 'autorizada' || i.status === 'anulada')
      );
      setHistory(Array.isArray(cnData) ? cnData : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
  };

  const notify = (msg, isError = false) => {
    if (isError) {
      alert.error(msg);
    } else {
      alert.success(msg);
    }
  };

  const openModal = (invoice) => {
    const customerRuc = invoice.customer_ruc || '';
    const isConsumidorFinal = !customerRuc || customerRuc === '9999999999999' || customerRuc === '9999999999998';
    
    if (isConsumidorFinal) {
      alert.error('No se puede anular facturas de CONSUMIDOR FINAL. Solo se pueden anular comprobantes con datos de cliente (RUC/Cédula).');
      return;
    }

    setSelInvoice(invoice);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelInvoice(null);
  };

  // ── FUNCIÓN PRINCIPAL: ANULAR Y EMITIR AUTOMÁTICAMENTE ────────────────
  const handleConfirmVoid = async (voidType, reason, items, subtotal, iva, total) => {
    if (!await showConfirm({
      title: voidType === 'total' ? 'Confirmar anulación total' : 'Confirmar anulación parcial',
      message: voidType === 'total' 
        ? `¿Estás seguro de anular la factura ${selInvoice.invoice_number}? Se emitirá una nota de crédito por el total.`
        : `¿Estás seguro de emitir una nota de crédito por $${total.toFixed(2)} para la factura ${selInvoice.invoice_number}?`,
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
      danger: true,
    })) return;

    setSubmitting(true);
    try {
      const rawItems = typeof selInvoice.items === 'string'
        ? JSON.parse(selInvoice.items)
        : (selInvoice.items || []);
      
      const creditedItems = voidType === 'total'
        ? rawItems.map(it => ({
            description: it.description,
            quantity: parseFloat(it.qty ?? it.quantity) || 0,
            unit_price: parseFloat(it.unit_price) || 0,
            subtotal: parseFloat(it.subtotal) || 0,
          }))
        : items
            .filter(it => it.qty_credited > 0)
            .map(it => ({
              description: it.description,
              quantity: it.qty_credited,
              unit_price: it.price,
              subtotal: it.subtotal_credited,
            }));

      const payload = {
        invoice_id: selInvoice.id,
        reference_invoice: selInvoice.invoice_number,
        reason,
        items: creditedItems,
        subtotal,
        iva_amount: iva,
        discount_amount: 0,
        total,
        customer_name: selInvoice.customer_name,
        customer_ruc: selInvoice.customer_ruc,
        customer_email: selInvoice.customer_email,
      };

      // 1. Crear la nota de crédito - Sin /api
      const res = await fetchWithAuth('/einvoicing/credit-notes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al emitir');

      // 2. Enviar automáticamente al SRI
      let sriStatus = 'emitida';
      let sriMessage = '';
      
      try {
        // Sin /api
        const sriRes = await fetchWithAuth(`/einvoicing/credit-notes/${data.id}/emit`, {
          method: 'POST'
        });
        const sriData = await sriRes.json();
        if (sriRes.ok) {
          sriStatus = sriData.status || 'pendiente';
          sriMessage = sriData.message || '';
        } else {
          sriMessage = sriData.error || 'Error al enviar al SRI';
        }
      } catch (sriError) {
        console.error('Error enviando al SRI:', sriError);
        sriMessage = 'Nota creada pero error al enviar al SRI';
      }

      // 3. Mostrar mensaje
      let msg = '';
      if (voidType === 'total') {
        msg = `Factura ${selInvoice.invoice_number} anulada. `;
      } else {
        msg = `Nota de crédito parcial por $${total.toFixed(2)}. `;
      }
      
      if (sriStatus === 'autorizada') {
        msg += '✅ Autorizada por el SRI';
      } else if (sriStatus === 'rechazada') {
        msg += '❌ Rechazada por el SRI. Puedes reenviar desde la pestaña "Notas de Crédito"';
      } else if (sriStatus === 'pendiente') {
        msg += '⏳ Pendiente de autorización del SRI';
      } else {
        msg += `📝 ${sriMessage}`;
      }
      
      await alert.success(msg, 'Comprobante procesado');
      closeModal();
      load();
      
      // 4. Abrir PDF - Sin /api
      if (data.id) {
        window.open(`/einvoicing/credit-notes/${data.id}/pdf`, '_blank');
      }

      // 5. Imprimir en térmica
      try {
        let bizInfo = {};
        // Sin /api
        const cfgRes = await fetchWithAuth('/einvoicing/config');
        if (cfgRes.ok) {
          const cfg = await cfgRes.json();
          bizInfo = { ruc: cfg.ruc, company_name: cfg.razon_social, trade_name: cfg.nombre_comercial || cfg.razon_social, address: cfg.direccion_matriz };
        }
        const cnNumber = data.credit_note_number || `001-001-${String(data.id).padStart(9, '0')}`;
        await print('printer_main', 'credit-note', {
          bizInfo,
          creditNote: { number: cnNumber, reference_invoice: selInvoice.invoice_number, date: new Date().toISOString() },
          customer: { name: selInvoice.customer_name, id: selInvoice.customer_ruc },
          reason,
          items: creditedItems,
          subtotal,
          iva,
          total,
        });
      } catch { /* fallo silencioso */ }
    } catch (e) {
      await alert.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── FUNCIONES PARA REENVÍO MANUAL ──────────────────────────────────────
  const handleReenviarSri = async (note) => {
    setActionId(note.id);
    try {
      // Sin /api
      const res = await fetchWithAuth(`/einvoicing/credit-notes/${note.id}/resend`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al reenviar al SRI');
      
      const msg = data.status === 'autorizada' 
        ? `✅ Nota de crédito ${note.reference_invoice || note.id} autorizada por el SRI`
        : `❌ Nota de crédito ${note.reference_invoice || note.id} rechazada por el SRI`;
      notify(msg);
      load();
    } catch (e) {
      notify(e.message, true);
    } finally {
      setActionId(null);
    }
  };

  const handleDownloadXml = async (note) => {
    try {
      // Sin /api
      const res = await fetchWithAuth(`/einvoicing/credit-notes/${note.id}/xml`);
      if (!res.ok) throw new Error('Error al descargar XML');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${note.credit_note_number || note.id}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      notify(e.message, true);
    }
  };

  const handleDownloadPdf = (note) => {
    // Sin /api
    window.open(`/einvoicing/credit-notes/${note.id}/pdf`, '_blank');
  };

  const filteredInv = invoices.filter(inv => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (inv.invoice_number || '').toLowerCase().includes(q) ||
      (inv.customer_name || '').toLowerCase().includes(q) ||
      (inv.customer_ruc || '').toLowerCase().includes(q);
    const matchDate = !filterDate || (inv.emission_date || '').startsWith(filterDate);
    return matchSearch && matchDate;
  });

  const filteredHistory = history.filter(cn => {
    const q = search.toLowerCase();
    return !q ||
      (cn.reference_invoice || '').toLowerCase().includes(q) ||
      (cn.customer_name || '').toLowerCase().includes(q) ||
      (cn.customer_ruc || '').toLowerCase().includes(q);
  });

  // ── Columnas Facturas ────────────────────────────────────────────────────
  const invoiceColumns = [
    {
      accessor: 'invoice_number',
      label: 'N° Factura',
      render: (item) => (
        <span>{item.invoice_number}</span>
      )
    },
    {
      accessor: 'emission_date',
      label: 'Fecha',
      render: (item) => (
        <span style={{ color: 'var(--text-muted)' }}>
          {item.emission_date ? new Date(item.emission_date).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
        </span>
      )
    },
    {
      accessor: 'customer',
      label: 'Cliente',
      render: (item) => (
        <div>
          <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-primary)' }}>{item.customer_name}</div>
          {item.customer_ruc && <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{item.customer_ruc}</div>}
        </div>
      )
    },
    {
      accessor: 'total',
      label: 'Total',
      align: 'right',
      render: (item) => (
        <span style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--text-primary)' }}>
          ${parseFloat(item.total || 0).toFixed(2)}
        </span>
      )
    },
    {
      accessor: 'credited_amount',
      label: 'Acreditado',
      align: 'right',
      render: (item) => {
        const credited = parseFloat(item.credited_amount) || 0;
        return (
          <span style={{ color: credited > 0 ? 'var(--danger)' : 'var(--text-dim)' }}>
            {credited > 0 ? `-$${credited.toFixed(2)}` : '—'}
          </span>
        );
      }
    },
    {
      accessor: 'balance',
      label: 'Balance',
      align: 'right',
      render: (item) => {
        const total = parseFloat(item.total) || 0;
        const credited = parseFloat(item.credited_amount) || 0;
        const balance = Math.max(0, total - credited);
        return (
          <span style={{ fontWeight: 'var(--font-weight-bold)', color: balance === 0 ? 'var(--text-dim)' : 'var(--success)' }}>
            ${balance.toFixed(2)}
          </span>
        );
      }
    },
    {
      accessor: 'status',
      label: 'Estado',
      render: (item) => {
        const st = INV_STATUS[item.status] || INV_STATUS.pendiente;
        const Icon = st.Icon;
        return (
          <span className={`einv-status ${item.status}`}>
            <Icon size={11} /> {st.label}
          </span>
        );
      }
    },
    {
      accessor: 'actions',
      label: 'Acción',
      align: 'center',
      render: (item) => {
        const total = parseFloat(item.total) || 0;
        const credited = parseFloat(item.credited_amount) || 0;
        const balance = Math.max(0, total - credited);
        const isAnulada = item.status === 'anulada';
        const customerRuc = item.customer_ruc || '';
        const isConsumidorFinal = !customerRuc || customerRuc === '9999999999999' || customerRuc === '9999999999998';

        if (isAnulada || balance <= 0) {
          return <span style={{ color: 'var(--text-dim)', fontSize: 'var(--font-size-sm)' }}>—</span>;
        }

        return (
          <IconTextButton
            variant="danger"
            size="sm"
            inline
            icon={<XCircle size={13} />}
            onClick={() => openModal(item)}
            disabled={isConsumidorFinal}
            tooltip={isConsumidorFinal ? 'No se puede anular facturas de CONSUMIDOR FINAL' : 'Anular factura'}
          >
            Anular
          </IconTextButton>
        );
      }
    }
  ];

  // ── Columnas Notas de Crédito ────────────────────────────────────────────
  const creditNoteColumns = [
    {
      accessor: 'credit_note_number',
      label: 'N° Nota',
      render: (item) => (
        <span>
          {item.credit_note_number || '—'}
        </span>
      )
    },
    {
      accessor: 'reference_invoice',
      label: 'Factura ref.',
      render: (item) => (
        <span>
          {item.reference_invoice || item.invoice_number || '—'}
        </span>
      )
    },
    {
      accessor: 'reason',
      label: 'Motivo',
      render: (item) => (
        <span style={{ color: 'var(--text-muted)' }} title={item.reason}>
          {(item.reason || '').substring(0, 45)}{item.reason?.length > 45 ? '…' : ''}
        </span>
      )
    },
    {
      accessor: 'customer',
      label: 'Cliente',
      render: (item) => (
        <div>
          <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-primary)' }}>{item.customer_name || '—'}</div>
          {item.customer_ruc && <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{item.customer_ruc}</div>}
        </div>
      )
    },
    {
      accessor: 'total',
      label: 'Total acreditado',
      align: 'right',
      render: (item) => (
        <span style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--danger)' }}>
          -${parseFloat(item.total || 0).toFixed(2)}
        </span>
      )
    },
    {
      accessor: 'remaining_balance',
      label: 'Saldo',
      align: 'right',
      render: (item) => (
        <span style={{ color: parseFloat(item.remaining_balance || 0) > 0 ? 'var(--success)' : 'var(--text-dim)' }}>
          ${parseFloat(item.remaining_balance || 0).toFixed(2)}
        </span>
      )
    },
    {
      accessor: 'status',
      label: 'Estado SRI',
      render: (item) => {
        const st = CN_STATUS[item.status] || CN_STATUS.pendiente;
        const Icon = st.Icon;
        return (
          <span className={`einv-status ${item.status}`}>
            {Icon && <Icon size={11} />} {st.label}
          </span>
        );
      }
    },
    {
      accessor: 'created_at',
      label: 'Fecha',
      render: (item) => (
        <span style={{ color: 'var(--text-muted)' }}>
          {item.created_at ? new Date(item.created_at).toLocaleDateString('es-EC') : '—'}
        </span>
      )
    },
    {
      accessor: 'actions',
      label: 'Acciones',
      align: 'center',
      render: (item) => {
        const isAct = actionId === item.id;
        const isRechazada = item.status === 'rechazada';
        const isAutorizada = item.status === 'autorizada';
        const isPendiente = item.status === 'pendiente' || item.status === 'error';
        
        return (
          <ButtonGroup>
            {/* PDF */}
            <IconTextButton
              variant="info"
              size="sm"
              icon={<FileText size={11} />}
              onClick={() => handleDownloadPdf(item)}
              tooltip="Ver PDF"
            >
              PDF
            </IconTextButton>

            {/* Reenviar - Para notas rechazadas o con error */}
            {(isRechazada || isPendiente) && (
              <IconTextButton
                variant="warning"
                size="sm"
                icon={<RefreshCw size={11} />}
                onClick={() => handleReenviarSri(item)}
                disabled={isAct}
                loading={isAct}
                tooltip="Reenviar al SRI"
              >
                Reenviar
              </IconTextButton>
            )}

            {/* XML - Para notas autorizadas */}
            {isAutorizada && item.signed_xml && (
              <IconTextButton
                variant="blue"
                size="sm"
                icon={<Download size={11} />}
                onClick={() => handleDownloadXml(item)}
                tooltip="Descargar XML"
              >
                XML
              </IconTextButton>
            )}
          </ButtonGroup>
        );
      }
    }
  ];

  // ── Toolbar ────────────────────────────────────────────────────────────
  const toolbar = (
    <div className="users-toolbar">
      {activeTab === 'invoices' && (
        <div className="einv-date-filter">
          <label>Fecha</label>
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="einv-date-input"
          />
          {filterDate && (
            <button className="einv-clear-btn" onClick={() => setFilterDate('')}>
              <X size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );

  // ── Botón de refrescar ──────────────────────────────────────────────────
  const refreshButton = (
    <button
      onClick={handleRefresh}
      className="dashboard-refresh-btn-header"
      disabled={refreshing}
      title="Actualizar datos"
    >
      <FiRefreshCwIcon size={18} className={refreshing ? 'spinning' : ''} />
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'invoices', label: 'Facturas', icon: <CreditCard size={16} />, count: filteredInv.length },
    { id: 'credit-notes', label: 'Notas de Crédito', icon: <FileText size={16} />, count: filteredHistory.length },
  ];

  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <PageTemplate
      title="Anulación de Comprobantes"
      subtitle="Anulación interna mediante nota de crédito al SRI"
      theme="business"
      loading={loading}
      headerAction={refreshButton}
    >
      <div className="einv-void-page">
        {/* Tabs */}
        <div className="einv-void-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`einv-void-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(tab.id);
                setSearch('');
                setFilterDate('');
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span className="einv-void-tab-badge">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="einv-void-tab-content">
          {activeTab === 'invoices' ? (
            <Table
              data={filteredInv}
              columns={invoiceColumns}
              keyField="id"
              title="Facturas autorizadas"
              subtitle={`${filteredInv.length} ${filteredInv.length === 1 ? 'factura' : 'facturas'} encontradas`}
              toolbar={toolbar}
              searchable={true}
              searchFields={['invoice_number', 'customer_name', 'customer_ruc']}
              pagination={true}
              itemsPerPage={itemsPerPage}
              itemsPerPageOptions={[10, 15]}
              onItemsPerPageChange={(newPerPage) => setItemsPerPage(newPerPage)}
              loading={loading}
              emptyMessage={search ? 'No hay resultados para esa búsqueda' : 'No hay facturas autorizadas'}
              striped
              hoverable
              bordered={false}
            />
          ) : (
            <Table
              data={filteredHistory}
              columns={creditNoteColumns}
              keyField="id"
              title="Notas de Crédito"
              subtitle={`${filteredHistory.length} ${filteredHistory.length === 1 ? 'nota de crédito' : 'notas de crédito'}`}
              toolbar={toolbar}
              searchable={true}
              searchFields={['reference_invoice', 'customer_name', 'customer_ruc']}
              pagination={true}
              itemsPerPage={itemsPerPage}
              itemsPerPageOptions={[10, 15]}
              onItemsPerPageChange={(newPerPage) => setItemsPerPage(newPerPage)}
              loading={loading}
              emptyMessage={search ? 'No hay resultados para esa búsqueda' : 'Sin notas de crédito emitidas'}
              striped
              hoverable
              bordered={false}
            />
          )}
        </div>

        {/* Modal de anulación */}
        {showModal && selInvoice && (
          <VoidModal
            invoice={selInvoice}
            onClose={closeModal}
            onConfirm={handleConfirmVoid}
            submitting={submitting}
          />
        )}
      </div>
    </PageTemplate>
  );
}