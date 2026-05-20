import React, { useState, useEffect } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { Plus, Eye, Send, RefreshCw, AlertCircle, Check, X, FileText } from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';
import { usePrinterService } from '../../services/usePrinterService';
import '../../styles/CreditNotes.css';

export default function CreditNotes() {
  const { print } = usePrinterService();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false); // ✅ NUEVO: Para prevenir doble envío
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [formData, setFormData] = useState({
    reason: '',
    items: [],
    total: 0,
    subtotal: 0,
    iva_amount: 0,
    discount_amount: 0
  });
  const [editMode, setEditMode] = useState(false);

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
      setInvoices(data.filter(inv => inv.status === 'autorizada' && (inv.total - (inv.credited_amount || 0)) > 0));
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadCreditNotes();
  }, []);

  const openCreateModal = async () => {
    await loadInvoices();
    setSelectedInvoice(null);
    setFormData({ reason: '', items: [], total: 0, subtotal: 0, iva_amount: 0, discount_amount: 0 });
    setShowModal(true);
  };

  const handleInvoiceSelect = (invoice) => {
    setSelectedInvoice(invoice);
    // Prellenar items con los productos de la factura (copia editable)
    const itemsCopy = (invoice.items || []).map(item => ({
      ...item,
      quantity_credited: item.quantity,
      subtotal_credited: item.subtotal
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
    if (submitting) return; // ✅ Prevención de doble envío
    if (!selectedInvoice || !formData.reason) {
      setError('Seleccione una factura y escriba un motivo');
      return;
    }
    try {
      setSubmitting(true);
      const totalCredited = formData.items.reduce((sum, i) => sum + i.subtotal_credited, 0);
      const ivaCredited = totalCredited * 0.15; // simplificado, debería calcular según ítems
      const payload = {
        invoice_id: selectedInvoice.id,
        reason: formData.reason,
        items: formData.items.map(i => ({
          product_id: i.product_id,
          description: i.description,
          quantity: i.quantity_credited,
          unit_price: i.unit_price,
          subtotal: i.subtotal_credited
        })),
        subtotal: totalCredited,
        iva_amount: ivaCredited,
        discount_amount: formData.discount_amount,
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
      setSuccess('Nota de crédito emitida correctamente');
      setShowModal(false);
      loadCreditNotes();
      setTimeout(() => setSuccess(''), 3000);
      if (data.id) window.open(`/api/einvoicing/credit-notes/${data.id}/pdf`, '_blank');

      // Imprimir en térmica
      try {
        let bizInfo = {};
        const cfgRes = await fetchWithAuth('/api/einvoicing/config');
        if (cfgRes.ok) {
          const cfg = await cfgRes.json();
          bizInfo = { ruc: cfg.ruc, company_name: cfg.razon_social, trade_name: cfg.nombre_comercial || cfg.razon_social, address: cfg.direccion_matriz };
        }
        const cnNumber = data.id ? `001-001-${String(data.id).padStart(9, '0')}` : 'N/A';
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

  const headerAction = (
    <button className="btn-primary" onClick={openCreateModal}>
      <Plus size={16} /> Nueva Nota de Crédito
    </button>
  );

  return (
    <PageTemplate
      title="Notas de Crédito Electrónicas"
      subtitle="Emisión, autorización y gestión de notas de crédito SRI"
      loading={loading}
      headerAction={headerAction}
    >
      <div className="credit-notes-container">
        {error && <div className="alert-error"><AlertCircle size={16} /> {error}</div>}
        {success && <div className="alert-success"><Check size={16} /> {success}</div>}

        <div className="notes-table-wrapper">
          <table className="notes-table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Factura Relacionada</th>
                <th>Motivo</th>
                <th>Total</th>
                <th>Estado SRI</th>
                <th>Fecha Emisión</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {notes.map(n => (
                <tr key={n.id}>
                  <td>{n.credit_note_number}</td>
                  <td>{n.invoice_number || '-'}</td>
                  <td>{n.reason.substring(0, 50)}...</td>
                  <td>${Number(n.total).toFixed(2)}</td>
                  <td>
                    <span className={`status-badge ${n.status}`}>
                      {n.status === 'autorizada' ? 'Autorizada' : n.status}
                    </span>
                  </td>
                  <td>{new Date(n.emission_date).toLocaleDateString()}</td>
                  <td>
                    <button className="icon-btn" onClick={() => window.open(`/api/einvoicing/credit-notes/${n.id}/pdf`, '_blank')}>
                      <FileText size={16} />
                    </button>
                    {n.status !== 'autorizada' && (
                      <button className="icon-btn" onClick={() => {/* reenviar */}}>
                        <Send size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-container modal-lg" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Emitir Nota de Crédito</h2>
                <button className="close-btn" onClick={() => setShowModal(false)}><X size={20} /></button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Seleccionar Factura</label>
                  <select onChange={e => handleInvoiceSelect(invoices.find(i => i.id === e.target.value))}>
                    <option value="">-- Seleccionar --</option>
                    {invoices.map(inv => (
                      <option key={inv.id} value={inv.id}>{inv.invoice_number} - {inv.customer_name} - ${inv.total}</option>
                    ))}
                  </select>
                </div>
                {selectedInvoice && (
                  <>
                    <div className="form-group">
                      <label>Motivo de la nota de crédito *</label>
                      <textarea rows="3" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} placeholder="Ej: Devolución total, Anulación por error, etc." />
                    </div>
                    <div className="items-editor">
                      <h4>Productos a acreditar</h4>
                      {formData.items.map((item, idx) => (
                        <div key={idx} className="credit-item">
                          <span>{item.description}</span>
                          <input type="number" step="1" value={item.quantity_credited} onChange={e => {
                            const newItems = [...formData.items];
                            newItems[idx].quantity_credited = Number(e.target.value);
                            newItems[idx].subtotal_credited = newItems[idx].quantity_credited * (parseFloat(newItems[idx].unit_price) || 0);
                            setFormData({...formData, items: newItems, subtotal: newItems.reduce((s,i)=>s+(parseFloat(i.subtotal_credited)||0),0)});
                          }} />
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
                <button className="btn-secondary" onClick={() => setShowModal(false)} disabled={submitting}>Cancelar</button>
                <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Emitiendo...' : 'Emitir Nota de Crédito'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTemplate>
  );
}