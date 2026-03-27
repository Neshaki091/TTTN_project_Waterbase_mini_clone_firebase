const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const appRoutes = require('./routes/app.routes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Public health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'app-service' });
});

// Connect MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/waterbase';
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error', err));

// Routes
app.use('/', appRoutes);

const { getRabbit } = require('./shared/rabbitmq/client');
const appController = require('./src/app.controller');
const usageSubscriber = require('./src/subscribers/usage.subscriber');
const usageManager = require('./src/services/usage.manager');

// Initialize RabbitMQ
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://waterbase:waterbase123@rabbitmq:5672';
const rabbitMQ = getRabbit(RABBITMQ_URL);

async function startServer() {
    try {
        await rabbitMQ.connect();

        // Initialize Usage Subscriber
        await usageSubscriber.init();

        // Setup RPC Handler for Stats
        await rabbitMQ.respondRPC('app.stats.request', async (data) => {
            console.log('📥 Received stats request via RPC');
            return await appController.getAllAppsWithStatsRPC();
        });

        // Setup RPC Handler for Quota Check
        await rabbitMQ.respondRPC('quota.check', async ({ appId }) => {
            console.log(`📥 Received quota check request for ${appId}`);
            const app = await usageManager.getUsage(appId);
            if (!app) return { error: 'App not found' };
            
            return {
                status: app.status,
                usage: app.QuotaManager,
                limit: 100 * 1024 * 1024 // 100MB default limit, can fetch from config later
            };
        });

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`App service is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
    }
}

startServer();

module.exports = app;



