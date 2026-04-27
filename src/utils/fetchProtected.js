// fetchProtected.js
// Helper para peticiones autenticadas con JWT

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4000';

export async function fetchProtected(endpoint, options = {}) {
  const token = localStorage.getItem('idonToken') || localStorage.getItem('token');
  if (!token) throw new Error('No token found');

  const headers = {
    ...(options.headers || {}),
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error en la petición' }));
    throw new Error(err.error || 'Error en la petición');
  }

  return res.json();
}
