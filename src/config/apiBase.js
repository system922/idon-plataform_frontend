import TokenManager from '../utils/tokenManager';

const API_BASE = process.env.REACT_APP_API_BASE || 'https://idon-plataform-backend.onrender.com';

export function fetchWithAuth(path, options = {}) {
  const token = TokenManager.getToken();
  const business = TokenManager.getBusiness();

  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (business?.id) {
    headers['X-Business-ID'] = business.id;
  }

  if (business?.schemaName) {
    headers['X-DB-Name'] = business.schemaName;
  }

  return fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  });
}

export default API_BASE;