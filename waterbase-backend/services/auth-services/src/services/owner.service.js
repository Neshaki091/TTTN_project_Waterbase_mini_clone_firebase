const OwnerSchema = require('../../models/owner.model');
const bcrypt = require('bcrypt');
const {
    generateAccessToken,
    generateRefreshToken,
    addOwnerRefreshToken,
    deleteOwnerRefreshToken
} = require('../../util/refreshToken');
const { getInstance } = require('../../shared/rabbitmq/client');
const emailService = require('../../util/email.service');

// Helper function to format bytes (internal to service now)
const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

exports.getAllOwners = async () => {
    const owners = await OwnerSchema.find().select('_id profile apps role createdAt status');

    const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://waterbase:waterbase123@rabbitmq:5672';
    const rabbitMQ = getInstance(RABBITMQ_URL);

    if (!rabbitMQ.isConnected) {
        await rabbitMQ.connect();
    }

    console.log('📤 Sending stats request to App Service via RPC for getAllOwners...');
    const appsFromRPC = await rabbitMQ.sendRPC('app.stats.request', {});
    console.log('📥 Received apps from RPC (getAllOwners):', JSON.stringify(appsFromRPC, null, 2));
    const allApps = appsFromRPC || [];

    const ownersWithStats = owners.map(owner => {
        const ownerApps = allApps.filter(app => app.ownerId === owner._id.toString());
        const appCount = ownerApps.length;

        let totalDbSize = 0;
        let totalRtSize = 0;
        let totalStorageSize = 0;

        ownerApps.forEach(app => {
            if (app.stats) {
                totalDbSize += app.stats.database?.sizeBytes || 0;
                totalRtSize += app.stats.realtime?.sizeBytes || 0;
                totalStorageSize += app.stats.storage?.sizeBytes || 0;
            }
        });

        return {
            ...owner.toObject(),
            apps: ownerApps,
            appCount: appCount,
            storageStats: {
                waterdb: formatBytes(totalDbSize),
                rtwaterdb: formatBytes(totalRtSize),
                storage: formatBytes(totalStorageSize)
            }
        };
    });

    return ownersWithStats;
};

exports.getOwnerById = async (ownerId) => {
    const owner = await OwnerSchema.findById(ownerId).select('_id profile apps role');
    return owner;
};

exports.createOwner = async (ownerData) => {
    const { name, username, email, password } = ownerData;

    const existing = await OwnerSchema.findOne({ "profile.email": email });
    if (existing) {
        throw new Error('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const owner = new OwnerSchema({
        profile: {
            name: name || username,
            username: username,
            email
        },
        password: hashedPassword,
        role: 'owner'
    });

    await owner.save();
    return owner;
};

exports.createWaterbaseAdmin = async (adminData, adminSecret) => {
    const { name, email, password } = adminData;
    
    if (adminSecret !== process.env.ADMIN_SECRET) {
        throw new Error('Invalid admin secret key');
    }

    const existing = await OwnerSchema.findOne({ 'profile.email': email });
    if (existing) {
        throw new Error('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = new OwnerSchema({
        profile: { name, email },
        password: hashedPassword,
        role: 'adminWaterbase'
    });

    await admin.save();
    return admin;
};

exports.updateOwner = async (ownerId, updateData, user) => {
    const { name, email, password } = updateData;

    if (user.role !== 'adminWaterbase' && user.id !== ownerId && user._id?.toString() !== ownerId) {
        throw new Error('Forbidden');
    }

    const finalUpdateData = { "profile.name": name, "profile.email": email };
    if (password) finalUpdateData.password = await bcrypt.hash(password, 10);

    const updatedOwner = await OwnerSchema.findByIdAndUpdate(ownerId, finalUpdateData, { new: true })
        .select('_id profile apps role');
    if (!updatedOwner) throw new Error('Owner not found');

    return updatedOwner;
};

exports.deleteOwner = async (ownerId) => {
    const deleted = await OwnerSchema.findByIdAndDelete(ownerId);
    if (!deleted) throw new Error('Owner not found');
    return deleted;
};

exports.updateOwnerApps = async (ownerId, action, app, user) => {
    if (user.role !== 'adminWaterbase' && user._id?.toString() !== ownerId && user.id !== ownerId) {
        throw new Error('Forbidden');
    }

    let updatedOwner;
    if (action === 'add') {
        updatedOwner = await OwnerSchema.findByIdAndUpdate(
            ownerId,
            { $push: { apps: { ...app, createdAt: new Date() } } },
            { new: true }
        ).select('_id profile apps role');
    } else if (action === 'remove') {
        updatedOwner = await OwnerSchema.findByIdAndUpdate(
            ownerId,
            { $pull: { apps: { appId: app.appId } } },
            { new: true }
        ).select('_id profile apps role');
    } else {
        throw new Error('Invalid action');
    }

    if (!updatedOwner) throw new Error('Owner not found');
    return updatedOwner;
};

exports.loginOwner = async (email, password) => {
    const owner = await OwnerSchema.findOne({ "profile.email": email });
    if (!owner) throw new Error('Owner not found');

    const isMatch = await bcrypt.compare(password, owner.password);
    if (!isMatch) throw new Error('Invalid password');

    const accessTokenPayload = {
        id: owner._id,
        role: owner.role,
        apps: owner.apps
    };
    const accessToken = generateAccessToken(accessTokenPayload);
    const refreshToken = generateRefreshToken(owner._id);

    await addOwnerRefreshToken(owner._id, refreshToken, accessToken);

    return { owner, accessToken, refreshToken };
};

exports.logoutOwner = async (userId, accessToken) => {
    await deleteOwnerRefreshToken(userId, accessToken);
};

exports.getSystemStats = async () => {
    const totalOwners = await OwnerSchema.countDocuments({ role: 'owner' });
    const owners = await OwnerSchema.find().select('apps');
    const totalApps = owners.reduce((acc, owner) => acc + (owner.apps ? owner.apps.length : 0), 0);

    return { totalOwners, totalApps };
};

exports.getOwnerUsage = async (ownerId, user, authHeader) => {
    if (user.role !== 'adminWaterbase' && user.id !== ownerId && user._id?.toString() !== ownerId) {
        throw new Error('Forbidden');
    }

    const owner = await OwnerSchema.findById(ownerId).select('apps');
    if (!owner) throw new Error('Owner not found');

    const appIds = owner.apps ? owner.apps.map(app => app.appId) : [];

    const WATERDB_SERVICE_URL = process.env.WATERDB_SERVICE_URL || 'http://waterdb-service:3001';
    const STORAGE_SERVICE_URL = process.env.STORAGE_SERVICE_URL || 'http://storage-service:3003';

    const fetchStats = async (url, payload) => {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) return null;
            return await response.json();
        } catch (err) {
            console.error(`Error fetching stats from ${url}:`, err);
            return null;
        }
    };

    const [waterdbStats, storageStats] = await Promise.all([
        fetchStats(`${WATERDB_SERVICE_URL}/waterdb/stats/aggregate`, { appIds }),
        fetchStats(`${STORAGE_SERVICE_URL}/stats/aggregate`, { appIds })
    ]);

    return {
        ownerId,
        totalDatabaseUsage: waterdbStats || { totalCollections: 0, totalDocuments: 0 },
        totalStorageUsage: storageStats || { totalFiles: 0, totalSize: 0 }
    };
};

exports.lockOwner = async (ownerId, locked) => {
    const owner = await OwnerSchema.findById(ownerId);
    if (!owner) throw new Error('Owner not found');
    if (owner.role === 'adminWaterbase') throw new Error('Cannot lock admin accounts');

    owner.status = locked ? 'suspended' : 'active';
    owner.updatedAt = Date.now();
    await owner.save();

    return owner;
};

exports.getDashboardStats = async () => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const allOwners = await OwnerSchema.find({ role: { $ne: 'adminWaterbase' } });

    const newOwnersThisMonth = await OwnerSchema.countDocuments({
        role: { $ne: 'adminWaterbase' },
        createdAt: { $gte: firstDayOfMonth }
    });

    const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://waterbase:waterbase123@rabbitmq:5672';
    const rabbitMQ = getInstance(RABBITMQ_URL);

    if (!rabbitMQ.isConnected) {
        await rabbitMQ.connect();
    }

    const appsFromRPC = await rabbitMQ.sendRPC('app.stats.request', {});
    const allApps = appsFromRPC || [];

    const totalApps = allApps.length;
    const newAppsThisMonth = allApps.filter(app =>
        new Date(app.createdAt) >= firstDayOfMonth
    ).length;

    let totalDbStorage = 0;
    let totalRtStorage = 0;
    let totalFileStorage = 0;

    allApps.forEach(app => {
        if (app.stats) {
            totalDbStorage += app.stats.database?.sizeBytes || 0;
            totalRtStorage += app.stats.realtime?.sizeBytes || 0;
            totalFileStorage += app.stats.storage?.sizeBytes || 0;
        }
    });

    const ownerBreakdown = [];
    for (const owner of allOwners) {
        const ownerApps = allApps.filter(app => app.ownerId === owner._id.toString());
        const appCount = ownerApps.length;

        let ownerDbSize = 0;
        let ownerRtSize = 0;
        let ownerStorageSize = 0;

        ownerApps.forEach(app => {
            if (app.stats) {
                ownerDbSize += app.stats.database?.sizeBytes || 0;
                ownerRtSize += app.stats.realtime?.sizeBytes || 0;
                ownerStorageSize += app.stats.storage?.sizeBytes || 0;
            }
        });

        const servicesUsed = {
            database: ownerDbSize > 0,
            storage: ownerStorageSize > 0,
            realtime: ownerRtSize > 0
        };

        ownerBreakdown.push({
            _id: owner._id,
            email: owner.profile?.email,
            username: owner.profile?.username,
            appCount,
            dbStorage: ownerDbSize,
            rtStorage: ownerRtSize,
            fileStorage: ownerStorageSize,
            servicesUsed
        });
    }

    const trendsData = [];
    for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

        const ownersCount = await OwnerSchema.countDocuments({
            role: { $ne: 'adminWaterbase' },
            createdAt: { $lt: nextMonth }
        });

        const appsCount = allApps.filter(app =>
            new Date(app.createdAt) < nextMonth
        ).length;

        trendsData.push({
            month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            owners: ownersCount,
            apps: appsCount
        });
    }

    return {
        totalOwners: allOwners.length,
        newOwnersThisMonth,
        totalApps,
        newAppsThisMonth,
        totalDbStorage,
        totalRtStorage,
        totalFileStorage,
        ownerBreakdown,
        trendsData
    };
};

exports.getAllAppsWithStats = async () => {
    const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://waterbase:waterbase123@rabbitmq:5672';
    const rabbitMQ = getInstance(RABBITMQ_URL);

    if (!rabbitMQ.isConnected) {
        await rabbitMQ.connect();
    }

    const appsFromRPC = await rabbitMQ.sendRPC('app.stats.request', {});
    if (!appsFromRPC || appsFromRPC.length === 0) {
        return [];
    }

    const enrichedApps = await Promise.all(appsFromRPC.map(async (app) => {
        try {
            const owner = await OwnerSchema.findById(app.ownerId).select('profile');
            if (owner) {
                return {
                    ...app,
                    ownerEmail: owner.profile?.email || 'Unknown',
                    ownerName: owner.profile?.username || owner.profile?.name || owner.profile?.email || 'Unknown'
                };
            } else {
                return {
                    ...app,
                    ownerEmail: 'Unknown',
                    ownerName: 'Unknown'
                };
            }
        } catch (e) {
            return {
                ...app,
                ownerEmail: 'Error',
                ownerName: 'Error'
            };
        }
    }));

    return enrichedApps;
};

exports.forgotPassword = async (email) => {
    const owner = await OwnerSchema.findOne({ "profile.email": email });
    if (!owner) {
        // Silent success for security
        return { success: true, message: 'Nếu email tồn tại trong hệ thống, mật khẩu tạm thời đã được gửi đến email của bạn.' };
    }

    const generateTempPassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
        let password = '';
        for (let i = 0; i < 8; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    };

    const temporaryPassword = generateTempPassword();
    owner.password = await bcrypt.hash(temporaryPassword, 10);
    await owner.save();

    if (emailService) {
        await emailService.sendPasswordResetEmail(
            email,
            temporaryPassword,
            owner.profile?.username || owner.profile?.name || 'User'
        );
    }

    return { success: true, message: 'Mật khẩu tạm thời đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.' };
};

exports.changePassword = async (userId, currentPassword, newPassword) => {
    if (newPassword.length < 6) throw new Error('New password must be at least 6 characters long');

    const owner = await OwnerSchema.findById(userId);
    if (!owner) throw new Error('Owner not found');

    const isMatch = await bcrypt.compare(currentPassword, owner.password);
    if (!isMatch) throw new Error('Current password is incorrect');

    owner.password = await bcrypt.hash(newPassword, 10);
    await owner.save();

    return true;
};

exports.updateProfile = async (userId, username, name) => {
    if (!username && !name) throw new Error('At least one field (username or name) is required');

    const owner = await OwnerSchema.findById(userId);
    if (!owner) throw new Error('Owner not found');

    if (username) owner.profile.username = username;
    if (name) owner.profile.name = name;

    await owner.save();
    return owner;
};
