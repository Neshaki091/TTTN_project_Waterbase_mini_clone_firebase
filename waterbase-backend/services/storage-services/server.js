const express = require('express');
const dotenv = require('dotenv');
const fs = require('fs').promises;
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;
const STORAGE_PATH = process.env.STORAGE_PATH || './storage';
const mongoose = require('mongoose');

app.use(express.json());

// Public health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'storage-service' });
});

app.use('/', require('./src/routes/storage.routes'));

// Connect to MongoDB (Required for Auth Middleware)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/waterbase';
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB connected for Storage Service'))
    .catch(err => console.error('❌ MongoDB connection error:', err));


// RabbitMQ Setup
const { getRabbit } = require('./shared/rabbitmq/client');
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://waterbase:waterbase123@rabbitmq:5672';
const rabbitMQ = getRabbit(RABBITMQ_URL);

// Helper function to get directory size
async function getDirectorySize(dirPath) {
    try {
        const files = await fs.readdir(dirPath, { withFileTypes: true });
        let totalSize = 0;
        let fileCount = 0;

        for (const file of files) {
            const filePath = path.join(dirPath, file.name);
            if (file.isDirectory()) {
                const subDirStats = await getDirectorySize(filePath);
                totalSize += subDirStats.size;
                fileCount += subDirStats.count;
            } else {
                const stats = await fs.stat(filePath);
                totalSize += stats.size;
                fileCount++;
            }
        }

        return { size: totalSize, count: fileCount };
    } catch (err) {
        if (err.code === 'ENOENT') {
            return { size: 0, count: 0 };
        }
        throw err;
    }
}

const storageService = require('./src/services/storage.service');

async function startServer() {
    try {
        await rabbitMQ.connect();
        console.log('✅ RabbitMQ connected');

        // Setup RPC Handler for Stats
        await rabbitMQ.respondRPC('storage.stats.request', async (data) => {
            console.log('📥 Received stats request via RPC for appIds:', data.appIds);
            return storageService.getMultipleStatsRPC(data.appIds);
        });

        console.log('✅ RPC Responder listening on: storage.stats.request');

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Storage service running on port ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
    }
}

startServer();

module.exports = app;
