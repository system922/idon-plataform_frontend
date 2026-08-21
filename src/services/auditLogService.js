import { fetchWithAuth } from '../config/api';

export const auditLogService = {
  async register(data, token) {
    try {
      // Usar fetchWithAuth en lugar de fetch
      const response = await fetchWithAuth('/audit/log', {
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