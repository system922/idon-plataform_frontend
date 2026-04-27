import apiClient from './apiClient';

export const subscriptionService = {
  getSubscription: async () => {
    const response = await apiClient.get('/subscriptions');
    return response.data.data;
  },

  activateSubscription: async (subscriptionId) => {
    const response = await apiClient.post(`/subscriptions/${subscriptionId}/activate`);
    return response.data;
  },

  suspendSubscription: async (subscriptionId, reason) => {
    const response = await apiClient.post(`/subscriptions/${subscriptionId}/suspend`, {
      reason,
    });
    return response.data;
  },

  cancelSubscription: async (subscriptionId) => {
    const response = await apiClient.post(`/subscriptions/${subscriptionId}/cancel`);
    return response.data;
  },
};
