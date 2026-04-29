import { useEffect, useState } from 'react';

/**
 * Hook para obtener el menú de navegación real desde el backend
 * @returns {Object} { menu, loading, error }
 */
export function useNavigationMenu() {
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetch('/api/navigation', {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        if (data.success && data.data) {
          setMenu(data.data);
        } else {
          setError(data.message || 'Error al cargar menú');
        }
        setLoading(false);
      })
      .catch(err => {
        if (!isMounted) return;
        setError('Error de red');
        setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  return { menu, loading, error };
}
