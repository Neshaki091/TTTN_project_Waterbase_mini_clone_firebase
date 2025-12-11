import apiClient from './api.client';
import API_ENDPOINTS from '../config/api.config';

export const appService = {
  // Get all apps (Management mode)
  getAllApps: async () => {
    const response = await apiClient.management.get('/');
    return response.data;
  },

  // Get app by ID
  getAppById: async (id) => {
    const response = await apiClient.management.get(`/${id}`);
    return response.data;
  },

  // Create app
  createApp: async (appData) => {
    const response = await apiClient.management.post('/', appData);
    return response.data;
  },

  // Update app
  updateApp: async (id, appData) => {
    const response = await apiClient.management.put(`/${id}`, appData);
    return response.data;
  },

  // Delete app
  deleteApp: async (id) => {
    const response = await apiClient.management.delete(`/${id}`);
    return response.data;
  },

  // Get API key
  getAppAPIKey: async (id) => {
    const response = await apiClient.management.get(`/${id}/api-key`);
    return response.data;
  },

  // Regenerate API key
  regenerateAPIKey: async (id) => {
    const response = await apiClient.management.post(`/${id}/regenerate-key`);
    return response.data;
  },

  // Get WaterDB usage stats
  getWaterDBUsage: async (appId) => {
    const response = await apiClient.usage.get('/stats', {
      headers: { 'x-app-id': appId }
    });
    return response;
  },

  // Get RTWaterDB usage stats
  getRTWaterDBUsage: async (appId) => {
    const response = await apiClient.rtUsage.get('/stats', {
      headers: { 'x-app-id': appId }
    });
    return response;
  },
};

export default appService;


