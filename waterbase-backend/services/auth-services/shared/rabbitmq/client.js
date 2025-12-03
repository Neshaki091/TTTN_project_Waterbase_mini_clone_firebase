const amqp = require('amqplib');

class RabbitMQClient {
    constructor(url) {
        this.url = url || process.env.RABBITMQ_URL || 'amqp://waterbase:waterbase123@localhost:5672';
        this.connection = null;
        this.channel = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            this.connection = await amqp.connect(this.url);
            this.channel = await this.connection.createChannel();
            this.isConnected = true;

            // Declare main exchange for all events
            await this.channel.assertExchange('waterbase.events', 'topic', { durable: true });

            console.log('✅ RabbitMQ connected successfully');

            // Handle connection errors
            this.connection.on('error', (err) => {
                console.error('❌ RabbitMQ connection error:', err);
                this.isConnected = false;
            });

            this.connection.on('close', () => {
                console.log('⚠️ RabbitMQ connection closed');
                this.isConnected = false;
                // Auto-reconnect after 5 seconds
                setTimeout(() => this.connect(), 5000);
            });

            return this.channel;
        } catch (error) {
            console.error('❌ Failed to connect to RabbitMQ:', error);
            this.isConnected = false;
            // Retry connection after 5 seconds
            setTimeout(() => this.connect(), 5000);
            throw error;
        }
    }

    async publishEvent(eventType, data) {
        if (!this.isConnected || !this.channel) {
            console.warn('⚠️ RabbitMQ not connected, event not published:', eventType);
            return false;
        }

        try {
            const message = {
                eventType,
                data,
                timestamp: new Date().toISOString(),
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            };

            const published = this.channel.publish(
                'waterbase.events',
                eventType,
                Buffer.from(JSON.stringify(message)),
                { persistent: true }
            );

            if (published) {
                console.log(`📤 Event published: ${eventType}`);
            }

            return published;
        } catch (error) {
            console.error('❌ Failed to publish event:', error);
            return false;
        }
    }

    async subscribe(queue, routingKeys, callback) {
        if (!this.isConnected || !this.channel) {
            throw new Error('RabbitMQ not connected');
        }

        try {
            // Assert queue
            await this.channel.assertQueue(queue, { durable: true });

            // Bind queue to exchange with routing keys
            for (const routingKey of routingKeys) {
                await this.channel.bindQueue(queue, 'waterbase.events', routingKey);
            }

            // Consume messages
            await this.channel.consume(queue, async (msg) => {
                if (msg) {
                    try {
                        const content = JSON.parse(msg.content.toString());
                        await callback(content);
                        this.channel.ack(msg);
                    } catch (error) {
                        console.error('❌ Error processing message:', error);
                        // Reject and requeue
                        this.channel.nack(msg, false, true);
                    }
                }
            });

            console.log(`✅ Subscribed to queue: ${queue}`);
        } catch (error) {
            console.error('❌ Failed to subscribe:', error);
            throw error;
        }
    }

    async close() {
        try {
            if (this.channel) await this.channel.close();
            if (this.connection) await this.connection.close();
            this.isConnected = false;
            console.log('✅ RabbitMQ connection closed');
        } catch (error) {
            console.error('❌ Error closing RabbitMQ:', error);
        }
    }

    async sendRPC(routingKey, data, timeout = 10000) {
        if (!this.isConnected || !this.channel) throw new Error('RabbitMQ not connected');

        const correlationId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const replyQueue = await this.channel.assertQueue('', { exclusive: true });

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.channel.deleteQueue(replyQueue.queue).catch(() => { });
                reject(new Error('RPC timeout'));
            }, timeout);

            this.channel.consume(replyQueue.queue, (msg) => {
                if (msg && msg.properties.correlationId === correlationId) {
                    clearTimeout(timer);
                    const content = JSON.parse(msg.content.toString());
                    resolve(content);
                    this.channel.deleteQueue(replyQueue.queue).catch(() => { });
                }
            }, { noAck: true });

            this.channel.publish(
                'waterbase.events',
                routingKey,
                Buffer.from(JSON.stringify(data)),
                {
                    correlationId,
                    replyTo: replyQueue.queue
                }
            );
        });
    }

    async respondRPC(routingKey, callback) {
        if (!this.isConnected || !this.channel) throw new Error('RabbitMQ not connected');

        const queue = `rpc.${routingKey}`;
        await this.channel.assertQueue(queue, { durable: false });
        await this.channel.bindQueue(queue, 'waterbase.events', routingKey);

        this.channel.consume(queue, async (msg) => {
            if (msg) {
                try {
                    const content = JSON.parse(msg.content.toString());
                    const response = await callback(content);

                    this.channel.sendToQueue(
                        msg.properties.replyTo,
                        Buffer.from(JSON.stringify(response)),
                        { correlationId: msg.properties.correlationId }
                    );
                    this.channel.ack(msg);
                } catch (error) {
                    console.error('❌ Error processing RPC:', error);
                    // Optionally send error response
                    this.channel.nack(msg, false, false); // Requeue? Or discard?
                }
            }
        });
        console.log(`✅ RPC Responder listening on: ${routingKey}`);
    }
}

// Singleton instance
let instance = null;

module.exports = {
    RabbitMQClient,
    getInstance: (url) => {
        if (!instance) {
            instance = new RabbitMQClient(url);
        }
        return instance;
    }
};
