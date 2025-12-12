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
      // 🔥 Firebase-style: Lưu CẢ access token VÀ refresh token
      localStorage.setItem('ownerToken', response.data.accessToken);
      localStorage.setItem('ownerRefreshToken', response.data.refreshToken);  // ← MỚI!
      localStorage.setItem('ownerData', JSON.stringify(response.data.owner || response.data));
    }
    return response.data;
  },

  // Owner Register
  registerOwner: async (ownerData) => {
    const response = await authApi.post(API_ENDPOINTS.AUTH.OWNERS.REGISTER, ownerData);
    if (response.data.accessToken) {
      localStorage.setItem('ownerToken', response.data.accessToken);
      localStorage.setItem('ownerRefreshToken', response.data.refreshToken);  // ← MỚI!
      localStorage.setItem('ownerData', JSON.stringify(response.data.owner || response.data));
    }
    return response.data;
  },

  // 🔥 Refresh Owner Token (Token Rotation)
  refreshOwnerToken: async () => {
    const refreshToken = localStorage.getItem('ownerRefreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await authApi.post(API_ENDPOINTS.AUTH.OWNERS.REFRESH_TOKEN, {
        refreshToken
      });

      // 🔥 Token Rotation: Update BOTH tokens
      localStorage.setItem('ownerToken', response.data.accessToken);
      localStorage.setItem('ownerRefreshToken', response.data.refreshToken);  // ← NEW token!

      return response.data.accessToken;
    } catch (error) {
      // Refresh failed - clear tokens and redirect to login
      authService.logoutOwner();
      throw error;
    }
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
    // Clear ALL tokens
    localStorage.removeItem('ownerToken');
    localStorage.removeItem('ownerRefreshToken');  // ← MỚI!
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

  // Forgot Password - Request password reset
  forgotPassword: async (email) => {
    const response = await authApi.post(API_ENDPOINTS.AUTH.OWNERS.FORGOT_PASSWORD, { email });
    return response.data;
  },

  // Change Password - Authenticated user changes password
  changePassword: async (currentPassword, newPassword) => {
    const token = localStorage.getItem('ownerToken');
    const response = await authApi.post(
      API_ENDPOINTS.AUTH.OWNERS.CHANGE_PASSWORD,
      { currentPassword, newPassword },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  // Update Profile - Update username and other profile info
  updateProfile: async (profileData) => {
    const token = localStorage.getItem('ownerToken');
    const response = await authApi.put(
      API_ENDPOINTS.AUTH.OWNERS.UPDATE_PROFILE,
      profileData,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    // Update local storage with new profile data
    if (response.data.owner) {
      localStorage.setItem('ownerData', JSON.stringify(response.data.owner));
    }

    return response.data;
  },
};

export default authService;
