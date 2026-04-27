import apiClient from './apiClient';

export const registerService = {
  createRegistrationRequest: async (data) => {
    const response = await apiClient.post('/register', data);
    return response.data.data;
  },

  getRegistrationRequests: async (status = 'pending', page = 1, pageSize = 10) => {
    const response = await apiClient.get('/register', {
      params: { status, page, pageSize },
    });
    return response.data;
  },

  getRegistrationRequest: async (requestId) => {
    const response = await apiClient.get(`/register/${requestId}`);
    return response.data.data;
  },

  approveRequest: async (requestId, adminId) => {
    const response = await apiClient.post(
      `/admin/${requestId}/approve`,
      { adminId }
    );
    return response.data.data;
  },

  rejectRequest: async (requestId, adminId, rejectionReason) => {
    const response = await apiClient.post(
      `/admin/${requestId}/reject`,
      { adminId, rejectionReason }
    );
    return response.data;
  },
};
