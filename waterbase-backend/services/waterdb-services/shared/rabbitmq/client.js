const amqp = require("amqplib");

class RabbitMQClient {
    constructor(url) {
        this.url = url || process.env.RABBITMQ_URL;
        this.connection = null;
        this.channel = null;
        this.isConnected = false;
        this.isConnecting = false;
        this.reconnectDelay = 1000;
        this.maxReconnectDelay = 30000;
        this.exchange = "waterbase.events";
        this._readyPromise = null;
        this._resolveReady = null;

        this._initReadyPromise();
    }

    _initReadyPromise() {
        this._readyPromise = new Promise((resolve) => {
            this._resolveReady = resolve;
        });
    }

    async connect() {
        if (this.isConnected || this.isConnecting) return this._readyPromise;
        this.isConnecting = true;

        try {
            console.log(`🔌 Connecting to RabbitMQ at ${this.url || 'default-url'}...`);
            this.connection = await amqp.connect(this.url || "amqp://waterbase:waterbase123@localhost:5672");
            this.channel = await this.connection.createConfirmChannel();

            await this.channel.prefetch(10);
            await this.channel.assertExchange(this.exchange, "topic", { durable: true });

            this.isConnected = true;
            this.isConnecting = false;
            this.reconnectDelay = 1000; // Reset delay on success
            
            this._resolveReady(true);
            console.log("✅ RabbitMQ Connected");

            this.connection.on("close", () => {
                console.log("⚠️ RabbitMQ connection closed");
                this._handleDisconnect();
            });

            this.connection.on("error", (err) => {
                console.error("❌ RabbitMQ error:", err);
                this._handleDisconnect();
            });

        } catch (err) {
            this.isConnecting = false;
            console.error(`❌ RabbitMQ connection failed (${this.url}):`, err.message);
            this.reconnect();
        }
        return this._readyPromise;
    }

    _handleDisconnect() {
        this.isConnected = false;
        this.channel = null;
        this._initReadyPromise(); // Reset promise for next connection
        this.reconnect();
    }

    reconnect() {
        if (this.isConnecting) return;
        
        console.log(`🔄 Reconnecting RabbitMQ in ${this.reconnectDelay / 1000}s`);
        setTimeout(() => {
            this.connect();
        }, this.reconnectDelay);

        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
    }

    async waitReady() {
        if (this.isConnected) return true;
        return this._readyPromise;
    }

    async publish(eventType, data) {
        await this.waitReady();
        
        const message = {
            id: Date.now() + "-" + Math.random(),
            eventType,
            data,
            timestamp: Date.now()
        };

        return new Promise((resolve, reject) => {
            this.channel.publish(
                this.exchange,
                eventType,
                Buffer.from(JSON.stringify(message)),
                { persistent: true },
                (err) => {
                    if (err) {
                        console.error("Publish error", err);
                        return reject(err);
                    }
                    resolve(true);
                }
            );
        });
    }

    async subscribe(queueName, routingKeys, handler) {
        await this.waitReady();

        await this.channel.assertQueue(queueName, {
            durable: true,
            arguments: { "x-dead-letter-exchange": "waterbase.dlx" }
        });

        for (const key of routingKeys) {
            await this.channel.bindQueue(queueName, this.exchange, key);
        }

        this.channel.consume(queueName, async (msg) => {
            if (!msg) return;

            try {
                const data = JSON.parse(msg.content.toString());
                await handler(data);
                this.channel.ack(msg);
            } catch (err) {
                const retry = msg.properties.headers?.retry || 0;
                if (retry < 3) {
                    console.log("Retry message", retry + 1);
                    this.channel.publish(
                        this.exchange,
                        msg.fields.routingKey,
                        msg.content,
                        {
                            headers: { retry: retry + 1 },
                            persistent: true
                        }
                    );
                    this.channel.ack(msg);
                } else {
                    console.error("❌ Message failed permanently");
                    this.channel.nack(msg, false, false);
                }
            }
        });

        console.log("📡 Subscribed:", queueName);
    }

    async sendRPC(routingKey, payload, timeout = 10000) {
        await this.waitReady();

        const correlationId = Date.now() + "-" + Math.random();
        const replyQueue = await this.channel.assertQueue("", { exclusive: true });

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error("RPC timeout"));
            }, timeout);

            this.channel.consume(replyQueue.queue, (msg) => {
                if (msg.properties.correlationId === correlationId) {
                    clearTimeout(timer);
                    resolve(JSON.parse(msg.content.toString()));
                }
            }, { noAck: true });

            this.channel.publish(
                this.exchange,
                routingKey,
                Buffer.from(JSON.stringify(payload)),
                { correlationId, replyTo: replyQueue.queue }
            );
        });
    }

    async respondRPC(routingKey, handler) {
        await this.waitReady();

        const queue = "rpc." + routingKey;
        await this.channel.assertQueue(queue, { durable: false });
        await this.channel.bindQueue(queue, this.exchange, routingKey);

        this.channel.consume(queue, async (msg) => {
            try {
                const data = JSON.parse(msg.content.toString());
                const result = await handler(data);

                this.channel.sendToQueue(
                    msg.properties.replyTo,
                    Buffer.from(JSON.stringify(result)),
                    { correlationId: msg.properties.correlationId }
                );
                this.channel.ack(msg);
            } catch (err) {
                console.error("RPC error", err);
                this.channel.nack(msg, false, false);
            }
        });

        console.log("⚡ RPC responder:", routingKey);
    }

    async close() {
        try {
            if (this.channel) await this.channel.close();
            if (this.connection) await this.connection.close();
            this.isConnected = false;
            console.log("RabbitMQ closed");
        } catch (err) {
            console.error("Close error", err);
        }
    }
}

let instance;

function getRabbit(url) {
    if (!instance) {
        instance = new RabbitMQClient(url);
    } else if (url && !instance.url) {
        // Update URL if it was previously undefined/default
        instance.url = url;
    }
    return instance;
}

module.exports = {
    RabbitMQClient,
    getRabbit,
    getInstance: getRabbit
};