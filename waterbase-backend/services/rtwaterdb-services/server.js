const express = require('express');
const http = require('http');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3005;
const INTERNAL_RPC_TOKEN = process.env.INTERNAL_RPC_TOKEN;

app.use(express.json());

require('./src/socket')(io);
app.use('/internal', require('./src/routes/internal.routes')(io, INTERNAL_RPC_TOKEN));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'rtwaterdb' });
});

const { getInstance } = require('./shared/rabbitmq/client');

// Initialize RabbitMQ
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://waterbase:waterbase123@rabbitmq:5672';
const rabbitMQ = getInstance(RABBITMQ_URL);

const mongoose = require('mongoose');

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/rtwaterdb';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected for RTWaterDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Mount REST routes
app.use('/', require('./src/routes/rtwaterdb.routes')(io));

async function startServer() {
  try {
    await rabbitMQ.connect();

    // Setup RPC Handler for Stats
    await rabbitMQ.respondRPC('rtwaterdb.stats.request', async (data) => {
      console.log('📥 Received stats request via RPC for appIds:', data.appIds);
      try {
        const { appIds } = data;

        if (!appIds || !Array.isArray(appIds) || appIds.length === 0) {
          console.log('⚠️ No appIds provided, returning empty stats');
          return {};
        }

        // Import the service to get actual storage stats
        const rtwaterdbService = require('./src/services/rtwaterdb.service');

        const statsObject = {};

        // Calculate actual storage for each app
        for (const appId of appIds) {
          try {
            const stats = await rtwaterdbService.getStats(appId);
            statsObject[appId] = {
              totalCollections: stats.totalCollections || 0,
              totalDocuments: stats.totalDocuments || 0,
              sizeBytes: stats.usedBytes || 0
            };
          } catch (err) {
            console.error(`Error getting stats for app ${appId}:`, err);
            statsObject[appId] = {
              totalCollections: 0,
              totalDocuments: 0,
              sizeBytes: 0
            };
          }
        }

        console.log(`✅ Returning realtime stats for ${appIds.length} apps:`, statsObject);
        return statsObject;
      } catch (err) {
        console.error('❌ Error fetching realtime stats:', err);
        return {};
      }
    });

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`RTWaterDB service listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
}

startServer();

