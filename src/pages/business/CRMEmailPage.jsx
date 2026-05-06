import React, { useState, useEffect } from 'react';
import PageTemplate from '../../components/PageTemplate';
import {
  Plus, Edit2, Trash2, Send, Eye, X, Check, AlertCircle,
  Mail, Users, Calendar, Loader, CheckCircle, XCircle
} from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/CrmEmail.css';

// ── Modal de confirmación de envío ────────────────────────────────────────────
function CampaignSendModal({ campaign, clientCount, onClose, onSent }) {
  const [sending,  setSending ] = useState(false);
  const [result,   setResult  ] = useState(null);
  const [err,      setErr     ] = useState('');

  const handleSend = async () => {
    setSending(true); setErr('');
    try {
      const res  = await fetchWithAuth(`/api/crm/email-campaigns/${campaign.id}/send`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar');
      setResult(data);
      onSent(data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: 24, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', boxSizing: 'border-box' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ background: 'rgba(16,185,129,0.15)', borderRadius: 8, padding: 6 }}>
              <Mail size={18} color="#10b981" />
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>Enviar campaña</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Campaign info */}
        <div style={{ background: '#0f172a', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12 }}>
          <div style={{ color: '#94a3b8', marginBottom: 2 }}>Campaña</div>
          <div style={{ fontWeight: 700, color: '#10b981', fontSize: 14 }}>{campaign.title}</div>
          <div style={{ color: '#cbd5e1', marginTop: 4 }}>Asunto: {campaign.subject}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8, color: '#60d5c0', fontWeight: 600 }}>
            <Users size={12} />
            {clientCount !== null
              ? `${clientCount} cliente${clientCount !== 1 ? 's' : ''} con correo registrado`
              : 'Todos los clientes con correo'}
          </div>
        </div>

        {/* Resultado */}
        {result && (
          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', fontWeight: 700, marginBottom: 6 }}>
              <CheckCircle size={14} /> Envío completado
            </div>
            <div style={{ color: '#cbd5e1' }}>
              ✅ Enviados: <strong>{result.sent_count || 0}</strong> de <strong>{result.total || 0}</strong>
            </div>
            {result.failed > 0 && (
              <div style={{ color: '#f87171', marginTop: 4 }}>
                ❌ Fallidos: <strong>{result.failed}</strong>
              </div>
            )}
          </div>
        )}

        {err && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444', fontSize: 12, marginBottom: 12 }}>
            <XCircle size={13} /> {err}
          </div>
        )}

        {/* Buttons */}
        {!result ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSend}
              disabled={sending}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 0', background: sending ? '#064e3b' : '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: sending ? 'default' : 'pointer' }}
            >
              {sending ? <Loader size={15} className="spin" /> : <Send size={15} />}
              {sending ? 'Enviando…' : 'Confirmar envío'}
            </button>
            <button
              onClick={onClose}
              disabled={sending}
              style={{ padding: '10px 16px', background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={onClose}
            style={{ width: '100%', padding: '10px 0', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >
            Cerrar
          </button>
        )}
      </div>
    </div>
  );
}

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
  const [sendResult, setSendResult] = useState(null);
  const [clientCount, setClientCount] = useState(null);
  const [sendModalCampaign, setSendModalCampaign] = useState(null);

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

  const handleSendDone = (data) => {
    setSendResult(data);
    let msg = `¡Campaña enviada! ✅ Enviados: ${data.sent_count || 0} de ${data.total || 0}`;
    if (data.failed > 0) {
      msg += ` ❌ Fallidos: ${data.failed}`;
      if (data.errors?.length) console.warn('Errores de envío:', data.errors);
    }
    setSuccess(msg);
    loadCampaigns();
    setTimeout(() => setSuccess(''), 8000);
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
                    onClick={() => setSendModalCampaign(camp)}
                    disabled={!camp.is_active}
                    title={!camp.is_active ? 'La campaña está inactiva' : 'Enviar a todos los clientes'}
                  >
                    <Send size={16} /> Enviar
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
                  <textarea rows="7" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} placeholder="<p>Hola, tenemos ofertas...</p>" style={{ minHeight: 120 }} />
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