import axios from 'axios';
import apiClient from './api.client';
import API_ENDPOINTS from '../config/api.config';

// Rule service dùng Management API (Owner Token)
const ruleApi = axios.create({
  baseURL: API_ENDPOINTS.RULES.BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add Owner Token interceptor
ruleApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ownerToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const ruleService = {
  // Get rule by appId and role
  getRule: async (appId, role) => {
    const response = await ruleApi.get(`/${appId}/${role}`);
    return response.data;
  },

  // Create rule
  createRule: async (ruleData) => {
    const response = await ruleApi.post('/', ruleData);
    return response.data;
  },

  // Update rule
  updateRule: async (ruleData) => {
    const response = await ruleApi.put('/', ruleData);
    return response.data;
  },

  // Delete rule
  deleteRule: async (appId, role) => {
    const response = await ruleApi.delete(`/${appId}/${role}`);
    return response.data;
  },

  // Check action (có thể dùng để test)
  checkAction: async (actionData) => {
    const response = await ruleApi.post('/check-action', actionData);
    return response.data;
  },
};

export default ruleService;


