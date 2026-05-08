import { useState, useEffect, useCallback, useRef } from 'react';
import { INVENTORY_CONSTANTS } from '../constants/inventoryConstants';

/**
 * Hook personalizado para búsqueda con debounce
 * @param {Array} items - Lista de elementos a filtrar
 * @param {Function} filterFn - Función de filtrado personalizada
 * @param {number} delay - Tiempo de debounce en ms
 * @returns {Object} { searchTerm, setSearchTerm, filteredItems, isSearching }
 */
export const useDebouncedSearch = (items, filterFn, delay = INVENTORY_CONSTANTS.DEBOUNCE_DELAY_MS) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredItems, setFilteredItems] = useState(items);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    // Limpiar timer anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsSearching(true);

    // Establecer nuevo timer
    debounceTimerRef.current = setTimeout(() => {
      if (!searchTerm.trim()) {
        setFilteredItems(items);
      } else {
        setFilteredItems(filterFn(items, searchTerm));
      }
      setIsSearching(false);
    }, delay);

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm, items, filterFn, delay]);

  const resetSearch = useCallback(() => {
    setSearchTerm('');
    setFilteredItems(items);
  }, [items]);

  return {
    searchTerm,
    setSearchTerm,
    filteredItems,
    isSearching,
    resetSearch,
  };
};