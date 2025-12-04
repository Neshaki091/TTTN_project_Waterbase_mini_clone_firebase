const waterdbService = require('../services/waterdb.service');

const QUOTA_LIMIT = 100 * 1024 * 1024; // 100MB in bytes

exports.checkQuota = async (req, res, next) => {
    try {
        const { appId } = req;

        if (!appId) {
            return res.status(400).json({ message: 'App ID required' });
        }

        // Get current storage usage
        const { usedBytes } = await waterdbService.getStorageUsage(appId);

        // Check if quota exceeded
        if (usedBytes >= QUOTA_LIMIT) {
            return res.status(413).json({
                message: 'Storage quota exceeded',
                quota: QUOTA_LIMIT,
                used: usedBytes,
                limit: '100MB'
            });
        }

        // Estimate size of incoming document (rough approximation)
        const estimatedSize = JSON.stringify(req.body).length + 200; // Add overhead

        if (usedBytes + estimatedSize > QUOTA_LIMIT) {
            return res.status(413).json({
                message: 'Storage quota would be exceeded by this operation',
                quota: QUOTA_LIMIT,
                used: usedBytes,
                estimated: estimatedSize,
                limit: '100MB'
            });
        }

        next();
    } catch (error) {
        console.error('Quota check error:', error);
        // Don't block on quota check errors, just log and continue
        next();
    }
};
