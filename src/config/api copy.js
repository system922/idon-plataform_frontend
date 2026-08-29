// ========== src/config/api.js ==========
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_BASE;
const cleanBaseURL = API_URL.replace(/\/+$/, '');

// access + refresh
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const BUSINESS_ID_KEY = 'business_id';
const SCHEMA_NAME_KEY = 'schema_name';

// ─── RUTAS PÚBLICAS (no requieren autenticación) ──────────────
const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/refresh',
  '/register',
  '/blog',              // ← PARA EL BLOG
  '/business-types',    // ← PARA EL REGISTRO
  '/health',
  '/public',
  '/business-owners/find',
  '/catalog'
];

const isPublicRequest = (url = '') => {
  const requestPath = url.split('?')[0];
  return PUBLIC_PATHS.some(path =>
    requestPath === path || requestPath.startsWith(`${path}/`)
  );
};

// ─── FUNCIONES PARA TOKEN ──────────────────────────────────────────

const getStoredToken = () => {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

const setStoredToken = (token) => {
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch (error) {
    console.error('❌ Error guardando token:', error);
  }
};

const getStoredRefreshToken = () => {
  try {
    return sessionStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
};

const setStoredRefreshToken = (token) => {
  try {
    if (token) {
      sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  } catch (error) {
    console.error('❌ Error guardando refresh token:', error);
  }
};

const clearStoredTokens = () => {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(BUSINESS_ID_KEY);
    sessionStorage.removeItem(SCHEMA_NAME_KEY);
  } catch (error) {
    console.error('❌ Error limpiando tokens:', error);
  }
};

// ─── VERIFICAR SI EL TOKEN ES VÁLIDO ──────────────────────────────

export const hasValidToken = () => {
  const token = getStoredToken();
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000;
    return Date.now() < exp;
  } catch {
    return false;
  }
};

// ─── VARIABLES DE ESTADO ──────────────────────────────────────────

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ─── CREAR INSTANCIA DE AXIOS ──────────────────────────────────

export const api = axios.create({
  baseURL: cleanBaseURL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false,
  timeout: 30000,
});

// ─── INTERCEPTOR DE REQUEST ──────────────────────────────────────

api.interceptors.request.use(
  (config) => {
    // VERIFICAR si es ruta pública
    const isPublicPath = isPublicRequest(config.url);
    
    // SI es ruta pública, NO agregar token
    if (isPublicPath) {
      delete config.headers.Authorization;
      return config;
    }

    // Para rutas privadas, agregar token
    const token = getStoredToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── INTERCEPTOR DE RESPONSE ─────────────────────────────────────

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // VERIFICAR si es ruta pública
    const isPublicPath = isPublicRequest(originalRequest.url);
    
    // SI es ruta pública, NO intentar refrescar token
    if (isPublicPath) {
      return Promise.reject(error);
    }

    // Solo intentar refrescar token en rutas privadas
    if (error.response?.status === 401 && 
        !originalRequest._retry && 
        !originalRequest.url?.includes('/auth/login') &&
        !originalRequest.url?.includes('/auth/refresh')) {
            
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storedRefreshToken = getStoredRefreshToken();
                
        if (!storedRefreshToken) {
          throw new Error('No hay refresh token disponible');
        }
        const response = await api.post('/auth/refresh', { 
          refreshToken: storedRefreshToken 
        });        
        const newToken = response.data?.data?.token || response.data?.token;
        const newRefreshToken = response.data?.data?.refreshToken || response.data?.refreshToken;
        
        if (newToken) {
          setAuthToken(newToken);
          
          if (newRefreshToken) {
            setStoredRefreshToken(newRefreshToken);
          }
                    
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } else {
          throw new Error('No se recibió nuevo token');
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        removeAuthToken();
        clearRefreshToken();
        
        window.dispatchEvent(new CustomEvent('auth:logout'));
        
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ─── SETTERS PARA TOKEN ──────────────────────────────────────

export const setAuthToken = (token) => {
  if (token) {
    setStoredToken(token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    setStoredToken(null);
    delete api.defaults.headers.common['Authorization'];
  }
};

export const removeAuthToken = () => {
  setStoredToken(null);
  delete api.defaults.headers.common['Authorization'];
};

export const getCurrentToken = () => {
  const storedToken = getStoredToken();
  if (storedToken) {
    api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    return storedToken;
  }
  return null;
};

// ─── REFRESH TOKEN ────────────────────────────────────────────

export const getRefreshToken = getStoredRefreshToken;
export const setRefreshToken = setStoredRefreshToken;
export const clearRefreshToken = () => {
  setStoredRefreshToken(null);
};

// ─── BUSINESS CONTEXT ──────────────────────────────────────────

export const setBusinessContext = (businessId, schemaName) => {
  if (businessId) {
    api.defaults.headers.common['X-Business-ID'] = businessId;
    sessionStorage.setItem(BUSINESS_ID_KEY, businessId);
  } else {
    delete api.defaults.headers.common['X-Business-ID'];
    sessionStorage.removeItem(BUSINESS_ID_KEY);
  }
  if (schemaName) {
    api.defaults.headers.common['X-DB-Name'] = schemaName;
    sessionStorage.setItem(SCHEMA_NAME_KEY, schemaName);
  } else {
    delete api.defaults.headers.common['X-DB-Name'];
    sessionStorage.removeItem(SCHEMA_NAME_KEY);
  }
};

export const getBusinessContext = () => {
  try {
    const businessId = sessionStorage.getItem(BUSINESS_ID_KEY);
    const schemaName = sessionStorage.getItem(SCHEMA_NAME_KEY);
    return { businessId, schemaName };
  } catch {
    return { businessId: null, schemaName: null };
  }
};

// ─── FUNCIONES PARA ADMIN ──────────────────────────────────────

export const adminApi = {
  get: async (endpoint) => {
    const response = await api.get(endpoint);
    return response.data;
  },
  post: async (endpoint, data) => {
    const response = await api.post(endpoint, data);
    return response.data;
  },
  put: async (endpoint, data) => {
    const response = await api.put(endpoint, data);
    return response.data;
  },
  patch: async (endpoint, data) => {
    const response = await api.patch(endpoint, data);
    return response.data;
  },
  delete: async (endpoint) => {
    const response = await api.delete(endpoint);
    return response.data;
  },
};

// ─── FUNCIONES LEGACY ────────────────────────────────────────────

export const fetchWithAuth = async (path, options = {}) => {
  try {
    const response = await api({
      url: path,
      method: options.method || 'GET',
      data: options.body || options.data,
      headers: options.headers || {},
      ...options,
    });
    
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      json: () => Promise.resolve(response.data),
      text: () => Promise.resolve(JSON.stringify(response.data)),
    };
  } catch (error) {
    if (error.response) {
      return {
        ok: false,
        status: error.response.status,
        json: () => Promise.resolve(error.response.data),
        text: () => Promise.resolve(JSON.stringify(error.response.data)),
      };
    }
    throw error;
  }
};

export const checkApiConnection = async () => {
  try {
    const response = await api.get('/health');
    return { ok: true, status: response.status };
  } catch (error) {
    return { ok: false, error: error.message };
  }
};

export default api;
export const API_BASE = cleanBaseURL;