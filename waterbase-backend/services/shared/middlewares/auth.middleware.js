const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

/**
 * Helper: Lấy Model App từ database 'waterbase_app'
 */
const getAppModel = () => {
    const appDb = mongoose.connection.useDb('waterbase_app');

    if (appDb.models.App) {
        return appDb.model('App');
    }

    const AppSchema = new mongoose.Schema({
        appId: { type: String, index: true },
        apiKey: String,
        status: String,
        ownerId: { type: String, index: true }
    }, { collection: 'apps', strict: false });

    return appDb.model('App', AppSchema);
};

/**
 * App Verification Middleware
 */
exports.verifyApp = async (req, res, next) => {
    const appId = req.headers['x-app-id'];
    const apiKey = req.headers['x-api-key'];

    // console.log(`🔍 [VERIFY APP] Checking appId: ${appId}`);

    if (!appId) return res.status(400).json({ message: 'Missing x-app-id header' });

    try {
        const App = getAppModel(); 

        const app = await App.findOne({ appId, status: 'active' });

        if (!app) {
            console.warn(`⚠️ [VERIFY APP] App not found or inactive: ${appId}`);
            return res.status(404).json({ message: 'App not found or inactive' });
        }

        if (apiKey && app.apiKey !== apiKey) {
            console.warn(`⛔ [VERIFY APP] Invalid API Key for app: ${appId}`);
            return res.status(401).json({ message: 'Invalid API key' });
        }

        // 👇 SỬA TÊN BIẾN: Dùng req.targetApp để tránh trùng với req.app của Express
        req.targetApp = app;
        req.appId = appId;
        next();
    } catch (error) {
        console.error('❌ [VERIFY APP] Error:', error);
        res.status(500).json({ message: 'App verification failed', error: error.message });
    }
};

/**
 * Enhanced User Authentication Middleware
 */
exports.authenticateUser = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const appId = req.headers['x-app-id'] || req.headers['X-App-Id'];

    if (!appId) return res.status(400).json({ message: 'Missing x-app-id header' });

    // Mode 1: Guest/API Key Mode
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.appId = appId;
        req.user = { role: 'user', appId: appId };
        return next();
    }

    // Mode 2: Token Mode
    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        req.appId = appId;

        // 1. Super Admin
        if (['admin', 'waterbaseAdmin'].includes(decoded.role)) {
            return next();
        }

        // 2. Owner
        if (decoded.role === 'owner') {
            const ownerIdFromToken = decoded.id || decoded._id;

            // 👇 SỬA LOGIC: Check req.targetApp thay vì req.app
            if (req.targetApp) {
                // Lấy ownerId từ req.targetApp
                const appOwnerId = req.targetApp.ownerId || (req.targetApp.get && req.targetApp.get('ownerId'));
                
                if (!appOwnerId) {
                    console.error(`❌ [AUTH ERROR] App ${appId} missing ownerId field in DB.`);
                    return res.status(500).json({ message: 'App data corrupted: missing ownerId' });
                }
                
                if (appOwnerId.toString() !== ownerIdFromToken) {
                    return res.status(403).json({ message: 'Forbidden: You do not own this app' });
                }
                return next();
            }

            // Fallback: Query DB thủ công nếu verifyApp chưa chạy (req.targetApp undefined)
            // Vì req.app (của Express) luôn tồn tại, nên code cũ nhảy vào if sai chỗ này.
            // Giờ dùng req.targetApp là undefined, nó sẽ nhảy xuống đây -> ĐÚNG LOGIC.
            const App = getAppModel();
            const isOwner = await App.exists({ 
                appId: appId, 
                ownerId: ownerIdFromToken 
            });

            if (!isOwner) {
                console.warn(`⛔ [AUTH OWNER] Forbidden via DB check.`);
                return res.status(403).json({ message: 'Forbidden: You do not own this app' });
            }
            return next();
        }

        // 3. End-User
        if (decoded.appId && decoded.appId !== appId) {
            return res.status(403).json({
                message: 'Token does not belong to this app',
                tokenAppId: decoded.appId,
                requestedAppId: appId
            });
        }

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') return res.status(401).json({ message: 'Token expired' });
        res.status(401).json({ message: 'Authentication failed', error: error.message });
    }
};

exports.authenticateOwner = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ message: 'Missing token' });
    
    try {
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        if (!['owner', 'admin', 'waterbaseAdmin'].includes(decoded.role)) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Authentication failed' });
    }
};