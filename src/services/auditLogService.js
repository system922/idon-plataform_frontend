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
        console.warn('Error registrando en auditoría');
        // No lanzamos error para no interrumpir el flujo principal
        return { success: false, error: 'Error al registrar' };
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error en auditLogService.register:', error);
      // En desarrollo, registrar en consola
      console.log('📝 Auditoría (mock):', data);
      return { success: true, mock: true };
    }
  }
};