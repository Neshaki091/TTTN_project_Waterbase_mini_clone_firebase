import axios from 'axios';
import API_ENDPOINTS from '../config/api.config';

const authApi = axios.create({
  baseURL: API_ENDPOINTS.AUTH.BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const authService = {
  // Owner Login
  loginOwner: async (credentials) => {
    const response = await authApi.post(API_ENDPOINTS.AUTH.OWNERS.LOGIN, credentials);
    if (response.data.accessToken) {
      localStorage.setItem('ownerToken', response.data.accessToken);
      localStorage.setItem('ownerData', JSON.stringify(response.data.owner || response.data));
    }
    return response.data;
  },

  // Owner Register
  registerOwner: async (ownerData) => {
    const response = await authApi.post(API_ENDPOINTS.AUTH.OWNERS.REGISTER, ownerData);
    if (response.data.accessToken) {
      localStorage.setItem('ownerToken', response.data.accessToken);
      localStorage.setItem('ownerData', JSON.stringify(response.data.owner || response.data));
    }
    return response.data;
  },

  // Owner Logout
  logoutOwner: async () => {
    const token = localStorage.getItem('ownerToken');
    if (token) {
      try {
        await authApi.post(
          API_ENDPOINTS.AUTH.OWNERS.LOGOUT,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    localStorage.removeItem('ownerToken');
    localStorage.removeItem('ownerData');
    localStorage.removeItem('currentAppId');
  },

  // Get current owner
  getCurrentOwner: () => {
    const ownerData = localStorage.getItem('ownerData');
    return ownerData ? JSON.parse(ownerData) : null;
  },

  // Check if authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('ownerToken');
  },

  // Check if user is WaterbaseAdmin
  isWaterbaseAdmin: () => {
    const ownerData = authService.getCurrentOwner();
    return ownerData?.role === 'adminWaterbase';
  },

  // Get user role
  getUserRole: () => {
    const ownerData = authService.getCurrentOwner();
    return ownerData?.role || null;
  },
};

export default authService;

