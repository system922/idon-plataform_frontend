import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/Global.css';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

/**
 * ✅ INTERCEPTOR GLOBAL DE FETCH
 * Detecta automáticamente 401 (token expirado)
 * Limpia localStorage y redirige a login
 */
const originalFetch = window.fetch;
window.fetch = function(...args) {
  return originalFetch.apply(this, args)
    .then(async (response) => {
      // Si es 401 (No autorizado), significa que el token expiró
      if (response.status === 401) {

        // Limpiar todo el localStorage relacionado con la sesión
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
        
        // Redirigir a login
        window.location.href = '/login';
      }
      
      return response;
    });
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
