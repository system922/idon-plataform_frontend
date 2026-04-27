import apiClient from './apiClient';

export const catalogService = {
  getBusinessTypes: async () => {
    const response = await apiClient.get('/catalog/business-types');
    return response.data.data;
  },

  getModulesByBusinessType: async (typeId) => {
    const response = await apiClient.get(`/catalog/business-types/${typeId}/modules`);
    return response.data.data;
  },

  getModules: async () => {
    const response = await apiClient.get('/catalog/modules');
    return response.data.data;
  },

  getModulePages: async (moduleId) => {
    const response = await apiClient.get(`/catalog/modules/${moduleId}/pages`);
    return response.data.data;
  },
};
