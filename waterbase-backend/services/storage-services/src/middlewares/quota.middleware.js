const { getRabbit } = require('../../shared/rabbitmq/client');

exports.checkQuota = async (req, res, next) => {
    try {
        const { appId } = req;

        if (!appId) {
            return res.status(400).json({ message: 'App ID required' });
        }

        const rabbitMQ = getRabbit();
        if (!rabbitMQ.isConnected) {
            console.warn('[QuotaMiddleware-Storage] RabbitMQ not connected, skipping quota check.');
            return next();
        }

        // Get current storage usage via RPC from App Service
        const quotaInfo = await rabbitMQ.sendRPC('quota.check', { appId });

        if (quotaInfo.error) {
            console.warn(`[QuotaMiddleware-Storage] Error checking quota for ${appId}:`, quotaInfo.error);
            return next();
        }

        const { usage, limit, status } = quotaInfo;

        // Check app status
        if (status === 'suspended') {
            return res.status(403).json({ message: 'Application is suspended.' });
        }

        // Calculate total storage usage
        const usedBytes = usage.storage?.storageSize || 0;

        // Check if quota exceeded
        if (usedBytes >= limit) {
            return res.status(413).json({
                message: 'Storage quota exceeded',
                quota: limit,
                used: usedBytes,
                limit: (limit / (1024 * 1024)) + 'MB'
            });
        }

        // Note: For file upload, the actual file size is in req.file.size 
        // but this middleware might run BEFORE multer if not placed correctly.
        // We will do a general check here, and the controller can also check if needed.

        next();
    } catch (error) {
        console.error('Quota check error (Storage):', error);
        next();
    }
};
