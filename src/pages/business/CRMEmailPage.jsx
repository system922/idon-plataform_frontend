import React, { useState, useEffect } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { 
  Plus, Edit2, Trash2, Send, Eye, X, Check, AlertCircle, 
  Mail, Users, Calendar, Loader 
} from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/CrmEmail.css';

export default function CrmEmail() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null); // para mostrar detalles del envío
  const [clientCount, setClientCount] = useState(null); // para saber cuántos emails hay antes de enviar

  // Formulario de campaña
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    content: '',
    is_active: true
  });

  const loadCampaigns = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth('/api/crm/email-campaigns');
      if (!res.ok) throw new Error('Error al cargar campañas');
      const data = await res.json();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cargar el número de clientes con email (para mostrarlo en la confirmación)
  const fetchClientCount = async () => {
    try {
      // Podemos tener un endpoint específico, pero por simplicidad obtenemos la lista de emails
      // Esto no es necesario, pero mejora la UX.
      const res = await fetchWithAuth('/api/customers?fields=email');
      if (res.ok) {
        const data = await res.json();
        const emails = (Array.isArray(data) ? data : []).filter(c => c.email).map(c => c.email);
        setClientCount(emails.length);
      } else {
        setClientCount(null);
      }
    } catch {
      setClientCount(null);
    }
  };

  useEffect(() => {
    loadCampaigns();
    fetchClientCount();
  }, []);

  const openModal = (campaign = null) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setFormData({
        title: campaign.title,
        subject: campaign.subject,
        content: campaign.content,
        is_active: campaign.is_active
      });
    } else {
      setEditingCampaign(null);
      setFormData({ title: '', subject: '', content: '', is_active: true });
    }
    setError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.subject.trim() || !formData.content.trim()) {
      setError('Todos los campos son obligatorios');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const url = editingCampaign 
        ? `/api/crm/email-campaigns/${editingCampaign.id}` 
        : '/api/crm/email-campaigns';
      const method = editingCampaign ? 'PUT' : 'POST';
      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al guardar');
      }
      setSuccess(editingCampaign ? 'Campaña actualizada' : 'Campaña creada');
      setModalOpen(false);
      loadCampaigns();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (campaign) => {
    if (!window.confirm(`¿Eliminar la campaña "${campaign.title}"?`)) return;
    try {
      const res = await fetchWithAuth(`/api/crm/email-campaigns/${campaign.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      setSuccess('Campaña eliminada');
      loadCampaigns();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleSend = async (campaign) => {
    const totalClients = clientCount !== null ? clientCount : 'todos los';
    const confirmMsg = `¿Enviar "${campaign.title}" a ${totalClients} clientes? Esta acción puede tomar varios segundos.`;
    if (!window.confirm(confirmMsg)) return;

    setSending(true);
    setSendResult(null);
    setError('');
    try {
      const res = await fetchWithAuth(`/api/crm/email-campaigns/${campaign.id}/send`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar');
      
      // Mostrar resultado detallado
      let msg = `¡Campaña enviada! ✅ Enviados: ${data.sent_count || 0} de ${data.total || 0}`;
      if (data.failed && data.failed > 0) {
        msg += ` ❌ Fallidos: ${data.failed}`;
        if (data.errors && data.errors.length) {
          console.warn('Errores de envío:', data.errors);
          msg += ` (ver consola para detalles)`;
        }
      }
      setSuccess(msg);
      setSendResult(data);
      loadCampaigns(); // para actualizar la fecha de envío
      setTimeout(() => setSuccess(''), 8000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setSending(false);
    }
  };

  const headerAction = (
    <button className="btn-primary" onClick={() => openModal()} disabled={saving || sending}>
      <Plus size={16} /> Nueva campaña
    </button>
  );

  return (
    <PageTemplate
      title="Email Marketing"
      subtitle={`Gestiona campañas de email (${clientCount !== null ? clientCount + ' clientes con email' : 'carga de clientes...'})`}
      loading={loading}
      headerAction={headerAction}
    >
      <div className="crm-email-container">
        {error && <div className="alert-error"><AlertCircle size={16} /> {error}</div>}
        {success && <div className="alert-success"><Check size={16} /> {success}</div>}

        <div className="campaigns-grid">
          {campaigns.length === 0 ? (
            <div className="empty-state">
              <Mail size={48} />
              <h3>No hay campañas</h3>
              <p>Crea tu primera campaña de email marketing</p>
              <button className="btn-primary" onClick={() => openModal()}>
                <Plus size={14} /> Nueva campaña
              </button>
            </div>
          ) : (
            campaigns.map(camp => (
              <div key={camp.id} className="campaign-card">
                <div className="campaign-header">
                  <div className="campaign-icon"><Mail size={20} /></div>
                  <div className="campaign-title">{camp.title}</div>
                  <div className={`campaign-status ${camp.is_active ? 'active' : 'inactive'}`}>
                    {camp.is_active ? 'Activa' : 'Inactiva'}
                  </div>
                </div>
                <div className="campaign-subject">{camp.subject}</div>
                <div className="campaign-preview" dangerouslySetInnerHTML={{ __html: camp.content.substring(0, 100) + (camp.content.length > 100 ? '…' : '') }} />
                <div className="campaign-meta">
                  <Calendar size={14} /> {new Date(camp.created_at).toLocaleDateString()}
                  {camp.sent_at && <span> · Enviada: {new Date(camp.sent_at).toLocaleDateString()}</span>}
                </div>
                <div className="campaign-actions">
                  <button className="icon-btn edit" onClick={() => openModal(camp)} disabled={saving}>
                    <Edit2 size={16} /> Editar
                  </button>
                  <button className="icon-btn preview" onClick={() => { setEditingCampaign(camp); setPreviewOpen(true); }}>
                    <Eye size={16} /> Prever
                  </button>
                  <button 
                    className="icon-btn send" 
                    onClick={() => handleSend(camp)} 
                    disabled={sending || !camp.is_active}
                    title={!camp.is_active ? 'La campaña está inactiva' : 'Enviar a todos los clientes'}
                  >
                    {sending ? <Loader size={16} className="spin" /> : <Send size={16} />} 
                    Enviar
                  </button>
                  <button className="icon-btn delete" onClick={() => handleDelete(camp)} disabled={sending}>
                    <Trash2 size={16} /> Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal de creación/edición */}
        {modalOpen && (
          <div className="modal-overlay" onClick={() => setModalOpen(false)}>
            <div className="modal-container modal-lg" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingCampaign ? 'Editar campaña' : 'Nueva campaña'}</h2>
                <button className="close-btn" onClick={() => setModalOpen(false)}><X size={20} /></button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Título *</label>
                  <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ej: Ofertas de verano" />
                </div>
                <div className="form-group">
                  <label>Asunto del correo *</label>
                  <input type="text" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} placeholder="Asunto que verán los clientes" />
                </div>
                <div className="form-group">
                  <label>Contenido (HTML) *</label>
                  <textarea rows="10" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} placeholder="<p>Hola, tenemos ofertas...</p>" />
                  <small>Puedes usar HTML. Se recomienda diseño responsive.</small>
                </div>
                <div className="form-group checkbox">
                  <label>
                    <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} />
                    Activar campaña (disponible para envío)
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Guardando...' : (editingCampaign ? 'Actualizar' : 'Crear')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de previsualización */}
        {previewOpen && editingCampaign && (
          <div className="modal-overlay" onClick={() => setPreviewOpen(false)}>
            <div className="modal-container modal-lg preview-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Previsualización: {editingCampaign.title}</h2>
                <button className="close-btn" onClick={() => setPreviewOpen(false)}><X size={20} /></button>
              </div>
              <div className="modal-body preview-body">
                <div className="preview-subject">Asunto: {editingCampaign.subject}</div>
                <div className="preview-content" dangerouslySetInnerHTML={{ __html: editingCampaign.content }} />
              </div>
              <div className="modal-footer">
                <button className="btn-primary" onClick={() => setPreviewOpen(false)}>Cerrar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTemplate>
  );
}