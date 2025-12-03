const { getInstance } = require('../shared/rabbitmq/client');
const Event = require('../models/event.model');

class EventCollector {
    constructor() {
        this.rabbitmq = null;
    }

    async start() {
        try {
            // Get RabbitMQ instance
            this.rabbitmq = getInstance();
            await this.rabbitmq.connect();

            // Subscribe to all waterbase events
            await this.rabbitmq.subscribe(
                'analytics.events',
                ['auth.*', 'database.*', 'storage.*', 'rule.*', 'api.*'],
                this.handleEvent.bind(this)
            );

            console.log('✅ Event Collector started');
        } catch (error) {
            console.error('❌ Failed to start Event Collector:', error);
            // Retry after 10 seconds
            setTimeout(() => this.start(), 10000);
        }
    }

    async handleEvent(message) {
        try {
            const { eventType, data, timestamp } = message;

            // Extract common fields
            const eventData = {
                eventType,
                appId: data.appId,
                ownerId: data.ownerId,
                userId: data.userId,
                data: data.payload || data,
                metadata: data.metadata || {},
                timestamp: new Date(timestamp)
            };

            // Save event to database
            const event = new Event(eventData);
            await event.save();

            console.log(`📥 Event saved: ${eventType}`);
        } catch (error) {
            console.error('❌ Error handling event:', error);
            throw error; // Will trigger nack and requeue
        }
    }

    async stop() {
        if (this.rabbitmq) {
            await this.rabbitmq.close();
        }
    }
}

module.exports = EventCollector;
