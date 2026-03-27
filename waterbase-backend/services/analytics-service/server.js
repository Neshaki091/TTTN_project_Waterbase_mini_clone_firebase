const express = require('express');
const mongoose = require('mongoose');

const EventCollector = require('./workers/event.worker');
const AggregationWorker = require('./workers/aggregation.worker');
const analyticsRoutes = require('./routes/analytics.routes');

const app = express();
const PORT = process.env.PORT || 3006;

// Middleware
app.use(express.json());
app.use(require('cors')());

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'analytics-service',
        timestamp: new Date().toISOString()
    });
});

// Routes
app.use('/analytics', analyticsRoutes);

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/analytics';

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => {
        console.log('✅ Connected to MongoDB (Analytics)');

        // Start workers
        startWorkers();
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

// Start workers
let eventCollector;
let aggregationWorker;

async function startWorkers() {
    try {
        // Start Event Collector
        eventCollector = new EventCollector();
        await eventCollector.start();

        // Start Aggregation Worker
        aggregationWorker = new AggregationWorker();
        await aggregationWorker.start();

        console.log('✅ All workers started');
    } catch (error) {
        console.error('❌ Failed to start workers:', error);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');

    if (eventCollector) await eventCollector.stop();
    if (aggregationWorker) await aggregationWorker.stop();

    await mongoose.connection.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');

    if (eventCollector) await eventCollector.stop();
    if (aggregationWorker) await aggregationWorker.stop();

    await mongoose.connection.close();
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Analytics Service running on port ${PORT}`);
});

module.exports = app;
