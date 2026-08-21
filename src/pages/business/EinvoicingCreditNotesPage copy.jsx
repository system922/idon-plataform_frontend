import React, { useState, useEffect } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { 
  Plus, Eye, Send, RefreshCw, AlertCircle, Check, X, FileText, 
  Download, Mail, Clock 
} from 'react-feather';
import { MdOutlineFileDownload } from "react-icons/md";
import { fetchWithAuth } from '../../config/apiBase';
import { usePrinterService } from '../../services/usePrinterService';
import Table from '../../components/General/Table';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import SearchInput from '../../components/General/SearchInput';
import CustomCombobox from '../../components/General/CustomCombobox';
import '../../styles/CreditNotes.css';

const STATUS_STYLE = {
  autorizada: { color: '#15803d', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.3)', label: 'Autorizada', Icon: Check },
  emitida:    { color: '#2563eb', bg: 'rgba(37,99,235,0.08)', border: 'rgba(37,99,235,0.3)', label: 'Emitida', Icon: Clock },
  pendiente:  { color: '#b45309', bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.3)', label: 'Pendiente', Icon: Clock },
  rechazada:  { color: '#b91c1c', bg: 'rgba(225,29,72,0.06)', border: 'rgba(225,29,72,0.25)', label: 'Rechazada', Icon: X },
  utilizada:  { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.3)', label: 'Utilizada', Icon: Check },
  anulada:    { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.3)', label: 'Anulada', Icon: X },
  error:      { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.3)', label: 'Error', Icon: AlertCircle },
};

export default function CreditNotes() {
  const { print } = usePrinterService();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    reason: '',
    items: [],
    total: 0,
    subtotal: 0,
    iva_amount: 0,
    discount_amount: 0
  });
  const [actionId, setActionId] = useState(null);

  // ── Opciones para el filtro de estado ──────────────────────────────────
  const statusOptions = [
    { label: 'Todos', value: 'all' },
    { label: 'Autorizadas', value: 'autorizada' },
    { label: 'Emitidas', value: 'emitida' },
    { label: 'Pendientes', value: 'pendiente' },
    { label: 'Rechazadas', value: 'rechazada' },
    { label: 'Utilizadas', value: 'utilizada' },
    { label: 'Anuladas', value: 'anulada' },
  ];

  const loadCreditNotes = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/einvoicing/credit-notes');
      const data = await res.json();
      setNotes(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadInvoices = async () => {
    try {
      const res = await fetchWithAuth('/api/einvoicing/invoices?limit=200');
      const data = await res.json();
      setInvoices(data.filter(inv => 
        inv.status === 'autorizada' && 
        (inv.total - (inv.credited_amount || 0)) > 0
      ));
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadCreditNotes();
  }, []);

  const notify = (msg, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(''), 6000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(''), 5000); }
  };

  const openCreateModal = async () => {
    await loadInvoices();
    setSelectedInvoice(null);
    setFormData({ 
      reason: '', 
      items: [], 
      total: 0, 
      subtotal: 0, 
      iva_amount: 0, 
      discount_amount: 0 
    });
    setShowModal(true);
  };

  const handleInvoiceSelect = (invoice) => {
    setSelectedInvoice(invoice);
    // Prellenar items con los productos de la factura
    const itemsCopy = (invoice.items || []).map(item => ({
      ...item,
      quantity_credited: item.quantity || 1,
      subtotal_credited: item.subtotal || 0
    }));
    setFormData({
      ...formData,
      items: itemsCopy,
      subtotal: parseFloat(invoice.subtotal) || 0,
      iva_amount: parseFloat(invoice.iva_amount) || 0,
      discount_amount: parseFloat(invoice.discount_amount) || 0,
      total: parseFloat(invoice.total) || 0,
    });
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!selectedInvoice || !formData.reason) {
      setError('Seleccione una factura y escriba un motivo');
      return;
    }
    try {
      setSubmitting(true);
      const totalCredited = formData.items.reduce((sum, i) => sum + (parseFloat(i.subtotal_credited) || 0), 0);
      const ivaCredited = totalCredited * 0.15;
      const payload = {
        invoice_id: selectedInvoice.id,
        reason: formData.reason,
        items: formData.items.map(i => ({
          product_id: i.product_id,
          description: i.description,
          quantity: i.quantity_credited || 1,
          unit_price: i.unit_price || 0,
          subtotal: i.subtotal_credited || 0
        })),
        subtotal: totalCredited,
        iva_amount: ivaCredited,
        discount_amount: formData.discount_amount || 0,
        total: totalCredited + ivaCredited,
        customer_name: selectedInvoice.customer_name,
        customer_ruc: selectedInvoice.customer_ruc,
        customer_email: selectedInvoice.customer_email,
        reference_invoice: selectedInvoice.invoice_number
      };
      const res = await fetchWithAuth('/api/einvoicing/credit-notes', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al emitir nota de crédito');
      notify('Nota de crédito emitida correctamente');
      setShowModal(false);
      loadCreditNotes();
      if (data.id) window.open(`/api/einvoicing/credit-notes/${data.id}/pdf`, '_blank');

      // Imprimir en térmica
      try {
        let bizInfo = {};
        const cfgRes = await fetchWithAuth('/api/einvoicing/config');
        if (cfgRes.ok) {
          const cfg = await cfgRes.json();
          bizInfo = { ruc: cfg.ruc, company_name: cfg.razon_social, trade_name: cfg.nombre_comercial || cfg.razon_social, address: cfg.direccion_matriz };
        }
        const cnNumber = data.credit_note_number || `001-001-${String(data.id).padStart(9, '0')}`;
        await print('printer_main', 'credit-note', {
          bizInfo,
          creditNote: { number: cnNumber, reference_invoice: selectedInvoice.invoice_number, date: new Date().toISOString() },
          customer:   { name: selectedInvoice.customer_name, id: selectedInvoice.customer_ruc },
          reason:     formData.reason,
          items:      payload.items,
          subtotal:   totalCredited,
          iva:        ivaCredited,
          total:      totalCredited + ivaCredited,
        });
      } catch { /* fallo silencioso si QZ no está activo */ }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReenviar = async (note) => {
    setActionId(note.id);
    try {
      const res = await fetchWithAuth(`/api/einvoicing/credit-notes/${note.id}/resend`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al reenviar');
      setNotes(prev => prev.map(n => n.id === note.id ? { ...n, ...data } : n));
      notify(`Nota de crédito ${note.credit_note_number} reenviada correctamente`);
    } catch (e) {
      notify(e.message, true);
    } finally {
      setActionId(null);
    }
  };

  const handleDownloadPdf = (note) => {
    window.open(`/api/einvoicing/credit-notes/${note.id}/pdf`, '_blank');
  };

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const filtered = notes.filter(note => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (note.credit_note_number || '').toLowerCase().includes(q) ||
      (note.reference_invoice || '').toLowerCase().includes(q) ||
      (note.customer_name || '').toLowerCase().includes(q) ||
      (note.customer_ruc || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || note.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const hasFilters = search !== '' || statusFilter !== 'all';

  const clearAllFilters = () => {
    setSearch('');
    setStatusFilter('all');
  };

  // ── Columnas para la tabla ──────────────────────────────────────────────
  const columns = [
    {
      accessor: 'credit_note_number',
      label: 'N° Nota',
      render: (item) => (
        <span className="cn-number" style={{ fontWeight: 600, color: 'var(--primary-color)' }}>
          {item.credit_note_number || '—'}
        </span>
      )
    },
    {
      accessor: 'invoice_number',
      label: 'Factura Relacionada',
      render: (item) => (
        <span style={{ color: 'var(--text-muted)' }}>
          {item.invoice_number || item.reference_invoice || '—'}
        </span>
      )
    },
    {
      accessor: 'customer',
      label: 'Cliente',
      render: (item) => (
        <div>
          <div style={{ fontWeight: 500 }}>{item.customer_name || '—'}</div>
          {item.customer_ruc && (
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
              RUC: {item.customer_ruc}
            </div>
          )}
        </div>
      )
    },
    {
      accessor: 'reason',
      label: 'Motivo',
      render: (item) => (
        <span style={{ fontSize: '13px' }}>
          {item.reason?.length > 50 ? `${item.reason.substring(0, 50)}...` : item.reason || '—'}
        </span>
      )
    },
    {
      accessor: 'total',
      label: 'Total',
      align: 'right',
      render: (item) => (
        <span style={{ fontWeight: 600 }}>
          ${parseFloat(item.total || 0).toFixed(2)}
        </span>
      )
    },
    {
      accessor: 'remaining_balance',
      label: 'Saldo Disponible',
      align: 'right',
      render: (item) => (
        <span style={{ color: parseFloat(item.remaining_balance || 0) > 0 ? 'var(--success-color)' : 'var(--text-muted)' }}>
          ${parseFloat(item.remaining_balance || 0).toFixed(2)}
        </span>
      )
    },
    {
      accessor: 'status',
      label: 'Estado SRI',
      align: 'center',
      render: (item) => {
        const st = STATUS_STYLE[item.status] || STATUS_STYLE.pendiente;
        const Icon = st.Icon || Clock;
        return (
          <span className={`cn-status-badge ${item.status}`}>
            <Icon size={11} /> {st.label}
          </span>
        );
      }
    },
    {
      accessor: 'emission_date',
      label: 'Fecha Emisión',
      render: (item) => {
        const date = item.emission_date || item.created_at;
        return date ? new Date(date).toLocaleDateString('es-EC') : '—';
      }
    },
    {
      accessor: 'actions',
      label: 'Acciones',
      align: 'center',
      render: (item) => {
        const isAct = actionId === item.id;
        return (
          <ButtonGroup>
            <IconTextButton
              variant="info"
              size="sm"
              icon={<FileText size={11} />}
              onClick={() => handleDownloadPdf(item)}
              tooltip="Ver/Descargar PDF"
            >
              PDF
            </IconTextButton>
            
            {item.status !== 'autorizada' && item.status !== 'utilizada' && item.status !== 'anulada' && (
              <IconTextButton
                variant="success"
                size="sm"
                icon={<Send size={11} />}
                onClick={() => handleReenviar(item)}
                disabled={isAct}
                loading={isAct}
                tooltip="Reenviar al SRI"
              >
                SRI
              </IconTextButton>
            )}
          </ButtonGroup>
        );
      }
    }
  ];

  // ── Toolbar ──────────────────────────────────────────────────────────────
  const toolbar = (
    <div className="cn-toolbar" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <SearchInput
        value={search}
        onChange={(val) => setSearch(val)}
        placeholder="Buscar por número, factura o cliente..."
        style={{ flex: 1, minWidth: '200px' }}
      />

      <CustomCombobox
        options={statusOptions}
        value={statusFilter}
        onChange={setStatusFilter}
        placeholder="Filtrar por estado"
        size="sm"
        filterable={false}
        style={{ minWidth: '160px' }}
      />

      <ButtonGroup style={{ flexShrink: 0 }}>
        {hasFilters && (
          <IconTextButton
            variant="danger"
            size="md"
            icon={<X size={14} />}
            onClick={clearAllFilters}
          >
            Limpiar filtros
          </IconTextButton>
        )}
      </ButtonGroup>
    </div>
  );

  // ── Botón de refrescar ──────────────────────────────────────────────────
  const refreshButton = (
    <button
      onClick={loadCreditNotes}
      className="dashboard-refresh-btn-header"
      disabled={loading}
      title="Actualizar datos"
    >
      <RefreshCw size={18} className={loading ? 'spinning' : ''} />
      <span>{loading ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  // ── Header Action (Nueva Nota) ─────────────────────────────────────────
  const headerAction = (
    <ButtonGroup>
      <button className="btn-primary" onClick={openCreateModal}>
        <Plus size={16} /> Nueva Nota de Crédito
      </button>
      {refreshButton}
    </ButtonGroup>
  );

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <PageTemplate
      title="Notas de Crédito Electrónicas"
      subtitle="Emisión, autorización y gestión de notas de crédito SRI"
      loading={loading}
      headerAction={headerAction}
    >
      <div className="credit-notes-container">
        {/* Mensajes */}
        {error && (
          <div className="alert-error">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {success && (
          <div className="alert-success">
            <Check size={16} /> {success}
          </div>
        )}

        {/* Tabla */}
        <Table
          data={filtered}
          columns={columns}
          keyField="id"
          title=""
          toolbar={toolbar}
          searchable={false}
          pagination
          itemsPerPage={10}
          itemsPerPageOptions={[10, 25, 50, 100]}
          loading={loading}
          emptyMessage={
            !loading && notes.length === 0 
              ? 'No hay notas de crédito emitidas' 
              : filtered.length === 0 && notes.length > 0
                ? 'Sin resultados para esa búsqueda'
                : 'Cargando...'
          }
          striped
          hoverable
          bordered={false}
          className="cn-table"
        />

        {/* Modal de creación */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-container modal-lg" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Emitir Nota de Crédito</h2>
                <button className="close-btn" onClick={() => setShowModal(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Seleccionar Factura *</label>
                  <select 
                    onChange={e => {
                      const inv = invoices.find(i => i.id === e.target.value);
                      if (inv) handleInvoiceSelect(inv);
                    }}
                    value={selectedInvoice?.id || ''}
                  >
                    <option value="">-- Seleccionar --</option>
                    {invoices.map(inv => {
                      const remaining = inv.total - (inv.credited_amount || 0);
                      return (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoice_number} - {inv.customer_name} - 
                          ${remaining.toFixed(2)} disponible
                        </option>
                      );
                    })}
                  </select>
                </div>

                {selectedInvoice && (
                  <>
                    <div className="form-group">
                      <label>Motivo de la nota de crédito *</label>
                      <textarea 
                        rows="3" 
                        value={formData.reason} 
                        onChange={e => setFormData({...formData, reason: e.target.value})} 
                        placeholder="Ej: Devolución total, Anulación por error, etc."
                      />
                    </div>

                    <div className="items-editor">
                      <h4>Productos a acreditar</h4>
                      <div className="items-header">
                        <span>Producto</span>
                        <span>Cantidad</span>
                        <span>Precio</span>
                        <span>Subtotal</span>
                      </div>
                      {formData.items.map((item, idx) => (
                        <div key={idx} className="credit-item">
                          <span className="item-description">{item.description}</span>
                          <input 
                            type="number" 
                            step="1" 
                            min="0"
                            value={item.quantity_credited || 1} 
                            onChange={e => {
                              const newItems = [...formData.items];
                              const qty = Number(e.target.value) || 0;
                              newItems[idx].quantity_credited = qty;
                              newItems[idx].subtotal_credited = qty * (parseFloat(item.unit_price) || 0);
                              const newSubtotal = newItems.reduce((s,i) => s + (parseFloat(i.subtotal_credited) || 0), 0);
                              setFormData({
                                ...formData, 
                                items: newItems, 
                                subtotal: newSubtotal
                              });
                            }} 
                          />
                          <span className="item-price">${parseFloat(item.unit_price || 0).toFixed(2)}</span>
                          <span className="item-subtotal">${(parseFloat(item.subtotal_credited) || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="totals">
                      <div>Subtotal: ${formData.subtotal.toFixed(2)}</div>
                      <div>IVA 15%: ${(formData.subtotal * 0.15).toFixed(2)}</div>
                      <div><strong>Total acreditar: ${(formData.subtotal * 1.15).toFixed(2)}</strong></div>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setShowModal(false)} disabled={submitting}>
                  Cancelar
                </button>
                <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Emitiendo...' : 'Emitir Nota de Crédito'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTemplate>
  );
}