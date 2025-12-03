const jwt = require('jsonwebtoken');

exports.authMiddleware = (roles = []) => {
    return (req, res, next) => {
        const internalSecret = req.headers['x-internal-secret'];
        
        // 👇 SỬA LẠI TÊN BIẾN NÀY CHO KHỚP DOCKER-COMPOSE
        const SYSTEM_SECRET = process.env.INTERNAL_SECRET;

        // Kiểm tra chặt chẽ: Secret phải tồn tại và khớp nhau
        if (SYSTEM_SECRET && internalSecret === SYSTEM_SECRET) {
            console.log('🛡️ Internal request accepted via Secret Key');
            
            req.user = { 
                id: 'SYSTEM', 
                role: 'waterbaseAdmin', 
                isInternal: true 
            };
            return next(); 
        }

        // --- Logic JWT cũ giữ nguyên ---
        const authHeader = req.headers['authorization'];
        
        if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ message: 'Missing token' });

        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded; 
            if (roles.length && !roles.includes(req.user.role)) {
                return res.status(403).json({ message: 'Forbidden: insufficient role' });
            }
            next();
        } catch (err) {
            return res.status(401).json({ message: 'Invalid token', error: err.message });
        }
    };
};