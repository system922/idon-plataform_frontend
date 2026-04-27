// src/services/navigationService.js

import apiClient from './apiClient';

export const navigationService = {
  /**
   * Obtiene el menú estándar (nivel 2)
   */
  getNavigationMenu: async () => {
    const response = await apiClient.get('/navigation');
    return response.data.data;
  },

  /**
   * Obtiene el menú filtrado de nivel 3 (por schema & businessId)
   * @param {object} options
   *   @param {string} options.schema (requerido)
   *   @param {string|number} options.businessId (opcional)
   */
  getNavigationMenuLevel3: async ({ schema, businessId }) => {
    const headers = {};
    if (schema) headers['X-DB-Name'] = schema;
    if (businessId) headers['X-Business-Id'] = businessId;
    const response = await apiClient.get('/navigation/menu-level3', { headers });
    return response.data.data;
  },

  /**
   * Info del negocio
   */
  getBusinessInfo: async () => {
    const response = await apiClient.get('/navigation/business/info');
    return response.data.data;
  },

  /**
   * Módulos del negocio
   */
  getBusinessModules: async () => {
    const response = await apiClient.get('/navigation/business/modules');
    return response.data.data;
  },
};