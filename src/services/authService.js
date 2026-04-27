import apiClient from './apiClient';

export const authService = {
  register: async (data) => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  login: async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    if (response.data.data.token) {
      // Parche: Forzar userType para usuarios admin si falta
      let userObj = { ...response.data.data.user };
      if (!userObj.userType && (userObj.role === 'super_admin' || userObj.role === 'admin' || userObj.is_admin)) {
        userObj.userType = 'admin_idon';
      }
      localStorage.setItem('authToken', response.data.data.token);
      localStorage.setItem('idonUser', JSON.stringify(userObj));
    }
    return response.data.data;
  },

  loginBusiness: async (email, password, businessSlug) => {
    const response = await apiClient.post('/auth/login-business', { email, password, businessSlug });
    if (response.data.data.token) {
      // Parche: Forzar userType para usuarios admin si falta
      let userObj = { ...response.data.data.user };
      if (!userObj.userType && (userObj.role === 'super_admin' || userObj.role === 'admin' || userObj.is_admin)) {
        userObj.userType = 'admin_idon';
      }
      localStorage.setItem('authToken', response.data.data.token);
      localStorage.setItem('idonUser', JSON.stringify(userObj));
    }
    return response.data.data;
  },

  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('idonUser');
  },

  refreshToken: async (token) => {
    const response = await apiClient.post('/auth/refresh', { token });
    if (response.data.data.token) {
      localStorage.setItem('authToken', response.data.data.token);
    }
    return response.data.data;
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('idonUser');
    return user ? JSON.parse(user) : null;
  },

  getToken: () => localStorage.getItem('authToken'),
};
