// ========== src/config/apiBase.js ==========
// ⚠️ ESTE ARCHIVO ESTÁ OBSOLETO - Usar api.js en su lugar
// Se mantiene solo para compatibilidad con componentes antiguos

import { api } from './api';

const API_BASE = process.env.REACT_APP_API_BASE || 'https://idon-plataform-backend.onrender.com/api';

// Función obsoleta - Usar api directamente
export function fetchWithAuth(path, options = {}) {
  console.warn('⚠️ fetchWithAuth está obsoleto. Usar api de ./api.js en su lugar.');
  
  // Redirigir a api para mantener compatibilidad
  return api({
    url: path,
    method: options.method || 'GET',
    data: options.body,
    headers: options.headers || {},
    ...options,
  })
  .then(response => ({
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    json: () => Promise.resolve(response.data),
    text: () => Promise.resolve(JSON.stringify(response.data)),
  }));
}

export default API_BASE;