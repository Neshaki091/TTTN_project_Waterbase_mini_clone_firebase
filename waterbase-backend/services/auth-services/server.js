const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const connectDB = require('./util/connectdb');
dotenv.config();
const verifyRoutes = require('./routes/verify.routes');
const ownerRoutes = require('./routes/owner.routes');
const userRoutes = require('./routes/user.routes');

const app = express();
const PORT = process.env.PORT || 3000;


app.use(express.json());
app.use(cookieParser());  // ✅ Enable cookie parsing
connectDB();

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'auth' });
});

app.use('/verify', verifyRoutes);
app.use('/owners', ownerRoutes);
app.use('/users', userRoutes);

const { getInstance } = require('./shared/rabbitmq/client');
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://waterbase:waterbase123@rabbitmq:5672';
const rabbitMQ = getInstance(RABBITMQ_URL);

async function startServer() {
    // Start HTTP server first
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Auth service is running on port ${PORT}`);
    });

    // Connect to RabbitMQ with retry logic
    let retries = 0;
    const maxRetries = 10;
    const retryDelay = 3000; // 3 seconds

    while (retries < maxRetries) {
        try {
            await rabbitMQ.connect();
            console.log('✅ RabbitMQ connected successfully');

            // Setup RPC Handler for Stats
            const rpcService = require('./src/services/rpc.service');
            await rabbitMQ.respondRPC('auth.stats.request', async (data) => {
                console.log('📥 Received stats request via RPC');
                return await rpcService.getAuthStats();
            });

            break; // Success, exit retry loop
        } catch (error) {
            retries++;
            console.error(`❌ Failed to connect to RabbitMQ (attempt ${retries}/${maxRetries}):`, error.message);

            if (retries >= maxRetries) {
                console.error('⚠️ Max retries reached. Server running without RabbitMQ connection.');
                break;
            }

            console.log(`⏳ Retrying in ${retryDelay / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }
}

startServer();