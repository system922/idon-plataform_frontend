// src/hooks/useBusinessNavigation.js
import { useMemo } from 'react';
import { useSession } from '../context/SessionContext';
import { useState, useEffect } from 'react';
import { api } from '../config/api';

export function useBusinessNavigation() {
  const { user } = useSession();
  const [navData, setNavData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cargar datos de navegación
  useEffect(() => {
    const loadNavigation = async () => {
      try {
        const response = await api.get('/business-status/navigation');
        if (response.data?.ok && response.data?.data) {
          setNavData(response.data.data);
        }
      } catch (error) {
        console.error('Error cargando navegación:', error);
      } finally {
        setLoading(false);
      }
    };
    loadNavigation();
  }, []);

  // Verificar si tiene acceso a un módulo o página
  const hasAccess = useMemo(() => {
    return (moduleCode, pageCode) => {
      if (!navData?.modules) return false;

      // Si es admin/owner, tiene acceso a todo
      const role = user?.roleCode || user?.role || '';
      if (['admin', 'owner', 'manager'].includes(role.toLowerCase())) {
        return true;
      }

      // Buscar el módulo
      const module = navData.modules.find(m => m.code === moduleCode);
      if (!module) return false;

      // Si no se especifica página, verificar solo el módulo
      if (!pageCode) return true;

      // Verificar si la página existe en el módulo
      const pageExists = module.pages?.some(p => p.code === pageCode);
      return pageExists;
    };
  }, [navData, user]);

  // Obtener los módulos a los que tiene acceso
  const accessibleModules = useMemo(() => {
    if (!navData?.modules) return [];
    return navData.modules;
  }, [navData]);

  // Obtener todas las páginas accesibles
  const accessiblePages = useMemo(() => {
    if (!navData?.modules) return [];
    const pages = [];
    navData.modules.forEach(mod => {
      (mod.pages || []).forEach(page => {
        pages.push({
          ...page,
          moduleCode: mod.code,
          moduleName: mod.name,
        });
      });
    });
    return pages;
  }, [navData]);

  return {
    hasAccess,
    accessibleModules,
    accessiblePages,
    navData,
    isLoading: loading,
  };
}