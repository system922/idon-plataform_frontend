import React, { useState, useEffect } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { useConfirm } from '../../context/ConfirmContext';
import { Calendar, Clock, Bell, Mail, Plus, Edit2, Trash2, X, Check, AlertCircle, Loader } from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/NotificationsScheduled.css';

export default function NotificationsScheduled() {
  const { showConfirm } = useConfirm();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'push',
    schedule_at: ''
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/scheduled');
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openModal = (notif = null) => {
    if (notif) {
      setEditing(notif);
      setFormData({
        title: notif.title,
        message: notif.message,
        type: notif.type,
        schedule_at: new Date(notif.schedule_at).toISOString().slice(0, 16)
      });
    } else {
      setEditing(null);
      setFormData({ title: '', message: '', type: 'push', schedule_at: '' });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.message || !formData.schedule_at) {
      setError('Completa todos los campos');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const url = editing ? `/api/scheduled/${editing.id}` : '/api/scheduled';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Error al guardar');
      setSuccess(editing ? 'Notificación actualizada' : 'Notificación programada');
      setModalOpen(false);
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!await showConfirm(`¿Eliminar la notificación "${title}"?`)) return;
    try {
      const res = await fetchWithAuth(`/api/scheduled/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      setSuccess('Notificación eliminada');
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'pending') return <span className="badge-pending">Pendiente</span>;
    if (status === 'sent') return <span className="badge-sent">Enviada</span>;
    return <span className="badge-failed">Fallida</span>;
  };

  const headerAction = (
    <button className="btn-primary" onClick={() => openModal()}>
      <Plus size={16} /> Programar notificación
    </button>
  );

  return (
    <PageTemplate
      title="Notificaciones Programadas"
      subtitle="Programa envíos automáticos de correo o push para fecha futura"
      loading={loading}
      headerAction={headerAction}
    >
      <div className="scheduled-container">
        {error && <div className="alert-error"><AlertCircle size={16} /> {error}</div>}
        {success && <div className="alert-success"><Check size={16} /> {success}</div>}

        <div className="scheduled-list">
          {notifications.length === 0 ? (
            <div className="empty-state">
              <Calendar size={48} />
              <h3>No hay notificaciones programadas</h3>
              <button className="btn-primary" onClick={() => openModal()}>Programar primera</button>
            </div>
          ) : (
            notifications.map(n => (
              <div key={n.id} className="scheduled-card">
                <div className="card-header">
                  <div className="card-icon">{n.type === 'push' ? <Bell size={20} /> : <Mail size={20} />}</div>
                  <div className="card-title">{n.title}</div>
                  {getStatusBadge(n.status)}
                </div>
                <div className="card-message">{n.message}</div>
                <div className="card-meta">
                  <Calendar size={14} /> {new Date(n.schedule_at).toLocaleString()}
                </div>
                {n.status === 'pending' && (
                  <div className="card-actions">
                    <button className="icon-btn edit" onClick={() => openModal(n)}><Edit2 size={16} /> Editar</button>
                    <button className="icon-btn delete" onClick={() => handleDelete(n.id, n.title)}><Trash2 size={16} /> Cancelar</button>
                  </div>
                )}
                {n.status === 'failed' && n.error && <div className="card-error">Error: {n.error}</div>}
              </div>
            ))
          )}
        </div>

        {/* Modal */}
        {modalOpen && (
          <div className="modal-overlay" onClick={() => setModalOpen(false)}>
            <div className="modal-container" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editing ? 'Editar notificación' : 'Programar notificación'}</h2>
                <button className="close-btn" onClick={() => setModalOpen(false)}><X size={20} /></button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Título</label>
                  <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Mensaje</label>
                  <textarea rows="4" value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Tipo</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="push">Notificación push</option>
                    <option value="email">Correo electrónico</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Fecha y hora de envío</label>
                  <input type="datetime-local" value={formData.schedule_at} onChange={e => setFormData({...formData, schedule_at: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader size={16} className="spin" /> : (editing ? 'Actualizar' : 'Programar')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTemplate>
  );
}