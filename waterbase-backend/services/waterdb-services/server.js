const express = require('express');
const mongoose = require('mongoose');

const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/waterdb';
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB connected for WaterDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'waterdb' });
});

// RabbitMQ Setup
const { getInstance } = require('./shared/rabbitmq/client');
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://waterbase:waterbase123@rabbitmq:5672';
const rabbitMQ = getInstance(RABBITMQ_URL);

// Import models
const Document = require('./src/models/dynamicDocument.model');

// Mount routes
app.use('/', require('./src/routes/waterdb.routes'));

async function startServer() {
    try {
        await rabbitMQ.connect();
        console.log('✅ RabbitMQ connected');

        // Setup RPC Handler for Stats
        await rabbitMQ.respondRPC('waterdb.stats.request', async (data) => {
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
                        const totalDocuments = await Document.countDocuments({ appId });
                        const collections = await Document.distinct('collection', { appId });
                        const totalCollections = collections.length;

                        // Calculate storage size
                        const documents = await Document.find({ appId }).lean();
                        let totalSize = 0;
                        for (const doc of documents) {
                            const jsonSize = JSON.stringify(doc).length;
                            totalSize += jsonSize;
                        }

                        return {
                            appId,
                            totalDocuments,
                            totalCollections,
                            sizeBytes: totalSize
                        };
                    } catch (err) {
                        console.error(`Error fetching stats for app ${appId}:`, err);
                        return {
                            appId,
                            totalDocuments: 0,
                            totalCollections: 0,
                            sizeBytes: 0
                        };
                    }
                });

                const statsArray = await Promise.all(statsPromises);

                // Convert array to object with appId as keys
                const statsObject = {};
                statsArray.forEach(stat => {
                    statsObject[stat.appId] = {
                        totalDocuments: stat.totalDocuments,
                        totalCollections: stat.totalCollections,
                        sizeBytes: stat.sizeBytes
                    };
                });

                console.log(`✅ Returning stats for ${appIds.length} apps`);
                return statsObject;
            } catch (err) {
                console.error('❌ Error fetching WaterDB stats:', err);
                return {};
            }
        });

        console.log('✅ RPC Responder listening on: waterdb.stats.request');

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 WaterDB service running on port ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
    }
}

startServer();

module.exports = app;
