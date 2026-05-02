/**
 * Notification Display Component
 * Muestra las notificaciones en la UI
 */

import { useNotification } from '../context/NotificationContext';
import '../styles/Notifications.css';

export default function NotificationDisplay() {
  const { notifications, removeNotification } = useNotification();

  return (
    <div className="notifications-container">
      {notifications.map(notif => (
        <div
          key={notif.id}
          className={`notification notification--${notif.type}`}
          role="alert"
        >
          <div className="notification-content">
            {notif.type === 'success' && <span className="notification-icon">✓</span>}
            {notif.type === 'error' && <span className="notification-icon">✕</span>}
            {notif.type === 'warning' && <span className="notification-icon">!</span>}
            {notif.type === 'info' && <span className="notification-icon">ℹ</span>}
            <span className="notification-message">{notif.message}</span>
          </div>
          <button
            className="notification-close"
            onClick={() => removeNotification(notif.id)}
            aria-label="Cerrar notificación"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
