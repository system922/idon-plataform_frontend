/**
 * Toast/Notification Hook
 * 
 * Proporciona un sistema centralizado de notificaciones
 * Reemplaza: alert(), console.log(), y manejo manual de errores
 */

import { createContext, useContext, useCallback, useState } from 'react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const notify = useCallback((message, type = 'info', duration = 3000) => {
    const id = Math.random();
    const notification = { id, message, type };

    setNotifications(prev => [...prev, notification]);

    if (duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const success = useCallback((message) => notify(message, 'success'), [notify]);
  const error = useCallback((message) => notify(message, 'error', 4000), [notify]);
  const warning = useCallback((message) => notify(message, 'warning'), [notify]);
  const info = useCallback((message) => notify(message, 'info'), [notify]);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{
      notify, success, error, warning, info,
      removeNotification, notifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification debe estar dentro de NotificationProvider');
  }
  return context;
};

export default NotificationContext;
