import React, { useState, useEffect } from 'react';
import { FiBell, FiX, FiCheck, FiArrowRight } from 'react-icons/fi';
import '../styles/NotificationBell.css';

import API_BASE from '../config/apiBase';

const NotificationBell = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(null);

  useEffect(() => {
    loadNotifications();
    // Auto-refresh every 60 seconds
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const token = localStorage.getItem('idonToken') || localStorage.getItem('token');
      if (!token) return;

      const selectedBusiness = JSON.parse(localStorage.getItem('selectedBusiness') || '{}');
      const schemaName = selectedBusiness.schema_name;

      const response = await fetch(`${API_BASE}/notifications-admin/all?filterType=pending`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(schemaName && { 'X-DB-Name': schemaName })
        }
      });

      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        setNotifications(Array.isArray(data) ? data.slice(0, 5) : []); // Mostrar últimas 5
        setPendingCount(Array.isArray(data) ? data.length : 0);
      }
    } catch (error) {
      // Notification loading error
    }
  };

  const handleResolve = async (notificationId) => {
    try {
      setResolving(notificationId);
      const token = localStorage.getItem('idonToken') || localStorage.getItem('token');
      const selectedBusiness = JSON.parse(localStorage.getItem('selectedBusiness') || '{}');
      const schemaName = selectedBusiness.schema_name;
      
      const response = await fetch(
        `${API_BASE}/notifications-admin/${notificationId}/resolve`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...(schemaName && { 'X-DB-Name': schemaName })
          },
          body: JSON.stringify({
            resolution_note: 'Resuelto desde campana flotante',
            status: 'resolved'
          })
        }
      );

      if (response.ok) {
        // Remove from list
        setNotifications(notifications.filter(n => n.id !== notificationId));
        setPendingCount(Math.max(0, pendingCount - 1));
      }
    } catch (error) {
      // Notification resolution error
    } finally {
      setResolving(null);
    }
  };

  // Only show for admin users and business owners
  const isAdminUser = user && (
    user.userType === 'admin_idon' || 
    user.userType === 'proveedor' ||
    user.role === 'owner' ||
    user.type === 'admin' || 
    user.adminMode
  );
  
  if (!isAdminUser) {
    return null;
  }

  return (
    <div className="nb-container">
      {/* Bell Icon Button */}
      <button
        className="nb-bell-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Notificaciones (Campana Flotante)"
      >
        <FiBell size={24} />
        {pendingCount > 0 && (
          <span className="nb-badge">{pendingCount > 9 ? '9+' : pendingCount}</span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="nb-dropdown">
          {/* Header */}
          <div className="nb-header">
            <h3>📬 Notificaciones Pendientes</h3>
            <button
              className="nb-close-btn"
              onClick={() => setIsOpen(false)}
              title="Cerrar panel"
            >
              <FiX size={20} />
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="nb-loading">
              <div className="nb-spinner"></div>
              <p>⏳ Cargando...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="nb-empty">
              <FiBell size={32} />
              <p>✅ No hay notificaciones pendientes</p>
            </div>
          ) : (
            <div className="nb-list">
              {notifications.map((notification) => (
                <div key={notification.id} className={`nb-item nb-type-${notification.tipo}`}>
                  <div className="nb-item-content">
                    <div className="nb-item-type">{notification.tipo}</div>
                    <p className="nb-item-message">{notification.contenido}</p>
                    <span className="nb-item-date">
                      {new Date(notification.created_at).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                  <div className="nb-item-actions">
                    <button
                      className="nb-resolve-btn"
                      onClick={() => handleResolve(notification.id)}
                      disabled={resolving === notification.id}
                      title="Resolver notificación"
                    >
                      {resolving === notification.id ? (
                        <div className="nb-spinner-small"></div>
                      ) : (
                        <FiCheck size={18} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="nb-footer">
              <a href="/admin/notifications" className="nb-view-all-link">
                📋 Ver todas las notificaciones <FiArrowRight size={16} />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
