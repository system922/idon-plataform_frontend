import { fetchWithAuth } from '../config/apiBase';

export const auditLogService = {
  async register(data, token) {
    try {
      // Usar fetchWithAuth en lugar de fetch
      const response = await fetchWithAuth('/api/audit/log', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {

        // No lanzamos error para no interrumpir el flujo principal
        return { success: false, error: 'Error al registrar' };
      }
      
      const result = await response.json();
      return result;
    } catch (error) {

      // En desarrollo, registrar en consola

      return { success: true, mock: true };
    }
  }
};