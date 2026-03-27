const { getRabbit } = require('../../shared/rabbitmq/client');

/**
 * UsageService for Storage handling file size changes.
 */
class UsageService {
  constructor() {
    this.rabbit = getRabbit();
  }

  /**
   * Tracks a change in storage usage.
   * @param {String} appId - The Target App ID.
   * @param {Object} delta - { storageDelta: Number, docDelta: Number }
   */
  async trackUpdate(appId, delta) {
    try {
      const eventType = `usage.storage.update`;
      const payload = {
        appId,
        service: 'storage',
        storageDelta: delta.storageDelta || 0,
        docDelta: delta.docDelta || 0,
      };

      await this.rabbit.publish(eventType, payload);
      console.log(`[UsageService-Storage] Published delta update for ${appId}:`, delta);
    } catch (error) {
      console.error(`[UsageService-Storage] Failed to track storage update:`, error);
    }
  }
}

module.exports = new UsageService();
