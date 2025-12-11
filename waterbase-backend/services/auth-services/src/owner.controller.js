const OwnerSchema = require('../models/owner.model');
const bcrypt = require('bcrypt');
const {
    generateAccessToken,
    generateRefreshToken,
    addOwnerRefreshToken,
    deleteOwnerRefreshToken
} = require('../util/refreshToken');

// 🧩 Hàm helper để chỉ trả về dữ liệu an toàn
function sanitizeOwner(owner) {
    if (!owner) return null;
    const { _id, profile, apps, role } = owner;
    console.log("Đăng nhập user", _id, profile, apps, role)
    return { _id, profile, apps, role };
}

// 🧠 Lấy tất cả owner (chỉ admin)
exports.getAllOwners = async (req, res) => {
    try {
        const owners = await OwnerSchema.find().select('_id profile apps role createdAt status');

        // Helper function to format bytes
        const formatBytes = (bytes) => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        };

        // Fetch all apps with stats via RPC
        const { getInstance } = require('../shared/rabbitmq/client');
        const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://waterbase:waterbase123@rabbitmq:5672';
        const rabbitMQ = getInstance(RABBITMQ_URL);

        if (!rabbitMQ.isConnected) {
            await rabbitMQ.connect();
        }

        console.log('📤 Sending stats request to App Service via RPC for getAllOwners...');
        const appsFromRPC = await rabbitMQ.sendRPC('app.stats.request', {});
        console.log('📥 Received apps from RPC (getAllOwners):', JSON.stringify(appsFromRPC, null, 2));
        const allApps = appsFromRPC || [];

        // Add storage stats for each owner based on real app data
        const ownersWithStats = owners.map(owner => {
            // Filter apps belonging to this owner
            const ownerApps = allApps.filter(app => app.ownerId === owner._id.toString());
            const appCount = ownerApps.length;

            // Calculate total stats for this owner
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
                apps: ownerApps, // Override apps array with real data from App Service
                appCount: appCount, // Explicit app count
                storageStats: {
                    waterdb: formatBytes(totalDbSize),
                    rtwaterdb: formatBytes(totalRtSize),
                    storage: formatBytes(totalStorageSize)
                }
            };
        });

        res.status(200).json(ownersWithStats);
    } catch (err) {
        console.error('Error in getAllOwners:', err);
        res.status(500).json({ message: 'Error retrieving owners', error: err.message });
    }
};

// 🔍 Lấy owner theo ID (admin hoặc chính owner - quyền đã check bằng middleware)
exports.getOwnerById = async (req, res) => {
    const ownerId = req.params.id;
    try {
        const owner = await OwnerSchema.findById(ownerId).select('_id profile apps role');
        if (!owner) return res.status(404).json({ message: 'Owner not found' });
        res.status(200).json(sanitizeOwner(owner));
    } catch (err) {
        res.status(500).json({ message: 'Error retrieving owner', error: err });
    }
};

// 🧱 Tạo owner mới
exports.createOwner = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const existing = await OwnerSchema.findOne({ "profile.email": email });
        if (existing) return res.status(400).json({ message: 'Email already registered' });

        const hashedPassword = await bcrypt.hash(password, 10);

        const owner = new OwnerSchema({
            profile: { name, email },
            password: hashedPassword,
            role: 'owner'
        });

        await owner.save();
        res.status(201).json(sanitizeOwner(owner));
    } catch (err) {
        res.status(500).json({ message: 'Error creating owner', error: err });
    }
};

// 🔐 Tạo admin (dành cho ADMIN_SECRET)
exports.createWaterbaseAdmin = async (req, res) => {
    const { name, email, password, adminSecret } = req.body;
    console.log("crate new admin: ", name, email, password, adminSecret)
    if (adminSecret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ message: 'Invalid admin secret key' });
    }

    try {
        const existing = await OwnerSchema.findOne({ 'profile.email': email });
        if (existing) return res.status(400).json({ message: 'Email already registered' });

        const hashedPassword = await bcrypt.hash(password, 10);

        const admin = new OwnerSchema({
            profile: { name, email },
            password: hashedPassword,
            role: 'adminWaterbase'
        });

        await admin.save();
        res.status(201).json(sanitizeOwner(admin));
    } catch (err) {
        res.status(500).json({ message: 'Error creating admin', error: err });
    }
};

// 🧾 Cập nhật owner
exports.updateOwner = async (req, res) => {
    const ownerId = req.params.id;
    const { name, email, password } = req.body;

    if (req.user.role !== 'adminWaterbase' && req.user.id.toString() !== ownerId) {
        return res.status(403).json({ message: 'Forbidden' });
    }

    try {
        const updateData = { "profile.name": name, "profile.email": email };
        if (password) updateData.password = await bcrypt.hash(password, 10);

        const updatedOwner = await OwnerSchema.findByIdAndUpdate(ownerId, updateData, { new: true })
            .select('_id profile apps role');
        if (!updatedOwner) return res.status(404).json({ message: 'Owner not found' });

        res.status(200).json(sanitizeOwner(updatedOwner));
    } catch (err) {
        res.status(500).json({ message: 'Error updating owner', error: err });
    }
};

// 🗑️ Xóa owner
exports.deleteOwner = async (req, res) => {
    const ownerId = req.params.id;
    try {
        // Sửa: Dùng findByIdAndDelete
        const deleted = await OwnerSchema.findByIdAndDelete(ownerId);
        if (!deleted) return res.status(404).json({ message: 'Owner not found' });
        res.status(200).json({ message: 'Owner deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting owner', error: err });
    }
};

// ⚙️ Thêm/xóa apps của owner
exports.updateOwnerApps = async (req, res) => {
    const ownerId = req.params.id;
    const { action, app } = req.body;

    if (req.user.role !== 'adminWaterbase' && req.user._id.toString() !== ownerId) {
        return res.status(403).json({ message: 'Forbidden' });
    }

    try {
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
            return res.status(400).json({ message: 'Invalid action' });
        }

        if (!updatedOwner) return res.status(404).json({ message: 'Owner not found' });
        res.status(200).json(sanitizeOwner(updatedOwner));
    } catch (err) {
        res.status(500).json({ message: 'Error updating apps', error: err });
    }
};

// 🔑 Login
exports.loginOwner = async (req, res) => {
    const { email, password } = req.body;

    try {
        const owner = await OwnerSchema.findOne({ "profile.email": email });
        if (!owner) return res.status(404).json({ message: 'Owner not found' });

        const isMatch = await bcrypt.compare(password, owner.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid password' });

        // Tạo Access Token với payload chi tiết
        const accessTokenPayload = {
            id: owner._id,
            role: owner.role,
            apps: owner.apps
        };
        const accessToken = generateAccessToken(accessTokenPayload);
        const refreshToken = generateRefreshToken(owner._id);

        await addOwnerRefreshToken(owner._id, refreshToken, accessToken);

        // ✅ Firebase-style: Trả refresh token trong response body
        res.status(200).json({
            owner: sanitizeOwner(owner),
            accessToken,
            refreshToken  // ← Trả về cho mọi platform
        });
    } catch (err) {
        res.status(500).json({ message: 'Error during login', error: err });
    }
};

// 🚪 Logout
exports.logoutOwner = async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(400).json({ message: 'Missing Authorization header' });
    }
    const accessToken = authHeader.split(' ')[1];

    try {
        // req.user._id đã có nhờ ownermiddleware
        await deleteOwnerRefreshToken(req.user.id, accessToken);

        res.status(200).json({ message: 'Logout successful' });
    } catch (err) {
        res.status(500).json({ message: 'Error during logout', error: err });
    }
};

// 📊 Lấy thống kê toàn hệ thống (Admin)
exports.getSystemStats = async (req, res) => {
    try {
        const totalOwners = await OwnerSchema.countDocuments({ role: 'owner' });
        // Aggregate total apps across all owners
        const owners = await OwnerSchema.find().select('apps');
        const totalApps = owners.reduce((acc, owner) => acc + (owner.apps ? owner.apps.length : 0), 0);

        res.status(200).json({
            totalOwners,
            totalApps
        });
    } catch (err) {
        res.status(500).json({ message: 'Error retrieving system stats', error: err });
    }
};

// 📊 Lấy thống kê sử dụng của Owner (Database + Storage)
exports.getOwnerUsage = async (req, res) => {
    const ownerId = req.params.id;

    // Check permission: Admin or same owner
    if (req.user.role !== 'adminWaterbase' && req.user.id !== ownerId) {
        return res.status(403).json({ message: 'Forbidden' });
    }

    try {
        const owner = await OwnerSchema.findById(ownerId).select('apps');
        if (!owner) return res.status(404).json({ message: 'Owner not found' });

        const appIds = owner.apps ? owner.apps.map(app => app.appId) : [];

        // Define service URLs (Assuming Docker network or env vars)
        const WATERDB_SERVICE_URL = process.env.WATERDB_SERVICE_URL || 'http://waterdb-service:3001';
        const STORAGE_SERVICE_URL = process.env.STORAGE_SERVICE_URL || 'http://storage-service:3003';

        // Helper to fetch stats
        const fetchStats = async (url, payload) => {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': req.headers.authorization // Pass through token
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

        res.status(200).json({
            ownerId,
            totalDatabaseUsage: waterdbStats || { totalCollections: 0, totalDocuments: 0 },
            totalStorageUsage: storageStats || { totalFiles: 0, totalSize: 0 }
        });

    } catch (err) {
        res.status(500).json({ message: 'Error retrieving owner usage', error: err.message });
    }
};
// 🔒 Lock/Unlock owner account (Admin only)
exports.lockOwner = async (req, res) => {
    const ownerId = req.params.id;
    const { locked } = req.body;

    try {
        const owner = await OwnerSchema.findById(ownerId);

        if (!owner) {
            return res.status(404).json({ message: 'Owner not found' });
        }

        // Prevent locking admin accounts
        if (owner.role === 'adminWaterbase') {
            return res.status(403).json({ message: 'Cannot lock admin accounts' });
        }

        // Update status
        owner.status = locked ? 'suspended' : 'active';
        owner.updatedAt = Date.now();
        await owner.save();

        res.status(200).json({
            message: `Owner account ${locked ? 'locked' : 'unlocked'} successfully`,
            owner: {
                _id: owner._id,
                email: owner.profile?.email,
                status: owner.status
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error updating owner status', error: error.message });
    }
};
// 📊 Get comprehensive dashboard statistics (Admin only)
exports.getDashboardStats = async (req, res) => {
    try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Get all owners
        const allOwners = await OwnerSchema.find({ role: { $ne: 'adminWaterbase' } });

        // Count new owners this month
        const newOwnersThisMonth = await OwnerSchema.countDocuments({
            role: { $ne: 'adminWaterbase' },
            createdAt: { $gte: firstDayOfMonth }
        });

        // Fetch all apps with stats via RPC
        const { getInstance } = require('../shared/rabbitmq/client');
        const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://waterbase:waterbase123@rabbitmq:5672';
        const rabbitMQ = getInstance(RABBITMQ_URL);

        if (!rabbitMQ.isConnected) {
            await rabbitMQ.connect();
        }

        console.log('📤 Sending stats request to App Service via RPC for Dashboard...');
        const appsFromRPC = await rabbitMQ.sendRPC('app.stats.request', {});
        console.log('📥 Received apps from RPC:', JSON.stringify(appsFromRPC, null, 2));
        const allApps = appsFromRPC || [];

        // Aggregate app statistics
        const totalApps = allApps.length;
        const newAppsThisMonth = allApps.filter(app =>
            new Date(app.createdAt) >= firstDayOfMonth
        ).length;

        // Calculate total storage usage across all apps
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

        // Process each owner
        for (const owner of allOwners) {
            // Filter apps for this owner
            const ownerApps = allApps.filter(app => app.ownerId === owner._id.toString());
            const appCount = ownerApps.length;

            // Calculate stats for this owner
            let ownerDbDocs = 0; // Keep for backward compatibility if needed, but better to use size
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

            // Calculate service usage
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

        // Generate trends data for last 6 months
        const trendsData = [];
        for (let i = 5; i >= 0; i--) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

            const ownersCount = await OwnerSchema.countDocuments({
                role: { $ne: 'adminWaterbase' },
                createdAt: { $lt: nextMonth }
            });

            // Count apps created up to this month using RPC data
            const appsCount = allApps.filter(app =>
                new Date(app.createdAt) < nextMonth
            ).length;

            trendsData.push({
                month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                owners: ownersCount,
                apps: appsCount
            });
        }

        res.status(200).json({
            totalOwners: allOwners.length,
            newOwnersThisMonth,
            totalApps,
            newAppsThisMonth,
            totalDbStorage,
            totalFileStorage,
            ownerBreakdown,
            trendsData
        });
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.status(500).json({ message: 'Error retrieving dashboard statistics', error: error.message });
    }
};

// 📊 Get all apps with usage stats (Admin only)
exports.getAllAppsWithStats = async (req, res) => {
    try {
        console.log('📊 getAllAppsWithStats: Starting...');

        // Use RabbitMQ RPC to get data from App Service
        const { getInstance } = require('../shared/rabbitmq/client');
        const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://waterbase:waterbase123@rabbitmq:5672';
        const rabbitMQ = getInstance(RABBITMQ_URL);

        // Ensure connected (server.js should have connected, but safe to check)
        if (!rabbitMQ.isConnected) {
            console.log('🔌 RabbitMQ not connected, connecting...');
            await rabbitMQ.connect();
        }

        console.log('📤 Sending stats request to App Service via RPC...');
        const appsFromRPC = await rabbitMQ.sendRPC('app.stats.request', {});
        console.log(`📥 Received ${appsFromRPC?.length || 0} apps from RPC`);

        if (!appsFromRPC || appsFromRPC.length === 0) {
            console.log('⚠️ No apps returned from App Service');
            return res.status(200).json([]);
        }

        // Enrich with Owner Info (since Auth Service has the Owner DB)
        console.log('🔍 Enriching apps with owner information...');
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
                    console.warn(`⚠️ Owner not found for app ${app.appId} (ownerId: ${app.ownerId})`);
                    return {
                        ...app,
                        ownerEmail: 'Unknown',
                        ownerName: 'Unknown'
                    };
                }
            } catch (e) {
                console.error(`❌ Error enriching app ${app.appId}:`, e.message);
                return {
                    ...app,
                    ownerEmail: 'Error',
                    ownerName: 'Error'
                };
            }
        }));

        console.log(`✅ Returning ${enrichedApps.length} enriched apps`);
        res.status(200).json(enrichedApps);

    } catch (err) {
        console.error('❌ Error getting all apps with stats via RPC:', err);
        res.status(500).json({ message: 'Error retrieving apps', error: err.message });
    }
};
