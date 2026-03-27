const App = require('../../models/app.model');

/**
 * UsageManager handles the centralized logic for updating application resource usage.
 * Adheres to SRP by managing only how usage data is stored and updated.
 */
class UsageManager {
  /**
   * Updates usage data for a specific service in an App.
   * Performs an atomic update to prevent race conditions.
   * @param {String} appId - The Target App ID.
   * @param {String} service - The service name (waterdb, storage, rtwaterdb).
   * @param {Number} storageDelta - Bytes to add/subtract.
   * @param {Number} docDelta - Document count to add/subtract.
   */
  async updateUsage(appId, service, storageDelta, docDelta) {
    try {
      const updateData = {
        $inc: {
          [`QuotaManager.${service}.storageSize`]: storageDelta,
          [`QuotaManager.${service}.docCount`]: docDelta,
        },
        $set: { updatedAt: new Date() }
      };

      const updatedApp = await App.findOneAndUpdate({ appId }, updateData, { new: true });
      
      if (!updatedApp) {
        console.warn(`[UsageManager] App ${appId} not found, cannot update usage.`);
        return null;
      }

      console.log(`[UsageManager] Updated ${service} usage for ${appId}: %+d bytes, %+d docs`, storageDelta, docDelta);
      return updatedApp;
    } catch (error) {
      console.error(`[UsageManager] Error updating usage for ${appId}:`, error);
      throw error;
    }
  }

  /**
   * Gets current usage stats for an app.
   * @param {String} appId 
   */
  async getUsage(appId) {
    const app = await App.findOne({ appId }).select('QuotaManager status');
    return app;
  }
}

module.exports = new UsageManager();
