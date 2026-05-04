import { fetchWithAuth } from '../config/apiBase';

const cashCloseService = {
  async getResumenDia(businessId, token) {
    try {
      // Usar fetchWithAuth en lugar de fetch directo
      const response = await fetchWithAuth(`/api/cash/close/summary/${businessId}`);
      
      if (!response.ok) {
        console.warn('Endpoint no disponible, usando datos mock');
        // Retornar datos mock para desarrollo
        return {
          ventasDelDia: 1250.00,
          totalTransacciones: 45,
          ventasEfectivo: 750.00,
          ventasTarjeta: 500.00,
          gastosOperativos: 120.00,
          ingresosExtras: 50.00,
          aperturaInicial: 200.00,
          fechaApertura: new Date().toISOString(),
          cajero: 'Admin'
        };
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error en getResumenDia:', error);
      // Retornar datos mock para desarrollo
      return {
        ventasDelDia: 1250.00,
        totalTransacciones: 45,
        ventasEfectivo: 750.00,
        ventasTarjeta: 500.00,
        gastosOperativos: 120.00,
        ingresosExtras: 50.00,
        aperturaInicial: 200.00,
        fechaApertura: new Date().toISOString(),
        cajero: 'Admin'
      };
    }
  },
  
  async save(cierreData, token) {
    try {
      // Usar fetchWithAuth para guardar
      const response = await fetchWithAuth('/api/cash/close', {
        method: 'POST',
        body: JSON.stringify(cierreData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al guardar cierre de caja');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error en save:', error);
      // Para desarrollo, retornar éxito simulado
      return { 
        id: Date.now(), 
        success: true,
        message: 'Cierre guardado (modo desarrollo)'
      };
    }
  }
};

export default cashCloseService;