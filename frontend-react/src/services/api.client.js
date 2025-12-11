import axios from 'axios';
import API_ENDPOINTS from '../config/api.config';
import authService from './auth.service';

class APIClient {
  constructor() {
    // Management API: dùng Owner Token
    this.managementApi = axios.create({
      baseURL: API_ENDPOINTS.APPS.BASE,
      headers: { 'Content-Type': 'application/json' },
    });

    // Admin API: dùng Owner Token cho auth endpoints
    this.adminApi = axios.create({
      baseURL: API_ENDPOINTS.AUTH.BASE,
      headers: { 'Content-Type': 'application/json' },
    });

    // Usage API: dùng x-app-id + End-User token
    this.usageApi = axios.create({
      baseURL: API_ENDPOINTS.DATABASE.BASE,
      headers: { 'Content-Type': 'application/json' },
    });

    // RT Usage API: dùng x-app-id + End-User token (cho Realtime DB)
    this.rtUsageApi = axios.create({
      baseURL: API_ENDPOINTS.RTWATERDB.BASE,
      headers: { 'Content-Type': 'application/json' },
    });

    // 🔥 Setup auto-refresh interceptors
    this._setupManagementInterceptors();
    this._setupAdminInterceptors();
    this._setupUsageInterceptors();
    this._setupRtUsageInterceptors();

    // Track if refresh is in progress
    this.isRefreshing = false;
    this.refreshPromise = null;
  }

  // 🔥 Auto-refresh helper (Firebase-style)
  async _refreshToken() {
    // Prevent multiple simultaneous refresh requests
    if (this.isRefreshing) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = authService.refreshOwnerToken()
      .then((newToken) => {
        this.isRefreshing = false;
        this.refreshPromise = null;
        return newToken;
      })
      .catch((error) => {
        this.isRefreshing = false;
        this.refreshPromise = null;
        // Redirect to login on refresh failure
        window.location.href = '/login';
        throw error;
      });

    return this.refreshPromise;
  }

  _setupManagementInterceptors() {
    // Request interceptor: Thêm token
    this.managementApi.interceptors.request.use((config) => {
      const token = localStorage.getItem('ownerToken');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    // 🔥 Response interceptor: Auto-refresh on 401
    this.managementApi.interceptors.response.use(
      (res) => res,
      async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retried
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Auto-refresh token
            const newToken = await this._refreshToken();

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.managementApi(originalRequest);
          } catch (refreshError) {
            // Refresh failed - already redirected to login
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  _setupAdminInterceptors() {
    // Request interceptor: Thêm token
    this.adminApi.interceptors.request.use((config) => {
      const token = localStorage.getItem('ownerToken');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    // 🔥 Response interceptor: Auto-refresh on 401
    this.adminApi.interceptors.response.use(
      (res) => res,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this._refreshToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.adminApi(originalRequest);
          } catch (refreshError) {
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  _setupUsageInterceptors() {
    this.usageApi.interceptors.request.use((config) => {
      const appId = localStorage.getItem('currentAppId');
      if (appId) config.headers['x-app-id'] = appId;

      const userToken = localStorage.getItem('simulationUserToken');
      const ownerToken = localStorage.getItem('ownerToken');

      if (userToken) {
        config.headers.Authorization = `Bearer ${userToken}`;
      } else if (ownerToken) {
        config.headers.Authorization = `Bearer ${ownerToken}`;
      }

      return config;
    });

    // 🔥 Auto-refresh for usage API too
    this.usageApi.interceptors.response.use(
      (res) => res,
      async (error) => {
        const originalRequest = error.config;

        // Only auto-refresh if using owner token (not user simulation)
        const isUsingOwnerToken = !localStorage.getItem('simulationUserToken');

        if (error.response?.status === 401 && !originalRequest._retry && isUsingOwnerToken) {
          originalRequest._retry = true;

          try {
            const newToken = await this._refreshToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.usageApi(originalRequest);
          } catch (refreshError) {
            return Promise.reject(refreshError);
          }
        }

        if (error.response?.status === 403) {
          console.warn(error.response.data?.message || 'Action not allowed');
        }

        return Promise.reject(error);
      }
    );
  }

  _setupRtUsageInterceptors() {
    this.rtUsageApi.interceptors.request.use((config) => {
      const appId = localStorage.getItem('currentAppId');
      if (appId) config.headers['x-app-id'] = appId;

      const userToken = localStorage.getItem('simulationUserToken');
      const ownerToken = localStorage.getItem('ownerToken');

      if (userToken) {
        config.headers.Authorization = `Bearer ${userToken}`;
      } else if (ownerToken) {
        config.headers.Authorization = `Bearer ${ownerToken}`;
      }

      return config;
    });

    // 🔥 Auto-refresh for RT usage API
    this.rtUsageApi.interceptors.response.use(
      (res) => res,
      async (error) => {
        const originalRequest = error.config;
        const isUsingOwnerToken = !localStorage.getItem('simulationUserToken');

        if (error.response?.status === 401 && !originalRequest._retry && isUsingOwnerToken) {
          originalRequest._retry = true;

          try {
            const newToken = await this._refreshToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.rtUsageApi(originalRequest);
          } catch (refreshError) {
            return Promise.reject(refreshError);
          }
        }

        if (error.response?.status === 403) {
          console.warn(error.response.data?.message || 'Action not allowed');
        }

        return Promise.reject(error);
      }
    );
  }

  // Getter để dùng bên ngoài
  get management() {
    return this.managementApi;
  }

  get admin() {
    return this.adminApi;
  }

  get usage() {
    return this.usageApi;
  }

  get rtUsage() {
    return this.rtUsageApi;
  }
}

export default new APIClient();
