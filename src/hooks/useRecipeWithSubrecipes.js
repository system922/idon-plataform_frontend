// hooks/useRecipeWithSubrecipes.js
import { useState, useCallback } from 'react';
import { fetchWithAuth } from '../config/api';

export function useRecipeWithSubrecipes() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recipeTree, setRecipeTree] = useState(null);
  const [flatIngredients, setFlatIngredients] = useState([]);

  /**
   * Obtiene el árbol completo de una receta (con sub-recetas)
   */
  const getRecipeTree = useCallback(async (recipeId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`/recipes/${recipeId}/tree`);
      if (!res.ok) throw new Error('Error al obtener árbol de receta');
      const data = await res.json();
      setRecipeTree(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtiene todos los ingredientes de una receta (planos, con sub-recetas expandidas)
   */
  const getFlatIngredients = useCallback(async (recipeId, multiplier = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`/recipes/${recipeId}/ingredients-flat?multiplier=${multiplier}`);
      if (!res.ok) throw new Error('Error al obtener ingredientes');
      const data = await res.json();
      setFlatIngredients(data.ingredients);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Recalcula el costo de una receta
   */
  const recalculateCost = useCallback(async (recipeId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`/recipes/${recipeId}/recalculate`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Error al recalcular costo');
      const data = await res.json();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    recipeTree,
    flatIngredients,
    getRecipeTree,
    getFlatIngredients,
    recalculateCost,
  };
}