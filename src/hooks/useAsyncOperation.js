import { useState, useCallback, useRef } from 'react';
import { INVENTORY_CONSTANTS } from '../constants/inventoryConstants';

/**
 * Hook para manejar operaciones asíncronas con AbortController
 * @returns {Object} { execute, isLoading, error, abort }
 */
export const useAsyncOperation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const execute = useCallback(async (asyncFunction, onSuccess, onError) => {
    // Abortar operación anterior si existe
    abort();

    // Crear nuevo AbortController
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsLoading(true);
    setError(null);

    // Timeout para la operación
    const timeoutId = setTimeout(() => {
      abort();
    }, INVENTORY_CONSTANTS.API_TIMEOUT_MS);

    try {
      const result = await asyncFunction(signal);
      clearTimeout(timeoutId);
      setIsLoading(false);
      onSuccess?.(result);
      return result;
    } catch (err) {
      clearTimeout(timeoutId);
      
      // Ignorar errores de abort
      if (err.name === 'AbortError') {

        return null;
      }
      
      setError(err.message);
      setIsLoading(false);
      onError?.(err);
      throw err;
    }
  }, [abort]);

  return {
    execute,
    isLoading,
    error,
    abort,
  };
};