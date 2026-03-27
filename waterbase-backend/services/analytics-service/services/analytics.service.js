const eventRepository = require('../repositories/event.repository');
const analyticsRepository = require('../repositories/analytics.repository');

/**
 * AnalyticsService encapsulates all business logic for events and metrics aggregation.
 * Adheres to SRP and DIP.
 */
class AnalyticsService {
  /**
   * Processes a raw event from RabbitMQ.
   */
  async processEvent(message) {
    const { eventType, data, timestamp } = message;

    const eventData = {
      eventType,
      appId: data.appId,
      ownerId: data.ownerId,
      userId: data.userId,
      data: data.payload || data,
      metadata: data.metadata || {},
      timestamp: new Date(timestamp)
    };

    return eventRepository.create(eventData);
  }

  /**
   * Aggregates events for a specific period.
   */
  async aggregatePeriod(period, periodStart, periodEnd) {
    const events = await eventRepository.findByPeriod(periodStart, periodEnd);

    if (events.length === 0) {
      console.log(`No new events to aggregate for ${period}`);
      return;
    }

    // Group by ownerId and appId
    const groups = this._groupEvents(events);

    // Aggregate each group
    for (const group of Object.values(groups)) {
      await this._aggregateGroup(period, periodStart, periodEnd, group);
    }

    // Mark events as processed
    const eventIds = events.map(e => e._id);
    await eventRepository.markAsProcessed(eventIds);
  }

  _groupEvents(events) {
    const groups = {};
    events.forEach(event => {
      const key = `${event.ownerId || 'unknown'}_${event.appId || 'all'}`;
      if (!groups[key]) {
        groups[key] = {
          ownerId: event.ownerId || 'unknown',
          appId: event.appId,
          events: []
        };
      }
      groups[key].events.push(event);
    });
    return groups;
  }

  async _aggregateGroup(period, periodStart, periodEnd, group) {
    const { ownerId, appId, events } = group;
    const metrics = this._calculateMetrics(events);

    await analyticsRepository.upsert(
      { ownerId, appId, period, periodStart },
      {
        ownerId,
        appId,
        period,
        periodStart,
        periodEnd,
        metrics
      }
    );

    console.log(`📊 Aggregated ${events.length} events for ${ownerId}/${appId || 'all'}`);
  }

  // --- Query Methods ---

  async getSystemAnalytics() {
    // In a real scenario, this might be a specialized aggregation or a summary doc
    const latestDaily = await analyticsRepository.find({ period: 'daily' }, { periodStart: -1 });
    return {
      timeSeries: latestDaily,
      // More complex summarization could go here
    };
  }

  async getOwnerAnalytics(ownerId) {
    return analyticsRepository.find({ ownerId, period: 'daily' });
  }

  async getAppAnalytics(appId) {
    return analyticsRepository.find({ appId, period: 'daily' });
  }

  _calculateMetrics(events) {
    const metrics = {
      totalApiCalls: 0,
      apiCallsByEndpoint: new Map(),
      documentsCreated: 0,
      documentsUpdated: 0,
      documentsDeleted: 0,
      documentsRead: 0,
      collectionsCreated: 0,
      filesUploaded: 0,
      filesDownloaded: 0,
      filesDeleted: 0,
      storageUsed: 0,
      userLogins: 0,
      userSignups: 0,
      userLogouts: 0,
      activeUsers: 0,
      totalErrors: 0,
      errorsByType: new Map(),
      avgResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: Infinity
    };

    let totalResponseTime = 0;
    let responseTimeCount = 0;
    const uniqueUsers = new Set();

    events.forEach(event => {
      this._processSingleEventMetrics(event, metrics, uniqueUsers);
      
      if (event.metadata?.responseTime) {
        totalResponseTime += event.metadata.responseTime;
        responseTimeCount++;
      }
    });

    metrics.activeUsers = uniqueUsers.size;
    if (responseTimeCount > 0) {
      metrics.avgResponseTime = totalResponseTime / responseTimeCount;
    }
    if (metrics.minResponseTime === Infinity) {
      metrics.minResponseTime = 0;
    }

    return metrics;
  }

  _processSingleEventMetrics(event, metrics, uniqueUsers) {
    // API metrics
    if (event.eventType.startsWith('api.')) {
      metrics.totalApiCalls++;
      const endpoint = event.metadata?.endpoint || 'unknown';
      metrics.apiCallsByEndpoint.set(
        endpoint,
        (metrics.apiCallsByEndpoint.get(endpoint) || 0) + 1
      );

      if (event.metadata?.responseTime) {
        metrics.maxResponseTime = Math.max(metrics.maxResponseTime, event.metadata.responseTime);
        metrics.minResponseTime = Math.min(metrics.minResponseTime, event.metadata.responseTime);
      }

      if (event.metadata?.statusCode >= 400) {
        metrics.totalErrors++;
        const errorType = `${event.metadata.statusCode}`;
        metrics.errorsByType.set(
          errorType,
          (metrics.errorsByType.get(errorType) || 0) + 1
        );
      }
    }

    // Database metrics
    if (event.eventType === 'database.document.created') metrics.documentsCreated++;
    if (event.eventType === 'database.document.updated') metrics.documentsUpdated++;
    if (event.eventType === 'database.document.deleted') metrics.documentsDeleted++;
    if (event.eventType === 'database.document.read') metrics.documentsRead++;
    if (event.eventType === 'database.collection.created') metrics.collectionsCreated++;

    // Storage metrics
    if (event.eventType === 'storage.file.uploaded') {
      metrics.filesUploaded++;
      metrics.storageUsed += event.data?.fileSize || 0;
    }
    if (event.eventType === 'storage.file.downloaded') metrics.filesDownloaded++;
    if (event.eventType === 'storage.file.deleted') {
      metrics.filesDeleted++;
      metrics.storageUsed -= event.data?.fileSize || 0;
    }

    // Auth metrics
    if (event.eventType === 'auth.user.login') metrics.userLogins++;
    if (event.eventType === 'auth.user.signup') metrics.userSignups++;
    if (event.eventType === 'auth.user.logout') metrics.userLogouts++;

    if (event.userId) uniqueUsers.add(event.userId);
  }
}

module.exports = new AnalyticsService();
