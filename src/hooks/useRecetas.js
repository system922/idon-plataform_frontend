// hooks/useRecetas.js
import { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '../config/api';

export function useRecetas() {
  const [recetas, setRecetas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth('/odontologia/recetas');
      if (!response.ok) throw new Error('Error al cargar recetas');
      
      const data = await response.json();
      setRecetas(data.data || []);
      
      // Calcular estadísticas
      const total = data.data?.length || 0;
      const porTipo = data.data?.reduce((acc, r) => {
        const tipo = r.tipo || 'otros';
        acc[tipo] = (acc[tipo] || 0) + 1;
        return acc;
      }, {});
      
      setStats({ total, porTipo });
    } catch (error) {
      console.error('Error loading recetas:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createReceta = useCallback(async (formData) => {
    try {
      const response = await fetchWithAuth('/odontologia/recetas', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) throw new Error('Error al crear receta');
      
      const data = await response.json();
      await loadData();
      return { success: true, data };
    } catch (error) {
      console.error('Error creating receta:', error);
      return { success: false, error: error.message };
    }
  }, [loadData]);

  const updateReceta = useCallback(async (id, formData) => {
    try {
      const response = await fetchWithAuth(`/odontologia/recetas/${id}`, {
        method: 'PUT',
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) throw new Error('Error al actualizar receta');
      
      const data = await response.json();
      await loadData();
      return { success: true, data };
    } catch (error) {
      console.error('Error updating receta:', error);
      return { success: false, error: error.message };
    }
  }, [loadData]);

  const deleteReceta = useCallback(async (id) => {
    try {
      const response = await fetchWithAuth(`/odontologia/recetas/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Error al eliminar receta');
      
      await loadData();
      return { success: true };
    } catch (error) {
      console.error('Error deleting receta:', error);
      return { success: false, error: error.message };
    }
  }, [loadData]);

  return {
    recetas,
    loading,
    stats,
    loadData,
    createReceta,
    updateReceta,
    deleteReceta,
  };
}