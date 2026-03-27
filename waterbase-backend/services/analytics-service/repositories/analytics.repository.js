const Analytics = require('../models/analytics.model');

/**
 * AnalyticsRepository handles all database interactions for aggregated metrics.
 * Adheres to SRP and DIP.
 */
class AnalyticsRepository {
  async upsert(filter, updateData) {
    return Analytics.findOneAndUpdate(
      filter,
      updateData,
      { upsert: true, new: true }
    );
  }

  async findOne(filter) {
    return Analytics.findOne(filter);
  }

  async find(filter, sort = { periodStart: -1 }) {
    return Analytics.find(filter).sort(sort);
  }
}

module.exports = new AnalyticsRepository();
