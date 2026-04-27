import React, { createContext, useContext, useState, useEffect } from 'react';
import { navigationService } from '../services/navigationService';

const BusinessContext = createContext();

export const BusinessProvider = ({ children }) => {
  const [business, setBusiness] = useState(null);
  const [navigation, setNavigation] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(false);

  // Lee el usuario correctamente considerando diferentes llaves
  const getUser = () => {
    try {
      const userRaw =
        localStorage.getItem('idonUser') ||
        localStorage.getItem('user') ||
        '';
      return userRaw ? JSON.parse(userRaw) : null;
    } catch {
      return null;
    }
  };

  const getBusinessId = (user, business) => {
    return (
      business?.id ||
      user?.businessId ||
      localStorage.getItem('businessId') ||
      null
    );
  };

  const loadBusinessInfo = async () => {
    setLoading(true);
    try {
      const user = getUser();
      const schema = user?.schemaName || user?.schema; // prueba ambas variantes
      const businessId = getBusinessId(user, business);

      let nav;
      if (schema) {
        // Nivel 3: usa menú filtrado y log de depuración
        nav = await navigationService.getNavigationMenuLevel3({ schema, businessId });
        console.log('[BusinessProvider] Nivel 3 → schema:', schema, 'businessId:', businessId, 'nav:', nav);
      } else {
        // Nivel 2: normal
        nav = await navigationService.getNavigationMenu();
        console.log('[BusinessProvider] Nivel 2 → nav:', nav);
      }

      const [info, mods] = await Promise.all([
        navigationService.getBusinessInfo(),
        navigationService.getBusinessModules(),
      ]);
      setBusiness(info);
      setNavigation(nav);
      setModules(mods);
    } catch (error) {
      console.error('Error loading business context:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusinessInfo();
    // eslint-disable-next-line
  }, []);

  return (
    <BusinessContext.Provider value={{ business, navigation, modules, loading, loadBusinessInfo }}>
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
};