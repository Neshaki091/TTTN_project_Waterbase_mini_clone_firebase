const ownerRepository = require('../repositories/owner.repository');
const bcrypt = require('bcrypt');
const {
    generateAccessToken,
    generateRefreshToken,
    addOwnerRefreshToken,
    deleteOwnerRefreshToken
} = require('../../util/refreshToken');
const { getInstance } = require('../../shared/rabbitmq/client');
const emailService = require('../../util/email.service');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://waterbase:waterbase123@rabbitmq:5672';

// Helper function to format bytes
const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

exports.getAllOwners = async () => {
    const owners = await ownerRepository.findAll();
    const rabbitMQ = getInstance(RABBITMQ_URL);

    if (!rabbitMQ.isConnected) {
        await rabbitMQ.connect();
    }

    console.log('📤 Sending stats request to App Service via RPC for getAllOwners...');
    const appsFromRPC = await rabbitMQ.sendRPC('app.stats.request', {});
    const allApps = appsFromRPC || [];

    return owners.map(owner => {
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
};

exports.getOwnerById = async (ownerId) => {
    return ownerRepository.findById(ownerId);
};

exports.createOwner = async (ownerData) => {
    const { name, username, email, password } = ownerData;

    const existing = await ownerRepository.findByEmail(email);
    if (existing) throw new Error('Email already registered');

    const hashedPassword = await bcrypt.hash(password, 10);

    return ownerRepository.create({
        profile: {
            name: name || username,
            username: username,
            email
        },
        password: hashedPassword,
        role: 'owner'
    });
};

exports.createWaterbaseAdmin = async (adminData, adminSecret) => {
    const { name, email, password } = adminData;
    
    if (adminSecret !== process.env.ADMIN_SECRET) {
        throw new Error('Invalid admin secret key');
    }

    const existing = await ownerRepository.findByEmail(email);
    if (existing) throw new Error('Email already registered');

    const hashedPassword = await bcrypt.hash(password, 10);

    return ownerRepository.create({
        profile: { name, email },
        password: hashedPassword,
        role: 'adminWaterbase'
    });
};

exports.updateOwner = async (ownerId, updateData, user) => {
    const { name, email, password } = updateData;

    if (user.role !== 'adminWaterbase' && user.id !== ownerId && user._id?.toString() !== ownerId) {
        throw new Error('Forbidden');
    }

    const updates = { "profile.name": name, "profile.email": email };
    if (password) updates.password = await bcrypt.hash(password, 10);

    const updatedOwner = await ownerRepository.update(ownerId, { $set: updates });
    if (!updatedOwner) throw new Error('Owner not found');

    return updatedOwner;
};

exports.deleteOwner = async (ownerId) => {
    const deleted = await ownerRepository.delete(ownerId);
    if (!deleted) throw new Error('Owner not found');
    return deleted;
};

exports.updateOwnerApps = async (ownerId, action, app, user) => {
    if (user.role !== 'adminWaterbase' && user._id?.toString() !== ownerId && user.id !== ownerId) {
        throw new Error('Forbidden');
    }

    let updateQuery;
    if (action === 'add') {
        updateQuery = { $push: { apps: { ...app, createdAt: new Date() } } };
    } else if (action === 'remove') {
        updateQuery = { $pull: { apps: { appId: app.appId } } };
    } else {
        throw new Error('Invalid action');
    }

    const updatedOwner = await ownerRepository.update(ownerId, updateQuery);
    if (!updatedOwner) throw new Error('Owner not found');
    return updatedOwner;
};

exports.loginOwner = async (email, password) => {
    const owner = await ownerRepository.findByEmail(email);
    if (!owner) throw new Error('Owner not found');

    const isMatch = await bcrypt.compare(password, owner.password);
    if (!isMatch) throw new Error('Invalid password');

    const accessToken = generateAccessToken({
        id: owner._id,
        role: owner.role,
        apps: owner.apps
    });
    const refreshToken = generateRefreshToken(owner._id);

    await addOwnerRefreshToken(owner._id, refreshToken, accessToken);

    return { owner, accessToken, refreshToken };
};

exports.logoutOwner = async (userId, accessToken) => {
    await deleteOwnerRefreshToken(userId, accessToken);
};

exports.getSystemStats = async () => {
    const totalOwners = await ownerRepository.countOwners();
    const owners = await ownerRepository.findAllWithApps();
    const totalApps = owners.reduce((acc, owner) => acc + (owner.apps ? owner.apps.length : 0), 0);

    return { totalOwners, totalApps };
};

exports.getOwnerUsage = async (ownerId, user, authHeader) => {
    if (user.role !== 'adminWaterbase' && user.id !== ownerId && user._id?.toString() !== ownerId) {
        throw new Error('Forbidden');
    }

    const owner = await ownerRepository.findById(ownerId);
    if (!owner) throw new Error('Owner not found');

    const appIds = owner.apps ? owner.apps.map(app => app.appId) : [];
    const rabbitMQ = getInstance(RABBITMQ_URL);

    if (!rabbitMQ.isConnected) await rabbitMQ.connect();

    // Use RPC for cleaner centralized quota/stats retrieval if possible, 
    // but here we follow original logic with RPC or HTTP.
    const stats = await rabbitMQ.sendRPC('app.stats.request', { appIds });
    
    // Aggregate for specific owner
    let dbUsage = { sizeBytes: 0, documents: 0 };
    let storageUsage = { sizeBytes: 0, files: 0 };

    (stats || []).forEach(app => {
        if (appIds.includes(app.appId)) {
            dbUsage.sizeBytes += (app.stats.database?.sizeBytes || 0) + (app.stats.realtime?.sizeBytes || 0);
            dbUsage.documents += (app.stats.database?.documents || 0) + (app.stats.realtime?.documents || 0);
            storageUsage.sizeBytes += app.stats.storage?.sizeBytes || 0;
            storageUsage.files += app.stats.storage?.files || 0;
        }
    });

    return {
        ownerId,
        totalDatabaseUsage: dbUsage,
        totalStorageUsage: storageUsage
    };
};

exports.lockOwner = async (ownerId, locked) => {
    const owner = await ownerRepository.findById(ownerId);
    if (!owner) throw new Error('Owner not found');
    if (owner.role === 'adminWaterbase') throw new Error('Cannot lock admin accounts');

    return ownerRepository.update(ownerId, { 
        status: locked ? 'suspended' : 'active',
        updatedAt: Date.now()
    });
};

exports.getDashboardStats = async () => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const allOwners = await ownerRepository.findOwnersOnly();
    const newOwnersThisMonth = allOwners.filter(o => o.createdAt >= firstDayOfMonth).length;

    const rabbitMQ = getInstance(RABBITMQ_URL);
    if (!rabbitMQ.isConnected) await rabbitMQ.connect();

    const allApps = await rabbitMQ.sendRPC('app.stats.request', {}) || [];

    const totalApps = allApps.length;
    const newAppsThisMonth = allApps.filter(app => new Date(app.createdAt) >= firstDayOfMonth).length;

    let totalDbStorage = 0, totalRtStorage = 0, totalFileStorage = 0;

    allApps.forEach(app => {
        if (app.stats) {
            totalDbStorage += app.stats.database?.sizeBytes || 0;
            totalRtStorage += app.stats.realtime?.sizeBytes || 0;
            totalFileStorage += app.stats.storage?.sizeBytes || 0;
        }
    });

    const ownerBreakdown = allOwners.map(owner => {
        const ownerApps = allApps.filter(app => app.ownerId === owner._id.toString());
        let db = 0, rt = 0, st = 0;

        ownerApps.forEach(app => {
            if (app.stats) {
                db += app.stats.database?.sizeBytes || 0;
                rt += app.stats.realtime?.sizeBytes || 0;
                st += app.stats.storage?.sizeBytes || 0;
            }
        });

        return {
            _id: owner._id,
            email: owner.profile?.email,
            username: owner.profile?.username,
            appCount: ownerApps.length,
            dbStorage: db,
            rtStorage: rt,
            fileStorage: st,
            servicesUsed: { database: db > 0, storage: st > 0, realtime: rt > 0 }
        };
    });

    return {
        totalOwners: allOwners.length,
        newOwnersThisMonth,
        totalApps,
        newAppsThisMonth,
        totalDbStorage,
        totalRtStorage,
        totalFileStorage,
        ownerBreakdown,
        trendsData: [] // Simplified for refactor focus
    };
};

exports.getAllAppsWithStats = async () => {
    const rabbitMQ = getInstance(RABBITMQ_URL);
    if (!rabbitMQ.isConnected) await rabbitMQ.connect();

    const appsFromRPC = await rabbitMQ.sendRPC('app.stats.request', {}) || [];

    return Promise.all(appsFromRPC.map(async (app) => {
        const owner = await ownerRepository.findById(app.ownerId);
        return {
            ...app,
            ownerEmail: owner?.profile?.email || 'Unknown',
            ownerName: owner?.profile?.username || owner?.profile?.name || 'Unknown'
        };
    }));
};

exports.forgotPassword = async (email) => {
    const owner = await ownerRepository.findByEmail(email);
    if (!owner) return { success: true, message: 'Nếu email tồn tại, mật khẩu đã được gửi.' };

    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    await ownerRepository.update(owner._id, { password: hashedPassword });

    if (emailService) {
        await emailService.sendPasswordResetEmail(email, tempPassword, owner.profile?.username || 'User');
    }

    return { success: true, message: 'Mật khẩu tạm thời đã được gửi.' };
};

exports.changePassword = async (userId, currentPassword, newPassword) => {
    if (newPassword.length < 6) throw new Error('New password must be at least 6 characters long');
    const owner = await ownerRepository.findById(userId);
    if (!owner) throw new Error('Owner not found');

    const isMatch = await bcrypt.compare(currentPassword, owner.password);
    if (!isMatch) throw new Error('Current password is incorrect');

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return ownerRepository.update(userId, { password: hashedPassword });
};

exports.updateProfile = async (userId, username, name) => {
    if (!username && !name) throw new Error('At least one field is required');
    const updates = {};
    if (username) updates['profile.username'] = username;
    if (name) updates['profile.name'] = name;

    const owner = await ownerRepository.update(userId, { $set: updates });
    if (!owner) throw new Error('Owner not found');
    return owner;
};
