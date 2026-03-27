const { getInstance } = require('../shared/rabbitmq/client');
const analyticsService = require('../services/analytics.service');

class EventCollector {
    constructor() {
        this.rabbitmq = null;
    }

    async start() {
        try {
            this.rabbitmq = getInstance();
            await this.rabbitmq.connect();

            await this.rabbitmq.subscribe(
                'analytics.events',
                ['auth.*', 'database.*', 'storage.*', 'rule.*', 'api.*'],
                this.handleEvent.bind(this)
            );

            console.log('✅ Event Collector started');
        } catch (error) {
            console.error('❌ Failed to start Event Collector:', error);
            setTimeout(() => this.start(), 10000);
        }
    }

    async handleEvent(message) {
        try {
            await analyticsService.processEvent(message);
            console.log(`📥 Event processed: ${message.eventType}`);
        } catch (error) {
            console.error('❌ Error handling event:', error);
            throw error;
        }
    }

    async stop() {
        if (this.rabbitmq) {
            await this.rabbitmq.close();
        }
    }
}

module.exports = EventCollector;
