import apiClient from './api.client';

export const userService = {
    // Get all users in app
    getAllUsers: async (appId) => {
        const response = await apiClient.admin.get('/users', {
            headers: { 'x-app-id': appId }
        });
        return response.data;
    },

    // Get user by ID
    getUserById: async (userId, appId) => {
        const response = await apiClient.admin.get(`/users/${userId}`, {
            headers: { 'x-app-id': appId }
        });
        return response.data;
    },

    // Toggle user status (lock/unlock)
    toggleUserStatus: async (userId, isActive, appId) => {
        const response = await apiClient.admin.put(
            `/users/${userId}/status`,
            { isActive },
            { headers: { 'x-app-id': appId } }
        );
        return response.data;
    },

    // Delete user
    deleteUser: async (userId, appId) => {
        const response = await apiClient.admin.delete(`/users/${userId}`, {
            headers: { 'x-app-id': appId }
        });
        return response.data;
    },
};

export default userService;
