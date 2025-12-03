const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const appRoutes = require('./routes/app.routes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/waterbase';
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error', err));

// Routes
app.use('/', appRoutes);

const { getInstance } = require('./shared/rabbitmq/client');
const appController = require('./src/app.controller');

// Initialize RabbitMQ
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://waterbase:waterbase123@rabbitmq:5672';
const rabbitMQ = getInstance(RABBITMQ_URL);

async function startServer() {
    try {
        await rabbitMQ.connect();

        // Setup RPC Handler for Stats
        await rabbitMQ.respondRPC('app.stats.request', async (data) => {
            console.log('📥 Received stats request via RPC');
            return await appController.getAllAppsWithStatsRPC();
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



