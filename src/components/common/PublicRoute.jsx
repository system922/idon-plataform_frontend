import React from 'react';

/**
 * PublicRoute - Para rutas que NO requieren autenticación
 * Ejemplo: /:slug/qr, /:slug/menu, /login, /register
 */
export default function PublicRoute({ children }) {
  // Las rutas públicas siempre se renderizan, sin importar autenticación
  return children;
}