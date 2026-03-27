const analyticsService = require('../services/analytics.service');

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

            await analyticsService.aggregatePeriod('hourly', hourStart, hourEnd);

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

            await analyticsService.aggregatePeriod('daily', dayStart, dayEnd);

            console.log('✅ Daily aggregation completed');
        } catch (error) {
            console.error('❌ Daily aggregation failed:', error);
        }
    }
}

module.exports = AggregationWorker;
