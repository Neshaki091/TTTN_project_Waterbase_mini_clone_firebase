const Event = require('../models/event.model');
const Analytics = require('../models/analytics.model');

class AggregationWorker {
    constructor() {
        this.isRunning = false;
    }

    async start() {
        console.log('✅ Aggregation Worker started');

        // Run hourly aggregation every hour
        setInterval(() => this.aggregateHourly(), 60 * 60 * 1000);

        // Run daily aggregation every day at midnight
        this.scheduleDailyAggregation();

        // Run initial aggregation
        setTimeout(() => this.aggregateHourly(), 5000);
    }

    scheduleDailyAggregation() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const timeUntilMidnight = tomorrow - now;

        setTimeout(() => {
            this.aggregateDaily();
            // Schedule next day
            setInterval(() => this.aggregateDaily(), 24 * 60 * 60 * 1000);
        }, timeUntilMidnight);
    }

    async aggregateHourly() {
        if (this.isRunning) return;

        try {
            this.isRunning = true;
            console.log('🔄 Running hourly aggregation...');

            const now = new Date();
            const hourStart = new Date(now);
            hourStart.setMinutes(0, 0, 0);
            hourStart.setHours(hourStart.getHours() - 1);

            const hourEnd = new Date(hourStart);
            hourEnd.setHours(hourEnd.getHours() + 1);

            await this.aggregate('hourly', hourStart, hourEnd);

            console.log('✅ Hourly aggregation completed');
        } catch (error) {
            console.error('❌ Hourly aggregation failed:', error);
        } finally {
            this.isRunning = false;
        }
    }

    async aggregateDaily() {
        try {
            console.log('🔄 Running daily aggregation...');

            const now = new Date();
            const dayStart = new Date(now);
            dayStart.setHours(0, 0, 0, 0);
            dayStart.setDate(dayStart.getDate() - 1);

            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);

            await this.aggregate('daily', dayStart, dayEnd);

            console.log('✅ Daily aggregation completed');
        } catch (error) {
            console.error('❌ Daily aggregation failed:', error);
        }
    }

    async aggregate(period, periodStart, periodEnd) {
        // Get all events in this period
        const events = await Event.find({
            timestamp: { $gte: periodStart, $lt: periodEnd },
            processed: false
        });

        if (events.length === 0) {
            console.log(`No new events to aggregate for ${period}`);
            return;
        }

        // Group by ownerId and appId
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

        // Aggregate each group
        for (const [key, group] of Object.entries(groups)) {
            await this.aggregateGroup(period, periodStart, periodEnd, group);
        }

        // Mark events as processed
        const eventIds = events.map(e => e._id);
        await Event.updateMany(
            { _id: { $in: eventIds } },
            { $set: { processed: true } }
        );
    }

    async aggregateGroup(period, periodStart, periodEnd, group) {
        const { ownerId, appId, events } = group;

        // Calculate metrics
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
            // API metrics
            if (event.eventType.startsWith('api.')) {
                metrics.totalApiCalls++;
                const endpoint = event.metadata?.endpoint || 'unknown';
                metrics.apiCallsByEndpoint.set(
                    endpoint,
                    (metrics.apiCallsByEndpoint.get(endpoint) || 0) + 1
                );

                // Response time
                if (event.metadata?.responseTime) {
                    totalResponseTime += event.metadata.responseTime;
                    responseTimeCount++;
                    metrics.maxResponseTime = Math.max(metrics.maxResponseTime, event.metadata.responseTime);
                    metrics.minResponseTime = Math.min(metrics.minResponseTime, event.metadata.responseTime);
                }

                // Errors
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
        });

        metrics.activeUsers = uniqueUsers.size;
        if (responseTimeCount > 0) {
            metrics.avgResponseTime = totalResponseTime / responseTimeCount;
        }
        if (metrics.minResponseTime === Infinity) {
            metrics.minResponseTime = 0;
        }

        // Upsert analytics document
        await Analytics.findOneAndUpdate(
            { ownerId, appId, period, periodStart },
            {
                ownerId,
                appId,
                period,
                periodStart,
                periodEnd,
                metrics
            },
            { upsert: true, new: true }
        );

        console.log(`📊 Aggregated ${events.length} events for ${ownerId}/${appId || 'all'}`);
    }
}

module.exports = AggregationWorker;
