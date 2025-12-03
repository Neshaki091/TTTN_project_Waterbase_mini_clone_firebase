// API Configuration for waterbase-backend
const API_ORIGIN = ('http://localhost').replace(/\/$/, '');
const API_BASE = `${API_ORIGIN}`;

export const API_ENDPOINTS = {
  AUTH: {
    BASE: `${API_BASE}/api/v1/auth`,
    OWNERS: {
      LOGIN: '/owners/login',
      LOGOUT: '/owners/logout',
      REGISTER: '/owners',
      BY_ID: (id) => `/owners/${id}`,
    },
  },
  APPS: {
    BASE: `${API_BASE}/api/v1/apps`,
    BY_ID: (id) => `${API_BASE}/api/v1/apps/${id}`,
    API_KEY: (id) => `${API_BASE}/api/v1/apps/${id}/api-key`,
    REGENERATE_KEY: (id) => `${API_BASE}/api/v1/apps/${id}/regenerate-key`,
  },
  DATABASE: {
    BASE: `${API_BASE}/api/v1/waterdb`,
    COLLECTIONS: `${API_BASE}/api/v1/waterdb/collections`,
    COLLECTION: (collectionName) => `${API_BASE}/api/v1/waterdb/${collectionName}`,
    DOCUMENT: (collectionName, docId) => `${API_BASE}/api/v1/waterdb/${collectionName}/${docId}`,
  },
  RULES: {
    BASE: `${API_BASE}/api/v1/rules`,
    BY_APP_ROLE: (appId, role) => `${API_BASE}/api/v1/rules/${appId}/${role}`,
    CHECK_ACTION: `${API_BASE}/api/v1/rules/check-action`,
  },
  STORAGE: {
    BASE: `${API_BASE}/api/v1/storage`,
    FILES: `${API_BASE}/api/v1/storage/files`,
    UPLOAD: `${API_BASE}/api/v1/storage/upload`,
    DOWNLOAD: (fileId) => `${API_BASE}/api/v1/storage/download/${fileId}`,
    STATS: `${API_BASE}/api/v1/storage/stats`,
  },
  RTWATERDB: {
    BASE: `${API_BASE}/api/v1/rtwaterdb`,
    COLLECTIONS: `${API_BASE}/api/v1/rtwaterdb/collections`,
    COLLECTION: (collectionName) => `${API_BASE}/api/v1/rtwaterdb/${collectionName}`,
    DOCUMENT: (collectionName, docId) => `${API_BASE}/api/v1/rtwaterdb/${collectionName}/${docId}`,
  },
  REALTIME: {
    SOCKET_URL: `${API_ORIGIN}`,
    PATH: '/api/v1/rtwaterdb/socket.io',
  },
};

export default API_ENDPOINTS;
