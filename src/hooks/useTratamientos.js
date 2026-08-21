// hooks/useTratamientos.js
import { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '../config/api';

export function useTratamientos() {
  const [tratamientos, setTratamientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth('/odontologia/tratamientos');
      if (!response.ok) throw new Error('Error al cargar tratamientos');
      
      const data = await response.json();
      setTratamientos(data.data || []);
      
      // Calcular estadísticas básicas
      const total = data.data?.length || 0;
      const activos = data.data?.filter(t => t.is_active).length || 0;
      const inactivos = total - activos;
      
      setStats({ total, activos, inactivos });
    } catch (error) {
      console.error('Error loading tratamientos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createTratamiento = useCallback(async (formData) => {
    try {
      const response = await fetchWithAuth('/odontologia/tratamientos', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) throw new Error('Error al crear tratamiento');
      
      const data = await response.json();
      await loadData();
      return { success: true, data };
    } catch (error) {
      console.error('Error creating tratamiento:', error);
      return { success: false, error: error.message };
    }
  }, [loadData]);

  const updateTratamiento = useCallback(async (id, formData) => {
    try {
      const response = await fetchWithAuth(`/odontologia/tratamientos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) throw new Error('Error al actualizar tratamiento');
      
      const data = await response.json();
      await loadData();
      return { success: true, data };
    } catch (error) {
      console.error('Error updating tratamiento:', error);
      return { success: false, error: error.message };
    }
  }, [loadData]);

  const deleteTratamiento = useCallback(async (id) => {
    try {
      const response = await fetchWithAuth(`/api/odontologia/tratamientos/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Error al eliminar tratamiento');
      
      await loadData();
      return { success: true };
    } catch (error) {
      console.error('Error deleting tratamiento:', error);
      return { success: false, error: error.message };
    }
  }, [loadData]);

  return {
    tratamientos,
    loading,
    stats,
    loadData,
    createTratamiento,
    updateTratamiento,
    deleteTratamiento,
  };
}