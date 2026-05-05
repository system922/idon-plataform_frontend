import React, { useState, useEffect } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { Bell, Send, Trash2, Check, AlertCircle, Loader, RefreshCw } from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/NotificationsPush.css';

export default function NotificationsPush() {
  const [swRegistration, setSwRegistration] = useState(null);
  const [vapidKey, setVapidKey] = useState('');
  const [subscription, setSubscription] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState({ title: '', body: '', url: '' });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Obtener clave VAPID pública
  const fetchVapidKey = async () => {
    try {
      const res = await fetchWithAuth('/api/push/vapid-public-key');
      const data = await res.json();
      setVapidKey(data.publicKey);
    } catch (err) {
      setError('No se pudo obtener la clave de notificaciones');
    }
  };

  // Registrar service worker
  const registerServiceWorker = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setError('Tu navegador no soporta notificaciones push');
      return false;
    }
    try {
      const registration = await navigator.serviceWorker.register('/push-sw.js');
      setSwRegistration(registration);
      return true;
    } catch (err) {
      setError('Error al registrar service worker: ' + err.message);
      return false;
    }
  };

  // Pedir permiso y suscribir
  const subscribeToPush = async () => {
    if (!swRegistration || !vapidKey) return;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setError('Permiso denegado para notificaciones');
      return false;
    }
    try {
      const subscriptionObj = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey
      });
      setSubscription(subscriptionObj);
      // Guardar en el backend
      const userAgent = navigator.userAgent;
      const res = await fetchWithAuth('/api/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          subscription: {
            endpoint: subscriptionObj.endpoint,
            keys: {
              p256dh: btoa(String.fromCharCode(...new Uint8Array(subscriptionObj.getKey('p256dh')))),
              auth: btoa(String.fromCharCode(...new Uint8Array(subscriptionObj.getKey('auth'))))
            }
          },
          userAgent
        })
      });
      if (res.ok) {
        setNotificationsEnabled(true);
        setSuccess('Notificaciones activadas');
        setTimeout(() => setSuccess(''), 3000);
        return true;
      } else throw new Error('Error al guardar suscripción');
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  // Desuscribir
  const unsubscribeFromPush = async () => {
    if (!subscription) return;
    try {
      await subscription.unsubscribe();
      await fetchWithAuth('/api/push/unsubscribe', {
        method: 'DELETE',
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });
      setSubscription(null);
      setNotificationsEnabled(false);
      setSuccess('Notificaciones desactivadas');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Cargar historial de notificaciones
  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/push/history');
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Error al cargar historial');
    } finally {
      setLoading(false);
    }
  };

  // Enviar notificación a todos los suscriptores
  const handleSend = async () => {
    if (!message.title || !message.body) {
      setError('Completa título y mensaje');
      return;
    }
    setSending(true);
    setError('');
    try {
      const res = await fetchWithAuth('/api/push/send', {
        method: 'POST',
        body: JSON.stringify(message)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar');
      setSuccess(`Enviado a ${data.sent} de ${data.total} dispositivos`);
      setMessage({ title: '', body: '', url: '' });
      loadHistory();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await registerServiceWorker();
      await fetchVapidKey();
      // Verificar si ya está suscrito
      if (swRegistration && vapidKey) {
        const existingSub = await swRegistration.pushManager.getSubscription();
        if (existingSub) {
          setSubscription(existingSub);
          setNotificationsEnabled(true);
        }
      }
    };
    init();
    loadHistory();
  }, []);

  return (
    <PageTemplate title="Notificaciones Push" subtitle="Envía notificaciones instantáneas a todos los dispositivos del negocio">
      <div className="push-notifications-container">
        {error && <div className="alert-error"><AlertCircle size={16} /> {error}</div>}
        {success && <div className="alert-success"><Check size={16} /> {success}</div>}

        <div className="push-status-card">
          <div className="status-header">
            <Bell size={24} />
            <h3>Estado de notificaciones</h3>
          </div>
          <div className="status-body">
            {!notificationsEnabled ? (
              <button className="btn-primary" onClick={subscribeToPush}>
                Activar notificaciones
              </button>
            ) : (
              <button className="btn-secondary" onClick={unsubscribeFromPush}>
                <Trash2 size={16} /> Desactivar
              </button>
            )}
            <p className="status-info">
              {notificationsEnabled ? '✅ Notificaciones activas' : '❌ Notificaciones desactivadas'}
            </p>
          </div>
        </div>

        {notificationsEnabled && (
          <div className="send-card">
            <h3>Enviar notificación</h3>
            <div className="form-group">
              <label>Título *</label>
              <input type="text" value={message.title} onChange={e => setMessage({...message, title: e.target.value})} placeholder="Ej: Oferta especial" />
            </div>
            <div className="form-group">
              <label>Mensaje *</label>
              <textarea rows="3" value={message.body} onChange={e => setMessage({...message, body: e.target.value})} placeholder="Contenido de la notificación" />
            </div>
            <div className="form-group">
              <label>URL de destino (opcional)</label>
              <input type="text" value={message.url} onChange={e => setMessage({...message, url: e.target.value})} placeholder="/app/pos" />
            </div>
            <button className="btn-primary" onClick={handleSend} disabled={sending}>
              {sending ? <Loader size={16} className="spin" /> : <Send size={16} />} Enviar a todos
            </button>
          </div>
        )}

        <div className="history-card">
          <div className="history-header">
            <h3>Historial de notificaciones</h3>
            <button className="icon-btn" onClick={loadHistory}><RefreshCw size={16} /></button>
          </div>
          {loading && <div className="loading">Cargando...</div>}
          <div className="history-list">
            {history.length === 0 ? (
              <p className="empty">No hay notificaciones enviadas</p>
            ) : (
              history.map(h => (
                <div key={h.id} className="history-item">
                  <div className="history-title">{h.title}</div>
                  <div className="history-body">{h.body}</div>
                  <div className="history-meta">
                    <span>Enviado: {new Date(h.created_at).toLocaleString()}</span>
                    <span>✅ {h.sent_count} / ❌ {h.failed_count}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </PageTemplate>
  );
}