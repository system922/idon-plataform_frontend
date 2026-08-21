// hooks/usePlanes.js
import { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '../config/api';

export function usePlanes() {
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth('/odontologia/planes');
      const data = await response.json();
      
      const planesData = data.data || [];
      setPlanes(planesData);
      
      // Calcular estadísticas
      setStats({
        total: planesData.length,
        activos: planesData.filter(p => p.status === 'active').length,
        completados: planesData.filter(p => p.status === 'completed').length,
        borradores: planesData.filter(p => p.status === 'draft').length,
        cancelados: planesData.filter(p => p.status === 'cancelled').length,
      });
    } catch (error) {
      console.error('Error al cargar planes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createPlan = async (formData) => {
    try {
      const response = await fetchWithAuth('/odontologia/planes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        await loadData();
        return { success: true };
      } else {
        const error = await response.json();
        return { success: false, error: error.message || 'Error al crear el plan' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const updatePlan = async (id, formData) => {
    try {
      const response = await fetchWithAuth(`/odontologia/planes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        await loadData();
        return { success: true };
      } else {
        const error = await response.json();
        return { success: false, error: error.message || 'Error al actualizar el plan' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const deletePlan = async (id) => {
    try {
      const response = await fetchWithAuth(`/odontologia/planes/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await loadData();
        return { success: true };
      } else {
        return { success: false, error: 'Error al eliminar el plan' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return {
    planes,
    loading,
    stats,
    loadData,
    createPlan,
    updatePlan,
    deletePlan,
  };
}