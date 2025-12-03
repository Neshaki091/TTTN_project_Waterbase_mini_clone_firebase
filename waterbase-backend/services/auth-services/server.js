const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./util/connectdb');
dotenv.config();
const verifyRoutes = require('./routes/verify.routes');
const ownerRoutes = require('./routes/owner.routes');
const userRoutes = require('./routes/user.routes');

const app = express();
const PORT = process.env.PORT || 3000;


app.use(express.json());
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
            await rabbitMQ.respondRPC('auth.stats.request', async (data) => {
                console.log('📥 Received stats request via RPC');
                try {
                    const OwnerSchema = require('./src/models/owner.model');
                    const UserSchema = require('./src/models/user.model');

                    const totalOwners = await OwnerSchema.countDocuments({ role: 'owner' });
                    const totalUsers = await UserSchema.countDocuments();

                    // Get all apps from all owners
                    const owners = await OwnerSchema.find({ role: 'owner' }, 'apps');
                    const allAppIds = [];
                    let totalApps = 0;

                    owners.forEach(owner => {
                        if (owner.apps && Array.isArray(owner.apps)) {
                            owner.apps.forEach(app => {
                                if (app.appId) {
                                    allAppIds.push(app.appId);
                                    totalApps++;
                                }
                            });
                        }
                    });

                    return {
                        totalOwners,
                        totalUsers,
                        totalApps,
                        allAppIds
                    };
                } catch (err) {
                    console.error('Error fetching auth stats:', err);
                    return { totalOwners: 0, totalUsers: 0, totalApps: 0, allAppIds: [] };
                }
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