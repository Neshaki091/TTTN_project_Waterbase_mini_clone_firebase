const verifyService = require('../services/verify.service');

// GET /verify - Verify token from Authorization header
exports.verifyTokenFromHeader = (req, res) => {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ valid: false, message: 'Missing token' });
    }

    const token = authHeader.split(' ')[1];
    const appId = req.headers['x-app-id'];

    try {
        const decoded = verifyService.verifyToken(token);
        
        // Return user info
        res.json({ 
            valid: true, 
            user: decoded,
            appId: appId || decoded.appId 
        });
    } catch (error) {
        res.status(401).json({ valid: false, message: 'Invalid token', error: error.message });
    }
};

// POST /verify-token - Verify token from body (for backward compatibility)
exports.verifyTokenFromBody = (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ valid: false, message: 'Missing token' });

    try {
        const decoded = verifyService.verifyToken(token);
        res.json({ valid: true, user: decoded });
    } catch (error) {
        res.status(401).json({ valid: false, message: 'Invalid token' });
    }
};
