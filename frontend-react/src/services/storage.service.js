import axios from 'axios';
import API_ENDPOINTS from '../config/api.config';

class StorageService {
  constructor() {
    this.api = axios.create({
      baseURL: API_ENDPOINTS.STORAGE.BASE,
    });

    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('ownerToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      const headerAppId = config.headers['x-app-id'];
      const storedAppId = localStorage.getItem('currentAppId');
      if (!headerAppId && storedAppId) {
        config.headers['x-app-id'] = storedAppId;
      }

      return config;
    });

    this.api.interceptors.response.use(
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

  ensureAppId(appId) {
    const resolved = appId || localStorage.getItem('currentAppId');
    if (!resolved) {
      throw new Error('Missing appId context');
    }
    return resolved;
  }

  async uploadFile(appId, file, onProgress) {
    const resolvedAppId = this.ensureAppId(appId);
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.api.post(
      '/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-app-id': resolvedAppId,
        },
        onUploadProgress: (event) => {
          if (onProgress && event.total) {
            const percent = Math.round((event.loaded * 100) / event.total);
            onProgress(percent);
          }
        },
      }
    );

    return response.data;
  }

  async listFiles(appId) {
    const resolvedAppId = this.ensureAppId(appId);
    const response = await this.api.get('/files', {
      headers: { 'x-app-id': resolvedAppId },
    });
    return response.data;
  }

  async getFileInfo(fileId, appId) {
    const resolvedAppId = this.ensureAppId(appId);
    const response = await this.api.get(`/files/${fileId}`, {
      headers: { 'x-app-id': resolvedAppId },
    });
    return response.data;
  }

  async downloadFile(fileId, appId) {
    const resolvedAppId = this.ensureAppId(appId);
    const url = API_ENDPOINTS.STORAGE.DOWNLOAD(fileId);
    const response = await this.api.get(url, {
      responseType: 'blob',
      headers: { 'x-app-id': resolvedAppId },
    });
    return response.data;
  }

  async deleteFile(fileId, appId) {
    const resolvedAppId = this.ensureAppId(appId);
    const response = await this.api.delete(`/files/${fileId}`, {
      headers: { 'x-app-id': resolvedAppId },
    });
    return response.data;
  }

  async getStorageStats(appId) {
    const resolvedAppId = this.ensureAppId(appId);
    const response = await this.api.get('/stats', {
      headers: { 'x-app-id': resolvedAppId },
    });
    return response.data;
  }
}

export default new StorageService();
