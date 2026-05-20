import { useState, useEffect } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { Plus, RefreshCw, AlertCircle, Check, X, FileText, Send } from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/CreditNotes.css';

const STATUS_STYLE = {
  autorizada: { bg: 'rgba(16,185,129,0.2)',  color: '#10b981', label: 'Autorizada' },
  pendiente:  { bg: 'rgba(245,158,11,0.2)',  color: '#f59e0b', label: 'Pendiente'  },
  rechazada:  { bg: 'rgba(225,29,72,0.15)',  color: '#e11d48', label: 'Rechazada'  },
  error:      { bg: 'rgba(107,114,128,0.2)', color: '#6b7280', label: 'Error'      },
};

export default function DebitNotesPage() {
  const [notes,      setNotes     ] = useState([]);
  const [invoices,   setInvoices  ] = useState([]);
  const [loading,    setLoading   ] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError     ] = useState('');
  const [success,    setSuccess   ] = useState('');
  const [showModal,  setShowModal ] = useState(false);
  const [selInvoice, setSelInvoice] = useState(null);
  const [formData,   setFormData  ] = useState({
    reason: '',
    additional_value: '',
    interest_rate: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const res  = await fetchWithAuth('/api/einvoicing/debit-notes');
      const data = await res.json();
      setNotes(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadInvoices = async () => {
    try {
      const res  = await fetchWithAuth('/api/einvoicing/invoices?limit=200');
      const data = await res.json();
      setInvoices(Array.isArray(data) ? data.filter(i => i.status === 'autorizada') : []);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => { load(); }, []);

  const openModal = async () => {
    await loadInvoices();
    setSelInvoice(null);
    setFormData({ reason: '', additional_value: '', interest_rate: '' });
    setError('');
    setShowModal(true);
  };

  const calcTotals = () => {
    const base    = parseFloat(selInvoice?.total)      || 0;
    const addVal  = parseFloat(formData.additional_value) || 0;
    const intRate = parseFloat(formData.interest_rate)    || 0;
    const interest = base * (intRate / 100);
    const total   = addVal + interest;
    const iva     = total * 0.15;
    return { addVal, interest, total, iva, grandTotal: total + iva };
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!selInvoice)         { setError('Selecciona una factura'); return; }
    if (!formData.reason)    { setError('Escribe el motivo'); return; }
    const { addVal, interest, total, iva, grandTotal } = calcTotals();
    if (grandTotal <= 0)     { setError('El valor a debitar debe ser mayor a 0'); return; }

    try {
      setSubmitting(true); setError('');
      const payload = {
        invoice_id:        selInvoice.id,
        reference_invoice: selInvoice.invoice_number,
        reason:            formData.reason,
        additional_value:  addVal,
        interest_value:    interest,
        subtotal:          total,
        iva_amount:        iva,
        total:             grandTotal,
        customer_name:     selInvoice.customer_name,
        customer_ruc:      selInvoice.customer_ruc,
        customer_email:    selInvoice.customer_email,
      };
      const res = await fetchWithAuth('/api/einvoicing/debit-notes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error al emitir'); }
      setSuccess('Nota de débito emitida correctamente');
      setShowModal(false);
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totals = selInvoice ? calcTotals() : null;

  return (
    <PageTemplate
      title="Notas de Débito Electrónicas"
      subtitle="Emisión y gestión de notas de débito SRI"
      loading={loading}
      headerAction={
        <button className="btn-primary" onClick={openModal}>
          <Plus size={16} /> Nueva Nota de Débito
        </button>
      }
    >
      <div className="credit-notes-container">
        {error   && <div className="alert-error"><AlertCircle size={16} /> {error}</div>}
        {success && <div className="alert-success"><Check size={16} /> {success}</div>}

        <div className="notes-table-wrapper">
          <table className="notes-table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Factura relacionada</th>
                <th>Motivo</th>
                <th>Val. adicional</th>
                <th>Interés</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {!loading && notes.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                    <FileText size={32} style={{ display: 'block', margin: '0 auto 10px', color: '#cbd5e1' }} />
                    Sin notas de débito emitidas
                  </td>
                </tr>
              )}
              {notes.map(n => {
                const st = STATUS_STYLE[n.status] || STATUS_STYLE.pendiente;
                return (
                  <tr key={n.id}>
                    <td style={{ fontWeight: 700, color: '#6842fe' }}>{n.debit_note_number || `DN-${String(n.id).padStart(9,'0')}`}</td>
                    <td>{n.reference_invoice || '—'}</td>
                    <td title={n.reason}>{(n.reason || '').substring(0, 40)}{n.reason?.length > 40 ? '…' : ''}</td>
                    <td>${parseFloat(n.additional_value || 0).toFixed(2)}</td>
                    <td>${parseFloat(n.interest_value   || 0).toFixed(2)}</td>
                    <td style={{ fontWeight: 700, color: '#059669' }}>${parseFloat(n.total || 0).toFixed(2)}</td>
                    <td>
                      <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ color: '#64748b' }}>{n.created_at ? new Date(n.created_at).toLocaleDateString('es-EC') : '—'}</td>
                    <td>
                      <button className="icon-btn" title="Ver PDF" onClick={() => window.open(`/api/einvoicing/debit-notes/${n.id}/pdf`, '_blank')}>
                        <FileText size={15} />
                      </button>
                      {n.status !== 'autorizada' && (
                        <button className="icon-btn" title="Reenviar al SRI">
                          <Send size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-container modal-lg" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Emitir Nota de Débito</h2>
                <button className="close-btn" onClick={() => setShowModal(false)}><X size={20} /></button>
              </div>
              <div className="modal-body">

                <div className="form-group">
                  <label>Factura a debitar *</label>
                  <select onChange={e => setSelInvoice(invoices.find(i => i.id === e.target.value) || null)}>
                    <option value="">— Seleccionar factura autorizada —</option>
                    {invoices.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_number} · {inv.customer_name} · ${parseFloat(inv.total || 0).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>

                {selInvoice && (
                  <div style={{ background: 'rgba(104,66,254,0.07)', border: '1px solid rgba(104,66,254,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
                    <div style={{ fontWeight: 700, color: '#6842fe' }}>{selInvoice.invoice_number}</div>
                    <div style={{ color: '#94a3b8' }}>{selInvoice.customer_name} · {selInvoice.customer_ruc}</div>
                    <div style={{ color: '#059669', fontWeight: 700 }}>Total factura: ${parseFloat(selInvoice.total || 0).toFixed(2)}</div>
                  </div>
                )}

                <div className="form-group">
                  <label>Motivo *</label>
                  <textarea
                    rows={3}
                    value={formData.reason}
                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Ej: Ajuste de precio, Interés por mora, Gasto adicional…"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label>Valor adicional ($)</label>
                    <input
                      type="number" step="0.01" min="0"
                      value={formData.additional_value}
                      onChange={e => setFormData({ ...formData, additional_value: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-group">
                    <label>Interés por mora (%)</label>
                    <input
                      type="number" step="0.01" min="0"
                      value={formData.interest_rate}
                      onChange={e => setFormData({ ...formData, interest_rate: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {totals && (
                  <div className="totals" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '12px 16px', marginTop: 8 }}>
                    {totals.addVal > 0   && <div>Valor adicional: <strong>${totals.addVal.toFixed(2)}</strong></div>}
                    {totals.interest > 0 && <div>Interés: <strong>${totals.interest.toFixed(2)}</strong></div>}
                    <div>Subtotal: <strong>${totals.total.toFixed(2)}</strong></div>
                    <div>IVA 15%: <strong>${totals.iva.toFixed(2)}</strong></div>
                    <div style={{ fontSize: 16, marginTop: 6, color: '#6842fe' }}>
                      Total a debitar: <strong>${totals.grandTotal.toFixed(2)}</strong>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setShowModal(false)} disabled={submitting}>Cancelar</button>
                <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Emitiendo…' : 'Emitir Nota de Débito'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTemplate>
  );
}
