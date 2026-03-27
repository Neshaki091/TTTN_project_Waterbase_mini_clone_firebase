const { getRabbit } = require('../../shared/rabbitmq/client');

exports.checkQuota = async (req, res, next) => {
    try {
        const { appId } = req;

        if (!appId) {
            return res.status(400).json({ message: 'App ID required' });
        }

        const rabbitMQ = getRabbit();
        if (!rabbitMQ.isConnected) {
            // If messaging is down, we allow the request for better UX, 
            // but log a warning. Quota will be eventually consistent.
            console.warn('[QuotaMiddleware] RabbitMQ not connected, skipping quota check.');
            return next();
        }

        // Get current storage usage via RPC from App Service
        const quotaInfo = await rabbitMQ.sendRPC('quota.check', { appId });

        if (quotaInfo.error) {
            console.warn(`[QuotaMiddleware] Error checking quota for ${appId}:`, quotaInfo.error);
            return next();
        }

        const { usage, limit, status } = quotaInfo;

        // Check app status
        if (status === 'suspended') {
            return res.status(403).json({ message: 'Application is suspended due to quota or billing issues.' });
        }

        // Calculate total database usage
        const usedBytes = (usage.waterdb?.storageSize || 0) + (usage.rtwaterdb?.storageSize || 0);

        // Check if quota exceeded
        if (usedBytes >= limit) {
            return res.status(413).json({
                message: 'Storage quota exceeded',
                quota: limit,
                used: usedBytes,
                limit: (limit / (1024 * 1024)) + 'MB'
            });
        }

        // Estimate size of incoming document
        const estimatedSize = JSON.stringify(req.body).length + 200;

        if (usedBytes + estimatedSize > limit) {
            return res.status(413).json({
                message: 'Storage quota would be exceeded by this operation',
                quota: limit,
                used: usedBytes,
                estimated: estimatedSize,
                limit: (limit / (1024 * 1024)) + 'MB'
            });
        }

        next();
    } catch (error) {
        console.error('Quota check error:', error);
        next();
    }
};
