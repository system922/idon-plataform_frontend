import { api } from '../config/api';

export async function fetchProtected(endpoint, options = {}) {
  try {
    // Si options ya tiene un método personalizado, usarlo
    const method = options.method || 'GET';
    
    // Construir la petición con api (axios)
    const response = await api({
      url: endpoint,
      method: method,
      data: options.body,
      headers: options.headers || {},
      params: options.params,
      ...options,
    });
    
    // Retornar los datos en el mismo formato que antes
    return response.data;
  } catch (error) {
    console.error('Error en fetchProtected:', error);
    
    // Mantener la misma estructura de error que antes
    const errorMessage = error.response?.data?.message || 
                         error.response?.data?.error || 
                         error.message || 
                         'Error en la petición';
    
    // Lanzar error con el mismo formato
    throw new Error(errorMessage);
  }
}