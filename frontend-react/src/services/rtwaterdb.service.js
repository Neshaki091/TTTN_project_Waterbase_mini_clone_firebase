import apiClient from './api.client';

/**
 * RTWaterDB Service sử dụng RT Usage API (x-app-id header)
 * Dùng để test/simulate End-User requests trong Data Playground cho Realtime Database
 */
export const rtwaterdbService = {
    // Get collections list
    getCollections: async () => {
        const response = await apiClient.rtUsage.get('/collections');
        return response.data;
    },

    // Get collection (with optional query params)
    getCollection: async (collectionName, query = {}) => {
        const response = await apiClient.rtUsage.get(`/${collectionName}`, { params: query });
        return response.data;
    },

    // Get document by ID
    getDocument: async (collectionName, docId) => {
        const response = await apiClient.rtUsage.get(`/${collectionName}/${docId}`);
        return response.data;
    },

    // Create document
    createDocument: async (collectionName, documentData) => {
        const response = await apiClient.rtUsage.post(`/${collectionName}`, documentData);
        return response.data;
    },

    // Update document
    updateDocument: async (collectionName, docId, documentData) => {
        const response = await apiClient.rtUsage.put(`/${collectionName}/${docId}`, documentData);
        return response.data;
    },

    // Delete document
    deleteDocument: async (collectionName, docId) => {
        const response = await apiClient.rtUsage.delete(`/${collectionName}/${docId}`);
        return response.data;
    },
};

export default rtwaterdbService;
