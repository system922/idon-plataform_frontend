import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '../../context/SessionContext';  
import { useBusinessContext } from '../../admin/config/BusinessContext';  
import PageTemplate from '../../components/PageTemplate';
import { 
  Send, RefreshCw, AlertCircle, Check, X, FileText, 
  Download, Clock 
} from 'react-feather';
import { fetchWithAuth } from '../../config/api';  
import { usePrinterService } from '../../services/usePrinterService';
import Table from '../../components/General/Table';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
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
  const { user } = useSession();  // ✅ AGREGADO
  const { selectedBusiness } = useBusinessContext();  // ✅ AGREGADO
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
    { label: 'Todos los estados', value: 'all' },
    { label: 'Autorizadas', value: 'autorizada' },
    { label: 'Emitidas', value: 'emitida' },
    { label: 'Pendientes', value: 'pendiente' },
    { label: 'Rechazadas', value: 'rechazada' },
    { label: 'Utilizadas', value: 'utilizada' },
    { label: 'Anuladas', value: 'anulada' },
    { label: 'Error', value: 'error' },
  ];

  const loadCreditNotes = async () => {
    setLoading(true);
    try {
      // ✅ Sin /api
      const res = await fetchWithAuth('/einvoicing/credit-notes');
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
      // ✅ Sin /api
      const res = await fetchWithAuth('/einvoicing/invoices?limit=200');
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
      // ✅ Sin /api
      const res = await fetchWithAuth('/einvoicing/credit-notes', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al emitir nota de crédito');
      notify('Nota de crédito emitida correctamente');
      setShowModal(false);
      loadCreditNotes();
      if (data.id) window.open(`/einvoicing/credit-notes/${data.id}/pdf`, '_blank');

      // Imprimir en térmica
      try {
        let bizInfo = {};
        // ✅ Sin /api
        const cfgRes = await fetchWithAuth('/einvoicing/config');
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

  // ── NUEVAS FUNCIONES PARA GESTIÓN CON SRI ─────────────────────────────

  // Emitir nota de crédito al SRI
  const handleEmitirSri = async (note) => {
    setActionId(note.id);
    try {
      // ✅ Sin /api
      const res = await fetchWithAuth(`/einvoicing/credit-notes/${note.id}/emit`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar al SRI');
      
      notify(`Nota de crédito ${note.reference_invoice || note.id} ${data.status === 'autorizada' ? 'autorizada' : 'enviada'} correctamente`);
      loadCreditNotes();
    } catch (e) {
      notify(e.message, true);
    } finally {
      setActionId(null);
    }
  };

  // Reenviar nota de crédito al SRI
  const handleReenviarSri = async (note) => {
    setActionId(note.id);
    try {
      // ✅ Sin /api
      const res = await fetchWithAuth(`/einvoicing/credit-notes/${note.id}/resend`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al reenviar al SRI');
      
      notify(`Nota de crédito ${note.reference_invoice || note.id} reenviada correctamente`);
      loadCreditNotes();
    } catch (e) {
      notify(e.message, true);
    } finally {
      setActionId(null);
    }
  };

  // Descargar XML de nota de crédito
  const handleDownloadXml = async (note) => {
    try {
      // ✅ Sin /api
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

  // ── FIN NUEVAS FUNCIONES ──────────────────────────────────────────────

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
        const isPendiente = item.status === 'emitida' || item.status === 'pendiente';
        const isRechazada = item.status === 'rechazada';
        const isAutorizada = item.status === 'autorizada';
        const isError = item.status === 'error';
        const isTerminal = item.status === 'utilizada' || item.status === 'anulada';
        
        return (
          <ButtonGroup>
            {/* PDF - Siempre visible - Sin /api */}
            <IconTextButton
              variant="info"
              size="sm"
              icon={<FileText size={11} />}
              onClick={() => window.open(`/einvoicing/credit-notes/${item.id}/pdf`, '_blank')}
              tooltip="Ver/Descargar PDF"
            >
              PDF
            </IconTextButton>

            {/* Enviar al SRI - Para notas emitidas o pendientes o con error */}
            {(isPendiente || isError) && (
              <IconTextButton
                variant="warning"
                size="sm"
                icon={<Send size={11} />}
                onClick={() => handleEmitirSri(item)}
                disabled={isAct}
                loading={isAct}
                tooltip="Enviar al SRI"
              >
                Enviar
              </IconTextButton>
            )}

            {/* Reenviar - Para notas rechazadas */}
            {isRechazada && (
              <IconTextButton
                variant="success"
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

            {/* XML - Para notas autorizadas que tienen XML firmado */}
            {isAutorizada && item.signed_xml && (
              <IconTextButton
                variant="blue"
                size="sm"
                icon={<Download size={11} />}
                onClick={() => handleDownloadXml(item)}
                tooltip="Descargar XML firmado"
              >
                XML
              </IconTextButton>
            )}
          </ButtonGroup>
        );
      }
    }
  ];

  // ── Toolbar ──────────────────────────────────────────────────────────────
  const toolbar = (
    <div className="users-toolbar">
      <div style={{ minWidth: '140px', maxWidth: '140px'  }}>
        <CustomCombobox
          options={statusOptions}
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="Filtrar por estado"
          size="sm"
          filterable={false}
        />
      </div>

      <ButtonGroup>
        {hasFilters && (
          <IconTextButton
            variant=""
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
      {refreshButton}
    </ButtonGroup>
  );

  const [itemsPerPage, setItemsPerPage] = useState(10);

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
          title="Notas de crédito autorizadas"
          subtitle={`${filtered.length} ${filtered.length === 1 ? 'nota de crédito' : 'notas de créditos'} encontradas`}
          toolbar={toolbar}
          searchFields={true}
          searchPlaceholder='Buscar por factura o cliente'
          pagination={true}
          itemsPerPage={itemsPerPage}
          itemsPerPageOptions={[10, 15]}
          onItemsPerPageChange={(newPerPage) => setItemsPerPage(newPerPage)}
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
                            max={item.quantity || 999}
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