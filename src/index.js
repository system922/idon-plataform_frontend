import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

/**
 * ✅ INTERCEPTOR GLOBAL DE FETCH - SOLO PARA ERRORES NO CONTROLADOS
 * ⚠️ NO INTERCEPTA PETICIONES DE AXIOS (api.js)
 * SOLO ACTUA EN CASO DE 401 EN FETCH NATIVO
 */
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0]?.toString() || '';
  
  return originalFetch.apply(this, args)
    .then(async (response) => {
      // 🔥 IGNORAR RUTAS PÚBLICAS
      const isPublicApi = url.includes('/api/public/');
      const isPublicPage = window.location.pathname.endsWith('/qr') || 
                           window.location.pathname.endsWith('/menu');
      const isAuthPage = window.location.pathname === '/login' || 
                         window.location.pathname === '/register';
      
      // Si es 401 y NO es ruta pública
      if (response.status === 401 && !isPublicApi && !isPublicPage && !isAuthPage) {
        console.log('🔴 [fetch] 401 detectado en:', url);
        
        // Verificar si hay token
        const token = localStorage.getItem('idonToken') || localStorage.getItem('token');
        if (!token) {
          console.log('🔴 [fetch] No hay token - redirigiendo a login');
          window.location.href = '/login';
          return response;
        }
        
        // Si hay token pero da 401, posiblemente expiró
        console.log('🔴 [fetch] Token presente pero 401 - limpiando y redirigiendo');
        localStorage.removeItem('idonUser');
        localStorage.removeItem('idonToken');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('access_token');
        localStorage.removeItem('selectedBusiness');
        localStorage.removeItem('selectedBusinessId');
        localStorage.removeItem('dbName');
        localStorage.removeItem('userRole');
        localStorage.removeItem('activeModules');
        localStorage.removeItem('activeFeatures');
        
        window.location.href = '/login';
      }
      
      // Si es 404 y es la navegación, no redirigir
      if (response.status === 404 && url.includes('/business-status/navigation')) {
        console.warn('⚠️ [fetch] Endpoint de navegación no encontrado (404)');
        // No redirigir, solo mostrar warning
      }
      
      return response;
    })
    .catch((error) => {
      console.error('❌ [fetch] Error en petición:', error);
      return Promise.reject(error);
    });
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();