const axios = require('axios');

const RULE_ENGINE_URL = process.env.RULE_ENGINE_URL || 'http://rule-service:3004';

/**
 * Dynamic Rule Guard Middleware
 * Checks if user has permission to perform an action
 * 
 * @param {string} baseAction - Base action like 'create', 'read', 'update', 'delete'
 * @returns {Function} Express middleware
 */
exports.checkAction = (baseAction) => async (req, res, next) => {
    const { collectionName } = req.params;
    const { appId, user } = req;

    if (!appId) {
        return res.status(400).json({
            message: 'Missing x-app-id header'
        });
    }

    // If no user (API key mode), use default role 'user'
    const userRole = user?.role || 'user';

    // Build action: 'create_products', 'read_orders', etc.
    const action = collectionName
        ? `${baseAction}_${collectionName}`
        : baseAction;

    try {
        // Call Rule Engine to check permission
        const response = await axios.post(
            `${RULE_ENGINE_URL}/check-action`,
            {
                appId,
                role: userRole,
                action
            },
            {
                headers: {
                    'x-internal-secret': process.env.INTERNAL_SECRET,
                    'Authorization': req.headers.authorization || ''
                },
                timeout: 5000,
                validateStatus: (status) => status === 204 || status === 403
            }
        );

        // 204 = allowed, 403 = forbidden
        if (response.status === 204) {
            console.log(`✅ Action allowed: ${action} for role ${userRole} in app ${appId}`);
            return next();
        }

        console.log(`❌ Action forbidden: ${action} for role ${userRole} in app ${appId}`);
        return res.status(403).json({
            message: `Action '${action}' forbidden for role '${userRole}'`,
            action,
            role: userRole,
            appId
        });

    } catch (error) {
        // Fail-open strategy: If Rule Engine is down, allow access
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            console.warn(`⚠️  Rule Engine unavailable, allowing action: ${action}`);
            return next();
        }

        // Rule Engine returned 403
        if (error.response?.status === 403) {
            return res.status(403).json({
                message: error.response.data.message || `Access denied for action '${action}'`,
                action,
                role: userRole
            });
        }

        console.error('Rule check error:', error.message);
        return res.status(500).json({
            message: 'Rule check failed',
            error: error.message
        });
    }
};

/**
 * Simple action check without collection name
 * For non-CRUD operations
 */
exports.checkSimpleAction = (action) => async (req, res, next) => {
    const { appId, user } = req;

    if (!appId || !user) {
        return res.status(401).json({
            message: 'Missing authentication context'
        });
    }

    try {
        const response = await axios.post(
            `${RULE_ENGINE_URL}/check-action`,
            {
                appId,
                role: user.role,
                action
            },
            {
                headers: {
                    'Authorization': req.headers.authorization
                },
                timeout: 5000,
                validateStatus: (status) => status === 204 || status === 403
            }
        );

        if (response.status === 204) {
            return next();
        }

        return res.status(403).json({
            message: `Action '${action}' forbidden for role '${user.role}'`
        });

    } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            console.warn(`⚠️  Rule Engine unavailable, allowing action: ${action}`);
            return next();
        }

        if (error.response?.status === 403) {
            return res.status(403).json({
                message: error.response.data.message || 'Access denied'
            });
        }

        return res.status(500).json({
            message: 'Rule check failed',
            error: error.message
        });
    }
};
