import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from '../../context/SessionContext';
import { api} from '../../config/api';

const BusinessContext = createContext();

export function BusinessContextProvider({ children }) {
  const { user, isAuthenticated } = useSession();
  const { selectedBusiness: sessionSelectedBusiness, setSelectedBusiness: setSessionSelectedBusiness, businesses: sessionBusinesses } = useSession();
  const [selectedBusiness, setSelectedBusinessState] = useState(sessionSelectedBusiness || null);
  const [businesses, setBusinesses] = useState([]);
  const [businessLoading, setBusinessLoading] = useState(false);

  // Cargar el negocio seleccionado desde el usuario autenticado
  useEffect(() => {
    // Sincronizar con el SessionContext
    if (sessionSelectedBusiness) {
      setSelectedBusinessState(sessionSelectedBusiness);
    } else if (user && user.businessId) {
      const assignedBusiness = {
        id: user.businessId,
        name: user.businessName || user.business?.name,
        type: user.businessType,
        schemaName: user.schemaName,
        slug: user.schemaName || user.businessSlug
      };
      setSelectedBusinessState(assignedBusiness);
      // Propagar al SessionContext
      setSessionSelectedBusiness(assignedBusiness);
    }
  }, [user, isAuthenticated, sessionSelectedBusiness, setSessionSelectedBusiness]);

  // Detectar subdominio
  useEffect(() => {
    if (selectedBusiness) return;

    try {
      const hostname = window.location.hostname || '';
      if (!hostname) return;

      const ignore = ['localhost', '127', '127.0.0.1', '::1', 'www', 'app', 'admin'];
      const parts = hostname.split('.');
      let subdomain = null;

      if (hostname.includes('localhost') && parts.length >= 2) {
        subdomain = parts[0];
      } else if (parts.length > 2) {
        subdomain = parts[0];
      }

      if (!subdomain) return;
      if (ignore.includes(subdomain)) return;

      (async () => {
        try {
          setBusinessLoading(true);
          const response = await api.get(`/public/businesses/slug/${subdomain}`);
          if (response.data) {
            const b = response.data;
            selectBusiness(b);
            try { /* keep business logo in memory only */ } catch {}
          }
        } catch (e) {
          console.error('Error cargando negocio por subdominio:', e);
        } finally {
          setBusinessLoading(false);
        }
      })();
    } catch (err) {
      console.error('Error detectando subdominio:', err);
    }
  }, [selectedBusiness]);

  const selectBusiness = (business) => {
    setSelectedBusinessState(business);
    // Propagar al SessionContext para que actualice headers y estado global
    setSessionSelectedBusiness(business);
  };

  const clearBusiness = () => {
    setSelectedBusinessState(null);
    setSessionSelectedBusiness(null);
  };

  return (
    <BusinessContext.Provider
      value={{
        selectedBusiness,
        setSelectedBusiness: selectBusiness,
        clearBusiness,
        businesses,
        setBusinesses,
        businessLoading,
        setBusinessLoading
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusinessContext() {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusinessContext debe usarse dentro de BusinessContextProvider');
  }
  return context;
}