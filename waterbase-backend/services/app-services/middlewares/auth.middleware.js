const axios = require('axios');
const jwt = require('jsonwebtoken');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3000';

exports.authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];

        // Verify token với auth service
        try {
            const verifyResponse = await axios.get(`${AUTH_SERVICE_URL}/verify`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            req.user = verifyResponse.data.user;
            next();
        } catch (error) {
            if (error.response) {
                return res.status(error.response.status).json({
                    message: 'Token verification failed',
                    error: error.response.data
                });
            }
            throw error;
        }
    } catch (error) {
        res.status(500).json({ message: 'Authentication error', error: error.message });
    }
};

// Owner authentication middleware (uses JWT directly, no auth-service call)
exports.authenticateOwner = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Verify this is an owner/admin token
        if (!['owner', 'adminWaterbase'].includes(decoded.role)) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }

        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        res.status(401).json({ message: 'Authentication failed', error: error.message });
    }
};
