// src/auth.js (frontend)
// Helpers para login/logout/me con soporte multi-tenant

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4000';

export async function loginApi(email, password, businessId = null) {
  // Usar /owner-login para TODOS los usuarios ya que valida en cascada:
  // 1. Admin IDON (admin_users)
  // 2. Business Owner (business_owners)
  // 3. Business User (business_users)
  const endpoint = `${API_BASE}/api/auth/owner-login`;

  // 🧹 Limpiar cache del navegador antes de login
  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
    }
  } catch (e) {
    // Cache cleanup error
  }

  // Agregar timestamp para forzar solicitud fresca (cache busting)
  const bustedUrl = `${endpoint}?t=${Date.now()}`;

  const res = await fetch(bustedUrl, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
    credentials: 'include',
    cache: 'no-cache',
    body: JSON.stringify({ email, password, businessId })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Credenciales inválidas' }));
    throw new Error(err.error || 'Credenciales inválidas');
  }

  const data = await res.json();

  // Soportar distintos nombres de token devueltos por el backend
  const tokenVal = data.token || data.accessToken || (data.access_token ? data.access_token : null);
  const refreshTokenVal = data.refreshToken || data.refresh_token || null;

  if (tokenVal) {
    try { localStorage.setItem('idonToken', tokenVal); } catch {}
    try { localStorage.setItem('token', tokenVal); } catch {}
  }

  if (refreshTokenVal) {
    try { localStorage.setItem('refreshToken', refreshTokenVal); } catch {}
  }

  // Guardar información del usuario
  const userInfo = data.user || {};
  if (userInfo || data.type) {
    localStorage.setItem('idonUser', JSON.stringify(userInfo));
  }

  // 🔐 Guardar rol del usuario (3-CAPAS)
  const userRole = userInfo?.role || userInfo?.userType;
  if (userRole) {
    localStorage.setItem('userRole', JSON.stringify(userRole));
  }

  // Si tiene negocios, guardarlos
  if (data.businesses) {
    localStorage.setItem('userBusinesses', JSON.stringify(data.businesses));
  }

  // Retornar estructura completa
  return { 
    user: userInfo,
    token: tokenVal,
    type: userInfo?.type || userInfo?.userType,
    businesses: data.businesses,
    userBusinesses: data.businesses
  };
}

export function fireToast(message, severity = 'info') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, severity } }));
  }
}

export function clearSession() {
  localStorage.removeItem('idonUser');
  localStorage.removeItem('idonToken');
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('access_token');
  localStorage.removeItem('selectedBusiness');
  localStorage.removeItem('dbName');
  localStorage.removeItem('userRole');
  localStorage.removeItem('activeModules');
  localStorage.removeItem('activeFeatures');
}

export async function logoutApi() {
  try {
    const token = localStorage.getItem('idonToken') || localStorage.getItem('token');
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      credentials: 'include'
    });
  } catch (e) {
    // Logout error
  }
  clearSession();
}

export async function meApi() {
  const token = localStorage.getItem('idonToken') || localStorage.getItem('token');
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.user) return null;

    // Preservar datos existentes del usuario (businessId, schemaName, etc.)
    const existingUser = JSON.parse(localStorage.getItem('idonUser') || '{}');
    const mergedUser = {
      ...existingUser,        // Datos previos (negocio seleccionado, etc.)
      ...data.user,           // Actualizar con datos frescos del servidor (nombre, email, etc.)
      token: token
    };

    localStorage.setItem('idonUser', JSON.stringify(mergedUser));
    
    // 🔐 Guardar rol del usuario (3-CAPAS)
    const userRole = mergedUser.role || mergedUser.userType;
    if (userRole) {
      localStorage.setItem('userRole', JSON.stringify(userRole));
    }
    
    return mergedUser;
  } catch (err) {
    return null;
  }
}

export async function registerBusinessApi(businessData) {
  const res = await fetch(`${API_BASE}/api/auth/register-business`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(businessData)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error al registrar negocio' }));
    throw new Error(err.error || 'Error al registrar negocio');
  }

  return res.json();
}

export async function submitBusinessRegistrationRequest(businessData) {
  const res = await fetch(`${API_BASE}/api/businesses/requests/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(businessData)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error al registrar solicitud' }));
    throw new Error(err.error || 'Error al registrar solicitud');
  }

  return res.json();
}

export async function getBusinessesByCedula(cedula) {
  const res = await fetch(`${API_BASE}/api/businesses/user/get-by-cedula`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cedula })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error al obtener negocios' }));
    throw new Error(err.error || 'Error al obtener negocios');
  }

  return res.json();
}

export async function createBusinessApi(businessData) {
  return fetchProtected('/api/businesses', {
    method: 'POST',
    body: JSON.stringify(businessData)
  });
}

export async function searchUserByCedula(cedula) {
  // Buscar un usuario existente por cédula para auto-cargar datos en registro de negocio
  const res = await fetch(`${API_BASE}/api/businesses/user/search-by-cedula/${cedula}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!res.ok) {
    return { exists: false, user: null };
  }

  const data = await res.json();
  return data;
}

async function refreshAccessTokenFlow() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    return null;
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      credentials: 'include'
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (!data.accessToken) {
      return null;
    }

    localStorage.setItem('idonToken', data.accessToken);
    localStorage.setItem('token', data.accessToken);
    // (opcional) si backend devuelve refresh token actualizarlo
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }

    return data.accessToken;
  } catch (err) {
    return null;
  }
}

export async function fetchProtected(path, opts = {}) {
  const token = localStorage.getItem('idonToken') || localStorage.getItem('token');
  const selectedBusinessStr = localStorage.getItem('selectedBusiness');
  const userStr = localStorage.getItem('idonUser');
  
  // Obtener schemaName del usuario o negocio seleccionado
  let schemaName = null;
  if (selectedBusinessStr) {
    try {
      const selectedBusiness = JSON.parse(selectedBusinessStr);
      schemaName = selectedBusiness.schemaName || selectedBusiness.slug;
    } catch (e) {}
  }
  if (!schemaName && userStr) {
    try {
      const user = JSON.parse(userStr);
      schemaName = user.schemaName || user.dbName;
    } catch (e) {}
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...(schemaName && { 'X-DB-Name': schemaName }),  // 📌 Pasar schema al backend
    ...(opts.headers || {})
  };

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers,
    ...opts
  });

  if (!res.ok) {
    if (res.status === 401) {
      const refreshed = await refreshAccessTokenFlow();
      if (refreshed) {
        // reintentar con token renovado
        headers.Authorization = `Bearer ${refreshed}`;
        const retry = await fetch(`${API_BASE}${path}`, {
          credentials: 'include',
          headers,
          ...opts
        });
        if (retry.ok) return retry.json();
        const retryErr = await retry.json().catch(() => ({ error: 'Request failed after refresh' }));
        throw new Error(retryErr.error || 'Request failed after refresh');
      }
      fireToast('Sesión expirada, inicie sesión de nuevo', 'warn');
      clearSession();
      // NO redirigir aquí, solo devolver null
      return null;
    }
    const e = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(e.error || 'Request failed');
  }

  return res.json();
}
