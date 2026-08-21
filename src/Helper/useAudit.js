// src/Helper/useAudit.js
import { useSession } from '../context/SessionContext';
import { logInsert, logUpdate, logDelete, logCustom, setAuditUser } from './auditHelper';
import { useEffect } from 'react';

/**
 * Hook personalizado para auditoría
 * Obtiene el usuario desde useSession() y lo pasa al auditHelper
 */
export function useAudit() {
  const { user } = useSession();

  // Sincronizar el usuario con el auditHelper cuando cambie
  useEffect(() => {
    if (user) {
      setAuditUser(user);
    }
  }, [user]);

  // Retornar las funciones de auditoría con el usuario ya incluido
  return {
    logInsert: (tableName, newValues, description = '', options = {}) => {
      return logInsert(tableName, newValues, description, { ...options, user });
    },
    logUpdate: (tableName, oldValues, newValues, description = '', options = {}) => {
      return logUpdate(tableName, oldValues, newValues, description, { ...options, user });
    },
    logDelete: (tableName, oldValues, description = '', options = {}) => {
      return logDelete(tableName, oldValues, description, { ...options, user });
    },
    logCustom: (tableName, action, data = {}) => {
      return logCustom(tableName, action, { ...data, user });
    },
    user // Exponer el usuario por si se necesita
  };
}

// Exportar también las funciones directas para compatibilidad
export { logInsert, logUpdate, logDelete, logCustom } from './auditHelper';