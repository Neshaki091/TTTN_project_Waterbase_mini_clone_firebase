const { getRabbit } = require('../../shared/rabbitmq/client');
const usageManager = require('../services/usage.manager');

/**
 * UsageSubscriber listens for resource usage update events from other services.
 */
class UsageSubscriber {
  constructor() {
    this.rabbit = null;
  }

  async init() {
    this.rabbit = getRabbit();
    console.log('[UsageSubscriber] Initializing usage subscribers...');
    
    // Listen for updates from all services using a wildcard routing key
    // usage.waterdb.update, usage.storage.update, etc.
    await this.rabbit.subscribe('app_usage_updates', ['usage.*.update'], async (message) => {
      const { appId, service, storageDelta, docDelta } = message.data;
      
      if (!appId || !service) {
        console.warn('[UsageSubscriber] Received invalid message:', message);
        return;
      }

      await usageManager.updateUsage(appId, service, storageDelta, docDelta);
    });
  }
}

module.exports = new UsageSubscriber();
