import { useEffect, useState, useCallback } from 'react';

/**
 * 🪝 Hook: useUserModulesAndFeatures (MEJORADO)
 * 
 * Obtiene los módulos y features activos para el usuario actual
 * Con múltiples fallbacks y mejor manejo de errores
 * 
 * Returns:
 * - modules: Array de códigos de módulos ['sales', 'orders', ...]
 * - features: Array de códigos de features ['electronic_invoice', ...]
 * - loading: Boolean - mientras carga
 * - error: String - si hay error
 * - refresh: Function - para refrescar los datos
 */
export function useUserModulesAndFeatures(businessId) {
  const [modules, setModules] = useState([]);
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchModulesAndFeatures = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 🔍 STEP 1: Resolver businessId (desde prop o localStorage)
      const actualBusinessId = businessId || 
        (() => {
          try {
            const savedBiz = JSON.parse(localStorage.getItem('selectedBusiness') || '{}');
            return savedBiz.id;
          } catch {
            return null;
          }
        })();

      if (!actualBusinessId) {
        console.warn('⚠️ useUserModulesAndFeatures: No businessId disponible');
        
        // Fallback a localStorage
        const savedModules = JSON.parse(localStorage.getItem('activeModules') || '[]');
        const savedFeatures = JSON.parse(localStorage.getItem('activeFeatures') || '[]');
        setModules(savedModules);
        setFeatures(savedFeatures);
        setLoading(false);
        return;
      }

      // 🔍 STEP 2: Obtener token (intentar múltiples fuentes)
      let token = localStorage.getItem('token') || 
                  localStorage.getItem('accessToken') || 
                  localStorage.getItem('idonToken');

      if (!token) {
        console.warn('⚠️ useUserModulesAndFeatures: No hay token - usando localStorage');
        const savedModules = JSON.parse(localStorage.getItem('activeModules') || '[]');
        const savedFeatures = JSON.parse(localStorage.getItem('activeFeatures') || '[]');
        setModules(savedModules);
        setFeatures(savedFeatures);
        setLoading(false);
        return;
      }

      // 🔍 STEP 3: Llamar al endpoint
      const API_BASE = process.env.REACT_APP_API_BASE || 'https://idon-plataform-backend.onrender.com';
      const url = `${API_BASE}/api/business/${actualBusinessId}/modules-and-features`;

      console.log(`🔄 Fetching: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      // 🔍 STEP 4: Procesar respuesta
      if (!response.ok) {
        throw new Error(`Endpoint: ${response.status}`);
      }

      const data = await response.json();

      // 📥 Normalizar datos (puede venir en diferentes formatos)
      let moduleCodes = data.module_codes || data.modules || [];
      let featureCodes = data.feature_codes || data.features || [];

      // Si vienen como objetos, extraer códigos
      if (Array.isArray(moduleCodes) && moduleCodes.length > 0 && typeof moduleCodes[0] === 'object') {
        moduleCodes = moduleCodes.map(m => m.code || m.id);
      }
      if (Array.isArray(featureCodes) && featureCodes.length > 0 && typeof featureCodes[0] === 'object') {
        featureCodes = featureCodes.map(f => f.code || f.id);
      }

      // ✅ Guardar en localStorage
      localStorage.setItem('activeModules', JSON.stringify(moduleCodes || []));
      localStorage.setItem('activeFeatures', JSON.stringify(featureCodes || []));

      setModules(moduleCodes || []);
      setFeatures(featureCodes || []);

      console.log('✅ Módulos:', moduleCodes);
      console.log('✅ Features:', featureCodes);

    } catch (err) {
      console.error('❌ useUserModulesAndFeatures error:', err.message);
      setError(err.message);
      
      // Fallback a localStorage
      const savedModules = JSON.parse(localStorage.getItem('activeModules') || '[]');
      const savedFeatures = JSON.parse(localStorage.getItem('activeFeatures') || '[]');
      setModules(savedModules);
      setFeatures(savedFeatures);

    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchModulesAndFeatures();
  }, [businessId, fetchModulesAndFeatures]);

  return {
    modules,
    features,
    loading,
    error,
    refresh: fetchModulesAndFeatures
  };
}
