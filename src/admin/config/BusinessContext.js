import React, { createContext, useContext, useState, useEffect } from 'react';

const BusinessContext = createContext();

export function BusinessContextProvider({ children }) {
  const [selectedBusiness, setSelectedBusinessState] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [businessLoading, setBusinessLoading] = useState(false);

  // Cargar el negocio seleccionado desde localStorage O del usuario asignado
  useEffect(() => {
    // Primero intentar cargar del usuario autenticado con businessId asignado
    try {
      const userStr = localStorage.getItem('idonUser');
      if (userStr) {
        const user = JSON.parse(userStr);
        // Si el usuario tiene businessId asignado (manager, caja, vendedor)
        if (user.businessId) {
          const assignedBusiness = {
            id: user.businessId,
            name: user.businessName,
            type: user.businessType,
            schemaName: user.schemaName,
            slug: user.schemaName
          };
          setSelectedBusinessState(assignedBusiness);
          localStorage.setItem('selectedBusiness', JSON.stringify(assignedBusiness));
          localStorage.setItem('dbName', user.schemaName);
          return;
        }
      }
    } catch (e) {
      console.warn('Error detectando negocio asignado del usuario:', e);
    }

    // Si no hay usuario con businessId, cargar desde localStorage
    const saved = localStorage.getItem('selectedBusiness');
    if (saved) {
      try {
        setSelectedBusinessState(JSON.parse(saved));
      } catch (e) {
        console.warn('Error cargando negocio guardado:', e);
      }
    }
  }, []);

  // Detectar subdominio (por ejemplo: myslug.localhost o myslug.example.com)
  // y precargar información pública del negocio si aún no hay uno seleccionado.
  useEffect(() => {
    if (selectedBusiness) return; // ya seleccionado manualmente

    try {
      const hostname = window.location.hostname || '';
      if (!hostname) return;

      const ignore = ['localhost', '127', '127.0.0.1', '::1', 'www', 'app', 'admin'];
      const parts = hostname.split('.');
      let subdomain = null;

      // Manejo para myslug.localhost
      if (hostname.includes('localhost') && parts.length >= 2) {
        subdomain = parts[0];
      } else if (parts.length > 2) {
        // ejemplo: myslug.example.com
        subdomain = parts[0];
      }

      if (!subdomain) return;
      if (ignore.includes(subdomain)) return;

      (async () => {
        try {
          setBusinessLoading(true);
          const base = process.env.REACT_APP_API_BASE || '';
          const res = await fetch(`${base}/api/public/businesses/slug/${subdomain}`);
          if (!res.ok) return;
          const b = await res.json();
          if (b) {
            selectBusiness(b);
            try { localStorage.setItem('business_logo', b.logoUrl || ''); } catch {}
          }
        } catch (e) {
          console.warn('Subdomain business detection failed', e);
        } finally {
          setBusinessLoading(false);
        }
      })();
    } catch (err) {
      console.warn('Error detecting subdomain business:', err);
    }
  }, [selectedBusiness]);

  const selectBusiness = (business) => {
    setSelectedBusinessState(business);
    localStorage.setItem('selectedBusiness', JSON.stringify(business));
    localStorage.setItem('dbName', business.dbName || business.schemaName);
  };

  const clearBusiness = () => {
    setSelectedBusinessState(null);
    localStorage.removeItem('selectedBusiness');
    localStorage.removeItem('dbName');
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
