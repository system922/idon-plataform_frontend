import React, { useState, useEffect, useCallback } from "react";
import { useConfirm } from '../../context/ConfirmContext';
import {
  FiMail, FiPlus, FiEdit2, FiTrash2, FiRefreshCw,
  FiAlertCircle, FiSearch, FiSend, FiClock, FiCheckCircle,
  FiX, FiEye, FiFileText,
  FiToggleLeft, FiToggleRight, FiCopy, FiTag, FiUsers
} from "react-icons/fi";
import PageTemplate from '../../components/PageTemplate';
import { useBusinessContext } from '../../admin/config/BusinessContext';
import { fetchWithAuth } from '../../config/apiBase';
import "../../styles/NotificationsEmailPage.css";

// ─── Modal de Plantilla de Email ──────────────────────────────────────────────
function EmailTemplateModal({ template, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    name: '',
    subject: '',
    body: '',
    category: 'general',
    is_active: true
  });
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (template) {
      setForm({
        name: template.name || '',
        subject: template.subject || '',
        body: template.body || '',
        category: template.category || 'general',
        is_active: template.is_active ?? true
      });
    }
  }, [template]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('El nombre de la plantilla es requerido');
      return;
    }
    if (!form.subject.trim()) {
      setError('El asunto es requerido');
      return;
    }
    if (!form.body.trim()) {
      setError('El contenido del email es requerido');
      return;
    }
    
    onSave(form);
  };

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'welcome', label: 'Bienvenida' },
    { value: 'invoice', label: 'Facturación' },
    { value: 'reminder', label: 'Recordatorios' },
    { value: 'promotion', label: 'Promociones' },
    { value: 'alert', label: 'Alertas' }
  ];

  return (
    <div className="email-modal-overlay" onClick={onClose}>
      <div className="email-modal-box email-modal-large" onClick={e => e.stopPropagation()}>
        <div className="email-modal-header">
          <h2>{template ? 'Editar plantilla' : 'Nueva plantilla de email'}</h2>
          <button type="button" onClick={onClose} className="email-modal-close">
            <FiX size={22} />
          </button>
        </div>

        {error && (
          <div className="alert alert-error">
            <FiAlertCircle size={16} /> {error}
          </div>
        )}

        <div className="email-modal-tabs">
          <button 
            className={`email-tab ${!preview ? 'active' : ''}`}
            onClick={() => setPreview(false)}
          >
            <FiEdit2 size={14} /> Editar
          </button>
          <button 
            className={`email-tab ${preview ? 'active' : ''}`}
            onClick={() => setPreview(true)}
          >
            <FiEye size={14} /> Vista previa
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {!preview ? (
            <div className="email-form-grid">
              <div className="email-form-group">
                <label>Nombre de la plantilla *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Bienvenida nuevo cliente"
                  autoFocus
                />
              </div>

              <div className="email-form-group">
                <label>Categoría</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className="email-form-group full-width">
                <label>Asunto *</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                  placeholder="Asunto del email"
                />
              </div>

              <div className="email-form-group full-width">
                <label>Contenido del email * (HTML)</label>
                <textarea
                  value={form.body}
                  onChange={e => setForm({ ...form, body: e.target.value })}
                  rows={12}
                  placeholder={`<div style="font-family:sans-serif;max-width:600px;">
  <h1>Bienvenido {{nombre}}</h1>
  <p>Gracias por unirte a {{negocio}}.</p>
  <p>Tu factura {{factura}} por {{monto}} ha sido generada.</p>
</div>`}
                />
              </div>

              <div className="email-form-group full-width">
                <label>Variables disponibles</label>
                <div className="email-variables-list">
                  <span className="email-variable">{"{{nombre}}"}</span>
                  <span className="email-variable">{"{{email}}"}</span>
                  <span className="email-variable">{"{{fecha}}"}</span>
                  <span className="email-variable">{"{{negocio}}"}</span>
                  <span className="email-variable">{"{{factura}}"}</span>
                  <span className="email-variable">{"{{monto}}"}</span>
                  <span className="email-variable">{"{{fecha_vencimiento}}"}</span>
                  <span className="email-variable">{"{{link}}"}</span>
                  <span className="email-variable">{"{{reset_link}}"}</span>
                </div>
              </div>

              <div className="email-form-group">
                <label className="email-checkbox">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  />
                  <span>Plantilla activa</span>
                </label>
              </div>
            </div>
          ) : (
            <div className="email-preview-container">
              <div className="email-preview-header">
                <strong>Asunto:</strong> {form.subject}
              </div>
              <div 
                className="email-preview-body"
                dangerouslySetInnerHTML={{ __html: form.body.replace(/\{\{(.*?)\}\}/g, '<span class="email-preview-variable">{$1}</span>') }}
              />
              <div className="email-preview-footer">
                <small>Las variables se reemplazarán automáticamente al enviar</small>
              </div>
            </div>
          )}

          <div className="email-modal-footer">
            <button className="email-btn-cancel" type="button" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button className="email-btn-save" type="submit" disabled={saving}>
              {saving ? 'Guardando...' : template ? 'Guardar cambios' : 'Crear plantilla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal de Envío de Email ──────────────────────────────────────────────────
function SendEmailModal({ template, customers, invoices, onClose, onSend, sending }) {
  const [form, setForm] = useState({
    to: '',
    subject: '',
    body: '',
    recipients: 'single',
    isCampaign: false,
    invoiceId: null
  });
  const [error, setError] = useState('');
  const [bulkRecipients, setBulkRecipients] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState([]);

  useEffect(() => {
    if (template) {
      setForm(prev => ({
        ...prev,
        subject: template.subject,
        body: template.body
      }));
    }
  }, [template]);

  // Reemplazar variables en el contenido
  const replaceVariables = (content, customer, invoice) => {
    let result = content;
    if (customer) {
      result = result.replace(/\{\{nombre\}\}/g, customer.name || 'Cliente');
      result = result.replace(/\{\{email\}\}/g, customer.email || '');
    }
    if (invoice) {
      result = result.replace(/\{\{factura\}\}/g, invoice.invoice_number || '');
      result = result.replace(/\{\{monto\}\}/g, invoice.total || '0.00');
      result = result.replace(/\{\{fecha_vencimiento\}\}/g, invoice.due_date || '');
    }
    result = result.replace(/\{\{fecha\}\}/g, new Date().toLocaleDateString());
    result = result.replace(/\{\{negocio\}\}/g, localStorage.getItem('businessName') || 'Mi Negocio');
    return result;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (form.isCampaign) {
      let emails = [];
      if (selectedCustomers.length > 0) {
        emails = selectedCustomers.map(c => c.email);
      } else if (bulkRecipients) {
        emails = bulkRecipients.split(',').map(e => e.trim()).filter(e => e);
      }
      
      if (emails.length === 0) {
        setError('Seleccione al menos un destinatario');
        return;
      }
      
      onSend({
        type: 'campaign',
        recipients: emails,
        subject: form.subject,
        body: form.body
      });
    } else {
      if (!form.to.trim()) {
        setError('El destinatario es requerido');
        return;
      }
      if (!form.subject.trim()) {
        setError('El asunto es requerido');
        return;
      }
      
      // Buscar cliente y factura para reemplazar variables
      const customer = customers.find(c => c.email === form.to);
      const invoice = form.invoiceId ? invoices.find(i => i.id === form.invoiceId) : null;
      
      const finalBody = replaceVariables(form.body, customer, invoice);
      const finalSubject = replaceVariables(form.subject, customer, invoice);
      
      onSend({
        type: 'single',
        to: form.to,
        subject: finalSubject,
        body: finalBody,
        invoiceId: form.invoiceId
      });
    }
  };

  return (
    <div className="email-modal-overlay" onClick={onClose}>
      <div className="email-modal-box email-modal-large" onClick={e => e.stopPropagation()}>
        <div className="email-modal-header">
          <h2>Enviar correo electrónico</h2>
          <button type="button" onClick={onClose} className="email-modal-close">
            <FiX size={22} />
          </button>
        </div>

        {error && (
          <div className="alert alert-error">
            <FiAlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="email-form-group">
            <label>Tipo de envío</label>
            <div className="email-radio-group">
              <label>
                <input
                  type="radio"
                  checked={!form.isCampaign}
                  onChange={() => setForm({ ...form, isCampaign: false, recipients: 'single' })}
                />
                <span>Correo individual</span>
              </label>
              <label>
                <input
                  type="radio"
                  checked={form.isCampaign}
                  onChange={() => setForm({ ...form, isCampaign: true, recipients: 'bulk' })}
                />
                <span>Campaña (BCC - múltiples destinatarios)</span>
              </label>
            </div>
          </div>

          {!form.isCampaign ? (
            <>
              <div className="email-form-group">
                <label>Destinatario *</label>
                <input
                  type="email"
                  value={form.to}
                  onChange={e => setForm({ ...form, to: e.target.value })}
                  placeholder="cliente@ejemplo.com"
                />
              </div>

              <div className="email-form-group">
                <label>Adjuntar factura (opcional)</label>
                <select
                  value={form.invoiceId || ''}
                  onChange={e => setForm({ ...form, invoiceId: e.target.value ? parseInt(e.target.value) : null })}
                  className="email-invoice-select"
                >
                  <option value="">Sin factura</option>
                  {invoices.slice(0, 20).map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} - ${inv.total} - {inv.customer_name}
                    </option>
                  ))}
                </select>
                <small className="email-hint">
                  Si seleccionas una factura, el PDF se adjuntará automáticamente
                </small>
              </div>
            </>
          ) : (
            <>
              <div className="email-form-group">
                <label>Seleccionar clientes</label>
                <div className="email-customers-list">
                  {customers.slice(0, 10).map(customer => (
                    <label key={customer.id} className="email-customer-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.some(c => c.id === customer.id)}
                        onChange={() => {
                          if (selectedCustomers.find(c => c.id === customer.id)) {
                            setSelectedCustomers(selectedCustomers.filter(c => c.id !== customer.id));
                          } else {
                            setSelectedCustomers([...selectedCustomers, customer]);
                          }
                        }}
                      />
                      <span>{customer.name} - {customer.email}</span>
                    </label>
                  ))}
                  {customers.length > 10 && (
                    <div className="email-more-customers">
                      + {customers.length - 10} clientes más...
                    </div>
                  )}
                </div>
              </div>

              <div className="email-form-group">
                <label>O ingresar correos manualmente (separados por comas)</label>
                <textarea
                  value={bulkRecipients}
                  onChange={e => setBulkRecipients(e.target.value)}
                  placeholder="cliente1@ejemplo.com, cliente2@ejemplo.com, ..."
                  rows={3}
                />
                <small className="email-hint">
                  Los correos se enviarán usando BCC (destinatarios ocultos entre sí)
                </small>
              </div>
            </>
          )}

          <div className="email-form-group">
            <label>Asunto *</label>
            <input
              type="text"
              value={form.subject}
              onChange={e => setForm({ ...form, subject: e.target.value })}
              placeholder="Asunto del email"
            />
          </div>

          <div className="email-form-group">
            <label>Contenido (HTML)</label>
            <textarea
              value={form.body}
              onChange={e => setForm({ ...form, body: e.target.value })}
              rows={8}
              placeholder="<h1>Hola {{nombre}}</h1><p>Mensaje...</p>"
            />
            <small className="email-hint">
              Puedes usar variables: {`{{nombre}}, {{email}}, {{fecha}}, {{negocio}}, {{factura}}, {{monto}}`}
            </small>
          </div>

          <div className="email-modal-footer">
            <button className="email-btn-cancel" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="email-btn-send" type="submit" disabled={sending}>
              <FiSend size={14} />
              {sending ? 'Enviando...' : form.isCampaign ? 'Enviar campaña' : 'Enviar correo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Componente de Log de Envíos ──────────────────────────────────────────────
function EmailLogItem({ log }) {
  const statusIcon = log.status === 'sent' ? <FiCheckCircle size={14} /> : 
                     log.status === 'failed' ? <FiAlertCircle size={14} /> : 
                     <FiClock size={14} />;
  
  const statusClass = log.status === 'sent' ? 'sent' : 
                      log.status === 'failed' ? 'failed' : 'pending';

  return (
    <div className="email-log-item">
      <div className="email-log-info">
        <div className="email-log-recipient">{log.recipient || log.recipients?.join(', ')}</div>
        <div className="email-log-subject">{log.subject}</div>
        <div className="email-log-date">{new Date(log.sent_at).toLocaleString()}</div>
        {log.type === 'campaign' && (
          <div className="email-log-type">📢 Campaña - {log.recipient_count || log.recipients?.length} destinatarios</div>
        )}
        {log.type === 'invoice' && (
          <div className="email-log-type">🧾 Factura: {log.invoice_number}</div>
        )}
        {log.error_message && (
          <div className="email-log-error">{log.error_message}</div>
        )}
      </div>
      <div className="email-log-status">
        <span className={`email-status-badge ${statusClass}`}>
          {statusIcon} {log.status === 'sent' ? 'Enviado' : log.status === 'failed' ? 'Fallido' : 'Pendiente'}
        </span>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function NotificationsEmailPage() {
  const { selectedBusiness } = useBusinessContext();
  const { showConfirm } = useConfirm();
  const [templates, setTemplates] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('templates');
  const [stats, setStats] = useState({
    total_sent: 0,
    total_failed: 0,
    total_templates: 0
  });

  // Cargar datos
  const loadTemplates = useCallback(async () => {
    if (!selectedBusiness?.id) return;
    try {
      const res = await fetchWithAuth('/api/notifications/email/templates');
      const data = await res.json();
      const templatesList = Array.isArray(data.data) ? data.data : data.templates || [];
      setTemplates(templatesList);
      setStats(prev => ({ ...prev, total_templates: templatesList.length }));
    } catch (err) {

    }
  }, [selectedBusiness]);

  const loadEmailLogs = useCallback(async () => {
    if (!selectedBusiness?.id) return;
    try {
      const res = await fetchWithAuth('/api/notifications/email/logs?limit=100');
      const data = await res.json();
      const logsList = Array.isArray(data.data) ? data.data : data.logs || [];
      setEmailLogs(logsList);
      const sent = logsList.filter(l => l.status === 'sent').length;
      const failed = logsList.filter(l => l.status === 'failed').length;
      setStats(prev => ({ ...prev, total_sent: sent, total_failed: failed }));
    } catch (err) {

    }
  }, [selectedBusiness]);

  const loadCustomers = useCallback(async () => {
    if (!selectedBusiness?.id) return;
    try {
      const res = await fetchWithAuth('/api/accounting/customers?limit=100');
      const data = await res.json();
      setCustomers(Array.isArray(data.data) ? data.data : data.customers || []);
    } catch (err) {

    }
  }, [selectedBusiness]);

  const loadInvoices = useCallback(async () => {
    if (!selectedBusiness?.id) return;
    try {
      const res = await fetchWithAuth('/api/einvoicing/invoices?status=autorizada&limit=50');
      const data = await res.json();
      setInvoices(Array.isArray(data.data) ? data.data : data.invoices || []);
    } catch (err) {

    }
  }, [selectedBusiness]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([
        loadTemplates(),
        loadEmailLogs(),
        loadCustomers(),
        loadInvoices()
      ]);
    } catch (err) {
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  }, [loadTemplates, loadEmailLogs, loadCustomers, loadInvoices]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Filtrar plantillas
  const filteredTemplates = templates.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.subject?.toLowerCase().includes(search.toLowerCase())
  ).filter(t => categoryFilter === 'all' || t.category === categoryFilter);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const handleSaveTemplate = async (form) => {
    setSaving(true);
    setError('');
    try {
      const isEdit = !!editingTemplate;
      const url = isEdit 
        ? `/api/notifications/email/templates/${editingTemplate.id}` 
        : '/api/notifications/email/templates';
      const method = isEdit ? 'PUT' : 'POST';
      
      const res = await fetchWithAuth(url, { method, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar plantilla');
      
      setShowTemplateModal(false);
      setEditingTemplate(null);
      loadTemplates();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (template) => {
    if (!await showConfirm(`¿Eliminar la plantilla "${template.name}"?`)) return;
    
    setSaving(true);
    try {
      await fetchWithAuth(`/api/notifications/email/templates/${template.id}`, { method: 'DELETE' });
      loadTemplates();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendEmail = async (data) => {
    setSaving(true);
    try {
      let payload = {};
      
      if (data.type === 'single') {
        payload = {
          to: data.to,
          subject: data.subject,
          html: data.body,
          invoice_id: data.invoiceId || null
        };
      } else {
        payload = {
          recipients: data.recipients,
          subject: data.subject,
          html: data.body
        };
      }
      
      const res = await fetchWithAuth('/api/notifications/email/send', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Error al enviar email');
      
      setShowSendModal(false);
      setSelectedTemplate(null);
      loadEmailLogs();
      
      if (data.type === 'campaign') {
        alert(`📧 Campaña enviada:\n✅ Enviados: ${result.sent || 0}\n❌ Fallidos: ${result.failed || 0}`);
      } else {
        alert(`📧 Email enviado correctamente a ${data.to}`);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTemplateStatus = async (template) => {
    try {
      await fetchWithAuth(`/api/notifications/email/templates/${template.id}/toggle`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !template.is_active })
      });
      loadTemplates();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDuplicateTemplate = async (template) => {
    try {
      const res = await fetchWithAuth(`/api/notifications/email/templates/${template.id}/duplicate`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Error al duplicar plantilla');
      loadTemplates();
    } catch (e) {
      setError(e.message);
    }
  };

  // Botones header
  const refreshButton = (
    <button onClick={handleRefresh} className="email-refresh-btn" disabled={refreshing}>
      <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  const newTemplateButton = (
    <button onClick={() => {
      setEditingTemplate(null);
      setShowTemplateModal(true);
    }} className="email-btn-primary">
      <FiPlus size={16} /> Nueva plantilla
    </button>
  );

  return (
    <PageTemplate
      title="NOTIFICACIONES POR EMAIL"
      subtitle="Gestión de plantillas y envío de correos electrónicos"
      theme="business"
      loading={loading}
      headerAction={
        <div className="email-header-actions">
          {newTemplateButton}
          {refreshButton}
        </div>
      }
    >
      {error && (
        <div className="alert alert-error">
          <FiAlertCircle size={16} /> {error}
        </div>
      )}

      {/* Tarjetas de estadísticas */}
      <div className="email-stats-grid">
        <div className="email-stat-card">
          <div className="email-stat-icon">
            <FiMail size={24} />
          </div>
          <div className="email-stat-content">
            <div className="email-stat-title">Correos enviados</div>
            <div className="email-stat-value">{stats.total_sent}</div>
          </div>
        </div>
        <div className="email-stat-card">
          <div className="email-stat-icon error">
            <FiAlertCircle size={24} />
          </div>
          <div className="email-stat-content">
            <div className="email-stat-title">Fallidos</div>
            <div className="email-stat-value">{stats.total_failed}</div>
          </div>
        </div>
        <div className="email-stat-card">
          <div className="email-stat-icon">
            <FiFileText size={24} />
          </div>
          <div className="email-stat-content">
            <div className="email-stat-title">Plantillas</div>
            <div className="email-stat-value">{stats.total_templates}</div>
          </div>
        </div>
        <div className="email-stat-card">
          <div className="email-stat-icon">
            <FiUsers size={24} />
          </div>
          <div className="email-stat-content">
            <div className="email-stat-title">Clientes</div>
            <div className="email-stat-value">{customers.length}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="email-tabs-container">
        <button 
          className={`email-tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          <FiFileText size={16} />
          Plantillas
          <span className="email-tab-count">{templates.length}</span>
        </button>
        <button 
          className={`email-tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <FiSend size={16} />
          Historial de envíos
          <span className="email-tab-count">{emailLogs.length}</span>
        </button>
      </div>

      {activeTab === 'templates' ? (
        <>
          {/* Filtros para plantillas */}
          <div className="email-filters-bar">
            <div className="email-search-wrapper">
              <FiSearch size={16} className="email-search-icon" />
              <input
                type="text"
                placeholder="Buscar plantilla..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="email-search-input"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="email-filter-select"
            >
              <option value="all">Todas las categorías</option>
              <option value="general">General</option>
              <option value="welcome">Bienvenida</option>
              <option value="invoice">Facturación</option>
              <option value="reminder">Recordatorios</option>
              <option value="promotion">Promociones</option>
              <option value="alert">Alertas</option>
            </select>
          </div>

          {/* Grid de plantillas */}
          <div className="email-templates-grid">
            {filteredTemplates.length === 0 && !loading ? (
              <div className="email-empty-state">
                <FiMail size={48} />
                <span>No hay plantillas de email</span>
                <button onClick={() => setShowTemplateModal(true)} className="email-empty-btn">
                  <FiPlus size={14} /> Crear primera plantilla
                </button>
              </div>
            ) : (
              filteredTemplates.map(template => (
                <div key={template.id} className="email-template-card">
                  <div className="email-template-header">
                    <div className="email-template-title">
                      <FiMail size={18} />
                      <h3>{template.name}</h3>
                    </div>
                    <div className="email-template-status">
                      <span className={`email-status-dot ${template.is_active ? 'active' : 'inactive'}`} />
                      <button 
                        className="email-toggle-btn"
                        onClick={() => handleToggleTemplateStatus(template)}
                        title={template.is_active ? 'Desactivar' : 'Activar'}
                      >
                        {template.is_active ? <FiToggleRight size={20} /> : <FiToggleLeft size={20} />}
                      </button>
                    </div>
                  </div>

                  <div className="email-template-category">
                    <FiTag size={12} />
                    {template.category === 'general' ? 'General' :
                     template.category === 'welcome' ? 'Bienvenida' :
                     template.category === 'invoice' ? 'Facturación' :
                     template.category === 'reminder' ? 'Recordatorio' :
                     template.category === 'promotion' ? 'Promoción' : 'Alerta'}
                  </div>

                  <div className="email-template-subject">
                    <strong>Asunto:</strong> {template.subject}
                  </div>

                  <div className="email-template-preview">
                    {template.body.replace(/<[^>]*>/g, '').substring(0, 100)}...
                  </div>

                  <div className="email-template-actions">
                    <button 
                      className="email-action-btn send"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowSendModal(true);
                      }}
                      title="Enviar con esta plantilla"
                    >
                      <FiSend size={14} /> Enviar
                    </button>
                    <button 
                      className="email-action-btn edit"
                      onClick={() => {
                        setEditingTemplate(template);
                        setShowTemplateModal(true);
                      }}
                      title="Editar"
                    >
                      <FiEdit2 size={14} /> Editar
                    </button>
                    <button 
                      className="email-action-btn duplicate"
                      onClick={() => handleDuplicateTemplate(template)}
                      title="Duplicar"
                    >
                      <FiCopy size={14} /> Duplicar
                    </button>
                    <button 
                      className="email-action-btn delete"
                      onClick={() => handleDeleteTemplate(template)}
                      title="Eliminar"
                    >
                      <FiTrash2 size={14} /> Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <>
          {/* Historial de envíos */}
          <div className="email-filters-bar">
            <div className="email-search-wrapper">
              <FiSearch size={16} className="email-search-icon" />
              <input
                type="text"
                placeholder="Buscar por destinatario o asunto..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="email-search-input"
              />
            </div>
          </div>

          <div className="email-logs-container">
            {emailLogs.filter(log => 
              (log.recipient || log.recipients?.join(',') || '').toLowerCase().includes(search.toLowerCase()) ||
              log.subject?.toLowerCase().includes(search.toLowerCase())
            ).length === 0 && !loading ? (
              <div className="email-empty-state">
                <FiSend size={48} />
                <span>No hay historial de envíos</span>
                <button 
                  onClick={() => {
                    setSelectedTemplate(null);
                    setShowSendModal(true);
                  }} 
                  className="email-empty-btn"
                >
                  <FiSend size={14} /> Enviar primer correo
                </button>
              </div>
            ) : (
              <div className="email-logs-list">
                {emailLogs
                  .filter(log => 
                    (log.recipient || log.recipients?.join(',') || '').toLowerCase().includes(search.toLowerCase()) ||
                    log.subject?.toLowerCase().includes(search.toLowerCase())
                  )
                  .map(log => (
                    <EmailLogItem key={log.id} log={log} />
                  ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modales */}
      {showTemplateModal && (
        <EmailTemplateModal
          template={editingTemplate}
          onClose={() => {
            setShowTemplateModal(false);
            setEditingTemplate(null);
          }}
          onSave={handleSaveTemplate}
          saving={saving}
        />
      )}

      {showSendModal && (
        <SendEmailModal
          template={selectedTemplate}
          customers={customers}
          invoices={invoices}
          onClose={() => {
            setShowSendModal(false);
            setSelectedTemplate(null);
          }}
          onSend={handleSendEmail}
          sending={saving}
        />
      )}
    </PageTemplate>
  );
}