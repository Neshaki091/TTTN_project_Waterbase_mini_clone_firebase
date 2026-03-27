const OwnerSchema = require('../models/owner.model');
const UserSchema = require('../models/user.model');

exports.getAuthStats = async () => {
    try {
        const totalOwners = await OwnerSchema.countDocuments({ role: 'owner' });
        const totalUsers = await UserSchema.countDocuments();

        // Get all apps from all owners
        const owners = await OwnerSchema.find({ role: 'owner' }, 'apps');
        const allAppIds = [];
        let totalApps = 0;

        owners.forEach(owner => {
            if (owner.apps && Array.isArray(owner.apps)) {
                owner.apps.forEach(app => {
                    if (app.appId) {
                        allAppIds.push(app.appId);
                        totalApps++;
                    }
                });
            }
        });

        return {
            totalOwners,
            totalUsers,
            totalApps,
            allAppIds
        };
    } catch (err) {
        console.error('Error fetching auth stats:', err);
        return { totalOwners: 0, totalUsers: 0, totalApps: 0, allAppIds: [] };
    }
};
