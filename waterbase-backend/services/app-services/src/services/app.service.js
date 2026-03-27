const { nanoid } = require('nanoid');
const { v4: uuidv4 } = require('uuid');
const appRepository = require('../repositories/app.repository');
const { getRabbit } = require('../../shared/rabbitmq/client');

/**
 * AppService handles the business logic for application management.
 * Adheres to SRP and DIP.
 */
class AppService {
  constructor() {
    this.authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-services:3000';
    this.ruleServiceUrl = process.env.RULE_SERVICE_URL || 'http://rule-services:3004';
    this.rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://waterbase:waterbase123@rabbitmq:5672';
  }

  async getAllApps(user) {
    const filter = (user.role === 'owner' || !user.role)
      ? { ownerId: user.id, status: { $ne: 'deleted' } }
      : { status: { $ne: 'deleted' } };

    return appRepository.find(filter);
  }

  async getAppById(appId, user) {
    const app = await appRepository.findByAppId(appId);
    if (!app) throw new Error('App not found');

    if (user.role !== 'adminWaterbase' && app.ownerId !== user.id) {
      throw new Error('Access denied');
    }

    return app;
  }

  async createApp(appData, user, authHeader) {
    const { name, description, config = {} } = appData;
    const ownerId = user.id;

    if (!name) throw new Error('App name is required');

    // Check limit
    const userAppsCount = await appRepository.countDocuments({ ownerId, status: { $ne: 'deleted' } });
    if (userAppsCount >= 5) {
      throw new Error('App limit reached. You can only create a maximum of 5 apps.');
    }

    // Check duplicate name
    const existingApp = await appRepository.findOne({ name, ownerId, status: { $ne: 'deleted' } });
    if (existingApp) throw new Error('App with the same name already exists');

    const appId = nanoid(12);
    const apiKey = `wbase_${uuidv4()}`;

    const app = await appRepository.create({
      appId,
      name,
      description,
      ownerId,
      apiKey,
      config,
      status: 'active'
    });

    // Create default rules (Fire and forget or handle gracefully)
    this._createDefaultRules(appId, ownerId).catch(err => console.error('Failed to create default rules:', err));

    // Sync with Auth Service
    this._syncAppWithAuth(ownerId, app, 'add', authHeader).catch(err => console.error('Failed to sync app with auth:', err));

    return app;
  }

  async updateApp(appId, updateData, user) {
    const app = await appRepository.findByAppId(appId);
    if (!app) throw new Error('App not found');

    if (user.role !== 'adminWaterbase' && app.ownerId !== user.id) {
      throw new Error('Access denied');
    }

    const { name, description, config } = updateData;
    const finalData = { updatedAt: new Date() };
    if (name) finalData.name = name;
    if (description !== undefined) finalData.description = description;
    if (config) finalData.config = { ...app.config, ...config };

    return appRepository.update(appId, finalData);
  }

  async deleteApp(appId, user, authHeader) {
    const app = await appRepository.findByAppId(appId);
    if (!app) throw new Error('App not found');

    if (user.role !== 'adminWaterbase' && app.ownerId !== user.id) {
      throw new Error('Access denied');
    }

    const deletedApp = await appRepository.deleteSoft(appId);

    // Sync with Auth Service
    this._syncAppWithAuth(app.ownerId, app, 'remove', authHeader).catch(err => console.error('Failed to sync app deletion with auth:', err));

    return deletedApp;
  }

  async getDeletedApps() {
    return appRepository.find({ status: 'deleted' });
  }

  async permanentlyDeleteApp(appId) {
    const app = await appRepository.findOne({ appId });
    if (!app) throw new Error('App not found');
    if (app.status !== 'deleted') throw new Error('App must be soft-deleted first');

    return appRepository.deletePermanent(appId);
  }

  async regenerateApiKey(appId, user) {
    const app = await this.getAppById(appId, user);
    const newApiKey = `wbase_${uuidv4()}`;
    return appRepository.update(appId, { apiKey: newApiKey, updatedAt: new Date() });
  }

  async getAllAppsWithStatsRPC() {
    const apps = await appRepository.find({ status: { $ne: 'deleted' } });
    if (apps.length === 0) return [];

    const appIds = apps.map(app => app.appId);
    const rabbitMQ = getRabbit(this.rabbitmqUrl);
    if (!rabbitMQ.isConnected) await rabbitMQ.connect();

    try {
      const [waterdbStats, storageStats, rtStats] = await Promise.all([
        rabbitMQ.sendRPC('waterdb.stats.request', { appIds }).catch(() => ({})),
        rabbitMQ.sendRPC('storage.stats.request', { appIds }).catch(() => ({})),
        rabbitMQ.sendRPC('rtwaterdb.stats.request', { appIds }).catch(() => ({}))
      ]);

      return apps.map(app => {
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
    } catch (error) {
      console.error('RPC Error in getAllAppsWithStatsRPC:', error);
      return apps.map(app => app.toObject());
    }
  }

  // --- External Service Sync Helpers ---

  async _createDefaultRules(appId, ownerId) {
    const defaultRules = [
      { appId, ownerId, role: 'user', actions: ['read_*'] },
      { appId, ownerId, role: 'editor', actions: ['read_*', 'create_*', 'update_*'] },
      { appId, ownerId, role: 'admin', actions: ['*'] }
    ];

    for (const ruleData of defaultRules) {
      await fetch(`${this.ruleServiceUrl}/internal/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData)
      });
    }
  }

  async _syncAppWithAuth(ownerId, app, action, authHeader) {
    await fetch(`${this.authServiceUrl}/owners/${ownerId}/apps`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        action,
        app: { appId: app.appId, name: app.name }
      })
    });
  }

  async getOwnerInfo(ownerIds, authHeader) {
    const ownerMap = {};
    const ownerPromises = ownerIds.map(async (ownerId) => {
      try {
        const response = await fetch(`${this.authServiceUrl}/owners/${ownerId}`, {
          headers: { 'Authorization': authHeader }
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
    return ownerMap;
  }
}

module.exports = new AppService();
