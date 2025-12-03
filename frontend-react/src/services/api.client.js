import axios from 'axios';
import API_ENDPOINTS from '../config/api.config';

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

    this._setupManagementInterceptors();
    this._setupAdminInterceptors();
    this._setupUsageInterceptors();
    this._setupRtUsageInterceptors();
  }

  _setupManagementInterceptors() {
    // Thêm token cho request
    this.managementApi.interceptors.request.use((config) => {
      const token = localStorage.getItem('ownerToken');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    // Response interceptor xử lý lỗi 401
    this.managementApi.interceptors.response.use(
      (res) => res,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('ownerToken');
          localStorage.removeItem('ownerData');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  _setupAdminInterceptors() {
    // Thêm token cho request
    this.adminApi.interceptors.request.use((config) => {
      const token = localStorage.getItem('ownerToken');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    // Response interceptor xử lý lỗi 401
    this.adminApi.interceptors.response.use(
      (res) => res,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('ownerToken');
          localStorage.removeItem('ownerData');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  _setupUsageInterceptors() {
    this.usageApi.interceptors.request.use((config) => {
      const appId = localStorage.getItem('currentAppId');
      if (appId) config.headers['x-app-id'] = appId;

      // 👇 SỬA ĐOẠN NÀY: Logic ưu tiên Token
      const userToken = localStorage.getItem('simulationUserToken');
      const ownerToken = localStorage.getItem('ownerToken'); // Lấy thêm token owner

      if (userToken) {
        // Ưu tiên 1: Đang giả lập User cụ thể
        config.headers.Authorization = `Bearer ${userToken}`;
      } else if (ownerToken) {
        // Ưu tiên 2: Dùng quyền Owner (để test trong Playground)
        config.headers.Authorization = `Bearer ${ownerToken}`;
      }

      return config;
    });

    this.usageApi.interceptors.response.use(
      (res) => res,
      (error) => {
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

    this.rtUsageApi.interceptors.response.use(
      (res) => res,
      (error) => {
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

