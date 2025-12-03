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
app.use('/', require('./src/routes/storage.routes'));

// Connect to MongoDB (Required for Auth Middleware)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/waterbase';
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB connected for Storage Service'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'storage' });
});

// RabbitMQ Setup
const { getInstance } = require('./shared/rabbitmq/client');
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://waterbase:waterbase123@rabbitmq:5672';
const rabbitMQ = getInstance(RABBITMQ_URL);

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

async function startServer() {
    try {
        await rabbitMQ.connect();
        console.log('✅ RabbitMQ connected');

        // Setup RPC Handler for Stats
        await rabbitMQ.respondRPC('storage.stats.request', async (data) => {
            console.log('📥 Received stats request via RPC for appIds:', data.appIds);
            try {
                const { appIds } = data;

                if (!appIds || !Array.isArray(appIds) || appIds.length === 0) {
                    console.log('⚠️ No appIds provided, returning empty stats');
                    return {};
                }

                // Get stats for each app
                const statsPromises = appIds.map(async (appId) => {
                    try {
                        const appStoragePath = path.join(STORAGE_PATH, appId);
                        const { size, count } = await getDirectorySize(appStoragePath);

                        return {
                            appId,
                            totalFiles: count,
                            totalSize: size
                        };
                    } catch (err) {
                        console.error(`Error fetching storage stats for app ${appId}:`, err);
                        return {
                            appId,
                            totalFiles: 0,
                            totalSize: 0
                        };
                    }
                });

                const statsArray = await Promise.all(statsPromises);

                // Convert array to object with appId as keys
                const statsObject = {};
                statsArray.forEach(stat => {
                    statsObject[stat.appId] = {
                        totalFiles: stat.totalFiles,
                        totalSize: stat.totalSize
                    };
                });

                console.log(`✅ Returning storage stats for ${appIds.length} apps`);
                return statsObject;
            } catch (err) {
                console.error('❌ Error fetching storage stats:', err);
                return {};
            }
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
