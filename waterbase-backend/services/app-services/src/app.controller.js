const appSchema = require('../models/app.model');
const { nanoid } = require('nanoid');
const { v4: uuidv4 } = require('uuid');

exports.getAllApps = async (req, res) => {
    try {
        // If user is owner, only show their apps
        // If user is adminWaterbase, show all apps
        const filter = (req.user.role === 'owner' || !req.user.role)
            ? { ownerId: req.user.id, status: { $ne: 'deleted' } }
            : { status: { $ne: 'deleted' } };

        const apps = await appSchema.find(filter);

        // If admin, fetch owner information for each app
        if (req.user.role === 'adminWaterbase') {
            const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-services:3000';
            const ownerIds = [...new Set(apps.map(app => app.ownerId))];

            // Fetch owner info from auth service
            const ownerMap = {};
            try {
                const ownerPromises = ownerIds.map(async (ownerId) => {
                    try {
                        const response = await fetch(`${AUTH_SERVICE_URL}/owners/${ownerId}`, {
                            headers: {
                                'Authorization': req.headers.authorization
                            }
                        });
                        if (response.ok) {
                            const owner = await response.json();
                            ownerMap[ownerId] = {
                                ownerEmail: owner.profile?.email || 'Unknown',
                                ownerName: owner.profile?.name || owner.profile?.email || 'Unknown'
                            };
                        }
                    } catch (err) {
                        console.error(`Failed to fetch owner ${ownerId}:`, err);
                    }
                });
                await Promise.all(ownerPromises);
            } catch (error) {
                console.error('Error fetching owner info:', error);
            }

            // Add owner info to apps
            const appsWithOwner = apps.map(app => ({
                ...app.toObject(),
                ownerEmail: ownerMap[app.ownerId]?.ownerEmail,
                ownerName: ownerMap[app.ownerId]?.ownerName
            }));

            return res.status(200).json(appsWithOwner);
        }

        res.status(200).json(apps);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving apps', error: error.message });
    }
};

exports.getAppById = async (req, res) => {
    const appId = req.params.id;
    try {
        const app = await appSchema.findOne({ appId, status: { $ne: 'deleted' } });
        if (!app) {
            return res.status(404).json({ message: 'App not found' });
        }

        // Check ownership (admin can access all apps)
        if (req.user.role !== 'adminWaterbase' && app.ownerId !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.status(200).json(app);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving app', error: error.message });
    }
};

exports.createApp = async (req, res) => {
    const { name, description, config = {} } = req.body;
    const ownerId = req.user.id;

    if (!name) {
        return res.status(400).json({ message: 'App name is required' });
    }

    try {
        // Check if user has reached the app limit (5 apps per user)
        const userAppsCount = await appSchema.countDocuments({ ownerId, status: { $ne: 'deleted' } });
        if (userAppsCount >= 5) {
            return res.status(403).json({
                message: 'App limit reached. You can only create a maximum of 5 apps.',
                currentCount: userAppsCount,
                maxLimit: 5
            });
        }

        // Check if app with same name exists for this owner
        const existingApp = await appSchema.findOne({ name, ownerId, status: { $ne: 'deleted' } });
        if (existingApp) {
            return res.status(400).json({
                message: 'App with the same name already exists'
            });
        }

        // Generate unique identifiers
        const appId = nanoid(12);
        const apiKey = `wbase_${uuidv4()}`;

        const newApp = new appSchema({
            appId,
            name,
            description,
            ownerId,
            apiKey,
            config,
            status: 'active'
        });

        await newApp.save();

        // Create default rules for the new app
        try {
            const RULE_SERVICE_URL = process.env.RULE_SERVICE_URL || 'http://rule-services:3004';
            const defaultRules = [
                {
                    appId,
                    ownerId,
                    role: 'user',
                    actions: ['read_*'] // Allow read on all collections
                },
                {
                    appId,
                    ownerId,
                    role: 'editor',
                    actions: ['read_*', 'create_*', 'update_*'] // Allow read, create, update on all collections
                },
                {
                    appId,
                    ownerId,
                    role: 'admin',
                    actions: ['*'] // All actions on all collections
                }
            ];

            // Create rules via internal API call
            for (const ruleData of defaultRules) {
                await fetch(`${RULE_SERVICE_URL}/internal/rules`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(ruleData)
                });
            }
        } catch (ruleError) {
            console.error('Failed to create default rules:', ruleError);
            // Don't fail app creation if rule creation fails
        }

        // Sync with Auth Service (Update Owner's app list)
        try {
            const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3000';
            await fetch(`${AUTH_SERVICE_URL}/owners/${ownerId}/apps`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': req.headers.authorization
                },
                body: JSON.stringify({
                    action: 'add',
                    app: {
                        appId: newApp.appId,
                        name: newApp.name
                    }
                })
            });
        } catch (syncError) {
            console.error('Failed to sync app with owner:', syncError);
        }

        res.status(201).json({
            message: 'App created successfully',
            app: {
                appId: newApp.appId,
                name: newApp.name,
                description: newApp.description,
                apiKey: newApp.apiKey,
                createdAt: newApp.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error creating app', error: error.message });
    }
};

exports.updateApp = async (req, res) => {
    const appId = req.params.id;
    const { name, description, config } = req.body;

    try {
        const app = await appSchema.findOne({ appId, status: { $ne: 'deleted' } });

        if (!app) {
            return res.status(404).json({ message: 'App not found' });
        }

        // Check ownership (admin can access all apps)
        if (req.user.role !== 'adminWaterbase' && app.ownerId !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Update fields
        if (name) app.name = name;
        if (description !== undefined) app.description = description;
        if (config) app.config = { ...app.config, ...config };
        app.updatedAt = Date.now();

        await app.save();

        res.status(200).json({
            message: 'App updated successfully',
            app
        });
    } catch (error) {
        res.status(500).json({ message: 'Error updating app', error: error.message });
    }
};

exports.deleteApp = async (req, res) => {
    const appId = req.params.id;

    try {
        const app = await appSchema.findOne({ appId, status: { $ne: 'deleted' } });

        if (!app) {
            return res.status(404).json({ message: 'App not found' });
        }

        // Check ownership (admin can access all apps)
        if (req.user.role !== 'adminWaterbase' && app.ownerId !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Soft delete
        app.status = 'deleted';
        app.updatedAt = Date.now();
        await app.save();

        // Sync with Auth Service (Remove from Owner's app list)
        try {
            const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3000';
            await fetch(`${AUTH_SERVICE_URL}/owners/${app.ownerId}/apps`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': req.headers.authorization
                },
                body: JSON.stringify({
                    action: 'remove',
                    app: { appId: app.appId }
                })
            });
        } catch (syncError) {
            console.error('Failed to sync app deletion with owner:', syncError);
        }

        res.status(200).json({ message: 'App deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting app', error: error.message });
    }
};

// Get all deleted apps (Admin only)
exports.getDeletedApps = async (req, res) => {
    try {
        // Only admin can access deleted apps
        if (req.user.role !== 'adminWaterbase') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        // Get all soft-deleted apps
        const deletedApps = await appSchema.find({ status: 'deleted' });

        // Fetch owner information for each app
        const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-services:3000';
        const ownerIds = [...new Set(deletedApps.map(app => app.ownerId))];

        const ownerMap = {};
        try {
            const ownerPromises = ownerIds.map(async (ownerId) => {
                try {
                    const response = await fetch(`${AUTH_SERVICE_URL}/owners/${ownerId}`, {
                        headers: {
                            'Authorization': req.headers.authorization
                        }
                    });
                    if (response.ok) {
                        const owner = await response.json();
                        ownerMap[ownerId] = {
                            ownerEmail: owner.profile?.email || 'Unknown',
                            ownerName: owner.profile?.name || owner.profile?.email || 'Unknown'
                        };
                    }
                } catch (err) {
                    console.error(`Failed to fetch owner ${ownerId}:`, err);
                }
            });
            await Promise.all(ownerPromises);
        } catch (error) {
            console.error('Error fetching owner info:', error);
        }

        // Add owner info to apps
        const appsWithOwner = deletedApps.map(app => ({
            ...app.toObject(),
            ownerEmail: ownerMap[app.ownerId]?.ownerEmail,
            ownerName: ownerMap[app.ownerId]?.ownerName
        }));

        res.status(200).json(appsWithOwner);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving deleted apps', error: error.message });
    }
};

// Permanently delete an app (Admin only)
exports.permanentlyDeleteApp = async (req, res) => {
    const appId = req.params.id;

    try {
        // Only admin can permanently delete apps
        if (req.user.role !== 'adminWaterbase') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        // Find the app (must be soft-deleted first)
        const app = await appSchema.findOne({ appId });

        if (!app) {
            return res.status(404).json({ message: 'App not found' });
        }

        if (app.status !== 'deleted') {
            return res.status(400).json({
                message: 'App must be soft-deleted first before permanent deletion',
                currentStatus: app.status
            });
        }

        // Permanently delete from database
        await appSchema.deleteOne({ appId });

        res.status(200).json({
            message: 'App permanently deleted from database',
            appId: app.appId,
            appName: app.name
        });
    } catch (error) {
        res.status(500).json({ message: 'Error permanently deleting app', error: error.message });
    }
};

exports.getAppAPIKey = async (req, res) => {
    const appId = req.params.id;

    try {
        const app = await appSchema.findOne({ appId, status: { $ne: 'deleted' } });

        if (!app) {
            return res.status(404).json({ message: 'App not found' });
        }

        // Check ownership (admin can access all apps)
        if (req.user.role !== 'adminWaterbase' && app.ownerId !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.status(200).json({
            appId: app.appId,
            apiKey: app.apiKey
        });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving API key', error: error.message });
    }
};

exports.regenerateAPIKey = async (req, res) => {
    const appId = req.params.id;

    try {
        const app = await appSchema.findOne({ appId, status: { $ne: 'deleted' } });

        if (!app) {
            return res.status(404).json({ message: 'App not found' });
        }

        // Check ownership (admin can access all apps)
        if (req.user.role !== 'adminWaterbase' && app.ownerId !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Generate new API key
        app.apiKey = `wbase_${uuidv4()}`;
        app.updatedAt = Date.now();
        await app.save();

        res.status(200).json({
            message: 'API key regenerated successfully',
            apiKey: app.apiKey
        });
    } catch (error) {
        res.status(500).json({ message: 'Error regenerating API key', error: error.message });
    }
};

// Download current service.json (keeps existing API key)
exports.downloadServiceJson = async (req, res) => {
    const appId = req.params.id;

    try {
        const app = await appSchema.findOne({ appId, status: { $ne: 'deleted' } });

        if (!app) {
            return res.status(404).json({ message: 'App not found' });
        }

        // Check ownership (admin can access all apps)
        if (req.user.role !== 'adminWaterbase' && app.ownerId !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Generate service.json content
        const serviceJson = {
            apiUrl: process.env.API_URL || 'http://api.waterbase.click',
            appId: app.appId,
            apiKey: app.apiKey,
            projectName: app.name,
            projectDescription: app.description || ''
        };

        // Set headers for file download
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="waterbase-service.json"`);
        res.status(200).json(serviceJson);
    } catch (error) {
        res.status(500).json({ message: 'Error generating service.json', error: error.message });
    }
};

// Regenerate service.json with new API key (invalidates old key)
exports.regenerateServiceJson = async (req, res) => {
    const appId = req.params.id;

    try {
        const app = await appSchema.findOne({ appId, status: { $ne: 'deleted' } });

        if (!app) {
            return res.status(404).json({ message: 'App not found' });
        }

        // Check ownership (admin can access all apps)
        if (req.user.role !== 'adminWaterbase' && app.ownerId !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Generate new API key
        const oldApiKey = app.apiKey;
        app.apiKey = `wbase_${uuidv4()}`;
        app.updatedAt = Date.now();
        await app.save();

        // Generate service.json content with new API key
        const serviceJson = {
            apiUrl: process.env.API_URL || 'https://api.waterbase.click',
            appId: app.appId,
            apiKey: app.apiKey,
            projectName: app.name,
            projectDescription: app.description || ''
        };

        // Set headers for file download
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="waterbase-service.json"`);

        res.status(200).json({
            message: 'Service.json regenerated with new API key. Old API key has been invalidated.',
            oldApiKey,
            serviceJson
        });
    } catch (error) {
        res.status(500).json({ message: 'Error regenerating service.json', error: error.message });
    }
};

// RPC Method: Get all apps with stats
exports.getAllAppsWithStatsRPC = async () => {
    try {
        console.log('📥 RPC: getAllAppsWithStatsRPC called');

        // 1. Get all apps
        const apps = await appSchema.find({ status: { $ne: 'deleted' } });
        console.log(`📊 Found ${apps.length} apps`);

        if (apps.length === 0) return [];

        const appIds = apps.map(app => app.appId);

        // 2. Fetch Stats (WaterDB + Storage + Realtime) via RPC
        const { getInstance } = require('../shared/rabbitmq/client');
        const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://waterbase:waterbase123@rabbitmq:5672';
        const rabbitMQ = getInstance(RABBITMQ_URL);

        if (!rabbitMQ.isConnected) await rabbitMQ.connect();

        console.log('📤 Sending stats requests to services via RPC...');

        const [waterdbStats, storageStats, rtStats] = await Promise.all([
            rabbitMQ.sendRPC('waterdb.stats.request', { appIds }).catch(e => {
                console.error('WaterDB stats error:', e.message);
                return {};
            }),
            rabbitMQ.sendRPC('storage.stats.request', { appIds }).catch(e => {
                console.error('Storage stats error:', e.message);
                return {};
            }),
            rabbitMQ.sendRPC('rtwaterdb.stats.request', { appIds }).catch(e => {
                console.error('Realtime stats error:', e.message);
                return {};
            })
        ]);

        console.log('📊 Stats received from services');

        // 3. Merge apps with stats
        // Note: Owner info will be enriched by Auth Service when it receives this data
        const enrichedApps = apps.map(app => {
            const dbStats = waterdbStats[app.appId] || { totalDocuments: 0, totalCollections: 0, sizeBytes: 0 };
            const stStats = storageStats[app.appId] || { totalFiles: 0, totalSize: 0 };
            const rtAppStats = rtStats[app.appId] || { totalCollections: 0, totalDocuments: 0, sizeBytes: 0 };

            return {
                ...app.toObject(),
                stats: {
                    database: {
                        documents: dbStats.totalDocuments,
                        collections: dbStats.totalCollections,
                        sizeBytes: dbStats.sizeBytes || 0
                    },
                    storage: {
                        files: stStats.totalFiles,
                        sizeBytes: stStats.totalSize
                    },
                    realtime: {
                        collections: rtAppStats.totalCollections,
                        documents: rtAppStats.totalDocuments,
                        sizeBytes: rtAppStats.sizeBytes || 0
                    }
                }
            };
        });

        console.log(`✅ Returning ${enrichedApps.length} apps with stats`);
        return enrichedApps;
    } catch (error) {
        console.error('❌ RPC Error in getAllAppsWithStatsRPC:', error);
        return [];
    }
};