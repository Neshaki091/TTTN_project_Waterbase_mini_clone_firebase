import apiClient from './api.client';

const adminService = {
    // Owner Management
    getAllOwners: async () => {
        const response = await apiClient.admin.get('/owners');
        return response.data;
    },

    getOwnerById: async (id) => {
        const response = await apiClient.admin.get(`/owners/${id}`);
        return response.data;
    },

    createOwner: async (ownerData) => {
        const response = await apiClient.admin.post('/owners', ownerData);
        return response.data;
    },

    updateOwner: async (id, ownerData) => {
        const response = await apiClient.admin.put(`/owners/${id}`, ownerData);
        return response.data;
    },

    deleteOwner: async (id) => {
        const response = await apiClient.admin.delete(`/owners/${id}`);
        return response.data;
    },

    // System Stats
    getSystemStats: async () => {
        const response = await apiClient.admin.get('/owners/admin/stats');
        return response.data;
    },

    // Owner Usage Stats
    getOwnerUsage: async (ownerId) => {
        const response = await apiClient.admin.get(`/owners/${ownerId}/usage`);
        return response.data;
    },

    // Get all apps across platform (aggregate from all owners)
    getAllApps: async () => {
        try {
            // Try to get apps with stats
            const response = await apiClient.admin.get('/owners/admin/apps-stats');
            return response.data;
        } catch (error) {
            console.warn("Failed to fetch apps with stats, falling back to basic list", error);
            const owners = await adminService.getAllOwners();
            const allApps = [];

            owners.forEach(owner => {
                if (owner.apps && Array.isArray(owner.apps)) {
                    owner.apps.forEach(app => {
                        allApps.push({
                            ...app,
                            ownerEmail: owner.profile?.email,
                            ownerName: owner.profile?.username || owner.profile?.email,
                            ownerId: owner._id
                        });
                    });
                }
            });

            return allApps;
        }
    },

    // Delete app (admin only)
    deleteApp: async (appId) => {
        const response = await apiClient.management.delete(`/${appId}`);
        return response.data;
    },

    // Lock/Unlock owner account
    lockOwner: async (ownerId, locked) => {
        const response = await apiClient.admin.put(`/owners/${ownerId}/lock`, { locked });
        return response.data;
    },

    // Get comprehensive dashboard stats from analytics service
    getDashboardStats: async () => {
        try {
            // Use the main backend endpoint which aggregates real data from all services via RPC
            const response = await apiClient.admin.get('/owners/admin/dashboard-stats');
            return response.data;
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            throw error;
        }
    },
};

export default adminService;
