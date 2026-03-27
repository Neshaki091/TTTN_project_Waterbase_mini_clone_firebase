const { getRabbit } = require('../../shared/rabbitmq/client');

/**
 * UsageService handles the calculation and broadcasting of resource usage changes.
 * Adheres to SRP by focusing only on usage-related concerns.
 */
class UsageService {
  constructor() {
    this.rabbit = getRabbit();
  }

  /**
   * Calculates the approximate BSON size of a document.
   * @param {Object} doc - The document or data object.
   * @returns {Number} Size in bytes.
   */
  calculateSize(doc) {
    if (!doc) return 0;
    // Basic approximation: stringify + some metadata overhead
    // In a real MongoDB environment, this would ideally use BSON.calculateObjectSize
    return Buffer.byteLength(JSON.stringify(doc)) + 100; 
  }

  /**
   * Tracks a change in usage (delta) and publishes an event.
   * @param {String} appId - The Target App ID.
   * @param {String} serviceType - e.g., 'waterdb', 'storage', 'rtwaterdb'.
   * @param {Object} delta - { storageDelta: Number, docDelta: Number }
   */
  async trackUpdate(appId, serviceType, delta) {
    try {
      const eventType = `usage.${serviceType}.update`;
      const payload = {
        appId,
        service: serviceType,
        storageDelta: delta.storageDelta || 0,
        docDelta: delta.docDelta || 0,
      };

      await this.rabbit.publish(eventType, payload);
      console.log(`[UsageService] Published delta update for ${appId}:`, delta);
    } catch (error) {
      console.error(`[UsageService] Failed to track usage update:`, error);
    }
  }
}

module.exports = new UsageService();
