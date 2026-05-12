/**
 * Servicio API centralizado para IDON
 * Maneja autenticación, headers y requests al backend
 */

import API_BASE from '../config/apiBase';

const API_URL = `${API_BASE}/api`;

class ApiService {
  // Obtener token del localStorage
  getToken() {
    // Intentar obtener de múltiples lugares (por compatibilidad)
    return localStorage.getItem('idonToken') || localStorage.getItem('token') || localStorage.getItem('access_token');
  }

  // Headers configurados with token
  getHeaders(includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (includeAuth) {
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    // Add X-DB-Name header for multi-tenant support
    const selectedBusinessStr = localStorage.getItem('selectedBusiness');
    if (selectedBusinessStr) {
      try {
        const selectedBusiness = JSON.parse(selectedBusinessStr);
        const schemaName = selectedBusiness.schemaName || selectedBusiness.slug;
        if (schemaName) {
          headers['X-DB-Name'] = schemaName;
        }
      } catch (e) {
        // If parsing fails, continue without the header
      }
    }

    return headers;
  }

  // Método genérico para peticiones
  async request(method, endpoint, body = null, includeAuth = true) {
    try {
      const options = {
        method,
        headers: this.getHeaders(includeAuth),
      };

      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${API_URL}${endpoint}`, options);

      // Si es 401, token expiró
      if (response.status === 401) {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
        throw new Error('Token expirado. Por favor, inicia sesión nuevamente.');
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(error.message || `Error ${response.status}`);
      }

      return await response.json();
    } catch (error) {

      throw error;
    }
  }

  // GET
  get(endpoint) {
    return this.request('GET', endpoint);
  }

  // POST
  post(endpoint, body) {
    return this.request('POST', endpoint, body);
  }

  // PUT
  put(endpoint, body) {
    return this.request('PUT', endpoint, body);
  }

  // PATCH
  patch(endpoint, body) {
    return this.request('PATCH', endpoint, body);
  }

  // DELETE
  delete(endpoint) {
    return this.request('DELETE', endpoint);
  }
}

class AdminApiService extends ApiService {
  getHeaders(includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (includeAuth) {
      const token = this.getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    return headers; // no X-DB-Name, no business context
  }
}

const apiService = new ApiService();
export const adminApiService = new AdminApiService();
export default apiService;