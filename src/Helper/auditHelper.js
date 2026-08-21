// src/Helper/auditHelper.js
import { fetchWithAuth } from '../config/api';

// Variable global para almacenar el usuario del contexto
let currentUser = null;

/**
 * Establece el usuario actual desde el contexto de sesión
 * @param {Object} user - Usuario desde useSession()
 */
export function setAuditUser(user) {
  currentUser = user;
}

/**
 * Obtiene los datos del usuario
 * @param {Object} userFromContext - Usuario opcional desde useSession()
 * @returns {Object} { user_id, user_name, user_email, user_role }
 */
export function getAuditUser(userFromContext = null) {
  let userId = null;
  let userName = 'Usuario no identificado';
  let userEmail = '';
  let userRole = '';

  try {
    // 1. PRIMERO: Usar usuario del contexto si se proporciona
    if (userFromContext) {
      userId = userFromContext?.id || null;
      userName = userFromContext?.firstName || userFromContext?.first_name || userFromContext?.nombre || userFromContext?.name || 'Usuario no identificado';
      userEmail = userFromContext?.email || userFromContext?.correo || '';
      userRole = userFromContext?.roleName || userFromContext?.role || userFromContext?.rol || '';
      
      if (userId) {
        return {
          user_id: userId,
          user_name: userName,
          user_email: userEmail,
          user_role: userRole
        };
      }
    }

    // 2. SEGUNDO: Usar el usuario guardado en la variable global
    if (currentUser) {
      userId = currentUser?.id || null;
      userName = currentUser?.firstName || currentUser?.first_name || currentUser?.nombre || currentUser?.name || 'Usuario no identificado';
      userEmail = currentUser?.email || currentUser?.correo || '';
      userRole = currentUser?.roleName || currentUser?.role || currentUser?.rol || '';
      
      if (userId) {
        return {
          user_id: userId,
          user_name: userName,
          user_email: userEmail,
          user_role: userRole
        };
      }
    }

    // 3. TERCERO: Intentar desde sessionStorage
    const sessionUser = sessionStorage.getItem('user');
    if (sessionUser) {
      const user = JSON.parse(sessionUser);
      userId = user?.id || null;
      userName = user?.firstName || user?.first_name || user?.nombre || user?.name || 'Usuario no identificado';
      userEmail = user?.email || user?.correo || '';
      userRole = user?.roleName || user?.role || user?.rol || '';
    }

  } catch (error) {
    console.error('❌ Error obteniendo usuario para auditoría:', error);
  }

  return {
    user_id: userId,
    user_name: userName,
    user_email: userEmail,
    user_role: userRole
  };
}

/**
 * Registra una auditoría en el backend
 */
export async function logAudit(tableName, action, data = {}) {
  const userData = getAuditUser(data.user);
  const { user_id, user_name, user_email, user_role } = userData;

  if (!user_id) {
    console.warn('⚠️ No se pudo obtener user_id para auditoría.');
    return false;
  }

  let description = data.description || `${action} en ${tableName}`;
  if (user_name && user_name !== 'Usuario no identificado') {
    if (!description.includes(user_name)) {
      description = `${description} por ${user_name}`;
    }
  }

  const payload = {
    user_id: user_id,
    table_name: tableName,
    action: action.toUpperCase(),
    record_id: data.recordId || null,
    old_values: data.oldValues || null,
    new_values: data.newValues || null,
    description: description,
  };

  const cleanPayload = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value !== null && value !== undefined && value !== '') {
      cleanPayload[key] = value;
    }
  }

  if (data.reason) {
    cleanPayload.reason = data.reason;
  }

  try {
    const response = await fetchWithAuth('/audit-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cleanPayload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Error en auditoría (servidor):', errorData);
      return false;
    }

    console.log('✅ Auditoría registrada:', description);
    return true;
  } catch (error) {
    console.error('❌ Error al registrar auditoría:', error);
    return false;
  }
}

export async function logInsert(tableName, newValues, description = '', options = {}) {
  return logAudit(tableName, 'INSERT', {
    newValues: newValues,
    recordId: options.recordId || newValues?.id || newValues?.Id || null,
    description: description || `Registro creado en ${tableName}`,
    reason: options.reason || 'Creación de registro',
    user: options.user || null
  });
}

export async function logUpdate(tableName, oldValues, newValues, description = '', options = {}) {
  return logAudit(tableName, 'UPDATE', {
    oldValues: oldValues,
    newValues: newValues,
    recordId: options.recordId || oldValues?.id || newValues?.id || null,
    description: description || `Registro modificado en ${tableName}`,
    reason: options.reason || 'Modificación de registro',
    user: options.user || null
  });
}

export async function logDelete(tableName, oldValues, description = '', options = {}) {
  return logAudit(tableName, 'DELETE', {
    oldValues: oldValues,
    recordId: options.recordId || oldValues?.id || oldValues?.Id || null,
    description: description || `Registro eliminado de ${tableName}`,
    reason: options.reason || 'Eliminación de registro',
    user: options.user || null
  });
}

export async function logCustom(tableName, action, data = {}) {
  return logAudit(tableName, action, {
    newValues: data.newValues || data,
    recordId: data.recordId || null,
    description: data.description || `${action} en ${tableName}`,
    reason: data.reason || `Acción: ${action}`,
    user: data.user || null
  });
}

export default {
  getAuditUser,
  setAuditUser,
  logAudit,
  logInsert,
  logUpdate,
  logDelete,
  logCustom
};